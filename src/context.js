import * as R from 'ramda';

const context = {
  watches: { }
};

window.context = context;

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
