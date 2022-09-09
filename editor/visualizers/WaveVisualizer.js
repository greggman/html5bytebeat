import * as twgl from '../../js/twgl-full.module.js';
import Visualizer from './Visualizer.js';

// Fix?
import ByteBeat from '../../src/ByteBeat.js';
import WrappingStack from '../../src/WrappingStack.js';

export default class WebGLVisualizer extends Visualizer {
  constructor(canvas) {
    super(canvas);
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    this.gl = gl;
    this.type = 1;
    this.temp = new Float32Array(1);
    this.resolution = new Float32Array(2);
    this.effects = {
      wave: {
        shaderSource: [
          `
            attribute float column;
            attribute float height;
            uniform float position;
            void main() {
              gl_Position = vec4(mod(column - position, 1.0) * 2.0 - 1.0, height, 0, 1);
            }
          `,
          `
            precision mediump float;
            uniform vec4 color;
            void main() {
              gl_FragColor = color;
            }
          `,
        ],
        uniforms: {
          position: 0,
          time: 0,
          resolution: this.resolution,
          color: new Float32Array([1, 0, 0, 1]),
        },
        primitive: gl.LINES,
      },
      sample: {
        shaderSource: [
          `
            attribute vec2 position;
            uniform float offset;
            varying vec2 v_texCoord;
            void main() {
              gl_Position = vec4(position, 0, 1);
              v_texCoord = vec2(position * 0.5 + 0.5) + vec2(offset, 0);
            }
          `,
          `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D tex;
            uniform vec4 color;
            void main() {
              float height = texture2D(tex, v_texCoord).r * 0.5;
              float m = v_texCoord.y > height ? 0.0 : 1.0;
              gl_FragColor = color * m;
            }
          `,
        ],
        uniforms: {
          offset: 0,
          time: 0,
          resolution: this.resolution,
          color: new Float32Array([0, 1, 0, 1]),
        },
      },
      data: {
        shaderSource: [
          `
            attribute vec2 position;
            uniform float offset;
            varying vec2 v_texCoord;
            void main() {
              gl_Position = vec4(position, 0, 1);
              v_texCoord = vec2(position * 0.5 + 0.5) + vec2(offset, 0);
            }
          `,
          `
            precision mediump float;
            varying vec2 v_texCoord;
            uniform sampler2D tex;
            uniform vec4 color;
            void main() {
              int c = int(texture2D(tex, v_texCoord).r * 255.0);
              int y = int(v_texCoord.y * 8.0);
              int p = int(pow(2.0, float(y)));
              c = c / p;
              float m = mod(float(c), 2.0);
              float line = mod(gl_FragCoord.y, 3.0) / 2.0;
              gl_FragColor = color * m;
            }
          `,
        ],
        uniforms: {
          offset: 0,
          time: 0,
          resolution: this.resolution,
          color: new Float32Array([0, 0, 1, 1]),
        },
      },
    };

    for (const effect of Object.values(this.effects)) {
      effect.programInfo = twgl.createProgramInfo(gl, effect.shaderSource);
    }

    this.resize(512, 512);
  }

  resize(width, height) {
    const gl = this.gl;
    const canvas = this.canvas;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    const lineHeight = new Float32Array(width * 2);
    const column = new Float32Array(width * 2);
    this.lineHeight = lineHeight;
    for (let ii = 0; ii < width * 2; ++ii) {
      lineHeight[ii] = Math.sin(ii / width * Math.PI * 2);
      column[ii] = (ii >> 1) / width;
    }
    const arrays = {
      height: { numComponents: 1, data: lineHeight, },
      column: { numComponents: 1, data: column, },
    };
    const {wave, data, sample} = this.effects;
    if (!wave.bufferInfo) {
      wave.bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    } else {
      twgl.setAttribInfoBufferFromArray(gl, wave.bufferInfo.attribs.height, arrays.height);
      twgl.setAttribInfoBufferFromArray(gl, wave.bufferInfo.attribs.column, arrays.column);
      wave.bufferInfo.numElements = width * 2;
    }

    if (!data.bufferInfo) {
      data.bufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);
      const tex = twgl.createTexture(gl, {
        src: [0],
        format: gl.LUMINANCE,
        minMag: gl.NEAREST,
      });
      data.uniforms.tex = tex;
      this.dataTex = tex;
    }

    this.dataContext = ByteBeat.makeContext();
    this.dataStack = new WrappingStack();
    this.sampleContext = ByteBeat.makeContext();
    this.sampleStack = new WrappingStack();

