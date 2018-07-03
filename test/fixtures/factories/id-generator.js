const IDGEN = Symbol('id-generator');

export default class IDGenerator {
  static fromOpts(opts = {}) {
    return opts[IDGEN] || new this();
  }

  constructor() {
    this.current = 0;
  }

  generate(prefix = '') {
    const id = this.current;
    this.current++;
    return `${prefix}${id}`;
  }

  embed() {
    return {[IDGEN]: this};
  }
}
