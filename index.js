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
 * Int32Array is used for better performance if supported, otherwise
 * simple 8-bit manipulation is used as a fallback.
 *
 * To use this class; construct a new ImageBuffer with the specified dimensions, and modify
 * its pixels with either setPixel/getPixel or setPixelAt/getPixelAt
 * methods. Then, you can use the buffer.apply(imageData) to apply the changes to
 * a shared ImageData object.
 *
 * You can also cache the image for later use by calling createImage(). Note that
 * this is an expensive operation which should be used wisely.
 * 
 * If you pass an ImageData object as the first parameter to the constructor, instead
 * of width and height, any changes to the pixels array should be reflected immediately 
 * on the given ImageData object. In such a case, apply() has no effect.
 * 
 * @class  ImageBuffer
 * @constructor
 * @param  {Number} width      the width of the image
 * @param  {Number} height     the height of the image
 */
var ImageBuffer = function(width, height) {
    this.imageData = null;

    if (typeof width !== "number") { //first argument is non-numerical.. must be ImageData
        this.imageData = width;
        width = this.imageData.width;
        height = this.imageData.height;
    }

    this.width = width;
    this.height = height;

    

    this.pixels = null;
    this.direct = false;
    this.uint8 = null;


    //If an ImageData is provided, we will try to manipulate its array directly.
    if (this.imageData) {
        this.direct = true;

        //we can do direct manipulation
        if (SUPPORTS_32BIT) {
            this.uint8 = this.imageData.data;
            this.pixels = new Int32Array(this.uint8.buffer);
        } 
        //CanvasPixelArray + 8bit data... :(
        else {
            this.pixels = this.uint8 = this.imageData.data;
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
 * position (from top left). 
 *
 * @method  setPixelAt
 * @param {Number} x    the x position to modify
 * @param {Number} y    the y position to modify
 * @param {Number} r the red byte, 0-255
 * @param {Number} g the green byte, 0-255
 * @param {Number} b the blue byte, 0-255
 * @param {Number} a the alpha byte, 0-255
 */
ImageBuffer.prototype.setPixelAt = function(x, y, r, g, b, a) {
    var i = ~~(x + (y * this.width));
    this.setPixel(i, r, g, b, a);
};

/**
 * This is a utility function to get the color at the specified X and Y 
 * position (from top left). You can specify a color object to reduce allocations.
 * 
 * @method  getPixelAt
 * @param {Number} x    the x position to modify
 * @param {Number} y    the y position to modify
 * @param {Number} out  the color object with `r, g, b, a` properties, or null
 * @return {Object} a color representing the pixel at that location
 */
ImageBuffer.prototype.getPixelAt = function(x, y, out) {
    var i = ~~(x + (y * this.width));
    return this.getPixel(i, out);
};

/**
 * Creates a new Image object from this ImageBuffer. You can pass 
 * a context to re-use, otherwise this method will create a new canvas
 * and get its 2d context. This method uses toDataURL to generate
 * a new Image.
 *
 * Note that this is not supported on older 2.x Android devices.
 *
 * @method  createImage
 * @param  {CanvasRenderingContext} context the canvas 2D rendering context
 * @return {Image}         a new Image object with the data URI of your ImageBuffer
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
    context.clearRect(0, 0, this.width, this.height);
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
 * @method  apply
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
 * @param {Int32Array|CanvasPixelArray} pixels the pixels data from ImageBuffer
 * @param {Number} index the offset in the data to manipulate
 * @param {Number} r the red byte, 0-255
 * @param {Number} g the green byte, 0-255
 * @param {Number} b the blue byte, 0-255
 * @param {Number} a the alpha byte, 0-255
 */

/**
 * This is a convenience method to multiply all of the
 * pixels in inputBuffer with the specified (r, g, b, a) color, 
 * and place the result into outputBuffer. It's assumed that
 * both buffers have the same size.
 *
 * @method  multiply
 * @static 
 * @param {ImageBuffer} inputBuffer the input image data
 * @param {ImageBuffer} inputBuffer the output image data
 * @param {Number} r the red byte, 0-255
 * @param {Number} g the green byte, 0-255
 * @param {Number} b the blue byte, 0-255
 * @param {Number} a the alpha byte, 0-255
 */

if (SUPPORTS_32BIT) {
    if (LITTLE_ENDIAN) {
        ImageBuffer.prototype.setPixel = function(index, r, g, b, a) {
            this.pixels[index] = (a << 24) | (b << 16) | (g <<  8) | r;
        };


        ImageBuffer.multiply = function(inputBuffer, outputBuffer, r, g, b, a) {
            var rgba = (a << 24) | (b << 16) | (g << 8) | r;
            var input = inputBuffer.pixels,
                output = outputBuffer.pixels,
                len = input.length,
                a1, a2, b1, b2, g1, g2, r1, r2,
                val;

            for (var i=0; i<len; i++) {
                val1 = input[i];

                a1 = ((val1 & 0xff000000) >>> 24);
                a2 = ((rgba & 0xff000000) >>> 24);
                b1 = ((val1 & 0x00ff0000) >>> 16);
                b2 = ((rgba & 0x00ff0000) >>> 16);
                g1 = ((val1 & 0x0000ff00) >>> 8);
                g2 = ((rgba & 0x0000ff00) >>> 8);
                r1 = ((val1 & 0x000000ff));
                r2 = ((rgba & 0x000000ff));
                r  = r1 * r2 / 255;
                g  = g1 * g2 / 255;
                b  = b1 * b2 / 255;
                a  = a1 * a2 / 255;

                output[i] = (a << 24) | (b << 16) | (g << 8) | r;
            }
        };
    } else {
        ImageBuffer.prototype.setPixel = function(index, r, g, b, a) {
            this.pixels[index] = (r << 24) | (g << 16) | (b <<  8) | a;
        };

        ///TOOD: optimize with something like this:
        ///rgba = ((rgba & 0xFF000000) * (rgba2 >> 24)) | (((rgba & 0x00FF0000) * ((rgba2 >> 16) & 0xFF))) | (((rgba) & 0x0000FF00) * ((rgba2 >> 8) & 0xFF)) | ((rgba & 0x000000FF) * (rgba2 & 0xFF));

        ImageBuffer.multiply = function(inputBuffer, outputBuffer, r, g, b, a) {
            var rgba = (r << 24) | (g << 16) | (b << 8) | a;
            var input = inputBuffer.pixels,
                output = outputBuffer.pixels,
                len = input.length,
                a1, a2, b1, b2, g1, g2, r1, r2,
                val1;

            for (var i=0; i<len; i++) {
                val1 = input[i];

                r1 = ((val1 & 0xff000000) >>> 24);
                r2 = ((rgba & 0xff000000) >>> 24);
                g1 = ((val1 & 0x00ff0000) >>> 16);
                g2 = ((rgba & 0x00ff0000) >>> 16);
                b1 = ((val1 & 0x0000ff00) >>> 8);
                b2 = ((rgba & 0x0000ff00) >>> 8);
                a1 = ((val1 & 0x000000ff));
                a2 = ((rgba & 0x000000ff));
                r  = r1 * r2 / 255;
                g  = g1 * g2 / 255;
                b  = b1 * b2 / 255;
                a  = a1 * a2 / 255;
                    
                output[i] = (r << 24) | (g << 16) | (b << 8) | a;
            }
        };
    }
} else {
    ImageBuffer.prototype.setPixel = function(index, r, g, b, a) {
        var pixels = this.pixels;
        index *= 4;
        pixels[index] = r;
        pixels[++index] = g;
        pixels[++index] = b;
        pixels[++index] = a;
    };

    ImageBuffer.multiply = function(inputBuffer, outputBuffer, r, g, b, a) {
        var input = inputBuffer.pixels,
            output = outputBuffer.pixels,
            len = input.length;
        for (var i=0; i<len; i+=4) {
            output[i] = input[i] * r / 255;
            output[i+1] = input[i+1] * g / 255;
            output[i+2] = input[i+2] * b / 255;
            output[i+3] = input[i+3] * a / 255;
        }
    };
}

/**
 * Gets the pixel at the given index of the ImageBuffer's "data" array,
 * which might be a Int32Array (modern browsers) or CanvasPixelArray (fallback),
 * depending on the context's capabilities. Also takes endianness into account.
 *
 * The returned value is an object containing the color components as bytes (0-255)
 * in `r, g, b, a`. If `out` is specified, it will use that instead to reduce object creation.
 *
 * @method  getPixel
 * @param {Int32Array|CanvasPixelArray} pixels the pixels data from ImageBuffer
 * @param {Number} index the offset in the data to grab the color
 * @param {Number} out  the color object with `r, g, b, a` properties, or null
 * @return {Object} a color representing the pixel at that location
 */
ImageBuffer.prototype.getPixel = function(index, out) {
    var pixels = this.uint8;
    index *= 4;
    if (!out)
        out = {r:0, g:0, b:0, a:0};
    out.r = pixels[index];
    out.g = pixels[++index];
    out.b = pixels[++index];
    out.a = pixels[++index];
    return out;
};

/**
 * Packs the r, g, b, a components into a single integer, for use with
 * Int32Array. If LITTLE_ENDIAN, then ABGR order is used. Otherwise,
 * RGBA order is used.
 *
 * @method  packPixel
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
 * Note that the integer is assumed to be packed in the correct endianness. On little-endian
 * the format is 0xAABBGGRR and on big-endian the format is 0xRRGGBBAA. If you want a
 * endian-independent method, use fromRGBA(rgba) and toRGBA(r, g, b, a).
 * 
 * @method  unpackPixel
 * @static
 * @param {Number} rgba the integer, packed in endian order by packPixel
 * @param {Number} out  the color object with `r, g, b, a` properties, or null
 * @return {Object} a color representing the pixel at that location
 */

if (LITTLE_ENDIAN) {
    ImageBuffer.packPixel = function(r, g, b, a) {
        return (a << 24) | (b << 16) | (g <<  8) | r;
    };
    ImageBuffer.unpackPixel = function(rgba, out) {
        if (!out)
            out = {r:0, g:0, b:0, a:0};
        out.a = ((rgba & 0xff000000) >>> 24);
        out.b = ((rgba & 0x00ff0000) >>> 16);
        out.g = ((rgba & 0x0000ff00) >>> 8);
        out.r = ((rgba & 0x000000ff));
        return out;
    };
} else {
    ImageBuffer.packPixel = function(r, g, b, a) {
        return (r << 24) | (g << 16) | (b <<  8) | a;
    };
    ImageBuffer.unpackPixel = function(rgba, out) {
        if (!out)
            out = {r:0, g:0, b:0, a:0};
        out.r = ((rgba & 0xff000000) >>> 24);
        out.g = ((rgba & 0x00ff0000) >>> 16);
        out.b = ((rgba & 0x0000ff00) >>> 8);
        out.a = ((rgba & 0x000000ff));
        return out;
    };
}

/**
 * A utility to convert an integer in 0xRRGGBBAA format to a color object.
 * This does not rely on endianness.
 *
 * @method  fromRGBA
 * @static
 * @param  {Number} rgba an RGBA hex
 * @param  {Object} out the object to use, optional
 * @return {Object} a color object
 */
ImageBuffer.fromRGBA = function(rgba, out) {
    if (!out)
        out = {r:0, g:0, b:0, a:0};
    out.r = ((rgba & 0xff000000) >>> 24);
    out.g = ((rgba & 0x00ff0000) >>> 16);
    out.b = ((rgba & 0x0000ff00) >>> 8);
    out.a = ((rgba & 0x000000ff));
    return out;
};

/**
 * A utility to convert RGBA components to a 32 bit integer
 * in RRGGBBAA format.
 *
 * @method  toRGBA
 * @static
 * @param  {Number} r the r color component (0 - 255)
 * @param  {Number} g the g color component (0 - 255)
 * @param  {Number} b the b color component (0 - 255)
 * @param  {Number} a the a color component (0 - 255)
 * @return {Number} a RGBA-packed 32 bit integer
 */
ImageBuffer.toRGBA = function(r, g, b, a) {
    return (r << 24) | (g << 16) | (b <<  8) | a;
};

/**
 * A utility function to create a lightweight 'color'
 * object with the default components. Any components
 * that are not specified will default to zero.
 *
 * This is useful when you want to use a shared color
 * object for the getPixel and getPixelAt methods.
 *
 * @method  createColor
 * @static
 * @param  {Number} r the r color component (0 - 255)
 * @param  {Number} g the g color component (0 - 255)
 * @param  {Number} b the b color component (0 - 255)
 * @param  {Number} a the a color component (0 - 255)
 * @return {Object}   the resulting color object, with r, g, b, a properties
 */
ImageBuffer.createColor = function(r, g, b, a) {
    return {
        r: r||0,
        g: g||0,
        b: b||0,
        a: a||0
    };
};

module.exports = ImageBuffer;