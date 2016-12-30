/** @babel */

import React from 'react';

import Conflict from '../models/conflicts/conflict';
import ConflictController from './conflict-controller';

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
}
