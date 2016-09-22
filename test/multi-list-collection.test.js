/** @babel */

import MultiListCollection from '../lib/multi-list-collection'

describe('MultiListCollection', () => {
  describe('selectItemsAndKeysInRange(endPoint1, endPoint2)', () => {
    it('takes endpoints ({key, item}) and returns an array of items between those points', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])

      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list1', item: 'c'})
      assert.deepEqual([...mlc.getSelectedItems()], ['b', 'c'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1'])

      // endpoints can be specified in any order
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'b'})
      assert.deepEqual([...mlc.getSelectedItems()], ['b', 'c'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1'])

      // endpoints can be in different lists
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list3', item: 'g'})
      assert.deepEqual([...mlc.getSelectedItems()], ['c', 'd', 'e', 'f', 'g'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1', 'list2', 'list3'])

      mlc.selectItemsAndKeysInRange({key: 'list3', item: 'g'}, {key: 'list1', item: 'c'})
      assert.deepEqual([...mlc.getSelectedItems()], ['c', 'd', 'e', 'f', 'g'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1', 'list2', 'list3'])

      // endpoints can be the same
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'c'})
      assert.deepEqual([...mlc.getSelectedItems()], ['c'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list1'])
    })

    it('selects first key and first item when multiple are selected', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])

      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list3', item: 'g'})
      assert.deepEqual(mlc.getLastSelectedListKey(), 'list1')
      assert.deepEqual(mlc.getLastSelectedItem(), 'b')
    })

    it('handles selection across the 10th item', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] }
      ])

      mlc.selectItemsAndKeysInRange({key: 'list1', item: 7}, {key: 'list1', item: 12})
      assert.deepEqual([...mlc.getSelectedItems()], [7, 8, 9, 10, 11, 12])
    })

    it('throws error when keys or items aren\'t found', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] }
      ])

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'non-existent-key', item: 'b'}, {key: 'list1', item: 'c'})
      }, 'key "non-existent-key" not found')

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'non-existent-key', item: 'c'})
      }, 'key "non-existent-key" not found')

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'list1', item: 'x'}, {key: 'list1', item: 'c'})
      }, 'item "x" not found')

      assert.throws(() => {
        mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list1', item: 'x'})
      }, 'item "x" not found')
    })
  })

  describe('updateLists', () => {
    it('updates selection based on previously selected keys and items', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] }
      ])

      mlc.selectItems(['b'])
      assert.deepEqual([...mlc.getSelectedItems()], ['b'])

      mlc.updateLists([
        { key: 'list3', items: ['a', 'c'] },
        { key: 'list4', items: ['d', 'e'] }
      ])
      assert.deepEqual([...mlc.getSelectedItems()], ['c'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list3'])

      mlc.updateLists([
        { key: 'list5', items: ['a'] },
        { key: 'list6', items: ['d', 'e'] }
      ])
      assert.deepEqual([...mlc.getSelectedItems()], ['d'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list6'])
    })

    it('updates selection based on previously selected keys and items', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] }
      ])

      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list2', item: 'd'})
      mlc.updateLists([
        { key: 'list3', items: ['a', 'e'] },
        { key: 'list4', items: ['f', 'g', 'h'] }
      ])
      assert.deepEqual([...mlc.getSelectedItems()], ['e'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list3'])

      mlc.selectItemsAndKeysInRange({key: 'list4', item: 'f'}, {key: 'list4', item: 'h'})
      mlc.updateLists([
        { key: 'list5', items: ['a', 'e'] }
      ])
      assert.deepEqual([...mlc.getSelectedItems()], ['e'])
      assert.deepEqual([...mlc.getSelectedKeys()], ['list5'])
    })
  })
})
