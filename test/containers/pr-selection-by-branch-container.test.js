import React from 'react';
import {shallow} from 'enzyme';

import {PrSelectionByBranch} from '../../lib/containers/pr-selection-by-branch-container';

describe('PrSelectionByBranch', function() {
  let onSelectPr, onUnpinPr, onPushBranch, onCreatePr, onSearchAgain;
  let app;

  beforeEach(function() {
    onSelectPr = sinon.spy();
    onUnpinPr = sinon.spy();
    onPushBranch = sinon.spy();
    onCreatePr = sinon.spy();
    onSearchAgain = sinon.spy();

    app = (
      <PrSelectionByBranch
        onSelectPr={onSelectPr}
        onUnpinPr={onUnpinPr}
        onPushBranch={onPushBranch}
        onCreatePr={onCreatePr}
        onSearchAgain={onSearchAgain}
        aheadCount={0}
        isUnpublished={true}
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
      beforeEach(function() {
        app = React.cloneElement(app, {
          isUnpublished: true,
        });
      });

      it('shows a button to publish your branch', function() {
        const wrapper = shallow(app);

        const button = wrapper.find('.github-PrSelectionByBranch-push');
        assert.isTrue(button.exists());
        button.simulate('click');
        assert.isTrue(onPushBranch.called);
      });

      it('shows a link to search again', function() {
        const wrapper = shallow(app);

        const link = wrapper.find('.github-PrSelectionByBranch-searchAgain');
        assert.isTrue(link.exists());
        link.simulate('click');
        assert.isTrue(onSearchAgain.called);
      });

      it('disables a button to open a new pull request', function() {
        const wrapper = shallow(app);

        const button = wrapper.find('.github-PrSelectionByBranch-createPr');
        assert.isTrue(button.exists());
        assert.isTrue(button.prop('disabled'));
        button.simulate('click');
      });
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
