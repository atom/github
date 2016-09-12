/** @babel */

import MultiListCollection from '../lib/multi-list-collection'

function assertSelectedItemsEqual (mlc, expectedItems) {
  assert.deepEqual(Array.from(mlc.getSelectedItems()).sort(), expectedItems.sort())
}

function assertSelectedKeysEqual (mlc, expectedKeys) {
  assert.deepEqual(Array.from(mlc.getSelectedKeys()).sort(), expectedKeys.sort())
}

describe('MultiListCollection', () => {
  describe('selectItemsAndKeysInRange(endPoint1, endPoint2)', () => {
    it('takes endpoints ({key, item}) and returns an array of items between those points', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])

      mlc.clearState()
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'b'}, {key: 'list1', item: 'c'})
      assertSelectedItemsEqual(mlc, ['b', 'c'])
      assertSelectedKeysEqual(mlc, ['list1'])

      // endpoints can be specified in any order
      mlc.clearState()
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'b'})
      assertSelectedItemsEqual(mlc, ['b', 'c'])
      assertSelectedKeysEqual(mlc, ['list1'])

      // endpoints can be in different lists
      mlc.clearState()
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list3', item: 'g'})
      assertSelectedItemsEqual(mlc, ['c', 'd', 'e', 'f', 'g'])
      assertSelectedKeysEqual(mlc, ['list1', 'list2', 'list3'])

      mlc.clearState()
      mlc.selectItemsAndKeysInRange({key: 'list3', item: 'g'}, {key: 'list1', item: 'c'})
      assertSelectedItemsEqual(mlc, ['c', 'd', 'e', 'f', 'g'])
      assertSelectedKeysEqual(mlc, ['list1', 'list2', 'list3'])

      // endpoints can be the same
      mlc.clearState()
      mlc.selectItemsAndKeysInRange({key: 'list1', item: 'c'}, {key: 'list1', item: 'c'})
      assertSelectedItemsEqual(mlc, ['c'])
      assertSelectedKeysEqual(mlc, ['list1'])
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

  describe('selectItemForKey(item, key, {tail, addToExisting})', () => {
    it('selects the items between the given item and the tail', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c'] },
        { key: 'list2', items: ['d', 'e'] },
        { key: 'list3', items: ['f', 'g', 'h'] }
      ])

      // initially tail is first item
      assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'a'})
      assertSelectedItemsEqual(mlc, ['a'])

      // tail is set to 'b'
      mlc.selectItemForKey('b', 'list1')
      assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'b'})
      assertSelectedItemsEqual(mlc, ['b'])

      // addToExisting
      mlc.selectItemForKey('e', 'list2', {addToExisting: true})
      assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'b'})
      assertSelectedItemsEqual(mlc, ['b', 'c', 'd', 'e'])

      mlc.selectItemForKey('d', 'list2', {addToExisting: true})
      assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'b'})
      assertSelectedItemsEqual(mlc, ['b', 'c', 'd'])

      // create new tail and addToExisting
      mlc.selectItemForKey('f', 'list3', {tail: true, addToExisting: true})
      assert.deepEqual(mlc.getTail(), {key: 'list3', item: 'f'})
      assertSelectedItemsEqual(mlc, ['b', 'c', 'd', 'f'])

      // addToExisting
      mlc.selectItemForKey('h', 'list3', {addToExisting: true})
      assert.deepEqual(mlc.getTail(), {key: 'list3', item: 'f'})
      assertSelectedItemsEqual(mlc, ['b', 'c', 'd', 'f', 'g', 'h'])

      // addToExisting
      mlc.selectItemForKey('g', 'list3', {addToExisting: true})
      assert.deepEqual(mlc.getTail(), {key: 'list3', item: 'f'})
      assertSelectedItemsEqual(mlc, ['b', 'c', 'd', 'f', 'g'])

      // new tail without addToExisting
      mlc.selectItemForKey('e', 'list2', {tail: true})
      assert.deepEqual(mlc.getTail(), {key: 'list2', item: 'e'})
      assertSelectedItemsEqual(mlc, ['e'])
    })
  })

  describe.only('toggleItemForKey(item, key)', () => {
    describe('when item was not previously selected', () => {
      it('selects item and sets it as new tail', () => {
        const mlc = new MultiListCollection([
          { key: 'list1', items: ['a', 'b', 'c'] },
          { key: 'list2', items: ['d', 'e'] }
        ])
        // first item is is initially set to tail
        assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'a'})
        assertSelectedItemsEqual(mlc, ['a'])
        assertSelectedKeysEqual(mlc, ['list1'])

        // new tail 'd'
        mlc.toggleItemForKey('d', 'list2')
        assert.deepEqual(mlc.getTail(), {key: 'list2', item: 'd'})
        assertSelectedItemsEqual(mlc, ['a', 'd'])
        assertSelectedKeysEqual(mlc, ['list1', 'list2'])

        // new tail 'c'
        mlc.toggleItemForKey('c', 'list1')
        assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'c'})
        assertSelectedItemsEqual(mlc, ['a', 'c', 'd'])
        assertSelectedKeysEqual(mlc, ['list1', 'list2'])
      })
    })

    describe('when item was previously selected', () => {
      it('unselects item and sets new tail as closest selected item, giving preference to those that come after', () => {
        const mlc = new MultiListCollection([
          { key: 'list1', items: ['a', 'b', 'c'] },
          { key: 'list2', items: ['d', 'e'] }
        ])
        // first item is is initially set to tail
        assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'a'})

        // addToExisting
        mlc.selectItemForKey('e', 'list2', {addToExisting: true})
        assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'a'})
        assertSelectedItemsEqual(mlc, ['a', 'b', 'c', 'd', 'e'])
        assertSelectedKeysEqual(mlc, ['list1', 'list2'])

        mlc.toggleItemForKey('d', 'list2')
        // new tail is selected item after 'd'
        assert.deepEqual(mlc.getTail(), {key: 'list2', item: 'e'})
        assertSelectedItemsEqual(mlc, ['a', 'b', 'c', 'e'])
        assertSelectedKeysEqual(mlc, ['list1', 'list2'])

        mlc.toggleItemForKey('e', 'list2')
        // new tail is selected item before 'e', since there are no selected items after
        assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'c'})
        assertSelectedItemsEqual(mlc, ['a', 'b', 'c'])
        assertSelectedKeysEqual(mlc, ['list1'])

        mlc.toggleItemForKey('c', 'list1')
        // new tail is selected item before 'c', since there are no selected items after
        assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'b'})
        assertSelectedItemsEqual(mlc, ['a', 'b'])
        assertSelectedKeysEqual(mlc, ['list1'])
      })

      describe('when tail was unselected', () => {
        it('sets new tail as closest selected item after', () => {

        })

        describe('when there are no selected items after', () => {
          it('sets new tail as closest selected item before', () => {

          })
        })
      })
    })

    it('selects/unselects item as appropriate and updates tail', () => {
      const mlc = new MultiListCollection([
        { key: 'list1', items: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
        { key: 'list2', items: ['i', 'j'] }
      ])

      assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'a'})
      assertSelectedItemsEqual(mlc, ['a'])
      assertSelectedKeysEqual(mlc, ['list1'])

      mlc.toggleItemForKey('a', 'list1')
      assert.deepEqual(mlc.getTail(), null)
      assertSelectedItemsEqual(mlc, [])
      assertSelectedKeysEqual(mlc, [])

      mlc.toggleItemForKey('b', 'list1')
      assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'b'})
      assertSelectedItemsEqual(mlc, ['b'])
      assertSelectedKeysEqual(mlc, ['list1'])



      mlc.selectItemForKey('e', 'list1', {addToExisting: true})
      assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'b'})
      assertSelectedItemsEqual(mlc, ['b', 'c', 'd', 'e'])
      assertSelectedKeysEqual(mlc, ['list1'])


    })
    it('unselects item if already selected', () => {

    })

    it('selects item if not yet selected and sets as new tail', () => {

    })

    it('sets a new tail if item is tail', () => {

    })

    it('sets a new head if item is head', () => {

    })
  })

  // toggleItemForKey
    // when this.tail should be set to null


})


