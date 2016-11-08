/** @babel */
/** @jsx etch.dom */
import {CompositeDisposable} from 'atom'

import etch from 'etch'

export default class Prompt {
  constructor ({message, onSubmit, onCancel}) {
    this.message = message
    this.onSubmit = onSubmit
    this.onCancel = onCancel
    this.focusInput = this.focusInput.bind(this)
    etch.initialize(this)
    this.subscriptions = new CompositeDisposable(
      atom.commands.add(this.element, 'core:cancel', () => this.cancel()),
      atom.commands.add(this.element, 'core:confirm', () => this.confirm())
    )
    setTimeout(() => this.focusInput())
  }

  update () {}

  render () {
    return (
      <div className='git-Prompt native-key-bindings' ref='prompt' onclick={this.focusInput}>
        <div className='git-Prompt-label'>{this.message}</div>
        <input type='password' ref='input' className='git-Prompt-input'/>
      </div>
    )
  }

  confirm () {
    this.onSubmit(this.refs.input.value)
  }

  cancel () {
    this.onCancel()
  }

  focusInput () {
    this.refs.input.focus()
  }

  destroy (removeDomNode) {
    this.subscriptions.dispose()
    return etch.destroy(this, removeDomNode)
  }
}
