// Chapter 5: why pagers lasted. Battery life from the POCSAG duty cycle (see pager.js for the current
// draws, which are stated model assumptions checked against makers' figures), compared with phones,
// plus why hospitals and emergency services still carry pagers.
import { THREE, M, box } from '../kit.js';
import { makePager, pagerLife, dutyCycle, PHONES, RATES, board, panelBg, BAT } from '../pager.js';

const DAY_S = 0.25;                                  // one simulated day passes every 0.25 s

export default {
  id: 'lasted',
  short: 'Why pagers lasted',
  title: 'Months on one AA battery',
  subtitle: 'A pager sleeps most of the time, never transmits, and hears signals deep inside buildings.',
  view: { pos: [0.9, 7.2, 18.6], target: [0.7, 5.2, 0] },
  learn: `<p>A 1990s mobile phone needed charging every few days. A pager ran for <b>weeks or months</b> on one <b>AA battery</b>. Three reasons:</p>
    <p><b>1. It sleeps.</b> In POCSAG, a pager only needs the sync word and its own frame: 3 codewords out of every 17. So its radio is off about <b>80%</b> of the time. The clock and screen sip almost nothing. (For how a battery stores energy, see CurrentClear.)</p>
    <p><b>2. It never talks back.</b> Sending radio takes far more power than listening. A phone must keep telling towers where it is. A one-way pager never transmits at all.</p>
    <p><b>3. Strong, low-frequency signals.</b> Paging uses powerful transmitters on tall towers, often around <b>150 MHz</b>, and every tower sends every page (simulcast). Lower frequencies get through walls and floors better, and a pager only needs to hear, not be heard. So pagers often work in basements and lift lobbies where phones struggle.</p>
    <p>That's why many <b>hospitals</b> and <b>fire and emergency crews</b> still use them. In 2017 the NHS in England was reported to use about <b>130,000 pagers</b>, and a US survey found most hospital doctors were still given one. England told hospitals to phase them out by 2021, but kept some for emergencies such as a Wi-Fi failure.</p>
    <p class="tip"><b>Try it:</b> switch battery saving off and watch the battery life drop. Then crank up the pages per day.</p>`,
  terms: [
    { t: 'Duty cycle', d: 'The fraction of time something is switched on. A pager\'s receiver is on about 20% of the time.' },
    { t: 'Battery saving', d: 'Switching the receiver off whenever no message for this pager can arrive.' },
    { t: 'mAh', d: 'Milliamp-hours: how much charge a battery holds. An AA alkaline cell holds roughly 2,500 mAh.' },
    { t: 'Building penetration', d: 'How well a radio signal gets through walls, floors and windows into a building.' },
  ],
  defaults: { rate: 1200, pages: 10, save: true },
  controls: [
    { key: 'save', type: 'toggle', label: 'Battery saving (sleep between frames)' },
    { key: 'rate', type: 'seg', label: 'Bit rate', options: RATES.map((r) => ({ v: r, label: `${r.toLocaleString()} bit/s` })) },
    { key: 'pages', type: 'range', label: 'Pages received a day', min: 0, max: 60, step: 1, fmt: (v) => `${v}` },
  ],
  quiz: [
    { q: 'What is the main reason a pager battery lasts so long?', options: ['Its battery is huge', 'The receiver sleeps except in its own frame, and it never transmits', 'It charges from radio waves', 'The screen is small'], answer: 1, why: 'Sleeping about 80% of the time, and never transmitting, keeps the average current around 1 mA.' },
    { q: 'Why do some hospitals still use pagers?', options: ['They are fashionable', 'Signals reach deep inside buildings and the network is simple and dependable', 'Phones are banned', 'Pagers can take photos'], answer: 1, why: 'Strong paging signals get into basements and wards, and alerts still arrive when Wi-Fi or mobile networks are busy or down.' },
    { q: 'Why does a phone use more power than a pager on standby?', options: ['It has to keep telling the network where it is', 'It has a colour screen only', 'It is heavier', 'It uses more buttons'], answer: 0, why: 'Transmitting takes far more power than listening, and a phone must check in with towers regularly.' },
  ],
  reel: [
    { ms: 5600, caption: 'Asleep 80% of the time and never transmitting, a pager ran for months on one AA cell.', set: { save: true, rate: 1200, pages: 10 }, view: { pos: [1.5, 7, 22], target: [0.6, 4.6, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // Left: the pager and a big AA cell whose charge drains day by day.
    const p = makePager(); p.group.scale.setScalar(0.55); p.group.position.set(-7.0, 3.0, 1); p.group.rotation.y = 0.35; root.add(p.group);
    p.lcdTex.redraw(['', '  STANDBY', '', '']);
    const cell = new THREE.Group(); cell.position.set(-3.9, 0.3, 1.2); root.add(cell);
    const vcyl = (r, h, mat, y0) => { const g = new THREE.CylinderGeometry(r, r, h, 40); g.translate(0, h / 2, 0); const m = new THREE.Mesh(g, mat); m.position.y = y0; m.castShadow = true; cell.add(m); return m; };
    vcyl(0.9, 5, M.clear(0xcfe8ff, 0.22), 0);
    const fill = vcyl(0.8, 1, M.plastic(0x5ce1a9, { roughness: 0.35 }), 0.05);
    vcyl(0.35, 0.25, M.metal(0xc8ccd4), 5);
    const cellLbl = stage.label('', [0, -0.7, 1.0], cell, 'hot');
    stage.label('Pager on one AA', [-7.0, 1.0, 1.5], root);
    // A slab phone with its own battery gauge, draining quickly.
    const phone = new THREE.Group(); phone.position.set(-0.7, 0.3, 1.8); root.add(phone);
    const body = box(1.5, 3.0, 0.3, M.plastic(0x2b2f3a)); body.position.y = 1.6; phone.add(body);
    const scr = box(1.2, 1.1, 0.02, M.glow(0x8ef0ff)); scr.position.set(0, 2.35, 0.16); phone.add(scr);
    const pgauge = box(0.3, 1, 0.3, M.plastic(0xffb547)); phone.add(pgauge);
    const phoneLbl = stage.label('', [0.2, 3.7, 0], phone);

    // Right, top: battery life chart. Right, bottom: the receiver's on/off timeline over three batches.
    const st = { life: null, s: null };
    const chart = board(8.6, 4.64, 1000, (g, W, H) => {
      panelBg(g, W, H, 'Days on one charge or battery');
      if (!st.life) return;
      const s = st.s, on = pagerLife(s.rate, s.pages, true), off = pagerLife(s.rate, s.pages, false);
      const rows = [
        ['Pager, battery saving', on.days, '#5ce1a9', s.save],
        ['Pager, radio always on', off.days, '#ffb547', !s.save],
        [PHONES.nokia.name, PHONES.nokia.days, '#5b8cff', false],
        [PHONES.smart.name, PHONES.smart.days, '#c49bff', false],
      ];
      const max = 120, x0 = 300, x1 = W - 90;
      rows.forEach(([name, d, c, hl], i) => {
        const y = 90 + i * 104;
        g.fillStyle = hl ? '#fff' : 'rgba(232,238,248,.8)'; g.font = `${hl ? 'bold ' : ''}24px sans-serif`;
        g.fillText(name, 24, y + 36);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x0, y + 8, x1 - x0, 44);
        g.fillStyle = c; g.fillRect(x0, y + 8, Math.max(4, (x1 - x0) * Math.min(1, d / max)), 44);
        g.fillStyle = '#e8eef8'; g.font = 'bold 24px sans-serif';
        g.fillText(d >= 2 ? `${Math.round(d)} days` : `${Math.round(d * 24)} hours`, Math.min(x1 - 110, x0 + (x1 - x0) * Math.min(1, d / max) + 10), y + 38);
      });
      g.fillStyle = 'rgba(232,238,248,.55)'; g.font = '18px sans-serif';
      g.fillText('Pager: model with 5 mA awake, 0.1 mA asleep, 2,500 mAh AA. 1998 phone: maker\'s standby figure.', 24, H - 20);
    });
    chart.position.set(6.4, 7.6, 0); root.add(chart);
    const strip = board(8.6, 2.24, 1000, (g, W, H) => {
      panelBg(g, W, H, 'Receiver on (green) during 3 batches');
      if (!st.s) return;
      const x0 = 24, x1 = W - 24, y = 80, h = 60, seg = (x1 - x0) / 51;
      for (let b = 0; b < 3; b++) for (let k = 0; k < 17; k++) {
        const x = x0 + (b * 17 + k) * seg, awake = !st.s.save || k === 0 || k === 7 || k === 8;
        g.fillStyle = k === 0 ? '#e8eef8' : 'rgba(91,140,255,.35)'; g.fillRect(x, y, seg - 2, h);
        if (awake) { g.fillStyle = '#5ce1a9'; g.fillRect(x, y + h + 8, seg - 2, 14); }
      }
      g.fillStyle = 'rgba(232,238,248,.7)'; g.font = '18px sans-serif';
      g.fillText(`White: sync word. This pager listens in frame 3. Awake ${Math.round(dutyCycle(st.s.rate, st.s.save) * 100)}% of the time.`, x0, H - 18);
    });
    strip.position.set(6.4, 3.6, 0); root.add(strip);

    let day = 0, key = '', clock = 0;
    return {
      update(dt, s) {
        dt = Math.max(0, dt); clock += dt;
        st.s = s; st.life = pagerLife(s.rate, s.pages, s.save);
        day += dt / DAY_S;
        const cycle = Math.max(st.life.days, 5);
        if (day > cycle + 4) day = 0;
        const left = Math.max(0, 1 - day / st.life.days);
        fill.scale.y = Math.max(0.001, left) * 4.9;
        fill.material.color.setHex(left > 0.25 ? 0x5ce1a9 : left > 0 ? 0xffb547 : 0x3a3f4c);
        cellLbl.element.textContent = left > 0 ? `Day ${Math.floor(day)}: ${Math.round(left * 100)}% left` : `Flat after ${Math.round(st.life.days)} days`;
        // The phone lasts about 11 days on standby: it goes flat and is recharged, again and again.
        const ph = 1 - ((day % PHONES.nokia.days) / PHONES.nokia.days);
        pgauge.scale.y = Math.max(0.02, ph) * 2.6; pgauge.position.set(1.1, 0.3 + pgauge.scale.y / 2, 0);
        phoneLbl.element.textContent = `1998 phone: charged ${Math.floor(day / PHONES.nokia.days)} times`;
        p.ledMat.color.setHex((clock * 2.35) % 1 < dutyCycle(s.rate, s.save) ? 0x5ce1a9 : 0x10261c);
        const k = `${s.rate}|${s.pages}|${s.save}`;
        if (k !== key) { key = k; chart.redraw(); strip.redraw(); }
      },
      readout: (s) => {
        const L = pagerLife(s.rate, s.pages, s.save);
        return `<div class="big">About ${Math.round(L.days)} days on one AA</div>
          <div class="row"><span>Receiver on</span><b>${Math.round(L.duty * 100)}% of the time</b></div>
          <div class="row"><span>Average current</span><b>${L.mA.toFixed(2)} mA</b></div>
          <div class="row"><span>1998 mobile on standby</span><b>about ${Math.round(PHONES.nokia.days)} days</b></div>
          <div class="row"><span>Transmits?</span><b class="ok">never</b></div>
          <small>A model: ${BAT.awake} mA awake, ${BAT.asleep} mA asleep, ${BAT.alertMa} mA for ${BAT.alertS} s per alert, ${BAT.mAh.toLocaleString()} mAh cell. Makers quote about 1 to 4 months.</small>`;
      },
    };
  },
};
