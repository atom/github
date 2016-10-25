/** @babel */

import CompositeListSelection from '../../lib/views/composite-list-selection'
import {assertEqualSets} from '../helpers'

describe('CompositeListSelection', () => {
  describe('selection', function () {
    it('allows specific items to be selected, but does not select across lists', function () {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: ['c'],
          staged: ['d', 'e', 'f'],
        }
      })

      selection.selectItem('e')
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['e']))
      selection.selectItem('f', true)
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['e', 'f']))
      selection.selectItem('d', true)

      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']))
      selection.selectItem('c', true)
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']))
    })

    it('allows the next and previous item to be selected', function () {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: ['c'],
          staged: ['d', 'e'],
        }
      })

      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['a']))

      selection.selectNextItem()
      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['b']))

      selection.selectNextItem()
      assert.equal(selection.getActiveListKey(), 'conflicts')
      assertEqualSets(selection.getSelectedItems(), new Set(['c']))

      selection.selectNextItem()
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['d']))

      selection.selectNextItem()
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['e']))

      selection.selectNextItem()
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['e']))

      selection.selectPreviousItem()
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['d']))

      selection.selectPreviousItem()
      assert.equal(selection.getActiveListKey(), 'conflicts')
      assertEqualSets(selection.getSelectedItems(), new Set(['c']))

      selection.selectPreviousItem()
      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['b']))

      selection.selectPreviousItem()
      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['a']))

      selection.selectPreviousItem()
      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['a']))
    })

    it('allows the selection to be expanded to the next or previous item', function () {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: ['c'],
          staged: ['d', 'e'],
        }
      })

      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['a']))

      selection.selectNextItem(true)
      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']))

      // Does not expand selections across lists
      selection.selectNextItem(true)
      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']))

      selection.selectItem('e')
      selection.selectPreviousItem(true)
      selection.selectPreviousItem(true)
      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']))
    })

  })

  describe('updateLists(listsByKey)', function () {
    it('keeps the selection head of each list pointed to an item with the same id', function () {
      let listsByKey = {
        unstaged: [{filePath: 'a'}, {filePath: 'b'}],
        conflicts: [{filePath: 'c'}],
        staged: [{filePath: 'd'}, {filePath: 'e'}, {filePath: 'f'}],
      }
      const selection = new CompositeListSelection({
        listsByKey, idForItem: (item) => item.filePath
      })

      selection.selectItem(listsByKey.unstaged[1])
      selection.selectItem(listsByKey.staged[1])
      selection.selectItem(listsByKey.staged[2], true)

      listsByKey = {
        unstaged: [{filePath: 'a'}, {filePath: 'q'}, {filePath: 'b'}, {filePath: 'r'}],
        conflicts: [{filePath: 's'}, {filePath: 'c'}],
        staged: [{filePath: 'd'}, {filePath: 't'}, {filePath: 'e'}, {filePath: 'f'}],
      }

      selection.updateLists(listsByKey)

      assert.equal(selection.getActiveListKey(), 'staged')
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.staged[3]]))

      selection.activatePreviousList()
      assert.equal(selection.getActiveListKey(), 'conflicts')
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.conflicts[1]]))

      selection.activatePreviousList()
      assert.equal(selection.getActiveListKey(), 'unstaged')
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.unstaged[2]]))
    })
  })
})
