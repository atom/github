/** @babel */

import etch from 'etch'

import CommitPanelComponent from '../lib/commit-panel-component'
import FakeRepository from './fake-repository'
import SynchronousScheduler from './etch-synchronous-scheduler'

describe('CommitPanelComponent', () => {
  let previousScheduler

  beforeEach(() => {
    previousScheduler = etch.getScheduler()
    etch.setScheduler(new SynchronousScheduler())
  })

  afterEach(() => {
    etch.setScheduler(previousScheduler)
  })

  it('renders the contents of the staging area unless there is no active repository', () => {
    const component = new CommitPanelComponent({repository: null})
    assert.equal(component.element.textContent, 'In order to use git features, please open a file that belongs to a git repository.')

    const repository1 = new FakeRepository
    repository1.getStagingArea().addChangedFile({status: 'created', newName: 'created-file'})
    component.update({repository: repository1})
    assert.equal(component.element.querySelector('.changed-file.created').textContent, 'created-file')

    const repository2 = new FakeRepository
    repository2.getStagingArea().addChangedFile({status: 'deleted', newName: 'deleted-file'})
    component.update({repository: repository2})
    assert.equal(component.element.querySelector('.changed-file.deleted').textContent, 'deleted-file')
  })
})
