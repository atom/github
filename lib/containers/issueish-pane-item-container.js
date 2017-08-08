import React from 'react';
import Relay from 'react-relay/classic';
import PropTypes from 'prop-types';
import cx from 'classnames';

import IssueishTimelineContainer from './issueish-timeline-container';
import Octicon from '../views/octicon';
import GithubDotcomMarkdown from '../views/github-dotcom-markdown';

const reactionTypeToEmoji = {
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  LAUGH: '😆',
  HOORAY: '🎉',
  CONFUSED: '😕',
  HEART: '❤️',
};

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

export class IssueishPaneItemView extends React.Component {
  static propTypes = {
    switchToIssueish: PropTypes.func.isRequired,
    repository: PropTypes.shape({
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string,
      }),
    }),
    issueish: PropTypes.shape({
      title: PropTypes.string,
      bodyHTML: PropTypes.string,
      number: PropTypes.number,
      state: PropTypes.oneOf([
        'OPEN', 'CLOSED', 'MERGED',
      ]).isRequired,
      author: PropTypes.shape({
        login: PropTypes.string.isRequired,
        avatarUrl: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
      }).isRequired,
      reactionGroups: PropTypes.arrayOf(
        PropTypes.shape({
          content: PropTypes.string.isRequired,
          users: PropTypes.shape({
            totalCount: PropTypes.number.isRequired,
          }).isRequired,
        }),
      ).isRequired,
    }).isRequired,
  }

  render() {
    const repo = this.props.repository;
    const issueish = this.props.issueish;
    const icons = typeAndStateToIcon[issueish.__typename] || {};
    const icon = icons[issueish.state] || '';
    const childProps = {
      issue: issueish.__typename === 'Issue' ? issueish : null,
      pullRequest: issueish.__typename === 'PullRequest' ? issueish : null,
    };
    return (
      <div className="github-PrPaneItem">
        <div className="github-PrPaneItem-container">
          <div className="issueish-badge-and-link">
            <span className={cx('issueish-badge', 'badge', issueish.state.toLowerCase())}>
              <Octicon icon={icon} />
              {issueish.state.toLowerCase()}
            </span>
            <span className="issueish-link">
              <a href={issueish.url}>{repo.owner.login}/{repo.name}#{issueish.number}</a>
            </span>
          </div>
          <div className="issueish-avatar-and-title">
            <a className="author-avatar-link" href={issueish.author.url}>
              <img className="author-avatar" src={issueish.author.avatarUrl} title={issueish.author.login} />
            </a>
            <h3 className="issueish-title">{issueish.title}</h3>
          </div>
          <GithubDotcomMarkdown
            html={issueish.bodyHTML || '<em>No description provided.</em>'}
            switchToIssueish={this.props.switchToIssueish}
          />
          <div className="reactions">
            {issueish.reactionGroups.map(group => (
              group.users.totalCount > 0
              ? <span className={cx('reaction-group', group.content.toLowerCase())} key={group.content}>
                {reactionTypeToEmoji[group.content]} &nbsp; {group.users.totalCount}
              </span>
              : null
            ))}
          </div>
          <IssueishTimelineContainer {...childProps} switchToIssueish={this.props.switchToIssueish} />
        </div>
      </div>
    );
  }
}

export default Relay.createContainer(IssueishPaneItemView, {
  fragments: {
    repository: () => Relay.QL`
      fragment on Repository {
        name owner { login }
      }
    `,

    issueish: () => Relay.QL`
      fragment on IssueOrPullRequest {
        __typename

        ... on Issue {
          state number title bodyHTML
          author {
            login avatarUrl
            ... on User { url }
            ... on Bot { url }
          }

          ${IssueishTimelineContainer.getFragment('issue')}
        }

        ... on PullRequest {
          state number title bodyHTML
          author {
            login avatarUrl
            ... on User { url }
            ... on Bot { url }
          }

          ${IssueishTimelineContainer.getFragment('pullRequest')}
        }

        ... on UniformResourceLocatable { url }

        ... on Reactable {
          reactionGroups {
            content users { totalCount }
          }
        }
      }
    `,
  },
});
