import React from 'react';

import {MultiFilePatchPropType} from '../prop-types';
import FilePatchController from '../controllers/file-patch-controller';
import {autobind} from '../helpers';

export default class MultiFilePatchController extends React.Component {
  static propTypes = {
    multiFilePatch: MultiFilePatchPropType.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'handleMouseDown');
    const firstFilePatch = this.props.multiFilePatch.getFilePatches()[0];

    this.state = {activeFilePatch: firstFilePatch ? firstFilePatch.getPath() : null};
  }

  handleMouseDown(relPath) {
    this.setState({activeFilePatch: relPath});
  }

  render() {
    return this.props.multiFilePatch.getFilePatches().map(filePatch => {
      const relPath = filePatch.getPath();
      const isActive = this.state.activeFilePatch === relPath;
      return (
        <FilePatchController
          key={relPath}
          relPath={relPath}
          stagingStatus={'staged'}
          {...this.props}
          filePatch={filePatch}
          handleMouseDown={this.handleMouseDown}
          isActive={isActive}
        />
      );
    });
  }
}
