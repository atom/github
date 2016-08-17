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
    this.selectedListKey = key // don't call this.selectListForKey(key) since this will prematurely call didChangeSelection
    const listInfo = listInfoByKey.get(key)
    listInfo.selectedIndex = index
    listInfo.selectedItem = listInfo.items[index]

    if (this.didChangeSelection && !suppressCallback) {
      this.didChangeSelection(this.getSelectedItem(), this.getSelectedListKey())
    }
  }

  // getItemLocationFromFlattenedIndex (flattenedIndex) {
  //   if (flattenedIndex < 0) throw new RangeError(`Index ${flattenedIndex} out of range`)
  //   const totalLength = this.lists.reduce((totalLength, list) => totalLength + list.length, 0)
  //   if (totalLength < flattenedIndex) throw new RangeError(`Index ${flattenedIndex} out of range`)
  //
  //   let listLengths = this.lists.map(list => list.length)
  //   let count = 0
  //   let currentListIndex = 0
  //   while (count + listLengths[currentListIndex] <= flattenedIndex) {
  //     count += listLengths[currentListIndex]
  //     currentListIndex++
  //   }
  //   let localItemIndex = flattenedIndex - count
  //   return [currentListIndex, localItemIndex]
  // }

  selectItem (selectedItem) {
    listInfoByKey.forEach((listInfo, key) => {
      listInfo.items.forEach((item, index) => {
        if (selectedItem === item) {
          this.selectItemAtIndexForKey(key, index)
        }
      })
    })
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
    // const listIndex = this.selectedListIndex
    // const newItemIndex = this.getSelectedItemIndexForList(listIndex) + 1
    // if (newItemIndex < this.lists[listIndex].length) {
    //   this.selectItemAtLocation([listIndex, newItemIndex])
    // } else {
    //   this.selectNextList({selectFirst: true, wrap})
    // }
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
    //
    //
    // const oldSelectedItem = this.getSelectedItem()
    // // Avoid multiple selection change notifications
    // const didChangeSelection = this.didChangeSelection
    // this.didChangeSelection = null
    //
    // for (let listIndex = 0; listIndex < newLists.length; listIndex++) {
    //   const itemIndex = this.selectedItemIndexesForList[listIndex]
    //   const item = this.lists[listIndex][itemIndex]
    //   let newIndex = 0
    //   if (item) {
    //     newIndex = newLists[listIndex].indexOf(item)
    //   }
    //   if (newIndex > -1) {
    //     // if item is still present in list, return its new index
    //     this.selectedItemIndexesForList[listIndex] = newIndex
    //   } else if (newLists[listIndex].length > itemIndex) {
    //     // else item not present, but if there is another item in the same location, return current index
    //     this.selectedItemIndexesForList[listIndex] = itemIndex
    //   } else if (newLists[listIndex].length) {
    //     // else nothing at location, if there are still items in the current list, return last item
    //     this.selectedItemIndexesForList[listIndex] = newLists[listIndex].length - 1
    //   } else {
    //     if (this.getSelectedListIndex() === listIndex) {
    //       // else list is empty, and if current list is the selected list...
    //       if (newLists[listIndex + 1] && newLists[listIndex + 1].length) {
    //         // ... and there is an element in the next list, set the first item as selected
    //         this.selectItemAtLocation([listIndex + 1, 0])
    //       } else if (newLists[listIndex - 1] && newLists[listIndex - 1].length) {
    //         // if the next list is empty but the previous list is non-empty, set the last item as selected
    //         this.selectItemAtLocation([listIndex - 1, newLists[listIndex - 1].length - 1])
    //       }
    //       this.selectedItemIndexesForList[listIndex] = 0
    //     }
    //   }
    // }
    //
    // this.lists = newLists
    //
    // this.didChangeSelection = didChangeSelection
    // if (this.didChangeSelection && this.getSelectedItem() !== oldSelectedItem) {
    //   this.didChangeSelection(this.getSelectedItem(), this.getSelectedListIndex())
    // }
  }

  toObject () {
    const {listOrderByKey, selectedListKey} = this
    return {listOrderByKey, selectedListKey}
  }
}
