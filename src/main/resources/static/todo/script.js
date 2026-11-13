/* 待辦事項 / 工作待辦 共用 — 資料儲存於伺服器（/api/todos）
 * 頁面上有哪些 [data-list] 區塊就顯示哪些：
 *   /todo       最緊急 / 普通 / 不重要 + 工作區 + 每日清單
 *   /work-todo  日報 / 股票（緊急、普通）/ 商城（緊急、普通）/ 其他 */
(function () {
  "use strict";

  const API = "/api/todos";
  const THEME_KEY = "todos.theme";

  const LEVELS = [...document.querySelectorAll("[data-list]")].map((el) => el.dataset.list);
  const DEFAULT_LEVEL = LEVELS.includes("normal") ? "normal" : LEVELS[0];
  const LEVEL_LABEL = {
    high: "🔥 最緊急",
    normal: "普通",
    low: "不重要",
    work: "💼 工作區",
    daily: "📅 每日清單",
    report: "📝 日報",
    stock_high: "📈 股票・緊急",
    stock: "📈 股票・普通",
    mall_high: "🛒 商城・緊急",
    mall: "🛒 商城・普通",
    other: "📦 其他",
  };
  // 項目上的小下拉用短標籤，才不會把文字空間吃掉
  const LEVEL_SHORT = {
    high: "🔥", normal: "普", low: "低", work: "💼", daily: "📅",
    report: "📝", stock_high: "📈急", stock: "📈普", mall_high: "🛒急", mall: "🛒普", other: "📦",
  };

  // DOM 元素
  const addForm = document.getElementById("addForm");
  const todoInput = document.getElementById("todoInput");
  const levelSelect = document.getElementById("levelSelect");
  const itemsLeft = document.getElementById("itemsLeft");
  const themeToggle = document.getElementById("themeToggle");
  const clearReport = document.getElementById("clearReport");
  const lists = {};
  const counts = {};
  LEVELS.forEach((lv) => {
    lists[lv] = document.querySelector(`[data-list="${lv}"]`);
    counts[lv] = document.querySelector(`[data-count="${lv}"]`);
  });

  let todos = [];

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

  // id 一律轉字串，才能和 dataset / dataTransfer 取出的值比對
  function normalize(t) {
    return { ...t, id: String(t.id) };
  }

  // 發生錯誤時提示並以伺服器資料為準重新載入
  function fail(err) {
    console.error(err);
    alert("儲存失敗，請稍後再試。\n" + err.message);
    loadTodos();
  }

  async function loadTodos() {
    try {
      todos = (await api("GET", API)).map(normalize);
    } catch (err) {
      console.error(err);
      itemsLeft.textContent = "⚠️ 無法連線到伺服器";
      return;
    }
    render();
  }

  // ── 待辦操作 ──────────────────────────
  async function addTodo(text, level) {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const created = await api("POST", API, {
        text: trimmed,
        level: LEVELS.includes(level) ? level : DEFAULT_LEVEL,
      });
      todos.unshift(normalize(created));
      render();
    } catch (err) {
      fail(err);
    }
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    render();
    api("DELETE", `${API}/${id}`).catch(fail);
  }

  function editTodo(id, text) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const trimmed = text.trim();
    if (!trimmed) {
      deleteTodo(id);
      return;
    }
    if (trimmed === todo.text) {
      render();
      return;
    }
    todo.text = trimmed;
    render();
    api("PATCH", `${API}/${id}`, { text: trimmed }).catch(fail);
  }

  // 一次刪掉某區塊的全部項目（日報寫完用）
  function clearLevel(level) {
    const count = todos.filter((t) => t.level === level).length;
    if (!count) return;
    if (!confirm(`確定要清空「${LEVEL_LABEL[level]}」的 ${count} 個項目嗎？刪除後無法復原。`)) return;
    todos = todos.filter((t) => t.level !== level);
    render();
    api("DELETE", `${API}?level=${encodeURIComponent(level)}`).catch(fail);
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
    render();
    api("PUT", `${API}/order`, todos.map((t) => ({ id: Number(t.id), level: t.level }))).catch(fail);
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

    if (clearReport) clearReport.disabled = !todos.some((t) => t.level === "report");

    // 只算本頁的區塊；每日清單是例行事項，不算進待辦數
    const pending = todos.filter((t) => LEVELS.includes(t.level) && t.level !== "daily").length;
    itemsLeft.textContent = `共 ${pending} 項待辦`;
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

  if (clearReport) clearReport.addEventListener("click", () => clearLevel("report"));

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(current);
  });

  // ── 初始化 ──────────────────────────
  const savedTheme =
    localStorage.getItem(THEME_KEY) ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);

  render();
  loadTodos();
})();
