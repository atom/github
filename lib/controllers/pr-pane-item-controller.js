import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';
import yubikiri from 'yubikiri';
import {autobind} from 'core-decorators';

import RelayNetworkLayerManager from '../relay-network-layer-manager';
import RelayRootContainer from '../containers/relay-root-container';
import GithubLoginModel, {UNAUTHENTICATED} from '../models/github-login-model';
import ObserveModel from '../views/observe-model';
import PrInfoByNumberRoute from '../routes/pr-info-by-number-route';
import PrLookupByNumberContainer from '../containers/pr-lookup-by-number-container';

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
    loginModel: React.PropTypes.instanceOf(GithubLoginModel).isRequired,
  }

  static defaultProps = {
    host: 'api.github.com',
  }

  @autobind
  fetchData(loginModel) {
    return yubikiri({
      token: loginModel.getToken(this.props.host),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.loginModel} fetchData={this.fetchData}>
        {this.renderWithToken}
      </ObserveModel>
    );
  }

  @autobind
  renderWithToken(data) {
    if (!data) { return null; }
    if (data.token === UNAUTHENTICATED) {
      return <div>Log in pls</div>;
    }

    const route = new PrInfoByNumberRoute({
      repoOwner: this.props.owner,
      repoName: this.props.repo,
      prNumber: this.props.prNumber,
    });

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, data.token);

    return (
      <RelayRootContainer
        Component={PrLookupByNumberContainer}
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
}
