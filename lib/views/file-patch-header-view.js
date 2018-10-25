import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import RefHolder from '../models/ref-holder';
import Tooltip from '../atom/tooltip';

export default class FilePatchHeaderView extends React.Component {
  static propTypes = {
    relPath: PropTypes.string.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']).isRequired,
    isPartiallyStaged: PropTypes.bool.isRequired,
    hasHunks: PropTypes.bool.isRequired,
    hasUndoHistory: PropTypes.bool.isRequired,

    tooltips: PropTypes.object.isRequired,

    undoLastDiscard: PropTypes.func.isRequired,
    diveIntoMirrorPatch: PropTypes.func.isRequired,
    openFile: PropTypes.func.isRequired,
    toggleFile: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.refMirrorButton = new RefHolder();
    this.refOpenFileButton = new RefHolder();
  }

  render() {
    return (
      <header className="github-FilePatchView-header">
        <span className="github-FilePatchView-title">
          {this.renderTitle()}
        </span>
        {this.renderButtonGroup()}
      </header>
    );
  }

  renderTitle() {
    const status = this.props.stagingStatus;
    return `${status[0].toUpperCase()}${status.slice(1)} Changes for ${this.props.relPath}`;
  }

  renderButtonGroup() {
    return (
      <span className="btn-group">
        {this.renderUndoDiscardButton()}
        {this.renderMirrorPatchButton()}
        {this.renderOpenFileButton()}
        {this.renderToggleFileButton()}
      </span>
    );
  }

  renderUndoDiscardButton() {
    if (!this.props.hasUndoHistory || this.props.stagingStatus !== 'unstaged') {
      return null;
    }

    return (
      <button className="btn icon icon-history" onClick={this.props.undoLastDiscard}>
        Undo Discard
      </button>
    );
  }

  renderMirrorPatchButton() {
    if (!this.props.isPartiallyStaged && this.props.hasHunks) {
      return null;
    }

    const attrs = this.props.stagingStatus === 'unstaged'
      ? {
        iconClass: 'icon-tasklist',
        tooltipText: 'View staged changes',
      }
      : {
        iconClass: 'icon-list-unordered',
        tooltipText: 'View unstaged changes',
      };

    return (
      <Fragment>
        <button
          ref={this.refMirrorButton.setter}
          className={cx('btn', 'icon', attrs.iconClass)}
          onClick={this.props.diveIntoMirrorPatch}
        />
        <Tooltip
          manager={this.props.tooltips}
          target={this.refMirrorButton}
          title={attrs.tooltipText}
        />
      </Fragment>
    );
  }

  renderOpenFileButton() {
    return (
      <Fragment>
        <button
          ref={this.refOpenFileButton.setter}
          className="btn icon icon-code"
          onClick={this.props.openFile}
        />
        <Tooltip
          manager={this.props.tooltips}
          target={this.refOpenFileButton}
          title="Open File"
        />
      </Fragment>
    );
  }

  renderToggleFileButton() {
    const attrs = this.props.stagingStatus === 'unstaged'
      ? {
        buttonClass: 'icon-move-down',
        buttonText: 'Stage File',
      }
      : {
        buttonClass: 'icon-move-up',
        buttonText: 'Unstage File',
      };

    return (
      <button className={cx('btn', 'icon', attrs.buttonClass)} onClick={this.props.toggleFile}>
        {attrs.buttonText}
      </button>
    );
  }
}
