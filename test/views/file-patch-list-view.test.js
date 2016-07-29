/** @babel */

import FilePatch from '../../lib/models/file-patch'
import FilePatchListView from '../../lib/views/file-patch-list-view'

describe('FilePatchListView', () => {
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

    const view = new FilePatchListView({filePatches, selectedFilePatchIndex: 1})
    assert.equal(view.element.querySelector('.git-FilePatchListView-item.is-modified .git-FilePatchListView-path').textContent, 'a.txt')
    assert.equal(view.element.querySelector('.git-FilePatchListView-item.is-added .git-FilePatchListView-path').textContent, 'b.txt')
    assert.equal(view.element.querySelector('.git-FilePatchListView-item.is-removed .git-FilePatchListView-path').textContent, 'c.txt')
    assert.equal(view.element.querySelector('.git-FilePatchListView-item.is-renamed .git-FilePatchListView-path').textContent, 'd.txt → e.txt')
    assert.equal(view.element.querySelector('.is-selected .git-FilePatchListView-path').textContent, 'b.txt')
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
      const view = new FilePatchListView({
        filePatches,
        didSelectFilePatch: (d) => selectedPatches.push(d)
      })

      view.element.querySelector('.git-FilePatchListView-item.is-modified').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedPatches, [filePatches[0]])

      view.element.querySelector('.git-FilePatchListView-item.is-renamed').dispatchEvent(new MouseEvent('click', {detail: 1}))
      assert.deepEqual(selectedPatches, [filePatches[0], filePatches[3]])
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
      const view = new FilePatchListView({
        filePatches,
        didConfirmFilePatch: (d) => confirmedPatches.push(d)
      })

      view.element.querySelector('.git-FilePatchListView-item.is-modified').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedPatches, [filePatches[0]])

      view.element.querySelector('.git-FilePatchListView-item.is-renamed').dispatchEvent(new MouseEvent('click', {detail: 2}))
      assert.deepEqual(confirmedPatches, [filePatches[0], filePatches[3]])
    })
  })
})
