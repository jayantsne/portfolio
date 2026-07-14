// background.js — Manifest V3 service worker
// Handles: action click → open side panel
//          content script messages → store snippet + forward to side panel
//          context menu (any page) → inject selection collector

// ── Side panel: open when extension icon is clicked ──────────────────────────
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {/* Chrome < 114 – silently ignore */});

// ── On install: create context menu entry ────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ai-clip-selection',
    title: '📎 Add to AI Notes',
    contexts: ['selection'],
  });
});

// ── Context menu: user right-clicked selected text ────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'ai-clip-selection') return;
  const text = (info.selectionText || '').trim();
  if (!text || !tab?.id) return;

  const snippet = buildSnippet(text, tab.url || '');
  await addSnippet(snippet);

  // Open side panel so the user sees the added snippet
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});

// ── Messages from content.js ──────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'ADD_SNIPPET') {
    const snippet = buildSnippet(msg.text, sender.url || '');
    addSnippet(snippet).then(() => {
      sendResponse({ ok: true });
      // Forward to side panel (it listens via storage onChange)
    });
    return true; // async
  }
  if (msg.type === 'GET_AUTH') {
    chrome.storage.local.get('authToken').then(d => sendResponse({ token: d.authToken || null }));
    return true;
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildSnippet(text, url) {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    source: url,
    timestamp: Date.now(),
  };
}

async function addSnippet(snippet) {
  const data = await chrome.storage.local.get('snippets');
  const snippets = Array.isArray(data.snippets) ? data.snippets : [];
  snippets.unshift(snippet); // newest first
  // Hard cap at 200 snippets to avoid storage overflow
  if (snippets.length > 200) snippets.length = 200;
  await chrome.storage.local.set({ snippets });
}
