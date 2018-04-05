import React from 'react';
import {shallow} from 'enzyme';

import {PrSelectionByBranch} from '../../lib/containers/pr-selection-by-branch-container';

describe('PrSelectionByBranch', function() {
  let onSelectPr, onUnpinPr, onCreatePr, onSearchAgain;
  let app;

  beforeEach(function() {
    onSelectPr = sinon.spy();
    onUnpinPr = sinon.spy();
    onCreatePr = sinon.spy();
    onSearchAgain = sinon.spy();

    app = (
      <PrSelectionByBranch
        onSelectPr={onSelectPr}
        onUnpinPr={onUnpinPr}
        onCreatePr={onCreatePr}
        onSearchAgain={onSearchAgain}
        aheadCount={null}
        currentBranchName={'feature'}
        isUnpublished={true}
        pushInProgress={false}
      />
    );
  });

  describe('with no pull request', function() {
    beforeEach(function() {
      app = React.cloneElement(app, {
        repository: {
          defaultBranchRef: {
            name: 'master',
          },
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

      it('shows a button to publish your branch and create a PR', function() {
        const wrapper = shallow(app);

        const button = wrapper.find('.github-PrSelectionByBranch-createPr');
        assert.isTrue(button.exists());
        assert.strictEqual(button.text(), 'Publish + open new pull request');
        button.simulate('click');
        assert.isTrue(onCreatePr.called);
      });

      it('shows a link to search again', function() {
        const wrapper = shallow(app);

        const link = wrapper.find('.github-PrSelectionByBranch-searchAgain');
        assert.isTrue(link.exists());
        link.simulate('click');
        assert.isTrue(onSearchAgain.called);
      });
    });

    describe('with unpushed commits', function() {
      beforeEach(function() {
        app = React.cloneElement(app, {
          aheadCount: 3,
          isUnpublished: false,
        });
      });

      it('shows a button to push your commits and create a PR', function() {
        const wrapper = shallow(app);

        const button = wrapper.find('.github-PrSelectionByBranch-createPr');
        assert.isTrue(button.exists());
        assert.strictEqual(button.text(), 'Push + open new pull request');
        button.simulate('click');
        assert.isTrue(onCreatePr.called);
      });
    });

    describe('while pushing is in progress', function() {
      beforeEach(function() {
        app = React.cloneElement(app, {
          aheadCount: 3,
          isUnpublished: false,
          pushInProgress: true,
        });
      });

      it('disables the button', function() {
        const wrapper = shallow(app);

        const button = wrapper.find('.github-PrSelectionByBranch-createPr');
        assert.isTrue(button.prop('disabled'));
        assert.strictEqual(button.text(), 'Pushing...');
      });
    });

    describe('when fully pushed', function() {
      beforeEach(function() {
        app = React.cloneElement(app, {
          aheadCount: 0,
          isUnpublished: false,
        });
      });

      it('shows a button to open a new pull request', function() {
        const wrapper = shallow(app);

        const button = wrapper.find('.github-PrSelectionByBranch-createPr');
        assert.isTrue(button.exists());
        assert.strictEqual(button.text(), 'Open new pull request');
        button.simulate('click');
        assert.isTrue(onCreatePr.called);
      });
    });

    describe('while on the main branch', function() {
      beforeEach(function() {
        app = React.cloneElement(app, {
          repository: {
            defaultBranchRef: {
              name: 'splork',
            },
            pullRequests: {
              totalCount: 0,
              edges: [],
            },
          },
          currentBranchName: 'splork',
        });
      });

      it('does not show the new pull request button', function() {
        const wrapper = shallow(app);
        assert.isFalse(wrapper.find('.github-PrSelectionByBranch-createPr').exists());
      });

      it('prompts you to create a branch', function() {
        const wrapper = shallow(app);
        assert.strictEqual(wrapper.find('.github-CreatePr strong').text(), 'Create a new branch');
      });
    });
  });
});
