/** @jsx etch.dom */

import etch from 'etch';
import {autobind} from 'core-decorators';

export default class Tooltip {
  constructor({active, text, ...otherProps}, children) {
    this.active = active;
    this.text = text;
    this.children = children;
    this.otherProps = otherProps;
    this.handleMouseOut = this.handleMouseOut;
    this.handleMouseOver = this.handleMouseOver;
    etch.initialize(this);
  }

  update({active, text, ...otherProps}, children) {
    this.active = active;
    this.text = text;
    this.children = children;
    this.otherProps = otherProps;
    return etch.update(this);
  }

  @autobind
  handleMouseOut() {
    if (this.tooltipDisposable) {
      this.tooltipDisposable.dispose();
      this.tooltipDisposable = null;
    }
  }

  @autobind
  handleMouseOver() {
    if (this.active && !this.tooltipDisposable) {
      const element = this.element;
      this.tooltipDisposable = atom.tooltips.add(element, {title: this.text, trigger: 'manual'});
    }
  }

  render() {
    return (
      <div {...this.otherProps} onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        {this.children}
      </div>
    );
  }

  destroy() {
    this.tooltipDisposable && this.tooltipDisposable.dispose();
    etch.destroy(this);
  }
}
