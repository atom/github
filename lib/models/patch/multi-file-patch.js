export default class MultiFilePatch {
  constructor(buffer, patchLayer, filePatches) {
    this.buffer = buffer;
    this.patchLayer = patchLayer;
    this.filePatches = filePatches;

    this.filePatchesByMarker = new Map(
      this.filePatches.map(filePatch => [filePatch.getMarker(), filePatch]),
    );
  }

  getBuffer() {
    return this.buffer;
  }

  getFilePatches() {
    return this.filePatches;
  }

  getFilePatchAt(bufferRow) {
    const [marker] = this.patchLayer.findMarkers({intersectsRow: bufferRow});
    return this.filePatchesByMarker.get(marker);
  }
}
