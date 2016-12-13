/** @babel */

import ListSelection from './list-selection';

export default class CompositeListSelection {
  constructor({listsByKey, idForItem}) {
    this.keysBySelection = new Map();
    this.selections = [];
    this.idForItem = idForItem || (item => item);

    for (const key in listsByKey) {
      const selection = new ListSelection({items: listsByKey[key]});
      this.keysBySelection.set(selection, key);
      this.selections.push(selection);
    }

    this.selectFirstNonEmptyList();
  }

  updateLists(listsByKey) {
    const keys = Object.keys(listsByKey);
    for (let i = 0; i < keys.length; i++) {
      const newItems = listsByKey[keys[i]];
      const selection = this.selections[i];
      const oldHeadItem = selection.getHeadItem();
      selection.setItems(newItems);
      let newHeadItem = null;
      if (oldHeadItem) {
        newHeadItem = newItems.find(item => this.idForItem(item) === this.idForItem(oldHeadItem));
      }
      if (newHeadItem) { selection.selectItem(newHeadItem); }
    }
    if (this.getActiveSelection().getItems().length === 0) {
      this.activateNextSelection() || this.activatePreviousSelection();
    }
  }

  selectFirstNonEmptyList() {
    this.activeSelectionIndex = 0;
    for (let i = 0; i < this.selections.length; i++) {
      if (this.selections[i].getItems().length) {
        this.activeSelectionIndex = i;
        break;
      }
    }
  }

  getActiveListKey() {
    return this.keysBySelection.get(this.getActiveSelection());
  }

  getSelectedItems() {
    return this.getActiveSelection().getSelectedItems();
  }

  getHeadItem() {
    return this.getActiveSelection().getHeadItem();
  }

  getActiveSelection() {
    return this.selections[this.activeSelectionIndex];
  }

  activateSelection(selection) {
    const index = this.selections.indexOf(selection);
    if (index === -1) { throw new Error('Selection not found'); }
    this.activeSelectionIndex = index;
  }

  activateNextSelection() {
    for (let i = this.activeSelectionIndex + 1; i < this.selections.length; i++) {
      if (this.selections[i].getItems().length > 0) {
        this.activeSelectionIndex = i;
        return true;
      }
    }
    return false;
  }

  activatePreviousSelection() {
    for (let i = this.activeSelectionIndex - 1; i >= 0; i--) {
      if (this.selections[i].getItems().length > 0) {
        this.activeSelectionIndex = i;
        return true;
      }
    }
    return false;
  }

  activateLastSelection() {
    for (let i = this.selections.length - 1; i >= 0; i--) {
      if (this.selections[i].getItems().length > 0) {
        this.activeSelectionIndex = i;
        return true;
      }
    }
    return false;
  }

  selectItem(item, preserveTail = false) {
    const selection = this.selectionForItem(item);
    if (!selection) { throw new Error(`No item found: ${item}`); }
    if (!preserveTail) { this.activateSelection(selection); }
    if (selection === this.getActiveSelection()) { selection.selectItem(item, preserveTail); }
  }

  addOrSubtractSelection(item) {
    const selection = this.selectionForItem(item);
    if (!selection) { throw new Error(`No item found: ${item}`); }

    if (selection === this.getActiveSelection()) {
      selection.addOrSubtractSelection(item);
    } else {
      this.activateSelection(selection);
      selection.selectItem(item);
    }
  }

  selectAllItems() {
    this.getActiveSelection().selectAllItems();
  }

  selectFirstItem(preserveTail) {
    this.getActiveSelection().selectFirstItem(preserveTail);
  }

  selectLastItem(preserveTail) {
    this.getActiveSelection().selectLastItem(preserveTail);
  }

  coalesce() {
    this.getActiveSelection().coalesce();
  }

  selectionForItem(item) {
    return this.selections.find(selection => selection.getItems().indexOf(item) > -1);
  }

  listKeyForItem(item) {
    return this.keysBySelection.get(this.selectionForItem(item));
  }

  selectNextItem(preserveTail = false) {
    if (!preserveTail && this.getActiveSelection().getHeadItem() === this.getActiveSelection().getLastItem()) {
      if (this.activateNextSelection()) {
        this.getActiveSelection().selectFirstItem();
      } else {
        this.getActiveSelection().selectLastItem();
      }
    } else {
      this.getActiveSelection().selectNextItem(preserveTail);
    }
  }

  selectPreviousItem(preserveTail = false) {
    if (!preserveTail && this.getActiveSelection().getHeadItem() === this.getActiveSelection().getItems()[0]) {
      if (this.activatePreviousSelection()) {
        this.getActiveSelection().selectLastItem();
      } else {
        this.getActiveSelection().selectFirstItem();
      }
    } else {
      this.getActiveSelection().selectPreviousItem(preserveTail);
    }
  }
}
