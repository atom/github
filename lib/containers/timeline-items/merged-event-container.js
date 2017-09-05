import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay';
import PropTypes from 'prop-types';

import Octicon from '../../views/octicon';
import Timeago from '../../views/timeago';

export class MergedEvent extends React.Component {
  static propTypes = {
    item: PropTypes.shape({
      actor: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        login: PropTypes.string.isRequired,
      }).isRequired,
      commit: PropTypes.shape({
        oid: PropTypes.string.isRequired,
      }).isRequired,
      mergeRefName: PropTypes.string.isRequired,
      createdAt: PropTypes.string.isRequired,
    }).isRequired,
  }

  render() {
    const {actor, commit, mergeRefName, createdAt} = this.props.item;
    return (
      <div className="merged-event">
        <Octicon className="pre-timeline-item-icon" icon="git-merge" />
        <img className="author-avatar" src={actor.avatarUrl} title={actor.login} />
        <span className="merged-event-header">
          <span className="username">{actor.login}</span> merged
          commit <span className="sha">{commit.oid.slice(0, 8)}</span> into
          {' '}<span className="merge-ref">{mergeRefName}</span> on <Timeago time={createdAt} />
        </span>
      </div>
    );
  }
}

export default createFragmentContainer(MergedEvent, {
  item: graphql`
    fragment MergedEventContainer_item on MergedEvent {
      actor {
        avatarUrl login
      }
      commit { oid }
      mergeRefName
      createdAt
    }
  `,
});
