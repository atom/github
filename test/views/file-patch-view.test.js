/** @babel */

import etch from 'etch'
import fs from 'fs'
import path from 'path'
import sinon from 'sinon'

import {copyRepositoryDir, buildRepository} from '../helpers'
import FilePatch from '../../lib/models/file-patch'
import FilePatchView from '../../lib/views/file-patch-view'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'

describe('FilePatchView', () => {
  it('allows lines of a hunk to be selected, clearing the selection on the other hunks', async () => {
    const hunk1 = new Hunk(5, 5, 2, 1, [
      new HunkLine('line-1', 'unchanged', 5, 5),
      new HunkLine('line-2', 'removed', 6, -1),
      new HunkLine('line-3', 'removed', 7, -1),
      new HunkLine('line-4', 'added', -1, 6)
    ])
    const hunk2 = new Hunk(8, 8, 1, 1, [
      new HunkLine('line-5', 'removed', 8, -1),
      new HunkLine('line-6', 'added', -1, 8)
    ])
    const hunkViewsByHunk = new Map()
    const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk2])
    const view = new FilePatchView({filePatch, registerHunkView: (hunk, view) => hunkViewsByHunk.set(hunk, view)})

    let linesToSelect = hunk1.getLines().slice(1, 3)
    hunkViewsByHunk.get(hunk1).props.selectLines(new Set(linesToSelect))
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(Array.from(hunkViewsByHunk.get(hunk1).props.selectedLines), hunk1.getLines().filter(l => l.isChanged()))
    assert.deepEqual(Array.from(hunkViewsByHunk.get(hunk2).props.selectedLines), [])
    assert(hunkViewsByHunk.get(hunk1).props.isSelected)
    assert(!hunkViewsByHunk.get(hunk2).props.isSelected)

    await view.togglePatchSelectionMode()
    linesToSelect = hunk1.getLines().slice(1, 3)
    hunkViewsByHunk.get(hunk1).props.selectLines(new Set(linesToSelect))
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(Array.from(hunkViewsByHunk.get(hunk1).props.selectedLines), linesToSelect)
    assert.deepEqual(Array.from(hunkViewsByHunk.get(hunk2).props.selectedLines), [])
    assert(hunkViewsByHunk.get(hunk1).props.isSelected)
    assert(!hunkViewsByHunk.get(hunk2).props.isSelected)

    linesToSelect = hunk2.getLines().slice(0, 1)
    hunkViewsByHunk.get(hunk2).props.selectLines(new Set(linesToSelect))
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(Array.from(hunkViewsByHunk.get(hunk1).props.selectedLines), [])
    assert.deepEqual(Array.from(hunkViewsByHunk.get(hunk2).props.selectedLines), linesToSelect)
    assert(!hunkViewsByHunk.get(hunk1).props.isSelected)
    assert(hunkViewsByHunk.get(hunk2).props.isSelected)
  })

  it('assigns the appropriate stage button label prefix on hunks based on the stagingStatus', () => {
    let hunkView
    function registerHunkView (hunk, view) { hunkView = view }
    const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [new Hunk(1, 1, 1, 2, [new HunkLine('line-1', 'added', -1, 1)])])
    const view = new FilePatchView({filePatch, stagingStatus: 'unstaged', registerHunkView})
    assert(hunkView.props.stageButtonLabelPrefix, 'Stage')
    view.update({filePatch, stagingStatus: 'staged'})
    assert(hunkView.props.stageButtonLabelPrefix, 'Unstage')
  })

  it('bases its tab title on the staging status', () => {
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [])
    const view = new FilePatchView({filePatch: filePatch1, stagingStatus: 'unstaged'})
    assert.equal(view.getTitle(), 'Unstaged Changes: a.txt')

    const changeHandler = sinon.spy()
    view.onDidChangeTitle(changeHandler)

    view.update({filePatch: filePatch1, stagingStatus: 'staged'})
    assert.equal(view.getTitle(), 'Staged Changes: a.txt')
    assert.deepEqual(changeHandler.args, [[view.getTitle()]])

    changeHandler.reset()
    const filePatch2 = new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed', [])
    view.update({filePatch: filePatch2, stagingStatus: 'staged'})
    assert.equal(view.getTitle(), 'Staged Changes: a.txt → b.txt')
    assert.deepEqual(changeHandler.args, [[view.getTitle()]])
  })

  it('updates when the associated FilePatch updates', async () => {
    const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
    const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])
    const hunkViewsByHunk = new Map()
    const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk2])
    const view = new FilePatchView({filePatch, registerHunkView: (hunk, view) => hunkViewsByHunk.set(hunk, view)})
    const element = view.element

    hunkViewsByHunk.clear()
    const hunk3 = new Hunk(8, 8, 1, 1, [new HunkLine('line-10', 'modified', 10, 10)])
    filePatch.update(new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk3]))
    await etch.getScheduler().getNextUpdatePromise()
    assert(hunkViewsByHunk.get(hunk1) != null)
    assert(hunkViewsByHunk.get(hunk2) == null)
    assert(hunkViewsByHunk.get(hunk3) != null)
  })

  it('gets destroyed if the associated FilePatch is destroyed', () => {
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [])
    const view = new FilePatchView({filePatch: filePatch1})
    const destroyHandler = sinon.spy()
    view.onDidDestroy(destroyHandler)
    filePatch1.destroy()
    assert(destroyHandler.called)
  })

  it('stages and unstages hunks when the stage button is clicked on hunk views with no individual lines selected', async () => {
    const workdirPath = await copyRepositoryDir(2)
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

    const view = new FilePatchView({filePatch: unstagedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView})
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
    await view.update({filePatch: stagedFilePatch, repository, stagingStatus: 'staged', registerHunkView})
    await hunkViewsByHunk.get(stagedFilePatch.getHunks()[0]).props.didClickStageButton()
    assert.equal(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'))
  })

  it('stages and unstages individual lines when the stage button is clicked on a hunk with selected lines', async () => {
    const workdirPath = await copyRepositoryDir(2)
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
    const view = new FilePatchView({filePatch: unstagedFilePatch, repository, stagingStatus: 'unstaged', registerHunkView, selectionMode: 'hunkLine'})
    let hunk = unstagedFilePatch.getHunks()[0]
    hunkViewsByHunk.get(hunk).props.selectLines(new Set(hunk.getLines().slice(1, 4)))
    await hunkViewsByHunk.get(hunk).props.didClickStageButton()
    let expectedLines = originalLines.slice()
    expectedLines.splice(1, 1,
      'this is a modified line',
      'this is a new line'
    )
    assert.equal(await repository.readFileFromIndex('sample.js'), expectedLines.join('\n'))

    // stage remaining lines in hunk
    await hunkViewsByHunk.get(hunk).props.didClickStageButton()
    expectedLines = originalLines.slice()
    expectedLines.splice(1, 1,
      'this is a modified line',
      'this is a new line',
      'this is another new line'
    )
    assert.equal(await repository.readFileFromIndex('sample.js'), expectedLines.join('\n'))

    // unstage a subset of lines from the first hunk
    const [stagedFilePatch] = await repository.getStagedChanges()
    await view.update({filePatch: stagedFilePatch, repository, stagingStatus: 'staged', registerHunkView, selectionMode: 'hunkLine'})
    hunk = stagedFilePatch.getHunks()[0]
    hunkViewsByHunk.get(hunk).props.selectLines(new Set(hunk.getLines().slice(1, 3)))
    await hunkViewsByHunk.get(hunk).props.didClickStageButton()
    expectedLines = originalLines.slice()
    expectedLines.splice(2, 0,
      'this is a new line',
      'this is another new line'
    )
    assert.equal(await repository.readFileFromIndex('sample.js'), expectedLines.join('\n'))

    // unstage the rest of the hunk
    await view.togglePatchSelectionMode()
    await hunkViewsByHunk.get(hunk).props.didClickStageButton()
    assert.equal(await repository.readFileFromIndex('sample.js'), originalLines.join('\n'))
  })

  describe('hunk focus when hunk disappears', () => {
    describe('when there is another hunk at it\'s index', () => {
      it('selects the new hunk in it\'s place', async () => {
        const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
        const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])

        const hunkViewsByHunk = new Map()
        const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk2])
        const view = new FilePatchView({filePatch, registerHunkView: (hunk, view) => hunkViewsByHunk.set(hunk, view)})
        const element = view.element

        assert(hunkViewsByHunk.get(hunk1).props.isSelected)

        hunkViewsByHunk.clear()
        await filePatch.update(new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk2]))
        await etch.getScheduler().getNextUpdatePromise()
        assert(!hunkViewsByHunk.get(hunk1))
        assert(hunkViewsByHunk.get(hunk2).props.isSelected)
      })
    })

    describe('when there is no hunk at it\'s index', () => {
      it('selects the last hunk', async () => {
        const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
        const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])

        const hunkViewsByHunk = new Map()
        const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk2])
        const view = new FilePatchView({filePatch, registerHunkView: (hunk, view) => hunkViewsByHunk.set(hunk, view)})
        const element = view.element

        await view.focusNextHunk()
        assert(hunkViewsByHunk.get(hunk2).props.isSelected)

        hunkViewsByHunk.clear()
        await filePatch.update(new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1]))
        await etch.getScheduler().getNextUpdatePromise()
        assert(!hunkViewsByHunk.get(hunk2))
        assert(hunkViewsByHunk.get(hunk1).props.isSelected)
      })
    })
  })

  describe('togglePatchSelectionMode()', () => {
    it('toggles between hunk and hunk-line selection modes', async () => {
      const hunk = new Hunk(5, 5, 2, 1, [
        new HunkLine('line-1', 'unchanged', 5, 5),
        new HunkLine('line-2', 'removed', 6, -1),
        new HunkLine('line-3', 'removed', 7, -1),
        new HunkLine('line-4', 'added', -1, 6)
      ])
      const hunkViewsByHunk = new Map()
      const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk])
      const view = new FilePatchView({filePatch, registerHunkView: (hunk, view) => hunkViewsByHunk.set(hunk, view)})
      const element = view.element

      assert.equal(view.selectionMode, 'hunk')

      await view.togglePatchSelectionMode()
      assert.equal(view.selectionMode, 'hunkLine')
      assert.equal(element.querySelectorAll('.git-HunkView-line.is-selected').length, 1)

      await view.togglePatchSelectionMode()
      assert.equal(view.selectionMode, 'hunk')
      assert.equal(element.querySelectorAll('.git-HunkView-line.is-selected').length, hunk.getLines().filter(l => l.isChanged()).length)
    })
  })

  describe('focusNextHunk()', () => {
    it('focuses next hunk and wraps at the end', async () => {
      const hunk1 = new Hunk(5, 5, 2, 1, [new HunkLine('line-1', 'added', -1, 5)])
      const hunk2 = new Hunk(8, 8, 1, 1, [new HunkLine('line-5', 'removed', 8, -1)])
      const hunk3 = new Hunk(8, 8, 1, 1, [new HunkLine('line-10', 'added', -1, 10)])
      const hunkViewsByHunk = new Map()
      const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk2, hunk3])
      const view = new FilePatchView({filePatch, registerHunkView: (hunk, view) => hunkViewsByHunk.set(hunk, view)})
      const element = view.element

      assert.deepEqual(view.selectedHunk, hunk1)

      await view.focusNextHunk()
      assert.deepEqual(view.selectedHunk, hunk2)

      await view.focusNextHunk()
      assert.deepEqual(view.selectedHunk, hunk3)

      await view.focusNextHunk()
      assert.deepEqual(view.selectedHunk, hunk1)
    })
  })
})
