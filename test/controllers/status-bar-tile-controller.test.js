import fs from 'fs';
import path from 'path';

import React from 'react';
import until from 'test-until';
import {mount} from 'enzyme';

import {cloneRepository, buildRepository, setUpLocalAndRemoteRepositories} from '../helpers';
import StatusBarTileController from '../../lib/controllers/status-bar-tile-controller';
import BranchView from '../../lib/views/branch-view';
import PushPullView from '../../lib/views/push-pull-view';
import ChangedFilesCountView from '../../lib/views/changed-files-count-view';

describe('StatusBarTileController', function() {
  let atomEnvironment;
  let workspace, workspaceElement, commandRegistry, notificationManager, tooltips;
  let component;

  beforeEach(function() {
    atomEnvironment = global.buildAtomEnvironment();
    workspace = atomEnvironment.workspace;
    commandRegistry = atomEnvironment.commands;
    notificationManager = atomEnvironment.notifications;
    tooltips = atomEnvironment.tooltips;

    workspaceElement = atomEnvironment.views.getView(workspace);

    component = (
      <StatusBarTileController
        workspace={workspace}
        commandRegistry={commandRegistry}
        notificationManager={notificationManager}
        tooltips={tooltips}
      />
    );
  });

  afterEach(function() {
    atomEnvironment.destroy();
  });

  function getTooltipNode(wrapper, selector) {
    const ts = tooltips.findTooltips(wrapper.find(selector).node.element);
    assert.lengthOf(ts, 1);
    ts[0].show();
    return ts[0].getTooltipElement();
  }

  describe('branches', function() {
    it('indicates the current branch', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      const wrapper = mount(React.cloneElement(component, {repository}));
      await wrapper.instance().refreshModelData();

      assert.equal(wrapper.find(BranchView).prop('currentBranch').name, 'master');
      assert.lengthOf(wrapper.find(BranchView).find('.github-branch-detached'), 0);
    });

    it('styles a detached HEAD differently', async function() {
      const workdirPath = await cloneRepository('multiple-commits');
      const repository = await buildRepository(workdirPath);
      await repository.checkout('HEAD~2');

      const wrapper = mount(React.cloneElement(component, {repository}));
      await wrapper.instance().refreshModelData();

      assert.equal(wrapper.find(BranchView).prop('currentBranch').name, 'master~2');
      assert.lengthOf(wrapper.find(BranchView).find('.github-branch-detached'), 1);
    });

    describe('the branch menu', function() {
      function selectOption(tip, value) {
        const selects = Array.from(tip.getElementsByTagName('select'));
        assert.lengthOf(selects, 1);
        const select = selects[0];
        select.value = value;

        const event = new Event('change', {bubbles: true, cancelable: true});
        select.dispatchEvent(event);
      }

      describe('checking out an existing branch', function() {
        it('can check out existing branches with no conflicts', async function() {
          const workdirPath = await cloneRepository('three-files');
          const repository = await buildRepository(workdirPath);

          // create branch called 'branch'
          await repository.git.exec(['branch', 'branch']);

          const wrapper = mount(React.cloneElement(component, {repository}));
          await wrapper.instance().refreshModelData();

          const tip = getTooltipNode(wrapper, BranchView);

          const branches = Array.from(tip.getElementsByTagName('option'), e => e.innerHTML);
          assert.deepEqual(branches, ['branch', 'master']);

          assert.deepEqual(await repository.getCurrentBranch(), {name: 'master', isDetached: false});
          assert.equal(tip.querySelector('select').value, 'master');

          selectOption(tip, 'branch');
          assert.deepEqual(await repository.getCurrentBranch(), {name: 'branch', isDetached: false});
          assert.equal(tip.querySelector('select').value, 'branch');
          await wrapper.instance().refreshModelData();
          assert.equal(tip.querySelector('select').value, 'branch');

          selectOption(tip, 'master');
          assert.deepEqual(await repository.getCurrentBranch(), {name: 'master', isDetached: false});
          assert.equal(tip.querySelector('select').value, 'master');
          await wrapper.instance().refreshModelData();
          assert.equal(tip.querySelector('select').value, 'master');
        });

        it('displays an error message if checkout fails', async function() {
          const {localRepoPath} = await setUpLocalAndRemoteRepositories('three-files');
          const repository = await buildRepository(localRepoPath);
          await repository.git.exec(['branch', 'branch']);

          // create a conflict
          fs.writeFileSync(path.join(localRepoPath, 'a.txt'), 'a change');

          await repository.git.exec(['commit', '-a', '-m', 'change on master']);
          await repository.checkout('branch');
          fs.writeFileSync(path.join(localRepoPath, 'a.txt'), 'a change that conflicts');

          const wrapper = mount(React.cloneElement(component, {repository}));
          await wrapper.instance().refreshModelData();

          const tip = getTooltipNode(wrapper, BranchView);

          assert.deepEqual(await repository.getCurrentBranch(), {name: 'branch', isDetached: false});
          assert.equal(tip.querySelector('select').value, 'branch');

          sinon.stub(notificationManager, 'addError');

          selectOption(tip, 'master');
          // Optimistic render
          assert.equal(tip.querySelector('select').value, 'master');
          await until(async () => {
            await wrapper.instance().refreshModelData();
            return tip.querySelector('select').value === 'branch';
          });

          assert.isTrue(notificationManager.addError.called);
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Checkout aborted');
          assert.match(notificationArgs[1].description, /Local changes to the following would be overwritten/);
        });
      });

      describe('checking out newly created branches', function() {
        it('can check out newly created branches', async function() {
          const workdirPath = await cloneRepository('three-files');
          const repository = await buildRepository(workdirPath);

          const wrapper = mount(React.cloneElement(component, {repository}));
          await wrapper.instance().refreshModelData();

          const tip = getTooltipNode(wrapper, BranchView);

          const branches = Array.from(tip.querySelectorAll('option'), option => option.value);
          assert.deepEqual(branches, ['master']);
          assert.deepEqual(await repository.getCurrentBranch(), {name: 'master', isDetached: false});
          assert.equal(tip.querySelector('select').value, 'master');

          tip.querySelector('button').click();

          assert.lengthOf(tip.querySelectorAll('select'), 0);
          assert.lengthOf(tip.querySelectorAll('.github-BranchMenuView-editor'), 1);

          tip.querySelector('atom-text-editor').getModel().setText('new-branch');
          tip.querySelector('button').click();

          await until(async () => {
            await wrapper.instance().refreshModelData();
            return tip.querySelectorAll('select').length === 1;
          });

          assert.equal(tip.querySelector('select').value, 'new-branch');
          assert.deepEqual(await repository.getCurrentBranch(), {name: 'new-branch', isDetached: false});

          assert.lengthOf(tip.querySelectorAll('.github-BranchMenuView-editor'), 0);
          assert.lengthOf(tip.querySelectorAll('select'), 1);
        });

        it('displays an error message if branch already exists', async function() {
          const workdirPath = await cloneRepository('three-files');
          const repository = await buildRepository(workdirPath);
          await repository.git.exec(['checkout', '-b', 'branch']);

          const wrapper = mount(React.cloneElement(component, {repository}));
          await wrapper.instance().refreshModelData();

          const tip = getTooltipNode(wrapper, BranchView);
          sinon.stub(notificationManager, 'addError');

          const branches = Array.from(tip.getElementsByTagName('option'), option => option.value);
          assert.deepEqual(branches, ['branch', 'master']);
          assert.deepEqual(await repository.getCurrentBranch(), {name: 'branch', isDetached: false});
          assert.equal(tip.querySelector('select').value, 'branch');

          tip.querySelector('button').click();
          tip.querySelector('atom-text-editor').getModel().setText('master');
          tip.querySelector('button').click();

          await assert.async.isTrue(notificationManager.addError.called);
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Cannot create branch');
          assert.match(notificationArgs[1].description, /already exists/);

          assert.deepEqual(await repository.getCurrentBranch(), {name: 'branch', isDetached: false});
          assert.equal(tip.querySelector('select').value, 'branch');
        });
      });
    });
  });

  describe('pushing and pulling', function() {
    it('shows and hides the PushPullView', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories();
      const repository = await buildRepository(localRepoPath);

      const wrapper = mount(React.cloneElement(component, {repository}));
      await wrapper.instance().refreshModelData();

      assert.lengthOf(document.querySelectorAll('.github-PushPullMenuView'), 0);
      wrapper.find(PushPullView).node.element.click();
      assert.lengthOf(document.querySelectorAll('.github-PushPullMenuView'), 1);
      wrapper.find(PushPullView).node.element.click();
      assert.lengthOf(document.querySelectorAll('.github-PushPullMenuView'), 0);
    });

    it('indicates the ahead and behind counts', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories();
      const repository = await buildRepository(localRepoPath);

      const wrapper = mount(React.cloneElement(component, {repository}));
      await wrapper.instance().refreshModelData();

      const tip = getTooltipNode(wrapper, PushPullView);

      assert.equal(tip.querySelector('.github-PushPullMenuView-pull').textContent.trim(), 'Pull');
      assert.equal(tip.querySelector('.github-PushPullMenuView-push').textContent.trim(), 'Push');

      await repository.git.exec(['reset', '--hard', 'head~2']);
      repository.refresh();
      await wrapper.instance().refreshModelData();

      assert.equal(tip.querySelector('.github-PushPullMenuView-pull').textContent.trim(), 'Pull (2)');
      assert.equal(tip.querySelector('.github-PushPullMenuView-push').textContent.trim(), 'Push');

      await repository.git.commit('new local commit', {allowEmpty: true});
      repository.refresh();
      await wrapper.instance().refreshModelData();

      assert.equal(tip.querySelector('.github-PushPullMenuView-pull').textContent.trim(), 'Pull (2)');
      assert.equal(tip.querySelector('.github-PushPullMenuView-push').textContent.trim(), 'Push (1)');
    });

    describe('the push/pull menu', function() {
      it('disables the fetch and pull buttons when there is no remote tracking branch and displays informative message', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);
        await repository.git.exec(['checkout', '-b', 'new-branch']);

        const wrapper = mount(React.cloneElement(component, {repository}));
        await wrapper.instance().refreshModelData();

        const tip = getTooltipNode(wrapper, PushPullView);

        const pullButton = tip.querySelector('button.github-PushPullMenuView-pull');
        const pushButton = tip.querySelector('button.github-PushPullMenuView-push');
        const message = tip.querySelector('.github-PushPullMenuView-message');

        assert.isTrue(pullButton.disabled);
        assert.isFalse(pushButton.disabled);
        assert.match(message.innerHTML, /No remote detected.*Pushing will set up a remote tracking branch/);

        pushButton.click();
        await until(async fail => {
          try {
            repository.refresh();
            await wrapper.instance().refreshModelData();

            assert.isFalse(pullButton.disabled);
            assert.isFalse(pushButton.disabled);
            assert.equal(message.textContent, '');
            return true;
          } catch (err) {
            return fail(err);
          }
        });
      });

      it('displays an error message if push fails and allows force pushing if meta key is pressed', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);
        await repository.git.exec(['reset', '--hard', 'head~2']);
        await repository.git.commit('another commit', {allowEmpty: true});

        const wrapper = mount(React.cloneElement(component, {repository}));
        await wrapper.instance().refreshModelData();

        const tip = getTooltipNode(wrapper, PushPullView);

        const pullButton = tip.querySelector('button.github-PushPullMenuView-pull');
        const pushButton = tip.querySelector('button.github-PushPullMenuView-push');

        sinon.stub(notificationManager, 'addError');

        assert.equal(pushButton.textContent, 'Push (1)');
        assert.equal(pullButton.textContent, 'Pull (2)');

        pushButton.click();
        await wrapper.instance().refreshModelData();

        await assert.async.isTrue(notificationManager.addError.called);
        const notificationArgs = notificationManager.addError.args[0];
        assert.equal(notificationArgs[0], 'Push rejected');
        assert.match(notificationArgs[1].description, /Try pulling before pushing again/);

        pushButton.dispatchEvent(new MouseEvent('click', {metaKey: true, bubbles: true}));
        await wrapper.instance().refreshModelData();

        await assert.async.equal(pushButton.textContent, 'Push ');
        await assert.async.equal(pullButton.textContent, 'Pull ');
      });
    });

    describe('fetch and pull commands', function() {
      it('fetches when github:fetch is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories('multiple-commits', {remoteAhead: true});
        const repository = await buildRepository(localRepoPath);

        const wrapper = mount(React.cloneElement(component, {repository}));
        await wrapper.instance().refreshModelData();

        sinon.spy(repository, 'fetch');

        commandRegistry.dispatch(workspaceElement, 'github:fetch');

        assert.isTrue(repository.fetch.called);
      });

      it('pulls when github:pull is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories('multiple-commits', {remoteAhead: true});
        const repository = await buildRepository(localRepoPath);

        const wrapper = mount(React.cloneElement(component, {repository}));
        await wrapper.instance().refreshModelData();

        sinon.spy(repository, 'pull');

        commandRegistry.dispatch(workspaceElement, 'github:pull');

        assert.isTrue(repository.pull.called);
      });

      it('pushes when github:push is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);

        const wrapper = mount(React.cloneElement(component, {repository}));
        await wrapper.instance().refreshModelData();

        sinon.spy(repository, 'push');

        commandRegistry.dispatch(workspaceElement, 'github:push');

        assert.isTrue(repository.push.calledWith('master', sinon.match({force: false, setUpstream: false})));
      });

      it('force pushes when github:force-push is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);

        const wrapper = mount(React.cloneElement(component, {repository}));
        await wrapper.instance().refreshModelData();

        sinon.spy(repository, 'push');

        commandRegistry.dispatch(workspaceElement, 'github:force-push');

        assert.isTrue(repository.push.calledWith('master', sinon.match({force: true, setUpstream: false})));
      });
    });
  });

  describe('changed files', function() {
    it('shows the changed files count view when the repository data is loaded', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      const toggleGitPanel = sinon.spy();

      const wrapper = mount(React.cloneElement(component, {repository, toggleGitPanel}));
      await wrapper.instance().refreshModelData();

      assert.equal(wrapper.find('.github-ChangedFilesCount').render().text(), '0 files');

      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
      fs.unlinkSync(path.join(workdirPath, 'b.txt'));

      await repository.stageFiles(['a.txt']);
      repository.refresh();

      await assert.async.equal(wrapper.find('.github-ChangedFilesCount').render().text(), '2 files');
    });

    it('toggles the git panel when clicked', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      const toggleGitPanel = sinon.spy();

      const wrapper = mount(React.cloneElement(component, {repository, toggleGitPanel}));
      await wrapper.instance().refreshModelData();

      wrapper.find(ChangedFilesCountView).simulate('click');
      assert(toggleGitPanel.calledOnce);
    });
  });
});
