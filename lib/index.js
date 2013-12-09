function isLittleEndian() {
    //could use a more robust check here ....
    var a = new ArrayBuffer(4);
    var b = new Uint8Array(a);
    var c = new Uint32Array(a);
    b[0] = 0xa1;
    b[1] = 0xb2;
    b[2] = 0xc3;
    b[3] = 0xd4;
    if(c[0] == 0xd4c3b2a1) 
        return true;
    if(c[0] == 0xa1b2c3d4) 
        return false;
    else {
        //Could not determine endianness
        return null;
    }              
}

//test to see if ImageData uses 
//CanvasPixelArray or Uint8ClampedArray 
function isUint8ClampedImageData() {
    if (typeof Uint8ClampedArray === "undefined")
        return false;
    var elem = document.createElement('canvas');
    var ctx = elem.getContext('2d');
    if (!ctx) //bail out early..
        return false;
    var image = ctx.createImageData(1, 1);
    return image.data instanceof Uint8ClampedArray;
}

//null means 'could not detect endianness'
var LITTLE_ENDIAN = isLittleEndian();

//determine our capabilities
var SUPPORTS_32BIT = 
            typeof ArrayBuffer !== "undefined"
            && typeof Uint8ClampedArray !== "undefined"
            && typeof Int32Array !== "undefined"
            && LITTLE_ENDIAN !== null
            && isUint8ClampedImageData();

/**
 * An ImageBuffer is a simple array of pixels that make up an image.
 * We attempt to use Int32Array for a performance boost, but if
 * it isn't supported it will fall back to simple 8-bit manipulation.
 *
 * To use; construct a new ImageBuffer with the specified dimensions, and modify
 * its pixels with either setColor/getColor or the static setPixel/getPixel
 * methods. Then, you can use the buffer.apply(imageData) to apply the changes to
 * a shared ImageData object.
 *
 * If you pass an ImageData object to the constructor, the pixel modifications will
 * be "direct" and there will be no need to call apply() (in fact -- apply will have
 * no effect if called when "direct" modification is true).
 *
 * You can also cache the image for later use by calling createImage(). Note that
 * this is a very expensive operation which should be used wisely.
 *
 * @class  ImageBuffer
 * @constructor
 * @param  {Number} width      the width of the image
 * @param  {Number} height     the height of the image
 * @param  {ImageData} imageData optional imageData for 'direct' modification of pixels
 */
var ImageBuffer = function(width, height, imageData) {
    if ((width !== 0 && !width) || (height !== 0 && !height))
        throw new Error("width and height must be defined for ImageBuffer");

    this.pixels = null;
    this.direct = false;
    this.width = width;
    this.height = height;
    this.uint8 = null;

    this.imageData = imageData;

    //If an ImageData is provided, we will try to manipulate its array directly.
    if (imageData) {
        this.direct = true;

        //we can do direct manipulation
        if (SUPPORTS_32BIT) {
            this.uint8 = imageData.data;
            this.pixels = new Int32Array(this.uint8.buffer);
        } 
        //CanvasPixelArray + 8bit data... :(
        else {
            this.pixels = this.uint8 = imageData.data;
        }
    } else {
        //use a separate buffer
        if (SUPPORTS_32BIT) {
            this.uint8 = new Uint8ClampedArray(width * height * ImageBuffer.NUM_COMPONENTS);
            this.pixels = new Int32Array(this.uint8.buffer);
        }
        //assume no typed array support, use a simple array..
        else {
            this.pixels = this.uint8 = new Array(width * height * ImageBuffer.NUM_COMPONENTS);
        }
    }
};

ImageBuffer.prototype.constructor = ImageBuffer;

/**
 * This is a utility function to set the color at the specified X and Y 
 * position (from top left). For performance-critical loops, you may want to use
 * ImageBuffer.setPixel and ImageBuffer.getPixel instead.
 * 
 * @param {Number} x    the x position to modify
 * @param {Number} y    the y position to modify
 * @param {Number} r the red byte, 0-255
 * @param {Number} g the green byte, 0-255
 * @param {Number} b the blue byte, 0-255
 * @param {Number} a the alpha byte, 0-255
 */
ImageBuffer.prototype.setColor = function(x, y, r, g, b, a) {
    var i = ~~(x + (y * this.width));
    ImageBuffer.setPixel(this.pixels, i, r, g, b, a);
};

