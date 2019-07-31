import React from 'react';
import PropTypes from 'prop-types';
import {remote} from 'electron';

import AtomTextEditor from '../../lib/atom/atom-text-editor';

const {dialog} = remote;

export default class DirectorySelect extends React.Component {
  static propTypes = {
    currentWindow: PropTypes.object.isRequired,
    buffer: PropTypes.object.isRequired,
    disabled: PropTypes.bool,
    showOpenDialog: PropTypes.func,
    tabGroup: PropTypes.shape({
      reset: PropTypes.func.isRequired,
      nextIndex: PropTypes.func.isRequired,
    }),
  }

  static defaultProps = {
    disabled: false,
    showOpenDialog: /* istanbul ignore next */ (...args) => dialog.showOpenDialog(...args),
  }

  render() {
    this.props.tabGroup.reset();

    return (
      <div className="github-Dialog-row">
        <AtomTextEditor
          className="github-DirectorySelect-destinationPath"
          mini={true}
          readOnly={this.props.disabled}
          buffer={this.props.buffer}
          tabIndex={this.props.tabGroup.nextIndex()}
        />
        <button
          className="btn icon icon-file-directory github-Dialog-rightBumper"
          disabled={this.props.disabled}
          onClick={this.chooseDirectory}
          tabIndex={this.props.tabGroup.nextIndex()}
        />
      </div>
    );
  }

  chooseDirectory = () => new Promise(resolve => {
    this.props.showOpenDialog(this.props.currentWindow, {
      defaultPath: this.props.buffer.getText(),
      properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
    }, filePaths => {
      if (filePaths !== undefined) {
        this.props.buffer.setText(filePaths[0]);
      }
      resolve();
    });
  });
}
