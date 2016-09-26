/** @babel */

import FilePatchSelection from '../../lib/views/file-patch-selection'
import Hunk from '../../lib/models/hunk'
import HunkLine from '../../lib/models/hunk-line'

describe.only('FilePatchSelection', () => {
  describe('line selection', () => {
    it('starts a new line selection with selectLine and expands an existing line selection with selectToLine',  () => {
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

    it('adds a new line selection if the `add` option is specified and always expands the most recent line selection', function () {
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
      selection.selectToLine(hunks[1], hunks[1].lines[1])

      selection.selectLine(hunks[1], hunks[1].lines[3], true)
      selection.selectToLine(hunks[1], hunks[1].lines[4])

      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[3],
        hunks[1].lines[4]
      ])

      selection.selectToLine(hunks[0], hunks[0].lines[0])

      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[0],
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[2],
        hunks[1].lines[3]
      ])
    })

    it('allows the next or previous line to be selected', function () {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4)
        ]),
        new Hunk(5, 7, 3, 4, [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10)
        ])
      ]
      const selection = new FilePatchSelection(hunks)

      selection.selectLine(hunks[0], hunks[0].lines[1])
      selection.selectNextLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[2]
      ])
      selection.selectNextLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[1].lines[2]
      ])
      selection.selectNextLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[1].lines[2]
      ])

      selection.selectPreviousLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[2]
      ])
      selection.selectPreviousLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1]
      ])
      selection.selectPreviousLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1]
      ])

      selection.selectToNextLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[0].lines[2]
      ])

      selection.selectNextLine()
      selection.selectToPreviousLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[2],
        hunks[1].lines[2]
      ])
    })

    it('collapses multiple selections down to one line when selecting next or previous', function () {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4)
        ]),
        new Hunk(5, 7, 3, 4, [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10)
        ])
      ]
      const selection = new FilePatchSelection(hunks)

      selection.selectLine(hunks[0], hunks[0].lines[1])
      selection.selectLine(hunks[0], hunks[0].lines[2], true)
      selection.selectToNextLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2]
      ])

      selection.selectNextLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[1].lines[2]
      ])

      selection.selectLine(hunks[0], hunks[0].lines[1])
      selection.selectLine(hunks[0], hunks[0].lines[2], true)
      selection.selectToPreviousLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1],
        hunks[0].lines[2]
      ])

      selection.selectPreviousLine()
      assert.deepEqual(selection.getSelectedLines(), [
        hunks[0].lines[1]
      ])
    })
  })

  describe('hunk selection', function () {
    it('selects the first hunk by default', function () {
      const hunks = [
        new Hunk(1, 1, 0, 1, [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
      ]
      const selection = new FilePatchSelection(hunks)
      assert.deepEqual(selection.getSelectedHunks(), [hunks[0]])
    })

    it('starts a new hunk selection with selectHunk and expands an existing hunkSelection with selectToHunk', function () {
      const hunks = [
        new Hunk(1, 1, 0, 1, [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
        new Hunk(10, 12, 0, 1, [
          new HunkLine('line-3', 'added', -1, 12),
        ]),
        new Hunk(15, 18, 0, 1, [
          new HunkLine('line-4', 'added', -1, 18),
        ])
      ]
      const selection = new FilePatchSelection(hunks)

      selection.selectHunk(hunks[1])
      assert.deepEqual(selection.getSelectedHunks(), [hunks[1]])

      selection.selectToHunk(hunks[3])
      assert.deepEqual(selection.getSelectedHunks(), [hunks[1], hunks[2], hunks[3]])

      selection.selectToHunk(hunks[0])
      assert.deepEqual(selection.getSelectedHunks(), [hunks[0], hunks[1]])
    })

    it('adds a new hunk selection if the `add` option is specified and always expands the most recent hunk selection', function () {
      const hunks = [
        new Hunk(1, 1, 0, 1, [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
        new Hunk(10, 12, 0, 1, [
          new HunkLine('line-3', 'added', -1, 12),
        ]),
        new Hunk(15, 18, 0, 1, [
          new HunkLine('line-4', 'added', -1, 18),
        ])
      ]
      const selection = new FilePatchSelection(hunks)

      selection.selectHunk(hunks[2], true)
      assert.deepEqual(selection.getSelectedHunks(), [hunks[0], hunks[2]])

      selection.selectToHunk(hunks[3])
      assert.deepEqual(selection.getSelectedHunks(), [hunks[0], hunks[2], hunks[3]])

      selection.selectToHunk(hunks[1])
      assert.deepEqual(selection.getSelectedHunks(), [hunks[0], hunks[1], hunks[2]])
    })

    it('allows the next or previous hunk to be selected', function () {
      const hunks = [
        new Hunk(1, 1, 0, 1, [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
        new Hunk(10, 12, 0, 1, [
          new HunkLine('line-3', 'added', -1, 12),
        ]),
        new Hunk(15, 18, 0, 1, [
          new HunkLine('line-4', 'added', -1, 18),
        ])
      ]
      const selection = new FilePatchSelection(hunks)

      selection.selectNextHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[1]])

      selection.selectNextHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[2]])

      selection.selectNextHunk()
      selection.selectNextHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[3]])

      selection.selectPreviousHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[2]])

      selection.selectPreviousHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[1]])

      selection.selectPreviousHunk()
      selection.selectPreviousHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[0]])

      selection.selectNextHunk()
      selection.selectToNextHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[1], hunks[2]])

      selection.selectToPreviousHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[1]])

      selection.selectToPreviousHunk()
      assert.deepEqual(selection.getSelectedHunks(), [hunks[0], hunks[1]])
    })
  })

  describe('updateHunks(hunks)', function () {
    it('collapses the selection to a single line following the previous selected range with the highest start index', function () {
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

    it('collapses the selection to the line preceding the previous selected line if it was the *last* line', function () {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ])
      ]

      const selection = new FilePatchSelection(oldHunks)
      selection.selectLine(oldHunks[0], oldHunks[0].lines[1])

      const newHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'unchanged', 1, 2),
          new HunkLine('line-3', 'unchanged', 2, 3),
        ])
      ]
      selection.updateHunks(newHunks)

      assert.deepEqual(selection.getSelectedLines(), [
        newHunks[0].lines[0]
      ])
    })

    it('deselects if updating with an empty hunk array', function () {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
        ])
      ]

      const selection = new FilePatchSelection(oldHunks)
      selection.selectLine(oldHunks[0], oldHunks[0].lines[1])

      selection.updateHunks([])
      assert.deepEqual(selection.getSelectedLines(), [])
    })
  })
})
