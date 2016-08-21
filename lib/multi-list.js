/** @babel */

const listInfoByKey = new Map()

export default class MultiList {
  constructor (lists, didChangeSelection) {
    this.listOrderByKey = lists.map(list => {
      listInfoByKey.set(list.key, {
        items: list.items,
        selectedItem: list.items[0],
        selectedIndex: 0
      })
      return list.key
    })
    this.didChangeSelection = didChangeSelection
    this.selectedListKey = lists[0].key
  }

  getListKeys () {
    return this.listOrderByKey
  }

  getSelectedListKey () {
    return this.selectedListKey
  }

  getItemsForKey (key) {
    return listInfoByKey.get(key).items
  }

  getItemsInSelectedList () {
    return this.getItemsForKey(this.getSelectedListKey())
  }

  getItemIndexForKey (key, item) {
    const items = this.getItemsForKey(key)
    return items.indexOf(item)
  }

  getSelectedItemForKey (key) {
    if (key === undefined) throw new RangeError()
    return listInfoByKey.get(key).selectedItem
  }

  getSelectedItem () {
    return listInfoByKey.get(this.getSelectedListKey()).selectedItem
  }

  selectListForKey (key, {suppressCallback} = {}) {
    this.selectedListKey = key

    if (this.didChangeSelection && !suppressCallback) {
      this.didChangeSelection(this.getSelectedItem(), this.getSelectedListKey())
    }
  }

  selectItemAtIndexForKey (key, index, {suppressCallback} = {}) {
    this.selectListForKey(key, {suppressCallback: true})
    const listInfo = listInfoByKey.get(key)
    listInfo.selectedIndex = index
    listInfo.selectedItem = listInfo.items[index]

    if (this.didChangeSelection && !suppressCallback) {
      this.didChangeSelection(this.getSelectedItem(), this.getSelectedListKey())
    }
  }

  selectItem (selectedItem, {suppressCallback} = {}) {
    for (const [key, listInfo] of listInfoByKey) {
      for (var index = 0; index < listInfo.items.length; index++) {
        const item = listInfo.items[index]
        if (selectedItem === item) {
          return this.selectItemAtIndexForKey(key, index, {suppressCallback})
        }
      }
    }
  }

  selectNextList ({wrap, selectFirst, suppressCallback} = {}) {
    const listCount = this.listOrderByKey.length
    let index = this.listOrderByKey.indexOf(this.getSelectedListKey()) + 1
    if (wrap && index >= listCount) index = 0
    let listsLeft = listCount - 1
    while (index < listCount && listsLeft && this.getItemsForKey(this.listOrderByKey[index]).length === 0) {
      index++
      if (wrap && index >= listCount) index = 0
      listsLeft--
    }
    if (index < listCount) {
      const key = this.listOrderByKey[index]
      selectFirst ? this.selectItemAtIndexForKey(key, 0, {suppressCallback}) : this.selectListForKey(key, {suppressCallback})
    }
  }

  selectPreviousList ({wrap, selectLast, suppressCallback} = {}) {
    const listCount = this.listOrderByKey.length
    let index = this.listOrderByKey.indexOf(this.getSelectedListKey()) - 1
    if (wrap && index < 0) index = listCount - 1
    let listsLeft = index
    while (index >= 0 && listsLeft && this.getItemsForKey(this.listOrderByKey[index]).length === 0) {
      index--
      if (wrap && index < 0) index = listCount - 1
      listsLeft--
    }
    if (index >= 0) {
      const key = this.listOrderByKey[index]
      if (selectLast) {
        this.selectItemAtIndexForKey(key, this.getItemsForKey(this.listOrderByKey[index]).length - 1, {suppressCallback})
      } else {
        this.selectListForKey(key, {suppressCallback})
      }
    }
  }

  selectNextItem ({wrap} = {}) {
    const key = this.getSelectedListKey()
    const listInfo = listInfoByKey.get(key)
    const newItemIndex = listInfo.selectedIndex + 1
    if (newItemIndex < listInfo.items.length) {
      this.selectItemAtIndexForKey(key, newItemIndex)
    } else {
      this.selectNextList({selectFirst: true, wrap})
    }
  }

