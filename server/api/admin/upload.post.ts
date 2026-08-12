import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const MAX_BYTES = 5 * 1024 * 1024
// 只收這幾種格式，並以 mime 對應副檔名，不信任使用者送來的檔名
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// POST /api/admin/upload  (multipart/form-data, 欄位名 file)
// 圖片寫入 public/uploads/，回傳可直接放進 imgUrl / marketMapUrl 的路徑。
// 註：public/ 於 build 時才複製進 .output，故此寫法適用 npm run dev（本機測試版現況）。
// 未來要上雲或跑 preview，需改成物件儲存或獨立 static 掛載。
export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const form = await readMultipartFormData(event)
  const file = form?.find((f) => f.name === 'file' && f.filename)
  if (!file) throw createError({ statusCode: 400, message: '缺少上傳檔案' })

  const ext = MIME_EXT[file.type ?? '']
  if (!ext) throw createError({ statusCode: 400, message: '僅支援 JPG／PNG／WebP 圖片' })
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, message: '圖片超過 5MB 上限' })
  }

  const filename = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`
  const dir = join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), file.data)

  return { url: `/uploads/${filename}` }
})
