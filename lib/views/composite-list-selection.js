/** @babel */

import ListSelection from './list-selection'

export default class CompositeListSelection {
  constructor ({listsByKey, idForItem}) {
    this.keysBySelection = new Map()
    this.selections = []
    this.idForItem = idForItem || (item => item)

    for (const key in listsByKey) {
      const selection = new ListSelection({items: listsByKey[key]})
      this.keysBySelection.set(selection, key)
      this.selections.push(selection)
    }

    this.activeSelectionIndex = 0
  }

  updateLists (listsByKey) {
    const keys = Object.keys(listsByKey)
    for (let i = 0; i < keys.length; i++) {
      const newItems = listsByKey[keys[i]]
      const selection = this.selections[i]
      const oldHeadItem = selection.getHeadItem()
      selection.setItems(newItems)
      const newHeadItem = oldHeadItem ? newItems.find(item => this.idForItem(item) === this.idForItem(oldHeadItem)) : null
      if (newHeadItem) selection.selectItem(newHeadItem)
    }
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
    for (let i = this.activeSelectionIndex + 1; i < this.selections.length; i++) {
      if (this.selections[i].getItems().length > 0) {
        this.activeSelectionIndex = i
        return true
      }
    }
    return false
  }

  activatePreviousList () {
    for (let i = this.activeSelectionIndex - 1; i >= 0; i--) {
      if (this.selections[i].getItems().length > 0) {
        this.activeSelectionIndex = i
        return true
      }
    }
    return false
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
      if (this.activatePreviousList()) this.getActiveSelection().selectLastItem()
    } else {
      this.getActiveSelection().selectPreviousItem(preserveTail)
    }
  }
}
