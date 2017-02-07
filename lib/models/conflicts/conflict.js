import {TOP, MIDDLE, BOTTOM} from './position';
import {OURS, THEIRS, BASE} from './source';
import Side from './side';
import Banner from './banner';
import Separator from './separator';

// Regular expression that matches the beginning of a potential conflict.
const CONFLICT_START_REGEX = /^<{7} (.+)\r?\n/g;

// Options used to create markers
const MARKER_OPTIONS = {invalidate: 'never'};

/*
 * Private: conflict parser visitor that ignores all events.
 */
class NoopVisitor {

  visitOurSide(position, bannerRow, textRowStart, textRowEnd) { }

  visitBaseSide(position, bannerRow, textRowStart, textRowEnd) { }

  visitSeparator(sepRowStart, sepRowEnd) { }

  visitTheirSide(position, bannerRow, textRowStart, textRowEnd) { }

}

/*
 * Private: conflict parser visitor that marks each buffer range and assembles a Conflict from the
 * pieces.
 */
class ConflictVisitor {

  /*
   * editor - [TextEditor] displaying the conflicting text.
   */
  constructor(editor) {
    this.editor = editor;

    this.ours = null;
    this.base = null;
    this.separator = null;
    this.theirs = null;
  }

  /*
   * position - [Position] one of TOP or BOTTOM.
   * bannerRow - [Integer] of the buffer row that contains our side's banner.
   * textRowStart - [Integer] of the first buffer row that contain this side's text.
   * textRowEnd - [Integer] of the first buffer row beyond the extend of this side's text.
   */
  visitOurSide(position, bannerRow, textRowStart, textRowEnd) {
    this.ours = this.markSide(position, OURS, bannerRow, textRowStart, textRowEnd);
  }

  /*
   * bannerRow - [Integer] the buffer row that contains our side's banner.
   * textRowStart - [Integer] first buffer row that contain this side's text.
   * textRowEnd - [Integer] first buffer row beyond the extend of this side's text.
   */
  visitBaseSide(bannerRow, textRowStart, textRowEnd) {
    this.base = this.markSide(MIDDLE, BASE, bannerRow, textRowStart, textRowEnd);
  }

  /*
   * sepRowStart - [Integer] buffer row that contains the "=======" separator.
   * sepRowEnd - [Integer] the buffer row after the separator.
   */
  visitSeparator(sepRowStart, sepRowEnd) {
    const marker = this.editor.markBufferRange([[sepRowStart, 0], [sepRowEnd, 0]], MARKER_OPTIONS);
    this.separator = new Separator(this.editor, marker);
  }

  /*
   * position - [Position] alignment within the conflict marker: TOP or BOTTOM.
   * bannerRow - [Integer] the buffer row that contains our side's banner.
   * textRowStart - [Integer] first buffer row that contain this side's text.
   * textRowEnd - [Integer] first buffer row beyond the extent of this side's text.
   */
  visitTheirSide(position, bannerRow, textRowStart, textRowEnd) {
    this.theirs = this.markSide(position, THEIRS, bannerRow, textRowStart, textRowEnd);
  }

  markSide(position, source, bannerRow, textRowStart, textRowEnd) {
    const blockRange = [[bannerRow, 0], [bannerRow, 0]];
    const blockMarker = this.editor.markBufferRange(blockRange, MARKER_OPTIONS);

    const description = this.sideDescription(bannerRow);
    const bannerRange = [[bannerRow, 0], [bannerRow + 1, 0]];
    const bannerMarker = this.editor.markBufferRange(bannerRange, MARKER_OPTIONS);
    const originalBannerText = this.editor.getTextInBufferRange(bannerRange);
    const banner = new Banner(this.editor, bannerMarker, description, originalBannerText);

    const textRange = [[textRowStart, 0], [textRowEnd, 0]];
    const sideMarker = this.editor.markBufferRange(textRange, MARKER_OPTIONS);
    const originalText = this.editor.getTextInBufferRange(textRange);

    return new Side(this.editor, sideMarker, blockMarker, source, position, banner, originalText);
  }

