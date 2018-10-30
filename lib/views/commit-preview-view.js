import React from 'react';
import FilePatchContainer from '../containers/file-patch-container';

export default class CommitPreviewView extends React.Component {
  render() {

    return this.props.multiFilePatch.getFilePatches().map(filePatch => {
      const relPath = filePatch.getNewFile().getPath()
      return (
        <FilePatchContainer
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
