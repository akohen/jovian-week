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
const time = require('./time.js')

const orbit = {

  // tools to compute orbit and transfer parameters
  getGravitationalParameter: function(body) { return 6.67408e-11 * body.mass },


  //get orbital period in s, sma in m, mass in kg
  getPeriod: function(body) { 
    return 2 * Math.PI * Math.sqrt( Math.pow(body.sma,3) / this.getGravitationalParameter(body.parent) );
  },


  getVelocity: function(body) { 
    return Math.sqrt(this.getGravitationalParameter(body.parent)/body.sma) 
  },
  

  // Returns the current angle in degrees between periapsis and the body's position
  getMeanAnomaly: function(body, t=time.current) {
    // Mean motion
    let n = Math.sqrt( this.getGravitationalParameter(body.parent) / Math.pow(body.sma,3) )

    let M = (body.anomalyAtEpoch + n * (t - body.epoch))%(2*Math.PI)
/*
    let timeSinceEpoch = body.epoch - time
    let period = this.getPeriod(body)
    let timeInLastOrbit = timeSinceEpoch % period
    let angleInLastOrbit = timeInLastOrbit / period * 360
    let currentAnomaly = (body.anomalyAtEpoch + angleInLastOrbit) % 360*/
    return M
  },


  // returns the eccentric anomly in gradians
  getEccentricAnomaly: function(body, t=time.current) {
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
},{"./time.js":19}],19:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGV4aWUvZGlzdC9kZXhpZS5qcyIsInNyYy9jb21tYW5kcy9hZGQuanMiLCJzcmMvY29tbWFuZHMvY291bnQuanMiLCJzcmMvY29tbWFuZHMvZWNoby5qcyIsInNyYy9jb21tYW5kcy9maW5kV2luZG93LmpzIiwic3JjL2NvbW1hbmRzL2ZvcmJpZGRlbi5qcyIsInNyYy9jb21tYW5kcy9oZWxwLmpzIiwic3JjL2NvbW1hbmRzL2luZGV4LmpzIiwic3JjL2NvbW1hbmRzL2xvZy5qcyIsInNyYy9jb21tYW5kcy9zdGF0dXMuanMiLCJzcmMvZGF0YS5qcyIsInNyYy9kYi5qcyIsInNyYy9nYW1lLmpzIiwic3JjL2xvY2F0aW9uLmpzIiwic3JjL3BsYXllci5qcyIsInNyYy9zeXN0ZW0uanMiLCJzcmMvdGVybWluYWwuanMiLCJzcmMvdXRpbHMvb3JiaXQuanMiLCJzcmMvdXRpbHMvdGltZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1L0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChnbG9iYWwsIGZhY3RvcnkpIHtcbiAgIHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyA/IG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpIDpcbiAgIHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCA/IGRlZmluZShmYWN0b3J5KSA6XG4gICAoZ2xvYmFsLkRleGllID0gZmFjdG9yeSgpKTtcbn0odGhpcywgKGZ1bmN0aW9uICgpIHsgJ3VzZSBzdHJpY3QnO1xuXG4vKlxyXG4qIERleGllLmpzIC0gYSBtaW5pbWFsaXN0aWMgd3JhcHBlciBmb3IgSW5kZXhlZERCXHJcbiogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuKlxyXG4qIEJ5IERhdmlkIEZhaGxhbmRlciwgZGF2aWQuZmFobGFuZGVyQGdtYWlsLmNvbVxyXG4qXHJcbiogVmVyc2lvbiAxLjUuMSwgVHVlIE5vdiAwMSAyMDE2XHJcbiogd3d3LmRleGllLmNvbVxyXG4qIEFwYWNoZSBMaWNlbnNlIFZlcnNpb24gMi4wLCBKYW51YXJ5IDIwMDQsIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9cclxuKi9cbnZhciBrZXlzID0gT2JqZWN0LmtleXM7XG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXk7XG52YXIgX2dsb2JhbCA9IHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IGdsb2JhbDtcblxuZnVuY3Rpb24gZXh0ZW5kKG9iaiwgZXh0ZW5zaW9uKSB7XG4gICAgaWYgKHR5cGVvZiBleHRlbnNpb24gIT09ICdvYmplY3QnKSByZXR1cm4gb2JqO1xuICAgIGtleXMoZXh0ZW5zaW9uKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgb2JqW2tleV0gPSBleHRlbnNpb25ba2V5XTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xufVxuXG52YXIgZ2V0UHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG52YXIgX2hhc093biA9IHt9Lmhhc093blByb3BlcnR5O1xuZnVuY3Rpb24gaGFzT3duKG9iaiwgcHJvcCkge1xuICAgIHJldHVybiBfaGFzT3duLmNhbGwob2JqLCBwcm9wKTtcbn1cblxuZnVuY3Rpb24gcHJvcHMocHJvdG8sIGV4dGVuc2lvbikge1xuICAgIGlmICh0eXBlb2YgZXh0ZW5zaW9uID09PSAnZnVuY3Rpb24nKSBleHRlbnNpb24gPSBleHRlbnNpb24oZ2V0UHJvdG8ocHJvdG8pKTtcbiAgICBrZXlzKGV4dGVuc2lvbikuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIHNldFByb3AocHJvdG8sIGtleSwgZXh0ZW5zaW9uW2tleV0pO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wKG9iaiwgcHJvcCwgZnVuY3Rpb25PckdldFNldCwgb3B0aW9ucykge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIHByb3AsIGV4dGVuZChmdW5jdGlvbk9yR2V0U2V0ICYmIGhhc093bihmdW5jdGlvbk9yR2V0U2V0LCBcImdldFwiKSAmJiB0eXBlb2YgZnVuY3Rpb25PckdldFNldC5nZXQgPT09ICdmdW5jdGlvbicgPyB7IGdldDogZnVuY3Rpb25PckdldFNldC5nZXQsIHNldDogZnVuY3Rpb25PckdldFNldC5zZXQsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9IDogeyB2YWx1ZTogZnVuY3Rpb25PckdldFNldCwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9LCBvcHRpb25zKSk7XG59XG5cbmZ1bmN0aW9uIGRlcml2ZShDaGlsZCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGZyb206IGZ1bmN0aW9uIChQYXJlbnQpIHtcbiAgICAgICAgICAgIENoaWxkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUGFyZW50LnByb3RvdHlwZSk7XG4gICAgICAgICAgICBzZXRQcm9wKENoaWxkLnByb3RvdHlwZSwgXCJjb25zdHJ1Y3RvclwiLCBDaGlsZCk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGV4dGVuZDogcHJvcHMuYmluZChudWxsLCBDaGlsZC5wcm90b3R5cGUpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfTtcbn1cblxudmFyIGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG5cbmZ1bmN0aW9uIGdldFByb3BlcnR5RGVzY3JpcHRvcihvYmosIHByb3ApIHtcbiAgICB2YXIgcGQgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqLCBwcm9wKSxcbiAgICAgICAgcHJvdG87XG4gICAgcmV0dXJuIHBkIHx8IChwcm90byA9IGdldFByb3RvKG9iaikpICYmIGdldFByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgcHJvcCk7XG59XG5cbnZhciBfc2xpY2UgPSBbXS5zbGljZTtcbmZ1bmN0aW9uIHNsaWNlKGFyZ3MsIHN0YXJ0LCBlbmQpIHtcbiAgICByZXR1cm4gX3NsaWNlLmNhbGwoYXJncywgc3RhcnQsIGVuZCk7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlKG9yaWdGdW5jLCBvdmVycmlkZWRGYWN0b3J5KSB7XG4gICAgcmV0dXJuIG92ZXJyaWRlZEZhY3Rvcnkob3JpZ0Z1bmMpO1xufVxuXG5mdW5jdGlvbiBkb0Zha2VBdXRvQ29tcGxldGUoZm4pIHtcbiAgICB2YXIgdG8gPSBzZXRUaW1lb3V0KGZuLCAxMDAwKTtcbiAgICBjbGVhclRpbWVvdXQodG8pO1xufVxuXG5mdW5jdGlvbiBhc3NlcnQoYikge1xuICAgIGlmICghYikgdGhyb3cgbmV3IEVycm9yKFwiQXNzZXJ0aW9uIEZhaWxlZFwiKTtcbn1cblxuZnVuY3Rpb24gYXNhcChmbikge1xuICAgIGlmIChfZ2xvYmFsLnNldEltbWVkaWF0ZSkgc2V0SW1tZWRpYXRlKGZuKTtlbHNlIHNldFRpbWVvdXQoZm4sIDApO1xufVxuXG5cblxuLyoqIEdlbmVyYXRlIGFuIG9iamVjdCAoaGFzaCBtYXApIGJhc2VkIG9uIGdpdmVuIGFycmF5LlxyXG4gKiBAcGFyYW0gZXh0cmFjdG9yIEZ1bmN0aW9uIHRha2luZyBhbiBhcnJheSBpdGVtIGFuZCBpdHMgaW5kZXggYW5kIHJldHVybmluZyBhbiBhcnJheSBvZiAyIGl0ZW1zIChba2V5LCB2YWx1ZV0pIHRvXHJcbiAqICAgICAgICBpbnN0ZXJ0IG9uIHRoZSByZXN1bHRpbmcgb2JqZWN0IGZvciBlYWNoIGl0ZW0gaW4gdGhlIGFycmF5LiBJZiB0aGlzIGZ1bmN0aW9uIHJldHVybnMgYSBmYWxzeSB2YWx1ZSwgdGhlXHJcbiAqICAgICAgICBjdXJyZW50IGl0ZW0gd29udCBhZmZlY3QgdGhlIHJlc3VsdGluZyBvYmplY3QuXHJcbiAqL1xuZnVuY3Rpb24gYXJyYXlUb09iamVjdChhcnJheSwgZXh0cmFjdG9yKSB7XG4gICAgcmV0dXJuIGFycmF5LnJlZHVjZShmdW5jdGlvbiAocmVzdWx0LCBpdGVtLCBpKSB7XG4gICAgICAgIHZhciBuYW1lQW5kVmFsdWUgPSBleHRyYWN0b3IoaXRlbSwgaSk7XG4gICAgICAgIGlmIChuYW1lQW5kVmFsdWUpIHJlc3VsdFtuYW1lQW5kVmFsdWVbMF1dID0gbmFtZUFuZFZhbHVlWzFdO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sIHt9KTtcbn1cblxuZnVuY3Rpb24gdHJ5Y2F0Y2hlcihmbiwgcmVqZWN0KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgfVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIHRyeUNhdGNoKGZuLCBvbmVycm9yLCBhcmdzKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgb25lcnJvciAmJiBvbmVycm9yKGV4KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldEJ5S2V5UGF0aChvYmosIGtleVBhdGgpIHtcbiAgICAvLyBodHRwOi8vd3d3LnczLm9yZy9UUi9JbmRleGVkREIvI3N0ZXBzLWZvci1leHRyYWN0aW5nLWEta2V5LWZyb20tYS12YWx1ZS11c2luZy1hLWtleS1wYXRoXG4gICAgaWYgKGhhc093bihvYmosIGtleVBhdGgpKSByZXR1cm4gb2JqW2tleVBhdGhdOyAvLyBUaGlzIGxpbmUgaXMgbW92ZWQgZnJvbSBsYXN0IHRvIGZpcnN0IGZvciBvcHRpbWl6YXRpb24gcHVycG9zZS5cbiAgICBpZiAoIWtleVBhdGgpIHJldHVybiBvYmo7XG4gICAgaWYgKHR5cGVvZiBrZXlQYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgICB2YXIgcnYgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlQYXRoLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgdmFyIHZhbCA9IGdldEJ5S2V5UGF0aChvYmosIGtleVBhdGhbaV0pO1xuICAgICAgICAgICAgcnYucHVzaCh2YWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBydjtcbiAgICB9XG4gICAgdmFyIHBlcmlvZCA9IGtleVBhdGguaW5kZXhPZignLicpO1xuICAgIGlmIChwZXJpb2QgIT09IC0xKSB7XG4gICAgICAgIHZhciBpbm5lck9iaiA9IG9ialtrZXlQYXRoLnN1YnN0cigwLCBwZXJpb2QpXTtcbiAgICAgICAgcmV0dXJuIGlubmVyT2JqID09PSB1bmRlZmluZWQgPyB1bmRlZmluZWQgOiBnZXRCeUtleVBhdGgoaW5uZXJPYmosIGtleVBhdGguc3Vic3RyKHBlcmlvZCArIDEpKTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuZnVuY3Rpb24gc2V0QnlLZXlQYXRoKG9iaiwga2V5UGF0aCwgdmFsdWUpIHtcbiAgICBpZiAoIW9iaiB8fCBrZXlQYXRoID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBpZiAoJ2lzRnJvemVuJyBpbiBPYmplY3QgJiYgT2JqZWN0LmlzRnJvemVuKG9iaikpIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGtleVBhdGggIT09ICdzdHJpbmcnICYmICdsZW5ndGgnIGluIGtleVBhdGgpIHtcbiAgICAgICAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSAhPT0gJ3N0cmluZycgJiYgJ2xlbmd0aCcgaW4gdmFsdWUpO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGtleVBhdGgubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBzZXRCeUtleVBhdGgob2JqLCBrZXlQYXRoW2ldLCB2YWx1ZVtpXSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgcGVyaW9kID0ga2V5UGF0aC5pbmRleE9mKCcuJyk7XG4gICAgICAgIGlmIChwZXJpb2QgIT09IC0xKSB7XG4gICAgICAgICAgICB2YXIgY3VycmVudEtleVBhdGggPSBrZXlQYXRoLnN1YnN0cigwLCBwZXJpb2QpO1xuICAgICAgICAgICAgdmFyIHJlbWFpbmluZ0tleVBhdGggPSBrZXlQYXRoLnN1YnN0cihwZXJpb2QgKyAxKTtcbiAgICAgICAgICAgIGlmIChyZW1haW5pbmdLZXlQYXRoID09PSBcIlwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIGRlbGV0ZSBvYmpbY3VycmVudEtleVBhdGhdO2Vsc2Ugb2JqW2N1cnJlbnRLZXlQYXRoXSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5uZXJPYmogPSBvYmpbY3VycmVudEtleVBhdGhdO1xuICAgICAgICAgICAgICAgIGlmICghaW5uZXJPYmopIGlubmVyT2JqID0gb2JqW2N1cnJlbnRLZXlQYXRoXSA9IHt9O1xuICAgICAgICAgICAgICAgIHNldEJ5S2V5UGF0aChpbm5lck9iaiwgcmVtYWluaW5nS2V5UGF0aCwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQpIGRlbGV0ZSBvYmpba2V5UGF0aF07ZWxzZSBvYmpba2V5UGF0aF0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZGVsQnlLZXlQYXRoKG9iaiwga2V5UGF0aCkge1xuICAgIGlmICh0eXBlb2Yga2V5UGF0aCA9PT0gJ3N0cmluZycpIHNldEJ5S2V5UGF0aChvYmosIGtleVBhdGgsIHVuZGVmaW5lZCk7ZWxzZSBpZiAoJ2xlbmd0aCcgaW4ga2V5UGF0aCkgW10ubWFwLmNhbGwoa2V5UGF0aCwgZnVuY3Rpb24gKGtwKSB7XG4gICAgICAgIHNldEJ5S2V5UGF0aChvYmosIGtwLCB1bmRlZmluZWQpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBzaGFsbG93Q2xvbmUob2JqKSB7XG4gICAgdmFyIHJ2ID0ge307XG4gICAgZm9yICh2YXIgbSBpbiBvYmopIHtcbiAgICAgICAgaWYgKGhhc093bihvYmosIG0pKSBydlttXSA9IG9ialttXTtcbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xufVxuXG5mdW5jdGlvbiBkZWVwQ2xvbmUoYW55KSB7XG4gICAgaWYgKCFhbnkgfHwgdHlwZW9mIGFueSAhPT0gJ29iamVjdCcpIHJldHVybiBhbnk7XG4gICAgdmFyIHJ2O1xuICAgIGlmIChpc0FycmF5KGFueSkpIHtcbiAgICAgICAgcnYgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGwgPSBhbnkubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICBydi5wdXNoKGRlZXBDbG9uZShhbnlbaV0pKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoYW55IGluc3RhbmNlb2YgRGF0ZSkge1xuICAgICAgICBydiA9IG5ldyBEYXRlKCk7XG4gICAgICAgIHJ2LnNldFRpbWUoYW55LmdldFRpbWUoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcnYgPSBhbnkuY29uc3RydWN0b3IgPyBPYmplY3QuY3JlYXRlKGFueS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpIDoge307XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gYW55KSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duKGFueSwgcHJvcCkpIHtcbiAgICAgICAgICAgICAgICBydltwcm9wXSA9IGRlZXBDbG9uZShhbnlbcHJvcF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydjtcbn1cblxuZnVuY3Rpb24gZ2V0T2JqZWN0RGlmZihhLCBiLCBydiwgcHJmeCkge1xuICAgIC8vIENvbXBhcmVzIG9iamVjdHMgYSBhbmQgYiBhbmQgcHJvZHVjZXMgYSBkaWZmIG9iamVjdC5cbiAgICBydiA9IHJ2IHx8IHt9O1xuICAgIHByZnggPSBwcmZ4IHx8ICcnO1xuICAgIGtleXMoYSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICBpZiAoIWhhc093bihiLCBwcm9wKSkgcnZbcHJmeCArIHByb3BdID0gdW5kZWZpbmVkOyAvLyBQcm9wZXJ0eSByZW1vdmVkXG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBhcCA9IGFbcHJvcF0sXG4gICAgICAgICAgICAgICAgICAgIGJwID0gYltwcm9wXTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFwID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgYnAgPT09ICdvYmplY3QnICYmIGFwICYmIGJwICYmIGFwLmNvbnN0cnVjdG9yID09PSBicC5jb25zdHJ1Y3RvcilcbiAgICAgICAgICAgICAgICAgICAgLy8gU2FtZSB0eXBlIG9mIG9iamVjdCBidXQgaXRzIHByb3BlcnRpZXMgbWF5IGhhdmUgY2hhbmdlZFxuICAgICAgICAgICAgICAgICAgICBnZXRPYmplY3REaWZmKGFwLCBicCwgcnYsIHByZnggKyBwcm9wICsgXCIuXCIpO2Vsc2UgaWYgKGFwICE9PSBicCkgcnZbcHJmeCArIHByb3BdID0gYltwcm9wXTsgLy8gUHJpbWl0aXZlIHZhbHVlIGNoYW5nZWRcbiAgICAgICAgICAgIH1cbiAgICB9KTtcbiAgICBrZXlzKGIpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgaWYgKCFoYXNPd24oYSwgcHJvcCkpIHtcbiAgICAgICAgICAgIHJ2W3ByZnggKyBwcm9wXSA9IGJbcHJvcF07IC8vIFByb3BlcnR5IGFkZGVkXG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcnY7XG59XG5cbi8vIElmIGZpcnN0IGFyZ3VtZW50IGlzIGl0ZXJhYmxlIG9yIGFycmF5LWxpa2UsIHJldHVybiBpdCBhcyBhbiBhcnJheVxudmFyIGl0ZXJhdG9yU3ltYm9sID0gdHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLml0ZXJhdG9yO1xudmFyIGdldEl0ZXJhdG9yT2YgPSBpdGVyYXRvclN5bWJvbCA/IGZ1bmN0aW9uICh4KSB7XG4gICAgdmFyIGk7XG4gICAgcmV0dXJuIHggIT0gbnVsbCAmJiAoaSA9IHhbaXRlcmF0b3JTeW1ib2xdKSAmJiBpLmFwcGx5KHgpO1xufSA6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gbnVsbDtcbn07XG5cbnZhciBOT19DSEFSX0FSUkFZID0ge307XG4vLyBUYWtlcyBvbmUgb3Igc2V2ZXJhbCBhcmd1bWVudHMgYW5kIHJldHVybnMgYW4gYXJyYXkgYmFzZWQgb24gdGhlIGZvbGxvd2luZyBjcml0ZXJhczpcbi8vICogSWYgc2V2ZXJhbCBhcmd1bWVudHMgcHJvdmlkZWQsIHJldHVybiBhcmd1bWVudHMgY29udmVydGVkIHRvIGFuIGFycmF5IGluIGEgd2F5IHRoYXRcbi8vICAgc3RpbGwgYWxsb3dzIGphdmFzY3JpcHQgZW5naW5lIHRvIG9wdGltaXplIHRoZSBjb2RlLlxuLy8gKiBJZiBzaW5nbGUgYXJndW1lbnQgaXMgYW4gYXJyYXksIHJldHVybiBhIGNsb25lIG9mIGl0LlxuLy8gKiBJZiB0aGlzLXBvaW50ZXIgZXF1YWxzIE5PX0NIQVJfQVJSQVksIGRvbid0IGFjY2VwdCBzdHJpbmdzIGFzIHZhbGlkIGl0ZXJhYmxlcyBhcyBhIHNwZWNpYWxcbi8vICAgY2FzZSB0byB0aGUgdHdvIGJ1bGxldHMgYmVsb3cuXG4vLyAqIElmIHNpbmdsZSBhcmd1bWVudCBpcyBhbiBpdGVyYWJsZSwgY29udmVydCBpdCB0byBhbiBhcnJheSBhbmQgcmV0dXJuIHRoZSByZXN1bHRpbmcgYXJyYXkuXG4vLyAqIElmIHNpbmdsZSBhcmd1bWVudCBpcyBhcnJheS1saWtlIChoYXMgbGVuZ3RoIG9mIHR5cGUgbnVtYmVyKSwgY29udmVydCBpdCB0byBhbiBhcnJheS5cbmZ1bmN0aW9uIGdldEFycmF5T2YoYXJyYXlMaWtlKSB7XG4gICAgdmFyIGksIGEsIHgsIGl0O1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIGlmIChpc0FycmF5KGFycmF5TGlrZSkpIHJldHVybiBhcnJheUxpa2Uuc2xpY2UoKTtcbiAgICAgICAgaWYgKHRoaXMgPT09IE5PX0NIQVJfQVJSQVkgJiYgdHlwZW9mIGFycmF5TGlrZSA9PT0gJ3N0cmluZycpIHJldHVybiBbYXJyYXlMaWtlXTtcbiAgICAgICAgaWYgKGl0ID0gZ2V0SXRlcmF0b3JPZihhcnJheUxpa2UpKSB7XG4gICAgICAgICAgICBhID0gW107XG4gICAgICAgICAgICB3aGlsZSAoeCA9IGl0Lm5leHQoKSwgIXguZG9uZSkge1xuICAgICAgICAgICAgICAgIGEucHVzaCh4LnZhbHVlKTtcbiAgICAgICAgICAgIH1yZXR1cm4gYTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJyYXlMaWtlID09IG51bGwpIHJldHVybiBbYXJyYXlMaWtlXTtcbiAgICAgICAgaSA9IGFycmF5TGlrZS5sZW5ndGg7XG4gICAgICAgIGlmICh0eXBlb2YgaSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGEgPSBuZXcgQXJyYXkoaSk7XG4gICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgYVtpXSA9IGFycmF5TGlrZVtpXTtcbiAgICAgICAgICAgIH1yZXR1cm4gYTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gW2FycmF5TGlrZV07XG4gICAgfVxuICAgIGkgPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGEgPSBuZXcgQXJyYXkoaSk7XG4gICAgd2hpbGUgKGktLSkge1xuICAgICAgICBhW2ldID0gYXJndW1lbnRzW2ldO1xuICAgIH1yZXR1cm4gYTtcbn1cblxudmFyIGNvbmNhdCA9IFtdLmNvbmNhdDtcbmZ1bmN0aW9uIGZsYXR0ZW4oYSkge1xuICAgIHJldHVybiBjb25jYXQuYXBwbHkoW10sIGEpO1xufVxuXG5mdW5jdGlvbiBub3AoKSB7fVxuZnVuY3Rpb24gbWlycm9yKHZhbCkge1xuICAgIHJldHVybiB2YWw7XG59XG5mdW5jdGlvbiBwdXJlRnVuY3Rpb25DaGFpbihmMSwgZjIpIHtcbiAgICAvLyBFbmFibGVzIGNoYWluZWQgZXZlbnRzIHRoYXQgdGFrZXMgT05FIGFyZ3VtZW50IGFuZCByZXR1cm5zIGl0IHRvIHRoZSBuZXh0IGZ1bmN0aW9uIGluIGNoYWluLlxuICAgIC8vIFRoaXMgcGF0dGVybiBpcyB1c2VkIGluIHRoZSBob29rKFwicmVhZGluZ1wiKSBldmVudC5cbiAgICBpZiAoZjEgPT0gbnVsbCB8fCBmMSA9PT0gbWlycm9yKSByZXR1cm4gZjI7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgcmV0dXJuIGYyKGYxKHZhbCkpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNhbGxCb3RoKG9uMSwgb24yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb24xLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIG9uMi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGhvb2tDcmVhdGluZ0NoYWluKGYxLCBmMikge1xuICAgIC8vIEVuYWJsZXMgY2hhaW5lZCBldmVudHMgdGhhdCB0YWtlcyBzZXZlcmFsIGFyZ3VtZW50cyBhbmQgbWF5IG1vZGlmeSBmaXJzdCBhcmd1bWVudCBieSBtYWtpbmcgYSBtb2RpZmljYXRpb24gYW5kIHRoZW4gcmV0dXJuaW5nIHRoZSBzYW1lIGluc3RhbmNlLlxuICAgIC8vIFRoaXMgcGF0dGVybiBpcyB1c2VkIGluIHRoZSBob29rKFwiY3JlYXRpbmdcIikgZXZlbnQuXG4gICAgaWYgKGYxID09PSBub3ApIHJldHVybiBmMjtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmVzID0gZjEuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKHJlcyAhPT0gdW5kZWZpbmVkKSBhcmd1bWVudHNbMF0gPSByZXM7XG4gICAgICAgIHZhciBvbnN1Y2Nlc3MgPSB0aGlzLm9uc3VjY2VzcyxcbiAgICAgICAgICAgIC8vIEluIGNhc2UgZXZlbnQgbGlzdGVuZXIgaGFzIHNldCB0aGlzLm9uc3VjY2Vzc1xuICAgICAgICBvbmVycm9yID0gdGhpcy5vbmVycm9yOyAvLyBJbiBjYXNlIGV2ZW50IGxpc3RlbmVyIGhhcyBzZXQgdGhpcy5vbmVycm9yXG4gICAgICAgIHRoaXMub25zdWNjZXNzID0gbnVsbDtcbiAgICAgICAgdGhpcy5vbmVycm9yID0gbnVsbDtcbiAgICAgICAgdmFyIHJlczIgPSBmMi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBpZiAob25zdWNjZXNzKSB0aGlzLm9uc3VjY2VzcyA9IHRoaXMub25zdWNjZXNzID8gY2FsbEJvdGgob25zdWNjZXNzLCB0aGlzLm9uc3VjY2VzcykgOiBvbnN1Y2Nlc3M7XG4gICAgICAgIGlmIChvbmVycm9yKSB0aGlzLm9uZXJyb3IgPSB0aGlzLm9uZXJyb3IgPyBjYWxsQm90aChvbmVycm9yLCB0aGlzLm9uZXJyb3IpIDogb25lcnJvcjtcbiAgICAgICAgcmV0dXJuIHJlczIgIT09IHVuZGVmaW5lZCA/IHJlczIgOiByZXM7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gaG9va0RlbGV0aW5nQ2hhaW4oZjEsIGYyKSB7XG4gICAgaWYgKGYxID09PSBub3ApIHJldHVybiBmMjtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBmMS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB2YXIgb25zdWNjZXNzID0gdGhpcy5vbnN1Y2Nlc3MsXG4gICAgICAgICAgICAvLyBJbiBjYXNlIGV2ZW50IGxpc3RlbmVyIGhhcyBzZXQgdGhpcy5vbnN1Y2Nlc3NcbiAgICAgICAgb25lcnJvciA9IHRoaXMub25lcnJvcjsgLy8gSW4gY2FzZSBldmVudCBsaXN0ZW5lciBoYXMgc2V0IHRoaXMub25lcnJvclxuICAgICAgICB0aGlzLm9uc3VjY2VzcyA9IHRoaXMub25lcnJvciA9IG51bGw7XG4gICAgICAgIGYyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChvbnN1Y2Nlc3MpIHRoaXMub25zdWNjZXNzID0gdGhpcy5vbnN1Y2Nlc3MgPyBjYWxsQm90aChvbnN1Y2Nlc3MsIHRoaXMub25zdWNjZXNzKSA6IG9uc3VjY2VzcztcbiAgICAgICAgaWYgKG9uZXJyb3IpIHRoaXMub25lcnJvciA9IHRoaXMub25lcnJvciA/IGNhbGxCb3RoKG9uZXJyb3IsIHRoaXMub25lcnJvcikgOiBvbmVycm9yO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGhvb2tVcGRhdGluZ0NoYWluKGYxLCBmMikge1xuICAgIGlmIChmMSA9PT0gbm9wKSByZXR1cm4gZjI7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChtb2RpZmljYXRpb25zKSB7XG4gICAgICAgIHZhciByZXMgPSBmMS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBleHRlbmQobW9kaWZpY2F0aW9ucywgcmVzKTsgLy8gSWYgZjEgcmV0dXJucyBuZXcgbW9kaWZpY2F0aW9ucywgZXh0ZW5kIGNhbGxlcidzIG1vZGlmaWNhdGlvbnMgd2l0aCB0aGUgcmVzdWx0IGJlZm9yZSBjYWxsaW5nIG5leHQgaW4gY2hhaW4uXG4gICAgICAgIHZhciBvbnN1Y2Nlc3MgPSB0aGlzLm9uc3VjY2VzcyxcbiAgICAgICAgICAgIC8vIEluIGNhc2UgZXZlbnQgbGlzdGVuZXIgaGFzIHNldCB0aGlzLm9uc3VjY2Vzc1xuICAgICAgICBvbmVycm9yID0gdGhpcy5vbmVycm9yOyAvLyBJbiBjYXNlIGV2ZW50IGxpc3RlbmVyIGhhcyBzZXQgdGhpcy5vbmVycm9yXG4gICAgICAgIHRoaXMub25zdWNjZXNzID0gbnVsbDtcbiAgICAgICAgdGhpcy5vbmVycm9yID0gbnVsbDtcbiAgICAgICAgdmFyIHJlczIgPSBmMi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICBpZiAob25zdWNjZXNzKSB0aGlzLm9uc3VjY2VzcyA9IHRoaXMub25zdWNjZXNzID8gY2FsbEJvdGgob25zdWNjZXNzLCB0aGlzLm9uc3VjY2VzcykgOiBvbnN1Y2Nlc3M7XG4gICAgICAgIGlmIChvbmVycm9yKSB0aGlzLm9uZXJyb3IgPSB0aGlzLm9uZXJyb3IgPyBjYWxsQm90aChvbmVycm9yLCB0aGlzLm9uZXJyb3IpIDogb25lcnJvcjtcbiAgICAgICAgcmV0dXJuIHJlcyA9PT0gdW5kZWZpbmVkID8gcmVzMiA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogcmVzMiA6IGV4dGVuZChyZXMsIHJlczIpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHJldmVyc2VTdG9wcGFibGVFdmVudENoYWluKGYxLCBmMikge1xuICAgIGlmIChmMSA9PT0gbm9wKSByZXR1cm4gZjI7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGYyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiBmMS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cblxuXG5mdW5jdGlvbiBwcm9taXNhYmxlQ2hhaW4oZjEsIGYyKSB7XG4gICAgaWYgKGYxID09PSBub3ApIHJldHVybiBmMjtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmVzID0gZjEuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKHJlcyAmJiB0eXBlb2YgcmVzLnRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHZhciB0aGl6ID0gdGhpcyxcbiAgICAgICAgICAgICAgICBpID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBhcmdzID0gbmV3IEFycmF5KGkpO1xuICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICB9cmV0dXJuIHJlcy50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZjIuYXBwbHkodGhpeiwgYXJncyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZjIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xufVxuXG4vLyBCeSBkZWZhdWx0LCBkZWJ1ZyB3aWxsIGJlIHRydWUgb25seSBpZiBwbGF0Zm9ybSBpcyBhIHdlYiBwbGF0Zm9ybSBhbmQgaXRzIHBhZ2UgaXMgc2VydmVkIGZyb20gbG9jYWxob3N0LlxuLy8gV2hlbiBkZWJ1ZyA9IHRydWUsIGVycm9yJ3Mgc3RhY2tzIHdpbGwgY29udGFpbiBhc3luY3JvbmljIGxvbmcgc3RhY2tzLlxudmFyIGRlYnVnID0gdHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJyAmJlxuLy8gQnkgZGVmYXVsdCwgdXNlIGRlYnVnIG1vZGUgaWYgc2VydmVkIGZyb20gbG9jYWxob3N0LlxuL14oaHR0cHxodHRwcyk6XFwvXFwvKGxvY2FsaG9zdHwxMjdcXC4wXFwuMFxcLjEpLy50ZXN0KGxvY2F0aW9uLmhyZWYpO1xuXG5mdW5jdGlvbiBzZXREZWJ1Zyh2YWx1ZSwgZmlsdGVyKSB7XG4gICAgZGVidWcgPSB2YWx1ZTtcbiAgICBsaWJyYXJ5RmlsdGVyID0gZmlsdGVyO1xufVxuXG52YXIgbGlicmFyeUZpbHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbnZhciBORUVEU19USFJPV19GT1JfU1RBQ0sgPSAhbmV3IEVycm9yKFwiXCIpLnN0YWNrO1xuXG5mdW5jdGlvbiBnZXRFcnJvcldpdGhTdGFjaygpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIGlmIChORUVEU19USFJPV19GT1JfU1RBQ0spIHRyeSB7XG4gICAgICAgIC8vIERvaW5nIHNvbWV0aGluZyBuYXVnaHR5IGluIHN0cmljdCBtb2RlIGhlcmUgdG8gdHJpZ2dlciBhIHNwZWNpZmljIGVycm9yXG4gICAgICAgIC8vIHRoYXQgY2FuIGJlIGV4cGxpY2l0ZWx5IGlnbm9yZWQgaW4gZGVidWdnZXIncyBleGNlcHRpb24gc2V0dGluZ3MuXG4gICAgICAgIC8vIElmIHdlJ2QganVzdCB0aHJvdyBuZXcgRXJyb3IoKSBoZXJlLCBJRSdzIGRlYnVnZ2VyJ3MgZXhjZXB0aW9uIHNldHRpbmdzXG4gICAgICAgIC8vIHdpbGwganVzdCBjb25zaWRlciBpdCBhcyBcImV4Y2VwdGlvbiB0aHJvd24gYnkgamF2YXNjcmlwdCBjb2RlXCIgd2hpY2ggaXNcbiAgICAgICAgLy8gc29tZXRoaW5nIHlvdSB3b3VsZG4ndCB3YW50IGl0IHRvIGlnbm9yZS5cbiAgICAgICAgZ2V0RXJyb3JXaXRoU3RhY2suYXJndW1lbnRzO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKTsgLy8gRmFsbGJhY2sgaWYgYWJvdmUgbGluZSBkb24ndCB0aHJvdy5cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBlO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IEVycm9yKCk7XG59XG5cbmZ1bmN0aW9uIHByZXR0eVN0YWNrKGV4Y2VwdGlvbiwgbnVtSWdub3JlZEZyYW1lcykge1xuICAgIHZhciBzdGFjayA9IGV4Y2VwdGlvbi5zdGFjaztcbiAgICBpZiAoIXN0YWNrKSByZXR1cm4gXCJcIjtcbiAgICBudW1JZ25vcmVkRnJhbWVzID0gbnVtSWdub3JlZEZyYW1lcyB8fCAwO1xuICAgIGlmIChzdGFjay5pbmRleE9mKGV4Y2VwdGlvbi5uYW1lKSA9PT0gMCkgbnVtSWdub3JlZEZyYW1lcyArPSAoZXhjZXB0aW9uLm5hbWUgKyBleGNlcHRpb24ubWVzc2FnZSkuc3BsaXQoJ1xcbicpLmxlbmd0aDtcbiAgICByZXR1cm4gc3RhY2suc3BsaXQoJ1xcbicpLnNsaWNlKG51bUlnbm9yZWRGcmFtZXMpLmZpbHRlcihsaWJyYXJ5RmlsdGVyKS5tYXAoZnVuY3Rpb24gKGZyYW1lKSB7XG4gICAgICAgIHJldHVybiBcIlxcblwiICsgZnJhbWU7XG4gICAgfSkuam9pbignJyk7XG59XG5cbmZ1bmN0aW9uIGRlcHJlY2F0ZWQod2hhdCwgZm4pIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLndhcm4od2hhdCArIFwiIGlzIGRlcHJlY2F0ZWQuIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZGZhaGxhbmRlci9EZXhpZS5qcy93aWtpL0RlcHJlY2F0aW9ucy4gXCIgKyBwcmV0dHlTdGFjayhnZXRFcnJvcldpdGhTdGFjaygpLCAxKSk7XG4gICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbnZhciBkZXhpZUVycm9yTmFtZXMgPSBbJ01vZGlmeScsICdCdWxrJywgJ09wZW5GYWlsZWQnLCAnVmVyc2lvbkNoYW5nZScsICdTY2hlbWEnLCAnVXBncmFkZScsICdJbnZhbGlkVGFibGUnLCAnTWlzc2luZ0FQSScsICdOb1N1Y2hEYXRhYmFzZScsICdJbnZhbGlkQXJndW1lbnQnLCAnU3ViVHJhbnNhY3Rpb24nLCAnVW5zdXBwb3J0ZWQnLCAnSW50ZXJuYWwnLCAnRGF0YWJhc2VDbG9zZWQnLCAnSW5jb21wYXRpYmxlUHJvbWlzZSddO1xuXG52YXIgaWRiRG9tRXJyb3JOYW1lcyA9IFsnVW5rbm93bicsICdDb25zdHJhaW50JywgJ0RhdGEnLCAnVHJhbnNhY3Rpb25JbmFjdGl2ZScsICdSZWFkT25seScsICdWZXJzaW9uJywgJ05vdEZvdW5kJywgJ0ludmFsaWRTdGF0ZScsICdJbnZhbGlkQWNjZXNzJywgJ0Fib3J0JywgJ1RpbWVvdXQnLCAnUXVvdGFFeGNlZWRlZCcsICdTeW50YXgnLCAnRGF0YUNsb25lJ107XG5cbnZhciBlcnJvckxpc3QgPSBkZXhpZUVycm9yTmFtZXMuY29uY2F0KGlkYkRvbUVycm9yTmFtZXMpO1xuXG52YXIgZGVmYXVsdFRleHRzID0ge1xuICAgIFZlcnNpb25DaGFuZ2VkOiBcIkRhdGFiYXNlIHZlcnNpb24gY2hhbmdlZCBieSBvdGhlciBkYXRhYmFzZSBjb25uZWN0aW9uXCIsXG4gICAgRGF0YWJhc2VDbG9zZWQ6IFwiRGF0YWJhc2UgaGFzIGJlZW4gY2xvc2VkXCIsXG4gICAgQWJvcnQ6IFwiVHJhbnNhY3Rpb24gYWJvcnRlZFwiLFxuICAgIFRyYW5zYWN0aW9uSW5hY3RpdmU6IFwiVHJhbnNhY3Rpb24gaGFzIGFscmVhZHkgY29tcGxldGVkIG9yIGZhaWxlZFwiXG59O1xuXG4vL1xuLy8gRGV4aWVFcnJvciAtIGJhc2UgY2xhc3Mgb2YgYWxsIG91dCBleGNlcHRpb25zLlxuLy9cbmZ1bmN0aW9uIERleGllRXJyb3IobmFtZSwgbXNnKSB7XG4gICAgLy8gUmVhc29uIHdlIGRvbid0IHVzZSBFUzYgY2xhc3NlcyBpcyBiZWNhdXNlOlxuICAgIC8vIDEuIEl0IGJsb2F0cyB0cmFuc3BpbGVkIGNvZGUgYW5kIGluY3JlYXNlcyBzaXplIG9mIG1pbmlmaWVkIGNvZGUuXG4gICAgLy8gMi4gSXQgZG9lc24ndCBnaXZlIHVzIG11Y2ggaW4gdGhpcyBjYXNlLlxuICAgIC8vIDMuIEl0IHdvdWxkIHJlcXVpcmUgc3ViIGNsYXNzZXMgdG8gY2FsbCBzdXBlcigpLCB3aGljaFxuICAgIC8vICAgIGlzIG5vdCBuZWVkZWQgd2hlbiBkZXJpdmluZyBmcm9tIEVycm9yLlxuICAgIHRoaXMuX2UgPSBnZXRFcnJvcldpdGhTdGFjaygpO1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy5tZXNzYWdlID0gbXNnO1xufVxuXG5kZXJpdmUoRGV4aWVFcnJvcikuZnJvbShFcnJvcikuZXh0ZW5kKHtcbiAgICBzdGFjazoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9zdGFjayB8fCAodGhpcy5fc3RhY2sgPSB0aGlzLm5hbWUgKyBcIjogXCIgKyB0aGlzLm1lc3NhZ2UgKyBwcmV0dHlTdGFjayh0aGlzLl9lLCAyKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHRvU3RyaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm5hbWUgKyBcIjogXCIgKyB0aGlzLm1lc3NhZ2U7XG4gICAgfVxufSk7XG5cbmZ1bmN0aW9uIGdldE11bHRpRXJyb3JNZXNzYWdlKG1zZywgZmFpbHVyZXMpIHtcbiAgICByZXR1cm4gbXNnICsgXCIuIEVycm9yczogXCIgKyBmYWlsdXJlcy5tYXAoZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgcmV0dXJuIGYudG9TdHJpbmcoKTtcbiAgICB9KS5maWx0ZXIoZnVuY3Rpb24gKHYsIGksIHMpIHtcbiAgICAgICAgcmV0dXJuIHMuaW5kZXhPZih2KSA9PT0gaTtcbiAgICB9KSAvLyBPbmx5IHVuaXF1ZSBlcnJvciBzdHJpbmdzXG4gICAgLmpvaW4oJ1xcbicpO1xufVxuXG4vL1xuLy8gTW9kaWZ5RXJyb3IgLSB0aHJvd24gaW4gV3JpdGVhYmxlQ29sbGVjdGlvbi5tb2RpZnkoKVxuLy8gU3BlY2lmaWMgY29uc3RydWN0b3IgYmVjYXVzZSBpdCBjb250YWlucyBtZW1iZXJzIGZhaWx1cmVzIGFuZCBmYWlsZWRLZXlzLlxuLy9cbmZ1bmN0aW9uIE1vZGlmeUVycm9yKG1zZywgZmFpbHVyZXMsIHN1Y2Nlc3NDb3VudCwgZmFpbGVkS2V5cykge1xuICAgIHRoaXMuX2UgPSBnZXRFcnJvcldpdGhTdGFjaygpO1xuICAgIHRoaXMuZmFpbHVyZXMgPSBmYWlsdXJlcztcbiAgICB0aGlzLmZhaWxlZEtleXMgPSBmYWlsZWRLZXlzO1xuICAgIHRoaXMuc3VjY2Vzc0NvdW50ID0gc3VjY2Vzc0NvdW50O1xufVxuZGVyaXZlKE1vZGlmeUVycm9yKS5mcm9tKERleGllRXJyb3IpO1xuXG5mdW5jdGlvbiBCdWxrRXJyb3IobXNnLCBmYWlsdXJlcykge1xuICAgIHRoaXMuX2UgPSBnZXRFcnJvcldpdGhTdGFjaygpO1xuICAgIHRoaXMubmFtZSA9IFwiQnVsa0Vycm9yXCI7XG4gICAgdGhpcy5mYWlsdXJlcyA9IGZhaWx1cmVzO1xuICAgIHRoaXMubWVzc2FnZSA9IGdldE11bHRpRXJyb3JNZXNzYWdlKG1zZywgZmFpbHVyZXMpO1xufVxuZGVyaXZlKEJ1bGtFcnJvcikuZnJvbShEZXhpZUVycm9yKTtcblxuLy9cbi8vXG4vLyBEeW5hbWljYWxseSBnZW5lcmF0ZSBlcnJvciBuYW1lcyBhbmQgZXhjZXB0aW9uIGNsYXNzZXMgYmFzZWRcbi8vIG9uIHRoZSBuYW1lcyBpbiBlcnJvckxpc3QuXG4vL1xuLy9cblxuLy8gTWFwIG9mIHtFcnJvck5hbWUgLT4gRXJyb3JOYW1lICsgXCJFcnJvclwifVxudmFyIGVycm5hbWVzID0gZXJyb3JMaXN0LnJlZHVjZShmdW5jdGlvbiAob2JqLCBuYW1lKSB7XG4gICAgcmV0dXJuIG9ialtuYW1lXSA9IG5hbWUgKyBcIkVycm9yXCIsIG9iajtcbn0sIHt9KTtcblxuLy8gTmVlZCBhbiBhbGlhcyBmb3IgRGV4aWVFcnJvciBiZWNhdXNlIHdlJ3JlIGdvbm5hIGNyZWF0ZSBzdWJjbGFzc2VzIHdpdGggdGhlIHNhbWUgbmFtZS5cbnZhciBCYXNlRXhjZXB0aW9uID0gRGV4aWVFcnJvcjtcbi8vIE1hcCBvZiB7RXJyb3JOYW1lIC0+IGV4Y2VwdGlvbiBjb25zdHJ1Y3Rvcn1cbnZhciBleGNlcHRpb25zID0gZXJyb3JMaXN0LnJlZHVjZShmdW5jdGlvbiAob2JqLCBuYW1lKSB7XG4gICAgLy8gTGV0IHRoZSBuYW1lIGJlIFwiRGV4aWVFcnJvclwiIGJlY2F1c2UgdGhpcyBuYW1lIG1heVxuICAgIC8vIGJlIHNob3duIGluIGNhbGwgc3RhY2sgYW5kIHdoZW4gZGVidWdnaW5nLiBEZXhpZUVycm9yIGlzXG4gICAgLy8gdGhlIG1vc3QgdHJ1ZSBuYW1lIGJlY2F1c2UgaXQgZGVyaXZlcyBmcm9tIERleGllRXJyb3IsXG4gICAgLy8gYW5kIHdlIGNhbm5vdCBjaGFuZ2UgRnVuY3Rpb24ubmFtZSBwcm9ncmFtYXRpY2FsbHkgd2l0aG91dFxuICAgIC8vIGR5bmFtaWNhbGx5IGNyZWF0ZSBhIEZ1bmN0aW9uIG9iamVjdCwgd2hpY2ggd291bGQgYmUgY29uc2lkZXJlZFxuICAgIC8vICdldmFsLWV2aWwnLlxuICAgIHZhciBmdWxsTmFtZSA9IG5hbWUgKyBcIkVycm9yXCI7XG4gICAgZnVuY3Rpb24gRGV4aWVFcnJvcihtc2dPcklubmVyLCBpbm5lcikge1xuICAgICAgICB0aGlzLl9lID0gZ2V0RXJyb3JXaXRoU3RhY2soKTtcbiAgICAgICAgdGhpcy5uYW1lID0gZnVsbE5hbWU7XG4gICAgICAgIGlmICghbXNnT3JJbm5lcikge1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlID0gZGVmYXVsdFRleHRzW25hbWVdIHx8IGZ1bGxOYW1lO1xuICAgICAgICAgICAgdGhpcy5pbm5lciA9IG51bGw7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG1zZ09ySW5uZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtc2dPcklubmVyO1xuICAgICAgICAgICAgdGhpcy5pbm5lciA9IGlubmVyIHx8IG51bGw7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIG1zZ09ySW5uZXIgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtc2dPcklubmVyLm5hbWUgKyAnICcgKyBtc2dPcklubmVyLm1lc3NhZ2U7XG4gICAgICAgICAgICB0aGlzLmlubmVyID0gbXNnT3JJbm5lcjtcbiAgICAgICAgfVxuICAgIH1cbiAgICBkZXJpdmUoRGV4aWVFcnJvcikuZnJvbShCYXNlRXhjZXB0aW9uKTtcbiAgICBvYmpbbmFtZV0gPSBEZXhpZUVycm9yO1xuICAgIHJldHVybiBvYmo7XG59LCB7fSk7XG5cbi8vIFVzZSBFQ01BU0NSSVBUIHN0YW5kYXJkIGV4Y2VwdGlvbnMgd2hlcmUgYXBwbGljYWJsZTpcbmV4Y2VwdGlvbnMuU3ludGF4ID0gU3ludGF4RXJyb3I7XG5leGNlcHRpb25zLlR5cGUgPSBUeXBlRXJyb3I7XG5leGNlcHRpb25zLlJhbmdlID0gUmFuZ2VFcnJvcjtcblxudmFyIGV4Y2VwdGlvbk1hcCA9IGlkYkRvbUVycm9yTmFtZXMucmVkdWNlKGZ1bmN0aW9uIChvYmosIG5hbWUpIHtcbiAgICBvYmpbbmFtZSArIFwiRXJyb3JcIl0gPSBleGNlcHRpb25zW25hbWVdO1xuICAgIHJldHVybiBvYmo7XG59LCB7fSk7XG5cbmZ1bmN0aW9uIG1hcEVycm9yKGRvbUVycm9yLCBtZXNzYWdlKSB7XG4gICAgaWYgKCFkb21FcnJvciB8fCBkb21FcnJvciBpbnN0YW5jZW9mIERleGllRXJyb3IgfHwgZG9tRXJyb3IgaW5zdGFuY2VvZiBUeXBlRXJyb3IgfHwgZG9tRXJyb3IgaW5zdGFuY2VvZiBTeW50YXhFcnJvciB8fCAhZG9tRXJyb3IubmFtZSB8fCAhZXhjZXB0aW9uTWFwW2RvbUVycm9yLm5hbWVdKSByZXR1cm4gZG9tRXJyb3I7XG4gICAgdmFyIHJ2ID0gbmV3IGV4Y2VwdGlvbk1hcFtkb21FcnJvci5uYW1lXShtZXNzYWdlIHx8IGRvbUVycm9yLm1lc3NhZ2UsIGRvbUVycm9yKTtcbiAgICBpZiAoXCJzdGFja1wiIGluIGRvbUVycm9yKSB7XG4gICAgICAgIC8vIERlcml2ZSBzdGFjayBmcm9tIGlubmVyIGV4Y2VwdGlvbiBpZiBpdCBoYXMgYSBzdGFja1xuICAgICAgICBzZXRQcm9wKHJ2LCBcInN0YWNrXCIsIHsgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5uZXIuc3RhY2s7XG4gICAgICAgICAgICB9IH0pO1xuICAgIH1cbiAgICByZXR1cm4gcnY7XG59XG5cbnZhciBmdWxsTmFtZUV4Y2VwdGlvbnMgPSBlcnJvckxpc3QucmVkdWNlKGZ1bmN0aW9uIChvYmosIG5hbWUpIHtcbiAgICBpZiAoW1wiU3ludGF4XCIsIFwiVHlwZVwiLCBcIlJhbmdlXCJdLmluZGV4T2YobmFtZSkgPT09IC0xKSBvYmpbbmFtZSArIFwiRXJyb3JcIl0gPSBleGNlcHRpb25zW25hbWVdO1xuICAgIHJldHVybiBvYmo7XG59LCB7fSk7XG5cbmZ1bGxOYW1lRXhjZXB0aW9ucy5Nb2RpZnlFcnJvciA9IE1vZGlmeUVycm9yO1xuZnVsbE5hbWVFeGNlcHRpb25zLkRleGllRXJyb3IgPSBEZXhpZUVycm9yO1xuZnVsbE5hbWVFeGNlcHRpb25zLkJ1bGtFcnJvciA9IEJ1bGtFcnJvcjtcblxuZnVuY3Rpb24gRXZlbnRzKGN0eCkge1xuICAgIHZhciBldnMgPSB7fTtcbiAgICB2YXIgcnYgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBzdWJzY3JpYmVyKSB7XG4gICAgICAgIGlmIChzdWJzY3JpYmVyKSB7XG4gICAgICAgICAgICAvLyBTdWJzY3JpYmUuIElmIGFkZGl0aW9uYWwgYXJndW1lbnRzIHRoYW4ganVzdCB0aGUgc3Vic2NyaWJlciB3YXMgcHJvdmlkZWQsIGZvcndhcmQgdGhlbSBhcyB3ZWxsLlxuICAgICAgICAgICAgdmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoaSAtIDEpO1xuICAgICAgICAgICAgd2hpbGUgKC0taSkge1xuICAgICAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgfWV2c1tldmVudE5hbWVdLnN1YnNjcmliZS5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgICAgIHJldHVybiBjdHg7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGV2ZW50TmFtZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIC8vIFJldHVybiBpbnRlcmZhY2UgYWxsb3dpbmcgdG8gZmlyZSBvciB1bnN1YnNjcmliZSBmcm9tIGV2ZW50XG4gICAgICAgICAgICByZXR1cm4gZXZzW2V2ZW50TmFtZV07XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJ2LmFkZEV2ZW50VHlwZSA9IGFkZDtcblxuICAgIGZvciAodmFyIGkgPSAxLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICBhZGQoYXJndW1lbnRzW2ldKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcnY7XG5cbiAgICBmdW5jdGlvbiBhZGQoZXZlbnROYW1lLCBjaGFpbkZ1bmN0aW9uLCBkZWZhdWx0RnVuY3Rpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBldmVudE5hbWUgPT09ICdvYmplY3QnKSByZXR1cm4gYWRkQ29uZmlndXJlZEV2ZW50cyhldmVudE5hbWUpO1xuICAgICAgICBpZiAoIWNoYWluRnVuY3Rpb24pIGNoYWluRnVuY3Rpb24gPSByZXZlcnNlU3RvcHBhYmxlRXZlbnRDaGFpbjtcbiAgICAgICAgaWYgKCFkZWZhdWx0RnVuY3Rpb24pIGRlZmF1bHRGdW5jdGlvbiA9IG5vcDtcblxuICAgICAgICB2YXIgY29udGV4dCA9IHtcbiAgICAgICAgICAgIHN1YnNjcmliZXJzOiBbXSxcbiAgICAgICAgICAgIGZpcmU6IGRlZmF1bHRGdW5jdGlvbixcbiAgICAgICAgICAgIHN1YnNjcmliZTogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRleHQuc3Vic2NyaWJlcnMuaW5kZXhPZihjYikgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuc3Vic2NyaWJlcnMucHVzaChjYik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQuZmlyZSA9IGNoYWluRnVuY3Rpb24oY29udGV4dC5maXJlLCBjYik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHVuc3Vic2NyaWJlOiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LnN1YnNjcmliZXJzID0gY29udGV4dC5zdWJzY3JpYmVycy5maWx0ZXIoZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmbiAhPT0gY2I7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY29udGV4dC5maXJlID0gY29udGV4dC5zdWJzY3JpYmVycy5yZWR1Y2UoY2hhaW5GdW5jdGlvbiwgZGVmYXVsdEZ1bmN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgZXZzW2V2ZW50TmFtZV0gPSBydltldmVudE5hbWVdID0gY29udGV4dDtcbiAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRkQ29uZmlndXJlZEV2ZW50cyhjZmcpIHtcbiAgICAgICAgLy8gZXZlbnRzKHRoaXMsIHtyZWFkaW5nOiBbZnVuY3Rpb25DaGFpbiwgbm9wXX0pO1xuICAgICAgICBrZXlzKGNmZykuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IGNmZ1tldmVudE5hbWVdO1xuICAgICAgICAgICAgaWYgKGlzQXJyYXkoYXJncykpIHtcbiAgICAgICAgICAgICAgICBhZGQoZXZlbnROYW1lLCBjZmdbZXZlbnROYW1lXVswXSwgY2ZnW2V2ZW50TmFtZV1bMV0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhcmdzID09PSAnYXNhcCcpIHtcbiAgICAgICAgICAgICAgICAvLyBSYXRoZXIgdGhhbiBhcHByb2FjaGluZyBldmVudCBzdWJzY3JpcHRpb24gdXNpbmcgYSBmdW5jdGlvbmFsIGFwcHJvYWNoLCB3ZSBoZXJlIGRvIGl0IGluIGEgZm9yLWxvb3Agd2hlcmUgc3Vic2NyaWJlciBpcyBleGVjdXRlZCBpbiBpdHMgb3duIHN0YWNrXG4gICAgICAgICAgICAgICAgLy8gZW5hYmxpbmcgdGhhdCBhbnkgZXhjZXB0aW9uIHRoYXQgb2NjdXIgd29udCBkaXN0dXJiIHRoZSBpbml0aWF0b3IgYW5kIGFsc28gbm90IG5lc2Nlc3NhcnkgYmUgY2F0Y2hlZCBhbmQgZm9yZ290dGVuLlxuICAgICAgICAgICAgICAgIHZhciBjb250ZXh0ID0gYWRkKGV2ZW50TmFtZSwgbWlycm9yLCBmdW5jdGlvbiBmaXJlKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBPcHRpbWF6YXRpb24tc2FmZSBjbG9uaW5nIG9mIGFyZ3VtZW50cyBpbnRvIGFyZ3MuXG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkoaSk7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgIH0gLy8gQWxsIGVhY2ggc3Vic2NyaWJlcjpcbiAgICAgICAgICAgICAgICAgICAgY29udGV4dC5zdWJzY3JpYmVycy5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXNhcChmdW5jdGlvbiBmaXJlRXZlbnQoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2UgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KFwiSW52YWxpZCBldmVudCBjb25maWdcIik7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLy9cbi8vIFByb21pc2UgQ2xhc3MgZm9yIERleGllIGxpYnJhcnlcbi8vXG4vLyBJIHN0YXJ0ZWQgb3V0IHdyaXRpbmcgdGhpcyBQcm9taXNlIGNsYXNzIGJ5IGNvcHlpbmcgcHJvbWlzZS1saWdodCAoaHR0cHM6Ly9naXRodWIuY29tL3RheWxvcmhha2VzL3Byb21pc2UtbGlnaHQpIGJ5XG4vLyBodHRwczovL2dpdGh1Yi5jb20vdGF5bG9yaGFrZXMgLSBhbiBBKyBhbmQgRUNNQVNDUklQVCA2IGNvbXBsaWFudCBQcm9taXNlIGltcGxlbWVudGF0aW9uLlxuLy9cbi8vIE1vZGlmaWNhdGlvbnMgbmVlZGVkIHRvIGJlIGRvbmUgdG8gc3VwcG9ydCBpbmRleGVkREIgYmVjYXVzZSBpdCB3b250IGFjY2VwdCBzZXRUaW1lb3V0KClcbi8vIChTZWUgZGlzY3Vzc2lvbjogaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMvaXNzdWVzLzQ1KSAuXG4vLyBUaGlzIHRvcGljIHdhcyBhbHNvIGRpc2N1c3NlZCBpbiB0aGUgZm9sbG93aW5nIHRocmVhZDogaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMvaXNzdWVzLzQ1XG4vL1xuLy8gVGhpcyBpbXBsZW1lbnRhdGlvbiB3aWxsIG5vdCB1c2Ugc2V0VGltZW91dCBvciBzZXRJbW1lZGlhdGUgd2hlbiBpdCdzIG5vdCBuZWVkZWQuIFRoZSBiZWhhdmlvciBpcyAxMDAlIFByb21pc2UvQSsgY29tcGxpYW50IHNpbmNlXG4vLyB0aGUgY2FsbGVyIG9mIG5ldyBQcm9taXNlKCkgY2FuIGJlIGNlcnRhaW4gdGhhdCB0aGUgcHJvbWlzZSB3b250IGJlIHRyaWdnZXJlZCB0aGUgbGluZXMgYWZ0ZXIgY29uc3RydWN0aW5nIHRoZSBwcm9taXNlLlxuLy9cbi8vIEluIHByZXZpb3VzIHZlcnNpb25zIHRoaXMgd2FzIGZpeGVkIGJ5IG5vdCBjYWxsaW5nIHNldFRpbWVvdXQgd2hlbiBrbm93aW5nIHRoYXQgdGhlIHJlc29sdmUoKSBvciByZWplY3QoKSBjYW1lIGZyb20gYW5vdGhlclxuLy8gdGljay4gSW4gRGV4aWUgdjEuNC4wLCBJJ3ZlIHJld3JpdHRlbiB0aGUgUHJvbWlzZSBjbGFzcyBlbnRpcmVseS4gSnVzdCBzb21lIGZyYWdtZW50cyBvZiBwcm9taXNlLWxpZ2h0IGlzIGxlZnQuIEkgdXNlXG4vLyBhbm90aGVyIHN0cmF0ZWd5IG5vdyB0aGF0IHNpbXBsaWZpZXMgZXZlcnl0aGluZyBhIGxvdDogdG8gYWx3YXlzIGV4ZWN1dGUgY2FsbGJhY2tzIGluIGEgbmV3IHRpY2ssIGJ1dCBoYXZlIGFuIG93biBtaWNyb1RpY2tcbi8vIGVuZ2luZSB0aGF0IGlzIHVzZWQgaW5zdGVhZCBvZiBzZXRJbW1lZGlhdGUoKSBvciBzZXRUaW1lb3V0KCkuXG4vLyBQcm9taXNlIGNsYXNzIGhhcyBhbHNvIGJlZW4gb3B0aW1pemVkIGEgbG90IHdpdGggaW5zcGlyYXRpb24gZnJvbSBibHVlYmlyZCAtIHRvIGF2b2lkIGNsb3N1cmVzIGFzIG11Y2ggYXMgcG9zc2libGUuXG4vLyBBbHNvIHdpdGggaW5zcGlyYXRpb24gZnJvbSBibHVlYmlyZCwgYXN5bmNyb25pYyBzdGFja3MgaW4gZGVidWcgbW9kZS5cbi8vXG4vLyBTcGVjaWZpYyBub24tc3RhbmRhcmQgZmVhdHVyZXMgb2YgdGhpcyBQcm9taXNlIGNsYXNzOlxuLy8gKiBBc3luYyBzdGF0aWMgY29udGV4dCBzdXBwb3J0IChQcm9taXNlLlBTRClcbi8vICogUHJvbWlzZS5mb2xsb3coKSBtZXRob2QgYnVpbHQgdXBvbiBQU0QsIHRoYXQgYWxsb3dzIHVzZXIgdG8gdHJhY2sgYWxsIHByb21pc2VzIGNyZWF0ZWQgZnJvbSBjdXJyZW50IHN0YWNrIGZyYW1lXG4vLyAgIGFuZCBiZWxvdyArIGFsbCBwcm9taXNlcyB0aGF0IHRob3NlIHByb21pc2VzIGNyZWF0ZXMgb3IgYXdhaXRzLlxuLy8gKiBEZXRlY3QgYW55IHVuaGFuZGxlZCBwcm9taXNlIGluIGEgUFNELXNjb3BlIChQU0Qub251bmhhbmRsZWQpLiBcbi8vXG4vLyBEYXZpZCBGYWhsYW5kZXIsIGh0dHBzOi8vZ2l0aHViLmNvbS9kZmFobGFuZGVyXG4vL1xuXG4vLyBKdXN0IGEgcG9pbnRlciB0aGF0IG9ubHkgdGhpcyBtb2R1bGUga25vd3MgYWJvdXQuXG4vLyBVc2VkIGluIFByb21pc2UgY29uc3RydWN0b3IgdG8gZW11bGF0ZSBhIHByaXZhdGUgY29uc3RydWN0b3IuXG52YXIgSU5URVJOQUwgPSB7fTtcblxuLy8gQXN5bmMgc3RhY2tzIChsb25nIHN0YWNrcykgbXVzdCBub3QgZ3JvdyBpbmZpbml0ZWx5LlxudmFyIExPTkdfU1RBQ0tTX0NMSVBfTElNSVQgPSAxMDA7XG52YXIgTUFYX0xPTkdfU1RBQ0tTID0gMjA7XG52YXIgc3RhY2tfYmVpbmdfZ2VuZXJhdGVkID0gZmFsc2U7XG5cbi8qIFRoZSBkZWZhdWx0IFwibmV4dFRpY2tcIiBmdW5jdGlvbiB1c2VkIG9ubHkgZm9yIHRoZSB2ZXJ5IGZpcnN0IHByb21pc2UgaW4gYSBwcm9taXNlIGNoYWluLlxyXG4gICBBcyBzb29uIGFzIHRoZW4gcHJvbWlzZSBpcyByZXNvbHZlZCBvciByZWplY3RlZCwgYWxsIG5leHQgdGFza3Mgd2lsbCBiZSBleGVjdXRlZCBpbiBtaWNybyB0aWNrc1xyXG4gICBlbXVsYXRlZCBpbiB0aGlzIG1vZHVsZS4gRm9yIGluZGV4ZWREQiBjb21wYXRpYmlsaXR5LCB0aGlzIG1lYW5zIHRoYXQgZXZlcnkgbWV0aG9kIG5lZWRzIHRvIFxyXG4gICBleGVjdXRlIGF0IGxlYXN0IG9uZSBwcm9taXNlIGJlZm9yZSBkb2luZyBhbiBpbmRleGVkREIgb3BlcmF0aW9uLiBEZXhpZSB3aWxsIGFsd2F5cyBjYWxsIFxyXG4gICBkYi5yZWFkeSgpLnRoZW4oKSBmb3IgZXZlcnkgb3BlcmF0aW9uIHRvIG1ha2Ugc3VyZSB0aGUgaW5kZXhlZERCIGV2ZW50IGlzIHN0YXJ0ZWQgaW4gYW5cclxuICAgZW11bGF0ZWQgbWljcm8gdGljay5cclxuKi9cbnZhciBzY2hlZHVsZVBoeXNpY2FsVGljayA9IF9nbG9iYWwuc2V0SW1tZWRpYXRlID9cbi8vIHNldEltbWVkaWF0ZSBzdXBwb3J0ZWQuIFRob3NlIG1vZGVybiBwbGF0Zm9ybXMgYWxzbyBzdXBwb3J0cyBGdW5jdGlvbi5iaW5kKCkuXG5zZXRJbW1lZGlhdGUuYmluZChudWxsLCBwaHlzaWNhbFRpY2spIDogX2dsb2JhbC5NdXRhdGlvbk9ic2VydmVyID9cbi8vIE11dGF0aW9uT2JzZXJ2ZXIgc3VwcG9ydGVkXG5mdW5jdGlvbiAoKSB7XG4gICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICBwaHlzaWNhbFRpY2soKTtcbiAgICAgICAgaGlkZGVuRGl2ID0gbnVsbDtcbiAgICB9KS5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ2knLCAnMScpO1xufSA6XG4vLyBObyBzdXBwb3J0IGZvciBzZXRJbW1lZGlhdGUgb3IgTXV0YXRpb25PYnNlcnZlci4gTm8gd29ycnksIHNldFRpbWVvdXQgaXMgb25seSBjYWxsZWRcbi8vIG9uY2UgdGltZS4gRXZlcnkgdGljayB0aGF0IGZvbGxvd3Mgd2lsbCBiZSBvdXIgZW11bGF0ZWQgbWljcm8gdGljay5cbi8vIENvdWxkIGhhdmUgdXNlcyBzZXRUaW1lb3V0LmJpbmQobnVsbCwgMCwgcGh5c2ljYWxUaWNrKSBpZiBpdCB3YXNudCBmb3IgdGhhdCBGRjEzIGFuZCBiZWxvdyBoYXMgYSBidWcgXG5mdW5jdGlvbiAoKSB7XG4gICAgc2V0VGltZW91dChwaHlzaWNhbFRpY2ssIDApO1xufTtcblxuLy8gQ29uZmlmdXJhYmxlIHRocm91Z2ggUHJvbWlzZS5zY2hlZHVsZXIuXG4vLyBEb24ndCBleHBvcnQgYmVjYXVzZSBpdCB3b3VsZCBiZSB1bnNhZmUgdG8gbGV0IHVua25vd25cbi8vIGNvZGUgY2FsbCBpdCB1bmxlc3MgdGhleSBkbyB0cnkuLmNhdGNoIHdpdGhpbiB0aGVpciBjYWxsYmFjay5cbi8vIFRoaXMgZnVuY3Rpb24gY2FuIGJlIHJldHJpZXZlZCB0aHJvdWdoIGdldHRlciBvZiBQcm9taXNlLnNjaGVkdWxlciB0aG91Z2gsXG4vLyBidXQgdXNlcnMgbXVzdCBub3QgZG8gUHJvbWlzZS5zY2hlZHVsZXIgKG15RnVuY1RoYXRUaHJvd3MgZXhjZXB0aW9uKSFcbnZhciBhc2FwJDEgPSBmdW5jdGlvbiAoY2FsbGJhY2ssIGFyZ3MpIHtcbiAgICBtaWNyb3RpY2tRdWV1ZS5wdXNoKFtjYWxsYmFjaywgYXJnc10pO1xuICAgIGlmIChuZWVkc05ld1BoeXNpY2FsVGljaykge1xuICAgICAgICBzY2hlZHVsZVBoeXNpY2FsVGljaygpO1xuICAgICAgICBuZWVkc05ld1BoeXNpY2FsVGljayA9IGZhbHNlO1xuICAgIH1cbn07XG5cbnZhciBpc091dHNpZGVNaWNyb1RpY2sgPSB0cnVlO1xudmFyIG5lZWRzTmV3UGh5c2ljYWxUaWNrID0gdHJ1ZTtcbnZhciB1bmhhbmRsZWRFcnJvcnMgPSBbXTtcbnZhciByZWplY3RpbmdFcnJvcnMgPSBbXTtcbnZhciBjdXJyZW50RnVsZmlsbGVyID0gbnVsbDtcbnZhciByZWplY3Rpb25NYXBwZXIgPSBtaXJyb3I7IC8vIFJlbW92ZSBpbiBuZXh0IG1ham9yIHdoZW4gcmVtb3ZpbmcgZXJyb3IgbWFwcGluZyBvZiBET01FcnJvcnMgYW5kIERPTUV4Y2VwdGlvbnNcblxudmFyIGdsb2JhbFBTRCA9IHtcbiAgICBnbG9iYWw6IHRydWUsXG4gICAgcmVmOiAwLFxuICAgIHVuaGFuZGxlZHM6IFtdLFxuICAgIG9udW5oYW5kbGVkOiBnbG9iYWxFcnJvcixcbiAgICAvL2VudjogbnVsbCwgLy8gV2lsbCBiZSBzZXQgd2hlbmV2ZXIgbGVhdmluZyBhIHNjb3BlIHVzaW5nIHdyYXBwZXJzLnNuYXBzaG90KClcbiAgICBmaW5hbGl6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnVuaGFuZGxlZHMuZm9yRWFjaChmdW5jdGlvbiAodWgpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgZ2xvYmFsRXJyb3IodWhbMF0sIHVoWzFdKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbnZhciBQU0QgPSBnbG9iYWxQU0Q7XG5cbnZhciBtaWNyb3RpY2tRdWV1ZSA9IFtdOyAvLyBDYWxsYmFja3MgdG8gY2FsbCBpbiB0aGlzIG9yIG5leHQgcGh5c2ljYWwgdGljay5cbnZhciBudW1TY2hlZHVsZWRDYWxscyA9IDA7IC8vIE51bWJlciBvZiBsaXN0ZW5lci1jYWxscyBsZWZ0IHRvIGRvIGluIHRoaXMgcGh5c2ljYWwgdGljay5cbnZhciB0aWNrRmluYWxpemVycyA9IFtdOyAvLyBGaW5hbGl6ZXJzIHRvIGNhbGwgd2hlbiB0aGVyZSBhcmUgbm8gbW9yZSBhc3luYyBjYWxscyBzY2hlZHVsZWQgd2l0aGluIGN1cnJlbnQgcGh5c2ljYWwgdGljay5cblxuLy8gV3JhcHBlcnMgYXJlIG5vdCBiZWluZyB1c2VkIHlldC4gVGhlaXIgZnJhbWV3b3JrIGlzIGZ1bmN0aW9uaW5nIGFuZCBjYW4gYmUgdXNlZFxuLy8gdG8gcmVwbGFjZSBlbnZpcm9ubWVudCBkdXJpbmcgYSBQU0Qgc2NvcGUgKGEuay5hLiAnem9uZScpLlxuLyogKipLRUVQKiogZXhwb3J0IHZhciB3cmFwcGVycyA9ICgoKSA9PiB7XHJcbiAgICB2YXIgd3JhcHBlcnMgPSBbXTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHNuYXBzaG90OiAoKSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBpID0gd3JhcHBlcnMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gbmV3IEFycmF5KGkpO1xyXG4gICAgICAgICAgICB3aGlsZSAoaS0tKSByZXN1bHRbaV0gPSB3cmFwcGVyc1tpXS5zbmFwc2hvdCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzdG9yZTogdmFsdWVzID0+IHtcclxuICAgICAgICAgICAgdmFyIGkgPSB3cmFwcGVycy5sZW5ndGg7XHJcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIHdyYXBwZXJzW2ldLnJlc3RvcmUodmFsdWVzW2ldKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHdyYXA6ICgpID0+IHdyYXBwZXJzLm1hcCh3ID0+IHcud3JhcCgpKSxcclxuICAgICAgICBhZGQ6IHdyYXBwZXIgPT4ge1xyXG4gICAgICAgICAgICB3cmFwcGVycy5wdXNoKHdyYXBwZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbn0pKCk7XHJcbiovXG5cbmZ1bmN0aW9uIFByb21pc2UoZm4pIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09ICdvYmplY3QnKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlcyBtdXN0IGJlIGNvbnN0cnVjdGVkIHZpYSBuZXcnKTtcbiAgICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbiAgICB0aGlzLm9udW5jYXRjaGVkID0gbm9wOyAvLyBEZXByZWNhdGUgaW4gbmV4dCBtYWpvci4gTm90IG5lZWRlZC4gQmV0dGVyIHRvIHVzZSBnbG9iYWwgZXJyb3IgaGFuZGxlci5cblxuICAgIC8vIEEgbGlicmFyeSBtYXkgc2V0IGBwcm9taXNlLl9saWIgPSB0cnVlO2AgYWZ0ZXIgcHJvbWlzZSBpcyBjcmVhdGVkIHRvIG1ha2UgcmVzb2x2ZSgpIG9yIHJlamVjdCgpXG4gICAgLy8gZXhlY3V0ZSB0aGUgbWljcm90YXNrIGVuZ2luZSBpbXBsaWNpdGVseSB3aXRoaW4gdGhlIGNhbGwgdG8gcmVzb2x2ZSgpIG9yIHJlamVjdCgpLlxuICAgIC8vIFRvIHJlbWFpbiBBKyBjb21wbGlhbnQsIGEgbGlicmFyeSBtdXN0IG9ubHkgc2V0IGBfbGliPXRydWVgIGlmIGl0IGNhbiBndWFyYW50ZWUgdGhhdCB0aGUgc3RhY2tcbiAgICAvLyBvbmx5IGNvbnRhaW5zIGxpYnJhcnkgY29kZSB3aGVuIGNhbGxpbmcgcmVzb2x2ZSgpIG9yIHJlamVjdCgpLlxuICAgIC8vIFJVTEUgT0YgVEhVTUI6IE9OTFkgc2V0IF9saWIgPSB0cnVlIGZvciBwcm9taXNlcyBleHBsaWNpdGVseSByZXNvbHZpbmcvcmVqZWN0aW5nIGRpcmVjdGx5IGZyb21cbiAgICAvLyBnbG9iYWwgc2NvcGUgKGV2ZW50IGhhbmRsZXIsIHRpbWVyIGV0YykhXG4gICAgdGhpcy5fbGliID0gZmFsc2U7XG4gICAgLy8gQ3VycmVudCBhc3luYyBzY29wZVxuICAgIHZhciBwc2QgPSB0aGlzLl9QU0QgPSBQU0Q7XG5cbiAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgdGhpcy5fc3RhY2tIb2xkZXIgPSBnZXRFcnJvcldpdGhTdGFjaygpO1xuICAgICAgICB0aGlzLl9wcmV2ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fbnVtUHJldiA9IDA7IC8vIE51bWJlciBvZiBwcmV2aW91cyBwcm9taXNlcyAoZm9yIGxvbmcgc3RhY2tzKVxuICAgICAgICBsaW5rVG9QcmV2aW91c1Byb21pc2UodGhpcywgY3VycmVudEZ1bGZpbGxlcik7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBpZiAoZm4gIT09IElOVEVSTkFMKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdOb3QgYSBmdW5jdGlvbicpO1xuICAgICAgICAvLyBQcml2YXRlIGNvbnN0cnVjdG9yIChJTlRFUk5BTCwgc3RhdGUsIHZhbHVlKS5cbiAgICAgICAgLy8gVXNlZCBpbnRlcm5hbGx5IGJ5IFByb21pc2UucmVzb2x2ZSgpIGFuZCBQcm9taXNlLnJlamVjdCgpLlxuICAgICAgICB0aGlzLl9zdGF0ZSA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgdGhpcy5fdmFsdWUgPSBhcmd1bWVudHNbMl07XG4gICAgICAgIGlmICh0aGlzLl9zdGF0ZSA9PT0gZmFsc2UpIGhhbmRsZVJlamVjdGlvbih0aGlzLCB0aGlzLl92YWx1ZSk7IC8vIE1hcCBlcnJvciwgc2V0IHN0YWNrIGFuZCBhZGRQb3NzaWJseVVuaGFuZGxlZEVycm9yKCkuXG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLl9zdGF0ZSA9IG51bGw7IC8vIG51bGwgKD1wZW5kaW5nKSwgZmFsc2UgKD1yZWplY3RlZCkgb3IgdHJ1ZSAoPXJlc29sdmVkKVxuICAgIHRoaXMuX3ZhbHVlID0gbnVsbDsgLy8gZXJyb3Igb3IgcmVzdWx0XG4gICAgKytwc2QucmVmOyAvLyBSZWZjb3VudGluZyBjdXJyZW50IHNjb3BlXG4gICAgZXhlY3V0ZVByb21pc2VUYXNrKHRoaXMsIGZuKTtcbn1cblxucHJvcHMoUHJvbWlzZS5wcm90b3R5cGUsIHtcblxuICAgIHRoZW46IGZ1bmN0aW9uIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgICAgIHZhciBydiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHByb3BhZ2F0ZVRvTGlzdGVuZXIoX3RoaXMsIG5ldyBMaXN0ZW5lcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzb2x2ZSwgcmVqZWN0KSk7XG4gICAgICAgIH0pO1xuICAgICAgICBkZWJ1ZyAmJiAoIXRoaXMuX3ByZXYgfHwgdGhpcy5fc3RhdGUgPT09IG51bGwpICYmIGxpbmtUb1ByZXZpb3VzUHJvbWlzZShydiwgdGhpcyk7XG4gICAgICAgIHJldHVybiBydjtcbiAgICB9LFxuXG4gICAgX3RoZW46IGZ1bmN0aW9uIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICAgICAgICAvLyBBIGxpdHRsZSB0aW5pZXIgdmVyc2lvbiBvZiB0aGVuKCkgdGhhdCBkb24ndCBoYXZlIHRvIGNyZWF0ZSBhIHJlc3VsdGluZyBwcm9taXNlLlxuICAgICAgICBwcm9wYWdhdGVUb0xpc3RlbmVyKHRoaXMsIG5ldyBMaXN0ZW5lcihudWxsLCBudWxsLCBvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkpO1xuICAgIH0sXG5cbiAgICBjYXRjaDogZnVuY3Rpb24gKG9uUmVqZWN0ZWQpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3RlZCk7XG4gICAgICAgIC8vIEZpcnN0IGFyZ3VtZW50IGlzIHRoZSBFcnJvciB0eXBlIHRvIGNhdGNoXG4gICAgICAgIHZhciB0eXBlID0gYXJndW1lbnRzWzBdLFxuICAgICAgICAgICAgaGFuZGxlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgICAgcmV0dXJuIHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nID8gdGhpcy50aGVuKG51bGwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgLy8gQ2F0Y2hpbmcgZXJyb3JzIGJ5IGl0cyBjb25zdHJ1Y3RvciB0eXBlIChzaW1pbGFyIHRvIGphdmEgLyBjKysgLyBjIylcbiAgICAgICAgICAgICAgICAvLyBTYW1wbGU6IHByb21pc2UuY2F0Y2goVHlwZUVycm9yLCBmdW5jdGlvbiAoZSkgeyAuLi4gfSk7XG4gICAgICAgICAgICAgICAgZXJyIGluc3RhbmNlb2YgdHlwZSA/IGhhbmRsZXIoZXJyKSA6IFByb21pc2VSZWplY3QoZXJyKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSkgOiB0aGlzLnRoZW4obnVsbCwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgICAgICAvLyBDYXRjaGluZyBlcnJvcnMgYnkgdGhlIGVycm9yLm5hbWUgcHJvcGVydHkuIE1ha2VzIHNlbnNlIGZvciBpbmRleGVkREIgd2hlcmUgZXJyb3IgdHlwZVxuICAgICAgICAgICAgICAgIC8vIGlzIGFsd2F5cyBET01FcnJvciBidXQgd2hlcmUgZS5uYW1lIHRlbGxzIHRoZSBhY3R1YWwgZXJyb3IgdHlwZS5cbiAgICAgICAgICAgICAgICAvLyBTYW1wbGU6IHByb21pc2UuY2F0Y2goJ0NvbnN0cmFpbnRFcnJvcicsIGZ1bmN0aW9uIChlKSB7IC4uLiB9KTtcbiAgICAgICAgICAgICAgICBlcnIgJiYgZXJyLm5hbWUgPT09IHR5cGUgPyBoYW5kbGVyKGVycikgOiBQcm9taXNlUmVqZWN0KGVycilcbiAgICAgICAgICAgICk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBmaW5hbGx5OiBmdW5jdGlvbiAob25GaW5hbGx5KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICBvbkZpbmFsbHkoKTtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgb25GaW5hbGx5KCk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZVJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLy8gRGVwcmVjYXRlIGluIG5leHQgbWFqb3IuIE5lZWRlZCBvbmx5IGZvciBkYi5vbi5lcnJvci5cbiAgICB1bmNhdWdodDogZnVuY3Rpb24gKHVuY2F1Z2h0SGFuZGxlcikge1xuICAgICAgICB2YXIgX3RoaXMyID0gdGhpcztcblxuICAgICAgICAvLyBCZSBiYWNrd2FyZCBjb21wYXRpYmxlIGFuZCB1c2UgXCJvbnVuY2F0Y2hlZFwiIGFzIHRoZSBldmVudCBuYW1lIG9uIHRoaXMuXG4gICAgICAgIC8vIEhhbmRsZSBtdWx0aXBsZSBzdWJzY3JpYmVycyB0aHJvdWdoIHJldmVyc2VTdG9wcGFibGVFdmVudENoYWluKCkuIElmIGEgaGFuZGxlciByZXR1cm5zIGBmYWxzZWAsIGJ1YmJsaW5nIHN0b3BzLlxuICAgICAgICB0aGlzLm9udW5jYXRjaGVkID0gcmV2ZXJzZVN0b3BwYWJsZUV2ZW50Q2hhaW4odGhpcy5vbnVuY2F0Y2hlZCwgdW5jYXVnaHRIYW5kbGVyKTtcbiAgICAgICAgLy8gSW4gY2FzZSBjYWxsZXIgZG9lcyB0aGlzIG9uIGFuIGFscmVhZHkgcmVqZWN0ZWQgcHJvbWlzZSwgYXNzdW1lIGNhbGxlciB3YW50cyB0byBwb2ludCBvdXQgdGhlIGVycm9yIHRvIHRoaXMgcHJvbWlzZSBhbmQgbm90XG4gICAgICAgIC8vIGEgcHJldmlvdXMgcHJvbWlzZS4gUmVhc29uOiB0aGUgcHJldm91cyBwcm9taXNlIG1heSBsYWNrIG9udW5jYXRjaGVkIGhhbmRsZXIuIFxuICAgICAgICBpZiAodGhpcy5fc3RhdGUgPT09IGZhbHNlICYmIHVuaGFuZGxlZEVycm9ycy5pbmRleE9mKHRoaXMpID09PSAtMSkge1xuICAgICAgICAgICAgLy8gUmVwbGFjZSB1bmhhbmRsZWQgZXJyb3IncyBkZXN0aW5haW9uIHByb21pc2Ugd2l0aCB0aGlzIG9uZSFcbiAgICAgICAgICAgIHVuaGFuZGxlZEVycm9ycy5zb21lKGZ1bmN0aW9uIChwLCBpLCBsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHAuX3ZhbHVlID09PSBfdGhpczIuX3ZhbHVlICYmIChsW2ldID0gX3RoaXMyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gQWN0dWFsbHkgd2UgZG8gdGhpcyBzaGl0IGJlY2F1c2Ugd2UgbmVlZCB0byBzdXBwb3J0IGRiLm9uLmVycm9yKCkgY29ycmVjdGx5IGR1cmluZyBkYi5vcGVuKCkuIElmIHdlIGRlcHJlY2F0ZSBkYi5vbi5lcnJvciwgd2UgY291bGRcbiAgICAgICAgICAgIC8vIHRha2UgYXdheSB0aGlzIHBpZWNlIG9mIGNvZGUgYXMgd2VsbCBhcyB0aGUgb251bmNhdGNoZWQgYW5kIHVuY2F1Z2h0KCkgbWV0aG9kLlxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICBzdGFjazoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9zdGFjaykgcmV0dXJuIHRoaXMuX3N0YWNrO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdGFja19iZWluZ19nZW5lcmF0ZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHZhciBzdGFja3MgPSBnZXRTdGFjayh0aGlzLCBbXSwgTUFYX0xPTkdfU1RBQ0tTKTtcbiAgICAgICAgICAgICAgICB2YXIgc3RhY2sgPSBzdGFja3Muam9pbihcIlxcbkZyb20gcHJldmlvdXM6IFwiKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fc3RhdGUgIT09IG51bGwpIHRoaXMuX3N0YWNrID0gc3RhY2s7IC8vIFN0YWNrIG1heSBiZSB1cGRhdGVkIG9uIHJlamVjdC5cbiAgICAgICAgICAgICAgICByZXR1cm4gc3RhY2s7XG4gICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgIHN0YWNrX2JlaW5nX2dlbmVyYXRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSk7XG5cbmZ1bmN0aW9uIExpc3RlbmVyKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkLCByZXNvbHZlLCByZWplY3QpIHtcbiAgICB0aGlzLm9uRnVsZmlsbGVkID0gdHlwZW9mIG9uRnVsZmlsbGVkID09PSAnZnVuY3Rpb24nID8gb25GdWxmaWxsZWQgOiBudWxsO1xuICAgIHRoaXMub25SZWplY3RlZCA9IHR5cGVvZiBvblJlamVjdGVkID09PSAnZnVuY3Rpb24nID8gb25SZWplY3RlZCA6IG51bGw7XG4gICAgdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICB0aGlzLnJlamVjdCA9IHJlamVjdDtcbiAgICB0aGlzLnBzZCA9IFBTRDtcbn1cblxuLy8gUHJvbWlzZSBTdGF0aWMgUHJvcGVydGllc1xucHJvcHMoUHJvbWlzZSwge1xuICAgIGFsbDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWVzID0gZ2V0QXJyYXlPZi5hcHBseShudWxsLCBhcmd1bWVudHMpOyAvLyBTdXBwb3J0cyBpdGVyYWJsZXMsIGltcGxpY2l0IGFyZ3VtZW50cyBhbmQgYXJyYXktbGlrZS5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZXMubGVuZ3RoID09PSAwKSByZXNvbHZlKFtdKTtcbiAgICAgICAgICAgIHZhciByZW1haW5pbmcgPSB2YWx1ZXMubGVuZ3RoO1xuICAgICAgICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24gKGEsIGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKGEpLnRoZW4oZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVzW2ldID0geDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEgLS1yZW1haW5pbmcpIHJlc29sdmUodmFsdWVzKTtcbiAgICAgICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICByZXNvbHZlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgUHJvbWlzZSkgcmV0dXJuIHZhbHVlO1xuICAgICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlLnRoZW4gPT09ICdmdW5jdGlvbicpIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YWx1ZS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoSU5URVJOQUwsIHRydWUsIHZhbHVlKTtcbiAgICB9LFxuXG4gICAgcmVqZWN0OiBQcm9taXNlUmVqZWN0LFxuXG4gICAgcmFjZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdmFsdWVzID0gZ2V0QXJyYXlPZi5hcHBseShudWxsLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgdmFsdWVzLm1hcChmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHZhbHVlKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIFBTRDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBQU0Q7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gUFNEID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbmV3UFNEOiBuZXdTY29wZSxcblxuICAgIHVzZVBTRDogdXNlUFNELFxuXG4gICAgc2NoZWR1bGVyOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGFzYXAkMTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGFzYXAkMSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlamVjdGlvbk1hcHBlcjoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3Rpb25NYXBwZXI7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZWplY3Rpb25NYXBwZXIgPSB2YWx1ZTtcbiAgICAgICAgfSAvLyBNYXAgcmVqZWN0IGZhaWx1cmVzXG4gICAgfSxcblxuICAgIGZvbGxvdzogZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3U2NvcGUoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHZhciBwc2QgPSBQU0Q7XG4gICAgICAgICAgICAgICAgcHNkLnVuaGFuZGxlZHMgPSBbXTsgLy8gRm9yIHVuaGFuZGxlZCBzdGFuZGFyZC0gb3IgM3JkIHBhcnR5IFByb21pc2VzLiBDaGVja2VkIGF0IHBzZC5maW5hbGl6ZSgpXG4gICAgICAgICAgICAgICAgcHNkLm9udW5oYW5kbGVkID0gcmVqZWN0OyAvLyBUcmlnZ2VyZWQgZGlyZWN0bHkgb24gdW5oYW5kbGVkIHByb21pc2VzIG9mIHRoaXMgbGlicmFyeS5cbiAgICAgICAgICAgICAgICBwc2QuZmluYWxpemUgPSBjYWxsQm90aChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVuaGFuZGxlZCBzdGFuZGFyZCBvciAzcmQgcGFydCBwcm9taXNlcyBhcmUgcHV0IGluIFBTRC51bmhhbmRsZWRzIGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyBleGFtaW5lZCB1cG9uIHNjb3BlIGNvbXBsZXRpb24gd2hpbGUgdW5oYW5kbGVkIHJlamVjdGlvbnMgaW4gdGhpcyBQcm9taXNlXG4gICAgICAgICAgICAgICAgICAgIC8vIHdpbGwgdHJpZ2dlciBkaXJlY3RseSB0aHJvdWdoIHBzZC5vbnVuaGFuZGxlZFxuICAgICAgICAgICAgICAgICAgICBydW5fYXRfZW5kX29mX3RoaXNfb3JfbmV4dF9waHlzaWNhbF90aWNrKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzMy51bmhhbmRsZWRzLmxlbmd0aCA9PT0gMCA/IHJlc29sdmUoKSA6IHJlamVjdChfdGhpczMudW5oYW5kbGVkc1swXSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIHBzZC5maW5hbGl6ZSk7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0sIHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBvbjogRXZlbnRzKG51bGwsIHsgXCJlcnJvclwiOiBbcmV2ZXJzZVN0b3BwYWJsZUV2ZW50Q2hhaW4sIGRlZmF1bHRFcnJvckhhbmRsZXJdIC8vIERlZmF1bHQgdG8gZGVmYXVsdEVycm9ySGFuZGxlclxuICAgIH0pXG5cbn0pO1xuXG52YXIgUHJvbWlzZU9uRXJyb3IgPSBQcm9taXNlLm9uLmVycm9yO1xuUHJvbWlzZU9uRXJyb3Iuc3Vic2NyaWJlID0gZGVwcmVjYXRlZChcIlByb21pc2Uub24oJ2Vycm9yJylcIiwgUHJvbWlzZU9uRXJyb3Iuc3Vic2NyaWJlKTtcblByb21pc2VPbkVycm9yLnVuc3Vic2NyaWJlID0gZGVwcmVjYXRlZChcIlByb21pc2Uub24oJ2Vycm9yJykudW5zdWJzY3JpYmVcIiwgUHJvbWlzZU9uRXJyb3IudW5zdWJzY3JpYmUpO1xuXG4vKipcclxuKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxyXG4qIG9uRnVsZmlsbGVkIGFuZCBvblJlamVjdGVkIGFyZSBvbmx5IGNhbGxlZCBvbmNlLlxyXG4qXHJcbiogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxyXG4qL1xuZnVuY3Rpb24gZXhlY3V0ZVByb21pc2VUYXNrKHByb21pc2UsIGZuKSB7XG4gICAgLy8gUHJvbWlzZSBSZXNvbHV0aW9uIFByb2NlZHVyZTpcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vcHJvbWlzZXMtYXBsdXMvcHJvbWlzZXMtc3BlYyN0aGUtcHJvbWlzZS1yZXNvbHV0aW9uLXByb2NlZHVyZVxuICAgIHRyeSB7XG4gICAgICAgIGZuKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBudWxsKSByZXR1cm47XG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHByb21pc2UpIHRocm93IG5ldyBUeXBlRXJyb3IoJ0EgcHJvbWlzZSBjYW5ub3QgYmUgcmVzb2x2ZWQgd2l0aCBpdHNlbGYuJyk7XG4gICAgICAgICAgICB2YXIgc2hvdWxkRXhlY3V0ZVRpY2sgPSBwcm9taXNlLl9saWIgJiYgYmVnaW5NaWNyb1RpY2tTY29wZSgpO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmIHR5cGVvZiB2YWx1ZS50aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZXhlY3V0ZVByb21pc2VUYXNrKHByb21pc2UsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlID8gdmFsdWUuX3RoZW4ocmVzb2x2ZSwgcmVqZWN0KSA6IHZhbHVlLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcHJvbWlzZS5fc3RhdGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHByb21pc2UuX3ZhbHVlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcHJvcGFnYXRlQWxsTGlzdGVuZXJzKHByb21pc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNob3VsZEV4ZWN1dGVUaWNrKSBlbmRNaWNyb1RpY2tTY29wZSgpO1xuICAgICAgICB9LCBoYW5kbGVSZWplY3Rpb24uYmluZChudWxsLCBwcm9taXNlKSk7IC8vIElmIEZ1bmN0aW9uLmJpbmQgaXMgbm90IHN1cHBvcnRlZC4gRXhjZXB0aW9uIGlzIGhhbmRsZWQgaW4gY2F0Y2ggYmVsb3dcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBoYW5kbGVSZWplY3Rpb24ocHJvbWlzZSwgZXgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlUmVqZWN0aW9uKHByb21pc2UsIHJlYXNvbikge1xuICAgIHJlamVjdGluZ0Vycm9ycy5wdXNoKHJlYXNvbik7XG4gICAgaWYgKHByb21pc2UuX3N0YXRlICE9PSBudWxsKSByZXR1cm47XG4gICAgdmFyIHNob3VsZEV4ZWN1dGVUaWNrID0gcHJvbWlzZS5fbGliICYmIGJlZ2luTWljcm9UaWNrU2NvcGUoKTtcbiAgICByZWFzb24gPSByZWplY3Rpb25NYXBwZXIocmVhc29uKTtcbiAgICBwcm9taXNlLl9zdGF0ZSA9IGZhbHNlO1xuICAgIHByb21pc2UuX3ZhbHVlID0gcmVhc29uO1xuICAgIGRlYnVnICYmIHJlYXNvbiAhPT0gbnVsbCAmJiB0eXBlb2YgcmVhc29uID09PSAnb2JqZWN0JyAmJiAhcmVhc29uLl9wcm9taXNlICYmIHRyeUNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG9yaWdQcm9wID0gZ2V0UHJvcGVydHlEZXNjcmlwdG9yKHJlYXNvbiwgXCJzdGFja1wiKTtcbiAgICAgICAgcmVhc29uLl9wcm9taXNlID0gcHJvbWlzZTtcbiAgICAgICAgc2V0UHJvcChyZWFzb24sIFwic3RhY2tcIiwge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0YWNrX2JlaW5nX2dlbmVyYXRlZCA/IG9yaWdQcm9wICYmIChvcmlnUHJvcC5nZXQgPyBvcmlnUHJvcC5nZXQuYXBwbHkocmVhc29uKSA6IG9yaWdQcm9wLnZhbHVlKSA6IHByb21pc2Uuc3RhY2s7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIC8vIEFkZCB0aGUgZmFpbHVyZSB0byBhIGxpc3Qgb2YgcG9zc2libHkgdW5jYXVnaHQgZXJyb3JzXG4gICAgYWRkUG9zc2libHlVbmhhbmRsZWRFcnJvcihwcm9taXNlKTtcbiAgICBwcm9wYWdhdGVBbGxMaXN0ZW5lcnMocHJvbWlzZSk7XG4gICAgaWYgKHNob3VsZEV4ZWN1dGVUaWNrKSBlbmRNaWNyb1RpY2tTY29wZSgpO1xufVxuXG5mdW5jdGlvbiBwcm9wYWdhdGVBbGxMaXN0ZW5lcnMocHJvbWlzZSkge1xuICAgIC8vZGVidWcgJiYgbGlua1RvUHJldmlvdXNQcm9taXNlKHByb21pc2UpO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBwcm9taXNlLl9saXN0ZW5lcnM7XG4gICAgcHJvbWlzZS5fbGlzdGVuZXJzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICBwcm9wYWdhdGVUb0xpc3RlbmVyKHByb21pc2UsIGxpc3RlbmVyc1tpXSk7XG4gICAgfVxuICAgIHZhciBwc2QgPSBwcm9taXNlLl9QU0Q7XG4gICAgLS1wc2QucmVmIHx8IHBzZC5maW5hbGl6ZSgpOyAvLyBpZiBwc2QucmVmIHJlYWNoZXMgemVybywgY2FsbCBwc2QuZmluYWxpemUoKTtcbiAgICBpZiAobnVtU2NoZWR1bGVkQ2FsbHMgPT09IDApIHtcbiAgICAgICAgLy8gSWYgbnVtU2NoZWR1bGVkQ2FsbHMgaXMgMCwgaXQgbWVhbnMgdGhhdCBvdXIgc3RhY2sgaXMgbm90IGluIGEgY2FsbGJhY2sgb2YgYSBzY2hlZHVsZWQgY2FsbCxcbiAgICAgICAgLy8gYW5kIHRoYXQgbm8gZGVmZXJyZWRzIHdoZXJlIGxpc3RlbmluZyB0byB0aGlzIHJlamVjdGlvbiBvciBzdWNjZXNzLlxuICAgICAgICAvLyBTaW5jZSB0aGVyZSBpcyBhIHJpc2sgdGhhdCBvdXIgc3RhY2sgY2FuIGNvbnRhaW4gYXBwbGljYXRpb24gY29kZSB0aGF0IG1heVxuICAgICAgICAvLyBkbyBzdHVmZiBhZnRlciB0aGlzIGNvZGUgaXMgZmluaXNoZWQgdGhhdCBtYXkgZ2VuZXJhdGUgbmV3IGNhbGxzLCB3ZSBjYW5ub3RcbiAgICAgICAgLy8gY2FsbCBmaW5hbGl6ZXJzIGhlcmUuXG4gICAgICAgICsrbnVtU2NoZWR1bGVkQ2FsbHM7XG4gICAgICAgIGFzYXAkMShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoLS1udW1TY2hlZHVsZWRDYWxscyA9PT0gMCkgZmluYWxpemVQaHlzaWNhbFRpY2soKTsgLy8gV2lsbCBkZXRlY3QgdW5oYW5kbGVkIGVycm9yc1xuICAgICAgICB9LCBbXSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBwcm9wYWdhdGVUb0xpc3RlbmVyKHByb21pc2UsIGxpc3RlbmVyKSB7XG4gICAgaWYgKHByb21pc2UuX3N0YXRlID09PSBudWxsKSB7XG4gICAgICAgIHByb21pc2UuX2xpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBjYiA9IHByb21pc2UuX3N0YXRlID8gbGlzdGVuZXIub25GdWxmaWxsZWQgOiBsaXN0ZW5lci5vblJlamVjdGVkO1xuICAgIGlmIChjYiA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUaGlzIExpc3RlbmVyIGRvZXNudCBoYXZlIGEgbGlzdGVuZXIgZm9yIHRoZSBldmVudCBiZWluZyB0cmlnZ2VyZWQgKG9uRnVsZmlsbGVkIG9yIG9uUmVqZWN0KSBzbyBsZXRzIGZvcndhcmQgdGhlIGV2ZW50IHRvIGFueSBldmVudHVhbCBsaXN0ZW5lcnMgb24gdGhlIFByb21pc2UgaW5zdGFuY2UgcmV0dXJuZWQgYnkgdGhlbigpIG9yIGNhdGNoKClcbiAgICAgICAgcmV0dXJuIChwcm9taXNlLl9zdGF0ZSA/IGxpc3RlbmVyLnJlc29sdmUgOiBsaXN0ZW5lci5yZWplY3QpKHByb21pc2UuX3ZhbHVlKTtcbiAgICB9XG4gICAgdmFyIHBzZCA9IGxpc3RlbmVyLnBzZDtcbiAgICArK3BzZC5yZWY7XG4gICAgKytudW1TY2hlZHVsZWRDYWxscztcbiAgICBhc2FwJDEoY2FsbExpc3RlbmVyLCBbY2IsIHByb21pc2UsIGxpc3RlbmVyXSk7XG59XG5cbmZ1bmN0aW9uIGNhbGxMaXN0ZW5lcihjYiwgcHJvbWlzZSwgbGlzdGVuZXIpIHtcbiAgICB2YXIgb3V0ZXJTY29wZSA9IFBTRDtcbiAgICB2YXIgcHNkID0gbGlzdGVuZXIucHNkO1xuICAgIHRyeSB7XG4gICAgICAgIGlmIChwc2QgIT09IG91dGVyU2NvcGUpIHtcbiAgICAgICAgICAgIC8vICoqS0VFUCoqIG91dGVyU2NvcGUuZW52ID0gd3JhcHBlcnMuc25hcHNob3QoKTsgLy8gU25hcHNob3Qgb3V0ZXJTY29wZSdzIGVudmlyb25tZW50LlxuICAgICAgICAgICAgUFNEID0gcHNkO1xuICAgICAgICAgICAgLy8gKipLRUVQKiogd3JhcHBlcnMucmVzdG9yZShwc2QuZW52KTsgLy8gUmVzdG9yZSBQU0QncyBlbnZpcm9ubWVudC5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBzdGF0aWMgdmFyaWFibGUgY3VycmVudEZ1bGZpbGxlciB0byB0aGUgcHJvbWlzZSB0aGF0IGlzIGJlaW5nIGZ1bGxmaWxsZWQsXG4gICAgICAgIC8vIHNvIHRoYXQgd2UgY29ubmVjdCB0aGUgY2hhaW4gb2YgcHJvbWlzZXMgKGZvciBsb25nIHN0YWNrcyBzdXBwb3J0KVxuICAgICAgICBjdXJyZW50RnVsZmlsbGVyID0gcHJvbWlzZTtcblxuICAgICAgICAvLyBDYWxsIGNhbGxiYWNrIGFuZCByZXNvbHZlIG91ciBsaXN0ZW5lciB3aXRoIGl0J3MgcmV0dXJuIHZhbHVlLlxuICAgICAgICB2YXIgdmFsdWUgPSBwcm9taXNlLl92YWx1ZSxcbiAgICAgICAgICAgIHJldDtcbiAgICAgICAgaWYgKHByb21pc2UuX3N0YXRlKSB7XG4gICAgICAgICAgICByZXQgPSBjYih2YWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAocmVqZWN0aW5nRXJyb3JzLmxlbmd0aCkgcmVqZWN0aW5nRXJyb3JzID0gW107XG4gICAgICAgICAgICByZXQgPSBjYih2YWx1ZSk7XG4gICAgICAgICAgICBpZiAocmVqZWN0aW5nRXJyb3JzLmluZGV4T2YodmFsdWUpID09PSAtMSkgbWFya0Vycm9yQXNIYW5kbGVkKHByb21pc2UpOyAvLyBDYWxsYmFjayBkaWRudCBkbyBQcm9taXNlLnJlamVjdChlcnIpIG5vciByZWplY3QoZXJyKSBvbnRvIGFub3RoZXIgcHJvbWlzZS5cbiAgICAgICAgfVxuICAgICAgICBsaXN0ZW5lci5yZXNvbHZlKHJldCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBFeGNlcHRpb24gdGhyb3duIGluIGNhbGxiYWNrLiBSZWplY3Qgb3VyIGxpc3RlbmVyLlxuICAgICAgICBsaXN0ZW5lci5yZWplY3QoZSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgICAgLy8gUmVzdG9yZSBQU0QsIGVudiBhbmQgY3VycmVudEZ1bGZpbGxlci5cbiAgICAgICAgaWYgKHBzZCAhPT0gb3V0ZXJTY29wZSkge1xuICAgICAgICAgICAgUFNEID0gb3V0ZXJTY29wZTtcbiAgICAgICAgICAgIC8vICoqS0VFUCoqIHdyYXBwZXJzLnJlc3RvcmUob3V0ZXJTY29wZS5lbnYpOyAvLyBSZXN0b3JlIG91dGVyU2NvcGUncyBlbnZpcm9ubWVudFxuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnRGdWxmaWxsZXIgPSBudWxsO1xuICAgICAgICBpZiAoLS1udW1TY2hlZHVsZWRDYWxscyA9PT0gMCkgZmluYWxpemVQaHlzaWNhbFRpY2soKTtcbiAgICAgICAgLS1wc2QucmVmIHx8IHBzZC5maW5hbGl6ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0U3RhY2socHJvbWlzZSwgc3RhY2tzLCBsaW1pdCkge1xuICAgIGlmIChzdGFja3MubGVuZ3RoID09PSBsaW1pdCkgcmV0dXJuIHN0YWNrcztcbiAgICB2YXIgc3RhY2sgPSBcIlwiO1xuICAgIGlmIChwcm9taXNlLl9zdGF0ZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgdmFyIGZhaWx1cmUgPSBwcm9taXNlLl92YWx1ZSxcbiAgICAgICAgICAgIGVycm9yTmFtZSxcbiAgICAgICAgICAgIG1lc3NhZ2U7XG5cbiAgICAgICAgaWYgKGZhaWx1cmUgIT0gbnVsbCkge1xuICAgICAgICAgICAgZXJyb3JOYW1lID0gZmFpbHVyZS5uYW1lIHx8IFwiRXJyb3JcIjtcbiAgICAgICAgICAgIG1lc3NhZ2UgPSBmYWlsdXJlLm1lc3NhZ2UgfHwgZmFpbHVyZTtcbiAgICAgICAgICAgIHN0YWNrID0gcHJldHR5U3RhY2soZmFpbHVyZSwgMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlcnJvck5hbWUgPSBmYWlsdXJlOyAvLyBJZiBlcnJvciBpcyB1bmRlZmluZWQgb3IgbnVsbCwgc2hvdyB0aGF0LlxuICAgICAgICAgICAgbWVzc2FnZSA9IFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgc3RhY2tzLnB1c2goZXJyb3JOYW1lICsgKG1lc3NhZ2UgPyBcIjogXCIgKyBtZXNzYWdlIDogXCJcIikgKyBzdGFjayk7XG4gICAgfVxuICAgIGlmIChkZWJ1Zykge1xuICAgICAgICBzdGFjayA9IHByZXR0eVN0YWNrKHByb21pc2UuX3N0YWNrSG9sZGVyLCAyKTtcbiAgICAgICAgaWYgKHN0YWNrICYmIHN0YWNrcy5pbmRleE9mKHN0YWNrKSA9PT0gLTEpIHN0YWNrcy5wdXNoKHN0YWNrKTtcbiAgICAgICAgaWYgKHByb21pc2UuX3ByZXYpIGdldFN0YWNrKHByb21pc2UuX3ByZXYsIHN0YWNrcywgbGltaXQpO1xuICAgIH1cbiAgICByZXR1cm4gc3RhY2tzO1xufVxuXG5mdW5jdGlvbiBsaW5rVG9QcmV2aW91c1Byb21pc2UocHJvbWlzZSwgcHJldikge1xuICAgIC8vIFN1cHBvcnQgbG9uZyBzdGFja3MgYnkgbGlua2luZyB0byBwcmV2aW91cyBjb21wbGV0ZWQgcHJvbWlzZS5cbiAgICB2YXIgbnVtUHJldiA9IHByZXYgPyBwcmV2Ll9udW1QcmV2ICsgMSA6IDA7XG4gICAgaWYgKG51bVByZXYgPCBMT05HX1NUQUNLU19DTElQX0xJTUlUKSB7XG4gICAgICAgIC8vIFByb2hpYml0IGluZmluaXRlIFByb21pc2UgbG9vcHMgdG8gZ2V0IGFuIGluZmluaXRlIGxvbmcgbWVtb3J5IGNvbnN1bWluZyBcInRhaWxcIi5cbiAgICAgICAgcHJvbWlzZS5fcHJldiA9IHByZXY7XG4gICAgICAgIHByb21pc2UuX251bVByZXYgPSBudW1QcmV2O1xuICAgIH1cbn1cblxuLyogVGhlIGNhbGxiYWNrIHRvIHNjaGVkdWxlIHdpdGggc2V0SW1tZWRpYXRlKCkgb3Igc2V0VGltZW91dCgpLlxyXG4gICBJdCBydW5zIGEgdmlydHVhbCBtaWNyb3RpY2sgYW5kIGV4ZWN1dGVzIGFueSBjYWxsYmFjayByZWdpc3RlcmVkIGluIG1pY3JvdGlja1F1ZXVlLlxyXG4gKi9cbmZ1bmN0aW9uIHBoeXNpY2FsVGljaygpIHtcbiAgICBiZWdpbk1pY3JvVGlja1Njb3BlKCkgJiYgZW5kTWljcm9UaWNrU2NvcGUoKTtcbn1cblxuZnVuY3Rpb24gYmVnaW5NaWNyb1RpY2tTY29wZSgpIHtcbiAgICB2YXIgd2FzUm9vdEV4ZWMgPSBpc091dHNpZGVNaWNyb1RpY2s7XG4gICAgaXNPdXRzaWRlTWljcm9UaWNrID0gZmFsc2U7XG4gICAgbmVlZHNOZXdQaHlzaWNhbFRpY2sgPSBmYWxzZTtcbiAgICByZXR1cm4gd2FzUm9vdEV4ZWM7XG59XG5cbi8qIEV4ZWN1dGVzIG1pY3JvLXRpY2tzIHdpdGhvdXQgZG9pbmcgdHJ5Li5jYXRjaC5cclxuICAgVGhpcyBjYW4gYmUgcG9zc2libGUgYmVjYXVzZSB3ZSBvbmx5IHVzZSB0aGlzIGludGVybmFsbHkgYW5kXHJcbiAgIHRoZSByZWdpc3RlcmVkIGZ1bmN0aW9ucyBhcmUgZXhjZXB0aW9uLXNhZmUgKHRoZXkgZG8gdHJ5Li5jYXRjaFxyXG4gICBpbnRlcm5hbGx5IGJlZm9yZSBjYWxsaW5nIGFueSBleHRlcm5hbCBtZXRob2QpLiBJZiByZWdpc3RlcmluZ1xyXG4gICBmdW5jdGlvbnMgaW4gdGhlIG1pY3JvdGlja1F1ZXVlIHRoYXQgYXJlIG5vdCBleGNlcHRpb24tc2FmZSwgdGhpc1xyXG4gICB3b3VsZCBkZXN0cm95IHRoZSBmcmFtZXdvcmsgYW5kIG1ha2UgaXQgaW5zdGFibGUuIFNvIHdlIGRvbid0IGV4cG9ydFxyXG4gICBvdXIgYXNhcCBtZXRob2QuXHJcbiovXG5mdW5jdGlvbiBlbmRNaWNyb1RpY2tTY29wZSgpIHtcbiAgICB2YXIgY2FsbGJhY2tzLCBpLCBsO1xuICAgIGRvIHtcbiAgICAgICAgd2hpbGUgKG1pY3JvdGlja1F1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNhbGxiYWNrcyA9IG1pY3JvdGlja1F1ZXVlO1xuICAgICAgICAgICAgbWljcm90aWNrUXVldWUgPSBbXTtcbiAgICAgICAgICAgIGwgPSBjYWxsYmFja3MubGVuZ3RoO1xuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gY2FsbGJhY2tzW2ldO1xuICAgICAgICAgICAgICAgIGl0ZW1bMF0uYXBwbHkobnVsbCwgaXRlbVsxXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IHdoaWxlIChtaWNyb3RpY2tRdWV1ZS5sZW5ndGggPiAwKTtcbiAgICBpc091dHNpZGVNaWNyb1RpY2sgPSB0cnVlO1xuICAgIG5lZWRzTmV3UGh5c2ljYWxUaWNrID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZmluYWxpemVQaHlzaWNhbFRpY2soKSB7XG4gICAgdmFyIHVuaGFuZGxlZEVycnMgPSB1bmhhbmRsZWRFcnJvcnM7XG4gICAgdW5oYW5kbGVkRXJyb3JzID0gW107XG4gICAgdW5oYW5kbGVkRXJycy5mb3JFYWNoKGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHAuX1BTRC5vbnVuaGFuZGxlZC5jYWxsKG51bGwsIHAuX3ZhbHVlLCBwKTtcbiAgICB9KTtcbiAgICB2YXIgZmluYWxpemVycyA9IHRpY2tGaW5hbGl6ZXJzLnNsaWNlKDApOyAvLyBDbG9uZSBmaXJzdCBiZWNhdXNlIGZpbmFsaXplciBtYXkgcmVtb3ZlIGl0c2VsZiBmcm9tIGxpc3QuXG4gICAgdmFyIGkgPSBmaW5hbGl6ZXJzLmxlbmd0aDtcbiAgICB3aGlsZSAoaSkge1xuICAgICAgICBmaW5hbGl6ZXJzWy0taV0oKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJ1bl9hdF9lbmRfb2ZfdGhpc19vcl9uZXh0X3BoeXNpY2FsX3RpY2soZm4pIHtcbiAgICBmdW5jdGlvbiBmaW5hbGl6ZXIoKSB7XG4gICAgICAgIGZuKCk7XG4gICAgICAgIHRpY2tGaW5hbGl6ZXJzLnNwbGljZSh0aWNrRmluYWxpemVycy5pbmRleE9mKGZpbmFsaXplciksIDEpO1xuICAgIH1cbiAgICB0aWNrRmluYWxpemVycy5wdXNoKGZpbmFsaXplcik7XG4gICAgKytudW1TY2hlZHVsZWRDYWxscztcbiAgICBhc2FwJDEoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoLS1udW1TY2hlZHVsZWRDYWxscyA9PT0gMCkgZmluYWxpemVQaHlzaWNhbFRpY2soKTtcbiAgICB9LCBbXSk7XG59XG5cbmZ1bmN0aW9uIGFkZFBvc3NpYmx5VW5oYW5kbGVkRXJyb3IocHJvbWlzZSkge1xuICAgIC8vIE9ubHkgYWRkIHRvIHVuaGFuZGxlZEVycm9ycyBpZiBub3QgYWxyZWFkeSB0aGVyZS4gVGhlIGZpcnN0IG9uZSB0byBhZGQgdG8gdGhpcyBsaXN0XG4gICAgLy8gd2lsbCBiZSB1cG9uIHRoZSBmaXJzdCByZWplY3Rpb24gc28gdGhhdCB0aGUgcm9vdCBjYXVzZSAoZmlyc3QgcHJvbWlzZSBpbiB0aGVcbiAgICAvLyByZWplY3Rpb24gY2hhaW4pIGlzIHRoZSBvbmUgbGlzdGVkLlxuICAgIGlmICghdW5oYW5kbGVkRXJyb3JzLnNvbWUoZnVuY3Rpb24gKHApIHtcbiAgICAgICAgcmV0dXJuIHAuX3ZhbHVlID09PSBwcm9taXNlLl92YWx1ZTtcbiAgICB9KSkgdW5oYW5kbGVkRXJyb3JzLnB1c2gocHJvbWlzZSk7XG59XG5cbmZ1bmN0aW9uIG1hcmtFcnJvckFzSGFuZGxlZChwcm9taXNlKSB7XG4gICAgLy8gQ2FsbGVkIHdoZW4gYSByZWplY3QgaGFuZGxlZCBpcyBhY3R1YWxseSBiZWluZyBjYWxsZWQuXG4gICAgLy8gU2VhcmNoIGluIHVuaGFuZGxlZEVycm9ycyBmb3IgYW55IHByb21pc2Ugd2hvcyBfdmFsdWUgaXMgdGhpcyBwcm9taXNlX3ZhbHVlIChsaXN0XG4gICAgLy8gY29udGFpbnMgb25seSByZWplY3RlZCBwcm9taXNlcywgYW5kIG9ubHkgb25lIGl0ZW0gcGVyIGVycm9yKVxuICAgIHZhciBpID0gdW5oYW5kbGVkRXJyb3JzLmxlbmd0aDtcbiAgICB3aGlsZSAoaSkge1xuICAgICAgICBpZiAodW5oYW5kbGVkRXJyb3JzWy0taV0uX3ZhbHVlID09PSBwcm9taXNlLl92YWx1ZSkge1xuICAgICAgICAgICAgLy8gRm91bmQgYSBwcm9taXNlIHRoYXQgZmFpbGVkIHdpdGggdGhpcyBzYW1lIGVycm9yIG9iamVjdCBwb2ludGVyLFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoYXQgc2luY2UgdGhlcmUgaXMgYSBsaXN0ZW5lciB0aGF0IGFjdHVhbGx5IHRha2VzIGNhcmUgb2YgaXQuXG4gICAgICAgICAgICB1bmhhbmRsZWRFcnJvcnMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgfVxufVxuXG4vLyBCeSBkZWZhdWx0LCBsb2cgdW5jYXVnaHQgZXJyb3JzIHRvIHRoZSBjb25zb2xlXG5mdW5jdGlvbiBkZWZhdWx0RXJyb3JIYW5kbGVyKGUpIHtcbiAgICBjb25zb2xlLndhcm4oJ1VuaGFuZGxlZCByZWplY3Rpb246ICcgKyAoZS5zdGFjayB8fCBlKSk7XG59XG5cbmZ1bmN0aW9uIFByb21pc2VSZWplY3QocmVhc29uKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKElOVEVSTkFMLCBmYWxzZSwgcmVhc29uKTtcbn1cblxuZnVuY3Rpb24gd3JhcChmbiwgZXJyb3JDYXRjaGVyKSB7XG4gICAgdmFyIHBzZCA9IFBTRDtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgd2FzUm9vdEV4ZWMgPSBiZWdpbk1pY3JvVGlja1Njb3BlKCksXG4gICAgICAgICAgICBvdXRlclNjb3BlID0gUFNEO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAob3V0ZXJTY29wZSAhPT0gcHNkKSB7XG4gICAgICAgICAgICAgICAgLy8gKipLRUVQKiogb3V0ZXJTY29wZS5lbnYgPSB3cmFwcGVycy5zbmFwc2hvdCgpOyAvLyBTbmFwc2hvdCBvdXRlclNjb3BlJ3MgZW52aXJvbm1lbnRcbiAgICAgICAgICAgICAgICBQU0QgPSBwc2Q7XG4gICAgICAgICAgICAgICAgLy8gKipLRUVQKiogd3JhcHBlcnMucmVzdG9yZShwc2QuZW52KTsgLy8gUmVzdG9yZSBQU0QncyBlbnZpcm9ubWVudC5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBlcnJvckNhdGNoZXIgJiYgZXJyb3JDYXRjaGVyKGUpO1xuICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgaWYgKG91dGVyU2NvcGUgIT09IHBzZCkge1xuICAgICAgICAgICAgICAgIFBTRCA9IG91dGVyU2NvcGU7XG4gICAgICAgICAgICAgICAgLy8gKipLRUVQKiogd3JhcHBlcnMucmVzdG9yZShvdXRlclNjb3BlLmVudik7IC8vIFJlc3RvcmUgb3V0ZXJTY29wZSdzIGVudmlyb25tZW50XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAod2FzUm9vdEV4ZWMpIGVuZE1pY3JvVGlja1Njb3BlKCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBuZXdTY29wZShmbiwgYTEsIGEyLCBhMykge1xuICAgIHZhciBwYXJlbnQgPSBQU0QsXG4gICAgICAgIHBzZCA9IE9iamVjdC5jcmVhdGUocGFyZW50KTtcbiAgICBwc2QucGFyZW50ID0gcGFyZW50O1xuICAgIHBzZC5yZWYgPSAwO1xuICAgIHBzZC5nbG9iYWwgPSBmYWxzZTtcbiAgICAvLyAqKktFRVAqKiBwc2QuZW52ID0gd3JhcHBlcnMud3JhcChwc2QpO1xuXG4gICAgLy8gdW5oYW5kbGVkcyBhbmQgb251bmhhbmRsZWQgc2hvdWxkIG5vdCBiZSBzcGVjaWZpY2FsbHkgc2V0IGhlcmUuXG4gICAgLy8gTGVhdmUgdGhlbSBvbiBwYXJlbnQgcHJvdG90eXBlLlxuICAgIC8vIHVuaGFuZGxlZHMucHVzaChlcnIpIHdpbGwgcHVzaCB0byBwYXJlbnQncyBwcm90b3R5cGVcbiAgICAvLyBvbnVuaGFuZGxlZCgpIHdpbGwgY2FsbCBwYXJlbnRzIG9udW5oYW5kbGVkICh3aXRoIHRoaXMgc2NvcGUncyB0aGlzLXBvaW50ZXIgdGhvdWdoISlcbiAgICArK3BhcmVudC5yZWY7XG4gICAgcHNkLmZpbmFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAtLXRoaXMucGFyZW50LnJlZiB8fCB0aGlzLnBhcmVudC5maW5hbGl6ZSgpO1xuICAgIH07XG4gICAgdmFyIHJ2ID0gdXNlUFNEKHBzZCwgZm4sIGExLCBhMiwgYTMpO1xuICAgIGlmIChwc2QucmVmID09PSAwKSBwc2QuZmluYWxpemUoKTtcbiAgICByZXR1cm4gcnY7XG59XG5cbmZ1bmN0aW9uIHVzZVBTRChwc2QsIGZuLCBhMSwgYTIsIGEzKSB7XG4gICAgdmFyIG91dGVyU2NvcGUgPSBQU0Q7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHBzZCAhPT0gb3V0ZXJTY29wZSkge1xuICAgICAgICAgICAgLy8gKipLRUVQKiogb3V0ZXJTY29wZS5lbnYgPSB3cmFwcGVycy5zbmFwc2hvdCgpOyAvLyBzbmFwc2hvdCBvdXRlclNjb3BlJ3MgZW52aXJvbm1lbnQuXG4gICAgICAgICAgICBQU0QgPSBwc2Q7XG4gICAgICAgICAgICAvLyAqKktFRVAqKiB3cmFwcGVycy5yZXN0b3JlKHBzZC5lbnYpOyAvLyBSZXN0b3JlIFBTRCdzIGVudmlyb25tZW50LlxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmbihhMSwgYTIsIGEzKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAocHNkICE9PSBvdXRlclNjb3BlKSB7XG4gICAgICAgICAgICBQU0QgPSBvdXRlclNjb3BlO1xuICAgICAgICAgICAgLy8gKipLRUVQKiogd3JhcHBlcnMucmVzdG9yZShvdXRlclNjb3BlLmVudik7IC8vIFJlc3RvcmUgb3V0ZXJTY29wZSdzIGVudmlyb25tZW50LlxuICAgICAgICB9XG4gICAgfVxufVxuXG52YXIgVU5IQU5ETEVEUkVKRUNUSU9OID0gXCJ1bmhhbmRsZWRyZWplY3Rpb25cIjtcblxuZnVuY3Rpb24gZ2xvYmFsRXJyb3IoZXJyLCBwcm9taXNlKSB7XG4gICAgdmFyIHJ2O1xuICAgIHRyeSB7XG4gICAgICAgIHJ2ID0gcHJvbWlzZS5vbnVuY2F0Y2hlZChlcnIpO1xuICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgaWYgKHJ2ICE9PSBmYWxzZSkgdHJ5IHtcbiAgICAgICAgdmFyIGV2ZW50LFxuICAgICAgICAgICAgZXZlbnREYXRhID0geyBwcm9taXNlOiBwcm9taXNlLCByZWFzb246IGVyciB9O1xuICAgICAgICBpZiAoX2dsb2JhbC5kb2N1bWVudCAmJiBkb2N1bWVudC5jcmVhdGVFdmVudCkge1xuICAgICAgICAgICAgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudChVTkhBTkRMRURSRUpFQ1RJT04sIHRydWUsIHRydWUpO1xuICAgICAgICAgICAgZXh0ZW5kKGV2ZW50LCBldmVudERhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKF9nbG9iYWwuQ3VzdG9tRXZlbnQpIHtcbiAgICAgICAgICAgIGV2ZW50ID0gbmV3IEN1c3RvbUV2ZW50KFVOSEFORExFRFJFSkVDVElPTiwgeyBkZXRhaWw6IGV2ZW50RGF0YSB9KTtcbiAgICAgICAgICAgIGV4dGVuZChldmVudCwgZXZlbnREYXRhKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXZlbnQgJiYgX2dsb2JhbC5kaXNwYXRjaEV2ZW50KSB7XG4gICAgICAgICAgICBkaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgICAgIGlmICghX2dsb2JhbC5Qcm9taXNlUmVqZWN0aW9uRXZlbnQgJiYgX2dsb2JhbC5vbnVuaGFuZGxlZHJlamVjdGlvbilcbiAgICAgICAgICAgICAgICAvLyBObyBuYXRpdmUgc3VwcG9ydCBmb3IgUHJvbWlzZVJlamVjdGlvbkV2ZW50IGJ1dCB1c2VyIGhhcyBzZXQgd2luZG93Lm9udW5oYW5kbGVkcmVqZWN0aW9uLiBNYW51YWxseSBjYWxsIGl0LlxuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIF9nbG9iYWwub251bmhhbmRsZWRyZWplY3Rpb24oZXZlbnQpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKF8pIHt9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFldmVudC5kZWZhdWx0UHJldmVudGVkKSB7XG4gICAgICAgICAgICAvLyBCYWNrd2FyZCBjb21wYXRpYmlsaXR5OiBmaXJlIHRvIGV2ZW50cyByZWdpc3RlcmVkIGF0IFByb21pc2Uub24uZXJyb3JcbiAgICAgICAgICAgIFByb21pc2Uub24uZXJyb3IuZmlyZShlcnIsIHByb21pc2UpO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge31cbn1cblxuLyogKipLRUVQKiogXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gd3JhcFByb21pc2UoUHJvbWlzZUNsYXNzKSB7XHJcbiAgICB2YXIgcHJvdG8gPSBQcm9taXNlQ2xhc3MucHJvdG90eXBlO1xyXG4gICAgdmFyIG9yaWdUaGVuID0gcHJvdG8udGhlbjtcclxuICAgIFxyXG4gICAgd3JhcHBlcnMuYWRkKHtcclxuICAgICAgICBzbmFwc2hvdDogKCkgPT4gcHJvdG8udGhlbixcclxuICAgICAgICByZXN0b3JlOiB2YWx1ZSA9PiB7cHJvdG8udGhlbiA9IHZhbHVlO30sXHJcbiAgICAgICAgd3JhcDogKCkgPT4gcGF0Y2hlZFRoZW5cclxuICAgIH0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIHBhdGNoZWRUaGVuIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xyXG4gICAgICAgIHZhciBwcm9taXNlID0gdGhpcztcclxuICAgICAgICB2YXIgb25GdWxmaWxsZWRQcm94eSA9IHdyYXAoZnVuY3Rpb24odmFsdWUpe1xyXG4gICAgICAgICAgICB2YXIgcnYgPSB2YWx1ZTtcclxuICAgICAgICAgICAgaWYgKG9uRnVsZmlsbGVkKSB7XHJcbiAgICAgICAgICAgICAgICBydiA9IG9uRnVsZmlsbGVkKHJ2KTtcclxuICAgICAgICAgICAgICAgIGlmIChydiAmJiB0eXBlb2YgcnYudGhlbiA9PT0gJ2Z1bmN0aW9uJykgcnYudGhlbigpOyAvLyBJbnRlcmNlcHQgdGhhdCBwcm9taXNlIGFzIHdlbGwuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLS1QU0QucmVmIHx8IFBTRC5maW5hbGl6ZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gcnY7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdmFyIG9uUmVqZWN0ZWRQcm94eSA9IHdyYXAoZnVuY3Rpb24oZXJyKXtcclxuICAgICAgICAgICAgcHJvbWlzZS5fJGVyciA9IGVycjtcclxuICAgICAgICAgICAgdmFyIHVuaGFuZGxlZHMgPSBQU0QudW5oYW5kbGVkcztcclxuICAgICAgICAgICAgdmFyIGlkeCA9IHVuaGFuZGxlZHMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgcnY7XHJcbiAgICAgICAgICAgIHdoaWxlIChpZHgtLSkgaWYgKHVuaGFuZGxlZHNbaWR4XS5fJGVyciA9PT0gZXJyKSBicmVhaztcclxuICAgICAgICAgICAgaWYgKG9uUmVqZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB1bmhhbmRsZWRzLnNwbGljZShpZHgsIDEpOyAvLyBNYXJrIGFzIGhhbmRsZWQuXHJcbiAgICAgICAgICAgICAgICBydiA9IG9uUmVqZWN0ZWQoZXJyKTtcclxuICAgICAgICAgICAgICAgIGlmIChydiAmJiB0eXBlb2YgcnYudGhlbiA9PT0gJ2Z1bmN0aW9uJykgcnYudGhlbigpOyAvLyBJbnRlcmNlcHQgdGhhdCBwcm9taXNlIGFzIHdlbGwuXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaWR4ID09PSAtMSkgdW5oYW5kbGVkcy5wdXNoKHByb21pc2UpO1xyXG4gICAgICAgICAgICAgICAgcnYgPSBQcm9taXNlQ2xhc3MucmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICBydi5fJG5vaW50ZXJjZXB0ID0gdHJ1ZTsgLy8gUHJvaGliaXQgZXRlcm5hbCBsb29wLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC0tUFNELnJlZiB8fCBQU0QuZmluYWxpemUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJ2O1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLl8kbm9pbnRlcmNlcHQpIHJldHVybiBvcmlnVGhlbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgICAgICsrUFNELnJlZjtcclxuICAgICAgICByZXR1cm4gb3JpZ1RoZW4uY2FsbCh0aGlzLCBvbkZ1bGZpbGxlZFByb3h5LCBvblJlamVjdGVkUHJveHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyBHbG9iYWwgUHJvbWlzZSB3cmFwcGVyXHJcbmlmIChfZ2xvYmFsLlByb21pc2UpIHdyYXBQcm9taXNlKF9nbG9iYWwuUHJvbWlzZSk7XHJcblxyXG4qL1xuXG5kb0Zha2VBdXRvQ29tcGxldGUoZnVuY3Rpb24gKCkge1xuICAgIC8vIFNpbXBsaWZ5IHRoZSBqb2IgZm9yIFZTIEludGVsbGlzZW5zZS4gVGhpcyBwaWVjZSBvZiBjb2RlIGlzIG9uZSBvZiB0aGUga2V5cyB0byB0aGUgbmV3IG1hcnZlbGxvdXMgaW50ZWxsaXNlbnNlIHN1cHBvcnQgaW4gRGV4aWUuXG4gICAgYXNhcCQxID0gZnVuY3Rpb24gKGZuLCBhcmdzKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJncyk7XG4gICAgICAgIH0sIDApO1xuICAgIH07XG59KTtcblxuZnVuY3Rpb24gcmVqZWN0aW9uKGVyciwgdW5jYXVnaHRIYW5kbGVyKSB7XG4gICAgLy8gR2V0IHRoZSBjYWxsIHN0YWNrIGFuZCByZXR1cm4gYSByZWplY3RlZCBwcm9taXNlLlxuICAgIHZhciBydiA9IFByb21pc2UucmVqZWN0KGVycik7XG4gICAgcmV0dXJuIHVuY2F1Z2h0SGFuZGxlciA/IHJ2LnVuY2F1Z2h0KHVuY2F1Z2h0SGFuZGxlcikgOiBydjtcbn1cblxuLypcclxuICogRGV4aWUuanMgLSBhIG1pbmltYWxpc3RpYyB3cmFwcGVyIGZvciBJbmRleGVkREJcclxuICogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICpcclxuICogQnkgRGF2aWQgRmFobGFuZGVyLCBkYXZpZC5mYWhsYW5kZXJAZ21haWwuY29tXHJcbiAqXHJcbiAqIFZlcnNpb24gMS41LjEsIFR1ZSBOb3YgMDEgMjAxNlxyXG4gKlxyXG4gKiBodHRwOi8vZGV4aWUub3JnXHJcbiAqXHJcbiAqIEFwYWNoZSBMaWNlbnNlIFZlcnNpb24gMi4wLCBKYW51YXJ5IDIwMDQsIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9cclxuICovXG5cbnZhciBERVhJRV9WRVJTSU9OID0gJzEuNS4xJztcbnZhciBtYXhTdHJpbmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDY1NTM1KTtcbnZhciBtYXhLZXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgSURCS2V5UmFuZ2Uub25seShbW11dKTtyZXR1cm4gW1tdXTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBtYXhTdHJpbmc7XG4gICAgfVxufSgpO1xudmFyIElOVkFMSURfS0VZX0FSR1VNRU5UID0gXCJJbnZhbGlkIGtleSBwcm92aWRlZC4gS2V5cyBtdXN0IGJlIG9mIHR5cGUgc3RyaW5nLCBudW1iZXIsIERhdGUgb3IgQXJyYXk8c3RyaW5nIHwgbnVtYmVyIHwgRGF0ZT4uXCI7XG52YXIgU1RSSU5HX0VYUEVDVEVEID0gXCJTdHJpbmcgZXhwZWN0ZWQuXCI7XG52YXIgY29ubmVjdGlvbnMgPSBbXTtcbnZhciBpc0lFT3JFZGdlID0gdHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiYgLyhNU0lFfFRyaWRlbnR8RWRnZSkvLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG52YXIgaGFzSUVEZWxldGVPYmplY3RTdG9yZUJ1ZyA9IGlzSUVPckVkZ2U7XG52YXIgaGFuZ3NPbkRlbGV0ZUxhcmdlS2V5UmFuZ2UgPSBpc0lFT3JFZGdlO1xudmFyIGRleGllU3RhY2tGcmFtZUZpbHRlciA9IGZ1bmN0aW9uIChmcmFtZSkge1xuICAgIHJldHVybiAhLyhkZXhpZVxcLmpzfGRleGllXFwubWluXFwuanMpLy50ZXN0KGZyYW1lKTtcbn07XG5cbnNldERlYnVnKGRlYnVnLCBkZXhpZVN0YWNrRnJhbWVGaWx0ZXIpO1xuXG5mdW5jdGlvbiBEZXhpZShkYk5hbWUsIG9wdGlvbnMpIHtcbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJvcHRpb25zXCIgdHlwZT1cIk9iamVjdFwiIG9wdGlvbmFsPVwidHJ1ZVwiPlNwZWNpZnkgb25seSBpZiB5b3Ugd2ljaCB0byBjb250cm9sIHdoaWNoIGFkZG9ucyB0aGF0IHNob3VsZCBydW4gb24gdGhpcyBpbnN0YW5jZTwvcGFyYW0+XG4gICAgdmFyIGRlcHMgPSBEZXhpZS5kZXBlbmRlbmNpZXM7XG4gICAgdmFyIG9wdHMgPSBleHRlbmQoe1xuICAgICAgICAvLyBEZWZhdWx0IE9wdGlvbnNcbiAgICAgICAgYWRkb25zOiBEZXhpZS5hZGRvbnMsIC8vIFBpY2sgc3RhdGljYWxseSByZWdpc3RlcmVkIGFkZG9ucyBieSBkZWZhdWx0XG4gICAgICAgIGF1dG9PcGVuOiB0cnVlLCAvLyBEb24ndCByZXF1aXJlIGRiLm9wZW4oKSBleHBsaWNpdGVseS5cbiAgICAgICAgaW5kZXhlZERCOiBkZXBzLmluZGV4ZWREQiwgLy8gQmFja2VuZCBJbmRleGVkREIgYXBpLiBEZWZhdWx0IHRvIElEQlNoaW0gb3IgYnJvd3NlciBlbnYuXG4gICAgICAgIElEQktleVJhbmdlOiBkZXBzLklEQktleVJhbmdlIC8vIEJhY2tlbmQgSURCS2V5UmFuZ2UgYXBpLiBEZWZhdWx0IHRvIElEQlNoaW0gb3IgYnJvd3NlciBlbnYuXG4gICAgfSwgb3B0aW9ucyk7XG4gICAgdmFyIGFkZG9ucyA9IG9wdHMuYWRkb25zLFxuICAgICAgICBhdXRvT3BlbiA9IG9wdHMuYXV0b09wZW4sXG4gICAgICAgIGluZGV4ZWREQiA9IG9wdHMuaW5kZXhlZERCLFxuICAgICAgICBJREJLZXlSYW5nZSA9IG9wdHMuSURCS2V5UmFuZ2U7XG5cbiAgICB2YXIgZ2xvYmFsU2NoZW1hID0gdGhpcy5fZGJTY2hlbWEgPSB7fTtcbiAgICB2YXIgdmVyc2lvbnMgPSBbXTtcbiAgICB2YXIgZGJTdG9yZU5hbWVzID0gW107XG4gICAgdmFyIGFsbFRhYmxlcyA9IHt9O1xuICAgIC8vLzx2YXIgdHlwZT1cIklEQkRhdGFiYXNlXCIgLz5cbiAgICB2YXIgaWRiZGIgPSBudWxsOyAvLyBJbnN0YW5jZSBvZiBJREJEYXRhYmFzZVxuICAgIHZhciBkYk9wZW5FcnJvciA9IG51bGw7XG4gICAgdmFyIGlzQmVpbmdPcGVuZWQgPSBmYWxzZTtcbiAgICB2YXIgb3BlbkNvbXBsZXRlID0gZmFsc2U7XG4gICAgdmFyIFJFQURPTkxZID0gXCJyZWFkb25seVwiLFxuICAgICAgICBSRUFEV1JJVEUgPSBcInJlYWR3cml0ZVwiO1xuICAgIHZhciBkYiA9IHRoaXM7XG4gICAgdmFyIGRiUmVhZHlSZXNvbHZlLFxuICAgICAgICBkYlJlYWR5UHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlKSB7XG4gICAgICAgIGRiUmVhZHlSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICB9KSxcbiAgICAgICAgY2FuY2VsT3BlbixcbiAgICAgICAgb3BlbkNhbmNlbGxlciA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgICAgY2FuY2VsT3BlbiA9IHJlamVjdDtcbiAgICB9KTtcbiAgICB2YXIgYXV0b1NjaGVtYSA9IHRydWU7XG4gICAgdmFyIGhhc05hdGl2ZUdldERhdGFiYXNlTmFtZXMgPSAhIWdldE5hdGl2ZUdldERhdGFiYXNlTmFtZXNGbihpbmRleGVkREIpLFxuICAgICAgICBoYXNHZXRBbGw7XG5cbiAgICBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICAvLyBEZWZhdWx0IHN1YnNjcmliZXJzIHRvIFwidmVyc2lvbmNoYW5nZVwiIGFuZCBcImJsb2NrZWRcIi5cbiAgICAgICAgLy8gQ2FuIGJlIG92ZXJyaWRkZW4gYnkgY3VzdG9tIGhhbmRsZXJzLiBJZiBjdXN0b20gaGFuZGxlcnMgcmV0dXJuIGZhbHNlLCB0aGVzZSBkZWZhdWx0XG4gICAgICAgIC8vIGJlaGF2aW91cnMgd2lsbCBiZSBwcmV2ZW50ZWQuXG4gICAgICAgIGRiLm9uKFwidmVyc2lvbmNoYW5nZVwiLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIC8vIERlZmF1bHQgYmVoYXZpb3IgZm9yIHZlcnNpb25jaGFuZ2UgZXZlbnQgaXMgdG8gY2xvc2UgZGF0YWJhc2UgY29ubmVjdGlvbi5cbiAgICAgICAgICAgIC8vIENhbGxlciBjYW4gb3ZlcnJpZGUgdGhpcyBiZWhhdmlvciBieSBkb2luZyBkYi5vbihcInZlcnNpb25jaGFuZ2VcIiwgZnVuY3Rpb24oKXsgcmV0dXJuIGZhbHNlOyB9KTtcbiAgICAgICAgICAgIC8vIExldCdzIG5vdCBibG9jayB0aGUgb3RoZXIgd2luZG93IGZyb20gbWFraW5nIGl0J3MgZGVsZXRlKCkgb3Igb3BlbigpIGNhbGwuXG4gICAgICAgICAgICAvLyBOT1RFISBUaGlzIGV2ZW50IGlzIG5ldmVyIGZpcmVkIGluIElFLEVkZ2Ugb3IgU2FmYXJpLlxuICAgICAgICAgICAgaWYgKGV2Lm5ld1ZlcnNpb24gPiAwKSBjb25zb2xlLndhcm4oJ0Fub3RoZXIgY29ubmVjdGlvbiB3YW50cyB0byB1cGdyYWRlIGRhdGFiYXNlIFxcJycgKyBkYi5uYW1lICsgJ1xcJy4gQ2xvc2luZyBkYiBub3cgdG8gcmVzdW1lIHRoZSB1cGdyYWRlLicpO2Vsc2UgY29uc29sZS53YXJuKCdBbm90aGVyIGNvbm5lY3Rpb24gd2FudHMgdG8gZGVsZXRlIGRhdGFiYXNlIFxcJycgKyBkYi5uYW1lICsgJ1xcJy4gQ2xvc2luZyBkYiBub3cgdG8gcmVzdW1lIHRoZSBkZWxldGUgcmVxdWVzdC4nKTtcbiAgICAgICAgICAgIGRiLmNsb3NlKCk7XG4gICAgICAgICAgICAvLyBJbiBtYW55IHdlYiBhcHBsaWNhdGlvbnMsIGl0IHdvdWxkIGJlIHJlY29tbWVuZGVkIHRvIGZvcmNlIHdpbmRvdy5yZWxvYWQoKVxuICAgICAgICAgICAgLy8gd2hlbiB0aGlzIGV2ZW50IG9jY3Vycy4gVG8gZG8gdGhhdCwgc3Vic2NyaWJlIHRvIHRoZSB2ZXJzaW9uY2hhbmdlIGV2ZW50XG4gICAgICAgICAgICAvLyBhbmQgY2FsbCB3aW5kb3cubG9jYXRpb24ucmVsb2FkKHRydWUpIGlmIGV2Lm5ld1ZlcnNpb24gPiAwIChub3QgYSBkZWxldGlvbilcbiAgICAgICAgICAgIC8vIFRoZSByZWFzb24gZm9yIHRoaXMgaXMgdGhhdCB5b3VyIGN1cnJlbnQgd2ViIGFwcCBvYnZpb3VzbHkgaGFzIG9sZCBzY2hlbWEgY29kZSB0aGF0IG5lZWRzXG4gICAgICAgICAgICAvLyB0byBiZSB1cGRhdGVkLiBBbm90aGVyIHdpbmRvdyBnb3QgYSBuZXdlciB2ZXJzaW9uIG9mIHRoZSBhcHAgYW5kIG5lZWRzIHRvIHVwZ3JhZGUgREIgYnV0XG4gICAgICAgICAgICAvLyB5b3VyIHdpbmRvdyBpcyBibG9ja2luZyBpdCB1bmxlc3Mgd2UgY2xvc2UgaXQgaGVyZS5cbiAgICAgICAgfSk7XG4gICAgICAgIGRiLm9uKFwiYmxvY2tlZFwiLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGlmICghZXYubmV3VmVyc2lvbiB8fCBldi5uZXdWZXJzaW9uIDwgZXYub2xkVmVyc2lvbikgY29uc29sZS53YXJuKCdEZXhpZS5kZWxldGUoXFwnJyArIGRiLm5hbWUgKyAnXFwnKSB3YXMgYmxvY2tlZCcpO2Vsc2UgY29uc29sZS53YXJuKCdVcGdyYWRlIFxcJycgKyBkYi5uYW1lICsgJ1xcJyBibG9ja2VkIGJ5IG90aGVyIGNvbm5lY3Rpb24gaG9sZGluZyB2ZXJzaW9uICcgKyBldi5vbGRWZXJzaW9uIC8gMTApO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIFZlcnNpb25pbmcgRnJhbWV3b3JrLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG5cbiAgICB0aGlzLnZlcnNpb24gPSBmdW5jdGlvbiAodmVyc2lvbk51bWJlcikge1xuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJ2ZXJzaW9uTnVtYmVyXCIgdHlwZT1cIk51bWJlclwiPjwvcGFyYW0+XG4gICAgICAgIC8vLyA8cmV0dXJucyB0eXBlPVwiVmVyc2lvblwiPjwvcmV0dXJucz5cbiAgICAgICAgaWYgKGlkYmRiIHx8IGlzQmVpbmdPcGVuZWQpIHRocm93IG5ldyBleGNlcHRpb25zLlNjaGVtYShcIkNhbm5vdCBhZGQgdmVyc2lvbiB3aGVuIGRhdGFiYXNlIGlzIG9wZW5cIik7XG4gICAgICAgIHRoaXMudmVybm8gPSBNYXRoLm1heCh0aGlzLnZlcm5vLCB2ZXJzaW9uTnVtYmVyKTtcbiAgICAgICAgdmFyIHZlcnNpb25JbnN0YW5jZSA9IHZlcnNpb25zLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHYuX2NmZy52ZXJzaW9uID09PSB2ZXJzaW9uTnVtYmVyO1xuICAgICAgICB9KVswXTtcbiAgICAgICAgaWYgKHZlcnNpb25JbnN0YW5jZSkgcmV0dXJuIHZlcnNpb25JbnN0YW5jZTtcbiAgICAgICAgdmVyc2lvbkluc3RhbmNlID0gbmV3IFZlcnNpb24odmVyc2lvbk51bWJlcik7XG4gICAgICAgIHZlcnNpb25zLnB1c2godmVyc2lvbkluc3RhbmNlKTtcbiAgICAgICAgdmVyc2lvbnMuc29ydChsb3dlclZlcnNpb25GaXJzdCk7XG4gICAgICAgIHJldHVybiB2ZXJzaW9uSW5zdGFuY2U7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIFZlcnNpb24odmVyc2lvbk51bWJlcikge1xuICAgICAgICB0aGlzLl9jZmcgPSB7XG4gICAgICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uTnVtYmVyLFxuICAgICAgICAgICAgc3RvcmVzU291cmNlOiBudWxsLFxuICAgICAgICAgICAgZGJzY2hlbWE6IHt9LFxuICAgICAgICAgICAgdGFibGVzOiB7fSxcbiAgICAgICAgICAgIGNvbnRlbnRVcGdyYWRlOiBudWxsXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc3RvcmVzKHt9KTsgLy8gRGVyaXZlIGVhcmxpZXIgc2NoZW1hcyBieSBkZWZhdWx0LlxuICAgIH1cblxuICAgIGV4dGVuZChWZXJzaW9uLnByb3RvdHlwZSwge1xuICAgICAgICBzdG9yZXM6IGZ1bmN0aW9uIChzdG9yZXMpIHtcbiAgICAgICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgICAgIC8vLyAgIERlZmluZXMgdGhlIHNjaGVtYSBmb3IgYSBwYXJ0aWN1bGFyIHZlcnNpb25cbiAgICAgICAgICAgIC8vLyA8L3N1bW1hcnk+XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJzdG9yZXNcIiB0eXBlPVwiT2JqZWN0XCI+XG4gICAgICAgICAgICAvLy8gRXhhbXBsZTogPGJyLz5cbiAgICAgICAgICAgIC8vLyAgIHt1c2VyczogXCJpZCsrLGZpcnN0LGxhc3QsJmFtcDt1c2VybmFtZSwqZW1haWxcIiwgPGJyLz5cbiAgICAgICAgICAgIC8vLyAgIHBhc3N3b3JkczogXCJpZCsrLCZhbXA7dXNlcm5hbWVcIn08YnIvPlxuICAgICAgICAgICAgLy8vIDxici8+XG4gICAgICAgICAgICAvLy8gU3ludGF4OiB7VGFibGU6IFwiW3ByaW1hcnlLZXldWysrXSxbJmFtcDtdWypdaW5kZXgxLFsmYW1wO11bKl1pbmRleDIsLi4uXCJ9PGJyLz48YnIvPlxuICAgICAgICAgICAgLy8vIFNwZWNpYWwgY2hhcmFjdGVyczo8YnIvPlxuICAgICAgICAgICAgLy8vICBcIiZhbXA7XCIgIG1lYW5zIHVuaXF1ZSBrZXksIDxici8+XG4gICAgICAgICAgICAvLy8gIFwiKlwiICBtZWFucyB2YWx1ZSBpcyBtdWx0aUVudHJ5LCA8YnIvPlxuICAgICAgICAgICAgLy8vICBcIisrXCIgbWVhbnMgYXV0by1pbmNyZW1lbnQgYW5kIG9ubHkgYXBwbGljYWJsZSBmb3IgcHJpbWFyeSBrZXkgPGJyLz5cbiAgICAgICAgICAgIC8vLyA8L3BhcmFtPlxuICAgICAgICAgICAgdGhpcy5fY2ZnLnN0b3Jlc1NvdXJjZSA9IHRoaXMuX2NmZy5zdG9yZXNTb3VyY2UgPyBleHRlbmQodGhpcy5fY2ZnLnN0b3Jlc1NvdXJjZSwgc3RvcmVzKSA6IHN0b3JlcztcblxuICAgICAgICAgICAgLy8gRGVyaXZlIHN0b3JlcyBmcm9tIGVhcmxpZXIgdmVyc2lvbnMgaWYgdGhleSBhcmUgbm90IGV4cGxpY2l0ZWx5IHNwZWNpZmllZCBhcyBudWxsIG9yIGEgbmV3IHN5bnRheC5cbiAgICAgICAgICAgIHZhciBzdG9yZXNTcGVjID0ge307XG4gICAgICAgICAgICB2ZXJzaW9ucy5mb3JFYWNoKGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgICAgICAgICAgLy8gJ3ZlcnNpb25zJyBpcyBhbHdheXMgc29ydGVkIGJ5IGxvd2VzdCB2ZXJzaW9uIGZpcnN0LlxuICAgICAgICAgICAgICAgIGV4dGVuZChzdG9yZXNTcGVjLCB2ZXJzaW9uLl9jZmcuc3RvcmVzU291cmNlKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB2YXIgZGJzY2hlbWEgPSB0aGlzLl9jZmcuZGJzY2hlbWEgPSB7fTtcbiAgICAgICAgICAgIHRoaXMuX3BhcnNlU3RvcmVzU3BlYyhzdG9yZXNTcGVjLCBkYnNjaGVtYSk7XG4gICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGxhdGVzdCBzY2hlbWEgdG8gdGhpcyB2ZXJzaW9uXG4gICAgICAgICAgICAvLyBVcGRhdGUgQVBJXG4gICAgICAgICAgICBnbG9iYWxTY2hlbWEgPSBkYi5fZGJTY2hlbWEgPSBkYnNjaGVtYTtcbiAgICAgICAgICAgIHJlbW92ZVRhYmxlc0FwaShbYWxsVGFibGVzLCBkYiwgVHJhbnNhY3Rpb24ucHJvdG90eXBlXSk7XG4gICAgICAgICAgICBzZXRBcGlPblBsYWNlKFthbGxUYWJsZXMsIGRiLCBUcmFuc2FjdGlvbi5wcm90b3R5cGUsIHRoaXMuX2NmZy50YWJsZXNdLCBrZXlzKGRic2NoZW1hKSwgUkVBRFdSSVRFLCBkYnNjaGVtYSk7XG4gICAgICAgICAgICBkYlN0b3JlTmFtZXMgPSBrZXlzKGRic2NoZW1hKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuICAgICAgICB1cGdyYWRlOiBmdW5jdGlvbiAodXBncmFkZUZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJ1cGdyYWRlRnVuY3Rpb25cIiBvcHRpb25hbD1cInRydWVcIj5GdW5jdGlvbiB0aGF0IHBlcmZvcm1zIHVwZ3JhZGluZyBhY3Rpb25zLjwvcGFyYW0+XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICBmYWtlQXV0b0NvbXBsZXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB1cGdyYWRlRnVuY3Rpb24oZGIuX2NyZWF0ZVRyYW5zYWN0aW9uKFJFQURXUklURSwga2V5cyhzZWxmLl9jZmcuZGJzY2hlbWEpLCBzZWxmLl9jZmcuZGJzY2hlbWEpKTsgLy8gQlVHQlVHOiBObyBjb2RlIGNvbXBsZXRpb24gZm9yIHByZXYgdmVyc2lvbidzIHRhYmxlcyB3b250IGFwcGVhci5cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5fY2ZnLmNvbnRlbnRVcGdyYWRlID0gdXBncmFkZUZ1bmN0aW9uO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0sXG4gICAgICAgIF9wYXJzZVN0b3Jlc1NwZWM6IGZ1bmN0aW9uIChzdG9yZXMsIG91dFNjaGVtYSkge1xuICAgICAgICAgICAga2V5cyhzdG9yZXMpLmZvckVhY2goZnVuY3Rpb24gKHRhYmxlTmFtZSkge1xuICAgICAgICAgICAgICAgIGlmIChzdG9yZXNbdGFibGVOYW1lXSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5zdGFuY2VUZW1wbGF0ZSA9IHt9O1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXhlcyA9IHBhcnNlSW5kZXhTeW50YXgoc3RvcmVzW3RhYmxlTmFtZV0pO1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJpbUtleSA9IGluZGV4ZXMuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByaW1LZXkubXVsdGkpIHRocm93IG5ldyBleGNlcHRpb25zLlNjaGVtYShcIlByaW1hcnkga2V5IGNhbm5vdCBiZSBtdWx0aS12YWx1ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwcmltS2V5LmtleVBhdGgpIHNldEJ5S2V5UGF0aChpbnN0YW5jZVRlbXBsYXRlLCBwcmltS2V5LmtleVBhdGgsIHByaW1LZXkuYXV0byA/IDAgOiBwcmltS2V5LmtleVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBpbmRleGVzLmZvckVhY2goZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlkeC5hdXRvKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5TY2hlbWEoXCJPbmx5IHByaW1hcnkga2V5IGNhbiBiZSBtYXJrZWQgYXMgYXV0b0luY3JlbWVudCAoKyspXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpZHgua2V5UGF0aCkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuU2NoZW1hKFwiSW5kZXggbXVzdCBoYXZlIGEgbmFtZSBhbmQgY2Fubm90IGJlIGFuIGVtcHR5IHN0cmluZ1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEJ5S2V5UGF0aChpbnN0YW5jZVRlbXBsYXRlLCBpZHgua2V5UGF0aCwgaWR4LmNvbXBvdW5kID8gaWR4LmtleVBhdGgubWFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pIDogXCJcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBvdXRTY2hlbWFbdGFibGVOYW1lXSA9IG5ldyBUYWJsZVNjaGVtYSh0YWJsZU5hbWUsIHByaW1LZXksIGluZGV4ZXMsIGluc3RhbmNlVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBydW5VcGdyYWRlcnMob2xkVmVyc2lvbiwgaWRidHJhbnMsIHJlamVjdCkge1xuICAgICAgICB2YXIgdHJhbnMgPSBkYi5fY3JlYXRlVHJhbnNhY3Rpb24oUkVBRFdSSVRFLCBkYlN0b3JlTmFtZXMsIGdsb2JhbFNjaGVtYSk7XG4gICAgICAgIHRyYW5zLmNyZWF0ZShpZGJ0cmFucyk7XG4gICAgICAgIHRyYW5zLl9jb21wbGV0aW9uLmNhdGNoKHJlamVjdCk7XG4gICAgICAgIHZhciByZWplY3RUcmFuc2FjdGlvbiA9IHRyYW5zLl9yZWplY3QuYmluZCh0cmFucyk7XG4gICAgICAgIG5ld1Njb3BlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFBTRC50cmFucyA9IHRyYW5zO1xuICAgICAgICAgICAgaWYgKG9sZFZlcnNpb24gPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgdGFibGVzOlxuICAgICAgICAgICAgICAgIGtleXMoZ2xvYmFsU2NoZW1hKS5mb3JFYWNoKGZ1bmN0aW9uICh0YWJsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlVGFibGUoaWRidHJhbnMsIHRhYmxlTmFtZSwgZ2xvYmFsU2NoZW1hW3RhYmxlTmFtZV0ucHJpbUtleSwgZ2xvYmFsU2NoZW1hW3RhYmxlTmFtZV0uaW5kZXhlcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgUHJvbWlzZS5mb2xsb3coZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGIub24ucG9wdWxhdGUuZmlyZSh0cmFucyk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2gocmVqZWN0VHJhbnNhY3Rpb24pO1xuICAgICAgICAgICAgfSBlbHNlIHVwZGF0ZVRhYmxlc0FuZEluZGV4ZXMob2xkVmVyc2lvbiwgdHJhbnMsIGlkYnRyYW5zKS5jYXRjaChyZWplY3RUcmFuc2FjdGlvbik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZVRhYmxlc0FuZEluZGV4ZXMob2xkVmVyc2lvbiwgdHJhbnMsIGlkYnRyYW5zKSB7XG4gICAgICAgIC8vIFVwZ3JhZGUgdmVyc2lvbiB0byB2ZXJzaW9uLCBzdGVwLWJ5LXN0ZXAgZnJvbSBvbGRlc3QgdG8gbmV3ZXN0IHZlcnNpb24uXG4gICAgICAgIC8vIEVhY2ggdHJhbnNhY3Rpb24gb2JqZWN0IHdpbGwgY29udGFpbiB0aGUgdGFibGUgc2V0IHRoYXQgd2FzIGN1cnJlbnQgaW4gdGhhdCB2ZXJzaW9uIChidXQgYWxzbyBub3QteWV0LWRlbGV0ZWQgdGFibGVzIGZyb20gaXRzIHByZXZpb3VzIHZlcnNpb24pXG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgb2xkVmVyc2lvblN0cnVjdCA9IHZlcnNpb25zLmZpbHRlcihmdW5jdGlvbiAodmVyc2lvbikge1xuICAgICAgICAgICAgcmV0dXJuIHZlcnNpb24uX2NmZy52ZXJzaW9uID09PSBvbGRWZXJzaW9uO1xuICAgICAgICB9KVswXTtcbiAgICAgICAgaWYgKCFvbGRWZXJzaW9uU3RydWN0KSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5VcGdyYWRlKFwiRGV4aWUgc3BlY2lmaWNhdGlvbiBvZiBjdXJyZW50bHkgaW5zdGFsbGVkIERCIHZlcnNpb24gaXMgbWlzc2luZ1wiKTtcbiAgICAgICAgZ2xvYmFsU2NoZW1hID0gZGIuX2RiU2NoZW1hID0gb2xkVmVyc2lvblN0cnVjdC5fY2ZnLmRic2NoZW1hO1xuICAgICAgICB2YXIgYW55Q29udGVudFVwZ3JhZGVySGFzUnVuID0gZmFsc2U7XG5cbiAgICAgICAgdmFyIHZlcnNUb1J1biA9IHZlcnNpb25zLmZpbHRlcihmdW5jdGlvbiAodikge1xuICAgICAgICAgICAgcmV0dXJuIHYuX2NmZy52ZXJzaW9uID4gb2xkVmVyc2lvbjtcbiAgICAgICAgfSk7XG4gICAgICAgIHZlcnNUb1J1bi5mb3JFYWNoKGZ1bmN0aW9uICh2ZXJzaW9uKSB7XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJ2ZXJzaW9uXCIgdHlwZT1cIlZlcnNpb25cIj48L3BhcmFtPlxuICAgICAgICAgICAgcXVldWUucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9sZFNjaGVtYSA9IGdsb2JhbFNjaGVtYTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3U2NoZW1hID0gdmVyc2lvbi5fY2ZnLmRic2NoZW1hO1xuICAgICAgICAgICAgICAgIGFkanVzdFRvRXhpc3RpbmdJbmRleE5hbWVzKG9sZFNjaGVtYSwgaWRidHJhbnMpO1xuICAgICAgICAgICAgICAgIGFkanVzdFRvRXhpc3RpbmdJbmRleE5hbWVzKG5ld1NjaGVtYSwgaWRidHJhbnMpO1xuICAgICAgICAgICAgICAgIGdsb2JhbFNjaGVtYSA9IGRiLl9kYlNjaGVtYSA9IG5ld1NjaGVtYTtcbiAgICAgICAgICAgICAgICB2YXIgZGlmZiA9IGdldFNjaGVtYURpZmYob2xkU2NoZW1hLCBuZXdTY2hlbWEpO1xuICAgICAgICAgICAgICAgIC8vIEFkZCB0YWJsZXMgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRpZmYuYWRkLmZvckVhY2goZnVuY3Rpb24gKHR1cGxlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNyZWF0ZVRhYmxlKGlkYnRyYW5zLCB0dXBsZVswXSwgdHVwbGVbMV0ucHJpbUtleSwgdHVwbGVbMV0uaW5kZXhlcyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gQ2hhbmdlIHRhYmxlc1xuICAgICAgICAgICAgICAgIGRpZmYuY2hhbmdlLmZvckVhY2goZnVuY3Rpb24gKGNoYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlLnJlY3JlYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXhjZXB0aW9ucy5VcGdyYWRlKFwiTm90IHlldCBzdXBwb3J0IGZvciBjaGFuZ2luZyBwcmltYXJ5IGtleVwiKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdG9yZSA9IGlkYnRyYW5zLm9iamVjdFN0b3JlKGNoYW5nZS5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFkZCBpbmRleGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2UuYWRkLmZvckVhY2goZnVuY3Rpb24gKGlkeCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEluZGV4KHN0b3JlLCBpZHgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaW5kZXhlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hhbmdlLmNoYW5nZS5mb3JFYWNoKGZ1bmN0aW9uIChpZHgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5kZWxldGVJbmRleChpZHgubmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSW5kZXgoc3RvcmUsIGlkeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBpbmRleGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGFuZ2UuZGVsLmZvckVhY2goZnVuY3Rpb24gKGlkeE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdG9yZS5kZWxldGVJbmRleChpZHhOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKHZlcnNpb24uX2NmZy5jb250ZW50VXBncmFkZSkge1xuICAgICAgICAgICAgICAgICAgICBhbnlDb250ZW50VXBncmFkZXJIYXNSdW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5mb2xsb3coZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmVyc2lvbi5fY2ZnLmNvbnRlbnRVcGdyYWRlKHRyYW5zKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZ1bmN0aW9uIChpZGJ0cmFucykge1xuICAgICAgICAgICAgICAgIGlmICghYW55Q29udGVudFVwZ3JhZGVySGFzUnVuIHx8ICFoYXNJRURlbGV0ZU9iamVjdFN0b3JlQnVnKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERvbnQgZGVsZXRlIG9sZCB0YWJsZXMgaWYgaWVCdWcgaXMgcHJlc2VudCBhbmQgYSBjb250ZW50IHVwZ3JhZGVyIGhhcyBydW4uIExldCB0YWJsZXMgYmUgbGVmdCBpbiBEQiBzbyBmYXIuIFRoaXMgbmVlZHMgdG8gYmUgdGFrZW4gY2FyZSBvZi5cbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld1NjaGVtYSA9IHZlcnNpb24uX2NmZy5kYnNjaGVtYTtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGVsZXRlIG9sZCB0YWJsZXNcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlUmVtb3ZlZFRhYmxlcyhuZXdTY2hlbWEsIGlkYnRyYW5zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTm93LCBjcmVhdGUgYSBxdWV1ZSBleGVjdXRpb24gZW5naW5lXG4gICAgICAgIGZ1bmN0aW9uIHJ1blF1ZXVlKCkge1xuICAgICAgICAgICAgcmV0dXJuIHF1ZXVlLmxlbmd0aCA/IFByb21pc2UucmVzb2x2ZShxdWV1ZS5zaGlmdCgpKHRyYW5zLmlkYnRyYW5zKSkudGhlbihydW5RdWV1ZSkgOiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBydW5RdWV1ZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY3JlYXRlTWlzc2luZ1RhYmxlcyhnbG9iYWxTY2hlbWEsIGlkYnRyYW5zKTsgLy8gQXQgbGFzdCwgbWFrZSBzdXJlIHRvIGNyZWF0ZSBhbnkgbWlzc2luZyB0YWJsZXMuIChOZWVkZWQgYnkgYWRkb25zIHRoYXQgYWRkIHN0b3JlcyB0byBEQiB3aXRob3V0IHNwZWNpZnlpbmcgdmVyc2lvbilcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2NoZW1hRGlmZihvbGRTY2hlbWEsIG5ld1NjaGVtYSkge1xuICAgICAgICB2YXIgZGlmZiA9IHtcbiAgICAgICAgICAgIGRlbDogW10sIC8vIEFycmF5IG9mIHRhYmxlIG5hbWVzXG4gICAgICAgICAgICBhZGQ6IFtdLCAvLyBBcnJheSBvZiBbdGFibGVOYW1lLCBuZXdEZWZpbml0aW9uXVxuICAgICAgICAgICAgY2hhbmdlOiBbXSAvLyBBcnJheSBvZiB7bmFtZTogdGFibGVOYW1lLCByZWNyZWF0ZTogbmV3RGVmaW5pdGlvbiwgZGVsOiBkZWxJbmRleE5hbWVzLCBhZGQ6IG5ld0luZGV4RGVmcywgY2hhbmdlOiBjaGFuZ2VkSW5kZXhEZWZzfVxuICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciB0YWJsZSBpbiBvbGRTY2hlbWEpIHtcbiAgICAgICAgICAgIGlmICghbmV3U2NoZW1hW3RhYmxlXSkgZGlmZi5kZWwucHVzaCh0YWJsZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh0YWJsZSBpbiBuZXdTY2hlbWEpIHtcbiAgICAgICAgICAgIHZhciBvbGREZWYgPSBvbGRTY2hlbWFbdGFibGVdLFxuICAgICAgICAgICAgICAgIG5ld0RlZiA9IG5ld1NjaGVtYVt0YWJsZV07XG4gICAgICAgICAgICBpZiAoIW9sZERlZikge1xuICAgICAgICAgICAgICAgIGRpZmYuYWRkLnB1c2goW3RhYmxlLCBuZXdEZWZdKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoYW5nZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdGFibGUsXG4gICAgICAgICAgICAgICAgICAgIGRlZjogbmV3RGVmLFxuICAgICAgICAgICAgICAgICAgICByZWNyZWF0ZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGRlbDogW10sXG4gICAgICAgICAgICAgICAgICAgIGFkZDogW10sXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZTogW11cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGlmIChvbGREZWYucHJpbUtleS5zcmMgIT09IG5ld0RlZi5wcmltS2V5LnNyYykge1xuICAgICAgICAgICAgICAgICAgICAvLyBQcmltYXJ5IGtleSBoYXMgY2hhbmdlZC4gUmVtb3ZlIGFuZCByZS1hZGQgdGFibGUuXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZS5yZWNyZWF0ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGRpZmYuY2hhbmdlLnB1c2goY2hhbmdlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBTYW1lIHByaW1hcnkga2V5LiBKdXN0IGZpbmQgb3V0IHdoYXQgZGlmZmVyczpcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9sZEluZGV4ZXMgPSBvbGREZWYuaWR4QnlOYW1lO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3SW5kZXhlcyA9IG5ld0RlZi5pZHhCeU5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGlkeE5hbWUgaW4gb2xkSW5kZXhlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFuZXdJbmRleGVzW2lkeE5hbWVdKSBjaGFuZ2UuZGVsLnB1c2goaWR4TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yIChpZHhOYW1lIGluIG5ld0luZGV4ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRJZHggPSBvbGRJbmRleGVzW2lkeE5hbWVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0lkeCA9IG5ld0luZGV4ZXNbaWR4TmFtZV07XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIW9sZElkeCkgY2hhbmdlLmFkZC5wdXNoKG5ld0lkeCk7ZWxzZSBpZiAob2xkSWR4LnNyYyAhPT0gbmV3SWR4LnNyYykgY2hhbmdlLmNoYW5nZS5wdXNoKG5ld0lkeCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoYW5nZS5kZWwubGVuZ3RoID4gMCB8fCBjaGFuZ2UuYWRkLmxlbmd0aCA+IDAgfHwgY2hhbmdlLmNoYW5nZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWZmLmNoYW5nZS5wdXNoKGNoYW5nZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGRpZmY7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlVGFibGUoaWRidHJhbnMsIHRhYmxlTmFtZSwgcHJpbUtleSwgaW5kZXhlcykge1xuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJpZGJ0cmFuc1wiIHR5cGU9XCJJREJUcmFuc2FjdGlvblwiPjwvcGFyYW0+XG4gICAgICAgIHZhciBzdG9yZSA9IGlkYnRyYW5zLmRiLmNyZWF0ZU9iamVjdFN0b3JlKHRhYmxlTmFtZSwgcHJpbUtleS5rZXlQYXRoID8geyBrZXlQYXRoOiBwcmltS2V5LmtleVBhdGgsIGF1dG9JbmNyZW1lbnQ6IHByaW1LZXkuYXV0byB9IDogeyBhdXRvSW5jcmVtZW50OiBwcmltS2V5LmF1dG8gfSk7XG4gICAgICAgIGluZGV4ZXMuZm9yRWFjaChmdW5jdGlvbiAoaWR4KSB7XG4gICAgICAgICAgICBhZGRJbmRleChzdG9yZSwgaWR4KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzdG9yZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjcmVhdGVNaXNzaW5nVGFibGVzKG5ld1NjaGVtYSwgaWRidHJhbnMpIHtcbiAgICAgICAga2V5cyhuZXdTY2hlbWEpLmZvckVhY2goZnVuY3Rpb24gKHRhYmxlTmFtZSkge1xuICAgICAgICAgICAgaWYgKCFpZGJ0cmFucy5kYi5vYmplY3RTdG9yZU5hbWVzLmNvbnRhaW5zKHRhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVUYWJsZShpZGJ0cmFucywgdGFibGVOYW1lLCBuZXdTY2hlbWFbdGFibGVOYW1lXS5wcmltS2V5LCBuZXdTY2hlbWFbdGFibGVOYW1lXS5pbmRleGVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVsZXRlUmVtb3ZlZFRhYmxlcyhuZXdTY2hlbWEsIGlkYnRyYW5zKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWRidHJhbnMuZGIub2JqZWN0U3RvcmVOYW1lcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIHN0b3JlTmFtZSA9IGlkYnRyYW5zLmRiLm9iamVjdFN0b3JlTmFtZXNbaV07XG4gICAgICAgICAgICBpZiAobmV3U2NoZW1hW3N0b3JlTmFtZV0gPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlkYnRyYW5zLmRiLmRlbGV0ZU9iamVjdFN0b3JlKHN0b3JlTmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhZGRJbmRleChzdG9yZSwgaWR4KSB7XG4gICAgICAgIHN0b3JlLmNyZWF0ZUluZGV4KGlkeC5uYW1lLCBpZHgua2V5UGF0aCwgeyB1bmlxdWU6IGlkeC51bmlxdWUsIG11bHRpRW50cnk6IGlkeC5tdWx0aSB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkYlVuY2F1Z2h0KGVycikge1xuICAgICAgICByZXR1cm4gZGIub24uZXJyb3IuZmlyZShlcnIpO1xuICAgIH1cblxuICAgIC8vXG4gICAgLy9cbiAgICAvLyAgICAgIERleGllIFByb3RlY3RlZCBBUElcbiAgICAvL1xuICAgIC8vXG5cbiAgICB0aGlzLl9hbGxUYWJsZXMgPSBhbGxUYWJsZXM7XG5cbiAgICB0aGlzLl90YWJsZUZhY3RvcnkgPSBmdW5jdGlvbiBjcmVhdGVUYWJsZShtb2RlLCB0YWJsZVNjaGVtYSkge1xuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJ0YWJsZVNjaGVtYVwiIHR5cGU9XCJUYWJsZVNjaGVtYVwiPjwvcGFyYW0+XG4gICAgICAgIGlmIChtb2RlID09PSBSRUFET05MWSkgcmV0dXJuIG5ldyBUYWJsZSh0YWJsZVNjaGVtYS5uYW1lLCB0YWJsZVNjaGVtYSwgQ29sbGVjdGlvbik7ZWxzZSByZXR1cm4gbmV3IFdyaXRlYWJsZVRhYmxlKHRhYmxlU2NoZW1hLm5hbWUsIHRhYmxlU2NoZW1hKTtcbiAgICB9O1xuXG4gICAgdGhpcy5fY3JlYXRlVHJhbnNhY3Rpb24gPSBmdW5jdGlvbiAobW9kZSwgc3RvcmVOYW1lcywgZGJzY2hlbWEsIHBhcmVudFRyYW5zYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBuZXcgVHJhbnNhY3Rpb24obW9kZSwgc3RvcmVOYW1lcywgZGJzY2hlbWEsIHBhcmVudFRyYW5zYWN0aW9uKTtcbiAgICB9O1xuXG4gICAgLyogR2VuZXJhdGUgYSB0ZW1wb3JhcnkgdHJhbnNhY3Rpb24gd2hlbiBkYiBvcGVyYXRpb25zIGFyZSBkb25lIG91dHNpZGUgYSB0cmFuc2FjdGlubyBzY29wZS5cclxuICAgICovXG4gICAgZnVuY3Rpb24gdGVtcFRyYW5zYWN0aW9uKG1vZGUsIHN0b3JlTmFtZXMsIGZuKSB7XG4gICAgICAgIC8vIExhc3QgYXJndW1lbnQgaXMgXCJ3cml0ZUxvY2tlZFwiLiBCdXQgdGhpcyBkb2VzbnQgYXBwbHkgdG8gb25lc2hvdCBkaXJlY3QgZGIgb3BlcmF0aW9ucywgc28gd2UgaWdub3JlIGl0LlxuICAgICAgICBpZiAoIW9wZW5Db21wbGV0ZSAmJiAhUFNELmxldFRocm91Z2gpIHtcbiAgICAgICAgICAgIGlmICghaXNCZWluZ09wZW5lZCkge1xuICAgICAgICAgICAgICAgIGlmICghYXV0b09wZW4pIHJldHVybiByZWplY3Rpb24obmV3IGV4Y2VwdGlvbnMuRGF0YWJhc2VDbG9zZWQoKSwgZGJVbmNhdWdodCk7XG4gICAgICAgICAgICAgICAgZGIub3BlbigpLmNhdGNoKG5vcCk7IC8vIE9wZW4gaW4gYmFja2dyb3VuZC4gSWYgaWYgZmFpbHMsIGl0IHdpbGwgYmUgY2F0Y2hlZCBieSB0aGUgZmluYWwgcHJvbWlzZSBhbnl3YXkuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGJSZWFkeVByb21pc2UudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBUcmFuc2FjdGlvbihtb2RlLCBzdG9yZU5hbWVzLCBmbik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB0cmFucyA9IGRiLl9jcmVhdGVUcmFuc2FjdGlvbihtb2RlLCBzdG9yZU5hbWVzLCBnbG9iYWxTY2hlbWEpO1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zLl9wcm9taXNlKG1vZGUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICBuZXdTY29wZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9QVElNSVpBVElPTiBQT1NTSUJMRT8gbmV3U2NvcGUoKSBub3QgbmVlZGVkIGJlY2F1c2UgaXQncyBhbHJlYWR5IGRvbmUgaW4gX3Byb21pc2UuXG4gICAgICAgICAgICAgICAgICAgIFBTRC50cmFucyA9IHRyYW5zO1xuICAgICAgICAgICAgICAgICAgICBmbihyZXNvbHZlLCByZWplY3QsIHRyYW5zKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIEluc3RlYWQgb2YgcmVzb2x2aW5nIHZhbHVlIGRpcmVjdGx5LCB3YWl0IHdpdGggcmVzb2x2aW5nIGl0IHVudGlsIHRyYW5zYWN0aW9uIGhhcyBjb21wbGV0ZWQuXG4gICAgICAgICAgICAgICAgLy8gT3RoZXJ3aXNlIHRoZSBkYXRhIHdvdWxkIG5vdCBiZSBpbiB0aGUgREIgaWYgcmVxdWVzdGluZyBpdCBpbiB0aGUgdGhlbigpIG9wZXJhdGlvbi5cbiAgICAgICAgICAgICAgICAvLyBTcGVjaWZpY2FsbHksIHRvIGVuc3VyZSB0aGF0IHRoZSBmb2xsb3dpbmcgZXhwcmVzc2lvbiB3aWxsIHdvcms6XG4gICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAvLyAgIGRiLmZyaWVuZHMucHV0KHtuYW1lOiBcIkFybmVcIn0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vICAgICAgIGRiLmZyaWVuZHMud2hlcmUoXCJuYW1lXCIpLmVxdWFscyhcIkFybmVcIikuY291bnQoZnVuY3Rpb24oY291bnQpIHtcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgICAgYXNzZXJ0IChjb3VudCA9PT0gMSk7XG4gICAgICAgICAgICAgICAgLy8gICAgICAgfSk7XG4gICAgICAgICAgICAgICAgLy8gICB9KTtcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIHJldHVybiB0cmFucy5fY29tcGxldGlvbi50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pOyAvKi5jYXRjaChlcnIgPT4geyAvLyBEb24ndCBkbyB0aGlzIGFzIG9mIG5vdy4gSWYgd291bGQgYWZmZWN0IGJ1bGstIGFuZCBtb2RpZnkgbWV0aG9kcyBpbiBhIHdheSB0aGF0IGNvdWxkIGJlIG1vcmUgaW50dWl0aXZlLiBCdXQgd2FpdCEgTWF5YmUgY2hhbmdlIGluIG5leHQgbWFqb3IuXHJcbiAgICAgICAgICAgICAgICAgdHJhbnMuX3JlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgIHJldHVybiByZWplY3Rpb24oZXJyKTtcclxuICAgICAgICAgICAgICAgIH0pOyovXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl93aGVuUmVhZHkgPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZha2UgfHwgb3BlbkNvbXBsZXRlIHx8IFBTRC5sZXRUaHJvdWdoID8gZm4gOiBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICBpZiAoIWlzQmVpbmdPcGVuZWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIWF1dG9PcGVuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgZXhjZXB0aW9ucy5EYXRhYmFzZUNsb3NlZCgpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkYi5vcGVuKCkuY2F0Y2gobm9wKTsgLy8gT3BlbiBpbiBiYWNrZ3JvdW5kLiBJZiBpZiBmYWlscywgaXQgd2lsbCBiZSBjYXRjaGVkIGJ5IHRoZSBmaW5hbCBwcm9taXNlIGFueXdheS5cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRiUmVhZHlQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGZuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkudW5jYXVnaHQoZGJVbmNhdWdodCk7XG4gICAgfTtcblxuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gICAgICBEZXhpZSBBUElcbiAgICAvL1xuICAgIC8vXG4gICAgLy9cblxuICAgIHRoaXMudmVybm8gPSAwO1xuXG4gICAgdGhpcy5vcGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaXNCZWluZ09wZW5lZCB8fCBpZGJkYikgcmV0dXJuIGRiUmVhZHlQcm9taXNlLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGRiT3BlbkVycm9yID8gcmVqZWN0aW9uKGRiT3BlbkVycm9yLCBkYlVuY2F1Z2h0KSA6IGRiO1xuICAgICAgICB9KTtcbiAgICAgICAgZGVidWcgJiYgKG9wZW5DYW5jZWxsZXIuX3N0YWNrSG9sZGVyID0gZ2V0RXJyb3JXaXRoU3RhY2soKSk7IC8vIExldCBzdGFja3MgcG9pbnQgdG8gd2hlbiBvcGVuKCkgd2FzIGNhbGxlZCByYXRoZXIgdGhhbiB3aGVyZSBuZXcgRGV4aWUoKSB3YXMgY2FsbGVkLlxuICAgICAgICBpc0JlaW5nT3BlbmVkID0gdHJ1ZTtcbiAgICAgICAgZGJPcGVuRXJyb3IgPSBudWxsO1xuICAgICAgICBvcGVuQ29tcGxldGUgPSBmYWxzZTtcblxuICAgICAgICAvLyBGdW5jdGlvbiBwb2ludGVycyB0byBjYWxsIHdoZW4gdGhlIGNvcmUgb3BlbmluZyBwcm9jZXNzIGNvbXBsZXRlcy5cbiAgICAgICAgdmFyIHJlc29sdmVEYlJlYWR5ID0gZGJSZWFkeVJlc29sdmUsXG5cbiAgICAgICAgLy8gdXBncmFkZVRyYW5zYWN0aW9uIHRvIGFib3J0IG9uIGZhaWx1cmUuXG4gICAgICAgIHVwZ3JhZGVUcmFuc2FjdGlvbiA9IG51bGw7XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmFjZShbb3BlbkNhbmNlbGxlciwgbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgZG9GYWtlQXV0b0NvbXBsZXRlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBjYWxsZXIgaGFzIHNwZWNpZmllZCBhdCBsZWFzdCBvbmUgdmVyc2lvblxuICAgICAgICAgICAgaWYgKHZlcnNpb25zLmxlbmd0aCA+IDApIGF1dG9TY2hlbWEgPSBmYWxzZTtcblxuICAgICAgICAgICAgLy8gTXVsdGlwbHkgZGIudmVybm8gd2l0aCAxMCB3aWxsIGJlIG5lZWRlZCB0byB3b3JrYXJvdW5kIHVwZ3JhZGluZyBidWcgaW4gSUU6XG4gICAgICAgICAgICAvLyBJRSBmYWlscyB3aGVuIGRlbGV0aW5nIG9iamVjdFN0b3JlIGFmdGVyIHJlYWRpbmcgZnJvbSBpdC5cbiAgICAgICAgICAgIC8vIEEgZnV0dXJlIHZlcnNpb24gb2YgRGV4aWUuanMgd2lsbCBzdG9wb3ZlciBhbiBpbnRlcm1lZGlhdGUgdmVyc2lvbiB0byB3b3JrYXJvdW5kIHRoaXMuXG4gICAgICAgICAgICAvLyBBdCB0aGF0IHBvaW50LCB3ZSB3YW50IHRvIGJlIGJhY2t3YXJkIGNvbXBhdGlibGUuIENvdWxkIGhhdmUgYmVlbiBtdWx0aXBsaWVkIHdpdGggMiwgYnV0IGJ5IHVzaW5nIDEwLCBpdCBpcyBlYXNpZXIgdG8gbWFwIHRoZSBudW1iZXIgdG8gdGhlIHJlYWwgdmVyc2lvbiBudW1iZXIuXG5cbiAgICAgICAgICAgIC8vIElmIG5vIEFQSSwgdGhyb3chXG4gICAgICAgICAgICBpZiAoIWluZGV4ZWREQikgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuTWlzc2luZ0FQSShcImluZGV4ZWREQiBBUEkgbm90IGZvdW5kLiBJZiB1c2luZyBJRTEwKywgbWFrZSBzdXJlIHRvIHJ1biB5b3VyIGNvZGUgb24gYSBzZXJ2ZXIgVVJMIFwiICsgXCIobm90IGxvY2FsbHkpLiBJZiB1c2luZyBvbGQgU2FmYXJpIHZlcnNpb25zLCBtYWtlIHN1cmUgdG8gaW5jbHVkZSBpbmRleGVkREIgcG9seWZpbGwuXCIpO1xuXG4gICAgICAgICAgICB2YXIgcmVxID0gYXV0b1NjaGVtYSA/IGluZGV4ZWREQi5vcGVuKGRiTmFtZSkgOiBpbmRleGVkREIub3BlbihkYk5hbWUsIE1hdGgucm91bmQoZGIudmVybm8gKiAxMCkpO1xuICAgICAgICAgICAgaWYgKCFyZXEpIHRocm93IG5ldyBleGNlcHRpb25zLk1pc3NpbmdBUEkoXCJJbmRleGVkREIgQVBJIG5vdCBhdmFpbGFibGVcIik7IC8vIE1heSBoYXBwZW4gaW4gU2FmYXJpIHByaXZhdGUgbW9kZSwgc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9kZmFobGFuZGVyL0RleGllLmpzL2lzc3Vlcy8xMzRcbiAgICAgICAgICAgIHJlcS5vbmVycm9yID0gd3JhcChldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KSk7XG4gICAgICAgICAgICByZXEub25ibG9ja2VkID0gd3JhcChmaXJlT25CbG9ja2VkKTtcbiAgICAgICAgICAgIHJlcS5vbnVwZ3JhZGVuZWVkZWQgPSB3cmFwKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgdXBncmFkZVRyYW5zYWN0aW9uID0gcmVxLnRyYW5zYWN0aW9uO1xuICAgICAgICAgICAgICAgIGlmIChhdXRvU2NoZW1hICYmICFkYi5fYWxsb3dFbXB0eURCKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVubGVzcyBhbiBhZGRvbiBoYXMgc3BlY2lmaWVkIGRiLl9hbGxvd0VtcHR5REIsIGxldHMgbWFrZSB0aGUgY2FsbCBmYWlsLlxuICAgICAgICAgICAgICAgICAgICAvLyBDYWxsZXIgZGlkIG5vdCBzcGVjaWZ5IGEgdmVyc2lvbiBvciBzY2hlbWEuIERvaW5nIHRoYXQgaXMgb25seSBhY2NlcHRhYmxlIGZvciBvcGVuaW5nIGFscmVhZCBleGlzdGluZyBkYXRhYmFzZXMuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIG9udXBncmFkZW5lZWRlZCBpcyBjYWxsZWQgaXQgbWVhbnMgZGF0YWJhc2UgZGlkIG5vdCBleGlzdC4gUmVqZWN0IHRoZSBvcGVuKCkgcHJvbWlzZSBhbmQgbWFrZSBzdXJlIHRoYXQgd2VcbiAgICAgICAgICAgICAgICAgICAgLy8gZG8gbm90IGNyZWF0ZSBhIG5ldyBkYXRhYmFzZSBieSBhY2NpZGVudCBoZXJlLlxuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IHByZXZlbnREZWZhdWx0OyAvLyBQcm9oaWJpdCBvbmFib3J0IGVycm9yIGZyb20gZmlyaW5nIGJlZm9yZSB3ZSdyZSBkb25lIVxuICAgICAgICAgICAgICAgICAgICB1cGdyYWRlVHJhbnNhY3Rpb24uYWJvcnQoKTsgLy8gQWJvcnQgdHJhbnNhY3Rpb24gKHdvdWxkIGhvcGUgdGhhdCB0aGlzIHdvdWxkIG1ha2UgREIgZGlzYXBwZWFyIGJ1dCBpdCBkb2VzbnQuKVxuICAgICAgICAgICAgICAgICAgICAvLyBDbG9zZSBkYXRhYmFzZSBhbmQgZGVsZXRlIGl0LlxuICAgICAgICAgICAgICAgICAgICByZXEucmVzdWx0LmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWxyZXEgPSBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2UoZGJOYW1lKTsgLy8gVGhlIHVwZ3JhZGUgdHJhbnNhY3Rpb24gaXMgYXRvbWljLCBhbmQgamF2YXNjcmlwdCBpcyBzaW5nbGUgdGhyZWFkZWQgLSBtZWFuaW5nIHRoYXQgdGhlcmUgaXMgbm8gcmlzayB0aGF0IHdlIGRlbGV0ZSBzb21lb25lIGVsc2VzIGRhdGFiYXNlIGhlcmUhXG4gICAgICAgICAgICAgICAgICAgIGRlbHJlcS5vbnN1Y2Nlc3MgPSBkZWxyZXEub25lcnJvciA9IHdyYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBleGNlcHRpb25zLk5vU3VjaERhdGFiYXNlKCdEYXRhYmFzZSAnICsgZGJOYW1lICsgJyBkb2VzbnQgZXhpc3QnKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHVwZ3JhZGVUcmFuc2FjdGlvbi5vbmVycm9yID0gd3JhcChldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBvbGRWZXIgPSBlLm9sZFZlcnNpb24gPiBNYXRoLnBvdygyLCA2MikgPyAwIDogZS5vbGRWZXJzaW9uOyAvLyBTYWZhcmkgOCBmaXguXG4gICAgICAgICAgICAgICAgICAgIHJ1blVwZ3JhZGVycyhvbGRWZXIgLyAxMCwgdXBncmFkZVRyYW5zYWN0aW9uLCByZWplY3QsIHJlcSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcblxuICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IHdyYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIENvcmUgb3BlbmluZyBwcm9jZWR1cmUgY29tcGxldGUuIE5vdyBsZXQncyBqdXN0IHJlY29yZCBzb21lIHN0dWZmLlxuICAgICAgICAgICAgICAgIHVwZ3JhZGVUcmFuc2FjdGlvbiA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWRiZGIgPSByZXEucmVzdWx0O1xuICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25zLnB1c2goZGIpOyAvLyBVc2VkIGZvciBlbXVsYXRpbmcgdmVyc2lvbmNoYW5nZSBldmVudCBvbiBJRS9FZGdlL1NhZmFyaS5cblxuICAgICAgICAgICAgICAgIGlmIChhdXRvU2NoZW1hKSByZWFkR2xvYmFsU2NoZW1hKCk7ZWxzZSBpZiAoaWRiZGIub2JqZWN0U3RvcmVOYW1lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGp1c3RUb0V4aXN0aW5nSW5kZXhOYW1lcyhnbG9iYWxTY2hlbWEsIGlkYmRiLnRyYW5zYWN0aW9uKHNhZmFyaU11bHRpU3RvcmVGaXgoaWRiZGIub2JqZWN0U3RvcmVOYW1lcyksIFJFQURPTkxZKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNhZmFyaSBtYXkgYmFpbCBvdXQgaWYgPiAxIHN0b3JlIG5hbWVzLiBIb3dldmVyLCB0aGlzIHNob3VsZG50IGJlIGEgc2hvd3N0b3BwZXIuIElzc3VlICMxMjAuXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZGJkYi5vbnZlcnNpb25jaGFuZ2UgPSB3cmFwKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBkYi5fdmNGaXJlZCA9IHRydWU7IC8vIGRldGVjdCBpbXBsZW1lbnRhdGlvbnMgdGhhdCBub3Qgc3VwcG9ydCB2ZXJzaW9uY2hhbmdlIChJRS9FZGdlL1NhZmFyaSlcbiAgICAgICAgICAgICAgICAgICAgZGIub24oXCJ2ZXJzaW9uY2hhbmdlXCIpLmZpcmUoZXYpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFoYXNOYXRpdmVHZXREYXRhYmFzZU5hbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBsb2NhbFN0b3JhZ2Ugd2l0aCBsaXN0IG9mIGRhdGFiYXNlIG5hbWVzXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbERhdGFiYXNlTGlzdChmdW5jdGlvbiAoZGF0YWJhc2VOYW1lcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRhdGFiYXNlTmFtZXMuaW5kZXhPZihkYk5hbWUpID09PSAtMSkgcmV0dXJuIGRhdGFiYXNlTmFtZXMucHVzaChkYk5hbWUpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICB9KV0pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gQmVmb3JlIGZpbmFsbHkgcmVzb2x2aW5nIHRoZSBkYlJlYWR5UHJvbWlzZSBhbmQgdGhpcyBwcm9taXNlLFxuICAgICAgICAgICAgLy8gY2FsbCBhbmQgYXdhaXQgYWxsIG9uKCdyZWFkeScpIHN1YnNjcmliZXJzOlxuICAgICAgICAgICAgLy8gRGV4aWUudmlwKCkgbWFrZXMgc3Vic2NyaWJlcnMgYWJsZSB0byB1c2UgdGhlIGRhdGFiYXNlIHdoaWxlIGJlaW5nIG9wZW5lZC5cbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBtdXN0IHNpbmNlIHRoZXNlIHN1YnNjcmliZXJzIHRha2UgcGFydCBvZiB0aGUgb3BlbmluZyBwcm9jZWR1cmUuXG4gICAgICAgICAgICByZXR1cm4gRGV4aWUudmlwKGRiLm9uLnJlYWR5LmZpcmUpO1xuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFJlc29sdmUgdGhlIGRiLm9wZW4oKSB3aXRoIHRoZSBkYiBpbnN0YW5jZS5cbiAgICAgICAgICAgIGlzQmVpbmdPcGVuZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiBkYjtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBEaWQgd2UgZmFpbCB3aXRoaW4gb251cGdyYWRlbmVlZGVkPyBNYWtlIHN1cmUgdG8gYWJvcnQgdGhlIHVwZ3JhZGUgdHJhbnNhY3Rpb24gc28gaXQgZG9lc250IGNvbW1pdC5cbiAgICAgICAgICAgICAgICB1cGdyYWRlVHJhbnNhY3Rpb24gJiYgdXBncmFkZVRyYW5zYWN0aW9uLmFib3J0KCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgaXNCZWluZ09wZW5lZCA9IGZhbHNlOyAvLyBTZXQgYmVmb3JlIGNhbGxpbmcgZGIuY2xvc2UoKSBzbyB0aGF0IGl0IGRvZXNudCByZWplY3Qgb3BlbkNhbmNlbGxlciBhZ2FpbiAobGVhZHMgdG8gdW5oYW5kbGVkIHJlamVjdGlvbiBldmVudCkuXG4gICAgICAgICAgICBkYi5jbG9zZSgpOyAvLyBDbG9zZXMgYW5kIHJlc2V0cyBpZGJkYiwgcmVtb3ZlcyBjb25uZWN0aW9ucywgcmVzZXRzIGRiUmVhZHlQcm9taXNlIGFuZCBvcGVuQ2FuY2VsbGVyIHNvIHRoYXQgYSBsYXRlciBkYi5vcGVuKCkgaXMgZnJlc2guXG4gICAgICAgICAgICAvLyBBIGNhbGwgdG8gZGIuY2xvc2UoKSBtYXkgaGF2ZSBtYWRlIG9uLXJlYWR5IHN1YnNjcmliZXJzIGZhaWwuIFVzZSBkYk9wZW5FcnJvciBpZiBzZXQsIHNpbmNlIGVyciBjb3VsZCBiZSBhIGZvbGxvdy11cCBlcnJvciBvbiB0aGF0LlxuICAgICAgICAgICAgZGJPcGVuRXJyb3IgPSBlcnI7IC8vIFJlY29yZCB0aGUgZXJyb3IuIEl0IHdpbGwgYmUgdXNlZCB0byByZWplY3QgZnVydGhlciBwcm9taXNlcyBvZiBkYiBvcGVyYXRpb25zLlxuICAgICAgICAgICAgcmV0dXJuIHJlamVjdGlvbihkYk9wZW5FcnJvciwgZGJVbmNhdWdodCk7IC8vIGRiVW5jYXVnaHQgd2lsbCBtYWtlIHN1cmUgYW55IGVycm9yIHRoYXQgaGFwcGVuZWQgaW4gYW55IG9wZXJhdGlvbiBiZWZvcmUgd2lsbCBub3cgYnViYmxlIHRvIGRiLm9uLmVycm9yKCkgdGhhbmtzIHRvIHRoZSBzcGVjaWFsIGhhbmRsaW5nIGluIFByb21pc2UudW5jYXVnaHQoKS5cbiAgICAgICAgfSkuZmluYWxseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBvcGVuQ29tcGxldGUgPSB0cnVlO1xuICAgICAgICAgICAgcmVzb2x2ZURiUmVhZHkoKTsgLy8gZGJSZWFkeVByb21pc2UgaXMgcmVzb2x2ZWQgbm8gbWF0dGVyIGlmIG9wZW4oKSByZWplY3RzIG9yIHJlc29sdmVkLiBJdCdzIGp1c3QgdG8gd2FrZSB1cCB3YWl0ZXJzLlxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGlkeCA9IGNvbm5lY3Rpb25zLmluZGV4T2YoZGIpO1xuICAgICAgICBpZiAoaWR4ID49IDApIGNvbm5lY3Rpb25zLnNwbGljZShpZHgsIDEpO1xuICAgICAgICBpZiAoaWRiZGIpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWRiZGIuY2xvc2UoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgICAgICAgICBpZGJkYiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgYXV0b09wZW4gPSBmYWxzZTtcbiAgICAgICAgZGJPcGVuRXJyb3IgPSBuZXcgZXhjZXB0aW9ucy5EYXRhYmFzZUNsb3NlZCgpO1xuICAgICAgICBpZiAoaXNCZWluZ09wZW5lZCkgY2FuY2VsT3BlbihkYk9wZW5FcnJvcik7XG4gICAgICAgIC8vIFJlc2V0IGRiUmVhZHlQcm9taXNlIHByb21pc2U6XG4gICAgICAgIGRiUmVhZHlQcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICAgICAgICAgIGRiUmVhZHlSZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIG9wZW5DYW5jZWxsZXIgPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAoXywgcmVqZWN0KSB7XG4gICAgICAgICAgICBjYW5jZWxPcGVuID0gcmVqZWN0O1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdGhpcy5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBoYXNBcmd1bWVudHMgPSBhcmd1bWVudHMubGVuZ3RoID4gMDtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmIChoYXNBcmd1bWVudHMpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcIkFyZ3VtZW50cyBub3QgYWxsb3dlZCBpbiBkYi5kZWxldGUoKVwiKTtcbiAgICAgICAgICAgIGlmIChpc0JlaW5nT3BlbmVkKSB7XG4gICAgICAgICAgICAgICAgZGJSZWFkeVByb21pc2UudGhlbihkb0RlbGV0ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGRvRGVsZXRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmdW5jdGlvbiBkb0RlbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICBkYi5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHZhciByZXEgPSBpbmRleGVkREIuZGVsZXRlRGF0YWJhc2UoZGJOYW1lKTtcbiAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gd3JhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaGFzTmF0aXZlR2V0RGF0YWJhc2VOYW1lcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsRGF0YWJhc2VMaXN0KGZ1bmN0aW9uIChkYXRhYmFzZU5hbWVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBvcyA9IGRhdGFiYXNlTmFtZXMuaW5kZXhPZihkYk5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3MgPj0gMCkgcmV0dXJuIGRhdGFiYXNlTmFtZXMuc3BsaWNlKHBvcywgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSB3cmFwKGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpKTtcbiAgICAgICAgICAgICAgICByZXEub25ibG9ja2VkID0gZmlyZU9uQmxvY2tlZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkudW5jYXVnaHQoZGJVbmNhdWdodCk7XG4gICAgfTtcblxuICAgIHRoaXMuYmFja2VuZERCID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gaWRiZGI7XG4gICAgfTtcblxuICAgIHRoaXMuaXNPcGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gaWRiZGIgIT09IG51bGw7XG4gICAgfTtcbiAgICB0aGlzLmhhc0ZhaWxlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGRiT3BlbkVycm9yICE9PSBudWxsO1xuICAgIH07XG4gICAgdGhpcy5keW5hbWljYWxseU9wZW5lZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGF1dG9TY2hlbWE7XG4gICAgfTtcblxuICAgIC8vXG4gICAgLy8gUHJvcGVydGllc1xuICAgIC8vXG4gICAgdGhpcy5uYW1lID0gZGJOYW1lO1xuXG4gICAgLy8gZGIudGFibGVzIC0gYW4gYXJyYXkgb2YgYWxsIFRhYmxlIGluc3RhbmNlcy5cbiAgICBzZXRQcm9wKHRoaXMsIFwidGFibGVzXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLy8gPHJldHVybnMgdHlwZT1cIkFycmF5XCIgZWxlbWVudFR5cGU9XCJXcml0ZWFibGVUYWJsZVwiIC8+XG4gICAgICAgICAgICByZXR1cm4ga2V5cyhhbGxUYWJsZXMpLm1hcChmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhbGxUYWJsZXNbbmFtZV07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy9cbiAgICAvLyBFdmVudHNcbiAgICAvL1xuICAgIHRoaXMub24gPSBFdmVudHModGhpcywgXCJlcnJvclwiLCBcInBvcHVsYXRlXCIsIFwiYmxvY2tlZFwiLCBcInZlcnNpb25jaGFuZ2VcIiwgeyByZWFkeTogW3Byb21pc2FibGVDaGFpbiwgbm9wXSB9KTtcbiAgICB0aGlzLm9uLmVycm9yLnN1YnNjcmliZSA9IGRlcHJlY2F0ZWQoXCJEZXhpZS5vbi5lcnJvclwiLCB0aGlzLm9uLmVycm9yLnN1YnNjcmliZSk7XG4gICAgdGhpcy5vbi5lcnJvci51bnN1YnNjcmliZSA9IGRlcHJlY2F0ZWQoXCJEZXhpZS5vbi5lcnJvci51bnN1YnNjcmliZVwiLCB0aGlzLm9uLmVycm9yLnVuc3Vic2NyaWJlKTtcblxuICAgIHRoaXMub24ucmVhZHkuc3Vic2NyaWJlID0gb3ZlcnJpZGUodGhpcy5vbi5yZWFkeS5zdWJzY3JpYmUsIGZ1bmN0aW9uIChzdWJzY3JpYmUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChzdWJzY3JpYmVyLCBiU3RpY2t5KSB7XG4gICAgICAgICAgICBEZXhpZS52aXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGlmIChvcGVuQ29tcGxldGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGF0YWJhc2UgYWxyZWFkeSBvcGVuLiBDYWxsIHN1YnNjcmliZXIgYXNhcC5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkYk9wZW5FcnJvcikgUHJvbWlzZS5yZXNvbHZlKCkudGhlbihzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gYlN0aWNreTogQWxzbyBzdWJzY3JpYmUgdG8gZnV0dXJlIG9wZW4gc3VjZXNzZXMgKGFmdGVyIGNsb3NlIC8gcmVvcGVuKSBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJTdGlja3kpIHN1YnNjcmliZShzdWJzY3JpYmVyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBEYXRhYmFzZSBub3QgeWV0IG9wZW4uIFN1YnNjcmliZSB0byBpdC5cbiAgICAgICAgICAgICAgICAgICAgc3Vic2NyaWJlKHN1YnNjcmliZXIpO1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiBiU3RpY2t5IGlzIGZhbHN5LCBtYWtlIHN1cmUgdG8gdW5zdWJzY3JpYmUgc3Vic2NyaWJlciB3aGVuIGZpcmVkIG9uY2UuXG4gICAgICAgICAgICAgICAgICAgIGlmICghYlN0aWNreSkgc3Vic2NyaWJlKGZ1bmN0aW9uIHVuc3Vic2NyaWJlKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGIub24ucmVhZHkudW5zdWJzY3JpYmUoc3Vic2NyaWJlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBkYi5vbi5yZWFkeS51bnN1YnNjcmliZSh1bnN1YnNjcmliZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgZmFrZUF1dG9Db21wbGV0ZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRiLm9uKFwicG9wdWxhdGVcIikuZmlyZShkYi5fY3JlYXRlVHJhbnNhY3Rpb24oUkVBRFdSSVRFLCBkYlN0b3JlTmFtZXMsIGdsb2JhbFNjaGVtYSkpO1xuICAgICAgICBkYi5vbihcImVycm9yXCIpLmZpcmUobmV3IEVycm9yKCkpO1xuICAgIH0pO1xuXG4gICAgdGhpcy50cmFuc2FjdGlvbiA9IGZ1bmN0aW9uIChtb2RlLCB0YWJsZUluc3RhbmNlcywgc2NvcGVGdW5jKSB7XG4gICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgLy8vXG4gICAgICAgIC8vLyA8L3N1bW1hcnk+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cIm1vZGVcIiB0eXBlPVwiU3RyaW5nXCI+XCJyXCIgZm9yIHJlYWRvbmx5LCBvciBcInJ3XCIgZm9yIHJlYWR3cml0ZTwvcGFyYW0+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInRhYmxlSW5zdGFuY2VzXCI+VGFibGUgaW5zdGFuY2UsIEFycmF5IG9mIFRhYmxlIGluc3RhbmNlcywgU3RyaW5nIG9yIFN0cmluZyBBcnJheSBvZiBvYmplY3Qgc3RvcmVzIHRvIGluY2x1ZGUgaW4gdGhlIHRyYW5zYWN0aW9uPC9wYXJhbT5cbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic2NvcGVGdW5jXCIgdHlwZT1cIkZ1bmN0aW9uXCI+RnVuY3Rpb24gdG8gZXhlY3V0ZSB3aXRoIHRyYW5zYWN0aW9uPC9wYXJhbT5cblxuICAgICAgICAvLyBMZXQgdGFibGUgYXJndW1lbnRzIGJlIGFsbCBhcmd1bWVudHMgYmV0d2VlbiBtb2RlIGFuZCBsYXN0IGFyZ3VtZW50LlxuICAgICAgICB2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGlmIChpIDwgMikgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KFwiVG9vIGZldyBhcmd1bWVudHNcIik7XG4gICAgICAgIC8vIFByZXZlbnQgb3B0aW16YXRpb24ga2lsbGVyIChodHRwczovL2dpdGh1Yi5jb20vcGV0a2FhbnRvbm92L2JsdWViaXJkL3dpa2kvT3B0aW1pemF0aW9uLWtpbGxlcnMjMzItbGVha2luZy1hcmd1bWVudHMpXG4gICAgICAgIC8vIGFuZCBjbG9uZSBhcmd1bWVudHMgZXhjZXB0IHRoZSBmaXJzdCBvbmUgaW50byBsb2NhbCB2YXIgJ2FyZ3MnLlxuICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShpIC0gMSk7XG4gICAgICAgIHdoaWxlICgtLWkpIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9IC8vIExldCBzY29wZUZ1bmMgYmUgdGhlIGxhc3QgYXJndW1lbnQgYW5kIHBvcCBpdCBzbyB0aGF0IGFyZ3Mgbm93IG9ubHkgY29udGFpbiB0aGUgdGFibGUgYXJndW1lbnRzLlxuICAgICAgICBzY29wZUZ1bmMgPSBhcmdzLnBvcCgpO1xuICAgICAgICB2YXIgdGFibGVzID0gZmxhdHRlbihhcmdzKTsgLy8gU3VwcG9ydCB1c2luZyBhcnJheSBhcyBtaWRkbGUgYXJndW1lbnQsIG9yIGEgbWl4IG9mIGFycmF5cyBhbmQgbm9uLWFycmF5cy5cbiAgICAgICAgdmFyIHBhcmVudFRyYW5zYWN0aW9uID0gUFNELnRyYW5zO1xuICAgICAgICAvLyBDaGVjayBpZiBwYXJlbnQgdHJhbnNhY3Rpb25zIGlzIGJvdW5kIHRvIHRoaXMgZGIgaW5zdGFuY2UsIGFuZCBpZiBjYWxsZXIgd2FudHMgdG8gcmV1c2UgaXRcbiAgICAgICAgaWYgKCFwYXJlbnRUcmFuc2FjdGlvbiB8fCBwYXJlbnRUcmFuc2FjdGlvbi5kYiAhPT0gZGIgfHwgbW9kZS5pbmRleE9mKCchJykgIT09IC0xKSBwYXJlbnRUcmFuc2FjdGlvbiA9IG51bGw7XG4gICAgICAgIHZhciBvbmx5SWZDb21wYXRpYmxlID0gbW9kZS5pbmRleE9mKCc/JykgIT09IC0xO1xuICAgICAgICBtb2RlID0gbW9kZS5yZXBsYWNlKCchJywgJycpLnJlcGxhY2UoJz8nLCAnJyk7IC8vIE9rLiBXaWxsIGNoYW5nZSBhcmd1bWVudHNbMF0gYXMgd2VsbCBidXQgd2Ugd29udCB0b3VjaCBhcmd1bWVudHMgaGVuY2Vmb3J0aC5cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIEdldCBzdG9yZU5hbWVzIGZyb20gYXJndW1lbnRzLiBFaXRoZXIgdGhyb3VnaCBnaXZlbiB0YWJsZSBpbnN0YW5jZXMsIG9yIHRocm91Z2ggZ2l2ZW4gdGFibGUgbmFtZXMuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgdmFyIHN0b3JlTmFtZXMgPSB0YWJsZXMubWFwKGZ1bmN0aW9uICh0YWJsZSkge1xuICAgICAgICAgICAgICAgIHZhciBzdG9yZU5hbWUgPSB0YWJsZSBpbnN0YW5jZW9mIFRhYmxlID8gdGFibGUubmFtZSA6IHRhYmxlO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RvcmVOYW1lICE9PSAnc3RyaW5nJykgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgdGFibGUgYXJndW1lbnQgdG8gRGV4aWUudHJhbnNhY3Rpb24oKS4gT25seSBUYWJsZSBvciBTdHJpbmcgYXJlIGFsbG93ZWRcIik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0b3JlTmFtZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvL1xuICAgICAgICAgICAgLy8gUmVzb2x2ZSBtb2RlLiBBbGxvdyBzaG9ydGN1dHMgXCJyXCIgYW5kIFwicndcIi5cbiAgICAgICAgICAgIC8vXG4gICAgICAgICAgICBpZiAobW9kZSA9PSBcInJcIiB8fCBtb2RlID09IFJFQURPTkxZKSBtb2RlID0gUkVBRE9OTFk7ZWxzZSBpZiAobW9kZSA9PSBcInJ3XCIgfHwgbW9kZSA9PSBSRUFEV1JJVEUpIG1vZGUgPSBSRUFEV1JJVEU7ZWxzZSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkQXJndW1lbnQoXCJJbnZhbGlkIHRyYW5zYWN0aW9uIG1vZGU6IFwiICsgbW9kZSk7XG5cbiAgICAgICAgICAgIGlmIChwYXJlbnRUcmFuc2FjdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIEJhc2ljIGNoZWNrc1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnRUcmFuc2FjdGlvbi5tb2RlID09PSBSRUFET05MWSAmJiBtb2RlID09PSBSRUFEV1JJVEUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9ubHlJZkNvbXBhdGlibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNwYXduIG5ldyB0cmFuc2FjdGlvbiBpbnN0ZWFkLlxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VHJhbnNhY3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuU3ViVHJhbnNhY3Rpb24oXCJDYW5ub3QgZW50ZXIgYSBzdWItdHJhbnNhY3Rpb24gd2l0aCBSRUFEV1JJVEUgbW9kZSB3aGVuIHBhcmVudCB0cmFuc2FjdGlvbiBpcyBSRUFET05MWVwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHBhcmVudFRyYW5zYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JlTmFtZXMuZm9yRWFjaChmdW5jdGlvbiAoc3RvcmVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50VHJhbnNhY3Rpb24gJiYgcGFyZW50VHJhbnNhY3Rpb24uc3RvcmVOYW1lcy5pbmRleE9mKHN0b3JlTmFtZSkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9ubHlJZkNvbXBhdGlibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3Bhd24gbmV3IHRyYW5zYWN0aW9uIGluc3RlYWQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFRyYW5zYWN0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuU3ViVHJhbnNhY3Rpb24oXCJUYWJsZSBcIiArIHN0b3JlTmFtZSArIFwiIG5vdCBpbmNsdWRlZCBpbiBwYXJlbnQgdHJhbnNhY3Rpb24uXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnRUcmFuc2FjdGlvbiA/IHBhcmVudFRyYW5zYWN0aW9uLl9wcm9taXNlKG51bGwsIGZ1bmN0aW9uIChfLCByZWplY3QpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZSk7XG4gICAgICAgICAgICB9KSA6IHJlamVjdGlvbihlLCBkYlVuY2F1Z2h0KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB0aGlzIGlzIGEgc3ViLXRyYW5zYWN0aW9uLCBsb2NrIHRoZSBwYXJlbnQgYW5kIHRoZW4gbGF1bmNoIHRoZSBzdWItdHJhbnNhY3Rpb24uXG4gICAgICAgIHJldHVybiBwYXJlbnRUcmFuc2FjdGlvbiA/IHBhcmVudFRyYW5zYWN0aW9uLl9wcm9taXNlKG1vZGUsIGVudGVyVHJhbnNhY3Rpb25TY29wZSwgXCJsb2NrXCIpIDogZGIuX3doZW5SZWFkeShlbnRlclRyYW5zYWN0aW9uU2NvcGUpO1xuXG4gICAgICAgIGZ1bmN0aW9uIGVudGVyVHJhbnNhY3Rpb25TY29wZShyZXNvbHZlKSB7XG4gICAgICAgICAgICB2YXIgcGFyZW50UFNEID0gUFNEO1xuICAgICAgICAgICAgcmVzb2x2ZShQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3U2NvcGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBLZWVwIGEgcG9pbnRlciB0byBsYXN0IG5vbi10cmFuc2FjdGlvbmFsIFBTRCB0byB1c2UgaWYgc29tZW9uZSBjYWxscyBEZXhpZS5pZ25vcmVUcmFuc2FjdGlvbigpLlxuICAgICAgICAgICAgICAgICAgICBQU0QudHJhbnNsZXNzID0gUFNELnRyYW5zbGVzcyB8fCBwYXJlbnRQU0Q7XG4gICAgICAgICAgICAgICAgICAgIC8vIE91ciB0cmFuc2FjdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgLy9yZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdHJhbnMgPSBkYi5fY3JlYXRlVHJhbnNhY3Rpb24obW9kZSwgc3RvcmVOYW1lcywgZ2xvYmFsU2NoZW1hLCBwYXJlbnRUcmFuc2FjdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIC8vIExldCB0aGUgdHJhbnNhY3Rpb24gaW5zdGFuY2UgYmUgcGFydCBvZiBhIFByb21pc2Utc3BlY2lmaWMgZGF0YSAoUFNEKSB2YWx1ZS5cbiAgICAgICAgICAgICAgICAgICAgUFNELnRyYW5zID0gdHJhbnM7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudFRyYW5zYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbXVsYXRlIHRyYW5zYWN0aW9uIGNvbW1pdCBhd2FyZW5lc3MgZm9yIGlubmVyIHRyYW5zYWN0aW9uIChtdXN0ICdjb21taXQnIHdoZW4gdGhlIGlubmVyIHRyYW5zYWN0aW9uIGhhcyBubyBtb3JlIG9wZXJhdGlvbnMgb25nb2luZylcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zLmlkYnRyYW5zID0gcGFyZW50VHJhbnNhY3Rpb24uaWRidHJhbnM7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFucy5jcmVhdGUoKTsgLy8gQ3JlYXRlIHRoZSBiYWNrZW5kIHRyYW5zYWN0aW9uIHNvIHRoYXQgY29tcGxldGUoKSBvciBlcnJvcigpIHdpbGwgdHJpZ2dlciBldmVuIGlmIG5vIG9wZXJhdGlvbiBpcyBtYWRlIHVwb24gaXQuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBQcm92aWRlIGFyZ3VtZW50cyB0byB0aGUgc2NvcGUgZnVuY3Rpb24gKGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5KVxuICAgICAgICAgICAgICAgICAgICB2YXIgdGFibGVBcmdzID0gc3RvcmVOYW1lcy5tYXAoZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhbGxUYWJsZXNbbmFtZV07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB0YWJsZUFyZ3MucHVzaCh0cmFucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIHJldHVyblZhbHVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5mb2xsb3coZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRmluYWxseSwgY2FsbCB0aGUgc2NvcGUgZnVuY3Rpb24gd2l0aCBvdXIgdGFibGUgYW5kIHRyYW5zYWN0aW9uIGFyZ3VtZW50cy5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gc2NvcGVGdW5jLmFwcGx5KHRyYW5zLCB0YWJsZUFyZ3MpOyAvLyBOT1RFOiByZXR1cm5WYWx1ZSBpcyB1c2VkIGluIHRyYW5zLm9uLmNvbXBsZXRlKCkgbm90IGFzIGEgcmV0dXJuVmFsdWUgdG8gdGhpcyBmdW5jLlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJldHVyblZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiByZXR1cm5WYWx1ZS5uZXh0ID09PSAnZnVuY3Rpb24nICYmIHR5cGVvZiByZXR1cm5WYWx1ZS50aHJvdyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBzY29wZUZ1bmMgcmV0dXJuZWQgYW4gaXRlcmF0b3Igd2l0aCB0aHJvdy1zdXBwb3J0LiBIYW5kbGUgeWllbGQgYXMgYXdhaXQuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZhbHVlID0gYXdhaXRJdGVyYXRvcihyZXR1cm5WYWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcmV0dXJuVmFsdWUudGhlbiA9PT0gJ2Z1bmN0aW9uJyAmJiAhaGFzT3duKHJldHVyblZhbHVlLCAnX1BTRCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBleGNlcHRpb25zLkluY29tcGF0aWJsZVByb21pc2UoXCJJbmNvbXBhdGlibGUgUHJvbWlzZSByZXR1cm5lZCBmcm9tIHRyYW5zYWN0aW9uIHNjb3BlIChyZWFkIG1vcmUgYXQgaHR0cDovL3Rpbnl1cmwuY29tL3pueXFqcWMpLiBUcmFuc2FjdGlvbiBzY29wZTogXCIgKyBzY29wZUZ1bmMudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KS51bmNhdWdodChkYlVuY2F1Z2h0KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnRUcmFuc2FjdGlvbikgdHJhbnMuX3Jlc29sdmUoKTsgLy8gc3ViIHRyYW5zYWN0aW9ucyBkb24ndCByZWFjdCB0byBpZGJ0cmFucy5vbmNvbXBsZXRlLiBXZSBtdXN0IHRyaWdnZXIgYSBhY29tcGxldGlvbi5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cmFucy5fY29tcGxldGlvbjsgLy8gRXZlbiBpZiBXRSBiZWxpZXZlIGV2ZXJ5dGhpbmcgaXMgZmluZS4gQXdhaXQgSURCVHJhbnNhY3Rpb24ncyBvbmNvbXBsZXRlIG9yIG9uZXJyb3IgYXMgd2VsbC5cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmV0dXJuVmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvL3JlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyYW5zLl9yZWplY3QoZSk7IC8vIFllcywgYWJvdmUgdGhlbi1oYW5kbGVyIHdlcmUgbWF5YmUgbm90IGNhbGxlZCBiZWNhdXNlIG9mIGFuIHVuaGFuZGxlZCByZWplY3Rpb24gaW4gc2NvcGVGdW5jIVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdGlvbihlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIC8vfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdGhpcy50YWJsZSA9IGZ1bmN0aW9uICh0YWJsZU5hbWUpIHtcbiAgICAgICAgLy8vIDxyZXR1cm5zIHR5cGU9XCJXcml0ZWFibGVUYWJsZVwiPjwvcmV0dXJucz5cbiAgICAgICAgaWYgKGZha2UgJiYgYXV0b1NjaGVtYSkgcmV0dXJuIG5ldyBXcml0ZWFibGVUYWJsZSh0YWJsZU5hbWUpO1xuICAgICAgICBpZiAoIWhhc093bihhbGxUYWJsZXMsIHRhYmxlTmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRUYWJsZSgnVGFibGUgJyArIHRhYmxlTmFtZSArICcgZG9lcyBub3QgZXhpc3QnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWxsVGFibGVzW3RhYmxlTmFtZV07XG4gICAgfTtcblxuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIC8vIFRhYmxlIENsYXNzXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgZnVuY3Rpb24gVGFibGUobmFtZSwgdGFibGVTY2hlbWEsIGNvbGxDbGFzcykge1xuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJuYW1lXCIgdHlwZT1cIlN0cmluZ1wiPjwvcGFyYW0+XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gdGFibGVTY2hlbWE7XG4gICAgICAgIHRoaXMuaG9vayA9IGFsbFRhYmxlc1tuYW1lXSA/IGFsbFRhYmxlc1tuYW1lXS5ob29rIDogRXZlbnRzKG51bGwsIHtcbiAgICAgICAgICAgIFwiY3JlYXRpbmdcIjogW2hvb2tDcmVhdGluZ0NoYWluLCBub3BdLFxuICAgICAgICAgICAgXCJyZWFkaW5nXCI6IFtwdXJlRnVuY3Rpb25DaGFpbiwgbWlycm9yXSxcbiAgICAgICAgICAgIFwidXBkYXRpbmdcIjogW2hvb2tVcGRhdGluZ0NoYWluLCBub3BdLFxuICAgICAgICAgICAgXCJkZWxldGluZ1wiOiBbaG9va0RlbGV0aW5nQ2hhaW4sIG5vcF1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2NvbGxDbGFzcyA9IGNvbGxDbGFzcyB8fCBDb2xsZWN0aW9uO1xuICAgIH1cblxuICAgIHByb3BzKFRhYmxlLnByb3RvdHlwZSwge1xuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRhYmxlIFByb3RlY3RlZCBNZXRob2RzXG4gICAgICAgIC8vXG5cbiAgICAgICAgX3RyYW5zOiBmdW5jdGlvbiBnZXRUcmFuc2FjdGlvbihtb2RlLCBmbiwgd3JpdGVMb2NrZWQpIHtcbiAgICAgICAgICAgIHZhciB0cmFucyA9IFBTRC50cmFucztcbiAgICAgICAgICAgIHJldHVybiB0cmFucyAmJiB0cmFucy5kYiA9PT0gZGIgPyB0cmFucy5fcHJvbWlzZShtb2RlLCBmbiwgd3JpdGVMb2NrZWQpIDogdGVtcFRyYW5zYWN0aW9uKG1vZGUsIFt0aGlzLm5hbWVdLCBmbik7XG4gICAgICAgIH0sXG4gICAgICAgIF9pZGJzdG9yZTogZnVuY3Rpb24gZ2V0SURCT2JqZWN0U3RvcmUobW9kZSwgZm4sIHdyaXRlTG9ja2VkKSB7XG4gICAgICAgICAgICBpZiAoZmFrZSkgcmV0dXJuIG5ldyBQcm9taXNlKGZuKTsgLy8gU2ltcGxpZnkgdGhlIHdvcmsgZm9yIEludGVsbGlzZW5zZS9Db2RlIGNvbXBsZXRpb24uXG4gICAgICAgICAgICB2YXIgdHJhbnMgPSBQU0QudHJhbnMsXG4gICAgICAgICAgICAgICAgdGFibGVOYW1lID0gdGhpcy5uYW1lO1xuICAgICAgICAgICAgZnVuY3Rpb24gc3VwcGx5SWRiU3RvcmUocmVzb2x2ZSwgcmVqZWN0LCB0cmFucykge1xuICAgICAgICAgICAgICAgIGZuKHJlc29sdmUsIHJlamVjdCwgdHJhbnMuaWRidHJhbnMub2JqZWN0U3RvcmUodGFibGVOYW1lKSwgdHJhbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRyYW5zICYmIHRyYW5zLmRiID09PSBkYiA/IHRyYW5zLl9wcm9taXNlKG1vZGUsIHN1cHBseUlkYlN0b3JlLCB3cml0ZUxvY2tlZCkgOiB0ZW1wVHJhbnNhY3Rpb24obW9kZSwgW3RoaXMubmFtZV0sIHN1cHBseUlkYlN0b3JlKTtcbiAgICAgICAgfSxcblxuICAgICAgICAvL1xuICAgICAgICAvLyBUYWJsZSBQdWJsaWMgTWV0aG9kc1xuICAgICAgICAvL1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uIChrZXksIGNiKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5faWRic3RvcmUoUkVBRE9OTFksIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgZmFrZSAmJiByZXNvbHZlKHNlbGYuc2NoZW1hLmluc3RhbmNlVGVtcGxhdGUpO1xuICAgICAgICAgICAgICAgIHZhciByZXEgPSBpZGJzdG9yZS5nZXQoa2V5KTtcbiAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSB3cmFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzZWxmLmhvb2sucmVhZGluZy5maXJlKHJlcS5yZXN1bHQpKTtcbiAgICAgICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgICAgfSkudGhlbihjYik7XG4gICAgICAgIH0sXG4gICAgICAgIHdoZXJlOiBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFdoZXJlQ2xhdXNlKHRoaXMsIGluZGV4TmFtZSk7XG4gICAgICAgIH0sXG4gICAgICAgIGNvdW50OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnRvQ29sbGVjdGlvbigpLmNvdW50KGNiKTtcbiAgICAgICAgfSxcbiAgICAgICAgb2Zmc2V0OiBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0NvbGxlY3Rpb24oKS5vZmZzZXQob2Zmc2V0KTtcbiAgICAgICAgfSxcbiAgICAgICAgbGltaXQ6IGZ1bmN0aW9uIChudW1Sb3dzKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0NvbGxlY3Rpb24oKS5saW1pdChudW1Sb3dzKTtcbiAgICAgICAgfSxcbiAgICAgICAgcmV2ZXJzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Db2xsZWN0aW9uKCkucmV2ZXJzZSgpO1xuICAgICAgICB9LFxuICAgICAgICBmaWx0ZXI6IGZ1bmN0aW9uIChmaWx0ZXJGdW5jdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMudG9Db2xsZWN0aW9uKCkuYW5kKGZpbHRlckZ1bmN0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgZWFjaDogZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0NvbGxlY3Rpb24oKS5lYWNoKGZuKTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9BcnJheTogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b0NvbGxlY3Rpb24oKS50b0FycmF5KGNiKTtcbiAgICAgICAgfSxcbiAgICAgICAgb3JkZXJCeTogZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuX2NvbGxDbGFzcyhuZXcgV2hlcmVDbGF1c2UodGhpcywgaW5kZXgpKTtcbiAgICAgICAgfSxcblxuICAgICAgICB0b0NvbGxlY3Rpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY29sbENsYXNzKG5ldyBXaGVyZUNsYXVzZSh0aGlzKSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgbWFwVG9DbGFzczogZnVuY3Rpb24gKGNvbnN0cnVjdG9yLCBzdHJ1Y3R1cmUpIHtcbiAgICAgICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgICAgIC8vLyAgICAgTWFwIHRhYmxlIHRvIGEgamF2YXNjcmlwdCBjb25zdHJ1Y3RvciBmdW5jdGlvbi4gT2JqZWN0cyByZXR1cm5lZCBmcm9tIHRoZSBkYXRhYmFzZSB3aWxsIGJlIGluc3RhbmNlcyBvZiB0aGlzIGNsYXNzLCBtYWtpbmdcbiAgICAgICAgICAgIC8vLyAgICAgaXQgcG9zc2libGUgdG8gdGhlIGluc3RhbmNlT2Ygb3BlcmF0b3IgYXMgd2VsbCBhcyBleHRlbmRpbmcgdGhlIGNsYXNzIHVzaW5nIGNvbnN0cnVjdG9yLnByb3RvdHlwZS5tZXRob2QgPSBmdW5jdGlvbigpey4uLn0uXG4gICAgICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwiY29uc3RydWN0b3JcIj5Db25zdHJ1Y3RvciBmdW5jdGlvbiByZXByZXNlbnRpbmcgdGhlIGNsYXNzLjwvcGFyYW0+XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJzdHJ1Y3R1cmVcIiBvcHRpb25hbD1cInRydWVcIj5IZWxwcyBJREUgY29kZSBjb21wbGV0aW9uIGJ5IGtub3dpbmcgdGhlIG1lbWJlcnMgdGhhdCBvYmplY3RzIGNvbnRhaW4gYW5kIG5vdCBqdXN0IHRoZSBpbmRleGVzLiBBbHNvXG4gICAgICAgICAgICAvLy8ga25vdyB3aGF0IHR5cGUgZWFjaCBtZW1iZXIgaGFzLiBFeGFtcGxlOiB7bmFtZTogU3RyaW5nLCBlbWFpbEFkZHJlc3NlczogW1N0cmluZ10sIHBhc3N3b3JkfTwvcGFyYW0+XG4gICAgICAgICAgICB0aGlzLnNjaGVtYS5tYXBwZWRDbGFzcyA9IGNvbnN0cnVjdG9yO1xuICAgICAgICAgICAgdmFyIGluc3RhbmNlVGVtcGxhdGUgPSBPYmplY3QuY3JlYXRlKGNvbnN0cnVjdG9yLnByb3RvdHlwZSk7XG4gICAgICAgICAgICBpZiAoc3RydWN0dXJlKSB7XG4gICAgICAgICAgICAgICAgLy8gc3RydWN0dXJlIGFuZCBpbnN0YW5jZVRlbXBsYXRlIGlzIGZvciBJREUgY29kZSBjb21wZXRpb24gb25seSB3aGlsZSBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgaXMgZm9yIGFjdHVhbCBpbmhlcml0YW5jZS5cbiAgICAgICAgICAgICAgICBhcHBseVN0cnVjdHVyZShpbnN0YW5jZVRlbXBsYXRlLCBzdHJ1Y3R1cmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5zY2hlbWEuaW5zdGFuY2VUZW1wbGF0ZSA9IGluc3RhbmNlVGVtcGxhdGU7XG5cbiAgICAgICAgICAgIC8vIE5vdywgc3Vic2NyaWJlIHRvIHRoZSB3aGVuKFwicmVhZGluZ1wiKSBldmVudCB0byBtYWtlIGFsbCBvYmplY3RzIHRoYXQgY29tZSBvdXQgZnJvbSB0aGlzIHRhYmxlIGluaGVyaXQgZnJvbSBnaXZlbiBjbGFzc1xuICAgICAgICAgICAgLy8gbm8gbWF0dGVyIHdoaWNoIG1ldGhvZCB0byB1c2UgZm9yIHJlYWRpbmcgKFRhYmxlLmdldCgpIG9yIFRhYmxlLndoZXJlKC4uLikuLi4gKVxuICAgICAgICAgICAgdmFyIHJlYWRIb29rID0gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICAgICAgICAgIGlmICghb2JqKSByZXR1cm4gb2JqOyAvLyBObyB2YWxpZCBvYmplY3QuIChWYWx1ZSBpcyBudWxsKS4gUmV0dXJuIGFzIGlzLlxuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBhIG5ldyBvYmplY3QgdGhhdCBkZXJpdmVzIGZyb20gY29uc3RydWN0b3I6XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IE9iamVjdC5jcmVhdGUoY29uc3RydWN0b3IucHJvdG90eXBlKTtcbiAgICAgICAgICAgICAgICAvLyBDbG9uZSBtZW1iZXJzOlxuICAgICAgICAgICAgICAgIGZvciAodmFyIG0gaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChoYXNPd24ob2JqLCBtKSkgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc1ttXSA9IG9ialttXTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoXykge31cbiAgICAgICAgICAgICAgICB9cmV0dXJuIHJlcztcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnNjaGVtYS5yZWFkSG9vaykge1xuICAgICAgICAgICAgICAgIHRoaXMuaG9vay5yZWFkaW5nLnVuc3Vic2NyaWJlKHRoaXMuc2NoZW1hLnJlYWRIb29rKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuc2NoZW1hLnJlYWRIb29rID0gcmVhZEhvb2s7XG4gICAgICAgICAgICB0aGlzLmhvb2soXCJyZWFkaW5nXCIsIHJlYWRIb29rKTtcbiAgICAgICAgICAgIHJldHVybiBjb25zdHJ1Y3RvcjtcbiAgICAgICAgfSxcbiAgICAgICAgZGVmaW5lQ2xhc3M6IGZ1bmN0aW9uIChzdHJ1Y3R1cmUpIHtcbiAgICAgICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgICAgIC8vLyAgICAgRGVmaW5lIGFsbCBtZW1iZXJzIG9mIHRoZSBjbGFzcyB0aGF0IHJlcHJlc2VudHMgdGhlIHRhYmxlLiBUaGlzIHdpbGwgaGVscCBjb2RlIGNvbXBsZXRpb24gb2Ygd2hlbiBvYmplY3RzIGFyZSByZWFkIGZyb20gdGhlIGRhdGFiYXNlXG4gICAgICAgICAgICAvLy8gICAgIGFzIHdlbGwgYXMgbWFraW5nIGl0IHBvc3NpYmxlIHRvIGV4dGVuZCB0aGUgcHJvdG90eXBlIG9mIHRoZSByZXR1cm5lZCBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cbiAgICAgICAgICAgIC8vLyA8L3N1bW1hcnk+XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJzdHJ1Y3R1cmVcIj5IZWxwcyBJREUgY29kZSBjb21wbGV0aW9uIGJ5IGtub3dpbmcgdGhlIG1lbWJlcnMgdGhhdCBvYmplY3RzIGNvbnRhaW4gYW5kIG5vdCBqdXN0IHRoZSBpbmRleGVzLiBBbHNvXG4gICAgICAgICAgICAvLy8ga25vdyB3aGF0IHR5cGUgZWFjaCBtZW1iZXIgaGFzLiBFeGFtcGxlOiB7bmFtZTogU3RyaW5nLCBlbWFpbEFkZHJlc3NlczogW1N0cmluZ10sIHByb3BlcnRpZXM6IHtzaG9lU2l6ZTogTnVtYmVyfX08L3BhcmFtPlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFwVG9DbGFzcyhEZXhpZS5kZWZpbmVDbGFzcyhzdHJ1Y3R1cmUpLCBzdHJ1Y3R1cmUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICAvLyBXcml0ZWFibGVUYWJsZSBDbGFzcyAoZXh0ZW5kcyBUYWJsZSlcbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICBmdW5jdGlvbiBXcml0ZWFibGVUYWJsZShuYW1lLCB0YWJsZVNjaGVtYSwgY29sbENsYXNzKSB7XG4gICAgICAgIFRhYmxlLmNhbGwodGhpcywgbmFtZSwgdGFibGVTY2hlbWEsIGNvbGxDbGFzcyB8fCBXcml0ZWFibGVDb2xsZWN0aW9uKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBCdWxrRXJyb3JIYW5kbGVyQ2F0Y2hBbGwoZXJyb3JMaXN0LCBkb25lLCBzdXBwb3J0SG9va3MpIHtcbiAgICAgICAgcmV0dXJuIChzdXBwb3J0SG9va3MgPyBob29rZWRFdmVudFJlamVjdEhhbmRsZXIgOiBldmVudFJlamVjdEhhbmRsZXIpKGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBlcnJvckxpc3QucHVzaChlKTtcbiAgICAgICAgICAgIGRvbmUgJiYgZG9uZSgpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBidWxrRGVsZXRlKGlkYnN0b3JlLCB0cmFucywga2V5c09yVHVwbGVzLCBoYXNEZWxldGVIb29rLCBkZWxldGluZ0hvb2spIHtcbiAgICAgICAgLy8gSWYgaGFzRGVsZXRlSG9vaywga2V5c09yVHVwbGVzIG11c3QgYmUgYW4gYXJyYXkgb2YgdHVwbGVzOiBbW2tleTEsIHZhbHVlMl0sW2tleTIsdmFsdWUyXSwuLi5dLFxuICAgICAgICAvLyBlbHNlIGtleXNPclR1cGxlcyBtdXN0IGJlIGp1c3QgYW4gYXJyYXkgb2Yga2V5czogW2tleTEsIGtleTIsIC4uLl0uXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgbGVuID0ga2V5c09yVHVwbGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBsYXN0SXRlbSA9IGxlbiAtIDE7XG4gICAgICAgICAgICBpZiAobGVuID09PSAwKSByZXR1cm4gcmVzb2x2ZSgpO1xuICAgICAgICAgICAgaWYgKCFoYXNEZWxldGVIb29rKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVxID0gaWRic3RvcmUuZGVsZXRlKGtleXNPclR1cGxlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gd3JhcChldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBsYXN0SXRlbSkgcmVxLm9uc3VjY2VzcyA9IHdyYXAoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgaG9va0N0eCxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JIYW5kbGVyID0gaG9va2VkRXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCksXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3NIYW5kbGVyID0gaG9va2VkRXZlbnRTdWNjZXNzSGFuZGxlcihudWxsKTtcbiAgICAgICAgICAgICAgICB0cnlDYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvb2tDdHggPSB7IG9uc3VjY2VzczogbnVsbCwgb25lcnJvcjogbnVsbCB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHR1cGxlID0ga2V5c09yVHVwbGVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRpbmdIb29rLmNhbGwoaG9va0N0eCwgdHVwbGVbMF0sIHR1cGxlWzFdLCB0cmFucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVxID0gaWRic3RvcmUuZGVsZXRlKHR1cGxlWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5faG9va0N0eCA9IGhvb2tDdHg7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGVycm9ySGFuZGxlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBsYXN0SXRlbSkgcmVxLm9uc3VjY2VzcyA9IGhvb2tlZEV2ZW50U3VjY2Vzc0hhbmRsZXIocmVzb2x2ZSk7ZWxzZSByZXEub25zdWNjZXNzID0gc3VjY2Vzc0hhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIGhvb2tDdHgub25lcnJvciAmJiBob29rQ3R4Lm9uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS51bmNhdWdodChkYlVuY2F1Z2h0KTtcbiAgICB9XG5cbiAgICBkZXJpdmUoV3JpdGVhYmxlVGFibGUpLmZyb20oVGFibGUpLmV4dGVuZCh7XG4gICAgICAgIGJ1bGtEZWxldGU6IGZ1bmN0aW9uIChrZXlzJCQxKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5ob29rLmRlbGV0aW5nLmZpcmUgPT09IG5vcCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9pZGJzdG9yZShSRUFEV1JJVEUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlLCB0cmFucykge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGJ1bGtEZWxldGUoaWRic3RvcmUsIHRyYW5zLCBrZXlzJCQxLCBmYWxzZSwgbm9wKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndoZXJlKCc6aWQnKS5hbnlPZihrZXlzJCQxKS5kZWxldGUoKS50aGVuKGZ1bmN0aW9uICgpIHt9KTsgLy8gUmVzb2x2ZSB3aXRoIHVuZGVmaW5lZC5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYnVsa1B1dDogZnVuY3Rpb24gKG9iamVjdHMsIGtleXMkJDEpIHtcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9pZGJzdG9yZShSRUFEV1JJVEUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpZGJzdG9yZS5rZXlQYXRoICYmICFfdGhpcy5zY2hlbWEucHJpbUtleS5hdXRvICYmICFrZXlzJCQxKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5JbnZhbGlkQXJndW1lbnQoXCJidWxrUHV0KCkgd2l0aCBub24taW5ib3VuZCBrZXlzIHJlcXVpcmVzIGtleXMgYXJyYXkgaW4gc2Vjb25kIGFyZ3VtZW50XCIpO1xuICAgICAgICAgICAgICAgIGlmIChpZGJzdG9yZS5rZXlQYXRoICYmIGtleXMkJDEpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcImJ1bGtQdXQoKToga2V5cyBhcmd1bWVudCBpbnZhbGlkIG9uIHRhYmxlcyB3aXRoIGluYm91bmQga2V5c1wiKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5cyQkMSAmJiBrZXlzJCQxLmxlbmd0aCAhPT0gb2JqZWN0cy5sZW5ndGgpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcIkFyZ3VtZW50cyBvYmplY3RzIGFuZCBrZXlzIG11c3QgaGF2ZSB0aGUgc2FtZSBsZW5ndGhcIik7XG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdHMubGVuZ3RoID09PSAwKSByZXR1cm4gcmVzb2x2ZSgpOyAvLyBDYWxsZXIgcHJvdmlkZWQgZW1wdHkgbGlzdC5cbiAgICAgICAgICAgICAgICB2YXIgZG9uZSA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yTGlzdC5sZW5ndGggPT09IDApIHJlc29sdmUocmVzdWx0KTtlbHNlIHJlamVjdChuZXcgQnVsa0Vycm9yKF90aGlzLm5hbWUgKyAnLmJ1bGtQdXQoKTogJyArIGVycm9yTGlzdC5sZW5ndGggKyAnIG9mICcgKyBudW1PYmpzICsgJyBvcGVyYXRpb25zIGZhaWxlZCcsIGVycm9yTGlzdCkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgdmFyIHJlcSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JMaXN0ID0gW10sXG4gICAgICAgICAgICAgICAgICAgIGVycm9ySGFuZGxlcixcbiAgICAgICAgICAgICAgICAgICAgbnVtT2JqcyA9IG9iamVjdHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICB0YWJsZSA9IF90aGlzO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5ob29rLmNyZWF0aW5nLmZpcmUgPT09IG5vcCAmJiBfdGhpcy5ob29rLnVwZGF0aW5nLmZpcmUgPT09IG5vcCkge1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBTdGFuZGFyZCBCdWxrIChubyAnY3JlYXRpbmcnIG9yICd1cGRhdGluZycgaG9va3MgdG8gY2FyZSBhYm91dClcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgZXJyb3JIYW5kbGVyID0gQnVsa0Vycm9ySGFuZGxlckNhdGNoQWxsKGVycm9yTGlzdCk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqZWN0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcSA9IGtleXMkJDEgPyBpZGJzdG9yZS5wdXQob2JqZWN0c1tpXSwga2V5cyQkMVtpXSkgOiBpZGJzdG9yZS5wdXQob2JqZWN0c1tpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGVycm9ySGFuZGxlcjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IG5lZWQgdG8gY2F0Y2ggc3VjY2VzcyBvciBlcnJvciBvbiB0aGUgbGFzdCBvcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgLy8gYWNjb3JkaW5nIHRvIHRoZSBJREIgc3BlYy5cbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBCdWxrRXJyb3JIYW5kbGVyQ2F0Y2hBbGwoZXJyb3JMaXN0LCBkb25lKTtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGV2ZW50U3VjY2Vzc0hhbmRsZXIoZG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVmZmVjdGl2ZUtleXMgPSBrZXlzJCQxIHx8IGlkYnN0b3JlLmtleVBhdGggJiYgb2JqZWN0cy5tYXAoZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBnZXRCeUtleVBhdGgobywgaWRic3RvcmUua2V5UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAvLyBHZW5lcmF0ZSBtYXAgb2Yge1trZXldOiBvYmplY3R9XG4gICAgICAgICAgICAgICAgICAgIHZhciBvYmplY3RMb29rdXAgPSBlZmZlY3RpdmVLZXlzICYmIGFycmF5VG9PYmplY3QoZWZmZWN0aXZlS2V5cywgZnVuY3Rpb24gKGtleSwgaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleSAhPSBudWxsICYmIFtrZXksIG9iamVjdHNbaV1dO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHByb21pc2UgPSAhZWZmZWN0aXZlS2V5cyA/XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQXV0by1pbmNyZW1lbnRlZCBrZXktbGVzcyBvYmplY3RzIG9ubHkgd2l0aG91dCBhbnkga2V5cyBhcmd1bWVudC5cbiAgICAgICAgICAgICAgICAgICAgdGFibGUuYnVsa0FkZChvYmplY3RzKSA6XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gS2V5cyBwcm92aWRlZC4gRWl0aGVyIGFzIGluYm91bmQgaW4gcHJvdmlkZWQgb2JqZWN0cywgb3IgYXMgYSBrZXlzIGFyZ3VtZW50LlxuICAgICAgICAgICAgICAgICAgICAvLyBCZWdpbiB3aXRoIHVwZGF0aW5nIHRob3NlIHRoYXQgZXhpc3RzIGluIERCOlxuICAgICAgICAgICAgICAgICAgICB0YWJsZS53aGVyZSgnOmlkJykuYW55T2YoZWZmZWN0aXZlS2V5cy5maWx0ZXIoZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGtleSAhPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICB9KSkubW9kaWZ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBvYmplY3RMb29rdXBbdGhpcy5wcmltS2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdExvb2t1cFt0aGlzLnByaW1LZXldID0gbnVsbDsgLy8gTWFyayBhcyBcImRvbid0IGFkZCB0aGlzXCJcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goTW9kaWZ5RXJyb3IsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvckxpc3QgPSBlLmZhaWx1cmVzOyAvLyBObyBuZWVkIHRvIGNvbmNhdCBoZXJlLiBUaGVzZSBhcmUgdGhlIGZpcnN0IGVycm9ycyBhZGRlZC5cbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3csIGxldCdzIGV4YW1pbmUgd2hpY2ggaXRlbXMgZGlkbnQgZXhpc3Qgc28gd2UgY2FuIGFkZCB0aGVtOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9ianNUb0FkZCA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXNUb0FkZCA9IGtleXMkJDEgJiYgW107XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJdGVyYXRlIGJhY2t3YXJkcy4gV2h5PyBCZWNhdXNlIGlmIHNhbWUga2V5IHdhcyB1c2VkIHR3aWNlLCBqdXN0IGFkZCB0aGUgbGFzdCBvbmUuXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gZWZmZWN0aXZlS2V5cy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBlZmZlY3RpdmVLZXlzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXkgPT0gbnVsbCB8fCBvYmplY3RMb29rdXBba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmpzVG9BZGQucHVzaChvYmplY3RzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5cyQkMSAmJiBrZXlzVG9BZGQucHVzaChrZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoa2V5ICE9IG51bGwpIG9iamVjdExvb2t1cFtrZXldID0gbnVsbDsgLy8gTWFyayBhcyBcImRvbnQgYWRkIGFnYWluXCJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgaXRlbXMgYXJlIGluIHJldmVyc2Ugb3JkZXIgc28gcmV2ZXJzZSB0aGVtIGJlZm9yZSBhZGRpbmcuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb3VsZCBiZSBpbXBvcnRhbnQgaW4gb3JkZXIgdG8gZ2V0IGF1dG8taW5jcmVtZW50ZWQga2V5cyB0aGUgd2F5IHRoZSBjYWxsZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHdvdWxkIGV4cGVjdC4gQ291bGQgaGF2ZSB1c2VkIHVuc2hpZnQgaW5zdGVhZCBvZiBwdXNoKCkvcmV2ZXJzZSgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gYnV0OiBodHRwOi8vanNwZXJmLmNvbS91bnNoaWZ0LXZzLXJldmVyc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG9ianNUb0FkZC5yZXZlcnNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzJCQxICYmIGtleXNUb0FkZC5yZXZlcnNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGFibGUuYnVsa0FkZChvYmpzVG9BZGQsIGtleXNUb0FkZCk7XG4gICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGxhc3RBZGRlZEtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVzb2x2ZSB3aXRoIGtleSBvZiB0aGUgbGFzdCBvYmplY3QgaW4gZ2l2ZW4gYXJndW1lbnRzIHRvIGJ1bGtQdXQoKTpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsYXN0RWZmZWN0aXZlS2V5ID0gZWZmZWN0aXZlS2V5c1tlZmZlY3RpdmVLZXlzLmxlbmd0aCAtIDFdOyAvLyBLZXkgd2FzIHByb3ZpZGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhc3RFZmZlY3RpdmVLZXkgIT0gbnVsbCA/IGxhc3RFZmZlY3RpdmVLZXkgOiBsYXN0QWRkZWRLZXk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHByb21pc2UudGhlbihkb25lKS5jYXRjaChCdWxrRXJyb3IsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDb25jYXQgZmFpbHVyZSBmcm9tIE1vZGlmeUVycm9yIGFuZCByZWplY3QgdXNpbmcgb3VyICdkb25lJyBtZXRob2QuXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvckxpc3QgPSBlcnJvckxpc3QuY29uY2F0KGUuZmFpbHVyZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChyZWplY3QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIFwibG9ja2VkXCIpOyAvLyBJZiBjYWxsZWQgZnJvbSB0cmFuc2FjdGlvbiBzY29wZSwgbG9jayB0cmFuc2FjdGlvbiB0aWwgYWxsIHN0ZXBzIGFyZSBkb25lLlxuICAgICAgICB9LFxuICAgICAgICBidWxrQWRkOiBmdW5jdGlvbiAob2JqZWN0cywga2V5cyQkMSkge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICAgICAgICAgIGNyZWF0aW5nSG9vayA9IHRoaXMuaG9vay5jcmVhdGluZy5maXJlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkYnN0b3JlKFJFQURXUklURSwgZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUsIHRyYW5zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpZGJzdG9yZS5rZXlQYXRoICYmICFzZWxmLnNjaGVtYS5wcmltS2V5LmF1dG8gJiYgIWtleXMkJDEpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcImJ1bGtBZGQoKSB3aXRoIG5vbi1pbmJvdW5kIGtleXMgcmVxdWlyZXMga2V5cyBhcnJheSBpbiBzZWNvbmQgYXJndW1lbnRcIik7XG4gICAgICAgICAgICAgICAgaWYgKGlkYnN0b3JlLmtleVBhdGggJiYga2V5cyQkMSkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KFwiYnVsa0FkZCgpOiBrZXlzIGFyZ3VtZW50IGludmFsaWQgb24gdGFibGVzIHdpdGggaW5ib3VuZCBrZXlzXCIpO1xuICAgICAgICAgICAgICAgIGlmIChrZXlzJCQxICYmIGtleXMkJDEubGVuZ3RoICE9PSBvYmplY3RzLmxlbmd0aCkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KFwiQXJndW1lbnRzIG9iamVjdHMgYW5kIGtleXMgbXVzdCBoYXZlIHRoZSBzYW1lIGxlbmd0aFwiKTtcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0cy5sZW5ndGggPT09IDApIHJldHVybiByZXNvbHZlKCk7IC8vIENhbGxlciBwcm92aWRlZCBlbXB0eSBsaXN0LlxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRvbmUocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvckxpc3QubGVuZ3RoID09PSAwKSByZXNvbHZlKHJlc3VsdCk7ZWxzZSByZWplY3QobmV3IEJ1bGtFcnJvcihzZWxmLm5hbWUgKyAnLmJ1bGtBZGQoKTogJyArIGVycm9yTGlzdC5sZW5ndGggKyAnIG9mICcgKyBudW1PYmpzICsgJyBvcGVyYXRpb25zIGZhaWxlZCcsIGVycm9yTGlzdCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcmVxLFxuICAgICAgICAgICAgICAgICAgICBlcnJvckxpc3QgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JIYW5kbGVyLFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzSGFuZGxlcixcbiAgICAgICAgICAgICAgICAgICAgbnVtT2JqcyA9IG9iamVjdHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIGlmIChjcmVhdGluZ0hvb2sgIT09IG5vcCkge1xuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGVyZSBhcmUgc3Vic2NyaWJlcnMgdG8gaG9vaygnY3JlYXRpbmcnKVxuICAgICAgICAgICAgICAgICAgICAvLyBNdXN0IGJlaGF2ZSBhcyBkb2N1bWVudGVkLlxuICAgICAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5UGF0aCA9IGlkYnN0b3JlLmtleVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBob29rQ3R4O1xuICAgICAgICAgICAgICAgICAgICBlcnJvckhhbmRsZXIgPSBCdWxrRXJyb3JIYW5kbGVyQ2F0Y2hBbGwoZXJyb3JMaXN0LCBudWxsLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0hhbmRsZXIgPSBob29rZWRFdmVudFN1Y2Nlc3NIYW5kbGVyKG51bGwpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRyeUNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gb2JqZWN0cy5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBob29rQ3R4ID0geyBvbmVycm9yOiBudWxsLCBvbnN1Y2Nlc3M6IG51bGwgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0ga2V5cyQkMSAmJiBrZXlzJCQxW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmogPSBvYmplY3RzW2ldLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlZmZlY3RpdmVLZXkgPSBrZXlzJCQxID8ga2V5IDoga2V5UGF0aCA/IGdldEJ5S2V5UGF0aChvYmosIGtleVBhdGgpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBrZXlUb1VzZSA9IGNyZWF0aW5nSG9vay5jYWxsKGhvb2tDdHgsIGVmZmVjdGl2ZUtleSwgb2JqLCB0cmFucyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVmZmVjdGl2ZUtleSA9PSBudWxsICYmIGtleVRvVXNlICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGtleVBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iaiA9IGRlZXBDbG9uZShvYmopO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QnlLZXlQYXRoKG9iaiwga2V5UGF0aCwga2V5VG9Vc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAga2V5ID0ga2V5VG9Vc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxID0ga2V5ICE9IG51bGwgPyBpZGJzdG9yZS5hZGQob2JqLCBrZXkpIDogaWRic3RvcmUuYWRkKG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxLl9ob29rQ3R4ID0gaG9va0N0eDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IGwgLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZXJyb3JIYW5kbGVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaG9va0N0eC5vbnN1Y2Nlc3MpIHJlcS5vbnN1Y2Nlc3MgPSBzdWNjZXNzSGFuZGxlcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGhvb2tDdHgub25lcnJvciAmJiBob29rQ3R4Lm9uZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBCdWxrRXJyb3JIYW5kbGVyQ2F0Y2hBbGwoZXJyb3JMaXN0LCBkb25lLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGhvb2tlZEV2ZW50U3VjY2Vzc0hhbmRsZXIoZG9uZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAgICAgICAgICAgICAgICAgLy8gU3RhbmRhcmQgQnVsayAobm8gJ2NyZWF0aW5nJyBob29rIHRvIGNhcmUgYWJvdXQpXG4gICAgICAgICAgICAgICAgICAgIC8vXG4gICAgICAgICAgICAgICAgICAgIGVycm9ySGFuZGxlciA9IEJ1bGtFcnJvckhhbmRsZXJDYXRjaEFsbChlcnJvckxpc3QpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iamVjdHMubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEgPSBrZXlzJCQxID8gaWRic3RvcmUuYWRkKG9iamVjdHNbaV0sIGtleXMkJDFbaV0pIDogaWRic3RvcmUuYWRkKG9iamVjdHNbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBlcnJvckhhbmRsZXI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBuZWVkIHRvIGNhdGNoIHN1Y2Nlc3Mgb3IgZXJyb3Igb24gdGhlIGxhc3Qgb3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIC8vIGFjY29yZGluZyB0byB0aGUgSURCIHNwZWMuXG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gQnVsa0Vycm9ySGFuZGxlckNhdGNoQWxsKGVycm9yTGlzdCwgZG9uZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBldmVudFN1Y2Nlc3NIYW5kbGVyKGRvbmUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuICAgICAgICBhZGQ6IGZ1bmN0aW9uIChvYmosIGtleSkge1xuICAgICAgICAgICAgLy8vIDxzdW1tYXJ5PlxuICAgICAgICAgICAgLy8vICAgQWRkIGFuIG9iamVjdCB0byB0aGUgZGF0YWJhc2UuIEluIGNhc2UgYW4gb2JqZWN0IHdpdGggc2FtZSBwcmltYXJ5IGtleSBhbHJlYWR5IGV4aXN0cywgdGhlIG9iamVjdCB3aWxsIG5vdCBiZSBhZGRlZC5cbiAgICAgICAgICAgIC8vLyA8L3N1bW1hcnk+XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJvYmpcIiB0eXBlPVwiT2JqZWN0XCI+QSBqYXZhc2NyaXB0IG9iamVjdCB0byBpbnNlcnQ8L3BhcmFtPlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwia2V5XCIgb3B0aW9uYWw9XCJ0cnVlXCI+UHJpbWFyeSBrZXk8L3BhcmFtPlxuICAgICAgICAgICAgdmFyIGNyZWF0aW5nSG9vayA9IHRoaXMuaG9vay5jcmVhdGluZy5maXJlO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkYnN0b3JlKFJFQURXUklURSwgZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUsIHRyYW5zKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhvb2tDdHggPSB7IG9uc3VjY2VzczogbnVsbCwgb25lcnJvcjogbnVsbCB9O1xuICAgICAgICAgICAgICAgIGlmIChjcmVhdGluZ0hvb2sgIT09IG5vcCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZWZmZWN0aXZlS2V5ID0ga2V5ICE9IG51bGwgPyBrZXkgOiBpZGJzdG9yZS5rZXlQYXRoID8gZ2V0QnlLZXlQYXRoKG9iaiwgaWRic3RvcmUua2V5UGF0aCkgOiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXlUb1VzZSA9IGNyZWF0aW5nSG9vay5jYWxsKGhvb2tDdHgsIGVmZmVjdGl2ZUtleSwgb2JqLCB0cmFucyk7IC8vIEFsbG93IHN1YnNjcmliZXJzIHRvIHdoZW4oXCJjcmVhdGluZ1wiKSB0byBnZW5lcmF0ZSB0aGUga2V5LlxuICAgICAgICAgICAgICAgICAgICBpZiAoZWZmZWN0aXZlS2V5ID09IG51bGwgJiYga2V5VG9Vc2UgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXNpbmcgXCI9PVwiIGFuZCBcIiE9XCIgdG8gY2hlY2sgZm9yIGVpdGhlciBudWxsIG9yIHVuZGVmaW5lZCFcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpZGJzdG9yZS5rZXlQYXRoKSBzZXRCeUtleVBhdGgob2JqLCBpZGJzdG9yZS5rZXlQYXRoLCBrZXlUb1VzZSk7ZWxzZSBrZXkgPSBrZXlUb1VzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVxID0ga2V5ICE9IG51bGwgPyBpZGJzdG9yZS5hZGQob2JqLCBrZXkpIDogaWRic3RvcmUuYWRkKG9iaik7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5faG9va0N0eCA9IGhvb2tDdHg7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gaG9va2VkRXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBob29rZWRFdmVudFN1Y2Nlc3NIYW5kbGVyKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRPRE86IFJlbW92ZSB0aGVzZSB0d28gbGluZXMgaW4gbmV4dCBtYWpvciByZWxlYXNlICgyLjA/KVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSXQncyBubyBnb29kIHByYWN0aWNlIHRvIGhhdmUgc2lkZSBlZmZlY3RzIG9uIHByb3ZpZGVkIHBhcmFtZXRlcnNcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXlQYXRoID0gaWRic3RvcmUua2V5UGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXlQYXRoKSBzZXRCeUtleVBhdGgob2JqLCBrZXlQYXRoLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChob29rQ3R4Lm9uZXJyb3IpIGhvb2tDdHgub25lcnJvcihlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcblxuICAgICAgICBwdXQ6IGZ1bmN0aW9uIChvYmosIGtleSkge1xuICAgICAgICAgICAgLy8vIDxzdW1tYXJ5PlxuICAgICAgICAgICAgLy8vICAgQWRkIGFuIG9iamVjdCB0byB0aGUgZGF0YWJhc2UgYnV0IGluIGNhc2UgYW4gb2JqZWN0IHdpdGggc2FtZSBwcmltYXJ5IGtleSBhbHJlYWQgZXhpc3RzLCB0aGUgZXhpc3Rpbmcgb25lIHdpbGwgZ2V0IHVwZGF0ZWQuXG4gICAgICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwib2JqXCIgdHlwZT1cIk9iamVjdFwiPkEgamF2YXNjcmlwdCBvYmplY3QgdG8gaW5zZXJ0IG9yIHVwZGF0ZTwvcGFyYW0+XG4gICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJrZXlcIiBvcHRpb25hbD1cInRydWVcIj5QcmltYXJ5IGtleTwvcGFyYW0+XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICAgICAgY3JlYXRpbmdIb29rID0gdGhpcy5ob29rLmNyZWF0aW5nLmZpcmUsXG4gICAgICAgICAgICAgICAgdXBkYXRpbmdIb29rID0gdGhpcy5ob29rLnVwZGF0aW5nLmZpcmU7XG4gICAgICAgICAgICBpZiAoY3JlYXRpbmdIb29rICE9PSBub3AgfHwgdXBkYXRpbmdIb29rICE9PSBub3ApIHtcbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIC8vIFBlb3BsZSBsaXN0ZW5zIHRvIHdoZW4oXCJjcmVhdGluZ1wiKSBvciB3aGVuKFwidXBkYXRpbmdcIikgZXZlbnRzIVxuICAgICAgICAgICAgICAgIC8vIFdlIG11c3Qga25vdyB3aGV0aGVyIHRoZSBwdXQgb3BlcmF0aW9uIHJlc3VsdHMgaW4gYW4gQ1JFQVRFIG9yIFVQREFURS5cbiAgICAgICAgICAgICAgICAvL1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl90cmFucyhSRUFEV1JJVEUsIGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIHRyYW5zKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNpbmNlIGtleSBpcyBvcHRpb25hbCwgbWFrZSBzdXJlIHdlIGdldCBpdCBmcm9tIG9iaiBpZiBub3QgcHJvdmlkZWRcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVmZmVjdGl2ZUtleSA9IGtleSAhPT0gdW5kZWZpbmVkID8ga2V5IDogc2VsZi5zY2hlbWEucHJpbUtleS5rZXlQYXRoICYmIGdldEJ5S2V5UGF0aChvYmosIHNlbGYuc2NoZW1hLnByaW1LZXkua2V5UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlZmZlY3RpdmVLZXkgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCI9PSBudWxsXCIgbWVhbnMgY2hlY2tpbmcgZm9yIGVpdGhlciBudWxsIG9yIHVuZGVmaW5lZC5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vIHByaW1hcnkga2V5LiBNdXN0IHVzZSBhZGQoKS5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuYWRkKG9iaikudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUHJpbWFyeSBrZXkgZXhpc3QuIExvY2sgdHJhbnNhY3Rpb24gYW5kIHRyeSBtb2RpZnlpbmcgZXhpc3RpbmcuIElmIG5vdGhpbmcgbW9kaWZpZWQsIGNhbGwgYWRkKCkuXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFucy5fbG9jaygpOyAvLyBOZWVkZWQgYmVjYXVzZSBvcGVyYXRpb24gaXMgc3BsaXR0ZWQgaW50byBtb2RpZnkoKSBhbmQgYWRkKCkuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjbG9uZSBvYmogYmVmb3JlIHRoaXMgYXN5bmMgY2FsbC4gSWYgY2FsbGVyIG1vZGlmaWVzIG9iaiB0aGUgbGluZSBhZnRlciBwdXQoKSwgdGhlIElEQiBzcGVjIHJlcXVpcmVzIHRoYXQgaXQgc2hvdWxkIG5vdCBhZmZlY3Qgb3BlcmF0aW9uLlxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqID0gZGVlcENsb25lKG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZWxmLndoZXJlKFwiOmlkXCIpLmVxdWFscyhlZmZlY3RpdmVLZXkpLm1vZGlmeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVwbGFjZSBleHRpc3RpbmcgdmFsdWUgd2l0aCBvdXIgb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ1JVRCBldmVudCBmaXJpbmcgaGFuZGxlZCBpbiBXcml0ZWFibGVDb2xsZWN0aW9uLm1vZGlmeSgpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IG9iajtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE9iamVjdCdzIGtleSB3YXMgbm90IGZvdW5kLiBBZGQgdGhlIG9iamVjdCBpbnN0ZWFkLlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBDUlVEIGV2ZW50IGZpcmluZyB3aWxsIGJlIGRvbmUgaW4gYWRkKClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuYWRkKG9iaiwga2V5KTsgLy8gUmVzb2x2aW5nIHdpdGggYW5vdGhlciBQcm9taXNlLiBSZXR1cm5lZCBQcm9taXNlIHdpbGwgdGhlbiByZXNvbHZlIHdpdGggdGhlIG5ldyBrZXkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVmZmVjdGl2ZUtleTsgLy8gUmVzb2x2ZSB3aXRoIHRoZSBwcm92aWRlZCBrZXkuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSkuZmluYWxseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnMuX3VubG9jaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkudGhlbihyZXNvbHZlLCByZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFVzZSB0aGUgc3RhbmRhcmQgSURCIHB1dCgpIG1ldGhvZC5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5faWRic3RvcmUoUkVBRFdSSVRFLCBmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcmVxID0ga2V5ICE9PSB1bmRlZmluZWQgPyBpZGJzdG9yZS5wdXQob2JqLCBrZXkpIDogaWRic3RvcmUucHV0KG9iaik7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBrZXlQYXRoID0gaWRic3RvcmUua2V5UGF0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChrZXlQYXRoKSBzZXRCeUtleVBhdGgob2JqLCBrZXlQYXRoLCBldi50YXJnZXQucmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVxLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgJ2RlbGV0ZSc6IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImtleVwiPlByaW1hcnkga2V5IG9mIHRoZSBvYmplY3QgdG8gZGVsZXRlPC9wYXJhbT5cbiAgICAgICAgICAgIGlmICh0aGlzLmhvb2suZGVsZXRpbmcuc3Vic2NyaWJlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgLy8gUGVvcGxlIGxpc3RlbnMgdG8gd2hlbihcImRlbGV0aW5nXCIpIGV2ZW50LiBNdXN0IGltcGxlbWVudCBkZWxldGUgdXNpbmcgV3JpdGVhYmxlQ29sbGVjdGlvbi5kZWxldGUoKSB0aGF0IHdpbGxcbiAgICAgICAgICAgICAgICAvLyBjYWxsIHRoZSBDUlVEIGV2ZW50LiBPbmx5IFdyaXRlYWJsZUNvbGxlY3Rpb24uZGVsZXRlKCkgd2lsbCBrbm93IHdoZXRoZXIgYW4gb2JqZWN0IHdhcyBhY3R1YWxseSBkZWxldGVkLlxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLndoZXJlKFwiOmlkXCIpLmVxdWFscyhrZXkpLmRlbGV0ZSgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBObyBvbmUgbGlzdGVucy4gVXNlIHN0YW5kYXJkIElEQiBkZWxldGUoKSBtZXRob2QuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkYnN0b3JlKFJFQURXUklURSwgZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGlkYnN0b3JlLmRlbGV0ZShrZXkpO1xuICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXEucmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBjbGVhcjogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuaG9vay5kZWxldGluZy5zdWJzY3JpYmVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAvLyBQZW9wbGUgbGlzdGVucyB0byB3aGVuKFwiZGVsZXRpbmdcIikgZXZlbnQuIE11c3QgaW1wbGVtZW50IGRlbGV0ZSB1c2luZyBXcml0ZWFibGVDb2xsZWN0aW9uLmRlbGV0ZSgpIHRoYXQgd2lsbFxuICAgICAgICAgICAgICAgIC8vIGNhbGwgdGhlIENSVUQgZXZlbnQuIE9ubHkgV3JpdGVhYmxlQ29sbGVjdGlvbi5kZWxldGUoKSB3aWxsIGtub3dzIHdoaWNoIG9iamVjdHMgdGhhdCBhcmUgYWN0dWFsbHkgZGVsZXRlZC5cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b0NvbGxlY3Rpb24oKS5kZWxldGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2lkYnN0b3JlKFJFQURXUklURSwgZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGlkYnN0b3JlLmNsZWFyKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcS5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZTogZnVuY3Rpb24gKGtleU9yT2JqZWN0LCBtb2RpZmljYXRpb25zKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1vZGlmaWNhdGlvbnMgIT09ICdvYmplY3QnIHx8IGlzQXJyYXkobW9kaWZpY2F0aW9ucykpIHRocm93IG5ldyBleGNlcHRpb25zLkludmFsaWRBcmd1bWVudChcIk1vZGlmaWNhdGlvbnMgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBrZXlPck9iamVjdCA9PT0gJ29iamVjdCcgJiYgIWlzQXJyYXkoa2V5T3JPYmplY3QpKSB7XG4gICAgICAgICAgICAgICAgLy8gb2JqZWN0IHRvIG1vZGlmeS4gQWxzbyBtb2RpZnkgZ2l2ZW4gb2JqZWN0IHdpdGggdGhlIG1vZGlmaWNhdGlvbnM6XG4gICAgICAgICAgICAgICAga2V5cyhtb2RpZmljYXRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXlQYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldEJ5S2V5UGF0aChrZXlPck9iamVjdCwga2V5UGF0aCwgbW9kaWZpY2F0aW9uc1trZXlQYXRoXSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGdldEJ5S2V5UGF0aChrZXlPck9iamVjdCwgdGhpcy5zY2hlbWEucHJpbUtleS5rZXlQYXRoKTtcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSB1bmRlZmluZWQpIHJldHVybiByZWplY3Rpb24obmV3IGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KFwiR2l2ZW4gb2JqZWN0IGRvZXMgbm90IGNvbnRhaW4gaXRzIHByaW1hcnkga2V5XCIpLCBkYlVuY2F1Z2h0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53aGVyZShcIjppZFwiKS5lcXVhbHMoa2V5KS5tb2RpZnkobW9kaWZpY2F0aW9ucyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGtleSB0byBtb2RpZnlcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy53aGVyZShcIjppZFwiKS5lcXVhbHMoa2V5T3JPYmplY3QpLm1vZGlmeShtb2RpZmljYXRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gVHJhbnNhY3Rpb24gQ2xhc3NcbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICBmdW5jdGlvbiBUcmFuc2FjdGlvbihtb2RlLCBzdG9yZU5hbWVzLCBkYnNjaGVtYSwgcGFyZW50KSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIC8vLyA8c3VtbWFyeT5cbiAgICAgICAgLy8vICAgIFRyYW5zYWN0aW9uIGNsYXNzLiBSZXByZXNlbnRzIGEgZGF0YWJhc2UgdHJhbnNhY3Rpb24uIEFsbCBvcGVyYXRpb25zIG9uIGRiIGdvZXMgdGhyb3VnaCBhIFRyYW5zYWN0aW9uLlxuICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJtb2RlXCIgdHlwZT1cIlN0cmluZ1wiPkFueSBvZiBcInJlYWR3cml0ZVwiIG9yIFwicmVhZG9ubHlcIjwvcGFyYW0+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInN0b3JlTmFtZXNcIiB0eXBlPVwiQXJyYXlcIj5BcnJheSBvZiB0YWJsZSBuYW1lcyB0byBvcGVyYXRlIG9uPC9wYXJhbT5cbiAgICAgICAgdGhpcy5kYiA9IGRiO1xuICAgICAgICB0aGlzLm1vZGUgPSBtb2RlO1xuICAgICAgICB0aGlzLnN0b3JlTmFtZXMgPSBzdG9yZU5hbWVzO1xuICAgICAgICB0aGlzLmlkYnRyYW5zID0gbnVsbDtcbiAgICAgICAgdGhpcy5vbiA9IEV2ZW50cyh0aGlzLCBcImNvbXBsZXRlXCIsIFwiZXJyb3JcIiwgXCJhYm9ydFwiKTtcbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQgfHwgbnVsbDtcbiAgICAgICAgdGhpcy5hY3RpdmUgPSB0cnVlO1xuICAgICAgICB0aGlzLl90YWJsZXMgPSBudWxsO1xuICAgICAgICB0aGlzLl9yZWN1bG9jayA9IDA7XG4gICAgICAgIHRoaXMuX2Jsb2NrZWRGdW5jcyA9IFtdO1xuICAgICAgICB0aGlzLl9wc2QgPSBudWxsO1xuICAgICAgICB0aGlzLl9kYnNjaGVtYSA9IGRic2NoZW1hO1xuICAgICAgICB0aGlzLl9yZXNvbHZlID0gbnVsbDtcbiAgICAgICAgdGhpcy5fcmVqZWN0ID0gbnVsbDtcbiAgICAgICAgdGhpcy5fY29tcGxldGlvbiA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIF90aGlzMi5fcmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgICAgICBfdGhpczIuX3JlamVjdCA9IHJlamVjdDtcbiAgICAgICAgfSkudW5jYXVnaHQoZGJVbmNhdWdodCk7XG5cbiAgICAgICAgdGhpcy5fY29tcGxldGlvbi50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF90aGlzMi5vbi5jb21wbGV0ZS5maXJlKCk7XG4gICAgICAgIH0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBfdGhpczIub24uZXJyb3IuZmlyZShlKTtcbiAgICAgICAgICAgIF90aGlzMi5wYXJlbnQgPyBfdGhpczIucGFyZW50Ll9yZWplY3QoZSkgOiBfdGhpczIuYWN0aXZlICYmIF90aGlzMi5pZGJ0cmFucyAmJiBfdGhpczIuaWRidHJhbnMuYWJvcnQoKTtcbiAgICAgICAgICAgIF90aGlzMi5hY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgIHJldHVybiByZWplY3Rpb24oZSk7IC8vIEluZGljYXRlIHdlIGFjdHVhbGx5IERPIE5PVCBjYXRjaCB0aGlzIGVycm9yLlxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcm9wcyhUcmFuc2FjdGlvbi5wcm90b3R5cGUsIHtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gVHJhbnNhY3Rpb24gUHJvdGVjdGVkIE1ldGhvZHMgKG5vdCByZXF1aXJlZCBieSBBUEkgdXNlcnMsIGJ1dCBuZWVkZWQgaW50ZXJuYWxseSBhbmQgZXZlbnR1YWxseSBieSBkZXhpZSBleHRlbnNpb25zKVxuICAgICAgICAvL1xuICAgICAgICBfbG9jazogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgYXNzZXJ0KCFQU0QuZ2xvYmFsKTsgLy8gTG9ja2luZyBhbmQgdW5sb2NraW5nIHJldWlyZXMgdG8gYmUgd2l0aGluIGEgUFNEIHNjb3BlLlxuICAgICAgICAgICAgLy8gVGVtcG9yYXJ5IHNldCBhbGwgcmVxdWVzdHMgaW50byBhIHBlbmRpbmcgcXVldWUgaWYgdGhleSBhcmUgY2FsbGVkIGJlZm9yZSBkYXRhYmFzZSBpcyByZWFkeS5cbiAgICAgICAgICAgICsrdGhpcy5fcmVjdWxvY2s7IC8vIFJlY3Vyc2l2ZSByZWFkL3dyaXRlIGxvY2sgcGF0dGVybiB1c2luZyBQU0QgKFByb21pc2UgU3BlY2lmaWMgRGF0YSkgaW5zdGVhZCBvZiBUTFMgKFRocmVhZCBMb2NhbCBTdG9yYWdlKVxuICAgICAgICAgICAgaWYgKHRoaXMuX3JlY3Vsb2NrID09PSAxICYmICFQU0QuZ2xvYmFsKSBQU0QubG9ja093bmVyRm9yID0gdGhpcztcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuICAgICAgICBfdW5sb2NrOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnQoIVBTRC5nbG9iYWwpOyAvLyBMb2NraW5nIGFuZCB1bmxvY2tpbmcgcmV1aXJlcyB0byBiZSB3aXRoaW4gYSBQU0Qgc2NvcGUuXG4gICAgICAgICAgICBpZiAoLS10aGlzLl9yZWN1bG9jayA9PT0gMCkge1xuICAgICAgICAgICAgICAgIGlmICghUFNELmdsb2JhbCkgUFNELmxvY2tPd25lckZvciA9IG51bGw7XG4gICAgICAgICAgICAgICAgd2hpbGUgKHRoaXMuX2Jsb2NrZWRGdW5jcy5sZW5ndGggPiAwICYmICF0aGlzLl9sb2NrZWQoKSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm5BbmRQU0QgPSB0aGlzLl9ibG9ja2VkRnVuY3Muc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZVBTRChmbkFuZFBTRFsxXSwgZm5BbmRQU0RbMF0pO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9LFxuICAgICAgICBfbG9ja2VkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBDaGVja3MgaWYgYW55IHdyaXRlLWxvY2sgaXMgYXBwbGllZCBvbiB0aGlzIHRyYW5zYWN0aW9uLlxuICAgICAgICAgICAgLy8gVG8gc2ltcGxpZnkgdGhlIERleGllIEFQSSBmb3IgZXh0ZW5zaW9uIGltcGxlbWVudGF0aW9ucywgd2Ugc3VwcG9ydCByZWN1cnNpdmUgbG9ja3MuXG4gICAgICAgICAgICAvLyBUaGlzIGlzIGFjY29tcGxpc2hlZCBieSB1c2luZyBcIlByb21pc2UgU3BlY2lmaWMgRGF0YVwiIChQU0QpLlxuICAgICAgICAgICAgLy8gUFNEIGRhdGEgaXMgYm91bmQgdG8gYSBQcm9taXNlIGFuZCBhbnkgY2hpbGQgUHJvbWlzZSBlbWl0dGVkIHRocm91Z2ggdGhlbigpIG9yIHJlc29sdmUoIG5ldyBQcm9taXNlKCkgKS5cbiAgICAgICAgICAgIC8vIFBTRCBpcyBsb2NhbCB0byBjb2RlIGV4ZWN1dGluZyBvbiB0b3Agb2YgdGhlIGNhbGwgc3RhY2tzIG9mIGFueSBvZiBhbnkgY29kZSBleGVjdXRlZCBieSBQcm9taXNlKCk6XG4gICAgICAgICAgICAvLyAgICAgICAgICogY2FsbGJhY2sgZ2l2ZW4gdG8gdGhlIFByb21pc2UoKSBjb25zdHJ1Y3RvciAgKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3Qpey4uLn0pXG4gICAgICAgICAgICAvLyAgICAgICAgICogY2FsbGJhY2tzIGdpdmVuIHRvIHRoZW4oKS9jYXRjaCgpL2ZpbmFsbHkoKSBtZXRob2RzIChmdW5jdGlvbiAodmFsdWUpey4uLn0pXG4gICAgICAgICAgICAvLyBJZiBjcmVhdGluZyBhIG5ldyBpbmRlcGVuZGFudCBQcm9taXNlIGluc3RhbmNlIGZyb20gd2l0aGluIGEgUHJvbWlzZSBjYWxsIHN0YWNrLCB0aGUgbmV3IFByb21pc2Ugd2lsbCBkZXJpdmUgdGhlIFBTRCBmcm9tIHRoZSBjYWxsIHN0YWNrIG9mIHRoZSBwYXJlbnQgUHJvbWlzZS5cbiAgICAgICAgICAgIC8vIERlcml2YXRpb24gaXMgZG9uZSBzbyB0aGF0IHRoZSBpbm5lciBQU0QgX19wcm90b19fIHBvaW50cyB0byB0aGUgb3V0ZXIgUFNELlxuICAgICAgICAgICAgLy8gUFNELmxvY2tPd25lckZvciB3aWxsIHBvaW50IHRvIGN1cnJlbnQgdHJhbnNhY3Rpb24gb2JqZWN0IGlmIHRoZSBjdXJyZW50bHkgZXhlY3V0aW5nIFBTRCBzY29wZSBvd25zIHRoZSBsb2NrLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlY3Vsb2NrICYmIFBTRC5sb2NrT3duZXJGb3IgIT09IHRoaXM7XG4gICAgICAgIH0sXG4gICAgICAgIGNyZWF0ZTogZnVuY3Rpb24gKGlkYnRyYW5zKSB7XG4gICAgICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICAgICAgYXNzZXJ0KCF0aGlzLmlkYnRyYW5zKTtcbiAgICAgICAgICAgIGlmICghaWRidHJhbnMgJiYgIWlkYmRiKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChkYk9wZW5FcnJvciAmJiBkYk9wZW5FcnJvci5uYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJEYXRhYmFzZUNsb3NlZEVycm9yXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFcnJvcnMgd2hlcmUgaXQgaXMgbm8gZGlmZmVyZW5jZSB3aGV0aGVyIGl0IHdhcyBjYXVzZWQgYnkgdGhlIHVzZXIgb3BlcmF0aW9uIG9yIGFuIGVhcmxpZXIgY2FsbCB0byBkYi5vcGVuKClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBleGNlcHRpb25zLkRhdGFiYXNlQ2xvc2VkKGRiT3BlbkVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk1pc3NpbmdBUElFcnJvclwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRXJyb3JzIHdoZXJlIGl0IGlzIG5vIGRpZmZlcmVuY2Ugd2hldGhlciBpdCB3YXMgY2F1c2VkIGJ5IHRoZSB1c2VyIG9wZXJhdGlvbiBvciBhbiBlYXJsaWVyIGNhbGwgdG8gZGIub3BlbigpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgZXhjZXB0aW9ucy5NaXNzaW5nQVBJKGRiT3BlbkVycm9yLm1lc3NhZ2UsIGRiT3BlbkVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2UgaXQgY2xlYXIgdGhhdCB0aGUgdXNlciBvcGVyYXRpb24gd2FzIG5vdCB3aGF0IGNhdXNlZCB0aGUgZXJyb3IgLSB0aGUgZXJyb3IgaGFkIG9jY3VycmVkIGVhcmxpZXIgb24gZGIub3BlbigpIVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuT3BlbkZhaWxlZChkYk9wZW5FcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCF0aGlzLmFjdGl2ZSkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuVHJhbnNhY3Rpb25JbmFjdGl2ZSgpO1xuICAgICAgICAgICAgYXNzZXJ0KHRoaXMuX2NvbXBsZXRpb24uX3N0YXRlID09PSBudWxsKTtcblxuICAgICAgICAgICAgaWRidHJhbnMgPSB0aGlzLmlkYnRyYW5zID0gaWRidHJhbnMgfHwgaWRiZGIudHJhbnNhY3Rpb24oc2FmYXJpTXVsdGlTdG9yZUZpeCh0aGlzLnN0b3JlTmFtZXMpLCB0aGlzLm1vZGUpO1xuICAgICAgICAgICAgaWRidHJhbnMub25lcnJvciA9IHdyYXAoZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgcHJldmVudERlZmF1bHQoZXYpOyAvLyBQcm9oaWJpdCBkZWZhdWx0IGJ1YmJsaW5nIHRvIHdpbmRvdy5lcnJvclxuICAgICAgICAgICAgICAgIF90aGlzMy5fcmVqZWN0KGlkYnRyYW5zLmVycm9yKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWRidHJhbnMub25hYm9ydCA9IHdyYXAoZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgcHJldmVudERlZmF1bHQoZXYpO1xuICAgICAgICAgICAgICAgIF90aGlzMy5hY3RpdmUgJiYgX3RoaXMzLl9yZWplY3QobmV3IGV4Y2VwdGlvbnMuQWJvcnQoKSk7XG4gICAgICAgICAgICAgICAgX3RoaXMzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIF90aGlzMy5vbihcImFib3J0XCIpLmZpcmUoZXYpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZGJ0cmFucy5vbmNvbXBsZXRlID0gd3JhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMzLmFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIF90aGlzMy5fcmVzb2x2ZSgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSxcbiAgICAgICAgX3Byb21pc2U6IGZ1bmN0aW9uIChtb2RlLCBmbiwgYldyaXRlTG9jaykge1xuICAgICAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgdmFyIHAgPSBzZWxmLl9sb2NrZWQoKSA/XG4gICAgICAgICAgICAvLyBSZWFkIGxvY2sgYWx3YXlzLiBUcmFuc2FjdGlvbiBpcyB3cml0ZS1sb2NrZWQuIFdhaXQgZm9yIG11dGV4LlxuICAgICAgICAgICAgbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX2Jsb2NrZWRGdW5jcy5wdXNoKFtmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3Byb21pc2UobW9kZSwgZm4sIGJXcml0ZUxvY2spLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICAgICAgICAgICAgICB9LCBQU0RdKTtcbiAgICAgICAgICAgIH0pIDogbmV3U2NvcGUoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBwXyA9IHNlbGYuYWN0aXZlID8gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gUkVBRFdSSVRFICYmIHNlbGYubW9kZSAhPT0gUkVBRFdSSVRFKSB0aHJvdyBuZXcgZXhjZXB0aW9ucy5SZWFkT25seShcIlRyYW5zYWN0aW9uIGlzIHJlYWRvbmx5XCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXNlbGYuaWRidHJhbnMgJiYgbW9kZSkgc2VsZi5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJXcml0ZUxvY2spIHNlbGYuX2xvY2soKTsgLy8gV3JpdGUgbG9jayBpZiB3cml0ZSBvcGVyYXRpb24gaXMgcmVxdWVzdGVkXG4gICAgICAgICAgICAgICAgICAgIGZuKHJlc29sdmUsIHJlamVjdCwgc2VsZik7XG4gICAgICAgICAgICAgICAgfSkgOiByZWplY3Rpb24obmV3IGV4Y2VwdGlvbnMuVHJhbnNhY3Rpb25JbmFjdGl2ZSgpKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZi5hY3RpdmUgJiYgYldyaXRlTG9jaykgcF8uZmluYWxseShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuX3VubG9jaygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBwXztcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBwLl9saWIgPSB0cnVlO1xuICAgICAgICAgICAgcmV0dXJuIHAudW5jYXVnaHQoZGJVbmNhdWdodCk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgLy9cbiAgICAgICAgLy8gVHJhbnNhY3Rpb24gUHVibGljIFByb3BlcnRpZXMgYW5kIE1ldGhvZHNcbiAgICAgICAgLy9cbiAgICAgICAgYWJvcnQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlICYmIHRoaXMuX3JlamVjdChuZXcgZXhjZXB0aW9ucy5BYm9ydCgpKTtcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgIH0sXG5cbiAgICAgICAgdGFibGVzOiB7XG4gICAgICAgICAgICBnZXQ6IGRlcHJlY2F0ZWQoXCJUcmFuc2FjdGlvbi50YWJsZXNcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhcnJheVRvT2JqZWN0KHRoaXMuc3RvcmVOYW1lcywgZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtuYW1lLCBhbGxUYWJsZXNbbmFtZV1dO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSwgXCJVc2UgZGIudGFibGVzKClcIilcbiAgICAgICAgfSxcblxuICAgICAgICBjb21wbGV0ZTogZGVwcmVjYXRlZChcIlRyYW5zYWN0aW9uLmNvbXBsZXRlKClcIiwgZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbihcImNvbXBsZXRlXCIsIGNiKTtcbiAgICAgICAgfSksXG5cbiAgICAgICAgZXJyb3I6IGRlcHJlY2F0ZWQoXCJUcmFuc2FjdGlvbi5lcnJvcigpXCIsIGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub24oXCJlcnJvclwiLCBjYik7XG4gICAgICAgIH0pLFxuXG4gICAgICAgIHRhYmxlOiBkZXByZWNhdGVkKFwiVHJhbnNhY3Rpb24udGFibGUoKVwiLCBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMuc3RvcmVOYW1lcy5pbmRleE9mKG5hbWUpID09PSAtMSkgdGhyb3cgbmV3IGV4Y2VwdGlvbnMuSW52YWxpZFRhYmxlKFwiVGFibGUgXCIgKyBuYW1lICsgXCIgbm90IGluIHRyYW5zYWN0aW9uXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGFsbFRhYmxlc1tuYW1lXTtcbiAgICAgICAgfSlcblxuICAgIH0pO1xuXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gV2hlcmVDbGF1c2VcbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICBmdW5jdGlvbiBXaGVyZUNsYXVzZSh0YWJsZSwgaW5kZXgsIG9yQ29sbGVjdGlvbikge1xuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJ0YWJsZVwiIHR5cGU9XCJUYWJsZVwiPjwvcGFyYW0+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImluZGV4XCIgdHlwZT1cIlN0cmluZ1wiIG9wdGlvbmFsPVwidHJ1ZVwiPjwvcGFyYW0+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cIm9yQ29sbGVjdGlvblwiIHR5cGU9XCJDb2xsZWN0aW9uXCIgb3B0aW9uYWw9XCJ0cnVlXCI+PC9wYXJhbT5cbiAgICAgICAgdGhpcy5fY3R4ID0ge1xuICAgICAgICAgICAgdGFibGU6IHRhYmxlLFxuICAgICAgICAgICAgaW5kZXg6IGluZGV4ID09PSBcIjppZFwiID8gbnVsbCA6IGluZGV4LFxuICAgICAgICAgICAgY29sbENsYXNzOiB0YWJsZS5fY29sbENsYXNzLFxuICAgICAgICAgICAgb3I6IG9yQ29sbGVjdGlvblxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByb3BzKFdoZXJlQ2xhdXNlLnByb3RvdHlwZSwgZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIC8vIFdoZXJlQ2xhdXNlIHByaXZhdGUgbWV0aG9kc1xuXG4gICAgICAgIGZ1bmN0aW9uIGZhaWwoY29sbGVjdGlvbk9yV2hlcmVDbGF1c2UsIGVyciwgVCkge1xuICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBjb2xsZWN0aW9uT3JXaGVyZUNsYXVzZSBpbnN0YW5jZW9mIFdoZXJlQ2xhdXNlID8gbmV3IGNvbGxlY3Rpb25PcldoZXJlQ2xhdXNlLl9jdHguY29sbENsYXNzKGNvbGxlY3Rpb25PcldoZXJlQ2xhdXNlKSA6IGNvbGxlY3Rpb25PcldoZXJlQ2xhdXNlO1xuXG4gICAgICAgICAgICBjb2xsZWN0aW9uLl9jdHguZXJyb3IgPSBUID8gbmV3IFQoZXJyKSA6IG5ldyBUeXBlRXJyb3IoZXJyKTtcbiAgICAgICAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZW1wdHlDb2xsZWN0aW9uKHdoZXJlQ2xhdXNlKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IHdoZXJlQ2xhdXNlLl9jdHguY29sbENsYXNzKHdoZXJlQ2xhdXNlLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIElEQktleVJhbmdlLm9ubHkoXCJcIik7XG4gICAgICAgICAgICB9KS5saW1pdCgwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHVwcGVyRmFjdG9yeShkaXIpIHtcbiAgICAgICAgICAgIHJldHVybiBkaXIgPT09IFwibmV4dFwiID8gZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgfSA6IGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHMudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gbG93ZXJGYWN0b3J5KGRpcikge1xuICAgICAgICAgICAgcmV0dXJuIGRpciA9PT0gXCJuZXh0XCIgPyBmdW5jdGlvbiAocykge1xuICAgICAgICAgICAgICAgIHJldHVybiBzLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICB9IDogZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcy50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBuZXh0Q2FzaW5nKGtleSwgbG93ZXJLZXksIHVwcGVyTmVlZGxlLCBsb3dlck5lZWRsZSwgY21wLCBkaXIpIHtcbiAgICAgICAgICAgIHZhciBsZW5ndGggPSBNYXRoLm1pbihrZXkubGVuZ3RoLCBsb3dlck5lZWRsZS5sZW5ndGgpO1xuICAgICAgICAgICAgdmFyIGxscCA9IC0xO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgIHZhciBsd3JLZXlDaGFyID0gbG93ZXJLZXlbaV07XG4gICAgICAgICAgICAgICAgaWYgKGx3cktleUNoYXIgIT09IGxvd2VyTmVlZGxlW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjbXAoa2V5W2ldLCB1cHBlck5lZWRsZVtpXSkgPCAwKSByZXR1cm4ga2V5LnN1YnN0cigwLCBpKSArIHVwcGVyTmVlZGxlW2ldICsgdXBwZXJOZWVkbGUuc3Vic3RyKGkgKyAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNtcChrZXlbaV0sIGxvd2VyTmVlZGxlW2ldKSA8IDApIHJldHVybiBrZXkuc3Vic3RyKDAsIGkpICsgbG93ZXJOZWVkbGVbaV0gKyB1cHBlck5lZWRsZS5zdWJzdHIoaSArIDEpO1xuICAgICAgICAgICAgICAgICAgICBpZiAobGxwID49IDApIHJldHVybiBrZXkuc3Vic3RyKDAsIGxscCkgKyBsb3dlcktleVtsbHBdICsgdXBwZXJOZWVkbGUuc3Vic3RyKGxscCArIDEpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGNtcChrZXlbaV0sIGx3cktleUNoYXIpIDwgMCkgbGxwID0gaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsZW5ndGggPCBsb3dlck5lZWRsZS5sZW5ndGggJiYgZGlyID09PSBcIm5leHRcIikgcmV0dXJuIGtleSArIHVwcGVyTmVlZGxlLnN1YnN0cihrZXkubGVuZ3RoKTtcbiAgICAgICAgICAgIGlmIChsZW5ndGggPCBrZXkubGVuZ3RoICYmIGRpciA9PT0gXCJwcmV2XCIpIHJldHVybiBrZXkuc3Vic3RyKDAsIHVwcGVyTmVlZGxlLmxlbmd0aCk7XG4gICAgICAgICAgICByZXR1cm4gbGxwIDwgMCA/IG51bGwgOiBrZXkuc3Vic3RyKDAsIGxscCkgKyBsb3dlck5lZWRsZVtsbHBdICsgdXBwZXJOZWVkbGUuc3Vic3RyKGxscCArIDEpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gYWRkSWdub3JlQ2FzZUFsZ29yaXRobSh3aGVyZUNsYXVzZSwgbWF0Y2gsIG5lZWRsZXMsIHN1ZmZpeCkge1xuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwibmVlZGxlc1wiIHR5cGU9XCJBcnJheVwiIGVsZW1lbnRUeXBlPVwiU3RyaW5nXCI+PC9wYXJhbT5cbiAgICAgICAgICAgIHZhciB1cHBlcixcbiAgICAgICAgICAgICAgICBsb3dlcixcbiAgICAgICAgICAgICAgICBjb21wYXJlLFxuICAgICAgICAgICAgICAgIHVwcGVyTmVlZGxlcyxcbiAgICAgICAgICAgICAgICBsb3dlck5lZWRsZXMsXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLFxuICAgICAgICAgICAgICAgIG5leHRLZXlTdWZmaXgsXG4gICAgICAgICAgICAgICAgbmVlZGxlc0xlbiA9IG5lZWRsZXMubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKCFuZWVkbGVzLmV2ZXJ5KGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBzID09PSAnc3RyaW5nJztcbiAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwod2hlcmVDbGF1c2UsIFNUUklOR19FWFBFQ1RFRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmdW5jdGlvbiBpbml0RGlyZWN0aW9uKGRpcikge1xuICAgICAgICAgICAgICAgIHVwcGVyID0gdXBwZXJGYWN0b3J5KGRpcik7XG4gICAgICAgICAgICAgICAgbG93ZXIgPSBsb3dlckZhY3RvcnkoZGlyKTtcbiAgICAgICAgICAgICAgICBjb21wYXJlID0gZGlyID09PSBcIm5leHRcIiA/IHNpbXBsZUNvbXBhcmUgOiBzaW1wbGVDb21wYXJlUmV2ZXJzZTtcbiAgICAgICAgICAgICAgICB2YXIgbmVlZGxlQm91bmRzID0gbmVlZGxlcy5tYXAoZnVuY3Rpb24gKG5lZWRsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBsb3dlcjogbG93ZXIobmVlZGxlKSwgdXBwZXI6IHVwcGVyKG5lZWRsZSkgfTtcbiAgICAgICAgICAgICAgICB9KS5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb21wYXJlKGEubG93ZXIsIGIubG93ZXIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHVwcGVyTmVlZGxlcyA9IG5lZWRsZUJvdW5kcy5tYXAoZnVuY3Rpb24gKG5iKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuYi51cHBlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBsb3dlck5lZWRsZXMgPSBuZWVkbGVCb3VuZHMubWFwKGZ1bmN0aW9uIChuYikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmIubG93ZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uID0gZGlyO1xuICAgICAgICAgICAgICAgIG5leHRLZXlTdWZmaXggPSBkaXIgPT09IFwibmV4dFwiID8gXCJcIiA6IHN1ZmZpeDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGluaXREaXJlY3Rpb24oXCJuZXh0XCIpO1xuXG4gICAgICAgICAgICB2YXIgYyA9IG5ldyB3aGVyZUNsYXVzZS5fY3R4LmNvbGxDbGFzcyh3aGVyZUNsYXVzZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS5ib3VuZCh1cHBlck5lZWRsZXNbMF0sIGxvd2VyTmVlZGxlc1tuZWVkbGVzTGVuIC0gMV0gKyBzdWZmaXgpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGMuX29uZGlyZWN0aW9uY2hhbmdlID0gZnVuY3Rpb24gKGRpcmVjdGlvbikge1xuICAgICAgICAgICAgICAgIC8vIFRoaXMgZXZlbnQgb25seXMgb2NjdXIgYmVmb3JlIGZpbHRlciBpcyBjYWxsZWQgdGhlIGZpcnN0IHRpbWUuXG4gICAgICAgICAgICAgICAgaW5pdERpcmVjdGlvbihkaXJlY3Rpb24pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIGZpcnN0UG9zc2libGVOZWVkbGUgPSAwO1xuXG4gICAgICAgICAgICBjLl9hZGRBbGdvcml0aG0oZnVuY3Rpb24gKGN1cnNvciwgYWR2YW5jZSwgcmVzb2x2ZSkge1xuICAgICAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImN1cnNvclwiIHR5cGU9XCJJREJDdXJzb3JcIj48L3BhcmFtPlxuICAgICAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImFkdmFuY2VcIiB0eXBlPVwiRnVuY3Rpb25cIj48L3BhcmFtPlxuICAgICAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInJlc29sdmVcIiB0eXBlPVwiRnVuY3Rpb25cIj48L3BhcmFtPlxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBjdXJzb3Iua2V5O1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Yga2V5ICE9PSAnc3RyaW5nJykgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBsb3dlcktleSA9IGxvd2VyKGtleSk7XG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKGxvd2VyS2V5LCBsb3dlck5lZWRsZXMsIGZpcnN0UG9zc2libGVOZWVkbGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsb3dlc3RQb3NzaWJsZUNhc2luZyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSBmaXJzdFBvc3NpYmxlTmVlZGxlOyBpIDwgbmVlZGxlc0xlbjsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2FzaW5nID0gbmV4dENhc2luZyhrZXksIGxvd2VyS2V5LCB1cHBlck5lZWRsZXNbaV0sIGxvd2VyTmVlZGxlc1tpXSwgY29tcGFyZSwgZGlyZWN0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYXNpbmcgPT09IG51bGwgJiYgbG93ZXN0UG9zc2libGVDYXNpbmcgPT09IG51bGwpIGZpcnN0UG9zc2libGVOZWVkbGUgPSBpICsgMTtlbHNlIGlmIChsb3dlc3RQb3NzaWJsZUNhc2luZyA9PT0gbnVsbCB8fCBjb21wYXJlKGxvd2VzdFBvc3NpYmxlQ2FzaW5nLCBjYXNpbmcpID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvd2VzdFBvc3NpYmxlQ2FzaW5nID0gY2FzaW5nO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChsb3dlc3RQb3NzaWJsZUNhc2luZyAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKGxvd2VzdFBvc3NpYmxlQ2FzaW5nICsgbmV4dEtleVN1ZmZpeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2UocmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIGM7XG4gICAgICAgIH1cblxuICAgICAgICAvL1xuICAgICAgICAvLyBXaGVyZUNsYXVzZSBwdWJsaWMgbWV0aG9kc1xuICAgICAgICAvL1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgYmV0d2VlbjogZnVuY3Rpb24gKGxvd2VyLCB1cHBlciwgaW5jbHVkZUxvd2VyLCBpbmNsdWRlVXBwZXIpIHtcbiAgICAgICAgICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgICAgICAgICAgLy8vICAgICBGaWx0ZXIgb3V0IHJlY29yZHMgd2hvc2Ugd2hlcmUtZmllbGQgbGF5cyBiZXR3ZWVuIGdpdmVuIGxvd2VyIGFuZCB1cHBlciB2YWx1ZXMuIEFwcGxpZXMgdG8gU3RyaW5ncywgTnVtYmVycyBhbmQgRGF0ZXMuXG4gICAgICAgICAgICAgICAgLy8vIDwvc3VtbWFyeT5cbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJsb3dlclwiPjwvcGFyYW0+XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwidXBwZXJcIj48L3BhcmFtPlxuICAgICAgICAgICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImluY2x1ZGVMb3dlclwiIG9wdGlvbmFsPVwidHJ1ZVwiPldoZXRoZXIgaXRlbXMgdGhhdCBlcXVhbHMgbG93ZXIgc2hvdWxkIGJlIGluY2x1ZGVkLiBEZWZhdWx0IHRydWUuPC9wYXJhbT5cbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJpbmNsdWRlVXBwZXJcIiBvcHRpb25hbD1cInRydWVcIj5XaGV0aGVyIGl0ZW1zIHRoYXQgZXF1YWxzIHVwcGVyIHNob3VsZCBiZSBpbmNsdWRlZC4gRGVmYXVsdCBmYWxzZS48L3BhcmFtPlxuICAgICAgICAgICAgICAgIC8vLyA8cmV0dXJucyB0eXBlPVwiQ29sbGVjdGlvblwiPjwvcmV0dXJucz5cbiAgICAgICAgICAgICAgICBpbmNsdWRlTG93ZXIgPSBpbmNsdWRlTG93ZXIgIT09IGZhbHNlOyAvLyBEZWZhdWx0IHRvIHRydWVcbiAgICAgICAgICAgICAgICBpbmNsdWRlVXBwZXIgPSBpbmNsdWRlVXBwZXIgPT09IHRydWU7IC8vIERlZmF1bHQgdG8gZmFsc2VcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY21wKGxvd2VyLCB1cHBlcikgPiAwIHx8IGNtcChsb3dlciwgdXBwZXIpID09PSAwICYmIChpbmNsdWRlTG93ZXIgfHwgaW5jbHVkZVVwcGVyKSAmJiAhKGluY2x1ZGVMb3dlciAmJiBpbmNsdWRlVXBwZXIpKSByZXR1cm4gZW1wdHlDb2xsZWN0aW9uKHRoaXMpOyAvLyBXb3JrYXJvdW5kIGZvciBpZGlvdGljIFczQyBTcGVjaWZpY2F0aW9uIHRoYXQgRGF0YUVycm9yIG11c3QgYmUgdGhyb3duIGlmIGxvd2VyID4gdXBwZXIuIFRoZSBuYXR1cmFsIHJlc3VsdCB3b3VsZCBiZSB0byByZXR1cm4gYW4gZW1wdHkgY29sbGVjdGlvbi5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLl9jdHguY29sbENsYXNzKHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS5ib3VuZChsb3dlciwgdXBwZXIsICFpbmNsdWRlTG93ZXIsICFpbmNsdWRlVXBwZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWlsKHRoaXMsIElOVkFMSURfS0VZX0FSR1VNRU5UKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXF1YWxzOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHRoaXMuX2N0eC5jb2xsQ2xhc3ModGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSURCS2V5UmFuZ2Uub25seSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWJvdmU6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY3R4LmNvbGxDbGFzcyh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS5sb3dlckJvdW5kKHZhbHVlLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhYm92ZU9yRXF1YWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgdGhpcy5fY3R4LmNvbGxDbGFzcyh0aGlzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBJREJLZXlSYW5nZS5sb3dlckJvdW5kKHZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBiZWxvdzogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLl9jdHguY29sbENsYXNzKHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElEQktleVJhbmdlLnVwcGVyQm91bmQodmFsdWUsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGJlbG93T3JFcXVhbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyB0aGlzLl9jdHguY29sbENsYXNzKHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElEQktleVJhbmdlLnVwcGVyQm91bmQodmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN0YXJ0c1dpdGg6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJzdHJcIiB0eXBlPVwiU3RyaW5nXCI+PC9wYXJhbT5cbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHN0ciAhPT0gJ3N0cmluZycpIHJldHVybiBmYWlsKHRoaXMsIFNUUklOR19FWFBFQ1RFRCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYmV0d2VlbihzdHIsIHN0ciArIG1heFN0cmluZywgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3RhcnRzV2l0aElnbm9yZUNhc2U6IGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJzdHJcIiB0eXBlPVwiU3RyaW5nXCI+PC9wYXJhbT5cbiAgICAgICAgICAgICAgICBpZiAoc3RyID09PSBcIlwiKSByZXR1cm4gdGhpcy5zdGFydHNXaXRoKHN0cik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFkZElnbm9yZUNhc2VBbGdvcml0aG0odGhpcywgZnVuY3Rpb24gKHgsIGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHguaW5kZXhPZihhWzBdKSA9PT0gMDtcbiAgICAgICAgICAgICAgICB9LCBbc3RyXSwgbWF4U3RyaW5nKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcXVhbHNJZ25vcmVDYXNlOiBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic3RyXCIgdHlwZT1cIlN0cmluZ1wiPjwvcGFyYW0+XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFkZElnbm9yZUNhc2VBbGdvcml0aG0odGhpcywgZnVuY3Rpb24gKHgsIGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHggPT09IGFbMF07XG4gICAgICAgICAgICAgICAgfSwgW3N0cl0sIFwiXCIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFueU9mSWdub3JlQ2FzZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZXQgPSBnZXRBcnJheU9mLmFwcGx5KE5PX0NIQVJfQVJSQVksIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICAgICAgaWYgKHNldC5sZW5ndGggPT09IDApIHJldHVybiBlbXB0eUNvbGxlY3Rpb24odGhpcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFkZElnbm9yZUNhc2VBbGdvcml0aG0odGhpcywgZnVuY3Rpb24gKHgsIGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuaW5kZXhPZih4KSAhPT0gLTE7XG4gICAgICAgICAgICAgICAgfSwgc2V0LCBcIlwiKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGFydHNXaXRoQW55T2ZJZ25vcmVDYXNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNldCA9IGdldEFycmF5T2YuYXBwbHkoTk9fQ0hBUl9BUlJBWSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICBpZiAoc2V0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIGVtcHR5Q29sbGVjdGlvbih0aGlzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYWRkSWdub3JlQ2FzZUFsZ29yaXRobSh0aGlzLCBmdW5jdGlvbiAoeCwgYSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYS5zb21lKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geC5pbmRleE9mKG4pID09PSAwO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9LCBzZXQsIG1heFN0cmluZyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYW55T2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2V0ID0gZ2V0QXJyYXlPZi5hcHBseShOT19DSEFSX0FSUkFZLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgICAgIHZhciBjb21wYXJlID0gYXNjZW5kaW5nO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHNldC5zb3J0KGNvbXBhcmUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwodGhpcywgSU5WQUxJRF9LRVlfQVJHVU1FTlQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2V0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIGVtcHR5Q29sbGVjdGlvbih0aGlzKTtcbiAgICAgICAgICAgICAgICB2YXIgYyA9IG5ldyB0aGlzLl9jdHguY29sbENsYXNzKHRoaXMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIElEQktleVJhbmdlLmJvdW5kKHNldFswXSwgc2V0W3NldC5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjLl9vbmRpcmVjdGlvbmNoYW5nZSA9IGZ1bmN0aW9uIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgY29tcGFyZSA9IGRpcmVjdGlvbiA9PT0gXCJuZXh0XCIgPyBhc2NlbmRpbmcgOiBkZXNjZW5kaW5nO1xuICAgICAgICAgICAgICAgICAgICBzZXQuc29ydChjb21wYXJlKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHZhciBpID0gMDtcbiAgICAgICAgICAgICAgICBjLl9hZGRBbGdvcml0aG0oZnVuY3Rpb24gKGN1cnNvciwgYWR2YW5jZSwgcmVzb2x2ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gY3Vyc29yLmtleTtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGNvbXBhcmUoa2V5LCBzZXRbaV0pID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnNvciBoYXMgcGFzc2VkIGJleW9uZCB0aGlzIGtleS4gQ2hlY2sgbmV4dC5cbiAgICAgICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBzZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlcmUgaXMgbm8gbmV4dC4gU3RvcCBzZWFyY2hpbmcuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZShyZXNvbHZlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBhcmUoa2V5LCBzZXRbaV0pID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY3VycmVudCBjdXJzb3IgdmFsdWUgc2hvdWxkIGJlIGluY2x1ZGVkIGFuZCB3ZSBzaG91bGQgY29udGludWUgYSBzaW5nbGUgc3RlcCBpbiBjYXNlIG5leHQgaXRlbSBoYXMgdGhlIHNhbWUga2V5IG9yIHBvc3NpYmx5IG91ciBuZXh0IGtleSBpbiBzZXQuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGN1cnNvci5rZXkgbm90IHlldCBhdCBzZXRbaV0uIEZvcndhcmQgY3Vyc29yIHRvIHRoZSBuZXh0IGtleSB0byBodW50IGZvci5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZShzZXRbaV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG5vdEVxdWFsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbkFueVJhbmdlKFtbLUluZmluaXR5LCB2YWx1ZV0sIFt2YWx1ZSwgbWF4S2V5XV0sIHsgaW5jbHVkZUxvd2VyczogZmFsc2UsIGluY2x1ZGVVcHBlcnM6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgbm9uZU9mOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNldCA9IGdldEFycmF5T2YuYXBwbHkoTk9fQ0hBUl9BUlJBWSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICBpZiAoc2V0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIG5ldyB0aGlzLl9jdHguY29sbENsYXNzKHRoaXMpOyAvLyBSZXR1cm4gZW50aXJlIGNvbGxlY3Rpb24uXG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgc2V0LnNvcnQoYXNjZW5kaW5nKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWlsKHRoaXMsIElOVkFMSURfS0VZX0FSR1VNRU5UKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gVHJhbnNmb3JtIFtcImFcIixcImJcIixcImNcIl0gdG8gYSBzZXQgb2YgcmFuZ2VzIGZvciBiZXR3ZWVuL2Fib3ZlL2JlbG93OiBbWy1JbmZpbml0eSxcImFcIl0sIFtcImFcIixcImJcIl0sIFtcImJcIixcImNcIl0sIFtcImNcIixtYXhLZXldXVxuICAgICAgICAgICAgICAgIHZhciByYW5nZXMgPSBzZXQucmVkdWNlKGZ1bmN0aW9uIChyZXMsIHZhbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzID8gcmVzLmNvbmNhdChbW3Jlc1tyZXMubGVuZ3RoIC0gMV1bMV0sIHZhbF1dKSA6IFtbLUluZmluaXR5LCB2YWxdXTtcbiAgICAgICAgICAgICAgICB9LCBudWxsKTtcbiAgICAgICAgICAgICAgICByYW5nZXMucHVzaChbc2V0W3NldC5sZW5ndGggLSAxXSwgbWF4S2V5XSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5BbnlSYW5nZShyYW5nZXMsIHsgaW5jbHVkZUxvd2VyczogZmFsc2UsIGluY2x1ZGVVcHBlcnM6IGZhbHNlIH0pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLyoqIEZpbHRlciBvdXQgdmFsdWVzIHdpdGhpbmcgZ2l2ZW4gc2V0IG9mIHJhbmdlcy5cclxuICAgICAgICAgICAgKiBFeGFtcGxlLCBnaXZlIGNoaWxkcmVuIGFuZCBlbGRlcnMgYSByZWJhdGUgb2YgNTAlOlxyXG4gICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICogICBkYi5mcmllbmRzLndoZXJlKCdhZ2UnKS5pbkFueVJhbmdlKFtbMCwxOF0sWzY1LEluZmluaXR5XV0pLm1vZGlmeSh7UmViYXRlOiAxLzJ9KTtcclxuICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAqIEBwYXJhbSB7KHN0cmluZ3xudW1iZXJ8RGF0ZXxBcnJheSlbXVtdfSByYW5nZXNcclxuICAgICAgICAgICAgKiBAcGFyYW0ge3tpbmNsdWRlTG93ZXJzOiBib29sZWFuLCBpbmNsdWRlVXBwZXJzOiBib29sZWFufX0gb3B0aW9uc1xyXG4gICAgICAgICAgICAqL1xuICAgICAgICAgICAgaW5BbnlSYW5nZTogZnVuY3Rpb24gKHJhbmdlcywgb3B0aW9ucykge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG4gICAgICAgICAgICAgICAgaWYgKHJhbmdlcy5sZW5ndGggPT09IDApIHJldHVybiBlbXB0eUNvbGxlY3Rpb24odGhpcyk7XG4gICAgICAgICAgICAgICAgaWYgKCFyYW5nZXMuZXZlcnkoZnVuY3Rpb24gKHJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByYW5nZVswXSAhPT0gdW5kZWZpbmVkICYmIHJhbmdlWzFdICE9PSB1bmRlZmluZWQgJiYgYXNjZW5kaW5nKHJhbmdlWzBdLCByYW5nZVsxXSkgPD0gMDtcbiAgICAgICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFpbCh0aGlzLCBcIkZpcnN0IGFyZ3VtZW50IHRvIGluQW55UmFuZ2UoKSBtdXN0IGJlIGFuIEFycmF5IG9mIHR3by12YWx1ZSBBcnJheXMgW2xvd2VyLHVwcGVyXSB3aGVyZSB1cHBlciBtdXN0IG5vdCBiZSBsb3dlciB0aGFuIGxvd2VyXCIsIGV4Y2VwdGlvbnMuSW52YWxpZEFyZ3VtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGluY2x1ZGVMb3dlcnMgPSAhb3B0aW9ucyB8fCBvcHRpb25zLmluY2x1ZGVMb3dlcnMgIT09IGZhbHNlOyAvLyBEZWZhdWx0IHRvIHRydWVcbiAgICAgICAgICAgICAgICB2YXIgaW5jbHVkZVVwcGVycyA9IG9wdGlvbnMgJiYgb3B0aW9ucy5pbmNsdWRlVXBwZXJzID09PSB0cnVlOyAvLyBEZWZhdWx0IHRvIGZhbHNlXG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBhZGRSYW5nZShyYW5nZXMsIG5ld1JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gcmFuZ2VzLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJhbmdlID0gcmFuZ2VzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNtcChuZXdSYW5nZVswXSwgcmFuZ2VbMV0pIDwgMCAmJiBjbXAobmV3UmFuZ2VbMV0sIHJhbmdlWzBdKSA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByYW5nZVswXSA9IG1pbihyYW5nZVswXSwgbmV3UmFuZ2VbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJhbmdlWzFdID0gbWF4KHJhbmdlWzFdLCBuZXdSYW5nZVsxXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGkgPT09IGwpIHJhbmdlcy5wdXNoKG5ld1JhbmdlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJhbmdlcztcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgc29ydERpcmVjdGlvbiA9IGFzY2VuZGluZztcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiByYW5nZVNvcnRlcihhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBzb3J0RGlyZWN0aW9uKGFbMF0sIGJbMF0pO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEpvaW4gb3ZlcmxhcHBpbmcgcmFuZ2VzXG4gICAgICAgICAgICAgICAgdmFyIHNldDtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBzZXQgPSByYW5nZXMucmVkdWNlKGFkZFJhbmdlLCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIHNldC5zb3J0KHJhbmdlU29ydGVyKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFpbCh0aGlzLCBJTlZBTElEX0tFWV9BUkdVTUVOVCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICAgICAgICAgIHZhciBrZXlJc0JleW9uZEN1cnJlbnRFbnRyeSA9IGluY2x1ZGVVcHBlcnMgPyBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhc2NlbmRpbmcoa2V5LCBzZXRbaV1bMV0pID4gMDtcbiAgICAgICAgICAgICAgICB9IDogZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXNjZW5kaW5nKGtleSwgc2V0W2ldWzFdKSA+PSAwO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICB2YXIga2V5SXNCZWZvcmVDdXJyZW50RW50cnkgPSBpbmNsdWRlTG93ZXJzID8gZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGVzY2VuZGluZyhrZXksIHNldFtpXVswXSkgPiAwO1xuICAgICAgICAgICAgICAgIH0gOiBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkZXNjZW5kaW5nKGtleSwgc2V0W2ldWzBdKSA+PSAwO1xuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBrZXlXaXRoaW5DdXJyZW50UmFuZ2Uoa2V5KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAha2V5SXNCZXlvbmRDdXJyZW50RW50cnkoa2V5KSAmJiAha2V5SXNCZWZvcmVDdXJyZW50RW50cnkoa2V5KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgY2hlY2tLZXkgPSBrZXlJc0JleW9uZEN1cnJlbnRFbnRyeTtcblxuICAgICAgICAgICAgICAgIHZhciBjID0gbmV3IGN0eC5jb2xsQ2xhc3ModGhpcywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gSURCS2V5UmFuZ2UuYm91bmQoc2V0WzBdWzBdLCBzZXRbc2V0Lmxlbmd0aCAtIDFdWzFdLCAhaW5jbHVkZUxvd2VycywgIWluY2x1ZGVVcHBlcnMpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYy5fb25kaXJlY3Rpb25jaGFuZ2UgPSBmdW5jdGlvbiAoZGlyZWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09IFwibmV4dFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja0tleSA9IGtleUlzQmV5b25kQ3VycmVudEVudHJ5O1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydERpcmVjdGlvbiA9IGFzY2VuZGluZztcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrS2V5ID0ga2V5SXNCZWZvcmVDdXJyZW50RW50cnk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3J0RGlyZWN0aW9uID0gZGVzY2VuZGluZztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzZXQuc29ydChyYW5nZVNvcnRlcik7XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGMuX2FkZEFsZ29yaXRobShmdW5jdGlvbiAoY3Vyc29yLCBhZHZhbmNlLCByZXNvbHZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSBjdXJzb3Iua2V5O1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoY2hlY2tLZXkoa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlIGN1cnNvciBoYXMgcGFzc2VkIGJleW9uZCB0aGlzIGtleS4gQ2hlY2sgbmV4dC5cbiAgICAgICAgICAgICAgICAgICAgICAgICsraTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpID09PSBzZXQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhlcmUgaXMgbm8gbmV4dC4gU3RvcCBzZWFyY2hpbmcuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZShyZXNvbHZlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGtleVdpdGhpbkN1cnJlbnRSYW5nZShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgY3VycmVudCBjdXJzb3IgdmFsdWUgc2hvdWxkIGJlIGluY2x1ZGVkIGFuZCB3ZSBzaG91bGQgY29udGludWUgYSBzaW5nbGUgc3RlcCBpbiBjYXNlIG5leHQgaXRlbSBoYXMgdGhlIHNhbWUga2V5IG9yIHBvc3NpYmx5IG91ciBuZXh0IGtleSBpbiBzZXQuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjbXAoa2V5LCBzZXRbaV1bMV0pID09PSAwIHx8IGNtcChrZXksIHNldFtpXVswXSkgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGluY2x1ZGVVcHBlciBvciBpbmNsdWRlTG93ZXIgaXMgZmFsc2Ugc28ga2V5V2l0aGluQ3VycmVudFJhbmdlKCkgcmV0dXJucyBmYWxzZSBldmVuIHRob3VnaCB3ZSBhcmUgYXQgcmFuZ2UgYm9yZGVyLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ29udGludWUgdG8gbmV4dCBrZXkgYnV0IGRvbid0IGluY2x1ZGUgdGhpcyBvbmUuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjdXJzb3Iua2V5IG5vdCB5ZXQgYXQgc2V0W2ldLiBGb3J3YXJkIGN1cnNvciB0byB0aGUgbmV4dCBrZXkgdG8gaHVudCBmb3IuXG4gICAgICAgICAgICAgICAgICAgICAgICBhZHZhbmNlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc29ydERpcmVjdGlvbiA9PT0gYXNjZW5kaW5nKSBjdXJzb3IuY29udGludWUoc2V0W2ldWzBdKTtlbHNlIGN1cnNvci5jb250aW51ZShzZXRbaV1bMV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdGFydHNXaXRoQW55T2Y6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2V0ID0gZ2V0QXJyYXlPZi5hcHBseShOT19DSEFSX0FSUkFZLCBhcmd1bWVudHMpO1xuXG4gICAgICAgICAgICAgICAgaWYgKCFzZXQuZXZlcnkoZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHR5cGVvZiBzID09PSAnc3RyaW5nJztcbiAgICAgICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFpbCh0aGlzLCBcInN0YXJ0c1dpdGhBbnlPZigpIG9ubHkgd29ya3Mgd2l0aCBzdHJpbmdzXCIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoc2V0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIGVtcHR5Q29sbGVjdGlvbih0aGlzKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluQW55UmFuZ2Uoc2V0Lm1hcChmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbc3RyLCBzdHIgKyBtYXhTdHJpbmddO1xuICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIC8vXG4gICAgLy9cbiAgICAvL1xuICAgIC8vIENvbGxlY3Rpb24gQ2xhc3NcbiAgICAvL1xuICAgIC8vXG4gICAgLy9cbiAgICBmdW5jdGlvbiBDb2xsZWN0aW9uKHdoZXJlQ2xhdXNlLCBrZXlSYW5nZUdlbmVyYXRvcikge1xuICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgIC8vL1xuICAgICAgICAvLy8gPC9zdW1tYXJ5PlxuICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJ3aGVyZUNsYXVzZVwiIHR5cGU9XCJXaGVyZUNsYXVzZVwiPldoZXJlIGNsYXVzZSBpbnN0YW5jZTwvcGFyYW0+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImtleVJhbmdlR2VuZXJhdG9yXCIgdmFsdWU9XCJmdW5jdGlvbigpeyByZXR1cm4gSURCS2V5UmFuZ2UuYm91bmQoMCwxKTt9XCIgb3B0aW9uYWw9XCJ0cnVlXCI+PC9wYXJhbT5cbiAgICAgICAgdmFyIGtleVJhbmdlID0gbnVsbCxcbiAgICAgICAgICAgIGVycm9yID0gbnVsbDtcbiAgICAgICAgaWYgKGtleVJhbmdlR2VuZXJhdG9yKSB0cnkge1xuICAgICAgICAgICAga2V5UmFuZ2UgPSBrZXlSYW5nZUdlbmVyYXRvcigpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgZXJyb3IgPSBleDtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB3aGVyZUN0eCA9IHdoZXJlQ2xhdXNlLl9jdHgsXG4gICAgICAgICAgICB0YWJsZSA9IHdoZXJlQ3R4LnRhYmxlO1xuICAgICAgICB0aGlzLl9jdHggPSB7XG4gICAgICAgICAgICB0YWJsZTogdGFibGUsXG4gICAgICAgICAgICBpbmRleDogd2hlcmVDdHguaW5kZXgsXG4gICAgICAgICAgICBpc1ByaW1LZXk6ICF3aGVyZUN0eC5pbmRleCB8fCB0YWJsZS5zY2hlbWEucHJpbUtleS5rZXlQYXRoICYmIHdoZXJlQ3R4LmluZGV4ID09PSB0YWJsZS5zY2hlbWEucHJpbUtleS5uYW1lLFxuICAgICAgICAgICAgcmFuZ2U6IGtleVJhbmdlLFxuICAgICAgICAgICAga2V5c09ubHk6IGZhbHNlLFxuICAgICAgICAgICAgZGlyOiBcIm5leHRcIixcbiAgICAgICAgICAgIHVuaXF1ZTogXCJcIixcbiAgICAgICAgICAgIGFsZ29yaXRobTogbnVsbCxcbiAgICAgICAgICAgIGZpbHRlcjogbnVsbCxcbiAgICAgICAgICAgIHJlcGxheUZpbHRlcjogbnVsbCxcbiAgICAgICAgICAgIGp1c3RMaW1pdDogdHJ1ZSwgLy8gVHJ1ZSBpZiBhIHJlcGxheUZpbHRlciBpcyBqdXN0IGEgZmlsdGVyIHRoYXQgcGVyZm9ybXMgYSBcImxpbWl0XCIgb3BlcmF0aW9uIChvciBub25lIGF0IGFsbClcbiAgICAgICAgICAgIGlzTWF0Y2g6IG51bGwsXG4gICAgICAgICAgICBvZmZzZXQ6IDAsXG4gICAgICAgICAgICBsaW1pdDogSW5maW5pdHksXG4gICAgICAgICAgICBlcnJvcjogZXJyb3IsIC8vIElmIHNldCwgYW55IHByb21pc2UgbXVzdCBiZSByZWplY3RlZCB3aXRoIHRoaXMgZXJyb3JcbiAgICAgICAgICAgIG9yOiB3aGVyZUN0eC5vcixcbiAgICAgICAgICAgIHZhbHVlTWFwcGVyOiB0YWJsZS5ob29rLnJlYWRpbmcuZmlyZVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzUGxhaW5LZXlSYW5nZShjdHgsIGlnbm9yZUxpbWl0RmlsdGVyKSB7XG4gICAgICAgIHJldHVybiAhKGN0eC5maWx0ZXIgfHwgY3R4LmFsZ29yaXRobSB8fCBjdHgub3IpICYmIChpZ25vcmVMaW1pdEZpbHRlciA/IGN0eC5qdXN0TGltaXQgOiAhY3R4LnJlcGxheUZpbHRlcik7XG4gICAgfVxuXG4gICAgcHJvcHMoQ29sbGVjdGlvbi5wcm90b3R5cGUsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvL1xuICAgICAgICAvLyBDb2xsZWN0aW9uIFByaXZhdGUgRnVuY3Rpb25zXG4gICAgICAgIC8vXG5cbiAgICAgICAgZnVuY3Rpb24gYWRkRmlsdGVyKGN0eCwgZm4pIHtcbiAgICAgICAgICAgIGN0eC5maWx0ZXIgPSBjb21iaW5lKGN0eC5maWx0ZXIsIGZuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIGFkZFJlcGxheUZpbHRlcihjdHgsIGZhY3RvcnksIGlzTGltaXRGaWx0ZXIpIHtcbiAgICAgICAgICAgIHZhciBjdXJyID0gY3R4LnJlcGxheUZpbHRlcjtcbiAgICAgICAgICAgIGN0eC5yZXBsYXlGaWx0ZXIgPSBjdXJyID8gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb21iaW5lKGN1cnIoKSwgZmFjdG9yeSgpKTtcbiAgICAgICAgICAgIH0gOiBmYWN0b3J5O1xuICAgICAgICAgICAgY3R4Lmp1c3RMaW1pdCA9IGlzTGltaXRGaWx0ZXIgJiYgIWN1cnI7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBhZGRNYXRjaEZpbHRlcihjdHgsIGZuKSB7XG4gICAgICAgICAgICBjdHguaXNNYXRjaCA9IGNvbWJpbmUoY3R4LmlzTWF0Y2gsIGZuKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKiBAcGFyYW0gY3R4IHtcclxuICAgICAgICAgKiAgICAgIGlzUHJpbUtleTogYm9vbGVhbixcclxuICAgICAgICAgKiAgICAgIHRhYmxlOiBUYWJsZSxcclxuICAgICAgICAgKiAgICAgIGluZGV4OiBzdHJpbmdcclxuICAgICAgICAgKiB9XHJcbiAgICAgICAgICogQHBhcmFtIHN0b3JlIElEQk9iamVjdFN0b3JlXHJcbiAgICAgICAgICoqL1xuICAgICAgICBmdW5jdGlvbiBnZXRJbmRleE9yU3RvcmUoY3R4LCBzdG9yZSkge1xuICAgICAgICAgICAgaWYgKGN0eC5pc1ByaW1LZXkpIHJldHVybiBzdG9yZTtcbiAgICAgICAgICAgIHZhciBpbmRleFNwZWMgPSBjdHgudGFibGUuc2NoZW1hLmlkeEJ5TmFtZVtjdHguaW5kZXhdO1xuICAgICAgICAgICAgaWYgKCFpbmRleFNwZWMpIHRocm93IG5ldyBleGNlcHRpb25zLlNjaGVtYShcIktleVBhdGggXCIgKyBjdHguaW5kZXggKyBcIiBvbiBvYmplY3Qgc3RvcmUgXCIgKyBzdG9yZS5uYW1lICsgXCIgaXMgbm90IGluZGV4ZWRcIik7XG4gICAgICAgICAgICByZXR1cm4gc3RvcmUuaW5kZXgoaW5kZXhTcGVjLm5hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqIEBwYXJhbSBjdHgge1xyXG4gICAgICAgICAqICAgICAgaXNQcmltS2V5OiBib29sZWFuLFxyXG4gICAgICAgICAqICAgICAgdGFibGU6IFRhYmxlLFxyXG4gICAgICAgICAqICAgICAgaW5kZXg6IHN0cmluZyxcclxuICAgICAgICAgKiAgICAgIGtleXNPbmx5OiBib29sZWFuLFxyXG4gICAgICAgICAqICAgICAgcmFuZ2U/OiBJREJLZXlSYW5nZSxcclxuICAgICAgICAgKiAgICAgIGRpcjogXCJuZXh0XCIgfCBcInByZXZcIlxyXG4gICAgICAgICAqIH1cclxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gb3BlbkN1cnNvcihjdHgsIHN0b3JlKSB7XG4gICAgICAgICAgICB2YXIgaWR4T3JTdG9yZSA9IGdldEluZGV4T3JTdG9yZShjdHgsIHN0b3JlKTtcbiAgICAgICAgICAgIHJldHVybiBjdHgua2V5c09ubHkgJiYgJ29wZW5LZXlDdXJzb3InIGluIGlkeE9yU3RvcmUgPyBpZHhPclN0b3JlLm9wZW5LZXlDdXJzb3IoY3R4LnJhbmdlIHx8IG51bGwsIGN0eC5kaXIgKyBjdHgudW5pcXVlKSA6IGlkeE9yU3RvcmUub3BlbkN1cnNvcihjdHgucmFuZ2UgfHwgbnVsbCwgY3R4LmRpciArIGN0eC51bmlxdWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gaXRlcihjdHgsIGZuLCByZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKSB7XG4gICAgICAgICAgICB2YXIgZmlsdGVyID0gY3R4LnJlcGxheUZpbHRlciA/IGNvbWJpbmUoY3R4LmZpbHRlciwgY3R4LnJlcGxheUZpbHRlcigpKSA6IGN0eC5maWx0ZXI7XG4gICAgICAgICAgICBpZiAoIWN0eC5vcikge1xuICAgICAgICAgICAgICAgIGl0ZXJhdGUob3BlbkN1cnNvcihjdHgsIGlkYnN0b3JlKSwgY29tYmluZShjdHguYWxnb3JpdGhtLCBmaWx0ZXIpLCBmbiwgcmVzb2x2ZSwgcmVqZWN0LCAhY3R4LmtleXNPbmx5ICYmIGN0eC52YWx1ZU1hcHBlcik7XG4gICAgICAgICAgICB9IGVsc2UgKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgc2V0ID0ge307XG4gICAgICAgICAgICAgICAgdmFyIHJlc29sdmVkID0gMDtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHJlc29sdmVib3RoKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKytyZXNvbHZlZCA9PT0gMikgcmVzb2x2ZSgpOyAvLyBTZWVtcyBsaWtlIHdlIGp1c3Qgc3VwcG9ydCBvciBidHduIG1heCAyIGV4cHJlc3Npb25zLCBidXQgdGhlcmUgYXJlIG5vIGxpbWl0IGJlY2F1c2Ugd2UgZG8gcmVjdXJzaW9uLlxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHVuaW9uKGl0ZW0sIGN1cnNvciwgYWR2YW5jZSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWZpbHRlciB8fCBmaWx0ZXIoY3Vyc29yLCBhZHZhbmNlLCByZXNvbHZlYm90aCwgcmVqZWN0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleSA9IGN1cnNvci5wcmltYXJ5S2V5LnRvU3RyaW5nKCk7IC8vIENvbnZlcnRzIGFueSBEYXRlIHRvIFN0cmluZywgU3RyaW5nIHRvIFN0cmluZywgTnVtYmVyIHRvIFN0cmluZyBhbmQgQXJyYXkgdG8gY29tbWEtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNPd24oc2V0LCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0W2tleV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZuKGl0ZW0sIGN1cnNvciwgYWR2YW5jZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjdHgub3IuX2l0ZXJhdGUodW5pb24sIHJlc29sdmVib3RoLCByZWplY3QsIGlkYnN0b3JlKTtcbiAgICAgICAgICAgICAgICBpdGVyYXRlKG9wZW5DdXJzb3IoY3R4LCBpZGJzdG9yZSksIGN0eC5hbGdvcml0aG0sIHVuaW9uLCByZXNvbHZlYm90aCwgcmVqZWN0LCAhY3R4LmtleXNPbmx5ICYmIGN0eC52YWx1ZU1hcHBlcik7XG4gICAgICAgICAgICB9KSgpO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIGdldEluc3RhbmNlVGVtcGxhdGUoY3R4KSB7XG4gICAgICAgICAgICByZXR1cm4gY3R4LnRhYmxlLnNjaGVtYS5pbnN0YW5jZVRlbXBsYXRlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHtcblxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIENvbGxlY3Rpb24gUHJvdGVjdGVkIEZ1bmN0aW9uc1xuICAgICAgICAgICAgLy9cblxuICAgICAgICAgICAgX3JlYWQ6IGZ1bmN0aW9uIChmbiwgY2IpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGlmIChjdHguZXJyb3IpIHJldHVybiBjdHgudGFibGUuX3RyYW5zKG51bGwsIGZ1bmN0aW9uIHJlamVjdG9yKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoY3R4LmVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtlbHNlIHJldHVybiBjdHgudGFibGUuX2lkYnN0b3JlKFJFQURPTkxZLCBmbikudGhlbihjYik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgX3dyaXRlOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGlmIChjdHguZXJyb3IpIHJldHVybiBjdHgudGFibGUuX3RyYW5zKG51bGwsIGZ1bmN0aW9uIHJlamVjdG9yKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgICAgICAgICByZWplY3QoY3R4LmVycm9yKTtcbiAgICAgICAgICAgICAgICB9KTtlbHNlIHJldHVybiBjdHgudGFibGUuX2lkYnN0b3JlKFJFQURXUklURSwgZm4sIFwibG9ja2VkXCIpOyAvLyBXaGVuIGRvaW5nIHdyaXRlIG9wZXJhdGlvbnMgb24gY29sbGVjdGlvbnMsIGFsd2F5cyBsb2NrIHRoZSBvcGVyYXRpb24gc28gdGhhdCB1cGNvbWluZyBvcGVyYXRpb25zIGdldHMgcXVldWVkLlxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF9hZGRBbGdvcml0aG06IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG4gICAgICAgICAgICAgICAgY3R4LmFsZ29yaXRobSA9IGNvbWJpbmUoY3R4LmFsZ29yaXRobSwgZm4pO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgX2l0ZXJhdGU6IGZ1bmN0aW9uIChmbiwgcmVzb2x2ZSwgcmVqZWN0LCBpZGJzdG9yZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVyKHRoaXMuX2N0eCwgZm4sIHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgY2xvbmU6IGZ1bmN0aW9uIChwcm9wcyQkMSkge1xuICAgICAgICAgICAgICAgIHZhciBydiA9IE9iamVjdC5jcmVhdGUodGhpcy5jb25zdHJ1Y3Rvci5wcm90b3R5cGUpLFxuICAgICAgICAgICAgICAgICAgICBjdHggPSBPYmplY3QuY3JlYXRlKHRoaXMuX2N0eCk7XG4gICAgICAgICAgICAgICAgaWYgKHByb3BzJCQxKSBleHRlbmQoY3R4LCBwcm9wcyQkMSk7XG4gICAgICAgICAgICAgICAgcnYuX2N0eCA9IGN0eDtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnY7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICByYXc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jdHgudmFsdWVNYXBwZXIgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy9cbiAgICAgICAgICAgIC8vIENvbGxlY3Rpb24gUHVibGljIG1ldGhvZHNcbiAgICAgICAgICAgIC8vXG5cbiAgICAgICAgICAgIGVhY2g6IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG5cbiAgICAgICAgICAgICAgICBpZiAoZmFrZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaXRlbSA9IGdldEluc3RhbmNlVGVtcGxhdGUoY3R4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByaW1LZXlQYXRoID0gY3R4LnRhYmxlLnNjaGVtYS5wcmltS2V5LmtleVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXkgPSBnZXRCeUtleVBhdGgoaXRlbSwgY3R4LmluZGV4ID8gY3R4LnRhYmxlLnNjaGVtYS5pZHhCeU5hbWVbY3R4LmluZGV4XS5rZXlQYXRoIDogcHJpbUtleVBhdGgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbWFyeUtleSA9IGdldEJ5S2V5UGF0aChpdGVtLCBwcmltS2V5UGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKGl0ZW0sIHsga2V5OiBrZXksIHByaW1hcnlLZXk6IHByaW1hcnlLZXkgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWQoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlcihjdHgsIGZuLCByZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGNvdW50OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmFrZSkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgwKS50aGVuKGNiKTtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzUGxhaW5LZXlSYW5nZShjdHgsIHRydWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBwbGFpbiBrZXkgcmFuZ2UuIFdlIGNhbiB1c2UgdGhlIGNvdW50KCkgbWV0aG9kIGlmIHRoZSBpbmRleC5cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWQoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHggPSBnZXRJbmRleE9yU3RvcmUoY3R4LCBpZGJzdG9yZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVxID0gY3R4LnJhbmdlID8gaWR4LmNvdW50KGN0eC5yYW5nZSkgOiBpZHguY291bnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKE1hdGgubWluKGUudGFyZ2V0LnJlc3VsdCwgY3R4LmxpbWl0KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9LCBjYik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQWxnb3JpdGhtcywgZmlsdGVycyBvciBleHByZXNzaW9ucyBhcmUgYXBwbGllZC4gTmVlZCB0byBjb3VudCBtYW51YWxseS5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvdW50ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWQoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZXIoY3R4LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKytjb3VudDtyZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShjb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9LCByZWplY3QsIGlkYnN0b3JlKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgY2IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHNvcnRCeTogZnVuY3Rpb24gKGtleVBhdGgsIGNiKSB7XG4gICAgICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwia2V5UGF0aFwiIHR5cGU9XCJTdHJpbmdcIj48L3BhcmFtPlxuICAgICAgICAgICAgICAgIHZhciBwYXJ0cyA9IGtleVBhdGguc3BsaXQoJy4nKS5yZXZlcnNlKCksXG4gICAgICAgICAgICAgICAgICAgIGxhc3RQYXJ0ID0gcGFydHNbMF0sXG4gICAgICAgICAgICAgICAgICAgIGxhc3RJbmRleCA9IHBhcnRzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gZ2V0dmFsKG9iaiwgaSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaSkgcmV0dXJuIGdldHZhbChvYmpbcGFydHNbaV1dLCBpIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmpbbGFzdFBhcnRdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgb3JkZXIgPSB0aGlzLl9jdHguZGlyID09PSBcIm5leHRcIiA/IDEgOiAtMTtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIHNvcnRlcihhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhVmFsID0gZ2V0dmFsKGEsIGxhc3RJbmRleCksXG4gICAgICAgICAgICAgICAgICAgICAgICBiVmFsID0gZ2V0dmFsKGIsIGxhc3RJbmRleCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhVmFsIDwgYlZhbCA/IC1vcmRlciA6IGFWYWwgPiBiVmFsID8gb3JkZXIgOiAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy50b0FycmF5KGZ1bmN0aW9uIChhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhLnNvcnQoc29ydGVyKTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGNiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIHRvQXJyYXk6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWQoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgZmFrZSAmJiByZXNvbHZlKFtnZXRJbnN0YW5jZVRlbXBsYXRlKGN0eCldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGhhc0dldEFsbCAmJiBjdHguZGlyID09PSAnbmV4dCcgJiYgaXNQbGFpbktleVJhbmdlKGN0eCwgdHJ1ZSkgJiYgY3R4LmxpbWl0ID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU3BlY2lhbCBvcHRpbWF0aW9uIGlmIHdlIGNvdWxkIHVzZSBJREJPYmplY3RTdG9yZS5nZXRBbGwoKSBvclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSURCS2V5UmFuZ2UuZ2V0QWxsKCk6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVhZGluZ0hvb2sgPSBjdHgudGFibGUuaG9vay5yZWFkaW5nLmZpcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaWR4T3JTdG9yZSA9IGdldEluZGV4T3JTdG9yZShjdHgsIGlkYnN0b3JlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXEgPSBjdHgubGltaXQgPCBJbmZpbml0eSA/IGlkeE9yU3RvcmUuZ2V0QWxsKGN0eC5yYW5nZSwgY3R4LmxpbWl0KSA6IGlkeE9yU3RvcmUuZ2V0QWxsKGN0eC5yYW5nZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXEub25lcnJvciA9IGV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IHJlYWRpbmdIb29rID09PSBtaXJyb3IgPyBldmVudFN1Y2Nlc3NIYW5kbGVyKHJlc29sdmUpIDogd3JhcChldmVudFN1Y2Nlc3NIYW5kbGVyKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcy5tYXAocmVhZGluZ0hvb2spKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXR0aW5nIGFycmF5IHRocm91Z2ggYSBjdXJzb3IuXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXRlcihjdHgsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYS5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gYXJyYXlDb21wbGV0ZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgcmVqZWN0LCBpZGJzdG9yZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LCBjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvZmZzZXQ6IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGlmIChvZmZzZXQgPD0gMCkgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgY3R4Lm9mZnNldCArPSBvZmZzZXQ7IC8vIEZvciBjb3VudCgpXG4gICAgICAgICAgICAgICAgaWYgKGlzUGxhaW5LZXlSYW5nZShjdHgpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFkZFJlcGxheUZpbHRlcihjdHgsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvZmZzZXRMZWZ0ID0gb2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjdXJzb3IsIGFkdmFuY2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2Zmc2V0TGVmdCA9PT0gMCkgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9mZnNldExlZnQgPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLS1vZmZzZXRMZWZ0O3JldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWR2YW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5hZHZhbmNlKG9mZnNldExlZnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvZmZzZXRMZWZ0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhZGRSZXBsYXlGaWx0ZXIoY3R4LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0TGVmdCA9IG9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIC0tb2Zmc2V0TGVmdCA8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBsaW1pdDogZnVuY3Rpb24gKG51bVJvd3MpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jdHgubGltaXQgPSBNYXRoLm1pbih0aGlzLl9jdHgubGltaXQsIG51bVJvd3MpOyAvLyBGb3IgY291bnQoKVxuICAgICAgICAgICAgICAgIGFkZFJlcGxheUZpbHRlcih0aGlzLl9jdHgsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJvd3NMZWZ0ID0gbnVtUm93cztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChjdXJzb3IsIGFkdmFuY2UsIHJlc29sdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgtLXJvd3NMZWZ0IDw9IDApIGFkdmFuY2UocmVzb2x2ZSk7IC8vIFN0b3AgYWZ0ZXIgdGhpcyBpdGVtIGhhcyBiZWVuIGluY2x1ZGVkXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcm93c0xlZnQgPj0gMDsgLy8gSWYgbnVtUm93cyBpcyBhbHJlYWR5IGJlbG93IDAsIHJldHVybiBmYWxzZSBiZWNhdXNlIHRoZW4gMCB3YXMgcGFzc2VkIHRvIG51bVJvd3MgaW5pdGlhbGx5LiBPdGhlcndpc2Ugd2Ugd291bGRudCBjb21lIGhlcmUuXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICB1bnRpbDogZnVuY3Rpb24gKGZpbHRlckZ1bmN0aW9uLCBiSW5jbHVkZVN0b3BFbnRyeSkge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG4gICAgICAgICAgICAgICAgZmFrZSAmJiBmaWx0ZXJGdW5jdGlvbihnZXRJbnN0YW5jZVRlbXBsYXRlKGN0eCkpO1xuICAgICAgICAgICAgICAgIGFkZEZpbHRlcih0aGlzLl9jdHgsIGZ1bmN0aW9uIChjdXJzb3IsIGFkdmFuY2UsIHJlc29sdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbHRlckZ1bmN0aW9uKGN1cnNvci52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkdmFuY2UocmVzb2x2ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYkluY2x1ZGVTdG9wRW50cnk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZmlyc3Q6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmxpbWl0KDEpLnRvQXJyYXkoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFbMF07XG4gICAgICAgICAgICAgICAgfSkudGhlbihjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBsYXN0OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5yZXZlcnNlKCkuZmlyc3QoY2IpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZmlsdGVyOiBmdW5jdGlvbiAoZmlsdGVyRnVuY3Rpb24pIHtcbiAgICAgICAgICAgICAgICAvLy8gPHBhcmFtIG5hbWU9XCJqc0Z1bmN0aW9uRmlsdGVyXCIgdHlwZT1cIkZ1bmN0aW9uXCI+ZnVuY3Rpb24odmFsKXtyZXR1cm4gdHJ1ZS9mYWxzZX08L3BhcmFtPlxuICAgICAgICAgICAgICAgIGZha2UgJiYgZmlsdGVyRnVuY3Rpb24oZ2V0SW5zdGFuY2VUZW1wbGF0ZSh0aGlzLl9jdHgpKTtcbiAgICAgICAgICAgICAgICBhZGRGaWx0ZXIodGhpcy5fY3R4LCBmdW5jdGlvbiAoY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmaWx0ZXJGdW5jdGlvbihjdXJzb3IudmFsdWUpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIC8vIG1hdGNoIGZpbHRlcnMgbm90IHVzZWQgaW4gRGV4aWUuanMgYnV0IGNhbiBiZSB1c2VkIGJ5IDNyZCBwYXJ0IGxpYnJhcmllcyB0byB0ZXN0IGFcbiAgICAgICAgICAgICAgICAvLyBjb2xsZWN0aW9uIGZvciBhIG1hdGNoIHdpdGhvdXQgcXVlcnlpbmcgREIuIFVzZWQgYnkgRGV4aWUuT2JzZXJ2YWJsZS5cbiAgICAgICAgICAgICAgICBhZGRNYXRjaEZpbHRlcih0aGlzLl9jdHgsIGZpbHRlckZ1bmN0aW9uKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGFuZDogZnVuY3Rpb24gKGZpbHRlckZ1bmN0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmlsdGVyKGZpbHRlckZ1bmN0aW9uKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9yOiBmdW5jdGlvbiAoaW5kZXhOYW1lKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBXaGVyZUNsYXVzZSh0aGlzLl9jdHgudGFibGUsIGluZGV4TmFtZSwgdGhpcyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICByZXZlcnNlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3R4LmRpciA9IHRoaXMuX2N0eC5kaXIgPT09IFwicHJldlwiID8gXCJuZXh0XCIgOiBcInByZXZcIjtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb25kaXJlY3Rpb25jaGFuZ2UpIHRoaXMuX29uZGlyZWN0aW9uY2hhbmdlKHRoaXMuX2N0eC5kaXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgZGVzYzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJldmVyc2UoKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGVhY2hLZXk6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG4gICAgICAgICAgICAgICAgY3R4LmtleXNPbmx5ID0gIWN0eC5pc01hdGNoO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKHZhbCwgY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNiKGN1cnNvci5rZXksIGN1cnNvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBlYWNoVW5pcXVlS2V5OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9jdHgudW5pcXVlID0gXCJ1bmlxdWVcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lYWNoS2V5KGNiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGVhY2hQcmltYXJ5S2V5OiBmdW5jdGlvbiAoY2IpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3R4ID0gdGhpcy5fY3R4O1xuICAgICAgICAgICAgICAgIGN0eC5rZXlzT25seSA9ICFjdHguaXNNYXRjaDtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICh2YWwsIGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICBjYihjdXJzb3IucHJpbWFyeUtleSwgY3Vyc29yKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGtleXM6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHg7XG4gICAgICAgICAgICAgICAgY3R4LmtleXNPbmx5ID0gIWN0eC5pc01hdGNoO1xuICAgICAgICAgICAgICAgIHZhciBhID0gW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoaXRlbSwgY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgIGEucHVzaChjdXJzb3Iua2V5KTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGE7XG4gICAgICAgICAgICAgICAgfSkudGhlbihjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBwcmltYXJ5S2V5czogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2N0eDtcbiAgICAgICAgICAgICAgICBpZiAoaGFzR2V0QWxsICYmIGN0eC5kaXIgPT09ICduZXh0JyAmJiBpc1BsYWluS2V5UmFuZ2UoY3R4LCB0cnVlKSAmJiBjdHgubGltaXQgPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNwZWNpYWwgb3B0aW1hdGlvbiBpZiB3ZSBjb3VsZCB1c2UgSURCT2JqZWN0U3RvcmUuZ2V0QWxsS2V5cygpIG9yXG4gICAgICAgICAgICAgICAgICAgIC8vIElEQktleVJhbmdlLmdldEFsbEtleXMoKTpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3JlYWQoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZHhPclN0b3JlID0gZ2V0SW5kZXhPclN0b3JlKGN0eCwgaWRic3RvcmUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlcSA9IGN0eC5saW1pdCA8IEluZmluaXR5ID8gaWR4T3JTdG9yZS5nZXRBbGxLZXlzKGN0eC5yYW5nZSwgY3R4LmxpbWl0KSA6IGlkeE9yU3RvcmUuZ2V0QWxsS2V5cyhjdHgucmFuZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSBldmVudFN1Y2Nlc3NIYW5kbGVyKHJlc29sdmUpO1xuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGNiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3R4LmtleXNPbmx5ID0gIWN0eC5pc01hdGNoO1xuICAgICAgICAgICAgICAgIHZhciBhID0gW107XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoaXRlbSwgY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgIGEucHVzaChjdXJzb3IucHJpbWFyeUtleSk7XG4gICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhO1xuICAgICAgICAgICAgICAgIH0pLnRoZW4oY2IpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgdW5pcXVlS2V5czogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fY3R4LnVuaXF1ZSA9IFwidW5pcXVlXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMua2V5cyhjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBmaXJzdEtleTogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubGltaXQoMSkua2V5cyhmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYVswXTtcbiAgICAgICAgICAgICAgICB9KS50aGVuKGNiKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIGxhc3RLZXk6IGZ1bmN0aW9uIChjYikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLnJldmVyc2UoKS5maXJzdEtleShjYik7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBkaXN0aW5jdDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBjdHggPSB0aGlzLl9jdHgsXG4gICAgICAgICAgICAgICAgICAgIGlkeCA9IGN0eC5pbmRleCAmJiBjdHgudGFibGUuc2NoZW1hLmlkeEJ5TmFtZVtjdHguaW5kZXhdO1xuICAgICAgICAgICAgICAgIGlmICghaWR4IHx8ICFpZHgubXVsdGkpIHJldHVybiB0aGlzOyAvLyBkaXN0aW5jdCgpIG9ubHkgbWFrZXMgZGlmZmVyZW5jaWVzIG9uIG11bHRpRW50cnkgaW5kZXhlcy5cbiAgICAgICAgICAgICAgICB2YXIgc2V0ID0ge307XG4gICAgICAgICAgICAgICAgYWRkRmlsdGVyKHRoaXMuX2N0eCwgZnVuY3Rpb24gKGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgc3RyS2V5ID0gY3Vyc29yLnByaW1hcnlLZXkudG9TdHJpbmcoKTsgLy8gQ29udmVydHMgYW55IERhdGUgdG8gU3RyaW5nLCBTdHJpbmcgdG8gU3RyaW5nLCBOdW1iZXIgdG8gU3RyaW5nIGFuZCBBcnJheSB0byBjb21tYS1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICAgICAgICAgICAgICAgIHZhciBmb3VuZCA9IGhhc093bihzZXQsIHN0cktleSk7XG4gICAgICAgICAgICAgICAgICAgIHNldFtzdHJLZXldID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICFmb3VuZDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIC8vXG4gICAgLy9cbiAgICAvLyBXcml0ZWFibGVDb2xsZWN0aW9uIENsYXNzXG4gICAgLy9cbiAgICAvL1xuICAgIGZ1bmN0aW9uIFdyaXRlYWJsZUNvbGxlY3Rpb24oKSB7XG4gICAgICAgIENvbGxlY3Rpb24uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICBkZXJpdmUoV3JpdGVhYmxlQ29sbGVjdGlvbikuZnJvbShDb2xsZWN0aW9uKS5leHRlbmQoe1xuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFdyaXRlYWJsZUNvbGxlY3Rpb24gUHVibGljIE1ldGhvZHNcbiAgICAgICAgLy9cblxuICAgICAgICBtb2RpZnk6IGZ1bmN0aW9uIChjaGFuZ2VzKSB7XG4gICAgICAgICAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgICAgICAgICAgY3R4ID0gdGhpcy5fY3R4LFxuICAgICAgICAgICAgICAgIGhvb2sgPSBjdHgudGFibGUuaG9vayxcbiAgICAgICAgICAgICAgICB1cGRhdGluZ0hvb2sgPSBob29rLnVwZGF0aW5nLmZpcmUsXG4gICAgICAgICAgICAgICAgZGVsZXRpbmdIb29rID0gaG9vay5kZWxldGluZy5maXJlO1xuXG4gICAgICAgICAgICBmYWtlICYmIHR5cGVvZiBjaGFuZ2VzID09PSAnZnVuY3Rpb24nICYmIGNoYW5nZXMuY2FsbCh7IHZhbHVlOiBjdHgudGFibGUuc2NoZW1hLmluc3RhbmNlVGVtcGxhdGUgfSwgY3R4LnRhYmxlLnNjaGVtYS5pbnN0YW5jZVRlbXBsYXRlKTtcblxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3dyaXRlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QsIGlkYnN0b3JlLCB0cmFucykge1xuICAgICAgICAgICAgICAgIHZhciBtb2RpZnllcjtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNoYW5nZXMgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hhbmdlcyBpcyBhIGZ1bmN0aW9uIHRoYXQgbWF5IHVwZGF0ZSwgYWRkIG9yIGRlbGV0ZSBwcm9wdGVydGllcyBvciBldmVuIHJlcXVpcmUgYSBkZWxldGlvbiB0aGUgb2JqZWN0IGl0c2VsZiAoZGVsZXRlIHRoaXMuaXRlbSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHVwZGF0aW5nSG9vayA9PT0gbm9wICYmIGRlbGV0aW5nSG9vayA9PT0gbm9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb29uZSBjYXJlcyBhYm91dCB3aGF0IGlzIGJlaW5nIGNoYW5nZWQuIEp1c3QgbGV0IHRoZSBtb2RpZmllciBmdW5jdGlvbiBiZSB0aGUgZ2l2ZW4gYXJndW1lbnQgYXMgaXMuXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RpZnllciA9IGNoYW5nZXM7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBQZW9wbGUgd2FudCB0byBrbm93IGV4YWN0bHkgd2hhdCBpcyBiZWluZyBtb2RpZmllZCBvciBkZWxldGVkLlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTGV0IG1vZGlmeWVyIGJlIGEgcHJveHkgZnVuY3Rpb24gdGhhdCBmaW5kcyBvdXQgd2hhdCBjaGFuZ2VzIHRoZSBjYWxsZXIgaXMgYWN0dWFsbHkgZG9pbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGFuZCBjYWxsIHRoZSBob29rcyBhY2NvcmRpbmdseSFcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vZGlmeWVyID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgb3JpZ0l0ZW0gPSBkZWVwQ2xvbmUoaXRlbSk7IC8vIENsb25lIHRoZSBpdGVtIGZpcnN0IHNvIHdlIGNhbiBjb21wYXJlIGxhdGVycy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlcy5jYWxsKHRoaXMsIGl0ZW0sIHRoaXMpID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlOyAvLyBDYWxsIHRoZSByZWFsIG1vZGlmeWVyIGZ1bmN0aW9uIChJZiBpdCByZXR1cm5zIGZhbHNlIGV4cGxpY2l0ZWx5LCBpdCBtZWFucyBpdCBkb250IHdhbnQgdG8gbW9kaWZ5IGFueXRpbmcgb24gdGhpcyBvYmplY3QpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNPd24odGhpcywgXCJ2YWx1ZVwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgcmVhbCBtb2RpZnllciBmdW5jdGlvbiByZXF1ZXN0cyBhIGRlbGV0aW9uIG9mIHRoZSBvYmplY3QuIEluZm9ybSB0aGUgZGVsZXRpbmdIb29rIHRoYXQgYSBkZWxldGlvbiBpcyB0YWtpbmcgcGxhY2UuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0aW5nSG9vay5jYWxsKHRoaXMsIHRoaXMucHJpbUtleSwgaXRlbSwgdHJhbnMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vIGRlbGV0aW9uLiBDaGVjayB3aGF0IHdhcyBjaGFuZ2VkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvYmplY3REaWZmID0gZ2V0T2JqZWN0RGlmZihvcmlnSXRlbSwgdGhpcy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBhZGRpdGlvbmFsQ2hhbmdlcyA9IHVwZGF0aW5nSG9vay5jYWxsKHRoaXMsIG9iamVjdERpZmYsIHRoaXMucHJpbUtleSwgb3JpZ0l0ZW0sIHRyYW5zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFkZGl0aW9uYWxDaGFuZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBIb29rIHdhbnQgdG8gYXBwbHkgYWRkaXRpb25hbCBtb2RpZmljYXRpb25zLiBNYWtlIHN1cmUgdG8gZnVsbGZpbGwgdGhlIHdpbGwgb2YgdGhlIGhvb2suXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtID0gdGhpcy52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGtleXMoYWRkaXRpb25hbENoYW5nZXMpLmZvckVhY2goZnVuY3Rpb24gKGtleVBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRCeUtleVBhdGgoaXRlbSwga2V5UGF0aCwgYWRkaXRpb25hbENoYW5nZXNba2V5UGF0aF0pOyAvLyBBZGRpbmcge2tleVBhdGg6IHVuZGVmaW5lZH0gbWVhbnMgdGhhdCB0aGUga2V5UGF0aCBzaG91bGQgYmUgZGVsZXRlZC4gSGFuZGxlZCBieSBzZXRCeUtleVBhdGhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodXBkYXRpbmdIb29rID09PSBub3ApIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2hhbmdlcyBpcyBhIHNldCBvZiB7a2V5UGF0aDogdmFsdWV9IGFuZCBubyBvbmUgaXMgbGlzdGVuaW5nIHRvIHRoZSB1cGRhdGluZyBob29rLlxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5UGF0aHMgPSBrZXlzKGNoYW5nZXMpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgbnVtS2V5cyA9IGtleVBhdGhzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgbW9kaWZ5ZXIgPSBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFueXRoaW5nTW9kaWZpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtS2V5czsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGtleVBhdGggPSBrZXlQYXRoc1tpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsID0gY2hhbmdlc1trZXlQYXRoXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ2V0QnlLZXlQYXRoKGl0ZW0sIGtleVBhdGgpICE9PSB2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0QnlLZXlQYXRoKGl0ZW0sIGtleVBhdGgsIHZhbCk7IC8vIEFkZGluZyB7a2V5UGF0aDogdW5kZWZpbmVkfSBtZWFucyB0aGF0IHRoZSBrZXlQYXRoIHNob3VsZCBiZSBkZWxldGVkLiBIYW5kbGVkIGJ5IHNldEJ5S2V5UGF0aFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbnl0aGluZ01vZGlmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYW55dGhpbmdNb2RpZmllZDtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBjaGFuZ2VzIGlzIGEgc2V0IG9mIHtrZXlQYXRoOiB2YWx1ZX0gYW5kIHBlb3BsZSBhcmUgbGlzdGVuaW5nIHRvIHRoZSB1cGRhdGluZyBob29rIHNvIHdlIG5lZWQgdG8gY2FsbCBpdCBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gYWxsb3cgaXQgdG8gYWRkIGFkZGl0aW9uYWwgbW9kaWZpY2F0aW9ucyB0byBtYWtlLlxuICAgICAgICAgICAgICAgICAgICB2YXIgb3JpZ0NoYW5nZXMgPSBjaGFuZ2VzO1xuICAgICAgICAgICAgICAgICAgICBjaGFuZ2VzID0gc2hhbGxvd0Nsb25lKG9yaWdDaGFuZ2VzKTsgLy8gTGV0J3Mgd29yayB3aXRoIGEgY2xvbmUgb2YgdGhlIGNoYW5nZXMga2V5UGF0aC92YWx1ZSBzZXQgc28gdGhhdCB3ZSBjYW4gcmVzdG9yZSBpdCBpbiBjYXNlIGEgaG9vayBleHRlbmRzIGl0LlxuICAgICAgICAgICAgICAgICAgICBtb2RpZnllciA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYW55dGhpbmdNb2RpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGFkZGl0aW9uYWxDaGFuZ2VzID0gdXBkYXRpbmdIb29rLmNhbGwodGhpcywgY2hhbmdlcywgdGhpcy5wcmltS2V5LCBkZWVwQ2xvbmUoaXRlbSksIHRyYW5zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRpdGlvbmFsQ2hhbmdlcykgZXh0ZW5kKGNoYW5nZXMsIGFkZGl0aW9uYWxDaGFuZ2VzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXMoY2hhbmdlcykuZm9yRWFjaChmdW5jdGlvbiAoa2V5UGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWwgPSBjaGFuZ2VzW2tleVBhdGhdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChnZXRCeUtleVBhdGgoaXRlbSwga2V5UGF0aCkgIT09IHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRCeUtleVBhdGgoaXRlbSwga2V5UGF0aCwgdmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYW55dGhpbmdNb2RpZmllZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkaXRpb25hbENoYW5nZXMpIGNoYW5nZXMgPSBzaGFsbG93Q2xvbmUob3JpZ0NoYW5nZXMpOyAvLyBSZXN0b3JlIG9yaWdpbmFsIGNoYW5nZXMgZm9yIG5leHQgaXRlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYW55dGhpbmdNb2RpZmllZDtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICAgICAgICAgIHZhciBzdWNjZXNzQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgIHZhciBpdGVyYXRpb25Db21wbGV0ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHZhciBmYWlsdXJlcyA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBmYWlsS2V5cyA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBjdXJyZW50S2V5ID0gbnVsbDtcblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG1vZGlmeUl0ZW0oaXRlbSwgY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRLZXkgPSBjdXJzb3IucHJpbWFyeUtleTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRoaXNDb250ZXh0ID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpbUtleTogY3Vyc29yLnByaW1hcnlLZXksXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uc3VjY2VzczogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uZXJyb3I6IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBvbmVycm9yKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWx1cmVzLnB1c2goZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsS2V5cy5wdXNoKHRoaXNDb250ZXh0LnByaW1LZXkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGaW5pc2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7IC8vIENhdGNoIHRoZXNlIGVycm9ycyBhbmQgbGV0IGEgZmluYWwgcmVqZWN0aW9uIGRlY2lkZSB3aGV0aGVyIG9yIG5vdCB0byBhYm9ydCBlbnRpcmUgdHJhbnNhY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RpZnllci5jYWxsKHRoaXNDb250ZXh0LCBpdGVtLCB0aGlzQ29udGV4dCkgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBhIGNhbGxiYWNrIGV4cGxpY2l0ZWx5IHJldHVybnMgZmFsc2UsIGRvIG5vdCBwZXJmb3JtIHRoZSB1cGRhdGUhXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYkRlbGV0ZSA9ICFoYXNPd24odGhpc0NvbnRleHQsIFwidmFsdWVcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICArK2NvdW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5Q2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZXEgPSBiRGVsZXRlID8gY3Vyc29yLmRlbGV0ZSgpIDogY3Vyc29yLnVwZGF0ZSh0aGlzQ29udGV4dC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxLl9ob29rQ3R4ID0gdGhpc0NvbnRleHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uZXJyb3IgPSBob29rZWRFdmVudFJlamVjdEhhbmRsZXIob25lcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IGhvb2tlZEV2ZW50U3VjY2Vzc0hhbmRsZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArK3N1Y2Nlc3NDb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tGaW5pc2hlZCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSwgb25lcnJvcik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpc0NvbnRleHQub25zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIb29rIHdpbGwgZXhwZWN0IGVpdGhlciBvbmVycm9yIG9yIG9uc3VjY2VzcyB0byBhbHdheXMgYmUgY2FsbGVkIVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc0NvbnRleHQub25zdWNjZXNzKHRoaXNDb250ZXh0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGRvUmVqZWN0KGUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhaWx1cmVzLnB1c2goZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmYWlsS2V5cy5wdXNoKGN1cnJlbnRLZXkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE1vZGlmeUVycm9yKFwiRXJyb3IgbW9kaWZ5aW5nIG9uZSBvciBtb3JlIG9iamVjdHNcIiwgZmFpbHVyZXMsIHN1Y2Nlc3NDb3VudCwgZmFpbEtleXMpKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0ZpbmlzaGVkKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlcmF0aW9uQ29tcGxldGUgJiYgc3VjY2Vzc0NvdW50ICsgZmFpbHVyZXMubGVuZ3RoID09PSBjb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZhaWx1cmVzLmxlbmd0aCA+IDApIGRvUmVqZWN0KCk7ZWxzZSByZXNvbHZlKHN1Y2Nlc3NDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VsZi5jbG9uZSgpLnJhdygpLl9pdGVyYXRlKG1vZGlmeUl0ZW0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlcmF0aW9uQ29tcGxldGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjaGVja0ZpbmlzaGVkKCk7XG4gICAgICAgICAgICAgICAgfSwgZG9SZWplY3QsIGlkYnN0b3JlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9LFxuXG4gICAgICAgICdkZWxldGUnOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgX3RoaXM0ID0gdGhpcztcblxuICAgICAgICAgICAgdmFyIGN0eCA9IHRoaXMuX2N0eCxcbiAgICAgICAgICAgICAgICByYW5nZSA9IGN0eC5yYW5nZSxcbiAgICAgICAgICAgICAgICBkZWxldGluZ0hvb2sgPSBjdHgudGFibGUuaG9vay5kZWxldGluZy5maXJlLFxuICAgICAgICAgICAgICAgIGhhc0RlbGV0ZUhvb2sgPSBkZWxldGluZ0hvb2sgIT09IG5vcDtcbiAgICAgICAgICAgIGlmICghaGFzRGVsZXRlSG9vayAmJiBpc1BsYWluS2V5UmFuZ2UoY3R4KSAmJiAoY3R4LmlzUHJpbUtleSAmJiAhaGFuZ3NPbkRlbGV0ZUxhcmdlS2V5UmFuZ2UgfHwgIXJhbmdlKSkgLy8gaWYgbm8gcmFuZ2UsIHdlJ2xsIHVzZSBjbGVhcigpLlxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gTWF5IHVzZSBJREJPYmplY3RTdG9yZS5kZWxldGUoSURCS2V5UmFuZ2UpIGluIHRoaXMgY2FzZSAoSXNzdWUgIzIwOClcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGNocm9taXVtLCB0aGlzIGlzIHRoZSB3YXkgbW9zdCBvcHRpbWl6ZWQgdmVyc2lvbi5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIElFL0VkZ2UsIHRoaXMgY291bGQgaGFuZyB0aGUgaW5kZXhlZERCIGVuZ2luZSBhbmQgbWFrZSBvcGVyYXRpbmcgc3lzdGVtIGluc3RhYmxlXG4gICAgICAgICAgICAgICAgICAgIC8vIChodHRwczovL2dpc3QuZ2l0aHViLmNvbS9kZmFobGFuZGVyLzVhMzkzMjhmMDI5ZGUxODIyMmNmMjEyNWQ1NmMzOGY3KVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE91ciBBUEkgY29udHJhY3QgaXMgdG8gcmV0dXJuIGEgY291bnQgb2YgZGVsZXRlZCBpdGVtcywgc28gd2UgaGF2ZSB0byBjb3VudCgpIGJlZm9yZSBkZWxldGUoKS5cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbmVycm9yID0gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY291bnRSZXEgPSByYW5nZSA/IGlkYnN0b3JlLmNvdW50KHJhbmdlKSA6IGlkYnN0b3JlLmNvdW50KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudFJlcS5vbmVycm9yID0gb25lcnJvcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50UmVxLm9uc3VjY2VzcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY291bnQgPSBjb3VudFJlcS5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5Q2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZGVsUmVxID0gcmFuZ2UgPyBpZGJzdG9yZS5kZWxldGUocmFuZ2UpIDogaWRic3RvcmUuY2xlYXIoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsUmVxLm9uZXJyb3IgPSBvbmVycm9yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxSZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoY291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZWZhdWx0IHZlcnNpb24gdG8gdXNlIHdoZW4gY29sbGVjdGlvbiBpcyBub3QgYSB2YW5pbGxhIElEQktleVJhbmdlIG9uIHRoZSBwcmltYXJ5IGtleS5cbiAgICAgICAgICAgIC8vIERpdmlkZSBpbnRvIGNodW5rcyB0byBub3Qgc3RhcnZlIFJBTS5cbiAgICAgICAgICAgIC8vIElmIGhhcyBkZWxldGUgaG9vaywgd2Ugd2lsbCBoYXZlIHRvIGNvbGxlY3Qgbm90IGp1c3Qga2V5cyBidXQgYWxzbyBvYmplY3RzLCBzbyBpdCB3aWxsIHVzZVxuICAgICAgICAgICAgLy8gbW9yZSBtZW1vcnkgYW5kIG5lZWQgbG93ZXIgY2h1bmsgc2l6ZS5cbiAgICAgICAgICAgIHZhciBDSFVOS1NJWkUgPSBoYXNEZWxldGVIb29rID8gMjAwMCA6IDEwMDAwO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fd3JpdGUoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCwgaWRic3RvcmUsIHRyYW5zKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRvdGFsQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgIC8vIENsb25lIGNvbGxlY3Rpb24gYW5kIGNoYW5nZSBpdHMgdGFibGUgYW5kIHNldCBhIGxpbWl0IG9mIENIVU5LU0laRSBvbiB0aGUgY2xvbmVkIENvbGxlY3Rpb24gaW5zdGFuY2UuXG4gICAgICAgICAgICAgICAgdmFyIGNvbGxlY3Rpb24gPSBfdGhpczQuY2xvbmUoe1xuICAgICAgICAgICAgICAgICAgICBrZXlzT25seTogIWN0eC5pc01hdGNoICYmICFoYXNEZWxldGVIb29rIH0pIC8vIGxvYWQganVzdCBrZXlzICh1bmxlc3MgZmlsdGVyKCkgb3IgYW5kKCkgb3IgZGVsZXRlSG9vayBoYXMgc3Vic2NyaWJlcnMpXG4gICAgICAgICAgICAgICAgLmRpc3RpbmN0KCkgLy8gSW4gY2FzZSBtdWx0aUVudHJ5IGlzIHVzZWQsIG5ldmVyIGRlbGV0ZSBzYW1lIGtleSB0d2ljZSBiZWNhdXNlIHJlc3VsdGluZyBjb3VudFxuICAgICAgICAgICAgICAgIC8vIHdvdWxkIGJlY29tZSBsYXJnZXIgdGhhbiBhY3R1YWwgZGVsZXRlIGNvdW50LlxuICAgICAgICAgICAgICAgIC5saW1pdChDSFVOS1NJWkUpLnJhdygpOyAvLyBEb24ndCBmaWx0ZXIgdGhyb3VnaCByZWFkaW5nLWhvb2tzIChsaWtlIG1hcHBlZCBjbGFzc2VzIGV0YylcblxuICAgICAgICAgICAgICAgIHZhciBrZXlzT3JUdXBsZXMgPSBbXTtcblxuICAgICAgICAgICAgICAgIC8vIFdlJ3JlIGdvbm5hIGRvIHRoaW5ncyBvbiBhcyBtYW55IGNodW5rcyB0aGF0IGFyZSBuZWVkZWQuXG4gICAgICAgICAgICAgICAgLy8gVXNlIHJlY3Vyc2lvbiBvZiBuZXh0Q2h1bmsgZnVuY3Rpb246XG4gICAgICAgICAgICAgICAgdmFyIG5leHRDaHVuayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb24uZWFjaChoYXNEZWxldGVIb29rID8gZnVuY3Rpb24gKHZhbCwgY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTb21lYm9keSBzdWJzY3JpYmVzIHRvIGhvb2soJ2RlbGV0aW5nJykuIENvbGxlY3QgYWxsIHByaW1hcnkga2V5cyBhbmQgdGhlaXIgdmFsdWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc28gdGhhdCB0aGUgaG9vayBjYW4gYmUgY2FsbGVkIHdpdGggaXRzIHZhbHVlcyBpbiBidWxrRGVsZXRlKCkuXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXlzT3JUdXBsZXMucHVzaChbY3Vyc29yLnByaW1hcnlLZXksIGN1cnNvci52YWx1ZV0pO1xuICAgICAgICAgICAgICAgICAgICB9IDogZnVuY3Rpb24gKHZhbCwgY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBObyBvbmUgc3Vic2NyaWJlcyB0byBob29rKCdkZWxldGluZycpLiBDb2xsZWN0IG9ubHkgcHJpbWFyeSBrZXlzOlxuICAgICAgICAgICAgICAgICAgICAgICAga2V5c09yVHVwbGVzLnB1c2goY3Vyc29yLnByaW1hcnlLZXkpO1xuICAgICAgICAgICAgICAgICAgICB9KS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENocm9taXVtIGRlbGV0ZXMgZmFzdGVyIHdoZW4gZG9pbmcgaXQgaW4gc29ydCBvcmRlci5cbiAgICAgICAgICAgICAgICAgICAgICAgIGhhc0RlbGV0ZUhvb2sgPyBrZXlzT3JUdXBsZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhc2NlbmRpbmcoYVswXSwgYlswXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSA6IGtleXNPclR1cGxlcy5zb3J0KGFzY2VuZGluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnVsa0RlbGV0ZShpZGJzdG9yZSwgdHJhbnMsIGtleXNPclR1cGxlcywgaGFzRGVsZXRlSG9vaywgZGVsZXRpbmdIb29rKTtcbiAgICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY291bnQgPSBrZXlzT3JUdXBsZXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxDb3VudCArPSBjb3VudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXNPclR1cGxlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50IDwgQ0hVTktTSVpFID8gdG90YWxDb3VudCA6IG5leHRDaHVuaygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShuZXh0Q2h1bmsoKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy9cbiAgICAvL1xuICAgIC8vXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBIZWxwIGZ1bmN0aW9ucyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvL1xuICAgIC8vXG4gICAgLy9cblxuICAgIGZ1bmN0aW9uIGxvd2VyVmVyc2lvbkZpcnN0KGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGEuX2NmZy52ZXJzaW9uIC0gYi5fY2ZnLnZlcnNpb247XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc2V0QXBpT25QbGFjZShvYmpzLCB0YWJsZU5hbWVzLCBtb2RlLCBkYnNjaGVtYSkge1xuICAgICAgICB0YWJsZU5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHRhYmxlTmFtZSkge1xuICAgICAgICAgICAgdmFyIHRhYmxlSW5zdGFuY2UgPSBkYi5fdGFibGVGYWN0b3J5KG1vZGUsIGRic2NoZW1hW3RhYmxlTmFtZV0pO1xuICAgICAgICAgICAgb2Jqcy5mb3JFYWNoKGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgICAgICAgICB0YWJsZU5hbWUgaW4gb2JqIHx8IChvYmpbdGFibGVOYW1lXSA9IHRhYmxlSW5zdGFuY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbW92ZVRhYmxlc0FwaShvYmpzKSB7XG4gICAgICAgIG9ianMuZm9yRWFjaChmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9ialtrZXldIGluc3RhbmNlb2YgVGFibGUpIGRlbGV0ZSBvYmpba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXRlcmF0ZShyZXEsIGZpbHRlciwgZm4sIHJlc29sdmUsIHJlamVjdCwgdmFsdWVNYXBwZXIpIHtcblxuICAgICAgICAvLyBBcHBseSB2YWx1ZU1hcHBlciAoaG9vaygncmVhZGluZycpIG9yIG1hcHBwZWQgY2xhc3MpXG4gICAgICAgIHZhciBtYXBwZWRGbiA9IHZhbHVlTWFwcGVyID8gZnVuY3Rpb24gKHgsIGMsIGEpIHtcbiAgICAgICAgICAgIHJldHVybiBmbih2YWx1ZU1hcHBlcih4KSwgYywgYSk7XG4gICAgICAgIH0gOiBmbjtcbiAgICAgICAgLy8gV3JhcCBmbiB3aXRoIFBTRCBhbmQgbWljcm90aWNrIHN0dWZmIGZyb20gUHJvbWlzZS5cbiAgICAgICAgdmFyIHdyYXBwZWRGbiA9IHdyYXAobWFwcGVkRm4sIHJlamVjdCk7XG5cbiAgICAgICAgaWYgKCFyZXEub25lcnJvcikgcmVxLm9uZXJyb3IgPSBldmVudFJlamVjdEhhbmRsZXIocmVqZWN0KTtcbiAgICAgICAgaWYgKGZpbHRlcikge1xuICAgICAgICAgICAgcmVxLm9uc3VjY2VzcyA9IHRyeWNhdGNoZXIoZnVuY3Rpb24gZmlsdGVyX3JlY29yZCgpIHtcbiAgICAgICAgICAgICAgICB2YXIgY3Vyc29yID0gcmVxLnJlc3VsdDtcbiAgICAgICAgICAgICAgICBpZiAoY3Vyc29yKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3Vyc29yLmNvbnRpbnVlKCk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWx0ZXIoY3Vyc29yLCBmdW5jdGlvbiAoYWR2YW5jZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBhZHZhbmNlcjtcbiAgICAgICAgICAgICAgICAgICAgfSwgcmVzb2x2ZSwgcmVqZWN0KSkgd3JhcHBlZEZuKGN1cnNvci52YWx1ZSwgY3Vyc29yLCBmdW5jdGlvbiAoYWR2YW5jZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGMgPSBhZHZhbmNlcjtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIGMoKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcS5vbnN1Y2Nlc3MgPSB0cnljYXRjaGVyKGZ1bmN0aW9uIGZpbHRlcl9yZWNvcmQoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGN1cnNvciA9IHJlcS5yZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKGN1cnNvcikge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnNvci5jb250aW51ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB3cmFwcGVkRm4oY3Vyc29yLnZhbHVlLCBjdXJzb3IsIGZ1bmN0aW9uIChhZHZhbmNlcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IGFkdmFuY2VyO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgYygpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcGFyc2VJbmRleFN5bnRheChpbmRleGVzKSB7XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImluZGV4ZXNcIiB0eXBlPVwiU3RyaW5nXCI+PC9wYXJhbT5cbiAgICAgICAgLy8vIDxyZXR1cm5zIHR5cGU9XCJBcnJheVwiIGVsZW1lbnRUeXBlPVwiSW5kZXhTcGVjXCI+PC9yZXR1cm5zPlxuICAgICAgICB2YXIgcnYgPSBbXTtcbiAgICAgICAgaW5kZXhlcy5zcGxpdCgnLCcpLmZvckVhY2goZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgICAgICBpbmRleCA9IGluZGV4LnRyaW0oKTtcbiAgICAgICAgICAgIHZhciBuYW1lID0gaW5kZXgucmVwbGFjZSgvKFsmKl18XFwrXFwrKS9nLCBcIlwiKTsgLy8gUmVtb3ZlIFwiJlwiLCBcIisrXCIgYW5kIFwiKlwiXG4gICAgICAgICAgICAvLyBMZXQga2V5UGF0aCBvZiBcIlthK2JdXCIgYmUgW1wiYVwiLFwiYlwiXTpcbiAgICAgICAgICAgIHZhciBrZXlQYXRoID0gL15cXFsvLnRlc3QobmFtZSkgPyBuYW1lLm1hdGNoKC9eXFxbKC4qKVxcXSQvKVsxXS5zcGxpdCgnKycpIDogbmFtZTtcblxuICAgICAgICAgICAgcnYucHVzaChuZXcgSW5kZXhTcGVjKG5hbWUsIGtleVBhdGggfHwgbnVsbCwgL1xcJi8udGVzdChpbmRleCksIC9cXCovLnRlc3QoaW5kZXgpLCAvXFwrXFwrLy50ZXN0KGluZGV4KSwgaXNBcnJheShrZXlQYXRoKSwgL1xcLi8udGVzdChpbmRleCkpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBydjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbXAoa2V5MSwga2V5Mikge1xuICAgICAgICByZXR1cm4gaW5kZXhlZERCLmNtcChrZXkxLCBrZXkyKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtaW4oYSwgYikge1xuICAgICAgICByZXR1cm4gY21wKGEsIGIpIDwgMCA/IGEgOiBiO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1heChhLCBiKSB7XG4gICAgICAgIHJldHVybiBjbXAoYSwgYikgPiAwID8gYSA6IGI7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGluZGV4ZWREQi5jbXAoYSwgYik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVzY2VuZGluZyhhLCBiKSB7XG4gICAgICAgIHJldHVybiBpbmRleGVkREIuY21wKGIsIGEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNpbXBsZUNvbXBhcmUoYSwgYikge1xuICAgICAgICByZXR1cm4gYSA8IGIgPyAtMSA6IGEgPT09IGIgPyAwIDogMTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzaW1wbGVDb21wYXJlUmV2ZXJzZShhLCBiKSB7XG4gICAgICAgIHJldHVybiBhID4gYiA/IC0xIDogYSA9PT0gYiA/IDAgOiAxO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbWJpbmUoZmlsdGVyMSwgZmlsdGVyMikge1xuICAgICAgICByZXR1cm4gZmlsdGVyMSA/IGZpbHRlcjIgPyBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmlsdGVyMS5hcHBseSh0aGlzLCBhcmd1bWVudHMpICYmIGZpbHRlcjIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSA6IGZpbHRlcjEgOiBmaWx0ZXIyO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlYWRHbG9iYWxTY2hlbWEoKSB7XG4gICAgICAgIGRiLnZlcm5vID0gaWRiZGIudmVyc2lvbiAvIDEwO1xuICAgICAgICBkYi5fZGJTY2hlbWEgPSBnbG9iYWxTY2hlbWEgPSB7fTtcbiAgICAgICAgZGJTdG9yZU5hbWVzID0gc2xpY2UoaWRiZGIub2JqZWN0U3RvcmVOYW1lcywgMCk7XG4gICAgICAgIGlmIChkYlN0b3JlTmFtZXMubGVuZ3RoID09PSAwKSByZXR1cm47IC8vIERhdGFiYXNlIGNvbnRhaW5zIG5vIHN0b3Jlcy5cbiAgICAgICAgdmFyIHRyYW5zID0gaWRiZGIudHJhbnNhY3Rpb24oc2FmYXJpTXVsdGlTdG9yZUZpeChkYlN0b3JlTmFtZXMpLCAncmVhZG9ubHknKTtcbiAgICAgICAgZGJTdG9yZU5hbWVzLmZvckVhY2goZnVuY3Rpb24gKHN0b3JlTmFtZSkge1xuICAgICAgICAgICAgdmFyIHN0b3JlID0gdHJhbnMub2JqZWN0U3RvcmUoc3RvcmVOYW1lKSxcbiAgICAgICAgICAgICAgICBrZXlQYXRoID0gc3RvcmUua2V5UGF0aCxcbiAgICAgICAgICAgICAgICBkb3R0ZWQgPSBrZXlQYXRoICYmIHR5cGVvZiBrZXlQYXRoID09PSAnc3RyaW5nJyAmJiBrZXlQYXRoLmluZGV4T2YoJy4nKSAhPT0gLTE7XG4gICAgICAgICAgICB2YXIgcHJpbUtleSA9IG5ldyBJbmRleFNwZWMoa2V5UGF0aCwga2V5UGF0aCB8fCBcIlwiLCBmYWxzZSwgZmFsc2UsICEhc3RvcmUuYXV0b0luY3JlbWVudCwga2V5UGF0aCAmJiB0eXBlb2Yga2V5UGF0aCAhPT0gJ3N0cmluZycsIGRvdHRlZCk7XG4gICAgICAgICAgICB2YXIgaW5kZXhlcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzdG9yZS5pbmRleE5hbWVzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlkYmluZGV4ID0gc3RvcmUuaW5kZXgoc3RvcmUuaW5kZXhOYW1lc1tqXSk7XG4gICAgICAgICAgICAgICAga2V5UGF0aCA9IGlkYmluZGV4LmtleVBhdGg7XG4gICAgICAgICAgICAgICAgZG90dGVkID0ga2V5UGF0aCAmJiB0eXBlb2Yga2V5UGF0aCA9PT0gJ3N0cmluZycgJiYga2V5UGF0aC5pbmRleE9mKCcuJykgIT09IC0xO1xuICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IG5ldyBJbmRleFNwZWMoaWRiaW5kZXgubmFtZSwga2V5UGF0aCwgISFpZGJpbmRleC51bmlxdWUsICEhaWRiaW5kZXgubXVsdGlFbnRyeSwgZmFsc2UsIGtleVBhdGggJiYgdHlwZW9mIGtleVBhdGggIT09ICdzdHJpbmcnLCBkb3R0ZWQpO1xuICAgICAgICAgICAgICAgIGluZGV4ZXMucHVzaChpbmRleCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBnbG9iYWxTY2hlbWFbc3RvcmVOYW1lXSA9IG5ldyBUYWJsZVNjaGVtYShzdG9yZU5hbWUsIHByaW1LZXksIGluZGV4ZXMsIHt9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHNldEFwaU9uUGxhY2UoW2FsbFRhYmxlcywgVHJhbnNhY3Rpb24ucHJvdG90eXBlXSwga2V5cyhnbG9iYWxTY2hlbWEpLCBSRUFEV1JJVEUsIGdsb2JhbFNjaGVtYSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYWRqdXN0VG9FeGlzdGluZ0luZGV4TmFtZXMoc2NoZW1hLCBpZGJ0cmFucykge1xuICAgICAgICAvLy8gPHN1bW1hcnk+XG4gICAgICAgIC8vLyBJc3N1ZSAjMzAgUHJvYmxlbSB3aXRoIGV4aXN0aW5nIGRiIC0gYWRqdXN0IHRvIGV4aXN0aW5nIGluZGV4IG5hbWVzIHdoZW4gbWlncmF0aW5nIGZyb20gbm9uLWRleGllIGRiXG4gICAgICAgIC8vLyA8L3N1bW1hcnk+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cInNjaGVtYVwiIHR5cGU9XCJPYmplY3RcIj5NYXAgYmV0d2VlbiBuYW1lIGFuZCBUYWJsZVNjaGVtYTwvcGFyYW0+XG4gICAgICAgIC8vLyA8cGFyYW0gbmFtZT1cImlkYnRyYW5zXCIgdHlwZT1cIklEQlRyYW5zYWN0aW9uXCI+PC9wYXJhbT5cbiAgICAgICAgdmFyIHN0b3JlTmFtZXMgPSBpZGJ0cmFucy5kYi5vYmplY3RTdG9yZU5hbWVzO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0b3JlTmFtZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgIHZhciBzdG9yZU5hbWUgPSBzdG9yZU5hbWVzW2ldO1xuICAgICAgICAgICAgdmFyIHN0b3JlID0gaWRidHJhbnMub2JqZWN0U3RvcmUoc3RvcmVOYW1lKTtcbiAgICAgICAgICAgIGhhc0dldEFsbCA9ICdnZXRBbGwnIGluIHN0b3JlO1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBzdG9yZS5pbmRleE5hbWVzLmxlbmd0aDsgKytqKSB7XG4gICAgICAgICAgICAgICAgdmFyIGluZGV4TmFtZSA9IHN0b3JlLmluZGV4TmFtZXNbal07XG4gICAgICAgICAgICAgICAgdmFyIGtleVBhdGggPSBzdG9yZS5pbmRleChpbmRleE5hbWUpLmtleVBhdGg7XG4gICAgICAgICAgICAgICAgdmFyIGRleGllTmFtZSA9IHR5cGVvZiBrZXlQYXRoID09PSAnc3RyaW5nJyA/IGtleVBhdGggOiBcIltcIiArIHNsaWNlKGtleVBhdGgpLmpvaW4oJysnKSArIFwiXVwiO1xuICAgICAgICAgICAgICAgIGlmIChzY2hlbWFbc3RvcmVOYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgaW5kZXhTcGVjID0gc2NoZW1hW3N0b3JlTmFtZV0uaWR4QnlOYW1lW2RleGllTmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleFNwZWMpIGluZGV4U3BlYy5uYW1lID0gaW5kZXhOYW1lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGZpcmVPbkJsb2NrZWQoZXYpIHtcbiAgICAgICAgZGIub24oXCJibG9ja2VkXCIpLmZpcmUoZXYpO1xuICAgICAgICAvLyBXb3JrYXJvdW5kIChub3QgZnVsbHkqKSBmb3IgbWlzc2luZyBcInZlcnNpb25jaGFuZ2VcIiBldmVudCBpbiBJRSxFZGdlIGFuZCBTYWZhcmk6XG4gICAgICAgIGNvbm5lY3Rpb25zLmZpbHRlcihmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgcmV0dXJuIGMubmFtZSA9PT0gZGIubmFtZSAmJiBjICE9PSBkYiAmJiAhYy5fdmNGaXJlZDtcbiAgICAgICAgfSkubWFwKGZ1bmN0aW9uIChjKSB7XG4gICAgICAgICAgICByZXR1cm4gYy5vbihcInZlcnNpb25jaGFuZ2VcIikuZmlyZShldik7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGV4dGVuZCh0aGlzLCB7XG4gICAgICAgIENvbGxlY3Rpb246IENvbGxlY3Rpb24sXG4gICAgICAgIFRhYmxlOiBUYWJsZSxcbiAgICAgICAgVHJhbnNhY3Rpb246IFRyYW5zYWN0aW9uLFxuICAgICAgICBWZXJzaW9uOiBWZXJzaW9uLFxuICAgICAgICBXaGVyZUNsYXVzZTogV2hlcmVDbGF1c2UsXG4gICAgICAgIFdyaXRlYWJsZUNvbGxlY3Rpb246IFdyaXRlYWJsZUNvbGxlY3Rpb24sXG4gICAgICAgIFdyaXRlYWJsZVRhYmxlOiBXcml0ZWFibGVUYWJsZVxuICAgIH0pO1xuXG4gICAgaW5pdCgpO1xuXG4gICAgYWRkb25zLmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIGZuKGRiKTtcbiAgICB9KTtcbn1cblxudmFyIGZha2VBdXRvQ29tcGxldGUgPSBmdW5jdGlvbiAoKSB7fTsgLy8gV2lsbCBuZXZlciBiZSBjaGFuZ2VkLiBXZSBqdXN0IGZha2UgZm9yIHRoZSBJREUgdGhhdCB3ZSBjaGFuZ2UgaXQgKHNlZSBkb0Zha2VBdXRvQ29tcGxldGUoKSlcbnZhciBmYWtlID0gZmFsc2U7IC8vIFdpbGwgbmV2ZXIgYmUgY2hhbmdlZC4gV2UganVzdCBmYWtlIGZvciB0aGUgSURFIHRoYXQgd2UgY2hhbmdlIGl0IChzZWUgZG9GYWtlQXV0b0NvbXBsZXRlKCkpXG5cbmZ1bmN0aW9uIHBhcnNlVHlwZSh0eXBlKSB7XG4gICAgaWYgKHR5cGVvZiB0eXBlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgdHlwZSgpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheSh0eXBlKSkge1xuICAgICAgICByZXR1cm4gW3BhcnNlVHlwZSh0eXBlWzBdKV07XG4gICAgfSBlbHNlIGlmICh0eXBlICYmIHR5cGVvZiB0eXBlID09PSAnb2JqZWN0Jykge1xuICAgICAgICB2YXIgcnYgPSB7fTtcbiAgICAgICAgYXBwbHlTdHJ1Y3R1cmUocnYsIHR5cGUpO1xuICAgICAgICByZXR1cm4gcnY7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHR5cGU7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhcHBseVN0cnVjdHVyZShvYmosIHN0cnVjdHVyZSkge1xuICAgIGtleXMoc3RydWN0dXJlKS5mb3JFYWNoKGZ1bmN0aW9uIChtZW1iZXIpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcGFyc2VUeXBlKHN0cnVjdHVyZVttZW1iZXJdKTtcbiAgICAgICAgb2JqW21lbWJlcl0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBldmVudFN1Y2Nlc3NIYW5kbGVyKGRvbmUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgIGRvbmUoZXYudGFyZ2V0LnJlc3VsdCk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gaG9va2VkRXZlbnRTdWNjZXNzSGFuZGxlcihyZXNvbHZlKSB7XG4gICAgLy8gd3JhcCgpIGlzIG5lZWRlZCB3aGVuIGNhbGxpbmcgaG9va3MgYmVjYXVzZSB0aGUgcmFyZSBzY2VuYXJpbyBvZjpcbiAgICAvLyAgKiBob29rIGRvZXMgYSBkYiBvcGVyYXRpb24gdGhhdCBmYWlscyBpbW1lZGlhdGVseSAoSURCIHRocm93cyBleGNlcHRpb24pXG4gICAgLy8gICAgRm9yIGNhbGxpbmcgZGIgb3BlcmF0aW9ucyBvbiBjb3JyZWN0IHRyYW5zYWN0aW9uLCB3cmFwIG1ha2VzIHN1cmUgdG8gc2V0IFBTRCBjb3JyZWN0bHkuXG4gICAgLy8gICAgd3JhcCgpIHdpbGwgYWxzbyBleGVjdXRlIGluIGEgdmlydHVhbCB0aWNrLlxuICAgIC8vICAqIElmIG5vdCB3cmFwcGVkIGluIGEgdmlydHVhbCB0aWNrLCBkaXJlY3QgZXhjZXB0aW9uIHdpbGwgbGF1bmNoIGEgbmV3IHBoeXNpY2FsIHRpY2suXG4gICAgLy8gICogSWYgdGhpcyB3YXMgdGhlIGxhc3QgZXZlbnQgaW4gdGhlIGJ1bGssIHRoZSBwcm9taXNlIHdpbGwgcmVzb2x2ZSBhZnRlciBhIHBoeXNpY2FsIHRpY2tcbiAgICAvLyAgICBhbmQgdGhlIHRyYW5zYWN0aW9uIHdpbGwgaGF2ZSBjb21taXR0ZWQgYWxyZWFkeS5cbiAgICAvLyBJZiBubyBob29rLCB0aGUgdmlydHVhbCB0aWNrIHdpbGwgYmUgZXhlY3V0ZWQgaW4gdGhlIHJlamVjdCgpL3Jlc29sdmUgb2YgdGhlIGZpbmFsIHByb21pc2UsXG4gICAgLy8gYmVjYXVzZSBpdCBpcyBhbHdheXMgbWFya2VkIHdpdGggX2xpYiA9IHRydWUgd2hlbiBjcmVhdGVkIHVzaW5nIFRyYW5zYWN0aW9uLl9wcm9taXNlKCkuXG4gICAgcmV0dXJuIHdyYXAoZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHZhciByZXEgPSBldmVudC50YXJnZXQsXG4gICAgICAgICAgICByZXN1bHQgPSByZXEucmVzdWx0LFxuICAgICAgICAgICAgY3R4ID0gcmVxLl9ob29rQ3R4LFxuICAgICAgICAgICAgLy8gQ29udGFpbnMgdGhlIGhvb2sgZXJyb3IgaGFuZGxlci4gUHV0IGhlcmUgaW5zdGVhZCBvZiBjbG9zdXJlIHRvIGJvb3N0IHBlcmZvcm1hbmNlLlxuICAgICAgICBob29rU3VjY2Vzc0hhbmRsZXIgPSBjdHggJiYgY3R4Lm9uc3VjY2VzcztcbiAgICAgICAgaG9va1N1Y2Nlc3NIYW5kbGVyICYmIGhvb2tTdWNjZXNzSGFuZGxlcihyZXN1bHQpO1xuICAgICAgICByZXNvbHZlICYmIHJlc29sdmUocmVzdWx0KTtcbiAgICB9LCByZXNvbHZlKTtcbn1cblxuZnVuY3Rpb24gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcHJldmVudERlZmF1bHQoZXZlbnQpO1xuICAgICAgICByZWplY3QoZXZlbnQudGFyZ2V0LmVycm9yKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGhvb2tlZEV2ZW50UmVqZWN0SGFuZGxlcihyZWplY3QpIHtcbiAgICByZXR1cm4gd3JhcChmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgLy8gU2VlIGNvbW1lbnQgb24gaG9va2VkRXZlbnRTdWNjZXNzSGFuZGxlcigpIHdoeSB3cmFwKCkgaXMgbmVlZGVkIG9ubHkgd2hlbiBzdXBwb3J0aW5nIGhvb2tzLlxuXG4gICAgICAgIHZhciByZXEgPSBldmVudC50YXJnZXQsXG4gICAgICAgICAgICBlcnIgPSByZXEuZXJyb3IsXG4gICAgICAgICAgICBjdHggPSByZXEuX2hvb2tDdHgsXG4gICAgICAgICAgICAvLyBDb250YWlucyB0aGUgaG9vayBlcnJvciBoYW5kbGVyLiBQdXQgaGVyZSBpbnN0ZWFkIG9mIGNsb3N1cmUgdG8gYm9vc3QgcGVyZm9ybWFuY2UuXG4gICAgICAgIGhvb2tFcnJvckhhbmRsZXIgPSBjdHggJiYgY3R4Lm9uZXJyb3I7XG4gICAgICAgIGhvb2tFcnJvckhhbmRsZXIgJiYgaG9va0Vycm9ySGFuZGxlcihlcnIpO1xuICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHByZXZlbnREZWZhdWx0KGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LnN0b3BQcm9wYWdhdGlvbikgLy8gSW5kZXhlZERCU2hpbSBkb2VzbnQgc3VwcG9ydCB0aGlzIG9uIFNhZmFyaSA4IGFuZCBiZWxvdy5cbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaWYgKGV2ZW50LnByZXZlbnREZWZhdWx0KSAvLyBJbmRleGVkREJTaGltIGRvZXNudCBzdXBwb3J0IHRoaXMgb24gU2FmYXJpIDggYW5kIGJlbG93LlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xufVxuXG5mdW5jdGlvbiBnbG9iYWxEYXRhYmFzZUxpc3QoY2IpIHtcbiAgICB2YXIgdmFsLFxuICAgICAgICBsb2NhbFN0b3JhZ2UgPSBEZXhpZS5kZXBlbmRlbmNpZXMubG9jYWxTdG9yYWdlO1xuICAgIGlmICghbG9jYWxTdG9yYWdlKSByZXR1cm4gY2IoW10pOyAvLyBFbnZzIHdpdGhvdXQgbG9jYWxTdG9yYWdlIHN1cHBvcnRcbiAgICB0cnkge1xuICAgICAgICB2YWwgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKCdEZXhpZS5EYXRhYmFzZU5hbWVzJykgfHwgXCJbXVwiKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHZhbCA9IFtdO1xuICAgIH1cbiAgICBpZiAoY2IodmFsKSkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnRGV4aWUuRGF0YWJhc2VOYW1lcycsIEpTT04uc3RyaW5naWZ5KHZhbCkpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYXdhaXRJdGVyYXRvcihpdGVyYXRvcikge1xuICAgIHZhciBjYWxsTmV4dCA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIGl0ZXJhdG9yLm5leHQocmVzdWx0KTtcbiAgICB9LFxuICAgICAgICBkb1Rocm93ID0gZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgIHJldHVybiBpdGVyYXRvci50aHJvdyhlcnJvcik7XG4gICAgfSxcbiAgICAgICAgb25TdWNjZXNzID0gc3RlcChjYWxsTmV4dCksXG4gICAgICAgIG9uRXJyb3IgPSBzdGVwKGRvVGhyb3cpO1xuXG4gICAgZnVuY3Rpb24gc3RlcChnZXROZXh0KSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IGdldE5leHQodmFsKSxcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IG5leHQudmFsdWU7XG5cbiAgICAgICAgICAgIHJldHVybiBuZXh0LmRvbmUgPyB2YWx1ZSA6ICF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUudGhlbiAhPT0gJ2Z1bmN0aW9uJyA/IGlzQXJyYXkodmFsdWUpID8gUHJvbWlzZS5hbGwodmFsdWUpLnRoZW4ob25TdWNjZXNzLCBvbkVycm9yKSA6IG9uU3VjY2Vzcyh2YWx1ZSkgOiB2YWx1ZS50aGVuKG9uU3VjY2Vzcywgb25FcnJvcik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0ZXAoY2FsbE5leHQpKCk7XG59XG5cbi8vXG4vLyBJbmRleFNwZWMgc3RydWN0XG4vL1xuZnVuY3Rpb24gSW5kZXhTcGVjKG5hbWUsIGtleVBhdGgsIHVuaXF1ZSwgbXVsdGksIGF1dG8sIGNvbXBvdW5kLCBkb3R0ZWQpIHtcbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJuYW1lXCIgdHlwZT1cIlN0cmluZ1wiPjwvcGFyYW0+XG4gICAgLy8vIDxwYXJhbSBuYW1lPVwia2V5UGF0aFwiIHR5cGU9XCJTdHJpbmdcIj48L3BhcmFtPlxuICAgIC8vLyA8cGFyYW0gbmFtZT1cInVuaXF1ZVwiIHR5cGU9XCJCb29sZWFuXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJtdWx0aVwiIHR5cGU9XCJCb29sZWFuXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJhdXRvXCIgdHlwZT1cIkJvb2xlYW5cIj48L3BhcmFtPlxuICAgIC8vLyA8cGFyYW0gbmFtZT1cImNvbXBvdW5kXCIgdHlwZT1cIkJvb2xlYW5cIj48L3BhcmFtPlxuICAgIC8vLyA8cGFyYW0gbmFtZT1cImRvdHRlZFwiIHR5cGU9XCJCb29sZWFuXCI+PC9wYXJhbT5cbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMua2V5UGF0aCA9IGtleVBhdGg7XG4gICAgdGhpcy51bmlxdWUgPSB1bmlxdWU7XG4gICAgdGhpcy5tdWx0aSA9IG11bHRpO1xuICAgIHRoaXMuYXV0byA9IGF1dG87XG4gICAgdGhpcy5jb21wb3VuZCA9IGNvbXBvdW5kO1xuICAgIHRoaXMuZG90dGVkID0gZG90dGVkO1xuICAgIHZhciBrZXlQYXRoU3JjID0gdHlwZW9mIGtleVBhdGggPT09ICdzdHJpbmcnID8ga2V5UGF0aCA6IGtleVBhdGggJiYgJ1snICsgW10uam9pbi5jYWxsKGtleVBhdGgsICcrJykgKyAnXSc7XG4gICAgdGhpcy5zcmMgPSAodW5pcXVlID8gJyYnIDogJycpICsgKG11bHRpID8gJyonIDogJycpICsgKGF1dG8gPyBcIisrXCIgOiBcIlwiKSArIGtleVBhdGhTcmM7XG59XG5cbi8vXG4vLyBUYWJsZVNjaGVtYSBzdHJ1Y3Rcbi8vXG5mdW5jdGlvbiBUYWJsZVNjaGVtYShuYW1lLCBwcmltS2V5LCBpbmRleGVzLCBpbnN0YW5jZVRlbXBsYXRlKSB7XG4gICAgLy8vIDxwYXJhbSBuYW1lPVwibmFtZVwiIHR5cGU9XCJTdHJpbmdcIj48L3BhcmFtPlxuICAgIC8vLyA8cGFyYW0gbmFtZT1cInByaW1LZXlcIiB0eXBlPVwiSW5kZXhTcGVjXCI+PC9wYXJhbT5cbiAgICAvLy8gPHBhcmFtIG5hbWU9XCJpbmRleGVzXCIgdHlwZT1cIkFycmF5XCIgZWxlbWVudFR5cGU9XCJJbmRleFNwZWNcIj48L3BhcmFtPlxuICAgIC8vLyA8cGFyYW0gbmFtZT1cImluc3RhbmNlVGVtcGxhdGVcIiB0eXBlPVwiT2JqZWN0XCI+PC9wYXJhbT5cbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMucHJpbUtleSA9IHByaW1LZXkgfHwgbmV3IEluZGV4U3BlYygpO1xuICAgIHRoaXMuaW5kZXhlcyA9IGluZGV4ZXMgfHwgW25ldyBJbmRleFNwZWMoKV07XG4gICAgdGhpcy5pbnN0YW5jZVRlbXBsYXRlID0gaW5zdGFuY2VUZW1wbGF0ZTtcbiAgICB0aGlzLm1hcHBlZENsYXNzID0gbnVsbDtcbiAgICB0aGlzLmlkeEJ5TmFtZSA9IGFycmF5VG9PYmplY3QoaW5kZXhlcywgZnVuY3Rpb24gKGluZGV4KSB7XG4gICAgICAgIHJldHVybiBbaW5kZXgubmFtZSwgaW5kZXhdO1xuICAgIH0pO1xufVxuXG4vLyBVc2VkIGluIHdoZW4gZGVmaW5pbmcgZGVwZW5kZW5jaWVzIGxhdGVyLi4uXG4vLyAoSWYgSW5kZXhlZERCU2hpbSBpcyBsb2FkZWQsIHByZWZlciBpdCBiZWZvcmUgc3RhbmRhcmQgaW5kZXhlZERCKVxudmFyIGlkYnNoaW0gPSBfZ2xvYmFsLmlkYk1vZHVsZXMgJiYgX2dsb2JhbC5pZGJNb2R1bGVzLnNoaW1JbmRleGVkREIgPyBfZ2xvYmFsLmlkYk1vZHVsZXMgOiB7fTtcblxuZnVuY3Rpb24gc2FmYXJpTXVsdGlTdG9yZUZpeChzdG9yZU5hbWVzKSB7XG4gICAgcmV0dXJuIHN0b3JlTmFtZXMubGVuZ3RoID09PSAxID8gc3RvcmVOYW1lc1swXSA6IHN0b3JlTmFtZXM7XG59XG5cbmZ1bmN0aW9uIGdldE5hdGl2ZUdldERhdGFiYXNlTmFtZXNGbihpbmRleGVkREIpIHtcbiAgICB2YXIgZm4gPSBpbmRleGVkREIgJiYgKGluZGV4ZWREQi5nZXREYXRhYmFzZU5hbWVzIHx8IGluZGV4ZWREQi53ZWJraXRHZXREYXRhYmFzZU5hbWVzKTtcbiAgICByZXR1cm4gZm4gJiYgZm4uYmluZChpbmRleGVkREIpO1xufVxuXG4vLyBFeHBvcnQgRXJyb3IgY2xhc3Nlc1xucHJvcHMoRGV4aWUsIGZ1bGxOYW1lRXhjZXB0aW9ucyk7IC8vIERleGllLlhYWEVycm9yID0gY2xhc3MgWFhYRXJyb3Igey4uLn07XG5cbi8vXG4vLyBTdGF0aWMgbWV0aG9kcyBhbmQgcHJvcGVydGllc1xuLy8gXG5wcm9wcyhEZXhpZSwge1xuXG4gICAgLy9cbiAgICAvLyBTdGF0aWMgZGVsZXRlKCkgbWV0aG9kLlxuICAgIC8vXG4gICAgZGVsZXRlOiBmdW5jdGlvbiAoZGF0YWJhc2VOYW1lKSB7XG4gICAgICAgIHZhciBkYiA9IG5ldyBEZXhpZShkYXRhYmFzZU5hbWUpLFxuICAgICAgICAgICAgcHJvbWlzZSA9IGRiLmRlbGV0ZSgpO1xuICAgICAgICBwcm9taXNlLm9uYmxvY2tlZCA9IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgZGIub24oXCJibG9ja2VkXCIsIGZuKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9LFxuXG4gICAgLy9cbiAgICAvLyBTdGF0aWMgZXhpc3RzKCkgbWV0aG9kLlxuICAgIC8vXG4gICAgZXhpc3RzOiBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICByZXR1cm4gbmV3IERleGllKG5hbWUpLm9wZW4oKS50aGVuKGZ1bmN0aW9uIChkYikge1xuICAgICAgICAgICAgZGIuY2xvc2UoKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KS5jYXRjaChEZXhpZS5Ob1N1Y2hEYXRhYmFzZUVycm9yLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvL1xuICAgIC8vIFN0YXRpYyBtZXRob2QgZm9yIHJldHJpZXZpbmcgYSBsaXN0IG9mIGFsbCBleGlzdGluZyBkYXRhYmFzZXMgYXQgY3VycmVudCBob3N0LlxuICAgIC8vXG4gICAgZ2V0RGF0YWJhc2VOYW1lczogZnVuY3Rpb24gKGNiKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgZ2V0RGF0YWJhc2VOYW1lcyA9IGdldE5hdGl2ZUdldERhdGFiYXNlTmFtZXNGbihpbmRleGVkREIpO1xuICAgICAgICAgICAgaWYgKGdldERhdGFiYXNlTmFtZXMpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiBjYXNlIGdldERhdGFiYXNlTmFtZXMoKSBiZWNvbWVzIHN0YW5kYXJkLCBsZXQncyBwcmVwYXJlIHRvIHN1cHBvcnQgaXQ6XG4gICAgICAgICAgICAgICAgdmFyIHJlcSA9IGdldERhdGFiYXNlTmFtZXMoKTtcbiAgICAgICAgICAgICAgICByZXEub25zdWNjZXNzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoc2xpY2UoZXZlbnQudGFyZ2V0LnJlc3VsdCwgMCkpOyAvLyBDb252ZXJzdCBET01TdHJpbmdMaXN0IHRvIEFycmF5PFN0cmluZz5cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJlcS5vbmVycm9yID0gZXZlbnRSZWplY3RIYW5kbGVyKHJlamVjdCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGdsb2JhbERhdGFiYXNlTGlzdChmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodmFsKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KS50aGVuKGNiKTtcbiAgICB9LFxuXG4gICAgZGVmaW5lQ2xhc3M6IGZ1bmN0aW9uIChzdHJ1Y3R1cmUpIHtcbiAgICAgICAgLy8vIDxzdW1tYXJ5PlxuICAgICAgICAvLy8gICAgIENyZWF0ZSBhIGphdmFzY3JpcHQgY29uc3RydWN0b3IgYmFzZWQgb24gZ2l2ZW4gdGVtcGxhdGUgZm9yIHdoaWNoIHByb3BlcnRpZXMgdG8gZXhwZWN0IGluIHRoZSBjbGFzcy5cbiAgICAgICAgLy8vICAgICBBbnkgcHJvcGVydHkgdGhhdCBpcyBhIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIHdpbGwgYWN0IGFzIGEgdHlwZS4gU28ge25hbWU6IFN0cmluZ30gd2lsbCBiZSBlcXVhbCB0byB7bmFtZTogbmV3IFN0cmluZygpfS5cbiAgICAgICAgLy8vIDwvc3VtbWFyeT5cbiAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwic3RydWN0dXJlXCI+SGVscHMgSURFIGNvZGUgY29tcGxldGlvbiBieSBrbm93aW5nIHRoZSBtZW1iZXJzIHRoYXQgb2JqZWN0cyBjb250YWluIGFuZCBub3QganVzdCB0aGUgaW5kZXhlcy4gQWxzb1xuICAgICAgICAvLy8ga25vdyB3aGF0IHR5cGUgZWFjaCBtZW1iZXIgaGFzLiBFeGFtcGxlOiB7bmFtZTogU3RyaW5nLCBlbWFpbEFkZHJlc3NlczogW1N0cmluZ10sIHByb3BlcnRpZXM6IHtzaG9lU2l6ZTogTnVtYmVyfX08L3BhcmFtPlxuXG4gICAgICAgIC8vIERlZmF1bHQgY29uc3RydWN0b3IgYWJsZSB0byBjb3B5IGdpdmVuIHByb3BlcnRpZXMgaW50byB0aGlzIG9iamVjdC5cbiAgICAgICAgZnVuY3Rpb24gQ2xhc3MocHJvcGVydGllcykge1xuICAgICAgICAgICAgLy8vIDxwYXJhbSBuYW1lPVwicHJvcGVydGllc1wiIHR5cGU9XCJPYmplY3RcIiBvcHRpb25hbD1cInRydWVcIj5Qcm9wZXJ0aWVzIHRvIGluaXRpYWxpemUgb2JqZWN0IHdpdGguXG4gICAgICAgICAgICAvLy8gPC9wYXJhbT5cbiAgICAgICAgICAgIHByb3BlcnRpZXMgPyBleHRlbmQodGhpcywgcHJvcGVydGllcykgOiBmYWtlICYmIGFwcGx5U3RydWN0dXJlKHRoaXMsIHN0cnVjdHVyZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIENsYXNzO1xuICAgIH0sXG5cbiAgICBhcHBseVN0cnVjdHVyZTogYXBwbHlTdHJ1Y3R1cmUsXG5cbiAgICBpZ25vcmVUcmFuc2FjdGlvbjogZnVuY3Rpb24gKHNjb3BlRnVuYykge1xuICAgICAgICAvLyBJbiBjYXNlIGNhbGxlciBpcyB3aXRoaW4gYSB0cmFuc2FjdGlvbiBidXQgbmVlZHMgdG8gY3JlYXRlIGEgc2VwYXJhdGUgdHJhbnNhY3Rpb24uXG4gICAgICAgIC8vIEV4YW1wbGUgb2YgdXNhZ2U6XG4gICAgICAgIC8vXG4gICAgICAgIC8vIExldCdzIHNheSB3ZSBoYXZlIGEgbG9nZ2VyIGZ1bmN0aW9uIGluIG91ciBhcHAuIE90aGVyIGFwcGxpY2F0aW9uLWxvZ2ljIHNob3VsZCBiZSB1bmF3YXJlIG9mIHRoZVxuICAgICAgICAvLyBsb2dnZXIgZnVuY3Rpb24gYW5kIG5vdCBuZWVkIHRvIGluY2x1ZGUgdGhlICdsb2dlbnRyaWVzJyB0YWJsZSBpbiBhbGwgdHJhbnNhY3Rpb24gaXQgcGVyZm9ybXMuXG4gICAgICAgIC8vIFRoZSBsb2dnaW5nIHNob3VsZCBhbHdheXMgYmUgZG9uZSBpbiBhIHNlcGFyYXRlIHRyYW5zYWN0aW9uIGFuZCBub3QgYmUgZGVwZW5kYW50IG9uIHRoZSBjdXJyZW50XG4gICAgICAgIC8vIHJ1bm5pbmcgdHJhbnNhY3Rpb24gY29udGV4dC4gVGhlbiB5b3UgY291bGQgdXNlIERleGllLmlnbm9yZVRyYW5zYWN0aW9uKCkgdG8gcnVuIGNvZGUgdGhhdCBzdGFydHMgYSBuZXcgdHJhbnNhY3Rpb24uXG4gICAgICAgIC8vXG4gICAgICAgIC8vICAgICBEZXhpZS5pZ25vcmVUcmFuc2FjdGlvbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICAgICAgICBkYi5sb2dlbnRyaWVzLmFkZChuZXdMb2dFbnRyeSk7XG4gICAgICAgIC8vICAgICB9KTtcbiAgICAgICAgLy9cbiAgICAgICAgLy8gVW5sZXNzIHVzaW5nIERleGllLmlnbm9yZVRyYW5zYWN0aW9uKCksIHRoZSBhYm92ZSBleGFtcGxlIHdvdWxkIHRyeSB0byByZXVzZSB0aGUgY3VycmVudCB0cmFuc2FjdGlvblxuICAgICAgICAvLyBpbiBjdXJyZW50IFByb21pc2Utc2NvcGUuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIEFuIGFsdGVybmF0aXZlIHRvIERleGllLmlnbm9yZVRyYW5zYWN0aW9uKCkgd291bGQgYmUgc2V0SW1tZWRpYXRlKCkgb3Igc2V0VGltZW91dCgpLiBUaGUgcmVhc29uIHdlIHN0aWxsIHByb3ZpZGUgYW5cbiAgICAgICAgLy8gQVBJIGZvciB0aGlzIGJlY2F1c2VcbiAgICAgICAgLy8gIDEpIFRoZSBpbnRlbnRpb24gb2Ygd3JpdGluZyB0aGUgc3RhdGVtZW50IGNvdWxkIGJlIHVuY2xlYXIgaWYgdXNpbmcgc2V0SW1tZWRpYXRlKCkgb3Igc2V0VGltZW91dCgpLlxuICAgICAgICAvLyAgMikgc2V0VGltZW91dCgpIHdvdWxkIHdhaXQgdW5uZXNjZXNzYXJ5IHVudGlsIGZpcmluZy4gVGhpcyBpcyBob3dldmVyIG5vdCB0aGUgY2FzZSB3aXRoIHNldEltbWVkaWF0ZSgpLlxuICAgICAgICAvLyAgMykgc2V0SW1tZWRpYXRlKCkgaXMgbm90IHN1cHBvcnRlZCBpbiB0aGUgRVMgc3RhbmRhcmQuXG4gICAgICAgIC8vICA0KSBZb3UgbWlnaHQgd2FudCB0byBrZWVwIG90aGVyIFBTRCBzdGF0ZSB0aGF0IHdhcyBzZXQgaW4gYSBwYXJlbnQgUFNELCBzdWNoIGFzIFBTRC5sZXRUaHJvdWdoLlxuICAgICAgICByZXR1cm4gUFNELnRyYW5zID8gdXNlUFNEKFBTRC50cmFuc2xlc3MsIHNjb3BlRnVuYykgOiAvLyBVc2UgdGhlIGNsb3Nlc3QgcGFyZW50IHRoYXQgd2FzIG5vbi10cmFuc2FjdGlvbmFsLlxuICAgICAgICBzY29wZUZ1bmMoKTsgLy8gTm8gbmVlZCB0byBjaGFuZ2Ugc2NvcGUgYmVjYXVzZSB0aGVyZSBpcyBubyBvbmdvaW5nIHRyYW5zYWN0aW9uLlxuICAgIH0sXG5cbiAgICB2aXA6IGZ1bmN0aW9uIChmbikge1xuICAgICAgICAvLyBUbyBiZSB1c2VkIGJ5IHN1YnNjcmliZXJzIHRvIHRoZSBvbigncmVhZHknKSBldmVudC5cbiAgICAgICAgLy8gVGhpcyB3aWxsIGxldCBjYWxsZXIgdGhyb3VnaCB0byBhY2Nlc3MgREIgZXZlbiB3aGVuIGl0IGlzIGJsb2NrZWQgd2hpbGUgdGhlIGRiLnJlYWR5KCkgc3Vic2NyaWJlcnMgYXJlIGZpcmluZy5cbiAgICAgICAgLy8gVGhpcyB3b3VsZCBoYXZlIHdvcmtlZCBhdXRvbWF0aWNhbGx5IGlmIHdlIHdlcmUgY2VydGFpbiB0aGF0IHRoZSBQcm92aWRlciB3YXMgdXNpbmcgRGV4aWUuUHJvbWlzZSBmb3IgYWxsIGFzeW5jcm9uaWMgb3BlcmF0aW9ucy4gVGhlIHByb21pc2UgUFNEXG4gICAgICAgIC8vIGZyb20gdGhlIHByb3ZpZGVyLmNvbm5lY3QoKSBjYWxsIHdvdWxkIHRoZW4gYmUgZGVyaXZlZCBhbGwgdGhlIHdheSB0byB3aGVuIHByb3ZpZGVyIHdvdWxkIGNhbGwgbG9jYWxEYXRhYmFzZS5hcHBseUNoYW5nZXMoKS4gQnV0IHNpbmNlXG4gICAgICAgIC8vIHRoZSBwcm92aWRlciBtb3JlIGxpa2VseSBpcyB1c2luZyBub24tcHJvbWlzZSBhc3luYyBBUElzIG9yIG90aGVyIHRoZW5hYmxlIGltcGxlbWVudGF0aW9ucywgd2UgY2Fubm90IGFzc3VtZSB0aGF0LlxuICAgICAgICAvLyBOb3RlIHRoYXQgdGhpcyBtZXRob2QgaXMgb25seSB1c2VmdWwgZm9yIG9uKCdyZWFkeScpIHN1YnNjcmliZXJzIHRoYXQgaXMgcmV0dXJuaW5nIGEgUHJvbWlzZSBmcm9tIHRoZSBldmVudC4gSWYgbm90IHVzaW5nIHZpcCgpXG4gICAgICAgIC8vIHRoZSBkYXRhYmFzZSBjb3VsZCBkZWFkbG9jayBzaW5jZSBpdCB3b250IG9wZW4gdW50aWwgdGhlIHJldHVybmVkIFByb21pc2UgaXMgcmVzb2x2ZWQsIGFuZCBhbnkgbm9uLVZJUGVkIG9wZXJhdGlvbiBzdGFydGVkIGJ5XG4gICAgICAgIC8vIHRoZSBjYWxsZXIgd2lsbCBub3QgcmVzb2x2ZSB1bnRpbCBkYXRhYmFzZSBpcyBvcGVuZWQuXG4gICAgICAgIHJldHVybiBuZXdTY29wZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBQU0QubGV0VGhyb3VnaCA9IHRydWU7IC8vIE1ha2Ugc3VyZSB3ZSBhcmUgbGV0IHRocm91Z2ggaWYgc3RpbGwgYmxvY2tpbmcgZGIgZHVlIHRvIG9ucmVhZHkgaXMgZmlyaW5nLlxuICAgICAgICAgICAgcmV0dXJuIGZuKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBhc3luYzogZnVuY3Rpb24gKGdlbmVyYXRvckZuKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBydiA9IGF3YWl0SXRlcmF0b3IoZ2VuZXJhdG9yRm4uYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICAgICAgICAgICAgaWYgKCFydiB8fCB0eXBlb2YgcnYudGhlbiAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIFByb21pc2UucmVzb2x2ZShydik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ2O1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByZWplY3Rpb24oZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIHNwYXduOiBmdW5jdGlvbiAoZ2VuZXJhdG9yRm4sIGFyZ3MsIHRoaXopIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciBydiA9IGF3YWl0SXRlcmF0b3IoZ2VuZXJhdG9yRm4uYXBwbHkodGhpeiwgYXJncyB8fCBbXSkpO1xuICAgICAgICAgICAgaWYgKCFydiB8fCB0eXBlb2YgcnYudGhlbiAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIFByb21pc2UucmVzb2x2ZShydik7XG4gICAgICAgICAgICByZXR1cm4gcnY7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIHJldHVybiByZWplY3Rpb24oZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gRGV4aWUuY3VycmVudFRyYW5zYWN0aW9uIHByb3BlcnR5XG4gICAgY3VycmVudFRyYW5zYWN0aW9uOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFBTRC50cmFucyB8fCBudWxsO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIEV4cG9ydCBvdXIgUHJvbWlzZSBpbXBsZW1lbnRhdGlvbiBzaW5jZSBpdCBjYW4gYmUgaGFuZHkgYXMgYSBzdGFuZGFsb25lIFByb21pc2UgaW1wbGVtZW50YXRpb25cbiAgICBQcm9taXNlOiBQcm9taXNlLFxuXG4gICAgLy8gRGV4aWUuZGVidWcgcHJvcHRlcnk6XG4gICAgLy8gRGV4aWUuZGVidWcgPSBmYWxzZVxuICAgIC8vIERleGllLmRlYnVnID0gdHJ1ZVxuICAgIC8vIERleGllLmRlYnVnID0gXCJkZXhpZVwiIC0gZG9uJ3QgaGlkZSBkZXhpZSdzIHN0YWNrIGZyYW1lcy5cbiAgICBkZWJ1Zzoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWJ1ZztcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHNldERlYnVnKHZhbHVlLCB2YWx1ZSA9PT0gJ2RleGllJyA/IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0gOiBkZXhpZVN0YWNrRnJhbWVGaWx0ZXIpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIEV4cG9ydCBvdXIgZGVyaXZlL2V4dGVuZC9vdmVycmlkZSBtZXRob2RvbG9neVxuICAgIGRlcml2ZTogZGVyaXZlLFxuICAgIGV4dGVuZDogZXh0ZW5kLFxuICAgIHByb3BzOiBwcm9wcyxcbiAgICBvdmVycmlkZTogb3ZlcnJpZGUsXG4gICAgLy8gRXhwb3J0IG91ciBFdmVudHMoKSBmdW5jdGlvbiAtIGNhbiBiZSBoYW5keSBhcyBhIHRvb2xraXRcbiAgICBFdmVudHM6IEV2ZW50cyxcbiAgICBldmVudHM6IHsgZ2V0OiBkZXByZWNhdGVkKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBFdmVudHM7XG4gICAgICAgIH0pIH0sIC8vIEJhY2t3YXJkIGNvbXBhdGlibGUgbG93ZXJjYXNlIHZlcnNpb24uXG4gICAgLy8gVXRpbGl0aWVzXG4gICAgZ2V0QnlLZXlQYXRoOiBnZXRCeUtleVBhdGgsXG4gICAgc2V0QnlLZXlQYXRoOiBzZXRCeUtleVBhdGgsXG4gICAgZGVsQnlLZXlQYXRoOiBkZWxCeUtleVBhdGgsXG4gICAgc2hhbGxvd0Nsb25lOiBzaGFsbG93Q2xvbmUsXG4gICAgZGVlcENsb25lOiBkZWVwQ2xvbmUsXG4gICAgZ2V0T2JqZWN0RGlmZjogZ2V0T2JqZWN0RGlmZixcbiAgICBhc2FwOiBhc2FwLFxuICAgIG1heEtleTogbWF4S2V5LFxuICAgIC8vIEFkZG9uIHJlZ2lzdHJ5XG4gICAgYWRkb25zOiBbXSxcbiAgICAvLyBHbG9iYWwgREIgY29ubmVjdGlvbiBsaXN0XG4gICAgY29ubmVjdGlvbnM6IGNvbm5lY3Rpb25zLFxuXG4gICAgTXVsdGlNb2RpZnlFcnJvcjogZXhjZXB0aW9ucy5Nb2RpZnksIC8vIEJhY2t3YXJkIGNvbXBhdGliaWxpdHkgMC45LjguIERlcHJlY2F0ZS5cbiAgICBlcnJuYW1lczogZXJybmFtZXMsXG5cbiAgICAvLyBFeHBvcnQgb3RoZXIgc3RhdGljIGNsYXNzZXNcbiAgICBJbmRleFNwZWM6IEluZGV4U3BlYyxcbiAgICBUYWJsZVNjaGVtYTogVGFibGVTY2hlbWEsXG5cbiAgICAvL1xuICAgIC8vIERlcGVuZGVuY2llc1xuICAgIC8vXG4gICAgLy8gVGhlc2Ugd2lsbCBhdXRvbWF0aWNhbGx5IHdvcmsgaW4gYnJvd3NlcnMgd2l0aCBpbmRleGVkREIgc3VwcG9ydCwgb3Igd2hlcmUgYW4gaW5kZXhlZERCIHBvbHlmaWxsIGhhcyBiZWVuIGluY2x1ZGVkLlxuICAgIC8vXG4gICAgLy8gSW4gbm9kZS5qcywgaG93ZXZlciwgdGhlc2UgcHJvcGVydGllcyBtdXN0IGJlIHNldCBcIm1hbnVhbGx5XCIgYmVmb3JlIGluc3RhbnNpYXRpbmcgYSBuZXcgRGV4aWUoKS5cbiAgICAvLyBGb3Igbm9kZS5qcywgeW91IG5lZWQgdG8gcmVxdWlyZSBpbmRleGVkZGItanMgb3Igc2ltaWxhciBhbmQgdGhlbiBzZXQgdGhlc2UgZGVwcy5cbiAgICAvL1xuICAgIGRlcGVuZGVuY2llczoge1xuICAgICAgICAvLyBSZXF1aXJlZDpcbiAgICAgICAgaW5kZXhlZERCOiBpZGJzaGltLnNoaW1JbmRleGVkREIgfHwgX2dsb2JhbC5pbmRleGVkREIgfHwgX2dsb2JhbC5tb3pJbmRleGVkREIgfHwgX2dsb2JhbC53ZWJraXRJbmRleGVkREIgfHwgX2dsb2JhbC5tc0luZGV4ZWREQixcbiAgICAgICAgSURCS2V5UmFuZ2U6IGlkYnNoaW0uSURCS2V5UmFuZ2UgfHwgX2dsb2JhbC5JREJLZXlSYW5nZSB8fCBfZ2xvYmFsLndlYmtpdElEQktleVJhbmdlXG4gICAgfSxcblxuICAgIC8vIEFQSSBWZXJzaW9uIE51bWJlcjogVHlwZSBOdW1iZXIsIG1ha2Ugc3VyZSB0byBhbHdheXMgc2V0IGEgdmVyc2lvbiBudW1iZXIgdGhhdCBjYW4gYmUgY29tcGFyYWJsZSBjb3JyZWN0bHkuIEV4YW1wbGU6IDAuOSwgMC45MSwgMC45MiwgMS4wLCAxLjAxLCAxLjEsIDEuMiwgMS4yMSwgZXRjLlxuICAgIHNlbVZlcjogREVYSUVfVkVSU0lPTixcbiAgICB2ZXJzaW9uOiBERVhJRV9WRVJTSU9OLnNwbGl0KCcuJykubWFwKGZ1bmN0aW9uIChuKSB7XG4gICAgICAgIHJldHVybiBwYXJzZUludChuKTtcbiAgICB9KS5yZWR1Y2UoZnVuY3Rpb24gKHAsIGMsIGkpIHtcbiAgICAgICAgcmV0dXJuIHAgKyBjIC8gTWF0aC5wb3coMTAsIGkgKiAyKTtcbiAgICB9KSxcbiAgICBmYWtlQXV0b0NvbXBsZXRlOiBmYWtlQXV0b0NvbXBsZXRlLFxuXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2RmYWhsYW5kZXIvRGV4aWUuanMvaXNzdWVzLzE4NlxuICAgIC8vIHR5cGVzY3JpcHQgY29tcGlsZXIgdHNjIGluIG1vZGUgdHMtLT5lczUgJiBjb21tb25KUywgd2lsbCBleHBlY3QgcmVxdWlyZSgpIHRvIHJldHVyblxuICAgIC8vIHguZGVmYXVsdC4gV29ya2Fyb3VuZDogU2V0IERleGllLmRlZmF1bHQgPSBEZXhpZS5cbiAgICBkZWZhdWx0OiBEZXhpZVxufSk7XG5cbnRyeUNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAvLyBPcHRpb25hbCBkZXBlbmRlbmNpZXNcbiAgICAvLyBsb2NhbFN0b3JhZ2VcbiAgICBEZXhpZS5kZXBlbmRlbmNpZXMubG9jYWxTdG9yYWdlID0gKHR5cGVvZiBjaHJvbWUgIT09IFwidW5kZWZpbmVkXCIgJiYgY2hyb21lICE9PSBudWxsID8gY2hyb21lLnN0b3JhZ2UgOiB2b2lkIDApICE9IG51bGwgPyBudWxsIDogX2dsb2JhbC5sb2NhbFN0b3JhZ2U7XG59KTtcblxuLy8gTWFwIERPTUVycm9ycyBhbmQgRE9NRXhjZXB0aW9ucyB0byBjb3JyZXNwb25kaW5nIERleGllIGVycm9ycy4gTWF5IGNoYW5nZSBpbiBEZXhpZSB2Mi4wLlxuUHJvbWlzZS5yZWplY3Rpb25NYXBwZXIgPSBtYXBFcnJvcjtcblxuLy8gRm9vbCBJREUgdG8gaW1wcm92ZSBhdXRvY29tcGxldGUuIFRlc3RlZCB3aXRoIFZpc3VhbCBTdHVkaW8gMjAxMyBhbmQgMjAxNS5cbmRvRmFrZUF1dG9Db21wbGV0ZShmdW5jdGlvbiAoKSB7XG4gICAgRGV4aWUuZmFrZUF1dG9Db21wbGV0ZSA9IGZha2VBdXRvQ29tcGxldGUgPSBkb0Zha2VBdXRvQ29tcGxldGU7XG4gICAgRGV4aWUuZmFrZSA9IGZha2UgPSB0cnVlO1xufSk7XG5cbnJldHVybiBEZXhpZTtcblxufSkpKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRleGllLmpzLm1hcFxuIiwiXHJcbmNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgcnVuOiBmdW5jdGlvbihjbWQpIHtcclxuXHJcbiAgICBsZXQgYXJncyA9IHJlcXVpcmUoJy4uL3Rlcm1pbmFsLmpzJykudXRpbHMucGFyc2VfYXJndW1lbnRzKGNtZClcclxuICAgIGxldCB2YWx1ZSA9IDBcclxuICAgIGZvcihsZXQgbiBvZiBhcmdzKSB7XHJcbiAgICAgIGlmKGlzTmFOKG4pKSB0aHJvdyBcIk5vdCBhIG51bWJlclwiXHJcbiAgICAgIHZhbHVlICs9IG5cclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kIiwibGV0IHRvdGFsID0gMFxyXG5cclxuY29uc3QgY29tbWFuZCA9IHtcclxuICBydW46IGZ1bmN0aW9uKGNtZCkge1xyXG4gICAgcmV0dXJuIGBUaGlzIGNvbW1hbmQgaGFzIGJlZW4gcnVuICR7dG90YWwrK30gdGltZXNgXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmQiLCJjb25zdCBjb21tYW5kID0ge1xyXG4gIHJ1bjogZnVuY3Rpb24oY21kKSB7XHJcbiAgICByZXR1cm4gY21kXHJcbiAgfSxcclxuXHJcbiAgaGVscDogZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gYFJldHVybnMgdGhlIGFyZ3VtZW50c2BcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZCIsImNvbnN0IHVuaXZlcnNlID0gcmVxdWlyZSgnLi4vbG9jYXRpb24uanMnKS51bml2ZXJzZVxyXG5jb25zdCBvcmJpdCA9IHJlcXVpcmUoJy4uL3V0aWxzL29yYml0LmpzJylcclxuXHJcbmNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgcnVuOiBmdW5jdGlvbihjbWQpIHtcclxuICAgIGxldCBhcmdzID0gcmVxdWlyZSgnLi4vdGVybWluYWwuanMnKS51dGlscy5wYXJzZV9hcmd1bWVudHMoY21kKVxyXG4gICAgbGV0IHRhcmdldCA9IHVuaXZlcnNlW2FyZ3NbMF1dXHJcbiAgICBpZighdGFyZ2V0KSB0aHJvdyBcIlVua25vd24gdGFyZ2V0XCJcclxuXHJcbiAgICBjb25zb2xlLmxvZyh0YXJnZXQpXHJcbiAgICBjb25zb2xlLmxvZyh1bml2ZXJzZS5wbGF5ZXIpXHJcbiAgICBsZXQgbmV4dCA9IG9yYml0LmdldE5leHRXaW5kb3codW5pdmVyc2UucGxheWVyLnBhcmVudCwgdGFyZ2V0KVxyXG5cclxuICAgIHJldHVybiAxMlxyXG4gIH0sXHJcblxyXG4gIGhlbHA6IGZ1bmN0aW9uKG9wdHMpIHtcclxuICAgIHJldHVybiAnPHRhcmdldCBib2R5PiBGaW5kcyB0aGUgbmV4dCB0cmFuc2ZlciB3aW5kb3cgZnJvbSB0aGUgY3VycmVudCBwb3NpdGlvbiB0byB0aGUgc2VsZWN0ZWQgY2VsZXN0aWFsIGJvZHknXHJcbiAgfSxcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kIiwiY29uc3QgY29tbWFuZCA9IHtcclxuICBydW46IGZ1bmN0aW9uKGNtZCkge1xyXG4gICAgcmV0dXJuIGNtZFxyXG4gIH0sXHJcblxyXG4gIGlzQWxsb3dlZDogZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9LFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmQiLCJcclxuY29uc3QgY29tbWFuZCA9IHtcclxuICBydW46IGZ1bmN0aW9uKGNtZCkge1xyXG4gICAgbGV0IGNvbW1hbmRzID0gcmVxdWlyZSgnLi8nKVxyXG4gICAgbGV0IGFyZ3MgPSByZXF1aXJlKCcuLi90ZXJtaW5hbC5qcycpLnV0aWxzLnBhcnNlX2FyZ3VtZW50cyhjbWQpXHJcblxyXG4gICAgaWYoYXJnc1swXSkgeyAvLyBJcyB0aGVyZSBhIHNwZWNpZmllZCBjb21tYW5kID9cclxuICAgICAgbGV0IG5hbWUgPSBhcmdzWzBdXHJcbiAgICAgIGlmKCBjb21tYW5kc1tuYW1lXSAvLyBEb2VzIHRoZSBjb21tYW5kIGV4aXN0ID9cclxuICAgICAgICAmJiAoIWNvbW1hbmRzW25hbWVdLmlzQWxsb3dlZCB8fCBjb21tYW5kc1tuYW1lXS5pc0FsbG93ZWQoKSApKSB7IC8vIElzIGl0IGFsbG93ZWQgP1xyXG4gICAgICAgICAgaWYoY29tbWFuZHNbbmFtZV0uaGVscCkgcmV0dXJuIGNvbW1hbmRzW25hbWVdLmhlbHAoY21kKVxyXG4gICAgICAgICAgZWxzZSByZXR1cm4gYFRoZSBjb21tYW5kIGhhcyBubyBoZWxwIHBhZ2VgXHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGBUaGUgY29tbWFuZCBpcyBub3QgcmVjb2duaXplZGBcclxuICAgIH1cclxuXHJcblxyXG4gICAgbGV0IHZhbCA9IGBIZWxsb2BcclxuICAgIGZvcihsZXQgbmFtZSBpbiBjb21tYW5kcykge1xyXG4gICAgICBpZighY29tbWFuZHNbbmFtZV0uaXNBbGxvd2VkIHx8IGNvbW1hbmRzW25hbWVdLmlzQWxsb3dlZCgpKSB7XHJcbiAgICAgICAgdmFsICs9IGBcXG4gIFtbYjs7XSR7bmFtZX1dIGBcclxuICAgICAgICBpZihjb21tYW5kc1tuYW1lXS5oZWxwKSB2YWwgKz0gY29tbWFuZHNbbmFtZV0uaGVscCgnbGlzdCcpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiB2YWxcclxuICB9LFxyXG5cclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gY29tbWFuZCIsImNvbnN0IGNvbW1hbmRzID0ge1xyXG4gIGFkZDogcmVxdWlyZSgnLi9hZGQuanMnKSxcclxuICBjb3VudDogcmVxdWlyZSgnLi9jb3VudC5qcycpLFxyXG4gIGVjaG86IHJlcXVpcmUoJy4vZWNoby5qcycpLFxyXG4gIGZpbmRfd2luZG93OiByZXF1aXJlKCcuL2ZpbmRXaW5kb3cuanMnKSxcclxuICBmb3JiaWRkZW46IHJlcXVpcmUoJy4vZm9yYmlkZGVuLmpzJyksXHJcbiAgaGVscDogcmVxdWlyZSgnLi9oZWxwLmpzJyksXHJcbiAgbG9nOiByZXF1aXJlKCcuL2xvZy5qcycpLFxyXG4gIHN0YXR1czogcmVxdWlyZSgnLi9zdGF0dXMuanMnKSxcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kcyIsImNvbnN0IGNvbW1hbmQgPSB7XHJcbiAgcnVuOiBmdW5jdGlvbihjbWQpIHtcclxuICAgIGNvbnNvbGUubG9nKGNtZC5yZXN0KVxyXG4gIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjb21tYW5kIiwiY29uc3QgbG9jYXRpb24gPSByZXF1aXJlKCcuLi9sb2NhdGlvbi5qcycpXHJcblxyXG5jb25zdCBjb21tYW5kID0ge1xyXG4gIHJ1bjogZnVuY3Rpb24oKSB7XHJcbiAgICBsZXQgc2hpcCA9IGxvY2F0aW9uLnVuaXZlcnNlLnBsYXllclxyXG4gICAgcmV0dXJuIGBDdXJyZW50bHkgb3JiaXRpbmcgJHtzaGlwLnBhcmVudC5uYW1lfVxyXG5TZW1pLW1ham9yIGF4aXM6ICR7bG9jYXRpb24uZ2V0Rm9ybWF0dGVkRGlzdGFuY2Uoc2hpcC5zbWEpfVxyXG5GdWVsIGxldmVsOiAxMDAlXHJcbkh1bGwgaW50ZWdyaXR5OiAxMDAlXHJcbk5vIHRyYW5zZmVyIGluIHByb2dyZXNzYFxyXG4gIH0sXHJcblxyXG4gIGhlbHA6IGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIGBkaXNwbGF5IGluZm9ybWF0aW9uIGFib3V0IHRoZSBzaGlwJ3MgY3VycmVudCBzaXR1YXRpb25gXHJcbiAgfVxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNvbW1hbmQiLCJjb25zdCB0aW1lID0gcmVxdWlyZSgnLi91dGlscy90aW1lLmpzJylcclxuXHJcbi8vIERhdGEgdG8gYmUgbG9hZGVkIG9uIGEgbmV3IHNhdmVcclxuY29uc3Qgc29sYXJTeXN0ZW0gPSBbXHJcbiAge25hbWU6XCJzdW5cIiwgdHlwZTpcInN1blwiLCBzbWE6MCwgbWFzczoxLjk4OWUzMH0sXHJcbiAgICB7bmFtZTpcImp1cGl0ZXJcIiwgdHlwZTpcInBsYW5ldFwiLCBzbWE6MCwgbWFzczoxLjg5ODZlMjcsIHBhcmVudDpcInN1blwifSxcclxuICAgICAge25hbWU6XCJpb1wiLCB0eXBlOlwibW9vblwiLHNtYTo0LjIxN2U4LG1hc3M6OC45MzE5ZTIyLGFub21hbHlBdEVwb2NoOjEwLHBhcmVudDpcImp1cGl0ZXJcIn0sXHJcbiAgICAgICAge25hbWU6XCJzdGFydFwiLHNtYToxLjkzZTYscGFyZW50OlwiaW9cIn0sXHJcbiAgICAgICAge25hbWU6XCJwbGF5ZXJcIiwgdHlwZTpcInNoaXBcIixzbWE6MS45M2U2LG1hc3M6MWU0LGFub21hbHlBdEVwb2NoOjAscGFyZW50OlwiaW9cIn0sXHJcbiAgICAgIHtuYW1lOlwiZXVyb3BhXCIsIHR5cGU6XCJtb29uXCIsc21hOjYuNzFlOCxtYXNzOjQuOGUyMixhbm9tYWx5QXRFcG9jaDowLHBhcmVudDpcImp1cGl0ZXJcIn0sXHJcbiAgICAgICAge25hbWU6XCJlbmRcIixzbWE6MS42NmU2LHBhcmVudDpcImV1cm9wYVwifSxcclxuICAgICAge25hbWU6XCJnYW55bWVkZVwiLCB0eXBlOlwibW9vblwiLHNtYToxLjA3MDQxMmU5LG1hc3M6MS40ODE5ZTIzLGFub21hbHlBdEVwb2NoOjAscGFyZW50OlwianVwaXRlclwifSxcclxuICAgICAge25hbWU6XCJjYWxsaXN0b1wiLCB0eXBlOlwibW9vblwiLHNtYToxLjA3MDQxMmU5LG1hc3M6MS40ODE5ZTIzLGFub21hbHlBdEVwb2NoOjAscGFyZW50OlwianVwaXRlclwifSxcclxuICAgICAgICB7bmFtZTpcInN0YXRpb25cIiwgdHlwZTpcInN0YXRpb25cIixzbWE6MTAscGFyZW50OlwiY2FsbGlzdG9cIn0sXHJcbiAgICB7bmFtZTpcImVhcnRoXCIsIHR5cGU6XCJwbGFuZXRcIiwgc21hOjEuNDk2ZTExLCBtYXNzOjUuOTcyM2UyNCwgYW5vbWFseUF0RXBvY2g6MTI5LjU1LCBwYXJlbnQ6XCJzdW5cIn0sXHJcbiAgICAgIHtuYW1lOlwiaXNzXCIsIHR5cGU6XCJzdGF0aW9uXCIsc21hOjYuNzgwZTYsbWFzczo1ZTUscGFyZW50OlwiZWFydGhcIn0sXHJcbiAgICB7bmFtZTpcIm1hcnNcIiwgdHlwZTpcInBsYW5ldFwiLHNtYToyLjI3OTJlMTEsbWFzczo2LjQxNzFlMjMsYW5vbWFseUF0RXBvY2g6MjUuMjcscGFyZW50Olwic3VuXCJ9LFxyXG5cclxuLyogRWFydGggTWVhbiBPcmJpdGFsIEVsZW1lbnRzIChKMjAwMClcclxuICBTZW1pbWFqb3IgYXhpcyAoQVUpICAgICAgICAgICAgICAgICAgMS4wMDAwMDAxMSAgXHJcbiAgT3JiaXRhbCBlY2NlbnRyaWNpdHkgICAgICAgICAgICAgICAgIDAuMDE2NzEwMjIgICBcclxuICBPcmJpdGFsIGluY2xpbmF0aW9uIChkZWcpICAgICAgICAgICAgMC4wMDAwNSAgXHJcbiAgTG9uZ2l0dWRlIG9mIGFzY2VuZGluZyBub2RlIChkZWcpICAtMTEuMjYwNjQgIFxyXG4gIExvbmdpdHVkZSBvZiBwZXJpaGVsaW9uIChkZWcpICAgICAgMTAyLjk0NzE5ICBcclxuICBNZWFuIExvbmdpdHVkZSAoZGVnKSAgICAgICAgICAgICAgIDEwMC40NjQzNVxyXG4gXHJcblxyXG4gTWFycyBvcmJpdGFsIGVsZW1lbnRzXHJcbiAgU2VtaW1ham9yIGF4aXMgKEFVKSAgICAgICAgICAgICAgICAgIDEuNTIzNjYyMzEgIFxyXG4gIE9yYml0YWwgZWNjZW50cmljaXR5ICAgICAgICAgICAgICAgICAwLjA5MzQxMjMzICAgXHJcbiAgT3JiaXRhbCBpbmNsaW5hdGlvbiAoZGVnKSAgICAgICAgICAgIDEuODUwNjEgICBcclxuICBMb25naXR1ZGUgb2YgYXNjZW5kaW5nIG5vZGUgKGRlZykgICA0OS41Nzg1NCAgXHJcbiAgTG9uZ2l0dWRlIG9mIHBlcmloZWxpb24gKGRlZykgICAgICAzMzYuMDQwODQgICBcclxuICBNZWFuIExvbmdpdHVkZSAoZGVnKSAgICAgICAgICAgICAgIDM1NS40NTMzMlxyXG4gICovXHJcblxyXG5cclxuICAvLyBrZXJib2wgdGVzdCBkYXRhc2V0XHJcbiAge25hbWU6XCJrZXJib2xcIiwgdHlwZTpcInN1blwiLHNtYTowLG1hc3M6MS43NWUyOH0sXHJcbiAgICB7bmFtZTpcImtlcmJpblwiLHR5cGU6XCJwbGFuZXRcIixzbWE6MTM1OTk4NDAyNTYsbWFzczo1LjI5ZTIyLHBhcmVudDpcImtlcmJvbFwifSxcclxuICAgICAge25hbWU6XCJrZXJiYWxcIixzbWE6NzAwMDAwLG1hc3M6MTAwLHBhcmVudDpcImtlcmJpblwifSxcclxuICAgIHtuYW1lOlwiZHVuYVwiLCB0eXBlOlwicGxhbmV0XCIsc21hOjIwNzI2MTU1MjY0LG1hc3M6NC41MTVlMjEscGFyZW50Olwia2VyYm9sXCJ9LFxyXG4gICAgICB7bmFtZTpcImRlc3RpbmF0aW9uXCIsc21hOjcwMDAwMCxtYXNzOjEwMCxwYXJlbnQ6XCJkdW5hXCJ9LFxyXG5dXHJcblxyXG5zb2xhclN5c3RlbS5mb3JFYWNoKGJvZHkgPT4ge2JvZHkuZXBvY2ggPSB0aW1lLmN1cnJlbnR9KVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7c29sYXJTeXN0ZW06c29sYXJTeXN0ZW19IiwiY29uc3QgRGV4aWUgPSByZXF1aXJlKCdkZXhpZScpXHJcbmNvbnN0IGRhdGEgPSByZXF1aXJlKCcuL2RhdGEuanMnKVxyXG5jb25zdCBkYiA9IG5ldyBEZXhpZSgnam92aWFuV2VlaycpO1xyXG5cclxuZGIudmVyc2lvbigxKS5zdG9yZXMoe1xyXG4gICAgdW5pdmVyc2U6J25hbWUnLFxyXG59KTtcclxuXHJcbmRiLm9uKFwicG9wdWxhdGVcIiwgZnVuY3Rpb24oKSB7XHJcbiAgY29uc29sZS5sb2coJ3BvcHVsYXRlJylcclxuICBkYi51bml2ZXJzZS5idWxrQWRkKGRhdGEuc29sYXJTeXN0ZW0pXHJcbn0pO1xyXG5cclxuZGIub3BlbigpLmNhdGNoKGZ1bmN0aW9uIChlKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKFwiT3BlbiBmYWlsZWQ6IFwiICsgZSk7XHJcbn0pO1xyXG5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGIiLCJjb25zdCBnYW1lID0geyAvLyBxdWljayBhY2Nlc3MgdG8gbW9kdWxlc1xyXG4gIHN5c3RlbTogcmVxdWlyZSgnLi9zeXN0ZW0uanMnKSxcclxuICBvcmJpdDogcmVxdWlyZSgnLi91dGlscy9vcmJpdC5qcycpLFxyXG4gIHRlcm1pbmFsOiByZXF1aXJlKCcuL3Rlcm1pbmFsLmpzJyksXHJcbiAgdGltZTogcmVxdWlyZSgnLi91dGlscy90aW1lLmpzJyksXHJcbiAgcGxheWVyOiByZXF1aXJlKCcuL3BsYXllci5qcycpLFxyXG4gIGNvbW1hbmRzOiByZXF1aXJlKCcuL2NvbW1hbmRzLycpLFxyXG4gIGxvY2F0aW9uOiByZXF1aXJlKCcuL2xvY2F0aW9uLmpzJyksXHJcbiAgZGI6IHJlcXVpcmUoJy4vZGIvJyksXHJcbn1cclxuXHJcbndpbmRvdy5qb3ZpYW5XZWVrID0gZ2FtZVxyXG5tb2R1bGUuZXhwb3J0cyA9IGdhbWUiLCJjb25zdCBwbGF5ZXIgPSByZXF1aXJlKCcuL3BsYXllci5qcycpXHJcblxyXG5jb25zdCBsb2NhdGlvbiA9IHtcclxuICB1bml2ZXJzZTp7fSxcclxuXHJcbiAgLy8gUmV0dXJucyBhIHdlbGwgZm9ybWF0dGVkIGRpc3RhbmNlLCBpbnB1dCBpcyBpbiBtZXRlcnNcclxuICBnZXRGb3JtYXR0ZWREaXN0YW5jZTogZnVuY3Rpb24oZGlzdGFuY2UpIHtcclxuICAgIGxldCB1bml0ID0gXCIgbVwiXHJcbiAgICBpZihkaXN0YW5jZSA+IDFlNikge1xyXG4gICAgICBkaXN0YW5jZSA9IE1hdGgucm91bmQoZGlzdGFuY2UvMTAwMClcclxuICAgICAgdW5pdCA9IFwiIGttXCJcclxuICAgIH1cclxuICAgIHJldHVybiAoZGlzdGFuY2UgKyB1bml0KS5yZXBsYWNlKC8oXFxkKSg/PShcXGR7M30pKyg/IVxcZCkpL2csIFwiJDEgXCIpXHJcbiAgfSxcclxuXHJcbiAgLy9UT0RPIE1vc3QgY2VsZXN0aWFsIGJvZGllcyBcIm9uIHJhaWxzXCIgc2hvdWxkIHByb2JhYmx5IGJlIGxlZnQgYWxvbmUgZHVyaW5nIHRoZSBzYXZlL2xvYWQgY3ljbGVcclxuICAvL1RPRE8gT25seSBzYXZlIHNoaXBzIHRvIGRiID9cclxuICAvL1RPRE8gT25seSBzYXZlIHVwZGF0ZWQgYm9kaWVzIHRvIGRiID9cclxuICAvL1RPRE8gbW92ZSB0byBhIGxvYWQgLyBzYXZlIHN5c3RlbVxyXG4gIGxvYWQ6ZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgZm9yKGxldCBib2R5IG9mIGRhdGEpIHtcclxuICAgICAgaWYoIXRoaXMudW5pdmVyc2VbYm9keS5uYW1lXSkgdGhpcy51bml2ZXJzZVtib2R5Lm5hbWVdID0ge31cclxuXHJcbiAgICAgIGlmKGJvZHkucGFyZW50ICE9IG51bGwpIHtcclxuICAgICAgICBpZighdGhpcy51bml2ZXJzZVtib2R5LnBhcmVudF0pIHRoaXMudW5pdmVyc2VbYm9keS5wYXJlbnRdID0ge31cclxuICAgICAgICBsZXQgcGFyZW50ID0gdGhpcy51bml2ZXJzZVtib2R5LnBhcmVudF1cclxuICAgICAgICBib2R5LnBhcmVudCA9IHBhcmVudFxyXG4gICAgICAgIGlmKCFwYXJlbnQuY2hpbGRyZW4pIHBhcmVudC5jaGlsZHJlbiA9IHt9XHJcbiAgICAgICAgcGFyZW50LmNoaWxkcmVuW2JvZHkubmFtZV0gPSB0aGlzLnVuaXZlcnNlW2JvZHkubmFtZV1cclxuICAgICAgfVxyXG5cclxuICAgICAgT2JqZWN0LmFzc2lnbih0aGlzLnVuaXZlcnNlW2JvZHkubmFtZV0sIGJvZHkpIC8vIGFkZGluZyBwcm9wZXJ0aWVzXHJcbiAgICB9XHJcbiAgICBwbGF5ZXIuc2hpcCA9IHRoaXMudW5pdmVyc2UucGxheWVyXHJcbiAgfSxcclxuICBcclxuICBzYXZlOmZ1bmN0aW9uKCkge1xyXG4gICAgY29uc3QgdGVtcFVuaXZlcnNlID0gW11cclxuICAgIGZvcihsZXQgbmFtZSBpbiB0aGlzLnVuaXZlcnNlKSB7XHJcbiAgICAgIGxldCB0ZW1wID0gT2JqZWN0LmFzc2lnbih7fSx0aGlzLnVuaXZlcnNlW25hbWVdKVxyXG4gICAgICBpZih0ZW1wLnBhcmVudCkgdGVtcC5wYXJlbnQgPSB0ZW1wLnBhcmVudC5uYW1lXHJcbiAgICAgIGlmKHRlbXAuY2hpbGRyZW4pIGRlbGV0ZSB0ZW1wLmNoaWxkcmVuXHJcbiAgICAgIHRlbXBVbml2ZXJzZS5wdXNoKHRlbXApXHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGVtcFVuaXZlcnNlXHJcbiAgfSxcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBsb2NhdGlvbiIsImNvbnN0IHBsYXllciA9IHtcclxuICBzaGlwOnt9LCAvLyBzZXQgYWZ0ZXIgbG9hZCA/XHJcbiAgbmFtZTogXCJqZWRcIixcclxuICBzdGF0dXM6IFwib3JiaXRpbmdcIixcclxuICBkZWx0YXY6IDEwMCxcclxuICBiYWxhbmNlOiAxNTY0NTYwMDAsXHJcbiAgaHVsbDogMTAwLFxyXG4gIHRha2VEYW1hZ2U6IGZ1bmN0aW9uKGRhbWFnZSkgeyB0aGlzLmh1bGwgLT0gMTA7IGdhbWUudGVybS5lY2hvKCdbWztyZWQ7XVRvb2sgJytkYW1hZ2UrJyBkYW1hZ2UhXScpfSxcclxuICBjYW5Eb2NrOiBmdW5jdGlvbigpIHsgcmV0dXJuICh1bml2ZXJzZVtnYW1lLnBsYXllci5sb2NhdGlvbl0udHlwZSA9PSBcInN0YXRpb25cIil9LFxyXG4gIGRvY2s6IGZ1bmN0aW9uKCkge30sXHJcbiAgdW5kb2NrOiBmdW5jdGlvbigpIHt9LFxyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXllciIsImNvbnN0IHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyLmpzJylcclxuY29uc3QgdGltZSA9IHJlcXVpcmUoJy4vdXRpbHMvdGltZS5qcycpXHJcbmNvbnN0IGxvY2F0aW9uID0gcmVxdWlyZSgnLi9sb2NhdGlvbi5qcycpXHJcbmNvbnN0IGRiID0gcmVxdWlyZSgnLi9kYi5qcycpXHJcblxyXG5jb25zdCBzeXN0ZW0gPSB7XHJcbiAgdXBkYXRlRGVsdGE6IDI1MDAsIC8vIHRpbWUgYmV0d2VlbiB1cGRhdGVzIGluIG1zXHJcbiAgZXBvY2g6MCxcclxuICBydW5BdFVwZGF0ZTogW10sXHJcbiAgbGFzdFNhdmU6MCxcclxuICBzYXZlRGVsdGE6MzAwMDAsIC8vIHRpbWUgYmV0d2VlbiBhdXRvc2F2ZXMgaW4gbXNcclxuXHJcbiAgXHJcbiAgc2F2ZTogZnVuY3Rpb24oKSB7XHJcbiAgICBjb25zb2xlLmxvZygnc2F2aW5nJylcclxuICAgIGRiLnVuaXZlcnNlLmJ1bGtQdXQobG9jYXRpb24uc2F2ZSgpKVxyXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJzYXZlXCIsSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBuYW1lOiBwbGF5ZXIubmFtZSxcclxuICAgICAgbG9jYXRpb246IHBsYXllci5sb2NhdGlvbixcclxuICAgICAgc3RhdHVzOiBwbGF5ZXIuc3RhdHVzLFxyXG4gICAgICBkZWx0YXY6IHBsYXllci5kZWx0YXYsXHJcbiAgICAgIGJhbGFuY2U6IHBsYXllci5iYWxhbmNlLFxyXG4gICAgICBodWxsOiBwbGF5ZXIuaHVsbCxcclxuICAgIH0pKVxyXG4gIH0sXHJcblxyXG5cclxuICBsb2FkOiBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCdsb2FkaW5nJylcclxuICAgIGRiLnVuaXZlcnNlLnRvQXJyYXkoKS50aGVuKGRhdGEgPT4ge1xyXG4gICAgICBsb2NhdGlvbi5sb2FkKGRhdGEpXHJcbiAgICB9KVxyXG5cclxuICAgIHZhciBzYXZlRGF0YSA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJzYXZlXCIpKVxyXG4gICAgaWYoIXNhdmVEYXRhKSB7IHJldHVybiB9XHJcbiAgICB0aGlzLmVwb2NoID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgIHBsYXllci5uYW1lID0gc2F2ZURhdGEubmFtZVxyXG4gICAgcGxheWVyLmxvY2F0aW9uID0gc2F2ZURhdGEubG9jYXRpb25cclxuICAgIHBsYXllci5zdGF0dXMgPSBzYXZlRGF0YS5zdGF0dXNcclxuICAgIHBsYXllci5kZWx0YXYgPSBzYXZlRGF0YS5kZWx0YXZcclxuICAgIHBsYXllci5iYWxhbmNlID0gc2F2ZURhdGEuYmFsYW5jZVxyXG4gICAgcGxheWVyLmh1bGwgPSBzYXZlRGF0YS5odWxsXHJcbiAgfSxcclxuXHJcblxyXG4gIC8vIFVwZGF0ZSBsb29wXHJcbiAgXHJcbiAgYWRkVG9VcGRhdGU6IGZ1bmN0aW9uKGYpIHtcclxuICAgIGlmKCB0eXBlb2YgZiA9PSBcImZ1bmN0aW9uXCIpIHRoaXMucnVuQXRVcGRhdGUucHVzaChmKVxyXG4gIH0sXHJcbiAgdXBkYXRlOiBmdW5jdGlvbigpIHtcclxuICAgIGNvbnNvbGUubG9nKCd1cGRhdGUnKVxyXG5cclxuICAgIGZvcihsZXQgZiBvZiBzeXN0ZW0ucnVuQXRVcGRhdGUpIHsgZigpIH0gLy8gXHJcblxyXG5cclxuICAgIC8vIFJ1biBhdXRvc2F2ZVxyXG4gICAgc3lzdGVtLmxhc3RTYXZlICs9IHN5c3RlbS51cGRhdGVEZWx0YVxyXG4gICAgaWYoc3lzdGVtLmxhc3RTYXZlID49IHN5c3RlbS5zYXZlRGVsdGEpIHtcclxuICAgICAgc3lzdGVtLmxhc3RTYXZlID0gMFxyXG4gICAgICBzeXN0ZW0uc2F2ZSgpXHJcbiAgICB9XHJcblxyXG5cclxuICAgIHNldFRpbWVvdXQoc3lzdGVtLnVwZGF0ZSwgc3lzdGVtLnVwZGF0ZURlbHRhKTsgLy8gTmV4dCBsb29wXHJcbiAgfSxcclxuXHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gc3lzdGVtIiwiY29uc3QgcGxheWVyID0gcmVxdWlyZSgnLi9wbGF5ZXIuanMnKVxyXG5jb25zdCBzeXN0ZW0gPSByZXF1aXJlKCcuL3N5c3RlbS5qcycpXHJcbmNvbnN0IGNvbW1hbmRzID0gcmVxdWlyZSgnLi9jb21tYW5kcy8nKVxyXG5cclxuY29uc3Qgb3B0aW9ucyA9IHtcclxuICBwcm9tcHQ6IGZ1bmN0aW9uKGUpIHtlKGBbWztncmVlbjtdJHtwbGF5ZXIuc3RhdHVzfV1AW1s7Izc3NztdJHtwbGF5ZXIubG9jYXRpb259XT5gKX0sXHJcbiAgZ3JlZXRpbmdzOiBmdW5jdGlvbihjYWxsYmFjaykge2NhbGxiYWNrKGBXZWxjb21lIHRvIEpvdmlhbiBXZWVrICR7cGxheWVyLm5hbWV9YCl9LFxyXG4gIG9uQmx1cjogZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZSB9LFxyXG4gIG9uQWZ0ZXJDb21tYW5kOiBmdW5jdGlvbihlKSB7IHN5c3RlbS5zYXZlKCkgfSxcclxuICBjb21wbGV0aW9uOiBmdW5jdGlvbihzdHJpbmcsIGNhbGxiYWNrKSB7IC8vVE9ETyBhZGQgc3VwcG9ydCBmb3IgYXJndW1lbnRzIGF1dG9jb21wbGV0ZVxyXG4gICAgY29uc3Qgc3VnZ2VzdGlvbnMgPSBbXVxyXG4gICAgZm9yKGxldCBuYW1lIGluIGNvbW1hbmRzKSB7XHJcbiAgICAgIGlmKCFjb21tYW5kc1tuYW1lXS5pc0FsbG93ZWQgfHwgY29tbWFuZHNbbmFtZV0uaXNBbGxvd2VkKCkpIHtcclxuICAgICAgICBzdWdnZXN0aW9ucy5wdXNoKG5hbWUpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGNhbGxiYWNrKHN1Z2dlc3Rpb25zKVxyXG4gIH0sXHJcbiAgLy9rZXlkb3duOiBmdW5jdGlvbihlLCB0ZXJtKSB7IGlmKGdhbWUuYmxvY2tlZCkgcmV0dXJuIGZhbHNlO30sXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGludGVycHJldGVyKGNvbW1hbmQsdGVybSkge1xyXG4gIGNvbnN0IGNtZCA9IHRlcm1pbmFsLnV0aWxzLnBhcnNlX2NvbW1hbmQoY29tbWFuZClcclxuICAgIFxyXG4gIGlmKCBjb21tYW5kc1tjbWQubmFtZV0gKSB7XHJcbiAgICBpZiggIWNvbW1hbmRzW2NtZC5uYW1lXS5pc0FsbG93ZWQgfHwgY29tbWFuZHNbY21kLm5hbWVdLmlzQWxsb3dlZCgpICkge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiB0ZXJtLmVjaG8oIGNvbW1hbmRzW2NtZC5uYW1lXS5ydW4oY21kLnJlc3QpIClcclxuICAgICAgfSBjYXRjaChlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcihlKVxyXG4gICAgICAgIHJldHVybiB0ZXJtLmVycm9yKGUudG9TdHJpbmcoKSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdGVybS5lcnJvcihcIkNvbW1hbmQgbm90IHJlY29nbml6ZWRcIilcclxufVxyXG5cclxuXHJcbmNvbnN0IHRlcm1pbmFsID0ge30gLy8gUHJvdmlkZXMgdXRpbHMgYW5kIG1haW4gKGluc3RhbmNlKSwgYnV0IG9ubHkgYWZ0ZXIgaW5pdGlhbGl6YXRpb25cclxuXHJcbmpRdWVyeShkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oJCkge1xyXG4gICQoJyNjb25zb2xlJykudGVybWluYWwoaW50ZXJwcmV0ZXIsIG9wdGlvbnMpXHJcbiAgc3lzdGVtLmxvYWQoKVxyXG4gIHN5c3RlbS51cGRhdGUoKVxyXG4gIHRlcm1pbmFsLnV0aWxzID0gJC50ZXJtaW5hbFxyXG4gIHRlcm1pbmFsLm1haW4gPSAkKCcjY29uc29sZScpLnRlcm1pbmFsKClcclxufSlcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHRlcm1pbmFsIiwiY29uc3QgdGltZSA9IHJlcXVpcmUoJy4vdGltZS5qcycpXHJcblxyXG5jb25zdCBvcmJpdCA9IHtcclxuXHJcbiAgLy8gdG9vbHMgdG8gY29tcHV0ZSBvcmJpdCBhbmQgdHJhbnNmZXIgcGFyYW1ldGVyc1xyXG4gIGdldEdyYXZpdGF0aW9uYWxQYXJhbWV0ZXI6IGZ1bmN0aW9uKGJvZHkpIHsgcmV0dXJuIDYuNjc0MDhlLTExICogYm9keS5tYXNzIH0sXHJcblxyXG5cclxuICAvL2dldCBvcmJpdGFsIHBlcmlvZCBpbiBzLCBzbWEgaW4gbSwgbWFzcyBpbiBrZ1xyXG4gIGdldFBlcmlvZDogZnVuY3Rpb24oYm9keSkgeyBcclxuICAgIHJldHVybiAyICogTWF0aC5QSSAqIE1hdGguc3FydCggTWF0aC5wb3coYm9keS5zbWEsMykgLyB0aGlzLmdldEdyYXZpdGF0aW9uYWxQYXJhbWV0ZXIoYm9keS5wYXJlbnQpICk7XHJcbiAgfSxcclxuXHJcblxyXG4gIGdldFZlbG9jaXR5OiBmdW5jdGlvbihib2R5KSB7IFxyXG4gICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmdldEdyYXZpdGF0aW9uYWxQYXJhbWV0ZXIoYm9keS5wYXJlbnQpL2JvZHkuc21hKSBcclxuICB9LFxyXG4gIFxyXG5cclxuICAvLyBSZXR1cm5zIHRoZSBjdXJyZW50IGFuZ2xlIGluIGRlZ3JlZXMgYmV0d2VlbiBwZXJpYXBzaXMgYW5kIHRoZSBib2R5J3MgcG9zaXRpb25cclxuICBnZXRNZWFuQW5vbWFseTogZnVuY3Rpb24oYm9keSwgdD10aW1lLmN1cnJlbnQpIHtcclxuICAgIC8vIE1lYW4gbW90aW9uXHJcbiAgICBsZXQgbiA9IE1hdGguc3FydCggdGhpcy5nZXRHcmF2aXRhdGlvbmFsUGFyYW1ldGVyKGJvZHkucGFyZW50KSAvIE1hdGgucG93KGJvZHkuc21hLDMpIClcclxuXHJcbiAgICBsZXQgTSA9IChib2R5LmFub21hbHlBdEVwb2NoICsgbiAqICh0IC0gYm9keS5lcG9jaCkpJSgyKk1hdGguUEkpXHJcbi8qXHJcbiAgICBsZXQgdGltZVNpbmNlRXBvY2ggPSBib2R5LmVwb2NoIC0gdGltZVxyXG4gICAgbGV0IHBlcmlvZCA9IHRoaXMuZ2V0UGVyaW9kKGJvZHkpXHJcbiAgICBsZXQgdGltZUluTGFzdE9yYml0ID0gdGltZVNpbmNlRXBvY2ggJSBwZXJpb2RcclxuICAgIGxldCBhbmdsZUluTGFzdE9yYml0ID0gdGltZUluTGFzdE9yYml0IC8gcGVyaW9kICogMzYwXHJcbiAgICBsZXQgY3VycmVudEFub21hbHkgPSAoYm9keS5hbm9tYWx5QXRFcG9jaCArIGFuZ2xlSW5MYXN0T3JiaXQpICUgMzYwKi9cclxuICAgIHJldHVybiBNXHJcbiAgfSxcclxuXHJcblxyXG4gIC8vIHJldHVybnMgdGhlIGVjY2VudHJpYyBhbm9tbHkgaW4gZ3JhZGlhbnNcclxuICBnZXRFY2NlbnRyaWNBbm9tYWx5OiBmdW5jdGlvbihib2R5LCB0PXRpbWUuY3VycmVudCkge1xyXG4gICAgLy8gc2hvdWxkIGdvIGludG8gdGhlIGdldCBtZWFuIGFub21hbHkgZnVuY3Rpb25cclxuICAgIGxldCBuID0gTWF0aC5zcXJ0KCB0aGlzLmdldEdyYXZpdGF0aW9uYWxQYXJhbWV0ZXIoYm9keS5wYXJlbnQpIC8gTWF0aC5wb3coYm9keS5zbWEsMykgKVxyXG4gICAgbGV0IE0gPSBib2R5LmFub21hbHlBdEVwb2NoICsgbiAqICh0IC0gYm9keS5lcG9jaClcclxuXHJcbiAgICB2YXIgzrUgPSAxZS0xOFxyXG4gICAgdmFyIG1heEl0ZXIgPTEwMFxyXG4gICAgdmFyIEVcclxuICAgIHZhciBlID0gYm9keS5lY2NlbnRyaWNpdHlcclxuICAgIC8vdmFyIE0gPSB0aGlzLmdldE1lYW5Bbm9tYWx5KGJvZHksZXBvY2gpXHJcblxyXG4gICAgaWYgKGUgPCAwLjgpIHtcclxuICAgICAgRSA9IE07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBFID0gTWF0aC5QSTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZEUgPSAxLFxyXG4gICAgICAgIGkgPSAwO1xyXG4gICAgd2hpbGUgKE1hdGguYWJzKGRFKSA+IM61ICYmIGkgPCBtYXhJdGVyKSB7XHJcbiAgICAgIGRFID0gKE0gKyBlICogTWF0aC5zaW4oRSkgLSBFKSAvICgxIC0gZSAqIE1hdGguY29zKEUpKTtcclxuICAgICAgRSA9IEUgKyBkRTtcclxuICAgICAgaSsrO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBFO1xyXG4gIH0sXHJcblxyXG5cclxuICBnZXRUcnVlQW5vbWFseTogZnVuY3Rpb24oYm9keSwgZXBvY2g9Z2FtZS5lcG9jaCkge1xyXG4gICAgcmV0dXJuIGVwb2NoXHJcbiAgfSxcclxuXHJcbiAgLy8gcmV0dXJucyB0aGUgcGhhc2UgYW5nbGUgKGluIGRlZ3JlZXMpIGJldHdlZW4gdGhlIG9yaWdpbiBib2R5IGFuZCB0aGUgZGVzdGluYXRpb24gYm9keVxyXG4gIGdldFBoYXNlQW5nbGU6IGZ1bmN0aW9uKG9yaWdpbiwgZGVzdGluYXRpb24pIHtcclxuICAgIC8vIG1pZ2h0IG5lZWQgdG8gYmUgY2hhbmdlZCBhZnRlciBlY2NlbnRyaWNpdHkgYW5kIGluY2xpbmF0aW9uIGFyZSBhZGRlZFxyXG4gICAgcmV0dXJuIHRoaXMuZ2V0TWVhbkFub21hbHkoZGVzdGluYXRpb24pIC0gdGhpcy5nZXRNZWFuQW5vbWFseShvcmlnaW4pXHJcbiAgfSxcclxuXHJcbiAgZ2V0U3lub2RpY1BlcmlvZDogZnVuY3Rpb24oYm9keSwgYm9keTIpIHtcclxuICAgIGxldCBpbnZfcGVyaW9kID0gMS90aGlzLmdldFBlcmlvZChib2R5KSAtIDEvdGhpcy5nZXRQZXJpb2QoYm9keTIpXHJcbiAgICByZXR1cm4gTWF0aC5hYnMoMS9pbnZfcGVyaW9kKVxyXG4gIH0sXHJcblxyXG5cclxuICBnZXRUcmFuc2ZlclBoYXNlQW5nbGUoZnJvbSx0bykge1xyXG4gICAgcmV0dXJuICgxIC0gTWF0aC5wb3coKGZyb20uc21hICsgdG8uc21hKS8oMip0by5zbWEpLDEuNSkpICogMTgwXHJcbiAgfSxcclxuXHJcbiAgLy8gY29tcHV0ZSBhIGhvaG1hbm4gdHJhbnNmZXIgZnJvbSB0aGUgb3JpZ2luIG9yYml0IHRvIHRoZSBkZXN0aW5hdGlvbiBvcmJpdFxyXG4gIC8vIFxyXG4gIC8vIE9yYml0cyBtdXN0IGJlIGFyb3VuZCBkaWZmZXJlbnQgYm9kaWVzLCBidXQgd2l0aCB0aGUgc2FtZSBwYXJlbnRcclxuICBnZXRUcmFuc2ZlcjogZnVuY3Rpb24oZnJvbSx0bykge1xyXG4gICAgLy8gdmFyaWFibGVzIHVzZWQgaW4gY29tcHV0YXRpb25cclxuICAgIGxldCBvcmlnaW4gPSBmcm9tLnBhcmVudCAvLyBvcmlnaW4gYm9keVxyXG4gICAgbGV0IGRlc3RpbmF0aW9uID0gdG8ucGFyZW50IC8vIGRlc3RpbmF0aW9uIGJvZHlcclxuICAgIGxldCBhXzEgPSBmcm9tLnNtYSAvLyBzbWEgYXQgb3JpZ2luIG9yYml0XHJcbiAgICBsZXQgYV8yID0gdG8uc21hIC8vIHNtYSBhdCBkZXN0aW5hdGlvbiBvcmJpdFxyXG4gICAgbGV0IHJfMSA9IG9yaWdpbi5zbWEgLy8gc21hIG9mIHRoZSBvcmlnaW4gYm9keVxyXG4gICAgbGV0IHJfMiA9IGRlc3RpbmF0aW9uLnNtYSAvLyBzbWEgb2YgdGhlIGRlc3RpbmF0aW9uIGJvZHlcclxuICAgIGxldCBtdV9wID0gdGhpcy5nZXRHcmF2aXRhdGlvbmFsUGFyYW1ldGVyKG9yaWdpbi5wYXJlbnQpXHJcbiAgICBsZXQgbXVfMSA9IHRoaXMuZ2V0R3Jhdml0YXRpb25hbFBhcmFtZXRlcihvcmlnaW4pXHJcbiAgICBsZXQgbXVfMiA9IHRoaXMuZ2V0R3Jhdml0YXRpb25hbFBhcmFtZXRlcihkZXN0aW5hdGlvbilcclxuXHJcbiAgICBsZXQgdHJhbnNmZXJUaW1lID0gTWF0aC5QSSAqIE1hdGguc3FydCggTWF0aC5wb3cocl8xK3JfMiwzKS8oOCptdV9wKSApXHJcblxyXG4gICAgbGV0IHBoYXNlQW5nbGUgPSAoMSAtIE1hdGgucG93KChyXzEgKyByXzIpLygyKnJfMiksMS41KSkgKiAxODBcclxuXHJcbiAgICAvLyBJbmplY3Rpb24gdmVsb2NpdHlcclxuICAgIGxldCB2X2gxID0gTWF0aC5zcXJ0KCAyKm11X3Aqcl8yIC8gKHJfMSoocl8xK3JfMikpICkgLy8gc3BlZWQgb2YgaG9obWFuIHRyYW5zZmVyIGF0IHN0YXJ0XHJcbiAgICBsZXQgdl90MSA9IHZfaDEgLSB0aGlzLmdldFZlbG9jaXR5KG9yaWdpbikgLy8gdmVsb2NpdHkgY2hhbmdlIGF0IGRlcGFydHVyZVxyXG4gICAgbGV0IHZfZXNjYXBlID0gTWF0aC5zcXJ0KCB2X3QxKnZfdDEgKyAyKm11XzEvYV8xICkgLy8gdmVsb2NpdHkgYXQgZGVwYXJ0dXJlIGVzY2FwZVxyXG4gICAgbGV0IHZfaW5qZWN0aW9uID0gdl9lc2NhcGUgLSB0aGlzLmdldFZlbG9jaXR5KGZyb20pIC8vIGluamVjdGlvbiBkZWx0YSB2XHJcblxyXG4gICAgLy8gSW5zZXJ0aW9uIHZlbG9jaXR5XHJcbiAgICBsZXQgdl9oMiA9IE1hdGguc3FydCggMiptdV9wKnJfMSAvIChyXzIqKHJfMStyXzIpKSApIC8vIHNwZWVkIG9mIGhvaG1hbm4gdHJhbnNmZXIgYXQgdGFyZ2V0XHJcbiAgICBsZXQgdl90MiA9IHZfaDIgLSB0aGlzLmdldFZlbG9jaXR5KGRlc3RpbmF0aW9uKSAvLyB2ZWxvY2l0eSBjaGFuZ2UgYXQgdGFyZ2V0XHJcbiAgICBsZXQgdl9jYXB0dXJlID0gTWF0aC5zcXJ0KCB2X3QyKnZfdDIgKyAyKm11XzIvYV8yICkgLy8gdmVsb2NpdHkgYXQgdGFyZ2V0IGNhcHR1cmVcclxuICAgIGxldCB2X2luc2VydGlvbiA9IHZfY2FwdHVyZSAtIHRoaXMuZ2V0VmVsb2NpdHkodG8pXHJcbiAgICBsZXQgdl90b3RhbCA9IHZfaW5qZWN0aW9uICsgdl9pbnNlcnRpb25cclxuXHJcbiAgICBsZXQgZXRhID0gdl9lc2NhcGUqdl9lc2NhcGUvMiAtIG11XzEvYV8xXHJcbiAgICBsZXQgZSA9IE1hdGguc3FydCggMSArIDIqZXRhKmFfMSphXzEqdl9lc2NhcGUqdl9lc2NhcGUvKG11XzEqbXVfMSkgKVxyXG4gICAgbGV0IGVqZWN0aW9uQW5nbGUgPSAxODAgLSBNYXRoLmFjb3MoMS9lKSAqICgxODAvTWF0aC5QSSkgLy8gQW5nbGUgb2YgYnVybiB0byBvcmlnaW4ncyBwcm9ncmFkZVxyXG5cclxuICAgIGNvbnNvbGUubG9nKFwiVHJhbnNmZXIgdGltZSA6IFwiICsgdGhpcy50aW1lVG9TdHJpbmcodHJhbnNmZXJUaW1lKSlcclxuICAgIGNvbnNvbGUubG9nKFwiUGhhc2UgYW5nbGUgOiBcIiArIHBoYXNlQW5nbGUpXHJcbiAgICBjb25zb2xlLmxvZyhcIkluamVjdGlvbiBkZWx0YSB2IDogXCIgK3ZfaW5qZWN0aW9uKyBcIm0vc1wiKVxyXG4gICAgY29uc29sZS5sb2coXCJFc2NhcGUgdmVsb2NpdHkgOiBcIiArdl9lc2NhcGUpXHJcbiAgICBjb25zb2xlLmxvZyhcImUgOiBcIiArIGUpXHJcbiAgICBjb25zb2xlLmxvZyhcImVqZWN0aW9uQW5nbGUgOiBcIiArIGVqZWN0aW9uQW5nbGUpXHJcbiAgICBjb25zb2xlLmxvZyhcIkluc2VydGlvbiBkZWx0YSB2IDogXCIgK3ZfaW5zZXJ0aW9uKVxyXG4gICAgY29uc29sZS5sb2coXCJUb3RhbCBkZWx0YSB2IDogXCIgKyB2X3RvdGFsKVxyXG5cclxuICAgIGxldCBzbWEgPSAocl8xK3JfMikvMlxyXG4gICAgbGV0IGVjY2VudHJpY2l0eSA9IChyXzEgLSByXzIpLyhyXzErcl8yKVxyXG4gICAgbGV0IGxvd1xyXG4gICAgaWYob3JpZ2luLnNtYSA8IGRlc3RpbmF0aW9uLnNtYSkge1xyXG4gICAgICBlY2NlbnRyaWNpdHkgKj0gLTFcclxuICAgICAgbG93ID0gb3JpZ2luIFxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbG93ID0gZGVzdGluYXRpb25cclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhlY2NlbnRyaWNpdHkpXHJcbiAgICBsZXQgd2luZG93ID0ge1xyXG4gICAgICBwaGFzZUFuZ2xlOiBwaGFzZUFuZ2xlLFxyXG4gICAgICB0cmFuc2ZlclRpbWU6IHRyYW5zZmVyVGltZSxcclxuICAgICAgZWplY3Rpb25BbmdsZTogZWplY3Rpb25BbmdsZSxcclxuICAgICAgdG90YWxEZWx0YVY6IHZfdG90YWwsXHJcbiAgICAgIG9yaWdpbjogb3JpZ2luLFxyXG4gICAgICBkZXN0aW5hdGlvbjogZGVzdGluYXRpb25cclxuICAgIH1cclxuICAgIGxldCBpbmplY3Rpb24gPSB7XHJcbiAgICAgIHR5cGU6XCJ0cmFuc2ZlclwiLFxyXG4gICAgICBzbWE6KHJfMStyXzIpLzIsXHJcbiAgICAgIGVjY2VudHJpY2l0eTplY2NlbnRyaWNpdHksXHJcbiAgICAgIHBhcmVudDpvcmlnaW4ucGFyZW50LFxyXG4gICAgICBhcmd1bWVudE9mUGVyaWFwc2lzOnRoaXMuZ2V0TWVhbkFub21hbHkobG93KSxcclxuICAgICAgYW5vbWFseUF0RXBvY2g6dGhpcy5nZXRNZWFuQW5vbWFseShvcmlnaW4pLFxyXG4gICAgICBlcG9jaDpnYW1lLmN1cnJlbnRUaW1lXHJcbiAgICB9XHJcbiAgICBsZXQgaW5zZXJ0aW9uID0ge1xyXG4gICAgICB0eXBlOlwib3JiaXRcIixcclxuICAgICAgc21hOmFfMixcclxuICAgICAgZWNjZW50cmljaXR5OjAsXHJcbiAgICAgIHBhcmVudDpkZXN0aW5hdGlvbixcclxuICAgICAgYXJndW1lbnRPZlBlcmlhcHNpczowLFxyXG4gICAgICBhbm9tYWx5QXRFcG9jaDowLFxyXG4gICAgICBlcG9jaDpnYW1lLmN1cnJlbnRUaW1lK3RyYW5zZmVyVGltZVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHt3aW5kb3c6d2luZG93LGluamVjdGlvbjppbmplY3Rpb259XHJcbiAgfSxcclxuXHJcblxyXG5cclxuICBnZXROZXh0V2luZG93OiBmdW5jdGlvbihvcmlnaW4sIGRlc3RpbmF0aW9uKSB7XHJcbiAgICAvLyBBc3N1bXB0aW9uIDogQWxsIHBsYW5ldHMgLyBtb29ucyBvcmJpdHMgYXJlIGNpcmN1bGFyIGFuZCBjb3BsYW5hciAhXHJcbiAgICBsZXQgcGhhc2VBbmdsZSA9IHRoaXMuZ2V0VHJhbnNmZXJQaGFzZUFuZ2xlKG9yaWdpbiwgZGVzdGluYXRpb24pXHJcbiAgICBsZXQgYW5ndWxhclNwZWVkT3JpZ2luID0gMzYwIC8gdGhpcy5nZXRQZXJpb2Qob3JpZ2luKVxyXG4gICAgbGV0IGFuZ3VsYXJTcGVlZERlc3RpbmF0aW9uID0gMzYwIC8gdGhpcy5nZXRQZXJpb2QoZGVzdGluYXRpb24pXHJcbiAgICBsZXQgYW5ndWxhclNwZWVkRGlmZmVyZW5jZSA9IGFuZ3VsYXJTcGVlZERlc3RpbmF0aW9uIC0gYW5ndWxhclNwZWVkT3JpZ2luIC8vIGRpZmZlcmVuY2UgaW4gYW5ndWxhciBzcGVlZCBiZXR3ZWVuIHRoZSB0d28gYm9kaWVzXHJcbiAgICBsZXQgY3VycmVudFBoYXNlQW5nbGUgPSB0aGlzLmdldE1lYW5Bbm9tYWx5KGRlc3RpbmF0aW9uKSAtIHRoaXMuZ2V0TWVhbkFub21hbHkob3JpZ2luKVxyXG4gICAgbGV0IHdpbmRvd09wZW5zID0gKHRoaXMuZ2V0VHJhbnNmZXJQaGFzZUFuZ2xlKG9yaWdpbiwgZGVzdGluYXRpb24pIC0gY3VycmVudFBoYXNlQW5nbGUpIC8gYW5ndWxhclNwZWVkRGlmZmVyZW5jZVxyXG4gICAgaWYod2luZG93T3BlbnMgPCAwKSB7XHJcbiAgICAgIHdpbmRvd09wZW5zICs9IHRoaXMuZ2V0U3lub2RpY1BlcmlvZChvcmlnaW4sIGRlc3RpbmF0aW9uKVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coXCJXaW5kb3cgZm9yIHRyYW5zZmVyIG9wZW5zIGluIFwiK3RoaXMudGltZVRvU3RyaW5nKHdpbmRvd09wZW5zKSlcclxuICAgIHJldHVybiB3aW5kb3dPcGVuc1xyXG5cclxuICB9LFxyXG5cclxuICAvLyBUaW1lIGZ1bmN0aW9uc1xyXG4gIC8vIHNob3VsZCBiZSBtb3ZlZCB0byBvd24gbW9kdWxlXHJcbiAgdGltZUluU2Vjb25kczogZnVuY3Rpb24oc3RyaW5nKSB7IC8vIGNvbnZlcnQgYSBzdHJpbmcgbGlrZSBcIjdkMTJoXCIgdG8gYSBudW1iZXIgb2Ygc2Vjb25kc1xyXG4gICAgdmFyIG1hdGNoID0gL14oPzooXFxkKylkKT8oPzooXFxkKyloKT8oPzooXFxkKyltKT8kLy5leGVjKHN0cmluZylcclxuICAgIHZhciByZXMgPSAwO1xyXG4gICAgaWYobWF0Y2hbMV0pIHsgcmVzICs9ICgrbWF0Y2hbMV0gKiAyNCAqIDM2MDApIH1cclxuICAgIGlmKG1hdGNoWzJdKSB7IHJlcyArPSAoK21hdGNoWzJdICogMzYwMCkgfVxyXG4gICAgaWYobWF0Y2hbM10pIHsgcmVzICs9ICgrbWF0Y2hbM10gKiA2MCkgfVxyXG4gICAgcmV0dXJuIHJlc1xyXG4gIH0sIFxyXG4gIGdldFJlbWFpbmluZ1RpbWU6IGZ1bmN0aW9uKHRpbWUpIHsgLy8gcmV0dXJucyB0aGUgbnVtYmVyIG9mIHNlY29uZHMgdW50aWwgdGhlIHNwZWNpZmllZCB0aW1lc3RhbXAgKGluIHNlY29uZHMpXHJcbiAgICByZXR1cm4gdGhpcy50aW1lVG9TdHJpbmcoIHRpbWUgLSBnYW1lLmN1cnJlbnRUaW1lICk7XHJcbiAgfSxcclxuICB0aW1lVG9TdHJpbmc6IGZ1bmN0aW9uKHRpbWUpIHsgLy8gY29udmVydHMgYSB0aW1lIGluIHNlY29uZHMgdG8gYSBuaWNlciBzdHJpbmdcclxuICAgIHZhciBmb3JtYXR0ZWRUaW1lID0gXCJcIlxyXG4gICAgaWYodGltZSA8IDApIHtcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSAnLSdcclxuICAgICAgdGltZSAqPSAtMVxyXG4gICAgfVxyXG4gICAgaWYodGltZSA+PSAzMTUzNjAwMCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUvMzE1MzYwMDApICtcInlcIlxyXG4gICAgICB0aW1lID0gdGltZSAlIDMxNTM2MDAwXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID49IDg2NDAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS84NjQwMCkgK1wiZFwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgODY0MDBcclxuICAgIH1cclxuICAgIGlmKHRpbWUgPj0gMzYwMCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUvMzYwMCkgK1wiaFwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgMzYwMFxyXG4gICAgfVxyXG4gICAgaWYodGltZSA+PSA2MCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUvNjApICtcIm1cIlxyXG4gICAgICB0aW1lID0gdGltZSAlIDYwXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID4gMCkgeyBcclxuICAgICAgZm9ybWF0dGVkVGltZSArPSBNYXRoLmZsb29yKHRpbWUpICtcInNcIlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZvcm1hdHRlZFRpbWVcclxuICB9XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gb3JiaXQiLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuICBjdXJyZW50OjQyLFxyXG4gIGVwb2NoOjAsXHJcblxyXG4gIHRpbWVJblNlY29uZHM6IGZ1bmN0aW9uKHN0cmluZykgeyAvLyBjb252ZXJ0IGEgc3RyaW5nIGxpa2UgXCI3ZDEyaFwiIHRvIGEgbnVtYmVyIG9mIHNlY29uZHNcclxuICAgIHZhciBtYXRjaCA9IC9eKD86KFxcZCspZCk/KD86KFxcZCspaCk/KD86KFxcZCspbSk/JC8uZXhlYyhzdHJpbmcpXHJcbiAgICB2YXIgcmVzID0gMDtcclxuICAgIGlmKG1hdGNoWzFdKSB7IHJlcyArPSAoK21hdGNoWzFdICogMjQgKiAzNjAwKSB9XHJcbiAgICBpZihtYXRjaFsyXSkgeyByZXMgKz0gKCttYXRjaFsyXSAqIDM2MDApIH1cclxuICAgIGlmKG1hdGNoWzNdKSB7IHJlcyArPSAoK21hdGNoWzNdICogNjApIH1cclxuICAgIHJldHVybiByZXNcclxuICB9LCBcclxuXHJcbiAgZ2V0UmVtYWluaW5nVGltZTogZnVuY3Rpb24odGltZSkgeyAvLyByZXR1cm5zIHRoZSBudW1iZXIgb2Ygc2Vjb25kcyB1bnRpbCB0aGUgc3BlY2lmaWVkIHRpbWVzdGFtcCAoaW4gc2Vjb25kcylcclxuICAgIHJldHVybiB0aGlzLnRpbWVUb1N0cmluZyggdGltZSAtIGdhbWUuY3VycmVudFRpbWUgKTtcclxuICB9LFxyXG4gIFxyXG4gIHRpbWVUb1N0cmluZzogZnVuY3Rpb24odGltZSkgeyAvLyBjb252ZXJ0cyBhIHRpbWUgaW4gc2Vjb25kcyB0byBhIG5pY2VyIHN0cmluZ1xyXG4gICAgdmFyIGZvcm1hdHRlZFRpbWUgPSBcIlwiXHJcbiAgICBpZih0aW1lIDwgMCkge1xyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9ICctJ1xyXG4gICAgICB0aW1lICo9IC0xXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID49IDMxNTM2MDAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS8zMTUzNjAwMCkgK1wieVwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgMzE1MzYwMDBcclxuICAgIH1cclxuICAgIGlmKHRpbWUgPj0gODY0MDApIHsgXHJcbiAgICAgIGZvcm1hdHRlZFRpbWUgKz0gTWF0aC5mbG9vcih0aW1lLzg2NDAwKSArXCJkXCJcclxuICAgICAgdGltZSA9IHRpbWUgJSA4NjQwMFxyXG4gICAgfVxyXG4gICAgaWYodGltZSA+PSAzNjAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS8zNjAwKSArXCJoXCJcclxuICAgICAgdGltZSA9IHRpbWUgJSAzNjAwXHJcbiAgICB9XHJcbiAgICBpZih0aW1lID49IDYwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZS82MCkgK1wibVwiXHJcbiAgICAgIHRpbWUgPSB0aW1lICUgNjBcclxuICAgIH1cclxuICAgIGlmKHRpbWUgPiAwKSB7IFxyXG4gICAgICBmb3JtYXR0ZWRUaW1lICs9IE1hdGguZmxvb3IodGltZSkgK1wic1wiXHJcbiAgICB9XHJcbiAgICByZXR1cm4gZm9ybWF0dGVkVGltZVxyXG4gIH1cclxufSJdfQ==
