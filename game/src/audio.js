// Synthesized WebAudio only — no audio files. Music starts after first gesture.
export function createAudio() {
  const sys = {
    ctx: null, master: null, musicGain: null, engineOsc: null, engineGain: null,
    musicTimer: null, musicOn: false, muted: false, beat: 0,
  };
  sys.ensure = () => {
    if (sys.ctx) { if (sys.ctx.state === 'suspended') sys.ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      sys.ctx = new AC();
      sys.master = sys.ctx.createGain(); sys.master.gain.value = 0.5; sys.master.connect(sys.ctx.destination);
      sys.musicGain = sys.ctx.createGain(); sys.musicGain.gain.value = 0.16; sys.musicGain.connect(sys.master);
      // engine hum: two detuned saws through a lowpass
      sys.engineOsc = sys.ctx.createOscillator(); sys.engineOsc.type = 'sawtooth'; sys.engineOsc.frequency.value = 55;
      const o2 = sys.ctx.createOscillator(); o2.type = 'sawtooth'; o2.frequency.value = 58;
      const lp = sys.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      sys.engineGain = sys.ctx.createGain(); sys.engineGain.gain.value = 0;
      sys.engineOsc.connect(lp); o2.connect(lp); lp.connect(sys.engineGain); sys.engineGain.connect(sys.master);
      sys.engineOsc.start(); o2.start();
      return true;
    } catch { return false; }
  };
  sys.tone = (freq, dur, type, vol, slideTo) => {
    if (!sys.ctx || sys.muted) return;
    const t = sys.ctx.currentTime;
    const o = sys.ctx.createOscillator(), g = sys.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sys.master);
    o.start(t); o.stop(t + dur + 0.02);
  };
  sys.noise = (dur, vol, freq) => {
    if (!sys.ctx || sys.muted) return;
    const t = sys.ctx.currentTime, len = Math.floor(sys.ctx.sampleRate * dur);
    const buf = sys.ctx.createBuffer(1, len, sys.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = sys.ctx.createBufferSource(); src.buffer = buf;
    const f = sys.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1800;
    const g = sys.ctx.createGain(); g.gain.value = vol || 0.25;
    src.connect(f); f.connect(g); g.connect(sys.master); src.start(t);
  };
  sys.shot = () => { sys.noise(0.12, 0.4, 3200); sys.tone(180, 0.1, 'square', 0.25, 60); };
  sys.crash = () => { sys.noise(0.3, 0.35, 500); sys.tone(90, 0.25, 'sine', 0.3, 40); };
  sys.pickup = () => { sys.tone(660, 0.09, 'sine', 0.22); setTimeout(() => sys.tone(990, 0.12, 'sine', 0.22), 80); };
  sys.cash = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => sys.tone(f, 0.12, 'triangle', 0.22), i * 70)); };
  sys.jingle = () => { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => sys.tone(f, 0.16, 'triangle', 0.25), i * 90)); };
  sys.siren = () => { sys.tone(700, 0.28, 'sine', 0.12, 950); setTimeout(() => sys.tone(950, 0.28, 'sine', 0.12, 700), 280); };
  sys.setEngine = (speed01, on) => {
    if (!sys.ctx) return;
    sys.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.09 : 0, sys.ctx.currentTime, 0.1);
    sys.engineOsc.frequency.setTargetAtTime(50 + speed01 * 130, sys.ctx.currentTime, 0.1);
  };
  // Synthwave bassline loop, A minor, 8 steps.
  const bass = [55, 0, 55, 65.41, 55, 0, 49, 58.27];
  const lead = [220, 261.63, 329.63, 261.63, 220, 196, 164.81, 196];
  sys.startMusic = () => {
    if (!sys.ensure() || sys.musicOn) return;
    sys.musicOn = true;
    sys.musicTimer = setInterval(() => {
      if (sys.muted || !sys.ctx) return;
      const b = bass[sys.beat % bass.length];
      if (b) sys.tone(b, 0.22, 'sawtooth', 0.14);
      if (sys.beat % 2 === 0) sys.tone(lead[sys.beat % lead.length], 0.18, 'triangle', 0.06);
      sys.beat++;
    }, 240);
  };
  sys.toggleMute = () => { sys.muted = !sys.muted; if (sys.master) sys.master.gain.value = sys.muted ? 0 : 0.5; return sys.muted; };
  return sys;
}
