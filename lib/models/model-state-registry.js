import {Emitter} from 'event-kit';

let statePerType = new WeakMap();

export default class {
  static clearSavedState() {
    statePerType = new WeakMap();
  }

  constructor(type, {initialModel, save, restore}) {
    this.emitter = new Emitter();
    this.saveData = save;
    this.restoreData = restore;
    if (statePerType.has(type)) {
      this.statePerModel = statePerType.get(type);
    } else {
      this.statePerModel = new WeakMap();
      statePerType.set(type, this.statePerModel);
    }
    this.setModel(initialModel);
  }

  setModel(model) {
    if (model !== this.model) {
      this.save();
      this.restore(model);
    }
  }

  save() {
    if (this.model) {
      const data = this.saveData();
      this.statePerModel.set(this.model, data);
      this.emitter.emit('did-update', {model: this.model, data});
    }
  }

  restore(model) {
    model && this.restoreData(this.statePerModel.get(model));
    this.model = model;
  }

  setStateForModel(model, state) {
    // TODO: change to extend current state
    this.statePerModel.set(model, state);
  }

  getStateForModel(model) {
    return this.statePerModel.get(model) || {};
  }

  onDidUpdate(cb) {
    return this.emitter.on('did-update', cb);
  }

  destroy() {
    this.emitter.dispose();
  }
}
