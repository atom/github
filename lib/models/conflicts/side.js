import {deleteMarkerIn} from './marker-tools';

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

  getRange() {
    const bannerRange = this.banner.getRange();
    const bodyRange = this.marker.getBufferRange();
    return bannerRange.union(bodyRange);
  }

  getText() {
    return this.editor.getTextInBufferRange(this.getMarker().getBufferRange());
  }

  isBannerModified() {
    return this.banner.isModified();
  }

  isModified() {
    return this.getText() !== this.originalText;
  }

  deleteBanner() {
    this.banner.delete();
  }

  delete() {
    deleteMarkerIn(this.getMarker(), this.editor);
  }

  appendText(text) {
    const insertionPoint = this.getMarker().getBufferRange().end;
    return this.editor.setTextInBufferRange([insertionPoint, insertionPoint], text);
  }

}
