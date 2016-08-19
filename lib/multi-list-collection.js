/** @babel */

import MultiList from './multi-list'

export default class MultiListCollection {
  constructor (lists) {
    this.list = new MultiList(lists)
    const selectedKey = this.list.getSelectedListKey()
    const selectedItem = this.list.getSelectedItem()
    this.selectedKeys = new Set(selectedKey ? [selectedKey] : [])
    this.selectedItems = new Set(selectedItem ? [selectedItem] : [])
  }

  updateLists (lists) {
    // TODO: Store selections??
    this.list.updateLists(lists)
    this.updateSelections()
  }

  getLastSelectedListKey () {
    return this.list.getSelectedListKey()
  }

  selectItems (items, addToExisting) {
    if (!addToExisting) this.clearSelectedItems()
    items.forEach(item => this.selectedItems.add(item))
    this.list.selectItem(items[items.length - 1])
  }

  selectKeys (keys, addToExisting) {
    if (!addToExisting) this.clearSelectedKeys()
    keys.forEach(key => this.selectedKeys.add(key))
    this.list.selectListForKey(keys[keys.length - 1])
  }

  selectAllItemsForKey (key, addToExisting) {
    if (!addToExisting) this.clearSelections()
    this.selectedKeys.add(key)
    this.selectItems(this.list.getItemsForKey(key), true)
  }

  selectFirstItemForKey (key, addToExisting) {
    if (!addToExisting) this.clearSelections()
    this.selectedKeys.add(key)
    this.selectItems([this.list.getItemsForKey(key)[0]], true)
    // this.selectItemAtIndexForKey(key, 0)
  }

  clearSelections () {
    this.clearSelectedItems()
    this.clearSelectedKeys()
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

  selectItemsAndKeysInRange (endPoint1, endPoint2, addToExisting) {
    if (!addToExisting) this.clearSelections()
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
      const indexes = [startItemIndex, endItemIndex].sort()
      this.selectKeys([startPoint.key], true)
      this.selectItems(items.slice(indexes[0], indexes[1] + 1), true)
      return
    }

    for (let i = startKeyIndex; i <= endKeyIndex; i++) {
      const key = listKeys[i]
      this.selectKeys([key], true)
      const items = this.list.getItemsForKey(key)
      if (i === startKeyIndex) {
        this.selectItems(items.slice(startItemIndex), true)
      } else if (i === endKeyIndex) {
        this.selectItems(items.slice(0, endItemIndex + 1), true)
      } else {
        this.selectItems(items, true)
      }
    }
  }

  selectNextList ({wrap} = {}) {
    this.list.selectNextList({wrap})
    this.updateSelections()
  }

  selectPreviousList ({wrap} = {}) {
    this.list.selectPreviousList({wrap})
    this.updateSelections()
  }

  updateSelections () {
    const selectedKey = this.list.getSelectedListKey()
    const selectedItem = this.list.getSelectedItem()
    this.selectItems(selectedItem ? [selectedItem] : [])
    this.selectKeys(selectedKey ? [selectedKey] : [])
  }

  selectNextItem () {
    this.list.selectNextItem()
    this.updateSelections()
  }

  selectPreviousItem () {
    this.list.selectPreviousItem()
    this.updateSelections()
  }
}
