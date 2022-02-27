import React from 'react';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';

const Courier = React.createContext(null);

class PostOffice {
  constructor(parent) {
    this.parent = parent;
    this.providers = {};
    this.subscriptionsByInstance = new Map();
    this.dirty = new Set();
  }

  registerProviders(registerFn) {
    registerFn({
      provider: (name, callback) => {
        if (!this.providers[name]) {
          this.providers[name] = {
            properties: {},
          };
        }

        const provider = this.providers[name];

        const initProperty = {
          lastModel: undefined,
          value: undefined,
          loading: false,
          error: null,
          subscribers: new Set(),
        };

        callback({
          syncProperty: (propertyName, getter) => {
            provider.properties[propertyName] = {getter, async: false, ...initProperty};
          },

          asyncProperty: (propertyName, getter) => {
            provider.properties[propertyName] = {getter, async: true, ...initProperty};
          },
        });
      },
    });
  }

  provideModel(name, model) {
    const provider = this.providers[name];
    for (const propertyName in provider.properties) {
      const property = provider.properties[propertyName];
      property.lastModel = model;
      property.error = null;
      const oldValue = property.value;

      if (property.async) {
        property.loading = true;
        property.getter(model).then(value => {
          if (property.lastModel === model) {
            property.value = value;
            property.loading = false;

            if (!Object.is(value, oldValue)) {
              for (const instance of property.subscribers) {
                this.dirty.add(instance);
              }
              this.triggerUpdateForLoadedSubscribers(property);
            }
          }
        }, error => {
          if (property.lastModel === model) {
            property.error = error;
            property.loading = false;
            this.triggerUpdateForLoadedSubscribers(property);
          }
        });
      } else {
        property.loading = false;
        property.value = property.getter(model);
        if (!Object.is(property.value, oldValue)) {
          for (const instance of property.subscribers) {
            this.dirty.add(instance);
          }
        }
      }
    }
  }

  bind(instance) {
    let m = instance.m;
    if (m) {
      const parentIsLoading = m.isLoading;
      m.isLoading = () => parentIsLoading() || this.subscriptionsByInstance.get(instance).some(p => p.loading);
    } else {
      m = {};
      Object.defineProperty(instance, 'm', {
        value: m,
        writable: false,
      });
      m.isLoading = () => this.subscriptionsByInstance.get(instance).some(p => p.loading);
    }

    const channels = instance.constructor.mailbox;
    const subscribedProperties = [];
    for (const providerName in channels) {
      const propertyNames = channels[providerName];

      let p = m[providerName];
      if (!p) {
        p = {};
        Object.defineProperty(m, providerName, {
          value: p,
          writable: false,
        });
      }

      // TODO fail on unknown provider or property name
      const provider = this.providers[providerName];
      for (const propertyName of propertyNames) {
        const property = provider.properties[propertyName];
        property.subscribers.add(instance);
        subscribedProperties.push(property);

        Object.defineProperty(p, propertyName, {
          get() { return property.value; },
        });
      }
    }

    this.subscriptionsByInstance.set(instance, subscribedProperties);
    this.dirty.add(instance);

    return new Disposable(() => {
      for (const providerName in channels) {
        const propertyNames = channels[providerName];

        const provider = this.providers[providerName];
        if (!provider) {
          continue;
        }

        for (const propertyName of propertyNames) {
          provider.properties[propertyName].subscribers.delete(instance);
        }
      }

      this.subscriptionsByInstance.delete(instance);
    });
  }

  triggerUpdates() {
    return Promise.all(
      Array.from(this.dirty, instance => new Promise(resolve => instance.forceUpdate(resolve))),
    );
  }

  triggerUpdateForLoadedSubscribers(property) {
    const promises = [];
    for (const instance of property.subscribers) {
      if (!this.subscriptionsByInstance.get(instance).some(p => p.loading)) {
        promises.push(new Promise(resolve => instance.forceUpdate(resolve)));
      }
    }
    return Promise.all(promises);
  }

  didRender(instance) {
    this.dirty.delete(instance);
  }
}

function installAround(proto, methodName, before, after) {
  const existing = proto[methodName] || (() => {});
  proto[methodName] = function(...args) {
    if (before) { before.apply(this, args); }
    const returnValue = existing.apply(this, args);
    if (after) { after.apply(this, args); }
    return returnValue;
  };
}

function register(Component) {
  // TODO fail if contextType is already set to something else
  Component.contextType = Courier;

  let bound = false;
  let binding = new Disposable();

  // eslint-disable-next-line prefer-arrow-callback
  installAround(Component.prototype, 'render', function() {
    if (!bound) {
      binding = this.context.bind(this);
      bound = true;
    }
  }, function() {
    this.context.didRender(this);
  });

  installAround(Component.prototype, 'componentWillUnmount', null, () => {
    binding.dispose();
  });

  return Component;
}

class Provider extends React.Component {
  static contextType = Courier;

  static propTypes = {
    registerProviders: PropTypes.func.isRequired,
    children: PropTypes.node,
  }

  constructor(props) {
    super(props);

    this.office = new PostOffice(this.context);
  }

  render() {
    this.office.registerProviders(this.props.registerProviders);

    for (const propName in this.props) {
      if (propName === 'registerProviders' || propName === 'children') {
        continue;
      }

      this.office.provideModel(propName, this.props[propName]);
    }

    return (
      <Courier.Provider value={this.office}>
        {this.props.children}
      </Courier.Provider>
    );
  }

  componentDidUpdate() {
    this.office.triggerUpdates();
  }
}

export default {
  Provider,
  register,
};
