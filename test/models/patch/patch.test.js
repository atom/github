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
        oldStartRow: 0,
        newStartRow: 0,
        oldRowCount: 1,
        newRowCount: 1,
        sectionHeading: 'zero',
        rowRange: new IndexedRowRange({bufferRange: [[0, 0], [5, 0]], startOffset: 0, endOffset: 30}),
        changes: [
          new Addition(new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 5, endOffset: 10})),
          new Deletion(new IndexedRowRange({bufferRange: [[3, 0], [4, 0]], startOffset: 15, endOffset: 25})),
        ],
      }),
      new Hunk({
        oldStartRow: 0,
        newStartRow: 0,
        oldRowCount: 1,
        newRowCount: 1,
        sectionHeading: 'one',
        rowRange: new IndexedRowRange({bufferRange: [[6, 0], [15, 0]], startOffset: 30, endOffset: 80}),
        changes: [
          new Deletion(new IndexedRowRange({bufferRange: [[7, 0], [7, 0]], startOffset: 35, endOffset: 40})),
          new Deletion(new IndexedRowRange({bufferRange: [[9, 0], [11, 0]], startOffset: 45, endOffset: 60})),
          new Addition(new IndexedRowRange({bufferRange: [[12, 0], [14, 0]], startOffset: 60, endOffset: 75})),
        ],
      }),
    ];
    const p = new Patch({status: 'modified', hunks, bufferText: 'bufferText'});

    assert.strictEqual(p.getChangedLineCount(), 10);
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
            {kind: 'addition', string: '+0008\n', range: [[1, 0], [1, 0]]},
            {kind: 'deletion', string: '-0013\n-0014\n', range: [[5, 0], [6, 0]]},
            {kind: 'deletion', string: '-0016\n', range: [[8, 0], [8, 0]]},
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
            {kind: 'deletion', string: '-0001\n', range: [[1, 0], [1, 0]]},
            {kind: 'addition', string: '+0005\n', range: [[3, 0], [3, 0]]},
          ],
        },
        {
          startRow: 5,
          endRow: 14,
          header: '@@ -12,9 +12,8 @@',
          changes: [
            {kind: 'deletion', string: '-0015\n-0016\n', range: [[11, 0], [12, 0]]},
            {kind: 'addition', string: '+0017\n', range: [[13, 0], [13, 0]]},
          ],
        },
        {
          startRow: 15,
          endRow: 17,
          header: '@@ -32,1 +31,2 @@',
          changes: [
            {kind: 'addition', string: '+0025\n', range: [[16, 0], [16, 0]]},
            {kind: 'nonewline', string: '\\ No newline at end of file\n', range: [[17, 0], [17, 0]]},
          ],
        },
      );
    });

    it('returns a modification patch if original patch is a deletion', function() {
      const bufferText = 'line-0\nline-1\nline-2\nline-3\nline-4\nline-5\n';

      const hunks = [
        new Hunk({
          oldStartRow: 1,
          oldRowCount: 5,
          newStartRow: 1,
          newRowCount: 0,
          sectionHeading: 'zero',
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [5, 0]], startOffset: 0, endOffset: 43}),
          changes: [
            new Deletion(new IndexedRowRange({bufferRange: [[0, 0], [5, 0]], startOffset: 0, endOffset: 43})),
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
            {kind: 'deletion', string: '-line-1\n', range: [[1, 0], [1, 0]]},
            {kind: 'deletion', string: '-line-3\n-line-4\n', range: [[3, 0], [4, 0]]},
          ],
        },
      );
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
            {kind: 'deletion', string: '-0008\n', range: [[1, 0], [1, 0]]},
            {kind: 'addition', string: '+0012\n+0013\n', range: [[5, 0], [6, 0]]},
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
            {kind: 'addition', string: '+0001\n', range: [[1, 0], [1, 0]]},
            {kind: 'deletion', string: '-0004\n-0005\n', range: [[3, 0], [4, 0]]},
          ],
        },
        {
          startRow: 6,
          endRow: 13,
          header: '@@ -13,7 +12,7 @@',
          changes: [
            {kind: 'addition', string: '+0016\n', range: [[11, 0], [11, 0]]},
            {kind: 'deletion', string: '-0017\n', range: [[12, 0], [12, 0]]},
          ],
        },
        {
          startRow: 14,
          endRow: 16,
          header: '@@ -25,3 +24,2 @@',
          changes: [
            {kind: 'deletion', string: '-0020\n', range: [[15, 0], [15, 0]]},
          ],
        },
        {
          startRow: 17,
          endRow: 19,
          header: '@@ -30,2 +28,1 @@',
          changes: [
            {kind: 'deletion', string: '-0025\n', range: [[18, 0], [18, 0]]},
            {kind: 'nonewline', string: '\\ No newline at end of file\n', range: [[19, 0], [19, 0]]},
          ],
        },
      );
    });

    it('returns a modification if original patch is an addition', function() {
      const bufferText = '0000\n0001\n0002\n';
      const hunks = [
        new Hunk({
          oldStartRow: 1,
          oldRowCount: 0,
          newStartRow: 1,
          newRowCount: 3,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 15}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 15})),
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
            {kind: 'deletion', string: '-0001\n-0002\n', range: [[1, 0], [2, 0]]},
          ],
        },
      );
    });

    it('returns a nullPatch as a nullPatch', function() {
      assert.strictEqual(nullPatch.getUnstagePatchForLines(new Set([1, 2, 3])), nullPatch);
    });
  });

  it('prints itself as an apply-ready string', function() {
    const bufferText = '0000\n1111\n2222\n3333\n4444\n5555\n6666\n7777\n8888\n9999\n';
    // old: 0000.2222.3333.4444.5555.6666.7777.8888.9999.
    // new: 0000.1111.2222.3333.4444.5555.6666.9999.
    // patch buffer: 0000.1111.2222.3333.4444.5555.6666.7777.8888.9999.

    const hunk0 = new Hunk({
      oldStartRow: 0,
      newStartRow: 0,
      oldRowCount: 2,
      newRowCount: 3,
      sectionHeading: 'zero',
      rowRange: new IndexedRowRange({bufferRange: [[0, 0], [2, 0]], startOffset: 0, endOffset: 15}),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[1, 0], [1, 0]], startOffset: 5, endOffset: 10})),
      ],
    });

    const hunk1 = new Hunk({
      oldStartRow: 5,
      newStartRow: 6,
      oldRowCount: 4,
      newRowCount: 2,
      sectionHeading: 'one',
      rowRange: new IndexedRowRange({bufferRange: [[6, 0], [9, 0]], startOffset: 30, endOffset: 50}),
      changes: [
        new Deletion(new IndexedRowRange({bufferRange: [[7, 0], [8, 0]], startOffset: 35, endOffset: 45})),
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
  });
});

