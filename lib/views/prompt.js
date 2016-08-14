/** @babel */
/** @jsx etch.dom */
import {CompositeDisposable} from 'atom'

import etch from 'etch'

export default class Prompt {
  constructor ({message, onSubmit, onCancel}) {
    this.message = message
    this.onSubmit = onSubmit
    this.onCancel = onCancel
    etch.initialize(this)
    this.subscriptions = new CompositeDisposable(
      atom.commands.add(this.element, 'core:cancel', () => this.cancel()),
      atom.commands.add(this.element, 'core:confirm', () => this.confirm())
    )
    setTimeout(() => this.refs.input.getElement().focus())
  }

  update () {}

  render () {
    const TextEditor = atom.workspace.buildTextEditor
    return (
      <div className='git-Prompt'>
        <div className='git-Prompt-label'>{this.message}</div>
        <TextEditor ref='input' className='git-Prompt-input' mini />
      </div>
    )
  }

  confirm () {
    this.onSubmit(this.refs.input.getText())
  }

  cancel () {
    this.onCancel()
  }

  destroy (removeDomNode) {
    this.subscriptions.dispose()
    return etch.destroy(this, removeDomNode)
  }
}
