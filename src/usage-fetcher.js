// usage-fetcher.js — asks background worker to fetch real usage

window.GeminiUsageFetcher = {

  // Read directly from DOM if we're on the /usage page
  readFromDOM() {
    const result = {};
    const currentEl = document.querySelector('[data-test-id="gxu-currently"]');
    if (currentEl) {
      const pct = this._extractPct(currentEl.textContent);
      if (pct !== null) result.session_pct = pct;
      const r = currentEl.querySelector('[class*="reset-time"]');
      if (r) result.session_reset = r.textContent.trim();
    }
    const weeklyEl = document.querySelector('[data-test-id="gxu-weekly"]');
    if (weeklyEl) {
      const pct = this._extractPct(weeklyEl.textContent);
      if (pct !== null) result.weekly_pct = pct;
      const r = weeklyEl.querySelector('[class*="reset-time"]');
      if (r) result.weekly_reset = r.textContent.trim();
    }
    return Object.keys(result).length > 0 ? result : null;
  },

  // Ask background worker to fetch (works from any page)
  async fetchFromBackground() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'FETCH_USAGE' }, (data) => {
          if (chrome.runtime.lastError) { resolve(null); return; }
          resolve(data);
        });
      } catch(e) { resolve(null); }
    });
  },

  _extractPct(text) {
    const m = (text || '').match(/(\d+)\s*%\s*usado/i);
    return m ? parseInt(m[1], 10) : null;
  },

  applyToState(data, state) {
    if (!data) return false;
    let applied = false;
    if (data.session_pct   !== undefined) { state.session_pct   = data.session_pct;   applied = true; }
    if (data.weekly_pct    !== undefined) { state.weekly_pct    = data.weekly_pct;     applied = true; }
    if (data.session_reset !== undefined) { state.session_reset = data.session_reset;  applied = true; }
    if (data.weekly_reset  !== undefined) { state.weekly_reset  = data.weekly_reset;   applied = true; }
    return applied;
  }
};
