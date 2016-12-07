/** @babel */

import FilePatchSelection from '../../lib/views/file-patch-selection';
import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';
import {assertEqualSets} from '../helpers';

describe('FilePatchSelection', () => {
  describe('line selection', () => {
    it('starts a new line selection with selectLine and updates an existing selection when preserveTail is true', () => {
      const hunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, [
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
      const selection = new FilePatchSelection(hunks);

      selection.selectLine(hunks[0].lines[1]);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));

      selection.selectLine(hunks[1].lines[2], true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[2],
      ]));

      selection.selectLine(hunks[1].lines[1], true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[1].lines[1],
      ]));

      selection.selectLine(hunks[0].lines[0], true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[0],
        hunks[0].lines[1],
      ]));

      selection.selectLine(hunks[1].lines[2]);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));
    });

    it('adds a new line selection when calling addOrSubtractLineSelection with an unselected line and always updates the head of the most recent line selection', () => {
      const hunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, [
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
      const selection = new FilePatchSelection(hunks);

      selection.selectLine(hunks[0].lines[1]);
      selection.selectLine(hunks[1].lines[1], true);

      selection.addOrSubtractLineSelection(hunks[1].lines[3]);
      selection.selectLine(hunks[1].lines[4], true);

      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[3],
        hunks[1].lines[4],
      ]));

      selection.selectLine(hunks[0].lines[0], true);

      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[0],
        hunks[0].lines[1],
        hunks[1].lines[1],
        hunks[1].lines[2],
        hunks[1].lines[3],
      ]));
    });

    it('subtracts from existing selections when calling addOrSubtractLineSelection with a selected line', () => {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 1, 4, [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'added', -1, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'added', -1, 10),
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.selectLine(hunks[0].lines[2]);
      selection.selectLine(hunks[1].lines[2], true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[2],
        hunks[1].lines[1],
        hunks[1].lines[2],
      ]));

      selection.addOrSubtractLineSelection(hunks[1].lines[1]);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));

      selection.selectLine(hunks[1].lines[3], true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[2],
      ]));

      selection.selectLine(hunks[0].lines[1], true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));
    });

    it('allows the next or previous line to be selected', () => {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.selectLine(hunks[0].lines[1]);
      selection.selectNextLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[2],
      ]));
      selection.selectNextLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));
      selection.selectNextLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));

      selection.selectPreviousLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[2],
      ]));
      selection.selectPreviousLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));
      selection.selectPreviousLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));

      selection.selectNextLine(true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
      ]));

      selection.selectNextLine();
      selection.selectPreviousLine(true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));
    });

    it('allows the first/last changed line to be selected', () => {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.selectLastLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));
      selection.selectFirstLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));
      selection.selectLastLine(true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));
      selection.selectLastLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));
      selection.selectFirstLine(true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));
      selection.selectFirstLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));
    });

    it('allows all lines to be selected', () => {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];
      const selection = new FilePatchSelection(hunks);
      selection.selectAllLines();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));
    });

    it('defaults to the first/last changed line when selecting next / previous with no current selection', () => {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.selectLine(hunks[0].lines[1]);
      selection.addOrSubtractLineSelection(hunks[0].lines[1]);
      selection.coalesce();
      assertEqualSets(selection.getSelectedLines(), new Set());

      selection.selectNextLine();
      assertEqualSets(selection.getSelectedLines(), new Set([hunks[0].lines[1]]));

      selection.addOrSubtractLineSelection(hunks[0].lines[1]);
      selection.coalesce();
      assertEqualSets(selection.getSelectedLines(), new Set());

      selection.selectPreviousLine();
      assertEqualSets(selection.getSelectedLines(), new Set([hunks[0].lines[2]]));
    });

    it('collapses multiple selections down to one line when selecting next or previous', () => {
      const hunks = [
        new Hunk(1, 1, 2, 4, [
          new HunkLine('line-1', 'unchanged', 1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'added', -1, 3),
          new HunkLine('line-4', 'unchanged', 2, 4),
        ]),
        new Hunk(5, 7, 3, 4, [
          new HunkLine('line-5', 'unchanged', 5, 7),
          new HunkLine('line-6', 'unchanged', 6, 8),
          new HunkLine('line-7', 'added', -1, 9),
          new HunkLine('line-8', 'unchanged', 7, 10),
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.selectLine(hunks[0].lines[1]);
      selection.addOrSubtractLineSelection(hunks[0].lines[2]);
      selection.selectNextLine(true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
        hunks[1].lines[2],
      ]));

      selection.selectNextLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[1].lines[2],
      ]));

      selection.selectLine(hunks[0].lines[1]);
      selection.addOrSubtractLineSelection(hunks[0].lines[2]);
      selection.selectPreviousLine(true);
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
        hunks[0].lines[2],
      ]));

      selection.selectPreviousLine();
      assertEqualSets(selection.getSelectedLines(), new Set([
        hunks[0].lines[1],
      ]));
    });

    describe('coalescing', () => {
      it('merges overlapping selections', () => {
        const hunks = [
          new Hunk(1, 1, 0, 4, [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
          ]),
          new Hunk(5, 7, 0, 4, [
            new HunkLine('line-5', 'added', -1, 7),
            new HunkLine('line-6', 'added', -1, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];
        const selection = new FilePatchSelection(hunks);

        selection.selectLine(hunks[0].lines[2]);
        selection.selectLine(hunks[1].lines[1], true);

        selection.addOrSubtractLineSelection(hunks[0].lines[0]);
        selection.selectLine(hunks[1].lines[0], true);
        selection.coalesce();

        selection.selectPreviousLine(true);
        assertEqualSets(selection.getSelectedLines(), new Set([
          hunks[0].lines[0],
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
        ]));

        selection.addOrSubtractLineSelection(hunks[1].lines[3]);
        selection.selectLine(hunks[0].lines[3], true);
        selection.coalesce();

        selection.selectNextLine(true);
        assertEqualSets(selection.getSelectedLines(), new Set([
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
          hunks[1].lines[1],
          hunks[1].lines[2],
          hunks[1].lines[3],
        ]));
      });

      it('merges adjacent selections', () => {
        const hunks = [
          new Hunk(1, 1, 0, 4, [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
          ]),
          new Hunk(5, 7, 0, 4, [
            new HunkLine('line-5', 'added', -1, 7),
            new HunkLine('line-6', 'added', -1, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];
        const selection = new FilePatchSelection(hunks);

        selection.selectLine(hunks[0].lines[3]);
        selection.selectLine(hunks[1].lines[1], true);

        selection.addOrSubtractLineSelection(hunks[0].lines[1]);
        selection.selectLine(hunks[0].lines[2], true);
        selection.coalesce();
        selection.selectPreviousLine(true);
        assertEqualSets(selection.getSelectedLines(), new Set([
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
        ]));

        selection.addOrSubtractLineSelection(hunks[1].lines[2]);
        selection.selectLine(hunks[1].lines[1], true);
        selection.coalesce();
        selection.selectNextLine(true);
        assertEqualSets(selection.getSelectedLines(), new Set([
          hunks[0].lines[2],
          hunks[0].lines[3],
          hunks[1].lines[0],
          hunks[1].lines[1],
          hunks[1].lines[2],
        ]));
      });

      it('expands selections to contain all adjacent context lines', () => {
        const hunks = [
          new Hunk(1, 1, 2, 4, [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'unchanged', 1, 3),
            new HunkLine('line-4', 'unchanged', 2, 4),
          ]),
          new Hunk(5, 7, 2, 4, [
            new HunkLine('line-5', 'unchanged', 5, 7),
            new HunkLine('line-6', 'unchanged', 6, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];
        const selection = new FilePatchSelection(hunks);

        selection.selectLine(hunks[1].lines[3]);
        selection.selectLine(hunks[1].lines[2], true);

        selection.addOrSubtractLineSelection(hunks[0].lines[1]);
        selection.selectLine(hunks[0].lines[0], true);
        selection.coalesce();

        selection.selectNext(true);
        assertEqualSets(selection.getSelectedLines(), new Set([
          hunks[0].lines[1],
          hunks[1].lines[2],
          hunks[1].lines[3],
        ]));
      });

      it('truncates or splits selections where they overlap a negative selection', () => {
        const hunks = [
          new Hunk(1, 1, 0, 4, [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
            new HunkLine('line-4', 'added', -1, 4),
          ]),
          new Hunk(5, 7, 0, 4, [
            new HunkLine('line-5', 'added', -1, 7),
            new HunkLine('line-6', 'added', -1, 8),
            new HunkLine('line-7', 'added', -1, 9),
            new HunkLine('line-8', 'added', -1, 10),
          ]),
        ];
        const selection = new FilePatchSelection(hunks);
        selection.selectLine(hunks[0].lines[0]);
        selection.selectLine(hunks[1].lines[3], true);

        selection.addOrSubtractLineSelection(hunks[0].lines[3]);
        selection.selectLine(hunks[1].lines[0], true);
        selection.coalesce();
        selection.selectPrevious(true);
        assertEqualSets(selection.getSelectedLines(), new Set([
          hunks[0].lines[0],
          hunks[0].lines[1],
          hunks[0].lines[2],
          hunks[1].lines[1],
          hunks[1].lines[2],
        ]));
      });

      it('does not blow up when coalescing with no selections', () => {
        const hunks = [
          new Hunk(1, 1, 0, 1, [
            new HunkLine('line-1', 'added', -1, 1),
          ]),
        ];
        const selection = new FilePatchSelection(hunks);

        selection.selectLine(hunks[0].lines[0]);
        selection.addOrSubtractLineSelection(hunks[0].lines[0]);
        assertEqualSets(selection.getSelectedLines(), new Set());
        selection.coalesce();
      });
    });
  });

  describe('hunk selection', () => {
    it('selects the first hunk by default', () => {
      const hunks = [
        new Hunk(1, 1, 0, 1, [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
      ];
      const selection = new FilePatchSelection(hunks);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0]]));
    });

    it('starts a new hunk selection with selectHunk and updates an existing selection when preserveTail is true', () => {
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
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.selectHunk(hunks[1]);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));

      selection.selectHunk(hunks[3], true);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1], hunks[2], hunks[3]]));

      selection.selectHunk(hunks[0], true);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0], hunks[1]]));
    });

    it('adds a new hunk selection with addOrSubtractHunkSelection and always updates the head of the most recent hunk selection', () => {
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
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.addOrSubtractHunkSelection(hunks[2]);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0], hunks[2]]));

      selection.selectHunk(hunks[3], true);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0], hunks[2], hunks[3]]));

      selection.selectHunk(hunks[1], true);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0], hunks[1], hunks[2]]));
    });

    it('allows the next or previous hunk to be selected', () => {
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
        ]),
      ];
      const selection = new FilePatchSelection(hunks);

      selection.selectNextHunk();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));

      selection.selectNextHunk();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[2]]));

      selection.selectNextHunk();
      selection.selectNextHunk();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[3]]));

      selection.selectPreviousHunk();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[2]]));

      selection.selectPreviousHunk();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));

      selection.selectPreviousHunk();
      selection.selectPreviousHunk();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0]]));

      selection.selectNextHunk();
      selection.selectNextHunk(true);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1], hunks[2]]));

      selection.selectPreviousHunk(true);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));

      selection.selectPreviousHunk(true);
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0], hunks[1]]));
    });

    it('allows all hunks to be selected', () => {
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
        ]),
      ];
      const selection = new FilePatchSelection(hunks);
      selection.selectAllHunks();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0], hunks[1], hunks[2], hunks[3]]));
    });
  });

  describe('selection modes', () => {
    it('allows the selection mode to be toggled between hunks and lines', () => {
      const hunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, [
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
      const selection = new FilePatchSelection(hunks);

      assert.equal(selection.getMode(), 'hunk');
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0]]));
      assertEqualSets(selection.getSelectedLines(), getChangedLines(hunks[0]));

      selection.selectNext();
      assert.equal(selection.getMode(), 'hunk');
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection.getSelectedLines(), getChangedLines(hunks[1]));

      selection.toggleMode();
      assert.equal(selection.getMode(), 'line');
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection.getSelectedLines(), new Set([hunks[1].lines[1]]));

      selection.selectNext();
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection.getSelectedLines(), new Set([hunks[1].lines[2]]));

      selection.toggleMode();
      assert.equal(selection.getMode(), 'hunk');
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection.getSelectedLines(), getChangedLines(hunks[1]));

      selection.selectLine(hunks[0].lines[1]);
      assert.equal(selection.getMode(), 'line');
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[0]]));
      assertEqualSets(selection.getSelectedLines(), new Set([hunks[0].lines[1]]));

      selection.selectHunk(hunks[1]);
      assert.equal(selection.getMode(), 'hunk');
      assertEqualSets(selection.getSelectedHunks(), new Set([hunks[1]]));
      assertEqualSets(selection.getSelectedLines(), getChangedLines(hunks[1]));
    });
  });

  describe('updateHunks(hunks)', () => {
    it('collapses the line selection to a single line following the previous selected range with the highest start index', () => {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, [
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
      const selection = new FilePatchSelection(oldHunks);

      selection.selectLine(oldHunks[1].lines[2]);
      selection.selectLine(oldHunks[1].lines[4], true);

      const newHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
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
          new HunkLine('line-11', 'deleted', 11, -1),
        ]),
      ];
      selection.updateHunks(newHunks);

      assertEqualSets(selection.getSelectedLines(), new Set([
        newHunks[2].lines[1],
      ]));
    });

    it('collapses the line selection to the line preceding the previous selected line if it was the *last* line', () => {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
      ];

      const selection = new FilePatchSelection(oldHunks);
      selection.selectLine(oldHunks[0].lines[1]);

      const newHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'unchanged', 1, 2),
          new HunkLine('line-3', 'unchanged', 2, 3),
        ]),
      ];
      selection.updateHunks(newHunks);

      assertEqualSets(selection.getSelectedLines(), new Set([
        newHunks[0].lines[0],
      ]));
    });

    it('updates the hunk selection if it exceeds the new length of the hunks list', () => {
      const oldHunks = [
        new Hunk(1, 1, 0, 1, [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
        new Hunk(5, 6, 0, 1, [
          new HunkLine('line-2', 'added', -1, 6),
        ]),
      ];
      const selection = new FilePatchSelection(oldHunks);
      selection.selectHunk(oldHunks[1]);

      const newHunks = [
        new Hunk(1, 1, 0, 1, [
          new HunkLine('line-1', 'added', -1, 1),
        ]),
      ];
      selection.updateHunks(newHunks);

      assertEqualSets(selection.getSelectedHunks(), new Set([newHunks[0]]));
    });

    it('deselects if updating with an empty hunk array', () => {
      const oldHunks = [
        new Hunk(1, 1, 1, 3, [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
        ]),
      ];

      const selection = new FilePatchSelection(oldHunks);
      selection.selectLine(oldHunks[0], oldHunks[0].lines[1]);

      selection.updateHunks([]);
      assertEqualSets(selection.getSelectedLines(), new Set());
    });
  });
});

function getChangedLines(hunk) {
  return new Set(hunk.lines.filter(l => l.isChanged()));
}
