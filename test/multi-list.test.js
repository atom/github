'use babel'

import MultiList from '../lib/multi-list'

describe('MultiList', () => {
  describe('constructing a MultiList instance', () => {
    let ml
    beforeEach(() => {
      ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
    })

    it('marks first list as selected, as well as its first item', () => {
      assert.equal(ml.getSelectedListIndex(), 0)
      assert.equal(ml.getSelectedItemIndexForList(0), 0)
      assert.equal(ml.getSelectedItem(), 'a')
    })

    it('selects the first item from each list', () => {
      assert.equal(ml.getSelectedItemIndexForList(0), 0)
      assert.equal(ml.getSelectedItemIndexForList(1), 0)
      assert.equal(ml.getSelectedItemIndexForList(2), 0)
    })
  })

  describe('selectListAtIndex(index)', () => {
    it('selects the list at the given index', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
      assert.equal(ml.getSelectedListIndex(), 0)
      assert.equal(ml.getSelectedItem(), 'a')

      ml.selectListAtIndex(1)
      assert.equal(ml.getSelectedListIndex(), 1)
      assert.equal(ml.getSelectedItem(), 'd')

      ml.selectListAtIndex(2)
      assert.equal(ml.getSelectedListIndex(), 2)
      assert.equal(ml.getSelectedItem(), 'f')
    })
  })

  describe('selectItemAtLocation([listIndex, itemIndex])', () => {
    it('selects the item at the given location', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])

      ml.selectItemAtLocation([0, 1])
      assert.equal(ml.getSelectedItem(), 'b')

      ml.selectItemAtLocation([1, 0])
      assert.equal(ml.getSelectedItem(), 'd')

      ml.selectItemAtLocation([2, 2])
      assert.equal(ml.getSelectedItem(), 'h')
    })

    it('remembers which item is selected for each list', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])

      ml.selectItemAtLocation([0, 1])
      assert.equal(ml.getSelectedItem(), 'b')
      ml.selectItemAtLocation([1, 0])
      assert.equal(ml.getSelectedItem(), 'd')
      ml.selectItemAtLocation([2, 2])
      assert.equal(ml.getSelectedItem(), 'h')

      ml.selectListAtIndex(0)
      assert.equal(ml.getSelectedItem(), 'b')

      ml.selectListAtIndex(1)
      assert.equal(ml.getSelectedItem(), 'd')

      ml.selectListAtIndex(2)
      assert.equal(ml.getSelectedItem(), 'h')
    })
  })

  describe('selectItem(item)', () => {
    it('selects the provided item', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e']
      ])

      ml.selectItem('b')
      assert.equal(ml.getSelectedItem(), 'b')

      ml.selectItem('e')
      assert.equal(ml.getSelectedItem(), 'e')
    })
  })

  describe('moveListSelection(step) (move forward with step = 1 and backward with step = -1)', () => {
    it('only takes step values of -1 and 1', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])

      assert.doesNotThrow(() => {
        ml.moveListSelection(1)
      })

      assert.doesNotThrow(() => {
        ml.moveListSelection(-1)
      })

      assert.throws(() => {
        ml.moveListSelection(2)
      })

      assert.throws(() => {
        ml.moveListSelection(-2)
      })
    })

    it('selects the appropriate list', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.moveListSelection(1)
      assert.equal(ml.getSelectedListIndex(), 1)

      ml.moveListSelection(1)
      assert.equal(ml.getSelectedListIndex(), 2)

      ml.moveListSelection(-1)
      assert.equal(ml.getSelectedListIndex(), 1)

      ml.moveListSelection(-1)
      assert.equal(ml.getSelectedListIndex(), 0)
    })

    it('stops at the beginning and end lists', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.moveListSelection(-1)
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.selectListAtIndex(2)
      assert.equal(ml.getSelectedListIndex(), 2)

      ml.moveListSelection(1)
      assert.equal(ml.getSelectedListIndex(), 2)
    })
  })

  describe('moveItemSelection(step) - (move forward with step = 1 and backward with step = -1)', () => {
    it('only takes step values of -1 and 1', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])

      assert.doesNotThrow(() => {
        ml.moveItemSelection(1)
      })

      assert.doesNotThrow(() => {
        ml.moveItemSelection(-1)
      })

      assert.throws(() => {
        ml.moveItemSelection(2)
      })

      assert.throws(() => {
        ml.moveItemSelection(-2)
      })
    })

    it('selects the appropriate item within the list', () => {
      const ml = new MultiList([
        ['a', 'b', 'c']
      ])
      assert.equal(ml.getSelectedItem(), 'a')

      ml.moveItemSelection(1)
      assert.equal(ml.getSelectedItem(), 'b')

      ml.moveItemSelection(1)
      assert.equal(ml.getSelectedItem(), 'c')

      ml.moveItemSelection(-1)
      assert.equal(ml.getSelectedItem(), 'b')

      ml.moveItemSelection(-1)
      assert.equal(ml.getSelectedItem(), 'a')
    })

    it('stops at the beginning and end of a given list', () => {
      const ml = new MultiList([
        ['a', 'b', 'c']
      ])

      assert.equal(ml.getSelectedItem(), 'a')

      ml.moveItemSelection(-1)
      assert.equal(ml.getSelectedItem(), 'a')

      ml.selectItemAtLocation([0, 2])
      assert.equal(ml.getSelectedItem(), 'c')

      ml.moveItemSelection(1)
      assert.equal(ml.getSelectedItem(), 'c')
    })
  })

  describe('updateLists(lists)', () => {
    it('throws an error if too many or too few lists are passed', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e']
      ])

      assert.throws(function () {
        ml.updateLists([
          ['a', 'b', 'c']
        ])
      })

      assert.throws(function () {
        ml.updateLists([
          ['a', 'b', 'c'],
          ['d', 'e'],
          ['f', 'g']
        ])
      })
    })

    it('maintains the selected items for each list, even if location has changed in list', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e']
      ])

      ml.selectItemAtLocation([0, 1])
      assert.equal(ml.getSelectedItem(), 'b')
      ml.selectItemAtLocation([1, 1])
      assert.equal(ml.getSelectedItem(), 'e')

      ml.updateLists([
        ['b', 'c'],
        ['a', 'd', 'e']
      ])

      ml.selectListAtIndex(0)
      ml.getSelectedItem('b')

      ml.selectListAtIndex(1)
      ml.getSelectedItem('e')
    })

    describe('when list item is no longer in the list upon update', () => {
      describe('when there is a new item in its place', () => {
        it('keeps the same selected item index and shows the new item as selected', () => {
          const ml = new MultiList([
            ['a', 'b', 'c']
          ])

          ml.selectItemAtLocation([0, 0])
          assert.equal(ml.getSelectedItem(), 'a')

          ml.updateLists([
            ['b', 'c']
          ])
          assert.equal(ml.getSelectedItem(), 'b')

          ml.updateLists([
            ['b', 'c']
          ])
          assert.equal(ml.getSelectedItem(), 'b')
        })
      })

      describe('when there is no item in its place, but there is still an item in the list', () => {
        it('selects the last item in the list', () => {
          const ml = new MultiList([
            ['a', 'b', 'c']
          ])

          ml.selectItemAtLocation([0, 2])
          assert.equal(ml.getSelectedItem(), 'c')

          ml.updateLists([
            ['a', 'b']
          ])
          assert.equal(ml.getSelectedItem(), 'b')

          ml.updateLists([
            ['a']
          ])
          assert.equal(ml.getSelectedItem(), 'a')
        })
      })

      describe('when there are no more items in the list', () => {
        describe('when there is a non-empty list following the selected list', () => {
          it('selects the first item in the following list', () => {
            const ml = new MultiList([
              ['a'],
              ['b', 'c']
            ])

            ml.selectItemAtLocation([0, 0])
            assert.equal(ml.getSelectedItem(), 'a')

            ml.updateLists([
              [],
              ['b', 'c']
            ])
            assert.equal(ml.getSelectedItem(), 'b')
          })
        })

        describe('when the following list is empty, but the preceeding list is non-empty', () => {
          it('selects the last item in the preceeding list', () => {
            const ml = new MultiList([
              ['a', 'b'],
              ['c']
            ])

            ml.selectItemAtLocation([1, 0])
            assert.equal(ml.getSelectedItem(), 'c')

            ml.updateLists([
              ['a', 'b'],
              []
            ])
            assert.equal(ml.getSelectedItem(), 'b')
          })
        })
      })
    })
  })
})
