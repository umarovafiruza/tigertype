/**
 * TigerType Configuration & Global Constants
 */
export const CONFIG = {
  APP_NAME: "TigerType",
  DEFAULT_MODE: "time", // "time" | "words"
  DEFAULT_TIME: 30, // seconds
  DEFAULT_WORDS: 25, // count
  DEFAULT_LANGUAGE: "english", // "english" | "uzbek" | "code"
  
  TIME_MODES: [15, 30, 60],
  WORD_MODES: [10, 25, 50, 100],
  LANGUAGES: [
    { id: "english", label: "English" },
    { id: "uzbek", label: "O'zbek" },
    { id: "code", label: "Code Syntax" }
  ],

  SWITCH_PROFILES: [
    { id: "off", label: "Mute" },
    { id: "blue", label: "Clicky Blue" },
    { id: "red", label: "Linear Red" },
    { id: "brown", label: "Tactile Brown" }
  ],
  DEFAULT_SWITCH: "blue",

  BOT_SPEEDS: [30, 60, 85, 110], // WPM choices
  DEFAULT_BOT_WPM: 65,

  PEER_CONFIG: {
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }
  }
};
