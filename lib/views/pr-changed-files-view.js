import React from 'react';
import PropTypes from 'prop-types';

import MultiFilePatchController from '../controllers/multi-file-patch-controller';

export default class PullRequestChangedFilesView extends React.Component {

  render() {
    return (
      <div>
        <MultiFilePatchController
          multiFilePatch={this.props.multiFilePatch}
          autoHeight={false}
          {...this.props}
        />
    </div>);
  }
}
