/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

export default class BranchView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
  }

  update(props) {
    this.props = {...this.props, ...props};
    return etch.update(this);
  }

  render() {
    return (
      <div className="github-branch inline-block">
        <span className="icon icon-git-branch" />
        <span className="branch-label">{this.props.branchName}</span>
      </div>
    );
  }
}
