// Web Audio API – no external files needed

let _ctx: AudioContext | null = null;
let enabled = true;

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!_ctx) _ctx = new AudioContext();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
}

export function setSoundEnabled(v: boolean) { enabled = v; }

/** Short tick per movement step */
export function playStep() {
  const a = ac(); if (!a) return;
  const osc = a.createOscillator();
  const g   = a.createGain();
  osc.connect(g); g.connect(a.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(760, a.currentTime + 0.05);
  g.gain.setValueAtTime(0.1, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.09);
  osc.start(); osc.stop(a.currentTime + 0.1);
}

/** Cha-ching when buying */
export function playCoinBuy() {
  const a = ac(); if (!a) return;
  [0, 0.1, 0.2].forEach((d, i) => {
    const osc = a.createOscillator();
    const g   = a.createGain();
    osc.connect(g); g.connect(a.destination);
    osc.type = 'triangle';
    const f = 880 * (1 + i * 0.3);
    osc.frequency.setValueAtTime(f, a.currentTime + d);
    osc.frequency.exponentialRampToValueAtTime(f * 1.4, a.currentTime + d + 0.1);
    g.gain.setValueAtTime(0.22, a.currentTime + d);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d + 0.35);
    osc.start(a.currentTime + d); osc.stop(a.currentTime + d + 0.38);
  });
}

/** Sad coin drop when paying rent/tax */
export function playRentPay() {
  const a = ac(); if (!a) return;
  [0, 0.14].forEach((d, i) => {
    const osc = a.createOscillator();
    const g   = a.createGain();
    osc.connect(g); g.connect(a.destination);
    osc.type = 'sine';
    const f = 380 - i * 80;
    osc.frequency.setValueAtTime(f * 1.2, a.currentTime + d);
    osc.frequency.exponentialRampToValueAtTime(f * 0.7, a.currentTime + d + 0.28);
    g.gain.setValueAtTime(0.17, a.currentTime + d);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d + 0.32);
    osc.start(a.currentTime + d); osc.stop(a.currentTime + d + 0.35);
  });
}

/** Card whoosh */
export function playCardDraw() {
  const a = ac(); if (!a) return;
  const osc = a.createOscillator();
  const g   = a.createGain();
  osc.connect(g); g.connect(a.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(180, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, a.currentTime + 0.18);
  g.gain.setValueAtTime(0.08, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.22);
  osc.start(); osc.stop(a.currentTime + 0.25);
}

/** Tax thud */
export function playTax() {
  const a = ac(); if (!a) return;
  const osc = a.createOscillator();
  const g   = a.createGain();
  osc.connect(g); g.connect(a.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(300, a.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, a.currentTime + 0.25);
  g.gain.setValueAtTime(0.07, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.3);
  osc.start(); osc.stop(a.currentTime + 0.32);
}

/** Dice roll rattle */
export function playDiceRoll() {
  const a = ac(); if (!a) return;
  [0, 0.06, 0.13, 0.2].forEach((d) => {
    const osc = a.createOscillator();
    const g   = a.createGain();
    osc.connect(g); g.connect(a.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(120 + Math.random() * 80, a.currentTime + d);
    g.gain.setValueAtTime(0.06, a.currentTime + d);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d + 0.06);
    osc.start(a.currentTime + d); osc.stop(a.currentTime + d + 0.07);
  });
}
