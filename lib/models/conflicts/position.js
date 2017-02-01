class Position {

  constructor(name) {
    this.name = name.toLowerCase();
  }

  getName() {
    return this.name;
  }

  when(actions) {
    const chosen = actions[this.name] || actions.default || (() => {
      throw new Error(`Unexpected conflict side position: ${this.name}`);
    });
    return chosen();
  }

  toString() {
    return `<Position: ${this.name.toUpperCase()}>`;
  }

}

export const TOP = new Position('TOP');
export const MIDDLE = new Position('MIDDLE');
export const BOTTOM = new Position('BOTTOM');
