/** @babel */

import React from 'react';

import Decoration from '../views/decoration';
import Conflict from '../models/conflicts/conflict';

/**
 * Create `Decorations` for each conflict marker within an open TextEditor.
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
    const decorations = [];
    this.state.conflicts.forEach(this.renderConflict.bind(this, decorations));

    return <div>{decorations}</div>;
  }

  renderConflict(decorations, conflict) {
    this.renderSide(decorations, conflict.ours);
    this.renderSide(decorations, conflict.theirs);

    decorations.push((
      <Decoration
        key={conflict.separator.marker.id}
        editor={this.props.editor}
        marker={conflict.separator.marker}
        type="line"
        class="conflict-separator"
      />
    ));

    if (conflict.base) {
      this.renderSide(decorations, conflict.base);
    }
  }

  renderSide(decorations, side) {
    decorations.push((
      <Decoration
        key={`line-${side.banner.marker.id}`}
        editor={this.props.editor}
        marker={side.banner.marker}
        type="line"
        class="conflict-banner"
      />
    ));
    decorations.push((
      <Decoration
        key={`linenumber-${side.banner.marker.id}`}
        editor={this.props.editor}
        marker={side.banner.marker}
        type="line-number"
        class="conflict-banner"
      />
    ));

    decorations.push((
      <Decoration
        key={side.marker.id}
        editor={this.props.editor}
        marker={side.marker}
        type="line"
        class={`conflict-${side.source.name}`}
      />
    ));
  }
}
