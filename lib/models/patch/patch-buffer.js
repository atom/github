import {TextBuffer, Range} from 'atom';

const LAYER_NAMES = ['unchanged', 'addition', 'deletion', 'nonewline', 'hunk', 'patch'];

export default class PatchBuffer {
  constructor() {
    this.buffer = new TextBuffer();
    this.layers = LAYER_NAMES.reduce((map, layerName) => {
      map[layerName] = this.buffer.addMarkerLayer();
      return map;
    }, {});
  }

  getBuffer() {
    return this.buffer;
  }

  getInsertionPoint() {
    return this.buffer.getEndPosition();
  }

  getLayer(layerName) {
    return this.layers[layerName];
  }

  findMarkers(layerName, ...args) {
    return this.layers[layerName].findMarkers(...args);
  }

  markPosition(layerName, ...args) {
    return this.layers[layerName].markPosition(...args);
  }

  markRange(layerName, ...args) {
    return this.layers[layerName].markRange(...args);
  }

  clearAllLayers() {
    for (const layerName of LAYER_NAMES) {
      this.layers[layerName].clear();
    }
  }

  createModifier() {
    return new Modification(this);
  }
}

class Modification {
  constructor(patchBuffer) {
    this.patchBuffer = patchBuffer;
    this.markerBlueprints = [];
  }

  append(text) {
    this.patchBuffer.getBuffer().append(text);
  }

  appendMarked(text, layerName, markerOpts) {
    const start = this.patchBuffer.getBuffer().getEndPosition();
    this.append(text);
    const end = this.patchBuffer.getBuffer().getEndPosition();
    this.markerBlueprints.push({layerName, range: new Range(start, end), markerOpts});
    return this;
  }

  apply() {
    for (const {layerName, range, markerOpts} of this.markerBlueprints) {
      const callback = markerOpts.callback;
      delete markerOpts.callback;

      const marker = this.patchBuffer.markRange(layerName, range, markerOpts);
      if (callback) {
        callback(marker);
      }
    }
  }
}
