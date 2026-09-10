chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'FETCH_USAGE') return;
  fetchUsageViaTab()
    .then(sendResponse)
    .catch(e => { console.warn('[GeminiCounter]', e.message); sendResponse(null); });
  return true;
});

async function fetchUsageViaTab() {
  const existing = await chrome.tabs.query({ url: 'https://gemini.google.com/usage*' });
  if (existing.length > 0) {
    return await pollTabForData(existing[0].id);
  }
  const tab = await chrome.tabs.create({ url: 'https://gemini.google.com/usage?hl=es', active: false });
  await waitForTabLoad(tab.id);
  const data = await pollTabForData(tab.id);
  try { await chrome.tabs.remove(tab.id); } catch(_) {}
  return data;
}

function waitForTabLoad(tabId) {
  return new Promise(resolve => {
    const check = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(check);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(check);
    setTimeout(resolve, 8000);
  });
}

async function pollTabForData(tabId, attempts = 25, interval = 300) {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, interval));
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const cEl = document.querySelector('[data-test-id="gxu-currently"]');
          const wEl = document.querySelector('[data-test-id="gxu-weekly"]');
          if (!cEl || !wEl) return null;

          // Extract % only from direct <p> children that contain "% usado"
          // to avoid picking up text from nested banners/other elements
          const pctFromEl = (el) => {
            // Look for a <p> that directly contains "% usado" — find the LAST one
            // (the percentage is always the last text node with % in the block)
            const paragraphs = el.querySelectorAll('p');
            for (let i = paragraphs.length - 1; i >= 0; i--) {
              // Only use direct text, not nested element text
              const text = paragraphs[i].textContent || '';
              const m = text.match(/^(\d+)\s*%\s*usado$/i);
              if (m) return parseInt(m[1]);
            }
            return null;
          };

          const resetFromEl = (el) => {
            const r = el.querySelector('[class*="reset-time"]');
            return r?.textContent?.trim() || null;
          };

          return {
            session_pct:   pctFromEl(cEl),
            weekly_pct:    pctFromEl(wEl),
            session_reset: resetFromEl(cEl),
            weekly_reset:  resetFromEl(wEl),
          };
        }
      });
      const d = results?.[0]?.result;
      if (d?.session_pct !== null && d?.session_pct !== undefined) return d;
    } catch(_) {}
  }
  return null;
}
