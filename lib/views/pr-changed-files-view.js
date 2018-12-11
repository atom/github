import React from 'react';
import PropTypes from 'prop-types';

import MultiFilePatchController from '../controllers/multi-file-patch-controller';

export default class PullRequestChangedFilesView extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <MultiFilePatchController
        multiFilePatch={this.props.multiFilePatch}
        {...this.props}
      />);
  }
}
