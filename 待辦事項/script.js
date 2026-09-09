/* 待辦事項 — 最緊急 / 普通 / 不重要 三區，資料儲存於 localStorage */
(function () {
  "use strict";

  const STORAGE_KEY = "todos.items";
  const THEME_KEY = "todos.theme";

  const LEVELS = ["high", "normal", "low"];
  const DEFAULT_LEVEL = "normal";
  const LEVEL_LABEL = {
    high: "🔥 最緊急",
    normal: "普通",
    low: "不重要",
  };
  // 項目上的小下拉用短標籤，才不會把文字空間吃掉
  const LEVEL_SHORT = { high: "🔥", normal: "普", low: "低" };
  // 舊版四象限資料的對應
  const LEGACY_MAP = { q1: "high", q2: "normal", q3: "normal", q4: "low" };

  // DOM 元素
  const addForm = document.getElementById("addForm");
  const todoInput = document.getElementById("todoInput");
  const levelSelect = document.getElementById("levelSelect");
  const itemsLeft = document.getElementById("itemsLeft");
  const themeToggle = document.getElementById("themeToggle");
  const lists = {};
  const counts = {};
  LEVELS.forEach((lv) => {
    lists[lv] = document.querySelector(`[data-list="${lv}"]`);
    counts[lv] = document.querySelector(`[data-count="${lv}"]`);
  });

  let todos = loadTodos();

  // ── 資料存取 ──────────────────────────
  function loadTodos() {
    let items;
    try {
      items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      items = [];
    }
    return items.map((t) => {
      const { quadrant, completed, ...rest } = t;
      let level = t.level;
      if (!LEVELS.includes(level)) level = LEGACY_MAP[quadrant] || DEFAULT_LEVEL;
      return { ...rest, level };
    });
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  // ── 待辦操作 ──────────────────────────
  function addTodo(text, level) {
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: trimmed,
      createdAt: Date.now(),
      level: LEVELS.includes(level) ? level : DEFAULT_LEVEL,
    });
    persist();
    render();
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    persist();
    render();
  }

  function editTodo(id, text) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const trimmed = text.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    todo.text = trimmed;
    persist();
    render();
  }

  // 搬到指定區塊；beforeId 有值時插在該項目之前，否則放到最後
  function moveTodo(id, level, beforeId) {
    if (!LEVELS.includes(level) || id === beforeId) return;
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return;

    const [todo] = todos.splice(index, 1);
    todo.level = level;

    let target = todos.length;
    if (beforeId) {
      const at = todos.findIndex((t) => t.id === beforeId);
      if (at !== -1) target = at;
    }
    todos.splice(target, 0, todo);
    persist();
    render();
  }

  // ── 畫面渲染 ──────────────────────────
  function createItem(todo) {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.draggable = true;
    li.dataset.id = todo.id;

    li.addEventListener("dragstart", (e) => {
      li.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", todo.id);
    });
    li.addEventListener("dragend", () => li.classList.remove("dragging"));

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;
    text.contentEditable = "false";
    text.spellcheck = false;
    text.title = "雙擊編輯";

    // 平常不可編輯，整條才能從任何位置拖曳；雙擊才進入編輯並暫停拖曳
    text.addEventListener("dblclick", () => {
      li.draggable = false;
      text.contentEditable = "true";
      text.classList.add("editing");
      text.focus();
      const range = document.createRange();
      range.selectNodeContents(text);
      const sel = getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    text.addEventListener("blur", () => {
      li.draggable = true;
      text.contentEditable = "false";
      text.classList.remove("editing");
      editTodo(todo.id, text.textContent);
    });
    text.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        text.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        text.textContent = todo.text;
        text.blur();
      }
    });

    // 手機沒有拖曳，用下拉搬移
    const move = document.createElement("select");
    move.className = "todo-move";
    move.title = "搬到其他區塊";
    LEVELS.forEach((lv) => {
      const opt = document.createElement("option");
      opt.value = lv;
      opt.textContent = LEVEL_SHORT[lv];
      opt.title = LEVEL_LABEL[lv];
      move.appendChild(opt);
    });
    move.value = todo.level;
    move.addEventListener("change", () => moveTodo(todo.id, move.value));

    const del = document.createElement("button");
    del.className = "todo-delete";
    del.textContent = "✕";
    del.title = "刪除";
    del.addEventListener("click", () => deleteTodo(todo.id));

    li.append(text, move, del);
    return li;
  }

  function render() {
    LEVELS.forEach((lv) => {
      const list = lists[lv];
      list.innerHTML = "";

      const items = todos.filter((t) => t.level === lv);
      if (!items.length) {
        const li = document.createElement("li");
        li.className = "no-result";
        li.textContent = "拖曳或新增待辦事項到這裡";
        list.appendChild(li);
      } else {
        items.forEach((todo) => list.appendChild(createItem(todo)));
      }

      counts[lv].textContent = items.length;
    });

    itemsLeft.textContent = `共 ${todos.length} 項待辦`;
  }

  // ── 拖放 ──────────────────────────
  // 找出游標目前落在該區塊的哪一個項目之前
  function itemAfter(list, y) {
    const items = [...list.querySelectorAll(".todo-item:not(.dragging)")];
    return items.find((el) => {
      const box = el.getBoundingClientRect();
      return y < box.top + box.height / 2;
    });
  }

  document.querySelectorAll("[data-level]").forEach((col) => {
    const list = col.querySelector(".todo-list");

    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drag-over");
    });
    col.addEventListener("dragleave", (e) => {
      if (!col.contains(e.relatedTarget)) col.classList.remove("drag-over");
    });
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      const before = itemAfter(list, e.clientY);
      moveTodo(id, col.dataset.level, before ? before.dataset.id : null);
    });
  });

  // ── 深色模式 ──────────────────────────
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, theme);
  }

  // ── 事件綁定 ──────────────────────────
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(todoInput.value, levelSelect.value);
    todoInput.value = "";
    todoInput.focus();
  });

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(current);
  });

  // ── 初始化 ──────────────────────────
  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);

  persist();
  render();
})();
