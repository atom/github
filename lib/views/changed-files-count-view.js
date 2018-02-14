import React from 'react';
import PropTypes from 'prop-types';
import Octicon from './octicon';

export default class ChangedFilesCountView extends React.Component {
  static propTypes = {
    changedFilesCount: PropTypes.number.isRequired,
    didClick: PropTypes.func.isRequired,
    mergeConflictsPresent: PropTypes.bool,
  }

  static defaultProps = {
    changedFilesCount: 0,
    mergeConflictsPresent: false,
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
        className="github-ChangedFilesCount inline-block"
        onClick={this.props.didClick}>
        <Octicon icon="diff" />
        {label}
        {this.props.mergeConflictsPresent && <Octicon icon="alert" />}
      </a>
    );
  }
}
