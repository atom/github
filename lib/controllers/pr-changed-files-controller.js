import React from 'react';
import PropTypes from 'prop-types';

import {buildMultiFilePatch} from '../models/patch';

import PullRequestChangedFilesView from '../views/pr-changed-files-view';

export default class PullRequestChangedFilesController extends React.Component {

  buildPatch() {
    // this no worky
    // how do I build a filepatch from a string?
    // also, we don't need to rebuild this on render, dawg.
    return buildMultiFilePatch(this.props.data);
  }

  render() {
    return (
      <PullRequestChangedFilesView
        multiFilePatch={this.buildPatch(this.props.data)}
        {...this.props}
      />
    );
  }
}
