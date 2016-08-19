/** @babel */

import MultiListCollection from '../lib/multi-list-collection'

describe('MultiListCollection', () => {
  describe('selectItemsAndKeysInRange(endPoint1, endPoint2)', () => {
    it('takes endpoints ({key, item}) and returns an array of items between those points', () => {
      const ml = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])

      ml.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list1', item: 'c'})
      assert.deepEqual([...ml.getSelectedItems()], ['b', 'c'])
      assert.deepEqual([...ml.getSelectedKeys()], ['list1'])

      // endpoints can be specified in any order
      ml.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'b'})
      assert.deepEqual([...ml.getSelectedItems()], ['b', 'c'])
      assert.deepEqual([...ml.getSelectedKeys()], ['list1'])

      // endpoints can be in different lists
      ml.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list3', item: 'g'})
      assert.deepEqual([...ml.getSelectedItems()], ['c', 'd', 'e', 'f', 'g'])
      assert.deepEqual([...ml.getSelectedKeys()], ['list1', 'list2', 'list3'])

      ml.selectItemsAndKeysInRange({key: 'list3', item: 'g'}, {key: 'list1', item: 'c'})
      assert.deepEqual([...ml.getSelectedItems()], ['c', 'd', 'e', 'f', 'g'])
      assert.deepEqual([...ml.getSelectedKeys()], ['list1', 'list2', 'list3'])

      // endpoints can be the same
      ml.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'c'})
      assert.deepEqual([...ml.getSelectedItems()], ['c'])
      assert.deepEqual([...ml.getSelectedKeys()], ['list1'])
    })

    it('throws error when keys or items aren\'t found', () => {
      const ml = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] }
      ])

      assert.throws(() => {
        ml.selectItemsAndKeysInRange({key: 'non-existent-key', item: 'b'}, {key: 'list1', item: 'c'})
      }, 'key "non-existent-key" not found')

      assert.throws(() => {
        ml.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'non-existent-key', item: 'c'})
      }, 'key "non-existent-key" not found')

      assert.throws(() => {
        ml.selectItemsAndKeysInRange({key: 'list1', item: 'x'}, {key: 'list1', item: 'c'})
      }, 'item "x" not found')

      assert.throws(() => {
        ml.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list1', item: 'x'})
      }, 'item "x" not found')
    })
  })
})
