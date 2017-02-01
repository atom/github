import React from 'react';

import Commands, {Command} from '../views/commands';
import Conflict from '../models/conflicts/conflict';
import ConflictController from './conflict-controller';
import {OURS, THEIRS, BASE} from '../models/conflicts/source';

/**
 * Render a `ConflictController` for each conflict marker within an open TextEditor.
 */
export default class EditorConflictController extends React.Component {
  static propTypes = {
    editor: React.PropTypes.object.isRequired,
    commandRegistry: React.PropTypes.object.isRequired,
    isRebase: React.PropTypes.bool.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      conflicts: Conflict.all(props.editor, props.isRebase),
    };
  }

  render() {
    return (
      <div>
        {this.state.conflicts.length > 0 && (
          <Commands registry={this.props.commandRegistry} target="atom-text-editor">
            <Command command="github:resolve-as-ours" callback={this.getResolverUsing([OURS])} />
            <Command command="github:resolve-as-theirs" callback={this.getResolverUsing([THEIRS])} />
            <Command command="github:resolve-as-base" callback={this.getResolverUsing([BASE])} />
            <Command command="github:resolve-as-ours-then-theirs" callback={this.getResolverUsing([OURS, THEIRS])} />
            <Command command="github:resolve-as-theirs-then-ours" callback={this.getResolverUsing([THEIRS, OURS])} />
          </Commands>
        )}
        {this.state.conflicts.map(c => <ConflictController key={c.getKey()} editor={this.props.editor} conflict={c} />)}
      </div>
    );
  }

  /*
   * Return an Array containing `Conflict` objects whose marked regions include any cursor position in the current
   * `TextEditor`.
   */
  getCurrentConflicts() {
    const cursorPositions = this.props.editor.getCursorBufferPositions();
    cursorPositions.sort((a, b) => b.row - a.row);
    const conflicts = this.state.conflicts;

    let currentCursor = 0;
    let currentConflict = 0;
    const activeConflicts = [];

    while (currentCursor < cursorPositions.length && currentConflict < conflicts.length) {
      // Advance currentCursor to the first cursor beyond the earliest conflict.
      const earliestConflictPosition = conflicts[currentConflict].getRange().start;
      while (currentCursor < cursorPositions.length &&
          cursorPositions[currentCursor].isLessThan(earliestConflictPosition)) {
        currentCursor++;
      }

      // Short-circuit if we've run out of cursors.
      if (currentCursor >= cursorPositions.length) {
        break;
      }

      // Advance currentConflict until the first conflict that begins at a position after the current cursor.
      // Compare each to the current cursor, and add it to activeConflicts if it contains it.
      const currentCursorPosition = cursorPositions[currentCursor];
      while (currentConflict < conflicts.length &&
          conflicts[currentConflict].getRange().start.isLessThan(currentCursorPosition)) {
        if (conflicts[currentConflict].includesPosition(currentCursorPosition)) {
          activeConflicts.push(conflicts[currentConflict]);
        }

        currentConflict++;
      }
    }

    return activeConflicts;
  }

  getResolverUsing(sequence) {
    return () => {
      this.getCurrentConflicts().forEach(conflict => this.resolveAsSequence(conflict, sequence));
    };
  }

  resolveAsSequence(conflict, sources) {
    const [firstSide, ...restOfSides] = sources
      .map(source => conflict.getSide(source))
      .filter(side => side);

    const textToAppend = restOfSides.map(side => side.getText()).join('');

    // Append text from all but the first Side to the first Side. Adjust the following DisplayMarker so that only that
    // Side's marker includes the appended text, not the next one.
    const appendedRange = firstSide.appendText(textToAppend);
    const nextMarker = conflict.markerAfter(firstSide.getPosition());
    if (nextMarker) {
      nextMarker.setTailBufferPosition(appendedRange.end);
    }

    this.resolveAs(conflict, sources[0]);
  }

  resolveAs(conflict, source) {
    conflict.resolveAs(source);

    const chosenSide = conflict.getChosenSide();
    if (!chosenSide.isBannerModified()) {
      chosenSide.deleteBanner();
    }

    const separator = conflict.getSeparator();
    if (!separator.isModified()) {
      separator.delete();
    }

    conflict.getUnchosenSides().forEach(side => {
      side.deleteBanner();
      side.delete();
    });
  }
}
