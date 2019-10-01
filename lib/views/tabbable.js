import React, {Fragment} from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';

import Commands, {Command} from '../atom/commands';
import AtomTextEditor from '../atom/atom-text-editor';
import RefHolder from '../models/ref-holder';
import {RefHolderPropType} from '../prop-types';
import {unusedProps} from '../helpers';

export function makeTabbable(Component, options = {}) {
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

      this.rootRef = new RefHolder();
      this.elementRef = new RefHolder();

      if (options.rootRefProp) {
        this.rootRef = new RefHolder();
        this.rootRefProps = {[options.rootRefProp]: this.rootRef};
      } else {
        this.rootRef = this.elementRef;
        this.rootRefProps = {};
      }
    }

    render() {
      return (
        <Fragment>
          <Commands registry={this.props.commands} target={this.rootRef}>
            <Command command="core:focus-next" callback={this.focusNext} />
            <Command command="core:focus-previous" callback={this.focusPrevious} />
          </Commands>
          <Component
            ref={this.elementRef.setter}
            tabIndex={-1}
            {...unusedProps(this.props, this.constructor.propTypes)}
            {...this.rootRefProps}
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

export const TabbableButton = makeTabbable('button');

export const TabbableSummary = makeTabbable('summary');

export const TabbableTextEditor = makeTabbable(AtomTextEditor, {rootRefProp: 'refElement'});

class WrapSelect extends React.Component {
  static propTypes = {
    refElement: RefHolderPropType.isRequired,
  }

  constructor(props) {
    super(props);

    this.refSelect = new RefHolder();
  }

  render() {
    return (
      <div className="github-TabbableWrapper" ref={this.props.refElement.setter}>
        <Select
          ref={this.refSelect.setter}
          {...unusedProps(this.props, this.constructor.propTypes)}
        />
      </div>
    );
  }

  focus() {
    return this.refSelect.map(select => select.focus());
  }
}

export const TabbableSelect = makeTabbable(WrapSelect, {rootRefProp: 'refElement'});
