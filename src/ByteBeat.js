/* global globalThis */
import WrappingStack from './WrappingStack.js';

function strip(s) {
  return s.replace(/^\s+/, '').replace(/\s+$/, '');
}

const replaceRE = /\$\((\w+)\)/g;

/**
 * Replaces strings with property values.
 * Given a string like "hello $(first) $(last)" and an object
 * like {first:"John", last:"Smith"} will return
 * "hello John Smith".
 * @param {string} str String to do replacements in
 * @param {...} 1 or more objects containing properties.
 */
const replaceParams = function(str, ...args) {
  return str.replace(replaceRE, function(str, p1/*, offset, s*/) {
    for (let ii = 0; ii < args.length; ++ii) {
      if (args[ii][p1] !== undefined) {
        return args[ii][p1];
      }
    }
    throw new Error(`unknown string param '${p1}'`);
  });
};

function removeCommentsAndLineBreaks(x) {
  // remove comments (hacky)
  x = x.replace(/\/\/.*/g, ' ');
  x = x.replace(/\n/g, ' ');
  x = x.replace(/\/\*.*?\*\//g, ' ');
  return x;
}

const glitchToPostfix = (function() {
  const glitchToPostfixConversion = {
      'a': 't',
      'b': 'put',
      'c': 'drop',

      'd': '*',
      'e': '/',
      'f': '+',
      'g': '-',
      'h': '%',

      'j': '<<',
      'k': '>>',
      'l': '&',
      'm': '|',
      'n': '^',
      'o': '~',

      'p': 'dup',
      'q': 'pick',
      'r': 'swap',

      's': '<',
      't': '>',
      'u': '=',
      '/': '//',

      '!': '\n',
      '.': ' ',
  };

  const isCapitalHex = function(c) {
    return ((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F'));
  };

  return function(x) {
    // Convert to postfix
    const postfix = [];

    x = x.replace('glitch://', ''); // remove "glitch:"
    x = removeCommentsAndLineBreaks(x);
    x = x.replace('glitch:', ''); // remove "glitch:"
    x = x.replace(/^[^!]*!/, ''); // remove label

    for (let i = 0; i < x.length; ++i) {
      let done = false;
      let imd = '';

      // NOTE: works by magic when number is at end. While gathering
      // imd if we're at the end of the string 'c' will be undefined
      // which will fail isCapitalHex and so the last imd will be put in
      // correctly.
      let c;
      while (!done) {
        c = x[i];
        if (isCapitalHex(c)) {
          imd = imd + c;
          ++i;
        } else {
          done = true;
          if (imd.length) {
            --i;
            c = '0x' + imd;
          }
        }
      }
      postfix.push(glitchToPostfixConversion[c] || c);
    }
    return postfix.join(' ');
  };

}());

const int8 = new Int8Array(1);

class ByteBeatProcessor {
  static s_samplers = {
    array: [
      // case 0: // bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          const s = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
          buffer0[i] = (s[0] & 255) / 127 - 1;
          buffer1[i] = (s[1] & 255) / 127 - 1;
        }
      },
      // case 1:  // floatbeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          const s = fn0((time++ / divisor), undefined, stack0, ctx0, extra);
          buffer0[i] = s[0];
          buffer1[i] = s[1];
        }
      },
      // case 2:  // signed bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          const s = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
          int8[0] = s[0];
          buffer0[i] = int8[0] / 128;
          int8[0] = s[1];
          buffer1[i] = int8[0] / 128;
        }
      },
    ],
    twoChannels: [
      // case 0: // bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          buffer0[i] = (fn0((time  ) / divisor, undefined, stack0, ctx0, extra) & 255) / 127 - 1;
          buffer1[i] = (fn1((time++) / divisor, undefined, stack1, ctx1, extra) & 255) / 127 - 1;
        }
      },
      // case 1:  // floatbeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          buffer0[i] = fn0((time  ) / divisor, undefined, stack0, ctx0, extra);
          buffer1[i] = fn1((time++) / divisor, undefined, stack1, ctx1, extra);
        }
      },
      // case 2:  // signed bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          int8[0] = fn0((time  ) / divisor, undefined, stack0, ctx0, extra);
          buffer0[i] = int8[0] / 128;
          int8[0] = fn1((time++) / divisor, undefined, stack1, ctx1, extra);
          buffer1[i] = int8[0] / 128;
        }
      },
    ],
    oneChannel: [
      // case 0: // bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          buffer0[i] = (fn0((time++) / divisor, undefined, stack0, ctx0, extra) & 255) / 127 - 1;
        }
      },
      // case 1: // floatbeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          buffer0[i] = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
        }
      },
      // case 2: // signed bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        for (let i = 0; i < lastSample; ++i) {
          int8[0] = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
          buffer0[i] = int8[0] / 128;
        }
      },
    ],
  };

  static makeContext() {
    return {
      console: {
        Math: {
          // because`log` gets changed to Math.log
          log: console.log.bind(console),
        },
      },
    };
  }

  static is2NumberArray(v) {
    return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
  }

  static expressionStringToFn(evalExp, extra, test) {
    // eslint-disable-next-line no-new-func
    const fp = new Function('stack', 'window', 'extra', evalExp);
    let f = fp(undefined, undefined, undefined);
    const ctx = ByteBeatProcessor.makeContext();

    const stack = new WrappingStack();
    const tempExtra = Object.assign({}, extra);
    // check function
    let v = f(0, 0, stack, ctx, tempExtra);
    if (typeof v === 'function') {
      f = f();
      v = f(0, 0, stack, ctx, tempExtra);
    }
    const array = ByteBeatProcessor.is2NumberArray(v);

    if (test) {
      for (let i = 0; i < 1000; i += 100) {
        let s = f(i, i, stack, ctx, tempExtra);
        //if (i === 0) {
        //  console.log('stack: ' + stack.sp());
        //}
        //log("" + i + ": " + s);
        if (typeof s === 'function') {
          f = f();
          s = 0;
        }
        if (ByteBeatProcessor.is2NumberArray(s)) {
          continue;
        }
        if (typeof s !== 'number') {
          throw 'NaN';
        }
      }
    }

    return {f, array};
  }

  static interpolate(buf, ndx) {
    const n = ndx | 0;
    const f = ndx % 1;
    const v0 = buf[n];
    const v1 = buf[n + 1];
    return v0 + (v1 - v0) * f;
  }

  static trunc(buf, ndx) {
    return buf[ndx | 0];
  }



  constructor(actualSampleRate) {
    this.actualSampleRate = actualSampleRate;
    this.buffer0 = new Float32Array(4096);
    this.buffer1 = new Float32Array(4096);
    this.desiredSampleRate = 8000;
    this.time = 0;
    this.expandMode = 1;
    this.type = 0;
    this.expressionType = 0;
    this.functions = [
      {
        f: function(t) {
          return Math.sin(t) * 0.1;
        },
        array: false,
      },
    ];
    this.contexts = [ByteBeatProcessor.makeContext(), ByteBeatProcessor.makeContext()];
    this.expressions = ['Math.sin(t) * 0.1'];
    this.extra = {
      mouseX: 0,
      mouseY: 0,
      width: 1,
      height: 1,
      tiltX: 0,
      tiltY: 0,
      compass: 0,
      sampleRate: 0,
    };
    this.stacks = [new WrappingStack(), new WrappingStack()];
  }

  reset() {
    this.time = 0;
  }

  setProperties(props) {
    Object.assign(this, props);
  }

  setExtra(props) {
    Object.assign(this.extra, props);
  }

  getTime() {
    return this.convertToDesiredSampleRate(this.time);
  }

  recompile() {
    this.setExpressions(this.getExpressions());
  }

  convertToDesiredSampleRate(rate) {
    return Math.floor(rate * this.desiredSampleRate / this.actualSampleRate);
  }

  setDesiredSampleRate(rate) {
    this.desiredSampleRate = rate;
    this.extra.sampleRate = rate;
  }

  getDesiredSampleRate() {
    return this.desiredSampleRate;
  }

  setExpressionType(type) {
    this.expressionType = type;
  }

  setExpressions(expressions) {
    this.functions = expressions.map(expression => {
      return ByteBeatProcessor.expressionStringToFn(expression, {}, false);
    });
  }

  getExpressionType() {
    return this.expressionType;
  }

  setType(type) {
    this.type = type;
  }

  getType() {
    return this.type;
  }

  getNumChannels() {
    const fn1 = (this.functions[1] || {}).f;
    return (this.functions[0].array || fn1) ? 2 : 1;
  }

  process(dataLength, leftData, rightData) {
    const time = this.convertToDesiredSampleRate(this.time);
    const lastSample = this.convertToDesiredSampleRate(dataLength) + 2;
    if (this.buffer0.length < lastSample) {
      this.buffer0 = new Float32Array(lastSample);
      this.buffer1 = new Float32Array(lastSample);
    }
    //
    const fn0 = this.functions[0].f;
    const fn0Array = this.functions[0].array;
    const fn1 = (this.functions[1] || {}).f;
    const stack0 = this.stacks[0];
    const stack1 = this.stacks[1];
    const ctx0 = this.contexts[0];
    const ctx1 = this.contexts[1];
    const buffer0 = this.buffer0;
    const buffer1 = (fn0Array || fn1) ? this.buffer1 : buffer0;
    const extra = this.extra;
    const divisor = 1; //this.expressionType === 3 ? this.getDesiredSampleRate() : 1;

    const samplerGroup = fn0Array
        ? ByteBeatProcessor.s_samplers.array
        : fn1
            ? ByteBeatProcessor.s_samplers.twoChannels
            : ByteBeatProcessor.s_samplers.oneChannel;
    const sampler = samplerGroup[this.type];
    sampler(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample);

    if (dataLength) {
      const step = this.convertToDesiredSampleRate(dataLength) / dataLength;

      const expandFn = this.expandMode ? ByteBeatProcessor.interpolate : ByteBeatProcessor.trunc;
      let ndx = 0;

      if (rightData) {
        for (let i = 0; i < dataLength; ++i) {
          leftData[i] = expandFn(buffer0, ndx);
          rightData[i] = expandFn(buffer1, ndx);
          ndx += step;
        }
      } else {
        for (let i = 0; i < dataLength; ++i) {
          leftData[i * 2] = expandFn(buffer0, ndx);
          leftData[i * 2 + 1] = expandFn(buffer1, ndx);
          ndx += step;
        }
      }
    }

//    if (this.visualizer) {
//      this.visualizer.update(buffer0, buffer1, lastSample - 1);
//    }

    this.time += dataLength;
  }

  getSampleForTime(time, context, stack, channel = 0) {
    const divisor = 1; //this.expressionType === 3 ? this.getDesiredSampleRate() : 1;
    let s = 0;
    if (this.functions[0].array) {
      const ss = this.functions[0].f(time / divisor, channel, stack, context, this.extra);
      s = ss[channel];
    } else {
      if (!this.functions[1]) {
        channel = 0;
      }
      s = this.functions[channel].f(time / divisor, channel, stack, context, this.extra);
    }
    switch (this.type) {
      case 0:
        return (s & 255) / 127 - 1;
      case 1:
        return s;
      case 2:
        int8[0] = s;
        return int8[0] / 128;
      default:
        return 0;
    }
  }
}

