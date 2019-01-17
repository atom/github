// Builders for classes related to MultiFilePatches.

import PatchBuffer from '../../lib/models/patch/patch-buffer';
import MultiFilePatch from '../../lib/models/patch/multi-file-patch';
import FilePatch from '../../lib/models/patch/file-patch';
import File, {nullFile} from '../../lib/models/patch/file';
import Patch from '../../lib/models/patch/patch';
import Hunk from '../../lib/models/patch/hunk';
import {Unchanged, Addition, Deletion, NoNewline} from '../../lib/models/patch/region';

function appendMarked(patchBuffer, layerName, lines) {
  const startPosition = patchBuffer.getInsertionPoint();
  patchBuffer.getBuffer().append(lines.join('\n'));
  const marker = patchBuffer.markRange(
    layerName,
    [startPosition, patchBuffer.getInsertionPoint()],
    {invalidate: 'never', exclusive: false},
  );
  patchBuffer.getBuffer().append('\n');
  return marker;
}

function markFrom(patchBuffer, layerName, startPosition) {
  const endPosition = patchBuffer.getInsertionPoint().translate([-1, Infinity]);
  return patchBuffer.markRange(
    layerName,
    [startPosition, endPosition],
    {invalidate: 'never', exclusive: false},
  );
}

function wrapReturn(patchBuffer, object) {
  return {buffer: patchBuffer.getBuffer(), layers: patchBuffer.getLayers(), ...object};
}

class MultiFilePatchBuilder {
  constructor(patchBuffer = null) {
    this.patchBuffer = patchBuffer;

    this.filePatches = [];
  }

  addFilePatch(block = () => {}) {
    const filePatch = new FilePatchBuilder(this.patchBuffer);
    block(filePatch);
    this.filePatches.push(filePatch.build().filePatch);
    return this;
  }

  build() {
    return wrapReturn(this.patchBuffer, {
      multiFilePatch: new MultiFilePatch({
        patchBuffer: this.patchBuffer,
        filePatches: this.filePatches,
      }),
    });
  }
}

class FilePatchBuilder {
  constructor(patchBuffer = null) {
    this.patchBuffer = patchBuffer;

    this.oldFile = new File({path: 'file', mode: File.modes.NORMAL});
    this.newFile = null;

    this.patchBuilder = new PatchBuilder(this.patchBuffer);
  }

  setOldFile(block) {
    const file = new FileBuilder();
    block(file);
    this.oldFile = file.build().file;
    return this;
  }

  nullOldFile() {
    this.oldFile = nullFile;
    return this;
  }

  setNewFile(block) {
    const file = new FileBuilder();
    block(file);
    this.newFile = file.build().file;
    return this;
  }

  nullNewFile() {
    this.newFile = nullFile;
    return this;
  }

  status(...args) {
    this.patchBuilder.status(...args);
    return this;
  }

  addHunk(...args) {
    this.patchBuilder.addHunk(...args);
    return this;
  }

  renderStatus(...args) {
    this.patchBuilder.renderStatus(...args);
    return this;
  }

  empty() {
    this.patchBuilder.empty();
    return this;
  }

  build() {
    const {patch} = this.patchBuilder.build();

    if (this.newFile === null) {
      this.newFile = this.oldFile.clone();
    }

    return this.patchBuffer.wrapReturn({
      filePatch: new FilePatch(this.oldFile, this.newFile, patch),
    });
  }
}

class FileBuilder {
  constructor() {
    this._path = 'file.txt';
    this._mode = File.modes.NORMAL;
    this._symlink = null;
  }

  path(thePath) {
    this._path = thePath;
    return this;
  }

  mode(theMode) {
    this._mode = theMode;
    return this;
  }

  executable() {
    return this.mode('100755');
  }

  symlinkTo(destinationPath) {
    this._symlink = destinationPath;
    return this.mode('120000');
  }

  build() {
    return {file: new File({path: this._path, mode: this._mode, symlink: this._symlink})};
  }
}

class PatchBuilder {
  constructor(patchBuffer = null) {
    this.patchBuffer = patchBuffer;

    this._renderStatus = undefined;
    this._status = 'modified';
    this.hunks = [];

    this.patchStart = this.patchBuffer.getInsertionPoint();
    this.drift = 0;
    this.explicitlyEmpty = false;
  }

  renderStatus(status) {
    this._renderStatus = status;
    return this;
  }

