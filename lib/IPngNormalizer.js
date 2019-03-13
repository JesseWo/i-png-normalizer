/*
 * Created by Jessewoo on 2019/03/10
 * -----
 */

const zlib = require('zlib');
const { crc32 } = require('crc');

const CHUNK_LENGTH_MAX_VALUE = Math.pow(2, 31) - 1; // 2G

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

class IPngNormalizer {
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
      throw new Error('invalid PNG file (bad signature)');
    }

    return header;
  }

  decodeCgBIChunk() {
    const chunkLength = readUInt32(this.readBytes(4), 0);

    if (chunkLength < 0) {
      throw new Error('Bad chunk length ' + (0xFFFFFFFF & chunkLength));
    }

    const chunkType = bufferToString(this.readBytes(4));
    const chunkData = this.readBytes(chunkLength);
    const chunkCRC = this.readBytes(4);
    console.log(`chunkLength: ${chunkLength}, chunkType: ${chunkType}, chunkCRC: ${chunkCRC.toString('hex')}`)
    return chunkType === 'CgBI';
  }

  /**
   * 修正 IDAT chunk
   * @param {Array} IDATChunkDataArr 
   * @return {Buffer}
   */
  handleIDATChunk(IDATChunkDataArr) {
    //组合
    let IDATChunkData = Buffer.concat(IDATChunkDataArr);
    const chunkCount = IDATChunkDataArr.length;
    // Uncompressing the image chunk
    // 解压: 解压使用deflateRaw压缩的数据(没有zlib头)
    IDATChunkData = zlib.inflateRawSync(IDATChunkData);
    // 转换
    // Swapping red & blue bytes for each pixel. RGBA -> BGRA
    const tmpArr = [];
    for (let y = 0; y < this.height; y++) {
      let i = tmpArr.length;
      tmpArr.push(IDATChunkData[i]);
      for (let x = 0; x < this.width; x++) {
        i = tmpArr.length;
        tmpArr.push(IDATChunkData[i + 2]);
        tmpArr.push(IDATChunkData[i + 1]);
        tmpArr.push(IDATChunkData[i + 0]);
        tmpArr.push(IDATChunkData[i + 3]);
      }
    }
    const newDataBuf = Buffer.from(tmpArr);

    // 压缩: Compressing the image chunk
    IDATChunkData = zlib.deflateSync(newDataBuf);
    // 分割成多个 IDAT chunk
    const IDATChunkDataTotalLength = IDATChunkData.length;
    const tail = IDATChunkDataTotalLength % chunkCount;
    const IDATChunkDataPartLength = Math.floor(IDATChunkDataTotalLength / chunkCount);
    const IDATArr = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunkType = 'IDAT';
      let chunkData;
      if (tail > 0 && i == chunkCount - 1) {
        chunkData = IDATChunkData.slice(i * IDATChunkDataPartLength, i * IDATChunkDataPartLength + IDATChunkDataPartLength + tail);
      } else {
        chunkData = IDATChunkData.slice(i * IDATChunkDataPartLength, i * IDATChunkDataPartLength + IDATChunkDataPartLength);
      }
      // fix crc
      // CRC(cyclic redundancy check）域中的值是对Chunk Type Code域和Chunk Data域中的数据进行计算得到的。CRC具体算法定义在ISO 3309和ITU-T V.42中。
      let chunkCRC = crc32(chunkType);
      chunkCRC = crc32(chunkData, chunkCRC);
      chunkCRC = (chunkCRC + 0x100000000) % 0x100000000;
      console.log('IDAT new chunkCRC: ', chunkCRC.toString(16));
      const crcBuf = Buffer.allocUnsafe(4);
      crcBuf.writeUInt32BE(chunkCRC, 0);
      chunkCRC = crcBuf;

      const lengthBuf = Buffer.allocUnsafe(4);
      lengthBuf.writeUInt32BE(chunkData.length, 0);
      IDATArr.push(lengthBuf);
      IDATArr.push(Buffer.from(chunkType, 'ascii'));
      IDATArr.push(chunkData);
      IDATArr.push(chunkCRC);
    }
    //所有的 IDAT
    return Buffer.concat(IDATArr);
  }

  /**
   * 
   * iPhone PNG Image Normalizer
   * http://iphonedevwiki.net/index.php/CgBI_file_format
   */
  parse() {
    // PNG header为第一部分
    const part1 = this.decodeHeader();
    
    if (!this.decodeCgBIChunk()) {
      // 常规 PNG, 返回原buffer
      console.error('invalid CgBI file.');
      return this.bytes;
    }
    console.log('src:  ', this.bytes);

    const otherChunkStartIndex = this.i;

    let interlaceMethod,
      lastChunkType,
      IDATChunkStartIndex, IDATChunkEndIndex;
    const IDATChunkDataArr = [];
    while (this.i < this.bytes.length) {
      // Reading chunk
      let chunkLength = readUInt32(this.readBytes(4), 0);

      if (chunkLength < 0) {
        throw new Error('Bad chunk length ' + (0xFFFFFFFF & chunkLength));
      }

      let chunkType = bufferToString(this.readBytes(4));
      if (chunkType === 'IDAT' && lastChunkType !== 'IDAT') {
        //first IDAT chunk
        IDATChunkStartIndex = this.i - 8;
      } else if (lastChunkType === 'IDAT' && chunkType !== 'IDAT') {
        IDATChunkEndIndex = this.i - 8;
      }
      let chunkData = this.readBytes(chunkLength);
      let chunkCRC = this.readBytes(4);
      console.log(`chunkLength: ${chunkLength}, chunkType: ${chunkType}, chunkCRC: ${chunkCRC.toString('hex')}`)

      if (chunkType === 'IHDR') {
        this.width = readUInt32(chunkData, 0);
        this.height = readUInt32(chunkData, 4);
        interlaceMethod = readUInt8(chunkData, 12); //逐行扫描方式
        console.log(`PNG: ${this.width} * ${this.height}, interlaceMethod=${interlaceMethod}`)
      }

      if (chunkType === 'IDAT') {
        IDATChunkDataArr.push(chunkData);
      }

      // stop after IEND
      if (chunkType == 'IEND') break;

      lastChunkType = chunkType;
    }

    // CgBI 之后(不含)和第一个 IDAT 之前(不含)部分
    const part2 = this.bytes.slice(otherChunkStartIndex, IDATChunkStartIndex);
    // 所有的 IDAT
    const part3 = this.handleIDATChunk(IDATChunkDataArr);;
    // 最后一个 IDAT 之后(不含) 的部分
    const part4 = this.bytes.slice(IDATChunkEndIndex);

    const newBuf = Buffer.concat([part1, part2, part3, part4]);
    console.log('dist: ', newBuf)
    return newBuf;
  }

}

module.exports = IPngNormalizer;
