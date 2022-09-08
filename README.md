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

Here are a few sample songs

* [glitch machine](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&bb=5d000001006100000000000000003a08022391d5293f69c2e49ecf68456c28c2632528daade8252cb47f5549995f49189b4bbd1728c98726b7aa31fd79883bd31e5b84a9d1ec5dfea5819b1622e4be7fffef360000)
* [octo](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d0000010066000000000000000017e07cde6339e0d43ac5c893398f1248ab39548552ed58970f49a64512cc37df9e3c61c35eaa6f82e0ab6ccd8e341bfc092d9b4bf845ae31c3de42033f580a41a23b85d27a3f7b3334e52be0e1ad27ef557c14dadbdd7a411ff9725c00)
* [seargeant](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d0000010073000000000000000017e07ce6652f9d4b645c580030bd8b51c02e072734c84131353636dd95d931f1babb013372da101da6ec412efa961281b8b9570fa7d5dc629c28f194655f7667a88160c980522139d112b7317aea428ebe22585359e4ef3e0cea13ffffed7f1000)
* [splatterpiller](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d00000100bc000000000000000017e07ce6703536a0a9b7a9c7528c2bcfd885ad7637de381038d57f733ab069776196b7fdc6b90a0c603cfd095da55ed939359931aa9409b5be8731870bba3bd6bdf051e3d0d4972f7cb32da05a272dcae8ae6ccaed1eb5fa64f5b56a6243e4da913c1be058a5d344268dbaaba51d787014ba582c5e0f83460018a558fab286c0f6bf5ffa0ce6fff80322a0)
* [????1](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#bb=5d000001006c000000000000000014607f200cf02c10859fa29bab83b7bfd3d971fce17ae82431f48e5c30ffa810f8407eccaa269f58309b3963ed0e7a933d29c13d2fc0c01a87072ab06375b7551f9413c6829b4610e2e906d43fff9119a000)
* [????2](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#bb=5d0000010050000000000000000014607f0548b551c1b62a8220ae07ea46932b502f14a8dc620a80fb89f511e24c54f3c5c3cd43183a90f3368a39ae33f47f893997d47fff990e4000)
* [????3](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#bb=5d0000010051000000000000000014607f0548b551c157368220ae33b7521c02062ccfb05146dd9dc16f9de48b99c7e0f6e8ce9a87db9e9e3b028071a243f7fa44fb07ffff145a0000)
* [????4](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#bb=5d0000010054000000000000000014607f0548b47658c2a13108820ecc7b3c74fc26aa0cac65e9b72c98c5804bdf34bac6470786b85589dead40a5fcb2ecf3808db408fffff2f5bc00)
* [????5](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#bb=5d0000010050000000000000000014607f200cf0301003af924c235c7da615464627260d9fe0d39666b6f0dc938d67b07d4fb08517ca3d4348f4b4e871e36c3fffe052c800)
* [????6](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#bb=5d0000010082000000000000000014607f0a27aa1cbd96e98485a7f4b748eec3f24344f211b527091c54c61f060385ec8a3c39af87d35ec4999400a94ac4e62b660db670afd46ff8ccdaa31c71049f8d1d16627bac28e6c6ad775edff8acfb80)
* [kb 2011-10-04](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#bb=5d0000010082000000000000000014607f0a27aa1cbd96e98485a7f4b748eec3f24344f211b527091c54c61f060385ec8a3c39af87d35ec4999400a94ac4e62b660db670afd46ff8ccdaa31c71049f8d1d16627bac28e6c6ad775edff8acfb80)
* [ryg 2011-10-10](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=44100&bb=5d0000010063000000000000000017e07ce4793292a76e4fd26ba50e5eee5a196d720febb0554aeaa3a3dee3320db7331422f21ea7f3772914282393e89a04de943c597fe8c54a71b727ba43b0c1975d6b44c2a4b609e404ba4592ebe3381713aefff9a4e800)
* [blueberry 2011-10-05](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=11025&bb=5d0000010035000000000000000017e07cc46c3a6179747bd0ec3bf1ac776c2f3e5ebe675e85411fda896a84a5a0523ff5e18ee253b149558ecf1e1a101000ffe56d0000)
* [mu6k](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=32000&bb=5d000001005e000000000000000017e07cda751a3bd8cfa27c450fc39b687c344597ad0e4c7fa609bdc9cafbb059a6240bdafbbee3c47dc9b0f959e32f5ee20473ec417c5ae0249b65e56454ea74f95feda981bbf0879475d74357b15f60dab729445f5aecd3ffffbbcd6000)
* [mix 2 channels](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=11000&bb=5d000001007c000000000000000017e07ce46131f1cf7335542e8ec6a31693598c133f33fd51cc3e4397a170e79bcb2766aa54e49380aff68ddb08ad8b83a4ec485ed1eafb62f3d1ce9e884a523ae28021750c891f939237a72ebbbec3f9b255a886a10508e1ea9623cead9a03d6f488aca2e953416df49cffd0fd5000)
* [quiddit](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d0000010083000000000000000017e07ce27533ac71a17cba881a50ef0c03e549f2e82de56cd2e363eafd3b398f0326098a42f6c198d4e178008f3c0dce00208c7e14884fd757d6f881673ae0c67ac24f4702aa0d877c6060e3af9ba05fffdd0494b92047644aed772f1acada07479754e3d104c629d010f20b23ffad6d0000)
* [rythymgrind](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d0000010086000000000000000017e07ce4683c75126a2b69f22f72cfe3a6201cf8a286ef4e6d28fa72db9a454fab4f738a675303359ece93a710f49da1440475255393f50c2835d18fadca9a583501560f967ba4f2bcf4cbf1f56131a5ee5e6b56d64ac190fabb4032f2f4121bd17934a9549e0906b045279218f086b40e0ceafedd42c0)
* [robot toothbrush](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d000001004a000000000000000017e07ce46f301ef7813193348c1fea4ca8a23d0a17e311824518d2f2ee62aa23b9a2cc480bcd9b72931d294f8a1f8d92a06889acc52affebd04c2a5df20576dbc46e1db01a1a043affe8327000)
* [number machine](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d0000010055000000000000000017e07cdc7535baa6c57b73bf3138c0f1471c6ace29f1b992bcae077e7af068c83d93258ca4ecd4c66ccd253f4dbc3d547e56cf5be5918755f67eb4c085b79712a12e0807ddb534a39d5bbbd0628f5f2a4a46ebffe624b000)
* [starlost](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d0000010037000000000000000017e07ce6742f92b60556281edd280c7a480eab7695c53fe5f131568feffc61ccaff65a955210eaf30c7048d724fcc4670c20f6a44bfb8b29ffffe7be2000)
* [guitarhead](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=1&s=8000&bb=5d0000010083000000000000000017e07cce7533b13f0fcbd97a4d19b9cd44b64bbbb1c1b6912008c98aba649a77e32b58031b00e447064f126fbe28b09f0257a8c92a67dae22f594834f569c4267a3270cac96658244b194621524f91ba79e34a4378fe1c74044aa2b5c442cb27c51abc34c044c973bb74e585fe1f95f7bf3dfff1d6a800)
* [347 BEATSTEP INC. (by mega9man)](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=11000&bb=5d000001000d010000000000000017e07c6636e8b6400a429e20e00c183a14530fe169ba00b4bd6736cff0804b596ec63c76a8b9c228a643868128d2ae09a5f8f41199a25ee7bae2ccf0d06c2dd8338a32b7947cd88d26af71515db2fd6e67505f7e82dc7bc54e4e6d768c41ebc04b52dffeeff1ba72af88f2e6f31611250401b3e7320e66b23b248fb0d884def0eff45bd4de4e29b1ab562ae3cedccb50f9db435658b3fa203936f2499247d6a5fff97635c3) [from](https://battleofthebits.org/arena/Entry/347+BEATSTEP+INC./20403/)
* [Fortnite Default Dance in Bytebeat (by raphaelgoulart)](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=44100&bb=5d0000010092010000000000000017e07cc4790f98839bdc88e68c4127e41df8219276962379c302a3bf60a80e8f76a400d3995407426d7d8514f8602702aa90b9008e486d156f57b88d47dad1e0d6663d3439861ab1d7b369566e119875ceb1ac980c97ee5562b8a4a76e8ba5ccbd59eee9e046a23c95187ea83c00b15b0c0d666b3952c4a725bd63148df654a125db78da496f46558d86c6f35d0faaf24c5c84618f9f824820765f82168811403eaa1bb11cb55effe88e940a54bee0f6e1ef065005a6c5f7a5d0685f4929ef384c23f212119b20a5eeb07f2740542853a4c03e0038ca57ab298a9635cea0fef354c2d8) [from](https://www.reddit.com/r/bytebeat/comments/b48xrx/fortnite_default_dance_in_bytebeat/)
* [arpeggiator fun](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=44100&bb=5d00000100c2010000000000000017e07cc27237494e9c5a326ea9df5e34ac56d0e7ef73480d057a604acdb953ec4f724a606853a6db9668fc4d7757700817f92eb27b72357517af2a2953a29736580c16f66d692d785e9eacc02283b9a8a6a386856b2a28635ad1d6bf623122e105d5660135a9d2b0ddf43f6a47770f321ede3f2818bf2901360dd5c2d044d634209a6598a754e2be3763a164a991d6ca6d5d60efca2d9b9cb5bdc9bc0621f9bf3ba38e3a0ac7eda3e0b1474e79ac90b022e32cce48749fdff7b8e36805569f9689a74eeec70139844150f7b92ae4528306d30f268b1ce5bb8d3018f4b429d92b684f9f11c1ae7a497838b60475e051898024e9006996856dd521b1830e46e38b368d40e2a93c07045424250876b80054dfafb8ccb390e1804176c2cd5ed298a022e91ada6be66b5ff028928026c40caa1ccad1160a61c8c6fbfe14ea98fe4f72063597dadce1d85056ac480eff981eeefc4e4e3169a5fc553036ce043c61d467b3df4b79c8ff37523a00) [from](https://www.reddit.com/r/bytebeat/comments/fjsa1y/arpeggiator_fun/)
* [remix of "The time is running out!" (remix of The time is running out! by SthephanShi)](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=0&e=0&s=11000&bb=5d00000100e3000000000000000017e07ce4653639846bd3ec801e25c23859a08936ae4663207affee39c479e6101551cd05a0fc07f07b520a42e3cb771c27d1e1227ae94223ce8c018fcc130255b9a75fba1d3125285e3cc9d3222ef9a72e040baf6c42409e59f3b3a8f9821c4ff757920017112ad27adb3649fe1b807c03a64bb2bbf9195fba14b60a07862fd28d5b90ea85d4eb01c19e75cdc089f688b88ee72cc4d74ec01761264aac0c76cf32e885745a679f3298245bc75529fbf5b480) [from](https://www.reddit.com/r/bytebeat/comments/qf9meb/remix_of_the_time_is_running_out_by_stephanshi/)


Instructions
------------

### Modes

There 2 modes

* bytebeat: Your expression is expected to generate byte values from 0 to 255
* floatbeat: Your expression is expected to generate float values from -1.0 to 1.0

### Expression Types
* Infix: Standard expressions eg. "`(t * 2) / 4`"
* Postfix(rpn): Reverse Polish Notation eg "`t 2 * 4 /`"
* glitch: glitch format or glitch urls.
* function: Return a function. eg. "`t => (t * 2) / 4`"

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

### Funcbeat

See [#Rant]

Funcbeat means you could write code that returns a function. The simplest example
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

But see [Rant](#Rant) why this is seems kind of missing the point.

### Stereo

You can emit an array with 2 values for left and right channels. Eg.

```
[sin(t), sin(t / 2)]
```

### Extra

Comments can be both // or /* */ style and I'd personally suggest
you use comments for your name, the song's name, etc...

There are several extra inputs available

The mouse position is available as `mouseX` and `mouseY`

    sin(t * mouseX * 0.001) + cos(t * mouseY * 0.003)

The size of the window is available `width` and `height`

The orientation of a device may be available as `tiltX` and `tiltY`.

    (sin(t * 0.1 * tiltX) + cos(t * tiltY * 0.07)) * 0.5

Also note, using the comma operator you can write fairly arbitrary code. [See this example](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=1&e=0&s=22000&bb=5d0000010058010000000000000017e07ce86fbd1ca9dedaaaf283d5ff76502fd7dadb76e5d882697d441ca3af61153f2f1380cbf89731ae302303c50ef1ebed677ad146c1f124dcf3cc109dd31ddd363d9d15d0d6a631f5f755297df9d98d614a051e4ed8cad8dae98b3b60d98a87f3ef147227e075cf005fc063cb9e4afe0ef1418c10607d6e7748e5c4477a20901c00ef5379b618214e7e2a2c8a538fec32de37b565c288aa49e52f2bcae7c1c9c474fcf1eb149f734180cccc153d360cb13e758ccf5d1eb9bebee221421a05b2a991f07c0b2ee2ed8ffa2ff5fc).

Rant
----

The original bytebeat, or at least the one I saw, was fairly simple. 8bits, stack based,
few options. When I built a live JavaScript version I just thought 
"you get an expression that takes time and returns a value". **The end**.

A few obvious additions, at least to me, were floatbeat, because the Web Audio API itself
takes floats. In fact I wrote that first. I just feed an expression that returns floats
into the Web Audio API. I then manually converted a few beatbyte expressions by just
putting `(original-bytebeat-exprssion) / 255 * 2 - 1`. The reason I didn't just stick
with floatbeat is bytebeat expressions already existed and wanted people to be able to
use them without having to understand how to convert, even though it's trivial.

But now I see people have added *signed bytebeat*. WTF is the point? Any signed bytebeat
can be turned in to regular bytebeat by just putting `+ 0x80` at the end of your expression.
The entire point of bytebeat is to be self sufficient, to put what you need in the expression
itself.

I then found a `funcbeat` in which instead of an expression you pass it a function body.
The advantage is you can write actual code and declare other functions and data. For example:

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

But again, WTF is the point? If you're going to write real code with no limits then why
do it this way all? Just write code, no need to try to cram it into a bytebeat player.

Then I found that some people had added a time divisor. For example, instead
of `t` counting in samples it can count in seconds (fractional values). But again,
WTF is the point? Why does this option need to exist when you can just divide `t`
by the sample rate in the expression itself?

It'd be like if someone added various options for time. `t = sample`, `t = sample / sampleRate`, `t = sin(sammple)`, `t = sin(sample / sampleRate)` etc. The whole
point is to **PUT THE MATH IN YOUR EXPRESSION!!!**. There's no need to add these
options 😤

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

