import React from 'react';
import PropTypes from 'prop-types';
import {shell} from 'electron';

import {autobind} from '../helpers';
import {RemotePropType, BranchSetPropType, OperationStateObserverPropType} from '../prop-types';
import Search from '../models/search';
import IssueishSearchContainer from '../containers/issueish-search-container';
import IssueishPaneItem from '../items/issueish-pane-item';

export default class IssueishSearchesController extends React.Component {
  static propTypes = {
    host: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,
    workspace: PropTypes.object.isRequired,

    repository: PropTypes.shape({
      defaultBranchRef: PropTypes.shape({
        prefix: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
      }),
    }),

    remoteOperationObserver: OperationStateObserverPropType.isRequired,
    remote: RemotePropType.isRequired,
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
        Search.forCurrentPR(props.remote, props.branches.getHeadBranch()),
        Search.inRemote(props.remote, 'Open pull requests', 'type:pr state:open'),
      ],
    };
  }

  render() {
    return (
      <div className="github-IssueishSearch">
        {this.state.searches.map(search => (
          <IssueishSearchContainer
            key={search.getName()}

            token={this.props.token}
            host={this.props.host}

            repository={this.props.repository}

            remoteOperationObserver={this.props.remoteOperationObserver}
            search={search}
            remote={this.props.remote}
            branches={this.props.branches}
            aheadCount={this.props.aheadCount}
            pushInProgress={this.props.pushInProgress}

            onOpenIssueish={this.onOpenIssueish}
            onOpenSearch={this.onOpenSearch}
            onCreatePr={this.props.onCreatePr}
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
