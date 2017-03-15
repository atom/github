import React from 'react';
import Relay from 'react-relay';

import Octicon from '../views/octicon';

class UserMentionTooltip extends React.Component {
  static propTypes = {
    repositoryOwner: React.PropTypes.shape({
      login: React.PropTypes.string.isRequired,
      avatarURL: React.PropTypes.string.isRequired,
      repositories: React.PropTypes.shape({
        totalCount: React.PropTypes.number.isRequired,
      }).isRequired,

      // Users
      email: React.PropTypes.string,
      company: React.PropTypes.string,

      // Organizations
      members: React.PropTypes.shape({
        totalCount: React.PropTypes.number.isRequired,
      }),
    }).isRequired,
  }

  render() {
    const owner = this.props.repositoryOwner;
    const {login, email, company, repositories, members} = owner;
    return (
      <div className="github-UserMentionTooltip">
        <div className="github-UserMentionTooltip-avatar">
          <img src={owner.avatarURL} />
        </div>
        <div className="github-UserMentionTooltip-info">
          <div className="github-UserMentionTooltip-info-username">
            <Octicon icon="mention" /><strong>{login}</strong>
          </div>
          {company && <div><Octicon icon="briefcase" /><span>{company}</span></div>}
          {email && <div><Octicon icon="globe" /><span>{email}</span></div>}
          {members && <div><Octicon icon="organization" /><span>{members.totalCount} members</span></div>}
          <div><Octicon icon="repo" /><span>{repositories.totalCount} repositories</span></div>
        </div>
        <div style={{clear: 'both'}} />
      </div>
    );
  }
}

export default Relay.createContainer(UserMentionTooltip, {
  fragments: {
    repositoryOwner: () => Relay.QL`
      fragment on RepositoryOwner {
        login avatarURL repositories { totalCount }
        ... on User { company email }
        ... on Organization { members { totalCount } }
      }
    `,
  },
});
