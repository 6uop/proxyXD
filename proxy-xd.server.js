(function() {
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



	function HttpExecutor(params) {
		this.xhr = this.createXHR();
		this.headers = params.headers || {};
		this.httpMethod = params.httpMethod || 'GET';
		this.body = params.body || false;
		this.url = params.url;
		this.parameters = this.stringifyParams(params.parameters || {});
		if (this.parameters) {
			if (this.body || this.httpMethod === 'GET') {
				if (this.url) {
					this.url = [this.url];
					if (this.url.indexOf('?') == -1) {
						this.url.push('?');
					} else {
						this.url.push('&');
					}
					this.url.push(this.parameters);
					this.url = this.url.join('');
					this.parameters = null;
				}
			}
		}
	}

	HttpExecutor.prototype.execute = function(callback) {
		var xhr = this.xhr;
		xhr.open(this.httpMethod, this.url);
		this.setHeaders(xhr, this.headers);
		var onload = this.onLoadWrap(callback);
		var onerror = this.onErrorWrap(callback);

		xhr.onreadystatechange = function() {
			if (xhr.readyState == 4) {
				if (xhr.status == 200) {
					onload();
				} else {
					onerror();
				}
			}
		};
		if (this.body) {
			this.parameters = this.body;
		}
		xhr.send(this.parameters);
	};

	HttpExecutor.prototype.createXHR = function() {
		if ("undefined" != typeof window.ActiveXObject) {
			for (var xmlHttpArr = ["MSXML2.XMLHTTP.6.0", "MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP", "Microsoft.XMLHTTP"], i = 0; i < xmlHttpArr.length; i++) {
				var xmlHttp = xmlHttpArr[i];
				try {
					return new window.ActiveXObject(xmlHttp);

				} catch (e) {}
			}
		} else if ("undefined" != typeof window.XMLHttpRequest && "undefined" == typeof window.ActiveXObject) {
			return new window.XMLHttpRequest;
		} else {
			return null;
		}
	};
	HttpExecutor.prototype.stringifyParams = function(parameters) {
		if (parameters) {
			var stringBuff = [];
			for (var name in parameters) {
				var value = parameters[name];
				stringBuff.push([name, '=', value].join(''));
			}
			return stringBuff.join('&');
		}
		return '';
	};
	HttpExecutor.prototype.onLoadWrap = function(callback) {
		var xhr = this.xhr;
		return function() {
			var response = {
				body: xhr.responseText,
				status: xhr.status,
				statusText: xhr.statusText
			};
			callback && callback(response);
		};
	};
	HttpExecutor.prototype.onErrorWrap = function(callback) {
		var xhr = this.xhr;
		return function() {
			var response = {
				body: {
					error: -1,
					message: 'A network error occurred and the request could not be completed.'
				},
				status: (void 0),
				statusText: (void 0)
			};
			callback && callback(response);
		}
	};

	HttpExecutor.prototype.setHeaders = function(xhr, headers) {
		for (var headerName in headers) {
			var headerValue = headers[headerName];
			xhr.setRequestHeader(headerName, headerValue);
		}
	};



	function pollMessage() {
		if (window.postMessage) {
			if (window.addEventListener) {
				window.addEventListener('message', pollMessageHandler, false);
			} else {
				window.attachEvent('onmessage', function() {
					pollMessageHandler.call(window, window.event);
				});
			}
		} else {
			var previous = window.name;
			window.setInterval(function() {
				var current = window.name;
				if (previous != current) {
					previous = window.name;
					var event = {
						data: current
					};
					pollMessageHandler(event);
				}
			}, 30);
		}
	}

	function parseData(data) {
		var result = {};
		if (data) {
			var dataSplit = data.split('_cbi_');
			if (dataSplit)
				var paramString = (!dataSplit[0] || dataSplit[0] == 'Nil') ? '' : dataSplit[0];
			var cbIndex = dataSplit[1];

			result.params = stringToJson(paramString);
			result.cbIndex = cbIndex;
		}
		return result;
	}

	function pollMessageHandler(event) {
		var data = event.data;
		//request to server
		data = parseData(data);
		var httpExecutor = new HttpExecutor(data.params || {});
		httpExecutor.execute(function(response) {
			var postData = jsonToString(response);
			var cbIndex = data.cbIndex || 'Nil';
			postData += '_cbi_' + cbIndex;
			postMessage(parent, postData);
		});
	}

	function postMessage(ctWindow, postData) {
		if (window.postMessage) {
			ctWindow.postMessage(postData, '*');
		} else {
			ctWindow.name = postData;
		}
	}


	var ProxyXD = window.ProxyXD = window.ProxyXD || {};
	ProxyXD.server = {
		'startup': function() {
			pollMessage();
		}
	};

	var qs = queryString('proxy-xd.server.js')
	if (qs && qs.startup) {
		ProxyXD.server.startup();
	}

})();