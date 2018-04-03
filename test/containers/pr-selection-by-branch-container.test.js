import React from 'react';
import {shallow} from 'enzyme';

import {PrSelectionByBranch} from '../../lib/containers/pr-selection-by-branch-container';

describe('PrSelectionByBranch', function() {
  let onSelectPr, onUnpinPr;
  let app;

  beforeEach(function() {
    onSelectPr = sinon.spy();
    onUnpinPr = sinon.spy();

    app = (
      <PrSelectionByBranch
        onSelectPr={onSelectPr}
        onUnpinPr={onUnpinPr}
      />
    );
  });

  describe('with no pull request', function() {
    beforeEach(function() {
      app = React.cloneElement(app, {
        repository: {
          pullRequests: {
            totalCount: 0,
            edges: [],
          },
        },
        variables: {
          repoOwner: 'me', repoName: 'stuff', branchName: 'ohhai',
        },
      });
    });

    it('shows an input field to manually pin an existing pull request by URL', function() {
      const wrapper = shallow(app);

      const inputField = wrapper.find('PrUrlInputBox');
      assert.isTrue(inputField.exists());
      inputField.prop('onSubmit')('https://github.com/me/stuff/pull/1234');
      assert.isTrue(onSelectPr.calledWith('https://github.com/me/stuff/pull/1234'));
    });

    describe('with no remote tracking branch', function() {
      it('shows a button to publish your branch');

      it('disables a button to open a new pull request');
    });

    describe('with unpushed commits', function() {
      it('shows a button to push your commits');

      it('shows a button to open a new pull request');
    });

    describe('when fully pushed', function() {
      it('disables the push button');

      it('shows a button to open a new pull request');
    });
  });
});
