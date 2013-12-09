#about 

A small utility for per-pixel image manipulation with Canvas / WebGL. 

It uses an Int32Array view to directly modify the Uint8ClampedArray buffer of ImageData. If unsupported, it falls back to standard 8-bit modifications. The basic idea is here:
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
		g = ( i/(width*height) ) * 256, //simple linear gradient
		b = 0,
		a = 0;

	// set the pixel, using original alpha
	buffer.setPixel(i, r, g, b, a);
}

//place the data onto the canvas
ctx.putImageData(imageData, 0, 0);
```

The `setPixel` and `getPixel` methods will handle endianness for you, when using the more performant 32-bit approach. 

## using with NodeJS

You can `npm install mattdesl/imagebuffer` until there is a stable version on npm. Then it looks like:

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

