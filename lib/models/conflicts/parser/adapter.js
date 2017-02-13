/*
 * Input adapter to facilitate parsing conflicts from text loaded into an Editor.
 */
export class EditorAdapter {

  constructor(editor, startRow) {
    this.editor = editor;
    this.currentRow = startRow;
  }

  getCurrentRow() {
    return this.currentRow;
  }

  getCurrentLine() {
    return this.editor.lineTextForBufferRow(this.currentRow);
  }

  advanceRow() {
    this.currentRow++;
  }

  isAtEnd() {
    return this.currentRow > this.editor.getLastBufferRow();
  }

}

/*
 * Input adapter for parsing conflicts from a chunk of text arriving from a ReadStream.
 */
export class ChunkAdapter {

  constructor(chunk) {
    this.chunk = chunk;

    this.lineEndRx = /\r?\n/g;

    this.eof = false;
    this.advanceRow();
  }

  advanceTo(pattern) {
    const rx = new RegExp(pattern.source, 'gm');
    rx.lastIndex = this.lineEndRx.lastIndex;

    if (rx.test(this.chunk)) {
      this.lineEndRx.lastIndex = rx.lastIndex;
      return true;
    } else {
      return false;
    }
  }

  getCurrentRow() {
    return undefined;
  }

  getCurrentLine() {
    return this.currentLine;
  }

  advanceRow() {
    const startPosition = this.lineEndRx.lastIndex;
    if (this.lineEndRx.test(this.chunk)) {
      this.currentLine = this.chunk.slice(startPosition, this.lineEndRx.lastIndex);
    } else {
      this.currentLine = this.chunk.slice(startPosition);
      this.eof = true;
    }
  }

  isAtEnd() {
    return this.eof;
  }

}
