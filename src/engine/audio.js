// Minimal WebAudio manager for buzzer sound. One oscillator+gain per active tone key.
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.voices = new Map(); // key -> { osc, gain }
  }

  ensureCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setToneActive(key, active, freq) {
    if (active) this.startTone(key, freq);
    else this.stopTone(key);
  }

  startTone(key, freq) {
    const ctx = this.ensureCtx();
    let voice = this.voices.get(key);
    if (voice) {
      voice.osc.frequency.setValueAtTime(freq, ctx.currentTime);
      return;
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    this.voices.set(key, { osc, gain });
  }

  stopTone(key) {
    const voice = this.voices.get(key);
    if (!voice) return;
    try {
      voice.osc.stop();
    } catch {
      /* already stopped */
    }
    voice.osc.disconnect();
    voice.gain.disconnect();
    this.voices.delete(key);
  }

  playTimedTone(key, freq, durationMs) {
    this.startTone(key, freq);
    if (durationMs) {
      setTimeout(() => this.stopTone(key), durationMs);
    }
  }
}
