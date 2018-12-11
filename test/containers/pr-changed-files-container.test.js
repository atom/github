import React from 'react';
import {shallow, mount} from 'enzyme';

import PullRequestChangedFilesContainer from '../../lib/containers/pr-changed-files-container';

describe('PullRequestChangedFilesContainer', function() {

  function buildApp(overrideProps = {}) {
    return (
      <PullRequestChangedFilesContainer
        pullRequestURL={'https://github.com/atom/github/pull/1804'}
        {...overrideProps}
      />
    );
  }
  it('passes extra props through to PullRequestChangedFilesController', function() {
    const extraProp = Symbol('really really extra');

    const wrapper = shallow(buildApp({extraProp}));
    wrapper.instance().setState({isLoading: false});

    const controller = wrapper.find('PullRequestChangedFilesController');

    assert.strictEqual(controller.prop('extraProp'), extraProp);
  });

  it('passes itemType prop to PullRequestChangedFilesController', function() {
    const wrapper = shallow(buildApp());
    wrapper.instance().setState({isLoading: false});

    const controller = wrapper.find('PullRequestChangedFilesController');

    assert.strictEqual(controller.prop('itemType'), PullRequestChangedFilesContainer);
  });

  it('renders a loading spinner if data has not yet been fetched', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });

  it.only('builds the diff URL', function() {
    const wrapper = shallow(buildApp());
    const pullRequestURL = 'https://github.com/atom/github/pull/1804';
    const diffURL = wrapper.instance().generatePatchDiffURL(pullRequestURL);
    console.log(diffURL);
    assert.strictEqual(diffURL, 'https://patch-diff.githubusercontent.com/raw/atom/github/pull/1804.diff');
  });

  it('fetches data', function() {
  });

  it('renders an error if fetch returns a non-ok response', function() {

  });

});
