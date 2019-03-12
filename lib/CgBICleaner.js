/*
 * Created by Jessewoo on 2019/03/10
 * -----
 */

const zlib = require('zlib');
const { crc32 } = require('crc');

function equalBytes(a, b) {
  if (a.length != b.length) return false;
  for (let l = a.length; l--;) if (a[l] != b[l]) return false;
  return true;
}

function readUInt32(buffer, offset) {
  return (buffer[offset] << 24) +
    (buffer[offset + 1] << 16) +
    (buffer[offset + 2] << 8) +
    (buffer[offset + 3] << 0);
}

function readUInt16(buffer, offset) {
  return (buffer[offset + 1] << 8) + (buffer[offset] << 0);
}

function readUInt8(buffer, offset) {
  return buffer[offset] << 0;
}

function bufferToString(buffer) {
  let str = '';
  for (let i = 0; i < buffer.length; i++) {
    str += String.fromCharCode(buffer[i]);
  }
  return str;
}

class CgBICleaner {
  constructor(bytes) {
    // current pointer
    this.i = 0;
    // bytes buffer
    this.bytes = bytes;

  }

  readBytes(length) {
    let end = this.i + length;
    if (end > this.bytes.length) {
      throw new Error('Unexpectedly reached end of file');
    }
    const bytes = this.bytes.slice(this.i, end);
    this.i = end;
    return bytes;
  }

  /**
   * http://www.w3.org/TR/2003/REC-PNG-20031110/#5PNG-file-signature
   */
  decodeHeader() {
    if (this.i !== 0) {
      throw new Error('file pointer should be at 0 to read the header');
    }

    let header = this.readBytes(8);

    if (!equalBytes(header, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) {
      throw new Error('invalid CgBICleaner file (bad signature)');
    }

    return header;
  }

  /**
   * 
   * iPhone PNG Image Normalizer
   * http://iphonedevwiki.net/index.php/CgBI_file_format
   */
  parse() {
    console.log('src:  ', this.bytes);
    const newPNG = [];
    const header = this.decodeHeader();
    newPNG.push(header);

    let width, height;
    while (this.i < this.bytes.length) {
      // Reading chunk
      let chunkLength = readUInt32(this.readBytes(4), 0);

      if (chunkLength < 0) {
        throw new Error('Bad chunk length ' + (0xFFFFFFFF & chunkLength));
      }

      let chunkType = bufferToString(this.readBytes(4));
      let chunkData = this.readBytes(chunkLength);
      let chunkCRC = this.readBytes(4);
      console.log(`chunkLength: ${chunkLength}, chunkType: ${chunkType}, chunkCRC: ${chunkCRC.toString('hex')}`)

      switch (chunkType) {
        case 'IHDR':
          width = readUInt32(chunkData, 0);
          height = readUInt32(chunkData, 4);
          console.log('PNG: ' + width + ' * ' + height)
          break;
        case 'IDAT':
          try {
            // Uncompressing the image chunk
            // 解压使用deflateRaw压缩的数据(没有zlib头)
            chunkData = zlib.inflateRawSync(chunkData);
          } catch (e) {
            throw new Error('The PNG image is normalized. ', e);
          }

          // Swapping red & blue bytes for each pixel
          // RGBA -> BGRA
          const newdata = [];
          for (let y = 0; y < height; y++) {
            let i = newdata.length;
            newdata.push(chunkData[i]);
            for (let x = 0; x < width; x++) {
              i = newdata.length;
              newdata.push(chunkData[i + 2]);
              newdata.push(chunkData[i + 1]);
              newdata.push(chunkData[i + 0]);
              newdata.push(chunkData[i + 3]);
            }
          }
          const newDataBuf = Buffer.from(newdata);
          console.log('IDAT new chunkLength:', newDataBuf.length);

          // Compressing the image chunk
          chunkData = zlib.deflateSync(newDataBuf);
          chunkLength = chunkData.length;
          // fix crc
          // CRC(cyclic redundancy check）域中的值是对Chunk Type Code域和Chunk Data域中的数据进行计算得到的。CRC具体算法定义在ISO 3309和ITU-T V.42中。
          chunkCRC = crc32(chunkType);
          chunkCRC = crc32(chunkData, chunkCRC);
          chunkCRC = (chunkCRC + 0x100000000) % 0x100000000;
          console.log('IDAT new chunkCRC: ', chunkCRC.toString(16));
          const crcBuf = Buffer.allocUnsafe(4);
          crcBuf.writeUInt32BE(chunkCRC, 0);
          chunkCRC = crcBuf;
          break;
      }

      // Removing CgBI chunk        
      if (chunkType !== "CgBI") {
        const lengthBuf = Buffer.allocUnsafe(4);
        lengthBuf.writeUInt32BE(chunkLength, 0);
        newPNG.push(lengthBuf);
        newPNG.push(Buffer.from(chunkType, 'ascii'));
        newPNG.push(chunkData);
        newPNG.push(chunkCRC);
      }

      // stop after IEND
      if (chunkType == 'IEND') break;
    }

    const newBuf = Buffer.concat(newPNG);
    console.log('dist: ', newBuf)
    return newBuf;
  }

}

module.exports = CgBICleaner;
