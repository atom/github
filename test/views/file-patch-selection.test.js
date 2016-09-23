/** @babel */

import FilePatchSelection from '../../lib/views/file-patch-selection'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'

describe('FilePatchSelection', () => {
  describe('selectLine(hunk, line, expand)', () => {
    it('starts a new line selection if expand is false and otherwise expands the existing selection',  () => {
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
        ]),
        new Hunk(20, 19, 2, 2, [
          new HunkLine('line-12', 'deleted', 20, -1),
          new HunkLine('line-13', 'added', -1, 19),
          new HunkLine('line-14', 'unchanged', 21, 20)
        ])
      ]
      const selection = new FilePatchSelection(hunks)

      selection.selectLine(hunks[0], hunks[0].lines[1], false)
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1]
      ])

      selection.selectLine(hunks[1], hunks[1].lines[2], true)
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[2]
      ])

      selection.selectLine(hunks[1], hunks[1].lines[1], true)
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[1].lines[1]
      ])

      selection.selectLine(hunks[0], hunks[0].lines[0], true)
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[0],
        hunks[0].lines[1]
      ])

      selection.selectLine(hunks[1], hunks[1].lines[2], false)
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[1].lines[2]
      ])
    })
  })
})
