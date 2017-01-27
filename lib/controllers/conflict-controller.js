/** @babel */

import React from 'react';
import {autobind} from 'core-decorators';

import Decoration from '../views/decoration';
import {OURS, THEIRS, BASE} from '../models/conflicts/source';

export default class ConflictController extends React.Component {
  static propTypes = {
    editor: React.PropTypes.object.isRequired,
    conflict: React.PropTypes.object.isRequired,
  };

  render() {
    return (
      <div>
        {this.renderSide(this.props.conflict.ours)}
        {this.props.conflict.base ? this.renderSide(this.props.conflict.base) : null}
        <Decoration
          key={this.props.conflict.separator.marker.id}
          editor={this.props.editor}
          marker={this.props.conflict.separator.marker}
          type="line"
          class="conflict-separator"
        />
        {this.renderSide(this.props.conflict.theirs)}
      </div>
    );
  }

  renderSide(side) {
    return (
      <div>
        <Decoration
          key={`line-${side.banner.marker.id}`}
          editor={this.props.editor}
          marker={side.banner.marker}
          type="line"
          class="conflict-banner"
        />
        <Decoration
          key={`linenumber-${side.banner.marker.id}`}
          editor={this.props.editor}
          marker={side.banner.marker}
          type="line-number"
          class="conflict-banner"
        />
        <Decoration
          key={side.marker.id}
          editor={this.props.editor}
          marker={side.marker}
          type="line"
          class={`conflict-${side.source.name}`}
        />
      </div>
    );
  }

  @autobind
  resolveAsOurs() {
    return this.resolveAs(OURS);
  }

  @autobind
  resolveAsTheirs() {
    return this.resolveAs(THEIRS);
  }

  @autobind
  resolveAsBase() {
    return this.resolveAs(BASE);
  }

  @autobind
  resolveAsOursThenTheirs() {
    return this.resolveAsSequence([OURS, THEIRS]);
  }

  @autobind
  resolveAsTheirsThenOurs() {
    return this.resolveAsSequence([THEIRS, OURS]);
  }

  resolveAsSequence(sources) {
    const {conflict} = this.props;
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

    this.resolveAs(sources[0]);
  }

  resolveAs(source) {
    const {conflict} = this.props;

    conflict.resolveAs(source);

    const chosenSide = conflict.getChosenSide();
    chosenSide.deleteBanner();
    conflict.getSeparator().delete();

    conflict.getUnchosenSides().forEach(side => {
      side.deleteBanner();
      side.delete();
    });
  }
}
