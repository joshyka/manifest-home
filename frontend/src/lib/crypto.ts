// AES-256-GCM encryption using Web Crypto API — passphrase never leaves the browser

const ENC_KEY = 'kj_enc_enabled'
const PASS_SESSION_KEY = 'kj_enc_pass'

export function isEncryptionEnabled(): boolean {
  return localStorage.getItem(ENC_KEY) === '1'
}

export function getSessionPassphrase(): string | null {
  return sessionStorage.getItem(PASS_SESSION_KEY)
}

export function setSessionPassphrase(pass: string) {
  sessionStorage.setItem(PASS_SESSION_KEY, pass)
}

export function clearSessionPassphrase() {
  sessionStorage.removeItem(PASS_SESSION_KEY)
}

export function enableEncryption() {
  localStorage.setItem(ENC_KEY, '1')
}

export function disableEncryption() {
  localStorage.removeItem(ENC_KEY)
}

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('keyjourney-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptData(data: any, passphrase: string): Promise<string> {
  const key = await deriveKey(passphrase)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(data))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  })
}

export async function decryptData(raw: string, passphrase: string): Promise<any> {
  const { iv, data } = JSON.parse(raw)
  const key = await deriveKey(passphrase)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}

export function isEncryptedBlob(value: any): boolean {
  return typeof value === 'string' && value.startsWith('{"iv":')
}
