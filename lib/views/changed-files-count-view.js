import React from 'react';
import PropTypes from 'prop-types';

import Octicon from '../atom/octicon';
import Tooltip from '../atom/tooltip';

import RefHolder from '../models/ref-holder';

import {addEvent} from '../reporter-proxy';

export const tooltipMessage = 'Click to open the Git pane and commit your changes';

export default class ChangedFilesCountView extends React.Component {
  static propTypes = {
    changedFilesCount: PropTypes.number.isRequired,
    didClick: PropTypes.func.isRequired,
    mergeConflictsPresent: PropTypes.bool,
    tooltips: PropTypes.object.isRequired,
  }

  static defaultProps = {
    changedFilesCount: 0,
    mergeConflictsPresent: false,
    tooltips: {},
    didClick: () => {},
  }

  constructor(props) {
    super(props);
    this.refTileNode = new RefHolder();
  }

  handleClick = () => {
    addEvent('click', {package: 'github', component: 'ChangedFileCountView'});
    this.props.didClick();
  }

  render() {
    return (
      <span ref={this.refTileNode.setter}>
        <button
          ref="changedFiles"
          className="github-ChangedFilesCount inline-block"
          onClick={this.handleClick}>
          <Octicon icon="git-commit" />
          {`Git (${this.props.changedFilesCount})`}
          {this.props.mergeConflictsPresent && <Octicon icon="alert" />}
        </button>
        <Tooltip
          key="tooltip"
          manager={this.props.tooltips}
          target={this.refTileNode}
          title={`<div style="text-align: left; line-height: 1.2em;">${tooltipMessage}</div>`}
          showDelay={atom.tooltips.hoverDefaults.delay.show}
          hideDelay={atom.tooltips.hoverDefaults.delay.hide}
        />
      </span>
    );
  }
}
