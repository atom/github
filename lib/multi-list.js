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

  getGlobalItemIndex ([localListIndex, localItemIndex]) {
    let globalIndex = 0
    for (let i = 0; i < localListIndex; i++) {
      globalIndex += this.lists[i].length
    }
    return globalIndex + localItemIndex
  }

  getLocalItemLocation (globalIndex) {
    if (globalIndex < 0) throw new RangeError(`Index ${globalIndex} out of range`)
    const totalLength = this.lists.reduce((totalLength, list) => totalLength + list.length, 0)
    if (totalLength < globalIndex) throw new RangeError(`Index ${globalIndex} out of range`)

    let listLengths = this.lists.map(list => list.length)
    let count = 0
    let currentListIndex = 0
    while (count + listLengths[currentListIndex] <= globalIndex) {
      count += listLengths[currentListIndex]
      currentListIndex++
    }
    let localItemIndex = globalIndex - count
    return [currentListIndex, localItemIndex]
  }

  selectItem (item) {
    const flattenedList = this.lists.reduce((acc, list) => {
      return acc.concat(list)
    }, [])
    const globalIndex = flattenedList.indexOf(item)
    this.selectItemAtLocation(this.getLocalItemLocation(globalIndex))
  }

  moveListSelection (steps) {
    let newListIndex = this.selectedListIndex + steps
    const listCount = this.lists.length
    newListIndex = newListIndex % listCount
    if (newListIndex < 0) {
      this.selectedListIndex = listCount - 1
      this.moveListSelection(newListIndex + 1)
    } else {
      this.selectListAtIndex(newListIndex)
    }
  }

  moveItemSelection (steps) {
    const listIndex = this.selectedListIndex
    const localItemIndex = this.getSelectedItemIndexForList(listIndex)
    const globalIndex = this.getGlobalItemIndex([listIndex, localItemIndex])
    const totalLength = this.lists.reduce((totalLength, list) => totalLength + list.length, 0)
    let newGlobalIndex = (globalIndex + steps) % totalLength
    if (newGlobalIndex < 0) {
      newGlobalIndex = totalLength + newGlobalIndex
    }
    this.selectItemAtLocation(this.getLocalItemLocation(newGlobalIndex))
  }

  updateLists (newLists) {
    if (newLists.length !== this.lists.length) {
      throw new Error('Number or lists not equal')
    }
    this.selectedItemIndexesForList = this.selectedItemIndexesForList.map((itemIndex, listIndex) => {
      const item = this.lists[listIndex][itemIndex]
      const newIndex = valueEqualityIndexOf(newLists[listIndex], item, this.equalityPredicate)
      return newIndex > -1 ? newIndex : 0
    })
    this.lists = newLists
  }

  toObject () {
    const {lists, selectedListIndex, selectedItemIndexesForList} = this
    return {lists, selectedListIndex, selectedItemIndexesForList}
  }
}
