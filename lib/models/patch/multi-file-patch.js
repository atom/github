export default class MultiFilePatch {
  constructor(buffer, layers, filePatches) {
    this.buffer = buffer;

    this.patchLayer = layers.patch;
    this.hunkLayer = layers.hunk;
    this.unchangedLayer = layers.unchanged;
    this.additionLayer = layers.addition;
    this.deletionLayer = layers.deletion;
    this.noNewlineLayer = layers.noNewline;

    this.filePatches = filePatches;

    this.filePatchesByMarker = new Map();
    this.hunksByMarker = new Map();

    for (const filePatch of this.filePatches) {
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);
      for (const hunk of filePatch.getHunks()) {
        this.hunksByMarker.set(hunk.getMarker(), hunk);
      }
    }
  }

  getBuffer() {
    return this.buffer;
  }

  getHunkLayer() {
    return this.hunkLayer;
  }

  getUnchangedLayer() {
    return this.unchangedLayer;
  }

  getAdditionLayer() {
    return this.additionLayer;
  }

  getDeletionLayer() {
    return this.deletionLayer;
  }

  getNoNewlineLayer() {
    return this.noNewlineLayer;
  }

  getFilePatches() {
    return this.filePatches;
  }

  getFilePatchAt(bufferRow) {
    const [marker] = this.patchLayer.findMarkers({intersectsRow: bufferRow});
    return this.filePatchesByMarker.get(marker);
  }

  getHunkAt(bufferRow) {
    const [marker] = this.hunkLayer.findMarkers({intersectsRow: bufferRow});
    return this.hunksByMarker.get(marker);
  }

  adoptBufferFrom(lastMultiFilePatch) {
    lastMultiFilePatch.getHunkLayer().clear();
    lastMultiFilePatch.getUnchangedLayer().clear();
    lastMultiFilePatch.getAdditionLayer().clear();
    lastMultiFilePatch.getDeletionLayer().clear();
    lastMultiFilePatch.getNoNewlineLayer().clear();

    const nextBuffer = lastMultiFilePatch.getBuffer();
    nextBuffer.setText(this.getBuffer().getText());

    for (const patch of this.getFilePatches()) {
      for (const hunk of patch.getHunks()) {
        hunk.reMarkOn(lastMultiFilePatch.getHunkLayer());
        for (const region of hunk.getRegions()) {
          const target = region.when({
            unchanged: () => lastMultiFilePatch.getUnchangedLayer(),
            addition: () => lastMultiFilePatch.getAdditionLayer(),
            deletion: () => lastMultiFilePatch.getDeletionLayer(),
            nonewline: () => lastMultiFilePatch.getNoNewlineLayer(),
          });
          region.reMarkOn(target);
        }
      }
    }

    this.filePatchesByMarker.clear();
    this.hunksByMarker.clear();

    for (const filePatch of this.filePatches) {
      this.filePatchesByMarker.set(filePatch.getMarker(), filePatch);
      for (const hunk of filePatch.getHunks()) {
        this.hunksByMarker.set(hunk.getMarker(), hunk);
      }
    }

    this.hunkLayer = lastMultiFilePatch.getHunkLayer();

    this.unchangedLayer = lastMultiFilePatch.getUnchangedLayer();

    // FIXME
    this.additionLayer = lastMultiFilePatch.getAdditionLayer();
    this.deletionLayer = lastMultiFilePatch.getDeletionLayer();
    this.noNewlineLayer = lastMultiFilePatch.getNoNewlineLayer();

    this.buffer = nextBuffer;
  }
}
