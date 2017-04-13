import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import Portal from './portal';

export default class Decoration extends React.Component {
  static propTypes = {
    editor: PropTypes.object.isRequired,
    marker: PropTypes.object.isRequired,
    type: PropTypes.oneOf(['line', 'line-number', 'highlight', 'overlay', 'gutter', 'block']).isRequired,
    position: PropTypes.oneOf(['head', 'tail', 'before', 'after']),
    className: PropTypes.string,
    children: PropTypes.element,
    getItem: PropTypes.func,
    options: PropTypes.object,
  }

  static defaultProps = {
    options: {},
    position: 'head',
    getItem: ({portal, subtree}) => portal,
  }

  constructor(props, context) {
    super(props, context);

    this.decoration = null;
    this.subscriptions = new CompositeDisposable();
  }

  usesItem() {
    return this.props.type === 'gutter' || this.props.type === 'overlay' || this.props.type === 'block';
  }

  componentWillReceiveProps(nextProps) {
    let recreationRequired = this.props.editor !== nextProps.editor ||
      this.props.marker !== nextProps.marker ||
      this.props.type !== nextProps.type ||
      this.props.position !== nextProps.position ||
      this.props.className !== nextProps.className ||
      this.props.getItem !== nextProps.getItem ||
      this.props.children !== nextProps.children;

    if (!recreationRequired) {
      // Compare additional options.
      const optionKeys = Object.keys(this.props.options);
      const nextOptionKeys = Object.keys(nextProps.options);

      if (optionKeys.length !== nextOptionKeys.length) {
        recreationRequired = true;
      } else {
        for (let i = 0; i < optionKeys.length; i++) {
          const key = optionKeys[i];
          if (this.props.options[key] !== nextProps.options[key]) {
            recreationRequired = true;
            break;
          }
        }
      }
    }

    if (recreationRequired) {
      this.decoration && this.decoration.destroy();
      this.setupDecoration(nextProps);
    }
  }

  componentDidMount() {
    this.setupDecoration(this.props);
  }

  render() {
    if (this.usesItem()) {
      return <Portal ref={c => { this.portal = c; }}>{this.props.children}</Portal>;
    } else {
      return null;
    }
  }

  setupDecoration(props) {
    if (this.decoration) {
      return;
    }

    let item = null;
    if (this.usesItem()) {
      item = props.getItem({portal: this.portal, subtree: this.portal.getRenderedSubtree()});
    }

    const options = {
      ...props.options,
      type: props.type,
      position: props.position,
      class: props.className,
      item,
    };

    this.decoration = props.editor.decorateMarker(props.marker, options);
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
