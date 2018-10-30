import React from 'react';

import {MultiFilePatchPropType} from '../prop-types';
import CommitPreviewView from '../views/commit-preview-view';

export default class CommitPreviewController extends React.Component {
  static propTypes = {
    multiFilePatch: MultiFilePatchPropType.isRequired,
  }

  render() {
    return (
      <CommitPreviewView
        {...this.props}
      />
    );
  }
}
