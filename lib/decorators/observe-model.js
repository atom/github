import React from 'react';

import ModelObserver from '../models/model-observer';

/**
 * Wraps a component in a HOC that watches for a model to change
 * and passes data to the wrapped component as props.
 * Utilizes `ModelObserver` to watch for model changes.
 *
 *   @ObserveModel({
 *     // getModel takes the props passed to the outer component
 *     // and should return the model to watch; defaults to `props.model`
 *     getModel: props => props.repository,
 *     // fetchData takes the model instance and the props passed
 *     // to the outer component and should return an object (or promise
 *     // of an object) specifying the data to be passed to the
 *     // inner component as props
 *     fetchData: (repo, props) => ({ stuff: repo.getStuff() }),
 *   })
 *   class MyComponent extends React.Component { ... }
 */
export default function ObserveModel(spec) {
  const getModel = spec.getModel || (props => props.model);
  const fetchData = spec.fetchData || (() => {});

  return function(Target) {
    class Wrapper extends React.Component {
      static displayName = `ObserveModel(${Target.name})`

      static getWrappedComponentClass() {
        return Target;
      }

      constructor(props, context) {
        super(props, context);
        this.mounted = true;
        this.resolve = () => {};

        this.state = {
          modelData: {},
        };

        this.modelObserver = new ModelObserver({
          fetchData: model => fetchData(model, this.props),
          didUpdate: () => {
            if (this.mounted) {
              this.setState({modelData: this.modelObserver.getActiveModelData()}, this.resolve);
            }
          },
        });
      }

      componentWillMount() {
        this.modelObserver.setActiveModel(getModel(this.props));
      }

      componentWillReceiveProps(nextProps) {
        this.modelObserver.setActiveModel(getModel(nextProps));
      }

      render() {
        const data = this.state.modelData;
        return <Target ref={c => { this.wrapped = c; }} {...data} {...this.props} />;
      }

      getWrappedComponentInstance() {
        return this.wrapped;
      }

      componentWillUnmount() {
        this.mounted = false;
        this.modelObserver.destroy();
      }

      refreshModelData() {
        return new Promise(resolve => {
          this.resolve = resolve;

          const model = getModel(this.props);
          if (model !== this.modelObserver.getActiveModel()) {
            this.modelObserver.setActiveModel(model);
          } else {
            this.modelObserver.refreshModelData();
          }
        });
      }
    }

    Object.getOwnPropertyNames(Target).forEach(key => {
      if (typeof Target[key] === 'function') {
        Object.defineProperty(Wrapper, key, {
          value(...args) {
            return Target[key](...args);
          },
          enumerable: false,
          configurable: true,
        });
      }
    });

    return Wrapper;
  };
}
