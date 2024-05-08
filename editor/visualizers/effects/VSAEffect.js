
import * as twgl from '../../../js/twgl-full.module.js';
import {
  decode,
} from '../../base64.js';
import compressor from '../../compressor.js';

const m4 = twgl.m4;

const kMaxCount = 100000;

const s_vsHeader = `
attribute float vertexId;

uniform vec2 mouse;
uniform vec2 resolution;
uniform vec4 background;
uniform float time;
uniform float vertexCount;
uniform sampler2D volume;
uniform sampler2D sound;
uniform sampler2D floatSound;
uniform sampler2D touch;
uniform vec2 soundRes;
uniform float _dontUseDirectly_pointSize;

varying vec4 v_color;
`;

const s_fs = `
precision mediump float;

varying vec4 v_color;

void main() {
  gl_FragColor = v_color;
}
`;


const s_historyVS = `
attribute vec4 position;
attribute vec2 texcoord;
uniform mat4 u_matrix;
varying vec2 v_texcoord;

void main() {
  gl_Position = u_matrix * position;
  v_texcoord = texcoord;
}
`;

const s_historyFS = `
precision mediump float;

uniform sampler2D u_texture;
uniform float u_mix;
uniform float u_mult;
varying vec2 v_texcoord;

void main() {
  vec4 color = texture2D(u_texture, v_texcoord);
  gl_FragColor = mix(color.aaaa, color.rgba, u_mix) * u_mult;
}
`;

const s_rectVS = `
attribute vec4 position;
uniform mat4 u_matrix;

void main() {
  gl_Position = u_matrix * position;
}
`;

