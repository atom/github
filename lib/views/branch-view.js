import React from 'react';
import cx from 'classnames';

export default class BranchView extends React.Component {
  static propTypes = {
    currentBranch: React.PropTypes.shape({
      name: React.PropTypes.string,
      isDetached: React.PropTypes.bool,
    }),
  }

  render() {
    const classNames = cx(
      'github-branch', 'inline-block', {'github-branch-detached': this.props.currentBranch.isDetached},
    );

    return (
      <div className={classNames} ref={e => { this.element = e; }}>
        <span className="icon icon-git-branch" />
        <span className="branch-label">{this.props.currentBranch.name}</span>
      </div>
    );
  }
}
