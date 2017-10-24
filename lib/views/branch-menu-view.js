import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import Commands, {Command} from './commands';
import {BranchPropType} from '../prop-types';

export default class BranchMenuView extends React.Component {
  static propTypes = {
    workspace: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
    notificationManager: PropTypes.object.isRequired,
    repository: PropTypes.object,
    branches: PropTypes.arrayOf(BranchPropType).isRequired,
    currentBranch: BranchPropType.isRequired,
    checkout: PropTypes.func,
  }

  static defaultProps = {
    checkout: () => Promise.resolve(),
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      createNew: false,
    };
  }

  render() {
    const branchNameInProgress = this.props.repository.getOperationStates().checkoutInProgress;
    const branchNames = this.props.branches.map(branch => branch.getName());
    if (branchNameInProgress && branchNames.indexOf(branchNameInProgress) === -1) {
      branchNames.push(branchNameInProgress);
    }
    const currentBranchName = branchNameInProgress || this.props.currentBranch.getName();

    const newBranchEditor = (
      <div className="github-BranchMenuView-item github-BranchMenuView-editor">
        <atom-text-editor
          ref={e => { this.editorElement = e; }}
          mini={true}
          softWrapped={true}
          placeholderText="enter new branch name"
          lineNumberGutterVisible={false}
          showInvisibles={false}
          scrollPastEnd={false}
        />
      </div>
    );

    const selectBranchView = (
      <select
        className="github-BranchMenuView-item github-BranchMenuView-select input-select"
        onChange={this.didSelectItem}
        value={currentBranchName}>
        {this.props.currentBranch.isDetached() &&
          <option key="detached" value="detached" disabled>{this.props.currentBranch.getName()}</option>
        }
        {branchNames.map(branchName => {
          return <option key={branchName} value={branchName}>{branchName}</option>;
        })}
      </select>
    );

    return (
      <div className="github-BranchMenuView">
        <Commands registry={this.props.commandRegistry} target=".github-BranchMenuView-editor atom-text-editor[mini]">
          <Command command="tool-panel:unfocus" callback={this.cancelCreateNewBranch} />
          <Command command="core:cancel" callback={this.cancelCreateNewBranch} />
          <Command command="core:confirm" callback={this.createBranch} />
        </Commands>
        <div className="github-BranchMenuView-selector">
          <span className="github-BranchMenuView-item icon icon-git-branch" />
          { this.state.createNew ? newBranchEditor : selectBranchView }
          <button className="github-BranchMenuView-item github-BranchMenuView-button btn"
            onClick={this.createBranch}> New Branch </button>
        </div>
      </div>
    );
  }

  @autobind
  async didSelectItem(event) {
    const branchName = event.target.value;
    await this.props.checkout(branchName);
  }

  @autobind
  async createBranch() {
    if (this.state.createNew) {
      const branchName = this.editorElement.getModel().getText().trim();
      await this.props.checkout(branchName, {createNew: true});
      this.setState({createNew: false});
    } else {
      this.setState({createNew: true}, () => this.editorElement.focus());
    }
  }

  @autobind
  cancelCreateNewBranch() {
    this.setState({createNew: false});
  }
}
