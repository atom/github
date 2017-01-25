import {createStore, applyMiddleware, compose} from 'redux';
import rootReducer from './reducers';

export default function configureStore(deserializedData = {}) {
  const store = createStore(rootReducer, deserializedData);
  return store;
}
