import React from 'react';
import PropTypes from 'prop-types';
import fs from 'fs-extra';

import CreateDialogContainer from '../containers/create-dialog-container';
import createRepositoryMutation from '../mutations/create-repository';
import AutoFocus from '../autofocus';
import TabGroup from '../tab-group';
import {GithubLoginModelPropType} from '../prop-types';

export default class CreateDialog extends React.Component {
  static propTypes = {
    // Model
    loginModel: GithubLoginModelPropType.isRequired,
    request: PropTypes.object.isRequired,
    error: PropTypes.instanceOf(Error),
    inProgress: PropTypes.bool.isRequired,

    // Atom environment
    currentWindow: PropTypes.object.isRequired,
    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.autofocus = new AutoFocus();
    this.tabGroup = new TabGroup();
  }

  render() {
    return (
      <CreateDialogContainer
        autofocus={this.autofocus}
        tabGroup={this.tabGroup}
        {...this.props}
      />
    );
  }
}

export async function createRepository(
  {ownerID, name, visibility, localPath, protocol, sourceRemoteName},
  {clone, relayEnvironment},
) {
  await fs.ensureDir(localPath, 0o755);
  const result = await createRepositoryMutation(relayEnvironment, {name, ownerID, visibility});
  const sourceURL = result.createRepository.repository[protocol === 'ssh' ? 'sshUrl' : 'url'];
  await clone(sourceURL, localPath, sourceRemoteName);
}

export async function publishRepository(
  {ownerID, name, visibility, protocol, sourceRemoteName},
  {repository, relayEnvironment},
) {
  let defaultBranchName;
  const branchSet = await repository.getBranches();
  const branchNames = new Set(branchSet.getNames());
  if (branchNames.has('master')) {
    defaultBranchName = 'master';
  } else {
    const head = branchSet.getHeadBranch();
    if (head.isPresent()) {
      defaultBranchName = head.getName();
    }
  }
  if (!defaultBranchName) {
    throw new Error('Unable to determine the desired default branch from the repository');
  }

  const result = await createRepositoryMutation(relayEnvironment, {name, ownerID, visibility});
  const sourceURL = result.createRepository.repository[protocol === 'ssh' ? 'sshUrl' : 'url'];
  const remote = await repository.addRemote(sourceRemoteName, sourceURL);
  await repository.push(defaultBranchName, {remote, setUpstream: true});
}
