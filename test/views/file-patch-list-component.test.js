/** @babel */

import FilePatch from '../../lib/models/file-patch'
import FilePatchListComponent from '../../lib/views/file-patch-list-component'

describe('FilePatchListComponent', () => {
  it('renders file patches, allowing one of them to be selected', async () => {
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
    let selectedPatches = component.element.querySelectorAll('.git-FilePatchListItem.is-selected .git-FilePatchListItem-path')
    assert.equal(selectedPatches.length, 1)
    assert.deepEqual(component.selectedFilePatch, filePatches[1])
    assert.equal(selectedPatches[0].textContent, 'b.txt')

    await component.selectFilePatch(filePatches[3])
    selectedPatches = component.element.querySelectorAll('.git-FilePatchListItem.is-selected .git-FilePatchListItem-path')
    assert.equal(selectedPatches.length, 1)
    assert.deepEqual(component.selectedFilePatch, filePatches[3])
    assert.equal(selectedPatches[0].textContent, 'd.txt → e.txt')
  })

  describe('when a file patch is selected via single clicked', () => {
    it('invokes the supplied function', async () => {
      const filePatches = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const selectedPatches = []
      const component = new FilePatchListComponent({
        filePatches,
        didSelectFilePatch: (d) => selectedPatches.push(d)
      })

      component.element.querySelector('.git-FilePatchListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedPatches, [filePatches[0]])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedPatches, [filePatches[0], filePatches[3]])
    })

    it('selects the file patch', () => {
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

  describe('when a file patch is double-clicked', () => {
    it('invokes the supplied function', async () => {
      const filePatches = [
        new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified'),
        new FilePatch(null, 'b.txt', 1234, 1234, 'added'),
        new FilePatch('c.txt', null, 1234, 1234, 'removed'),
        new FilePatch('d.txt', 'e.txt', 1234, 1234, 'renamed')
      ]
      const confirmedPatches = []
      const component = new FilePatchListComponent({
        filePatches,
        didConfirmFilePatch: (d) => confirmedPatches.push(d)
      })

      component.element.querySelector('.git-FilePatchListItem.modified').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedPatches, [filePatches[0]])

      component.element.querySelector('.git-FilePatchListItem.renamed').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedPatches, [filePatches[0], filePatches[3]])
    })
  })
})
