// PagerClear's shared models, numbers and helpers: a real POCSAG encoder and BCH(31,21) decoder,
// a 5×7 dot-matrix LCD font, the 3D pager, radio tower and battery maths.
// Numbers come from real specs; sources are given next to each constant.
import { THREE, M, box, rod, beam, tube, torus, canvasTexture, clamp } from './kit.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const TAU = Math.PI * 2;

// ------------------------------------------------------------------ POCSAG (ITU-R M.584, "Radiopaging Code No. 1")
// Source: Wikipedia, "POCSAG"; ITU-R Recommendation M.584-2 (1997).
// • At least 576 bits of preamble (1010…), then batches of 1 sync codeword + 8 frames × 2 codewords.
// • Each codeword is 32 bits: 21 information bits, 10 BCH check bits, 1 even-parity bit.
// • Address codeword: flag 0, 18 address bits, 2 function bits. The low 3 bits of the 21-bit
//   address (RIC) are not sent: they say which frame (0–7) the address goes in.
// • Message codeword: flag 1, 20 data bits. Alphanumeric text is 7-bit ASCII sent least significant bit first.
// • BCH(31,21) generator g(x) = x¹⁰+x⁹+x⁸+x⁶+x⁵+x³+1. With the parity bit the minimum distance is 6,
//   so a decoder can correct up to 2 wrong bits in a codeword.
// • Rates 512, 1,200 or 2,400 bit/s; FSK ±4.5 kHz, the higher frequency is a 0, the lower a 1.
export const PREAMBLE_BITS = 576;
export const SYNC = 0x7CD215D8;
export const IDLE = 0x7A89C197;
export const RATES = [512, 1200, 2400];
export const FSK_KHZ = 4.5;
const GEN = 0x769;                 // 11101101001 = x^10+x^9+x^8+x^6+x^5+x^3+1

const popcount = (x) => { x >>>= 0; let n = 0; while (x) { n += x & 1; x >>>= 1; } return n; };

// BCH check bits for 21 information bits.
export function bchCheck(info21) {
  let r = (info21 << 10) >>> 0;
  for (let i = 30; i >= 10; i--) if (r & (1 << i)) r ^= GEN << (i - 10);
  return r & 0x3ff;
}
// Build a full 32-bit codeword from 21 information bits (MSB first).
export function codeword(info21) {
  const cw31 = ((info21 << 10) | bchCheck(info21)) >>> 0;
  return ((cw31 << 1) | (popcount(cw31) & 1)) >>> 0;
}
// Syndrome of the top 31 bits (0 means a valid BCH codeword).
function syndrome31(cw32) {
  let r = cw32 >>> 1;
  for (let i = 30; i >= 10; i--) if (r & (1 << i)) r ^= GEN << (i - 10);
  return r & 0x3ff;
}
// Syndrome → error pattern table for every 1- and 2-bit error in the 31 BCH bits (all 496 are distinct).
const SYN = new Map();
for (let i = 0; i < 31; i++) {
  SYN.set(syndrome31((1 << (i + 1)) >>> 0), [i + 1]);
  for (let j = i + 1; j < 31; j++) SYN.set(syndrome31(((1 << (i + 1)) | (1 << (j + 1))) >>> 0), [i + 1, j + 1]);
}
// Decode one received 32-bit codeword. Bit positions are 0 = parity (LSB) … 31 = flag (MSB).
// Returns { word, fixed: [bit positions corrected], ok }.
export function decodeWord(rx) {
  rx >>>= 0;
  const s = syndrome31(rx);
  let fixed = [], word = rx;
  if (s) {
    const pat = SYN.get(s);
    if (!pat) return { word: rx, fixed: [], ok: false };
    pat.forEach((b) => { word = (word ^ (1 << b)) >>> 0; });
    fixed = pat.slice();
  }
  // The even-parity bit checks the whole word. If it fails after a 2-bit fix, there were 3 or more errors.
  if (popcount(word) & 1) {
    if (fixed.length >= 2) return { word: rx, fixed: [], ok: false };
    word = (word ^ 1) >>> 0; fixed.push(0);
  }
  return { word, fixed, ok: true };
}

