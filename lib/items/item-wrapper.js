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
    item: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.refHolder = new RefHolder();
    this.emitter = new Emitter();
    this.isDestroyed = false;
    this.hasTerminatedPendingState = false;

    this.refHolder.observe(editor => {
      this.emitter.emit('did-change-embedded-text-editor', editor);
    });

    this.state = {dynamicTitle: ''};
  }

  getTitle() {
    return this.state.dynamicTitle || this.title;
  }

  getIconName() {
    return this.props.icon;
  }

  handleTitleChanged = dynamicTitle => {
    this.setState(state => {
      if (this.state.dynamicTitle !== dynamicTitle) {
        this.emitter.emit('did-change-title', dynamicTitle);
        return {dynamicTitle};
      }
      return {};
    });
  }

  onDidChangeTitle(cb) {
    return this.emitter.on('did-change-title', cb);
  }

  destroy = () => {
    /* istanbul ignore else */
    if (this.props.needsDestroy && !this.isDestroyed) {
      this.emitter.emit('did-destroy');
      this.isDestroyed = true;
    }
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  terminatePendingState() {
    /* istanbul ignore else */
    if (this.props.needsPending && !this.hasTerminatedPendingState) {
      this.emitter.emit('did-terminate-pending-state');
      this.hasTerminatedPendingState = true;
    }
  }

  onDidTerminatePendingState(cb) {
    return this.emitter.on('did-terminate-pending-state', cb);
  }

  observeEmbeddedTextEditor(cb) {
    this.refHolder.map(editor => cb(editor));
    return this.emitter.on('did-change-embedded-text-editor', cb);
  }

  render() {
    return (
      <React.Fragment>
        {this.props.item({
          refHolder: this.refHolder,
          emitter: this.emitter,
          destroy: this.destroy,
          handleTitleChanged: this.handleTitleChanged,
        })}
      </React.Fragment>
    );
  }
}
