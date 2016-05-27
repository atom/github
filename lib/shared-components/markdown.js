'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

import marked from 'marked'

export default stateless(etch, (props, children) => {
  return <div {...props} innerHTML={marked(children[0])}/>
})
