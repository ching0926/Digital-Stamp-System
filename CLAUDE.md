# CLAUDE.md

給 Claude Code 的專案指引。每次重新開始，先讀這份檔案即可快速掌握專案現況、指令、架構與規範。

---

## 1. 專案簡介

**揪裡嗨集章系統** — 市集／商圈的數位集章活動系統。使用者走訪各集章點掃碼集章、集滿門檻兌換獎項、由商家核銷。以台北「加蚋仔商圈」為首個示範活動（10 個集章點、3 個獎項門檻 1／3／6 章）。

- **型態**：單一 **Nuxt 3 全端**（Vue 3 前端 + Nitro 後端）+ **MongoDB**。前後端同一 codebase。
- **目前為「本機測試版」**：已移除 LINE LIFF 授權與 Vercel 部署，開 `npm run dev` 即以固定的本機測試帳號自動登入，直接測試完整流程。
- 早期的 LINE LIFF／多租戶規劃見 `docs/計畫書.md`（僅供參考，非現況）。

## 2. 目前狀態與進度

- ✅ **已完成（前台）**：登入（本機自動）、活動/集章點/獎項載入、掃碼集章（QR 簽章驗證）、集章進度、獎項兌換（產生核銷碼 + QR）、商家核銷頁 `/verify`（通行碼保護、防重複）、GPS 地理圍籬（可開關）。
- ✅ **已完成（後台 `/admin`）**：通行碼登入、多活動 CRUD（含商圈/市集分類、狀態切換）、集章點 CRUD、獎項 CRUD、QR 產生下載、市集平面圖上傳。
- ✅ **已驗證**：typecheck 0 錯誤、production build 通過、前台全流程實測（登入→集章→領獎→核銷）、後台 API 全端點實測（含 401 擋、409 刪除保護）、後台 QR 實際可集章。
- 🚧 **未做**：前台市集平面圖呈現、前台多活動切換（目前固定取最新一檔 active）、數據分析、多租戶管理介面。
- ⚠️ **注意**：`server/data/kaladziah.ts` 的 GPS 座標為近似值；若要啟用圍籬（`NUXT_GEOFENCE_ENFORCE=true`）需先實地校正，否則會誤擋。

## 3. 常用指令

```bash
npm install         # 安裝依賴
npm run dev         # 開發（http://localhost:3000，僅本機可見）
npm run dev:host    # 開發並開放區網（手機同 Wi-Fi 可用 http://<電腦IP>:3000 連）
npm run build       # production build
npm run preview     # 預覽 build 產物
npm run typecheck   # 型別檢查（提交前必跑）
npm run seed        # 匯入加蚋仔種子資料（首次或資料被清時執行）
npm run qrsheet     # 產生 qr-test-sheet.html（可掃 QR；本機多用測試面板點選，非必要）
```

**測試慣例**
- dev server 綁 `localhost`（IPv6），curl/測試一律用 `http://localhost:3000`，**不要用 `127.0.0.1`**（連不上）。
- typecheck 會掃到 `prototype/`（舊 React 原型）產生大量錯誤 → 用 `grep -v "^prototype/"` 過濾，只看自身程式。
- 無自動化測試框架；以 `npm run typecheck` + `npm run build` + 手動走流程作為驗收。

## 4. 技術架構

- **前端**：Nuxt 3 pages/components（Vue 3 SFC，`<script setup>`）+ **Pinia** 狀態 + **Tailwind v4**。元件、composables、stores 皆 **自動匯入**。
- **後端**：Nitro 檔案式路由 `server/api/**`，`server/utils/**` 自動匯入，`server/models/**` 為 Mongoose 模型（**需手動 import**）。
- **資料流**：`stores/*` → `$fetch('/api/...')` → Nitro handler → Mongoose → MongoDB。
- **驗證/安全**：HMAC 簽章 session cookie（`server/utils/auth.ts`）、半靜態簽章 QR（`server/utils/qr.ts`）、GPS 圍籬（`server/utils/geo.ts`）。