const s_rectFS = `
precision mediump float;

uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

class HistoryTexture {
  constructor(gl, options) {
    this.gl = gl;
    const _width = options.width;
    const type  = options.type || gl.UNSIGNED_BYTE;
    const format = options.format || gl.RGBA;
    const Ctor  = twgl.getTypedArrayTypeForGLType(type);
    const numComponents = twgl.getNumComponentsForFormat(format);
    const size  = _width * numComponents;
    const _buffer = new Ctor(size);
    const _texSpec = {
      src: _buffer,
      height: 1,
      min: options.min || gl.LINEAR,
      mag: options.mag || gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
      format: format,
      auto: false,  // don't set tex params or call genmipmap
    };
    const _tex = twgl.createTexture(gl, _texSpec);

    const _length = options.length;
    const _historyAttachments = [
      {
        format: options.historyFormat || gl.RGBA,
        type: type,
        mag: options.mag || gl.LINEAR,
        min: options.min || gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
      },
    ];

    let _srcFBI = twgl.createFramebufferInfo(gl, _historyAttachments, _width, _length);
    let _dstFBI = twgl.createFramebufferInfo(gl, _historyAttachments, _width, _length);

    const _historyUniforms = {
      u_mix: 0,
      u_mult: 1,
      u_matrix: m4.identity(),
      u_texture: undefined,
    };

    this.buffer = _buffer;

    this.update = (gl, historyProgramInfo, quadBufferInfo) => {
      const temp = _srcFBI;
      _srcFBI = _dstFBI;
      _dstFBI = temp;

      twgl.setTextureFromArray(gl, _tex, _texSpec.src, _texSpec);

      gl.useProgram(historyProgramInfo.program);
      twgl.bindFramebufferInfo(gl, _dstFBI);

      // copy from historySrc to historyDst one pixel down
      m4.translation([0, 2 / _length, 0], _historyUniforms.u_matrix);
      _historyUniforms.u_mix = 1;
      _historyUniforms.u_texture = _srcFBI.attachments[0];

      twgl.setUniforms(historyProgramInfo, _historyUniforms);
      twgl.drawBufferInfo(gl, quadBufferInfo);

      // copy audio data into top row of historyDst
      _historyUniforms.u_mix = format === gl.ALPHA ? 0 : 1;
      _historyUniforms.u_texture = _tex;
      m4.translation(
          [0, -(_length - 0.5) / _length, 0],
          _historyUniforms.u_matrix);
      m4.scale(
          _historyUniforms.u_matrix,
          [1, 1 / _length, 1],
          _historyUniforms.u_matrix);

      twgl.setUniforms(historyProgramInfo, _historyUniforms);
      twgl.drawBufferInfo(gl, quadBufferInfo);
    };

    this.getTexture = () => {
      return _dstFBI.attachments[0];
    };
  }
}

class CPUHistoryTexture {
  constructor(gl, options) {
    const _width = options.width;
    const type  = options.type || gl.UNSIGNED_BYTE;
    const format = options.format || gl.RGBA;
    const Ctor  = twgl.getTypedArrayTypeForGLType(type);
    const numComponents = twgl.getNumComponentsForFormat(format);
    const _length = options.length;
    const _rowSize = _width * numComponents;
    const _size  = _rowSize * _length;
    const _buffer = new Ctor(_size);
    const _texSpec = {
      src: _buffer,
      height: _length,
      min: options.min || gl.LINEAR,
      mag: options.mag || gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
      format: format,
      auto: false,  // don't set tex params or call genmipmap
    };
    const _tex = twgl.createTexture(gl, _texSpec);

    this.buffer = _buffer;

    this.update = function update() {
      // Upload the latest
      twgl.setTextureFromArray(gl, _tex, _texSpec.src, _texSpec);

      // scroll the data
      _buffer.copyWithin(_rowSize, 0, _size - _rowSize);
    };

    this.getTexture = function getTexture() {
      return _tex;
    };
  }
}

const mainRE = /(void[ \t\n\r]+main[ \t\n\r]*\([ \t\n\r]*\)[ \t\n\r]\{)/g;
function applyTemplateToShader(src) {
  let vSrc = s_vsHeader + src;
  vSrc = vSrc.replace(mainRE, function(m) {
    return `${m}gl_PointSize=1.0;`;
  });
  const lastBraceNdx = vSrc.lastIndexOf('}');
  if (lastBraceNdx >= 0) {
    const before = vSrc.substr(0, lastBraceNdx);
    const after = vSrc.substr(lastBraceNdx);
    vSrc = `${before};gl_PointSize = max(0., gl_PointSize*_dontUseDirectly_pointSize);${after}`;
  }
  return vSrc;
}

export default class VSAEffect {
  constructor(gl) {
    this.gl = gl;
    this.rectProgramInfo = twgl.createProgramInfo(gl, [s_rectVS, s_rectFS]);
    this.historyProgramInfo = twgl.createProgramInfo(gl, [s_historyVS, s_historyFS]);
  }
  #init(gl, analyser) {
    if (this.init) {
      return;
    }
    this.init = true;
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.numSoundSamples = Math.min(maxTextureSize, analyser.frequencyBinCount);
    this.numHistorySamples = 60 * 4; // 4 seconds;

    this.volumeHistory = new HistoryTexture(gl, {
      width: 4,
      length: this.numHistorySamples,
      format: gl.ALPHA,
    });

    this.soundHistory = new HistoryTexture(gl, {
      width: this.numSoundSamples,
      length: this.numHistorySamples,
      format: gl.ALPHA,
    });

    this.touchColumns = 32;
    this.touchHistory = new (this.canRenderToFloat ? HistoryTexture : CPUHistoryTexture)(gl, {
      width: this.touchColumns,
      length: this.numHistorySamples,
      type: this.canUseFloat ? gl.FLOAT : gl.UNSIGNED_BYTE,
      min: gl.NEAREST,
      mag: gl.NEAREST,
    });

    const count = new Float32Array(kMaxCount);
    for (let ii = 0; ii < count.length; ++ii) {
      count[ii] = ii;
    }
    const arrays = {
      vertexId: { data: count, numComponents: 1 },
    };
    this.countBufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    this.quadBufferInfo = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: [-1, -1, 1, -1, -1, 1, 1, 1] },
      texcoord: [0, 0, 1, 0, 0, 1, 1, 1],
      indices: [0, 1, 2, 2, 1, 3],
    });

    this.uniforms = {
      time: 0,
      vertexCount: 0,
      resolution: [1, 1],
      background: [0, 0, 0, 1],
      mouse: [0, 0],
      sound: undefined,
      floatSound: undefined,
      soundRes: [this.numSoundSamples, this.numHistorySamples],
      _dontUseDirectly_pointSize: 1,
    };

    this.historyUniforms = {
      u_mix: 0,
      u_matrix: m4.identity(),
      u_texture: undefined,
    };
  }
  async setURL(url) {
    try {
      const u = new URL(url, window.location.href);
      if (u.hostname !== window.location.hostname && u.hostname !== 'www.vertexshaderart.com' && u.hostname !== 'vertexshaderart.com') {
        return;
      }
      if (url === this.currentUrl) {
        // It's the current URL
        return;
      }
      if (url === this.pendingUrl) {
        // It's the pending Url
        return;
      }
      this.pendingUrl = url;
      if (this.compiling) {
        return;
      }
      // It doesn't matter if the URL is bad, we don't want to try again
      this.currentUrl = this.pendingUrl;
      this.pendingUrl = undefined;
      this.compiling = true;
      let vsa;
      if (u.hash.includes('s=')) {
        const q = new URLSearchParams(u.hash.substring(1));
        const bytes = decode(q.get('s'));
        const text = await new Promise((resolve, reject) => compressor.decompress(bytes, resolve, () => {}, reject));
        vsa = JSON.parse(text);
      } else {
        const mungedUrl = url.includes('vertexshaderart.com')
          ? `${url}/art.json`
          : url;
        const req = await fetch(mungedUrl);
        vsa = await req.json();
      }
      const gl = this.gl;
      const vs = applyTemplateToShader(vsa.settings.shader);
      const programInfo = await twgl.createProgramInfoAsync(gl, [vs, s_fs]);
      this.programInfo = programInfo;
      this.vsa = vsa;
    } catch (e) {
      console.error(e);
    }
    this.compiling = false;
    if (this.pendingUrl) {
      const nextUrl = this.pendingUrl;
      this.pendingUrl = undefined;
      this.setURL(nextUrl);
    }
  }
  reset(/*gl*/) {
  }
  resize() {
  }

  #updateSoundAndTouchHistory(gl, analysers, time) {
    // Copy audio data to Nx1 texture
    analysers[0].getByteFrequencyData(this.soundHistory.buffer);

    // should we do this in a shader?
    {
      const buf = this.soundHistory.buffer;
      const len = buf.length;
      let max = 0;
      for (let ii = 0; ii < len; ++ii) {
        const v = buf[ii];
        if (v > max) {
          max = v;
        }
      }
      this.volumeHistory.buffer[3] = max;
    }
    this.volumeHistory.buffer[0] = Math.abs(this.maxSample) * 255;
    this.volumeHistory.buffer[1] = this.sum * 255;
    this.volumeHistory.buffer[2] = this.maxDif * 127;

    if (this.floatSoundHistory) {
      this.analyser.getFloatFrequencyData(this.floatSoundHistory.buffer);
    }

    // Update time
    for (let ii = 0; ii < this.touchColumns; ++ii) {
      const  offset = ii * 4;
      this.touchHistory.buffer[offset + 3] = time;
    }

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);

    twgl.setBuffersAndAttributes(gl, this.historyProgramInfo, this.quadBufferInfo);

    this.volumeHistory.update(gl, this.historyProgramInfo, this.quadBufferInfo);
    this.soundHistory.update(gl, this.historyProgramInfo, this.quadBufferInfo);
    if (this.floatSoundHistory) {
      this.floatSoundHistory.update(gl, this.historyProgramInfo, this.quadBufferInfo);
    }
    this.touchHistory.update(gl, this.historyProgramInfo, this.quadBufferInfo);
  }

  #renderScene(gl, volumeHistoryTex, touchHistoryTex, soundHistoryTex, floatSoundHistoryTex, time) {
    twgl.bindFramebufferInfo(gl);
    const settings = this.vsa.settings;

    const programInfo = this.programInfo;
    if (!programInfo) {
      return;
    }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(...settings.backgroundColor);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const num = settings.num;
    const mode = gl[settings.mode];
    const uniforms = this.uniforms;
    uniforms.time = time;
    uniforms.vertexCount = num;
    uniforms.resolution[0] = gl.drawingBufferWidth;
    uniforms.resolution[1] = gl.drawingBufferHeight;
    uniforms.background[0] = settings.backgroundColor[0];
    uniforms.background[1] = settings.backgroundColor[1];
    uniforms.background[2] = settings.backgroundColor[2];
    uniforms.background[3] = settings.backgroundColor[3];
    // uniforms.mouse[0] = mouse[0];
    // uniforms.mouse[1] = mouse[1];
    uniforms._dontUseDirectly_pointSize = 1;
    uniforms.volume = volumeHistoryTex;
    uniforms.sound = soundHistoryTex;
    uniforms.floatSound = floatSoundHistoryTex;
    uniforms.touch = touchHistoryTex;

    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, this.countBufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, this.countBufferInfo, mode, num);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  render(gl, commonUniforms, byteBeat, analyzers) {
    if (!this.vsa || !this.programInfo) {
      return;
    }
    this.#init(gl, analyzers[0]);
    const time = byteBeat.getTime() / byteBeat.getDesiredSampleRate();
    this.#updateSoundAndTouchHistory(gl, analyzers, time);

    const volumeHistoryTex = this.volumeHistory.getTexture();
    const touchHistoryTex = this.touchHistory.getTexture();
    const historyTex = this.soundHistory.getTexture();
    const floatHistoryTex = this.floatSoundHistory ? this.floatSoundHistory.getTexture() : historyTex;
    this.#renderScene(gl, volumeHistoryTex, touchHistoryTex, historyTex, floatHistoryTex, time);
  }
}