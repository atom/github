import React from 'react';

export default class RelayEnvironment extends React.Component {
  static propTypes = {
    environment: React.PropTypes.object.isRequired,
    children: React.PropTypes.node,
  }

  static childContextTypes = {
    relayEnvironment: React.PropTypes.object.isRequired,
  }

  getChildContext() {
    return {relayEnvironment: this.props.environment};
  }

  render() {
    return this.props.children;
  }
}
