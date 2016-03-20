# Mecab in WebAssembly

[fasiha's `Mecab-Emscripten`](https://github.com/fasiha/mecab-emscripten) demonstrated that Mecab can be run in JS.

Let's see how far we get trying to compile to WebAssembly!

## Why

Mecab is an awesome C++ library and CLI for tokenizing Japanese characters.

Some pretty cool browser extensions could be built if MeCab were trivially embeddable into a webpage, at native speeds.

## Demo

Very new versions of Chrome have [experimental WebAssembly support](http://v8project.blogspot.co.uk/2016/03/experimental-support-for-webassembly.html).

Get [Google Chrome Canary](https://www.google.co.uk/chrome/browser/canary.html).

Enable the experimental WebAssembly flag:

chrome://flags#enable-webassembly

Restart Google Chrome Canary.

Clone the repository:

```bash
git clone https://github.com/Birch-san/mecab-wasm.git
```

Launch the simple Node webserver:

```bash
npm index.js
```

Browse to `http://localhost:3000/`.

You will see what I have managed so far. Which might not be anything yet.


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

_If you feel like it: you can build `wasm.js` whilst you're in the area._

```bash
# Build wasm.js
./build.sh
```

`wasm.js` is a shim that provides WebAssembly support via a JS interpreter, to browsers that don't yet have a full WebAssembly implementation.

Now edit `~/.emscripten` so that `BINARYEN_ROOT` points to the Binaryen that you've compiled.

```bash
# Edit that thing yourself
echo "BINARYEN_ROOT='$HOME/git/binaryen'" >> ~/.emscripten
```

##### WebAssembly support for browsers

Let's get the (WIP) native WebAssembly support for web browsers.

###### Acquire source

Get [mozilla-inbound](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Source_Code/Mercurial).

```bash
# if you have never installed Mercurial: try 'brew install hg'
hg clone https://hg.mozilla.org/integration/mozilla-inbound/ inbound
cd inbound
```

###### Build Spidermonkey

Prerequisites required for building Mozilla projects [here](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Build_Instructions/Mac_OS_X_Prerequisites).

```bash
curl https://hg.mozilla.org/mozilla-central/raw-file/default/python/mozboot/bin/bootstrap.py > bootstrap.py && python bootstrap.py
# Answer 1 when prompted
```

SpiderMonkey Build instructions [here](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Build_Documentation).

```bash
cd js/src
# The bootstrapping that you ran prior to this should 'brew install autoconf213'
autoconf213

# This name should end with "_OPT.OBJ" to make the version control system ignore it.
mkdir build_OPT.OBJ
cd build_OPT.OBJ
../configure
make
```

Now populate your `~/.emscripten`'s `SPIDERMONKEY_ENGINE` with the path to the js shell that was built (`js/src/build_OPT.OBJ/dist/bin/js`):

```bash
# Edit that thing
vi ~/.emscripten
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

Use Emscripten toolchain to invoke `./configure`.

If at any point you goof up: erase all evidence with `git clean -fxd`.

```bash
EMCONFIGURE_JS=1 emconfigure ./configure --with-charset=utf8 CXXFLAGS="-std=c++11 -O1 -s BINARYEN=1 -s BINARYEN_SCRIPTS=\"spidermonkify.py\" -s TOTAL_MEMORY=134217728" CFLAGS="-O1 -s BINARYEN=1 -s BINARYEN_SCRIPTS=\"spidermonkify.py\" -s TOTAL_MEMORY=134217728"
```

> **Note:**  
> I am a bit confused.  
> The [Binaryen README.md](https://github.com/WebAssembly/binaryen/blame/c8faff5ddbc7e93134763a845371b66bc2be56a4/README.md#L114-L137) suggests that if you use "normal" Emscripten (i.e. Emscripten with its own `fastcomp` fork of LLVM):  
> You *need* to instruct it to use its WebAssembly backend,  
> à la `EMCC_WASM_BACKEND=1`.  

> When I _tried_ to follow this advice and provide `EMCC_WASM_BACKEND=1` — with a `BINARYEN_ROOT` entry in my `~/.emscripten` — `emcc` swore that my LLVM has no WebAssembly backend installed.  
> I maintain that `emcc` is mistaken in its beliefs, and should reconsider its life choices.

> In conclusion: my hand is forced.  
> I have intentionally omitted the `EMCC_WASM_BACKEND=1` env var.  

> I assert that this means the compilation will take my "Plan B" route of:  
> `C/C++ Source ⇒ LLVM bitcode ⇒ asm.js ⇒ asm2wasm`  
> Rather than my "Plan A" route of:  
> `C/C++ Source ⇒ WebAssembly LLVM backend ⇒ s2wasm ⇒ WebAssembly`.  

> This angers me.

`EMCONFIGURE_JS=1` ensures that we don't cheat on configure tests; enforces that we actually attempt compilation to js. This is worth doing, because we depend on the step `LLVM bitcode ⇒ asm.js` working correctly.

The CXXFLAG and CFLAG `-s BINARYEN_SCRIPTS=\"spidermonkify.py\"` ensures that Binaryen will [output a binary compatible with browsers](https://github.com/kripken/emscripten/wiki/WebAssembly).

Okay, now for `make`.

I was not able to find a way to make `./configure` faithfully pass the correct quoting upon `BINARYEN_SCRIPTS` into the `Makefile`. Yes, I tried various types of escaping and double-quoting.

So, my solution is: dive in and apply some post-processing of your own to the Makefiles (sorry).

The `Makefile` you get by default will have lines that look like this:

```bash
CFLAGS = -O1 -s BINARYEN=1  -s BINARYEN_SCRIPTS="spidermonkify.py"
CXXFLAGS = -std=c++11 -O1 -s BINARYEN=1  -s BINARYEN_SCRIPTS="spidermonkify.py"
```

Manually edit the files `Makefile` **and** `src/Makefile` to use quotation more like this:

```bash
CFLAGS = -O1 -s BINARYEN=1  -s 'BINARYEN_SCRIPTS="spidermonkify.py"'
CXXFLAGS = -std=c++11 -O1 -s BINARYEN=1  -s 'BINARYEN_SCRIPTS="spidermonkify.py"'
```

Heck, you could use `sed` if you're feeling brave. Here I use BSD sed (hence I use -E for extended regular expressions). GNU sed would use `-r` instead.

```bash
sed -i.bak -E "s/(\s+)(BINARYEN_SCRIPTS=(\S)+)(\s+)/\1'\2'\4/g" Makefile
sed -i.bak -E "s/(\s+)(BINARYEN_SCRIPTS=(\S)+)(\s+)/\1'\2'\4/g" src/Makefile
```

Okay. _Now_ you are ready to run `make`:

```bash
emmake make
```

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
emcc -O1 mecab.bc libmecab.dylib -o mecab.html -s BINARYEN=1 -s EXPORTED_FUNCTIONS="['_mecab_do2']" -s 'BINARYEN_SCRIPTS="spidermonkify.py"' --preload-file mecabrc --preload-file ipadic/ -s TOTAL_MEMORY=134217728
```

This should give you:

```
mecab.asm.js
mecab.data
mecab.js
mecab.html
mecab.wast
mecab.wast.mappedGlobals
mecab.wasm
mecab.wasm.mappedGlobals
```

Update the demo in the demo folder using:

```bash
cp mecab.* ../../../demo
```

Minify the mecab.js using [UglifyJs2](https://github.com/mishoo/UglifyJS2):

```bash
# Get UglifyJs2 if you haven't got it already
npm install uglify-js -g

# almost all compressor switches are enabled by default
uglifyjs --screw-ie8 --compress unsafe --mangle -v -o mecab.min.js -- mecab.js
```