import React from 'react';

export default class BranchView extends React.Component {
  static propTypes = {
    branchName: React.PropTypes.string,
  }

  render() {
    return (
      <div className="github-branch inline-block" ref={e => { this.element = e; }}>
        <span className="icon icon-git-branch" />
        <span className="branch-label">{this.props.branchName}</span>
      </div>
    );
  }
}
