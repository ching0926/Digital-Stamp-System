# CLAUDE.md

給 Claude Code 的專案指引。每次重新開始，先讀這份檔案即可快速掌握專案現況、指令、架構與規範。

---

## 1. 專案簡介

**揪裡嗨集章系統** — 市集／商圈的數位集章活動系統。使用者走訪各集章點掃碼集章、集滿門檻兌換獎項、由商家核銷。以台北「加蚋仔商圈」為首個示範活動（10 個集章點、3 個獎項門檻 1／3／6 章）。

- **型態**：單一 **Nuxt 3 全端**（Vue 3 前端 + Nitro 後端）+ **MongoDB**。前後端同一 codebase。
- **目前為「業主驗收版」**：已部署於 Vercel（<https://jiuli-hai-stamp.vercel.app>），HTTPS 下可用手機相機真實掃 QR 集章。
- **身分為匿名裝置身分**：每個瀏覽器第一次進站自動開一個 `anon:<uuid>` 帳號（displayName「訪客 XXXX」），之後靠 session cookie 認人。**尚未接 LINE LIFF**，接的時候只需改 `server/api/auth/login.post.ts`，見該檔註解。
- 早期的 LINE LIFF／多租戶規劃見 `docs/計畫書.md`（僅供參考，非現況）。

## 2. 目前狀態與進度

- ✅ **已完成（前台）**：匿名裝置身分自動登入、活動/集章點/獎項載入、**相機即時掃 QR 集章**（jsQR 解碼 + 簽章驗證 + 全螢幕成功畫面）、集章進度、**現場核銷**（工作人員在民眾手機上輸入通行碼 → 二次確認 → 一次完成領取與核銷，防重複）、GPS 地理圍籬（可開關）。
- ✅ **已完成（後台 `/admin`）**：通行碼登入、多活動 CRUD（含商圈/市集分類、狀態切換）、集章點 CRUD、獎項 CRUD、QR 產生下載、市集平面圖上傳（**僅本機有效**，見雷區）。
- ✅ **已驗證**：typecheck 0 錯誤、production build 通過、**線上全流程實測**（訪客身分→掃 QR 集章→重複掃提示→領獎→核銷）、跨帳號隔離實測（A/B 兩個匿名身分各自能領同一獎項，同一人重領回 409）、後台 API 全端點實測（含 401 擋、409 刪除保護）。
- 🚧 **未做**：LINE LIFF 身分接入、圖片上傳改物件儲存、前台市集平面圖呈現、前台多活動切換（目前固定取最新一檔 active）、數據分析、多租戶管理介面。
- ⚠️ **注意**：`server/data/kaladziah.ts` 的 GPS 座標為近似值；若要啟用圍籬（`NUXT_GEOFENCE_ENFORCE=true`）需先實地校正，否則會誤擋。啟用時**兩個 env 要一起開**（見第 8 節）。

## 3. 常用指令

```bash
npm install         # 安裝依賴
npm run dev         # 開發（http://localhost:3000，僅本機可見）
npm run dev:host    # 開發並開放區網（手機同 Wi-Fi 可用 http://<電腦IP>:3000 連）
npm run build       # production build
npm run preview     # 預覽 build 產物
npm run typecheck   # 型別檢查（提交前必跑）
npm run seed        # 匯入加蚋仔種子資料（首次或資料被清時執行）
npm run reset       # 清空所有集章/兌換紀錄與匿名帳號、還原獎項庫存（活動設定不動）
npm run qrsheet     # 產生 qr-test-sheet.html；本機測掃碼就開這張表在螢幕上用手機掃
npx vercel --prod --yes   # 部署到 production（需先 vercel login）
```

**測試慣例**
- dev server 綁 `localhost`（IPv6），curl/測試一律用 `http://localhost:3000`，**不要用 `127.0.0.1`**（連不上）。
- typecheck 會掃到 `prototype/`（舊 React 原型）產生大量錯誤 → 用 `grep -v "^prototype/"` 過濾，只看自身程式。
- 無自動化測試框架；以 `npm run typecheck` + `npm run build` + 手動走流程作為驗收。
- **相機掃碼只在 HTTPS 或 localhost 可用**，手機測試請直接連 Vercel 網址，區網 http 開不了相機。
- **模擬多個使用者**：一般視窗與無痕視窗各是一個匿名身分，用來驗證「不同人各自能領、同一人不能重複領」。
- `npm run dev` 與 `npm run build` **不能同時跑**（Nuxt 會擋 lock），build 前要先停掉 dev server。

## 4. 技術架構

- **前端**：Nuxt 3 pages/components（Vue 3 SFC，`<script setup>`）+ **Pinia** 狀態 + **Tailwind v4**。元件、composables、stores 皆 **自動匯入**。
- **後端**：Nitro 檔案式路由 `server/api/**`，`server/utils/**` 自動匯入，`server/models/**` 為 Mongoose 模型（**需手動 import**）。
- **資料流**：`stores/*` → `$fetch('/api/...')` → Nitro handler → Mongoose → MongoDB。
- **驗證/安全**：HMAC 簽章 session cookie（`server/utils/auth.ts`）、半靜態簽章 QR（`server/utils/qr.ts`）、GPS 圍籬（`server/utils/geo.ts`）、網域分離防護（`server/middleware/0.admin-host-guard.ts`，選配）。

