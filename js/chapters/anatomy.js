// Chapter 1: inside a 1990s alphanumeric pager. X-ray the case, take it apart, and send it a test
// page: the antenna glows as the signal arrives, the LCD fills, the motor spins and the pager buzzes.
import { THREE, M, exploder } from '../kit.js';
import { makePager, wrap } from '../pager.js';

const PAGES = ['PLS CALL OFFICE 2233 4455 URGENT', 'MEET AT GATE 2 AT 6PM - RAVI', 'DR MEHTA TO WARD 7 STAT', 'HAPPY BIRTHDAY! CALL HOME'];

export default {
  id: 'anatomy',
  short: 'Inside a pager',
  title: 'Inside a pager',
  subtitle: 'A pocket radio that only listens. It waits for its own address, then beeps, buzzes and shows a message.',
  view: { pos: [5, 6.2, 15.5], target: [-2.0, 3.6, 0] },
  learn: `<p>In the 1990s, before most people had mobile phones, doctors, business people and college students clipped a <b>pager</b> to their belts. It is a small <b>radio receiver</b> with a screen. It can't make calls and it can't reply. It just listens, all day, for messages meant for it.</p>
    <p>Look inside. The copper <b>loop antenna</b> runs round the edge of the case and catches the radio signal. The <b>receiver chip</b> tunes to one channel, and a quartz <b>crystal</b> keeps that tuning exact. The <b>decoder chip</b> turns the signal into ones and zeros and checks each message's <b>address</b>. If the address is this pager's, it saves the message in <b>memory</b>, shows it on the <b>LCD</b> and sets off the <b>beeper</b> or the <b>vibration motor</b>: a tiny motor with an off-centre weight that shakes the whole pager.</p>
    <p>All of this runs on one <b>AA battery</b> for weeks or months. How? The pager sleeps most of the time and wakes only when its own messages might arrive (see the POCSAG chapter). A 1990s mobile phone lasted days at best.</p>
    <p class="tip"><b>Try it:</b> switch on X-ray and send a test page. Watch the antenna light up, then the screen, then the motor. Then take it apart.</p>`,
  terms: [
    { t: 'Pager', d: 'A small one-way radio receiver that shows short messages sent to its own address.' },
    { t: 'Loop antenna', d: 'A loop of metal inside the case that picks up the radio wave. Your body near it can even help.' },
    { t: 'Quartz crystal', d: 'A sliver of quartz that vibrates at a precise rate, used to tune the receiver to exactly the right channel.' },
    { t: 'Decoder', d: 'The chip that reads the digital code, checks the address and fixes small errors.' },
    { t: 'Vibration motor', d: 'A tiny motor spinning an off-centre weight, so the pager shakes instead of beeping.' },
    { t: 'LCD', d: 'Liquid crystal display: a screen that uses very little power, making dark dots on a grey-green panel.' },
  ],
  defaults: { explode: 0, xray: true, page: true, alert: 'vibrate', msg: 0 },
  controls: [
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'exploded'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray the case' },
    { key: 'page', type: 'toggle', label: 'Send test pages', hint: 'A new page arrives every 8 seconds.' },
    { key: 'alert', type: 'seg', label: 'Alert', options: [{ v: 'vibrate', label: 'Vibrate' }, { v: 'beep', label: 'Beep' }], fmt: (v) => (v === 'vibrate' ? 'motor spins an off-centre weight' : 'piezo disc squeals at about 3 kHz') },
  ],
  quiz: [
    { q: 'What could a 1990s one-way pager NOT do?', options: ['Show a text message', 'Vibrate', 'Send a reply', 'Store old messages'], answer: 2, why: 'A one-way pager has a receiver but no transmitter. To reply you found a phone and called back.' },
    { q: 'What makes a pager vibrate?', options: ['A speaker playing a low note', 'A tiny motor spinning an off-centre weight', 'A magnet in the battery', 'The screen flashing'], answer: 1, why: 'A weight that is heavier on one side wobbles as it spins, and that shakes the whole case.' },
    { q: 'Why does the pager have a quartz crystal inside?', options: ['For decoration', 'To keep the receiver tuned to exactly the right frequency', 'To store messages', 'To make the screen glow'], answer: 1, why: 'Quartz vibrates at a very steady rate, so the receiver stays locked on its channel.' },
  ],
  reel: [
    { ms: 5600, caption: 'Before mobiles, millions carried a pager: a pocket radio that only listens.', set: { xray: false, page: true, explode: 0, alert: 'vibrate' }, view: { pos: [4.5, 4.8, 9.5], target: [-0.2, 3.1, 0] }, spin: 0.25 },
    { ms: 5600, caption: 'Inside: a loop antenna, a receiver, a crystal, a decoder chip, a buzz motor and one AA battery.', set: { xray: true, page: true }, anim: { explode: [0, 0.85] }, view: { pos: [8, 7, 14], target: [0, 3.4, 0] }, spin: 0.3 },
  ],

  build({ stage }) {
    const p = makePager();
    p.group.position.set(0, 3.1, 0); p.group.rotation.y = -0.45;
    stage.root.add(p.group);
    // A small stand under it, like a desk charger cradle.
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.7, 0.35, 48), M.plastic(0x2a2e38, { roughness: 0.5 }));
    stand.position.y = 0.18; stage.root.add(stand);

    const L = (t, parent, pos, cls) => stage.label(t, pos, parent, cls);
    const labels = [
      L('Loop antenna', p.pcb, [-4.6, 2.2, 0.2], 'hot'),
      L('Receiver chip', p.pcb, [-4.8, 0.9, -0.2]),
      L('Quartz crystal', p.pcb, [-4.6, -0.5, -0.3]),
      L('Decoder chip', p.pcb, [2.6, 2.6, -0.2], 'hot'),
      L('Beeper', p.pcb, [4.4, -0.3, -0.3]),
      L('Vibration motor', p.motor, [1.6, 0.9, 0]),
      L('AA battery (1.5 V)', p.battery, [0, -1.3, 0]),
    ];
    const outside = [L('LCD: 4 lines × 20 characters', p.front, [0, 3.0, 0.6]), L('Belt clip', p.clip, [2.6, -2.8, -0.4])];

    const setExplode = exploder([
      { obj: p.front, off: [0, 0, 4.2] },
      { obj: p.back, off: [0, 0, -3.2] },
      { obj: p.clip, off: [0, 0, -5.2] },
      { obj: p.battery, off: [0, -2.6, -1.2] },
      { obj: p.motor, off: [2.8, 1.4, -0.8] },
      { obj: p.pcb, off: [0, 0, 1.2] },
    ]);

    let t = 0, since = 99, n = -1, lcdKey = '';
    const st = { phase: 'idle' };
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        setExplode(s.explode);
        const see = s.xray || s.explode > 0.05;
        p.shellMat.opacity = see ? 0.14 : 1; p.shellMat.depthWrite = !see;
        labels.forEach((l) => { l.visible = see; });
        outside.forEach((l) => { l.visible = s.explode < 0.3; });
        // A page cycle: 0–0.8 s radio arriving (antenna glows), 0.8 s decoded, 1–4 s alert, then idle.
        if (s.page) since += dt;
        if (s.page && since > 8) { since = 0; n = (n + 1) % PAGES.length; }
        const radio = since < 0.8, alerting = since > 0.8 && since < 4;
        p.antMat.emissiveIntensity = radio ? 1.2 + Math.sin(t * 40) * 0.6 : 0;
        const lines = n < 0 ? ['', '  NO NEW MESSAGES', '', ''] : since < 0.8 ? ['', '  RECEIVING...', '', ''] : [`MSG ${n + 1}/${PAGES.length}        ${String(12 + n).padStart(2, '0')}:0${n}`, ...wrap(PAGES[n], 20, 3)];
        const key = lines.join('|');
        if (key !== lcdKey) { lcdKey = key; p.lcdTex.redraw(lines); }
        p.lcdMat.emissiveIntensity = alerting ? 0.5 : 0.15;
        p.ledMat.color.setHex(alerting && Math.sin(t * 18) > 0 ? 0xff3030 : 0x3a1010);
        const vib = alerting && s.alert === 'vibrate';
        p.weight.rotation.x += dt * (vib ? 60 : 0);
        p.group.position.x = vib ? Math.sin(t * 90) * 0.05 : 0; p.group.position.y = 3.1;
        p.group.rotation.z = vib ? Math.sin(t * 77) * 0.012 : 0;
        p.beeper.scale.y = alerting && s.alert === 'beep' ? 1 + Math.abs(Math.sin(t * 50)) * 0.8 : 1;
        st.phase = radio ? 'Radio signal arriving' : alerting ? (s.alert === 'vibrate' ? 'Buzzing' : 'Beeping') : n < 0 ? 'Listening' : 'Message stored';
      },
      readout: () => `<div class="big">${st.phase}</div>
        <div class="row"><span>Power</span><b>one AA cell, 1.5 V</b></div>
        <div class="row"><span>Battery life</span><b>about 1 to 4 months</b></div>
        <div class="row"><span>Radio band (typical)</span><b>VHF 143 to 174 MHz</b></div>
        <div class="row"><span>Can it transmit?</span><b class="no">no, receive only</b></div>
        <small>Figures for a typical one-way alphanumeric pager; bands vary by country.</small>`,
    };
  },
};
