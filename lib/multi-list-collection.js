/** @babel */

import MultiList from './multi-list'

export default class MultiListCollection {
  constructor (lists, didChangeSelection) {
    this.list = new MultiList(lists, (item, key) => {
      didChangeSelection && didChangeSelection(item, key)
    })
    const selectedKey = this.list.getActiveListKey()
    const selectedItem = this.list.getActiveItem()
    this.selectedKeys = new Set(selectedKey ? [selectedKey] : [])
    this.selectedItems = new Set(selectedItem ? [selectedItem] : [])
  }

  updateLists (lists, {suppressCallback} = {}) {
    const listKeys = this.list.getListKeys()

    let oldActiveListIndex, oldActiveListItemIndex
    for (let i = 0; i < listKeys.length; i++) {
      const key = listKeys[i]
      if (this.selectedKeys.has(key)) {
        oldActiveListIndex = i
        const items = this.getItemsForKey(key)
        for (let j = 0; j < items.length; j++) {
          const item = items[j]
          if (this.selectedItems.has(item)) {
            oldActiveListItemIndex = j
            break
          }
        }
        break
      }
    }

    this.list.updateLists(lists, {suppressCallback, oldActiveListIndex, oldActiveListItemIndex})
    this.updateSelections()
  }

  clearSelectedItems () {
    this.selectedItems = new Set()
  }

  clearSelectedKeys () {
    this.selectedKeys = new Set()
  }

  getSelectedItems () {
    return this.selectedItems
  }

  getSelectedKeys () {
    return this.selectedKeys
  }

  getItemsForKey (key) {
    return this.list.getItemsForKey(key)
  }

  getLastSelectedListKey () {
    return this.list.getActiveListKey()
  }

  getLastSelectedItem () {
    return this.list.getActiveItem()
  }

  selectNextList ({wrap, addToExisting} = {}) {
    this.list.activateNextList({wrap})
    this.updateSelections({addToExisting})
  }

  selectPreviousList ({wrap, addToExisting} = {}) {
    this.list.activatePreviousList({wrap})
    this.updateSelections({addToExisting})
  }

  selectNextItem ({addToExisting, stopAtBounds} = {}) {
    this.list.activateNextItem({stopAtBounds})
    this.updateSelections({addToExisting})
  }

  selectPreviousItem ({addToExisting, stopAtBounds} = {}) {
    this.list.activatePreviousItem({stopAtBounds})
    this.updateSelections({addToExisting})
  }

  updateSelections ({addToExisting} = {}) {
    const selectedKey = this.list.getActiveListKey()
    const selectedItem = this.list.getActiveItem()
    this.selectItems(selectedItem ? [selectedItem] : [], {addToExisting, suppressCallback: true})
    this.selectKeys(selectedKey ? [selectedKey] : [], {addToExisting, suppressCallback: true})
  }

  selectItems (items, {addToExisting, suppressCallback} = {}) {
    if (!addToExisting) this.clearSelectedItems()
    items.forEach(item => this.selectedItems.add(item))
    this.list.activateItem(items[0], {suppressCallback})
  }

  selectKeys (keys, {addToExisting, suppressCallback} = {}) {
    if (!addToExisting) this.clearSelectedKeys()
    keys.forEach(key => this.selectedKeys.add(key))
    this.list.activateListForKey(keys[0], {suppressCallback})
  }

  selectAllItemsForKey (key, addToExisting) {
    this.selectKeys([key], {addToExisting})
    this.selectItems(this.list.getItemsForKey(key), {addToExisting})
  }

  selectFirstItemForKey (key, {addToExisting} = {}) {
    this.selectKeys([key], {addToExisting})
    this.selectItems([this.list.getItemsForKey(key)[0]], {addToExisting})
  }

  selectItemsAndKeysInRange (endPoint1, endPoint2, addToExisting) {
    if (!addToExisting) {
      this.clearSelectedItems()
      this.clearSelectedKeys()
    }
    // TODO: optimize
    const listKeys = this.list.getListKeys()
    const index1 = listKeys.indexOf(endPoint1.key)
    const index2 = listKeys.indexOf(endPoint2.key)

    if (index1 < 0) throw new Error(`key "${endPoint1.key}" not found`)
    if (index2 < 0) throw new Error(`key "${endPoint2.key}" not found`)
    let startPoint, endPoint, startKeyIndex, endKeyIndex
    if (index1 < index2) {
      startPoint = endPoint1
      endPoint = endPoint2
      startKeyIndex = index1
      endKeyIndex = index2
    } else {
      startPoint = endPoint2
      endPoint = endPoint1
      startKeyIndex = index2
      endKeyIndex = index1
    }
    const startItemIndex = this.list.getItemIndexForKey(startPoint.key, startPoint.item)
    const endItemIndex = this.list.getItemIndexForKey(endPoint.key, endPoint.item)
    if (startItemIndex < 0) throw new Error(`item "${startPoint.item}" not found`)
    if (endItemIndex < 0) throw new Error(`item "${endPoint.item}" not found`)

    if (startKeyIndex === endKeyIndex) {
      const items = this.list.getItemsForKey(listKeys[startKeyIndex])
      const indexes = [startItemIndex, endItemIndex].sort((a, b) => a - b)
      this.selectKeys([startPoint.key], {addToExisting: true, suppressCallback: true})
      this.selectItems(items.slice(indexes[0], indexes[1] + 1), {addToExisting: true})
      return
    }

    for (let i = startKeyIndex; i <= endKeyIndex; i++) {
      const key = listKeys[i]
      const items = this.list.getItemsForKey(key)
      if (i === startKeyIndex) {
        this.selectItems(items.slice(startItemIndex), {addToExisting: true})
      } else if (i === endKeyIndex) {
        this.selectItems(items.slice(0, endItemIndex + 1), {addToExisting: true})
      } else {
        this.selectItems(items, {addToExisting: true})
      }
    }
    const keys = listKeys.slice(startKeyIndex, endKeyIndex - startKeyIndex + 1)
    this.selectKeys(keys, {addToExisting: true, suppressCallback: true})
  }
}
