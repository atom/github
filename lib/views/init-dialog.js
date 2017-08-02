import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';
import {CompositeDisposable} from 'event-kit';

import Commands, {Command} from './commands';

export default class InitDialog extends React.Component {
  static propTypes = {
    config: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    didAccept: PropTypes.func,
    didCancel: PropTypes.func,
    initPath: PropTypes.string,
  }

  static defaultProps = {
    didAccept: () => {},
    didCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      initDisabled: false,
    };

    this.subs = new CompositeDisposable();
  }

  componentDidMount() {
    if (this.projectPathEditor) {
      this.projectPathEditor.setText(this.props.initPath || this.props.config.get('core.projectHome'));
      this.projectPathModified = false;
    }

    if (this.projectPathElement) {
      setTimeout(() => this.projectPathElement.focus());
    }
  }

  render() {
    return (
      <div className="github-Dialog github-Init modal">
        <Commands registry={this.props.commandRegistry} target=".github-Init">
          <Command command="core:cancel" callback={this.cancel} />
          <Command command="core:confirm" callback={this.init} />
        </Commands>
        <main className="github-DialogInputs">
          <label className="github-DialogLabel github-ProjectPath">
            Initialize git repository in directory
            <atom-text-editor mini={true} ref={this.editorRef()} tabIndex="2" />
          </label>
        </main>
        <div className="github-DialogButtons">
          <button className="btn github-CancelButton" onClick={this.cancel} tabIndex="3">
            Cancel
          </button>
          <button
            className="btn btn-primary icon icon-repo-create"
            onClick={this.init}
            disabled={this.state.initDisabled}
            tabIndex="4">
            Init
          </button>
        </div>
      </div>
    );
  }

  @autobind
  init() {
    if (this.getProjectPath().length === 0) {
      return;
    }

    this.props.didAccept(this.getProjectPath());
  }

  @autobind
  cancel() {
    this.props.didCancel();
  }

  @autobind
  editorRef() {
    return element => {
      if (!element) {
        return;
      }

      this.projectPathElement = element;
      const editor = element.getModel();
      if (this.projectPathEditor !== editor) {
        this.projectPathEditor = editor;

        if (this.projectPathSubs) {
          this.projectPathSubs.dispose();
          this.subs.remove(this.projectPathSubs);
        }

        this.projectPathSubs = editor.onDidChange(this.setInitEnablement);
        this.subs.add(this.projectPathSubs);
      }
    };
  }

  getProjectPath() {
    return this.projectPathEditor ? this.projectPathEditor.getText() : '';
  }

  getRemoteUrl() {
    return this.remoteUrlEditor ? this.remoteUrlEditor.getText() : '';
  }

  @autobind
  setInitEnablement() {
    this.setState({initDisabled: this.getProjectPath().length === 0});
  }
}
