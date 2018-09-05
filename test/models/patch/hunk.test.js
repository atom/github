import Hunk from '../../../lib/models/patch/hunk';
import IndexedRowRange from '../../../lib/models/indexed-row-range';
import {Addition, Deletion, NoNewline} from '../../../lib/models/patch/region';

describe('Hunk', function() {
  const attrs = {
    oldStartRow: 0,
    newStartRow: 0,
    oldRowCount: 0,
    newRowCount: 0,
    sectionHeading: 'sectionHeading',
    rowRange: new IndexedRowRange({
      bufferRange: [[1, 0], [10, Infinity]],
      startOffset: 5,
      endOffset: 100,
    }),
    changes: [
      new Addition(new IndexedRowRange({bufferRange: [[1, 0], [2, Infinity]], startOffset: 6, endOffset: 7})),
      new Deletion(new IndexedRowRange({bufferRange: [[3, 0], [4, Infinity]], startOffset: 8, endOffset: 9})),
      new Deletion(new IndexedRowRange({bufferRange: [[5, 0], [6, Infinity]], startOffset: 10, endOffset: 11})),
    ],
  };

  it('has some basic accessors', function() {
    const h = new Hunk({
      oldStartRow: 0,
      newStartRow: 1,
      oldRowCount: 2,
      newRowCount: 3,
      sectionHeading: 'sectionHeading',
      rowRange: new IndexedRowRange({
        bufferRange: [[0, 0], [10, Infinity]],
        startOffset: 0,
        endOffset: 100,
      }),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[1, 0], [2, Infinity]], startOffset: 6, endOffset: 7})),
        new Deletion(new IndexedRowRange({bufferRange: [[3, 0], [4, Infinity]], startOffset: 8, endOffset: 9})),
        new Deletion(new IndexedRowRange({bufferRange: [[5, 0], [6, Infinity]], startOffset: 10, endOffset: 11})),
      ],
    });

    assert.strictEqual(h.getOldStartRow(), 0);
    assert.strictEqual(h.getNewStartRow(), 1);
    assert.strictEqual(h.getOldRowCount(), 2);
    assert.strictEqual(h.getNewRowCount(), 3);
    assert.strictEqual(h.getSectionHeading(), 'sectionHeading');
    assert.deepEqual(h.getRowRange().serialize(), {
      bufferRange: [[0, 0], [10, Infinity]],
      startOffset: 0,
      endOffset: 100,
    });
    assert.strictEqual(h.bufferRowCount(), 11);
    assert.lengthOf(h.getChanges(), 3);
    assert.lengthOf(h.getAdditionRanges(), 1);
    assert.lengthOf(h.getDeletionRanges(), 2);
    assert.isNull(h.getNoNewlineRange());
  });

  it('returns the range of a no-newline region', function() {
    const h = new Hunk({
      ...attrs,
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[1, 0], [2, Infinity]], startOffset: 6, endOffset: 7})),
        new Deletion(new IndexedRowRange({bufferRange: [[4, 0], [5, Infinity]], startOffset: 8, endOffset: 9})),
        new NoNewline(new IndexedRowRange({bufferRange: [[10, 0], [10, Infinity]], startOffset: 100, endOffset: 120})),
      ],
    });

    const nl = h.getNoNewlineRange();
    assert.isNotNull(nl);
    assert.deepEqual(nl.serialize(), [[10, 0], [10, Infinity]]);
  });

  it('creates its row range for decoration placement', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: new IndexedRowRange({
        bufferRange: [[3, 0], [6, Infinity]],
        startOffset: 15,
        endOffset: 35,
      }),
    });

    assert.deepEqual(h.getBufferRange().serialize(), [[3, 0], [6, Infinity]]);
  });

  it('generates a patch section header', function() {
    const h = new Hunk({
      ...attrs,
      oldStartRow: 0,
      newStartRow: 1,
      oldRowCount: 2,
      newRowCount: 3,
    });

    assert.strictEqual(h.getHeader(), '@@ -0,2 +1,3 @@');
  });

  it('returns a full set of covered regions, including unchanged', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: new IndexedRowRange({
        bufferRange: [[0, 0], [11, Infinity]],
        startOffset: 0,
        endOffset: 120,
      }),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[1, 0], [3, Infinity]], startOffset: 10, endOffset: 40})),
        new Deletion(new IndexedRowRange({bufferRange: [[5, 0], [6, Infinity]], startOffset: 50, endOffset: 70})),
        new Deletion(new IndexedRowRange({bufferRange: [[7, 0], [9, Infinity]], startOffset: 70, endOffset: 100})),
      ],
    });

    const regions = h.getRegions();
    assert.lengthOf(regions, 6);

    assert.isTrue(regions[0].isUnchanged());
    assert.deepEqual(regions[0].range.serialize(), {bufferRange: [[0, 0], [0, Infinity]], startOffset: 0, endOffset: 10});

    assert.isTrue(regions[1].isAddition());
    assert.deepEqual(regions[1].range.serialize(), {bufferRange: [[1, 0], [3, Infinity]], startOffset: 10, endOffset: 40});

    assert.isTrue(regions[2].isUnchanged());
    assert.deepEqual(regions[2].range.serialize(), {bufferRange: [[4, 0], [4, Infinity]], startOffset: 40, endOffset: 50});

    assert.isTrue(regions[3].isDeletion());
    assert.deepEqual(regions[3].range.serialize(), {bufferRange: [[5, 0], [6, Infinity]], startOffset: 50, endOffset: 70});

    assert.isTrue(regions[4].isDeletion());
    assert.deepEqual(regions[4].range.serialize(), {bufferRange: [[7, 0], [9, Infinity]], startOffset: 70, endOffset: 100});

    assert.isTrue(regions[5].isUnchanged());
    assert.deepEqual(regions[5].range.serialize(), {bufferRange: [[10, 0], [11, Infinity]], startOffset: 100, endOffset: 120});
  });

  it('omits empty regions at the hunk beginning and end', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: new IndexedRowRange({
        bufferRange: [[1, 0], [9, 20]],
        startOffset: 10,
        endOffset: 100,
      }),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[1, 0], [3, Infinity]], startOffset: 10, endOffset: 40})),
        new Deletion(new IndexedRowRange({bufferRange: [[5, 0], [6, Infinity]], startOffset: 50, endOffset: 70})),
        new Deletion(new IndexedRowRange({bufferRange: [[7, 0], [9, 20]], startOffset: 70, endOffset: 100})),
      ],
    });

    const regions = h.getRegions();
    assert.lengthOf(regions, 4);

    assert.isTrue(regions[0].isAddition());
    assert.deepEqual(regions[0].range.serialize(), {bufferRange: [[1, 0], [3, Infinity]], startOffset: 10, endOffset: 40});

    assert.isTrue(regions[1].isUnchanged());
    assert.deepEqual(regions[1].range.serialize(), {bufferRange: [[4, 0], [4, Infinity]], startOffset: 40, endOffset: 50});

    assert.isTrue(regions[2].isDeletion());
    assert.deepEqual(regions[2].range.serialize(), {bufferRange: [[5, 0], [6, Infinity]], startOffset: 50, endOffset: 70});

    assert.isTrue(regions[3].isDeletion());
    assert.deepEqual(regions[3].range.serialize(), {bufferRange: [[7, 0], [9, 20]], startOffset: 70, endOffset: 100});
  });

  it('returns a set of covered buffer rows', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: new IndexedRowRange({
        bufferRange: [[6, 0], [10, 60]],
        startOffset: 30,
        endOffset: 55,
      }),
    });
    assert.sameMembers(Array.from(h.getBufferRows()), [6, 7, 8, 9, 10]);
  });

  it('determines if a buffer row is part of this hunk', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: new IndexedRowRange({
        bufferRange: [[3, 0], [5, Infinity]],
        startOffset: 30,
        endOffset: 55,
      }),
    });

    assert.isFalse(h.includesBufferRow(2));
    assert.isTrue(h.includesBufferRow(3));
    assert.isTrue(h.includesBufferRow(4));
    assert.isTrue(h.includesBufferRow(5));
    assert.isFalse(h.includesBufferRow(6));
  });

  it('computes the old file row for a buffer row', function() {
    const h = new Hunk({
      ...attrs,
      oldStartRow: 10,
      oldRowCount: 6,
      newStartRow: 20,
      newRowCount: 7,
      rowRange: new IndexedRowRange({bufferRange: [[2, 0], [12, 10]], startOffset: 0, endOffset: 0}),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[3, 0], [5, Infinity]], startOffset: 0, endOffset: 0})),
        new Deletion(new IndexedRowRange({bufferRange: [[7, 0], [9, Infinity]], startOffset: 0, endOffset: 0})),
        new Addition(new IndexedRowRange({bufferRange: [[11, 0], [11, Infinity]], startOffset: 0, endOffset: 0})),
        new NoNewline(new IndexedRowRange({bufferRange: [[12, 0], [12, Infinity]], startOffset: 0, endOffset: 0})),
      ],
    });

    assert.strictEqual(h.getOldRowAt(2), 10);
    assert.isNull(h.getOldRowAt(3));
    assert.isNull(h.getOldRowAt(4));
    assert.isNull(h.getOldRowAt(5));
    assert.strictEqual(h.getOldRowAt(6), 11);
    assert.strictEqual(h.getOldRowAt(7), 12);
    assert.strictEqual(h.getOldRowAt(8), 13);
    assert.strictEqual(h.getOldRowAt(9), 14);
    assert.strictEqual(h.getOldRowAt(10), 15);
    assert.isNull(h.getOldRowAt(11));
    assert.isNull(h.getOldRowAt(12));
    assert.isNull(h.getOldRowAt(13));
  });

  it('computes the new file row for a buffer row', function() {
    const h = new Hunk({
      ...attrs,
      oldStartRow: 10,
      oldRowCount: 6,
      newStartRow: 20,
      newRowCount: 7,
      rowRange: new IndexedRowRange({bufferRange: [[2, 0], [12, Infinity]], startOffset: 0, endOffset: 0}),
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[3, 0], [5, Infinity]], startOffset: 0, endOffset: 0})),
        new Deletion(new IndexedRowRange({bufferRange: [[7, 0], [9, Infinity]], startOffset: 0, endOffset: 0})),
        new Addition(new IndexedRowRange({bufferRange: [[11, 0], [11, Infinity]], startOffset: 0, endOffset: 0})),
        new NoNewline(new IndexedRowRange({bufferRange: [[12, 0], [12, Infinity]], startOffset: 0, endOffset: 0})),
      ],
    });

    assert.strictEqual(h.getNewRowAt(2), 20);
    assert.strictEqual(h.getNewRowAt(3), 21);
    assert.strictEqual(h.getNewRowAt(4), 22);
    assert.strictEqual(h.getNewRowAt(5), 23);
    assert.strictEqual(h.getNewRowAt(6), 24);
    assert.isNull(h.getNewRowAt(7));
    assert.isNull(h.getNewRowAt(8));
    assert.isNull(h.getNewRowAt(9));
    assert.strictEqual(h.getNewRowAt(10), 25);
    assert.strictEqual(h.getNewRowAt(11), 26);
    assert.isNull(h.getNewRowAt(12));
    assert.isNull(h.getNewRowAt(13));
  });

  it('computes the total number of changed lines', function() {
    const h0 = new Hunk({
      ...attrs,
      changes: [
        new Addition(new IndexedRowRange({bufferRange: [[2, 0], [4, Infinity]], startOffset: 0, endOffset: 0})),
        new Addition(new IndexedRowRange({bufferRange: [[6, 0], [6, Infinity]], startOffset: 0, endOffset: 0})),
        new Deletion(new IndexedRowRange({bufferRange: [[7, 0], [10, Infinity]], startOffset: 0, endOffset: 0})),
        new NoNewline(new IndexedRowRange({bufferRange: [[12, 0], [12, Infinity]], startOffset: 0, endOffset: 0})),
      ],
    });
    assert.strictEqual(h0.changedLineCount(), 8);

    const h1 = new Hunk({
      ...attrs,
      changes: [],
    });
    assert.strictEqual(h1.changedLineCount(), 0);
  });

  it('determines the maximum number of digits necessary to represent a diff line number', function() {
    const h0 = new Hunk({
      ...attrs,
      oldStartRow: 200,
      oldRowCount: 10,
      newStartRow: 999,
      newRowCount: 1,
    });
    assert.strictEqual(h0.getMaxLineNumberWidth(), 4);

    const h1 = new Hunk({
      ...attrs,
      oldStartRow: 5000,
      oldRowCount: 10,
      newStartRow: 20000,
      newRowCount: 20,
    });
    assert.strictEqual(h1.getMaxLineNumberWidth(), 5);
  });

  describe('toStringIn()', function() {
    it('prints its header', function() {
      const h = new Hunk({
        ...attrs,
        oldStartRow: 0,
        newStartRow: 1,
        oldRowCount: 2,
        newRowCount: 3,
        changes: [],
      });

      assert.strictEqual(h.toStringIn(''), '@@ -0,2 +1,3 @@\n');
    });

    it('renders changed and unchanged lines with the appropriate origin characters', function() {
      const buffer =
        '0000\n0111\n0222\n0333\n0444\n0555\n0666\n0777\n0888\n0999\n' +
        '1000\n1111\n1222\n' +
        ' No newline at end of file\n';
      // 0000.0111.0222.0333.0444.0555.0666.0777.0888.0999.1000.1111.1222. No newline at end of file.

      const h = new Hunk({
        ...attrs,
        oldStartRow: 1,
        newStartRow: 1,
        oldRowCount: 6,
        newRowCount: 6,
        rowRange: new IndexedRowRange({
          bufferRange: [[1, 0], [13, Infinity]],
          startOffset: 5,
          endOffset: 91,
        }),
        changes: [
          new Addition(new IndexedRowRange({bufferRange: [[2, 0], [3, Infinity]], startOffset: 10, endOffset: 20})),
          new Deletion(new IndexedRowRange({bufferRange: [[5, 0], [5, Infinity]], startOffset: 25, endOffset: 30})),
          new Addition(new IndexedRowRange({bufferRange: [[7, 0], [7, Infinity]], startOffset: 35, endOffset: 40})),
          new Deletion(new IndexedRowRange({bufferRange: [[8, 0], [9, Infinity]], startOffset: 40, endOffset: 50})),
          new Addition(new IndexedRowRange({bufferRange: [[10, 0], [10, Infinity]], startOffset: 50, endOffset: 55})),
          new NoNewline(new IndexedRowRange({bufferRange: [[13, 0], [13, Infinity]], startOffset: 65, endOffset: 92})),
        ],
      });

      assert.strictEqual(h.toStringIn(buffer), [
        '@@ -1,6 +1,6 @@\n',
        ' 0111\n',
        '+0222\n',
        '+0333\n',
        ' 0444\n',
        '-0555\n',
        ' 0666\n',
        '+0777\n',
        '-0888\n',
        '-0999\n',
        '+1000\n',
        ' 1111\n',
        ' 1222\n',
        '\\ No newline at end of file\n',
      ].join(''));
    });

    it('renders a hunk without a nonewline', function() {
      const buffer = '0000\n1111\n2222\n3333\n4444\n';

      const h = new Hunk({
        ...attrs,
        oldStartRow: 1,
        newStartRow: 1,
        oldRowCount: 1,
        newRowCount: 1,
        rowRange: new IndexedRowRange({bufferRange: [[0, 0], [3, Infinity]], startOffset: 0, endOffset: 20}),
        changes: [
          new Addition(new IndexedRowRange({bufferRange: [[1, 0], [1, Infinity]], startOffset: 5, endOffset: 10})),
          new Deletion(new IndexedRowRange({bufferRange: [[2, 0], [2, Infinity]], startOffset: 10, endOffset: 15})),
        ],
      });

      assert.strictEqual(h.toStringIn(buffer), [
        '@@ -1,1 +1,1 @@\n',
        ' 0000\n',
        '+1111\n',
        '-2222\n',
        ' 3333\n',
      ].join(''));
    });
  });
});
