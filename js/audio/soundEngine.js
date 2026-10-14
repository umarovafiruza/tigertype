/**
 * High-performance Web Audio API mechanical switch synthesizer.
 * Provides microsecond latency playback for 150+ WPM typing with zero external audio assets.
 */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.currentProfile = "blue"; // "off" | "blue" | "red" | "brown"
    this.volume = 0.4;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.isInitialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  setProfile(profileId) {
    this.currentProfile = profileId;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  playKeystroke(key = "a") {
    if (this.currentProfile === "off") return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const isSpaceOrEnter = key === " " || key === "Enter";
    const now = this.ctx.currentTime;

    switch (this.currentProfile) {
      case "blue":
        this._playClickyBlue(now, isSpaceOrEnter);
        break;
      case "red":
        this._playLinearRed(now, isSpaceOrEnter);
        break;
      case "brown":
        this._playTactileBrown(now, isSpaceOrEnter);
        break;
      default:
        break;
    }
  }

  _playClickyBlue(now, isSpace) {
    // Sharp metallic click transient + thud
    const oscClick = this.ctx.createOscillator();
    const gainClick = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = isSpace ? 2200 : 3800;
    filter.Q.value = 4.0;

    oscClick.type = "sine";
    oscClick.frequency.setValueAtTime(isSpace ? 3200 : 4500, now);
    oscClick.frequency.exponentialRampToValueAtTime(800, now + 0.012);

    gainClick.gain.setValueAtTime(this.volume * 0.7, now);
    gainClick.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    oscClick.connect(filter);
    filter.connect(gainClick);
    gainClick.connect(this.ctx.destination);

    oscClick.start(now);
    oscClick.stop(now + 0.02);

    // Bottom-out thud
    this._playBottomOut(now + 0.006, isSpace ? 140 : 180, 0.04, 0.5);
  }

  _playLinearRed(now, isSpace) {
    // Soft, muted, smooth bottom-out without click
    this._playBottomOut(now, isSpace ? 110 : 160, 0.035, 0.45);
  }

  _playTactileBrown(now, isSpace) {
    // Subtle tactile bump followed by medium bottom-out
    const oscBump = this.ctx.createOscillator();
    const gainBump = this.ctx.createGain();

    oscBump.type = "triangle";
    oscBump.frequency.setValueAtTime(isSpace ? 1600 : 2100, now);
    oscBump.frequency.exponentialRampToValueAtTime(600, now + 0.01);

    gainBump.gain.setValueAtTime(this.volume * 0.25, now);
    gainBump.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

    oscBump.connect(gainBump);
    gainBump.connect(this.ctx.destination);

    oscBump.start(now);
    oscBump.stop(now + 0.015);

    this._playBottomOut(now + 0.005, isSpace ? 130 : 170, 0.038, 0.4);
  }

  _playBottomOut(time, freq, duration, volFactor) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + duration);

    gain.gain.setValueAtTime(this.volume * volFactor, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  }
}