// Text → 7-bit characters, each sent least-significant bit first. Ends with EOT (0x04), as many encoders do.
export function textToChars(text) {
  const out = [];
  for (const ch of text) { const c = ch.charCodeAt(0); out.push(c < 128 ? c : 63); }
  return out;
}
export function charsToBits(chars) {
  const bits = [];
  chars.forEach((c) => { for (let b = 0; b < 7; b++) bits.push((c >> b) & 1); });
  return bits;
}

// Encode an alphanumeric page for address `ric` (0 … 2,097,151). Returns the transmission:
// { words: [{ w, kind: 'sync'|'idle'|'addr'|'msg', batch, frame, slot, charFrom, charTo }], chars, frame }.
export function encodePage(ric, text, func = 3) {
  const chars = textToChars(text);
  const all = chars.concat([4]);                  // EOT
  const bits = charsToBits(all);
  while (bits.length % 20) bits.push(0);
  const msgWords = [];
  for (let k = 0; k < bits.length; k += 20) {
    let d = 0; for (let b = 0; b < 20; b++) d = (d << 1) | bits[k + b];
    const firstBit = k, lastBit = k + 19;
    msgWords.push({ w: codeword((1 << 20) | d), charFrom: Math.floor(firstBit / 7), charTo: Math.min(all.length - 1, Math.floor(lastBit / 7)) });
  }
  const frame = ric & 7;
  const addr = codeword(((ric >>> 3) << 2) | (func & 3));
  const words = [];
  let slot = 0, batch = 0;
  const push = (o) => {
    if (slot % 16 === 0) { words.push({ w: SYNC, kind: 'sync', batch: slot / 16, frame: -1, slot: -1 }); }
    words.push({ ...o, batch: Math.floor(slot / 16), frame: Math.floor((slot % 16) / 2), slot: slot % 16 });
    slot++;
  };
  while (slot < frame * 2) push({ w: IDLE, kind: 'idle' });
  push({ w: addr, kind: 'addr' });
  msgWords.forEach((m) => push({ ...m, kind: 'msg' }));
  push({ w: IDLE, kind: 'idle' });               // an idle codeword marks the end of the message
  while (slot % 16) push({ w: IDLE, kind: 'idle' });
  batch = Math.ceil(slot / 16);
  return { words, chars: all, frame, batches: batch, msgCount: msgWords.length, addr };
}

// Decode the message words of a (possibly damaged) transmission back to text.
// Returns per-word decode results and the text with ▒ where a codeword could not be repaired.
export function decodePage(words, rxWords, fix = true) {
  const res = rxWords.map((rx, i) => {
    const k = words[i].kind;
    if (k === 'sync' || k === 'idle') return { rx, word: rx, fixed: [], ok: true, kind: k };
    if (!fix) return { rx, word: rx, fixed: [], ok: true, kind: k, raw: true };
    return { rx, ...decodeWord(rx), kind: k };
  });
  // Rebuild the bit stream from message words, keeping track of bad ones.
  const bits = [], bad = [];
  res.forEach((r, i) => {
    if (words[i].kind !== 'msg') return;
    const d = (r.word >>> 11) & 0xfffff;
    for (let b = 19; b >= 0; b--) { bits.push((d >> b) & 1); bad.push(!r.ok); }
  });
  let text = '';
  for (let k = 0; k + 7 <= bits.length; k += 7) {
    let c = 0, broken = false;
    for (let b = 0; b < 7; b++) { c |= bits[k + b] << b; broken ||= bad[k + b]; }
    if (c === 4) break;
    text += broken ? '▒' : (c >= 32 && c < 127 ? String.fromCharCode(c) : '▒');
  }
  return { res, text };
}

export const bin = (v, n) => (v >>> 0).toString(2).padStart(n, '0').slice(-n);
export const hex = (v) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(8, '0');

// A small seeded random number generator, so noise is the same frame to frame.
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
// Probability that a 32-bit codeword has more than 2 wrong bits at bit error rate p.
export function pFail(p) {
  let ok = 0;
  const C = [1, 32, 496];
  for (let k = 0; k <= 2; k++) ok += C[k] * Math.pow(p, k) * Math.pow(1 - p, 32 - k);
  return 1 - ok;
}

