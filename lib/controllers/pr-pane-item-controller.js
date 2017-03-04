import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';
import Relay from 'react-relay';
import yubikiri from 'yubikiri';

import RelayNetworkLayerManager from '../relay-network-layer-manager';
import RelayRootContainer from '../containers/relay-root-container';
import GithubLoginModel from '../models/github-login-model';
import ObserveModel from '../decorators/observe-model';
import PrInfoByNumberRoute from '../routes/pr-info-by-number-route';

function getPropsFromUri(uri) {
  // atom-github://pull-request/https://github-host.tld/owner/repo/prNumber
  const {protocol, hostname, pathname} = url.parse(uri);
  if (protocol === 'atom-github:' && hostname === 'pull-request') {
    const [scheme, host, owner, repo, prNum] = pathname.split('/').filter(s => s);
    if (!scheme || !host || !owner || !repo || !prNum) { return null; }
    const prNumber = parseInt(prNum, 10);
    if (isNaN(prNumber)) { return null; }
    return {owner, repo, prNumber, host: `${scheme}//${host}`};
  }
  return null;
}

const PrPaneItemController = ObserveModel({
  getModel: props => props.loginModel,
  fetchData: (loginModel, {host}) => {
    return yubikiri({
      token: loginModel.getToken(host),
    });
  },
})(
class extends React.Component {
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
          const loginModel = GithubLoginModel.get();
          const props = {owner, repo, prNumber, host, loginModel};
          ReactDom.render(<PrPaneItemController {...props} />, element);
        }
        return element;
      },
    };
  }

  static opener(uri) {
    const props = getPropsFromUri(uri);
    if (props) {
      return this.create(props, uri);
    } else {
      return null;
    }
  }

  static propTypes = {
    owner: React.PropTypes.string.isRequired,
    repo: React.PropTypes.string.isRequired,
    prNumber: React.PropTypes.number.isRequired,
    host: React.PropTypes.string,
    token: React.PropTypes.string,
  }

  static defaultProps = {
    host: 'api.github.com',
  }

  render() {
    const route = new PrInfoByNumberRoute({
      repoOwner: this.props.owner,
      repoName: this.props.repo,
      prNumber: this.props.prNumber,
    });
    if (!this.props.token) {
      return <div>Log in pls</div>;
    }
    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, this.props.token);
    return (
      <RelayRootContainer
        Component={AThing}
        route={route}
        environment={environment}
        renderLoading={() => {
          return <div>Loading...</div>;
        }}
        renderFailure={(err, retry) => {
          if (err.response && err.response.status === 401) {
            return (
              <div>
                The API endpoint returned a unauthorized error. Please try to re-authenticate with the endpoint.
                {/* <GithubLoginView onLogin={this.props.onLogin} /> */}
              </div>
            );
          } else {
            return <div>An unknown error occurred.</div>;
          }
        }}
      />
    );
  }
});

export default PrPaneItemController;

global.PrPaneItemController = PrPaneItemController;

class AThingBase extends React.Component {
  render() {
    return (
      <pre>{JSON.stringify(this.props, null, '  ')}</pre>
    );
  }
}

const AThing = Relay.createContainer(AThingBase, {
  initialVariables: {
    repoOwner: null,
    repoName: null,
    prNumber: null,
  },

  fragments: {
    query: () => Relay.QL`
      fragment on Query {
        repository(owner: $repoOwner, name: $repoName) {
          pullRequest(number: $prNumber) {
            id title bodyHTML
          }
        }
      }
    `,
  },
});
