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

    let bufferLine = 0;
    this.text = filePatch.getHunks().reduce((str, hunk) => {
      this.hunkStartPositions.push(new Point(bufferLine, 0));

      return hunk.getLines().reduce((hunkStr, line) => {
        hunkStr += line.getText() + '\n';

        this.bufferPositions[line.getStatus()].push(
          new Point(bufferLine, 0),
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
}
