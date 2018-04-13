import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';

import {RefHolderPropType} from '../prop-types';
import {createItem} from '../helpers';

export default class Tooltip extends React.Component {
  static propTypes = {
    manager: PropTypes.object.isRequired,
    target: RefHolderPropType.isRequired,
    title: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.func,
    ]),
    html: PropTypes.bool,
    className: PropTypes.string,
    placement: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.func,
    ]),
    trigger: PropTypes.oneOf(['hover', 'click', 'focus', 'manual']),
    showDelay: PropTypes.number,
    hideDelay: PropTypes.number,
    keyBindingCommand: PropTypes.string,
    keyBindingTarget: PropTypes.element,
    children: PropTypes.element,
  }

  constructor(props, context) {
    super(props, context);

    this.tooltipSub = new Disposable();
    this.refSub = new Disposable();

    this.domNode = null;
    if (this.props.children !== undefined) {
      this.domNode = document.createElement('div');
      this.domNode.className = 'react-atom-tooltip';
    }
  }

  componentDidMount() {
    this.setupTooltip();
  }

  render() {
    if (this.props.children !== undefined) {
      return ReactDOM.createPortal(
        this.props.children,
        this.domNode,
      );
    } else {
      return null;
    }
  }

  shouldComponentUpdate(nextProps) {
    const propKeys = [
      'tooltips', 'title', 'html', 'className', 'placement', 'trigger', 'showDelay', 'hideDelay',
      'keyBindingCommand', 'keyBindingTarget',
    ];

    return propKeys.some(key => this.props[key] !== nextProps[key]);
  }

  componentDidUpdate() {
    this.tooltipSub && this.tooltipSub.dispose();
    this.tooltipSub = null;
    this.setupTooltip();
  }

  componentWillUnmount() {
    this.disposable && this.disposable.dispose();
  }

  setupTooltip() {
    if (this.tooltipSub) {
      return;
    }

    const options = {};
    ['title', 'html', 'placement', 'trigger', 'keyBindingCommand', 'keyBindingTarget'].forEach(key => {
      if (this.props[key] !== undefined) {
        options[key] = this.props[key];
      }
    });
    if (this.props.className !== undefined) {
      options.class = this.props.className;
    }
    if (this.props.showDelay !== undefined || this.props.hideDelay !== undefined) {
      const delayDefaults = (this.props.trigger === 'hover' || this.props.trigger === undefined)
        && {show: 1000, hide: 100}
        || {show: 0, hide: 0};

      options.delay = {
        show: this.props.showDelay !== undefined ? this.props.showDelay : delayDefaults.show,
        hide: this.props.hideDelay !== undefined ? this.props.hideDelay : delayDefaults.hide,
      };
    }
    if (this.props.children !== undefined) {
      options.item = createItem(this.domNode, this.props.children);
    }

    this.refSub = this.target.observe(t => {
      this.tooltipSub = this.props.manager.add(t, options);
    });
  }
}
