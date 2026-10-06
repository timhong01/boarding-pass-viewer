/*
 * seatmap.js — 座位圖共用渲染模組
 * 輸入機型 + 座位，輸出座位圖 DOM。index.html 與 scanner.html 共用。
 *
 * 每個機型都是「通用範本」（典型的艙等排數與座位配置），不是任一航空公司的精確座位圖。
 * 新增機型只要在 SPECS 加一筆設定。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SeatMap = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function div(cls, text) {
    var e = document.createElement('div');
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // 商務艙排列以經濟艙網格表示，null 代表該格留空，讓兩種艙等的欄位對齊
  function fixed(groups) { return function () { return groups; }; }
  function staggered(odd, even) { return function (r) { return r % 2 === 1 ? odd : even; }; }

  var SPECS = {
    'A321neo': {
      label: 'Airbus A319 / A320 / A321（含 neo）',
      econ: [['A', 'B', 'C'], ['D', 'E', 'F']],
      econLayout: '3-3',
      econRows: [6, 34],
      biz: { rows: [1, 5], layout: '2-2', pattern: fixed([['A', 'C', null], [null, 'D', 'F']]) },
      exitRows: [13, 14],
      lavFrom: 31
    },
    '737': {
      label: 'Boeing 737 / 737 MAX',
      econ: [['A', 'B', 'C'], ['D', 'E', 'F']],
      econLayout: '3-3',
      econRows: [5, 33],
      biz: { rows: [1, 4], layout: '2-2', pattern: fixed([['A', 'C', null], [null, 'D', 'F']]) },
      exitRows: [15, 16]
    },
    'A330': {
      label: 'Airbus A330',
      econ: [['A', 'C'], ['D', 'E', 'F', 'G'], ['H', 'K']],
      econLayout: '2-4-2',
      econRows: [10, 45],
      biz: { rows: [1, 7], layout: '1-2-1', pattern: fixed([['A', null], [null, 'E', 'F', null], [null, 'K']]) },
      exitRows: [27]
    },
    'A350': {
      label: 'Airbus A350',
      econ: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'K']],
      econLayout: '3-3-3',
      econRows: [20, 48],
      biz: {
        rows: [1, 8], layout: '1-2-1',
        pattern: staggered(
          [['A', null, null], [null, 'E', 'F'], [null, null, 'K']],
          [['A', null, null], ['D', 'E', null], [null, null, 'K']]
        )
      },
      exitRows: [30]
    },
    '777': {
      label: 'Boeing 777',
      econ: [['A', 'B', 'C'], ['D', 'E', 'F', 'G'], ['H', 'J', 'K']],
      econLayout: '3-4-3',
      econRows: [20, 52],
      biz: { rows: [1, 8], layout: '1-2-1', pattern: fixed([['A', null, null], [null, 'E', 'F', null], [null, null, 'K']]) },
      exitRows: [32]
    },
    '787-9': {
      label: 'Boeing 787（-8 / -9 / -10）',
      econ: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'J']],
      econLayout: '3-3-3',
      econRows: [20, 43],
      biz: {
        rows: [1, 8], layout: '1-2-1',
        pattern: staggered(
          [['A', null, null], [null, 'E', 'F'], [null, null, 'J']],
          [['A', null, null], ['D', 'E', null], [null, null, 'J']]
        )
      },
      exitRows: [30, 31],
      lavFrom: 40
    }
  };

  function gridTemplate(groups) {
    var aisle = groups.length > 2 ? '10px' : '12px';
    return '20px ' + groups.map(function (g) { return 'repeat(' + g.length + ', 1fr)'; }).join(' ' + aisle + ' ');
  }

  function highlightFor(row, you, companions) {
    var h = {};
    (companions || []).forEach(function (c) { if (c.row === row) h[c.col] = 'fam'; });
    if (you && you.row === row) h[you.col] = 'you';
    return h;
  }

  function makeRow(num, groups, template, baseClass, highlight) {
    var row = div('row');
    row.style.gridTemplateColumns = template;
    row.appendChild(div('row-num', num));
    var showLetters = Object.keys(highlight).length > 0;
    groups.forEach(function (group, i) {
      if (i > 0) row.appendChild(div('aisle'));
      group.forEach(function (letter) {
        if (letter == null) { row.appendChild(div()); return; }
        var cls = ('seat ' + baseClass + (highlight[letter] ? ' ' + highlight[letter] : '')).replace(/\s+/g, ' ').trim();
        row.appendChild(div(cls, showLetters ? letter : ''));
      });
    });
    return row;
  }

  function colLabels(groups, template) {
    var row = div('col-labels');
    row.style.gridTemplateColumns = template;
    row.appendChild(div());
    groups.forEach(function (group, i) {
      if (i > 0) row.appendChild(div());
      group.forEach(function (letter) { row.appendChild(div(null, letter)); });
    });
    return row;
  }

  /**
   * 渲染座位圖，回傳 .fuselage DOM 節點。
   * 座位排數超出範本時會自動延伸經濟艙，讓座位一定畫得出來。
   * @param {Object} opts
   * @param {string} opts.type SPECS 的 key
   * @param {{row:number, col:string}} [opts.you] 標紅的座位
   * @param {{row:number, col:string}[]} [opts.companions] 標綠的同行者座位
   */
  function render(opts) {
    opts = opts || {};
    var spec = SPECS[opts.type];
    if (!spec) throw new Error('未知機型: ' + opts.type);

    var you = opts.you || null;
    var companions = opts.companions || [];
    var template = gridTemplate(spec.econ);

    var bizStart = spec.biz.rows[0], bizEnd = spec.biz.rows[1];
    var econStart = spec.econRows[0], econEnd = spec.econRows[1];
    [you].concat(companions).forEach(function (s) {
      if (!s || !(s.row > bizEnd)) return;
      if (s.row < econStart) econStart = s.row;
      if (s.row > econEnd) econEnd = s.row;
    });

    var fuselage = div('fuselage');
    fuselage.appendChild(div('nose', '機艏 ↑'));
    fuselage.appendChild(colLabels(spec.econ, template));

    fuselage.appendChild(div('section-label', '— 商務艙 Row ' + bizStart + '–' + bizEnd + '（' + spec.biz.layout + '）—'));
    for (var r = bizStart; r <= bizEnd; r++) {
      fuselage.appendChild(makeRow(r, spec.biz.pattern(r), template, 'biz', highlightFor(r, you, companions)));
    }

    var hr = document.createElement('hr');
    hr.className = 'divider';
    fuselage.appendChild(hr);

    fuselage.appendChild(div('section-label', '— 經濟艙 Row ' + econStart + '–' + econEnd + '（' + spec.econLayout + '）—'));
    for (var e = econStart; e <= econEnd; e++) {
      var base = '';
      if (spec.exitRows && spec.exitRows.indexOf(e) !== -1) base = 'exit';
      if (spec.lavFrom && e >= spec.lavFrom) base = 'lav';
      fuselage.appendChild(makeRow(e, spec.econ, template, base, highlightFor(e, you, companions)));
    }

    fuselage.appendChild(div('tail', '↓ 機尾'));
    return fuselage;
  }

  function label(type) {
    var spec = SPECS[type];
    return spec ? spec.label : type;
  }

  function types() {
    return Object.keys(SPECS);
  }

  return { render: render, label: label, types: types };
});