/**
 * This is a utility function to set the color at the specified X and Y 
 * position (from top left). For performance-critical loops, you may want to use
 * ImageBuffer.setPixel and ImageBuffer.getPixel instead.
 * 
 * @param {Number} x    the x position to modify
 * @param {Number} y    the y position to modify
 * @param {Number} out  the color object with `r, g, b, a` properties, or null
 * @return {Object} a color representing the pixel at that location
 */
ImageBuffer.prototype.getColor = function(x, y, out) {
    var i = ~~(x + (y * this.width));
    return ImageBuffer.getPixel(this.pixels, i, out);
};

/**
 * Creates a new Image object from this ImageBuffer.
 * @param  {[type]} context [description]
 * @return {[type]}         [description]
 */
ImageBuffer.prototype.createImage = function(context) {
    var canvas;

    if (!context) { //creates a new canvas element
        canvas = document.createElement("canvas");
        context = canvas.getContext("2d");
    } else {
        canvas = context.canvas; //context's back-reference
    }   

    if (typeof canvas.toDataURL !== "function")
        throw new Error("Canvas.toDataURL is not supported");

    canvas.width = this.width;
    canvas.height = this.height;

    var imageData = this.imageData;

    //if we need to first apply the image.... do so here:
    if (!this.direct || !this.imageData) {
        imageData = context.createImageData(this.width, this.height);
        this.apply(imageData);
    }

    //put the data onto the context
    context.putImageData(imageData, 0, 0);  

    //create a new image object
    var img = new Image();
    img.src = canvas.toDataURL.apply(canvas, Array.prototype.slice.call(arguments, 1));

    //we can only hope the GC will get rid of these quickly !
    imageData = null;
    context   = null;
    canvas    = null;
    
    return img;
};

/**
 * Applies this buffer's pixels to an ImageData object. If
 * the supplied ImageData is strictly equal to this buffer's
 * ImageData, and we are modifying pixels directly, then this call does
 * nothing. 
 *
 * You can provide another ImageBuffer object, which essentially copies
 * this buffer's pixels to the specified ImageBuffer. If the specified ImageBuffer
 * is "directly" modifying its own ImageData's pixels, then it should be updated
 * immediately. 
 * 
 * @param  {ImageData|ImageBuffer} imageData the image data or ImageBuffer
 */
ImageBuffer.prototype.apply = function(imageData) {
    if (this.imageData === imageData && this.direct) {
        return;
    }

    if (SUPPORTS_32BIT) {
        //update the other ImageBuffer with this buffer's pixels
        if (imageData instanceof ImageBuffer) {
            imageData.pixels.set(this.pixels);
        }
        //it must be an ImageData object.. update that
        else {
            imageData.data.set(this.uint8);
        }
    }
    //No support for typed arrays..
    //can't assume that set(otherArray) works :( 
    else {
        var data = imageData instanceof ImageBuffer 
                    ? imageData.pixels : imageData.data;
        if (!data)
            throw new Error("imageData must be an ImageBuffer or Canvas ImageData object");

        var pixels = this.pixels;
        if (data.length !== pixels.length)
            throw new Error("the image data for apply() must have the same dimensions");
        
        //straight copy
        for (var i=0; i<pixels.length; i++) {
            data[i] = pixels[i];
        }
    } 
};

ImageBuffer.NUM_COMPONENTS = 4;

/**
 * Will be `true` if this context supports 32bit pixel
 * maipulation using array buffer views.
 * 
 * @attribute SUPPORTS_32BIT
 * @readOnly
 * @static
 * @final
 * @type {Boolean} 
 */
ImageBuffer.SUPPORTS_32BIT = SUPPORTS_32BIT;

/**
 * Will be `true` if little endianness was detected,
 * or `false` if big endian was detected. If we could
 * not detect the endianness (e.g. typed arrays not
 * available, spec not implemented correctly), then
 * this value will be null.
 *
 * @attribute LITTLE_ENDIAN
 * @readOnly
 * @static
 * @final
 * @type {Boolean|null} 
 */
ImageBuffer.LITTLE_ENDIAN = LITTLE_ENDIAN;

/**
 * Sets the pixel at the given index of the ImageBuffer's "data" array,
 * which might be a Int32Array (modern browsers) or CanvasPixelArray (fallback),
 * depending on the context's capabilities. Also takes endianness into account.
 *
 * @method  setPixel
 * @static
 * @param {Int32Array|CanvasPixelArray} pixels the pixels data from ImageBuffer
 * @param {Number} index the offset in the data to manipulate
 * @param {Number} r the red byte, 0-255
 * @param {Number} g the green byte, 0-255
 * @param {Number} b the blue byte, 0-255
 * @param {Number} a the alpha byte, 0-255
 */