//const s_samplers = {
//${[...Object.entries(s_samplers)].map(([key, value]) => {
//  return `${key}: [${value.map(fn => `${fn.toString()}`).join(',\n')}\n]`;
//}).join(',\n')}
//};

const beatProcessorJS = `
const int8 = new Int8Array(1);

${WrappingStack.toString()}

${ByteBeatProcessor.toString()}

class BeatWorkletProcessor extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      { name: 'sampleRate', defaultValue: 8000 },
    ];
  }

  constructor() {
    super();
    this.byteBeat = new ByteBeatProcessor();
    this.port.onmessage = (event) => {
      const {cmd, data} = event.data;
      const fn = this[cmd];//  || this.prototype[cmd];
      if (fn) {
        fn.call(this, data);
      } else {
        throw new Error(\`BeatProcessor unknown command: '\${cmd}'\`);
      }
    };
  }

  setProperties(data) {
    this.byteBeat.setProperties(data);
  }

  setExtra(data) {
    this.byteBeat.setExtra(data);
  }

  setExpressions(data) {
    this.byteBeat.setExpressions(data);
  }

  process(inputs, outputs, parameters) {
    this.byteBeat.process(outputs[0][0].length, outputs[0][0], outputs[0][1]);
    return true;
  }
}

registerProcessor('beat-processor', BeatWorkletProcessor);
`;
const workerURL = URL.createObjectURL(new Blob([beatProcessorJS], {type: 'application/javascript'}));


