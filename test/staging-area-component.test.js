/** @babel */

import etch from 'etch'

import FakeStagingArea from './fake-staging-area'
import StagingAreaComponent from '../lib/staging-area-component'
import SynchronousScheduler from './etch-synchronous-scheduler'

describe('StagingAreaComponent', () => {
  let previousScheduler

  beforeEach(() => {
    previousScheduler = etch.getScheduler()
    etch.setScheduler(new SynchronousScheduler())
  })

  afterEach(() => {
    etch.setScheduler(previousScheduler)
  })

  it('renders files that have changed', () => {
    const stagingArea1 = new FakeStagingArea()
    const stagingArea2 = new FakeStagingArea()
    const component = new StagingAreaComponent({stagingArea: stagingArea1})

    component.update({stagingArea: stagingArea2})

    const file1 = stagingArea2.addChangedFile({status: 'added', newName: 'file-1'})
    const file2 = stagingArea2.addChangedFile({status: 'modified', newName: 'file-2'})
    const file3 = stagingArea2.addChangedFile({status: 'removed', newName: 'file-3'})
    const file4 = stagingArea2.addChangedFile({status: 'renamed', oldName: 'file-4', newName: 'file-4-renamed'})

    assert.equal(component.element.querySelector('.git-ChangedFile.added').textContent, 'file-1')
    assert.equal(component.element.querySelector('.git-ChangedFile.modified').textContent, 'file-2')
    assert.equal(component.element.querySelector('.git-ChangedFile.removed').textContent, 'file-3')
    assert.equal(component.element.querySelector('.git-ChangedFile.renamed').textContent, 'file-4 -> file-4-renamed')

    stagingArea2.removeChangedFile(file1)
    const file5 = stagingArea2.addChangedFile({status: 'added', newName: 'file-5'})

    assert.equal(component.element.querySelector('.git-ChangedFile.modified').textContent, 'file-2')
    assert.equal(component.element.querySelector('.git-ChangedFile.removed').textContent, 'file-3')
    assert.equal(component.element.querySelector('.git-ChangedFile.renamed').textContent, 'file-4 -> file-4-renamed')
    assert.equal(component.element.querySelector('.git-ChangedFile.added').textContent, 'file-5')
  })
})
