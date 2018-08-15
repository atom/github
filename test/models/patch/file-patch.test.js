import {buildFilePatch} from '../../../lib/models/patch';
import {assertInFilePatch} from '../../helpers';

describe('FilePatch', function() {
  describe('getStagePatchForLines()', function() {
    it('returns a new FilePatch that applies only the selected lines', function() {
      const filePatch = buildFilePatch([{
        oldPath: 'a.txt',
        oldMode: '100644',
        newPath: 'a.txt',
        newMode: '100644',
        hunks: [
          {
            oldStartLine: 1,
            oldLineCount: 1,
            newStartLine: 1,
            newLineCount: 3,
            lines: [
              '+line-0',
              '+line-1',
              ' line-2',
            ],
          },
          {
            oldStartLine: 5,
            oldLineCount: 5,
            newStartLine: 7,
            newLineCount: 4,
            lines: [
              ' line-3',
              '-line-4',
              '-line-5',
              '+line-6',
              '+line-7',
              '+line-8',
              '-line-9',
              '-line-10',
            ],
          },
          {
            oldStartLine: 20,
            oldLineCount: 2,
            newStartLine: 19,
            newLineCount: 2,
            lines: [
              '-line-11',
              '+line-12',
              ' line-13',
              '\\No newline at end of file',
            ],
          },
        ],
      }]);

      assert.strictEqual(
        filePatch.getBufferText(),
        'line-0\nline-1\nline-2\nline-3\nline-4\nline-5\nline-6\nline-7\nline-8\nline-9\nline-10\n' +
        'line-11\nline-12\nline-13\nNo newline at end of file\n',
      );

      const stagePatch0 = filePatch.getStagePatchForLines(new Set([4, 5, 6]));
      assertInFilePatch(stagePatch0).hunks(
        {
          startRow: 3,
          endRow: 10,
          header: '@@ -5,5 +5,6 @@',
          deletions: {strings: ['*line-4\n*line-5\n'], ranges: [[[4, 0], [5, 0]]]},
          additions: {strings: ['*line-6\n'], ranges: [[[6, 0], [6, 0]]]},
        },
      );

      const stagePatch1 = filePatch.getStagePatchForLines(new Set([0, 4, 5, 6, 11]));
      assertInFilePatch(stagePatch1).hunks(
        {
          startRow: 0,
          endRow: 2,
          header: '@@ -1,1 +1,3 @@',
          additions: {strings: ['*line-0\n'], ranges: [[[0, 0], [0, 0]]]},
        },
        {
          startRow: 3,
          endRow: 10,
          header: '@@ -5,5 +6,6 @@',
          deletions: {strings: ['*line-4\n*line-5\n'], ranges: [[[4, 0], [5, 0]]]},
          additions: {strings: ['*line-6\n'], ranges: [[[6, 0], [6, 0]]]},
        },
        {
          startRow: 11,
          endRow: 14,
          header: '@@ -20,2 +18,3 @@',
          deletions: {strings: ['*line-11\n'], ranges: [[[11, 0], [11, 0]]]},
          noNewline: {string: '*No newline at end of file\n', range: [[14, 0], [14, 0]]},
        },
      );
    });

    describe('staging lines from deleted files', function() {
      it('handles staging part of the file', function() {
        const filePatch = buildFilePatch([{
          oldPath: 'a.txt',
          oldMode: '100644',
          newPath: null,
          newMode: null,
          status: 'deleted',
          hunks: [
            {
              oldStartLine: 1,
              newStartLine: 0,
              oldLineCount: 3,
              newLineCount: 0,
              lines: [
                '-line-1',
                '-line-2',
                '-line-3',
              ],
            },
            {
              oldStartLine: 19,
              newStartLine: 21,
              oldLineCount: 2,
              newLineCount: 2,
              lines: [
                '-line-13',
                '+line-12',
                ' line-14',
                '\\No newline at end of file',
              ],
            },
          ],
        }]);

        assert.strictEqual(filePatch.getBufferText(),
          'line-1\nline-2\nline-3\nline-13\nline-12\nline-14\n' +
          'No newline at end of file\n');

        const stagePatch = filePatch.getStagePatchForLines(new Set([0, 1]));
        assertInFilePatch(stagePatch).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +0,1 @@',
            deletions: {strings: ['*line-1\n*line-2\n'], ranges: [[[0, 0], [1, 0]]]},
          },
        );
      });

      it('handles staging all lines, leaving nothing unstaged', function() {
        const filePatch = buildFilePatch([{
          oldPath: 'a.txt',
          oldMode: '100644',
          newPath: null,
          newMode: null,
          status: 'deleted',
          hunks: [
            {
              oldStartLine: 1,
              oldLineCount: 3,
              newStartLine: 1,
              newLineCount: 0,
              lines: [
                '-line-1',
                '-line-2',
                '-line-3',
              ],
            },
          ],
        }]);

        assert.strictEqual(filePatch.getBufferText(), 'line-1\nline-2\nline-3\n');

        const stagePatch = filePatch.getStagePatchForLines(new Set([0, 1, 2]));
        assertInFilePatch(stagePatch).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,0 @@',
            deletions: {strings: ['*line-1\n*line-2\n*line-3\n'], ranges: [[[0, 0], [2, 0]]]},
          },
        );
      });
    });
  });

  describe('getUnstagePatchForLines()', function() {
    it('returns a new FilePatch that unstages only the specified lines', function() {
      const filePatch = buildFilePatch([{
        oldPath: 'a.txt',
        oldMode: '100644',
        newPath: 'a.txt',
        newMode: '100644',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 1,
            oldLineCount: 1,
            newStartLine: 1,
            newLineCount: 3,
            lines: [
              '+line-0',
              '+line-1',
              ' line-2',
            ],
          },
          {
            oldStartLine: 5,
            oldLineCount: 5,
            newStartLine: 7,
            newLineCount: 4,
            lines: [
              ' line-3',
              '-line-4',
              '-line-5',
              '+line-6',
              '+line-7',
              '+line-8',
              '-line-9',
              '-line-10',
            ],
          },
          {
            oldStartLine: 20,
            oldLineCount: 2,
            newStartLine: 21,
            newLineCount: 2,
            lines: [
              '-line-11',
              '+line-12',
              ' line-13',
              '\\No newline at end of file',
            ],
          },
        ],
      }]);

      assert.strictEqual(
        filePatch.getBufferText(),
        'line-0\nline-1\nline-2\nline-3\nline-4\nline-5\nline-6\nline-7\nline-8\nline-9\nline-10\n' +
        'line-11\nline-12\nline-13\nNo newline at end of file\n',
      );

      const unstagedPatch0 = filePatch.getUnstagePatchForLines(new Set([4, 5, 6, 7, 11, 12, 13]));
      console.log(unstagedPatch0.toString());
      assertInFilePatch(unstagedPatch0).hunks(
        {
          startRow: 3,
          endRow: 10,
          header: '@@ -7,4 +7,4 @@',
          additions: {strings: ['*line-4\n*line-5\n'], ranges: [[[4, 0], [5, 0]]]},
          deletions: {strings: ['*line-6\n*line-7\n'], ranges: [[[5, 0], [6, 0]]]},
        },
        {
          startRow: 11,
          endRow: 14,
          header: '@@ -19,2 +21,2 @@',
          additions: {strings: ['*line-11\n'], ranges: [[[11, 0], [11, 0]]]},
          deletions: {strings: ['*line-12\n'], ranges: [[[12, 0], [12, 0]]]},
          noNewline: {string: '*No newline at end of file\n', range: [[14, 0], [14, 0]]},
        },
      );
    });

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
