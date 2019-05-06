import React, {Fragment} from 'react';
import {TextBuffer} from 'atom';
import Select from 'react-select';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';

const forkDestinations = [
  {
    name: 'smashwilson',
    url: 'https://avatars2.githubusercontent.com/u/17565?s=24&v=4',
  },
  {
    name: 'ansible',
    url: 'https://avatars1.githubusercontent.com/u/1507452?s=24&v=4',
    disabled: true,
  },
  {
    name: 'atom',
    url: 'https://avatars2.githubusercontent.com/u/1089146?s=24&v=4',
  },
  {
    name: 'electron',
    url: 'https://avatars3.githubusercontent.com/u/13409222?s=24&v=4',
  },
];

export default class CloneDialogGitHubForkExisting extends React.Component {
  constructor(props) {
    super(props);

    this.searchBuffer = new TextBuffer({text: 'atom/github'});
    this.sourceRemoteBuffer = new TextBuffer({text: 'origin'});
    this.upstreamRemoteBuffer = new TextBuffer({text: 'upstream'});
    this.destPathBuffer = new TextBuffer({text: '/home/smashwilson/src/github'});

    this.state = {selectedForkDestination: forkDestinations[0]};
  }

  render() {
    return (
      <form className="github-Dialog github-Clone modal padded">
        <h1 className="github-Clone-header">
          <Octicon icon="repo-clone" />
          Clone repository
        </h1>
        <AtomTextEditor mini={true} buffer={this.searchBuffer} />
        <hr />
        <div className="github-Clone-dotcom">
          <div className="github-Clone-protocol block">
            <span className="github-Clone-protocolHeading">Protocol:</span>
            <label className="github-Clone-protocolOption input-label">
              <input className="input-radio" type="radio" name="protocol" defaultChecked={true} />
              HTTPS
            </label>
            <label className="github-Clone-protocolOption input-label">
              <input className="input-radio" type="radio" name="protocol" />
              SSH
            </label>
          </div>
          <div className="github-Clone-fork block">
            <input type="checkbox" id="github-Clone-forkBox" defaultChecked={true} />
            <label htmlFor="github-Clone-forkBox">
              <Octicon icon="repo-forked" />
              Fork this repository to:
            </label>
            <Select
              className="github-Clone-forkDestination"
              clearable={false}
              options={forkDestinations}
              optionRenderer={this.renderForkDestination}
              value={this.state.selectedForkDestination}
              valueRenderer={this.renderForkDestination}
              onChange={this.setForkDestination}
            />
          </div>
          <div className="github-Clone-existingForks block">
            <p>Or clone one of these existing forks instead:</p>
            <ul className="github-Clone-fork-list list-group">
              <li className="list-item">
                <a href="https://github.com" className="icon icon-repo">
                  <img alt="" src="https://avatars3.githubusercontent.com/u/13409222?s=16&v=4" />
                  electron/github
                </a>
              </li>
              <li className="list-item">
                <a href="https://github.com" className="icon icon-mirror-private">
                  <img alt="" src="https://avatars1.githubusercontent.com/u/21248459?s=16&v=4" />
                  editor-tools/github
                </a>
              </li>
            </ul>
          </div>
          <div className="github-Clone-upstreamRemote block">
            <label htmlFor="github-Clone-upstreamRemoteName">Upstream remote name:</label>
            <AtomTextEditor
              className="github-Clone-upstreamRemoteName"
              id="github-Clone-upstreamRemoteName"
              mini={true}
              autoWidth={false}
              buffer={this.upstreamRemoteBuffer}
            />
          </div>
          <div className="github-Clone-sourceRemote block">
            <label htmlFor="github-Clone-sourceRemoteName">Source remote name:</label>
            <AtomTextEditor
              className="github-Clone-sourceRemoteName"
              id="github-Clone-sourceRemoteName"
              mini={true}
              autoWidth={false}
              buffer={this.sourceRemoteBuffer}
            />
          </div>
          <div className="github-Clone-destination block">
            <label htmlFor="github-Clone-destinationPath">Destination path:</label>
            <AtomTextEditor
              className="github-Clone-destinationPath"
              id="github-Clone-destinationPath"
              mini={true}
              buffer={this.destPathBuffer}
            />
          </div>
        </div>
        <hr />
        <p className="github-Clone-actions">
          <button className="btn inline-block-tight">Cancel</button>
          <button className="btn btn-primary inline-block-tight">Clone</button>
        </p>
      </form>
    );
  }

  setForkDestination = v => this.setState({selectedForkDestination: v})

  renderForkDestination = ({name, url, disabled}) => {
    return (
      <Fragment>
        <img alt="" src={url} className="github-Clone-forkDestination-optionImage" />
        {name}
        {disabled && <br />}
        {disabled && '(insufficient permissions)'}
      </Fragment>
    );
  }
}
