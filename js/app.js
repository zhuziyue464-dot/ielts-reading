/* 雅思阅读精修库 PWA */
let DATA = null;
let state = { part: "all", q: "" };

/* 已读进度，持久化到本机 localStorage */
const STORE_KEY = "ielts_read_ids_v1";
let readSet = new Set();
try {
  readSet = new Set(JSON.parse(localStorage.getItem(STORE_KEY) || "[]"));
} catch (e) { readSet = new Set(); }
function saveRead() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...readSet]));
}
function toggleRead(id) {
  if (readSet.has(id)) readSet.delete(id);
  else readSet.add(id);
  saveRead();
}

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

async function boot() {
  try {
    const r = await fetch("data/app_data.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    DATA = await r.json();
    buildFilters();
    bindEvents();
    renderList();
    if (location.hash) handleRoute();
  } catch (e) {
    $("loading").textContent = "加载失败：" + (e && e.message) + "，请刷新重试。";
    return;
  }
  $("loading").classList.add("hidden");
}

function buildFilters() {
  const pf = $("albumFilters")
  pf.innerHTML = chip("all", "全部", true) +
    ["Part 1", "Part 2", "Part 3"].map((p) => chip(p, p)).join("");
  $("typeFilters").innerHTML = "";

  pf.querySelectorAll(".chip").forEach((c) => {
    c.addEventListener("click", () => {
      pf.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      state.part = c.dataset.val;
      renderList();
    });
  });
}

function chip(val, label, active) {
  return `<button class="chip${active ? " active" : ""}" data-val="${esc(val)}">${esc(label)}</button>`;
}

function bindEvents() {
  $("searchInput").addEventListener("input", (e) => {
    state.q = e.target.value.trim().toLowerCase();
    renderList();
  });
  $("backBtn").addEventListener("click", () => { location.hash = ""; });
  window.addEventListener("hashchange", handleRoute);
}

function filtered() {
  return DATA.records.filter((r) => {
    if (state.part !== "all" && r.part !== state.part) return false;
    if (state.q && !(r.title.toLowerCase().includes(state.q) ||
      (r.titleZh || "").toLowerCase().includes(state.q))) return false;
    return true;
  });
}

function renderProgress() {
  const total = DATA.records.length;
  const read = DATA.records.reduce((n, r) => n + (readSet.has(r.id) ? 1 : 0), 0);
  const pct = total ? Math.round((read / total) * 100) : 0;
  $("totalCount").textContent = total;
  $("readCount").textContent = read;
  $("readPct").textContent = pct + "%";
  // 已有已读但百分比四舍五入为 0 时，给进度条一个最小可见宽度
  const barW = pct === 0 && read > 0 ? 2 : pct;
  $("progressFill").style.width = barW + "%";
}

function renderList() {
  const list = filtered();
  const readInList = list.reduce((n, r) => n + (readSet.has(r.id) ? 1 : 0), 0);
  $("countText").textContent = `共 ${list.length} 篇，本页已读 ${readInList} 篇`;
  renderProgress();
  $("articleList").innerHTML = list.map((r) => {
    const done = readSet.has(r.id);
    const partBadge = `<span class="badge album">${esc(r.part)}</span>`;
    const typeBadges = r.types.map((t) =>
      `<span class="badge">${esc(DATA.typeZh[t] || t)}</span>`).join("");
    const readBadge = done
      ? `<span class="badge done">已读 ✓</span>`
      : `<span class="badge undone">未读</span>`;
    return `<li class="article-card${done ? " is-done" : ""}" data-id="${esc(r.id)}">
      <div class="t">${esc(r.title)}</div>
      <div class="tz">${esc(r.titleZh || "")}</div>
      <div class="badges">${partBadge}${readBadge}${typeBadges}</div>
    </li>`;
  }).join("");
  document.querySelectorAll(".article-card").forEach((c) => {
    c.addEventListener("click", () => { location.hash = "p/" + c.dataset.id; });
  });
}

/* ---------- 详情页 ---------- */
function handleRoute() {
  const m = location.hash.match(/^#p\/(.+)$/);
  if (m) {
    const r = DATA.records.find((x) => x.id === m[1]);
    if (r) { showDetail(r); return; }
  }
  $("detailView").classList.add("hidden");
  $("listView").classList.remove("hidden");
  $("backBtn").classList.add("hidden");
  $("pageTitle").textContent = "雅思阅读精修库";
  renderList();
}

function showDetail(r) {
  $("listView").classList.add("hidden");
  $("backBtn").classList.remove("hidden");
  $("pageTitle").textContent = "文章详情";

  const sentencesHtml = r.sentences.map((s) => {
    const ms = r.marks[s.i];
    if (!ms) {
      return `<div class="sentence">
        <div class="en">${esc(s.en)}</div>
        <div class="zh">${esc(s.zh)}</div>
      </div>`;
    }
    const qs = [...new Set(ms.map((x) => x.q))].sort((a, b) => a - b);
    const stems = ms.filter((x) => x.stemZh)
      .map((x) => `<div class="stem-line"><span class="qnum">Q${x.q}</span>${esc(x.stemZh)}</div>`)
      .join("");
    return `<div class="sentence hl">
      <div class="en"><span class="qmark">Q${qs.join(",")}</span>${esc(s.en)}</div>
      <div class="zh">${esc(s.zh)}</div>
      ${stems ? `<button class="stem-toggle" data-open="0">查看题目中文 ▾</button>
        <div class="stem-box hidden">${stems}</div>` : ""}
    </div>`;
  }).join("");

  const done = readSet.has(r.id);
  $("detailView").innerHTML = `
    <div class="detail-head">
      <h2>${esc(r.title)}</h2>
      <div class="sub">${esc(r.titleZh || "")}</div>
    </div>
    <div class="section-label">文章（答案句已标黄，点开看题目中文）</div>
    ${sentencesHtml}
    <div class="detail-actions">
      <button id="markReadBtn" class="mark-read-btn${done ? " is-done" : ""}">
        ${done ? "✓ 已读完（点此取消标记）" : "标记为已读完"}
      </button>
    </div>`;
  $("detailView").classList.remove("hidden");

  $("detailView").querySelectorAll(".stem-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const box = btn.nextElementSibling;
      const open = box.classList.toggle("hidden") === false;
      btn.textContent = open ? "收起题目 ▴" : "查看题目中文 ▾";
    });
  });

  $("markReadBtn").addEventListener("click", () => {
    toggleRead(r.id);
    const nowDone = readSet.has(r.id);
    const btn = $("markReadBtn");
    btn.classList.toggle("is-done", nowDone);
    btn.textContent = nowDone ? "✓ 已读完（点此取消标记）" : "标记为已读完";
    renderProgress();
  });
  window.scrollTo(0, 0);
}

boot();
