export default class TabGroup {
  constructor() {
    this.nodesByElement = new Map();
    this.lastElement = null;
    this.autofocusTarget = null;
  }

  appendElement(element, autofocus) {
    const lastNode = this.nodesByElement.get(this.lastElement) || {next: element, previous: element};
    const next = lastNode.next;
    const previous = this.lastElement || element;

    this.nodesByElement.set(element, {next, previous});
    this.nodesByElement.get(lastNode.next).previous = element;
    lastNode.next = element;

    this.lastElement = element;

    if (autofocus && this.autofocusTarget === null) {
      this.autofocusTarget = element;
    }
  }

  removeElement(element) {
    const node = this.nodesByElement.get(element);
    if (node) {
      const beforeNode = this.nodesByElement.get(node.previous);
      const afterNode = this.nodesByElement.get(node.next);

      beforeNode.next = node.next;
      afterNode.previous = node.previous;
    }
    this.nodesByElement.delete(element);
  }

  after(element) {
    const node = this.nodesByElement.get(element) || {next: undefined};
    return node.next;
  }

  focusAfter(element) {
    const after = this.after(element);
    after && after.focus();
  }

  before(element) {
    const node = this.nodesByElement.get(element) || {previous: undefined};
    return node.previous;
  }

  focusBefore(element) {
    const before = this.before(element);
    before && before.focus();
  }

  autofocus() {
    this.autofocusTarget && this.autofocusTarget.focus();
  }
}
