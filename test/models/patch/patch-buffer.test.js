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
    const m0 = patchBuffer.markRange('patch', [[1, 0], [3, 0]]); // before
    const m1 = patchBuffer.markRange('hunk', [[2, 0], [4, 2]]); // before, ending at the extraction point
    const m2 = patchBuffer.markRange('hunk', [[4, 2], [5, 0]]); // within
    const m3 = patchBuffer.markRange('patch', [[6, 0], [7, 1]]); // within
    const m4 = patchBuffer.markRange('hunk', [[7, 1], [9, 0]]); // after, starting at the extraction point
    const m5 = patchBuffer.markRange('patch', [[8, 0], [10, 0]]); // after

    const {patchBuffer: subPatchBuffer, markerMap} = patchBuffer.extractPatchBuffer([[4, 2], [7, 1]]);

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
    assert.deepEqual(m0.getRange().serialize(), [[1, 0], [3, 0]]);
    assert.deepEqual(m1.getRange().serialize(), [[2, 0], [4, 2]]);
    assert.isTrue(m2.isDestroyed());
    assert.isTrue(m3.isDestroyed());
    assert.deepEqual(m4.getRange().serialize(), [[4, 2], [6, 0]]);
    assert.deepEqual(m5.getRange().serialize(), [[5, 0], [7, 0]]);

    assert.isFalse(markerMap.has(m0));
    assert.isFalse(markerMap.has(m1));
    assert.isFalse(markerMap.has(m4));
    assert.isFalse(markerMap.has(m5));

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
    assert.deepEqual(markerMap.get(m2).getRange().serialize(), [[0, 0], [1, 0]]);
    assert.deepEqual(markerMap.get(m3).getRange().serialize(), [[2, 0], [3, 1]]);
  });

  describe('deleteLastNewline', function() {
    it('is a no-op on an empty buffer', function() {
      const empty = new PatchBuffer();
      assert.strictEqual(empty.getBuffer().getText(), '');
      empty.deleteLastNewline();
      assert.strictEqual(empty.getBuffer().getText(), '');
    });

    it('is a no-op if the buffer does not end with a newline', function() {
      const endsWithoutNL = new PatchBuffer();
      endsWithoutNL.getBuffer().setText('0\n1\n2\n3');
      endsWithoutNL.deleteLastNewline();
      assert.strictEqual(endsWithoutNL.getBuffer().getText(), '0\n1\n2\n3');
    });

    it('deletes the final newline', function() {
      const endsWithNL = new PatchBuffer();
      endsWithNL.getBuffer().setText('0\n1\n2\n3\n');
      endsWithNL.deleteLastNewline();
      assert.strictEqual(endsWithNL.getBuffer().getText(), '0\n1\n2\n3');
    });

    it('deletes at most one trailing newline', function() {
      const endsWithMultiNL = new PatchBuffer();
      endsWithMultiNL.getBuffer().setText('0\n1\n2\n3\n\n\n');
      endsWithMultiNL.deleteLastNewline();
      assert.strictEqual(endsWithMultiNL.getBuffer().getText(), '0\n1\n2\n3\n\n');
    });
  });

  describe('deferred-marking modifications', function() {
    it('performs multiple modifications and only creates markers at the end', function() {
      const inserter = patchBuffer.createInserterAtEnd();
      const cb0 = sinon.spy();
      const cb1 = sinon.spy();
      const cb2 = sinon.spy();

      inserter.markWhile('addition', () => {
        inserter.insert('0010\n');
        inserter.insertMarked('0011\n', 'patch', {invalidate: 'never', callback: cb0});
        inserter.insert('0012\n');
        inserter.insertMarked('0013\n0014\n', 'hunk', {invalidate: 'surround', callback: cb1});
      }, {invalidate: 'never', callback: cb2});

      assert.strictEqual(patchBuffer.getBuffer().getText(), dedent`
        ${TEXT}0010
        0011
        0012
        0013
        0014

      `);

      assert.isFalse(cb0.called);
      assert.isFalse(cb1.called);
      assert.isFalse(cb2.called);
      assert.lengthOf(patchBuffer.findMarkers('addition', {}), 0);
      assert.lengthOf(patchBuffer.findMarkers('patch', {}), 0);
      assert.lengthOf(patchBuffer.findMarkers('hunk', {}), 0);

      inserter.apply();

      assert.lengthOf(patchBuffer.findMarkers('patch', {}), 1);
      const [marker0] = patchBuffer.findMarkers('patch', {});
      assert.isTrue(cb0.calledWith(marker0));

      assert.lengthOf(patchBuffer.findMarkers('hunk', {}), 1);
      const [marker1] = patchBuffer.findMarkers('hunk', {});
      assert.isTrue(cb1.calledWith(marker1));

      assert.lengthOf(patchBuffer.findMarkers('addition', {}), 1);
      const [marker2] = patchBuffer.findMarkers('addition', {});
      assert.isTrue(cb2.calledWith(marker2));
    });

    it('inserts into the middle of an existing buffer', function() {
      const inserter = patchBuffer.createInserterAt([4, 2]);
      const callback = sinon.spy();

      inserter.insert('aa\nbbbb\n');
      inserter.insertMarked('-patch-\n-patch-\n', 'patch', {callback});
      inserter.insertMarked('-hunk-\ndd', 'hunk', {});

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
      inserter.insertMarked('A\nB\nC\nD\nE\n', 'addition', {callback});

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

      const m0 = subPatchBuffer.markPosition('patch', [0, 0]);
      const m1 = subPatchBuffer.markRange('hunk', [[0, 0], [1, 4]]);
      const m2 = subPatchBuffer.markRange('addition', [[1, 2], [2, 2]]);

      const mBefore = patchBuffer.markRange('deletion', [[0, 0], [2, 0]]);
      const mAfter = patchBuffer.markRange('deletion', [[7, 0], [7, 4]]);

      let markerMap;
      patchBuffer
        .createInserterAt([3, 2])
        .insertPatchBuffer(subPatchBuffer, {callback: m => { markerMap = m; }})
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
      assert.isFalse(markerMap.has(mBefore));
      assert.isFalse(markerMap.has(mAfter));

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

      assert.deepEqual(markerMap.get(m0).getRange().serialize(), [[3, 2], [3, 2]]);
      assert.deepEqual(markerMap.get(m1).getRange().serialize(), [[3, 2], [4, 4]]);
      assert.deepEqual(markerMap.get(m2).getRange().serialize(), [[4, 2], [5, 2]]);
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
