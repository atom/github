import CompositeListSelection from '../../lib/views/composite-list-selection';
import {assertEqualSets} from '../helpers';

describe('CompositeListSelection', () => {
  describe('selection', () => {
    it('allows specific items to be selected, but does not select across lists', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: ['c'],
          staged: ['d', 'e', 'f'],
        },
      });

      selection.selectItem('e');
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['e']));
      selection.selectItem('f', true);
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['e', 'f']));
      selection.selectItem('d', true);

      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']));
      selection.selectItem('c', true);
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']));
    });

    it('allows the next and previous item to be selected', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: ['c'],
          staged: ['d', 'e'],
        },
      });

      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['a']));

      assert.isTrue(selection.selectNextItem());
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['b']));

      assert.isTrue(selection.selectNextItem());
      assert.equal(selection.getActiveListKey(), 'conflicts');
      assertEqualSets(selection.getSelectedItems(), new Set(['c']));

      assert.isTrue(selection.selectNextItem());
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['d']));

      assert.isTrue(selection.selectNextItem());
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['e']));

      assert.isFalse(selection.selectNextItem());
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['e']));

      assert.isTrue(selection.selectPreviousItem());
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['d']));

      assert.isTrue(selection.selectPreviousItem());
      assert.equal(selection.getActiveListKey(), 'conflicts');
      assertEqualSets(selection.getSelectedItems(), new Set(['c']));

      assert.isTrue(selection.selectPreviousItem());
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['b']));

      assert.isTrue(selection.selectPreviousItem());
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['a']));

      assert.isFalse(selection.selectPreviousItem());
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['a']));
    });

    it('allows the selection to be expanded to the next or previous item', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: ['c'],
          staged: ['d', 'e'],
        },
      });

      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['a']));

      selection.selectNextItem(true);
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']));

      // Does not expand selections across lists
      selection.selectNextItem(true);
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']));

      selection.selectItem('e');
      selection.selectPreviousItem(true);
      selection.selectPreviousItem(true);
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['d', 'e']));
    });

    it('skips empty lists when selecting the next or previous item', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: [],
          staged: ['d', 'e'],
        },
      });

      selection.selectNextItem();
      selection.selectNextItem();
      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set(['d']));
      selection.selectPreviousItem();
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set(['b']));
    });

    it('collapses the selection when moving down with the next list empty or up with the previous list empty', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: [],
          staged: [],
        },
      });

      selection.selectNextItem(true);
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']));
      selection.selectNextItem();
      assertEqualSets(selection.getSelectedItems(), new Set(['b']));

      selection.updateLists({
        unstaged: [],
        conflicts: [],
        staged: ['a', 'b'],
      });

      selection.selectNextItem();
      selection.selectPreviousItem(true);
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b']));
      selection.selectPreviousItem();
      assertEqualSets(selection.getSelectedItems(), new Set(['a']));
    });

    it('allows selections to be added in the current active list, but updates the existing selection when activating a different list', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b', 'c'],
          conflicts: [],
          staged: ['e', 'f', 'g'],
        },
      });

      selection.addOrSubtractSelection('c');
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'c']));

      selection.addOrSubtractSelection('g');
      assertEqualSets(selection.getSelectedItems(), new Set(['g']));
    });

    it('allows all items in the active list to be selected', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b', 'c'],
          conflicts: [],
          staged: ['e', 'f', 'g'],
        },
      });

      selection.selectAllItems();
      assertEqualSets(selection.getSelectedItems(), new Set(['a', 'b', 'c']));

      selection.activateNextSelection();
      selection.selectAllItems();
      assertEqualSets(selection.getSelectedItems(), new Set(['e', 'f', 'g']));
    });

    it('allows the first or last item in the active list to be selected', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b', 'c'],
          conflicts: [],
          staged: ['e', 'f', 'g'],
        },
      });

      selection.activateNextSelection();
      selection.selectLastItem();
      assertEqualSets(selection.getSelectedItems(), new Set(['g']));
      selection.selectFirstItem();
      assertEqualSets(selection.getSelectedItems(), new Set(['e']));
      selection.selectLastItem(true);
      assertEqualSets(selection.getSelectedItems(), new Set(['e', 'f', 'g']));
      selection.selectNextItem();
      assertEqualSets(selection.getSelectedItems(), new Set(['g']));
      selection.selectFirstItem(true);
      assertEqualSets(selection.getSelectedItems(), new Set(['e', 'f', 'g']));
    });

    it('allows the last non-empty selection to be chosen', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b', 'c'],
          conflicts: ['e', 'f'],
          staged: [],
        },
      });

      assert.isTrue(selection.activateLastSelection());
      assertEqualSets(selection.getSelectedItems(), new Set(['e']));
    });
  });

  describe('updateLists(listsByKey)', () => {
    it('keeps the selection head of each list pointed to an item with the same id', () => {
      let listsByKey = {
        unstaged: [{filePath: 'a'}, {filePath: 'b'}],
        conflicts: [{filePath: 'c'}],
        staged: [{filePath: 'd'}, {filePath: 'e'}, {filePath: 'f'}],
      };
      const selection = new CompositeListSelection({
        listsByKey, idForItem: item => item.filePath,
      });

      selection.selectItem(listsByKey.unstaged[1]);
      selection.selectItem(listsByKey.staged[1]);
      selection.selectItem(listsByKey.staged[2], true);

      listsByKey = {
        unstaged: [{filePath: 'a'}, {filePath: 'q'}, {filePath: 'b'}, {filePath: 'r'}],
        conflicts: [{filePath: 's'}, {filePath: 'c'}],
        staged: [{filePath: 'd'}, {filePath: 't'}, {filePath: 'e'}, {filePath: 'f'}],
      };

      selection.updateLists(listsByKey);

      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.staged[3]]));

      selection.activatePreviousSelection();
      assert.equal(selection.getActiveListKey(), 'conflicts');
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.conflicts[1]]));

      selection.activatePreviousSelection();
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.unstaged[2]]));
    });

    it('collapses to the start of the previous selection if the old head item is removed', () => {
      let listsByKey = {
        unstaged: [{filePath: 'a'}, {filePath: 'b'}, {filePath: 'c'}],
        conflicts: [],
        staged: [{filePath: 'd'}, {filePath: 'e'}, {filePath: 'f'}],
      };
      const selection = new CompositeListSelection({
        listsByKey, idForItem: item => item.filePath,
      });

      selection.selectItem(listsByKey.unstaged[1]);
      selection.selectItem(listsByKey.unstaged[2], true);
      selection.selectItem(listsByKey.staged[1]);

      listsByKey = {
        unstaged: [{filePath: 'a'}],
        conflicts: [],
        staged: [{filePath: 'd'}, {filePath: 'f'}],
      };
      selection.updateLists(listsByKey);

      assert.equal(selection.getActiveListKey(), 'staged');
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.staged[1]]));

      selection.activatePreviousSelection();
      assert.equal(selection.getActiveListKey(), 'unstaged');
      assertEqualSets(selection.getSelectedItems(), new Set([listsByKey.unstaged[0]]));
    });

    it('activates the first non-empty list following or preceding the current active list if one exists', () => {
      const selection = new CompositeListSelection({
        listsByKey: {
          unstaged: ['a', 'b'],
          conflicts: [],
          staged: [],
        },
      });

      selection.updateLists({
        unstaged: [],
        conflicts: [],
        staged: ['a', 'b'],
      });
      assert.equal(selection.getActiveListKey(), 'staged');

      selection.updateLists({
        unstaged: ['a', 'b'],
        conflicts: [],
        staged: [],
      });
      assert.equal(selection.getActiveListKey(), 'unstaged');
    });
  });
});
