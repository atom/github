/** @babel */

class Source {

  constructor(name) {
    this.name = name.toLowerCase();
  }

  when(actions) {
    const chosen = actions[this.name] || actions.default || (() => {
      throw new Error(`Unexpected conflict side source: ${this.name}`);
    });
    return chosen();
  }

  toString() {
    return `<Source: ${this.name.toUpperCase()}>`;
  }

}

export const OURS = new Source('OURS');
export const THEIRS = new Source('THEIRS');
export const BASE = new Source('BASE');
