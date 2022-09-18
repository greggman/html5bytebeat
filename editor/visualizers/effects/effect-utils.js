import * as twgl from '../../../js/twgl-full.module.js';

export function drawEffect(gl, programInfo, bufferInfo, uniforms, commonUniforms, primitive) {
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, commonUniforms, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo, primitive);
}