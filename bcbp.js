/*
 * bcbp.js — IATA BCBP (Bar-Coded Boarding Pass) parser
 * 依 IATA Resolution 792 的「固定字元位置」規格切割條碼字串。
 *
 * 純函式、零依賴。可在瀏覽器（掛在 window.BCBP）或 Node（module.exports）使用。
 *
 * 隱私：本檔只做字串解析，不發任何網路請求。條碼含完整姓名與訂位代號，
 * 呼叫端請務必把資料留在本機，不要上傳。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BCBP = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 艙等代碼 → 中文（Resolution 792 compartment code，常見對應）
  var COMPARTMENT = {
    F: '頭等艙', A: '頭等艙',
    J: '商務艙', C: '商務艙', D: '商務艙', I: '商務艙', Z: '商務艙',
    W: '豪華經濟艙', P: '豪華經濟艙',
    Y: '經濟艙', B: '經濟艙', H: '經濟艙', K: '經濟艙', L: '經濟艙',
    M: '經濟艙', N: '經濟艙', Q: '經濟艙', R: '經濟艙', S: '經濟艙',
    T: '經濟艙', U: '經濟艙', V: '經濟艙', X: '經濟艙', G: '經濟艙',
    E: '經濟艙', O: '經濟艙'
  };

  // 旅客狀態代碼（passenger status）
  var PAX_STATUS = {
    '0': '開票／尚未報到',
    '1': '開票／已報到',
    '2': '行李已掛／尚未報到',
    '3': '行李已掛／已報到',
    '4': '已通過安檢',
    '5': '已通過登機門',
    '6': '轉機',
    '7': '候補',
    '8': '登機證已重新驗證'
  };

  var MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  function trim(s) { return (s == null ? '' : String(s)).replace(/\s+$/, '').replace(/^\s+/, ''); }
  function stripLeadingZeros(s) { return s.replace(/^0+(?=\d)/, ''); }

  // 儒略日（一年中的第幾天）→ 日期。BCBP 不含年份，故用參考年推算；
  // 預設在「去年／今年／明年」中挑離今天最近的那一年。
  function julianToDate(dayOfYear, refYear) {
    var day = parseInt(dayOfYear, 10);
    if (!(day >= 1 && day <= 366)) return null;

    function build(year) {
      var d = new Date(Date.UTC(year, 0, 1));
      d.setUTCDate(d.getUTCDate() + (day - 1));
      return d;
    }

    var today = new Date();
    var cur = today.getUTCFullYear();
    var candidateYears = refYear ? [refYear] : [cur - 1, cur, cur + 1];
    var best = null, bestDiff = Infinity;
    candidateYears.forEach(function (y) {
      var d = build(y);
      var diff = Math.abs(d.getTime() - today.getTime());
      if (diff < bestDiff) { bestDiff = diff; best = d; }
    });

    return {
      day: day,
      year: best.getUTCFullYear(),
      iso: best.toISOString().slice(0, 10),
      formatted: String(best.getUTCDate()).padStart(2, '0') + ' ' +
                 MONTHS[best.getUTCMonth()] + ' ' + best.getUTCFullYear(),
      yearAssumed: !refYear
    };
  }

  function parseSeat(raw) {
    var s = trim(raw);
    if (!s || s === 'GATE') return { raw: s, display: s };
    var m = /^0*(\d+)([A-Z]+)$/.exec(s);
    if (!m) return { raw: s, display: s };
    return { raw: s, row: m[1], column: m[2], display: m[1] + m[2] };
  }

  // 解析每個航段的固定必填欄位（37 字元）
  function parseLegMandatory(block) {
    var seq = trim(block.slice(29, 34));
    return {
      pnr: trim(block.slice(0, 7)),
      from: trim(block.slice(7, 10)),
      to: trim(block.slice(10, 13)),
      carrier: trim(block.slice(13, 16)),
      flightNumber: stripLeadingZeros(trim(block.slice(16, 21))),
      julian: trim(block.slice(21, 24)),
      compartment: block.slice(24, 25),
      compartmentName: COMPARTMENT[block.slice(24, 25)] || null,
      seat: parseSeat(block.slice(25, 29)),
      sequence: seq ? stripLeadingZeros(seq) : '',
      paxStatus: block.slice(34, 35),
      paxStatusName: PAX_STATUS[block.slice(34, 35)] || null,
      conditionalSize: parseInt(block.slice(35, 37), 16) || 0
    };
  }

  /**
   * 解析 BCBP 條碼字串。
   * @param {string} data 條碼原始字串
   * @returns {{format:string, legCount:number, passengerName:string,
   *            electronicTicket:boolean, legs:Array}}
   * @throws {Error} 格式不符時
   */
  function parse(data) {
    if (typeof data !== 'string') throw new Error('BCBP 輸入需為字串');
    var s = data.replace(/[\r\n]+$/, '');

    var format = s.charAt(0);
    if (format !== 'M' && format !== 'S') {
      throw new Error('不是有效的 BCBP 條碼（開頭應為 M）');
    }
    var legCount = parseInt(s.charAt(1), 10);
    if (!(legCount >= 1 && legCount <= 9)) {
      throw new Error('無法辨識航段數');
    }
    if (s.length < 23 + 37) {
      throw new Error('條碼長度不足，可能不完整');
    }

    var passengerName = trim(s.slice(2, 22));
    var electronicTicket = s.charAt(22) === 'E';

    var legs = [];
    var ptr = 23;
    for (var i = 0; i < legCount; i++) {
      if (ptr + 37 > s.length) break;
      var leg = parseLegMandatory(s.slice(ptr, ptr + 37));
      leg.dateOfFlight = julianToDate(leg.julian);
      ptr += 37;

      // 跳過條件式／航空公司自用區（依宣告長度前進，才能正確定位下一段）
      var condRaw = s.slice(ptr, ptr + leg.conditionalSize);
      ptr += leg.conditionalSize;
      leg.conditional = parseConditional(condRaw, i === 0);

      legs.push(leg);
    }

    return {
      format: format,
      legCount: legCount,
      passengerName: passengerName,
      electronicTicket: electronicTicket,
      legs: legs,
      raw: s
    };
  }

  // 條件式區塊為 best-effort 解析：抽出常見欄位，任何異常都不影響必填欄位。
  function parseConditional(block, isFirstLeg) {
    var out = {};
    try {
      if (!block) return out;
      var p = 0;
      if (isFirstLeg && block.charAt(0) === '>') {
        out.versionPrefix = '>';
        out.version = block.charAt(1);
        p = 2;
        var uniqueSize = parseInt(block.slice(p, p + 2), 16) || 0;
        p += 2;
        var unique = block.slice(p, p + uniqueSize);
        p += uniqueSize;
        // unique 區前段常見欄位（長度固定）：旅客描述、報到來源、開票來源、開票日期…
        if (unique.length >= 1) out.passengerDescription = trim(unique.slice(0, 1));
        if (unique.length >= 3) out.checkinSource = trim(unique.slice(1, 2));
        if (unique.length >= 11) {
          var doi = trim(unique.slice(7, 11)); // 開票日期（年末碼+儒略日）
          if (doi) out.dateOfIssueRaw = doi;
        }
      }
      var perLegSize = parseInt(block.slice(p, p + 2), 16);
      if (perLegSize > 0) {
        p += 2;
        var perLeg = block.slice(p, p + perLegSize);
        p += perLegSize;
        // 常見：航司數字碼(3)+票號(10)+選查(1)+核驗(1)+行銷航司(3)+常客航司(3)+常客號(16)…
        if (perLeg.length >= 37) {
          var ff = trim(perLeg.slice(20, 37));
          if (ff) out.frequentFlyer = ff;
        }
      }
      out.airlineUse = trim(block.slice(p));
    } catch (e) {
      out.parseError = String(e && e.message || e);
    }
    return out;
  }

  return { parse: parse, COMPARTMENT: COMPARTMENT, PAX_STATUS: PAX_STATUS, julianToDate: julianToDate };
});
