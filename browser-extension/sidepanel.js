// sidepanel.js — All side-panel logic (no build tools needed)
'use strict';

// ── State ─────────────────────────────────────────────────────────────────────
let snippets = [];
let authToken = null;
let authUsername = '';
let settings = {
  apiBaseUrl: 'https://learnwithai.tech',
  noteCategory: 'ChatGPT',
};
let editingId = null; // snippet id currently in edit mode

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const authPanel       = $('auth-panel');
const authInfo        = $('auth-info');
const authUser        = $('auth-user');
const authPass        = $('auth-pass');
const authError       = $('auth-error');
const btnLogin        = $('btn-login');
const btnLogout       = $('btn-logout');
const authNameDisplay = $('auth-username-display');
const snippetList     = $('snippet-list');
const snippetCount    = $('snippet-count');
const emptyState      = $('empty-state');
const btnClearAll     = $('btn-clear-all');
const btnCombine      = $('btn-combine');
const btnAiFormat     = $('btn-ai-format');
const aiStatus        = $('ai-format-status');
const noteEditor      = $('note-editor');
const noteTitle       = $('note-title');
const noteCategory    = $('note-category');
const noteTags        = $('note-tags');
const noteContent     = $('note-content');
const btnSaveNote     = $('btn-save-note');
const saveStatus      = $('save-status');
const btnCloseEditor  = $('btn-close-editor');
const settingApiUrl   = $('setting-api-url');
const settingCategory = $('setting-category');
const btnSaveSettings = $('btn-save-settings');
const settingsSaved   = $('settings-saved');

// ── Initialise ────────────────────────────────────────────────────────────────
async function init() {
  const data = await chrome.storage.local.get(['snippets', 'authToken', 'authUsername', 'settings']);
  snippets     = Array.isArray(data.snippets) ? data.snippets : [];
  authToken    = data.authToken    || null;
  authUsername = data.authUsername || '';
  settings     = { ...settings, ...(data.settings || {}) };

  settingApiUrl.value   = settings.apiBaseUrl;
  settingCategory.value = settings.noteCategory;

  updateAuthUI();
  renderSnippets();
}

// ── Storage change listener (new snippet added from content/background) ───────
chrome.storage.onChanged.addListener((changes) => {
  if (changes.snippets) {
    snippets = changes.snippets.newValue || [];
    renderSnippets();
  }
  if (changes.authToken) {
    authToken = changes.authToken.newValue || null;
    authUsername = ''; // will be repopulated on save
    updateAuthUI();
  }
});

// ── Auth UI ───────────────────────────────────────────────────────────────────
function updateAuthUI() {
  if (authToken) {
    authPanel.classList.add('hidden');
    authInfo.classList.remove('hidden');
    authNameDisplay.textContent = `👤 ${authUsername || 'Logged in'}`;
  } else {
    authPanel.classList.remove('hidden');
    authInfo.classList.add('hidden');
  }
}

btnLogin.addEventListener('click', login);
[authUser, authPass].forEach(el => el.addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
}));

