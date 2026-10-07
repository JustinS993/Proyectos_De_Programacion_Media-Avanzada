const encoder = new TextEncoder();

export function encodeGif(frames) {
  const output = [];
  const writeText = (text) => output.push(...encoder.encode(text));
  const writeWord = (value) => output.push(value & 255, (value >> 8) & 255);
  const width = frames[0].width;
  const height = frames[0].height;
  writeText("GIF89a");
  writeWord(width);
  writeWord(height);
  output.push(0xf7, 0, 0);

  for (let index = 0; index < 256; index++) {
    const red = (index >> 5) & 7;
    const green = (index >> 2) & 7;
    const blue = index & 3;
    output.push(Math.round(red * 255 / 7), Math.round(green * 255 / 7), Math.round(blue * 255 / 3));
  }

  if (frames.length > 1) {
    output.push(0x21, 0xff, 0x0b, ...encoder.encode("NETSCAPE2.0"), 0x03, 0x01, 0, 0, 0);
  }

  for (const frame of frames) {
    if (frame.width !== width || frame.height !== height) {
      throw new Error("Los fotogramas de esta animación tienen dimensiones incompatibles.");
    }
    output.push(0x21, 0xf9, 0x04, 0);
    writeWord(frame.delay);
    output.push(0, 0);
    output.push(0x2c);
    writeWord(0);
    writeWord(0);
    writeWord(width);
    writeWord(height);
    output.push(0, 8);

    const indices = new Uint8Array(width * height);
    for (let pixel = 0, offset = 0; pixel < indices.length; pixel++, offset += 4) {
      const alpha = frame.pixels[offset + 3] / 255;
      const red = Math.round(frame.pixels[offset] * alpha + 255 * (1 - alpha));
      const green = Math.round(frame.pixels[offset + 1] * alpha + 255 * (1 - alpha));
      const blue = Math.round(frame.pixels[offset + 2] * alpha + 255 * (1 - alpha));
      indices[pixel] = (red >> 5) << 5 | (green >> 5) << 2 | (blue >> 6);
    }

    const compressed = encodeLzw(indices);
    for (let offset = 0; offset < compressed.length; offset += 255) {
      const length = Math.min(255, compressed.length - offset);
      output.push(length);
      for (let i = 0; i < length; i++) output.push(compressed[offset + i]);
    }
    output.push(0);
  }
  output.push(0x3b);
  return new Uint8Array(output);
}

function encodeLzw(indices) {
  const clearCode = 256;
  const endCode = 257;
  let codeSize = 9;
  let nextCode = 258;
  let dictionary = new Map();
  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 255);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };
  const reset = () => {
    dictionary = new Map();
    codeSize = 9;
    nextCode = 258;
  };

  writeCode(clearCode);
  if (indices.length) {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const value = indices[i];
      const key = prefix * 256 + value;
      const known = dictionary.get(key);
      if (known !== undefined) {
        prefix = known;
        continue;
      }

      writeCode(prefix);
      if (nextCode < 4096) {
        dictionary.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        writeCode(clearCode);
        reset();
      }
      prefix = value;
    }
    writeCode(prefix);
  }
  writeCode(endCode);
  if (bitCount) bytes.push(bitBuffer & 255);
  return new Uint8Array(bytes);
}
