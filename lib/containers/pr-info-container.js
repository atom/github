import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {autobind} from 'core-decorators';

import Octicon from '../views/octicon';

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

export class PrInfo extends React.Component {
  static propTypes = {
    pinnedByUrl: PropTypes.bool,
    onUnpinPr: PropTypes.func,
    pullRequest: PropTypes.shape({
      title: PropTypes.string,
      bodyHTML: PropTypes.string,
      number: PropTypes.number,
      repository: PropTypes.shape({
        name: PropTypes.string.isRequired,
        owner: PropTypes.shape({
          login: PropTypes.string,
        }),
      }),
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
    const pr = this.props.pullRequest;
    const repo = pr.repository;
    return (
      <div className="github-PrInfo">
        <div className="pr-badge-and-link">
          <span className={cx('pr-badge', 'badge', pr.state.toLowerCase())}>
            <Octicon icon={prStateToIcon[pr.state]} />
            {pr.state.toLowerCase()}
          </span>
          <span className="pr-link">
            <a className="pane-item-link" href={pr.url}>
              {repo.owner.login}/{repo.name}#{pr.number}
            </a>
          </span>
          {this.props.pinnedByUrl && <span onClick={this.handleUnpinClick}>Pinned</span>}
        </div>
        <div className="pr-avatar-and-title">
          <a className="author-avatar-link" href={pr.author.url}>
            <img className="author-avatar" src={pr.author.avatarURL} title={pr.author.login} />
          </a>
          <h3 className="pr-title">{pr.title}</h3>
        </div>
        <div className="conversation" onClick={this.handleClickPrLink}>
          <Octicon icon="comment-discussion" />
          Conversation
        </div>
        <div className="commit-count">
          <Octicon icon="git-commit" />
          Commits <span className="count-number">{pr.commits.totalCount}</span>
        </div>
        <div className="labels">
          {pr.labels.edges.map(({node}) => {
            const {name, color} = node;
            const hex = `#${color}`;
            return (
              <span key={name} className="label" style={{background: hex}}>{name}</span>
            );
          })}
        </div>
        <div className="reactions">
          {pr.reactionGroups.map(group => (
            group.users.totalCount > 0
            ? <span className={cx('reaction-group', group.content.toLowerCase())} key={group.content}>
              {reactionTypeToEmoji[group.content]} &nbsp; {group.users.totalCount}
            </span>
            : null
          ))}
        </div>
      </div>
    );
  }

  @autobind
  handleClickPrLink(event) {
    event.nativeEvent.preventDefault();
    event.nativeEvent.stopPropagation();
    const pr = this.props.pullRequest;
    const repo = pr.repository;
    atom.workspace.open(`atom-github://issueish/https://api.github.com/${repo.owner.login}/${repo.name}/${pr.number}`);
  }

  @autobind
  handleUnpinClick(event) {
    this.props.onUnpinPr && this.props.onUnpinPr();
    console.log('UNPIN! by deleting from config');
  }
}

export default Relay.createContainer(PrInfo, {
  fragments: {
    pullRequest: () => Relay.QL`
      fragment on PullRequest {
        url number title state createdAt
        author {
          login avatarURL
          ... on User { url }
          ... on Bot { url }
        }
        repository { name owner { login } }
        reactionGroups {
          content users { totalCount }
        }
        commits { totalCount }
        labels(first:100) {
          edges {
            node {
              name color
            }
          }
        }
      }
    `,
  },
});
