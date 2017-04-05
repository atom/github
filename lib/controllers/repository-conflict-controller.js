import path from 'path';
import React from 'react';
import yubikiri from 'yubikiri';
import {CompositeDisposable} from 'atom';

import ObserveModelDecorator from '../decorators/observe-model';
import ResolutionProgress from '../models/conflicts/resolution-progress';
import EditorConflictController from './editor-conflict-controller';

/**
 * Render an `EditorConflictController` for each `TextEditor` open on a file that contains git conflict markers.
 */
@ObserveModelDecorator({
  getModel: props => props.repository,
  fetchData: (r, props) => {
    return yubikiri({
      workingDirectoryPath: r.getWorkingDirectoryPath(),
      mergeConflictPaths: r.getMergeConflicts().then(conflicts => conflicts.map(conflict => conflict.filePath)),
      isRebasing: r.isRebasing(),
    });
  },
})
export default class RepositoryConflictController extends React.Component {
  static propTypes = {
    workspace: React.PropTypes.object.isRequired,
    commandRegistry: React.PropTypes.object.isRequired,
    resolutionProgress: React.PropTypes.object,
    repository: React.PropTypes.object,
    workingDirectoryPath: React.PropTypes.string,
    mergeConflictPaths: React.PropTypes.arrayOf(React.PropTypes.string),
    isRebasing: React.PropTypes.bool,
    refreshResolutionProgress: React.PropTypes.func,
  };

  static defaultProps = {
    resolutionProgress: ResolutionProgress.empty(),
    mergeConflictPaths: [],
    isRebasing: false,
    refreshResolutionProgress: () => {},
  };

  constructor(props, context) {
    super(props, context);

    this.state = {openEditors: this.props.workspace.getTextEditors()};
    this.subscriptions = new CompositeDisposable();
  }

  componentDidMount() {
    this.subscriptions.add(this.props.workspace.observeTextEditors(() => {
      this.setState({
        openEditors: this.props.workspace.getTextEditors(),
      });
    }));
  }

  render() {
    const conflictingEditors = this.getConflictingEditors();

    return (
      <div>
        {conflictingEditors.map(editor => (
          <EditorConflictController
            key={editor.id}
            commandRegistry={this.props.commandRegistry}
            resolutionProgress={this.props.resolutionProgress}
            editor={editor}
            isRebase={this.props.isRebasing}
            refreshResolutionProgress={this.props.refreshResolutionProgress}
          />
        ))}
      </div>
    );
  }

  getConflictingEditors() {
    if (
      !this.props.workingDirectoryPath ||
      this.props.mergeConflictPaths.length === 0 ||
      this.state.openEditors.length === 0
    ) {
      return [];
    }

    const commonBasePath = this.props.workingDirectoryPath;
    const fullMergeConflictPaths = new Set(
      this.props.mergeConflictPaths.map(relativePath => path.join(commonBasePath, relativePath)),
    );

    return this.state.openEditors.filter(editor => fullMergeConflictPaths.has(editor.getPath()));
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }
}
