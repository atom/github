import PropTypes from 'prop-types';

const betterPropTypes = new Proxy(processSpec, {
  apply(target, thisArg, argumentsList) {
    return processSpec(...argumentsList);
  },

  get(target, property, receiver) {
    if (property === 'opt' || property === 'optional') {
      return spec => {
        return betterPropTypes.shape(spec).opt;
      };
    } else if (PropTypes[property]) {
      const val = {
        _bpt: true,
        proxyFor: property,
        isRequired: true,
        args: null,
        get opt() { val.isRequired = false; return val; },
        get optional() { val.isRequired = false; return val; },
      };
      return new Proxy(() => {}, {
        apply(funcTarget, thisArg, args) {
          val.args = args.map(arg => {
            if (arg._bpt) {
              return transformProxy(arg);
            } else if (typeof arg === 'object' && !Array.isArray(arg)) {
              const innerSpec = betterPropTypes(arg);
              return PropTypes.shape(innerSpec).isRequired;
            } else {
              return arg;
            }
          });
          return val;
        },

        get(_target, prop, _receiver) {
          return val[prop];
        },

        set(_target, prop, value, _receiver) {
          val[prop] = value;
        },
      });
    } else {
      throw new Error(`Cannot proxy unknown prop type ${property}`);
    }
  },
});

function processSpec(spec) {
  Object.keys(spec).forEach(key => {
    const propType = spec[key];
    if (propType._bpt) {
      spec[key] = transformProxy(propType);
    } else if (typeof propType === 'object' && !Array.isArray(propType)) {
      const innerSpec = betterPropTypes(propType);
      spec[key] = PropTypes.shape(innerSpec).isRequired;
    }
  });

  return spec;
}

function transformProxy({proxyFor, isRequired, args}) {
  let proxied = PropTypes[proxyFor];
  if (args) {
    proxied = proxied(...args);
  }
  return isRequired ? proxied.isRequired : proxied;
}

export default betterPropTypes;
