import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

import {CompositeDisposable} from 'event-kit';

const editorProps = {
  autoIndent: PropTypes.bool,
  autoIndentOnPaste: PropTypes.bool,
  undoGroupingInterval: PropTypes.number,
  scrollSensitivity: PropTypes.number,
  encoding: PropTypes.string,
  softTabs: PropTypes.bool,
  atomicSoftTabs: PropTypes.bool,
  tabLength: PropTypes.number,
  softWrapped: PropTypes.bool,
  softWrapHangingIndentLenth: PropTypes.number,
  softWrapAtPreferredLineLength: PropTypes.bool,
  preferredLineLength: PropTypes.number,
  maxScreenLineLength: PropTypes.number,
  mini: PropTypes.bool,
  readOnly: PropTypes.bool,
  placeholderText: PropTypes.string,
  lineNumberGutterVisible: PropTypes.bool,
  showIndentGuide: PropTypes.bool,
  showLineNumbers: PropTypes.bool,
  showInvisibles: PropTypes.bool,
  invisibles: PropTypes.string,
  editorWidthInChars: PropTypes.number,
  width: PropTypes.number,
  scrollPastEnd: PropTypes.bool,
  autoHeight: PropTypes.bool,
  autoWidth: PropTypes.bool,
  showCursorOnSelection: PropTypes.bool,
};

export default class AtomTextEditor extends React.PureComponent {
  static propTypes = {
    ...editorProps,
    text: PropTypes.string,
    didChange: PropTypes.func,
    didChangeCursorPosition: PropTypes.func,
  }

  static defaultProps = {
    text: '',
    didChange: () => {},
    didChangeCursorPosition: () => {},
  }

  constructor(props, context) {
    super(props, context);

    this.subs = new CompositeDisposable();
    this.suppressChange = false;
  }

  render() {
    return (
      <atom-text-editor ref={c => { this.refElement = c; }} />
    );
  }

  componentDidMount() {
    this.setAttributesOnElement(this.props);

    const editor = this.getModel();
    this.subs.add(
      editor.onDidChange(this.didChange),
      editor.onDidChangeCursorPosition(this.didChangeCursorPosition),
    );
  }

  componentDidUpdate(prevProps) {
    this.setAttributesOnElement(this.props);
  }

  componentWillUnmount() {
    this.subs.dispose();
  }

  quietlySetText(text) {
    this.suppressChange = true;
    try {
      this.getModel().setText(text);
    } finally {
      this.suppressChange = false;
    }
  }

  setAttributesOnElement(theProps) {
    const modelProps = Object.keys(editorProps).reduce((ps, key) => {
      if (theProps[key] !== undefined) {
        ps[key] = theProps[key];
      }
      return ps;
    }, {});

    const editor = this.getModel();
    editor.update(modelProps);

    if (editor.getText() !== theProps.text) {
      this.quietlySetText(theProps.text);
    }
  }

  @autobind
  didChange() {
    if (this.suppressChange) {
      return;
    }

    this.props.didChange(this.getModel());
  }

  @autobind
  didChangeCursorPosition() {
    this.props.didChangeCursorPosition(this.getModel());
  }

  contains(element) {
    return this.refElement.contains(element);
  }

  focus() {
    this.refElement.focus();
  }

  getModel() {
    return this.refElement.getModel();
  }
}
