import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';
import {CompositeDisposable} from 'event-kit';

import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import CommitPreviewController from '../controllers/commit-preview-controller';

export default class CommitPreviewContainer extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    largeDiffThreshold: PropTypes.number,
  }

  constructor(props) {
    super(props);

    this.lastMultiFilePatch = null;
    this.sub = new CompositeDisposable();

    this.state = {renderStatusOverrides: {}};
  }

  fetchData = repository => {
    const builder = {renderStatusOverrides: this.state.renderStatusOverrides};

    if (this.props.largeDiffThreshold !== undefined) {
      builder.largeDiffThreshold = this.props.largeDiffThreshold;
    }

    return yubikiri({
      multiFilePatch: repository.getStagedChangesPatch({builder}),
    });
  }

  render() {
    return (
      <ObserveModel model={this.props.repository} fetchData={this.fetchData}>
        {this.renderResult}
      </ObserveModel>
    );
  }

  renderResult = data => {
    const currentMultiFilePatch = data && data.multiFilePatch;
    if (currentMultiFilePatch !== this.lastMultiFilePatch) {
      this.sub.dispose();
      if (currentMultiFilePatch) {
        this.sub = new CompositeDisposable(
          ...currentMultiFilePatch.getFilePatches().map(fp => fp.onDidChangeRenderStatus(() => {
            this.setState(prevState => {
              return {
                renderStatusOverrides: {
                  ...prevState.renderStatusOverrides,
                  [fp.getPath()]: fp.getRenderStatus(),
                },
              };
            });
          })),
        );
      }
      this.lastMultiFilePatch = currentMultiFilePatch;
    }

    if (this.props.repository.isLoading() || data === null) {
      return <LoadingView />;
    }

    return (
      <CommitPreviewController
        stagingStatus={'staged'}
        {...data}
        {...this.props}
      />
    );
  }
}
