import React from 'react';
import PropTypes from 'prop-types';

import MultiFilePatchController from './multi-file-patch-controller';

export default class CommitDetailController extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    destroy: PropTypes.func.isRequired,
    commit: PropTypes.object.isRequired,
  }

  render() {
    return (
      <div>
        <MultiFilePatchController
          multiFilePatch={this.props.commit.getMultiFileDiff()}
          {...this.props}
        />
      </div>
    );
  }
}
