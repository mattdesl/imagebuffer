# about

klimt is a small library for image pixel manipulation in 2D canvas or WebGL.

# features

- uses array buffer views for altering pixels: 
https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/
- fallback to regular image adjustments
- 




var img = new ImageBuffer(250, 250);

//an Int32Array of ARGB-packd integers for little-endian machines
// or RGBA-packed for big-endian
var pixels = img.pixels;
var littleEndian = ImageBuffer.LITTLE_ENDIAN;

for ( ... )
	manipulate the pixels array...




//place pixels into a WebGL texture:
var tex = new Texture(0, 0, width, height, )