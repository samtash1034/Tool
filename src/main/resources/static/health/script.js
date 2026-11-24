(() => {
  "use strict";

  const API = "/api/health-logs";
  const THEME_KEY = "notepad.theme"; // 與記事本共用深色模式設定

  const $ = (id) => document.getElementById(id);
  const logDate = $("logDate");
  const visit = $("visit");
  const exercise = $("exercise");
  const treatment = $("treatment");
  const note = $("note");
  const saveBtn = $("saveBtn");
  const newBtn = $("newBtn");
  const saveStatus = $("saveStatus");
  const formTitle = $("formTitle");
  const logBody = $("logBody");
  const logCount = $("logCount");
  const themeToggle = $("themeToggle");

  let logs = []; // 依日期由舊到新（後端排序）

  // ── 日期工具（本地日期字串 YYYY-MM-DD） ──────────
  const pad = (n) => String(n).padStart(2, "0");
  const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromKey = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => toKey(new Date());
  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const fmtDate = (key) => { const d = fromKey(key); return `${d.getMonth() + 1}/${d.getDate()}（${WEEKDAYS[d.getDay()]}）`; };

  // ── API ──────────────────────────
  async function request(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
      let msg = `錯誤 ${res.status}`;
      try { const body = await res.json(); if (body.message) msg = body.message; } catch (_) {}
      throw new Error(msg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // ── 表單 ──────────────────────────
  function fillForm(dateKey) {
    logDate.value = dateKey;
    const log = logs.find((l) => l.logDate === dateKey);
    visit.value = log ? log.visit || "" : "";
    exercise.value = log ? log.exercise || "" : "";
    treatment.value = log ? log.treatment || "" : "";
    note.value = log ? log.note || "" : "";
    formTitle.textContent = dateKey === todayKey() ? "今天的紀錄" : `${fmtDate(dateKey)} 的紀錄`;
    saveStatus.textContent = log ? "已有紀錄，可修改後再儲存" : "";
    renderTable();
  }

  async function save() {
    const date = logDate.value;
    if (!date) { saveStatus.textContent = "請選擇日期"; return; }
    const old = logs.find((l) => l.logDate === date);
    saveBtn.disabled = true;
    saveStatus.textContent = "儲存中…";
    try {
      const saved = await request(`${API}/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 保留舊資料中的評分欄位，避免被清掉
          painLevel: old ? old.painLevel : null,
          mobility: old ? old.mobility : null,
          exerciseMinutes: old ? old.exerciseMinutes : 0,
          visit: visit.value,
          exercise: exercise.value,
          treatment: treatment.value,
          note: note.value,
        }),
      });
      logs = logs.filter((l) => l.logDate !== saved.logDate).concat(saved)
        .sort((a, b) => a.logDate.localeCompare(b.logDate));
      renderTable();
      saveStatus.textContent = "✓ 已儲存";
    } catch (e) {
      saveStatus.textContent = `儲存失敗：${e.message}`;
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function remove(log) {
    if (!confirm(`確定刪除 ${fmtDate(log.logDate)} 的紀錄？`)) return;
    try {
      await request(`${API}/${log.id}`, { method: "DELETE" });
      logs = logs.filter((l) => l.id !== log.id);
      if (logDate.value === log.logDate) fillForm(log.logDate);
      else renderTable();
    } catch (e) {
      saveStatus.textContent = `刪除失敗：${e.message}`;
    }
  }

  // ── 表格 ──────────────────────────
  function cell(text, cls) {
    const td = document.createElement("td");
    if (cls) td.className = cls;
    if (text && text.trim()) td.textContent = text;
    else { td.textContent = "—"; td.classList.add("cell-empty"); }
    return td;
  }

  function renderTable() {
    logCount.textContent = `共 ${logs.length} 天`;
    logBody.innerHTML = "";
    if (!logs.length) {
      logBody.innerHTML = `<tr><td colspan="6" class="empty">還沒有紀錄</td></tr>`;
      return;
    }
    [...logs].reverse().forEach((l) => {
      const tr = document.createElement("tr");
      if (l.logDate === logDate.value) tr.className = "active";
      tr.append(
        cell(fmtDate(l.logDate), "cell-date"),
        cell(l.visit),
        cell(l.exercise),
        cell(l.treatment),
        cell(l.note),
      );
      const act = document.createElement("td");
      const del = document.createElement("button");
      del.className = "log-del";
      del.title = "刪除";
      del.textContent = "🗑️";
      del.addEventListener("click", (e) => { e.stopPropagation(); remove(l); });
      act.appendChild(del);
      tr.appendChild(act);
      tr.addEventListener("click", () => { fillForm(l.logDate); window.scrollTo({ top: 0, behavior: "smooth" }); });
      logBody.appendChild(tr);
    });
  }

  // ── 主題 ──────────────────────────
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (_) {}
  applyTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  themeToggle.addEventListener("click", () =>
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

  // ── 事件 ──────────────────────────
  logDate.addEventListener("change", () => logDate.value && fillForm(logDate.value));
  saveBtn.addEventListener("click", save);
  newBtn.addEventListener("click", () => fillForm(todayKey()));
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(); }
  });

  logDate.max = todayKey();
  request(API)
    .then((data) => { logs = data || []; fillForm(todayKey()); })
    .catch((e) => { fillForm(todayKey()); saveStatus.textContent = `載入失敗：${e.message}`; });
})();
