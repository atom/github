import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay/compat';
import PropTypes from 'prop-types';

import Octicon from '../../views/octicon';
import Timeago from '../../views/timeago';

export class HeadRefForcePushedEvent extends React.Component {
  static propTypes = {
    item: PropTypes.shape({
      actor: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
        login: PropTypes.string.isRequired,
      }).isRequired,
      beforeCommit: PropTypes.shape({
        oid: PropTypes.string.isRequired,
      }).isRequired,
      afterCommit: PropTypes.shape({
        oid: PropTypes.string.isRequired,
      }).isRequired,
      createdAt: PropTypes.string.isRequired,
    }).isRequired,
    issueish: PropTypes.shape({
      headRefName: PropTypes.string.isRequired,
      headRepositoryOwner: PropTypes.shape({
        login: PropTypes.string.isRequired,
      }).isRequired,
      repository: PropTypes.shape({
        owner: PropTypes.shape({
          login: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
    }).isRequired,
  }

  render() {
    const {actor, beforeCommit, afterCommit, createdAt} = this.props.item;
    const {headRefName, headRepositoryOwner, repository} = this.props.issueish;
    const branchPrefix = headRepositoryOwner.login !== repository.owner.login ? `${headRepositoryOwner.login}:` : '';
    return (
      <div className="head-ref-force-pushed-event">
        <Octicon className="pre-timeline-item-icon" icon="repo-force-push" />
        <img className="author-avatar" src={actor.avatarUrl} title={actor.login} />
        <span className="head-ref-force-pushed-event-header">
          <span className="username">{actor.login}</span> force-pushed
          the {branchPrefix + headRefName} branch
          from <span className="sha">{beforeCommit.oid.slice(0, 8)}</span> to
          {' '}<span className="sha">{afterCommit.oid.slice(0, 8)}</span> on <Timeago time={createdAt} />
        </span>
      </div>
    );
  }
}

export default createFragmentContainer(HeadRefForcePushedEvent, {
  issueish: graphql`
    fragment HeadRefForcePushedEventContainer_issueish on PullRequest {
      headRefName
      headRepositoryOwner { login }
      repository { owner { login } }
    }
  `,

  item: graphql`
    fragment HeadRefForcePushedEventContainer_item on HeadRefForcePushedEvent {
      actor { avatarUrl login }
      beforeCommit { oid }
      afterCommit { oid }
      createdAt
    }
  `,
});
