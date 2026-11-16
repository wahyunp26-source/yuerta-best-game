// Lumen Tide — all sound is synthesized with WebAudio oscillators, no audio
// files. One job: small named effects plus a soft ambient pad underneath.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let padNodes = null;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    return true;
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 900;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.25;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  const api = {
    unlock() { ensure(); },
    setMuted(value) {
      muted = !!value;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() { return muted; },
    pickup(combo) {
      const step = Math.min(combo, 12);
      const base = 520 * Math.pow(1.059463, step);
      tone(base, 0.16, 'sine', 0.22);
      tone(base * 2, 0.1, 'sine', 0.08);
    },
    blast() {
      tone(180, 0.35, 'sawtooth', 0.16, 40);
      noiseBurst(0.25, 0.2, 1400);
    },
    hit() {
      tone(140, 0.4, 'square', 0.2, 55);
      noiseBurst(0.3, 0.3, 500);
    },
    powerup() {
      tone(660, 0.12, 'triangle', 0.2);
      tone(880, 0.14, 'triangle', 0.2, null, 0.09);
      tone(1320, 0.2, 'triangle', 0.16, null, 0.18);
    },
    waveClear() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, null, i * 0.09));
    },
    victory() {
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.4, 'triangle', 0.18, null, i * 0.12));
    },
    defeat() {
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, 'sine', 0.18, null, i * 0.16));
    },
    click() { tone(880, 0.06, 'sine', 0.12); },
    startPad() {
      if (!ensure() || padNodes || muted) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      gain.connect(master);
      const oscs = [55, 82.5, 110.3].map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'triangle' : 'sine';
        o.frequency.value = f;
        o.connect(gain);
        o.start();
        return o;
      });
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.08;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      padNodes = { gain, oscs, lfo };
    },
    stopPad() {
      if (!padNodes) return;
      try {
        padNodes.oscs.forEach((o) => o.stop());
        padNodes.lfo.stop();
        padNodes.gain.disconnect();
      } catch (err) { /* already stopped */ }
      padNodes = null;
    },
  };
  return api;
}
