import {nullFile} from './file';
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

  getAdditionRanges() {
    return this.getHunks().reduce((acc, hunk) => {
      acc.push(...hunk.getAdditionRanges());
      return acc;
    }, []);
  }

  getDeletionRanges() {
    return this.getHunks().reduce((acc, hunk) => {
      acc.push(...hunk.getDeletionRanges());
      return acc;
    }, []);
  }

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
    if (this.patch.getChangedLineCount() === selectedLineSet.size) {
      const patch = this.patch.getFullUnstagedPatch();
      if (this.hasTypechange() && this.getStatus() === 'added') {
        // handle special case when a file was created after a symlink was deleted.
        // In order to unstage the file creation, we must ensure that the unstage patch has no new file,
        // so when the patch is applied to the index, there file will be removed from the index.
        return this.clone({oldFile: nullFile, patch});
      } else {
        return this.clone({patch});
      }
    } else {
      const patch = this.patch.getUnstagePatchForLines(selectedLineSet);
      if (this.getStatus() === 'added') {
        return this.clone({oldFile: this.getNewFile(), patch});
      } else {
        return this.clone({patch});
      }
    }
  }

  getUnstagePatchForHunk(hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getBufferRows()));
  }

  toString() {
    if (this.hasTypechange()) {
      const left = this.clone({
        newFile: nullFile,
        patch: this.getOldSymlink() ? new Patch({status: 'deleted', hunks: []}) : this.getPatch(),
      });

      const right = this.clone({
        oldFile: nullFile,
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
