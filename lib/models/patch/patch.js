import Hunk from './hunk';

export default class Patch {
  constructor({status, hunks, bufferText}) {
    this.status = status;
    this.hunks = hunks;
    this.bufferText = bufferText;

    this.changedLineCount = this.getHunks().reduce((acc, hunk) => acc + hunk.changedLineCount(), 0);
  }

  getStatus() {
    return this.status;
  }

  getHunks() {
    return this.hunks;
  }

  getBufferText() {
    return this.bufferText;
  }

  getByteSize() {
    return Buffer.byteLength(this.bufferText, 'utf8');
  }

  getChangedLineCount() {
    return this.changedLineCount;
  }

  clone(opts = {}) {
    return new this.constructor({
      status: opts.status !== undefined ? opts.status : this.getStatus(),
      hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
      bufferText: opts.bufferText !== undefined ? opts.bufferText : this.getBufferText(),
    });
  }

  getStagePatchForLines(lineSet) {
    const hunks = [];
    let delta = 0;

    for (const hunk of this.getHunks()) {
      const additions = [];
      const deletions = [];
      let notAddedRowCount = 0;
      let deletedRowCount = 0;
      let notDeletedRowCount = 0;

      for (const change of hunk.getAdditions()) {
        notAddedRowCount += change.bufferRowCount();
        for (const intersection of change.intersectRowsIn(lineSet, this.getBufferText())) {
          notAddedRowCount -= intersection.bufferRowCount();
          additions.push(intersection);
        }
      }

      for (const change of hunk.getDeletions()) {
        notDeletedRowCount += change.bufferRowCount();
        for (const intersection of change.intersectRowsIn(lineSet, this.getBufferText())) {
          deletedRowCount += intersection.bufferRowCount();
          notDeletedRowCount -= intersection.bufferRowCount();
          deletions.push(intersection);
        }
      }

      if (additions.length > 0 || deletions.length > 0) {
        // Hunk contains at least one selected line
        hunks.push(new Hunk({
          oldStartRow: hunk.getOldStartRow(),
          newStartRow: hunk.getNewStartRow() + delta,
          oldRowCount: hunk.getOldRowCount(),
          newRowCount: hunk.bufferRowCount() - deletedRowCount,
          sectionHeading: hunk.getSectionHeading(),
          rowRange: hunk.getRowRange(),
          additions,
          deletions,
          noNewline: hunk.getNoNewline(),
        }));
      }

      delta += notDeletedRowCount - notAddedRowCount;
    }

    if (this.getStatus() === 'deleted') {
      // Set status to modified
      return this.clone({hunks, status: 'modified'});
    } else {
      return this.clone({hunks});
    }
  }

  getUnstagePatchForLines(lineSet) {
    let delta = 0;
    const hunks = [];
    let bufferText = this.getBufferText();
    let bufferOffset = 0;

    for (const hunk of this.getHunks()) {
      const additions = [];
      const deletions = [];
      let notAddedRowCount = 0;
      let addedRowCount = 0;
      let notDeletedRowCount = 0;

      for (const change of hunk.getAdditions()) {
        notDeletedRowCount += change.bufferRowCount();
        for (const intersection of change.intersectRowsIn(lineSet, bufferText)) {
          notDeletedRowCount -= intersection.bufferRowCount();
          deletions.push(intersection);
        }
      }

      for (const change of hunk.getDeletions()) {
        notAddedRowCount = change.bufferRowCount();
        for (const intersection of change.intersectRowsIn(lineSet, bufferText)) {
          addedRowCount += intersection.bufferRowCount();
          notAddedRowCount -= intersection.bufferRowCount();
          additions.push(intersection);
        }
      }

      if (additions.length > 0 || deletions.length > 0) {
        // Hunk contains at least one selected line
        hunks.push(new Hunk({
          oldStartRow: hunk.getOldStartRow() + delta,
          newStartRow: hunk.getNewStartRow(),
          oldRowCount: hunk.bufferRowCount() - addedRowCount,
          newRowCount: hunk.getNewRowCount(),
          sectionHeading: hunk.getSectionHeading(),
          rowRange: hunk.getRowRange(),
          additions,
          deletions,
          noNewline: hunk.getNoNewline(),
        }));
      }
      delta += notAddedRowCount - notDeletedRowCount;
    }

    if (this.getStatus() === 'added') {
      return this.clone({hunks, bufferText, status: 'modified'});
    } else {
      return this.clone({hunks, bufferText});
    }
  }

  toString() {
    return this.getHunks().reduce((str, hunk) => {
      str += hunk.toStringIn(this.getBufferText());
      return str;
    }, '');
  }

  isPresent() {
    return true;
  }
}

export const nullPatch = {
  getStatus() {
    return null;
  },

  getHunks() {
    return [];
  },

  getBufferText() {
    return '';
  },

  getByteSize() {
    return 0;
  },

  clone(opts = {}) {
    if (opts.status === undefined && opts.hunks === undefined && opts.bufferText === undefined) {
      return this;
    } else {
      return new Patch({
        status: opts.status !== undefined ? opts.status : this.getStatus(),
        hunks: opts.hunks !== undefined ? opts.hunks : this.getHunks(),
        bufferText: opts.bufferText !== undefined ? opts.bufferText : this.getBufferText(),
      });
    }
  },

  isPresent() {
    return false;
  },
};
