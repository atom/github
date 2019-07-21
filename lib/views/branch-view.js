import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {BranchPropType} from '../prop-types';

export default function BranchView({currentBranch, refRoot}) {
  const classNames = cx(
    'github-branch', 'inline-block', {'github-branch-detached': currentBranch.isDetached()},
  );

  return (
    <div className={classNames} ref={refRoot}>
      <span className="icon icon-git-branch" />
      <span className="branch-label">{currentBranch.getName()}</span>
    </div>
  );
}

BranchView.propTypes = {
  currentBranch: BranchPropType.isRequired,
  refRoot: PropTypes.func.isRequired,
};
