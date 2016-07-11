/** @babel */

import {copyRepositoryDir, buildRepository, cloneRepository, createEmptyCommit} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import FilePatch from '../../lib/models/file-patch'
import ChangedFilesCountView from '../../lib/views/changed-files-count-view'

describe('ChangedFilesCountView', () => {
  it('shows the count of the unique files that have changed', async () => {
    const patch1 = new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed')
    const patch2 = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified')
    const patch3 = new FilePatch(null, 'a.txt', 0, 1234, 'added')
    const patch4 = new FilePatch('a.txt', null, 1234, 0, 'removed')
    const view = new ChangedFilesCountView({stagedChanges: [], unstagedChanges: []})
    assert.isUndefined(view.refs.changedFiles)

    await view.update({stagedChanges: [patch1], unstagedChanges: [patch3]})
    assert.equal(view.refs.changedFiles.textContent, '2 files')

    await view.update({stagedChanges: [patch1, patch2], unstagedChanges: [patch1, patch2, patch3, patch4]})
    assert.equal(view.refs.changedFiles.textContent, '4 files')
  })

  it('invokes the supplied handler when the label is clicked', async () => {
    const patch = new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed')
    const didClick = sinon.spy()
    const view = new ChangedFilesCountView({stagedChanges: [patch], unstagedChanges: [], didClick})
    view.refs.changedFiles.dispatchEvent(new MouseEvent('click'))
    assert(didClick.called)
  })
})
