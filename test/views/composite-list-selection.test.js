/** @babel */

import CompositeListSelection from '../../lib/views/composite-list-selection'
import {assertEqualSets} from '../helpers'

describe('CompositeListSelection', () => {
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
})
