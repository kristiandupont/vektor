import * as R from 'ramda';
import React, { Component } from 'react';
import View from './view';
import EditWindow from './EditWindow';
import './App.css';
import context, { evaluate } from './context';

const fs = window.electron.remote.require('fs');
const ipcRenderer = window.electron.ipcRenderer;

const trackedComponents = [];

function trackComponent(component) {
  component.setState({ context });
  trackedComponents.push(component);
}

function untrackComponent(component) {
  trackedComponents.splice(this.trackedComponents.indexOf(component), 1);
}

ipcRenderer.on('requestSave', function (event, arg) {
  ipcRenderer.send('save', { filename: arg, context });
})

ipcRenderer.on('load', function (event, arg) {
  context = JSON.parse(arg);
  trackedComponents.forEach(component => component.setState({ context }));
})

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      zoom: 1,
      edit: null,
      context: { watches: {} }
    };

    this.zoom = this.zoom.bind(this);
    this.closeEditWindow = this.closeEditWindow.bind(this);
    this.editWatch = this.editWatch.bind(this);
  }

  componentDidMount() {
    trackComponent(this);
  }

  componentWillUnmount() {
    untrackComponent(this);
  }
 
  zoom(ev) {
    if (!ev.shiftKey) {
      return;
    }

    const zoomFactor = 0.001 * ev.deltaY + 1;
    this.setState({ zoom: this.state.zoom * zoomFactor });
    ev.preventDefault();
  }

  closeEditWindow() {
    this.setState({edit: null});
  }

  editWatch(watch) {
    this.setState({
      edit: watch
    });
  }

  addNode() {
    const watchCount = R.keys(context.watches).length;
    const key = `node-${watchCount + 1}`;
    context.watches[key] = {
      code: '({ initialized: true })',
      func: undefined,
      lastEval: undefined,
      dependencies: [],
      view: {
        header: key,
        x: watchCount * 300,
        y: 10,
        width: 300,
        height: 200
      }
    };
    evaluate();
    this.forceUpdate();
  }

  render() {
    return (
      <div>
        { this.state.edit && 
          <EditWindow context={context} watch={this.state.edit} onClose={this.closeEditWindow} />
        }
        <div className="canvas" style={{ zoom: this.state.zoom }} onWheel={this.zoom}>
          <button onClick={this.addNode.bind(this)} >+</button>
          { R.keys(this.state.context.watches).map(key => {
            return <View key={key} context={this.state.context} watch={key} onEdit={this.editWatch} />;
          })}
        </div>
      </div>
    );
  }
}

export default App;
