/** @babel */

import FilePatch from '../../lib/models/file-patch'
import FilePatchListComponent from '../../lib/views/file-patch-list-component'

describe('FilePatchListComponent', () => {
  it('renders file diffs, adding an "is-selected" class to the specified selectedFilePatch', async () => {
    const filePatches = [
      new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
      new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
      new FilePatch('c.txt', null, 1234, 1234, 'removed'),
      new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
    ]

    // create a selectedFilePatch object that looks the same as filePatches[1] but not deep-equal
    //  fetched model data contains newly constructed file patch objects each time
    //  so the selectedFilePatch object may be different if model is updated
    const selectedFilePatch = new FilePatch(null, 'b.txt', 1234, 1234, 'added')

    const component = new FilePatchListComponent({filePatches, selectedFilePatch})
    assert.equal(component.element.querySelector('.git-FilePatchListItem.modified .git-FilePatchListItem-path').textContent, 'a.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.added .git-FilePatchListItem-path').textContent, 'b.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.removed .git-FilePatchListItem-path').textContent, 'c.txt')
    assert.equal(component.element.querySelector('.git-FilePatchListItem.renamed .git-FilePatchListItem-path').textContent, 'd.txt → e.txt')
    assert.equal(component.element.querySelector('.is-selected .git-FilePatchListItem-path').textContent, 'b.txt')
  })

  describe('selectFilePatch(filePatch)', () => {
    it('allows a file patch to be selected', async () => {
      const filePatches = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]

      const component = new FilePatchListComponent({filePatches})
      assert.equal(component.element.querySelector('.git-FilePatchListItem.modified .git-FilePatchListItem-path').textContent, 'a.txt')
      assert.equal(component.element.querySelector('.git-FilePatchListItem.added .git-FilePatchListItem-path').textContent, 'b.txt')
      assert.equal(component.element.querySelector('.git-FilePatchListItem.removed .git-FilePatchListItem-path').textContent, 'c.txt')
      assert.equal(component.element.querySelector('.git-FilePatchListItem.renamed .git-FilePatchListItem-path').textContent, 'd.txt → e.txt')

      await component.update({filePatches})
      assert.equal(component.element.querySelector('.git-FilePatchListItem.modified .git-FilePatchListItem-path').textContent, 'a.txt')
      assert.equal(component.element.querySelector('.git-FilePatchListItem.added .git-FilePatchListItem-path').textContent, 'b.txt')
      assert.equal(component.element.querySelector('.git-FilePatchListItem.removed .git-FilePatchListItem-path').textContent, 'c.txt')
      assert.equal(component.element.querySelector('.git-FilePatchListItem.renamed .git-FilePatchListItem-path').textContent, 'd.txt → e.txt')

      await component.selectFilePatch(filePatches[1])
      let selectedDiffs = component.element.querySelectorAll('.git-FilePatchListItem.is-selected .git-FilePatchListItem-path')
      assert.equal(selectedDiffs.length, 1)
      assert.deepEqual(component.selectedFilePatch, filePatches[1])
      assert.equal(selectedDiffs[0].textContent, 'b.txt')

      await component.selectFilePatch(filePatches[3])
      selectedDiffs = component.element.querySelectorAll('.git-FilePatchListItem.is-selected .git-FilePatchListItem-path')
      assert.equal(selectedDiffs.length, 1)
      assert.deepEqual(component.selectedFilePatch, filePatches[3])
      assert.equal(selectedDiffs[0].textContent, 'd.txt → e.txt')
    })
  })

  describe('when a file diff is selected via single clicked', () => {
    it('invokes the supplied function', async () => {
      const filePatches = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const selectedDiffs = []
      const component = new FilePatchListComponent({
        filePatches,
        didSelectFilePatch: (d) => selectedDiffs.push(d)
      })

      component.element.querySelector('.git-FilePatchListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedDiffs, [filePatches[0]])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedDiffs, [filePatches[0], filePatches[3]])
    })

    it('selects the file diff', () => {
      const filePatches = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]

      const component = new FilePatchListComponent({filePatches})
      assert.deepEqual(component.selectedFilePatch, filePatches[0])

      component.element.querySelector('.git-FilePatchListItem.added').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(component.selectedFilePatch, filePatches[1])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(component.selectedFilePatch, filePatches[3])
    })
  })

  describe('when a file diff is double-clicked', () => {
    it('invokes the supplied function', async () => {
      const filePatches = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const confirmedDiffs = []
      const component = new FilePatchListComponent({
        filePatches,
        didConfirmFilePatch: (d) => confirmedDiffs.push(d)
      })

      component.element.querySelector('.git-FilePatchListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedDiffs, [filePatches[0]])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedDiffs, [filePatches[0], filePatches[3]])
    })
  })
})
