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
    console.log(this.model);
    console.warn('set model data', data, this.model && this.model.getWorkingDirectoryPath());
    this.model && this.statePerModel.set(this.model, data);
  }

  restore(model) {
    model && this.restoreData(this.statePerModel.get(model));
    this.model = model;
  }

  getStateForModel(model) {
    console.log(model, this.statePerModel);
    console.log(this.statePerModel.get(model));
    return this.statePerModel.get(model) || {};
  }
}
