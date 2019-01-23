import {Emitter} from 'event-kit';

import {nullFile} from './file';
import Patch, {COLLAPSED} from './patch';
import {toGitPathSep} from '../../helpers';

export default class FilePatch {
  static createNull() {
    return new this(nullFile, nullFile, Patch.createNull());
  }

  static createHiddenFilePatch(oldFile, newFile, marker, renderStatus, showFn) {
    return new this(oldFile, newFile, Patch.createHiddenPatch(marker, renderStatus, showFn));
  }

  constructor(oldFile, newFile, patch) {
    this.oldFile = oldFile;
    this.newFile = newFile;
    this.patch = patch;

    this.emitter = new Emitter();
  }

  isPresent() {
    return this.oldFile.isPresent() || this.newFile.isPresent() || this.patch.isPresent();
  }

  getRenderStatus() {
    return this.patch.getRenderStatus();
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

  getStartRange() {
    return this.getPatch().getStartRange();
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

  getFirstChangeRange() {
    return this.getPatch().getFirstChangeRange();
  }

  getMaxLineNumberWidth() {
    return this.getPatch().getMaxLineNumberWidth();
  }

  containsRow(row) {
    return this.getPatch().containsRow(row);
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

  updateMarkers(map) {
    return this.patch.updateMarkers(map);
  }

  triggerCollapseIn(patchBuffer) {
    if (!this.patch.getRenderStatus().isVisible()) {
      return false;
    }

    const oldPatch = this.patch;
    const position = oldPatch.getRange().start.copy();
    const {patchBuffer: subPatchBuffer, markerMap} = patchBuffer.extractPatchBuffer(oldPatch.getRange());
    oldPatch.destroyMarkers();
    oldPatch.updateMarkers(markerMap);

    const patchMarker = patchBuffer.markPosition(Patch.layerName, position, {invalidate: 'never', exclude: true});
    this.patch = Patch.createHiddenPatch(patchMarker, COLLAPSED, () => {
      return {patch: oldPatch, patchBuffer: subPatchBuffer};
    });

    this.didChangeRenderStatus();
    return true;
  }

  triggerExpandIn(patchBuffer, {before, after}) {
    if (this.patch.getRenderStatus().isVisible()) {
      return false;
    }

    const {patch: nextPatch, patchBuffer: subPatchBuffer} = this.patch.show();
    const atStart = this.patch.getInsertionPoint().isEqual([0, 0]);

    patchBuffer
      .createInserterAt(this.patch.getInsertionPoint())
      .keepBefore(before)
      .keepAfter(after)
      .insert(atStart ? '' : '\n')
      .insertPatchBuffer(subPatchBuffer, {callback: map => nextPatch.updateMarkers(map)})
      .apply();

    this.patch.destroyMarkers();
    this.patch = nextPatch;
    this.didChangeRenderStatus();
    return true;
  }

  didChangeRenderStatus() {
    return this.emitter.emit('change-render-status', this);
  }

  onDidChangeRenderStatus(callback) {
    return this.emitter.on('change-render-status', callback);
  }

  clone(opts = {}) {
    return new this.constructor(
      opts.oldFile !== undefined ? opts.oldFile : this.oldFile,
      opts.newFile !== undefined ? opts.newFile : this.newFile,
      opts.patch !== undefined ? opts.patch : this.patch,
    );
  }

  getStartingMarkers() {
    return this.patch.getStartingMarkers();
  }

  getEndingMarkers() {
    return this.patch.getEndingMarkers();
  }

  buildStagePatchForLines(originalBuffer, nextLayeredBuffer, selectedLineSet) {
    let newFile = this.getNewFile();
    if (this.getStatus() === 'deleted') {
      if (
        this.patch.getChangedLineCount() === selectedLineSet.size &&
        Array.from(selectedLineSet, row => this.patch.containsRow(row)).every(Boolean)
      ) {
        // Whole file deletion staged.
        newFile = nullFile;
      } else {
        // Partial file deletion, which becomes a modification.
        newFile = this.getOldFile();
      }
    }

    const patch = this.patch.buildStagePatchForLines(
      originalBuffer,
      nextLayeredBuffer,
      selectedLineSet,
    );
    return this.clone({newFile, patch});
  }

  buildUnstagePatchForLines(originalBuffer, nextLayeredBuffer, selectedLineSet) {
    const nonNullFile = this.getNewFile().isPresent() ? this.getNewFile() : this.getOldFile();
    let oldFile = this.getNewFile();
    let newFile = nonNullFile;

    if (this.getStatus() === 'added') {
      if (
        selectedLineSet.size === this.patch.getChangedLineCount() &&
        Array.from(selectedLineSet, row => this.patch.containsRow(row)).every(Boolean)
      ) {
        // Ensure that newFile is null if the patch is an addition because we're deleting the entire file from the
        // index. If a symlink was deleted and replaced by a non-symlink file, we don't want the symlink entry to muck
        // up the patch.
        oldFile = nonNullFile;
        newFile = nullFile;
      }
    } else if (this.getStatus() === 'deleted') {
      if (
        selectedLineSet.size === this.patch.getChangedLineCount() &&
        Array.from(selectedLineSet, row => this.patch.containsRow(row)).every(Boolean)
      ) {
        oldFile = nullFile;
        newFile = nonNullFile;
      }
    }

    const patch = this.patch.buildUnstagePatchForLines(
      originalBuffer,
      nextLayeredBuffer,
      selectedLineSet,
    );
    return this.clone({oldFile, newFile, patch});
  }

  toStringIn(buffer) {
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

      return left.toStringIn(buffer) + right.toStringIn(buffer);
    } else if (this.getStatus() === 'added' && this.getNewFile().isSymlink()) {
      const symlinkPath = this.getNewSymlink();
      return this.getHeaderString() + `@@ -0,0 +1 @@\n+${symlinkPath}\n\\ No newline at end of file\n`;
    } else if (this.getStatus() === 'deleted' && this.getOldFile().isSymlink()) {
      const symlinkPath = this.getOldSymlink();
      return this.getHeaderString() + `@@ -1 +0,0 @@\n-${symlinkPath}\n\\ No newline at end of file\n`;
    } else {
      return this.getHeaderString() + this.getPatch().toStringIn(buffer);
    }
  }

  /*
   * Construct a String containing diagnostic information about the internal state of this FilePatch.
   */
  inspect(opts = {}) {
    const options = {
      indent: 0,
      ...opts,
    };

    let indentation = '';
    for (let i = 0; i < options.indent; i++) {
      indentation += ' ';
    }

    let inspectString = `${indentation}(FilePatch `;
    if (this.getOldPath() !== this.getNewPath()) {
      inspectString += `oldPath=${this.getOldPath()} newPath=${this.getNewPath()}`;
    } else {
      inspectString += `path=${this.getPath()}`;
    }
    inspectString += '\n';

    inspectString += this.patch.inspect({indent: options.indent + 2});

    inspectString += `${indentation})\n`;
    return inspectString;
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
