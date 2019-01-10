import React from 'react';
import {Emitter} from 'event-kit';

export default class MockItem extends React.Component {

  static uriPattern = 'atom-github://mock';

  static buildURI() {
    return 'atom-github://mock';
  }

  constructor(props) {
    super(props);
    this.emitter = new Emitter();
    this.title = 'Mock Item';
    this.hasTerminatedPendingState = false;
  }

  render() {
    return (
      <div>
        <h1>mock here</h1>
      </div>
    );
  }

  destroy = () => {
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
    return {
      uri: this.getURI(),
      deserializer: 'MockItem',
    };
  }

  getTitle() {
    return this.title;
  }

  onDidChangeTitle(cb) {
    return this.emitter.on('did-change-title', cb);
  }

}
