/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */
import {CompositeDisposable} from 'atom';

import etch from 'etch';

export default class Prompt {
  constructor({message, onSubmit, onCancel}) {
    this.message = message;
    this.onSubmit = onSubmit;
    this.onCancel = onCancel;
    this.focusInput = this.focusInput.bind(this);
    etch.initialize(this);
    this.subscriptions = new CompositeDisposable(
      atom.commands.add(this.element, 'core:cancel', () => this.cancel()),
      atom.commands.add(this.element, 'core:confirm', () => this.confirm()),
    );
    setTimeout(() => this.focusInput());
  }

  update() {}

  render() {
    return (
      <div className="github-Prompt native-key-bindings" ref="prompt" onclick={this.focusInput}>
        <div className="github-Prompt-label">{this.message}</div>
        <input type="password" ref="input" className="github-Prompt-input input-text" />
      </div>
    );
  }

  confirm() {
    this.onSubmit(this.refs.input.value);
  }

  cancel() {
    this.onCancel();
  }

  focusInput() {
    this.refs.input.focus();
  }

  destroy(removeDomNode) {
    this.subscriptions.dispose();
    return etch.destroy(this, removeDomNode);
  }
}
