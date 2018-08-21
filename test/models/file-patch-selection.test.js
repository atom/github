import FilePatchSelection from '../../lib/models/file-patch-selection';
import buildFilePatch from '../../lib/models/patch/builder';
import IndexedRowRange from '../../lib/models/indexed-row-range';
import Hunk from '../../lib/models/patch/hunk';
import {Addition, Deletion} from '../../lib/models/patch/region';

describe('FilePatchSelection', function() {
  describe('line selection', function() {
    it('starts a new line selection with selectLine and updates an existing selection when preserveTail is true', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks());

      const selection1 = selection0.selectLine(2);
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [2]);

      const selection2 = selection1.selectLine(7, true);
      assert.sameMembers(Array.from(selection2.getSelectedLines()), [2, 3, 6, 7]);

      const selection3 = selection2.selectLine(6, true);
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [2, 3, 6]);

      const selection4 = selection3.selectLine(1, true);
      assert.sameMembers(Array.from(selection4.getSelectedLines()), [1, 2]);

      const selection5 = selection4.selectLine(7);
      assert.sameMembers(Array.from(selection5.getSelectedLines()), [7]);
    });

    it('adds a new line selection when calling addOrSubtractLineSelection with an unselected line and always updates the head of the most recent line selection', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks())
        .selectLine(2)
        .selectLine(3, true)
        .addOrSubtractLineSelection(7)
        .selectLine(8, true);

      assert.sameMembers(Array.from(selection0.getSelectedLines()), [2, 3, 7, 8]);

      const selection1 = selection0.selectLine(1, true);
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [1, 2, 3, 6, 7]);
    });

    it('subtracts from existing selections when calling addOrSubtractLineSelection with a selected line', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks())
        .selectLine(2)
        .selectLine(7, true);

      assert.sameMembers(Array.from(selection0.getSelectedLines()), [2, 3, 6, 7]);

      const selection1 = selection0.addOrSubtractLineSelection(6);
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [2, 3, 7]);

      const selection2 = selection1.selectLine(8, true);
      assert.sameMembers(Array.from(selection2.getSelectedLines()), [2, 3]);

      const selection3 = selection2.selectLine(2, true);
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [7]);
    });

    it('allows the next or previous line to be selected', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks())
        .selectLine(1)
        .selectNextLine();
      assert.sameMembers(Array.from(selection0.getSelectedLines()), [2]);

      const selection1 = selection0.selectNextLine();
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [3]);

      const selection2 = selection1.selectNextLine();
      assert.sameMembers(Array.from(selection2.getSelectedLines()), [6]);

      const selection3 = selection2.selectPreviousLine();
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [3]);

      const selection4 = selection3.selectPreviousLine();
      assert.sameMembers(Array.from(selection4.getSelectedLines()), [2]);

      const selection5 = selection4.selectPreviousLine();
      assert.sameMembers(Array.from(selection5.getSelectedLines()), [1]);

      const selection6 = selection5.selectNextLine(true);
      assert.sameMembers(Array.from(selection6.getSelectedLines()), [1, 2]);

      const selection7 = selection6.selectNextLine().selectNextLine().selectPreviousLine(true);
      assert.sameMembers(Array.from(selection7.getSelectedLines()), [3, 6]);
    });

    it('allows the first/last changed line to be selected', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks()).selectLastLine();
      assert.sameMembers(Array.from(selection0.getSelectedLines()), [8]);

      const selection1 = selection0.selectFirstLine();
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [1]);

      const selection2 = selection1.selectLastLine(true);
      assert.sameMembers(Array.from(selection2.getSelectedLines()), [1, 2, 3, 6, 7, 8]);

      const selection3 = selection2.selectLastLine();
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [8]);

      const selection4 = selection3.selectFirstLine(true);
      assert.sameMembers(Array.from(selection4.getSelectedLines()), [1, 2, 3, 6, 7, 8]);

      const selection5 = selection4.selectFirstLine();
      assert.sameMembers(Array.from(selection5.getSelectedLines()), [1]);
    });

    it('allows all lines to be selected', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks()).selectAllLines();
      assert.sameMembers(Array.from(selection0.getSelectedLines()), [1, 2, 3, 6, 7, 8]);
    });

    it('defaults to the first/last changed line when selecting next / previous with no current selection', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks())
        .selectLine(1)
        .addOrSubtractLineSelection(1)
        .coalesce();
      assert.sameMembers(Array.from(selection0.getSelectedLines()), []);

      const selection1 = selection0.selectNextLine();
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [1]);

      const selection2 = selection1.addOrSubtractLineSelection(1).coalesce();
      assert.sameMembers(Array.from(selection2.getSelectedLines()), []);

      const selection3 = selection2.selectPreviousLine();
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [8]);
    });

    it('collapses multiple selections down to one line when selecting next or previous', function() {
      const patch = buildPatchFixture();

      const selection0 = new FilePatchSelection(patch.getHunks())
        .selectLine(1)
        .addOrSubtractLineSelection(2)
        .selectNextLine(true);
      assert.sameMembers(Array.from(selection0.getSelectedLines()), [1, 2, 3]);

      const selection1 = selection0.selectNextLine();
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [6]);

      const selection2 = selection1.selectLine(1)
        .addOrSubtractLineSelection(2)
        .selectPreviousLine(true);
      assert.sameMembers(Array.from(selection2.getSelectedLines()), [1, 2]);

      const selection3 = selection2.selectPreviousLine();
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [1]);
    });

    describe('coalescing', function() {
      it('merges overlapping selections', function() {
        const patch = buildAllAddedPatchFixture();

        const selection0 = new FilePatchSelection(patch.getHunks())
          .selectLine(3)
          .selectLine(5, true)
          .addOrSubtractLineSelection(0)
          .selectLine(4, true)
          .coalesce()
          .selectPreviousLine(true);
        assert.sameMembers(Array.from(selection0.getSelectedLines()), [0, 1, 2, 3, 4]);

        const selection1 = selection0.addOrSubtractLineSelection(7)
          .selectLine(3, true)
          .coalesce()
          .selectNextLine(true);
        assert.sameMembers(Array.from(selection1.getSelectedLines()), [1, 2, 3, 4, 5, 6, 7]);
      });

      it('merges adjacent selections', function() {
        const patch = buildAllAddedPatchFixture();

        const selection0 = new FilePatchSelection(patch.getHunks())
          .selectLine(3)
          .selectLine(5, true)
          .addOrSubtractLineSelection(1)
          .selectLine(2, true)
          .coalesce()
          .selectPreviousLine(true);
        assert.sameMembers(Array.from(selection0.getSelectedLines()), [1, 2, 3, 4]);

        const selection1 = selection0.addOrSubtractLineSelection(6)
          .selectLine(5, true)
          .coalesce()
          .selectNextLine(true);
        assert.sameMembers(Array.from(selection1.getSelectedLines()), [2, 3, 4, 5, 6]);
      });

      it('expands selections to contain all adjacent context lines', function() {
        const patch = buildPatchFixture();

        const selection0 = new FilePatchSelection(patch.getHunks())
          .selectLine(7)
          .selectLine(6, true)
          .addOrSubtractLineSelection(2)
          .selectLine(1, true)
          .coalesce()
          .selectNext(true);

        assert.sameMembers(Array.from(selection0.getSelectedLines()), [2, 6, 7]);
      });

      it('truncates or splits selections where they overlap a negative selection', function() {
        const patch = buildAllAddedPatchFixture();

        const selection0 = new FilePatchSelection(patch.getHunks())
          .selectLine(0)
          .selectLine(7, true)
          .addOrSubtractLineSelection(3)
          .selectLine(4, true)
          .coalesce()
          .selectPrevious(true);
        assert.sameMembers(Array.from(selection0.getSelectedLines()), [0, 1, 2, 5, 6]);
      });

      it('does not blow up when coalescing with no selections', function() {
        const patch = buildAllAddedPatchFixture();

        const selection0 = new FilePatchSelection(patch.getHunks())
          .selectLine(0)
          .addOrSubtractLineSelection(0);
        assert.lengthOf(Array.from(selection0.getSelectedLines()), 0);

        const selection1 = selection0.coalesce();
        assert.lengthOf(Array.from(selection1.getSelectedLines()), 0);
      });
    });
  });

  describe('hunk selection', function() {
    it('selects the first hunk by default', function() {
      const hunks = buildPatchFixture().getHunks();
      const selection0 = new FilePatchSelection(hunks);
      assert.sameMembers(Array.from(selection0.getSelectedHunks()), [hunks[0]]);
    });

    it('starts a new hunk selection with selectHunk and updates an existing selection when preserveTail is true', function() {
      const hunks = buildFourHunksPatchFixture().getHunks();
      const selection0 = new FilePatchSelection(hunks)
        .selectHunk(hunks[1]);
      assert.sameMembers(Array.from(selection0.getSelectedHunks()), [hunks[1]]);

      const selection1 = selection0.selectHunk(hunks[3], true);
      assert.sameMembers(Array.from(selection1.getSelectedHunks()), [hunks[1], hunks[2], hunks[3]]);

      const selection2 = selection1.selectHunk(hunks[0], true);
      assert.sameMembers(Array.from(selection2.getSelectedHunks()), [hunks[0], hunks[1]]);
    });

    it('adds a new hunk selection with addOrSubtractHunkSelection and always updates the head of the most recent hunk selection', function() {
      const hunks = buildFourHunksPatchFixture().getHunks();
      const selection0 = new FilePatchSelection(hunks)
        .addOrSubtractHunkSelection(hunks[2]);
      assert.sameMembers(Array.from(selection0.getSelectedHunks()), [hunks[0], hunks[2]]);

      const selection1 = selection0.selectHunk(hunks[3], true);
      assert.sameMembers(Array.from(selection1.getSelectedHunks()), [hunks[0], hunks[2], hunks[3]]);

      const selection2 = selection1.selectHunk(hunks[1], true);
      assert.sameMembers(Array.from(selection2.getSelectedHunks()), [hunks[0], hunks[1], hunks[2]]);
    });

    it('allows the next or previous hunk to be selected', function() {
      const hunks = buildFourHunksPatchFixture().getHunks();
      const selection0 = new FilePatchSelection(hunks)
        .selectNextHunk();
      assert.sameMembers(Array.from(selection0.getSelectedHunks()), [hunks[1]]);

      const selection1 = selection0.selectNextHunk();
      assert.sameMembers(Array.from(selection1.getSelectedHunks()), [hunks[2]]);

      const selection2 = selection1.selectNextHunk()
        .selectNextHunk();
      assert.sameMembers(Array.from(selection2.getSelectedHunks()), [hunks[3]]);

      const selection3 = selection2.selectPreviousHunk();
      assert.sameMembers(Array.from(selection3.getSelectedHunks()), [hunks[2]]);

      const selection4 = selection3.selectPreviousHunk();
      assert.sameMembers(Array.from(selection4.getSelectedHunks()), [hunks[1]]);

      const selection5 = selection4.selectPreviousHunk()
        .selectPreviousHunk();
      assert.sameMembers(Array.from(selection5.getSelectedHunks()), [hunks[0]]);

      const selection6 = selection5.selectNextHunk()
        .selectNextHunk(true);
      assert.sameMembers(Array.from(selection6.getSelectedHunks()), [hunks[1], hunks[2]]);

      const selection7 = selection6.selectPreviousHunk(true);
      assert.sameMembers(Array.from(selection7.getSelectedHunks()), [hunks[1]]);

      const selection8 = selection7.selectPreviousHunk(true);
      assert.sameMembers(Array.from(selection8.getSelectedHunks()), [hunks[0], hunks[1]]);
    });

    it('allows all hunks to be selected', function() {
      const hunks = buildFourHunksPatchFixture().getHunks();

      const selection0 = new FilePatchSelection(hunks)
        .selectAllHunks();
      assert.sameMembers(Array.from(selection0.getSelectedHunks()), [hunks[0], hunks[1], hunks[2], hunks[3]]);
    });
  });

  describe('selection modes', function() {
    it('allows the selection mode to be toggled between hunks and lines', function() {
      const hunks = buildPatchFixture().getHunks();
      const selection0 = new FilePatchSelection(hunks);

      assert.strictEqual(selection0.getMode(), 'hunk');
      assert.sameMembers(Array.from(selection0.getSelectedHunks()), [hunks[0]]);
      assert.sameMembers(Array.from(selection0.getSelectedLines()), [1, 2, 3]);

      const selection1 = selection0.selectNext();
      assert.strictEqual(selection1.getMode(), 'hunk');
      assert.sameMembers(Array.from(selection1.getSelectedHunks()), [hunks[1]]);
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [6, 7, 8]);

      const selection2 = selection1.toggleMode();
      assert.strictEqual(selection2.getMode(), 'line');
      assert.sameMembers(Array.from(selection2.getSelectedHunks()), [hunks[1]]);
      assert.sameMembers(Array.from(selection2.getSelectedLines()), [6]);

      const selection3 = selection2.selectNext();
      assert.sameMembers(Array.from(selection3.getSelectedHunks()), [hunks[1]]);
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [7]);

      const selection4 = selection3.toggleMode();
      assert.strictEqual(selection4.getMode(), 'hunk');
      assert.sameMembers(Array.from(selection4.getSelectedHunks()), [hunks[1]]);
      assert.sameMembers(Array.from(selection4.getSelectedLines()), [6, 7, 8]);

      const selection5 = selection4.selectLine(1);
      assert.strictEqual(selection5.getMode(), 'line');
      assert.sameMembers(Array.from(selection5.getSelectedHunks()), [hunks[0]]);
      assert.sameMembers(Array.from(selection5.getSelectedLines()), [1]);

      const selection6 = selection5.selectHunk(hunks[1]);
      assert.strictEqual(selection6.getMode(), 'hunk');
      assert.sameMembers(Array.from(selection6.getSelectedHunks()), [hunks[1]]);
      assert.sameMembers(Array.from(selection6.getSelectedLines()), [6, 7, 8]);
    });
  });

  describe('updateHunks(hunks)', function() {
    it('collapses the line selection to a single line following the previous selected range with the highest start index', function() {
      const oldHunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 1, newStartRow: 1, newRowCount: 3,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [1, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
        new Hunk({
          oldStartRow: 5, oldRowCount: 7, newStartRow: 5, newRowCount: 4,
          rowRange: new IndexedRowRange({bufferRange: [[3, 0], [10, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Deletion(new IndexedRowRange({bufferRange: [[4, 0], [5, 0]], startOffset: 0, endOffset: 0})),
            new Addition(new IndexedRowRange({bufferRange: [[6, 0], [8, 0]], startOffset: 0, endOffset: 0})),
            new Deletion(new IndexedRowRange({bufferRange: [[9, 0], [10, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
      ];

      const selection0 = new FilePatchSelection(oldHunks)
        .selectLine(5)
        .selectLine(7, true);

      const newHunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 1, newStartRow: 1, newRowCount: 3,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [1, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
        new Hunk({
          oldStartRow: 5, oldRowCount: 7, newStartRow: 3, newRowCount: 2,
          rowRange: new IndexedRowRange({bufferRange: [[3, 0], [5, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Deletion(new IndexedRowRange({bufferRange: [[4, 0], [4, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
        new Hunk({
          oldStartRow: 9, oldRowCount: 10, newStartRow: 3, newRowCount: 2,
          rowRange: new IndexedRowRange({bufferRange: [[6, 0], [9, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[7, 0], [7, 0]], startOffset: 0, endOffset: 0})),
            new Deletion(new IndexedRowRange({bufferRange: [[8, 0], [9, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
      ];
      const selection1 = selection0.updateHunks(newHunks);

      assert.sameMembers(Array.from(selection1.getSelectedLines()), [7]);
    });

    it('collapses the line selection to the line preceding the previous selected line if it was the *last* line', function() {
      const oldHunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 1, newStartRow: 1, newRowCount: 4,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [3, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
      ];

      const selection0 = new FilePatchSelection(oldHunks)
        .selectLine(2);

      const newHunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 1, newStartRow: 1, newRowCount: 4,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [3, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [1, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
      ];
      const selection1 = selection0.updateHunks(newHunks);
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [1]);
    });

    it('updates the hunk selection if it exceeds the new length of the hunks list', function() {
      const oldHunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 1,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [0, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [0, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
        new Hunk({
          oldStartRow: 5, oldRowCount: 0, newStartRow: 6, newRowCount: 1,
          rowRange: new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
      ];
      const selection0 = new FilePatchSelection(oldHunks)
        .selectHunk(oldHunks[1]);

      const newHunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 1,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [0, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [0, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
      ];
      const selection1 = selection0.updateHunks(newHunks);
      assert.sameMembers(Array.from(selection1.getSelectedHunks()), [newHunks[0]]);
    });

    it('deselects if updating with an empty hunk array', function() {
      const oldHunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 1, newStartRow: 1, newRowCount: 3,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [1, 0]], startOffset: 0, endOffset: 0}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [1, 0]], startOffset: 0, endOffset: 0})),
          ],
        }),
      ];

      const selection0 = new FilePatchSelection(oldHunks)
        .selectLine(1)
        .updateHunks([]);
      assert.lengthOf(Array.from(selection0.getSelectedLines()), []);
    });

    it('resolves the getNextUpdatePromise the next time hunks are changed', async function() {
      const hunk0 = new Hunk({
        oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 1,
        rowRange: new IndexedRowRange({bufferRange: [[0, 0], [0, 0]], startOffset: 0, endOffset: 0}),
        changes: [
          new Addition(new IndexedRowRange({bufferRange: [[0, 0], [0, 0]], startOffset: 0, endOffset: 0})),
        ],
      });
      const hunk1 = new Hunk({
        oldStartRow: 5, oldRowCount: 0, newStartRow: 6, newRowCount: 1,
        rowRange: new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 0, endOffset: 0}),
        changes: [
          new Addition(new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 0, endOffset: 0})),
        ],
      });
      const existingHunks = [hunk0, hunk1];
      const selection0 = new FilePatchSelection(existingHunks);

      let wasResolved = false;
      const promise = selection0.getNextUpdatePromise().then(() => { wasResolved = true; });

      const unchangedHunks = [hunk0, hunk1];
      const selection1 = selection0.updateHunks(unchangedHunks);

      assert.isFalse(wasResolved);

      const hunk2 = new Hunk({
        oldStartRow: 6, oldRowCount: 1, newStartRow: 4, newRowCount: 3,
        rowRange: new IndexedRowRange({bufferRange: [[1, 0], [2, 0]], startOffset: 0, endOffset: 0}),
        changes: [
          new Addition(new IndexedRowRange({bufferRange: [[1, 0], [2, 0]], startOffset: 0, endOffset: 0})),
        ],
      });
      const changedHunks = [hunk0, hunk2];
      selection1.updateHunks(changedHunks);

      await promise;
      assert.isTrue(wasResolved);
    });
  });

  describe('jumpToNextHunk() and jumpToPreviousHunk()', function() {
    it('selects the next/previous hunk', function() {
      const hunks = buildThreeHunkPatchFixture().getHunks();
      const selection0 = new FilePatchSelection(hunks);

      // in hunk mode, selects the entire next/previous hunk
      assert.strictEqual(selection0.getMode(), 'hunk');
      assert.sameMembers(Array.from(selection0.getSelectedHunks()), [hunks[0]]);

      const selection1 = selection0.jumpToNextHunk();
      assert.sameMembers(Array.from(selection1.getSelectedHunks()), [hunks[1]]);

      const selection2 = selection1.jumpToNextHunk();
      assert.sameMembers(Array.from(selection2.getSelectedHunks()), [hunks[2]]);

      const selection3 = selection2.jumpToNextHunk();
      assert.sameMembers(Array.from(selection3.getSelectedHunks()), [hunks[2]]);

      const selection4 = selection3.jumpToPreviousHunk();
      assert.sameMembers(Array.from(selection4.getSelectedHunks()), [hunks[1]]);

      const selection5 = selection4.jumpToPreviousHunk();
      assert.sameMembers(Array.from(selection5.getSelectedHunks()), [hunks[0]]);

      const selection6 = selection5.jumpToPreviousHunk();
      assert.sameMembers(Array.from(selection6.getSelectedHunks()), [hunks[0]]);

      // in line selection mode, the first changed line of the next/previous hunk is selected
      const selection7 = selection6.toggleMode();
      assert.strictEqual(selection7.getMode(), 'line');
      assert.sameMembers(Array.from(selection7.getSelectedLines()), [1]);

      const selection8 = selection7.jumpToNextHunk();
      assert.sameMembers(Array.from(selection8.getSelectedLines()), [6]);

      const selection9 = selection8.jumpToNextHunk();
      assert.sameMembers(Array.from(selection9.getSelectedLines()), [12]);

      const selection10 = selection9.jumpToNextHunk();
      assert.sameMembers(Array.from(selection10.getSelectedLines()), [12]);

      const selection11 = selection10.jumpToPreviousHunk();
      assert.sameMembers(Array.from(selection11.getSelectedLines()), [6]);

      const selection12 = selection11.jumpToPreviousHunk();
      assert.sameMembers(Array.from(selection12.getSelectedLines()), [1]);

      const selection13 = selection12.jumpToPreviousHunk();
      assert.sameMembers(Array.from(selection13.getSelectedLines()), [1]);
    });
  });

  describe('goToDiffLine(lineNumber)', function() {
    it('selects the closest selectable hunk line', function() {
      const hunks = buildPatchFixture().getHunks();

      const selection0 = new FilePatchSelection(hunks);
      const selection1 = selection0.goToDiffLine(11);
      assert.sameMembers(Array.from(selection1.getSelectedLines()), [1]);

      const selection2 = selection1.goToDiffLine(26);
      assert.sameMembers(Array.from(selection2.getSelectedLines()), [7]);

      // selects closest added hunk line
      const selection3 = selection2.goToDiffLine(27);
      assert.sameMembers(Array.from(selection3.getSelectedLines()), [7]);

      const selection4 = selection3.goToDiffLine(18);
      assert.sameMembers(Array.from(selection4.getSelectedLines()), [1]);

      const selection5 = selection4.goToDiffLine(19);
      assert.sameMembers(Array.from(selection5.getSelectedLines()), [6]);
    });
  });
});

function buildPatchFixture() {
  return buildFilePatch([{
    oldPath: 'a.txt',
    oldMode: '100644',
    newPath: 'a.txt',
    newMode: '100644',
    status: 'modified',
    hunks: [
      {
        oldStartLine: 10,
        oldLineCount: 4,
        newStartLine: 10,
        newLineCount: 3,
        lines: [
          ' 0000',
          '+0001',
          '-0002',
          '-0003',
          ' 0004',
        ],
      },
      {
        oldStartLine: 25,
        oldLineCount: 3,
        newStartLine: 24,
        newLineCount: 4,
        lines: [
          ' 0005',
          '+0006',
          '+0007',
          '-0008',
          ' 0009',
        ],
      },
    ],
  }]);
}

function buildThreeHunkPatchFixture() {
  return buildFilePatch([{
    oldPath: 'a.txt',
    oldMode: '100644',
    newPath: 'a.txt',
    newMode: '100644',
    status: 'modified',
    hunks: [
      {
        oldStartLine: 10,
        oldLineCount: 4,
        newStartLine: 10,
        newLineCount: 3,
        lines: [
          ' 0000',
          '+0001',
          '-0002',
          '-0003',
          ' 0004',
        ],
      },
      {
        oldStartLine: 25,
        oldLineCount: 3,
        newStartLine: 24,
        newLineCount: 4,
        lines: [
          ' 0005',
          '+0006',
          '+0007',
          '-0008',
          ' 0009',
        ],
      },
      {
        oldStartLine: 40,
        oldLineCount: 5,
        newStartLine: 44,
        newLineCount: 3,
        lines: [
          ' 0010',
          ' 0011',
          '-0012',
          '-0013',
          ' 0014',
        ],
      },
    ],
  }]);
}

function buildAllAddedPatchFixture() {
  return buildFilePatch([{
    oldPath: 'a.txt',
    oldMode: '100644',
    newPath: 'a.txt',
    newMode: '100644',
    status: 'modified',
    hunks: [
      {
        oldStartLine: 1,
        oldLineCount: 0,
        newStartLine: 1,
        newLineCount: 4,
        lines: [
          '+0000',
          '+0001',
          '+0002',
          '+0003',
        ],
      },
      {
        oldStartLine: 1,
        oldLineCount: 0,
        newStartLine: 5,
        newLineCount: 4,
        lines: [
          '+0004',
          '+0005',
          '+0006',
          '+0007',
        ],
      },
    ],
  }]);
}

function buildFourHunksPatchFixture() {
  return buildFilePatch([{
    oldPath: 'a.txt',
    oldMode: '100644',
    newPath: 'a.txt',
    newMode: '100644',
    status: 'modified',
    hunks: [
      {
        oldStartLine: 1,
        oldLineCount: 0,
        newStartLine: 1,
        newLineCount: 1,
        lines: [
          '+0000',
        ],
      },
      {
        oldStartLine: 2,
        oldLineCount: 0,
        newStartLine: 2,
        newLineCount: 1,
        lines: [
          '+0001',
        ],
      },
      {
        oldStartLine: 3,
        oldLineCount: 0,
        newStartLine: 3,
        newLineCount: 1,
        lines: [
          '+0002',
        ],
      },
      {
        oldStartLine: 4,
        oldLineCount: 0,
        newStartLine: 4,
        newLineCount: 1,
        lines: [
          '+0004',
        ],
      },
    ],
  }]);
}