### API 端點
| 方法 路徑 | 說明 |
|-----------|------|
| `POST /api/auth/login` | 本機自動登入（固定測試使用者）→ 發 session |
| `GET /api/auth/me`、`POST /api/auth/logout` | 讀取 / 清除登入 |
| `GET /api/campaign/current` | 活動 + 集章點 + 獎項 + 使用者狀態 |
| `POST /api/stamp/collect` | QR 驗證 +（可選）GPS 圍籬 + 去重 → 集章 |
| `POST /api/reward/claim` | 達標領獎 → 核銷碼 |
| `POST /api/reward/redeem` | 商家通行碼核銷（防重複） |
| `GET /api/dev/tokens` | 僅 dev：各點 QR token（供測試面板） |
| `GET /api/health` | DB 連線檢查 |

**後台端點**（`server/api/admin/**`）：全部需在 header 帶 `x-admin-key`（見 `server/utils/admin.ts` 的 `requireAdmin`），回傳格式由 `server/utils/adminDto.ts` 統一。

| 方法 路徑 | 說明 |
|-----------|------|
| `GET/POST /api/admin/campaigns`、`PUT/DELETE /api/admin/campaigns/:id` | 活動 CRUD。GET 附即時計算的 `participantsCount`；DELETE 連帶清 Station/Reward，但有集章紀錄時回 409 |
| `GET/POST /api/admin/stations`、`PUT/DELETE /api/admin/stations/:id` | 集章點 CRUD（`?campaignId=` 篩選）。POST 自動產 `qrSecret`；有集章紀錄時不可刪（409） |
| `GET/POST /api/admin/rewards`、`PUT/DELETE /api/admin/rewards/:id` | 獎項 CRUD；已被領取的獎項不可刪（409） |
| `GET /api/admin/qr` | `?campaignId=` 各點 QR token（格式同 `/api/stamp/collect` 所驗，**不是網址**） |
| `POST /api/admin/upload` | multipart 圖片上傳 → 寫入 `public/uploads/`，回傳 `/uploads/xxx` |

## 5. 核心資料夾

```
assets/css/main.css   Tailwind v4 進入點 + 全域樣式（字型、scanline 動畫）
pages/
  index.vue           主 App（自動登入 → 地圖/集章卡/獎項分頁殼層）
  verify.vue          商家核銷台（通行碼 gate + 核銷）
  admin.vue           營運後台（通行碼 gate + 側欄 + toast，分頁由下列元件組成）
components/            Vue 元件（自動匯入）
                      前台：MapView / StampCard / RewardsList / Scanner /
                            DetailBottomSheet / ListBottomSheet
                      後台：AdminCampaigns / AdminStations / AdminRewards /
                            AdminQrCodes / AdminMarketMap / AdminModal / AdminConfirm
composables/          useAdminToast.ts（後台共用提示，跨元件用 useState 共享）
stores/               Pinia：user.ts（登入）、campaign.ts（前台狀態）、admin.ts（後台狀態 + CRUD）
server/
  api/                Nitro 端點（見上表），依 <名稱>.<method>.ts 命名；後台在 api/admin/
  models/             Mongoose 模型（7 個集合，需手動 import）
  utils/              自動匯入：mongoose 連線、auth session、qr 簽章、geo 圍籬、code 產碼、
                      admin 通行碼 guard、adminDto 回傳序列化
  data/kaladziah.ts   加蚋仔種子資料
public/uploads/       後台上傳的圖片（不進版控）
scripts/              seed.ts（種子）、qrsheet.ts（產 QR 表）
docs/計畫書.md         早期需求/規劃（含 LINE 版，僅參考）
prototype/            舊 React 原型（僅 UI 參考，不改、不建置）
```

### 資料模型
Tenant → Campaign → Station／Reward；User；StampRecord（`(userId,stationId)` 唯一索引）；Redemption（`code` 唯一、`status` pending/redeemed）。以 `campaignId`／`tenantId` 貫穿。

## 6. 程式碼風格與命名規範（嚴格遵守）