  /*
   * Parse the banner description for the current side from a banner row.
   *
   * bannerRow - [Integer] buffer row containing the <, |, or > marker
   */
  sideDescription(bannerRow) {
    return this.editor.lineTextForBufferRow(bannerRow).match(/^[<|>]{7} (.*)$/)[1];
  }

  conflict() {
    return new Conflict(this.ours, this.separator, this.base, this.theirs);
  }

}

/*
 * Private: parseConflict discovers a git conflict marker in a corpus of text and constructs a Conflict instance that
 * marks the correct lines.
 *
 * editor [TextEditor] - editor on the buffer suspected to contain conflict markers.
 * startRow [Integer] - buffer row to begin scanning for conflict markers.
 * isRebase [Boolean] - true if the current merge is occurring as part of a rebase, false if it is not.
 * visitor [Visitor] - NoopVisitor or ConflictVisitor to visit row ranges of the conflict.
 *
 * Returns [Integer] the buffer row after the final <<<<<< boundary.
 */
const parseConflict = function(editor, startRow, isRebase, visitor) {
  let currentRow = startRow;
  let lastBoundary = null;

  // Visit a side that begins with a banner and description as its first line.
  const visitHeaderSide = (position, visitMethod) => {
    const sideRowStart = currentRow;
    currentRow++;
    advanceToBoundary('|=');
    const sideRowEnd = currentRow;

    visitor[visitMethod](position, sideRowStart, sideRowStart + 1, sideRowEnd);
  };

  // Visit the base side from diff3 output, if one is present, then visit the separator.
  const visitBaseAndSeparator = () => {
    if (lastBoundary === '|') {
      visitBaseSide();
    }

    visitSeparator();
  };

  // Visit a base side from diff3 output.
  const visitBaseSide = () => {
    const sideRowStart = currentRow;
    currentRow++;

    let b = advanceToBoundary('<=');
    while (b === '<') {
      // Embedded recursive conflict within a base side, caused by a criss-cross merge.
      // Advance beyond it without marking anything.
      currentRow = parseConflict(editor, currentRow, isRebase, new NoopVisitor());
      b = advanceToBoundary('<=');
    }

    const sideRowEnd = currentRow;

    visitor.visitBaseSide(sideRowStart, sideRowStart + 1, sideRowEnd);
  };

  // Visit a "========" separator.
  const visitSeparator = () => {
    const sepRowStart = currentRow;
    currentRow++;
    const sepRowEnd = currentRow;

    visitor.visitSeparator(sepRowStart, sepRowEnd);
  };

  // Visit a side with a banner and description as its last line.
  const visitFooterSide = (position, visitMethod) => {
    const sideRowStart = currentRow;
    advanceToBoundary('>');
    currentRow++;
    const sideRowEnd = currentRow;

    visitor[visitMethod](position, sideRowEnd - 1, sideRowStart, sideRowEnd - 1);
  };

  // Determine if the current row is a side boundary.
  //
  // boundaryKinds - [String] any combination of <, |, =, or > to limit the kinds of boundary detected.
  //
  // Returns the matching boundaryKinds character, or `null` if none match.
  const isAtBoundary = (boundaryKinds = '<|=>') => {
    const line = editor.lineTextForBufferRow(currentRow);
    for (let i = 0; i < boundaryKinds.length; i++) {
      const b = boundaryKinds[i];
      if (line.startsWith(b.repeat(7))) {
        return b;
      }
    }
    return null;
  };

  // Increment the current row until the current line matches one of the provided boundary kinds, or until there are no
  // more lines in the editor.
  //
  // boundaryKinds - [String] any combination of <, |, =, or > to limit the kinds of boundaries that halt the
  //   progression.
  //
  // Returns the matching boundaryKinds character, or 'null' if there are no matches to the end of the editor.
  const advanceToBoundary = (boundaryKinds = '<|=>') => {
    let b = isAtBoundary(boundaryKinds);
    while (b === null) {
      currentRow++;
      if (currentRow > editor.getLastBufferRow()) {
        const e = new Error('Unterminated conflict side');
        e.parserState = true;
        throw e;
      }
      b = isAtBoundary(boundaryKinds);
    }

    lastBoundary = b;
    return b;
  };

  if (isRebase) {
    visitHeaderSide(TOP, 'visitTheirSide');
    visitBaseAndSeparator();
    visitFooterSide(BOTTOM, 'visitOurSide');
  } else {
    visitHeaderSide(TOP, 'visitOurSide');
    visitBaseAndSeparator();
    visitFooterSide(BOTTOM, 'visitTheirSide');
  }

  return currentRow;
};

