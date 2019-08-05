import React, {Fragment} from 'react';
import PropTypes from 'prop-types';

import Commands, {Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';
import RefHolder from '../models/ref-holder';
import {unusedProps} from '../helpers';

export function makeTabbable(Component) {
  return class extends React.Component {
    static propTypes = {
      tabGroup: PropTypes.shape({
        appendElement: PropTypes.func.isRequired,
        removeElement: PropTypes.func.isRequired,
        focusAfter: PropTypes.func.isRequired,
        focusBefore: PropTypes.func.isRequired,
      }).isRequired,
      autofocus: PropTypes.bool,

      commands: PropTypes.object.isRequired,
    }

    static defaultProps = {
      autofocus: false,
    }

    constructor(props) {
      super(props);

      this.elementRef = new RefHolder();
    }

    render() {


      return (
        <Fragment>
          <Commands registry={this.props.commands} target={this.elementRef}>
            <Command command="core:focus-next" callback={this.focusNext} />
            <Command command="core:focus-previous" callback={this.focusPrevious} />
          </Commands>
          <Component
            ref={this.elementRef.setter}
            tabIndex="-1"
            {...unusedProps(this.props, this.constructor.propTypes)}
          />
        </Fragment>
      );
    }

    componentDidMount() {
      this.elementRef.map(element => this.props.tabGroup.appendElement(element, this.props.autofocus));
    }

    componentWillUnmount() {
      this.elementRef.map(element => this.props.tabGroup.removeElement(element));
    }

    focusNext = () => this.elementRef.map(element => this.props.tabGroup.focusAfter(element));

    focusPrevious = () => this.elementRef.map(element => this.props.tabGroup.focusBefore(element));
  };
}

export const TabbableInput = makeTabbable('input');

export const TabbableTextEditor = makeTabbable(AtomTextEditor);
