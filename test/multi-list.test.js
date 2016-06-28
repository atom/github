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

  describe('converting between local and global indexes', () => {
    describe('getGlobalItemIndex([localListIndex, localItemIndex])', () => {
      it('returns the index corresponding to the concatenated lists', () => {
        const ml = new MultiList([
          ['a', 'b', 'c'],
          ['d', 'e'],
          ['f', 'g', 'h']
        ])

        let globalIndex

        globalIndex = ml.getGlobalItemIndex([0, 0])
        assert.equal(globalIndex, 0)

        globalIndex = ml.getGlobalItemIndex([1, 0])
        assert.equal(globalIndex, 3)

        globalIndex = ml.getGlobalItemIndex([2, 0])
        assert.equal(globalIndex, 5)
      })
    })

    describe('getLocalItemLocation(globalItemIndex)', () => {
      it('returns a tuple [listIndex, itemIndex]', () => {
        const ml = new MultiList([
          ['a', 'b', 'c'],
          ['d', 'e'],
          ['f', 'g', 'h']
        ])

        let localLocation

        assert.throws(function () {
          ml.getLocalItemLocation(-1)
        })

        assert.throws(function () {
          ml.getLocalItemLocation(100)
        })

        localLocation = ml.getLocalItemLocation(0)
        assert.deepEqual(localLocation, [0, 0])

        localLocation = ml.getLocalItemLocation(4)
        assert.deepEqual(localLocation, [1, 1])

        localLocation = ml.getLocalItemLocation(7)
        assert.deepEqual(localLocation, [2, 2])
      })
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

  describe('moveListSelection(steps) (move forward with steps>0 and backward with steps<0)', () => {
    it('selects the appropriate list', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h'],
        ['i']
      ])
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.moveListSelection(1)
      assert.equal(ml.getSelectedListIndex(), 1)

      ml.moveListSelection(2)
      assert.equal(ml.getSelectedListIndex(), 3)

      ml.moveListSelection(-1)
      assert.equal(ml.getSelectedListIndex(), 2)

      ml.moveListSelection(-2)
      assert.equal(ml.getSelectedListIndex(), 0)
    })

    it('wraps around at the beginning and end lists', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h'],
        ['i']
      ])
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.moveListSelection(-1)
      assert.equal(ml.getSelectedListIndex(), 3)

      ml.moveListSelection(1)
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.moveListSelection(-2)
      assert.equal(ml.getSelectedListIndex(), 2)

      ml.moveListSelection(3)
      assert.equal(ml.getSelectedListIndex(), 1)

      ml.moveListSelection(-8)
      assert.equal(ml.getSelectedListIndex(), 1)

      ml.moveListSelection(12)
      assert.equal(ml.getSelectedListIndex(), 1)
    })
  })

  describe('moveItemSelection(steps)', () => {
    describe('movement within a list (move forward with steps>0 and backward with steps<0)', () => {
      it('selects the appropriate item within the list', () => {
        const ml = new MultiList([
          ['a', 'b', 'c', 'd']
        ])
        assert.equal(ml.getSelectedItem(), 'a')

        ml.moveItemSelection(1)
        assert.equal(ml.getSelectedItem(), 'b')

        ml.moveItemSelection(2)
        assert.equal(ml.getSelectedItem(), 'd')

        ml.moveItemSelection(-1)
        assert.equal(ml.getSelectedItem(), 'c')

        ml.moveItemSelection(-2)
        assert.equal(ml.getSelectedItem(), 'a')
      })
    })

    describe('movement across a list boundary', () => {
      it('selects the appropriate item within the next list', () => {
        const ml = new MultiList([
          ['a', 'b', 'c'],
          ['d', 'e'],
          ['f', 'g', 'h']
        ])

        ml.selectItemAtLocation([0, 2])
        assert.equal(ml.getSelectedItem(), 'c')

        ml.moveItemSelection(1)
        assert.equal(ml.getSelectedItem(), 'd')

        ml.moveItemSelection(-1)
        assert.equal(ml.getSelectedItem(), 'c')

        ml.moveItemSelection(3)
        assert.equal(ml.getSelectedItem(), 'f')

        ml.moveItemSelection(-3)
        assert.equal(ml.getSelectedItem(), 'c')
      })
    })

    describe('movement at the beginning and end of all lists', () => {
      it('wraps around at the end of the last list and the beginning of the first list', () => {
        const ml = new MultiList([
          ['a', 'b', 'c'],
          ['d', 'e'],
          ['f', 'g', 'h']
        ])

        ml.selectItemAtLocation([0, 0])
        assert.equal(ml.getSelectedItem(), 'a')

        ml.moveItemSelection(-1)
        assert.equal(ml.getSelectedItem(), 'h')

        ml.moveItemSelection(1)
        assert.equal(ml.getSelectedItem(), 'a')
      })
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

    it('uses provided equality predicate to determine if items match', () => {
      const equalityPredicate = (a, b) => a.toUpperCase() === b.toUpperCase()
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e']
      ], equalityPredicate)

      ml.updateLists([
        ['B', 'C'],
        ['A', 'D', 'E']
      ])

      ml.selectListAtIndex(0)
      ml.getSelectedItem('B')

      ml.selectListAtIndex(1)
      ml.getSelectedItem('E')
    })
  })
})
