export default class Remote {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  isPresent() {
    return true;
  }
}

export const nullRemote = {
  getName() {
    return '';
  },

  isPresent() {
    return false;
  },
};
