HTML5 Bytebeat
==============

Bytebeat is the name of type of music made from math.

You provide a function who's only input is time *t* and from that write some code to generate a sound.

In this particular case *t* is an 8000hz timer that counts up. For example

    sin(t) * 127 + 127

You can choose traditional bytebeat where the output of your function is expected to be 0 to 255
or you can choose floatbeat where the output is expected to be -1 to +1.

Functions are just plain JavaScript though sin, cos, tan, floor, ceil and int will automatically be converted
to Math.sin, Math.cos, Math.tan, Math.floor, Math.ceil, and Math.floor respectively.

[Click here to try your hand at Bytebeat](http://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html).

# Instructions

### Modes

There 2 modes

* bytebeat: Your expression is expected to generate byte values from 0 to 255
* floatbeat: Your expression is expected to generate float values from -1.0 to 1.0

### Expression Types
* Infix: Standard expressions eg. "`(t * 2) / 4`"
* Postfix(rpn): Reverse Polish Notation eg "`t 2 * 4 /`"
* glitch: glitch format or glitch urls.
* function: Return a function. eg. "`return t => (t * 2) / 4`"

**Infix** is standard JavaScript so all Math functions are available.
Most math functions you can drop the "Math." part. In other words

    sin(t)

is the same as

    Math.sin(t)

**Postfix** requires that each element have at least one space between it.

    t2*    // BAD!
    t 2 *  // Good!

If you're unfamiliar with postfix [see below](#postfix)

**Glitch** is a format used by glitch machine for sharing. Examples

* <a href="https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=2&s=8000&bb=5d0000010060000000000000000017e07c68347275b48b8a3e4ae5f2fcf118694f3c5b765c81e4a571018d893ec35ab1c80e51eaadbdb73dbe8af51bf1324d5fc68ca278d3c5fbff8e137344d360a109d789a07673a414f2b2171c4d5de9f1d3f2ecc410e9dfff85520000">42_forever!a13880fa400he!a5kma6kn40g!aCk28!a12k1ld!2fladm!43n</a>
* <a href="https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=2&s=8000&bb=5d000001006b000000000000000017e07ce06937cec415be16c16cd1dc7770bc5386546efdb66845ee0aa7b98eff2ba6e3f457299da2037f6a5ad9e8e38b3611b90fee512d353d0b25fc253191ae89a30e0f7adabb03c956d89bd548392fe27fe4ffe962f8939a5a65ff945a0000">pipe_symphony!aEk5h5f!a11k2h!a9k3hdf!aDk4hg!ad4e!p5fm!a11k2h1rg!a5kdm</a>

These can be prefixed with "glitch://". For example

* <a href="https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=2&s=8000&bb=5d0000010074000000000000000017e07ce661316231c4f949bffc8dd7660451a2571363cac6697ec8fb0cdb5eb5685ae9f83ad7be74c020fa1efe54e1b53cf571811b40ca41357fd42f73eb9683e086bd4aaf30dc675ee6bb090c9840be59402238c6553b9cc0eea0bdc6ddeac83341fdff033c0000">glitch://sadglitch!4.4.9.8.9.6.4.2!aoCk8hq!ad2d!aFk3h1fe!p5d3em!a63hm!a7kFFlp80slf</a>

<a href="https://github.com/erlehmann/libglitch/tree/master/tracks">There's
a bunch more here</a>. I have a feeling there's a bug or 2 left for full glitch support

### Function

Expects a function body vs infix which expects an expression

infix: `sin(t)`

function: `return t => sin(t)`

Note thought that "function" receives `t` in seconds, not samples.

[See below](#Function)

### Postfix

Postfix in this case I guess can be described as [forth](http://en.wikipedia.org/wiki/Forth_(programming_language))
like. It works with a stack. Each command either adds things to the stack or uses what's on the stack to do something. For example

    123       // pushes 123 on the stack               stack = 123
    456       // pushes 456 on the stack               stack = 123, 456
    +         // pop the stop 2 things on the stack
              // adds them, puts the result on the
              // stack                                 stack = 569

Note the stack is only 256 elements deep. If you push 257 elements it wraps around. Similarly if you use `pick`
with a large value your pick will wrap around. The stack is neither cleared nor reset on each iteration
of your function. Some postfix based bytebeat songs take advantage of this where each iteration leaves
things on the stack for the next iteration.

#### operators

The postfix operators are

`>`, `<` ,`=`

These take the top two things from the stack, do the comparision, then push 0xFFFFFFFF if the result
is true or 0x0 if the result is false. Think of it has follows: If the TOP thing on the stack is `>`, `<`, or `=` to 
the next thing on the stack then 0xFFFFFFFF else 0x0

`drop`

removes the top thing from the stack

`dup`

duplicates the top thing on the stack.

`swap`

swaps the top 2 things on the stack

`pick`

pops the top thing from the stack and duplicates one item that many items back. In other words
if the stack is `1,2,3,4,5,6,7,3` then `pick` pops the top thing `3` and duplicates
the 3rd thing back counting from 0, which is no `4`. The stack is then `1,2,3,4,5,6,7,4`.

Another way to look at it is `dup` is the same as `0 pick`.

`put`

sets the n'th element from the top of the stack to the current top. In other words if the stack is
`1,2,3,4,5,6,7,3,100` then put will pull the top `100` and then set the `3` element back. The stack
will then be `1,2,3,4,100,6,7,3`.

`abs`, `sqrt`, `round`, `tan`, `log`, `exp`, `sin`, `cos`, `tan`, `floor`, `ceil`, `int`
`min`, `max`, `pow`

These operators all pop the top value from the stack, apply the operator, then push the result on
the stack

`/`, `+`, `-`, `*`, `%`, `>>`, `<<`, `|`, `&`, `^`, `&&`, `||`:

These operators pop the top 2 values from the stack, apply the operator, then push the result. The
order is as follows

    b = pop
    a = pop
    push(a op b)

In other words `4 2 /` is 4 divided by 2.

`~`

Pops the top of the stack, applies the binary negate to it, pushes the result.

### Function

See [Rant](#rant).

"function" means you could write code that returns a function. The simplest example
might be

```js
return function(t) {
  sin(t);
}
```

or shorter

```js
return t => sin(t);
```

The point being you can write more generic JavaScript. For example

```js
const notes = [261.62, 329.628, 391.995, 523.25, 391.995, 329.628, 261.62, 261.62, 1, 1];

function getNote(t) {
  const ndx = (t * 4 | 0) % notes.length;
  return note = notes[ndx];
}

return function(t) {
  const note = getNote(t);
  return sin(t * 10 * note);
}
```

[Example](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=1&e=3&s=8000&bb=5d00000100080100000000000000319bca19c63617c05f852678809434c0245718cc973d0784216c18766f89f97417838f624d415ce254f1adfce8a1aa0aca94da7cd23a110b8cb7c5c13d29497b74893a02e812083f504edc25c42ead4ebd79647b868b71508dbcdd834b7a07446239af435da82980ba5f7108aab703421b6143d96834ac872176794e2ba01d8152a4bae0e9e1932f4a3a4a009dd00f27902217477670ef2c0ac8cd96ddf4fe13a4c0)

But see [Rant](#rant) why this is seems kind of missing the point.

### Stereo

You can emit an array with 2 values for left and right channels. Eg.

```js
[sin(t), sin(t / 2)]
```

### Extra

Comments can be both // or /* */ style and I'd personally suggest
you use comments for your name, the song's name, etc...

There are several extra inputs available:

The mouse position is available as `mouseX` and `mouseY`

```js
sin(t * mouseX * 0.001) + cos(t * mouseY * 0.003)
```

The size of the window is available `width` and `height`

Also note, using the comma operator you can write fairly arbitrary code. [See this example](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=1&e=0&s=22000&bb=5d0000010058010000000000000017e07ce86fbd1ca9dedaaaf283d5ff76502fd7dadb76e5d882697d441ca3af61153f2f1380cbf89731ae302303c50ef1ebed677ad146c1f124dcf3cc109dd31ddd363d9d15d0d6a631f5f755297df9d98d614a051e4ed8cad8dae98b3b60d98a87f3ef147227e075cf005fc063cb9e4afe0ef1418c10607d6e7748e5c4477a20901c00ef5379b618214e7e2a2c8a538fec32de37b565c288aa49e52f2bcae7c1c9c474fcf1eb149f734180cccc153d360cb13e758ccf5d1eb9bebee221421a05b2a991f07c0b2ee2ed8ffa2ff5fc).

Putting a comment in form of 

```
// vsa: <url>
```

Will apply a [vertexshaderart](https://vertexshaderart.com) piece. [Example](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=8000&bb=5d00000100b9000000000000000017e07c86411ba2a517dacbc183b1477d3c17bd909f859f6ac588a82b934d189a40e82441616f52b3c7192116ea6be66102b438fc3d5e7ca2be7e768c34a949ce70e384f65243670976039bc9ed417d3b4d307c7506468aa5a052be90c656f55857c76626ba542034fe7d4cc6b435dee121ec730c2b0ebd730287a180702ee24e5cfb642a79cf1835917ef095b197cc235e5bee9e023e0f55f263acd5d95412fff91dde60)

Rant
----

The original bytebeat, or at least the one I saw, was fairly simple. 8bits, stack based,
few options. When I built a live JavaScript version I just thought 
"you get an expression that takes time and returns a value". **The end**.

A few obvious additions, at least to me, were floatbeat, because the Web Audio API itself
takes floats and IIRC some original C based thing that took a function expected floats.
In fact I wrote that first. I just fed an expression that returns floats
into the Web Audio API. I then manually converted a few beatbyte expressions by just
putting `(original-bytebeat-expression) / 127 - 1`.

The reason I didn't just stick with floatbeat is bytebeat expressions already
existed and wanted people to be able to use them without having to understand
how to convert, even though it's trivial.

But now I see people have added *signed bytebeat*. What is the point? Any signed
bytebeat can be turned in to regular bytebeat by just putting `+ 0x80` at the
end of your expression. The entire point of bytebeat is to be self sufficient,
to put what you need in the expression itself.

I then found a `funcbeat` in which instead of an expression you pass it a
function body. AFAICT the advantage is you can write code and declare
other functions and data vs having to squeeze everything into an expression with
commas. For example:

```js
const notes = [261.62, 329.628, 391.995, 523.25, 391.995, 329.628, 261.62, 261.62, 1, 1];

function getNote(t) {
  const ndx = (t * 4 | 0) % notes.length;
  return note = notes[ndx];
}

return function(t) {
  const note = getNote(t);
  return sin(t * 10 * note);
}
```

But again, What is the point? If you're going to write real code with no limits
then why do it this way all? [Just write code](https://jsgist.org/?src=5c0429e50839b546a38ce9dbb66c2ab3),
no need to try to cram it into a bytebeat player?

Then I found that some people had added a time divisor. For example, instead of
`t` counting in samples it can count in seconds (fractional values). But again,
what is the point? Why does this option need to exist when you can just divide
`t` by the sample rate in the expression itself?

It'd be like if someone added various options for time. `t = sample`,
`t = sample / sampleRate`, `t = sin(sammple)`, `t = sin(sample / sampleRate)`,
etc... The whole point is to **PUT THE MATH IN YOUR EXPRESSION!!!**. There is
no need to add these options 😤

&lt;/rant&gt; 😛

For more info
-------------
Check out <http://canonical.org/~kragen/bytebeat/> and be sure follow the many links.


Special thanks to:
------------------

* Paul Pridham for his [Glitch Machine iOS Bytebeat program](http://madgarden.net/apps/glitch-machine/).
* Mr.Doob for his [GLSL Sandbox](http://mrdoob.com/projects/glsl_sandbox/) where much of this code was cribbed.
* Nathan Rugg for his [LZMA-JS library](https://github.com/nmrugg/LZMA-JS).
* Darius Bacon for his [bytebeat program](https://github.com/darius/bytebeat) and for tips and examples to test it.
* All the people making awesome bytebeats!

# Library

You can use this as a library. The library provides a `ByteBeatNode` which is a WebAudio [`AudioNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode).

## Example usage:

```js
import ByteBeatNode from 'https://greggman.github.io/html5byteabeat/dist/1.x/ByteBeat.module.js';

async function start() {
  const context = new AudioContext();
  context.resume();  // needed for safari
  await ByteBeatNode.setup(context);
  byteBeatNode = new ByteBeatNode(context);
  byteBeatNode.setType(ByteBeatNode.Type.byteBeat);
  byteBeatNode.setExpressionType(ByteBeatNode.ExpressionType.infix);
  byteBeatNode.setDesiredSampleRate(8000);
  await byteBeatNode.setExpressions(['((t >> 10) & 42) * t']);
  byteBeatNode.connect(context.destination);
}
```

## Live examples:

* [Minimal ESM](https://jsgist.org/?src=668ef93e49417bf0bfafc088edf6b826)
* [Minimal UMD](https://jsgist.org/?src=b63d9187f8ad3b7ff57831bd6ccd23b3)
* [Simple visualizer](https://jsgist.org/?src=d1fb987c85cc1cff03f405ed210f04f6)
* [Visualized based on AnalyserNode](https://jsgist.org/?src=36a61aa554a6da096540c3b7fcce7c78)
* [npm](examples/npm/README.md)

## API

There's just one class `ByteBeatNode`. You must call the async function `ByteBeatNode.setup` before using the library.

* `reset()`

   re-starts the time to 0

* `isRunning(): bool`

   true or false if running. The node is considered running if it's connected.

* `async setExpressions(expressions: string[], resetToZero: bool)`

   Pass in array of 1 or 2 expressions.
   If 2 expressions it is assumed each expression is for a different channel.
   If a single expression returns an array of
   2 values that is also also assumed to
   be 2 channels. Otherwise, it's 1 channel and will be output to both left and right channels.

   Note: this function is async. You can catch expression errors with `try`/`catch`.

* `setDesiredSampleRate(rate: number)`

   Sets the sample rate for the expression
   (eg 8000, 11000, 22050, 44100, 48000)

* `getDesiredSampleRate(): number`

   Returns the previously set sample rate

* `setExpressionType(expressionType: number)`

    Sets the expression type. Valid expression types

    ```
    ByteBeatNode.ExpressionType.infix             // sin(t / 50)
    ByteBeatNode.ExpressionType.postfix           // t 50 / sin
    ByteBeatNode.ExpressionType.glitch            // see docs
    ByteBeatNode.ExpressionType.function          // return function() { sin(t / 50); }
    ```

* `getExpressionType(): number`

   Gets the expression type

* `setType(type: number)`

   Sets the output type.
   
   Valid types

   ```
   ByteBeatNode.Type.byteBeat          // 0 <-> 255
   ByteBeatNode.Type.floatBeat         // -1.0 <-> +1.0
   ByteBeatNode.Type.signedByteBeat    // -128 <-> 127
   ```
* `getType(): number`

   Gets the type

* `getNumChannels(): number`

   Returns the number of channels output
   by the current expression.

* `async getSamplesForTimeRange(start: number, end: number: numSamples: number, context, stack, channel: number)`

  Gets a -1 to +1 from the current expression for the given time (time is the `t` value in your expression)

  This function is useful for visualizers.
  
  To make a stack call `byteBeat.createStack()`. To create a context call
  `byteBeat.createContext`.
  A stack is used for postfix expressions.
  [See docs on postfix](#postfix). The context
  is used for keeping expressions state for
  expressions that try hacks to keep state around like if they build a large note table and assign it to `window`. It won't
  actually be assigned to `window`, it will
  be assigned to the context (in theory)

## Development / running locally

```
git clone https://github.com/greggman/html5bytebeat.git
cd html5bytebeat
npm i
npm start
```

The instructions above assume you have node.js installed. If not, if you're
on windows use [nvm-windows](https://github.com/coreybutler/nvm-windows),
or if you're on mac/linux use [nvm](https://github.com/nvm-sh/nvm).

Or you can just use the installers at [nodejs.org](https://nodejs.org) though
I'd recommend nvm and nvm-windows personally as once you get into node dev
you'll likely need different versions for different projects.

# License

[MIT](LICENSE.md)
