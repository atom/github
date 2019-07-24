import React from 'react';
import PropTypes from 'prop-types';
import {TextBuffer} from 'atom';

import DialogView from './dialog-view';
import RepositoryHomeSelectionView from './repository-home-selection-view';
import DirectorySelect from './directory-select';
import RemoteConfigurationView from './remote-configuration-view';
import Octicon from '../atom/octicon';

const DIALOG_TEXT = {
  create: {
    heading: 'Create GitHub repository',
    hostPath: 'Destination path:',
    progressMessage: 'Creating repository...',
    acceptText: 'Create',
  },
  publish: {
    heading: 'Publish GitHub repository',
    hostPath: 'Local path:',
    progressMessage: 'Publishing repository...',
    acceptText: 'Publish',
  },
};

export default class CreateDialogView extends React.Component {
  static propTypes = {
    // Relay properties to pass through
    user: PropTypes.object.isRequired,

    // Model
    request: PropTypes.shape({
      identifier: PropTypes.oneOf(['create', 'publish']).isRequired,
      getParams: PropTypes.func.isRequired,
      accept: PropTypes.func.isRequired,
      cancel: PropTypes.func.isRequired,
    }).isRequired,
    error: PropTypes.instanceOf(Error),
    isLoading: PropTypes.bool.isRequired,
    inProgress: PropTypes.bool.isRequired,

    // Atom environment
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.repoName = new TextBuffer();
    this.localPath = new TextBuffer({text: this.props.request.getParams().localDir || ''});
    this.sourceRemoteName = new TextBuffer();

    this.state = {
      acceptEnabled: false,
      selectedVisibility: 'PUBLIC',
      selectedProtocol: 'https',
      selectedOwner: '',
    };
  }

  render() {
    const text = DIALOG_TEXT[this.props.request.identifier];

    return (
      <DialogView
        progressMessage={text.progressMessage}
        acceptText={text.acceptText}
        accept={this.accept}
        cancel={this.props.request.cancel}
        inProgress={this.props.inProgress}
        error={this.props.error}
        workspace={this.props.workspace}
        commands={this.props.commands}>

        <h1 className="github-Create-header">
          <Octicon icon="globe" />
          {text.heading}
        </h1>
        <div className="github-Create-repo block">
          <RepositoryHomeSelectionView
            user={this.props.user}
            nameBuffer={this.name}
            selectedOwner={this.state.selectedOwner}
            didChooseOwner={this.didChooseOwner}
            isLoading={this.props.isLoading}
          />
        </div>
        <div className="github-Create-visibility block">
          <span className="github-Create-visibilityHeading">Visibility:</span>
          <label className="github-Publish-visibilityOption input-label">
            <input
              className="input-radio"
              type="radio"
              name="visibility"
              value="PUBLIC"
              checked={this.state.selectedVisibility === 'PUBLIC'}
              onChange={this.didChangeVisibility}
            />
            <Octicon icon="globe" />
            Public
          </label>
          <label className="github-Publish-visibilityOption input-label">
            <input
              className="input-radio"
              type="radio"
              name="visibility"
              value="PRIVATE"
              checked={this.state.selectedVisibility === 'PRIVATE'}
              onChange={this.didChangeVisibility}
            />
            <Octicon icon="mirror-private" />
            Private
          </label>
        </div>
        <div className="github-Create-localPath">
          <DirectorySelect
            currentWindow={null}
            buffer={this.localPath}
            disabled={this.props.request.identifier === 'publish'}
          />
        </div>
        <RemoteConfigurationView
          currentProtocol={this.state.currentProtocol}
          didChangeProtocol={this.didChangeProtocol}
          sourceRemoteBuffer={this.sourceRemoteName}
        />

      </DialogView>
    );
  }

  didChooseOwner = ownerID => new Promise(resolve => this.setState({selectedOwner: ownerID}, resolve))

  didChangeProtocol = protocol => new Promise(resolve => this.setState({selectedProtocol: protocol}, resolve))

  didChangeVisibility = event => {
    return new Promise(resolve => this.setState({selectedVisibility: event.target.value}, resolve));
  }
}
