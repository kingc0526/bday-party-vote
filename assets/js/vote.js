/* ===== 投票系统：投票 / 改票 / 实时战况 / 底部操作栏 ===== */
/* 依赖：window.VENUES（venues-data.js）、#results、#dock、#toast（index.html） */
(function () {
  "use strict";

  var KEY_VOTE = "bday-vote-v1";
  var KEY_COUNTS = "bday-vote-counts-v1";

  var venues = Array.isArray(window.VENUES) ? window.VENUES : [];
  var toastEl = document.getElementById("toast");
  var resultsEl = document.getElementById("results");
  var dockEl = document.getElementById("dock");
  var toastTimer = null;

  /* ---------- localStorage 读写（全部容错） ---------- */
  function readVote() {
    try {
      var raw = localStorage.getItem(KEY_VOTE);
      var id = raw === null ? null : parseInt(raw, 10);
      return isFinite(id) ? id : null;
    } catch (e) {
      return null;
    }
  }

  function writeVote(id) {
    try {
      if (id === null) localStorage.removeItem(KEY_VOTE);
      else localStorage.setItem(KEY_VOTE, String(id));
    } catch (e) { /* 私密模式等场景静默降级 */ }
  }

  /* 返回 { counts, isEmpty }：未产生任何本机投票时全部为 0 */
  function readCounts() {
    try {
      var raw = localStorage.getItem(KEY_COUNTS);
      if (raw) {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === "object") {
          var counts = {};
          venues.forEach(function (v) {
            var n = parseInt(obj[v.id], 10);
            counts[v.id] = isFinite(n) && n > 0 ? n : 0;
          });
          return { counts: counts, isEmpty: false };
        }
      }
    } catch (e) { /* 落到全零 */ }
    var zeros = {};
    venues.forEach(function (v) {
      zeros[v.id] = 0;
    });
    return { counts: zeros, isEmpty: true };
  }

  function writeCounts(counts) {
    try {
      localStorage.setItem(KEY_COUNTS, JSON.stringify(counts));
    } catch (e) { /* 静默降级 */ }
  }

  function clearAll() {
    try {
      localStorage.removeItem(KEY_VOTE);
      localStorage.removeItem(KEY_COUNTS);
    } catch (e) { /* 静默降级 */ }
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-show");
    }, 2000);
  }

  /* ---------- 按钮状态（只追加/移除 .is-voted，不动基础样式） ---------- */
  function syncButtons() {
    var voted = readVote();
    var btns = document.querySelectorAll(".vote-btn");
    Array.prototype.forEach.call(btns, function (btn) {
      var id = parseInt(btn.getAttribute("data-vote"), 10);
      if (voted !== null && id === voted) {
        btn.classList.add("is-voted");
        btn.textContent = "✓ 已选 " + id + " 号";
        btn.setAttribute("aria-pressed", "true");
      } else {
        btn.classList.remove("is-voted");
        btn.textContent = "投这票";
        btn.setAttribute("aria-pressed", "false");
      }
    });
  }

  /* ---------- 实时战况 ---------- */
  function renderResults(pulseId) {
    if (!resultsEl) return;
    var voted = readVote();
    var state = readCounts();
    var counts = state.counts;
    var total = venues.reduce(function (sum, v) {
      return sum + (counts[v.id] || 0);
    }, 0);

    var html = '<div class="vote-results" role="list">';
    venues.forEach(function (v) {
      var n = counts[v.id] || 0;
      var pct = total > 0 ? Math.round((n / total) * 100) : 0;
      var mine = voted === v.id ? " is-mine" : "";
      var pulse = pulseId === v.id ? " is-pulse" : "";
      html +=
        '<div class="vr-row' + mine + '" role="listitem">' +
          '<div class="vr-row__top">' +
            '<span class="vr-row__badge" style="background:' + v.tagColor + '">' + v.id + "</span>" +
            '<span class="vr-row__emoji" aria-hidden="true">' + v.emoji + "</span>" +
            '<span class="vr-row__name">' + v.name + "</span>" +
            '<span class="vr-row__count">' + n + " 票</span>" +
          "</div>" +
          '<div class="vr-row__bar-track">' +
            '<div class="vr-row__bar' + pulse + '" style="width:' + pct + "%;background:" + v.tagColor + '"' +
              ' role="img" aria-label="' + v.name + "：" + n + " 票，占 " + pct + '%"></div>' +
          "</div>" +
        "</div>";
    });
    if (state.isEmpty) {
      html += '<p class="vote-results__note">虚位以待 · 等你来投第一票 🎈</p>';
    }
    html += "</div>";
    resultsEl.innerHTML = html;
    resultsEl.setAttribute("aria-live", "polite");
  }

  /* ---------- 底部操作栏 ---------- */
  function renderDock() {
    if (!dockEl) return;
    dockEl.innerHTML =
      '<a class="dock__btn dock__btn--ghost" href="#results">📊 查看结果</a>' +
      '<button class="dock__btn dock__btn--primary" type="button" data-clear-vote>🔄 清空重投</button>';
  }

  /* ---------- 事件（document 级委托，兼容卡片渲染时序） ---------- */
  document.addEventListener("click", function (ev) {
    var voteBtn = ev.target.closest ? ev.target.closest(".vote-btn") : null;
    if (voteBtn) {
      var id = parseInt(voteBtn.getAttribute("data-vote"), 10);
      if (!isFinite(id)) return;
      var prev = readVote();
      if (prev === id) {
        toast("你已经投给 " + id + " 号啦 ✅");
        return;
      }
      var state = readCounts();
      var counts = state.counts;
      if (prev !== null && counts[prev] > 0) counts[prev] -= 1; /* 改票：旧票 -1 */
      counts[id] = (counts[id] || 0) + 1;
      writeCounts(counts);
      writeVote(id);
      syncButtons();
      renderResults(id);
      toast("已投给 " + id + " 号 ✅");
      return;
    }

    var clearBtn = ev.target.closest ? ev.target.closest("[data-clear-vote]") : null;
    if (clearBtn) {
      clearAll();
      syncButtons();
      renderResults();
      toast("已清空，重新投吧 🎈");
    }
  });

  /* ---------- 初始化 ---------- */
  renderDock();
  renderResults();
  syncButtons();
  /* 卡片可能是异步渲染的，稍后再同步一次按钮状态 */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncButtons);
  }
  setTimeout(syncButtons, 300);
})();
