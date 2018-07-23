import * as R from 'ramda';

const ipcRenderer = window.electron.ipcRenderer;

let context = {
  watches: { }
};

window.context = context;
ipcRenderer.on('requestSave', function (event, arg) {
  ipcRenderer.send('save', { filename: arg, context });
})

ipcRenderer.on('load', function (event, arg) {
  context = JSON.parse(arg);
  trackedComponents.forEach(component => component.setState({ context }));
})


const trackedComponents = [];

export function trackComponent(component) {
  component.setState({ context });
  trackedComponents.push(component);
}

export function untrackComponent(component) {
  trackedComponents.splice(this.trackedComponents.indexOf(component), 1);
}

export default context;

export function evaluate () {
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