export default class ByteBeat {
  constructor() {
    this.postfixTemplate = `
      return function(t, i, stack, window, extra) {
        $(exp)
      };
    `;

    window.addEventListener('mousemove', (event) => {
      this._sendExtra({
        mouseX: event.clientX,
        mouseY: event.clientY,
      });
    }, true);

    if (window.DeviceOrientationEvent) {
      // Listen for the deviceorientation event and handle the raw data
      window.addEventListener('deviceorientation', (eventData) => {
        this._sendExtra({
          // gamma is the left-to-right tilt in degrees, where right is positive
          tiltX: eventData.gamma,

          // beta is the front-to-back tilt in degrees, where front is positive
          tiltY: eventData.beta,

          // alpha is the compass direction the device is facing in degrees
          compass: eventData.alpha,
        });
      }, false);
    }

    // save up the messages until the AudioWorkletNode is ready
    const msgs = [];
    this.node = {
      port: {
        postMessage(data) {
          msgs.push(data);
        },
      },
    };

    // TODO: rename - this is the previous expressions so we don't
    // double compile
    this.expressions = [];

    // TODO: add 'makeExtra'. This is needed at compile time
    this.extra = {};

    const context = new AudioContext();
    this.context = context;
    this.byteBeat = new ByteBeatProcessor(context.sampleRate);
    this._sendProperties({actualSampleRate: context.sampleRate});
    context.audioWorklet.addModule(workerURL)
      .then(() => {
        this.node = new AudioWorkletNode(context, 'beat-processor', { outputChannelCount: [2] });
        for (const msg of msgs) {
          this.node.port.postMessage(msg);
        }
      });

    const analyser = context.createAnalyser();
    this.analyser = analyser;

    // Make a buffer to receive the audio data
    const numPoints = analyser.frequencyBinCount;
    this.audioUint8DataArray = new Uint8Array(numPoints);
    this.audioFloat32DataArray = new Float32Array(numPoints);

    this.good = true;
  }

