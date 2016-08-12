'use babel'

import sinon from 'sinon'
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
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ], didChangeSelection)
      assert.equal(ml.getSelectedListIndex(), 0)
      assert.equal(ml.getSelectedItem(), 'a')

      ml.selectListAtIndex(1)
      assert.equal(ml.getSelectedListIndex(), 1)
      assert.equal(ml.getSelectedItem(), 'd')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['d', 1])

      didChangeSelection.reset()
      ml.selectListAtIndex(2)
      assert.equal(ml.getSelectedListIndex(), 2)
      assert.equal(ml.getSelectedItem(), 'f')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['f', 2])
    })
  })

  describe('selectItemAtLocation([listIndex, itemIndex])', () => {
    it('selects the item at the given location', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ], didChangeSelection)

      ml.selectItemAtLocation([0, 1])
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['b', 0])

      didChangeSelection.reset()
      ml.selectItemAtLocation([1, 0])
      assert.equal(ml.getSelectedItem(), 'd')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['d', 1])

      didChangeSelection.reset()
      ml.selectItemAtLocation([2, 2])
      assert.equal(ml.getSelectedItem(), 'h')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['h', 2])
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
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e']
      ], didChangeSelection)

      ml.selectItem('b')
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['b', 0])

      didChangeSelection.reset()
      ml.selectItem('e')
      assert.equal(ml.getSelectedItem(), 'e')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['e', 1])
    })
  })

  describe('selectNextList({wrap, selectFirst}) and selectPreviousList({wrap, selectLast})', () => {
    it('selects the next/previous list', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ], didChangeSelection)
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.selectNextList()
      assert.equal(ml.getSelectedListIndex(), 1)
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['d', 1])

      didChangeSelection.reset()
      ml.selectNextList()
      assert.equal(ml.getSelectedListIndex(), 2)
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['f', 2])

      didChangeSelection.reset()
      ml.selectPreviousList()
      assert.equal(ml.getSelectedListIndex(), 1)
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['d', 1])

      didChangeSelection.reset()
      ml.selectPreviousList()
      assert.equal(ml.getSelectedListIndex(), 0)
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['a', 0])
    })

    it('stops at the beginning and end lists if the wrap option is falsey', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.selectPreviousList()
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.selectListAtIndex(2)
      assert.equal(ml.getSelectedListIndex(), 2)

      ml.selectNextList()
      assert.equal(ml.getSelectedListIndex(), 2)
    })

    it('wraps across beginning and end lists if the wrap option is set to true', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
      assert.equal(ml.getSelectedListIndex(), 0)

      ml.selectPreviousList({wrap: true})
      assert.equal(ml.getSelectedListIndex(), 2)

      ml.selectNextList({wrap: true})
      assert.equal(ml.getSelectedListIndex(), 0)
    })

    it('selects first/last item in list if selectFirst/selectLast options are set to true', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
      ml.selectListAtIndex(1)

      ml.selectPreviousList({selectLast: true})
      assert.equal(ml.getSelectedItem(), 'c')

      ml.selectItemAtLocation([1, 1])
      ml.selectNextList({selectFirst: true})
      assert.equal(ml.getSelectedItem(), 'f')
    })
  })

  describe('selectNextItem({wrap}) and selectPreviousItem({wrap})', () => {
    it('selects the next/previous item in the currently selected list', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        ['a', 'b', 'c']
      ], didChangeSelection)
      assert.equal(ml.getSelectedItem(), 'a')

      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['b', 0])

      didChangeSelection.reset()
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'c')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['c', 0])

      didChangeSelection.reset()
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['b', 0])

      didChangeSelection.reset()
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['a', 0])
    })

    it('selects the next/previous list if one exists when selecting past the last/first item of a list', function () {
      const ml = new MultiList([
        ['a', 'b'],
        ['c']
      ])

      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(ml.getSelectedListIndex(), 0)
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(ml.getSelectedListIndex(), 0)
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'c')
      assert.equal(ml.getSelectedListIndex(), 1)
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'c')
      assert.equal(ml.getSelectedListIndex(), 1)
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(ml.getSelectedListIndex(), 0)
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(ml.getSelectedListIndex(), 0)
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(ml.getSelectedListIndex(), 0)
    })

    it('wraps across beginning and end lists if the wrap option is set to true', () => {
      const ml = new MultiList([
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h']
      ])
      assert.equal(ml.getSelectedItem(), 'a')

      ml.selectPreviousItem({wrap: true})
      assert.equal(ml.getSelectedItem(), 'h')

      ml.selectNextItem({wrap: true})
      assert.equal(ml.getSelectedItem(), 'a')
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
          const didChangeSelection = sinon.spy()
          const ml = new MultiList([
            ['a', 'b', 'c']
          ], didChangeSelection)

          ml.selectItemAtLocation([0, 0])
          assert.equal(ml.getSelectedItem(), 'a')

          didChangeSelection.reset()
          ml.updateLists([
            ['b', 'c']
          ])
          assert.equal(ml.getSelectedItem(), 'b')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['b', 0])

          didChangeSelection.reset()
          ml.updateLists([
            ['b', 'c']
          ])
          assert.equal(ml.getSelectedItem(), 'b')
          assert.equal(didChangeSelection.callCount, 0)
        })
      })

      describe('when there is no item in its place, but there is still an item in the list', () => {
        it('selects the last item in the list', () => {
          const didChangeSelection = sinon.spy()
          const ml = new MultiList([
            ['a', 'b', 'c']
          ], didChangeSelection)

          ml.selectItemAtLocation([0, 2])
          assert.equal(ml.getSelectedItem(), 'c')

          didChangeSelection.reset()
          ml.updateLists([
            ['a', 'b']
          ])
          assert.equal(ml.getSelectedItem(), 'b')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['b', 0])

          didChangeSelection.reset()
          ml.updateLists([
            ['a']
          ])
          assert.equal(ml.getSelectedItem(), 'a')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['a', 0])
        })
      })

      describe('when there are no more items in the list', () => {
        describe('when there is a non-empty list following the selected list', () => {
          it('selects the first item in the following list', () => {
            const didChangeSelection = sinon.spy()
            const ml = new MultiList([
              ['a'],
              ['b', 'c']
            ], didChangeSelection)

            ml.selectItemAtLocation([0, 0])
            assert.equal(ml.getSelectedItem(), 'a')

            didChangeSelection.reset()
            ml.updateLists([
              [],
              ['b', 'c']
            ])
            assert.equal(ml.getSelectedItem(), 'b')
            assert.equal(didChangeSelection.callCount, 1)
            assert.deepEqual(didChangeSelection.args[0], ['b', 1])
          })
        })

        describe('when the following list is empty, but the preceeding list is non-empty', () => {
          it('selects the last item in the preceeding list', () => {
            const didChangeSelection = sinon.spy()
            const ml = new MultiList([
              ['a', 'b'],
              ['c']
            ], didChangeSelection)

            ml.selectItemAtLocation([1, 0])
            assert.equal(ml.getSelectedItem(), 'c')

            didChangeSelection.reset()
            ml.updateLists([
              ['a', 'b'],
              []
            ])
            assert.equal(ml.getSelectedItem(), 'b')
            assert.equal(ml.getSelectedItem(), 'b')
            assert.equal(didChangeSelection.callCount, 1)
            assert.deepEqual(didChangeSelection.args[0], ['b', 0])
          })
        })
      })
    })
  })
})
