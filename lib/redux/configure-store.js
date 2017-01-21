import {createStore, applyMiddleware, compose} from 'redux';
import rootReducer from './reducers';

export default function configureStore(deserializedData = {}) {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(rootReducer, deserializedData, composeEnhancers(
    applyMiddleware(/* middleware */),
  ));
  return store;
}
