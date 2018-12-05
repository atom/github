import {cloneRepository, buildRepositoryWithPipeline} from './helpers';
import getRepoPipelineManager from '../lib/get-repo-pipeline-manager';


describe('getRepoPipelineManager()', function() {

  let atomEnv, workspace, notificationManager, confirm, pipelineManager;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;
    notificationManager = atomEnv.notifications;
    confirm = sinon.stub(atomEnv, 'confirm');
    pipelineManager = getRepoPipelineManager({confirm, notificationManager, workspace});
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  it('has all the action pipelines', function() {
    const expectedActions = ['PUSH', 'PULL', 'FETCH', 'COMMIT', 'CHECKOUT', 'ADDREMOTE'];
    for (const actionName of expectedActions) {
      const action = pipelineManager.actionKeys[actionName];
      assert.ok(pipelineManager.getPipeline(action));
    }
  });
});
