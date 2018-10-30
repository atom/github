import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';

import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import CommitPreviewController from '../controllers/commit-preview-controller';
import MultiFilePatch from '../models/patch/multi-file-patch';

export default class CommitPreviewContainer extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
  }

  fetchData = repository => {
    return yubikiri({
      multiFilePatch: new MultiFilePatch([]),
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
    if (this.props.repository.isLoading() || data === null) {
      return <LoadingView />;
    }

    return (
      <CommitPreviewController
        {...data}
        {...this.props}
      />
    );
  }
}
