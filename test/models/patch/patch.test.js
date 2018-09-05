import Patch, {nullPatch} from '../../../lib/models/patch/patch';
import Hunk from '../../../lib/models/patch/hunk';
import IndexedRowRange from '../../../lib/models/indexed-row-range';
import {Addition, Deletion, NoNewline} from '../../../lib/models/patch/region';
import {assertInPatch} from '../../helpers';

describe('Patch', function() {
  it('has some standard accessors', function() {
    const p = new Patch({status: 'modified', hunks: [], bufferText: 'bufferText'});
    assert.strictEqual(p.getStatus(), 'modified');
    assert.deepEqual(p.getHunks(), []);
    assert.strictEqual(p.getBufferText(), 'bufferText');
    assert.isTrue(p.isPresent());
  });

  it('computes the byte size of the total patch data', function() {
    const p = new Patch({status: 'modified', hunks: [], bufferText: '\u00bd + \u00bc = \u00be'});
    assert.strictEqual(p.getByteSize(), 12);
  });

  it('computes the total changed line count', function() {
    const hunks = [
      new Hunk({
        oldStartRow: 0, newStartRow: 0, oldRowCount: 1, newRowCount: 1,
        sectionHeading: 'zero',
        rowRange: buildRange(0, 5),
        changes: [
          new Addition(buildRange(1)),
          new Deletion(buildRange(3, 4)),
        ],
      }),
      new Hunk({
        oldStartRow: 0, newStartRow: 0, oldRowCount: 1, newRowCount: 1,
        sectionHeading: 'one',
        rowRange: buildRange(6, 15),
        changes: [
          new Deletion(buildRange(7)),
          new Deletion(buildRange(9, 11)),
          new Addition(buildRange(12, 14)),
        ],
      }),
    ];
    const p = new Patch({status: 'modified', hunks, bufferText: 'bufferText'});

    assert.strictEqual(p.getChangedLineCount(), 10);
  });

  it('computes the maximum number of digits needed to display a diff line number', function() {
    const hunks = [
      new Hunk({
        oldStartRow: 0, oldRowCount: 1, newStartRow: 0, newRowCount: 1,
        sectionHeading: 'zero',
        rowRange: buildRange(0, 5),
        changes: [],
      }),
      new Hunk({
        oldStartRow: 98,
        oldRowCount: 5,
        newStartRow: 95,
        newRowCount: 3,
        sectionHeading: 'one',
        rowRange: buildRange(6, 15),
        changes: [],
      }),
    ];
    const p0 = new Patch({status: 'modified', hunks, bufferText: 'bufferText'});
    assert.strictEqual(p0.getMaxLineNumberWidth(), 3);

    const p1 = new Patch({status: 'deleted', hunks: [], bufferText: ''});
    assert.strictEqual(p1.getMaxLineNumberWidth(), 0);
  });

  it('clones itself with optionally overridden properties', function() {
    const original = new Patch({status: 'modified', hunks: [], bufferText: 'bufferText'});

    const dup0 = original.clone();
    assert.notStrictEqual(dup0, original);
    assert.strictEqual(dup0.getStatus(), 'modified');
    assert.deepEqual(dup0.getHunks(), []);
    assert.strictEqual(dup0.getBufferText(), 'bufferText');

    const dup1 = original.clone({status: 'added'});
    assert.notStrictEqual(dup1, original);
    assert.strictEqual(dup1.getStatus(), 'added');
    assert.deepEqual(dup1.getHunks(), []);
    assert.strictEqual(dup1.getBufferText(), 'bufferText');

    const hunks = [new Hunk({changes: []})];
    const dup2 = original.clone({hunks});
    assert.notStrictEqual(dup2, original);
    assert.strictEqual(dup2.getStatus(), 'modified');
    assert.deepEqual(dup2.getHunks(), hunks);
    assert.strictEqual(dup2.getBufferText(), 'bufferText');

    const dup3 = original.clone({bufferText: 'changed'});
    assert.notStrictEqual(dup3, original);
    assert.strictEqual(dup3.getStatus(), 'modified');
    assert.deepEqual(dup3.getHunks(), []);
    assert.strictEqual(dup3.getBufferText(), 'changed');
  });

  it('clones a nullPatch as a nullPatch', function() {
    assert.strictEqual(nullPatch, nullPatch.clone());
  });

  it('clones a nullPatch to a real Patch if properties are provided', function() {
    const dup0 = nullPatch.clone({status: 'added'});
    assert.notStrictEqual(dup0, nullPatch);
    assert.strictEqual(dup0.getStatus(), 'added');
    assert.deepEqual(dup0.getHunks(), []);
    assert.strictEqual(dup0.getBufferText(), '');

    const hunks = [new Hunk({changes: []})];
    const dup1 = nullPatch.clone({hunks});
    assert.notStrictEqual(dup1, nullPatch);
    assert.isNull(dup1.getStatus());
    assert.deepEqual(dup1.getHunks(), hunks);
    assert.strictEqual(dup1.getBufferText(), '');

    const dup2 = nullPatch.clone({bufferText: 'changed'});
    assert.notStrictEqual(dup2, nullPatch);
    assert.isNull(dup2.getStatus());
    assert.deepEqual(dup2.getHunks(), []);
    assert.strictEqual(dup2.getBufferText(), 'changed');
  });

  describe('stage patch generation', function() {
    it('creates a patch that applies selected lines from only a single hunk', function() {
      const patch = buildPatchFixture();
      const stagePatch = patch.getStagePatchForLines(new Set([8, 13, 14, 16]));
      // buffer rows:             0     1     2     3     4     5     6     7     8     9
      const expectedBufferText = '0007\n0008\n0010\n0011\n0012\n0013\n0014\n0015\n0016\n0018\n';
      assert.strictEqual(stagePatch.getBufferText(), expectedBufferText);
      assertInPatch(stagePatch).hunks(
        {
          startRow: 0,
          endRow: 9,
          header: '@@ -12,9 +12,7 @@',
          changes: [
            {kind: 'addition', string: '+0008\n', range: [[1, 0], [1, Infinity]]},
            {kind: 'deletion', string: '-0013\n-0014\n', range: [[5, 0], [6, Infinity]]},
            {kind: 'deletion', string: '-0016\n', range: [[8, 0], [8, Infinity]]},
          ],
        },
      );
    });

    it('creates a patch that applies selected lines from several hunks', function() {
      const patch = buildPatchFixture();
      const stagePatch = patch.getStagePatchForLines(new Set([1, 5, 15, 16, 17, 25]));
      const expectedBufferText =
          // buffer rows
          // 0   1     2     3     4
          '0000\n0001\n0002\n0005\n0006\n' +
          // 5   6     7     8     9     10    11    12    13    14
          '0007\n0010\n0011\n0012\n0013\n0014\n0015\n0016\n0017\n0018\n' +
          // 15  16    17
          '0024\n0025\n No newline at end of file\n';
      assert.strictEqual(stagePatch.getBufferText(), expectedBufferText);
      assertInPatch(stagePatch).hunks(
        {
          startRow: 0,
          endRow: 4,
          header: '@@ -3,4 +3,4 @@',
          changes: [
            {kind: 'deletion', string: '-0001\n', range: [[1, 0], [1, Infinity]]},
            {kind: 'addition', string: '+0005\n', range: [[3, 0], [3, Infinity]]},
          ],
        },
        {
          startRow: 5,
          endRow: 14,
          header: '@@ -12,9 +12,8 @@',
          changes: [
            {kind: 'deletion', string: '-0015\n-0016\n', range: [[11, 0], [12, Infinity]]},
            {kind: 'addition', string: '+0017\n', range: [[13, 0], [13, Infinity]]},
          ],
        },
        {
          startRow: 15,
          endRow: 17,
          header: '@@ -32,1 +31,2 @@',
          changes: [
            {kind: 'addition', string: '+0025\n', range: [[16, 0], [16, Infinity]]},
            {kind: 'nonewline', string: '\\ No newline at end of file\n', range: [[17, 0], [17, Infinity]]},
          ],
        },
      );
    });

    it('returns a modification patch if original patch is a deletion', function() {
      const bufferText = 'line-0\nline-1\nline-2\nline-3\nline-4\nline-5\n';

      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 5, newStartRow: 1, newRowCount: 0,
          sectionHeading: 'zero',
          rowRange: buildRange(0, 5, 6),
          changes: [
            new Deletion(buildRange(0, 5, 6)),
          ],
        }),
      ];

      const patch = new Patch({status: 'deleted', hunks, bufferText});

      const stagedPatch = patch.getStagePatchForLines(new Set([1, 3, 4]));
      assert.strictEqual(stagedPatch.getStatus(), 'modified');
      assertInPatch(stagedPatch).hunks(
        {
          startRow: 0,
          endRow: 5,
          header: '@@ -1,5 +1,3 @@',
          changes: [
            {kind: 'deletion', string: '-line-1\n', range: [[1, 0], [1, Infinity]]},
            {kind: 'deletion', string: '-line-3\n-line-4\n', range: [[3, 0], [4, Infinity]]},
          ],
        },
      );
    });

    it('returns an deletion when staging an entire deletion patch', function() {
      const bufferText = '0000\n0001\n0002\n';
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 0,
          rowRange: buildRange(0, 2),
          changes: [
            new Deletion(buildRange(0, 2)),
          ],
        }),
      ];
      const patch = new Patch({status: 'deleted', hunks, bufferText});

      const unstagePatch0 = patch.getUnstagePatchForLines(new Set([0, 1, 2]));
      assert.strictEqual(unstagePatch0.getStatus(), 'deleted');
    });

    it('returns a nullPatch as a nullPatch', function() {
      assert.strictEqual(nullPatch.getStagePatchForLines(new Set([1, 2, 3])), nullPatch);
    });
  });

  describe('unstage patch generation', function() {
    it('creates a patch that updates the index to unapply selected lines from a single hunk', function() {
      const patch = buildPatchFixture();
      const unstagePatch = patch.getUnstagePatchForLines(new Set([8, 12, 13]));
      assert.strictEqual(
        unstagePatch.getBufferText(),
        // 0   1     2     3     4     5     6     7     8
        '0007\n0008\n0009\n0010\n0011\n0012\n0013\n0017\n0018\n',
      );
      assertInPatch(unstagePatch).hunks(
        {
          startRow: 0,
          endRow: 8,
          header: '@@ -13,7 +13,8 @@',
          changes: [
            {kind: 'deletion', string: '-0008\n', range: [[1, 0], [1, Infinity]]},
            {kind: 'addition', string: '+0012\n+0013\n', range: [[5, 0], [6, Infinity]]},
          ],
        },
      );
    });

    it('creates a patch that updates the index to unapply lines from several hunks', function() {
      const patch = buildPatchFixture();
      const unstagePatch = patch.getUnstagePatchForLines(new Set([1, 4, 5, 16, 17, 20, 25]));
      assert.strictEqual(
        unstagePatch.getBufferText(),
        // 0   1     2     3     4     5
        '0000\n0001\n0003\n0004\n0005\n0006\n' +
        // 6   7     8     9     10    11    12    13
        '0007\n0008\n0009\n0010\n0011\n0016\n0017\n0018\n' +
        // 14  15    16
        '0019\n0020\n0023\n' +
        // 17  18    19
        '0024\n0025\n No newline at end of file\n',
      );
      assertInPatch(unstagePatch).hunks(
        {
          startRow: 0,
          endRow: 5,
          header: '@@ -3,5 +3,4 @@',
          changes: [
            {kind: 'addition', string: '+0001\n', range: [[1, 0], [1, Infinity]]},
            {kind: 'deletion', string: '-0004\n-0005\n', range: [[3, 0], [4, Infinity]]},
          ],
        },
        {
          startRow: 6,
          endRow: 13,
          header: '@@ -13,7 +12,7 @@',
          changes: [
            {kind: 'addition', string: '+0016\n', range: [[11, 0], [11, Infinity]]},
            {kind: 'deletion', string: '-0017\n', range: [[12, 0], [12, Infinity]]},
          ],
        },
        {
          startRow: 14,
          endRow: 16,
          header: '@@ -25,3 +24,2 @@',
          changes: [
            {kind: 'deletion', string: '-0020\n', range: [[15, 0], [15, Infinity]]},
          ],
        },
        {
          startRow: 17,
          endRow: 19,
          header: '@@ -30,2 +28,1 @@',
          changes: [
            {kind: 'deletion', string: '-0025\n', range: [[18, 0], [18, Infinity]]},
            {kind: 'nonewline', string: '\\ No newline at end of file\n', range: [[19, 0], [19, Infinity]]},
          ],
        },
      );
    });

    it('unstages an entire patch at once', function() {
      const patch = buildPatchFixture();
      const unstagedPatch = patch.getFullUnstagedPatch();

      assert.strictEqual(unstagedPatch.getBufferText(), patch.getBufferText());
      assertInPatch(unstagedPatch).hunks(
        {
          startRow: 0,
          endRow: 6,
          header: '@@ -3,5 +3,4 @@',
          changes: [
            {kind: 'addition', string: '+0001\n+0002\n', range: [[1, 0], [2, 4]]},
            {kind: 'deletion', string: '-0003\n-0004\n-0005\n', range: [[3, 0], [5, 4]]},
          ],
        },
        {
          startRow: 7,
          endRow: 18,
          header: '@@ -13,7 +12,9 @@',
          changes: [
            {kind: 'deletion', string: '-0008\n-0009\n', range: [[8, 0], [9, 4]]},
            {kind: 'addition', string: '+0012\n+0013\n+0014\n+0015\n+0016\n', range: [[12, 0], [16, 4]]},
            {kind: 'deletion', string: '-0017\n', range: [[17, 0], [17, 4]]},
          ],
        },
        {
          startRow: 19,
          endRow: 23,
          header: '@@ -25,3 +26,4 @@',
          changes: [
            {kind: 'deletion', string: '-0020\n', range: [[20, 0], [20, 4]]},
            {kind: 'addition', string: '+0021\n+0022\n', range: [[21, 0], [22, 4]]},
          ],
        },
        {
          startRow: 24,
          endRow: 26,
          header: '@@ -30,2 +32,1 @@',
          changes: [
            {kind: 'deletion', string: '-0025\n', range: [[25, 0], [25, 4]]},
            {kind: 'nonewline', string: '\\ No newline at end of file\n', range: [[26, 0], [26, 26]]},
          ],
        },
      );
    });

    it('returns a modification if original patch is an addition', function() {
      const bufferText = '0000\n0001\n0002\n';
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 3,
          rowRange: buildRange(0, 2),
          changes: [
            new Addition(buildRange(0, 2)),
          ],
        }),
      ];
      const patch = new Patch({status: 'added', hunks, bufferText});
      const unstagePatch = patch.getUnstagePatchForLines(new Set([1, 2]));
      assert.strictEqual(unstagePatch.getStatus(), 'modified');
      assert.strictEqual(unstagePatch.getBufferText(), '0000\n0001\n0002\n');
      assertInPatch(unstagePatch).hunks(
        {
          startRow: 0,
          endRow: 2,
          header: '@@ -1,3 +1,1 @@',
          changes: [
            {kind: 'deletion', string: '-0001\n-0002\n', range: [[1, 0], [2, Infinity]]},
          ],
        },
      );
    });

    it('returns a deletion when unstaging an entire addition patch', function() {
      const bufferText = '0000\n0001\n0002\n';
      const hunks = [
        new Hunk({
          oldStartRow: 1,
          oldRowCount: 0,
          newStartRow: 1,
          newRowCount: 3,
          rowRange: buildRange(0, 2),
          changes: [
            new Addition(buildRange(0, 2)),
          ],
        }),
      ];
      const patch = new Patch({status: 'added', hunks, bufferText});

      const unstagePatch0 = patch.getUnstagePatchForLines(new Set([0, 1, 2]));
      assert.strictEqual(unstagePatch0.getStatus(), 'deleted');

      const unstagePatch1 = patch.getFullUnstagedPatch();
      assert.strictEqual(unstagePatch1.getStatus(), 'deleted');
    });

    it('returns a nullPatch as a nullPatch', function() {
      assert.strictEqual(nullPatch.getUnstagePatchForLines(new Set([1, 2, 3])), nullPatch);
      assert.strictEqual(nullPatch.getFullUnstagedPatch(), nullPatch);
    });
  });

  describe('getFirstChangeRange', function() {
    it('accesses the range of the first change from the first hunk', function() {
      const patch = buildPatchFixture();
      assert.deepEqual(patch.getFirstChangeRange(), [[1, 0], [1, Infinity]]);
    });

    it('returns the origin if the first hunk is empty', function() {
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 0,
          rowRange: buildRange(0),
          changes: [],
        }),
      ];
      const patch = new Patch({status: 'modified', hunks, bufferText: ''});
      assert.deepEqual(patch.getFirstChangeRange(), [[0, 0], [0, 0]]);
    });

    it('returns the origin if the patch is empty', function() {
      const patch = new Patch({status: 'modified', hunks: [], bufferText: ''});
      assert.deepEqual(patch.getFirstChangeRange(), [[0, 0], [0, 0]]);
    });
  });

  describe('next selection range derivation', function() {
    it('selects the first change region after the highest buffer row', function() {
      const lastPatch = buildPatchFixture();
      // Selected:
      //  deletions (1-2) and partial addition (4 from 3-5) from hunk 0
      //  one deletion row (13 from 12-16) from the middle of hunk 1;
      //  nothing in hunks 2 or 3
      const lastSelectedRows = new Set([1, 2, 4, 5, 13]);

      const nBufferText =
        // 0   1     2     3     4
        '0000\n0003\n0004\n0005\n0006\n' +
        // 5   6     7     8     9     10    11    12    13    14   15
        '0007\n0008\n0009\n0010\n0011\n0012\n0014\n0015\n0016\n0017\n0018\n' +
        // 16  17    18    19    20
        '0019\n0020\n0021\n0022\n0023\n' +
        // 21  22     23
        '0024\n0025\n No newline at end of file\n';
      const nHunks = [
        new Hunk({
          oldStartRow: 3, oldRowCount: 3, newStartRow: 3, newRowCount: 5, // next row drift = +2
          rowRange: buildRange(0, 4), // context: 0, 2, 4
          changes: [
            new Addition(buildRange(1)), // + 1
            new Addition(buildRange(3)), // + 3
          ],
        }),
        new Hunk({
          oldStartRow: 12, oldRowCount: 9, newStartRow: 14, newRowCount: 7, // next row drift = +2 -2 = 0
          rowRange: buildRange(5, 15), // context: 5, 7, 8, 9, 15
          changes: [
            new Addition(buildRange(6)), // +6
            new Deletion(buildRange(10, 13)), // -10 -11 -12 -13
            new Addition(buildRange(14)), // +14
          ],
        }),
        new Hunk({
          oldStartRow: 26, oldRowCount: 4, newStartRow: 26, newRowCount: 3, // next row drift = 0 -1 = -1
          rowRange: buildRange(16, 20), // context: 16, 20
          changes: [
            new Addition(buildRange(17)), // +17
            new Deletion(buildRange(18, 19)), // -18 -19
          ],
        }),
        new Hunk({
          oldStartRow: 32, oldRowCount: 1, newStartRow: 31, newRowCount: 2,
          rowRange: buildRange(22, 24), // context: 22
          changes: [
            new Addition(buildRange(23)), // +23
            new NoNewline(buildRange(24)),
          ],
        }),
      ];
      const nextPatch = new Patch({status: 'modified', hunks: nHunks, bufferText: nBufferText});

      const nextRange = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
      // Original buffer row 14 = the next changed row = new buffer row 11
      assert.deepEqual(nextRange, [[11, 0], [11, Infinity]]);
    });

    it('offsets the chosen selection index by hunks that were completely selected', function() {
      const lastPatch = new Patch({
        status: 'modified',
        hunks: [
          new Hunk({
            oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 3,
            rowRange: buildRange(0, 5),
            changes: [
              new Addition(buildRange(1, 2)),
              new Deletion(buildRange(3, 4)),
            ],
          }),
          new Hunk({
            oldStartRow: 5, oldRowCount: 4, newStartRow: 5, newRowCount: 4,
            rowRange: buildRange(6, 11),
            changes: [
              new Addition(buildRange(7, 8)),
              new Deletion(buildRange(9, 10)),
            ],
          }),
        ],
        bufferText: '0000\n0001\n0002\n0003\n0004\n0005\n0006\n0007\n0008\n0009\n0010\n0011\n',
      });
      // Select:
      // * all changes from hunk 0
      // * partial addition (8 of 7-8) from hunk 1
      const lastSelectedRows = new Set([1, 2, 3, 4, 8]);

      const nextPatch = new Patch({
        status: 'modified',
        hunks: [
          new Hunk({
            oldStartRow: 5, oldRowCount: 4, newStartRow: 5, newRowCount: 4,
            rowRange: buildRange(0, 5),
            changes: [
              new Addition(buildRange(1, 1)),
              new Deletion(buildRange(3, 4)),
            ],
          }),
        ],
        bufferText: '0006\n0007\n0008\n0009\n0010\n0011\n',
      });

      const range = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
      assert.deepEqual(range, [[3, 0], [3, Infinity]]);
    });

    it('selects the first row of the first change of the patch if no rows were selected before', function() {
      const lastPatch = buildPatchFixture();
      const lastSelectedRows = new Set();

      const nextPatch = new Patch({
        status: 'modified',
        hunks: [
          new Hunk({
            oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 4,
            rowRange: buildRange(0, 4),
            changes: [
              new Addition(buildRange(1, 2)),
              new Deletion(buildRange(3, 3)),
            ],
          }),
        ],
      });

      const range = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
      assert.deepEqual(range, [[1, 0], [1, Infinity]]);
    });
  });

  it('prints itself as an apply-ready string', function() {
    const bufferText = '0000\n1111\n2222\n3333\n4444\n5555\n6666\n7777\n8888\n9999\n';
    // old: 0000.2222.3333.4444.5555.6666.7777.8888.9999.
    // new: 0000.1111.2222.3333.4444.5555.6666.9999.
    // patch buffer: 0000.1111.2222.3333.4444.5555.6666.7777.8888.9999.

    const hunk0 = new Hunk({
      oldStartRow: 0, newStartRow: 0, oldRowCount: 2, newRowCount: 3,
      sectionHeading: 'zero',
      rowRange: buildRange(0, 2),
      changes: [
        new Addition(buildRange(1)),
      ],
    });

    const hunk1 = new Hunk({
      oldStartRow: 5, newStartRow: 6, oldRowCount: 4, newRowCount: 2,
      sectionHeading: 'one',
      rowRange: buildRange(6, 9),
      changes: [
        new Deletion(buildRange(7, 8)),
      ],
    });

    const p = new Patch({status: 'modified', hunks: [hunk0, hunk1], bufferText});

    assert.strictEqual(p.toString(), [
      '@@ -0,2 +0,3 @@\n',
      ' 0000\n',
      '+1111\n',
      ' 2222\n',
      '@@ -5,4 +6,2 @@\n',
      ' 6666\n',
      '-7777\n',
      '-8888\n',
      ' 9999\n',
    ].join(''));
  });

  it('has a stubbed nullPatch counterpart', function() {
    assert.isNull(nullPatch.getStatus());
    assert.deepEqual(nullPatch.getHunks(), []);
    assert.strictEqual(nullPatch.getBufferText(), '');
    assert.strictEqual(nullPatch.getByteSize(), 0);
    assert.isFalse(nullPatch.isPresent());
    assert.strictEqual(nullPatch.toString(), '');
    assert.strictEqual(nullPatch.getChangedLineCount(), 0);
    assert.strictEqual(nullPatch.getMaxLineNumberWidth(), 0);
    assert.deepEqual(nullPatch.getFirstChangeRange(), [[0, 0], [0, 0]]);
    assert.deepEqual(nullPatch.getNextSelectionRange(), [[0, 0], [0, 0]]);
  });
});