  selectPreviousItem ({wrap} = {}) {
    const key = this.getSelectedListKey()
    const listInfo = listInfoByKey.get(key)
    const newItemIndex = listInfo.selectedIndex - 1
    if (newItemIndex >= 0) {
      this.selectItemAtIndexForKey(key, newItemIndex)
    } else {
      this.selectPreviousList({selectLast: true, wrap})
    }
  }

  updateLists (newLists, {suppressCallback} = {}) {
    const oldSelectedItem = this.getSelectedItem()
    const oldSelectedListKey = this.getSelectedListKey()
    const oldSelectedListIndex = this.listOrderByKey.indexOf(oldSelectedListKey)

    this.listOrderByKey = newLists.map(list => {
      const oldInfo = listInfoByKey.get(list.key)
      const key = list.key
      const newListItems = list.items
      let newInfo
      if (oldInfo && newListItems.length > 0) {
        const selectedItemIndex = newListItems.indexOf(oldInfo.selectedItem)
        if (selectedItemIndex > -1) {
          newInfo = {
            selectedItem: oldInfo.selectedItem,
            selectedIndex: selectedItemIndex
          }
        } else if (newListItems[oldInfo.selectedIndex] !== undefined) {
          newInfo = {
            selectedItem: newListItems[oldInfo.selectedIndex],
            selectedIndex: oldInfo.selectedIndex
          }
        } else {
          newInfo = {
            selectedItem: newListItems[newListItems.length - 1],
            selectedIndex: newListItems.length - 1
          }
        }
      } else {
        newInfo = {
          selectedItem: newListItems[0],
          selectedIndex: 0
        }
      }
      newInfo.items = newListItems

      listInfoByKey.set(key, newInfo)
      return key
    })

    if (this.getItemsInSelectedList().length === 0) { // if selected list is empty
      this.selectNextList({suppressCallback: true, selectFirst: true}) // select first item in next list
      if (this.getItemsInSelectedList().length === 0) { // if following lists are empty
        this.selectPreviousList({suppressCallback: true, selectLast: true}) // select last item in previous list
      }
    }

    if (!this.listOrderByKey.includes(oldSelectedListKey)) {
      if (this.listOrderByKey[oldSelectedListIndex]) {
        this.selectListForKey(this.listOrderByKey[oldSelectedListIndex], {suppressCallback: true})
      } else {
        this.selectListForKey(this.listOrderByKey[this.listOrderByKey.length - 1], {suppressCallback: true})
      }
    }
    if (this.getSelectedItem() !== oldSelectedItem && this.didChangeSelection && !suppressCallback) {
      this.didChangeSelection(this.getSelectedItem(), this.getSelectedListKey())
    }
  }

  getItemsAndKeysInRange (endPoint1, endPoint2) {
    // TODO: optimize
    const index1 = this.listOrderByKey.indexOf(endPoint1.key)
    const index2 = this.listOrderByKey.indexOf(endPoint2.key)

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
    const startItemIndex = this.getItemIndexForKey(startPoint.key, startPoint.item)
    const endItemIndex = this.getItemIndexForKey(endPoint.key, endPoint.item)
    if (startItemIndex < 0) throw new Error(`item "${startPoint.item}" not found`)
    if (endItemIndex < 0) throw new Error(`item "${endPoint.item}" not found`)

    if (startKeyIndex === endKeyIndex) {
      const items = this.getItemsForKey(this.listOrderByKey[startKeyIndex])
      const indexes = [startItemIndex, endItemIndex].sort()
      return {
        items: items.slice(indexes[0], indexes[1] + 1),
        keys: [startPoint.key]
      }
    }

    let itemsInRange
    for (let i = startKeyIndex; i <= endKeyIndex; i++) {
      const items = this.getItemsForKey(this.listOrderByKey[i])
      if (i === startKeyIndex) {
        itemsInRange = items.slice(startItemIndex)
      } else if (i === endKeyIndex) {
        itemsInRange = itemsInRange.concat(items.slice(0, endItemIndex + 1))
      } else {
        itemsInRange = itemsInRange.concat(items)
      }
    }
    return {
      items: itemsInRange,
      keys: this.listOrderByKey.slice(startKeyIndex, endKeyIndex + 1)
    }
  }

  toObject () {
    const {listOrderByKey, selectedListKey} = this
    return {listOrderByKey, selectedListKey}
  }
}
