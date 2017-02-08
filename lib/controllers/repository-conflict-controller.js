import path from 'path';
import React from 'react';
import {CompositeDisposable} from 'atom';

import ModelObserver from '../models/model-observer';
import EditorConflictController from './editor-conflict-controller';

/**
 * Render an `EditorConflictController` for each `TextEditor` open on a file that contains git conflict markers.
 */
export default class RepositoryConflictController extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    commandRegistry: React.PropTypes.object.isRequired,
    resolutionProgress: React.PropTypes.object.isRequired,
    repository: React.PropTypes.object,
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      conflictingEditors: [],
    };

    this.subscriptions = new CompositeDisposable();
  }

  updateConflictingEditors() {
    if (!this.repositoryObserver.getActiveModel()) {
      this.setState({conflictingEditors: []});
      return;
    }

    const basePath = this.repositoryObserver.getActiveModel().getWorkingDirectoryPath();
    const mergeConflictPaths = new Set(
      (this.repositoryObserver.getActiveModelData() || []).map(p => path.join(basePath, p.filePath)),
    );

    if (mergeConflictPaths.size === 0) {
      this.setState({conflictingEditors: []});
    } else {
      const openEditors = this.props.workspace.getTextEditors();
      const conflictingEditors = openEditors.filter(editor => mergeConflictPaths.has(editor.getPath()));

      this.setState({conflictingEditors});
    }
  }

  refreshModelData() {
    return this.repositoryObserver.refreshModelData();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.repository !== this.props.repository) {
      this.repositoryObserver.setActiveModel(nextProps.repository);
    }
  }

  componentDidMount() {
    this.repositoryObserver = new ModelObserver({
      fetchData: repository => repository.getMergeConflicts(),
      didUpdate: this.updateConflictingEditors.bind(this),
    });
    this.repositoryObserver.setActiveModel(this.props.repository);

    this.subscriptions.add(this.props.workspace.observeTextEditors(this.updateConflictingEditors.bind(this)));
  }

  render() {
    const controllers = this.state.conflictingEditors.map(editor => (
      <EditorConflictController
        key={editor.id}
        commandRegistry={this.props.commandRegistry}
        resolutionProgress={this.props.resolutionProgress}
        editor={editor}
        isRebase={false}
      />
    ));

    return <div>{controllers}</div>;
  }

  componentWillUnmount() {
    this.repositoryObserver.destroy();
    this.subscriptions.dispose();
  }
}
