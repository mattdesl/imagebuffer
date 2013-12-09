# klasse

A minimal class/mixin utility for JavaScript, focusing on performance, node compatibility, and composition over inheritance. 

## install

Until this is added to the registry, you can install it like so:

```
npm install mattdesl/klasse
```

## syntax

Inspired by [MooTools](http://mootools.net/docs/core/Class/Class) and [jsOOP](https://github.com/MikkoH/jsOOP), the syntax is simple and readable:

```javascript
var MyClass = new Class({
	
	//Optional base class to extend from
	Extends: BaseClass,

	//Optional array of mixins
	Mixins: [ myMixins ], 

	initialize:
	function MyClass() {
		this.prop = "foo";
	}
});
```

Keywords:
	
- `Extends`: Optional. Specifies the base class for prototype chain.
- `Mixins`: Optional. Can be an array of mixins, or just a single mixin. A mixin is an object or Class which defines methods, properties, and so forth to be added directly to a class prototype. 
- `initialize`: Optional. The constructor method, generally a named function for clearer debugging. If not specified, and a base class is given to `Extends`, the constructor will default to calling the base class constructor. Otherwise, an empty constructor will be used.

## performance & V8 optimizations in mind

Encourages best performance in a number of ways:

- Lookups in a long prototype chain can be more costly, so composition over inheritance is encouraged with Mixins.
- No funky magic going on in the constructor (like in MooTools) -- just what you've defined for `initialize`. This is more ideal for V8 optimizations (hidden classes).
- Does not clutter objects with caller/super/etc. information. Too many properties in a class will make it less likely to be optimized by V8 and other engines.[1](http://console-to-chrome.appspot.com/#26) 

## constructor best practices

- Use a named constructor function so it appears correctly in the debugger, and in stack traces.
- Declare all instance variables for the class up-front in the constructor. This is done for two reasons:
	1. It's ideal for hidden classes in V8 and other engines.
	2. If you declare an instance property on the object passed to the `Class` constructor, it will be
	placed in the object's prototype. This leads to an unnecessary lookup in the prototype chain. It also may cause problems for Arrays and Objects, because they are not re-initialized as you might expect.

## example

Here is a Vector example, where we reduce duplicate code but favour composition rather than inheritance. Inheritance (i.e. Vector3 extends Vector2) would lead to unnecessary lookups on the prototype chain.


```javascript
var Class = require('klasse');

//A lightweight mixin which contains functions, properties, etc 
//to be placed on the prototype.
var mixins = {

	length: function() {
		return Math.sqrt(this.lengthSq());
	}
};

var Vector2 = new Class({

	//Mixin the length. This accepts an array of mixins
	//(lightweight objects, or a new Class) or you can 
	//just specify a single mixin.
	Mixins: mixins,

	//We use named functions for the constructor, which
	//leads to nicer console logs on Chrome.
	initialize: 
	function Vector2(x, y) {
		this.x = x || 0;
		this.y = y || 0;
	},

	lengthSq: function() {
		var x = this.x, 
			y = this.y;
		return ( x * x + y * y );
	}
});

var Vector3 = new Class({

	Mixins: mixins,

	initialize: 
	function Vector3(x, y, z) {
		//We can call the constructor like so
		Vector2.call(this, x, y);
		this.z = z || 0;
	},

	lengthSq: function() {
		var x = this.x,
			y = this.y,
			z = this.z;
		return (x * x + y * y + z + z);
	}
});
```

## "simplified" properties

If an object in the class definition or a mixin has `get` and/or `set` functions, then we assume its a property. It looks like this:

```javascript
var Person = new Class({

	initialize: 
	function Person(age) {
		this._age = age || 0;
	},

    /** The 'age' property. */
    age: {
        get: function() { 
            return this._age;
        },

        set: function(value) {
            if (value < 0)
                throw new Error("age must be positive");
            this._age = value;
        }
    }
});


var p = new Person(12);
p.age += 2; //increases age
console.log(p.age); //prints 14
p.age = -1; //throws error
```

Simplified properties are `enumerable` and `configurable` by default, unless otherwise specified. See below.

## final properties

A property which has `configurable` set to false will be considered final. Trying to Extend or Mixin and override such a property will throw an error. You can skip these errors by setting the `Class.ignoreFinals` flag to `true` before creating new classes. Then, only the first instance of that property will be included in your new Class. 
