import FilePatchSelection from '../../lib/models/file-patch-selection';
import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';
import {assertEqualSets} from '../helpers';

describe('FilePatchSelection', function() {
  describe('line selection', function() {
    it('starts a new line selection with selectLine and updates an existing selection when preserveTail is true', function() {
      const hunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks);

      const selection1 = selection0.selectLine(hunks[0].lines[1]);
      assertEqualSets(selection1.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));

      const selection2 = selection1.selectLine(hunks[1].lines[2], true);
      assertEqualSets(selection2.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[2],
      ]));

      const selection3 = selection2.selectLine(hunks[1].lines[1], true);
      assertEqualSets(selection3.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[1].lines[1],
      ]));

      const selection4 = selection3.selectLine(hunks[0].lines[0], true);
      assertEqualSets(selection4.getSelectedLines(), new Set([
        hunks[0].lines[0],
        hunks[0].lines[1],
      ]));

      const selection5 = selection4.selectLine(hunks[1].lines[2]);
      assertEqualSets(selection5.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));
    });

    it('adds a new line selection when calling addOrSubtractLineSelection with an unselected line and always updates the head of the most recent line selection', function() {
      const hunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks)
        .selectLine(hunks[0].lines[1])
        .selectLine(hunks[1].lines[1], true)
        .addOrSubtractLineSelection(hunks[1].lines[3])
        .selectLine(hunks[1].lines[4], true);

      assertEqualSets(selection0.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[3],
        hunks[1].lines[4],
      ]));

      const selection1 = selection0.selectLine(hunks[0].lines[0], true);
      assertEqualSets(selection1.getSelectedLines(), new Set([
        hunks[0].lines[0],
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[2],
        hunks[1].lines[3],
      ]));
    });

    it('subtracts from existing selections when calling addOrSubtractLineSelection with a selected line', function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 1, 4, '', [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'added', -1, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'added', -1, 10),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks)
        .selectLine(hunks[0].lines[2])
        .selectLine(hunks[1].lines[2], true);

      assertEqualSets(selection0.getSelectedLines(), new Set([
        hunks[0].lines[2],
        hunks[1].lines[1],
        hunks[1].lines[2],
      ]));

      const selection1 = selection0.addOrSubtractLineSelection(hunks[1].lines[1]);
      assertEqualSets(selection1.getSelectedLines(), new Set([
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));

      const selection2 = selection1.selectLine(hunks[1].lines[3], true);
      assertEqualSets(selection2.getSelectedLines(), new Set([
        hunks[0].lines[2],
      ]));

      const selection3 = selection2.selectLine(hunks[0].lines[1], true);
      assertEqualSets(selection3.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));
    });

    it('allows the next or previous line to be selected', function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, '', [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks)
        .selectLine(hunks[0].lines[1])
        .selectNextLine();
      assertEqualSets(selection0.getSelectedLines(), new Set([
        hunks[0].lines[2],
      ]));

      const selection1 = selection0.selectNextLine();
      assertEqualSets(selection1.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));

      const selection2 = selection1.selectNextLine();
      assertEqualSets(selection2.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));

      const selection3 = selection2.selectPreviousLine();
      assertEqualSets(selection3.getSelectedLines(), new Set([
        hunks[0].lines[2],
      ]));

      const selection4 = selection3.selectPreviousLine();
      assertEqualSets(selection4.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));

      const selection5 = selection4.selectPreviousLine();
      assertEqualSets(selection5.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));

      const selection6 = selection5.selectNextLine(true);
      assertEqualSets(selection6.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
      ]));

      const selection7 = selection6.selectNextLine().selectPreviousLine(true);
      assertEqualSets(selection7.getSelectedLines(), new Set([
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));
    });

    it('allows the first/last changed line to be selected', function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, '', [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];

      const selection0 = new FilePatchSelection(hunks).selectLastLine();
      assertEqualSets(selection0.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));

      const selection1 = selection0.selectFirstLine();
      assertEqualSets(selection1.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));

      const selection2 = selection1.selectLastLine(true);
      assertEqualSets(selection2.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));

      const selection3 = selection2.selectLastLine();
      assertEqualSets(selection3.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));

      const selection4 = selection3.selectFirstLine(true);
      assertEqualSets(selection4.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));

      const selection5 = selection4.selectFirstLine();
      assertEqualSets(selection5.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));
    });

    it('allows all lines to be selected', function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, '', [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];

      const selection0 = new FilePatchSelection(hunks).selectAllLines();
      assertEqualSets(selection0.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));
    });

    it('defaults to the first/last changed line when selecting next / previous with no current selection', function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
      ];

      const selection0 = new FilePatchSelection(hunks)
        .selectLine(hunks[0].lines[1])
        .addOrSubtractLineSelection(hunks[0].lines[1])
        .coalesce();
      assertEqualSets(selection0.getSelectedLines(), new Set());

      const selection1 = selection0.selectNextLine();
      assertEqualSets(selection1.getSelectedLines(), new Set([hunks[0].lines[1]]));

      const selection2 = selection1.addOrSubtractLineSelection(hunks[0].lines[1]).coalesce();
      assertEqualSets(selection2.getSelectedLines(), new Set());

      const selection3 = selection2.selectPreviousLine();
      assertEqualSets(selection3.getSelectedLines(), new Set([hunks[0].lines[2]]));
    });

    it('collapses multiple selections down to one line when selecting next or previous', function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, '', [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];

      const selection0 = new FilePatchSelection(hunks)
        .selectLine(hunks[0].lines[1])
        .addOrSubtractLineSelection(hunks[0].lines[2])
        .selectNextLine(true);
      assertEqualSets(selection0.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));

      const selection1 = selection0.selectNextLine();
      assertEqualSets(selection1.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));

      const selection2 = selection1.selectLine(hunks[0].lines[1])
          .addOrSubtractLineSelection(hunks[0].lines[2])
          .selectPreviousLine(true);
      assertEqualSets(selection2.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
      ]));

      const selection3 = selection2.selectPreviousLine();
      assertEqualSets(selection3.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));
    });

    describe('coalescing', function() {
      it('merges overlapping selections', function() {
        const hunks = [
          new Hunk(1, 1, 0, 4, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
          ]),
          new Hunk(5, 7, 0, 4, '', [
            new HunkLine('line-5', 'added', -1, 7),
            new HunkLine('line-6', 'added', -1, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];

        const selection0 = new FilePatchSelection(hunks)
          .selectLine(hunks[0].lines[2])
          .selectLine(hunks[1].lines[1], true)
          .addOrSubtractLineSelection(hunks[0].lines[0])
          .selectLine(hunks[1].lines[0], true)
          .coalesce()
          .selectPreviousLine(true);
        assertEqualSets(selection0.getSelectedLines(), new Set([
          hunks[0].lines[0],
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
        ]));

        const selection1 = selection0.addOrSubtractLineSelection(hunks[1].lines[3])
          .selectLine(hunks[0].lines[3], true)
          .coalesce()
          .selectNextLine(true);
        assertEqualSets(selection1.getSelectedLines(), new Set([
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
          hunks[1].lines[1],
          hunks[1].lines[2],
          hunks[1].lines[3],
        ]));
      });

      it('merges adjacent selections', function() {
        const hunks = [
          new Hunk(1, 1, 0, 4, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
          ]),
          new Hunk(5, 7, 0, 4, '', [
            new HunkLine('line-5', 'added', -1, 7),
            new HunkLine('line-6', 'added', -1, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];

        const selection0 = new FilePatchSelection(hunks)
          .selectLine(hunks[0].lines[3])
          .selectLine(hunks[1].lines[1], true)
          .addOrSubtractLineSelection(hunks[0].lines[1])
          .selectLine(hunks[0].lines[2], true)
          .coalesce()
          .selectPreviousLine(true);
        assertEqualSets(selection0.getSelectedLines(), new Set([
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
        ]));

        const selection1 = selection0.addOrSubtractLineSelection(hunks[1].lines[2])
          .selectLine(hunks[1].lines[1], true)
          .coalesce()
          .selectNextLine(true);
        assertEqualSets(selection1.getSelectedLines(), new Set([
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
          hunks[1].lines[1],
          hunks[1].lines[2],
        ]));
      });

      it('expands selections to contain all adjacent context lines', function() {
        const hunks = [
          new Hunk(1, 1, 2, 4, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'unchanged', 1, 3),
            new HunkLine('line-4', 'unchanged', 2, 4),
          ]),
          new Hunk(5, 7, 2, 4, '', [
            new HunkLine('line-5', 'unchanged', 5, 7),
            new HunkLine('line-6', 'unchanged', 6, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];

        const selection0 = new FilePatchSelection(hunks)
          .selectLine(hunks[1].lines[3])
          .selectLine(hunks[1].lines[2], true)
          .addOrSubtractLineSelection(hunks[0].lines[1])
          .selectLine(hunks[0].lines[0], true)
          .coalesce()
          .selectNext(true);
        assertEqualSets(selection0.getSelectedLines(), new Set([
          hunks[0].lines[1],
          hunks[1].lines[2],
          hunks[1].lines[3],
        ]));
      });

      it('truncates or splits selections where they overlap a negative selection', function() {
        const hunks = [
          new Hunk(1, 1, 0, 4, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
          ]),
          new Hunk(5, 7, 0, 4, '', [
            new HunkLine('line-5', 'added', -1, 7),
            new HunkLine('line-6', 'added', -1, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];

        const selection0 = new FilePatchSelection(hunks)
          .selectLine(hunks[0].lines[0])
          .selectLine(hunks[1].lines[3], true)
          .addOrSubtractLineSelection(hunks[0].lines[3])
          .selectLine(hunks[1].lines[0], true)
          .coalesce()
          .selectPrevious(true);
        assertEqualSets(selection0.getSelectedLines(), new Set([
          hunks[0].lines[0],
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[1].lines[1],
          hunks[1].lines[2],
        ]));
      });

      it('does not blow up when coalescing with no selections', function() {
        const hunks = [
          new Hunk(1, 1, 0, 1, '', [
            new HunkLine('line-1', 'added', -1, 1),
          ]),
        ];
        const selection0 = new FilePatchSelection(hunks)
          .selectLine(hunks[0].lines[0])
          .addOrSubtractLineSelection(hunks[0].lines[0]);
        assertEqualSets(selection0.getSelectedLines(), new Set());

        selection0.coalesce();
      });
    });
  });

  describe('hunk selection', function() {
    it('selects the first hunk by default', function() {
      const hunks = [
        new Hunk(1, 1, 0, 1, '', [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, '', [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks);
      assertEqualSets(selection0.getSelectedHunks(), new Set([hunks[0]]));
    });

    it('starts a new hunk selection with selectHunk and updates an existing selection when preserveTail is true', function() {
      const hunks = [
        new Hunk(1, 1, 0, 1, '', [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, '', [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
        new Hunk(10, 12, 0, 1, '', [
          new HunkLine('line-3', 'added', -1, 12),
        ]),
        new Hunk(15, 18, 0, 1, '', [
          new HunkLine('line-4', 'added', -1, 18),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks)
        .selectHunk(hunks[1]);
      assertEqualSets(selection0.getSelectedHunks(), new Set([hunks[1]]));

      const selection1 = selection0.selectHunk(hunks[3], true);
      assertEqualSets(selection1.getSelectedHunks(), new Set([hunks[1], hunks[2], hunks[3]]));

      const selection2 = selection1.selectHunk(hunks[0], true);
      assertEqualSets(selection2.getSelectedHunks(), new Set([hunks[0], hunks[1]]));
    });

    it('adds a new hunk selection with addOrSubtractHunkSelection and always updates the head of the most recent hunk selection', function() {
      const hunks = [
        new Hunk(1, 1, 0, 1, '', [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, '', [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
        new Hunk(10, 12, 0, 1, '', [
          new HunkLine('line-3', 'added', -1, 12),
        ]),
        new Hunk(15, 18, 0, 1, '', [
          new HunkLine('line-4', 'added', -1, 18),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks)
        .addOrSubtractHunkSelection(hunks[2]);
      assertEqualSets(selection0.getSelectedHunks(), new Set([hunks[0], hunks[2]]));

      const selection1 = selection0.selectHunk(hunks[3], true);
      assertEqualSets(selection1.getSelectedHunks(), new Set([hunks[0], hunks[2], hunks[3]]));

      const selection2 = selection1.selectHunk(hunks[1], true);
      assertEqualSets(selection2.getSelectedHunks(), new Set([hunks[0], hunks[1], hunks[2]]));
    });

    it('allows the next or previous hunk to be selected', function() {
      const hunks = [
        new Hunk(1, 1, 0, 1, '', [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, '', [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
        new Hunk(10, 12, 0, 1, '', [
          new HunkLine('line-3', 'added', -1, 12),
        ]),
        new Hunk(15, 18, 0, 1, '', [
          new HunkLine('line-4', 'added', -1, 18),
        ]),
      ];

      const selection0 = new FilePatchSelection(hunks)
        .selectNextHunk();
      assertEqualSets(selection0.getSelectedHunks(), new Set([hunks[1]]));

      const selection1 = selection0.selectNextHunk();
      assertEqualSets(selection1.getSelectedHunks(), new Set([hunks[2]]));

      const selection2 = selection1.selectNextHunk()
        .selectNextHunk();
      assertEqualSets(selection2.getSelectedHunks(), new Set([hunks[3]]));

      const selection3 = selection2.selectPreviousHunk();
      assertEqualSets(selection3.getSelectedHunks(), new Set([hunks[2]]));

      const selection4 = selection3.selectPreviousHunk();
      assertEqualSets(selection4.getSelectedHunks(), new Set([hunks[1]]));

      const selection5 = selection4.selectPreviousHunk()
        .selectPreviousHunk();
      assertEqualSets(selection5.getSelectedHunks(), new Set([hunks[0]]));

      const selection6 = selection5.selectNextHunk()
        .selectNextHunk(true);
      assertEqualSets(selection6.getSelectedHunks(), new Set([hunks[1], hunks[2]]));

      const selection7 = selection6.selectPreviousHunk(true);
      assertEqualSets(selection7.getSelectedHunks(), new Set([hunks[1]]));

      const selection8 = selection7.selectPreviousHunk(true);
      assertEqualSets(selection8.getSelectedHunks(), new Set([hunks[0], hunks[1]]));
    });

    it('allows all hunks to be selected', function() {
      const hunks = [
        new Hunk(1, 1, 0, 1, '', [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, '', [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
        new Hunk(10, 12, 0, 1, '', [
          new HunkLine('line-3', 'added', -1, 12),
        ]),
        new Hunk(15, 18, 0, 1, '', [
          new HunkLine('line-4', 'added', -1, 18),
        ]),
      ];

      const selection0 = new FilePatchSelection(hunks)
        .selectAllHunks();
      assertEqualSets(selection0.getSelectedHunks(), new Set([hunks[0], hunks[1], hunks[2], hunks[3]]));
    });
  });

  describe('selection modes', function() {
    it('allows the selection mode to be toggled between hunks and lines', function() {
      const hunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks);

      assert.equal(selection0.getMode(), 'hunk');
      assertEqualSets(selection0.getSelectedHunks(), new Set([hunks[0]]));
      assertEqualSets(selection0.getSelectedLines(), getChangedLines(hunks[0]));

      const selection1 = selection0.selectNext();
      assert.equal(selection1.getMode(), 'hunk');
      assertEqualSets(selection1.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection1.getSelectedLines(), getChangedLines(hunks[1]));

      const selection2 = selection1.toggleMode();
      assert.equal(selection2.getMode(), 'line');
      assertEqualSets(selection2.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection2.getSelectedLines(), new Set([hunks[1].lines[1]]));

      const selection3 = selection2.selectNext();
      assertEqualSets(selection3.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection3.getSelectedLines(), new Set([hunks[1].lines[2]]));

      const selection4 = selection3.toggleMode();
      assert.equal(selection4.getMode(), 'hunk');
      assertEqualSets(selection4.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection4.getSelectedLines(), getChangedLines(hunks[1]));

      const selection5 = selection4.selectLine(hunks[0].lines[1]);
      assert.equal(selection5.getMode(), 'line');
      assertEqualSets(selection5.getSelectedHunks(), new Set([hunks[0]]));
      assertEqualSets(selection5.getSelectedLines(), new Set([hunks[0].lines[1]]));

      const selection6 = selection5.selectHunk(hunks[1]);
      assert.equal(selection6.getMode(), 'hunk');
      assertEqualSets(selection6.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection6.getSelectedLines(), getChangedLines(hunks[1]));
    });
  });

  describe('updateHunks(hunks)', function() {
    it('collapses the line selection to a single line following the previous selected range with the highest start index', function() {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1),
        ]),
      ];
      const selection0 = new FilePatchSelection(oldHunks)
        .selectLine(oldHunks[1].lines[2])
        .selectLine(oldHunks[1].lines[4], true);

      const newHunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 3, 2, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'unchanged', 7, 8),
        ]),
        new Hunk(9, 10, 3, 2, '', [
          new HunkLine('line-8', 'unchanged', 9, 10),
          new HunkLine('line-9', 'added', -1, 11),
          new HunkLine('line-10', 'deleted', 10, -1),
          new HunkLine('line-11', 'deleted', 11, -1),
        ]),
      ];
      const selection1 = selection0.updateHunks(newHunks);

      assertEqualSets(selection1.getSelectedLines(), new Set([
        newHunks[2].lines[1],
      ]));
    });

    it('collapses the line selection to the line preceding the previous selected line if it was the *last* line', function() {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
      ];

      const selection0 = new FilePatchSelection(oldHunks);
      selection0.selectLine(oldHunks[0].lines[1]);

      const newHunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'unchanged', 1, 2),
          new HunkLine('line-3', 'unchanged', 2, 3),
        ]),
      ];
      const selection1 = selection0.updateHunks(newHunks);

      assertEqualSets(selection1.getSelectedLines(), new Set([
        newHunks[0].lines[0],
      ]));
    });

    it('updates the hunk selection if it exceeds the new length of the hunks list', function() {
      const oldHunks = [
        new Hunk(1, 1, 0, 1, '', [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, '', [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
      ];
      const selection0 = new FilePatchSelection(oldHunks)
        .selectHunk(oldHunks[1]);

      const newHunks = [
        new Hunk(1, 1, 0, 1, '', [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
      ];
      const selection1 = selection0.updateHunks(newHunks);

      assertEqualSets(selection1.getSelectedHunks(), new Set([newHunks[0]]));
    });

    it('deselects if updating with an empty hunk array', function() {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
        ]),
      ];

      const selection0 = new FilePatchSelection(oldHunks)
        .selectLine(oldHunks[0], oldHunks[0].lines[1])
        .updateHunks([]);
      assertEqualSets(selection0.getSelectedLines(), new Set());
    });

    it('resolves the getNextUpdatePromise the next time hunks are changed', async function() {
      const hunk0 = new Hunk(1, 1, 1, 3, '', [
        new HunkLine('line-1', 'added', -1, 1),
        new HunkLine('line-2', 'added', -1, 2),
      ]);
      const hunk1 = new Hunk(4, 4, 1, 3, '', [
        new HunkLine('line-4', 'added', -1, 1),
        new HunkLine('line-7', 'added', -1, 2),
      ]);

      const existingHunks = [hunk0, hunk1];
      const selection0 = new FilePatchSelection(existingHunks);

      let wasResolved = false;
      selection0.getNextUpdatePromise().then(() => { wasResolved = true; });

      const unchangedHunks = [hunk0, hunk1];
      const selection1 = selection0.updateHunks(unchangedHunks);

      assert.isFalse(wasResolved);

      const hunk2 = new Hunk(6, 4, 1, 3, '', [
        new HunkLine('line-12', 'added', -1, 1),
        new HunkLine('line-77', 'added', -1, 2),
      ]);
      const changedHunks = [hunk0, hunk2];
      selection1.updateHunks(changedHunks);

      await assert.async.isTrue(wasResolved);
    });
  });

  describe('jumpToNextHunk() and jumpToPreviousHunk()', function() {
    it('selects the next/previous hunk', function() {
      const hunks = [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 3, 2, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'unchanged', 7, 8),
        ]),
        new Hunk(9, 10, 3, 2, '', [
          new HunkLine('line-8', 'unchanged', 9, 10),
          new HunkLine('line-9', 'added', -1, 11),
          new HunkLine('line-10', 'deleted', 10, -1),
          new HunkLine('line-11', 'deleted', 11, -1),
        ]),
      ];
      const selection0 = new FilePatchSelection(hunks);

      // in hunk mode, selects the entire next/previous hunk
      assert.equal(selection0.getMode(), 'hunk');
      assertEqualSets(selection0.getSelectedHunks(), new Set([hunks[0]]));

      const selection1 = selection0.jumpToNextHunk();
      assertEqualSets(selection1.getSelectedHunks(), new Set([hunks[1]]));

      const selection2 = selection1.jumpToNextHunk();
      assertEqualSets(selection2.getSelectedHunks(), new Set([hunks[2]]));

      const selection3 = selection2.jumpToNextHunk();
      assertEqualSets(selection3.getSelectedHunks(), new Set([hunks[2]]));

      const selection4 = selection3.jumpToPreviousHunk();
      assertEqualSets(selection4.getSelectedHunks(), new Set([hunks[1]]));

      const selection5 = selection4.jumpToPreviousHunk();
      assertEqualSets(selection5.getSelectedHunks(), new Set([hunks[0]]));

      const selection6 = selection5.jumpToPreviousHunk();
      assertEqualSets(selection6.getSelectedHunks(), new Set([hunks[0]]));

      // in line selection mode, the first changed line of the next/previous hunk is selected
      const selection7 = selection6.toggleMode();
      assert.equal(selection7.getMode(), 'line');
      assertEqualSets(selection7.getSelectedLines(), new Set([getFirstChangedLine(hunks[0])]));

      const selection8 = selection7.jumpToNextHunk();
      assertEqualSets(selection8.getSelectedLines(), new Set([getFirstChangedLine(hunks[1])]));

      const selection9 = selection8.jumpToNextHunk();
      assertEqualSets(selection9.getSelectedLines(), new Set([getFirstChangedLine(hunks[2])]));

      const selection10 = selection9.jumpToNextHunk();
      assertEqualSets(selection10.getSelectedLines(), new Set([getFirstChangedLine(hunks[2])]));

      const selection11 = selection10.jumpToPreviousHunk();
      assertEqualSets(selection11.getSelectedLines(), new Set([getFirstChangedLine(hunks[1])]));

      const selection12 = selection11.jumpToPreviousHunk();
      assertEqualSets(selection12.getSelectedLines(), new Set([getFirstChangedLine(hunks[0])]));

      const selection13 = selection12.jumpToPreviousHunk();
      assertEqualSets(selection13.getSelectedLines(), new Set([getFirstChangedLine(hunks[0])]));
    });
  });

  describe('goToDiffLine(lineNumber)', function() {
    it('selects the closest selectable hunk line', function() {
      const hunks = [
        new Hunk(1, 1, 2, 4, '', [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, '', [
          new HunkLine('line-7', 'unchanged', 5, 7),
          new HunkLine('line-8', 'unchanged', 6, 8),
          new HunkLine('line-9', 'added', -1, 9),
          new HunkLine('line-10', 'unchanged', 7, 10),
        ]),
      ];

      const selection0 = new FilePatchSelection(hunks);
      const selection1 = selection0.goToDiffLine(2);
      assert.equal(Array.from(selection1.getSelectedLines())[0].getText(), 'line-2');
      assertEqualSets(selection1.getSelectedLines(), new Set([hunks[0].lines[1]]));

      const selection2 = selection1.goToDiffLine(9);
      assert.equal(Array.from(selection2.getSelectedLines())[0].getText(), 'line-9');
      assertEqualSets(selection2.getSelectedLines(), new Set([hunks[1].lines[2]]));

      // selects closest added hunk line
      const selection3 = selection2.goToDiffLine(5);
      assert.equal(Array.from(selection3.getSelectedLines())[0].getText(), 'line-3');
      assertEqualSets(selection3.getSelectedLines(), new Set([hunks[0].lines[2]]));

      const selection4 = selection3.goToDiffLine(8);
      assert.equal(Array.from(selection4.getSelectedLines())[0].getText(), 'line-9');
      assertEqualSets(selection4.getSelectedLines(), new Set([hunks[1].lines[2]]));

      const selection5 = selection4.goToDiffLine(11);
      assert.equal(Array.from(selection5.getSelectedLines())[0].getText(), 'line-9');
      assertEqualSets(selection5.getSelectedLines(), new Set([hunks[1].lines[2]]));
    });
  });
});

function getChangedLines(hunk) {
  return new Set(hunk.getLines().filter(l => l.isChanged()));
}

function getFirstChangedLine(hunk) {
  return hunk.getLines().find(l => l.isChanged());
}
