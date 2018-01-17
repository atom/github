import Hunk from './hunk';
import {toGitPathSep} from '../helpers';

class File {
  static empty() {
    return new File({path: null, mode: null, symlink: null});
  }

  constructor({path, mode, symlink}) {
    this.path = path;
    this.mode = mode;
    this.symlink = symlink;
  }

  getPath() {
    return this.path;
  }

  getMode() {
    return this.mode;
  }

  isSymlink() {
    return this.getMode() === '120000';
  }

  isRegularFile() {
    return this.getMode() === '100644' || this.getMode() === '100755';
  }

  getSymlink() {
    return this.symlink;
  }

  clone(opts = {}) {
    return new File({
      path: opts.path !== undefined ? opts.path : this.path,
      mode: opts.mode !== undefined ? opts.mode : this.mode,
      symlink: opts.symlink !== undefined ? opts.symlink : this.symlink,
    });
  }
}

class Patch {
  constructor({status, hunks}) {
    this.status = status;
    this.hunks = hunks;
  }

  getStatus() {
    return this.status;
  }

  getHunks() {
    return this.hunks;
  }

  clone(opts = {}) {
    return new Patch({
      status: opts.status !== undefined ? opts.status : this.status,
      hunks: opts.hunks !== undefined ? opts.hunks : this.hunks,
    });
  }
}

export default class FilePatch {
  static File = File;
  static Patch = Patch;

  constructor(oldFile, newFile, patch) {
    this.oldFile = oldFile;
    this.newFile = newFile;
    this.patch = patch;

    this.changedLineCount = this.getHunks().reduce((acc, hunk) => {
      return acc + hunk.getLines().filter(line => line.isChanged()).length;
    }, 0);
  }

