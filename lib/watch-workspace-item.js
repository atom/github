import {CompositeDisposable} from 'atom';

import URIPattern from './atom/uri-pattern';

class ItemWatcher {
  constructor(workspace, pattern, component, stateKey) {
    this.workspace = workspace;
    this.pattern = pattern instanceof URIPattern ? pattern : new URIPattern(pattern);
    this.component = component;
    this.stateKey = stateKey;

    this.itemCount = this.getItemCount();
    this.subs = new CompositeDisposable();
  }

  setInitialState() {
    if (!this.component.state) {
      this.component.state = {};
    }
    this.component.state[this.stateKey] = this.itemCount > 0;
    return this;
  }

  subscribeToWorkspace() {
    this.subs.dispose();
    this.subs = new CompositeDisposable(
      this.workspace.onDidAddPaneItem(this.itemAdded),
      this.workspace.onDidDestroyPaneItem(this.itemDestroyed),
    );
    return this;
  }

  setPattern(pattern) {
    const wasTrue = this.itemCount > 0;

    this.pattern = pattern instanceof URIPattern ? pattern : new URIPattern(pattern);

    // Update the item count to match the new pattern
    this.itemCount = this.getItemCount();

    // Update the component's state if it's changed as a result
    if (wasTrue && this.itemCount <= 0) {
      return new Promise(resolve => this.component.setState({[this.stateKey]: false}, resolve));
    } else if (!wasTrue && this.itemCount > 0) {
      return new Promise(resolve => this.component.setState({[this.stateKey]: true}, resolve));
    } else {
      return Promise.resolve();
    }
  }

  itemMatches = item => item && item.getURI && this.pattern.matches(item.getURI()).ok()

  getItemCount() {
    return this.workspace.getPaneItems().filter(this.itemMatches).length;
  }

  itemAdded = ({item}) => {
    const hadOpen = this.itemCount > 0;
    if (this.itemMatches(item)) {
      this.itemCount++;

      if (this.itemCount > 0 && !hadOpen) {
        this.component.setState({[this.stateKey]: true});
      }
    }
  }

  itemDestroyed = ({item}) => {
    const hadOpen = this.itemCount > 0;
    if (this.itemMatches(item)) {
      this.itemCount--;

      if (this.itemCount <= 0 && hadOpen) {
        this.component.setState({[this.stateKey]: false});
      }
    }
  }

  dispose() {
    this.subs.dispose();
  }
}

export function watchWorkspaceItem(workspace, pattern, component, stateKey) {
  return new ItemWatcher(workspace, pattern, component, stateKey)
    .setInitialState()
    .subscribeToWorkspace();
}
