/* 护理工具箱 - 全部逻辑 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function loadJ(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } }
  function saveJ(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function dk(d) { return d.getFullYear() + '-' + ('0'+(d.getMonth()+1)).slice(-2) + '-' + ('0'+d.getDate()).slice(-2); }
  function today() { return dk(new Date()); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  var K = { diary:'tb_diary', skill:'tb_fav_skill', cd:'tb_cd', cdTask:'tb_cdtask', shift:'tb_shift',
            vital:'tb_vital', money:'tb_money', pomo:'tb_pomo', todo:'tb_todo', theme:'tb_theme' };

  /* ---------------- 主题 ---------------- */
  var theme = loadJ(K.theme, 'dark');
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme);
  }
  applyTheme();
  $('btn-theme').onclick = function () {
    theme = theme === 'dark' ? 'light' : 'dark';
    saveJ(K.theme, theme); applyTheme();
  };

  /* ---------------- 视图 ---------------- */
  function show(id) {
    ['v-home','v-diary','v-skills','v-countdown','v-shift','v-dose','v-vitals','v-money','v-pomo','v-todo']
      .forEach(function (v) { $(v).className = 'view' + (v === id ? ' on' : ''); });
    window.scrollTo({ top: 0 });
    if (id === 'v-diary') renderDiary();
    if (id === 'v-countdown') renderCountdown();
    if (id === 'v-shift') renderShift();
    if (id === 'v-vitals') renderVitals();
    if (id === 'v-money') renderMoney();
    if (id === 'v-pomo') renderPomo();
    if (id === 'v-todo') renderTodo();
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) {
    b.onclick = function () { show('v-home'); };
  });

  /* ---------------- 通用弹层 ---------------- */
  var sheetOk = null;
  function openSheet(title, bodyHtml, onOk) {
    $('sheet-title').textContent = title;
    $('sheet-body').innerHTML = bodyHtml;
    sheetOk = onOk;
    $('sheet').style.display = 'flex';
  }
  function closeSheet() { $('sheet').style.display = 'none'; sheetOk = null; }
  $('sheet-cancel').onclick = closeSheet;
  $('sheet').onclick = function (e) { if (e.target === $('sheet')) closeSheet(); };
  $('sheet-ok').onclick = function () { if (sheetOk && sheetOk() !== false) closeSheet(); };

  /* ================= 1. 实习日志 ================= */
  var diary = loadJ(K.diary, []);
  function renderDiary() {
    var depts = {};
    diary.forEach(function (d) { depts[d.dept] = (depts[d.dept] || 0) + 1; });
    $('diary-stat').innerHTML =
      '<div class="stat"><b>' + diary.length + '</b><span>累计记录</span></div>' +
      '<div class="stat"><b>' + Object.keys(depts).length + '</b><span>轮转科室</span></div>';
    var tabs = '<button class="' + (curDept === 'all' ? 'on' : '') + '" data-dept="all">全部</button>';
    Object.keys(depts).forEach(function (d) {
      tabs += '<button class="' + (curDept === d ? 'on' : '') + '" data-dept="' + esc(d) + '">' + esc(d) + ' (' + depts[d] + ')</button>';
    });
    $('diary-tabs').innerHTML = tabs;
    Array.prototype.forEach.call($('diary-tabs').children, function (b) {
      b.onclick = function () { curDept = b.getAttribute('data-dept'); renderDiary(); };
    });
    var list = diary.filter(function (d) { return curDept === 'all' || d.dept === curDept; })
      .sort(function (a, b) { return b.at - a.at; });
    if (!list.length) { $('diary-list').innerHTML = '<div class="empty">还没有记录<br>点右上角「+ 记一笔」开始</div>'; return; }
    $('diary-list').innerHTML = list.map(function (d) {
      return '<div class="item" data-id="' + d.id + '">' +
        '<div class="t">' + esc(d.dept) + '<span class="chip" style="float:right">' + esc(d.date) + '</span></div>' +
        '<div class="m">' + esc(d.content) + '</div>' +
        (d.skills ? '<div class="m" style="margin-top:6px">🏥 操作：' + esc(d.skills) + '</div>' : '') +
        (d.teacher ? '<div class="m">👩‍⚕️ 带教：' + esc(d.teacher) + '</div>' : '') +
        '<div style="margin-top:8px;display:flex;gap:8px"><button class="sm" data-del="' + d.id + '">删除</button></div>' +
        '</div>';
    }).join('');
    Array.prototype.forEach.call($('diary-list').querySelectorAll('[data-del]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-del');
        if (!confirm('删除这条记录？')) return;
        diary = diary.filter(function (x) { return x.id !== id; });
        saveJ(K.diary, diary); renderDiary();
      };
    });
  }
  var curDept = 'all';
  $('diary-add').onclick = function () {
    openSheet('新增实习日志',
      '<div class="field"><label>日期</label><input type="date" id="d-date" value="' + today() + '"></div>' +
      '<div class="field"><label>科室</label><input id="d-dept" placeholder="如：心内科"></div>' +
      '<div class="field"><label>今日内容</label><textarea id="d-content" placeholder="做了什么、学到什么"></textarea></div>' +
      '<div class="field"><label>操作项目（可选）</label><input id="d-skills" placeholder="如：静脉输液、导尿"></div>' +
      '<div class="field"><label>带教老师（可选）</label><input id="d-teacher"></div>',
      function () {
        var dept = $('d-dept').value.trim();
        var content = $('d-content').value.trim();
        if (!dept || !content) { alert('科室和内容都要填'); return false; }
        diary.push({ id: uid(), at: Date.now(), date: $('d-date').value, dept: dept,
          content: content, skills: $('d-skills').value.trim(), teacher: $('d-teacher').value.trim() });
        saveJ(K.diary, diary); renderDiary();
      });
  };

  /* ================= 2. 护理操作速查 ================= */
  var SKILLS = [
    { cat:'基础', name:'测量体温', pts:['口温3分钟、腋温10分钟、肛温3分钟','测腋温前擦干腋窝','进食冷热饮后30分钟再测口温','昏迷、婴幼儿用肛温或腋温'] },
    { cat:'基础', name:'测量血压', pts:['安静休息5分钟后测量','袖带下缘距肘窝2～3cm','袖带松紧以能插入一指为宜','偏瘫患者测健侧'] },
    { cat:'基础', name:'无菌操作', pts:['无菌包打开后24小时内有效','无菌盘铺好4小时内有效','已取出的无菌物品不可放回','手臂保持在腰部以上'] },
    { cat:'基础', name:'皮内注射', pts:['进针角度5°～10°','常用部位前臂掌侧下段','推注0.1ml形成皮丘','20分钟后看结果'] },
    { cat:'基础', name:'皮下注射', pts:['进针角度30°～40°','针梗进入1/2～2/3','常用部位上臂三角肌下缘、腹部'] },
    { cat:'基础', name:'肌内注射', pts:['进针角度90°','臀大肌十字法选外上1/4象限','避开内下角坐骨神经'] },
    { cat:'基础', name:'静脉输液', pts:['成人40～60滴/分，儿童20～40滴/分','老年、心肺功能差者减慢','空气栓塞取左侧卧位+头低足高'] },
    { cat:'基础', name:'导尿术', pts:['女性插入4～6cm','男性插入20～22cm','见尿后再进1～2cm','集尿袋低于膀胱'] },
    { cat:'基础', name:'鼻饲', pts:['每次不超过200ml，间隔>2小时','抬高床头30°～45°','鼻饲后保持体位30分钟','确认胃管在胃内'] },
    { cat:'基础', name:'灌肠', pts:['大量不保留灌肠液39～41℃','液面距肛门40～60cm','伤寒患者液量<500ml、液面<30cm','小量不保留灌肠液面<30cm'] },
    { cat:'基础', name:'吸痰', pts:['每次吸引不超过15秒','吸痰前后给氧','动作轻柔，避免损伤黏膜'] },
    { cat:'基础', name:'压疮预防', pts:['每2小时翻身一次','已发红的皮肤禁止按摩','骶尾部最常见','保持皮肤清洁干燥'] },
    { cat:'急救', name:'心肺复苏', pts:['按压部位两乳头连线中点','深度5～6cm，频率100～120次/分','按压通气比30:2','充分回弹'] },
    { cat:'急救', name:'吸氧', pts:['Ⅱ型呼衰低流量1～2L/min','急性肺水肿用20%～30%乙醇湿化','氧气筒5米内禁烟火','压力<0.5MPa更换'] },
    { cat:'急救', name:'过敏性休克', pts:['立即停药、平卧','首选0.1%盐酸肾上腺素0.5～1ml皮下注射','保持气道通畅、吸氧','建立静脉通路'] },
    { cat:'急救', name:'海姆立克法', pts:['完全性气道梗阻使用','站在患者背后，一手握拳放于脐上两横指','快速向上向内冲击','直至异物排出'] },
    { cat:'急救', name:'洗胃', pts:['每次灌入300～500ml','强酸强碱中毒禁止洗胃','洗至无味澄清','记录出入量'] },
    { cat:'专科', name:'留置针护理', pts:['每3～4天更换一次','观察穿刺点有无红肿','冲管保持通畅','早期静脉炎拔针'] },
    { cat:'专科', name:'伤口换药', pts:['先清洁伤口，后污染、再感染','无菌操作、动作轻柔','观察肉芽生长情况','记录渗出液性质'] },
    { cat:'专科', name:'引流管护理', pts:['引流袋低于引流口','保持通畅、防止折叠','观察引流液颜色量和性质','记录并汇报'] },
    { cat:'专科', name:'输血', pts:['两人核对、先慢后快','不可加药，用生理盐水冲管','观察15分钟无反应再调快','溶血反应立即停输'] },
    { cat:'专科', name:'氧疗护理', pts:['低流量持续吸氧','注意湿化、清洁鼻导管','观察缺氧改善情况','防火防油'] },
  ];
  var favSkill = loadJ(K.skill, []);
  var skillCat = '全部', skillKw = '';
  function renderSkills() {
    var cats = ['全部','基础','急救','专科','⭐收藏'];
    $('skill-cats').innerHTML = cats.map(function (c) {
      return '<button class="' + (skillCat === c ? 'on' : '') + '" data-c="' + c + '">' + c + '</button>';
    }).join('');
    Array.prototype.forEach.call($('skill-cats').children, function (b) {
      b.onclick = function () { skillCat = b.getAttribute('data-c'); renderSkills(); };
    });
    var list = SKILLS.filter(function (s) {
      if (skillCat === '⭐收藏') return favSkill.indexOf(s.name) >= 0;
      if (skillCat !== '全部' && s.cat !== skillCat) return false;
      if (skillKw && s.name.indexOf(skillKw) < 0 && s.pts.join('').indexOf(skillKw) < 0) return false;
      return true;
    });
    if (!list.length) { $('skill-list').innerHTML = '<div class="empty">没有匹配的操作</div>'; return; }
    $('skill-list').innerHTML = list.map(function (s) {
      var fav = favSkill.indexOf(s.name) >= 0;
      return '<div class="item"><div class="t">' + esc(s.name) +
        '<button class="sm" style="float:right;padding:3px 8px" data-fav="' + esc(s.name) + '">' + (fav ? '★' : '☆') + '</button></div>' +
        '<div class="m" style="margin-top:6px">' + s.pts.map(function (p) { return '• ' + esc(p); }).join('<br>') + '</div></div>';
    }).join('');
    Array.prototype.forEach.call($('skill-list').querySelectorAll('[data-fav]'), function (b) {
      b.onclick = function () {
        var n = b.getAttribute('data-fav');
        var i = favSkill.indexOf(n);
        if (i >= 0) favSkill.splice(i, 1); else favSkill.push(n);
        saveJ(K.skill, favSkill); renderSkills();
      };
    });
  }
  $('skill-search').oninput = function () { skillKw = this.value.trim(); renderSkills(); };

  /* ================= 3. 倒计时打卡 ================= */
  var cd = loadJ(K.cd, { date: '2027-04-24' });
  var cdTasks = loadJ(K.cdTask, {});
  function renderCountdown() {
    $('cd-date').value = cd.date;
    var d = new Date(cd.date + 'T00:00:00');
    var now = new Date(); now.setHours(0,0,0,0);
    var days = Math.round((d - now) / 86400000);
    $('cd-days').textContent = days > 0 ? days : (days === 0 ? '今天' : '已过');
    $('cd-label').textContent = days > 0 ? '天后考试' : '考试日期已过';

    var keys = Object.keys(cdTasks).sort();
    var doneCount = keys.filter(function (k) { return cdTasks[k]; }).length;

    // 连续打卡
    var streak = 0, t = new Date();
    for (var i = 0; i < 400; i++) {
      if (cdTasks[dk(t)]) { streak++; t.setDate(t.getDate() - 1); }
      else if (i === 0) { t.setDate(t.getDate() - 1); }
      else break;
    }
    $('cd-stat').innerHTML =
      '<div class="stat"><b style="color:#fbbf24">' + streak + '</b><span>连续打卡</span></div>' +
      '<div class="stat"><b>' + doneCount + '</b><span>累计打卡天数</span></div>';

    var heat = '';
    var s = new Date(); s.setDate(s.getDate() - 27);
    for (var j = 0; j < 28; j++) {
      var k = dk(s);
      var on = cdTasks[k];
      heat += '<div class="d' + (on ? ' today' : '') + '" style="' + (on ? 'background:rgba(79,140,255,.45);color:#fff' : '') +
        '" onclick="window.__toggleDay(\'' + k + '\')">' + s.getDate() + '</div>';
      s.setDate(s.getDate() + 1);
    }
    $('cd-heat').innerHTML = '<div class="h">日</div><div class="h">一</div><div class="h">二</div><div class="h">三</div><div class="h">四</div><div class="h">五</div><div class="h">六</div>' + heat;

    var tk = today();
    $('cd-tasks').innerHTML = '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center">' +
      '<div><b>今天（' + tk + '）</b><div class="m" style="font-size:12px;color:var(--muted);margin-top:4px">' +
      (cdTasks[tk] ? '✓ 已打卡' : '还没打卡') + '</div></div>' +
      '<button class="p sm" onclick="window.__toggleDay(\'' + tk + '\')">' + (cdTasks[tk] ? '取消打卡' : '打卡') + '</button></div></div>';
  }
  window.__toggleDay = function (k) {
    cdTasks[k] = !cdTasks[k];
    saveJ(K.cdTask, cdTasks);
    renderCountdown();
  };
  $('cd-save').onclick = function () {
    var v = $('cd-date').value;
    if (!v) return;
    cd = { date: v }; saveJ(K.cd, cd); renderCountdown();
  };

  /* ================= 4. 排班表 ================= */
  var shifts = loadJ(K.shift, {});
  var shiftMonth = new Date().toISOString().slice(0, 7);
  function renderShift() {
    $('shift-month').value = shiftMonth;
    var y = parseInt(shiftMonth.slice(0, 4), 10), m = parseInt(shiftMonth.slice(5, 7), 10);
    var first = new Date(y, m - 1, 1);
    var daysInMonth = new Date(y, m, 0).getDate();
    var startW = first.getDay();

    var cnt = { day: 0, night: 0, rest: 0 };
    for (var d = 1; d <= daysInMonth; d++) {
      var k = shiftMonth + '-' + ('0' + d).slice(-2);
      if (shifts[k]) cnt[shifts[k]]++;
    }
    $('shift-stat').innerHTML =
      '<div class="stat"><b>' + cnt.day + '</b><span>白班</span></div>' +
      '<div class="stat"><b style="color:#d8b4fe">' + cnt.night + '</b><span>夜班</span></div>' +
      '<div class="stat"><b>' + cnt.rest + '</b><span>休息</span></div>' +
      '<div class="stat"><b>' + (cnt.day + cnt.night) + '</b><span>上班天数</span></div>';

    var html = '<div class="h">日</div><div class="h">一</div><div class="h">二</div><div class="h">三</div><div class="h">四</div><div class="h">五</div><div class="h">六</div>';
    for (var i = 0; i < startW; i++) html += '<div></div>';
    var todayS = today();
    for (var dd = 1; dd <= daysInMonth; dd++) {
      var kk = shiftMonth + '-' + ('0' + dd).slice(-2);
      var sh = shifts[kk];
      var tagMap = { day: ['day','白'], night: ['night','夜'], rest: ['rest','休'] };
      var tag = sh ? '<span class="tag ' + tagMap[sh][0] + '">' + tagMap[sh][1] + '</span>' : '';
      html += '<div class="d' + (kk === todayS ? ' today' : '') + '">' + dd + tag + '</div>';
    }
    $('shift-cal').innerHTML = html;
    // 点击交互：给每天绑定
    var cells = $('shift-cal').querySelectorAll('.d');
    Array.prototype.forEach.call(cells, function (c, idx) {
      var dayNum = parseInt(c.textContent, 10);
      c.onclick = function () {
        var key = shiftMonth + '-' + ('0' + dayNum).slice(-2);
        var cur = shifts[key];
        var next = cur === undefined ? 'day' : cur === 'day' ? 'night' : cur === 'night' ? 'rest' : undefined;
        if (next) shifts[key] = next; else delete shifts[key];
        saveJ(K.shift, shifts);
        renderShift();
      };
    });
  }
  $('shift-month').onchange = function () { shiftMonth = this.value; renderShift(); };
  $('shift-record').onclick = function () {
    var k = today();
    openSheet('记录今天（' + k + '）',
      '<div class="field"><label>班次</label><select id="sh-type">' +
      '<option value="day">白班</option><option value="night">夜班</option><option value="rest">休息</option></select></div>',
      function () {
        shifts[k] = $('sh-type').value;
        saveJ(K.shift, shifts); renderShift();
      });
  };

  /* ================= 5. 剂量计算 ================= */
  var doseTab = 'weight';
  Array.prototype.forEach.call($('dose-tabs').children, function (b) {
    b.onclick = function () {
      doseTab = b.getAttribute('data-t');
      Array.prototype.forEach.call($('dose-tabs').children, function (x) { x.className = x === b ? 'on' : ''; });
      renderDose();
    };
  });
  function renderDose() {
    var p = $('dose-panel');
    if (doseTab === 'weight') {
      p.innerHTML = '<div class="field"><label>体重（kg）</label><input type="number" id="dw" step="0.1" placeholder="如 25"></div>' +
        '<div class="field"><label>每公斤剂量（mg/kg）</label><input type="number" id="dd" step="0.1" placeholder="如 10"></div>' +
        '<div class="field"><label>药物规格（mg/支 或 mg/片，可选）</label><input type="number" id="dspec" step="0.1" placeholder="如 100"></div>' +
        '<button class="p" style="width:100%" id="d-calc">计算</button>' +
        '<div class="big" id="d-result" style="margin-top:16px">--</div><div id="d-extra" style="text-align:center;color:var(--muted);font-size:13px"></div>';
      $('d-calc').onclick = function () {
        var w = parseFloat($('dw').value), d = parseFloat($('dd').value), sp = parseFloat($('dspec').value);
        if (!isFinite(w) || !isFinite(d)) { alert('请输入体重和剂量'); return; }
        var total = w * d;
        $('d-result').textContent = total.toFixed(2) + ' mg';
        $('d-extra').textContent = isFinite(sp) && sp > 0 ? ('需 ' + (total / sp).toFixed(2) + ' 支/片') : '';
      };
    } else if (doseTab === 'rate') {
      p.innerHTML = '<div class="field"><label>输液总量（ml）</label><input type="number" id="rv" placeholder="如 500"></div>' +
        '<div class="field"><label>计划输完时间（小时）</label><input type="number" id="rh" step="0.5" placeholder="如 4"></div>' +
        '<button class="p" style="width:100%" id="r-calc">计算</button>' +
        '<div class="big" id="r-result" style="margin-top:16px">--</div><div style="text-align:center;color:var(--muted);font-size:13px">滴/分（按20滴/ml）</div>';
      $('r-calc').onclick = function () {
        var v = parseFloat($('rv').value), h = parseFloat($('rh').value);
        if (!isFinite(v) || !isFinite(h) || h <= 0) { alert('请输入输液总量和时间'); return; }
        var drops = v * 20 / (h * 60);
        $('r-result').textContent = Math.round(drops) + ' 滴/分';
      };
    } else {
      p.innerHTML = '<div class="field"><label>已知滴速（滴/分）</label><input type="number" id="fv" placeholder="如 50"></div>' +
        '<div class="field"><label>滴系数（滴/ml）</label><select id="fc"><option>20</option><option>15</option><option>10</option><option>60</option></select></div>' +
        '<button class="p" style="width:100%" id="f-calc">计算</button>' +
        '<div class="big" id="f-result" style="margin-top:16px">--</div><div style="text-align:center;color:var(--muted);font-size:13px">每小时毫升数</div>';
      $('f-calc').onclick = function () {
        var v = parseFloat($('fv').value), f = parseFloat($('fc').value);
        if (!isFinite(v)) { alert('请输入滴速'); return; }
        $('f-result').textContent = (v * 60 / f).toFixed(1) + ' ml/h';
      };
    }
  }

  /* ================= 6. 生命体征 ================= */
  var vitals = loadJ(K.vital, []);
  function renderVitals() {
    if (!vitals.length) { $('vital-list').innerHTML = '<div class="empty">还没有记录<br>点右上角「+ 记录」输入</div>'; return; }
    var list = vitals.slice().sort(function (a, b) { return b.at - a.at; });
    $('vital-list').innerHTML = list.map(function (v) {
      var rows = [];
      if (v.t) rows.push('体温 ' + v.t + '℃');
      if (v.p) rows.push('脉搏 ' + v.p + '次/分');
      if (v.r) rows.push('呼吸 ' + v.r + '次/分');
      if (v.bp) rows.push('血压 ' + v.bp + 'mmHg');
      return '<div class="item"><div class="t">' + esc(v.time) + '<button class="sm" style="float:right;padding:3px 8px" data-vdel="' + v.id + '">删</button></div>' +
        '<div class="m">' + rows.map(esc).join(' · ') + '</div>' +
        (v.note ? '<div class="m">📝 ' + esc(v.note) + '</div>' : '') + '</div>';
    }).join('');
    Array.prototype.forEach.call($('vital-list').querySelectorAll('[data-vdel]'), function (b) {
      b.onclick = function () {
        if (!confirm('删除？')) return;
        vitals = vitals.filter(function (x) { return x.id !== b.getAttribute('data-vdel'); });
        saveJ(K.vital, vitals); renderVitals();
      };
    });
  }
  $('vital-add').onclick = function () {
    var now = new Date();
    var tstr = now.getFullYear() + '-' + ('0'+(now.getMonth()+1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2) +
      ' ' + ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2);
    openSheet('记录生命体征',
      '<div class="field"><label>时间</label><input id="vt-time" value="' + tstr + '"></div>' +
      '<div class="row2">' +
      '<div class="field"><label>体温 ℃</label><input type="number" id="vt-t" step="0.1" placeholder="36.5"></div>' +
      '<div class="field"><label>脉搏</label><input type="number" id="vt-p" placeholder="80"></div></div>' +
      '<div class="row2">' +
      '<div class="field"><label>呼吸</label><input type="number" id="vt-r" placeholder="18"></div>' +
      '<div class="field"><label>血压</label><input id="vt-bp" placeholder="120/80"></div></div>' +
      '<div class="field"><label>备注</label><input id="vt-note" placeholder="可选"></div>',
      function () {
        vitals.push({ id: uid(), at: Date.now(), time: $('vt-time').value,
          t: $('vt-t').value, p: $('vt-p').value, r: $('vt-r').value, bp: $('vt-bp').value.trim(), note: $('vt-note').value.trim() });
        saveJ(K.vital, vitals); renderVitals();
      });
  };

  /* ================= 7. 记账 ================= */
  var money = loadJ(K.money, []);
  var moneyType = 'all';
  function renderMoney() {
    var inc = 0, exp = 0;
    money.forEach(function (m) { if (m.type === 'in') inc += m.amount; else exp += m.amount; });
    $('money-stat').innerHTML =
      '<div class="stat"><b style="color:var(--ok)">' + inc.toFixed(2) + '</b><span>收入</span></div>' +
      '<div class="stat"><b style="color:var(--no)">' + exp.toFixed(2) + '</b><span>支出</span></div>' +
      '<div class="stat"><b>' + (inc - exp).toFixed(2) + '</b><span>结余</span></div>' +
      '<div class="stat"><b>' + money.length + '</b><span>笔数</span></div>';
    $('money-tabs').innerHTML = ['all','in','out'].map(function (t) {
      return '<button class="' + (moneyType === t ? 'on' : '') + '" data-t="' + t + '">' +
        (t === 'all' ? '全部' : t === 'in' ? '收入' : '支出') + '</button>';
    }).join('');
    Array.prototype.forEach.call($('money-tabs').children, function (b) {
      b.onclick = function () { moneyType = b.getAttribute('data-t'); renderMoney(); };
    });
    var list = money.filter(function (m) { return moneyType === 'all' || m.type === moneyType; })
      .sort(function (a, b) { return b.at - a.at; });
    if (!list.length) { $('money-list').innerHTML = '<div class="empty">还没有记录</div>'; return; }
    $('money-list').innerHTML = list.map(function (m) {
      return '<div class="item"><div class="t" style="display:flex;justify-content:space-between">' +
        '<span>' + esc(m.cat) + '</span>' +
        '<span style="color:' + (m.type === 'in' ? 'var(--ok)' : 'var(--no)') + '">' +
        (m.type === 'in' ? '+' : '-') + m.amount.toFixed(2) + '</span></div>' +
        '<div class="m">' + esc(m.date) + (m.note ? ' · ' + esc(m.note) : '') +
        '<button class="sm" style="float:right;padding:2px 7px" data-mdel="' + m.id + '">删</button></div></div>';
    }).join('');
    Array.prototype.forEach.call($('money-list').querySelectorAll('[data-mdel]'), function (b) {
      b.onclick = function () {
        money = money.filter(function (x) { return x.id !== b.getAttribute('data-mdel'); });
        saveJ(K.money, money); renderMoney();
      };
    });
  }
  $('money-add').onclick = function () {
    openSheet('记一笔',
      '<div class="row2"><div class="field"><label>类型</label><select id="m-type"><option value="out">支出</option><option value="in">收入</option></select></div>' +
      '<div class="field"><label>金额</label><input type="number" id="m-amount" step="0.01" placeholder="0.00"></div></div>' +
      '<div class="field"><label>分类</label><input id="m-cat" placeholder="餐饮/交通/补助…"></div>' +
      '<div class="field"><label>日期</label><input type="date" id="m-date" value="' + today() + '"></div>' +
      '<div class="field"><label>备注</label><input id="m-note"></div>',
      function () {
        var amt = parseFloat($('m-amount').value);
        if (!isFinite(amt) || amt <= 0) { alert('请输入金额'); return false; }
        money.push({ id: uid(), at: Date.now(), type: $('m-type').value, amount: amt,
          cat: $('m-cat').value.trim() || '其他', date: $('m-date').value, note: $('m-note').value.trim() });
        saveJ(K.money, money); renderMoney();
      });
  };

  /* ================= 8. 番茄钟 ================= */
  var pomo = loadJ(K.pomo, { count: 0, mins: 0 });
  var pomoTimer = null, pomoLeft = 25 * 60, pomoTotal = 25 * 60, pomoRunning = false;
  function renderPomo() {
    $('pomo-time').textContent = ('0' + Math.floor(pomoLeft / 60)).slice(-2) + ':' + ('0' + (pomoLeft % 60)).slice(-2);
    $('pomo-label').textContent = pomoRunning ? '专注中…' : '准备开始';
    $('pomo-start').textContent = pomoRunning ? '暂停' : '开始';
    $('pomo-stat').innerHTML =
      '<div class="stat"><b>' + pomo.count + '</b><span>完成番茄数</span></div>' +
      '<div class="stat"><b>' + pomo.mins + '</b><span>累计专注分钟</span></div>';
  }
  function pomoTick() {
    pomoLeft--;
    if (pomoLeft <= 0) {
      clearInterval(pomoTimer); pomoTimer = null; pomoRunning = false;
      pomo.count++; pomo.mins += Math.round(pomoTotal / 60);
      saveJ(K.pomo, pomo);
      try {
        if (window.navigator.vibrate) window.navigator.vibrate([200,100,200]);
      } catch (e) {}
      alert('时间到！休息一下吧');
      pomoLeft = pomoTotal;
    }
    renderPomo();
  }
  $('pomo-start').onclick = function () {
    if (pomoRunning) {
      clearInterval(pomoTimer); pomoTimer = null; pomoRunning = false;
    } else {
      pomoRunning = true;
      pomoTimer = setInterval(pomoTick, 1000);
    }
    renderPomo();
  };
  $('pomo-reset').onclick = function () {
    clearInterval(pomoTimer); pomoTimer = null; pomoRunning = false;
    pomoLeft = pomoTotal; renderPomo();
  };
  Array.prototype.forEach.call(document.querySelectorAll('#v-pomo [data-min]'), function (b) {
    b.onclick = function () {
      clearInterval(pomoTimer); pomoTimer = null; pomoRunning = false;
      pomoTotal = parseInt(b.getAttribute('data-min'), 10) * 60;
      pomoLeft = pomoTotal; renderPomo();
    };
  });

  /* ================= 9. 待办 ================= */
  var todos = loadJ(K.todo, []);
  function renderTodo() {
    if (!todos.length) { $('todo-list').innerHTML = '<div class="empty">暂无待办<br>在上面输入后回车添加</div>'; return; }
    var sorted = todos.slice().sort(function (a, b) {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return b.at - a.at;
    });
    $('todo-list').innerHTML = sorted.map(function (t) {
      return '<div class="item" style="display:flex;align-items:center;gap:11px' + (t.done ? ';opacity:.55' : '') + '">' +
        '<div style="width:22px;height:22px;border-radius:50%;border:2px solid var(--acc);flex:none;' +
        (t.done ? 'background:var(--acc)' : '') + '" data-td="' + t.id + '"></div>' +
        '<div style="flex:1;' + (t.done ? 'text-decoration:line-through' : '') + '">' + esc(t.text) + '</div>' +
        '<button class="sm" style="padding:3px 8px" data-tdel="' + t.id + '">删</button></div>';
    }).join('');
    Array.prototype.forEach.call($('todo-list').querySelectorAll('[data-td]'), function (b) {
      b.onclick = function () {
        var id = b.getAttribute('data-td');
        todos.forEach(function (t) { if (t.id === id) t.done = !t.done; });
        saveJ(K.todo, todos); renderTodo();
      };
    });
    Array.prototype.forEach.call($('todo-list').querySelectorAll('[data-tdel]'), function (b) {
      b.onclick = function () {
        todos = todos.filter(function (x) { return x.id !== b.getAttribute('data-tdel'); });
        saveJ(K.todo, todos); renderTodo();
      };
    });
  }
  function addTodo() {
    var v = $('todo-input').value.trim();
    if (!v) return;
    todos.push({ id: uid(), at: Date.now(), text: v, done: false });
    saveJ(K.todo, todos);
    $('todo-input').value = '';
    renderTodo();
  }
  $('todo-add').onclick = addTodo;
  $('todo-input').onkeydown = function (e) { if (e.key === 'Enter') addTodo(); };

  /* ================= 工具网格 ================= */
  var TOOLS = [
    { id:'v-diary', ic:'📓', name:'实习日志', desc:'记录每天的科室、操作、带教' },
    { id:'v-skills', ic:'💉', name:'操作速查', desc:'常见护理操作要点' },
    { id:'v-countdown', ic:'⏳', name:'护资倒计时', desc:'倒计时 + 每日打卡' },
    { id:'v-shift', ic:'📅', name:'排班表', desc:'白班夜班记录统计' },
    { id:'v-dose', ic:'🧮', name:'剂量计算', desc:'按体重给药 / 输液滴速' },
    { id:'v-vitals', ic:'❤️', name:'生命体征', desc:'记录体温脉搏血压' },
    { id:'v-money', ic:'💰', name:'记账本', desc:'收支记录，看结余' },
    { id:'v-pomo', ic:'🍅', name:'专注计时', desc:'番茄钟，专注学习' },
    { id:'v-todo', ic:'✅', name:'待办清单', desc:'今日要做的事' }
  ];
  $('toolgrid').innerHTML = TOOLS.map(function (t) {
    return '<button class="tool" data-view="' + t.id + '">' +
      '<span class="ic">' + t.ic + '</span><b>' + t.name + '</b><small>' + t.desc + '</small></button>';
  }).join('');
  Array.prototype.forEach.call($('toolgrid').children, function (b) {
    b.onclick = function () {
      var v = b.getAttribute('data-view');
      if (v === 'v-skills') renderSkills();
      if (v === 'v-dose') renderDose();
      show(v);
    };
  });

  // 首页副标题
  var cdDays = Math.max(0, Math.round((new Date(cd.date + 'T00:00:00') - new Date().setHours(0,0,0,0)) / 86400000));
  var undone = todos.filter(function (t) { return !t.done; }).length;
  $('home-sub').textContent = '距离护资 ' + cdDays + ' 天' + (undone ? ' · ' + undone + ' 项待办' : '');

  renderSkills();
  renderDose();
})();
