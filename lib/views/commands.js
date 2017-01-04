import React from 'react';

import {DOMNodePropType} from '../prop-types';

export default class Commands extends React.Component {
  static propTypes = {
    registry: React.PropTypes.object.isRequired,
    target: React.PropTypes.oneOfType([
      React.PropTypes.string,
      DOMNodePropType,
    ]).isRequired,
    children: React.PropTypes.oneOfType([
      React.PropTypes.element,
      React.PropTypes.arrayOf(React.PropTypes.element),
    ]).isRequired,
  }

  render() {
    const {registry, target} = this.props;
    return (
      <div>
        {React.Children.map(this.props.children, child => {
          return React.cloneElement(child, {registry, target});
        })}
      </div>
    );
  }
}

export class Command extends React.Component {
  static propTypes = {
    registry: React.PropTypes.object,
    target: React.PropTypes.oneOfType([
      React.PropTypes.string,
      DOMNodePropType,
    ]),
    command: React.PropTypes.string.isRequired,
    callback: React.PropTypes.func.isRequired,
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
