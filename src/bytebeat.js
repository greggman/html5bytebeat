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

export default class ByteBeat {
  constructor() {
    const that = this;
    this.buffer0 = new Float32Array(4096);
    this.buffer1 = new Float32Array(4096);
    this.desiredSampleRate = 8000;
    this.time = 0;
    this.expandMode = 0;
    this.type = 0;
    this.expressionType = 0;
    this.int8 = new Int8Array(1);
    this.functions = [
      {
        f: function(t) {
          return Math.sin(t) * 0.1;
        },
        array: false,
      },
    ];
    this.contexts = [ByteBeat.makeContext(), ByteBeat.makeContext()];
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
    this.postfixTemplate = `
      return function(t, i, stack, window, extra) {
        $(exp)
      };
    `;
    this.stacks = [new WrappingStack(), new WrappingStack()];

    window.addEventListener('mousemove', function(event) {
      const extra = that.extra;
      extra.mouseX = event.clientX;
      extra.mouseY = event.clientY;
    }, true);

    if (window.DeviceOrientationEvent) {
      // Listen for the deviceorientation event and handle the raw data
      window.addEventListener('deviceorientation', function(eventData) {
        const extra = that.extra;
        // gamma is the left-to-right tilt in degrees, where right is positive
        extra.tiltX = eventData.gamma;

        // beta is the front-to-back tilt in degrees, where front is positive
        extra.tiltY = eventData.beta;

        // alpha is the compass direction the device is facing in degrees
        extra.compass = eventData.alpha;
      }, false);
    }

    const WebAudioAPI = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext || window.msAudioContext;
    if (WebAudioAPI) {
      this.context = new WebAudioAPI();
      this.node = this.context.createScriptProcessor(4096, 2, 2);
      //this.context = { };
      //this.node = {
      //  connect: function() { },
      //  disconnect: function() { }
      //};
      this.actualSampleRate = this.context.sampleRate;
      this.node.onaudioprocess = function(e) {
        const data = e.outputBuffer.getChannelData(0);
        that.process(data.length, data,
                     e.outputBuffer.getChannelData(1));
      };
      this.good = true;
    } else {
      const audio = new Audio();
      this.audio = audio;
      if (!audio.mozSetup) {
        return;
      }
      this.good = true;

      function AudioDataDestination(sampleRate, readFn) {
        // Initialize the audio output.
        const audio = new Audio();
        const channels = 2;
        audio.mozSetup(channels, sampleRate);

        let currentWritePosition = 0;
        const preBufferSize = sampleRate * channels / 2; // buffer 500ms
        let tail = null;
        let tailPosition;

        // The function called with regular interval to populate
        // the audio output buffer.
        setInterval(function() {
          let written;
          // Check if some data was not written in previous attempts.
          if (tail) {
            written = audio.mozWriteAudio(tail.subarray(tailPosition));
            currentWritePosition += written;
            tailPosition += written;
            if (tailPosition < tail.length) {
              // Not all the data was written, saving the tail...
              return; // ... and exit the function.
            }
            tail = null;
          }

          // Check if we need add some data to the audio output.
          const currentPosition = audio.mozCurrentSampleOffset();
          const available = currentPosition + preBufferSize - currentWritePosition;
          if (available > 0) {
            // Request some sound data from the callback function.
            const soundData = new Float32Array(available);
            readFn(soundData);

            // Writing the data.
            written = audio.mozWriteAudio(soundData);
            if (written < soundData.length) {
              // Not all the data was written, saving the tail.
              tail = soundData;
              tailPosition = written;
            }
            currentWritePosition += written;
          }
        }, 100);
      }

      this.actualSampleRate = 44100;//this.desiredSampleRate;
      // fix!
      // eslint-disable-next-line no-unused-vars
      const audioDestination = new AudioDataDestination(this.actualSampleRate, function(buffer) {
        // eslint-disable-next-line no-undef
        if (playing) {
          that.process(buffer.length >> 1, buffer);
        }
      });
    }
  }

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

  resize(width, height) {
    this.extra.width = width;
    this.extra.height = height;
  }

  setVisualizer(visualizer) {
    this.visualizer = visualizer;
  }

