/** @babel */

let statePerType = new WeakMap();

export default class {
  static clearSavedState() {
    statePerType = new WeakMap();
  }

  constructor(type, {initialModel, save, restore}) {
    this.save = save;
    this.restore = restore;
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
      this.model && this.statePerModel.set(this.model, this.save());
      model && this.restore(this.statePerModel.get(model));
      this.model = model;
    }
  }
}
