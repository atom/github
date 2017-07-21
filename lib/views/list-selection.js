import {autobind} from 'core-decorators';

const COPY = {};

export default class ListSelection {
  constructor(options = {}) {
    if (options._copy !== COPY) {
      this.options = {
        isItemSelectable: options.isItemSelectable || (item => item && true),
      };
      this.setItems(options.items || []);
    } else {
      this.options = {
        isItemSelectable: options.isItemSelectable,
      };
      this.items = options.items;
      this.selections = options.selections;
    }
  }

  copy() {
    // Deep-copy selections because it will be modified.
    // (That's temporary, until ListSelection is changed to be immutable, too.)
    return new ListSelection({
      _copy: COPY,
      isItemSelectable: this.options.isItemSelectable,
      items: this.items,
      selections: this.selections.map(({head, tail, negate}) => ({head, tail, negate})),
    });
  }

  @autobind
  isItemSelectable(item) {
    return this.options.isItemSelectable(item);
  }

  setItems(items) {
    let newSelectionIndex;
    if (this.selections && this.selections.length > 0) {
      const [{head, tail}] = this.selections;
      newSelectionIndex = Math.min(head, tail, items.length - 1);
    } else {
      newSelectionIndex = 0;
    }

    this.items = items;
    if (items.length > 0) {
      this.selections = [{head: newSelectionIndex, tail: newSelectionIndex}];
    } else {
      this.selections = [];
    }
  }

  getItems() {
    return this.items;
  }

  getLastItem() {
    return this.items[this.items.length - 1];
  }

  selectFirstItem(preserveTail) {
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      if (this.isItemSelectable(item)) {
        this.selectItem(item, preserveTail);
        break;
      }
    }
  }

  selectLastItem(preserveTail) {
    for (let i = this.items.length - 1; i > 0; i--) {
      const item = this.items[i];
      if (this.isItemSelectable(item)) {
        this.selectItem(item, preserveTail);
        break;
      }
    }
  }

  selectAllItems() {
    this.selectFirstItem();
    this.selectLastItem(true);
  }

  selectNextItem(preserveTail) {
    if (this.selections.length === 0) {
      this.selectFirstItem();
      return;
    }

    let itemIndex = this.selections[0].head;
    let nextItemIndex = itemIndex;
    while (itemIndex < this.items.length - 1) {
      itemIndex++;
      if (this.isItemSelectable(this.items[itemIndex])) {
        nextItemIndex = itemIndex;
        break;
      }
    }

    this.selectItem(this.items[nextItemIndex], preserveTail);
  }

  selectPreviousItem(preserveTail) {
    if (this.selections.length === 0) {
      this.selectLastItem();
      return;
    }

    let itemIndex = this.selections[0].head;
    let previousItemIndex = itemIndex;

    while (itemIndex > 0) {
      itemIndex--;
      if (this.isItemSelectable(this.items[itemIndex])) {
        previousItemIndex = itemIndex;
        break;
      }
    }

    this.selectItem(this.items[previousItemIndex], preserveTail);
  }

  selectItem(item, preserveTail, addOrSubtract) {
    if (addOrSubtract && preserveTail) {
      throw new Error('addOrSubtract and preserveTail cannot both be true at the same time');
    }

    const itemIndex = this.items.indexOf(item);
    if (preserveTail && this.selections[0]) {
      this.selections[0].head = itemIndex;
    } else {
      const selection = {head: itemIndex, tail: itemIndex};
      if (addOrSubtract) {
        if (this.getSelectedItems().has(item)) { selection.negate = true; }
        this.selections.unshift(selection);
      } else {
        this.selections = [selection];
      }
    }
  }

  addOrSubtractSelection(item) {
    this.selectItem(item, false, true);
  }

  coalesce() {
    if (this.selections.length === 0) { return; }

    const mostRecent = this.selections[0];
    let mostRecentStart = Math.min(mostRecent.head, mostRecent.tail);
    let mostRecentEnd = Math.max(mostRecent.head, mostRecent.tail);
    while (mostRecentStart > 0 && !this.isItemSelectable(this.items[mostRecentStart - 1])) {
      mostRecentStart--;
    }
    while (mostRecentEnd < (this.items.length - 1) && !this.isItemSelectable(this.items[mostRecentEnd + 1])) {
      mostRecentEnd++;
    }

    for (let i = 1; i < this.selections.length;) {
      const current = this.selections[i];
      const currentStart = Math.min(current.head, current.tail);
      const currentEnd = Math.max(current.head, current.tail);
      if (mostRecentStart <= currentEnd + 1 && currentStart - 1 <= mostRecentEnd) {
        if (mostRecent.negate) {
          const truncatedSelections = [];
          if (current.head > current.tail) {
            if (currentEnd > mostRecentEnd) { // suffix
              truncatedSelections.push({tail: mostRecentEnd + 1, head: currentEnd});
            }
            if (currentStart < mostRecentStart) { // prefix
              truncatedSelections.push({tail: currentStart, head: mostRecentStart - 1});
            }
          } else {
            if (currentStart < mostRecentStart) { // prefix
              truncatedSelections.push({head: currentStart, tail: mostRecentStart - 1});
            }
            if (currentEnd > mostRecentEnd) { // suffix
              truncatedSelections.push({head: mostRecentEnd + 1, tail: currentEnd});
            }
          }
          this.selections.splice(i, 1, ...truncatedSelections);
          i += truncatedSelections.length;
        } else {
          mostRecentStart = Math.min(mostRecentStart, currentStart);
          mostRecentEnd = Math.max(mostRecentEnd, currentEnd);
          if (mostRecent.head >= mostRecent.tail) {
            mostRecent.head = mostRecentEnd;
            mostRecent.tail = mostRecentStart;
          } else {
            mostRecent.head = mostRecentStart;
            mostRecent.tail = mostRecentEnd;
          }
          this.selections.splice(i, 1);
        }
      } else {
        i++;
      }
    }

    if (mostRecent.negate) { this.selections.shift(); }
  }

  getSelectedItems() {
    const selectedItems = new Set();
    for (const {head, tail, negate} of this.selections.slice().reverse()) {
      const start = Math.min(head, tail);
      const end = Math.max(head, tail);
      for (let i = start; i <= end; i++) {
        const item = this.items[i];
        if (this.isItemSelectable(item)) {
          if (negate) {
            selectedItems.delete(item);
          } else {
            selectedItems.add(item);
          }
        }
      }
    }
    return selectedItems;
  }

  getHeadItem() {
    return this.selections.length > 0 ? this.items[this.selections[0].head] : null;
  }

  getMostRecentSelectionStartIndex() {
    const selection = this.selections[0];
    return Math.min(selection.head, selection.tail);
  }

  getTailIndex() {
    return this.selections[0] ? this.selections[0].tail : null;
  }
}
