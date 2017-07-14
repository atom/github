let statePerType = new WeakMap();

export default class {
  static clearSavedState() {
    statePerType = new WeakMap();
  }

  constructor(type, {initialModel, save, restore}) {
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
    const data = this.saveData();
    this.model && this.statePerModel.set(this.model, data);
  }

  restore(model) {
    model && this.restoreData(this.statePerModel.get(model));
    this.model = model;
  }

  setStateForModel(model, state) {
    this.statePerModel.set(model, state);
  }

  getStateForModel(model) {
    return this.statePerModel.get(model) || {};
  }
}
