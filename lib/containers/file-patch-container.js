import React from 'react';
import PropTypes from 'prop-types';
import yubikiri from 'yubikiri';

import {autobind} from '../helpers';
import ObserveModel from '../views/observe-model';
import LoadingView from '../views/loading-view';
import FilePatchController from '../controllers/file-patch-controller';

export default class FilePatchContainer extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']),
    relPath: PropTypes.string.isRequired,

    tooltips: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    autobind(this, 'fetchData', 'renderWithData');
  }

  fetchData(repository) {
    return yubikiri({
      filePatch: repository.getFilePatchForPath(this.props.relPath, {staged: this.props.stagingStatus === 'staged'}),
      isPartiallyStaged: repository.isPartiallyStaged(this.props.relPath),
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
    if (data === null) {
      return <LoadingView />;
    }

    if (data.filePatch === null) {
      return this.renderEmptyPatchMessage();
    }

    return (
      <FilePatchController
        isPartiallyStaged={data.isPartiallyStaged}
        filePatch={data.filePatch}
        {...this.props}
      />
    );
  }

  renderEmptyPatchMessage() {
    return (
      <div className="is-blank">
        <span className="icon icon-info">No changes to display</span>
      </div>
    );
  }
}