/**
 * Gets the pixel at the given index of the ImageBuffer's "data" array,
 * which might be a Int32Array (modern browsers) or CanvasPixelArray (fallback),
 * depending on the context's capabilities. Also takes endianness into account.
 *
 * The returned value is an object containing the color components as bytes (0-255)
 * in `r, g, b, a`. If `out` is specified, it will use that instead to reduce object creation.
 *
 * @method  getPixel
 * @static
 * @param {Int32Array|CanvasPixelArray} pixels the pixels data from ImageBuffer
 * @param {Number} index the offset in the data to grab the color
 * @param {Number} out  the color object with `r, g, b, a` properties, or null
 * @return {Object} a color representing the pixel at that location
 */


if (SUPPORTS_32BIT) {
    if (LITTLE_ENDIAN) {
        ImageBuffer.setPixel = function(pixels, index, r, g, b, a) {
            pixels[index] = (a << 24) | (b << 16) | (g <<  8) | r;
        };
    } else {
        ImageBuffer.setPixel = function(pixels, index, r, g, b, a) {
            pixels[index] = (r << 24) | (g << 16) | (b <<  8) | a;
        };
    }

    ImageBuffer.getPixel = function(pixels, index, out) {
        return ImageBuffer.unpackRGBA(pixels[index], out);
    };
} else {
    ImageBuffer.setPixel = function(pixels, index, r, g, b, a) {
        index *= 4;
        pixels[index] = r;
        pixels[++index] = g;
        pixels[++index] = b;
        pixels[++index] = a;
    };

    ImageBuffer.getPixel = function(pixels, index, out) {
        index *= 4;
        if (!out)
            out = {r:0, g:0, b:0, a:0};
        out.r = pixels[index];
        out.g = pixels[++index];
        out.b = pixels[++index];
        out.a = pixels[++index];
        return out;
    };
}


/**
 * Packs the r, g, b, a components into a single integer, for use with
 * Int32Array. If LITTLE_ENDIAN, then ABGR order is used. Otherwise,
 * RGBA order is used.
 *
 * @method  packRGBA
 * @static
 * @param {Number} r the red byte, 0-255
 * @param {Number} g the green byte, 0-255
 * @param {Number} b the blue byte, 0-255
 * @param {Number} a the alpha byte, 0-255
 * @return {Number} the packed color
 */

/**
 * Unpacks the r, g, b, a components into the specified color object, or a new
 * object, for use with Int32Array. If LITTLE_ENDIAN, then ABGR order is used when 
 * unpacking, otherwise, RGBA order is used. The resulting color object has the
 * `r, g, b, a` properties which are unrelated to endianness.
 * 
 * @method  unpackRGBA
 * @static
 * @param {Number} rgba the integer, packed in endian order by packRGBA
 * @param {Number} out  the color object with `r, g, b, a` properties, or null
 * @return {Object} a color representing the pixel at that location
 */
if (LITTLE_ENDIAN) {
    ImageBuffer.packRGBA = function(r, g, b, a) {
        return (a << 24) | (b << 16) | (g <<  8) | r;
    };
    ImageBuffer.unpackRGBA = function(rgba, out) {
        if (!out)
            out = {r:0, g:0, b:0, a:0};
        out.a = ((rgba & 0xff000000) >>> 24);
        out.b = ((rgba & 0x00ff0000) >>> 16);
        out.g = ((rgba & 0x0000ff00) >>> 8);
        out.r = ((rgba & 0x000000ff));
        return out;
    };
} else {
    ImageBuffer.packRGBA = function(r, g, b, a) {
        return (r << 24) | (g << 16) | (b <<  8) | a;
    };
    ImageBuffer.unpackRGBA = function(rgba, out) {
        if (!out)
            out = {r:0, g:0, b:0, a:0};
        out.r = ((rgba & 0xff000000) >>> 24);
        out.g = ((rgba & 0x00ff0000) >>> 16);
        out.b = ((rgba & 0x0000ff00) >>> 8);
        out.a = ((rgba & 0x000000ff));
        return out;
    };
}


module.exports = ImageBuffer;