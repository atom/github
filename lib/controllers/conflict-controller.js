import React from 'react';

import Decoration from '../views/decoration';

export default class ConflictController extends React.Component {
  static propTypes = {
    editor: React.PropTypes.object.isRequired,
    conflict: React.PropTypes.object.isRequired,
    resolveAsSequence: React.PropTypes.func,
  };

  static defaultProps = {
    resolveAsSequence: sources => {},
  }

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
    const source = side.getSource();

    return (
      <div>
        <Decoration
          key={side.banner.marker.id}
          editor={this.props.editor}
          marker={side.banner.marker}
          type="line"
          class={source.getBannerCSSClass()}
        />
        <Decoration
          key={side.marker.id}
          editor={this.props.editor}
          marker={side.marker}
          type="line"
          class={source.getSideCSSClass()}
        />
      </div>
    );
  }
}
