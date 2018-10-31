import React from 'react';

import {MultiFilePatchPropType} from '../prop-types';
import FilePatchController from '../controllers/file-patch-controller';

export default class MultiFilePatchController extends React.Component {
  static propTypes = {
    multiFilePatch: MultiFilePatchPropType.isRequired,
  }

  render() {
    return this.props.multiFilePatch.getFilePatches().map(filePatch => {
      const relPath = filePatch.getPath();
      return (
        <FilePatchController
          key={relPath}
          relPath={relPath}
          stagingStatus={'staged'}
          {...this.props}
          filePatch={filePatch}
        />
      );
    });
  }
}
