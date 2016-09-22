/** @babel */

export default class MultiList {
  constructor (lists, didChangeActiveItem) {
    this.listInfoByKey = new Map()
    this.listOrderByKey = lists.map(list => {
      this.listInfoByKey.set(list.key, {
        items: list.items,
        activeItem: list.items[0],
        activeIndex: 0
      })
      return list.key
    })
    this.didChangeActiveItem = didChangeActiveItem
    this.activateListForKey(lists[0].key, {suppressCallback: true})
  }

  getListKeys () {
    return this.listOrderByKey
  }

  getActiveListKey () {
    return this.activeListKey
  }

  getItemsForKey (key) {
    return this.listInfoByKey.get(key).items
  }

  getItemsInActiveList () {
    return this.getItemsForKey(this.getActiveListKey())
  }

  getItemIndexForKey (key, item) {
    const items = this.getItemsForKey(key)
    return items.indexOf(item)
  }

  getActiveItemForKey (key) {
    if (key === undefined) throw new RangeError()
    return this.listInfoByKey.get(key).activeItem
  }

  getActiveItem () {
    return this.listInfoByKey.get(this.getActiveListKey()).activeItem
  }

  activateListForKey (key, {suppressCallback} = {}) {
    this.activeListKey = key

    if (this.didChangeActiveItem && !suppressCallback) {
      this.didChangeActiveItem(this.getActiveItem(), this.getActiveListKey())
    }
  }

  activateItemAtIndexForKey (key, index, {suppressCallback} = {}) {
    this.activateListForKey(key, {suppressCallback: true})
    const listInfo = this.listInfoByKey.get(key)
    listInfo.activeIndex = index
    listInfo.activeItem = listInfo.items[index]

    if (this.didChangeActiveItem && !suppressCallback) {
      this.didChangeActiveItem(this.getActiveItem(), this.getActiveListKey())
    }
  }

  activateItem (activeItem, {suppressCallback} = {}) {
    for (const [key, listInfo] of this.listInfoByKey) {
      for (var index = 0; index < listInfo.items.length; index++) {
        const item = listInfo.items[index]
        if (activeItem === item) {
          return this.activateItemAtIndexForKey(key, index, {suppressCallback})
        }
      }
    }
  }

  activateNextList ({wrap, activateFirst, suppressCallback} = {}) {
    const listCount = this.listOrderByKey.length
    let index = this.listOrderByKey.indexOf(this.getActiveListKey()) + 1
    if (wrap && index >= listCount) index = 0
    let listsLeft = listCount - 1
    while (index < listCount && listsLeft && this.getItemsForKey(this.listOrderByKey[index]).length === 0) {
      index++
      if (wrap && index >= listCount) index = 0
      listsLeft--
    }
    if (index < listCount) {
      const key = this.listOrderByKey[index]
      activateFirst ? this.activateItemAtIndexForKey(key, 0, {suppressCallback}) : this.activateListForKey(key, {suppressCallback})
    }
  }

  activatePreviousList ({wrap, activateLast, suppressCallback} = {}) {
    const listCount = this.listOrderByKey.length
    let index = this.listOrderByKey.indexOf(this.getActiveListKey()) - 1
    if (wrap && index < 0) index = listCount - 1
    let listsLeft = index
    while (index >= 0 && listsLeft && this.getItemsForKey(this.listOrderByKey[index]).length === 0) {
      index--
      if (wrap && index < 0) index = listCount - 1
      listsLeft--
    }
    if (index >= 0) {
      const key = this.listOrderByKey[index]
      if (activateLast) {
        this.activateItemAtIndexForKey(key, this.getItemsForKey(this.listOrderByKey[index]).length - 1, {suppressCallback})
      } else {
        this.activateListForKey(key, {suppressCallback})
      }
    }
  }

  activateNextItem ({wrap, stopAtBounds} = {}) {
    const key = this.getActiveListKey()
    const listInfo = this.listInfoByKey.get(key)
    const newItemIndex = listInfo.activeIndex + 1
    if (newItemIndex < listInfo.items.length) {
      this.activateItemAtIndexForKey(key, newItemIndex)
    } else {
      if (!stopAtBounds) this.activateNextList({activateFirst: true, wrap})
    }
  }

