import {CompositeDisposable} from 'atom';
import React from 'react';
import {autobind} from 'core-decorators';

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
    resolutionProgress: React.PropTypes.object.isRequired,
    isRebase: React.PropTypes.bool.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    // this.layer = props.editor.addMarkerLayer({
    //   maintainHistory: true,
    //   persistent: false,
    // });

    this.layer = props.editor.getDefaultMarkerLayer();

    this.state = {
      conflicts: Conflict.allFromEditor(props.editor, this.layer, props.isRebase),
    };

    this.subscriptions = new CompositeDisposable();

    this.updateMarkerCount();
  }

  componentDidMount() {
    this.subscriptions.add(
      this.props.editor.onDidStopChanging(() => this.setState({})),
    );
  }

  render() {
    this.updateMarkerCount();

    return (
      <div>
        {this.state.conflicts.length > 0 && (
          <Commands registry={this.props.commandRegistry} target="atom-text-editor">
            <Command command="github:resolve-as-ours" callback={this.getResolverUsing([OURS])} />
            <Command command="github:resolve-as-theirs" callback={this.getResolverUsing([THEIRS])} />
            <Command command="github:resolve-as-base" callback={this.getResolverUsing([BASE])} />
            <Command command="github:resolve-as-ours-then-theirs" callback={this.getResolverUsing([OURS, THEIRS])} />
            <Command command="github:resolve-as-theirs-then-ours" callback={this.getResolverUsing([THEIRS, OURS])} />
            <Command command="github:resolve-as-current" callback={this.resolveAsCurrent} />
            <Command command="github:revert-conflict-modifications" callback={this.revertConflictModifications} />
            <Command command="github:dismiss-conflict" callback={this.dismissCurrent} />
          </Commands>
        )}
        {this.state.conflicts.map(c => (
          <ConflictController
            key={c.getKey()}
            editor={this.props.editor}
            conflict={c}
            resolveAsSequence={sources => this.resolveAsSequence(c, sources)}
            dismiss={() => this.dismissConflicts([c])}
          />
        ))}
      </div>
    );
  }

  componentWillUnmount() {
    this.layer.destroy();
    this.subscriptions.dispose();
  }

  /*
   * Return an Array containing `Conflict` objects whose marked regions include any cursor position in the current
   * `TextEditor` and the `Sides` that contain a cursor within each.
   *
   * This method is written to have linear complexity with respect to the number of cursors and the number of
   * conflicts, to gracefully handle files with large numbers of both.
   */
  getCurrentConflicts() {
    const cursorPositions = this.props.editor.getCursorBufferPositions();
    cursorPositions.sort((a, b) => a.compare(b));
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

      // Advance currentConflict until the first conflict that begins at a position after the current cursor.
      // Compare each to the current cursor, and add it to activeConflicts if it contains it.
      while (currentConflict < conflicts.length &&
          currentCursor < cursorPositions.length &&
          conflicts[currentConflict].getRange().start.isLessThan(cursorPositions[currentCursor])) {
        if (conflicts[currentConflict].includesPoint(cursorPositions[currentCursor])) {
          // Hit; determine which sides of this conflict contain cursors.
          const conflict = conflicts[currentConflict];
          const endPosition = conflict.getRange().end;
          const sides = new Set();
          while (currentCursor < cursorPositions.length &&
              cursorPositions[currentCursor].isLessThan(endPosition)) {
            const side = conflict.getSideContaining(cursorPositions[currentCursor]);
            if (side) {
              sides.add(side);
            }
            currentCursor++;
          }

          activeConflicts.push({conflict, sides});
        }

        currentConflict++;
      }
    }

    return activeConflicts;
  }

  getResolverUsing(sequence) {
    return () => {
      this.getCurrentConflicts().forEach(match => this.resolveAsSequence(match.conflict, sequence));
    };
  }

  @autobind
  resolveAsCurrent() {
    this.getCurrentConflicts().forEach(match => {
      if (match.sides.size === 1) {
        const side = match.sides.keys().next().value;
        this.resolveAs(match.conflict, side.getSource());
      }
    });
  }

  @autobind
  revertConflictModifications() {
    this.getCurrentConflicts().forEach(match => {
      match.sides.forEach(side => {
        side.isModified() && side.revert();
        side.isBannerModified() && side.revertBanner();
      });
    });
  }

  @autobind
  dismissCurrent() {
    this.dismissConflicts(this.getCurrentConflicts().map(match => match.conflict));
  }

  dismissConflicts(conflicts) {
    const conflictSet = new Set(conflicts);
    this.setState((prevState, props) => {
      const newConflicts = prevState.conflicts.filter(conflict => !conflictSet.has(conflict));
      return {conflicts: newConflicts};
    });
  }

  resolveAsSequence(conflict, sources) {
    const [firstSide, ...restOfSides] = sources
      .map(source => conflict.getSide(source))
      .filter(side => side);

    const textToAppend = restOfSides.map(side => side.getText()).join('');

    this.props.editor.transact(() => {
      // Append text from all but the first Side to the first Side. Adjust the following DisplayMarker so that only that
      // Side's marker includes the appended text, not the next one.
      const appendedRange = firstSide.appendText(textToAppend);
      const nextMarker = conflict.markerAfter(firstSide.getPosition());
      if (nextMarker) {
        nextMarker.setTailBufferPosition(appendedRange.end);
      }

      this.innerResolveAs(conflict, sources[0]);
    });
  }

  resolveAs(conflict, source) {
    this.props.editor.transact(() => {
      this.innerResolveAs(conflict, source);
    });
  }

  innerResolveAs(conflict, source) {
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

    this.updateMarkerCount();
  }

  updateMarkerCount() {
    this.props.resolutionProgress.reportMarkerCount(
      this.props.editor.getPath(),
      this.state.conflicts.filter(c => !c.isResolved()).length,
    );
  }
}
