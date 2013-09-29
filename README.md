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

* http://goo.gl/KABRP glitch machine
* http://goo.gl/V5Mrl
* http://goo.gl/qrAkf
* http://goo.gl/w3ugG
* http://goo.gl/NRwRT
* http://goo.gl/ObMwR
* http://goo.gl/Arptn
* http://goo.gl/pD3lx kb 2011-10-04
* http://goo.gl/MuQWe ryg 2011-10-10
* http://goo.gl/rFNPL blueberry 2011-10-05
* http://goo.gl/lQyDd mu6k
* http://goo.gl/6Uz0d mix 2 channels
* http://goo.gl/6cC5gK quiddit
* http://goo.gl/RG8IEk rythymgrind
* http://goo.gl/QRjRf8 robot toothbrush
* http://goo.gl/Vk6WPK number machine
* http://goo.gl/4dOPIJ starlost
* http://goo.gl/VHm5c7 guitarhead

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

**Glitch** is a format used by glitch machine for sharing. Examples

    glitch_machine!a10k4h1f!aAk5h2ff!aCk3hg!ad3e!p!9fm!a4kl13f!aCk7Fhn
    octo!a2k14had!a2000he!a8!a11k3h1fde!m!aEk7Fhn!20g

These can be prefixed with glitch:. For example

    glitch:rolling!a9da4kl!a5da7kl!a3da400el!mm1g

<a href="https://github.com/erlehmann/libglitch/tree/master/tracks">There's
a bunch more here</a>. I have a feeling there's a bug or 2 left for full glitch support


### Extra

Comments can be both // or /* */ style

There are several extra inputs available

The mouse position is available as **mouseX** and **mouseY**

    sin(t * mouseX * 0.001) + cos(t * mouseY * 0.003)

The size of the window is available **width** and **height**

The orientation of a device may be available as **tiltX** and **tiltY**.

    (sin(t * 0.1 * tiltX) + cos(t * tiltY * 0.07)) * 0.5

Also note, using the comma operator you can write fairly arbitrary code.

    http://goo.gl/IZVBS

For more info
-------------
Check out <http://canonical.org/~kragen/bytebeat/> and be sure follow the many links.


Special thanks to:
------------------

* Paul Pridham for his [Glitch Machine iOS Bytebeat program](http://madgarden.net/apps/glitch-machine/).
* Mr.Doob for his [GLSL Sandbox](http://mrdoob.com/projects/glsl_sandbox/) where much of this code was cribbed.
* Nathan Rugg for his [LZMA-JS library](https://github.com/nmrugg/LZMA-JS).
* Darius Bacon for his [bytebeat program](https://github.com/darius/bytebeat) and for tips and examples to test it.

