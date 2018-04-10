import React from 'react';
import {shallow} from 'enzyme';

import Remote from '../../lib/models/remote';
import Branch, {nullBranch} from '../../lib/models/branch';
import BranchSet from '../../lib/models/branch-set';
import {PrSelectionByBranch} from '../../lib/containers/pr-selection-by-branch-container';

describe('PrSelectionByBranch', function() {
  let branches, remote, onSelectPr, onUnpinPr, onCreatePr, onSearchAgain;
  let app;

  beforeEach(function() {
    branches = new BranchSet();
    remote = new Remote('origin', 'git@github.com:atom/github.git');

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
        remote={remote}
        aheadCount={null}
        branches={branches}
        upstreamBranch={nullBranch}
        pushInProgress={false}
      />
    );
  });

  // Populate the `branches` prop with a set of Branches that triggers the happy path: HEAD on a feature branch that
  // has been moved from the repository's main branch.
  function setUpFeatureBranch() {
    const mainUpstream = Branch.createRemoteTracking('refs/remotes/origin/master', 'origin', 'refs/heads/master');
    const main = new Branch(
      'master',
      mainUpstream,
      mainUpstream,
      false,
      {sha: 'ac133c710d2f789c36799bddffe88b10551c6484'},
    );
    branches.add(main);
    const featureUpstream = Branch.createRemoteTracking(
      'refs/remotes/origin/feature',
      'origin',
      'refs/heads/feature',
    );
    const feature = new Branch(
      'feature',
      featureUpstream,
      featureUpstream,
      true,
      {sha: 'ece5f33141b84077cbd68bfa09283d73d18433e5'},
    );
    branches.add(feature);
  }

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
        const feature = new Branch(
          'feature',
          nullBranch,
          nullBranch,
          true,
          {sha: 'ece5f33141b84077cbd68bfa09283d73d18433e5'},
        );
        branches.add(feature);
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
        setUpFeatureBranch();
        app = React.cloneElement(app, {aheadCount: 3});
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
        setUpFeatureBranch();
        app = React.cloneElement(app, {
          aheadCount: 3,
          pushInProgress: true,
        });
      });

      it('disables the button and changes the caption', function() {
        const wrapper = shallow(app);

        const button = wrapper.find('.github-PrSelectionByBranch-createPr');
        assert.isTrue(button.prop('disabled'));
        assert.strictEqual(button.text(), 'Pushing...');
      });
    });

    describe('when fully pushed', function() {
      beforeEach(function() {
        setUpFeatureBranch();
        app = React.cloneElement(app, {aheadCount: 0});
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
        const mainUpstream = Branch.createRemoteTracking('refs/remotes/origin/master', 'origin', 'refs/heads/splork');
        const main = new Branch(
          'master',
          mainUpstream,
          mainUpstream,
          true,
          {sha: 'ac133c710d2f789c36799bddffe88b10551c6484'},
        );
        branches.add(main);

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

    describe('when just branched from the main branch', function() {
      beforeEach(function() {
        // "main" and "feature" are still on the same SHA
        const main = new Branch(
          'main',
          Branch.createRemoteTracking('refs/remotes/elsewhere/main', 'elsewhere', 'refs/heads/develop'),
          Branch.createRemoteTracking('refs/remotes/origin/main', 'origin', 'refs/heads/develop'),
          false,
          {sha: 'ece5f33141b84077cbd68bfa09283d73d18433e5'},
        );
        branches.add(main);

        const feature = new Branch(
          'feature',
          nullBranch,
          nullBranch,
          true,
          {sha: 'ece5f33141b84077cbd68bfa09283d73d18433e5'},
        );
        branches.add(feature);

        app = React.cloneElement(app, {
          repository: {
            defaultBranchRef: {
              name: 'develop',
            },
            pullRequests: {
              totalCount: 0,
              edges: [],
            },
          },
        });
      });

      it('does not show the new pull request button', function() {
        const wrapper = shallow(app);
        assert.isFalse(wrapper.find('.github-PrSelectionByBranch-createPr').exists());
      });

      it('prompts you to commit', function() {
        const wrapper = shallow(app);
        assert.strictEqual(wrapper.find('.github-CreatePr strong').text(), 'Make some commits');
      });
    });

    describe('when on a detached HEAD', function() {
      beforeEach(function() {
        const main = new Branch(
          'main',
          Branch.createRemoteTracking('refs/remotes/elsewhere/main', 'elsewhere', 'refs/heads/develop'),
          Branch.createRemoteTracking('refs/remotes/origin/main', 'origin', 'refs/heads/develop'),
          false,
          {sha: 'ece5f33141b84077cbd68bfa09283d73d18433e5'},
        );
        branches.add(main);
      });

      it('does not show the new pull request button', function() {
        const wrapper = shallow(app);
        assert.isFalse(wrapper.find('.github-PrSelectionByBranch-createPr').exists());
      });

      it('prompts you to create or check out a branch', function() {
        const wrapper = shallow(app);
        assert.strictEqual(wrapper.find('.github-CreatePr strong').text(), 'Create a new branch');
      });
    });

    describe('on a branch configured to push to a different remote', function() {
      beforeEach(function() {
        const u = Branch.createRemoteTracking(
          'refs/remotes/origin/feature',
          'origin',
          'refs/heads/feature',
        );
        const p = Branch.createRemoteTracking(
          'refs/remotes/mine/feature',
          'mine',
          'refs/heads/feature',
        );
        const feature = new Branch(
          'feature',
          u,
          p,
          true,
          {sha: 'ece5f33141b84077cbd68bfa09283d73d18433e5'},
        );
        branches.add(feature);
      });

      it('informs you that your branch is currently pushed to a different remote', function() {
        const wrapper = shallow(app);
        assert.strictEqual(wrapper.find('.github-CreatePr code').at(0).text(), 'mine');
      });

      it('shows a button to publish your branch to the current remote and create a PR', function() {
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
  });
});
