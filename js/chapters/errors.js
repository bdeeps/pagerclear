// Chapter 4: error correction. Radio noise flips bits on the way. A real BCH(31,21) decoder with an
// even-parity check repairs up to 2 wrong bits in each 32-bit codeword and flags codewords with more.
import { THREE, M, swarm } from '../kit.js';
import { makePager, makeTower, encodePage, decodePage, rng, pFail, board, panelBg, wrap } from '../pager.js';

const MSG = 'BED 12 BP FALLING. CALL NOW';
const RIC = 1234571;

export default {
  id: 'errors',
  short: 'Fixing errors',
  title: 'Noise in, message out',
  subtitle: 'Radio noise flips some bits. Ten check bits in every codeword let the pager find and fix them.',
  view: { pos: [0.5, 10.0, 17.5], target: [0.6, 8.4, 0] },
  learn: `<p>Radio is noisy. Lightning, motors, other transmitters and weak signal deep inside a building all add <b>noise</b>. Now and then noise makes the pager read a 1 as a 0, or a 0 as a 1. One wrong bit can turn a C into an A, or 2233 into 2213. In a hospital, that matters.</p>
    <p>So every codeword carries <b>10 check bits</b>, calculated from its 21 information bits using a <b>BCH code</b> (named after Bose, Chaudhuri and Hocquenghem). The pager re-does the calculation. If the answer doesn't match, the mismatch, called the <b>syndrome</b>, points to exactly which bits are wrong. POCSAG's BCH(31,21) code, plus a <b>parity</b> bit, can <b>fix up to 2 wrong bits</b> in each codeword and <b>notice</b> when there are more.</p>
    <p>If a codeword has 3 or more errors, the pager can't fix it, but it knows. Real pagers show a warning mark instead of silently showing the wrong message. Burst noise, such as a crackle of static, is the enemy: it can smash many bits in one codeword.</p>
    <p class="tip"><b>Try it:</b> turn up the noise until some rows go orange. Then switch the fixing off, and see how much worse the message gets.</p>`,
  terms: [
    { t: 'Bit error', d: 'A bit that arrives flipped: sent as 0 and read as 1, or the other way round.' },
    { t: 'Bit error rate', d: 'The fraction of bits that arrive wrong. 1 in 100 is a bit error rate of 0.01.' },
    { t: 'BCH code', d: 'A family of error-correcting codes. POCSAG uses BCH(31,21): 21 information bits protected by 10 check bits.' },
    { t: 'Syndrome', d: 'The leftover from re-checking a codeword. Zero means it looks right; anything else points to the wrong bits.' },
    { t: 'Parity bit', d: 'An extra bit that makes the number of 1s even, a quick check that catches an odd number of errors.' },
  ],
  defaults: { ber: 0.02, fix: true, burst: false, auto: true },
  controls: [
    { key: 'ber', type: 'log', label: 'Radio noise (bit error rate)', min: 0.001, max: 0.12, ends: ['clear signal', 'very noisy'], fmt: (v) => `1 bit in ${Math.round(1 / v)}` },
    { key: 'burst', type: 'toggle', label: 'Add a crackle of static', hint: 'Flips 7 bits in a row, all in one codeword.' },
    { key: 'fix', type: 'toggle', label: 'BCH error correction' },
    { key: 'auto', type: 'toggle', label: 'New noise every 3 seconds' },
    { key: 'go', type: 'buttons', label: 'Noise', items: [{ label: 'Send it again with new noise', act: (s, inst) => inst.reseed?.() }] },
  ],
  quiz: [
    { q: 'How many wrong bits can POCSAG fix in one codeword?', options: ['None', 'Up to 2', 'Up to 10', 'Any number'], answer: 1, why: 'BCH(31,21) with a parity bit has a minimum distance of 6, enough to correct 2 errors and detect more.' },
    { q: 'What happens when a codeword has 4 wrong bits?', options: ['It is fixed anyway', 'The pager knows it is damaged and can flag it', 'The pager explodes', 'Nothing is noticed'], answer: 1, why: 'Too many errors to fix, but the checks still fail, so the pager can mark that part of the message.' },
    { q: 'What do the 10 check bits do?', options: ['Store the time', 'Let the receiver find and fix wrong bits', 'Make the message louder', 'Hold the pager\'s address'], answer: 1, why: 'They are worked out from the data. Re-checking them on arrival reveals which bits were flipped.' },
  ],
  reel: [
    { ms: 5800, caption: 'Noise flips bits on the way. Ten check bits let the pager fix up to two errors in every codeword.', set: { ber: 0.035, fix: true, burst: false, auto: true }, view: { pos: [0.5, 8.2, 18], target: [0.4, 7.2, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const enc = encodePage(RIC, MSG);
    const idx = enc.words.map((w, i) => i).filter((i) => enc.words[i].kind === 'addr' || enc.words[i].kind === 'msg');
    const st = { seed: 11, rx: [], dec: null, flips: [], stats: { flipped: 0, clean: 0, fixed: 0, failed: 0 }, key: '' };

    const corrupt = (s) => {
      const R = rng(st.seed * 7919 + 1);
      const burstRow = idx[1 + (st.seed % (idx.length - 1))], burstAt = 3 + (st.seed % 20);
      st.flips = enc.words.map((w, i) => {
        let mask = 0;
        if (w.kind === 'addr' || w.kind === 'msg') {
          for (let b = 0; b < 32; b++) if (R() < s.ber) mask |= 1 << b;
          if (s.burst && i === burstRow) for (let b = burstAt; b < burstAt + 7; b++) mask |= 1 << (31 - b);
        }
        return mask >>> 0;
      });
      st.rx = enc.words.map((w, i) => (w.w ^ st.flips[i]) >>> 0);
      st.dec = decodePage(enc.words, st.rx, s.fix);
      const S = { flipped: 0, clean: 0, fixed: 0, failed: 0 };
      idx.forEach((i) => {
        const n = popc(st.flips[i]), r = st.dec.res[i];
        S.flipped += n;
        if (!n) S.clean++;
        else if (s.fix && r.ok && r.word === enc.words[i].w) S.fixed++;
        else S.failed++;
      });
      st.stats = S;
      bd.redraw();
    };
    const popc = (x) => { let n = 0; while (x) { n += x & 1; x >>>= 1; } return n; };

    const bd = board(16, 9.6, 1300, (g, W, H) => {
      panelBg(g, W, H, 'What the pager received, codeword by codeword');
      if (!st.dec) return;
      const cell = 27, x0 = 150, y0 = 108;
      g.font = '16px sans-serif';
      [['#ff5a5a', 'flipped by noise'], ['#5ce1a9', 'found and fixed'], ['#ffb547', 'too many errors: flagged']].forEach(([c, t], i) => { g.fillStyle = c; g.fillRect(x0 + i * 280, 64, 16, 16); g.fillStyle = '#c9d2e0'; g.fillText(t, x0 + 24 + i * 280, 78); });
      idx.forEach((i, r) => {
        const y = y0 + r * 44, w = enc.words[i], res = st.dec.res[i], flips = st.flips[i];
        const n = popc(flips);
        const failed = n > 0 && (!res.ok || res.word !== w.w);
        if (failed) { g.fillStyle = 'rgba(255,181,71,.18)'; g.fillRect(x0 - 8, y - 4, 32 * cell + 16, 38); }
        g.fillStyle = 'rgba(232,238,248,.8)'; g.font = '19px sans-serif';
        g.fillText(w.kind === 'addr' ? 'Address' : `Message ${r}`, 20, y + 21);
        for (let b = 31; b >= 0; b--) {
          const k = 31 - b, bit = (st.rx[i] >>> b) & 1, flipped = (flips >>> b) & 1, fixed = res.fixed.includes(b);
          const x = x0 + k * cell;
          g.fillStyle = flipped ? '#ff5a5a' : k === 0 ? 'rgba(196,155,255,.35)' : k <= 20 ? 'rgba(91,140,255,.3)' : k <= 30 ? 'rgba(92,225,169,.22)' : 'rgba(255,111,174,.3)';
          g.fillRect(x, y, cell - 4, 30);
          if (fixed && st.dec && !res.raw) { g.strokeStyle = '#5ce1a9'; g.lineWidth = 4; g.strokeRect(x + 1, y + 1, cell - 6, 28); }
          g.fillStyle = flipped ? '#fff' : 'rgba(232,238,248,.8)'; g.font = '16px monospace'; g.fillText(bit, x + 7, y + 21);
        }
        g.font = 'bold 17px sans-serif';
        const tag = !n ? ['clean', '#8a93a6'] : failed ? [res.raw ? `${n} wrong, not checked` : res.ok ? `${n} wrong: mis-fixed!` : `${n} wrong: flagged`, '#ffb547'] : [`${n} wrong: fixed`, '#5ce1a9'];
        g.fillStyle = tag[1]; g.fillText(tag[0], x0 + 32 * cell + 14, y + 21);
      });
      g.fillStyle = 'rgba(232,238,248,.55)'; g.font = '16px sans-serif';
      g.fillText('bits 1–21: flag + information · bits 22–31: BCH check bits · bit 32: parity', x0, y0 + idx.length * 44 + 18);
    });
    bd.position.set(-0.6, 5.6, 0); root.add(bd);

    // Tower on the right, noise sparks in the air, and the pager showing what it decoded.
    const tw = makeTower(13); tw.position.set(11.5, 0, -7); root.add(tw);
    const p = makePager();
    p.group.scale.setScalar(0.5); p.group.position.set(4.6, 12.6, 1.5); p.group.rotation.y = -0.25; root.add(p.group);
    stage.label('What the pager shows', [4.6, 14.4, 1.5], root, 'hot');
    const NS = 90, sparks = swarm(NS, new THREE.OctahedronGeometry(0.09), M.glow(0xff5a5a));
    root.add(sparks);
    const sp = Array.from({ length: NS }, (_, i) => ({ k: (i * 0.618) % 1, off: [(i * 37 % 10) / 10 - 0.5, (i * 53 % 10) / 10 - 0.5, (i * 71 % 10) / 10 - 0.5] }));

    let clock = 0, since = 0, lcdKey = '';
    const inst = {
      reseed() { st.seed = (st.seed * 48271 + 7) % 2147483647 || 3; st.key = ''; },
      update(dt, s, time) {
        dt = Math.max(0, dt); clock += dt; since += dt;
        if (s.auto && since > 3) { since = 0; inst.reseed(); }
        const k = `${st.seed}|${s.ber.toFixed(4)}|${s.fix}|${s.burst}`;
        if (k !== st.key) { st.key = k; corrupt(s); }
        const text = st.dec.text;
        const a = st.dec.res[idx[0]], addrOk = a.word === enc.words[idx[0]].w;
        st.missed = !addrOk;
        const lines = addrOk ? ['BED ALERT      12:40', ...wrap(text, 20, 3)] : ['', '  (NOTHING: THE', '   ADDRESS WAS LOST)', ''];
        const lk = lines.join('|');
        if (lk !== lcdKey) { lcdKey = lk; p.lcdTex.redraw(lines); }
        // Sparks drift between the tower top and the pager; more of them when noisier.
        const shown = Math.round(Math.min(NS, 6 + Math.log10(s.ber / 0.001) * 38 + (s.burst ? 20 : 0)));
        const A = new THREE.Vector3(11.5, 14, -7), B = new THREE.Vector3(5.2, 12.8, 1.5);
        sp.forEach((q, i) => {
          if (i >= shown) { sparks.place(i, [0, -50, 0], null, 0.001); return; }
          const u = (q.k + clock * 0.25) % 1;
          sparks.place(i, [A.x + (B.x - A.x) * u + q.off[0] * 2.4, A.y + (B.y - A.y) * u + q.off[1] * 1.6 + Math.sin(clock * 9 + i) * 0.2, A.z + (B.z - A.z) * u + q.off[2] * 2.4], [clock * 3, i, 0], 1);
        });
        sparks.done();
      },
      readout: (s) => {
        const S = st.stats, ok = S.failed === 0;
        return `<div class="big">${st.missed ? 'Address damaged: page missed' : ok ? 'Message arrived intact' : 'Part of the message damaged'}</div>
          <div class="row"><span>Bits flipped by noise</span><b>${S.flipped} of ${idx.length * 32}</b></div>
          <div class="row"><span>Codewords: clean / fixed / flagged</span><b>${S.clean} / ${S.fixed} / <span class="${S.failed ? 'no' : 'ok'}">${S.failed}</span></b></div>
          <div class="row"><span>Chance a codeword is beyond repair</span><b>${(pFail(s.ber) * 100).toFixed(pFail(s.ber) < 0.01 ? 2 : 1)}%</b></div>
          <div class="row"><span>Without correction, any error spoils it</span><b>${((1 - Math.pow(1 - s.ber, 32)) * 100).toFixed(1)}%</b></div>
          <small>Real BCH(31,21) decoding plus the even-parity bit: up to 2 errors fixed per codeword, 3 detected.${s.fix ? '' : ' Correction is off.'}</small>`;
      },
    };
    return inst;
  },
};
