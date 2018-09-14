import {TextBuffer} from 'atom';

import Patch, {nullPatch} from '../../../lib/models/patch/patch';
import Hunk from '../../../lib/models/patch/hunk';
import {Unchanged, Addition, Deletion, NoNewline} from '../../../lib/models/patch/region';
import {assertInPatch} from '../../helpers';

describe('Patch', function() {
  it('has some standard accessors', function() {
    const buffer = new TextBuffer({text: 'bufferText'});
    const layers = buildLayers(buffer);
    const p = new Patch({status: 'modified', hunks: [], buffer, layers});
    assert.strictEqual(p.getStatus(), 'modified');
    assert.deepEqual(p.getHunks(), []);
    assert.strictEqual(p.getBuffer().getText(), 'bufferText');
    assert.isTrue(p.isPresent());

    assert.strictEqual(p.getUnchangedLayer().getMarkerCount(), 0);
    assert.strictEqual(p.getAdditionLayer().getMarkerCount(), 0);
    assert.strictEqual(p.getDeletionLayer().getMarkerCount(), 0);
    assert.strictEqual(p.getNoNewlineLayer().getMarkerCount(), 0);
  });

  it('computes the byte size of the total patch data', function() {
    const buffer = new TextBuffer({text: '\u00bd + \u00bc = \u00be'});
    const layers = buildLayers(buffer);
    const p = new Patch({status: 'modified', hunks: [], buffer, layers});
    assert.strictEqual(p.getByteSize(), 12);
  });

  it('computes the total changed line count', function() {
    const buffer = buildBuffer(15);
    const layers = buildLayers(buffer);
    const hunks = [
      new Hunk({
        oldStartRow: 0, newStartRow: 0, oldRowCount: 1, newRowCount: 1,
        sectionHeading: 'zero',
        marker: markRange(layers.hunk, 0, 5),
        regions: [
          new Unchanged(markRange(layers.unchanged, 0)),
          new Addition(markRange(layers.addition, 1)),
          new Unchanged(markRange(layers.unchanged, 2)),
          new Deletion(markRange(layers.deletion, 3, 4)),
          new Unchanged(markRange(layers.unchanged, 5)),
        ],
      }),
      new Hunk({
        oldStartRow: 0, newStartRow: 0, oldRowCount: 1, newRowCount: 1,
        sectionHeading: 'one',
        marker: markRange(layers.hunk, 6, 15),
        regions: [
          new Unchanged(markRange(layers.unchanged, 6)),
          new Deletion(markRange(layers.deletion, 7)),
          new Unchanged(markRange(layers.unchanged, 8)),
          new Deletion(markRange(layers.deletion, 9, 11)),
          new Addition(markRange(layers.addition, 12, 14)),
          new Unchanged(markRange(layers.unchanged, 15)),
        ],
      }),
    ];
    const p = new Patch({status: 'modified', hunks, buffer, layers});

    assert.strictEqual(p.getChangedLineCount(), 10);
  });

  it('computes the maximum number of digits needed to display a diff line number', function() {
    const buffer = buildBuffer(15);
    const layers = buildLayers(buffer);
    const hunks = [
      new Hunk({
        oldStartRow: 0, oldRowCount: 1, newStartRow: 0, newRowCount: 1,
        sectionHeading: 'zero',
        marker: markRange(layers.hunk, 0, 5),
        regions: [],
      }),
      new Hunk({
        oldStartRow: 98,
        oldRowCount: 5,
        newStartRow: 95,
        newRowCount: 3,
        sectionHeading: 'one',
        marker: markRange(layers.hunk, 6, 15),
        regions: [],
      }),
    ];
    const p0 = new Patch({status: 'modified', hunks, buffer, layers});
    assert.strictEqual(p0.getMaxLineNumberWidth(), 3);

    const p1 = new Patch({status: 'deleted', hunks: [], buffer, layers});
    assert.strictEqual(p1.getMaxLineNumberWidth(), 0);
  });

  it('clones itself with optionally overridden properties', function() {
    const buffer = new TextBuffer({text: 'bufferText'});
    const layers = buildLayers(buffer);
    const original = new Patch({status: 'modified', hunks: [], buffer, layers});

    const dup0 = original.clone();
    assert.notStrictEqual(dup0, original);
    assert.strictEqual(dup0.getStatus(), 'modified');
    assert.deepEqual(dup0.getHunks(), []);
    assert.strictEqual(dup0.getBuffer().getText(), 'bufferText');

    const dup1 = original.clone({status: 'added'});
    assert.notStrictEqual(dup1, original);
    assert.strictEqual(dup1.getStatus(), 'added');
    assert.deepEqual(dup1.getHunks(), []);
    assert.strictEqual(dup1.getBuffer().getText(), 'bufferText');

    const hunks = [new Hunk({regions: []})];
    const dup2 = original.clone({hunks});
    assert.notStrictEqual(dup2, original);
    assert.strictEqual(dup2.getStatus(), 'modified');
    assert.deepEqual(dup2.getHunks(), hunks);
    assert.strictEqual(dup2.getBuffer().getText(), 'bufferText');

    const nBuffer = new TextBuffer({text: 'changed'});
    const nLayers = buildLayers(nBuffer);
    const dup3 = original.clone({buffer: nBuffer, layers: nLayers});
    assert.notStrictEqual(dup3, original);
    assert.strictEqual(dup3.getStatus(), 'modified');
    assert.deepEqual(dup3.getHunks(), []);
    assert.strictEqual(dup3.getBuffer().getText(), 'changed');
  });

  it('clones a nullPatch as a nullPatch', function() {
    assert.strictEqual(nullPatch, nullPatch.clone());
  });

  it('clones a nullPatch to a real Patch if properties are provided', function() {
    const dup0 = nullPatch.clone({status: 'added'});
    assert.notStrictEqual(dup0, nullPatch);
    assert.strictEqual(dup0.getStatus(), 'added');
    assert.deepEqual(dup0.getHunks(), []);
    assert.strictEqual(dup0.getBuffer().getText(), '');

    const hunks = [new Hunk({regions: []})];
    const dup1 = nullPatch.clone({hunks});
    assert.notStrictEqual(dup1, nullPatch);
    assert.isNull(dup1.getStatus());
    assert.deepEqual(dup1.getHunks(), hunks);
    assert.strictEqual(dup1.getBuffer().getText(), '');

    const nBuffer = new TextBuffer({text: 'changed'});
    const nLayers = buildLayers(nBuffer);
    const dup2 = nullPatch.clone({buffer: nBuffer, layers: nLayers});
    assert.notStrictEqual(dup2, nullPatch);
    assert.isNull(dup2.getStatus());
    assert.deepEqual(dup2.getHunks(), []);
    assert.strictEqual(dup2.getBuffer().getText(), 'changed');
  });

  describe('stage patch generation', function() {
    it('creates a patch that applies selected lines from only the first hunk', function() {
      const patch = buildPatchFixture();
      const stagePatch = patch.getStagePatchForLines(new Set([2, 3, 4, 5]));
      // buffer rows:             0     1     2     3     4     5     6
      const expectedBufferText = '0000\n0001\n0002\n0003\n0004\n0005\n0006\n';
      assert.strictEqual(stagePatch.getBuffer().getText(), expectedBufferText);
      assertInPatch(stagePatch).hunks(
        {
          startRow: 0,
          endRow: 6,
          header: '@@ -3,4 +3,6 @@',
          regions: [
            {kind: 'unchanged', string: ' 0000\n 0001', range: [[0, 0], [1, 4]]},
            {kind: 'deletion', string: '-0002', range: [[2, 0], [2, 4]]},
            {kind: 'addition', string: '+0003\n+0004\n+0005', range: [[3, 0], [5, 4]]},
            {kind: 'unchanged', string: ' 0006', range: [[6, 0], [6, 4]]},
          ],
        },
      );
    });

    it('creates a patch that applies selected lines from a single non-first hunk', function() {
      const patch = buildPatchFixture();
      const stagePatch = patch.getStagePatchForLines(new Set([8, 13, 14, 16]));
      // buffer rows:             0     1     2     3     4     5     6     7     8     9
      const expectedBufferText = '0007\n0008\n0010\n0011\n0012\n0013\n0014\n0015\n0016\n0018\n';
      assert.strictEqual(stagePatch.getBuffer().getText(), expectedBufferText);
      assertInPatch(stagePatch).hunks(
        {
          startRow: 0,
          endRow: 9,
          header: '@@ -12,9 +12,7 @@',
          regions: [
            {kind: 'unchanged', string: ' 0007', range: [[0, 0], [0, 4]]},
            {kind: 'addition', string: '+0008', range: [[1, 0], [1, 4]]},
            {kind: 'unchanged', string: ' 0010\n 0011\n 0012', range: [[2, 0], [4, 4]]},
            {kind: 'deletion', string: '-0013\n-0014', range: [[5, 0], [6, 4]]},
            {kind: 'unchanged', string: ' 0015', range: [[7, 0], [7, 4]]},
            {kind: 'deletion', string: '-0016', range: [[8, 0], [8, 4]]},
            {kind: 'unchanged', string: ' 0018', range: [[9, 0], [9, 4]]},
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
      assert.strictEqual(stagePatch.getBuffer().getText(), expectedBufferText);
      assertInPatch(stagePatch).hunks(
        {
          startRow: 0,
          endRow: 4,
          header: '@@ -3,4 +3,4 @@',
          regions: [
            {kind: 'unchanged', string: ' 0000', range: [[0, 0], [0, 4]]},
            {kind: 'deletion', string: '-0001', range: [[1, 0], [1, 4]]},
            {kind: 'unchanged', string: ' 0002', range: [[2, 0], [2, 4]]},
            {kind: 'addition', string: '+0005', range: [[3, 0], [3, 4]]},
            {kind: 'unchanged', string: ' 0006', range: [[4, 0], [4, 4]]},
          ],
        },
        {
          startRow: 5,
          endRow: 14,
          header: '@@ -12,9 +12,8 @@',
          regions: [
            {kind: 'unchanged', string: ' 0007\n 0010\n 0011\n 0012\n 0013\n 0014', range: [[5, 0], [10, 4]]},
            {kind: 'deletion', string: '-0015\n-0016', range: [[11, 0], [12, 4]]},
            {kind: 'addition', string: '+0017', range: [[13, 0], [13, 4]]},
            {kind: 'unchanged', string: ' 0018', range: [[14, 0], [14, 4]]},
          ],
        },
        {
          startRow: 15,
          endRow: 17,
          header: '@@ -32,1 +31,2 @@',
          regions: [
            {kind: 'unchanged', string: ' 0024', range: [[15, 0], [15, 4]]},
            {kind: 'addition', string: '+0025', range: [[16, 0], [16, 4]]},
            {kind: 'nonewline', string: '\\ No newline at end of file', range: [[17, 0], [17, 26]]},
          ],
        },
      );
    });

    it('marks ranges for each change region on the correct marker layer', function() {
      const patch = buildPatchFixture();
      const stagePatch = patch.getStagePatchForLines(new Set([1, 5, 15, 16, 17, 25]));

      const layerRanges = [
        ['hunk', stagePatch.getHunkLayer()],
        ['unchanged', stagePatch.getUnchangedLayer()],
        ['addition', stagePatch.getAdditionLayer()],
        ['deletion', stagePatch.getDeletionLayer()],
        ['noNewline', stagePatch.getNoNewlineLayer()],
      ].reduce((obj, [key, layer]) => {
        obj[key] = layer.getMarkers().map(marker => marker.getRange().serialize());
        return obj;
      }, {});

      assert.deepEqual(layerRanges, {
        hunk: [
          [[0, 0], [4, 4]],
          [[5, 0], [14, 4]],
          [[15, 0], [17, 26]],
        ],
        unchanged: [
          [[0, 0], [0, 4]],
          [[2, 0], [2, 4]],
          [[4, 0], [4, 4]],
          [[5, 0], [10, 4]],
          [[14, 0], [14, 4]],
          [[15, 0], [15, 4]],
        ],
        addition: [
          [[3, 0], [3, 4]],
          [[13, 0], [13, 4]],
          [[16, 0], [16, 4]],
        ],
        deletion: [
          [[1, 0], [1, 4]],
          [[11, 0], [12, 4]],
        ],
        noNewline: [
          [[17, 0], [17, 26]],
        ],
      });
    });

    it('returns a modification patch if original patch is a deletion', function() {
      const buffer = new TextBuffer({text: 'line-0\nline-1\nline-2\nline-3\nline-4\nline-5\n'});
      const layers = buildLayers(buffer);
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 5, newStartRow: 1, newRowCount: 0,
          sectionHeading: 'zero',
          marker: markRange(layers.hunk, 0, 5),
          regions: [
            new Deletion(markRange(layers.deletion, 0, 5)),
          ],
        }),
      ];

      const patch = new Patch({status: 'deleted', hunks, buffer, layers});

      const stagedPatch = patch.getStagePatchForLines(new Set([1, 3, 4]));
      assert.strictEqual(stagedPatch.getStatus(), 'modified');
      assertInPatch(stagedPatch).hunks(
        {
          startRow: 0,
          endRow: 5,
          header: '@@ -1,5 +1,3 @@',
          regions: [
            {kind: 'unchanged', string: ' line-0', range: [[0, 0], [0, 6]]},
            {kind: 'deletion', string: '-line-1', range: [[1, 0], [1, 6]]},
            {kind: 'unchanged', string: ' line-2', range: [[2, 0], [2, 6]]},
            {kind: 'deletion', string: '-line-3\n-line-4', range: [[3, 0], [4, 6]]},
            {kind: 'unchanged', string: ' line-5', range: [[5, 0], [5, 6]]},
          ],
        },
      );
    });

    it('returns an deletion when staging an entire deletion patch', function() {
      const buffer = new TextBuffer({text: '0000\n0001\n0002\n'});
      const layers = buildLayers(buffer);
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 0,
          marker: markRange(layers.hunk, 0, 2),
          regions: [
            new Deletion(markRange(layers.deletion, 0, 2)),
          ],
        }),
      ];
      const patch = new Patch({status: 'deleted', hunks, buffer, layers});

      const stagePatch0 = patch.getStagePatchForLines(new Set([0, 1, 2]));
      assert.strictEqual(stagePatch0.getStatus(), 'deleted');
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
        unstagePatch.getBuffer().getText(),
        // 0   1     2     3     4     5     6     7     8
        '0007\n0008\n0009\n0010\n0011\n0012\n0013\n0017\n0018\n',
      );
      assertInPatch(unstagePatch).hunks(
        {
          startRow: 0,
          endRow: 8,
          header: '@@ -13,7 +13,8 @@',
          regions: [
            {kind: 'unchanged', string: ' 0007', range: [[0, 0], [0, 4]]},
            {kind: 'deletion', string: '-0008', range: [[1, 0], [1, 4]]},
            {kind: 'unchanged', string: ' 0009\n 0010\n 0011', range: [[2, 0], [4, 4]]},
            {kind: 'addition', string: '+0012\n+0013', range: [[5, 0], [6, 4]]},
            {kind: 'unchanged', string: ' 0017\n 0018', range: [[7, 0], [8, 4]]},
          ],
        },
      );
    });

    it('creates a patch that updates the index to unapply lines from several hunks', function() {
      const patch = buildPatchFixture();
      const unstagePatch = patch.getUnstagePatchForLines(new Set([1, 4, 5, 16, 17, 20, 25]));
      assert.strictEqual(
        unstagePatch.getBuffer().getText(),
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
          regions: [
            {kind: 'unchanged', string: ' 0000', range: [[0, 0], [0, 4]]},
            {kind: 'addition', string: '+0001', range: [[1, 0], [1, 4]]},
            {kind: 'unchanged', string: ' 0003', range: [[2, 0], [2, 4]]},
            {kind: 'deletion', string: '-0004\n-0005', range: [[3, 0], [4, 4]]},
            {kind: 'unchanged', string: ' 0006', range: [[5, 0], [5, 4]]},
          ],
        },
        {
          startRow: 6,
          endRow: 13,
          header: '@@ -13,7 +12,7 @@',
          regions: [
            {kind: 'unchanged', string: ' 0007\n 0008\n 0009\n 0010\n 0011', range: [[6, 0], [10, 4]]},
            {kind: 'addition', string: '+0016', range: [[11, 0], [11, 4]]},
            {kind: 'deletion', string: '-0017', range: [[12, 0], [12, 4]]},
            {kind: 'unchanged', string: ' 0018', range: [[13, 0], [13, 4]]},
          ],
        },
        {
          startRow: 14,
          endRow: 16,
          header: '@@ -25,3 +24,2 @@',
          regions: [
            {kind: 'unchanged', string: ' 0019', range: [[14, 0], [14, 4]]},
            {kind: 'deletion', string: '-0020', range: [[15, 0], [15, 4]]},
            {kind: 'unchanged', string: ' 0023', range: [[16, 0], [16, 4]]},
          ],
        },
        {
          startRow: 17,
          endRow: 19,
          header: '@@ -30,2 +28,1 @@',
          regions: [
            {kind: 'unchanged', string: ' 0024', range: [[17, 0], [17, 4]]},
            {kind: 'deletion', string: '-0025', range: [[18, 0], [18, 4]]},
            {kind: 'nonewline', string: '\\ No newline at end of file', range: [[19, 0], [19, 26]]},
          ],
        },
      );
    });

    it('marks ranges for each change region on the correct marker layer', function() {
      const patch = buildPatchFixture();
      const unstagePatch = patch.getUnstagePatchForLines(new Set([1, 4, 5, 16, 17, 20, 25]));

      const layerRanges = [
        ['hunk', unstagePatch.getHunkLayer()],
        ['unchanged', unstagePatch.getUnchangedLayer()],
        ['addition', unstagePatch.getAdditionLayer()],
        ['deletion', unstagePatch.getDeletionLayer()],
        ['noNewline', unstagePatch.getNoNewlineLayer()],
      ].reduce((obj, [key, layer]) => {
        obj[key] = layer.getMarkers().map(marker => marker.getRange().serialize());
        return obj;
      }, {});

      assert.deepEqual(layerRanges, {
        hunk: [
          [[0, 0], [5, 4]],
          [[6, 0], [13, 4]],
          [[14, 0], [16, 4]],
          [[17, 0], [19, 26]],
        ],
        unchanged: [
          [[0, 0], [0, 4]],
          [[2, 0], [2, 4]],
          [[5, 0], [5, 4]],
          [[6, 0], [10, 4]],
          [[13, 0], [13, 4]],
          [[14, 0], [14, 4]],
          [[16, 0], [16, 4]],
          [[17, 0], [17, 4]],
        ],
        addition: [
          [[1, 0], [1, 4]],
          [[11, 0], [11, 4]],
        ],
        deletion: [
          [[3, 0], [4, 4]],
          [[12, 0], [12, 4]],
          [[15, 0], [15, 4]],
          [[18, 0], [18, 4]],
        ],
        noNewline: [
          [[19, 0], [19, 26]],
        ],
      });
    });

    it('unstages an entire patch at once', function() {
      const patch = buildPatchFixture();
      const unstagedPatch = patch.getFullUnstagedPatch();

      assert.strictEqual(unstagedPatch.getBuffer().getText(), patch.getBuffer().getText());
      assertInPatch(unstagedPatch).hunks(
        {
          startRow: 0,
          endRow: 6,
          header: '@@ -3,5 +3,4 @@',
          regions: [
            {kind: 'unchanged', string: ' 0000', range: [[0, 0], [0, 4]]},
            {kind: 'addition', string: '+0001\n+0002', range: [[1, 0], [2, 4]]},
            {kind: 'deletion', string: '-0003\n-0004\n-0005', range: [[3, 0], [5, 4]]},
            {kind: 'unchanged', string: ' 0006', range: [[6, 0], [6, 4]]},
          ],
        },
        {
          startRow: 7,
          endRow: 18,
          header: '@@ -13,7 +12,9 @@',
          regions: [
            {kind: 'unchanged', string: ' 0007', range: [[7, 0], [7, 4]]},
            {kind: 'deletion', string: '-0008\n-0009', range: [[8, 0], [9, 4]]},
            {kind: 'unchanged', string: ' 0010\n 0011', range: [[10, 0], [11, 4]]},
            {kind: 'addition', string: '+0012\n+0013\n+0014\n+0015\n+0016', range: [[12, 0], [16, 4]]},
            {kind: 'deletion', string: '-0017', range: [[17, 0], [17, 4]]},
            {kind: 'unchanged', string: ' 0018', range: [[18, 0], [18, 4]]},
          ],
        },
        {
          startRow: 19,
          endRow: 23,
          header: '@@ -25,3 +26,4 @@',
          regions: [
            {kind: 'unchanged', string: ' 0019', range: [[19, 0], [19, 4]]},
            {kind: 'deletion', string: '-0020', range: [[20, 0], [20, 4]]},
            {kind: 'addition', string: '+0021\n+0022', range: [[21, 0], [22, 4]]},
            {kind: 'unchanged', string: ' 0023', range: [[23, 0], [23, 4]]},
          ],
        },
        {
          startRow: 24,
          endRow: 26,
          header: '@@ -30,2 +32,1 @@',
          regions: [
            {kind: 'unchanged', string: ' 0024', range: [[24, 0], [24, 4]]},
            {kind: 'deletion', string: '-0025', range: [[25, 0], [25, 4]]},
            {kind: 'nonewline', string: '\\ No newline at end of file', range: [[26, 0], [26, 26]]},
          ],
        },
      );
    });

    it('returns a modification if original patch is an addition', function() {
      const buffer = new TextBuffer({text: '0000\n0001\n0002\n'});
      const layers = buildLayers(buffer);
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 3,
          marker: markRange(layers.hunk, 0, 2),
          regions: [
            new Addition(markRange(layers.addition, 0, 2)),
          ],
        }),
      ];
      const patch = new Patch({status: 'added', hunks, buffer, layers});
      const unstagePatch = patch.getUnstagePatchForLines(new Set([1, 2]));
      assert.strictEqual(unstagePatch.getStatus(), 'modified');
      assert.strictEqual(unstagePatch.getBuffer().getText(), '0000\n0001\n0002\n');
      assertInPatch(unstagePatch).hunks(
        {
          startRow: 0,
          endRow: 2,
          header: '@@ -1,3 +1,1 @@',
          regions: [
            {kind: 'unchanged', string: ' 0000', range: [[0, 0], [0, 4]]},
            {kind: 'deletion', string: '-0001\n-0002', range: [[1, 0], [2, 4]]},
          ],
        },
      );
    });

    it('returns a deletion when unstaging an entire addition patch', function() {
      const buffer = new TextBuffer({text: '0000\n0001\n0002\n'});
      const layers = buildLayers(buffer);
      const hunks = [
        new Hunk({
          oldStartRow: 1,
          oldRowCount: 0,
          newStartRow: 1,
          newRowCount: 3,
          marker: markRange(layers.hunk, 0, 2),
          regions: [
            new Addition(markRange(layers.addition, 0, 2)),
          ],
        }),
      ];
      const patch = new Patch({status: 'added', hunks, buffer, layers});

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
      const buffer = new TextBuffer({text: ''});
      const layers = buildLayers(buffer);
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 0,
          marker: markRange(layers.hunk, 0),
          regions: [],
        }),
      ];
      const patch = new Patch({status: 'modified', hunks, buffer, layers});
      assert.deepEqual(patch.getFirstChangeRange(), [[0, 0], [0, 0]]);
    });

    it('returns the origin if the patch is empty', function() {
      const buffer = new TextBuffer({text: ''});
      const layers = buildLayers(buffer);
      const patch = new Patch({status: 'modified', hunks: [], buffer, layers});
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

      const nBuffer = new TextBuffer({text:
        // 0   1     2     3     4
        '0000\n0003\n0004\n0005\n0006\n' +
        // 5   6     7     8     9     10    11    12    13    14   15
        '0007\n0008\n0009\n0010\n0011\n0012\n0014\n0015\n0016\n0017\n0018\n' +
        // 16  17    18    19    20
        '0019\n0020\n0021\n0022\n0023\n' +
        // 21  22     23
        '0024\n0025\n No newline at end of file\n',
      });
      const nLayers = buildLayers(nBuffer);
      const nHunks = [
        new Hunk({
          oldStartRow: 3, oldRowCount: 3, newStartRow: 3, newRowCount: 5, // next row drift = +2
          marker: markRange(nLayers.hunk, 0, 4),
          regions: [
            new Unchanged(markRange(nLayers.unchanged, 0)), // 0
            new Addition(markRange(nLayers.addition, 1)), // + 1
            new Unchanged(markRange(nLayers.unchanged, 2)), // 2
            new Addition(markRange(nLayers.addition, 3)), // + 3
            new Unchanged(markRange(nLayers.unchanged, 4)), // 4
          ],
        }),
        new Hunk({
          oldStartRow: 12, oldRowCount: 9, newStartRow: 14, newRowCount: 7, // next row drift = +2 -2 = 0
          marker: markRange(nLayers.hunk, 5, 15),
          regions: [
            new Unchanged(markRange(nLayers.unchanged, 5)), // 5
            new Addition(markRange(nLayers.addition, 6)), // +6
            new Unchanged(markRange(nLayers.unchanged, 7, 9)), // 7 8 9
            new Deletion(markRange(nLayers.deletion, 10, 13)), // -10 -11 -12 -13
            new Addition(markRange(nLayers.addition, 14)), // +14
            new Unchanged(markRange(nLayers.unchanged, 15)), // 15
          ],
        }),
        new Hunk({
          oldStartRow: 26, oldRowCount: 4, newStartRow: 26, newRowCount: 3, // next row drift = 0 -1 = -1
          marker: markRange(nLayers.hunk, 16, 20),
          regions: [
            new Unchanged(markRange(nLayers.unchanged, 16)), // 16
            new Addition(markRange(nLayers.addition, 17)), // +17
            new Deletion(markRange(nLayers.deletion, 18, 19)), // -18 -19
            new Unchanged(markRange(nLayers.unchanged, 20)), // 20
          ],
        }),
        new Hunk({
          oldStartRow: 32, oldRowCount: 1, newStartRow: 31, newRowCount: 2,
          marker: markRange(nLayers.hunk, 22, 24),
          regions: [
            new Unchanged(markRange(nLayers.unchanged, 22)), // 22
            new Addition(markRange(nLayers.addition, 23)), // +23
            new NoNewline(markRange(nLayers.noNewline, 24)),
          ],
        }),
      ];
      const nextPatch = new Patch({status: 'modified', hunks: nHunks, buffer: nBuffer, layers: nLayers});

      const nextRange = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
      // Original buffer row 14 = the next changed row = new buffer row 11
      assert.deepEqual(nextRange, [[11, 0], [11, Infinity]]);
    });

    it('offsets the chosen selection index by hunks that were completely selected', function() {
      const buffer = buildBuffer(11);
      const layers = buildLayers(buffer);
      const lastPatch = new Patch({
        status: 'modified',
        hunks: [
          new Hunk({
            oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 3,
            marker: markRange(layers.hunk, 0, 5),
            regions: [
              new Unchanged(markRange(layers.unchanged, 0)),
              new Addition(markRange(layers.addition, 1, 2)),
              new Deletion(markRange(layers.deletion, 3, 4)),
              new Unchanged(markRange(layers.unchanged, 5)),
            ],
          }),
          new Hunk({
            oldStartRow: 5, oldRowCount: 4, newStartRow: 5, newRowCount: 4,
            marker: markRange(layers.hunk, 6, 11),
            regions: [
              new Unchanged(markRange(layers.unchanged, 6)),
              new Addition(markRange(layers.addition, 7, 8)),
              new Deletion(markRange(layers.deletion, 9, 10)),
              new Unchanged(markRange(layers.unchanged, 11)),
            ],
          }),
        ],
        buffer,
        layers,
      });
      // Select:
      // * all changes from hunk 0
      // * partial addition (8 of 7-8) from hunk 1
      const lastSelectedRows = new Set([1, 2, 3, 4, 8]);

      const nextBuffer = new TextBuffer({text: '0006\n0007\n0008\n0009\n0010\n0011\n'});
      const nextLayers = buildLayers(nextBuffer);
      const nextPatch = new Patch({
        status: 'modified',
        hunks: [
          new Hunk({
            oldStartRow: 5, oldRowCount: 4, newStartRow: 5, newRowCount: 4,
            marker: markRange(nextLayers.hunk, 0, 5),
            regions: [
              new Unchanged(markRange(nextLayers.unchanged, 0)),
              new Addition(markRange(nextLayers.addition, 1)),
              new Deletion(markRange(nextLayers.deletion, 3, 4)),
              new Unchanged(markRange(nextLayers.unchanged, 5)),
            ],
          }),
        ],
        buffer: nextBuffer,
        layers: nextLayers,
      });

      const range = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
      assert.deepEqual(range, [[3, 0], [3, Infinity]]);
    });

    it('selects the first row of the first change of the patch if no rows were selected before', function() {
      const lastPatch = buildPatchFixture();
      const lastSelectedRows = new Set();

      const buffer = lastPatch.getBuffer();
      const layers = buildLayers(buffer);
      const nextPatch = new Patch({
        status: 'modified',
        hunks: [
          new Hunk({
            oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 4,
            marker: markRange(layers.hunk, 0, 4),
            regions: [
              new Unchanged(markRange(layers.unchanged, 0)),
              new Addition(markRange(layers.addition, 1, 2)),
              new Deletion(markRange(layers.deletion, 3)),
              new Unchanged(markRange(layers.unchanged, 4)),
            ],
          }),
        ],
        buffer,
        layers,
      });

      const range = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
      assert.deepEqual(range, [[1, 0], [1, Infinity]]);
    });
  });

  it('prints itself as an apply-ready string', function() {
    const buffer = buildBuffer(10);
    const layers = buildLayers(buffer);

    const hunk0 = new Hunk({
      oldStartRow: 0, newStartRow: 0, oldRowCount: 2, newRowCount: 3,
      sectionHeading: 'zero',
      marker: markRange(layers.hunk, 0, 2),
      regions: [
        new Unchanged(markRange(layers.unchanged, 0)),
        new Addition(markRange(layers.addition, 1)),
        new Unchanged(markRange(layers.unchanged, 2)),
      ],
    });

    const hunk1 = new Hunk({
      oldStartRow: 5, newStartRow: 6, oldRowCount: 4, newRowCount: 2,
      sectionHeading: 'one',
      marker: markRange(layers.hunk, 6, 9),
      regions: [
        new Unchanged(markRange(layers.unchanged, 6)),
        new Deletion(markRange(layers.deletion, 7, 8)),
        new Unchanged(markRange(layers.unchanged, 9)),
      ],
    });

    const p = new Patch({status: 'modified', hunks: [hunk0, hunk1], buffer, layers});

    assert.strictEqual(p.toString(), [
      '@@ -0,2 +0,3 @@\n',
      ' 0000\n',
      '+0001\n',
      ' 0002\n',
      '@@ -5,4 +6,2 @@\n',
      ' 0006\n',
      '-0007\n',
      '-0008\n',
      ' 0009\n',
    ].join(''));
  });

  it('has a stubbed nullPatch counterpart', function() {
    assert.isNull(nullPatch.getStatus());
    assert.deepEqual(nullPatch.getHunks(), []);
    assert.strictEqual(nullPatch.getBuffer().getText(), '');
    assert.strictEqual(nullPatch.getByteSize(), 0);
    assert.isFalse(nullPatch.isPresent());
    assert.strictEqual(nullPatch.toString(), '');
    assert.strictEqual(nullPatch.getChangedLineCount(), 0);
    assert.strictEqual(nullPatch.getMaxLineNumberWidth(), 0);
    assert.deepEqual(nullPatch.getFirstChangeRange(), [[0, 0], [0, 0]]);
    assert.deepEqual(nullPatch.getNextSelectionRange(), [[0, 0], [0, 0]]);
  });

  it('adopts a buffer from a previous patch', function() {
    const patch0 = buildPatchFixture();
    const buffer0 = patch0.getBuffer();
    const hunkLayer0 = patch0.getHunkLayer();
    const unchangedLayer0 = patch0.getUnchangedLayer();
    const additionLayer0 = patch0.getAdditionLayer();
    const deletionLayer0 = patch0.getDeletionLayer();
    const noNewlineLayer0 = patch0.getNoNewlineLayer();

    const buffer1 = new TextBuffer({text: '0000\n0001\n0002\n0003\n0004\n No newline at end of file'});
    const layers1 = buildLayers(buffer1);
    const hunks1 = [
      new Hunk({
        oldStartRow: 1, oldRowCount: 2, newStartRow: 1, newRowCount: 3,
        sectionHeading: '0',
        marker: markRange(layers1.hunk, 0, 2),
        regions: [
          new Unchanged(markRange(layers1.unchanged, 0)),
          new Addition(markRange(layers1.addition, 1)),
          new Unchanged(markRange(layers1.unchanged, 2)),
        ],
      }),
      new Hunk({
        oldStartRow: 5, oldRowCount: 2, newStartRow: 1, newRowCount: 3,
        sectionHeading: '0',
        marker: markRange(layers1.hunk, 3, 5),
        regions: [
          new Unchanged(markRange(layers1.unchanged, 3)),
          new Deletion(markRange(layers1.deletion, 4)),
          new NoNewline(markRange(layers1.noNewline, 5)),
        ],
      }),
    ];

    const patch1 = new Patch({status: 'modified', hunks: hunks1, buffer: buffer1, layers: layers1});

    assert.notStrictEqual(patch1.getBuffer(), patch0.getBuffer());
    assert.notStrictEqual(patch1.getHunkLayer(), hunkLayer0);
    assert.notStrictEqual(patch1.getUnchangedLayer(), unchangedLayer0);
    assert.notStrictEqual(patch1.getAdditionLayer(), additionLayer0);
    assert.notStrictEqual(patch1.getDeletionLayer(), deletionLayer0);
    assert.notStrictEqual(patch1.getNoNewlineLayer(), noNewlineLayer0);

    patch1.adoptBufferFrom(patch0);

    assert.strictEqual(patch1.getBuffer(), buffer0);

    const markerRanges = [
      ['hunk', patch1.getHunkLayer(), hunkLayer0],
      ['unchanged', patch1.getUnchangedLayer(), unchangedLayer0],
      ['addition', patch1.getAdditionLayer(), additionLayer0],
      ['deletion', patch1.getDeletionLayer(), deletionLayer0],
      ['noNewline', patch1.getNoNewlineLayer(), noNewlineLayer0],
    ].reduce((obj, [key, layer1, layer0]) => {
      assert.strictEqual(layer1, layer0, `Layer ${key} not inherited`);
      obj[key] = layer1.getMarkers().map(marker => marker.getRange().serialize());
      return obj;
    }, {});

    assert.deepEqual(markerRanges, {
      hunk: [
        [[0, 0], [2, 4]],
        [[3, 0], [5, 26]],
      ],
      unchanged: [
        [[0, 0], [0, 4]],
        [[2, 0], [2, 4]],
        [[3, 0], [3, 4]],
      ],
      addition: [
        [[1, 0], [1, 4]],
      ],
      deletion: [
        [[4, 0], [4, 4]],
      ],
      noNewline: [
        [[5, 0], [5, 26]],
      ],
    });
  });
});

