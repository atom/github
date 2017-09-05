import {ActionPipelineManager, ActionPipeline} from '../action-pipeline';

class NullActionPipeline extends ActionPipeline {
  run(fn, ...args) {
    return fn(...args);
  }

  addMiddleware() {
    throw new Error('Cannot add middleware to a null pipeline');
  }

  removeMiddleware() {
    throw new Error('Cannot remove middleware from a null pipeline');
  }

  insertMiddlewareBefore() {
    throw new Error('Cannot add middleware to a null pipeline');
  }

  insertMiddlewareAfter() {
    throw new Error('Cannot add middleware to a null pipeline');
  }
}

const nullPipeline = new NullActionPipeline(Symbol('NullAction'));

export class NullRepositoryPipeline {
  getPipeline(actionName) {
    return nullPipeline;
  }
}

const REPO_ACTIONS = [
  'PUSH', 'PULL', 'COMMIT', 'CLONE', 'INIT',
];

export function createRepositoryPipeline() {
  return new ActionPipelineManager({
    actionName: REPO_ACTIONS,
  });
}
