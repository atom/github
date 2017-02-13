import {NoopVisitor} from './noop-visitor';
import {TOP, BOTTOM} from '../position';

/*
 * parseConflict discovers a git conflict marker in a corpus of text and constructs a Conflict instance that marks the
 * correct lines.
 *
 * adapter [Adapter] - input adapter that iterates over text suspected to contain conflict markers.
 * isRebase [Boolean] - true if the current merge is occurring as part of a rebase, false if it is not.
 * visitor [Visitor] - NoopVisitor or ConflictVisitor to visit row ranges of the conflict.
 */
export default function parseConflict(adapter, isRebase, visitor) {
  let lastBoundary = null;

  // Visit a side that begins with a banner and description as its first line.
  const visitHeaderSide = (position, visitMethod) => {
    const sideRowStart = adapter.getCurrentRow();
    adapter.advanceRow();
    advanceToBoundary('|=');
    const sideRowEnd = adapter.getCurrentRow();

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
    const sideRowStart = adapter.getCurrentRow();
    adapter.advanceRow();

    let b = advanceToBoundary('<=');
    while (b === '<') {
      // Embedded recursive conflict within a base side, caused by a criss-cross merge.
      // Advance the input adapter beyond it without marking anything.
      parseConflict(adapter, isRebase, new NoopVisitor());
      b = advanceToBoundary('<=');
    }

    const sideRowEnd = adapter.getCurrentRow();

    visitor.visitBaseSide(sideRowStart, sideRowStart + 1, sideRowEnd);
  };

  // Visit a "========" separator.
  const visitSeparator = () => {
    const sepRowStart = adapter.getCurrentRow();
    adapter.advanceRow();
    const sepRowEnd = adapter.getCurrentRow();

    visitor.visitSeparator(sepRowStart, sepRowEnd);
  };

  // Visit a side with a banner and description as its last line.
  const visitFooterSide = (position, visitMethod) => {
    const sideRowStart = adapter.getCurrentRow();
    advanceToBoundary('>');
    adapter.advanceRow();
    const sideRowEnd = adapter.getCurrentRow();

    visitor[visitMethod](position, sideRowEnd - 1, sideRowStart, sideRowEnd - 1);
  };

  // Determine if the current row is a side boundary.
  //
  // boundaryKinds - [String] any combination of <, |, =, or > to limit the kinds of boundary detected.
  //
  // Returns the matching boundaryKinds character, or `null` if none match.
  const isAtBoundary = (boundaryKinds = '<|=>') => {
    const line = adapter.getCurrentLine();
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
      adapter.advanceRow();
      if (adapter.isAtEnd()) {
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
}
