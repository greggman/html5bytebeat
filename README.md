HTML5 Bytebeat
==============

Bytebeat is the name of type of music made from math.

You provide a function who's only input is time *t* and from that write some code generate a sound.

In this particular case *t* is 8000hz timer that counts up. For example

    Math.sin(t)

Most bytebeat is limited to 8 byte values but that limitation is removed here.
In fact you need to provide floating point values from -1 to +1.
If you want to do traditional bytebeat just surround your function with

    (yourfunction) & 255 / 127 - 1

Functions are just plain JavaScript.

[Click here to try your hand at Bytebeat](http://greggman.github.com/html5bytebeat/html5bytebeat.html).

For more info on Bytebeat check out <http://canonical.org/~kragen/bytebeat/>

Special thanks to:

* Paul Pridham for his [Glitch Machine iOS Bytebeat program](http://madgarden.net/apps/glitch-machine/).
* Mr.Doob for his [GLSL Sandbox](http://mrdoob.com/projects/glsl_sandbox/) where much of this code was cribbed.
* Nathan Rugg for his [LZMA-JS library](https://github.com/nmrugg/LZMA-JS).