### API 端點
| 方法 路徑 | 說明 |
|-----------|------|
| `POST /api/auth/login` | 有 session 就沿用，否則開一個匿名帳號 → 發 session |
| `GET /api/auth/me`、`POST /api/auth/logout` | 讀取 / 清除登入 |
| `GET /api/campaign/current` | 活動 + 集章點 + 獎項 + 使用者狀態 |
| `POST /api/stamp/collect` | QR 驗證 +（可選）GPS 圍籬 + 去重 → 集章 |
| `POST /api/reward/redeem` | **現場核銷**：`{ rewardId, staffKey }`，驗通行碼 + 門檻 + 每人上限 + 扣庫存，**一次完成領取與核銷**（防重複，409） |
| `GET /api/dev/tokens` | 僅 dev：各點 QR token（現已無人呼叫，正式站回 404） |
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
  middleware/         0.admin-host-guard.ts（網域分離防護，選配，見 NUXT_ADMIN_HOSTNAMES）
  models/             Mongoose 模型（7 個集合，需手動 import）
  utils/              自動匯入：mongoose 連線、auth session、qr 簽章、geo 圍籬、code 產碼、
                      admin 通行碼 guard、adminDto 回傳序列化
  data/kaladziah.ts   加蚋仔種子資料
public/uploads/       後台上傳的圖片（不進版控）
scripts/              seed.ts（種子）、reset.ts（清進度）、qrsheet.ts（產 QR 表）
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
- **手機測試一律連 Vercel 網址**：相機需 HTTPS，`npm run dev:host` 的區網 `http://<電腦IP>:3000` 開不了相機。本機要驗掃碼就 `npm run qrsheet` 把 QR 表開在電腦螢幕，用手機連正式站掃。
- **前台已無點擊集章的測試面板**（掃描頁只剩真實相機解碼）。`/api/dev/tokens` 端點仍在但已無人呼叫，正式站本來就回 404。
- **圍籬要開就兩個 env 一起開**：`NUXT_GEOFENCE_ENFORCE`（後端擋）與 `NUXT_PUBLIC_GEOFENCE_ENFORCE`（前端才會去抓 GPS）。只開後端會變成前端不送座標、後端一律擋下。
- **後台 QR 一定要用 token 格式**：舊 React 原型的 QR 編的是 `/scan/{campaignId}/{locId}` 網址，本專案驗的是 `v1.<stationId>.<hmac>`。照抄原型會掃不過。
- **核銷已無 QR／核銷碼／`/verify` 頁**：改成工作人員在民眾手機上按「工作人員點選核銷」→ 輸入通行碼 → 「確認核銷」，`POST /api/reward/redeem` 一次完成領取與核銷。Redemption 仍會產生 `code`（欄位 required + unique），但只作為對帳用的紀錄編號，不再給人掃。因此**庫存只會扣一次**，且不存在 `pending` 狀態的兌換紀錄。
- **圖片上傳在 Vercel 上必失敗**：serverless 檔案系統唯讀，`admin/upload.post.ts` 寫 `public/uploads/` 會壞。線上請改用「貼圖片網址」（後台欄位本來就支援），要真的支援上傳得改接物件儲存。
- **刪除有保護**：有集章紀錄的活動／集章點、已被領取的獎項一律回 409 擋下，避免留下孤兒紀錄。要停用請改用「已封存」或 `noStamp`。
- **網域分離部署**：若之後前後台分域部署，兩個部署的 `NUXT_ADMIN_HOSTNAMES` 要設成一致值（都含 admin 網域），因為判斷依據是請求的 Host header，跟哪個實體部署接到請求無關。

## 8. 環境變數（`.env`，範本見 `.env.example`）

`NUXT_MONGODB_URI`、`NUXT_SESSION_SECRET`、`NUXT_STAFF_PASSCODE`（核銷通行碼）、`NUXT_ADMIN_PASSCODE`（後台通行碼）、`NUXT_ADMIN_HOSTNAMES`（後台網域白名單，逗號分隔；留空＝不啟用網域分離檢查，本機預設）、`NUXT_GEOFENCE_ENFORCE`（本機建議 `false`）、`NUXT_GEOFENCE_RADIUS_M`、`NUXT_PUBLIC_GEOFENCE_ENFORCE`（前端用，需與後端同值）、`NUXT_PUBLIC_GOOGLE_MAPS_API_KEY`。

## 9. 部署（Vercel）

- 專案已連結 Vercel `jolihi/jiuli-hai-stamp`，正式網址 <https://jiuli-hai-stamp.vercel.app>（`.vercel/project.json` 為連結設定，不進版控）。
- 部署：`npx vercel --prod --yes`。**上面那組 env 要在 Vercel 後台各設一份**（本機 `.env` 不會被帶上去），改完 env 要重新部署才生效。
- Vercel production 的通行碼與 session secret **與本機 `.env` 不同**（線上用另一組），不要互相覆蓋。
- MongoDB Atlas 網路白名單需含 `0.0.0.0/0`，因為 Vercel serverless 出口 IP 不固定。
- `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` 會出現在前端原始碼，**務必在 Google Cloud Console 設 HTTP referrer 限制**到正式網域，否則會被盜用計費。