it('restores previous tails if current is unselected', () => {
  const mlc = new MultiListCollection([
    { key: 'list1', items: ['a', 'b', 'c'] },
    { key: 'list2', items: ['d', 'e'] }
  ])
  // first item is is initially set to tail
  assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'a'})
  assertSelectedItemsEqual(mlc, ['a'])
  assertSelectedKeysEqual(mlc, ['list1'])

  // new tail 'd'
  mlc.toggleItemForKey('d', 'list2')
  assert.deepEqual(mlc.getTail(), {key: 'list2', item: 'd'})
  assertSelectedItemsEqual(mlc, ['a', 'd'])
  assertSelectedKeysEqual(mlc, ['list1', 'list2'])

  // new tail 'c'
  mlc.toggleItemForKey('c', 'list1')
  assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'c'})
  assertSelectedItemsEqual(mlc, ['a', 'c', 'd'])
  assertSelectedKeysEqual(mlc, ['list1', 'list2'])

  // restore previous tail when current is unselected
  mlc.toggleItemForKey('c', 'list1')
  assert.deepEqual(mlc.getTail(), {key: 'list2', item: 'd'})
  assertSelectedItemsEqual(mlc, ['a', 'd'])
  assertSelectedKeysEqual(mlc, ['list1', 'list2'])

  // restore previous tail when current is unselected
  mlc.toggleItemForKey('d', 'list2')
  assert.deepEqual(mlc.getTail(), {key: 'list1', item: 'a'})
  assertSelectedItemsEqual(mlc, ['a'])
  assertSelectedKeysEqual(mlc, ['list1'])

  // tail is undefined when current is unselected
  mlc.toggleItemForKey('a', 'list1')
  assert.isUndefined(mlc.getTail())
  assertSelectedItemsEqual(mlc, [])
  assertSelectedKeysEqual(mlc, [])
})
