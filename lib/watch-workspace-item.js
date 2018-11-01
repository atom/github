import {CompositeDisposable} from 'atom';

import URIPattern from './atom/uri-pattern';

export function watchWorkspaceItem(workspace, pattern, component, stateKey) {
  const uPattern = pattern instanceof URIPattern ? pattern : new URIPattern(pattern);

  function itemMatches(item) {
    return item.getURI && uPattern.matches(item.getURI()).ok();
  }

  if (!component.state) {
    component.state = {};
  }
  let itemCount = workspace.getPaneItems().filter(itemMatches).length;
  component.state[stateKey] = itemCount > 0;

  return new CompositeDisposable(
    workspace.onDidAddPaneItem(({item}) => {
      const hadOpen = itemCount > 0;
      if (itemMatches(item)) {
        itemCount++;

        if (itemCount > 0 && !hadOpen) {
          component.setState({[stateKey]: true});
        }
      }
    }),
    workspace.onDidDestroyPaneItem(({item}) => {
      const hadOpen = itemCount > 0;
      if (itemMatches(item)) {
        itemCount--;

        if (itemCount <= 0 && hadOpen) {
          component.setState({[stateKey]: false});
        }
      }
    }),
  );
}
