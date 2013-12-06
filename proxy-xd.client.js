(function() {

	var taskList;
	var taskBuffer = new TaskBuffer();
	var callbacks = {};
	var watch = false;
	var indexForCallback = 1;

	function queryString(ns) {
		var scripts = document.getElementsByTagName('script');
		var length = scripts.length;
		var script = null;
		var retval = {};
		for (var i = 0; i < i < length; i++) {
			if (scripts[i].src.indexOf(ns) >= 0) {
				script = scripts[i];
				if (script) {
					var src = script.src;
					var srcSplit = src.split('?');
					if (srcSplit && srcSplit.length > 0) {
						var queryString = srcSplit.pop();
						for (var queryStringSplit = (queryString !== null ? queryString.split('&') : []), i = 0; i < queryStringSplit.length; i++) {
							var entry = queryStringSplit[i];
							var entrySplit = entry.split('=');
							if (entrySplit) {
								var name = entrySplit.shift();
								var value = entrySplit.shift();
								retval[name] = value;
							}
						}
					}

					return retval;
				}
			}
		}
		return retval;
	}

	var core_trim = String.prototype.trim ;
	var trim = core_trim && !core_trim.call("\uFEFF\xA0") ?
		function( text ) {
			return text == null ?
				"" :
				core_trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		}

	var rvalidchars = /^[\],:{}\s]*$/,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\r\n]*"|true|false|null|-?(?:\d\d*\.|)\d+(?:[eE][\-+]?\d+|)/g;

	function stringToJson(data) {
		if ( !data || typeof data !== "string") {
			return null;
		}

		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = trim( data );

		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
			.replace( rvalidtokens, "]" )
			.replace( rvalidbraces, "")) ) {

			return ( new Function( "return " + data ) )();

		}
		throw "Invalid JSON: " + data 
	}
	function jsonToString(obj) {
		if (window.JSON) {
			return JSON.stringify(obj);
		}
		var t = typeof(obj);
		if (t != "object" || obj === null) {
			// simple data type
			if (t == "string") obj = '"' + obj + '"';
			return String(obj);
		} else {
			// recurse array or object
			var n, v, json = [],
				arr = (obj && obj.constructor == Array);

			// fix.
			var self = arguments.callee;

			for (n in obj) {
				v = obj[n];
				t = typeof(v);
				if (obj.hasOwnProperty(n)) {
					if (t == "string") v = '"' + v + '"';
					else if (t == "object" && v !== null)
					// v = jQuery.stringify(v);
						v = self(v);
					json.push((arr ? "" : '"' + n + '":') + String(v));
				}
			}
			return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
		}

	}

	function addIframeLoadEventListener(iframe, handler) {
		if (iframe.attachEvent) {
			iframe.attachEvent('onload', handler);
		} else {
			iframe.onload = handler;
		}
	}

	function pollMessage() {
		if (window.postMessage) {
			if (window.addEventListener) {
				window.addEventListener('message', pollMessageHandler, false);
				watch = true;
			} else {
				window.attachEvent('onmessage', function() {
					pollMessageHandler.call(window, window.event);
				});
				watch = true;
			}
		} else {
			var previous = window.name;
			window.setInterval(function() {
				var current = window.name;
				if (previous != current) {
					previous = current;
					var event = {
						data: current
					};
					pollMessageHandler(event);
					taskList.next();
				}

			}, 30);
		}
	}

	function pollMessageHandler(event) {
		var data = event.data,
			dataSplit = data.split('_cbi_'),
			response = dataSplit.shift(),
			response = response == 'Nil' ? null : stringToJson(response),
			cbIndex = dataSplit.shift();
		if (cbIndex && cbIndex != 'Nil') {
			var callback = callbacks[cbIndex];
			delete callbacks[cbIndex];
			callback && callback(response);
		}
	}

	function postMessage(ctWindow, postData) {
		if (window.postMessage) {
			taskBuffer.addBuffer(ctWindow.postMessage, {
				args: [postData, '*'],
				context: ctWindow
			});
		} else {
			taskList.addTask(_task, {
				'args': [ctWindow, postData]
			});
		}

	}

	function _task(ctWindow, postData) {
		ctWindow.name = postData;
	}

	function _TaskList(initState) {
		this.length = 0;
		var o = [];
		this.push = o.push;
		this.shift = o.shift;
		this.state = initState || _TaskList.NEXT;
	}
	_TaskList.NEXT = 0;
	_TaskList.WAIT = 1;
	_TaskList.prototype.addTask = function(task, opts) {
		if (task) {
			var opts = opts || {};
			var args = opts.args || [];
			var context = opts.context || window;
			if (this.state === _TaskList.WAIT) {
				var opts = opts || {};
				this.push([task, args, context]);
			} else if (this.state === _TaskList.NEXT) {
				this.state = _TaskList.WAIT;
				task.apply(context, args);
			}
		}
	};

	_TaskList.prototype.next = function() {
		var taskArray = this.shift();
		if (taskArray) {
			var task = taskArray[0];
			var args = taskArray[1];
			var context = taskArray[2];
			task.apply(context, args);
			return true;
		} else {
			this.state = _TaskList.NEXT;
		}
		return false;
	};

	function TaskBuffer() {
		this.length = 0;
		var o = [];
		this.push = o.push;
		this.shift = o.shift;
		this.state = false;

	}
	TaskBuffer.prototype.addBuffer = function(task, opts) {
		if (task) {
			var opts = opts || {};
			var args = opts.args || [];
			var context = opts.context || window;
			if (!this.state) {
				var opts = opts || {};
				this.push([task, args, context]);
			} else {
				task.apply(context, args);
			}
		}
	}
	TaskBuffer.prototype.execute = function() {
		for (var i = 0; i < this.length; i++) {
			var taskArray = this[i];
			var task = taskArray[0];
			var args = taskArray[1];
			var context = taskArray[2];
			task.apply(context, args);
		}
		this.state = true;
	}

	taskList = new _TaskList(_TaskList.WAIT);


	var ProxyXD = window.ProxyXD = window.ProxyXD || {};
	ProxyXD.client = {
		'createConnection': function(proxyPageUrl) {
			var iframe = document.createElement('iframe');
			iframe.src = proxyPageUrl;
			iframe.id = 'proxy_xd_iframe';
			addIframeLoadEventListener(iframe, function() {
				if (window.postMessage) {
					taskBuffer.execute();
				} else {
					taskList.next();
				}
			});

			document.body.appendChild(iframe);
			this.contentWindow = iframe.contentWindow;


		},
		'request': function(params) {
			var params = jsonToString(params);
			var contentWindow = this.contentWindow;

			return {
				'execute': function(callback) {
					var postData = params + '_cbi_';
					if (callback) {
						var cbIndex = callback.cbIndex = indexForCallback++;
						callbacks[cbIndex] = callback;
						postData += cbIndex;
					} else {
						postData += 'Nil';
					}
					if (!watch) {
						watch = true;
						pollMessage();
					}
					postMessage(contentWindow, postData);
				}
			};
		}
	};
	ProxyXD.client.createConnection(queryString('proxy-xd.client.js').proxyurl);

})();