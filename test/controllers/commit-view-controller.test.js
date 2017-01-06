import CommitViewController from '../../lib/controllers/commit-view-controller';
import {cloneRepository, buildRepository} from '../helpers';

describe('CommitViewController', function() {
  let atomEnvironment, commandRegistry;

  beforeEach(function() {
    atomEnvironment = global.buildAtomEnvironment();
    commandRegistry = atomEnvironment.commands;
  });

  afterEach(function() {
    atomEnvironment.destroy();
  });

  it('correctly updates state when switching repos', async function() {
    const workdirPath1 = await cloneRepository('three-files');
    const repository1 = await buildRepository(workdirPath1);
    const workdirPath2 = await cloneRepository('three-files');
    const repository2 = await buildRepository(workdirPath2);
    const controller = new CommitViewController({commandRegistry, repository: repository1});

    assert.equal(controller.regularCommitMessage, '');
    assert.equal(controller.amendingCommitMessage, '');

    controller.regularCommitMessage = 'regular message 1';
    controller.amendingCommitMessage = 'amending message 1';

    await controller.update({repository: repository2});
    assert.equal(controller.regularCommitMessage, '');
    assert.equal(controller.amendingCommitMessage, '');

    await controller.update({repository: repository1});
    assert.equal(controller.regularCommitMessage, 'regular message 1');
    assert.equal(controller.amendingCommitMessage, 'amending message 1');
  });

  describe('the passed commit message', function() {
    let controller, commitView, lastCommit;
    beforeEach(async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);
      controller = new CommitViewController({commandRegistry, repository});
      commitView = controller.refs.commitView;
      lastCommit = {sha: 'a1e23fd45', message: 'last commit message'};
    });

    it('is set to the regularCommitMessage in the default case', async function() {
      controller.regularCommitMessage = 'regular message';
      await controller.update();
      assert.equal(commitView.props.message, 'regular message');
    });

    describe('when isAmending is true', function() {
      it('is set to the last commits message if amendingCommitMessage is blank', async function() {
        controller.amendingCommitMessage = 'amending commit message';
        await controller.update({isAmending: true, lastCommit});
        assert.equal(commitView.props.message, 'amending commit message');
      });

      it('is set to amendingCommitMessage if it is set', async function() {
        controller.amendingCommitMessage = 'amending commit message';
        await controller.update({isAmending: true, lastCommit});
        assert.equal(commitView.props.message, 'amending commit message');
      });
    });

    describe('when a merge message is defined', function() {
      it('is set to the merge message if regularCommitMessage is blank', async function() {
        controller.regularCommitMessage = '';
        await controller.update({mergeMessage: 'merge conflict!'});
        assert.equal(commitView.props.message, 'merge conflict!');
      });

      it('is set to regularCommitMessage if it is set', async function() {
        controller.regularCommitMessage = 'regular commit message';
        await controller.update({mergeMessage: 'merge conflict!'});
        assert.equal(commitView.props.message, 'regular commit message');
      });
    });
  });
});
