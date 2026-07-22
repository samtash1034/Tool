/* 線上記事本 — 資料儲存於 localStorage */
(function () {
  "use strict";

  const STORAGE_KEY = "notepad.notes";
  const THEME_KEY = "notepad.theme";

  // DOM 元素
  const noteList = document.getElementById("noteList");
  const noteCount = document.getElementById("noteCount");
  const newNoteBtn = document.getElementById("newNoteBtn");
  const editorPane = document.getElementById("editorPane");
  const titleInput = document.getElementById("noteTitle");
  const contentInput = document.getElementById("noteContent");
  const saveBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const charCount = document.getElementById("charCount");
  const saveStatus = document.getElementById("saveStatus");
  const lastEdited = document.getElementById("lastEdited");
  const themeToggle = document.getElementById("themeToggle");

  let notes = loadNotes();
  let activeId = null;
  let autoSaveTimer = null;

  // ── 資料存取 ──────────────────────────
  function loadNotes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }

  function getActiveNote() {
    return notes.find((n) => n.id === activeId) || null;
  }

  // ── 記事操作 ──────────────────────────
  function createNote() {
    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: "",
      content: "",
      updatedAt: Date.now(),
    };
    notes.unshift(note);
    activeId = note.id;
    persist();
    render();
    titleInput.focus();
  }

  function saveActiveNote(silent) {
    const note = getActiveNote();
    if (!note) return;
    note.title = titleInput.value;
    note.content = contentInput.value;
    note.updatedAt = Date.now();
    // 依更新時間排序（最新在前）
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
    persist();
    renderList();
    updateStatusbar();
    if (!silent) flashSaveStatus("✓ 已儲存");
  }

  function deleteActiveNote() {
    const note = getActiveNote();
    if (!note) return;
    const name = note.title.trim() || "（未命名記事）";
    if (!confirm(`確定要刪除「${name}」嗎？此動作無法復原。`)) return;
    notes = notes.filter((n) => n.id !== activeId);
    activeId = notes.length ? notes[0].id : null;
    persist();
    render();
  }

  // ── 畫面渲染 ──────────────────────────
  function render() {
    renderList();
    renderEditor();
  }

  function renderList() {
    noteList.innerHTML = "";

    if (!notes.length) {
      const li = document.createElement("li");
      li.className = "no-result";
      li.textContent = "尚無記事";
      noteList.appendChild(li);
    } else {
      notes.forEach((note) => {
        const li = document.createElement("li");
        li.className = "note-item" + (note.id === activeId ? " active" : "");

        const title = document.createElement("div");
        title.className = "note-item-title";
        title.textContent = note.title.trim() || "（未命名記事）";

        const preview = document.createElement("div");
        preview.className = "note-item-preview";
        preview.textContent = note.content.slice(0, 50) || "（無內容）";

        const date = document.createElement("div");
        date.className = "note-item-date";
        date.textContent = formatDate(note.updatedAt);

        li.append(title, preview, date);
        li.addEventListener("click", () => {
          if (note.id === activeId) return;
          saveActiveNote(true);
          activeId = note.id;
          render();
        });
        noteList.appendChild(li);
      });
    }

    noteCount.textContent = `共 ${notes.length} 篇記事`;
  }

  function renderEditor() {
    const note = getActiveNote();
    const hasNote = !!note;
    editorPane.hidden = !hasNote;
    if (!hasNote) return;
    titleInput.value = note.title;
    contentInput.value = note.content;
    updateStatusbar();
  }

  function updateStatusbar() {
    const note = getActiveNote();
    charCount.textContent = `${contentInput.value.length} 個字`;
    lastEdited.textContent = note ? `最後編輯：${formatDate(note.updatedAt)}` : "";
  }

  function flashSaveStatus(text) {
    saveStatus.textContent = text;
    setTimeout(() => (saveStatus.textContent = ""), 2000);
  }

  function formatDate(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── 自動儲存 ──────────────────────────
  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveActiveNote(true);
      flashSaveStatus("✓ 已自動儲存");
    }, 800);
  }

  // ── 深色模式 ──────────────────────────
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, theme);
  }

  // ── 事件綁定 ──────────────────────────
  newNoteBtn.addEventListener("click", createNote);
  saveBtn.addEventListener("click", () => saveActiveNote(false));
  deleteBtn.addEventListener("click", deleteActiveNote);
  titleInput.addEventListener("input", scheduleAutoSave);
  contentInput.addEventListener("input", () => {
    updateStatusbar();
    scheduleAutoSave();
  });
  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(current);
  });

  // Ctrl+S / Cmd+S 儲存
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveActiveNote(false);
    }
  });

  // ── 初始化 ──────────────────────────
  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);

  if (notes.length) activeId = notes[0].id;
  render();
})();
