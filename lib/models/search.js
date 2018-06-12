export default class Search {
  constructor(name, query) {
    this.name = name;
    this.query = query;
  }

  getName() {
    return this.name;
  }

  createQuery() {
    return this.query;
  }
}
