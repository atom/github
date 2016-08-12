'use babel'

export default class MultiList {
  constructor (lists, didChangeSelection) {
    this.lists = lists
    this.didChangeSelection = didChangeSelection
    this.selectedListIndex = 0
    this.selectedItemIndexesForList = Array(lists.length).fill(0)
  }

  getSelectedListIndex () {
    return this.selectedListIndex
  }

  getSelectedList () {
    return this.lists[this.selectedListIndex]
  }

  getSelectedItemIndexForList (listIndex) {
    if (listIndex === undefined) throw new RangeError()
    return this.selectedItemIndexesForList[listIndex]
  }

  getSelectedItemForList (listIndex) {
    if (listIndex === undefined) throw new RangeError()
    return this.lists[listIndex][this.getSelectedItemIndexForList(listIndex)]
  }

  getSelectedItem () {
    const itemIndex = this.getSelectedItemIndexForList(this.selectedListIndex)
    return this.lists[this.selectedListIndex][itemIndex]
  }

  getListAtIndex (listIndex) {
    return this.lists[listIndex]
  }

  selectListAtIndex (listIndex) {
    this.selectedListIndex = listIndex

    if (this.didChangeSelection) {
      this.didChangeSelection(this.getSelectedItem(), this.getSelectedListIndex())
    }
  }

  selectItemAtLocation ([listIndex, itemIndex]) {
    this.selectedListIndex = listIndex
    this.selectedItemIndexesForList[listIndex] = itemIndex

    if (this.didChangeSelection) {
      this.didChangeSelection(this.getSelectedItem(), this.getSelectedListIndex())
    }
  }

  getItemLocationFromFlattenedIndex (flattenedIndex) {
    if (flattenedIndex < 0) throw new RangeError(`Index ${flattenedIndex} out of range`)
    const totalLength = this.lists.reduce((totalLength, list) => totalLength + list.length, 0)
    if (totalLength < flattenedIndex) throw new RangeError(`Index ${flattenedIndex} out of range`)

    let listLengths = this.lists.map(list => list.length)
    let count = 0
    let currentListIndex = 0
    while (count + listLengths[currentListIndex] <= flattenedIndex) {
      count += listLengths[currentListIndex]
      currentListIndex++
    }
    let localItemIndex = flattenedIndex - count
    return [currentListIndex, localItemIndex]
  }

  selectItem (item) {
    const flattenedList = this.lists.reduce((acc, list) => {
      return acc.concat(list)
    }, [])
    const flattenedIndex = flattenedList.indexOf(item)
    this.selectItemAtLocation(this.getItemLocationFromFlattenedIndex(flattenedIndex))
  }

  selectNextList ({wrap, selectFirst} = {}) {
    let index = this.selectedListIndex + 1
    if (wrap && index >= this.lists.length) index = 0
    let listsLeft = this.lists.length - 1
    while (index < this.lists.length && listsLeft && this.lists[index].length === 0) {
      index++
      if (wrap && index >= this.lists.length) index = 0
      listsLeft--
    }
    if (index < this.lists.length) {
      if (selectFirst) {
        this.selectItemAtLocation([index, 0])
      } else {
        this.selectListAtIndex(index)
      }
    }
  }

  selectPreviousList ({wrap, selectLast} = {}) {
    let index = this.selectedListIndex - 1
    if (wrap && index < 0) index = this.lists.length - 1
    let listsLeft = index
    while (index >= 0 && listsLeft && this.lists[index].length === 0) {
      index--
      if (wrap && index < 0) index = this.lists.length - 1
      listsLeft--
    }
    if (index >= 0) {
      if (selectLast) {
        this.selectItemAtLocation([index, this.lists[index].length - 1])
      } else {
        this.selectListAtIndex(index)
      }
    }
  }

  selectNextItem ({wrap} = {}) {
    const listIndex = this.selectedListIndex
    const newItemIndex = this.getSelectedItemIndexForList(listIndex) + 1
    if (newItemIndex < this.lists[listIndex].length) {
      this.selectItemAtLocation([listIndex, newItemIndex])
    } else {
      this.selectNextList({selectFirst: true, wrap})
    }
  }

  selectPreviousItem ({wrap} = {}) {
    const listIndex = this.selectedListIndex
    const newItemIndex = this.getSelectedItemIndexForList(listIndex) - 1
    if (newItemIndex >= 0) {
      this.selectItemAtLocation([listIndex, newItemIndex])
    } else {
      this.selectPreviousList({selectLast: true, wrap})
    }
  }

  updateLists (newLists) {
    if (newLists.length !== this.lists.length) {
      throw new Error('Number or lists not equal')
    }

    const oldSelectedItem = this.getSelectedItem()
    // Avoid multiple selection change notifications
    const didChangeSelection = this.didChangeSelection
    this.didChangeSelection = null

    for (let listIndex = 0; listIndex < newLists.length; listIndex++) {
      const itemIndex = this.selectedItemIndexesForList[listIndex]
      const item = this.lists[listIndex][itemIndex]
      let newIndex = 0
      if (item) {
        newIndex = newLists[listIndex].indexOf(item)
      }
      if (newIndex > -1) {
        // if item is still present in list, return its new index
        this.selectedItemIndexesForList[listIndex] = newIndex
      } else if (newLists[listIndex].length > itemIndex) {
        // else item not present, but if there is another item in the same location, return current index
        this.selectedItemIndexesForList[listIndex] = itemIndex
      } else if (newLists[listIndex].length) {
        // else nothing at location, if there are still items in the current list, return last item
        this.selectedItemIndexesForList[listIndex] = newLists[listIndex].length - 1
      } else {
        if (this.getSelectedListIndex() === listIndex) {
          // else list is empty, and if current list is the selected list...
          if (newLists[listIndex + 1] && newLists[listIndex + 1].length) {
            // ... and there is an element in the next list, set the first item as selected
            this.selectItemAtLocation([listIndex + 1, 0])
          } else if (newLists[listIndex - 1] && newLists[listIndex - 1].length) {
            // if the next list is empty but the previous list is non-empty, set the last item as selected
            this.selectItemAtLocation([listIndex - 1, newLists[listIndex - 1].length - 1])
          }
          this.selectedItemIndexesForList[listIndex] = 0
        }
      }
    }

    this.lists = newLists

    this.didChangeSelection = didChangeSelection
    if (this.didChangeSelection && this.getSelectedItem() !== oldSelectedItem) {
      this.didChangeSelection(this.getSelectedItem(), this.getSelectedListIndex())
    }
  }

  toObject () {
    const {lists, selectedListIndex, selectedItemIndexesForList} = this
    return {lists, selectedListIndex, selectedItemIndexesForList}
  }
}
