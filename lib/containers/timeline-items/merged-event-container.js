import React from 'react';
import Relay from 'react-relay/classic';
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
      mergeRef: PropTypes.shape({
        name: PropTypes.string.isRequired,
      }).isRequired,
      createdAt: PropTypes.string.isRequired,
    }).isRequired,
  }

  render() {
    const {actor, commit, mergeRef, createdAt} = this.props.item;
    return (
      <div className="merged-event">
        <Octicon className="pre-timeline-item-icon" icon="git-merge" />
        <img className="author-avatar" src={actor.avatarUrl} title={actor.login} />
        <span className="merged-event-header">
          <span className="username">{actor.login}</span> merged
          commit <span className="sha">{commit.oid.slice(0, 8)}</span> into
          {' '}<span className="merge-ref">{mergeRef.name}</span> on <Timeago time={createdAt} />
        </span>
      </div>
    );
  }
}

export default Relay.createContainer(MergedEvent, {
  fragments: {
    item: () => Relay.QL`
      fragment on MergedEvent {
        actor {
          avatarUrl login
        }
        commit { oid }
        mergeRef { name }
        createdAt
      }
    `,
  },
});
