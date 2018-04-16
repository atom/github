import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import {createItem} from '../helpers';
import RefHolderPropType from '../prop-types';

export default class Decoration extends React.Component {
  static propTypes = {
    editor: PropTypes.object.isRequired,
    marker: PropTypes.object.isRequired,
    type: PropTypes.oneOf(['line', 'line-number', 'highlight', 'overlay', 'gutter', 'block']).isRequired,
    position: PropTypes.oneOf(['head', 'tail', 'before', 'after']),
    className: PropTypes.string,
    children: PropTypes.element,
    itemHolder: RefHolderPropType,
    options: PropTypes.object,
  }

  static defaultProps = {
    options: {},
    position: 'head',
  }

  constructor(props, context) {
    super(props, context);

    this.decoration = null;
    this.subscriptions = new CompositeDisposable();

    this.domNode = null;
    if (['gutter', 'overlay', 'block'].includes(this.props.type)) {
      this.domNode = document.createElement('div');
      this.domNode.className = 'react-atom-decoration';
    }
  }

  usesItem() {
    return this.domNode !== null;
  }

  componentDidMount() {
    this.setupDecoration();
  }

  shouldComponentUpdate(nextProps) {
    if (
      this.props.editor !== nextProps.editor ||
      this.props.marker !== nextProps.marker ||
      this.props.type !== nextProps.type ||
      this.props.position !== nextProps.position ||
      this.props.className !== nextProps.className ||
      this.props.children !== nextProps.children
    ) { return true; }

    // Compare additional options.
    const optionKeys = Object.keys(this.props.options);
    const nextOptionKeys = Object.keys(nextProps.options);

    if (optionKeys.length !== nextOptionKeys.length) {
      return true;
    } else {
      for (let i = 0; i < optionKeys.length; i++) {
        const key = optionKeys[i];
        if (this.props.options[key] !== nextProps.options[key]) {
          return true;
        }
      }
    }

    return false;
  }

  componentDidUpdate() {
    this.decoration && this.decoration.destroy();
    this.setupDecoration();
  }

  render() {
    if (this.usesItem()) {
      return ReactDOM.createPortal(
        this.props.children,
        this.domNode,
      );
    } else {
      return null;
    }
  }

  setupDecoration() {
    if (this.decoration) {
      return;
    }

    let item = null;
    if (this.usesItem()) {
      item = createItem(this.domNode, this.props.itemHolder);
    }

    const options = {
      ...this.props.options,
      type: this.props.type,
      position: this.props.position,
      class: this.props.className,
      item,
    };

    this.decoration = this.props.editor.decorateMarker(this.props.marker, options);
    this.subscriptions.add(this.decoration.onDidDestroy(() => {
      this.decoration = null;
      this.subscriptions.dispose();
    }));
  }

  componentWillUnmount() {
    this.decoration && this.decoration.destroy();
    this.subscriptions.dispose();
  }
}
