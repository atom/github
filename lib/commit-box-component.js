/* @flow */
/** @jsx etch.dom */

import {CompositeDisposable, Point} from 'atom'
import etch from 'etch'
import DOMListener from 'dom-listener'
// $FlowBug: REACT
import CommitEditorComponent from './commit-editor-component'

import type CommitBoxViewModel from './commit-box-view-model'

type CommitBoxComponentProps = {viewModel: CommitBoxViewModel}

export default class CommitBoxComponent {
  subscriptions: CompositeDisposable;
  listener: DOMListener;
  element: HTMLElement;
  refs: {editor: CommitEditorComponent};
  viewModel: CommitBoxViewModel;
  committingPromise: Promise<void>;

  bufferPosition: Point;

  constructor (props: CommitBoxComponentProps) {
    this.bufferPosition = new Point()
    this.subscriptions = new CompositeDisposable()
    this.committingPromise = Promise.resolve()

    this.acceptProps(props)
  }

  acceptProps ({viewModel}: CommitBoxComponentProps): Promise<void> {
    this.viewModel = viewModel

    let updatePromise = Promise.resolve()
    if (this.element) {
      updatePromise = etch.update(this)
    } else {
      etch.initialize(this)
      this.listener = new DOMListener(this.element)
    }

    this.subscriptions.dispose()
    this.subscriptions.add(this.listener.add('.commit-button', 'click', () => this.commit()))
    this.subscriptions.add(this.viewModel.onDidChange(() => etch.update(this)))

    this.subscriptions.add(atom.commands.add(this.element, {
      'git:commit': () => this.commit()
    }))

    return updatePromise
  }

  getCountdown (): string {
    const editor = this.refs.editor
    const msg = editor ? editor.getText() : ''
    const remainingCharacters = this.viewModel.calculateRemainingCharacters(msg, this.bufferPosition)
    if (isFinite(remainingCharacters)) {
      return remainingCharacters.toString()
    } else {
      return '∞'
    }
  }

  getCountdownStyle (): Object {
    // TODO: Color the text increasingly red as you approach the limit.
    return {

    }
  }

  render () {
    return (
      <div className='git-commit-message-view'>
        <CommitEditorComponent ref='editor' onDidChange={() => this.textChanged()} onDidChangeCursorPosition={e => this.cursorChanged(e)}/>
        <footer className='commit-message-footer'>
          <button type='button' className='btn commit-button'>Commit to {this.viewModel.getBranchName()}</button>
          <div className='message-countdown' style={this.getCountdownStyle()}>{this.getCountdown()}</div>
        </footer>
      </div>
    )
  }

  textChanged () {
    etch.update(this)
  }

  cursorChanged ({newBufferPosition}: {newBufferPosition: Point}) {
    this.bufferPosition = newBufferPosition

    etch.update(this)
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()

    return etch.destroy(this)
  }

  update (props: CommitBoxComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  async commit (): Promise<void> {
    const message = this.refs.editor.getText()
    this.refs.editor.setText('')

    try {
      this.committingPromise = this.viewModel.commit(message)
      await this.committingPromise
    } catch (e) {
      // TODO: Display this to the user.
      console.error(e)
      this.refs.editor.setText(message)
    }
  }
}
