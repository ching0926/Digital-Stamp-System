# CLAUDE.md

給 Claude Code 的專案指引。每次重新開始，先讀這份檔案即可快速掌握專案現況、指令、架構與規範。

---

## 1. 專案簡介

**揪裡嗨集章系統** — 市集／商圈的數位集章活動系統。使用者走訪各集章點掃碼集章、集滿門檻兌換獎項、由商家核銷。以台北「加蚋仔商圈」為首個示範活動（10 個集章點、3 個獎項門檻 1／3／6 章）。

- **型態**：單一 **Nuxt 3 全端**（Vue 3 前端 + Nitro 後端）+ **MongoDB**。前後端同一 codebase。
- **目前為「業主驗收版」**：已部署於 Vercel（<https://jiuli-hai-stamp.vercel.app>），HTTPS 下可用手機相機真實掃 QR 集章。
- **身分為 LINE LIFF 登入**：設了 `NUXT_PUBLIC_LIFF_ID` 時，前台會用 LIFF 取 LINE ID token → `server/api/auth/login.post.ts` 向 LINE 驗證後以 `lineUserId` 認人，換瀏覽器／換裝置都是同一個帳號。**拿不到 LINE 身分時（未設 LIFF ID、localhost、LIFF 初始化失敗）退回匿名裝置身分**：自動開一個 `anon:<uuid>` 帳號（displayName「訪客 XXXX」），靠 session cookie 認人。兩條路徑產出的都是同一種 `User`，集章／領獎認的是 `User._id`。
- 早期的 LINE LIFF／多租戶規劃見 `docs/計畫書.md`（僅供參考，非現況）。

## 2. 目前狀態與進度

- ✅ **已完成（前台）**：LINE LIFF 登入（拿不到 LINE 身分時退回匿名裝置身分）、活動/集章點/獎項載入、**相機即時掃 QR 集章**（jsQR 解碼 + 簽章驗證 + 全螢幕成功畫面）、**手機內建相機掃碼**（QR 編網址 `/?s=<token>`，落地自動集章並停在集章卡 + 結果橫幅）、集章進度、**現場核銷**（工作人員在民眾手機上輸入 4 碼核銷碼 → 二次確認 → 一次完成領取與核銷，防重複）、GPS 地理圍籬（可開關）。
- ✅ **已完成（後台 `/admin`）**：通行碼登入、多活動 CRUD（含商圈/市集分類、狀態切換、**逐活動 4 碼核銷碼**）、集章點 CRUD、獎項 CRUD、QR 產生下載、市集平面圖上傳（**僅本機有效**，見雷區）。
- ✅ **已驗證**：typecheck 0 錯誤、production build 通過、**線上全流程實測**（訪客身分→掃 QR 集章→重複掃提示→領獎→核銷）、跨帳號隔離實測（A/B 兩個匿名身分各自能領同一獎項，同一人重領回 409）、後台 API 全端點實測（含 401 擋、409 刪除保護）。
- ✅ **已完成（市集版）**：前台依 `campaign.type` 自動切換——`market` 只顯示一張可平移縮放的平面圖（`MarketMapView.vue`，**已無攤位標記**，攤位改由左下角清單進入），`district` 維持 Google 地圖（`MapView.vue`）。前台用語（景點／攤位）隨類型變動。
- 🚧 **未做**：**前台手動切換活動的 UI**（掃碼會自動切過去，但民眾無法自己切回另一檔）、數據分析、多租戶管理介面。
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
npm run tunnel      # 開 cloudflared HTTPS 通道（手機測本機未部署版本用，見測試慣例）
npx vercel --prod --yes --scope jolihi   # 部署到 production（需先 vercel login）
```

**測試慣例**
- dev server 綁 `localhost`（IPv6），curl/測試一律用 `http://localhost:3000`，**不要用 `127.0.0.1`**（連不上）。
- typecheck 輸出是乾淨的（`nuxt.config` 的 `ignore` 已排除 `prototype/`、`myenv/`），有錯就是自身程式的錯。
- 無自動化測試框架；以 `npm run typecheck` + `npm run build` + 手動走流程作為驗收。
- **相機掃碼只在 HTTPS 或 localhost 可用**；且 iPhone Safari 的 HTTPS-Only 會把區網 `http://<電腦IP>:3000` 升級成 https 而失敗，**連「開網址集章」都走不通**，區網那條路等於沒有。測正式站就直接連 Vercel 網址。
- **手機測本機未部署的版本**：`npm run dev:host` +（另開一個終端機）`npm run tunnel`，拿到 `https://xxx.trycloudflare.com`，**用那個網址開 `/admin`** 產 QR，手機掃了才會連回本機——後台是拿當下 origin 組掃碼網址，用 `localhost` 開會編出手機打不到的網址。`nuxt.config` 已把 `.trycloudflare.com` 加進 `vite.server.allowedHosts`。首次要先裝：`winget install --id Cloudflare.cloudflared -e`（裝完開新終端機才吃得到 PATH）。通道網址每次重啟都會變（QR 要重產），且是公開的，測完務必關掉。
- `npm run tunnel` 要搭 `npm run dev:host` 而非 `npm run dev`：後者只綁 `::1`，cloudflared 連 `localhost:3000` 解析到 IPv4 會 502。
- **模擬多個使用者**：一般視窗與無痕視窗各是一個匿名身分，用來驗證「不同人各自能領、同一人不能重複領」。
- `npm run dev` 與 `npm run build` **不能同時跑**（Nuxt 會擋 lock），build 前要先停掉 dev server。

