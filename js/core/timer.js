/**
 * High-precision timer using performance.now() to prevent interval drift
 */
export class PrecisionTimer {
  constructor() {
    this.startTime = 0;
    this.elapsedSeconds = 0;
    this.duration = 0; // 0 for infinite/word mode, > 0 for time mode
    this.timerId = null;
    this.isRunning = false;
    this.onTick = null;
    this.onSecondSample = null;
    this.onComplete = null;
    this.lastSampleSecond = 0;
  }

  /**
   * Start or restart the timer
   * @param {number} durationSeconds - 0 for count up (word mode), > 0 for count down
   * @param {Function} onTick - Called on animation frames for smooth displays
   * @param {Function} onSecondSample - Called once every integer second for chart logging
   * @param {Function} onComplete - Called when countdown reaches 0
   */
  start(durationSeconds = 0, onTick = null, onSecondSample = null, onComplete = null) {
    this.stop();
    this.duration = durationSeconds;
    this.onTick = onTick;
    this.onSecondSample = onSecondSample;
    this.onComplete = onComplete;
    this.startTime = performance.now();
    this.elapsedSeconds = 0;
    this.lastSampleSecond = 0;
    this.isRunning = true;

    const loop = (currentTime) => {
      if (!this.isRunning) return;

      const deltaMs = currentTime - this.startTime;
      this.elapsedSeconds = deltaMs / 1000;

      // Handle integer second sampling
      const currentIntSec = Math.floor(this.elapsedSeconds);
      if (currentIntSec > this.lastSampleSecond) {
        this.lastSampleSecond = currentIntSec;
        if (this.onSecondSample) {
          this.onSecondSample(currentIntSec, this.elapsedSeconds);
        }
      }

      // Check if time mode reached limit
      if (this.duration > 0 && this.elapsedSeconds >= this.duration) {
        this.elapsedSeconds = this.duration;
        this.isRunning = false;
        if (this.onTick) this.onTick(this.duration - this.elapsedSeconds, this.elapsedSeconds);
        if (this.onComplete) this.onComplete();
        return;
      }

      const remainingOrElapsed = this.duration > 0
        ? Math.max(0, Math.ceil(this.duration - this.elapsedSeconds))
        : Math.floor(this.elapsedSeconds);

      if (this.onTick) {
        this.onTick(remainingOrElapsed, this.elapsedSeconds);
      }

      this.timerId = requestAnimationFrame(loop);
    };

    this.timerId = requestAnimationFrame(loop);
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }

  getElapsedSeconds() {
    return Math.max(0.1, this.elapsedSeconds);
  }
}
