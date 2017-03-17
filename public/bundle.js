(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
   typeof define === 'function' && define.amd ? define(factory) :
   (global.Dexie = factory());
}(this, (function () { 'use strict';

/*
* Dexie.js - a minimalistic wrapper for IndexedDB
* ===============================================
*
* By David Fahlander, david.fahlander@gmail.com
*
* Version 1.5.1, Tue Nov 01 2016
* www.dexie.com
* Apache License Version 2.0, January 2004, http://www.apache.org/licenses/
*/
var keys = Object.keys;
var isArray = Array.isArray;
var _global = typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global;

function extend(obj, extension) {
    if (typeof extension !== 'object') return obj;
    keys(extension).forEach(function (key) {
        obj[key] = extension[key];
    });
    return obj;
}

var getProto = Object.getPrototypeOf;
var _hasOwn = {}.hasOwnProperty;
function hasOwn(obj, prop) {
    return _hasOwn.call(obj, prop);
}

function props(proto, extension) {
    if (typeof extension === 'function') extension = extension(getProto(proto));
    keys(extension).forEach(function (key) {
        setProp(proto, key, extension[key]);
    });
}

function setProp(obj, prop, functionOrGetSet, options) {
    Object.defineProperty(obj, prop, extend(functionOrGetSet && hasOwn(functionOrGetSet, "get") && typeof functionOrGetSet.get === 'function' ? { get: functionOrGetSet.get, set: functionOrGetSet.set, configurable: true } : { value: functionOrGetSet, configurable: true, writable: true }, options));
}

function derive(Child) {
    return {
        from: function (Parent) {
            Child.prototype = Object.create(Parent.prototype);
            setProp(Child.prototype, "constructor", Child);
            return {
                extend: props.bind(null, Child.prototype)
            };
        }
    };
}

var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

function getPropertyDescriptor(obj, prop) {
    var pd = getOwnPropertyDescriptor(obj, prop),
        proto;
    return pd || (proto = getProto(obj)) && getPropertyDescriptor(proto, prop);
}

var _slice = [].slice;
function slice(args, start, end) {
    return _slice.call(args, start, end);
}

function override(origFunc, overridedFactory) {
    return overridedFactory(origFunc);
}

function doFakeAutoComplete(fn) {
    var to = setTimeout(fn, 1000);
    clearTimeout(to);
}

function assert(b) {
    if (!b) throw new Error("Assertion Failed");
}

function asap(fn) {
    if (_global.setImmediate) setImmediate(fn);else setTimeout(fn, 0);
}



/** Generate an object (hash map) based on given array.
 * @param extractor Function taking an array item and its index and returning an array of 2 items ([key, value]) to
 *        instert on the resulting object for each item in the array. If this function returns a falsy value, the
 *        current item wont affect the resulting object.
 */
function arrayToObject(array, extractor) {
    return array.reduce(function (result, item, i) {
        var nameAndValue = extractor(item, i);
        if (nameAndValue) result[nameAndValue[0]] = nameAndValue[1];
        return result;
    }, {});
}

function trycatcher(fn, reject) {
    return function () {
        try {
            fn.apply(this, arguments);
        } catch (e) {
            reject(e);
        }
    };
}

function tryCatch(fn, onerror, args) {
    try {
        fn.apply(null, args);
    } catch (ex) {
        onerror && onerror(ex);
    }
}

function getByKeyPath(obj, keyPath) {
    // http://www.w3.org/TR/IndexedDB/#steps-for-extracting-a-key-from-a-value-using-a-key-path
    if (hasOwn(obj, keyPath)) return obj[keyPath]; // This line is moved from last to first for optimization purpose.
    if (!keyPath) return obj;
    if (typeof keyPath !== 'string') {
        var rv = [];
        for (var i = 0, l = keyPath.length; i < l; ++i) {
            var val = getByKeyPath(obj, keyPath[i]);
            rv.push(val);
        }
        return rv;
    }
    var period = keyPath.indexOf('.');
    if (period !== -1) {
        var innerObj = obj[keyPath.substr(0, period)];
        return innerObj === undefined ? undefined : getByKeyPath(innerObj, keyPath.substr(period + 1));
    }
    return undefined;
}

function setByKeyPath(obj, keyPath, value) {
    if (!obj || keyPath === undefined) return;
    if ('isFrozen' in Object && Object.isFrozen(obj)) return;
    if (typeof keyPath !== 'string' && 'length' in keyPath) {
        assert(typeof value !== 'string' && 'length' in value);
        for (var i = 0, l = keyPath.length; i < l; ++i) {
            setByKeyPath(obj, keyPath[i], value[i]);
        }
    } else {
        var period = keyPath.indexOf('.');
        if (period !== -1) {
            var currentKeyPath = keyPath.substr(0, period);
            var remainingKeyPath = keyPath.substr(period + 1);
            if (remainingKeyPath === "") {
                if (value === undefined) delete obj[currentKeyPath];else obj[currentKeyPath] = value;
            } else {
                var innerObj = obj[currentKeyPath];
                if (!innerObj) innerObj = obj[currentKeyPath] = {};
                setByKeyPath(innerObj, remainingKeyPath, value);
            }
        } else {
            if (value === undefined) delete obj[keyPath];else obj[keyPath] = value;
        }
    }
}

function delByKeyPath(obj, keyPath) {
    if (typeof keyPath === 'string') setByKeyPath(obj, keyPath, undefined);else if ('length' in keyPath) [].map.call(keyPath, function (kp) {
        setByKeyPath(obj, kp, undefined);
    });
}

function shallowClone(obj) {
    var rv = {};
    for (var m in obj) {
        if (hasOwn(obj, m)) rv[m] = obj[m];
    }
    return rv;
}

function deepClone(any) {
    if (!any || typeof any !== 'object') return any;
    var rv;
    if (isArray(any)) {
        rv = [];
        for (var i = 0, l = any.length; i < l; ++i) {
            rv.push(deepClone(any[i]));
        }
    } else if (any instanceof Date) {
        rv = new Date();
        rv.setTime(any.getTime());
    } else {
        rv = any.constructor ? Object.create(any.constructor.prototype) : {};
        for (var prop in any) {
            if (hasOwn(any, prop)) {
                rv[prop] = deepClone(any[prop]);
            }
        }
    }
    return rv;
}

function getObjectDiff(a, b, rv, prfx) {
    // Compares objects a and b and produces a diff object.
    rv = rv || {};
    prfx = prfx || '';
    keys(a).forEach(function (prop) {
        if (!hasOwn(b, prop)) rv[prfx + prop] = undefined; // Property removed
        else {
                var ap = a[prop],
                    bp = b[prop];
                if (typeof ap === 'object' && typeof bp === 'object' && ap && bp && ap.constructor === bp.constructor)
                    // Same type of object but its properties may have changed
                    getObjectDiff(ap, bp, rv, prfx + prop + ".");else if (ap !== bp) rv[prfx + prop] = b[prop]; // Primitive value changed
            }
    });
    keys(b).forEach(function (prop) {
        if (!hasOwn(a, prop)) {
            rv[prfx + prop] = b[prop]; // Property added
        }
    });
    return rv;
}

// If first argument is iterable or array-like, return it as an array
var iteratorSymbol = typeof Symbol !== 'undefined' && Symbol.iterator;
var getIteratorOf = iteratorSymbol ? function (x) {
    var i;
    return x != null && (i = x[iteratorSymbol]) && i.apply(x);
} : function () {
    return null;
};

var NO_CHAR_ARRAY = {};
// Takes one or several arguments and returns an array based on the following criteras:
// * If several arguments provided, return arguments converted to an array in a way that
//   still allows javascript engine to optimize the code.
// * If single argument is an array, return a clone of it.
// * If this-pointer equals NO_CHAR_ARRAY, don't accept strings as valid iterables as a special
//   case to the two bullets below.
// * If single argument is an iterable, convert it to an array and return the resulting array.
// * If single argument is array-like (has length of type number), convert it to an array.
function getArrayOf(arrayLike) {
    var i, a, x, it;
    if (arguments.length === 1) {
        if (isArray(arrayLike)) return arrayLike.slice();
        if (this === NO_CHAR_ARRAY && typeof arrayLike === 'string') return [arrayLike];
        if (it = getIteratorOf(arrayLike)) {
            a = [];
            while (x = it.next(), !x.done) {
                a.push(x.value);
            }return a;
        }
        if (arrayLike == null) return [arrayLike];
        i = arrayLike.length;
        if (typeof i === 'number') {
            a = new Array(i);
            while (i--) {
                a[i] = arrayLike[i];
            }return a;
        }
        return [arrayLike];
    }
    i = arguments.length;
    a = new Array(i);
    while (i--) {
        a[i] = arguments[i];
    }return a;
}

var concat = [].concat;
function flatten(a) {
    return concat.apply([], a);
}

function nop() {}
function mirror(val) {
    return val;
}
function pureFunctionChain(f1, f2) {
    // Enables chained events that takes ONE argument and returns it to the next function in chain.
    // This pattern is used in the hook("reading") event.
    if (f1 == null || f1 === mirror) return f2;
    return function (val) {
        return f2(f1(val));
    };
}

function callBoth(on1, on2) {
    return function () {
        on1.apply(this, arguments);
        on2.apply(this, arguments);
    };
}

function hookCreatingChain(f1, f2) {
    // Enables chained events that takes several arguments and may modify first argument by making a modification and then returning the same instance.
    // This pattern is used in the hook("creating") event.
    if (f1 === nop) return f2;
    return function () {
        var res = f1.apply(this, arguments);
        if (res !== undefined) arguments[0] = res;
        var onsuccess = this.onsuccess,
            // In case event listener has set this.onsuccess
        onerror = this.onerror; // In case event listener has set this.onerror
        this.onsuccess = null;
        this.onerror = null;
        var res2 = f2.apply(this, arguments);
        if (onsuccess) this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
        if (onerror) this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
        return res2 !== undefined ? res2 : res;
    };
}

function hookDeletingChain(f1, f2) {
    if (f1 === nop) return f2;
    return function () {
        f1.apply(this, arguments);
        var onsuccess = this.onsuccess,
            // In case event listener has set this.onsuccess
        onerror = this.onerror; // In case event listener has set this.onerror
        this.onsuccess = this.onerror = null;
        f2.apply(this, arguments);
        if (onsuccess) this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
        if (onerror) this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
    };
}

function hookUpdatingChain(f1, f2) {
    if (f1 === nop) return f2;
    return function (modifications) {
        var res = f1.apply(this, arguments);
        extend(modifications, res); // If f1 returns new modifications, extend caller's modifications with the result before calling next in chain.
        var onsuccess = this.onsuccess,
            // In case event listener has set this.onsuccess
        onerror = this.onerror; // In case event listener has set this.onerror
        this.onsuccess = null;
        this.onerror = null;
        var res2 = f2.apply(this, arguments);
        if (onsuccess) this.onsuccess = this.onsuccess ? callBoth(onsuccess, this.onsuccess) : onsuccess;
        if (onerror) this.onerror = this.onerror ? callBoth(onerror, this.onerror) : onerror;
        return res === undefined ? res2 === undefined ? undefined : res2 : extend(res, res2);
    };
}

function reverseStoppableEventChain(f1, f2) {
    if (f1 === nop) return f2;
    return function () {
        if (f2.apply(this, arguments) === false) return false;
        return f1.apply(this, arguments);
    };
}



function promisableChain(f1, f2) {
    if (f1 === nop) return f2;
    return function () {
        var res = f1.apply(this, arguments);
        if (res && typeof res.then === 'function') {
            var thiz = this,
                i = arguments.length,
                args = new Array(i);
            while (i--) {
                args[i] = arguments[i];
            }return res.then(function () {
                return f2.apply(thiz, args);
            });
        }
        return f2.apply(this, arguments);
    };
}

// By default, debug will be true only if platform is a web platform and its page is served from localhost.
// When debug = true, error's stacks will contain asyncronic long stacks.
var debug = typeof location !== 'undefined' &&
// By default, use debug mode if served from localhost.
/^(http|https):\/\/(localhost|127\.0\.0\.1)/.test(location.href);

function setDebug(value, filter) {
    debug = value;
    libraryFilter = filter;
}

var libraryFilter = function () {
    return true;
};

var NEEDS_THROW_FOR_STACK = !new Error("").stack;

function getErrorWithStack() {
    "use strict";

    if (NEEDS_THROW_FOR_STACK) try {
        // Doing something naughty in strict mode here to trigger a specific error
        // that can be explicitely ignored in debugger's exception settings.
        // If we'd just throw new Error() here, IE's debugger's exception settings
        // will just consider it as "exception thrown by javascript code" which is
        // something you wouldn't want it to ignore.
        getErrorWithStack.arguments;
        throw new Error(); // Fallback if above line don't throw.
    } catch (e) {
        return e;
    }
    return new Error();
}

function prettyStack(exception, numIgnoredFrames) {
    var stack = exception.stack;
    if (!stack) return "";
    numIgnoredFrames = numIgnoredFrames || 0;
    if (stack.indexOf(exception.name) === 0) numIgnoredFrames += (exception.name + exception.message).split('\n').length;
    return stack.split('\n').slice(numIgnoredFrames).filter(libraryFilter).map(function (frame) {
        return "\n" + frame;
    }).join('');
}

function deprecated(what, fn) {
    return function () {
        console.warn(what + " is deprecated. See https://github.com/dfahlander/Dexie.js/wiki/Deprecations. " + prettyStack(getErrorWithStack(), 1));
        return fn.apply(this, arguments);
    };
}

var dexieErrorNames = ['Modify', 'Bulk', 'OpenFailed', 'VersionChange', 'Schema', 'Upgrade', 'InvalidTable', 'MissingAPI', 'NoSuchDatabase', 'InvalidArgument', 'SubTransaction', 'Unsupported', 'Internal', 'DatabaseClosed', 'IncompatiblePromise'];

var idbDomErrorNames = ['Unknown', 'Constraint', 'Data', 'TransactionInactive', 'ReadOnly', 'Version', 'NotFound', 'InvalidState', 'InvalidAccess', 'Abort', 'Timeout', 'QuotaExceeded', 'Syntax', 'DataClone'];

var errorList = dexieErrorNames.concat(idbDomErrorNames);

var defaultTexts = {
    VersionChanged: "Database version changed by other database connection",
    DatabaseClosed: "Database has been closed",
    Abort: "Transaction aborted",
    TransactionInactive: "Transaction has already completed or failed"
};

//
// DexieError - base class of all out exceptions.
//
function DexieError(name, msg) {
    // Reason we don't use ES6 classes is because:
    // 1. It bloats transpiled code and increases size of minified code.
    // 2. It doesn't give us much in this case.
    // 3. It would require sub classes to call super(), which
    //    is not needed when deriving from Error.
    this._e = getErrorWithStack();
    this.name = name;
    this.message = msg;
}

derive(DexieError).from(Error).extend({
    stack: {
        get: function () {
            return this._stack || (this._stack = this.name + ": " + this.message + prettyStack(this._e, 2));
        }
    },
    toString: function () {
        return this.name + ": " + this.message;
    }
});

function getMultiErrorMessage(msg, failures) {
    return msg + ". Errors: " + failures.map(function (f) {
        return f.toString();
    }).filter(function (v, i, s) {
        return s.indexOf(v) === i;
    }) // Only unique error strings
    .join('\n');
}

//
// ModifyError - thrown in WriteableCollection.modify()
// Specific constructor because it contains members failures and failedKeys.
//
function ModifyError(msg, failures, successCount, failedKeys) {
    this._e = getErrorWithStack();
    this.failures = failures;
    this.failedKeys = failedKeys;
    this.successCount = successCount;
}
derive(ModifyError).from(DexieError);

function BulkError(msg, failures) {
    this._e = getErrorWithStack();
    this.name = "BulkError";
    this.failures = failures;
    this.message = getMultiErrorMessage(msg, failures);
}
derive(BulkError).from(DexieError);

//
//
// Dynamically generate error names and exception classes based
// on the names in errorList.
//
//

// Map of {ErrorName -> ErrorName + "Error"}
var errnames = errorList.reduce(function (obj, name) {
    return obj[name] = name + "Error", obj;
}, {});

// Need an alias for DexieError because we're gonna create subclasses with the same name.
var BaseException = DexieError;
// Map of {ErrorName -> exception constructor}
var exceptions = errorList.reduce(function (obj, name) {
    // Let the name be "DexieError" because this name may
    // be shown in call stack and when debugging. DexieError is
    // the most true name because it derives from DexieError,
    // and we cannot change Function.name programatically without
    // dynamically create a Function object, which would be considered
    // 'eval-evil'.
    var fullName = name + "Error";
    function DexieError(msgOrInner, inner) {
        this._e = getErrorWithStack();
        this.name = fullName;
        if (!msgOrInner) {
            this.message = defaultTexts[name] || fullName;
            this.inner = null;
        } else if (typeof msgOrInner === 'string') {
            this.message = msgOrInner;
            this.inner = inner || null;
        } else if (typeof msgOrInner === 'object') {
            this.message = msgOrInner.name + ' ' + msgOrInner.message;
            this.inner = msgOrInner;
        }
    }
    derive(DexieError).from(BaseException);
    obj[name] = DexieError;
    return obj;
}, {});

// Use ECMASCRIPT standard exceptions where applicable:
exceptions.Syntax = SyntaxError;
exceptions.Type = TypeError;
exceptions.Range = RangeError;

var exceptionMap = idbDomErrorNames.reduce(function (obj, name) {
    obj[name + "Error"] = exceptions[name];
    return obj;
}, {});

function mapError(domError, message) {
    if (!domError || domError instanceof DexieError || domError instanceof TypeError || domError instanceof SyntaxError || !domError.name || !exceptionMap[domError.name]) return domError;
    var rv = new exceptionMap[domError.name](message || domError.message, domError);
    if ("stack" in domError) {
        // Derive stack from inner exception if it has a stack
        setProp(rv, "stack", { get: function () {
                return this.inner.stack;
            } });
    }
    return rv;
}

var fullNameExceptions = errorList.reduce(function (obj, name) {
    if (["Syntax", "Type", "Range"].indexOf(name) === -1) obj[name + "Error"] = exceptions[name];
    return obj;
}, {});

fullNameExceptions.ModifyError = ModifyError;
fullNameExceptions.DexieError = DexieError;
fullNameExceptions.BulkError = BulkError;

function Events(ctx) {
    var evs = {};
    var rv = function (eventName, subscriber) {
        if (subscriber) {
            // Subscribe. If additional arguments than just the subscriber was provided, forward them as well.
            var i = arguments.length,
                args = new Array(i - 1);
            while (--i) {
                args[i - 1] = arguments[i];
            }evs[eventName].subscribe.apply(null, args);
            return ctx;
        } else if (typeof eventName === 'string') {
            // Return interface allowing to fire or unsubscribe from event
            return evs[eventName];
        }
    };
    rv.addEventType = add;

    for (var i = 1, l = arguments.length; i < l; ++i) {
        add(arguments[i]);
    }

    return rv;

    function add(eventName, chainFunction, defaultFunction) {
        if (typeof eventName === 'object') return addConfiguredEvents(eventName);
        if (!chainFunction) chainFunction = reverseStoppableEventChain;
        if (!defaultFunction) defaultFunction = nop;

        var context = {
            subscribers: [],
            fire: defaultFunction,
            subscribe: function (cb) {
                if (context.subscribers.indexOf(cb) === -1) {
                    context.subscribers.push(cb);
                    context.fire = chainFunction(context.fire, cb);
                }
            },
            unsubscribe: function (cb) {
                context.subscribers = context.subscribers.filter(function (fn) {
                    return fn !== cb;
                });
                context.fire = context.subscribers.reduce(chainFunction, defaultFunction);
            }
        };
        evs[eventName] = rv[eventName] = context;
        return context;
    }

    function addConfiguredEvents(cfg) {
        // events(this, {reading: [functionChain, nop]});
        keys(cfg).forEach(function (eventName) {
            var args = cfg[eventName];
            if (isArray(args)) {
                add(eventName, cfg[eventName][0], cfg[eventName][1]);
            } else if (args === 'asap') {
                // Rather than approaching event subscription using a functional approach, we here do it in a for-loop where subscriber is executed in its own stack
                // enabling that any exception that occur wont disturb the initiator and also not nescessary be catched and forgotten.
                var context = add(eventName, mirror, function fire() {
                    // Optimazation-safe cloning of arguments into args.
                    var i = arguments.length,
                        args = new Array(i);
                    while (i--) {
                        args[i] = arguments[i];
                    } // All each subscriber:
                    context.subscribers.forEach(function (fn) {
                        asap(function fireEvent() {
                            fn.apply(null, args);
                        });
                    });
                });
            } else throw new exceptions.InvalidArgument("Invalid event config");
        });
    }
}

//
// Promise Class for Dexie library
//
// I started out writing this Promise class by copying promise-light (https://github.com/taylorhakes/promise-light) by
// https://github.com/taylorhakes - an A+ and ECMASCRIPT 6 compliant Promise implementation.
//
// Modifications needed to be done to support indexedDB because it wont accept setTimeout()
// (See discussion: https://github.com/promises-aplus/promises-spec/issues/45) .
// This topic was also discussed in the following thread: https://github.com/promises-aplus/promises-spec/issues/45
//
// This implementation will not use setTimeout or setImmediate when it's not needed. The behavior is 100% Promise/A+ compliant since
// the caller of new Promise() can be certain that the promise wont be triggered the lines after constructing the promise.
//
// In previous versions this was fixed by not calling setTimeout when knowing that the resolve() or reject() came from another
// tick. In Dexie v1.4.0, I've rewritten the Promise class entirely. Just some fragments of promise-light is left. I use
// another strategy now that simplifies everything a lot: to always execute callbacks in a new tick, but have an own microTick
// engine that is used instead of setImmediate() or setTimeout().
// Promise class has also been optimized a lot with inspiration from bluebird - to avoid closures as much as possible.
// Also with inspiration from bluebird, asyncronic stacks in debug mode.
//
// Specific non-standard features of this Promise class:
// * Async static context support (Promise.PSD)
// * Promise.follow() method built upon PSD, that allows user to track all promises created from current stack frame
//   and below + all promises that those promises creates or awaits.
// * Detect any unhandled promise in a PSD-scope (PSD.onunhandled). 
//
// David Fahlander, https://github.com/dfahlander
//

// Just a pointer that only this module knows about.
// Used in Promise constructor to emulate a private constructor.
var INTERNAL = {};

// Async stacks (long stacks) must not grow infinitely.
var LONG_STACKS_CLIP_LIMIT = 100;
var MAX_LONG_STACKS = 20;
var stack_being_generated = false;

/* The default "nextTick" function used only for the very first promise in a promise chain.
   As soon as then promise is resolved or rejected, all next tasks will be executed in micro ticks
   emulated in this module. For indexedDB compatibility, this means that every method needs to 
   execute at least one promise before doing an indexedDB operation. Dexie will always call 
   db.ready().then() for every operation to make sure the indexedDB event is started in an
   emulated micro tick.
*/
var schedulePhysicalTick = _global.setImmediate ?
// setImmediate supported. Those modern platforms also supports Function.bind().
setImmediate.bind(null, physicalTick) : _global.MutationObserver ?
// MutationObserver supported
function () {
    var hiddenDiv = document.createElement("div");
    new MutationObserver(function () {
        physicalTick();
        hiddenDiv = null;
    }).observe(hiddenDiv, { attributes: true });
    hiddenDiv.setAttribute('i', '1');
} :
// No support for setImmediate or MutationObserver. No worry, setTimeout is only called
// once time. Every tick that follows will be our emulated micro tick.
// Could have uses setTimeout.bind(null, 0, physicalTick) if it wasnt for that FF13 and below has a bug 
function () {
    setTimeout(physicalTick, 0);
};

// Confifurable through Promise.scheduler.
// Don't export because it would be unsafe to let unknown
// code call it unless they do try..catch within their callback.
// This function can be retrieved through getter of Promise.scheduler though,
// but users must not do Promise.scheduler (myFuncThatThrows exception)!
var asap$1 = function (callback, args) {
    microtickQueue.push([callback, args]);
    if (needsNewPhysicalTick) {
        schedulePhysicalTick();
        needsNewPhysicalTick = false;
    }
};

var isOutsideMicroTick = true;
var needsNewPhysicalTick = true;
var unhandledErrors = [];
var rejectingErrors = [];
var currentFulfiller = null;
var rejectionMapper = mirror; // Remove in next major when removing error mapping of DOMErrors and DOMExceptions

var globalPSD = {
    global: true,
    ref: 0,
    unhandleds: [],
    onunhandled: globalError,
    //env: null, // Will be set whenever leaving a scope using wrappers.snapshot()
    finalize: function () {
        this.unhandleds.forEach(function (uh) {
            try {
                globalError(uh[0], uh[1]);
            } catch (e) {}
        });
    }
};

var PSD = globalPSD;

var microtickQueue = []; // Callbacks to call in this or next physical tick.
var numScheduledCalls = 0; // Number of listener-calls left to do in this physical tick.
var tickFinalizers = []; // Finalizers to call when there are no more async calls scheduled within current physical tick.

// Wrappers are not being used yet. Their framework is functioning and can be used
// to replace environment during a PSD scope (a.k.a. 'zone').
/* **KEEP** export var wrappers = (() => {
    var wrappers = [];

    return {
        snapshot: () => {
            var i = wrappers.length,
                result = new Array(i);
            while (i--) result[i] = wrappers[i].snapshot();
            return result;
        },
        restore: values => {
            var i = wrappers.length;
            while (i--) wrappers[i].restore(values[i]);
        },
        wrap: () => wrappers.map(w => w.wrap()),
        add: wrapper => {
            wrappers.push(wrapper);
        }
    };
})();
*/

function Promise(fn) {
    if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new');
    this._listeners = [];
    this.onuncatched = nop; // Deprecate in next major. Not needed. Better to use global error handler.

    // A library may set `promise._lib = true;` after promise is created to make resolve() or reject()
    // execute the microtask engine implicitely within the call to resolve() or reject().
    // To remain A+ compliant, a library must only set `_lib=true` if it can guarantee that the stack
    // only contains library code when calling resolve() or reject().
    // RULE OF THUMB: ONLY set _lib = true for promises explicitely resolving/rejecting directly from
    // global scope (event handler, timer etc)!
    this._lib = false;
    // Current async scope
    var psd = this._PSD = PSD;

    if (debug) {
        this._stackHolder = getErrorWithStack();
        this._prev = null;
        this._numPrev = 0; // Number of previous promises (for long stacks)
        linkToPreviousPromise(this, currentFulfiller);
    }

    if (typeof fn !== 'function') {
        if (fn !== INTERNAL) throw new TypeError('Not a function');
        // Private constructor (INTERNAL, state, value).
        // Used internally by Promise.resolve() and Promise.reject().
        this._state = arguments[1];
        this._value = arguments[2];
        if (this._state === false) handleRejection(this, this._value); // Map error, set stack and addPossiblyUnhandledError().
        return;
    }

    this._state = null; // null (=pending), false (=rejected) or true (=resolved)
    this._value = null; // error or result
    ++psd.ref; // Refcounting current scope
    executePromiseTask(this, fn);
}

props(Promise.prototype, {

    then: function (onFulfilled, onRejected) {
        var _this = this;

        var rv = new Promise(function (resolve, reject) {
            propagateToListener(_this, new Listener(onFulfilled, onRejected, resolve, reject));
        });
        debug && (!this._prev || this._state === null) && linkToPreviousPromise(rv, this);
        return rv;
    },

    _then: function (onFulfilled, onRejected) {
        // A little tinier version of then() that don't have to create a resulting promise.
        propagateToListener(this, new Listener(null, null, onFulfilled, onRejected));
    },

    catch: function (onRejected) {
        if (arguments.length === 1) return this.then(null, onRejected);
        // First argument is the Error type to catch
        var type = arguments[0],
            handler = arguments[1];
        return typeof type === 'function' ? this.then(null, function (err) {
            return (
                // Catching errors by its constructor type (similar to java / c++ / c#)
                // Sample: promise.catch(TypeError, function (e) { ... });
                err instanceof type ? handler(err) : PromiseReject(err)
            );
        }) : this.then(null, function (err) {
            return (
                // Catching errors by the error.name property. Makes sense for indexedDB where error type
                // is always DOMError but where e.name tells the actual error type.
                // Sample: promise.catch('ConstraintError', function (e) { ... });
                err && err.name === type ? handler(err) : PromiseReject(err)
            );
        });
    },

    finally: function (onFinally) {
        return this.then(function (value) {
            onFinally();
            return value;
        }, function (err) {
            onFinally();
            return PromiseReject(err);
        });
    },

    // Deprecate in next major. Needed only for db.on.error.
    uncaught: function (uncaughtHandler) {
        var _this2 = this;

        // Be backward compatible and use "onuncatched" as the event name on this.
        // Handle multiple subscribers through reverseStoppableEventChain(). If a handler returns `false`, bubbling stops.
        this.onuncatched = reverseStoppableEventChain(this.onuncatched, uncaughtHandler);
        // In case caller does this on an already rejected promise, assume caller wants to point out the error to this promise and not
        // a previous promise. Reason: the prevous promise may lack onuncatched handler. 
        if (this._state === false && unhandledErrors.indexOf(this) === -1) {
            // Replace unhandled error's destinaion promise with this one!
            unhandledErrors.some(function (p, i, l) {
                return p._value === _this2._value && (l[i] = _this2);
            });
            // Actually we do this shit because we need to support db.on.error() correctly during db.open(). If we deprecate db.on.error, we could
            // take away this piece of code as well as the onuncatched and uncaught() method.
        }
        return this;
    },

    stack: {
        get: function () {
            if (this._stack) return this._stack;
            try {
                stack_being_generated = true;
                var stacks = getStack(this, [], MAX_LONG_STACKS);
                var stack = stacks.join("\nFrom previous: ");
                if (this._state !== null) this._stack = stack; // Stack may be updated on reject.
                return stack;
            } finally {
                stack_being_generated = false;
            }
        }
    }
});

function Listener(onFulfilled, onRejected, resolve, reject) {
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.resolve = resolve;
    this.reject = reject;
    this.psd = PSD;
}

// Promise Static Properties
props(Promise, {
    all: function () {
        var values = getArrayOf.apply(null, arguments); // Supports iterables, implicit arguments and array-like.
        return new Promise(function (resolve, reject) {
            if (values.length === 0) resolve([]);
            var remaining = values.length;
            values.forEach(function (a, i) {
                return Promise.resolve(a).then(function (x) {
                    values[i] = x;
                    if (! --remaining) resolve(values);
                }, reject);
            });
        });
    },

    resolve: function (value) {
        if (value instanceof Promise) return value;
        if (value && typeof value.then === 'function') return new Promise(function (resolve, reject) {
            value.then(resolve, reject);
        });
        return new Promise(INTERNAL, true, value);
    },

    reject: PromiseReject,

    race: function () {
        var values = getArrayOf.apply(null, arguments);
        return new Promise(function (resolve, reject) {
            values.map(function (value) {
                return Promise.resolve(value).then(resolve, reject);
            });
        });
    },

    PSD: {
        get: function () {
            return PSD;
        },
        set: function (value) {
            return PSD = value;
        }
    },

    newPSD: newScope,

    usePSD: usePSD,

    scheduler: {
        get: function () {
            return asap$1;
        },
        set: function (value) {
            asap$1 = value;
        }
    },

    rejectionMapper: {
        get: function () {
            return rejectionMapper;
        },
        set: function (value) {
            rejectionMapper = value;
        } // Map reject failures
    },

    follow: function (fn) {
        return new Promise(function (resolve, reject) {
            return newScope(function (resolve, reject) {
                var psd = PSD;
                psd.unhandleds = []; // For unhandled standard- or 3rd party Promises. Checked at psd.finalize()
                psd.onunhandled = reject; // Triggered directly on unhandled promises of this library.
                psd.finalize = callBoth(function () {
                    var _this3 = this;

                    // Unhandled standard or 3rd part promises are put in PSD.unhandleds and
                    // examined upon scope completion while unhandled rejections in this Promise
                    // will trigger directly through psd.onunhandled
                    run_at_end_of_this_or_next_physical_tick(function () {
                        _this3.unhandleds.length === 0 ? resolve() : reject(_this3.unhandleds[0]);
                    });
                }, psd.finalize);
                fn();
            }, resolve, reject);
        });
    },

    on: Events(null, { "error": [reverseStoppableEventChain, defaultErrorHandler] // Default to defaultErrorHandler
    })

});

var PromiseOnError = Promise.on.error;
PromiseOnError.subscribe = deprecated("Promise.on('error')", PromiseOnError.subscribe);
PromiseOnError.unsubscribe = deprecated("Promise.on('error').unsubscribe", PromiseOnError.unsubscribe);

/**
* Take a potentially misbehaving resolver function and make sure
* onFulfilled and onRejected are only called once.
*
* Makes no guarantees about asynchrony.
*/
function executePromiseTask(promise, fn) {
    // Promise Resolution Procedure:
    // https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
    try {
        fn(function (value) {
            if (promise._state !== null) return;
            if (value === promise) throw new TypeError('A promise cannot be resolved with itself.');
            var shouldExecuteTick = promise._lib && beginMicroTickScope();
            if (value && typeof value.then === 'function') {
                executePromiseTask(promise, function (resolve, reject) {
                    value instanceof Promise ? value._then(resolve, reject) : value.then(resolve, reject);
                });
            } else {
                promise._state = true;
                promise._value = value;
                propagateAllListeners(promise);
            }
            if (shouldExecuteTick) endMicroTickScope();
        }, handleRejection.bind(null, promise)); // If Function.bind is not supported. Exception is handled in catch below
    } catch (ex) {
        handleRejection(promise, ex);
    }
}

function handleRejection(promise, reason) {
    rejectingErrors.push(reason);
    if (promise._state !== null) return;
    var shouldExecuteTick = promise._lib && beginMicroTickScope();
    reason = rejectionMapper(reason);
    promise._state = false;
    promise._value = reason;
    debug && reason !== null && typeof reason === 'object' && !reason._promise && tryCatch(function () {
        var origProp = getPropertyDescriptor(reason, "stack");
        reason._promise = promise;
        setProp(reason, "stack", {
            get: function () {
                return stack_being_generated ? origProp && (origProp.get ? origProp.get.apply(reason) : origProp.value) : promise.stack;
            }
        });
    });
    // Add the failure to a list of possibly uncaught errors
    addPossiblyUnhandledError(promise);
    propagateAllListeners(promise);
    if (shouldExecuteTick) endMicroTickScope();
}

function propagateAllListeners(promise) {
    //debug && linkToPreviousPromise(promise);
    var listeners = promise._listeners;
    promise._listeners = [];
    for (var i = 0, len = listeners.length; i < len; ++i) {
        propagateToListener(promise, listeners[i]);
    }
    var psd = promise._PSD;
    --psd.ref || psd.finalize(); // if psd.ref reaches zero, call psd.finalize();
    if (numScheduledCalls === 0) {
        // If numScheduledCalls is 0, it means that our stack is not in a callback of a scheduled call,
        // and that no deferreds where listening to this rejection or success.
        // Since there is a risk that our stack can contain application code that may
        // do stuff after this code is finished that may generate new calls, we cannot
        // call finalizers here.
        ++numScheduledCalls;
        asap$1(function () {
            if (--numScheduledCalls === 0) finalizePhysicalTick(); // Will detect unhandled errors
        }, []);
    }
}

function propagateToListener(promise, listener) {
    if (promise._state === null) {
        promise._listeners.push(listener);
        return;
    }

    var cb = promise._state ? listener.onFulfilled : listener.onRejected;
    if (cb === null) {
        // This Listener doesnt have a listener for the event being triggered (onFulfilled or onReject) so lets forward the event to any eventual listeners on the Promise instance returned by then() or catch()
        return (promise._state ? listener.resolve : listener.reject)(promise._value);
    }
    var psd = listener.psd;
    ++psd.ref;
    ++numScheduledCalls;
    asap$1(callListener, [cb, promise, listener]);
}

function callListener(cb, promise, listener) {
    var outerScope = PSD;
    var psd = listener.psd;
    try {
        if (psd !== outerScope) {
            // **KEEP** outerScope.env = wrappers.snapshot(); // Snapshot outerScope's environment.
            PSD = psd;
            // **KEEP** wrappers.restore(psd.env); // Restore PSD's environment.
        }

        // Set static variable currentFulfiller to the promise that is being fullfilled,
        // so that we connect the chain of promises (for long stacks support)
        currentFulfiller = promise;

        // Call callback and resolve our listener with it's return value.
        var value = promise._value,
            ret;
        if (promise._state) {
            ret = cb(value);
        } else {
            if (rejectingErrors.length) rejectingErrors = [];
            ret = cb(value);
            if (rejectingErrors.indexOf(value) === -1) markErrorAsHandled(promise); // Callback didnt do Promise.reject(err) nor reject(err) onto another promise.
        }
        listener.resolve(ret);
    } catch (e) {
        // Exception thrown in callback. Reject our listener.
        listener.reject(e);
    } finally {
        // Restore PSD, env and currentFulfiller.
        if (psd !== outerScope) {
            PSD = outerScope;
            // **KEEP** wrappers.restore(outerScope.env); // Restore outerScope's environment
        }
        currentFulfiller = null;
        if (--numScheduledCalls === 0) finalizePhysicalTick();
        --psd.ref || psd.finalize();
    }
}

function getStack(promise, stacks, limit) {
    if (stacks.length === limit) return stacks;
    var stack = "";
    if (promise._state === false) {
        var failure = promise._value,
            errorName,
            message;

        if (failure != null) {
            errorName = failure.name || "Error";
            message = failure.message || failure;
            stack = prettyStack(failure, 0);
        } else {
            errorName = failure; // If error is undefined or null, show that.
            message = "";
        }
        stacks.push(errorName + (message ? ": " + message : "") + stack);
    }
    if (debug) {
        stack = prettyStack(promise._stackHolder, 2);
        if (stack && stacks.indexOf(stack) === -1) stacks.push(stack);
        if (promise._prev) getStack(promise._prev, stacks, limit);
    }
    return stacks;
}

function linkToPreviousPromise(promise, prev) {
    // Support long stacks by linking to previous completed promise.
    var numPrev = prev ? prev._numPrev + 1 : 0;
    if (numPrev < LONG_STACKS_CLIP_LIMIT) {
        // Prohibit infinite Promise loops to get an infinite long memory consuming "tail".
        promise._prev = prev;
        promise._numPrev = numPrev;
    }
}

/* The callback to schedule with setImmediate() or setTimeout().
   It runs a virtual microtick and executes any callback registered in microtickQueue.
 */
function physicalTick() {
    beginMicroTickScope() && endMicroTickScope();
}

function beginMicroTickScope() {
    var wasRootExec = isOutsideMicroTick;
    isOutsideMicroTick = false;
    needsNewPhysicalTick = false;
    return wasRootExec;
}

/* Executes micro-ticks without doing try..catch.
   This can be possible because we only use this internally and
   the registered functions are exception-safe (they do try..catch
   internally before calling any external method). If registering
   functions in the microtickQueue that are not exception-safe, this
   would destroy the framework and make it instable. So we don't export
   our asap method.
*/
function endMicroTickScope() {
    var callbacks, i, l;
    do {
        while (microtickQueue.length > 0) {
            callbacks = microtickQueue;
            microtickQueue = [];
            l = callbacks.length;
            for (i = 0; i < l; ++i) {
                var item = callbacks[i];
                item[0].apply(null, item[1]);
            }
        }
    } while (microtickQueue.length > 0);
    isOutsideMicroTick = true;
    needsNewPhysicalTick = true;
}

function finalizePhysicalTick() {
    var unhandledErrs = unhandledErrors;
    unhandledErrors = [];
    unhandledErrs.forEach(function (p) {
        p._PSD.onunhandled.call(null, p._value, p);
    });
    var finalizers = tickFinalizers.slice(0); // Clone first because finalizer may remove itself from list.
    var i = finalizers.length;
    while (i) {
        finalizers[--i]();
    }
}

function run_at_end_of_this_or_next_physical_tick(fn) {
    function finalizer() {
        fn();
        tickFinalizers.splice(tickFinalizers.indexOf(finalizer), 1);
    }
    tickFinalizers.push(finalizer);
    ++numScheduledCalls;
    asap$1(function () {
        if (--numScheduledCalls === 0) finalizePhysicalTick();
    }, []);
}

function addPossiblyUnhandledError(promise) {
    // Only add to unhandledErrors if not already there. The first one to add to this list
    // will be upon the first rejection so that the root cause (first promise in the
    // rejection chain) is the one listed.
    if (!unhandledErrors.some(function (p) {
        return p._value === promise._value;
    })) unhandledErrors.push(promise);
}

function markErrorAsHandled(promise) {
    // Called when a reject handled is actually being called.
    // Search in unhandledErrors for any promise whos _value is this promise_value (list
    // contains only rejected promises, and only one item per error)
    var i = unhandledErrors.length;
    while (i) {
        if (unhandledErrors[--i]._value === promise._value) {
            // Found a promise that failed with this same error object pointer,
            // Remove that since there is a listener that actually takes care of it.
            unhandledErrors.splice(i, 1);
            return;
        }
    }
}

// By default, log uncaught errors to the console
function defaultErrorHandler(e) {
    console.warn('Unhandled rejection: ' + (e.stack || e));
}

function PromiseReject(reason) {
    return new Promise(INTERNAL, false, reason);
}

function wrap(fn, errorCatcher) {
    var psd = PSD;
    return function () {
        var wasRootExec = beginMicroTickScope(),
            outerScope = PSD;

        try {
            if (outerScope !== psd) {
                // **KEEP** outerScope.env = wrappers.snapshot(); // Snapshot outerScope's environment
                PSD = psd;
                // **KEEP** wrappers.restore(psd.env); // Restore PSD's environment.
            }
            return fn.apply(this, arguments);
        } catch (e) {
            errorCatcher && errorCatcher(e);
        } finally {
            if (outerScope !== psd) {
                PSD = outerScope;
                // **KEEP** wrappers.restore(outerScope.env); // Restore outerScope's environment
            }
            if (wasRootExec) endMicroTickScope();
        }
    };
}

function newScope(fn, a1, a2, a3) {
    var parent = PSD,
        psd = Object.create(parent);
    psd.parent = parent;
    psd.ref = 0;
    psd.global = false;
    // **KEEP** psd.env = wrappers.wrap(psd);

    // unhandleds and onunhandled should not be specifically set here.
    // Leave them on parent prototype.
    // unhandleds.push(err) will push to parent's prototype
    // onunhandled() will call parents onunhandled (with this scope's this-pointer though!)
    ++parent.ref;
    psd.finalize = function () {
        --this.parent.ref || this.parent.finalize();
    };
    var rv = usePSD(psd, fn, a1, a2, a3);
    if (psd.ref === 0) psd.finalize();
    return rv;
}

function usePSD(psd, fn, a1, a2, a3) {
    var outerScope = PSD;
    try {
        if (psd !== outerScope) {
            // **KEEP** outerScope.env = wrappers.snapshot(); // snapshot outerScope's environment.
            PSD = psd;
            // **KEEP** wrappers.restore(psd.env); // Restore PSD's environment.
        }
        return fn(a1, a2, a3);
    } finally {
        if (psd !== outerScope) {
            PSD = outerScope;
            // **KEEP** wrappers.restore(outerScope.env); // Restore outerScope's environment.
        }
    }
}

var UNHANDLEDREJECTION = "unhandledrejection";

function globalError(err, promise) {
    var rv;
    try {
        rv = promise.onuncatched(err);
    } catch (e) {}
    if (rv !== false) try {
        var event,
            eventData = { promise: promise, reason: err };
        if (_global.document && document.createEvent) {
            event = document.createEvent('Event');
            event.initEvent(UNHANDLEDREJECTION, true, true);
            extend(event, eventData);
        } else if (_global.CustomEvent) {
            event = new CustomEvent(UNHANDLEDREJECTION, { detail: eventData });
            extend(event, eventData);
        }
        if (event && _global.dispatchEvent) {
            dispatchEvent(event);
            if (!_global.PromiseRejectionEvent && _global.onunhandledrejection)
                // No native support for PromiseRejectionEvent but user has set window.onunhandledrejection. Manually call it.
                try {
                    _global.onunhandledrejection(event);
                } catch (_) {}
        }
        if (!event.defaultPrevented) {
            // Backward compatibility: fire to events registered at Promise.on.error
            Promise.on.error.fire(err, promise);
        }
    } catch (e) {}
}

/* **KEEP** 

export function wrapPromise(PromiseClass) {
    var proto = PromiseClass.prototype;
    var origThen = proto.then;
    
    wrappers.add({
        snapshot: () => proto.then,
        restore: value => {proto.then = value;},
        wrap: () => patchedThen
    });

    function patchedThen (onFulfilled, onRejected) {
        var promise = this;
        var onFulfilledProxy = wrap(function(value){
            var rv = value;
            if (onFulfilled) {
                rv = onFulfilled(rv);
                if (rv && typeof rv.then === 'function') rv.then(); // Intercept that promise as well.
            }
            --PSD.ref || PSD.finalize();
            return rv;
        });
        var onRejectedProxy = wrap(function(err){
            promise._$err = err;
            var unhandleds = PSD.unhandleds;
            var idx = unhandleds.length,
                rv;
            while (idx--) if (unhandleds[idx]._$err === err) break;
            if (onRejected) {
                if (idx !== -1) unhandleds.splice(idx, 1); // Mark as handled.
                rv = onRejected(err);
                if (rv && typeof rv.then === 'function') rv.then(); // Intercept that promise as well.
            } else {
                if (idx === -1) unhandleds.push(promise);
                rv = PromiseClass.reject(err);
                rv._$nointercept = true; // Prohibit eternal loop.
            }
            --PSD.ref || PSD.finalize();
            return rv;
        });
        
        if (this._$nointercept) return origThen.apply(this, arguments);
        ++PSD.ref;
        return origThen.call(this, onFulfilledProxy, onRejectedProxy);
    }
}

// Global Promise wrapper
if (_global.Promise) wrapPromise(_global.Promise);

*/

doFakeAutoComplete(function () {
    // Simplify the job for VS Intellisense. This piece of code is one of the keys to the new marvellous intellisense support in Dexie.
    asap$1 = function (fn, args) {
        setTimeout(function () {
            fn.apply(null, args);
        }, 0);
    };
});

function rejection(err, uncaughtHandler) {
    // Get the call stack and return a rejected promise.
    var rv = Promise.reject(err);
    return uncaughtHandler ? rv.uncaught(uncaughtHandler) : rv;
}

/*
 * Dexie.js - a minimalistic wrapper for IndexedDB
 * ===============================================
 *
 * By David Fahlander, david.fahlander@gmail.com
 *
 * Version 1.5.1, Tue Nov 01 2016
 *
 * http://dexie.org
 *
 * Apache License Version 2.0, January 2004, http://www.apache.org/licenses/
 */

var DEXIE_VERSION = '1.5.1';
var maxString = String.fromCharCode(65535);
var maxKey = function () {
    try {
        IDBKeyRange.only([[]]);return [[]];
    } catch (e) {
        return maxString;
    }
}();
var INVALID_KEY_ARGUMENT = "Invalid key provided. Keys must be of type string, number, Date or Array<string | number | Date>.";
var STRING_EXPECTED = "String expected.";
var connections = [];
var isIEOrEdge = typeof navigator !== 'undefined' && /(MSIE|Trident|Edge)/.test(navigator.userAgent);
var hasIEDeleteObjectStoreBug = isIEOrEdge;
var hangsOnDeleteLargeKeyRange = isIEOrEdge;
var dexieStackFrameFilter = function (frame) {
    return !/(dexie\.js|dexie\.min\.js)/.test(frame);
};

setDebug(debug, dexieStackFrameFilter);

function Dexie(dbName, options) {
    /// <param name="options" type="Object" optional="true">Specify only if you wich to control which addons that should run on this instance</param>
    var deps = Dexie.dependencies;
    var opts = extend({
        // Default Options
        addons: Dexie.addons, // Pick statically registered addons by default
        autoOpen: true, // Don't require db.open() explicitely.
        indexedDB: deps.indexedDB, // Backend IndexedDB api. Default to IDBShim or browser env.
        IDBKeyRange: deps.IDBKeyRange // Backend IDBKeyRange api. Default to IDBShim or browser env.
    }, options);
    var addons = opts.addons,
        autoOpen = opts.autoOpen,
        indexedDB = opts.indexedDB,
        IDBKeyRange = opts.IDBKeyRange;

    var globalSchema = this._dbSchema = {};
    var versions = [];
    var dbStoreNames = [];
    var allTables = {};
    ///<var type="IDBDatabase" />
    var idbdb = null; // Instance of IDBDatabase
    var dbOpenError = null;
    var isBeingOpened = false;
    var openComplete = false;
    var READONLY = "readonly",
        READWRITE = "readwrite";
    var db = this;
    var dbReadyResolve,
        dbReadyPromise = new Promise(function (resolve) {
        dbReadyResolve = resolve;
    }),
        cancelOpen,
        openCanceller = new Promise(function (_, reject) {
        cancelOpen = reject;
    });
    var autoSchema = true;
    var hasNativeGetDatabaseNames = !!getNativeGetDatabaseNamesFn(indexedDB),
        hasGetAll;

    function init() {
        // Default subscribers to "versionchange" and "blocked".
        // Can be overridden by custom handlers. If custom handlers return false, these default
        // behaviours will be prevented.
        db.on("versionchange", function (ev) {
            // Default behavior for versionchange event is to close database connection.
            // Caller can override this behavior by doing db.on("versionchange", function(){ return false; });
            // Let's not block the other window from making it's delete() or open() call.
            // NOTE! This event is never fired in IE,Edge or Safari.
            if (ev.newVersion > 0) console.warn('Another connection wants to upgrade database \'' + db.name + '\'. Closing db now to resume the upgrade.');else console.warn('Another connection wants to delete database \'' + db.name + '\'. Closing db now to resume the delete request.');
            db.close();
            // In many web applications, it would be recommended to force window.reload()
            // when this event occurs. To do that, subscribe to the versionchange event
            // and call window.location.reload(true) if ev.newVersion > 0 (not a deletion)
            // The reason for this is that your current web app obviously has old schema code that needs
            // to be updated. Another window got a newer version of the app and needs to upgrade DB but
            // your window is blocking it unless we close it here.
        });
        db.on("blocked", function (ev) {
            if (!ev.newVersion || ev.newVersion < ev.oldVersion) console.warn('Dexie.delete(\'' + db.name + '\') was blocked');else console.warn('Upgrade \'' + db.name + '\' blocked by other connection holding version ' + ev.oldVersion / 10);
        });
    }

    //
    //
    //
    // ------------------------- Versioning Framework---------------------------
    //
    //
    //

    this.version = function (versionNumber) {
        /// <param name="versionNumber" type="Number"></param>
        /// <returns type="Version"></returns>
        if (idbdb || isBeingOpened) throw new exceptions.Schema("Cannot add version when database is open");
        this.verno = Math.max(this.verno, versionNumber);
        var versionInstance = versions.filter(function (v) {
            return v._cfg.version === versionNumber;
        })[0];
        if (versionInstance) return versionInstance;
        versionInstance = new Version(versionNumber);
        versions.push(versionInstance);
        versions.sort(lowerVersionFirst);
        return versionInstance;
    };

    function Version(versionNumber) {
        this._cfg = {
            version: versionNumber,
            storesSource: null,
            dbschema: {},
            tables: {},
            contentUpgrade: null
        };
        this.stores({}); // Derive earlier schemas by default.
    }

    extend(Version.prototype, {
        stores: function (stores) {
            /// <summary>
            ///   Defines the schema for a particular version
            /// </summary>
            /// <param name="stores" type="Object">
            /// Example: <br/>
            ///   {users: "id++,first,last,&amp;username,*email", <br/>
            ///   passwords: "id++,&amp;username"}<br/>
            /// <br/>
            /// Syntax: {Table: "[primaryKey][++],[&amp;][*]index1,[&amp;][*]index2,..."}<br/><br/>
            /// Special characters:<br/>
            ///  "&amp;"  means unique key, <br/>
            ///  "*"  means value is multiEntry, <br/>
            ///  "++" means auto-increment and only applicable for primary key <br/>
            /// </param>
            this._cfg.storesSource = this._cfg.storesSource ? extend(this._cfg.storesSource, stores) : stores;

            // Derive stores from earlier versions if they are not explicitely specified as null or a new syntax.
            var storesSpec = {};
            versions.forEach(function (version) {
                // 'versions' is always sorted by lowest version first.
                extend(storesSpec, version._cfg.storesSource);
            });

            var dbschema = this._cfg.dbschema = {};
            this._parseStoresSpec(storesSpec, dbschema);
            // Update the latest schema to this version
            // Update API
            globalSchema = db._dbSchema = dbschema;
            removeTablesApi([allTables, db, Transaction.prototype]);
            setApiOnPlace([allTables, db, Transaction.prototype, this._cfg.tables], keys(dbschema), READWRITE, dbschema);
            dbStoreNames = keys(dbschema);
            return this;
        },
        upgrade: function (upgradeFunction) {
            /// <param name="upgradeFunction" optional="true">Function that performs upgrading actions.</param>
            var self = this;
            fakeAutoComplete(function () {
                upgradeFunction(db._createTransaction(READWRITE, keys(self._cfg.dbschema), self._cfg.dbschema)); // BUGBUG: No code completion for prev version's tables wont appear.
            });
            this._cfg.contentUpgrade = upgradeFunction;
            return this;
        },
        _parseStoresSpec: function (stores, outSchema) {
            keys(stores).forEach(function (tableName) {
                if (stores[tableName] !== null) {
                    var instanceTemplate = {};
                    var indexes = parseIndexSyntax(stores[tableName]);
                    var primKey = indexes.shift();
                    if (primKey.multi) throw new exceptions.Schema("Primary key cannot be multi-valued");
                    if (primKey.keyPath) setByKeyPath(instanceTemplate, primKey.keyPath, primKey.auto ? 0 : primKey.keyPath);
                    indexes.forEach(function (idx) {
                        if (idx.auto) throw new exceptions.Schema("Only primary key can be marked as autoIncrement (++)");
                        if (!idx.keyPath) throw new exceptions.Schema("Index must have a name and cannot be an empty string");
                        setByKeyPath(instanceTemplate, idx.keyPath, idx.compound ? idx.keyPath.map(function () {
                            return "";
                        }) : "");
                    });
                    outSchema[tableName] = new TableSchema(tableName, primKey, indexes, instanceTemplate);
                }
            });
        }
    });

    function runUpgraders(oldVersion, idbtrans, reject) {
        var trans = db._createTransaction(READWRITE, dbStoreNames, globalSchema);
        trans.create(idbtrans);
        trans._completion.catch(reject);
        var rejectTransaction = trans._reject.bind(trans);
        newScope(function () {
            PSD.trans = trans;
            if (oldVersion === 0) {
                // Create tables:
                keys(globalSchema).forEach(function (tableName) {
                    createTable(idbtrans, tableName, globalSchema[tableName].primKey, globalSchema[tableName].indexes);
                });
                Promise.follow(function () {
                    return db.on.populate.fire(trans);
                }).catch(rejectTransaction);
            } else updateTablesAndIndexes(oldVersion, trans, idbtrans).catch(rejectTransaction);
        });
    }

    function updateTablesAndIndexes(oldVersion, trans, idbtrans) {
        // Upgrade version to version, step-by-step from oldest to newest version.
        // Each transaction object will contain the table set that was current in that version (but also not-yet-deleted tables from its previous version)
        var queue = [];
        var oldVersionStruct = versions.filter(function (version) {
            return version._cfg.version === oldVersion;
        })[0];
        if (!oldVersionStruct) throw new exceptions.Upgrade("Dexie specification of currently installed DB version is missing");
        globalSchema = db._dbSchema = oldVersionStruct._cfg.dbschema;
        var anyContentUpgraderHasRun = false;

        var versToRun = versions.filter(function (v) {
            return v._cfg.version > oldVersion;
        });
        versToRun.forEach(function (version) {
            /// <param name="version" type="Version"></param>
            queue.push(function () {
                var oldSchema = globalSchema;
                var newSchema = version._cfg.dbschema;
                adjustToExistingIndexNames(oldSchema, idbtrans);
                adjustToExistingIndexNames(newSchema, idbtrans);
                globalSchema = db._dbSchema = newSchema;
                var diff = getSchemaDiff(oldSchema, newSchema);
                // Add tables           
                diff.add.forEach(function (tuple) {
                    createTable(idbtrans, tuple[0], tuple[1].primKey, tuple[1].indexes);
                });
                // Change tables
                diff.change.forEach(function (change) {
                    if (change.recreate) {
                        throw new exceptions.Upgrade("Not yet support for changing primary key");
                    } else {
                        var store = idbtrans.objectStore(change.name);
                        // Add indexes
                        change.add.forEach(function (idx) {
                            addIndex(store, idx);
                        });
                        // Update indexes
                        change.change.forEach(function (idx) {
                            store.deleteIndex(idx.name);
                            addIndex(store, idx);
                        });
                        // Delete indexes
                        change.del.forEach(function (idxName) {
                            store.deleteIndex(idxName);
                        });
                    }
                });
                if (version._cfg.contentUpgrade) {
                    anyContentUpgraderHasRun = true;
                    return Promise.follow(function () {
                        version._cfg.contentUpgrade(trans);
                    });
                }
            });
            queue.push(function (idbtrans) {
                if (!anyContentUpgraderHasRun || !hasIEDeleteObjectStoreBug) {
                    // Dont delete old tables if ieBug is present and a content upgrader has run. Let tables be left in DB so far. This needs to be taken care of.
                    var newSchema = version._cfg.dbschema;
                    // Delete old tables
                    deleteRemovedTables(newSchema, idbtrans);
                }
            });
        });

        // Now, create a queue execution engine
        function runQueue() {
            return queue.length ? Promise.resolve(queue.shift()(trans.idbtrans)).then(runQueue) : Promise.resolve();
        }

        return runQueue().then(function () {
            createMissingTables(globalSchema, idbtrans); // At last, make sure to create any missing tables. (Needed by addons that add stores to DB without specifying version)
        });
    }

    function getSchemaDiff(oldSchema, newSchema) {
        var diff = {
            del: [], // Array of table names
            add: [], // Array of [tableName, newDefinition]
            change: [] // Array of {name: tableName, recreate: newDefinition, del: delIndexNames, add: newIndexDefs, change: changedIndexDefs}
        };
        for (var table in oldSchema) {
            if (!newSchema[table]) diff.del.push(table);
        }
        for (table in newSchema) {
            var oldDef = oldSchema[table],
                newDef = newSchema[table];
            if (!oldDef) {
                diff.add.push([table, newDef]);
            } else {
                var change = {
                    name: table,
                    def: newDef,
                    recreate: false,
                    del: [],
                    add: [],
                    change: []
                };
                if (oldDef.primKey.src !== newDef.primKey.src) {
                    // Primary key has changed. Remove and re-add table.
                    change.recreate = true;
                    diff.change.push(change);
                } else {
                    // Same primary key. Just find out what differs:
                    var oldIndexes = oldDef.idxByName;
                    var newIndexes = newDef.idxByName;
                    for (var idxName in oldIndexes) {
                        if (!newIndexes[idxName]) change.del.push(idxName);
                    }
                    for (idxName in newIndexes) {
                        var oldIdx = oldIndexes[idxName],
                            newIdx = newIndexes[idxName];
                        if (!oldIdx) change.add.push(newIdx);else if (oldIdx.src !== newIdx.src) change.change.push(newIdx);
                    }
                    if (change.del.length > 0 || change.add.length > 0 || change.change.length > 0) {
                        diff.change.push(change);
                    }
                }
            }
        }
        return diff;
    }

    function createTable(idbtrans, tableName, primKey, indexes) {
        /// <param name="idbtrans" type="IDBTransaction"></param>
        var store = idbtrans.db.createObjectStore(tableName, primKey.keyPath ? { keyPath: primKey.keyPath, autoIncrement: primKey.auto } : { autoIncrement: primKey.auto });
        indexes.forEach(function (idx) {
            addIndex(store, idx);
        });
        return store;
    }

    function createMissingTables(newSchema, idbtrans) {
        keys(newSchema).forEach(function (tableName) {
            if (!idbtrans.db.objectStoreNames.contains(tableName)) {
                createTable(idbtrans, tableName, newSchema[tableName].primKey, newSchema[tableName].indexes);
            }
        });
    }

    function deleteRemovedTables(newSchema, idbtrans) {
        for (var i = 0; i < idbtrans.db.objectStoreNames.length; ++i) {
            var storeName = idbtrans.db.objectStoreNames[i];
            if (newSchema[storeName] == null) {
                idbtrans.db.deleteObjectStore(storeName);
            }
        }
    }

    function addIndex(store, idx) {
        store.createIndex(idx.name, idx.keyPath, { unique: idx.unique, multiEntry: idx.multi });
    }

    function dbUncaught(err) {
        return db.on.error.fire(err);
    }

    //
    //
    //      Dexie Protected API
    //
    //

    this._allTables = allTables;

    this._tableFactory = function createTable(mode, tableSchema) {
        /// <param name="tableSchema" type="TableSchema"></param>
        if (mode === READONLY) return new Table(tableSchema.name, tableSchema, Collection);else return new WriteableTable(tableSchema.name, tableSchema);
    };

    this._createTransaction = function (mode, storeNames, dbschema, parentTransaction) {
        return new Transaction(mode, storeNames, dbschema, parentTransaction);
    };

    /* Generate a temporary transaction when db operations are done outside a transactino scope.
    */
    function tempTransaction(mode, storeNames, fn) {
        // Last argument is "writeLocked". But this doesnt apply to oneshot direct db operations, so we ignore it.
        if (!openComplete && !PSD.letThrough) {
            if (!isBeingOpened) {
                if (!autoOpen) return rejection(new exceptions.DatabaseClosed(), dbUncaught);
                db.open().catch(nop); // Open in background. If if fails, it will be catched by the final promise anyway.
            }
            return dbReadyPromise.then(function () {
                return tempTransaction(mode, storeNames, fn);
            });
        } else {
            var trans = db._createTransaction(mode, storeNames, globalSchema);
            return trans._promise(mode, function (resolve, reject) {
                newScope(function () {
                    // OPTIMIZATION POSSIBLE? newScope() not needed because it's already done in _promise.
                    PSD.trans = trans;
                    fn(resolve, reject, trans);
                });
            }).then(function (result) {
                // Instead of resolving value directly, wait with resolving it until transaction has completed.
                // Otherwise the data would not be in the DB if requesting it in the then() operation.
                // Specifically, to ensure that the following expression will work:
                //
                //   db.friends.put({name: "Arne"}).then(function () {
                //       db.friends.where("name").equals("Arne").count(function(count) {
                //           assert (count === 1);
                //       });
                //   });
                //
                return trans._completion.then(function () {
                    return result;
                });
            }); /*.catch(err => { // Don't do this as of now. If would affect bulk- and modify methods in a way that could be more intuitive. But wait! Maybe change in next major.
                 trans._reject(err);
                 return rejection(err);
                });*/
        }
    }

    this._whenReady = function (fn) {
        return new Promise(fake || openComplete || PSD.letThrough ? fn : function (resolve, reject) {
            if (!isBeingOpened) {
                if (!autoOpen) {
                    reject(new exceptions.DatabaseClosed());
                    return;
                }
                db.open().catch(nop); // Open in background. If if fails, it will be catched by the final promise anyway.
            }
            dbReadyPromise.then(function () {
                fn(resolve, reject);
            });
        }).uncaught(dbUncaught);
    };

    //
    //
    //
    //
    //      Dexie API
    //
    //
    //

    this.verno = 0;

    this.open = function () {
        if (isBeingOpened || idbdb) return dbReadyPromise.then(function () {
            return dbOpenError ? rejection(dbOpenError, dbUncaught) : db;
        });
        debug && (openCanceller._stackHolder = getErrorWithStack()); // Let stacks point to when open() was called rather than where new Dexie() was called.
        isBeingOpened = true;
        dbOpenError = null;
        openComplete = false;

        // Function pointers to call when the core opening process completes.
        var resolveDbReady = dbReadyResolve,

        // upgradeTransaction to abort on failure.
        upgradeTransaction = null;

        return Promise.race([openCanceller, new Promise(function (resolve, reject) {
            doFakeAutoComplete(function () {
                return resolve();
            });

            // Make sure caller has specified at least one version
            if (versions.length > 0) autoSchema = false;

            // Multiply db.verno with 10 will be needed to workaround upgrading bug in IE:
            // IE fails when deleting objectStore after reading from it.
            // A future version of Dexie.js will stopover an intermediate version to workaround this.
            // At that point, we want to be backward compatible. Could have been multiplied with 2, but by using 10, it is easier to map the number to the real version number.

            // If no API, throw!
            if (!indexedDB) throw new exceptions.MissingAPI("indexedDB API not found. If using IE10+, make sure to run your code on a server URL " + "(not locally). If using old Safari versions, make sure to include indexedDB polyfill.");

            var req = autoSchema ? indexedDB.open(dbName) : indexedDB.open(dbName, Math.round(db.verno * 10));
            if (!req) throw new exceptions.MissingAPI("IndexedDB API not available"); // May happen in Safari private mode, see https://github.com/dfahlander/Dexie.js/issues/134
            req.onerror = wrap(eventRejectHandler(reject));
            req.onblocked = wrap(fireOnBlocked);
            req.onupgradeneeded = wrap(function (e) {
                upgradeTransaction = req.transaction;
                if (autoSchema && !db._allowEmptyDB) {
                    // Unless an addon has specified db._allowEmptyDB, lets make the call fail.
                    // Caller did not specify a version or schema. Doing that is only acceptable for opening alread existing databases.
                    // If onupgradeneeded is called it means database did not exist. Reject the open() promise and make sure that we
                    // do not create a new database by accident here.
                    req.onerror = preventDefault; // Prohibit onabort error from firing before we're done!
                    upgradeTransaction.abort(); // Abort transaction (would hope that this would make DB disappear but it doesnt.)
                    // Close database and delete it.
                    req.result.close();
                    var delreq = indexedDB.deleteDatabase(dbName); // The upgrade transaction is atomic, and javascript is single threaded - meaning that there is no risk that we delete someone elses database here!
                    delreq.onsuccess = delreq.onerror = wrap(function () {
                        reject(new exceptions.NoSuchDatabase('Database ' + dbName + ' doesnt exist'));
                    });
                } else {
                    upgradeTransaction.onerror = wrap(eventRejectHandler(reject));
                    var oldVer = e.oldVersion > Math.pow(2, 62) ? 0 : e.oldVersion; // Safari 8 fix.
                    runUpgraders(oldVer / 10, upgradeTransaction, reject, req);
                }
            }, reject);

            req.onsuccess = wrap(function () {
                // Core opening procedure complete. Now let's just record some stuff.
                upgradeTransaction = null;
                idbdb = req.result;
                connections.push(db); // Used for emulating versionchange event on IE/Edge/Safari.

                if (autoSchema) readGlobalSchema();else if (idbdb.objectStoreNames.length > 0) {
                    try {
                        adjustToExistingIndexNames(globalSchema, idbdb.transaction(safariMultiStoreFix(idbdb.objectStoreNames), READONLY));
                    } catch (e) {
                        // Safari may bail out if > 1 store names. However, this shouldnt be a showstopper. Issue #120.
                    }
                }

                idbdb.onversionchange = wrap(function (ev) {
                    db._vcFired = true; // detect implementations that not support versionchange (IE/Edge/Safari)
                    db.on("versionchange").fire(ev);
                });

                if (!hasNativeGetDatabaseNames) {
                    // Update localStorage with list of database names
                    globalDatabaseList(function (databaseNames) {
                        if (databaseNames.indexOf(dbName) === -1) return databaseNames.push(dbName);
                    });
                }

                resolve();
            }, reject);
        })]).then(function () {
            // Before finally resolving the dbReadyPromise and this promise,
            // call and await all on('ready') subscribers:
            // Dexie.vip() makes subscribers able to use the database while being opened.
            // This is a must since these subscribers take part of the opening procedure.
            return Dexie.vip(db.on.ready.fire);
        }).then(function () {
            // Resolve the db.open() with the db instance.
            isBeingOpened = false;
            return db;
        }).catch(function (err) {
            try {
                // Did we fail within onupgradeneeded? Make sure to abort the upgrade transaction so it doesnt commit.
                upgradeTransaction && upgradeTransaction.abort();
            } catch (e) {}
            isBeingOpened = false; // Set before calling db.close() so that it doesnt reject openCanceller again (leads to unhandled rejection event).
            db.close(); // Closes and resets idbdb, removes connections, resets dbReadyPromise and openCanceller so that a later db.open() is fresh.
            // A call to db.close() may have made on-ready subscribers fail. Use dbOpenError if set, since err could be a follow-up error on that.
            dbOpenError = err; // Record the error. It will be used to reject further promises of db operations.
            return rejection(dbOpenError, dbUncaught); // dbUncaught will make sure any error that happened in any operation before will now bubble to db.on.error() thanks to the special handling in Promise.uncaught().
        }).finally(function () {
            openComplete = true;
            resolveDbReady(); // dbReadyPromise is resolved no matter if open() rejects or resolved. It's just to wake up waiters.
        });
    };

    this.close = function () {
        var idx = connections.indexOf(db);
        if (idx >= 0) connections.splice(idx, 1);
        if (idbdb) {
            try {
                idbdb.close();
            } catch (e) {}
            idbdb = null;
        }
        autoOpen = false;
        dbOpenError = new exceptions.DatabaseClosed();
        if (isBeingOpened) cancelOpen(dbOpenError);
        // Reset dbReadyPromise promise:
        dbReadyPromise = new Promise(function (resolve) {
            dbReadyResolve = resolve;
        });
        openCanceller = new Promise(function (_, reject) {
            cancelOpen = reject;
        });
    };

    this.delete = function () {
        var hasArguments = arguments.length > 0;
        return new Promise(function (resolve, reject) {
            if (hasArguments) throw new exceptions.InvalidArgument("Arguments not allowed in db.delete()");
            if (isBeingOpened) {
                dbReadyPromise.then(doDelete);
            } else {
                doDelete();
            }
            function doDelete() {
                db.close();
                var req = indexedDB.deleteDatabase(dbName);
                req.onsuccess = wrap(function () {
                    if (!hasNativeGetDatabaseNames) {
                        globalDatabaseList(function (databaseNames) {
                            var pos = databaseNames.indexOf(dbName);
                            if (pos >= 0) return databaseNames.splice(pos, 1);
                        });
                    }
                    resolve();
                });
                req.onerror = wrap(eventRejectHandler(reject));
                req.onblocked = fireOnBlocked;
            }
        }).uncaught(dbUncaught);
    };

    this.backendDB = function () {
        return idbdb;
    };

    this.isOpen = function () {
        return idbdb !== null;
    };
    this.hasFailed = function () {
        return dbOpenError !== null;
    };
    this.dynamicallyOpened = function () {
        return autoSchema;
    };

    //
    // Properties
    //
    this.name = dbName;

    // db.tables - an array of all Table instances.
    setProp(this, "tables", {
        get: function () {
            /// <returns type="Array" elementType="WriteableTable" />
            return keys(allTables).map(function (name) {
                return allTables[name];
            });
        }
    });

    //
    // Events
    //
    this.on = Events(this, "error", "populate", "blocked", "versionchange", { ready: [promisableChain, nop] });
    this.on.error.subscribe = deprecated("Dexie.on.error", this.on.error.subscribe);
    this.on.error.unsubscribe = deprecated("Dexie.on.error.unsubscribe", this.on.error.unsubscribe);

    this.on.ready.subscribe = override(this.on.ready.subscribe, function (subscribe) {
        return function (subscriber, bSticky) {
            Dexie.vip(function () {
                if (openComplete) {
                    // Database already open. Call subscriber asap.
                    if (!dbOpenError) Promise.resolve().then(subscriber);
                    // bSticky: Also subscribe to future open sucesses (after close / reopen) 
                    if (bSticky) subscribe(subscriber);
                } else {
                    // Database not yet open. Subscribe to it.
                    subscribe(subscriber);
                    // If bSticky is falsy, make sure to unsubscribe subscriber when fired once.
                    if (!bSticky) subscribe(function unsubscribe() {
                        db.on.ready.unsubscribe(subscriber);
                        db.on.ready.unsubscribe(unsubscribe);
                    });
                }
            });
        };
    });

    fakeAutoComplete(function () {
        db.on("populate").fire(db._createTransaction(READWRITE, dbStoreNames, globalSchema));
        db.on("error").fire(new Error());
    });

    this.transaction = function (mode, tableInstances, scopeFunc) {
        /// <summary>
        ///
        /// </summary>
        /// <param name="mode" type="String">"r" for readonly, or "rw" for readwrite</param>
        /// <param name="tableInstances">Table instance, Array of Table instances, String or String Array of object stores to include in the transaction</param>
        /// <param name="scopeFunc" type="Function">Function to execute with transaction</param>

        // Let table arguments be all arguments between mode and last argument.
        var i = arguments.length;
        if (i < 2) throw new exceptions.InvalidArgument("Too few arguments");
        // Prevent optimzation killer (https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#32-leaking-arguments)
        // and clone arguments except the first one into local var 'args'.
        var args = new Array(i - 1);
        while (--i) {
            args[i - 1] = arguments[i];
        } // Let scopeFunc be the last argument and pop it so that args now only contain the table arguments.
        scopeFunc = args.pop();
        var tables = flatten(args); // Support using array as middle argument, or a mix of arrays and non-arrays.
        var parentTransaction = PSD.trans;
        // Check if parent transactions is bound to this db instance, and if caller wants to reuse it
        if (!parentTransaction || parentTransaction.db !== db || mode.indexOf('!') !== -1) parentTransaction = null;
        var onlyIfCompatible = mode.indexOf('?') !== -1;
        mode = mode.replace('!', '').replace('?', ''); // Ok. Will change arguments[0] as well but we wont touch arguments henceforth.

        try {
            //
            // Get storeNames from arguments. Either through given table instances, or through given table names.
            //
            var storeNames = tables.map(function (table) {
                var storeName = table instanceof Table ? table.name : table;
                if (typeof storeName !== 'string') throw new TypeError("Invalid table argument to Dexie.transaction(). Only Table or String are allowed");
                return storeName;
            });

            //
            // Resolve mode. Allow shortcuts "r" and "rw".
            //
            if (mode == "r" || mode == READONLY) mode = READONLY;else if (mode == "rw" || mode == READWRITE) mode = READWRITE;else throw new exceptions.InvalidArgument("Invalid transaction mode: " + mode);

            if (parentTransaction) {
                // Basic checks
                if (parentTransaction.mode === READONLY && mode === READWRITE) {
                    if (onlyIfCompatible) {
                        // Spawn new transaction instead.
                        parentTransaction = null;
                    } else throw new exceptions.SubTransaction("Cannot enter a sub-transaction with READWRITE mode when parent transaction is READONLY");
                }
                if (parentTransaction) {
                    storeNames.forEach(function (storeName) {
                        if (parentTransaction && parentTransaction.storeNames.indexOf(storeName) === -1) {
                            if (onlyIfCompatible) {
                                // Spawn new transaction instead.
                                parentTransaction = null;
                            } else throw new exceptions.SubTransaction("Table " + storeName + " not included in parent transaction.");
                        }
                    });
                }
            }
        } catch (e) {
            return parentTransaction ? parentTransaction._promise(null, function (_, reject) {
                reject(e);
            }) : rejection(e, dbUncaught);
        }
        // If this is a sub-transaction, lock the parent and then launch the sub-transaction.
        return parentTransaction ? parentTransaction._promise(mode, enterTransactionScope, "lock") : db._whenReady(enterTransactionScope);

        function enterTransactionScope(resolve) {
            var parentPSD = PSD;
            resolve(Promise.resolve().then(function () {
                return newScope(function () {
                    // Keep a pointer to last non-transactional PSD to use if someone calls Dexie.ignoreTransaction().
                    PSD.transless = PSD.transless || parentPSD;
                    // Our transaction.
                    //return new Promise((resolve, reject) => {
                    var trans = db._createTransaction(mode, storeNames, globalSchema, parentTransaction);
                    // Let the transaction instance be part of a Promise-specific data (PSD) value.
                    PSD.trans = trans;

                    if (parentTransaction) {
                        // Emulate transaction commit awareness for inner transaction (must 'commit' when the inner transaction has no more operations ongoing)
                        trans.idbtrans = parentTransaction.idbtrans;
                    } else {
                        trans.create(); // Create the backend transaction so that complete() or error() will trigger even if no operation is made upon it.
                    }

                    // Provide arguments to the scope function (for backward compatibility)
                    var tableArgs = storeNames.map(function (name) {
                        return allTables[name];
                    });
                    tableArgs.push(trans);

                    var returnValue;
                    return Promise.follow(function () {
                        // Finally, call the scope function with our table and transaction arguments.
                        returnValue = scopeFunc.apply(trans, tableArgs); // NOTE: returnValue is used in trans.on.complete() not as a returnValue to this func.
                        if (returnValue) {
                            if (typeof returnValue.next === 'function' && typeof returnValue.throw === 'function') {
                                // scopeFunc returned an iterator with throw-support. Handle yield as await.
                                returnValue = awaitIterator(returnValue);
                            } else if (typeof returnValue.then === 'function' && !hasOwn(returnValue, '_PSD')) {
                                throw new exceptions.IncompatiblePromise("Incompatible Promise returned from transaction scope (read more at http://tinyurl.com/znyqjqc). Transaction scope: " + scopeFunc.toString());
                            }
                        }
                    }).uncaught(dbUncaught).then(function () {
                        if (parentTransaction) trans._resolve(); // sub transactions don't react to idbtrans.oncomplete. We must trigger a acompletion.
                        return trans._completion; // Even if WE believe everything is fine. Await IDBTransaction's oncomplete or onerror as well.
                    }).then(function () {
                        return returnValue;
                    }).catch(function (e) {
                        //reject(e);
                        trans._reject(e); // Yes, above then-handler were maybe not called because of an unhandled rejection in scopeFunc!
                        return rejection(e);
                    });
                    //});
                });
            }));
        }
    };

    this.table = function (tableName) {
        /// <returns type="WriteableTable"></returns>
        if (fake && autoSchema) return new WriteableTable(tableName);
        if (!hasOwn(allTables, tableName)) {
            throw new exceptions.InvalidTable('Table ' + tableName + ' does not exist');
        }
        return allTables[tableName];
    };

    //
    //
    //
    // Table Class
    //
    //
    //
    function Table(name, tableSchema, collClass) {
        /// <param name="name" type="String"></param>
        this.name = name;
        this.schema = tableSchema;
        this.hook = allTables[name] ? allTables[name].hook : Events(null, {
            "creating": [hookCreatingChain, nop],
            "reading": [pureFunctionChain, mirror],
            "updating": [hookUpdatingChain, nop],
            "deleting": [hookDeletingChain, nop]
        });
        this._collClass = collClass || Collection;
    }

    props(Table.prototype, {

        //
        // Table Protected Methods
        //

        _trans: function getTransaction(mode, fn, writeLocked) {
            var trans = PSD.trans;
            return trans && trans.db === db ? trans._promise(mode, fn, writeLocked) : tempTransaction(mode, [this.name], fn);
        },
        _idbstore: function getIDBObjectStore(mode, fn, writeLocked) {
            if (fake) return new Promise(fn); // Simplify the work for Intellisense/Code completion.
            var trans = PSD.trans,
                tableName = this.name;
            function supplyIdbStore(resolve, reject, trans) {
                fn(resolve, reject, trans.idbtrans.objectStore(tableName), trans);
            }
            return trans && trans.db === db ? trans._promise(mode, supplyIdbStore, writeLocked) : tempTransaction(mode, [this.name], supplyIdbStore);
        },

        //
        // Table Public Methods
        //
        get: function (key, cb) {
            var self = this;
            return this._idbstore(READONLY, function (resolve, reject, idbstore) {
                fake && resolve(self.schema.instanceTemplate);
                var req = idbstore.get(key);
                req.onerror = eventRejectHandler(reject);
                req.onsuccess = wrap(function () {
                    resolve(self.hook.reading.fire(req.result));
                }, reject);
            }).then(cb);
        },
        where: function (indexName) {
            return new WhereClause(this, indexName);
        },
        count: function (cb) {
            return this.toCollection().count(cb);
        },
        offset: function (offset) {
            return this.toCollection().offset(offset);
        },
        limit: function (numRows) {
            return this.toCollection().limit(numRows);
        },
        reverse: function () {
            return this.toCollection().reverse();
        },
        filter: function (filterFunction) {
            return this.toCollection().and(filterFunction);
        },
        each: function (fn) {
            return this.toCollection().each(fn);
        },
        toArray: function (cb) {
            return this.toCollection().toArray(cb);
        },
        orderBy: function (index) {
            return new this._collClass(new WhereClause(this, index));
        },

        toCollection: function () {
            return new this._collClass(new WhereClause(this));
        },

        mapToClass: function (constructor, structure) {
            /// <summary>
            ///     Map table to a javascript constructor function. Objects returned from the database will be instances of this class, making
            ///     it possible to the instanceOf operator as well as extending the class using constructor.prototype.method = function(){...}.
            /// </summary>
            /// <param name="constructor">Constructor function representing the class.</param>
            /// <param name="structure" optional="true">Helps IDE code completion by knowing the members that objects contain and not just the indexes. Also
            /// know what type each member has. Example: {name: String, emailAddresses: [String], password}</param>
            this.schema.mappedClass = constructor;
            var instanceTemplate = Object.create(constructor.prototype);
            if (structure) {
                // structure and instanceTemplate is for IDE code competion only while constructor.prototype is for actual inheritance.
                applyStructure(instanceTemplate, structure);
            }
            this.schema.instanceTemplate = instanceTemplate;

            // Now, subscribe to the when("reading") event to make all objects that come out from this table inherit from given class
            // no matter which method to use for reading (Table.get() or Table.where(...)... )
            var readHook = function (obj) {
                if (!obj) return obj; // No valid object. (Value is null). Return as is.
                // Create a new object that derives from constructor:
                var res = Object.create(constructor.prototype);
                // Clone members:
                for (var m in obj) {
                    if (hasOwn(obj, m)) try {
                        res[m] = obj[m];
                    } catch (_) {}
                }return res;
            };

            if (this.schema.readHook) {
                this.hook.reading.unsubscribe(this.schema.readHook);
            }
            this.schema.readHook = readHook;
            this.hook("reading", readHook);
            return constructor;
        },
        defineClass: function (structure) {
            /// <summary>
            ///     Define all members of the class that represents the table. This will help code completion of when objects are read from the database
            ///     as well as making it possible to extend the prototype of the returned constructor function.
            /// </summary>
            /// <param name="structure">Helps IDE code completion by knowing the members that objects contain and not just the indexes. Also
            /// know what type each member has. Example: {name: String, emailAddresses: [String], properties: {shoeSize: Number}}</param>
            return this.mapToClass(Dexie.defineClass(structure), structure);
        }
    });

    //
    //
    //
    // WriteableTable Class (extends Table)
    //
    //
    //
    function WriteableTable(name, tableSchema, collClass) {
        Table.call(this, name, tableSchema, collClass || WriteableCollection);
    }

    function BulkErrorHandlerCatchAll(errorList, done, supportHooks) {
        return (supportHooks ? hookedEventRejectHandler : eventRejectHandler)(function (e) {
            errorList.push(e);
            done && done();
        });
    }

    function bulkDelete(idbstore, trans, keysOrTuples, hasDeleteHook, deletingHook) {
        // If hasDeleteHook, keysOrTuples must be an array of tuples: [[key1, value2],[key2,value2],...],
        // else keysOrTuples must be just an array of keys: [key1, key2, ...].
        return new Promise(function (resolve, reject) {
            var len = keysOrTuples.length,
                lastItem = len - 1;
            if (len === 0) return resolve();
            if (!hasDeleteHook) {
                for (var i = 0; i < len; ++i) {
                    var req = idbstore.delete(keysOrTuples[i]);
                    req.onerror = wrap(eventRejectHandler(reject));
                    if (i === lastItem) req.onsuccess = wrap(function () {
                        return resolve();
                    });
                }
            } else {
                var hookCtx,
                    errorHandler = hookedEventRejectHandler(reject),
                    successHandler = hookedEventSuccessHandler(null);
                tryCatch(function () {
                    for (var i = 0; i < len; ++i) {
                        hookCtx = { onsuccess: null, onerror: null };
                        var tuple = keysOrTuples[i];
                        deletingHook.call(hookCtx, tuple[0], tuple[1], trans);
                        var req = idbstore.delete(tuple[0]);
                        req._hookCtx = hookCtx;
                        req.onerror = errorHandler;
                        if (i === lastItem) req.onsuccess = hookedEventSuccessHandler(resolve);else req.onsuccess = successHandler;
                    }
                }, function (err) {
                    hookCtx.onerror && hookCtx.onerror(err);
                    throw err;
                });
            }
        }).uncaught(dbUncaught);
    }

    derive(WriteableTable).from(Table).extend({
        bulkDelete: function (keys$$1) {
            if (this.hook.deleting.fire === nop) {
                return this._idbstore(READWRITE, function (resolve, reject, idbstore, trans) {
                    resolve(bulkDelete(idbstore, trans, keys$$1, false, nop));
                });
            } else {
                return this.where(':id').anyOf(keys$$1).delete().then(function () {}); // Resolve with undefined.
            }
        },
        bulkPut: function (objects, keys$$1) {
            var _this = this;

            return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                if (!idbstore.keyPath && !_this.schema.primKey.auto && !keys$$1) throw new exceptions.InvalidArgument("bulkPut() with non-inbound keys requires keys array in second argument");
                if (idbstore.keyPath && keys$$1) throw new exceptions.InvalidArgument("bulkPut(): keys argument invalid on tables with inbound keys");
                if (keys$$1 && keys$$1.length !== objects.length) throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
                if (objects.length === 0) return resolve(); // Caller provided empty list.
                var done = function (result) {
                    if (errorList.length === 0) resolve(result);else reject(new BulkError(_this.name + '.bulkPut(): ' + errorList.length + ' of ' + numObjs + ' operations failed', errorList));
                };
                var req,
                    errorList = [],
                    errorHandler,
                    numObjs = objects.length,
                    table = _this;
                if (_this.hook.creating.fire === nop && _this.hook.updating.fire === nop) {
                    //
                    // Standard Bulk (no 'creating' or 'updating' hooks to care about)
                    //
                    errorHandler = BulkErrorHandlerCatchAll(errorList);
                    for (var i = 0, l = objects.length; i < l; ++i) {
                        req = keys$$1 ? idbstore.put(objects[i], keys$$1[i]) : idbstore.put(objects[i]);
                        req.onerror = errorHandler;
                    }
                    // Only need to catch success or error on the last operation
                    // according to the IDB spec.
                    req.onerror = BulkErrorHandlerCatchAll(errorList, done);
                    req.onsuccess = eventSuccessHandler(done);
                } else {
                    var effectiveKeys = keys$$1 || idbstore.keyPath && objects.map(function (o) {
                        return getByKeyPath(o, idbstore.keyPath);
                    });
                    // Generate map of {[key]: object}
                    var objectLookup = effectiveKeys && arrayToObject(effectiveKeys, function (key, i) {
                        return key != null && [key, objects[i]];
                    });
                    var promise = !effectiveKeys ?

                    // Auto-incremented key-less objects only without any keys argument.
                    table.bulkAdd(objects) :

                    // Keys provided. Either as inbound in provided objects, or as a keys argument.
                    // Begin with updating those that exists in DB:
                    table.where(':id').anyOf(effectiveKeys.filter(function (key) {
                        return key != null;
                    })).modify(function () {
                        this.value = objectLookup[this.primKey];
                        objectLookup[this.primKey] = null; // Mark as "don't add this"
                    }).catch(ModifyError, function (e) {
                        errorList = e.failures; // No need to concat here. These are the first errors added.
                    }).then(function () {
                        // Now, let's examine which items didnt exist so we can add them:
                        var objsToAdd = [],
                            keysToAdd = keys$$1 && [];
                        // Iterate backwards. Why? Because if same key was used twice, just add the last one.
                        for (var i = effectiveKeys.length - 1; i >= 0; --i) {
                            var key = effectiveKeys[i];
                            if (key == null || objectLookup[key]) {
                                objsToAdd.push(objects[i]);
                                keys$$1 && keysToAdd.push(key);
                                if (key != null) objectLookup[key] = null; // Mark as "dont add again"
                            }
                        }
                        // The items are in reverse order so reverse them before adding.
                        // Could be important in order to get auto-incremented keys the way the caller
                        // would expect. Could have used unshift instead of push()/reverse(),
                        // but: http://jsperf.com/unshift-vs-reverse
                        objsToAdd.reverse();
                        keys$$1 && keysToAdd.reverse();
                        return table.bulkAdd(objsToAdd, keysToAdd);
                    }).then(function (lastAddedKey) {
                        // Resolve with key of the last object in given arguments to bulkPut():
                        var lastEffectiveKey = effectiveKeys[effectiveKeys.length - 1]; // Key was provided.
                        return lastEffectiveKey != null ? lastEffectiveKey : lastAddedKey;
                    });

                    promise.then(done).catch(BulkError, function (e) {
                        // Concat failure from ModifyError and reject using our 'done' method.
                        errorList = errorList.concat(e.failures);
                        done();
                    }).catch(reject);
                }
            }, "locked"); // If called from transaction scope, lock transaction til all steps are done.
        },
        bulkAdd: function (objects, keys$$1) {
            var self = this,
                creatingHook = this.hook.creating.fire;
            return this._idbstore(READWRITE, function (resolve, reject, idbstore, trans) {
                if (!idbstore.keyPath && !self.schema.primKey.auto && !keys$$1) throw new exceptions.InvalidArgument("bulkAdd() with non-inbound keys requires keys array in second argument");
                if (idbstore.keyPath && keys$$1) throw new exceptions.InvalidArgument("bulkAdd(): keys argument invalid on tables with inbound keys");
                if (keys$$1 && keys$$1.length !== objects.length) throw new exceptions.InvalidArgument("Arguments objects and keys must have the same length");
                if (objects.length === 0) return resolve(); // Caller provided empty list.
                function done(result) {
                    if (errorList.length === 0) resolve(result);else reject(new BulkError(self.name + '.bulkAdd(): ' + errorList.length + ' of ' + numObjs + ' operations failed', errorList));
                }
                var req,
                    errorList = [],
                    errorHandler,
                    successHandler,
                    numObjs = objects.length;
                if (creatingHook !== nop) {
                    //
                    // There are subscribers to hook('creating')
                    // Must behave as documented.
                    //
                    var keyPath = idbstore.keyPath,
                        hookCtx;
                    errorHandler = BulkErrorHandlerCatchAll(errorList, null, true);
                    successHandler = hookedEventSuccessHandler(null);

                    tryCatch(function () {
                        for (var i = 0, l = objects.length; i < l; ++i) {
                            hookCtx = { onerror: null, onsuccess: null };
                            var key = keys$$1 && keys$$1[i];
                            var obj = objects[i],
                                effectiveKey = keys$$1 ? key : keyPath ? getByKeyPath(obj, keyPath) : undefined,
                                keyToUse = creatingHook.call(hookCtx, effectiveKey, obj, trans);
                            if (effectiveKey == null && keyToUse != null) {
                                if (keyPath) {
                                    obj = deepClone(obj);
                                    setByKeyPath(obj, keyPath, keyToUse);
                                } else {
                                    key = keyToUse;
                                }
                            }
                            req = key != null ? idbstore.add(obj, key) : idbstore.add(obj);
                            req._hookCtx = hookCtx;
                            if (i < l - 1) {
                                req.onerror = errorHandler;
                                if (hookCtx.onsuccess) req.onsuccess = successHandler;
                            }
                        }
                    }, function (err) {
                        hookCtx.onerror && hookCtx.onerror(err);
                        throw err;
                    });

                    req.onerror = BulkErrorHandlerCatchAll(errorList, done, true);
                    req.onsuccess = hookedEventSuccessHandler(done);
                } else {
                    //
                    // Standard Bulk (no 'creating' hook to care about)
                    //
                    errorHandler = BulkErrorHandlerCatchAll(errorList);
                    for (var i = 0, l = objects.length; i < l; ++i) {
                        req = keys$$1 ? idbstore.add(objects[i], keys$$1[i]) : idbstore.add(objects[i]);
                        req.onerror = errorHandler;
                    }
                    // Only need to catch success or error on the last operation
                    // according to the IDB spec.
                    req.onerror = BulkErrorHandlerCatchAll(errorList, done);
                    req.onsuccess = eventSuccessHandler(done);
                }
            });
        },
        add: function (obj, key) {
            /// <summary>
            ///   Add an object to the database. In case an object with same primary key already exists, the object will not be added.
            /// </summary>
            /// <param name="obj" type="Object">A javascript object to insert</param>
            /// <param name="key" optional="true">Primary key</param>
            var creatingHook = this.hook.creating.fire;
            return this._idbstore(READWRITE, function (resolve, reject, idbstore, trans) {
                var hookCtx = { onsuccess: null, onerror: null };
                if (creatingHook !== nop) {
                    var effectiveKey = key != null ? key : idbstore.keyPath ? getByKeyPath(obj, idbstore.keyPath) : undefined;
                    var keyToUse = creatingHook.call(hookCtx, effectiveKey, obj, trans); // Allow subscribers to when("creating") to generate the key.
                    if (effectiveKey == null && keyToUse != null) {
                        // Using "==" and "!=" to check for either null or undefined!
                        if (idbstore.keyPath) setByKeyPath(obj, idbstore.keyPath, keyToUse);else key = keyToUse;
                    }
                }
                try {
                    var req = key != null ? idbstore.add(obj, key) : idbstore.add(obj);
                    req._hookCtx = hookCtx;
                    req.onerror = hookedEventRejectHandler(reject);
                    req.onsuccess = hookedEventSuccessHandler(function (result) {
                        // TODO: Remove these two lines in next major release (2.0?)
                        // It's no good practice to have side effects on provided parameters
                        var keyPath = idbstore.keyPath;
                        if (keyPath) setByKeyPath(obj, keyPath, result);
                        resolve(result);
                    });
                } catch (e) {
                    if (hookCtx.onerror) hookCtx.onerror(e);
                    throw e;
                }
            });
        },

        put: function (obj, key) {
            /// <summary>
            ///   Add an object to the database but in case an object with same primary key alread exists, the existing one will get updated.
            /// </summary>
            /// <param name="obj" type="Object">A javascript object to insert or update</param>
            /// <param name="key" optional="true">Primary key</param>
            var self = this,
                creatingHook = this.hook.creating.fire,
                updatingHook = this.hook.updating.fire;
            if (creatingHook !== nop || updatingHook !== nop) {
                //
                // People listens to when("creating") or when("updating") events!
                // We must know whether the put operation results in an CREATE or UPDATE.
                //
                return this._trans(READWRITE, function (resolve, reject, trans) {
                    // Since key is optional, make sure we get it from obj if not provided
                    var effectiveKey = key !== undefined ? key : self.schema.primKey.keyPath && getByKeyPath(obj, self.schema.primKey.keyPath);
                    if (effectiveKey == null) {
                        // "== null" means checking for either null or undefined.
                        // No primary key. Must use add().
                        self.add(obj).then(resolve, reject);
                    } else {
                        // Primary key exist. Lock transaction and try modifying existing. If nothing modified, call add().
                        trans._lock(); // Needed because operation is splitted into modify() and add().
                        // clone obj before this async call. If caller modifies obj the line after put(), the IDB spec requires that it should not affect operation.
                        obj = deepClone(obj);
                        self.where(":id").equals(effectiveKey).modify(function () {
                            // Replace extisting value with our object
                            // CRUD event firing handled in WriteableCollection.modify()
                            this.value = obj;
                        }).then(function (count) {
                            if (count === 0) {
                                // Object's key was not found. Add the object instead.
                                // CRUD event firing will be done in add()
                                return self.add(obj, key); // Resolving with another Promise. Returned Promise will then resolve with the new key.
                            } else {
                                return effectiveKey; // Resolve with the provided key.
                            }
                        }).finally(function () {
                            trans._unlock();
                        }).then(resolve, reject);
                    }
                });
            } else {
                // Use the standard IDB put() method.
                return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                    var req = key !== undefined ? idbstore.put(obj, key) : idbstore.put(obj);
                    req.onerror = eventRejectHandler(reject);
                    req.onsuccess = function (ev) {
                        var keyPath = idbstore.keyPath;
                        if (keyPath) setByKeyPath(obj, keyPath, ev.target.result);
                        resolve(req.result);
                    };
                });
            }
        },

        'delete': function (key) {
            /// <param name="key">Primary key of the object to delete</param>
            if (this.hook.deleting.subscribers.length) {
                // People listens to when("deleting") event. Must implement delete using WriteableCollection.delete() that will
                // call the CRUD event. Only WriteableCollection.delete() will know whether an object was actually deleted.
                return this.where(":id").equals(key).delete();
            } else {
                // No one listens. Use standard IDB delete() method.
                return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                    var req = idbstore.delete(key);
                    req.onerror = eventRejectHandler(reject);
                    req.onsuccess = function () {
                        resolve(req.result);
                    };
                });
            }
        },

        clear: function () {
            if (this.hook.deleting.subscribers.length) {
                // People listens to when("deleting") event. Must implement delete using WriteableCollection.delete() that will
                // call the CRUD event. Only WriteableCollection.delete() will knows which objects that are actually deleted.
                return this.toCollection().delete();
            } else {
                return this._idbstore(READWRITE, function (resolve, reject, idbstore) {
                    var req = idbstore.clear();
                    req.onerror = eventRejectHandler(reject);
                    req.onsuccess = function () {
                        resolve(req.result);
                    };
                });
            }
        },

        update: function (keyOrObject, modifications) {
            if (typeof modifications !== 'object' || isArray(modifications)) throw new exceptions.InvalidArgument("Modifications must be an object.");
            if (typeof keyOrObject === 'object' && !isArray(keyOrObject)) {
                // object to modify. Also modify given object with the modifications:
                keys(modifications).forEach(function (keyPath) {
                    setByKeyPath(keyOrObject, keyPath, modifications[keyPath]);
                });
                var key = getByKeyPath(keyOrObject, this.schema.primKey.keyPath);
                if (key === undefined) return rejection(new exceptions.InvalidArgument("Given object does not contain its primary key"), dbUncaught);
                return this.where(":id").equals(key).modify(modifications);
            } else {
                // key to modify
                return this.where(":id").equals(keyOrObject).modify(modifications);
            }
        }
    });

    //
    //
    //
    // Transaction Class
    //
    //
    //
    function Transaction(mode, storeNames, dbschema, parent) {
        var _this2 = this;

        /// <summary>
        ///    Transaction class. Represents a database transaction. All operations on db goes through a Transaction.
        /// </summary>
        /// <param name="mode" type="String">Any of "readwrite" or "readonly"</param>
        /// <param name="storeNames" type="Array">Array of table names to operate on</param>
        this.db = db;
        this.mode = mode;
        this.storeNames = storeNames;
        this.idbtrans = null;
        this.on = Events(this, "complete", "error", "abort");
        this.parent = parent || null;
        this.active = true;
        this._tables = null;
        this._reculock = 0;
        this._blockedFuncs = [];
        this._psd = null;
        this._dbschema = dbschema;
        this._resolve = null;
        this._reject = null;
        this._completion = new Promise(function (resolve, reject) {
            _this2._resolve = resolve;
            _this2._reject = reject;
        }).uncaught(dbUncaught);

        this._completion.then(function () {
            _this2.on.complete.fire();
        }, function (e) {
            _this2.on.error.fire(e);
            _this2.parent ? _this2.parent._reject(e) : _this2.active && _this2.idbtrans && _this2.idbtrans.abort();
            _this2.active = false;
            return rejection(e); // Indicate we actually DO NOT catch this error.
        });
    }

    props(Transaction.prototype, {
        //
        // Transaction Protected Methods (not required by API users, but needed internally and eventually by dexie extensions)
        //
        _lock: function () {
            assert(!PSD.global); // Locking and unlocking reuires to be within a PSD scope.
            // Temporary set all requests into a pending queue if they are called before database is ready.
            ++this._reculock; // Recursive read/write lock pattern using PSD (Promise Specific Data) instead of TLS (Thread Local Storage)
            if (this._reculock === 1 && !PSD.global) PSD.lockOwnerFor = this;
            return this;
        },
        _unlock: function () {
            assert(!PSD.global); // Locking and unlocking reuires to be within a PSD scope.
            if (--this._reculock === 0) {
                if (!PSD.global) PSD.lockOwnerFor = null;
                while (this._blockedFuncs.length > 0 && !this._locked()) {
                    var fnAndPSD = this._blockedFuncs.shift();
                    try {
                        usePSD(fnAndPSD[1], fnAndPSD[0]);
                    } catch (e) {}
                }
            }
            return this;
        },
        _locked: function () {
            // Checks if any write-lock is applied on this transaction.
            // To simplify the Dexie API for extension implementations, we support recursive locks.
            // This is accomplished by using "Promise Specific Data" (PSD).
            // PSD data is bound to a Promise and any child Promise emitted through then() or resolve( new Promise() ).
            // PSD is local to code executing on top of the call stacks of any of any code executed by Promise():
            //         * callback given to the Promise() constructor  (function (resolve, reject){...})
            //         * callbacks given to then()/catch()/finally() methods (function (value){...})
            // If creating a new independant Promise instance from within a Promise call stack, the new Promise will derive the PSD from the call stack of the parent Promise.
            // Derivation is done so that the inner PSD __proto__ points to the outer PSD.
            // PSD.lockOwnerFor will point to current transaction object if the currently executing PSD scope owns the lock.
            return this._reculock && PSD.lockOwnerFor !== this;
        },
        create: function (idbtrans) {
            var _this3 = this;

            assert(!this.idbtrans);
            if (!idbtrans && !idbdb) {
                switch (dbOpenError && dbOpenError.name) {
                    case "DatabaseClosedError":
                        // Errors where it is no difference whether it was caused by the user operation or an earlier call to db.open()
                        throw new exceptions.DatabaseClosed(dbOpenError);
                    case "MissingAPIError":
                        // Errors where it is no difference whether it was caused by the user operation or an earlier call to db.open()
                        throw new exceptions.MissingAPI(dbOpenError.message, dbOpenError);
                    default:
                        // Make it clear that the user operation was not what caused the error - the error had occurred earlier on db.open()!
                        throw new exceptions.OpenFailed(dbOpenError);
                }
            }
            if (!this.active) throw new exceptions.TransactionInactive();
            assert(this._completion._state === null);

            idbtrans = this.idbtrans = idbtrans || idbdb.transaction(safariMultiStoreFix(this.storeNames), this.mode);
            idbtrans.onerror = wrap(function (ev) {
                preventDefault(ev); // Prohibit default bubbling to window.error
                _this3._reject(idbtrans.error);
            });
            idbtrans.onabort = wrap(function (ev) {
                preventDefault(ev);
                _this3.active && _this3._reject(new exceptions.Abort());
                _this3.active = false;
                _this3.on("abort").fire(ev);
            });
            idbtrans.oncomplete = wrap(function () {
                _this3.active = false;
                _this3._resolve();
            });
            return this;
        },
        _promise: function (mode, fn, bWriteLock) {
            var self = this;
            var p = self._locked() ?
            // Read lock always. Transaction is write-locked. Wait for mutex.
            new Promise(function (resolve, reject) {
                self._blockedFuncs.push([function () {
                    self._promise(mode, fn, bWriteLock).then(resolve, reject);
                }, PSD]);
            }) : newScope(function () {
                var p_ = self.active ? new Promise(function (resolve, reject) {
                    if (mode === READWRITE && self.mode !== READWRITE) throw new exceptions.ReadOnly("Transaction is readonly");
                    if (!self.idbtrans && mode) self.create();
                    if (bWriteLock) self._lock(); // Write lock if write operation is requested
                    fn(resolve, reject, self);
                }) : rejection(new exceptions.TransactionInactive());
                if (self.active && bWriteLock) p_.finally(function () {
                    self._unlock();
                });
                return p_;
            });

            p._lib = true;
            return p.uncaught(dbUncaught);
        },

        //
        // Transaction Public Properties and Methods
        //
        abort: function () {
            this.active && this._reject(new exceptions.Abort());
            this.active = false;
        },

        tables: {
            get: deprecated("Transaction.tables", function () {
                return arrayToObject(this.storeNames, function (name) {
                    return [name, allTables[name]];
                });
            }, "Use db.tables()")
        },

        complete: deprecated("Transaction.complete()", function (cb) {
            return this.on("complete", cb);
        }),

        error: deprecated("Transaction.error()", function (cb) {
            return this.on("error", cb);
        }),

        table: deprecated("Transaction.table()", function (name) {
            if (this.storeNames.indexOf(name) === -1) throw new exceptions.InvalidTable("Table " + name + " not in transaction");
            return allTables[name];
        })

    });

    //
    //
    //
    // WhereClause
    //
    //
    //
    function WhereClause(table, index, orCollection) {
        /// <param name="table" type="Table"></param>
        /// <param name="index" type="String" optional="true"></param>
        /// <param name="orCollection" type="Collection" optional="true"></param>
        this._ctx = {
            table: table,
            index: index === ":id" ? null : index,
            collClass: table._collClass,
            or: orCollection
        };
    }

    props(WhereClause.prototype, function () {

        // WhereClause private methods

        function fail(collectionOrWhereClause, err, T) {
            var collection = collectionOrWhereClause instanceof WhereClause ? new collectionOrWhereClause._ctx.collClass(collectionOrWhereClause) : collectionOrWhereClause;

            collection._ctx.error = T ? new T(err) : new TypeError(err);
            return collection;
        }

        function emptyCollection(whereClause) {
            return new whereClause._ctx.collClass(whereClause, function () {
                return IDBKeyRange.only("");
            }).limit(0);
        }

        function upperFactory(dir) {
            return dir === "next" ? function (s) {
                return s.toUpperCase();
            } : function (s) {
                return s.toLowerCase();
            };
        }
        function lowerFactory(dir) {
            return dir === "next" ? function (s) {
                return s.toLowerCase();
            } : function (s) {
                return s.toUpperCase();
            };
        }
        function nextCasing(key, lowerKey, upperNeedle, lowerNeedle, cmp, dir) {
            var length = Math.min(key.length, lowerNeedle.length);
            var llp = -1;
            for (var i = 0; i < length; ++i) {
                var lwrKeyChar = lowerKey[i];
                if (lwrKeyChar !== lowerNeedle[i]) {
                    if (cmp(key[i], upperNeedle[i]) < 0) return key.substr(0, i) + upperNeedle[i] + upperNeedle.substr(i + 1);
                    if (cmp(key[i], lowerNeedle[i]) < 0) return key.substr(0, i) + lowerNeedle[i] + upperNeedle.substr(i + 1);
                    if (llp >= 0) return key.substr(0, llp) + lowerKey[llp] + upperNeedle.substr(llp + 1);
                    return null;
                }
                if (cmp(key[i], lwrKeyChar) < 0) llp = i;
            }
            if (length < lowerNeedle.length && dir === "next") return key + upperNeedle.substr(key.length);
            if (length < key.length && dir === "prev") return key.substr(0, upperNeedle.length);
            return llp < 0 ? null : key.substr(0, llp) + lowerNeedle[llp] + upperNeedle.substr(llp + 1);
        }

        function addIgnoreCaseAlgorithm(whereClause, match, needles, suffix) {
            /// <param name="needles" type="Array" elementType="String"></param>
            var upper,
                lower,
                compare,
                upperNeedles,
                lowerNeedles,
                direction,
                nextKeySuffix,
                needlesLen = needles.length;
            if (!needles.every(function (s) {
                return typeof s === 'string';
            })) {
                return fail(whereClause, STRING_EXPECTED);
            }
            function initDirection(dir) {
                upper = upperFactory(dir);
                lower = lowerFactory(dir);
                compare = dir === "next" ? simpleCompare : simpleCompareReverse;
                var needleBounds = needles.map(function (needle) {
                    return { lower: lower(needle), upper: upper(needle) };
                }).sort(function (a, b) {
                    return compare(a.lower, b.lower);
                });
                upperNeedles = needleBounds.map(function (nb) {
                    return nb.upper;
                });
                lowerNeedles = needleBounds.map(function (nb) {
                    return nb.lower;
                });
                direction = dir;
                nextKeySuffix = dir === "next" ? "" : suffix;
            }
            initDirection("next");

            var c = new whereClause._ctx.collClass(whereClause, function () {
                return IDBKeyRange.bound(upperNeedles[0], lowerNeedles[needlesLen - 1] + suffix);
            });

            c._ondirectionchange = function (direction) {
                // This event onlys occur before filter is called the first time.
                initDirection(direction);
            };

            var firstPossibleNeedle = 0;

            c._addAlgorithm(function (cursor, advance, resolve) {
                /// <param name="cursor" type="IDBCursor"></param>
                /// <param name="advance" type="Function"></param>
                /// <param name="resolve" type="Function"></param>
                var key = cursor.key;
                if (typeof key !== 'string') return false;
                var lowerKey = lower(key);
                if (match(lowerKey, lowerNeedles, firstPossibleNeedle)) {
                    return true;
                } else {
                    var lowestPossibleCasing = null;
                    for (var i = firstPossibleNeedle; i < needlesLen; ++i) {
                        var casing = nextCasing(key, lowerKey, upperNeedles[i], lowerNeedles[i], compare, direction);
                        if (casing === null && lowestPossibleCasing === null) firstPossibleNeedle = i + 1;else if (lowestPossibleCasing === null || compare(lowestPossibleCasing, casing) > 0) {
                            lowestPossibleCasing = casing;
                        }
                    }
                    if (lowestPossibleCasing !== null) {
                        advance(function () {
                            cursor.continue(lowestPossibleCasing + nextKeySuffix);
                        });
                    } else {
                        advance(resolve);
                    }
                    return false;
                }
            });
            return c;
        }

        //
        // WhereClause public methods
        //
        return {
            between: function (lower, upper, includeLower, includeUpper) {
                /// <summary>
                ///     Filter out records whose where-field lays between given lower and upper values. Applies to Strings, Numbers and Dates.
                /// </summary>
                /// <param name="lower"></param>
                /// <param name="upper"></param>
                /// <param name="includeLower" optional="true">Whether items that equals lower should be included. Default true.</param>
                /// <param name="includeUpper" optional="true">Whether items that equals upper should be included. Default false.</param>
                /// <returns type="Collection"></returns>
                includeLower = includeLower !== false; // Default to true
                includeUpper = includeUpper === true; // Default to false
                try {
                    if (cmp(lower, upper) > 0 || cmp(lower, upper) === 0 && (includeLower || includeUpper) && !(includeLower && includeUpper)) return emptyCollection(this); // Workaround for idiotic W3C Specification that DataError must be thrown if lower > upper. The natural result would be to return an empty collection.
                    return new this._ctx.collClass(this, function () {
                        return IDBKeyRange.bound(lower, upper, !includeLower, !includeUpper);
                    });
                } catch (e) {
                    return fail(this, INVALID_KEY_ARGUMENT);
                }
            },
            equals: function (value) {
                return new this._ctx.collClass(this, function () {
                    return IDBKeyRange.only(value);
                });
            },
            above: function (value) {
                return new this._ctx.collClass(this, function () {
                    return IDBKeyRange.lowerBound(value, true);
                });
            },
            aboveOrEqual: function (value) {
                return new this._ctx.collClass(this, function () {
                    return IDBKeyRange.lowerBound(value);
                });
            },
            below: function (value) {
                return new this._ctx.collClass(this, function () {
                    return IDBKeyRange.upperBound(value, true);
                });
            },
            belowOrEqual: function (value) {
                return new this._ctx.collClass(this, function () {
                    return IDBKeyRange.upperBound(value);
                });
            },
            startsWith: function (str) {
                /// <param name="str" type="String"></param>
                if (typeof str !== 'string') return fail(this, STRING_EXPECTED);
                return this.between(str, str + maxString, true, true);
            },
            startsWithIgnoreCase: function (str) {
                /// <param name="str" type="String"></param>
                if (str === "") return this.startsWith(str);
                return addIgnoreCaseAlgorithm(this, function (x, a) {
                    return x.indexOf(a[0]) === 0;
                }, [str], maxString);
            },
            equalsIgnoreCase: function (str) {
                /// <param name="str" type="String"></param>
                return addIgnoreCaseAlgorithm(this, function (x, a) {
                    return x === a[0];
                }, [str], "");
            },
            anyOfIgnoreCase: function () {
                var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                if (set.length === 0) return emptyCollection(this);
                return addIgnoreCaseAlgorithm(this, function (x, a) {
                    return a.indexOf(x) !== -1;
                }, set, "");
            },
            startsWithAnyOfIgnoreCase: function () {
                var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                if (set.length === 0) return emptyCollection(this);
                return addIgnoreCaseAlgorithm(this, function (x, a) {
                    return a.some(function (n) {
                        return x.indexOf(n) === 0;
                    });
                }, set, maxString);
            },
            anyOf: function () {
                var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                var compare = ascending;
                try {
                    set.sort(compare);
                } catch (e) {
                    return fail(this, INVALID_KEY_ARGUMENT);
                }
                if (set.length === 0) return emptyCollection(this);
                var c = new this._ctx.collClass(this, function () {
                    return IDBKeyRange.bound(set[0], set[set.length - 1]);
                });

                c._ondirectionchange = function (direction) {
                    compare = direction === "next" ? ascending : descending;
                    set.sort(compare);
                };
                var i = 0;
                c._addAlgorithm(function (cursor, advance, resolve) {
                    var key = cursor.key;
                    while (compare(key, set[i]) > 0) {
                        // The cursor has passed beyond this key. Check next.
                        ++i;
                        if (i === set.length) {
                            // There is no next. Stop searching.
                            advance(resolve);
                            return false;
                        }
                    }
                    if (compare(key, set[i]) === 0) {
                        // The current cursor value should be included and we should continue a single step in case next item has the same key or possibly our next key in set.
                        return true;
                    } else {
                        // cursor.key not yet at set[i]. Forward cursor to the next key to hunt for.
                        advance(function () {
                            cursor.continue(set[i]);
                        });
                        return false;
                    }
                });
                return c;
            },

            notEqual: function (value) {
                return this.inAnyRange([[-Infinity, value], [value, maxKey]], { includeLowers: false, includeUppers: false });
            },

            noneOf: function () {
                var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);
                if (set.length === 0) return new this._ctx.collClass(this); // Return entire collection.
                try {
                    set.sort(ascending);
                } catch (e) {
                    return fail(this, INVALID_KEY_ARGUMENT);
                }
                // Transform ["a","b","c"] to a set of ranges for between/above/below: [[-Infinity,"a"], ["a","b"], ["b","c"], ["c",maxKey]]
                var ranges = set.reduce(function (res, val) {
                    return res ? res.concat([[res[res.length - 1][1], val]]) : [[-Infinity, val]];
                }, null);
                ranges.push([set[set.length - 1], maxKey]);
                return this.inAnyRange(ranges, { includeLowers: false, includeUppers: false });
            },

            /** Filter out values withing given set of ranges.
            * Example, give children and elders a rebate of 50%:
            *
            *   db.friends.where('age').inAnyRange([[0,18],[65,Infinity]]).modify({Rebate: 1/2});
            *
            * @param {(string|number|Date|Array)[][]} ranges
            * @param {{includeLowers: boolean, includeUppers: boolean}} options
            */
            inAnyRange: function (ranges, options) {
                var ctx = this._ctx;
                if (ranges.length === 0) return emptyCollection(this);
                if (!ranges.every(function (range) {
                    return range[0] !== undefined && range[1] !== undefined && ascending(range[0], range[1]) <= 0;
                })) {
                    return fail(this, "First argument to inAnyRange() must be an Array of two-value Arrays [lower,upper] where upper must not be lower than lower", exceptions.InvalidArgument);
                }
                var includeLowers = !options || options.includeLowers !== false; // Default to true
                var includeUppers = options && options.includeUppers === true; // Default to false

                function addRange(ranges, newRange) {
                    for (var i = 0, l = ranges.length; i < l; ++i) {
                        var range = ranges[i];
                        if (cmp(newRange[0], range[1]) < 0 && cmp(newRange[1], range[0]) > 0) {
                            range[0] = min(range[0], newRange[0]);
                            range[1] = max(range[1], newRange[1]);
                            break;
                        }
                    }
                    if (i === l) ranges.push(newRange);
                    return ranges;
                }

                var sortDirection = ascending;
                function rangeSorter(a, b) {
                    return sortDirection(a[0], b[0]);
                }

                // Join overlapping ranges
                var set;
                try {
                    set = ranges.reduce(addRange, []);
                    set.sort(rangeSorter);
                } catch (ex) {
                    return fail(this, INVALID_KEY_ARGUMENT);
                }

                var i = 0;
                var keyIsBeyondCurrentEntry = includeUppers ? function (key) {
                    return ascending(key, set[i][1]) > 0;
                } : function (key) {
                    return ascending(key, set[i][1]) >= 0;
                };

                var keyIsBeforeCurrentEntry = includeLowers ? function (key) {
                    return descending(key, set[i][0]) > 0;
                } : function (key) {
                    return descending(key, set[i][0]) >= 0;
                };

                function keyWithinCurrentRange(key) {
                    return !keyIsBeyondCurrentEntry(key) && !keyIsBeforeCurrentEntry(key);
                }

                var checkKey = keyIsBeyondCurrentEntry;

                var c = new ctx.collClass(this, function () {
                    return IDBKeyRange.bound(set[0][0], set[set.length - 1][1], !includeLowers, !includeUppers);
                });

                c._ondirectionchange = function (direction) {
                    if (direction === "next") {
                        checkKey = keyIsBeyondCurrentEntry;
                        sortDirection = ascending;
                    } else {
                        checkKey = keyIsBeforeCurrentEntry;
                        sortDirection = descending;
                    }
                    set.sort(rangeSorter);
                };

                c._addAlgorithm(function (cursor, advance, resolve) {
                    var key = cursor.key;
                    while (checkKey(key)) {
                        // The cursor has passed beyond this key. Check next.
                        ++i;
                        if (i === set.length) {
                            // There is no next. Stop searching.
                            advance(resolve);
                            return false;
                        }
                    }
                    if (keyWithinCurrentRange(key)) {
                        // The current cursor value should be included and we should continue a single step in case next item has the same key or possibly our next key in set.
                        return true;
                    } else if (cmp(key, set[i][1]) === 0 || cmp(key, set[i][0]) === 0) {
                        // includeUpper or includeLower is false so keyWithinCurrentRange() returns false even though we are at range border.
                        // Continue to next key but don't include this one.
                        return false;
                    } else {
                        // cursor.key not yet at set[i]. Forward cursor to the next key to hunt for.
                        advance(function () {
                            if (sortDirection === ascending) cursor.continue(set[i][0]);else cursor.continue(set[i][1]);
                        });
                        return false;
                    }
                });
                return c;
            },
            startsWithAnyOf: function () {
                var set = getArrayOf.apply(NO_CHAR_ARRAY, arguments);

                if (!set.every(function (s) {
                    return typeof s === 'string';
                })) {
                    return fail(this, "startsWithAnyOf() only works with strings");
                }
                if (set.length === 0) return emptyCollection(this);

                return this.inAnyRange(set.map(function (str) {
                    return [str, str + maxString];
                }));
            }
        };
    });

    //
    //
    //
    // Collection Class
    //
    //
    //
    function Collection(whereClause, keyRangeGenerator) {
        /// <summary>
        ///
        /// </summary>
        /// <param name="whereClause" type="WhereClause">Where clause instance</param>
        /// <param name="keyRangeGenerator" value="function(){ return IDBKeyRange.bound(0,1);}" optional="true"></param>
        var keyRange = null,
            error = null;
        if (keyRangeGenerator) try {
            keyRange = keyRangeGenerator();
        } catch (ex) {
            error = ex;
        }

        var whereCtx = whereClause._ctx,
            table = whereCtx.table;
        this._ctx = {
            table: table,
            index: whereCtx.index,
            isPrimKey: !whereCtx.index || table.schema.primKey.keyPath && whereCtx.index === table.schema.primKey.name,
            range: keyRange,
            keysOnly: false,
            dir: "next",
            unique: "",
            algorithm: null,
            filter: null,
            replayFilter: null,
            justLimit: true, // True if a replayFilter is just a filter that performs a "limit" operation (or none at all)
            isMatch: null,
            offset: 0,
            limit: Infinity,
            error: error, // If set, any promise must be rejected with this error
            or: whereCtx.or,
            valueMapper: table.hook.reading.fire
        };
    }

    function isPlainKeyRange(ctx, ignoreLimitFilter) {
        return !(ctx.filter || ctx.algorithm || ctx.or) && (ignoreLimitFilter ? ctx.justLimit : !ctx.replayFilter);
    }

    props(Collection.prototype, function () {

        //
        // Collection Private Functions
        //

        function addFilter(ctx, fn) {
            ctx.filter = combine(ctx.filter, fn);
        }

        function addReplayFilter(ctx, factory, isLimitFilter) {
            var curr = ctx.replayFilter;
            ctx.replayFilter = curr ? function () {
                return combine(curr(), factory());
            } : factory;
            ctx.justLimit = isLimitFilter && !curr;
        }

        function addMatchFilter(ctx, fn) {
            ctx.isMatch = combine(ctx.isMatch, fn);
        }

        /** @param ctx {
         *      isPrimKey: boolean,
         *      table: Table,
         *      index: string
         * }
         * @param store IDBObjectStore
         **/
        function getIndexOrStore(ctx, store) {
            if (ctx.isPrimKey) return store;
            var indexSpec = ctx.table.schema.idxByName[ctx.index];
            if (!indexSpec) throw new exceptions.Schema("KeyPath " + ctx.index + " on object store " + store.name + " is not indexed");
            return store.index(indexSpec.name);
        }

        /** @param ctx {
         *      isPrimKey: boolean,
         *      table: Table,
         *      index: string,
         *      keysOnly: boolean,
         *      range?: IDBKeyRange,
         *      dir: "next" | "prev"
         * }
         */
        function openCursor(ctx, store) {
            var idxOrStore = getIndexOrStore(ctx, store);
            return ctx.keysOnly && 'openKeyCursor' in idxOrStore ? idxOrStore.openKeyCursor(ctx.range || null, ctx.dir + ctx.unique) : idxOrStore.openCursor(ctx.range || null, ctx.dir + ctx.unique);
        }

        function iter(ctx, fn, resolve, reject, idbstore) {
            var filter = ctx.replayFilter ? combine(ctx.filter, ctx.replayFilter()) : ctx.filter;
            if (!ctx.or) {
                iterate(openCursor(ctx, idbstore), combine(ctx.algorithm, filter), fn, resolve, reject, !ctx.keysOnly && ctx.valueMapper);
            } else (function () {
                var set = {};
                var resolved = 0;

                function resolveboth() {
                    if (++resolved === 2) resolve(); // Seems like we just support or btwn max 2 expressions, but there are no limit because we do recursion.
                }

                function union(item, cursor, advance) {
                    if (!filter || filter(cursor, advance, resolveboth, reject)) {
                        var key = cursor.primaryKey.toString(); // Converts any Date to String, String to String, Number to String and Array to comma-separated string
                        if (!hasOwn(set, key)) {
                            set[key] = true;
                            fn(item, cursor, advance);
                        }
                    }
                }

                ctx.or._iterate(union, resolveboth, reject, idbstore);
                iterate(openCursor(ctx, idbstore), ctx.algorithm, union, resolveboth, reject, !ctx.keysOnly && ctx.valueMapper);
            })();
        }
        function getInstanceTemplate(ctx) {
            return ctx.table.schema.instanceTemplate;
        }

        return {

            //
            // Collection Protected Functions
            //

            _read: function (fn, cb) {
                var ctx = this._ctx;
                if (ctx.error) return ctx.table._trans(null, function rejector(resolve, reject) {
                    reject(ctx.error);
                });else return ctx.table._idbstore(READONLY, fn).then(cb);
            },
            _write: function (fn) {
                var ctx = this._ctx;
                if (ctx.error) return ctx.table._trans(null, function rejector(resolve, reject) {
                    reject(ctx.error);
                });else return ctx.table._idbstore(READWRITE, fn, "locked"); // When doing write operations on collections, always lock the operation so that upcoming operations gets queued.
            },
            _addAlgorithm: function (fn) {
                var ctx = this._ctx;
                ctx.algorithm = combine(ctx.algorithm, fn);
            },

            _iterate: function (fn, resolve, reject, idbstore) {
                return iter(this._ctx, fn, resolve, reject, idbstore);
            },

            clone: function (props$$1) {
                var rv = Object.create(this.constructor.prototype),
                    ctx = Object.create(this._ctx);
                if (props$$1) extend(ctx, props$$1);
                rv._ctx = ctx;
                return rv;
            },

            raw: function () {
                this._ctx.valueMapper = null;
                return this;
            },

            //
            // Collection Public methods
            //

            each: function (fn) {
                var ctx = this._ctx;

                if (fake) {
                    var item = getInstanceTemplate(ctx),
                        primKeyPath = ctx.table.schema.primKey.keyPath,
                        key = getByKeyPath(item, ctx.index ? ctx.table.schema.idxByName[ctx.index].keyPath : primKeyPath),
                        primaryKey = getByKeyPath(item, primKeyPath);
                    fn(item, { key: key, primaryKey: primaryKey });
                }

                return this._read(function (resolve, reject, idbstore) {
                    iter(ctx, fn, resolve, reject, idbstore);
                });
            },

            count: function (cb) {
                if (fake) return Promise.resolve(0).then(cb);
                var ctx = this._ctx;

                if (isPlainKeyRange(ctx, true)) {
                    // This is a plain key range. We can use the count() method if the index.
                    return this._read(function (resolve, reject, idbstore) {
                        var idx = getIndexOrStore(ctx, idbstore);
                        var req = ctx.range ? idx.count(ctx.range) : idx.count();
                        req.onerror = eventRejectHandler(reject);
                        req.onsuccess = function (e) {
                            resolve(Math.min(e.target.result, ctx.limit));
                        };
                    }, cb);
                } else {
                    // Algorithms, filters or expressions are applied. Need to count manually.
                    var count = 0;
                    return this._read(function (resolve, reject, idbstore) {
                        iter(ctx, function () {
                            ++count;return false;
                        }, function () {
                            resolve(count);
                        }, reject, idbstore);
                    }, cb);
                }
            },

            sortBy: function (keyPath, cb) {
                /// <param name="keyPath" type="String"></param>
                var parts = keyPath.split('.').reverse(),
                    lastPart = parts[0],
                    lastIndex = parts.length - 1;
                function getval(obj, i) {
                    if (i) return getval(obj[parts[i]], i - 1);
                    return obj[lastPart];
                }
                var order = this._ctx.dir === "next" ? 1 : -1;

                function sorter(a, b) {
                    var aVal = getval(a, lastIndex),
                        bVal = getval(b, lastIndex);
                    return aVal < bVal ? -order : aVal > bVal ? order : 0;
                }
                return this.toArray(function (a) {
                    return a.sort(sorter);
                }).then(cb);
            },

            toArray: function (cb) {
                var ctx = this._ctx;
                return this._read(function (resolve, reject, idbstore) {
                    fake && resolve([getInstanceTemplate(ctx)]);
                    if (hasGetAll && ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
                        // Special optimation if we could use IDBObjectStore.getAll() or
                        // IDBKeyRange.getAll():
                        var readingHook = ctx.table.hook.reading.fire;
                        var idxOrStore = getIndexOrStore(ctx, idbstore);
                        var req = ctx.limit < Infinity ? idxOrStore.getAll(ctx.range, ctx.limit) : idxOrStore.getAll(ctx.range);
                        req.onerror = eventRejectHandler(reject);
                        req.onsuccess = readingHook === mirror ? eventSuccessHandler(resolve) : wrap(eventSuccessHandler(function (res) {
                            try {
                                resolve(res.map(readingHook));
                            } catch (e) {
                                reject(e);
                            }
                        }));
                    } else {
                        // Getting array through a cursor.
                        var a = [];
                        iter(ctx, function (item) {
                            a.push(item);
                        }, function arrayComplete() {
                            resolve(a);
                        }, reject, idbstore);
                    }
                }, cb);
            },

            offset: function (offset) {
                var ctx = this._ctx;
                if (offset <= 0) return this;
                ctx.offset += offset; // For count()
                if (isPlainKeyRange(ctx)) {
                    addReplayFilter(ctx, function () {
                        var offsetLeft = offset;
                        return function (cursor, advance) {
                            if (offsetLeft === 0) return true;
                            if (offsetLeft === 1) {
                                --offsetLeft;return false;
                            }
                            advance(function () {
                                cursor.advance(offsetLeft);
                                offsetLeft = 0;
                            });
                            return false;
                        };
                    });
                } else {
                    addReplayFilter(ctx, function () {
                        var offsetLeft = offset;
                        return function () {
                            return --offsetLeft < 0;
                        };
                    });
                }
                return this;
            },

            limit: function (numRows) {
                this._ctx.limit = Math.min(this._ctx.limit, numRows); // For count()
                addReplayFilter(this._ctx, function () {
                    var rowsLeft = numRows;
                    return function (cursor, advance, resolve) {
                        if (--rowsLeft <= 0) advance(resolve); // Stop after this item has been included
                        return rowsLeft >= 0; // If numRows is already below 0, return false because then 0 was passed to numRows initially. Otherwise we wouldnt come here.
                    };
                }, true);
                return this;
            },

            until: function (filterFunction, bIncludeStopEntry) {
                var ctx = this._ctx;
                fake && filterFunction(getInstanceTemplate(ctx));
                addFilter(this._ctx, function (cursor, advance, resolve) {
                    if (filterFunction(cursor.value)) {
                        advance(resolve);
                        return bIncludeStopEntry;
                    } else {
                        return true;
                    }
                });
                return this;
            },

            first: function (cb) {
                return this.limit(1).toArray(function (a) {
                    return a[0];
                }).then(cb);
            },

            last: function (cb) {
                return this.reverse().first(cb);
            },

            filter: function (filterFunction) {
                /// <param name="jsFunctionFilter" type="Function">function(val){return true/false}</param>
                fake && filterFunction(getInstanceTemplate(this._ctx));
                addFilter(this._ctx, function (cursor) {
                    return filterFunction(cursor.value);
                });
                // match filters not used in Dexie.js but can be used by 3rd part libraries to test a
                // collection for a match without querying DB. Used by Dexie.Observable.
                addMatchFilter(this._ctx, filterFunction);
                return this;
            },

            and: function (filterFunction) {
                return this.filter(filterFunction);
            },

            or: function (indexName) {
                return new WhereClause(this._ctx.table, indexName, this);
            },

            reverse: function () {
                this._ctx.dir = this._ctx.dir === "prev" ? "next" : "prev";
                if (this._ondirectionchange) this._ondirectionchange(this._ctx.dir);
                return this;
            },

            desc: function () {
                return this.reverse();
            },

            eachKey: function (cb) {
                var ctx = this._ctx;
                ctx.keysOnly = !ctx.isMatch;
                return this.each(function (val, cursor) {
                    cb(cursor.key, cursor);
                });
            },

            eachUniqueKey: function (cb) {
                this._ctx.unique = "unique";
                return this.eachKey(cb);
            },

            eachPrimaryKey: function (cb) {
                var ctx = this._ctx;
                ctx.keysOnly = !ctx.isMatch;
                return this.each(function (val, cursor) {
                    cb(cursor.primaryKey, cursor);
                });
            },

            keys: function (cb) {
                var ctx = this._ctx;
                ctx.keysOnly = !ctx.isMatch;
                var a = [];
                return this.each(function (item, cursor) {
                    a.push(cursor.key);
                }).then(function () {
                    return a;
                }).then(cb);
            },

            primaryKeys: function (cb) {
                var ctx = this._ctx;
                if (hasGetAll && ctx.dir === 'next' && isPlainKeyRange(ctx, true) && ctx.limit > 0) {
                    // Special optimation if we could use IDBObjectStore.getAllKeys() or
                    // IDBKeyRange.getAllKeys():
                    return this._read(function (resolve, reject, idbstore) {
                        var idxOrStore = getIndexOrStore(ctx, idbstore);
                        var req = ctx.limit < Infinity ? idxOrStore.getAllKeys(ctx.range, ctx.limit) : idxOrStore.getAllKeys(ctx.range);
                        req.onerror = eventRejectHandler(reject);
                        req.onsuccess = eventSuccessHandler(resolve);
                    }).then(cb);
                }
                ctx.keysOnly = !ctx.isMatch;
                var a = [];
                return this.each(function (item, cursor) {
                    a.push(cursor.primaryKey);
                }).then(function () {
                    return a;
                }).then(cb);
            },

            uniqueKeys: function (cb) {
                this._ctx.unique = "unique";
                return this.keys(cb);
            },

            firstKey: function (cb) {
                return this.limit(1).keys(function (a) {
                    return a[0];
                }).then(cb);
            },

            lastKey: function (cb) {
                return this.reverse().firstKey(cb);
            },

            distinct: function () {
                var ctx = this._ctx,
                    idx = ctx.index && ctx.table.schema.idxByName[ctx.index];
                if (!idx || !idx.multi) return this; // distinct() only makes differencies on multiEntry indexes.
                var set = {};
                addFilter(this._ctx, function (cursor) {
                    var strKey = cursor.primaryKey.toString(); // Converts any Date to String, String to String, Number to String and Array to comma-separated string
                    var found = hasOwn(set, strKey);
                    set[strKey] = true;
                    return !found;
                });
                return this;
            }
        };
    });

    //
    //
    // WriteableCollection Class
    //
    //
    function WriteableCollection() {
        Collection.apply(this, arguments);
    }

    derive(WriteableCollection).from(Collection).extend({

        //
        // WriteableCollection Public Methods
        //

        modify: function (changes) {
            var self = this,
                ctx = this._ctx,
                hook = ctx.table.hook,
                updatingHook = hook.updating.fire,
                deletingHook = hook.deleting.fire;

            fake && typeof changes === 'function' && changes.call({ value: ctx.table.schema.instanceTemplate }, ctx.table.schema.instanceTemplate);

            return this._write(function (resolve, reject, idbstore, trans) {
                var modifyer;
                if (typeof changes === 'function') {
                    // Changes is a function that may update, add or delete propterties or even require a deletion the object itself (delete this.item)
                    if (updatingHook === nop && deletingHook === nop) {
                        // Noone cares about what is being changed. Just let the modifier function be the given argument as is.
                        modifyer = changes;
                    } else {
                        // People want to know exactly what is being modified or deleted.
                        // Let modifyer be a proxy function that finds out what changes the caller is actually doing
                        // and call the hooks accordingly!
                        modifyer = function (item) {
                            var origItem = deepClone(item); // Clone the item first so we can compare laters.
                            if (changes.call(this, item, this) === false) return false; // Call the real modifyer function (If it returns false explicitely, it means it dont want to modify anyting on this object)
                            if (!hasOwn(this, "value")) {
                                // The real modifyer function requests a deletion of the object. Inform the deletingHook that a deletion is taking place.
                                deletingHook.call(this, this.primKey, item, trans);
                            } else {
                                // No deletion. Check what was changed
                                var objectDiff = getObjectDiff(origItem, this.value);
                                var additionalChanges = updatingHook.call(this, objectDiff, this.primKey, origItem, trans);
                                if (additionalChanges) {
                                    // Hook want to apply additional modifications. Make sure to fullfill the will of the hook.
                                    item = this.value;
                                    keys(additionalChanges).forEach(function (keyPath) {
                                        setByKeyPath(item, keyPath, additionalChanges[keyPath]); // Adding {keyPath: undefined} means that the keyPath should be deleted. Handled by setByKeyPath
                                    });
                                }
                            }
                        };
                    }
                } else if (updatingHook === nop) {
                    // changes is a set of {keyPath: value} and no one is listening to the updating hook.
                    var keyPaths = keys(changes);
                    var numKeys = keyPaths.length;
                    modifyer = function (item) {
                        var anythingModified = false;
                        for (var i = 0; i < numKeys; ++i) {
                            var keyPath = keyPaths[i],
                                val = changes[keyPath];
                            if (getByKeyPath(item, keyPath) !== val) {
                                setByKeyPath(item, keyPath, val); // Adding {keyPath: undefined} means that the keyPath should be deleted. Handled by setByKeyPath
                                anythingModified = true;
                            }
                        }
                        return anythingModified;
                    };
                } else {
                    // changes is a set of {keyPath: value} and people are listening to the updating hook so we need to call it and
                    // allow it to add additional modifications to make.
                    var origChanges = changes;
                    changes = shallowClone(origChanges); // Let's work with a clone of the changes keyPath/value set so that we can restore it in case a hook extends it.
                    modifyer = function (item) {
                        var anythingModified = false;
                        var additionalChanges = updatingHook.call(this, changes, this.primKey, deepClone(item), trans);
                        if (additionalChanges) extend(changes, additionalChanges);
                        keys(changes).forEach(function (keyPath) {
                            var val = changes[keyPath];
                            if (getByKeyPath(item, keyPath) !== val) {
                                setByKeyPath(item, keyPath, val);
                                anythingModified = true;
                            }
                        });
                        if (additionalChanges) changes = shallowClone(origChanges); // Restore original changes for next iteration
                        return anythingModified;
                    };
                }

                var count = 0;
                var successCount = 0;
                var iterationComplete = false;
                var failures = [];
                var failKeys = [];
                var currentKey = null;

                function modifyItem(item, cursor) {
                    currentKey = cursor.primaryKey;
                    var thisContext = {
                        primKey: cursor.primaryKey,
                        value: item,
                        onsuccess: null,
                        onerror: null
                    };

                    function onerror(e) {
                        failures.push(e);
                        failKeys.push(thisContext.primKey);
                        checkFinished();
                        return true; // Catch these errors and let a final rejection decide whether or not to abort entire transaction
                    }

                    if (modifyer.call(thisContext, item, thisContext) !== false) {
                        // If a callback explicitely returns false, do not perform the update!
                        var bDelete = !hasOwn(thisContext, "value");
                        ++count;
                        tryCatch(function () {
                            var req = bDelete ? cursor.delete() : cursor.update(thisContext.value);
                            req._hookCtx = thisContext;
                            req.onerror = hookedEventRejectHandler(onerror);
                            req.onsuccess = hookedEventSuccessHandler(function () {
                                ++successCount;
                                checkFinished();
                            });
                        }, onerror);
                    } else if (thisContext.onsuccess) {
                        // Hook will expect either onerror or onsuccess to always be called!
                        thisContext.onsuccess(thisContext.value);
                    }
                }

                function doReject(e) {
                    if (e) {
                        failures.push(e);
                        failKeys.push(currentKey);
                    }
                    return reject(new ModifyError("Error modifying one or more objects", failures, successCount, failKeys));
                }

                function checkFinished() {
                    if (iterationComplete && successCount + failures.length === count) {
                        if (failures.length > 0) doReject();else resolve(successCount);
                    }
                }
                self.clone().raw()._iterate(modifyItem, function () {
                    iterationComplete = true;
                    checkFinished();
                }, doReject, idbstore);
            });
        },

        'delete': function () {
            var _this4 = this;

            var ctx = this._ctx,
                range = ctx.range,
                deletingHook = ctx.table.hook.deleting.fire,
                hasDeleteHook = deletingHook !== nop;
            if (!hasDeleteHook && isPlainKeyRange(ctx) && (ctx.isPrimKey && !hangsOnDeleteLargeKeyRange || !range)) // if no range, we'll use clear().
                {
                    // May use IDBObjectStore.delete(IDBKeyRange) in this case (Issue #208)
                    // For chromium, this is the way most optimized version.
                    // For IE/Edge, this could hang the indexedDB engine and make operating system instable
                    // (https://gist.github.com/dfahlander/5a39328f029de18222cf2125d56c38f7)
                    return this._write(function (resolve, reject, idbstore) {
                        // Our API contract is to return a count of deleted items, so we have to count() before delete().
                        var onerror = eventRejectHandler(reject),
                            countReq = range ? idbstore.count(range) : idbstore.count();
                        countReq.onerror = onerror;
                        countReq.onsuccess = function () {
                            var count = countReq.result;
                            tryCatch(function () {
                                var delReq = range ? idbstore.delete(range) : idbstore.clear();
                                delReq.onerror = onerror;
                                delReq.onsuccess = function () {
                                    return resolve(count);
                                };
                            }, function (err) {
                                return reject(err);
                            });
                        };
                    });
                }

            // Default version to use when collection is not a vanilla IDBKeyRange on the primary key.
            // Divide into chunks to not starve RAM.
            // If has delete hook, we will have to collect not just keys but also objects, so it will use
            // more memory and need lower chunk size.
            var CHUNKSIZE = hasDeleteHook ? 2000 : 10000;

            return this._write(function (resolve, reject, idbstore, trans) {
                var totalCount = 0;
                // Clone collection and change its table and set a limit of CHUNKSIZE on the cloned Collection instance.
                var collection = _this4.clone({
                    keysOnly: !ctx.isMatch && !hasDeleteHook }) // load just keys (unless filter() or and() or deleteHook has subscribers)
                .distinct() // In case multiEntry is used, never delete same key twice because resulting count
                // would become larger than actual delete count.
                .limit(CHUNKSIZE).raw(); // Don't filter through reading-hooks (like mapped classes etc)

                var keysOrTuples = [];

                // We're gonna do things on as many chunks that are needed.
                // Use recursion of nextChunk function:
                var nextChunk = function () {
                    return collection.each(hasDeleteHook ? function (val, cursor) {
                        // Somebody subscribes to hook('deleting'). Collect all primary keys and their values,
                        // so that the hook can be called with its values in bulkDelete().
                        keysOrTuples.push([cursor.primaryKey, cursor.value]);
                    } : function (val, cursor) {
                        // No one subscribes to hook('deleting'). Collect only primary keys:
                        keysOrTuples.push(cursor.primaryKey);
                    }).then(function () {
                        // Chromium deletes faster when doing it in sort order.
                        hasDeleteHook ? keysOrTuples.sort(function (a, b) {
                            return ascending(a[0], b[0]);
                        }) : keysOrTuples.sort(ascending);
                        return bulkDelete(idbstore, trans, keysOrTuples, hasDeleteHook, deletingHook);
                    }).then(function () {
                        var count = keysOrTuples.length;
                        totalCount += count;
                        keysOrTuples = [];
                        return count < CHUNKSIZE ? totalCount : nextChunk();
                    });
                };

                resolve(nextChunk());
            });
        }
    });

    //
    //
    //
    // ------------------------- Help functions ---------------------------
    //
    //
    //

    function lowerVersionFirst(a, b) {
        return a._cfg.version - b._cfg.version;
    }

    function setApiOnPlace(objs, tableNames, mode, dbschema) {
        tableNames.forEach(function (tableName) {
            var tableInstance = db._tableFactory(mode, dbschema[tableName]);
            objs.forEach(function (obj) {
                tableName in obj || (obj[tableName] = tableInstance);
            });
        });
    }

    function removeTablesApi(objs) {
        objs.forEach(function (obj) {
            for (var key in obj) {
                if (obj[key] instanceof Table) delete obj[key];
            }
        });
    }

    function iterate(req, filter, fn, resolve, reject, valueMapper) {

        // Apply valueMapper (hook('reading') or mappped class)
        var mappedFn = valueMapper ? function (x, c, a) {
            return fn(valueMapper(x), c, a);
        } : fn;
        // Wrap fn with PSD and microtick stuff from Promise.
        var wrappedFn = wrap(mappedFn, reject);

        if (!req.onerror) req.onerror = eventRejectHandler(reject);
        if (filter) {
            req.onsuccess = trycatcher(function filter_record() {
                var cursor = req.result;
                if (cursor) {
                    var c = function () {
                        cursor.continue();
                    };
                    if (filter(cursor, function (advancer) {
                        c = advancer;
                    }, resolve, reject)) wrappedFn(cursor.value, cursor, function (advancer) {
                        c = advancer;
                    });
                    c();
                } else {
                    resolve();
                }
            }, reject);
        } else {
            req.onsuccess = trycatcher(function filter_record() {
                var cursor = req.result;
                if (cursor) {
                    var c = function () {
                        cursor.continue();
                    };
                    wrappedFn(cursor.value, cursor, function (advancer) {
                        c = advancer;
                    });
                    c();
                } else {
                    resolve();
                }
            }, reject);
        }
    }

    function parseIndexSyntax(indexes) {
        /// <param name="indexes" type="String"></param>
        /// <returns type="Array" elementType="IndexSpec"></returns>
        var rv = [];
        indexes.split(',').forEach(function (index) {
            index = index.trim();
            var name = index.replace(/([&*]|\+\+)/g, ""); // Remove "&", "++" and "*"
            // Let keyPath of "[a+b]" be ["a","b"]:
            var keyPath = /^\[/.test(name) ? name.match(/^\[(.*)\]$/)[1].split('+') : name;

            rv.push(new IndexSpec(name, keyPath || null, /\&/.test(index), /\*/.test(index), /\+\+/.test(index), isArray(keyPath), /\./.test(index)));
        });
        return rv;
    }

    function cmp(key1, key2) {
        return indexedDB.cmp(key1, key2);
    }

    function min(a, b) {
        return cmp(a, b) < 0 ? a : b;
    }

    function max(a, b) {
        return cmp(a, b) > 0 ? a : b;
    }

    function ascending(a, b) {
        return indexedDB.cmp(a, b);
    }

    function descending(a, b) {
        return indexedDB.cmp(b, a);
    }

    function simpleCompare(a, b) {
        return a < b ? -1 : a === b ? 0 : 1;
    }

    function simpleCompareReverse(a, b) {
        return a > b ? -1 : a === b ? 0 : 1;
    }

    function combine(filter1, filter2) {
        return filter1 ? filter2 ? function () {
            return filter1.apply(this, arguments) && filter2.apply(this, arguments);
        } : filter1 : filter2;
    }

    function readGlobalSchema() {
        db.verno = idbdb.version / 10;
        db._dbSchema = globalSchema = {};
        dbStoreNames = slice(idbdb.objectStoreNames, 0);
        if (dbStoreNames.length === 0) return; // Database contains no stores.
        var trans = idbdb.transaction(safariMultiStoreFix(dbStoreNames), 'readonly');
        dbStoreNames.forEach(function (storeName) {
            var store = trans.objectStore(storeName),
                keyPath = store.keyPath,
                dotted = keyPath && typeof keyPath === 'string' && keyPath.indexOf('.') !== -1;
            var primKey = new IndexSpec(keyPath, keyPath || "", false, false, !!store.autoIncrement, keyPath && typeof keyPath !== 'string', dotted);
            var indexes = [];
            for (var j = 0; j < store.indexNames.length; ++j) {
                var idbindex = store.index(store.indexNames[j]);
                keyPath = idbindex.keyPath;
                dotted = keyPath && typeof keyPath === 'string' && keyPath.indexOf('.') !== -1;
                var index = new IndexSpec(idbindex.name, keyPath, !!idbindex.unique, !!idbindex.multiEntry, false, keyPath && typeof keyPath !== 'string', dotted);
                indexes.push(index);
            }
            globalSchema[storeName] = new TableSchema(storeName, primKey, indexes, {});
        });
        setApiOnPlace([allTables, Transaction.prototype], keys(globalSchema), READWRITE, globalSchema);
    }

    function adjustToExistingIndexNames(schema, idbtrans) {
        /// <summary>
        /// Issue #30 Problem with existing db - adjust to existing index names when migrating from non-dexie db
        /// </summary>
        /// <param name="schema" type="Object">Map between name and TableSchema</param>
        /// <param name="idbtrans" type="IDBTransaction"></param>
        var storeNames = idbtrans.db.objectStoreNames;
        for (var i = 0; i < storeNames.length; ++i) {
            var storeName = storeNames[i];
            var store = idbtrans.objectStore(storeName);
            hasGetAll = 'getAll' in store;
            for (var j = 0; j < store.indexNames.length; ++j) {
                var indexName = store.indexNames[j];
                var keyPath = store.index(indexName).keyPath;
                var dexieName = typeof keyPath === 'string' ? keyPath : "[" + slice(keyPath).join('+') + "]";
                if (schema[storeName]) {
                    var indexSpec = schema[storeName].idxByName[dexieName];
                    if (indexSpec) indexSpec.name = indexName;
                }
            }
        }
    }

    function fireOnBlocked(ev) {
        db.on("blocked").fire(ev);
        // Workaround (not fully*) for missing "versionchange" event in IE,Edge and Safari:
        connections.filter(function (c) {
            return c.name === db.name && c !== db && !c._vcFired;
        }).map(function (c) {
            return c.on("versionchange").fire(ev);
        });
    }

    extend(this, {
        Collection: Collection,
        Table: Table,
        Transaction: Transaction,
        Version: Version,
        WhereClause: WhereClause,
        WriteableCollection: WriteableCollection,
        WriteableTable: WriteableTable
    });

    init();

    addons.forEach(function (fn) {
        fn(db);
    });
}

var fakeAutoComplete = function () {}; // Will never be changed. We just fake for the IDE that we change it (see doFakeAutoComplete())
var fake = false; // Will never be changed. We just fake for the IDE that we change it (see doFakeAutoComplete())

function parseType(type) {
    if (typeof type === 'function') {
        return new type();
    } else if (isArray(type)) {
        return [parseType(type[0])];
    } else if (type && typeof type === 'object') {
        var rv = {};
        applyStructure(rv, type);
        return rv;
    } else {
        return type;
    }
}

function applyStructure(obj, structure) {
    keys(structure).forEach(function (member) {
        var value = parseType(structure[member]);
        obj[member] = value;
    });
    return obj;
}

function eventSuccessHandler(done) {
    return function (ev) {
        done(ev.target.result);
    };
}

function hookedEventSuccessHandler(resolve) {
    // wrap() is needed when calling hooks because the rare scenario of:
    //  * hook does a db operation that fails immediately (IDB throws exception)
    //    For calling db operations on correct transaction, wrap makes sure to set PSD correctly.
    //    wrap() will also execute in a virtual tick.
    //  * If not wrapped in a virtual tick, direct exception will launch a new physical tick.
    //  * If this was the last event in the bulk, the promise will resolve after a physical tick
    //    and the transaction will have committed already.
    // If no hook, the virtual tick will be executed in the reject()/resolve of the final promise,
    // because it is always marked with _lib = true when created using Transaction._promise().
    return wrap(function (event) {
        var req = event.target,
            result = req.result,
            ctx = req._hookCtx,
            // Contains the hook error handler. Put here instead of closure to boost performance.
        hookSuccessHandler = ctx && ctx.onsuccess;
        hookSuccessHandler && hookSuccessHandler(result);
        resolve && resolve(result);
    }, resolve);
}

function eventRejectHandler(reject) {
    return function (event) {
        preventDefault(event);
        reject(event.target.error);
        return false;
    };
}

function hookedEventRejectHandler(reject) {
    return wrap(function (event) {
        // See comment on hookedEventSuccessHandler() why wrap() is needed only when supporting hooks.

        var req = event.target,
            err = req.error,
            ctx = req._hookCtx,
            // Contains the hook error handler. Put here instead of closure to boost performance.
        hookErrorHandler = ctx && ctx.onerror;
        hookErrorHandler && hookErrorHandler(err);
        preventDefault(event);
        reject(err);
        return false;
    });
}

function preventDefault(event) {
    if (event.stopPropagation) // IndexedDBShim doesnt support this on Safari 8 and below.
        event.stopPropagation();
    if (event.preventDefault) // IndexedDBShim doesnt support this on Safari 8 and below.
        event.preventDefault();
}

function globalDatabaseList(cb) {
    var val,
        localStorage = Dexie.dependencies.localStorage;
    if (!localStorage) return cb([]); // Envs without localStorage support
    try {
        val = JSON.parse(localStorage.getItem('Dexie.DatabaseNames') || "[]");
    } catch (e) {
        val = [];
    }
    if (cb(val)) {
        localStorage.setItem('Dexie.DatabaseNames', JSON.stringify(val));
    }
}

function awaitIterator(iterator) {
    var callNext = function (result) {
        return iterator.next(result);
    },
        doThrow = function (error) {
        return iterator.throw(error);
    },
        onSuccess = step(callNext),
        onError = step(doThrow);

    function step(getNext) {
        return function (val) {
            var next = getNext(val),
                value = next.value;

            return next.done ? value : !value || typeof value.then !== 'function' ? isArray(value) ? Promise.all(value).then(onSuccess, onError) : onSuccess(value) : value.then(onSuccess, onError);
        };
    }

    return step(callNext)();
}

//
// IndexSpec struct
//
function IndexSpec(name, keyPath, unique, multi, auto, compound, dotted) {
    /// <param name="name" type="String"></param>
    /// <param name="keyPath" type="String"></param>
    /// <param name="unique" type="Boolean"></param>
    /// <param name="multi" type="Boolean"></param>
    /// <param name="auto" type="Boolean"></param>
    /// <param name="compound" type="Boolean"></param>
    /// <param name="dotted" type="Boolean"></param>
    this.name = name;
    this.keyPath = keyPath;
    this.unique = unique;
    this.multi = multi;
    this.auto = auto;
    this.compound = compound;
    this.dotted = dotted;
    var keyPathSrc = typeof keyPath === 'string' ? keyPath : keyPath && '[' + [].join.call(keyPath, '+') + ']';
    this.src = (unique ? '&' : '') + (multi ? '*' : '') + (auto ? "++" : "") + keyPathSrc;
}

//
// TableSchema struct
//
function TableSchema(name, primKey, indexes, instanceTemplate) {
    /// <param name="name" type="String"></param>
    /// <param name="primKey" type="IndexSpec"></param>
    /// <param name="indexes" type="Array" elementType="IndexSpec"></param>
    /// <param name="instanceTemplate" type="Object"></param>
    this.name = name;
    this.primKey = primKey || new IndexSpec();
    this.indexes = indexes || [new IndexSpec()];
    this.instanceTemplate = instanceTemplate;
    this.mappedClass = null;
    this.idxByName = arrayToObject(indexes, function (index) {
        return [index.name, index];
    });
}

// Used in when defining dependencies later...
// (If IndexedDBShim is loaded, prefer it before standard indexedDB)
var idbshim = _global.idbModules && _global.idbModules.shimIndexedDB ? _global.idbModules : {};

function safariMultiStoreFix(storeNames) {
    return storeNames.length === 1 ? storeNames[0] : storeNames;
}

function getNativeGetDatabaseNamesFn(indexedDB) {
    var fn = indexedDB && (indexedDB.getDatabaseNames || indexedDB.webkitGetDatabaseNames);
    return fn && fn.bind(indexedDB);
}

// Export Error classes
props(Dexie, fullNameExceptions); // Dexie.XXXError = class XXXError {...};

//
// Static methods and properties
// 
props(Dexie, {

    //
    // Static delete() method.
    //
    delete: function (databaseName) {
        var db = new Dexie(databaseName),
            promise = db.delete();
        promise.onblocked = function (fn) {
            db.on("blocked", fn);
            return this;
        };
        return promise;
    },

    //
    // Static exists() method.
    //
    exists: function (name) {
        return new Dexie(name).open().then(function (db) {
            db.close();
            return true;
        }).catch(Dexie.NoSuchDatabaseError, function () {
            return false;
        });
    },

    //
    // Static method for retrieving a list of all existing databases at current host.
    //
    getDatabaseNames: function (cb) {
        return new Promise(function (resolve, reject) {
            var getDatabaseNames = getNativeGetDatabaseNamesFn(indexedDB);
            if (getDatabaseNames) {
                // In case getDatabaseNames() becomes standard, let's prepare to support it:
                var req = getDatabaseNames();
                req.onsuccess = function (event) {
                    resolve(slice(event.target.result, 0)); // Converst DOMStringList to Array<String>
                };
                req.onerror = eventRejectHandler(reject);
            } else {
                globalDatabaseList(function (val) {
                    resolve(val);
                    return false;
                });
            }
        }).then(cb);
    },

    defineClass: function (structure) {
        /// <summary>
        ///     Create a javascript constructor based on given template for which properties to expect in the class.
        ///     Any property that is a constructor function will act as a type. So {name: String} will be equal to {name: new String()}.
        /// </summary>
        /// <param name="structure">Helps IDE code completion by knowing the members that objects contain and not just the indexes. Also
        /// know what type each member has. Example: {name: String, emailAddresses: [String], properties: {shoeSize: Number}}</param>

        // Default constructor able to copy given properties into this object.
        function Class(properties) {
            /// <param name="properties" type="Object" optional="true">Properties to initialize object with.
            /// </param>
            properties ? extend(this, properties) : fake && applyStructure(this, structure);
        }
        return Class;
    },

    applyStructure: applyStructure,

    ignoreTransaction: function (scopeFunc) {
        // In case caller is within a transaction but needs to create a separate transaction.
        // Example of usage:
        //
        // Let's say we have a logger function in our app. Other application-logic should be unaware of the
        // logger function and not need to include the 'logentries' table in all transaction it performs.
        // The logging should always be done in a separate transaction and not be dependant on the current
        // running transaction context. Then you could use Dexie.ignoreTransaction() to run code that starts a new transaction.
        //
        //     Dexie.ignoreTransaction(function() {
        //         db.logentries.add(newLogEntry);
        //     });
        //
        // Unless using Dexie.ignoreTransaction(), the above example would try to reuse the current transaction
        // in current Promise-scope.
        //
        // An alternative to Dexie.ignoreTransaction() would be setImmediate() or setTimeout(). The reason we still provide an
        // API for this because
        //  1) The intention of writing the statement could be unclear if using setImmediate() or setTimeout().
        //  2) setTimeout() would wait unnescessary until firing. This is however not the case with setImmediate().
        //  3) setImmediate() is not supported in the ES standard.
        //  4) You might want to keep other PSD state that was set in a parent PSD, such as PSD.letThrough.
        return PSD.trans ? usePSD(PSD.transless, scopeFunc) : // Use the closest parent that was non-transactional.
        scopeFunc(); // No need to change scope because there is no ongoing transaction.
    },

    vip: function (fn) {
        // To be used by subscribers to the on('ready') event.
        // This will let caller through to access DB even when it is blocked while the db.ready() subscribers are firing.
        // This would have worked automatically if we were certain that the Provider was using Dexie.Promise for all asyncronic operations. The promise PSD
        // from the provider.connect() call would then be derived all the way to when provider would call localDatabase.applyChanges(). But since
        // the provider more likely is using non-promise async APIs or other thenable implementations, we cannot assume that.
        // Note that this method is only useful for on('ready') subscribers that is returning a Promise from the event. If not using vip()
        // the database could deadlock since it wont open until the returned Promise is resolved, and any non-VIPed operation started by
        // the caller will not resolve until database is opened.
        return newScope(function () {
            PSD.letThrough = true; // Make sure we are let through if still blocking db due to onready is firing.
            return fn();
        });
    },

    async: function (generatorFn) {
        return function () {
            try {
                var rv = awaitIterator(generatorFn.apply(this, arguments));
                if (!rv || typeof rv.then !== 'function') return Promise.resolve(rv);
                return rv;
            } catch (e) {
                return rejection(e);
            }
        };
    },

    spawn: function (generatorFn, args, thiz) {
        try {
            var rv = awaitIterator(generatorFn.apply(thiz, args || []));
            if (!rv || typeof rv.then !== 'function') return Promise.resolve(rv);
            return rv;
        } catch (e) {
            return rejection(e);
        }
    },

    // Dexie.currentTransaction property
    currentTransaction: {
        get: function () {
            return PSD.trans || null;
        }
    },

    // Export our Promise implementation since it can be handy as a standalone Promise implementation
    Promise: Promise,

    // Dexie.debug proptery:
    // Dexie.debug = false
    // Dexie.debug = true
    // Dexie.debug = "dexie" - don't hide dexie's stack frames.
    debug: {
        get: function () {
            return debug;
        },
        set: function (value) {
            setDebug(value, value === 'dexie' ? function () {
                return true;
            } : dexieStackFrameFilter);
        }
    },

    // Export our derive/extend/override methodology
    derive: derive,
    extend: extend,
    props: props,
    override: override,
    // Export our Events() function - can be handy as a toolkit
    Events: Events,
    events: { get: deprecated(function () {
            return Events;
        }) }, // Backward compatible lowercase version.
    // Utilities
    getByKeyPath: getByKeyPath,
    setByKeyPath: setByKeyPath,
    delByKeyPath: delByKeyPath,
    shallowClone: shallowClone,
    deepClone: deepClone,
    getObjectDiff: getObjectDiff,
    asap: asap,
    maxKey: maxKey,
    // Addon registry
    addons: [],
    // Global DB connection list
    connections: connections,

    MultiModifyError: exceptions.Modify, // Backward compatibility 0.9.8. Deprecate.
    errnames: errnames,

    // Export other static classes
    IndexSpec: IndexSpec,
    TableSchema: TableSchema,

    //
    // Dependencies
    //
    // These will automatically work in browsers with indexedDB support, or where an indexedDB polyfill has been included.
    //
    // In node.js, however, these properties must be set "manually" before instansiating a new Dexie().
    // For node.js, you need to require indexeddb-js or similar and then set these deps.
    //
    dependencies: {
        // Required:
        indexedDB: idbshim.shimIndexedDB || _global.indexedDB || _global.mozIndexedDB || _global.webkitIndexedDB || _global.msIndexedDB,
        IDBKeyRange: idbshim.IDBKeyRange || _global.IDBKeyRange || _global.webkitIDBKeyRange
    },

    // API Version Number: Type Number, make sure to always set a version number that can be comparable correctly. Example: 0.9, 0.91, 0.92, 1.0, 1.01, 1.1, 1.2, 1.21, etc.
    semVer: DEXIE_VERSION,
    version: DEXIE_VERSION.split('.').map(function (n) {
        return parseInt(n);
    }).reduce(function (p, c, i) {
        return p + c / Math.pow(10, i * 2);
    }),
    fakeAutoComplete: fakeAutoComplete,

    // https://github.com/dfahlander/Dexie.js/issues/186
    // typescript compiler tsc in mode ts-->es5 & commonJS, will expect require() to return
    // x.default. Workaround: Set Dexie.default = Dexie.
    default: Dexie
});

tryCatch(function () {
    // Optional dependencies
    // localStorage
    Dexie.dependencies.localStorage = (typeof chrome !== "undefined" && chrome !== null ? chrome.storage : void 0) != null ? null : _global.localStorage;
});

// Map DOMErrors and DOMExceptions to corresponding Dexie errors. May change in Dexie v2.0.
Promise.rejectionMapper = mapError;

// Fool IDE to improve autocomplete. Tested with Visual Studio 2013 and 2015.
doFakeAutoComplete(function () {
    Dexie.fakeAutoComplete = fakeAutoComplete = doFakeAutoComplete;
    Dexie.fake = fake = true;
});

return Dexie;

})));


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],2:[function(require,module,exports){

const command = {
  run: function(cmd) {

    let args = require('../terminal.js').utils.parse_arguments(cmd)
    let value = 0
    for(let n of args) {
      if(isNaN(n)) throw "Not a number"
      value += n
    }
    return value
  }
}

module.exports = command
},{"../terminal.js":17}],3:[function(require,module,exports){
let total = 0

const command = {
  run: function(cmd) {
    return `This command has been run ${total++} times`
  }
}

module.exports = command
},{}],4:[function(require,module,exports){
const command = {
  run: function(cmd) {
    return cmd
  },

  help: function() {
    return `Returns the arguments`
  }
}

module.exports = command
},{}],5:[function(require,module,exports){
const universe = require('../location.js').universe
const orbit = require('../utils/orbit.js')

const command = {
  run: function(cmd) {
    let args = require('../terminal.js').utils.parse_arguments(cmd)
    let target = universe[args[0]]
    if(!target) throw "Unknown target"

    console.log(target)
    console.log(universe.player)
    let next = orbit.getNextWindow(universe.player.parent, target)

    return 12
  },

  help: function(opts) {
    return '<target body> Finds the next transfer window from the current position to the selected celestial body'
  },
}

module.exports = command
},{"../location.js":14,"../terminal.js":17,"../utils/orbit.js":18}],6:[function(require,module,exports){
const command = {
  run: function(cmd) {
    return cmd
  },

  isAllowed: function() {
    return false
  },
}

module.exports = command
},{}],7:[function(require,module,exports){

const command = {
  run: function(cmd) {
    let commands = require('./')
    let args = require('../terminal.js').utils.parse_arguments(cmd)

    if(args[0]) { // Is there a specified command ?
      let name = args[0]
      if( commands[name] // Does the command exist ?
        && (!commands[name].isAllowed || commands[name].isAllowed() )) { // Is it allowed ?
          if(commands[name].help) return commands[name].help(cmd)
          else return `The command has no help page`
      }
      return `The command is not recognized`
    }


    let val = `Hello`
    for(let name in commands) {
      if(!commands[name].isAllowed || commands[name].isAllowed()) {
        val += `\n  [[b;;]${name}] `
        if(commands[name].help) val += commands[name].help('list')
      }
    }
    return val
  },


}

module.exports = command
},{"../terminal.js":17,"./":8}],8:[function(require,module,exports){
const commands = {
  add: require('./add.js'),
  count: require('./count.js'),
  echo: require('./echo.js'),
  find_window: require('./findWindow.js'),
  forbidden: require('./forbidden.js'),
  help: require('./help.js'),
  log: require('./log.js'),
  status: require('./status.js'),
}

module.exports = commands
},{"./add.js":2,"./count.js":3,"./echo.js":4,"./findWindow.js":5,"./forbidden.js":6,"./help.js":7,"./log.js":9,"./status.js":10}],9:[function(require,module,exports){
const command = {
  run: function(cmd) {
    console.log(cmd.rest)
  }
}

module.exports = command
},{}],10:[function(require,module,exports){
const location = require('../location.js')

const command = {
  run: function() {
    let ship = location.universe.player
    return `Currently orbiting ${ship.parent.name}
Semi-major axis: ${location.getFormattedDistance(ship.sma)}
Fuel level: 100%
Hull integrity: 100%
No transfer in progress`
  },

  help: function() {
    return `display information about the ship's current situation`
  }
}

module.exports = command
},{"../location.js":14}],11:[function(require,module,exports){
const time = require('./utils/time.js')

// Data to be loaded on a new save
const solarSystem = [
  {name:"sun", type:"sun", sma:0, mass:1.989e30},
    {name:"jupiter", type:"planet", sma:0, mass:1.8986e27, parent:"sun"},
      {name:"io", type:"moon",sma:4.217e8,mass:8.9319e22,anomalyAtEpoch:10,parent:"jupiter"},
        {name:"start",sma:1.93e6,parent:"io"},
        {name:"player", type:"ship",sma:1.93e6,mass:1e4,anomalyAtEpoch:0,parent:"io"},
      {name:"europa", type:"moon",sma:6.71e8,mass:4.8e22,anomalyAtEpoch:0,parent:"jupiter"},
        {name:"end",sma:1.66e6,parent:"europa"},
      {name:"ganymede", type:"moon",sma:1.070412e9,mass:1.4819e23,anomalyAtEpoch:0,parent:"jupiter"},
      {name:"callisto", type:"moon",sma:1.070412e9,mass:1.4819e23,anomalyAtEpoch:0,parent:"jupiter"},
        {name:"station", type:"station",sma:10,parent:"callisto"},
    {name:"earth", type:"planet", sma:1.496e11, mass:5.9723e24, anomalyAtEpoch:129.55, parent:"sun"},
      {name:"iss", type:"station",sma:6.780e6,mass:5e5,parent:"earth"},
    {name:"mars", type:"planet",sma:2.2792e11,mass:6.4171e23,anomalyAtEpoch:25.27,parent:"sun"},

/* Earth Mean Orbital Elements (J2000)
  Semimajor axis (AU)                  1.00000011  
  Orbital eccentricity                 0.01671022   
  Orbital inclination (deg)            0.00005  
  Longitude of ascending node (deg)  -11.26064  
  Longitude of perihelion (deg)      102.94719  
  Mean Longitude (deg)               100.46435
 

 Mars orbital elements
  Semimajor axis (AU)                  1.52366231  
  Orbital eccentricity                 0.09341233   
  Orbital inclination (deg)            1.85061   
  Longitude of ascending node (deg)   49.57854  
  Longitude of perihelion (deg)      336.04084   
  Mean Longitude (deg)               355.45332
  */


  // kerbol test dataset
  {name:"kerbol", type:"sun",sma:0,mass:1.75e28},
    {name:"kerbin",type:"planet",sma:13599840256,mass:5.29e22,parent:"kerbol"},
      {name:"kerbal",sma:700000,mass:100,parent:"kerbin"},
    {name:"duna", type:"planet",sma:20726155264,mass:4.515e21,parent:"kerbol"},
      {name:"destination",sma:700000,mass:100,parent:"duna"},
]

solarSystem.forEach(body => {body.epoch = time.current})

module.exports = {solarSystem:solarSystem}
},{"./utils/time.js":19}],12:[function(require,module,exports){
const Dexie = require('dexie')
const data = require('./data.js')
const db = new Dexie('jovianWeek');

db.version(1).stores({
    universe:'name',
});

db.on("populate", function() {
  console.log('populate')
  db.universe.bulkAdd(data.solarSystem)
});

db.open().catch(function (e) {
    console.error("Open failed: " + e);
});


module.exports = db
},{"./data.js":11,"dexie":1}],13:[function(require,module,exports){
const game = { // quick access to modules
  system: require('./system.js'),
  orbit: require('./utils/orbit.js'),
  terminal: require('./terminal.js'),
  time: require('./utils/time.js'),
  player: require('./player.js'),
  commands: require('./commands/'),
  location: require('./location.js'),
  db: require('./db/'),
}

window.jovianWeek = game
module.exports = game
},{"./commands/":8,"./db/":12,"./location.js":14,"./player.js":15,"./system.js":16,"./terminal.js":17,"./utils/orbit.js":18,"./utils/time.js":19}],14:[function(require,module,exports){
const player = require('./player.js')

const location = {
  universe:{},

  // Returns a well formatted distance, input is in meters
  getFormattedDistance: function(distance) {
    let unit = " m"
    if(distance > 1e6) {
      distance = Math.round(distance/1000)
      unit = " km"
    }
    return (distance + unit).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ")
  },

  //TODO Most celestial bodies "on rails" should probably be left alone during the save/load cycle
  //TODO Only save ships to db ?
  //TODO Only save updated bodies to db ?
  //TODO move to a load / save system
  load:function(data) {
    for(let body of data) {
      if(!this.universe[body.name]) this.universe[body.name] = {}

      if(body.parent != null) {
        if(!this.universe[body.parent]) this.universe[body.parent] = {}
        let parent = this.universe[body.parent]
        body.parent = parent
        if(!parent.children) parent.children = {}
        parent.children[body.name] = this.universe[body.name]
      }

      Object.assign(this.universe[body.name], body) // adding properties
    }
    player.ship = this.universe.player
  },
  
  save:function() {
    const tempUniverse = []
    for(let name in this.universe) {
      let temp = Object.assign({},this.universe[name])
      if(temp.parent) temp.parent = temp.parent.name
      if(temp.children) delete temp.children
      tempUniverse.push(temp)
    }
    return tempUniverse
  },
}

module.exports = location
},{"./player.js":15}],15:[function(require,module,exports){
const player = {
  ship:{}, // set after load ?
  name: "jed",
  status: "orbiting",
  deltav: 100,
  balance: 156456000,
  hull: 100,
  takeDamage: function(damage) { this.hull -= 10; game.term.echo('[[;red;]Took '+damage+' damage!]')},
  canDock: function() { return (universe[game.player.location].type == "station")},
  dock: function() {},
  undock: function() {},
}

module.exports = player
},{}],16:[function(require,module,exports){
const player = require('./player.js')
const time = require('./utils/time.js')
const location = require('./location.js')
const db = require('./db.js')

const system = {
  updateDelta: 2500, // time between updates in ms
  epoch:0,
  runAtUpdate: [],
  lastSave:0,
  saveDelta:30000, // time between autosaves in ms

  
  save: function() {
    console.log('saving')
    db.universe.bulkPut(location.save())
    localStorage.setItem("save",JSON.stringify({
      name: player.name,
      location: player.location,
      status: player.status,
      deltav: player.deltav,
      balance: player.balance,
      hull: player.hull,
    }))
  },


  load: function() {
    console.log('loading')
    db.universe.toArray().then(data => {
      location.load(data)
    })

    var saveData = JSON.parse(localStorage.getItem("save"))
    if(!saveData) { return }
    this.epoch = Math.floor(Date.now() / 1000)
    player.name = saveData.name
    player.location = saveData.location
    player.status = saveData.status
    player.deltav = saveData.deltav
    player.balance = saveData.balance
    player.hull = saveData.hull
  },


  // Update loop
  
  addToUpdate: function(f) {
    if( typeof f == "function") this.runAtUpdate.push(f)
  },
  update: function() {
    console.log('update')

    for(let f of system.runAtUpdate) { f() } // 


    // Run autosave
    system.lastSave += system.updateDelta
    if(system.lastSave >= system.saveDelta) {
      system.lastSave = 0
      system.save()
    }


    setTimeout(system.update, system.updateDelta); // Next loop
  },

}

module.exports = system
},{"./db.js":12,"./location.js":14,"./player.js":15,"./utils/time.js":19}],17:[function(require,module,exports){
const player = require('./player.js')
const system = require('./system.js')
const commands = require('./commands/')

const options = {
  prompt: function(e) {e(`[[;green;]${player.status}]@[[;#777;]${player.location}]>`)},
  greetings: function(callback) {callback(`Welcome to Jovian Week ${player.name}`)},
  onBlur: function() { return false },
  onAfterCommand: function(e) { system.save() },
  completion: function(string, callback) { //TODO add support for arguments autocomplete
    const suggestions = []
    for(let name in commands) {
      if(!commands[name].isAllowed || commands[name].isAllowed()) {
        suggestions.push(name)
      }
    }
    callback(suggestions)
  },
  //keydown: function(e, term) { if(game.blocked) return false;},
}

function interpreter(command,term) {
  const cmd = terminal.utils.parse_command(command)
    
  if( commands[cmd.name] ) {
    if( !commands[cmd.name].isAllowed || commands[cmd.name].isAllowed() ) {
      try {
        return term.echo( commands[cmd.name].run(cmd.rest) )
      } catch(e) {
        console.error(e)
        return term.error(e.toString())
      }
    }
  }

  term.error("Command not recognized")
}


const terminal = {} // Provides utils and main (instance), but only after initialization

jQuery(document).ready(function($) {
  $('#console').terminal(interpreter, options)
  system.load()
  system.update()
  terminal.utils = $.terminal
  terminal.main = $('#console').terminal()
})


module.exports = terminal
},{"./commands/":8,"./player.js":15,"./system.js":16}],18:[function(require,module,exports){
const orbit = {
  // tools to compute orbit and transfer parameters
  getGravitationalParameter: function(body) { return 6.67408e-11 * body.mass },
  getPeriod: function(body) { //get orbital period in s, sma in m, mass in kg
    return 2 * Math.PI * Math.sqrt( Math.pow(body.sma,3) / this.getGravitationalParameter(body.parent) );
  },
  getVelocity: function(body) { return Math.sqrt(this.getGravitationalParameter(body.parent)/body.sma) },
  
  // Returns the current angle in degrees between periapsis and the body's position
  getMeanAnomaly: function(body, time=game.epoch) {

    let timeSinceEpoch = game.currentTime - game.epoch
    let period = this.getPeriod(body)
    let timeInLastOrbit = timeSinceEpoch % period
    let angleInLastOrbit = timeInLastOrbit / period * 360
    let currentAnomaly = (body.anomalyAtEpoch + angleInLastOrbit) % 360
    return currentAnomaly
  },

  // returns the eccentric anomly in gradians
  getEccentricAnomaly: function(body, t=game.epoch) {
    // should go into the get mean anomaly function
    let n = Math.sqrt( this.getGravitationalParameter(body.parent) / Math.pow(body.sma,3) )
    let M = body.anomalyAtEpoch + n * (t - body.epoch)

    var ε = 1e-18
    var maxIter =100
    var E
    var e = body.eccentricity
    //var M = this.getMeanAnomaly(body,epoch)

    if (e < 0.8) {
      E = M;
    } else {
      E = Math.PI;
    }

    var dE = 1,
        i = 0;
    while (Math.abs(dE) > ε && i < maxIter) {
      dE = (M + e * Math.sin(E) - E) / (1 - e * Math.cos(E));
      E = E + dE;
      i++;
    }

    return E;
  },


  getTrueAnomaly: function(body, epoch=game.epoch) {
    return epoch
  },

  // returns the phase angle (in degrees) between the origin body and the destination body
  getPhaseAngle: function(origin, destination) {
    // might need to be changed after eccentricity and inclination are added
    return this.getMeanAnomaly(destination) - this.getMeanAnomaly(origin)
  },

  getSynodicPeriod: function(body, body2) {
    let inv_period = 1/this.getPeriod(body) - 1/this.getPeriod(body2)
    return Math.abs(1/inv_period)
  },


  getTransferPhaseAngle(from,to) {
    return (1 - Math.pow((from.sma + to.sma)/(2*to.sma),1.5)) * 180
  },

  // compute a hohmann transfer from the origin orbit to the destination orbit
  // 
  // Orbits must be around different bodies, but with the same parent
  getTransfer: function(from,to) {
    // variables used in computation
    let origin = from.parent // origin body
    let destination = to.parent // destination body
    let a_1 = from.sma // sma at origin orbit
    let a_2 = to.sma // sma at destination orbit
    let r_1 = origin.sma // sma of the origin body
    let r_2 = destination.sma // sma of the destination body
    let mu_p = this.getGravitationalParameter(origin.parent)
    let mu_1 = this.getGravitationalParameter(origin)
    let mu_2 = this.getGravitationalParameter(destination)

    let transferTime = Math.PI * Math.sqrt( Math.pow(r_1+r_2,3)/(8*mu_p) )

    let phaseAngle = (1 - Math.pow((r_1 + r_2)/(2*r_2),1.5)) * 180

    // Injection velocity
    let v_h1 = Math.sqrt( 2*mu_p*r_2 / (r_1*(r_1+r_2)) ) // speed of hohman transfer at start
    let v_t1 = v_h1 - this.getVelocity(origin) // velocity change at departure
    let v_escape = Math.sqrt( v_t1*v_t1 + 2*mu_1/a_1 ) // velocity at departure escape
    let v_injection = v_escape - this.getVelocity(from) // injection delta v

    // Insertion velocity
    let v_h2 = Math.sqrt( 2*mu_p*r_1 / (r_2*(r_1+r_2)) ) // speed of hohmann transfer at target
    let v_t2 = v_h2 - this.getVelocity(destination) // velocity change at target
    let v_capture = Math.sqrt( v_t2*v_t2 + 2*mu_2/a_2 ) // velocity at target capture
    let v_insertion = v_capture - this.getVelocity(to)
    let v_total = v_injection + v_insertion

    let eta = v_escape*v_escape/2 - mu_1/a_1
    let e = Math.sqrt( 1 + 2*eta*a_1*a_1*v_escape*v_escape/(mu_1*mu_1) )
    let ejectionAngle = 180 - Math.acos(1/e) * (180/Math.PI) // Angle of burn to origin's prograde

    console.log("Transfer time : " + this.timeToString(transferTime))
    console.log("Phase angle : " + phaseAngle)
    console.log("Injection delta v : " +v_injection+ "m/s")
    console.log("Escape velocity : " +v_escape)
    console.log("e : " + e)
    console.log("ejectionAngle : " + ejectionAngle)
    console.log("Insertion delta v : " +v_insertion)
    console.log("Total delta v : " + v_total)

    let sma = (r_1+r_2)/2
    let eccentricity = (r_1 - r_2)/(r_1+r_2)
    let low
    if(origin.sma < destination.sma) {
      eccentricity *= -1
      low = origin 
    } else {
      low = destination
    }

    console.log(eccentricity)
    let window = {
      phaseAngle: phaseAngle,
      transferTime: transferTime,
      ejectionAngle: ejectionAngle,
      totalDeltaV: v_total,
      origin: origin,
      destination: destination
    }
    let injection = {
      type:"transfer",
      sma:(r_1+r_2)/2,
      eccentricity:eccentricity,
      parent:origin.parent,
      argumentOfPeriapsis:this.getMeanAnomaly(low),
      anomalyAtEpoch:this.getMeanAnomaly(origin),
      epoch:game.currentTime
    }
    let insertion = {
      type:"orbit",
      sma:a_2,
      eccentricity:0,
      parent:destination,
      argumentOfPeriapsis:0,
      anomalyAtEpoch:0,
      epoch:game.currentTime+transferTime
    }
    return {window:window,injection:injection}
  },



  getNextWindow: function(origin, destination) {
    // Assumption : All planets / moons orbits are circular and coplanar !
    let phaseAngle = this.getTransferPhaseAngle(origin, destination)
    let angularSpeedOrigin = 360 / this.getPeriod(origin)
    let angularSpeedDestination = 360 / this.getPeriod(destination)
    let angularSpeedDifference = angularSpeedDestination - angularSpeedOrigin // difference in angular speed between the two bodies
    let currentPhaseAngle = this.getMeanAnomaly(destination) - this.getMeanAnomaly(origin)
    let windowOpens = (this.getTransferPhaseAngle(origin, destination) - currentPhaseAngle) / angularSpeedDifference
    if(windowOpens < 0) {
      windowOpens += this.getSynodicPeriod(origin, destination)
    }
    console.log("Window for transfer opens in "+this.timeToString(windowOpens))
    return windowOpens

  },

  // Time functions
  // should be moved to own module
  timeInSeconds: function(string) { // convert a string like "7d12h" to a number of seconds
    var match = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/.exec(string)
    var res = 0;
    if(match[1]) { res += (+match[1] * 24 * 3600) }
    if(match[2]) { res += (+match[2] * 3600) }
    if(match[3]) { res += (+match[3] * 60) }
    return res
  }, 
  getRemainingTime: function(time) { // returns the number of seconds until the specified timestamp (in seconds)
    return this.timeToString( time - game.currentTime );
  },
  timeToString: function(time) { // converts a time in seconds to a nicer string
    var formattedTime = ""
    if(time < 0) {
      formattedTime += '-'
      time *= -1
    }
    if(time >= 31536000) { 
      formattedTime += Math.floor(time/31536000) +"y"
      time = time % 31536000
    }
    if(time >= 86400) { 
      formattedTime += Math.floor(time/86400) +"d"
      time = time % 86400
    }
    if(time >= 3600) { 
      formattedTime += Math.floor(time/3600) +"h"
      time = time % 3600
    }
    if(time >= 60) { 
      formattedTime += Math.floor(time/60) +"m"
      time = time % 60
    }
    if(time > 0) { 
      formattedTime += Math.floor(time) +"s"
    }
    return formattedTime
  }
}

module.exports = orbit
},{}],19:[function(require,module,exports){
module.exports = {
  current:42,
  epoch:0,

  timeInSeconds: function(string) { // convert a string like "7d12h" to a number of seconds
    var match = /^(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?$/.exec(string)
    var res = 0;
    if(match[1]) { res += (+match[1] * 24 * 3600) }
    if(match[2]) { res += (+match[2] * 3600) }
    if(match[3]) { res += (+match[3] * 60) }
    return res
  }, 

  getRemainingTime: function(time) { // returns the number of seconds until the specified timestamp (in seconds)
    return this.timeToString( time - game.currentTime );
  },
  
  timeToString: function(time) { // converts a time in seconds to a nicer string
    var formattedTime = ""
    if(time < 0) {
      formattedTime += '-'
      time *= -1
    }
    if(time >= 31536000) { 
      formattedTime += Math.floor(time/31536000) +"y"
      time = time % 31536000
    }
    if(time >= 86400) { 
      formattedTime += Math.floor(time/86400) +"d"
      time = time % 86400
    }
    if(time >= 3600) { 
      formattedTime += Math.floor(time/3600) +"h"
      time = time % 3600
    }
    if(time >= 60) { 
      formattedTime += Math.floor(time/60) +"m"
      time = time % 60
    }
    if(time > 0) { 
      formattedTime += Math.floor(time) +"s"
    }
    return formattedTime
  }
}
},{}]},{},[13])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGV4aWUvZGlzdC9kZXhpZS5qcyIsInNyYy9jb21tYW5kcy9hZGQuanMiLCJzcmMvY29tbWFuZHMvY291bnQuanMiLCJzcmMvY29tbWFuZHMvZWNoby5qcyIsInNyYy9jb21tYW5kcy9maW5kV2luZG93LmpzIiwic3JjL2NvbW1hbmRzL2ZvcmJpZGRlbi5qcyIsInNyYy9jb21tYW5kcy9oZWxwLmpzIiwic3JjL2NvbW1hbmRzL2luZGV4LmpzIiwic3JjL2NvbW1hbmRzL2xvZy5qcyIsInNyYy9jb21tYW5kcy9zdGF0dXMuanMiLCJzcmMvZGF0YS5qcyIsInNyYy9kYi5qcyIsInNyYy9nYW1lLmpzIiwic3JjL2xvY2F0aW9uLmpzIiwic3JjL3BsYXllci5qcyIsInNyYy9zeXN0ZW0uanMiLCJzcmMvdGVybWluYWwuanMiLCJzcmMvdXRpbHMvb3JiaXQuanMiLCJzcmMvdXRpbHMvdGltZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1L0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZ2xvYmFsLCBmYWN0b3J5KSB7XG4gICB0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgPyBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoKSA6XG4gICB0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQgPyBkZWZpbmUoZmFjdG9yeSkgOlxuICAgKGdsb2JhbC5EZXhpZSA9IGZhY3RvcnkoKSk7XG59KHRoaXMsIChmdW5jdGlvbiAoKSB7ICd1c2Ugc3RyaWN0JztcblxuLypcclxuKiBEZXhpZS5qcyAtIGEgbWluaW1hbGlzdGljIHdyYXBwZXIgZm9yIEluZGV4ZWREQlxyXG4qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbipcclxuKiBCeSBEYXZpZCBGYWhsYW5kZXIsIGRhdmlkLmZhaGxhbmRlckBnbWFpbC5jb21cclxuKlxyXG4qIFZlcnNpb24gMS41LjEsIFR1ZSBOb3YgMDEgMjAxNlxyXG4qIHd3dy5kZXhpZS5jb21cclxuKiBBcGFjaGUgTGljZW5zZSBWZXJzaW9uIDIuMCwgSmFudWFyeSAyMDA0LCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvXHJcbiovXG52YXIga2V5cyA9IE9iamVjdC5rZXlzO1xudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5O1xudmFyIF9nbG9iYWwgPSB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiBnbG9iYWw7XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmosIGV4dGVuc2lvbikge1xuICAgIGlmICh0eXBlb2YgZXh0ZW5zaW9uICE9PSAnb2JqZWN0JykgcmV0dXJuIG9iajtcbiAgICBrZXlzKGV4dGVuc2lvbikuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIG9ialtrZXldID0gZXh0ZW5zaW9uW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbn1cblxudmFyIGdldFByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xudmFyIF9oYXNPd24gPSB7fS5oYXNPd25Qcm9wZXJ0eTtcbmZ1bmN0aW9uIGhhc093bihvYmosIHByb3ApIHtcbiAgICByZXR1cm4gX2hhc093bi5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbmZ1bmN0aW9uIHByb3BzKHByb3RvLCBleHRlbnNpb24pIHtcbiAgICBpZiAodHlwZW9mIGV4dGVuc2lvbiA9PT0gJ2Z1bmN0aW9uJykgZXh0ZW5zaW9uID0gZXh0ZW5zaW9uKGdldFByb3RvKHByb3RvKSk7XG4gICAga2V5cyhleHRlbnNpb24pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgICBzZXRQcm9wKHByb3RvLCBrZXksIGV4dGVuc2lvbltrZXldKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2V0UHJvcChvYmosIHByb3AsIGZ1bmN0aW9uT3JHZXRTZXQsIG9wdGlvbnMpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBwcm9wLCBleHRlbmQoZnVuY3Rpb25PckdldFNldCAmJiBoYXNPd24oZnVuY3Rpb25PckdldFNldCwgXCJnZXRcIikgJiYgdHlwZW9mIGZ1bmN0aW9uT3JHZXRTZXQuZ2V0ID09PSAnZnVuY3Rpb24nID8geyBnZXQ6IGZ1bmN0aW9uT3JHZXRTZXQuZ2V0LCBzZXQ6IGZ1bmN0aW9uT3JHZXRTZXQuc2V0LCBjb25maWd1cmFibGU6IHRydWUgfSA6IHsgdmFsdWU6IGZ1bmN0aW9uT3JHZXRTZXQsIGNvbmZpZ3VyYWJsZTogdHJ1ZSwgd3JpdGFibGU6IHRydWUgfSwgb3B0aW9ucykpO1xufVxuXG5mdW5jdGlvbiBkZXJpdmUoQ2hpbGQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBmcm9tOiBmdW5jdGlvbiAoUGFyZW50KSB7XG4gICAgICAgICAgICBDaGlsZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFBhcmVudC5wcm90b3R5cGUpO1xuICAgICAgICAgICAgc2V0UHJvcChDaGlsZC5wcm90b3R5cGUsIFwiY29uc3RydWN0b3JcIiwgQ2hpbGQpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBleHRlbmQ6IHByb3BzLmJpbmQobnVsbCwgQ2hpbGQucHJvdG90eXBlKVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbnZhciBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuXG5mdW5jdGlvbiBnZXRQcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKSB7XG4gICAgdmFyIHBkID0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iaiwgcHJvcCksXG4gICAgICAgIHByb3RvO1xuICAgIHJldHVybiBwZCB8fCAocHJvdG8gPSBnZXRQcm90byhvYmopKSAmJiBnZXRQcm9wZXJ0eURlc2NyaXB0b3IocHJvdG8sIHByb3ApO1xufVxuXG52YXIgX3NsaWNlID0gW10uc2xpY2U7XG5mdW5jdGlvbiBzbGljZShhcmdzLCBzdGFydCwgZW5kKSB7XG4gICAgcmV0dXJuIF9zbGljZS5jYWxsKGFyZ3MsIHN0YXJ0LCBlbmQpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZShvcmlnRnVuYywgb3ZlcnJpZGVkRmFjdG9yeSkge1xuICAgIHJldHVybiBvdmVycmlkZWRGYWN0b3J5KG9yaWdGdW5jKTtcbn1cblxuZnVuY3Rpb24gZG9GYWtlQXV0b0NvbXBsZXRlKGZuKSB7XG4gICAgdmFyIHRvID0gc2V0VGltZW91dChmbiwgMTAwMCk7XG4gICAgY2xlYXJUaW1lb3V0KHRvKTtcbn1cblxuZnVuY3Rpb24gYXNzZXJ0KGIpIHtcbiAgICBpZiAoIWIpIHRocm93IG5ldyBFcnJvcihcIkFzc2VydGlvbiBGYWlsZWRcIik7XG59XG5cbmZ1bmN0aW9uIGFzYXAoZm4pIHtcbiAgICBpZiAoX2dsb2JhbC5zZXRJbW1lZGlhdGUpIHNldEltbWVkaWF0ZShmbik7ZWxzZSBzZXRUaW1lb3V0KGZuLCAwKTtcbn1cblxuXG5cbi8qKiBHZW5lcmF0ZSBhbiBvYmplY3QgKGhhc2ggbWFwKSBiYXNlZCBvbiBnaXZlbiBhcnJheS5cclxuICogQHBhcmFtIGV4dHJhY3RvciBGdW5jdGlvbiB0YWtpbmcgYW4gYXJyYXkgaXRlbSBhbmQgaXRzIGluZGV4IGFuZCByZXR1cm5pbmcgYW4gYXJyYXkgb2YgMiBpdGVtcyAoW2tleSwgdmFsdWVdKSB0b1xyXG4gKiAgICAgICAgaW5zdGVydCBvbiB0aGUgcmVzdWx0aW5nIG9iamVjdCBmb3IgZWFjaCBpdGVtIGluIHRoZSBhcnJheS4gSWYgdGhpcyBmdW5jdGlvbiByZXR1cm5zIGEgZmFsc3kgdmFsdWUsIHRoZVxyXG4gKiAgICAgICAgY3VycmVudCBpdGVtIHdvbnQgYWZmZWN0IHRoZSByZXN1bHRpbmcgb2JqZWN0LlxyXG4gKi9cbmZ1bmN0aW9uIGFycmF5VG9PYmplY3QoYXJyYXksIGV4dHJhY3Rvcikge1xuICAgIHJldHVybiBhcnJheS5yZWR1Y2UoZnVuY3Rpb24gKHJlc3VsdCwgaXRlbSwgaSkge1xuICAgICAgICB2YXIgbmFtZUFuZFZhbHVlID0gZXh0cmFjdG9yKGl0ZW0sIGkpO1xuICAgICAgICBpZiAobmFtZUFuZFZhbHVlKSByZXN1bHRbbmFtZUFuZFZhbHVlWzBdXSA9IG5hbWVBbmRWYWx1ZVsxXTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LCB7fSk7XG59XG5cbmZ1bmN0aW9uIHRyeWNhdGNoZXIoZm4sIHJlamVjdCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiB0cnlDYXRjaChmbiwgb25lcnJvciwgYXJncykge1xuICAgIHRyeSB7XG4gICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIG9uZXJyb3IgJiYgb25lcnJvcihleCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRCeUtleVBhdGgob2JqLCBrZXlQYXRoKSB7XG4gICAgLy8gaHR0cDovL3d3dy53My5vcmcvVFIvSW5kZXhlZERCLyNzdGVwcy1mb3ItZXh0cmFjdGluZy1hLWtleS1mcm9tLWEtdmFsdWUtdXNpbmctYS1rZXktcGF0aFxuICAgIGlmIChoYXNPd24ob2JqLCBrZXlQYXRoKSkgcmV0dXJuIG9ialtrZXlQYXRoXTsgLy8gVGhpcyBsaW5lIGlzIG1vdmVkIGZyb20gbGFzdCB0byBmaXJzdCBmb3Igb3B0aW1pemF0aW9uIHB1cnBvc2UuXG4gICAgaWYgKCFrZXlQYXRoKSByZXR1cm4gb2JqO1xuICAgIGlmICh0eXBlb2Yga2V5UGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgdmFyIHJ2ID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0ga2V5UGF0aC5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgIHZhciB2YWwgPSBnZXRCeUtleVBhdGgob2JqLCBrZXlQYXRoW2ldKTtcbiAgICAgICAgICAgIHJ2LnB1c2godmFsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnY7XG4gICAgfVxuICAgIHZhciBwZXJpb2QgPSBrZXlQYXRoLmluZGV4T2YoJy4nKTtcbiAgICBpZiAocGVyaW9kICE9PSAtMSkge1xuICAgICAgICB2YXIgaW5uZXJPYmogPSBvYmpba2V5UGF0aC5zdWJzdHIoMCwgcGVyaW9kKV07XG4gICAgICAgIHJldHVybiBpbm5lck9iaiA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogZ2V0QnlLZXlQYXRoKGlubmVyT2JqLCBrZXlQYXRoLnN1YnN0cihwZXJpb2QgKyAxKSk7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG59XG5cbmZ1bmN0aW9uIHNldEJ5S2V5UGF0aChvYmosIGtleVBhdGgsIHZhbHVlKSB7XG4gICAgaWYgKCFvYmogfHwga2V5UGF0aCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgaWYgKCdpc0Zyb3plbicgaW4gT2JqZWN0ICYmIE9iamVjdC5pc0Zyb3plbihvYmopKSByZXR1cm47XG4gICAgaWYgKHR5cGVvZiBrZXlQYXRoICE9PSAnc3RyaW5nJyAmJiAnbGVuZ3RoJyBpbiBrZXlQYXRoKSB7XG4gICAgICAgIGFzc2VydCh0eXBlb2YgdmFsdWUgIT09ICdzdHJpbmcnICYmICdsZW5ndGgnIGluIHZhbHVlKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlQYXRoLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgc2V0QnlLZXlQYXRoKG9iaiwga2V5UGF0aFtpXSwgdmFsdWVbaV0pO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBlcmlvZCA9IGtleVBhdGguaW5kZXhPZignLicpO1xuICAgICAgICBpZiAocGVyaW9kICE9PSAtMSkge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRLZXlQYXRoID0ga2V5UGF0aC5zdWJzdHIoMCwgcGVyaW9kKTtcbiAgICAgICAgICAgIHZhciByZW1haW5pbmdLZXlQYXRoID0ga2V5UGF0aC5zdWJzdHIocGVyaW9kICsgMSk7XG4gICAgICAgICAgICBpZiAocmVtYWluaW5nS2V5UGF0aCA9PT0gXCJcIikge1xuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSBkZWxldGUgb2JqW2N1cnJlbnRLZXlQYXRoXTtlbHNlIG9ialtjdXJyZW50S2V5UGF0aF0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGlubmVyT2JqID0gb2JqW2N1cnJlbnRLZXlQYXRoXTtcbiAgICAgICAgICAgICAgICBpZiAoIWlubmVyT2JqKSBpbm5lck9iaiA9IG9ialtjdXJyZW50S2V5UGF0aF0gPSB7fTtcbiAgICAgICAgICAgICAgICBzZXRCeUtleVBhdGgoaW5uZXJPYmosIHJlbWFpbmluZ0tleVBhdGgsIHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSBkZWxldGUgb2JqW2tleVBhdGhdO2Vsc2Ugb2JqW2tleVBhdGhdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRlbEJ5S2V5UGF0aChvYmosIGtleVBhdGgpIHtcbiAgICBpZiAodHlwZW9mIGtleVBhdGggPT09ICdzdHJpbmcnKSBzZXRCeUtleVBhdGgob2JqLCBrZXlQYXRoLCB1bmRlZmluZWQpO2Vsc2UgaWYgKCdsZW5ndGgnIGluIGtleVBhdGgpIFtdLm1hcC5jYWxsKGtleVBhdGgsIGZ1bmN0aW9uIChrcCkge1xuICAgICAgICBzZXRCeUtleVBhdGgob2JqLCBrcCwgdW5kZWZpbmVkKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gc2hhbGxvd0Nsb25lKG9iaikge1xuICAgIHZhciBydiA9IHt9O1xuICAgIGZvciAodmFyIG0gaW4gb2JqKSB7XG4gICAgICAgIGlmIChoYXNPd24ob2JqLCBtKSkgcnZbbV0gPSBvYmpbbV07XG4gICAgfVxuICAgIHJldHVybiBydjtcbn1cblxuZnVuY3Rpb24gZGVlcENsb25lKGFueSkge1xuICAgIGlmICghYW55IHx8IHR5cGVvZiBhbnkgIT09ICdvYmplY3QnKSByZXR1cm4gYW55O1xuICAgIHZhciBydjtcbiAgICBpZiAoaXNBcnJheShhbnkpKSB7XG4gICAgICAgIHJ2ID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gYW55Lmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgcnYucHVzaChkZWVwQ2xvbmUoYW55W2ldKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGFueSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgcnYgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBydi5zZXRUaW1lKGFueS5nZXRUaW1lKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJ2ID0gYW55LmNvbnN0cnVjdG9yID8gT2JqZWN0LmNyZWF0ZShhbnkuY29uc3RydWN0b3IucHJvdG90eXBlKSA6IHt9O1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIGFueSkge1xuICAgICAgICAgICAgaWYgKGhhc093bihhbnksIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgcnZbcHJvcF0gPSBkZWVwQ2xvbmUoYW55W3Byb3BdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnY7XG59XG5cbmZ1bmN0aW9uIGdldE9iamVjdERpZmYoYSwgYiwgcnYsIHByZngpIHtcbiAgICAvLyBDb21wYXJlcyBvYmplY3RzIGEgYW5kIGIgYW5kIHByb2R1Y2VzIGEgZGlmZiBvYmplY3QuXG4gICAgcnYgPSBydiB8fCB7fTtcbiAgICBwcmZ4ID0gcHJmeCB8fCAnJztcbiAgICBrZXlzKGEpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgaWYgKCFoYXNPd24oYiwgcHJvcCkpIHJ2W3ByZnggKyBwcm9wXSA9IHVuZGVmaW5lZDsgLy8gUHJvcGVydHkgcmVtb3ZlZFxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgYXAgPSBhW3Byb3BdLFxuICAgICAgICAgICAgICAgICAgICBicCA9IGJbcHJvcF07XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcCA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIGJwID09PSAnb2JqZWN0JyAmJiBhcCAmJiBicCAmJiBhcC5jb25zdHJ1Y3RvciA9PT0gYnAuY29uc3RydWN0b3IpXG4gICAgICAgICAgICAgICAgICAgIC8vIFNhbWUgdHlwZSBvZiBvYmplY3QgYnV0IGl0cyBwcm9wZXJ0aWVzIG1heSBoYXZlIGNoYW5nZWRcbiAgICAgICAgICAgICAgICAgICAgZ2V0T2JqZWN0RGlmZihhcCwgYnAsIHJ2LCBwcmZ4ICsgcHJvcCArIFwiLlwiKTtlbHNlIGlmIChhcCAhPT0gYnApIHJ2W3ByZnggKyBwcm9wXSA9IGJbcHJvcF07IC8vIFByaW1pdGl2ZSB2YWx1ZSBjaGFuZ2VkXG4gICAgICAgICAgICB9XG4gICAgfSk7XG4gICAga2V5cyhiKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgIGlmICghaGFzT3duKGEsIHByb3ApKSB7XG4gICAgICAgICAgICBydltwcmZ4ICsgcHJvcF0gPSBiW3Byb3BdOyAvLyBQcm9wZXJ0eSBhZGRlZFxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJ2O1xufVxuXG4vLyBJZiBmaXJzdCBhcmd1bWVudCBpcyBpdGVyYWJsZSBvciBhcnJheS1saWtlLCByZXR1cm4gaXQgYXMgYW4gYXJyYXlcbnZhciBpdGVyYXRvclN5bWJvbCA9IHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC5pdGVyYXRvcjtcbnZhciBnZXRJdGVyYXRvck9mID0gaXRlcmF0b3JTeW1ib2wgPyBmdW5jdGlvbiAoeCkge1xuICAgIHZhciBpO1xuICAgIHJldHVybiB4ICE9IG51bGwgJiYgKGkgPSB4W2l0ZXJhdG9yU3ltYm9sXSkgJiYgaS5hcHBseSh4KTtcbn0gOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG51bGw7XG59O1xuXG52YXIgTk9fQ0hBUl9BUlJBWSA9IHt9O1xuLy8gVGFrZXMgb25lIG9yIHNldmVyYWwgYXJndW1lbnRzIGFuZCByZXR1cm5zIGFuIGFycmF5IGJhc2VkIG9uIHRoZSBmb2xsb3dpbmcgY3JpdGVyYXM6XG4vLyAqIElmIHNldmVyYWwgYXJndW1lbnRzIHByb3ZpZGVkLCByZXR1cm4gYXJndW1lbnRzIGNvbnZlcnRlZCB0byBhbiBhcnJheSBpbiBhIHdheSB0aGF0XG4vLyAgIHN0aWxsIGFsbG93cyBqYXZhc2NyaXB0IGVuZ2luZSB0byBvcHRpbWl6ZSB0aGUgY29kZS5cbi8vICogSWYgc2luZ2xlIGFyZ3VtZW50IGlzIGFuIGFycmF5LCByZXR1cm4gYSBjbG9uZSBvZiBpdC5cbi8vICogSWYgdGhpcy1wb2ludGVyIGVxdWFscyBOT19DSEFSX0FSUkFZLCBkb24ndCBhY2NlcHQgc3RyaW5ncyBhcyB2YWxpZCBpdGVyYWJsZXMgYXMgYSBzcGVjaWFsXG4vLyAgIGNhc2UgdG8gdGhlIHR3byBidWxsZXRzIGJlbG93LlxuLy8gKiBJZiBzaW5nbGUgYXJndW1lbnQgaXMgYW4gaXRlcmFibGUsIGNvbnZlcnQgaXQgdG8gYW4gYXJyYXkgYW5kIHJldHVybiB0aGUgcmVzdWx0aW5nIGFycmF5LlxuLy8gKiBJZiBzaW5nbGUgYXJndW1lbnQgaXMgYXJyYXktbGlrZSAoaGFzIGxlbmd0aCBvZiB0eXBlIG51bWJlciksIGNvbnZlcnQgaXQgdG8gYW4gYXJyYXkuXG5mdW5jdGlvbiBnZXRBcnJheU9mKGFycmF5TGlrZSkge1xuICAgIHZhciBpLCBhLCB4LCBpdDtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICBpZiAoaXNBcnJheShhcnJheUxpa2UpKSByZXR1cm4gYXJyYXlMaWtlLnNsaWNlKCk7XG4gICAgICAgIGlmICh0aGlzID09PSBOT19DSEFSX0FSUkFZICYmIHR5cGVvZiBhcnJheUxpa2UgPT09ICdzdHJpbmcnKSByZXR1cm4gW2FycmF5TGlrZV07XG4gICAgICAgIGlmIChpdCA9IGdldEl0ZXJhdG9yT2YoYXJyYXlMaWtlKSkge1xuICAgICAgICAgICAgYSA9IFtdO1xuICAgICAgICAgICAgd2hpbGUgKHggPSBpdC5uZXh0KCksICF4LmRvbmUpIHtcbiAgICAgICAgICAgICAgICBhLnB1c2goeC52YWx1ZSk7XG4gICAgICAgICAgICB9cmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFycmF5TGlrZSA9PSBudWxsKSByZXR1cm4gW2FycmF5TGlrZV07XG4gICAgICAgIGkgPSBhcnJheUxpa2UubGVuZ3RoO1xuICAgICAgICBpZiAodHlwZW9mIGkgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBhID0gbmV3IEFycmF5KGkpO1xuICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgIGFbaV0gPSBhcnJheUxpa2VbaV07XG4gICAgICAgICAgICB9cmV0dXJuIGE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFthcnJheUxpa2VdO1xuICAgIH1cbiAgICBpID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhID0gbmV3IEFycmF5KGkpO1xuICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgYVtpXSA9IGFyZ3VtZW50c1tpXTtcbiAgICB9cmV0dXJuIGE7XG59XG5cbnZhciBjb25jYXQgPSBbXS5jb25jYXQ7XG5mdW5jdGlvbiBmbGF0dGVuKGEpIHtcbiAgICByZXR1cm4gY29uY2F0LmFwcGx5KFtdLCBhKTtcbn1cblxuZnVuY3Rpb24gbm9wKCkge31cbmZ1bmN0aW9uIG1pcnJvcih2YWwpIHtcbiAgICByZXR1cm4gdmFsO1xufVxuZnVuY3Rpb24gcHVyZUZ1bmN0aW9uQ2hhaW4oZjEsIGYyKSB7XG4gICAgLy8gRW5hYmxlcyBjaGFpbmVkIGV2ZW50cyB0aGF0IHRha2VzIE9ORSBhcmd1bWVudCBhbmQgcmV0dXJucyBpdCB0byB0aGUgbmV4dCBmdW5jdGlvbiBpbiBjaGFpbi5cbiAgICAvLyBUaGlzIHBhdHRlcm4gaXMgdXNlZCBpbiB0aGUgaG9vayhcInJlYWRpbmdcIikgZXZlbnQuXG4gICAgaWYgKGYxID09IG51bGwgfHwgZjEgPT09IG1pcnJvcikgcmV0dXJuIGYyO1xuICAgIHJldHVybiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHJldHVybiBmMihmMSh2YWwpKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjYWxsQm90aChvbjEsIG9uMikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9uMS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBvbjIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBob29rQ3JlYXRpbmdDaGFpbihmMSwgZjIpIHtcbiAgICAvLyBFbmFibGVzIGNoYWluZWQgZXZlbnRzIHRoYXQgdGFrZXMgc2V2ZXJhbCBhcmd1bWVudHMgYW5kIG1heSBtb2RpZnkgZmlyc3QgYXJndW1lbnQgYnkgbWFraW5nIGEgbW9kaWZpY2F0aW9uIGFuZCB0aGVuIHJldHVybmluZyB0aGUgc2FtZSBpbnN0YW5jZS5cbiAgICAvLyBUaGlzIHBhdHRlcm4gaXMgdXNlZCBpbiB0aGUgaG9vayhcImNyZWF0aW5nXCIpIGV2ZW50LlxuICAgIGlmIChmMSA9PT0gbm9wKSByZXR1cm4gZjI7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlcyA9IGYxLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChyZXMgIT09IHVuZGVmaW5lZCkgYXJndW1lbnRzWzBdID0gcmVzO1xuICAgICAgICB2YXIgb25zdWNjZXNzID0gdGhpcy5vbnN1Y2Nlc3MsXG4gICAgICAgICAgICAvLyBJbiBjYXNlIGV2ZW50IGxpc3RlbmVyIGhhcyBzZXQgdGhpcy5vbnN1Y2Nlc3NcbiAgICAgICAgb25lcnJvciA9IHRoaXMub25lcnJvcjsgLy8gSW4gY2FzZSBldmVudCBsaXN0ZW5lciBoYXMgc2V0IHRoaXMub25lcnJvclxuICAgICAgICB0aGlzLm9uc3VjY2VzcyA9IG51bGw7XG4gICAgICAgIHRoaXMub25lcnJvciA9IG51bGw7XG4gICAgICAgIHZhciByZXMyID0gZjIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG9uc3VjY2VzcykgdGhpcy5vbnN1Y2Nlc3MgPSB0aGlzLm9uc3VjY2VzcyA/IGNhbGxCb3RoKG9uc3VjY2VzcywgdGhpcy5vbnN1Y2Nlc3MpIDogb25zdWNjZXNzO1xuICAgICAgICBpZiAob25lcnJvcikgdGhpcy5vbmVycm9yID0gdGhpcy5vbmVycm9yID8gY2FsbEJvdGgob25lcnJvciwgdGhpcy5vbmVycm9yKSA6IG9uZXJyb3I7XG4gICAgICAgIHJldHVybiByZXMyICE9PSB1bmRlZmluZWQgPyByZXMyIDogcmVzO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGhvb2tEZWxldGluZ0NoYWluKGYxLCBmMikge1xuICAgIGlmIChmMSA9PT0gbm9wKSByZXR1cm4gZjI7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZjEuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgdmFyIG9uc3VjY2VzcyA9IHRoaXMub25zdWNjZXNzLFxuICAgICAgICAgICAgLy8gSW4gY2FzZSBldmVudCBsaXN0ZW5lciBoYXMgc2V0IHRoaXMub25zdWNjZXNzXG4gICAgICAgIG9uZXJyb3IgPSB0aGlzLm9uZXJyb3I7IC8vIEluIGNhc2UgZXZlbnQgbGlzdGVuZXIgaGFzIHNldCB0aGlzLm9uZXJyb3JcbiAgICAgICAgdGhpcy5vbnN1Y2Nlc3MgPSB0aGlzLm9uZXJyb3IgPSBudWxsO1xuICAgICAgICBmMi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBpZiAob25zdWNjZXNzKSB0aGlzLm9uc3VjY2VzcyA9IHRoaXMub25zdWNjZXNzID8gY2FsbEJvdGgob25zdWNjZXNzLCB0aGlzLm9uc3VjY2VzcykgOiBvbnN1Y2Nlc3M7XG4gICAgICAgIGlmIChvbmVycm9yKSB0aGlzLm9uZXJyb3IgPSB0aGlzLm9uZXJyb3IgPyBjYWxsQm90aChvbmVycm9yLCB0aGlzLm9uZXJyb3IpIDogb25lcnJvcjtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBob29rVXBkYXRpbmdDaGFpbihmMSwgZjIpIHtcbiAgICBpZiAoZjEgPT09IG5vcCkgcmV0dXJuIGYyO1xuICAgIHJldHVybiBmdW5jdGlvbiAobW9kaWZpY2F0aW9ucykge1xuICAgICAgICB2YXIgcmVzID0gZjEuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgZXh0ZW5kKG1vZGlmaWNhdGlvbnMsIHJlcyk7IC8vIElmIGYxIHJldHVybnMgbmV3IG1vZGlmaWNhdGlvbnMsIGV4dGVuZCBjYWxsZXIncyBtb2RpZmljYXRpb25zIHdpdGggdGhlIHJlc3VsdCBiZWZvcmUgY2FsbGluZyBuZXh0IGluIGNoYWluLlxuICAgICAgICB2YXIgb25zdWNjZXNzID0gdGhpcy5vbnN1Y2Nlc3MsXG4gICAgICAgICAgICAvLyBJbiBjYXNlIGV2ZW50IGxpc3RlbmVyIGhhcyBzZXQgdGhpcy5vbnN1Y2Nlc3NcbiAgICAgICAgb25lcnJvciA9IHRoaXMub25lcnJvcjsgLy8gSW4gY2FzZSBldmVudCBsaXN0ZW5lciBoYXMgc2V0IHRoaXMub25lcnJvclxuICAgICAgICB0aGlzLm9uc3VjY2VzcyA9IG51bGw7XG4gICAgICAgIHRoaXMub25lcnJvciA9IG51bGw7XG4gICAgICAgIHZhciByZXMyID0gZjIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKG9uc3VjY2VzcykgdGhpcy5vbnN1Y2Nlc3MgPSB0aGlzLm9uc3VjY2VzcyA/IGNhbGxCb3RoKG9uc3VjY2VzcywgdGhpcy5vbnN1Y2Nlc3MpIDogb25zdWNjZXNzO1xuICAgICAgICBpZiAob25lcnJvcikgdGhpcy5vbmVycm9yID0gdGhpcy5vbmVycm9yID8gY2FsbEJvdGgob25lcnJvciwgdGhpcy5vbmVycm9yKSA6IG9uZXJyb3I7XG4gICAgICAgIHJldHVybiByZXMgPT09IHVuZGVmaW5lZCA/IHJlczIgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IHJlczIgOiBleHRlbmQocmVzLCByZXMyKTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiByZXZlcnNlU3RvcHBhYmxlRXZlbnRDaGFpbihmMSwgZjIpIHtcbiAgICBpZiAoZjEgPT09IG5vcCkgcmV0dXJuIGYyO1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChmMi5hcHBseSh0aGlzLCBhcmd1bWVudHMpID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gZjEuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuXG5cblxuZnVuY3Rpb24gcHJvbWlzYWJsZUNoYWluKGYxLCBmMikge1xuICAgIGlmIChmMSA9PT0gbm9wKSByZXR1cm4gZjI7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlcyA9IGYxLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChyZXMgJiYgdHlwZW9mIHJlcy50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICB2YXIgdGhpeiA9IHRoaXMsXG4gICAgICAgICAgICAgICAgaSA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgYXJncyA9IG5ldyBBcnJheShpKTtcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgfXJldHVybiByZXMudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGYyLmFwcGx5KHRoaXosIGFyZ3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGYyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cblxuLy8gQnkgZGVmYXVsdCwgZGVidWcgd2lsbCBiZSB0cnVlIG9ubHkgaWYgcGxhdGZvcm0gaXMgYSB3ZWIgcGxhdGZvcm0gYW5kIGl0cyBwYWdlIGlzIHNlcnZlZCBmcm9tIGxvY2FsaG9zdC5cbi8vIFdoZW4gZGVidWcgPSB0cnVlLCBlcnJvcidzIHN0YWNrcyB3aWxsIGNvbnRhaW4gYXN5bmNyb25pYyBsb25nIHN0YWNrcy5cbnZhciBkZWJ1ZyA9IHR5cGVvZiBsb2NhdGlvbiAhPT0gJ3VuZGVmaW5lZCcgJiZcbi8vIEJ5IGRlZmF1bHQsIHVzZSBkZWJ1ZyBtb2RlIGlmIHNlcnZlZCBmcm9tIGxvY2FsaG9zdC5cbi9eKGh0dHB8aHR0cHMpOlxcL1xcLyhsb2NhbGhvc3R8MTI3XFwuMFxcLjBcXC4xKS8udGVzdChsb2NhdGlvbi5ocmVmKTtcblxuZnVuY3Rpb24gc2V0RGVidWcodmFsdWUsIGZpbHRlcikge1xuICAgIGRlYnVnID0gdmFsdWU7XG4gICAgbGlicmFyeUZpbHRlciA9IGZpbHRlcjtcbn1cblxudmFyIGxpYnJhcnlGaWx0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG52YXIgTkVFRFNfVEhST1dfRk9SX1NUQUNLID0gIW5ldyBFcnJvcihcIlwiKS5zdGFjaztcblxuZnVuY3Rpb24gZ2V0RXJyb3JXaXRoU3RhY2soKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICBpZiAoTkVFRFNfVEhST1dfRk9SX1NUQUNLKSB0cnkge1xuICAgICAgICAvLyBEb2luZyBzb21ldGhpbmcgbmF1Z2h0eSBpbiBzdHJpY3QgbW9kZSBoZXJlIHRvIHRyaWdnZXIgYSBzcGVjaWZpYyBlcnJvclxuICAgICAgICAvLyB0aGF0IGNhbiBiZSBleHBsaWNpdGVseSBpZ25vcmVkIGluIGRlYnVnZ2VyJ3MgZXhjZXB0aW9uIHNldHRpbmdzLlxuICAgICAgICAvLyBJZiB3ZSdkIGp1c3QgdGhyb3cgbmV3IEVycm9yKCkgaGVyZSwgSUUncyBkZWJ1Z2dlcidzIGV4Y2VwdGlvbiBzZXR0aW5nc1xuICAgICAgICAvLyB3aWxsIGp1c3QgY29uc2lkZXIgaXQgYXMgXCJleGNlcHRpb24gdGhyb3duIGJ5IGphdmFzY3JpcHQgY29kZVwiIHdoaWNoIGlzXG4gICAgICAgIC8vIHNvbWV0aGluZyB5b3Ugd291bGRuJ3Qgd2FudCBpdCB0byBpZ25vcmUuXG4gICAgICAgIGdldEVycm9yV2l0aFN0YWNrLmFyZ3VtZW50cztcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCk7IC8vIEZhbGxiYWNrIGlmIGFib3ZlIGxpbmUgZG9uJ3QgdGhyb3cuXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBFcnJvcigpO1xufVxuXG5mdW5jdGlvbiBwcmV0dHlTdGFjayhleGNlcHRpb24sIG51bUlnbm9yZWRGcmFtZXMpIHtcbiAgICB2YXIgc3RhY2sgPSBleGNlcHRpb24uc3RhY2s7XG4gICAgaWYgKCFzdGFjaykgcmV0dXJuIFwiXCI7XG4gICAgbnVtSWdub3JlZEZyYW1lcyA9IG51bUlnbm9yZWRGcmFtZXMgfHwgMDtcbiAgICBpZiAoc3RhY2suaW5kZXhPZihleGNlcHRpb24ubmFtZSkgPT09IDApIG51bUlnbm9yZWRGcmFtZXMgKz0gKGV4Y2VwdGlvbi5uYW1lICsgZXhjZXB0aW9uLm1lc3NhZ2UpLnNwbGl0KCdcXG4nKS5sZW5ndGg7XG4gICAgcmV0dXJuIHN0YWNrLnNwbGl0KCdcXG4nKS5zbGljZShudW1JZ25vcmVkRnJhbWVzKS5maWx0ZXIobGlicmFyeUZpbHRlcikubWFwKGZ1bmN0aW9uIChmcmFtZSkge1xuICAgICAgICByZXR1cm4gXCJcXG5cIiArIGZyYW1lO1xuICAgIH0pLmpvaW4oJycpO1xufVxuXG5mdW5jdGlvbiBkZXByZWNhdGVkKHdoYXQsIGZuKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS53YXJuKHdoYXQgKyBcIiBpcyBkZXByZWNhdGVkLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2RmYWhsYW5kZXIvRGV4aWUuanMvd2lraS9EZXByZWNhdGlvbnMuIFwiICsgcHJldHR5U3RhY2soZ2V0RXJyb3JXaXRoU3RhY2soKSwgMSkpO1xuICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuXG52YXIgZGV4aWVFcnJvck5hbWVzID0gWydNb2RpZnknLCAnQnVsaycsICdPcGVuRmFpbGVkJywgJ1ZlcnNpb25DaGFuZ2UnLCAnU2NoZW1hJywgJ1VwZ3JhZGUnLCAnSW52YWxpZFRhYmxlJywgJ01pc3NpbmdBUEknLCAnTm9TdWNoRGF0YWJhc2UnLCAnSW52YWxpZEFyZ3VtZW50JywgJ1N1YlRyYW5zYWN0aW9uJywgJ1Vuc3VwcG9ydGVkJywgJ0ludGVybmFsJywgJ0RhdGFiYXNlQ2xvc2VkJywgJ0luY29tcGF0aWJsZVByb21pc2UnXTtcblxudmFyIGlkYkRvbUVycm9yTmFtZXMgPSBbJ1Vua25vd24nLCAnQ29uc3RyYWludCcsICdEYXRhJywgJ1RyYW5zYWN0aW9uSW5hY3RpdmUnLCAnUmVhZE9ubHknLCAnVmVyc2lvbicsICdOb3RGb3VuZCcsICdJbnZhbGlkU3RhdGUnLCAnSW52YWxpZEFjY2VzcycsICdBYm9ydCcsICdUaW1lb3V0JywgJ1F1b3RhRXhjZWVkZWQnLCAnU3ludGF4JywgJ0RhdGFDbG9uZSddO1xuXG52YXIgZXJyb3JMaXN0ID0gZGV4aWVFcnJvck5hbWVzLmNvbmNhdChpZGJEb21FcnJvck5hbWVzKTtcblxudmFyIGRlZmF1bHRUZXh0cyA9IHtcbiAgICBWZXJzaW9uQ2hhbmdlZDogXCJEYXRhYmFzZSB2ZXJzaW9uIGNoYW5nZWQgYnkgb3RoZXIgZGF0YWJhc2UgY29ubmVjdGlvblwiLFxuICAgIERhdGFiYXNlQ2xvc2VkOiBcIkRhdGFiYXNlIGhhcyBiZWVuIGNsb3NlZFwiLFxuICAgIEFib3J0OiBcIlRyYW5zYWN0aW9uIGFib3J0ZWRcIixcbiAgICBUcmFuc2FjdGlvbkluYWN0aXZlOiBcIlRyYW5zYWN0aW9uIGhhcyBhbHJlYWR5IGNvbXBsZXRlZCBvciBmYWlsZWRcIlxufTtcblxuLy9cbi8vIERleGllRXJyb3IgLSBiYXNlIGNsYXNzIG9mIGFsbCBvdXQgZXhjZXB0aW9ucy5cbi8vXG5mdW5jdGlvbiBEZXhpZUVycm9yKG5hbWUsIG1zZykge1xuICAgIC8vIFJlYXNvbiB3ZSBkb24ndCB1c2UgRVM2IGNsYXNzZXMgaXMgYmVjYXVzZTpcbiAgICAvLyAxLiBJdCBibG9hdHMgdHJhbnNwaWxlZCBjb2RlIGFuZCBpbmNyZWFzZXMgc2l6ZSBvZiBtaW5pZmllZCBjb2RlLlxuICAgIC8vIDIuIEl0IGRvZXNuJ3QgZ2l2ZSB1cyBtdWNoIGluIHRoaXMgY2FzZS5cbiAgICAvLyAzLiBJdCB3b3VsZCByZXF1aXJlIHN1YiBjbGFzc2VzIHRvIGNhbGwgc3VwZXIoKSwgd2hpY2hcbiAgICAvLyAgICBpcyBub3QgbmVlZGVkIHdoZW4gZGVyaXZpbmcgZnJvbSBFcnJvci5cbiAgICB0aGlzLl9lID0gZ2V0RXJyb3JXaXRoU3RhY2soKTtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMubWVzc2FnZSA9IG1zZztcbn1cblxuZGVyaXZlKERleGllRXJyb3IpLmZyb20oRXJyb3IpLmV4dGVuZCh7XG4gICAgc3RhY2s6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fc3RhY2sgfHwgKHRoaXMuX3N0YWNrID0gdGhpcy5uYW1lICsgXCI6IFwiICsgdGhpcy5tZXNzYWdlICsgcHJldHR5U3RhY2sodGhpcy5fZSwgMikpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICB0b1N0cmluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5uYW1lICsgXCI6IFwiICsgdGhpcy5tZXNzYWdlO1xuICAgIH1cbn0pO1xuXG5mdW5jdGlvbiBnZXRNdWx0aUVycm9yTWVzc2FnZShtc2csIGZhaWx1cmVzKSB7XG4gICAgcmV0dXJuIG1zZyArIFwiLiBFcnJvcnM6IFwiICsgZmFpbHVyZXMubWFwKGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIHJldHVybiBmLnRvU3RyaW5nKCk7XG4gICAgfSkuZmlsdGVyKGZ1bmN0aW9uICh2LCBpLCBzKSB7XG4gICAgICAgIHJldHVybiBzLmluZGV4T2YodikgPT09IGk7XG4gICAgfSkgLy8gT25seSB1bmlxdWUgZXJyb3Igc3RyaW5nc1xuICAgIC5qb2luKCdcXG4nKTtcbn1cblxuLy9cbi8vIE1vZGlmeUVycm9yIC0gdGhyb3duIGluIFdyaXRlYWJsZUNvbGxlY3Rpb24ubW9kaWZ5KClcbi8vIFNwZWNpZmljIGNvbnN0cnVjdG9yIGJlY2F1c2UgaXQgY29udGFpbnMgbWVtYmVycyBmYWlsdXJlcyBhbmQgZmFpbGVkS2V5cy5cbi8vXG5mdW5jdGlvbiBNb2RpZnlFcnJvcihtc2csIGZhaWx1cmVzLCBzdWNjZXNzQ291bnQsIGZhaWxlZEtleXMpIHtcbiAgICB0aGlzLl9lID0gZ2V0RXJyb3JXaXRoU3RhY2soKTtcbiAgICB0aGlzLmZhaWx1cmVzID0gZmFpbHVyZXM7XG4gICAgdGhpcy5mYWlsZWRLZXlzID0gZmFpbGVkS2V5cztcbiAgICB0aGlzLnN1Y2Nlc3NDb3VudCA9IHN1Y2Nlc3NDb3VudDtcbn1cbmRlcml2ZShNb2RpZnlFcnJvcikuZnJvbShEZXhpZUVycm9yKTtcblxuZnVuY3Rpb24gQnVsa0Vycm9yKG1zZywgZmFpbHVyZXMpIHtcbiAgICB0aGlzLl9lID0gZ2V0RXJyb3JXaXRoU3RhY2soKTtcbiAgICB0aGlzLm5hbWUgPSBcIkJ1bGtFcnJvclwiO1xuICAgIHRoaXMuZmFpbHVyZXMgPSBmYWlsdXJlcztcbiAgICB0aGlzLm1lc3NhZ2UgPSBnZXRNdWx0aUVycm9yTWVzc2FnZShtc2csIGZhaWx1cmVzKTtcbn1cbmRlcml2ZShCdWxrRXJyb3IpLmZyb20oRGV4aWVFcnJvcik7XG5cbi8vXG4vL1xuLy8gRHluYW1pY2FsbHkgZ2VuZXJhdGUgZXJyb3IgbmFtZXMgYW5kIGV4Y2VwdGlvbiBjbGFzc2VzIGJhc2VkXG4vLyBvbiB0aGUgbmFtZXMgaW4gZXJyb3JMaXN0LlxuLy9cbi8vXG5cbi8vIE1hcCBvZiB7RXJyb3JOYW1lIC0+IEVycm9yTmFtZSArIFwiRXJyb3JcIn1cbnZhciBlcnJuYW1lcyA9IGVycm9yTGlzdC5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgbmFtZSkge1xuICAgIHJldHVybiBvYmpbbmFtZV0gPSBuYW1lICsgXCJFcnJvclwiLCBvYmo7XG59LCB7fSk7XG5cbi8vIE5lZWQgYW4gYWxpYXMgZm9yIERleGllRXJyb3IgYmVjYXVzZSB3ZSdyZSBnb25uYSBjcmVhdGUgc3ViY2xhc3NlcyB3aXRoIHRoZSBzYW1lIG5hbWUuXG52YXIgQmFzZUV4Y2VwdGlvbiA9IERleGllRXJyb3I7XG4vLyBNYXAgb2Yge0Vycm9yTmFtZSAtPiBleGNlcHRpb24gY29uc3RydWN0b3J9XG52YXIgZXhjZXB0aW9ucyA9IGVycm9yTGlzdC5yZWR1Y2UoZnVuY3Rpb24gKG9iaiwgbmFtZSkge1xuICAgIC8vIExldCB0aGUgbmFtZSBiZSBcIkRleGllRXJyb3JcIiBiZWNhdXNlIHRoaXMgbmFtZSBtYXlcbiAgICAvLyBiZSBzaG93biBpbiBjYWxsIHN0YWNrIGFuZCB3aGVuIGRlYnVnZ2luZy4gRGV4aWVFcnJvciBpc1xuICAgIC8vIHRoZSBtb3N0IHRydWUgbmFtZSBiZWNhdXNlIGl0IGRlcml2ZXMgZnJvbSBEZXhpZUVycm9yLFxuICAgIC8vIGFuZCB3ZSBjYW5ub3QgY2hhbmdlIEZ1bmN0aW9uLm5hbWUgcHJvZ3JhbWF0aWNhbGx5IHdpdGhvdXRcbiAgICAvLyBkeW5hbWljYWxseSBjcmVhdGUgYSBGdW5jdGlvbiBvYmplY3QsIHdoaWNoIHdvdWxkIGJlIGNvbnNpZGVyZWRcbiAgICAvLyAnZXZhbC1ldmlsJy5cbiAgICB2YXIgZnVsbE5hbWUgPSBuYW1lICsgXCJFcnJvclwiO1xuICAgIGZ1bmN0aW9uIERleGllRXJyb3IobXNnT3JJbm5lciwgaW5uZXIpIHtcbiAgICAgICAgdGhpcy5fZSA9IGdldEVycm9yV2l0aFN0YWNrKCk7XG4gICAgICAgIHRoaXMubmFtZSA9IGZ1bGxOYW1lO1xuICAgICAgICBpZiAoIW1zZ09ySW5uZXIpIHtcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IGRlZmF1bHRUZXh0c1tuYW1lXSB8fCBmdWxsTmFtZTtcbiAgICAgICAgICAgIHRoaXMuaW5uZXIgPSBudWxsO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBtc2dPcklubmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gbXNnT3JJbm5lcjtcbiAgICAgICAgICAgIHRoaXMuaW5uZXIgPSBpbm5lciB8fCBudWxsO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBtc2dPcklubmVyID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gbXNnT3JJbm5lci5uYW1lICsgJyAnICsgbXNnT3JJbm5lci5tZXNzYWdlO1xuICAgICAgICAgICAgdGhpcy5pbm5lciA9IG1zZ09ySW5uZXI7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZGVyaXZlKERleGllRXJyb3IpLmZyb20oQmFzZUV4Y2VwdGlvbik7XG4gICAgb2JqW25hbWVdID0gRGV4aWVFcnJvcjtcbiAgICByZXR1cm4gb2JqO1xufSwge30pO1xuXG4vLyBVc2UgRUNNQVNDUklQVCBzdGFuZGFyZCBleGNlcHRpb25zIHdoZXJlIGFwcGxpY2FibGU6XG5leGNlcHRpb25zLlN5bnRheCA9IFN5bnRheEVycm9yO1xuZXhjZXB0aW9ucy5UeXBlID0gVHlwZUVycm9yO1xuZXhjZXB0aW9ucy5SYW5nZSA9IFJhbmdlRXJyb3I7XG5cbnZhciBleGNlcHRpb25NYXAgPSBpZGJEb21FcnJvck5hbWVzLnJlZHVjZShmdW5jdGlvbiAob2JqLCBuYW1lKSB7XG4gICAgb2JqW25hbWUgKyBcIkVycm9yXCJdID0gZXhjZXB0aW9uc1tuYW1lXTtcbiAgICByZXR1cm4gb2JqO1xufSwge30pO1xuXG5mdW5jdGlvbiBtYXBFcnJvcihkb21FcnJvciwgbWVzc2FnZSkge1xuICAgIGlmICghZG9tRXJyb3IgfHwgZG9tRXJyb3IgaW5zdGFuY2VvZiBEZXhpZUVycm9yIHx8IGRvbUVycm9yIGluc3RhbmNlb2YgVHlwZUVycm9yIHx8IGRvbUVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IgfHwgIWRvbUVycm9yLm5hbWUgfHwgIWV4Y2VwdGlvbk1hcFtkb21FcnJvci5uYW1lXSkgcmV0dXJuIGRvbUVycm9yO1xuICAgIHZhciBydiA9IG5ldyBleGNlcHRpb25NYXBbZG9tRXJyb3IubmFtZV0obWVzc2FnZSB8fCBkb21FcnJvci5tZXNzYWdlLCBkb21FcnJvcik7XG4gICAgaWYgKFwic3RhY2tcIiBpbiBkb21FcnJvcikge1xuICAgICAgICAvLyBEZXJpdmUgc3RhY2sgZnJvbSBpbm5lciBleGNlcHRpb24gaWYgaXQgaGFzIGEgc3RhY2tcbiAgICAgICAgc2V0UHJvcChydiwgXCJzdGFja1wiLCB7IGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmlubmVyLnN0YWNrO1xuICAgICAgICAgICAgfSB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xufVxuXG52YXIgZnVsbE5hbWVFeGNlcHRpb25zID0gZXJyb3JMaXN0LnJlZHVjZShmdW5jdGlvbiAob2JqLCBuYW1lKSB7XG4gICAgaWYgKFtcIlN5bnRheFwiLCBcIlR5cGVcIiwgXCJSYW5nZVwiXS5pbmRleE9mKG5hbWUpID09PSAtMSkgb2JqW25hbWUgKyBcIkVycm9yXCJdID0gZXhjZXB0aW9uc1tuYW1lXTtcbiAgICByZXR1cm4gb2JqO1xufSwge30pO1xuXG5mdWxsTmFtZUV4Y2VwdGlvbnMuTW9kaWZ5RXJyb3IgPSBNb2RpZnlFcnJvcjtcbmZ1bGxOYW1lRXhjZXB0aW9ucy5EZXhpZUVycm9yID0gRGV4aWVFcnJvcjtcbmZ1bGxOYW1lRXhjZXB0aW9ucy5CdWxrRXJyb3IgPSBCdWxrRXJyb3I7XG5cbmZ1bmN0aW9uIEV2ZW50cyhjdHgpIHtcbiAgICB2YXIgZXZzID0ge307XG4gICAgdmFyIHJ2ID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgc3Vic2NyaWJlcikge1xuICAgICAgICBpZiAoc3Vic2NyaWJlcikge1xuICAgICAgICAgICAgLy8gU3Vic2NyaWJlLiBJZiBhZGRpdGlvbmFsIGFyZ3VtZW50cyB0aGFuIGp1c3QgdGhlIHN1YnNjcmliZXIgd2FzIHByb3ZpZGVkLCBmb3J3YXJkIHRoZW0gYXMgd2VsbC5cbiAgICAgICAgICAgIHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGkgLSAxKTtcbiAgICAgICAgICAgIHdoaWxlICgtLWkpIHtcbiAgICAgICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIH1ldnNbZXZlbnROYW1lXS5zdWJzY3JpYmUuYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICByZXR1cm4gY3R4O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBldmVudE5hbWUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAvLyBSZXR1cm4gaW50ZXJmYWNlIGFsbG93aW5nIHRvIGZpcmUgb3IgdW5zdWJzY3JpYmUgZnJvbSBldmVudFxuICAgICAgICAgICAgcmV0dXJuIGV2c1tldmVudE5hbWVdO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBydi5hZGRFdmVudFR5cGUgPSBhZGQ7XG5cbiAgICBmb3IgKHZhciBpID0gMSwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgYWRkKGFyZ3VtZW50c1tpXSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ2O1xuXG4gICAgZnVuY3Rpb24gYWRkKGV2ZW50TmFtZSwgY2hhaW5GdW5jdGlvbiwgZGVmYXVsdEZ1bmN0aW9uKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZXZlbnROYW1lID09PSAnb2JqZWN0JykgcmV0dXJuIGFkZENvbmZpZ3VyZWRFdmVudHMoZXZlbnROYW1lKTtcbiAgICAgICAgaWYgKCFjaGFpbkZ1bmN0aW9uKSBjaGFpbkZ1bmN0aW9uID0gcmV2ZXJzZVN0b3BwYWJsZUV2ZW50Q2hhaW47XG4gICAgICAgIGlmICghZGVmYXVsdEZ1bmN0aW9uKSBkZWZhdWx0RnVuY3Rpb24gPSBub3A7XG5cbiAgICAgICAgdmFyIGNvbnRleHQgPSB7XG4gICAgICAgICAgICBzdWJzY3JpYmVyczogW10sXG4gICAgICAgICAgICBmaXJlOiBkZWZhdWx0RnVuY3Rpb24sXG4gICAgICAgICAgICBzdWJzY3JpYmU6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIGlmIChjb250ZXh0LnN1YnNjcmliZXJzLmluZGV4T2YoY2IpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LnN1YnNjcmliZXJzLnB1c2goY2IpO1xuICAgICAgICAgICAgICAgICAgICBjb250ZXh0LmZpcmUgPSBjaGFpbkZ1bmN0aW9uKGNvbnRleHQuZmlyZSwgY2IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC5zdWJzY3JpYmVycyA9IGNvbnRleHQuc3Vic2NyaWJlcnMuZmlsdGVyKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm4gIT09IGNiO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNvbnRleHQuZmlyZSA9IGNvbnRleHQuc3Vic2NyaWJlcnMucmVkdWNlKGNoYWluRnVuY3Rpb24sIGRlZmF1bHRGdW5jdGlvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIGV2c1tldmVudE5hbWVdID0gcnZbZXZlbnROYW1lXSA9IGNvbnRleHQ7XG4gICAgICAgIHJldHVybiBjb250ZXh0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZENvbmZpZ3VyZWRFdmVudHMoY2ZnKSB7XG4gICAgICAgIC8vIGV2ZW50cyh0aGlzLCB7cmVhZGluZzogW2Z1bmN0aW9uQ2hhaW4sIG5vcF19KTtcbiAgICAgICAga2V5cyhjZmcpLmZvckVhY2goZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuICAgICAgICAgICAgdmFyIGFyZ3MgPSBjZmdbZXZlbnROYW1lXTtcbiAgICAgICAgICAgIGlmIChpc0FycmF5KGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgYWRkKGV2ZW50TmFtZSwgY2ZnW2V2ZW50TmFtZV1bMF0sIGNmZ1tldmVudE5hbWVdWzFdKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYXJncyA9PT0gJ2FzYXAnKSB7XG4gICAgICAgICAgICAgICAgLy8gUmF0aGVyIHRoYW4gYXBwcm9hY2hpbmcgZXZlbnQgc3Vic2NyaXB0aW9uIHVzaW5nIGEgZnVuY3Rpb25hbCBhcHByb2FjaCwgd2UgaGVyZSBkbyBpdCBpbiBhIGZvci1sb29wIHdoZXJlIHN1YnNjcmliZXIgaXMgZXhlY3V0ZWQgaW4gaXRzIG93biBzdGFja1xuICAgICAgICAgICAgICAgIC8vIGVuYWJsaW5nIHRoYXQgYW55IGV4Y2VwdGlvbiB0aGF0IG9jY3VyIHdvbnQgZGlzdHVyYiB0aGUgaW5pdGlhdG9yIGFuZCBhbHNvIG5vdCBuZXNjZXNzYXJ5IGJlIGNhdGNoZWQgYW5kIGZvcmdvdHRlbi5cbiAgICAgICAgICAgICAgICB2YXIgY29udGV4dCA9IGFkZChldmVudE5hbWUsIG1pcnJvciwgZnVuY3Rpb24gZmlyZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT3B0aW1hemF0aW9uLXNhZmUgY2xvbmluZyBvZiBhcmd1bWVudHMgaW50byBhcmdzLlxuICAgICAgICAgICAgICAgICAgICB2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGkpO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgICAgICAgICB9IC8vIEFsbCBlYWNoIHN1YnNjcmliZXI6XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc3Vic2NyaWJlcnMuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzYXAoZnVuY3Rpb24gZmlyZUV2ZW50KCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcIkludmFsaWQgZXZlbnQgY29uZmlnXCIpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8vXG4vLyBQcm9taXNlIENsYXNzIGZvciBEZXhpZSBsaWJyYXJ5XG4vL1xuLy8gSSBzdGFydGVkIG91dCB3cml0aW5nIHRoaXMgUHJvbWlzZSBjbGFzcyBieSBjb3B5aW5nIHByb21pc2UtbGlnaHQgKGh0dHBzOi8vZ2l0aHViLmNvbS90YXlsb3JoYWtlcy9wcm9taXNlLWxpZ2h0KSBieVxuLy8gaHR0cHM6Ly9naXRodWIuY29tL3RheWxvcmhha2VzIC0gYW4gQSsgYW5kIEVDTUFTQ1JJUFQgNiBjb21wbGlhbnQgUHJvbWlzZSBpbXBsZW1lbnRhdGlvbi5cbi8vXG4vLyBNb2RpZmljYXRpb25zIG5lZWRlZCB0byBiZSBkb25lIHRvIHN1cHBvcnQgaW5kZXhlZERCIGJlY2F1c2UgaXQgd29udCBhY2NlcHQgc2V0VGltZW91dCgpXG4vLyAoU2VlIGRpc2N1c3Npb246IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjL2lzc3Vlcy80NSkgLlxuLy8gVGhpcyB0b3BpYyB3YXMgYWxzbyBkaXNjdXNzZWQgaW4gdGhlIGZvbGxvd2luZyB0aHJlYWQ6IGh0dHBzOi8vZ2l0aHViLmNvbS9wcm9taXNlcy1hcGx1cy9wcm9taXNlcy1zcGVjL2lzc3Vlcy80NVxuLy9cbi8vIFRoaXMgaW1wbGVtZW50YXRpb24gd2lsbCBub3QgdXNlIHNldFRpbWVvdXQgb3Igc2V0SW1tZWRpYXRlIHdoZW4gaXQncyBub3QgbmVlZGVkLiBUaGUgYmVoYXZpb3IgaXMgMTAwJSBQcm9taXNlL0ErIGNvbXBsaWFudCBzaW5jZVxuLy8gdGhlIGNhbGxlciBvZiBuZXcgUHJvbWlzZSgpIGNhbiBiZSBjZXJ0YWluIHRoYXQgdGhlIHByb21pc2Ugd29udCBiZSB0cmlnZ2VyZWQgdGhlIGxpbmVzIGFmdGVyIGNvbnN0cnVjdGluZyB0aGUgcHJvbWlzZS5cbi8vXG4vLyBJbiBwcmV2aW91cyB2ZXJzaW9ucyB0aGlzIHdhcyBmaXhlZCBieSBub3QgY2FsbGluZyBzZXRUaW1lb3V0IHdoZW4ga25vd2luZyB0aGF0IHRoZSByZXNvbHZlKCkgb3IgcmVqZWN0KCkgY2FtZSBmcm9tIGFub3RoZXJcbi8vIHRpY2suIEluIERleGllIHYxLjQuMCwgSSd2ZSByZXdyaXR0ZW4gdGhlIFByb21pc2UgY2xhc3MgZW50aXJlbHkuIEp1c3Qgc29tZSBmcmFnbWVudHMgb2YgcHJvbWlzZS1saWdodCBpcyBsZWZ0LiBJIHVzZVxuLy8gYW5vdGhlciBzdHJhdGVneSBub3cgdGhhdCBzaW1wbGlmaWVzIGV2ZXJ5dGhpbmcgYSBsb3Q6IHRvIGFsd2F5cyBleGVjdXRlIGNhbGxiYWNrcyBpbiBhIG5ldyB0aWNrLCBidXQgaGF2ZSBhbiBvd24gbWljcm9UaWNrXG4vLyBlbmdpbmUgdGhhdCBpcyB1c2VkIGluc3RlYWQgb2Ygc2V0SW1tZWRpYXRlKCkgb3Igc2V0VGltZW91dCgpLlxuLy8gUHJvbWlzZSBjbGFzcyBoYXMgYWxzbyBiZWVuIG9wdGltaXplZCBhIGxvdCB3aXRoIGluc3BpcmF0aW9uIGZyb20gYmx1ZWJpcmQgLSB0byBhdm9pZCBjbG9zdXJlcyBhcyBtdWNoIGFzIHBvc3NpYmxlLlxuLy8gQWxzbyB3aXRoIGluc3BpcmF0aW9uIGZyb20gYmx1ZWJpcmQsIGFzeW5jcm9uaWMgc3RhY2tzIGluIGRlYnVnIG1vZGUuXG4vL1xuLy8gU3BlY2lmaWMgbm9uLXN0YW5kYXJkIGZlYXR1cmVzIG9mIHRoaXMgUHJvbWlzZSBjbGFzczpcbi8vICogQXN5bmMgc3RhdGljIGNvbnRleHQgc3VwcG9ydCAoUHJvbWlzZS5QU0QpXG4vLyAqIFByb21pc2UuZm9sbG93KCkgbWV0aG9kIGJ1aWx0IHVwb24gUFNELCB0aGF0IGFsbG93cyB1c2VyIHRvIHRyYWNrIGFsbCBwcm9taXNlcyBjcmVhdGVkIGZyb20gY3VycmVudCBzdGFjayBmcmFtZVxuLy8gICBhbmQgYmVsb3cgKyBhbGwgcHJvbWlzZXMgdGhhdCB0aG9zZSBwcm9taXNlcyBjcmVhdGVzIG9yIGF3YWl0cy5cbi8vICogRGV0ZWN0IGFueSB1bmhhbmRsZWQgcHJvbWlzZSBpbiBhIFBTRC1zY29wZSAoUFNELm9udW5oYW5kbGVkKS4gXG4vL1xuLy8gRGF2aWQgRmFobGFuZGVyLCBodHRwczovL2dpdGh1Yi5jb20vZGZhaGxhbmRlclxuLy9cblxuLy8gSnVzdCBhIHBvaW50ZXIgdGhhdCBvbmx5IHRoaXMgbW9kdWxlIGtub3dzIGFib3V0LlxuLy8gVXNlZCBpbiBQcm9taXNlIGNvbnN0cnVjdG9yIHRvIGVtdWxhdGUgYSBwcml2YXRlIGNvbnN0cnVjdG9yLlxudmFyIElOVEVSTkFMID0ge307XG5cbi8vIEFzeW5jIHN0YWNrcyAobG9uZyBzdGFja3MpIG11c3Qgbm90IGdyb3cgaW5maW5pdGVseS5cbnZhciBMT05HX1NUQUNLU19DTElQX0xJTUlUID0gMTAwO1xudmFyIE1BWF9MT05HX1NUQUNLUyA9IDIwO1xudmFyIHN0YWNrX2JlaW5nX2dlbmVyYXRlZCA9IGZhbHNlO1xuXG4vKiBUaGUgZGVmYXVsdCBcIm5leHRUaWNrXCIgZnVuY3Rpb24gdXNlZCBvbmx5IGZvciB0aGUgdmVyeSBmaXJzdCBwcm9taXNlIGluIGEgcHJvbWlzZSBjaGFpbi5cclxuICAgQXMgc29vbiBhcyB0aGVuIHByb21pc2UgaXMgcmVzb2x2ZWQgb3IgcmVqZWN0ZWQsIGFsbCBuZXh0IHRhc2tzIHdpbGwgYmUgZXhlY3V0ZWQgaW4gbWljcm8gdGlja3NcclxuICAgZW11bGF0ZWQgaW4gdGhpcyBtb2R1bGUuIEZvciBpbmRleGVkREIgY29tcGF0aWJpbGl0eSwgdGhpcyBtZWFucyB0aGF0IGV2ZXJ5IG1ldGhvZCBuZWVkcyB0byBcclxuICAgZXhlY3V0ZSBhdCBsZWFzdCBvbmUgcHJvbWlzZSBiZWZvcmUgZG9pbmcgYW4gaW5kZXhlZERCIG9wZXJhdGlvbi4gRGV4aWUgd2lsbCBhbHdheXMgY2FsbCBcclxuICAgZGIucmVhZHkoKS50aGVuKCkgZm9yIGV2ZXJ5IG9wZXJhdGlvbiB0byBtYWtlIHN1cmUgdGhlIGluZGV4ZWREQiBldmVudCBpcyBzdGFydGVkIGluIGFuXHJcbiAgIGVtdWxhdGVkIG1pY3JvIHRpY2suXHJcbiovXG52YXIgc2NoZWR1bGVQaHlzaWNhbFRpY2sgPSBfZ2xvYmFsLnNldEltbWVkaWF0ZSA/XG4vLyBzZXRJbW1lZGlhdGUgc3VwcG9ydGVkLiBUaG9zZSBtb2Rlcm4gcGxhdGZvcm1zIGFsc28gc3VwcG9ydHMgRnVuY3Rpb24uYmluZCgpLlxuc2V0SW1tZWRpYXRlLmJpbmQobnVsbCwgcGh5c2ljYWxUaWNrKSA6IF9nbG9iYWwuTXV0YXRpb25PYnNlcnZlciA/XG4vLyBNdXRhdGlvbk9ic2VydmVyIHN1cHBvcnRlZFxuZnVuY3Rpb24gKCkge1xuICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgIG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcGh5c2ljYWxUaWNrKCk7XG4gICAgICAgIGhpZGRlbkRpdiA9IG51bGw7XG4gICAgfSkub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcbiAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCdpJywgJzEnKTtcbn0gOlxuLy8gTm8gc3VwcG9ydCBmb3Igc2V0SW1tZWRpYXRlIG9yIE11dGF0aW9uT2JzZXJ2ZXIuIE5vIHdvcnJ5LCBzZXRUaW1lb3V0IGlzIG9ubHkgY2FsbGVkXG4vLyBvbmNlIHRpbWUuIEV2ZXJ5IHRpY2sgdGhhdCBmb2xsb3dzIHdpbGwgYmUgb3VyIGVtdWxhdGVkIG1pY3JvIHRpY2suXG4vLyBDb3VsZCBoYXZlIHVzZXMgc2V0VGltZW91dC5iaW5kKG51bGwsIDAsIHBoeXNpY2FsVGljaykgaWYgaXQgd2FzbnQgZm9yIHRoYXQgRkYxMyBhbmQgYmVsb3cgaGFzIGEgYnVnIFxuZnVuY3Rpb24gKCkge1xuICAgIHNldFRpbWVvdXQocGh5c2ljYWxUaWNrLCAwKTtcbn07XG5cbi8vIENvbmZpZnVyYWJsZSB0aHJvdWdoIFByb21pc2Uuc2NoZWR1bGVyLlxuLy8gRG9uJ3QgZXhwb3J0IGJlY2F1c2UgaXQgd291bGQgYmUgdW5zYWZlIHRvIGxldCB1bmtub3duXG4vLyBjb2RlIGNhbGwgaXQgdW5sZXNzIHRoZXkgZG8gdHJ5Li5jYXRjaCB3aXRoaW4gdGhlaXIgY2FsbGJhY2suXG4vLyBUaGlzIGZ1bmN0aW9uIGNhbiBiZSByZXRyaWV2ZWQgdGhyb3VnaCBnZXR0ZXIgb2YgUHJvbWlzZS5zY2hlZHVsZXIgdGhvdWdoLFxuLy8gYnV0IHVzZXJzIG11c3Qgbm90IGRvIFByb21pc2Uuc2NoZWR1bGVyIChteUZ1bmNUaGF0VGhyb3dzIGV4Y2VwdGlvbikhXG52YXIgYXNhcCQxID0gZnVuY3Rpb24gKGNhbGxiYWNrLCBhcmdzKSB7XG4gICAgbWljcm90aWNrUXVldWUucHVzaChbY2FsbGJhY2ssIGFyZ3NdKTtcbiAgICBpZiAobmVlZHNOZXdQaHlzaWNhbFRpY2spIHtcbiAgICAgICAgc2NoZWR1bGVQaHlzaWNhbFRpY2soKTtcbiAgICAgICAgbmVlZHNOZXdQaHlzaWNhbFRpY2sgPSBmYWxzZTtcbiAgICB9XG59O1xuXG52YXIgaXNPdXRzaWRlTWljcm9UaWNrID0gdHJ1ZTtcbnZhciBuZWVkc05ld1BoeXNpY2FsVGljayA9IHRydWU7XG52YXIgdW5oYW5kbGVkRXJyb3JzID0gW107XG52YXIgcmVqZWN0aW5nRXJyb3JzID0gW107XG52YXIgY3VycmVudEZ1bGZpbGxlciA9IG51bGw7XG52YXIgcmVqZWN0aW9uTWFwcGVyID0gbWlycm9yOyAvLyBSZW1vdmUgaW4gbmV4dCBtYWpvciB3aGVuIHJlbW92aW5nIGVycm9yIG1hcHBpbmcgb2YgRE9NRXJyb3JzIGFuZCBET01FeGNlcHRpb25zXG5cbnZhciBnbG9iYWxQU0QgPSB7XG4gICAgZ2xvYmFsOiB0cnVlLFxuICAgIHJlZjogMCxcbiAgICB1bmhhbmRsZWRzOiBbXSxcbiAgICBvbnVuaGFuZGxlZDogZ2xvYmFsRXJyb3IsXG4gICAgLy9lbnY6IG51bGwsIC8vIFdpbGwgYmUgc2V0IHdoZW5ldmVyIGxlYXZpbmcgYSBzY29wZSB1c2luZyB3cmFwcGVycy5zbmFwc2hvdCgpXG4gICAgZmluYWxpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy51bmhhbmRsZWRzLmZvckVhY2goZnVuY3Rpb24gKHVoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGdsb2JhbEVycm9yKHVoWzBdLCB1aFsxXSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG52YXIgUFNEID0gZ2xvYmFsUFNEO1xuXG52YXIgbWljcm90aWNrUXVldWUgPSBbXTsgLy8gQ2FsbGJhY2tzIHRvIGNhbGwgaW4gdGhpcyBvciBuZXh0IHBoeXNpY2FsIHRpY2suXG52YXIgbnVtU2NoZWR1bGVkQ2FsbHMgPSAwOyAvLyBOdW1iZXIgb2YgbGlzdGVuZXItY2FsbHMgbGVmdCB0byBkbyBpbiB0aGlzIHBoeXNpY2FsIHRpY2suXG52YXIgdGlja0ZpbmFsaXplcnMgPSBbXTsgLy8gRmluYWxpemVycyB0byBjYWxsIHdoZW4gdGhlcmUgYXJlIG5vIG1vcmUgYXN5bmMgY2FsbHMgc2NoZWR1bGVkIHdpdGhpbiBjdXJyZW50IHBoeXNpY2FsIHRpY2suXG5cbi8vIFdyYXBwZXJzIGFyZSBub3QgYmVpbmcgdXNlZCB5ZXQuIFRoZWlyIGZyYW1ld29yayBpcyBmdW5jdGlvbmluZyBhbmQgY2FuIGJlIHVzZWRcbi8vIHRvIHJlcGxhY2UgZW52aXJvbm1lbnQgZHVyaW5nIGEgUFNEIHNjb3BlIChhLmsuYS4gJ3pvbmUnKS5cbi8qICoqS0VFUCoqIGV4cG9ydCB2YXIgd3JhcHBlcnMgPSAoKCkgPT4ge1xyXG4gICAgdmFyIHdyYXBwZXJzID0gW107XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBzbmFwc2hvdDogKCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgaSA9IHdyYXBwZXJzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5ldyBBcnJheShpKTtcclxuICAgICAgICAgICAgd2hpbGUgKGktLSkgcmVzdWx0W2ldID0gd3JhcHBlcnNbaV0uc25hcHNob3QoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc3RvcmU6IHZhbHVlcyA9PiB7XHJcbiAgICAgICAgICAgIHZhciBpID0gd3JhcHBlcnMubGVuZ3RoO1xyXG4gICAgICAgICAgICB3aGlsZSAoaS0tKSB3cmFwcGVyc1tpXS5yZXN0b3JlKHZhbHVlc1tpXSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB3cmFwOiAoKSA9PiB3cmFwcGVycy5tYXAodyA9PiB3LndyYXAoKSksXHJcbiAgICAgICAgYWRkOiB3cmFwcGVyID0+IHtcclxuICAgICAgICAgICAgd3JhcHBlcnMucHVzaCh3cmFwcGVyKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG59KSgpO1xyXG4qL1xuXG5mdW5jdGlvbiBQcm9taXNlKGZuKSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzICE9PSAnb2JqZWN0JykgdGhyb3cgbmV3IFR5cGVFcnJvcignUHJvbWlzZXMgbXVzdCBiZSBjb25zdHJ1Y3RlZCB2aWEgbmV3Jyk7XG4gICAgdGhpcy5fbGlzdGVuZXJzID0gW107XG4gICAgdGhpcy5vbnVuY2F0Y2hlZCA9IG5vcDsgLy8gRGVwcmVjYXRlIGluIG5leHQgbWFqb3IuIE5vdCBuZWVkZWQuIEJldHRlciB0byB1c2UgZ2xvYmFsIGVycm9yIGhhbmRsZXIuXG5cbiAgICAvLyBBIGxpYnJhcnkgbWF5IHNldCBgcHJvbWlzZS5fbGliID0gdHJ1ZTtgIGFmdGVyIHByb21pc2UgaXMgY3JlYXRlZCB0byBtYWtlIHJlc29sdmUoKSBvciByZWplY3QoKVxuICAgIC8vIGV4ZWN1dGUgdGhlIG1pY3JvdGFzayBlbmdpbmUgaW1wbGljaXRlbHkgd2l0aGluIHRoZSBjYWxsIHRvIHJlc29sdmUoKSBvciByZWplY3QoKS5cbiAgICAvLyBUbyByZW1haW4gQSsgY29tcGxpYW50LCBhIGxpYnJhcnkgbXVzdCBvbmx5IHNldCBgX2xpYj10cnVlYCBpZiBpdCBjYW4gZ3VhcmFudGVlIHRoYXQgdGhlIHN0YWNrXG4gICAgLy8gb25seSBjb250YWlucyBsaWJyYXJ5IGNvZGUgd2hlbiBjYWxsaW5nIHJlc29sdmUoKSBvciByZWplY3QoKS5cbiAgICAvLyBSVUxFIE9GIFRIVU1COiBPTkxZIHNldCBfbGliID0gdHJ1ZSBmb3IgcHJvbWlzZXMgZXhwbGljaXRlbHkgcmVzb2x2aW5nL3JlamVjdGluZyBkaXJlY3RseSBmcm9tXG4gICAgLy8gZ2xvYmFsIHNjb3BlIChldmVudCBoYW5kbGVyLCB0aW1lciBldGMpIVxuICAgIHRoaXMuX2xpYiA9IGZhbHNlO1xuICAgIC8vIEN1cnJlbnQgYXN5bmMgc2NvcGVcbiAgICB2YXIgcHNkID0gdGhpcy5fUFNEID0gUFNEO1xuXG4gICAgaWYgKGRlYnVnKSB7XG4gICAgICAgIHRoaXMuX3N0YWNrSG9sZGVyID0gZ2V0RXJyb3JXaXRoU3RhY2soKTtcbiAgICAgICAgdGhpcy5fcHJldiA9IG51bGw7XG4gICAgICAgIHRoaXMuX251bVByZXYgPSAwOyAvLyBOdW1iZXIgb2YgcHJldmlvdXMgcHJvbWlzZXMgKGZvciBsb25nIHN0YWNrcylcbiAgICAgICAgbGlua1RvUHJldmlvdXNQcm9taXNlKHRoaXMsIGN1cnJlbnRGdWxmaWxsZXIpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgaWYgKGZuICE9PSBJTlRFUk5BTCkgdGhyb3cgbmV3IFR5cGVFcnJvcignTm90IGEgZnVuY3Rpb24nKTtcbiAgICAgICAgLy8gUHJpdmF0ZSBjb25zdHJ1Y3RvciAoSU5URVJOQUwsIHN0YXRlLCB2YWx1ZSkuXG4gICAgICAgIC8vIFVzZWQgaW50ZXJuYWxseSBieSBQcm9taXNlLnJlc29sdmUoKSBhbmQgUHJvbWlzZS5yZWplY3QoKS5cbiAgICAgICAgdGhpcy5fc3RhdGUgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHRoaXMuX3ZhbHVlID0gYXJndW1lbnRzWzJdO1xuICAgICAgICBpZiAodGhpcy5fc3RhdGUgPT09IGZhbHNlKSBoYW5kbGVSZWplY3Rpb24odGhpcywgdGhpcy5fdmFsdWUpOyAvLyBNYXAgZXJyb3IsIHNldCBzdGFjayBhbmQgYWRkUG9zc2libHlVbmhhbmRsZWRFcnJvcigpLlxuICAgICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fc3RhdGUgPSBudWxsOyAvLyBudWxsICg9cGVuZGluZyksIGZhbHNlICg9cmVqZWN0ZWQpIG9yIHRydWUgKD1yZXNvbHZlZClcbiAgICB0aGlzLl92YWx1ZSA9IG51bGw7IC8vIGVycm9yIG9yIHJlc3VsdFxuICAgICsrcHNkLnJlZjsgLy8gUmVmY291bnRpbmcgY3VycmVudCBzY29wZVxuICAgIGV4ZWN1dGVQcm9taXNlVGFzayh0aGlzLCBmbik7XG59XG5cbnByb3BzKFByb21pc2UucHJvdG90eXBlLCB7XG5cbiAgICB0aGVuOiBmdW5jdGlvbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICB2YXIgcnYgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBwcm9wYWdhdGVUb0xpc3RlbmVyKF90aGlzLCBuZXcgTGlzdGVuZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlc29sdmUsIHJlamVjdCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVidWcgJiYgKCF0aGlzLl9wcmV2IHx8IHRoaXMuX3N0YXRlID09PSBudWxsKSAmJiBsaW5rVG9QcmV2aW91c1Byb21pc2UocnYsIHRoaXMpO1xuICAgICAgICByZXR1cm4gcnY7XG4gICAgfSxcblxuICAgIF90aGVuOiBmdW5jdGlvbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICAgICAgLy8gQSBsaXR0bGUgdGluaWVyIHZlcnNpb24gb2YgdGhlbigpIHRoYXQgZG9uJ3QgaGF2ZSB0byBjcmVhdGUgYSByZXN1bHRpbmcgcHJvbWlzZS5cbiAgICAgICAgcHJvcGFnYXRlVG9MaXN0ZW5lcih0aGlzLCBuZXcgTGlzdGVuZXIobnVsbCwgbnVsbCwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpKTtcbiAgICB9LFxuXG4gICAgY2F0Y2g6IGZ1bmN0aW9uIChvblJlamVjdGVkKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xuICAgICAgICAvLyBGaXJzdCBhcmd1bWVudCBpcyB0aGUgRXJyb3IgdHlwZSB0byBjYXRjaFxuICAgICAgICB2YXIgdHlwZSA9IGFyZ3VtZW50c1swXSxcbiAgICAgICAgICAgIGhhbmRsZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHJldHVybiB0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJyA/IHRoaXMudGhlbihudWxsLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgICAgIC8vIENhdGNoaW5nIGVycm9ycyBieSBpdHMgY29uc3RydWN0b3IgdHlwZSAoc2ltaWxhciB0byBqYXZhIC8gYysrIC8gYyMpXG4gICAgICAgICAgICAgICAgLy8gU2FtcGxlOiBwcm9taXNlLmNhdGNoKFR5cGVFcnJvciwgZnVuY3Rpb24gKGUpIHsgLi4uIH0pO1xuICAgICAgICAgICAgICAgIGVyciBpbnN0YW5jZW9mIHR5cGUgPyBoYW5kbGVyKGVycikgOiBQcm9taXNlUmVqZWN0KGVycilcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pIDogdGhpcy50aGVuKG51bGwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgLy8gQ2F0Y2hpbmcgZXJyb3JzIGJ5IHRoZSBlcnJvci5uYW1lIHByb3BlcnR5LiBNYWtlcyBzZW5zZSBmb3IgaW5kZXhlZERCIHdoZXJlIGVycm9yIHR5cGVcbiAgICAgICAgICAgICAgICAvLyBpcyBhbHdheXMgRE9NRXJyb3IgYnV0IHdoZXJlIGUubmFtZSB0ZWxscyB0aGUgYWN0dWFsIGVycm9yIHR5cGUuXG4gICAgICAgICAgICAgICAgLy8gU2FtcGxlOiBwcm9taXNlLmNhdGNoKCdDb25zdHJhaW50RXJyb3InLCBmdW5jdGlvbiAoZSkgeyAuLi4gfSk7XG4gICAgICAgICAgICAgICAgZXJyICYmIGVyci5uYW1lID09PSB0eXBlID8gaGFuZGxlcihlcnIpIDogUHJvbWlzZVJlamVjdChlcnIpXG4gICAgICAgICAgICApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgZmluYWxseTogZnVuY3Rpb24gKG9uRmluYWxseSkge1xuICAgICAgICByZXR1cm4gdGhpcy50aGVuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgb25GaW5hbGx5KCk7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIG9uRmluYWxseSgpO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2VSZWplY3QoZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8vIERlcHJlY2F0ZSBpbiBuZXh0IG1ham9yLiBOZWVkZWQgb25seSBmb3IgZGIub24uZXJyb3IuXG4gICAgdW5jYXVnaHQ6IGZ1bmN0aW9uICh1bmNhdWdodEhhbmRsZXIpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgLy8gQmUgYmFja3dhcmQgY29tcGF0aWJsZSBhbmQgdXNlIFwib251bmNhdGNoZWRcIiBhcyB0aGUgZXZlbnQgbmFtZSBvbiB0aGlzLlxuICAgICAgICAvLyBIYW5kbGUgbXVsdGlwbGUgc3Vic2NyaWJlcnMgdGhyb3VnaCByZXZlcnNlU3RvcHBhYmxlRXZlbnRDaGFpbigpLiBJZiBhIGhhbmRsZXIgcmV0dXJucyBgZmFsc2VgLCBidWJibGluZyBzdG9wcy5cbiAgICAgICAgdGhpcy5vbnVuY2F0Y2hlZCA9IHJldmVyc2VTdG9wcGFibGVFdmVudENoYWluKHRoaXMub251bmNhdGNoZWQsIHVuY2F1Z2h0SGFuZGxlcik7XG4gICAgICAgIC8vIEluIGNhc2UgY2FsbGVyIGRvZXMgdGhpcyBvbiBhbiBhbHJlYWR5IHJlamVjdGVkIHByb21pc2UsIGFzc3VtZSBjYWxsZXIgd2FudHMgdG8gcG9pbnQgb3V0IHRoZSBlcnJvciB0byB0aGlzIHByb21pc2UgYW5kIG5vdFxuICAgICAgICAvLyBhIHByZXZpb3VzIHByb21pc2UuIFJlYXNvbjogdGhlIHByZXZvdXMgcHJvbWlzZSBtYXkgbGFjayBvbnVuY2F0Y2hlZCBoYW5kbGVyLiBcbiAgICAgICAgaWYgKHRoaXMuX3N0YXRlID09PSBmYWxzZSAmJiB1bmhhbmRsZWRFcnJvcnMuaW5kZXhPZih0aGlzKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIFJlcGxhY2UgdW5oYW5kbGVkIGVycm9yJ3MgZGVzdGluYWlvbiBwcm9taXNlIHdpdGggdGhpcyBvbmUhXG4gICAgICAgICAgICB1bmhhbmRsZWRFcnJvcnMuc29tZShmdW5jdGlvbiAocCwgaSwgbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwLl92YWx1ZSA9PT0gX3RoaXMyLl92YWx1ZSAmJiAobFtpXSA9IF90aGlzMik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIEFjdHVhbGx5IHdlIGRvIHRoaXMgc2hpdCBiZWNhdXNlIHdlIG5lZWQgdG8gc3VwcG9ydCBkYi5vbi5lcnJvcigpIGNvcnJlY3RseSBkdXJpbmcgZGIub3BlbigpLiBJZiB3ZSBkZXByZWNhdGUgZGIub24uZXJyb3IsIHdlIGNvdWxkXG4gICAgICAgICAgICAvLyB0YWtlIGF3YXkgdGhpcyBwaWVjZSBvZiBjb2RlIGFzIHdlbGwgYXMgdGhlIG9udW5jYXRjaGVkIGFuZCB1bmNhdWdodCgpIG1ldGhvZC5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgc3RhY2s6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fc3RhY2spIHJldHVybiB0aGlzLl9zdGFjaztcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgc3RhY2tfYmVpbmdfZ2VuZXJhdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgc3RhY2tzID0gZ2V0U3RhY2sodGhpcywgW10sIE1BWF9MT05HX1NUQUNLUyk7XG4gICAgICAgICAgICAgICAgdmFyIHN0YWNrID0gc3RhY2tzLmpvaW4oXCJcXG5Gcm9tIHByZXZpb3VzOiBcIik7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX3N0YXRlICE9PSBudWxsKSB0aGlzLl9zdGFjayA9IHN0YWNrOyAvLyBTdGFjayBtYXkgYmUgdXBkYXRlZCBvbiByZWplY3QuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0YWNrO1xuICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICBzdGFja19iZWluZ19nZW5lcmF0ZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG5mdW5jdGlvbiBMaXN0ZW5lcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbDtcbiAgICB0aGlzLm9uUmVqZWN0ZWQgPSB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uUmVqZWN0ZWQgOiBudWxsO1xuICAgIHRoaXMucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgdGhpcy5yZWplY3QgPSByZWplY3Q7XG4gICAgdGhpcy5wc2QgPSBQU0Q7XG59XG5cbi8vIFByb21pc2UgU3RhdGljIFByb3BlcnRpZXNcbnByb3BzKFByb21pc2UsIHtcbiAgICBhbGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IGdldEFycmF5T2YuYXBwbHkobnVsbCwgYXJndW1lbnRzKTsgLy8gU3VwcG9ydHMgaXRlcmFibGVzLCBpbXBsaWNpdCBhcmd1bWVudHMgYW5kIGFycmF5LWxpa2UuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAodmFsdWVzLmxlbmd0aCA9PT0gMCkgcmVzb2x2ZShbXSk7XG4gICAgICAgICAgICB2YXIgcmVtYWluaW5nID0gdmFsdWVzLmxlbmd0aDtcbiAgICAgICAgICAgIHZhbHVlcy5mb3JFYWNoKGZ1bmN0aW9uIChhLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShhKS50aGVuKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlc1tpXSA9IHg7XG4gICAgICAgICAgICAgICAgICAgIGlmICghIC0tcmVtYWluaW5nKSByZXNvbHZlKHZhbHVlcyk7XG4gICAgICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgcmVzb2x2ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFByb21pc2UpIHJldHVybiB2YWx1ZTtcbiAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSAnZnVuY3Rpb24nKSByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFsdWUudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKElOVEVSTkFMLCB0cnVlLCB2YWx1ZSk7XG4gICAgfSxcblxuICAgIHJlamVjdDogUHJvbWlzZVJlamVjdCxcblxuICAgIHJhY2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IGdldEFycmF5T2YuYXBwbHkobnVsbCwgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhbHVlcy5tYXAoZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh2YWx1ZSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBQU0Q6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gUFNEO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIFBTRCA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIG5ld1BTRDogbmV3U2NvcGUsXG5cbiAgICB1c2VQU0Q6IHVzZVBTRCxcblxuICAgIHNjaGVkdWxlcjoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBhc2FwJDE7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBhc2FwJDEgPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZWplY3Rpb25NYXBwZXI6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0aW9uTWFwcGVyO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgcmVqZWN0aW9uTWFwcGVyID0gdmFsdWU7XG4gICAgICAgIH0gLy8gTWFwIHJlamVjdCBmYWlsdXJlc1xuICAgIH0sXG5cbiAgICBmb2xsb3c6IGZ1bmN0aW9uIChmbikge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ld1Njb3BlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICB2YXIgcHNkID0gUFNEO1xuICAgICAgICAgICAgICAgIHBzZC51bmhhbmRsZWRzID0gW107IC8vIEZvciB1bmhhbmRsZWQgc3RhbmRhcmQtIG9yIDNyZCBwYXJ0eSBQcm9taXNlcy4gQ2hlY2tlZCBhdCBwc2QuZmluYWxpemUoKVxuICAgICAgICAgICAgICAgIHBzZC5vbnVuaGFuZGxlZCA9IHJlamVjdDsgLy8gVHJpZ2dlcmVkIGRpcmVjdGx5IG9uIHVuaGFuZGxlZCBwcm9taXNlcyBvZiB0aGlzIGxpYnJhcnkuXG4gICAgICAgICAgICAgICAgcHNkLmZpbmFsaXplID0gY2FsbEJvdGgoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICAgICAgICAgICAgICAvLyBVbmhhbmRsZWQgc3RhbmRhcmQgb3IgM3JkIHBhcnQgcHJvbWlzZXMgYXJlIHB1dCBpbiBQU0QudW5oYW5kbGVkcyBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gZXhhbWluZWQgdXBvbiBzY29wZSBjb21wbGV0aW9uIHdoaWxlIHVuaGFuZGxlZCByZWplY3Rpb25zIGluIHRoaXMgUHJvbWlzZVxuICAgICAgICAgICAgICAgICAgICAvLyB3aWxsIHRyaWdnZXIgZGlyZWN0bHkgdGhyb3VnaCBwc2Qub251bmhhbmRsZWRcbiAgICAgICAgICAgICAgICAgICAgcnVuX2F0X2VuZF9vZl90aGlzX29yX25leHRfcGh5c2ljYWxfdGljayhmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpczMudW5oYW5kbGVkcy5sZW5ndGggPT09IDAgPyByZXNvbHZlKCkgOiByZWplY3QoX3RoaXMzLnVuaGFuZGxlZHNbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCBwc2QuZmluYWxpemUpO1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9LCByZXNvbHZlLCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgb246IEV2ZW50cyhudWxsLCB7IFwiZXJyb3JcIjogW3JldmVyc2VTdG9wcGFibGVFdmVudENoYWluLCBkZWZhdWx0RXJyb3JIYW5kbGVyXSAvLyBEZWZhdWx0IHRvIGRlZmF1bHRFcnJvckhhbmRsZXJcbiAgICB9KVxuXG59KTtcblxudmFyIFByb21pc2VPbkVycm9yID0gUHJvbWlzZS5vbi5lcnJvcjtcblByb21pc2VPbkVycm9yLnN1YnNjcmliZSA9IGRlcHJlY2F0ZWQoXCJQcm9taXNlLm9uKCdlcnJvcicpXCIsIFByb21pc2VPbkVycm9yLnN1YnNjcmliZSk7XG5Qcm9taXNlT25FcnJvci51bnN1YnNjcmliZSA9IGRlcHJlY2F0ZWQoXCJQcm9taXNlLm9uKCdlcnJvcicpLnVuc3Vic2NyaWJlXCIsIFByb21pc2VPbkVycm9yLnVuc3Vic2NyaWJlKTtcblxuLyoqXHJcbiogVGFrZSBhIHBvdGVudGlhbGx5IG1pc2JlaGF2aW5nIHJlc29sdmVyIGZ1bmN0aW9uIGFuZCBtYWtlIHN1cmVcclxuKiBvbkZ1bGZpbGxlZCBhbmQgb25SZWplY3RlZCBhcmUgb25seSBjYWxsZWQgb25jZS5cclxuKlxyXG4qIE1ha2VzIG5vIGd1YXJhbnRlZXMgYWJvdXQgYXN5bmNocm9ueS5cclxuKi9cbmZ1bmN0aW9uIGV4ZWN1dGVQcm9taXNlVGFzayhwcm9taXNlLCBmbikge1xuICAgIC8vIFByb21pc2UgUmVzb2x1dGlvbiBQcm9jZWR1cmU6XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMjdGhlLXByb21pc2UtcmVzb2x1dGlvbi1wcm9jZWR1cmVcbiAgICB0cnkge1xuICAgICAgICBmbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSBwcm9taXNlKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdBIHByb21pc2UgY2Fubm90IGJlIHJlc29sdmVkIHdpdGggaXRzZWxmLicpO1xuICAgICAgICAgICAgdmFyIHNob3VsZEV4ZWN1dGVUaWNrID0gcHJvbWlzZS5fbGliICYmIGJlZ2luTWljcm9UaWNrU2NvcGUoKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSAmJiB0eXBlb2YgdmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGV4ZWN1dGVQcm9taXNlVGFzayhwcm9taXNlLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSA/IHZhbHVlLl90aGVuKHJlc29sdmUsIHJlamVjdCkgOiB2YWx1ZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHByb21pc2UuX3N0YXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBwcm9taXNlLl92YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHByb3BhZ2F0ZUFsbExpc3RlbmVycyhwcm9taXNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzaG91bGRFeGVjdXRlVGljaykgZW5kTWljcm9UaWNrU2NvcGUoKTtcbiAgICAgICAgfSwgaGFuZGxlUmVqZWN0aW9uLmJpbmQobnVsbCwgcHJvbWlzZSkpOyAvLyBJZiBGdW5jdGlvbi5iaW5kIGlzIG5vdCBzdXBwb3J0ZWQuIEV4Y2VwdGlvbiBpcyBoYW5kbGVkIGluIGNhdGNoIGJlbG93XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgaGFuZGxlUmVqZWN0aW9uKHByb21pc2UsIGV4KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZVJlamVjdGlvbihwcm9taXNlLCByZWFzb24pIHtcbiAgICByZWplY3RpbmdFcnJvcnMucHVzaChyZWFzb24pO1xuICAgIGlmIChwcm9taXNlLl9zdGF0ZSAhPT0gbnVsbCkgcmV0dXJuO1xuICAgIHZhciBzaG91bGRFeGVjdXRlVGljayA9IHByb21pc2UuX2xpYiAmJiBiZWdpbk1pY3JvVGlja1Njb3BlKCk7XG4gICAgcmVhc29uID0gcmVqZWN0aW9uTWFwcGVyKHJlYXNvbik7XG4gICAgcHJvbWlzZS5fc3RhdGUgPSBmYWxzZTtcbiAgICBwcm9taXNlLl92YWx1ZSA9IHJlYXNvbjtcbiAgICBkZWJ1ZyAmJiByZWFzb24gIT09IG51bGwgJiYgdHlwZW9mIHJlYXNvbiA9PT0gJ29iamVjdCcgJiYgIXJlYXNvbi5fcHJvbWlzZSAmJiB0cnlDYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvcmlnUHJvcCA9IGdldFByb3BlcnR5RGVzY3JpcHRvcihyZWFzb24sIFwic3RhY2tcIik7XG4gICAgICAgIHJlYXNvbi5fcHJvbWlzZSA9IHByb21pc2U7XG4gICAgICAgIHNldFByb3AocmVhc29uLCBcInN0YWNrXCIsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzdGFja19iZWluZ19nZW5lcmF0ZWQgPyBvcmlnUHJvcCAmJiAob3JpZ1Byb3AuZ2V0ID8gb3JpZ1Byb3AuZ2V0LmFwcGx5KHJlYXNvbikgOiBvcmlnUHJvcC52YWx1ZSkgOiBwcm9taXNlLnN0YWNrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICAvLyBBZGQgdGhlIGZhaWx1cmUgdG8gYSBsaXN0IG9mIHBvc3NpYmx5IHVuY2F1Z2h0IGVycm9yc1xuICAgIGFkZFBvc3NpYmx5VW5oYW5kbGVkRXJyb3IocHJvbWlzZSk7XG4gICAgcHJvcGFnYXRlQWxsTGlzdGVuZXJzKHByb21pc2UpO1xuICAgIGlmIChzaG91bGRFeGVjdXRlVGljaykgZW5kTWljcm9UaWNrU2NvcGUoKTtcbn1cblxuZnVuY3Rpb24gcHJvcGFnYXRlQWxsTGlzdGVuZXJzKHByb21pc2UpIHtcbiAgICAvL2RlYnVnICYmIGxpbmtUb1ByZXZpb3VzUHJvbWlzZShwcm9taXNlKTtcbiAgICB2YXIgbGlzdGVuZXJzID0gcHJvbWlzZS5fbGlzdGVuZXJzO1xuICAgIHByb21pc2UuX2xpc3RlbmVycyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgcHJvcGFnYXRlVG9MaXN0ZW5lcihwcm9taXNlLCBsaXN0ZW5lcnNbaV0pO1xuICAgIH1cbiAgICB2YXIgcHNkID0gcHJvbWlzZS5fUFNEO1xuICAgIC0tcHNkLnJlZiB8fCBwc2QuZmluYWxpemUoKTsgLy8gaWYgcHNkLnJlZiByZWFjaGVzIHplcm8sIGNhbGwgcHNkLmZpbmFsaXplKCk7XG4gICAgaWYgKG51bVNjaGVkdWxlZENhbGxzID09PSAwKSB7XG4gICAgICAgIC8vIElmIG51bVNjaGVkdWxlZENhbGxzIGlzIDAsIGl0IG1lYW5zIHRoYXQgb3VyIHN0YWNrIGlzIG5vdCBpbiBhIGNhbGxiYWNrIG9mIGEgc2NoZWR1bGVkIGNhbGwsXG4gICAgICAgIC8vIGFuZCB0aGF0IG5vIGRlZmVycmVkcyB3aGVyZSBsaXN0ZW5pbmcgdG8gdGhpcyByZWplY3Rpb24gb3Igc3VjY2Vzcy5cbiAgICAgICAgLy8gU2luY2UgdGhlcmUgaXMgYSByaXNrIHRoYXQgb3VyIHN0YWNrIGNhbiBjb250YWluIGFwcGxpY2F0aW9uIGNvZGUgdGhhdCBtYXlcbiAgICAgICAgLy8gZG8gc3R1ZmYgYWZ0ZXIgdGhpcyBjb2RlIGlzIGZpbmlzaGVkIHRoYXQgbWF5IGdlbmVyYXRlIG5ldyBjYWxscywgd2UgY2Fubm90XG4gICAgICAgIC8vIGNhbGwgZmluYWxpemVycyBoZXJlLlxuICAgICAgICArK251bVNjaGVkdWxlZENhbGxzO1xuICAgICAgICBhc2FwJDEoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKC0tbnVtU2NoZWR1bGVkQ2FsbHMgPT09IDApIGZpbmFsaXplUGh5c2ljYWxUaWNrKCk7IC8vIFdpbGwgZGV0ZWN0IHVuaGFuZGxlZCBlcnJvcnNcbiAgICAgICAgfSwgW10pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcHJvcGFnYXRlVG9MaXN0ZW5lcihwcm9taXNlLCBsaXN0ZW5lcikge1xuICAgIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gbnVsbCkge1xuICAgICAgICBwcm9taXNlLl9saXN0ZW5lcnMucHVzaChsaXN0ZW5lcik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgY2IgPSBwcm9taXNlLl9zdGF0ZSA/IGxpc3RlbmVyLm9uRnVsZmlsbGVkIDogbGlzdGVuZXIub25SZWplY3RlZDtcbiAgICBpZiAoY2IgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVGhpcyBMaXN0ZW5lciBkb2VzbnQgaGF2ZSBhIGxpc3RlbmVyIGZvciB0aGUgZXZlbnQgYmVpbmcgdHJpZ2dlcmVkIChvbkZ1bGZpbGxlZCBvciBvblJlamVjdCkgc28gbGV0cyBmb3J3YXJkIHRoZSBldmVudCB0byBhbnkgZXZlbnR1YWwgbGlzdGVuZXJzIG9uIHRoZSBQcm9taXNlIGluc3RhbmNlIHJldHVybmVkIGJ5IHRoZW4oKSBvciBjYXRjaCgpXG4gICAgICAgIHJldHVybiAocHJvbWlzZS5fc3RhdGUgPyBsaXN0ZW5lci5yZXNvbHZlIDogbGlzdGVuZXIucmVqZWN0KShwcm9taXNlLl92YWx1ZSk7XG4gICAgfVxuICAgIHZhciBwc2QgPSBsaXN0ZW5lci5wc2Q7XG4gICAgKytwc2QucmVmO1xuICAgICsrbnVtU2NoZWR1bGVkQ2FsbHM7XG4gICAgYXNhcCQxKGNhbGxMaXN0ZW5lciwgW2NiLCBwcm9taXNlLCBsaXN0ZW5lcl0pO1xufVxuXG5mdW5jdGlvbiBjYWxsTGlzdGVuZXIoY2IsIHByb21pc2UsIGxpc3RlbmVyKSB7XG4gICAgdmFyIG91dGVyU2NvcGUgPSBQU0Q7XG4gICAgdmFyIHBzZCA9IGxpc3RlbmVyLnBzZDtcbiAgICB0cnkge1xuICAgICAgICBpZiAocHNkICE9PSBvdXRlclNjb3BlKSB7XG4gICAgICAgICAgICAvLyAqKktFRVAqKiBvdXRlclNjb3BlLmVudiA9IHdyYXBwZXJzLnNuYXBzaG90KCk7IC8vIFNuYXBzaG90IG91dGVyU2NvcGUncyBlbnZpcm9ubWVudC5cbiAgICAgICAgICAgIFBTRCA9IHBzZDtcbiAgICAgICAgICAgIC8vICoqS0VFUCoqIHdyYXBwZXJzLnJlc3RvcmUocHNkLmVudik7IC8vIFJlc3RvcmUgUFNEJ3MgZW52aXJvbm1lbnQuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgc3RhdGljIHZhcmlhYmxlIGN1cnJlbnRGdWxmaWxsZXIgdG8gdGhlIHByb21pc2UgdGhhdCBpcyBiZWluZyBmdWxsZmlsbGVkLFxuICAgICAgICAvLyBzbyB0aGF0IHdlIGNvbm5lY3QgdGhlIGNoYWluIG9mIHByb21pc2VzIChmb3IgbG9uZyBzdGFja3Mgc3VwcG9ydClcbiAgICAgICAgY3VycmVudEZ1bGZpbGxlciA9IHByb21pc2U7XG5cbiAgICAgICAgLy8gQ2FsbCBjYWxsYmFjayBhbmQgcmVzb2x2ZSBvdXIgbGlzdGVuZXIgd2l0aCBpdCdzIHJldHVybiB2YWx1ZS5cbiAgICAgICAgdmFyIHZhbHVlID0gcHJvbWlzZS5fdmFsdWUsXG4gICAgICAgICAgICByZXQ7XG4gICAgICAgIGlmIChwcm9taXNlLl9zdGF0ZSkge1xuICAgICAgICAgICAgcmV0ID0gY2IodmFsdWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHJlamVjdGluZ0Vycm9ycy5sZW5ndGgpIHJlamVjdGluZ0Vycm9ycyA9IFtdO1xuICAgICAgICAgICAgcmV0ID0gY2IodmFsdWUpO1xuICAgICAgICAgICAgaWYgKHJlamVjdGluZ0Vycm9ycy5pbmRleE9mKHZhbHVlKSA9PT0gLTEpIG1hcmtFcnJvckFzSGFuZGxlZChwcm9taXNlKTsgLy8gQ2FsbGJhY2sgZGlkbnQgZG8gUHJvbWlzZS5yZWplY3QoZXJyKSBub3IgcmVqZWN0KGVycikgb250byBhbm90aGVyIHByb21pc2UuXG4gICAgICAgIH1cbiAgICAgICAgbGlzdGVuZXIucmVzb2x2ZShyZXQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gRXhjZXB0aW9uIHRocm93biBpbiBjYWxsYmFjay4gUmVqZWN0IG91ciBsaXN0ZW5lci5cbiAgICAgICAgbGlzdGVuZXIucmVqZWN0KGUpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICAgIC8vIFJlc3RvcmUgUFNELCBlbnYgYW5kIGN1cnJlbnRGdWxmaWxsZXIuXG4gICAgICAgIGlmIChwc2QgIT09IG91dGVyU2NvcGUpIHtcbiAgICAgICAgICAgIFBTRCA9IG91dGVyU2NvcGU7XG4gICAgICAgICAgICAvLyAqKktFRVAqKiB3cmFwcGVycy5yZXN0b3JlKG91dGVyU2NvcGUuZW52KTsgLy8gUmVzdG9yZSBvdXRlclNjb3BlJ3MgZW52aXJvbm1lbnRcbiAgICAgICAgfVxuICAgICAgICBjdXJyZW50RnVsZmlsbGVyID0gbnVsbDtcbiAgICAgICAgaWYgKC0tbnVtU2NoZWR1bGVkQ2FsbHMgPT09IDApIGZpbmFsaXplUGh5c2ljYWxUaWNrKCk7XG4gICAgICAgIC0tcHNkLnJlZiB8fCBwc2QuZmluYWxpemUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFN0YWNrKHByb21pc2UsIHN0YWNrcywgbGltaXQpIHtcbiAgICBpZiAoc3RhY2tzLmxlbmd0aCA9PT0gbGltaXQpIHJldHVybiBzdGFja3M7XG4gICAgdmFyIHN0YWNrID0gXCJcIjtcbiAgICBpZiAocHJvbWlzZS5fc3RhdGUgPT09IGZhbHNlKSB7XG4gICAgICAgIHZhciBmYWlsdXJlID0gcHJvbWlzZS5fdmFsdWUsXG4gICAgICAgICAgICBlcnJvck5hbWUsXG4gICAgICAgICAgICBtZXNzYWdlO1xuXG4gICAgICAgIGlmIChmYWlsdXJlICE9IG51bGwpIHtcbiAgICAgICAgICAgIGVycm9yTmFtZSA9IGZhaWx1cmUubmFtZSB8fCBcIkVycm9yXCI7XG4gICAgICAgICAgICBtZXNzYWdlID0gZmFpbHVyZS5tZXNzYWdlIHx8IGZhaWx1cmU7XG4gICAgICAgICAgICBzdGFjayA9IHByZXR0eVN0YWNrKGZhaWx1cmUsIDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3JOYW1lID0gZmFpbHVyZTsgLy8gSWYgZXJyb3IgaXMgdW5kZWZpbmVkIG9yIG51bGwsIHNob3cgdGhhdC5cbiAgICAgICAgICAgIG1lc3NhZ2UgPSBcIlwiO1xuICAgICAgICB9XG4gICAgICAgIHN0YWNrcy5wdXNoKGVycm9yTmFtZSArIChtZXNzYWdlID8gXCI6IFwiICsgbWVzc2FnZSA6IFwiXCIpICsgc3RhY2spO1xuICAgIH1cbiAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgc3RhY2sgPSBwcmV0dHlTdGFjayhwcm9taXNlLl9zdGFja0hvbGRlciwgMik7XG4gICAgICAgIGlmIChzdGFjayAmJiBzdGFja3MuaW5kZXhPZihzdGFjaykgPT09IC0xKSBzdGFja3MucHVzaChzdGFjayk7XG4gICAgICAgIGlmIChwcm9taXNlLl9wcmV2KSBnZXRTdGFjayhwcm9taXNlLl9wcmV2LCBzdGFja3MsIGxpbWl0KTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YWNrcztcbn1cblxuZnVuY3Rpb24gbGlua1RvUHJldmlvdXNQcm9taXNlKHByb21pc2UsIHByZXYpIHtcbiAgICAvLyBTdXBwb3J0IGxvbmcgc3RhY2tzIGJ5IGxpbmtpbmcgdG8gcHJldmlvdXMgY29tcGxldGVkIHByb21pc2UuXG4gICAgdmFyIG51bVByZXYgPSBwcmV2ID8gcHJldi5fbnVtUHJldiArIDEgOiAwO1xuICAgIGlmIChudW1QcmV2IDwgTE9OR19TVEFDS1NfQ0xJUF9MSU1JVCkge1xuICAgICAgICAvLyBQcm9oaWJpdCBpbmZpbml0ZSBQcm9taXNlIGxvb3BzIHRvIGdldCBhbiBpbmZpbml0ZSBsb25nIG1lbW9yeSBjb25zdW1pbmcgXCJ0YWlsXCIuXG4gICAgICAgIHByb21pc2UuX3ByZXYgPSBwcmV2O1xuICAgICAgICBwcm9taXNlLl9udW1QcmV2ID0gbnVtUHJldjtcbiAgICB9XG59XG5cbi8qIFRoZSBjYWxsYmFjayB0byBzY2hlZHVsZSB3aXRoIHNldEltbWVkaWF0ZSgpIG9yIHNldFRpbWVvdXQoKS5cclxuICAgSXQgcnVucyBhIHZpcnR1YWwgbWljcm90aWNrIGFuZCBleGVjdXRlcyBhbnkgY2FsbGJhY2sgcmVnaXN0ZXJlZCBpbiBtaWNyb3RpY2tRdWV1ZS5cclxuICovXG5mdW5jdGlvbiBwaHlzaWNhbFRpY2soKSB7XG4gICAgYmVnaW5NaWNyb1RpY2tTY29wZSgpICYmIGVuZE1pY3JvVGlja1Njb3BlKCk7XG59XG5cbmZ1bmN0aW9uIGJlZ2luTWljcm9UaWNrU2NvcGUoKSB7XG4gICAgdmFyIHdhc1Jvb3RFeGVjID0gaXNPdXRzaWRlTWljcm9UaWNrO1xuICAgIGlzT3V0c2lkZU1pY3JvVGljayA9IGZhbHNlO1xuICAgIG5lZWRzTmV3UGh5c2ljYWxUaWNrID0gZmFsc2U7XG4gICAgcmV0dXJuIHdhc1Jvb3RFeGVjO1xufVxuXG4vKiBFeGVjdXRlcyBtaWNyby10aWNrcyB3aXRob3V0IGRvaW5nIHRyeS4uY2F0Y2guXHJcbiAgIFRoaXMgY2FuIGJlIHBvc3NpYmxlIGJlY2F1c2Ugd2Ugb25seSB1c2UgdGhpcyBpbnRlcm5hbGx5IGFuZFxyXG4gICB0aGUgcmVnaXN0ZXJlZCBmdW5jdGlvbnMgYXJlIGV4Y2VwdGlvbi1zYWZlICh0aGV5IGRvIHRyeS4uY2F0Y2hcclxuICAgaW50ZXJuYWxseSBiZWZvcmUgY2FsbGluZyBhbnkgZXh0ZXJuYWwgbWV0aG9kKS4gSWYgcmVnaXN0ZXJpbmdcclxuICAgZnVuY3Rpb25zIGluIHRoZSBtaWNyb3RpY2tRdWV1ZSB0aGF0IGFyZSBub3QgZXhjZXB0aW9uLXNhZmUsIHRoaXNcclxuICAgd291bGQgZGVzdHJveSB0aGUgZnJhbWV3b3JrIGFuZCBtYWtlIGl0IGluc3RhYmxlLiBTbyB3ZSBkb24ndCBleHBvcnRcclxuICAgb3VyIGFzYXAgbWV0aG9kLlxyXG4qL1xuZnVuY3Rpb24gZW5kTWljcm9UaWNrU2NvcGUoKSB7XG4gICAgdmFyIGNhbGxiYWNrcywgaSwgbDtcbiAgICBkbyB7XG4gICAgICAgIHdoaWxlIChtaWNyb3RpY2tRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjYWxsYmFja3MgPSBtaWNyb3RpY2tRdWV1ZTtcbiAgICAgICAgICAgIG1pY3JvdGlja1F1ZXVlID0gW107XG4gICAgICAgICAgICBsID0gY2FsbGJhY2tzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGNhbGxiYWNrc1tpXTtcbiAgICAgICAgICAgICAgICBpdGVtWzBdLmFwcGx5KG51bGwsIGl0ZW1bMV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSB3aGlsZSAobWljcm90aWNrUXVldWUubGVuZ3RoID4gMCk7XG4gICAgaXNPdXRzaWRlTWljcm9UaWNrID0gdHJ1ZTtcbiAgICBuZWVkc05ld1BoeXNpY2FsVGljayA9IHRydWU7XG59XG5cbmZ1bmN0aW9uIGZpbmFsaXplUGh5c2ljYWxUaWNrKCkge1xuICAgIHZhciB1bmhhbmRsZWRFcnJzID0gdW5oYW5kbGVkRXJyb3JzO1xuICAgIHVuaGFuZGxlZEVycm9ycyA9IFtdO1xuICAgIHVuaGFuZGxlZEVycnMuZm9yRWFjaChmdW5jdGlvbiAocCkge1xuICAgICAgICBwLl9QU0Qub251bmhhbmRsZWQuY2FsbChudWxsLCBwLl92YWx1ZSwgcCk7XG4gICAgfSk7XG4gICAgdmFyIGZpbmFsaXplcnMgPSB0aWNrRmluYWxpemVycy5zbGljZSgwKTsgLy8gQ2xvbmUgZmlyc3QgYmVjYXVzZSBmaW5hbGl6ZXIgbWF5IHJlbW92ZSBpdHNlbGYgZnJvbSBsaXN0LlxuICAgIHZhciBpID0gZmluYWxpemVycy5sZW5ndGg7XG4gICAgd2hpbGUgKGkpIHtcbiAgICAgICAgZmluYWxpemVyc1stLWldKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBydW5fYXRfZW5kX29mX3RoaXNfb3JfbmV4dF9waHlzaWNhbF90aWNrKGZuKSB7XG4gICAgZnVuY3Rpb24gZmluYWxpemVyKCkge1xuICAgICAgICBmbigpO1xuICAgICAgICB0aWNrRmluYWxpemVycy5zcGxpY2UodGlja0ZpbmFsaXplcnMuaW5kZXhPZihmaW5hbGl6ZXIpLCAxKTtcbiAgICB9XG4gICAgdGlja0ZpbmFsaXplcnMucHVzaChmaW5hbGl6ZXIpO1xuICAgICsrbnVtU2NoZWR1bGVkQ2FsbHM7XG4gICAgYXNhcCQxKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKC0tbnVtU2NoZWR1bGVkQ2FsbHMgPT09IDApIGZpbmFsaXplUGh5c2ljYWxUaWNrKCk7XG4gICAgfSwgW10pO1xufVxuXG5mdW5jdGlvbiBhZGRQb3NzaWJseVVuaGFuZGxlZEVycm9yKHByb21pc2UpIHtcbiAgICAvLyBPbmx5IGFkZCB0byB1bmhhbmRsZWRFcnJvcnMgaWYgbm90IGFscmVhZHkgdGhlcmUuIFRoZSBmaXJzdCBvbmUgdG8gYWRkIHRvIHRoaXMgbGlzdFxuICAgIC8vIHdpbGwgYmUgdXBvbiB0aGUgZmlyc3QgcmVqZWN0aW9uIHNvIHRoYXQgdGhlIHJvb3QgY2F1c2UgKGZpcnN0IHByb21pc2UgaW4gdGhlXG4gICAgLy8gcmVqZWN0aW9uIGNoYWluKSBpcyB0aGUgb25lIGxpc3RlZC5cbiAgICBpZiAoIXVuaGFuZGxlZEVycm9ycy5zb21lKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHJldHVybiBwLl92YWx1ZSA9PT0gcHJvbWlzZS5fdmFsdWU7XG4gICAgfSkpIHVuaGFuZGxlZEVycm9ycy5wdXNoKHByb21pc2UpO1xufVxuXG5mdW5jdGlvbiBtYXJrRXJyb3JBc0hhbmRsZWQocHJvbWlzZSkge1xuICAgIC8vIENhbGxlZCB3aGVuIGEgcmVqZWN0IGhhbmRsZWQgaXMgYWN0dWFsbHkgYmVpbmcgY2FsbGVkLlxuICAgIC8vIFNlYXJjaCBpbiB1bmhhbmRsZWRFcnJvcnMgZm9yIGFueSBwcm9taXNlIHdob3MgX3ZhbHVlIGlzIHRoaXMgcHJvbWlzZV92YWx1ZSAobGlzdFxuICAgIC8vIGNvbnRhaW5zIG9ubHkgcmVqZWN0ZWQgcHJvbWlzZXMsIGFuZCBvbmx5IG9uZSBpdGVtIHBlciBlcnJvcilcbiAgICB2YXIgaSA9IHVuaGFuZGxlZEVycm9ycy5sZW5ndGg7XG4gICAgd2hpbGUgKGkpIHtcbiAgICAgICAgaWYgKHVuaGFuZGxlZEVycm9yc1stLWldLl92YWx1ZSA9PT0gcHJvbWlzZS5fdmFsdWUpIHtcbiAgICAgICAgICAgIC8vIEZvdW5kIGEgcHJvbWlzZSB0aGF0IGZhaWxlZCB3aXRoIHRoaXMgc2FtZSBlcnJvciBvYmplY3QgcG9pbnRlcixcbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGF0IHNpbmNlIHRoZXJlIGlzIGEgbGlzdGVuZXIgdGhhdCBhY3R1YWxseSB0YWtlcyBjYXJlIG9mIGl0LlxuICAgICAgICAgICAgdW5oYW5kbGVkRXJyb3JzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gQnkgZGVmYXVsdCwgbG9nIHVuY2F1Z2h0IGVycm9ycyB0byB0aGUgY29uc29sZVxuZnVuY3Rpb24gZGVmYXVsdEVycm9ySGFuZGxlcihlKSB7XG4gICAgY29uc29sZS53YXJuKCdVbmhhbmRsZWQgcmVqZWN0aW9uOiAnICsgKGUuc3RhY2sgfHwgZSkpO1xufVxuXG5mdW5jdGlvbiBQcm9taXNlUmVqZWN0KHJlYXNvbikge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShJTlRFUk5BTCwgZmFsc2UsIHJlYXNvbik7XG59XG5cbmZ1bmN0aW9uIHdyYXAoZm4sIGVycm9yQ2F0Y2hlcikge1xuICAgIHZhciBwc2QgPSBQU0Q7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHdhc1Jvb3RFeGVjID0gYmVnaW5NaWNyb1RpY2tTY29wZSgpLFxuICAgICAgICAgICAgb3V0ZXJTY29wZSA9IFBTRDtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKG91dGVyU2NvcGUgIT09IHBzZCkge1xuICAgICAgICAgICAgICAgIC8vICoqS0VFUCoqIG91dGVyU2NvcGUuZW52ID0gd3JhcHBlcnMuc25hcHNob3QoKTsgLy8gU25hcHNob3Qgb3V0ZXJTY29wZSdzIGVudmlyb25tZW50XG4gICAgICAgICAgICAgICAgUFNEID0gcHNkO1xuICAgICAgICAgICAgICAgIC8vICoqS0VFUCoqIHdyYXBwZXJzLnJlc3RvcmUocHNkLmVudik7IC8vIFJlc3RvcmUgUFNEJ3MgZW52aXJvbm1lbnQuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgZXJyb3JDYXRjaGVyICYmIGVycm9yQ2F0Y2hlcihlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGlmIChvdXRlclNjb3BlICE9PSBwc2QpIHtcbiAgICAgICAgICAgICAgICBQU0QgPSBvdXRlclNjb3BlO1xuICAgICAgICAgICAgICAgIC8vICoqS0VFUCoqIHdyYXBwZXJzLnJlc3RvcmUob3V0ZXJTY29wZS5lbnYpOyAvLyBSZXN0b3JlIG91dGVyU2NvcGUncyBlbnZpcm9ubWVudFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdhc1Jvb3RFeGVjKSBlbmRNaWNyb1RpY2tTY29wZSgpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gbmV3U2NvcGUoZm4sIGExLCBhMiwgYTMpIHtcbiAgICB2YXIgcGFyZW50ID0gUFNELFxuICAgICAgICBwc2QgPSBPYmplY3QuY3JlYXRlKHBhcmVudCk7XG4gICAgcHNkLnBhcmVudCA9IHBhcmVudDtcbiAgICBwc2QucmVmID0gMDtcbiAgICBwc2QuZ2xvYmFsID0gZmFsc2U7XG4gICAgLy8gKipLRUVQKiogcHNkLmVudiA9IHdyYXBwZXJzLndyYXAocHNkKTtcblxuICAgIC8vIHVuaGFuZGxlZHMgYW5kIG9udW5oYW5kbGVkIHNob3VsZCBub3QgYmUgc3BlY2lmaWNhbGx5IHNldCBoZXJlLlxuICAgIC8vIExlYXZlIHRoZW0gb24gcGFyZW50IHByb3RvdHlwZS5cbiAgICAvLyB1bmhhbmRsZWRzLnB1c2goZXJyKSB3aWxsIHB1c2ggdG8gcGFyZW50J3MgcHJvdG90eXBlXG4gICAgLy8gb251bmhhbmRsZWQoKSB3aWxsIGNhbGwgcGFyZW50cyBvbnVuaGFuZGxlZCAod2l0aCB0aGlzIHNjb3BlJ3MgdGhpcy1wb2ludGVyIHRob3VnaCEpXG4gICAgKytwYXJlbnQucmVmO1xuICAgIHBzZC5maW5hbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLS10aGlzLnBhcmVudC5yZWYgfHwgdGhpcy5wYXJlbnQuZmluYWxpemUoKTtcbiAgICB9O1xuICAgIHZhciBydiA9IHVzZVBTRChwc2QsIGZuLCBhMSwgYTIsIGEzKTtcbiAgICBpZiAocHNkLnJlZiA9PT0gMCkgcHNkLmZpbmFsaXplKCk7XG4gICAgcmV0dXJuIHJ2O1xufVxuXG5mdW5jdGlvbiB1c2VQU0QocHNkLCBmbiwgYTEsIGEyLCBhMykge1xuICAgIHZhciBvdXRlclNjb3BlID0gUFNEO1xuICAgIHRyeSB7XG4gICAgICAgIGlmIChwc2QgIT09IG91dGVyU2NvcGUpIHtcbiAgICAgICAgICAgIC8vICoqS0VFUCoqIG91dGVyU2NvcGUuZW52ID0gd3JhcHBlcnMuc25hcHNob3QoKTsgLy8gc25hcHNob3Qgb3V0ZXJTY29wZSdzIGVudmlyb25tZW50LlxuICAgICAgICAgICAgUFNEID0gcHNkO1xuICAgICAgICAgICAgLy8gKipLRUVQKiogd3JhcHBlcnMucmVzdG9yZShwc2QuZW52KTsgLy8gUmVzdG9yZSBQU0QncyBlbnZpcm9ubWVudC5cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZm4oYTEsIGEyLCBhMyk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgaWYgKHBzZCAhPT0gb3V0ZXJTY29wZSkge1xuICAgICAgICAgICAgUFNEID0gb3V0ZXJTY29wZTtcbiAgICAgICAgICAgIC8vICoqS0VFUCoqIHdyYXBwZXJzLnJlc3RvcmUob3V0ZXJTY29wZS5lbnYpOyAvLyBSZXN0b3JlIG91dGVyU2NvcGUncyBlbnZpcm9ubWVudC5cbiAgICAgICAgfVxuICAgIH1cbn1cblxudmFyIFVOSEFORExFRFJFSkVDVElPTiA9IFwidW5oYW5kbGVkcmVqZWN0aW9uXCI7XG5cbmZ1bmN0aW9uIGdsb2JhbEVycm9yKGVyciwgcHJvbWlzZSkge1xuICAgIHZhciBydjtcbiAgICB0cnkge1xuICAgICAgICBydiA9IHByb21pc2Uub251bmNhdGNoZWQoZXJyKTtcbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIGlmIChydiAhPT0gZmFsc2UpIHRyeSB7XG4gICAgICAgIHZhciBldmVudCxcbiAgICAgICAgICAgIGV2ZW50RGF0YSA9IHsgcHJvbWlzZTogcHJvbWlzZSwgcmVhc29uOiBlcnIgfTtcbiAgICAgICAgaWYgKF9nbG9iYWwuZG9jdW1lbnQgJiYgZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoVU5IQU5ETEVEUkVKRUNUSU9OLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgICAgIGV4dGVuZChldmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmIChfZ2xvYmFsLkN1c3RvbUV2ZW50KSB7XG4gICAgICAgICAgICBldmVudCA9IG5ldyBDdXN0b21FdmVudChVTkhBTkRMRURSRUpFQ1RJT04sIHsgZGV0YWlsOiBldmVudERhdGEgfSk7XG4gICAgICAgICAgICBleHRlbmQoZXZlbnQsIGV2ZW50RGF0YSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV2ZW50ICYmIF9nbG9iYWwuZGlzcGF0Y2hFdmVudCkge1xuICAgICAgICAgICAgZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgICAgICBpZiAoIV9nbG9iYWwuUHJvbWlzZVJlamVjdGlvbkV2ZW50ICYmIF9nbG9iYWwub251bmhhbmRsZWRyZWplY3Rpb24pXG4gICAgICAgICAgICAgICAgLy8gTm8gbmF0aXZlIHN1cHBvcnQgZm9yIFByb21pc2VSZWplY3Rpb25FdmVudCBidXQgdXNlciBoYXMgc2V0IHdpbmRvdy5vbnVuaGFuZGxlZHJlamVjdGlvbi4gTWFudWFsbHkgY2FsbCBpdC5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBfZ2xvYmFsLm9udW5oYW5kbGVkcmVqZWN0aW9uKGV2ZW50KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChfKSB7fVxuICAgICAgICB9XG4gICAgICAgIGlmICghZXZlbnQuZGVmYXVsdFByZXZlbnRlZCkge1xuICAgICAgICAgICAgLy8gQmFja3dhcmQgY29tcGF0aWJpbGl0eTogZmlyZSB0byBldmVudHMgcmVnaXN0ZXJlZCBhdCBQcm9taXNlLm9uLmVycm9yXG4gICAgICAgICAgICBQcm9taXNlLm9uLmVycm9yLmZpcmUoZXJyLCBwcm9taXNlKTtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHt9XG59XG5cbi8qICoqS0VFUCoqIFxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHdyYXBQcm9taXNlKFByb21pc2VDbGFzcykge1xyXG4gICAgdmFyIHByb3RvID0gUHJvbWlzZUNsYXNzLnByb3RvdHlwZTtcclxuICAgIHZhciBvcmlnVGhlbiA9IHByb3RvLnRoZW47XHJcbiAgICBcclxuICAgIHdyYXBwZXJzLmFkZCh7XHJcbiAgICAgICAgc25hcHNob3Q6ICgpID0+IHByb3RvLnRoZW4sXHJcbiAgICAgICAgcmVzdG9yZTogdmFsdWUgPT4ge3Byb3RvLnRoZW4gPSB2YWx1ZTt9LFxyXG4gICAgICAgIHdyYXA6ICgpID0+IHBhdGNoZWRUaGVuXHJcbiAgICB9KTtcclxuXHJcbiAgICBmdW5jdGlvbiBwYXRjaGVkVGhlbiAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcclxuICAgICAgICB2YXIgcHJvbWlzZSA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9uRnVsZmlsbGVkUHJveHkgPSB3cmFwKGZ1bmN0aW9uKHZhbHVlKXtcclxuICAgICAgICAgICAgdmFyIHJ2ID0gdmFsdWU7XHJcbiAgICAgICAgICAgIGlmIChvbkZ1bGZpbGxlZCkge1xyXG4gICAgICAgICAgICAgICAgcnYgPSBvbkZ1bGZpbGxlZChydik7XHJcbiAgICAgICAgICAgICAgICBpZiAocnYgJiYgdHlwZW9mIHJ2LnRoZW4gPT09ICdmdW5jdGlvbicpIHJ2LnRoZW4oKTsgLy8gSW50ZXJjZXB0IHRoYXQgcHJvbWlzZSBhcyB3ZWxsLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC0tUFNELnJlZiB8fCBQU0QuZmluYWxpemUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJ2O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBvblJlamVjdGVkUHJveHkgPSB3cmFwKGZ1bmN0aW9uKGVycil7XHJcbiAgICAgICAgICAgIHByb21pc2UuXyRlcnIgPSBlcnI7XHJcbiAgICAgICAgICAgIHZhciB1bmhhbmRsZWRzID0gUFNELnVuaGFuZGxlZHM7XHJcbiAgICAgICAgICAgIHZhciBpZHggPSB1bmhhbmRsZWRzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgIHJ2O1xyXG4gICAgICAgICAgICB3aGlsZSAoaWR4LS0pIGlmICh1bmhhbmRsZWRzW2lkeF0uXyRlcnIgPT09IGVycikgYnJlYWs7XHJcbiAgICAgICAgICAgIGlmIChvblJlamVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaWR4ICE9PSAtMSkgdW5oYW5kbGVkcy5zcGxpY2UoaWR4LCAxKTsgLy8gTWFyayBhcyBoYW5kbGVkLlxyXG4gICAgICAgICAgICAgICAgcnYgPSBvblJlamVjdGVkKGVycik7XHJcbiAgICAgICAgICAgICAgICBpZiAocnYgJiYgdHlwZW9mIHJ2LnRoZW4gPT09ICdmdW5jdGlvbicpIHJ2LnRoZW4oKTsgLy8gSW50ZXJjZXB0IHRoYXQgcHJvbWlzZSBhcyB3ZWxsLlxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlkeCA9PT0gLTEpIHVuaGFuZGxlZHMucHVzaChwcm9taXNlKTtcclxuICAgICAgICAgICAgICAgIHJ2ID0gUHJvbWlzZUNsYXNzLnJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgcnYuXyRub2ludGVyY2VwdCA9IHRydWU7IC8vIFByb2hpYml0IGV0ZXJuYWwgbG9vcC5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAtLVBTRC5yZWYgfHwgUFNELmZpbmFsaXplKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBydjtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy5fJG5vaW50ZXJjZXB0KSByZXR1cm4gb3JpZ1RoZW4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgICAgICArK1BTRC5yZWY7XHJcbiAgICAgICAgcmV0dXJuIG9yaWdUaGVuLmNhbGwodGhpcywgb25GdWxmaWxsZWRQcm94eSwgb25SZWplY3RlZFByb3h5KTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gR2xvYmFsIFByb21pc2Ugd3JhcHBlclxyXG5pZiAoX2dsb2JhbC5Qcm9taXNlKSB3cmFwUHJvbWlzZShfZ2xvYmFsLlByb21pc2UpO1xyXG5cclxuKi9cblxuZG9GYWtlQXV0b0NvbXBsZXRlKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBTaW1wbGlmeSB0aGUgam9iIGZvciBWUyBJbnRlbGxpc2Vuc2UuIFRoaXMgcGllY2Ugb2YgY29kZSBpcyBvbmUgb2YgdGhlIGtleXMgdG8gdGhlIG5ldyBtYXJ2ZWxsb3VzIGludGVsbGlzZW5zZSBzdXBwb3J0IGluIERleGllLlxuICAgIGFzYXAkMSA9IGZ1bmN0aW9uIChmbiwgYXJncykge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xuICAgICAgICB9LCAwKTtcbiAgICB9O1xufSk7XG5cbmZ1bmN0aW9uIHJlamVjdGlvbihlcnIsIHVuY2F1Z2h0SGFuZGxlcikge1xuICAgIC8vIEdldCB0aGUgY2FsbCBzdGFjayBhbmQgcmV0dXJuIGEgcmVqZWN0ZWQgcHJvbWlzZS5cbiAgICB2YXIgcnYgPSBQcm9taXNlLnJlamVjdChlcnIpO1xuICAgIHJldHVybiB1bmNhdWdodEhhbmRsZXIgPyBydi51bmNhdWdodCh1bmNhdWdodEhhbmRsZXIpIDogcnY7XG59XG5cbi8qXHJcbiAqIERleGllLmpzIC0gYSBtaW5pbWFsaXN0aWMgd3JhcHBlciBmb3IgSW5kZXhlZERCXHJcbiAqID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAqXHJcbiAqIEJ5IERhdmlkIEZhaGxhbmRlciwgZGF2aWQuZmFobGFuZGVyQGdtYWlsLmNvbVxyXG4gKlxyXG4gKiBWZXJzaW9uIDEuNS4xLCBUdWUgTm92IDAxIDIwMTZcclxuICpcclxuICogaHR0cDovL2RleGllLm9yZ1xyXG4gKlxyXG4gKiBBcGFjaGUgTGljZW5zZSBWZXJzaW9uIDIuMCwgSmFudWFyeSAyMDA0LCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvXHJcbiAqL1xuXG52YXIgREVYSUVfVkVSU0lPTiA9ICcxLjUuMSc7XG52YXIgbWF4U3RyaW5nID0gU3RyaW5nLmZyb21DaGFyQ29kZSg2NTUzNSk7XG52YXIgbWF4S2V5ID0gZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIElEQktleVJhbmdlLm9ubHkoW1tdXSk7cmV0dXJuIFtbXV07XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gbWF4U3RyaW5nO1xuICAgIH1cbn0oKTtcbnZhciBJTlZBTElEX0tFWV9BUkdVTUVOVCA9IFwiSW52YWxpZCBrZXkgcHJvdmlkZWQuIEtleXMgbXVzdCBiZSBvZiB0eXBlIHN0cmluZywgbnVtYmVyLCBEYXRlIG9yIEFycmF5PHN0cmluZyB8IG51bWJlciB8IERhdGU+LlwiO1xudmFyIFNUUklOR19FWFBFQ1RFRCA9IFwiU3RyaW5nIGV4cGVjdGVkLlwiO1xudmFyIGNvbm5lY3Rpb25zID0gW107XG52YXIgaXNJRU9yRWRnZSA9IHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIC8oTVNJRXxUcmlkZW50fEVkZ2UpLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xudmFyIGhhc0lFRGVsZXRlT2JqZWN0U3RvcmVCdWcgPSBpc0lFT3JFZGdlO1xudmFyIGhhbmdzT25EZWxldGVMYXJnZUtleVJhbmdlID0gaXNJRU9yRWRnZTtcbnZhciBkZXhpZVN0YWNrRnJhbWVGaWx0ZXIgPSBmdW5jdGlvbiAoZnJhbWUpIHtcbiAgICByZXR1cm4gIS8oZGV4aWVcXC5qc3xkZXhpZVxcLm1pblxcLmpzKS8udGVzdChmcmFtZSk7XG59O1xuXG5zZXREZWJ1ZyhkZWJ1ZywgZGV4aWVTdGFja0ZyYW1lRmlsdGVyKTtcblxuZnVuY3Rpb24gRGV4aWUoZGJOYW1lLCBvcHRpb25zKSB7XG4gICAgLy8vIDxwYXJhbSBuYW1lPVwib3B0aW9uc1wiIHR5cGU9XCJPYmplY3RcIiBvcHRpb25hbD1cInRydWVcIj5TcGVjaWZ5IG9ubHkgaWYgeW91IHdpY2ggdG8gY29udHJvbCB3aGljaCBhZGRvbnMgdGhhdCBzaG91bGQgcnVuIG9uIHRoaXMgaW5zdGFuY2U8L3BhcmFtPlxuICAgIHZhciBkZXBzID0gRGV4aWUuZGVwZW5kZW5jaWVzO1xuICAgIHZhciBvcHRzID0gZXh0ZW5kKHtcbiAgICAgICAgLy8gRGVmYXVsdCBPcHRpb25zXG4gICAgICAgIGFkZG9uczogRGV4aWUuYWRkb25zLCAvLyBQaWNrIHN0YXRpY2FsbHkgcmVnaXN0ZXJlZCBhZGRvbnMgYnkgZGVmYXVsdFxuICAgICAgICBhdXRvT3BlbjogdHJ1ZSwgLy8gRG9uJ3QgcmVxdWlyZSBkYi5vcGVuKCkgZXhwbGljaXRlbHkuXG4gICAgICAgIGluZGV4ZWREQjogZGVwcy5pbmRleGVkREIsIC8vIEJhY2tlbmQgSW5kZXhlZERCIGFwaS4gRGVmYXVsdCB0byBJREJTaGltIG9yIGJyb3dzZXIgZW52LlxuICAgICAgICBJREJLZXlSYW5nZTogZGVwcy5JREJLZXlSYW5nZSAvLyBCYWNrZW5kIElEQktleVJhbmdlIGFwaS4gRGVmYXVsdCB0byBJREJTaGltIG9yIGJyb3dzZXIgZW52LlxuICAgIH0sIG9wdGlvbnMpO1xuICAgIHZhciBhZGRvbnMgPSBvcHRzLmFkZG9ucyxcbiAgICAgICAgYXV0b09wZW4gPSBvcHRzLmF1dG9PcGVuLFxuICAgICAgICBpbmRleGVkREIgPSBvcHRzLmluZGV4ZWREQixcbiAgICAgICAgSURCS2V5UmFuZ2UgPSBvcHRzLklEQktleVJhbmdlO1xuXG4gICAgdmFyIGdsb2JhbFNjaGVtYSA9IHRoaXMuX2RiU2NoZW1hID0ge307XG4gICAgdmFyIHZlcnNpb25zID0gW107XG4gICAgdmFyIGRiU3RvcmVOYW1lcyA9IFtdO1xuICAgIHZhciBhbGxUYWJsZXMgPSB7fTtcbiAgICAvLy88dmFyIHR5cGU9XCJJREJEYXRhYmFzZVwiIC8+XG4gICAgdmFyIGlkYmRiID0gbnVsbDsgLy8gSW5zdGFuY2Ugb2YgSURCRGF0YWJhc2VcbiAgICB2YXIgZGJPcGVuRXJyb3IgPSBudWxsO1xuICAgIHZhciBpc0JlaW5nT3BlbmVkID0gZmFsc2U7XG4gICAgdmFyIG9wZW5Db21wbGV0ZSA9IGZhbHNlO1xuICAgIHZhciBSRUFET05MWSA9IFwicmVhZG9ubHlcIixcbiAgICAgICAgUkVBRFdSSVRFID0gXCJyZWFkd3JpdGVcIjtcbiAgICB2YXIgZGIgPSB0aGlzO1xuICAgIHZhciBkYlJlYWR5UmVzb2x2ZSxcbiAgICAgICAgZGJSZWFkeVByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgICAgICBkYlJlYWR5UmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgfSksXG4gICAgICAgIGNhbmNlbE9wZW4sXG4gICAgICAgIG9wZW5DYW5jZWxsZXIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAoXywgcmVqZWN0KSB7XG4gICAgICAgIGNhbmNlbE9wZW4gPSByZWplY3Q7XG4gICAgfSk7XG4gICAgdmFyIGF1dG9TY2hlbWEgPSB0cnVlO1xuICAgIHZhciBoYXNOYXRpdmVHZXREYXRhYmFzZU5hbWVzID0gISFnZXROYXRpdmVHZXREYXRhYmFzZU5hbWVzRm4oaW5kZXhlZERCKSxcbiAgICAgICAgaGFzR2V0QWxsO1xuXG4gICAgZnVuY3Rpb24gaW5pdCgpIHtcbiAgICAgICAgLy8gRGVmYXVsdCBzdWJzY3JpYmVycyB0byBcInZlcnNpb25jaGFuZ2VcIiBhbmQgXCJibG9ja2VkXCIuXG4gICAgICAgIC8vIENhbiBiZSBvdmVycmlkZGVuIGJ5IGN1c3RvbSBoYW5kbGVycy4gSWYgY3VzdG9tIGhhbmRsZXJzIHJldHVybiBmYWxzZSwgdGhlc2UgZGVmYXVsdFxuICAgICAgICAvLyBiZWhhdmlvdXJzIHdpbGwgYmUgcHJldmVudGVkLlxuICAgICAgICBkYi5vbihcInZlcnNpb25jaGFuZ2VcIiwgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAvLyBEZWZhdWx0IGJlaGF2aW9yIGZvciB2ZXJzaW9uY2hhbmdlIGV2ZW50IGlzIHRvIGNsb3NlIGRhdGFiYXNlIGNvbm5lY3Rpb24uXG4gICAgICAgICAgICAvLyBDYWxsZXIgY2FuIG92ZXJyaWRlIHRoaXMgYmVoYXZpb3IgYnkgZG9pbmcgZGIub24oXCJ2ZXJzaW9uY2hhbmdlXCIsIGZ1bmN0aW9uKCl7IHJldHVybiBmYWxzZTsgfSk7XG4gICAgICAgICAgICAvLyBMZXQncyBub3QgYmxvY2sgdGhlIG90aGVyIHdpbmRvdyBmcm9tIG1ha2luZyBpdCdzIGRlbGV0ZSgpIG9yIG9wZW4oKSBjYWxsLlxuICAgICAgICAgICAgLy8gTk9URSEgVGhpcyBldmVudCBpcyBuZXZlciBmaXJlZCBpbiBJRSxFZGdlIG9yIFNhZmFyaS5cbiAgICAgICAgICAgIGlmIChldi5uZXdWZXJzaW9uID4gMCkgY29uc29sZS53YXJuKCdBbm90aGVyIGNvbm5lY3Rpb24gd2FudHMgdG8gdXBncmFkZSBkYXRhYmFzZSBcXCcnICsgZGIubmFtZSArICdcXCcuIENsb3NpbmcgZGIgbm93IHRvIHJlc3VtZSB0aGUgdXBncmFkZS4nKTtlbHNlIGNvbnNvbGUud2FybignQW5vdGhlciBjb25uZWN0aW9uIHdhbnRzIHRvIGRlbGV0ZSBkYXRhYmFzZSBcXCcnICsgZGIubmFtZSArICdcXCcuIENsb3NpbmcgZGIgbm93IHRvIHJlc3VtZSB0aGUgZGVsZXRlIHJlcXVlc3QuJyk7XG4gICAgICAgICAgICBkYi5jbG9zZSgpO1xuICAgICAgICAgICAgLy8gSW4gbWFueSB3ZWIgYXBwbGljYXRpb25zLCBpdCB3b3VsZCBiZSByZWNvbW1lbmRlZCB0byBmb3JjZSB3aW5kb3cucmVsb2FkKClcbiAgICAgICAgICAgIC8vIHdoZW4gdGhpcyBldmVudCBvY2N1cnMuIFRvIGRvIHRoYXQsIHN1YnNjcmliZSB0byB0aGUgdmVyc2lvbmNoYW5nZSBldmVudFxuICAgICAgICAgICAgLy8gYW5kIGNhbGwgd2luZG93LmxvY2F0aW9uLnJlbG9hZCh0cnVlKSBpZiBldi5uZXdWZXJzaW9uID4gMCAobm90IGEgZGVsZXRpb24pXG4gICAgICAgICAgICAvLyBUaGUgcmVhc29uIGZvciB0aGlzIGlzIHRoYXQgeW91ciBjdXJyZW50IHdlYiBhcHAgb2J2aW91c2x5IGhhcyBvbGQgc2NoZW1hIGNvZGUgdGhhdCBuZWVkc1xuICAgICAgICAgICAgLy8gdG8gYmUgdXBkYXRlZC4gQW5vdGhlciB3aW5kb3cgZ290IGEgbmV3ZXIgdmVyc2lvbiBvZiB0aGUgYXBwIGFuZCBuZWVkcyB0byB1cGdyYWRlIERCIGJ1dFxuICAgICAgICAgICAgLy8geW91ciB3aW5kb3cgaXMgYmxvY2tpbmcgaXQgdW5sZXNzIHdlIGNsb3NlIGl0IGhlcmUuXG4gICAgICAgIH0pO1xuICAgICAgICBkYi5vbihcImJsb2NrZWRcIiwgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICBpZiAoIWV2Lm5ld1ZlcnNpb24gfHwgZXYubmV3VmVyc2lvbiA8IGV2Lm9sZFZlcnNpb24pIGNvbnNvbGUud2FybignRGV4aWUuZGVsZXRlKFxcJycgKyBkYi5uYW1lICsgJ1xcJykgd2FzIGJsb2NrZWQnKTtlbHNlIGNvbnNvbGUud2FybignVXBncmFkZSBcXCcnICsgZGIubmFtZSArICdcXCcgYmxvY2tlZCBieSBvdGhlciBjb25uZWN0aW9uIGhvbGRpbmcgdmVyc2lvbiAnICsgZXYub2xkVmVyc2lvbiAvIDEwKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBWZXJzaW9uaW5nIEZyYW1ld29yay0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuXG4gICAgdGhpcy52ZXJzaW9uID0gZnVuY3Rpb24gKHZlcnNpb25OdW1iZXIpIHtcbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwidmVyc2lvbk51bWJlclwiIHR5cGU9XCJOdW1iZXJcIj48L3BhcmFtPlxuICAgICAgICAvLy8gPHJldHVybnMgdHlwZT1cIlZlcnNpb25cIj48L3JldHVybnM+XG4gICAgICAgIGlmIChpZGJkYiB8fCBpc0JlaW5nT3BlbmVkKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5TY2hlbWEoXCJDYW5ub3QgYWRkIHZlcnNpb24gd2hlbiBkYXRhYmFzZSBpcyBvcGVuXCIpO1xuICAgICAgICB0aGlzLnZlcm5vID0gTWF0aC5tYXgodGhpcy52ZXJubywgdmVyc2lvbk51bWJlcik7XG4gICAgICAgIHZhciB2ZXJzaW9uSW5zdGFuY2UgPSB2ZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2Ll9jZmcudmVyc2lvbiA9PT0gdmVyc2lvbk51bWJlcjtcbiAgICAgICAgfSlbMF07XG4gICAgICAgIGlmICh2ZXJzaW9uSW5zdGFuY2UpIHJldHVybiB2ZXJzaW9uSW5zdGFuY2U7XG4gICAgICAgIHZlcnNpb25JbnN0YW5jZSA9IG5ldyBWZXJzaW9uKHZlcnNpb25OdW1iZXIpO1xuICAgICAgICB2ZXJzaW9ucy5wdXNoKHZlcnNpb25JbnN0YW5jZSk7XG4gICAgICAgIHZlcnNpb25zLnNvcnQobG93ZXJWZXJzaW9uRmlyc3QpO1xuICAgICAgICByZXR1cm4gdmVyc2lvbkluc3RhbmNlO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBWZXJzaW9uKHZlcnNpb25OdW1iZXIpIHtcbiAgICAgICAgdGhpcy5fY2ZnID0ge1xuICAgICAgICAgICAgdmVyc2lvbjogdmVyc2lvbk51bWJlcixcbiAgICAgICAgICAgIHN0b3Jlc1NvdXJjZTogbnVsbCxcbiAgICAgICAgICAgIGRic2NoZW1hOiB7fSxcbiAgICAgICAgICAgIHRhYmxlczoge30sXG4gICAgICAgICAgICBjb250ZW50VXBncmFkZTogbnVsbFxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnN0b3Jlcyh7fSk7IC8vIERlcml2ZSBlYXJsaWVyIHNjaGVtYXMgYnkgZGVmYXVsdC5cbiAgICB9XG5cbiAgICBleHRlbmQoVmVyc2lvbi5wcm90b3R5cGUsIHtcbiAgICAgICAgc3RvcmVzOiBmdW5jdGlvbiAoc3RvcmVzKSB7XG4gICAgICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgICAgICAvLy8gICBEZWZpbmVzIHRoZSBzY2hlbWEgZm9yIGEgcGFydGljdWxhciB2ZXJzaW9uXG4gICAgICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic3RvcmVzXCIgdHlwZT1cIk9iamVjdFwiPlxuICAgICAgICAgICAgLy8vIEV4YW1wbGU6IDxici8+XG4gICAgICAgICAgICAvLy8gICB7dXNlcnM6IFwiaWQrKyxmaXJzdCxsYXN0LCZhbXA7dXNlcm5hbWUsKmVtYWlsXCIsIDxici8+XG4gICAgICAgICAgICAvLy8gICBwYXNzd29yZHM6IFwiaWQrKywmYW1wO3VzZXJuYW1lXCJ9PGJyLz5cbiAgICAgICAgICAgIC8vLyA8YnIvPlxuICAgICAgICAgICAgLy8vIFN5bnRheDoge1RhYmxlOiBcIltwcmltYXJ5S2V5XVsrK10sWyZhbXA7XVsqXWluZGV4MSxbJmFtcDtdWypdaW5kZXgyLC4uLlwifTxici8+PGJyLz5cbiAgICAgICAgICAgIC8vLyBTcGVjaWFsIGNoYXJhY3RlcnM6PGJyLz5cbiAgICAgICAgICAgIC8vLyAgXCImYW1wO1wiICBtZWFucyB1bmlxdWUga2V5LCA8YnIvPlxuICAgICAgICAgICAgLy8vICBcIipcIiAgbWVhbnMgdmFsdWUgaXMgbXVsdGlFbnRyeSwgPGJyLz5cbiAgICAgICAgICAgIC8vLyAgXCIrK1wiIG1lYW5zIGF1dG8taW5jcmVtZW50IGFuZCBvbmx5IGFwcGxpY2FibGUgZm9yIHByaW1hcnkga2V5IDxici8+XG4gICAgICAgICAgICAvLy8gPC9wYXJhbT5cbiAgICAgICAgICAgIHRoaXMuX2NmZy5zdG9yZXNTb3VyY2UgPSB0aGlzLl9jZmcuc3RvcmVzU291cmNlID8gZXh0ZW5kKHRoaXMuX2NmZy5zdG9yZXNTb3VyY2UsIHN0b3JlcykgOiBzdG9yZXM7XG5cbiAgICAgICAgICAgIC8vIERlcml2ZSBzdG9yZXMgZnJvbSBlYXJsaWVyIHZlcnNpb25zIGlmIHRoZXkgYXJlIG5vdCBleHBsaWNpdGVseSBzcGVjaWZpZWQgYXMgbnVsbCBvciBhIG5ldyBzeW50YXguXG4gICAgICAgICAgICB2YXIgc3RvcmVzU3BlYyA9IHt9O1xuICAgICAgICAgICAgdmVyc2lvbnMuZm9yRWFjaChmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgICAgICAgICAgIC8vICd2ZXJzaW9ucycgaXMgYWx3YXlzIHNvcnRlZCBieSBsb3dlc3QgdmVyc2lvbiBmaXJzdC5cbiAgICAgICAgICAgICAgICBleHRlbmQoc3RvcmVzU3BlYywgdmVyc2lvbi5fY2ZnLnN0b3Jlc1NvdXJjZSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgdmFyIGRic2NoZW1hID0gdGhpcy5fY2ZnLmRic2NoZW1hID0ge307XG4gICAgICAgICAgICB0aGlzLl9wYXJzZVN0b3Jlc1NwZWMoc3RvcmVzU3BlYywgZGJzY2hlbWEpO1xuICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBsYXRlc3Qgc2NoZW1hIHRvIHRoaXMgdmVyc2lvblxuICAgICAgICAgICAgLy8gVXBkYXRlIEFQSVxuICAgICAgICAgICAgZ2xvYmFsU2NoZW1hID0gZGIuX2RiU2NoZW1hID0gZGJzY2hlbWE7XG4gICAgICAgICAgICByZW1vdmVUYWJsZXNBcGkoW2FsbFRhYmxlcywgZGIsIFRyYW5zYWN0aW9uLnByb3RvdHlwZV0pO1xuICAgICAgICAgICAgc2V0QXBpT25QbGFjZShbYWxsVGFibGVzLCBkYiwgVHJhbnNhY3Rpb24ucHJvdG90eXBlLCB0aGlzLl9jZmcudGFibGVzXSwga2V5cyhkYnNjaGVtYSksIFJFQURXUklURSwgZGJzY2hlbWEpO1xuICAgICAgICAgICAgZGJTdG9yZU5hbWVzID0ga2V5cyhkYnNjaGVtYSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcbiAgICAgICAgdXBncmFkZTogZnVuY3Rpb24gKHVwZ3JhZGVGdW5jdGlvbikge1xuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwidXBncmFkZUZ1bmN0aW9uXCIgb3B0aW9uYWw9XCJ0cnVlXCI+RnVuY3Rpb24gdGhhdCBwZXJmb3JtcyB1cGdyYWRpbmcgYWN0aW9ucy48L3BhcmFtPlxuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgZmFrZUF1dG9Db21wbGV0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdXBncmFkZUZ1bmN0aW9uKGRiLl9jcmVhdGVUcmFuc2FjdGlvbihSRUFEV1JJVEUsIGtleXMoc2VsZi5fY2ZnLmRic2NoZW1hKSwgc2VsZi5fY2ZnLmRic2NoZW1hKSk7IC8vIEJVR0JVRzogTm8gY29kZSBjb21wbGV0aW9uIGZvciBwcmV2IHZlcnNpb24ncyB0YWJsZXMgd29udCBhcHBlYXIuXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHRoaXMuX2NmZy5jb250ZW50VXBncmFkZSA9IHVwZ3JhZGVGdW5jdGlvbjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuICAgICAgICBfcGFyc2VTdG9yZXNTcGVjOiBmdW5jdGlvbiAoc3RvcmVzLCBvdXRTY2hlbWEpIHtcbiAgICAgICAgICAgIGtleXMoc3RvcmVzKS5mb3JFYWNoKGZ1bmN0aW9uICh0YWJsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RvcmVzW3RhYmxlTmFtZV0gIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlVGVtcGxhdGUgPSB7fTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ZXMgPSBwYXJzZUluZGV4U3ludGF4KHN0b3Jlc1t0YWJsZU5hbWVdKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByaW1LZXkgPSBpbmRleGVzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmltS2V5Lm11bHRpKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5TY2hlbWEoXCJQcmltYXJ5IGtleSBjYW5ub3QgYmUgbXVsdGktdmFsdWVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocHJpbUtleS5rZXlQYXRoKSBzZXRCeUtleVBhdGgoaW5zdGFuY2VUZW1wbGF0ZSwgcHJpbUtleS5rZXlQYXRoLCBwcmltS2V5LmF1dG8gPyAwIDogcHJpbUtleS5rZXlQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXhlcy5mb3JFYWNoKGZ1bmN0aW9uIChpZHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZHguYXV0bykgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuU2NoZW1hKFwiT25seSBwcmltYXJ5IGtleSBjYW4gYmUgbWFya2VkIGFzIGF1dG9JbmNyZW1lbnQgKCsrKVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaWR4LmtleVBhdGgpIHRocm93IG5ldyBleGNlcHRpb25zLlNjaGVtYShcIkluZGV4IG11c3QgaGF2ZSBhIG5hbWUgYW5kIGNhbm5vdCBiZSBhbiBlbXB0eSBzdHJpbmdcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRCeUtleVBhdGgoaW5zdGFuY2VUZW1wbGF0ZSwgaWR4LmtleVBhdGgsIGlkeC5jb21wb3VuZCA/IGlkeC5rZXlQYXRoLm1hcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSA6IFwiXCIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgb3V0U2NoZW1hW3RhYmxlTmFtZV0gPSBuZXcgVGFibGVTY2hlbWEodGFibGVOYW1lLCBwcmltS2V5LCBpbmRleGVzLCBpbnN0YW5jZVRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gcnVuVXBncmFkZXJzKG9sZFZlcnNpb24sIGlkYnRyYW5zLCByZWplY3QpIHtcbiAgICAgICAgdmFyIHRyYW5zID0gZGIuX2NyZWF0ZVRyYW5zYWN0aW9uKFJFQURXUklURSwgZGJTdG9yZU5hbWVzLCBnbG9iYWxTY2hlbWEpO1xuICAgICAgICB0cmFucy5jcmVhdGUoaWRidHJhbnMpO1xuICAgICAgICB0cmFucy5fY29tcGxldGlvbi5jYXRjaChyZWplY3QpO1xuICAgICAgICB2YXIgcmVqZWN0VHJhbnNhY3Rpb24gPSB0cmFucy5fcmVqZWN0LmJpbmQodHJhbnMpO1xuICAgICAgICBuZXdTY29wZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBQU0QudHJhbnMgPSB0cmFucztcbiAgICAgICAgICAgIGlmIChvbGRWZXJzaW9uID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIHRhYmxlczpcbiAgICAgICAgICAgICAgICBrZXlzKGdsb2JhbFNjaGVtYSkuZm9yRWFjaChmdW5jdGlvbiAodGFibGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVRhYmxlKGlkYnRyYW5zLCB0YWJsZU5hbWUsIGdsb2JhbFNjaGVtYVt0YWJsZU5hbWVdLnByaW1LZXksIGdsb2JhbFNjaGVtYVt0YWJsZU5hbWVdLmluZGV4ZXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFByb21pc2UuZm9sbG93KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRiLm9uLnBvcHVsYXRlLmZpcmUodHJhbnMpO1xuICAgICAgICAgICAgICAgIH0pLmNhdGNoKHJlamVjdFRyYW5zYWN0aW9uKTtcbiAgICAgICAgICAgIH0gZWxzZSB1cGRhdGVUYWJsZXNBbmRJbmRleGVzKG9sZFZlcnNpb24sIHRyYW5zLCBpZGJ0cmFucykuY2F0Y2gocmVqZWN0VHJhbnNhY3Rpb24pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVUYWJsZXNBbmRJbmRleGVzKG9sZFZlcnNpb24sIHRyYW5zLCBpZGJ0cmFucykge1xuICAgICAgICAvLyBVcGdyYWRlIHZlcnNpb24gdG8gdmVyc2lvbiwgc3RlcC1ieS1zdGVwIGZyb20gb2xkZXN0IHRvIG5ld2VzdCB2ZXJzaW9uLlxuICAgICAgICAvLyBFYWNoIHRyYW5zYWN0aW9uIG9iamVjdCB3aWxsIGNvbnRhaW4gdGhlIHRhYmxlIHNldCB0aGF0IHdhcyBjdXJyZW50IGluIHRoYXQgdmVyc2lvbiAoYnV0IGFsc28gbm90LXlldC1kZWxldGVkIHRhYmxlcyBmcm9tIGl0cyBwcmV2aW91cyB2ZXJzaW9uKVxuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgdmFyIG9sZFZlcnNpb25TdHJ1Y3QgPSB2ZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24gKHZlcnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB2ZXJzaW9uLl9jZmcudmVyc2lvbiA9PT0gb2xkVmVyc2lvbjtcbiAgICAgICAgfSlbMF07XG4gICAgICAgIGlmICghb2xkVmVyc2lvblN0cnVjdCkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuVXBncmFkZShcIkRleGllIHNwZWNpZmljYXRpb24gb2YgY3VycmVudGx5IGluc3RhbGxlZCBEQiB2ZXJzaW9uIGlzIG1pc3NpbmdcIik7XG4gICAgICAgIGdsb2JhbFNjaGVtYSA9IGRiLl9kYlNjaGVtYSA9IG9sZFZlcnNpb25TdHJ1Y3QuX2NmZy5kYnNjaGVtYTtcbiAgICAgICAgdmFyIGFueUNvbnRlbnRVcGdyYWRlckhhc1J1biA9IGZhbHNlO1xuXG4gICAgICAgIHZhciB2ZXJzVG9SdW4gPSB2ZXJzaW9ucy5maWx0ZXIoZnVuY3Rpb24gKHYpIHtcbiAgICAgICAgICAgIHJldHVybiB2Ll9jZmcudmVyc2lvbiA+IG9sZFZlcnNpb247XG4gICAgICAgIH0pO1xuICAgICAgICB2ZXJzVG9SdW4uZm9yRWFjaChmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwidmVyc2lvblwiIHR5cGU9XCJWZXJzaW9uXCI+PC9wYXJhbT5cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBvbGRTY2hlbWEgPSBnbG9iYWxTY2hlbWE7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1NjaGVtYSA9IHZlcnNpb24uX2NmZy5kYnNjaGVtYTtcbiAgICAgICAgICAgICAgICBhZGp1c3RUb0V4aXN0aW5nSW5kZXhOYW1lcyhvbGRTY2hlbWEsIGlkYnRyYW5zKTtcbiAgICAgICAgICAgICAgICBhZGp1c3RUb0V4aXN0aW5nSW5kZXhOYW1lcyhuZXdTY2hlbWEsIGlkYnRyYW5zKTtcbiAgICAgICAgICAgICAgICBnbG9iYWxTY2hlbWEgPSBkYi5fZGJTY2hlbWEgPSBuZXdTY2hlbWE7XG4gICAgICAgICAgICAgICAgdmFyIGRpZmYgPSBnZXRTY2hlbWFEaWZmKG9sZFNjaGVtYSwgbmV3U2NoZW1hKTtcbiAgICAgICAgICAgICAgICAvLyBBZGQgdGFibGVzICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkaWZmLmFkZC5mb3JFYWNoKGZ1bmN0aW9uICh0dXBsZSkge1xuICAgICAgICAgICAgICAgICAgICBjcmVhdGVUYWJsZShpZGJ0cmFucywgdHVwbGVbMF0sIHR1cGxlWzFdLnByaW1LZXksIHR1cGxlWzFdLmluZGV4ZXMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIENoYW5nZSB0YWJsZXNcbiAgICAgICAgICAgICAgICBkaWZmLmNoYW5nZS5mb3JFYWNoKGZ1bmN0aW9uIChjaGFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYW5nZS5yZWNyZWF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuVXBncmFkZShcIk5vdCB5ZXQgc3VwcG9ydCBmb3IgY2hhbmdpbmcgcHJpbWFyeSBrZXlcIik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3RvcmUgPSBpZGJ0cmFucy5vYmplY3RTdG9yZShjaGFuZ2UubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBZGQgaW5kZXhlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlLmFkZC5mb3JFYWNoKGZ1bmN0aW9uIChpZHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRJbmRleChzdG9yZSwgaWR4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGluZGV4ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoYW5nZS5jaGFuZ2UuZm9yRWFjaChmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuZGVsZXRlSW5kZXgoaWR4Lm5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEluZGV4KHN0b3JlLCBpZHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBEZWxldGUgaW5kZXhlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlLmRlbC5mb3JFYWNoKGZ1bmN0aW9uIChpZHhOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcmUuZGVsZXRlSW5kZXgoaWR4TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmICh2ZXJzaW9uLl9jZmcuY29udGVudFVwZ3JhZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgYW55Q29udGVudFVwZ3JhZGVySGFzUnVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuZm9sbG93KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb24uX2NmZy5jb250ZW50VXBncmFkZSh0cmFucyk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcXVldWUucHVzaChmdW5jdGlvbiAoaWRidHJhbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWFueUNvbnRlbnRVcGdyYWRlckhhc1J1biB8fCAhaGFzSUVEZWxldGVPYmplY3RTdG9yZUJ1Zykge1xuICAgICAgICAgICAgICAgICAgICAvLyBEb250IGRlbGV0ZSBvbGQgdGFibGVzIGlmIGllQnVnIGlzIHByZXNlbnQgYW5kIGEgY29udGVudCB1cGdyYWRlciBoYXMgcnVuLiBMZXQgdGFibGVzIGJlIGxlZnQgaW4gREIgc28gZmFyLiBUaGlzIG5lZWRzIHRvIGJlIHRha2VuIGNhcmUgb2YuXG4gICAgICAgICAgICAgICAgICAgIHZhciBuZXdTY2hlbWEgPSB2ZXJzaW9uLl9jZmcuZGJzY2hlbWE7XG4gICAgICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBvbGQgdGFibGVzXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVJlbW92ZWRUYWJsZXMobmV3U2NoZW1hLCBpZGJ0cmFucyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE5vdywgY3JlYXRlIGEgcXVldWUgZXhlY3V0aW9uIGVuZ2luZVxuICAgICAgICBmdW5jdGlvbiBydW5RdWV1ZSgpIHtcbiAgICAgICAgICAgIHJldHVybiBxdWV1ZS5sZW5ndGggPyBQcm9taXNlLnJlc29sdmUocXVldWUuc2hpZnQoKSh0cmFucy5pZGJ0cmFucykpLnRoZW4ocnVuUXVldWUpIDogUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcnVuUXVldWUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNyZWF0ZU1pc3NpbmdUYWJsZXMoZ2xvYmFsU2NoZW1hLCBpZGJ0cmFucyk7IC8vIEF0IGxhc3QsIG1ha2Ugc3VyZSB0byBjcmVhdGUgYW55IG1pc3NpbmcgdGFibGVzLiAoTmVlZGVkIGJ5IGFkZG9ucyB0aGF0IGFkZCBzdG9yZXMgdG8gREIgd2l0aG91dCBzcGVjaWZ5aW5nIHZlcnNpb24pXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNjaGVtYURpZmYob2xkU2NoZW1hLCBuZXdTY2hlbWEpIHtcbiAgICAgICAgdmFyIGRpZmYgPSB7XG4gICAgICAgICAgICBkZWw6IFtdLCAvLyBBcnJheSBvZiB0YWJsZSBuYW1lc1xuICAgICAgICAgICAgYWRkOiBbXSwgLy8gQXJyYXkgb2YgW3RhYmxlTmFtZSwgbmV3RGVmaW5pdGlvbl1cbiAgICAgICAgICAgIGNoYW5nZTogW10gLy8gQXJyYXkgb2Yge25hbWU6IHRhYmxlTmFtZSwgcmVjcmVhdGU6IG5ld0RlZmluaXRpb24sIGRlbDogZGVsSW5kZXhOYW1lcywgYWRkOiBuZXdJbmRleERlZnMsIGNoYW5nZTogY2hhbmdlZEluZGV4RGVmc31cbiAgICAgICAgfTtcbiAgICAgICAgZm9yICh2YXIgdGFibGUgaW4gb2xkU2NoZW1hKSB7XG4gICAgICAgICAgICBpZiAoIW5ld1NjaGVtYVt0YWJsZV0pIGRpZmYuZGVsLnB1c2godGFibGUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodGFibGUgaW4gbmV3U2NoZW1hKSB7XG4gICAgICAgICAgICB2YXIgb2xkRGVmID0gb2xkU2NoZW1hW3RhYmxlXSxcbiAgICAgICAgICAgICAgICBuZXdEZWYgPSBuZXdTY2hlbWFbdGFibGVdO1xuICAgICAgICAgICAgaWYgKCFvbGREZWYpIHtcbiAgICAgICAgICAgICAgICBkaWZmLmFkZC5wdXNoKFt0YWJsZSwgbmV3RGVmXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBjaGFuZ2UgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRhYmxlLFxuICAgICAgICAgICAgICAgICAgICBkZWY6IG5ld0RlZixcbiAgICAgICAgICAgICAgICAgICAgcmVjcmVhdGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBkZWw6IFtdLFxuICAgICAgICAgICAgICAgICAgICBhZGQ6IFtdLFxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2U6IFtdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAob2xkRGVmLnByaW1LZXkuc3JjICE9PSBuZXdEZWYucHJpbUtleS5zcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUHJpbWFyeSBrZXkgaGFzIGNoYW5nZWQuIFJlbW92ZSBhbmQgcmUtYWRkIHRhYmxlLlxuICAgICAgICAgICAgICAgICAgICBjaGFuZ2UucmVjcmVhdGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBkaWZmLmNoYW5nZS5wdXNoKGNoYW5nZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FtZSBwcmltYXJ5IGtleS4gSnVzdCBmaW5kIG91dCB3aGF0IGRpZmZlcnM6XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRJbmRleGVzID0gb2xkRGVmLmlkeEJ5TmFtZTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0luZGV4ZXMgPSBuZXdEZWYuaWR4QnlOYW1lO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpZHhOYW1lIGluIG9sZEluZGV4ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghbmV3SW5kZXhlc1tpZHhOYW1lXSkgY2hhbmdlLmRlbC5wdXNoKGlkeE5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAoaWR4TmFtZSBpbiBuZXdJbmRleGVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2xkSWR4ID0gb2xkSW5kZXhlc1tpZHhOYW1lXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJZHggPSBuZXdJbmRleGVzW2lkeE5hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFvbGRJZHgpIGNoYW5nZS5hZGQucHVzaChuZXdJZHgpO2Vsc2UgaWYgKG9sZElkeC5zcmMgIT09IG5ld0lkeC5zcmMpIGNoYW5nZS5jaGFuZ2UucHVzaChuZXdJZHgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGFuZ2UuZGVsLmxlbmd0aCA+IDAgfHwgY2hhbmdlLmFkZC5sZW5ndGggPiAwIHx8IGNoYW5nZS5jaGFuZ2UubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlmZi5jaGFuZ2UucHVzaChjaGFuZ2UpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkaWZmO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNyZWF0ZVRhYmxlKGlkYnRyYW5zLCB0YWJsZU5hbWUsIHByaW1LZXksIGluZGV4ZXMpIHtcbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwiaWRidHJhbnNcIiB0eXBlPVwiSURCVHJhbnNhY3Rpb25cIj48L3BhcmFtPlxuICAgICAgICB2YXIgc3RvcmUgPSBpZGJ0cmFucy5kYi5jcmVhdGVPYmplY3RTdG9yZSh0YWJsZU5hbWUsIHByaW1LZXkua2V5UGF0aCA/IHsga2V5UGF0aDogcHJpbUtleS5rZXlQYXRoLCBhdXRvSW5jcmVtZW50OiBwcmltS2V5LmF1dG8gfSA6IHsgYXV0b0luY3JlbWVudDogcHJpbUtleS5hdXRvIH0pO1xuICAgICAgICBpbmRleGVzLmZvckVhY2goZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICAgICAgYWRkSW5kZXgoc3RvcmUsIGlkeCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc3RvcmU7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlTWlzc2luZ1RhYmxlcyhuZXdTY2hlbWEsIGlkYnRyYW5zKSB7XG4gICAgICAgIGtleXMobmV3U2NoZW1hKS5mb3JFYWNoKGZ1bmN0aW9uICh0YWJsZU5hbWUpIHtcbiAgICAgICAgICAgIGlmICghaWRidHJhbnMuZGIub2JqZWN0U3RvcmVOYW1lcy5jb250YWlucyh0YWJsZU5hbWUpKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlVGFibGUoaWRidHJhbnMsIHRhYmxlTmFtZSwgbmV3U2NoZW1hW3RhYmxlTmFtZV0ucHJpbUtleSwgbmV3U2NoZW1hW3RhYmxlTmFtZV0uaW5kZXhlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlbGV0ZVJlbW92ZWRUYWJsZXMobmV3U2NoZW1hLCBpZGJ0cmFucykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlkYnRyYW5zLmRiLm9iamVjdFN0b3JlTmFtZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBzdG9yZU5hbWUgPSBpZGJ0cmFucy5kYi5vYmplY3RTdG9yZU5hbWVzW2ldO1xuICAgICAgICAgICAgaWYgKG5ld1NjaGVtYVtzdG9yZU5hbWVdID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZGJ0cmFucy5kYi5kZWxldGVPYmplY3RTdG9yZShzdG9yZU5hbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkSW5kZXgoc3RvcmUsIGlkeCkge1xuICAgICAgICBzdG9yZS5jcmVhdGVJbmRleChpZHgubmFtZSwgaWR4LmtleVBhdGgsIHsgdW5pcXVlOiBpZHgudW5pcXVlLCBtdWx0aUVudHJ5OiBpZHgubXVsdGkgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGJVbmNhdWdodChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGRiLm9uLmVycm9yLmZpcmUoZXJyKTtcbiAgICB9XG5cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gICAgICBEZXhpZSBQcm90ZWN0ZWQgQVBJXG4gICAgLy9cbiAgICAvL1xuXG4gICAgdGhpcy5fYWxsVGFibGVzID0gYWxsVGFibGVzO1xuXG4gICAgdGhpcy5fdGFibGVGYWN0b3J5ID0gZnVuY3Rpb24gY3JlYXRlVGFibGUobW9kZSwgdGFibGVTY2hlbWEpIHtcbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwidGFibGVTY2hlbWFcIiB0eXBlPVwiVGFibGVTY2hlbWFcIj48L3BhcmFtPlxuICAgICAgICBpZiAobW9kZSA9PT0gUkVBRE9OTFkpIHJldHVybiBuZXcgVGFibGUodGFibGVTY2hlbWEubmFtZSwgdGFibGVTY2hlbWEsIENvbGxlY3Rpb24pO2Vsc2UgcmV0dXJuIG5ldyBXcml0ZWFibGVUYWJsZSh0YWJsZVNjaGVtYS5uYW1lLCB0YWJsZVNjaGVtYSk7XG4gICAgfTtcblxuICAgIHRoaXMuX2NyZWF0ZVRyYW5zYWN0aW9uID0gZnVuY3Rpb24gKG1vZGUsIHN0b3JlTmFtZXMsIGRic2NoZW1hLCBwYXJlbnRUcmFuc2FjdGlvbikge1xuICAgICAgICByZXR1cm4gbmV3IFRyYW5zYWN0aW9uKG1vZGUsIHN0b3JlTmFtZXMsIGRic2NoZW1hLCBwYXJlbnRUcmFuc2FjdGlvbik7XG4gICAgfTtcblxuICAgIC8qIEdlbmVyYXRlIGEgdGVtcG9yYXJ5IHRyYW5zYWN0aW9uIHdoZW4gZGIgb3BlcmF0aW9ucyBhcmUgZG9uZSBvdXRzaWRlIGEgdHJhbnNhY3Rpbm8gc2NvcGUuXHJcbiAgICAqL1xuICAgIGZ1bmN0aW9uIHRlbXBUcmFuc2FjdGlvbihtb2RlLCBzdG9yZU5hbWVzLCBmbikge1xuICAgICAgICAvLyBMYXN0IGFyZ3VtZW50IGlzIFwid3JpdGVMb2NrZWRcIi4gQnV0IHRoaXMgZG9lc250IGFwcGx5IHRvIG9uZXNob3QgZGlyZWN0IGRiIG9wZXJhdGlvbnMsIHNvIHdlIGlnbm9yZSBpdC5cbiAgICAgICAgaWYgKCFvcGVuQ29tcGxldGUgJiYgIVBTRC5sZXRUaHJvdWdoKSB7XG4gICAgICAgICAgICBpZiAoIWlzQmVpbmdPcGVuZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWF1dG9PcGVuKSByZXR1cm4gcmVqZWN0aW9uKG5ldyBleGNlcHRpb25zLkRhdGFiYXNlQ2xvc2VkKCksIGRiVW5jYXVnaHQpO1xuICAgICAgICAgICAgICAgIGRiLm9wZW4oKS5jYXRjaChub3ApOyAvLyBPcGVuIGluIGJhY2tncm91bmQuIElmIGlmIGZhaWxzLCBpdCB3aWxsIGJlIGNhdGNoZWQgYnkgdGhlIGZpbmFsIHByb21pc2UgYW55d2F5LlxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRiUmVhZHlQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0ZW1wVHJhbnNhY3Rpb24obW9kZSwgc3RvcmVOYW1lcywgZm4pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgdHJhbnMgPSBkYi5fY3JlYXRlVHJhbnNhY3Rpb24obW9kZSwgc3RvcmVOYW1lcywgZ2xvYmFsU2NoZW1hKTtcbiAgICAgICAgICAgIHJldHVybiB0cmFucy5fcHJvbWlzZShtb2RlLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgbmV3U2NvcGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPUFRJTUlaQVRJT04gUE9TU0lCTEU/IG5ld1Njb3BlKCkgbm90IG5lZWRlZCBiZWNhdXNlIGl0J3MgYWxyZWFkeSBkb25lIGluIF9wcm9taXNlLlxuICAgICAgICAgICAgICAgICAgICBQU0QudHJhbnMgPSB0cmFucztcbiAgICAgICAgICAgICAgICAgICAgZm4ocmVzb2x2ZSwgcmVqZWN0LCB0cmFucyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBJbnN0ZWFkIG9mIHJlc29sdmluZyB2YWx1ZSBkaXJlY3RseSwgd2FpdCB3aXRoIHJlc29sdmluZyBpdCB1bnRpbCB0cmFuc2FjdGlvbiBoYXMgY29tcGxldGVkLlxuICAgICAgICAgICAgICAgIC8vIE90aGVyd2lzZSB0aGUgZGF0YSB3b3VsZCBub3QgYmUgaW4gdGhlIERCIGlmIHJlcXVlc3RpbmcgaXQgaW4gdGhlIHRoZW4oKSBvcGVyYXRpb24uXG4gICAgICAgICAgICAgICAgLy8gU3BlY2lmaWNhbGx5LCB0byBlbnN1cmUgdGhhdCB0aGUgZm9sbG93aW5nIGV4cHJlc3Npb24gd2lsbCB3b3JrOlxuICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgLy8gICBkYi5mcmllbmRzLnB1dCh7bmFtZTogXCJBcm5lXCJ9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICBkYi5mcmllbmRzLndoZXJlKFwibmFtZVwiKS5lcXVhbHMoXCJBcm5lXCIpLmNvdW50KGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgICAgIGFzc2VydCAoY291bnQgPT09IDEpO1xuICAgICAgICAgICAgICAgIC8vICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vICAgfSk7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnMuX2NvbXBsZXRpb24udGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTsgLyouY2F0Y2goZXJyID0+IHsgLy8gRG9uJ3QgZG8gdGhpcyBhcyBvZiBub3cuIElmIHdvdWxkIGFmZmVjdCBidWxrLSBhbmQgbW9kaWZ5IG1ldGhvZHMgaW4gYSB3YXkgdGhhdCBjb3VsZCBiZSBtb3JlIGludHVpdGl2ZS4gQnV0IHdhaXQhIE1heWJlIGNoYW5nZSBpbiBuZXh0IG1ham9yLlxyXG4gICAgICAgICAgICAgICAgIHRyYW5zLl9yZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0aW9uKGVycik7XHJcbiAgICAgICAgICAgICAgICB9KTsqL1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5fd2hlblJlYWR5ID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmYWtlIHx8IG9wZW5Db21wbGV0ZSB8fCBQU0QubGV0VGhyb3VnaCA/IGZuIDogZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKCFpc0JlaW5nT3BlbmVkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFhdXRvT3Blbikge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IGV4Y2VwdGlvbnMuRGF0YWJhc2VDbG9zZWQoKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZGIub3BlbigpLmNhdGNoKG5vcCk7IC8vIE9wZW4gaW4gYmFja2dyb3VuZC4gSWYgaWYgZmFpbHMsIGl0IHdpbGwgYmUgY2F0Y2hlZCBieSB0aGUgZmluYWwgcHJvbWlzZSBhbnl3YXkuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkYlJlYWR5UHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBmbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLnVuY2F1Z2h0KGRiVW5jYXVnaHQpO1xuICAgIH07XG5cbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIC8vICAgICAgRGV4aWUgQVBJXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG5cbiAgICB0aGlzLnZlcm5vID0gMDtcblxuICAgIHRoaXMub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGlzQmVpbmdPcGVuZWQgfHwgaWRiZGIpIHJldHVybiBkYlJlYWR5UHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBkYk9wZW5FcnJvciA/IHJlamVjdGlvbihkYk9wZW5FcnJvciwgZGJVbmNhdWdodCkgOiBkYjtcbiAgICAgICAgfSk7XG4gICAgICAgIGRlYnVnICYmIChvcGVuQ2FuY2VsbGVyLl9zdGFja0hvbGRlciA9IGdldEVycm9yV2l0aFN0YWNrKCkpOyAvLyBMZXQgc3RhY2tzIHBvaW50IHRvIHdoZW4gb3BlbigpIHdhcyBjYWxsZWQgcmF0aGVyIHRoYW4gd2hlcmUgbmV3IERleGllKCkgd2FzIGNhbGxlZC5cbiAgICAgICAgaXNCZWluZ09wZW5lZCA9IHRydWU7XG4gICAgICAgIGRiT3BlbkVycm9yID0gbnVsbDtcbiAgICAgICAgb3BlbkNvbXBsZXRlID0gZmFsc2U7XG5cbiAgICAgICAgLy8gRnVuY3Rpb24gcG9pbnRlcnMgdG8gY2FsbCB3aGVuIHRoZSBjb3JlIG9wZW5pbmcgcHJvY2VzcyBjb21wbGV0ZXMuXG4gICAgICAgIHZhciByZXNvbHZlRGJSZWFkeSA9IGRiUmVhZHlSZXNvbHZlLFxuXG4gICAgICAgIC8vIHVwZ3JhZGVUcmFuc2FjdGlvbiB0byBhYm9ydCBvbiBmYWlsdXJlLlxuICAgICAgICB1cGdyYWRlVHJhbnNhY3Rpb24gPSBudWxsO1xuXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJhY2UoW29wZW5DYW5jZWxsZXIsIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGRvRmFrZUF1dG9Db21wbGV0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgY2FsbGVyIGhhcyBzcGVjaWZpZWQgYXQgbGVhc3Qgb25lIHZlcnNpb25cbiAgICAgICAgICAgIGlmICh2ZXJzaW9ucy5sZW5ndGggPiAwKSBhdXRvU2NoZW1hID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIE11bHRpcGx5IGRiLnZlcm5vIHdpdGggMTAgd2lsbCBiZSBuZWVkZWQgdG8gd29ya2Fyb3VuZCB1cGdyYWRpbmcgYnVnIGluIElFOlxuICAgICAgICAgICAgLy8gSUUgZmFpbHMgd2hlbiBkZWxldGluZyBvYmplY3RTdG9yZSBhZnRlciByZWFkaW5nIGZyb20gaXQuXG4gICAgICAgICAgICAvLyBBIGZ1dHVyZSB2ZXJzaW9uIG9mIERleGllLmpzIHdpbGwgc3RvcG92ZXIgYW4gaW50ZXJtZWRpYXRlIHZlcnNpb24gdG8gd29ya2Fyb3VuZCB0aGlzLlxuICAgICAgICAgICAgLy8gQXQgdGhhdCBwb2ludCwgd2Ugd2FudCB0byBiZSBiYWNrd2FyZCBjb21wYXRpYmxlLiBDb3VsZCBoYXZlIGJlZW4gbXVsdGlwbGllZCB3aXRoIDIsIGJ1dCBieSB1c2luZyAxMCwgaXQgaXMgZWFzaWVyIHRvIG1hcCB0aGUgbnVtYmVyIHRvIHRoZSByZWFsIHZlcnNpb24gbnVtYmVyLlxuXG4gICAgICAgICAgICAvLyBJZiBubyBBUEksIHRocm93IVxuICAgICAgICAgICAgaWYgKCFpbmRleGVkREIpIHRocm93IG5ldyBleGNlcHRpb25zLk1pc3NpbmdBUEkoXCJpbmRleGVkREIgQVBJIG5vdCBmb3VuZC4gSWYgdXNpbmcgSUUxMCssIG1ha2Ugc3VyZSB0byBydW4geW91ciBjb2RlIG9uIGEgc2VydmVyIFVSTCBcIiArIFwiKG5vdCBsb2NhbGx5KS4gSWYgdXNpbmcgb2xkIFNhZmFyaSB2ZXJzaW9ucywgbWFrZSBzdXJlIHRvIGluY2x1ZGUgaW5kZXhlZERCIHBvbHlmaWxsLlwiKTtcblxuICAgICAgICAgICAgdmFyIHJlcSA9IGF1dG9TY2hlbWEgPyBpbmRleGVkREIub3BlbihkYk5hbWUpIDogaW5kZXhlZERCLm9wZW4oZGJOYW1lLCBNYXRoLnJvdW5kKGRiLnZlcm5vICogMTApKTtcbiAgICAgICAgICAgIGlmICghcmVxKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5NaXNzaW5nQVBJKFwiSW5kZXhlZERCIEFQSSBub3QgYXZhaWxhYmxlXCIpOyAvLyBNYXkgaGFwcGVuIGluIFNhZmFyaSBwcml2YXRlIG1vZGUsIHNlZSBodHRwczovL2dpdGh1Yi5jb20vZGZhaGxhbmRlci9EZXhpZS5qcy9pc3N1ZXMvMTM0XG4gICAgICAgICAgICByZXEub25lcnJvciA9IHdyYXAoZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCkpO1xuICAgICAgICAgICAgcmVxLm9uYmxvY2tlZCA9IHdyYXAoZmlyZU9uQmxvY2tlZCk7XG4gICAgICAgICAgICByZXEub251cGdyYWRlbmVlZGVkID0gd3JhcChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIHVwZ3JhZGVUcmFuc2FjdGlvbiA9IHJlcS50cmFuc2FjdGlvbjtcbiAgICAgICAgICAgICAgICBpZiAoYXV0b1NjaGVtYSAmJiAhZGIuX2FsbG93RW1wdHlEQikge1xuICAgICAgICAgICAgICAgICAgICAvLyBVbmxlc3MgYW4gYWRkb24gaGFzIHNwZWNpZmllZCBkYi5fYWxsb3dFbXB0eURCLCBsZXRzIG1ha2UgdGhlIGNhbGwgZmFpbC5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2FsbGVyIGRpZCBub3Qgc3BlY2lmeSBhIHZlcnNpb24gb3Igc2NoZW1hLiBEb2luZyB0aGF0IGlzIG9ubHkgYWNjZXB0YWJsZSBmb3Igb3BlbmluZyBhbHJlYWQgZXhpc3RpbmcgZGF0YWJhc2VzLlxuICAgICAgICAgICAgICAgICAgICAvLyBJZiBvbnVwZ3JhZGVuZWVkZWQgaXMgY2FsbGVkIGl0IG1lYW5zIGRhdGFiYXNlIGRpZCBub3QgZXhpc3QuIFJlamVjdCB0aGUgb3BlbigpIHByb21pc2UgYW5kIG1ha2Ugc3VyZSB0aGF0IHdlXG4gICAgICAgICAgICAgICAgICAgIC8vIGRvIG5vdCBjcmVhdGUgYSBuZXcgZGF0YWJhc2UgYnkgYWNjaWRlbnQgaGVyZS5cbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBwcmV2ZW50RGVmYXVsdDsgLy8gUHJvaGliaXQgb25hYm9ydCBlcnJvciBmcm9tIGZpcmluZyBiZWZvcmUgd2UncmUgZG9uZSFcbiAgICAgICAgICAgICAgICAgICAgdXBncmFkZVRyYW5zYWN0aW9uLmFib3J0KCk7IC8vIEFib3J0IHRyYW5zYWN0aW9uICh3b3VsZCBob3BlIHRoYXQgdGhpcyB3b3VsZCBtYWtlIERCIGRpc2FwcGVhciBidXQgaXQgZG9lc250LilcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xvc2UgZGF0YWJhc2UgYW5kIGRlbGV0ZSBpdC5cbiAgICAgICAgICAgICAgICAgICAgcmVxLnJlc3VsdC5jbG9zZSgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZGVscmVxID0gaW5kZXhlZERCLmRlbGV0ZURhdGFiYXNlKGRiTmFtZSk7IC8vIFRoZSB1cGdyYWRlIHRyYW5zYWN0aW9uIGlzIGF0b21pYywgYW5kIGphdmFzY3JpcHQgaXMgc2luZ2xlIHRocmVhZGVkIC0gbWVhbmluZyB0aGF0IHRoZXJlIGlzIG5vIHJpc2sgdGhhdCB3ZSBkZWxldGUgc29tZW9uZSBlbHNlcyBkYXRhYmFzZSBoZXJlIVxuICAgICAgICAgICAgICAgICAgICBkZWxyZXEub25zdWNjZXNzID0gZGVscmVxLm9uZXJyb3IgPSB3cmFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgZXhjZXB0aW9ucy5Ob1N1Y2hEYXRhYmFzZSgnRGF0YWJhc2UgJyArIGRiTmFtZSArICcgZG9lc250IGV4aXN0JykpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB1cGdyYWRlVHJhbnNhY3Rpb24ub25lcnJvciA9IHdyYXAoZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCkpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgb2xkVmVyID0gZS5vbGRWZXJzaW9uID4gTWF0aC5wb3coMiwgNjIpID8gMCA6IGUub2xkVmVyc2lvbjsgLy8gU2FmYXJpIDggZml4LlxuICAgICAgICAgICAgICAgICAgICBydW5VcGdyYWRlcnMob2xkVmVyIC8gMTAsIHVwZ3JhZGVUcmFuc2FjdGlvbiwgcmVqZWN0LCByZXEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHJlamVjdCk7XG5cbiAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSB3cmFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBDb3JlIG9wZW5pbmcgcHJvY2VkdXJlIGNvbXBsZXRlLiBOb3cgbGV0J3MganVzdCByZWNvcmQgc29tZSBzdHVmZi5cbiAgICAgICAgICAgICAgICB1cGdyYWRlVHJhbnNhY3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgICAgIGlkYmRiID0gcmVxLnJlc3VsdDtcbiAgICAgICAgICAgICAgICBjb25uZWN0aW9ucy5wdXNoKGRiKTsgLy8gVXNlZCBmb3IgZW11bGF0aW5nIHZlcnNpb25jaGFuZ2UgZXZlbnQgb24gSUUvRWRnZS9TYWZhcmkuXG5cbiAgICAgICAgICAgICAgICBpZiAoYXV0b1NjaGVtYSkgcmVhZEdsb2JhbFNjaGVtYSgpO2Vsc2UgaWYgKGlkYmRiLm9iamVjdFN0b3JlTmFtZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRqdXN0VG9FeGlzdGluZ0luZGV4TmFtZXMoZ2xvYmFsU2NoZW1hLCBpZGJkYi50cmFuc2FjdGlvbihzYWZhcmlNdWx0aVN0b3JlRml4KGlkYmRiLm9iamVjdFN0b3JlTmFtZXMpLCBSRUFET05MWSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTYWZhcmkgbWF5IGJhaWwgb3V0IGlmID4gMSBzdG9yZSBuYW1lcy4gSG93ZXZlciwgdGhpcyBzaG91bGRudCBiZSBhIHNob3dzdG9wcGVyLiBJc3N1ZSAjMTIwLlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWRiZGIub252ZXJzaW9uY2hhbmdlID0gd3JhcChmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgZGIuX3ZjRmlyZWQgPSB0cnVlOyAvLyBkZXRlY3QgaW1wbGVtZW50YXRpb25zIHRoYXQgbm90IHN1cHBvcnQgdmVyc2lvbmNoYW5nZSAoSUUvRWRnZS9TYWZhcmkpXG4gICAgICAgICAgICAgICAgICAgIGRiLm9uKFwidmVyc2lvbmNoYW5nZVwiKS5maXJlKGV2KTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGlmICghaGFzTmF0aXZlR2V0RGF0YWJhc2VOYW1lcykge1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbG9jYWxTdG9yYWdlIHdpdGggbGlzdCBvZiBkYXRhYmFzZSBuYW1lc1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxEYXRhYmFzZUxpc3QoZnVuY3Rpb24gKGRhdGFiYXNlTmFtZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkYXRhYmFzZU5hbWVzLmluZGV4T2YoZGJOYW1lKSA9PT0gLTEpIHJldHVybiBkYXRhYmFzZU5hbWVzLnB1c2goZGJOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgfSldKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIEJlZm9yZSBmaW5hbGx5IHJlc29sdmluZyB0aGUgZGJSZWFkeVByb21pc2UgYW5kIHRoaXMgcHJvbWlzZSxcbiAgICAgICAgICAgIC8vIGNhbGwgYW5kIGF3YWl0IGFsbCBvbigncmVhZHknKSBzdWJzY3JpYmVyczpcbiAgICAgICAgICAgIC8vIERleGllLnZpcCgpIG1ha2VzIHN1YnNjcmliZXJzIGFibGUgdG8gdXNlIHRoZSBkYXRhYmFzZSB3aGlsZSBiZWluZyBvcGVuZWQuXG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgbXVzdCBzaW5jZSB0aGVzZSBzdWJzY3JpYmVycyB0YWtlIHBhcnQgb2YgdGhlIG9wZW5pbmcgcHJvY2VkdXJlLlxuICAgICAgICAgICAgcmV0dXJuIERleGllLnZpcChkYi5vbi5yZWFkeS5maXJlKTtcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBSZXNvbHZlIHRoZSBkYi5vcGVuKCkgd2l0aCB0aGUgZGIgaW5zdGFuY2UuXG4gICAgICAgICAgICBpc0JlaW5nT3BlbmVkID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gZGI7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gRGlkIHdlIGZhaWwgd2l0aGluIG9udXBncmFkZW5lZWRlZD8gTWFrZSBzdXJlIHRvIGFib3J0IHRoZSB1cGdyYWRlIHRyYW5zYWN0aW9uIHNvIGl0IGRvZXNudCBjb21taXQuXG4gICAgICAgICAgICAgICAgdXBncmFkZVRyYW5zYWN0aW9uICYmIHVwZ3JhZGVUcmFuc2FjdGlvbi5hYm9ydCgpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgIGlzQmVpbmdPcGVuZWQgPSBmYWxzZTsgLy8gU2V0IGJlZm9yZSBjYWxsaW5nIGRiLmNsb3NlKCkgc28gdGhhdCBpdCBkb2VzbnQgcmVqZWN0IG9wZW5DYW5jZWxsZXIgYWdhaW4gKGxlYWRzIHRvIHVuaGFuZGxlZCByZWplY3Rpb24gZXZlbnQpLlxuICAgICAgICAgICAgZGIuY2xvc2UoKTsgLy8gQ2xvc2VzIGFuZCByZXNldHMgaWRiZGIsIHJlbW92ZXMgY29ubmVjdGlvbnMsIHJlc2V0cyBkYlJlYWR5UHJvbWlzZSBhbmQgb3BlbkNhbmNlbGxlciBzbyB0aGF0IGEgbGF0ZXIgZGIub3BlbigpIGlzIGZyZXNoLlxuICAgICAgICAgICAgLy8gQSBjYWxsIHRvIGRiLmNsb3NlKCkgbWF5IGhhdmUgbWFkZSBvbi1yZWFkeSBzdWJzY3JpYmVycyBmYWlsLiBVc2UgZGJPcGVuRXJyb3IgaWYgc2V0LCBzaW5jZSBlcnIgY291bGQgYmUgYSBmb2xsb3ctdXAgZXJyb3Igb24gdGhhdC5cbiAgICAgICAgICAgIGRiT3BlbkVycm9yID0gZXJyOyAvLyBSZWNvcmQgdGhlIGVycm9yLiBJdCB3aWxsIGJlIHVzZWQgdG8gcmVqZWN0IGZ1cnRoZXIgcHJvbWlzZXMgb2YgZGIgb3BlcmF0aW9ucy5cbiAgICAgICAgICAgIHJldHVybiByZWplY3Rpb24oZGJPcGVuRXJyb3IsIGRiVW5jYXVnaHQpOyAvLyBkYlVuY2F1Z2h0IHdpbGwgbWFrZSBzdXJlIGFueSBlcnJvciB0aGF0IGhhcHBlbmVkIGluIGFueSBvcGVyYXRpb24gYmVmb3JlIHdpbGwgbm93IGJ1YmJsZSB0byBkYi5vbi5lcnJvcigpIHRoYW5rcyB0byB0aGUgc3BlY2lhbCBoYW5kbGluZyBpbiBQcm9taXNlLnVuY2F1Z2h0KCkuXG4gICAgICAgIH0pLmZpbmFsbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgb3BlbkNvbXBsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgIHJlc29sdmVEYlJlYWR5KCk7IC8vIGRiUmVhZHlQcm9taXNlIGlzIHJlc29sdmVkIG5vIG1hdHRlciBpZiBvcGVuKCkgcmVqZWN0cyBvciByZXNvbHZlZC4gSXQncyBqdXN0IHRvIHdha2UgdXAgd2FpdGVycy5cbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuY2xvc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpZHggPSBjb25uZWN0aW9ucy5pbmRleE9mKGRiKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSBjb25uZWN0aW9ucy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgICAgaWYgKGlkYmRiKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGlkYmRiLmNsb3NlKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgaWRiZGIgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGF1dG9PcGVuID0gZmFsc2U7XG4gICAgICAgIGRiT3BlbkVycm9yID0gbmV3IGV4Y2VwdGlvbnMuRGF0YWJhc2VDbG9zZWQoKTtcbiAgICAgICAgaWYgKGlzQmVpbmdPcGVuZWQpIGNhbmNlbE9wZW4oZGJPcGVuRXJyb3IpO1xuICAgICAgICAvLyBSZXNldCBkYlJlYWR5UHJvbWlzZSBwcm9taXNlOlxuICAgICAgICBkYlJlYWR5UHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG4gICAgICAgICAgICBkYlJlYWR5UmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgIH0pO1xuICAgICAgICBvcGVuQ2FuY2VsbGVyID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKF8sIHJlamVjdCkge1xuICAgICAgICAgICAgY2FuY2VsT3BlbiA9IHJlamVjdDtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHRoaXMuZGVsZXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaGFzQXJndW1lbnRzID0gYXJndW1lbnRzLmxlbmd0aCA+IDA7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAoaGFzQXJndW1lbnRzKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkQXJndW1lbnQoXCJBcmd1bWVudHMgbm90IGFsbG93ZWQgaW4gZGIuZGVsZXRlKClcIik7XG4gICAgICAgICAgICBpZiAoaXNCZWluZ09wZW5lZCkge1xuICAgICAgICAgICAgICAgIGRiUmVhZHlQcm9taXNlLnRoZW4oZG9EZWxldGUpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkb0RlbGV0ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnVuY3Rpb24gZG9EZWxldGUoKSB7XG4gICAgICAgICAgICAgICAgZGIuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVxID0gaW5kZXhlZERCLmRlbGV0ZURhdGFiYXNlKGRiTmFtZSk7XG4gICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IHdyYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc05hdGl2ZUdldERhdGFiYXNlTmFtZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGdsb2JhbERhdGFiYXNlTGlzdChmdW5jdGlvbiAoZGF0YWJhc2VOYW1lcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwb3MgPSBkYXRhYmFzZU5hbWVzLmluZGV4T2YoZGJOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9zID49IDApIHJldHVybiBkYXRhYmFzZU5hbWVzLnNwbGljZShwb3MsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gd3JhcChldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KSk7XG4gICAgICAgICAgICAgICAgcmVxLm9uYmxvY2tlZCA9IGZpcmVPbkJsb2NrZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLnVuY2F1Z2h0KGRiVW5jYXVnaHQpO1xuICAgIH07XG5cbiAgICB0aGlzLmJhY2tlbmREQiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGlkYmRiO1xuICAgIH07XG5cbiAgICB0aGlzLmlzT3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGlkYmRiICE9PSBudWxsO1xuICAgIH07XG4gICAgdGhpcy5oYXNGYWlsZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBkYk9wZW5FcnJvciAhPT0gbnVsbDtcbiAgICB9O1xuICAgIHRoaXMuZHluYW1pY2FsbHlPcGVuZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhdXRvU2NoZW1hO1xuICAgIH07XG5cbiAgICAvL1xuICAgIC8vIFByb3BlcnRpZXNcbiAgICAvL1xuICAgIHRoaXMubmFtZSA9IGRiTmFtZTtcblxuICAgIC8vIGRiLnRhYmxlcyAtIGFuIGFycmF5IG9mIGFsbCBUYWJsZSBpbnN0YW5jZXMuXG4gICAgc2V0UHJvcCh0aGlzLCBcInRhYmxlc1wiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8vIDxyZXR1cm5zIHR5cGU9XCJBcnJheVwiIGVsZW1lbnRUeXBlPVwiV3JpdGVhYmxlVGFibGVcIiAvPlxuICAgICAgICAgICAgcmV0dXJuIGtleXMoYWxsVGFibGVzKS5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWxsVGFibGVzW25hbWVdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vXG4gICAgLy8gRXZlbnRzXG4gICAgLy9cbiAgICB0aGlzLm9uID0gRXZlbnRzKHRoaXMsIFwiZXJyb3JcIiwgXCJwb3B1bGF0ZVwiLCBcImJsb2NrZWRcIiwgXCJ2ZXJzaW9uY2hhbmdlXCIsIHsgcmVhZHk6IFtwcm9taXNhYmxlQ2hhaW4sIG5vcF0gfSk7XG4gICAgdGhpcy5vbi5lcnJvci5zdWJzY3JpYmUgPSBkZXByZWNhdGVkKFwiRGV4aWUub24uZXJyb3JcIiwgdGhpcy5vbi5lcnJvci5zdWJzY3JpYmUpO1xuICAgIHRoaXMub24uZXJyb3IudW5zdWJzY3JpYmUgPSBkZXByZWNhdGVkKFwiRGV4aWUub24uZXJyb3IudW5zdWJzY3JpYmVcIiwgdGhpcy5vbi5lcnJvci51bnN1YnNjcmliZSk7XG5cbiAgICB0aGlzLm9uLnJlYWR5LnN1YnNjcmliZSA9IG92ZXJyaWRlKHRoaXMub24ucmVhZHkuc3Vic2NyaWJlLCBmdW5jdGlvbiAoc3Vic2NyaWJlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoc3Vic2NyaWJlciwgYlN0aWNreSkge1xuICAgICAgICAgICAgRGV4aWUudmlwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBpZiAob3BlbkNvbXBsZXRlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERhdGFiYXNlIGFscmVhZHkgb3Blbi4gQ2FsbCBzdWJzY3JpYmVyIGFzYXAuXG4gICAgICAgICAgICAgICAgICAgIGlmICghZGJPcGVuRXJyb3IpIFByb21pc2UucmVzb2x2ZSgpLnRoZW4oc3Vic2NyaWJlcik7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJTdGlja3k6IEFsc28gc3Vic2NyaWJlIHRvIGZ1dHVyZSBvcGVuIHN1Y2Vzc2VzIChhZnRlciBjbG9zZSAvIHJlb3BlbikgXG4gICAgICAgICAgICAgICAgICAgIGlmIChiU3RpY2t5KSBzdWJzY3JpYmUoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGF0YWJhc2Ugbm90IHlldCBvcGVuLiBTdWJzY3JpYmUgdG8gaXQuXG4gICAgICAgICAgICAgICAgICAgIHN1YnNjcmliZShzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgYlN0aWNreSBpcyBmYWxzeSwgbWFrZSBzdXJlIHRvIHVuc3Vic2NyaWJlIHN1YnNjcmliZXIgd2hlbiBmaXJlZCBvbmNlLlxuICAgICAgICAgICAgICAgICAgICBpZiAoIWJTdGlja3kpIHN1YnNjcmliZShmdW5jdGlvbiB1bnN1YnNjcmliZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRiLm9uLnJlYWR5LnVuc3Vic2NyaWJlKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGIub24ucmVhZHkudW5zdWJzY3JpYmUodW5zdWJzY3JpYmUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGZha2VBdXRvQ29tcGxldGUoZnVuY3Rpb24gKCkge1xuICAgICAgICBkYi5vbihcInBvcHVsYXRlXCIpLmZpcmUoZGIuX2NyZWF0ZVRyYW5zYWN0aW9uKFJFQURXUklURSwgZGJTdG9yZU5hbWVzLCBnbG9iYWxTY2hlbWEpKTtcbiAgICAgICAgZGIub24oXCJlcnJvclwiKS5maXJlKG5ldyBFcnJvcigpKTtcbiAgICB9KTtcblxuICAgIHRoaXMudHJhbnNhY3Rpb24gPSBmdW5jdGlvbiAobW9kZSwgdGFibGVJbnN0YW5jZXMsIHNjb3BlRnVuYykge1xuICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgIC8vL1xuICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJtb2RlXCIgdHlwZT1cIlN0cmluZ1wiPlwiclwiIGZvciByZWFkb25seSwgb3IgXCJyd1wiIGZvciByZWFkd3JpdGU8L3BhcmFtPlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJ0YWJsZUluc3RhbmNlc1wiPlRhYmxlIGluc3RhbmNlLCBBcnJheSBvZiBUYWJsZSBpbnN0YW5jZXMsIFN0cmluZyBvciBTdHJpbmcgQXJyYXkgb2Ygb2JqZWN0IHN0b3JlcyB0byBpbmNsdWRlIGluIHRoZSB0cmFuc2FjdGlvbjwvcGFyYW0+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInNjb3BlRnVuY1wiIHR5cGU9XCJGdW5jdGlvblwiPkZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2l0aCB0cmFuc2FjdGlvbjwvcGFyYW0+XG5cbiAgICAgICAgLy8gTGV0IHRhYmxlIGFyZ3VtZW50cyBiZSBhbGwgYXJndW1lbnRzIGJldHdlZW4gbW9kZSBhbmQgbGFzdCBhcmd1bWVudC5cbiAgICAgICAgdmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBpZiAoaSA8IDIpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcIlRvbyBmZXcgYXJndW1lbnRzXCIpO1xuICAgICAgICAvLyBQcmV2ZW50IG9wdGltemF0aW9uIGtpbGxlciAoaHR0cHM6Ly9naXRodWIuY29tL3BldGthYW50b25vdi9ibHVlYmlyZC93aWtpL09wdGltaXphdGlvbi1raWxsZXJzIzMyLWxlYWtpbmctYXJndW1lbnRzKVxuICAgICAgICAvLyBhbmQgY2xvbmUgYXJndW1lbnRzIGV4Y2VwdCB0aGUgZmlyc3Qgb25lIGludG8gbG9jYWwgdmFyICdhcmdzJy5cbiAgICAgICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoaSAtIDEpO1xuICAgICAgICB3aGlsZSAoLS1pKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfSAvLyBMZXQgc2NvcGVGdW5jIGJlIHRoZSBsYXN0IGFyZ3VtZW50IGFuZCBwb3AgaXQgc28gdGhhdCBhcmdzIG5vdyBvbmx5IGNvbnRhaW4gdGhlIHRhYmxlIGFyZ3VtZW50cy5cbiAgICAgICAgc2NvcGVGdW5jID0gYXJncy5wb3AoKTtcbiAgICAgICAgdmFyIHRhYmxlcyA9IGZsYXR0ZW4oYXJncyk7IC8vIFN1cHBvcnQgdXNpbmcgYXJyYXkgYXMgbWlkZGxlIGFyZ3VtZW50LCBvciBhIG1peCBvZiBhcnJheXMgYW5kIG5vbi1hcnJheXMuXG4gICAgICAgIHZhciBwYXJlbnRUcmFuc2FjdGlvbiA9IFBTRC50cmFucztcbiAgICAgICAgLy8gQ2hlY2sgaWYgcGFyZW50IHRyYW5zYWN0aW9ucyBpcyBib3VuZCB0byB0aGlzIGRiIGluc3RhbmNlLCBhbmQgaWYgY2FsbGVyIHdhbnRzIHRvIHJldXNlIGl0XG4gICAgICAgIGlmICghcGFyZW50VHJhbnNhY3Rpb24gfHwgcGFyZW50VHJhbnNhY3Rpb24uZGIgIT09IGRiIHx8IG1vZGUuaW5kZXhPZignIScpICE9PSAtMSkgcGFyZW50VHJhbnNhY3Rpb24gPSBudWxsO1xuICAgICAgICB2YXIgb25seUlmQ29tcGF0aWJsZSA9IG1vZGUuaW5kZXhPZignPycpICE9PSAtMTtcbiAgICAgICAgbW9kZSA9IG1vZGUucmVwbGFjZSgnIScsICcnKS5yZXBsYWNlKCc/JywgJycpOyAvLyBPay4gV2lsbCBjaGFuZ2UgYXJndW1lbnRzWzBdIGFzIHdlbGwgYnV0IHdlIHdvbnQgdG91Y2ggYXJndW1lbnRzIGhlbmNlZm9ydGguXG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBHZXQgc3RvcmVOYW1lcyBmcm9tIGFyZ3VtZW50cy4gRWl0aGVyIHRocm91Z2ggZ2l2ZW4gdGFibGUgaW5zdGFuY2VzLCBvciB0aHJvdWdoIGdpdmVuIHRhYmxlIG5hbWVzLlxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIHZhciBzdG9yZU5hbWVzID0gdGFibGVzLm1hcChmdW5jdGlvbiAodGFibGUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3RvcmVOYW1lID0gdGFibGUgaW5zdGFuY2VvZiBUYWJsZSA/IHRhYmxlLm5hbWUgOiB0YWJsZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHN0b3JlTmFtZSAhPT0gJ3N0cmluZycpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIHRhYmxlIGFyZ3VtZW50IHRvIERleGllLnRyYW5zYWN0aW9uKCkuIE9ubHkgVGFibGUgb3IgU3RyaW5nIGFyZSBhbGxvd2VkXCIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBzdG9yZU5hbWU7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIFJlc29sdmUgbW9kZS4gQWxsb3cgc2hvcnRjdXRzIFwiclwiIGFuZCBcInJ3XCIuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgaWYgKG1vZGUgPT0gXCJyXCIgfHwgbW9kZSA9PSBSRUFET05MWSkgbW9kZSA9IFJFQURPTkxZO2Vsc2UgaWYgKG1vZGUgPT0gXCJyd1wiIHx8IG1vZGUgPT0gUkVBRFdSSVRFKSBtb2RlID0gUkVBRFdSSVRFO2Vsc2UgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KFwiSW52YWxpZCB0cmFuc2FjdGlvbiBtb2RlOiBcIiArIG1vZGUpO1xuXG4gICAgICAgICAgICBpZiAocGFyZW50VHJhbnNhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBCYXNpYyBjaGVja3NcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50VHJhbnNhY3Rpb24ubW9kZSA9PT0gUkVBRE9OTFkgJiYgbW9kZSA9PT0gUkVBRFdSSVRFKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvbmx5SWZDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTcGF3biBuZXcgdHJhbnNhY3Rpb24gaW5zdGVhZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFRyYW5zYWN0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHRocm93IG5ldyBleGNlcHRpb25zLlN1YlRyYW5zYWN0aW9uKFwiQ2Fubm90IGVudGVyIGEgc3ViLXRyYW5zYWN0aW9uIHdpdGggUkVBRFdSSVRFIG1vZGUgd2hlbiBwYXJlbnQgdHJhbnNhY3Rpb24gaXMgUkVBRE9OTFlcIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChwYXJlbnRUcmFuc2FjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBzdG9yZU5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudFRyYW5zYWN0aW9uICYmIHBhcmVudFRyYW5zYWN0aW9uLnN0b3JlTmFtZXMuaW5kZXhPZihzdG9yZU5hbWUpID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbmx5SWZDb21wYXRpYmxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwYXduIG5ldyB0cmFuc2FjdGlvbiBpbnN0ZWFkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRUcmFuc2FjdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHRocm93IG5ldyBleGNlcHRpb25zLlN1YlRyYW5zYWN0aW9uKFwiVGFibGUgXCIgKyBzdG9yZU5hbWUgKyBcIiBub3QgaW5jbHVkZWQgaW4gcGFyZW50IHRyYW5zYWN0aW9uLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50VHJhbnNhY3Rpb24gPyBwYXJlbnRUcmFuc2FjdGlvbi5fcHJvbWlzZShudWxsLCBmdW5jdGlvbiAoXywgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgfSkgOiByZWplY3Rpb24oZSwgZGJVbmNhdWdodCk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIHN1Yi10cmFuc2FjdGlvbiwgbG9jayB0aGUgcGFyZW50IGFuZCB0aGVuIGxhdW5jaCB0aGUgc3ViLXRyYW5zYWN0aW9uLlxuICAgICAgICByZXR1cm4gcGFyZW50VHJhbnNhY3Rpb24gPyBwYXJlbnRUcmFuc2FjdGlvbi5fcHJvbWlzZShtb2RlLCBlbnRlclRyYW5zYWN0aW9uU2NvcGUsIFwibG9ja1wiKSA6IGRiLl93aGVuUmVhZHkoZW50ZXJUcmFuc2FjdGlvblNjb3BlKTtcblxuICAgICAgICBmdW5jdGlvbiBlbnRlclRyYW5zYWN0aW9uU2NvcGUocmVzb2x2ZSkge1xuICAgICAgICAgICAgdmFyIHBhcmVudFBTRCA9IFBTRDtcbiAgICAgICAgICAgIHJlc29sdmUoUHJvbWlzZS5yZXNvbHZlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ld1Njb3BlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gS2VlcCBhIHBvaW50ZXIgdG8gbGFzdCBub24tdHJhbnNhY3Rpb25hbCBQU0QgdG8gdXNlIGlmIHNvbWVvbmUgY2FsbHMgRGV4aWUuaWdub3JlVHJhbnNhY3Rpb24oKS5cbiAgICAgICAgICAgICAgICAgICAgUFNELnRyYW5zbGVzcyA9IFBTRC50cmFuc2xlc3MgfHwgcGFyZW50UFNEO1xuICAgICAgICAgICAgICAgICAgICAvLyBPdXIgdHJhbnNhY3Rpb24uXG4gICAgICAgICAgICAgICAgICAgIC8vcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRyYW5zID0gZGIuX2NyZWF0ZVRyYW5zYWN0aW9uKG1vZGUsIHN0b3JlTmFtZXMsIGdsb2JhbFNjaGVtYSwgcGFyZW50VHJhbnNhY3Rpb24pO1xuICAgICAgICAgICAgICAgICAgICAvLyBMZXQgdGhlIHRyYW5zYWN0aW9uIGluc3RhbmNlIGJlIHBhcnQgb2YgYSBQcm9taXNlLXNwZWNpZmljIGRhdGEgKFBTRCkgdmFsdWUuXG4gICAgICAgICAgICAgICAgICAgIFBTRC50cmFucyA9IHRyYW5zO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnRUcmFuc2FjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW11bGF0ZSB0cmFuc2FjdGlvbiBjb21taXQgYXdhcmVuZXNzIGZvciBpbm5lciB0cmFuc2FjdGlvbiAobXVzdCAnY29tbWl0JyB3aGVuIHRoZSBpbm5lciB0cmFuc2FjdGlvbiBoYXMgbm8gbW9yZSBvcGVyYXRpb25zIG9uZ29pbmcpXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFucy5pZGJ0cmFucyA9IHBhcmVudFRyYW5zYWN0aW9uLmlkYnRyYW5zO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnMuY3JlYXRlKCk7IC8vIENyZWF0ZSB0aGUgYmFja2VuZCB0cmFuc2FjdGlvbiBzbyB0aGF0IGNvbXBsZXRlKCkgb3IgZXJyb3IoKSB3aWxsIHRyaWdnZXIgZXZlbiBpZiBubyBvcGVyYXRpb24gaXMgbWFkZSB1cG9uIGl0LlxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUHJvdmlkZSBhcmd1bWVudHMgdG8gdGhlIHNjb3BlIGZ1bmN0aW9uIChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRhYmxlQXJncyA9IHN0b3JlTmFtZXMubWFwKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYWxsVGFibGVzW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGFibGVBcmdzLnB1c2godHJhbnMpO1xuXG4gICAgICAgICAgICAgICAgICAgIHZhciByZXR1cm5WYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuZm9sbG93KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZpbmFsbHksIGNhbGwgdGhlIHNjb3BlIGZ1bmN0aW9uIHdpdGggb3VyIHRhYmxlIGFuZCB0cmFuc2FjdGlvbiBhcmd1bWVudHMuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IHNjb3BlRnVuYy5hcHBseSh0cmFucywgdGFibGVBcmdzKTsgLy8gTk9URTogcmV0dXJuVmFsdWUgaXMgdXNlZCBpbiB0cmFucy5vbi5jb21wbGV0ZSgpIG5vdCBhcyBhIHJldHVyblZhbHVlIHRvIHRoaXMgZnVuYy5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXR1cm5WYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgcmV0dXJuVmFsdWUubmV4dCA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2YgcmV0dXJuVmFsdWUudGhyb3cgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2NvcGVGdW5jIHJldHVybmVkIGFuIGl0ZXJhdG9yIHdpdGggdGhyb3ctc3VwcG9ydC4gSGFuZGxlIHlpZWxkIGFzIGF3YWl0LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5WYWx1ZSA9IGF3YWl0SXRlcmF0b3IocmV0dXJuVmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJldHVyblZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbicgJiYgIWhhc093bihyZXR1cm5WYWx1ZSwgJ19QU0QnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbmNvbXBhdGlibGVQcm9taXNlKFwiSW5jb21wYXRpYmxlIFByb21pc2UgcmV0dXJuZWQgZnJvbSB0cmFuc2FjdGlvbiBzY29wZSAocmVhZCBtb3JlIGF0IGh0dHA6Ly90aW55dXJsLmNvbS96bnlxanFjKS4gVHJhbnNhY3Rpb24gc2NvcGU6IFwiICsgc2NvcGVGdW5jLnRvU3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkudW5jYXVnaHQoZGJVbmNhdWdodCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50VHJhbnNhY3Rpb24pIHRyYW5zLl9yZXNvbHZlKCk7IC8vIHN1YiB0cmFuc2FjdGlvbnMgZG9uJ3QgcmVhY3QgdG8gaWRidHJhbnMub25jb21wbGV0ZS4gV2UgbXVzdCB0cmlnZ2VyIGEgYWNvbXBsZXRpb24uXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJhbnMuX2NvbXBsZXRpb247IC8vIEV2ZW4gaWYgV0UgYmVsaWV2ZSBldmVyeXRoaW5nIGlzIGZpbmUuIEF3YWl0IElEQlRyYW5zYWN0aW9uJ3Mgb25jb21wbGV0ZSBvciBvbmVycm9yIGFzIHdlbGwuXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJldHVyblZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy9yZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFucy5fcmVqZWN0KGUpOyAvLyBZZXMsIGFib3ZlIHRoZW4taGFuZGxlciB3ZXJlIG1heWJlIG5vdCBjYWxsZWQgYmVjYXVzZSBvZiBhbiB1bmhhbmRsZWQgcmVqZWN0aW9uIGluIHNjb3BlRnVuYyFcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3Rpb24oZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvL30pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMudGFibGUgPSBmdW5jdGlvbiAodGFibGVOYW1lKSB7XG4gICAgICAgIC8vLyA8cmV0dXJucyB0eXBlPVwiV3JpdGVhYmxlVGFibGVcIj48L3JldHVybnM+XG4gICAgICAgIGlmIChmYWtlICYmIGF1dG9TY2hlbWEpIHJldHVybiBuZXcgV3JpdGVhYmxlVGFibGUodGFibGVOYW1lKTtcbiAgICAgICAgaWYgKCFoYXNPd24oYWxsVGFibGVzLCB0YWJsZU5hbWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkVGFibGUoJ1RhYmxlICcgKyB0YWJsZU5hbWUgKyAnIGRvZXMgbm90IGV4aXN0Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGFsbFRhYmxlc1t0YWJsZU5hbWVdO1xuICAgIH07XG5cbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICAvLyBUYWJsZSBDbGFzc1xuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIGZ1bmN0aW9uIFRhYmxlKG5hbWUsIHRhYmxlU2NoZW1hLCBjb2xsQ2xhc3MpIHtcbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwibmFtZVwiIHR5cGU9XCJTdHJpbmdcIj48L3BhcmFtPlxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLnNjaGVtYSA9IHRhYmxlU2NoZW1hO1xuICAgICAgICB0aGlzLmhvb2sgPSBhbGxUYWJsZXNbbmFtZV0gPyBhbGxUYWJsZXNbbmFtZV0uaG9vayA6IEV2ZW50cyhudWxsLCB7XG4gICAgICAgICAgICBcImNyZWF0aW5nXCI6IFtob29rQ3JlYXRpbmdDaGFpbiwgbm9wXSxcbiAgICAgICAgICAgIFwicmVhZGluZ1wiOiBbcHVyZUZ1bmN0aW9uQ2hhaW4sIG1pcnJvcl0sXG4gICAgICAgICAgICBcInVwZGF0aW5nXCI6IFtob29rVXBkYXRpbmdDaGFpbiwgbm9wXSxcbiAgICAgICAgICAgIFwiZGVsZXRpbmdcIjogW2hvb2tEZWxldGluZ0NoYWluLCBub3BdXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9jb2xsQ2xhc3MgPSBjb2xsQ2xhc3MgfHwgQ29sbGVjdGlvbjtcbiAgICB9XG5cbiAgICBwcm9wcyhUYWJsZS5wcm90b3R5cGUsIHtcblxuICAgICAgICAvL1xuICAgICAgICAvLyBUYWJsZSBQcm90ZWN0ZWQgTWV0aG9kc1xuICAgICAgICAvL1xuXG4gICAgICAgIF90cmFuczogZnVuY3Rpb24gZ2V0VHJhbnNhY3Rpb24obW9kZSwgZm4sIHdyaXRlTG9ja2VkKSB7XG4gICAgICAgICAgICB2YXIgdHJhbnMgPSBQU0QudHJhbnM7XG4gICAgICAgICAgICByZXR1cm4gdHJhbnMgJiYgdHJhbnMuZGIgPT09IGRiID8gdHJhbnMuX3Byb21pc2UobW9kZSwgZm4sIHdyaXRlTG9ja2VkKSA6IHRlbXBUcmFuc2FjdGlvbihtb2RlLCBbdGhpcy5uYW1lXSwgZm4pO1xuICAgICAgICB9LFxuICAgICAgICBfaWRic3RvcmU6IGZ1bmN0aW9uIGdldElEQk9iamVjdFN0b3JlKG1vZGUsIGZuLCB3cml0ZUxvY2tlZCkge1xuICAgICAgICAgICAgaWYgKGZha2UpIHJldHVybiBuZXcgUHJvbWlzZShmbik7IC8vIFNpbXBsaWZ5IHRoZSB3b3JrIGZvciBJbnRlbGxpc2Vuc2UvQ29kZSBjb21wbGV0aW9uLlxuICAgICAgICAgICAgdmFyIHRyYW5zID0gUFNELnRyYW5zLFxuICAgICAgICAgICAgICAgIHRhYmxlTmFtZSA9IHRoaXMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIHN1cHBseUlkYlN0b3JlKHJlc29sdmUsIHJlamVjdCwgdHJhbnMpIHtcbiAgICAgICAgICAgICAgICBmbihyZXNvbHZlLCByZWplY3QsIHRyYW5zLmlkYnRyYW5zLm9iamVjdFN0b3JlKHRhYmxlTmFtZSksIHRyYW5zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cmFucyAmJiB0cmFucy5kYiA9PT0gZGIgPyB0cmFucy5fcHJvbWlzZShtb2RlLCBzdXBwbHlJZGJTdG9yZSwgd3JpdGVMb2NrZWQpIDogdGVtcFRyYW5zYWN0aW9uKG1vZGUsIFt0aGlzLm5hbWVdLCBzdXBwbHlJZGJTdG9yZSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVGFibGUgUHVibGljIE1ldGhvZHNcbiAgICAgICAgLy9cbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoa2V5LCBjYikge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkYnN0b3JlKFJFQURPTkxZLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSkge1xuICAgICAgICAgICAgICAgIGZha2UgJiYgcmVzb2x2ZShzZWxmLnNjaGVtYS5pbnN0YW5jZVRlbXBsYXRlKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVxID0gaWRic3RvcmUuZ2V0KGtleSk7XG4gICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KTtcbiAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gd3JhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2VsZi5ob29rLnJlYWRpbmcuZmlyZShyZXEucmVzdWx0KSk7XG4gICAgICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgICAgIH0pLnRoZW4oY2IpO1xuICAgICAgICB9LFxuICAgICAgICB3aGVyZTogZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBXaGVyZUNsYXVzZSh0aGlzLCBpbmRleE5hbWUpO1xuICAgICAgICB9LFxuICAgICAgICBjb3VudDogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0NvbGxlY3Rpb24oKS5jb3VudChjYik7XG4gICAgICAgIH0sXG4gICAgICAgIG9mZnNldDogZnVuY3Rpb24gKG9mZnNldCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Db2xsZWN0aW9uKCkub2Zmc2V0KG9mZnNldCk7XG4gICAgICAgIH0sXG4gICAgICAgIGxpbWl0OiBmdW5jdGlvbiAobnVtUm93cykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Db2xsZWN0aW9uKCkubGltaXQobnVtUm93cyk7XG4gICAgICAgIH0sXG4gICAgICAgIHJldmVyc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvQ29sbGVjdGlvbigpLnJldmVyc2UoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmlsdGVyOiBmdW5jdGlvbiAoZmlsdGVyRnVuY3Rpb24pIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvQ29sbGVjdGlvbigpLmFuZChmaWx0ZXJGdW5jdGlvbik7XG4gICAgICAgIH0sXG4gICAgICAgIGVhY2g6IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Db2xsZWN0aW9uKCkuZWFjaChmbik7XG4gICAgICAgIH0sXG4gICAgICAgIHRvQXJyYXk6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Db2xsZWN0aW9uKCkudG9BcnJheShjYik7XG4gICAgICAgIH0sXG4gICAgICAgIG9yZGVyQnk6IGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLl9jb2xsQ2xhc3MobmV3IFdoZXJlQ2xhdXNlKHRoaXMsIGluZGV4KSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdG9Db2xsZWN0aW9uOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuX2NvbGxDbGFzcyhuZXcgV2hlcmVDbGF1c2UodGhpcykpO1xuICAgICAgICB9LFxuXG4gICAgICAgIG1hcFRvQ2xhc3M6IGZ1bmN0aW9uIChjb25zdHJ1Y3Rvciwgc3RydWN0dXJlKSB7XG4gICAgICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgICAgICAvLy8gICAgIE1hcCB0YWJsZSB0byBhIGphdmFzY3JpcHQgY29uc3RydWN0b3IgZnVuY3Rpb24uIE9iamVjdHMgcmV0dXJuZWQgZnJvbSB0aGUgZGF0YWJhc2Ugd2lsbCBiZSBpbnN0YW5jZXMgb2YgdGhpcyBjbGFzcywgbWFraW5nXG4gICAgICAgICAgICAvLy8gICAgIGl0IHBvc3NpYmxlIHRvIHRoZSBpbnN0YW5jZU9mIG9wZXJhdG9yIGFzIHdlbGwgYXMgZXh0ZW5kaW5nIHRoZSBjbGFzcyB1c2luZyBjb25zdHJ1Y3Rvci5wcm90b3R5cGUubWV0aG9kID0gZnVuY3Rpb24oKXsuLi59LlxuICAgICAgICAgICAgLy8vIDwvc3VtbWFyeT5cbiAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImNvbnN0cnVjdG9yXCI+Q29uc3RydWN0b3IgZnVuY3Rpb24gcmVwcmVzZW50aW5nIHRoZSBjbGFzcy48L3BhcmFtPlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic3RydWN0dXJlXCIgb3B0aW9uYWw9XCJ0cnVlXCI+SGVscHMgSURFIGNvZGUgY29tcGxldGlvbiBieSBrbm93aW5nIHRoZSBtZW1iZXJzIHRoYXQgb2JqZWN0cyBjb250YWluIGFuZCBub3QganVzdCB0aGUgaW5kZXhlcy4gQWxzb1xuICAgICAgICAgICAgLy8vIGtub3cgd2hhdCB0eXBlIGVhY2ggbWVtYmVyIGhhcy4gRXhhbXBsZToge25hbWU6IFN0cmluZywgZW1haWxBZGRyZXNzZXM6IFtTdHJpbmddLCBwYXNzd29yZH08L3BhcmFtPlxuICAgICAgICAgICAgdGhpcy5zY2hlbWEubWFwcGVkQ2xhc3MgPSBjb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgIHZhciBpbnN0YW5jZVRlbXBsYXRlID0gT2JqZWN0LmNyZWF0ZShjb25zdHJ1Y3Rvci5wcm90b3R5cGUpO1xuICAgICAgICAgICAgaWYgKHN0cnVjdHVyZSkge1xuICAgICAgICAgICAgICAgIC8vIHN0cnVjdHVyZSBhbmQgaW5zdGFuY2VUZW1wbGF0ZSBpcyBmb3IgSURFIGNvZGUgY29tcGV0aW9uIG9ubHkgd2hpbGUgY29uc3RydWN0b3IucHJvdG90eXBlIGlzIGZvciBhY3R1YWwgaW5oZXJpdGFuY2UuXG4gICAgICAgICAgICAgICAgYXBwbHlTdHJ1Y3R1cmUoaW5zdGFuY2VUZW1wbGF0ZSwgc3RydWN0dXJlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NoZW1hLmluc3RhbmNlVGVtcGxhdGUgPSBpbnN0YW5jZVRlbXBsYXRlO1xuXG4gICAgICAgICAgICAvLyBOb3csIHN1YnNjcmliZSB0byB0aGUgd2hlbihcInJlYWRpbmdcIikgZXZlbnQgdG8gbWFrZSBhbGwgb2JqZWN0cyB0aGF0IGNvbWUgb3V0IGZyb20gdGhpcyB0YWJsZSBpbmhlcml0IGZyb20gZ2l2ZW4gY2xhc3NcbiAgICAgICAgICAgIC8vIG5vIG1hdHRlciB3aGljaCBtZXRob2QgdG8gdXNlIGZvciByZWFkaW5nIChUYWJsZS5nZXQoKSBvciBUYWJsZS53aGVyZSguLi4pLi4uIClcbiAgICAgICAgICAgIHZhciByZWFkSG9vayA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9iaikgcmV0dXJuIG9iajsgLy8gTm8gdmFsaWQgb2JqZWN0LiAoVmFsdWUgaXMgbnVsbCkuIFJldHVybiBhcyBpcy5cbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYSBuZXcgb2JqZWN0IHRoYXQgZGVyaXZlcyBmcm9tIGNvbnN0cnVjdG9yOlxuICAgICAgICAgICAgICAgIHZhciByZXMgPSBPYmplY3QuY3JlYXRlKGNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG4gICAgICAgICAgICAgICAgLy8gQ2xvbmUgbWVtYmVyczpcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBtIGluIG9iaikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzT3duKG9iaiwgbSkpIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNbbV0gPSBvYmpbbV07XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgICAgICAgICAgICAgfXJldHVybiByZXM7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAodGhpcy5zY2hlbWEucmVhZEhvb2spIHtcbiAgICAgICAgICAgICAgICB0aGlzLmhvb2sucmVhZGluZy51bnN1YnNjcmliZSh0aGlzLnNjaGVtYS5yZWFkSG9vayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLnNjaGVtYS5yZWFkSG9vayA9IHJlYWRIb29rO1xuICAgICAgICAgICAgdGhpcy5ob29rKFwicmVhZGluZ1wiLCByZWFkSG9vayk7XG4gICAgICAgICAgICByZXR1cm4gY29uc3RydWN0b3I7XG4gICAgICAgIH0sXG4gICAgICAgIGRlZmluZUNsYXNzOiBmdW5jdGlvbiAoc3RydWN0dXJlKSB7XG4gICAgICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgICAgICAvLy8gICAgIERlZmluZSBhbGwgbWVtYmVycyBvZiB0aGUgY2xhc3MgdGhhdCByZXByZXNlbnRzIHRoZSB0YWJsZS4gVGhpcyB3aWxsIGhlbHAgY29kZSBjb21wbGV0aW9uIG9mIHdoZW4gb2JqZWN0cyBhcmUgcmVhZCBmcm9tIHRoZSBkYXRhYmFzZVxuICAgICAgICAgICAgLy8vICAgICBhcyB3ZWxsIGFzIG1ha2luZyBpdCBwb3NzaWJsZSB0byBleHRlbmQgdGhlIHByb3RvdHlwZSBvZiB0aGUgcmV0dXJuZWQgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAgICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic3RydWN0dXJlXCI+SGVscHMgSURFIGNvZGUgY29tcGxldGlvbiBieSBrbm93aW5nIHRoZSBtZW1iZXJzIHRoYXQgb2JqZWN0cyBjb250YWluIGFuZCBub3QganVzdCB0aGUgaW5kZXhlcy4gQWxzb1xuICAgICAgICAgICAgLy8vIGtub3cgd2hhdCB0eXBlIGVhY2ggbWVtYmVyIGhhcy4gRXhhbXBsZToge25hbWU6IFN0cmluZywgZW1haWxBZGRyZXNzZXM6IFtTdHJpbmddLCBwcm9wZXJ0aWVzOiB7c2hvZVNpemU6IE51bWJlcn19PC9wYXJhbT5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1hcFRvQ2xhc3MoRGV4aWUuZGVmaW5lQ2xhc3Moc3RydWN0dXJlKSwgc3RydWN0dXJlKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gV3JpdGVhYmxlVGFibGUgQ2xhc3MgKGV4dGVuZHMgVGFibGUpXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgZnVuY3Rpb24gV3JpdGVhYmxlVGFibGUobmFtZSwgdGFibGVTY2hlbWEsIGNvbGxDbGFzcykge1xuICAgICAgICBUYWJsZS5jYWxsKHRoaXMsIG5hbWUsIHRhYmxlU2NoZW1hLCBjb2xsQ2xhc3MgfHwgV3JpdGVhYmxlQ29sbGVjdGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gQnVsa0Vycm9ySGFuZGxlckNhdGNoQWxsKGVycm9yTGlzdCwgZG9uZSwgc3VwcG9ydEhvb2tzKSB7XG4gICAgICAgIHJldHVybiAoc3VwcG9ydEhvb2tzID8gaG9va2VkRXZlbnRSZWplY3RIYW5kbGVyIDogZXZlbnRSZWplY3RIYW5kbGVyKShmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZXJyb3JMaXN0LnB1c2goZSk7XG4gICAgICAgICAgICBkb25lICYmIGRvbmUoKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnVsa0RlbGV0ZShpZGJzdG9yZSwgdHJhbnMsIGtleXNPclR1cGxlcywgaGFzRGVsZXRlSG9vaywgZGVsZXRpbmdIb29rKSB7XG4gICAgICAgIC8vIElmIGhhc0RlbGV0ZUhvb2ssIGtleXNPclR1cGxlcyBtdXN0IGJlIGFuIGFycmF5IG9mIHR1cGxlczogW1trZXkxLCB2YWx1ZTJdLFtrZXkyLHZhbHVlMl0sLi4uXSxcbiAgICAgICAgLy8gZWxzZSBrZXlzT3JUdXBsZXMgbXVzdCBiZSBqdXN0IGFuIGFycmF5IG9mIGtleXM6IFtrZXkxLCBrZXkyLCAuLi5dLlxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIGxlbiA9IGtleXNPclR1cGxlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgbGFzdEl0ZW0gPSBsZW4gLSAxO1xuICAgICAgICAgICAgaWYgKGxlbiA9PT0gMCkgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICAgIGlmICghaGFzRGVsZXRlSG9vaykge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGlkYnN0b3JlLmRlbGV0ZShrZXlzT3JUdXBsZXNbaV0pO1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IHdyYXAoZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gbGFzdEl0ZW0pIHJlcS5vbnN1Y2Nlc3MgPSB3cmFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGhvb2tDdHgsXG4gICAgICAgICAgICAgICAgICAgIGVycm9ySGFuZGxlciA9IGhvb2tlZEV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzSGFuZGxlciA9IGhvb2tlZEV2ZW50U3VjY2Vzc0hhbmRsZXIobnVsbCk7XG4gICAgICAgICAgICAgICAgdHJ5Q2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBob29rQ3R4ID0geyBvbnN1Y2Nlc3M6IG51bGwsIG9uZXJyb3I6IG51bGwgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0dXBsZSA9IGtleXNPclR1cGxlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0aW5nSG9vay5jYWxsKGhvb2tDdHgsIHR1cGxlWzBdLCB0dXBsZVsxXSwgdHJhbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGlkYnN0b3JlLmRlbGV0ZSh0dXBsZVswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEuX2hvb2tDdHggPSBob29rQ3R4O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBlcnJvckhhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gbGFzdEl0ZW0pIHJlcS5vbnN1Y2Nlc3MgPSBob29rZWRFdmVudFN1Y2Nlc3NIYW5kbGVyKHJlc29sdmUpO2Vsc2UgcmVxLm9uc3VjY2VzcyA9IHN1Y2Nlc3NIYW5kbGVyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBob29rQ3R4Lm9uZXJyb3IgJiYgaG9va0N0eC5vbmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudW5jYXVnaHQoZGJVbmNhdWdodCk7XG4gICAgfVxuXG4gICAgZGVyaXZlKFdyaXRlYWJsZVRhYmxlKS5mcm9tKFRhYmxlKS5leHRlbmQoe1xuICAgICAgICBidWxrRGVsZXRlOiBmdW5jdGlvbiAoa2V5cyQkMSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaG9vay5kZWxldGluZy5maXJlID09PSBub3ApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faWRic3RvcmUoUkVBRFdSSVRFLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSwgdHJhbnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShidWxrRGVsZXRlKGlkYnN0b3JlLCB0cmFucywga2V5cyQkMSwgZmFsc2UsIG5vcCkpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53aGVyZSgnOmlkJykuYW55T2Yoa2V5cyQkMSkuZGVsZXRlKCkudGhlbihmdW5jdGlvbiAoKSB7fSk7IC8vIFJlc29sdmUgd2l0aCB1bmRlZmluZWQuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGJ1bGtQdXQ6IGZ1bmN0aW9uIChvYmplY3RzLCBrZXlzJCQxKSB7XG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faWRic3RvcmUoUkVBRFdSSVRFLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSkge1xuICAgICAgICAgICAgICAgIGlmICghaWRic3RvcmUua2V5UGF0aCAmJiAhX3RoaXMuc2NoZW1hLnByaW1LZXkuYXV0byAmJiAha2V5cyQkMSkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KFwiYnVsa1B1dCgpIHdpdGggbm9uLWluYm91bmQga2V5cyByZXF1aXJlcyBrZXlzIGFycmF5IGluIHNlY29uZCBhcmd1bWVudFwiKTtcbiAgICAgICAgICAgICAgICBpZiAoaWRic3RvcmUua2V5UGF0aCAmJiBrZXlzJCQxKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkQXJndW1lbnQoXCJidWxrUHV0KCk6IGtleXMgYXJndW1lbnQgaW52YWxpZCBvbiB0YWJsZXMgd2l0aCBpbmJvdW5kIGtleXNcIik7XG4gICAgICAgICAgICAgICAgaWYgKGtleXMkJDEgJiYga2V5cyQkMS5sZW5ndGggIT09IG9iamVjdHMubGVuZ3RoKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkQXJndW1lbnQoXCJBcmd1bWVudHMgb2JqZWN0cyBhbmQga2V5cyBtdXN0IGhhdmUgdGhlIHNhbWUgbGVuZ3RoXCIpO1xuICAgICAgICAgICAgICAgIGlmIChvYmplY3RzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHJlc29sdmUoKTsgLy8gQ2FsbGVyIHByb3ZpZGVkIGVtcHR5IGxpc3QuXG4gICAgICAgICAgICAgICAgdmFyIGRvbmUgPSBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvckxpc3QubGVuZ3RoID09PSAwKSByZXNvbHZlKHJlc3VsdCk7ZWxzZSByZWplY3QobmV3IEJ1bGtFcnJvcihfdGhpcy5uYW1lICsgJy5idWxrUHV0KCk6ICcgKyBlcnJvckxpc3QubGVuZ3RoICsgJyBvZiAnICsgbnVtT2JqcyArICcgb3BlcmF0aW9ucyBmYWlsZWQnLCBlcnJvckxpc3QpKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciByZXEsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yTGlzdCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBlcnJvckhhbmRsZXIsXG4gICAgICAgICAgICAgICAgICAgIG51bU9ianMgPSBvYmplY3RzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdGFibGUgPSBfdGhpcztcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuaG9vay5jcmVhdGluZy5maXJlID09PSBub3AgJiYgX3RoaXMuaG9vay51cGRhdGluZy5maXJlID09PSBub3ApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gU3RhbmRhcmQgQnVsayAobm8gJ2NyZWF0aW5nJyBvciAndXBkYXRpbmcnIGhvb2tzIHRvIGNhcmUgYWJvdXQpXG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIGVycm9ySGFuZGxlciA9IEJ1bGtFcnJvckhhbmRsZXJDYXRjaEFsbChlcnJvckxpc3QpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iamVjdHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEgPSBrZXlzJCQxID8gaWRic3RvcmUucHV0KG9iamVjdHNbaV0sIGtleXMkJDFbaV0pIDogaWRic3RvcmUucHV0KG9iamVjdHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBlcnJvckhhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBuZWVkIHRvIGNhdGNoIHN1Y2Nlc3Mgb3IgZXJyb3Igb24gdGhlIGxhc3Qgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIC8vIGFjY29yZGluZyB0byB0aGUgSURCIHNwZWMuXG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gQnVsa0Vycm9ySGFuZGxlckNhdGNoQWxsKGVycm9yTGlzdCwgZG9uZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBldmVudFN1Y2Nlc3NIYW5kbGVyKGRvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlZmZlY3RpdmVLZXlzID0ga2V5cyQkMSB8fCBpZGJzdG9yZS5rZXlQYXRoICYmIG9iamVjdHMubWFwKGZ1bmN0aW9uIChvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZ2V0QnlLZXlQYXRoKG8sIGlkYnN0b3JlLmtleVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2VuZXJhdGUgbWFwIG9mIHtba2V5XTogb2JqZWN0fVxuICAgICAgICAgICAgICAgICAgICB2YXIgb2JqZWN0TG9va3VwID0gZWZmZWN0aXZlS2V5cyAmJiBhcnJheVRvT2JqZWN0KGVmZmVjdGl2ZUtleXMsIGZ1bmN0aW9uIChrZXksIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBrZXkgIT0gbnVsbCAmJiBba2V5LCBvYmplY3RzW2ldXTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcm9taXNlID0gIWVmZmVjdGl2ZUtleXMgP1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEF1dG8taW5jcmVtZW50ZWQga2V5LWxlc3Mgb2JqZWN0cyBvbmx5IHdpdGhvdXQgYW55IGtleXMgYXJndW1lbnQuXG4gICAgICAgICAgICAgICAgICAgIHRhYmxlLmJ1bGtBZGQob2JqZWN0cykgOlxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEtleXMgcHJvdmlkZWQuIEVpdGhlciBhcyBpbmJvdW5kIGluIHByb3ZpZGVkIG9iamVjdHMsIG9yIGFzIGEga2V5cyBhcmd1bWVudC5cbiAgICAgICAgICAgICAgICAgICAgLy8gQmVnaW4gd2l0aCB1cGRhdGluZyB0aG9zZSB0aGF0IGV4aXN0cyBpbiBEQjpcbiAgICAgICAgICAgICAgICAgICAgdGFibGUud2hlcmUoJzppZCcpLmFueU9mKGVmZmVjdGl2ZUtleXMuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBrZXkgIT0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfSkpLm1vZGlmeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gb2JqZWN0TG9va3VwW3RoaXMucHJpbUtleV07XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3RMb29rdXBbdGhpcy5wcmltS2V5XSA9IG51bGw7IC8vIE1hcmsgYXMgXCJkb24ndCBhZGQgdGhpc1wiXG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKE1vZGlmeUVycm9yLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JMaXN0ID0gZS5mYWlsdXJlczsgLy8gTm8gbmVlZCB0byBjb25jYXQgaGVyZS4gVGhlc2UgYXJlIHRoZSBmaXJzdCBlcnJvcnMgYWRkZWQuXG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm93LCBsZXQncyBleGFtaW5lIHdoaWNoIGl0ZW1zIGRpZG50IGV4aXN0IHNvIHdlIGNhbiBhZGQgdGhlbTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmpzVG9BZGQgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzVG9BZGQgPSBrZXlzJCQxICYmIFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSXRlcmF0ZSBiYWNrd2FyZHMuIFdoeT8gQmVjYXVzZSBpZiBzYW1lIGtleSB3YXMgdXNlZCB0d2ljZSwganVzdCBhZGQgdGhlIGxhc3Qgb25lLlxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IGVmZmVjdGl2ZUtleXMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gZWZmZWN0aXZlS2V5c1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ID09IG51bGwgfHwgb2JqZWN0TG9va3VwW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Jqc1RvQWRkLnB1c2gob2JqZWN0c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMkJDEgJiYga2V5c1RvQWRkLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleSAhPSBudWxsKSBvYmplY3RMb29rdXBba2V5XSA9IG51bGw7IC8vIE1hcmsgYXMgXCJkb250IGFkZCBhZ2FpblwiXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGl0ZW1zIGFyZSBpbiByZXZlcnNlIG9yZGVyIHNvIHJldmVyc2UgdGhlbSBiZWZvcmUgYWRkaW5nLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ291bGQgYmUgaW1wb3J0YW50IGluIG9yZGVyIHRvIGdldCBhdXRvLWluY3JlbWVudGVkIGtleXMgdGhlIHdheSB0aGUgY2FsbGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB3b3VsZCBleHBlY3QuIENvdWxkIGhhdmUgdXNlZCB1bnNoaWZ0IGluc3RlYWQgb2YgcHVzaCgpL3JldmVyc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJ1dDogaHR0cDovL2pzcGVyZi5jb20vdW5zaGlmdC12cy1yZXZlcnNlXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmpzVG9BZGQucmV2ZXJzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5cyQkMSAmJiBrZXlzVG9BZGQucmV2ZXJzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRhYmxlLmJ1bGtBZGQob2Jqc1RvQWRkLCBrZXlzVG9BZGQpO1xuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChsYXN0QWRkZWRLZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlc29sdmUgd2l0aCBrZXkgb2YgdGhlIGxhc3Qgb2JqZWN0IGluIGdpdmVuIGFyZ3VtZW50cyB0byBidWxrUHV0KCk6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGFzdEVmZmVjdGl2ZUtleSA9IGVmZmVjdGl2ZUtleXNbZWZmZWN0aXZlS2V5cy5sZW5ndGggLSAxXTsgLy8gS2V5IHdhcyBwcm92aWRlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBsYXN0RWZmZWN0aXZlS2V5ICE9IG51bGwgPyBsYXN0RWZmZWN0aXZlS2V5IDogbGFzdEFkZGVkS2V5O1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlLnRoZW4oZG9uZSkuY2F0Y2goQnVsa0Vycm9yLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29uY2F0IGZhaWx1cmUgZnJvbSBNb2RpZnlFcnJvciBhbmQgcmVqZWN0IHVzaW5nIG91ciAnZG9uZScgbWV0aG9kLlxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JMaXN0ID0gZXJyb3JMaXN0LmNvbmNhdChlLmZhaWx1cmVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCBcImxvY2tlZFwiKTsgLy8gSWYgY2FsbGVkIGZyb20gdHJhbnNhY3Rpb24gc2NvcGUsIGxvY2sgdHJhbnNhY3Rpb24gdGlsIGFsbCBzdGVwcyBhcmUgZG9uZS5cbiAgICAgICAgfSxcbiAgICAgICAgYnVsa0FkZDogZnVuY3Rpb24gKG9iamVjdHMsIGtleXMkJDEpIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcyxcbiAgICAgICAgICAgICAgICBjcmVhdGluZ0hvb2sgPSB0aGlzLmhvb2suY3JlYXRpbmcuZmlyZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pZGJzdG9yZShSRUFEV1JJVEUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlLCB0cmFucykge1xuICAgICAgICAgICAgICAgIGlmICghaWRic3RvcmUua2V5UGF0aCAmJiAhc2VsZi5zY2hlbWEucHJpbUtleS5hdXRvICYmICFrZXlzJCQxKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkQXJndW1lbnQoXCJidWxrQWRkKCkgd2l0aCBub24taW5ib3VuZCBrZXlzIHJlcXVpcmVzIGtleXMgYXJyYXkgaW4gc2Vjb25kIGFyZ3VtZW50XCIpO1xuICAgICAgICAgICAgICAgIGlmIChpZGJzdG9yZS5rZXlQYXRoICYmIGtleXMkJDEpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcImJ1bGtBZGQoKToga2V5cyBhcmd1bWVudCBpbnZhbGlkIG9uIHRhYmxlcyB3aXRoIGluYm91bmQga2V5c1wiKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5cyQkMSAmJiBrZXlzJCQxLmxlbmd0aCAhPT0gb2JqZWN0cy5sZW5ndGgpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcIkFyZ3VtZW50cyBvYmplY3RzIGFuZCBrZXlzIG11c3QgaGF2ZSB0aGUgc2FtZSBsZW5ndGhcIik7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdHMubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzb2x2ZSgpOyAvLyBDYWxsZXIgcHJvdmlkZWQgZW1wdHkgbGlzdC5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBkb25lKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3JMaXN0Lmxlbmd0aCA9PT0gMCkgcmVzb2x2ZShyZXN1bHQpO2Vsc2UgcmVqZWN0KG5ldyBCdWxrRXJyb3Ioc2VsZi5uYW1lICsgJy5idWxrQWRkKCk6ICcgKyBlcnJvckxpc3QubGVuZ3RoICsgJyBvZiAnICsgbnVtT2JqcyArICcgb3BlcmF0aW9ucyBmYWlsZWQnLCBlcnJvckxpc3QpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJlcSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JMaXN0ID0gW10sXG4gICAgICAgICAgICAgICAgICAgIGVycm9ySGFuZGxlcixcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0hhbmRsZXIsXG4gICAgICAgICAgICAgICAgICAgIG51bU9ianMgPSBvYmplY3RzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAoY3JlYXRpbmdIb29rICE9PSBub3ApIHtcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gVGhlcmUgYXJlIHN1YnNjcmliZXJzIHRvIGhvb2soJ2NyZWF0aW5nJylcbiAgICAgICAgICAgICAgICAgICAgLy8gTXVzdCBiZWhhdmUgYXMgZG9jdW1lbnRlZC5cbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleVBhdGggPSBpZGJzdG9yZS5rZXlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaG9va0N0eDtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JIYW5kbGVyID0gQnVsa0Vycm9ySGFuZGxlckNhdGNoQWxsKGVycm9yTGlzdCwgbnVsbCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NIYW5kbGVyID0gaG9va2VkRXZlbnRTdWNjZXNzSGFuZGxlcihudWxsKTtcblxuICAgICAgICAgICAgICAgICAgICB0cnlDYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iamVjdHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaG9va0N0eCA9IHsgb25lcnJvcjogbnVsbCwgb25zdWNjZXNzOiBudWxsIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IGtleXMkJDEgJiYga2V5cyQkMVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2JqID0gb2JqZWN0c1tpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWZmZWN0aXZlS2V5ID0ga2V5cyQkMSA/IGtleSA6IGtleVBhdGggPyBnZXRCeUtleVBhdGgob2JqLCBrZXlQYXRoKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5VG9Vc2UgPSBjcmVhdGluZ0hvb2suY2FsbChob29rQ3R4LCBlZmZlY3RpdmVLZXksIG9iaiwgdHJhbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlZmZlY3RpdmVLZXkgPT0gbnVsbCAmJiBrZXlUb1VzZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXlQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmogPSBkZWVwQ2xvbmUob2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldEJ5S2V5UGF0aChvYmosIGtleVBhdGgsIGtleVRvVXNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleSA9IGtleVRvVXNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcSA9IGtleSAhPSBudWxsID8gaWRic3RvcmUuYWRkKG9iaiwga2V5KSA6IGlkYnN0b3JlLmFkZChvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5faG9va0N0eCA9IGhvb2tDdHg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGkgPCBsIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGVycm9ySGFuZGxlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGhvb2tDdHgub25zdWNjZXNzKSByZXEub25zdWNjZXNzID0gc3VjY2Vzc0hhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBob29rQ3R4Lm9uZXJyb3IgJiYgaG9va0N0eC5vbmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gQnVsa0Vycm9ySGFuZGxlckNhdGNoQWxsKGVycm9yTGlzdCwgZG9uZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBob29rZWRFdmVudFN1Y2Nlc3NIYW5kbGVyKGRvbmUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0YW5kYXJkIEJ1bGsgKG5vICdjcmVhdGluZycgaG9vayB0byBjYXJlIGFib3V0KVxuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICBlcnJvckhhbmRsZXIgPSBCdWxrRXJyb3JIYW5kbGVyQ2F0Y2hBbGwoZXJyb3JMaXN0KTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmplY3RzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxID0ga2V5cyQkMSA/IGlkYnN0b3JlLmFkZChvYmplY3RzW2ldLCBrZXlzJCQxW2ldKSA6IGlkYnN0b3JlLmFkZChvYmplY3RzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZXJyb3JIYW5kbGVyO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIC8vIE9ubHkgbmVlZCB0byBjYXRjaCBzdWNjZXNzIG9yIGVycm9yIG9uIHRoZSBsYXN0IG9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAvLyBhY2NvcmRpbmcgdG8gdGhlIElEQiBzcGVjLlxuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IEJ1bGtFcnJvckhhbmRsZXJDYXRjaEFsbChlcnJvckxpc3QsIGRvbmUpO1xuICAgICAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZXZlbnRTdWNjZXNzSGFuZGxlcihkb25lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgYWRkOiBmdW5jdGlvbiAob2JqLCBrZXkpIHtcbiAgICAgICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgICAgIC8vLyAgIEFkZCBhbiBvYmplY3QgdG8gdGhlIGRhdGFiYXNlLiBJbiBjYXNlIGFuIG9iamVjdCB3aXRoIHNhbWUgcHJpbWFyeSBrZXkgYWxyZWFkeSBleGlzdHMsIHRoZSBvYmplY3Qgd2lsbCBub3QgYmUgYWRkZWQuXG4gICAgICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwib2JqXCIgdHlwZT1cIk9iamVjdFwiPkEgamF2YXNjcmlwdCBvYmplY3QgdG8gaW5zZXJ0PC9wYXJhbT5cbiAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImtleVwiIG9wdGlvbmFsPVwidHJ1ZVwiPlByaW1hcnkga2V5PC9wYXJhbT5cbiAgICAgICAgICAgIHZhciBjcmVhdGluZ0hvb2sgPSB0aGlzLmhvb2suY3JlYXRpbmcuZmlyZTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pZGJzdG9yZShSRUFEV1JJVEUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlLCB0cmFucykge1xuICAgICAgICAgICAgICAgIHZhciBob29rQ3R4ID0geyBvbnN1Y2Nlc3M6IG51bGwsIG9uZXJyb3I6IG51bGwgfTtcbiAgICAgICAgICAgICAgICBpZiAoY3JlYXRpbmdIb29rICE9PSBub3ApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVmZmVjdGl2ZUtleSA9IGtleSAhPSBudWxsID8ga2V5IDogaWRic3RvcmUua2V5UGF0aCA/IGdldEJ5S2V5UGF0aChvYmosIGlkYnN0b3JlLmtleVBhdGgpIDogdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5VG9Vc2UgPSBjcmVhdGluZ0hvb2suY2FsbChob29rQ3R4LCBlZmZlY3RpdmVLZXksIG9iaiwgdHJhbnMpOyAvLyBBbGxvdyBzdWJzY3JpYmVycyB0byB3aGVuKFwiY3JlYXRpbmdcIikgdG8gZ2VuZXJhdGUgdGhlIGtleS5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGVmZmVjdGl2ZUtleSA9PSBudWxsICYmIGtleVRvVXNlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVzaW5nIFwiPT1cIiBhbmQgXCIhPVwiIHRvIGNoZWNrIGZvciBlaXRoZXIgbnVsbCBvciB1bmRlZmluZWQhXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaWRic3RvcmUua2V5UGF0aCkgc2V0QnlLZXlQYXRoKG9iaiwgaWRic3RvcmUua2V5UGF0aCwga2V5VG9Vc2UpO2Vsc2Uga2V5ID0ga2V5VG9Vc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGtleSAhPSBudWxsID8gaWRic3RvcmUuYWRkKG9iaiwga2V5KSA6IGlkYnN0b3JlLmFkZChvYmopO1xuICAgICAgICAgICAgICAgICAgICByZXEuX2hvb2tDdHggPSBob29rQ3R4O1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGhvb2tlZEV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gaG9va2VkRXZlbnRTdWNjZXNzSGFuZGxlcihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUT0RPOiBSZW1vdmUgdGhlc2UgdHdvIGxpbmVzIGluIG5leHQgbWFqb3IgcmVsZWFzZSAoMi4wPylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEl0J3Mgbm8gZ29vZCBwcmFjdGljZSB0byBoYXZlIHNpZGUgZWZmZWN0cyBvbiBwcm92aWRlZCBwYXJhbWV0ZXJzXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5UGF0aCA9IGlkYnN0b3JlLmtleVBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5UGF0aCkgc2V0QnlLZXlQYXRoKG9iaiwga2V5UGF0aCwgcmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaG9va0N0eC5vbmVycm9yKSBob29rQ3R4Lm9uZXJyb3IoZSk7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcHV0OiBmdW5jdGlvbiAob2JqLCBrZXkpIHtcbiAgICAgICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgICAgIC8vLyAgIEFkZCBhbiBvYmplY3QgdG8gdGhlIGRhdGFiYXNlIGJ1dCBpbiBjYXNlIGFuIG9iamVjdCB3aXRoIHNhbWUgcHJpbWFyeSBrZXkgYWxyZWFkIGV4aXN0cywgdGhlIGV4aXN0aW5nIG9uZSB3aWxsIGdldCB1cGRhdGVkLlxuICAgICAgICAgICAgLy8vIDwvc3VtbWFyeT5cbiAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cIm9ialwiIHR5cGU9XCJPYmplY3RcIj5BIGphdmFzY3JpcHQgb2JqZWN0IHRvIGluc2VydCBvciB1cGRhdGU8L3BhcmFtPlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwia2V5XCIgb3B0aW9uYWw9XCJ0cnVlXCI+UHJpbWFyeSBrZXk8L3BhcmFtPlxuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgICAgIGNyZWF0aW5nSG9vayA9IHRoaXMuaG9vay5jcmVhdGluZy5maXJlLFxuICAgICAgICAgICAgICAgIHVwZGF0aW5nSG9vayA9IHRoaXMuaG9vay51cGRhdGluZy5maXJlO1xuICAgICAgICAgICAgaWYgKGNyZWF0aW5nSG9vayAhPT0gbm9wIHx8IHVwZGF0aW5nSG9vayAhPT0gbm9wKSB7XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyBQZW9wbGUgbGlzdGVucyB0byB3aGVuKFwiY3JlYXRpbmdcIikgb3Igd2hlbihcInVwZGF0aW5nXCIpIGV2ZW50cyFcbiAgICAgICAgICAgICAgICAvLyBXZSBtdXN0IGtub3cgd2hldGhlciB0aGUgcHV0IG9wZXJhdGlvbiByZXN1bHRzIGluIGFuIENSRUFURSBvciBVUERBVEUuXG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fdHJhbnMoUkVBRFdSSVRFLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0LCB0cmFucykge1xuICAgICAgICAgICAgICAgICAgICAvLyBTaW5jZSBrZXkgaXMgb3B0aW9uYWwsIG1ha2Ugc3VyZSB3ZSBnZXQgaXQgZnJvbSBvYmogaWYgbm90IHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgICAgIHZhciBlZmZlY3RpdmVLZXkgPSBrZXkgIT09IHVuZGVmaW5lZCA/IGtleSA6IHNlbGYuc2NoZW1hLnByaW1LZXkua2V5UGF0aCAmJiBnZXRCeUtleVBhdGgob2JqLCBzZWxmLnNjaGVtYS5wcmltS2V5LmtleVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZWZmZWN0aXZlS2V5ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiPT0gbnVsbFwiIG1lYW5zIGNoZWNraW5nIGZvciBlaXRoZXIgbnVsbCBvciB1bmRlZmluZWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBwcmltYXJ5IGtleS4gTXVzdCB1c2UgYWRkKCkuXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmFkZChvYmopLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFByaW1hcnkga2V5IGV4aXN0LiBMb2NrIHRyYW5zYWN0aW9uIGFuZCB0cnkgbW9kaWZ5aW5nIGV4aXN0aW5nLiBJZiBub3RoaW5nIG1vZGlmaWVkLCBjYWxsIGFkZCgpLlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnMuX2xvY2soKTsgLy8gTmVlZGVkIGJlY2F1c2Ugb3BlcmF0aW9uIGlzIHNwbGl0dGVkIGludG8gbW9kaWZ5KCkgYW5kIGFkZCgpLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY2xvbmUgb2JqIGJlZm9yZSB0aGlzIGFzeW5jIGNhbGwuIElmIGNhbGxlciBtb2RpZmllcyBvYmogdGhlIGxpbmUgYWZ0ZXIgcHV0KCksIHRoZSBJREIgc3BlYyByZXF1aXJlcyB0aGF0IGl0IHNob3VsZCBub3QgYWZmZWN0IG9wZXJhdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgICAgIG9iaiA9IGRlZXBDbG9uZShvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZi53aGVyZShcIjppZFwiKS5lcXVhbHMoZWZmZWN0aXZlS2V5KS5tb2RpZnkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJlcGxhY2UgZXh0aXN0aW5nIHZhbHVlIHdpdGggb3VyIG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIENSVUQgZXZlbnQgZmlyaW5nIGhhbmRsZWQgaW4gV3JpdGVhYmxlQ29sbGVjdGlvbi5tb2RpZnkoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBvYmo7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uIChjb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBPYmplY3QncyBrZXkgd2FzIG5vdCBmb3VuZC4gQWRkIHRoZSBvYmplY3QgaW5zdGVhZC5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ1JVRCBldmVudCBmaXJpbmcgd2lsbCBiZSBkb25lIGluIGFkZCgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLmFkZChvYmosIGtleSk7IC8vIFJlc29sdmluZyB3aXRoIGFub3RoZXIgUHJvbWlzZS4gUmV0dXJuZWQgUHJvbWlzZSB3aWxsIHRoZW4gcmVzb2x2ZSB3aXRoIHRoZSBuZXcga2V5LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlZmZlY3RpdmVLZXk7IC8vIFJlc29sdmUgd2l0aCB0aGUgcHJvdmlkZWQga2V5LlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmZpbmFsbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zLl91bmxvY2soKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBVc2UgdGhlIHN0YW5kYXJkIElEQiBwdXQoKSBtZXRob2QuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkYnN0b3JlKFJFQURXUklURSwgZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGtleSAhPT0gdW5kZWZpbmVkID8gaWRic3RvcmUucHV0KG9iaiwga2V5KSA6IGlkYnN0b3JlLnB1dChvYmopO1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5UGF0aCA9IGlkYnN0b3JlLmtleVBhdGg7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5UGF0aCkgc2V0QnlLZXlQYXRoKG9iaiwga2V5UGF0aCwgZXYudGFyZ2V0LnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcS5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgICdkZWxldGUnOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJrZXlcIj5QcmltYXJ5IGtleSBvZiB0aGUgb2JqZWN0IHRvIGRlbGV0ZTwvcGFyYW0+XG4gICAgICAgICAgICBpZiAodGhpcy5ob29rLmRlbGV0aW5nLnN1YnNjcmliZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIC8vIFBlb3BsZSBsaXN0ZW5zIHRvIHdoZW4oXCJkZWxldGluZ1wiKSBldmVudC4gTXVzdCBpbXBsZW1lbnQgZGVsZXRlIHVzaW5nIFdyaXRlYWJsZUNvbGxlY3Rpb24uZGVsZXRlKCkgdGhhdCB3aWxsXG4gICAgICAgICAgICAgICAgLy8gY2FsbCB0aGUgQ1JVRCBldmVudC4gT25seSBXcml0ZWFibGVDb2xsZWN0aW9uLmRlbGV0ZSgpIHdpbGwga25vdyB3aGV0aGVyIGFuIG9iamVjdCB3YXMgYWN0dWFsbHkgZGVsZXRlZC5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53aGVyZShcIjppZFwiKS5lcXVhbHMoa2V5KS5kZWxldGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTm8gb25lIGxpc3RlbnMuIFVzZSBzdGFuZGFyZCBJREIgZGVsZXRlKCkgbWV0aG9kLlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9pZGJzdG9yZShSRUFEV1JJVEUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXEgPSBpZGJzdG9yZS5kZWxldGUoa2V5KTtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVxLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgY2xlYXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmhvb2suZGVsZXRpbmcuc3Vic2NyaWJlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gUGVvcGxlIGxpc3RlbnMgdG8gd2hlbihcImRlbGV0aW5nXCIpIGV2ZW50LiBNdXN0IGltcGxlbWVudCBkZWxldGUgdXNpbmcgV3JpdGVhYmxlQ29sbGVjdGlvbi5kZWxldGUoKSB0aGF0IHdpbGxcbiAgICAgICAgICAgICAgICAvLyBjYWxsIHRoZSBDUlVEIGV2ZW50LiBPbmx5IFdyaXRlYWJsZUNvbGxlY3Rpb24uZGVsZXRlKCkgd2lsbCBrbm93cyB3aGljaCBvYmplY3RzIHRoYXQgYXJlIGFjdHVhbGx5IGRlbGV0ZWQuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Db2xsZWN0aW9uKCkuZGVsZXRlKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9pZGJzdG9yZShSRUFEV1JJVEUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByZXEgPSBpZGJzdG9yZS5jbGVhcigpO1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXEucmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGU6IGZ1bmN0aW9uIChrZXlPck9iamVjdCwgbW9kaWZpY2F0aW9ucykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtb2RpZmljYXRpb25zICE9PSAnb2JqZWN0JyB8fCBpc0FycmF5KG1vZGlmaWNhdGlvbnMpKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkQXJndW1lbnQoXCJNb2RpZmljYXRpb25zIG11c3QgYmUgYW4gb2JqZWN0LlwiKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2Yga2V5T3JPYmplY3QgPT09ICdvYmplY3QnICYmICFpc0FycmF5KGtleU9yT2JqZWN0KSkge1xuICAgICAgICAgICAgICAgIC8vIG9iamVjdCB0byBtb2RpZnkuIEFsc28gbW9kaWZ5IGdpdmVuIG9iamVjdCB3aXRoIHRoZSBtb2RpZmljYXRpb25zOlxuICAgICAgICAgICAgICAgIGtleXMobW9kaWZpY2F0aW9ucykuZm9yRWFjaChmdW5jdGlvbiAoa2V5UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBzZXRCeUtleVBhdGgoa2V5T3JPYmplY3QsIGtleVBhdGgsIG1vZGlmaWNhdGlvbnNba2V5UGF0aF0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBnZXRCeUtleVBhdGgoa2V5T3JPYmplY3QsIHRoaXMuc2NoZW1hLnByaW1LZXkua2V5UGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKGtleSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gcmVqZWN0aW9uKG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcIkdpdmVuIG9iamVjdCBkb2VzIG5vdCBjb250YWluIGl0cyBwcmltYXJ5IGtleVwiKSwgZGJVbmNhdWdodCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud2hlcmUoXCI6aWRcIikuZXF1YWxzKGtleSkubW9kaWZ5KG1vZGlmaWNhdGlvbnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBrZXkgdG8gbW9kaWZ5XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMud2hlcmUoXCI6aWRcIikuZXF1YWxzKGtleU9yT2JqZWN0KS5tb2RpZnkobW9kaWZpY2F0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIC8vIFRyYW5zYWN0aW9uIENsYXNzXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgZnVuY3Rpb24gVHJhbnNhY3Rpb24obW9kZSwgc3RvcmVOYW1lcywgZGJzY2hlbWEsIHBhcmVudCkge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgIC8vLyAgICBUcmFuc2FjdGlvbiBjbGFzcy4gUmVwcmVzZW50cyBhIGRhdGFiYXNlIHRyYW5zYWN0aW9uLiBBbGwgb3BlcmF0aW9ucyBvbiBkYiBnb2VzIHRocm91Z2ggYSBUcmFuc2FjdGlvbi5cbiAgICAgICAgLy8vIDwvc3VtbWFyeT5cbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwibW9kZVwiIHR5cGU9XCJTdHJpbmdcIj5Bbnkgb2YgXCJyZWFkd3JpdGVcIiBvciBcInJlYWRvbmx5XCI8L3BhcmFtPlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJzdG9yZU5hbWVzXCIgdHlwZT1cIkFycmF5XCI+QXJyYXkgb2YgdGFibGUgbmFtZXMgdG8gb3BlcmF0ZSBvbjwvcGFyYW0+XG4gICAgICAgIHRoaXMuZGIgPSBkYjtcbiAgICAgICAgdGhpcy5tb2RlID0gbW9kZTtcbiAgICAgICAgdGhpcy5zdG9yZU5hbWVzID0gc3RvcmVOYW1lcztcbiAgICAgICAgdGhpcy5pZGJ0cmFucyA9IG51bGw7XG4gICAgICAgIHRoaXMub24gPSBFdmVudHModGhpcywgXCJjb21wbGV0ZVwiLCBcImVycm9yXCIsIFwiYWJvcnRcIik7XG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50IHx8IG51bGw7XG4gICAgICAgIHRoaXMuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fdGFibGVzID0gbnVsbDtcbiAgICAgICAgdGhpcy5fcmVjdWxvY2sgPSAwO1xuICAgICAgICB0aGlzLl9ibG9ja2VkRnVuY3MgPSBbXTtcbiAgICAgICAgdGhpcy5fcHNkID0gbnVsbDtcbiAgICAgICAgdGhpcy5fZGJzY2hlbWEgPSBkYnNjaGVtYTtcbiAgICAgICAgdGhpcy5fcmVzb2x2ZSA9IG51bGw7XG4gICAgICAgIHRoaXMuX3JlamVjdCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2NvbXBsZXRpb24gPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBfdGhpczIuX3Jlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICAgICAgX3RoaXMyLl9yZWplY3QgPSByZWplY3Q7XG4gICAgICAgIH0pLnVuY2F1Z2h0KGRiVW5jYXVnaHQpO1xuXG4gICAgICAgIHRoaXMuX2NvbXBsZXRpb24udGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBfdGhpczIub24uY29tcGxldGUuZmlyZSgpO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgX3RoaXMyLm9uLmVycm9yLmZpcmUoZSk7XG4gICAgICAgICAgICBfdGhpczIucGFyZW50ID8gX3RoaXMyLnBhcmVudC5fcmVqZWN0KGUpIDogX3RoaXMyLmFjdGl2ZSAmJiBfdGhpczIuaWRidHJhbnMgJiYgX3RoaXMyLmlkYnRyYW5zLmFib3J0KCk7XG4gICAgICAgICAgICBfdGhpczIuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0aW9uKGUpOyAvLyBJbmRpY2F0ZSB3ZSBhY3R1YWxseSBETyBOT1QgY2F0Y2ggdGhpcyBlcnJvci5cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJvcHMoVHJhbnNhY3Rpb24ucHJvdG90eXBlLCB7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRyYW5zYWN0aW9uIFByb3RlY3RlZCBNZXRob2RzIChub3QgcmVxdWlyZWQgYnkgQVBJIHVzZXJzLCBidXQgbmVlZGVkIGludGVybmFsbHkgYW5kIGV2ZW50dWFsbHkgYnkgZGV4aWUgZXh0ZW5zaW9ucylcbiAgICAgICAgLy9cbiAgICAgICAgX2xvY2s6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGFzc2VydCghUFNELmdsb2JhbCk7IC8vIExvY2tpbmcgYW5kIHVubG9ja2luZyByZXVpcmVzIHRvIGJlIHdpdGhpbiBhIFBTRCBzY29wZS5cbiAgICAgICAgICAgIC8vIFRlbXBvcmFyeSBzZXQgYWxsIHJlcXVlc3RzIGludG8gYSBwZW5kaW5nIHF1ZXVlIGlmIHRoZXkgYXJlIGNhbGxlZCBiZWZvcmUgZGF0YWJhc2UgaXMgcmVhZHkuXG4gICAgICAgICAgICArK3RoaXMuX3JlY3Vsb2NrOyAvLyBSZWN1cnNpdmUgcmVhZC93cml0ZSBsb2NrIHBhdHRlcm4gdXNpbmcgUFNEIChQcm9taXNlIFNwZWNpZmljIERhdGEpIGluc3RlYWQgb2YgVExTIChUaHJlYWQgTG9jYWwgU3RvcmFnZSlcbiAgICAgICAgICAgIGlmICh0aGlzLl9yZWN1bG9jayA9PT0gMSAmJiAhUFNELmdsb2JhbCkgUFNELmxvY2tPd25lckZvciA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcbiAgICAgICAgX3VubG9jazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0KCFQU0QuZ2xvYmFsKTsgLy8gTG9ja2luZyBhbmQgdW5sb2NraW5nIHJldWlyZXMgdG8gYmUgd2l0aGluIGEgUFNEIHNjb3BlLlxuICAgICAgICAgICAgaWYgKC0tdGhpcy5fcmVjdWxvY2sgPT09IDApIHtcbiAgICAgICAgICAgICAgICBpZiAoIVBTRC5nbG9iYWwpIFBTRC5sb2NrT3duZXJGb3IgPSBudWxsO1xuICAgICAgICAgICAgICAgIHdoaWxlICh0aGlzLl9ibG9ja2VkRnVuY3MubGVuZ3RoID4gMCAmJiAhdGhpcy5fbG9ja2VkKCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuQW5kUFNEID0gdGhpcy5fYmxvY2tlZEZ1bmNzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB1c2VQU0QoZm5BbmRQU0RbMV0sIGZuQW5kUFNEWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcbiAgICAgICAgX2xvY2tlZDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gQ2hlY2tzIGlmIGFueSB3cml0ZS1sb2NrIGlzIGFwcGxpZWQgb24gdGhpcyB0cmFuc2FjdGlvbi5cbiAgICAgICAgICAgIC8vIFRvIHNpbXBsaWZ5IHRoZSBEZXhpZSBBUEkgZm9yIGV4dGVuc2lvbiBpbXBsZW1lbnRhdGlvbnMsIHdlIHN1cHBvcnQgcmVjdXJzaXZlIGxvY2tzLlxuICAgICAgICAgICAgLy8gVGhpcyBpcyBhY2NvbXBsaXNoZWQgYnkgdXNpbmcgXCJQcm9taXNlIFNwZWNpZmljIERhdGFcIiAoUFNEKS5cbiAgICAgICAgICAgIC8vIFBTRCBkYXRhIGlzIGJvdW5kIHRvIGEgUHJvbWlzZSBhbmQgYW55IGNoaWxkIFByb21pc2UgZW1pdHRlZCB0aHJvdWdoIHRoZW4oKSBvciByZXNvbHZlKCBuZXcgUHJvbWlzZSgpICkuXG4gICAgICAgICAgICAvLyBQU0QgaXMgbG9jYWwgdG8gY29kZSBleGVjdXRpbmcgb24gdG9wIG9mIHRoZSBjYWxsIHN0YWNrcyBvZiBhbnkgb2YgYW55IGNvZGUgZXhlY3V0ZWQgYnkgUHJvbWlzZSgpOlxuICAgICAgICAgICAgLy8gICAgICAgICAqIGNhbGxiYWNrIGdpdmVuIHRvIHRoZSBQcm9taXNlKCkgY29uc3RydWN0b3IgIChmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KXsuLi59KVxuICAgICAgICAgICAgLy8gICAgICAgICAqIGNhbGxiYWNrcyBnaXZlbiB0byB0aGVuKCkvY2F0Y2goKS9maW5hbGx5KCkgbWV0aG9kcyAoZnVuY3Rpb24gKHZhbHVlKXsuLi59KVxuICAgICAgICAgICAgLy8gSWYgY3JlYXRpbmcgYSBuZXcgaW5kZXBlbmRhbnQgUHJvbWlzZSBpbnN0YW5jZSBmcm9tIHdpdGhpbiBhIFByb21pc2UgY2FsbCBzdGFjaywgdGhlIG5ldyBQcm9taXNlIHdpbGwgZGVyaXZlIHRoZSBQU0QgZnJvbSB0aGUgY2FsbCBzdGFjayBvZiB0aGUgcGFyZW50IFByb21pc2UuXG4gICAgICAgICAgICAvLyBEZXJpdmF0aW9uIGlzIGRvbmUgc28gdGhhdCB0aGUgaW5uZXIgUFNEIF9fcHJvdG9fXyBwb2ludHMgdG8gdGhlIG91dGVyIFBTRC5cbiAgICAgICAgICAgIC8vIFBTRC5sb2NrT3duZXJGb3Igd2lsbCBwb2ludCB0byBjdXJyZW50IHRyYW5zYWN0aW9uIG9iamVjdCBpZiB0aGUgY3VycmVudGx5IGV4ZWN1dGluZyBQU0Qgc2NvcGUgb3ducyB0aGUgbG9jay5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWN1bG9jayAmJiBQU0QubG9ja093bmVyRm9yICE9PSB0aGlzO1xuICAgICAgICB9LFxuICAgICAgICBjcmVhdGU6IGZ1bmN0aW9uIChpZGJ0cmFucykge1xuICAgICAgICAgICAgdmFyIF90aGlzMyA9IHRoaXM7XG5cbiAgICAgICAgICAgIGFzc2VydCghdGhpcy5pZGJ0cmFucyk7XG4gICAgICAgICAgICBpZiAoIWlkYnRyYW5zICYmICFpZGJkYikge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoZGJPcGVuRXJyb3IgJiYgZGJPcGVuRXJyb3IubmFtZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiRGF0YWJhc2VDbG9zZWRFcnJvclwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXJyb3JzIHdoZXJlIGl0IGlzIG5vIGRpZmZlcmVuY2Ugd2hldGhlciBpdCB3YXMgY2F1c2VkIGJ5IHRoZSB1c2VyIG9wZXJhdGlvbiBvciBhbiBlYXJsaWVyIGNhbGwgdG8gZGIub3BlbigpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXhjZXB0aW9ucy5EYXRhYmFzZUNsb3NlZChkYk9wZW5FcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJNaXNzaW5nQVBJRXJyb3JcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVycm9ycyB3aGVyZSBpdCBpcyBubyBkaWZmZXJlbmNlIHdoZXRoZXIgaXQgd2FzIGNhdXNlZCBieSB0aGUgdXNlciBvcGVyYXRpb24gb3IgYW4gZWFybGllciBjYWxsIHRvIGRiLm9wZW4oKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuTWlzc2luZ0FQSShkYk9wZW5FcnJvci5tZXNzYWdlLCBkYk9wZW5FcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIGl0IGNsZWFyIHRoYXQgdGhlIHVzZXIgb3BlcmF0aW9uIHdhcyBub3Qgd2hhdCBjYXVzZWQgdGhlIGVycm9yIC0gdGhlIGVycm9yIGhhZCBvY2N1cnJlZCBlYXJsaWVyIG9uIGRiLm9wZW4oKSFcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBleGNlcHRpb25zLk9wZW5GYWlsZWQoZGJPcGVuRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghdGhpcy5hY3RpdmUpIHRocm93IG5ldyBleGNlcHRpb25zLlRyYW5zYWN0aW9uSW5hY3RpdmUoKTtcbiAgICAgICAgICAgIGFzc2VydCh0aGlzLl9jb21wbGV0aW9uLl9zdGF0ZSA9PT0gbnVsbCk7XG5cbiAgICAgICAgICAgIGlkYnRyYW5zID0gdGhpcy5pZGJ0cmFucyA9IGlkYnRyYW5zIHx8IGlkYmRiLnRyYW5zYWN0aW9uKHNhZmFyaU11bHRpU3RvcmVGaXgodGhpcy5zdG9yZU5hbWVzKSwgdGhpcy5tb2RlKTtcbiAgICAgICAgICAgIGlkYnRyYW5zLm9uZXJyb3IgPSB3cmFwKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2KTsgLy8gUHJvaGliaXQgZGVmYXVsdCBidWJibGluZyB0byB3aW5kb3cuZXJyb3JcbiAgICAgICAgICAgICAgICBfdGhpczMuX3JlamVjdChpZGJ0cmFucy5lcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlkYnRyYW5zLm9uYWJvcnQgPSB3cmFwKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2KTtcbiAgICAgICAgICAgICAgICBfdGhpczMuYWN0aXZlICYmIF90aGlzMy5fcmVqZWN0KG5ldyBleGNlcHRpb25zLkFib3J0KCkpO1xuICAgICAgICAgICAgICAgIF90aGlzMy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBfdGhpczMub24oXCJhYm9ydFwiKS5maXJlKGV2KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWRidHJhbnMub25jb21wbGV0ZSA9IHdyYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIF90aGlzMy5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBfdGhpczMuX3Jlc29sdmUoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG4gICAgICAgIF9wcm9taXNlOiBmdW5jdGlvbiAobW9kZSwgZm4sIGJXcml0ZUxvY2spIHtcbiAgICAgICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHZhciBwID0gc2VsZi5fbG9ja2VkKCkgP1xuICAgICAgICAgICAgLy8gUmVhZCBsb2NrIGFsd2F5cy4gVHJhbnNhY3Rpb24gaXMgd3JpdGUtbG9ja2VkLiBXYWl0IGZvciBtdXRleC5cbiAgICAgICAgICAgIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBzZWxmLl9ibG9ja2VkRnVuY3MucHVzaChbZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl9wcm9taXNlKG1vZGUsIGZuLCBiV3JpdGVMb2NrKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICAgICAgfSwgUFNEXSk7XG4gICAgICAgICAgICB9KSA6IG5ld1Njb3BlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcF8gPSBzZWxmLmFjdGl2ZSA/IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09IFJFQURXUklURSAmJiBzZWxmLm1vZGUgIT09IFJFQURXUklURSkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuUmVhZE9ubHkoXCJUcmFuc2FjdGlvbiBpcyByZWFkb25seVwiKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFzZWxmLmlkYnRyYW5zICYmIG1vZGUpIHNlbGYuY3JlYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiV3JpdGVMb2NrKSBzZWxmLl9sb2NrKCk7IC8vIFdyaXRlIGxvY2sgaWYgd3JpdGUgb3BlcmF0aW9uIGlzIHJlcXVlc3RlZFxuICAgICAgICAgICAgICAgICAgICBmbihyZXNvbHZlLCByZWplY3QsIHNlbGYpO1xuICAgICAgICAgICAgICAgIH0pIDogcmVqZWN0aW9uKG5ldyBleGNlcHRpb25zLlRyYW5zYWN0aW9uSW5hY3RpdmUoKSk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGYuYWN0aXZlICYmIGJXcml0ZUxvY2spIHBfLmZpbmFsbHkoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBzZWxmLl91bmxvY2soKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcF87XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcC5fbGliID0gdHJ1ZTtcbiAgICAgICAgICAgIHJldHVybiBwLnVuY2F1Z2h0KGRiVW5jYXVnaHQpO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRyYW5zYWN0aW9uIFB1YmxpYyBQcm9wZXJ0aWVzIGFuZCBNZXRob2RzXG4gICAgICAgIC8vXG4gICAgICAgIGFib3J0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmFjdGl2ZSAmJiB0aGlzLl9yZWplY3QobmV3IGV4Y2VwdGlvbnMuQWJvcnQoKSk7XG4gICAgICAgICAgICB0aGlzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIHRhYmxlczoge1xuICAgICAgICAgICAgZ2V0OiBkZXByZWNhdGVkKFwiVHJhbnNhY3Rpb24udGFibGVzXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyYXlUb09iamVjdCh0aGlzLnN0b3JlTmFtZXMsIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbbmFtZSwgYWxsVGFibGVzW25hbWVdXTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sIFwiVXNlIGRiLnRhYmxlcygpXCIpXG4gICAgICAgIH0sXG5cbiAgICAgICAgY29tcGxldGU6IGRlcHJlY2F0ZWQoXCJUcmFuc2FjdGlvbi5jb21wbGV0ZSgpXCIsIGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub24oXCJjb21wbGV0ZVwiLCBjYik7XG4gICAgICAgIH0pLFxuXG4gICAgICAgIGVycm9yOiBkZXByZWNhdGVkKFwiVHJhbnNhY3Rpb24uZXJyb3IoKVwiLCBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uKFwiZXJyb3JcIiwgY2IpO1xuICAgICAgICB9KSxcblxuICAgICAgICB0YWJsZTogZGVwcmVjYXRlZChcIlRyYW5zYWN0aW9uLnRhYmxlKClcIiwgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLnN0b3JlTmFtZXMuaW5kZXhPZihuYW1lKSA9PT0gLTEpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRUYWJsZShcIlRhYmxlIFwiICsgbmFtZSArIFwiIG5vdCBpbiB0cmFuc2FjdGlvblwiKTtcbiAgICAgICAgICAgIHJldHVybiBhbGxUYWJsZXNbbmFtZV07XG4gICAgICAgIH0pXG5cbiAgICB9KTtcblxuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIC8vIFdoZXJlQ2xhdXNlXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgZnVuY3Rpb24gV2hlcmVDbGF1c2UodGFibGUsIGluZGV4LCBvckNvbGxlY3Rpb24pIHtcbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwidGFibGVcIiB0eXBlPVwiVGFibGVcIj48L3BhcmFtPlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJpbmRleFwiIHR5cGU9XCJTdHJpbmdcIiBvcHRpb25hbD1cInRydWVcIj48L3BhcmFtPlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJvckNvbGxlY3Rpb25cIiB0eXBlPVwiQ29sbGVjdGlvblwiIG9wdGlvbmFsPVwidHJ1ZVwiPjwvcGFyYW0+XG4gICAgICAgIHRoaXMuX2N0eCA9IHtcbiAgICAgICAgICAgIHRhYmxlOiB0YWJsZSxcbiAgICAgICAgICAgIGluZGV4OiBpbmRleCA9PT0gXCI6aWRcIiA/IG51bGwgOiBpbmRleCxcbiAgICAgICAgICAgIGNvbGxDbGFzczogdGFibGUuX2NvbGxDbGFzcyxcbiAgICAgICAgICAgIG9yOiBvckNvbGxlY3Rpb25cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBwcm9wcyhXaGVyZUNsYXVzZS5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBXaGVyZUNsYXVzZSBwcml2YXRlIG1ldGhvZHNcblxuICAgICAgICBmdW5jdGlvbiBmYWlsKGNvbGxlY3Rpb25PcldoZXJlQ2xhdXNlLCBlcnIsIFQpIHtcbiAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gY29sbGVjdGlvbk9yV2hlcmVDbGF1c2UgaW5zdGFuY2VvZiBXaGVyZUNsYXVzZSA/IG5ldyBjb2xsZWN0aW9uT3JXaGVyZUNsYXVzZS5fY3R4LmNvbGxDbGFzcyhjb2xsZWN0aW9uT3JXaGVyZUNsYXVzZSkgOiBjb2xsZWN0aW9uT3JXaGVyZUNsYXVzZTtcblxuICAgICAgICAgICAgY29sbGVjdGlvbi5fY3R4LmVycm9yID0gVCA/IG5ldyBUKGVycikgOiBuZXcgVHlwZUVycm9yKGVycik7XG4gICAgICAgICAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGVtcHR5Q29sbGVjdGlvbih3aGVyZUNsYXVzZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyB3aGVyZUNsYXVzZS5fY3R4LmNvbGxDbGFzcyh3aGVyZUNsYXVzZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS5vbmx5KFwiXCIpO1xuICAgICAgICAgICAgfSkubGltaXQoMCk7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB1cHBlckZhY3RvcnkoZGlyKSB7XG4gICAgICAgICAgICByZXR1cm4gZGlyID09PSBcIm5leHRcIiA/IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgIH0gOiBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGxvd2VyRmFjdG9yeShkaXIpIHtcbiAgICAgICAgICAgIHJldHVybiBkaXIgPT09IFwibmV4dFwiID8gZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgfSA6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gbmV4dENhc2luZyhrZXksIGxvd2VyS2V5LCB1cHBlck5lZWRsZSwgbG93ZXJOZWVkbGUsIGNtcCwgZGlyKSB7XG4gICAgICAgICAgICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oa2V5Lmxlbmd0aCwgbG93ZXJOZWVkbGUubGVuZ3RoKTtcbiAgICAgICAgICAgIHZhciBsbHAgPSAtMTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICB2YXIgbHdyS2V5Q2hhciA9IGxvd2VyS2V5W2ldO1xuICAgICAgICAgICAgICAgIGlmIChsd3JLZXlDaGFyICE9PSBsb3dlck5lZWRsZVtpXSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY21wKGtleVtpXSwgdXBwZXJOZWVkbGVbaV0pIDwgMCkgcmV0dXJuIGtleS5zdWJzdHIoMCwgaSkgKyB1cHBlck5lZWRsZVtpXSArIHVwcGVyTmVlZGxlLnN1YnN0cihpICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjbXAoa2V5W2ldLCBsb3dlck5lZWRsZVtpXSkgPCAwKSByZXR1cm4ga2V5LnN1YnN0cigwLCBpKSArIGxvd2VyTmVlZGxlW2ldICsgdXBwZXJOZWVkbGUuc3Vic3RyKGkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxscCA+PSAwKSByZXR1cm4ga2V5LnN1YnN0cigwLCBsbHApICsgbG93ZXJLZXlbbGxwXSArIHVwcGVyTmVlZGxlLnN1YnN0cihsbHAgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjbXAoa2V5W2ldLCBsd3JLZXlDaGFyKSA8IDApIGxscCA9IGk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobGVuZ3RoIDwgbG93ZXJOZWVkbGUubGVuZ3RoICYmIGRpciA9PT0gXCJuZXh0XCIpIHJldHVybiBrZXkgKyB1cHBlck5lZWRsZS5zdWJzdHIoa2V5Lmxlbmd0aCk7XG4gICAgICAgICAgICBpZiAobGVuZ3RoIDwga2V5Lmxlbmd0aCAmJiBkaXIgPT09IFwicHJldlwiKSByZXR1cm4ga2V5LnN1YnN0cigwLCB1cHBlck5lZWRsZS5sZW5ndGgpO1xuICAgICAgICAgICAgcmV0dXJuIGxscCA8IDAgPyBudWxsIDoga2V5LnN1YnN0cigwLCBsbHApICsgbG93ZXJOZWVkbGVbbGxwXSArIHVwcGVyTmVlZGxlLnN1YnN0cihsbHAgKyAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZElnbm9yZUNhc2VBbGdvcml0aG0od2hlcmVDbGF1c2UsIG1hdGNoLCBuZWVkbGVzLCBzdWZmaXgpIHtcbiAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cIm5lZWRsZXNcIiB0eXBlPVwiQXJyYXlcIiBlbGVtZW50VHlwZT1cIlN0cmluZ1wiPjwvcGFyYW0+XG4gICAgICAgICAgICB2YXIgdXBwZXIsXG4gICAgICAgICAgICAgICAgbG93ZXIsXG4gICAgICAgICAgICAgICAgY29tcGFyZSxcbiAgICAgICAgICAgICAgICB1cHBlck5lZWRsZXMsXG4gICAgICAgICAgICAgICAgbG93ZXJOZWVkbGVzLFxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbixcbiAgICAgICAgICAgICAgICBuZXh0S2V5U3VmZml4LFxuICAgICAgICAgICAgICAgIG5lZWRsZXNMZW4gPSBuZWVkbGVzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmICghbmVlZGxlcy5ldmVyeShmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgcyA9PT0gJ3N0cmluZyc7XG4gICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWlsKHdoZXJlQ2xhdXNlLCBTVFJJTkdfRVhQRUNURUQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZnVuY3Rpb24gaW5pdERpcmVjdGlvbihkaXIpIHtcbiAgICAgICAgICAgICAgICB1cHBlciA9IHVwcGVyRmFjdG9yeShkaXIpO1xuICAgICAgICAgICAgICAgIGxvd2VyID0gbG93ZXJGYWN0b3J5KGRpcik7XG4gICAgICAgICAgICAgICAgY29tcGFyZSA9IGRpciA9PT0gXCJuZXh0XCIgPyBzaW1wbGVDb21wYXJlIDogc2ltcGxlQ29tcGFyZVJldmVyc2U7XG4gICAgICAgICAgICAgICAgdmFyIG5lZWRsZUJvdW5kcyA9IG5lZWRsZXMubWFwKGZ1bmN0aW9uIChuZWVkbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgbG93ZXI6IGxvd2VyKG5lZWRsZSksIHVwcGVyOiB1cHBlcihuZWVkbGUpIH07XG4gICAgICAgICAgICAgICAgfSkuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29tcGFyZShhLmxvd2VyLCBiLmxvd2VyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB1cHBlck5lZWRsZXMgPSBuZWVkbGVCb3VuZHMubWFwKGZ1bmN0aW9uIChuYikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmIudXBwZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgbG93ZXJOZWVkbGVzID0gbmVlZGxlQm91bmRzLm1hcChmdW5jdGlvbiAobmIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5iLmxvd2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGRpcmVjdGlvbiA9IGRpcjtcbiAgICAgICAgICAgICAgICBuZXh0S2V5U3VmZml4ID0gZGlyID09PSBcIm5leHRcIiA/IFwiXCIgOiBzdWZmaXg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbml0RGlyZWN0aW9uKFwibmV4dFwiKTtcblxuICAgICAgICAgICAgdmFyIGMgPSBuZXcgd2hlcmVDbGF1c2UuX2N0eC5jb2xsQ2xhc3Mod2hlcmVDbGF1c2UsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gSURCS2V5UmFuZ2UuYm91bmQodXBwZXJOZWVkbGVzWzBdLCBsb3dlck5lZWRsZXNbbmVlZGxlc0xlbiAtIDFdICsgc3VmZml4KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBjLl9vbmRpcmVjdGlvbmNoYW5nZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGV2ZW50IG9ubHlzIG9jY3VyIGJlZm9yZSBmaWx0ZXIgaXMgY2FsbGVkIHRoZSBmaXJzdCB0aW1lLlxuICAgICAgICAgICAgICAgIGluaXREaXJlY3Rpb24oZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBmaXJzdFBvc3NpYmxlTmVlZGxlID0gMDtcblxuICAgICAgICAgICAgYy5fYWRkQWxnb3JpdGhtKGZ1bmN0aW9uIChjdXJzb3IsIGFkdmFuY2UsIHJlc29sdmUpIHtcbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJjdXJzb3JcIiB0eXBlPVwiSURCQ3Vyc29yXCI+PC9wYXJhbT5cbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJhZHZhbmNlXCIgdHlwZT1cIkZ1bmN0aW9uXCI+PC9wYXJhbT5cbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJyZXNvbHZlXCIgdHlwZT1cIkZ1bmN0aW9uXCI+PC9wYXJhbT5cbiAgICAgICAgICAgICAgICB2YXIga2V5ID0gY3Vyc29yLmtleTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGtleSAhPT0gJ3N0cmluZycpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgbG93ZXJLZXkgPSBsb3dlcihrZXkpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaChsb3dlcktleSwgbG93ZXJOZWVkbGVzLCBmaXJzdFBvc3NpYmxlTmVlZGxlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG93ZXN0UG9zc2libGVDYXNpbmcgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gZmlyc3RQb3NzaWJsZU5lZWRsZTsgaSA8IG5lZWRsZXNMZW47ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNhc2luZyA9IG5leHRDYXNpbmcoa2V5LCBsb3dlcktleSwgdXBwZXJOZWVkbGVzW2ldLCBsb3dlck5lZWRsZXNbaV0sIGNvbXBhcmUsIGRpcmVjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2FzaW5nID09PSBudWxsICYmIGxvd2VzdFBvc3NpYmxlQ2FzaW5nID09PSBudWxsKSBmaXJzdFBvc3NpYmxlTmVlZGxlID0gaSArIDE7ZWxzZSBpZiAobG93ZXN0UG9zc2libGVDYXNpbmcgPT09IG51bGwgfHwgY29tcGFyZShsb3dlc3RQb3NzaWJsZUNhc2luZywgY2FzaW5nKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb3dlc3RQb3NzaWJsZUNhc2luZyA9IGNhc2luZztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAobG93ZXN0UG9zc2libGVDYXNpbmcgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZShsb3dlc3RQb3NzaWJsZUNhc2luZyArIG5leHRLZXlTdWZmaXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlKHJlc29sdmUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBjO1xuICAgICAgICB9XG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gV2hlcmVDbGF1c2UgcHVibGljIG1ldGhvZHNcbiAgICAgICAgLy9cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGJldHdlZW46IGZ1bmN0aW9uIChsb3dlciwgdXBwZXIsIGluY2x1ZGVMb3dlciwgaW5jbHVkZVVwcGVyKSB7XG4gICAgICAgICAgICAgICAgLy8vIDxzdW1tYXJ5PlxuICAgICAgICAgICAgICAgIC8vLyAgICAgRmlsdGVyIG91dCByZWNvcmRzIHdob3NlIHdoZXJlLWZpZWxkIGxheXMgYmV0d2VlbiBnaXZlbiBsb3dlciBhbmQgdXBwZXIgdmFsdWVzLiBBcHBsaWVzIHRvIFN0cmluZ3MsIE51bWJlcnMgYW5kIERhdGVzLlxuICAgICAgICAgICAgICAgIC8vLyA8L3N1bW1hcnk+XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwibG93ZXJcIj48L3BhcmFtPlxuICAgICAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInVwcGVyXCI+PC9wYXJhbT5cbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJpbmNsdWRlTG93ZXJcIiBvcHRpb25hbD1cInRydWVcIj5XaGV0aGVyIGl0ZW1zIHRoYXQgZXF1YWxzIGxvd2VyIHNob3VsZCBiZSBpbmNsdWRlZC4gRGVmYXVsdCB0cnVlLjwvcGFyYW0+XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwiaW5jbHVkZVVwcGVyXCIgb3B0aW9uYWw9XCJ0cnVlXCI+V2hldGhlciBpdGVtcyB0aGF0IGVxdWFscyB1cHBlciBzaG91bGQgYmUgaW5jbHVkZWQuIERlZmF1bHQgZmFsc2UuPC9wYXJhbT5cbiAgICAgICAgICAgICAgICAvLy8gPHJldHVybnMgdHlwZT1cIkNvbGxlY3Rpb25cIj48L3JldHVybnM+XG4gICAgICAgICAgICAgICAgaW5jbHVkZUxvd2VyID0gaW5jbHVkZUxvd2VyICE9PSBmYWxzZTsgLy8gRGVmYXVsdCB0byB0cnVlXG4gICAgICAgICAgICAgICAgaW5jbHVkZVVwcGVyID0gaW5jbHVkZVVwcGVyID09PSB0cnVlOyAvLyBEZWZhdWx0IHRvIGZhbHNlXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNtcChsb3dlciwgdXBwZXIpID4gMCB8fCBjbXAobG93ZXIsIHVwcGVyKSA9PT0gMCAmJiAoaW5jbHVkZUxvd2VyIHx8IGluY2x1ZGVVcHBlcikgJiYgIShpbmNsdWRlTG93ZXIgJiYgaW5jbHVkZVVwcGVyKSkgcmV0dXJuIGVtcHR5Q29sbGVjdGlvbih0aGlzKTsgLy8gV29ya2Fyb3VuZCBmb3IgaWRpb3RpYyBXM0MgU3BlY2lmaWNhdGlvbiB0aGF0IERhdGFFcnJvciBtdXN0IGJlIHRocm93biBpZiBsb3dlciA+IHVwcGVyLiBUaGUgbmF0dXJhbCByZXN1bHQgd291bGQgYmUgdG8gcmV0dXJuIGFuIGVtcHR5IGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY3R4LmNvbGxDbGFzcyh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSURCS2V5UmFuZ2UuYm91bmQobG93ZXIsIHVwcGVyLCAhaW5jbHVkZUxvd2VyLCAhaW5jbHVkZVVwcGVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFpbCh0aGlzLCBJTlZBTElEX0tFWV9BUkdVTUVOVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVxdWFsczogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLl9jdHguY29sbENsYXNzKHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElEQktleVJhbmdlLm9ubHkodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFib3ZlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuX2N0eC5jb2xsQ2xhc3ModGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSURCS2V5UmFuZ2UubG93ZXJCb3VuZCh2YWx1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWJvdmVPckVxdWFsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuX2N0eC5jb2xsQ2xhc3ModGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSURCS2V5UmFuZ2UubG93ZXJCb3VuZCh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYmVsb3c6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY3R4LmNvbGxDbGFzcyh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS51cHBlckJvdW5kKHZhbHVlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZWxvd09yRXF1YWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY3R4LmNvbGxDbGFzcyh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS51cHBlckJvdW5kKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGFydHNXaXRoOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic3RyXCIgdHlwZT1cIlN0cmluZ1wiPjwvcGFyYW0+XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzdHIgIT09ICdzdHJpbmcnKSByZXR1cm4gZmFpbCh0aGlzLCBTVFJJTkdfRVhQRUNURUQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmJldHdlZW4oc3RyLCBzdHIgKyBtYXhTdHJpbmcsIHRydWUsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXJ0c1dpdGhJZ25vcmVDYXNlOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic3RyXCIgdHlwZT1cIlN0cmluZ1wiPjwvcGFyYW0+XG4gICAgICAgICAgICAgICAgaWYgKHN0ciA9PT0gXCJcIikgcmV0dXJuIHRoaXMuc3RhcnRzV2l0aChzdHIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBhZGRJZ25vcmVDYXNlQWxnb3JpdGhtKHRoaXMsIGZ1bmN0aW9uICh4LCBhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4LmluZGV4T2YoYVswXSkgPT09IDA7XG4gICAgICAgICAgICAgICAgfSwgW3N0cl0sIG1heFN0cmluZyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXF1YWxzSWdub3JlQ2FzZTogZnVuY3Rpb24gKHN0cikge1xuICAgICAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInN0clwiIHR5cGU9XCJTdHJpbmdcIj48L3BhcmFtPlxuICAgICAgICAgICAgICAgIHJldHVybiBhZGRJZ25vcmVDYXNlQWxnb3JpdGhtKHRoaXMsIGZ1bmN0aW9uICh4LCBhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB4ID09PSBhWzBdO1xuICAgICAgICAgICAgICAgIH0sIFtzdHJdLCBcIlwiKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbnlPZklnbm9yZUNhc2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2V0ID0gZ2V0QXJyYXlPZi5hcHBseShOT19DSEFSX0FSUkFZLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIGlmIChzZXQubGVuZ3RoID09PSAwKSByZXR1cm4gZW1wdHlDb2xsZWN0aW9uKHRoaXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiBhZGRJZ25vcmVDYXNlQWxnb3JpdGhtKHRoaXMsIGZ1bmN0aW9uICh4LCBhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhLmluZGV4T2YoeCkgIT09IC0xO1xuICAgICAgICAgICAgICAgIH0sIHNldCwgXCJcIik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhcnRzV2l0aEFueU9mSWdub3JlQ2FzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZXQgPSBnZXRBcnJheU9mLmFwcGx5KE5PX0NIQVJfQVJSQVksIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgaWYgKHNldC5sZW5ndGggPT09IDApIHJldHVybiBlbXB0eUNvbGxlY3Rpb24odGhpcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFkZElnbm9yZUNhc2VBbGdvcml0aG0odGhpcywgZnVuY3Rpb24gKHgsIGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuc29tZShmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguaW5kZXhPZihuKSA9PT0gMDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSwgc2V0LCBtYXhTdHJpbmcpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFueU9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNldCA9IGdldEFycmF5T2YuYXBwbHkoTk9fQ0hBUl9BUlJBWSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB2YXIgY29tcGFyZSA9IGFzY2VuZGluZztcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzZXQuc29ydChjb21wYXJlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWlsKHRoaXMsIElOVkFMSURfS0VZX0FSR1VNRU5UKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNldC5sZW5ndGggPT09IDApIHJldHVybiBlbXB0eUNvbGxlY3Rpb24odGhpcyk7XG4gICAgICAgICAgICAgICAgdmFyIGMgPSBuZXcgdGhpcy5fY3R4LmNvbGxDbGFzcyh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS5ib3VuZChzZXRbMF0sIHNldFtzZXQubGVuZ3RoIC0gMV0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYy5fb25kaXJlY3Rpb25jaGFuZ2UgPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbXBhcmUgPSBkaXJlY3Rpb24gPT09IFwibmV4dFwiID8gYXNjZW5kaW5nIDogZGVzY2VuZGluZztcbiAgICAgICAgICAgICAgICAgICAgc2V0LnNvcnQoY29tcGFyZSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgICAgICAgICAgYy5fYWRkQWxnb3JpdGhtKGZ1bmN0aW9uIChjdXJzb3IsIGFkdmFuY2UsIHJlc29sdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IGN1cnNvci5rZXk7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChjb21wYXJlKGtleSwgc2V0W2ldKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjdXJzb3IgaGFzIHBhc3NlZCBiZXlvbmQgdGhpcyBrZXkuIENoZWNrIG5leHQuXG4gICAgICAgICAgICAgICAgICAgICAgICArK2k7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gc2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXJlIGlzIG5vIG5leHQuIFN0b3Agc2VhcmNoaW5nLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2UocmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21wYXJlKGtleSwgc2V0W2ldKSA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgY3Vyc29yIHZhbHVlIHNob3VsZCBiZSBpbmNsdWRlZCBhbmQgd2Ugc2hvdWxkIGNvbnRpbnVlIGEgc2luZ2xlIHN0ZXAgaW4gY2FzZSBuZXh0IGl0ZW0gaGFzIHRoZSBzYW1lIGtleSBvciBwb3NzaWJseSBvdXIgbmV4dCBrZXkgaW4gc2V0LlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJzb3Iua2V5IG5vdCB5ZXQgYXQgc2V0W2ldLiBGb3J3YXJkIGN1cnNvciB0byB0aGUgbmV4dCBrZXkgdG8gaHVudCBmb3IuXG4gICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29udGludWUoc2V0W2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBub3RFcXVhbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5BbnlSYW5nZShbWy1JbmZpbml0eSwgdmFsdWVdLCBbdmFsdWUsIG1heEtleV1dLCB7IGluY2x1ZGVMb3dlcnM6IGZhbHNlLCBpbmNsdWRlVXBwZXJzOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG5vbmVPZjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZXQgPSBnZXRBcnJheU9mLmFwcGx5KE5PX0NIQVJfQVJSQVksIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgaWYgKHNldC5sZW5ndGggPT09IDApIHJldHVybiBuZXcgdGhpcy5fY3R4LmNvbGxDbGFzcyh0aGlzKTsgLy8gUmV0dXJuIGVudGlyZSBjb2xsZWN0aW9uLlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNldC5zb3J0KGFzY2VuZGluZyk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFpbCh0aGlzLCBJTlZBTElEX0tFWV9BUkdVTUVOVCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFRyYW5zZm9ybSBbXCJhXCIsXCJiXCIsXCJjXCJdIHRvIGEgc2V0IG9mIHJhbmdlcyBmb3IgYmV0d2Vlbi9hYm92ZS9iZWxvdzogW1stSW5maW5pdHksXCJhXCJdLCBbXCJhXCIsXCJiXCJdLCBbXCJiXCIsXCJjXCJdLCBbXCJjXCIsbWF4S2V5XV1cbiAgICAgICAgICAgICAgICB2YXIgcmFuZ2VzID0gc2V0LnJlZHVjZShmdW5jdGlvbiAocmVzLCB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcyA/IHJlcy5jb25jYXQoW1tyZXNbcmVzLmxlbmd0aCAtIDFdWzFdLCB2YWxdXSkgOiBbWy1JbmZpbml0eSwgdmFsXV07XG4gICAgICAgICAgICAgICAgfSwgbnVsbCk7XG4gICAgICAgICAgICAgICAgcmFuZ2VzLnB1c2goW3NldFtzZXQubGVuZ3RoIC0gMV0sIG1heEtleV0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluQW55UmFuZ2UocmFuZ2VzLCB7IGluY2x1ZGVMb3dlcnM6IGZhbHNlLCBpbmNsdWRlVXBwZXJzOiBmYWxzZSB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8qKiBGaWx0ZXIgb3V0IHZhbHVlcyB3aXRoaW5nIGdpdmVuIHNldCBvZiByYW5nZXMuXHJcbiAgICAgICAgICAgICogRXhhbXBsZSwgZ2l2ZSBjaGlsZHJlbiBhbmQgZWxkZXJzIGEgcmViYXRlIG9mIDUwJTpcclxuICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAqICAgZGIuZnJpZW5kcy53aGVyZSgnYWdlJykuaW5BbnlSYW5nZShbWzAsMThdLFs2NSxJbmZpbml0eV1dKS5tb2RpZnkoe1JlYmF0ZTogMS8yfSk7XHJcbiAgICAgICAgICAgICpcclxuICAgICAgICAgICAgKiBAcGFyYW0geyhzdHJpbmd8bnVtYmVyfERhdGV8QXJyYXkpW11bXX0gcmFuZ2VzXHJcbiAgICAgICAgICAgICogQHBhcmFtIHt7aW5jbHVkZUxvd2VyczogYm9vbGVhbiwgaW5jbHVkZVVwcGVyczogYm9vbGVhbn19IG9wdGlvbnNcclxuICAgICAgICAgICAgKi9cbiAgICAgICAgICAgIGluQW55UmFuZ2U6IGZ1bmN0aW9uIChyYW5nZXMsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGlmIChyYW5nZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZW1wdHlDb2xsZWN0aW9uKHRoaXMpO1xuICAgICAgICAgICAgICAgIGlmICghcmFuZ2VzLmV2ZXJ5KGZ1bmN0aW9uIChyYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmFuZ2VbMF0gIT09IHVuZGVmaW5lZCAmJiByYW5nZVsxXSAhPT0gdW5kZWZpbmVkICYmIGFzY2VuZGluZyhyYW5nZVswXSwgcmFuZ2VbMV0pIDw9IDA7XG4gICAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwodGhpcywgXCJGaXJzdCBhcmd1bWVudCB0byBpbkFueVJhbmdlKCkgbXVzdCBiZSBhbiBBcnJheSBvZiB0d28tdmFsdWUgQXJyYXlzIFtsb3dlcix1cHBlcl0gd2hlcmUgdXBwZXIgbXVzdCBub3QgYmUgbG93ZXIgdGhhbiBsb3dlclwiLCBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBpbmNsdWRlTG93ZXJzID0gIW9wdGlvbnMgfHwgb3B0aW9ucy5pbmNsdWRlTG93ZXJzICE9PSBmYWxzZTsgLy8gRGVmYXVsdCB0byB0cnVlXG4gICAgICAgICAgICAgICAgdmFyIGluY2x1ZGVVcHBlcnMgPSBvcHRpb25zICYmIG9wdGlvbnMuaW5jbHVkZVVwcGVycyA9PT0gdHJ1ZTsgLy8gRGVmYXVsdCB0byBmYWxzZVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gYWRkUmFuZ2UocmFuZ2VzLCBuZXdSYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IHJhbmdlcy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByYW5nZSA9IHJhbmdlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbXAobmV3UmFuZ2VbMF0sIHJhbmdlWzFdKSA8IDAgJiYgY21wKG5ld1JhbmdlWzFdLCByYW5nZVswXSkgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmFuZ2VbMF0gPSBtaW4ocmFuZ2VbMF0sIG5ld1JhbmdlWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZVsxXSA9IG1heChyYW5nZVsxXSwgbmV3UmFuZ2VbMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBsKSByYW5nZXMucHVzaChuZXdSYW5nZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByYW5nZXM7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIHNvcnREaXJlY3Rpb24gPSBhc2NlbmRpbmc7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gcmFuZ2VTb3J0ZXIoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc29ydERpcmVjdGlvbihhWzBdLCBiWzBdKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBKb2luIG92ZXJsYXBwaW5nIHJhbmdlc1xuICAgICAgICAgICAgICAgIHZhciBzZXQ7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc2V0ID0gcmFuZ2VzLnJlZHVjZShhZGRSYW5nZSwgW10pO1xuICAgICAgICAgICAgICAgICAgICBzZXQuc29ydChyYW5nZVNvcnRlcik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwodGhpcywgSU5WQUxJRF9LRVlfQVJHVU1FTlQpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgICAgICB2YXIga2V5SXNCZXlvbmRDdXJyZW50RW50cnkgPSBpbmNsdWRlVXBwZXJzID8gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXNjZW5kaW5nKGtleSwgc2V0W2ldWzFdKSA+IDA7XG4gICAgICAgICAgICAgICAgfSA6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFzY2VuZGluZyhrZXksIHNldFtpXVsxXSkgPj0gMDtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgdmFyIGtleUlzQmVmb3JlQ3VycmVudEVudHJ5ID0gaW5jbHVkZUxvd2VycyA/IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRlc2NlbmRpbmcoa2V5LCBzZXRbaV1bMF0pID4gMDtcbiAgICAgICAgICAgICAgICB9IDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVzY2VuZGluZyhrZXksIHNldFtpXVswXSkgPj0gMDtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24ga2V5V2l0aGluQ3VycmVudFJhbmdlKGtleSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gIWtleUlzQmV5b25kQ3VycmVudEVudHJ5KGtleSkgJiYgIWtleUlzQmVmb3JlQ3VycmVudEVudHJ5KGtleSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGNoZWNrS2V5ID0ga2V5SXNCZXlvbmRDdXJyZW50RW50cnk7XG5cbiAgICAgICAgICAgICAgICB2YXIgYyA9IG5ldyBjdHguY29sbENsYXNzKHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElEQktleVJhbmdlLmJvdW5kKHNldFswXVswXSwgc2V0W3NldC5sZW5ndGggLSAxXVsxXSwgIWluY2x1ZGVMb3dlcnMsICFpbmNsdWRlVXBwZXJzKTtcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGMuX29uZGlyZWN0aW9uY2hhbmdlID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSBcIm5leHRcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tLZXkgPSBrZXlJc0JleW9uZEN1cnJlbnRFbnRyeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvcnREaXJlY3Rpb24gPSBhc2NlbmRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja0tleSA9IGtleUlzQmVmb3JlQ3VycmVudEVudHJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydERpcmVjdGlvbiA9IGRlc2NlbmRpbmc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc2V0LnNvcnQocmFuZ2VTb3J0ZXIpO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBjLl9hZGRBbGdvcml0aG0oZnVuY3Rpb24gKGN1cnNvciwgYWR2YW5jZSwgcmVzb2x2ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gY3Vyc29yLmtleTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGNoZWNrS2V5KGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZSBjdXJzb3IgaGFzIHBhc3NlZCBiZXlvbmQgdGhpcyBrZXkuIENoZWNrIG5leHQuXG4gICAgICAgICAgICAgICAgICAgICAgICArK2k7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PT0gc2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoZXJlIGlzIG5vIG5leHQuIFN0b3Agc2VhcmNoaW5nLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2UocmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChrZXlXaXRoaW5DdXJyZW50UmFuZ2Uoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnJlbnQgY3Vyc29yIHZhbHVlIHNob3VsZCBiZSBpbmNsdWRlZCBhbmQgd2Ugc2hvdWxkIGNvbnRpbnVlIGEgc2luZ2xlIHN0ZXAgaW4gY2FzZSBuZXh0IGl0ZW0gaGFzIHRoZSBzYW1lIGtleSBvciBwb3NzaWJseSBvdXIgbmV4dCBrZXkgaW4gc2V0LlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY21wKGtleSwgc2V0W2ldWzFdKSA9PT0gMCB8fCBjbXAoa2V5LCBzZXRbaV1bMF0pID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpbmNsdWRlVXBwZXIgb3IgaW5jbHVkZUxvd2VyIGlzIGZhbHNlIHNvIGtleVdpdGhpbkN1cnJlbnRSYW5nZSgpIHJldHVybnMgZmFsc2UgZXZlbiB0aG91Z2ggd2UgYXJlIGF0IHJhbmdlIGJvcmRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlIHRvIG5leHQga2V5IGJ1dCBkb24ndCBpbmNsdWRlIHRoaXMgb25lLlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gY3Vyc29yLmtleSBub3QgeWV0IGF0IHNldFtpXS4gRm9yd2FyZCBjdXJzb3IgdG8gdGhlIG5leHQga2V5IHRvIGh1bnQgZm9yLlxuICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNvcnREaXJlY3Rpb24gPT09IGFzY2VuZGluZykgY3Vyc29yLmNvbnRpbnVlKHNldFtpXVswXSk7ZWxzZSBjdXJzb3IuY29udGludWUoc2V0W2ldWzFdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhcnRzV2l0aEFueU9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNldCA9IGdldEFycmF5T2YuYXBwbHkoTk9fQ0hBUl9BUlJBWSwgYXJndW1lbnRzKTtcblxuICAgICAgICAgICAgICAgIGlmICghc2V0LmV2ZXJ5KGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0eXBlb2YgcyA9PT0gJ3N0cmluZyc7XG4gICAgICAgICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwodGhpcywgXCJzdGFydHNXaXRoQW55T2YoKSBvbmx5IHdvcmtzIHdpdGggc3RyaW5nc1wiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHNldC5sZW5ndGggPT09IDApIHJldHVybiBlbXB0eUNvbGxlY3Rpb24odGhpcyk7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbkFueVJhbmdlKHNldC5tYXAoZnVuY3Rpb24gKHN0cikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW3N0ciwgc3RyICsgbWF4U3RyaW5nXTtcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICAvLyBDb2xsZWN0aW9uIENsYXNzXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgZnVuY3Rpb24gQ29sbGVjdGlvbih3aGVyZUNsYXVzZSwga2V5UmFuZ2VHZW5lcmF0b3IpIHtcbiAgICAgICAgLy8vIDxzdW1tYXJ5PlxuICAgICAgICAvLy9cbiAgICAgICAgLy8vIDwvc3VtbWFyeT5cbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwid2hlcmVDbGF1c2VcIiB0eXBlPVwiV2hlcmVDbGF1c2VcIj5XaGVyZSBjbGF1c2UgaW5zdGFuY2U8L3BhcmFtPlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJrZXlSYW5nZUdlbmVyYXRvclwiIHZhbHVlPVwiZnVuY3Rpb24oKXsgcmV0dXJuIElEQktleVJhbmdlLmJvdW5kKDAsMSk7fVwiIG9wdGlvbmFsPVwidHJ1ZVwiPjwvcGFyYW0+XG4gICAgICAgIHZhciBrZXlSYW5nZSA9IG51bGwsXG4gICAgICAgICAgICBlcnJvciA9IG51bGw7XG4gICAgICAgIGlmIChrZXlSYW5nZUdlbmVyYXRvcikgdHJ5IHtcbiAgICAgICAgICAgIGtleVJhbmdlID0ga2V5UmFuZ2VHZW5lcmF0b3IoKTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIGVycm9yID0gZXg7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgd2hlcmVDdHggPSB3aGVyZUNsYXVzZS5fY3R4LFxuICAgICAgICAgICAgdGFibGUgPSB3aGVyZUN0eC50YWJsZTtcbiAgICAgICAgdGhpcy5fY3R4ID0ge1xuICAgICAgICAgICAgdGFibGU6IHRhYmxlLFxuICAgICAgICAgICAgaW5kZXg6IHdoZXJlQ3R4LmluZGV4LFxuICAgICAgICAgICAgaXNQcmltS2V5OiAhd2hlcmVDdHguaW5kZXggfHwgdGFibGUuc2NoZW1hLnByaW1LZXkua2V5UGF0aCAmJiB3aGVyZUN0eC5pbmRleCA9PT0gdGFibGUuc2NoZW1hLnByaW1LZXkubmFtZSxcbiAgICAgICAgICAgIHJhbmdlOiBrZXlSYW5nZSxcbiAgICAgICAgICAgIGtleXNPbmx5OiBmYWxzZSxcbiAgICAgICAgICAgIGRpcjogXCJuZXh0XCIsXG4gICAgICAgICAgICB1bmlxdWU6IFwiXCIsXG4gICAgICAgICAgICBhbGdvcml0aG06IG51bGwsXG4gICAgICAgICAgICBmaWx0ZXI6IG51bGwsXG4gICAgICAgICAgICByZXBsYXlGaWx0ZXI6IG51bGwsXG4gICAgICAgICAgICBqdXN0TGltaXQ6IHRydWUsIC8vIFRydWUgaWYgYSByZXBsYXlGaWx0ZXIgaXMganVzdCBhIGZpbHRlciB0aGF0IHBlcmZvcm1zIGEgXCJsaW1pdFwiIG9wZXJhdGlvbiAob3Igbm9uZSBhdCBhbGwpXG4gICAgICAgICAgICBpc01hdGNoOiBudWxsLFxuICAgICAgICAgICAgb2Zmc2V0OiAwLFxuICAgICAgICAgICAgbGltaXQ6IEluZmluaXR5LFxuICAgICAgICAgICAgZXJyb3I6IGVycm9yLCAvLyBJZiBzZXQsIGFueSBwcm9taXNlIG11c3QgYmUgcmVqZWN0ZWQgd2l0aCB0aGlzIGVycm9yXG4gICAgICAgICAgICBvcjogd2hlcmVDdHgub3IsXG4gICAgICAgICAgICB2YWx1ZU1hcHBlcjogdGFibGUuaG9vay5yZWFkaW5nLmZpcmVcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc1BsYWluS2V5UmFuZ2UoY3R4LCBpZ25vcmVMaW1pdEZpbHRlcikge1xuICAgICAgICByZXR1cm4gIShjdHguZmlsdGVyIHx8IGN0eC5hbGdvcml0aG0gfHwgY3R4Lm9yKSAmJiAoaWdub3JlTGltaXRGaWx0ZXIgPyBjdHguanVzdExpbWl0IDogIWN0eC5yZXBsYXlGaWx0ZXIpO1xuICAgIH1cblxuICAgIHByb3BzKENvbGxlY3Rpb24ucHJvdG90eXBlLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gQ29sbGVjdGlvbiBQcml2YXRlIEZ1bmN0aW9uc1xuICAgICAgICAvL1xuXG4gICAgICAgIGZ1bmN0aW9uIGFkZEZpbHRlcihjdHgsIGZuKSB7XG4gICAgICAgICAgICBjdHguZmlsdGVyID0gY29tYmluZShjdHguZmlsdGVyLCBmbik7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRSZXBsYXlGaWx0ZXIoY3R4LCBmYWN0b3J5LCBpc0xpbWl0RmlsdGVyKSB7XG4gICAgICAgICAgICB2YXIgY3VyciA9IGN0eC5yZXBsYXlGaWx0ZXI7XG4gICAgICAgICAgICBjdHgucmVwbGF5RmlsdGVyID0gY3VyciA/IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tYmluZShjdXJyKCksIGZhY3RvcnkoKSk7XG4gICAgICAgICAgICB9IDogZmFjdG9yeTtcbiAgICAgICAgICAgIGN0eC5qdXN0TGltaXQgPSBpc0xpbWl0RmlsdGVyICYmICFjdXJyO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkTWF0Y2hGaWx0ZXIoY3R4LCBmbikge1xuICAgICAgICAgICAgY3R4LmlzTWF0Y2ggPSBjb21iaW5lKGN0eC5pc01hdGNoLCBmbik7XG4gICAgICAgIH1cblxuICAgICAgICAvKiogQHBhcmFtIGN0eCB7XHJcbiAgICAgICAgICogICAgICBpc1ByaW1LZXk6IGJvb2xlYW4sXHJcbiAgICAgICAgICogICAgICB0YWJsZTogVGFibGUsXHJcbiAgICAgICAgICogICAgICBpbmRleDogc3RyaW5nXHJcbiAgICAgICAgICogfVxyXG4gICAgICAgICAqIEBwYXJhbSBzdG9yZSBJREJPYmplY3RTdG9yZVxyXG4gICAgICAgICAqKi9cbiAgICAgICAgZnVuY3Rpb24gZ2V0SW5kZXhPclN0b3JlKGN0eCwgc3RvcmUpIHtcbiAgICAgICAgICAgIGlmIChjdHguaXNQcmltS2V5KSByZXR1cm4gc3RvcmU7XG4gICAgICAgICAgICB2YXIgaW5kZXhTcGVjID0gY3R4LnRhYmxlLnNjaGVtYS5pZHhCeU5hbWVbY3R4LmluZGV4XTtcbiAgICAgICAgICAgIGlmICghaW5kZXhTcGVjKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5TY2hlbWEoXCJLZXlQYXRoIFwiICsgY3R4LmluZGV4ICsgXCIgb24gb2JqZWN0IHN0b3JlIFwiICsgc3RvcmUubmFtZSArIFwiIGlzIG5vdCBpbmRleGVkXCIpO1xuICAgICAgICAgICAgcmV0dXJuIHN0b3JlLmluZGV4KGluZGV4U3BlYy5uYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKiBAcGFyYW0gY3R4IHtcclxuICAgICAgICAgKiAgICAgIGlzUHJpbUtleTogYm9vbGVhbixcclxuICAgICAgICAgKiAgICAgIHRhYmxlOiBUYWJsZSxcclxuICAgICAgICAgKiAgICAgIGluZGV4OiBzdHJpbmcsXHJcbiAgICAgICAgICogICAgICBrZXlzT25seTogYm9vbGVhbixcclxuICAgICAgICAgKiAgICAgIHJhbmdlPzogSURCS2V5UmFuZ2UsXHJcbiAgICAgICAgICogICAgICBkaXI6IFwibmV4dFwiIHwgXCJwcmV2XCJcclxuICAgICAgICAgKiB9XHJcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIG9wZW5DdXJzb3IoY3R4LCBzdG9yZSkge1xuICAgICAgICAgICAgdmFyIGlkeE9yU3RvcmUgPSBnZXRJbmRleE9yU3RvcmUoY3R4LCBzdG9yZSk7XG4gICAgICAgICAgICByZXR1cm4gY3R4LmtleXNPbmx5ICYmICdvcGVuS2V5Q3Vyc29yJyBpbiBpZHhPclN0b3JlID8gaWR4T3JTdG9yZS5vcGVuS2V5Q3Vyc29yKGN0eC5yYW5nZSB8fCBudWxsLCBjdHguZGlyICsgY3R4LnVuaXF1ZSkgOiBpZHhPclN0b3JlLm9wZW5DdXJzb3IoY3R4LnJhbmdlIHx8IG51bGwsIGN0eC5kaXIgKyBjdHgudW5pcXVlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGl0ZXIoY3R4LCBmbiwgcmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSkge1xuICAgICAgICAgICAgdmFyIGZpbHRlciA9IGN0eC5yZXBsYXlGaWx0ZXIgPyBjb21iaW5lKGN0eC5maWx0ZXIsIGN0eC5yZXBsYXlGaWx0ZXIoKSkgOiBjdHguZmlsdGVyO1xuICAgICAgICAgICAgaWYgKCFjdHgub3IpIHtcbiAgICAgICAgICAgICAgICBpdGVyYXRlKG9wZW5DdXJzb3IoY3R4LCBpZGJzdG9yZSksIGNvbWJpbmUoY3R4LmFsZ29yaXRobSwgZmlsdGVyKSwgZm4sIHJlc29sdmUsIHJlamVjdCwgIWN0eC5rZXlzT25seSAmJiBjdHgudmFsdWVNYXBwZXIpO1xuICAgICAgICAgICAgfSBlbHNlIChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNldCA9IHt9O1xuICAgICAgICAgICAgICAgIHZhciByZXNvbHZlZCA9IDA7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiByZXNvbHZlYm90aCgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCsrcmVzb2x2ZWQgPT09IDIpIHJlc29sdmUoKTsgLy8gU2VlbXMgbGlrZSB3ZSBqdXN0IHN1cHBvcnQgb3IgYnR3biBtYXggMiBleHByZXNzaW9ucywgYnV0IHRoZXJlIGFyZSBubyBsaW1pdCBiZWNhdXNlIHdlIGRvIHJlY3Vyc2lvbi5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiB1bmlvbihpdGVtLCBjdXJzb3IsIGFkdmFuY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmaWx0ZXIgfHwgZmlsdGVyKGN1cnNvciwgYWR2YW5jZSwgcmVzb2x2ZWJvdGgsIHJlamVjdCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBjdXJzb3IucHJpbWFyeUtleS50b1N0cmluZygpOyAvLyBDb252ZXJ0cyBhbnkgRGF0ZSB0byBTdHJpbmcsIFN0cmluZyB0byBTdHJpbmcsIE51bWJlciB0byBTdHJpbmcgYW5kIEFycmF5IHRvIGNvbW1hLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzT3duKHNldCwga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFtrZXldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbihpdGVtLCBjdXJzb3IsIGFkdmFuY2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY3R4Lm9yLl9pdGVyYXRlKHVuaW9uLCByZXNvbHZlYm90aCwgcmVqZWN0LCBpZGJzdG9yZSk7XG4gICAgICAgICAgICAgICAgaXRlcmF0ZShvcGVuQ3Vyc29yKGN0eCwgaWRic3RvcmUpLCBjdHguYWxnb3JpdGhtLCB1bmlvbiwgcmVzb2x2ZWJvdGgsIHJlamVjdCwgIWN0eC5rZXlzT25seSAmJiBjdHgudmFsdWVNYXBwZXIpO1xuICAgICAgICAgICAgfSkoKTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBnZXRJbnN0YW5jZVRlbXBsYXRlKGN0eCkge1xuICAgICAgICAgICAgcmV0dXJuIGN0eC50YWJsZS5zY2hlbWEuaW5zdGFuY2VUZW1wbGF0ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBDb2xsZWN0aW9uIFByb3RlY3RlZCBGdW5jdGlvbnNcbiAgICAgICAgICAgIC8vXG5cbiAgICAgICAgICAgIF9yZWFkOiBmdW5jdGlvbiAoZm4sIGNiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2N0eDtcbiAgICAgICAgICAgICAgICBpZiAoY3R4LmVycm9yKSByZXR1cm4gY3R4LnRhYmxlLl90cmFucyhudWxsLCBmdW5jdGlvbiByZWplY3RvcihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGN0eC5lcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7ZWxzZSByZXR1cm4gY3R4LnRhYmxlLl9pZGJzdG9yZShSRUFET05MWSwgZm4pLnRoZW4oY2IpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF93cml0ZTogZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2N0eDtcbiAgICAgICAgICAgICAgICBpZiAoY3R4LmVycm9yKSByZXR1cm4gY3R4LnRhYmxlLl90cmFucyhudWxsLCBmdW5jdGlvbiByZWplY3RvcihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGN0eC5lcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7ZWxzZSByZXR1cm4gY3R4LnRhYmxlLl9pZGJzdG9yZShSRUFEV1JJVEUsIGZuLCBcImxvY2tlZFwiKTsgLy8gV2hlbiBkb2luZyB3cml0ZSBvcGVyYXRpb25zIG9uIGNvbGxlY3Rpb25zLCBhbHdheXMgbG9jayB0aGUgb3BlcmF0aW9uIHNvIHRoYXQgdXBjb21pbmcgb3BlcmF0aW9ucyBnZXRzIHF1ZXVlZC5cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBfYWRkQWxnb3JpdGhtOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGN0eC5hbGdvcml0aG0gPSBjb21iaW5lKGN0eC5hbGdvcml0aG0sIGZuKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIF9pdGVyYXRlOiBmdW5jdGlvbiAoZm4sIHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaXRlcih0aGlzLl9jdHgsIGZuLCByZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNsb25lOiBmdW5jdGlvbiAocHJvcHMkJDEpIHtcbiAgICAgICAgICAgICAgICB2YXIgcnYgPSBPYmplY3QuY3JlYXRlKHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlKSxcbiAgICAgICAgICAgICAgICAgICAgY3R4ID0gT2JqZWN0LmNyZWF0ZSh0aGlzLl9jdHgpO1xuICAgICAgICAgICAgICAgIGlmIChwcm9wcyQkMSkgZXh0ZW5kKGN0eCwgcHJvcHMkJDEpO1xuICAgICAgICAgICAgICAgIHJ2Ll9jdHggPSBjdHg7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ2O1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmF3OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3R4LnZhbHVlTWFwcGVyID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAvLyBDb2xsZWN0aW9uIFB1YmxpYyBtZXRob2RzXG4gICAgICAgICAgICAvL1xuXG4gICAgICAgICAgICBlYWNoOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuXG4gICAgICAgICAgICAgICAgaWYgKGZha2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBnZXRJbnN0YW5jZVRlbXBsYXRlKGN0eCksXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmltS2V5UGF0aCA9IGN0eC50YWJsZS5zY2hlbWEucHJpbUtleS5rZXlQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAga2V5ID0gZ2V0QnlLZXlQYXRoKGl0ZW0sIGN0eC5pbmRleCA/IGN0eC50YWJsZS5zY2hlbWEuaWR4QnlOYW1lW2N0eC5pbmRleF0ua2V5UGF0aCA6IHByaW1LZXlQYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW1hcnlLZXkgPSBnZXRCeUtleVBhdGgoaXRlbSwgcHJpbUtleVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBmbihpdGVtLCB7IGtleToga2V5LCBwcmltYXJ5S2V5OiBwcmltYXJ5S2V5IH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXIoY3R4LCBmbiwgcmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBjb3VudDogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZha2UpIHJldHVybiBQcm9taXNlLnJlc29sdmUoMCkudGhlbihjYik7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2N0eDtcblxuICAgICAgICAgICAgICAgIGlmIChpc1BsYWluS2V5UmFuZ2UoY3R4LCB0cnVlKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgcGxhaW4ga2V5IHJhbmdlLiBXZSBjYW4gdXNlIHRoZSBjb3VudCgpIG1ldGhvZCBpZiB0aGUgaW5kZXguXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4ID0gZ2V0SW5kZXhPclN0b3JlKGN0eCwgaWRic3RvcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGN0eC5yYW5nZSA/IGlkeC5jb3VudChjdHgucmFuZ2UpIDogaWR4LmNvdW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShNYXRoLm1pbihlLnRhcmdldC5yZXN1bHQsIGN0eC5saW1pdCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSwgY2IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEFsZ29yaXRobXMsIGZpbHRlcnMgb3IgZXhwcmVzc2lvbnMgYXJlIGFwcGxpZWQuIE5lZWQgdG8gY291bnQgbWFudWFsbHkuXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVyKGN0eCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsrY291bnQ7cmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoY291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgcmVqZWN0LCBpZGJzdG9yZSk7XG4gICAgICAgICAgICAgICAgICAgIH0sIGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBzb3J0Qnk6IGZ1bmN0aW9uIChrZXlQYXRoLCBjYikge1xuICAgICAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImtleVBhdGhcIiB0eXBlPVwiU3RyaW5nXCI+PC9wYXJhbT5cbiAgICAgICAgICAgICAgICB2YXIgcGFydHMgPSBrZXlQYXRoLnNwbGl0KCcuJykucmV2ZXJzZSgpLFxuICAgICAgICAgICAgICAgICAgICBsYXN0UGFydCA9IHBhcnRzWzBdLFxuICAgICAgICAgICAgICAgICAgICBsYXN0SW5kZXggPSBwYXJ0cy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGdldHZhbChvYmosIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGkpIHJldHVybiBnZXR2YWwob2JqW3BhcnRzW2ldXSwgaSAtIDEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqW2xhc3RQYXJ0XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG9yZGVyID0gdGhpcy5fY3R4LmRpciA9PT0gXCJuZXh0XCIgPyAxIDogLTE7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBzb3J0ZXIoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYVZhbCA9IGdldHZhbChhLCBsYXN0SW5kZXgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYlZhbCA9IGdldHZhbChiLCBsYXN0SW5kZXgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYVZhbCA8IGJWYWwgPyAtb3JkZXIgOiBhVmFsID4gYlZhbCA/IG9yZGVyIDogMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9BcnJheShmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5zb3J0KHNvcnRlcik7XG4gICAgICAgICAgICAgICAgfSkudGhlbihjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB0b0FycmF5OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZha2UgJiYgcmVzb2x2ZShbZ2V0SW5zdGFuY2VUZW1wbGF0ZShjdHgpXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNHZXRBbGwgJiYgY3R4LmRpciA9PT0gJ25leHQnICYmIGlzUGxhaW5LZXlSYW5nZShjdHgsIHRydWUpICYmIGN0eC5saW1pdCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgb3B0aW1hdGlvbiBpZiB3ZSBjb3VsZCB1c2UgSURCT2JqZWN0U3RvcmUuZ2V0QWxsKCkgb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElEQktleVJhbmdlLmdldEFsbCgpOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlYWRpbmdIb29rID0gY3R4LnRhYmxlLmhvb2sucmVhZGluZy5maXJlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlkeE9yU3RvcmUgPSBnZXRJbmRleE9yU3RvcmUoY3R4LCBpZGJzdG9yZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVxID0gY3R4LmxpbWl0IDwgSW5maW5pdHkgPyBpZHhPclN0b3JlLmdldEFsbChjdHgucmFuZ2UsIGN0eC5saW1pdCkgOiBpZHhPclN0b3JlLmdldEFsbChjdHgucmFuZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSByZWFkaW5nSG9vayA9PT0gbWlycm9yID8gZXZlbnRTdWNjZXNzSGFuZGxlcihyZXNvbHZlKSA6IHdyYXAoZXZlbnRTdWNjZXNzSGFuZGxlcihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMubWFwKHJlYWRpbmdIb29rKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0dGluZyBhcnJheSB0aHJvdWdoIGEgY3Vyc29yLlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGEgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXIoY3R4LCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGEucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIGFycmF5Q29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIHJlamVjdCwgaWRic3RvcmUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSwgY2IpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb2Zmc2V0OiBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2N0eDtcbiAgICAgICAgICAgICAgICBpZiAob2Zmc2V0IDw9IDApIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIGN0eC5vZmZzZXQgKz0gb2Zmc2V0OyAvLyBGb3IgY291bnQoKVxuICAgICAgICAgICAgICAgIGlmIChpc1BsYWluS2V5UmFuZ2UoY3R4KSkge1xuICAgICAgICAgICAgICAgICAgICBhZGRSZXBsYXlGaWx0ZXIoY3R4LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0TGVmdCA9IG9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoY3Vyc29yLCBhZHZhbmNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldExlZnQgPT09IDApIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvZmZzZXRMZWZ0ID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC0tb2Zmc2V0TGVmdDtyZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IuYWR2YW5jZShvZmZzZXRMZWZ0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0TGVmdCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYWRkUmVwbGF5RmlsdGVyKGN0eCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9mZnNldExlZnQgPSBvZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAtLW9mZnNldExlZnQgPCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbGltaXQ6IGZ1bmN0aW9uIChudW1Sb3dzKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3R4LmxpbWl0ID0gTWF0aC5taW4odGhpcy5fY3R4LmxpbWl0LCBudW1Sb3dzKTsgLy8gRm9yIGNvdW50KClcbiAgICAgICAgICAgICAgICBhZGRSZXBsYXlGaWx0ZXIodGhpcy5fY3R4LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciByb3dzTGVmdCA9IG51bVJvd3M7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoY3Vyc29yLCBhZHZhbmNlLCByZXNvbHZlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoLS1yb3dzTGVmdCA8PSAwKSBhZHZhbmNlKHJlc29sdmUpOyAvLyBTdG9wIGFmdGVyIHRoaXMgaXRlbSBoYXMgYmVlbiBpbmNsdWRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJvd3NMZWZ0ID49IDA7IC8vIElmIG51bVJvd3MgaXMgYWxyZWFkeSBiZWxvdyAwLCByZXR1cm4gZmFsc2UgYmVjYXVzZSB0aGVuIDAgd2FzIHBhc3NlZCB0byBudW1Sb3dzIGluaXRpYWxseS4gT3RoZXJ3aXNlIHdlIHdvdWxkbnQgY29tZSBoZXJlLlxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdW50aWw6IGZ1bmN0aW9uIChmaWx0ZXJGdW5jdGlvbiwgYkluY2x1ZGVTdG9wRW50cnkpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGZha2UgJiYgZmlsdGVyRnVuY3Rpb24oZ2V0SW5zdGFuY2VUZW1wbGF0ZShjdHgpKTtcbiAgICAgICAgICAgICAgICBhZGRGaWx0ZXIodGhpcy5fY3R4LCBmdW5jdGlvbiAoY3Vyc29yLCBhZHZhbmNlLCByZXNvbHZlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXJGdW5jdGlvbihjdXJzb3IudmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlKHJlc29sdmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJJbmNsdWRlU3RvcEVudHJ5O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGZpcnN0OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5saW1pdCgxKS50b0FycmF5KGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhWzBdO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oY2IpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbGFzdDogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMucmV2ZXJzZSgpLmZpcnN0KGNiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGZpbHRlcjogZnVuY3Rpb24gKGZpbHRlckZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwianNGdW5jdGlvbkZpbHRlclwiIHR5cGU9XCJGdW5jdGlvblwiPmZ1bmN0aW9uKHZhbCl7cmV0dXJuIHRydWUvZmFsc2V9PC9wYXJhbT5cbiAgICAgICAgICAgICAgICBmYWtlICYmIGZpbHRlckZ1bmN0aW9uKGdldEluc3RhbmNlVGVtcGxhdGUodGhpcy5fY3R4KSk7XG4gICAgICAgICAgICAgICAgYWRkRmlsdGVyKHRoaXMuX2N0eCwgZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmlsdGVyRnVuY3Rpb24oY3Vyc29yLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAvLyBtYXRjaCBmaWx0ZXJzIG5vdCB1c2VkIGluIERleGllLmpzIGJ1dCBjYW4gYmUgdXNlZCBieSAzcmQgcGFydCBsaWJyYXJpZXMgdG8gdGVzdCBhXG4gICAgICAgICAgICAgICAgLy8gY29sbGVjdGlvbiBmb3IgYSBtYXRjaCB3aXRob3V0IHF1ZXJ5aW5nIERCLiBVc2VkIGJ5IERleGllLk9ic2VydmFibGUuXG4gICAgICAgICAgICAgICAgYWRkTWF0Y2hGaWx0ZXIodGhpcy5fY3R4LCBmaWx0ZXJGdW5jdGlvbik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBhbmQ6IGZ1bmN0aW9uIChmaWx0ZXJGdW5jdGlvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZpbHRlcihmaWx0ZXJGdW5jdGlvbik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvcjogZnVuY3Rpb24gKGluZGV4TmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgV2hlcmVDbGF1c2UodGhpcy5fY3R4LnRhYmxlLCBpbmRleE5hbWUsIHRoaXMpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcmV2ZXJzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2N0eC5kaXIgPSB0aGlzLl9jdHguZGlyID09PSBcInByZXZcIiA/IFwibmV4dFwiIDogXCJwcmV2XCI7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX29uZGlyZWN0aW9uY2hhbmdlKSB0aGlzLl9vbmRpcmVjdGlvbmNoYW5nZSh0aGlzLl9jdHguZGlyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGRlc2M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXZlcnNlKCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBlYWNoS2V5OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGN0eC5rZXlzT25seSA9ICFjdHguaXNNYXRjaDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICh2YWwsIGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICBjYihjdXJzb3Iua2V5LCBjdXJzb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZWFjaFVuaXF1ZUtleTogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3R4LnVuaXF1ZSA9IFwidW5pcXVlXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWFjaEtleShjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBlYWNoUHJpbWFyeUtleTogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2N0eDtcbiAgICAgICAgICAgICAgICBjdHgua2V5c09ubHkgPSAhY3R4LmlzTWF0Y2g7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAodmFsLCBjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY2IoY3Vyc29yLnByaW1hcnlLZXksIGN1cnNvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBrZXlzOiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGN0eC5rZXlzT25seSA9ICFjdHguaXNNYXRjaDtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKGl0ZW0sIGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICBhLnB1c2goY3Vyc29yLmtleSk7XG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oY2IpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgcHJpbWFyeUtleXM6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG4gICAgICAgICAgICAgICAgaWYgKGhhc0dldEFsbCAmJiBjdHguZGlyID09PSAnbmV4dCcgJiYgaXNQbGFpbktleVJhbmdlKGN0eCwgdHJ1ZSkgJiYgY3R4LmxpbWl0ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTcGVjaWFsIG9wdGltYXRpb24gaWYgd2UgY291bGQgdXNlIElEQk9iamVjdFN0b3JlLmdldEFsbEtleXMoKSBvclxuICAgICAgICAgICAgICAgICAgICAvLyBJREJLZXlSYW5nZS5nZXRBbGxLZXlzKCk6XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9yZWFkKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4T3JTdG9yZSA9IGdldEluZGV4T3JTdG9yZShjdHgsIGlkYnN0b3JlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXEgPSBjdHgubGltaXQgPCBJbmZpbml0eSA/IGlkeE9yU3RvcmUuZ2V0QWxsS2V5cyhjdHgucmFuZ2UsIGN0eC5saW1pdCkgOiBpZHhPclN0b3JlLmdldEFsbEtleXMoY3R4LnJhbmdlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZXZlbnRTdWNjZXNzSGFuZGxlcihyZXNvbHZlKTtcbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihjYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN0eC5rZXlzT25seSA9ICFjdHguaXNNYXRjaDtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKGl0ZW0sIGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICBhLnB1c2goY3Vyc29yLnByaW1hcnlLZXkpO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGNiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHVuaXF1ZUtleXM6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHRoaXMuX2N0eC51bmlxdWUgPSBcInVuaXF1ZVwiO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmtleXMoY2IpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZmlyc3RLZXk6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxpbWl0KDEpLmtleXMoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFbMF07XG4gICAgICAgICAgICAgICAgfSkudGhlbihjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBsYXN0S2V5OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXZlcnNlKCkuZmlyc3RLZXkoY2IpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZGlzdGluY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4LFxuICAgICAgICAgICAgICAgICAgICBpZHggPSBjdHguaW5kZXggJiYgY3R4LnRhYmxlLnNjaGVtYS5pZHhCeU5hbWVbY3R4LmluZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoIWlkeCB8fCAhaWR4Lm11bHRpKSByZXR1cm4gdGhpczsgLy8gZGlzdGluY3QoKSBvbmx5IG1ha2VzIGRpZmZlcmVuY2llcyBvbiBtdWx0aUVudHJ5IGluZGV4ZXMuXG4gICAgICAgICAgICAgICAgdmFyIHNldCA9IHt9O1xuICAgICAgICAgICAgICAgIGFkZEZpbHRlcih0aGlzLl9jdHgsIGZ1bmN0aW9uIChjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0cktleSA9IGN1cnNvci5wcmltYXJ5S2V5LnRvU3RyaW5nKCk7IC8vIENvbnZlcnRzIGFueSBEYXRlIHRvIFN0cmluZywgU3RyaW5nIHRvIFN0cmluZywgTnVtYmVyIHRvIFN0cmluZyBhbmQgQXJyYXkgdG8gY29tbWEtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm91bmQgPSBoYXNPd24oc2V0LCBzdHJLZXkpO1xuICAgICAgICAgICAgICAgICAgICBzZXRbc3RyS2V5XSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAhZm91bmQ7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gV3JpdGVhYmxlQ29sbGVjdGlvbiBDbGFzc1xuICAgIC8vXG4gICAgLy9cbiAgICBmdW5jdGlvbiBXcml0ZWFibGVDb2xsZWN0aW9uKCkge1xuICAgICAgICBDb2xsZWN0aW9uLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgZGVyaXZlKFdyaXRlYWJsZUNvbGxlY3Rpb24pLmZyb20oQ29sbGVjdGlvbikuZXh0ZW5kKHtcblxuICAgICAgICAvL1xuICAgICAgICAvLyBXcml0ZWFibGVDb2xsZWN0aW9uIFB1YmxpYyBNZXRob2RzXG4gICAgICAgIC8vXG5cbiAgICAgICAgbW9kaWZ5OiBmdW5jdGlvbiAoY2hhbmdlcykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgICAgIGN0eCA9IHRoaXMuX2N0eCxcbiAgICAgICAgICAgICAgICBob29rID0gY3R4LnRhYmxlLmhvb2ssXG4gICAgICAgICAgICAgICAgdXBkYXRpbmdIb29rID0gaG9vay51cGRhdGluZy5maXJlLFxuICAgICAgICAgICAgICAgIGRlbGV0aW5nSG9vayA9IGhvb2suZGVsZXRpbmcuZmlyZTtcblxuICAgICAgICAgICAgZmFrZSAmJiB0eXBlb2YgY2hhbmdlcyA9PT0gJ2Z1bmN0aW9uJyAmJiBjaGFuZ2VzLmNhbGwoeyB2YWx1ZTogY3R4LnRhYmxlLnNjaGVtYS5pbnN0YW5jZVRlbXBsYXRlIH0sIGN0eC50YWJsZS5zY2hlbWEuaW5zdGFuY2VUZW1wbGF0ZSk7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl93cml0ZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSwgdHJhbnMpIHtcbiAgICAgICAgICAgICAgICB2YXIgbW9kaWZ5ZXI7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBjaGFuZ2VzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoYW5nZXMgaXMgYSBmdW5jdGlvbiB0aGF0IG1heSB1cGRhdGUsIGFkZCBvciBkZWxldGUgcHJvcHRlcnRpZXMgb3IgZXZlbiByZXF1aXJlIGEgZGVsZXRpb24gdGhlIG9iamVjdCBpdHNlbGYgKGRlbGV0ZSB0aGlzLml0ZW0pXG4gICAgICAgICAgICAgICAgICAgIGlmICh1cGRhdGluZ0hvb2sgPT09IG5vcCAmJiBkZWxldGluZ0hvb2sgPT09IG5vcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9vbmUgY2FyZXMgYWJvdXQgd2hhdCBpcyBiZWluZyBjaGFuZ2VkLiBKdXN0IGxldCB0aGUgbW9kaWZpZXIgZnVuY3Rpb24gYmUgdGhlIGdpdmVuIGFyZ3VtZW50IGFzIGlzLlxuICAgICAgICAgICAgICAgICAgICAgICAgbW9kaWZ5ZXIgPSBjaGFuZ2VzO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUGVvcGxlIHdhbnQgdG8ga25vdyBleGFjdGx5IHdoYXQgaXMgYmVpbmcgbW9kaWZpZWQgb3IgZGVsZXRlZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIExldCBtb2RpZnllciBiZSBhIHByb3h5IGZ1bmN0aW9uIHRoYXQgZmluZHMgb3V0IHdoYXQgY2hhbmdlcyB0aGUgY2FsbGVyIGlzIGFjdHVhbGx5IGRvaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBhbmQgY2FsbCB0aGUgaG9va3MgYWNjb3JkaW5nbHkhXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RpZnllciA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWdJdGVtID0gZGVlcENsb25lKGl0ZW0pOyAvLyBDbG9uZSB0aGUgaXRlbSBmaXJzdCBzbyB3ZSBjYW4gY29tcGFyZSBsYXRlcnMuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYW5nZXMuY2FsbCh0aGlzLCBpdGVtLCB0aGlzKSA9PT0gZmFsc2UpIHJldHVybiBmYWxzZTsgLy8gQ2FsbCB0aGUgcmVhbCBtb2RpZnllciBmdW5jdGlvbiAoSWYgaXQgcmV0dXJucyBmYWxzZSBleHBsaWNpdGVseSwgaXQgbWVhbnMgaXQgZG9udCB3YW50IHRvIG1vZGlmeSBhbnl0aW5nIG9uIHRoaXMgb2JqZWN0KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzT3duKHRoaXMsIFwidmFsdWVcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIHJlYWwgbW9kaWZ5ZXIgZnVuY3Rpb24gcmVxdWVzdHMgYSBkZWxldGlvbiBvZiB0aGUgb2JqZWN0LiBJbmZvcm0gdGhlIGRlbGV0aW5nSG9vayB0aGF0IGEgZGVsZXRpb24gaXMgdGFraW5nIHBsYWNlLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGluZ0hvb2suY2FsbCh0aGlzLCB0aGlzLnByaW1LZXksIGl0ZW0sIHRyYW5zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBkZWxldGlvbi4gQ2hlY2sgd2hhdCB3YXMgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2JqZWN0RGlmZiA9IGdldE9iamVjdERpZmYob3JpZ0l0ZW0sIHRoaXMudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgYWRkaXRpb25hbENoYW5nZXMgPSB1cGRhdGluZ0hvb2suY2FsbCh0aGlzLCBvYmplY3REaWZmLCB0aGlzLnByaW1LZXksIG9yaWdJdGVtLCB0cmFucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRpdGlvbmFsQ2hhbmdlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSG9vayB3YW50IHRvIGFwcGx5IGFkZGl0aW9uYWwgbW9kaWZpY2F0aW9ucy4gTWFrZSBzdXJlIHRvIGZ1bGxmaWxsIHRoZSB3aWxsIG9mIHRoZSBob29rLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbSA9IHRoaXMudmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlzKGFkZGl0aW9uYWxDaGFuZ2VzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXlQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QnlLZXlQYXRoKGl0ZW0sIGtleVBhdGgsIGFkZGl0aW9uYWxDaGFuZ2VzW2tleVBhdGhdKTsgLy8gQWRkaW5nIHtrZXlQYXRoOiB1bmRlZmluZWR9IG1lYW5zIHRoYXQgdGhlIGtleVBhdGggc2hvdWxkIGJlIGRlbGV0ZWQuIEhhbmRsZWQgYnkgc2V0QnlLZXlQYXRoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHVwZGF0aW5nSG9vayA9PT0gbm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNoYW5nZXMgaXMgYSBzZXQgb2Yge2tleVBhdGg6IHZhbHVlfSBhbmQgbm8gb25lIGlzIGxpc3RlbmluZyB0byB0aGUgdXBkYXRpbmcgaG9vay5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGtleVBhdGhzID0ga2V5cyhjaGFuZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG51bUtleXMgPSBrZXlQYXRocy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIG1vZGlmeWVyID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhbnl0aGluZ01vZGlmaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bUtleXM7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXlQYXRoID0ga2V5UGF0aHNbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbCA9IGNoYW5nZXNba2V5UGF0aF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdldEJ5S2V5UGF0aChpdGVtLCBrZXlQYXRoKSAhPT0gdmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldEJ5S2V5UGF0aChpdGVtLCBrZXlQYXRoLCB2YWwpOyAvLyBBZGRpbmcge2tleVBhdGg6IHVuZGVmaW5lZH0gbWVhbnMgdGhhdCB0aGUga2V5UGF0aCBzaG91bGQgYmUgZGVsZXRlZC4gSGFuZGxlZCBieSBzZXRCeUtleVBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW55dGhpbmdNb2RpZmllZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFueXRoaW5nTW9kaWZpZWQ7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hhbmdlcyBpcyBhIHNldCBvZiB7a2V5UGF0aDogdmFsdWV9IGFuZCBwZW9wbGUgYXJlIGxpc3RlbmluZyB0byB0aGUgdXBkYXRpbmcgaG9vayBzbyB3ZSBuZWVkIHRvIGNhbGwgaXQgYW5kXG4gICAgICAgICAgICAgICAgICAgIC8vIGFsbG93IGl0IHRvIGFkZCBhZGRpdGlvbmFsIG1vZGlmaWNhdGlvbnMgdG8gbWFrZS5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG9yaWdDaGFuZ2VzID0gY2hhbmdlcztcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlcyA9IHNoYWxsb3dDbG9uZShvcmlnQ2hhbmdlcyk7IC8vIExldCdzIHdvcmsgd2l0aCBhIGNsb25lIG9mIHRoZSBjaGFuZ2VzIGtleVBhdGgvdmFsdWUgc2V0IHNvIHRoYXQgd2UgY2FuIHJlc3RvcmUgaXQgaW4gY2FzZSBhIGhvb2sgZXh0ZW5kcyBpdC5cbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5ZXIgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFueXRoaW5nTW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhZGRpdGlvbmFsQ2hhbmdlcyA9IHVwZGF0aW5nSG9vay5jYWxsKHRoaXMsIGNoYW5nZXMsIHRoaXMucHJpbUtleSwgZGVlcENsb25lKGl0ZW0pLCB0cmFucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkaXRpb25hbENoYW5nZXMpIGV4dGVuZChjaGFuZ2VzLCBhZGRpdGlvbmFsQ2hhbmdlcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzKGNoYW5nZXMpLmZvckVhY2goZnVuY3Rpb24gKGtleVBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsID0gY2hhbmdlc1trZXlQYXRoXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2V0QnlLZXlQYXRoKGl0ZW0sIGtleVBhdGgpICE9PSB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QnlLZXlQYXRoKGl0ZW0sIGtleVBhdGgsIHZhbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFueXRoaW5nTW9kaWZpZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxDaGFuZ2VzKSBjaGFuZ2VzID0gc2hhbGxvd0Nsb25lKG9yaWdDaGFuZ2VzKTsgLy8gUmVzdG9yZSBvcmlnaW5hbCBjaGFuZ2VzIGZvciBuZXh0IGl0ZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFueXRoaW5nTW9kaWZpZWQ7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICB2YXIgc3VjY2Vzc0NvdW50ID0gMDtcbiAgICAgICAgICAgICAgICB2YXIgaXRlcmF0aW9uQ29tcGxldGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB2YXIgZmFpbHVyZXMgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgZmFpbEtleXMgPSBbXTtcbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudEtleSA9IG51bGw7XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBtb2RpZnlJdGVtKGl0ZW0sIGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50S2V5ID0gY3Vyc29yLnByaW1hcnlLZXk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0aGlzQ29udGV4dCA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW1LZXk6IGN1cnNvci5wcmltYXJ5S2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0sXG4gICAgICAgICAgICAgICAgICAgICAgICBvbnN1Y2Nlc3M6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbmVycm9yOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gb25lcnJvcihlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsdXJlcy5wdXNoKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbEtleXMucHVzaCh0aGlzQ29udGV4dC5wcmltS2V5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRmluaXNoZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlOyAvLyBDYXRjaCB0aGVzZSBlcnJvcnMgYW5kIGxldCBhIGZpbmFsIHJlamVjdGlvbiBkZWNpZGUgd2hldGhlciBvciBub3QgdG8gYWJvcnQgZW50aXJlIHRyYW5zYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kaWZ5ZXIuY2FsbCh0aGlzQ29udGV4dCwgaXRlbSwgdGhpc0NvbnRleHQpICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgYSBjYWxsYmFjayBleHBsaWNpdGVseSByZXR1cm5zIGZhbHNlLCBkbyBub3QgcGVyZm9ybSB0aGUgdXBkYXRlIVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJEZWxldGUgPSAhaGFzT3duKHRoaXNDb250ZXh0LCBcInZhbHVlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgKytjb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeUNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVxID0gYkRlbGV0ZSA/IGN1cnNvci5kZWxldGUoKSA6IGN1cnNvci51cGRhdGUodGhpc0NvbnRleHQudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5faG9va0N0eCA9IHRoaXNDb250ZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gaG9va2VkRXZlbnRSZWplY3RIYW5kbGVyKG9uZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBob29rZWRFdmVudFN1Y2Nlc3NIYW5kbGVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKytzdWNjZXNzQ291bnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRmluaXNoZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIG9uZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXNDb250ZXh0Lm9uc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSG9vayB3aWxsIGV4cGVjdCBlaXRoZXIgb25lcnJvciBvciBvbnN1Y2Nlc3MgdG8gYWx3YXlzIGJlIGNhbGxlZCFcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNDb250ZXh0Lm9uc3VjY2Vzcyh0aGlzQ29udGV4dC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBkb1JlamVjdChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsdXJlcy5wdXNoKGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbEtleXMucHVzaChjdXJyZW50S2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBNb2RpZnlFcnJvcihcIkVycm9yIG1vZGlmeWluZyBvbmUgb3IgbW9yZSBvYmplY3RzXCIsIGZhaWx1cmVzLCBzdWNjZXNzQ291bnQsIGZhaWxLZXlzKSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tGaW5pc2hlZCgpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZXJhdGlvbkNvbXBsZXRlICYmIHN1Y2Nlc3NDb3VudCArIGZhaWx1cmVzLmxlbmd0aCA9PT0gY291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmYWlsdXJlcy5sZW5ndGggPiAwKSBkb1JlamVjdCgpO2Vsc2UgcmVzb2x2ZShzdWNjZXNzQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlbGYuY2xvbmUoKS5yYXcoKS5faXRlcmF0ZShtb2RpZnlJdGVtLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGl0ZXJhdGlvbkNvbXBsZXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tGaW5pc2hlZCgpO1xuICAgICAgICAgICAgICAgIH0sIGRvUmVqZWN0LCBpZGJzdG9yZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICAnZGVsZXRlJzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHgsXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSBjdHgucmFuZ2UsXG4gICAgICAgICAgICAgICAgZGVsZXRpbmdIb29rID0gY3R4LnRhYmxlLmhvb2suZGVsZXRpbmcuZmlyZSxcbiAgICAgICAgICAgICAgICBoYXNEZWxldGVIb29rID0gZGVsZXRpbmdIb29rICE9PSBub3A7XG4gICAgICAgICAgICBpZiAoIWhhc0RlbGV0ZUhvb2sgJiYgaXNQbGFpbktleVJhbmdlKGN0eCkgJiYgKGN0eC5pc1ByaW1LZXkgJiYgIWhhbmdzT25EZWxldGVMYXJnZUtleVJhbmdlIHx8ICFyYW5nZSkpIC8vIGlmIG5vIHJhbmdlLCB3ZSdsbCB1c2UgY2xlYXIoKS5cbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE1heSB1c2UgSURCT2JqZWN0U3RvcmUuZGVsZXRlKElEQktleVJhbmdlKSBpbiB0aGlzIGNhc2UgKElzc3VlICMyMDgpXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBjaHJvbWl1bSwgdGhpcyBpcyB0aGUgd2F5IG1vc3Qgb3B0aW1pemVkIHZlcnNpb24uXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBJRS9FZGdlLCB0aGlzIGNvdWxkIGhhbmcgdGhlIGluZGV4ZWREQiBlbmdpbmUgYW5kIG1ha2Ugb3BlcmF0aW5nIHN5c3RlbSBpbnN0YWJsZVxuICAgICAgICAgICAgICAgICAgICAvLyAoaHR0cHM6Ly9naXN0LmdpdGh1Yi5jb20vZGZhaGxhbmRlci81YTM5MzI4ZjAyOWRlMTgyMjJjZjIxMjVkNTZjMzhmNylcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPdXIgQVBJIGNvbnRyYWN0IGlzIHRvIHJldHVybiBhIGNvdW50IG9mIGRlbGV0ZWQgaXRlbXMsIHNvIHdlIGhhdmUgdG8gY291bnQoKSBiZWZvcmUgZGVsZXRlKCkuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50UmVxID0gcmFuZ2UgPyBpZGJzdG9yZS5jb3VudChyYW5nZSkgOiBpZGJzdG9yZS5jb3VudCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY291bnRSZXEub25lcnJvciA9IG9uZXJyb3I7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudFJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gY291bnRSZXEucmVzdWx0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeUNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRlbFJlcSA9IHJhbmdlID8gaWRic3RvcmUuZGVsZXRlKHJhbmdlKSA6IGlkYnN0b3JlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbFJlcS5vbmVycm9yID0gb25lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsUmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKGNvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGVmYXVsdCB2ZXJzaW9uIHRvIHVzZSB3aGVuIGNvbGxlY3Rpb24gaXMgbm90IGEgdmFuaWxsYSBJREJLZXlSYW5nZSBvbiB0aGUgcHJpbWFyeSBrZXkuXG4gICAgICAgICAgICAvLyBEaXZpZGUgaW50byBjaHVua3MgdG8gbm90IHN0YXJ2ZSBSQU0uXG4gICAgICAgICAgICAvLyBJZiBoYXMgZGVsZXRlIGhvb2ssIHdlIHdpbGwgaGF2ZSB0byBjb2xsZWN0IG5vdCBqdXN0IGtleXMgYnV0IGFsc28gb2JqZWN0cywgc28gaXQgd2lsbCB1c2VcbiAgICAgICAgICAgIC8vIG1vcmUgbWVtb3J5IGFuZCBuZWVkIGxvd2VyIGNodW5rIHNpemUuXG4gICAgICAgICAgICB2YXIgQ0hVTktTSVpFID0gaGFzRGVsZXRlSG9vayA/IDIwMDAgOiAxMDAwMDtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlLCB0cmFucykge1xuICAgICAgICAgICAgICAgIHZhciB0b3RhbENvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAvLyBDbG9uZSBjb2xsZWN0aW9uIGFuZCBjaGFuZ2UgaXRzIHRhYmxlIGFuZCBzZXQgYSBsaW1pdCBvZiBDSFVOS1NJWkUgb24gdGhlIGNsb25lZCBDb2xsZWN0aW9uIGluc3RhbmNlLlxuICAgICAgICAgICAgICAgIHZhciBjb2xsZWN0aW9uID0gX3RoaXM0LmNsb25lKHtcbiAgICAgICAgICAgICAgICAgICAga2V5c09ubHk6ICFjdHguaXNNYXRjaCAmJiAhaGFzRGVsZXRlSG9vayB9KSAvLyBsb2FkIGp1c3Qga2V5cyAodW5sZXNzIGZpbHRlcigpIG9yIGFuZCgpIG9yIGRlbGV0ZUhvb2sgaGFzIHN1YnNjcmliZXJzKVxuICAgICAgICAgICAgICAgIC5kaXN0aW5jdCgpIC8vIEluIGNhc2UgbXVsdGlFbnRyeSBpcyB1c2VkLCBuZXZlciBkZWxldGUgc2FtZSBrZXkgdHdpY2UgYmVjYXVzZSByZXN1bHRpbmcgY291bnRcbiAgICAgICAgICAgICAgICAvLyB3b3VsZCBiZWNvbWUgbGFyZ2VyIHRoYW4gYWN0dWFsIGRlbGV0ZSBjb3VudC5cbiAgICAgICAgICAgICAgICAubGltaXQoQ0hVTktTSVpFKS5yYXcoKTsgLy8gRG9uJ3QgZmlsdGVyIHRocm91Z2ggcmVhZGluZy1ob29rcyAobGlrZSBtYXBwZWQgY2xhc3NlcyBldGMpXG5cbiAgICAgICAgICAgICAgICB2YXIga2V5c09yVHVwbGVzID0gW107XG5cbiAgICAgICAgICAgICAgICAvLyBXZSdyZSBnb25uYSBkbyB0aGluZ3Mgb24gYXMgbWFueSBjaHVua3MgdGhhdCBhcmUgbmVlZGVkLlxuICAgICAgICAgICAgICAgIC8vIFVzZSByZWN1cnNpb24gb2YgbmV4dENodW5rIGZ1bmN0aW9uOlxuICAgICAgICAgICAgICAgIHZhciBuZXh0Q2h1bmsgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uLmVhY2goaGFzRGVsZXRlSG9vayA/IGZ1bmN0aW9uICh2YWwsIGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU29tZWJvZHkgc3Vic2NyaWJlcyB0byBob29rKCdkZWxldGluZycpLiBDb2xsZWN0IGFsbCBwcmltYXJ5IGtleXMgYW5kIHRoZWlyIHZhbHVlcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNvIHRoYXQgdGhlIGhvb2sgY2FuIGJlIGNhbGxlZCB3aXRoIGl0cyB2YWx1ZXMgaW4gYnVsa0RlbGV0ZSgpLlxuICAgICAgICAgICAgICAgICAgICAgICAga2V5c09yVHVwbGVzLnB1c2goW2N1cnNvci5wcmltYXJ5S2V5LCBjdXJzb3IudmFsdWVdKTtcbiAgICAgICAgICAgICAgICAgICAgfSA6IGZ1bmN0aW9uICh2YWwsIGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm8gb25lIHN1YnNjcmliZXMgdG8gaG9vaygnZGVsZXRpbmcnKS4gQ29sbGVjdCBvbmx5IHByaW1hcnkga2V5czpcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXNPclR1cGxlcy5wdXNoKGN1cnNvci5wcmltYXJ5S2V5KTtcbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDaHJvbWl1bSBkZWxldGVzIGZhc3RlciB3aGVuIGRvaW5nIGl0IGluIHNvcnQgb3JkZXIuXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNEZWxldGVIb29rID8ga2V5c09yVHVwbGVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXNjZW5kaW5nKGFbMF0sIGJbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkgOiBrZXlzT3JUdXBsZXMuc29ydChhc2NlbmRpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJ1bGtEZWxldGUoaWRic3RvcmUsIHRyYW5zLCBrZXlzT3JUdXBsZXMsIGhhc0RlbGV0ZUhvb2ssIGRlbGV0aW5nSG9vayk7XG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNvdW50ID0ga2V5c09yVHVwbGVzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsQ291bnQgKz0gY291bnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzT3JUdXBsZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb3VudCA8IENIVU5LU0laRSA/IHRvdGFsQ291bnQgOiBuZXh0Q2h1bmsoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIHJlc29sdmUobmV4dENodW5rKCkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gSGVscCBmdW5jdGlvbnMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG5cbiAgICBmdW5jdGlvbiBsb3dlclZlcnNpb25GaXJzdChhLCBiKSB7XG4gICAgICAgIHJldHVybiBhLl9jZmcudmVyc2lvbiAtIGIuX2NmZy52ZXJzaW9uO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldEFwaU9uUGxhY2Uob2JqcywgdGFibGVOYW1lcywgbW9kZSwgZGJzY2hlbWEpIHtcbiAgICAgICAgdGFibGVOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uICh0YWJsZU5hbWUpIHtcbiAgICAgICAgICAgIHZhciB0YWJsZUluc3RhbmNlID0gZGIuX3RhYmxlRmFjdG9yeShtb2RlLCBkYnNjaGVtYVt0YWJsZU5hbWVdKTtcbiAgICAgICAgICAgIG9ianMuZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICAgICAgdGFibGVOYW1lIGluIG9iaiB8fCAob2JqW3RhYmxlTmFtZV0gPSB0YWJsZUluc3RhbmNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZW1vdmVUYWJsZXNBcGkob2Jqcykge1xuICAgICAgICBvYmpzLmZvckVhY2goZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmIChvYmpba2V5XSBpbnN0YW5jZW9mIFRhYmxlKSBkZWxldGUgb2JqW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGl0ZXJhdGUocmVxLCBmaWx0ZXIsIGZuLCByZXNvbHZlLCByZWplY3QsIHZhbHVlTWFwcGVyKSB7XG5cbiAgICAgICAgLy8gQXBwbHkgdmFsdWVNYXBwZXIgKGhvb2soJ3JlYWRpbmcnKSBvciBtYXBwcGVkIGNsYXNzKVxuICAgICAgICB2YXIgbWFwcGVkRm4gPSB2YWx1ZU1hcHBlciA/IGZ1bmN0aW9uICh4LCBjLCBhKSB7XG4gICAgICAgICAgICByZXR1cm4gZm4odmFsdWVNYXBwZXIoeCksIGMsIGEpO1xuICAgICAgICB9IDogZm47XG4gICAgICAgIC8vIFdyYXAgZm4gd2l0aCBQU0QgYW5kIG1pY3JvdGljayBzdHVmZiBmcm9tIFByb21pc2UuXG4gICAgICAgIHZhciB3cmFwcGVkRm4gPSB3cmFwKG1hcHBlZEZuLCByZWplY3QpO1xuXG4gICAgICAgIGlmICghcmVxLm9uZXJyb3IpIHJlcS5vbmVycm9yID0gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCk7XG4gICAgICAgIGlmIChmaWx0ZXIpIHtcbiAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSB0cnljYXRjaGVyKGZ1bmN0aW9uIGZpbHRlcl9yZWNvcmQoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnNvciA9IHJlcS5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsdGVyKGN1cnNvciwgZnVuY3Rpb24gKGFkdmFuY2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gYWR2YW5jZXI7XG4gICAgICAgICAgICAgICAgICAgIH0sIHJlc29sdmUsIHJlamVjdCkpIHdyYXBwZWRGbihjdXJzb3IudmFsdWUsIGN1cnNvciwgZnVuY3Rpb24gKGFkdmFuY2VyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjID0gYWR2YW5jZXI7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBjKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXEub25zdWNjZXNzID0gdHJ5Y2F0Y2hlcihmdW5jdGlvbiBmaWx0ZXJfcmVjb3JkKCkge1xuICAgICAgICAgICAgICAgIHZhciBjdXJzb3IgPSByZXEucmVzdWx0O1xuICAgICAgICAgICAgICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJzb3IuY29udGludWUoKTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgd3JhcHBlZEZuKGN1cnNvci52YWx1ZSwgY3Vyc29yLCBmdW5jdGlvbiAoYWR2YW5jZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBhZHZhbmNlcjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHBhcnNlSW5kZXhTeW50YXgoaW5kZXhlcykge1xuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJpbmRleGVzXCIgdHlwZT1cIlN0cmluZ1wiPjwvcGFyYW0+XG4gICAgICAgIC8vLyA8cmV0dXJucyB0eXBlPVwiQXJyYXlcIiBlbGVtZW50VHlwZT1cIkluZGV4U3BlY1wiPjwvcmV0dXJucz5cbiAgICAgICAgdmFyIHJ2ID0gW107XG4gICAgICAgIGluZGV4ZXMuc3BsaXQoJywnKS5mb3JFYWNoKGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICAgICAgaW5kZXggPSBpbmRleC50cmltKCk7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IGluZGV4LnJlcGxhY2UoLyhbJipdfFxcK1xcKykvZywgXCJcIik7IC8vIFJlbW92ZSBcIiZcIiwgXCIrK1wiIGFuZCBcIipcIlxuICAgICAgICAgICAgLy8gTGV0IGtleVBhdGggb2YgXCJbYStiXVwiIGJlIFtcImFcIixcImJcIl06XG4gICAgICAgICAgICB2YXIga2V5UGF0aCA9IC9eXFxbLy50ZXN0KG5hbWUpID8gbmFtZS5tYXRjaCgvXlxcWyguKilcXF0kLylbMV0uc3BsaXQoJysnKSA6IG5hbWU7XG5cbiAgICAgICAgICAgIHJ2LnB1c2gobmV3IEluZGV4U3BlYyhuYW1lLCBrZXlQYXRoIHx8IG51bGwsIC9cXCYvLnRlc3QoaW5kZXgpLCAvXFwqLy50ZXN0KGluZGV4KSwgL1xcK1xcKy8udGVzdChpbmRleCksIGlzQXJyYXkoa2V5UGF0aCksIC9cXC4vLnRlc3QoaW5kZXgpKSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcnY7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY21wKGtleTEsIGtleTIpIHtcbiAgICAgICAgcmV0dXJuIGluZGV4ZWREQi5jbXAoa2V5MSwga2V5Mik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWluKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGNtcChhLCBiKSA8IDAgPyBhIDogYjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtYXgoYSwgYikge1xuICAgICAgICByZXR1cm4gY21wKGEsIGIpID4gMCA/IGEgOiBiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFzY2VuZGluZyhhLCBiKSB7XG4gICAgICAgIHJldHVybiBpbmRleGVkREIuY21wKGEsIGIpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRlc2NlbmRpbmcoYSwgYikge1xuICAgICAgICByZXR1cm4gaW5kZXhlZERCLmNtcChiLCBhKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaW1wbGVDb21wYXJlKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEgPCBiID8gLTEgOiBhID09PSBiID8gMCA6IDE7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2ltcGxlQ29tcGFyZVJldmVyc2UoYSwgYikge1xuICAgICAgICByZXR1cm4gYSA+IGIgPyAtMSA6IGEgPT09IGIgPyAwIDogMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjb21iaW5lKGZpbHRlcjEsIGZpbHRlcjIpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlcjEgPyBmaWx0ZXIyID8gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZpbHRlcjEuYXBwbHkodGhpcywgYXJndW1lbnRzKSAmJiBmaWx0ZXIyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0gOiBmaWx0ZXIxIDogZmlsdGVyMjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZWFkR2xvYmFsU2NoZW1hKCkge1xuICAgICAgICBkYi52ZXJubyA9IGlkYmRiLnZlcnNpb24gLyAxMDtcbiAgICAgICAgZGIuX2RiU2NoZW1hID0gZ2xvYmFsU2NoZW1hID0ge307XG4gICAgICAgIGRiU3RvcmVOYW1lcyA9IHNsaWNlKGlkYmRiLm9iamVjdFN0b3JlTmFtZXMsIDApO1xuICAgICAgICBpZiAoZGJTdG9yZU5hbWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuOyAvLyBEYXRhYmFzZSBjb250YWlucyBubyBzdG9yZXMuXG4gICAgICAgIHZhciB0cmFucyA9IGlkYmRiLnRyYW5zYWN0aW9uKHNhZmFyaU11bHRpU3RvcmVGaXgoZGJTdG9yZU5hbWVzKSwgJ3JlYWRvbmx5Jyk7XG4gICAgICAgIGRiU3RvcmVOYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChzdG9yZU5hbWUpIHtcbiAgICAgICAgICAgIHZhciBzdG9yZSA9IHRyYW5zLm9iamVjdFN0b3JlKHN0b3JlTmFtZSksXG4gICAgICAgICAgICAgICAga2V5UGF0aCA9IHN0b3JlLmtleVBhdGgsXG4gICAgICAgICAgICAgICAgZG90dGVkID0ga2V5UGF0aCAmJiB0eXBlb2Yga2V5UGF0aCA9PT0gJ3N0cmluZycgJiYga2V5UGF0aC5pbmRleE9mKCcuJykgIT09IC0xO1xuICAgICAgICAgICAgdmFyIHByaW1LZXkgPSBuZXcgSW5kZXhTcGVjKGtleVBhdGgsIGtleVBhdGggfHwgXCJcIiwgZmFsc2UsIGZhbHNlLCAhIXN0b3JlLmF1dG9JbmNyZW1lbnQsIGtleVBhdGggJiYgdHlwZW9mIGtleVBhdGggIT09ICdzdHJpbmcnLCBkb3R0ZWQpO1xuICAgICAgICAgICAgdmFyIGluZGV4ZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3RvcmUuaW5kZXhOYW1lcy5sZW5ndGg7ICsraikge1xuICAgICAgICAgICAgICAgIHZhciBpZGJpbmRleCA9IHN0b3JlLmluZGV4KHN0b3JlLmluZGV4TmFtZXNbal0pO1xuICAgICAgICAgICAgICAgIGtleVBhdGggPSBpZGJpbmRleC5rZXlQYXRoO1xuICAgICAgICAgICAgICAgIGRvdHRlZCA9IGtleVBhdGggJiYgdHlwZW9mIGtleVBhdGggPT09ICdzdHJpbmcnICYmIGtleVBhdGguaW5kZXhPZignLicpICE9PSAtMTtcbiAgICAgICAgICAgICAgICB2YXIgaW5kZXggPSBuZXcgSW5kZXhTcGVjKGlkYmluZGV4Lm5hbWUsIGtleVBhdGgsICEhaWRiaW5kZXgudW5pcXVlLCAhIWlkYmluZGV4Lm11bHRpRW50cnksIGZhbHNlLCBrZXlQYXRoICYmIHR5cGVvZiBrZXlQYXRoICE9PSAnc3RyaW5nJywgZG90dGVkKTtcbiAgICAgICAgICAgICAgICBpbmRleGVzLnB1c2goaW5kZXgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2xvYmFsU2NoZW1hW3N0b3JlTmFtZV0gPSBuZXcgVGFibGVTY2hlbWEoc3RvcmVOYW1lLCBwcmltS2V5LCBpbmRleGVzLCB7fSk7XG4gICAgICAgIH0pO1xuICAgICAgICBzZXRBcGlPblBsYWNlKFthbGxUYWJsZXMsIFRyYW5zYWN0aW9uLnByb3RvdHlwZV0sIGtleXMoZ2xvYmFsU2NoZW1hKSwgUkVBRFdSSVRFLCBnbG9iYWxTY2hlbWEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkanVzdFRvRXhpc3RpbmdJbmRleE5hbWVzKHNjaGVtYSwgaWRidHJhbnMpIHtcbiAgICAgICAgLy8vIDxzdW1tYXJ5PlxuICAgICAgICAvLy8gSXNzdWUgIzMwIFByb2JsZW0gd2l0aCBleGlzdGluZyBkYiAtIGFkanVzdCB0byBleGlzdGluZyBpbmRleCBuYW1lcyB3aGVuIG1pZ3JhdGluZyBmcm9tIG5vbi1kZXhpZSBkYlxuICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJzY2hlbWFcIiB0eXBlPVwiT2JqZWN0XCI+TWFwIGJldHdlZW4gbmFtZSBhbmQgVGFibGVTY2hlbWE8L3BhcmFtPlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJpZGJ0cmFuc1wiIHR5cGU9XCJJREJUcmFuc2FjdGlvblwiPjwvcGFyYW0+XG4gICAgICAgIHZhciBzdG9yZU5hbWVzID0gaWRidHJhbnMuZGIub2JqZWN0U3RvcmVOYW1lcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdG9yZU5hbWVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIgc3RvcmVOYW1lID0gc3RvcmVOYW1lc1tpXTtcbiAgICAgICAgICAgIHZhciBzdG9yZSA9IGlkYnRyYW5zLm9iamVjdFN0b3JlKHN0b3JlTmFtZSk7XG4gICAgICAgICAgICBoYXNHZXRBbGwgPSAnZ2V0QWxsJyBpbiBzdG9yZTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3RvcmUuaW5kZXhOYW1lcy5sZW5ndGg7ICsraikge1xuICAgICAgICAgICAgICAgIHZhciBpbmRleE5hbWUgPSBzdG9yZS5pbmRleE5hbWVzW2pdO1xuICAgICAgICAgICAgICAgIHZhciBrZXlQYXRoID0gc3RvcmUuaW5kZXgoaW5kZXhOYW1lKS5rZXlQYXRoO1xuICAgICAgICAgICAgICAgIHZhciBkZXhpZU5hbWUgPSB0eXBlb2Yga2V5UGF0aCA9PT0gJ3N0cmluZycgPyBrZXlQYXRoIDogXCJbXCIgKyBzbGljZShrZXlQYXRoKS5qb2luKCcrJykgKyBcIl1cIjtcbiAgICAgICAgICAgICAgICBpZiAoc2NoZW1hW3N0b3JlTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4U3BlYyA9IHNjaGVtYVtzdG9yZU5hbWVdLmlkeEJ5TmFtZVtkZXhpZU5hbWVdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5kZXhTcGVjKSBpbmRleFNwZWMubmFtZSA9IGluZGV4TmFtZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaXJlT25CbG9ja2VkKGV2KSB7XG4gICAgICAgIGRiLm9uKFwiYmxvY2tlZFwiKS5maXJlKGV2KTtcbiAgICAgICAgLy8gV29ya2Fyb3VuZCAobm90IGZ1bGx5KikgZm9yIG1pc3NpbmcgXCJ2ZXJzaW9uY2hhbmdlXCIgZXZlbnQgaW4gSUUsRWRnZSBhbmQgU2FmYXJpOlxuICAgICAgICBjb25uZWN0aW9ucy5maWx0ZXIoZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICAgIHJldHVybiBjLm5hbWUgPT09IGRiLm5hbWUgJiYgYyAhPT0gZGIgJiYgIWMuX3ZjRmlyZWQ7XG4gICAgICAgIH0pLm1hcChmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgcmV0dXJuIGMub24oXCJ2ZXJzaW9uY2hhbmdlXCIpLmZpcmUoZXYpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBleHRlbmQodGhpcywge1xuICAgICAgICBDb2xsZWN0aW9uOiBDb2xsZWN0aW9uLFxuICAgICAgICBUYWJsZTogVGFibGUsXG4gICAgICAgIFRyYW5zYWN0aW9uOiBUcmFuc2FjdGlvbixcbiAgICAgICAgVmVyc2lvbjogVmVyc2lvbixcbiAgICAgICAgV2hlcmVDbGF1c2U6IFdoZXJlQ2xhdXNlLFxuICAgICAgICBXcml0ZWFibGVDb2xsZWN0aW9uOiBXcml0ZWFibGVDb2xsZWN0aW9uLFxuICAgICAgICBXcml0ZWFibGVUYWJsZTogV3JpdGVhYmxlVGFibGVcbiAgICB9KTtcblxuICAgIGluaXQoKTtcblxuICAgIGFkZG9ucy5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICBmbihkYik7XG4gICAgfSk7XG59XG5cbnZhciBmYWtlQXV0b0NvbXBsZXRlID0gZnVuY3Rpb24gKCkge307IC8vIFdpbGwgbmV2ZXIgYmUgY2hhbmdlZC4gV2UganVzdCBmYWtlIGZvciB0aGUgSURFIHRoYXQgd2UgY2hhbmdlIGl0IChzZWUgZG9GYWtlQXV0b0NvbXBsZXRlKCkpXG52YXIgZmFrZSA9IGZhbHNlOyAvLyBXaWxsIG5ldmVyIGJlIGNoYW5nZWQuIFdlIGp1c3QgZmFrZSBmb3IgdGhlIElERSB0aGF0IHdlIGNoYW5nZSBpdCAoc2VlIGRvRmFrZUF1dG9Db21wbGV0ZSgpKVxuXG5mdW5jdGlvbiBwYXJzZVR5cGUodHlwZSkge1xuICAgIGlmICh0eXBlb2YgdHlwZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICByZXR1cm4gbmV3IHR5cGUoKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkodHlwZSkpIHtcbiAgICAgICAgcmV0dXJuIFtwYXJzZVR5cGUodHlwZVswXSldO1xuICAgIH0gZWxzZSBpZiAodHlwZSAmJiB0eXBlb2YgdHlwZSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFyIHJ2ID0ge307XG4gICAgICAgIGFwcGx5U3RydWN0dXJlKHJ2LCB0eXBlKTtcbiAgICAgICAgcmV0dXJuIHJ2O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0eXBlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlTdHJ1Y3R1cmUob2JqLCBzdHJ1Y3R1cmUpIHtcbiAgICBrZXlzKHN0cnVjdHVyZSkuZm9yRWFjaChmdW5jdGlvbiAobWVtYmVyKSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IHBhcnNlVHlwZShzdHJ1Y3R1cmVbbWVtYmVyXSk7XG4gICAgICAgIG9ialttZW1iZXJdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gZXZlbnRTdWNjZXNzSGFuZGxlcihkb25lKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChldikge1xuICAgICAgICBkb25lKGV2LnRhcmdldC5yZXN1bHQpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGhvb2tlZEV2ZW50U3VjY2Vzc0hhbmRsZXIocmVzb2x2ZSkge1xuICAgIC8vIHdyYXAoKSBpcyBuZWVkZWQgd2hlbiBjYWxsaW5nIGhvb2tzIGJlY2F1c2UgdGhlIHJhcmUgc2NlbmFyaW8gb2Y6XG4gICAgLy8gICogaG9vayBkb2VzIGEgZGIgb3BlcmF0aW9uIHRoYXQgZmFpbHMgaW1tZWRpYXRlbHkgKElEQiB0aHJvd3MgZXhjZXB0aW9uKVxuICAgIC8vICAgIEZvciBjYWxsaW5nIGRiIG9wZXJhdGlvbnMgb24gY29ycmVjdCB0cmFuc2FjdGlvbiwgd3JhcCBtYWtlcyBzdXJlIHRvIHNldCBQU0QgY29ycmVjdGx5LlxuICAgIC8vICAgIHdyYXAoKSB3aWxsIGFsc28gZXhlY3V0ZSBpbiBhIHZpcnR1YWwgdGljay5cbiAgICAvLyAgKiBJZiBub3Qgd3JhcHBlZCBpbiBhIHZpcnR1YWwgdGljaywgZGlyZWN0IGV4Y2VwdGlvbiB3aWxsIGxhdW5jaCBhIG5ldyBwaHlzaWNhbCB0aWNrLlxuICAgIC8vICAqIElmIHRoaXMgd2FzIHRoZSBsYXN0IGV2ZW50IGluIHRoZSBidWxrLCB0aGUgcHJvbWlzZSB3aWxsIHJlc29sdmUgYWZ0ZXIgYSBwaHlzaWNhbCB0aWNrXG4gICAgLy8gICAgYW5kIHRoZSB0cmFuc2FjdGlvbiB3aWxsIGhhdmUgY29tbWl0dGVkIGFscmVhZHkuXG4gICAgLy8gSWYgbm8gaG9vaywgdGhlIHZpcnR1YWwgdGljayB3aWxsIGJlIGV4ZWN1dGVkIGluIHRoZSByZWplY3QoKS9yZXNvbHZlIG9mIHRoZSBmaW5hbCBwcm9taXNlLFxuICAgIC8vIGJlY2F1c2UgaXQgaXMgYWx3YXlzIG1hcmtlZCB3aXRoIF9saWIgPSB0cnVlIHdoZW4gY3JlYXRlZCB1c2luZyBUcmFuc2FjdGlvbi5fcHJvbWlzZSgpLlxuICAgIHJldHVybiB3cmFwKGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICB2YXIgcmVxID0gZXZlbnQudGFyZ2V0LFxuICAgICAgICAgICAgcmVzdWx0ID0gcmVxLnJlc3VsdCxcbiAgICAgICAgICAgIGN0eCA9IHJlcS5faG9va0N0eCxcbiAgICAgICAgICAgIC8vIENvbnRhaW5zIHRoZSBob29rIGVycm9yIGhhbmRsZXIuIFB1dCBoZXJlIGluc3RlYWQgb2YgY2xvc3VyZSB0byBib29zdCBwZXJmb3JtYW5jZS5cbiAgICAgICAgaG9va1N1Y2Nlc3NIYW5kbGVyID0gY3R4ICYmIGN0eC5vbnN1Y2Nlc3M7XG4gICAgICAgIGhvb2tTdWNjZXNzSGFuZGxlciAmJiBob29rU3VjY2Vzc0hhbmRsZXIocmVzdWx0KTtcbiAgICAgICAgcmVzb2x2ZSAmJiByZXNvbHZlKHJlc3VsdCk7XG4gICAgfSwgcmVzb2x2ZSk7XG59XG5cbmZ1bmN0aW9uIGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgcmVqZWN0KGV2ZW50LnRhcmdldC5lcnJvcik7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBob29rZWRFdmVudFJlamVjdEhhbmRsZXIocmVqZWN0KSB7XG4gICAgcmV0dXJuIHdyYXAoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIC8vIFNlZSBjb21tZW50IG9uIGhvb2tlZEV2ZW50U3VjY2Vzc0hhbmRsZXIoKSB3aHkgd3JhcCgpIGlzIG5lZWRlZCBvbmx5IHdoZW4gc3VwcG9ydGluZyBob29rcy5cblxuICAgICAgICB2YXIgcmVxID0gZXZlbnQudGFyZ2V0LFxuICAgICAgICAgICAgZXJyID0gcmVxLmVycm9yLFxuICAgICAgICAgICAgY3R4ID0gcmVxLl9ob29rQ3R4LFxuICAgICAgICAgICAgLy8gQ29udGFpbnMgdGhlIGhvb2sgZXJyb3IgaGFuZGxlci4gUHV0IGhlcmUgaW5zdGVhZCBvZiBjbG9zdXJlIHRvIGJvb3N0IHBlcmZvcm1hbmNlLlxuICAgICAgICBob29rRXJyb3JIYW5kbGVyID0gY3R4ICYmIGN0eC5vbmVycm9yO1xuICAgICAgICBob29rRXJyb3JIYW5kbGVyICYmIGhvb2tFcnJvckhhbmRsZXIoZXJyKTtcbiAgICAgICAgcHJldmVudERlZmF1bHQoZXZlbnQpO1xuICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBwcmV2ZW50RGVmYXVsdChldmVudCkge1xuICAgIGlmIChldmVudC5zdG9wUHJvcGFnYXRpb24pIC8vIEluZGV4ZWREQlNoaW0gZG9lc250IHN1cHBvcnQgdGhpcyBvbiBTYWZhcmkgOCBhbmQgYmVsb3cuXG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlmIChldmVudC5wcmV2ZW50RGVmYXVsdCkgLy8gSW5kZXhlZERCU2hpbSBkb2VzbnQgc3VwcG9ydCB0aGlzIG9uIFNhZmFyaSA4IGFuZCBiZWxvdy5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbn1cblxuZnVuY3Rpb24gZ2xvYmFsRGF0YWJhc2VMaXN0KGNiKSB7XG4gICAgdmFyIHZhbCxcbiAgICAgICAgbG9jYWxTdG9yYWdlID0gRGV4aWUuZGVwZW5kZW5jaWVzLmxvY2FsU3RvcmFnZTtcbiAgICBpZiAoIWxvY2FsU3RvcmFnZSkgcmV0dXJuIGNiKFtdKTsgLy8gRW52cyB3aXRob3V0IGxvY2FsU3RvcmFnZSBzdXBwb3J0XG4gICAgdHJ5IHtcbiAgICAgICAgdmFsID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnRGV4aWUuRGF0YWJhc2VOYW1lcycpIHx8IFwiW11cIik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB2YWwgPSBbXTtcbiAgICB9XG4gICAgaWYgKGNiKHZhbCkpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ0RleGllLkRhdGFiYXNlTmFtZXMnLCBKU09OLnN0cmluZ2lmeSh2YWwpKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGF3YWl0SXRlcmF0b3IoaXRlcmF0b3IpIHtcbiAgICB2YXIgY2FsbE5leHQgPSBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvci5uZXh0KHJlc3VsdCk7XG4gICAgfSxcbiAgICAgICAgZG9UaHJvdyA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICByZXR1cm4gaXRlcmF0b3IudGhyb3coZXJyb3IpO1xuICAgIH0sXG4gICAgICAgIG9uU3VjY2VzcyA9IHN0ZXAoY2FsbE5leHQpLFxuICAgICAgICBvbkVycm9yID0gc3RlcChkb1Rocm93KTtcblxuICAgIGZ1bmN0aW9uIHN0ZXAoZ2V0TmV4dCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgdmFyIG5leHQgPSBnZXROZXh0KHZhbCksXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBuZXh0LnZhbHVlO1xuXG4gICAgICAgICAgICByZXR1cm4gbmV4dC5kb25lID8gdmFsdWUgOiAhdmFsdWUgfHwgdHlwZW9mIHZhbHVlLnRoZW4gIT09ICdmdW5jdGlvbicgPyBpc0FycmF5KHZhbHVlKSA/IFByb21pc2UuYWxsKHZhbHVlKS50aGVuKG9uU3VjY2Vzcywgb25FcnJvcikgOiBvblN1Y2Nlc3ModmFsdWUpIDogdmFsdWUudGhlbihvblN1Y2Nlc3MsIG9uRXJyb3IpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBzdGVwKGNhbGxOZXh0KSgpO1xufVxuXG4vL1xuLy8gSW5kZXhTcGVjIHN0cnVjdFxuLy9cbmZ1bmN0aW9uIEluZGV4U3BlYyhuYW1lLCBrZXlQYXRoLCB1bmlxdWUsIG11bHRpLCBhdXRvLCBjb21wb3VuZCwgZG90dGVkKSB7XG4gICAgLy8vIDxwYXJhbSBuYW1lPVwibmFtZVwiIHR5cGU9XCJTdHJpbmdcIj48L3BhcmFtPlxuICAgIC8vLyA8cGFyYW0gbmFtZT1cImtleVBhdGhcIiB0eXBlPVwiU3RyaW5nXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJ1bmlxdWVcIiB0eXBlPVwiQm9vbGVhblwiPjwvcGFyYW0+XG4gICAgLy8vIDxwYXJhbSBuYW1lPVwibXVsdGlcIiB0eXBlPVwiQm9vbGVhblwiPjwvcGFyYW0+XG4gICAgLy8vIDxwYXJhbSBuYW1lPVwiYXV0b1wiIHR5cGU9XCJCb29sZWFuXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJjb21wb3VuZFwiIHR5cGU9XCJCb29sZWFuXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJkb3R0ZWRcIiB0eXBlPVwiQm9vbGVhblwiPjwvcGFyYW0+XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLmtleVBhdGggPSBrZXlQYXRoO1xuICAgIHRoaXMudW5pcXVlID0gdW5pcXVlO1xuICAgIHRoaXMubXVsdGkgPSBtdWx0aTtcbiAgICB0aGlzLmF1dG8gPSBhdXRvO1xuICAgIHRoaXMuY29tcG91bmQgPSBjb21wb3VuZDtcbiAgICB0aGlzLmRvdHRlZCA9IGRvdHRlZDtcbiAgICB2YXIga2V5UGF0aFNyYyA9IHR5cGVvZiBrZXlQYXRoID09PSAnc3RyaW5nJyA/IGtleVBhdGggOiBrZXlQYXRoICYmICdbJyArIFtdLmpvaW4uY2FsbChrZXlQYXRoLCAnKycpICsgJ10nO1xuICAgIHRoaXMuc3JjID0gKHVuaXF1ZSA/ICcmJyA6ICcnKSArIChtdWx0aSA/ICcqJyA6ICcnKSArIChhdXRvID8gXCIrK1wiIDogXCJcIikgKyBrZXlQYXRoU3JjO1xufVxuXG4vL1xuLy8gVGFibGVTY2hlbWEgc3RydWN0XG4vL1xuZnVuY3Rpb24gVGFibGVTY2hlbWEobmFtZSwgcHJpbUtleSwgaW5kZXhlcywgaW5zdGFuY2VUZW1wbGF0ZSkge1xuICAgIC8vLyA8cGFyYW0gbmFtZT1cIm5hbWVcIiB0eXBlPVwiU3RyaW5nXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJwcmltS2V5XCIgdHlwZT1cIkluZGV4U3BlY1wiPjwvcGFyYW0+XG4gICAgLy8vIDxwYXJhbSBuYW1lPVwiaW5kZXhlc1wiIHR5cGU9XCJBcnJheVwiIGVsZW1lbnRUeXBlPVwiSW5kZXhTcGVjXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJpbnN0YW5jZVRlbXBsYXRlXCIgdHlwZT1cIk9iamVjdFwiPjwvcGFyYW0+XG4gICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICB0aGlzLnByaW1LZXkgPSBwcmltS2V5IHx8IG5ldyBJbmRleFNwZWMoKTtcbiAgICB0aGlzLmluZGV4ZXMgPSBpbmRleGVzIHx8IFtuZXcgSW5kZXhTcGVjKCldO1xuICAgIHRoaXMuaW5zdGFuY2VUZW1wbGF0ZSA9IGluc3RhbmNlVGVtcGxhdGU7XG4gICAgdGhpcy5tYXBwZWRDbGFzcyA9IG51bGw7XG4gICAgdGhpcy5pZHhCeU5hbWUgPSBhcnJheVRvT2JqZWN0KGluZGV4ZXMsIGZ1bmN0aW9uIChpbmRleCkge1xuICAgICAgICByZXR1cm4gW2luZGV4Lm5hbWUsIGluZGV4XTtcbiAgICB9KTtcbn1cblxuLy8gVXNlZCBpbiB3aGVuIGRlZmluaW5nIGRlcGVuZGVuY2llcyBsYXRlci4uLlxuLy8gKElmIEluZGV4ZWREQlNoaW0gaXMgbG9hZGVkLCBwcmVmZXIgaXQgYmVmb3JlIHN0YW5kYXJkIGluZGV4ZWREQilcbnZhciBpZGJzaGltID0gX2dsb2JhbC5pZGJNb2R1bGVzICYmIF9nbG9iYWwuaWRiTW9kdWxlcy5zaGltSW5kZXhlZERCID8gX2dsb2JhbC5pZGJNb2R1bGVzIDoge307XG5cbmZ1bmN0aW9uIHNhZmFyaU11bHRpU3RvcmVGaXgoc3RvcmVOYW1lcykge1xuICAgIHJldHVybiBzdG9yZU5hbWVzLmxlbmd0aCA9PT0gMSA/IHN0b3JlTmFtZXNbMF0gOiBzdG9yZU5hbWVzO1xufVxuXG5mdW5jdGlvbiBnZXROYXRpdmVHZXREYXRhYmFzZU5hbWVzRm4oaW5kZXhlZERCKSB7XG4gICAgdmFyIGZuID0gaW5kZXhlZERCICYmIChpbmRleGVkREIuZ2V0RGF0YWJhc2VOYW1lcyB8fCBpbmRleGVkREIud2Via2l0R2V0RGF0YWJhc2VOYW1lcyk7XG4gICAgcmV0dXJuIGZuICYmIGZuLmJpbmQoaW5kZXhlZERCKTtcbn1cblxuLy8gRXhwb3J0IEVycm9yIGNsYXNzZXNcbnByb3BzKERleGllLCBmdWxsTmFtZUV4Y2VwdGlvbnMpOyAvLyBEZXhpZS5YWFhFcnJvciA9IGNsYXNzIFhYWEVycm9yIHsuLi59O1xuXG4vL1xuLy8gU3RhdGljIG1ldGhvZHMgYW5kIHByb3BlcnRpZXNcbi8vIFxucHJvcHMoRGV4aWUsIHtcblxuICAgIC8vXG4gICAgLy8gU3RhdGljIGRlbGV0ZSgpIG1ldGhvZC5cbiAgICAvL1xuICAgIGRlbGV0ZTogZnVuY3Rpb24gKGRhdGFiYXNlTmFtZSkge1xuICAgICAgICB2YXIgZGIgPSBuZXcgRGV4aWUoZGF0YWJhc2VOYW1lKSxcbiAgICAgICAgICAgIHByb21pc2UgPSBkYi5kZWxldGUoKTtcbiAgICAgICAgcHJvbWlzZS5vbmJsb2NrZWQgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgIGRiLm9uKFwiYmxvY2tlZFwiLCBmbik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfSxcblxuICAgIC8vXG4gICAgLy8gU3RhdGljIGV4aXN0cygpIG1ldGhvZC5cbiAgICAvL1xuICAgIGV4aXN0czogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBEZXhpZShuYW1lKS5vcGVuKCkudGhlbihmdW5jdGlvbiAoZGIpIHtcbiAgICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSkuY2F0Y2goRGV4aWUuTm9TdWNoRGF0YWJhc2VFcnJvciwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy9cbiAgICAvLyBTdGF0aWMgbWV0aG9kIGZvciByZXRyaWV2aW5nIGEgbGlzdCBvZiBhbGwgZXhpc3RpbmcgZGF0YWJhc2VzIGF0IGN1cnJlbnQgaG9zdC5cbiAgICAvL1xuICAgIGdldERhdGFiYXNlTmFtZXM6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFyIGdldERhdGFiYXNlTmFtZXMgPSBnZXROYXRpdmVHZXREYXRhYmFzZU5hbWVzRm4oaW5kZXhlZERCKTtcbiAgICAgICAgICAgIGlmIChnZXREYXRhYmFzZU5hbWVzKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gY2FzZSBnZXREYXRhYmFzZU5hbWVzKCkgYmVjb21lcyBzdGFuZGFyZCwgbGV0J3MgcHJlcGFyZSB0byBzdXBwb3J0IGl0OlxuICAgICAgICAgICAgICAgIHZhciByZXEgPSBnZXREYXRhYmFzZU5hbWVzKCk7XG4gICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHNsaWNlKGV2ZW50LnRhcmdldC5yZXN1bHQsIDApKTsgLy8gQ29udmVyc3QgRE9NU3RyaW5nTGlzdCB0byBBcnJheTxTdHJpbmc+XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBnbG9iYWxEYXRhYmFzZUxpc3QoZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudGhlbihjYik7XG4gICAgfSxcblxuICAgIGRlZmluZUNsYXNzOiBmdW5jdGlvbiAoc3RydWN0dXJlKSB7XG4gICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgLy8vICAgICBDcmVhdGUgYSBqYXZhc2NyaXB0IGNvbnN0cnVjdG9yIGJhc2VkIG9uIGdpdmVuIHRlbXBsYXRlIGZvciB3aGljaCBwcm9wZXJ0aWVzIHRvIGV4cGVjdCBpbiB0aGUgY2xhc3MuXG4gICAgICAgIC8vLyAgICAgQW55IHByb3BlcnR5IHRoYXQgaXMgYSBjb25zdHJ1Y3RvciBmdW5jdGlvbiB3aWxsIGFjdCBhcyBhIHR5cGUuIFNvIHtuYW1lOiBTdHJpbmd9IHdpbGwgYmUgZXF1YWwgdG8ge25hbWU6IG5ldyBTdHJpbmcoKX0uXG4gICAgICAgIC8vLyA8L3N1bW1hcnk+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInN0cnVjdHVyZVwiPkhlbHBzIElERSBjb2RlIGNvbXBsZXRpb24gYnkga25vd2luZyB0aGUgbWVtYmVycyB0aGF0IG9iamVjdHMgY29udGFpbiBhbmQgbm90IGp1c3QgdGhlIGluZGV4ZXMuIEFsc29cbiAgICAgICAgLy8vIGtub3cgd2hhdCB0eXBlIGVhY2ggbWVtYmVyIGhhcy4gRXhhbXBsZToge25hbWU6IFN0cmluZywgZW1haWxBZGRyZXNzZXM6IFtTdHJpbmddLCBwcm9wZXJ0aWVzOiB7c2hvZVNpemU6IE51bWJlcn19PC9wYXJhbT5cblxuICAgICAgICAvLyBEZWZhdWx0IGNvbnN0cnVjdG9yIGFibGUgdG8gY29weSBnaXZlbiBwcm9wZXJ0aWVzIGludG8gdGhpcyBvYmplY3QuXG4gICAgICAgIGZ1bmN0aW9uIENsYXNzKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInByb3BlcnRpZXNcIiB0eXBlPVwiT2JqZWN0XCIgb3B0aW9uYWw9XCJ0cnVlXCI+UHJvcGVydGllcyB0byBpbml0aWFsaXplIG9iamVjdCB3aXRoLlxuICAgICAgICAgICAgLy8vIDwvcGFyYW0+XG4gICAgICAgICAgICBwcm9wZXJ0aWVzID8gZXh0ZW5kKHRoaXMsIHByb3BlcnRpZXMpIDogZmFrZSAmJiBhcHBseVN0cnVjdHVyZSh0aGlzLCBzdHJ1Y3R1cmUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBDbGFzcztcbiAgICB9LFxuXG4gICAgYXBwbHlTdHJ1Y3R1cmU6IGFwcGx5U3RydWN0dXJlLFxuXG4gICAgaWdub3JlVHJhbnNhY3Rpb246IGZ1bmN0aW9uIChzY29wZUZ1bmMpIHtcbiAgICAgICAgLy8gSW4gY2FzZSBjYWxsZXIgaXMgd2l0aGluIGEgdHJhbnNhY3Rpb24gYnV0IG5lZWRzIHRvIGNyZWF0ZSBhIHNlcGFyYXRlIHRyYW5zYWN0aW9uLlxuICAgICAgICAvLyBFeGFtcGxlIG9mIHVzYWdlOlxuICAgICAgICAvL1xuICAgICAgICAvLyBMZXQncyBzYXkgd2UgaGF2ZSBhIGxvZ2dlciBmdW5jdGlvbiBpbiBvdXIgYXBwLiBPdGhlciBhcHBsaWNhdGlvbi1sb2dpYyBzaG91bGQgYmUgdW5hd2FyZSBvZiB0aGVcbiAgICAgICAgLy8gbG9nZ2VyIGZ1bmN0aW9uIGFuZCBub3QgbmVlZCB0byBpbmNsdWRlIHRoZSAnbG9nZW50cmllcycgdGFibGUgaW4gYWxsIHRyYW5zYWN0aW9uIGl0IHBlcmZvcm1zLlxuICAgICAgICAvLyBUaGUgbG9nZ2luZyBzaG91bGQgYWx3YXlzIGJlIGRvbmUgaW4gYSBzZXBhcmF0ZSB0cmFuc2FjdGlvbiBhbmQgbm90IGJlIGRlcGVuZGFudCBvbiB0aGUgY3VycmVudFxuICAgICAgICAvLyBydW5uaW5nIHRyYW5zYWN0aW9uIGNvbnRleHQuIFRoZW4geW91IGNvdWxkIHVzZSBEZXhpZS5pZ25vcmVUcmFuc2FjdGlvbigpIHRvIHJ1biBjb2RlIHRoYXQgc3RhcnRzIGEgbmV3IHRyYW5zYWN0aW9uLlxuICAgICAgICAvL1xuICAgICAgICAvLyAgICAgRGV4aWUuaWdub3JlVHJhbnNhY3Rpb24oZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vICAgICAgICAgZGIubG9nZW50cmllcy5hZGQobmV3TG9nRW50cnkpO1xuICAgICAgICAvLyAgICAgfSk7XG4gICAgICAgIC8vXG4gICAgICAgIC8vIFVubGVzcyB1c2luZyBEZXhpZS5pZ25vcmVUcmFuc2FjdGlvbigpLCB0aGUgYWJvdmUgZXhhbXBsZSB3b3VsZCB0cnkgdG8gcmV1c2UgdGhlIGN1cnJlbnQgdHJhbnNhY3Rpb25cbiAgICAgICAgLy8gaW4gY3VycmVudCBQcm9taXNlLXNjb3BlLlxuICAgICAgICAvL1xuICAgICAgICAvLyBBbiBhbHRlcm5hdGl2ZSB0byBEZXhpZS5pZ25vcmVUcmFuc2FjdGlvbigpIHdvdWxkIGJlIHNldEltbWVkaWF0ZSgpIG9yIHNldFRpbWVvdXQoKS4gVGhlIHJlYXNvbiB3ZSBzdGlsbCBwcm92aWRlIGFuXG4gICAgICAgIC8vIEFQSSBmb3IgdGhpcyBiZWNhdXNlXG4gICAgICAgIC8vICAxKSBUaGUgaW50ZW50aW9uIG9mIHdyaXRpbmcgdGhlIHN0YXRlbWVudCBjb3VsZCBiZSB1bmNsZWFyIGlmIHVzaW5nIHNldEltbWVkaWF0ZSgpIG9yIHNldFRpbWVvdXQoKS5cbiAgICAgICAgLy8gIDIpIHNldFRpbWVvdXQoKSB3b3VsZCB3YWl0IHVubmVzY2Vzc2FyeSB1bnRpbCBmaXJpbmcuIFRoaXMgaXMgaG93ZXZlciBub3QgdGhlIGNhc2Ugd2l0aCBzZXRJbW1lZGlhdGUoKS5cbiAgICAgICAgLy8gIDMpIHNldEltbWVkaWF0ZSgpIGlzIG5vdCBzdXBwb3J0ZWQgaW4gdGhlIEVTIHN0YW5kYXJkLlxuICAgICAgICAvLyAgNCkgWW91IG1pZ2h0IHdhbnQgdG8ga2VlcCBvdGhlciBQU0Qgc3RhdGUgdGhhdCB3YXMgc2V0IGluIGEgcGFyZW50IFBTRCwgc3VjaCBhcyBQU0QubGV0VGhyb3VnaC5cbiAgICAgICAgcmV0dXJuIFBTRC50cmFucyA/IHVzZVBTRChQU0QudHJhbnNsZXNzLCBzY29wZUZ1bmMpIDogLy8gVXNlIHRoZSBjbG9zZXN0IHBhcmVudCB0aGF0IHdhcyBub24tdHJhbnNhY3Rpb25hbC5cbiAgICAgICAgc2NvcGVGdW5jKCk7IC8vIE5vIG5lZWQgdG8gY2hhbmdlIHNjb3BlIGJlY2F1c2UgdGhlcmUgaXMgbm8gb25nb2luZyB0cmFuc2FjdGlvbi5cbiAgICB9LFxuXG4gICAgdmlwOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgLy8gVG8gYmUgdXNlZCBieSBzdWJzY3JpYmVycyB0byB0aGUgb24oJ3JlYWR5JykgZXZlbnQuXG4gICAgICAgIC8vIFRoaXMgd2lsbCBsZXQgY2FsbGVyIHRocm91Z2ggdG8gYWNjZXNzIERCIGV2ZW4gd2hlbiBpdCBpcyBibG9ja2VkIHdoaWxlIHRoZSBkYi5yZWFkeSgpIHN1YnNjcmliZXJzIGFyZSBmaXJpbmcuXG4gICAgICAgIC8vIFRoaXMgd291bGQgaGF2ZSB3b3JrZWQgYXV0b21hdGljYWxseSBpZiB3ZSB3ZXJlIGNlcnRhaW4gdGhhdCB0aGUgUHJvdmlkZXIgd2FzIHVzaW5nIERleGllLlByb21pc2UgZm9yIGFsbCBhc3luY3JvbmljIG9wZXJhdGlvbnMuIFRoZSBwcm9taXNlIFBTRFxuICAgICAgICAvLyBmcm9tIHRoZSBwcm92aWRlci5jb25uZWN0KCkgY2FsbCB3b3VsZCB0aGVuIGJlIGRlcml2ZWQgYWxsIHRoZSB3YXkgdG8gd2hlbiBwcm92aWRlciB3b3VsZCBjYWxsIGxvY2FsRGF0YWJhc2UuYXBwbHlDaGFuZ2VzKCkuIEJ1dCBzaW5jZVxuICAgICAgICAvLyB0aGUgcHJvdmlkZXIgbW9yZSBsaWtlbHkgaXMgdXNpbmcgbm9uLXByb21pc2UgYXN5bmMgQVBJcyBvciBvdGhlciB0aGVuYWJsZSBpbXBsZW1lbnRhdGlvbnMsIHdlIGNhbm5vdCBhc3N1bWUgdGhhdC5cbiAgICAgICAgLy8gTm90ZSB0aGF0IHRoaXMgbWV0aG9kIGlzIG9ubHkgdXNlZnVsIGZvciBvbigncmVhZHknKSBzdWJzY3JpYmVycyB0aGF0IGlzIHJldHVybmluZyBhIFByb21pc2UgZnJvbSB0aGUgZXZlbnQuIElmIG5vdCB1c2luZyB2aXAoKVxuICAgICAgICAvLyB0aGUgZGF0YWJhc2UgY291bGQgZGVhZGxvY2sgc2luY2UgaXQgd29udCBvcGVuIHVudGlsIHRoZSByZXR1cm5lZCBQcm9taXNlIGlzIHJlc29sdmVkLCBhbmQgYW55IG5vbi1WSVBlZCBvcGVyYXRpb24gc3RhcnRlZCBieVxuICAgICAgICAvLyB0aGUgY2FsbGVyIHdpbGwgbm90IHJlc29sdmUgdW50aWwgZGF0YWJhc2UgaXMgb3BlbmVkLlxuICAgICAgICByZXR1cm4gbmV3U2NvcGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgUFNELmxldFRocm91Z2ggPSB0cnVlOyAvLyBNYWtlIHN1cmUgd2UgYXJlIGxldCB0aHJvdWdoIGlmIHN0aWxsIGJsb2NraW5nIGRiIGR1ZSB0byBvbnJlYWR5IGlzIGZpcmluZy5cbiAgICAgICAgICAgIHJldHVybiBmbigpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgYXN5bmM6IGZ1bmN0aW9uIChnZW5lcmF0b3JGbikge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgcnYgPSBhd2FpdEl0ZXJhdG9yKGdlbmVyYXRvckZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgICAgICAgICAgICAgIGlmICghcnYgfHwgdHlwZW9mIHJ2LnRoZW4gIT09ICdmdW5jdGlvbicpIHJldHVybiBQcm9taXNlLnJlc29sdmUocnYpO1xuICAgICAgICAgICAgICAgIHJldHVybiBydjtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0aW9uKGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBzcGF3bjogZnVuY3Rpb24gKGdlbmVyYXRvckZuLCBhcmdzLCB0aGl6KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB2YXIgcnYgPSBhd2FpdEl0ZXJhdG9yKGdlbmVyYXRvckZuLmFwcGx5KHRoaXosIGFyZ3MgfHwgW10pKTtcbiAgICAgICAgICAgIGlmICghcnYgfHwgdHlwZW9mIHJ2LnRoZW4gIT09ICdmdW5jdGlvbicpIHJldHVybiBQcm9taXNlLnJlc29sdmUocnYpO1xuICAgICAgICAgICAgcmV0dXJuIHJ2O1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVqZWN0aW9uKGUpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIERleGllLmN1cnJlbnRUcmFuc2FjdGlvbiBwcm9wZXJ0eVxuICAgIGN1cnJlbnRUcmFuc2FjdGlvbjoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBQU0QudHJhbnMgfHwgbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBFeHBvcnQgb3VyIFByb21pc2UgaW1wbGVtZW50YXRpb24gc2luY2UgaXQgY2FuIGJlIGhhbmR5IGFzIGEgc3RhbmRhbG9uZSBQcm9taXNlIGltcGxlbWVudGF0aW9uXG4gICAgUHJvbWlzZTogUHJvbWlzZSxcblxuICAgIC8vIERleGllLmRlYnVnIHByb3B0ZXJ5OlxuICAgIC8vIERleGllLmRlYnVnID0gZmFsc2VcbiAgICAvLyBEZXhpZS5kZWJ1ZyA9IHRydWVcbiAgICAvLyBEZXhpZS5kZWJ1ZyA9IFwiZGV4aWVcIiAtIGRvbid0IGhpZGUgZGV4aWUncyBzdGFjayBmcmFtZXMuXG4gICAgZGVidWc6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVidWc7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBzZXREZWJ1Zyh2YWx1ZSwgdmFsdWUgPT09ICdkZXhpZScgPyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9IDogZGV4aWVTdGFja0ZyYW1lRmlsdGVyKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBFeHBvcnQgb3VyIGRlcml2ZS9leHRlbmQvb3ZlcnJpZGUgbWV0aG9kb2xvZ3lcbiAgICBkZXJpdmU6IGRlcml2ZSxcbiAgICBleHRlbmQ6IGV4dGVuZCxcbiAgICBwcm9wczogcHJvcHMsXG4gICAgb3ZlcnJpZGU6IG92ZXJyaWRlLFxuICAgIC8vIEV4cG9ydCBvdXIgRXZlbnRzKCkgZnVuY3Rpb24gLSBjYW4gYmUgaGFuZHkgYXMgYSB0b29sa2l0XG4gICAgRXZlbnRzOiBFdmVudHMsXG4gICAgZXZlbnRzOiB7IGdldDogZGVwcmVjYXRlZChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gRXZlbnRzO1xuICAgICAgICB9KSB9LCAvLyBCYWNrd2FyZCBjb21wYXRpYmxlIGxvd2VyY2FzZSB2ZXJzaW9uLlxuICAgIC8vIFV0aWxpdGllc1xuICAgIGdldEJ5S2V5UGF0aDogZ2V0QnlLZXlQYXRoLFxuICAgIHNldEJ5S2V5UGF0aDogc2V0QnlLZXlQYXRoLFxuICAgIGRlbEJ5S2V5UGF0aDogZGVsQnlLZXlQYXRoLFxuICAgIHNoYWxsb3dDbG9uZTogc2hhbGxvd0Nsb25lLFxuICAgIGRlZXBDbG9uZTogZGVlcENsb25lLFxuICAgIGdldE9iamVjdERpZmY6IGdldE9iamVjdERpZmYsXG4gICAgYXNhcDogYXNhcCxcbiAgICBtYXhLZXk6IG1heEtleSxcbiAgICAvLyBBZGRvbiByZWdpc3RyeVxuICAgIGFkZG9uczogW10sXG4gICAgLy8gR2xvYmFsIERCIGNvbm5lY3Rpb24gbGlzdFxuICAgIGNvbm5lY3Rpb25zOiBjb25uZWN0aW9ucyxcblxuICAgIE11bHRpTW9kaWZ5RXJyb3I6IGV4Y2VwdGlvbnMuTW9kaWZ5LCAvLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5IDAuOS44LiBEZXByZWNhdGUuXG4gICAgZXJybmFtZXM6IGVycm5hbWVzLFxuXG4gICAgLy8gRXhwb3J0IG90aGVyIHN0YXRpYyBjbGFzc2VzXG4gICAgSW5kZXhTcGVjOiBJbmRleFNwZWMsXG4gICAgVGFibGVTY2hlbWE6IFRhYmxlU2NoZW1hLFxuXG4gICAgLy9cbiAgICAvLyBEZXBlbmRlbmNpZXNcbiAgICAvL1xuICAgIC8vIFRoZXNlIHdpbGwgYXV0b21hdGljYWxseSB3b3JrIGluIGJyb3dzZXJzIHdpdGggaW5kZXhlZERCIHN1cHBvcnQsIG9yIHdoZXJlIGFuIGluZGV4ZWREQiBwb2x5ZmlsbCBoYXMgYmVlbiBpbmNsdWRlZC5cbiAgICAvL1xuICAgIC8vIEluIG5vZGUuanMsIGhvd2V2ZXIsIHRoZXNlIHByb3BlcnRpZXMgbXVzdCBiZSBzZXQgXCJtYW51YWxseVwiIGJlZm9yZSBpbnN0YW5zaWF0aW5nIGEgbmV3IERleGllKCkuXG4gICAgLy8gRm9yIG5vZGUuanMsIHlvdSBuZWVkIHRvIHJlcXVpcmUgaW5kZXhlZGRiLWpzIG9yIHNpbWlsYXIgYW5kIHRoZW4gc2V0IHRoZXNlIGRlcHMuXG4gICAgLy9cbiAgICBkZXBlbmRlbmNpZXM6IHtcbiAgICAgICAgLy8gUmVxdWlyZWQ6XG4gICAgICAgIGluZGV4ZWREQjogaWRic2hpbS5zaGltSW5kZXhlZERCIHx8IF9nbG9iYWwuaW5kZXhlZERCIHx8IF9nbG9iYWwubW96SW5kZXhlZERCIHx8IF9nbG9iYWwud2Via2l0SW5kZXhlZERCIHx8IF9nbG9iYWwubXNJbmRleGVkREIsXG4gICAgICAgIElEQktleVJhbmdlOiBpZGJzaGltLklEQktleVJhbmdlIHx8IF9nbG9iYWwuSURCS2V5UmFuZ2UgfHwgX2dsb2JhbC53ZWJraXRJREJLZXlSYW5nZVxuICAgIH0sXG5cbiAgICAvLyBBUEkgVmVyc2lvbiBOdW1iZXI6IFR5cGUgTnVtYmVyLCBtYWtlIHN1cmUgdG8gYWx3YXlzIHNldCBhIHZlcnNpb24gbnVtYmVyIHRoYXQgY2FuIGJlIGNvbXBhcmFibGUgY29ycmVjdGx5LiBFeGFtcGxlOiAwLjksIDAuOTEsIDAuOTIsIDEuMCwgMS4wMSwgMS4xLCAxLjIsIDEuMjEsIGV0Yy5cbiAgICBzZW1WZXI6IERFWElFX1ZFUlNJT04sXG4gICAgdmVyc2lvbjogREVYSUVfVkVSU0lPTi5zcGxpdCgnLicpLm1hcChmdW5jdGlvbiAobikge1xuICAgICAgICByZXR1cm4gcGFyc2VJbnQobik7XG4gICAgfSkucmVkdWNlKGZ1bmN0aW9uIChwLCBjLCBpKSB7XG4gICAgICAgIHJldHVybiBwICsgYyAvIE1hdGgucG93KDEwLCBpICogMik7XG4gICAgfSksXG4gICAgZmFrZUF1dG9Db21wbGV0ZTogZmFrZUF1dG9Db21wbGV0ZSxcblxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9kZmFobGFuZGVyL0RleGllLmpzL2lzc3Vlcy8xODZcbiAgICAvLyB0eXBlc2NyaXB0IGNvbXBpbGVyIHRzYyBpbiBtb2RlIHRzLS0+ZXM1ICYgY29tbW9uSlMsIHdpbGwgZXhwZWN0IHJlcXVpcmUoKSB0byByZXR1cm5cbiAgICAvLyB4LmRlZmF1bHQuIFdvcmthcm91bmQ6IFNldCBEZXhpZS5kZWZhdWx0ID0gRGV4aWUuXG4gICAgZGVmYXVsdDogRGV4aWVcbn0pO1xuXG50cnlDYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgLy8gT3B0aW9uYWwgZGVwZW5kZW5jaWVzXG4gICAgLy8gbG9jYWxTdG9yYWdlXG4gICAgRGV4aWUuZGVwZW5kZW5jaWVzLmxvY2FsU3RvcmFnZSA9ICh0eXBlb2YgY2hyb21lICE9PSBcInVuZGVmaW5lZFwiICYmIGNocm9tZSAhPT0gbnVsbCA/IGNocm9tZS5zdG9yYWdlIDogdm9pZCAwKSAhPSBudWxsID8gbnVsbCA6IF9nbG9iYWwubG9jYWxTdG9yYWdlO1xufSk7XG5cbi8vIE1hcCBET01FcnJvcnMgYW5kIERPTUV4Y2VwdGlvbnMgdG8gY29ycmVzcG9uZGluZyBEZXhpZSBlcnJvcnMuIE1heSBjaGFuZ2UgaW4gRGV4aWUgdjIuMC5cblByb21pc2UucmVqZWN0aW9uTWFwcGVyID0gbWFwRXJyb3I7XG5cbi8vIEZvb2wgSURFIHRvIGltcHJvdmUgYXV0b2NvbXBsZXRlLiBUZXN0ZWQgd2l0aCBWaXN1YWwgU3R1ZGlvIDIwMTMgYW5kIDIwMTUuXG5kb0Zha2VBdXRvQ29tcGxldGUoZnVuY3Rpb24gKCkge1xuICAgIERleGllLmZha2VBdXRvQ29tcGxldGUgPSBmYWtlQXV0b0NvbXBsZXRlID0gZG9GYWtlQXV0b0NvbXBsZXRlO1xuICAgIERleGllLmZha2UgPSBmYWtlID0gdHJ1ZTtcbn0pO1xuXG5yZXR1cm4gRGV4aWU7XG5cbn0pKSk7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1kZXhpZS5qcy5tYXBcbiIsIlxyXG5jb25zdCBjb21tYW5kID0ge1xyXG4gIHJ1bjogZnVuY3Rpb24oY21kKSB7XHJcblxyXG4gICAgbGV0IGFyZ3MgPSByZXF1aXJlKCcuLi90ZXJtaW5hbC5qcycpLnV0aWxzLnBhcnNlX2FyZ3VtZW50cyhjbWQpXHJcbiAgICBsZXQgdmFsdWUgPSAwXHJcbiAgICBmb3IobGV0IG4gb2YgYXJncykge1xyXG4gICAgICBpZihpc05hTihuKSkgdGhyb3cgXCJOb3QgYSBudW1iZXJcIlxyXG4gICAgICB2YWx1ZSArPSBuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWVcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZCIsImxldCB0b3RhbCA9IDBcclxuXHJcbmNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgcnVuOiBmdW5jdGlvbihjbWQpIHtcclxuICAgIHJldHVybiBgVGhpcyBjb21tYW5kIGhhcyBiZWVuIHJ1biAke3RvdGFsKyt9IHRpbWVzYFxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kIiwiY29uc3QgY29tbWFuZCA9IHtcclxuICBydW46IGZ1bmN0aW9uKGNtZCkge1xyXG4gICAgcmV0dXJuIGNtZFxyXG4gIH0sXHJcblxyXG4gIGhlbHA6IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIGBSZXR1cm5zIHRoZSBhcmd1bWVudHNgXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmQiLCJjb25zdCB1bml2ZXJzZSA9IHJlcXVpcmUoJy4uL2xvY2F0aW9uLmpzJykudW5pdmVyc2VcclxuY29uc3Qgb3JiaXQgPSByZXF1aXJlKCcuLi91dGlscy9vcmJpdC5qcycpXHJcblxyXG5jb25zdCBjb21tYW5kID0ge1xyXG4gIHJ1bjogZnVuY3Rpb24oY21kKSB7XHJcbiAgICBsZXQgYXJncyA9IHJlcXVpcmUoJy4uL3Rlcm1pbmFsLmpzJykudXRpbHMucGFyc2VfYXJndW1lbnRzKGNtZClcclxuICAgIGxldCB0YXJnZXQgPSB1bml2ZXJzZVthcmdzWzBdXVxyXG4gICAgaWYoIXRhcmdldCkgdGhyb3cgXCJVbmtub3duIHRhcmdldFwiXHJcblxyXG4gICAgY29uc29sZS5sb2codGFyZ2V0KVxyXG4gICAgY29uc29sZS5sb2codW5pdmVyc2UucGxheWVyKVxyXG4gICAgbGV0IG5leHQgPSBvcmJpdC5nZXROZXh0V2luZG93KHVuaXZlcnNlLnBsYXllci5wYXJlbnQsIHRhcmdldClcclxuXHJcbiAgICByZXR1cm4gMTJcclxuICB9LFxyXG5cclxuICBoZWxwOiBmdW5jdGlvbihvcHRzKSB7XHJcbiAgICByZXR1cm4gJzx0YXJnZXQgYm9keT4gRmluZHMgdGhlIG5leHQgdHJhbnNmZXIgd2luZG93IGZyb20gdGhlIGN1cnJlbnQgcG9zaXRpb24gdG8gdGhlIHNlbGVjdGVkIGNlbGVzdGlhbCBib2R5J1xyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZCIsImNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgcnVuOiBmdW5jdGlvbihjbWQpIHtcclxuICAgIHJldHVybiBjbWRcclxuICB9LFxyXG5cclxuICBpc0FsbG93ZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIGZhbHNlXHJcbiAgfSxcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kIiwiXHJcbmNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgcnVuOiBmdW5jdGlvbihjbWQpIHtcclxuICAgIGxldCBjb21tYW5kcyA9IHJlcXVpcmUoJy4vJylcclxuICAgIGxldCBhcmdzID0gcmVxdWlyZSgnLi4vdGVybWluYWwuanMnKS51dGlscy5wYXJzZV9hcmd1bWVudHMoY21kKVxyXG5cclxuICAgIGlmKGFyZ3NbMF0pIHsgLy8gSXMgdGhlcmUgYSBzcGVjaWZpZWQgY29tbWFuZCA/XHJcbiAgICAgIGxldCBuYW1lID0gYXJnc1swXVxyXG4gICAgICBpZiggY29tbWFuZHNbbmFtZV0gLy8gRG9lcyB0aGUgY29tbWFuZCBleGlzdCA/XHJcbiAgICAgICAgJiYgKCFjb21tYW5kc1tuYW1lXS5pc0FsbG93ZWQgfHwgY29tbWFuZHNbbmFtZV0uaXNBbGxvd2VkKCkgKSkgeyAvLyBJcyBpdCBhbGxvd2VkID9cclxuICAgICAgICAgIGlmKGNvbW1hbmRzW25hbWVdLmhlbHApIHJldHVybiBjb21tYW5kc1tuYW1lXS5oZWxwKGNtZClcclxuICAgICAgICAgIGVsc2UgcmV0dXJuIGBUaGUgY29tbWFuZCBoYXMgbm8gaGVscCBwYWdlYFxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBgVGhlIGNvbW1hbmQgaXMgbm90IHJlY29nbml6ZWRgXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGxldCB2YWwgPSBgSGVsbG9gXHJcbiAgICBmb3IobGV0IG5hbWUgaW4gY29tbWFuZHMpIHtcclxuICAgICAgaWYoIWNvbW1hbmRzW25hbWVdLmlzQWxsb3dlZCB8fCBjb21tYW5kc1tuYW1lXS5pc0FsbG93ZWQoKSkge1xyXG4gICAgICAgIHZhbCArPSBgXFxuICBbW2I7O10ke25hbWV9XSBgXHJcbiAgICAgICAgaWYoY29tbWFuZHNbbmFtZV0uaGVscCkgdmFsICs9IGNvbW1hbmRzW25hbWVdLmhlbHAoJ2xpc3QnKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsXHJcbiAgfSxcclxuXHJcblxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmQiLCJjb25zdCBjb21tYW5kcyA9IHtcclxuICBhZGQ6IHJlcXVpcmUoJy4vYWRkLmpzJyksXHJcbiAgY291bnQ6IHJlcXVpcmUoJy4vY291bnQuanMnKSxcclxuICBlY2hvOiByZXF1aXJlKCcuL2VjaG8uanMnKSxcclxuICBmaW5kX3dpbmRvdzogcmVxdWlyZSgnLi9maW5kV2luZG93LmpzJyksXHJcbiAgZm9yYmlkZGVuOiByZXF1aXJlKCcuL2ZvcmJpZGRlbi5qcycpLFxyXG4gIGhlbHA6IHJlcXVpcmUoJy4vaGVscC5qcycpLFxyXG4gIGxvZzogcmVxdWlyZSgnLi9sb2cuanMnKSxcclxuICBzdGF0dXM6IHJlcXVpcmUoJy4vc3RhdHVzLmpzJyksXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZHMiLCJjb25zdCBjb21tYW5kID0ge1xyXG4gIHJ1bjogZnVuY3Rpb24oY21kKSB7XHJcbiAgICBjb25zb2xlLmxvZyhjbWQucmVzdClcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZCIsImNvbnN0IGxvY2F0aW9uID0gcmVxdWlyZSgnLi4vbG9jYXRpb24uanMnKVxyXG5cclxuY29uc3QgY29tbWFuZCA9IHtcclxuICBydW46IGZ1bmN0aW9uKCkge1xyXG4gICAgbGV0IHNoaXAgPSBsb2NhdGlvbi51bml2ZXJzZS5wbGF5ZXJcclxuICAgIHJldHVybiBgQ3VycmVudGx5IG9yYml0aW5nICR7c2hpcC5wYXJlbnQubmFtZX1cclxuU2VtaS1tYWpvciBheGlzOiAke2xvY2F0aW9uLmdldEZvcm1hdHRlZERpc3RhbmNlKHNoaXAuc21hKX1cclxuRnVlbCBsZXZlbDogMTAwJVxyXG5IdWxsIGludGVncml0eTogMTAwJVxyXG5ObyB0cmFuc2ZlciBpbiBwcm9ncmVzc2BcclxuICB9LFxyXG5cclxuICBoZWxwOiBmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiBgZGlzcGxheSBpbmZvcm1hdGlvbiBhYm91dCB0aGUgc2hpcCdzIGN1cnJlbnQgc2l0dWF0aW9uYFxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kIiwiY29uc3QgdGltZSA9IHJlcXVpcmUoJy4vdXRpbHMvdGltZS5qcycpXHJcblxyXG4vLyBEYXRhIHRvIGJlIGxvYWRlZCBvbiBhIG5ldyBzYXZlXHJcbmNvbnN0IHNvbGFyU3lzdGVtID0gW1xyXG4gIHtuYW1lOlwic3VuXCIsIHR5cGU6XCJzdW5cIiwgc21hOjAsIG1hc3M6MS45ODllMzB9LFxyXG4gICAge25hbWU6XCJqdXBpdGVyXCIsIHR5cGU6XCJwbGFuZXRcIiwgc21hOjAsIG1hc3M6MS44OTg2ZTI3LCBwYXJlbnQ6XCJzdW5cIn0sXHJcbiAgICAgIHtuYW1lOlwiaW9cIiwgdHlwZTpcIm1vb25cIixzbWE6NC4yMTdlOCxtYXNzOjguOTMxOWUyMixhbm9tYWx5QXRFcG9jaDoxMCxwYXJlbnQ6XCJqdXBpdGVyXCJ9LFxyXG4gICAgICAgIHtuYW1lOlwic3RhcnRcIixzbWE6MS45M2U2LHBhcmVudDpcImlvXCJ9LFxyXG4gICAgICAgIHtuYW1lOlwicGxheWVyXCIsIHR5cGU6XCJzaGlwXCIsc21hOjEuOTNlNixtYXNzOjFlNCxhbm9tYWx5QXRFcG9jaDowLHBhcmVudDpcImlvXCJ9LFxyXG4gICAgICB7bmFtZTpcImV1cm9wYVwiLCB0eXBlOlwibW9vblwiLHNtYTo2LjcxZTgsbWFzczo0LjhlMjIsYW5vbWFseUF0RXBvY2g6MCxwYXJlbnQ6XCJqdXBpdGVyXCJ9LFxyXG4gICAgICAgIHtuYW1lOlwiZW5kXCIsc21hOjEuNjZlNixwYXJlbnQ6XCJldXJvcGFcIn0sXHJcbiAgICAgIHtuYW1lOlwiZ2FueW1lZGVcIiwgdHlwZTpcIm1vb25cIixzbWE6MS4wNzA0MTJlOSxtYXNzOjEuNDgxOWUyMyxhbm9tYWx5QXRFcG9jaDowLHBhcmVudDpcImp1cGl0ZXJcIn0sXHJcbiAgICAgIHtuYW1lOlwiY2FsbGlzdG9cIiwgdHlwZTpcIm1vb25cIixzbWE6MS4wNzA0MTJlOSxtYXNzOjEuNDgxOWUyMyxhbm9tYWx5QXRFcG9jaDowLHBhcmVudDpcImp1cGl0ZXJcIn0sXHJcbiAgICAgICAge25hbWU6XCJzdGF0aW9uXCIsIHR5cGU6XCJzdGF0aW9uXCIsc21hOjEwLHBhcmVudDpcImNhbGxpc3RvXCJ9LFxyXG4gICAge25hbWU6XCJlYXJ0aFwiLCB0eXBlOlwicGxhbmV0XCIsIHNtYToxLjQ5NmUxMSwgbWFzczo1Ljk3MjNlMjQsIGFub21hbHlBdEVwb2NoOjEyOS41NSwgcGFyZW50Olwic3VuXCJ9LFxyXG4gICAgICB7bmFtZTpcImlzc1wiLCB0eXBlOlwic3RhdGlvblwiLHNtYTo2Ljc4MGU2LG1hc3M6NWU1LHBhcmVudDpcImVhcnRoXCJ9LFxyXG4gICAge25hbWU6XCJtYXJzXCIsIHR5cGU6XCJwbGFuZXRcIixzbWE6Mi4yNzkyZTExLG1hc3M6Ni40MTcxZTIzLGFub21hbHlBdEVwb2NoOjI1LjI3LHBhcmVudDpcInN1blwifSxcclxuXHJcbi8qIEVhcnRoIE1lYW4gT3JiaXRhbCBFbGVtZW50cyAoSjIwMDApXHJcbiAgU2VtaW1ham9yIGF4aXMgKEFVKSAgICAgICAgICAgICAgICAgIDEuMDAwMDAwMTEgIFxyXG4gIE9yYml0YWwgZWNjZW50cmljaXR5ICAgICAgICAgICAgICAgICAwLjAxNjcxMDIyICAgXHJcbiAgT3JiaXRhbCBpbmNsaW5hdGlvbiAoZGVnKSAgICAgICAgICAgIDAuMDAwMDUgIFxyXG4gIExvbmdpdHVkZSBvZiBhc2NlbmRpbmcgbm9kZSAoZGVnKSAgLTExLjI2MDY0ICBcclxuICBMb25naXR1ZGUgb2YgcGVyaWhlbGlvbiAoZGVnKSAgICAgIDEwMi45NDcxOSAgXHJcbiAgTWVhbiBMb25naXR1ZGUgKGRlZykgICAgICAgICAgICAgICAxMDAuNDY0MzVcclxuIFxyXG5cclxuIE1hcnMgb3JiaXRhbCBlbGVtZW50c1xyXG4gIFNlbWltYWpvciBheGlzIChBVSkgICAgICAgICAgICAgICAgICAxLjUyMzY2MjMxICBcclxuICBPcmJpdGFsIGVjY2VudHJpY2l0eSAgICAgICAgICAgICAgICAgMC4wOTM0MTIzMyAgIFxyXG4gIE9yYml0YWwgaW5jbGluYXRpb24gKGRlZykgICAgICAgICAgICAxLjg1MDYxICAgXHJcbiAgTG9uZ2l0dWRlIG9mIGFzY2VuZGluZyBub2RlIChkZWcpICAgNDkuNTc4NTQgIFxyXG4gIExvbmdpdHVkZSBvZiBwZXJpaGVsaW9uIChkZWcpICAgICAgMzM2LjA0MDg0ICAgXHJcbiAgTWVhbiBMb25naXR1ZGUgKGRlZykgICAgICAgICAgICAgICAzNTUuNDUzMzJcclxuICAqL1xyXG5cclxuXHJcbiAgLy8ga2VyYm9sIHRlc3QgZGF0YXNldFxyXG4gIHtuYW1lOlwia2VyYm9sXCIsIHR5cGU6XCJzdW5cIixzbWE6MCxtYXNzOjEuNzVlMjh9LFxyXG4gICAge25hbWU6XCJrZXJiaW5cIix0eXBlOlwicGxhbmV0XCIsc21hOjEzNTk5ODQwMjU2LG1hc3M6NS4yOWUyMixwYXJlbnQ6XCJrZXJib2xcIn0sXHJcbiAgICAgIHtuYW1lOlwia2VyYmFsXCIsc21hOjcwMDAwMCxtYXNzOjEwMCxwYXJlbnQ6XCJrZXJiaW5cIn0sXHJcbiAgICB7bmFtZTpcImR1bmFcIiwgdHlwZTpcInBsYW5ldFwiLHNtYToyMDcyNjE1NTI2NCxtYXNzOjQuNTE1ZTIxLHBhcmVudDpcImtlcmJvbFwifSxcclxuICAgICAge25hbWU6XCJkZXN0aW5hdGlvblwiLHNtYTo3MDAwMDAsbWFzczoxMDAscGFyZW50OlwiZHVuYVwifSxcclxuXVxyXG5cclxuc29sYXJTeXN0ZW0uZm9yRWFjaChib2R5ID0+IHtib2R5LmVwb2NoID0gdGltZS5jdXJyZW50fSlcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge3NvbGFyU3lzdGVtOnNvbGFyU3lzdGVtfSIsImNvbnN0IERleGllID0gcmVxdWlyZSgnZGV4aWUnKVxyXG5jb25zdCBkYXRhID0gcmVxdWlyZSgnLi9kYXRhLmpzJylcclxuY29uc3QgZGIgPSBuZXcgRGV4aWUoJ2pvdmlhbldlZWsnKTtcclxuXHJcbmRiLnZlcnNpb24oMSkuc3RvcmVzKHtcclxuICAgIHVuaXZlcnNlOiduYW1lJyxcclxufSk7XHJcblxyXG5kYi5vbihcInBvcHVsYXRlXCIsIGZ1bmN0aW9uKCkge1xyXG4gIGNvbnNvbGUubG9nKCdwb3B1bGF0ZScpXHJcbiAgZGIudW5pdmVyc2UuYnVsa0FkZChkYXRhLnNvbGFyU3lzdGVtKVxyXG59KTtcclxuXHJcbmRiLm9wZW4oKS5jYXRjaChmdW5jdGlvbiAoZSkge1xyXG4gICAgY29uc29sZS5lcnJvcihcIk9wZW4gZmFpbGVkOiBcIiArIGUpO1xyXG59KTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRiIiwiY29uc3QgZ2FtZSA9IHsgLy8gcXVpY2sgYWNjZXNzIHRvIG1vZHVsZXNcclxuICBzeXN0ZW06IHJlcXVpcmUoJy4vc3lzdGVtLmpzJyksXHJcbiAgb3JiaXQ6IHJlcXVpcmUoJy4vdXRpbHMvb3JiaXQuanMnKSxcclxuICB0ZXJtaW5hbDogcmVxdWlyZSgnLi90ZXJtaW5hbC5qcycpLFxyXG4gIHRpbWU6IHJlcXVpcmUoJy4vdXRpbHMvdGltZS5qcycpLFxyXG4gIHBsYXllcjogcmVxdWlyZSgnLi9wbGF5ZXIuanMnKSxcclxuICBjb21tYW5kczogcmVxdWlyZSgnLi9jb21tYW5kcy8nKSxcclxuICBsb2NhdGlvbjogcmVxdWlyZSgnLi9sb2NhdGlvbi5qcycpLFxyXG4gIGRiOiByZXF1aXJlKCcuL2RiLycpLFxyXG59XHJcblxyXG53aW5kb3cuam92aWFuV2VlayA9IGdhbWVcclxubW9kdWxlLmV4cG9ydHMgPSBnYW1lIiwiY29uc3QgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXIuanMnKVxyXG5cclxuY29uc3QgbG9jYXRpb24gPSB7XHJcbiAgdW5pdmVyc2U6e30sXHJcblxyXG4gIC8vIFJldHVybnMgYSB3ZWxsIGZvcm1hdHRlZCBkaXN0YW5jZSwgaW5wdXQgaXMgaW4gbWV0ZXJzXHJcbiAgZ2V0Rm9ybWF0dGVkRGlzdGFuY2U6IGZ1bmN0aW9uKGRpc3RhbmNlKSB7XHJcbiAgICBsZXQgdW5pdCA9IFwiIG1cIlxyXG4gICAgaWYoZGlzdGFuY2UgPiAxZTYpIHtcclxuICAgICAgZGlzdGFuY2UgPSBNYXRoLnJvdW5kKGRpc3RhbmNlLzEwMDApXHJcbiAgICAgIHVuaXQgPSBcIiBrbVwiXHJcbiAgICB9XHJcbiAgICByZXR1cm4gKGRpc3RhbmNlICsgdW5pdCkucmVwbGFjZSgvKFxcZCkoPz0oXFxkezN9KSsoPyFcXGQpKS9nLCBcIiQxIFwiKVxyXG4gIH0sXHJcblxyXG4gIC8vVE9ETyBNb3N0IGNlbGVzdGlhbCBib2RpZXMgXCJvbiByYWlsc1wiIHNob3VsZCBwcm9iYWJseSBiZSBsZWZ0IGFsb25lIGR1cmluZyB0aGUgc2F2ZS9sb2FkIGN5Y2xlXHJcbiAgLy9UT0RPIE9ubHkgc2F2ZSBzaGlwcyB0byBkYiA/XHJcbiAgLy9UT0RPIE9ubHkgc2F2ZSB1cGRhdGVkIGJvZGllcyB0byBkYiA/XHJcbiAgLy9UT0RPIG1vdmUgdG8gYSBsb2FkIC8gc2F2ZSBzeXN0ZW1cclxuICBsb2FkOmZ1bmN0aW9uKGRhdGEpIHtcclxuICAgIGZvcihsZXQgYm9keSBvZiBkYXRhKSB7XHJcbiAgICAgIGlmKCF0aGlzLnVuaXZlcnNlW2JvZHkubmFtZV0pIHRoaXMudW5pdmVyc2VbYm9keS5uYW1lXSA9IHt9XHJcblxyXG4gICAgICBpZihib2R5LnBhcmVudCAhPSBudWxsKSB7XHJcbiAgICAgICAgaWYoIXRoaXMudW5pdmVyc2VbYm9keS5wYXJlbnRdKSB0aGlzLnVuaXZlcnNlW2JvZHkucGFyZW50XSA9IHt9XHJcbiAgICAgICAgbGV0IHBhcmVudCA9IHRoaXMudW5pdmVyc2VbYm9keS5wYXJlbnRdXHJcbiAgICAgICAgYm9keS5wYXJlbnQgPSBwYXJlbnRcclxuICAgICAgICBpZighcGFyZW50LmNoaWxkcmVuKSBwYXJlbnQuY2hpbGRyZW4gPSB7fVxyXG4gICAgICAgIHBhcmVudC5jaGlsZHJlbltib2R5Lm5hbWVdID0gdGhpcy51bml2ZXJzZVtib2R5Lm5hbWVdXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIE9iamVjdC5hc3NpZ24odGhpcy51bml2ZXJzZVtib2R5Lm5hbWVdLCBib2R5KSAvLyBhZGRpbmcgcHJvcGVydGllc1xyXG4gICAgfVxyXG4gICAgcGxheWVyLnNoaXAgPSB0aGlzLnVuaXZlcnNlLnBsYXllclxyXG4gIH0sXHJcbiAgXHJcbiAgc2F2ZTpmdW5jdGlvbigpIHtcclxuICAgIGNvbnN0IHRlbXBVbml2ZXJzZSA9IFtdXHJcbiAgICBmb3IobGV0IG5hbWUgaW4gdGhpcy51bml2ZXJzZSkge1xyXG4gICAgICBsZXQgdGVtcCA9IE9iamVjdC5hc3NpZ24oe30sdGhpcy51bml2ZXJzZVtuYW1lXSlcclxuICAgICAgaWYodGVtcC5wYXJlbnQpIHRlbXAucGFyZW50ID0gdGVtcC5wYXJlbnQubmFtZVxyXG4gICAgICBpZih0ZW1wLmNoaWxkcmVuKSBkZWxldGUgdGVtcC5jaGlsZHJlblxyXG4gICAgICB0ZW1wVW5pdmVyc2UucHVzaCh0ZW1wKVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRlbXBVbml2ZXJzZVxyXG4gIH0sXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gbG9jYXRpb24iLCJjb25zdCBwbGF5ZXIgPSB7XHJcbiAgc2hpcDp7fSwgLy8gc2V0IGFmdGVyIGxvYWQgP1xyXG4gIG5hbWU6IFwiamVkXCIsXHJcbiAgc3RhdHVzOiBcIm9yYml0aW5nXCIsXHJcbiAgZGVsdGF2OiAxMDAsXHJcbiAgYmFsYW5jZTogMTU2NDU2MDAwLFxyXG4gIGh1bGw6IDEwMCxcclxuICB0YWtlRGFtYWdlOiBmdW5jdGlvbihkYW1hZ2UpIHsgdGhpcy5odWxsIC09IDEwOyBnYW1lLnRlcm0uZWNobygnW1s7cmVkO11Ub29rICcrZGFtYWdlKycgZGFtYWdlIV0nKX0sXHJcbiAgY2FuRG9jazogZnVuY3Rpb24oKSB7IHJldHVybiAodW5pdmVyc2VbZ2FtZS5wbGF5ZXIubG9jYXRpb25dLnR5cGUgPT0gXCJzdGF0aW9uXCIpfSxcclxuICBkb2NrOiBmdW5jdGlvbigpIHt9LFxyXG4gIHVuZG9jazogZnVuY3Rpb24oKSB7fSxcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBwbGF5ZXIiLCJjb25zdCBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllci5qcycpXHJcbmNvbnN0IHRpbWUgPSByZXF1aXJlKCcuL3V0aWxzL3RpbWUuanMnKVxyXG5jb25zdCBsb2NhdGlvbiA9IHJlcXVpcmUoJy4vbG9jYXRpb24uanMnKVxyXG5jb25zdCBkYiA9IHJlcXVpcmUoJy4vZGIuanMnKVxyXG5cclxuY29uc3Qgc3lzdGVtID0ge1xyXG4gIHVwZGF0ZURlbHRhOiAyNTAwLCAvLyB0aW1lIGJldHdlZW4gdXBkYXRlcyBpbiBtc1xyXG4gIGVwb2NoOjAsXHJcbiAgcnVuQXRVcGRhdGU6IFtdLFxyXG4gIGxhc3RTYXZlOjAsXHJcbiAgc2F2ZURlbHRhOjMwMDAwLCAvLyB0aW1lIGJldHdlZW4gYXV0b3NhdmVzIGluIG1zXHJcblxyXG4gIFxyXG4gIHNhdmU6IGZ1bmN0aW9uKCkge1xyXG4gICAgY29uc29sZS5sb2coJ3NhdmluZycpXHJcbiAgICBkYi51bml2ZXJzZS5idWxrUHV0KGxvY2F0aW9uLnNhdmUoKSlcclxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwic2F2ZVwiLEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgbmFtZTogcGxheWVyLm5hbWUsXHJcbiAgICAgIGxvY2F0aW9uOiBwbGF5ZXIubG9jYXRpb24sXHJcbiAgICAgIHN0YXR1czogcGxheWVyLnN0YXR1cyxcclxuICAgICAgZGVsdGF2OiBwbGF5ZXIuZGVsdGF2LFxyXG4gICAgICBiYWxhbmNlOiBwbGF5ZXIuYmFsYW5jZSxcclxuICAgICAgaHVsbDogcGxheWVyLmh1bGwsXHJcbiAgICB9KSlcclxuICB9LFxyXG5cclxuXHJcbiAgbG9hZDogZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygnbG9hZGluZycpXHJcbiAgICBkYi51bml2ZXJzZS50b0FycmF5KCkudGhlbihkYXRhID0+IHtcclxuICAgICAgbG9jYXRpb24ubG9hZChkYXRhKVxyXG4gICAgfSlcclxuXHJcbiAgICB2YXIgc2F2ZURhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwic2F2ZVwiKSlcclxuICAgIGlmKCFzYXZlRGF0YSkgeyByZXR1cm4gfVxyXG4gICAgdGhpcy5lcG9jaCA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApXHJcbiAgICBwbGF5ZXIubmFtZSA9IHNhdmVEYXRhLm5hbWVcclxuICAgIHBsYXllci5sb2NhdGlvbiA9IHNhdmVEYXRhLmxvY2F0aW9uXHJcbiAgICBwbGF5ZXIuc3RhdHVzID0gc2F2ZURhdGEuc3RhdHVzXHJcbiAgICBwbGF5ZXIuZGVsdGF2ID0gc2F2ZURhdGEuZGVsdGF2XHJcbiAgICBwbGF5ZXIuYmFsYW5jZSA9IHNhdmVEYXRhLmJhbGFuY2VcclxuICAgIHBsYXllci5odWxsID0gc2F2ZURhdGEuaHVsbFxyXG4gIH0sXHJcblxyXG5cclxuICAvLyBVcGRhdGUgbG9vcFxyXG4gIFxyXG4gIGFkZFRvVXBkYXRlOiBmdW5jdGlvbihmKSB7XHJcbiAgICBpZiggdHlwZW9mIGYgPT0gXCJmdW5jdGlvblwiKSB0aGlzLnJ1bkF0VXBkYXRlLnB1c2goZilcclxuICB9LFxyXG4gIHVwZGF0ZTogZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygndXBkYXRlJylcclxuXHJcbiAgICBmb3IobGV0IGYgb2Ygc3lzdGVtLnJ1bkF0VXBkYXRlKSB7IGYoKSB9IC8vIFxyXG5cclxuXHJcbiAgICAvLyBSdW4gYXV0b3NhdmVcclxuICAgIHN5c3RlbS5sYXN0U2F2ZSArPSBzeXN0ZW0udXBkYXRlRGVsdGFcclxuICAgIGlmKHN5c3RlbS5sYXN0U2F2ZSA+PSBzeXN0ZW0uc2F2ZURlbHRhKSB7XHJcbiAgICAgIHN5c3RlbS5sYXN0U2F2ZSA9IDBcclxuICAgICAgc3lzdGVtLnNhdmUoKVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBzZXRUaW1lb3V0KHN5c3RlbS51cGRhdGUsIHN5c3RlbS51cGRhdGVEZWx0YSk7IC8vIE5leHQgbG9vcFxyXG4gIH0sXHJcblxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHN5c3RlbSIsImNvbnN0IHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyLmpzJylcclxuY29uc3Qgc3lzdGVtID0gcmVxdWlyZSgnLi9zeXN0ZW0uanMnKVxyXG5jb25zdCBjb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMvJylcclxuXHJcbmNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgcHJvbXB0OiBmdW5jdGlvbihlKSB7ZShgW1s7Z3JlZW47XSR7cGxheWVyLnN0YXR1c31dQFtbOyM3Nzc7XSR7cGxheWVyLmxvY2F0aW9ufV0+YCl9LFxyXG4gIGdyZWV0aW5nczogZnVuY3Rpb24oY2FsbGJhY2spIHtjYWxsYmFjayhgV2VsY29tZSB0byBKb3ZpYW4gV2VlayAke3BsYXllci5uYW1lfWApfSxcclxuICBvbkJsdXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2UgfSxcclxuICBvbkFmdGVyQ29tbWFuZDogZnVuY3Rpb24oZSkgeyBzeXN0ZW0uc2F2ZSgpIH0sXHJcbiAgY29tcGxldGlvbjogZnVuY3Rpb24oc3RyaW5nLCBjYWxsYmFjaykgeyAvL1RPRE8gYWRkIHN1cHBvcnQgZm9yIGFyZ3VtZW50cyBhdXRvY29tcGxldGVcclxuICAgIGNvbnN0IHN1Z2dlc3Rpb25zID0gW11cclxuICAgIGZvcihsZXQgbmFtZSBpbiBjb21tYW5kcykge1xyXG4gICAgICBpZighY29tbWFuZHNbbmFtZV0uaXNBbGxvd2VkIHx8IGNvbW1hbmRzW25hbWVdLmlzQWxsb3dlZCgpKSB7XHJcbiAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChuYW1lKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBjYWxsYmFjayhzdWdnZXN0aW9ucylcclxuICB9LFxyXG4gIC8va2V5ZG93bjogZnVuY3Rpb24oZSwgdGVybSkgeyBpZihnYW1lLmJsb2NrZWQpIHJldHVybiBmYWxzZTt9LFxyXG59XHJcblxyXG5mdW5jdGlvbiBpbnRlcnByZXRlcihjb21tYW5kLHRlcm0pIHtcclxuICBjb25zdCBjbWQgPSB0ZXJtaW5hbC51dGlscy5wYXJzZV9jb21tYW5kKGNvbW1hbmQpXHJcbiAgICBcclxuICBpZiggY29tbWFuZHNbY21kLm5hbWVdICkge1xyXG4gICAgaWYoICFjb21tYW5kc1tjbWQubmFtZV0uaXNBbGxvd2VkIHx8IGNvbW1hbmRzW2NtZC5uYW1lXS5pc0FsbG93ZWQoKSApIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gdGVybS5lY2hvKCBjb21tYW5kc1tjbWQubmFtZV0ucnVuKGNtZC5yZXN0KSApXHJcbiAgICAgIH0gY2F0Y2goZSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZSlcclxuICAgICAgICByZXR1cm4gdGVybS5lcnJvcihlLnRvU3RyaW5nKCkpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHRlcm0uZXJyb3IoXCJDb21tYW5kIG5vdCByZWNvZ25pemVkXCIpXHJcbn1cclxuXHJcblxyXG5jb25zdCB0ZXJtaW5hbCA9IHt9IC8vIFByb3ZpZGVzIHV0aWxzIGFuZCBtYWluIChpbnN0YW5jZSksIGJ1dCBvbmx5IGFmdGVyIGluaXRpYWxpemF0aW9uXHJcblxyXG5qUXVlcnkoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCQpIHtcclxuICAkKCcjY29uc29sZScpLnRlcm1pbmFsKGludGVycHJldGVyLCBvcHRpb25zKVxyXG4gIHN5c3RlbS5sb2FkKClcclxuICBzeXN0ZW0udXBkYXRlKClcclxuICB0ZXJtaW5hbC51dGlscyA9ICQudGVybWluYWxcclxuICB0ZXJtaW5hbC5tYWluID0gJCgnI2NvbnNvbGUnKS50ZXJtaW5hbCgpXHJcbn0pXHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB0ZXJtaW5hbCIsImNvbnN0IG9yYml0ID0ge1xyXG4gIC8vIHRvb2xzIHRvIGNvbXB1dGUgb3JiaXQgYW5kIHRyYW5zZmVyIHBhcmFtZXRlcnNcclxuICBnZXRHcmF2aXRhdGlvbmFsUGFyYW1ldGVyOiBmdW5jdGlvbihib2R5KSB7IHJldHVybiA2LjY3NDA4ZS0xMSAqIGJvZHkubWFzcyB9LFxyXG4gIGdldFBlcmlvZDogZnVuY3Rpb24oYm9keSkgeyAvL2dldCBvcmJpdGFsIHBlcmlvZCBpbiBzLCBzbWEgaW4gbSwgbWFzcyBpbiBrZ1xyXG4gICAgcmV0dXJuIDIgKiBNYXRoLlBJICogTWF0aC5zcXJ0KCBNYXRoLnBvdyhib2R5LnNtYSwzKSAvIHRoaXMuZ2V0R3Jhdml0YXRpb25hbFBhcmFtZXRlcihib2R5LnBhcmVudCkgKTtcclxuICB9LFxyXG4gIGdldFZlbG9jaXR5OiBmdW5jdGlvbihib2R5KSB7IHJldHVybiBNYXRoLnNxcnQodGhpcy5nZXRHcmF2aXRhdGlvbmFsUGFyYW1ldGVyKGJvZHkucGFyZW50KS9ib2R5LnNtYSkgfSxcclxuICBcclxuICAvLyBSZXR1cm5zIHRoZSBjdXJyZW50IGFuZ2xlIGluIGRlZ3JlZXMgYmV0d2VlbiBwZXJpYXBzaXMgYW5kIHRoZSBib2R5J3MgcG9zaXRpb25cclxuICBnZXRNZWFuQW5vbWFseTogZnVuY3Rpb24oYm9keSwgdGltZT1nYW1lLmVwb2NoKSB7XHJcblxyXG4gICAgbGV0IHRpbWVTaW5jZUVwb2NoID0gZ2FtZS5jdXJyZW50VGltZSAtIGdhbWUuZXBvY2hcclxuICAgIGxldCBwZXJpb2QgPSB0aGlzLmdldFBlcmlvZChib2R5KVxyXG4gICAgbGV0IHRpbWVJbkxhc3RPcmJpdCA9IHRpbWVTaW5jZUVwb2NoICUgcGVyaW9kXHJcbiAgICBsZXQgYW5nbGVJbkxhc3RPcmJpdCA9IHRpbWVJbkxhc3RPcmJpdCAvIHBlcmlvZCAqIDM2MFxyXG4gICAgbGV0IGN1cnJlbnRBbm9tYWx5ID0gKGJvZHkuYW5vbWFseUF0RXBvY2ggKyBhbmdsZUluTGFzdE9yYml0KSAlIDM2MFxyXG4gICAgcmV0dXJuIGN1cnJlbnRBbm9tYWx5XHJcbiAgfSxcclxuXHJcbiAgLy8gcmV0dXJucyB0aGUgZWNjZW50cmljIGFub21seSBpbiBncmFkaWFuc1xyXG4gIGdldEVjY2VudHJpY0Fub21hbHk6IGZ1bmN0aW9uKGJvZHksIHQ9Z2FtZS5lcG9jaCkge1xyXG4gICAgLy8gc2hvdWxkIGdvIGludG8gdGhlIGdldCBtZWFuIGFub21hbHkgZnVuY3Rpb25cclxuICAgIGxldCBuID0gTWF0aC5zcXJ0KCB0aGlzLmdldEdyYXZpdGF0aW9uYWxQYXJhbWV0ZXIoYm9keS5wYXJlbnQpIC8gTWF0aC5wb3coYm9keS5zbWEsMykgKVxyXG4gICAgbGV0IE0gPSBib2R5LmFub21hbHlBdEVwb2NoICsgbiAqICh0IC0gYm9keS5lcG9jaClcclxuXHJcbiAgICB2YXIgzrUgPSAxZS0xOFxyXG4gICAgdmFyIG1heEl0ZXIgPTEwMFxyXG4gICAgdmFyIEVcclxuICAgIHZhciBlID0gYm9keS5lY2NlbnRyaWNpdHlcclxuICAgIC8vdmFyIE0gPSB0aGlzLmdldE1lYW5Bbm9tYWx5KGJvZHksZXBvY2gpXHJcblxyXG4gICAgaWYgKGUgPCAwLjgpIHtcclxuICAgICAgRSA9IE07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBFID0gTWF0aC5QSTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZEUgPSAxLFxyXG4gICAgICAgIGkgPSAwO1xyXG4gICAgd2hpbGUgKE1hdGguYWJzKGRFKSA+IM61ICYmIGkgPCBtYXhJdGVyKSB7XHJcbiAgICAgIGRFID0gKE0gKyBlICogTWF0aC5zaW4oRSkgLSBFKSAvICgxIC0gZSAqIE1hdGguY29zKEUpKTtcclxuICAgICAgRSA9IEUgKyBkRTtcclxuICAgICAgaSsrO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBFO1xyXG4gIH0sXHJcblxyXG5cclxuICBnZXRUcnVlQW5vbWFseTogZnVuY3Rpb24oYm9keSwgZXBvY2g9Z2FtZS5lcG9jaCkge1xyXG4gICAgcmV0dXJuIGVwb2NoXHJcbiAgfSxcclxuXHJcbiAgLy8gcmV0dXJucyB0aGUgcGhhc2UgYW5nbGUgKGluIGRlZ3JlZXMpIGJldHdlZW4gdGhlIG9yaWdpbiBib2R5IGFuZCB0aGUgZGVzdGluYXRpb24gYm9keVxyXG4gIGdldFBoYXNlQW5nbGU6IGZ1bmN0aW9uKG9yaWdpbiwgZGVzdGluYXRpb24pIHtcclxuICAgIC8vIG1pZ2h0IG5lZWQgdG8gYmUgY2hhbmdlZCBhZnRlciBlY2NlbnRyaWNpdHkgYW5kIGluY2xpbmF0aW9uIGFyZSBhZGRlZFxyXG4gICAgcmV0dXJuIHRoaXMuZ2V0TWVhbkFub21hbHkoZGVzdGluYXRpb24pIC0gdGhpcy5nZXRNZWFuQW5vbWFseShvcmlnaW4pXHJcbiAgfSxcclxuXHJcbiAgZ2V0U3lub2RpY1BlcmlvZDogZnVuY3Rpb24oYm9keSwgYm9keTIpIHtcclxuICAgIGxldCBpbnZfcGVyaW9kID0gMS90aGlzLmdldFBlcmlvZChib2R5KSAtIDEvdGhpcy5nZXRQZXJpb2QoYm9keTIpXHJcbiAgICByZXR1cm4gTWF0aC5hYnMoMS9pbnZfcGVyaW9kKVxyXG4gIH0sXHJcblxyXG5cclxuICBnZXRUcmFuc2ZlclBoYXNlQW5nbGUoZnJvbSx0bykge1xyXG4gICAgcmV0dXJuICgxIC0gTWF0aC5wb3coKGZyb20uc21hICsgdG8uc21hKS8oMip0by5zbWEpLDEuNSkpICogMTgwXHJcbiAgfSxcclxuXHJcbiAgLy8gY29tcHV0ZSBhIGhvaG1hbm4gdHJhbnNmZXIgZnJvbSB0aGUgb3JpZ2luIG9yYml0IHRvIHRoZSBkZXN0aW5hdGlvbiBvcmJpdFxyXG4gIC8vIFxyXG4gIC8vIE9yYml0cyBtdXN0IGJlIGFyb3VuZCBkaWZmZXJlbnQgYm9kaWVzLCBidXQgd2l0aCB0aGUgc2FtZSBwYXJlbnRcclxuICBnZXRUcmFuc2ZlcjogZnVuY3Rpb24oZnJvbSx0bykge1xyXG4gICAgLy8gdmFyaWFibGVzIHVzZWQgaW4gY29tcHV0YXRpb25cclxuICAgIGxldCBvcmlnaW4gPSBmcm9tLnBhcmVudCAvLyBvcmlnaW4gYm9keVxyXG4gICAgbGV0IGRlc3RpbmF0aW9uID0gdG8ucGFyZW50IC8vIGRlc3RpbmF0aW9uIGJvZHlcclxuICAgIGxldCBhXzEgPSBmcm9tLnNtYSAvLyBzbWEgYXQgb3JpZ2luIG9yYml0XHJcbiAgICBsZXQgYV8yID0gdG8uc21hIC8vIHNtYSBhdCBkZXN0aW5hdGlvbiBvcmJpdFxyXG4gICAgbGV0IHJfMSA9IG9yaWdpbi5zbWEgLy8gc21hIG9mIHRoZSBvcmlnaW4gYm9keVxyXG4gICAgbGV0IHJfMiA9IGRlc3RpbmF0aW9uLnNtYSAvLyBzbWEgb2YgdGhlIGRlc3RpbmF0aW9uIGJvZHlcclxuICAgIGxldCBtdV9wID0gdGhpcy5nZXRHcmF2aXRhdGlvbmFsUGFyYW1ldGVyKG9yaWdpbi5wYXJlbnQpXHJcbiAgICBsZXQgbXVfMSA9IHRoaXMuZ2V0R3Jhdml0YXRpb25hbFBhcmFtZXRlcihvcmlnaW4pXHJcbiAgICBsZXQgbXVfMiA9IHRoaXMuZ2V0R3Jhdml0YXRpb25hbFBhcmFtZXRlcihkZXN0aW5hdGlvbilcclxuXHJcbiAgICBsZXQgdHJhbnNmZXJUaW1lID0gTWF0aC5QSSAqIE1hdGguc3FydCggTWF0aC5wb3cocl8xK3JfMiwzKS8oOCptdV9wKSApXHJcblxyXG4gICAgbGV0IHBoYXNlQW5nbGUgPSAoMSAtIE1hdGgucG93KChyXzEgKyByXzIpLygyKnJfMiksMS41KSkgKiAxODBcclxuXHJcbiAgICAvLyBJbmplY3Rpb24gdmVsb2NpdHlcclxuICAgIGxldCB2X2gxID0gTWF0aC5zcXJ0KCAyKm11X3Aqcl8yIC8gKHJfMSoocl8xK3JfMikpICkgLy8gc3BlZWQgb2YgaG9obWFuIHRyYW5zZmVyIGF0IHN0YXJ0XHJcbiAgICBsZXQgdl90MSA9IHZfaDEgLSB0aGlzLmdldFZlbG9jaXR5KG9yaWdpbikgLy8gdmVsb2NpdHkgY2hhbmdlIGF0IGRlcGFydHVyZVxyXG4gICAgbGV0IHZfZXNjYXBlID0gTWF0aC5zcXJ0KCB2X3QxKnZfdDEgKyAyKm11XzEvYV8xICkgLy8gdmVsb2NpdHkgYXQgZGVwYXJ0dXJlIGVzY2FwZVxyXG4gICAgbGV0IHZfaW5qZWN0aW9uID0gdl9lc2NhcGUgLSB0aGlzLmdldFZlbG9jaXR5KGZyb20pIC8vIGluamVjdGlvbiBkZWx0YSB2XHJcblxyXG4gICAgLy8gSW5zZXJ0aW9uIHZlbG9jaXR5XHJcbiAgICBsZXQgdl9oMiA9IE1hdGguc3FydCggMiptdV9wKnJfMSAvIChyXzIqKHJfMStyXzIpKSApIC8vIHNwZWVkIG9mIGhvaG1hbm4gdHJhbnNmZXIgYXQgdGFyZ2V0XHJcbiAgICBsZXQgdl90MiA9IHZfaDIgLSB0aGlzLmdldFZlbG9jaXR5KGRlc3RpbmF0aW9uKSAvLyB2ZWxvY2l0eSBjaGFuZ2UgYXQgdGFyZ2V0XHJcbiAgICBsZXQgdl9jYXB0dXJlID0gTWF0aC5zcXJ0KCB2X3QyKnZfdDIgKyAyKm11XzIvYV8yICkgLy8gdmVsb2NpdHkgYXQgdGFyZ2V0IGNhcHR1cmVcclxuICAgIGxldCB2X2luc2VydGlvbiA9IHZfY2FwdHVyZSAtIHRoaXMuZ2V0VmVsb2NpdHkodG8pXHJcbiAgICBsZXQgdl90b3RhbCA9IHZfaW5qZWN0aW9uICsgdl9pbnNlcnRpb25cclxuXHJcbiAgICBsZXQgZXRhID0gdl9lc2NhcGUqdl9lc2NhcGUvMiAtIG11XzEvYV8xXHJcbiAgICBsZXQgZSA9IE1hdGguc3FydCggMSArIDIqZXRhKmFfMSphXzEqdl9lc2NhcGUqdl9lc2NhcGUvKG11XzEqbXVfMSkgKVxyXG4gICAgbGV0IGVqZWN0aW9uQW5nbGUgPSAxODAgLSBNYXRoLmFjb3MoMS9lKSAqICgxODAvTWF0aC5QSSkgLy8gQW5nbGUgb2YgYnVybiB0byBvcmlnaW4ncyBwcm9ncmFkZVxyXG5cclxuICAgIGNvbnNvbGUubG9nKFwiVHJhbnNmZXIgdGltZSA6IFwiICsgdGhpcy50aW1lVG9TdHJpbmcodHJhbnNmZXJUaW1lKSlcclxuICAgIGNvbnNvbGUubG9nKFwiUGhhc2UgYW5nbGUgOiBcIiArIHBoYXNlQW5nbGUpXHJcbiAgICBjb25zb2xlLmxvZyhcIkluamVjdGlvbiBkZWx0YSB2IDogXCIgK3ZfaW5qZWN0aW9uKyBcIm0vc1wiKVxyXG4gICAgY29uc29sZS5sb2coXCJFc2NhcGUgdmVsb2NpdHkgOiBcIiArdl9lc2NhcGUpXHJcbiAgICBjb25zb2xlLmxvZyhcImUgOiBcIiArIGUpXHJcbiAgICBjb25zb2xlLmxvZyhcImVqZWN0aW9uQW5nbGUgOiBcIiArIGVqZWN0aW9uQW5nbGUpXHJcbiAgICBjb25zb2xlLmxvZyhcIkluc2VydGlvbiBkZWx0YSB2IDogXCIgK3ZfaW5zZXJ0aW9uKVxyXG4gICAgY29uc29sZS5sb2coXCJUb3RhbCBkZWx0YSB2IDogXCIgKyB2X3RvdGFsKVxyXG5cclxuICAgIGxldCBzbWEgPSAocl8xK3JfMikvMlxyXG4gICAgbGV0IGVjY2VudHJpY2l0eSA9IChyXzEgLSByXzIpLyhyXzErcl8yKVxyXG4gICAgbGV0IGxvd1xyXG4gICAgaWYob3JpZ2luLnNtYSA8IGRlc3RpbmF0aW9uLnNtYSkge1xyXG4gICAgICBlY2NlbnRyaWNpdHkgKj0gLTFcclxuICAgICAgbG93ID0gb3JpZ2luIFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbG93ID0gZGVzdGluYXRpb25cclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhlY2NlbnRyaWNpdHkpXHJcbiAgICBsZXQgd2luZG93ID0ge1xyXG4gICAgICBwaGFzZUFuZ2xlOiBwaGFzZUFuZ2xlLFxyXG4gICAgICB0cmFuc2ZlclRpbWU6IHRyYW5zZmVyVGltZSxcclxuICAgICAgZWplY3Rpb25BbmdsZTogZWplY3Rpb25BbmdsZSxcclxuICAgICAgdG90YWxEZWx0YVY6IHZfdG90YWwsXHJcbiAgICAgIG9yaWdpbjogb3JpZ2luLFxyXG4gICAgICBkZXN0aW5hdGlvbjogZGVzdGluYXRpb25cclxuICAgIH1cclxuICAgIGxldCBpbmplY3Rpb24gPSB7XHJcbiAgICAgIHR5cGU6XCJ0cmFuc2ZlclwiLFxyXG4gICAgICBzbWE6KHJfMStyXzIpLzIsXHJcbiAgICAgIGVjY2VudHJpY2l0eTplY2NlbnRyaWNpdHksXHJcbiAgICAgIHBhcmVudDpvcmlnaW4ucGFyZW50LFxyXG4gICAgICBhcmd1bWVudE9mUGVyaWFwc2lzOnRoaXMuZ2V0TWVhbkFub21hbHkobG93KSxcclxuICAgICAgYW5vbWFseUF0RXBvY2g6dGhpcy5nZXRNZWFuQW5vbWFseShvcmlnaW4pLFxyXG4gICAgICBlcG9jaDpnYW1lLmN1cnJlbnRUaW1lXHJcbiAgICB9XHJcbiAgICBsZXQgaW5zZXJ0aW9uID0ge1xyXG4gICAgICB0eXBlOlwib3JiaXRcIixcclxuICAgICAgc21hOmFfMixcclxuICAgICAgZWNjZW50cmljaXR5OjAsXHJcbiAgICAgIHBhcmVudDpkZXN0aW5hdGlvbixcclxuICAgICAgYXJndW1lbnRPZlBlcmlhcHNpczowLFxyXG4gICAgICBhbm9tYWx5QXRFcG9jaDowLFxyXG4gICAgICBlcG9jaDpnYW1lLmN1cnJlbnRUaW1lK3RyYW5zZmVyVGltZVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHt3aW5kb3c6d2luZG93LGluamVjdGlvbjppbmplY3Rpb259XHJcbiAgfSxcclxuXHJcblxyXG5cclxuICBnZXROZXh0V2luZG93OiBmdW5jdGlvbihvcmlnaW4sIGRlc3RpbmF0aW9uKSB7XHJcbiAgICAvLyBBc3N1bXB0aW9uIDogQWxsIHBsYW5ldHMgLyBtb29ucyBvcmJpdHMgYXJlIGNpcmN1bGFyIGFuZCBjb3BsYW5hciAhXHJcbiAgICBsZXQgcGhhc2VBbmdsZSA9IHRoaXMuZ2V0VHJhbnNmZXJQaGFzZUFuZ2xlKG9yaWdpbiwgZGVzdGluYXRpb24pXHJcbiAgICBsZXQgYW5ndWxhclNwZWVkT3JpZ2luID0gMzYwIC8gdGhpcy5nZXRQZXJpb2Qob3JpZ2luKVxyXG4gICAgbGV0IGFuZ3VsYXJTcGVlZERlc3RpbmF0aW9uID0gMzYwIC8gdGhpcy5nZXRQZXJpb2QoZGVzdGluYXRpb24pXHJcbiAgICBsZXQgYW5ndWxhclNwZWVkRGlmZmVyZW5jZSA9IGFuZ3VsYXJTcGVlZERlc3RpbmF0aW9uIC0gYW5ndWxhclNwZWVkT3JpZ2luIC8vIGRpZmZlcmVuY2UgaW4gYW5ndWxhciBzcGVlZCBiZXR3ZWVuIHRoZSB0d28gYm9kaWVzXHJcbiAgICBsZXQgY3VycmVudFBoYXNlQW5nbGUgPSB0aGlzLmdldE1lYW5Bbm9tYWx5KGRlc3RpbmF0aW9uKSAtIHRoaXMuZ2V0TWVhbkFub21hbHkob3JpZ2luKVxyXG4gICAgbGV0IHdpbmRvd09wZW5zID0gKHRoaXMuZ2V0VHJhbnNmZXJQaGFzZUFuZ2xlKG9yaWdpbiwgZGVzdGluYXRpb24pIC0gY3VycmVudFBoYXNlQW5nbGUpIC8gYW5ndWxhclNwZWVkRGlmZmVyZW5jZVxyXG4gICAgaWYod2luZG93T3BlbnMgPCAwKSB7XHJcbiAgICAgIHdpbmRvd09wZW5zICs9IHRoaXMuZ2V0U3lub2RpY1BlcmlvZChvcmlnaW4sIGRlc3RpbmF0aW9uKVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coXCJXaW5kb3cgZm9yIHRyYW5zZmVyIG9wZW5zIGluIFwiK3RoaXMudGltZVRvU3RyaW5nKHdpbmRvd09wZW5zKSlcclxuICAgIHJldHVybiB3aW5kb3dPcGVuc1xyXG5cclxuICB9LFxyXG5cclxuICAvLyBUaW1lIGZ1bmN0aW9uc1xyXG4gIC8vIHNob3VsZCBiZSBtb3ZlZCB0byBvd24gbW9kdWxlXHJcbiAgdGltZUluU2Vjb25kczogZnVuY3Rpb24oc3RyaW5nKSB7IC8vIGNvbnZlcnQgYSBzdHJpbmcgbGlrZSBcIjdkMTJoXCIgdG8gYSBudW1iZXIgb2Ygc2Vjb25kc1xyXG4gICAgdmFyIG1hdGNoID0gL14oPzooXFxkKylkKT8oPzooXFxkKyloKT8oPzooXFxkKyltKT8kLy5leGVjKHN0cmluZylcclxuICAgIHZhciByZXMgPSAwO1xyXG4gICAgaWYobWF0Y2hbMV0pIHsgcmVzICs9ICgrbWF0Y2hbMV0gKiAyNCAqIDM2MDApIH1cclxuICAgIGlmKG1hdGNoWzJdKSB7IHJlcyArPSAoK21hdGNoWzJdICogMzYwMCkgfVxyXG4gICAgaWYobWF0Y2hbM10pIHsgcmVzICs9ICgrbWF0Y2hbM10gKiA2MCkgfVxyXG4gICAgcmV0dXJuIHJlc1xyXG4gIH0sIFxyXG4gIGdldFJlbWFpbmluZ1RpbWU6IGZ1bmN0aW9uKHRpbWUpIHsgLy8gcmV0dXJucyB0aGUgbnVtYmVyIG9mIHNlY29uZHMgdW50aWwgdGhlIHNwZWNpZmllZCB0aW1lc3RhbXAgKGluIHNlY29uZHMpXHJcbiAgICByZXR1cm4gdGhpcy50aW1lVG9TdHJpbmcoIHRpbWUgLSBnYW1lLmN1cnJlbnRUaW1lICk7XHJcbiAgfSxcclxuICB0aW1lVG9TdHJpbmc6IGZ1bmN0aW9uKHRpbWUpIHsgLy8gY29udmVydHMgYSB0aW1lIGluIHNlY29uZHMgdG8gYSBuaWNlciBzdHJpbmdcclxuICAgIHZhciBmb3JtYXR0ZWRUaW1lID0gXCJcIlxyXG4gICAgaWYodGltZSA8IDApIHtcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSAnLSdcclxuICAgICAgdGltZSAqPSAtMVxyXG4gICAgfVxyXG4gICAgaWYodGltZSA+PSAzMTUzNjAwMCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUvMzE1MzYwMDApICtcInlcIlxyXG4gICAgICB0aW1lID0gdGltZSAlIDMxNTM2MDAwXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID49IDg2NDAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS84NjQwMCkgK1wiZFwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgODY0MDBcclxuICAgIH1cclxuICAgIGlmKHRpbWUgPj0gMzYwMCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUvMzYwMCkgK1wiaFwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgMzYwMFxyXG4gICAgfVxyXG4gICAgaWYodGltZSA+PSA2MCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUvNjApICtcIm1cIlxyXG4gICAgICB0aW1lID0gdGltZSAlIDYwXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID4gMCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUpICtcInNcIlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZvcm1hdHRlZFRpbWVcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gb3JiaXQiLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICBjdXJyZW50OjQyLFxyXG4gIGVwb2NoOjAsXHJcblxyXG4gIHRpbWVJblNlY29uZHM6IGZ1bmN0aW9uKHN0cmluZykgeyAvLyBjb252ZXJ0IGEgc3RyaW5nIGxpa2UgXCI3ZDEyaFwiIHRvIGEgbnVtYmVyIG9mIHNlY29uZHNcclxuICAgIHZhciBtYXRjaCA9IC9eKD86KFxcZCspZCk/KD86KFxcZCspaCk/KD86KFxcZCspbSk/JC8uZXhlYyhzdHJpbmcpXHJcbiAgICB2YXIgcmVzID0gMDtcclxuICAgIGlmKG1hdGNoWzFdKSB7IHJlcyArPSAoK21hdGNoWzFdICogMjQgKiAzNjAwKSB9XHJcbiAgICBpZihtYXRjaFsyXSkgeyByZXMgKz0gKCttYXRjaFsyXSAqIDM2MDApIH1cclxuICAgIGlmKG1hdGNoWzNdKSB7IHJlcyArPSAoK21hdGNoWzNdICogNjApIH1cclxuICAgIHJldHVybiByZXNcclxuICB9LCBcclxuXHJcbiAgZ2V0UmVtYWluaW5nVGltZTogZnVuY3Rpb24odGltZSkgeyAvLyByZXR1cm5zIHRoZSBudW1iZXIgb2Ygc2Vjb25kcyB1bnRpbCB0aGUgc3BlY2lmaWVkIHRpbWVzdGFtcCAoaW4gc2Vjb25kcylcclxuICAgIHJldHVybiB0aGlzLnRpbWVUb1N0cmluZyggdGltZSAtIGdhbWUuY3VycmVudFRpbWUgKTtcclxuICB9LFxyXG4gIFxyXG4gIHRpbWVUb1N0cmluZzogZnVuY3Rpb24odGltZSkgeyAvLyBjb252ZXJ0cyBhIHRpbWUgaW4gc2Vjb25kcyB0byBhIG5pY2VyIHN0cmluZ1xyXG4gICAgdmFyIGZvcm1hdHRlZFRpbWUgPSBcIlwiXHJcbiAgICBpZih0aW1lIDwgMCkge1xyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9ICctJ1xyXG4gICAgICB0aW1lICo9IC0xXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID49IDMxNTM2MDAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS8zMTUzNjAwMCkgK1wieVwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgMzE1MzYwMDBcclxuICAgIH1cclxuICAgIGlmKHRpbWUgPj0gODY0MDApIHsgXHJcbiAgICAgIGZvcm1hdHRlZFRpbWUgKz0gTWF0aC5mbG9vcih0aW1lLzg2NDAwKSArXCJkXCJcclxuICAgICAgdGltZSA9IHRpbWUgJSA4NjQwMFxyXG4gICAgfVxyXG4gICAgaWYodGltZSA+PSAzNjAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS8zNjAwKSArXCJoXCJcclxuICAgICAgdGltZSA9IHRpbWUgJSAzNjAwXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID49IDYwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS82MCkgK1wibVwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgNjBcclxuICAgIH1cclxuICAgIGlmKHRpbWUgPiAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZSkgK1wic1wiXHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm9ybWF0dGVkVGltZVxyXG4gIH1cclxufSJdfQ==
