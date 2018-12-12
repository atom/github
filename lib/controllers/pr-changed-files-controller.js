import React from 'react';
import PropTypes from 'prop-types';

import {buildMultiFilePatch} from '../models/patch';
import {parse as parseDiff} from 'what-the-diff';

import PullRequestChangedFilesView from '../views/pr-changed-files-view';

export default class PullRequestChangedFilesController extends React.Component {
  static propTypes = {
    diff: PropTypes.string.isRequired,
  }

  buildPatch(rawDiff) {
    // also, we don't need to rebuild this on render, dawg.
    // okay, probably I should extract this to a model somehow
    // feels wrong to do it in the controller.
    const diffs = parseDiff(rawDiff);
    return buildMultiFilePatch(diffs);
  }

  // todo: should this function go in the Container since we aren't
  // using an `item` for this component tree?
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
        multiFilePatch={this.buildPatch(this.props.diff)}
        destroy={this.destroy}
        {...this.props}
      />
    );
  }
}
