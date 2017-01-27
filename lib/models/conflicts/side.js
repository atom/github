/** @babel */

export default class Side {

  constructor(marker, source, position, banner, originalText) {
    this.marker = marker;
    this.source = source;
    this.position = position;
    this.banner = banner;
    this.originalText = originalText;
  }

  getMarker() {
    return this.marker;
  }

  getBannerMarker() {
    return this.banner.getMarker();
  }

  getPosition() {
    return this.position;
  }

  getTextIn(editor) {
    return editor.getTextInBufferRange(this.getMarker().getBufferRange());
  }

  appendTextIn(editor, text) {
    const insertionPoint = this.getMarker().getBufferRange().end;
    return editor.setTextInBufferRange([insertionPoint, insertionPoint], text);
  }

}
