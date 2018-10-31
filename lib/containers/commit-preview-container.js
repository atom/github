import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';

import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import MultiFilePatchController from '../controllers/multi-file-patch-controller';

export default class CommitPreviewContainer extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
  }

  fetchData = repository => {
    return yubikiri({
      multiFilePatch: repository.getStagedChangesPatch(),
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
      <MultiFilePatchController
        useEditorAutoHeight={true}
        {...data}
        {...this.props}
      />
    );
  }
}
