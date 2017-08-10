import React from 'react';
import {createFragmentContainer, graphql} from 'react-relay/compat';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Octicon from '../views/octicon';

const typeAndStateToIcon = {
  Issue: {
    OPEN: 'issue-opened',
    CLOSED: 'issue-closed',
  },
  PullRequest: {
    OPEN: 'git-pull-request',
    CLOSED: 'git-pull-request',
    MERGED: 'git-merge',
  },
};

class IssueishTooltip extends React.Component {
  static propTypes = {
    resource: PropTypes.shape({
      issue: PropTypes.shape({}),
      pullRequest: PropTypes.shape({}),
    }).isRequired,
  }

  render() {
    const resource = this.props.resource;
    const {repository, state, number, title, author, __typename} = resource;
    const icons = typeAndStateToIcon[__typename] || {};
    const icon = icons[state] || '';
    return (
      <div className="github-IssueishTooltip">
        <div className="issueish-badge-and-link">
          <span className={cx('issueish-badge', 'badge', state.toLowerCase())}>
            <Octicon icon={icon} />
            {state.toLowerCase()}
          </span>
          <span className="issueish-link">
            {repository.owner.login}/{repository.name}#{number}
          </span>
        </div>
        <h3 className="issueish-title">{title}</h3>
        <div className="issueish-avatar-and-title">
          <img className="author-avatar" src={author.avatarUrl} title={author.login} />
          <strong>{author.login}</strong>
        </div>
      </div>
    );
  }
}

export default createFragmentContainer(IssueishTooltip, {
  resource: graphql`
    fragment IssueishTooltipContainer_resource on UniformResourceLocatable {
      __typename

      ... on Issue {
        state number title
        repository { name owner { login } }
        author { login avatarUrl }
      }
      ... on PullRequest {
        state number title
        repository { name owner { login } }
        author { login avatarUrl }
      }
    }
  `,
});
