class Source {

  constructor(name, uiString, cssClass) {
    this.name = name.toLowerCase();

    this.uiString = uiString;
    this.cssClass = cssClass;
  }

  when(actions) {
    const chosen = actions[this.name] || actions.default || (() => {
      throw new Error(`Unexpected conflict side source: ${this.name}`);
    });
    return chosen();
  }

  getSideCSSClass() {
    return this.cssClass;
  }

  getBannerCSSClass() {
    return this.getSideCSSClass() + '-banner';
  }

  toUIString() {
    return this.uiString;
  }

  toString() {
    return `<Source: ${this.name.toUpperCase()}>`;
  }

}

export const OURS = new Source('OURS', 'our changes', 'conflict-ours');
export const THEIRS = new Source('THEIRS', 'their changes', 'conflict-theirs');
export const BASE = new Source('BASE', 'common ancestor', 'conflict-base');
