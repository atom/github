/** @babel */

import FilePatch from '../../lib/models/file-patch'
import FilePatchListComponent from '../../lib/views/file-patch-list-component'

describe('FilePatchListComponent', () => {
  it('renders file diffs, allowing one of them to be selected', async () => {
    const fileDiffs = [
      new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
      new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
      new FilePatch('c.txt', null, 1234, 1234, 'removed'),
      new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
    ]

    const component = new FilePatchListComponent({fileDiffs})
    assert.equal(component.element.querySelector('.git-FilePatchListItem.modified .git-FilePatchListItem-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.added .git-FilePatchListItem-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.removed .git-FilePatchListItem-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.renamed .git-FilePatchListItem-path').textContent, 'd.txt → e.txt')

    await component.update({fileDiffs})
    assert.equal(component.element.querySelector('.git-FilePatchListItem.modified .git-FilePatchListItem-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.added .git-FilePatchListItem-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.removed .git-FilePatchListItem-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.renamed .git-FilePatchListItem-path').textContent, 'd.txt → e.txt')

    await component.selectFilePatch(fileDiffs[1])
    let selectedDiffs = component.element.querySelectorAll('.git-FilePatchListItem.is-selected .git-FilePatchListItem-path')
    assert.equal(selectedDiffs.length, 1)
    assert.deepEqual(component.selectedFilePatch, fileDiffs[1])
    assert.equal(selectedDiffs[0].textContent, 'b.txt')

    await component.selectFilePatch(fileDiffs[3])
    selectedDiffs = component.element.querySelectorAll('.git-FilePatchListItem.is-selected .git-FilePatchListItem-path')
    assert.equal(selectedDiffs.length, 1)
    assert.deepEqual(component.selectedFilePatch, fileDiffs[3])
    assert.equal(selectedDiffs[0].textContent, 'd.txt → e.txt')
  })

  describe('when a file diff is selected via single clicked', () => {
    it('invokes the supplied function', async () => {
      const fileDiffs = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const selectedDiffs = []
      const component = new FilePatchListComponent({
        fileDiffs,
        didSelectFilePatch: (d) => selectedDiffs.push(d)
      })

      component.element.querySelector('.git-FilePatchListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedDiffs, [fileDiffs[0]])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedDiffs, [fileDiffs[0], fileDiffs[3]])
    })

    it('selects the file diff', () => {
      const fileDiffs = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]

      const component = new FilePatchListComponent({fileDiffs})
      assert.deepEqual(component.selectedFilePatch, fileDiffs[0])

      component.element.querySelector('.git-FilePatchListItem.added').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(component.selectedFilePatch, fileDiffs[1])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(component.selectedFilePatch, fileDiffs[3])
    })
  })

  describe('when a file diff is double-clicked', () => {
    it('invokes the supplied function', async () => {
      const fileDiffs = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const confirmedDiffs = []
      const component = new FilePatchListComponent({
        fileDiffs,
        didConfirmFilePatch: (d) => confirmedDiffs.push(d)
      })

      component.element.querySelector('.git-FilePatchListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedDiffs, [fileDiffs[0]])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedDiffs, [fileDiffs[0], fileDiffs[3]])
    })
  })
})
