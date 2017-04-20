import React from 'react';
import PropTypes from 'prop-types';

export default class RelayEnvironment extends React.Component {
  static propTypes = {
    environment: PropTypes.object.isRequired,
    children: PropTypes.node,
  }

  static childContextTypes = {
    relayEnvironment: PropTypes.object.isRequired,
  }

  getChildContext() {
    return {relayEnvironment: this.props.environment};
  }

  render() {
    return this.props.children;
  }
}
