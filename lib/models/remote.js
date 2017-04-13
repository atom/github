export default class Remote {
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  getNameOr(fallback) {
    return this.getName();
  }

  isPresent() {
    return true;
  }
}

export const nullRemote = {
  getName() {
    return '';
  },

  getNameOr(fallback) {
    return fallback;
  },

  isPresent() {
    return false;
  },
};