async function login() {
  authError.classList.add('hidden');
  const username = authUser.value.trim();
  const password = authPass.value;
  if (!username || !password) {
    showAuthError('Enter username and password.');
    return;
  }
  btnLogin.disabled = true;
  btnLogin.textContent = 'Logging in…';
  try {
    const res = await fetch(`${settings.apiBaseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showAuthError(err.message || `Login failed (${res.status})`);
      return;
    }
    const data = await res.json();
    const token = data.token || data.accessToken || data.jwt;
    if (!token) { showAuthError('No token in response.'); return; }

    authToken    = token;
    authUsername = username;
    await chrome.storage.local.set({ authToken: token, authUsername: username });
    authUser.value = '';
    authPass.value = '';
    updateAuthUI();
  } catch (err) {
    showAuthError('Network error. Check API URL in settings.');
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Log In';
  }
}

function showAuthError(msg) {
  authError.textContent = msg;
  authError.classList.remove('hidden');
}

btnLogout.addEventListener('click', async () => {
  authToken = null;
  authUsername = '';
  await chrome.storage.local.remove(['authToken', 'authUsername']);
  updateAuthUI();
});

// ── Settings ──────────────────────────────────────────────────────────────────
btnSaveSettings.addEventListener('click', async () => {
  settings.apiBaseUrl    = settingApiUrl.value.trim() || 'https://learnwithai.tech';
  settings.noteCategory  = settingCategory.value.trim() || 'ChatGPT';
  await chrome.storage.local.set({ settings });
  settingsSaved.classList.remove('hidden');
  setTimeout(() => settingsSaved.classList.add('hidden'), 2000);
});

// ── Render snippet list ───────────────────────────────────────────────────────
function renderSnippets() {
  const count = snippets.length;
  snippetCount.textContent = `${count} snippet${count !== 1 ? 's' : ''}`;
  emptyState.classList.toggle('hidden', count > 0);
  snippetList.innerHTML = '';

  snippets.forEach(s => {
    const li = document.createElement('li');
    li.className = 'snippet-card';
    li.dataset.id = s.id;

    if (editingId === s.id) {
      // Edit mode
      li.innerHTML = `
        <div class="snippet-source">${escHtml(domainOf(s.source))}</div>
        <textarea class="snippet-edit-area" data-id="${s.id}">${escHtml(s.text)}</textarea>
        <div class="snippet-actions">
          <button class="btn-primary btn-sm" data-action="save-edit" data-id="${s.id}">Save</button>
          <button class="btn-ghost btn-sm"   data-action="cancel-edit">Cancel</button>
        </div>`;
    } else {
      // Display mode
      const preview = s.text.length > 300 ? s.text.slice(0, 300) + '…' : s.text;
      li.innerHTML = `
        <div class="snippet-source">${escHtml(domainOf(s.source))}</div>
        <div class="snippet-body" data-id="${s.id}">${escHtml(preview)}</div>
        <div class="snippet-actions">
          <button class="btn-ghost btn-sm" data-action="edit"   data-id="${s.id}">✏️ Edit</button>
          <button class="btn-danger btn-sm" data-action="delete" data-id="${s.id}">🗑 Delete</button>
          <button class="btn-fmt"          data-action="bullets" data-id="${s.id}">• Bullets</button>
          <button class="btn-fmt"          data-action="heading" data-id="${s.id}">## Heading</button>
        </div>`;
    }
    snippetList.appendChild(li);
  });

  // Event delegation
  snippetList.onclick = handleSnippetClick;
}

function handleSnippetClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id     = btn.dataset.id;

  if (action === 'edit') {
    editingId = id;
    renderSnippets();
  } else if (action === 'cancel-edit') {
    editingId = null;
    renderSnippets();
  } else if (action === 'save-edit') {
    const ta = snippetList.querySelector(`textarea[data-id="${id}"]`);
    if (ta) {
      const s = snippets.find(x => x.id === id);
      if (s) s.text = ta.value;
      saveSnippetsToStorage();
    }
    editingId = null;
    renderSnippets();
  } else if (action === 'delete') {
    deleteSnippet(id);
  } else if (action === 'bullets') {
    formatSnippet(id, 'bullets');
  } else if (action === 'heading') {
    formatSnippet(id, 'heading');
  }
}

function deleteSnippet(id) {
  snippets = snippets.filter(s => s.id !== id);
  saveSnippetsToStorage();
  renderSnippets();
}

function formatSnippet(id, type) {
  const s = snippets.find(x => x.id === id);
  if (!s) return;
  if (type === 'bullets') {
    s.text = s.text.split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => l.startsWith('-') ? l : `- ${l}`)
      .join('\n');
  } else if (type === 'heading') {
    const lines = s.text.split('\n');
    if (!lines[0].startsWith('#')) {
      lines[0] = `## ${lines[0]}`;
    }
    s.text = lines.join('\n');
  }
  saveSnippetsToStorage();
  renderSnippets();
}

// ── Clear all ─────────────────────────────────────────────────────────────────
btnClearAll.addEventListener('click', async () => {
  if (!confirm('Clear all snippets?')) return;
  snippets = [];
  editingId = null;
  await saveSnippetsToStorage();
  renderSnippets();
});

// ── Combine all snippets into the note editor ─────────────────────────────────
btnCombine.addEventListener('click', () => {
  if (snippets.length === 0) return;

  // Build combined content
  const combined = snippets
    .map((s, i) => `## Snippet ${i + 1}\n${s.text.trim()}`)
    .join('\n\n---\n\n');

  const topicGuess = guessTitle(snippets[0].text);
  noteTitle.value    = topicGuess;
  noteCategory.value = settings.noteCategory;
  noteTags.value     = '';
  noteContent.value  = combined;
  saveStatus.classList.add('hidden');
  noteEditor.classList.remove('hidden');
});

btnCloseEditor.addEventListener('click', () => {
  noteEditor.classList.add('hidden');
});

// ── Format toolbar inside note editor ────────────────────────────────────────
document.querySelectorAll('.btn-fmt[data-fmt]').forEach(btn => {
  btn.addEventListener('click', () => applyEditorFormat(noteContent, btn.dataset.fmt));
});