    this.dataWidth = 1024;
    const dataBuf = new Uint8Array(this.dataWidth);
    this.dataPos = 0;
    this.dataPixel = new Uint8Array(1);
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE, this.dataWidth, 1, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, dataBuf);
    this.dataBuf = dataBuf;
    this.dataTime = 0;

    if (!sample.bufferInfo) {
      sample.bufferInfo = twgl.primitives.createXYQuadBufferInfo(gl);
      const tex = twgl.createTexture(gl, {
        format: gl.LUMINANCE,
        src: [0],
        minMag: gl.NEAREST,
      });
      sample.uniforms.tex = tex;
      this.sampleTex = tex;
    }

    this.sampleWidth = 1024;
    const sampleBuf = new Uint8Array(this.sampleWidth);
    this.samplePos = 0;
    this.samplePixel = new Uint8Array(1);
    gl.bindTexture(gl.TEXTURE_2D, this.sampleTex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE, this.sampleWidth, 1, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, sampleBuf);
    this.sampleBuf = sampleBuf;
    this.sampleTime = 0;

    this.oneVerticalPixel = 2 / canvas.height;
    this.width = width;
    this.height = height;
    this.position = 0;
    this.then = performance.now() * 0.001;
    this.compiling = false;
  }

  reset() {
    const gl = this.gl;
    this.then = performance.now() * 0.001;
    for (let i = 0; i < this.lineHeight.length; ++i) {
      this.lineHeight[i] = 0;
    }
    this.position = 0;
    twgl.setAttribInfoBufferFromArray(gl, this.effects.wave.bufferInfo.attribs.height, this.lineHeight);

    this.dataTime = 0;
    this.dataPos = 0;
    for (let i = 0; i < this.dataWidth; ++i) {
      this.dataBuf[i] = 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE, this.dataWidth, 1, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, this.dataBuf);

    this.sampleTime = 0;
    this.samplePos = 0;
    for (let i = 0; i < this.sampleWidth; ++i) {
      this.sampleBuf[i] = 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.sampleTex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.LUMINANCE, this.sampleWidth, 1, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, this.sampleBuf);
  }

  update(buffer, length) {
    if (!this.type) {
      return;
    }
    const gl = this.gl;
    // Yes I know this is dumb. I should just do the last 2 at most.
    const dest = this.lineHeight;
    let offset = 0;
    const v = this.oneVerticalPixel;
    const v2 = v * 2;
    while (length) {
      const max = Math.min(length, this.width - this.position);
      let d = this.position * 2;
      let h1 = buffer[offset];
      for (let i = 0; i < max; ++i) {
        const h2 = buffer[++offset];
        const dy = h1 - h2;
        dest[d++] = h1;
        dest[d++] = Math.abs(dy) > v ? h2 : (h2 + (dy > 0 ? v2 : -v2));
        h1 = h2;
      }
      const view = new Float32Array(dest.buffer, this.position * 4 * 2, max * 2);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.effects.wave.bufferInfo.attribs.height.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, this.position * 4 * 2, view);
      this.position = (this.position + max) % this.width;
      length -= max;
    }
  }

  render(byteBeat) {
    if (!this.type && !this.captureCallback) {
      return;
    }

    const gl = this.gl;
    gl.clearColor(0, 0, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const {wave, data} = this.effects;

    const canvas = this.canvas;
    this.resolution[0] = canvas.width;
    this.resolution[1] = canvas.height;

    this.dataPixel[0] = Math.round(byteBeat.getSampleForTime(this.dataTime++, this.dataContext, this.dataStack) * 127) + 127;
    gl.bindTexture(gl.TEXTURE_2D, this.dataTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, this.dataPos, 0, 1, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.dataPixel);
    this.dataPos = (this.dataPos + 1) % this.dataWidth;

    gl.bindTexture(gl.TEXTURE_2D, this.sampleTex);
    for (let ii = 0; ii < 2; ++ii) {
      this.samplePixel[0] = Math.round(byteBeat.getSampleForTime(this.sampleTime++, this.sampleContext, this.sampleStack) * 127) + 127;
      gl.texSubImage2D(gl.TEXTURE_2D, 0, this.samplePos, 0, 1, 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.samplePixel);
      this.samplePos = (this.samplePos + 1) % this.sampleWidth;
    }

    const now = (new Date()).getTime() * 0.001;

    data.uniforms.offset = this.dataPos / this.dataWidth;
    data.uniforms.time = now - this.then;
    drawEffect(gl, data);

    /*
    {
      const {sample} = this.effects;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      sample.uniforms.offset = this.samplePos / this.sampleWidth;
      sample.uniforms.time = now - this.then;
      drawEffect(gl, sample);
      gl.disable(gl.BLEND);
    }
    */

    wave.uniforms.position = this.position / this.width;
    wave.uniforms.time = now - this.then;
    drawEffect(gl, wave);

    this.handleCapture();
  }
}

function drawEffect(gl, effect) {
  const {programInfo, bufferInfo, uniforms, primitive} = effect;
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo, primitive);

}