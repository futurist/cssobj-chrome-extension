(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("ext-messenger", [], factory);
	else if(typeof exports === 'object')
		exports["ext-messenger"] = factory();
	else
		root["ext-messenger"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * NOTE: Although this library is using only chrome.* extension API (and not browser.*),
	 * NOTE: Firefox supports this API namespace on their end, so this library also works in Firefox.
	 * NOTE: More info: https://github.com/asimen1/chrome-ext-messenger/issues/5
	 */
	
	'use strict';
	
	var BackgroundHub = __webpack_require__(1);
	var Connection = __webpack_require__(6);
	var Utils = __webpack_require__(2);
	var Constants = __webpack_require__(5);
	
	// --------------------------------------------------------
	// THE MESSENGER !
	// --------------------------------------------------------
	
	var Messenger = function Messenger() {
	    Utils.constructorTweakMethods('Messenger', this);
	
	    this._myExtPart = Utils.getCurrentExtensionPart();
	};
	
	Messenger.prototype.constructor = Messenger;
	
	// ------------------------------------------------------------
	// "STATIC" Methods - start
	// ------------------------------------------------------------
	
	Messenger.isMessengerPort = function (port) {
	    return port.name.indexOf(Constants.MESSENGER_PORT_NAME_PREFIX) === 0;
	};
	
	// ------------------------------------------------------------
	// "STATIC" Methods - end
	// ------------------------------------------------------------
	
	// ------------------------------------------------------------
	// Exposed API - start.
	// ------------------------------------------------------------
	
	Messenger.prototype.initBackgroundHub = function (options) {
	    if (this._myExtPart !== Constants.BACKGROUND) {
	        Utils.log('warn', '[Messenger:initBackgroundHub]', 'Ignoring BackgroundHub init request since not called from background context');
	        return;
	    }
	
	    if (this._backgroundHub) {
	        Utils.log('warn', '[Messenger:initBackgroundHub]', 'Ignoring BackgroundHub init request since it is already been inited');
	        return;
	    }
	
	    // NOTE: Saving reference in order to identify later if was already created.
	    this._backgroundHub = new BackgroundHub(options);
	};
	
	Messenger.prototype.initConnection = function (name, messageHandler) {
	    if (!name) {
	        Utils.log('error', '[Messenger:initConnection]', 'Missing "name" in arguments');
	    }
	
	    if (name === Constants.TO_NAME_WILDCARD) {
	        Utils.log('error', '[Messenger:initConnection]', '"*" is reserved as a wildcard identifier, please use another name');
	    }
	
	    return new Connection(this._myExtPart, name, messageHandler);
	};
	
	// ------------------------------------------------------------
	// Exposed API - end.
	// ------------------------------------------------------------
	
	module.exports = Messenger;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	var Utils = __webpack_require__(2);
	var Constants = __webpack_require__(5);
	
	// Randomly selected unique id to use as keys for the background ports object.
	var BACKGROUND_PORT_UID_KEY = 1;
	
	var BackgroundHub = function BackgroundHub(options) {
	    Utils.constructorTweakMethods('BackgroundHub', this);
	
	    options = options || {};
	    this._connectedHandler = options.connectedHandler;
	    this._disconnectedHandler = options.disconnectedHandler;
	
	    // Hold all ports created with unique ids as keys (usually tabId, except background).
	    this._backgroundPorts = {};
	    this._contentScriptPorts = {};
	    this._popupPorts = {};
	    this._devtoolPorts = {};
	
	    // Listen to port connections.
	    chrome.runtime.onConnect.addListener(this._onPortConnected);
	    window.mockPortOnConnect = this._onPortConnected;
	};
	
	BackgroundHub.prototype.constructor = BackgroundHub;
	
	// ------------------------------------------------------------
	// Private methods - start.
	// ------------------------------------------------------------
	
	BackgroundHub.prototype._onPortConnected = function (port) {
	    Utils.log('log', '[BackgroundHub:runtime.onConnect]', arguments);
	
	    // Handle this port only if came from our API.
	    if (port.name.indexOf(Constants.MESSENGER_PORT_NAME_PREFIX) === 0) {
	        // Handle ALL incoming port messages.
	        port.onMessage.addListener(this._onPortMessageHandler);
	
	        // Cleanup on port disconnections, this takes care of all disconnections
	        // (other extension parts create the connection with this port).
	        port.onDisconnect.addListener(this._onPortDisconnectionHandler);
	    }
	};
	
	BackgroundHub.prototype._onPortMessageHandler = function (message, fromPort) {
	    switch (message.type) {
	        case Constants.INIT:
	            {
	                this._initConnection(message, fromPort);
	
	                break;
	            }
	
	        // This cases our similar except the actual handling.
	        case Constants.MESSAGE:
	        case Constants.RESPONSE:
	            {
	                // Validate input.
	                if (!message.to) {
	                    Utils.log('error', '[BackgroundHub:_onPortMessageHandler]', 'Missing "to" in message:', message);
	                }
	                if (!message.toNames) {
	                    Utils.log('error', '[BackgroundHub:_onPortMessageHandler]', 'Missing "toNames" in message:', message);
	                }
	
	                // Background hub always acts as a relay of messages to appropriate connection.
	                this._relayMessage(message, fromPort);
	
	                break;
	            }
	
	        default:
	            {
	                Utils.log('error', '[BackgroundHub:_onPortMessageHandler]', 'Unknown message type: ' + message.type);
	            }
	    }
	};
	
	BackgroundHub.prototype._getPortsObj = function (extensionPart) {
	    switch (extensionPart) {
	        case Constants.BACKGROUND:
	            return this._backgroundPorts;
	        case Constants.CONTENT_SCRIPT:
	            return this._contentScriptPorts;
	        case Constants.POPUP:
	            return this._popupPorts;
	        case Constants.DEVTOOL:
	            return this._devtoolPorts;
	        default:
	            Utils.log('error', '[BackgroundHub:_onPortDisconnectionHandler]', 'Unknown extension part: ' + extensionPart);
	    }
	};
	
	BackgroundHub.prototype._initConnection = function (message, fromPort) {
	    var doInit = function (extensionPart, id) {
	        var portsObj = this._getPortsObj(extensionPart);
	
	        portsObj[id] = portsObj[id] ? portsObj[id] : [];
	        portsObj[id].push(fromPort);
	
	        // Invoke the user connected handler if given.
	        if (this._connectedHandler) {
	            var tabId = extensionPart !== Constants.BACKGROUND ? id : null;
	            var userPortName = Utils.removeMessengerPortNamePrefix(fromPort.name);
	            this._connectedHandler(extensionPart, userPortName, tabId);
	        }
	
	        // Send the init success message back to the sender port.
	        fromPort.postMessage({ from: Constants.BACKGROUND, type: Constants.INIT_SUCCESS });
	    }.bind(this);
	
	    if (message.from === Constants.BACKGROUND) {
	        doInit(Constants.BACKGROUND, BACKGROUND_PORT_UID_KEY);
	    } else if (message.from === Constants.DEVTOOL) {
	        doInit(Constants.DEVTOOL, message.tabId);
	    } else if (message.from === Constants.CONTENT_SCRIPT) {
	        doInit(Constants.CONTENT_SCRIPT, fromPort.sender.tab.id);
	    } else if (message.from === Constants.POPUP) {
	        doInit(Constants.POPUP, message.tabId);
	    } else {
	        throw new Error('Unknown "from" in message: ' + message.from);
	    }
	};
	
	BackgroundHub.prototype._relayMessage = function (message, fromPort) {
	    var from = message.from;
	    var to = message.to;
	    var toNames = message.toNames;
	
	    // Will have value only for messages from background to other parts.
	    var toTabId = message.toTabId;
	
	    // Get the tab id of sender (not relevant in case sender is background to background).
	    var tabId = void 0;
	    if (from === Constants.BACKGROUND) {
	        // With background to background messages, tabId is not relevant/necessary.
	        if (to !== Constants.BACKGROUND) {
	            tabId = toTabId;
	        }
	    } else if (from === Constants.DEVTOOL) {
	        tabId = message.tabId;
	    } else if (from === Constants.POPUP) {
	        tabId = message.tabId;
	    } else if (from === Constants.CONTENT_SCRIPT) {
	        tabId = fromPort.sender.tab.id;
	    } else {
	        Utils.log('error', '[BackgroundHub:_relayMessage]', 'Unknown "from" in message: ' + from);
	    }
	
	    // Note: Important to store this on the message for responses from background which require the original tab id.
	    message.fromTabId = tabId;
	
	    // Get all connections ports according extension part.
	    // NOTE: Port might not exist, it can happen when:
	    // NOTE: - devtool window is not open.
	    // NOTE: - content_script is not running because the page is of chrome:// type.
	    var toPorts = void 0;
	    if (to === Constants.BACKGROUND) {
	        toPorts = this._backgroundPorts[BACKGROUND_PORT_UID_KEY] ? this._backgroundPorts[BACKGROUND_PORT_UID_KEY] : [];
	    } else if (to === Constants.DEVTOOL) {
	        toPorts = this._devtoolPorts[tabId] ? this._devtoolPorts[tabId] : [];
	    } else if (to === Constants.POPUP) {
	        toPorts = this._popupPorts[tabId] ? this._popupPorts[tabId] : [];
	    } else if (to === Constants.CONTENT_SCRIPT) {
	        toPorts = this._contentScriptPorts[tabId] ? this._contentScriptPorts[tabId] : [];
	    } else {
	        Utils.log('error', '[BackgroundHub:_relayMessage]', 'Unknown "to" in message: ' + to);
	    }
	
	    // Logging...
	    if (toPorts.length === 0) {
	        Utils.log('info', '[BackgroundHub:_relayMessage]', 'Not sending relay because "to" port does not exist');
	    }
	
	    // Go over names and find all matching ports.
	    var matchingToPorts = [];
	    toNames.forEach(function (toName) {
	        var matchedPorts = toPorts.filter(function (toPort) {
	            return toPort.name === toName || toName === Constants.TO_NAME_WILDCARD;
	        });
	
	        if (matchedPorts.length > 0) {
	            matchedPorts.forEach(function (matchedPort) {
	                // Make sure to keep matching to ports unique in case someone gave both names and wildcard.
	                if (matchingToPorts.indexOf(matchedPort) === -1) {
	                    matchingToPorts.push(matchedPort);
	                }
	            });
	        } else {
	            Utils.log('warn', '[BackgroundHub:_relayMessage]', 'Could not find any connections with this name (probably no such name):', Utils.removeMessengerPortNamePrefix(toName));
	        }
	    }.bind(this));
	
	    // NOTE: We store this on the message so it won't get lost when relying.
	    message.fromPortSender = fromPort.sender;
	
	    // Send the message/s.
	    matchingToPorts.forEach(function (matchingToPort) {
	        matchingToPort.postMessage(message);
	    }.bind(this));
	};
	
	BackgroundHub.prototype._onPortDisconnectionHandler = function (disconnectedPort) {
	    // Remove our message listener.
	    disconnectedPort.onMessage.removeListener(this._onPortMessageHandler);
	
	    var removePort = function (extensionPart, disconnectedPort) {
	        var portsObj = this._getPortsObj(extensionPart);
	
	        // NOTE: portKeys is usually the tab ids (except for background).
	        var portKeys = Object.keys(portsObj);
	        for (var i = 0; i < portKeys.length; i++) {
	            var currPortKey = portKeys[i];
	
	            // Remove according matching port, traverse backward to be able to remove them on th go.
	            var portsArr = portsObj[currPortKey];
	            var portsArrLength = portsArr.length;
	            for (var j = portsArrLength; j >= 0; j--) {
	                var port = portsArr[j];
	                if (port === disconnectedPort) {
	                    Utils.log('log', '[BackgroundHub:_onPortDisconnectionHandler]', 'Remove connection of port with unique id: ', currPortKey);
	                    portsArr.splice(j, 1);
	
	                    // Invoke the user disconnected handler if given.
	                    if (this._disconnectedHandler) {
	                        // Lets pass the tab id for which this port was working for
	                        // (and not the devtool sender tab id which is "-1").
	                        // NOTE: Background ports are not identified by tab ids.
	                        // NOTE: parseInt required since the object keys are strings.
	                        var tabId = extensionPart !== Constants.BACKGROUND ? parseInt(currPortKey) : null;
	                        var userPortName = Utils.removeMessengerPortNamePrefix(disconnectedPort.name);
	                        this._disconnectedHandler(extensionPart, userPortName, tabId);
	                    }
	                }
	            }
	
	            // If all ports removed, remove it from our stored ports object and invoke disconnect handler if given.
	            if (portsObj[currPortKey].length === 0) {
	                Utils.log('log', '[BackgroundHub:_onPortDisconnectionHandler]', 'Removing empty ports object for unique id: ', currPortKey);
	                delete portsObj[currPortKey];
	            }
	        }
	    }.bind(this);
	
	    // Attempt to remove from all our stored ports.
	    removePort(Constants.BACKGROUND, disconnectedPort);
	    removePort(Constants.CONTENT_SCRIPT, disconnectedPort);
	    removePort(Constants.POPUP, disconnectedPort);
	    removePort(Constants.DEVTOOL, disconnectedPort);
	};
	
	// ------------------------------------------------------------
	// Private methods - end.
	// ------------------------------------------------------------
	
	exports.default = BackgroundHub;
	module.exports = exports['default'];

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	var Logdown = __webpack_require__(3);
	
	var Constants = __webpack_require__(5);
	
	// NOTE: Until https://github.com/caiogondim/logdown.js/issues/82 is implemented.
	var loggerLog = new Logdown({ prefix: 'messenger-log', markdown: false });
	var loggerInfo = new Logdown({ prefix: 'messenger-info', markdown: false });
	var loggerWarn = new Logdown({ prefix: 'messenger-warn', markdown: false });
	var loggerError = new Logdown({ prefix: 'messenger-error', markdown: false });
	// Disables all instances with the 'messenger' prefix, but don't disable those in the negation.
	Logdown.disable('messenger*', '-messenger-error', '-messenger-warn' /*, '-messenger-info', '-messenger-log'*/);
	
	var Utils = {
	    log: function log(level) {
	        // Remove the 'level' argument.
	        var loggerArgs = Array.prototype.slice.call(arguments, 1);
	
	        switch (level) {
	            case 'log':
	                {
	                    loggerLog.log.apply(loggerLog, loggerArgs);
	                    break;
	                }
	            case 'info':
	                {
	                    loggerInfo.info.apply(loggerInfo, loggerArgs);
	                    break;
	                }
	            case 'warn':
	                {
	                    loggerWarn.warn.apply(loggerWarn, loggerArgs);
	                    break;
	                }
	            case 'error':
	                {
	                    loggerError.error.apply(loggerError, loggerArgs);
	
	                    // Abort execution on error.
	                    throw 'Messenger error occurred, check more information above...';
	                }
	
	            default:
	                {
	                    loggerError.error('Unknown log level: ' + level);
	                    break;
	                }
	        }
	    },
	
	    // For each function:
	    // - Autobinding to ensure correct 'this' from all types of function invocations.
	    // - Add log level logging.
	    constructorTweakMethods: function constructorTweakMethods(filename, thisObj) {
	        var wrapMethod = function wrapMethod(methodName) {
	            var origFunc = thisObj[methodName];
	
	            thisObj[methodName] = function () {
	                loggerLog.log('[' + filename + ':' + methodName + '()]', arguments);
	
	                return origFunc.apply(thisObj, arguments);
	            }.bind(thisObj);
	        };
	
	        for (var key in thisObj) {
	            if (typeof thisObj[key] === 'function') {
	                wrapMethod(key);
	            }
	        }
	    },
	
	    // TODO: export to npm package... ext-context/scope
	    getCurrentExtensionPart: function getCurrentExtensionPart() {
	        var retVal = void 0;
	
	        if (typeof chrome !== 'undefined') {
	            // chrome.devtools is available in devtools panel.
	            // In latest Chrome, chrome.extension.getBackgroundPage() is available in background, popup & devtools.
	            if (chrome.devtools) {
	                retVal = Constants.DEVTOOL;
	            } else if (chrome.extension && typeof chrome.extension.getBackgroundPage === 'function') {
	                var backgroundPage = chrome.extension.getBackgroundPage();
	                retVal = backgroundPage === window ? Constants.BACKGROUND : Constants.POPUP;
	            } else {
	                retVal = Constants.CONTENT_SCRIPT;
	            }
	        } else {
	            loggerError.error('Could not identify extension part... are you running in a chrome extension context?');
	        }
	
	        loggerLog.log('detected current extension part: ' + retVal);
	        return retVal;
	    },
	
	    removeMessengerPortNamePrefix: function removeMessengerPortNamePrefix(portName) {
	        return portName.replace(new RegExp('^' + Constants.MESSENGER_PORT_NAME_PREFIX), '');
	    }
	};
	
	exports.default = Utils;
	module.exports = exports['default'];

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {/**
	 * logdown - Debug utility with markdown support that runs on browser and server
	 *
	 * @version v2.2.0
	 * @link https://github.com/caiogondim/logdown
	 * @author Caio Gondim <me@caiogondim.com> (http://caiogondim.com)
	 * @license MIT
	 */
	/* global console, module, window, document, navigator, process */
	
	;(function () {
	  'use strict'
	
	  var lastUsedColorIndex = 0
	  // Solarized accent colors http://ethanschoonover.com/solarized
	  var colors = [
	    '#B58900',
	    '#CB4B16',
	    '#DC322F',
	    '#D33682',
	    '#6C71C4',
	    '#268BD2',
	    '#2AA198',
	    '#859900'
	  ]
	  // Taken from ansi-styles npm module
	  // https://github.com/sindresorhus/ansi-styles/blob/master/index.js
	  var ansiColors = {
	    modifiers: {
	      reset: [0, 0],
	      bold: [1, 22], // 21 isn't widely supported and 22 does the same thing
	      dim: [2, 22],
	      italic: [3, 23],
	      underline: [4, 24],
	      inverse: [7, 27],
	      hidden: [8, 28],
	      strikethrough: [9, 29]
	    },
	    colors: {
	      black: [30, 39],
	      red: [31, 39],
	      green: [32, 39],
	      yellow: [33, 39],
	      blue: [34, 39],
	      magenta: [35, 39],
	      cyan: [36, 39],
	      white: [37, 39],
	      gray: [90, 39]
	    },
	    bgColors: {
	      bgBlack: [40, 49],
	      bgRed: [41, 49],
	      bgGreen: [42, 49],
	      bgYellow: [43, 49],
	      bgBlue: [44, 49],
	      bgMagenta: [45, 49],
	      bgCyan: [46, 49],
	      bgWhite: [47, 49]
	    }
	  }
	  var filterRegExps = []
	
	  function Logdown (prefix, opts) {
	    if (!(this instanceof Logdown)) {
	      return new Logdown(prefix, opts)
	    }
	
	    this.opts = normalizeOpts(prefix, opts)
	
	    if (isPrefixAlreadyInUse(this.opts.prefix, Logdown._instances)) {
	      return getInstanceByPrefix(this.opts.prefix, Logdown._instances)
	    }
	
	    Logdown._instances.push(this)
	    alignPrefixes(Logdown._instances)
	    updateEnabledDisabled()
	
	    return this
	  }
	
	  //
	  // Static
	  //
	
	  Logdown._instances = []
	
	  Logdown.enable = function () {
	    Array.prototype.forEach.call(arguments, function (str) {
	      if (str[0] === '-') {
	        Logdown.disable(str.substr(1))
	      }
	
	      var regExp = prepareRegExpForPrefixSearch(str)
	
	      if (str === '*') {
	        filterRegExps = []
	      } else {
	        filterRegExps.push({
	          type: 'enable',
	          regExp: regExp
	        })
	      }
	    })
	  }
	
	  Logdown.disable = function () {
	    Array.prototype.forEach.call(arguments, function (str) {
	      if (str[0] === '-') {
	        Logdown.enable(str.substr(1))
	      }
	
	      var regExp = prepareRegExpForPrefixSearch(str)
	
	      if (str === '*') {
	        filterRegExps = [{
	          type: 'disable',
	          regExp: regExp
	        }]
	      } else {
	        filterRegExps.push({
	          type: 'disable',
	          regExp: regExp
	        })
	      }
	    })
	  }
	
	  //
	  // Public
	  //
	
	  var methods = ['debug', 'log', 'info', 'warn', 'error']
	  methods.forEach(function (method) {
	    Logdown.prototype[method] = function () {
	      if (isDisabled(this)) {
	        return
	      }
	
	      var preparedOutput
	      var args = Array.prototype.slice.call(arguments, 0)
	
	      if (isBrowser()) {
	        preparedOutput = prepareOutputToBrowser(args, this)
	
	        // IE9 workaround
	        // http://stackoverflow.com/questions/5538972/
	        //  console-log-apply-not-working-in-ie9
	        Function.prototype.apply.call(
	          console[method] || console.log,
	          console,
	          preparedOutput
	        )
	      } else if (isNode()) {
	        preparedOutput = prepareOutputToNode(args, method, this)
	        ;(console[method] || console.log).apply(
	          console,
	          preparedOutput
	        )
	      }
	    }
	  })
	
	  //
	  // Private
	  //
	
	  function normalizeOpts (prefix, opts) {
	    if (typeof prefix === 'object') opts = prefix
	    opts = opts || {}
	
	    if (typeof prefix !== 'string') prefix = opts.prefix || ''
	    prefix = sanitizeStringToBrowser(prefix)
	
	    var alignOutput = Boolean(opts.alignOutput)
	    var markdown = opts.markdown === undefined ? true : Boolean(opts.markdown)
	
	    var prefixColor
	    if (isBrowser()) {
	      prefixColor = colors[lastUsedColorIndex % colors.length]
	      lastUsedColorIndex += 1
	    } else if (isNode()) {
	      prefixColor = getNextPrefixColor()
	    }
	
	    return {
	      prefix: prefix,
	      alignOutput: alignOutput,
	      markdown: markdown,
	      prefixColor: prefixColor
	    }
	  }
	
	  function alignPrefixes (instances) {
	    var longest = instances.sort(function (a, b) {
	      return b.opts.prefix.length - a.opts.prefix.length
	    })[0]
	
	    instances.forEach(function (instance) {
	      if (instance.opts.alignOutput) {
	        var padding = new Array(Math.max(longest.opts.prefix.length - instance.opts.prefix.length + 1, 0)).join(' ')
	        instance.opts.prefix = instance.opts.prefix + padding
	      }
	    })
	  }
	
	  function updateEnabledDisabled () {
	    if (isNode()) {
	      // Parsing `NODE_DEBUG` and `DEBUG` env var.
	      var envVar = null
	      if (
	        typeof process !== 'undefined' &&
	        process.env !== undefined
	      ) {
	        // `NODE_DEBUG` has precedence over `DEBUG`
	        if (
	          process.env.NODE_DEBUG !== undefined &&
	          process.env.NODE_DEBUG !== ''
	        ) {
	          envVar = 'NODE_DEBUG'
	        } else if (
	          process.env.DEBUG !== undefined &&
	          process.env.DEBUG !== ''
	        ) {
	          envVar = 'DEBUG'
	        }
	
	        if (envVar) {
	          Logdown.disable('*')
	          process.env[envVar]
	            .split(',')
	            .forEach(function (regExp) {
	              Logdown.enable(regExp)
	            })
	        }
	      }
	    } else if (isBrowser()) {
	      if (
	        window.localStorage &&
	        typeof window.localStorage.getItem('debug') === 'string'
	      ) {
	        Logdown.disable('*')
	        window.localStorage.debug
	          .split(',')
	          .forEach(function (regExp) {
	            Logdown.enable(regExp)
	          })
	      }
	    }
	  }
	
	  function parseMarkdown (text) {
	    var styles = []
	    var match = getNextMatch(text)
	
	    while (match) {
	      text = text.replace(match.rule.regexp, match.rule.replacer)
	
	      if (isBrowser()) {
	        styles.push(match.rule.style)
	        styles.push('') // Empty string resets style.
	      }
	
	      match = getNextMatch(text)
	    }
	
	    return {text: text, styles: styles}
	  }
	
	  function getNextMatch (text) {
	    var matches = []
	    var rules = []
	    if (isBrowser()) {
	      rules = [
	        {
	          regexp: /\*([^\*]+)\*/,
	          replacer: function (match, submatch1) {
	            return '%c' + submatch1 + '%c'
	          },
	          style: 'font-weight:bold;'
	        },
	        {
	          regexp: /_([^_]+)_/,
	          replacer: function (match, submatch1) {
	            return '%c' + submatch1 + '%c'
	          },
	          style: 'font-style:italic;'
	        },
	        {
	          regexp: /`([^`]+)`/,
	          replacer: function (match, submatch1) {
	            return '%c' + submatch1 + '%c'
	          },
	          style:
	            'background:#FDF6E3; ' +
	            'color:#586E75; ' +
	            'padding:1px 5px; ' +
	            'border-radius:4px;'
	        }
	      ]
	    } else if (isNode()) {
	      rules = [
	        {
	          regexp: /\*([^\*]+)\*/,
	          replacer: function (match, submatch1) {
	            return '\u001b[' + ansiColors.modifiers.bold[0] + 'm' +
	                   submatch1 +
	                   '\u001b[' + ansiColors.modifiers.bold[1] + 'm'
	          }
	        },
	        {
	          regexp: /_([^_]+)_/,
	          replacer: function (match, submatch1) {
	            return '\u001b[' + ansiColors.modifiers.italic[0] + 'm' +
	                   submatch1 +
	                   '\u001b[' + ansiColors.modifiers.italic[1] + 'm'
	          }
	        },
	        {
	          regexp: /`([^`]+)`/,
	          replacer: function (match, submatch1) {
	            return '\u001b[' + ansiColors.bgColors.bgYellow[0] + 'm' +
	                   '\u001b[' + ansiColors.colors.black[0] + 'm' +
	                   ' ' + submatch1 + ' ' +
	                   '\u001b[' + ansiColors.colors.black[1] + 'm' +
	                   '\u001b[' + ansiColors.bgColors.bgYellow[1] + 'm'
	          }
	        }
	      ]
	    }
	
	    //
	    rules.forEach(function (rule) {
	      var match = text.match(rule.regexp)
	      if (match) {
	        matches.push({
	          rule: rule,
	          match: match
	        })
	      }
	    })
	    if (matches.length === 0) {
	      return null
	    }
	
	    //
	    matches.sort(function (a, b) {
	      return a.match.index - b.match.index
	    })
	
	    return matches[0]
	  }
	
	  function prepareOutputToBrowser (args, instance) {
	    var preparedOutput = []
	    var parsedMarkdown
	
	    if (instance.opts.prefix) {
	      if (isColorSupported()) {
	        preparedOutput.push('%c' + instance.opts.prefix + '%c ')
	        preparedOutput.push(
	          'color:' + instance.opts.prefixColor + '; font-weight:bold;',
	          '' // Empty string resets style.
	        )
	      } else {
	        preparedOutput.push('[' + instance.prefix + '] ')
	      }
	    } else {
	      preparedOutput.push('')
	    }
	
	    // Only first argument on `console` can have style.
	    if (typeof args[0] === 'string') {
	      if (instance.opts.markdown && isColorSupported()) {
	        parsedMarkdown = parseMarkdown(args[0])
	        preparedOutput[0] = preparedOutput[0] + parsedMarkdown.text
	        preparedOutput = preparedOutput.concat(parsedMarkdown.styles)
	      } else {
	        preparedOutput[0] = preparedOutput[0] + args[0]
	      }
	    } else {
	      preparedOutput[0] = args[0]
	    }
	
	    if (args.length > 1) {
	      preparedOutput = preparedOutput.concat(args.splice(1))
	    }
	
	    return preparedOutput
	  }
	
	  function prepareOutputToNode (args, method, instance) {
	    var preparedOutput = []
	
	    if (instance.opts.prefix) {
	      if (isColorSupported()) {
	        preparedOutput[0] =
	          '\u001b[' + instance.opts.prefixColor[0] + 'm' +
	          '\u001b[' + ansiColors.modifiers.bold[0] + 'm' +
	          instance.opts.prefix +
	          '\u001b[' + ansiColors.modifiers.bold[1] + 'm' +
	          '\u001b[' + instance.opts.prefixColor[1] + 'm'
	      } else {
	        preparedOutput[0] = '[' + instance.opts.prefix + ']'
	      }
	    }
	
	    if (method === 'warn') {
	      preparedOutput[0] =
	        '\u001b[' + ansiColors.colors.yellow[0] + 'm' +
	        '⚠' +
	        '\u001b[' + ansiColors.colors.yellow[1] + 'm ' +
	        (preparedOutput[0] || '')
	    } else if (method === 'error') {
	      preparedOutput[0] =
	        '\u001b[' + ansiColors.colors.red[0] + 'm' +
	        '✖' +
	        '\u001b[' + ansiColors.colors.red[1] + 'm ' +
	        (preparedOutput[0] || '')
	    } else if (method === 'info') {
	      preparedOutput[0] =
	        '\u001b[' + ansiColors.colors.blue[0] + 'm' +
	        'ℹ' +
	        '\u001b[' + ansiColors.colors.blue[1] + 'm ' +
	        (preparedOutput[0] || '')
	    } else if (method === 'debug') {
	      preparedOutput[0] =
	        '\u001b[' + ansiColors.colors.gray[0] + 'm' +
	        '🐛' +
	        '\u001b[' + ansiColors.colors.gray[1] + 'm ' +
	        (preparedOutput[0] || '')
	    }
	
	    args.forEach(function (arg) {
	      if (typeof arg === 'string') {
	        if (instance.opts.markdown) {
	          preparedOutput.push(parseMarkdown(arg).text)
	        } else {
	          preparedOutput.push(arg)
	        }
	      } else {
	        preparedOutput.push(arg)
	      }
	    })
	
	    return preparedOutput
	  }
	
	  function isDisabled (instance) {
	    var isDisabled_ = false
	    filterRegExps.forEach(function (filter) {
	      if (
	        filter.type === 'enable' &&
	        filter.regExp.test(instance.opts.prefix)
	      ) {
	        isDisabled_ = false
	      } else if (
	        filter.type === 'disable' &&
	        filter.regExp.test(instance.opts.prefix)
	      ) {
	        isDisabled_ = true
	      }
	    })
	
	    return isDisabled_
	  }
	
	  function prepareRegExpForPrefixSearch (str) {
	    return new RegExp('^' + str.replace(/\*/g, '.*?') + '$')
	  }
	
	  function isPrefixAlreadyInUse (prefix, instances) {
	    var isPrefixAlreadyInUse_ = false
	
	    instances.forEach(function (instance) {
	      if (instance.opts.prefix === prefix) {
	        isPrefixAlreadyInUse_ = true
	        return
	      }
	    })
	    return isPrefixAlreadyInUse_
	  }
	
	  function getInstanceByPrefix (prefix, instances) {
	    var instance
	
	    instances.forEach(function (instanceCur) {
	      if (instanceCur.opts.prefix === prefix) {
	        instance = instanceCur
	        return
	      }
	    })
	
	    return instance
	  }
	
	  function sanitizeStringToBrowser (str) {
	    if (typeof str === 'string') {
	      return str.replace(/%c/g, '')
	    } else {
	      return str
	    }
	  }
	
	  /**
	   * Currently only WebKit-based Web Inspectors, Firefox >= v31,
	   * and the Firebug extension (any Firefox version) are known
	   * to support "%c" CSS customizations.
	   *
	   * Code took from https://github.com/visionmedia/debug/blob/master/browser.js
	   */
	  function isColorSupported () {
	    if (isBrowser()) {
	      // Is webkit? http://stackoverflow.com/a/16459606/376773
	      var isWebkit = ('WebkitAppearance' in document.documentElement.style)
	      // Is firebug? http://stackoverflow.com/a/398120/376773
	      var isFirebug = (
	        window.console &&
	        (console.firebug || (console.exception && console.table))
	      )
	      // Is firefox >= v31?
	      // https://developer.mozilla.org/en-US/docs/Tools/
	      //  Web_Console#Styling_messages
	      var isFirefox31Plus = (
	        navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) &&
	        parseInt(RegExp.$1, 10) >= 31
	      )
	
	      return (isWebkit || isFirebug || isFirefox31Plus)
	    } else if (isNode()) {
	      if (process.stdout && !process.stdout.isTTY) {
	        return false
	      }
	
	      if (process.platform === 'win32') {
	        return true
	      }
	
	      if ('COLORTERM' in process.env) {
	        return true
	      }
	
	      if (process.env.TERM === 'dumb') {
	        return false
	      }
	
	      if (
	        /^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)
	      ) {
	        return true
	      }
	
	      return false
	    }
	  }
	
	  function isNode () {
	    return (
	      typeof module !== 'undefined' &&
	      typeof module.exports !== 'undefined'
	    )
	  }
	
	  function isBrowser () {
	    return (typeof window !== 'undefined')
	  }
	
	  var getNextPrefixColor = (function () {
	    var lastUsed = 0
	    var nodePrefixColors = [
	      [31, 39], // red
	      [32, 39], // green
	      [33, 39], // yellow
	      [34, 39], // blue
	      [35, 39], // magenta
	      [36, 39] // cyan
	    ]
	
	    return function () {
	      lastUsed += 1
	      return nodePrefixColors[lastUsed % nodePrefixColors.length]
	    }
	  })()
	
	  // Export module
	  if (isNode()) {
	    module.exports = Logdown
	  } else if (isBrowser()) {
	    window.Logdown = Logdown
	  }
	}())
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(4)))

