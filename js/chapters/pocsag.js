// Chapter 3: POCSAG, the digital code. A real encoder: your text becomes 7-bit characters, then 32-bit
// codewords (21 data bits + 10 BCH check bits + 1 parity bit), placed in batches of 8 frames after a
// 576-bit preamble, and sent as two FSK tones. The pager wakes only for the sync word and its own frame.
import { THREE, M } from '../kit.js';
import { makePager, encodePage, PREAMBLE_BITS, RATES, FSK_KHZ, board, panelBg, wrap, hex } from '../pager.js';

const PRESETS = { home: 'CALL HOME', meet: 'MEET 6PM GATE 2', ward: 'DR RAO TO WARD 7 STAT', exam: 'EXAM RESULT OUT. YOU PASSED!' };
const RIC = 1234571;                                // our pager's address; 1234571 & 7 = 3, so it listens in frame 3
const COL = { flag: '#c49bff', addr: '#ffb547', func: '#ff7a59', data: '#5b8cff', bch: '#5ce1a9', par: '#ff6fae', idle: '#3a4050', sync: '#e8eef8', pre: '#8a93a6' };

export default {
  id: 'pocsag',
  short: 'The POCSAG code',
  title: 'Turning words into radio',
  subtitle: 'A page travels as a strict digital code called POCSAG: 32-bit codewords, in frames, sent as two tones.',
  view: { pos: [0.5, 11.6, 21.5], target: [0.2, 10.4, 0] },
  learn: `<p>Most pagers of the 1990s spoke a code called <b>POCSAG</b>, worked out by a group at the British Post Office from 1976 and made a world standard in <b>1981</b>. It is still used today.</p>
    <p>Your message is split into <b>characters</b>. Each one becomes a <b>7-bit</b> number (A is 1000001), sent smallest bit first. The bits are packed into <b>codewords</b> of <b>32 bits</b>: 1 flag bit, <b>20 message bits</b>, <b>10 check bits</b> for fixing errors, and 1 <b>parity</b> bit. The very first codeword is the <b>address</b>: which pager the message is for.</p>
    <p>Before any message, the tower sends a <b>preamble</b> of at least 576 bits, 1010…, like clearing its throat. Then come <b>batches</b>: a special <b>sync codeword</b>, then <b>8 frames</b> of 2 codewords each. Every pager belongs to one frame, set by the last 3 bits of its address. It wakes up for the sync word and its own frame, and <b>sleeps</b> through the other seven. That's the secret of the long battery life.</p>
    <p>The bits go out at <b>512, 1,200 or 2,400 bits per second</b> by <b>frequency shift keying</b> (FSK): the carrier moves up 4.5 kHz for a 0 and down 4.5 kHz for a 1.</p>
    <p class="tip"><b>Try it:</b> type your own message in the box under Play with it. Watch the codewords grow, and see the pager wake only in frame 3.</p>`,
  terms: [
    { t: 'POCSAG', d: 'Post Office Code Standardisation Advisory Group: the pager code made a world standard in 1981.' },
    { t: 'Codeword', d: 'A block of 32 bits: 21 bits of information, 10 check bits and 1 parity bit.' },
    { t: 'Address (RIC)', d: 'A pager\'s own 21-bit number. Its last 3 bits pick which of the 8 frames it listens in.' },
    { t: 'Preamble', d: 'At least 576 bits of 1010… that tell sleeping pagers a transmission is starting.' },
    { t: 'Batch and frame', d: 'A batch is a sync codeword plus 8 frames; each frame holds 2 codewords.' },
    { t: 'FSK', d: 'Frequency shift keying: sending 0s and 1s by switching between two nearby radio frequencies.' },
  ],
  defaults: { preset: 'meet', rate: 1200, slow: 60 },
  controls: [
    { key: 'preset', type: 'seg', label: 'Message', options: [{ v: 'home', label: 'Call home' }, { v: 'meet', label: 'Meet at 6' }, { v: 'ward', label: 'Hospital' }, { v: 'exam', label: 'Exam result' }], fmt: () => 'or type your own below' },
    { key: 'rate', type: 'seg', label: 'Bit rate', options: RATES.map((r) => ({ v: r, label: `${r.toLocaleString()} bit/s` })) },
    { key: 'slow', type: 'log', label: 'Playback speed', min: 6, max: 1200, ends: ['bit by bit', 'real time at 1,200'], fmt: (v) => `${Math.round(v)} bits a second` },
  ],
  quiz: [
    { q: 'How many bits are in one POCSAG codeword?', options: ['8', '16', '32', '64'], answer: 2, why: '21 information bits, 10 BCH check bits and 1 parity bit make 32.' },
    { q: 'How does a POCSAG pager save its battery?', options: ['It turns off the screen', 'It sleeps through the 7 frames that are not its own', 'It uses solar power', 'It only works at night'], answer: 1, why: 'Its address fixes which frame it listens in, so it can switch off its receiver for most of every batch.' },
    { q: 'In POCSAG, how is a 1 sent over the radio?', options: ['A louder signal', 'A slightly lower frequency (−4.5 kHz)', 'A short silence', 'A flash of light'], answer: 1, why: 'FSK: a 0 shifts the carrier up 4.5 kHz and a 1 shifts it down 4.5 kHz.' },
  ],
  reel: [
    { ms: 5600, caption: 'Each letter becomes 7 bits, packed into 32-bit codewords with 10 bits of error checking.', set: { preset: 'meet', rate: 1200, slow: 40 }, act: (s, inst) => inst.jump?.(0.52), view: { pos: [0, 10, 16], target: [0, 9.5, 0] }, spin: 0 },
    { ms: 5400, caption: 'Codewords go out in 8 frames. Each pager wakes only for its own frame and sleeps through the rest.', set: { preset: 'meet', rate: 1200 }, act: (s, inst) => inst.jump?.(0.5), anim: { slow: [60, 500, true] }, view: { pos: [0, 4.5, 15], target: [0, 4.2, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const st = { text: PRESETS.meet, preset: null, enc: null, bits: [], total: 0, pos: 0, rate: 1200, awake: false, got: false, awakeBits: 0 };

    // A text box on the stage for typing your own message.
    const input = document.createElement('input');
    Object.assign(input, { type: 'text', maxLength: 40, value: st.text, spellcheck: false, placeholder: 'Type a message' });
    input.setAttribute('aria-label', 'Type your own pager message');
    Object.assign(input.style, { width: '100%', boxSizing: 'border-box', padding: '9px 14px', borderRadius: '10px', border: '1px solid var(--c, #5ce1a9)', background: 'rgba(7,8,12,.6)', color: 'inherit', font: '600 15px var(--mono, monospace)', textTransform: 'uppercase', letterSpacing: '.04em' });
    // The text box lives in the side panel's controls (the panel is drawn after build, so attach lazily).
    const wrapEl = document.createElement('div'); wrapEl.className = 'ctl';
    wrapEl.innerHTML = '<div class="ctl-head"><label>Type your own message</label><output>up to 40 characters</output></div>';
    wrapEl.appendChild(input);
    const attach = () => { if (wrapEl.isConnected) return; const box = document.querySelector('#panel .controls'); if (box) box.prepend(wrapEl); };
    const rebuild = () => {
      st.enc = encodePage(RIC, st.text || ' ');
      // The full bit stream: preamble, then every codeword MSB first.
      const bits = [];
      for (let i = 0; i < PREAMBLE_BITS; i++) bits.push(i % 2 ? 0 : 1);
      st.enc.words.forEach((w) => { for (let b = 31; b >= 0; b--) bits.push((w.w >>> b) & 1); });
      st.bits = bits; st.total = bits.length; st.pos = 0; st.got = false;
      st.awakeBits = st.enc.words.reduce((a, w) => a + (w.kind === 'sync' || w.frame === st.enc.frame ? 32 : 0), 0) + 64;
      bitsBoard.redraw(); airBoard.redraw();
    };
    input.addEventListener('input', () => { st.text = input.value.toUpperCase().replace(/[^\x20-\x7e]/g, ''); rebuild(); });
    input.addEventListener('keydown', (e) => e.stopPropagation());

    // ---- Board 1: characters and codewords.
    const bitsBoard = board(17, 8.4, 1400, (g, W, H) => {
      panelBg(g, W, H, 'Your text → 7-bit characters → 32-bit codewords');
      if (!st.enc) return;
      const chars = st.enc.chars, curWord = wordAt(st.pos);
      // Characters, each with its 7 bits (smallest bit first, as sent).
      const n = Math.min(chars.length, 20), cw = 64;
      g.textAlign = 'center';
      for (let i = 0; i < n; i++) {
        const c = chars[i], x = 30 + i * cw;
        const inWord = curWord && curWord.kind === 'msg' && i >= curWord.charFrom && i <= curWord.charTo;
        g.fillStyle = inWord ? 'rgba(91,140,255,.35)' : 'rgba(255,255,255,.06)'; g.fillRect(x, 64, cw - 6, 118);
        g.fillStyle = c === 4 ? '#ff7a59' : '#e8eef8'; g.font = c === 4 ? 'bold 18px sans-serif' : 'bold 30px monospace'; g.fillText(c === 4 ? 'END' : c === 32 ? '_' : String.fromCharCode(c), x + (cw - 6) / 2, 100);
        g.font = 'bold 13px monospace'; g.fillStyle = COL.data;
        let bs = ''; for (let b = 0; b < 7; b++) bs += (c >> b) & 1;
        g.fillText(bs, x + (cw - 6) / 2, 136);
        g.fillStyle = 'rgba(232,238,248,.55)'; g.font = '14px monospace'; g.fillText(c, x + (cw - 6) / 2, 168);
      }
      g.textAlign = 'left';
      if (chars.length > 20) { g.fillStyle = 'rgba(232,238,248,.6)'; g.font = '20px sans-serif'; g.fillText(`+${chars.length - 20} more`, 30 + 20 * cw - 60, 196); }
      // Codewords: address first, then the message words.
      const rows = st.enc.words.filter((w) => w.kind === 'addr' || w.kind === 'msg').slice(0, 11);
      const cell = 28, x0 = 170, y0 = 222;
      g.font = '15px sans-serif';
      [['flag', COL.flag], ['address', COL.addr], ['function', COL.func], ['message bits', COL.data], ['BCH check bits', COL.bch], ['parity', COL.par]].forEach(([t, c], i) => { g.fillStyle = c; g.fillRect(x0 + i * 170, y0 - 22, 14, 14); g.fillStyle = '#c9d2e0'; g.fillText(t, x0 + 20 + i * 170, y0 - 10); });
      rows.forEach((w, r) => {
        const y = y0 + r * 38, cur = curWord === w;
        g.fillStyle = cur ? '#ffd166' : 'rgba(232,238,248,.75)'; g.font = `${cur ? 'bold ' : ''}20px sans-serif`;
        g.fillText(w.kind === 'addr' ? 'Address' : `Message ${r}`, 24, y + 22);
        for (let b = 31; b >= 0; b--) {
          const i = 31 - b, bit = (w.w >>> b) & 1;
          let c = i === 0 ? COL.flag : i <= 20 ? COL.data : i <= 30 ? COL.bch : COL.par;
          if (w.kind === 'addr' && i >= 1 && i <= 18) c = COL.addr;
          if (w.kind === 'addr' && (i === 19 || i === 20)) c = COL.func;
          g.globalAlpha = bit ? 1 : 0.28; g.fillStyle = c; g.fillRect(x0 + i * cell + (i > 20 ? 8 : 0) + (i > 30 ? 8 : 0), y + 2, cell - 4, 26);
          g.globalAlpha = 1; g.fillStyle = bit ? '#0a0c12' : 'rgba(232,238,248,.7)'; g.font = '16px monospace'; g.fillText(bit, x0 + i * cell + (i > 20 ? 8 : 0) + (i > 30 ? 8 : 0) + 8, y + 21);
        }
        g.fillStyle = 'rgba(232,238,248,.55)'; g.font = '16px monospace'; g.fillText(hex(w.w), x0 + 32 * cell + 30, y + 21);
        if (cur) { g.strokeStyle = '#ffd166'; g.lineWidth = 3; g.strokeRect(x0 - 4, y - 1, 32 * cell + 20, 32); }
      });
      const more = st.enc.words.filter((w) => w.kind === 'msg').length - (rows.length - 1);
      if (more > 0) { g.fillStyle = 'rgba(232,238,248,.6)'; g.font = '18px sans-serif'; g.fillText(`…and ${more} more message codeword${more > 1 ? 's' : ''}`, x0, y0 + rows.length * 38 + 16); }
    });
    bitsBoard.position.set(0, 9.5, 0); root.add(bitsBoard);

    // ---- Board 2: the transmission on air: preamble, batches, frames, and the FSK waveform.
    const airBoard = board(17, 4.6, 1400, (g, W, H) => {
      panelBg(g, W, H, '');
      if (!st.enc) return;
      g.font = 'bold 24px sans-serif'; g.fillStyle = '#e8eef8'; g.fillText(`On air at ${st.rate.toLocaleString()} bit/s: preamble, then batches of sync + 8 frames`, 24, 36);
      const x0 = 24, x1 = W - 24, y = 56, h = 64, total = st.total, X = (b) => x0 + (b / total) * (x1 - x0);
      // Preamble.
      g.fillStyle = COL.pre; g.globalAlpha = 0.5; g.fillRect(X(0), y, X(PREAMBLE_BITS) - X(0) - 2, h); g.globalAlpha = 1;
      g.fillStyle = '#0a0c12'; g.font = 'bold 17px sans-serif'; g.fillText('Preamble 1010…', X(0) + 8, y + 38);
      let bit = PREAMBLE_BITS;
      st.enc.words.forEach((w) => {
        const a = X(bit), b = X(bit + 32);
        const mine = w.kind === 'sync' || w.frame === st.enc.frame;
        g.fillStyle = COL[w.kind === 'msg' ? 'data' : w.kind === 'addr' ? 'addr' : w.kind === 'sync' ? 'sync' : 'idle'];
        g.fillRect(a, y, b - a - 1.5, h);
        if (mine) { g.fillStyle = 'rgba(92,225,169,.9)'; g.fillRect(a, y + h + 4, b - a - 1.5, 6); }
        if (w.kind !== 'sync' && w.slot % 2 === 0 && b - a > 6) { g.fillStyle = 'rgba(232,238,248,.6)'; g.font = '14px sans-serif'; g.fillText(w.frame, a + 2, y + h + 26); }
        if (w.kind === 'sync') { g.fillStyle = '#0a0c12'; g.font = 'bold 12px sans-serif'; g.save(); g.translate(a + 11, y + h - 6); g.rotate(-Math.PI / 2); g.fillText('SYNC', 0, 0); g.restore(); }
        bit += 32;
      });
      g.fillStyle = '#5ce1a9'; g.font = '15px sans-serif'; g.fillText('green bar = pager awake (sync word + its frame 3)', x1 - 360, y + h + 26);
      // Playhead.
      const px = X(st.pos); g.fillStyle = '#ffd166'; g.fillRect(px - 2, y - 6, 4, h + 20);
      // FSK waveform: 32 bits around the playhead. 0 = higher frequency, 1 = lower (drawn slower).
      const wy = 250, wh = 58, span = 32, first = Math.max(0, Math.floor(st.pos) - 16), bw = (x1 - x0) / span;
      g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1;
      for (let i = 0; i <= span; i++) { g.beginPath(); g.moveTo(x0 + i * bw, wy - wh - 26); g.lineTo(x0 + i * bw, wy + wh); g.stroke(); }
      g.strokeStyle = '#8ef0ff'; g.lineWidth = 3; g.beginPath();
      let phase = 0;
      for (let i = 0; i < span; i++) {
        const b2 = st.bits[first + i]; if (b2 === undefined) break;
        const cyc = b2 ? 1.5 : 3;      // cycles drawn per bit: the 0 tone is higher
        for (let k = 0; k <= 20; k++) {
          const xx = x0 + (i + k / 20) * bw, yy = wy - Math.sin(phase + (k / 20) * cyc * Math.PI * 2) * wh * 0.8;
          (i === 0 && k === 0) ? g.moveTo(xx, yy) : g.lineTo(xx, yy);
        }
        phase += cyc * Math.PI * 2;
        const now = first + i === Math.floor(st.pos);
        g.save(); g.fillStyle = now ? '#ffd166' : b2 ? '#ff9f7a' : '#8ef0ff'; g.font = `bold ${now ? 22 : 18}px monospace`; g.fillText(b2, x0 + i * bw + bw / 2 - 5, wy - wh - 8); g.restore();
      }
      g.stroke();
      g.fillStyle = 'rgba(232,238,248,.7)'; g.font = '16px sans-serif';
      g.fillText(`0 = carrier + ${FSK_KHZ} kHz (faster wiggle)   ·   1 = carrier − ${FSK_KHZ} kHz (slower wiggle). The real carrier is about 150 MHz; the wiggles here are only a picture of the shift.`, x0, H - 14);
    });
    airBoard.position.set(0, 2.7, 0.05); root.add(airBoard);

    // A pager beside the boards that wakes only for its frame.
    const p = makePager();
    p.group.scale.setScalar(0.42); p.group.position.set(6.2, 15.6, 0.6); p.group.rotation.y = -0.3; root.add(p.group);
    const awakeLbl = stage.label('', [3.4, 16.2, 0.6], root, 'hot');
    stage.label('Pager 1234571: frame 3', [6.2, 17.4, 0.6], root);

    function wordAt(pos) {
      if (!st.enc || pos < PREAMBLE_BITS) return null;
      return st.enc.words[Math.floor((pos - PREAMBLE_BITS) / 32)] || null;
    }

    let key = '', lcdKey = '', clock = 0;
    return {
      jump(k) { st.pos = k * st.total; },
      update(dt, s) {
        dt = Math.max(0, dt); clock += dt;
        attach();
        if (s.preset !== st.preset) { st.preset = s.preset; st.text = PRESETS[s.preset]; input.value = st.text; rebuild(); }
        st.rate = s.rate;
        st.pos += dt * s.slow;
        if (st.pos > st.total + 300) { st.pos = 0; st.got = false; }
        const w = wordAt(st.pos);
        // Awake: while hunting for the preamble / first sync, then for each sync word and its own frame.
        st.awake = st.pos < st.total && (st.pos < PREAMBLE_BITS + 32 ? st.pos > PREAMBLE_BITS - 64 : !!w && (w.kind === 'sync' || w.frame === st.enc.frame));
        const lastMsg = st.enc.words.findLastIndex((x) => x.kind === 'msg');
        if (st.pos >= PREAMBLE_BITS + (lastMsg + 1) * 32) st.got = true;
        p.ledMat.color.setHex(st.awake ? 0x5ce1a9 : 0x10261c);
        p.antMat.emissiveIntensity = st.awake ? 0.9 : 0;
        awakeLbl.element.textContent = st.awake ? 'Receiver ON' : 'Asleep';
        const lines = st.got ? ['NEW MESSAGE', ...wrap(st.text, 20, 3)] : ['', '', '', ''];
        const lk = lines.join('|'); if (lk !== lcdKey) { lcdKey = lk; p.lcdTex.redraw(lines); }
        p.lcdMat.emissiveIntensity = st.got && st.pos < PREAMBLE_BITS + (lastMsg + 1) * 32 + 160 ? 0.6 : 0.15;
        const k2 = `${Math.floor(st.pos / Math.max(1, s.slow / 20))}|${s.rate}|${st.text}`;
        if (k2 !== key) { key = k2; airBoard.redraw(); bitsBoard.redraw(); }
      },
      readout: (s) => {
        const e = st.enc; if (!e) return '';
        const n = e.chars.length - 1, secs = st.total / s.rate;
        return `<div class="big">${n} characters → ${e.msgCount} message codeword${e.msgCount > 1 ? 's' : ''}</div>
          <div class="row"><span>Codewords on air, with sync and idle</span><b>${e.words.length} × 32 bits</b></div>
          <div class="row"><span>Time on air at ${s.rate.toLocaleString()} bit/s</span><b>${secs.toFixed(2)} s</b></div>
          <div class="row"><span>Pager 1234571 awake (frame 3)</span><b class="ok">${Math.round((96 / 544) * 100)}% of each batch</b></div>`;
      },
      dispose() { wrapEl.remove(); },
    };
  },
};
