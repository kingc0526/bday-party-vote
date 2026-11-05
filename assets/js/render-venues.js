/* ===== 场地卡片渲染（feature/venue-cards）=====
 * 契约：把 window.VENUES 渲染进 #venue-list
 *   <article class="venue-card" data-venue-id="{id}">
 *   投票按钮 <button class="vote-btn" data-vote="{id}">（交互由 vote.js 事件委托接管）
 * 依赖：assets/js/venues-data.js 必须先于本文件加载
 */
(function () {
  "use strict";

  /* 文本转义，防数据里混入 HTML 字符破坏标签闭合 */
  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* 只允许 http/https 链接进入 href，防止 javascript: 注入 */
  function safeUrl(url) {
    var u = String(url == null ? "" : url).trim();
    return /^https?:\/\//i.test(u) ? u : "";
  }

  /* 六条信息行：[emoji 图标, label, 数据字段] */
  var INFO_ROWS = [
    ["📍", "地址", "address"],
    ["💰", "价格", "price"],
    ["🎮", "玩什么", "play"],
    ["🍽️", "吃什么", "food"],
    ["☕", "家长区", "parents"],
    ["⚠️", "注意", "note"]
  ];

  function renderInfoRows(v) {
    return INFO_ROWS.map(function (row) {
      var value = v[row[2]];
      if (!value) return "";
      return (
        '<div class="venue-info__row">' +
          "<dt>" + row[0] + " " + row[1] + "</dt>" +
          "<dd>" + esc(value) + "</dd>" +
        "</div>"
      );
    }).join("");
  }

  function renderCard(v, index) {
    var id = esc(v.id);
    var source = safeUrl(v.source);
    /* tagColor 数据里是 "var(--vN)" 形式，注入为卡片级 CSS 变量 --vc */
    var tagColor = /^var\(--v[1-5]\)$/.test(v.tagColor) ? v.tagColor : "var(--v1)";
    /* 共享层 .rise 入场动画 + stagger 延迟 */
    var delay = index * 80;

    return (
      '<article class="venue-card rise" data-venue-id="' + id + '" style="--vc:' + tagColor + ";animation-delay:" + delay + 'ms">' +
        '<header class="venue-card__hero">' +
          '<span class="venue-card__badge" aria-label="方案 ' + id + '">' + id + "</span>" +
          '<span class="venue-card__emoji" aria-hidden="true">' + esc(v.emoji) + "</span>" +
        "</header>" +
        '<div class="venue-card__body">' +
          '<h3 class="venue-card__name">' + esc(v.name) + "</h3>" +
          '<p class="venue-card__district">📌 ' + esc(v.district) + "</p>" +
          '<span class="tag">' + esc(v.tagline) + "</span>" +
          '<dl class="venue-info">' + renderInfoRows(v) + "</dl>" +
        "</div>" +
        '<footer class="venue-card__foot">' +
          '<p class="venue-card__verdict">💡 ' + esc(v.verdict) + "</p>" +
          '<button type="button" class="vote-btn" data-vote="' + id + '">投这票 🎉</button>' +
          (source
            ? '<a class="venue-card__source" href="' + esc(source) + '" target="_blank" rel="noopener noreferrer">来源 ↗</a>'
            : "") +
        "</footer>" +
      "</article>"
    );
  }

  function renderVenues() {
    var list = document.getElementById("venue-list");
    if (!list) return;
    if (!Array.isArray(window.VENUES) || window.VENUES.length === 0) {
      list.innerHTML = '<p style="color:var(--c-ink-soft);font-size:14px;">场地数据加载失败，请刷新重试。</p>';
      return;
    }
    list.innerHTML = window.VENUES.map(renderCard).join("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderVenues);
  } else {
    renderVenues();
  }
})();
