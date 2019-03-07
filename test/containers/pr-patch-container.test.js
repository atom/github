import React from 'react';
import {shallow} from 'enzyme';
import path from 'path';

import PullRequestPatchContainer from '../../lib/containers/pr-patch-container';
import {rawDiff, rawDiffWithPathPrefix, rawAdditionDiff, rawDeletionDiff} from '../fixtures/diffs/raw-diff';
import {getEndpoint} from '../../lib/models/endpoint';

describe('PullRequestPatchContainer', function() {
  function buildApp(override = {}) {
    const props = {
      owner: 'atom',
      repo: 'github',
      number: 1995,
      endpoint: getEndpoint('github.com'),
      token: '1234',
      refetch: false,
      children: () => null,
      ...override,
    };

    return <PullRequestPatchContainer {...props} />;
  }

  function setDiffResponse(body, options) {
    const opts = {
      status: 200,
      statusText: 'OK',
      ...options,
    };

    return sinon.stub(window, 'fetch').callsFake(() => Promise.resolve(new window.Response(body, {
      status: opts.status,
      statusText: opts.statusText,
      headers: {'Content-type': 'text/plain'},
    })));
  }

  describe('while the patch is loading', function() {
    it('renders its child prop with nulls', function() {
      setDiffResponse(rawDiff);

      const children = sinon.spy();
      shallow(buildApp({children}));
      assert.isTrue(children.calledWith(null, null));
    });
  });

  describe('when the patch has been fetched successfully', function() {
    it('builds the correct request', async function() {
      const stub = setDiffResponse(rawDiff);
      const children = sinon.spy();
      shallow(buildApp({
        owner: 'smashwilson',
        repo: 'pushbot',
        number: 12,
        endpoint: getEndpoint('github.com'),
        token: 'swordfish',
        children,
      }));

      assert.isTrue(stub.calledWith(
        'https://api.github.com/repos/smashwilson/pushbot/pulls/12',
        {
          headers: {
            Accept: 'application/vnd.github.v3.diff',
            Authorization: 'bearer swordfish',
          },
        },
      ));

      await assert.async.strictEqual(children.callCount, 2);

      const [error, mfp] = children.lastCall.args;
      assert.isNull(error);

      assert.lengthOf(mfp.getFilePatches(), 1);
      const [fp] = mfp.getFilePatches();
      assert.strictEqual(fp.getOldFile().getPath(), 'file.txt');
      assert.strictEqual(fp.getNewFile().getPath(), 'file.txt');
      assert.lengthOf(fp.getHunks(), 1);
      const [h] = fp.getHunks();
      assert.strictEqual(h.getSectionHeading(), 'class Thing {');
    });

    it('modifies the patch to exclude a/ and b/ prefixes on file paths', async function() {
      setDiffResponse(rawDiffWithPathPrefix);

      const children = sinon.spy();
      shallow(buildApp({children}));

      await assert.async.strictEqual(children.callCount, 2);
      const [error, mfp] = children.lastCall.args;

      assert.isNull(error);
      assert.lengthOf(mfp.getFilePatches(), 1);
      const [fp] = mfp.getFilePatches();
      assert.notMatch(fp.getOldFile().getPath(), /^[a|b]\//);
      assert.notMatch(fp.getNewFile().getPath(), /^[a|b]\//);
    });

    it('excludes a/ prefix on the old file of a deletion', async function() {
      setDiffResponse(rawDeletionDiff);

      const children = sinon.spy();
      shallow(buildApp({children}));

      await assert.async.strictEqual(children.callCount, 2);
      const [error, mfp] = children.lastCall.args;

      assert.isNull(error);
      assert.lengthOf(mfp.getFilePatches(), 1);
      const [fp] = mfp.getFilePatches();
      assert.strictEqual(fp.getOldFile().getPath(), 'deleted');
      assert.isFalse(fp.getNewFile().isPresent());
    });

    it('excludes b/ prefix on the new file of an addition', async function() {
      setDiffResponse(rawAdditionDiff);

      const children = sinon.spy();
      shallow(buildApp({children}));

      await assert.async.strictEqual(children.callCount, 2);
      const [error, mfp] = children.lastCall.args;

      assert.isNull(error);
      assert.lengthOf(mfp.getFilePatches(), 1);
      const [fp] = mfp.getFilePatches();
      assert.isFalse(fp.getOldFile().isPresent());
      assert.strictEqual(fp.getNewFile().getPath(), 'added');
    });

    it('converts file paths to use native path separators', async function() {
      setDiffResponse(rawDiffWithPathPrefix);
      const children = sinon.spy();

      shallow(buildApp({children}));

      await assert.async.strictEqual(children.callCount, 2);
      const [error, mfp] = children.lastCall.args;

      assert.isNull(error);
      assert.lengthOf(mfp.getFilePatches(), 1);
      const [fp] = mfp.getFilePatches();
      assert.strictEqual(fp.getNewFile().getPath(), path.join('bad/path.txt'));
      assert.strictEqual(fp.getOldFile().getPath(), path.join('bad/path.txt'));
    });
  });

  describe('when there has been an error', function() {
    it('reports an error when the network request fails', async function() {
      const output = sinon.stub(console, 'error');
      sinon.stub(window, 'fetch').rejects(new Error('kerPOW'));

      const children = sinon.spy();
      shallow(buildApp({children}));

      await assert.async.strictEqual(children.callCount, 2);
      const [error, mfp] = children.lastCall.args;

      assert.strictEqual(error, 'Network error encountered fetching the patch: kerPOW.');
      assert.isNull(mfp);
      assert.isTrue(output.called);
    });

    it('reports an error if the fetch returns a non-OK response', async function() {
      setDiffResponse('ouch', {
        status: 404,
        statusText: 'Not found',
      });

      const children = sinon.spy();
      shallow(buildApp({children}));

      await assert.async.strictEqual(children.callCount, 2);
      const [error, mfp] = children.lastCall.args;

      assert.strictEqual(error, 'Unable to fetch the diff for this pull request: Not found.');
      assert.isNull(mfp);
    });

    it('reports an error if the patch cannot be parsed', async function() {
      const output = sinon.stub(console, 'error');
      setDiffResponse('bad diff no treat for you');

      const children = sinon.spy();
      shallow(buildApp({children}));

      await assert.async.strictEqual(children.callCount, 2);
      const [error, mfp] = children.lastCall.args;

      assert.strictEqual(error, 'Unable to parse the diff for this pull request.');
      assert.isNull(mfp);
      assert.isTrue(output.called);
    });
  });

  describe('when a refetch is requested', function() {
    it('refetches patch data on the first render', async function() {
      const fetch = setDiffResponse(rawDiff);

      const children = sinon.spy();
      const wrapper = shallow(buildApp({children}));
      assert.strictEqual(fetch.callCount, 1);
      assert.isTrue(children.calledWith(null, null));

      await assert.async.strictEqual(children.callCount, 2);

      wrapper.setProps({refetch: true});
      assert.strictEqual(fetch.callCount, 2);
    });

    it('does not refetch data on additional renders', async function() {
      const fetch = setDiffResponse(rawDiff);

      const children = sinon.spy();
      const wrapper = shallow(buildApp({children, refetch: true}));
      assert.strictEqual(fetch.callCount, 1);
      assert.strictEqual(children.callCount, 1);

      await assert.async.strictEqual(children.callCount, 2);

      wrapper.setProps({refetch: true});

      assert.strictEqual(fetch.callCount, 1);
      assert.strictEqual(children.callCount, 3);
    });
  });
});
