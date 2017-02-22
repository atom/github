import React from 'react';

import Portal from './portal';

export default class Tooltip extends React.Component {
  static propTypes = {
    manager: React.PropTypes.object.isRequired,
    target: React.PropTypes.element.isRequired,
    title: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.func,
    ]),
    html: React.PropTypes.bool,
    className: React.PropTypes.string,
    placement: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.func,
    ]),
    trigger: React.PropTypes.oneOf(['hover', 'click', 'focus', 'manual']),
    showDelay: React.PropTypes.number,
    hideDelay: React.PropTypes.number,
    keyBindingCommand: React.PropTypes.string,
    keyBindingTarget: React.PropTypes.element,
    children: React.PropTypes.element,
  }

  constructor(props, context) {
    super(props, context);

    this.disposable = null;
  }

  componentWillReceiveProps(nextProps) {
    const propKeys = [
      'tooltips', 'target', 'title', 'html', 'className', 'placement', 'trigger', 'showDelay', 'hideDelay',
      'keyBindingCommand', 'keyBindingTarget', 'children',
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

    this.disposable = props.tooltips.add(props.target, options);
  }
}
