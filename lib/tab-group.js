/**
 * Assign successive, distinct tabIndex values to DOM elements.
 */
export default class TabGroup {
  constructor() {
    this.index = 1;

    for (const element of document.querySelectorAll('[tabindex]')) {
      if (element.disabled) {
        continue;
      }

      if (element.tabIndex < 0) {
        continue;
      }

      if (element.tabIndex > this.index) {
        this.index = element.tabIndex + 1;
      }
    }

    this.startIndex = this.index;
  }

  nextIndex() {
    const i = this.index;
    this.index++;
    return i;
  }

  focusBeginning() {
    const element = document.querySelector(`[tabIndex="${this.startIndex}"]`);
    if (element) {
      element.focus();
    }
  }
}