function buildBuffer(lines, noNewline = false) {
  const buffer = new TextBuffer();
  for (let i = 0; i < lines; i++) {
    const iStr = i.toString(10);
    let padding = '';
    for (let p = iStr.length; p < 4; p++) {
      padding += '0';
    }
    buffer.append(padding);
    buffer.append(iStr);
    buffer.append('\n');
  }
  if (noNewline) {
    buffer.append(' No newline at end of file\n');
  }
  return buffer;
}

function buildLayers(buffer) {
  return {
    hunk: buffer.addMarkerLayer(),
    unchanged: buffer.addMarkerLayer(),
    addition: buffer.addMarkerLayer(),
    deletion: buffer.addMarkerLayer(),
    noNewline: buffer.addMarkerLayer(),
  };
}

function markRange(buffer, start, end = start) {
  return buffer.markRange([[start, 0], [end, Infinity]]);
}

function buildPatchFixture() {
  const buffer = buildBuffer(26, true);
  const layers = buildLayers(buffer);

  const hunks = [
    new Hunk({
      oldStartRow: 3, oldRowCount: 4, newStartRow: 3, newRowCount: 5,
      sectionHeading: 'zero',
      marker: markRange(layers.hunk, 0, 6),
      regions: [
        new Unchanged(markRange(layers.unchanged, 0)),
        new Deletion(markRange(layers.deletion, 1, 2)),
        new Addition(markRange(layers.addition, 3, 5)),
        new Unchanged(markRange(layers.unchanged, 6)),
      ],
    }),
    new Hunk({
      oldStartRow: 12, oldRowCount: 9, newStartRow: 13, newRowCount: 7,
      sectionHeading: 'one',
      marker: markRange(layers.hunk, 7, 18),
      regions: [
        new Unchanged(markRange(layers.unchanged, 7)),
        new Addition(markRange(layers.addition, 8, 9)),
        new Unchanged(markRange(layers.unchanged, 10, 11)),
        new Deletion(markRange(layers.deletion, 12, 16)),
        new Addition(markRange(layers.addition, 17, 17)),
        new Unchanged(markRange(layers.unchanged, 18)),
      ],
    }),
    new Hunk({
      oldStartRow: 26, oldRowCount: 4, newStartRow: 25, newRowCount: 3,
      sectionHeading: 'two',
      marker: markRange(layers.hunk, 19, 23),
      regions: [
        new Unchanged(markRange(layers.unchanged, 19)),
        new Addition(markRange(layers.addition, 20)),
        new Deletion(markRange(layers.deletion, 21, 22)),
        new Unchanged(markRange(layers.unchanged, 23)),
      ],
    }),
    new Hunk({
      oldStartRow: 32, oldRowCount: 1, newStartRow: 30, newRowCount: 2,
      sectionHeading: 'three',
      marker: markRange(layers.hunk, 24, 26),
      regions: [
        new Unchanged(markRange(layers.unchanged, 24)),
        new Addition(markRange(layers.addition, 25)),
        new NoNewline(markRange(layers.noNewline, 26)),
      ],
    }),
  ];

  return new Patch({status: 'modified', hunks, buffer, layers});
}
