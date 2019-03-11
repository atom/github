import PropTypes from 'prop-types';
import React from 'react';
import cx from 'classnames';

const reactionTypeToEmoji = {
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  LAUGH: '😆',
  HOORAY: '🎉',
  CONFUSED: '😕',
  HEART: '❤️',
  ROCKET: '🚀',
  EYES: '👀',
};

export default class EmojiReactionsView extends React.Component {
  static propTypes = {
    reactionGroups: PropTypes.arrayOf(
      PropTypes.shape({
        content: PropTypes.string.isRequired,
        users: PropTypes.shape({
          totalCount: PropTypes.number.isRequired,
        }).isRequired,
      }),
    ).isRequired,
  }

  render() {
    return (
      <div className="github-IssueishDetailView-reactions">
        {this.props.reactionGroups.map(group => {
          const emoji = reactionTypeToEmoji[group.content];
          if (!emoji) {
            return null;
          }
          return (
            group.users.totalCount > 0
              ? <span className={cx('github-IssueishDetailView-reactionsGroup', group.content.toLowerCase())}
                key={group.content}>
                {reactionTypeToEmoji[group.content]} &nbsp; {group.users.totalCount}
              </span>
              : null);
        })}
      </div>
    );
  }
}
