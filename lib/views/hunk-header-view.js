import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import RefHolder from '../models/ref-holder';
import Tooltip from '../atom/tooltip';

export default class HunkHeaderView extends React.Component {
  static propTypes = {
    hunk: PropTypes.object.isRequired,
    isSelected: PropTypes.bool.isRequired,
    stagingStatus: PropTypes.oneOf(['unstaged', 'staged']).isRequired,
    selectionMode: PropTypes.oneOf(['hunk', 'line']).isRequired,
    toggleSelectionLabel: PropTypes.string.isRequired,
    discardSelectionLabel: PropTypes.string.isRequired,

    tooltips: PropTypes.object.isRequired,

    toggleSelection: PropTypes.func.isRequired,
    discardSelection: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.refDiscardButton = new RefHolder();
  }

  render() {
    const conditional = {
      'is-selected': this.props.isSelected,
      'is-hunkMode': this.props.selectionMode === 'hunk',
    };

    return (
      <div className={cx('github-HunkHeaderView', conditional)}>
        <span className="github-HunkHeaderView-title">
          {this.props.hunk.getHeader().trim()} {this.props.hunk.getSectionHeading().trim()}
        </span>
        <button className="github-HunkHeaderView-stageButton" onClick={this.props.toggleSelection}>
          {this.props.toggleSelectionLabel}
        </button>
        {this.props.stagingStatus === 'unstaged' && (
          <Fragment>
            <button
              ref={this.refDiscardButton.setter}
              className="icon-trashcan github-HunkHeaderView-discardButton"
              onClick={this.props.discardSelection}
            />
            <Tooltip
              manager={this.props.tooltips}
              target={this.refDiscardButton}
              title={this.props.discardSelectionLabel}
            />
          </Fragment>
        )}
      </div>
    );
  }
}
