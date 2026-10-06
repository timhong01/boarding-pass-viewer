/*
 * seatmap.js — 座位圖共用渲染模組
 * 把機型的座位排列畫成 DOM。index.html 跟 scanner.html 共用這份邏輯，
 * 避免兩個頁面各自複製一份幾乎一樣的座位生成程式碼。
 *
 * 座位圖是通用範本（概略 3-3 / 3-3-3 配置），不是任一航空公司的精確座位圖。
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

  function seatClass(base, highlightMap, letter) {
    var cls = 'seat ' + (base || '');
    if (highlightMap && highlightMap[letter]) cls += ' ' + highlightMap[letter];
    return cls.trim();
  }

  // 6 欄（3-3）經濟艙列：A B C | D E F
  function makeRow6(num, opts) {
    opts = opts || {};
    var row = div('row cols-6');
    row.appendChild(div('row-num', num));

    var labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    labels.slice(0, 3).forEach(function (letter) {
      row.appendChild(div(seatClass(opts.seatClass, opts.highlight, letter), opts.showLetters ? letter : ''));
    });
    row.appendChild(div('aisle'));
    labels.slice(3, 6).forEach(function (letter) {
      row.appendChild(div(seatClass(opts.seatClass, opts.highlight, letter), opts.showLetters ? letter : ''));
    });
    return row;
  }

  // 9 欄（3-3-3）經濟艙列：A B C | D E F | G H J
  function makeRow9(num, opts) {
    opts = opts || {};
    var row = div('row cols-9');
    row.appendChild(div('row-num', num));

    var labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'];
    function block(letters) {
      letters.forEach(function (letter) {
        row.appendChild(div(seatClass(opts.seatClass, opts.highlight, letter), opts.showLetters ? letter : ''));
      });
    }
    block(labels.slice(0, 3));
    row.appendChild(div('aisle'));
    block(labels.slice(3, 6));
    row.appendChild(div('aisle'));
    block(labels.slice(6, 9));
    return row;
  }

  function highlightFor(row, you, companions) {
    var h = {};
    if (you && you.row === row) h[you.col] = 'you';
    (companions || []).forEach(function (c) {
      if (c.row === row) h[c.col] = 'fam';
    });
    return h;
  }

  var SPECS = {
    'A321neo': {
      label: 'Airbus A321neo',
      colsClass: 'cols-6',
      letterGroups: [['A', 'B', 'C'], ['D', 'E', 'F']],
      bizLabel: 'Row 1–5',
      econLabel: 'Row 6–34',
      buildBiz: function (you, companions) {
        var container = document.createElement('div');
        // 2-2 商務艙：用 3-3 經濟艙的同一個網格，中間欄位留空
        for (var r = 1; r <= 5; r++) {
          var h = highlightFor(r, you, companions);
          var row = div('row cols-6');
          row.appendChild(div('row-num', r));
          row.appendChild(div(seatClass('biz', h, 'A'), h.A ? 'A' : ''));
          row.appendChild(div(seatClass('biz', h, 'B'), h.B ? 'B' : ''));
          row.appendChild(div());
          row.appendChild(div('aisle'));
          row.appendChild(div());
          row.appendChild(div(seatClass('biz', h, 'E'), h.E ? 'E' : ''));
          row.appendChild(div(seatClass('biz', h, 'F'), h.F ? 'F' : ''));
          container.appendChild(row);
        }
        return container;
      },
      buildEcon: function (you, companions) {
        var container = document.createElement('div');
        for (var r = 6; r <= 34; r++) {
          var opts = { seatClass: '', showLetters: false };
          if (r === 13 || r === 14) opts.seatClass = 'exit';
          if (r >= 31) opts.seatClass = 'lav';
          var h = highlightFor(r, you, companions);
          if (Object.keys(h).length) { opts.showLetters = true; opts.highlight = h; }
          container.appendChild(makeRow6(r, opts));
        }
        return container;
      }
    },
    '787-9': {
      label: 'Boeing 787-9 Dreamliner',
      colsClass: 'cols-9',
      letterGroups: [['A', 'B', 'C'], ['D', 'E', 'F'], ['G', 'H', 'J']],
      bizLabel: 'Row 1–8（1-2-1）',
      econLabel: 'Row 20–43（3-3-3）',
      buildBiz: function (you, companions) {
        var container = document.createElement('div');
        // 1-2-1 商務艙，中間一對座位依單雙排錯位，模擬真實交錯配置
        for (var r = 1; r <= 8; r++) {
          var h = highlightFor(r, you, companions);
          var row = div('row cols-9');
          row.appendChild(div('row-num', r));
          row.appendChild(div(seatClass('biz', h, 'A'), h.A ? 'A' : ''));
          row.appendChild(div());
          row.appendChild(div());
          row.appendChild(div('aisle'));
          if (r % 2 === 1) {
            row.appendChild(div());
            row.appendChild(div(seatClass('biz', h, 'E'), h.E ? 'E' : ''));
            row.appendChild(div(seatClass('biz', h, 'F'), h.F ? 'F' : ''));
          } else {
            row.appendChild(div(seatClass('biz', h, 'D'), h.D ? 'D' : ''));
            row.appendChild(div(seatClass('biz', h, 'E'), h.E ? 'E' : ''));
            row.appendChild(div());
          }
          row.appendChild(div('aisle'));
          row.appendChild(div());
          row.appendChild(div());
          row.appendChild(div(seatClass('biz', h, 'J'), h.J ? 'J' : ''));
          container.appendChild(row);
        }
        return container;
      },
      buildEcon: function (you, companions) {
        var container = document.createElement('div');
        for (var r = 20; r <= 43; r++) {
          var opts = { seatClass: '', showLetters: false };
          if (r === 30 || r === 31) opts.seatClass = 'exit';
          if (r >= 40) opts.seatClass = 'lav';
          var h = highlightFor(r, you, companions);
          if (Object.keys(h).length) { opts.showLetters = true; opts.highlight = h; }
          container.appendChild(makeRow9(r, opts));
        }
        return container;
      }
    }
  };

  function buildColLabels(spec) {
    var row = div('col-labels ' + spec.colsClass);
    spec.letterGroups.forEach(function (group, i) {
      if (i > 0) row.appendChild(div());
      group.forEach(function (letter) { row.appendChild(div(null, letter)); });
    });
    return row;
  }

  /**
   * 渲染一個機型的座位圖（商務艙 + 經濟艙），回傳 .fuselage DOM 節點。
   * @param {Object} opts
   * @param {string} opts.type 'A321neo' | '787-9'
   * @param {{row:number, col:string}} [opts.you] 標紅的座位
   * @param {{row:number, col:string}[]} [opts.companions] 標綠的同行者座位
   */
  function render(opts) {
    opts = opts || {};
    var spec = SPECS[opts.type];
    if (!spec) throw new Error('未知機型: ' + opts.type);

    var you = opts.you || null;
    var companions = opts.companions || [];

    var fuselage = div('fuselage');
    fuselage.appendChild(div('nose', '機艏 ↑'));
    fuselage.appendChild(buildColLabels(spec));
    fuselage.appendChild(div('section-label', '— 商務艙 ' + spec.bizLabel + ' —'));
    fuselage.appendChild(spec.buildBiz(you, companions));
    fuselage.appendChild(document.createElement('hr')).className = 'divider';
    fuselage.appendChild(div('section-label', '— 經濟艙 ' + spec.econLabel + ' —'));
    fuselage.appendChild(spec.buildEcon(you, companions));
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
