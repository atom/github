/** @babel */

import FilePatchSelection from '../../lib/views/file-patch-selection'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'

describe.only('FilePatchSelection', () => {
  describe('line selection', () => {
    it('starts a new selection with selectLine and expands an existing selection with selectToLine',  () => {
      const hunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1)
        ])
      ]
      const selection = new FilePatchSelection(hunks)

      selection.selectLine(hunks[0], hunks[0].lines[1])
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1]
      ])

      selection.selectToLine(hunks[1], hunks[1].lines[2])
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[2]
      ])

      selection.selectToLine(hunks[1], hunks[1].lines[1])
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[1].lines[1]
      ])

      selection.selectToLine(hunks[0], hunks[0].lines[0])
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[0],
        hunks[0].lines[1]
      ])

      selection.selectLine(hunks[1], hunks[1].lines[2])
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[1].lines[2]
      ])
    })
  })

  describe('updateHunks(hunks)', function () {
    it('collapses the selection to a single line at the start of the previous selection range', function () {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 5, 4, [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1)
        ])
      ]
      const selection = new FilePatchSelection(oldHunks)

      selection.selectLine(oldHunks[1], oldHunks[1].lines[2])
      selection.selectToLine(oldHunks[1], oldHunks[1].lines[4])

      const newHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3)
        ]),
        new Hunk(5, 7, 3, 2, [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'unchanged', 7, 8),
        ]),
        new Hunk(9, 10, 3, 2, [
          new HunkLine('line-8', 'unchanged', 9, 10),
          new HunkLine('line-9', 'added', -1, 11),
          new HunkLine('line-10', 'deleted', 10, -1),
          new HunkLine('line-11', 'deleted', 11, -1)
        ])
      ]
      selection.updateHunks(newHunks)

      assert.deepEqual(selection.getSelectedLines(), [
        newHunks[2].lines[1]
      ])
    })
  })
})