function applyEditorFormat(ta, type) {
  const start  = ta.selectionStart;
  const end    = ta.selectionEnd;
  const sel    = ta.value.substring(start, end);
  const before = ta.value.substring(0, start);
  const after  = ta.value.substring(end);

  let insert = '';
  switch (type) {
    case 'bullets':
      insert = (sel || 'Item').split('\n').map(l => `- ${l.trim()}`).join('\n');
      break;
    case 'heading':
      insert = `## ${sel || 'Heading'}`;
      break;
    case 'bold':
      insert = `**${sel || 'bold text'}**`;
      break;
    case 'code':
      insert = `\`\`\`\n${sel || 'code here'}\n\`\`\``;
      break;
    case 'clean': {
      // Strip consecutive blank lines
      ta.value = ta.value.replace(/\n{3,}/g, '\n\n').trimEnd();
      return;
    }
  }
  ta.value = before + insert + after;
  const pos = (before + insert).length;
  ta.focus();
  ta.setSelectionRange(pos, pos);
}

// ── AI Format (all snippets) ─────────────────────────────────────────────────
btnAiFormat.addEventListener('click', aiFormatAll);

async function aiFormatAll() {
  if (snippets.length === 0) return;
  if (!authToken) {
    showAiStatus('⚠️ Log in first to use AI formatting.', true);
    return;
  }
  btnAiFormat.disabled = true;
  showAiStatus('🤖 AI is formatting your snippets…');

  const raw = snippets.map(s => s.text.trim()).join('\n\n---\n\n');

  try {
    const res = await fetch(`${settings.apiBaseUrl}/api/notes/ai-format`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ text: raw }),
    });

    if (!res.ok) {
      showAiStatus(`❌ AI format failed (${res.status}).`, true);
      return;
    }

    const data = await res.json();
    const formatted = data.formatted || raw;

    // Open note editor with formatted content
    noteTitle.value    = guessTitle(snippets[0].text);
    noteCategory.value = settings.noteCategory;
    noteTags.value     = '';
    noteContent.value  = formatted;
    saveStatus.classList.add('hidden');
    noteEditor.classList.remove('hidden');
    showAiStatus('✅ AI formatting complete!');
    setTimeout(() => aiStatus.classList.add('hidden'), 3000);
  } catch {
    showAiStatus('❌ Network error during AI format.', true);
  } finally {
    btnAiFormat.disabled = false;
  }
}

function showAiStatus(msg, isError = false) {
  aiStatus.textContent = msg;
  aiStatus.style.color = isError ? 'var(--red)' : 'var(--orange)';
  aiStatus.classList.remove('hidden');
}

// ── Save note to app ──────────────────────────────────────────────────────────
btnSaveNote.addEventListener('click', saveNoteToApp);

async function saveNoteToApp() {
  if (!authToken) {
    showSaveStatus('⚠️ Log in to save notes.', false);
    return;
  }
  const topic   = noteTitle.value.trim();
  const content = noteContent.value.trim();
  if (!topic || !content) {
    showSaveStatus('⚠️ Title and content are required.', false);
    return;
  }

  btnSaveNote.disabled    = true;
  btnSaveNote.textContent = 'Saving…';

  const tagsArr = noteTags.value
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  try {
    const res = await fetch(`${settings.apiBaseUrl}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        topic,
        category: noteCategory.value.trim() || settings.noteCategory,
        tags:     tagsArr,
        content,
        contextType: 'extension',
        contextId:   '',
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        showSaveStatus('Session expired. Please log in again.', false);
        authToken = null;
        await chrome.storage.local.remove('authToken');
        updateAuthUI();
      } else {
        showSaveStatus(`❌ Save failed (${res.status}).`, false);
      }
      return;
    }

    showSaveStatus('✅ Note saved successfully!', true);
    // Optionally clear snippets after successful save
    setTimeout(() => {
      if (confirm('Note saved! Clear all snippets?')) {
        snippets = [];
        saveSnippetsToStorage();
        renderSnippets();
        noteEditor.classList.add('hidden');
      }
    }, 800);

  } catch {
    showSaveStatus('❌ Network error. Check your connection.', false);
  } finally {
    btnSaveNote.disabled    = false;
    btnSaveNote.textContent = '💾 Save to App';
  }
}

function showSaveStatus(msg, isSuccess) {
  saveStatus.textContent = msg;
  saveStatus.className   = `save-status ${isSuccess ? 'success' : 'error'}`;
  saveStatus.classList.remove('hidden');
  if (isSuccess) {
    setTimeout(() => saveStatus.classList.add('hidden'), 5000);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function saveSnippetsToStorage() {
  return chrome.storage.local.set({ snippets });
}

function guessTitle(text) {
  // Take first meaningful line, truncated to 60 chars
  const first = text.split('\n').find(l => l.trim().length > 3) || text;
  return first.replace(/^#+\s*/, '').replace(/\*+/g, '').trim().slice(0, 60);
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function domainOf(url) {
  try { return new URL(url).hostname; }
  catch { return url || 'unknown'; }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
