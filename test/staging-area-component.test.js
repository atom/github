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

  describe('when the staging area is empty', () => {
    it('renders a message telling that no files have been changed', () => {
      const component = new StagingAreaComponent({stagingArea: new FakeStagingArea()})
      assert.equal(component.element.textContent, 'No files were changed.')
    })
  })

  describe('when the staging area is not empty', () => {
    it('renders the changed file names along with their status', () => {
      const stagingArea = new FakeStagingArea()
      const component = new StagingAreaComponent({stagingArea})

      stagingArea.addChangedFile({status: 'created', newName: 'file-1'})
      stagingArea.addChangedFile({status: 'modified', newName: 'file-2'})
      stagingArea.addChangedFile({status: 'deleted', newName: 'file-3'})
      stagingArea.addChangedFile({status: 'renamed', oldName: 'file-4', newName: 'file-5'})

      assert.equal(component.element.querySelector('.changed-file.created').textContent, 'file-1')
      assert.equal(component.element.querySelector('.changed-file.modified').textContent, 'file-2')
      assert.equal(component.element.querySelector('.changed-file.deleted').textContent, 'file-3')
      assert.equal(component.element.querySelector('.changed-file.renamed').textContent, 'file-4 -> file-5')
    })
  })
})