function buildPatchFixture() {
  const bufferText =
    '0000\n0001\n0002\n0003\n0004\n0005\n0006\n0007\n0008\n0009\n' +
    '0010\n0011\n0012\n0013\n0014\n0015\n0016\n0017\n0018\n0019\n' +
    '0020\n0021\n0022\n0023\n0024\n0025\n' +
    ' No newline at end of file\n';

  const hunks = [
    new Hunk({
      oldStartRow: 3,
      oldRowCount: 4,
      newStartRow: 3,
      newRowCount: 5,
      sectionHeading: 'zero',
      rowRange: new IndexedRowRange({bufferRange: [[0, 0], [6, 0]], startOffset: 0, endOffset: 35}),
      changes: [
        new Deletion(new IndexedRowRange({bufferRange: [[1, 0], [2, 0]], startOffset: 5, endOffset: 15})),
        new Addition(new IndexedRowRange({bufferRange: [[3, 0], [5, 0]], startOffset: 15, endOffset: 30})),
      ],
    }),
    new Hunk({
      oldStartRow: 12,
      oldRowCount: 9,
      newStartRow: 13,
      newRowCount: 7,
      sectionHeading: 'one',
      rowRange: new IndexedRowRange({bufferRange: [[7, 0], [18, 0]], startOffset: 35, endOffset: 95}),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[8, 0], [9, 0]], startOffset: 40, endOffset: 50})),
        new Deletion(new IndexedRowRange({bufferRange: [[12, 0], [16, 0]], startOffset: 60, endOffset: 85})),
        new Addition(new IndexedRowRange({bufferRange: [[17, 0], [17, 0]], startOffset: 85, endOffset: 90})),
      ],
    }),
    new Hunk({
      oldStartRow: 26,
      oldRowCount: 4,
      newStartRow: 25,
      newRowCount: 3,
      sectionHeading: 'two',
      rowRange: new IndexedRowRange({bufferRange: [[19, 0], [23, 0]], startOffset: 95, endOffset: 120}),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[20, 0], [20, 0]], startOffset: 100, endOffset: 105})),
        new Deletion(new IndexedRowRange({bufferRange: [[21, 0], [22, 0]], startOffset: 105, endOffset: 115})),
      ],
    }),
    new Hunk({
      oldStartRow: 32,
      oldRowCount: 1,
      newStartRow: 30,
      newRowCount: 2,
      sectionHeading: 'three',
      rowRange: new IndexedRowRange({bufferRange: [[24, 0], [26, 0]], startOffset: 120, endOffset: 157}),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[25, 0], [25, 0]], startOffset: 125, endOffset: 130})),
        new NoNewline(new IndexedRowRange({bufferRange: [[26, 0], [26, 0]], startOffset: 130, endOffset: 157})),
      ],
    }),
  ];

  return new Patch({status: 'modified', hunks, bufferText});
}
