/**
 * High-performance animated caret renderer with hardware-accelerated transforms
 */
export class CaretRenderer {
  constructor(caretElement, containerElement) {
    this.caret = caretElement;
    this.container = containerElement;
    this.idleTimer = null;
    this.lastTarget = null;
  }

  updatePosition(targetElement, isEndOfWord = false) {
    if (!this.caret || !this.container) return;
    if (!targetElement) return;

    this.lastTarget = { targetElement, isEndOfWord };

    const parentRect = this.container.getBoundingClientRect();
    const charRect = targetElement.getBoundingClientRect();

    let targetX = 0;
    let targetY = 0;

    if (isEndOfWord) {
      targetX = charRect.right - parentRect.left;
      targetY = charRect.top - parentRect.top;
    } else {
      targetX = charRect.left - parentRect.left;
      targetY = charRect.top - parentRect.top;
    }

    // Adjust for scroll offset inside container if any
    targetY += this.container.scrollTop;

    this.caret.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;

    // Stop blinking while actively typing
    this.caret.classList.remove("blink");
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.caret.classList.add("blink");
    }, 500);
  }

  recalculate() {
    if (this.lastTarget) {
      this.updatePosition(this.lastTarget.targetElement, this.lastTarget.isEndOfWord);
    }
  }

  hide() {
    if (this.caret) this.caret.style.opacity = "0";
  }

  show() {
    if (this.caret) {
      this.caret.style.opacity = "1";
      this.caret.classList.add("blink");
    }
  }
}
