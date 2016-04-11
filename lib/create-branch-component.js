/* @flow */
/** @jsx etch.dom */

import etch from 'etch'

import BranchesViewModel from './branches-view-model'

import type {TextEditor} from 'atom'
import type {ComponentWidget} from 'etch'
const TextEditorComponent = atom.workspace.buildTextEditor

type CreateBranchComponentProps = {
  viewModel: BranchesViewModel,
  onClose: () => void
}

export default class CreateBranchComponent {
  element: HTMLElement;
  viewModel: BranchesViewModel;
  onClose: () => void;

  refs: {editor: TextEditor};

  textEditorComponent: ComponentWidget;

  constructor (props: CreateBranchComponentProps) {
    // $FlowFixMe: Yes, we know this isn't a React component.
    this.textEditorComponent = <TextEditorComponent
      ref='editor'
      placeholderText='Branch name'
      mini={true}/>

    this.acceptProps(props)

    const editorElement = this.refs.editor.getElement()

    atom.commands.add(editorElement, {
      'core:confirm': () => this.create(),
      'core:cancel': () => this.close()
    })

    editorElement.addEventListener('blur', () => {
      if (document.hasFocus()) this.close()
    })
  }

  acceptProps ({viewModel, onClose}: CreateBranchComponentProps): Promise<void> {
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

    console.log('create', sanitizedName)

    this.close()
  }

  focus () {
    this.refs.editor.getElement().focus()
  }

  render () {
    return (
      <div>{this.textEditorComponent}</div>
    )
  }

  update (props: CreateBranchComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }
}
