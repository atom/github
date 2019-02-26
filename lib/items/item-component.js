import React from 'react';
import RefHolder from '../models/ref-holder';
import {Emitter} from 'event-kit';
import {autobind} from '../helpers';

export default class ItemComponent extends React.Component {

  constructor(props, {title, icon}) {
    super(props);
    autobind(this, 'destroy');

    this.title = title;
    this.icon = icon;

    this.refHolder = new RefHolder();
    this.emitter = new Emitter();
    this.isDestroyed = false;
    this.hasTerminatedPendingState = false;
  }

  getTitle() {
    return this.title;
  }

  getIconName() {
    return this.icon;
  }

  destroy() {
    /* istanbul ignore else */
    if (!this.isDestroyed) {
      this.emitter.emit('did-destroy');
      this.isDestroyed = true;
    }
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  serialize() {
    return {};
  }

  render() {
    return null;
  }
}
