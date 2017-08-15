import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import Octicon from './octicon';

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

  return (
    <span className={cx('issueish-badge', 'badge', state.toLowerCase(), others.className)}>
      <Octicon icon={icon} />
      {state.toLowerCase()}
    </span>
  );
}

IssueishBadge.propTypes = {
  type: PropTypes.oneOf([
    'Issue', 'PullRequest',
  ]),
  state: PropTypes.oneOf([
    'OPEN', 'CLOSED', 'MERGED',
  ]),
};
