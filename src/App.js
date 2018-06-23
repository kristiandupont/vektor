import * as R from 'ramda';
import React, { Component } from 'react';
import ReactJson from 'react-json-view';
import MonacoEditor from 'react-monaco-editor';
import './App.css';

const context = {
  watches: {
    'primary': {
      code: '({x: 42, y: 32})',
      func: undefined,
      lastEval: undefined,
      dependencies: [],
      view: {
        header: 'Primary',
        x: 10,
        y: 10,
        width: 300,
        height: 200
      }
    },

    'derived': {
      code: '({ fromPrimary: primary, state: \'loaded\' })',
      func: undefined,
      lastEval: undefined,
      dependencies: ['primary'],
      view: {
        header: 'Derived',
        x: 400,
        y: 10,
        width: 400,
        height: 300
      }
    }
  }
};

window.context = context;

function evaluate () {
  R.forEachObjIndexed((value, key) => {
    if (!value.func) {
      const ps = [null].concat(value.dependencies, `return ${value.code};`);
      const f = new (Function.prototype.bind.apply(Function, ps));
      value.func = f;
    }
    const params = R.map(d => context.watches[d].lastEval, value.dependencies);
    value.lastEval = value.func.apply(null, params);
  }, context.watches);
}

evaluate();

class View extends Component {
  constructor(props) {
    super(props);
    this.state = {
      x: context.watches[props.watch].view.x,
      y: context.watches[props.watch].view.y,
      dragging: false
    };
    this.myRef = React.createRef();

    this.dragMouseDown = this.dragMouseDown.bind(this);
    this.dragMouseUp = this.dragMouseUp.bind(this);
    this.dragMouseMove = this.dragMouseMove.bind(this);
  }

  dragMouseDown(ev) {
    const r = this.myRef.current.getBoundingClientRect();
    const dragOffsetX = ev.clientX - r.left;
    const dragOffsetY = ev.clientY - r.top;
    this.setState({dragging: true, dragOffsetX, dragOffsetY});
    document.addEventListener('mousemove', this.dragMouseMove);
    document.addEventListener('mouseup', this.dragMouseUp);
    ev.preventDefault();
  }

  dragMouseUp(ev) {
    this.setState({dragging: false});
    document.removeEventListener('mousemove', this.dragMouseMove);
    document.removeEventListener('mouseup', this.dragMouseUp);
    ev.preventDefault();
  }

  dragMouseMove(ev) {
    if (!this.state.dragging) {
      return;
    }
    this.setState({
      x: ev.pageX - this.state.dragOffsetX,
      y: ev.pageY - this.state.dragOffsetY
    });
  }

  onEdit(ev) {
    this.props.onEdit(this.props.watch);
  }

  render() {
    const classes = ['box'];
    if (this.state.dragging) {
      classes.push('drag');
    }

    const style = {
      left: this.state.x,
      top: this.state.y
    }

    const watch = this.props.context.watches[this.props.watch];

    return (
      <div className={classes.join(' ')} style={style} ref={this.myRef}>
        <div className="header" onMouseDown={this.dragMouseDown}>
          {watch.view.header}
        </div>
        <div className="edit-button" onMouseDown={this.onEdit.bind(this)}>
          *
        </div>
          <ReactJson src={watch.lastEval} />
      </div>
    );
  }
}

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var ctx = this, args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(ctx, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(ctx, args);
  };
};

class EditWindow extends Component {
  constructor(props) {
    super(props);
    this.state = {
      code: props.context.watches[props.watch].code,
      result: props.context.watches[props.watch].lastEval
    };

    this.debouncedEvaluate = debounce(this.evaluate.bind(this), 200);
  }

  editorDidMount(editor, monaco) {
    console.log('editorDidMount', editor);
    editor.focus();
  }

  onChange(newValue, e) {
    this.setState({code: newValue});
    this.debouncedEvaluate();
  }

  onClose(en) {
    this.props.context.watches[this.props.watch].code = this.state.code;
    this.props.context.watches[this.props.watch].func = null;
    evaluate();
    this.props.onClose();
  }

  evaluate() {
    console.log('EVALUATE');
    let result = {
      result: '...'
    };
    try {
      const value = this.props.context.watches[this.props.watch];
      const ps = [null].concat(value.dependencies, `return ${this.state.code};`);
      const f = new (Function.prototype.bind.apply(Function, ps));
      const params = R.map(d => this.props.context.watches[d].lastEval, value.dependencies);
      const rawResult = f.apply(null, params);

      result = typeof rawResult === 'object' ? rawResult : { result: rawResult };
    }
    catch (e) {
      result = e;
    }
    this.setState({result});
  }

  render() {
    const code = this.state.code;
    const result = this.state.result;

    const options = {
      selectOnLineNumbers: true,
      minimap: false
    };

    return (
      <div className="edit-window">
        <div className="close-button" onClick={this.onClose.bind(this)}>X</div>
        <div className="editor-left">
          <MonacoEditor
            language="javascript"
            theme="vs-dark"
            value={code}
            options={options}
            onChange={this.onChange.bind(this)}
            editorDidMount={this.editorDidMount.bind(this)}
          />
        </div>
        <div className="editor-right">
          <ReactJson src={result} />
        </div>
      </div>
    );
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      zoom: 1,
      edit: null
    };

    this.zoom = this.zoom.bind(this);
    this.closeEditWindow = this.closeEditWindow.bind(this);
    this.editWatch = this.editWatch.bind(this);
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

  evaluate() {
    console.log('!');
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
          {/* <button onClick={this.evaluate.bind(this)} >Evaluate</button> */}
          { R.keys(context.watches).map(key => {
            return <View context={context} watch={key} onEdit={this.editWatch} />;
          })}
        </div>
      </div>
    );
  }
}

export default App;