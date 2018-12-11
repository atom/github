import React from 'react';
import PropTypes from 'prop-types';
import {CompositeDisposable} from 'event-kit';

import Commands, {Command} from '../atom/commands';

export default class OpenCommitDialog extends React.Component {
  static propTypes = {
    commandRegistry: PropTypes.object.isRequired,
    didAccept: PropTypes.func.isRequired,
    didCancel: PropTypes.func.isRequired,
    isValidEntry: PropTypes.func.isRequired,
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      error: null,
    };
    this.subs = new CompositeDisposable();
  }

  componentDidMount() {
    setTimeout(() => this.commitRefElement.focus());
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  render() {
    return this.renderDialog();
  }

  renderDialog() {
    return (
      <div className="github-Dialog github-OpenCommit modal">
        <Commands registry={this.props.commandRegistry} target=".github-OpenCommit">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.accept} />
        </Commands>
        <main className="github-DialogInputs">
          <label className="github-DialogLabel github-CommitRef">
            Commit sha or Git ref:
            <atom-text-editor mini={true} ref={this.editorRefs('commitRef')} tabIndex="1" />
          </label>
          {this.state.error && <span className="error">{this.state.error}</span>}
        </main>
        <div className="github-DialogButtons">
          <button className="btn github-CancelButton" onClick={this.cancel} tabIndex="3">
            Cancel
          </button>
          <button
            className="btn btn-primary icon icon-commit"
            onClick={this.accept}
            disabled={!!this.state.error || this.getCommitRef().length === 0}
            tabIndex="2">
            Open Commit
          </button>
        </div>
      </div>
    );
  }

  accept = async () => {
    const ref = this.getCommitRef();
    const valid = await this.props.isValidEntry(ref);
    if (valid === true) {
      this.props.didAccept({ref});
    } else {
      this.setState({error: `There is no commit associated with "${ref}" in this repository`});
    }
  }

  cancel = () => this.props.didCancel()

  editorRefs = baseName => {
    const elementName = `${baseName}Element`;
    const modelName = `${baseName}Editor`;
    const subName = `${baseName}Subs`;
    const changeMethodName = `didChange${baseName[0].toUpperCase()}${baseName.substring(1)}`;

    return element => {
      if (!element) {
        return;
      }

      this[elementName] = element;
      const editor = element.getModel();
      if (this[modelName] !== editor) {
        this[modelName] = editor;

        /* istanbul ignore if */
        if (this[subName]) {
          this[subName].dispose();
          this.subs.remove(this[subName]);
        }

        this[subName] = editor.onDidChange(this[changeMethodName]);
        this.subs.add(this[subName]);
      }
    };
  }

  didChangeCommitRef = () => new Promise(resolve => {
    this.setState({error: null}, resolve);
  })

  getCommitRef() {
    return this.commitRefEditor ? this.commitRefEditor.getText() : '';
  }
}
