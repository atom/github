import React from 'react';
import {shallow} from 'enzyme';

import {multiFilePatchBuilder} from '../builder/patch';
import patch from '../fixtures/diffs/patch';
import PullRequestChangedFilesContainer from '../../lib/containers/pr-changed-files-container';
import IssueishDetailItem from '../../lib/items/issueish-detail-item';


describe.only('PullRequestChangedFilesContainer', function() {
  let diffResponse;

  function buildApp(overrideProps = {}) {
    return (
      <PullRequestChangedFilesContainer
        owner="atom"
        repo="github"
        number={1804}
        token="1234"
        host="github.com"
        itemType={IssueishDetailItem}
        {...overrideProps}
      />
    );
  }

  function setDiffResponse(body) {
    diffResponse = new window.Response(body, {
      status: 200,
      headers: {'Content-type': 'text/plain'},
    });
  }

  beforeEach(function() {
    setDiffResponse(patch);
    sinon.stub(window, 'fetch').callsFake(() => Promise.resolve(diffResponse));
  });

  it('renders a loading spinner if data has not yet been fetched', function() {
    const wrapper = shallow(buildApp());
    assert.isTrue(wrapper.find('LoadingView').exists());
  });

  it.only('passes extra props through to PullRequestChangedFilesController', async function() {
    const extraProp = Symbol('really really extra');

    const wrapper = shallow(buildApp({extraProp}));
    await assert.async.isTrue(wrapper.update().find('PullRequestChangedFilesController').exists());

    const controller = wrapper.find('PullRequestChangedFilesController');
    assert.strictEqual(controller.prop('extraProp'), extraProp);
  });

  it('passes itemType prop to PullRequestChangedFilesController', async function() {
    const wrapper = shallow(buildApp());
    await assert.async.isTrue(wrapper.update().find('PullRequestChangedFilesController').exists());

    const controller = wrapper.find('PullRequestChangedFilesController');
    assert.strictEqual(controller.prop('itemType'), PullRequestChangedFilesContainer);
  });

  it('builds the diff URL', function() {
    const wrapper = shallow(buildApp({
      owner: 'smashwilson',
      repo: 'pushbot',
      number: 12,
      host: 'github.com',
    }));

    const diffURL = wrapper.instance().getDiffURL();
    assert.strictEqual(diffURL, 'https://api.github.com/repos/smashwilson/pushbot/pulls/12');
  });

  it('passes loaded diff data through to the controller', async function() {
    const wrapper = shallow(buildApp({
      token: '4321',
    }));
    await assert.async.isTrue(wrapper.update().find('PullRequestChangedFilesController').exists());

    const controller = wrapper.find('PullRequestChangedFilesController');
    assert.strictEqual(controller.prop('patch'), patch);

    assert.deepEqual(window.fetch.lastCall.args, [
      'https://api.github.com/repos/atom/github/pulls/1804',
      {
        headers: {
          Accept: 'application/vnd.github.v3.diff',
          Authorization: 'bearer 4321',
        },
      },
    ]);
  });

  it('renders an error if fetch returns a non-ok response');
});
