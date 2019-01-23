export default class Hunk {
  static layerName = 'hunk';

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

  updateMarkers(map) {
    this.marker = map.get(this.marker) || this.marker;
    for (const region of this.regions) {
      region.updateMarkers(map);
    }
  }

  toStringIn(buffer) {
    return this.getRegions().reduce((str, region) => str + region.toStringIn(buffer), this.getHeader() + '\n');
  }
}
