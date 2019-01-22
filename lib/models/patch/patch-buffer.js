import {TextBuffer, Range, Point} from 'atom';
import {inspect} from 'util';

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

  findAllMarkers(...args) {
    return LAYER_NAMES.reduce((arr, layerName) => {
      arr.push(...this.findMarkers(layerName, ...args));
      return arr;
    }, []);
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

  createInserterAt(insertionPoint) {
    return new Inserter(this, Point.fromObject(insertionPoint));
  }

  createInserterAtEnd() {
    return this.createInserterAt(this.getInsertionPoint());
  }

  extractPatchBuffer(rangeLike) {
    const range = Range.fromObject(rangeLike);
    const baseOffset = range.start.negate();
    const movedMarkersByLayer = LAYER_NAMES.reduce((map, layerName) => {
      map[layerName] = this.layers[layerName].findMarkers({containedInRange: range});
      return map;
    }, {});
    const markerMap = new Map();

    const subBuffer = new PatchBuffer();
    subBuffer.getBuffer().setText(this.buffer.getTextInRange(range));

    for (const layerName of LAYER_NAMES) {
      for (const oldMarker of movedMarkersByLayer[layerName]) {
        const startOffset = oldMarker.getRange().start.row === range.start.row ? baseOffset : [baseOffset.row, 0];
        const endOffset = oldMarker.getRange().end.row === range.start.row ? baseOffset : [baseOffset.row, 0];
        const newMarker = subBuffer.markRange(
          layerName,
          oldMarker.getRange().translate(startOffset, endOffset),
          oldMarker.getProperties(),
        );
        markerMap.set(oldMarker, newMarker);
        oldMarker.destroy();
      }
    }

    this.buffer.setTextInRange(range, '');
    return {patchBuffer: subBuffer, markerMap};
  }

  inspect() {
    let inspectString = '';

    const increasingMarkers = [];
    for (const layerName of LAYER_NAMES) {
      for (const marker of this.findMarkers(layerName, {})) {
        increasingMarkers.push({layerName, point: marker.getRange().start, start: true, id: marker.id});
        increasingMarkers.push({layerName, point: marker.getRange().end, end: true, id: marker.id});
      }
    }
    increasingMarkers.sort((a, b) => {
      const cmp = a.point.compare(b.point);
      if (cmp !== 0) {
        return cmp;
      } else if (a.start && b.start) {
        return 0;
      } else if (a.start && !b.start) {
        return -1;
      } else if (!a.start && b.start) {
        return 1;
      } else {
        return 0;
      }
    });

    let inspectPoint = Point.fromObject([0, 0]);
    for (const marker of increasingMarkers) {
      if (!marker.point.isEqual(inspectPoint)) {
        inspectString += inspect(this.buffer.getTextInRange([inspectPoint, marker.point])) + '\n';
      }

      if (marker.start) {
        inspectString += `  start ${marker.layerName}@${marker.id}\n`;
      } else if (marker.end) {
        inspectString += `  end ${marker.layerName}@${marker.id}\n`;
      }

      inspectPoint = marker.point;
    }

    return inspectString;
  }
}

class Inserter {
  constructor(patchBuffer, insertionPoint) {
    this.patchBuffer = patchBuffer;
    this.startPoint = insertionPoint.copy();
    this.insertionPoint = insertionPoint;
    this.markerBlueprints = [];

    this.markersBefore = new Set();
    this.markersAfter = new Set();
  }

  keepBefore(markers) {
    for (const marker of markers) {
      if (marker.getRange().end.isEqual(this.startPoint)) {
        this.markersBefore.add(marker);
      }
    }
  }

  keepAfter(markers) {
    for (const marker of markers) {
      if (marker.getRange().end.isEqual(this.startPoint)) {
        this.markersAfter.add(marker);
      }
    }
  }

  markWhile(layerName, block, markerOpts) {
    const start = this.insertionPoint.copy();
    block();
    const end = this.insertionPoint.copy();
    this.markerBlueprints.push({layerName, range: new Range(start, end), markerOpts});
    return this;
  }

  insert(text) {
    const insertedRange = this.patchBuffer.getBuffer().insert(this.insertionPoint, text);
    this.insertionPoint = insertedRange.end;
    return this;
  }

  insertMarked(text, layerName, markerOpts) {
    return this.markWhile(layerName, () => this.insert(text), markerOpts);
  }

  insertPatchBuffer(subPatchBuffer, opts) {
    const baseOffset = this.insertionPoint.copy();
    this.insert(subPatchBuffer.getBuffer().getText());

    const subMarkerMap = new Map();
    for (const layerName of LAYER_NAMES) {
      for (const oldMarker of subPatchBuffer.findMarkers(layerName, {})) {
        const startOffset = oldMarker.getRange().start.row === 0 ? baseOffset : [baseOffset.row, 0];
        const endOffset = oldMarker.getRange().end.row === 0 ? baseOffset : [baseOffset.row, 0];

        const range = oldMarker.getRange().translate(startOffset, endOffset);
        const markerOpts = {
          ...oldMarker.getProperties(),
          callback: newMarker => { subMarkerMap.set(oldMarker, newMarker); },
        };
        this.markerBlueprints.push({layerName, range, markerOpts});
      }
    }

    if (opts.callback) {
      opts.callback(subMarkerMap);
    }

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

    for (const beforeMarker of this.markersBefore) {
      if (!beforeMarker.isReversed()) {
        beforeMarker.setHeadPosition(this.startPoint);
      } else {
        beforeMarker.setTailPosition(this.startPoint);
      }
    }

    for (const afterMarker of this.markersAfter) {
      if (!afterMarker.isReversed()) {
        afterMarker.setTailPosition(this.insertionPoint);
      } else {
        afterMarker.setHeadPosition(this.insertionPoint);
      }
    }
  }
}
