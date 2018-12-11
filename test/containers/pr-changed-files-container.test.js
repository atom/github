import React from 'react';
import {shallow} from 'enzyme';

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

  it('passes data prop through to PullRequestChangedFilesContainer', function() {
    const fakeData = 'some really swell diff';
    const wrapper = shallow(buildApp());
    wrapper.instance().setState({isLoading: false});
    wrapper.instance().setState({data: fakeData});

    const controller = wrapper.find('PullRequestChangedFilesController');

    assert.strictEqual(controller.prop('data'), fakeData);
  });


  it('renders a loading spinner if data has not yet been fetched', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });

  it('builds the diff URL', function() {
    const wrapper = shallow(buildApp());
    const pullRequestURL = 'https://github.com/atom/github/pull/1804';
    const diffURL = wrapper.instance().generatePatchDiffURL(pullRequestURL);
    assert.strictEqual(diffURL, 'https://patch-diff.githubusercontent.com/raw/atom/github/pull/1804.diff');
  });

  it('fetches data and sets it in state', async function() {
    const stubbedFetch = sinon.stub(window, 'fetch');

    window.fetch.returns(Promise.resolve(mockApiResponse()));
    function mockApiResponse(body = 'oh em gee') {
      return new window.Response(JSON.stringify(body), {
        status: 200,
        headers: {'Content-type': 'text/plain'},
      });
    }
    const wrapper = shallow(buildApp());
    await assert.async.isFalse(wrapper.instance().state.isLoading);
    assert.strictEqual(stubbedFetch.callCount, 1);

    assert.deepEqual(stubbedFetch.lastCall.args, ['https://patch-diff.githubusercontent.com/raw/atom/github/pull/1804.diff']);
    assert.strictEqual(wrapper.instance().state.data, '"oh em gee"');
  });

  it('renders an error if fetch returns a non-ok response', function() {

  });

});
