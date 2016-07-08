/** @babel */

import {copyRepositoryDir, buildRepository, cloneRepository, createEmptyCommit} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StatusBarView from '../../lib/views/status-bar-view'

describe('StatusBarView', () => {
  it('shows the changed files count when there is a repository and its data is loaded', async () => {
    const view = new StatusBarView({repository: null})
    const {changedFiles} = view.refs
    assert.equal(changedFiles.textContent, '')
    assert.equal(changedFiles.style.display, 'none')

    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    view.update({repository})
    await view.lastModelDataRefreshPromise
    assert.equal(changedFiles.textContent, 'No changes.')
    assert.equal(changedFiles.style.display, '')

    fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
    await repository.refresh()
    await view.lastModelDataRefreshPromise
    assert.equal(changedFiles.textContent, '1 file changed.')
    assert.equal(changedFiles.style.display, '')

    fs.unlinkSync(path.join(workdirPath, 'b.txt'))
    await repository.refresh()
    await view.lastModelDataRefreshPromise
    assert.equal(changedFiles.textContent, '2 files changed.')
    assert.equal(changedFiles.style.display, '')
  })

  it('invokes the supplied handler when the changed files label is clicked', async () => {
    const workdirPath = await copyRepositoryDir(1)
    const repository = await buildRepository(workdirPath)
    const didClickChangedFiles1 = sinon.spy()
    const view = new StatusBarView({repository, didClickChangedFiles: didClickChangedFiles1})
    const {changedFiles} = view.refs

    await view.lastModelDataRefreshPromise
    changedFiles.dispatchEvent(new MouseEvent('click'))
    assert(didClickChangedFiles1.called)

    const didClickChangedFiles2 = sinon.spy()
    await view.update({repository, didClickChangedFiles: didClickChangedFiles2})
    changedFiles.dispatchEvent(new MouseEvent('click'))
    assert(didClickChangedFiles2.called)
  })
})
