var Class = require('./index.js');
var assert = require("assert");

/////////// Lightweight Mixins

var mixA = {
	//simplified klasse format
	test: {
		get: function() {
			return "foo";
		}
	},

	_value: 0,

	overrideProperty: "originalProp",

	overrideFunction: function() {
		return "originalFunc";
	},

	prop: {
		get: function() {
			return this._value;
		},

		set: function(value) {
			this._value = value;
		}
	},

	override: {
		get: function() {
			return "original";
		}
	}
};

//A true property descriptor
Object.defineProperty(mixA, "bar", {
	enumerable: true,

	get: function() {
		return "bar";
	}
});

/////////// Class Mixins
var MixB = new Class({

	foobar: function() {
		return "foobar";
	},

	override: {
		get: function() {
			return "newValue";
		}
	},

	overrideProperty: "newProp",

	overrideFunction: function() {
		return "newFunc";
	}
});

var Person = new Class({

	Mixins: [mixA, MixB],

	initialize: function Person() {
		this._value = 1;
	}
});

describe('mixins', function(){
    it('should inherit properties & function', function() {
    	var p = new Person();
    	//from lightweight mixin object
    	assert.equal("bar", p.bar); //made with defineProperty
    	assert.equal("foo", p.test);//made with simplified property
		assert.equal(1, p.prop)     //simplified property is bound correctly

		//from Class
		assert.equal("foobar", p.foobar()); //function is inherited from Class
	});

	it('are inheritd in order', function() {
    	var p = new Person();
		assert.equal("newValue", p.override);
		assert.equal("newProp", p.overrideProperty);
		assert.equal("newFunc", p.overrideFunction());
    });
});

