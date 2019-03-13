/*
 * Created by Jessewoo on 2019/03/11
 * -----
 */

const fs = require('fs');
const path = require('path');
const IPngNormalizer = require('../index');

function printDividerLine(){
    console.log('------------------------------------------------------');
}

function appleSingleIDATTest() {
    const ipin = new IPngNormalizer(fs.readFileSync(path.resolve(__dirname, './apple-single-IDAT/AppIcon57.png')));
    const newBuf = ipin.parse();

    if (newBuf.compare(fs.readFileSync(path.resolve(__dirname, './apple-single-IDAT/AppIcon57.normal.png'))) === 0) {
        fs.writeFileSync(path.resolve(__dirname, './apple-single-IDAT/AppIcon57x57.ipin.png'), newBuf);
        console.log('PNG with single IDAT chunk convert success!');
    } else {
        console.error('PNG with single IDAT chunk convert failed!');
    }
    printDividerLine();
}

function appleMultiIDATTest() {
    const ipin = new IPngNormalizer(fs.readFileSync(path.resolve(__dirname, './apple-multi-IDAT/icon120.png')));
    const newBuf = ipin.parse();

    fs.writeFileSync(path.resolve(__dirname, './apple-multi-IDAT/icon120.ipin.png'), newBuf);
    if (newBuf.compare(fs.readFileSync(path.resolve(__dirname, './apple-multi-IDAT/icon120.normal.png'))) === 0) {
        console.log('PNG with multi IDAT chunk convert success!');
    } else {
        console.error('PNG with multi IDAT chunk convert failed!');
    }
    printDividerLine();
}

function normalPNGTest() {
    const ipin = new IPngNormalizer(fs.readFileSync(path.resolve(__dirname, './normal/icon96.png')));
    const newBuf = ipin.parse();

    fs.writeFileSync(path.resolve(__dirname, './normal/icon96.ipin.png'), newBuf);
    console.log("Normal PNG needn't convert!");
    printDividerLine();
}

normalPNGTest();
appleSingleIDATTest();
appleMultiIDATTest();

