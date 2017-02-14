import {deleteMarkerIn} from './marker-tools';

export default class Banner {

  constructor(editor, marker, description, originalText) {
    this.editor = editor;
    this.marker = marker;
    this.description = description;
    this.originalText = originalText;
  }

  getMarker() {
    return this.marker;
  }

  getRange() {
    return this.marker.getBufferRange();
  }

  isModified() {
    return this.editor.getTextInBufferRange(this.marker.getBufferRange()) !== this.originalText;
  }

  revert() {
    const range = this.getMarker().getBufferRange();
    this.editor.setTextInBufferRange(range, this.originalText);
  }

  delete() {
    deleteMarkerIn(this.getMarker(), this.editor);
  }

}