// ------------------------------------------------------------------ battery and duty cycle
// The pager wakes for the sync codeword and its own frame (2 codewords): 96 of every 544 bits,
// plus a few milliseconds for the receiver to settle. Everything else it sleeps.
// Current draws are MODEL ASSUMPTIONS typical of single-chip pager receivers: about 5 mA awake and
// 0.1 mA asleep (clock, decoder and LCD). An alert (beeper or vibration motor) takes about 60 mA for 3 s.
// Usable capacity of one AA alkaline cell at low drain: about 2,500 mAh down to the ~1.1 V a pager
// needs (Energizer E91 datasheet: about 2,850 mAh to 0.8 V at 25 mA and more at lower drains).
// Reality check: makers quote about 1 to 4 months on one AA or AAA cell (Alpha Communications PGR-AL700,
// about 720 h on one AAA; Apollo AP-700, 3 to 4 months on one AAA).
export const BAT = { mAh: 2500, awake: 5, asleep: 0.1, warmMs: 8, alertMa: 60, alertS: 3 };
export function dutyCycle(rate, save = true) {
  if (!save) return 1;
  const batch = 544 / rate, on = 96 / rate + BAT.warmMs / 1000;
  return clamp(on / batch, 0, 1);
}
export function pagerLife(rate, pagesPerDay, save = true) {
  const d = dutyCycle(rate, save);
  const idle = d * BAT.awake + (1 - d) * BAT.asleep;                       // mA
  const alert = (pagesPerDay * BAT.alertMa * BAT.alertS) / 86400;         // mA averaged over a day
  const mA = idle + alert;
  return { duty: d, mA, hours: BAT.mAh / mA, days: BAT.mAh / mA / 24 };
}
// Phones for comparison. Nokia 5110 (1998): 900 mAh battery, up to about 270 h standby (maker's figure).
// A modern smartphone: typically needs charging every day or two with normal use (varies widely).
export const PHONES = { nokia: { name: '1998 mobile, standby', days: 270 / 24 }, smart: { name: 'Smartphone, normal use', days: 1.2 } };

// ------------------------------------------------------------------ radio coverage (Okumura–Hata, urban)
// L(dB) = 69.55 + 26.16 log f − 13.82 log hb − a(hm) + (44.9 − 6.55 log hb) log d, f in MHz, d in km
// (Wikipedia, "Hata model"; valid for 150–1500 MHz, 1–20 km). a(hm) for a small or medium city.
// Paging budget (assumptions): transmitter power P W, +4 dB net antenna gain, pager sensitivity
// −110 dBm including its small loop antenna, 10 dB fade margin, and about 15 dB extra loss indoors at VHF.
export const RADIO = { fMHz: 153, sens: -110, margin: 10, indoorDb: 15, gain: 4, hm: 1.5 };
export function coverageKm(powerW, hb, indoor) {
  const f = RADIO.fMHz, lf = Math.log10(f), lh = Math.log10(hb);
  const a = (1.1 * lf - 0.7) * RADIO.hm - (1.56 * lf - 0.8);
  const L0 = 69.55 + 26.16 * lf - 13.82 * lh - a, slope = 44.9 - 6.55 * lh;
  const eirp = 10 * Math.log10(powerW * 1000) + RADIO.gain;
  const allowed = eirp - RADIO.sens - RADIO.margin - (indoor ? RADIO.indoorDb : 0);
  return Math.pow(10, (allowed - L0) / slope);
}
// Radio horizon with the standard 4/3-earth bending: d ≈ 4.12 (√h1 + √h2) km, heights in metres.
export const horizonKm = (hb, hm = RADIO.hm) => 4.12 * (Math.sqrt(hb) + Math.sqrt(hm));

