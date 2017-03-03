import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';

export default class PrPaneItemController extends React.Component {
  static create({owner, repo, prNumber, options = {}}) {
    let element;
    return {
      serialize() {
        return {
          owner, repo, prNumber, options,
          deserializer: 'PrPaneItemController',
        };
      },
      getURI() {
        const query = {};
        if (options.host) { query.host = options.host; }
        if (options.enterprise) { query.enterprise = options.enterprise; }
        return url.format({
          slashes: true,
          protocol: 'atom-github:',
          hostname: 'pull-request',
          pathname: `/${owner}/${repo}/${prNumber}`,
          query: options,
        });
      },
      getTitle() { return `PR: ${owner}/${repo}#${prNumber}`; },
      get element() {
        if (!element) {
          element = document.createElement('div');
          const props = {owner, repo, prNumber, host: options.host, enterprise: options.enterprise};
          ReactDom.render(<PrPaneItemController {...props} />, element);
        }
        return element;
      },
    };
  }

  static opener = uri => {
    const {protocol, hostname, pathname, query} = url.parse(uri, true);
    const {host, enterprise} = query;
    if (protocol === 'atom-github:' && hostname === 'pull-request') {
      const [owner, repo, prNum] = pathname.split('/').filter(s => s);
      if (!owner || !repo || !prNum) { return null; }
      const prNumber = parseInt(prNum, 10);
      if (isNaN(prNumber)) { return null; }
      return PrPaneItemController.create({owner, repo, prNumber, options: {host, enterprise: enterprise === 'true'}});
    }
    return null;
  }

  static propTypes = {
    owner: React.PropTypes.string.isRequired,
    repo: React.PropTypes.string.isRequired,
    prNumber: React.PropTypes.number.isRequired,
    host: React.PropTypes.string,
    enterprise: React.PropTypes.bool,
  }

  static defaultProps = {
    host: 'api.github.com',
    enterprise: false,
  }

  render() {
    return (
      <div>Hello! {this.props.owner}/{this.props.repo}#{this.props.prNumber}</div>
    );
  }
}
