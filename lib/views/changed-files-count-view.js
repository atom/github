/** @babel */
/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

export default class ChangedFilesCountView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
  }

  update(props) {
    this.props = {...this.props, ...props};
    return etch.update(this);
  }

  render() {
    const label =
      (this.props.changedFilesCount === 1)
        ? '1 file'
        : `${this.props.changedFilesCount} files`;
    return (
      <a
        ref="changedFiles"
        className="github-ChangedFilesCount inline-block icon icon-diff"
        onclick={this.props.didClick}>{label}</a>
    );
  }
}
