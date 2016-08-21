/** @babel */
/** @jsx etch.dom */

import etch from 'etch'

export default class ListView {
  constructor (props) {
    this.props = props
    etch.initialize(this)
  }

  didClickItem (e, item) {
    if (e.detail === 1) {
      if (this.props.didSelectItem) {
        this.props.didSelectItem(item)
        return etch.update(this)
      }
    } else if (e.detail === 2) {
      if (this.props.didConfirmItem) {
        this.props.didConfirmItem(item)
      }
    }
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    let {ref, didSelectItem, didConfirmItem, items, selectedItems, renderItem, ...others} = this.props // eslint-disable-line no-unused-vars
    return (
      <div {...others}>
        {items.map((item, index) => renderItem(item, selectedItems.has(item), (e) => this.didClickItem(e, item)))}
      </div>
    )
  }

  destroy () {
    etch.destroy(this)
  }
}
