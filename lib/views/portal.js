import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';

/**
 * `Portal` is a mechanism for rendering a React subtree at a different place
 * in the DOM.
 *
 *    <Portal type="span" className="portal-class" appendNode={true}>
 *      <Stuff />
 *    </Portal>
 *
 * Given the above example, there will be a span with the class "portal-class"
 * created and appended to the document body, and then `<Stuff />` will be
 * rendered into it. Note that this uses `createPortal`
 * to preserve context in the subtree.
 *
 * `getElement()` allows access to the React subtree container element.
 * `getRenderedSubtree()` allows access to the rendered subtree instance
 * (`Stuff` in the example above).
 *
 * Pass `false` (the default) to `appendNode` to skip adding the node to the
 * DOM. `type` defaults to "div" and `className` defaults to
 * "react-atom-portal".
 */
export default class Portal extends React.Component {
  static propTypes = {
    type: PropTypes.string,
    className: PropTypes.string,
    appendNode: PropTypes.bool,
    getDOMNode: PropTypes.func,
    children: PropTypes.element.isRequired,
  }

  static defaultProps = {
    type: 'div',
    className: 'react-atom-portal',
    appendNode: false,
    getDOMNode: null,
  }

  constructor(props, context) {
    super(props, context);

    let node;
    if (props.getDOMNode) {
      node = props.getDOMNode();
    }

    if (!node) {
      node = document.createElement(props.type);
      node.className = props.className;
    }

    this.node = node;

    if (props.appendNode) {
      document.body.appendChild(node);
    }
  }

  componentWillUnmount() {
    if (this.props.appendNode) {
      document.body.removeChild(this.state.node);
    }
  }

  render() {
    const child = React.Children.only(this.props.children);
    return ReactDom.createPortal(React.cloneElement(child, {ref: c => { this.subtree = c; }}), this.node);
  }

  getRenderedSubtree() {
    return this.subtree;
  }

  getElement() {
    return this.state.node;
  }

  getView() {
    if (this.view) {
      return this.view;
    }

    const override = {
      getPortal: () => this,
      getInstance: () => this.subtree,
      getElement: this.getElement.bind(this),
    };

    this.view = new Proxy(override, {
      get(target, name) {
        if (Reflect.has(target, name)) {
          return target[name];
        }

        return target.getInstance()[name];
      },

      set(target, name, value) {
        target.getInstance()[name] = value;
      },

      has(target, name) {
        return Reflect.has(target.getInstance(), name) || Reflect.has(target, name);
      },
    });
    return this.view;
  }
}
