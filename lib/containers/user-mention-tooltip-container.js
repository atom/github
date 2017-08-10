import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay/compat';
import PropTypes from 'prop-types';

import Octicon from '../views/octicon';

class UserMentionTooltip extends React.Component {
  static propTypes = {
    repositoryOwner: PropTypes.shape({
      login: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string.isRequired,
      repositories: PropTypes.shape({
        totalCount: PropTypes.number.isRequired,
      }).isRequired,

      // Users
      company: PropTypes.string,

      // Organizations
      members: PropTypes.shape({
        totalCount: PropTypes.number.isRequired,
      }),
    }).isRequired,
  }

  render() {
    const owner = this.props.repositoryOwner;
    const {login, company, repositories, members} = owner;
    return (
      <div className="github-UserMentionTooltip">
        <div className="github-UserMentionTooltip-avatar">
          <img src={owner.avatarUrl} />
        </div>
        <div className="github-UserMentionTooltip-info">
          <div className="github-UserMentionTooltip-info-username">
            <Octicon icon="mention" /><strong>{login}</strong>
          </div>
          {company && <div><Octicon icon="briefcase" /><span>{company}</span></div>}
          {members && <div><Octicon icon="organization" /><span>{members.totalCount} members</span></div>}
          <div><Octicon icon="repo" /><span>{repositories.totalCount} repositories</span></div>
        </div>
        <div style={{clear: 'both'}} />
      </div>
    );
  }
}

export default createFragmentContainer(UserMentionTooltip, {
  repositoryOwner: graphql`
    fragment UserMentionTooltipContainer_repositoryOwner on RepositoryOwner {
      login avatarUrl repositories { totalCount }
      ... on User { company }
      ... on Organization { members { totalCount } }
    }
  `,
});
