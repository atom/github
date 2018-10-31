import React from 'react';
import ChangedFileContainer from '../containers/changed-file-container';

export default class CommitPreviewView extends React.Component {
  render() {

    return this.props.multiFilePatch.getFilePatches().map(filePatch => {
      const relPath = filePatch.getNewFile().getPath()
      return (
        <ChangedFileContainer
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
