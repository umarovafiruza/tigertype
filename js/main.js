import { CONFIG } from "./config.js";
import { Metrics } from "./core/metrics.js";
import { PrecisionTimer } from "./core/timer.js";
import { WordBank } from "./core/wordBank.js";
import { TypingEngine } from "./core/typingEngine.js";
import { SoundEngine } from "./audio/soundEngine.js";
import { CaretRenderer } from "./ui/caretRenderer.js";
import { ModalManager } from "./ui/modalManager.js";
import { StorageManager } from "./storage/storage.js";
import { BotRacer } from "./multiplayer/botRacer.js";
import { PeerManager } from "./multiplayer/peerManager.js";

/**
 * TigerType Orchestrator
 */
class TigerTypeApp {
  constructor() {
    // State
    this.mode = CONFIG.DEFAULT_MODE; // "time" | "words"
    this.modeValue = CONFIG.DEFAULT_TIME; // 30
    this.language = CONFIG.DEFAULT_LANGUAGE; // "english"
    this.currentSwitch = CONFIG.DEFAULT_SWITCH; // "blue"
    this.botSpeed = CONFIG.DEFAULT_BOT_WPM; // 65
    this.isRaceMode = false;
    this.raceOpponentType = "none"; // "none" | "bot" | "peer"

    // Timelines for Canvas Chart
    this.speedTimeline = [];
    this.errorTimeline = [];
    this.errorsThisSecond = 0;

    // DOM Elements
    this.typingWrapper = document.getElementById("typing-wrapper");
    this.typingInput = document.getElementById("typing-input");
    this.wordsContainer = document.getElementById("words-container");
    this.caretElement = document.getElementById("caret");
    this.focusWarning = document.getElementById("focus-warning");

    // HUD Elements
    this.hudTimer = document.getElementById("hud-timer");
    this.hudTimerLabel = document.getElementById("hud-timer-label");
    this.hudWpm = document.getElementById("hud-wpm");
    this.hudAcc = document.getElementById("hud-acc");

    // Race Track Elements
    this.raceSection = document.getElementById("race-tracks-section");
    this.raceModeLabel = document.getElementById("race-mode-label");
    this.raceRoomCodeTag = document.getElementById("race-room-code-tag");
    this.playerTrackFill = document.getElementById("player-track-fill");
    this.playerRunner = document.getElementById("player-runner");
    this.playerLiveWpm = document.getElementById("player-live-wpm");
    this.opponentTrackFill = document.getElementById("opponent-track-fill");
    this.opponentRunner = document.getElementById("opponent-runner");
    this.opponentLiveWpm = document.getElementById("opponent-live-wpm");
    this.opponentNameDisplay = document.getElementById("opponent-name-display");
    this.opponentAvatar = document.getElementById("opponent-avatar");

    // Modules
    this.soundEngine = new SoundEngine();
    this.caretRenderer = new CaretRenderer(this.caretElement, this.wordsContainer);
    this.timer = new PrecisionTimer();
    this.modals = new ModalManager();
    this.typingEngine = new TypingEngine(this.wordsContainer, this.caretRenderer, this.soundEngine);
    this.botRacer = new BotRacer("TigerBot", this.botSpeed);
    this.peerManager = new PeerManager();

    this.init();
  }

  init() {
    this._loadSavedPreferences();
    this._bindDOMEvents();
    this._setupTypingEngineCallbacks();
    this._setupMultiplayerCallbacks();
    this._checkURLParamsForRoom();
    this.resetTest();
  }

  _loadSavedPreferences() {
    const prefs = StorageManager.getPreferences();
    if (prefs) {
      if (prefs.language) this.language = prefs.language;
      if (prefs.mode) this.mode = prefs.mode;
      if (prefs.modeValue) this.modeValue = prefs.modeValue;
      if (prefs.currentSwitch) this.currentSwitch = prefs.currentSwitch;
    }

    this.soundEngine.setProfile(this.currentSwitch);
    this._updateSoundButtonUI();
    this._updateControlPillsUI();
  }

