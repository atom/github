import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {autobind} from 'core-decorators';

import RelayNetworkLayerManager from '../relay-network-layer-manager';
import RelayRootContainer from '../containers/relay-root-container';
import GithubLoginModel, {UNAUTHENTICATED} from '../models/github-login-model';
import GithubLoginView from '../views/github-login-view';
import ObserveModel from '../views/observe-model';
import IssueishInfoByNumberRoute from '../routes/issueish-info-by-number-route';
import IssueishLookupByNumberContainer from '../containers/issueish-lookup-by-number-container';
import RelayEnvironment from '../views/relay-environment';

export default class IssueishPaneItemController extends React.Component {
  static propTypes = {
    onTitleChange: PropTypes.func.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    issueishNumber: PropTypes.number.isRequired,
    host: PropTypes.string,
    loginModel: PropTypes.instanceOf(GithubLoginModel).isRequired,
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
      return <GithubLoginView onLogin={this.handleLogin} />;
    }

    const route = new IssueishInfoByNumberRoute({
      repoOwner: this.props.owner,
      repoName: this.props.repo,
      issueishNumber: this.props.issueishNumber,

      count: 20,
      cursor: null,
    });

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, data.token);

    const Component = IssueishLookupByNumberContainer;
    return (
      <RelayEnvironment environment={environment}>
        <RelayRootContainer
          Component={Component}
          route={route}
          environment={environment}
          renderFetched={props => {
            return <Component {...props} onTitleChange={this.props.onTitleChange} />;
          }}
          renderLoading={() => {
            return (
              <div className="github-Loader">
                <span className="github-Spinner" />
              </div>
            );
          }}
          renderFailure={(err, retry) => {
            if (err.response && err.response.status === 401) {
              return (
                <div className="github-GithubLoginView-Container">
                  <GithubLoginView onLogin={this.handleLogin}>
                    <p>
                      The API endpoint returned a unauthorized error. Please try to re-authenticate with the endpoint.
                    </p>
                  </GithubLoginView>
                </div>
              );
            } else {
              return <div>An unknown error occurred.</div>;
            }
          }}
        />
      </RelayEnvironment>
    );
  }

  @autobind
  handleLogin(token) {
    this.props.loginModel.setToken(this.props.host, token);
  }
}
