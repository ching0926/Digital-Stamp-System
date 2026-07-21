import { randomInt } from 'node:crypto'

// 產生人可輸入的核銷碼（避免易混淆字元 0/O/1/I）。
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

export function generateRedemptionCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}