// ------------------------------------------------------------------ 5×7 LCD font (classic column bytes, bit 0 = top)
const FONT = {};
const FT = `20 0000000000|21 00005F0000|22 0007000700|23 147F147F14|24 242A7F2A12|25 2313086462|26 3649552250|27 0005030000|28 001C224100|29 0041221C00|2A 082A1C2A08|2B 08083E0808|2C 0050300000|2D 0808080808|2E 0060600000|2F 2010080402|30 3E5149453E|31 00427F4000|32 4261514946|33 2141454B31|34 1814127F10|35 2745454539|36 3C4A494930|37 0171090503|38 3649494936|39 064949291E|3A 0036360000|3B 0056360000|3C 0008142241|3D 1414141414|3E 4122140800|3F 0201510906|40 324979413E|41 7E1111117E|42 7F49494936|43 3E41414122|44 7F4141221C|45 7F49494941|46 7F09090101|47 3E41415132|48 7F0808087F|49 00417F4100|4A 2040413F01|4B 7F08142241|4C 7F40404040|4D 7F0204027F|4E 7F0408107F|4F 3E4141413E|50 7F09090906|51 3E4151215E|52 7F09192946|53 4649494931|54 01017F0101|55 3F4040403F|56 1F2040201F|57 7F2018207F|58 6314081463|59 0304780403|5A 6151494543|5B 007F414100|5C 0204081020|5D 0041417F00|5E 0402010204|5F 4040404040|61 2054545478|62 7F48444438|63 3844444420|64 384444487F|65 3854545418|66 087E090102|67 081454543C|68 7F08040478|69 00447D4000|6A 2040443D00|6B 007F102844|6C 00417F4000|6D 7C04180478|6E 7C08040478|6F 3844444438|70 7C14141408|71 081414187C|72 7C08040408|73 4854545420|74 043F444020|75 3C4040207C|76 1C2040201C|77 3C4030403C|78 4428102844|79 0C5050503C|7A 4464544C44|2592 55AA55AA55`;
FT.split('|').forEach((e) => {
  const [k, v] = e.split(' ');
  const code = parseInt(k, 16), cols = [];
  for (let i = 0; i < 10; i += 2) cols.push(parseInt(v.slice(i, i + 2), 16) || 0);
  FONT[code] = cols;
});
export const glyph = (ch) => FONT[ch.charCodeAt(0)] || FONT[0x3f];

// Draw lines of text as an LCD: a grid of 5×7 dots per character, lit dots dark on a green-grey panel.
// opts: { cols, rows, bg, on, off, pad }
export function drawLCD(g, W, H, lines, o = {}) {
  const cols = o.cols || 20, rows = o.rows || 4;
  const pad = o.pad ?? 10;
  const cw = (W - pad * 2) / (cols * 6), ch = (H - pad * 2) / (rows * 8);
  const d = Math.min(cw, ch);
  const ox = (W - d * cols * 6) / 2, oy = (H - d * rows * 8) / 2;
  g.fillStyle = o.bg || '#9fb489'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    const line = (lines[r] || '').padEnd(cols, ' ').slice(0, cols);
    for (let c = 0; c < cols; c++) {
      const gl = glyph(line[c]), hi = o.hi && o.hi(r, c);
      for (let x = 0; x < 5; x++) for (let y = 0; y < 7; y++) {
        const lit = (gl[x] >> y) & 1;
        if (!lit && !o.off) continue;
        g.fillStyle = lit ? (hi || o.on || '#1d2a18') : o.off;
        g.fillRect(ox + (c * 6 + x) * d + d * 0.08, oy + (r * 8 + y) * d + d * 0.08, d * 0.84, d * 0.84);
      }
    }
  }
}
// Wrap text into lines of n characters, breaking at spaces.
export function wrap(text, n = 20, rows = 4) {
  const words = text.split(' '), out = [];
  let line = '';
  words.forEach((w) => {
    while (w.length > n) { if (line) { out.push(line); line = ''; } out.push(w.slice(0, n)); w = w.slice(n); }
    if ((line + (line ? ' ' : '') + w).length > n) { out.push(line); line = w; } else line += (line ? ' ' : '') + w;
  });
  if (line) out.push(line);
  return out.slice(0, rows);
}

