/** @babel */

export default class Side {

  constructor(editor, marker, source, position, banner, originalText) {
    this.editor = editor;
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

  getText() {
    return this.editor.getTextInBufferRange(this.getMarker().getBufferRange());
  }

  isModified() {
    return this.getText() !== this.originalText;
  }

  appendText(text) {
    const insertionPoint = this.getMarker().getBufferRange().end;
    return this.editor.setTextInBufferRange([insertionPoint, insertionPoint], text);
  }

}
