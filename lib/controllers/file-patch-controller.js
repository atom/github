import React from 'react';

import FilePatchView from '../views/file-patch-view';

export default class FilePatchController extends React.Component {
  render() {
    return <FilePatchView {...this.props} />;
  }
}
