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

Clone this repository; it include's (for example) fasiha's changes to MeCab's `configure` script, and fasiha's interface for the web browser to invoke MeCab.

```bash
git clone https://github.com/Birch-san/mecab-wasm.git
```

##### Emscripten

We're gonna use [Emscripten](https://github.com/kripken/emscripten) as our compiler.

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
./emsdk install emscripten-incoming-64bit
```

We will also need a very new Clang compiler:

```bash
./emsdk install clang-incoming-64bit
```

**Option B: download latest pre-compiled SDK binary**

(For casuals)

```bash
# Download and install the latest SDK tools.
./emsdk install latest
```

###### Get Emscripten SDK tools into your shell

Add the Emscripten SDK to your `PATH` (for example in your `.bashrc`):

```bash
export PATH="$HOME/Documents/emsdk_portable:$PATH"
```

Open a new command-line shell.

```bash
# enshrines in your ~/.emscripten that this is your favourite Emscripten version at the moment
emsdk activate emscripten-incoming-64bit clang-incoming-64bit
```

##### Binaryen

[Binaryen](https://github.com/WebAssembly/binaryen) is a compiler infrastructure and toolchain library which (crucially) includes a WebAssembly backend for our compiler.

###### Install Binaryen

**Get source**

Clone Binaryen's GitHub repository:

```bash
git clone https://github.com/WebAssembly/binaryen.git
```

**Build source**

Run `update.py` to initialize git submodules and fetch test files.

```bash
python2 update.py
```

Get the Emscripten toolchain into your environment:

```bash
. $(dirname $(which emsdk))/emsdk_env.sh
```

Make

```bash
cmake . && make
```

May as well build `wasm.js` whilst you're in the area.

```bash
# Build wasm.js
./build.sh
```

Now edit `~/.emscripten` so that `BINARYEN_ROOT` points to the Binaryen that you've compiled.

```bash
# Edit that thing yourself
echo "BINARYEN_ROOT='$HOME/git/binaryen'" >> ~/.emscripten
```

##### Start compilin'

Navigate to the `MeCab` src included in this repository

```bash
cd ~/git/mecab-wasm/mecab-0.996
```

Get the Emscripten env variables into your shell:

```bash
# Emscripten SDK is on your PATH now, right?
. $(dirname $(which emsdk))/emsdk_env.sh
```

Use Emscripten toolchain to invoke `./configure`

```bash
EMCONFIGURE_JS=1 emconfigure ./configure --with-charset=utf8 CXXFLAGS="-std=c++11 -O1 -s BINARYEN=1" CFLAGS="-O1 -s BINARYEN=1"
```

> **Note:**  
> I am a bit confused.  
> The [Binaryen README.md](https://github.com/WebAssembly/binaryen/blame/c8faff5ddbc7e93134763a845371b66bc2be56a4/README.md#L114-L137) suggests that if you use "normal" Emscripten (i.e. Emscripten with its own `fastcomp` fork of LLVM):  
> You *need* to instruct it to use its WebAssembly backend,  
> à la `EMCC_WASM_BACKEND=1`.  

> When I _tried_ to follow this advice and provide `EMCC_WASM_BACKEND=1` — with a `BINARYEN_ROOT` entry in my `~/.emscripten` — emcc swore that my LLVM has no WebAssembly backend installed.  
> I maintain that `emcc` is mistaken in its beliefs, and should reconsider its life choices.

> In conclusion: my hand is forced.  
> I have intentionally omitted the `EMCC_WASM_BACKEND=1` env var.  

> I assert that this means the compilation will take my "Plan B" route of:  
> `C/C++ Source ⇒ LLVM bitcode ⇒ asm.js ⇒ asm2wasm`  
> Rather than my "Plan A" route of:  
> `C/C++ Source ⇒ WebAssembly LLVM backend ⇒ s2wasm ⇒ WebAssembly`.  

> This angers me.

`EMCONFIGURE_JS=1` ensures that we don't cheat on configure tests; enforces that we actually attempt compilation to js. This is worth doing, because we depend on the step `LLVM bitcode ⇒ asm.js` working correctly.

There should now be some LLVM intermediate code in:

```
src/.libs
```

Specifically, you will have these in `src/.libs`:

```
libmecab.2.dylib
libmecab.a
libmecab.dylib -> libmecab.2.dylib
libmecab.la -> ../libmecab.la
libmecab.lai
libmecab.o
mecab
mecab-cost-train
mecab-dict-gen
mecab-dict-index
mecab-system-eval
mecab-test-gen
char_property.o, connector.o, context_id.o, dictionary.o, dictionary_compiler.o, dictionary_generator.o, dictionary_rewriter.o, eval.o, feature_index.o, iconv_utils.o, lbfgs.o, learner.o, learner_tagger.o, nbest_generator.o, param.o, string_buffer.o, tagger.o, tokenizer.o, utils.o, viterbi.o, writer.o
```

The `libmecab.dylib` is Mac-specific. A Linux user would get `libmecab.so`.

Apparently we need to rename the MeCab LLVM intermediate representation (IR) so that Emscripten knows what to do with it:

```bash
cd src/.libs

# rename mecab LLVM IR
cp mecab mecab.bc
# grab a copy of the default mecabrc
cp /usr/local/etc/mecabrc .
# ask your existing mecab executable where ipadic lives, and copy that folder
cp -r $(dirname $(mecab -D | grep filename | sed 's/filename:\s*//')) .
```

Now all the files you need are inside `src/.libs`! From there, run:

```bash
emcc -O1 mecab.bc libmecab.dylib -o mecab.js -s BINARYEN=1 -s EXPORTED_FUNCTIONS="['_mecab_do2']" --preload-file mecabrc --preload-file ipadic/
```

This should give you:

```
mecab.asm.js
mecab.data
mecab.js
mecab.wast
mecab.wast.mappedGlobals
```