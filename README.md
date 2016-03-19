# Mecab in WebAssembly

[fasiha's repository](https://github.com/fasiha/mecab-emscripten) demonstrated that Mecab can be run in JS.

Let's see how far we get trying to compile to WebAssembly!

## Why

Mecab is an awesome C++ library and CLI for tokenizing Japanese characters.

Some pretty cool browser extensions could be built if MeCab were trivially embeddable into a webpage, at native speeds.