import {TextBuffer} from 'atom';
import dedent from 'dedent-js';

import MultiFilePatch from '../../../lib/models/patch/multi-file-patch';
import FilePatch from '../../../lib/models/patch/file-patch';
import File from '../../../lib/models/patch/file';
import Patch from '../../../lib/models/patch/patch';
import Hunk from '../../../lib/models/patch/hunk';
import {Unchanged, Addition, Deletion} from '../../../lib/models/patch/region';
import {assertInFilePatch} from '../../helpers';

describe('MultiFilePatch', function() {
  let buffer, layers;

  beforeEach(function() {
    buffer = new TextBuffer();
    layers = {
      patch: buffer.addMarkerLayer(),
      hunk: buffer.addMarkerLayer(),
      unchanged: buffer.addMarkerLayer(),
      addition: buffer.addMarkerLayer(),
      deletion: buffer.addMarkerLayer(),
      noNewline: buffer.addMarkerLayer(),
    };
  });

  it('has an accessor for its file patches', function() {
    const filePatches = [buildFilePatchFixture(0), buildFilePatchFixture(1)];
    const mp = new MultiFilePatch(buffer, layers, filePatches);
    assert.strictEqual(mp.getFilePatches(), filePatches);
  });

  it('locates an individual FilePatch by marker lookup', function() {
    const filePatches = [];
    for (let i = 0; i < 10; i++) {
      filePatches.push(buildFilePatchFixture(i));
    }
    const mp = new MultiFilePatch(buffer, layers, filePatches);

    assert.strictEqual(mp.getFilePatchAt(0), filePatches[0]);
    assert.strictEqual(mp.getFilePatchAt(7), filePatches[0]);
    assert.strictEqual(mp.getFilePatchAt(8), filePatches[1]);
    assert.strictEqual(mp.getFilePatchAt(79), filePatches[9]);
  });

  it('locates a Hunk by marker lookup', function() {
    const filePatches = [
      buildFilePatchFixture(0),
      buildFilePatchFixture(1),
      buildFilePatchFixture(2),
    ];
    const mp = new MultiFilePatch(buffer, layers, filePatches);

    assert.strictEqual(mp.getHunkAt(0), filePatches[0].getHunks()[0]);
    assert.strictEqual(mp.getHunkAt(3), filePatches[0].getHunks()[0]);
    assert.strictEqual(mp.getHunkAt(4), filePatches[0].getHunks()[1]);
    assert.strictEqual(mp.getHunkAt(7), filePatches[0].getHunks()[1]);
    assert.strictEqual(mp.getHunkAt(8), filePatches[1].getHunks()[0]);
    assert.strictEqual(mp.getHunkAt(15), filePatches[1].getHunks()[1]);
    assert.strictEqual(mp.getHunkAt(16), filePatches[2].getHunks()[0]);
    assert.strictEqual(mp.getHunkAt(23), filePatches[2].getHunks()[1]);
  });

  it('adopts a buffer from a previous patch', function() {
    const lastBuffer = buffer;
    const lastLayers = layers;
    const lastFilePatches = [
      buildFilePatchFixture(0),
      buildFilePatchFixture(1),
      buildFilePatchFixture(2),
    ];
    const lastPatch = new MultiFilePatch(lastBuffer, layers, lastFilePatches);

    buffer = new TextBuffer();
    layers = {
      patch: buffer.addMarkerLayer(),
      hunk: buffer.addMarkerLayer(),
      unchanged: buffer.addMarkerLayer(),
      addition: buffer.addMarkerLayer(),
      deletion: buffer.addMarkerLayer(),
      noNewline: buffer.addMarkerLayer(),
    };
    const nextFilePatches = [
      buildFilePatchFixture(0),
      buildFilePatchFixture(1),
      buildFilePatchFixture(2),
      buildFilePatchFixture(3),
    ];
    const nextPatch = new MultiFilePatch(buffer, layers, nextFilePatches);

    nextPatch.adoptBufferFrom(lastPatch);

    assert.strictEqual(nextPatch.getBuffer(), lastBuffer);
    assert.strictEqual(nextPatch.getPatchLayer(), lastLayers.patch);
    assert.strictEqual(nextPatch.getHunkLayer(), lastLayers.hunk);
    assert.strictEqual(nextPatch.getUnchangedLayer(), lastLayers.unchanged);
    assert.strictEqual(nextPatch.getAdditionLayer(), lastLayers.addition);
    assert.strictEqual(nextPatch.getDeletionLayer(), lastLayers.deletion);
    assert.strictEqual(nextPatch.getNoNewlineLayer(), lastLayers.noNewline);

    assert.lengthOf(nextPatch.getHunkLayer().getMarkers(), 8);
  });

  it('generates a stage patch for arbitrary buffer rows', function() {
    const filePatches = [
      buildFilePatchFixture(0),
      buildFilePatchFixture(1),
      buildFilePatchFixture(2),
      buildFilePatchFixture(3),
    ];
    const original = new MultiFilePatch(buffer, layers, filePatches);
    const stagePatch = original.getStagePatchForLines(new Set([18, 24, 44, 45]));

    assert.strictEqual(stagePatch.getBuffer().getText(), dedent`
      file-1 line-0
      file-1 line-1
      file-1 line-2
      file-1 line-3
      file-1 line-4
      file-1 line-6
      file-1 line-7
      file-3 line-0
      file-3 line-1
      file-3 line-2
      file-3 line-3
    `);

    assert.lengthOf(stagePatch.getFilePatches(), 2);
    const [fp0, fp1] = stagePatch.getFilePatches();
    assert.strictEqual(fp0.getOldPath(), 'file-1.txt');
    assertInFilePatch(fp0, buffer).hunks(
      {
        startRow: 0, endRow: 3,
        header: '@@ -0,4 +0,3 @@',
        regions: [
          {kind: 'unchanged', string: ' file-1 line-0\n', range: [[0, 0], [0, 13]]},
          {kind: 'addition', string: '+file-1 line-1\n', range: [[1, 0], [1, 13]]},
          {kind: 'unchanged', string: ' file-1 line-2\n file-1 line-3\n', range: [[2, 0], [3, 13]]},
        ],
      },
      {
        startRow: 4, endRow: 8,
        header: '@@ -10,3 +9,3 @@',
        regions: [
          {kind: 'unchanged', string: ' file-1 line-4\n', range: [[4, 0], [4, 13]]},
          {kind: 'deletion', string: '-file-1 line-6\n', range: [[5, 0], [5, 13]]},
          {kind: 'unchanged', string: ' file-1 line-7\n', range: [[6, 0], [6, 13]]},
        ],
      },
    );

    assert.strictEqual(fp1.getOldPath(), 'file-3.txt');
    assertInFilePatch(fp1, buffer).hunks(
      {
        startRow: 9, endRow: 12,
        header: '@@ -0,3 +0.3 @@',
        regions: [
          {kind: 'unchanged', string: ' file-3 line-0\n', range: [[7, 0], [7, 13]]},
          {kind: 'addition', string: '+file-3 line-1\n', range: [[8, 0], [8, 13]]},
          {kind: 'deletion', string: '-file-3 line-2\n', range: [[9, 0], [9, 13]]},
          {kind: 'unchanged', string: ' file-3 line-3\n', range: [[10, 0], [10, 13]]},
        ],
      },
    );
  });

  // FIXME adapt these to the lifted method.
  // describe('next selection range derivation', function() {
  //   it('selects the first change region after the highest buffer row', function() {
  //     const lastPatch = buildPatchFixture();
  //     // Selected:
  //     //  deletions (1-2) and partial addition (4 from 3-5) from hunk 0
  //     //  one deletion row (13 from 12-16) from the middle of hunk 1;
  //     //  nothing in hunks 2 or 3
  //     const lastSelectedRows = new Set([1, 2, 4, 5, 13]);
  //
  //     const nBuffer = new TextBuffer({text:
  //         // 0   1     2     3     4
  //         '0000\n0003\n0004\n0005\n0006\n' +
  //         // 5   6     7     8     9     10    11    12    13    14   15
  //         '0007\n0008\n0009\n0010\n0011\n0012\n0014\n0015\n0016\n0017\n0018\n' +
  //         // 16  17    18    19    20
  //         '0019\n0020\n0021\n0022\n0023\n' +
  //         // 21  22     23
  //         '0024\n0025\n No newline at end of file\n',
  //     });
  //     const nLayers = buildLayers(nBuffer);
  //     const nHunks = [
  //       new Hunk({
  //         oldStartRow: 3, oldRowCount: 3, newStartRow: 3, newRowCount: 5, // next row drift = +2
  //         marker: markRange(nLayers.hunk, 0, 4),
  //         regions: [
  //           new Unchanged(markRange(nLayers.unchanged, 0)), // 0
  //           new Addition(markRange(nLayers.addition, 1)), // + 1
  //           new Unchanged(markRange(nLayers.unchanged, 2)), // 2
  //           new Addition(markRange(nLayers.addition, 3)), // + 3
  //           new Unchanged(markRange(nLayers.unchanged, 4)), // 4
  //         ],
  //       }),
  //       new Hunk({
  //         oldStartRow: 12, oldRowCount: 9, newStartRow: 14, newRowCount: 7, // next row drift = +2 -2 = 0
  //         marker: markRange(nLayers.hunk, 5, 15),
  //         regions: [
  //           new Unchanged(markRange(nLayers.unchanged, 5)), // 5
  //           new Addition(markRange(nLayers.addition, 6)), // +6
  //           new Unchanged(markRange(nLayers.unchanged, 7, 9)), // 7 8 9
  //           new Deletion(markRange(nLayers.deletion, 10, 13)), // -10 -11 -12 -13
  //           new Addition(markRange(nLayers.addition, 14)), // +14
  //           new Unchanged(markRange(nLayers.unchanged, 15)), // 15
  //         ],
  //       }),
  //       new Hunk({
  //         oldStartRow: 26, oldRowCount: 4, newStartRow: 26, newRowCount: 3, // next row drift = 0 -1 = -1
  //         marker: markRange(nLayers.hunk, 16, 20),
  //         regions: [
  //           new Unchanged(markRange(nLayers.unchanged, 16)), // 16
  //           new Addition(markRange(nLayers.addition, 17)), // +17
  //           new Deletion(markRange(nLayers.deletion, 18, 19)), // -18 -19
  //           new Unchanged(markRange(nLayers.unchanged, 20)), // 20
  //         ],
  //       }),
  //       new Hunk({
  //         oldStartRow: 32, oldRowCount: 1, newStartRow: 31, newRowCount: 2,
  //         marker: markRange(nLayers.hunk, 22, 24),
  //         regions: [
  //           new Unchanged(markRange(nLayers.unchanged, 22)), // 22
  //           new Addition(markRange(nLayers.addition, 23)), // +23
  //           new NoNewline(markRange(nLayers.noNewline, 24)),
  //         ],
  //       }),
  //     ];
  //     const nextPatch = new Patch({status: 'modified', hunks: nHunks, buffer: nBuffer, layers: nLayers});
  //
  //     const nextRange = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
  //     // Original buffer row 14 = the next changed row = new buffer row 11
  //     assert.deepEqual(nextRange, [[11, 0], [11, Infinity]]);
  //   });
  //
  //   it('offsets the chosen selection index by hunks that were completely selected', function() {
  //     const buffer = buildBuffer(11);
  //     const layers = buildLayers(buffer);
  //     const lastPatch = new Patch({
  //       status: 'modified',
  //       hunks: [
  //         new Hunk({
  //           oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 3,
  //           marker: markRange(layers.hunk, 0, 5),
  //           regions: [
  //             new Unchanged(markRange(layers.unchanged, 0)),
  //             new Addition(markRange(layers.addition, 1, 2)),
  //             new Deletion(markRange(layers.deletion, 3, 4)),
  //             new Unchanged(markRange(layers.unchanged, 5)),
  //           ],
  //         }),
  //         new Hunk({
  //           oldStartRow: 5, oldRowCount: 4, newStartRow: 5, newRowCount: 4,
  //           marker: markRange(layers.hunk, 6, 11),
  //           regions: [
  //             new Unchanged(markRange(layers.unchanged, 6)),
  //             new Addition(markRange(layers.addition, 7, 8)),
  //             new Deletion(markRange(layers.deletion, 9, 10)),
  //             new Unchanged(markRange(layers.unchanged, 11)),
  //           ],
  //         }),
  //       ],
  //       buffer,
  //       layers,
  //     });
  //       // Select:
  //       // * all changes from hunk 0
  //       // * partial addition (8 of 7-8) from hunk 1
  //     const lastSelectedRows = new Set([1, 2, 3, 4, 8]);
  //
  //     const nextBuffer = new TextBuffer({text: '0006\n0007\n0008\n0009\n0010\n0011\n'});
  //     const nextLayers = buildLayers(nextBuffer);
  //     const nextPatch = new Patch({
  //       status: 'modified',
  //       hunks: [
  //         new Hunk({
  //           oldStartRow: 5, oldRowCount: 4, newStartRow: 5, newRowCount: 4,
  //           marker: markRange(nextLayers.hunk, 0, 5),
  //           regions: [
  //             new Unchanged(markRange(nextLayers.unchanged, 0)),
  //             new Addition(markRange(nextLayers.addition, 1)),
  //             new Deletion(markRange(nextLayers.deletion, 3, 4)),
  //             new Unchanged(markRange(nextLayers.unchanged, 5)),
  //           ],
  //         }),
  //       ],
  //       buffer: nextBuffer,
  //       layers: nextLayers,
  //     });
  //
  //     const range = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
  //     assert.deepEqual(range, [[3, 0], [3, Infinity]]);
  //   });
  //
  //   it('selects the first row of the first change of the patch if no rows were selected before', function() {
  //     const lastPatch = buildPatchFixture();
  //     const lastSelectedRows = new Set();
  //
  //     const buffer = lastPatch.getBuffer();
  //     const layers = buildLayers(buffer);
  //     const nextPatch = new Patch({
  //       status: 'modified',
  //       hunks: [
  //         new Hunk({
  //           oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 4,
  //           marker: markRange(layers.hunk, 0, 4),
  //           regions: [
  //             new Unchanged(markRange(layers.unchanged, 0)),
  //             new Addition(markRange(layers.addition, 1, 2)),
  //             new Deletion(markRange(layers.deletion, 3)),
  //             new Unchanged(markRange(layers.unchanged, 4)),
  //           ],
  //         }),
  //       ],
  //       buffer,
  //       layers,
  //     });
  //
  //     const range = nextPatch.getNextSelectionRange(lastPatch, lastSelectedRows);
  //     assert.deepEqual(range, [[1, 0], [1, Infinity]]);
  //   });
  // });

  function buildFilePatchFixture(index) {
    const rowOffset = buffer.getLastRow();
    for (let i = 0; i < 8; i++) {
      buffer.append(`file-${index} line-${i}\n`);
    }

    const mark = (layer, start, end = start) => layer.markRange([[rowOffset + start, 0], [rowOffset + end, Infinity]]);

    const hunks = [
      new Hunk({
        oldStartRow: 0, newStartRow: 0, oldRowCount: 3, newRowCount: 3,
        sectionHeading: `file-${index} hunk-0`,
        marker: mark(layers.hunk, 0, 3),
        regions: [
          new Unchanged(mark(layers.unchanged, 0)),
          new Addition(mark(layers.addition, 1)),
          new Deletion(mark(layers.deletion, 2)),
          new Unchanged(mark(layers.unchanged, 3)),
        ],
      }),
      new Hunk({
        oldStartRow: 10, newStartRow: 10, oldRowCount: 3, newRowCount: 3,
        sectionHeading: `file-${index} hunk-1`,
        marker: mark(layers.hunk, 4, 7),
        regions: [
          new Unchanged(mark(layers.unchanged, 4)),
          new Addition(mark(layers.addition, 5)),
          new Deletion(mark(layers.deletion, 6)),
          new Unchanged(mark(layers.unchanged, 7)),
        ],
      }),
    ];

    const marker = mark(layers.patch, 0, 7);
    const patch = new Patch({status: 'modified', hunks, marker});

    const oldFile = new File({path: `file-${index}.txt`, mode: '100644'});
    const newFile = new File({path: `file-${index}.txt`, mode: '100644'});

    return new FilePatch(oldFile, newFile, patch);
  }
});
