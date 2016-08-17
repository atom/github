'use babel'

import sinon from 'sinon'
import MultiList from '../lib/multi-list'

describe('MultiList', () => {
  describe('constructing a MultiList instance', () => {
    it('selects the first item from each list, and marks the first list as selected', () => {
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])

      assert.equal(ml.getSelectedListKey(), 'list1')
      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(ml.getSelectedItemForKey('list2'), 'd')
      assert.equal(ml.getSelectedItemForKey('list3'), 'f')
    })
  })

  describe('selectListForKey(key)', () => {
    it('selects the list at the given index and calls the provided changed-selection callback', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ], didChangeSelection)

      ml.selectListForKey('list2')
      assert.equal(ml.getSelectedListKey(), 'list2')
      assert.equal(ml.getSelectedItem(), 'd')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['d', 'list2'])

      didChangeSelection.reset()
      ml.selectListForKey('list3')
      assert.equal(ml.getSelectedListKey(), 'list3')
      assert.equal(ml.getSelectedItem(), 'f')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['f', 'list3'])
    })
  })

  describe('selectItemAtIndexForKey(key, itemIndex)', () => {
    it('selects the item, calls the provided changed-selection callback, and remembers which item is selected for each list', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ], didChangeSelection)

      ml.selectItemAtIndexForKey('list1', 2)
      assert.equal(ml.getSelectedItem(), 'c')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['c', 'list1'])

      didChangeSelection.reset()
      ml.selectItemAtIndexForKey('list2', 1)
      assert.equal(ml.getSelectedItem(), 'e')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['e', 'list2'])

      ml.selectItemAtIndexForKey('list3', 2)
      assert.equal(ml.getSelectedItem(), 'h')

      ml.selectListForKey('list1')
      assert.equal(ml.getSelectedItem(), 'c')

      ml.selectListForKey('list2')
      assert.equal(ml.getSelectedItem(), 'e')

      ml.selectListForKey('list3')
      assert.equal(ml.getSelectedItem(), 'h')
    })
  })

  describe('selectItem(item)', () => {
    it('selects the provided item and calls the provided changed-selection callback', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ], didChangeSelection)

      ml.selectItem('b')
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['b', 'list1'])

      didChangeSelection.reset()
      ml.selectItem('e')
      assert.equal(ml.getSelectedItem(), 'e')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['e', 'list2'])
    })
  })

  describe('selectNextList({wrap, selectFirst}) and selectPreviousList({wrap, selectLast})', () => {
    it('selects the next/previous list', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ], didChangeSelection)
      assert.equal(ml.getSelectedListKey(), 'list1')

      ml.selectNextList()
      assert.equal(ml.getSelectedListKey(), 'list2')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['d', 'list2'])

      didChangeSelection.reset()
      ml.selectNextList()
      assert.equal(ml.getSelectedListKey(), 'list3')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['f', 'list3'])

      ml.selectPreviousList()
      assert.equal(ml.getSelectedListKey(), 'list2')

      ml.selectPreviousList()
      assert.equal(ml.getSelectedListKey(), 'list1')
    })

    it('wraps across beginning and end lists for wrap option is truthy, otherwise stops at beginning/end lists', () => {
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])
      assert.equal(ml.getSelectedListKey(), 'list1')

      ml.selectPreviousList({wrap: true})
      assert.equal(ml.getSelectedListKey(), 'list3')

      ml.selectNextList({wrap: true})
      assert.equal(ml.getSelectedListKey(), 'list1')

      ml.selectPreviousList()
      assert.equal(ml.getSelectedListKey(), 'list1')

      ml.selectListForKey('list3')
      assert.equal(ml.getSelectedListKey(), 'list3')

      ml.selectNextList()
      assert.equal(ml.getSelectedListKey(), 'list3')
    })

    it('selects first/last item in list if selectFirst/selectLast options are set to true', () => {
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])
      ml.selectListForKey('list2')

      ml.selectPreviousList({selectLast: true})
      assert.equal(ml.getSelectedItem(), 'c')

      ml.selectItemAtIndexForKey('list2', 1)
      assert.equal(ml.getSelectedItem(), 'e')
      ml.selectNextList({selectFirst: true})
      assert.equal(ml.getSelectedItem(), 'f')
    })
  })

  describe('selectNextItem({wrap}) and selectPreviousItem({wrap})', () => {
    it('selects the next/previous item in the currently selected list', () => {
      const didChangeSelection = sinon.spy()
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] }
      ], didChangeSelection)
      assert.equal(ml.getSelectedItem(), 'a')

      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['b', 'list1'])

      didChangeSelection.reset()
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'c')
      assert.equal(didChangeSelection.callCount, 1)
      assert.deepEqual(didChangeSelection.args[0], ['c', 'list1'])

      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'b')

      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'a')
    })

    it('selects the next/previous list if one exists when selecting past the last/first item of a list', function () {
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b'] },
        { key: 'list2', items: ['c'] }
      ])

      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(ml.getSelectedListKey(), 'list1')
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(ml.getSelectedListKey(), 'list1')
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'c')
      assert.equal(ml.getSelectedListKey(), 'list2')
      ml.selectNextItem()
      assert.equal(ml.getSelectedItem(), 'c')
      assert.equal(ml.getSelectedListKey(), 'list2')
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'b')
      assert.equal(ml.getSelectedListKey(), 'list1')
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(ml.getSelectedListKey(), 'list1')
      ml.selectPreviousItem()
      assert.equal(ml.getSelectedItem(), 'a')
      assert.equal(ml.getSelectedListKey(), 'list1')
    })

    it('wraps across beginning and end lists if the wrap option is set to true', () => {
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])
      assert.equal(ml.getSelectedItem(), 'a')

      ml.selectPreviousItem({wrap: true})
      assert.equal(ml.getSelectedItem(), 'h')

      ml.selectNextItem({wrap: true})
      assert.equal(ml.getSelectedItem(), 'a')
    })
  })

  describe('updateLists(lists)', () => {
    it('adds and removes lists based on list keys and updates order accordingly, remembering the selected list', () => {
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] }
      ])
      assert.deepEqual(ml.getListKeys(), ['list1', 'list2'])
      assert.equal(ml.getSelectedListKey(), 'list1')

      ml.updateLists([
        { key: 'list3', items: ['f', 'g', 'h'] },
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] }
      ])
      assert.deepEqual(ml.getListKeys(), ['list3', 'list1', 'list2'])
      assert.equal(ml.getSelectedListKey(), 'list1')

      ml.updateLists([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])
      assert.deepEqual(ml.getListKeys(), ['list1', 'list3'])
      assert.equal(ml.getSelectedListKey(), 'list1')

      ml.updateLists([
        { key: 'list3', items: ['f', 'g', 'h'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list1', items: ['a', 'b', 'c'] }
      ])
      assert.deepEqual(ml.getListKeys(), ['list3', 'list2', 'list1'])
      assert.equal(ml.getSelectedListKey(), 'list1')
    })

    describe('when selected list is removed', () => {
      describe('when there is a new list in its place', () => {
        it('selects the new list in its place', () => {
          const didChangeSelection = sinon.spy()
          const ml = new MultiList([
            { key: 'list1', items: ['a', 'b', 'c'] },
            { key: 'list2', items: ['d', 'e'] }
          ], didChangeSelection)

          assert.equal(ml.getSelectedListKey(), 'list1')

          ml.updateLists([
            { key: 'list2', items: ['d', 'e'] }
          ])
          assert.equal(ml.getSelectedListKey(), 'list2')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['d', 'list2'])
        })
      })

      describe('when there is no list in its place', () => {
        it('selects the last list', () => {
          const didChangeSelection = sinon.spy()
          const ml = new MultiList([
            { key: 'list1', items: ['a', 'b', 'c'] },
            { key: 'list2', items: ['d', 'e'] }
          ], didChangeSelection)

          ml.selectListForKey('list2')

          didChangeSelection.reset()
          ml.updateLists([
            { key: 'list1', items: ['a', 'b', 'c'] }
          ])
          assert.equal(ml.getSelectedListKey(), 'list1')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['a', 'list1'])
        })
      })
    })

    it('maintains the selected items for each list, even if location has changed in list', () => {
      const ml = new MultiList([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] }
      ])

      ml.selectItemAtIndexForKey('list1', 1)
      assert.equal(ml.getSelectedItem(), 'b')
      ml.selectItemAtIndexForKey('list2', 1)
      assert.equal(ml.getSelectedItem(), 'e')

      ml.updateLists([
        { key: 'list1', items: ['b', 'c'] },
        { key: 'list2', items: ['a', 'd', 'e'] }
      ])

      assert.equal(ml.getSelectedListKey(), 'list2')

      ml.selectListForKey('list1')
      assert.equal(ml.getSelectedItem(), 'b')

      ml.selectListForKey('list2')
      assert.equal(ml.getSelectedItem(), 'e')
    })

    describe('when list item is no longer in the list upon update', () => {
      describe('when there is a new item in its place', () => {
        it('keeps the same selected item index and shows the new item as selected', () => {
          const didChangeSelection = sinon.spy()
          const ml = new MultiList([
            { key: 'list1', items: ['a', 'b', 'c'] }
          ], didChangeSelection)

          ml.selectItemAtIndexForKey('list1', 0)
          assert.equal(ml.getSelectedItem(), 'a')

          didChangeSelection.reset()
          ml.updateLists([
            { key: 'list1', items: ['b', 'c'] }
          ])
          assert.equal(ml.getSelectedItem(), 'b')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['b', 'list1'])

          didChangeSelection.reset()
          ml.updateLists([
            { key: 'list1', items: ['b', 'c'] }
          ])
          assert.equal(ml.getSelectedItem(), 'b')
          assert.equal(didChangeSelection.callCount, 0)
        })
      })

      describe('when there is no item in its place, but there is still an item in the list', () => {
        it('selects the last item in the list', () => {
          const didChangeSelection = sinon.spy()
          const ml = new MultiList([
            { key: 'list1', items: ['a', 'b', 'c'] }
          ], didChangeSelection)

          ml.selectItemAtIndexForKey('list1', 2)
          assert.equal(ml.getSelectedItem(), 'c')

          didChangeSelection.reset()
          ml.updateLists([
            { key: 'list1', items: ['a', 'b'] }
          ])
          assert.equal(ml.getSelectedItem(), 'b')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['b', 'list1'])

          didChangeSelection.reset()
          ml.updateLists([
            { key: 'list1', items: ['a'] }
          ])
          assert.equal(ml.getSelectedItem(), 'a')
          assert.equal(didChangeSelection.callCount, 1)
          assert.deepEqual(didChangeSelection.args[0], ['a', 'list1'])
        })
      })

      describe('when there are no more items in the list', () => {
        describe('when there is a non-empty list following the selected list', () => {
          it('selects the first item in the following list', () => {
            const didChangeSelection = sinon.spy()
            const ml = new MultiList([
              { key: 'list1', items: ['a'] },
              { key: 'list2', items: ['b', 'c'] }
            ], didChangeSelection)

            ml.selectItemAtIndexForKey('list1', 0)
            assert.equal(ml.getSelectedItem(), 'a')

            didChangeSelection.reset()
            ml.updateLists([
              { key: 'list1', items: [] },
              { key: 'list2', items: ['b', 'c'] }
            ])
            assert.equal(ml.getSelectedItem(), 'b')
            assert.equal(didChangeSelection.callCount, 1)
            assert.deepEqual(didChangeSelection.args[0], ['b', 'list2'])
          })
        })

        describe('when the following list is empty, but the preceeding list is non-empty', () => {
          it('selects the last item in the preceeding list', () => {
            const didChangeSelection = sinon.spy()
            const ml = new MultiList([
              { key: 'list1', items: ['a', 'b'] },
              { key: 'list2', items: ['c'] }
            ], didChangeSelection)

            ml.selectItemAtIndexForKey('list2', 0)
            assert.equal(ml.getSelectedItem(), 'c')

            didChangeSelection.reset()
            ml.updateLists([
              { key: 'list1', items: ['a', 'b'] },
              { key: 'list2', items: [] }
            ])
            assert.equal(ml.getSelectedItem(), 'b')
            assert.equal(ml.getSelectedItem(), 'b')
            assert.equal(didChangeSelection.callCount, 1)
            assert.deepEqual(didChangeSelection.args[0], ['b', 'list1'])
          })
        })
      })
    })
  })
})