function buildRange(startRow, endRow = startRow, rowLength = 5, endRowLength = rowLength) {
  return new IndexedRowRange({
    bufferRange: [[startRow, 0], [endRow, endRowLength - 1]],
    startOffset: startRow * rowLength,
    endOffset: endRow * rowLength + endRowLength,
  });
}

function buildPatchFixture() {
  const bufferText =
    '0000\n0001\n0002\n0003\n0004\n0005\n0006\n0007\n0008\n0009\n' +
    '0010\n0011\n0012\n0013\n0014\n0015\n0016\n0017\n0018\n0019\n' +
    '0020\n0021\n0022\n0023\n0024\n0025\n' +
    ' No newline at end of file\n';

  const hunks = [
    new Hunk({
      oldStartRow: 3, oldRowCount: 4, newStartRow: 3, newRowCount: 5,
      sectionHeading: 'zero',
      rowRange: buildRange(0, 6),
      changes: [
        new Deletion(buildRange(1, 2)),
        new Addition(buildRange(3, 5)),
      ],
    }),
    new Hunk({
      oldStartRow: 12, oldRowCount: 9, newStartRow: 13, newRowCount: 7,
      sectionHeading: 'one',
      rowRange: buildRange(7, 18),
      changes: [
        new Addition(buildRange(8, 9)),
        new Deletion(buildRange(12, 16)),
        new Addition(buildRange(17, 17)),
      ],
    }),
    new Hunk({
      oldStartRow: 26, oldRowCount: 4, newStartRow: 25, newRowCount: 3,
      sectionHeading: 'two',
      rowRange: buildRange(19, 23),
      changes: [
        new Addition(buildRange(20)),
        new Deletion(buildRange(21, 22)),
      ],
    }),
    new Hunk({
      oldStartRow: 32, oldRowCount: 1, newStartRow: 30, newRowCount: 2,
      sectionHeading: 'three',
      rowRange: buildRange(24, 26),
      changes: [
        new Addition(buildRange(25)),
        new NoNewline(buildRange(26, 26, 5, 27)),
      ],
    }),
  ];

  return new Patch({status: 'modified', hunks, bufferText});
}
