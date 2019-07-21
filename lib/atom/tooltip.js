import {useRef, useEffect} from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';

import {RefHolderPropType} from '../prop-types';
import {useAtomEnv} from '../context/atom';
import {createItem} from '../helpers';

const VERBATIM_OPTION_PROPS = [
  'title', 'html', 'placement', 'trigger', 'keyBindingCommand', 'keyBindingTarget',
];

const OPTION_PROPS = [
  ...VERBATIM_OPTION_PROPS,
  'className', 'showDelay', 'hideDelay',
];

export default function Tooltip(props) {
  const atomEnv = useAtomEnv();

  const refSub = useRef(new Disposable());
  const tipSub = useRef(new Disposable());
  const domNode = useRef(null);

  useEffect(() => {
    if (props.children !== undefined) {
      domNode.current = document.createElement('div');
      domNode.current.className = 'react-atom-tooltip';
    }
  }, []);

  useEffect(() => {
    const options = {};
    VERBATIM_OPTION_PROPS.forEach(key => {
      if (props[key] !== undefined) {
        options[key] = props[key];
      }
    });
    if (props.className !== undefined) {
      options.class = props.className;
    }
    if (props.showDelay !== undefined || props.hideDelay !== undefined) {
      const delayDefaults = (props.trigger === 'hover' || props.trigger === undefined)
        && {show: 1000, hide: 100}
        || {show: 0, hide: 0};

      options.delay = {
        show: props.showDelay !== undefined ? props.showDelay : delayDefaults.show,
        hide: props.hideDelay !== undefined ? props.hideDelay : delayDefaults.hide,
      };
    }
    if (props.children !== undefined) {
      options.item = createItem(domNode.current, props.itemHolder);
    }

    refSub.current = props.target.observe(t => {
      tipSub.current.dispose();
      tipSub.current = atomEnv.tooltips.add(t, options);
      const h = props.tooltipHolder;
      if (h) {
        h.setter(tipSub.current);
      }
    });

    return () => {
      refSub.current.dispose();
      tipSub.current.dispose();
    };
  }, OPTION_PROPS.map(name => props[name]));

  if (props.children !== undefined) {
    return ReactDOM.createPortal(props.children, domNode.current);
  }

  return null;
}

Tooltip.propTypes = {
  target: RefHolderPropType.isRequired,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
  ]),
  html: PropTypes.bool,
  className: PropTypes.string,
  placement: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
  ]),
  trigger: PropTypes.oneOf(['hover', 'click', 'focus', 'manual']),
  showDelay: PropTypes.number,
  hideDelay: PropTypes.number,
  keyBindingCommand: PropTypes.string,
  keyBindingTarget: PropTypes.element,
  children: PropTypes.element,
  itemHolder: RefHolderPropType,
  tooltipHolder: RefHolderPropType,
};
