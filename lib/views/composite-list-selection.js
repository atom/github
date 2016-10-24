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

  activateSelection (selection) {
    const index = this.selections.indexOf(selection)
    if (index === -1) throw new Error('Selection not found')
    this.activeSelectionIndex = index
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

  selectItem (item, preserveTail = false) {
    const selection = this.selectionForItem(item)
    if (!selection) throw new Error(`No item found: ${item}`)
    if (!preserveTail) this.activateSelection(selection)
    if (selection === this.getActiveSelection()) selection.selectItem(item, preserveTail)
  }

  selectionForItem (item) {
    return this.selections.find(selection => selection.getItems().indexOf(item) > -1)
  }

  selectNextItem (preserveTail = false) {
    if (!preserveTail && this.getActiveSelection().getHeadItem() === this.getActiveSelection().getLastItem()) {
      if (this.activateNextSelection()) this.getActiveSelection().selectFirstItem()
    } else {
      this.getActiveSelection().selectNextItem(preserveTail)
    }
  }

  selectPreviousItem (preserveTail = false) {
    if (!preserveTail && this.getActiveSelection().getHeadItem() === this.getActiveSelection().getItems()[0]) {
      if (this.activatePreviousSelection()) this.getActiveSelection().selectLastItem()
    } else {
      this.getActiveSelection().selectPreviousItem(preserveTail)
    }
  }
}
