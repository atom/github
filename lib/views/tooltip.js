import React from 'react';
import PropTypes from 'prop-types';

import Portal from './portal';

export default class Tooltip extends React.Component {
  static propTypes = {
    manager: PropTypes.object.isRequired,
    target: PropTypes.func.isRequired,
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

    this.disposable = null;
  }

  componentWillReceiveProps(nextProps) {
    const propKeys = [
      'tooltips', 'title', 'html', 'className', 'placement', 'trigger', 'showDelay', 'hideDelay',
      'keyBindingCommand', 'keyBindingTarget',
    ];

    if (propKeys.some(key => this.props[key] !== nextProps[key])) {
      this.disposable && this.disposable.dispose();
      this.disposable = null;

      this.setupTooltip(nextProps);
    }
  }

  componentDidMount() {
    this.setupTooltip(this.props);
  }

  render() {
    if (this.props.children !== undefined) {
      return (
        <Portal ref={c => { this.portal = c; }}>{this.props.children}</Portal>
      );
    } else {
      return null;
    }
  }

  componentWillUnmount() {
    this.disposable && this.disposable.dispose();
  }

  setupTooltip(props) {
    if (this.disposable) {
      return;
    }

    const options = {};
    ['title', 'html', 'placement', 'trigger', 'keyBindingCommand', 'keyBindingTarget'].forEach(key => {
      if (props[key] !== undefined) {
        options[key] = props[key];
      }
    });
    if (props.className !== undefined) {
      options.class = props.className;
    }
    if (props.showDelay !== undefined || props.hideDelay !== undefined) {
      const delayDefaults = (props.trigger === 'hover' || props.trigger === undefined)
        && {show: 1000, hide: 100}
        || {show: 0, hide: 0};

      options.delay = {
        show: props.showDelay !== undefined ? props.showDelay : delayDefaults.show,
        hide: props.hideDelay !== undefined ? props.hideDelay : delayDefaults.hide,
      };
    }
    if (props.children !== undefined) {
      options.item = this.portal;
    }

    const target = this.getCurrentTarget(props);
    if (target) {
      this.disposable = props.manager.add(target, options);
    }
  }

  getCurrentTarget(props) {
    const target = props.target();
    if (target && target.element !== undefined) {
      return target.element;
    } else {
      return target;
    }
  }
}
