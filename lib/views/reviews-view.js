import React from 'react';
import {inspect} from 'util';

export default class ReviewsView extends React.Component {
  render() {
    return (
      <div>
        <h2>HELL YEAH PR REVIEW COMMENTS</h2>
        <pre>{inspect(this.props, {depth: 4})}</pre>
      </div>
    );
  }
}
