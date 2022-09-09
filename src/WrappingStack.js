export default function WrappingStack(opt_stackSize) {
  var stackSize = opt_stackSize || 256;
  var sp = 0;
  var stack = [];
  for (var ii = 0; ii < stackSize; ++ii) {
    stack.push(0);
  }

  var push = function(v) {
    stack[sp++] = v;
    sp = sp % stackSize;
  };

  var pop = function() {
    sp = (sp == 0) ? (stackSize - 1) : (sp - 1);
    return stack[sp];
  };

  var pick = function(index) {
    var i = sp - Math.floor(index) - 1;
    while (i < 0) {
      i += stackSize;
    }
    return stack[i % stackSize];
  };

  var put = function(index, value) {
    i = sp - Math.floor(index);
    while (i < 0) {
      i += stackSize;
    }
    stack[i % stackSize] = value;
  };

  var getSP = function() {
    return sp;
  };

  return {
    pop: pop,
    push: push,
    pick: pick,
    put: put,
    sp: getSP,
  };
};