/* 待辦事項 — 資料儲存於 localStorage */
(function () {
  "use strict";

  const STORAGE_KEY = "todos.items";
  const THEME_KEY = "todos.theme";

  // DOM 元素
  const addForm = document.getElementById("addForm");
  const todoInput = document.getElementById("todoInput");
  const todoList = document.getElementById("todoList");
  const itemsLeft = document.getElementById("itemsLeft");
  const clearCompletedBtn = document.getElementById("clearCompletedBtn");
  const themeToggle = document.getElementById("themeToggle");

  let todos = loadTodos();

  // ── 資料存取 ──────────────────────────
  function loadTodos() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  // ── 待辦操作 ──────────────────────────
  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    });
    persist();
    render();
  }

  function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
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

  function clearCompleted() {
    if (!todos.some((t) => t.completed)) return;
    if (!confirm("確定要清除所有已完成的待辦事項嗎？")) return;
    todos = todos.filter((t) => !t.completed);
    persist();
    render();
  }

  // ── 畫面渲染 ──────────────────────────
  function render() {
    todoList.innerHTML = "";

    if (!todos.length) {
      const li = document.createElement("li");
      li.className = "no-result";
      li.textContent = "尚無待辦事項，新增一項吧！";
      todoList.appendChild(li);
    } else {
      todos.forEach((todo) => {
        const li = document.createElement("li");
        li.className = "todo-item" + (todo.completed ? " completed" : "");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "todo-checkbox";
        checkbox.checked = todo.completed;
        checkbox.addEventListener("change", () => toggleTodo(todo.id));

        const text = document.createElement("span");
        text.className = "todo-text";
        text.textContent = todo.text;
        text.contentEditable = "true";
        text.spellcheck = false;
        text.addEventListener("blur", () => editTodo(todo.id, text.textContent));
        text.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            text.blur();
          }
        });

        const del = document.createElement("button");
        del.className = "todo-delete";
        del.textContent = "✕";
        del.title = "刪除";
        del.addEventListener("click", () => deleteTodo(todo.id));

        li.append(checkbox, text, del);
        todoList.appendChild(li);
      });
    }

    const activeCount = todos.filter((t) => !t.completed).length;
    itemsLeft.textContent = `尚有 ${activeCount} 項待辦（共 ${todos.length} 項）`;
  }

  // ── 深色模式 ──────────────────────────
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem(THEME_KEY, theme);
  }

  // ── 事件綁定 ──────────────────────────
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(todoInput.value);
    todoInput.value = "";
    todoInput.focus();
  });

  clearCompletedBtn.addEventListener("click", clearCompleted);

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
})();
