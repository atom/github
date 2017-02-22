import EventEmitter from 'events';
import path from 'path';

import Conflict from '../../../lib/models/conflicts/conflict';
import {TOP, MIDDLE, BOTTOM} from '../../../lib/models/conflicts/position';
import {OURS, BASE, THEIRS} from '../../../lib/models/conflicts/source';

describe('Conflict', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  const editorOnFixture = function(name) {
    const fullPath = path.join(path.dirname(__filename), '..', '..', 'fixtures', 'conflict-marker-examples', name);
    return atomEnv.workspace.open(fullPath);
  };

  const assertConflictOnRows = function(conflict, description, message) {
    const isRangeOnRows = function(range, startRow, endRow, rangeName) {
      assert(
        range.start.row === startRow && range.start.column === 0 && range.end.row === endRow && range.end.column === 0,
        `expected conflict's ${rangeName} range to cover rows ${startRow} to ${endRow}, but it was ${range}`,
      );
    };

    const isRangeOnRow = function(range, row, rangeName) {
      return isRangeOnRows(range, row, row + 1, rangeName);
    };

    const ourBannerRange = conflict.getSide(OURS).banner.marker.getBufferRange();
    isRangeOnRow(ourBannerRange, description.ourBannerRow, '"ours" banner');

    const ourSideRange = conflict.getSide(OURS).marker.getBufferRange();
    isRangeOnRows(ourSideRange, description.ourSideRows[0], description.ourSideRows[1], '"ours"');
    assert.strictEqual(conflict.getSide(OURS).position, description.ourPosition || TOP, '"ours" in expected position');

    const theirBannerRange = conflict.getSide(THEIRS).banner.marker.getBufferRange();
    isRangeOnRow(theirBannerRange, description.theirBannerRow, '"theirs" banner');

    const theirSideRange = conflict.getSide(THEIRS).marker.getBufferRange();
    isRangeOnRows(theirSideRange, description.theirSideRows[0], description.theirSideRows[1], '"theirs"');
    assert.strictEqual(conflict.getSide(THEIRS).position, description.theirPosition || BOTTOM, '"theirs" in expected position');

    if (description.baseBannerRow || description.baseSideRows) {
      assert.isNotNull(conflict.getSide(BASE), "expected conflict's base side to be non-null");

      const baseBannerRange = conflict.getSide(BASE).banner.marker.getBufferRange();
      isRangeOnRow(baseBannerRange, description.baseBannerRow, '"base" banner');

      const baseSideRange = conflict.getSide(BASE).marker.getBufferRange();
      isRangeOnRows(baseSideRange, description.baseSideRows[0], description.baseSideRows[1], '"base"');
      assert.strictEqual(conflict.getSide(BASE).position, MIDDLE, '"base" in MIDDLE position');
    } else {
      assert.isUndefined(conflict.getSide(BASE), "expected conflict's base side to be undefined");
    }

    const separatorRange = conflict.separator.marker.getBufferRange();
    isRangeOnRow(separatorRange, description.separatorRow, 'separator');
  };

  it('parses 2-way diff markings', async function() {
    const editor = await editorOnFixture('single-2way-diff.txt');
    const conflicts = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), false);

    assert.equal(conflicts.length, 1);
    assertConflictOnRows(conflicts[0], {
      ourBannerRow: 2,
      ourSideRows: [3, 4],
      separatorRow: 4,
      theirSideRows: [5, 6],
      theirBannerRow: 6,
    });
  });

  it('parses multiple 2-way diff markings', async function() {
    const editor = await editorOnFixture('multi-2way-diff.txt');
    const conflicts = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), false);

    assert.equal(conflicts.length, 2);
    assertConflictOnRows(conflicts[0], {
      ourBannerRow: 4,
      ourSideRows: [5, 7],
      separatorRow: 7,
      theirSideRows: [8, 9],
      theirBannerRow: 9,
    });
    assertConflictOnRows(conflicts[1], {
      ourBannerRow: 13,
      ourSideRows: [14, 15],
      separatorRow: 15,
      theirSideRows: [16, 17],
      theirBannerRow: 17,
    });
  });

  it('parses 3-way diff markings', async function() {
    const editor = await editorOnFixture('single-3way-diff.txt');
    const conflicts = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), false);
    assert.equal(conflicts.length, 1);
    assertConflictOnRows(conflicts[0], {
      ourBannerRow: 0,
      ourSideRows: [1, 2],
      baseBannerRow: 2,
      baseSideRows: [3, 4],
      separatorRow: 4,
      theirSideRows: [5, 6],
      theirBannerRow: 6,
    });
  });

  it('parses recursive 3-way diff markings', async function() {
    const editor = await editorOnFixture('single-3way-diff-complex.txt');
    const conflicts = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), false);
    assert.equal(conflicts.length, 1);

    assertConflictOnRows(conflicts[0], {
      ourBannerRow: 0,
      ourSideRows: [1, 2],
      baseBannerRow: 2,
      baseSideRows: [3, 18],
      separatorRow: 18,
      theirSideRows: [19, 20],
      theirBannerRow: 20,
    });
  });

  it('flips "ours" and "theirs" sides when rebasing', async function() {
    const editor = await editorOnFixture('rebase-2way-diff.txt');
    const conflicts = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), true);

    assert.equal(conflicts.length, 1);
    assertConflictOnRows(conflicts[0], {
      theirBannerRow: 2,
      theirSideRows: [3, 4],
      theirPosition: TOP,
      separatorRow: 4,
      ourSideRows: [5, 6],
      ourBannerRow: 6,
      ourPosition: BOTTOM,
    });
  });

  it('is resilient to malformed 2-way diff markings', async function() {
    const editor = await editorOnFixture('corrupted-2way-diff.txt');
    const conflicts = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), true);

    assert.equal(conflicts.length, 0);
  });

  it('is resilient to malformed 3-way diff markings', async function() {
    const editor = await editorOnFixture('corrupted-3way-diff.txt');
    const conflicts = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), true);

    assert.equal(conflicts.length, 0);
  });

  describe('counting conflicts', function() {
    let readStream, countPromise;

    beforeEach(function() {
      readStream = new EventEmitter();
      countPromise = Conflict.countFromStream(readStream);
    });

    it('counts conflicts from a streamed file', async function() {
      readStream.emit('data', `
before
before
<<<<<<< HEAD
aaa
=======
bbb
>>>>>>> master
middle
middle
      `);

      readStream.emit('data', `
middle
middle
<<<<<<< HEAD
aaa
=======
bbb
>>>>>>> master
end
end
      `);

      readStream.emit('end');

      assert.equal(await countPromise, 2);
    });

    it('counts conflicts that span stream chunks', async function() {
      readStream.emit('data', `
before
before
<<<<<<< HEAD
aaa
=======
`);

      readStream.emit('data', `bbb
>>>>>>> master
end
end
      `);

      readStream.emit('end');

      assert.equal(await countPromise, 1);
    });

    it('handles conflict markers broken across chunks', async function() {
      readStream.emit('data', `
before
<<<`);

      readStream.emit('data', `<<<< HEAD
aaa
=======
bbb
>>>>>>> master
end
end
      `);

      readStream.emit('end');

      assert.equal(await countPromise, 1);
    });
  });

  describe('change detection', function() {
    let editor, conflict;

    beforeEach(async function() {
      editor = await editorOnFixture('single-2way-diff.txt');
      conflict = Conflict.allFromEditor(editor, editor.getDefaultMarkerLayer(), false)[0];
    });

    it('detects when a side has been modified', function() {
      assert.isFalse(conflict.getSide(OURS).isBannerModified());
      assert.isFalse(conflict.getSide(OURS).isModified());

      editor.setCursorBufferPosition([3, 1]);
      editor.insertText('nah');

      assert.isFalse(conflict.getSide(OURS).isBannerModified());
      assert.isTrue(conflict.getSide(OURS).isModified());
    });

    it('detects when a banner has been modified', function() {
      assert.isFalse(conflict.getSide(OURS).isBannerModified());
      assert.isFalse(conflict.getSide(OURS).isModified());

      editor.setCursorBufferPosition([2, 1]);
      editor.insertText('your problem now');

      assert.isTrue(conflict.getSide(OURS).isBannerModified());
      assert.isFalse(conflict.getSide(OURS).isModified());
    });

    it('detects when a separator has been modified', function() {
      assert.isFalse(conflict.getSeparator().isModified());

      editor.setCursorBufferPosition([4, 3]);
      editor.insertText('wat');

      assert.isTrue(conflict.getSeparator().isModified());
    });
  });
});
