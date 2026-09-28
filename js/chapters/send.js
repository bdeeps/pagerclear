// Chapter 2: sending a page. A caller phones the paging centre, the message is queued, and tall
// towers across a city all broadcast it at the same moment (simulcast). Coverage circles come from
// the Okumura–Hata urban path-loss model with a stated link budget (see pager.js). 1 unit = 1 km.
import { THREE, M, box, beam, canvasTexture, swarm } from '../kit.js';
import { makeTower, makeRing, coverageKm, horizonKm, board, panelBg, rng, wrap, drawLCD, TAU } from '../pager.js';

const CITY = 36;                                   // the map is 36 km across
const SITES = [[0, 0], [-10, -8], [10, 8], [-9, 10], [11, -9]];
const CYCLE = 12;                                  // seconds for one page, slowed down
const STEPS = [
  [0, 'Caller dials the paging centre'],
  [1.6, 'Operator types it / keypad tones read'],
  [4.0, 'Paging terminal queues it'],
  [5.4, 'Sent to every tower at once'],
  [6.4, 'All towers broadcast together'],
  [8.6, 'Only pager 4721 answers: beep!'],
];

export default {
  id: 'send',
  short: 'Sending a page',
  title: 'One message, a whole city',
  subtitle: 'You phone a paging centre. Tall towers across the city shout your message, and only one pager listens.',
  view: { pos: [12, 25, 33], target: [-6, 1, -3] },
  learn: `<p>To page someone in the 1990s, you picked up an ordinary phone and dialled the <b>paging centre</b>. There were two ways to leave a message. You could speak to an <b>operator</b>, who typed your words into a computer. Or, on a numeric service, you tapped your phone number on the keypad, and the centre read the <b>DTMF tones</b>, the beeps each key makes (see TelephoneClear).</p>
    <p>The <b>paging terminal</b> put the message in a <b>queue</b> with everyone else's, turned it into a digital code, and sent it to a set of tall <b>transmitter towers</b>. Every tower broadcasts the same signal at the <b>same instant</b>. This is called <b>simulcast</b>. Where two towers overlap, their signals arrive in step, so they add up instead of fighting.</p>
    <p>Every pager in the city hears every message. Each one checks the <b>address</b> at the start, and ignores anything that isn't its own. Only the right pager beeps.</p>
    <p>A pager is <b>one-way</b>. It never transmits, so the network doesn't know where you are. That's why the whole city gets every message. A mobile phone keeps telling the network where it is, so calls go only to the nearest tower (see MobileClear). Radio waves themselves are covered in WaveClear.</p>
    <p class="tip"><b>Try it:</b> switch to "inside buildings" and drop the power. Watch the coverage shrink and pagers go dark. Then add more towers.</p>`,
  terms: [
    { t: 'Paging centre', d: 'The office and computers that take messages by phone and send them out over the radio.' },
    { t: 'DTMF', d: 'Dual-tone multi-frequency: the pair of tones each phone key makes, which machines can read as digits.' },
    { t: 'Simulcast', d: 'Several transmitters sending exactly the same signal at the same moment, so they cover a wider area together.' },
    { t: 'One-way paging', d: 'The network talks and the pager only listens. It cannot reply or say where it is.' },
    { t: 'Coverage', d: 'The area where the signal is strong enough for a pager to read it.' },
  ],
  defaults: { method: 'operator', towers: 3, power: 100, height: 40, indoor: true, run: true },
  controls: [
    { key: 'method', type: 'seg', label: 'How the caller leaves the message', options: [{ v: 'operator', label: 'Tell an operator' }, { v: 'dtmf', label: 'Key in numbers' }], fmt: (v) => (v === 'operator' ? 'words typed for you' : 'digits read from keypad tones') },
    { key: 'towers', type: 'seg', label: 'Towers in the simulcast', options: [{ v: 1, label: '1' }, { v: 3, label: '3' }, { v: 5, label: '5' }] },
    { key: 'power', type: 'log', label: 'Transmitter power', min: 20, max: 500, fmt: (v) => `${Math.round(v)} W` },
    { key: 'height', type: 'range', label: 'Tower height', min: 20, max: 150, step: 5, fmt: (v) => `${v} m` },
    { key: 'indoor', type: 'toggle', label: 'Pagers inside buildings', hint: 'Walls and floors cost about 15 dB of signal at these frequencies.' },
    { key: 'run', type: 'toggle', label: 'Send pages' },
  ],
  quiz: [
    { q: 'Why does every tower broadcast every page?', options: ['To waste power', 'A one-way pager never says where it is, so the network must call everywhere', 'Because pagers are very weak', 'It is a legal rule'], answer: 1, why: 'The network has no idea where you are, so it sends the page over the whole area.' },
    { q: 'What is simulcast?', options: ['Two different messages at once', 'Several towers sending the same signal at the same moment', 'A pager with two screens', 'Sending by satellite only'], answer: 1, why: 'The towers are synchronised so their signals arrive in step and add up where they overlap.' },
    { q: 'All pagers hear a page. Why does only one beep?', options: ['The others are switched off', 'Each pager checks the address and ignores other addresses', 'The towers aim at one pager', 'Luck'], answer: 1, why: 'The message starts with an address. A pager only wakes you up if the address matches its own.' },
  ],
  reel: [
    { ms: 5400, caption: 'You phone the paging centre, and your message joins a queue.', set: { method: 'operator', towers: 3, power: 100, height: 40, indoor: true, run: true }, act: (s, inst) => inst.restart?.(0), view: { pos: [6, 16, 22], target: [-9, 1, -3] }, spin: 0 },
    { ms: 5600, caption: 'Tall towers shout it across the whole city at the same instant. Only one pager answers.', set: { towers: 5, run: true }, act: (s, inst) => inst.restart?.(5.6), view: { pos: [14, 27, 34], target: [0, 1, -1] }, spin: 0.25 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // Ground: a city map drawn on a canvas.
    const R = rng(42);
    const mapTex = canvasTexture(1024, 1024, (g, W, H) => {
      g.fillStyle = '#1a1f29'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#2b3342'; g.lineWidth = 3;
      for (let i = 0; i <= 24; i++) { const x = (i / 24) * W; g.beginPath(); g.moveTo(x + Math.sin(i) * 20, 0); g.lineTo(x - Math.sin(i) * 20, H); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(W, x + Math.cos(i) * 20); g.stroke(); }
      g.strokeStyle = '#3d4658'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(0, H * 0.3); g.lineTo(W, H * 0.7); g.stroke();
      g.beginPath(); g.moveTo(W * 0.35, 0); g.lineTo(W * 0.6, H); g.stroke();
      g.strokeStyle = '#1f4a6e'; g.lineWidth = 34; g.beginPath(); g.moveTo(0, H * 0.82);
      for (let x = 0; x <= W; x += 32) g.lineTo(x, H * 0.82 + Math.sin(x / 90) * 40 - x * 0.12);
      g.stroke();
      g.fillStyle = '#1f3526'; [[0.15, 0.2], [0.75, 0.25], [0.55, 0.5]].forEach(([x, y]) => { g.beginPath(); g.arc(x * W, y * H, 38, 0, TAU); g.fill(); });
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY, CITY), new THREE.MeshStandardMaterial({ map: mapTex.tex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.01; ground.receiveShadow = true; root.add(ground);
    // Buildings: denser and taller in the middle.
    const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
    const NB = 420, blds = swarm(NB, bGeo, M.plastic(0x5a6272, { roughness: 0.7 }));
    for (let i = 0; i < NB; i++) {
      const r = Math.pow(R(), 0.8) * CITY * 0.47, a = R() * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r;
      const h = 0.15 + R() * (r < 6 ? 1.6 : 0.5);
      blds.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R(), 0)), new THREE.Vector3(0.35 + R() * 0.4, h, 0.35 + R() * 0.4)));
    }
    blds.done(); root.add(blds);

    // Paging centre, with the caller's phone line coming in.
    const centre = new THREE.Group(); centre.position.set(-14, 0, -2); root.add(centre);
    const cb = box(2.2, 1.4, 1.6, M.plastic(0x3b82f6, { roughness: 0.4 })); cb.position.y = 0.7; centre.add(cb);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, TAU, 0, Math.PI / 2.4), M.metal(0xe0e4ea)); dish.rotation.x = -1.1; dish.position.set(0.4, 1.8, 0); centre.add(dish);
    stage.label('Paging centre', [0, 2.8, 0], centre, 'hot');
    const caller = new THREE.Group(); caller.position.set(-16, 0, 12); root.add(caller);
    const house = box(1.2, 0.9, 1.2, M.plastic(0xe0a33a)); house.position.y = 0.45; caller.add(house);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.7, 4), M.plastic(0x9a4a2a)); roof.position.y = 1.25; roof.rotation.y = Math.PI / 4; caller.add(roof);
    stage.label('Caller on a landline', [0, 2.2, 0], caller);
    const phoneLine = beam([-16, 0.12, 12], [-14, 0.12, -2], 0.06, M.plastic(0x8a93a6)); root.add(phoneLine);
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 10), M.glow(0xffd166)); root.add(pulse);

    // Towers, feed links from the centre, and broadcast rings.
    const towers = SITES.map(([x, z], i) => {
      const tw = makeTower(6); tw.position.set(x, 0, z); root.add(tw);
      const feed = beam([-14, 1.8, -2], [x, 6, z], 0.04, M.ghost(0x8ef0ff, 0.35)); root.add(feed);
      const cov = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: 0x5ce1a9, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }));
      cov.rotation.x = -Math.PI / 2; cov.position.set(x, 0.03 + i * 0.002, z); root.add(cov);
      const edge = makeRing(0x5ce1a9); edge.material.opacity = 0.5; edge.position.set(x, 0.05, z); root.add(edge);
      const rings = [0, 1, 2].map(() => { const r = makeRing(0xffd166); r.position.set(x, 0.08, z); root.add(r); return r; });
      const fp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8), M.glow(0x8ef0ff)); root.add(fp);
      return { tw, feed, cov, edge, rings, fp, x, z };
    });
    stage.label('Simulcast towers', [SITES[1][0], 7, SITES[1][1]], root);

    // Pagers scattered round the city: small dots. Number 0 is "pager 4721".
    const NP = 70, pagers = [];
    const pGeo = new THREE.SphereGeometry(0.28, 12, 8);
    const pMesh = new THREE.InstancedMesh(pGeo, new THREE.MeshBasicMaterial({ toneMapped: false }), NP);
    for (let i = 0; i < NP; i++) {
      const r = i === 0 ? 9 : Math.sqrt(R()) * CITY * 0.46, a = i === 0 ? 2.2 : R() * TAU;
      pagers.push({ x: Math.cos(a) * r, z: Math.sin(a) * r });
    }
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    pagers.forEach((p, i) => { m4.makeTranslation(p.x, 0.5, p.z); pMesh.setMatrixAt(i, m4); pMesh.setColorAt(i, col.set(0x8a93a6)); });
    root.add(pMesh);
    const target = pagers[0];
    const targetLbl = stage.label('Pager 4721', [target.x, 2.4, target.z], root, 'hot');
    const beepRing = makeRing(0xff5a5a); beepRing.position.set(target.x, 0.1, target.z); root.add(beepRing);

    // Status board: the steps and the queue, standing at the back left.
    const st = { t: 0, method: 'operator' };
    const QUEUE = ['0913  CALL HOME', '2208  MEETING MOVED TO 4PM', '4721  ', '1187  PICK UP MEDICINES', '6650  URGENT: CALL 2233 4455'];
    const sb = board(13, 7.3, 1000, (g, W, H) => {
      panelBg(g, W, H, 'Paging centre');
      const msg = st.method === 'operator' ? 'PLS CALL SUNIL AT OFFICE' : 'CALLBACK 2233 4455';
      STEPS.forEach(([t0, txt], i) => {
        const on = st.t >= t0, now = on && (i === STEPS.length - 1 || st.t < STEPS[i + 1][0]);
        g.fillStyle = now ? '#ffd166' : on ? '#5ce1a9' : 'rgba(232,238,248,.35)';
        g.font = `${now ? 'bold ' : ''}28px sans-serif`;
        let t = txt;
        if (i === 1) t = st.method === 'operator' ? 'Operator types the words' : 'Centre reads keypad tones (DTMF)';
        g.fillText(`${i + 1}. ${t}`, 30, 100 + i * 44);
      });
      g.fillStyle = 'rgba(232,238,248,.7)'; g.font = 'bold 24px sans-serif'; g.fillText('Queue (address, message)', 30, 390);
      g.font = '24px monospace';
      QUEUE.forEach((q, i) => {
        const mine = q.startsWith('4721'), sent = mine && st.t >= 5.4;
        g.fillStyle = mine ? (sent ? '#5ce1a9' : '#ffd166') : 'rgba(232,238,248,.55)';
        const text = mine ? (st.t >= 4 ? '4721  ' + msg : '4721  (typing...)') : q;
        g.fillText((sent ? '> ' : '  ') + text.slice(0, 34), 30, 428 + i * 32);
      });
    });
    sb.position.set(12, 5.6, -16); sb.rotation.y = -0.3; root.add(sb);
    // The target pager's screen, floating above it.
    const lcd = board(5.2, 1.7, 480, (g, W, H, lines = ['', '', '', '']) => drawLCD(g, W, H, lines, { bg: '#a4b98c', off: 'rgba(40,60,30,.07)', pad: 12 }));
    lcd.position.set(target.x, 4.6, target.z); root.add(lcd);

    let t = 0, clock = 0, key = '', lcdKey = '';
    const cov = { r: 0, pct: 0, horizon: 0, reach: 0 };
    const inst = {
      restart(t0 = 0) { t = t0; },
      update(dt, s) {
        dt = Math.max(0, dt); clock += dt;
        if (s.run) t = (t + dt) % CYCLE;
        st.t = t; st.method = s.method;
        lcd.quaternion.copy(stage.camera.quaternion);
        // Coverage from the link budget, capped by the radio horizon.
        cov.horizon = horizonKm(s.height);
        cov.raw = coverageKm(s.power, s.height, s.indoor);
        cov.r = Math.min(cov.raw, cov.horizon, 20);             // Hata is only valid to about 20 km
        const active = towers.map((tw, i) => i < s.towers);
        towers.forEach((tw, i) => {
          const on = active[i];
          tw.tw.visible = tw.feed.visible = tw.cov.visible = tw.edge.visible = on;
          tw.cov.scale.setScalar(cov.r); tw.edge.scale.setScalar(cov.r);
          // Feed pulse from the centre to each tower (5.4–6.4 s), then broadcast rings (6.4 s on).
          const kf = (t - 5.4) / 1.0;
          tw.fp.visible = on && kf > 0 && kf < 1;
          if (tw.fp.visible) tw.fp.position.set(-14 + (tw.x + 14) * kf, 1.8 + 4.2 * kf, -2 + (tw.z + 2) * kf);
          tw.rings.forEach((rg, j) => {
            const kr = (t - 6.4 - j * 0.45) / 2.2;
            rg.visible = on && kr > 0 && kr < 1;
            if (rg.visible) { rg.scale.setScalar(0.3 + kr * cov.r); rg.material.opacity = 0.7 * (1 - kr); }
          });
          tw.tw.beacon.material.color.setHex(Math.sin(clock * 3 + i) > 0.6 ? 0xff4030 : 0x501010);
        });
        // Which pagers can hear?
        let heard = 0;
        pagers.forEach((p, i) => {
          const ok = towers.some((tw, k) => active[k] && Math.hypot(p.x - tw.x, p.z - tw.z) <= cov.r);
          p.ok = ok; if (ok) heard++;
          const flash = ok && t > 6.8 && t < 8.4 && ((i * 7) % 5) / 5 < (t - 6.8) / 1.6;
          let c = ok ? 0x5ce1a9 : 0x3a3f4c;
          if (flash && i !== 0) c = 0xb8ffe6;
          if (i === 0) c = !ok ? 0x6a3030 : t > 8.6 ? (Math.sin(clock * 20) > 0 ? 0xff5a5a : 0xffd166) : 0xffd166;
          pMesh.setColorAt(i, col.set(c));
        });
        pMesh.instanceColor.needsUpdate = true;
        cov.pct = Math.round((heard / NP) * 100);
        cov.reach = target.ok;
        // Caller's phone pulse (0–1.6 s).
        const kp = t / 1.6; pulse.visible = kp < 1;
        if (pulse.visible) pulse.position.set(-16 + 2 * kp, 0.5, 12 - 14 * kp);
        const kb = (t - 8.6) / 1.4;
        beepRing.visible = target.ok && kb > 0 && kb < 3;
        if (beepRing.visible) { const f = kb % 1; beepRing.scale.setScalar(0.5 + f * 2.5); beepRing.material.opacity = 0.9 * (1 - f); }
        const msg = s.method === 'operator' ? 'PLS CALL SUNIL AT OFFICE' : 'CALLBACK 2233 4455';
        const lines = t > 8.6 && target.ok ? ['NEW MESSAGE   12:05', ...wrap(msg, 20, 3)] : ['', target.ok ? '  WAITING...' : '  OUT OF RANGE', '', ''];
        const lk = lines.join('|'); if (lk !== lcdKey) { lcdKey = lk; lcd.redraw(lines); }
        targetLbl.element.textContent = target.ok ? 'Pager 4721' : 'Pager 4721: no signal';
        const k2 = `${Math.floor(t * 4)}|${s.method}`;
        if (k2 !== key) { key = k2; sb.redraw(); }
      },
      readout: (s) => `<div class="big">Coverage: ${cov.r >= 20 ? 'over 20' : cov.r.toFixed(1)} km per tower</div>
        <div class="row"><span>Pagers that can hear</span><b class="${cov.pct > 90 ? 'ok' : 'no'}">${cov.pct}%</b></div>
        <div class="row"><span>Radio horizon at ${s.height} m</span><b>${cov.horizon.toFixed(0)} km</b></div>
        <div class="row"><span>Pager 4721 reached?</span><b class="${cov.reach ? 'ok' : 'no'}">${cov.reach ? 'yes' : 'no'}</b></div>
        <div class="row"><span>Pager replies to the network</span><b>never</b></div>
        <small>Okumura–Hata urban model at 153 MHz: ${Math.round(s.power)} W, pager sensitivity −110 dBm, 10 dB margin${s.indoor ? ', 15 dB building loss' : ''}. A model, not a survey.</small>`,
    };
    return inst;
  },
};
