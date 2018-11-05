export default class MultiFilePatch {
  constructor(buffer, filePatches) {
    this.buffer = buffer;
    this.filePatches = filePatches;
  }

  getBuffer() {
    return this.buffer;
  }

  getFilePatches() {
    return this.filePatches;
  }
}
