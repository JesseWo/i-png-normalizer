/*
 * Created by Jessewoo on 2019/03/11
 * -----
 */

const fs = require('fs');
const path = require('path');

const CgBICleaner = require('../index');
const ipin = new CgBICleaner(fs.readFileSync(path.resolve(__dirname, './AppIcon57x57.png')));
const newBuf = ipin.parse();

if (newBuf.compare(fs.readFileSync(path.resolve(__dirname, './AppIcon57x57_normal.png'))) === 0) {
    fs.writeFileSync(path.resolve(__dirname, './ipin.png'), newBuf);
    console.log('PNG convert success!');
} else {
    console.error('PNG convert failed!');
}