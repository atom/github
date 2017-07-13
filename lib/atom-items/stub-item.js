import {Emitter, CompositeDisposable} from 'event-kit';

let key = 0;
export default class StubItem {
  static stubsBySelector = new Map()
  static stubsBySelectorAndKey = new Map()

  // StubItems should only be created by `create` and never constructed directly.
  static create(selector, props, id = '') {
    const stub = new StubItem(selector, props, id);
    const override = {
      _getStub: () => stub,
      getElement: () => stub.getElement(),
      destroy: stub.destroy.bind(stub),
    };
    const proxy = new Proxy(override, {
      get(target, name) {
        const item = stub.getRealItem();
        if (Reflect.has(target, name)) {
          return target[name];
        } else if (item && Reflect.has(item, name)) {
          let val = item[name];
          if (typeof val === 'function') {
            val = val.bind(item);
          }
          return val;
        } else {
          let val = stub[name];
          if (typeof val === 'function') {
            val = val.bind(stub);
          }
          return val;
        }
      },
    });
    const selectorKey = `${selector}:${id}:${stub.key}`;
    this.stubsBySelector.set(`${selector}:${id}`, proxy);
    this.stubsBySelectorAndKey.set(`${selector}:${id}:${stub.key}`, proxy);
    return proxy;
  }

  static getBySelector(selector, id = '') {
    return this.stubsBySelector.get(`${selector}:${id}`);
  }

  static getBySelectorAndKey(selector, id, key) {
    return this.stubsBySelectorAndKey.get(`${selector}:${id}:${key}`);
  }

  static getElementBySelector(selector, id = '') {
    const stub = this.getBySelector(selector, id);
    if (stub) {
      return stub.getElement();
    } else {
      return null;
    }
  }

  static getElementBySelectorAndKey(selector, id, key) {
    const stub = this.getBySelectorAndKey(selector, id, key);
    if (stub) {
      return stub.getElement();
    } else {
      return null;
    }
  }

  constructor(selector, props = {}, id) {
    this.emitter = new Emitter();
    this.subscriptions = new CompositeDisposable();

    this.selector = selector;
    this.props = props;
    this.id = id;
    this.key = ++key;
    this.element = document.createElement('div');
    this.element.classList.add(`github-StubItem-${selector}`);
    this.realItem = null;
    this.realItemPromise = new Promise(res => {
      this.resolveRealItemPromise = res;
    });
  }

  setRealItem(item) {
    this.realItem = item;
    this.resolveRealItemPromise();
    this.emitter.emit('did-change-title');
    this.emitter.emit('did-change-icon');

    if (item.onDidChangeTitle) {
      this.subscriptions.add(item.onDidChangeTitle((...args) => this.emitter.emit('did-change-title', ...args)));
    }

    if (item.onDidChangeIcon) {
      this.subscriptions.add(item.onDidChangeIcon((...args) => this.emitter.emit('did-change-icon', ...args)));
    }

    if (item.onDidDestroy) {
      this.subscriptions.add(item.onDidDestroy((...args) => {
        this.realItem = null;
        this.emitter.emit('did-destroy', ...args);
      }));
    }
  }

  getRealItemPromise() {
    return this.realItemPromise;
  }

  getRealItem() {
    return this.realItem;
  }

  getTitle() {
    return this.props.title || null;
  }

  getIconName() {
    return this.props.iconName || null;
  }

  onDidChangeTitle(cb) {
    return this.emitter.on('did-change-title', cb);
  }

  onDidChangeIcon(cb) {
    return this.emitter.on('did-change-icon', cb);
  }

  getElement() {
    return this.element;
  }

  onDidDestroy(cb) {
    return this.emitter.on('did-destroy', cb);
  }

  destroy() {
    this.subscriptions.dispose();
    this.emitter.dispose();
    StubItem.stubsBySelector.delete(`${this.selector}:${this.id}`);
    StubItem.stubsBySelectorAndKey.delete(`${this.selector}:${this.id}:${this.key}`);
    if (this.actualItem) {
      this.actualItem.destroy && this.actualItem.destroy();
    }
  }
}
