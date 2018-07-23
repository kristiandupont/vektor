import * as R from 'ramda';
import React, { Component } from 'react';
import ReactJson from 'react-json-view';
import MonacoEditor from 'react-monaco-editor';
import { evaluate } from './context';
import './EditWindow.css';

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
}

class EditWindow extends Component {
  constructor (props) {
    super(props);
    this.state = {
      code: props.context.watches[props.watch].code,
      name: props.watch,
      dependencies: props.context.watches[props.watch].dependencies.join(', '),
      result: props.context.watches[props.watch].lastEval
    };

    this.debouncedEvaluate = debounce(this.evaluate.bind(this), 200);
    this.nameRef = React.createRef();
    this.onChangeName = this.onChangeName.bind(this);
    this.dependenciesRef = React.createRef();
    this.onChangeDependencies = this.onChangeDependencies.bind(this);
  }

  editorDidMount (editor, monaco) {
    editor.focus();
  }

  onChange (newValue, e) {
    this.setState({code: newValue});
    this.debouncedEvaluate();
  }

  onChangeName (e) {
    this.setState({ name: this.nameRef.current.value });
  }

  onChangeDependencies (e) {
    this.setState({ dependencies: this.dependenciesRef.current.value });
  }

  onClose (en) {
    const watch = this.props.context.watches[this.props.watch];
    watch.code = this.state.code;
    watch.dependencies = R.map(R.trim, this.state.dependencies.split(','));
    watch.func = null;

    if (this.state.name !== this.props.watch) {
      delete this.props.context.watches[this.props.watch];
    }
    this.props.context.watches[this.state.name] = watch;
    evaluate();
    this.props.onClose();
  }

  evaluate () {
    let result = {
      result: '...'
    };
    try {
      const ps = [null].concat(this.state.dependencies, `return ${this.state.code};`);
      const f = new (Function.prototype.bind.apply(Function, ps));
      const dependencies = R.map(R.trim, this.state.dependencies.split(','));
      const params = R.map(d => this.props.context.watches[d].lastEval, dependencies);
      const rawResult = f.apply(null, params);

      result = typeof rawResult === 'object' ? rawResult : { result: rawResult };
    }
    catch (e) {
      result = e;
    }
    this.setState({result});
  }

  render () {
    const code = this.state.code;
    const result = this.state.result;

    const options = {
      selectOnLineNumbers: true,
      minimap: false
    };

    const dependencies = this.props.context.watches[this.props.watch].dependencies.join(', ');

    return (
      <div className="edit-window">
        <input type="text" placeholder="name" defaultValue={this.props.watch} ref={this.nameRef} onChange={this.onChangeName} />
        <input type="text" placeholder="dependencies" defaultValue={dependencies} ref={this.dependenciesRef} onChange={this.onChangeDependencies} />
        <div className="close-button" onClick={this.onClose.bind(this)}><i className="fa fa-times-circle"></i></div>
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

export default EditWindow;