  status(st) {
    if (['modified', 'added', 'deleted'].indexOf(st) === -1) {
      throw new Error(`Unrecognized status: ${st} (must be 'modified', 'added' or 'deleted')`);
    }

    this._status = st;
    return this;
  }

  addHunk(block = () => {}) {
    const builder = new HunkBuilder(this.patchBuffer, this.drift);
    block(builder);
    const {hunk, drift} = builder.build();
    this.hunks.push(hunk);
    this.drift = drift;
    return this;
  }

  empty() {
    this.explicitlyEmpty = true;
    return this;
  }

  build() {
    if (this.hunks.length === 0 && !this.explicitlyEmpty) {
      if (this._status === 'modified') {
        this.addHunk(hunk => hunk.oldRow(1).unchanged('0000').added('0001').deleted('0002').unchanged('0003'));
        this.addHunk(hunk => hunk.oldRow(10).unchanged('0004').added('0005').deleted('0006').unchanged('0007'));
      } else if (this._status === 'added') {
        this.addHunk(hunk => hunk.oldRow(1).added('0000', '0001', '0002', '0003'));
      } else if (this._status === 'deleted') {
        this.addHunk(hunk => hunk.oldRow(1).deleted('0000', '0001', '0002', '0003'));
      }
    }

    const marker = markFrom(this.patchBuffer, 'patch', this.patchStart);

    return wrapReturn(this.patchBuffer, {
      patch: new Patch({status: this._status, hunks: this.hunks, marker, renderStatus: this._renderStatus}),
    });
  }
}

class HunkBuilder {
  constructor(patchBuffer = null, drift = 0) {
    this.patchBuffer = patchBuffer;
    this.drift = drift;

    this.oldStartRow = 0;
    this.oldRowCount = null;
    this.newStartRow = null;
    this.newRowCount = null;

    this.sectionHeading = "don't care";

    this.hunkStartPoint = this.patchBuffer.getInsertionPoint();
    this.regions = [];
  }

  oldRow(rowNumber) {
    this.oldStartRow = rowNumber;
    return this;
  }

  unchanged(...lines) {
    this.regions.push(new Unchanged(appendMarked(this.patchBuffer, 'unchanged', lines)));
    return this;
  }

  added(...lines) {
    this.regions.push(new Addition(appendMarked(this.patchBuffer, 'addition', lines)));
    return this;
  }

  deleted(...lines) {
    this.regions.push(new Deletion(appendMarked(this.patchBuffer, 'deletion', lines)));
    return this;
  }

  noNewline() {
    this.regions.push(new NoNewline(appendMarked(this.patchBuffer, 'nonewline', [' No newline at end of file'])));
    return this;
  }

  build() {
    if (this.regions.length === 0) {
      this.unchanged('0000').added('0001').deleted('0002').unchanged('0003');
    }

    if (this.oldRowCount === null) {
      this.oldRowCount = this.regions.reduce((count, region) => region.when({
        unchanged: () => count + region.bufferRowCount(),
        deletion: () => count + region.bufferRowCount(),
        default: () => count,
      }), 0);
    }

    if (this.newStartRow === null) {
      this.newStartRow = this.oldStartRow + this.drift;
    }

    if (this.newRowCount === null) {
      this.newRowCount = this.regions.reduce((count, region) => region.when({
        unchanged: () => count + region.bufferRowCount(),
        addition: () => count + region.bufferRowCount(),
        default: () => count,
      }), 0);
    }

    const marker = markFrom(this.patchBuffer, 'hunk', this.hunkStartPoint);

    return wrapReturn(this.patchBuffer, {
      hunk: new Hunk({
        oldStartRow: this.oldStartRow,
        oldRowCount: this.oldRowCount,
        newStartRow: this.newStartRow,
        newRowCount: this.newRowCount,
        sectionHeading: this.sectionHeading,
        marker,
        regions: this.regions,
      }),
      drift: this.drift + this.newRowCount - this.oldRowCount,
    });
  }
}

export function multiFilePatchBuilder() {
  return new MultiFilePatchBuilder(new PatchBuffer());
}

export function filePatchBuilder() {
  return new FilePatchBuilder(new PatchBuffer());
}

export function patchBuilder() {
  return new PatchBuilder(new PatchBuffer());
}

export function hunkBuilder() {
  return new HunkBuilder(new PatchBuffer());
}
