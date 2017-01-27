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

  isModified() {
    return this.editor.getTextInBufferRange(this.marker.getBufferRange()) !== this.originalText;
  }

  delete() {
    deleteMarkerIn(this.getMarker(), this.editor);
  }

}
