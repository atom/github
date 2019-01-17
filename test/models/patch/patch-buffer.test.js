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
    assert.deepEqual(patchBuffer.getInsertionPoint().serialize(), [9, 4]);
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

  describe('deferred-marking modifications', function() {
    it('performs multiple modifications and only creates markers at the end', function() {
      const modifier = patchBuffer.createModifier();
      const cb0 = sinon.spy();
      const cb1 = sinon.spy();

      modifier.append('0010\n');
      modifier.appendMarked('0011\n', 'patch', {invalidate: 'never', callback: cb0});
      modifier.append('0012\n');
      modifier.appendMarked('0013\n0014\n', 'hunk', {invalidate: 'surround', callback: cb1});

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

      modifier.apply();

      assert.lengthOf(patchBuffer.findMarkers('patch', {}), 1);
      const [marker0] = patchBuffer.findMarkers('patch', {});
      assert.isTrue(cb0.calledWith(marker0));

      assert.lengthOf(patchBuffer.findMarkers('hunk', {}), 1);
      const [marker1] = patchBuffer.findMarkers('hunk', {});
      assert.isTrue(cb1.calledWith(marker1));
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
