import {Point} from 'atom';

export default class PresentedFilePatch {
  constructor(filePatch) {
    this.filePatch = filePatch;

    this.hunkStartPositions = [];
    this.bufferPositions = {
      unchanged: [],
      added: [],
      deleted: [],
      nonewline: [],
    };
    this.hunkIndex = new Map();
    this.lineIndex = new Map();
    this.lineReverseIndex = new Map();
    this.maxLineNumberWidth = 0;

    let bufferLine = 0;
    this.text = filePatch.getHunks().reduce((str, hunk) => {
      this.hunkStartPositions.push(fromBufferPosition(new Point(bufferLine, 0)));

      return hunk.getLines().reduce((hunkStr, line) => {
        hunkStr += line.getText() + '\n';
        this.hunkIndex.set(bufferLine, hunk);
        this.lineIndex.set(bufferLine, line);
        this.lineReverseIndex.set(line, bufferLine);

        if (line.getOldLineNumber().toString().length > this.maxLineNumberWidth) {
          this.maxLineNumberWidth = line.getOldLineNumber().toString().length;
        }
        if (line.getNewLineNumber().toString().length > this.maxLineNumberWidth) {
          this.maxLineNumberWidth = line.getNewLineNumber().toString().length;
        }

        this.bufferPositions[line.getStatus()].push(
          fromBufferPosition(new Point(bufferLine, 0)),
        );

        bufferLine++;
        return hunkStr;
      }, str);
    }, '');
  }

  getFilePatch() {
    return this.filePatch;
  }

  getText() {
    return this.text;
  }

  getHunkStartPositions() {
    return this.hunkStartPositions;
  }

  getUnchangedBufferPositions() {
    return this.bufferPositions.unchanged;
  }

  getAddedBufferPositions() {
    return this.bufferPositions.added;
  }

  getDeletedBufferPositions() {
    return this.bufferPositions.deleted;
  }

  getNoNewlineBufferPositions() {
    return this.bufferPositions.nonewline;
  }

  getHunkAt(bufferRow) {
    return this.hunkIndex.get(bufferRow);
  }

  getLineAt(bufferRow) {
    return this.lineIndex.get(bufferRow);
  }

  getOldLineNumberAt(bufferRow) {
    const line = this.getLineAt(bufferRow);
    return line ? line.getOldLineNumber() : -1;
  }

  getNewLineNumberAt(bufferRow) {
    const line = this.getLineAt(bufferRow);
    return line ? line.getNewLineNumber() : -1;
  }

  getPositionForLine(line) {
    const bufferRow = this.lineReverseIndex.get(line);
    if (bufferRow === undefined) {
      return null;
    }
    return new fromBufferPosition(new Point(bufferRow, 0));
  }

  getMaxLineNumberWidth() {
    return this.maxLineNumberWidth;
  }
}
