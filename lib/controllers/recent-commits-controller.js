import React from 'react';
import PropTypes from 'prop-types';
import {addEvent} from '../reporter-proxy';
import {CompositeDisposable} from 'event-kit';

import CommitDetailItem from '../items/commit-detail-item';
import URIPattern from '../atom/uri-pattern';
import RecentCommitsView from '../views/recent-commits-view';
import RefHolder from '../models/ref-holder';

export default class RecentCommitsController extends React.Component {
  static propTypes = {
    commits: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool.isRequired,
    undoLastCommit: PropTypes.func.isRequired,
    workspace: PropTypes.object.isRequired,
    repository: PropTypes.object.isRequired,
    commandRegistry: PropTypes.object.isRequired,
  }

  static focus = RecentCommitsView.focus

  constructor(props, context) {
    super(props, context);

    this.subscriptions = new CompositeDisposable(
      this.props.workspace.onDidChangeActivePaneItem(this.updateSelectedCommit),
    );

    this.refView = new RefHolder();

    this.state = {selectedCommitSha: ''};
  }

  updateSelectedCommit = () => {
    const activeItem = this.props.workspace.getActivePaneItem();

    const pattern = new URIPattern(decodeURIComponent(
      CommitDetailItem.buildURI(
        this.props.repository.getWorkingDirectoryPath(),
        '{sha}'),
    ));

    if (activeItem && activeItem.getURI) {
      const match = pattern.matches(activeItem.getURI());
      const {sha} = match.getParams();
      if (match.ok() && sha && sha !== this.state.selectedCommitSha) {
        return new Promise(resolve => this.setState({selectedCommitSha: sha}, resolve));
      }
    }
    return Promise.resolve();
  }

  render() {
    return (
      <RecentCommitsView
        ref={this.refView.setter}
        commits={this.props.commits}
        isLoading={this.props.isLoading}
        undoLastCommit={this.props.undoLastCommit}
        openCommit={this.openCommit}
        selectNextCommit={this.selectNextCommit}
        selectPreviousCommit={this.selectPreviousCommit}
        selectedCommitSha={this.state.selectedCommitSha}
        commandRegistry={this.props.commandRegistry}
      />
    );
  }

  openCommit = async ({sha, preserveFocus}) => {
    const workdir = this.props.repository.getWorkingDirectoryPath();
    const uri = CommitDetailItem.buildURI(workdir, sha);
    await this.props.workspace.open(uri, {pending: true});
    if (preserveFocus) {
      this.setFocus(this.constructor.focus.RECENT_COMMIT);
    }
    addEvent('open-commit-in-pane', {package: 'github', from: this.constructor.name});
  }

  selectNextCommit = () => this.setSelectedCommitIndex(this.getSelectedCommitIndex() + 1);

  selectPreviousCommit = () => this.setSelectedCommitIndex(Math.max(this.getSelectedCommitIndex() - 1, 0));

  getSelectedCommitIndex() {
    return this.props.commits.findIndex(commit => commit.getSha() === this.state.selectedCommitSha);
  }

  setSelectedCommitIndex(ind) {
    const commit = this.props.commits[ind];
    if (commit) {
      return new Promise(resolve => this.setState({selectedCommitSha: commit.getSha()}, resolve));
    } else {
      return Promise.resolve();
    }
  }

  getFocus(element) {
    return this.refView.map(view => view.getFocus(element)).getOr(null);
  }

  setFocus(focus) {
    return this.refView.map(view => {
      const wasFocused = view.setFocus(focus);
      if (wasFocused && this.getSelectedCommitIndex() === -1) {
        this.setSelectedCommitIndex(0);
      }
      return wasFocused;
    }).getOr(false);
  }

  advanceFocusFrom(focus) {
    return this.refView.map(view => view.advanceFocusFrom(focus)).getOr(Promise.resolve(null));
  }

  retreatFocusFrom(focus) {
    return this.refView.map(view => view.retreatFocusFrom(focus)).getOr(Promise.resolve(null));
  }
}
