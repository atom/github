export default class Branch {
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

export const nullBranch = {
  getName() {
    return '';
  },

  isPresent() {
    return false;
  },
};
