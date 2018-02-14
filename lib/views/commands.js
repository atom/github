import React from 'react';
import PropTypes from 'prop-types';

import {DOMNodePropType} from '../prop-types';

export default class Commands extends React.Component {
  static propTypes = {
    registry: PropTypes.object.isRequired,
    target: PropTypes.oneOfType([
      PropTypes.string,
      DOMNodePropType,
    ]).isRequired,
    children: PropTypes.oneOfType([
      PropTypes.element,
      PropTypes.arrayOf(PropTypes.element),
    ]).isRequired,
  }

  render() {
    const {registry, target} = this.props;
    return (
      <div>
        {React.Children.map(this.props.children, child => {
          return child ? React.cloneElement(child, {registry, target}) : null;
        })}
      </div>
    );
  }
}

export class Command extends React.Component {
  static propTypes = {
    registry: PropTypes.object,
    target: PropTypes.oneOfType([
      PropTypes.string,
      DOMNodePropType,
    ]),
    command: PropTypes.string.isRequired,
    callback: PropTypes.func.isRequired,
  }

  componentDidMount() {
    this.registerCommand(this.props);
  }

  componentWillReceiveProps(newProps) {
    for (const prop of ['registry', 'target', 'command', 'callback']) {
      if (newProps[prop] !== this.props[prop]) {
        this.disposable.dispose();
        this.registerCommand(newProps);
      }
    }
  }

  componentWillUnmount() {
    this.disposable.dispose();
  }

  registerCommand({registry, target, command, callback}) {
    this.disposable = registry.add(target, command, callback);
  }

  render() {
    return null;
  }
}
