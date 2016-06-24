/** @babel */

import etch from 'etch'

import FileDiff from '../lib/file-diff'
import Hunk from '../lib/hunk'
import HunkLine from '../lib/hunk-line'
import FileDiffComponent from '../lib/file-diff-component'

describe('FileDiffComponent', () => {
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
    const fileDiff = new FileDiff('a.txt', 'a.txt', 1234, 1234, 'modified', [hunk1, hunk2])
    const component = new FileDiffComponent({fileDiff, registerHunkComponent: (hunk, component) => hunkComponentsByHunk.set(hunk, component)})
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
})
