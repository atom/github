/** @babel */

import CompositeListSelection from '../../lib/views/composite-list-selection'
import {assertEqualSets} from '../helpers'

describe('CompositeListSelection', () => {
  it('allows specific items to be selected, but does not select across lists', function () {
    const selection = new CompositeListSelection({
      unstagedChanges: ['a', 'b'],
      mergeConflicts: ['c'],
      stagedChanges: ['d', 'e', 'f'],
    })

    selection.selectItem('e')
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['e']))
    selection.selectItem('f', true)
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['e', 'f']))
    selection.selectItem('d', true)
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']))
    selection.selectItem('c', true)
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']))
  })

  it('allows the next and previous item to be selected', function () {
    const selection = new CompositeListSelection({
      unstagedChanges: ['a', 'b'],
      mergeConflicts: ['c'],
      stagedChanges: ['d', 'e'],
    })

    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['a']))

    selection.selectNextItem()
    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['b']))

    selection.selectNextItem()
    assert.equal(selection.getActiveListKey(), 'mergeConflicts')
    assertEqualSets(selection.getSelectedItems(), new Set(['c']))

    selection.selectNextItem()
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['d']))

    selection.selectNextItem()
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['e']))

    selection.selectNextItem()
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['e']))

    selection.selectPreviousItem()
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['d']))

    selection.selectPreviousItem()
    assert.equal(selection.getActiveListKey(), 'mergeConflicts')
    assertEqualSets(selection.getSelectedItems(), new Set(['c']))

    selection.selectPreviousItem()
    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['b']))

    selection.selectPreviousItem()
    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['a']))

    selection.selectPreviousItem()
    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['a']))
  })

  it('allows the selection to be expanded to the next or previous item', function () {
    const selection = new CompositeListSelection({
      unstagedChanges: ['a', 'b'],
      mergeConflicts: ['c'],
      stagedChanges: ['d', 'e'],
    })

    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['a']))

    selection.selectNextItem(true)
    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']))

    // Does not expand selections across lists
    selection.selectNextItem(true)
    assert.equal(selection.getActiveListKey(), 'unstagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']))

    selection.selectItem('e')
    selection.selectPreviousItem(true)
    selection.selectPreviousItem(true)
    assert.equal(selection.getActiveListKey(), 'stagedChanges')
    assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']))
  })
})