## 4. 技術架構

- **前端**：Nuxt 3 pages/components（Vue 3 SFC，`<script setup>`）+ **Pinia** 狀態 + **Tailwind v4**。元件、composables、stores 皆 **自動匯入**。
- **後端**：Nitro 檔案式路由 `server/api/**`，`server/utils/**` 自動匯入，`server/models/**` 為 Mongoose 模型（**需手動 import**）。
- **資料流**：`stores/*` → `$fetch('/api/...')` → Nitro handler → Mongoose → MongoDB。
- **驗證/安全**：LINE ID token 驗證（`server/utils/line.ts`）、HMAC 簽章 session cookie（`server/utils/auth.ts`）、半靜態簽章 QR（`server/utils/qr.ts`）、GPS 圍籬（`server/utils/geo.ts`）、網域分離防護（`server/middleware/0.admin-host-guard.ts`，選配）。

### 前台網址參數
| 參數 | 說明 |
|------|------|
| `?s=<token>` | 掃碼落地：自動集章並停在集章卡（手機內建相機掃 QR 會開這個） |
| `?c=<campaignId>` | **圖文選單連結**：直接載入指定活動，不受「預設取最新一檔」影響。後台 QR 分頁可複製，貼到 LINE 官方帳號的圖文選單按鈕上 |

設了 LIFF ID 後，這兩個參數是包在 LIFF 網址裡送出的（`https://liff.line.me/<LIFF_ID>?s=…`），
LIFF SDK 會在 `liff.init()` 之後才把它們還原到網址上——所以 `pages/index.vue` 是在 `ensureAuth()` 跑完後
才從 `window.location.search` 讀，不能用 `route.query`（見雷區）。

兩者用完都會從網址上清掉，避免重新整理時重送。

### API 端點
| 方法 路徑 | 說明 |
|-----------|------|
| `POST /api/auth/login` | body 可帶 `{ idToken }`：有帶就向 LINE 驗證後以 `lineUserId` 找／建帳號（當下若是匿名帳號則就地升級）；沒帶就沿用 session、否則開匿名帳號 → 發 session |
| `GET /api/auth/me`、`POST /api/auth/logout` | 讀取 / 清除登入 |
| `GET /api/campaign/current` | 活動 + 集章點 + 獎項 + 使用者狀態。可帶 `?campaignId=` 指定活動；該活動查無或已結束時**退回最新一檔**而非報錯 |
| `POST /api/stamp/collect` | QR 驗證 +（可選）GPS 圍籬 + 去重 → 集章。回傳含 `campaignId`（QR 所屬活動），前台據此切換 |
| `POST /api/reward/redeem` | **現場核銷**：`{ rewardId, staffKey }`，驗核銷碼（活動的 4 碼 PIN 優先，未設才用 env）+ 門檻 + 每人上限 + 扣庫存，**一次完成領取與核銷**（防重複，409；同一使用者連錯 5 次鎖 5 分鐘，429） |
| `GET /api/dev/tokens` | 僅 dev：各點 QR token（現已無人呼叫，正式站回 404） |
| `GET /api/health` | DB 連線檢查 |

