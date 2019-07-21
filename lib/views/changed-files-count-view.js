import React from 'react';
import PropTypes from 'prop-types';
import Octicon from '../atom/octicon';
import {addEvent} from '../reporter-proxy';

export default function ChangedFilesCountView(props) {
  function handleClick() {
    addEvent('click', {package: 'github', component: 'ChangedFileCountView'});
    props.didClick();
  }

  return (
    <button className="github-ChangedFilesCount inline-block" onClick={handleClick}>
      <Octicon icon="git-commit" />
      {`Git (${props.changedFilesCount})`}
      {props.mergeConflictsPresent && <Octicon icon="alert" />}
    </button>
  );
}

ChangedFilesCountView.propTypes = {
  changedFilesCount: PropTypes.number.isRequired,
  didClick: PropTypes.func.isRequired,
  mergeConflictsPresent: PropTypes.bool.isRequired,
};
