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
