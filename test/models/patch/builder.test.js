import {buildFilePatch} from '../../../lib/models/patch';
import {assertInPatch} from '../../helpers';

describe('buildFilePatch', function() {
  it('returns a null patch for an empty diff list', function() {
    const p = buildFilePatch([]);
    assert.isFalse(p.getOldFile().isPresent());
    assert.isFalse(p.getNewFile().isPresent());
    assert.isFalse(p.getPatch().isPresent());
  });

  describe('with a single diff', function() {
    it('assembles a patch from non-symlink sides', function() {
      const p = buildFilePatch([{
        oldPath: 'old/path',
        oldMode: '100644',
        newPath: 'new/path',
        newMode: '100755',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 0,
            newStartLine: 0,
            oldLineCount: 7,
            newLineCount: 6,
            lines: [
              ' line-0',
              '-line-1',
              '-line-2',
              '-line-3',
              ' line-4',
              '+line-5',
              '+line-6',
              ' line-7',
              ' line-8',
            ],
          },
          {
            oldStartLine: 10,
            newStartLine: 11,
            oldLineCount: 3,
            newLineCount: 3,
            lines: [
              '-line-9',
              ' line-10',
              ' line-11',
              '+line-12',
            ],
          },
          {
            oldStartLine: 20,
            newStartLine: 21,
            oldLineCount: 4,
            newLineCount: 4,
            lines: [
              ' line-13',
              '-line-14',
              '-line-15',
              '+line-16',
              '+line-17',
              ' line-18',
            ],
          },
        ],
      }]);

      assert.strictEqual(p.getOldPath(), 'old/path');
      assert.strictEqual(p.getOldMode(), '100644');
      assert.strictEqual(p.getNewPath(), 'new/path');
      assert.strictEqual(p.getNewMode(), '100755');
      assert.strictEqual(p.getPatch().getStatus(), 'modified');

      const buffer =
        'line-0\nline-1\nline-2\nline-3\nline-4\nline-5\nline-6\nline-7\nline-8\nline-9\nline-10\n' +
        'line-11\nline-12\nline-13\nline-14\nline-15\nline-16\nline-17\nline-18\n';
      assert.strictEqual(p.getBufferText(), buffer);

      assertInPatch(p).hunks(
        {
          startRow: 0,
          header: '@@ -0,7 +0,6 @@',
          deletions: {
            strings: ['*line-1\n*line-2\n*line-3\n'],
            ranges: [[[1, 0], [3, 0]]],
          },
          additions: {
            strings: ['*line-5\n*line-6\n'],
            ranges: [[[5, 0], [6, 0]]],
          },
        },
        {
          startRow: 9,
          header: '@@ -10,3 +11,3 @@',
          deletions: {
            strings: ['*line-9\n'],
            ranges: [[[9, 0], [9, 0]]],
          },
          additions: {
            strings: ['*line-12\n'],
            ranges: [[[12, 0], [12, 0]]],
          },
        },
        {
          startRow: 13,
          header: '@@ -20,4 +21,4 @@',
          deletions: {
            strings: ['*line-14\n*line-15\n'],
            ranges: [[[14, 0], [15, 0]]],
          },
          additions: {
            strings: ['*line-16\n*line-17\n'],
            ranges: [[[16, 0], [17, 0]]],
          },
        },
      );
    });

    it("sets the old file's symlink destination", function() {
      const p = buildFilePatch([{
        oldPath: 'old/path',
        oldMode: '120000',
        newPath: 'new/path',
        newMode: '100644',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 0,
            newStartLine: 0,
            oldLineCount: 0,
            newLineCount: 0,
            lines: [' old/destination'],
          },
        ],
      }]);

      assert.strictEqual(p.getOldSymlink(), 'old/destination');
      assert.isNull(p.getNewSymlink());
    });

    it("sets the new file's symlink destination", function() {
      const p = buildFilePatch([{
        oldPath: 'old/path',
        oldMode: '100644',
        newPath: 'new/path',
        newMode: '120000',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 0,
            newStartLine: 0,
            oldLineCount: 0,
            newLineCount: 0,
            lines: [' new/destination'],
          },
        ],
      }]);

      assert.isNull(p.getOldSymlink());
      assert.strictEqual(p.getNewSymlink(), 'new/destination');
    });

    it("sets both files' symlink destinations", function() {
      const p = buildFilePatch([{
        oldPath: 'old/path',
        oldMode: '120000',
        newPath: 'new/path',
        newMode: '120000',
        status: 'modified',
        hunks: [
          {
            oldStartLine: 0,
            newStartLine: 0,
            oldLineCount: 0,
            newLineCount: 0,
            lines: [
              ' old/destination',
              ' --',
              ' new/destination',
            ],
          },
        ],
      }]);

      assert.strictEqual(p.getOldSymlink(), 'old/destination');
      assert.strictEqual(p.getNewSymlink(), 'new/destination');
    });

    it('throws an error with an unknown diff status character', function() {
      assert.throws(() => {
        buildFilePatch([{
          oldPath: 'old/path',
          oldMode: '100644',
          newPath: 'new/path',
          newMode: '100644',
          status: 'modified',
          hunks: [{oldStartLine: 0, newStartLine: 0, oldLineCount: 1, newLineCount: 1, lines: ['xline-0']}],
        }]);
      }, /diff status character: "x"/);
    });

    it('parses a no-newline marker', function() {
      const p = buildFilePatch([{
        oldPath: 'old/path',
        oldMode: '100644',
        newPath: 'new/path',
        newMode: '100644',
        status: 'modified',
        hunks: [{oldStartLine: 0, newStartLine: 0, oldLineCount: 1, newLineCount: 1, lines: [
          '+line-0', '-line-1', '\\No newline at end of file',
        ]}],
      }]);

      assert.strictEqual(p.getBufferText(), 'line-0\nline-1\nNo newline at end of file\n');

      assertInPatch(p).hunks({
        startRow: 0,
        header: '@@ -0,1 +0,1 @@',
        additions: {strings: ['*line-0\n'], ranges: [[[0, 0], [0, 0]]]},
        deletions: {strings: ['*line-1\n'], ranges: [[[1, 0], [1, 0]]]},
        noNewline: {string: '*No newline at end of file\n', range: [[2, 0], [2, 0]]},
      });
    });

    it('throws an error when multiple no-newline markers are encountered', function() {
      assert.throws(() => {
        buildFilePatch([{
          oldPath: 'old/path',
          oldMode: '100644',
          newPath: 'new/path',
          newMode: '100644',
          status: 'modified',
          hunks: [{oldStartLine: 0, newStartLine: 0, oldLineCount: 1, newLineCount: 1, lines: [
            '\\No newline at end of file', ' unchanged', '\\No newline at end of file',
          ]}],
        }]);
      }, /Multiple nonewline/);
    });
  });

  describe('with a mode change and a content diff', function() {
    it('identifies a file that was deleted and replaced by a symlink', function() {
      const p = buildFilePatch([
        {
          oldPath: 'the-path',
          oldMode: '000000',
          newPath: 'the-path',
          newMode: '120000',
          status: 'added',
          hunks: [
            {
              oldStartLine: 0,
              newStartLine: 0,
              oldLineCount: 0,
              newLineCount: 0,
              lines: [' the-destination'],
            },
          ],
        },
        {
          oldPath: 'the-path',
          oldMode: '100644',
          newPath: 'the-path',
          newMode: '000000',
          status: 'deleted',
          hunks: [
            {
              oldStartLine: 0,
              newStartLine: 0,
              oldLineCount: 0,
              newLineCount: 2,
              lines: ['+line-0', '+line-1'],
            },
          ],
        },
      ]);

      assert.strictEqual(p.getOldPath(), 'the-path');
      assert.strictEqual(p.getOldMode(), '100644');
      assert.isNull(p.getOldSymlink());
      assert.strictEqual(p.getNewPath(), 'the-path');
      assert.strictEqual(p.getNewMode(), '120000');
      assert.strictEqual(p.getNewSymlink(), 'the-destination');
      assert.strictEqual(p.getStatus(), 'deleted');

      assert.strictEqual(p.getBufferText(), 'line-0\nline-1\n');
      assertInPatch(p).hunks({
        startRow: 0,
        header: '@@ -0,0 +0,2 @@',
        deletions: {strings: [], ranges: []},
        additions: {
          strings: ['*line-0\n*line-1\n'],
          ranges: [[[0, 0], [1, 0]]],
        },
      });
    });

    it('identifies a symlink that was deleted and replaced by a file', function() {
      const p = buildFilePatch([
        {
          oldPath: 'the-path',
          oldMode: '120000',
          newPath: 'the-path',
          newMode: '000000',
          status: 'deleted',
          hunks: [
            {
              oldStartLine: 0,
              newStartLine: 0,
              oldLineCount: 0,
              newLineCount: 0,
              lines: [' the-destination'],
            },
          ],
        },
        {
          oldPath: 'the-path',
          oldMode: '000000',
          newPath: 'the-path',
          newMode: '100644',
          status: 'added',
          hunks: [
            {
              oldStartLine: 0,
              newStartLine: 0,
              oldLineCount: 2,
              newLineCount: 0,
              lines: ['-line-0', '-line-1'],
            },
          ],
        },
      ]);

      assert.strictEqual(p.getOldPath(), 'the-path');
      assert.strictEqual(p.getOldMode(), '120000');
      assert.strictEqual(p.getOldSymlink(), 'the-destination');
      assert.strictEqual(p.getNewPath(), 'the-path');
      assert.strictEqual(p.getNewMode(), '100644');
      assert.isNull(p.getNewSymlink());
      assert.strictEqual(p.getStatus(), 'added');

      assert.strictEqual(p.getBufferText(), 'line-0\nline-1\n');
      assertInPatch(p).hunks({
        startRow: 0,
        header: '@@ -0,2 +0,0 @@',
        deletions: {
          strings: ['*line-0\n*line-1\n'],
          ranges: [[[0, 0], [1, 0]]],
        },
        additions: {strings: [], ranges: []},
      });
    });

    it('is indifferent to the order of the diffs', function() {
      const p = buildFilePatch([
        {
          oldMode: '100644',
          newPath: 'the-path',
          newMode: '000000',
          status: 'deleted',
          hunks: [
            {
              oldStartLine: 0,
              newStartLine: 0,
              oldLineCount: 0,
              newLineCount: 2,
              lines: ['+line-0', '+line-1'],
            },
          ],
        },
        {
          oldPath: 'the-path',
          oldMode: '000000',
          newPath: 'the-path',
          newMode: '120000',
          status: 'added',
          hunks: [
            {
              oldStartLine: 0,
              newStartLine: 0,
              oldLineCount: 0,
              newLineCount: 0,
              lines: [' the-destination'],
            },
          ],
        },
      ]);

      assert.strictEqual(p.getOldPath(), 'the-path');
      assert.strictEqual(p.getOldMode(), '100644');
      assert.isNull(p.getOldSymlink());
      assert.strictEqual(p.getNewPath(), 'the-path');
      assert.strictEqual(p.getNewMode(), '120000');
      assert.strictEqual(p.getNewSymlink(), 'the-destination');
      assert.strictEqual(p.getStatus(), 'deleted');

      assert.strictEqual(p.getBufferText(), 'line-0\nline-1\n');
      assertInPatch(p).hunks({
        startRow: 0,
        header: '@@ -0,0 +0,2 @@',
        deletions: {strings: [], ranges: []},
        additions: {
          strings: ['*line-0\n*line-1\n'],
          ranges: [[[0, 0], [1, 0]]],
        },
      });
    });

    it('throws an error on an invalid mode diff status', function() {
      assert.throws(() => {
        buildFilePatch([
          {
            oldMode: '100644',
            newPath: 'the-path',
            newMode: '000000',
            status: 'deleted',
            hunks: [
              {oldStartLine: 0, newStartLine: 0, oldLineCount: 0, newLineCount: 2, lines: ['+line-0', '+line-1']},
            ],
          },
          {
            oldPath: 'the-path',
            oldMode: '000000',
            newMode: '120000',
            status: 'modified',
            hunks: [
              {oldStartLine: 0, newStartLine: 0, oldLineCount: 0, newLineCount: 0, lines: [' the-destination']},
            ],
          },
        ]);
      }, /mode change diff status: modified/);
    });
  });

  it('throws an error with an unexpected number of diffs', function() {
    assert.throws(() => buildFilePatch([1, 2, 3]), /Unexpected number of diffs: 3/);
  });
});
