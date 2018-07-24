import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {autobind} from '../helpers';
import FilePatchSelection from '../models/file-patch-selection';
import AtomTextEditor from '../atom/atom-text-editor';
import Marker from '../atom/marker';
import MarkerLayer from '../atom/marker-layer';
import Decoration from '../atom/decoration';
import Gutter from '../atom/gutter';
import FilePatchHeaderView from './file-patch-header-view';
import FilePatchMetaView from './file-patch-meta-view';
import HunkHeaderView from './hunk-header-view';

const executableText = {
  100644: 'non executable',
  100755: 'executable',
};

const NBSP_CHARACTER = '\u00a0';

export default class FilePatchView extends React.Component {
  static propTypes = {
    relPath: PropTypes.string.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']).isRequired,
    isPartiallyStaged: PropTypes.bool.isRequired,
    filePatch: PropTypes.object.isRequired,
    repository: PropTypes.object.isRequired,

    tooltips: PropTypes.object.isRequired,

    undoLastDiscard: PropTypes.func.isRequired,
    diveIntoMirrorPatch: PropTypes.func.isRequired,
    openFile: PropTypes.func.isRequired,
    toggleFile: PropTypes.func.isRequired,
    toggleModeChange: PropTypes.func.isRequired,
    toggleSymlinkChange: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'oldLineNumberLabel', 'newLineNumberLabel');

