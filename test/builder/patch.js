// Builders for classes related to MultiFilePatches.

import {TextBuffer} from 'atom';
import MultiFilePatch from '../../lib/models/patch/multi-file-patch';
import FilePatch from '../../lib/models/patch/file-patch';
import File from '../../lib/models/patch/file';
import Patch from '../../lib/models/patch/patch';
import Hunk from '../../lib/models/patch/hunk';
import {Unchanged, Addition, Deletion, NoNewline} from '../../lib/models/patch/region';

class LayeredBuffer {
  constructor() {
    this.buffer = new TextBuffer();
    this.layers = ['patch', 'hunk', 'unchanged', 'addition', 'deletion', 'noNewline'].reduce((layers, name) => {
      layers[name] = this.buffer.addMarkerLayer();
      return layers;
    }, {});
  }

  getInsertionPoint() {
    return this.buffer.getEndPosition();
  }

  getLayer(markerLayerName) {
    const layer = this.layers[markerLayerName];
    if (!layer) {
      throw new Error(`invalid marker layer name: ${markerLayerName}`);
    }
    return layer;
  }

  appendMarked(markerLayerName, lines) {
    const startPosition = this.buffer.getEndPosition();
    const layer = this.getLayer(markerLayerName);
    this.buffer.append(lines.join('\n'));
    const marker = layer.markRange([startPosition, this.buffer.getEndPosition()]);
    this.buffer.append('\n');
    return marker;
  }

  markFrom(markerLayerName, startPosition) {
    const endPosition = this.buffer.getEndPosition();
    const layer = this.getLayer(markerLayerName);
    return layer.markRange([startPosition, endPosition]);
  }

  wrapReturn(object) {
    return {
      buffer: this.buffer,
      layers: this.layers,
      ...object,
    };
  }
}

class MultiFilePatchBuilder {
  constructor(layeredBuffer = null) {
    this.layeredBuffer = layeredBuffer;

    this.filePatches = [];
  }

  addFilePatch(block) {
    const filePatch = new FilePatchBuilder(this.layeredBuffer);
    block(filePatch);
    this.filePatches.push(filePatch.build().filePatch);
    return this;
  }

  build() {
    return this.layeredBuffer.wrapReturn({
      multiFilePatch: new MultiFilePatch({
        buffer: this.layeredBuffer.buffer,
        layers: this.layeredBuffer.layers,
        filePatches: this.filePatches,
      }),
    });
  }
}

class FilePatchBuilder {
  constructor(layeredBuffer = null) {
    this.layeredBuffer = layeredBuffer;

    this.oldFile = new File({path: 'file', mode: '100644'});
    this.newFile = new File({path: 'file', mode: '100644'});

    this.patchBuilder = new PatchBuilder(this.layeredBuffer);
  }

  setOldFile(block) {
    const file = new FileBuilder();
    block(file);
    this.oldFile = file.build().file;
    return this;
  }

  setNewFile(block) {
    const file = new FileBuilder();
    block(file);
    this.newFile = file.build().file;
    return this;
  }

  build() {
    const {patch} = this.patchBuilder.build();

    return this.layeredBuffer.wrapReturn({
      filePatch: new FilePatch(this.oldFile, this.newFile, patch),
    });
  }
}

class FileBuilder {
  constructor() {
    this.path = 'file.txt';
    this.mode = '100644';
    this.symlink = null;
  }

  path(thePath) {
    this.path = thePath;
    return this;
  }

  mode(theMode) {
    this.mode = theMode;
    return this;
  }

  executable() {
    return this.mode('100755');
  }

  symlinkTo(destinationPath) {
    this.symlink = destinationPath;
    return this.mode('120000');
  }

  build() {
    return {file: new File({path: this.path, mode: this.mode, symlink: this.symlink})};
  }
}

class PatchBuilder {
  constructor(layeredBuffer = null) {
    this.layeredBuffer = layeredBuffer;

    this.status = 'modified';
    this.hunks = [];

    this.patchStart = this.layeredBuffer.getInsertionPoint();
  }

  status(st) {
    if (['modified', 'added', 'deleted'].indexOf(st) === -1) {
      throw new Error(`Unrecognized status: ${st} (must be 'modified', 'added' or 'deleted')`);
    }

    this.status = st;
    return this;
  }

  addHunk(block) {
    const hunk = new HunkBuilder(this.layeredBuffer);
    this.hunks.push(hunk.build().hunk);
    return this;
  }

  build() {
    if (this.hunks.length === 0) {
      this.addHunk(hunk => hunk.unchanged('0000').added('0001').deleted('0002').unchanged('0003'));
      this.addHunk(hunk => hunk.startRow(10).unchanged('0004').added('0005').deleted('0006').unchanged('0007'));
    }

    const marker = this.layeredBuffer.markFrom(this.patchStart());

    return this.layeredBuffer.wrapReturn({
      patch: new Patch({status: this.status, hunks: this.hunks, marker}),
    });
  }
}

class HunkBuilder {
  constructor(layeredBuffer = null) {
    this.layeredBuffer = layeredBuffer;

    this.oldStartRow = 0;
    this.oldRowCount = null;
    this.newStartRow = 0;
    this.newRowCount = null;

    this.sectionHeading = "don't care";

    this.hunkStartPoint = this.layeredBuffer.getInsertionPoint();
    this.regions = [];
  }

  oldRow(rowNumber) {
    this.oldStartRow = rowNumber;
    return this;
  }

  unchanged(...lines) {
    this.regions.push(new Unchanged(this.layeredBuffer.appendMarked(lines)));
    return this;
  }

  added(...lines) {
    this.regions.push(new Addition(this.layeredBuffer.appendMarked(lines)));
    return this;
  }

  deleted(...lines) {
    this.regions.push(new Deletion(this.layeredBuffer.appendMarked(lines)));
    return this;
  }

  noNewline() {
    this.regions.push(new NoNewline(this.layeredBuffer.appendMarked(' No newline at end of file')));
    return this;
  }

  build() {
    if (this.oldRowCount === null) {
      this.oldRowCount = this.regions.reduce((count, region) => region.when({
        unchanged: () => count + region.bufferRowCount(),
        deletion: () => count + region.bufferRowCount(),
        default: () => count,
      }), 0);
    }

    if (this.newRowCount === null) {
      this.newRowCount = this.regions.reduce((count, region) => region.when({
        unchanged: () => count + region.bufferRowCount(),
        addition: () => count + region.bufferRowCount(),
        default: () => count,
      }), 0);
    }

    if (this.regions.length === 0) {
      this.unchanged('0000').added('0001').deleted('0002').unchanged('0003');
    }

    const marker = this.layeredBuffer.markFrom('hunk', this.hunkStartPoint);

    return this.layeredBuffer.wrapReturn({
      hunk: new Hunk({
        oldStartRow: this.oldStartRow,
        oldRowCount: this.oldRowCount,
        newStartRow: this.newStartRow,
        newRowCount: this.newRowCount,
        sectionHeading: this.sectionHeading,
        marker,
        regions: this.regions,
      }),
    });
  }
}

export function buildMultiFilePatch() {
  return new MultiFilePatchBuilder(new LayeredBuffer());
}

export function buildFilePatch() {
  return new FilePatchBuilder(new LayeredBuffer());
}

export function buildPatch() {
  return new PatchBuilder(new LayeredBuffer());
}

export function buildHunk() {
  return new HunkBuilder(new LayeredBuffer());
}
