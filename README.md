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

Instructions
------------

### Modes

There 2 modes

* bytebeat: Your expression is expected to generate byte values from 0 to 255
* floatbeat: Your expression is expected to generate float values from -1.0 to 1.0

### Expression Types
* Infix: Standard expressions eg. "(t * 2) / 4"
* Postfix(rpn): Reverse Polish Notation eg "t 2 * 4 /"
* glitch: glitch format or glitch urls.

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

* <a href="http://goo.gl/5hLhys">42_forever!a13880fa400he!a5kma6kn40g!aCk28!a12k1ld!2fladm!43n</a>
* <a href="http://goo.gl/xcvE2x">pipe_symphony!aEk5h5f!a11k2h!a9k3hdf!aDk4hg!ad4e!p5fm!a11k2h1rg!a5kdm</a>

These can be prefixed with "glitch://". For example

* <a href="http://goo.gl/0PfWZ5">glitch://sadglitch!4.4.9.8.9.6.4.2!aoCk8hq!ad2d!aFk3h1fe!p5d3em!a63hm!a7kFFlp80slf</a>

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

Note the stack is only 256 elements deep. If you push 257 elements it wraps around. Similary if you use `pick`
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

### Extra

Comments can be both // or /* */ style

There are several extra inputs available

The mouse position is available as `mouseX` and `mouseY`

    sin(t * mouseX * 0.001) + cos(t * mouseY * 0.003)

The size of the window is available `width` and `height`

The orientation of a device may be available as `tiltX` and `tiltY`.

    (sin(t * 0.1 * tiltX) + cos(t * tiltY * 0.07)) * 0.5

Also note, using the comma operator you can write fairly arbitrary code. [See this example](https://greggman.com/downloads/examples/html5bytebeat/html5bytebeat.html#t=1&e=0&s=22000&bb=5d0000010058010000000000000017e07ce86fbd1ca9dedaaaf283d5ff76502fd7dadb76e5d882697d441ca3af61153f2f1380cbf89731ae302303c50ef1ebed677ad146c1f124dcf3cc109dd31ddd363d9d15d0d6a631f5f755297df9d98d614a051e4ed8cad8dae98b3b60d98a87f3ef147227e075cf005fc063cb9e4afe0ef1418c10607d6e7748e5c4477a20901c00ef5379b618214e7e2a2c8a538fec32de37b565c288aa49e52f2bcae7c1c9c474fcf1eb149f734180cccc153d360cb13e758ccf5d1eb9bebee221421a05b2a991f07c0b2ee2ed8ffa2ff5fc).

For more info
-------------
Check out <http://canonical.org/~kragen/bytebeat/> and be sure follow the many links.


Special thanks to:
------------------

* Paul Pridham for his [Glitch Machine iOS Bytebeat program](http://madgarden.net/apps/glitch-machine/).
* Mr.Doob for his [GLSL Sandbox](http://mrdoob.com/projects/glsl_sandbox/) where much of this code was cribbed.
* Nathan Rugg for his [LZMA-JS library](https://github.com/nmrugg/LZMA-JS).
* Darius Bacon for his [bytebeat program](https://github.com/darius/bytebeat) and for tips and examples to test it.

