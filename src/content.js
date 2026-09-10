(function () {
  'use strict';

  const STORAGE_KEY = 'gemini_counter_pro_v6';
  const FETCH_INTERVAL = 3 * 60 * 1000;

  function todayKey() { return new Date().toISOString().slice(0, 10); }

  let state = {
    date: todayKey(),
    session_pct: null, weekly_pct: null,
    session_reset: null, weekly_reset: null,
    dataSource: 'estimated', lastRealRead: 0,
  };

  function saveState() { chrome.storage.local.set({ [STORAGE_KEY]: state }); }

  function loadState(cb) {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      const saved = data[STORAGE_KEY];
      if (saved) {
        if (saved.date !== todayKey()) {
          // New day — reset everything
          saved.date = todayKey(); saved.dataSource = 'estimated';
          saved.lastRealRead = 0; saved.session_pct = null; saved.weekly_pct = null;
        } else {
          // Same day — keep cached percentages but force a fresh fetch
          saved.lastRealRead = 0;
        }
        state = { ...state, ...saved };
      }
      cb();
    });
  }

  // ── Fetch ──────────────────────────────────────────────────
  async function fetchRealUsage(force = false) {
    const now = Date.now();
    if (!force && (now - state.lastRealRead) < FETCH_INTERVAL) return;
    setStatus('syncing');
    let data = window.GeminiUsageFetcher.readFromDOM();
    if (!data) data = await window.GeminiUsageFetcher.fetchFromBackground();
    if (data && window.GeminiUsageFetcher.applyToState(data, state)) {
      state.dataSource = 'real'; state.lastRealRead = Date.now();
      saveState(); updateUI(); setStatus('real');
    } else {
      setStatus('estimated');
    }
  }

  function setStatus(s) {
    const el = document.getElementById('gc-status');
    if (!el) return;
    if      (s === 'real')    { el.textContent = '● Live'; el.className = 'gc-status gc-live'; }
    else if (s === 'syncing') { el.textContent = '↻';      el.className = 'gc-status gc-sync'; }
    else                      { el.textContent = '~ Est.'; el.className = 'gc-status gc-est';  }
  }

  function barCls(pct) { return pct >= 90 ? 'gc-danger' : pct >= 60 ? 'gc-warn' : 'gc-ok'; }

  // ── Find the input container ───────────────────────────────
  function findInputContainer() {
    // Primary: the exact element seen in DevTools
    return (
      document.querySelector('.simplified-input-area') ||
      document.querySelector('.text-input-field') ||
      document.querySelector('input-area-v2') ||
      document.querySelector('[data-test-id="input-area"]') ||
      document.querySelector('rich-textarea')?.closest('[class*="input"]')
    );
  }

  // ── Inject bar ─────────────────────────────────────────────
  function injectBar() {
    if (document.getElementById('gc-bar')) return;
    const container = findInputContainer();
    if (!container) return;

    const bar = document.createElement('div');
    bar.id = 'gc-bar';
    bar.innerHTML = `
      <div class="gc-left">
        <span class="gc-label">Sesión:</span>
        <span class="gc-pct" id="gc-s-pct">—</span>
        <span class="gc-reset" id="gc-s-reset"></span>
        <div class="gc-track"><div class="gc-fill gc-ok" id="gc-s-fill" style="width:0%"></div></div>
      </div>
      <div class="gc-sep"></div>
      <div class="gc-right">
        <div class="gc-track"><div class="gc-fill gc-ok" id="gc-w-fill" style="width:0%"></div></div>
        <span class="gc-reset" id="gc-w-reset"></span>
        <span class="gc-pct" id="gc-w-pct">—</span>
        <span class="gc-label">Semanal</span>
      </div>
      <div class="gc-actions">
        <button id="gc-refresh-btn" class="gc-btn" title="Actualizar">↻</button>
        <span id="gc-status" class="gc-status gc-est">~ Est.</span>
      </div>
    `;

    // Insert right above the input container
    container.insertAdjacentElement('afterend', bar);
    document.getElementById('gc-refresh-btn').addEventListener('click', () => fetchRealUsage(true));
    updateUI();
  }

  function updateUI() {
    const sPct   = document.getElementById('gc-s-pct');
    const wPct   = document.getElementById('gc-w-pct');
    const sReset = document.getElementById('gc-s-reset');
    const wReset = document.getElementById('gc-w-reset');
    const sFill  = document.getElementById('gc-s-fill');
    const wFill  = document.getElementById('gc-w-fill');
    if (!sPct) return;

    const sp = state.session_pct ?? 0;
    const wp = state.weekly_pct  ?? 0;

    sPct.textContent = state.session_pct !== null ? sp + '%' : '—';
    wPct.textContent = state.weekly_pct  !== null ? wp + '%' : '—';

    if (state.session_reset) sReset.textContent = '· ' + state.session_reset.replace('Se restablece ', '').replace('a las ', '');
    if (state.weekly_reset)  wReset.textContent = state.weekly_reset.replace('Se restablece ', '').replace('el ', '') + ' ·';

    sFill.style.width = sp + '%';
    wFill.style.width = wp + '%';
    sFill.className = 'gc-fill ' + barCls(sp);
    wFill.className = 'gc-fill ' + barCls(wp);

    setStatus(state.dataSource === 'real' ? 'real' : 'estimated');
  }

  // ── SPA nav ────────────────────────────────────────────────
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(() => injectBar(), 1500);
      if (location.pathname.startsWith('/usage')) setTimeout(() => fetchRealUsage(true), 1500);
    }
    if (!document.getElementById('gc-bar')) injectBar();
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(() => fetchRealUsage(), FETCH_INTERVAL);

  function init() {
    loadState(() => {
      const iv = setInterval(() => { if (!document.getElementById('gc-bar')) injectBar(); }, 600);
      setTimeout(() => clearInterval(iv), 15000);
      setTimeout(() => fetchRealUsage(true), 2000);
    });
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
