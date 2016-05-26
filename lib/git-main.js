/* @flow */

import GitPackage from './git-package'
import FileListViewModel from './file-list-view-model'
import DiffViewModel from './diff-view-model'
import DiffPaneItemComponent from './diff-pane-item-component'
import FileListComponent from './file-list-component'
import StatusBarComponent from './status-bar-component'
import StatusBarViewModel from './status-bar-view-model'

const gitPackageInstance = new GitPackage()

atom.deserializers.add({
  name: 'GitDiffPaneItem',
  deserialize: state => gitPackageInstance.createDiffPaneItem(state)
})

atom.views.addViewProvider(DiffViewModel, diffViewModel => {
  const component = new DiffPaneItemComponent({diffViewModel})
  return component.element
})

atom.views.addViewProvider(FileListViewModel, fileListViewModel => {
  const component = new FileListComponent({fileListViewModel})
  return component.element
})

atom.views.addViewProvider(StatusBarViewModel, viewModel => {
  const component = new StatusBarComponent(viewModel, () => gitPackageInstance.toggleChangesPanel())
  return component.element
})

export default gitPackageInstance
