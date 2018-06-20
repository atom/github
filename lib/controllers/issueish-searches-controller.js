import React from 'react';
import PropTypes from 'prop-types';
import {shell} from 'electron';

import {autobind} from '../helpers';
import {RemotePropType, BranchSetPropType, OperationStateObserverPropType} from '../prop-types';
import Search from '../models/search';
import IssueishSearchContainer from '../containers/issueish-search-container';
import CurrentPullRequestContainer from '../containers/current-pull-request-container';
import IssueishPaneItem from '../items/issueish-pane-item';

export default class IssueishSearchesController extends React.Component {
  static propTypes = {
    host: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,
    workspace: PropTypes.object.isRequired,

    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }),

    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    remote: RemotePropType.isRequired,
    remotesByName: PropTypes.shape({get: PropTypes.func}).isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number,
    pushInProgress: PropTypes.bool.isRequired,

    onCreatePr: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'onOpenIssueish', 'onOpenSearch');

    this.state = {};
  }

  static getDerivedStateFromProps(props) {
    return {
      searches: [
        Search.inRemote(props.remote, 'Open pull requests', 'type:pr state:open'),
      ],
    };
  }

  render() {
    return (
      <div className="github-IssueishSearch">
        <CurrentPullRequestContainer
          repository={this.props.repository}
          token={this.props.token}
          host={this.props.host}
          remoteOperationObserver={this.props.remoteOperationObserver}
          remote={this.props.remote}
          remotesByName={this.props.remotesByName}
          branches={this.props.branches}
          aheadCount={this.props.aheadCount}
          pushInProgress={this.props.pushInProgress}

          onOpenIssueish={this.onOpenIssueish}
          onCreatePr={this.props.onCreatePr}
        />
        {this.state.searches.map(search => (
          <IssueishSearchContainer
            key={search.getName()}

            token={this.props.token}
            host={this.props.host}
            search={search}
            remoteOperationObserver={this.props.remoteOperationObserver}

            onOpenIssueish={this.onOpenIssueish}
            onOpenSearch={this.onOpenSearch}
          />
        ))}
      </div>
    );
  }

  onOpenIssueish(issueish) {
    return this.props.workspace.open(
      IssueishPaneItem.buildURI(
        this.props.host,
        this.props.remote.getOwner(),
        this.props.remote.getRepo(),
        issueish.getNumber(),
      ),
      {pending: true, searchAllPanes: true},
    );
  }

  onOpenSearch(search) {
    const searchURL = search.getWebURL(this.props.remote);

    return new Promise((resolve, reject) => {
      shell.openExternal(searchURL, {}, err => {
        if (err) { reject(err); } else { resolve(); }
      });
    });
  }
}