  reset() {
    this.time = 0;
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
      Object.getOwnPropertyNames(globalThis).forEach((key) => {
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

    function is2NumberArray(v) {
      return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number';
    }

    function expressionStringToFn(x, extra) {
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
      // eslint-disable-next-line no-new-func
      const fp = new Function('stack', 'window', 'extra', evalExp);
      let f = fp(undefined, undefined, undefined);
      const ctx = ByteBeat.makeContext();

      const stack = new WrappingStack();
      const tempExtra = Object.assign({}, extra);
      // check function
      let v = f(0, 0, stack, ctx, tempExtra);
      if (typeof v === 'function') {
        f = f();
        v = f(0, 0, stack, ctx, tempExtra);
      }
      const array = is2NumberArray(v);
      for (let i = 0; i < 1000; i += 100) {
        let s = f(i, i, stack, ctx, tempExtra);
        if (i === 0) {
          console.log('stack: ' + stack.sp());
        }
        //log("" + i + ": " + s);
        if (typeof s === 'function') {
          f = f();
          s = 0;
        }
        if (is2NumberArray(s)) {
          continue;
        }
        if (typeof s !== 'number') {
          throw 'NaN';
        }
      }

      return {f, array};
    }

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
      const result = expressionStringToFn(x, extra, expressionType);
      return result;
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
    if (this.onCompileCallback) {
      this.onCompileCallback(null);
    }
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

  getExpressions() {
    return this.expressions.slice(0);
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

  process(dataLength, leftData, rightData) {
    let time = this.convertToDesiredSampleRate(this.time);
    const lastSample = this.convertToDesiredSampleRate(dataLength) + 2;
    if (this.buffer0.length < lastSample) {
      this.buffer0 = new Float32Array(lastSample);
      this.buffer1 = new Float32Array(lastSample);
    }
    const buffer0 = this.buffer0;
    let buffer1;
    //
    const fn0 = this.functions[0].f;
    const fn0Array = this.functions[0].array;
    const fn1 = (this.functions[1] || {}).f;
    const stack0 = this.stacks[0];
    const stack1 = this.stacks[1];
    const ctx0 = this.contexts[0];
    const ctx1 = this.contexts[1];
    const extra = this.extra;
    const int8 = this.int8;
    const divisor = 1;//this.expressionType === 3 ? this.getDesiredSampleRate() : 1;

    if (fn0Array) {
      buffer1 = this.buffer1;
      switch (this.type) {
        case 0: // bytebeat
          for (let i = 0; i < lastSample; ++i) {
            const s = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
            buffer0[i] = (s[0] & 255) / 127 - 1;
            buffer1[i] = (s[1] & 255) / 127 - 1;
          }
          break;
        case 1:  // floatbeat
          for (let i = 0; i < lastSample; ++i) {
            const s = fn0((time++ / divisor), undefined, stack0, ctx0, extra);
            buffer0[i] = s[0];
            buffer1[i] = s[1];
          }
          break;
        case 2:  // signed bytebeat
          for (let i = 0; i < lastSample; ++i) {
            const s = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
            int8[0] = s[0];
            buffer0[i] = int8[0] / 128;
            int8[0] = s[1];
            buffer1[i] = int8[0] / 128;
          }
          break;
      }
    } else if (fn1) {
      buffer1 = this.buffer1;
      switch (this.type) {
        case 0: // bytebeat
          for (let i = 0; i < lastSample; ++i) {
            buffer0[i] = (fn0((time  ) / divisor, undefined, stack0, ctx0, extra) & 255) / 127 - 1;
            buffer1[i] = (fn1((time++) / divisor, undefined, stack1, ctx1, extra) & 255) / 127 - 1;
          }
          break;
        case 1:  // floatbeat
          for (let i = 0; i < lastSample; ++i) {
            buffer0[i] = fn0((time  ) / divisor, undefined, stack0, ctx0, extra);
            buffer1[i] = fn1((time++) / divisor, undefined, stack1, ctx1, extra);
          }
          break;
        case 2:  // signed bytebeat
          for (let i = 0; i < lastSample; ++i) {
            int8[0] = fn0((time  ) / divisor, undefined, stack0, ctx0, extra);
            buffer0[i] = int8[0] / 128;
            int8[0] = fn1((time++) / divisor, undefined, stack1, ctx1, extra);
            buffer1[i] = int8[0] / 128;
          }
          break;
      }
    } else {
      buffer1 = this.buffer0;
      switch (this.type) {
        case 0: // bytebeat
          for (let i = 0; i < lastSample; ++i) {
            buffer0[i] = (fn0((time++) / divisor, undefined, stack0, ctx0, extra) & 255) / 127 - 1;
          }
          break;
        case 1: // floatbeat
          for (let i = 0; i < lastSample; ++i) {
            buffer0[i] = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
          }
          break;
        case 2: // signed bytebeat
          for (let i = 0; i < lastSample; ++i) {
            int8[0] = fn0((time++) / divisor, undefined, stack0, ctx0, extra);
            buffer0[i] = int8[0] / 128;
          }
          break;
      }
    }
    if (dataLength) {
      const step = this.convertToDesiredSampleRate(dataLength) / dataLength;
      let ndx = 0;

      function interpolate(buf) {
        const n = ndx | 0;
        const f = ndx % 1;
        const v0 = buf[n];
        const v1 = buf[n + 1];
        return v0 + (v1 - v0) * f;
      }

      function trunc(buf) {
        return buf[ndx | 0];
      }

      const expandFn = this.expandMode ? interpolate : trunc;

      if (rightData) {
        for (let i = 0; i < dataLength; ++i) {
          leftData[i] = expandFn(buffer0);
          rightData[i] = expandFn(buffer1);
          ndx += step;
        }
      } else {
        for (let i = 0; i < dataLength; ++i) {
          leftData[i * 2] = expandFn(buffer0);
          leftData[i * 2 + 1] = expandFn(buffer1);
          ndx += step;
        }
      }
    }

    if (this.visualizer) {
      this.visualizer.update(buffer0, buffer1, lastSample - 1);
    }

    this.time += dataLength;
  }

  getSampleForTime(time, context, stack, channel = 0) {
    const divisor = this.expressionType === 3 ? this.getDesiredSampleRate() : 1;
    if (this.functions[0].array) {
      const s = this.functions[0].f(time / divisor, channel, stack, context, this.extra);
      return s[channel];
    }
    if (!this.functions[1]) {
      channel = 0;
    }
    const s = this.functions[channel].f(time / divisor, channel, stack, context, this.extra);
    switch (this.type) {
      case 0:
        return (s & 255) / 127 - 1;
      case 1:
        return s;
      case 2:
        this.int8[0] = s;
        return this.int8[0] / 128;
      default:
        return 0;
    }
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
      this.node.connect(this.context.destination);
    }
  }

  pause() {
    if (this.node) {
      this.node.disconnect();
    }
  }
}