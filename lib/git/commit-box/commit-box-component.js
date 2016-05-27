/* @flow */
/** @jsx etch.dom */

import {CompositeDisposable, Point} from 'atom'
import etch from 'etch'
import DOMListener from 'dom-listener'
// $FlowBug: REACT
import CommitEditorComponent from './commit-editor-component'
import CommitBoxViewModel, {SummaryPreferredLength} from './commit-box-view-model'

type CommitBoxComponentProps = {viewModel: CommitBoxViewModel}

const ErrorTimeout = 5 * 1000

export default class CommitBoxComponent {
  subscriptions: CompositeDisposable;
  listener: DOMListener;
  element: HTMLElement;
  refs: {editor: CommitEditorComponent, commitButton: HTMLElement};
  viewModel: CommitBoxViewModel;
  committingPromise: Promise<void>;

  bufferPosition: Point;
  currentError: ?Error;

  constructor (props: CommitBoxComponentProps) {
    this.bufferPosition = new Point()
    this.committingPromise = Promise.resolve()

    this.acceptProps(props)
  }

  destroy (): Promise<void> {
    this.subscriptions.dispose()
    this.listener.destroy()

    return etch.destroy(this)
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

    if (this.subscriptions) this.subscriptions.dispose()
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(this.listener.add('.git-CommitBox-button', 'click', () => this.commit()))

    this.subscriptions.add(atom.commands.add(this.element, {
      'git:commit': () => this.commit()
    }))

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'git:focus-commit-message': () => this.focus(),
      'git:focus-commit-button': () => this.focusCommitButton()
    }))

    return updatePromise
  }

  focus () {
    this.refs.editor.focus()
  }

  focusCommitButton () {
    this.refs.commitButton.focus()
  }

  getRemainingCharacters (): number {
    const editor = this.refs.editor
    const msg = editor ? editor.getText() : ''
    return this.viewModel.calculateRemainingCharacters(msg, this.bufferPosition)
  }

  getCountdown (): string {
    const remainingCharacters = this.getRemainingCharacters()
    if (isFinite(remainingCharacters)) {
      return remainingCharacters.toString()
    } else {
      return '∞'
    }
  }

  getCountdownClassNames (): Array<string> {
    const remainingCharacters = this.getRemainingCharacters()
    let className = ''
    if (isFinite(remainingCharacters)) {
      if (remainingCharacters < 0) {
        className = 'is-error'
      } else if (remainingCharacters < SummaryPreferredLength / 5) {
        className = 'is-warning'
      }
    }

    return ['git-CommitBox-countdown', className]
  }

  getHumanReadableErrorMessage (error: Error): string {
    if (error.name === CommitBoxViewModel.NoStagedFilesErrorName()) {
      return 'Stage some changes first!'
    } else if (error.name === CommitBoxViewModel.NoMessageErrorName()) {
      return 'Write a message first!'
    } else {
      return 'Something bad happened!'
    }
  }

  clearError () {
    this.currentError = null
    etch.update(this)
  }

  renderError () {
    const error = this.currentError
    if (!error) return <div></div>

    return <div className='git-CommitBox-error-msg'>{this.getHumanReadableErrorMessage(error)}</div>
  }

  getEditorClassName (): string {
    return this.currentError ? 'is-required' : ''
  }

  render () {
    return (
      <div className='git-Panel-item git-CommitBox'>
        {this.renderError()}
        <CommitEditorComponent
          className={this.getEditorClassName()}
          ref='editor'
          onDidChange={() => this.textChanged()}
          onDidChangeCursorPosition={e => this.cursorChanged(e)}/>
        <footer className='git-CommitBox-bar'>
          <button type='button' className='btn git-CommitBox-button' ref='commitButton'>Commit to {this.viewModel.getBranchName()}</button>
          <div className={this.getCountdownClassNames().join(' ')}>{this.getCountdown()}</div>
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

  update (props: CommitBoxComponentProps, children: Array<any>): Promise<void> {
    return this.acceptProps(props)
  }

  async commit (): Promise<void> {
    const message = this.refs.editor.getText()
    this.refs.editor.setText('')

    try {
      this.committingPromise = this.viewModel.commit(message)
      await this.committingPromise
      this.clearError()
    } catch (e) {
      this.refs.editor.setText(message)

      this.currentError = e
      setTimeout(() => this.clearError(), ErrorTimeout)
      etch.update(this)
    }
  }
}
