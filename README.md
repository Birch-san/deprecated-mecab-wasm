# Mecab in WebAssembly

[fasiha's `Mecab-Emscripten`](https://github.com/fasiha/mecab-emscripten) demonstrated that Mecab can be run in JS.

Let's see how far we get trying to compile to WebAssembly!

## Why

Mecab is an awesome C++ library and CLI for tokenizing Japanese characters.

Some pretty cool browser extensions could be built if MeCab were trivially embeddable into a webpage, at native speeds.

## Plan

[Binaryen](https://github.com/WebAssembly/binaryen) provides a path:

> C/C++ Source ⇒ WebAssembly LLVM backend ⇒ s2wasm ⇒ WebAssembly

I assert that [fasiha's `Mecab-Emscripten`](https://github.com/fasiha/mecab-emscripten) did something very similar:

> C/C++ Source ⇒ LLVM bitcode ⇒ asm.js

We just need to take a slightly different direction.

### Plan B

If LLVM's WebAssembly backend is not ready, then we can take a more scenic route:

> C/C++ Source ⇒ LLVM bitcode ⇒ asm.js ⇒ asm2wasm

This seems like a wasted step though.

## Build Instructions (so far)

Apparently we need to first install Mecab in an ordinary manner, in order to ensure a dictionary is built.

### Install MeCab

#### Acquire source

From [MeCab's website](https://taku910.github.io/mecab/), download the [latest source release](https://drive.google.com/uc?export=download&id=0B4y35FiV1wh7cENtOXlicTFaRUE) (`mecab-0.996.tar.gz` at the time of writing — Mar 2016).

#### Make

##### Extra step for Linux

_Linux users may need first to tell their runtime shared library loader in which directories to find shared libraries, like so:_

```bash
export LD_LIBRARY_PATH="/usr/local/lib:$LD_LIBRARY_PATH"
```

##### Nominal process

```bash
./configure --with-charset=utf8 && make && make test && sudo make install
```

### Install dictionary

#### Acquire source

From [MeCab's website](https://taku910.github.io/mecab/), download and build the latest [IPADIC dictionary](https://drive.google.com/uc?export=download&id=0B4y35FiV1wh7MWVlSDBCSXZMTXM) (`mecab-ipadic-2.7.0-20070801` at the time of writing — Mar 2016) for your native binary MeCab.

#### Make

```bash
./configure --with-charset=utf-8 && make && sudo make install
```

### Sanity check

Confirm that mecab is setup, and on your PATH:

```bash
echo test | mecab
```

Expected output:

```bash
test    名詞,固有名詞,組織,*,*,*,*
EOS
```

### mecab-wasm

Now we can start thinking about WebAssembling.

#### What you'll need

##### Alternative MeCab source

Clone this repository; there are changes to (for example) MeCab's `configure` script.

```bash
git clone https://github.com/Birch-san/mecab-wasm.git
```

##### Up-to-date `llc` (LLVM static compiler)

The WebAssembly backend to LLVM is pretty new, so I assume we need to update LLVM.

```bash
brew install llvm
```

Apparently I got `llvm-3.6.2.el_capitan.bottle.1.tar.gz`.

