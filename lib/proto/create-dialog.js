import React, {Fragment} from 'react';
import {TextBuffer} from 'atom';

import Octicon from '../atom/octicon';
import AtomTextEditor from '../atom/atom-text-editor';
import Select from 'react-select';

const owners = [
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

export default class CreateDialog extends React.Component {
  constructor(props) {
    super(props);

    this.nameBuffer = new TextBuffer({text: 'shhh'});
    this.sourceRemoteBuffer = new TextBuffer({text: 'origin'});
    this.destPathBuffer = new TextBuffer({text: '/home/smashwilson/src/shhh'});

    this.state = {selectedOwner: owners[0]};
  }

  render() {
    return (
      <form className="github-Dialog github-Create modal padded">
        <h1 className="github-Create-header">
          <Octicon icon="globe" />
          Create GitHub repository
        </h1>
        <div className="github-Create-repo">
          <Select
            className="github-Create-owner"
            clearable={false}
            options={owners}
            optionRenderer={this.renderOwner}
            value={this.state.selectedOwner}
            valueRenderer={this.renderOwner}
            onChange={this.setOwner}
          />
          /
          <AtomTextEditor className="github-Create-name" mini={true} buffer={this.nameBuffer} />
        </div>
        <div className="github-Create-visibility block">
          <span className="github-Create-visibilityHeading">Visibility:</span>
          <label className="github-Create-visibilityOption input-label">
            <input className="input-radio" type="radio" name="visibility" defaultChecked={true} />
            <Octicon icon="globe" />

            Public
          </label>
          <label className="github-Create-visibilityOption input-label">
            <input className="input-radio" type="radio" name="visibility" />
            <Octicon icon="mirror-private" />

            Private
          </label>
        </div>
        <div className="github-Create-destination block">
          <label className="input-label">
            <p>Destination path:</p>
            <AtomTextEditor
              className="github-Create-destinationPath"
              mini={true}
              buffer={this.destPathBuffer}
            />
          </label>
        </div>
        <details className="github-Clone-advanced block">
          <summary>Advanced</summary>
          <main>
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
          </main>
        </details>
        <hr />
        <p className="github-Create-actions">
          <button className="btn inline-block-tight">Cancel</button>
          <button className="btn btn-primary inline-block-tight">Create</button>
        </p>
      </form>
    );
  }

  setOwner = v => this.setState({selectedOwner: v})

  renderOwner = ({name, url, disabled}) => {
    return (
      <Fragment>
        <img alt="" src={url} className="github-Create-owner-optionImage" />
        {name}
        {disabled && <br />}
        {disabled && '(insufficient permissions)'}
      </Fragment>
    );
  }
}
