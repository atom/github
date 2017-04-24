import React from 'react';
import PropTypes from 'prop-types';

import {RemotePropType} from '../prop-types';
import RelayRootContainer from '../containers/relay-root-container';
import PrListContainer from '../containers/pr-list-container';
import GithubLoginView from '../views/github-login-view';
import PrInfoByBranchRoute from '../routes/pr-info-by-branch-route';
import RelayNetworkLayerManager from '../relay-network-layer-manager';
import {UNAUTHENTICATED} from '../models/github-login-model';

export default class PrInfoController extends React.Component {
  static propTypes = {
    token: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.symbol,
    ]).isRequired,
    host: PropTypes.string.isRequired,
    currentBranchName: PropTypes.string.isRequired,
    onLogin: PropTypes.func.isRequired,
    remote: RemotePropType.isRequired,
  }

  shouldComponentUpdate(nextProps) {
    return (
      nextProps.token !== this.props.token ||
      nextProps.host !== this.props.host ||
      nextProps.currentBranchName !== this.props.currentBranchName ||
      nextProps.onLogin !== this.props.onLogin ||
      nextProps.remote !== this.props.remote
    );
  }

  render() {
    const {token, host} = this.props;

    if (token === UNAUTHENTICATED) {
      return null;
    }

    const route = new PrInfoByBranchRoute({
      repoOwner: this.props.remote.getOwner(),
      repoName: this.props.remote.getName(),
      branchName: this.props.currentBranchName,
    });

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(host, token);


    return (
      <RelayRootContainer
        Component={PrListContainer}
        route={route}
        environment={environment}
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
                <GithubLoginView onLogin={this.props.onLogin}>
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
    );
  }
}
