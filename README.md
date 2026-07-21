# 揪裡嗨 集章系統

市集／商圈的 LINE LIFF 集章系統。前後端單一 **Nuxt 3**（Vue 3 + Nitro）+ **MongoDB**。

> 需求與架構請見 [`docs/計畫書.md`](docs/計畫書.md)。
> 早期 React 前端原型（UI 參考）保留於 [`prototype/`](prototype/)。

## 開發

```bash
# 1. 安裝相依套件
npm install

# 2. 設定環境變數
cp .env.example .env   # 填入 MongoDB / LINE / LIFF 資訊

# 3. 匯入加蚋仔種子資料（需先啟動 MongoDB）
npm run seed

# 4. 啟動開發伺服器
npm run dev            # http://localhost:3000
```

開啟首頁可看到後端 API、MongoDB、LIFF 三項狀態，用於確認環境就緒。

## 目錄結構

```
assets/css/        Tailwind v4 進入點
composables/       前端可組合函式（useLiff）
pages/             頁面
plugins/           Nuxt plugin（liff.client：LIFF 初始化）
stores/            Pinia stores（user / campaign）
server/
  api/             Nitro API 端點（health…）
  models/          Mongoose 資料模型（7 個集合）
  utils/           mongoose 連線
  data/            種子資料（加蚋仔）
scripts/seed.ts    種子腳本
docs/計畫書.md      專案計畫書
prototype/         舊 React 原型（僅供 UI 參考）
```

## 環境變數

| 變數 | 說明 |
|------|------|
| `NUXT_MONGODB_URI` | MongoDB 連線字串 |
| `NUXT_SESSION_SECRET` | Session 簽章密鑰 |
| `NUXT_LINE_CHANNEL_ID` | LINE Login channel ID（驗證 idToken） |
| `NUXT_PUBLIC_LIFF_ID` | LIFF app ID（前端） |