**後台端點**（`server/api/admin/**`）：全部需通過 `server/utils/admin.ts` 的 `requireAdmin`——認的是 `POST /api/admin/login` 簽發的 **httpOnly cookie `jh_admin`**（12 小時效期），`x-admin-key` header 保留為 curl／維運腳本的後備。`login` / `logout` 兩支是唯二不呼叫 `requireAdmin` 的端點。回傳格式由 `server/utils/adminDto.ts` 統一。

| 方法 路徑 | 說明 |
|-----------|------|
| `GET/POST /api/admin/campaigns`、`PUT/DELETE /api/admin/campaigns/:id` | 活動 CRUD。GET 附即時計算的 `participantsCount`；DELETE 連帶清 Station/Reward，但有集章紀錄時回 409 |
| `GET/POST /api/admin/stations`、`PUT/DELETE /api/admin/stations/:id` | 集章點 CRUD（`?campaignId=` 篩選）。POST 自動產 `qrSecret`；有集章紀錄時不可刪（409） |
| `GET/POST /api/admin/rewards`、`PUT/DELETE /api/admin/rewards/:id` | 獎項 CRUD；已被領取的獎項不可刪（409） |
| `GET /api/admin/qr` | `?campaignId=` 各點 QR token（`v1.<stationId>.<hmac>`；前端 `AdminQrCodes.vue` 再把它包成掃碼網址 `<siteUrl>/?s=<token>` 才畫成 QR） |
| `POST /api/admin/upload` | multipart 圖片上傳 → Vercel Blob 或 `public/uploads/`（見雷區） |
| `POST /api/admin/resolve-map-link` | `{ url }` → `{ lat, lng }`。貼 Google 地圖連結解析座標，會展開 `maps.app.goo.gl` 短網址。**有網域白名單**（見雷區） |

## 5. 核心資料夾