**通則**
- 全專案 **TypeScript**。縮排 **2 空格**、**單引號**、**不加分號**、盡量用 `const`。
- 註解用**繁體中文**，說明「**為什麼**」而非重述程式碼。
- 新增程式碼要與周邊風格一致（先看鄰近檔案再寫）。

**命名**
- 型別／介面／Vue 元件檔：`PascalCase`（`StampLocation`、`MapView.vue`）。
- 變數／函式／composable：`camelCase`（composable 以 `use` 開頭，如 `useCampaignStore`）。
- 模組級常數／種子資料：`UPPER_SNAKE_CASE`（`KALADZIAH_STATIONS`、`ALPHABET`）。
- Mongoose 模型：檔名 `PascalCase.ts`，匯出 `const XModel = mongoose.models.X || mongoose.model('X', schema)` 並 `export type X = InferSchemaType<typeof schema>`。
- API 路由檔：`server/api/<資源>/<動作>.<method>.ts`（如 `reward/claim.post.ts`）。
- 環境變數：`NUXT_` 前綴 + `UPPER_SNAKE`。

**Vue 元件**
- 一律 `<script setup lang="ts">`；props/emits 用型別泛型（`defineProps<{...}>()`、`defineEmits<{ event: [payload] }>()`）。
- template 事件用 kebab（`@open-scanner`），emit 定義用 camelCase（`openScanner`）。
- 不手動 import 元件／composable／store（自動匯入）；`type` 匯入才寫 `import type`。
- 樣式用 Tailwind utility class 直接寫在 template；主色 `#FF8C00`（橘）、輔色 `#10B981`（綠）；滿版容器用 `h-[100dvh]`。

**後端**
- handler 用 `defineEventHandler`；輸入用 `readBody`/`getQuery` 並驗證。
- 錯誤一律 `throw createError({ statusCode, message })` — **用 `message` 不用 `statusMessage`**（後者未來會被 h3 清成 ASCII，中文會不見）；前端讀 `err.data?.message`。
- 需登入的端點呼叫 `requireUser(event)`；後台端點呼叫 `requireAdmin(event)`。
- `server/models/**` 用到要**手動相對匯入**；`server/utils/**` 直接用（自動匯入）。

## 7. 慣例與雷區

- **環境變數數字型**：純數字 env（如 `NUXT_GEOFENCE_RADIUS_M`）會被 Nuxt(destr) 解析成 **number**；要當字串用時務必 `String(x)`（曾因對 number 呼叫 `.trim()` 造成 500）。
- **快取髒掉**：改依賴或大改後若 dev 出現 `#app-manifest` 之類 pre-transform error、前端載不出來，清 `.nuxt` 與 `node_modules/.vite` 再重啟。本專案已關 `experimental.appManifest`。
- **QR token**：格式 `v1.<stationId>.<hmac>`，`hmac = HMAC-SHA256(station.qrSecret, stationId)`，穩定可印製。
- **手機測試**：`npm run dev:host` + 同 Wi-Fi 開 `http://<電腦IP>:3000`。相機掃碼在手機 `http` 不可用（需 HTTPS/localhost），故用測試面板點選集章。
- **後台 QR 一定要用 token 格式**：舊 React 原型的 QR 編的是 `/scan/{campaignId}/{locId}` 網址，本專案驗的是 `v1.<stationId>.<hmac>`。照抄原型會掃不過。
- **上傳圖片只在 dev 有效**：`public/` 於 build 時才複製進 `.output`，故 `npm run preview` 讀不到執行期上傳的檔。要上雲需改物件儲存。
- **刪除有保護**：有集章紀錄的活動／集章點、已被領取的獎項一律回 409 擋下，避免留下孤兒紀錄。要停用請改用「已封存」或 `noStamp`。

## 8. 環境變數（`.env`，範本見 `.env.example`）

`NUXT_MONGODB_URI`、`NUXT_SESSION_SECRET`、`NUXT_STAFF_PASSCODE`（核銷通行碼）、`NUXT_ADMIN_PASSCODE`（後台通行碼）、`NUXT_GEOFENCE_ENFORCE`（本機建議 `false`）、`NUXT_GEOFENCE_RADIUS_M`。
