import FilePatch from '../../../lib/models/patch/file-patch';
import File from '../../../lib/models/patch/file';
import Patch from '../../../lib/models/patch/patch';
import Hunk from '../../../lib/models/patch/hunk';
import {Addition, Deletion} from '../../../lib/models/patch/region';
import IndexedRowRange from '../../../lib/models/indexed-row-range';
import {assertInFilePatch} from '../../helpers';

describe('FilePatch', function() {
  describe('getStagePatchForLines()', function() {
    it('returns a new FilePatch that applies only the selected lines', function() {
      const bufferText = '0000\n0001\n0002\n0003\n0004\n';
      const hunks = [
        new Hunk({
          oldStartRow: 5,
          oldRowCount: 3,
          newStartRow: 5,
          newRowCount: 4,
          rowRange: new IndexedRowRange({bufferRange: [[0, 0], [4, 0]], startOffset: 0, endOffset: 25}),
          changes: [
            new Addition(new IndexedRowRange({bufferRange: [[1, 0], [2, 0]], startOffset: 5, endOffset: 15})),
            new Deletion(new IndexedRowRange({bufferRange: [[3, 0], [3, 0]], startOffset: 15, endOffset: 20})),
          ],
        }),
      ];
      const patch = new Patch({status: 'modified', hunks, bufferText});
      const oldFile = new File({path: 'file.txt', mode: '100644'});
      const newFile = new File({path: 'file.txt', mode: '100644'});
      const filePatch = new FilePatch(oldFile, newFile, patch);

      const stagedPatch = filePatch.getStagePatchForLines(new Set([1, 3]));
      assert.strictEqual(stagedPatch.getStatus(), 'modified');
      assert.strictEqual(stagedPatch.getOldPath(), 'file.txt');
      assert.strictEqual(stagedPatch.getOldMode(), '100644');
      assert.strictEqual(stagedPatch.getNewPath(), 'file.txt');
      assert.strictEqual(stagedPatch.getNewMode(), '100644');
      assert.strictEqual(stagedPatch.getBufferText(), '0000\n0001\n0003\n0004\n');
      assertInFilePatch(stagedPatch).hunks(
        {
          startRow: 0,
          endRow: 3,
          header: '@@ -5,3 +5,3 @@',
          changes: [
            {kind: 'addition', string: '+0001\n', range: [[1, 0], [1, 0]]},
            {kind: 'deletion', string: '-0003\n', range: [[2, 0], [2, 0]]},
          ],
        },
      );
    });

    describe('staging lines from deleted files', function() {
      it('handles staging part of the file');

      it('handles staging all lines, leaving nothing unstaged');
    });
  });

  describe('getUnstagePatchForLines()', function() {
    it('returns a new FilePatch that unstages only the specified lines');

    describe('unstaging lines from an added file', function() {
      it('handles unstaging part of the file');

      it('handles unstaging all lines, leaving nothing staged');
    });
  });

  it('handles newly added files');

  describe('toString()', function() {
    it('converts the patch to the standard textual format');

    it('correctly formats new files with no newline at the end');

    describe('typechange file patches', function() {
      it('handles typechange patches for a symlink replaced with a file');

      it('handles typechange patches for a file replaced with a symlink');
    });
  });

  describe('getHeaderString()', function() {
    it('formats paths with git path separators');
  });

  it('getByteSize() returns the size in bytes');
});
