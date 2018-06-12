export default class Search {
  constructor(name, query) {
    this.name = name;
    this.query = query;
  }

  createQuery() {
    return this.query;
  }
}
