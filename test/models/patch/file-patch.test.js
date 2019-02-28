import {TextBuffer} from 'atom';

import FilePatch from '../../../lib/models/patch/file-patch';
import File, {nullFile} from '../../../lib/models/patch/file';
import {patchBuilder} from '../../builder/patch';
import {assertInFilePatch} from '../../helpers';

describe('FilePatch', function() {
  it('delegates methods to its files and patch', function() {
    const {patch} = patchBuilder().addHunk(
      h => h.oldRow(2).unchanged('0').added('1', '2'),
    ).build();
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

    assert.strictEqual(filePatch.getMarker(), patch.marker);
    assert.strictEqual(filePatch.getMaxLineNumberWidth(), 1);
  });

  it('accesses a file path from either side of the patch', function() {
    const oldFile = new File({path: 'old-file.txt', mode: '100644'});
    const newFile = new File({path: 'new-file.txt', mode: '100644'});
    const {patch} = patchBuilder().addHunk().build();

    assert.strictEqual(new FilePatch(oldFile, newFile, patch).getPath(), 'old-file.txt');
    assert.strictEqual(new FilePatch(oldFile, nullFile, patch).getPath(), 'old-file.txt');
    assert.strictEqual(new FilePatch(nullFile, newFile, patch).getPath(), 'new-file.txt');
    assert.isNull(new FilePatch(nullFile, nullFile, patch).getPath());
  });

  it('returns the starting range of the patch', function() {
    const {patch} = patchBuilder().addHunk(
      h => h.oldRow(2).unchanged('0000').added('0001', '0002'),
    ).build();
    const oldFile = new File({path: 'a.txt', mode: '100644'});
    const newFile = new File({path: 'a.txt', mode: '100644'});

    const filePatch = new FilePatch(oldFile, newFile, patch);
    assert.deepEqual(filePatch.getStartRange().serialize(), [[0, 0], [0, 0]]);
  });

  describe('file-level change detection', function() {
    let emptyPatch;

    beforeEach(function() {
      emptyPatch = patchBuilder().empty().build();
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
      assert.isFalse(new FilePatch(nonExecutableFile, nullFile).didChangeExecutableMode());
      assert.isFalse(new FilePatch(executableFile, nullFile).didChangeExecutableMode());
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
      assert.isFalse(new FilePatch(nonSymlinkFile, nullFile).hasTypechange());
      assert.isFalse(new FilePatch(symlinkFile, nullFile).hasTypechange());
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
      assert.isFalse(new FilePatch(nonSymlinkFile, nullFile).hasSymlink());
      assert.isTrue(new FilePatch(symlinkFile, nullFile).hasSymlink());
    });
  });

  it('clones itself and overrides select properties', function() {
    const file00 = new File({path: 'file-00.txt', mode: '100644'});
    const file01 = new File({path: 'file-01.txt', mode: '100644'});
    const file10 = new File({path: 'file-10.txt', mode: '100644'});
    const file11 = new File({path: 'file-11.txt', mode: '100644'});
    const {patch: patch0} = patchBuilder().addHunk().build();
    const {patch: patch1} = patchBuilder().addHunk().build();

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

  describe('buildStagePatchForLines()', function() {
    let stagedLayeredBuffer;

    beforeEach(function() {
      const buffer = new TextBuffer();
      const layers = buildLayers(buffer);
      stagedLayeredBuffer = {buffer, layers};
    });

    it('returns a new FilePatch that applies only the selected lines', function() {
      const {buffer, patch} = patchBuilder().addHunk(
        h => h.oldRow(5).unchanged('0000').added('0001', '0002').deleted('0003').unchanged('0004'),
      ).build();
      const oldFile = new File({path: 'file.txt', mode: '100644'});
      const newFile = new File({path: 'file.txt', mode: '100644'});
      const filePatch = new FilePatch(oldFile, newFile, patch);

      const stagedPatch = filePatch.buildStagePatchForLines(buffer, stagedLayeredBuffer, new Set([1, 3]));
      assert.strictEqual(stagedPatch.getStatus(), 'modified');
      assert.strictEqual(stagedPatch.getOldFile(), oldFile);
      assert.strictEqual(stagedPatch.getNewFile(), newFile);
      assert.strictEqual(stagedLayeredBuffer.buffer.getText(), '0000\n0001\n0003\n0004\n');
      assertInFilePatch(stagedPatch, stagedLayeredBuffer.buffer).hunks(
        {
          startRow: 0,
          endRow: 3,
          header: '@@ -5,3 +5,3 @@',
          regions: [
            {kind: 'unchanged', string: ' 0000\n', range: [[0, 0], [0, 4]]},
            {kind: 'addition', string: '+0001\n', range: [[1, 0], [1, 4]]},
            {kind: 'deletion', string: '-0003\n', range: [[2, 0], [2, 4]]},
            {kind: 'unchanged', string: ' 0004\n', range: [[3, 0], [3, 4]]},
          ],
        },
      );
    });

    describe('staging lines from deleted files', function() {
      let buffer;
      let oldFile, deletionPatch;

      beforeEach(function() {
        const {patch, buffer: b} = patchBuilder().status('deleted').addHunk(
          h => h.oldRow(1).deleted('0000', '0001', '0002'),
        ).build();
        buffer = b;
        oldFile = new File({path: 'file.txt', mode: '100644'});
        deletionPatch = new FilePatch(oldFile, nullFile, patch);
      });

      it('handles staging part of the file', function() {
        const stagedPatch = deletionPatch.buildStagePatchForLines(buffer, stagedLayeredBuffer, new Set([1, 2]));

        assert.strictEqual(stagedPatch.getStatus(), 'modified');
        assert.strictEqual(stagedPatch.getOldFile(), oldFile);
        assert.strictEqual(stagedPatch.getNewFile(), oldFile);
        assert.strictEqual(stagedLayeredBuffer.buffer.getText(), '0000\n0001\n0002\n');
        assertInFilePatch(stagedPatch, stagedLayeredBuffer.buffer).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,1 @@',
            regions: [
              {kind: 'unchanged', string: ' 0000\n', range: [[0, 0], [0, 4]]},
              {kind: 'deletion', string: '-0001\n-0002\n', range: [[1, 0], [2, 4]]},
            ],
          },
        );
      });

      it('handles staging all lines, leaving nothing unstaged', function() {
        const stagedPatch = deletionPatch.buildStagePatchForLines(buffer, stagedLayeredBuffer, new Set([0, 1, 2]));
        assert.strictEqual(stagedPatch.getStatus(), 'deleted');
        assert.strictEqual(stagedPatch.getOldFile(), oldFile);
        assert.isFalse(stagedPatch.getNewFile().isPresent());
        assert.strictEqual(stagedLayeredBuffer.buffer.getText(), '0000\n0001\n0002\n');
        assertInFilePatch(stagedPatch, stagedLayeredBuffer.buffer).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,0 @@',
            regions: [
              {kind: 'deletion', string: '-0000\n-0001\n-0002\n', range: [[0, 0], [2, 4]]},
            ],
          },
        );
      });

      it('unsets the newFile when a symlink is created where a file was deleted', function() {
        const {patch, buffer: nBuffer} = patchBuilder().status('deleted').addHunk(
          h => h.oldRow(1).deleted('0000', '0001', '0002'),
        ).build();
        oldFile = new File({path: 'file.txt', mode: '100644'});
        const newFile = new File({path: 'file.txt', mode: '120000'});
        const replacePatch = new FilePatch(oldFile, newFile, patch);

        const stagedPatch = replacePatch.buildStagePatchForLines(nBuffer, stagedLayeredBuffer, new Set([0, 1, 2]));
        assert.strictEqual(stagedPatch.getOldFile(), oldFile);
        assert.isFalse(stagedPatch.getNewFile().isPresent());
      });
    });
  });

  describe('getUnstagePatchForLines()', function() {
    let unstageLayeredBuffer;

    beforeEach(function() {
      const buffer = new TextBuffer();
      const layers = buildLayers(buffer);
      unstageLayeredBuffer = {buffer, layers};
    });

    it('returns a new FilePatch that unstages only the specified lines', function() {
      const {patch, buffer} = patchBuilder().addHunk(
        h => h.oldRow(5).unchanged('0000').added('0001', '0002').deleted('0003').unchanged('0004'),
      ).build();
      const oldFile = new File({path: 'file.txt', mode: '100644'});
      const newFile = new File({path: 'file.txt', mode: '100644'});
      const filePatch = new FilePatch(oldFile, newFile, patch);

      const unstagedPatch = filePatch.buildUnstagePatchForLines(buffer, unstageLayeredBuffer, new Set([1, 3]));
      assert.strictEqual(unstagedPatch.getStatus(), 'modified');
      assert.strictEqual(unstagedPatch.getOldFile(), newFile);
      assert.strictEqual(unstagedPatch.getNewFile(), newFile);
      assert.strictEqual(unstageLayeredBuffer.buffer.getText(), '0000\n0001\n0002\n0003\n0004\n');
      assertInFilePatch(unstagedPatch, unstageLayeredBuffer.buffer).hunks(
        {
          startRow: 0,
          endRow: 4,
          header: '@@ -5,4 +5,4 @@',
          regions: [
            {kind: 'unchanged', string: ' 0000\n', range: [[0, 0], [0, 4]]},
            {kind: 'deletion', string: '-0001\n', range: [[1, 0], [1, 4]]},
            {kind: 'unchanged', string: ' 0002\n', range: [[2, 0], [2, 4]]},
            {kind: 'addition', string: '+0003\n', range: [[3, 0], [3, 4]]},
            {kind: 'unchanged', string: ' 0004\n', range: [[4, 0], [4, 4]]},
          ],
        },
      );
    });

    describe('unstaging lines from an added file', function() {
      let buffer;
      let newFile, addedPatch, addedFilePatch;

      beforeEach(function() {
        const {patch, buffer: b} = patchBuilder().status('added').addHunk(
          h => h.oldRow(1).added('0000', '0001', '0002'),
        ).build();
        addedPatch = patch;
        buffer = b;
        newFile = new File({path: 'file.txt', mode: '100644'});
        addedFilePatch = new FilePatch(nullFile, newFile, addedPatch);
      });

      it('handles unstaging part of the file', function() {
        const unstagePatch = addedFilePatch.buildUnstagePatchForLines(buffer, unstageLayeredBuffer, new Set([2]));
        assert.strictEqual(unstagePatch.getStatus(), 'modified');
        assert.strictEqual(unstagePatch.getOldFile(), newFile);
        assert.strictEqual(unstagePatch.getNewFile(), newFile);
        assertInFilePatch(unstagePatch, unstageLayeredBuffer.buffer).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,2 @@',
            regions: [
              {kind: 'unchanged', string: ' 0000\n 0001\n', range: [[0, 0], [1, 4]]},
              {kind: 'deletion', string: '-0002\n', range: [[2, 0], [2, 4]]},
            ],
          },
        );
      });

      it('handles unstaging all lines, leaving nothing staged', function() {
        const unstagePatch = addedFilePatch.buildUnstagePatchForLines(buffer, unstageLayeredBuffer, new Set([0, 1, 2]));
        assert.strictEqual(unstagePatch.getStatus(), 'deleted');
        assert.strictEqual(unstagePatch.getOldFile(), newFile);
        assert.isFalse(unstagePatch.getNewFile().isPresent());
        assertInFilePatch(unstagePatch, unstageLayeredBuffer.buffer).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,0 @@',
            regions: [
              {kind: 'deletion', string: '-0000\n-0001\n-0002\n', range: [[0, 0], [2, 4]]},
            ],
          },
        );
      });

      it('unsets the newFile when a symlink is deleted and a file is created in its place', function() {
        const oldSymlink = new File({path: 'file.txt', mode: '120000', symlink: 'wat.txt'});
        const patch = new FilePatch(oldSymlink, newFile, addedPatch);
        const unstagePatch = patch.buildUnstagePatchForLines(buffer, unstageLayeredBuffer, new Set([0, 1, 2]));
        assert.strictEqual(unstagePatch.getOldFile(), newFile);
        assert.isFalse(unstagePatch.getNewFile().isPresent());
        assertInFilePatch(unstagePatch, unstageLayeredBuffer.buffer).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,3 +1,0 @@',
            regions: [
              {kind: 'deletion', string: '-0000\n-0001\n-0002\n', range: [[0, 0], [2, 4]]},
            ],
          },
        );
      });
    });

    describe('unstaging lines from a removed file', function() {
      let oldFile, removedFilePatch, buffer;

      beforeEach(function() {
        const {patch: removedPatch, buffer: b} = patchBuilder().status('deleted').addHunk(
          h => h.oldRow(1).deleted('0000', '0001', '0002'),
        ).build();
        buffer = b;
        oldFile = new File({path: 'file.txt', mode: '100644'});
        removedFilePatch = new FilePatch(oldFile, nullFile, removedPatch);
      });

      it('handles unstaging part of the file', function() {
        const discardPatch = removedFilePatch.buildUnstagePatchForLines(buffer, unstageLayeredBuffer, new Set([1]));
        assert.strictEqual(discardPatch.getStatus(), 'added');
        assert.strictEqual(discardPatch.getOldFile(), nullFile);
        assert.strictEqual(discardPatch.getNewFile(), oldFile);
        assertInFilePatch(discardPatch, unstageLayeredBuffer.buffer).hunks(
          {
            startRow: 0,
            endRow: 0,
            header: '@@ -1,0 +1,1 @@',
            regions: [
              {kind: 'addition', string: '+0001\n', range: [[0, 0], [0, 4]]},
            ],
          },
        );
      });

      it('handles unstaging the entire file', function() {
        const discardPatch = removedFilePatch.buildUnstagePatchForLines(
          buffer,
          unstageLayeredBuffer,
          new Set([0, 1, 2]),
        );
        assert.strictEqual(discardPatch.getStatus(), 'added');
        assert.strictEqual(discardPatch.getOldFile(), nullFile);
        assert.strictEqual(discardPatch.getNewFile(), oldFile);
        assertInFilePatch(discardPatch, unstageLayeredBuffer.buffer).hunks(
          {
            startRow: 0,
            endRow: 2,
            header: '@@ -1,0 +1,3 @@',
            regions: [
              {kind: 'addition', string: '+0000\n+0001\n+0002\n', range: [[0, 0], [2, 4]]},
            ],
          },
        );
      });
    });
  });

  describe('toStringIn()', function() {
    it('converts the patch to the standard textual format', function() {
      const {patch, buffer} = patchBuilder()
        .addHunk(h =>
          h.oldRow(10).unchanged('0000').added('0001').deleted('0002', '0003').unchanged('0004'))
        .addHunk(h =>
          h.oldRow(20).unchanged('0005').added('0006').unchanged('0007'))
        .build();
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
        '@@ -20,2 +19,3 @@\n' +
        ' 0005\n' +
        '+0006\n' +
        ' 0007\n';
      assert.strictEqual(filePatch.toStringIn(buffer), expectedString);
    });

    it('correctly formats a file with no newline at the end', function() {
      const {patch, buffer} = patchBuilder().addHunk(
        h => h.oldRow(1).unchanged('0000').added('0001').noNewline(),
      ).build();
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
      assert.strictEqual(filePatch.toStringIn(buffer), expectedString);
    });

    describe('typechange file patches', function() {
      it('handles typechange patches for a symlink replaced with a file', function() {
        const {patch, buffer} = patchBuilder().status('added').addHunk(
          h => h.oldRow(1).added('0000', '0001'),
        ).build();
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
        assert.strictEqual(filePatch.toStringIn(buffer), expectedString);
      });

      it('handles typechange patches for a file replaced with a symlink', function() {
        const {patch, buffer} = patchBuilder().status('deleted').addHunk(
          h => h.oldRow(1).deleted('0000', '0001'),
        ).build();
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
        assert.strictEqual(filePatch.toStringIn(buffer), expectedString);
      });
    });
  });

  it('has a nullFilePatch that stubs all FilePatch methods', function() {
    const nullFilePatch = FilePatch.createNull();

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
    assert.isFalse(nullFilePatch.didChangeExecutableMode());
    assert.isFalse(nullFilePatch.hasSymlink());
    assert.isFalse(nullFilePatch.hasTypechange());
    assert.isNull(nullFilePatch.getPath());
    assert.isNull(nullFilePatch.getStatus());
    assert.lengthOf(nullFilePatch.getHunks(), 0);
    assert.isFalse(nullFilePatch.buildStagePatchForLines(new Set([0])).isPresent());
    assert.isFalse(nullFilePatch.buildUnstagePatchForLines(new Set([0])).isPresent());
    assert.strictEqual(nullFilePatch.toStringIn(new TextBuffer()), '');
  });
});

function buildLayers(buffer) {
  return {
    patch: buffer.addMarkerLayer(),
    hunk: buffer.addMarkerLayer(),
    unchanged: buffer.addMarkerLayer(),
    addition: buffer.addMarkerLayer(),
    deletion: buffer.addMarkerLayer(),
    noNewline: buffer.addMarkerLayer(),
  };
}
