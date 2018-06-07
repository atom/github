import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import FilePatchSelection from '../models/file-patch-selection';
import AtomTextEditor from '../atom/atom-text-editor';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';
import FilePatchHeaderView from './file-patch-header-view';

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
  }

  constructor(props) {
    super(props);

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
          <AtomTextEditor text={this.state.presentedFilePatch.getText()}>
            <Marker bufferPosition={[0, 0]}>
              <Decoration type="block">
              </Decoration>
            </Marker>
          </AtomTextEditor>
        </main>

      </div>
    );
  }
}