  activatePreviousItem ({wrap, stopAtBounds} = {}) {
    const key = this.getActiveListKey()
    const listInfo = this.listInfoByKey.get(key)
    const newItemIndex = listInfo.activeIndex - 1
    if (newItemIndex >= 0) {
      this.activateItemAtIndexForKey(key, newItemIndex)
    } else {
      if (!stopAtBounds) this.activatePreviousList({activateLast: true, wrap})
    }
  }

  mapOldInfoToNewInfo (oldInfo, newListItems) {
    const activeItemIndex = newListItems.indexOf(oldInfo.activeItem)
    if (activeItemIndex > -1) {
      return {
        activeItem: oldInfo.activeItem,
        activeIndex: activeItemIndex
      }
    } else if (newListItems[oldInfo.activeIndex] !== undefined) {
      return {
        activeItem: newListItems[oldInfo.activeIndex],
        activeIndex: oldInfo.activeIndex
      }
    } else {
      return {
        activeItem: newListItems[newListItems.length - 1],
        activeIndex: newListItems.length - 1
      }
    }
  }

  getNewInfoBasedOnOldActiveIndexes (list, oldActiveListItemIndex) {
    const items = list.items
    const item = items[oldActiveListItemIndex]
    if (item !== undefined) {
      return [{
        activeItem: item,
        activeIndex: oldActiveListItemIndex
      }, {selectNext: false}]
    } else {
      return [{
        activeItem: items[items.length - 1],
        activeIndex: Math.max(items.length - 1, 0)
      }, {selectNext: true}]
    }
  }

  activateCorrectListAndItem (oldActiveListIndex) {
    if (!this.listOrderByKey.includes(this.getActiveListKey())) {
      let newActiveListKey = this.listOrderByKey[oldActiveListIndex]
      if (newActiveListKey) {
        this.activateListForKey(newActiveListKey, {suppressCallback: true})
      } else {
        newActiveListKey = this.listOrderByKey[this.listOrderByKey.length - 1]
        const items = this.getItemsForKey(newActiveListKey)
        this.activateItemAtIndexForKey(newActiveListKey, items.length - 1, {suppressCallback: true})
      }
    }
  }

  updateLists (newLists, {suppressCallback, oldActiveListIndex, oldActiveListItemIndex} = {}) {
    const oldActiveItem = this.getActiveItem()
    const oldActiveListKey = this.getActiveListKey()
    oldActiveListIndex = oldActiveListIndex || this.listOrderByKey.indexOf(oldActiveListKey)

    const newListInfoByKey = new Map()
    let selectNext
    const newListOrderByKey = newLists.map((list, listIndex) => {
      const oldInfo = this.listInfoByKey.get(list.key)
      const newListItems = list.items
      let newInfo
      if (oldInfo && newListItems.length > 0) {
        newInfo = this.mapOldInfoToNewInfo(oldInfo, newListItems)
      } else if (oldActiveListItemIndex !== undefined && listIndex === oldActiveListIndex) {
        [newInfo, {selectNext}] = this.getNewInfoBasedOnOldActiveIndexes(list, oldActiveListItemIndex)
      } else {
        newInfo = { activeItem: newListItems[0], activeIndex: 0 }
      }
      newInfo.items = newListItems
      newListInfoByKey.set(list.key, newInfo)
      return list.key
    })
    this.listInfoByKey = newListInfoByKey
    this.listOrderByKey = newListOrderByKey

    this.activateCorrectListAndItem(oldActiveListIndex)

    if (this.getItemsInActiveList().length === 0 || selectNext) {
      this.activateNextList({suppressCallback: true, activateFirst: true})
      if (this.getItemsInActiveList().length === 0) {
        this.activatePreviousList({suppressCallback: true, activateLast: true})
      }
    }

    if (this.getActiveItem() !== oldActiveItem && this.didChangeActiveItem && !suppressCallback) {
      this.didChangeActiveItem(this.getActiveItem(), this.getActiveListKey())
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
    const {listOrderByKey, activeListKey} = this
    return {listOrderByKey, activeListKey}
  }
}
