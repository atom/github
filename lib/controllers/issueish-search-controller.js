import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import {RemotePropType, BranchPropType} from '../prop-types';
import Search from '../models/search';
import IssueishListContainer from '../containers/issueish-list-container';

export default class IssueishSearchController extends React.Component {
  static propTypes = {
    host: PropTypes.string.isRequired,
    token: PropTypes.string.isRequired,

    remote: RemotePropType.isRequired,
    currentBranch: BranchPropType.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {};
  }

  static getDerivedStateFromProps(props) {
    return {
      searches: [
        Search.forCurrentPR(props.remote, props.currentBranch),
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
            search={search}
          />
        ))}
      </Fragment>
    );
  }
}
