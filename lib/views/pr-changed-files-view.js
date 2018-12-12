import React from 'react';
import PropTypes from 'prop-types';

import MultiFilePatchController from '../controllers/multi-file-patch-controller';

export default class PullRequestChangedFilesView extends React.Component {
  static propTypes = {
    localRepository: PropTypes.object.isRequired,
    multiFilePatch: PropTypes.object.isRequired,
  }

  render() {
    return (
      <MultiFilePatchController
        repository={this.props.localRepository}
        multiFilePatch={this.props.multiFilePatch}
        {...this.props}
      />);
  }
}
