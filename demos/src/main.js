var ImageBuffer = require('imagebuffer');
var WebGLContext = require('kami').WebGLContext;
var Texture = require('kami').Texture;
var AssetManager = require('kami').AssetManager;
var SpriteBatch = require('kami').SpriteBatch;

$(function() {
    var mainContainer = $("body").css({
        background: "#343434"
    });

    var width = 256;
    var height = 256;

    //create our webGL context..
    //this will manage viewport and context loss/restore
    var context = new WebGLContext(width, height);
    $(context.view).css({
        position: "absolute",
        background: "transparent",
        top: 0,
        left: 0
    });

    //add the view to the body
    mainContainer.append(context.view);

    //now setup our per-pixel stuff...
    var img = new ImageBuffer(250, 250);

    var size = img.width*img.height;
    for (var i=0; i<size; i++) {
        var pixels = img.pixels;
        var r = (i / size) * 255;

        ImageBuffer.setPixel(img.pixels, i, r, 0, 0, 255);
    }

    var fmt = Texture.Format.RGBA;
    var type = Texture.DataType.UNSIGNED_BYTE;
    var texWidth = img.width;
    var texHeight = img.height;

    //WebGL doesn't like Uint8ClampedArray... gotta do this:
    var data = new Uint8Array(img.uint8);

    //create a new WebGL texture with the given format, type and data
    var proceduralTex = new Texture(context, texWidth, texHeight, fmt, type, data);

    //We use this for rendering 2D sprites with WebGL
    var batch = new SpriteBatch(context);

    //draw a frame
    render();

    function render() {
        var gl = context.gl;

        //start the batch...
        batch.begin();

        //place the image in our sprite batcher
        batch.draw(proceduralTex, 0, 0, width, height);

        //flush to GPU
        batch.end();
    }
});



/*
$(function() {
	var canvasWidth = 250;
    var canvasHeight = 250;

	var canvas = $("<canvas>").css({
		background: "#aaaaaa"
	});
	canvas[0].width = canvasWidth;
	canvas[0].height = canvasHeight;
	canvas.appendTo($("body"));

	var ctx = canvas[0].getContext("2d");

	var imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    
    var data = imageData.data;
    
    // var buf = new ArrayBuffer(imageData.data.length);
    // var buf8 = new Uint8ClampedArray(buf);
    // var data32 = new Uint32Array(buf);

    var pixels = new Int32Array( imageData.data.buffer );

    console.log(canvasWidth*canvasHeight*4, imageData.data.length);

    var buf8 = new Uint8ClampedArray(250000);
    var pixels2 = new Int32Array(buf8.buffer);

    var isLittleEndian = ImageBuffer.LITTLE_ENDIAN;


    function rgba_LE(pixels, index, r, g, b, a) {
        pixels[index] = (a   << 24) |  // alpha
                        (b << 16) |    // blue
                        (g <<  8) |    // green
                         r;            // red
    }

    function rgba_BE(pixels, index, r, g, b, a) {
        pixels[index] = (r << 24) |    // red
                        (g << 16) |    // green
                        (b <<  8) |    // blue
                         a;            // alpha
    }

    function rgba_8bit(pixels, index, r, g, b, a) {
        pixels[index] = r;
        pixels[++index] = g;
        pixels[++index] = b;
        pixels[++index] = a;
    }


    var rgba = isLittleEndian ? rgba_LE : rgba_BE;

    for (var y = 0; y < canvasHeight; ++y) {
        for (var x = 0; x < canvasWidth; ++x) {
            var value = x * y & 0xff;

            rgba(pixels2, y * canvasWidth + x, value, value, value, 255);
        }
    }
	// console.log(pixels.length, pixels2.length);



	pixels.set(pixels2);

	// imageData.data.set(buf8);
	ctx.putImageData(imageData, 0, 0);

	// ctx.drawImage(imgData, 0, 0);
	// var img = new ImageBuffer()
});*/