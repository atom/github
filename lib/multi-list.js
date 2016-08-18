'use babel'

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

  selectItem (selectedItem) {
    for (const [key, listInfo] of listInfoByKey) {
      for (var index = 0; index < listInfo.items.length; index++) {
        const item = listInfo.items[index]
        if (selectedItem === item) {
          return this.selectItemAtIndexForKey(key, index)
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

  toObject () {
    const {listOrderByKey, selectedListKey} = this
    return {listOrderByKey, selectedListKey}
  }
}
