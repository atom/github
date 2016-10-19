/** @babel */

import ListSelection from './list-selection'

export default class CompositeListSelection {
  constructor (listsByKey) {
    this.keysBySelection = new Map()
    this.selections = []

    for (const key in listsByKey) {
      const selection = new ListSelection({items: listsByKey[key]})
      this.keysBySelection.set(selection, key)
      this.selections.push(selection)
    }

    this.activeSelectionIndex = 0
  }

  getActiveListKey () {
    return this.keysBySelection.get(this.getActiveSelection())
  }

  getSelectedItems () {
    return this.getActiveSelection().getSelectedItems()
  }

  getActiveSelection () {
    return this.selections[this.activeSelectionIndex]
  }

  activateNextSelection () {
    if (this.activeSelectionIndex < this.selections.length - 1) {
      this.activeSelectionIndex++
      return true
    } else {
      return false
    }
  }

  activatePreviousSelection () {
    if (this.activeSelectionIndex > 0) {
      this.activeSelectionIndex--
      return true
    } else {
      return false
    }
  }

  selectNextItem () {
    if (this.getActiveSelection().getHeadItem() === this.getActiveSelection().getLastItem()) {
      if (this.activateNextSelection()) this.getActiveSelection().selectFirstItem()
    } else {
      this.getActiveSelection().selectNextItem()
    }
  }

  selectPreviousItem () {
    if (this.getActiveSelection().getHeadItem() === this.getActiveSelection().getItems()[0]) {
      if (this.activatePreviousSelection()) this.getActiveSelection().selectLastItem()
    } else {
      this.getActiveSelection().selectPreviousItem()
    }
  }
}
