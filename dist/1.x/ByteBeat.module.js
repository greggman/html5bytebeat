/* ByteBeat@2.0.0, license MIT */
class WrappingStack {
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

class ByteBeatCompiler {

  static strip(s) {
    return s.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  static removeCommentsAndLineBreaks(x) {
    // remove comments (hacky)
    x = x.replace(/\/\/.*/g, ' ');
    x = x.replace(/\n/g, ' ');
    x = x.replace(/\/\*.*?\*\//g, ' ');
    return x;
  }

  static is2NumberArray(v) {
    return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
  }

  static applyPostfixTemplate(params) {
    return `
      return function(t, i, stack, window, extra) {
        ${params.exp}
      };
    `;
  }

  static postfixToInfix(x) {
    x = ByteBeatCompiler.removeCommentsAndLineBreaks(x);
    // compress space
    x = x.replace(/(\r\n|\r|\n|\t| )+/gm, ' ');
    const tokens = ByteBeatCompiler.strip(x).split(' ');
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

    const exp = ByteBeatCompiler.applyPostfixTemplate({
      exp: steps.join('\n'),
    });
    return exp;
  }

  static glitchToPostfix = (function() {
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
      x = ByteBeatCompiler.removeCommentsAndLineBreaks(x);
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

  static makeExtra() {
    return {
      mouseX: 0,
      mouseY: 0,
      width: 1,
      height: 1,
      tiltX: 0,
      tiltY: 0,
      compass: 0,
    };
  }

  static addGlobals(object, name, filter = () => true) {
    return `
        var console = {
          log() {},
          info() {},
          error() {},
          warn() {},
        };
        var ${Object.getOwnPropertyNames(object).filter(filter).map(key => {
          const value = object[key];
          return (typeof value === 'function')
              ? `${key} = ${name}.${key}`
              : `${key} = ${name}.${key}`;
        }).join(',\n')};
    `;
  }

  static s_fnHeader = (function() {
    const keys = {};
    const windowKeep = new Set([
      'parseInt',
      'parseFloat',
      'Array',
      'isNaN',
    ]);
    const filter = n => !windowKeep.has(n);
    //const filter = n => n === 'scroll' || n === 'sin';
    Object.getOwnPropertyNames(globalThis).filter(filter).forEach((key) => {
      keys[key] = true;
    });
    delete keys['Math'];
    delete keys['window'];
    return `
        {try { (0['constructor']['constructor'].prototype.constructor = '') } catch (e) {}};
        var ${Object.keys(keys).sort().join(',\n')};
        ${ByteBeatCompiler.addGlobals(Math, 'Math')}
    `;
  }());

//         ${ByteBeatCompiler.addGlobals(globalThis, 'globalThis', n => n === 'parseInt' || n === 'parseFloat')}


  static expressionStringToFn(evalExp, extra, test) {
    // console.log(`---\n${evalExp}\n---`);
    // eslint-disable-next-line no-new-func
    const fp = new Function('stack', 'window', 'extra', evalExp);
    let f = fp(undefined, undefined, undefined);
    const ctx = ByteBeatCompiler.makeContext();
    const stack = new WrappingStack();
    const tempExtra = Object.assign({}, extra);
    // check function
    let v = f.call(ctx, 0, 0, stack, ctx, tempExtra);
    if (typeof v === 'function') {
      f = f();
      v = f.call(ctx, 0, 0, stack, ctx, tempExtra);
    }
    const array = ByteBeatCompiler.is2NumberArray(v);

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
        if (ByteBeatCompiler.is2NumberArray(s)) {
          continue;
        }
        if (typeof s !== 'number') {
          throw 'NaN';
        }
      }
    }

    return {f, array};
  }

  static compileExpression(x, expressionType, extra) {
    let evalExp;

    try {
      if (expressionType === 3) {  // function
        x = `
            return function(t, i, stack, window, extra) { 
                ${ByteBeatCompiler.strip(x)};
            }`;
      } else {
        if (expressionType === 2) {  // glitch
          x = ByteBeatCompiler.glitchToPostfix(x);
          expressionType = 1;
        }
        if (expressionType === 1) {  // postfix
          x = ByteBeatCompiler.postfixToInfix(x);
        } else {  // infix
          x = `
              return function(t, i, stack, window, extra) { 
                  return ${ByteBeatCompiler.strip(x)};
              }`;
        }
      }

      x = ByteBeatCompiler.removeCommentsAndLineBreaks(x);
      // Translate a few things.
      function replacer(str, obj, p1, name) {
        return Object.prototype.hasOwnProperty.call(obj, p1) ? (name + p1) : str;
      }
      x = x.replace(/\bint\b/g, 'floor');
      x = x.replace(/\bimport\b/g, 'notimport');
      x = x.replace(/(?:extra\.)?(\w+)/g, function(substr, p1) {
        return replacer(substr, extra, p1, 'extra.');
      });

      evalExp = `${ByteBeatCompiler.s_fnHeader}${x}`;

      const result = ByteBeatCompiler.expressionStringToFn(evalExp, extra, true);
      return {
        ...result,
        expression: evalExp,
      };
    } catch (e) {
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
      throw e;
    }
  }
}

const int8 = new Int8Array(1);

class ByteBeatProcessor {
  static s_samplers = {
    array: [
      // case 0: // bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          const s = fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra);
          buffer0[time % buffer0.length] = (s[0] & 255) / 127 - 1;
          buffer1[time % buffer1.length] = (s[1] & 255) / 127 - 1;
          ++time;
        }
      },
      // case 1:  // floatbeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          const s = fn0.call(ctx0, (time / divisor), sampleRate, stack0, ctx0, extra);
          buffer0[time % buffer0.length] = Number.isNaN(s[0]) ? 0 : s[0];
          buffer1[time % buffer1.length] = Number.isNaN(s[1]) ? 0 : s[1];
          ++time;
        }
      },
      // case 2:  // signed bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          const s = fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra);
          int8[0] = s[0];
          buffer0[time % buffer0.length] = int8[0] / 128;
          int8[0] = s[1];
          buffer1[time % buffer1.length] = int8[0] / 128;
          ++time;
        }
      },
    ],
    twoChannels: [
      // case 0: // bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          buffer0[time % buffer0.length] = (fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra) & 255) / 127 - 1;
          buffer1[time % buffer1.length] = (fn1.call(ctx1, (time) / divisor, sampleRate, stack1, ctx1, extra) & 255) / 127 - 1;
          ++time;
        }
      },
      // case 1:  // floatbeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          const s0 = fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra);
          buffer0[time % buffer0.length] = Number.isNaN(s0) ? 0 : s0;
          const s1 = fn1.call(ctx1, (time) / divisor, sampleRate, stack1, ctx1, extra);
          buffer1[time % buffer1.length] = Number.isNaN(s1) ? 0 : s1;
        }
      },
      // case 2:  // signed bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          int8[0] = fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra);
          buffer0[time % buffer0.length] = int8[0] / 128;
          int8[0] = fn1.call(ctx1, (time) / divisor, sampleRate, stack1, ctx1, extra);
          buffer1[time % buffer1.length] = int8[0] / 128;
          ++time;
        }
      },
    ],
    oneChannel: [
      // case 0: // bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          buffer0[time % buffer0.length] = (fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra) & 255) / 127 - 1;
          ++time;
        }
      },
      // case 1: // floatbeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          const s = fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra);
          buffer0[time % buffer0.length] = Number.isNaN(s) ? 0 : s;
          ++time;
        }
      },
      // case 2: // signed bytebeat
      function(buffer0, buffer1, fn0, fn1, time, divisor, stack0, stack1, ctx0, ctx1, extra, lastSample) {
        const sampleRate = extra?.sampleRate || 8000;
        for (let i = 0; i < lastSample; ++i) {
          int8[0] = fn0.call(ctx0, (time) / divisor, sampleRate, stack0, ctx0, extra);
          buffer0[time % buffer0.length] = int8[0] / 128;
          ++time;
        }
      },
    ],
  };

  static interpolate(buf, ndx) {
    const n = ndx | 0;
    const f = ndx % 1;
    const v0 = buf[(n    ) % buf.length];
    const v1 = buf[(n + 1) % buf.length];
    return v0 + (v1 - v0) * f;
  }

  static trunc(buf, ndx) {
    return buf[(ndx | 0) % buf.length];
  }

  constructor() {
    this.buffer0 = new Float32Array(4096);
    this.buffer1 = new Float32Array(4096);
    this.desiredSampleRate = 8000;
    // This is the sample # for the output to the WebAudio API.
    // In other words this will increment by actualSampleRate units per second
    this.dstSampleCount = 0;
    // This is the sample # for the bytebeat data.
    // In other words this will increment by desiredSampleRate units per second
    this.srcSampleCount = 0;

    // This would be used to select a re-sampler but all I have ATM
    // is linear interpolation which sucks.
    this.expandMode = 0;

    this.type = 0;
    this.expressionType = 0;
    this.functions = [
      {
        f: function() {
          return 0;
        },
        array: false,
      },
    ];
    this.contexts = [ByteBeatCompiler.makeContext(), ByteBeatCompiler.makeContext()];
    this.expressions = ['Math.sin(t) * 0.1'];
    this.extra = ByteBeatCompiler.makeExtra();
    this.stacks = [new WrappingStack(), new WrappingStack()];
  }

  reset() {
    this.dstSampleCount = 0;
    this.srcSampleCount = 0;
  }

  setExtra(props) {
    Object.assign(this.extra, props);
  }

  getExtra() {
    return {...this.extra};
  }

  getTime() {
    return this.convertToDesiredSampleRate(this.dstSampleCount);
  }

  recompile() {
    this.setExpressions(this.getExpressions());
  }

  convertToDesiredSampleRate(rate) {
    return Math.floor(rate * this.desiredSampleRate / this.actualSampleRate);
  }

  setActualSampleRate(rate) {
    this.actualSampleRate = rate;
  }

  setDesiredSampleRate(rate) {
    this.desiredSampleRate = rate;
  }

  getDesiredSampleRate() {
    return this.desiredSampleRate;
  }

  setExpressionType(type) {
    this.expressionType = type;
  }

  setExpressions(expressions) {
    this.functions = expressions.map(expression => {
      return ByteBeatCompiler.expressionStringToFn(expression, {}, false);
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
    const neededSrcStartSampleId = this.convertToDesiredSampleRate(this.dstSampleCount);
    const neededSrcEndSampleId = this.convertToDesiredSampleRate(this.dstSampleCount + dataLength) + 2;
    const numNeededSrcSamples = neededSrcEndSampleId - neededSrcStartSampleId;
    if (this.buffer0.length < numNeededSrcSamples) {
      this.buffer0 = new Float32Array(numNeededSrcSamples);
      this.buffer1 = new Float32Array(numNeededSrcSamples);
    }

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
    const divisor = this.expressionType === 3 ? this.getDesiredSampleRate() : 1;

    const startSrcId = Math.max(this.srcSampleCount, neededSrcStartSampleId);
    const numSrcSampleToGenerate = neededSrcEndSampleId - startSrcId;

    const samplerGroup = fn0Array
        ? ByteBeatProcessor.s_samplers.array
        : fn1
            ? ByteBeatProcessor.s_samplers.twoChannels
            : ByteBeatProcessor.s_samplers.oneChannel;
    const sampler = samplerGroup[this.type];
    sampler(buffer0, buffer1, fn0, fn1, startSrcId, divisor, stack0, stack1, ctx0, ctx1, extra, numSrcSampleToGenerate);

    let ndx = this.dstSampleCount * this.desiredSampleRate / this.actualSampleRate;
    const step = this.desiredSampleRate / this.actualSampleRate;

    // Note: ideally we'd have a better way to resample but if you google
    // audio resampling you'll see it's a hard problem. If you know a off a
    // a good efficient algo to insert here please make a pull request or open
    // an issue. At the moment if expandMode is true then basic linear interpolation
    // is used. It sounds awful! The default nearest lowest neighbor. In other words
    // an index of 9.7 will return sample 9, not sample 10.
    const expandFn = this.expandMode ? ByteBeatProcessor.interpolate : ByteBeatProcessor.trunc;

    if (rightData) {
      for (let i = 0; i < dataLength; ++i) {
        leftData[i] = expandFn(buffer0, ndx);
        rightData[i] = expandFn(buffer1, ndx);
        ndx += step;
      }
    } else {
      let ndx = 0;
      for (let i = 0; i < dataLength; ++i) {
        leftData[i * 2] = expandFn(buffer0, ndx);
        leftData[i * 2 + 1] = expandFn(buffer1, ndx);
        ndx += step;
      }
    }

    /*
    if (globalThis.ndx === undefined) {
      globalThis.ndx = 0;
      globalThis.ticks = 0;
      globalThis.cap = new Float32Array(4096);
    }
    if (globalThis.ticks++ < 10) {
      console.log('dl:', dataLength, 'ls:', lastSample, 'dsr:', this.desiredSampleRate, 'asr:', this.actualSampleRate);
    }
    if (globalThis.ndx < 4096) {
      for (let i = 0; i < leftData.length; ++i) {
        globalThis.cap[globalThis.ndx++] = leftData[i];
      //for (let i = 0; i < lastSample - 2; ++i) {
      //  globalThis.cap[globalThis.ndx++] = buffer0[i];
      }
      if (globalThis.ndx >= 4096) {
        console.log(JSON.stringify(Array.from(globalThis.cap), null, 2));
      }
    }
    */

    this.dstSampleCount += dataLength;
  }

  getSampleForTime(time, context, stack, channel = 0) {
    const divisor = this.expressionType === 3 ? this.getDesiredSampleRate() : 1;
    let s = 0;
    try {
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
    } catch (e) {
      console.error(e);
      return 0;
    }
  }
}

const beatProcessorJS = `
const int8 = new Int8Array(1);

${WrappingStack.toString()}

${ByteBeatCompiler.toString()}

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
    this.expressions = [];
    this.functions = [];
    this.nextObjId = 1;
    this.idToObj = new Map();
  }

  #registerObj(obj) {
    const id = this.nextObjId++;
    this.idToObj.set(id, obj);
    return id;
  }

  #deregisterObj(id) {
    this.idToObj.delete(id);
  }

  // TODO: replace
  setExtra(data) {
    this.byteBeat.setExtra(data);
  }

  callFunc({fn, args}) {
    this.byteBeat[fn].call(this.byteBeat, ...args);
  }

  callAsync({fn, msgId, args}) {
    let result;
    let error;
    const transferables = [];
    try {
      result = this[fn].call(this, ...args);
      if (result && result.length) {
        for (let i = 0; i < result.length; ++i) {
          const o = result[i];
          if (o instanceof Float32Array) {
            transferables.push(o);
          }
        }
      }
    } catch (e) {
      error = e;
    }
    this.port.postMessage({
      cmd: 'asyncResult',
      data: {
        msgId,
        error,
        result,
      },
    }, transferables);
  }

  setExpressions(expressions, resetToZero) {
    const compileExpressions = (expressions, expressionType, extra) => {
      const funcs = [];
      try {
        for (let i = 0; i < expressions.length; ++i) {
          const exp = expressions[i];
          if (exp !== this.expressions[i]) {
            funcs.push(ByteBeatCompiler.compileExpression(exp, expressionType, extra));
          } else {
            if (this.functions[i]) {
              funcs.push(this.functions[i]);
            }
          }
        }
      } catch (e) {
        if (e.stack) {
          const m = /<anonymous>:1:(\\d+)/.exec(e.stack);
          if (m) {
            const charNdx = parseInt(m[1]);
            console.error(e.stack);
            console.error(expressions.join('\\n').substring(0, charNdx), '-----VVVVV-----\\n', expressions.substring(charNdx));
          }
        } else {
          console.error(e, e.stack);
        }
        throw e;
      }
      return funcs;
    };
    const funcs = compileExpressions(expressions, this.byteBeat.getExpressionType(), this.byteBeat.getExtra());
    if (!funcs) {
      return {};
    }

    // copy the expressions
    this.expressions = expressions.slice(0);
    this.functions = funcs;
    const exp = funcs.map(({expression}) => expression);
    // I feel like a Windows programmer. The reset to zero
    // is needed because some expressions do stuff like
    //
    //     window.channels = t > 0 ? window.channels : data
    //
    // but because we are now async if I send 2 messages
    // there's no guarantee the time will be zero between
    // the message that sets the expression and the message
    // that sets the time so it's possible t will never be zero
    if (resetToZero) {
      this.setExpressionsAndResetToZero(exp);
    } else {
      this.setExpressionsForReal(exp);
    }
    return {
      numChannels: this.byteBeat.getNumChannels(),
      expressions: exp,
    };
  }

  setExpressionsForReal(data) {
    this.byteBeat.setExpressions(data);
  }

  setExpressionsAndResetToZero(data) {
    this.byteBeat.reset();
    this.byteBeat.setExpressions(data);
    this.byteBeat.reset();
  }

  process(inputs, outputs, parameters) {
    //if (outputs.length > 0) {
      this.byteBeat.process(outputs[0][0].length, outputs[0][0], outputs[0][1]);
    //}
    return true;
  }

  createStack() {
    return this.#registerObj(new WrappingStack());
  }
  createContext() {
    return this.#registerObj(ByteBeatCompiler.makeContext());
  }
  destroyStack(id) {
    this.#deregisterObj(id);
  }
  destroyContext(id) {
    this.#deregisterObj(id);
  }

  getSamplesForTimeRange(start, end, numSamples, contextId, stackId, channel = 0) {
    const context = this.idToObj.get(contextId);
    const stack = this.idToObj.get(stackId);
    const data = new Float32Array(numSamples);
    const duration = end - start;
    for (let i = 0; i < numSamples; ++i) {
      const time = start + duration * i / numSamples | 0;
      data[i] = this.byteBeat.getSampleForTime(time, context, stack, channel);
    }
    return data;
  }
}

registerProcessor('bytebeat-processor', BeatWorkletProcessor);
`;
const workerURL = URL.createObjectURL(new Blob([beatProcessorJS], {type: 'application/javascript'}));

// This class is the public interface for ByteBeat support.
// It manages 2 instances of a `ByteBeatProcessor`. One
// lives locally (this.byteBeat). It's point is to be available
// for the visualizer. The other lives in an AudioWorkletProcessor.
//
// This class needs to keep both ByteBeatProcessors up to
// date with the latest settings. It also compiles the
// user's expressions. Only if it succeeds does it pass those
// expressions on to the two ByteBeat instances.
class ByteBeatNode extends AudioWorkletNode {
  static Type = {
    byteBeat: 0,          // 0 <-> 255
    floatBeat: 1,         // -1.0 <-> +1.0
    signedByteBeat: 2,    // -128 <-> 127
  };
  static ExpressionType = {
    infix: 0,             // sin(t / 50)
    postfix: 1,           // t 50 / sin
    glitch: 2,            // see docs
    function: 3,          // return sin(t / 50)
  };
  static async setup(context) {
    return await context.audioWorklet.addModule(workerURL);
  }

  #startTime = 0; // time since the song started playing
  #pauseTime = 0; // time since the song was paused
  #connected = false;
  #expressionType = 0;
  #expressions = [];
  #msgIdToResolveMap = new Map();
  #nextId = 0;
  #type;
  #numChannels = 1;
  #desiredSampleRate;
  #actualSampleRate;
  #busyPromise;

  constructor(context) {
    super(context, 'bytebeat-processor', { outputChannelCount: [2] });

    // TODO: this should arguably not exist here
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (event) => {
        const data = {
          mouseX: event.clientX,
          mouseY: event.clientY,
        };
        this.#sendExtra(data);
      }, true);

      if (window.DeviceOrientationEvent) {
        // Listen for the deviceorientation event and handle the raw data
        window.addEventListener('deviceorientation', (eventData) => {
          const data = {
            // gamma is the left-to-right tilt in degrees, where right is positive
            tiltX: eventData.gamma,

            // beta is the front-to-back tilt in degrees, where front is positive
            tiltY: eventData.beta,

            // alpha is the compass direction the device is facing in degrees
            compass: eventData.alpha,
          };
          this.#sendExtra(data);
        }, false);
      }
    }
    this.#startTime = performance.now();   // time since the song started playing
    this.#pauseTime = this.#startTime;     // time since the song was paused
    this.#connected = false;               // whether or not we're playing the bytebeat

    this.#actualSampleRate = context.sampleRate;
    this.#callFunc('setActualSampleRate', context.sampleRate);

    this.port.onmessage = this.#processMsg.bind(this);
  }

  #processMsg(event) {
    const {cmd, data} = event.data;
    switch (cmd) {
      case 'asyncResult': {
        const {msgId, error, result} = data;
        const {resolve, reject} = this.#msgIdToResolveMap.get(msgId);
        if (!resolve) {
          throw new Error(`unknown msg id: ${msgId}`);
        }
        this.#msgIdToResolveMap.delete(msgId);
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
        break;
      }
      default:
        throw Error(`unknown cmd: ${cmd}`);
    }
  }

  #sendExtra(data) {
    this.port.postMessage({
      cmd: 'setExtra',
      data,
    });
  }

  #callFunc(fnName, ...args) {
    this.port.postMessage({
      cmd: 'callFunc',
      data: {
        fn: fnName,
        args,
      },
    });
  }

  #callAsync(fnName, ...args) {
    const msgId = this.#nextId++;
    this.port.postMessage({
      cmd: 'callAsync',
      data: {
        fn: fnName,
        msgId,
        args,
      },
    });
    const m = this.#msgIdToResolveMap;
    return new Promise((resolve, reject) => {
      m.set(msgId, {resolve, reject});
    });
  }

  connect(dest) {
    super.connect(dest);
    if (!this.#connected) {
      this.#connected = true;
      const elapsedPauseTime = performance.now() - this.#pauseTime;
      this.#startTime += elapsedPauseTime;
    }
  }

  disconnect() {
    if (this.#connected) {
      this.#connected = false;
      this.#pauseTime = performance.now();
      super.disconnect();
    }
  }

  resize(width, height) {
    const data = {width, height};
    this.#sendExtra(data);
  }

  reset() {
    this.#callFunc('reset');
    this.#startTime = performance.now();
    this.#pauseTime = this.#startTime;
  }

  isRunning() {
    return this.#connected;
  }

  getTime() {
    const time = this.#connected ? performance.now() : this.#pauseTime;
    return (time - this.#startTime) * 0.001 * this.getDesiredSampleRate() | 0;
  }

  async setExpressions(expressions, resetToZero) {
    if (this.#busyPromise) {
      await this.#busyPromise;
    }
    let resolve;
    this.#busyPromise = new Promise(r => {
      resolve = r;
    });
    try {
      const data = await this.#callAsync('setExpressions', expressions, resetToZero);
      this.#numChannels = data.numChannels;
      this.#expressions = data.expressions;
    } finally {
      resolve();
    }
  }

  convertToDesiredSampleRate(rate) {
    return Math.floor(rate * this.#desiredSampleRate / this.#actualSampleRate);
  }

  setDesiredSampleRate(rate) {
    this.#desiredSampleRate = rate;
    this.#callFunc('setDesiredSampleRate', rate);
  }

  getDesiredSampleRate() {
    return this.#desiredSampleRate;
  }

  setExpressionType(type) {
    this.#expressionType = type;
    this.#callFunc('setExpressionType', type);
  }

  getExpressions() {
    return this.#expressions.slice();
  }

  getExpressionType() {
    return this.#expressionType;
  }

  setType(type) {
    this.#type = type;
    this.#callFunc('setType', type);
  }

  getType() {
    return this.#type;
  }

  getNumChannels() {
    return this.#numChannels;
  }

  async createStack() {
    return await this.#callAsync('createStack');
  }
  async createContext() {
    return await this.#callAsync('createContext');
  }

  destroyStack(id) {
    return this.#callAsync('destroyStack', id);
  }
  async destroyContext(id) {
    return await this.#callAsync('destroyContext', id);
  }

  async getSamplesForTimeRange(start, end, step, contextId, stackId, channel) {
    if (this.#busyPromise) {
      await this.#busyPromise;
    }
    return await this.#callAsync('getSamplesForTimeRange', start, end, step, contextId, stackId, channel);
  }
}

export { ByteBeatNode as default };
