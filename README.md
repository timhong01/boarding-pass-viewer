# Flight Seatmap Viewer

土耳其航空轉機行程座位圖 — 可左右滑動的雙航段座位視覺化網頁。

## 內容

- `index.html` — 主要成品，兩頁式（左右滑動）座位圖：
  - **第一段** TK1826（Airbus A321neo，CDG → IST，座位 21C）
  - **第二段** TK0024（Boeing 787-9，IST → TPE，座位 38H）
  - 包含機票資訊卡（航班、日期、登機門、座位）與行李標籤清單
- `A321neo_seatmap.svg` / `A321neo_seatmap_v2.svg` / `A321neo_full_seatmap.svg` — 開發過程中的 SVG 版本座位圖

## 使用方式

直接用瀏覽器開啟 `index.html` 即可，支援手機觸控左右滑動切換航段。

## 技術

純 HTML/CSS/JS，無外部依賴，CSS Grid 排版座位配置，動態產生座位列（JavaScript 迴圈生成 DOM）。
