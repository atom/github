import React from 'react';
import Relay from 'react-relay';
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
    switchToIssueish: React.PropTypes.func.isRequired,
    repository: React.PropTypes.shape({
      name: React.PropTypes.string.isRequired,
      owner: React.PropTypes.shape({
        login: React.PropTypes.string,
      }),
    }),
    issueish: React.PropTypes.shape({
      title: React.PropTypes.string,
      bodyHTML: React.PropTypes.string,
      number: React.PropTypes.number,
      state: React.PropTypes.oneOf([
        'OPEN', 'CLOSED', 'MERGED',
      ]).isRequired,
      author: React.PropTypes.shape({
        login: React.PropTypes.string.isRequired,
        avatarURL: React.PropTypes.string.isRequired,
        url: React.PropTypes.string.isRequired,
      }).isRequired,
      reactionGroups: React.PropTypes.arrayOf(
        React.PropTypes.shape({
          content: React.PropTypes.string.isRequired,
          users: React.PropTypes.shape({
            totalCount: React.PropTypes.number.isRequired,
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
