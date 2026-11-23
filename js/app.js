/* 雅思阅读精修库 PWA */
let DATA = null;
let state = { album: "all", type: "all", q: "" };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

async function boot() {
  try {
    const r = await fetch("data/app_data.json", { cache: "no-cache" });
    DATA = await r.json();
  } catch (e) {
    $("loading").textContent = "数据加载失败，请检查网络后刷新。";
    return;
  }
  buildFilters();
  bindEvents();
  renderList();
  $("loading").classList.add("hidden");
  if (location.hash) handleRoute();
}

function buildFilters() {
  const af = $("albumFilters");
  af.innerHTML = chip("all", "全部题集", true) +
    Object.entries(DATA.albums).map(([id, a]) => chip("album-" + id, a.title)).join("");

  const tf = $("typeFilters");
  tf.innerHTML = chip("all", "全部题型", true) +
    Object.entries(DATA.typeZh).map(([t, zh]) => chip("type-" + t, zh)).join("");

  document.querySelectorAll(".chip").forEach((c) => {
    c.addEventListener("click", () => {
      const val = c.dataset.val;
      const group = c.parentElement.id === "albumFilters" ? "album" : "type";
      c.parentElement.querySelectorAll(".chip").forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      state[group] = val;
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
    if (state.album !== "all" && !r.albums.includes(state.album.replace("album-", ""))) return false;
    if (state.type !== "all" && !r.types.includes(state.type.replace("type-", ""))) return false;
    if (state.q && !(r.title.toLowerCase().includes(state.q) ||
      (r.titleZh || "").toLowerCase().includes(state.q))) return false;
    return true;
  });
}

function renderList() {
  const list = filtered();
  $("countText").textContent = `共 ${list.length} 篇`;
  $("articleList").innerHTML = list.map((r) => {
    const albumBadges = r.albums.map((id) =>
      `<span class="badge album">${esc(DATA.albums[id] ? DATA.albums[id].title : "")}</span>`).join("");
    const typeBadges = r.types.map((t) =>
      `<span class="badge">${esc(DATA.typeZh[t] || t)}</span>`).join("");
    return `<li class="article-card" data-id="${esc(r.id)}">
      <div class="t">${esc(r.title)}</div>
      <div class="tz">${esc(r.titleZh || "")}</div>
      <div class="badges">${albumBadges}${typeBadges}</div>
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
}

function showDetail(r) {
  $("listView").classList.add("hidden");
  $("backBtn").classList.remove("hidden");
  $("pageTitle").textContent = "文章详情";

  // 句子 -> 题号映射，用于标黄
  const mark = {};
  r.groups.forEach((g) => g.questions.forEach((q) => {
    q.indices.forEach((i) => { (mark[i] = mark[i] || []).push(q.q); });
  }));

  const sentencesHtml = r.sentences.map((s) => {
    const qs = mark[s.i];
    const hl = qs ? " hl" : "";
    const qmark = qs ? `<span class="qmark">Q${[...new Set(qs)].sort((a, b) => a - b).join(",")}</span>` : "";
    return `<div class="sentence${hl}">
      <div class="en">${qmark}${esc(s.en)}</div>
      <div class="zh">${esc(s.zh)}</div>
    </div>`;
  }).join("");

  const groupsHtml = r.groups.map((g) => {
    const blank = g.blankEn ? `<div class="blank-text">${esc(g.blankEn)}
      <div class="zh">${esc(g.blankZh)}</div></div>` : "";
    const qs = g.questions.map((q) => {
      const opts = q.options.map((o) => {
        const correct = isCorrectOpt(q, o) ? " correct" : "";
        return `<div class="opt${correct}">
          <span class="optnum">${esc(o.num)}</span>${esc(o.en)}
          <span class="optzh">${esc(o.zh)}</span></div>`;
      }).join("");
      const stem = q.stemEn ? `<div class="qstem"><span class="num">Q${q.q}</span>${esc(q.stemEn)}</div>
        <div class="qstem-zh">${esc(q.stemZh)}</div>` : "";
      return `<div class="qitem">${stem}
        <div class="opts">${opts}</div>
        <div class="answer-line">正确答案<span class="ans">${esc(q.answer)}</span></div>
        ${q.anaZh ? `<div class="analysis"><span class="lab">解析</span>${esc(q.anaZh)}</div>` : ""}
        ${q.anaEn ? `<div class="analysis en"><span class="lab">原文</span>${esc(q.anaEn)}</div>` : ""}
      </div>`;
    }).join("");
    return `<div class="q-group">
      <div class="ghead"><span class="gtype-tag">${esc(g.typeZh)}</span>${esc(g.title)}</div>
      ${blank}${qs}
    </div>`;
  }).join("");

  $("detailView").innerHTML = `
    <div class="detail-head">
      <h2>${esc(r.title)}</h2>
      <div class="sub">${esc(r.titleZh || "")}</div>
    </div>
    <div class="section-label">文章（答案句已标黄）</div>
    ${sentencesHtml}
    <div class="section-label">题目与解析</div>
    ${groupsHtml}`;
  $("detailView").classList.remove("hidden");
  window.scrollTo(0, 0);
}

function isCorrectOpt(q, o) {
  const ans = String(q.answer).trim();
  if (q.answer && ans === String(o.num).trim()) return true;
  // 填空题：选项为空，不做选项级标对
  if (!q.options.length) return false;
  return false;
}

boot();
