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

  resolveAs(source) {
    const {conflict} = this.props;

    conflict.resolveAs(source);

    const chosenSide = conflict.getChosenSide();
    this.deleteMarker(chosenSide.getBannerMarker());
    this.deleteMarker(conflict.getSeparator().getMarker());

    conflict.getUnchosenSides().forEach(side => {
      this.deleteMarker(side.getBannerMarker());
      this.deleteMarker(side.getMarker());
    });
  }

  deleteMarker(marker) {
    this.props.editor.setTextInBufferRange(marker.getBufferRange(), '');
    marker.destroy();
  }
}
