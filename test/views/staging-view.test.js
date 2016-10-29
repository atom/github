/** @babel */

import {cloneRepository, buildRepository} from '../helpers'
import path from 'path'
import fs from 'fs'
import sinon from 'sinon'

import StagingView from '../../lib/views/staging-view'

describe('StagingView', () => {
  describe('staging and unstaging files', () => {
    it('renders staged and unstaged files', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
      fs.unlinkSync(path.join(workdirPath, 'b.txt'))
      const filePatches = await repository.getUnstagedChanges()
      const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches})
      const {refs} = view
      function textContentOfChildren (element) {
        return Array.from(element.children).map(child => child.textContent)
      }

      assert.deepEqual(textContentOfChildren(refs.unstagedChanges), ['a.txt', 'b.txt'])
      assert.deepEqual(textContentOfChildren(refs.stagedChanges), [])

      await view.update({repository, stagedChanges: [filePatches[1]], unstagedChanges: [filePatches[0]]})
      assert.deepEqual(textContentOfChildren(refs.unstagedChanges), ['a.txt'])
      assert.deepEqual(textContentOfChildren(refs.stagedChanges), ['b.txt'])
    })

    describe('confirmSelectedItems()', () => {
      it('calls stageFilePatch or unstageFilePatch depending on the current staging state of the toggled file patch', async () => {
        const workdirPath = await cloneRepository('three-files')
        const repository = await buildRepository(workdirPath)
        fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n')
        fs.unlinkSync(path.join(workdirPath, 'b.txt'))
        const filePatches = await repository.getUnstagedChanges()
        const stageFiles = sinon.spy()
        const unstageFiles = sinon.spy()
        const view = new StagingView({repository, stagedChanges: [], unstagedChanges: filePatches, stageFiles, unstageFiles})

        view.mousedownOnItem({detail: 1}, filePatches[1])
        view.confirmSelectedItems()
        assert.isTrue(stageFiles.calledWith(['b.txt']))

        await view.update({repository, stagedChanges: [filePatches[1]], unstagedChanges: [filePatches[0]], stageFiles, unstageFiles})
        view.mousedownOnItem({detail: 1}, filePatches[1])
        view.confirmSelectedItems()
        assert.isTrue(unstageFiles.calledWith(['b.txt']))
      })
    })
  })

  describe('merge conflicts list', () => {
    it('is visible only when conflicted paths are passed', async () => {
      const workdirPath = await cloneRepository('three-files')
      const repository = await buildRepository(workdirPath)
      const view = new StagingView({repository, stagedChanges: [], unstagedChanges: []})

      assert.isUndefined(view.refs.mergeConflicts)

      const mergeConflict = {
        getPath: () => 'conflicted-path',
        getFileStatus: () => 'modified',
        getOursStatus: () => 'deleted',
        getTheirsStatus: () => 'modified'
      }
      await view.update({repository, mergeConflicts: [mergeConflict], stagedChanges: [], unstagedChanges: []})
      assert.isDefined(view.refs.mergeConflicts)
    })
  })
})
