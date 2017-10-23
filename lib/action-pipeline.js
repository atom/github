function partial(fn, ...args) {
  return function wrapped() {
    return fn(...args);
  };
}

export class ActionPipeline {
  constructor(actionKey) {
    this.actionKey = actionKey;
    this.middleware = [];
  }

  run(fn, ...args) {
    const pipelineFn = this.middleware
      .map(middleware => middleware.fn)
      .reduceRight((acc, nextFn) => partial(nextFn, acc, ...args), partial(fn, ...args));
    return pipelineFn(...args);
  }

  addMiddleware(name, fn) {
    if (!name) {
      throw new Error('Middleware must be registered with a unique middleware name');
    }

    if (this.middleware.find(middleware => middleware.name === name)) {
      throw new Error(`A middleware with the name ${name} is already registered`);
    }

    this.middleware.push({name, fn});
  }
}

export class ActionPipelineManager {
  constructor({actionNames}) {
    this.pipelines = new Map();
    this.actionKeys = {};
    actionNames.forEach(actionName => {
      const actionKey = Symbol(actionName);
      this.actionKeys[actionName] = actionKey;
      this.pipelines.set(actionKey, new ActionPipeline(actionKey));
    });
  }

  getPipeline(actionKey) {
    const pipeline = this.pipelines.get(actionKey);
    if (actionKey && pipeline) {
      return pipeline;
    } else {
      throw new Error('${actionKey} is not a known action');
    }
  }
}
