import {nullFile} from './file';
import Patch from './patch';
import {toGitPathSep} from '../../helpers';
import {addEvent} from '../../reporter-proxy';

export default class FilePatch {
  static createNull() {
    return new this(nullFile, nullFile, Patch.createNull());
  }

  constructor(oldFile, newFile, patch) {
    this.oldFile = oldFile;
    this.newFile = newFile;
    this.patch = patch;
    const metricsData = {package: 'github'};
    if (this.getPatch()) {
      metricsData.sizeInBytes = this.getByteSize();
    }

    addEvent('file-patch-constructed', metricsData);
  }

  isPresent() {
    return this.oldFile.isPresent() || this.newFile.isPresent() || this.patch.isPresent();
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

  getMarker() {
    return this.getPatch().getMarker();
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

  getHunkAt(bufferRow) {
    return this.getPatch().getHunkAt(bufferRow);
  }

  getBuffer() {
    return this.getPatch().getBuffer();
  }

  getMaxLineNumberWidth() {
    return this.getPatch().getMaxLineNumberWidth();
  }

  getHunkLayer() {
    return this.getPatch().getHunkLayer();
  }

  getUnchangedLayer() {
    return this.getPatch().getUnchangedLayer();
  }

  getAdditionLayer() {
    return this.getPatch().getAdditionLayer();
  }

  getDeletionLayer() {
    return this.getPatch().getDeletionLayer();
  }

  getNoNewlineLayer() {
    return this.getPatch().getNoNewlineLayer();
  }

  // TODO delete if unused
  getAdditionRanges() {
    return this.getHunks().reduce((acc, hunk) => {
      acc.push(...hunk.getAdditionRanges());
      return acc;
    }, []);
  }

  // TODO delete if unused
  getDeletionRanges() {
    return this.getHunks().reduce((acc, hunk) => {
      acc.push(...hunk.getDeletionRanges());
      return acc;
    }, []);
  }

  // TODO delete if unused
  getNoNewlineRanges() {
    const hunks = this.getHunks();
    const lastHunk = hunks[hunks.length - 1];
    if (!lastHunk) {
      return [];
    }

    const range = lastHunk.getNoNewlineRange();
    if (!range) {
      return [];
    }

    return [range];
  }

  adoptBufferFrom(prevFilePatch) {
    this.getPatch().adoptBufferFrom(prevFilePatch.getPatch());
  }

  didChangeExecutableMode() {
    if (!this.oldFile.isPresent() || !this.newFile.isPresent()) {
      return false;
    }

    return this.oldFile.isExecutable() && !this.newFile.isExecutable() ||
      !this.oldFile.isExecutable() && this.newFile.isExecutable();
  }

  hasSymlink() {
    return Boolean(this.getOldFile().getSymlink() || this.getNewFile().getSymlink());
  }

  hasTypechange() {
    if (!this.oldFile.isPresent() || !this.newFile.isPresent()) {
      return false;
    }

    return this.oldFile.isSymlink() && !this.newFile.isSymlink() ||
      !this.oldFile.isSymlink() && this.newFile.isSymlink();
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

  clone(opts = {}) {
    return new this.constructor(
      opts.oldFile !== undefined ? opts.oldFile : this.oldFile,
      opts.newFile !== undefined ? opts.newFile : this.newFile,
      opts.patch !== undefined ? opts.patch : this.patch,
    );
  }

  getStagePatchForLines(selectedLineSet) {
    if (this.patch.getChangedLineCount() === selectedLineSet.size) {
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
        return this.clone({newFile: this.getOldFile(), patch});
      } else {
        return this.clone({patch});
      }
    }
  }

  getStagePatchForHunk(selectedHunk) {
    return this.getStagePatchForLines(new Set(selectedHunk.getBufferRows()));
  }

  getUnstagePatchForLines(selectedLineSet) {
    const wholeFile = this.patch.getChangedLineCount() === selectedLineSet.size;
    const nonNullFile = this.getNewFile().isPresent() ? this.getNewFile() : this.getOldFile();
    let oldFile = this.getNewFile();
    let newFile = nonNullFile;

    if (wholeFile && this.getStatus() === 'added') {
      // Ensure that newFile is null if the patch is an addition because we're deleting the entire file from the
      // index. If a symlink was deleted and replaced by a non-symlink file, we don't want the symlink entry to muck
      // up the patch.
      oldFile = nonNullFile;
      newFile = nullFile;
    } else if (wholeFile && this.getStatus() === 'deleted') {
      oldFile = nullFile;
      newFile = nonNullFile;
    }

    return this.clone({oldFile, newFile, patch: this.patch.getUnstagePatchForLines(selectedLineSet)});
  }

  getUnstagePatchForHunk(hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getBufferRows()));
  }

  getNextSelectionRange(lastFilePatch, lastSelectedRows) {
    return this.getPatch().getNextSelectionRange(lastFilePatch.getPatch(), lastSelectedRows);
  }

  isEqual(other) {
    if (!(other instanceof this.constructor)) { return false; }

    return this === other || (
      this.oldFile.isEqual(other.oldFile) &&
      this.newFile.isEqual(other.newFile) &&
      this.patch.isEqual(other.patch)
    );
  }

  toString() {
    if (!this.isPresent()) {
      return '';
    }

    if (this.hasTypechange()) {
      const left = this.clone({
        newFile: nullFile,
        patch: this.getOldSymlink() ? this.getPatch().clone({status: 'deleted'}) : this.getPatch(),
      });

      const right = this.clone({
        oldFile: nullFile,
        patch: this.getNewSymlink() ? this.getPatch().clone({status: 'added'}) : this.getPatch(),
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
