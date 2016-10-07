/** @babel */

import sinon from 'sinon'

import FilePatch from '../../lib/models/file-patch'
import ChangedFilesCountView from '../../lib/views/changed-files-count-view'

describe('ChangedFilesCountView', () => {
  it('shows the count of the unique files that have changed', async () => {
    const view = new ChangedFilesCountView({changedFilesCount: 0})
    assert.isUndefined(view.refs.changedFiles)

    await view.update({changedFilesCount: 2})
    assert.equal(view.refs.changedFiles.textContent, '2 files')

    await view.update({changedFilesCount: 3})
    assert.equal(view.refs.changedFiles.textContent, '3 files')
  })

  it('invokes the supplied handler when the label is clicked', async () => {
    const didClick = sinon.spy()
    const view = new ChangedFilesCountView({changedFilesCount: 1, didClick})
    view.refs.changedFiles.dispatchEvent(new MouseEvent('click'))
    assert(didClick.called)
  })
})