  clone(opts = {}) {
    const oldFile = opts.oldFile !== undefined ? opts.oldFile : this.getOldFile();
    const newFile = opts.newFile !== undefined ? opts.newFile : this.getNewFile();
    const patch = opts.patch !== undefined ? opts.patch : this.patch;
    return new FilePatch(oldFile, newFile, patch);
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

  getStagePatchForHunk(selectedHunk) {
    return this.getStagePatchForLines(new Set(selectedHunk.getLines()));
  }

  getStagePatchForLines(selectedLines) {
    if (this.changedLineCount === [...selectedLines].filter(line => line.isChanged()).length) {
      if (this.hasTypechange() && this.getStatus() === 'deleted') {
        // handle special case when symlink is created where a file was deleted. In order to stage the file deletion,
        // we must ensure that the created file patch has no new file
        return this.clone({
          newFile: new File({path: null, mode: null, symlink: null}),
        });
      } else {
        return this;
      }
    }

    let delta = 0;
    const hunks = [];
    for (const hunk of this.getHunks()) {
      const newStartRow = (hunk.getNewStartRow() || 1) + delta;
      let newLineNumber = newStartRow;
      const lines = [];
      let hunkContainsSelectedLines = false;
      for (const line of hunk.getLines()) {
        if (line.getStatus() === 'nonewline') {
          lines.push(line.copy({oldLineNumber: -1, newLineNumber: -1}));
        } else if (selectedLines.has(line)) {
          hunkContainsSelectedLines = true;
          if (line.getStatus() === 'deleted') {
            lines.push(line.copy());
          } else {
            lines.push(line.copy({newLineNumber: newLineNumber++}));
          }
        } else if (line.getStatus() === 'deleted') {
          lines.push(line.copy({newLineNumber: newLineNumber++, status: 'unchanged'}));
        } else if (line.getStatus() === 'unchanged') {
          lines.push(line.copy({newLineNumber: newLineNumber++}));
        }
      }
      const newRowCount = newLineNumber - newStartRow;
      if (hunkContainsSelectedLines) {
        // eslint-disable-next-line max-len
        hunks.push(new Hunk(hunk.getOldStartRow(), newStartRow, hunk.getOldRowCount(), newRowCount, hunk.getSectionHeading(), lines));
      }
      delta += newRowCount - hunk.getNewRowCount();
    }

    if (this.hasTypechange() && this.getStatus() === 'deleted') {
      // handle special case when symlink is created where a file was deleted.
      // In order to stage the line deletion, we must ensure that the created file patch a modified status
      // and that new file is not a symlink
      return this.clone({
        newFile: this.getNewFile().clone({mode: null, symlink: null}),
        patch: this.getPatch().clone({hunks, status: 'modified'}),
      });
    } else {
      return this.clone({
        newFile: this.getNewPath() ? this.getNewFile() : this.getOldFile(),
        patch: this.getPatch().clone({hunks, status: 'modified'}),
      });
    }
  }

  getUnstagePatch() {
    let invertedStatus;
    switch (this.getStatus()) {
      case 'modified':
        invertedStatus = 'modified';
        break;
      case 'added':
        invertedStatus = 'deleted';
        break;
      case 'deleted':
        invertedStatus = 'added';
        break;
      default:
        // throw new Error(`Unknown Status: ${this.getStatus()}`);
    }
    const invertedHunks = this.getHunks().map(h => h.invert());
    return this.clone({
      oldFile: this.getNewFile(),
      newFile: this.getOldFile(),
      patch: this.getPatch().clone({
        status: invertedStatus,
        hunks: invertedHunks,
      }),
    });
  }

  getUnstagePatchForHunk(hunk) {
    return this.getUnstagePatchForLines(new Set(hunk.getLines()));
  }

  getUnstagePatchForLines(selectedLines) {
    if (this.changedLineCount === [...selectedLines].filter(line => line.isChanged()).length) {
      if (this.hasTypechange() && this.getStatus() === 'added') {
        // handle special case when a file was created after a symlink was deleted.
        // In order to unstage the file creation, we must ensure that the unstage patch has no new file,
        // so when the patch is applied to the index, there file will be removed from the index
        return this.getUnstagePatch().clone({
          newFile: new File({path: null, mode: null, symlink: null}),
        });
      } else {
        return this.getUnstagePatch();
      }
    }

    let delta = 0;
    const hunks = [];
    for (const hunk of this.getHunks()) {
      const oldStartRow = (hunk.getOldStartRow() || 1) + delta;
      let oldLineNumber = oldStartRow;
      const lines = [];
      let hunkContainsSelectedLines = false;
      for (const line of hunk.getLines()) {
        if (line.getStatus() === 'nonewline') {
          lines.push(line.copy({oldLineNumber: -1, newLineNumber: -1}));
        } else if (selectedLines.has(line)) {
          hunkContainsSelectedLines = true;
          if (line.getStatus() === 'added') {
            lines.push(line.copy());
          } else {
            lines.push(line.copy({oldLineNumber: oldLineNumber++}));
          }
        } else if (line.getStatus() === 'added') {
          lines.push(line.copy({oldLineNumber: oldLineNumber++, status: 'unchanged'}));
        } else if (line.getStatus() === 'unchanged') {
          lines.push(line.copy({oldLineNumber: oldLineNumber++}));
        }
      }
      const oldRowCount = oldLineNumber - oldStartRow;
      if (hunkContainsSelectedLines) {
        // eslint-disable-next-line max-len
        hunks.push(new Hunk(oldStartRow, hunk.getNewStartRow(), oldRowCount, hunk.getNewRowCount(), hunk.getSectionHeading(), lines));
      }
      delta += oldRowCount - hunk.getOldRowCount();
    }

    if (this.hasTypechange() && this.getStatus() === 'added') {
      // handle special case when symlink is created where a file was deleted.
      // In order to unstage the line addition, we must ensure that the created file patch a modified status
      // and that oldFile is not a symlink
      const oldFile = this.getOldPath() ? this.getOldFile() : this.getNewFile();
      return this.clone({
        oldFile: oldFile.clone({mode: null, symlink: null}),
        patch: this.getPatch().clone({hunks, status: 'modified'}),
      }).getUnstagePatch();
    } else {
      return this.clone({
        oldFile: this.getOldPath() ? this.getOldFile() : this.getNewFile(),
        patch: this.getPatch().clone({hunks, status: 'modified'}),
      }).getUnstagePatch();
    }
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
      return this.getHeaderString() + this.getHunks().map(h => h.toString()).join('');
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
