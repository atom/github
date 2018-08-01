import Change from '../../../lib/models/patch/change';
import {fromBufferRange} from '../../../lib/models/marker-position';

describe('Change', function() {
  it('delegates methods to its MarkerPosition', function() {
    const ch = new Change({
      position: fromBufferRange([[0, 0], [1, 0]]),
      startOffset: 0,
      endOffset: 10,
    });

    const markable = {markBufferRange: sinon.stub().returns(0)};
    assert.strictEqual(ch.markOn(markable, {}), 0);
    assert.deepEqual(markable.markBufferRange.firstCall.args[0].serialize(), [[0, 0], [1, 0]]);

    const marker = {setBufferRange: sinon.stub().returns(1)};
    assert.strictEqual(ch.setIn(marker), 1);
    assert.deepEqual(marker.setBufferRange.firstCall.args[0].serialize(), [[0, 0], [1, 0]]);
  });

  it('extracts its offset range from buffer text with toStringIn()', function() {
    const buffer = '0000\n1111\n2222\n3333\n4444\n5555\n';
    const ch = new Change({
      position: fromBufferRange([[1, 0], [2, 0]]),
      startOffset: 5,
      endOffset: 25,
    });

    assert.strictEqual(ch.toStringIn(buffer, '+'), '+1111\n+2222\n+3333\n+4444\n');
    assert.strictEqual(ch.toStringIn(buffer, '-'), '-1111\n-2222\n-3333\n-4444\n');
  });

  it('returns Changes corresponding to intersecting buffer rows', function() {
    const buffer = '0000\n1111\n2222\n3333\n4444\n5555\n6666\n7777\n8888\n9999';
    const ch = new Change({
      position: fromBufferRange([[1, 0], [8, 0]]),
      startOffset: 5,
      endOffset: 45,
    });

    const intersections = ch.intersectRowsIn(new Set([4, 5]), buffer);
    assert.lengthOf(intersections, 1);
    assert.strictEqual(intersections[0].toStringIn(buffer, '-'), '-4444\n-5555\n');
  });

  it('includes a Change corresponding to an intersection at the end of the range', function() {
    const buffer = '0000\n1111\n2222\n3333\n4444\n5555\n6666\n7777\n8888\n9999';
    const ch = new Change({
      position: fromBufferRange([[1, 0], [8, 0]]),
      startOffset: 5,
      endOffset: 45,
    });

    const intersections = ch.intersectRowsIn(new Set([1, 2, 4, 8]), buffer);
    assert.lengthOf(intersections, 3);

    const int0 = intersections[0];
    assert.strictEqual(int0.toStringIn(buffer, '+'), '+1111\n+2222\n');

    const int1 = intersections[1];
    assert.strictEqual(int1.toStringIn(buffer, '-'), '-4444\n');

    const int2 = intersections[2];
    assert.strictEqual(int2.toStringIn(buffer, '+'), '+8888\n');
  });
});
