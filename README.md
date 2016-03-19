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

##### Emscripten

We're gonna use Emscripten as our toolchain.

###### Install Emscripten SDK

From [Emscripten's download page](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html), download (for example) [Portable Emscripten SDK for Linux and OS X](https://s3.amazonaws.com/mozilla-games/emscripten/releases/emsdk-portable.tar.gz).

You'll end up with a folder called `emsdk_portable/`, with a binary called `./emsdk`.

```bash
# Fetch the latest registry of available tools.
./emsdk update
```

**Option A: compile a very new SDK yourself**

```bash
# See what our options are
./emsdk list
```

I got something like this:

```
The following tools can be compiled from source:
           clang-tag-e1.36.0-32bit  
           clang-tag-e1.36.1-32bit  
           clang-tag-e1.36.0-64bit  
           clang-tag-e1.36.1-64bit  
           clang-incoming-32bit     
           clang-incoming-64bit     
           clang-master-32bit       
           clang-master-64bit       
           emscripten-tag-1.36.0-32bit
           emscripten-tag-1.36.1-32bit
           emscripten-tag-1.36.0-64bit
           emscripten-tag-1.36.1-64bit
           emscripten-incoming-32bit
           emscripten-master-32bit  
           emscripten-incoming-64bit
           emscripten-master-64bit  
```

`emscripten-tag-1.36.1-64bit` looks pretty new.

```bash
# install your weapon of choice
./emsdk install emscripten-tag-1.36.1-64bit
```

**Option B: download latest pre-compiled SDK binary**

(For casuals)

```bash
# Download and install the latest SDK tools.
./emsdk install latest
```

###### Get Emscripten SDK tools into your shell

Open a new command-line shell.

```bash
# enshrines in your ~/.emscripten that this is your favourite Emscripten version at the moment
./emsdk activate emscripten-tag-1.36.1-64bit
```

Add the Emscripten SDK to your `PATH` (for example in your `.bashrc`):

```bash
export PATH="$HOME/Documents/emsdk_portable:$PATH"
```

##### Start compilin'

Navigate to the `MeCab` src included in this repository

```bash
cd ~/git/mecab-wasm/mecab-0.996
```

Get the Emscripten env variables into your shell:

```bash
# Emscripten SDK is on your PATH now, right?
$(dirname $(which emsdk))/emsdk_env.sh
```

Use Emscripten toolchain to invoke `./configure`

```bash
emconfigure ./configure --with-charset=utf8 CXXFLAGS="-std=c++11 -O1" CFLAGS="-O1"
```