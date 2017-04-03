import url from 'url';

import React from 'react';
import {autobind} from 'core-decorators';

import Portal from './portal';

const PROTOCOL = 'atom-github:';

export default class Opener extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    hostname: React.PropTypes.string.isRequired,
    children: React.PropTypes.element.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    this.portals = new Map();

    this.state = {
      openUris: [],
    };
  }

  componentDidMount() {
    this.disposable = this.props.workspace.addOpener(this.opener);
  }

  render() {
    return this.state.openUris.map(uri => {
      return (
        <Portal
          key={uri}
          ref={c => { this.portals.set(uri, c); }}>
          {this.props.children}
        </Portal>
      );
    });
  }

  componentWillUnmount() {
    this.disposable.dispose();
  }

  @autobind
  opener(uri) {
    const {protocol, hostname} = url.parse(uri);
    if (protocol !== PROTOCOL) {
      return null;
    }

    if (hostname !== this.props.hostname) {
      return null;
    }

    return new Promise(resolve => {
      this.setState(prevState => {
        return {openUris: prevState.openUris.concat([uri])};
      }, () => {
        const view = this.portals.get(uri).getView();
        resolve(view);
      });
    });
  }
}
