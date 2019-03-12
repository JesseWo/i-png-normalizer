# IPIN
IPIN (iPhone PNG Image Normalizer): Apple对png图片进行了 [pngcrush](https://pmt.sourceforge.io/pngcrush/) 压缩, 故此格式的图片在非 Apple 的软件内无法正常显示. IPIN的作用就是将这种PNG图片正常化.

## Usage
在项目中直接通过以下方式进行依赖：
```json
...
"dependencies": {
    "ipin": "git+https://github.com/JesseWo/ipin.git",
  },
...
```

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

