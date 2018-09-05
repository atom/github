import FilePatch, {nullFilePatch} from '../../../lib/models/patch/file-patch';
import File, {nullFile} from '../../../lib/models/patch/file';
import Patch from '../../../lib/models/patch/patch';
import Hunk from '../../../lib/models/patch/hunk';
import {Addition, Deletion, NoNewline} from '../../../lib/models/patch/region';
import {assertInFilePatch, buildRange} from '../../helpers';

describe('FilePatch', function() {
  it('delegates methods to its files and patch', function() {
    const bufferText = '0000\n0001\n0002\n';
    const hunks = [
      new Hunk({
        oldStartRow: 2, oldRowCount: 1, newStartRow: 2, newRowCount: 3,
        rowRange: buildRange(0, 2),
        changes: [
          new Addition(buildRange(1, 2)),
        ],
      }),
    ];
    const patch = new Patch({status: 'modified', hunks, bufferText});
    const oldFile = new File({path: 'a.txt', mode: '120000', symlink: 'dest.txt'});
    const newFile = new File({path: 'b.txt', mode: '100755'});
    const filePatch = new FilePatch(oldFile, newFile, patch);

    assert.isTrue(filePatch.isPresent());

    assert.strictEqual(filePatch.getOldPath(), 'a.txt');
    assert.strictEqual(filePatch.getOldMode(), '120000');
    assert.strictEqual(filePatch.getOldSymlink(), 'dest.txt');

    assert.strictEqual(filePatch.getNewPath(), 'b.txt');
    assert.strictEqual(filePatch.getNewMode(), '100755');
    assert.isUndefined(filePatch.getNewSymlink());

    assert.strictEqual(filePatch.getByteSize(), 15);
    assert.strictEqual(filePatch.getBufferText(), bufferText);
    assert.strictEqual(filePatch.getMaxLineNumberWidth(), 1);

    assert.deepEqual(filePatch.getFirstChangeRange(), [[1, 0], [1, Infinity]]);

    const nBufferText = '0001\n0002\n';
    const nHunks = [
      new Hunk({
        oldStartRow: 3, oldRowCount: 1, newStartRow: 3, newRowCount: 2,
        rowRange: buildRange(0, 1),
        changes: [
          new Addition(buildRange(1)),
        ],
      }),
    ];
    const nPatch = new Patch({status: 'modified', hunks: nHunks, bufferText: nBufferText});
    const nFilePatch = new FilePatch(oldFile, newFile, nPatch);

    const range = nFilePatch.getNextSelectionRange(filePatch, new Set([1]));
    assert.deepEqual(range, [[1, 0], [1, Infinity]]);
  });

  it('accesses a file path from either side of the patch', function() {
    const oldFile = new File({path: 'old-file.txt', mode: '100644'});
    const newFile = new File({path: 'new-file.txt', mode: '100644'});
    const patch = new Patch({status: 'modified', hunks: [], bufferText: ''});

    assert.strictEqual(new FilePatch(oldFile, newFile, patch).getPath(), 'old-file.txt');
    assert.strictEqual(new FilePatch(oldFile, nullFile, patch).getPath(), 'old-file.txt');
    assert.strictEqual(new FilePatch(nullFile, newFile, patch).getPath(), 'new-file.txt');
    assert.isNull(new FilePatch(nullFile, nullFile, patch).getPath());
  });

  it('iterates addition and deletion ranges from all hunks', function() {
    const bufferText = '0000\n0001\n0002\n0003\n0004\n0005\n0006\n0007\n0008\n0009\n';
    const hunks = [
      new Hunk({
        oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 0,
        rowRange: buildRange(0, 9),
        changes: [
          new Addition(buildRange(1)),
          new Addition(buildRange(3)),
          new Deletion(buildRange(4)),
          new Addition(buildRange(5, 6)),
          new Deletion(buildRange(7)),
          new Addition(buildRange(8)),
        ],
      }),
    ];
    const patch = new Patch({status: 'modified', hunks, bufferText});
    const oldFile = new File({path: 'a.txt', mode: '100644'});
    const newFile = new File({path: 'a.txt', mode: '100644'});
    const filePatch = new FilePatch(oldFile, newFile, patch);

    const additionRanges = filePatch.getAdditionRanges();
    assert.deepEqual(additionRanges.map(range => range.serialize()), [
      [[1, 0], [1, 4]],
      [[3, 0], [3, 4]],
      [[5, 0], [6, 4]],
      [[8, 0], [8, 4]],
    ]);

    const deletionRanges = filePatch.getDeletionRanges();
    assert.deepEqual(deletionRanges.map(range => range.serialize()), [
      [[4, 0], [4, 4]],
      [[7, 0], [7, 4]],
    ]);

    const noNewlineRanges = filePatch.getNoNewlineRanges();
    assert.lengthOf(noNewlineRanges, 0);
  });

  it('returns an empty nonewline range if no hunks are present', function() {
    const patch = new Patch({status: 'modified', hunks: [], bufferText: ''});
    const oldFile = new File({path: 'a.txt', mode: '100644'});
    const newFile = new File({path: 'a.txt', mode: '100644'});
    const filePatch = new FilePatch(oldFile, newFile, patch);

    assert.lengthOf(filePatch.getNoNewlineRanges(), 0);
  });

  it('returns a nonewline range if one is present', function() {
    const bufferText = '0000\n No newline at end of file\n';
    const hunks = [
      new Hunk({
        oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 0,
        rowRange: buildRange(0, 1),
        changes: [
          new Addition(buildRange(0)),
          new NoNewline(buildRange(1, 1, 5, 26)),
        ],
      }),
    ];
    const patch = new Patch({status: 'modified', hunks, bufferText});
    const oldFile = new File({path: 'a.txt', mode: '100644'});
    const newFile = new File({path: 'a.txt', mode: '100644'});
    const filePatch = new FilePatch(oldFile, newFile, patch);

    const noNewlineRanges = filePatch.getNoNewlineRanges();
    assert.deepEqual(noNewlineRanges.map(range => range.serialize()), [
      [[1, 0], [1, 25]],
    ]);
  });

  describe('file-level change detection', function() {
    let emptyPatch;

    beforeEach(function() {
      emptyPatch = new Patch({status: 'modified', hunks: [], bufferText: ''});
    });

    it('detects changes in executable mode', function() {
      const executableFile = new File({path: 'file.txt', mode: '100755'});
      const nonExecutableFile = new File({path: 'file.txt', mode: '100644'});

      assert.isTrue(new FilePatch(nonExecutableFile, executableFile, emptyPatch).didChangeExecutableMode());
      assert.isTrue(new FilePatch(executableFile, nonExecutableFile, emptyPatch).didChangeExecutableMode());
      assert.isFalse(new FilePatch(nonExecutableFile, nonExecutableFile, emptyPatch).didChangeExecutableMode());
      assert.isFalse(new FilePatch(executableFile, executableFile, emptyPatch).didChangeExecutableMode());
      assert.isFalse(new FilePatch(nullFile, nonExecutableFile).didChangeExecutableMode());
      assert.isFalse(new FilePatch(nullFile, executableFile).didChangeExecutableMode());
    });

    it('detects changes in symlink mode', function() {
      const symlinkFile = new File({path: 'file.txt', mode: '120000', symlink: 'dest.txt'});
      const nonSymlinkFile = new File({path: 'file.txt', mode: '100644'});

      assert.isTrue(new FilePatch(nonSymlinkFile, symlinkFile, emptyPatch).hasTypechange());
      assert.isTrue(new FilePatch(symlinkFile, nonSymlinkFile, emptyPatch).hasTypechange());
      assert.isFalse(new FilePatch(nonSymlinkFile, nonSymlinkFile, emptyPatch).hasTypechange());
      assert.isFalse(new FilePatch(symlinkFile, symlinkFile, emptyPatch).hasTypechange());
      assert.isFalse(new FilePatch(nullFile, nonSymlinkFile).hasTypechange());
      assert.isFalse(new FilePatch(nullFile, symlinkFile).hasTypechange());
    });

    it('detects when either file has a symlink destination', function() {
      const symlinkFile = new File({path: 'file.txt', mode: '120000', symlink: 'dest.txt'});
      const nonSymlinkFile = new File({path: 'file.txt', mode: '100644'});

      assert.isTrue(new FilePatch(nonSymlinkFile, symlinkFile, emptyPatch).hasSymlink());
      assert.isTrue(new FilePatch(symlinkFile, nonSymlinkFile, emptyPatch).hasSymlink());
      assert.isFalse(new FilePatch(nonSymlinkFile, nonSymlinkFile, emptyPatch).hasSymlink());
      assert.isTrue(new FilePatch(symlinkFile, symlinkFile, emptyPatch).hasSymlink());
      assert.isFalse(new FilePatch(nullFile, nonSymlinkFile).hasSymlink());
      assert.isTrue(new FilePatch(nullFile, symlinkFile).hasSymlink());
    });
  });

  it('clones itself and overrides select properties', function() {
    const file00 = new File({path: 'file-00.txt', mode: '100644'});
    const file01 = new File({path: 'file-01.txt', mode: '100644'});
    const file10 = new File({path: 'file-10.txt', mode: '100644'});
    const file11 = new File({path: 'file-11.txt', mode: '100644'});
    const patch0 = new Patch({status: 'modified', hunks: [], bufferText: '0'});
    const patch1 = new Patch({status: 'modified', hunks: [], bufferText: '1'});

    const original = new FilePatch(file00, file01, patch0);

    const clone0 = original.clone();
    assert.notStrictEqual(clone0, original);
    assert.strictEqual(clone0.getOldFile(), file00);
    assert.strictEqual(clone0.getNewFile(), file01);
    assert.strictEqual(clone0.getPatch(), patch0);

    const clone1 = original.clone({oldFile: file10});
    assert.notStrictEqual(clone1, original);
    assert.strictEqual(clone1.getOldFile(), file10);
    assert.strictEqual(clone1.getNewFile(), file01);
    assert.strictEqual(clone1.getPatch(), patch0);

    const clone2 = original.clone({newFile: file11});
    assert.notStrictEqual(clone2, original);
    assert.strictEqual(clone2.getOldFile(), file00);
    assert.strictEqual(clone2.getNewFile(), file11);
    assert.strictEqual(clone2.getPatch(), patch0);

    const clone3 = original.clone({patch: patch1});
    assert.notStrictEqual(clone3, original);
    assert.strictEqual(clone3.getOldFile(), file00);
    assert.strictEqual(clone3.getNewFile(), file01);
    assert.strictEqual(clone3.getPatch(), patch1);
  });

  describe('getStagePatchForLines()', function() {
    it('returns a new FilePatch that applies only the selected lines', function() {
      const bufferText = '0000\n0001\n0002\n0003\n0004\n';
      const hunks = [
        new Hunk({
          oldStartRow: 5, oldRowCount: 3, newStartRow: 5, newRowCount: 4,
          rowRange: buildRange(0, 4),
          changes: [
            new Addition(buildRange(1, 2)),
            new Deletion(buildRange(3)),
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
            {kind: 'addition', string: '+0001\n', range: [[1, 0], [1, Infinity]]},
            {kind: 'deletion', string: '-0003\n', range: [[2, 0], [2, Infinity]]},
          ],
        },
      );
    });

    describe('staging lines from deleted files', function() {
      let deletionPatch;

      beforeEach(function() {
        const bufferText = '0000\n0001\n0002\n';
        const hunks = [
          new Hunk({
            oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 0,
            rowRange: buildRange(0, 2),
            changes: [
              new Deletion(buildRange(0, 2)),
            ],
          }),
        ];
        const patch = new Patch({status: 'deleted', hunks, bufferText});
        const oldFile = new File({path: 'file.txt', mode: '100644'});
        deletionPatch = new FilePatch(oldFile, nullFile, patch);
      });

      it('handles staging part of the file', function() {
        const stagedPatch = deletionPatch.getStagePatchForLines(new Set([1, 2]));

        assert.strictEqual(stagedPatch.getStatus(), 'modified');
        assert.strictEqual(stagedPatch.getOldPath(), 'file.txt');
        assert.strictEqual(stagedPatch.getOldMode(), '100644');
        assert.strictEqual(stagedPatch.getNewPath(), 'file.txt');
        assert.strictEqual(stagedPatch.getNewMode(), '100644');
        assert.strictEqual(stagedPatch.getBufferText(), '0000\n0001\n0002\n');
        assertInFilePatch(stagedPatch).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,1 @@',
            changes: [
              {kind: 'deletion', string: '-0001\n-0002\n', range: [[1, 0], [2, Infinity]]},
            ],
          },
        );
      });

      it('handles staging all lines, leaving nothing unstaged', function() {
        const stagedPatch = deletionPatch.getStagePatchForLines(new Set([1, 2, 3]));
        assert.strictEqual(stagedPatch.getStatus(), 'deleted');
        assert.strictEqual(stagedPatch.getOldPath(), 'file.txt');
        assert.strictEqual(stagedPatch.getOldMode(), '100644');
        assert.isFalse(stagedPatch.getNewFile().isPresent());
        assert.strictEqual(stagedPatch.getBufferText(), '0000\n0001\n0002\n');
        assertInFilePatch(stagedPatch).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,0 @@',
            changes: [
              {kind: 'deletion', string: '-0000\n-0001\n-0002\n', range: [[0, 0], [2, 4]]},
            ],
          },
        );
      });

      it('unsets the newFile when a symlink is created where a file was deleted', function() {
        const bufferText = '0000\n0001\n0002\n';
        const hunks = [
          new Hunk({
            oldStartRow: 1, oldRowCount: 3, newStartRow: 1, newRowCount: 0,
            rowRange: buildRange(0, 2),
            changes: [
              new Deletion(buildRange(0, 2)),
            ],
          }),
        ];
        const patch = new Patch({status: 'deleted', hunks, bufferText});
        const oldFile = new File({path: 'file.txt', mode: '100644'});
        const newFile = new File({path: 'file.txt', mode: '120000'});
        const replacePatch = new FilePatch(oldFile, newFile, patch);

        const stagedPatch = replacePatch.getStagePatchForLines(new Set([0, 1, 2]));
        assert.isTrue(stagedPatch.getOldFile().isPresent());
        assert.isFalse(stagedPatch.getNewFile().isPresent());
      });
    });
  });

  it('stages an entire hunk at once', function() {
    const bufferText = '0000\n0001\n0002\n0003\n0004\n0005\n';
    const hunks = [
      new Hunk({
        oldStartRow: 10, oldRowCount: 2, newStartRow: 10, newRowCount: 3,
        rowRange: buildRange(0, 2),
        changes: [
          new Addition(buildRange(1)),
        ],
      }),
      new Hunk({
        oldStartRow: 20,
        oldRowCount: 3,
        newStartRow: 19,
        newRowCount: 2,
        rowRange: buildRange(3, 5),
        changes: [
          new Deletion(buildRange(4)),
        ],
      }),
    ];
    const patch = new Patch({status: 'modified', hunks, bufferText});
    const oldFile = new File({path: 'file.txt', mode: '100644'});
    const newFile = new File({path: 'file.txt', mode: '100644'});
    const filePatch = new FilePatch(oldFile, newFile, patch);

    const stagedPatch = filePatch.getStagePatchForHunk(hunks[1]);
    assert.strictEqual(stagedPatch.getBufferText(), '0003\n0004\n0005\n');
    assertInFilePatch(stagedPatch).hunks(
      {
        startRow: 0,
        endRow: 2,
        header: '@@ -20,3 +18,2 @@',
        changes: [
          {kind: 'deletion', string: '-0004\n', range: [[1, 0], [1, Infinity]]},
        ],
      },
    );
  });

  describe('getUnstagePatchForLines()', function() {
    it('returns a new FilePatch that unstages only the specified lines', function() {
      const bufferText = '0000\n0001\n0002\n0003\n0004\n';
      const hunks = [
        new Hunk({
          oldStartRow: 5, oldRowCount: 3, newStartRow: 5, newRowCount: 4,
          rowRange: buildRange(0, 4),
          changes: [
            new Addition(buildRange(1, 2)),
            new Deletion(buildRange(3)),
          ],
        }),
      ];
      const patch = new Patch({status: 'modified', hunks, bufferText});
      const oldFile = new File({path: 'file.txt', mode: '100644'});
      const newFile = new File({path: 'file.txt', mode: '100644'});
      const filePatch = new FilePatch(oldFile, newFile, patch);

      const unstagedPatch = filePatch.getUnstagePatchForLines(new Set([1, 3]));
      assert.strictEqual(unstagedPatch.getStatus(), 'modified');
      assert.strictEqual(unstagedPatch.getOldPath(), 'file.txt');
      assert.strictEqual(unstagedPatch.getOldMode(), '100644');
      assert.strictEqual(unstagedPatch.getNewPath(), 'file.txt');
      assert.strictEqual(unstagedPatch.getNewMode(), '100644');
      assert.strictEqual(unstagedPatch.getBufferText(), '0000\n0001\n0002\n0003\n0004\n');
      assertInFilePatch(unstagedPatch).hunks(
        {
          startRow: 0,
          endRow: 4,
          header: '@@ -5,4 +5,4 @@',
          changes: [
            {kind: 'deletion', string: '-0001\n', range: [[1, 0], [1, Infinity]]},
            {kind: 'addition', string: '+0003\n', range: [[3, 0], [3, Infinity]]},
          ],
        },
      );
    });

    describe('unstaging lines from an added file', function() {
      let newFile, addedPatch, addedFilePatch;

      beforeEach(function() {
        const bufferText = '0000\n0001\n0002\n';
        const hunks = [
          new Hunk({
            oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 3,
            rowRange: buildRange(0, 2),
            changes: [
              new Addition(buildRange(0, 2)),
            ],
          }),
        ];
        newFile = new File({path: 'file.txt', mode: '100644'});
        addedPatch = new Patch({status: 'added', hunks, bufferText});
        addedFilePatch = new FilePatch(nullFile, newFile, addedPatch);
      });

      it('handles unstaging part of the file', function() {
        const unstagePatch = addedFilePatch.getUnstagePatchForLines(new Set([2]));
        assert.strictEqual(unstagePatch.getStatus(), 'modified');
        assertInFilePatch(unstagePatch).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,2 @@',
            changes: [
              {kind: 'deletion', string: '-0002\n', range: [[2, 0], [2, Infinity]]},
            ],
          },
        );
      });

      it('handles unstaging all lines, leaving nothing staged', function() {
        const unstagePatch = addedFilePatch.getUnstagePatchForLines(new Set([0, 1, 2]));
        assert.strictEqual(unstagePatch.getStatus(), 'deleted');
        assertInFilePatch(unstagePatch).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,0 @@',
            changes: [
              {kind: 'deletion', string: '-0000\n-0001\n-0002\n', range: [[0, 0], [2, 4]]},
            ],
          },
        );
      });

      it('unsets the oldFile when a symlink is deleted and a file is created in its place', function() {
        const oldSymlink = new File({path: 'file.txt', mode: '120000', symlink: 'wat.txt'});
        const patch = new FilePatch(oldSymlink, newFile, addedPatch);
        const unstagePatch = patch.getUnstagePatchForLines(new Set([0, 1, 2]));
        assert.isFalse(unstagePatch.getOldFile().isPresent());
        assertInFilePatch(unstagePatch).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,0 @@',
            changes: [
              {kind: 'deletion', string: '-0000\n-0001\n-0002\n', range: [[0, 0], [2, 4]]},
            ],
          },
        );
      });
    });
  });

  it('unstages an entire hunk at once', function() {
    const bufferText = '0000\n0001\n0002\n0003\n0004\n0005\n';
    const hunks = [
      new Hunk({
        oldStartRow: 10, oldRowCount: 2, newStartRow: 10, newRowCount: 3,
        rowRange: buildRange(0, 2),
        changes: [
          new Addition(buildRange(1)),
        ],
      }),
      new Hunk({
        oldStartRow: 20, oldRowCount: 3, newStartRow: 19, newRowCount: 2,
        rowRange: buildRange(3, 5),
        changes: [
          new Deletion(buildRange(4)),
        ],
      }),
    ];
    const patch = new Patch({status: 'modified', hunks, bufferText});
    const oldFile = new File({path: 'file.txt', mode: '100644'});
    const newFile = new File({path: 'file.txt', mode: '100644'});
    const filePatch = new FilePatch(oldFile, newFile, patch);

    const unstagedPatch = filePatch.getUnstagePatchForHunk(hunks[0]);
    assert.strictEqual(unstagedPatch.getBufferText(), '0000\n0001\n0002\n');
    assertInFilePatch(unstagedPatch).hunks(
      {
        startRow: 0,
        endRow: 2,
        header: '@@ -10,3 +10,2 @@',
        changes: [
          {kind: 'deletion', string: '-0001\n', range: [[1, 0], [1, Infinity]]},
        ],
      },
    );
  });

  describe('toString()', function() {
    it('converts the patch to the standard textual format', function() {
      const bufferText = '0000\n0001\n0002\n0003\n0004\n0005\n0006\n0007\n';
      const hunks = [
        new Hunk({
          oldStartRow: 10, oldRowCount: 4, newStartRow: 10, newRowCount: 3,
          rowRange: buildRange(0, 4),
          changes: [
            new Addition(buildRange(1)),
            new Deletion(buildRange(2, 3)),
          ],
        }),
        new Hunk({
          oldStartRow: 20, oldRowCount: 2, newStartRow: 20, newRowCount: 3,
          rowRange: buildRange(5, 7),
          changes: [
            new Addition(buildRange(6)),
          ],
        }),
      ];
      const patch = new Patch({status: 'modified', hunks, bufferText});
      const oldFile = new File({path: 'a.txt', mode: '100644'});
      const newFile = new File({path: 'b.txt', mode: '100755'});
      const filePatch = new FilePatch(oldFile, newFile, patch);

      const expectedString =
        'diff --git a/a.txt b/b.txt\n' +
        '--- a/a.txt\n' +
        '+++ b/b.txt\n' +
        '@@ -10,4 +10,3 @@\n' +
        ' 0000\n' +
        '+0001\n' +
        '-0002\n' +
        '-0003\n' +
        ' 0004\n' +
        '@@ -20,2 +20,3 @@\n' +
        ' 0005\n' +
        '+0006\n' +
        ' 0007\n';
      assert.strictEqual(filePatch.toString(), expectedString);
    });

    it('correctly formats a file with no newline at the end', function() {
      const bufferText = '0000\n0001\n No newline at end of file\n';
      const hunks = [
        new Hunk({
          oldStartRow: 1, oldRowCount: 1, newStartRow: 1, newRowCount: 2,
          rowRange: buildRange(0, 2),
          changes: [
            new Addition(buildRange(1)),
            new NoNewline(buildRange(2, 2, 5, 27)),
          ],
        }),
      ];
      const patch = new Patch({status: 'modified', hunks, bufferText});
      const oldFile = new File({path: 'a.txt', mode: '100644'});
      const newFile = new File({path: 'b.txt', mode: '100755'});
      const filePatch = new FilePatch(oldFile, newFile, patch);

      const expectedString =
        'diff --git a/a.txt b/b.txt\n' +
        '--- a/a.txt\n' +
        '+++ b/b.txt\n' +
        '@@ -1,1 +1,2 @@\n' +
        ' 0000\n' +
        '+0001\n' +
        '\\ No newline at end of file\n';
      assert.strictEqual(filePatch.toString(), expectedString);
    });

    describe('typechange file patches', function() {
      it('handles typechange patches for a symlink replaced with a file', function() {
        const bufferText = '0000\n0001\n';
        const hunks = [
          new Hunk({
            oldStartRow: 1, oldRowCount: 0, newStartRow: 1, newRowCount: 2,
            rowRange: buildRange(0, 2),
            changes: [
              new Addition(buildRange(0, 2)),
            ],
          }),
        ];
        const patch = new Patch({status: 'added', hunks, bufferText});
        const oldFile = new File({path: 'a.txt', mode: '120000', symlink: 'dest.txt'});
        const newFile = new File({path: 'a.txt', mode: '100644'});
        const filePatch = new FilePatch(oldFile, newFile, patch);

        const expectedString =
          'diff --git a/a.txt b/a.txt\n' +
          'deleted file mode 120000\n' +
          '--- a/a.txt\n' +
          '+++ /dev/null\n' +
          '@@ -1 +0,0 @@\n' +
          '-dest.txt\n' +
          '\\ No newline at end of file\n' +
          'diff --git a/a.txt b/a.txt\n' +
          'new file mode 100644\n' +
          '--- /dev/null\n' +
          '+++ b/a.txt\n' +
          '@@ -1,0 +1,2 @@\n' +
          '+0000\n' +
          '+0001\n';
        assert.strictEqual(filePatch.toString(), expectedString);
      });

      it('handles typechange patches for a file replaced with a symlink', function() {
        const bufferText = '0000\n0001\n';
        const hunks = [
          new Hunk({
            oldStartRow: 1, oldRowCount: 2, newStartRow: 1, newRowCount: 0,
            rowRange: buildRange(0, 2),
            changes: [
              new Deletion(buildRange(0, 2)),
            ],
          }),
        ];
        const patch = new Patch({status: 'deleted', hunks, bufferText});
        const oldFile = new File({path: 'a.txt', mode: '100644'});
        const newFile = new File({path: 'a.txt', mode: '120000', symlink: 'dest.txt'});
        const filePatch = new FilePatch(oldFile, newFile, patch);

        const expectedString =
          'diff --git a/a.txt b/a.txt\n' +
          'deleted file mode 100644\n' +
          '--- a/a.txt\n' +
          '+++ /dev/null\n' +
          '@@ -1,2 +1,0 @@\n' +
          '-0000\n' +
          '-0001\n' +
          'diff --git a/a.txt b/a.txt\n' +
          'new file mode 120000\n' +
          '--- /dev/null\n' +
          '+++ b/a.txt\n' +
          '@@ -0,0 +1 @@\n' +
          '+dest.txt\n' +
          '\\ No newline at end of file\n';
        assert.strictEqual(filePatch.toString(), expectedString);
      });
    });
  });

  it('has a nullFilePatch that stubs all FilePatch methods', function() {
    const rowRange = buildRange(0, 1);

    assert.isFalse(nullFilePatch.isPresent());
    assert.isFalse(nullFilePatch.getOldFile().isPresent());
    assert.isFalse(nullFilePatch.getNewFile().isPresent());
    assert.isFalse(nullFilePatch.getPatch().isPresent());
    assert.isNull(nullFilePatch.getOldPath());
    assert.isNull(nullFilePatch.getNewPath());
    assert.isNull(nullFilePatch.getOldMode());
    assert.isNull(nullFilePatch.getNewMode());
    assert.isNull(nullFilePatch.getOldSymlink());
    assert.isNull(nullFilePatch.getNewSymlink());
    assert.strictEqual(nullFilePatch.getByteSize(), 0);
    assert.strictEqual(nullFilePatch.getBufferText(), '');
    assert.lengthOf(nullFilePatch.getAdditionRanges(), 0);
    assert.lengthOf(nullFilePatch.getDeletionRanges(), 0);
    assert.lengthOf(nullFilePatch.getNoNewlineRanges(), 0);
    assert.isFalse(nullFilePatch.didChangeExecutableMode());
    assert.isFalse(nullFilePatch.hasSymlink());
    assert.isFalse(nullFilePatch.hasTypechange());
    assert.isNull(nullFilePatch.getPath());
    assert.isNull(nullFilePatch.getStatus());
    assert.lengthOf(nullFilePatch.getHunks(), 0);
    assert.isFalse(nullFilePatch.getStagePatchForLines(new Set([0])).isPresent());
    assert.isFalse(nullFilePatch.getStagePatchForHunk(new Hunk({changes: [], rowRange})).isPresent());
    assert.isFalse(nullFilePatch.getUnstagePatchForLines(new Set([0])).isPresent());
    assert.isFalse(nullFilePatch.getUnstagePatchForHunk(new Hunk({changes: [], rowRange})).isPresent());
    assert.strictEqual(nullFilePatch.toString(), '');
  });
});
