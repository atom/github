'use babel'

function valueEqualityIndexOf (list, targetItem, equalityPredicate) {
  for (var index = 0; index < list.length; index++) {
    let item = list[index]
    if (equalityPredicate(item, targetItem)) {
      return index
    }
  }
  return -1
}

export default class MultiList {
  constructor (lists, equalityPredicate) {
    this.lists = lists
    this.equalityPredicate = equalityPredicate || ((a, b) => a === b)
    this.selectedListIndex = 0
    this.selectedItemIndexesForList = Array(lists.length).fill(0)
  }

  getSelectedListIndex () {
    return this.selectedListIndex
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
  }

  selectItemAtLocation ([listIndex, itemIndex]) {
    this.selectListAtIndex(listIndex)
    this.selectedItemIndexesForList[listIndex] = itemIndex
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
    const flattenedIndex = valueEqualityIndexOf(flattenedList, item, this.equalityPredicate)
    this.selectItemAtLocation(this.getItemLocationFromFlattenedIndex(flattenedIndex))
  }

  selectNextList () {
    let newListIndex = this.selectedListIndex + 1
    if (newListIndex < this.lists.length) {
      this.selectListAtIndex(newListIndex)
    }
  }

  selectPreviousList () {
    let newListIndex = this.selectedListIndex - 1
    if (newListIndex >= 0) {
      this.selectListAtIndex(newListIndex)
    }
  }

  selectNextItem () {
    const listIndex = this.selectedListIndex
    const newItemIndex = this.getSelectedItemIndexForList(listIndex) + 1
    if (newItemIndex < this.lists[listIndex].length) {
      this.selectItemAtLocation([listIndex, newItemIndex])
    }
  }

  selectPreviousItem () {
    const listIndex = this.selectedListIndex
    const newItemIndex = this.getSelectedItemIndexForList(listIndex) - 1
    if (newItemIndex >= 0) {
      this.selectItemAtLocation([listIndex, newItemIndex])
    }
  }

  updateLists (newLists) {
    if (newLists.length !== this.lists.length) {
      throw new Error('Number or lists not equal')
    }
    for (let listIndex = 0; listIndex < newLists.length; listIndex++) {
      const itemIndex = this.selectedItemIndexesForList[listIndex]
      const item = this.lists[listIndex][itemIndex]
      let newIndex = 0
      if (item) {
        newIndex = valueEqualityIndexOf(newLists[listIndex], item, this.equalityPredicate)
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
  }

  toObject () {
    const {lists, selectedListIndex, selectedItemIndexesForList} = this
    return {lists, selectedListIndex, selectedItemIndexesForList}
  }
}
