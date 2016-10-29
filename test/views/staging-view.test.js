/** @babel */

import sinon from 'sinon'
import StagingView from '../../lib/views/staging-view'
import FilePatch from '../../lib/models/file-patch'

describe('StagingView', () => {
  describe('staging and unstaging files', () => {
    it('renders staged and unstaged files', async () => {
      const filePatches = [
        new FilePatch('a.txt', 'a.txt', 'modified', []),
        new FilePatch('b.txt', null, 'deleted', [])
      ]
      const view = new StagingView({unstagedChanges: filePatches, stagedChanges: []})
      const {refs} = view
      function textContentOfChildren (element) {
        return Array.from(element.children).map(child => child.textContent)
      }

      assert.deepEqual(textContentOfChildren(refs.unstagedChanges), ['a.txt', 'b.txt'])
      assert.deepEqual(textContentOfChildren(refs.stagedChanges), [])

      await view.update({unstagedChanges: [filePatches[0]], stagedChanges: [filePatches[1]]})
      assert.deepEqual(textContentOfChildren(refs.unstagedChanges), ['a.txt'])
      assert.deepEqual(textContentOfChildren(refs.stagedChanges), ['b.txt'])
    })

    describe('confirmSelectedItems()', () => {
      it('calls stageFilePatch or unstageFilePatch depending on the current staging state of the toggled file patch', async () => {
        const filePatches = [
          new FilePatch('a.txt', 'a.txt', 'modified', []),
          new FilePatch('b.txt', null, 'deleted', [])
        ]
        const stageFiles = sinon.spy()
        const unstageFiles = sinon.spy()
        const view = new StagingView({unstagedChanges: filePatches, stagedChanges: [], stageFiles, unstageFiles})

        view.mousedownOnItem({detail: 1}, filePatches[1])
        view.confirmSelectedItems()
        assert.isTrue(stageFiles.calledWith(['b.txt']))

        await view.update({unstagedChanges: [filePatches[0]], stagedChanges: [filePatches[1]], stageFiles, unstageFiles})
        view.mousedownOnItem({detail: 1}, filePatches[1])
        view.confirmSelectedItems()
        assert.isTrue(unstageFiles.calledWith(['b.txt']))
      })
    })
  })

  describe('merge conflicts list', () => {
    it('is visible only when conflicted paths are passed', async () => {
      const view = new StagingView({unstagedChanges: [], stagedChanges: []})

      assert.isUndefined(view.refs.mergeConflicts)

      const mergeConflicts = [{
        getPath: () => 'conflicted-path',
        getFileStatus: () => 'modified',
        getOursStatus: () => 'deleted',
        getTheirsStatus: () => 'modified'
      }]
      await view.update({unstagedChanges: [], mergeConflicts, stagedChanges: []})
      assert.isDefined(view.refs.mergeConflicts)
    })
  })
})
