import WrappingStack from './WrappingStack.js';
import ByteBeatCompiler from './ByteBeatCompiler.js';

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
    this.expandMode = 0;
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
    this.contexts = [ByteBeatCompiler.makeContext(), ByteBeatCompiler.makeContext()];
    this.expressions = ['Math.sin(t) * 0.1'];
    this.extra = ByteBeatCompiler.makeExtra();
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

      if (rightData) {
        let ndx = 0;
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

    // I don't know why this -2 is needed!
    // If I don't add it I get a glitch
    this.time += dataLength - 2;
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
  }

  // TODO: replace
  setProperties(data) {
    this.byteBeat.setProperties(data);
  }

  // TODO: replace
  setExtra(data) {
    this.byteBeat.setExtra(data);
  }

  setExpressions(data) {
    this.byteBeat.setExpressions(data);
  }

  setExpressionsAndResetToZero(data) {
    this.byteBeat.setExpressions(data);
    this.byteBeat.reset();
  }

  process(inputs, outputs, parameters) {
    this.byteBeat.process(outputs[0][0].length, outputs[0][0], outputs[0][1]);
    return true;
  }
}

registerProcessor('beat-processor', BeatWorkletProcessor);
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
//
// TODO:
//   * I should split this into multiple classes. One to compile
//     expressions and another to manage the audio
//   * It would arguably be better if all this did is manage
//     the AudioWorkletNode/AudioWorkletProcessor. That would
//     make it easier to plug into someone else's code without
//     needed tons of options
export default class ByteBeat {

  constructor() {

    window.addEventListener('mousemove', (event) => {
      const data = {
        mouseX: event.clientX,
        mouseY: event.clientY,
      };
      this.byteBeat.setExtra(data);
      this._sendExtra(data);
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
        this.byteBeat.setExtra(data);
        this._sendExtra(data);
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

    // This is the previous expressions so we don't double compile
    this.expressions = [];

    this.extra = ByteBeatCompiler.makeExtra();
    this.time = 0;
    this.startTime = performance.now();   // time since the song started playing
    this.pauseTime = this.startTime;      // time since the song was paused
    this.connected = false;               // whether or not we're playing the bytebeat

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
    analyser.maxDecibels = -1;
    this.analyser = analyser;

    // Make a buffer to receive the audio data
    const numPoints = analyser.frequencyBinCount;
    this.audioUint8DataArray = new Uint8Array(numPoints);
    this.audioFloat32DataArray = new Float32Array(numPoints);

    this.good = true;
  }

  static makeContext() {
    return ByteBeatCompiler.makeContext();
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
    const data = {width, height};
    this.byteBeat.setExtra(data);
    this._sendExtra(data);
  }

  reset() {
    this._sendProperties({time: 0});
    this.byteBeat.reset();
    this.time = 0;
    this.startTime = performance.now();
    this.pauseTime = this.startTime;
  }

  resume(callback) {
    if (this.context.resume) {
      this.context.resume().then(callback);
    } else {
      callback();
    }
  }

  isRunning() {
    return this.connected;
  }

  getTime() {
    const time = this.connected ? performance.now() : this.pauseTime;
    return (time - this.startTime) * 0.001 * this.byteBeat.getDesiredSampleRate() | 0;
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
        if (this.onCompileCallback) {
          if (e.stack) {
            const m = /<anonymous>:1:(\d+)/.exec(e.stack);
            if (m) {
              const charNdx = parseInt(m[1]);
              console.error(e.stack);
              console.error(expressions.join('\n').substring(0, charNdx), '-----VVVVV-----\n', expressions.substring(charNdx));
            }
          } else {
            console.error(e, e.stack);
          }
          this.onCompileCallback(e.toString());
        }
        return null;
      }
      return funcs;
    };
    const funcs = compileExpressions(expressions, this.expressionType, this.extra);
    if (!funcs) {
      return;
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
    this.node.port.postMessage({
      cmd: resetToZero ? 'setExpressionsAndResetToZero' : 'setExpressions',
      data: exp,
    });
    this.byteBeat.setExpressions(exp);
    if (resetToZero) {
      this.byteBeat.reset();
    }
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
    if (this.node && !this.connected) {
      const elapsedPauseTime = performance.now() - this.pauseTime;
      this.startTime += elapsedPauseTime;
      this.connected = true;
      this.startOnUserGesture();
      this.node.connect(this.analyser);
      this.analyser.connect(this.context.destination);
    }
  }

  pause() {
    if (this.node && this.connected) {
      this.connected = false;
      this.pauseTime = performance.now();
      this.node.disconnect();
    }
  }
}