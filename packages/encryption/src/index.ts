import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

function masterKey(raw: string): Buffer {
  const buf = Buffer.from(raw, 'base64')
  if (buf.length === 32) return buf
  return createHash('sha256').update(raw).digest()
}

export function encryptSecret(plaintext: string, masterKeyB64: string): { encryptedContent: string; encryptedDataKey: string } {
  const mk = masterKey(masterKeyB64)
  const dataKey = randomBytes(32)
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  const keyIv = randomBytes(12)
  const keyCipher = createCipheriv('aes-256-gcm', mk, keyIv)
  const encKey = Buffer.concat([keyCipher.update(dataKey), keyCipher.final()])
  const keyTag = keyCipher.getAuthTag()

  return {
    encryptedContent: Buffer.concat([iv, tag, enc]).toString('base64'),
    encryptedDataKey: Buffer.concat([keyIv, keyTag, encKey]).toString('base64')
  }
}

export function decryptSecret(
  encryptedContent: string,
  encryptedDataKey: string,
  masterKeyB64: string
): string {
  const mk = masterKey(masterKeyB64)
  const keyBuf = Buffer.from(encryptedDataKey, 'base64')
  const keyIv = keyBuf.subarray(0, 12)
  const keyTag = keyBuf.subarray(12, 28)
  const encKey = keyBuf.subarray(28)
  const keyDecipher = createDecipheriv('aes-256-gcm', mk, keyIv)
  keyDecipher.setAuthTag(keyTag)
  const dataKey = Buffer.concat([keyDecipher.update(encKey), keyDecipher.final()])

  const contentBuf = Buffer.from(encryptedContent, 'base64')
  const iv = contentBuf.subarray(0, 12)
  const tag = contentBuf.subarray(12, 28)
  const enc = contentBuf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', dataKey, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}
