# 揪裡嗨 集章系統（本機版）

市集／商圈集章系統。前後端單一 **Nuxt 3**（Vue 3 + Nitro）+ **MongoDB**。**本機測試版**：不需 LINE 授權，開啟即以本機測試帳號自動登入。

> 早期需求／規劃見 [`docs/計畫書.md`](docs/計畫書.md)（含當初 LINE LIFF 規劃，僅供參考）。
> 早期 React 前端原型（UI 參考）保留於 [`prototype/`](prototype/)。

## 開發

```bash
# 1. 安裝相依套件
npm install

# 2. 設定環境變數
cp .env.example .env   # 填入 MongoDB 連線字串等

# 3. 匯入加蚋仔種子資料（需先能連上 MongoDB）
npm run seed

# 4. 啟動開發伺服器
npm run dev            # http://localhost:3000
```

開啟 `http://localhost:3000` 會自動登入本機測試帳號，直接進入滿版集章地圖。
- **集章**：地圖右下角掃碼鍵 → 「本機測試面板」點任一點位即完成集章。
- **獎項**：集滿門檻 → 「獎項兌換」領取 → 取得核銷碼 + QR。
- **商家核銷**：另開 `http://localhost:3000/verify` → 輸入 `NUXT_STAFF_PASSCODE` 通行碼 → 輸入核銷碼。

## 目錄結構

```
assets/css/        Tailwind v4 進入點
pages/             頁面（index 主 App、verify 商家核銷）
stores/            Pinia stores（user / campaign）
server/
  api/             Nitro API 端點（auth/login、campaign、stamp、reward、dev/tokens、health）
  models/          Mongoose 資料模型
  utils/           mongoose 連線、session、QR 簽章、地理圍籬
  data/            種子資料（加蚋仔）
scripts/seed.ts    種子腳本
docs/計畫書.md      早期計畫書
prototype/         舊 React 原型（僅供 UI 參考）
```

## 環境變數

| 變數 | 說明 |
|------|------|
| `NUXT_MONGODB_URI` | MongoDB 連線字串（Atlas 或本機 `mongodb://127.0.0.1:27017/jiuli-hai`） |
| `NUXT_SESSION_SECRET` | Session 簽章密鑰 |
| `NUXT_STAFF_PASSCODE` | 商家核銷頁 `/verify` 的通行碼 |
| `NUXT_GEOFENCE_ENFORCE` | 是否啟用 GPS 地理圍籬（本機測試建議 `false`） |
| `NUXT_GEOFENCE_RADIUS_M` | 圍籬半徑（公尺，預設 300） |
