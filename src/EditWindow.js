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
        <input type="text" placeholder="name" />
        <input type="text" placeholder="dependencies" />
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
