/*
 * 护资刷题 - 无限题量生成引擎
 * 知识点模板 × 随机参数 = 每次都不一样的题
 */
(function () {
  'use strict';

  var rnd = Math.random;
  function pick(a) { return a[Math.floor(rnd() * a.length)]; }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function fmtNum(n) {
    return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  }

  /** 数值型题目：答案固定，但每次干扰项和顺序都不同 */
  function makeNumeric(t) {
    var correct = t.fixed;
    var opts = [];
    if (correct === undefined || correct === null) return null;

    var cands = [1, 2, 3, 4, 5, 6, 8, 10, 12, -1, -2, -3, -4, 15, 20];
    shuffle(cands);
    for (var i = 0; i < cands.length && opts.length < 4; i++) {
      var v = correct + cands[i];
      if (v > 0 && opts.indexOf(v) === -1) opts.push(v);
    }
    var all = opts.concat([correct]).map(fmtNum);
    var idx = all.map(function (_, k) { return k; });
    shuffle(idx);
    var shuffled = idx.map(function (k) { return all[k]; });
    return {
      q: t.q,
      opts: shuffled,
      ans: shuffled.indexOf(fmtNum(correct)),
      exp: t.exp,
      cat: t.cat,
      uid: t.key + '|' + fmtNum(correct)
    };
  }

  /** 选择题：打乱选项顺序，正确答案随之变化 */
  function makeText(t) {
    var order = t.opts.map(function (_, i) { return i; });
    shuffle(order);
    return {
      q: t.q,
      opts: order.map(function (i) { return t.opts[i]; }),
      ans: order.indexOf(t.ans),
      exp: t.exp,
      cat: t.cat,
      uid: t.key + '|' + t.opts[t.ans]
    };
  }

  /** 生成一轮题目 */
  function generate(cfg) {
    var B = window.BANK;
    var numeric = B.numeric.slice();
    var text = B.text.slice();

    if (cfg.cat && cfg.cat !== 'all') {
      numeric = numeric.filter(function (t) { return t.cat === cfg.cat; });
      text = text.filter(function (t) { return t.cat === cfg.cat; });
    }

    var need = cfg.count || 20;
    var out = [];
    var seen = {};

    // 约 35% 数值题（注意：数值题答案固定，作为基础巩固）
    var numN = Math.min(numeric.length, Math.round(need * 0.35));
    shuffle(numeric).slice(0, numN).forEach(function (t) {
      var q = makeNumeric(t);
      if (q && !seen[q.uid]) { seen[q.uid] = 1; out.push(q); }
    });

    // 其余是选择题，每次打乱顺序
    shuffle(text).forEach(function (t) {
      if (out.length >= need) return;
      var q = makeText(t);
      if (!seen[q.uid]) { seen[q.uid] = 1; out.push(q); }
    });

    // 不够用数值题补
    var safe = 0;
    while (out.length < need && safe++ < 200) {
      var t2 = numeric[Math.floor(rnd() * numeric.length)];
      if (!t2) break;
      var q2 = makeNumeric(t2);
      if (q2 && !seen[q2.uid]) { seen[q2.uid] = 1; out.push(q2); }
    }

    return shuffle(out);
  }

  /** 统计题库规模 */
  function estimateTotal() {
    var B = window.BANK;
    return B.numeric.length + B.text.length;
  }

  window.QUIZ = {
    generate: generate,
    estimateTotal: estimateTotal,
    makeNumeric: makeNumeric,
    makeText: makeText
  };
})();
