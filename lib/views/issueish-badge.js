import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Octicon from '../atom/octicon';

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

export default function IssueishBadge({type, state, ...others}) {
  const icons = typeAndStateToIcon[type] || {};
  const icon = icons[state] || '';

  const {className, ...otherProps} = others;
  return (
    <span className={cx(className, 'github-IssueishBadge', state.toLowerCase())} {...otherProps}>
      <Octicon icon={icon} />
      {state.toLowerCase()}
    </span>
  );
}

IssueishBadge.propTypes = {
  type: PropTypes.oneOf([
    'Issue', 'PullRequest',
  ]).isRequired,
  state: PropTypes.oneOf([
    'OPEN', 'CLOSED', 'MERGED',
  ]).isRequired,
};