```
assets/css/main.css   Tailwind v4 進入點 + 全域樣式（字型、**全站字級 token**、scanline 動畫）
pages/
  index.vue           主 App（自動登入 → 地圖/集章卡/獎項分頁殼層）
  admin.vue           營運後台（通行碼 gate + 側欄 + toast，分頁由下列元件組成）
components/            Vue 元件（自動匯入）
                      前台：MapView（商圈／Google 地圖）/ MarketMapView（市集／平面圖）/
                            StampCard / RewardsList / Scanner /
                            DetailBottomSheet / ListBottomSheet / DebugPanel（`?debug=1` 才掛）
                      後台：AdminCampaigns / AdminStations / AdminRewards /
                            AdminQrCodes / AdminMarketMap / AdminMapPicker /
                            AdminModal / AdminConfirm
composables/          useAdminToast.ts（後台共用提示，跨元件用 useState 共享）、
                      useLiff.ts（LIFF 初始化 → LINE ID token，拿不到回 null）
utils/                前端自動匯入：scanTarget.ts（掃到的 QR／網址參數 → 集章 token 或活動入口）、
                      scanHandoff.ts（掃碼目標跨 LINE 登入導轉的暫存，5 分鐘 TTL、讀完即刪）、
                      bootLog.ts（最近 5 次進站網址，供 `?debug=1` 診斷）、
                      stampGeo.ts（集章要不要抓 GPS，Scanner 與掃碼落地共用）
stores/               Pinia：user.ts（登入）、campaign.ts（前台狀態）、admin.ts（後台狀態 + CRUD）
server/
  api/                Nitro 端點（見上表），依 <名稱>.<method>.ts 命名；後台在 api/admin/
  middleware/         0.admin-host-guard.ts（網域分離防護，選配，見 NUXT_ADMIN_HOSTNAMES）
  models/             Mongoose 模型（7 個集合，需手動 import）
  utils/              自動匯入：mongoose 連線、auth session、line ID token 驗證、
                      qr 簽章、geo 圍籬、code 產碼、
                      admin 通行碼 guard + 核銷碼驗證、adminDto 回傳序列化、
                      redeemThrottle 核銷碼連錯鎖定
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
- **字級一律用 token utility**（`text-3xs` / `text-2xs` / `text-xs` / `text-sm` / `text-base` / `text-lg` / `text-xl` / `text-2xl`），**不要寫 `text-[11px]` 這種硬值**——全站字級定義在 `assets/css/main.css` 的 `@theme`，要整體放大縮小只改那裡；寫死 px 的地方調不到。

**後端**
- handler 用 `defineEventHandler`；輸入用 `readBody`/`getQuery` 並驗證。
- 錯誤一律 `throw createError({ statusCode, message })` — **用 `message` 不用 `statusMessage`**（後者未來會被 h3 清成 ASCII，中文會不見）；前端讀 `err.data?.message`。
- 需登入的端點呼叫 `requireUser(event)`；後台端點呼叫 `requireAdmin(event)`。
- `server/models/**` 用到要**手動相對匯入**；`server/utils/**` 直接用（自動匯入）。

## 7. 慣例與雷區

- **環境變數數字型**：純數字 env（如 `NUXT_GEOFENCE_RADIUS_M`）會被 Nuxt(destr) 解析成 **number**；要當字串用時務必 `String(x)`（曾因對 number 呼叫 `.trim()` 造成 500）。
- **快取髒掉**：改依賴或大改後若 dev 出現 `#app-manifest` 之類 pre-transform error、前端載不出來，清 `.nuxt` 與 `node_modules/.vite` 再重啟。本專案已關 `experimental.appManifest`。
- **QR token**：格式 `v1.<stationId>.<hmac>`，`hmac = HMAC-SHA256(station.qrSecret, stationId)`，穩定可印製。**QR 圖裡編的是網址 `<siteUrl>/?s=<token>`**（手機內建相機才有東西可開），伺服器驗的仍是 token 本身；`utils/scanTarget.ts` 的 `parseScanTarget` 負責把網址還原成 token，也相容 2026/08 前印製的純 token QR。
- **手機測試一定要 HTTPS**：相機需 HTTPS，而且 iPhone Safari 的 HTTPS-Only 連純粹「開一個區網 http 網址」都會擋，所以 `http://<電腦IP>:3000` 這條路整條不能用。測正式站連 Vercel 網址；測本機未部署的版本走 `npm run tunnel`（cloudflared HTTPS 通道，見第 3 節測試慣例）。
- **前台已無點擊集章的測試面板**（掃描頁只剩真實相機解碼）。`/api/dev/tokens` 端點仍在但已無人呼叫，正式站本來就回 404。
- **圍籬要開就兩個 env 一起開**：`NUXT_GEOFENCE_ENFORCE`（後端擋）與 `NUXT_PUBLIC_GEOFENCE_ENFORCE`（前端才會去抓 GPS）。只開後端會變成前端不送座標、後端一律擋下。
- **`resolve-map-link` 會對外發請求，網域白名單是防 SSRF 的**：`ALLOWED_HOSTS` 用「完全相等或為其子網域」比對，**絕不可改成 `includes`／裸 `endsWith`**，否則 `google.com.evil.tw` 會過關，端點就變成打內網的跳板。展開短網址後會再驗一次白名單（防轉址逃逸）。
- **民眾動線是三層，別把它壓成兩層**：`印 LINE 後台提供的官方帳號 QR → 掃描加好友 → 圖文選單 → ?c= 連結 → 活動地圖`。因此 **`?c=` 連結是給業主貼進圖文選單用的，不是給民眾掃的**（後台已移除它的 QR 產生，2026/08）——若把 `?c=` 印成 QR 給民眾掃，他們會直接進活動、繞過官方帳號而不會加好友，整個 OA 導流就白做了。**官方帳號的 QR 由 LINE 後台提供，不由本系統產生。**
- **攤位 QR（`?s=`）絕不可改成官方帳號連結**：改了就變成「掃攤位只會加好友、集不到章」。攤位 QR 維持直接集章，與動線的第一層無關。
- **QR 網址與圖文選單連結由 `AdminQrCodes.vue` 的 `appUrl()` 一手包辦**（`scripts/qrsheet.ts` 有一份等價邏輯，改一邊要記得改另一邊）：有設 `NUXT_PUBLIC_LIFF_ID` 就編 `https://liff.line.me/<id>?s=…` / `?c=…`；沒設才退回 `NUXT_PUBLIC_SITE_URL`（再留空就取後台當下 origin，前後台分域部署會編到後台網域 → 民眾掃了開錯站）。**換過 LIFF 設定就要重印 QR**；站內掃描器（`utils/scanTarget.ts` 的 `parseScanTarget`）LIFF 網址、舊站台網址、更舊的純 token 三種都吃得下。
- **掃碼參數一定要在 `ensureAuth()` 之前先讀先存**（`pages/index.vue` onMounted 開頭的 `stashScanTarget`）：外部瀏覽器未登入時 `useLiff.ts` 會呼叫 `liff.login()` **把整頁導去 LINE**，回來時網址上的 `?s=` / `?c=` 可能已經不見了。順序寫反（先 await ensureAuth 再讀網址）就永遠救不回來，症狀是「掃了完全沒反應、沒有任何錯誤訊息」——2026/08 踩過一次。暫存讀完即刪且有 5 分鐘 TTL，否則重新整理會重複集章、或殘留到下次進站誤觸發。
- **手機端出事就用 `?debug=1`**：手機沒有 devtools，`DebugPanel.vue` 會列出最近 5 次進站網址、這次解析出的 `ScanTarget`、LIFF 的 `isInClient` / `isLoggedIn` / 有沒有拿到 ID token，可一鍵複製。要看 LINE 內建瀏覽器的記錄就傳 `https://liff.line.me/<liffId>?debug=1` 給自己點開（記錄存在 localStorage，跟瀏覽器綁在一起，Safari 看不到 LINE 內的那一份）。
- **`ensureAuth()` 裡 LINE 登入失敗必須吞掉**：`user.login(idToken)` 被後端擋下時若讓例外衝出 `onMounted`，整個 App 會變成一片 `bootError` 畫面，連掃碼集章都輪不到執行。拿不到 LINE 身分就退回匿名，跟 `useLiff.ts` 同一個哲學。
- **LIFF 的 `?c=` / `?s=` 要在 `liff.init()` 之後從 `window.location.search` 讀**：LIFF 把參數塞在 `liff.state` 裡帶回來，SDK init 完才用 `history.replaceState` 還原，vue-router 收不到通知 → 那時的 `route.query` 是空的。同理清網址也不能用 `router.replace`，`pages/index.vue` 用的是 `clearQuery()`（直接 `history.replaceState`）。
- **本機測不到 LINE 登入**：`composables/useLiff.ts` 的 `canUseLiff()` 在 hostname 是 localhost、或 origin 不等於 `NUXT_PUBLIC_SITE_URL` 時一律回 false，直接退回匿名身分——因為 LIFF 的 `redirectUri` 只能落在 LINE 後台註冊的 Endpoint URL 網域，localhost 與 cloudflared 通道打過去必定失敗。要測 LINE 登入就上正式站，或另建一個 Endpoint 指向通道網址的 LIFF app 並同步改 `NUXT_PUBLIC_SITE_URL`。
- **匿名帳號升級是一次性的**：LINE 首次登入時，若當下 session 是 `anon:` 開頭的帳號就把它的 `lineUserId` 換成真的 LINE userId（章與兌換紀錄掛在 `User._id`，不受影響）。但**該 LINE ID 已經有帳號時就直接切過去，不合併**兩邊的章——同一個人先在 A 瀏覽器匿名集章、又在 B 瀏覽器用 LINE 登入過，A 那邊的章就接不回來了。
- **`server/utils/line.ts` 一定要向 LINE 驗 ID token**：channel ID 取 `NUXT_LINE_CHANNEL_ID`，留空才用 `NUXT_PUBLIC_LIFF_ID` 的前綴（LIFF ID 格式 `<channelId>-<hash>`）。**絕不可改成直接相信前端送來的 lineUserId**，否則任何人都能冒充別人領走他的獎。
- **核銷已無 QR／核銷碼／`/verify` 頁**：改成工作人員在民眾手機上按「工作人員點選核銷」→ 輸入通行碼 → 「確認核銷」，`POST /api/reward/redeem` 一次完成領取與核銷。Redemption 仍會產生 `code`（欄位 required + unique），但只作為對帳用的紀錄編號，不再給人掃。因此**庫存只會扣一次**，且不存在 `pending` 狀態的兌換紀錄。
- **圖片上傳走 Vercel Blob**：`admin/upload.post.ts` 看 `BLOB_READ_WRITE_TOKEN`——有值就存到 Blob（回傳絕對網址），留空就寫本機 `public/uploads/`（回傳 `/uploads/xxx`）。**線上一定要設 token**，serverless 檔案系統唯讀，寫本機路徑會壞。本機開發不設也能上傳。「貼圖片網址」的欄位仍保留，供圖片已在別處時直接引用。
- **市集版靠 `campaign.type` 驅動**：`/api/campaign/current` 必須回傳 `type` 與 `marketMapUrl`，前台才知道要渲染哪一種地圖。市集分頁**只有平面圖本身**（攤位標記與 `station.mapCoord` 已於 2026/08 移除），要進攤位詳情走左下角清單。DB 舊文件殘留的 `mapCoord` 欄位不影響讀取（schema 已無此欄位）。
- **核銷碼是活動層級的 4 碼 PIN**：`campaign.staffPasscode`，後台「編輯活動」設定；留空才回頭用 env `NUXT_STAFF_PASSCODE`。`staffPasscode` 只出現在 `campaignDto`（`requireAdmin` 擋著），**絕不可加進 `/api/campaign/current`**。4 碼易被暴力嘗試，`server/utils/redeemThrottle.ts` 對同一使用者連錯 5 次鎖 5 分鐘——但那是 module 層記憶體，serverless 每個 instance 各一份，屬緩解而非完整防護。節流實作抽在 `server/utils/attemptLimiter.ts`，與後台登入共用（各自一份 Map，不會互相影響）。
- **後台通行碼絕不可再存進 localStorage**：2026/08 之前是把通行碼本身明文存在 `jh_admin_key`，等於「誰拿到這個瀏覽器誰就是永久管理員」，且 XSS 讀得到。現在改成 `POST /api/admin/login` 驗過後簽發 httpOnly cookie（`jh_admin`，12 小時，用 `NUXT_SESSION_SECRET` 簽章），前端只留一個 `authed` 布林值。`stores/admin.ts` 開機時還會主動 `removeItem('jh_admin_key')` 清掉舊裝置上的殘留，這行不要拿掉。
- **`/admin` 與民眾前台同網域**（線上 `NUXT_ADMIN_HOSTNAMES` 未設），所以後台登入端點是公開打得到的，一定要有節流：連錯 5 次鎖該來源 IP 5 分鐘。
- **多檔活動同時 active**：前台一次只顯示一檔。預設取最新一檔，但**掃到別檔的 QR（集章 QR 或活動入口 QR）一律整個切過去**，統一走 `stores/campaign.ts` 的 `switchTo()`；選擇記在 `localStorage` 的 `jiuli-hai:campaign-id`，重新整理不會跳回去。集章一律記在 **QR 所屬活動**（`stamp/collect.post.ts` 用 `station.campaignId`），與前台正在看哪一檔無關——這是刻意的，改動前先想清楚。民眾目前**無法手動切回**另一檔，只能靠掃碼。
- **「切活動」與「集章成功」是兩件事，不可再綁在一起**：民眾掃了別檔的 QR 卻因為 `noStamp`／活動未進行中／GPS 圍籬而集章失敗時，**畫面仍要切到那一檔活動**，否則他會停在前一檔活動上完全看不懂發生什麼事（這正是 2026/08 修掉的 bug）。做法：`stamp/collect.post.ts` 在已查到 station 之後丟的錯誤都帶 `data.campaignId`，`campaign.collect()` 的 catch 讀 `err.data.data.campaignId` 再 `switchTo()`。
- **`switchTo()` 一定要帶 `preview: true`**：`campaign/current.get.ts` 在不帶 preview 且該活動非 active 時會**默默退回最新一檔**，切過去會被彈回原本那檔。
- **`liff.state` 要自己再拆一次**：`parseScanTarget` 除了 `?s=` / `?c=`，也解 `?liff.state=%3Fs%3D…`。LIFF 正常會由 SDK 在 init 後還原，但**沒設 LIFF ID／SDK 沒載到／init 失敗的部署收到 LIFF QR 時沒有人還原它**，症狀是掃了完全沒反應也沒錯誤訊息。這條 fallback 不要拿掉。
- **後台集章點表單的欄位順序刻意對齊前台** `DetailBottomSheet.vue`（照片→名稱→副標題→類型→聯絡資訊→探索此地→私房亮點），改其中一邊時另一邊也要跟著調。欄位名稱前後台一致：`description` =「探索此地」、`specialty` =「私房亮點」。
- **前台仍有寫死的「加蚋仔」字樣**：`StampCard.vue` 的名稱裁切與 `RewardsList.vue` 的票券文案。單一活動下沒問題，之後要做多租戶／多活動時需一併抽成活動設定。
- **刪除有保護**：有集章紀錄的活動／集章點、已被領取的獎項一律回 409 擋下，避免留下孤兒紀錄。要停用請改用「已封存」或 `noStamp`。
- **網域分離部署**：若之後前後台分域部署，兩個部署的 `NUXT_ADMIN_HOSTNAMES` 要設成一致值（都含 admin 網域），因為判斷依據是請求的 Host header，跟哪個實體部署接到請求無關。

## 8. 環境變數（`.env`，範本見 `.env.example`）

`NUXT_MONGODB_URI`、`NUXT_SESSION_SECRET`、`NUXT_PUBLIC_SITE_URL`（QR 掃碼網址的站台位址，留空＝取後台當下 origin）、`NUXT_PUBLIC_LIFF_ID`（LINE LIFF app ID，**留空＝不啟用 LINE 登入，一律匿名身分**）、`NUXT_LINE_CHANNEL_ID`（驗 ID token 用，留空＝取 LIFF ID 前綴，一般不必填）、`BLOB_READ_WRITE_TOKEN`（Vercel Blob 圖片上傳，**無 `NUXT_` 前綴**；留空＝寫本機 `public/uploads/`）、`NUXT_STAFF_PASSCODE`（**預設**核銷通行碼，活動沒設 4 碼 PIN 時才用）、`NUXT_ADMIN_PASSCODE`（後台通行碼）、`NUXT_ADMIN_HOSTNAMES`（後台網域白名單，逗號分隔；留空＝不啟用網域分離檢查，本機預設）、`NUXT_GEOFENCE_ENFORCE`（本機建議 `false`）、`NUXT_GEOFENCE_RADIUS_M`、`NUXT_PUBLIC_GEOFENCE_ENFORCE`（前端用，需與後端同值）、`NUXT_PUBLIC_GOOGLE_MAPS_API_KEY`。

## 9. 部署（Vercel）

- 專案已連結 Vercel `jolihi/jiuli-hai-stamp`，正式網址 <https://jiuli-hai-stamp.vercel.app>（`.vercel/project.json` 為連結設定，不進版控）。
- 部署：`npx vercel --prod --yes --scope jolihi`。**`--scope jolihi` 不能省**——專案在 jolihi team 底下，CLI 預設 scope 會落在個人帳號，省略會回 `Not authorized`（但 `vercel whoami`、`project ls` 照樣正常，容易誤判成沒登入）。**上面那組 env 要在 Vercel 後台各設一份**（本機 `.env` 不會被帶上去），改完 env 要重新部署才生效。`NUXT_PUBLIC_LIFF_ID` 也在其中——線上沒設就等於沒有 LINE 登入。LINE Developers 那邊要先把 LIFF app 的 **Endpoint URL 設成正式網址、scopes 勾 `profile` + `openid`**（少了 `openid` 就拿不到 ID token）。
- 部署是**直接上傳工作區檔案**，跟 git 有沒有 commit 無關；`.gitignore` 內的東西（含 `.env`）不會被上傳。
- Vercel production 的通行碼與 session secret **與本機 `.env` 不同**（線上用另一組），不要互相覆蓋。
- MongoDB Atlas 網路白名單需含 `0.0.0.0/0`，因為 Vercel serverless 出口 IP 不固定。
- `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` 會出現在前端原始碼，**務必在 Google Cloud Console 設 HTTP referrer 限制**到正式網域，否則會被盜用計費。
