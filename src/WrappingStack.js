export default class WrappingStack {
  constructor(stackSize = 256) {
    let sp = 0;
    const stack = [];
    for (let ii = 0; ii < stackSize; ++ii) {
      stack.push(0);
    }

    const push = function(v) {
      stack[sp++] = v;
      sp = sp % stackSize;
    };

    const pop = function() {
      sp = (sp === 0) ? (stackSize - 1) : (sp - 1);
      return stack[sp];
    };

    const pick = function(index) {
      let i = sp - Math.floor(index) - 1;
      while (i < 0) {
        i += stackSize;
      }
      return stack[i % stackSize];
    };

    const put = function(index, value) {
      let i = sp - Math.floor(index);
      while (i < 0) {
        i += stackSize;
      }
      stack[i % stackSize] = value;
    };

    const getSP = function() {
      return sp;
    };

    return {
      pop: pop,
      push: push,
      pick: pick,
      put: put,
      sp: getSP,
    };
  }
}