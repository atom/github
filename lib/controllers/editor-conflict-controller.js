import React from 'react';

import Conflict from '../models/conflicts/conflict';
import ConflictController from './conflict-controller';
import {OURS, THEIRS, BASE} from '../models/conflicts/source';

/**
 * Render a `ConflictController` for each conflict marker within an open TextEditor.
 */
export default class EditorConflictController extends React.Component {
  static propTypes = {
    editor: React.PropTypes.object.isRequired,
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
        {this.state.conflicts.map(c => <ConflictController key={c.getKey()} editor={this.props.editor} conflict={c} />)}
      </div>
    );
  }

  resolveAsOurs(conflict) {
    return this.resolveAs(conflict, OURS);
  }

  resolveAsTheirs(conflict) {
    return this.resolveAs(conflict, THEIRS);
  }

  resolveAsBase(conflict) {
    return this.resolveAs(conflict, BASE);
  }

  resolveAsOursThenTheirs(conflict) {
    return this.resolveAsSequence(conflict, [OURS, THEIRS]);
  }

  resolveAsTheirsThenOurs(conflict) {
    return this.resolveAsSequence(conflict, [THEIRS, OURS]);
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
