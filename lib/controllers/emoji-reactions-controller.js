import PropTypes from 'prop-types';
import React from 'react';
import {createFragmentContainer, graphql} from 'react-relay';

import EmojiReactionsView from '../views/emoji-reactions-view';
import RelayEnvironment from '../views/relay-environment';
import AddReactionMutation from '../mutations/add-reaction';
import RemoveReactionMutation from '../mutations/remove-reaction';

export class BareEmojiReactionsController extends React.Component {
  static contextType = RelayEnvironment;

  static propTypes = {
    reactable: PropTypes.shape({
      id: PropTypes.string.isRequired,
    }),
  }

  render() {
    return (
      <EmojiReactionsView
        addReaction={this.addReaction}
        removeReaction={this.removeReaction}
        {...this.props}
      />
    );
  }

  // TODO: handle mutation errors

  addReaction = content => AddReactionMutation(this.context, this.props.reactable.id, content);

  removeReaction = content => RemoveReactionMutation(this.context, this.props.reactable.id, content);
}

export default createFragmentContainer(BareEmojiReactionsController, {
  reactable: graphql`
    fragment emojiReactionsController_reactable on Reactable {
      id
      ...emojiReactionsView_reactable
    }
  `,
});
