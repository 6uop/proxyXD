var ProxyXD = (function() {

	var _proxyurl = null;


	function onScriptLoad(script, handler) {
		if (document.addEventListener) {
			script.addEventListener('load', handler, false);
		} else {
			script.onreadystatechange = function() {
				if (/loaded|complete/.test(script.readyState)) {
					script.onreadystatechange = null;
					handler();
				}
			}
		}
	}

	function onReady(callback) {
		var iframe = document.getElementById('anyWhere_iframe');
		if (!iframe) {
			isReady = true;
			var iframe = document.createElement('iframe');
			iframe.style.cssText = 'border:0;width:0;height:0;display:none';
			iframe.id = 'anyWhere_iframe';
			iframe.src = 'about:blank';
			document.body.appendChild(iframe);
			var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
			iframeDocument.open();
			iframeDocument.write('<!DOCTYPE html><html><head><title></title></head><body></body></html>');
			iframeDocument.close();
			var script = iframeDocument.createElement('script');
			script.type = 'text/javascript';
			script.src = 'resource/proxy-xd.client.js?proxyurl='+_proxyurl || 'about:blank';
			script.charset = 'utf-8';
			onScriptLoad(script, function() {
				var proxyClient = iframe.contentWindow.ProxyXD.client;
				callback(proxyClient);
			});
			iframeDocument.getElementsByTagName('body')[0].appendChild(script);
		} else {
			callback(iframe.contentWindow.ProxyXD.client);
		}
	}

	return {
		'config': function(proxyurl) {
			_proxyurl = proxyurl;
		},
		'request': function(params, callback) {
			onReady(function(client) {
				client.request(params).execute(callback);
			});
		}
	};

})();