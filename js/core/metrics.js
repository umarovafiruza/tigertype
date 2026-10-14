/**
 * High-accuracy typing calculation metrics conforming to standard typing speed rules.
 * Rule: 1 word = 5 keystrokes.
 */

export class Metrics {
  /**
   * Calculate Gross Words Per Minute
   * @param {number} totalChars - Total keystrokes typed
   * @param {number} timeInSeconds - Elapsed time in seconds
   */
  static getGrossWPM(totalChars, timeInSeconds) {
    if (timeInSeconds <= 0 || totalChars <= 0) return 0;
    const minutes = timeInSeconds / 60;
    return Math.round((totalChars / 5) / minutes);
  }

  /**
   * Calculate Net Words Per Minute
   * @param {number} totalChars - Total keystrokes typed
   * @param {number} uncorrectedErrors - Number of incorrect characters at finish
   * @param {number} timeInSeconds - Elapsed time in seconds
   */
  static getNetWPM(totalChars, uncorrectedErrors, timeInSeconds) {
    if (timeInSeconds <= 0 || totalChars <= 0) return 0;
    const minutes = timeInSeconds / 60;
    const netChars = Math.max(0, totalChars - uncorrectedErrors);
    return Math.round((netChars / 5) / minutes);
  }

  /**
   * Calculate Characters Per Minute (CPM)
   * @param {number} correctChars 
   * @param {number} timeInSeconds 
   */
  static getCPM(correctChars, timeInSeconds) {
    if (timeInSeconds <= 0 || correctChars <= 0) return 0;
    const minutes = timeInSeconds / 60;
    return Math.round(correctChars / minutes);
  }

  /**
   * Calculate Accuracy Percentage
   * @param {number} correctChars 
   * @param {number} totalTypedChars 
   */
  static getAccuracy(correctChars, totalTypedChars) {
    if (totalTypedChars <= 0) return 100;
    const acc = (correctChars / totalTypedChars) * 100;
    return Math.min(100, Math.max(0, Math.round(acc * 10) / 10));
  }

  /**
   * Calculate Consistency Percentage based on standard deviation of timeline samples
   * @param {Array<number>} speedSamples - Array of WPM recorded each second
   */
  static getConsistency(speedSamples) {
    if (!speedSamples || speedSamples.length < 2) return 100;
    
    // Filter out initial 0 samples if any
    const valid = speedSamples.filter(s => s > 0);
    if (valid.length < 2) return 100;

    const mean = valid.reduce((acc, v) => acc + v, 0) / valid.length;
    if (mean === 0) return 100;

    const variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / valid.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation: (stdDev / mean) * 100
    // Consistency % = 100 - CV%
    const cv = (stdDev / mean) * 100;
    const consistency = Math.max(0, Math.min(100, 100 - cv));
    return Math.round(consistency);
  }
}
