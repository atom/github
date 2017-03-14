import React from 'react';
import yubikiri from 'yubikiri';
import {autobind} from 'core-decorators';

import RelayNetworkLayerManager from '../relay-network-layer-manager';
import RelayRootContainer from '../containers/relay-root-container';
import GithubLoginModel, {UNAUTHENTICATED} from '../models/github-login-model';
import ObserveModel from '../views/observe-model';
import IssueishInfoByNumberRoute from '../routes/issueish-info-by-number-route';
import IssueishLookupByNumberContainer from '../containers/issueish-lookup-by-number-container';


export default class IssueishPaneItemController extends React.Component {
  static propTypes = {
    onTitleChange: React.PropTypes.func.isRequired,
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

    const route = new IssueishInfoByNumberRoute({
      repoOwner: this.props.owner,
      repoName: this.props.repo,
      prNumber: this.props.prNumber,
    });

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(this.props.host, data.token);

    const Component = IssueishLookupByNumberContainer;
    return (
      <RelayRootContainer
        Component={Component}
        route={route}
        environment={environment}
        renderFetched={props => {
          return <Component {...props} onTitleChange={this.props.onTitleChange} />;
        }}
        renderLoading={() => {
          return (
            <div style={{textAlign: 'center'}}>
              <span className="loading loading-spinner-large inline-block" />
            </div>
          );
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
