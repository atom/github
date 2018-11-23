import path from 'path';

import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import RefHolder from '../models/ref-holder';
import ChangedFileItem from '../items/changed-file-item';
import CommitPreviewItem from '../items/commit-preview-item';
import CommitDetailItem from '../items/commit-detail-item';

export default class FilePatchHeaderView extends React.Component {
  static propTypes = {
    relPath: PropTypes.string.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']),
    isPartiallyStaged: PropTypes.bool,
    hasHunks: PropTypes.bool.isRequired,
    hasUndoHistory: PropTypes.bool,
    hasMultipleFileSelections: PropTypes.bool.isRequired,

    tooltips: PropTypes.object.isRequired,

    undoLastDiscard: PropTypes.func.isRequired,
    diveIntoMirrorPatch: PropTypes.func.isRequired,
    openFile: PropTypes.func.isRequired,
    toggleFile: PropTypes.func.isRequired,

    itemType: PropTypes.oneOf([ChangedFileItem, CommitPreviewItem, CommitDetailItem]).isRequired,
    disableStageUnstage: PropTypes.bool,
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
    if (this.props.itemType === ChangedFileItem) {
      const status = this.props.stagingStatus;
      return (
        <span>{status[0].toUpperCase()}{status.slice(1)} Changes for {this.renderPath()}</span>
      );
    } else {
      return this.renderPath();
    }
  }

  renderPath() {
    const dirname = path.dirname(this.props.relPath);
    const basename = path.basename(this.props.relPath);

    if (dirname === '.') {
      return <span className="gitub-FilePatchHeaderView-basename">{basename}</span>;
    } else {
      return (
        <span>
          {dirname}{path.sep}<span className="gitub-FilePatchHeaderView-basename">{basename}</span>
        </span>
      );
    }
  }

  renderButtonGroup() {
    return (
      <span className="btn-group">
        {!this.props.disableStageUnstage && this.renderUndoDiscardButton()}
        {!this.props.disableStageUnstage && this.renderMirrorPatchButton()}
        {this.renderOpenFileButton()}
        {!this.props.disableStageUnstage && this.renderToggleFileButton()}
      </span>
    );
  }

  renderUndoDiscardButton() {
    const unstagedChangedFileItem = this.props.itemType === ChangedFileItem && this.props.stagingStatus === 'unstaged';
    if (unstagedChangedFileItem && this.props.hasUndoHistory) {
      return (
        <button className="btn icon icon-history" onClick={this.props.undoLastDiscard}>
        Undo Discard
        </button>
      );
    } else {
      return null;
    }
  }

  renderMirrorPatchButton() {
    if (!this.props.isPartiallyStaged && this.props.hasHunks) {
      return null;
    }

    const attrs = this.props.stagingStatus === 'unstaged'
      ? {
        iconClass: 'icon-tasklist',
        buttonText: 'View Staged',
      }
      : {
        iconClass: 'icon-list-unordered',
        buttonText: 'View Unstaged',
      };

    return (
      <Fragment>
        <button
          ref={this.refMirrorButton.setter}
          className={cx('btn', 'icon', attrs.iconClass)}
          onClick={this.props.diveIntoMirrorPatch}>
          {attrs.buttonText}
        </button>
      </Fragment>
    );
  }

  renderOpenFileButton() {
    let buttonText = 'Jump To File';
    if (this.props.hasMultipleFileSelections) {
      buttonText += 's';
    }

    return (
      <Fragment>
        <button
          ref={this.refOpenFileButton.setter}
          className="btn icon icon-code github-FilePatchHeaderView-jumpToFileButton"
          onClick={this.props.openFile}>
          {buttonText}
        </button>
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
