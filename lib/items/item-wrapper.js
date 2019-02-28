import React from 'react';
import PropTypes from 'prop-types';

import RefHolder from '../models/ref-holder';
import {Emitter} from 'event-kit';

export default class ItemWrapper extends React.Component {

  static propTypes = {
    title: PropTypes.string,
    icon: PropTypes.string,
    needsDestroy: PropTypes.bool.isRequired,
    needsPending: PropTypes.bool.isRequired,
    needsEmbeddedTextEditor: PropTypes.bool.isRequired,
  }

  constructor(props) {
    super(props);

    this.refHolder = new RefHolder();
    this.emitter = new Emitter();
    this.isDestroyed = false;
    this.hasTerminatedPendingState = false;

    this.extra = {
      refHolder: this.refHolder,
      emitter: this.emitter,
    };

    if (this.props.needsDestroy) {
      this.extra.destroy = this.destroy;
    }

    if (this.props.needsPending) {
      this.extra.terminatePendingState = this.terminatePendingState;
      this.extra.onDidTerminatePendingState = this.onDidTerminatePendingState;
    }

  }

  getTitle() {
    return 'this.props.title';
  }

  getIconName() {
    return this.props.icon;
  }

  destroy() {
    /* istanbul ignore else */
    if (this.props.needsDestroy && !this.isDestroyed) {
      this.emitter.emit('did-destroy');
      this.isDestroyed = true;
    }
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  terminatePendingState = () => {
    debugger
    if (this.props.needsPending && !this.hasTerminatedPendingState) {
      this.emitter.emit('did-terminate-pending-state');
      this.hasTerminatedPendingState = true;
    }
  }

  onDidTerminatePendingState = (callback) => {
    console.log('onDidTerminatePendingState', 'wrapper')
    return this.emitter.on('did-terminate-pending-state', callback);
  }

  observeEmbeddedTextEditor = cb => {
    console.log('observeEmbeddedTextEditor', this)
    this.refHolder.map(editor => cb(editor));
    return this.emitter.on('did-change-embedded-text-editor', cb);
  }

  render() {
    return (
      <React.Fragment>
        {this.props.item(this.extra)}
      </React.Fragment>
    );
  }
}
