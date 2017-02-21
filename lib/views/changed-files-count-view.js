import React from 'react';

export default class ChangedFilesCountView extends React.Component {
  static propTypes = {
    changedFilesCount: React.PropTypes.number,
    didClick: React.PropTypes.func,
  };

  static defaultProps = {
    changedFilesCount: 0,
    didClick: () => {},
  };

  render() {
    const label =
      (this.props.changedFilesCount === 1)
        ? '1 file'
        : `${this.props.changedFilesCount} files`;
    return (
      <a
        ref="changedFiles"
        className="github-ChangedFilesCount inline-block icon icon-diff"
        onClick={this.props.didClick}>{label}</a>
    );
  }
}