  static makeContext() {
    return ByteBeatProcessor.makeContext();
  }

  _sendExtra(data) {
    this.node.port.postMessage({
      cmd: 'setExtra',
      data,
    });
  }

  _sendProperties(data) {
    this.node.port.postMessage({
      cmd: 'setProperties',
      data,
    });
  }

  resize(width, height) {
    this._sendExtra({width, height});
  }

  setVisualizer(visualizer) {
    this.visualizer = visualizer;
  }

  reset() {
    this._sendProperties({time: 0});
  }

  resume(callback) {
    if (this.context.resume) {
      console.log('called resume');
      this.context.resume().then(callback);
    } else {
      callback();
    }
  }

  getTime() {
    return this.convertToDesiredSampleRate(this.time);
  }

  setOnCompile(callback) {
    this.onCompileCallback = callback;
  }

  recompile() {
    this.setExpressions(this.getExpressions());
  }

  setOptions(sections) {
    this.expandMode = (sections['linear'] !== undefined);
  }

  setExpressions(expressions/*, extra */) {
    const postfixTemplate = this.postfixTemplate;
    let evalExp;

    this.fnHeader = this.fnHeader || (function() {
      const keys = {};
      //const filter = _ => true;
      const filter = n => n === 'scroll' || n === 'sin';
      Object.getOwnPropertyNames(globalThis).filter(filter).forEach((key) => {
        keys[key] = true;
      });
      delete keys['Math'];
      delete keys['window'];
      return `
          var ${Object.keys(keys).sort().join(',\n')};
          var ${Object.getOwnPropertyNames(Math).map(key => {
            const value = Math[key];
            return (typeof value === 'function')
                ? `${key} = Math.${key}.bind(Math)`
                : `${key} = Math.${key}`;
          }).join(',\n')};
      `;
    }());
    const fnHeader = this.fnHeader;

    function postfixToInfix(x) {
      x = removeCommentsAndLineBreaks(x);
      // compress space
      x = x.replace(/(\r\n|\r|\n|\t| )+/gm, ' ');
      const tokens = strip(x).split(' ');
      const steps = [];
      for (let i = 0; i < tokens.length; ++i) {
        const token = tokens[i];
        switch (token.toLowerCase()) {
        case '>':
          steps.push('var v1 = stack.pop();');
          steps.push('var v2 = stack.pop();');
          steps.push('stack.push((v1 < v2) ? 0xFFFFFFFF : 0);');
          break;
        case '<':
          steps.push('var v1 = stack.pop();');
          steps.push('var v2 = stack.pop();');
          steps.push('stack.push((v1 > v2) ? 0xFFFFFFFF : 0);');
          break;
        case '=':
          steps.push('var v1 = stack.pop();');
          steps.push('var v2 = stack.pop();');
          steps.push('stack.push((v2 == v1) ? 0xFFFFFFFF : 0);');
          break;
        case 'drop':
          steps.push('stack.pop();');
          break;
        case 'dup':
          steps.push('stack.push(stack.pick(0));');
          break;
        case 'swap':
          steps.push('var a1 = stack.pop();');
          steps.push('var a0 = stack.pop();');
          steps.push('stack.push(a1);');
          steps.push('stack.push(a0);');
          break;
        case 'pick':
          steps.push('var a0 = stack.pop();');
          steps.push('stack.push(stack.pick(a0));');
          break;
        case 'put':
          steps.push('var a0 = stack.pop();');
          steps.push('var a1 = stack.pick(0);');
          steps.push('stack.put(a0, a1);');
          break;
        case 'abs':
        case 'sqrt':
        case 'round':
        case 'tan':
        case 'log':
        case 'exp':
        case 'sin':
        case 'cos':
        case 'floor':
        case 'ceil':
        case 'int':
          steps.push('var a0 = stack.pop();');
          steps.push('stack.push(' + token + '(a0));');
          break;
        case 'max':
        case 'min':
        case 'pow':
          steps.push('var a0 = stack.pop();');
          steps.push('var a1 = stack.pop();');
          steps.push('stack.push(' + token + '(a1, a0));');
          break;
        case 'random':
          steps.push('stack.push(' + token + '());');
          break;
        case '/':
        case '+':
        case '-':
        case '*':
        case '%':
        case '>>':
        case '<<':
        case '|':
        case '&':
        case '^':
        case '&&':
        case '||':
          steps.push('var a1 = stack.pop();');
          steps.push('var a0 = stack.pop();');
          steps.push('stack.push((a0 ' + token + ' a1) | 0);');
          break;
        case '~':
          steps.push('var a0 = stack.pop();');
          steps.push('stack.push(~a0);');
          break;
        default:
          steps.push('stack.push(' + token + ');');
          break;
        }
      }

      steps.push('return stack.pop();');

      const exp = replaceParams(postfixTemplate, {
        exp: steps.join('\n'),
      });
      return exp;
    }

    function compileExpression(x, expressionType, extra) {
      if (expressionType === 3) {  // function
        x = `
            return function(t, i, stack, window, extra) { 
                ${strip(x)};
            }`;
      } else {
        if (expressionType === 2) {  // glitch
          x = glitchToPostfix(x);
          expressionType = 1;
        }
        if (expressionType === 1) {  // postfix
          x = postfixToInfix(x);
        } else {  // infix
          x = `
              return function(t, i, stack, window, extra) { 
                  return ${strip(x)};
              }`;
        }
      }

      x = removeCommentsAndLineBreaks(x);
      // Translate a few things.
      function replacer(str, obj, p1, name) {
        return Object.prototype.hasOwnProperty.call(obj, p1) ? (name + p1) : str;
      }
      x = x.replace(/\bint\b/g, 'floor');
      x = x.replace(/(?:extra\.)?(\w+)/g, function(substr, p1) {
        return replacer(substr, extra, p1, 'extra.');
      });

      evalExp = `${fnHeader}${x}`;

      const result = ByteBeatProcessor.expressionStringToFn(evalExp, extra, true);
      return {
        ...result,
        expression: evalExp,
      };
    }

    const funcs = [];
    try {
      for (let i = 0; i < expressions.length; ++i) {
        const exp = expressions[i];
        if (exp !== this.expressions[i]) {
          funcs.push(compileExpression(exp, this.expressionType, this.extra));
        } else {
          if (this.functions[i]) {
            funcs.push(this.functions[i]);
          }
        }
      }
    } catch (e) {
      if (this.onCompileCallback) {
        if (e.stack) {
          const m = /<anonymous>:1:(\d+)/.exec(e.stack);
          if (m) {
            const charNdx = parseInt(m[1]);
            console.error(e.stack);
            console.error(evalExp.substring(0, charNdx), '-----VVVVV-----\n', evalExp.substring(charNdx));
          }
        } else {
          console.error(e, e.stack);
        }
        this.onCompileCallback(e.toString());
      }
      return;
    }

    // copy the expressions
    this.expressions = expressions.slice(0);
    this.functions = funcs;
    const exp = funcs.map(({expression}) => expression);
    this.node.port.postMessage({
      cmd: 'setExpressions',
      data: exp,
    });
    this.byteBeat.setExpressions(exp);
    if (this.onCompileCallback) {
      this.onCompileCallback(null);
    }
  }

