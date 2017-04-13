import React from 'react';
import Relay from 'react-relay';
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

const prStateToIcon = {
  OPEN: 'git-pull-request',
  CLOSED: 'git-pull-request',
  MERGED: 'git-merge',
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
        avatarURL: PropTypes.string.isRequired,
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
    return (
      <div className="github-PrPaneItem">
        <div className="github-PrPaneItem-container">
          <div className="issueish-badge-and-link">
            <span className={cx('issueish-badge', 'badge', issueish.state.toLowerCase())}>
              <Octicon icon={prStateToIcon[issueish.state]} />
              {issueish.state.toLowerCase()}
            </span>
            <span className="issueish-link">
              <a href={issueish.url}>{repo.owner.login}/{repo.name}#{issueish.number}</a>
            </span>
          </div>
          <div className="issueish-avatar-and-title">
            <a className="author-avatar-link" href={issueish.author.url}>
              <img className="author-avatar" src={issueish.author.avatarURL} title={issueish.author.login} />
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
          <IssueishTimelineContainer issueish={issueish} switchToIssueish={this.props.switchToIssueish} />
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
      fragment on Issueish {
        ... on Issue {
          state
        }

        ... on PullRequest {
          state
        }

        ... on UniformResourceLocatable {
          url
        }

        number title bodyHTML
        author {
          login avatarURL
          ... on User { url }
          ... on Bot { url }
        }

        ... on Reactable {
          reactionGroups {
            content users { totalCount }
          }
        }

        ${IssueishTimelineContainer.getFragment('issueish')}
      }
    `,
  },
});
