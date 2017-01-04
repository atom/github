/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';

export default class ListView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
  }

  didClickItem(e, item) {
    if (e.detail === 1) {
      if (this.props.didSelectItem) {
        this.props.didSelectItem(item);
        return etch.update(this);
      }
    } else if (e.detail === 2) {
      if (this.props.didConfirmItem) {
        this.props.didConfirmItem(item);
      }
    }
    return null;
  }

  update(props) {
    this.props = props;
    return etch.update(this);
  }

  render() {
    // eslint-disable-next-line no-unused-vars
    const {ref, didSelectItem, didConfirmItem, items, selectedItems, renderItem, ...others} = this.props;
    return (
      <div {...others}>
        {items.map((item, index) => renderItem(item, selectedItems.has(item), e => this.didClickItem(e, item)))}
      </div>
    );
  }

  destroy() {
    etch.destroy(this);
  }
}
