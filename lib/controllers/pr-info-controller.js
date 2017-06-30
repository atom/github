import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import {RemotePropType} from '../prop-types';
import RelayRootContainer from '../containers/relay-root-container';
import PrSelectionByUrlContainer from '../containers/pr-selection-by-url-container';
import PrSelectionByBranchContainer from '../containers/pr-selection-by-branch-container';
import GithubLoginView from '../views/github-login-view';
import PrInfoByBranchRoute from '../routes/pr-info-by-branch-route';
import PrInfoByUrlRoute from '../routes/pr-info-by-url-route';
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
    onSelectPr: PropTypes.func.isRequired,
    selectedPrUrl: PropTypes.string,
    onUnpinPr: PropTypes.func.isRequired,
  }

  render() {
    if (this.props.token === UNAUTHENTICATED) {
      return null;
    }

    if (this.props.selectedPrUrl) {
      return this.renderSpecificPr();
    } else {
      return this.renderPrByBranchName();
    }
  }

  renderSpecificPr() {
    const {token, host} = this.props;

    const route = new PrInfoByUrlRoute({
      prUrl: this.props.selectedPrUrl,
    });

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(host, token);
    const Component = PrSelectionByUrlContainer;

    return (
      <RelayRootContainer
        Component={Component}
        route={route}
        environment={environment}
        renderFetched={props => {
          return <Component {...props} onSelectPr={this.props.onSelectPr} onUnpinPr={this.props.onUnpinPr} />;
        }}
        renderLoading={this.renderLoading}
        renderFailure={this.renderSpecificPrFailure}
      />
    );
  }

  renderPrByBranchName() {
    const {token, host} = this.props;

    const route = new PrInfoByBranchRoute({
      repoOwner: this.props.remote.getOwner(),
      repoName: this.props.remote.getRepo(),
      branchName: this.props.currentBranchName,
    });

    const environment = RelayNetworkLayerManager.getEnvironmentForHost(host, token);
    const Component = PrSelectionByBranchContainer;

    return (
      <RelayRootContainer
        Component={Component}
        route={route}
        environment={environment}
        renderFetched={props => {
          return <Component {...props} onSelectPr={this.props.onSelectPr} onUnpinPr={this.props.onUnpinPr} />;
        }}
        renderLoading={this.renderLoading}
        renderFailure={this.renderFailure}
      />
    );
  }

  @autobind
  renderLoading() {
    return (
      <div className="github-Loader">
        <span className="github-Spinner" />
      </div>
    );
  }

  @autobind
  renderSpecificPrFailure(err, retry) {
    if (this.isNotFoundError(err)) {
      return (
        <PrSelectionByUrlContainer
          prUrl={this.props.selectedPrUrl}
          query={null}
          onSelectPr={this.props.onSelectPr}
          onUnpinPr={this.props.onUnpinPr}
        />
      );
    } else {
      return this.renderFailure(err, retry);
    }
  }

  @autobind
  renderFailure(err, retry) {
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
      return (
        <div className="github-Message">
          <div className="github-Message-wrapper">
            <h1 className="github-Message-title">Error</h1>
            <p className="github-Message-description">
              An unknown error occurred
            </p>
            <div className="github-Message-action">
              <button className="github-Message-button btn btn-primary" onClick={retry}>Try Again</button>
            </div>
          </div>
        </div>
      );
    }
  }

  isNotFoundError(err) {
    return err.source &&
      err.source.errors &&
      err.source.errors[0] &&
      err.source.errors[0].type === 'NOT_FOUND';
  }
}
