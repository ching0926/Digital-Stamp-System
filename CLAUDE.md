# CLAUDE.md

給 Claude Code 的專案指引。市集／商圈的 **LINE LIFF 集章系統**，單一 **Nuxt 3 全端**（Vue 3 + Nitro）+ **MongoDB**。

## 常用指令

```bash
npm run dev        # 本機開發（http://localhost:3000，見下方 localhost 注意）
npm run build      # production build
npm run typecheck  # nuxt typecheck（提交前必跑）
npm run seed       # 匯入加蚋仔種子資料到 Atlas（Tenant/Campaign/10 stations/3 rewards）
npm run qrsheet    # 產生 qr-test-sheet.html（上機測試用的可掃 QR，含 token 已 gitignore）
npm run deploy     # 部署到 Vercel production（= vercel --prod）
npm run logs       # 撈正式站 runtime log 快照（重現問題後馬上跑）
```

型別檢查慣例：`prototype/` 已於 `nuxt.config.ts` 的 `ignore` 與 `tsconfig.json` 的 `exclude` 排除。跑 typecheck 時用 `grep -v "^prototype/"` 過濾。

## 架構

- **前後端同一 codebase**：Vue 元件 + Nitro server routes（`server/api/**`）共用型別、同源免跨域。
- **前端**：`pages/`（`index.vue` 主 App、`verify.vue` 商家核銷）、`components/`（自動匯入）、`stores/`（Pinia，`@pinia/nuxt` 自動匯入 `useXStore`）、`composables/useLiff.ts`、`plugins/liff.client.ts`（LIFF 初始化，僅 client）。
- **後端**：`server/api/**`（REST 端點）、`server/models/**`（Mongoose，7 個集合）、`server/utils/**`（自動匯入）、`server/data/`（種子）。
- **資料流**：`stores/campaign.ts` 與 `stores/user.ts` 呼叫 `$fetch('/api/...')` → Nitro handler → Mongoose → Atlas。

### API 端點（`server/api/`）
- `POST /auth/line`：驗證 LINE idToken（或 `{dev:true}` 假登入，僅 dev）→ 發 session cookie
- `GET /auth/me`、`POST /auth/logout`
- `GET /campaign/current`：活動 + 集章點 + 獎項 + 使用者集章/兌換狀態
- `POST /stamp/collect`：QR 簽章驗證 + GPS 圍籬 + 去重 → 寫入 StampRecord
- `POST /reward/claim`：達標領取 → 產生核銷碼；`POST /reward/redeem`：商家通行碼核銷
- `GET /dev/tokens`：**僅 dev**，回各點 QR token（production 404）
- `GET /health`：DB 連線檢查

### 資料模型（`server/models/`）
Tenant → Campaign → Station / Reward；User；StampRecord（`(userId,stationId)` 唯一索引防重複）；Redemption（`code` 唯一、`status` pending/redeemed）。以 `campaignId`/`tenantId` 做多租戶隔離。

## 慣例與雷區（重要）

- **自動匯入範圍**：`server/utils/**` 會自動匯入（如 `useMongoose`、`requireUser`、`makeQrToken`、`assertWithinGeofence`）。但 **`server/models/**` 不會自動匯入**，用到時要 `import { XModel } from '../../models/X'`。
- **錯誤訊息一律用 `message` 不用 `statusMessage`**（h3 未來會把 statusMessage 清成 ASCII，會清掉中文）。前端讀 `err.data?.message`。
- **QR token 格式**：半靜態簽章 `v1.<stationId>.<hmac>`，`hmac = HMAC-SHA256(station.qrSecret, stationId)`，穩定可印製。見 `server/utils/qr.ts`。防遠端代掃靠 GPS 圍籬。
- **GPS 圍籬**：`server/utils/geo.ts` Haversine，`collect` 強制。半徑 `NUXT_GEOFENCE_RADIUS_M`（預設 300m），可用 `NUXT_GEOFENCE_ENFORCE=false` 關閉（測試期用）。
- **Session**：`server/utils/auth.ts` 的 HMAC 簽章 cookie（`SameSite=None; Secure`，供 LIFF iframe）。
- **環境變數值請 `.trim()`**：dashboard 貼上易夾空白，`liffId`、`lineChannelId` 已在程式端 trim（見 `plugins/liff.client.ts`）。
- **`npm run dev` 綁 `localhost`（IPv6）**：curl/測試要用 `http://localhost:3000`，**不能用 `127.0.0.1`**（會連不上）。
- **本機 Mongo 連線**：本開發環境 Node c-ares 無法解析 `mongodb+srv` SRV（`querySrv ECONNREFUSED`），`.env` 需用等效 seedlist `mongodb://`（多 shard + `ssl=true&replicaSet=...`）。**正式環境（Vercel）用原始 `mongodb+srv` 字串沒問題。**
- **`prototype/`**：舊 React 原型，只作 UI 參考，不要改也不納入建置。

## 環境變數（`.env` / Vercel）

`NUXT_MONGODB_URI`、`NUXT_SESSION_SECRET`、`NUXT_LINE_CHANNEL_ID`、`NUXT_PUBLIC_LIFF_ID`（前端會暴露）、`NUXT_STAFF_PASSCODE`（核銷通行碼）、`NUXT_GEOFENCE_ENFORCE`、`NUXT_GEOFENCE_RADIUS_M`。範本見 `.env.example`。

## 部署（Vercel）

- 專案 `jolihi/jiuli-hai-stamp`，正式站 **https://jiuli-hai-stamp.vercel.app**。`npm run deploy` 一鍵上線。
- **LIFF 前提**：LINE 後台的 LIFF Endpoint URL 必須指向 Vercel 網址、scopes 含 `openid`+`profile`；否則開 LIFF 會載入錯的頁面。
- dev 端點在 production 關閉，故上機測試用 `npm run qrsheet` 產 QR 讓手機掃。商家核銷頁 `/verify`。

## 目前進度與待辦

- **已完成**：P0 骨架、P1 前台 MVP（LINE 登入 + 集章 + 地圖 + 集章卡）、P2（獎項兌換 + 核銷 + GPS 圍籬），已部署 Vercel。
- **待辦**：P3 營運後台 + 數據分析（多租戶 CRUD、統計）、P4 測試上線。
- **上線前必做**：校正 `server/data/kaladziah.ts` 的 GPS 座標（目前為近似值，否則圍籬誤擋）、把 `NUXT_GEOFENCE_ENFORCE` 改回 `true`、更換 Atlas 弱密碼並限制網路白名單。

完整需求／規劃見 `docs/計畫書.md`。
