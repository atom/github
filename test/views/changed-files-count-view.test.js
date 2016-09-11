/** @babel */

import sinon from 'sinon'

import FilePatch from '../../lib/models/file-patch'
import ChangedFilesCountView from '../../lib/views/changed-files-count-view'

describe('ChangedFilesCountView', () => {
  it('shows the count of the unique files that have changed', async () => {
    const patch1 = new FilePatch('a.txt', 'a.txt', 'modified')
    const patch2 = new FilePatch('b.txt', 'b.txt', 'modified')
    const patch3 = new FilePatch(null, 'c.txt', 'added')
    const patch4 = new FilePatch('a.txt', null, 'deleted')
    const view = new ChangedFilesCountView({stagedChanges: [], unstagedChanges: []})
    assert.isUndefined(view.refs.changedFiles)

    await view.update({stagedChanges: [patch1], unstagedChanges: [patch3]})
    assert.equal(view.refs.changedFiles.textContent, '2 files')

    await view.update({stagedChanges: [patch1, patch2], unstagedChanges: [patch3, patch4]})
    assert.equal(view.refs.changedFiles.textContent, '3 files')
  })

  it('invokes the supplied handler when the label is clicked', async () => {
    const patch = new FilePatch('a.txt', 'a.txt', 'modified')
    const didClick = sinon.spy()
    const view = new ChangedFilesCountView({stagedChanges: [patch], unstagedChanges: [], didClick})
    view.refs.changedFiles.dispatchEvent(new MouseEvent('click'))
    assert(didClick.called)
  })
})
