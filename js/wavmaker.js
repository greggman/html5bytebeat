class WavMaker {
  constructor(sampleRate = 44100, numChannels = 1) {
    this.sampleRate = sampleRate;
    this.numChannels = numChannels;
    this.numSamples = 0;
    this.blobs = [];
  }
  addData(inputBuffers){
    const {numChannels} = this;
    const numSamples = inputBuffers[0].length;
    const sizeNeeded = numSamples * numChannels;
    const output = new Uint16Array(sizeNeeded);
    const outputView = new DataView(output.buffer);
    let outOffset = 0;
    for (let i = 0; i < numSamples; ++i) {
      for (let channel = 0; channel < numChannels; ++channel) {
        const s = Math.max(-1, Math.min(1, inputBuffers[channel][i]));
        outputView.setInt16(outOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        outOffset += 2;
      }
    }
    this.blobs.push(new Blob([output]));
    this.numSamples += numSamples;
  }
  getWavBlob() {
    const {numSamples, numChannels, sampleRate, blobs} = this;
    const output = new Uint8Array(44);
    const view = new DataView(output.buffer);

    writeString(view, 0, 'RIFF');                           // RIFF identifier
    view.setUint32(4, 36 + this.numSamples * 2, true);      // RIFF chunk length
    writeString(view, 8, 'WAVE');                           // RIFF type
    writeString(view, 12, 'fmt ');                          // format chunk identifier
    view.setUint32(16, 16, true);                           // format chunk length
    view.setUint16(20, 1, true);                            // sample format (raw)
    view.setUint16(22, numChannels, true);                  // channel count
    view.setUint32(24, sampleRate, true);                   // sample rate
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate (sample rate * block align)
    view.setUint16(32, numChannels * 2, true);              // block align (channel count * bytes per sample)
    view.setUint16(34, 16, true);                           // bits per sample
    writeString(view, 36, 'data');                          // data chunk identifier
    view.setUint32(40, numSamples * numChannels * 2, true); // data chunk length

    return new Blob([new Blob([output]), ...blobs], {type: 'audio/wav'});
  }
}

function writeString(view, offset, string){
  for (let i = 0; i < string.length; ++i){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

window.WavMaker = WavMaker;

