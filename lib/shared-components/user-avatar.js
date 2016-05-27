'use babel'
/** @jsx etch.dom */

import etch from 'etch'
import stateless from 'etch-stateless'

export default stateless(etch, ({userId, size, ...props}) => {
  const imgSrc = `https://avatars1.githubusercontent.com/u/${userId}?v=3&s={size * 2}` // for retina
  return <img {...props} width={size} height={size} src={imgSrc} />
})
