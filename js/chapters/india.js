// Chapter 6: India's pager years, about 1995–2002. A desk of the era (landline, pager, PCO sign), a chart
// of reported subscriber numbers, and a message-cost calculator using the era's published tariffs.
// Sources: The Indian Techonomist (R. A. Ghosh), 15 May 1996; Voice&Data, "Paging" (1999); ThePrint,
// "Beep. Play. Repeat" (2019); Business Today, "1995: Mobile services come calling"; Telecom Disputes
// Settlement tribunal order, Indian Paging Service Association v. Union of India (2005).
import { THREE, M, box, canvasTexture } from '../kit.js';
import { makePager, board, panelBg, wrap } from '../pager.js';

const RS_PER_USD = 35;                               // roughly ₹35 to the US dollar in 1996
// DoT capped pager rental at "under $5 per month for unlimited use", later raised to $8 (Techonomist 1996).
const RENT = { low: 5 * RS_PER_USD, high: 8 * RS_PER_USD };
// Early mobile calls: ₹16.80 a minute at peak, ₹8.40 off-peak, and incoming calls were charged too.
const MOBILE = { peak: 16.8, off: 8.4 };
const LOCAL_CALL = 1;                                // a local call cost about ₹1 (varied by city and year)
const SUBS = [                                       // reported pager subscribers in India
  { t: 'May 1996', v: 2.0, src: 'Techonomist' },
  { t: 'Mar 1998', v: 8.33, src: 'Voice&Data' },
  { t: 'Mar 1999', v: 6.7, src: 'Voice&Data' },
  { t: '2002', v: 5.0, src: 'ThePrint' },
];
const MSGS = ['PLS CALL PAPA AT SHOP 2233 4455', 'TRAIN LATE. REACHING 9PM - AMMA', 'CLIENT MEETING SHIFTED TO 3PM', 'RESULT OUT. FIRST CLASS! CALL'];
const rs = (v) => '₹' + Math.round(v).toLocaleString('en-IN');