  convertToDesiredSampleRate(rate) {
    return Math.floor(rate * this.desiredSampleRate / this.actualSampleRate);
  }

  setDesiredSampleRate(rate) {
    this._sendProperties({desiredSampleRate: rate});
    this._sendExtra({sampleRate: rate});
    this.byteBeat.setDesiredSampleRate(rate);
  }

  getDesiredSampleRate() {
    return this.byteBeat.getDesiredSampleRate();
  }

  setExpressionType(type) {
    this.expressionType = type;
    this.byteBeat.setExpressionType(type);
    this._sendProperties({expressionType: type});
  }

  getExpressions() {
    return this.expressions.slice();
  }

  getExpressionType() {
    return this.byteBeat.getExpressionType();
  }

  setType(type) {
    this.byteBeat.setType(type);
    this._sendProperties({type});
  }

  getType() {
    return this.byteBeat.getType();
  }

  getNumChannels() {
    return this.byteBeat.getNumChannels();
  }

  process(dataLength, leftData, rightData) {
    this.byteBeat.process(dataLength, leftData, rightData);
  }

  getSampleForTime(time, context, stack, channel) {
    return this.byteBeat.getSampleForTime(time, context, stack, channel);
  }

  getByteAudioData(destArray) {
    destArray = destArray || this.audioUint8DataArray;
    this.analyser.getByteFrequencyData(destArray);
    return destArray;
  }

  getFloatAudioData(destArray) {
    destArray = destArray || this.audioFloat32DataArray;
    this.analyser.getFloatFrequencyData(destArray);
    return destArray;
  }

  startOnUserGesture() {
    if (!this.startOnUserGestureCount || this.startOnUserGestureCount < 2) {
      this.startOnUserGestureCount = this.startOnUserGestureCount || 0;
      ++this.startOnUserGestureCount;
      if (this.startOnUserGestureCount === 2) {
        // iOS requires starting a sound during a user input event.
        const source = this.context.createOscillator();
        source.frequency.value = 440;
        source.connect(this.context.destination);
        if (source.start) {
          source.start(0);
        }
        setTimeout(function() {
          source.disconnect();
        }, 100);
      }
    }
  }

  play() {
    if (this.node) {
      this.startOnUserGesture();
      this.node.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
  }

  pause() {
    if (this.node) {
      this.node.disconnect();
    }
  }
}