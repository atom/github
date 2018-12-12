import React from 'react';
import PropTypes from 'prop-types';

import PullRequestChangedFilesView from '../views/pr-changed-files-view';

export default class PullRequestChangedFilesController extends React.Component {
  static propTypes = {
    multiFilePatch: PropTypes.object.isRequired,
  }

  // TODO: should this function go in the Container since we aren't using an `item` for this component tree?
  destroy = () => {
    /* istanbul ignore else */
    // if (!this.isDestroyed) {
    //   this.emitter.emit('did-destroy');
    //   this.isDestroyed = true;
    // }
  }

  render() {
    return (
      <PullRequestChangedFilesView
        destroy={this.destroy}
        {...this.props}
      />
    );
  }
}
