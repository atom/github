/** @babel */
/** @jsx etch.dom */

import etch from 'etch'
import classnames from 'classnames'

export default class ChangeListsComponent {
  constructor () {
    this.focusedList = "workingDir"
    this.lists = {
      workingDir: { items: [
        { path: 'workingDirA', status: 'modified' },
        { path: 'workingDirB', status: 'removed' }
      ], selectedItemPath: 'workingDirA' },
      index: { items: [
        { path: 'indexA', status: 'added' },
        { path: 'indexB', status: 'modified' }
      ], selectedItemPath: '' }
    }
    this.handleItemClicked = this.handleItemClicked.bind(this)
    etch.initialize(this)
  }

  changeFocusedList () {
    if (this.focusedList === "workingDir") {
      this.focusedList = "index"
    } else {
      this.focusedList = "workingDir"
    }
    this.focusList(this.focusedList)
  }

  focusList (listName) {
    this.refs[`list-${listName}`].element.focus() // ???
  }

  handleItemClicked (e, listName, item) {
    console.log(e, item, listName);
    this.lists[listName].selectedItemPath = item.path
    this.focusedList = listName
    etch.update(this)

    if (e.detail === 2) {
      // update the model to stage file
    }
  }

  update () {}

  render () {
    return (
      <div className="git-FileList-Container" style={{width: 200}}>
        <SelectableList ref='list-workingDir' listName='workingDir'
          onItemClick={this.handleItemClicked}
          listItems={this.lists.workingDir.items}
          isFocused={this.focusedList === 'workingDir'}
          selectedItemPath={this.lists.workingDir.selectedItemPath} />
        <SelectableList ref='list-index' listName='index'
          onItemClick={this.handleItemClicked}
          listItems={this.lists.index.items}
          isFocused={this.focusedList === 'index'}
          selectedItemPath={this.lists.index.selectedItemPath} />
      </div>
    )
  }
}


class SelectableList {
  constructor ({listItems, selectedItemPath, onItemClick, listName, isFocused}) {
    this.listItems = listItems
    this.selectedItemPath = selectedItemPath
    this.onItemClick = onItemClick
    this.listName = listName
    this.isFocused = isFocused
    console.log(isFocused, listName);

    this.handleItemClicked = this.handleItemClicked.bind(this)

    etch.initialize(this)
  }

  handleItemClicked (e, item) {
    this.onItemClick(e, this.listName, item)
  }

  update ({selectedItemPath, isFocused}) {
    this.selectedItemPath = selectedItemPath
    this.isFocused = isFocused
    etch.update(this)
  }

  destroy () {
    etch.destroy(this)
  }

  render () {
    return (
      <div className="git-Panel-item is-flexible git-FileList">
        <header className='git-CommitPanel-item is-header'>{this.listName}</header>
        {this.listItems.map(item => {
          const className = classnames({
            "is-selected": this.selectedItemPath === item.path && this.isFocused
          })
          return <ChangeListItemComponent item={item} className={className} onClick={this.handleItemClicked}/>
        })}
      </div>
    )
  }
}

class ChangeListItemComponent {
  constructor ({item, onClick, className}) {
    this.item = item
    this.onClick = onClick
    this.className = className

    this.handleClick = this.handleClick.bind(this)

    etch.initialize(this)
  }

  handleClick (e) {
    this.onClick(e, this.item)
  }

  update ({className}) {
    this.className = className
    etch.update(this)
  }

  render () {
    return (
      <div className={`git-FileSummary ${this.className}`} onclick={this.handleClick}>
        <span className={`git-FileSummary-icon icon icon-diff-${this.item.status} status-${this.item.status}`} />
        <span className="git-FileSummary-path"> {this.item.path} </span>
      </div>
    )
  }
}
