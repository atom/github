import {
  nullPosition, fromBufferRange, fromBufferPosition, fromScreenRange, fromScreenPosition, fromMarker, fromChangeEvent,
} from '../../lib/models/marker-position';

describe('MarkerPosition', function() {
  let atomEnv, editor;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();

    editor = await atomEnv.workspace.open(__filename);
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  describe('markOn', function() {
    it('marks a buffer range', function() {
      const position = fromBufferRange([[1, 0], [4, 0]]);
      const marker = position.markOn(editor, {invalidate: 'never'});

      assert.deepEqual(marker.getBufferRange().serialize(), [[1, 0], [4, 0]]);
      assert.strictEqual(marker.getInvalidationStrategy(), 'never');
    });

    it('marks a buffer position', function() {
      const position = fromBufferPosition([2, 0]);
      const marker = position.markOn(editor, {invalidate: 'never'});

      assert.deepEqual(marker.getBufferRange().serialize(), [[2, 0], [2, 0]]);
      assert.strictEqual(marker.getInvalidationStrategy(), 'never');
    });

    it('marks a screen range', function() {
      const position = fromScreenRange([[2, 0], [5, 0]]);
      const marker = position.markOn(editor, {invalidate: 'never'});

      assert.deepEqual(marker.getBufferRange().serialize(), [[2, 0], [5, 0]]);
      assert.strictEqual(marker.getInvalidationStrategy(), 'never');
    });

    it('marks a screen position', function() {
      const position = fromScreenPosition([3, 0]);
      const marker = position.markOn(editor, {invalidate: 'never'});

      assert.deepEqual(marker.getBufferRange().serialize(), [[3, 0], [3, 0]]);
      assert.strictEqual(marker.getInvalidationStrategy(), 'never');
    });

    it('marks a combination position', function() {
      const marker0 = editor.markBufferRange([[0, 0], [2, 0]]);
      const position = fromMarker(marker0);

      const marker1 = position.markOn(editor, {invalidate: 'never'});
      assert.deepEqual(marker1.getBufferRange().serialize(), [[0, 0], [2, 0]]);
      assert.strictEqual(marker1.getInvalidationStrategy(), 'never');
    });

    it('does nothing with a nullPosition', function() {
      assert.isNull(nullPosition.markOn(editor, {}));
      assert.lengthOf(editor.findMarkers({}), 0);
    });
  });

  describe('setIn', function() {
    let marker;

    beforeEach(function() {
      marker = editor.markBufferRange([[1, 0], [3, 0]]);
    });

    it('updates an existing marker by buffer range', function() {
      fromBufferRange([[2, 0], [4, 0]]).setIn(marker);
      assert.deepEqual(marker.getBufferRange().serialize(), [[2, 0], [4, 0]]);
    });

    it('updates an existing marker by screen range', function() {
      fromScreenRange([[6, 0], [7, 0]]).setIn(marker);
      assert.deepEqual(marker.getBufferRange().serialize(), [[6, 0], [7, 0]]);
    });

    it('updates with a combination position', function() {
      const other = editor.markBufferRange([[2, 0], [4, 0]]);
      fromMarker(other).setIn(marker);
      assert.deepEqual(marker.getBufferRange().serialize(), [[2, 0], [4, 0]]);
    });

    it('does nothing with a nullPosition', function() {
      nullPosition.setIn(marker);
      assert.deepEqual(marker.getBufferRange().serialize(), [[1, 0], [3, 0]]);
    });
  });

  describe('matches', function() {
    let marker0, marker1;

    beforeEach(function() {
      marker0 = editor.markBufferRange([[2, 0], [4, 0]]);
      marker1 = editor.markBufferRange([[1, 0], [3, 0]]);
    });

    it('a buffer range', function() {
      const position = fromBufferRange([[2, 0], [4, 0]]);
      assert.isTrue(position.matches(fromBufferRange([[2, 0], [4, 0]])));
      assert.isFalse(position.matches(fromBufferRange([[2, 0], [5, 0]])));
      assert.isFalse(position.matches(fromScreenRange([[2, 0], [4, 0]])));
      assert.isTrue(position.matches(fromMarker(marker0)));
      assert.isFalse(position.matches(fromMarker(marker1)));
      assert.isFalse(position.matches(nullPosition));
    });

    it('a screen range', function() {
      const position = fromScreenRange([[1, 0], [3, 0]]);
      assert.isTrue(position.matches(fromScreenRange([[1, 0], [3, 0]])));
      assert.isFalse(position.matches(fromScreenRange([[2, 0], [4, 0]])));
      assert.isFalse(position.matches(fromBufferRange([[1, 0], [3, 0]])));
      assert.isFalse(position.matches(fromMarker(marker0)));
      assert.isTrue(position.matches(fromMarker(marker1)));
      assert.isFalse(position.matches(nullPosition));
    });

    it('a combination range', function() {
      const position = fromMarker(marker0);
      assert.isTrue(position.matches(fromMarker(marker0)));
      assert.isFalse(position.matches(fromMarker(marker1)));
      assert.isTrue(position.matches(fromBufferRange([[2, 0], [4, 0]])));
      assert.isFalse(position.matches(fromBufferRange([[1, 0], [3, 0]])));
      assert.isTrue(position.matches(fromScreenRange([[2, 0], [4, 0]])));
      assert.isFalse(position.matches(fromScreenRange([[1, 0], [3, 0]])));
      assert.isFalse(position.matches(nullPosition));
    });

    it('a null position', function() {
      assert.isTrue(nullPosition.matches(nullPosition));
      assert.isFalse(nullPosition.matches(fromBufferRange([[1, 0], [2, 0]])));
      assert.isFalse(nullPosition.matches(fromScreenRange([[1, 0], [2, 0]])));
      assert.isFalse(nullPosition.matches(fromMarker(marker0)));
    });
  });

  describe('bufferStartRow()', function() {
    it('retrieves the first row from a buffer range', function() {
      assert.strictEqual(fromBufferRange([[2, 0], [3, 4]]).bufferStartRow(), 2);
    });

    it('retrieves the first row from a combination range', function() {
      const marker = editor.markBufferRange([[3, 0], [5, 0]]);
      assert.strictEqual(fromMarker(marker).bufferStartRow(), 3);
    });

    it('returns -1 from a screen range', function() {
      assert.strictEqual(fromScreenRange([[1, 0], [2, 0]]).bufferStartRow(), -1);
    });

    it('returns -1 from a null position', function() {
      assert.strictEqual(nullPosition.bufferStartRow(), -1);
    });
  });

  describe('bufferRowCount()', function() {
    it('counts the rows in a buffer range', function() {
      assert.strictEqual(fromBufferRange([[1, 0], [4, 0]]).bufferRowCount(), 4);
      assert.strictEqual(fromBufferPosition([2, 0]).bufferRowCount(), 1);
    });

    it('counts the rows in a combination range', function() {
      const marker = editor.markBufferRange([[2, 0], [6, 0]]);
      assert.strictEqual(fromMarker(marker).bufferRowCount(), 5);
    });

    it('returns 0 for screen or null ranges', function() {
      assert.strictEqual(fromScreenRange([[1, 0], [2, 0]]).bufferRowCount(), 0);
      assert.strictEqual(nullPosition.bufferRowCount(), 0);
    });
  });

  describe('intersectRows()', function() {
    it('returns an empty array with no intersection rows', function() {
      assert.deepEqual(fromBufferRange([[1, 0], [3, 0]]).intersectRows(new Set([0, 5, 6])), []);
    });

    it('detects an intersection at the beginning of the range', function() {
      const position = fromBufferRange([[2, 0], [6, 0]]);
      const rowSet = new Set([0, 1, 2, 3]);

      assert.deepEqual(position.intersectRows(rowSet).map(i => i.serialize()), [
        [[2, 0], [3, 0]],
      ]);
    });

    it('detects an intersection in the middle of the range', function() {
      const position = fromBufferRange([[2, 0], [6, 0]]);
      const rowSet = new Set([0, 3, 4, 8, 9]);

      assert.deepEqual(position.intersectRows(rowSet).map(i => i.serialize()), [
        [[3, 0], [4, 0]],
      ]);
    });

    it('detects an intersection at the end of the range', function() {
      const position = fromBufferRange([[2, 0], [6, 0]]);
      const rowSet = new Set([4, 5, 6, 7, 10, 11]);

      assert.deepEqual(position.intersectRows(rowSet).map(i => i.serialize()), [
        [[4, 0], [6, 0]],
      ]);
    });

    it('detects multiple intersections', function() {
      const position = fromBufferRange([[2, 0], [8, 0]]);
      const rowSet = new Set([0, 3, 4, 6, 7, 10]);

      assert.deepEqual(position.intersectRows(rowSet).map(i => i.serialize()), [
        [[3, 0], [4, 0]],
        [[6, 0], [7, 0]],
      ]);
    });

    it('returns an empty array for screen or null ranges', function() {
      assert.deepEqual(fromScreenRange([[1, 0], [4, 0]]).intersectRows(new Set()), []);
      assert.deepEqual(nullPosition.intersectRows(new Set()), []);
    });
  });

  describe('isPresent()', function() {
    it('returns true on non-null positions', function() {
      assert.isTrue(fromBufferRange([[1, 0], [2, 0]]).isPresent());
      assert.isTrue(fromScreenRange([[1, 0], [2, 0]]).isPresent());

      const marker = editor.markBufferRange([[1, 0], [2, 0]]);
      assert.isTrue(fromMarker(marker).isPresent());
    });

    it('returns false on null positions', function() {
      assert.isFalse(nullPosition.isPresent());
    });
  });

  describe('serialize()', function() {
    it('produces an array', function() {
      assert.deepEqual(fromBufferRange([[0, 0], [1, 1]]).serialize(), [[0, 0], [1, 1]]);
      assert.deepEqual(fromScreenRange([[0, 0], [1, 1]]).serialize(), [[0, 0], [1, 1]]);

      const marker = editor.markBufferRange([[2, 2], [3, 0]]);
      assert.deepEqual(fromMarker(marker).serialize(), [[2, 2], [3, 0]]);
    });

    it('serializes a null position as null', function() {
      assert.isNull(nullPosition.serialize());
    });
  });

  describe('toString()', function() {
    it('pretty-prints buffer ranges', function() {
      assert.strictEqual(fromBufferRange([[0, 0], [2, 0]]).toString(), 'buffer([(0, 0) - (2, 0)])');
    });

    it('pretty-prints screen ranges', function() {
      assert.strictEqual(fromScreenRange([[3, 0], [7, 0]]).toString(), 'screen([(3, 0) - (7, 0)])');
    });

    it('pretty-prints combination ranges', function() {
      const marker = editor.markBufferRange([[1, 0], [3, 0]]);
      assert.strictEqual(fromMarker(marker).toString(), 'either(b[(1, 0) - (3, 0)]/s[(1, 0) - (3, 0)])');
    });

    it('pretty-prints a null position', function() {
      assert.strictEqual(nullPosition.toString(), 'null');
    });
  });

  describe('fromChangeEvent()', function() {
    it('produces positions from a non-reversed marker change', function() {
      const {oldPosition, newPosition} = fromChangeEvent({
        oldTailBufferPosition: [0, 0],
        oldHeadBufferPosition: [1, 1],
        oldTailScreenPosition: [2, 2],
        oldHeadScreenPosition: [3, 3],
        newTailBufferPosition: [4, 4],
        newHeadBufferPosition: [5, 5],
        newTailScreenPosition: [6, 6],
        newHeadScreenPosition: [7, 7],
      });

      assert.isTrue(oldPosition.matches(fromBufferRange([[0, 0], [1, 1]])));
      assert.isTrue(oldPosition.matches(fromScreenRange([[2, 2], [3, 3]])));
      assert.isTrue(newPosition.matches(fromBufferRange([[4, 4], [5, 5]])));
      assert.isTrue(newPosition.matches(fromScreenRange([[6, 6], [7, 7]])));
    });

    it('produces positions from a reversed marker change', function() {
      const {oldPosition, newPosition} = fromChangeEvent({
        oldTailBufferPosition: [0, 0],
        oldHeadBufferPosition: [1, 1],
        oldTailScreenPosition: [2, 2],
        oldHeadScreenPosition: [3, 3],
        newTailBufferPosition: [4, 4],
        newHeadBufferPosition: [5, 5],
        newTailScreenPosition: [6, 6],
        newHeadScreenPosition: [7, 7],
      }, true);

      assert.isTrue(oldPosition.matches(fromBufferRange([[1, 1], [0, 0]])));
      assert.isTrue(oldPosition.matches(fromScreenRange([[3, 3], [2, 2]])));
      assert.isTrue(newPosition.matches(fromBufferRange([[5, 5], [4, 4]])));
      assert.isTrue(newPosition.matches(fromScreenRange([[7, 7], [6, 6]])));
    });
  });
});
