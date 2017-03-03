import React from 'react';
import {autobind} from 'core-decorators';
import {CompositeDisposable} from 'atom';
import url from 'url';
import path from 'path';

export default class CloneDialog extends React.Component {
  static propTypes = {
    config: React.PropTypes.object.isRequired,
    didAccept: React.PropTypes.func,
    didCancel: React.PropTypes.func,
  }

  static defaultProps = {
    didAccept: () => {},
    didCancel: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      cloneDisabled: false,
    };

    this.projectHome = this.props.config.get('core.projectHome');
    this.subs = new CompositeDisposable();
  }

  componentDidMount() {
    this.projectPathEditor.setText(this.props.config.get('core.projectHome'));
    this.projectPathModified = false;

    setTimeout(() => this.remoteUrlElement.focus());
  }

  render() {
    return (
      <div className="github-Clone modal">
        <main className="github-CloneInputs">
          <label className="github-CloneLabel github-CloneUrl">
            Clone from
            <atom-text-editor mini={true} ref={this.editorRefs('remoteUrl')} />
          </label>
          <label className="github-CloneLabel github-ProjectPath">
            To directory
            <atom-text-editor mini={true} ref={this.editorRefs('projectPath')} />
          </label>
        </main>
        <div className="github-CloneButtons">
          <button className="btn github-CancelButton" onClick={this.cancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary icon icon-repo-clone"
            onClick={this.clone}
            disabled={this.state.cloneDisabled}>
            Clone
          </button>
        </div>
      </div>
    );
  }

  @autobind
  clone() {
    this.props.didAccept(this.getRemoteUrl(), this.getProjectPath());
  }

  @autobind
  cancel() {
    this.props.didCancel();
  }

  @autobind
  didChangeRemoteUrl() {
    if (!this.projectPathModified) {
      const name = path.basename(url.parse(this.getRemoteUrl()).pathname, '.git');

      if (name.length > 0) {
        const proposedPath = path.join(this.projectHome, name);
        this.projectPathEditor.setText(proposedPath);
        this.projectPathModified = false;
      }
    }

    this.setCloneEnablement();
  }

  @autobind
  didChangeProjectPath() {
    this.projectPathModified = true;
    this.setCloneEnablement();
  }

  @autobind
  editorRefs(baseName) {
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

        if (this[subName]) {
          this[subName].dispose();
          this.subs.remove(this[subName]);
        }

        this[subName] = editor.onDidChange(this[changeMethodName]);
        this.subs.add(this[subName]);
      }
    };
  }

  getProjectPath() {
    return this.projectPathEditor ? this.projectPathEditor.getText() : '';
  }

  getRemoteUrl() {
    return this.remoteUrlEditor ? this.remoteUrlEditor.getText() : '';
  }

  setCloneEnablement() {
    const disabled = this.getRemoteUrl().length === 0 || this.getProjectPath().length === 0;
    this.setState({cloneDisabled: disabled});
  }
}
