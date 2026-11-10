/* 線上記事本 — 資料儲存於伺服器（/api/notes） */
(function () {
  "use strict";

  const API = "/api/notes";
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

  let notes = [];
  let activeId = null;
  let autoSaveTimer = null;

  // ── 資料存取（REST API） ──────────────────────────
  async function api(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${url} 失敗（${res.status}）`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // 伺服器回傳的時間是字串，轉成毫秒方便排序與顯示
  function normalize(n) {
    return { ...n, updatedAt: new Date(n.updatedAt).getTime() };
  }

  async function loadNotes() {
    try {
      notes = (await api("GET", API)).map(normalize);
    } catch (err) {
      console.error(err);
      noteCount.textContent = "⚠️ 無法連線到伺服器";
      return;
    }
    if (notes.length) activeId = notes[0].id;
    render();
  }

  function getActiveNote() {
    return notes.find((n) => n.id === activeId) || null;
  }

  // ── 記事操作 ──────────────────────────
  async function createNote() {
    await saveActiveNote(true);
    try {
      const note = normalize(await api("POST", API));
      notes.unshift(note);
      activeId = note.id;
      render();
      titleInput.focus();
    } catch (err) {
      console.error(err);
      flashSaveStatus("⚠️ 新增失敗");
    }
  }

  // 只有內容有變動才送到伺服器；回傳 true 表示已儲存（或無需儲存）
  async function saveActiveNote(silent) {
    clearTimeout(autoSaveTimer);
    const note = getActiveNote();
    if (!note) return true;
    const title = titleInput.value;
    const content = contentInput.value;
    if (title === note.title && content === note.content) {
      if (!silent) flashSaveStatus("✓ 已儲存");
      return true;
    }
    note.title = title;
    note.content = content;
    note.updatedAt = Date.now();
    // 依更新時間排序（最新在前）
    notes.sort((a, b) => b.updatedAt - a.updatedAt);
    renderList();
    updateStatusbar();
    try {
      const saved = normalize(await api("PUT", `${API}/${note.id}`, { title, content }));
      note.updatedAt = saved.updatedAt;
      if (note.id === activeId) updateStatusbar();
      if (!silent) flashSaveStatus("✓ 已儲存");
      return true;
    } catch (err) {
      console.error(err);
      flashSaveStatus("⚠️ 儲存失敗");
      return false;
    }
  }

  async function deleteActiveNote() {
    const note = getActiveNote();
    if (!note) return;
    const name = note.title.trim() || "（未命名記事）";
    if (!confirm(`確定要刪除「${name}」嗎？此動作無法復原。`)) return;
    try {
      await api("DELETE", `${API}/${note.id}`);
    } catch (err) {
      console.error(err);
      flashSaveStatus("⚠️ 刪除失敗");
      return;
    }
    notes = notes.filter((n) => n.id !== note.id);
    activeId = notes.length ? notes[0].id : null;
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
    autoSaveTimer = setTimeout(async () => {
      if (await saveActiveNote(true)) flashSaveStatus("✓ 已自動儲存");
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

  // 離開頁面前把尚未送出的自動儲存補送（keepalive 讓請求在頁面關閉後仍能完成）
  window.addEventListener("pagehide", () => {
    const note = getActiveNote();
    if (!note || (titleInput.value === note.title && contentInput.value === note.content)) return;
    fetch(`${API}/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleInput.value, content: contentInput.value }),
      keepalive: true,
    });
  });

  render();
  loadNotes();
})();
