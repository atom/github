import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {CompositeDisposable} from 'event-kit';

import {autobind} from '../helpers';
import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import ChangedFileController from '../controllers/changed-file-controller';
import PatchBuffer from '../models/patch/patch-buffer';

export default class ChangedFileContainer extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']),
    relPath: PropTypes.string.isRequired,
    largeDiffThreshold: PropTypes.number,

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    destroy: PropTypes.func.isRequired,
    undoLastDiscard: PropTypes.func.isRequired,
    surfaceFileAtPath: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'fetchData', 'renderWithData');

    this.patchBuffer = new PatchBuffer();
    this.lastMultiFilePatch = null;
    this.sub = new CompositeDisposable();

    this.state = {renderStatusOverride: null};
  }

  fetchData(repository) {
    const staged = this.props.stagingStatus === 'staged';

    const builderOpts = {patchBuffer: this.patchBuffer};
    if (this.state.renderStatusOverride !== null) {
      builderOpts.renderStatusOverrides = {[this.props.relPath]: this.state.renderStatusOverride};
    }
    if (this.props.largeDiffThreshold !== undefined) {
      builderOpts.largeDiffThreshold = this.props.largeDiffThreshold;
    }

    return yubikiri({
      multiFilePatch: repository.getFilePatchForPath(this.props.relPath, {staged, builder: builderOpts}),
      isPartiallyStaged: repository.isPartiallyStaged(this.props.relPath),
      hasUndoHistory: repository.hasDiscardHistory(this.props.relPath),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchData}>
        {this.renderWithData}
      </ObserveModel>
    );
  }

  renderWithData(data) {
    const currentMultiFilePatch = data && data.multiFilePatch;
    if (currentMultiFilePatch !== this.lastMultiFilePatch) {
      this.sub.dispose();
      if (currentMultiFilePatch) {
        // Keep this component's renderStatusOverride synchronized with the FilePatch we're rendering
        this.sub = new CompositeDisposable(
          ...currentMultiFilePatch.getFilePatches().map(fp => fp.onDidChangeRenderStatus(() => {
            this.setState({renderStatusOverride: fp.getRenderStatus()});
          })),
        );
      }
      this.lastMultiFilePatch = currentMultiFilePatch;
    }

    if (this.props.repository.isLoading() || data === null) {
      return <LoadingView />;
    }

    return (
      <ChangedFileController
        {...data}
        {...this.props}
      />
    );
  }

  componentWillUnmount() {
    this.sub.dispose();
  }
}