  _bindDOMEvents() {
    // Focus management
    const focusInput = () => {
      this.typingInput.focus();
      this.typingWrapper.classList.remove("unfocused");
    };

    window.addEventListener("click", (e) => {
      if (!e.target.closest(".modal-card") && !e.target.closest(".app-header") && !e.target.closest(".controls-container")) {
        focusInput();
      }
    });

    this.typingInput.addEventListener("blur", () => {
      this.typingWrapper.classList.add("unfocused");
    });

    this.typingInput.addEventListener("focus", () => {
      this.typingWrapper.classList.remove("unfocused");
    });

    // Keystrokes
    this.typingInput.addEventListener("keydown", (e) => {
      this.typingEngine.handleKeyDown(e);
    });

    // Global keyboard shortcuts (Tab + Enter for quick restart)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        this.resetTest();
        focusInput();
      }
    });

    // Language pills
    document.querySelectorAll("#lang-selector .pill-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#lang-selector .pill-option").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.language = btn.dataset.lang;
        this._savePrefs();
        this.resetTest();
        focusInput();
      });
    });

    // Mode Type pills (Time / Words)
    document.querySelectorAll("#mode-type-selector .pill-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#mode-type-selector .pill-option").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.mode = btn.dataset.modeType;
        this._updateModeValuesPillOptions();
        this._savePrefs();
        this.resetTest();
        focusInput();
      });
    });

    // Mode Value pills (15, 30, 60 or 10, 25, 50, 100)
    document.getElementById("mode-val-selector").addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-option");
      if (!btn) return;
      document.querySelectorAll("#mode-val-selector .pill-option").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      this.modeValue = parseInt(btn.dataset.val, 10);
      this._savePrefs();
      this.resetTest();
      focusInput();
    });

    // Switch sound toggle
    document.getElementById("sound-toggle-btn").addEventListener("click", () => {
      const order = ["blue", "red", "brown", "off"];
      const nextIndex = (order.indexOf(this.currentSwitch) + 1) % order.length;
      this.currentSwitch = order[nextIndex];
      this.soundEngine.setProfile(this.currentSwitch);
      this._updateSoundButtonUI();
      this._savePrefs();
      // Test sound preview
      this.soundEngine.playKeystroke("a");
    });

    // Restart button
    document.getElementById("restart-test-btn").addEventListener("click", () => {
      this.resetTest();
      focusInput();
    });

    // Results modal "Next" button
    document.getElementById("res-next-btn").addEventListener("click", () => {
      this.modals.closeAll();
      this.resetTest();
      focusInput();
    });

    // Open Multiplayer modal
    document.getElementById("open-race-btn").addEventListener("click", () => {
      this.modals.showMultiplayer();
    });

    // Open History modal
    document.getElementById("open-history-btn").addEventListener("click", () => {
      this.modals.showHistory(StorageManager.getHistory());
    });

    // Export history
    document.getElementById("export-history-btn").addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(StorageManager.exportData());
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `tigertype_history_${Date.now()}.json`);
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
    });

    // Bot speed buttons in modal
    document.querySelectorAll("#bot-speed-pills .pill-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#bot-speed-pills .pill-option").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.botSpeed = parseInt(btn.dataset.botWpm, 10);
        this.botRacer.setSpeed(this.botSpeed);
      });
    });

    // Start Bot Race button
    document.getElementById("start-bot-race-btn").addEventListener("click", () => {
      this.modals.closeAll();
      this.startBotRace();
      focusInput();
    });

    // Leave race button
    document.getElementById("leave-race-btn").addEventListener("click", () => {
      this.leaveRace();
      focusInput();
    });

    // Copy room link
    document.getElementById("copy-room-link-btn").addEventListener("click", () => {
      if (this.peerManager.roomId) {
        const url = `${window.location.origin}${window.location.pathname}?room=${this.peerManager.roomId}`;
        navigator.clipboard.writeText(url).then(() => {
          alert("Xona havolasi nusxalandi: " + url);
        });
      }
    });

    // Host room button
    document.getElementById("create-room-btn").addEventListener("click", () => {
      this.createPeerRoom();
    });

    // Join room button
    document.getElementById("join-room-btn").addEventListener("click", () => {
      const input = document.getElementById("join-room-input");
      const code = input.value.trim();
      if (code) {
        this.joinPeerRoom(code);
      }
    });

    // Window resize recalculates caret
    window.addEventListener("resize", () => {
      this.caretRenderer.recalculate();
    });
  }

  _setupTypingEngineCallbacks() {
    this.typingEngine.onStart = () => {
      this.speedTimeline = [];
      this.errorTimeline = [];
      this.errorsThisSecond = 0;

      const duration = this.mode === "time" ? this.modeValue : 0;
      
      this.timer.start(
        duration,
        // On tick (frame update for smooth countdown / time elapsed)
        (displayVal, elapsedSec) => {
          this.hudTimer.textContent = displayVal;
          this._updateLiveMetrics(elapsedSec);
        },
        // On second sample (for Canvas Chart)
        (sec, elapsedSec) => {
          const liveWpm = Metrics.getNetWPM(
            this.typingEngine.totalTypedChars,
            this.typingEngine.incorrectChars + this.typingEngine.extraChars,
            elapsedSec
          );
          this.speedTimeline.push(liveWpm);
          this.errorTimeline.push(this.errorsThisSecond);
          this.errorsThisSecond = 0;
        },
        // On countdown complete
        () => {
          this.typingEngine.finish();
        }
      );

      // Start Bot if in bot race mode
      if (this.isRaceMode && this.raceOpponentType === "bot") {
        this.botRacer.start(this.typingEngine.words);
      }
    };

    this.typingEngine.onKeystroke = (info) => {
      if (this.typingEngine.totalErrorsMade > 0) {
        this.errorsThisSecond++;
      }
      this._updateLiveMetrics(this.timer.getElapsedSeconds());

      // Sync progress in race mode
      if (this.isRaceMode) {
        const liveWpm = Metrics.getNetWPM(
          this.typingEngine.totalTypedChars,
          this.typingEngine.incorrectChars + this.typingEngine.extraChars,
          this.timer.getElapsedSeconds()
        );
        this._updatePlayerTrack(info.progress, liveWpm);

        if (this.raceOpponentType === "peer") {
          this.peerManager.broadcastProgress(info.progress, liveWpm);
        }
      }
    };

    this.typingEngine.onFinish = (summary) => {
      this.timer.stop();
      if (this.isRaceMode && this.raceOpponentType === "bot") {
        this.botRacer.stop();
      }

      const elapsed = this.timer.getElapsedSeconds();
      const grossWpm = Metrics.getGrossWPM(summary.totalTyped, elapsed);
      const netWpm = Metrics.getNetWPM(summary.totalTyped, summary.incorrect, elapsed);
      const accuracy = Metrics.getAccuracy(summary.correct, summary.totalTyped);
      const cpm = Metrics.getCPM(summary.correct, elapsed);
      const consistency = Metrics.getConsistency(this.speedTimeline);

      const fullResult = {
        grossWpm,
        netWpm,
        accuracy,
        cpm,
        consistency,
        time: elapsed,
        totalErrors: summary.totalErrors,
        mode: this.mode,
        modeValue: this.modeValue,
        language: this.language,
        speedTimeline: this.speedTimeline,
        errorTimeline: this.errorTimeline
      };

      // Broadcast finish to peer if multiplayer
      if (this.isRaceMode && this.raceOpponentType === "peer") {
        this.peerManager.broadcastFinish(netWpm, accuracy, elapsed);
      }

      const { isNewPb } = StorageManager.saveTestResult(fullResult);
      this.modals.showResults(fullResult, isNewPb);
    };
  }

  _setupMultiplayerCallbacks() {
    this.botRacer.onProgress = (data) => {
      this._updateOpponentTrack(data.progress, data.liveWpm);
    };

    this.peerManager.onPeerReady = (id) => {
      this.raceRoomCodeTag.textContent = `#${id}`;
    };

    this.peerManager.onConnected = (info) => {
      this.raceOpponentType = "peer";
      this.isRaceMode = true;
      this.raceSection.classList.add("active");
      this.opponentNameDisplay.textContent = info.name || "Do'stingiz";
      this.opponentAvatar.textContent = "⚡";
      this.raceModeLabel.textContent = "Do'st bilan poyga";
      this.modals.closeAll();

      if (info.isHost) {
        // Generate seed and send to guest
        const seed = Math.floor(Math.random() * 100000);
        this.peerManager.send({
          type: "RACE_CONFIG",
          seed,
          mode: this.mode,
          modeValue: this.modeValue,
          language: this.language
        });
        this.resetTest(seed);
      }
    };

    this.peerManager.onRaceStart = (config) => {
      this.mode = config.mode;
      this.modeValue = config.modeValue;
      this.language = config.language;
      this._updateControlPillsUI();
      this.resetTest(config.seed);
    };

    this.peerManager.onRemoteProgress = (data) => {
      this._updateOpponentTrack(data.progress, data.liveWpm);
    };

    this.peerManager.onDisconnected = () => {
      alert("Raqib aloqasi uzildi.");
      this.leaveRace();
    };
  }

  startBotRace() {
    this.isRaceMode = true;
    this.raceOpponentType = "bot";
    this.raceSection.classList.add("active");
    this.raceModeLabel.textContent = `AI Bot Poygasi (${this.botSpeed} WPM)`;
    this.raceRoomCodeTag.textContent = "";
    this.opponentNameDisplay.textContent = `TigerBot (${this.botSpeed} WPM)`;
    this.opponentAvatar.textContent = "🤖";
    this.resetTest();
  }

  leaveRace() {
    this.isRaceMode = false;
    this.raceOpponentType = "none";
    this.raceSection.classList.remove("active");
    this.botRacer.stop();
    this.peerManager.disconnect();
    this.resetTest();
  }

  createPeerRoom() {
    this.peerManager.init().then((roomId) => {
      this.isRaceMode = true;
      this.raceOpponentType = "peer";
      this.raceSection.classList.add("active");
      this.raceModeLabel.textContent = "Xona kutilmoqda...";
      this.raceRoomCodeTag.textContent = `#${roomId}`;
      this.modals.closeAll();
      alert(`Xona yaratildi! Havola yoki xona kodi orqali do'stingizni taklif qiling:\n${roomId}`);
    }).catch(err => {
      alert("Peer serverga ulanishda xatolik: " + err.message);
    });
  }

  joinPeerRoom(code) {
    this.peerManager.joinRoom(code).then(() => {
      this.modals.closeAll();
    }).catch(err => {
      alert("Xonaga ulanib bo'lmadi: " + err.message);
    });
  }

  _checkURLParamsForRoom() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get("room");
    if (room) {
      setTimeout(() => {
        this.joinPeerRoom(room);
      }, 500);
    }
  }

  resetTest(seed = null) {
    this.timer.stop();
    this.botRacer.stop();

    // Determine word count
    let wordCount = 30;
    if (this.mode === "words") {
      wordCount = this.modeValue;
    } else {
      // Time mode generates enough buffer words (approx 2.5 words per second)
      wordCount = Math.max(40, Math.ceil(this.modeValue * 2.5));
    }

    const words = WordBank.generateWords(this.language, wordCount, seed);
    this.typingEngine.loadWords(words);

    // Reset HUD
    this.hudTimer.textContent = this.mode === "time" ? this.modeValue : "0";
    this.hudTimerLabel.textContent = this.mode === "time" ? "sekund" : "soniya";
    this.hudWpm.textContent = "0";
    this.hudAcc.textContent = "100%";

    // Reset Race tracks
    this._updatePlayerTrack(0, 0);
    this._updateOpponentTrack(0, 0);

    this.typingInput.value = "";
  }

  _updateLiveMetrics(elapsedSec) {
    const netWpm = Metrics.getNetWPM(
      this.typingEngine.totalTypedChars,
      this.typingEngine.incorrectChars + this.typingEngine.extraChars,
      elapsedSec
    );
    const accuracy = Metrics.getAccuracy(
      this.typingEngine.correctChars,
      this.typingEngine.totalTypedChars
    );

    this.hudWpm.textContent = netWpm;
    this.hudAcc.textContent = `${accuracy}%`;
  }

  _updatePlayerTrack(progress, liveWpm) {
    const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
    this.playerTrackFill.style.width = `${pct}%`;
    this.playerRunner.style.left = `${pct}%`;
    this.playerLiveWpm.textContent = `${liveWpm} WPM`;
  }

  _updateOpponentTrack(progress, liveWpm) {
    const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));
    this.opponentTrackFill.style.width = `${pct}%`;
    this.opponentRunner.style.left = `${pct}%`;
    this.opponentLiveWpm.textContent = `${liveWpm} WPM`;
  }

  _updateSoundButtonUI() {
    const profiles = {
      blue: "Clicky Blue",
      red: "Linear Red",
      brown: "Tactile Brown",
      off: "Ovoz O'chiq"
    };
    const label = document.getElementById("sound-label");
    const btn = document.getElementById("sound-toggle-btn");
    if (label) label.textContent = profiles[this.currentSwitch] || "Ovoz";
    if (btn) {
      if (this.currentSwitch === "off") {
        btn.classList.remove("active");
        btn.style.opacity = "0.5";
      } else {
        btn.classList.add("active");
        btn.style.opacity = "1";
      }
    }
  }

  _updateControlPillsUI() {
    // Language
    document.querySelectorAll("#lang-selector .pill-option").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === this.language);
    });

    // Mode
    document.querySelectorAll("#mode-type-selector .pill-option").forEach((b) => {
      b.classList.toggle("active", b.dataset.modeType === this.mode);
    });

    this._updateModeValuesPillOptions();
  }

  _updateModeValuesPillOptions() {
    const container = document.getElementById("mode-val-selector");
    if (!container) return;

    const values = this.mode === "time" ? CONFIG.TIME_MODES : CONFIG.WORD_MODES;
    if (!values.includes(this.modeValue)) {
      this.modeValue = values[1] || values[0];
    }

    container.innerHTML = "";
    values.forEach((val) => {
      const btn = document.createElement("button");
      btn.className = `pill-option ${val === this.modeValue ? "active" : ""}`;
      btn.dataset.val = val;
      btn.textContent = val;
      container.appendChild(btn);
    });
  }

  _savePrefs() {
    StorageManager.savePreferences({
      language: this.language,
      mode: this.mode,
      modeValue: this.modeValue,
      currentSwitch: this.currentSwitch
    });
  }
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.tigerTypeApp = new TigerTypeApp();
});
