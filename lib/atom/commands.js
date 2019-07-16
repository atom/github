import React, {useContext, useEffect} from 'react';
import {Disposable} from 'event-kit';
import PropTypes from 'prop-types';

import {useAtomEnv} from '../context/atom';
import RefHolder from '../models/ref-holder';
import {RefHolderPropType, DOMNodePropType} from '../prop-types';

const CommandsContext = React.createContext({registry: null, target: null});

export function Commands({target, children}) {
  const registry = useAtomEnv().commands;
  const context = {registry, target};

  return (
    <CommandsContext.Provider value={context}>
      {children}
    </CommandsContext.Provider>
  );
}

Commands.propTypes = {
  target: PropTypes.oneOf([
    PropTypes.string,
    DOMNodePropType,
    RefHolderPropType,
  ]).isRequired,
  children: PropTypes.node.isRequired,
};

export function Command({command, callback}) {
  const {registry, target} = useContext(CommandsContext);

  let subTarget = new Disposable();
  let subCommand = new Disposable();

  useEffect(() => {
    subTarget.dispose();
    subTarget = RefHolder.on(target).observe(t => {
      subCommand.dispose();
      subCommand = registry.add(t, command, callback);
    });
    return () => {
      subTarget.dispose();
      subCommand.dispose();
    };
  }, [registry, target]);

  if (registry === null || target === null) {
    throw new Error('Attempt to render Command outside of Commands');
  }

  return null;
}

Command.propTypes = {
  command: PropTypes.string.isRequired,
  callback: PropTypes.func.isRequired,
};
