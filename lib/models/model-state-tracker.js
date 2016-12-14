/** @babel */

export default class ModelStateTracker {
  constructor({initialModel, initialContext, serialize, deserialize} = {}) {
    this.statePerModel = new WeakMap();
    this.serializeMethod = serialize;
    this.deserializeMethod = deserialize;
    this.currentModel = null;
    this.context = null;

    this.setContext(initialContext || null);
    this.setModel(initialModel || null);
  }

  setModel(model) {
    if (model === this.currentModel) { return; }

    try {
      this.saveState(this.currentModel);
      this.loadState(model);
    } finally {
      this.currentModel = model;
    }
  }

  setContext(context) {
    this.context = context;
  }

  saveState(model) {
    if (!this.serializeMethod) { throw new Error('No serialize method defined'); }

    if (model) {
      const state = this.serializeMethod(model, this.context);
      this.statePerModel.set(model, state);
    }
  }

  loadState(model) {
    if (!this.deserializeMethod) { throw new Error('No deserialize method defined'); }

    let state;
    if (model && this.statePerModel.has(model)) {
      state = this.statePerModel.get(model);
    }
    this.deserializeMethod(state, model, this.context);
  }
}
