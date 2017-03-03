import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';

function getPropsFromUri(uri) {
  const {protocol, hostname, pathname} = url.parse(uri);
  if (protocol === 'atom-github:' && hostname === 'pull-request') {
    const [host, owner, repo, prNum] = pathname.split('/').filter(s => s);
    if (!host || !owner || !repo || !prNum) { return null; }
    const prNumber = parseInt(prNum, 10);
    if (isNaN(prNumber)) { return null; }
    return {owner, repo, prNumber, host};
  }
  return null;
}

export default class PrPaneItemController extends React.Component {
  static create({owner, repo, prNumber, host}, uri) {
    let element;
    return {
      serialize() {
        return {
          uri,
          deserializer: 'PrPaneItemController',
        };
      },
      getURI() { return uri; },
      getTitle() { return `PR: ${owner}/${repo}#${prNumber}`; },
      get element() {
        if (!element) {
          element = document.createElement('div');
          const props = {owner, repo, prNumber, host};
          ReactDom.render(<PrPaneItemController {...props} />, element);
        }
        return element;
      },
    };
  }

  static opener = uri => {
    const props = getPropsFromUri(uri);
    if (props) {
      return PrPaneItemController.create(props, uri);
    } else {
      return null;
    }
  }

  static propTypes = {
    owner: React.PropTypes.string.isRequired,
    repo: React.PropTypes.string.isRequired,
    prNumber: React.PropTypes.number.isRequired,
    host: React.PropTypes.string,
  }

  static defaultProps = {
    host: 'api.github.com',
  }

  render() {
    return (
      <div>Hello! {this.props.owner}/{this.props.repo}#{this.props.prNumber} on host {this.props.host}</div>
    );
  }
}
