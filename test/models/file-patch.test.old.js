import {cloneRepository, buildRepository} from '../helpers';
import {toGitPathSep} from '../../lib/helpers';
import path from 'path';
import fs from 'fs';
import dedent from 'dedent-js';

import FilePatch from '../../lib/models/file-patch';
import Hunk from '../../lib/models/hunk';
import HunkLine from '../../lib/models/hunk-line';

function createFilePatch(oldFilePath, newFilePath, status, hunks) {
  const oldFile = new FilePatch.File({path: oldFilePath});
  const newFile = new FilePatch.File({path: newFilePath});
  const patch = new FilePatch.Patch({status, hunks});

  return new FilePatch(oldFile, newFile, patch);
}

// oldStartRow, newStartRow, oldRowCount, newRowCount, sectionHeading, lines

describe('FilePatch', function() {
  it('detects executable mode changes', function() {
    const of0 = new FilePatch.File({path: 'a.txt', mode: '100644'});
    const nf0 = new FilePatch.File({path: 'a.txt', mode: '100755'});
    const p0 = new FilePatch.Patch({status: 'modified', hunks: []});
    const fp0 = new FilePatch(of0, nf0, p0);
    assert.isTrue(fp0.didChangeExecutableMode());

    const of1 = new FilePatch.File({path: 'a.txt', mode: '100755'});
    const nf1 = new FilePatch.File({path: 'a.txt', mode: '100644'});
    const p1 = new FilePatch.Patch({status: 'modified', hunks: []});
    const fp1 = new FilePatch(of1, nf1, p1);
    assert.isTrue(fp1.didChangeExecutableMode());

    const of2 = new FilePatch.File({path: 'a.txt', mode: '100755'});
    const nf2 = new FilePatch.File({path: 'a.txt', mode: '100755'});
    const p2 = new FilePatch.Patch({status: 'modified', hunks: []});
    const fp2 = new FilePatch(of2, nf2, p2);
    assert.isFalse(fp2.didChangeExecutableMode());

    const of3 = FilePatch.File.empty();
    const nf3 = new FilePatch.File({path: 'a.txt', mode: '100755'});
    const p3 = new FilePatch.Patch({status: 'modified', hunks: []});
    const fp3 = new FilePatch(of3, nf3, p3);
    assert.isFalse(fp3.didChangeExecutableMode());

    const of4 = FilePatch.File.empty();
    const nf4 = new FilePatch.File({path: 'a.txt', mode: '100755'});
    const p4 = new FilePatch.Patch({status: 'modified', hunks: []});
    const fp4 = new FilePatch(of4, nf4, p4);
    assert.isFalse(fp4.didChangeExecutableMode());
  });

  describe('getStagePatchForLines()', function() {
    it('returns a new FilePatch that applies only the specified lines', function() {
      const filePatch = createFilePatch('a.txt', 'a.txt', 'modified', [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1),
        ]),
        new Hunk(20, 19, 2, 2, '', [
          new HunkLine('line-12', 'deleted', 20, -1),
          new HunkLine('line-13', 'added', -1, 19),
          new HunkLine('line-14', 'unchanged', 21, 20),
          new HunkLine('No newline at end of file', 'nonewline', -1, -1),
        ]),
      ]);
      const linesFromHunk2 = filePatch.getHunks()[1].getLines().slice(1, 4);
      assert.deepEqual(filePatch.getStagePatchForLines(new Set(linesFromHunk2)), createFilePatch(
        'a.txt', 'a.txt', 'modified', [
          new Hunk(5, 5, 5, 4, '', [
            new HunkLine('line-4', 'unchanged', 5, 5),
            new HunkLine('line-5', 'deleted', 6, -1),
            new HunkLine('line-6', 'deleted', 7, -1),
            new HunkLine('line-7', 'added', -1, 6),
            new HunkLine('line-10', 'unchanged', 8, 7),
            new HunkLine('line-11', 'unchanged', 9, 8),
          ]),
        ],
      ));

      // add lines from other hunks
      const linesFromHunk1 = filePatch.getHunks()[0].getLines().slice(0, 1);
      const linesFromHunk3 = filePatch.getHunks()[2].getLines().slice(1, 2);
      const selectedLines = linesFromHunk2.concat(linesFromHunk1, linesFromHunk3);
      assert.deepEqual(filePatch.getStagePatchForLines(new Set(selectedLines)), createFilePatch(
        'a.txt', 'a.txt', 'modified', [
          new Hunk(1, 1, 1, 2, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-3', 'unchanged', 1, 2),
          ]),
          new Hunk(5, 6, 5, 4, '', [
            new HunkLine('line-4', 'unchanged', 5, 6),
            new HunkLine('line-5', 'deleted', 6, -1),
            new HunkLine('line-6', 'deleted', 7, -1),
            new HunkLine('line-7', 'added', -1, 7),
            new HunkLine('line-10', 'unchanged', 8, 8),
            new HunkLine('line-11', 'unchanged', 9, 9),
          ]),
          new Hunk(20, 18, 2, 3, '', [
            new HunkLine('line-12', 'unchanged', 20, 18),
            new HunkLine('line-13', 'added', -1, 19),
            new HunkLine('line-14', 'unchanged', 21, 20),
            new HunkLine('No newline at end of file', 'nonewline', -1, -1),
          ]),
        ],
      ));
    });

    describe('staging lines from deleted files', function() {
      it('handles staging part of the file', function() {
        const filePatch = createFilePatch('a.txt', null, 'deleted', [
          new Hunk(1, 0, 3, 0, '', [
            new HunkLine('line-1', 'deleted', 1, -1),
            new HunkLine('line-2', 'deleted', 2, -1),
            new HunkLine('line-3', 'deleted', 3, -1),
          ]),
        ]);
        const linesFromHunk = filePatch.getHunks()[0].getLines().slice(0, 2);
        assert.deepEqual(filePatch.getStagePatchForLines(new Set(linesFromHunk)), createFilePatch(
          'a.txt', 'a.txt', 'modified', [
            new Hunk(1, 1, 3, 1, '', [
              new HunkLine('line-1', 'deleted', 1, -1),
              new HunkLine('line-2', 'deleted', 2, -1),
              new HunkLine('line-3', 'unchanged', 3, 1),
            ]),
          ],
        ));
      });

      it('handles staging all lines, leaving nothing unstaged', function() {
        const filePatch = createFilePatch('a.txt', null, 'deleted', [
          new Hunk(1, 0, 3, 0, '', [
            new HunkLine('line-1', 'deleted', 1, -1),
            new HunkLine('line-2', 'deleted', 2, -1),
            new HunkLine('line-3', 'deleted', 3, -1),
          ]),
        ]);
        const linesFromHunk = filePatch.getHunks()[0].getLines();
        assert.deepEqual(filePatch.getStagePatchForLines(new Set(linesFromHunk)), createFilePatch(
          'a.txt', null, 'deleted', [
            new Hunk(1, 0, 3, 0, '', [
              new HunkLine('line-1', 'deleted', 1, -1),
              new HunkLine('line-2', 'deleted', 2, -1),
              new HunkLine('line-3', 'deleted', 3, -1),
            ]),
          ],
        ));
      });
    });
  });

  describe('getUnstagePatchForLines()', function() {
    it('returns a new FilePatch that applies only the specified lines', function() {
      const filePatch = createFilePatch('a.txt', 'a.txt', 'modified', [
        new Hunk(1, 1, 1, 3, '', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, '', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1),
        ]),
        new Hunk(20, 19, 2, 2, '', [
          new HunkLine('line-12', 'deleted', 20, -1),
          new HunkLine('line-13', 'added', -1, 19),
          new HunkLine('line-14', 'unchanged', 21, 20),
          new HunkLine('No newline at end of file', 'nonewline', -1, -1),
        ]),
      ]);
      const lines = new Set(filePatch.getHunks()[1].getLines().slice(1, 5));
      filePatch.getHunks()[2].getLines().forEach(line => lines.add(line));
      assert.deepEqual(filePatch.getUnstagePatchForLines(lines), createFilePatch(
        'a.txt', 'a.txt', 'modified', [
          new Hunk(7, 7, 4, 4, '', [
            new HunkLine('line-4', 'unchanged', 7, 7),
            new HunkLine('line-7', 'deleted', 8, -1),
            new HunkLine('line-8', 'deleted', 9, -1),
            new HunkLine('line-5', 'added', -1, 8),
            new HunkLine('line-6', 'added', -1, 9),
            new HunkLine('line-9', 'unchanged', 10, 10),
          ]),
          new Hunk(19, 21, 2, 2, '', [
            new HunkLine('line-13', 'deleted', 19, -1),
            new HunkLine('line-12', 'added', -1, 21),
            new HunkLine('line-14', 'unchanged', 20, 22),
            new HunkLine('No newline at end of file', 'nonewline', -1, -1),
          ]),
        ],
      ));
    });

    describe('unstaging lines from an added file', function() {
      it('handles unstaging part of the file', function() {
        const filePatch = createFilePatch(null, 'a.txt', 'added', [
          new Hunk(0, 1, 0, 3, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
          ]),
        ]);
        const linesFromHunk = filePatch.getHunks()[0].getLines().slice(0, 2);
        assert.deepEqual(filePatch.getUnstagePatchForLines(new Set(linesFromHunk)), createFilePatch(
          'a.txt', 'a.txt', 'modified', [
            new Hunk(1, 1, 3, 1, '', [
              new HunkLine('line-1', 'deleted', 1, -1),
              new HunkLine('line-2', 'deleted', 2, -1),
              new HunkLine('line-3', 'unchanged', 3, 1),
            ]),
          ],
        ));
      });

      it('handles unstaging all lines, leaving nothign staged', function() {
        const filePatch = createFilePatch(null, 'a.txt', 'added', [
          new Hunk(0, 1, 0, 3, '', [
            new HunkLine('line-1', 'added', -1, 1),
            new HunkLine('line-2', 'added', -1, 2),
            new HunkLine('line-3', 'added', -1, 3),
          ]),
        ]);

        const linesFromHunk = filePatch.getHunks()[0].getLines();
        assert.deepEqual(filePatch.getUnstagePatchForLines(new Set(linesFromHunk)), createFilePatch(
          'a.txt', null, 'deleted', [
            new Hunk(1, 0, 3, 0, '', [
              new HunkLine('line-1', 'deleted', 1, -1),
              new HunkLine('line-2', 'deleted', 2, -1),
              new HunkLine('line-3', 'deleted', 3, -1),
            ]),
          ],
        ));
      });
    });
  });

  it('handles newly added files', function() {
    const filePatch = createFilePatch(null, 'a.txt', 'added', [
      new Hunk(0, 1, 0, 3, '', [
        new HunkLine('line-1', 'added', -1, 1),
        new HunkLine('line-2', 'added', -1, 2),
        new HunkLine('line-3', 'added', -1, 3),
      ]),
    ]);
    const linesFromHunk = filePatch.getHunks()[0].getLines().slice(0, 2);
    assert.deepEqual(filePatch.getUnstagePatchForLines(new Set(linesFromHunk)), createFilePatch(
      'a.txt', 'a.txt', 'modified', [
        new Hunk(1, 1, 3, 1, '', [
          new HunkLine('line-1', 'deleted', 1, -1),
          new HunkLine('line-2', 'deleted', 2, -1),
          new HunkLine('line-3', 'unchanged', 3, 1),
        ]),
      ],
    ));
  });

  describe('toString()', function() {
    it('converts the patch to the standard textual format', async function() {
      const workdirPath = await cloneRepository('multi-line-file');
      const repository = await buildRepository(workdirPath);

      const lines = fs.readFileSync(path.join(workdirPath, 'sample.js'), 'utf8').split('\n');
      lines[0] = 'this is a modified line';
      lines.splice(1, 0, 'this is a new line');
      lines[11] = 'this is a modified line';
      lines.splice(12, 1);
      fs.writeFileSync(path.join(workdirPath, 'sample.js'), lines.join('\n'));

      const patch = await repository.getFilePatchForPath('sample.js');
      assert.equal(patch.toString(), dedent`
        diff --git a/sample.js b/sample.js
        --- a/sample.js
        +++ b/sample.js
        @@ -1,4 +1,5 @@
        -var quicksort = function () {
        +this is a modified line
        +this is a new line
           var sort = function(items) {
             if (items.length <= 1) return items;
             var pivot = items.shift(), current, left = [], right = [];
        @@ -8,6 +9,5 @@
             }
             return sort(left).concat(pivot).concat(sort(right));
           };
        -
        -  return sort(Array.apply(this, arguments));
        +this is a modified line
         };

      `);
    });

    it('correctly formats new files with no newline at the end', async function() {
      const workingDirPath = await cloneRepository('three-files');
      const repo = await buildRepository(workingDirPath);
      fs.writeFileSync(path.join(workingDirPath, 'e.txt'), 'qux', 'utf8');
      const patch = await repo.getFilePatchForPath('e.txt');

      assert.equal(patch.toString(), dedent`
        diff --git a/e.txt b/e.txt
        new file mode 100644
        --- /dev/null
        +++ b/e.txt
        @@ -0,0 +1,1 @@
        +qux
        \\ No newline at end of file

      `);
    });

    describe('typechange file patches', function() {
      it('handles typechange patches for a symlink replaced with a file', async function() {
        const workdirPath = await cloneRepository('symlinks');
        const repository = await buildRepository(workdirPath);

        await repository.git.exec(['config', 'core.symlinks', 'true']);

        const deletedSymlinkAddedFilePath = 'symlink.txt';
        fs.unlinkSync(path.join(workdirPath, deletedSymlinkAddedFilePath));
        fs.writeFileSync(path.join(workdirPath, deletedSymlinkAddedFilePath), 'qux\nfoo\nbar\n', 'utf8');

        const patch = await repository.getFilePatchForPath(deletedSymlinkAddedFilePath);
        assert.equal(patch.toString(), dedent`
          diff --git a/symlink.txt b/symlink.txt
          deleted file mode 120000
          --- a/symlink.txt
          +++ /dev/null
          @@ -1 +0,0 @@
          -./regular-file.txt
          \\ No newline at end of file
          diff --git a/symlink.txt b/symlink.txt
          new file mode 100644
          --- /dev/null
          +++ b/symlink.txt
          @@ -0,0 +1,3 @@
          +qux
          +foo
          +bar

        `);
      });

      it('handles typechange patches for a file replaced with a symlink', async function() {
        const workdirPath = await cloneRepository('symlinks');
        const repository = await buildRepository(workdirPath);

        const deletedFileAddedSymlinkPath = 'a.txt';
        fs.unlinkSync(path.join(workdirPath, deletedFileAddedSymlinkPath));
        fs.symlinkSync(path.join(workdirPath, 'regular-file.txt'), path.join(workdirPath, deletedFileAddedSymlinkPath));

        const patch = await repository.getFilePatchForPath(deletedFileAddedSymlinkPath);
        assert.equal(patch.toString(), dedent`
          diff --git a/a.txt b/a.txt
          deleted file mode 100644
          --- a/a.txt
          +++ /dev/null
          @@ -1,4 +0,0 @@
          -foo
          -bar
          -baz
          -
          diff --git a/a.txt b/a.txt
          new file mode 120000
          --- /dev/null
          +++ b/a.txt
          @@ -0,0 +1 @@
          +${toGitPathSep(path.join(workdirPath, 'regular-file.txt'))}
          \\ No newline at end of file

        `);
      });
    });
  });

  describe('getHeaderString()', function() {
    it('formats paths with git path separators', function() {
      const oldPath = path.join('foo', 'bar', 'old.js');
      const newPath = path.join('baz', 'qux', 'new.js');

      const patch = createFilePatch(oldPath, newPath, 'modified', []);
      assert.equal(patch.getHeaderString(), dedent`
        diff --git a/foo/bar/old.js b/baz/qux/new.js
        --- a/foo/bar/old.js
        +++ b/baz/qux/new.js

      `);
    });
  });

  it('returns the size in bytes from getByteSize()', function() {
    const filePatch = createFilePatch('a.txt', 'a.txt', 'modified', [
      new Hunk(1, 1, 1, 3, '', [
        new HunkLine('line-1', 'added', -1, 1),
        new HunkLine('line-2', 'added', -1, 2),
        new HunkLine('line-3', 'unchanged', 1, 3),
      ]),
      new Hunk(5, 7, 5, 4, '', [
        new HunkLine('line-4', 'unchanged', 5, 7),
        new HunkLine('line-5', 'deleted', 6, -1),
        new HunkLine('line-6', 'deleted', 7, -1),
      ]),
    ]);

    assert.strictEqual(filePatch.getByteSize(), 36);
  });

  describe('present()', function() {
    let presented;

    beforeEach(function() {
      const patch = createFilePatch('a.txt', 'a.txt', 'modified', [
        new Hunk(1, 1, 1, 3, '@@ -1,1 +2,2', [
          new HunkLine('line-1', 'added', -1, 1),
          new HunkLine('line-2', 'added', -1, 2),
          new HunkLine('line-3', 'unchanged', 1, 3),
        ]),
        new Hunk(5, 7, 5, 4, '@@ -3,3 +4,4', [
          new HunkLine('line-4', 'unchanged', 5, 7),
          new HunkLine('line-5', 'deleted', 6, -1),
          new HunkLine('line-6', 'deleted', 7, -1),
          new HunkLine('line-7', 'added', -1, 8),
          new HunkLine('line-8', 'added', -1, 9),
          new HunkLine('line-9', 'added', -1, 10),
          new HunkLine('line-10', 'deleted', 8, -1),
          new HunkLine('line-11', 'deleted', 9, -1),
          new HunkLine('line-12', 'unchanged', 5, 7),
        ]),
        new Hunk(20, 19, 2, 2, '@@ -5,5 +6,6', [
          new HunkLine('line-13', 'deleted', 20, -1),
          new HunkLine('line-14', 'added', -1, 19),
          new HunkLine('line-15', 'unchanged', 21, 20),
          new HunkLine('No newline at end of file', 'nonewline', -1, -1),
        ]),
      ]);

      presented = patch.present();
    });

    function assertPositions(actualPositions, expectedPositions) {
      assert.lengthOf(actualPositions, expectedPositions.length);
      for (let i = 0; i < expectedPositions.length; i++) {
        const actual = actualPositions[i];
        const expected = expectedPositions[i];

        assert.isTrue(actual.isEqual(expected),
          `range ${i}: ${actual.toString()} does not equal [${expected.map(e => e.toString()).join(', ')}]`);
      }
    }

    it('unifies hunks into a continuous, unadorned string of text', function() {
      const actualText = presented.getText();
      const expectedText =
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(num => `line-${num}\n`).join('') +
        'No newline at end of file\n';

      assert.strictEqual(actualText, expectedText);
    });

    it("returns the buffer positions corresponding to each hunk's beginning", function() {
      assertPositions(presented.getHunkStartPositions(), [
        [0, 0], [3, 0], [12, 0],
      ]);
    });

    it('returns the buffer positions corresponding to unchanged lines', function() {
      assertPositions(presented.getUnchangedBufferPositions(), [
        [2, 0], [3, 0], [11, 0], [14, 0],
      ]);
    });

    it('returns the buffer positions corresponding to added lines', function() {
      assertPositions(presented.getAddedBufferPositions(), [
        [0, 0], [1, 0], [6, 0], [7, 0], [8, 0], [13, 0],
      ]);
    });

    it('returns the buffer positions corresponding to deleted lines', function() {
      assertPositions(presented.getDeletedBufferPositions(), [
        [4, 0], [5, 0], [9, 0], [10, 0], [12, 0],
      ]);
    });

    it('returns the buffer position of a "no newline" trailer', function() {
      assertPositions(presented.getNoNewlineBufferPositions(), [
        [15, 0],
      ]);
    });
  });
});