    this.state = {
      selection: new FilePatchSelection(this.props.filePatch.getHunks()),
      presentedFilePatch: this.props.filePatch.present(),
    };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.filePatch !== state.presentedFilePatch.getFilePatch()) {
      return {
        presentedFilePatch: props.filePatch.present(),
      };
    }

    return null;
  }

  render() {
    return (
      <div
        className={cx('github-FilePatchView', `is-${this.props.stagingStatus}`)}
        tabIndex="-1">

        <FilePatchHeaderView
          relPath={this.props.relPath}
          stagingStatus={this.props.stagingStatus}
          isPartiallyStaged={this.props.isPartiallyStaged}
          hasHunks={this.props.filePatch.getHunks().length > 0}
          hasUndoHistory={this.props.repository.hasDiscardHistory(this.props.relPath)}

          tooltips={this.props.tooltips}

          undoLastDiscard={this.props.undoLastDiscard}
          diveIntoMirrorPatch={this.props.diveIntoMirrorPatch}
          openFile={this.props.openFile}
          toggleFile={this.props.toggleFile}
        />

        <main className="github-FilePatchView-container">
          <AtomTextEditor
            text={this.state.presentedFilePatch.getText()}
            lineNumberGutterVisible={false}
            autoWidth={false}
            autoHeight={false}>
            <Gutter
              name="old-line-numbers"
              priority={1}
              className="old"
              type="line-number"
              labelFn={this.oldLineNumberLabel}
            />
            <Gutter
              name="new-line-numbers"
              priority={2}
              className="new"
              type="line-number"
              labelFn={this.newLineNumberLabel}
            />

            <Marker bufferPosition={[0, 0]}>
              <Decoration type="block">
                <Fragment>
                  {this.renderExecutableModeChangeMeta()}
                  {this.renderSymlinkChangeMeta()}
                </Fragment>
              </Decoration>
            </Marker>

            {this.renderHunkHeaders()}

            {this.renderLineDecorations(
              this.state.presentedFilePatch.getAddedBufferPositions(),
              'github-FilePatchView-line--added',
            )}
            {this.renderLineDecorations(
              this.state.presentedFilePatch.getDeletedBufferPositions(),
              'github-FilePatchView-line--deleted',
            )}
            {this.renderLineDecorations(
              this.state.presentedFilePatch.getNoNewlineBufferPositions(),
              'github-FilePatchView-line--nonewline',
            )}

          </AtomTextEditor>
        </main>

      </div>
    );
  }

  renderExecutableModeChangeMeta() {
    if (!this.props.filePatch.didChangeExecutableMode()) {
      return null;
    }

    const oldMode = this.props.filePatch.getOldMode();
    const newMode = this.props.filePatch.getNewMode();

    const attrs = this.props.stagingStatus === 'unstaged'
      ? {
        actionIcon: 'icon-move-down',
        actionText: 'Stage Mode Change',
      }
      : {
        actionIcon: 'icon-move-up',
        actionText: 'Unstage Mode Change',
      };

    return (
      <FilePatchMetaView
        title="Mode change"
        actionIcon={attrs.actionIcon}
        actionText={attrs.actionText}
        action={this.props.toggleModeChange}>
        <Fragment>
          File changed mode
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--removed">
            from {executableText[oldMode]} <code>{oldMode}</code>
          </span>
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--added">
            to {executableText[newMode]} <code>{newMode}</code>
          </span>
        </Fragment>
      </FilePatchMetaView>
    );
  }

  renderSymlinkChangeMeta() {
    if (!this.props.filePatch.hasSymlink()) {
      return null;
    }

    let detail = <div />;
    let title = '';
    const oldSymlink = this.props.filePatch.getOldSymlink();
    const newSymlink = this.props.filePatch.getNewSymlink();
    if (oldSymlink && newSymlink) {
      detail = (
        <Fragment>
          Symlink changed
          <span className={cx(
            'github-FilePatchView-metaDiff',
            'github-FilePatchView-metaDiff--fullWidth',
            'github-FilePatchView-metaDiff--removed',
          )}>
            from <code>{oldSymlink}</code>
          </span>
          <span className={cx(
            'github-FilePatchView-metaDiff',
            'github-FilePatchView-metaDiff--fullWidth',
            'github-FilePatchView-metaDiff--added',
          )}>
            to <code>{newSymlink}</code>
          </span>.
        </Fragment>
      );
      title = 'Symlink changed';
    } else if (oldSymlink && !newSymlink) {
      detail = (
        <Fragment>
          Symlink
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--removed">
            to <code>{oldSymlink}</code>
          </span>
          deleted.
        </Fragment>
      );
      title = 'Symlink deleted';
    } else if (!oldSymlink && newSymlink) {
      detail = (
        <Fragment>
          Symlink
          <span className="github-FilePatchView-metaDiff github-FilePatchView-metaDiff--added">
            to <code>{newSymlink}</code>
          </span>
          created.
        </Fragment>
      );
      title = 'Symlink created';
    } else {
      return null;
    }

    const attrs = this.props.stagingStatus === 'unstaged'
      ? {
        actionIcon: 'icon-move-down',
        actionText: 'Stage Symlink Change',
      }
      : {
        actionIcon: 'icon-move-up',
        actionText: 'Unstage Symlink Change',
      };

    return (
      <FilePatchMetaView
        title={title}
        actionIcon={attrs.actionIcon}
        actionText={attrs.actionText}
        action={this.props.toggleSymlinkChange}>
        <Fragment>
          {detail}
        </Fragment>
      </FilePatchMetaView>
    );
  }

  renderHunkHeaders() {
    const selectedHunks = this.state.selection.getSelectedHunks();
    const isHunkSelectionMode = this.state.selection.getMode() === 'hunk';
    const toggleVerb = this.props.stagingStatus === 'unstaged' ? 'Stage' : 'Unstage';

    return this.props.filePatch.getHunks().map((hunk, index) => {
      const isSelected = selectedHunks.has(hunk);
      let buttonSuffix = (isHunkSelectionMode || !isSelected) ? ' Hunk' : ' Selection';
      if (isSelected && selectedHunks.size > 1) {
        buttonSuffix += 's';
      }
      const toggleSelectionLabel = `${toggleVerb}${buttonSuffix}`;
      const discardSelectionLabel = `Discard${buttonSuffix}`;
      const bufferPosition = this.state.presentedFilePatch.getHunkStartPositions()[index];

      return (
        <Marker key={index} bufferPosition={bufferPosition}>
          <Decoration type="block">
            <HunkHeaderView
              hunk={hunk}
              isSelected={isSelected}
              stagingStatus={this.props.stagingStatus}
              selectionMode={this.state.selection.getMode()}
              toggleSelectionLabel={toggleSelectionLabel}
              discardSelectionLabel={discardSelectionLabel}

              tooltips={this.props.tooltips}

              toggleSelection={() => {}}
              discardSelection={() => {}}
            />
          </Decoration>
        </Marker>
      );
    });
  }

  renderLineDecorations(positions, lineClass) {
    return (
      <MarkerLayer>
        {positions.map((position, index) => {
          return <Marker key={index} bufferPosition={position} />;
        })}

        <Decoration type="line" className={lineClass} />
      </MarkerLayer>
    );
  }

  oldLineNumberLabel({bufferRow}) {
    return this.pad(this.state.presentedFilePatch.getOldLineNumberAt(bufferRow));
  }

  newLineNumberLabel({bufferRow}) {
    return this.pad(this.state.presentedFilePatch.getNewLineNumberAt(bufferRow));
  }

  pad(num) {
    const maxDigits = this.state.presentedFilePatch.getMaxLineNumberWidth();
    if (num === undefined || num === -1) {
      return NBSP_CHARACTER.repeat(maxDigits);
    } else {
      return NBSP_CHARACTER.repeat(maxDigits - num.toString().length) + num.toString();
    }
  }
}
