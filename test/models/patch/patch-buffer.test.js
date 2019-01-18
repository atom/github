import dedent from 'dedent-js';

import PatchBuffer from '../../../lib/models/patch/patch-buffer';

describe('PatchBuffer', function() {
  let patchBuffer;

  beforeEach(function() {
    patchBuffer = new PatchBuffer();
    patchBuffer.getBuffer().setText(TEXT);
  });

  it('has simple accessors', function() {
    assert.strictEqual(patchBuffer.getBuffer().getText(), TEXT);
    assert.deepEqual(patchBuffer.getInsertionPoint().serialize(), [10, 0]);
  });

  it('creates and finds markers on specified layers', function() {
    const patchMarker = patchBuffer.markRange('patch', [[1, 0], [2, 4]]);
    const hunkMarker = patchBuffer.markRange('hunk', [[2, 0], [3, 4]]);

    assert.deepEqual(patchBuffer.findMarkers('patch', {}), [patchMarker]);
    assert.deepEqual(patchBuffer.findMarkers('hunk', {}), [hunkMarker]);
  });

  it('clears markers from all layers at once', function() {
    patchBuffer.markRange('patch', [[0, 0], [0, 4]]);
    patchBuffer.markPosition('hunk', [0, 1]);

    patchBuffer.clearAllLayers();

    assert.lengthOf(patchBuffer.findMarkers('patch', {}), 0);
    assert.lengthOf(patchBuffer.findMarkers('hunk', {}), 0);
  });

  it('extracts a subset of the buffer and layers as a new LayeredBuffer', function() {
    patchBuffer.markRange('patch', [[1, 0], [3, 0]]); // before
    patchBuffer.markRange('hunk', [[2, 0], [4, 2]]); // before, ending at the extraction point
    patchBuffer.markRange('hunk', [[4, 2], [5, 0]]); // within
    patchBuffer.markRange('patch', [[6, 0], [7, 1]]); // within
    patchBuffer.markRange('hunk', [[7, 1], [9, 0]]); // after, starting at the extraction point
    patchBuffer.markRange('patch', [[8, 0], [10, 0]]); // after

    const subPatchBuffer = patchBuffer.extractPatchBuffer([[4, 2], [7, 1]]);

    assert.strictEqual(patchBuffer.getBuffer().getText(), dedent`
      0000
      0001
      0002
      0003
      00007
      0008
      0009

    `);
    assert.deepEqual(
      patchBuffer.findMarkers('patch', {}).map(m => m.getRange().serialize()),
      [[[1, 0], [3, 0]], [[5, 0], [7, 0]]],
    );
    assert.deepEqual(
      patchBuffer.findMarkers('hunk', {}).map(m => m.getRange().serialize()),
      [[[2, 0], [4, 2]], [[4, 2], [6, 0]]],
    );

    assert.strictEqual(subPatchBuffer.getBuffer().getText(), dedent`
      04
      0005
      0006
      0
    `);
    assert.deepEqual(
      subPatchBuffer.findMarkers('hunk', {}).map(m => m.getRange().serialize()),
      [[[0, 0], [1, 0]]],
    );
    assert.deepEqual(
      subPatchBuffer.findMarkers('patch', {}).map(m => m.getRange().serialize()),
      [[[2, 0], [3, 1]]],
    );
  });

  describe('deferred-marking modifications', function() {
    it('performs multiple modifications and only creates markers at the end', function() {
      const inserter = patchBuffer.createInserterAtEnd();
      const cb0 = sinon.spy();
      const cb1 = sinon.spy();

      inserter.append('0010\n');
      inserter.appendMarked('0011\n', 'patch', {invalidate: 'never', callback: cb0});
      inserter.append('0012\n');
      inserter.appendMarked('0013\n0014\n', 'hunk', {invalidate: 'surround', callback: cb1});

      assert.strictEqual(patchBuffer.getBuffer().getText(), dedent`
        ${TEXT}0010
        0011
        0012
        0013
        0014

      `);

      assert.isFalse(cb0.called);
      assert.isFalse(cb1.called);
      assert.lengthOf(patchBuffer.findMarkers('patch', {}), 0);
      assert.lengthOf(patchBuffer.findMarkers('hunk', {}), 0);

      inserter.apply();

      assert.lengthOf(patchBuffer.findMarkers('patch', {}), 1);
      const [marker0] = patchBuffer.findMarkers('patch', {});
      assert.isTrue(cb0.calledWith(marker0));

      assert.lengthOf(patchBuffer.findMarkers('hunk', {}), 1);
      const [marker1] = patchBuffer.findMarkers('hunk', {});
      assert.isTrue(cb1.calledWith(marker1));
    });

    it('inserts into the middle of an existing buffer', function() {
      const inserter = patchBuffer.createInserterAt([4, 2]);
      const callback = sinon.spy();

      inserter.append('aa\nbbbb\n');
      inserter.appendMarked('-patch-\n-patch-\n', 'patch', {callback});
      inserter.appendMarked('-hunk-\ndd', 'hunk', {});

      assert.strictEqual(patchBuffer.getBuffer().getText(), dedent`
        0000
        0001
        0002
        0003
        00aa
        bbbb
        -patch-
        -patch-
        -hunk-
        dd04
        0005
        0006
        0007
        0008
        0009

      `);

      assert.lengthOf(patchBuffer.findMarkers('patch', {}), 0);
      assert.lengthOf(patchBuffer.findMarkers('hunk', {}), 0);
      assert.isFalse(callback.called);

      inserter.apply();

      assert.lengthOf(patchBuffer.findMarkers('patch', {}), 1);
      const [marker] = patchBuffer.findMarkers('patch', {});
      assert.isTrue(callback.calledWith(marker));
    });

    it('preserves markers that should be before or after the modification region', function() {
      const before0 = patchBuffer.markRange('patch', [[1, 0], [4, 0]]);
      const before1 = patchBuffer.markPosition('hunk', [4, 0]);
      const after0 = patchBuffer.markPosition('patch', [4, 0]);

      const inserter = patchBuffer.createInserterAt([4, 0]);
      inserter.keepBefore([before0, before1]);
      inserter.keepAfter([after0]);

      let marker = null;
      const callback = m => { marker = m; };
      inserter.appendMarked('A\nB\nC\nD\nE\n', 'addition', {callback});

      inserter.apply();

      assert.deepEqual(before0.getRange().serialize(), [[1, 0], [4, 0]]);
      assert.deepEqual(before1.getRange().serialize(), [[4, 0], [4, 0]]);
      assert.deepEqual(marker.getRange().serialize(), [[4, 0], [9, 0]]);
      assert.deepEqual(after0.getRange().serialize(), [[9, 0], [9, 0]]);
    });

    it('appends another PatchBuffer at its insertion point', function() {
      const subPatchBuffer = new PatchBuffer();
      subPatchBuffer.getBuffer().setText(dedent`
        aaaa
        bbbb
        cc
      `);

      subPatchBuffer.markPosition('patch', [0, 0]);
      subPatchBuffer.markRange('hunk', [[0, 0], [1, 4]]);
      subPatchBuffer.markRange('addition', [[1, 2], [2, 2]]);

      const mBefore = patchBuffer.markRange('deletion', [[0, 0], [2, 0]]);
      const mAfter = patchBuffer.markRange('deletion', [[7, 0], [7, 4]]);

      patchBuffer
        .createInserterAt([3, 2])
        .appendPatchBuffer(subPatchBuffer)
        .apply();

      assert.strictEqual(patchBuffer.getBuffer().getText(), dedent`
        0000
        0001
        0002
        00aaaa
        bbbb
        cc03
        0004
        0005
        0006
        0007
        0008
        0009

      `);

      assert.deepEqual(mBefore.getRange().serialize(), [[0, 0], [2, 0]]);
      assert.deepEqual(mAfter.getRange().serialize(), [[9, 0], [9, 4]]);

      assert.deepEqual(
        patchBuffer.findMarkers('patch', {}).map(m => m.getRange().serialize()),
        [[[3, 2], [3, 2]]],
      );

      assert.deepEqual(
        patchBuffer.findMarkers('hunk', {}).map(m => m.getRange().serialize()),
        [[[3, 2], [4, 4]]],
      );

      assert.deepEqual(
        patchBuffer.findMarkers('addition', {}).map(m => m.getRange().serialize()),
        [[[4, 2], [5, 2]]],
      );
    });
  });
});

const TEXT = dedent`
  0000
  0001
  0002
  0003
  0004
  0005
  0006
  0007
  0008
  0009

`;
