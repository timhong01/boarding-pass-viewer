/*
 * bcbp.js 的測試。純 Node，無依賴：
 *   node test-bcbp.js
 */
var BCBP = require('./bcbp.js');
var assert = require('assert');

var pass = 0, fail = 0;
function test(name, fn){
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch(e){ fail++; console.log('  ✗ ' + name + '\n      ' + (e.message||e)); }
}

function pad(s,n){ s=String(s); return (s+' '.repeat(n)).slice(0,n); }
var hex = function(n){ return n.toString(16).toUpperCase().padStart(2,'0'); };
function legMand(pnr,from,to,car,flt,jd,cmp,seat,seq,st,condLen){
  return pad(pnr,7)+from+to+pad(car,3)+pad(flt,5)+jd+cmp+pad(seat,4)+pad(seq,5)+st+hex(condLen);
}

console.log('BCBP parser 測試');

// 標準單段（規格常見示例）
var single = 'M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 100';
test('單段：header 欄位', function(){
  var r = BCBP.parse(single);
  assert.strictEqual(r.legCount, 1);
  assert.strictEqual(r.passengerName, 'DESMARAIS/LUC');
  assert.strictEqual(r.electronicTicket, true);
});
test('單段：航段必填欄位', function(){
  var l = BCBP.parse(single).legs[0];
  assert.strictEqual(l.pnr, 'ABC123');
  assert.strictEqual(l.from, 'YUL');
  assert.strictEqual(l.to, 'FRA');
  assert.strictEqual(l.carrier, 'AC');
  assert.strictEqual(l.flightNumber, '834');
  assert.strictEqual(l.compartment, 'F');
  assert.strictEqual(l.compartmentName, '頭等艙');
  assert.strictEqual(l.seat.display, '1A');
  assert.strictEqual(l.sequence, '25');
  assert.strictEqual(l.paxStatusName, '開票／已報到');
});

// 多航段：驗證條件式區塊被正確跳過、能定位到第二段
test('多航段：leg1 條件式跳過後仍能解析 leg2', function(){
  var cond1 = '>6180001SITA123';
  var header = 'M2' + pad('DESMARAIS/LUC',20) + 'E';
  var leg1 = legMand('ABC123','YUL','FRA','AC','0834','226','F','001A','0025','1', cond1.length);
  var leg2 = legMand('ABC123','FRA','TPE','CI','0062','227','Y','038H','0031','1', 0);
  var r = BCBP.parse(header + leg1 + cond1 + leg2);
  assert.strictEqual(r.legCount, 2);
  assert.strictEqual(r.legs.length, 2);
  assert.strictEqual(r.legs[1].from, 'FRA');
  assert.strictEqual(r.legs[1].to, 'TPE');
  assert.strictEqual(r.legs[1].carrier, 'CI');
  assert.strictEqual(r.legs[1].flightNumber, '62');
  assert.strictEqual(r.legs[1].seat.display, '38H');
});

// 座位與航班號的前導零處理
test('座位解析：021C -> row 21 / col C', function(){
  var s = 'M1' + pad('TEST/ONE',20) + 'E' +
          legMand('PNR1234','YUL','FRA','TK','1826','195','Y','021C','0021','1', 0);
  var l = BCBP.parse(s).legs[0];
  assert.strictEqual(l.seat.row, '21');
  assert.strictEqual(l.seat.column, 'C');
  assert.strictEqual(l.seat.display, '21C');
});

// 儒略日換算
test('julianToDate：day 1 = 1月1日', function(){
  var d = BCBP.julianToDate('001', 2026);
  assert.strictEqual(d.iso, '2026-01-01');
  assert.strictEqual(d.formatted, '01 JAN 2026');
});

// 錯誤處理
test('非 BCBP 字串應丟出錯誤', function(){
  assert.throws(function(){ BCBP.parse('這不是條碼'); });
});
test('非字串輸入應丟出錯誤', function(){
  assert.throws(function(){ BCBP.parse(12345); });
});

console.log('\n結果：' + pass + ' 通過, ' + fail + ' 失敗');
process.exit(fail ? 1 : 0);
