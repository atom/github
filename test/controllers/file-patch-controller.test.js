/** @babel */

import etch from 'etch'
import fs from 'fs'
import path from 'path'
import sinon from 'sinon'

import {cloneRepository, buildRepository} from '../helpers'
import FilePatch from '../../lib/models/file-patch'
import FilePatchController from '../../lib/controllers/file-patch-controller'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'

describe('FilePatchController', () => {
  it('bases its tab title on the staging status', () => {
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 'modified', [new Hunk(1, 1, 1, 3, [])])
    const controller = new FilePatchController({filePatch: filePatch1, stagingStatus: 'unstaged'})
    assert.equal(controller.getTitle(), 'Unstaged Changes: a.txt')

    const changeHandler = sinon.spy()
    controller.onDidChangeTitle(changeHandler)

    controller.update({filePatch: filePatch1, stagingStatus: 'staged'})
    assert.equal(controller.getTitle(), 'Staged Changes: a.txt')
    assert.deepEqual(changeHandler.args, [[controller.getTitle()]])
  })

  it('updates when the associated FilePatch updates', async () => {
    const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
    const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'deleted', 8, -1)])
    const hunkViewsByHunk = new Map()
    const filePatch = new FilePatch('a.txt', 'a.txt', 'modified', [hunk1, hunk2])
    new FilePatchController({filePatch, registerHunkView: (hunk, controller) => hunkViewsByHunk.set(hunk, controller)}) // eslint-disable-line no-new

    hunkViewsByHunk.clear()
    const hunk3 = new Hunk(8, 8, 1, 1, [new HunkLine('line-10', 'modified', 10, 10)])
    filePatch.update(new FilePatch('a.txt', 'a.txt', 'modified', [hunk1, hunk3]))
    await etch.getScheduler().getNextUpdatePromise()
    assert(hunkViewsByHunk.get(hunk1) != null)
    assert(hunkViewsByHunk.get(hunk2) == null)
    assert(hunkViewsByHunk.get(hunk3) != null)
  })

  it('gets destroyed if the associated FilePatch is destroyed', () => {
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 'modified', [new Hunk(1, 1, 1, 3, [])])
    const controller = new FilePatchController({filePatch: filePatch1})
    const destroyHandler = sinon.spy()
    controller.onDidDestroy(destroyHandler)
    filePatch1.destroy()
    assert(destroyHandler.called)
  })

  describe('integration tests', () => {
    it('stages and unstages hunks when the stage button is clicked on hunk views with no individual lines selected', async () => {
      const workdirPath = await cloneRepository('multi-line-file')
      const repository = await buildRepository(workdirPath)
      const filePath = path.join(workdirPath, 'sample.js')
      const originalLines = fs.readFileSync(filePath, 'utf8').split('\n')
      const unstagedLines = originalLines.slice()
      unstagedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line'
      )
      unstagedLines.splice(11, 2, 'this is a modified line')
      fs.writeFileSync(filePath, unstagedLines.join('\n'))
      const [unstagedFilePatch] = await repository.getUnstagedChanges()
      const hunkViewsByHunk = new Map()
      function registerHunkView (hunk, view) { hunkViewsByHunk.set(hunk, view) }

      const controller = new FilePatchController({filePatch: unstagedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView})
      const view = controller.refs.filePatchView
      await view.focusNextHunk()
      const hunkToStage = hunkViewsByHunk.get(unstagedFilePatch.getHunks()[0])
      assert.notDeepEqual(view.selectedHunk, unstagedFilePatch.getHunks()[0])
      await hunkToStage.props.didClickStageButton()
      const expectedStagedLines = originalLines.slice()
      expectedStagedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line'
      )
      assert.equal(await repository.readFileFromIndex('sample.js'), expectedStagedLines.join('\n'))

      const [stagedFilePatch] = await repository.getStagedChanges()
      await controller.update({filePatch: stagedFilePatch, repository, stagingStatus: 'staged', registerHunkView})
      await hunkViewsByHunk.get(stagedFilePatch.getHunks()[0]).props.didClickStageButton()
      assert.equal(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'))
    })

    it('stages and unstages individual lines when the stage button is clicked on a hunk with selected lines', async () => {
      const workdirPath = await cloneRepository('multi-line-file')
      const repository = await buildRepository(workdirPath)
      const filePath = path.join(workdirPath, 'sample.js')
      const originalLines = fs.readFileSync(filePath, 'utf8').split('\n')

      // write some unstaged changes
      const unstagedLines = originalLines.slice()
      unstagedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line'
      )
      unstagedLines.splice(11, 2, 'this is a modified line')
      fs.writeFileSync(filePath, unstagedLines.join('\n'))
      const [unstagedFilePatch] = await repository.getUnstagedChanges()
      const hunkViewsByHunk = new Map()
      function registerHunkView (hunk, view) { hunkViewsByHunk.set(hunk, view) }

      // stage a subset of lines from first hunk
      const controller = new FilePatchController({filePatch: unstagedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView})
      const view = controller.refs.filePatchView
      view.togglePatchSelectionMode()
      assert.equal(view.getPatchSelectionMode(), 'hunkLine')
      let hunk = unstagedFilePatch.getHunks()[0]
      let lines = hunk.getLines()
      let hunkView = hunkViewsByHunk.get(hunk)
      hunkView.props.selectLine(lines[1])
      hunkView.props.selectLine(lines[2])
      hunkView.props.selectLine(lines[3])
      await hunkView.props.didClickStageButton()
      let expectedLines = originalLines.slice()
      expectedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line'
      )
      assert.equal(await repository.readFileFromIndex('sample.js'), expectedLines.join('\n'))

      // stage remaining lines in hunk
      await hunkView.props.didClickStageButton()
      expectedLines = originalLines.slice()
      expectedLines.splice(1, 1,
        'this is a modified line',
        'this is a new line',
        'this is another new line'
      )
      assert.equal(await repository.readFileFromIndex('sample.js'), expectedLines.join('\n'))

      // unstage a subset of lines from the first hunk
      const [stagedFilePatch] = await repository.getStagedChanges()
      await controller.update({filePatch: stagedFilePatch, repository, stagingStatus: 'staged', registerHunkView})
      hunk = stagedFilePatch.getHunks()[0]
      lines = hunk.getLines()
      hunkView = hunkViewsByHunk.get(hunk)
      hunkView.props.selectLine(lines[1])
      hunkView.props.selectLine(lines[2])
      await hunkView.props.didClickStageButton()
      expectedLines = originalLines.slice()
      expectedLines.splice(2, 0,
        'this is a new line',
        'this is another new line'
      )
      assert.equal(await repository.readFileFromIndex('sample.js'), expectedLines.join('\n'))

      // unstage the rest of the hunk
      await view.togglePatchSelectionMode()
      await hunkView.props.didClickStageButton()
      assert.equal(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'))
    })
  })
})
