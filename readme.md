#about 

Fast per-pixel image manipulation with Canvas / WebGL. 

Instead of manipulating the 8 bit array (separate R, G, B, A components), we modify a Int32Array which is backed by the ImageData's Uint8ClampedArray buffer. If unsupported, we fall back to 8bit modification. The concept is discussed here:  
https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/

The code looks like this:

```javascript
//create an empty ImageData
var imageData = ctx.createImageData(0, 0, width, height);

//make a new ImageBuffer for direct manipulation of that ImageData
var buffer = new ImageBuffer(imageData);

//do your per-piel operations with setPixel and getPixel
//or act directly on buffer.uint8
for (var i=0; i < width * height; i++) {
	var r = 0,
		g = ( i/(width*height) ) * 255, //simple linear gradient
		b = 0,
		a = 0;

	// set the pixel, using original alpha
	buffer.setPixel(i, r, g, b, a);
}

//place the data onto the canvas
ctx.putImageData(imageData, 0, 0);
```

The `setPixel` and `getPixel` methods will handle endianness for you, when using the more performant 32-bit approach. ImageBuffer also includes a few other useful functions, like creating a new Image object from an ImageData source. 

## docs & demos

- [Documentation here](http://mattdesl.github.io/imagebuffer/docs/classes/ImageBuffer.html)
- Demos:
	- [Simple Procedural Image](http://mattdesl.github.io/imagebuffer/demos/simple.html)
	- [Grayscale Image Processing](http://mattdesl.github.io/imagebuffer/demos/grayscale.html)
	- [Cache Tinted Images](http://mattdesl.github.io/imagebuffer/demos/tint.html)
	- [WebGL example](http://mattdesl.github.io/imagebuffer/demos/webgl.html)

## using with NodeJS

Install:

```
npm install imagebuffer
```

Require it in your client-side code:

```
var ImageBuffer = require('imagebuffer');
```

## using without NodeJS

You can grab the minified UMD version inside the `build` folder.

## using with WebGL

You need to wrap the `Uint8ClampedArray` as a `Uint8Array`, like so:

```
var type = gl.UNSIGNED_BYTE;
var data = new Uint8Array(buffer.uint8);
```

# building

To browserify, minify, and generate docs, run:

```
npm run-script build
```

