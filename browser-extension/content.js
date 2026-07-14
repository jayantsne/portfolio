// content.js — injected into ChatGPT pages
// Shows a floating "📎 Add to Notes" tooltip when the user selects text.

(function () {
  'use strict';

  let floatingBtn = null;
  let lastSelection = '';

  // ── Create the floating button ──────────────────────────────────────────────
  function createBtn() {
    const btn = document.createElement('button');
    btn.id = 'ai-clip-btn';
    btn.textContent = '📎 Add to Notes';
    btn.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'padding:6px 12px',
      'background:#1a73e8',
      'color:#fff',
      'border:none',
      'border-radius:20px',
      'cursor:pointer',
      'font-size:13px',
      'font-family:system-ui,sans-serif',
      'box-shadow:0 2px 8px rgba(0,0,0,.35)',
      'transition:opacity .15s',
      'white-space:nowrap',
      'user-select:none',
    ].join(';');
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clip();
    });
    document.body.appendChild(btn);
    return btn;
  }

  function getBtn() {
    if (!floatingBtn || !document.body.contains(floatingBtn)) {
      floatingBtn = createBtn();
    }
    return floatingBtn;
  }

  function showBtn(x, y) {
    const btn = getBtn();
    btn.style.display = 'block';
    btn.style.opacity = '1';
    // Position relative to viewport, clamped so it doesn't go off-screen
    const vw = window.innerWidth;
    const bw = 160; // approx button width
    const left = Math.min(x, vw - bw - 8);
    btn.style.left = Math.max(8, left) + 'px';
    btn.style.top  = Math.max(8, y - 44) + 'px';
  }

  function hideBtn() {
    if (floatingBtn) {
      floatingBtn.style.display = 'none';
    }
  }

  // ── Selection handler ──────────────────────────────────────────────────────
  document.addEventListener('mouseup', (e) => {
    // Don't show after clicking our own button
    if (e.target && e.target.id === 'ai-clip-btn') return;

    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (text.length < 20) {
      hideBtn();
      lastSelection = '';
      return;
    }

    lastSelection = text;
    showBtn(e.clientX, e.clientY);
  });

  // Hide when clicking elsewhere
  document.addEventListener('mousedown', (e) => {
    if (e.target && e.target.id === 'ai-clip-btn') return;
    hideBtn();
  });

  // Hide on scroll
  document.addEventListener('scroll', hideBtn, { passive: true });

  // ── Clip selected text ─────────────────────────────────────────────────────
  function clip() {
    const text = lastSelection || (window.getSelection()?.toString().trim() ?? '');
    if (!text) return;

    hideBtn();
    window.getSelection()?.removeAllRanges();
    lastSelection = '';

    chrome.runtime.sendMessage({ type: 'ADD_SNIPPET', text }, () => {
      showToast('✅ Added to AI Notes');
    });
  }

  // ── Visual feedback toast ──────────────────────────────────────────────────
  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'z-index:2147483647',
      'background:#1a73e8',
      'color:#fff',
      'padding:10px 18px',
      'border-radius:8px',
      'font-size:14px',
      'font-family:system-ui,sans-serif',
      'box-shadow:0 2px 10px rgba(0,0,0,.3)',
      'animation:fadeout 2s forwards',
    ].join(';');
    // Inject keyframe once
    if (!document.getElementById('ai-clip-style')) {
      const s = document.createElement('style');
      s.id = 'ai-clip-style';
      s.textContent = '@keyframes fadeout{0%{opacity:1}70%{opacity:1}100%{opacity:0}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2100);
  }
})();
