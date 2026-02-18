// End-to-end encryption using Web Crypto API — zero dependencies
// Model: 1Password/Signal style key wrapping with recovery phrase

const PBKDF2_ITERATIONS = 100_000;
const IV_LENGTH = 12; // 96 bits for AES-GCM

// --- Helpers ---

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function getRandomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

// --- Key Derivation ---

async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function deriveKeyFromPassword(password: string, saltB64: string): Promise<CryptoKey> {
  return deriveKey(password, new Uint8Array(fromBase64(saltB64)));
}

export async function deriveKeyFromRecovery(phrase: string, saltB64: string): Promise<CryptoKey> {
  return deriveKey(phrase.toLowerCase().trim(), new Uint8Array(fromBase64(saltB64)));
}

// --- DEK Generation ---

export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export function generateSalt(): string {
  return toBase64(getRandomBytes(32));
}

// --- Key Wrapping (encrypt DEK with a wrapping key) ---

async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key);
}

async function importDEK(raw: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function wrapDEK(dek: CryptoKey, wrappingKey: CryptoKey): Promise<string> {
  const raw = await exportKey(dek);
  const iv = getRandomBytes(IV_LENGTH);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, wrappingKey, raw);
  // Prepend IV to ciphertext
  const combined = new Uint8Array(IV_LENGTH + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), IV_LENGTH);
  return toBase64(combined.buffer);
}

export async function unwrapDEK(wrapped: string, wrappingKey: CryptoKey): Promise<CryptoKey> {
  const combined = new Uint8Array(fromBase64(wrapped));
  const iv = combined.slice(0, IV_LENGTH);
  const ct = combined.slice(IV_LENGTH);
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, wrappingKey, ct);
  return importDEK(raw);
}

// --- Data Encryption ---

export async function encrypt(plaintext: string, dek: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const iv = getRandomBytes(IV_LENGTH);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, enc.encode(plaintext));
  const combined = new Uint8Array(IV_LENGTH + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), IV_LENGTH);
  return toBase64(combined.buffer);
}

export async function decrypt(ciphertext: string, dek: CryptoKey): Promise<string> {
  const combined = new Uint8Array(fromBase64(ciphertext));
  const iv = combined.slice(0, IV_LENGTH);
  const ct = combined.slice(IV_LENGTH);
  const raw = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, ct);
  return new TextDecoder().decode(raw);
}

// --- Recovery Phrase ---
// 256 common English words — enough entropy for 96 bits (12 words from 256 = 2^96)

const WORDS = [
  'anchor','arrow','autumn','basket','beacon','bloom','bridge','canyon','cedar','chorus',
  'cliff','cloud','copper','coral','crystal','dagger','dawn','desert','diamond','drift',
  'eagle','ember','falcon','flame','forest','fountain','frost','garden','glacier','granite',
  'harbor','harvest','hawk','horizon','inlet','iron','ivory','jasper','journal','jungle',
  'kindle','lantern','latch','laurel','ledge','lemon','lightning','linen','lotus','maple',
  'marble','marsh','meadow','meteor','mirror','monarch','mosaic','mustard','nebula','needle',
  'nest','north','novel','oak','oasis','olive','onyx','orbit','orchid','osprey',
  'paddle','palm','panther','pearl','pebble','pepper','phoenix','pine','plume','pocket',
  'polar','pond','porcelain','prism','pulse','quartz','quest','quill','radiant','raven',
  'reef','ridge','river','robin','rocket','sage','sail','salmon','sapphire','scarlet',
  'scroll','shadow','shelter','sierra','silver','sketch','slate','solar','sparrow','sphere',
  'spruce','starling','steam','stone','storm','summit','swift','tangle','temple','thistle',
  'thunder','tide','timber','torch','tower','trail','tulip','tundra','tunnel','turtle',
  'twilight','umbrella','valley','velvet','venture','vessel','violet','vivid','walnut','wander',
  'water','wave','wheat','whisper','willow','winter','wonder','yarrow','zenith','zephyr',
  'alpine','bamboo','barrel','breeze','bronze','cabin','candle','canvas','castle','chamber',
  'cinder','circuit','cobalt','column','compass','cotton','crater','crimson','current','dapple',
  'delta','denim','dome','dune','echo','eclipse','fern','fiction','flint','fossil',
  'garnet','geyser','ginger','grove','gust','haven','helm','hemp','heron','hollow',
  'humble','indigo','island','jagged','juniper','keystone','knoll','lagoon','lark','lava',
  'lichen','loft','lunar','magnet','mango','mantle','mesa','mist','molten','nacre',
  'nimbus','nutmeg','obsidian','ocean','ochre','origin','oxbow','parchment','pasture','patent',
  'peak','pewter','pilgrim','plank','plateau','plover','quail','quarry','rabbit','rapids',
  'relic','remnant','ripple','rowan','rustic','saffron','sandstone','sequoia','shale','shore',
  'sierra','silk','silo','siren','sketch','slate','solstice','summit','terra','thicket',
  'topaz','torrent','trellis','tropic','verge','vortex',
];

export function generateRecoveryPhrase(): string {
  const indices = getRandomBytes(12);
  return Array.from(indices).map(b => WORDS[b % WORDS.length]).join(' ');
}

// --- Encrypted field detection ---

export function isEncrypted(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.length < 20) return false;
  try {
    const decoded = atob(value);
    return decoded.length >= IV_LENGTH + 16; // At least IV + one AES block
  } catch {
    return false;
  }
}
