/* @flow */
/** @jsx etch.dom */

import etch from 'etch'
import {CompositeDisposable, Disposable} from 'atom'

import BranchesViewModel from './branches-view-model'

import type {TextEditor} from 'atom'
import type {ComponentWidget} from 'etch'
const TextEditorComponent = atom.workspace.buildTextEditor

const ErrorTimeout = 5 * 1000

type CreateBranchComponentProps = {
  viewModel: BranchesViewModel,
  onClose: () => void
}

export default class CreateBranchComponent {
  element: HTMLElement;
  viewModel: BranchesViewModel;
  onClose: () => void;
  subscriptions: CompositeDisposable;

  refs: {editor: TextEditor};

  enteredName: string;
  sanitizedName: string;
  currentError: ?Error;

  textEditorComponent: ComponentWidget;

  constructor (props: CreateBranchComponentProps) {
    // $FlowFixMe: Yes, we know this isn't a React component.
    this.textEditorComponent = <TextEditorComponent
      ref='editor'
      placeholderText='Branch name'
      mini/>

    this.acceptProps(props)

    const editorElement = this.refs.editor.getElement()

    atom.commands.add(editorElement, {
      'core:confirm': () => this.create(),
      'core:cancel': () => this.close()
    })

    const closeIfFocused = () => {
      if (document.hasFocus()) this.close()
    }

    editorElement.addEventListener('blur', closeIfFocused)
    this.subscriptions.add(new Disposable(() => editorElement.removeEventListener('blur', closeIfFocused)))

    this.subscriptions.add(this.refs.editor.onDidChange(() => this.onDidChange()))
  }

  async destroy (): Promise<void> {
    this.subscriptions.dispose()
    return etch.destroy(this)
  }

  acceptProps ({viewModel, onClose}: CreateBranchComponentProps): Promise<void> {
    if (this.subscriptions) {
      this.subscriptions.dispose()
    }
    this.subscriptions = new CompositeDisposable()

    this.viewModel = viewModel
    this.onClose = onClose

    if (this.element) {
      return etch.update(this)
    } else {
      etch.initialize(this)
      return Promise.resolve()
    }
  }

  close () {
    this.onClose()
  }

  async create (): Promise<void> {
    const name = this.refs.editor.getText()
    const sanitizedName = await this.viewModel.sanitizedBranchName(name)

    this.clearError()

    let didError = false
    try {
      await this.viewModel.createAndCheckoutBranch(sanitizedName)
    } catch (e) {
      didError = true
      this.currentError = e
      etch.update(this)

      setTimeout(() => this.clearError(), ErrorTimeout)
    }

    if (!didError) {
      this.close()
    }
  }

  clearError () {
    this.currentError = null
    etch.update(this)
  }

  focus () {
    this.refs.editor.getElement().focus()
  }

  async onDidChange (): Promise<void> {
    this.enteredName = this.refs.editor.getText()
    this.sanitizedName = await this.viewModel.sanitizedBranchName(this.enteredName)

    etch.update(this)
  }

  renderSanitizedName () {
    if (this.enteredName === this.sanitizedName) return null

    return (
      <div>Will be created as <em>{this.sanitizedName}</em></div>
    )
  }

  renderError () {
    const error = this.currentError
    if (!error) return null

    return <div className='is-error'>{error.message}</div>
  }

  render () {
    return (
      <div className='git-CreateBranch'>
        {this.textEditorComponent}
        {this.renderSanitizedName()}
        {this.renderError()}
      </div>
    )
  }

  update (props: CreateBranchComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }
}