// ------------------------------------------------------------------ the pager (1 unit = 1 cm)
// A generic 1990s alphanumeric belt pager, about 7 × 5 × 2.2 cm, facing +Z, standing on its end.
// No logos. Inside: receiver board, loop antenna round the edge, crystal, vibration motor, beeper, AA cell.
export function makePager({ color = 0x23262e } = {}) {
  const group = new THREE.Group();
  const W = 7.2, H = 5.0, D = 2.3;
  const shellMat = M.plastic(color, { roughness: 0.55, transparent: true, opacity: 1 });
  const rb = (w, h, d, r, mat) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); m.castShadow = m.receiveShadow = true; return m; };
  // Front and back halves of the case.
  const front = new THREE.Group(); front.position.z = D * 0.25; group.add(front);
  front.add(rb(W, H, D * 0.5, 0.45, shellMat));
  const back = new THREE.Group(); back.position.z = -D * 0.25; group.add(back);
  back.add(rb(W, H, D * 0.5, 0.45, shellMat));
  // LCD: 4 lines × 20 characters, in a dark bezel.
  const lcdTex = canvasTexture(600, 190, (g, w, h, lines = ['', '  NO NEW MESSAGES', '', ''], hi) => drawLCD(g, w, h, lines, { bg: '#a4b98c', off: 'rgba(40,60,30,.07)', hi }));
  const bezel = box(5.9, 2.35, 0.12, M.plastic(0x101217, { roughness: 0.3 })); bezel.position.set(0, 0.95, D * 0.25 + 0.03); front.add(bezel);
  const lcdMat = new THREE.MeshStandardMaterial({ map: lcdTex.tex, roughness: 0.35, emissive: new THREE.Color(0x98c070), emissiveMap: lcdTex.tex, emissiveIntensity: 0.15 });
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.74), lcdMat); lcd.position.set(0, 0.95, D * 0.25 + 0.1); front.add(lcd);
  // Buttons along the front bottom, and a status LED.
  const btnMat = M.plastic(0x4a4f5c, { roughness: 0.4 });
  const buttons = new THREE.Group(); front.add(buttons);
  [-2.2, -0.75, 0.75, 2.2].forEach((x, i) => { const b = rb(i === 0 ? 1.1 : 1.0, 0.55, 0.3, 0.12, i === 0 ? M.plastic(0x5ce1a9, { roughness: 0.4 }) : btnMat); b.position.set(x, -1.45, D * 0.25 + 0.1); buttons.add(b); });
  const ledMat = M.glow(0x3a1010);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 8), ledMat); led.position.set(2.95, 2.05, D * 0.25 + 0.05); front.add(led);
  // Belt clip on the back.
  const clip = new THREE.Group(); clip.position.z = -D * 0.5; group.add(clip);
  const clipMat = M.plastic(0x1a1c22, { roughness: 0.5 });
  const cp = box(2.2, 4.2, 0.18, clipMat); cp.position.set(0, -0.1, -0.35); clip.add(cp);
  const cb = box(2.2, 0.5, 0.4, clipMat); cb.position.set(0, 1.9, -0.15); clip.add(cb);

  // Inside.
  const inner = new THREE.Group(); group.add(inner);
  const pcb = new THREE.Group(); pcb.position.z = 0.35; inner.add(pcb);
  pcb.add(box(6.5, 4.3, 0.1, M.plastic(0x1f6b45, { roughness: 0.5 })));
  const chip = (w, h, x, y, c = 0x16181d) => { const b = box(w, h, 0.14, M.plastic(c, { roughness: 0.4 })); b.position.set(x, y, -0.12); pcb.add(b); return b; };
  const rxChip = chip(1.0, 1.0, -1.9, 0.9);          // receiver: amplifier, mixer, FSK demodulator
  const decoder = chip(1.3, 1.3, 0.4, 0.8);          // POCSAG decoder and controller
  const memory = chip(0.9, 0.6, 2.1, 1.2);
  const saw = chip(0.8, 0.45, -1.9, -0.3, 0x8c9099);  // filter
  // Crystal: a small metal can that sets the receiver's exact frequency.
  const crystal = box(1.1, 0.42, 0.34, M.metal(0xd6dbe4, { roughness: 0.2 })); crystal.position.set(-0.6, -0.4, -0.25); pcb.add(crystal);
  // Tiny parts sprinkled on the board.
  for (let k = 0; k < 26; k++) { const b = box(0.22, 0.12, 0.08, M.plastic(k % 3 ? 0x7a5a3a : 0x2b2e36)); b.position.set(-3 + ((k * 37) % 60) / 10, -1.9 + ((k * 23) % 38) / 10, -0.09); if (Math.abs(b.position.x + 1.9) > 0.7 || Math.abs(b.position.y - 0.9) > 0.7) pcb.add(b); }
  // Loop antenna: a flat copper loop running round the inside of the case.
  const loopPts = [];
  const lw = 3.25, lh = 2.2, lr = 0.35;
  [[lw - lr, lh - lr, 0], [-(lw - lr), lh - lr, Math.PI / 2], [-(lw - lr), -(lh - lr), Math.PI], [lw - lr, -(lh - lr), -Math.PI / 2]].forEach(([cx, cy, a0]) => {
    for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; loopPts.push(new THREE.Vector3(cx + Math.cos(a) * lr, cy + Math.sin(a) * lr, 0.12)); }
  });
  const antMat = M.metal(0xd98b4a, { roughness: 0.3, emissive: new THREE.Color(0xff9a3a), emissiveIntensity: 0 });
  const antenna = tube(loopPts, 0.06, antMat, true, 160); pcb.add(antenna);
  // Beeper: a piezo disc.
  const beeper = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.18, 32), M.metal(0xc9b27a, { roughness: 0.3 }));
  beeper.rotation.x = Math.PI / 2; beeper.position.set(2.2, -0.2, -0.2); pcb.add(beeper);
  // AA battery lying along X in the back half, and the vibration motor with its off-centre weight.
  const battery = new THREE.Group(); battery.position.set(-0.55, -1.2, -0.55); inner.add(battery);
  battery.add(rod(-2.5, 2.35, 0.72, 0.72, M.plastic(0x1f2330, { roughness: 0.35 })));
  const band = rod(-0.4, 2.35, 0.725, 0.725, M.plastic(0xe0a33a, { roughness: 0.35 })); battery.add(band);
  battery.add(rod(2.35, 2.5, 0.25, 0.25, M.metal(0xc8ccd4)));
  const motor = new THREE.Group(); motor.position.set(2.6, 1.3, -0.6); inner.add(motor);
  motor.add(rod(-0.6, 0.35, 0.3, 0.3, M.metal(0xb9bec8)));
  const weight = new THREE.Group(); weight.position.x = 0.5; motor.add(weight);
  const wgeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 24, 1, false, 0, Math.PI); wgeo.rotateZ(Math.PI / 2);
  const wm = new THREE.Mesh(wgeo, M.metal(0x8a8f99)); weight.add(wm);
  return { group, front, back, clip, inner, pcb, shellMat, lcd, lcdTex, lcdMat, led, ledMat, buttons, rxChip, decoder, memory, saw, crystal, antenna, antMat, beeper, battery, motor, weight, W, H, D };
}

