global.self = global;
import ExpoTHREE, { THREE } from 'expo-three';
import React from 'react';

import ImageExample from './Image';

// import { View as GraphicsView, AR, GLView } from 'react-native';
export default class App extends React.Component {
  componentWillMount() {
    THREE.suppressExpoWarnings();
  }

  render() {
    return <ImageExample />;
  }
}
