import React from 'react';
import PropTypes from 'prop-types';

export default class ChangedFilesCountView extends React.Component {
  static propTypes = {
    changedFilesCount: PropTypes.number.isRequired,
    didClick: PropTypes.func.isRequired,
  }

  static defaultProps = {
    changedFilesCount: 0,
    didClick: () => {},
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
        onClick={this.props.didClick}>{label}</a>
    );
  }
}
