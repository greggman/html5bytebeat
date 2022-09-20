import ByteBeatCompiler from './ByteBeatCompiler.js';
import ByteBeatProcessor from './ByteBeatProcessor.js';
import WrappingStack from './WrappingStack.js';

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
  setExtra(data) {
    this.byteBeat.setExtra(data);
  }

  callFunc({fn, args}) {
    this.byteBeat[fn].call(this.byteBeat, ...args);
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
export default class ByteBeatNode extends AudioWorkletNode {
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
    return context.audioWorklet.addModule(workerURL);
  }
  static createStack() {
    return new WrappingStack();
  }
  static createContext() {
    return ByteBeatCompiler.makeContext();
  }
  constructor(context) {
    super(context, 'bytebeat-processor', { outputChannelCount: [2] });

    // TODO: this should arguably not exist here
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (event) => {
        const data = {
          mouseX: event.clientX,
          mouseY: event.clientY,
        };
        this.byteBeat.setExtra(data);
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
          this.byteBeat.setExtra(data);
          this.#sendExtra(data);
        }, false);
      }
    }

    // This is the previous expressions so we don't double compile
    this.expressions = [];

    this.extra = ByteBeatCompiler.makeExtra();
    this.time = 0;
    this.startTime = performance.now();   // time since the song started playing
    this.pauseTime = this.startTime;      // time since the song was paused
    this.connected = false;               // whether or not we're playing the bytebeat

    this.byteBeat = new ByteBeatProcessor();
    this.byteBeat.setActualSampleRate(context.sampleRate);
    this.#callFunc('setActualSampleRate', context.sampleRate);
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

  connect(dest) {
    super.connect(dest);
    if (!this.connected) {
      this.connected = true;
      const elapsedPauseTime = performance.now() - this.pauseTime;
      this.startTime += elapsedPauseTime;
    }
  }

  disconnect() {
    if (this.connected) {
      this.connected = false;
      this.pauseTime = performance.now();
      super.disconnect();
    }
  }

  resize(width, height) {
    const data = {width, height};
    this.byteBeat.setExtra(data);
    this.#sendExtra(data);
  }

  reset() {
    this.#callFunc('reset');
    this.byteBeat.reset();
    this.time = 0;
    this.startTime = performance.now();
    this.pauseTime = this.startTime;
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
    this.port.postMessage({
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
    this.#callFunc('setDesiredSampleRate', rate);
    this.byteBeat.setDesiredSampleRate(rate);
  }

  getDesiredSampleRate() {
    return this.byteBeat.getDesiredSampleRate();
  }

  setExpressionType(type) {
    this.expressionType = type;
    this.byteBeat.setExpressionType(type);
    this.#callFunc('setExpressionType', type);
  }

  getExpressions() {
    return this.expressions.slice();
  }

  getExpressionType() {
    return this.byteBeat.getExpressionType();
  }

  setType(type) {
    this.byteBeat.setType(type);
    this.#callFunc('setType', type);
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
}
