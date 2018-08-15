import Hunk from './hunk';
import File, {nullFile} from './file';
import Patch from './patch';
import {toGitPathSep} from '../../helpers';

export default class FilePatch {
  constructor(oldFile, newFile, patch) {
    this.oldFile = oldFile;
    this.newFile = newFile;
    this.patch = patch;
  }

  getOldFile() {
    return this.oldFile;
  }

  getNewFile() {
    return this.newFile;
  }

  getPatch() {
    return this.patch;
  }

  getOldPath() {
    return this.getOldFile().getPath();
  }

  getNewPath() {
    return this.getNewFile().getPath();
  }

  getOldMode() {
    return this.getOldFile().getMode();
  }

  getNewMode() {
    return this.getNewFile().getMode();
  }

  getOldSymlink() {
    return this.getOldFile().getSymlink();
  }

  getNewSymlink() {
    return this.getNewFile().getSymlink();
  }

  getByteSize() {
    return this.getPatch().getByteSize();
  }

  getBufferText() {
    return this.getPatch().getBufferText();
  }

  getHunkStartPositions() {
    return this.getHunks().map(hunk => hunk.getBufferStartPosition());
  }

  getAddedBufferPositions() {
    return this.getHunks().reduce((acc, hunk) => {
      acc.push(...hunk.getAddedBufferPositions());
      return acc;
    }, []);
  }

  getBufferDeletedPositions() {
    return this.getHunks().reduce((acc, hunk) => {
      acc.push(...hunk.getDeletedBufferPositions());
      return acc;
    }, []);
  }

  getBufferNoNewlinePosition() {
    return this.getHunks().reduce((acc, hunk) => {
      const position = hunk.getBufferNoNewlinePosition();
      if (position.isPresent()) {
        acc.push(position);
      }
      return acc;
    }, []);
  }

  didChangeExecutableMode() {
    const oldMode = this.getOldMode();
    const newMode = this.getNewMode();
    return oldMode === '100755' && newMode !== '100755' ||
      oldMode !== '100755' && newMode === '100755';
  }

  didChangeSymlinkMode() {
    const oldMode = this.getOldMode();
    const newMode = this.getNewMode();
    return oldMode === '120000' && newMode !== '120000' ||
      oldMode !== '120000' && newMode === '120000';
  }

  hasSymlink() {
    return this.getOldFile().getSymlink() || this.getNewFile().getSymlink();
  }

  hasTypechange() {
    const oldFile = this.getOldFile();
    const newFile = this.getNewFile();
    return (oldFile.isSymlink() && newFile.isRegularFile()) ||
           (newFile.isSymlink() && oldFile.isRegularFile());
  }

  getPath() {
    return this.getOldPath() || this.getNewPath();
  }

  getStatus() {
    return this.getPatch().getStatus();
  }

  getHunks() {
    return this.getPatch().getHunks();
  }

  clone(opts) {
    return new this.constructor(
      opts.oldFile !== undefined ? opts.oldFile : this.oldFile,
      opts.newFile !== undefined ? opts.newFile : this.newFile,
      opts.patch !== undefined ? opts.patch : this.patch,
    );
  }

  getStagePatchForHunk(selectedHunk) {
    return this.getStagePatchForLines(new Set(selectedHunk.getBufferRows()));
  }

  getStagePatchForLines(selectedLineSet) {
    const wholeFileSelected = this.patch.getChangedLineCount() === selectedLineSet.size;
    if (wholeFileSelected) {
      if (this.hasTypechange() && this.getStatus() === 'deleted') {
        // handle special case when symlink is created where a file was deleted. In order to stage the file deletion,
        // we must ensure that the created file patch has no new file
        return this.clone({newFile: nullFile});
      } else {
        return this;
      }
    } else {
      const patch = this.patch.getStagePatchForLines(selectedLineSet);
      if (this.getStatus() === 'deleted') {
        // Populate newFile
        return this.clone({
          newFile: this.getOldFile(),
          patch,
        });
      } else {
        return this.clone({patch});
      }
    }
  }

