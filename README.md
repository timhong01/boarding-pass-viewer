# Flight Seatmap Viewer

土耳其航空轉機行程座位圖 — 可左右滑動的雙航段座位視覺化網頁。

## 內容

- `index.html` — 座位圖展示，兩頁式（左右滑動）：
  - **第一段** Airbus A321neo（3-3 經濟艙 + 商務艙，座位 21C）
  - **第二段** Boeing 787-9（3-3-3 經濟艙 + 1-2-1 商務艙，座位 38H）
  - 包含機票資訊卡（航班、日期、登機門、座位）與行李標籤清單
- `scanner.html` — **登機證條碼掃描器**：用瀏覽器原生 `BarcodeDetector` 掃描（或手動貼上）登機證條碼，本機解析 IATA BCBP 後顯示航段/座位/艙等等資訊
- `bcbp.js` — IATA BCBP（Resolution 792）條碼解析器，純函式、零依賴，瀏覽器與 Node 皆可用
- `test-bcbp.js` — `bcbp.js` 的測試（`node test-bcbp.js`）
- `A321neo_seatmap.svg` / `A321neo_seatmap_v2.svg` / `A321neo_full_seatmap.svg` — 開發過程中的 SVG 版本座位圖

## 條碼掃描（scanner.html）

直接用瀏覽器開啟 `scanner.html`：

- **相機掃描**：需要 `BarcodeDetector` API（Android Chrome 支援最佳；Safari/部分桌面瀏覽器不支援時會提示改用手動貼上）
- **手動貼上**：把登機證條碼解碼後的字串（通常以 `M1`／`M2` 開頭）貼上即可解析，任何瀏覽器都能用
- **隱私**：條碼含完整姓名與訂位代號，等同帳號密碼。本頁全程在瀏覽器本機解析，**不上傳任何伺服器**

支援的條碼類型：PDF417（紙本常見）、Aztec／QR／DataMatrix（電子登機證常見）。

## 使用方式

直接用瀏覽器開啟 `index.html` 即可，支援手機觸控左右滑動切換航段。

## 技術

純 HTML/CSS/JS，無外部依賴，CSS Grid 排版座位配置，動態產生座位列（JavaScript 迴圈生成 DOM）。
