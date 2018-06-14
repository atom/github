import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import {RemotePropType, BranchSetPropType} from '../prop-types';
import Search from '../models/search';
import IssueishListContainer from '../containers/issueish-list-container';

export default class IssueishSearchController extends React.Component {
  static propTypes = {
    host: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,

    repository: PropTypes.shape({
      defaultBranchRef: PropTypes.string,
    }),

    remote: RemotePropType.isRequired,
    branches: BranchSetPropType.isRequired,
    aheadCount: PropTypes.number.isRequired,
    pushInProgress: PropTypes.bool.isRequired,

    onCreatePr: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

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
      <Fragment>
        {this.state.searches.map(search => (
          <IssueishListContainer
            key={search.getName()}

            token={this.props.token}
            host={this.props.host}

            repository={this.props.repository}

            search={search}
            remote={this.props.remote}
            branches={this.props.branches}
            aheadCount={this.props.aheadCount}
            pushInProgress={this.props.pushInProgress}

            onCreatePr={this.props.onCreatePr}
          />
        ))}
      </Fragment>
    );
  }
}
