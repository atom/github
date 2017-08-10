import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {autobind} from 'core-decorators';
import {QueryRenderer, graphql} from 'react-relay/compat';

import RelayNetworkLayerManager from '../relay-network-layer-manager';
import GithubLoginModel, {UNAUTHENTICATED} from '../models/github-login-model';
import GithubLoginView from '../views/github-login-view';
import ObserveModel from '../views/observe-model';
import IssueishLookupByNumberContainer from '../containers/issueish-lookup-by-number-container';
import RelayEnvironment from '../views/relay-environment';

export default class IssueishPaneItemController extends React.Component {
  static propTypes = {
    onTitleChange: PropTypes.func.isRequired,
    owner: PropTypes.string.isRequired,
    repo: PropTypes.string.isRequired,
    issueishNumber: PropTypes.number.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
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

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, data.token);

    return (
      <RelayEnvironment environment={environment}>
        <QueryRenderer
          environment={environment}
          query={graphql`
            query IssueishPaneItemControllerQuery
            (
              $repoOwner: String!
              $repoName: String!
              $issueishNumber: Int!
              $timelineCount: Int!
              $timelineCursor: String
            ) {
              repository(owner: $repoOwner, name: $repoName) {
                ...IssueishLookupByNumberContainer_repository
              }
            }
          `}
          variables={{
            repoOwner: this.props.owner,
            repoName: this.props.repo,
            issueishNumber: this.props.issueishNumber,
            timelineCount: 20,
            timelineCursor: null,
          }}
          render={({error, props, retry}) => {
            if (error) {
              if (error.response && error.response.status === 401) {
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
            } else if (props) {
              return (
                <IssueishLookupByNumberContainer
                  {...props}
                  issueishNumber={this.props.issueishNumber}
                  onTitleChange={this.props.onTitleChange}
                  switchToIssueish={this.props.switchToIssueish}
                />
              );
            } else {
              return (
                <div className="github-Loader">
                  <span className="github-Spinner" />
                </div>
              );
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
