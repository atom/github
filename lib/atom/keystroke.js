import React from 'react';
import PropTypes from 'prop-types';
import {humanizeKeystroke} from 'underscore-plus';

export default class Keystoke extends React.Component {
  static propTypes = {
    keymaps: PropTypes.shape({
      findKeyBindings: PropTypes.func.isRequired,
    }).isRequired,
    command: PropTypes.string.isRequired,
    target: PropTypes.instanceOf(Element),
  }

  render() {
    const [keybinding] = this.props.keymaps.findKeyBindings({
      command: this.props.command,
      target: this.props.target,
    });

    if (!keybinding) {
      return null;
    }

    return <span className="keystroke">{humanizeKeystroke(keybinding.keystrokes)}</span>;
  }
}
