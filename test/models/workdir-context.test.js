import {CompositeDisposable} from 'atom';

import {cloneRepository} from '../helpers';

import WorkdirContext from '../../lib/models/workdir-context';
import Repository from '../../lib/models/repository';

describe('WorkdirContext', function() {
  let context, workingDirectory, subs;
  let mockWindow, mockWorkspace, mockPromptCallback;

  beforeEach(async function() {
    workingDirectory = await cloneRepository('three-files');
    subs = new CompositeDisposable();

    mockWindow = {
      addEventListener: sinon.spy(),
      removeEventListener: sinon.spy(),
    };

    mockWorkspace = {
      observeTextEditors: sinon.spy(),
    };

    mockPromptCallback = query => 'reply';
  });

  afterEach(async function() {
    context && await context.destroy();
    subs.dispose();
  });

  describe('without an initial Repository', function() {
    beforeEach(function() {
      context = new WorkdirContext(workingDirectory, {
        window: mockWindow,
        workspace: mockWorkspace,
        promptCallback: mockPromptCallback,
      });
    });

    it('returns null for each synchronous model', function() {
      assert.isNull(context.getRepository());
      assert.isNull(context.getResolutionProgress());
      assert.isNull(context.getChangeObserver());
    });

    it('populates the repository on create()', async function() {
      const repoPromise = context.getRepositoryPromise();

      await context.create();

      const repo = context.getRepository();
      assert.isNotNull(repo);
      assert.equal(repo.getWorkingDirectoryPath(), workingDirectory);
      assert.strictEqual(repo, await repoPromise);
    });

    it('populates the resolution progress on create()', async function() {
      const progressPromise = context.getResolutionProgressPromise();

      await context.create();

      const progress = context.getResolutionProgress();
      assert.isNotNull(progress);
      assert.strictEqual(progress, await progressPromise);
    });

    it('populates the change observer on create()', async function() {
      const observerPromise = context.getChangeObserverPromise();

      await context.create();

      const observer = context.getChangeObserver();
      assert.isNotNull(observer);
      assert.strictEqual(observer, await observerPromise);
    });

    it('configures the repository with a prompt callback', async function() {
      await context.create();

      const repo = context.getRepository();
      for (const strategy of repo.git.getImplementers()) {
        assert.strictEqual(strategy.prompt, mockPromptCallback);
      }
    });

    it('refreshes the repository on any filesystem change', async function() {
      await context.create();

      const repo = context.getRepository();
      sinon.spy(repo, 'refresh');

      const observer = context.getChangeObserver();
      observer.emitter.emit('did-change');

      assert.isTrue(repo.refresh.called);
    });

    it('emits an event on workdir or head change', async function() {
      const listener = sinon.spy();
      subs.add(context.onDidChangeWorkdirOrHead(listener));

      await context.create();

      context.getChangeObserver().emitter.emit('did-change-workdir-or-head');
      assert.isTrue(listener.called);
    });

    it('can be destroyed before create()', async function() {
      await context.destroy();
      assert.isTrue(context.isDestroyed());

      await context.create();
      assert.isTrue(context.isDestroyed());
    });

    it('destroys the repository on destroy()', async function() {
      await context.create();
      const repo = context.getRepository();
      sinon.spy(repo, 'destroy');

      await context.destroy();
      assert.isTrue(repo.destroy.called);
    });

    it('stops the change observer on destroy()', async function() {
      await context.create();
      const observer = context.getChangeObserver();
      await observer.start();

      sinon.spy(observer, 'destroy');

      await context.destroy();
      assert.isTrue(observer.destroy.called);
    });

    it('can be destroyed twice', async function() {
      await context.create();
      assert.isFalse(context.isDestroyed());

      await context.destroy();
      assert.isTrue(context.isDestroyed());
    });
  });

  describe('with an initial Repository', function() {
    let repository;

    beforeEach(async function() {
      repository = await Repository.open(workingDirectory);
      context = new WorkdirContext(workingDirectory, {repository});
    });

    it('returns the repository synchrounsly', function() {
      assert.strictEqual(repository, context.getRepository());
    });

    it('populates the resolution progress on create()', async function() {
      const progressPromise = context.getResolutionProgressPromise();

      await context.create();

      const progress = context.getResolutionProgress();
      assert.isNotNull(progress);
      assert.strictEqual(progress, await progressPromise);
    });

    it('populates the change observer on create()', async function() {
      const observerPromise = context.getChangeObserverPromise();

      await context.create();

      const observer = context.getChangeObserver();
      assert.isNotNull(observer);
      assert.strictEqual(observer, await observerPromise);
    });
  });
});
