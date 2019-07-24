import React from 'react';
import PropTypes from 'prop-types';
import {createFragmentContainer, graphql} from 'react-relay';
import {TextBuffer} from 'atom';
import {CompositeDisposable} from 'event-kit';
import path from 'path';

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

export class BareCreateDialogView extends React.Component {
  static propTypes = {
    // Relay
    user: PropTypes.shape({
      id: PropTypes.string.isRequired,
    }),

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
    currentWindow: PropTypes.object.isRequired,
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    const {localDir} = this.props.request.getParams();

    this.projectHome = this.props.config.get('core.projectHome');
    this.modified = {
      repoName: false,
      localPath: false,
    };

    this.repoName = new TextBuffer({
      text: localDir ? path.basename(localDir) : '',
    });
    this.localPath = new TextBuffer({
      text: localDir || this.projectHome,
    });
    this.sourceRemoteName = new TextBuffer({
      text: this.props.config.get('github.sourceRemoteName'),
    });

    this.subs = new CompositeDisposable(
      this.repoName.onDidChange(this.didChangeRepoName),
      this.localPath.onDidChange(this.didChangeLocalPath),
      this.sourceRemoteName.onDidChange(this.didChangeSourceRemoteName),
      this.props.config.onDidChange('github.sourceRemoteName', this.readSourceRemoteNameSetting),
      this.props.config.onDidChange('github.remoteFetchProtocol', this.readRemoteFetchProtocolSetting),
    );

    this.state = {
      acceptEnabled: this.acceptIsEnabled(),
      selectedVisibility: 'PUBLIC',
      selectedProtocol: this.props.config.get('github.remoteFetchProtocol'),
      selectedOwnerID: this.props.user ? this.props.user.id : '',
    };
  }

  render() {
    const text = DIALOG_TEXT[this.props.request.identifier];

    return (
      <DialogView
        progressMessage={text.progressMessage}
        acceptEnabled={this.state.acceptEnabled}
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
            nameBuffer={this.repoName}
            selectedOwnerID={this.state.selectedOwnerID}
            didChangeOwnerID={this.didChangeOwnerID}
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
            currentWindow={this.props.currentWindow}
            buffer={this.localPath}
            disabled={this.props.request.identifier === 'publish'}
          />
        </div>
        <RemoteConfigurationView
          currentProtocol={this.state.selectedProtocol}
          didChangeProtocol={this.didChangeProtocol}
          sourceRemoteBuffer={this.sourceRemoteName}
        />

      </DialogView>
    );
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  didChangeRepoName = () => {
    this.modified.repoName = true;
    if (!this.modified.localPath) {
      if (this.localPath.getText() === this.projectHome) {
        this.localPath.setText(path.join(this.projectHome, this.repoName.getText()));
      } else {
        const dirName = path.dirname(this.localPath.getText());
        this.localPath.setText(path.join(dirName, this.repoName.getText()));
      }
      this.modified.localPath = false;
    }
    this.recheckAcceptEnablement();
  }

  didChangeOwnerID = ownerID => new Promise(resolve => this.setState({selectedOwnerID: ownerID}, resolve))

  didChangeLocalPath = () => {
    this.modified.localPath = true;
    if (!this.modified.repoName) {
      this.repoName.setText(path.basename(this.localPath.getText()));
      this.modified.repoName = false;
    }
    this.recheckAcceptEnablement();
  }

  didChangeVisibility = event => {
    return new Promise(resolve => this.setState({selectedVisibility: event.target.value}, resolve));
  }

  didChangeSourceRemoteName = () => {
    this.writeSourceRemoteNameSetting();
    this.recheckAcceptEnablement();
  }

  didChangeProtocol = async protocol => {
    await new Promise(resolve => this.setState({selectedProtocol: protocol}, resolve));
    this.writeRemoteFetchProtocolSetting(protocol);
  }

  readSourceRemoteNameSetting = ({newValue}) => {
    if (newValue !== this.sourceRemoteName.getText()) {
      this.sourceRemoteName.setText(newValue);
    }
  }

  writeSourceRemoteNameSetting() {
    if (this.props.config.get('github.sourceRemoteName') !== this.sourceRemoteName.getText()) {
      this.props.config.set('github.sourceRemoteName', this.sourceRemoteName.getText());
    }
  }

  readRemoteFetchProtocolSetting = ({newValue}) => {
    if (newValue !== this.state.selectedProtocol) {
      this.setState({selectedProtocol: newValue});
    }
  }

  writeRemoteFetchProtocolSetting(protocol) {
    if (this.props.config.get('github.remoteFetchProtocol') !== protocol) {
      this.props.config.set('github.remoteFetchProtocol', protocol);
    }
  }

  acceptIsEnabled() {
    return !this.repoName.isEmpty() && !this.localPath.isEmpty() && !this.sourceRemoteName.isEmpty();
  }

  recheckAcceptEnablement() {
    const nextEnablement = this.acceptIsEnabled();
    if (nextEnablement !== this.state.acceptEnabled) {
      this.setState({acceptEnabled: nextEnablement});
    }
  }

  accept = () => {
    if (!this.acceptIsEnabled()) {
      return Promise.resolve();
    }

    return this.props.request.accept({
      ownerID: this.state.selectedOwnerID,
      name: this.repoName.getText(),
      visibility: this.state.selectedVisibility,
      localPath: this.localPath.getText(),
      protocol: this.state.selectedProtocol,
      sourceRemoteName: this.sourceRemoteName.getText(),
    });
  }
}

export default createFragmentContainer(BareCreateDialogView, {
  user: graphql`
    fragment createDialogView_user on User {
      id
    }
  `,
});
