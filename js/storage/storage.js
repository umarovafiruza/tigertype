/**
 * Storage manager for tests history, personal bests, and user preferences.
 */
export class StorageManager {
  static KEYS = {
    HISTORY: "tigertype_history_v1",
    PERSONAL_BESTS: "tigertype_pb_v1",
    PREFERENCES: "tigertype_prefs_v1"
  };

  static saveTestResult(result) {
    try {
      const history = this.getHistory();
      history.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString(),
        ...result
      });
      // Keep last 100 tests in storage
      if (history.length > 100) history.pop();
      localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));

      // Update Personal Best
      const pbKey = `${result.mode}_${result.modeValue}_${result.language}`;
      const pbs = this.getPersonalBests();
      const currentPb = pbs[pbKey] || 0;
      let isNewPb = false;

      if (result.netWpm > currentPb) {
        pbs[pbKey] = result.netWpm;
        localStorage.setItem(this.KEYS.PERSONAL_BESTS, JSON.stringify(pbs));
        isNewPb = true;
      }

      return { isNewPb, previousPb: currentPb };
    } catch (e) {
      console.warn("Storage save error", e);
      return { isNewPb: false, previousPb: 0 };
    }
  }

  static getHistory() {
    try {
      const data = localStorage.getItem(this.KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  static getPersonalBests() {
    try {
      const data = localStorage.getItem(this.KEYS.PERSONAL_BESTS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  static getPreferences() {
    try {
      const data = localStorage.getItem(this.KEYS.PREFERENCES);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  static savePreferences(prefs) {
    try {
      localStorage.setItem(this.KEYS.PREFERENCES, JSON.stringify(prefs));
    } catch (e) {}
  }

  static exportData() {
    const data = {
      history: this.getHistory(),
      personalBests: this.getPersonalBests(),
      preferences: this.getPreferences(),
      exportedAt: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
  }

  static importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.history) localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(parsed.history));
      if (parsed.personalBests) localStorage.setItem(this.KEYS.PERSONAL_BESTS, JSON.stringify(parsed.personalBests));
      if (parsed.preferences) localStorage.setItem(this.KEYS.PREFERENCES, JSON.stringify(parsed.preferences));
      return true;
    } catch (e) {
      return false;
    }
  }
}
