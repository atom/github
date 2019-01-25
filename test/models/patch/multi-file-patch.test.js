import dedent from 'dedent-js';

import {multiFilePatchBuilder, filePatchBuilder} from '../../builder/patch';

import {DEFAULT_OPTIONS} from '../../../lib/models/patch/builder.js';
import MultiFilePatch from '../../../lib/models/patch/multi-file-patch';

import {assertInFilePatch} from '../../helpers';

describe('MultiFilePatch', function() {
  it('creates an empty patch', function() {
    const empty = MultiFilePatch.createNull();
    assert.isFalse(empty.anyPresent());
    assert.lengthOf(empty.getFilePatches(), 0);
  });

  it('detects when it is not empty', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(filePatch => {
        filePatch
          .setOldFile(file => file.path('file-0.txt'))
          .setNewFile(file => file.path('file-0.txt'));
      })
      .build();

    assert.isTrue(multiFilePatch.anyPresent());
  });

  describe('clone', function() {
    let original;

    beforeEach(function() {
      original = multiFilePatchBuilder()
        .addFilePatch()
        .addFilePatch()
        .build()
        .multiFilePatch;
    });

    it('defaults to creating an exact copy', function() {
      const dup = original.clone();

      assert.strictEqual(dup.getBuffer(), original.getBuffer());
      assert.strictEqual(dup.getPatchLayer(), original.getPatchLayer());
      assert.strictEqual(dup.getHunkLayer(), original.getHunkLayer());
      assert.strictEqual(dup.getUnchangedLayer(), original.getUnchangedLayer());
      assert.strictEqual(dup.getAdditionLayer(), original.getAdditionLayer());
      assert.strictEqual(dup.getDeletionLayer(), original.getDeletionLayer());
      assert.strictEqual(dup.getNoNewlineLayer(), original.getNoNewlineLayer());
      assert.strictEqual(dup.getFilePatches(), original.getFilePatches());
    });

    it('creates a copy with a new PatchBuffer', function() {
      const {multiFilePatch} = multiFilePatchBuilder().build();
      const dup = original.clone({patchBuffer: multiFilePatch.getLayeredBuffer()});

      assert.strictEqual(dup.getBuffer(), multiFilePatch.getBuffer());
      assert.strictEqual(dup.getPatchLayer(), multiFilePatch.getPatchLayer());
      assert.strictEqual(dup.getHunkLayer(), multiFilePatch.getHunkLayer());
      assert.strictEqual(dup.getUnchangedLayer(), multiFilePatch.getUnchangedLayer());
      assert.strictEqual(dup.getAdditionLayer(), multiFilePatch.getAdditionLayer());
      assert.strictEqual(dup.getDeletionLayer(), multiFilePatch.getDeletionLayer());
      assert.strictEqual(dup.getNoNewlineLayer(), multiFilePatch.getNoNewlineLayer());
      assert.strictEqual(dup.getFilePatches(), original.getFilePatches());
    });

    it('creates a copy with a new set of file patches', function() {
      const nfp = [
        filePatchBuilder().build().filePatch,
        filePatchBuilder().build().filePatch,
      ];

      const dup = original.clone({filePatches: nfp});
      assert.strictEqual(dup.getBuffer(), original.getBuffer());
      assert.strictEqual(dup.getPatchLayer(), original.getPatchLayer());
      assert.strictEqual(dup.getHunkLayer(), original.getHunkLayer());
      assert.strictEqual(dup.getUnchangedLayer(), original.getUnchangedLayer());
      assert.strictEqual(dup.getAdditionLayer(), original.getAdditionLayer());
      assert.strictEqual(dup.getDeletionLayer(), original.getDeletionLayer());
      assert.strictEqual(dup.getNoNewlineLayer(), original.getNoNewlineLayer());
      assert.strictEqual(dup.getFilePatches(), nfp);
    });
  });

  it('has an accessor for its file patches', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(filePatch => filePatch.setOldFile(file => file.path('file-0.txt')))
      .addFilePatch(filePatch => filePatch.setOldFile(file => file.path('file-1.txt')))
      .build();

    assert.lengthOf(multiFilePatch.getFilePatches(), 2);
    const [fp0, fp1] = multiFilePatch.getFilePatches();
    assert.strictEqual(fp0.getOldPath(), 'file-0.txt');
    assert.strictEqual(fp1.getOldPath(), 'file-1.txt');
  });

  describe('didAnyChangeExecutableMode()', function() {
    it('detects when at least one patch contains an executable mode change', function() {
      const {multiFilePatch: yes} = multiFilePatchBuilder()
        .addFilePatch(filePatch => {
          filePatch.setOldFile(file => file.path('file-0.txt'));
          filePatch.setNewFile(file => file.path('file-0.txt').executable());
        })
        .build();
      assert.isTrue(yes.didAnyChangeExecutableMode());
    });

    it('detects when none of the patches contain an executable mode change', function() {
      const {multiFilePatch: no} = multiFilePatchBuilder()
        .addFilePatch(filePatch => filePatch.setOldFile(file => file.path('file-0.txt')))
        .addFilePatch(filePatch => filePatch.setOldFile(file => file.path('file-1.txt')))
        .build();
      assert.isFalse(no.didAnyChangeExecutableMode());
    });
  });

  describe('anyHaveTypechange()', function() {
    it('detects when at least one patch contains a symlink change', function() {
      const {multiFilePatch: yes} = multiFilePatchBuilder()
        .addFilePatch(filePatch => filePatch.setOldFile(file => file.path('file-0.txt')))
        .addFilePatch(filePatch => {
          filePatch.setOldFile(file => file.path('file-0.txt'));
          filePatch.setNewFile(file => file.path('file-0.txt').symlinkTo('somewhere.txt'));
        })
        .build();
      assert.isTrue(yes.anyHaveTypechange());
    });

    it('detects when none of its patches contain a symlink change', function() {
      const {multiFilePatch: no} = multiFilePatchBuilder()
        .addFilePatch(filePatch => filePatch.setOldFile(file => file.path('file-0.txt')))
        .addFilePatch(filePatch => filePatch.setOldFile(file => file.path('file-1.txt')))
        .build();
      assert.isFalse(no.anyHaveTypechange());
    });
  });

  it('computes the maximum line number width of any hunk in any patch', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file-0.txt'));
        fp.addHunk(h => h.oldRow(10));
        fp.addHunk(h => h.oldRow(99));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file-1.txt'));
        fp.addHunk(h => h.oldRow(5));
        fp.addHunk(h => h.oldRow(15));
      })
      .build();

    assert.strictEqual(multiFilePatch.getMaxLineNumberWidth(), 3);
  });

  it('locates an individual FilePatch by marker lookup', function() {
    const builder = multiFilePatchBuilder();
    for (let i = 0; i < 10; i++) {
      builder.addFilePatch(fp => {
        fp.setOldFile(f => f.path(`file-${i}.txt`));
        fp.addHunk(h => {
          h.oldRow(1).unchanged('a', 'b').added('c').deleted('d').unchanged('e');
        });
        fp.addHunk(h => {
          h.oldRow(10).unchanged('f').deleted('g', 'h', 'i').unchanged('j');
        });
      });
    }
    const {multiFilePatch} = builder.build();
    const fps = multiFilePatch.getFilePatches();

    assert.isUndefined(multiFilePatch.getFilePatchAt(-1));
    assert.strictEqual(multiFilePatch.getFilePatchAt(0), fps[0]);
    assert.strictEqual(multiFilePatch.getFilePatchAt(9), fps[0]);
    assert.strictEqual(multiFilePatch.getFilePatchAt(10), fps[1]);
    assert.strictEqual(multiFilePatch.getFilePatchAt(99), fps[9]);
    assert.isUndefined(multiFilePatch.getFilePatchAt(101));
  });

  it('creates a set of all unique paths referenced by patches', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file-0-before.txt'));
        fp.setNewFile(f => f.path('file-0-after.txt'));
      })
      .addFilePatch(fp => {
        fp.status('added');
        fp.nullOldFile();
        fp.setNewFile(f => f.path('file-1.txt'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file-2.txt'));
        fp.setNewFile(f => f.path('file-2.txt'));
      })
      .build();

    assert.sameMembers(
      Array.from(multiFilePatch.getPathSet()),
      ['file-0-before.txt', 'file-0-after.txt', 'file-1.txt', 'file-2.txt'],
    );
  });

  it('locates a Hunk by marker lookup', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.addHunk(h => h.oldRow(1).added('0', '1', '2', '3', '4'));
        fp.addHunk(h => h.oldRow(10).deleted('5', '6', '7', '8', '9'));
      })
      .addFilePatch(fp => {
        fp.addHunk(h => h.oldRow(5).unchanged('10', '11').added('12').deleted('13'));
        fp.addHunk(h => h.oldRow(20).unchanged('14').deleted('15'));
      })
      .addFilePatch(fp => {
        fp.status('deleted');
        fp.addHunk(h => h.oldRow(4).deleted('16', '17', '18', '19'));
      })
      .build();

    const [fp0, fp1, fp2] = multiFilePatch.getFilePatches();

    assert.isUndefined(multiFilePatch.getHunkAt(-1));
    assert.strictEqual(multiFilePatch.getHunkAt(0), fp0.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(4), fp0.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(5), fp0.getHunks()[1]);
    assert.strictEqual(multiFilePatch.getHunkAt(9), fp0.getHunks()[1]);
    assert.strictEqual(multiFilePatch.getHunkAt(10), fp1.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(15), fp1.getHunks()[1]);
    assert.strictEqual(multiFilePatch.getHunkAt(16), fp2.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(19), fp2.getHunks()[0]);
    assert.isUndefined(multiFilePatch.getHunkAt(21));
  });

  it('represents itself as an apply-ready string', function() {
    const {multiFilePatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file-0.txt'));
        fp.addHunk(h => h.oldRow(1).unchanged('0;0;0').added('0;0;1').deleted('0;0;2').unchanged('0;0;3'));
        fp.addHunk(h => h.oldRow(10).unchanged('0;1;0').added('0;1;1').deleted('0;1;2').unchanged('0;1;3'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('file-1.txt'));
        fp.addHunk(h => h.oldRow(1).unchanged('1;0;0').added('1;0;1').deleted('1;0;2').unchanged('1;0;3'));
        fp.addHunk(h => h.oldRow(10).unchanged('1;1;0').added('1;1;1').deleted('1;1;2').unchanged('1;1;3'));
      })
      .build();

    assert.strictEqual(multiFilePatch.toString(), dedent`
      diff --git a/file-0.txt b/file-0.txt
      --- a/file-0.txt
      +++ b/file-0.txt
      @@ -1,3 +1,3 @@
       0;0;0
      +0;0;1
      -0;0;2
       0;0;3
      @@ -10,3 +10,3 @@
       0;1;0
      +0;1;1
      -0;1;2
       0;1;3
      diff --git a/file-1.txt b/file-1.txt
      --- a/file-1.txt
      +++ b/file-1.txt
      @@ -1,3 +1,3 @@
       1;0;0
      +1;0;1
      -1;0;2
       1;0;3
      @@ -10,3 +10,3 @@
       1;1;0
      +1;1;1
      -1;1;2
       1;1;3
    `);
  });

  it('adopts a buffer from a previous patch', function() {
    const {multiFilePatch: lastMultiPatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('A0.txt'));
        fp.addHunk(h => h.unchanged('a0').added('a1').deleted('a2').unchanged('a3'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('A1.txt'));
        fp.addHunk(h => h.unchanged('a4').deleted('a5').unchanged('a6'));
        fp.addHunk(h => h.unchanged('a7').added('a8').unchanged('a9'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('A2.txt'));
        fp.addHunk(h => h.oldRow(99).deleted('7').noNewline());
      })
      .build();

    const {multiFilePatch: nextMultiPatch} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('B0.txt'));
        fp.addHunk(h => h.unchanged('b0', 'b1').added('b2').unchanged('b3', 'b4'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('B1.txt'));
        fp.addHunk(h => h.unchanged('b5', 'b6').added('b7'));
      })
      .addFilePatch(fp => {
        fp.setOldFile(f => f.path('B2.txt'));
        fp.addHunk(h => h.unchanged('b8', 'b9').deleted('b10').unchanged('b11'));
        fp.addHunk(h => h.oldRow(99).deleted('b12').noNewline());
      })
      .build();

    assert.notStrictEqual(nextMultiPatch.getBuffer(), lastMultiPatch.getBuffer());

    nextMultiPatch.adoptBufferFrom(lastMultiPatch);

    assert.strictEqual(nextMultiPatch.getBuffer(), lastMultiPatch.getBuffer());
    assert.strictEqual(nextMultiPatch.getPatchLayer(), lastMultiPatch.getPatchLayer());
    assert.strictEqual(nextMultiPatch.getHunkLayer(), lastMultiPatch.getHunkLayer());
    assert.strictEqual(nextMultiPatch.getUnchangedLayer(), lastMultiPatch.getUnchangedLayer());
    assert.strictEqual(nextMultiPatch.getAdditionLayer(), lastMultiPatch.getAdditionLayer());
    assert.strictEqual(nextMultiPatch.getDeletionLayer(), lastMultiPatch.getDeletionLayer());
    assert.strictEqual(nextMultiPatch.getNoNewlineLayer(), lastMultiPatch.getNoNewlineLayer());

    assert.deepEqual(nextMultiPatch.getBuffer().getText(), dedent`
      b0
      b1
      b2
      b3
      b4
      b5
      b6
      b7
      b8
      b9
      b10
      b11
      b12
       No newline at end of file
    `);

    const assertMarkedLayerRanges = (layer, ranges) => {
      assert.deepEqual(layer.getMarkers().map(m => m.getRange().serialize()), ranges);
    };

    assertMarkedLayerRanges(nextMultiPatch.getPatchLayer(), [
      [[0, 0], [4, 2]], [[5, 0], [7, 2]], [[8, 0], [13, 26]],
    ]);
    assertMarkedLayerRanges(nextMultiPatch.getHunkLayer(), [
      [[0, 0], [4, 2]], [[5, 0], [7, 2]], [[8, 0], [11, 3]], [[12, 0], [13, 26]],
    ]);
    assertMarkedLayerRanges(nextMultiPatch.getUnchangedLayer(), [
      [[0, 0], [1, 2]], [[3, 0], [4, 2]], [[5, 0], [6, 2]], [[8, 0], [9, 2]], [[11, 0], [11, 3]],
    ]);
    assertMarkedLayerRanges(nextMultiPatch.getAdditionLayer(), [
      [[2, 0], [2, 2]], [[7, 0], [7, 2]],
    ]);
    assertMarkedLayerRanges(nextMultiPatch.getDeletionLayer(), [
      [[10, 0], [10, 3]], [[12, 0], [12, 3]],
    ]);
    assertMarkedLayerRanges(nextMultiPatch.getNoNewlineLayer(), [
      [[13, 0], [13, 26]],
    ]);

    assert.strictEqual(nextMultiPatch.getBufferRowForDiffPosition('B0.txt', 1), 0);
    assert.strictEqual(nextMultiPatch.getBufferRowForDiffPosition('B2.txt', 5), 12);
  });

  describe('derived patch generation', function() {
    let multiFilePatch, rowSet;

    beforeEach(function() {
      // The row content pattern here is: ${fileno};${hunkno};${lineno}, with a (**) if it's selected
      multiFilePatch = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-0.txt'));
          fp.addHunk(h => h.oldRow(1).unchanged('0;0;0').added('0;0;1').deleted('0;0;2').unchanged('0;0;3'));
          fp.addHunk(h => h.oldRow(10).unchanged('0;1;0').added('0;1;1').deleted('0;1;2').unchanged('0;1;3'));
        })
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-1.txt'));
          fp.addHunk(h => h.oldRow(1).unchanged('1;0;0').added('1;0;1 (**)').deleted('1;0;2').unchanged('1;0;3'));
          fp.addHunk(h => h.oldRow(10).unchanged('1;1;0').added('1;1;1').deleted('1;1;2 (**)').unchanged('1;1;3'));
        })
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-2.txt'));
          fp.addHunk(h => h.oldRow(1).unchanged('2;0;0').added('2;0;1').deleted('2;0;2').unchanged('2;0;3'));
          fp.addHunk(h => h.oldRow(10).unchanged('2;1;0').added('2;1;1').deleted('2;2;2').unchanged('2;1;3'));
        })
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-3.txt'));
          fp.addHunk(h => h.oldRow(1).unchanged('3;0;0').added('3;0;1 (**)').deleted('3;0;2 (**)').unchanged('3;0;3'));
          fp.addHunk(h => h.oldRow(10).unchanged('3;1;0').added('3;1;1').deleted('3;2;2').unchanged('3;1;3'));
        })
        .build()
        .multiFilePatch;

      // Buffer rows corresponding to the rows marked with (**) above
      rowSet = new Set([9, 14, 25, 26]);
    });

    it('generates a stage patch for arbitrary buffer rows', function() {
      const stagePatch = multiFilePatch.getStagePatchForLines(rowSet);

      assert.strictEqual(stagePatch.getBuffer().getText(), dedent`
        1;0;0
        1;0;1 (**)
        1;0;2
        1;0;3
        1;1;0
        1;1;2 (**)
        1;1;3
        3;0;0
        3;0;1 (**)
        3;0;2 (**)
        3;0;3

      `);

      assert.lengthOf(stagePatch.getFilePatches(), 2);
      const [fp0, fp1] = stagePatch.getFilePatches();
      assert.strictEqual(fp0.getOldPath(), 'file-1.txt');
      assertInFilePatch(fp0, stagePatch.getBuffer()).hunks(
        {
          startRow: 0, endRow: 3,
          header: '@@ -1,3 +1,4 @@',
          regions: [
            {kind: 'unchanged', string: ' 1;0;0\n', range: [[0, 0], [0, 5]]},
            {kind: 'addition', string: '+1;0;1 (**)\n', range: [[1, 0], [1, 10]]},
            {kind: 'unchanged', string: ' 1;0;2\n 1;0;3\n', range: [[2, 0], [3, 5]]},
          ],
        },
        {
          startRow: 4, endRow: 6,
          header: '@@ -10,3 +11,2 @@',
          regions: [
            {kind: 'unchanged', string: ' 1;1;0\n', range: [[4, 0], [4, 5]]},
            {kind: 'deletion', string: '-1;1;2 (**)\n', range: [[5, 0], [5, 10]]},
            {kind: 'unchanged', string: ' 1;1;3\n', range: [[6, 0], [6, 5]]},
          ],
        },
      );

      assert.strictEqual(fp1.getOldPath(), 'file-3.txt');
      assertInFilePatch(fp1, stagePatch.getBuffer()).hunks(
        {
          startRow: 7, endRow: 10,
          header: '@@ -1,3 +1,3 @@',
          regions: [
            {kind: 'unchanged', string: ' 3;0;0\n', range: [[7, 0], [7, 5]]},
            {kind: 'addition', string: '+3;0;1 (**)\n', range: [[8, 0], [8, 10]]},
            {kind: 'deletion', string: '-3;0;2 (**)\n', range: [[9, 0], [9, 10]]},
            {kind: 'unchanged', string: ' 3;0;3\n', range: [[10, 0], [10, 5]]},
          ],
        },
      );
    });

    it('generates a stage patch from an arbitrary hunk', function() {
      const hunk = multiFilePatch.getFilePatches()[0].getHunks()[1];
      const stagePatch = multiFilePatch.getStagePatchForHunk(hunk);

      assert.strictEqual(stagePatch.getBuffer().getText(), dedent`
        0;1;0
        0;1;1
        0;1;2
        0;1;3

      `);
      assert.lengthOf(stagePatch.getFilePatches(), 1);
      const [fp0] = stagePatch.getFilePatches();
      assert.strictEqual(fp0.getOldPath(), 'file-0.txt');
      assert.strictEqual(fp0.getNewPath(), 'file-0.txt');
      assertInFilePatch(fp0, stagePatch.getBuffer()).hunks(
        {
          startRow: 0, endRow: 3,
          header: '@@ -10,3 +10,3 @@',
          regions: [
            {kind: 'unchanged', string: ' 0;1;0\n', range: [[0, 0], [0, 5]]},
            {kind: 'addition', string: '+0;1;1\n', range: [[1, 0], [1, 5]]},
            {kind: 'deletion', string: '-0;1;2\n', range: [[2, 0], [2, 5]]},
            {kind: 'unchanged', string: ' 0;1;3\n', range: [[3, 0], [3, 5]]},
          ],
        },
      );
    });

    it('generates an unstage patch for arbitrary buffer rows', function() {
      const unstagePatch = multiFilePatch.getUnstagePatchForLines(rowSet);

      assert.strictEqual(unstagePatch.getBuffer().getText(), dedent`
        1;0;0
        1;0;1 (**)
        1;0;3
        1;1;0
        1;1;1
        1;1;2 (**)
        1;1;3
        3;0;0
        3;0;1 (**)
        3;0;2 (**)
        3;0;3

      `);

      assert.lengthOf(unstagePatch.getFilePatches(), 2);
      const [fp0, fp1] = unstagePatch.getFilePatches();
      assert.strictEqual(fp0.getOldPath(), 'file-1.txt');
      assertInFilePatch(fp0, unstagePatch.getBuffer()).hunks(
        {
          startRow: 0, endRow: 2,
          header: '@@ -1,3 +1,2 @@',
          regions: [
            {kind: 'unchanged', string: ' 1;0;0\n', range: [[0, 0], [0, 5]]},
            {kind: 'deletion', string: '-1;0;1 (**)\n', range: [[1, 0], [1, 10]]},
            {kind: 'unchanged', string: ' 1;0;3\n', range: [[2, 0], [2, 5]]},
          ],
        },
        {
          startRow: 3, endRow: 6,
          header: '@@ -10,3 +9,4 @@',
          regions: [
            {kind: 'unchanged', string: ' 1;1;0\n 1;1;1\n', range: [[3, 0], [4, 5]]},
            {kind: 'addition', string: '+1;1;2 (**)\n', range: [[5, 0], [5, 10]]},
            {kind: 'unchanged', string: ' 1;1;3\n', range: [[6, 0], [6, 5]]},
          ],
        },
      );

      assert.strictEqual(fp1.getOldPath(), 'file-3.txt');
      assertInFilePatch(fp1, unstagePatch.getBuffer()).hunks(
        {
          startRow: 7, endRow: 10,
          header: '@@ -1,3 +1,3 @@',
          regions: [
            {kind: 'unchanged', string: ' 3;0;0\n', range: [[7, 0], [7, 5]]},
            {kind: 'deletion', string: '-3;0;1 (**)\n', range: [[8, 0], [8, 10]]},
            {kind: 'addition', string: '+3;0;2 (**)\n', range: [[9, 0], [9, 10]]},
            {kind: 'unchanged', string: ' 3;0;3\n', range: [[10, 0], [10, 5]]},
          ],
        },
      );
    });

    it('generates an unstage patch for an arbitrary hunk', function() {
      const hunk = multiFilePatch.getFilePatches()[1].getHunks()[0];
      const unstagePatch = multiFilePatch.getUnstagePatchForHunk(hunk);

      assert.strictEqual(unstagePatch.getBuffer().getText(), dedent`
        1;0;0
        1;0;1 (**)
        1;0;2
        1;0;3

      `);
      assert.lengthOf(unstagePatch.getFilePatches(), 1);
      const [fp0] = unstagePatch.getFilePatches();
      assert.strictEqual(fp0.getOldPath(), 'file-1.txt');
      assert.strictEqual(fp0.getNewPath(), 'file-1.txt');
      assertInFilePatch(fp0, unstagePatch.getBuffer()).hunks(
        {
          startRow: 0, endRow: 3,
          header: '@@ -1,3 +1,3 @@',
          regions: [
            {kind: 'unchanged', string: ' 1;0;0\n', range: [[0, 0], [0, 5]]},
            {kind: 'deletion', string: '-1;0;1 (**)\n', range: [[1, 0], [1, 10]]},
            {kind: 'addition', string: '+1;0;2\n', range: [[2, 0], [2, 5]]},
            {kind: 'unchanged', string: ' 1;0;3\n', range: [[3, 0], [3, 5]]},
          ],
        },
      );
    });
  });

  describe('next selection range derivation', function() {
    it('selects the origin if the new patch is empty', function() {
      const {multiFilePatch: lastMultiPatch} = multiFilePatchBuilder().addFilePatch().build();
      const {multiFilePatch: nextMultiPatch} = multiFilePatchBuilder().build();

      const nextSelectionRange = nextMultiPatch.getNextSelectionRange(lastMultiPatch, new Set());
      assert.deepEqual(nextSelectionRange.serialize(), [[0, 0], [0, 0]]);
    });

    it('selects the first change row if there was no prior selection', function() {
      const {multiFilePatch: lastMultiPatch} = multiFilePatchBuilder().build();
      const {multiFilePatch: nextMultiPatch} = multiFilePatchBuilder().addFilePatch().build();
      const nextSelectionRange = nextMultiPatch.getNextSelectionRange(lastMultiPatch, new Set());
      assert.deepEqual(nextSelectionRange.serialize(), [[1, 0], [1, Infinity]]);
    });

    it('preserves the numeric index of the highest selected change row', function() {
      const {multiFilePatch: lastMultiPatch} = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').added('0', '1', 'x *').unchanged('.'));
          fp.addHunk(h => h.unchanged('.').deleted('2').added('3').unchanged('.'));
        })
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').deleted('4', '5 *', '6').unchanged('.'));
          fp.addHunk(h => h.unchanged('.').added('7').unchanged('.'));
        })
        .build();

      const {multiFilePatch: nextMultiPatch} = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').added('0', '1').unchanged('x', '.'));
          fp.addHunk(h => h.unchanged('.').deleted('2').added('3').unchanged('.'));
        })
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').deleted('4', '6 *').unchanged('.'));
          fp.addHunk(h => h.unchanged('.').added('7').unchanged('.'));
        })
        .build();

      const nextSelectionRange = nextMultiPatch.getNextSelectionRange(lastMultiPatch, new Set([3, 11]));
      assert.deepEqual(nextSelectionRange.serialize(), [[11, 0], [11, Infinity]]);
    });

    describe('when the bottom-most changed row is selected', function() {
      it('selects the bottom-most changed row of the new patch', function() {
        const {multiFilePatch: lastMultiPatch} = multiFilePatchBuilder()
          .addFilePatch(fp => {
            fp.addHunk(h => h.unchanged('.').added('0', '1', 'x').unchanged('.'));
            fp.addHunk(h => h.unchanged('.').deleted('2').added('3').unchanged('.'));
          })
          .addFilePatch(fp => {
            fp.addHunk(h => h.unchanged('.').deleted('4', '5', '6').unchanged('.'));
            fp.addHunk(h => h.unchanged('.').added('7', '8 *').unchanged('.'));
          })
          .build();

        const {multiFilePatch: nextMultiPatch} = multiFilePatchBuilder()
          .addFilePatch(fp => {
            fp.addHunk(h => h.unchanged('.').added('0', '1', 'x').unchanged('.'));
            fp.addHunk(h => h.unchanged('.').deleted('2').added('3').unchanged('.'));
          })
          .addFilePatch(fp => {
            fp.addHunk(h => h.unchanged('.').deleted('4', '5', '6').unchanged('.'));
            fp.addHunk(h => h.unchanged('.').added('7').unchanged('.'));
          })
          .build();

        const nextSelectionRange = nextMultiPatch.getNextSelectionRange(lastMultiPatch, new Set([16]));
        assert.deepEqual(nextSelectionRange.serialize(), [[15, 0], [15, Infinity]]);
      });
    });

    it('skips hunks that were completely selected', function() {
      const {multiFilePatch: lastMultiPatch} = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').added('0').unchanged('.'));
          fp.addHunk(h => h.unchanged('.').added('x *', 'x *').unchanged('.'));
        })
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').deleted('x *').unchanged('.'));
        })
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').added('x *', '1').deleted('2').unchanged('.'));
          fp.addHunk(h => h.unchanged('.').deleted('x *').unchanged('.'));
          fp.addHunk(h => h.unchanged('.', '.').deleted('4', '5 *', '6').unchanged('.'));
          fp.addHunk(h => h.unchanged('.').deleted('7', '8').unchanged('.', '.'));
        })
        .build();

      const {multiFilePatch: nextMultiPatch} = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.').added('0').unchanged('.'));
        })
        .addFilePatch(fp => {
          fp.addHunk(h => h.unchanged('.', 'x').added('1').deleted('2').unchanged('.'));
          fp.addHunk(h => h.unchanged('.', '.').deleted('4', '6 +').unchanged('.'));
          fp.addHunk(h => h.unchanged('.').deleted('7', '8').unchanged('.', '.'));
        })
        .build();

      const nextSelectionRange = nextMultiPatch.getNextSelectionRange(
        lastMultiPatch,
        new Set([4, 5, 8, 11, 16, 21]),
      );
      assert.deepEqual(nextSelectionRange.serialize(), [[11, 0], [11, Infinity]]);
    });
  });

  describe('file-patch spanning selection detection', function() {
    let multiFilePatch;

    beforeEach(function() {
      multiFilePatch = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-0'));
          fp.addHunk(h => h.unchanged('0').added('1').deleted('2', '3').unchanged('4'));
          fp.addHunk(h => h.unchanged('5').added('6').unchanged('7'));
        })
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-1'));
          fp.addHunk(h => h.unchanged('8').deleted('9', '10').unchanged('11'));
        })
        .build()
        .multiFilePatch;
    });

    it('with buffer positions belonging to a single patch', function() {
      assert.isFalse(multiFilePatch.spansMultipleFiles([1, 5]));
    });

    it('with buffer positions belonging to multiple patches', function() {
      assert.isTrue(multiFilePatch.spansMultipleFiles([6, 10]));
    });
  });

  describe('isPatchTooLargeOrCollapsed', function() {
    let multiFilePatch;
    const {largeDiffThreshold} = DEFAULT_OPTIONS;
    beforeEach(function() {
      multiFilePatch = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-0'));
          // do we even give a shit about the hunks here?
          fp.addHunk(h => h.unchanged('0').added('1').deleted('2', '3').unchanged('4'));
          fp.addHunk(h => h.unchanged('5').added('6').unchanged('7'));
        })
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file-1'));
          fp.addHunk(h => h.unchanged('8').deleted('9', '10').unchanged('11'));
        })
        .build()
        .multiFilePatch;
    });
    it('returns true if patch exceeds large diff threshold', function() {
      // todo: what is the best way to use the patch builder to build at patch that
      // exceeds the large diff threshold?
    });

    it('returns true if patch is collapsed', function() {
    });

    it('returns false if patch does not exceed large diff threshold and is not collapsed', function() {
      assert.isFalse(multiFilePatch.isPatchTooLargeOrCollapsed('file-1'));
    });

    it('returns null if patch does not exist', function() {
      assert.isNull(multiFilePatch.isPatchTooLargeOrCollapsed('invalid-file-path'));
    });
  });


  describe('diff position translation', function() {
    it('offsets rows in the first hunk by the first hunk header', function() {
      const {multiFilePatch} = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file.txt'));
          fp.addHunk(h => {
            h.unchanged('0 (1)').added('1 (2)', '2 (3)').deleted('3 (4)', '4 (5)', '5 (6)').unchanged('6 (7)');
          });
        })
        .build();

      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('file.txt', 1), 0);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('file.txt', 7), 6);
    });

    it('offsets rows by the number of hunks before the diff row', function() {
      const {multiFilePatch} = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('file.txt'));
          fp.addHunk(h => h.unchanged('0 (1)').added('1 (2)', '2 (3)').deleted('3 (4)').unchanged('4 (5)'));
          fp.addHunk(h => h.unchanged('5 (7)').added('6 (8)', '7 (9)', '8 (10)').unchanged('9 (11)'));
          fp.addHunk(h => h.unchanged('10 (13)').deleted('11 (14)').unchanged('12 (15)'));
        })
        .build();

      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('file.txt', 7), 5);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('file.txt', 11), 9);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('file.txt', 13), 10);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('file.txt', 15), 12);
    });

    it('resets the offset at the start of each file patch', function() {
      const {multiFilePatch} = multiFilePatchBuilder()
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('0.txt'));
          fp.addHunk(h => h.unchanged('0 (1)').added('1 (2)', '2 (3)').unchanged('3 (4)')); // Offset +1
          fp.addHunk(h => h.unchanged('4 (6)').deleted('5 (7)', '6 (8)', '7 (9)').unchanged('8 (10)')); // Offset +2
          fp.addHunk(h => h.unchanged('9 (12)').deleted('10 (13)').unchanged('11 (14)')); // Offset +3
        })
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('1.txt'));
          fp.addHunk(h => h.unchanged('12 (1)').added('13 (2)').unchanged('14 (3)')); // Offset +1
          fp.addHunk(h => h.unchanged('15 (5)').deleted('16 (6)', '17 (7)', '18 (8)').unchanged('19 (9)')); // Offset +2
        })
        .addFilePatch(fp => {
          fp.setOldFile(f => f.path('2.txt'));
          fp.addHunk(h => h.unchanged('20 (1)').added('21 (2)', '22 (3)', '23 (4)', '24 (5)').unchanged('25 (6)')); // Offset +1
          fp.addHunk(h => h.unchanged('26 (8)').deleted('27 (9)', '28 (10)').unchanged('29 (11)')); // Offset +2
          fp.addHunk(h => h.unchanged('30 (13)').added('31 (14)').unchanged('32 (15)')); // Offset +3
        })
        .build();

      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('0.txt', 1), 0);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('0.txt', 4), 3);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('0.txt', 6), 4);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('0.txt', 10), 8);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('0.txt', 12), 9);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('0.txt', 14), 11);

      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('1.txt', 1), 12);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('1.txt', 3), 14);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('1.txt', 5), 15);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('1.txt', 9), 19);

      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('2.txt', 1), 20);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('2.txt', 6), 25);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('2.txt', 8), 26);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('2.txt', 11), 29);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('2.txt', 13), 30);
      assert.strictEqual(multiFilePatch.getBufferRowForDiffPosition('2.txt', 15), 32);
    });
  });

  describe('collapsing and expanding file patches', function() {
    function hunk({index, start, last}) {
      return {
        startRow: start, endRow: start + 3,
        header: '@@ -1,4 +1,2 @@',
        regions: [
          {kind: 'unchanged', string: ` ${index}-0\n`, range: [[start, 0], [start, 3]]},
          {kind: 'deletion', string: `-${index}-1\n-${index}-2\n`, range: [[start + 1, 0], [start + 2, 3]]},
          {kind: 'unchanged', string: ` ${index}-3${last ? '' : '\n'}`, range: [[start + 3, 0], [start + 3, 3]]},
        ],
      };
    }

    function patchTextForIndexes(indexes) {
      return indexes.map(index => {
        return dedent`
        ${index}-0
        ${index}-1
        ${index}-2
        ${index}-3
        `;
      }).join('\n');
    }

    describe('when there is a single file patch', function() {
      it('collapses and expands the only file patch', function() {
        const {multiFilePatch} = multiFilePatchBuilder()
          .addFilePatch(fp => {
            fp.setOldFile(f => f.path('0.txt'));
            fp.addHunk(h => h.oldRow(1).unchanged('0-0').deleted('0-1', '0-2').unchanged('0-3'));
          })
          .build();

        const [fp0] = multiFilePatch.getFilePatches();

        multiFilePatch.collapseFilePatch(fp0);
        assert.strictEqual(multiFilePatch.getBuffer().getText(), '');
        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks();

        multiFilePatch.expandFilePatch(fp0);
        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0]));
        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0, last: true}));
      });
    });

    describe('when there are multiple file patches', function() {
      let multiFilePatch, fp0, fp1, fp2, fp3;
      beforeEach(function() {
        const {multiFilePatch: mfp} = multiFilePatchBuilder()
          .addFilePatch(fp => {
            fp.setOldFile(f => f.path('0.txt'));
            fp.addHunk(h => h.oldRow(1).unchanged('0-0').deleted('0-1', '0-2').unchanged('0-3'));
          })
          .addFilePatch(fp => {
            fp.setOldFile(f => f.path('1.txt'));
            fp.addHunk(h => h.oldRow(1).unchanged('1-0').deleted('1-1', '1-2').unchanged('1-3'));
          })
          .addFilePatch(fp => {
            fp.setOldFile(f => f.path('2.txt'));
            fp.addHunk(h => h.oldRow(1).unchanged('2-0').deleted('2-1', '2-2').unchanged('2-3'));
          })
          .addFilePatch(fp => {
            fp.setOldFile(f => f.path('3.txt'));
            fp.addHunk(h => h.oldRow(1).unchanged('3-0').deleted('3-1', '3-2').unchanged('3-3'));
          })
          .build();

        multiFilePatch = mfp;
        const patches = multiFilePatch.getFilePatches();
        fp0 = patches[0];
        fp1 = patches[1];
        fp2 = patches[2];
        fp3 = patches[3];
      });

      it('collapses and expands the first file patch with all following expanded', function() {
        multiFilePatch.collapseFilePatch(fp0);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([1, 2, 3]));
        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks(hunk({index: 1, start: 0}));
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks(hunk({index: 2, start: 4}));
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 8, last: true}));

        multiFilePatch.expandFilePatch(fp0);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0, 1, 2, 3]));

        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0}));
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks(hunk({index: 1, start: 4}));
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks(hunk({index: 2, start: 8}));
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 12, last: true}));
      });

      it('collapses and expands an intermediate file patch while all previous patches are collapsed', function() {
        // collapse pervious files
        multiFilePatch.collapseFilePatch(fp0);
        multiFilePatch.collapseFilePatch(fp1);

        // collapse intermediate file
        multiFilePatch.collapseFilePatch(fp2);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([3]));
        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 0, last: true}));

        multiFilePatch.expandFilePatch(fp2);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([2, 3]));

        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks(hunk({index: 2, start: 0}));
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 4, last: true}));
      });

      it('collapses and expands an intermediate file patch while all following patches are collapsed', function() {
        // collapse following files
        multiFilePatch.collapseFilePatch(fp2);
        multiFilePatch.collapseFilePatch(fp3);

        // collapse intermediate file
        multiFilePatch.collapseFilePatch(fp1);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0]));
        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0, last: true}));
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks();

        multiFilePatch.expandFilePatch(fp1);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0, 1]));

        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0}));
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks(hunk({index: 1, start: 4, last: true}));
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks();
      });

      it('collapses and expands a file patch with uncollapsed file patches before and after it', function() {
        multiFilePatch.collapseFilePatch(fp2);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0, 1, 3]));
        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0}));
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks(hunk({index: 1, start: 4}));
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks();
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 8, last: true}));

        multiFilePatch.expandFilePatch(fp2);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0, 1, 2, 3]));

        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0}));
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks(hunk({index: 1, start: 4}));
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks(hunk({index: 2, start: 8}));
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 12, last: true}));
      });

      it('collapses and expands the final file patch with all previous expanded', function() {
        multiFilePatch.collapseFilePatch(fp3);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0, 1, 2]));
        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0}));
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks(hunk({index: 1, start: 4}));
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks(hunk({index: 2, start: 8, last: true}));
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks();

        multiFilePatch.expandFilePatch(fp3);

        assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0, 1, 2, 3]));

        assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0}));
        assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks(hunk({index: 1, start: 4}));
        assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks(hunk({index: 2, start: 8}));
        assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 12, last: true}));
      });

      describe('when all patches are collapsed', function() {
        it('expands the first file patch', function() {
          multiFilePatch.collapseFilePatch(fp0);
          multiFilePatch.collapseFilePatch(fp1);
          multiFilePatch.collapseFilePatch(fp2);
          multiFilePatch.collapseFilePatch(fp3);

          assert.strictEqual(multiFilePatch.getBuffer().getText(), '');

          multiFilePatch.expandFilePatch(fp0);

          assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([0]));

          assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks(hunk({index: 0, start: 0, last: true}));
          assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks();
          assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks();
          assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks();
        });

        it('expands a non-first file patch', function() {
          multiFilePatch.collapseFilePatch(fp0);
          multiFilePatch.collapseFilePatch(fp1);
          multiFilePatch.collapseFilePatch(fp2);
          multiFilePatch.collapseFilePatch(fp3);

          assert.strictEqual(multiFilePatch.getBuffer().getText(), '');

          multiFilePatch.expandFilePatch(fp2);

          assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([2]));

          assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks();
          assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks();
          assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks(hunk({index: 2, start: 0, last: true}));
          assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks();
        });

        it('expands the final file patch', function() {
          multiFilePatch.collapseFilePatch(fp0);
          multiFilePatch.collapseFilePatch(fp1);
          multiFilePatch.collapseFilePatch(fp2);
          multiFilePatch.collapseFilePatch(fp3);

          assert.strictEqual(multiFilePatch.getBuffer().getText(), '');

          multiFilePatch.expandFilePatch(fp3);

          assert.strictEqual(multiFilePatch.getBuffer().getText(), patchTextForIndexes([3]));

          assertInFilePatch(fp0, multiFilePatch.getBuffer()).hunks();
          assertInFilePatch(fp1, multiFilePatch.getBuffer()).hunks();
          assertInFilePatch(fp2, multiFilePatch.getBuffer()).hunks();
          assertInFilePatch(fp3, multiFilePatch.getBuffer()).hunks(hunk({index: 3, start: 0, last: true}));
        });
      });

      it('is deterministic regardless of the order in which collapse and expand operations are performed');
    });
  });
});