export default class Conflict {

  constructor(ours, separator, base, theirs) {
    this.ours = ours;
    this.separator = separator;
    this.theirs = theirs;
    this.base = base;

    this.byPosition = {
      [this.ours.getPosition().getName()]: this.ours,
      [this.theirs.getPosition().getName()]: this.theirs,
    };
    if (this.base) {
      this.byPosition[this.base.getPosition().getName()] = this.base;
    }

    this.resolution = null;
  }

  getKey() {
    return this.ours.marker.id;
  }

  isResolved() {
    return this.resolution !== null;
  }

  resolveAs(source) {
    this.resolution = source.when({
      ours: () => this.ours,
      theirs: () => this.theirs,
      base: () => this.base,
    });
  }

  getChosenSide() {
    return this.resolution;
  }

  getUnchosenSides() {
    return [this.ours, this.theirs, this.base].filter(side => side && side !== this.resolution);
  }

  getSide(source) {
    return source.when({
      ours: () => this.ours,
      theirs: () => this.theirs,
      base: () => this.base,
    });
  }

  /*
   * Return a `Side` containing a buffer point, or `undefined` if none do.
   */
  getSideContaining(point) {
    return [this.ours, this.base, this.theirs].find(side => side && side.includesPoint(point));
  }

  /*
   * Return a `Range` that encompasses the entire Conflict region.
   */
  getRange() {
    const topRange = this.byPosition.top.getRange();
    const bottomRange = this.byPosition.bottom.getRange();
    return topRange.union(bottomRange);
  }

  /*
   * Determine whether or not a buffer position is contained within this conflict.
   */
  includesPoint(point) {
    return this.getRange().containsPoint(point);
  }

  /*
   * Return the `DisplayMarker` that immediately follows the `Side` in a given `Position`. Return `null` if no such
   * marker exists.
   */
  markerAfter(position) {
    return position.when({
      top: () => (this.base ? this.base.getBannerMarker() : this.getSeparator().getMarker()),
      middle: () => this.getSeparator().getMarker(),
      bottom: () => this.theirs.getBannerMarker(),
    });
  }

  getSeparator() {
    return this.separator;
  }

  /*
   * Public: Parse any conflict markers in a TextEditor's buffer and return a Conflict that contains markers
   * corresponding to each.
   *
   * editor [TextEditor] The editor to search.
   * return [Array<Conflict>] A (possibly empty) collection of parsed Conflicts.
   */
  static all(editor, isRebase) {
    const conflicts = [];
    let lastRow = -1;

    editor.getBuffer().scan(CONFLICT_START_REGEX, m => {
      const conflictStartRow = m.range.start.row;
      if (conflictStartRow < lastRow) {
        // Match within an already-parsed conflict.
        return;
      }

      const visitor = new ConflictVisitor(editor);

      try {
        lastRow = parseConflict(editor, conflictStartRow, isRebase, visitor);
        conflicts.push(visitor.conflict());
      } catch (e) {
        if (!e.parserState) {
          throw e;
        }

        if (!atom.inSpecMode()) {
          console.error(`Unable to parse conflict: ${e.message}\n${e.stack}`); // eslint-disable-line no-console
        }
      }
    });

    return conflicts;
  }

}
