import ByteBeatCompiler from './ByteBeatCompiler.js';
import WrappingStack from './WrappingStack.js';

const int8 = new Int8Array(1);

export default class ByteBeatProcessor {
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