# IPIN
Apple 对 png 图片进行了 [pngcrush](https://pmt.sourceforge.io/pngcrush/) 压缩, 此格式的图片在非 Apple 的软件内无法正常显示. 其中典型的场景就是从 `.ipa` 文件中提取的 icon 在除了 Safari 之外的浏览器上无法正常显示.

**IPIN (iPhone PNG Image Normalizer)** 的作用就是将这种 PNG 图片进行转换, 以实现在各种图片解析软件中正常显示.
> Apple 压缩优化后的 PNG 与 常规的 PNG 在数据格式方面的区别可参见 [CgBI_file_format](http://iphonedevwiki.net/index.php/CgBI_file_format)

node中现有的解决方案是 [node-pngdefry](https://github.com/forsigner/node-pngdefry), 是通过对 [pngdefry (C)](http://www.jongware.com/pngdefry.html) CLI工具的封装实现的. 

相对于以上解决方案, IPIN 的优势在于输入和输出都是 `buffer`, 直接在内存中从二进制层面对 PNG 数据进行转换, 从而减少无关的 I/O 操作.

## Usage
在项目中直接通过以下方式进行依赖：

package.json
```json
...
"dependencies": {
    "ipin": "git+https://github.com/JesseWo/ipin.git",
  },
...
```
js
```javascript
const fs = require('fs');
const path = require('path');

const CgBICleaner = require('ipin');
const srcBuf = fs.readFileSync(path.resolve(__dirname, './AppIcon57x57.png'))
const ipin = new CgBICleaner(srcBuf);
const distBuf = ipin.parse();

fs.writeFileSync(path.resolve(__dirname, './ipin.png'), distBuf);
```

## Refs.
### Format
- [REC-PNG-20031110](https://www.w3.org/TR/2003/REC-PNG-20031110/)
- [PNG-Structure](http://www.libpng.org/pub/png/spec/1.0/PNG-Structure.html)
- [CgBI_file_format](http://iphonedevwiki.net/index.php/CgBI_file_format)
### Implementations
- Encoding
  - [pincrush (C)](https://github.com/DHowett/pincrush)
- Decoding
  - [pngdefry (C)](http://www.jongware.com/pngdefry.html)
  - [node-pngdefry (node.js wrapper of pngdefry)](https://github.com/forsigner/node-pngdefry)
  - [iPhone PNG Image Normalizer (python)](https://axelbrz.com/?mod=iphone-png-images-normalizer)

