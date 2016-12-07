/** @babel */

import MultiListCollection from '../lib/multi-list-collection';

describe('MultiListCollection', () => {
  describe('selectItemsAndKeysInRange(endPoint1, endPoint2)', () => {
    it('takes endpoints ({key, item}) and returns an array of items between those points', () => {
      const mlc = new MultiListCollection([
        {key: 'list1', items: ['a', 'b', 'c']},
        {key: 'list2', items: ['d', 'e']},
        {key: 'list3', items: ['f', 'g', 'h']},
      ]);

      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list1', item: 'c'});
      assert.deepEqual([...mlc.getSelectedItems()], ['b', 'c']);
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1']);

      // endpoints can be specified in any order
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'b'});
      assert.deepEqual([...mlc.getSelectedItems()], ['b', 'c']);
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1']);

      // endpoints can be in different lists
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list3', item: 'g'});
      assert.deepEqual([...mlc.getSelectedItems()], ['c', 'd', 'e', 'f', 'g']);
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1', 'list2', 'list3']);

      mlc.selectItemsAndKeysInRange({key: 'list3', item: 'g'}, {key: 'list1', item: 'c'});
      assert.deepEqual([...mlc.getSelectedItems()], ['c', 'd', 'e', 'f', 'g']);
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1', 'list2', 'list3']);

      // endpoints can be the same
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'c'});
      assert.deepEqual([...mlc.getSelectedItems()], ['c']);
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1']);
    });

    it('sets the first key and first item as active when multiple are selected', () => {
      const mlc = new MultiListCollection([
        {key: 'list1', items: ['a', 'b', 'c']},
        {key: 'list2', items: ['d', 'e']},
        {key: 'list3', items: ['f', 'g', 'h']},
      ]);

      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list3', item: 'g'});
      assert.equal(mlc.getActiveListKey(), 'list1');
      assert.equal(mlc.getActiveItem(), 'b');
    });

    it('sorts endpoint item indexes correctly based on numerical values and not strings', () => {
      // this addresses a bug where selecting across the 10th item index would return an empty set
      // because the indices would be stringified by the sort function ("12" < "7")
      const mlc = new MultiListCollection([
        {key: 'list1', items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]},
      ]);

      mlc.selectItemsAndKeysInRange({key: 'list1', item: 7}, {key: 'list1', item: 12});
      assert.deepEqual([...mlc.getSelectedItems()], [7, 8, 9, 10, 11, 12]);
    });

    it('throws error when keys or items aren\'t found', () => {
      const mlc = new MultiListCollection([
        {key: 'list1', items: ['a', 'b', 'c']},
      ]);

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'non-existent-key', item: 'b'}, {key: 'list1', item: 'c'});
      }, 'key "non-existent-key" not found');

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'non-existent-key', item: 'c'});
      }, 'key "non-existent-key" not found');

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'list1', item: 'x'}, {key: 'list1', item: 'c'});
      }, 'item "x" not found');

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list1', item: 'x'});
      }, 'item "x" not found');
    });
  });

  describe('updateLists', () => {
    describe('when the active list key and item is still present after update', () => {
      it('maintains active item regardless of positional changes', () => {
        const mlc = new MultiListCollection([
          {key: 'list1', items: ['a']},
        ]);

        assert.equal(mlc.getActiveItem(), 'a');

        mlc.updateLists([
          {key: 'list1', items: ['b', 'a']},
        ]);
        assert.equal(mlc.getActiveItem(), 'a');

        mlc.updateLists([
          {key: 'list1', items: ['a']},
        ]);
        assert.equal(mlc.getActiveItem(), 'a');

        mlc.updateLists([
          {key: 'list2', items: ['c']},
          {key: 'list1', items: ['a']},
        ]);
        assert.equal(mlc.getActiveItem(), 'a');

        mlc.updateLists([
          {key: 'list1', items: ['a']},
        ]);
        assert.equal(mlc.getActiveItem(), 'a');
      });
    });

    describe('when the active list key and item is NOT present after update', () => {
      it('updates selection based on the location of the previously active item and key', () => {
        const mlc = new MultiListCollection([
          {key: 'list1', items: ['a', 'b', 'c']},
          {key: 'list2', items: ['d', 'e']},
        ]);

        mlc.selectItems(['b']);
        assert.equal(mlc.getActiveItem(), 'b');

        mlc.updateLists([
          {key: 'list3', items: ['a', 'c']},
          {key: 'list4', items: ['d', 'e']},
        ]);
        assert.equal(mlc.getActiveItem(), 'c');

        mlc.updateLists([
          {key: 'list5', items: ['a']},
          {key: 'list6', items: ['d', 'e']},
          {key: 'list7', items: ['f', 'g', 'h']},
        ]);
        assert.equal(mlc.getActiveItem(), 'd');

        mlc.selectItemsAndKeysInRange({key: 'list6', item: 'e'}, {key: 'list7', item: 'g'});
        assert.equal(mlc.getActiveItem(), 'e');
        mlc.updateLists([
          {key: 'list8', items: ['a']},
          {key: 'list9', items: ['d', 'h']},
        ]);
        assert.equal(mlc.getActiveItem(), 'h');

        mlc.selectItemsAndKeysInRange({key: 'list9', item: 'd'}, {key: 'list9', item: 'h'});
        assert.equal(mlc.getActiveItem(), 'd');
        mlc.updateLists([
          {key: 'list10', items: ['a', 'i', 'j']},
        ]);
        assert.equal(mlc.getActiveItem(), 'j');
      });
    });
  });
});
