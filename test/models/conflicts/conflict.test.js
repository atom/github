/** @babel */

import path from 'path';

import Conflict from '../../../lib/models/conflicts/conflict';


describe('Conflict', () => {
  let atomEnv;

  beforeEach(() => { atomEnv = global.buildAtomEnvironment(); });
  afterEach(() => { atomEnv.destroy(); });

  const editorOnFixture = name => {
    const fullPath = path.join(path.dirname(__filename), '..', '..', 'fixtures', 'conflict-marker-examples', name);
    return atomEnv.workspace.open(fullPath);
  };

  const assertConflictOnRows = (conflict, description, message) => {
    const isRangeOnRows = (range, startRow, endRow, rangeName) => {
      assert(
        range.start.row === startRow && range.start.column === 0 && range.end.row === endRow && range.end.column === 0,
        `expected conflict's ${rangeName} range to cover rows ${startRow} to ${endRow}, but it was ${range}`,
      );
    };

    const isRangeOnRow = (range, row, rangeName) => isRangeOnRows(range, row, row + 1, rangeName);

    const ourBannerRange = conflict.ours.banner.marker.getBufferRange();
    isRangeOnRow(ourBannerRange, description.ourBannerRow, '"ours" banner');

    const ourSideRange = conflict.ours.marker.getBufferRange();
    isRangeOnRows(ourSideRange, description.ourSideRows[0], description.ourSideRows[1], '"ours"');

    const theirBannerRange = conflict.theirs.banner.marker.getBufferRange();
    isRangeOnRow(theirBannerRange, description.theirBannerRow, '"theirs" banner');

    const theirSideRange = conflict.theirs.marker.getBufferRange();
    isRangeOnRows(theirSideRange, description.theirSideRows[0], description.theirSideRows[1], '"theirs"');

    if (description.baseBannerRow || description.baseSideRows) {
      assert.isNotNull(conflict.base, "expected conflict's base side to be non-null");

      const baseBannerRange = conflict.base.banner.marker.getBufferRange();
      isRangeOnRow(baseBannerRange, description.baseBannerRow, '"base" banner');

      const baseSideRange = conflict.base.marker.getBufferRange();
      isRangeOnRows(baseSideRange, description.baseSideRows[0], description.baseSideRows[1], '"base"');
    } else {
      assert.isNull(conflict.base, "expected conflict's base side to be null");
    }

    const separatorRange = conflict.separator.marker.getBufferRange();
    isRangeOnRow(separatorRange, description.separatorRow, 'separator');
  };

  it('parses 2-way diff markings', async () => {
    const editor = await editorOnFixture('single-2way-diff.txt');
    const conflicts = Conflict.all(editor, false);

    assert.equal(conflicts.length, 1);
    assertConflictOnRows(conflicts[0], {
      ourBannerRow: 2,
      ourSideRows: [3, 4],
      separatorRow: 4,
      theirSideRows: [5, 6],
      theirBannerRow: 6,
    });
  });
});