/***/ }),
/* 4 */
/***/ (function(module, exports) {

	// shim for using process in browser
	var process = module.exports = {};
	
	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.
	
	var cachedSetTimeout;
	var cachedClearTimeout;
	
	function defaultSetTimout() {
	    throw new Error('setTimeout has not been defined');
	}
	function defaultClearTimeout () {
	    throw new Error('clearTimeout has not been defined');
	}
	(function () {
	    try {
	        if (typeof setTimeout === 'function') {
	            cachedSetTimeout = setTimeout;
	        } else {
	            cachedSetTimeout = defaultSetTimout;
	        }
	    } catch (e) {
	        cachedSetTimeout = defaultSetTimout;
	    }
	    try {
	        if (typeof clearTimeout === 'function') {
	            cachedClearTimeout = clearTimeout;
	        } else {
	            cachedClearTimeout = defaultClearTimeout;
	        }
	    } catch (e) {
	        cachedClearTimeout = defaultClearTimeout;
	    }
	} ())
	function runTimeout(fun) {
	    if (cachedSetTimeout === setTimeout) {
	        //normal enviroments in sane situations
	        return setTimeout(fun, 0);
	    }
	    // if setTimeout wasn't available but was latter defined
	    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
	        cachedSetTimeout = setTimeout;
	        return setTimeout(fun, 0);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedSetTimeout(fun, 0);
	    } catch(e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
	            return cachedSetTimeout.call(null, fun, 0);
	        } catch(e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
	            return cachedSetTimeout.call(this, fun, 0);
	        }
	    }
	
	
	}
	function runClearTimeout(marker) {
	    if (cachedClearTimeout === clearTimeout) {
	        //normal enviroments in sane situations
	        return clearTimeout(marker);
	    }
	    // if clearTimeout wasn't available but was latter defined
	    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
	        cachedClearTimeout = clearTimeout;
	        return clearTimeout(marker);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedClearTimeout(marker);
	    } catch (e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
	            return cachedClearTimeout.call(null, marker);
	        } catch (e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
	            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
	            return cachedClearTimeout.call(this, marker);
	        }
	    }
	
	
	
	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;
	
	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}
	
	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = runTimeout(cleanUpNextTick);
	    draining = true;
	
	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    runClearTimeout(timeout);
	}
	
	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        runTimeout(drainQueue);
	    }
	};
	
	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};
	
	function noop() {}
	
	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;
	process.prependListener = noop;
	process.prependOnceListener = noop;
	
	process.listeners = function (name) { return [] }
	
	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};
	
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ }),
/* 5 */
/***/ (function(module, exports) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	var constants = {
	    // Used to identify port connections from Messenger API and user "chrome.runtime.connect".
	    MESSENGER_PORT_NAME_PREFIX: '__messenger__',
	
	    // Wildcard identifier for sending to all of the extension part connections.
	    TO_NAME_WILDCARD: '*',
	
	    // Extension parts.
	    BACKGROUND: 'background',
	    POPUP: 'popup',
	    DEVTOOL: 'devtool',
	    CONTENT_SCRIPT: 'content_script',
	
	    // Message types.
	    INIT: 'init',
	    INIT_SUCCESS: 'init_success',
	    MESSAGE: 'message',
	    RESPONSE: 'response'
	};
	
	exports.default = constants;
	module.exports = exports['default'];

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	var MockPort = __webpack_require__(7);
	var Utils = __webpack_require__(2);
	var Constants = __webpack_require__(5);
	
	var INIT_CONNECTION_INTERVAL = 500;
	
	var PENDING_CB_SIZE_CLEANUP_TRIGGER = 100000;
	var PENDING_CB_SIZE_CLEANUP_AMOUNT = 5000;
	
	var Connection = function Connection(extPart, name, messageHandler) {
	    Utils.constructorTweakMethods('Connection', this);
	
	    this._init(extPart, name, messageHandler);
	};
	
	Connection.prototype.constructor = Connection;
	
	// ------------------------------------------------------------
	// Private methods - start.
	// ------------------------------------------------------------
	
	Connection.prototype._init = function (extPart, name, messageHandler) {
	    this._port = null;
	    this._inited = false;
	    this._pendingInitMessages = [];
	    this._pendingCb = {};
	    this._cbId = 0;
	    this._pendingCbCleanupIndex = 0;
	
	    this._myExtPart = extPart;
	    this._myName = Constants.MESSENGER_PORT_NAME_PREFIX + name;
	    this._userMessageHandler = messageHandler || function () {};
	
	    switch (this._myExtPart) {
	        case Constants.BACKGROUND:
	        case Constants.CONTENT_SCRIPT:
	        case Constants.POPUP:
	        case Constants.DEVTOOL:
	            {
	                var doInitConnection = function (tabId) {
	                    Utils.log('log', '[Connection:_init]', 'Attempting connection initing...');
	
	                    this._port = this._myExtPart === Constants.BACKGROUND ? new MockPort({ name: this._myName }) : chrome.runtime.connect({ name: this._myName });
	
	                    this._port.onMessage.addListener(this._onPortMessageHandler);
	
	                    this._port.postMessage({
	                        type: Constants.INIT,
	                        from: this._myExtPart,
	                        tabId: tabId
	                    });
	
	                    // NOTE: The init connection from the extension parts can be called before the
	                    // NOTE: background hub has inited and started listening to connections.
	                    // NOTE: Retry init until we get the init success response from the background.
	                    // TODO: maybe can think of a better solution?
	                    var argsArr = arguments;
	                    var initInterval = setTimeout(function () {
	                        if (!this._inited) {
	                            this._port.disconnect();
	                            doInitConnection.apply(this, argsArr);
	                        } else {
	                            clearTimeout(initInterval);
	                        }
	                    }.bind(this), INIT_CONNECTION_INTERVAL);
	                }.bind(this);
	
	                // Unlike content script which have the tab id in the "sender" object,
	                // for devtool/popup we need to get and pass the tab id ourself.
	                // NOTE: For background connection we don't have a notion of tab id.
	                switch (this._myExtPart) {
	                    case Constants.BACKGROUND:
	                    case Constants.CONTENT_SCRIPT:
	                        doInitConnection();
	
	                        break;
	                    case Constants.POPUP:
	                        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
	                            doInitConnection(tabs[0].id);
	                        });
	
	                        break;
	                    case Constants.DEVTOOL:
	                        doInitConnection(chrome.devtools.inspectedWindow.tabId);
	
	                        break;
	                }
	
	                break;
	            }
	
	        default:
	            {
	                Utils.log('error', '[Connection:_init]', 'Unknown extension part: ' + extPart);
	            }
	    }
	};
	
	// Pending callback will get populated by unresponded callbacks.
	// Clean up at sensible sizes.
	Connection.prototype._attemptDeadCbCleanup = function () {
	    if (Object.keys(this._pendingCb).length > PENDING_CB_SIZE_CLEANUP_TRIGGER) {
	        Utils.log('log', '[Connection:_attemptDeadCbCleanup]', 'Attempting dead callback cleaning... current callbacks number:'.Object.keys(this._pendingCb).length);
	
	        var cleanUpToIndex = this._pendingCbCleanupIndex + PENDING_CB_SIZE_CLEANUP_AMOUNT;
	        while (this._pendingCbCleanupIndex < cleanUpToIndex) {
	            delete this._pendingCb[this._pendingCbCleanupIndex];
	            this._pendingCbCleanupIndex++;
	        }
	
	        Utils.log('log', '[Connection:_attemptDeadCbCleanup]', 'New callbacks number after cleaning done:', Object.keys(this._pendingCb).length);
	    }
	};
	
	Connection.prototype._prepareMessage = function (message, cbPromiseResolve) {
	    var _this = this;
	
	    return new Promise(function (resolve) {
	        // Handle callback if given.
	        if (cbPromiseResolve) {
	            _this._cbId++;
	            _this._pendingCb[_this._cbId] = cbPromiseResolve;
	            message.cbId = _this._cbId;
	
	            _this._attemptDeadCbCleanup();
	        }
	
	        // Manually setting the "tabId" is important for relay for some extension parts...
	        switch (_this._myExtPart) {
	            case Constants.DEVTOOL:
	                {
	                    message.tabId = chrome.devtools.inspectedWindow.tabId;
	                    resolve();
	
	                    break;
	                }
	
	            case Constants.POPUP:
	                {
	                    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
	                        message.tabId = tabs[0].id;
	                        resolve();
	                    }.bind(_this));
	
	                    break;
	                }
	
	            default:
	                {
	                    resolve();
	                    break;
	                }
	        }
	    });
	};
	
	// Generic post message with callback support.
	Connection.prototype._postMessage = function (port, message, cbPromiseResolve) {
	    var _this2 = this;
	
	    this._prepareMessage(message, cbPromiseResolve).then(function () {
	        if (_this2._inited) {
	            port.postMessage(message);
	        } else {
	            _this2._pendingInitMessages.push(message);
	        }
	    });
	};
	
	Connection.prototype._postResponse = function (fromPort, responseValue, origMessage) {
	    var response = {
	        from: this._myExtPart,
	        to: origMessage.from,
	
	        // BackgroundHub expects toName to be an array.
	        toNames: [origMessage.fromName],
	
	        type: Constants.RESPONSE,
	        cbId: origMessage.cbId,
	        cbValue: responseValue
	    };
	
	    // If we are in the background, we need to specify the tab id to respond to.
	    if (this._myExtPart === Constants.BACKGROUND) {
	        response.toTabId = origMessage.fromTabId;
	    }
	
	    this._postMessage(fromPort, response);
	};
	
	Connection.prototype._handleMessage = function (message, fromPort) {
	    // Create the "sendResponse" callback for the message.
	    var sendResponse = function (response) {
	        // Message has callback... respond to it.
	        if (message.cbId) {
	            this._postResponse(fromPort, response, message);
	        }
	    }.bind(this);
	
	    // Construct the from string (the sender's "to" string).
	    // NOTE: Background connections have "fromTabId" only for the relay of response and should not be added.
	    var fromName = Utils.removeMessengerPortNamePrefix(message.fromName);
	    var fromTabId = message.fromTabId && message.from !== Constants.BACKGROUND ? ':' + message.fromTabId : null;
	    var from = message.from + ':' + fromName + (fromTabId ? ':' + fromTabId : '');
	
	    // Invoke the user message handler.
	    this._userMessageHandler(message.userMessage, from, message.fromPortSender, sendResponse);
	};
	
	Connection.prototype._handleResponse = function (response) {
	    if (this._pendingCb[response.cbId]) {
	        var cbPromiseResolve = this._pendingCb[response.cbId];
	        delete this._pendingCb[response.cbId];
	
	        // Resolve the promise with the response callback value.
	        cbPromiseResolve(response.cbValue);
	    } else {
	        Utils.log('info', '[Connection:_handleResponse]', 'Ignoring response sending because callback does not exist (probably already been called)');
	    }
	};
	
	Connection.prototype._sendMessage = function (port, toExtPart, toNames, toTabId, userMessage, cbPromiseResolve) {
	    // Add our port name prefix to the user given name (if given and not wildcard).
	    toNames = this._addMessengerPortNamePrefix(toNames);
	
	    var message = {
	        from: this._myExtPart,
	        fromName: this._myName,
	        to: toExtPart,
	        toNames: toNames,
	        toTabId: toTabId,
	        type: Constants.MESSAGE,
	        userMessage: userMessage
	    };
	
	    this._postMessage(port, message, cbPromiseResolve);
	};
	
	Connection.prototype._addMessengerPortNamePrefix = function (toNames) {
	    return toNames.map(function (toName) {
	        // Wildcards '*' should stay intact.
	        return toName === Constants.TO_NAME_WILDCARD ? toName : Constants.MESSENGER_PORT_NAME_PREFIX + toName;
	    });
	};
	
	Connection.prototype._validateMessage = function (toExtPart, toName, toTabId) {
	    if (!toExtPart) {
	        return 'Missing extension part in "to" argument';
	    }
	
	    if (toExtPart !== Constants.BACKGROUND && toExtPart !== Constants.CONTENT_SCRIPT && toExtPart !== Constants.DEVTOOL && toExtPart !== Constants.POPUP) {
	        return 'Unknown extension part in "to" argument: ' + toExtPart + '\nSupported parts are: ' + Constants.BACKGROUND + ', ' + Constants.CONTENT_SCRIPT + ', ' + Constants.POPUP + ', ' + Constants.DEVTOOL;
	    }
	
	    if (!toName) {
	        return 'Missing connection name in "to" argument';
	    }
	
	    if (this._myExtPart === Constants.BACKGROUND && toExtPart !== Constants.BACKGROUND) {
	        if (!toTabId) {
	            return 'Messages from background to other extension parts must have a tab id in "to" argument';
	        }
	
	        if (!Number.isInteger(parseFloat(toTabId))) {
	            return 'Tab id to send message to must be a valid number';
	        }
	    }
	};
	
	Connection.prototype._onPortMessageHandler = function (message, fromPort) {
	    switch (message.type) {
	        case Constants.INIT_SUCCESS:
	            {
	                this._inited = true;
	
	                // Handle all the pending messages added before init succeeded.
	                this._pendingInitMessages.forEach(function (pendingInitMessage) {
	                    this._port.postMessage(pendingInitMessage);
	                }.bind(this));
	
	                break;
	            }
	
	        // This cases our similar except the actual handling.
	        case Constants.MESSAGE:
	        case Constants.RESPONSE:
	            {
	                if (!message.to) {
	                    Utils.log('error', '[Connection:_onPortMessageHandler]', 'Missing "to" in message: ', message);
	                }
	                if (!message.toNames) {
	                    Utils.log('error', '[Connection:_onPortMessageHandler]', 'Missing "toNames" in message: ', message);
	                }
	
	                // If we got a message/response it means the background hub has already
	                // decided that we should handle it.
	                if (message.type === Constants.MESSAGE) {
	                    this._handleMessage(message, fromPort);
	                } else if (message.type === Constants.RESPONSE) {
	                    this._handleResponse(message);
	                }
	
	                break;
	            }
	
	        default:
	            {
	                Utils.log('error', '[Connection:_onPortMessageHandler]', 'Unknown message type: ' + message.type);
	            }
	    }
	};
	
	// ------------------------------------------------------------
	// Private methods - end.
	// ------------------------------------------------------------
	
	// ------------------------------------------------------------
	// Exposed API - start.
	// ------------------------------------------------------------
	
	Connection.prototype.sendMessage = function (to, message) {
	    var _this3 = this,
	        _arguments = arguments;
	
	    // Always returns a promise (callback support).
	    return new Promise(function (cbPromiseResolve, reject) {
	        if (!to) {
	            Utils.log('error', '[Connection:sendMessage]', 'Missing "to" arguments');
	        }
	
	        if (!_this3._port) {
	            Utils.log('info', '[Connection:sendMessage]', 'Rejecting sendMessage because connection does not exist anymore');
	            return reject(new Error('Connection port does not exist anymore, did you disconnect it?'));
	        }
	
	        // Parse 'to' to args... for example => 'devtool:main:1225'
	        var toArgs = void 0;
	        try {
	            toArgs = to.split(':');
	        } catch (e) {
	            Utils.log('error', '[Connection:sendMessage]', 'Invalid format given in "to" argument: ' + to, _arguments);
	        }
	
	        var toExtPart = toArgs[0];
	        var toName = toArgs[1];
	        var toTabId = toArgs[2];
	
	        // Validate (will throw error if something is invalid).
	        var errorMsg = _this3._validateMessage(toExtPart, toName, toTabId);
	        if (errorMsg) {
	            Utils.log('error', '[Connection:sendMessage]', errorMsg, _arguments);
	        }
	
	        // Normalize to array to support multiple names.
	        var toNames = toName.split(',');
	
	        _this3._sendMessage(_this3._port, toExtPart, toNames, toTabId, message, cbPromiseResolve);
	    });
	};
	
	Connection.prototype.disconnect = function () {
	    if (this._port) {
	        this._port.disconnect();
	        this._port = null;
	    }
	};
	
	// ------------------------------------------------------------
	// Exposed API - end.
	// ------------------------------------------------------------
	
	exports.default = Connection;
	module.exports = exports['default'];

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	var Utils = __webpack_require__(2);
	
	var MockPort = function MockPort(options) {
	    Utils.constructorTweakMethods('MockPort', this);
	
	    var creatorMock = this._createMockPort(options);
	    var targetMock = this._createMockPort(options);
	
	    this._linkMocks(creatorMock, targetMock);
	
	    // BackgroundHub might not have created this "onConnect" method yet.
	    if (typeof window.mockPortOnConnect === 'function') {
	        window.mockPortOnConnect(targetMock);
	    }
	
	    return creatorMock;
	};
	
	MockPort.prototype.constructor = MockPort;
	
	MockPort.prototype._createMockPort = function (options) {
	    // ------------------------------------------
	    // Port API
	    // ------------------------------------------
	
	    var mockPort = {
	        _connected: true,
	
	        _name: options.name,
	        onMessageListeners: [],
	        onDisconnectListeners: []
	    };
	
	    Object.defineProperty(mockPort, 'name', {
	        get: function get() {
	            return mockPort._name;
	        }
	    });
	
	    Object.defineProperty(mockPort, 'onMessage', {
	        get: function get() {
	            return {
	                addListener: function addListener(listener) {
	                    mockPort.onMessageListeners.push(listener);
	                },
	
	                removeListener: function removeListener(listener) {
	                    var index = mockPort.onMessageListeners.indexOf(listener);
	                    if (index !== -1) {
	                        mockPort.onMessageListeners.splice(index, 1);
	                    }
	                }
	            };
	        }
	    });
	
	    Object.defineProperty(mockPort, 'onDisconnect', {
	        get: function get() {
	            return {
	                addListener: function addListener(listener) {
	                    mockPort.onDisconnectListeners.push(listener);
	                },
	
	                removeListener: function removeListener(listener) {
	                    var index = mockPort.onDisconnectListeners.indexOf(listener);
	                    if (index !== -1) {
	                        mockPort.onDisconnectListeners.splice(index, 1);
	                    }
	                }
	            };
	        }
	    });
	
	    // Background mock ports should only have the extension id.
	    // https://developer.chrome.com/extensions/runtime#type-MessageSender
	    Object.defineProperty(mockPort, 'sender', {
	        get: function get() {
	            return { id: chrome.runtime.id };
	        }
	    });
	
	    mockPort.postMessage = function (msg) {
	        if (mockPort._connected) {
	            if (mockPort.__targetRefPort) {
	                mockPort.__targetRefPort.__invokeOnMessageHandlers(msg);
	            } else {
	                Utils.log('warn', '[MockPort:postMessage]', 'Missing __targetRefPort', arguments);
	            }
	        } else {
	            Utils.log('warn', '[MockPort:postMessage]', 'Attempting to post message on a disconnected mock port', msg);
	        }
	    };
	
	    mockPort.disconnect = function () {
	        mockPort._connected = false;
	
	        if (mockPort.__targetRefPort) {
	            mockPort.__targetRefPort.__invokeOnDisconnectHandlers();
	        } else {
	            Utils.log('warn', '[MockPort:postMessage]', 'Missing __targetRefPort', arguments);
	        }
	
	        mockPort._onMessageListeners = [];
	        mockPort._onDisconnectListeners = [];
	    };
	
	    // ------------------------------------------
	    // PRIVATE HELPERS
	    // ------------------------------------------
	
	    mockPort.__invokeOnMessageHandlers = function (msg) {
	        mockPort.onMessageListeners.forEach(function (onMessageListener) {
	            onMessageListener(msg, mockPort);
	        });
	    };
	
	    mockPort.__invokeOnDisconnectHandlers = function () {
	        mockPort.onDisconnectListeners.forEach(function (onDisconnectListener) {
	            onDisconnectListener(mockPort);
	        });
	    };
	
	    return mockPort;
	};
	
	MockPort.prototype._linkMocks = function (creatorMock, targetMock) {
	    creatorMock.__targetRefPort = targetMock;
	    targetMock.__targetRefPort = creatorMock;
	};
	
	exports.default = MockPort;
	module.exports = exports['default'];

/***/ })
/******/ ])
});
;
//# sourceMappingURL=ext-messenger.min.js.map