// ------------------------------------------------------------------ a lattice radio mast with a paging antenna on top
export function makeTower(h = 6, color = 0xd0d4dc) {
  const g = new THREE.Group();
  const mat = M.metal(color, { roughness: 0.4 }), red = M.plastic(0xd64a3a);
  const w0 = h * 0.07, w1 = h * 0.025;
  const legs = [[1, 1], [-1, 1], [0, -1.2]];
  legs.forEach(([x, z]) => g.add(beam([x * w0, 0, z * w0], [x * w1, h, z * w1], h * 0.006, mat, 6)));
  const N = 8;
  for (let i = 0; i < N; i++) {
    const y0 = (i / N) * h, y1 = ((i + 1) / N) * h, k0 = w0 + (w1 - w0) * (i / N), k1 = w0 + (w1 - w0) * ((i + 1) / N);
    for (let a = 0; a < 3; a++) {
      const [x0, z0] = legs[a], [x1, z1] = legs[(a + 1) % 3];
      g.add(beam([x0 * k0, y0, z0 * k0], [x1 * k1, y1, z1 * k1], h * 0.003, i % 2 ? red : mat, 4));
    }
  }
  const ant = beam([0, h, 0], [0, h * 1.12, 0], h * 0.008, M.plastic(0xf2f2f2), 8); g.add(ant);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(h * 0.018, 12, 8), M.glow(0xff4030)); beacon.position.y = h * 1.12; g.add(beacon);
  g.userData.top = h * 1.08;
  g.beacon = beacon;
  return g;
}

// Expanding radio ring on the ground (for simulcast broadcasts).
export function makeRing(color = 0x5ce1a9) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// Board helper: a canvas-textured plane.
export function board(w, h, pxW, draw, { transparent = true } = {}) {
  const pxH = Math.round((pxW * h) / w);
  const ct = canvasTexture(pxW, pxH, draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ct.tex, transparent, toneMapped: false }));
  mesh.redraw = ct.redraw; mesh.canvas = ct.canvas;
  return mesh;
}
export function panelBg(g, W, H, title) {
  g.clearRect(0, 0, W, H);
  g.fillStyle = 'rgba(10,12,18,.92)';
  const r = 18; g.beginPath(); g.moveTo(r, 0); g.arcTo(W, 0, W, H, r); g.arcTo(W, H, 0, H, r); g.arcTo(0, H, 0, 0, r); g.arcTo(0, 0, W, 0, r); g.fill();
  if (title) { g.font = 'bold 30px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText(title, 24, 44); }
}

export { clamp, torus };
