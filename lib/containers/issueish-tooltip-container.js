import React from 'react';
import Relay from 'react-relay';
import cx from 'classnames';

import Octicon from '../views/octicon';

const prStateToIcon = {
  OPEN: 'git-pull-request',
  CLOSED: 'git-pull-request',
  MERGED: 'git-merge',
};

class IssueishTooltip extends React.Component {
  static propTypes = {
    resource: React.PropTypes.shape({
      issue: React.PropTypes.shape({}),
      pullRequest: React.PropTypes.shape({}),
    }).isRequired,
  }

  render() {
    const resource = this.props.resource;
    const {repository, state, number, title, author} = resource;
    return (
      <div className="github-IssueishTooltip">
        <div className="issueish-badge-and-link">
          <span className={cx('issueish-badge', 'badge', state.toLowerCase())}>
            <Octicon icon={prStateToIcon[state]} />
            {state.toLowerCase()}
          </span>
          <span className="issueish-link">
            {repository.owner.login}/{repository.name}#{number}
          </span>
        </div>
        <h3 className="issueish-title">{title}</h3>
        <div className="issueish-avatar-and-title">
          <img className="author-avatar" src={author.avatarURL} title={author.login} style={{maxWidth: 20}} />
          <strong>{author.login}</strong>
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(IssueishTooltip, {
  fragments: {
    resource: () => Relay.QL`
      fragment on UniformResourceLocatable {
        ... on Issueish {
          number title
          repository { name owner { login } }
          author { login avatarURL }
        }
        ... on Issue { state }
        ... on PullRequest { state }
      }
    `,
  },
});