export default {
  id: 'india',
  short: "India's pager years",
  title: "India's pager years",
  subtitle: 'For a few years in the late 1990s, a beeping belt pager was how India\'s cities stayed in touch on the move.',
  view: { pos: [1.0, 7.0, 19.6], target: [0.8, 4.8, 0] },
  learn: `<p>India's government auctioned <b>paging licences</b> for <b>27 cities</b> in 1992, and after years of disputes the first licensed service began in <b>1995</b>. It took off fast. By May 1996 there were reported to be about <b>2 lakh</b> subscribers, and one 1996 report called India arguably the fastest-growing pager market in the world.</p>
    <p>Why? In the 1990s a home <b>landline</b> could take months to get. Mobile phones arrived in 1995 too, but calls cost about <b>₹16.80 a minute</b>, and you paid even to <b>receive</b> a call. A pager cost a few thousand rupees and a flat monthly rent that the government capped at <b>under $5</b>, about ₹175 then.</p>
    <p>Unlike the US and Japan, where people sent <b>numeric codes</b> (143 for "I love you" in the US, 14106 for "aishiteru", I love you, in Japan), India overwhelmingly bought <b>alphanumeric</b> pagers: more than 95% by one 1996 report. You rang an <b>operator</b>, dictated a short message, and read it on the screen. People learned to write short and telegraphic: "PLS CALL", "URGENT", "REACHING 9PM". Then you found the nearest <b>STD/PCO booth</b> to call back.</p>
    <p>The boom was short. Subscribers peaked at around <b>8 lakh</b> in 1998 by one count (some reports say more), and fell as mobile calls got cheaper and SMS arrived. By 2002 only about 5 lakh remained. See MobileClear for what came next, and FaxClear for another machine of that era.</p>
    <p class="tip"><b>Try it:</b> set how many messages you get a month and compare what a pager and an early mobile would cost you.</p>`,
  terms: [
    { t: 'Paging licence', d: 'Government permission to run a paging service in a city or circle, first issued in India in the mid-1990s.' },
    { t: 'Alphanumeric pager', d: 'A pager that shows letters as well as numbers, so it can display a whole short message.' },
    { t: 'Operator paging', d: 'Phoning a person at the paging centre who types your message for you.' },
    { t: 'STD/PCO booth', d: 'A public call office, often a small shop, where you paid by the call. Many Indians called back from one after a page.' },
    { t: 'Incoming call charges', d: 'In India\'s early mobile years you paid for calls you received as well as calls you made.' },
  ],
  defaults: { msgs: 60, rent: 'low', slot: 'peak', callback: true },
  controls: [
    { key: 'msgs', type: 'range', label: 'Messages you get each month', min: 5, max: 300, step: 5, fmt: (v) => `${v}` },
    { key: 'rent', type: 'seg', label: 'Pager rent (DoT cap)', options: [{ v: 'low', label: 'Under $5 (1995)' }, { v: 'high', label: '$8 (1996)' }], fmt: (v) => `about ${rs(RENT[v])} a month` },
    { key: 'slot', type: 'seg', label: 'Mobile call time', options: [{ v: 'peak', label: 'Peak ₹16.80/min' }, { v: 'off', label: 'Off-peak ₹8.40/min' }] },
    { key: 'callback', type: 'toggle', label: 'Call back from a PCO each time', hint: 'A local call cost about ₹1.' },
  ],
  quiz: [
    { q: 'Why did a pager make sense in India in 1996?', options: ['Mobiles did not exist', 'Mobile calls cost about ₹16.80 a minute, even to receive, while pager rent was capped low', 'Pagers could make calls', 'Landlines were free'], answer: 1, why: 'A flat, low monthly rent beat paying for every minute you received on an early mobile.' },
    { q: 'What kind of pager did most Indian users choose?', options: ['Numeric only', 'Alphanumeric, showing whole messages', 'Voice pagers', 'Two-way pagers'], answer: 1, why: 'Over 95% of the market was alphanumeric, with operators typing messages for callers.' },
    { q: 'What ended the pager boom?', options: ['A ban', 'Cheaper mobile calls and SMS', 'Pagers stopped working', 'Batteries ran out'], answer: 1, why: 'As mobile prices fell, a phone that could send and receive messages and calls replaced the one-way pager.' },
  ],
  reel: [
    { ms: 5600, caption: 'In late-1990s India, a pager on your belt beat a mobile that charged ₹16.80 a minute, even to receive.', set: { msgs: 60, rent: 'low', slot: 'peak', callback: true }, view: { pos: [2, 7.5, 21], target: [0.6, 4.4, 0] }, spin: 0.15 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    // A wooden desk with a landline, the pager and a PCO sign.
    const desk = box(7.6, 0.3, 4.4, M.matte(0x6b4a2e)); desk.position.set(-4.4, 2.2, 1.2); root.add(desk);
    [[-7.9, -0.6], [-0.9, -0.6], [-7.9, 3.0], [-0.9, 3.0]].forEach(([x, z]) => { const l = box(0.3, 2.05, 0.3, M.matte(0x5a3d25)); l.position.set(x, 1.03, z); root.add(l); });
    const phone = new THREE.Group(); phone.position.set(-6.5, 2.35, 1.4); root.add(phone);
    const base = box(2.0, 0.6, 2.2, M.plastic(0xd9d2c0)); base.position.y = 0.3; phone.add(base);
    const hand = box(2.3, 0.4, 0.6, M.plastic(0xd9d2c0)); hand.position.set(0, 0.8, -0.35); phone.add(hand);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) { const k = box(0.3, 0.08, 0.26, M.plastic(0x3a3f4c)); k.position.set(-0.4 + c * 0.4, 0.62, 0.15 + r * 0.3); phone.add(k); }
    stage.label('Landline', [0, 1.6, 0], phone);
    const p = makePager(); p.group.scale.setScalar(0.28); p.group.position.set(-3.4, 3.1, 2.0); p.group.rotation.set(-0.35, 0.25, 0); root.add(p.group);
    const signTex = canvasTexture(512, 160, (g, W, H) => {
      g.fillStyle = '#f5c518'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#b3121b'; g.font = 'bold 58px sans-serif'; g.textAlign = 'center'; g.fillText('STD · ISD · PCO', W / 2, 106);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.2), new THREE.MeshBasicMaterial({ map: signTex.tex, toneMapped: false }));
    sign.position.set(-4.6, 4.0, -0.8); root.add(sign);

    // Chart: pager subscribers (lakh), with the era's tariffs noted.
    const chart = board(8.6, 4.12, 1000, (g, W, H) => {
      panelBg(g, W, H, 'Pager subscribers in India (lakh, as reported)');
      const x0 = 90, x1 = W - 40, y0 = H - 80, y1 = 90, max = 10;
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.fillStyle = 'rgba(232,238,248,.6)'; g.font = '20px sans-serif';
      for (let v = 0; v <= max; v += 2) { const y = y0 - (v / max) * (y0 - y1); g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.fillText(v, 40, y + 7); }
      const bw = (x1 - x0) / SUBS.length;
      SUBS.forEach((d, i) => {
        const h = (d.v / max) * (y0 - y1), x = x0 + i * bw + bw * 0.2;
        g.fillStyle = i === 1 ? '#ffd166' : '#5ce1a9'; g.fillRect(x, y0 - h, bw * 0.6, h);
        g.fillStyle = '#e8eef8'; g.font = 'bold 24px sans-serif'; g.fillText(d.v.toFixed(d.v % 1 ? 2 : 0).replace(/0$/, ''), x + 8, y0 - h - 10);
        g.fillStyle = 'rgba(232,238,248,.8)'; g.font = '20px sans-serif'; g.fillText(d.t, x, y0 + 28);
        g.fillStyle = 'rgba(232,238,248,.45)'; g.font = '15px sans-serif'; g.fillText(d.src, x, y0 + 50);
      });
    });
    chart.position.set(6.2, 6.1, 0); root.add(chart);

    // The monthly bill, 1996 style.
    const st = { s: null, pager: 0, mobile: 0 };
    const bill = board(8.6, 3.22, 1000, (g, W, H) => {
      g.fillStyle = '#f6f1e3'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#b8ad90'; g.setLineDash([10, 8]); g.lineWidth = 3; g.strokeRect(10, 10, W - 20, H - 20); g.setLineDash([]);
      if (!st.s) return;
      const s = st.s;
      g.fillStyle = '#2a2a2a'; g.font = 'bold 30px monospace'; g.fillText(`YOUR MONTH: ${s.msgs} MESSAGES`, 36, 58);
      g.font = '24px monospace';
      const rows = [
        ['PAGER RENT', rs(RENT[s.rent])],
        ['CALL-BACKS FROM PCO', s.callback ? rs(s.msgs * LOCAL_CALL) : '-'],
        ['PAGER TOTAL', rs(st.pager)],
        [`EARLY MOBILE: ${s.msgs} x 1 MIN IN`, rs(st.mobile)],
      ];
      rows.forEach(([a, b], i) => {
        const y = 110 + i * 44;
        g.fillStyle = i === 2 ? '#0b6b3a' : i === 3 ? '#b3121b' : '#2a2a2a'; g.font = `${i >= 2 ? 'bold ' : ''}24px monospace`;
        g.fillText(a, 36, y); g.textAlign = 'right'; g.fillText(b, W - 40, y); g.textAlign = 'left';
      });
      g.fillStyle = '#6a6250'; g.font = '17px monospace';
      g.fillText('Mobile rent and handset not included. Callers paid about ₹1 to page you.', 36, H - 30);
    });
    bill.position.set(6.2, 2.05, 0.1); root.add(bill);

    let t = 0, n = -1, key = '', lcdKey = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        st.s = s;
        st.pager = RENT[s.rent] + (s.callback ? s.msgs * LOCAL_CALL : 0);
        st.mobile = s.msgs * MOBILE[s.slot];
        const k = `${s.msgs}|${s.rent}|${s.slot}|${s.callback}`;
        if (k !== key) { key = k; bill.redraw(); }
        const i = Math.floor(t / 5) % MSGS.length;
        const buzz = (t % 5) < 1.2;
        if (i !== n) n = i;
        const lines = [`MSG ${i + 1}      1996 ${String(9 + i * 2).padStart(2, '0')}:1${i}`, ...wrap(MSGS[i], 20, 3)];
        const lk = lines.join('|'); if (lk !== lcdKey) { lcdKey = lk; p.lcdTex.redraw(lines); }
        p.group.position.x = -3.4 + (buzz ? Math.sin(t * 90) * 0.03 : 0);
        p.ledMat.color.setHex(buzz && Math.sin(t * 18) > 0 ? 0xff3030 : 0x3a1010);
        p.lcdMat.emissiveIntensity = buzz ? 0.5 : 0.15;
      },
      readout: (s) => {
        const ratio = st.mobile / Math.max(1, st.pager);
        return `<div class="big">Pager ${rs(st.pager)} vs mobile ${rs(st.mobile)} a month</div>
          <div class="row"><span>Mobile costs</span><b class="${ratio > 1 ? 'no' : 'ok'}">${ratio >= 1 ? ratio.toFixed(1) + '× more' : 'less'}</b></div>
          <div class="row"><span>Pager to buy (1996, $150 to $300)</span><b>${rs(150 * RS_PER_USD)} to ${rs(300 * RS_PER_USD)}</b></div>
          <div class="row"><span>Alphanumeric share of pagers</span><b>over 95%</b></div>
          <div class="row"><span>Peak subscribers (Mar 1998)</span><b>about 8.3 lakh</b></div>
          <small>1995–96 tariffs as reported; ₹ at about ${RS_PER_USD} to the dollar. Local call about ₹1. Rates varied by city and year.</small>`;
      },
    };
  },
};
