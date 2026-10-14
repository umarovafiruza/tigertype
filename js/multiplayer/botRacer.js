/**
 * Humanized AI Bot racer for solo competition and practice.
 */
export class BotRacer {
  constructor(name = "TigerBot", targetWpm = 65) {
    this.name = name;
    this.targetWpm = targetWpm;
    this.progress = 0; // 0.0 to 1.0
    this.liveWpm = 0;
    this.isRunning = false;
    this.timerId = null;

    this.onProgress = null;
    this.onFinish = null;

    this.totalChars = 0;
    this.typedChars = 0;
    this.startTime = 0;
  }

  setSpeed(wpm) {
    this.targetWpm = Math.max(20, Math.min(150, wpm));
  }

  start(wordsList = []) {
    this.stop();
    this.wordsList = wordsList;
    this.totalChars = wordsList.join(" ").length;
    this.typedChars = 0;
    this.progress = 0;
    this.liveWpm = this.targetWpm;
    this.isRunning = true;
    this.startTime = performance.now();

    this._scheduleNextKeystroke();
  }

  _scheduleNextKeystroke() {
    if (!this.isRunning) return;

    if (this.typedChars >= this.totalChars) {
      this.finish();
      return;
    }

    // Characters per minute = WPM * 5
    // Mean delay between chars in ms = 60000 / (targetWpm * 5)
    const baseDelayMs = 60000 / (this.targetWpm * 5);
    // Add human-like variance (-20% to +25%)
    const variance = (Math.random() * 0.45 - 0.20);
    const delay = Math.max(25, baseDelayMs * (1 + variance));

    this.timerId = setTimeout(() => {
      if (!this.isRunning) return;

      this.typedChars++;
      this.progress = Math.min(1, this.typedChars / this.totalChars);

      const elapsedMinutes = (performance.now() - this.startTime) / 60000;
      this.liveWpm = Math.round((this.typedChars / 5) / Math.max(0.01, elapsedMinutes));

      if (this.onProgress) {
        this.onProgress({
          name: this.name,
          progress: this.progress,
          liveWpm: this.liveWpm,
          isFinished: this.progress >= 1
        });
      }

      this._scheduleNextKeystroke();
    }, delay);
  }

  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  finish() {
    this.stop();
    this.progress = 1;
    if (this.onFinish) {
      this.onFinish({
        name: this.name,
        finalWpm: this.liveWpm,
        time: (performance.now() - this.startTime) / 1000
      });
    }
  }
}
