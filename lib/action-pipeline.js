function partial(fn, ...args) {
  return function wrapped() {
    return fn(...args);
  };
}

export class ActionPipeline {
  constructor(action) {
    this.action = action;
    this.middleware = [];
    this.middlewareNames = [];
  }

  run(fn, ...args) {
    // eslint-disable-next-line prefer-spread
    return this.middleware
      .map(middleware => middleware.fn)
      .reduceRight((acc, nextFn) => partial(nextFn, acc, ...args), partial(fn, ...args))
      .apply(undefined, args);
  }

  addMiddleware(name, fn) {
    if (!name) {
      throw new Error('Middleware must be registered with a unique middleware name');
    }

    if (this.middleware.some(mw => name === mw.name)) {
      throw new Error(`A middleware with the name ${name} is already registered`);
    }

    this.middleware.push({name, fn});
  }

  removeMiddleware(name) {
    this.middleware = this.middleware.filter(mw => mw.name !== name);
  }

  insertMiddlewareBefore(needle, name, fn) {
    const index = this.middleware.findIndex(middleware => middleware.name === needle);
    if (index === -1) {
      throw new Error(`Cannot find existing middleware ${needle}`);
    }

    this.middleware.splice(index, 0, {name, fn});
  }

  insertMiddlewareAfter(needle, name, fn) {
    const index = this.middleware.findIndex(middleware => middleware.name === needle);
    if (index === -1) {
      throw new Error(`Cannot find existing middleware ${needle}`);
    }

    this.middleware.splice(index + 1, 0, {name, fn});
  }
}

export class ActionPipelineManager {
  constructor({actionNames}) {
    this.actions = {};
    this.pipelines = new Map();

    actionNames.forEach(actionName => {
      const key = Symbol(actionName);
      this.actions[actionName] = key;
      this.pipelines.set(key, new ActionPipeline(key));
    });
  }

  getPipeline(action) {
    if (!action || !this.pipelines.has(action)) {
      throw new Error(`${action} is not a known action`);
    }

    return this.pipelines.get(action);
  }
}
