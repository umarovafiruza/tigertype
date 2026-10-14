import { englishWords } from "../../words/english.js";
import { uzbekWords } from "../../words/uzbek.js";
import { codeTokens } from "../../words/code.js";

export class WordBank {
  static getList(languageId) {
    switch (languageId) {
      case "uzbek":
        return uzbekWords;
      case "code":
        return codeTokens;
      case "english":
      default:
        return englishWords;
    }
  }

  /**
   * Generates a randomized list of words for the test
   * @param {string} languageId 
   * @param {number} count 
   * @param {number|null} seed - Optional PRNG seed for deterministic multiplayer sync
   */
  static generateWords(languageId = "english", count = 30, seed = null) {
    const list = this.getList(languageId);
    const result = [];

    // Simple Linear Congruential Generator if seed is supplied
    let currentSeed = seed !== null ? seed : null;
    const random = () => {
      if (currentSeed === null) return Math.random();
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };

    let prevWord = "";
    for (let i = 0; i < count; i++) {
      let word;
      do {
        const index = Math.floor(random() * list.length);
        word = list[index];
      } while (word === prevWord && list.length > 1);

      result.push(word);
      prevWord = word;
    }

    return result;
  }
}
