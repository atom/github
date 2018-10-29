export default class Hunk {
  constructor({
    oldStartRow,
    newStartRow,
    oldRowCount,
    newRowCount,
    sectionHeading,
    marker,
    regions,
  }) {
    this.oldStartRow = oldStartRow;
    this.newStartRow = newStartRow;
    this.oldRowCount = oldRowCount;
    this.newRowCount = newRowCount;
    this.sectionHeading = sectionHeading;

    this.marker = marker;
    this.regions = regions;
  }

  getOldStartRow() {
    return this.oldStartRow;
  }

  getNewStartRow() {
    return this.newStartRow;
  }

  getOldRowCount() {
    return this.oldRowCount;
  }

  getNewRowCount() {
    return this.newRowCount;
  }

  getHeader() {
    return `@@ -${this.oldStartRow},${this.oldRowCount} +${this.newStartRow},${this.newRowCount} @@`;
  }

  getSectionHeading() {
    return this.sectionHeading;
  }

  getRegions() {
    return this.regions;
  }

  getChanges() {
    return this.regions.filter(change => change.isChange());
  }

  getAdditionRanges() {
    return this.regions.filter(change => change.isAddition()).map(change => change.getRange());
  }

  getDeletionRanges() {
    return this.regions.filter(change => change.isDeletion()).map(change => change.getRange());
  }

  getNoNewlineRange() {
    const lastRegion = this.regions[this.regions.length - 1];
    if (lastRegion && lastRegion.isNoNewline()) {
      return lastRegion.getRange();
    } else {
      return null;
    }
  }

  getMarker() {
    return this.marker;
  }

  getRange() {
    return this.getMarker().getRange();
  }

  getBufferRows() {
    return this.getRange().getRows();
  }

  bufferRowCount() {
    return this.getRange().getRowCount();
  }

  includesBufferRow(row) {
    return this.getRange().intersectsRow(row);
  }

  getOldRowAt(row) {
    let current = this.oldStartRow;

    for (const region of this.getRegions()) {
      if (region.includesBufferRow(row)) {
        const offset = row - region.getStartBufferRow();

        return region.when({
          unchanged: () => current + offset,
          addition: () => null,
          deletion: () => current + offset,
          nonewline: () => null,
        });
      } else {
        current += region.when({
          unchanged: () => region.bufferRowCount(),
          addition: () => 0,
          deletion: () => region.bufferRowCount(),
          nonewline: () => 0,
        });
      }
    }

    return null;
  }

  getNewRowAt(row) {
    let current = this.newStartRow;

    for (const region of this.getRegions()) {
      if (region.includesBufferRow(row)) {
        const offset = row - region.getStartBufferRow();

        return region.when({
          unchanged: () => current + offset,
          addition: () => current + offset,
          deletion: () => null,
          nonewline: () => null,
        });
      } else {
        current += region.when({
          unchanged: () => region.bufferRowCount(),
          addition: () => region.bufferRowCount(),
          deletion: () => 0,
          nonewline: () => 0,
        });
      }
    }

    return null;
  }

  getMaxLineNumberWidth() {
    return Math.max(
      (this.oldStartRow + this.oldRowCount).toString().length,
      (this.newStartRow + this.newRowCount).toString().length,
    );
  }

  changedLineCount() {
    return this.regions
      .filter(region => region.isChange())
      .reduce((count, change) => count + change.bufferRowCount(), 0);
  }

  reMarkOn(markable) {
    this.marker = markable.markRange(this.getRange(), {invalidate: 'never', exclusive: false});
  }

  isEqual(other) {
    if (this === other) { return true; }

    if (this.oldStartRow !== other.oldStartRow) { return false; }
    if (this.oldRowCount !== other.oldRowCount) { return false; }
    if (this.newStartRow !== other.newStartRow) { return false; }
    if (this.newRowCount !== other.newRowCount) { return false; }
    if (this.sectionHeading !== other.sectionHeading) { return false; }

    if (this.regions.length !== other.regions.length) { return false; }
    if (this.regions.some((region, i) => !region.isEqual(other.regions[i]))) { return false; }

    return true;
  }

  toStringIn(buffer) {
    return this.getRegions().reduce((str, region) => str + region.toStringIn(buffer), this.getHeader() + '\n');
  }
}