  getUnstagePatchForHunk(hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getUnstagePatchForLines(selectedRowSet) {
    if (this.changedLineCount === selectedRowSet.size) {
      if (this.hasTypechange() && this.getStatus() === 'added') {
        // handle special case when a file was created after a symlink was deleted.
        // In order to unstage the file creation, we must ensure that the unstage patch has no new file,
        // so when the patch is applied to the index, there file will be removed from the index
        return this.clone({
          oldFile: File.empty(),
        }).getUnstagePatch();
      } else {
        return this.getUnstagePatch();
      }
    }

    const hunks = this.getUnstagePatchHunks(selectedRowSet);
    if (this.getStatus() === 'added') {
      return this.clone({
        oldFile: this.getNewFile(),
        patch: this.getPatch().clone({hunks, status: 'modified'}),
      }).getUnstagePatch();
    } else {
      return this.clone({
        patch: this.getPatch().clone({hunks}),
      }).getUnstagePatch();
    }
  }

  getUnstagePatchHunks(selectedRowSet) {
    let delta = 0;
    const hunks = [];
    for (const hunk of this.getHunks()) {
      const additions = [];
      const deletions = [];
      let notAddedRowCount = 0;
      let addedRowCount = 0;
      let notDeletedRowCount = 0;
      let deletedRowCount = 0;

      for (const change of hunk.getAdditions()) {
        notDeletedRowCount += change.bufferRowCount();
        for (const intersection of change.intersectRowsIn(selectedRowSet, this.getBufferText())) {
          deletedRowCount += intersection.bufferRowCount();
          notDeletedRowCount -= intersection.bufferRowCount();
          deletions.push(intersection);
        }
      }

      for (const change of hunk.getDeletions()) {
        notAddedRowCount = change.bufferRowCount();
        for (const intersection of change.intersectRowsIn(selectedRowSet, this.getBufferText())) {
          addedRowCount += intersection.bufferRowCount();
          notAddedRowCount -= intersection.bufferRowCount();
          additions.push(intersection);
        }
      }

      if (additions.length > 0 || deletions.length > 0) {
        // Hunk contains at least one selected line
        hunks.push(new Hunk({
          oldStartRow: hunk.getOldStartRow() + delta,
          newStartRow: hunk.getNewStartRow(),
          oldRowCount: hunk.bufferRowCount() - addedRowCount,
          newRowCount: hunk.getNewRowCount(),
          sectionHeading: hunk.getSectionHeading(),
          rowRange: hunk.getRowRange(),
          additions,
          deletions,
          noNewline: hunk.getNoNewline(),
        }));
      }
      delta += notDeletedRowCount - notAddedRowCount;
    }
    return hunks;
  }

  toString() {
    if (this.hasTypechange()) {
      const left = this.clone({
        newFile: File.empty(),
        patch: this.getOldSymlink() ? new Patch({status: 'deleted', hunks: []}) : this.getPatch(),
      });
      const right = this.clone({
        oldFile: File.empty(),
        patch: this.getNewSymlink() ? new Patch({status: 'added', hunks: []}) : this.getPatch(),
      });

      return left.toString() + right.toString();
    } else if (this.getStatus() === 'added' && this.getNewFile().isSymlink()) {
      const symlinkPath = this.getNewSymlink();
      return this.getHeaderString() + `@@ -0,0 +1 @@\n+${symlinkPath}\n\\ No newline at end of file\n`;
    } else if (this.getStatus() === 'deleted' && this.getOldFile().isSymlink()) {
      const symlinkPath = this.getOldSymlink();
      return this.getHeaderString() + `@@ -1 +0,0 @@\n-${symlinkPath}\n\\ No newline at end of file\n`;
    } else {
      return this.getHeaderString() + this.getPatch().toString();
    }
  }

  getHeaderString() {
    const fromPath = this.getOldPath() || this.getNewPath();
    const toPath = this.getNewPath() || this.getOldPath();
    let header = `diff --git a/${toGitPathSep(fromPath)} b/${toGitPathSep(toPath)}`;
    header += '\n';
    if (this.getStatus() === 'added') {
      header += `new file mode ${this.getNewMode()}`;
      header += '\n';
    } else if (this.getStatus() === 'deleted') {
      header += `deleted file mode ${this.getOldMode()}`;
      header += '\n';
    }
    header += this.getOldPath() ? `--- a/${toGitPathSep(this.getOldPath())}` : '--- /dev/null';
    header += '\n';
    header += this.getNewPath() ? `+++ b/${toGitPathSep(this.getNewPath())}` : '+++ /dev/null';
    header += '\n';
    return header;
  }
}
