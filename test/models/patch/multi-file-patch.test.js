import dedent from 'dedent-js';

import {multiFilePatchBuilder, filePatchBuilder} from '../../builder/patch';

import MultiFilePatch from '../../../lib/models/patch/multi-file-patch';
import {assertInFilePatch} from '../../helpers';

describe('MultiFilePatch', function() {
  it('creates an empty patch when constructed with no arguments', function() {
    const empty = new MultiFilePatch({});
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

    it('creates a copy with a new buffer and layer set', function() {
      const {buffer, layers} = multiFilePatchBuilder().build();
      const dup = original.clone({buffer, layers});

      assert.strictEqual(dup.getBuffer(), buffer);
      assert.strictEqual(dup.getPatchLayer(), layers.patch);
      assert.strictEqual(dup.getHunkLayer(), layers.hunk);
      assert.strictEqual(dup.getUnchangedLayer(), layers.unchanged);
      assert.strictEqual(dup.getAdditionLayer(), layers.addition);
      assert.strictEqual(dup.getDeletionLayer(), layers.deletion);
      assert.strictEqual(dup.getNoNewlineLayer(), layers.noNewline);
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

    assert.strictEqual(multiFilePatch.getFilePatchAt(0), fps[0]);
    assert.strictEqual(multiFilePatch.getFilePatchAt(9), fps[0]);
    assert.strictEqual(multiFilePatch.getFilePatchAt(10), fps[1]);
    assert.strictEqual(multiFilePatch.getFilePatchAt(99), fps[9]);
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

    assert.strictEqual(multiFilePatch.getHunkAt(0), fp0.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(4), fp0.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(5), fp0.getHunks()[1]);
    assert.strictEqual(multiFilePatch.getHunkAt(9), fp0.getHunks()[1]);
    assert.strictEqual(multiFilePatch.getHunkAt(10), fp1.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(15), fp1.getHunks()[1]);
    assert.strictEqual(multiFilePatch.getHunkAt(16), fp2.getHunks()[0]);
    assert.strictEqual(multiFilePatch.getHunkAt(19), fp2.getHunks()[0]);
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
    const {multiFilePatch: lastMultiPatch, buffer: lastBuffer, layers: lastLayers} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.addHunk(h => h.unchanged('a0').added('a1').deleted('a2').unchanged('a3'));
      })
      .addFilePatch(fp => {
        fp.addHunk(h => h.unchanged('a4').deleted('a5').unchanged('a6'));
        fp.addHunk(h => h.unchanged('a7').added('a8').unchanged('a9'));
      })
      .addFilePatch(fp => {
        fp.addHunk(h => h.oldRow(99).deleted('7').noNewline());
      })
      .build();

    const {multiFilePatch: nextMultiPatch, buffer: nextBuffer, layers: nextLayers} = multiFilePatchBuilder()
      .addFilePatch(fp => {
        fp.addHunk(h => h.unchanged('b0', 'b1').added('b2').unchanged('b3', 'b4'));
      })
      .addFilePatch(fp => {
        fp.addHunk(h => h.unchanged('b5', 'b6').added('b7'));
      })
      .addFilePatch(fp => {
        fp.addHunk(h => h.unchanged('b8', 'b9').deleted('b10').unchanged('b11'));
        fp.addHunk(h => h.oldRow(99).deleted('b12').noNewline());
      })
      .build();

    assert.notStrictEqual(nextBuffer, lastBuffer);
    assert.notStrictEqual(nextLayers, lastLayers);

    nextMultiPatch.adoptBufferFrom(lastMultiPatch);

    assert.strictEqual(nextMultiPatch.getBuffer(), lastBuffer);
    assert.strictEqual(nextMultiPatch.getPatchLayer(), lastLayers.patch);
    assert.strictEqual(nextMultiPatch.getHunkLayer(), lastLayers.hunk);
    assert.strictEqual(nextMultiPatch.getUnchangedLayer(), lastLayers.unchanged);
    assert.strictEqual(nextMultiPatch.getAdditionLayer(), lastLayers.addition);
    assert.strictEqual(nextMultiPatch.getDeletionLayer(), lastLayers.deletion);
    assert.strictEqual(nextMultiPatch.getNoNewlineLayer(), lastLayers.noNewline);

    assert.deepEqual(lastBuffer.getText(), dedent`
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

    assertMarkedLayerRanges(lastLayers.patch, [
      [[0, 0], [4, 2]], [[5, 0], [7, 2]], [[8, 0], [13, 26]],
    ]);
    assertMarkedLayerRanges(lastLayers.hunk, [
      [[0, 0], [4, 2]], [[5, 0], [7, 2]], [[8, 0], [11, 3]], [[12, 0], [13, 26]],
    ]);
    assertMarkedLayerRanges(lastLayers.unchanged, [
      [[0, 0], [1, 2]], [[3, 0], [4, 2]], [[5, 0], [6, 2]], [[8, 0], [9, 2]], [[11, 0], [11, 3]],
    ]);
    assertMarkedLayerRanges(lastLayers.addition, [
      [[2, 0], [2, 2]], [[7, 0], [7, 2]],
    ]);
    assertMarkedLayerRanges(lastLayers.deletion, [
      [[10, 0], [10, 3]], [[12, 0], [12, 3]],
    ]);
    assertMarkedLayerRanges(lastLayers.noNewline, [
      [[13, 0], [13, 26]],
    ]);
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
});
