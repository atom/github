class TabIndexSequence {
  constructor(startIndex, reserved) {
    this.startIndex = startIndex;
    this.currentIndex = startIndex;
    this.reserved = reserved;
  }

  nextIndex() {
    const i = this.currentIndex;
    this.currentIndex++;
    this.checkRange();
    return i;
  }

  reset() {
    this.currentIndex = this.startIndex;
  }

  advance(count) {
    this.currentIndex += count;
    this.checkRange();
  }

  checkRange() {
    if (this.currentIndex - this.startIndex > this.reserved) {
      throw new Error('Tab index out of range');
    }
  }
}

const SEQUENCE = Symbol('sequence');

/**
 * Assign successive, distinct tabIndex values to DOM elements.
 */
export default class TabGroup {
  constructor(options = {}) {
    if (options[SEQUENCE]) {
      this.startIndex = null;
      this.sequence = options[SEQUENCE];
    } else {
      this.startIndex = 1;
      for (const element of document.querySelectorAll('[tabindex]')) {
        if (element.disabled) {
          continue;
        }

        if (element.tabIndex < 0) {
          continue;
        }

        if (element.tabIndex > this.startIndex) {
          this.startIndex = element.tabIndex + 1;
        }
      }
      this.sequence = new TabIndexSequence(this.startIndex, Infinity);
    }
  }

  reset() {
    this.sequence.reset();
  }

  nextIndex() {
    return this.sequence.nextIndex();
  }

  reserve(count) {
    const childSequence = new TabIndexSequence(this.sequence.nextIndex(), count);
    this.sequence.advance(count - 1);
    return new TabGroup({[SEQUENCE]: childSequence});
  }

  focusBeginning() {
    if (this.startIndex === null) {
      return;
    }

    const element = document.querySelector(`[tabIndex="${this.startIndex}"]`);
    if (element) {
      element.focus();
    }
  }
}
