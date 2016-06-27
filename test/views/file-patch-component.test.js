/** @babel */

import etch from 'etch'
import sinon from 'sinon'

import FilePatch from '../../lib/models/file-patch'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'
import FilePatchComponent from '../../lib/views/file-patch-component'

describe('FilePatchComponent', () => {
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
    const hunkComponentsByHunk = new Map()
    const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk2])
    const component = new FilePatchComponent({filePatch, registerHunkComponent: (hunk, component) => hunkComponentsByHunk.set(hunk, component)})
    const element = component.element

    var linesToSelect = hunk1.getLines().slice(1, 3)
    hunkComponentsByHunk.get(hunk1).didSelectLines(new Set(linesToSelect))
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(Array.from(hunkComponentsByHunk.get(hunk1).selectedLines), linesToSelect)
    assert.deepEqual(Array.from(hunkComponentsByHunk.get(hunk2).selectedLines), [])
    assert(hunkComponentsByHunk.get(hunk1).isSelected)
    assert(!hunkComponentsByHunk.get(hunk2).isSelected)

    var linesToSelect = hunk2.getLines().slice(0, 1)
    hunkComponentsByHunk.get(hunk2).didSelectLines(new Set(linesToSelect))
    await etch.getScheduler().getNextUpdatePromise()
    assert.deepEqual(Array.from(hunkComponentsByHunk.get(hunk1).selectedLines), [])
    assert.deepEqual(Array.from(hunkComponentsByHunk.get(hunk2).selectedLines), linesToSelect)
    assert(!hunkComponentsByHunk.get(hunk1).isSelected)
    assert(hunkComponentsByHunk.get(hunk2).isSelected)
  })

  it('assigns the appropriate stage button label prefix on hunks based on the stagingStatus', () => {
    let hunkComponent
    function registerHunkComponent (hunk, component) { hunkComponent = component }
    const filePatch = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [new Hunk(5, 5, 2, 1, [])])
    const component = new FilePatchComponent({filePatch, stagingStatus: 'unstaged', registerHunkComponent})
    assert(hunkComponent.stageButtonLabelPrefix, 'Stage')
    component.update({filePatch, stagingStatus: 'staged'})
    assert(hunkComponent.stageButtonLabelPrefix, 'Unstage')
  })

  it('bases its tab title on the staging status', () => {
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [])
    const component = new FilePatchComponent({filePatch: filePatch1, stagingStatus: 'unstaged'})
    assert.equal(component.getTitle(), 'Unstaged Changes: a.txt')

    const changeHandler = sinon.spy()
    component.onDidChangeTitle(changeHandler)

    component.update({filePatch: filePatch1, stagingStatus: 'staged'})
    assert.equal(component.getTitle(), 'Staged Changes: a.txt')
    assert.deepEqual(changeHandler.args, [[component.getTitle()]])

    changeHandler.reset()
    const filePatch2 = new FilePatch('a.txt', 'b.txt', 1234, 1234, 'renamed', [])
    component.update({filePatch: filePatch2, stagingStatus: 'staged'})
    assert.equal(component.getTitle(), 'Staged Changes: a.txt → b.txt')
    assert.deepEqual(changeHandler.args, [[component.getTitle()]])
  })

  it('gets destroyed if the associated FilePatch is destroyed', () => {
    const filePatch1 = new FilePatch('a.txt', 'a.txt', 1234, 1234, 'modified', [])
    const component = new FilePatchComponent({filePatch: filePatch1})
    const destroyHandler = sinon.spy()
    component.onDidDestroy(destroyHandler)
    filePatch1.destroy()
    assert(destroyHandler.called)
  })
})
