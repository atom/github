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
      this.props.didSelectItem(item)
      return etch.update(this)
    } else if (e.detail === 2) {
      this.props.didConfirmItem(item)
    }
  }

  update (props) {
    this.props = props
    return etch.update(this)
  }

  render () {
    let {ref, didSelectItem, didConfirmItem, items, selectedItemIndex, renderItem, ...others} = this.props // eslint-disable-line no-unused-vars
    selectedItemIndex = selectedItemIndex || 0
    return (
      <div {...others}>
        {items.map((item, index) => {
          const element = renderItem(item, index === selectedItemIndex)
          element.properties.onclick = (e) => this.didClickItem(e, item)
          return element
        })}
      </div>
    )
  }

  destroy () {
    etch.destroy(this)
  }
}
