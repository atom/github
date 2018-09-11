import {TextBuffer, Range} from 'atom';

import Hunk from '../../../lib/models/patch/hunk';
import {Addition, Deletion, NoNewline} from '../../../lib/models/patch/region';

describe('Hunk', function() {
  const attrs = {
    oldStartRow: 0,
    newStartRow: 0,
    oldRowCount: 0,
    newRowCount: 0,
    sectionHeading: 'sectionHeading',
    rowRange: Range.fromObject([[1, 0], [10, Infinity]]),
    changes: [
      new Addition(Range.fromObject([[1, 0], [2, Infinity]])),
      new Deletion(Range.fromObject([[3, 0], [4, Infinity]])),
      new Deletion(Range.fromObject([[5, 0], [6, Infinity]])),
    ],
  };

  it('has some basic accessors', function() {
    const h = new Hunk({
      oldStartRow: 0,
      newStartRow: 1,
      oldRowCount: 2,
      newRowCount: 3,
      sectionHeading: 'sectionHeading',
      rowRange: Range.fromObject([[0, 0], [10, Infinity]]),
      changes: [
        new Addition(Range.fromObject([[1, 0], [2, Infinity]])),
        new Deletion(Range.fromObject([[3, 0], [4, Infinity]])),
        new Deletion(Range.fromObject([[5, 0], [6, Infinity]])),
      ],
    });

    assert.strictEqual(h.getOldStartRow(), 0);
    assert.strictEqual(h.getNewStartRow(), 1);
    assert.strictEqual(h.getOldRowCount(), 2);
    assert.strictEqual(h.getNewRowCount(), 3);
    assert.strictEqual(h.getSectionHeading(), 'sectionHeading');
    assert.deepEqual(h.getRange().serialize(), [[0, 0], [10, Infinity]]);
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
        new Addition(Range.fromObject([[1, 0], [2, Infinity]])),
        new Deletion(Range.fromObject([[4, 0], [5, Infinity]])),
        new NoNewline(Range.fromObject([[10, 0], [10, Infinity]])),
      ],
    });

    const nl = h.getNoNewlineRange();
    assert.isNotNull(nl);
    assert.deepEqual(nl.serialize(), [[10, 0], [10, Infinity]]);
  });

  it('creates its row range for decoration placement', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: Range.fromObject([[3, 0], [6, Infinity]]),
    });

    assert.deepEqual(h.getRange().serialize(), [[3, 0], [6, Infinity]]);
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
      rowRange: Range.fromObject([[0, 0], [11, Infinity]]),
      changes: [
        new Addition(Range.fromObject([[1, 0], [3, Infinity]])),
        new Deletion(Range.fromObject([[5, 0], [6, Infinity]])),
        new Deletion(Range.fromObject([[7, 0], [9, Infinity]])),
      ],
    });

    const regions = h.getRegions();
    assert.lengthOf(regions, 6);

    assert.isTrue(regions[0].isUnchanged());
    assert.deepEqual(regions[0].range.serialize(), [[0, 0], [0, Infinity]]);

    assert.isTrue(regions[1].isAddition());
    assert.deepEqual(regions[1].range.serialize(), [[1, 0], [3, Infinity]]);

    assert.isTrue(regions[2].isUnchanged());
    assert.deepEqual(regions[2].range.serialize(), [[4, 0], [4, Infinity]]);

    assert.isTrue(regions[3].isDeletion());
    assert.deepEqual(regions[3].range.serialize(), [[5, 0], [6, Infinity]]);

    assert.isTrue(regions[4].isDeletion());
    assert.deepEqual(regions[4].range.serialize(), [[7, 0], [9, Infinity]]);

    assert.isTrue(regions[5].isUnchanged());
    assert.deepEqual(regions[5].range.serialize(), [[10, 0], [11, Infinity]]);
  });

  it('omits empty regions at the hunk beginning and end', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: Range.fromObject([[1, 0], [9, 20]]),
      changes: [
        new Addition(Range.fromObject([[1, 0], [3, Infinity]])),
        new Deletion(Range.fromObject([[5, 0], [6, Infinity]])),
        new Deletion(Range.fromObject([[7, 0], [9, 20]])),
      ],
    });

    const regions = h.getRegions();
    assert.lengthOf(regions, 4);

    assert.isTrue(regions[0].isAddition());
    assert.deepEqual(regions[0].range.serialize(), [[1, 0], [3, Infinity]]);

    assert.isTrue(regions[1].isUnchanged());
    assert.deepEqual(regions[1].range.serialize(), [[4, 0], [4, Infinity]]);

    assert.isTrue(regions[2].isDeletion());
    assert.deepEqual(regions[2].range.serialize(), [[5, 0], [6, Infinity]]);

    assert.isTrue(regions[3].isDeletion());
    assert.deepEqual(regions[3].range.serialize(), [[7, 0], [9, 20]]);
  });

  it('returns a set of covered buffer rows', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: Range.fromObject([[6, 0], [10, 60]]),
    });
    assert.sameMembers(Array.from(h.getBufferRows()), [6, 7, 8, 9, 10]);
  });

  it('determines if a buffer row is part of this hunk', function() {
    const h = new Hunk({
      ...attrs,
      rowRange: Range.fromObject([[3, 0], [5, Infinity]]),
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
      rowRange: Range.fromObject([[2, 0], [12, 10]]),
      changes: [
        new Addition(Range.fromObject([[3, 0], [5, Infinity]])),
        new Deletion(Range.fromObject([[7, 0], [9, Infinity]])),
        new Addition(Range.fromObject([[11, 0], [11, Infinity]])),
        new NoNewline(Range.fromObject([[12, 0], [12, Infinity]])),
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
      rowRange: Range.fromObject([[2, 0], [12, Infinity]]),
      changes: [
        new Addition(Range.fromObject([[3, 0], [5, Infinity]])),
        new Deletion(Range.fromObject([[7, 0], [9, Infinity]])),
        new Addition(Range.fromObject([[11, 0], [11, Infinity]])),
        new NoNewline(Range.fromObject([[12, 0], [12, Infinity]])),
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
        new Addition(Range.fromObject([[2, 0], [4, Infinity]])),
        new Addition(Range.fromObject([[6, 0], [6, Infinity]])),
        new Deletion(Range.fromObject([[7, 0], [10, Infinity]])),
        new NoNewline(Range.fromObject([[12, 0], [12, Infinity]])),
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

      assert.strictEqual(h.toStringIn(new TextBuffer()), '@@ -0,2 +1,3 @@\n\n');
    });

    it('renders changed and unchanged lines with the appropriate origin characters', function() {
      const buffer = new TextBuffer({
        text:
          '0000\n0111\n0222\n0333\n0444\n0555\n0666\n0777\n0888\n0999\n' +
          '1000\n1111\n1222\n' +
          ' No newline at end of file\n',
      });
      // 0000.0111.0222.0333.0444.0555.0666.0777.0888.0999.1000.1111.1222. No newline at end of file.

      const h = new Hunk({
        ...attrs,
        oldStartRow: 1,
        newStartRow: 1,
        oldRowCount: 6,
        newRowCount: 6,
        rowRange: Range.fromObject([[1, 0], [13, Infinity]]),
        changes: [
          new Addition(Range.fromObject([[2, 0], [3, Infinity]])),
          new Deletion(Range.fromObject([[5, 0], [5, Infinity]])),
          new Addition(Range.fromObject([[7, 0], [7, Infinity]])),
          new Deletion(Range.fromObject([[8, 0], [9, Infinity]])),
          new Addition(Range.fromObject([[10, 0], [10, Infinity]])),
          new NoNewline(Range.fromObject([[13, 0], [13, Infinity]])),
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
      const buffer = new TextBuffer({text: '0000\n1111\n2222\n3333\n4444\n'});

      const h = new Hunk({
        ...attrs,
        oldStartRow: 1,
        newStartRow: 1,
        oldRowCount: 1,
        newRowCount: 1,
        rowRange: Range.fromObject([[0, 0], [3, Infinity]]),
        changes: [
          new Addition(Range.fromObject([[1, 0], [1, Infinity]])),
          new Deletion(Range.fromObject([[2, 0], [2, Infinity]])),
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
