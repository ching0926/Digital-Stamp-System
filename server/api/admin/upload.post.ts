import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { put } from '@vercel/blob'

const MAX_BYTES = 5 * 1024 * 1024
// 只收這幾種格式，並以 mime 對應副檔名，不信任使用者送來的檔名
const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// POST /api/admin/upload  (multipart/form-data, 欄位名 file)
// 回傳可直接放進 imgUrl / marketMapUrl 的網址。
// 有 BLOB_READ_WRITE_TOKEN 就存到 Vercel Blob（線上唯一可行的路——serverless
// 檔案系統唯讀，寫 public/uploads/ 會壞）；本機沒設 token 時仍寫 public/uploads/，
// 這樣不必為了改個樣式就先去申請 Blob store。
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

  // 不沿用使用者的檔名，避免路徑穿越與撞名
  const filename = `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    const blob = await put(`uploads/${filename}`, file.data, {
      access: 'public',
      contentType: file.type,
      token,
    })
    // Blob 回傳完整絕對網址，可直接存進 imgUrl / marketMapUrl
    return { url: blob.url }
  }

  const dir = join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, filename), file.data)

  return { url: `/uploads/${filename}` }
})
