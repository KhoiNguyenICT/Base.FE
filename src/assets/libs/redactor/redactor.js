/*
    Redactor
    Version 3.0 b5
    Updated: January 17, 2018

    http://imperavi.com/redactor/

    Copyright (c) 2009-2018, Imperavi LLC.
    License: http://imperavi.com/redactor/license/
*/
;(function() {
var Ajax = {};

Ajax.settings = {};
Ajax.post = function(options) { return new AjaxRequest('post', options); };
Ajax.get = function(options) { return new AjaxRequest('get', options); };

var AjaxRequest = function(method, options)
{
    var defaults = {
        method: method,
        url: '',
        before: function() {},
        success: function() {},
        error: function() {},
        data: false,
        async: true,
        headers: {}
    };

    this.p = this.extend(defaults, options);
    this.p = this.extend(this.p, Ajax.settings);
    this.p.method = this.p.method.toUpperCase();

    this.prepareData();

    this.xhr = new XMLHttpRequest();
    this.xhr.open(this.p.method, this.p.url, this.p.async);

    this.setHeaders();

    var before = (typeof this.p.before === 'function') ? this.p.before(this.xhr) : true;
    if (before !== false)
    {
        this.send();
    }
};

AjaxRequest.prototype = {
    extend: function(obj1, obj2)
    {
        if (obj2) for (var name in obj2) { obj1[name] = obj2[name]; }
        return obj1;
    },
    prepareData: function()
    {
        if (this.p.method === 'POST' && !this.isFormData()) this.p.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        if (typeof this.p.data === 'object' && !this.isFormData()) this.p.data = this.toParams(this.p.data);
        if (this.p.method === 'GET') this.p.url = this.p.url + '?' + this.p.data;
    },
    setHeaders: function()
    {
        this.xhr.setRequestHeader('X-Requested-With', this.p.headers['X-Requested-With'] || 'XMLHttpRequest');
        for (var name in this.p.headers)
        {
            this.xhr.setRequestHeader(name, this.p.headers[name]);
        }
    },
    isFormData: function()
    {
        return (typeof window.FormData !== 'undefined' && this.p.data instanceof window.FormData);
    },
    isComplete: function()
    {
        return !(this.xhr.status < 200 || this.xhr.status >= 300 && this.xhr.status !== 304);
    },
    send: function()
    {
        if (this.p.async)
        {
            this.xhr.onload = this.loaded.bind(this);
            this.xhr.send(this.p.data);
        }
        else
        {
            this.xhr.send(this.p.data);
            this.loaded.call(this);
        }
    },
    loaded: function()
    {
        if (this.isComplete())
        {
            var response = this.xhr.response;
            var json = this.parseJson(response);
            response = (json) ? json : response;

            if (typeof this.p.success === 'function') this.p.success(response, this.xhr);
        }
        else
        {
            if (typeof this.p.error === 'function') this.p.error(this.xhr.statusText);
        }
    },
    parseJson: function(str)
    {
        try {
            str = str.replace(/^\[/, '');
            str = str.replace(/\]$/, '');

            var o = JSON.parse(str);
            if (o && typeof o === 'object')
            {
                return o;
            }
        } catch (e) {}

        return false;
    },
    toParams: function (obj)
    {
        return Object.keys(obj).map(
            function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(obj[k]) }
        ).join('&');
    }
};
var DomCache = [0];
var DomExpando = 'data' + +new Date();
var DomDisplayCache = {};

var Dom = function(selector, context)
{
    return this.parse(selector, context);
};

Dom.ready = function(fn)
{
    if (document.readyState != 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
};

Dom.prototype = {
    get dom()
    {
        return true;
    },
    get length()
    {
        return this.nodes.length;
    },
    parse: function(selector, context)
    {
        var nodes;
        var reHtmlTest = /^\s*<(\w+|!)[^>]*>/;

        if (!selector)
        {
            nodes = [];
        }
        else if (selector.dom)
        {
            this.nodes = selector.nodes;
            return selector;
        }
        else if (typeof selector !== 'string')
        {
            if (selector.nodeType && selector.nodeType === 11)
            {
                nodes = selector.childNodes;
            }
            else
            {
                nodes = (selector.nodeType || selector === window) ? [selector] : selector;
            }
        }
        else if (reHtmlTest.test(selector))
        {
            nodes = this.create(selector);
        }
        else
        {
            nodes = this._query(selector, context);
        }

        this.nodes = this._slice(nodes);
    },
    create: function(html)
    {
        if (/^<(\w+)\s*\/?>(?:<\/\1>|)$/.test(html))
        {
            return [document.createElement(RegExp.$1)];
        }

        var elements = [];
        var container = document.createElement('div');
        var children = container.childNodes;

        container.innerHTML = html;

        for (var i = 0, l = children.length; i < l; i++)
        {
            elements.push(children[i]);
        }

        return elements;
    },

    // add
    add: function(nodes)
    {
        this.nodes = this.nodes.concat(this._toArray(nodes));
    },

    // get
    get: function(index)
    {
        return this.nodes[(index || 0)] || false;
    },
    getAll: function()
    {
        return this.nodes;
    },
    eq: function(index)
    {
        return new Dom(this.nodes[index]) || false;
    },
    first: function()
    {
        return new Dom(this.nodes[0]) || false;
    },
    last: function()
    {
        return new Dom(this.nodes[this.nodes.length - 1]) || false;
    },
    contents: function()
    {
        return this.get().childNodes;
    },

    // loop
    each: function(callback)
    {
        var len = this.nodes.length;
        for (var i = 0; i < len; i++)
        {
            callback.call(this, (this.nodes[i].dom) ? this.nodes[i].get() : this.nodes[i], i);
        }

        return this;
    },

    // traversing
    is: function(selector)
    {
        return (this.filter(selector).length > 0);
    },
    filter: function (selector)
    {
        var callback;
        if (selector === undefined)
        {
            return this;
        }
        else if (typeof selector === 'function')
        {
            callback = selector;
        }
        else
        {
            callback = function(node)
            {
                if (selector instanceof Node)
                {
                    return (selector === node);
                }
                else if (selector && selector.dom)
                {
                    return ((selector.nodes).indexOf(node) !== -1);
                }
                else
                {
                    node.matches = node.matches || node.msMatchesSelector || node.webkitMatchesSelector;
                    return (node.nodeType === 1) ? node.matches(selector || '*') : false;
                }
            };
        }

        return new Dom(this.nodes.filter(callback));
    },
    not: function(filter)
    {
        return this.filter(function(node)
        {
            return !new Dom(node).is(filter || true);
        });
    },
    find: function(selector)
    {
        var nodes = [];
        this.each(function(node)
        {
            var ns = this._query(selector || '*', node);
            for (var i = 0; i < ns.length; i++)
            {
                nodes.push(ns[i]);
            }
        });

        return new Dom(nodes);
    },
    children: function(selector)
    {
        var nodes = [];
        this.each(function(node)
        {
            if (node.children)
            {
                var ns = node.children;
                for (var i = 0; i < ns.length; i++)
                {
                    nodes.push(ns[i]);
                }
            }
        });

        return new Dom(nodes).filter(selector);
    },
    parent: function(selector)
    {
        var nodes = [];
        this.each(function(node)
        {
            if (node.parentNode) nodes.push(node.parentNode);
        });

        return new Dom(nodes).filter(selector);
    },
    parents: function(selector, context)
    {
        context = this._getContext(context);

        var nodes = [];
        this.each(function(node)
        {
            var parent = node.parentNode;
            while (parent && parent !== context)
            {
                if (selector)
                {
                    if (new Dom(parent).is(selector)) { nodes.push(parent); }
                }
                else
                {
                    nodes.push(parent);
                }

                parent = parent.parentNode;
            }
        });

        return new Dom(nodes);
    },
    closest: function(selector, context)
    {
        context = this._getContext(context);
        selector = (selector.dom) ? selector.get() : selector;

        var nodes = [];
        var isNode = (selector && selector.nodeType);
        this.each(function(node)
        {
            do {
                if ((isNode && node === selector) || new Dom(node).is(selector)) return nodes.push(node);
            } while ((node = node.parentNode) && node !== context);
        });

        return new Dom(nodes);
    },
    next: function()
    {
        return new Dom(this.get().nextSibling);
    },
    nextElement: function()
    {
        return new Dom(this.get().nextElementSibling);
    },
    prev: function()
    {
        return new Dom(this.get().previousSibling);
    },
    prevElement: function()
    {
        return new Dom(this.get().previousElementSibling);
    },

    // css
    css: function(name, value)
    {
        if (value === undefined && (typeof name !== 'object'))
        {
            var node = this.get();
            if (name === 'width' || name === 'height')
            {
                return (node.style) ? this._getHeightOrWidth(name, node, false) + 'px' : undefined;
            }
            else
            {
                return (node.style) ? getComputedStyle(node, null)[name] : undefined;
            }
        }

        // set
        return this.each(function(node)
        {
            var obj = {};
            if (typeof name === 'object') obj = name;
            else obj[name] = value;

            for (var key in obj)
            {
                if (node.style) node.style[key] = obj[key];
            }
        });
    },

    // attr
    attr: function(name, value, data)
    {
        data = (data) ? 'data-' : '';

        if (value === undefined && (typeof name !== 'object'))
        {
            if (this.get().nodeType !== 3)
            {
                return (name === 'checked') ? this.get().checked : this.get().getAttribute(data + name);
            }
            else return;
        }

        // set
        return this.each(function(node)
        {
            var obj = {};
            if (typeof name === 'object') obj = name;
            else obj[name] = value;

            for (var key in obj)
            {
                if (node.nodeType !== 3)
                {
                    if (key === 'checked' && obj[key] === false) node.removeAttribute(key);
                    else node.setAttribute(data + key, obj[key]);
                }
            }
        });
    },
    data: function(name, value)
    {
        if (name === undefined)
        {
            var reDataAttr = /^data\-(.+)$/;
            var attrs = this.get().attributes;

            var data = {};

            for (var key in attrs)
            {
                if (reDataAttr.test(attrs[key].nodeName))
                {
                    var name = attrs[key].nodeName.match(reDataAttr)[1];
                    name = name.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
                    data[name] = (this._isNumber(attrs[key].value)) ? parseFloat(attrs[key].value) : attrs[key].value;
                }
            }

            return data;
        }

        return this.attr(name, value, true);
    },
    val: function(value)
    {
        if (value === undefined)
        {
            var el = this.get();
            if (el.type && el.type === 'checkbox') return el.checked;
            else return el.value;
        }

        return this.each(function(node)
        {
            node.value = value;
        });
    },
    removeAttr: function(value)
    {
        return this.each(function(node)
        {
            value.split(' ').forEach(function(name) { (node.nodeType !== 3) ? node.removeAttribute(name) : false; });
        });
    },
    removeData: function(value)
    {
        return this.each(function(node)
        {
            value.split(' ').forEach(function(name) { (node.nodeType !== 3) ? node.removeAttribute('data-' + name) : false; });
        });
    },

    // dataset/dataget
    dataset: function(key, value)
    {
        return this.each(function(node)
        {
            DomCache[this.dataindex(node)][key] = value;
        });
    },
    dataget: function(key)
    {
        return DomCache[this.dataindex(this.get())][key];
    },
    dataindex: function(el)
    {
        var cacheIndex = el[DomExpando];
        var nextCacheIndex = DomCache.length;

        if (!cacheIndex)
        {
            cacheIndex = el[DomExpando] = nextCacheIndex;
            DomCache[cacheIndex] = {};
        }

        return cacheIndex;
    },

    // class
    addClass: function(value)
    {
        return this._eachClass(value, 'add');
    },
    removeClass: function(value)
    {
        return this._eachClass(value, 'remove');
    },
    toggleClass: function(value)
    {
        return this._eachClass(value, 'toggle');
    },
    hasClass: function(value)
    {
        return this.nodes.some(function(node)
        {
            return (node.classList) ? node.classList.contains(value) : false;
        });
    },

    // html & text
    empty: function()
    {
        return this.each(function(node)
        {
            return node.innerHTML = '';
        });
    },
    html: function(html)
    {
        return (html === undefined) ? (this.get().innerHTML || '') : this.empty().append(html);
    },
    text: function(text)
    {
        return (text === undefined) ? (this.get().textContent || '') : this.each(function(node) { node.textContent = text; });
    },

    // manipulation
    after: function(html)
    {
        return this._inject(html, function(frag, node)
        {
            if (typeof frag === 'string')
            {
                node.insertAdjacentHTML('afterend', frag);
            }
            else
            {
                var elms = (frag instanceof Node) ? [frag] : this._toArray(frag).reverse();
                for (var i = 0; i < elms.length; i++)
                {
                    node.parentNode.insertBefore(elms[i], node.nextSibling);
                }
            }

            return node;

        });
    },
    before: function(html)
    {
        return this._inject(html, function(frag, node)
        {
            if (typeof frag === 'string')
            {
                node.insertAdjacentHTML('beforebegin', frag);
            }
            else
            {
                var elms = (frag instanceof Node) ? [frag] : this._toArray(frag);
                for (var i = 0; i < elms.length; i++)
                {
                    node.parentNode.insertBefore(elms[i], node);
                }
            }

            return node;
        });
    },
    append: function(html)
    {
        return this._inject(html, function(frag, node)
        {
            if (typeof frag === 'string')
            {
                node.insertAdjacentHTML('beforeend', frag);
            }
            else
            {
                var elms = (frag instanceof Node) ? [frag] : this._toArray(frag);
                for (var i = 0; i < elms.length; i++)
                {
                    node.appendChild(elms[i]);
                }
            }

            return node;
        });
    },
    prepend: function(html)
    {
        return this._inject(html, function(frag, node)
        {
            if (typeof frag === 'string')
            {
                node.insertAdjacentHTML('afterbegin', frag);
            }
            else
            {
                var elms = (frag instanceof Node) ? [frag] : this._toArray(frag).reverse();
                for (var i = 0; i < elms.length; i++)
                {
                    node.insertBefore(elms[i], node.firstChild);
                }
            }

            return node;
        });
    },
    wrap: function(html)
    {
        return this._inject(html, function(frag, node)
        {
            var wrapper = (typeof frag === 'string') ? this.create(frag)[0] : (frag instanceof Node) ? frag : this._toArray(frag)[0];

            if (node.parentNode)
            {
                node.parentNode.insertBefore(wrapper, node);
            }

            wrapper.appendChild(node);

            return new Dom(wrapper);
        });
    },
    unwrap: function()
    {
        return this.each(function(node)
        {
            var $node = new Dom(node);

            return $node.replaceWith($node.contents());
        });
    },
    replaceWith: function(html)
    {
        return this._inject(html, function(frag, node)
        {
            var docFrag = document.createDocumentFragment();
            var elms = (typeof frag === 'string') ? this.create(frag) : (frag instanceof Node) ? [frag] : this._toArray(frag);

            for (var i = 0; i < elms.length; i++)
            {
                docFrag.appendChild(elms[i]);
            }

            var result = docFrag.childNodes[0];
            node.parentNode.replaceChild(docFrag, node);

            return result;

        });
    },
    remove: function()
    {
        return this.each(function(node)
        {
            if (node.parentNode) node.parentNode.removeChild(node);
        });
    },
    clone: function(events)
    {
        var nodes = [];
        this.each(function(node)
        {
            var copy = this._clone(node);
            if (events) copy = this._cloneEvents(node, copy);
            nodes.push(copy);
        });

        return new Dom(nodes);
    },

    // show/hide
    show: function()
    {
        return this.each(function(node)
        {
            if (node.style)
            {
                if (this._getRealDisplay(node) !== 'none') return;

                var old = node.getAttribute('displayOld');
                node.style.display = old || '';

                if (this._getRealDisplay(node) === 'none')
                {
                    var nodeName = node.nodeName, body = document.body, display;

                    if (DomDisplayCache[nodeName])
                    {
                        display = DomDisplayCache[nodeName];
                    }
                    else
                    {
                        var testElem = document.createElement(nodeName);
                        body.appendChild(testElem);
                        display = this._getRealDisplay(testElem);

                        if (display === 'none') display = 'block';

                        body.removeChild(testElem);
                        DomDisplayCache[nodeName] = display;
                    }

                    node.setAttribute('displayOld', display);
                    node.style.display = display;
                }
            }
        }.bind(this));
    },
    hide: function()
    {
        return this.each(function(node)
        {
            if (node.style)
            {
                if (!node.getAttribute('displayOld') && node.style.display !== '')
                {
                    node.setAttribute("displayOld", node.style.display);
                }

                node.style.display = 'none';
            }
        });
    },

    // dimensions
    scrollTop: function(value)
    {
        var node = this.get();
        var isWindow = (node === window);
        var isDocument = (node.nodeType === 9);
        var el = (isDocument) ? (document.documentElement || document.body.parentNode || document.body) : node;

        if (value !== undefined)
        {
            if (isWindow) window.scrollTo(0, value);
            else          el.scrollTop = value;
            return;
        }

        return (isWindow) ? window.pageYOffset : el.scrollTop
    },
    offset: function()
    {
        return this._getDim('Offset');
    },
    position: function()
    {
        return this._getDim('Position');
    },
    width: function(value, adjust)
    {
        return this._getSize('width', 'Width', value, adjust);
    },
    height: function(value, adjust)
    {
        return this._getSize('height', 'Height', value, adjust);
    },
    outerWidth: function()
    {
        return this._getInnerOrOuter('width', 'outer');
    },
    outerHeight: function()
    {
        return this._getInnerOrOuter('height', 'outer');
    },
    innerWidth: function()
    {
        return this._getInnerOrOuter('width', 'inner');
    },
    innerHeight: function()
    {
        return this._getInnerOrOuter('height', 'inner');
    },

    // events
    click: function()
    {
        return this._triggerEvent('click');
    },
    focus: function()
    {
        return this._triggerEvent('focus');
    },
    trigger: function(names)
    {
        return this.each(function(node)
        {
            var events = names.split(' ');
            for (var i = 0; i < events.length; i++)
            {
                var ev;
                var opts = { bubbles: true, cancelable: true };

                try {
                    ev = new window.CustomEvent(events[i], opts);
                } catch(e) {
                    ev = document.createEvent('CustomEvent');
                    ev.initCustomEvent(events[i], true, true);
                }

                node.dispatchEvent(ev);
            }
        });
    },
    on: function(names, handler, one)
    {
        return this.each(function(node)
        {
            var events = names.split(' ');
            for (var i = 0; i < events.length; i++)
            {
                var event = this._getEventName(events[i]);
                var namespace = this._getEventNamespace(events[i]);

                handler = (one) ? this._getOneHandler(handler, names) : handler;
                node.addEventListener(event, handler);

                node._e = node._e || {};
                node._e[namespace] = node._e[namespace] || {};
                node._e[namespace][event] = node._e[namespace][event] || [];
                node._e[namespace][event].push(handler);
            }

        });
    },
    one: function(events, handler)
    {
        return this.on(events, handler, true);
    },
    off: function(names, handler)
    {
        if (names === undefined)
        {
            // ALL
            return this.each(function(node)
            {
                this._offEvent(node, false, false, handler, function(name, key, event, namespace) { return true; });
            });
        }

        return this.each(function(node)
        {
            var events = names.split(' ');
            for (var i = 0; i < events.length; i++)
            {
                var event = this._getEventName(events[i]);
                var namespace = this._getEventNamespace(events[i]);

                // 1) event without namespace
                if (namespace === '_events')
                {
                    this._offEvent(node, event, namespace, handler, function(name, key, event, namespace) { return (name === event); });
                }
                // 2) only namespace
                else if (!event && namespace !== '_events')
                {
                    this._offEvent(node, event, namespace, handler, function(name, key, event, namespace) { return (key === namespace); });
                }
                // 3) event + namespace
                else
                {
                    this._offEvent(node, event, namespace, handler, function(name, key, event, namespace) { return (name === event && key === namespace); });
                }
            }
        });
    },

    // form
    serialize: function(asObject)
    {
        var obj = {};
        var elms = this.get().elements;
        for (var i = 0; i < elms.length; i++)
        {
            var el = elms[i];
            if (/(checkbox|radio)/.test(el.type) && !el.checked) continue;
            if (!el.name || el.disabled || el.type === 'file') continue;

            if (el.type === 'select-multiple')
            {
                for (var z = 0; z < el.options.length; z++)
                {
                    var opt = el.options[z];
                    if (opt.selected) obj[el.name] = opt.value;
                }
            }

            obj[el.name] = el.value;
        }

        return (asObject) ? obj : this._toParams(obj);
    },
    ajax: function(success, error)
    {
        if (typeof AjaxRequest !== 'undefined')
        {
            var method = this.attr('method') || 'post';
            var options = {
                url: this.attr('action'),
                data: this.serialize(),
                success: success,
                error: error
            };

            return new AjaxRequest(method, options);
        }
    },

    // private
    _queryContext: function(selector, context)
    {
        context = this._getContext(context);

        return (context.nodeType !== 3 && typeof context.querySelectorAll === 'function') ? context.querySelectorAll(selector) : [];
    },
    _query: function(selector, context)
    {
        if (context)
        {
            return this._queryContext(selector, context);
        }
        else if (/^[.#]?[\w-]*$/.test(selector))
        {
            if (selector[0] === '#')
            {
                var element = document.getElementById(selector.slice(1));
                return element ? [element] : [];
            }

            if (selector[0] === '.')
            {
                return document.getElementsByClassName(selector.slice(1));
            }

            return document.getElementsByTagName(selector);
        }

        return document.querySelectorAll(selector);
    },
    _getContext: function(context)
    {
        context = (typeof context === 'string') ? document.querySelector(context) : context;

        return (context && context.dom) ? context.get() : (context || document);
    },
    _inject: function(html, fn)
    {
        var len = this.nodes.length;
        var nodes = [];
        while (len--)
        {
            html = (typeof html === 'function') ? html.call(this, this.nodes[len]) : html;
            var el = (len === 0) ? html : this._clone(html);
            var node = fn.call(this, el, this.nodes[len]);

            if (node)
            {
                if (node.dom) nodes.push(node.get());
                else nodes.push(node);
            }
        }

        return new Dom(nodes);
    },
    _cloneEvents: function(node, copy)
    {
        var events = node._e;
        if (events)
        {
            copy._e = events;
            for (var name in events._events)
            {
                for (var i = 0; i < events._events[name].length; i++)
                {
                    copy.addEventListener(name, events._events[name][i]);
                }
            }
        }

        return copy;
    },
    _clone: function(node)
    {
        if (typeof node === 'undefined') return;
        if (typeof node === 'string') return node;
        else if (node instanceof Node) return node.cloneNode(true);
        else if ('length' in node)
        {
            return [].map.call(this._toArray(node), function(el) { return el.cloneNode(true); });
        }

        return node;
    },
    _slice: function(obj)
    {
        return (!obj || obj.length === 0) ? [] : (obj.length) ? [].slice.call(obj.nodes || obj) : [obj];
    },
    _eachClass: function(value, type)
    {
        return this.each(function(node)
        {
            if (value)
            {
                value.split(' ').forEach(function(name) { (node.classList) ? node.classList[type](name) : false; });
            }
        });
    },
    _triggerEvent: function(name)
    {
        var node = this.get();
        if (node && node.nodeType !== 3) node[name]();
        return this;
    },
    _getOneHandler: function(handler, events)
    {
        var self = this
        return function()
        {
            handler.apply(this, arguments);
            self.off(events);
        };
    },
    _getEventNamespace: function(event)
    {
        var arr = event.split('.');
        var namespace = (arr[1]) ? arr[1] : '_events';
        return (arr[2]) ? namespace + arr[2] : namespace;
    },
    _getEventName: function(event)
    {
        return event.split('.')[0];
    },
    _offEvent: function(node, event, namespace, handler, condition)
    {
        for (var key in node._e)
        {
            for (var name in node._e[key])
            {
                if (condition(name, key, event, namespace))
                {
                    var handlers = node._e[key][name];
                    for (var i = 0; i < handlers.length; i++)
                    {
                        if (typeof handler !== 'undefined' && handlers[i].toString() !== handler.toString())
                        {
                            continue;
                        }

                        node.removeEventListener(name, handlers[i]);
                        node._e[key][name].splice(i, 1);

                        if (node._e[key][name].length === 0) delete node._e[key][name];
                        if (Object.keys(node._e[key]).length === 0) delete node._e[key];
                    }
                }
            }
        }
    },
    _getInnerOrOuter: function(method, type)
    {
        return this[method](undefined, type);
    },
    _getDocSize: function(node, type)
    {
        var body = node.body, html = node.documentElement;
        return Math.max(body['scroll' + type], body['offset' + type], html['client' + type], html['scroll' + type], html['offset' + type]);
    },
    _getSize: function(type, captype, value, adjust)
    {
        if (value === undefined)
        {
            var el = this.get();
            if (el.nodeType === 3)      value = 0;
            else if (el.nodeType === 9) value = this._getDocSize(el, captype);
            else if (el === window)     value = window['inner' + captype];
            else                        value = this._getHeightOrWidth(type, el, adjust || 'normal');

            return Math.round(value);
        }

        return this.each(function(node)
        {
            value = parseFloat(value);
            value = value + this._adjustResultHeightOrWidth(type, node, adjust || 'normal');

            new Dom(node).css(type, value + 'px');

        }.bind(this));
    },
    _getHeightOrWidth: function(type, el, adjust)
    {
        var name = type.charAt(0).toUpperCase() + type.slice(1);
        var style = getComputedStyle(el, null);
        var $el = new Dom(el);
        var $targets = $el.parents().filter(function(node)
        {
            return (getComputedStyle(node, null).display === 'none') ? node : false;
        });

        if (style.display === 'none') $targets.add(el);
        if ($targets.length !== 0)
        {
            var fixStyle = 'visibility: hidden !important; display: block !important;';
            var tmp = [];
            var result = 0;

            $targets.each(function(node)
            {
                var $node = new Dom(node);
                var thisStyle = $node.attr('style');
                tmp.push(thisStyle);
                $node.attr('style', (thisStyle) ? thisStyle + ';' + fixStyle : fixStyle);
            });

            result = $el.get()['offset' + name] - this._adjustResultHeightOrWidth(type, el, adjust);

            $targets.each(function(node, i)
            {
                var $node = new Dom(node);
                if (tmp[i] === undefined) $node.removeAttr('style');
                else $node.attr('style', tmp[i]);
            });
        }
        else
        {
            result = el['offset' + name] - this._adjustResultHeightOrWidth(type, el, adjust);
        }

        return result;
    },
    _adjustResultHeightOrWidth: function(type, el, adjust)
    {
        if (!el || adjust === false) return 0;

        var fix = 0;
        var style = getComputedStyle(el, null);
        var isBorderBox = (style.boxSizing === "border-box");

        if (type === 'height')
        {
            if (adjust === 'inner' || (adjust === 'normal' && isBorderBox))
            {
                fix += (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
            }

            if (adjust === 'outer') fix -= (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
        }
        else
        {
            if (adjust === 'inner' || (adjust === 'normal' && isBorderBox))
            {
                fix += (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
            }

            if (adjust === 'outer') fix -= (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
        }

        return fix;
    },
    _getDim: function(type)
    {
        var node = this.get();
        return (node.nodeType === 3) ? { top: 0, left: 0 } : this['_get' + type](node);
    },
    _getPosition: function(node)
    {
        return { top: node.offsetTop, left: node.offsetLeft };
    },
    _getOffset: function(node)
    {
        var rect = node.getBoundingClientRect();
        var doc = node.ownerDocument;
		var docElem = doc.documentElement;
		var win = doc.defaultView;

		return {
			top: rect.top + win.pageYOffset - docElem.clientTop,
			left: rect.left + win.pageXOffset - docElem.clientLeft
		};
    },
    _toArray: function(obj)
    {
        if (obj instanceof NodeList)
        {
            var arr = [];
            for (var i = 0; i < obj.length; i++)
            {
                arr[i] = obj[i];
            }

            return arr;
        }
        else if (obj === undefined) return [];
        else
        {
            return (obj.dom) ? obj.nodes : obj;
        }
    },
    _toParams: function(obj)
    {
        var params = '';
        for (var key in obj)
        {
            params += '&' + this._encodeUri(key) + '=' + this._encodeUri(obj[key]);
        }

        return params.replace(/^&/, '');
    },
    _encodeUri: function(str)
    {
        return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
    },
    _isNumber: function(obj)
    {
        return !isNaN(parseFloat(obj));
    },
    _getRealDisplay: function(elem)
    {
	    if (elem.currentStyle) return elem.currentStyle.display
        else if (window.getComputedStyle)
        {
		    var computedStyle = window.getComputedStyle(elem, null )
            return computedStyle.getPropertyValue('display')
        }
    }
};
// Unique ID
var uuid = 0;

// Wrapper
var $R = function(selector, options)
{
    return RedactorApp(selector, options, [].slice.call(arguments, 2));
};

// Globals
$R.version = '3.0';
$R.options = {};
$R.modules = {};
$R.services = {};
$R.classes = {};
$R.plugins = {};
$R.mixins = {};
$R.modals = {};
$R.lang = {};
$R.dom = function(selector, context) { return new Dom(selector, context); };
$R.ajax = Ajax;
$R.Dom = Dom;
$R.keycodes = {
	BACKSPACE: 8,
	DELETE: 46,
	UP: 38,
	DOWN: 40,
	ENTER: 13,
	SPACE: 32,
	ESC: 27,
	TAB: 9,
	CTRL: 17,
	META: 91,
	SHIFT: 16,
	ALT: 18,
	RIGHT: 39,
	LEFT: 37
};
$R.env = {
    'plugin': 'plugins',
    'module': 'modules',
    'service': 'services',
    'class': 'classes',
    'mixin': 'mixins'
};

// jQuery Wrapper
if (typeof jQuery !== 'undefined')
{
    (function($) { $.fn.redactor = function(options) { return RedactorApp(this.toArray(), options, [].slice.call(arguments, 1)); }; })(jQuery);
}

// Class
var RedactorApp = function(selector, options, args)
{
    var namespace = 'redactor';
    var nodes = (Array.isArray(selector)) ? selector : (selector && selector.nodeType) ? [selector] : document.querySelectorAll(selector);
    var isApi = (typeof options === 'string' || typeof options === 'function');
    var value = [];
    var instance;

    for (var i = 0; i < nodes.length; i++)
    {
        var el = nodes[i];
        var $el = $R.dom(el);

        instance = $el.dataget(namespace);
        if (!instance && !isApi)
        {
            // Initialization
            $el.dataset(namespace, (instance = new App(el, options, uuid)));
            uuid++;
        }

         // API
        if (instance && isApi)
        {
            var isDestroy = (options === 'destroy');
            options = (isDestroy) ? 'stop' : options;

            var methodValue;
            if (typeof options === 'function')
            {
                methodValue = options.apply(instance, args);
            }
            else
            {
                args.unshift(options);
                methodValue = instance.api.apply(instance, args);
            }
            if (methodValue !== undefined) value.push(methodValue);

            if (isDestroy) $el.dataset(namespace, false);
        }
    }

    return (value.length === 0 || value.length === 1) ? ((value.length === 0) ? instance : value[0]) : value;
};

// add
$R.add = function(type, name, obj)
{
    if (typeof $R.env[type] === 'undefined') return;

    // translations
    if (obj.translations)
    {
        $R.lang = $R.extend(true, {}, $R.lang, obj.translations);
    }

    // modals
    if (obj.modals)
    {
        $R.modals = $R.extend(true, {}, $R.modals, obj.modals);
    }

    // mixin
    if (type === 'mixin')
    {
        $R[$R.env[type]][name] = obj;
    }
    else
    {
        // prototype
        var F = function() {};
        F.prototype = obj;

        // mixins
        if (obj.mixins)
        {
            for (var i = 0; i < obj.mixins.length; i++)
            {
                $R.inherit(F, $R.mixins[obj.mixins[i]]);
            }
        }

        $R[$R.env[type]][name] = F;
    }
};

// create
$R.create = function(name)
{
    var arr = name.split('.');
    var args = [].slice.call(arguments, 1);

    var type = 'classes'
    if (typeof $R.env[arr[0]] !== 'undefined')
    {
        type = $R.env[arr[0]];
        name = arr.slice(1).join('.');
    }

    // construct
    var instance = new $R[type][name]();

    // init
    if (instance.init)
    {
        var res = instance.init.apply(instance, args);

        return (res) ? res : instance;
    }

    return instance;
};

// inherit
$R.inherit = function(current, parent)
{
    var F = function () {};
    F.prototype = parent;
    var f = new F();

    for (var prop in current.prototype)
    {
        if (current.prototype.__lookupGetter__(prop)) f.__defineGetter__(prop, current.prototype.__lookupGetter__(prop));
        else f[prop] = current.prototype[prop];
    }

    current.prototype = f;
    current.prototype.super = parent;

    return current;
};

// error
$R.error = function(exception)
{
    throw exception;
};

// extend
$R.extend = function()
{
    var extended = {};
    var deep = false;
    var i = 0;
    var length = arguments.length;

    if (Object.prototype.toString.call( arguments[0] ) === '[object Boolean]')
    {
        deep = arguments[0];
        i++;
    }

    var merge = function(obj)
    {
        for (var prop in obj)
        {
            if (Object.prototype.hasOwnProperty.call(obj, prop))
            {
                if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') extended[prop] = $R.extend(true, extended[prop], obj[prop]);
                else extended[prop] = obj[prop];
            }
        }
    };

    for (; i < length; i++ )
    {
        var obj = arguments[i];
        merge(obj);
    }

    return extended;
};
$R.opts = {
	animation: true,
	lang: 'en',
	direction: 'ltr',
	spellcheck: true,
	structure: false,
	scrollTarget: false,
	styles: true,
	stylesClass: 'redactor-styles',
	placeholder: false,

	source: true,
	showSource: false,

	inline: false,

	breakline: false,
	markup: 'p',
	enterKey: true,

	clickToEdit: false,
	clickToSave: false,
	clickToCancel: false,

	focus: false,
	focusEnd: false,

	minHeight: false, // string, '100px'
	maxHeight: false, // string, '100px'
	maxWidth: false, // string, '700px'

	plugins: [], // array
	callbacks: {},

    // pre & tab
	preClass: false, // string
	preSpaces: 4, // or false
	tabindex: false, // int
	tabAsSpaces: false, // true or number of spaces
	tabKey: true,

    // autosave
	autosave: false, // false or url
    autosaveName: false,
	autosaveData: false,

	// toolbar
	toolbar: true,
    toolbarFixed: true,
	toolbarFixedTarget: document,
	toolbarFixedTopOffset: 0, // pixels
	toolbarExternal: false, // ID selector
	toolbarContext: true,

	// air
	air: false,

	// formatting
	formatting: ['p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    formattingAdd: false,
    formattingHide: false,

	// buttons
	buttons: ['html', 'format', 'bold', 'italic', 'deleted', 'lists', 'image', 'file', 'link'],
	// + 'line', 'redo', 'undo', 'underline', 'ol', 'ul', 'indent', 'outdent'
    buttonsTextLabeled: false,
    buttonsAdd: [],
    buttonsAddFirst: [],
    buttonsAddAfter: false,
    buttonsAddBefore: false,
	buttonsHide: [],
	buttonsHideOnMobile: [],

    // image
    imageUpload: false,
    imageUploadParam: 'file',
	imageData: false,
    imageEditable: true,
	imageCaption: true,
	imagePosition: false,
	imageResizable: false,
	imageFloatMargin: '10px',

    // file
    fileUpload: false,
    fileUploadParam: 'file',
	fileData: false,
	fileAttachment: false,

    // upload opts
    uploadData: false,
    dragUpload: true,
    multipleUpload: true,
	clipboardUpload: true,
    uploadBase64: false,

    // Authorization
    accessToken: undefined,

	// link
	linkTarget: false,
    linkNewTab: false,
	linkNofollow: false,
	linkSize: 30,
	linkValidation: true,

	// clean
	cleanOnEnter: true,
	cleanInlineOnEnter: false,
	paragraphize: true,
    removeScript: true,
    removeNewLines: false,
	removeComments: true,
	replaceTags: {
		'b': 'strong',
		'i': 'em',
		'strike': 'del'
	},

	// paste
	pastePlainText: false,
    pasteLinkTarget: false,
    pasteImages: true,
	pasteLinks: true,
	pasteClean: true,
	pasteKeepStyle: [],
    pasteKeepClass: [],
	pasteKeepAttrs: ['td', 'th'],
	pasteBlockTags: ['pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tbody', 'thead', 'tfoot', 'th', 'tr', 'td', 'ul', 'ol', 'li', 'blockquote', 'p', 'figure', 'figcaption'],
	pasteInlineTags: ['a', 'img', 'br', 'strong', 'ins', 'code', 'del', 'span', 'samp', 'kbd', 'sup', 'sub', 'mark', 'var', 'cite', 'small', 'b', 'u', 'em', 'i', 'abbr'],


	// active buttons
	activeButtons: {
		b: 'bold',
		strong: 'bold',
		i: 'italic',
		em: 'italic',
		del: 'deleted',
		strike: 'deleted'
	},
	activeButtonsAdd: {},
	activeButtonsObservers: {},

	// autoparser
	autoparse: true,
	autoparseStart: true,
	autoparsePaste: true,
	autoparseLinks: true,
	autoparseImages: true,
	autoparseVideo: true,

	// shortcodes
	shortcodes: {
    	'p.': { format: 'p' },
    	'quote.': { format: 'blockquote' },
    	'pre.': { format: 'pre' },
    	'h1.': { format: 'h1' },
    	'h2.': { format: 'h2' },
    	'h3.': { format: 'h3' },
    	'h4.': { format: 'h4' },
    	'h5.': { format: 'h5' },
    	'h6.': { format: 'h6' },
    	'1.': { format: 'ol' },
    	'*.': { format: 'ul' }
	},
	shortcodesAdd: false, // object

	// shortcuts
	shortcuts: {
		'ctrl+shift+m, meta+shift+m': { api: 'module.inline.clearformat' },
		'ctrl+b, meta+b': { api: 'module.inline.format', args: 'b' },
		'ctrl+i, meta+i': { api: 'module.inline.format', args: 'i' },
		'ctrl+h, meta+h': { api: 'module.inline.format', args: 'sup' },
		'ctrl+l, meta+l': { api: 'module.inline.format', args: 'sub' },
		'ctrl+k, meta+k': { api: 'module.link.open' },
		'ctrl+alt+0, meta+alt+0': { api: 'module.block.format', args: 'p' },
		'ctrl+alt+1, meta+alt+1': { api: 'module.block.format', args: 'h1' },
		'ctrl+alt+2, meta+alt+2': { api: 'module.block.format', args: 'h2' },
		'ctrl+alt+3, meta+alt+3': { api: 'module.block.format', args: 'h3' },
		'ctrl+alt+4, meta+alt+4': { api: 'module.block.format', args: 'h4' },
		'ctrl+alt+5, meta+alt+5': { api: 'module.block.format', args: 'h5' },
		'ctrl+alt+6, meta+alt+6': { api: 'module.block.format', args: 'h6' },
		'ctrl+shift+7, meta+shift+7': { api: 'module.list.toggle', args: 'ol' },
		'ctrl+shift+8, meta+shift+8': { api: 'module.list.toggle', args: 'ul' }
	},
	shortcutsAdd: false, // object

	// private
	bufferLimit: 100,
	emptyHtml: '<p></p>',
	invisibleSpace: '&#x200b;',
	imageTypes: ['image/png', 'image/jpeg', 'image/gif'],
	inlineTags: ['a', 'span', 'strong', 'strike', 'b', 'u', 'em', 'i', 'code', 'del', 'ins', 'samp', 'kbd', 'sup', 'sub', 'mark', 'var', 'cite', 'small', 'abbr'],
	blockTags: ['pre', 'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',  'dl', 'dt', 'dd', 'div', 'table', 'tbody', 'thead', 'tfoot', 'tr', 'th', 'td', 'blockquote', 'output', 'figcaption', 'figure', 'address', 'section', 'header', 'footer', 'aside', 'article', 'iframe'],
    regex: {
        youtube: /https?:\/\/(?:[0-9A-Z-]+\.)?(?:youtu\.be\/|youtube\.com\S*[^\w\-\s])([\w\-]{11})(?=[^\w\-]|$)(?![?=&+%\w.-]*(?:['"][^<>]*>|<\/a>))[?=&+%\w.-]*/gi,
        vimeo: /https?:\/\/(www\.)?vimeo.com\/(\d+)($|\/)/gi,
        imageurl: /((https?|www)[^\s]+\.)(jpe?g|png|gif)(\?[^\s-]+)?/gi,
        url: /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi
    },
    input: true,
    zindex: false,
    modes: {
        "inline": {
            pastePlainText: true,
            pasteImages: false,
            enterKey: false,
            toolbar: false,
            autoparse: false,
            source: false,
            showSource: false,
            styles: false,
            air: false
        },
        "original": {
            styles: false
        }
    }
};
$R.lang['en'] = {
    "format": "Format",
    "image": "Image",
    "file": "File",
    "link": "Link",
    "bold": "Bold",
    "italic": "Italic",
    "deleted": "Strikethrough",
    "underline": "Underline",
    "superscript": "Superscript",
    "subscript": "Subscript",
    "bold-abbr": "B",
    "italic-abbr": "I",
    "deleted-abbr": "S",
    "underline-abbr": "U",
    "superscript-abbr": "Sup",
    "subscript-abbr": "Sub",
    "lists": "Lists",
    "link-insert": "Insert Link",
    "link-edit": "Edit Link",
    "link-in-new-tab": "Open link in new tab",
    "unlink": "Unlink",
    "cancel": "Cancel",
    "close": "Close",
    "insert": "Insert",
    "save": "Save",
    "delete": "Delete",
    "text": "Text",
    "edit": "Edit",
    "title": "Title",
    "paragraph": "Normal text",
    "quote": "Quote",
    "code": "Code",
    "heading1": "Heading 1",
    "heading2": "Heading 2",
    "heading3": "Heading 3",
    "heading4": "Heading 4",
    "heading5": "Heading 5",
    "heading6": "Heading 6",
    "filename": "Name",
    "optional": "optional",
    "unorderedlist": "Unordered List",
    "orderedlist": "Ordered List",
    "outdent": "Outdent",
    "indent": "Indent",
    "horizontalrule": "Line",
    "upload": "Upload",
    "upload-label": "Drop files here or click to upload",
    "accessibility-help-label": "Rich text editor",
    "caption": "Caption",
    "bulletslist": "Bullets",
    "numberslist": "Numbers",
    "image-position": "Position",
    "none": "None",
    "left": "Left",
    "right": "Right",
    "center": "Center",
    "undo": "Undo",
    "redo": "Redo"
};
$R.buttons = {
    html: {
		title: 'HTML',
		icon: true,
		api: 'module.source.toggle'
	},
	undo: {
		title: '## undo ##',
		icon: true,
		api: 'module.buffer.undo'
	},
	redo: {
		title: '## redo ##',
		icon: true,
		api: 'module.buffer.redo'
	},
    format: {
		title: '## format ##',
		icon: true,
		dropdown: {
			p: {
				title: '## paragraph ##',
				api: 'module.block.format',
				args: {
    				tag: 'p'
				}
			},
			blockquote: {
				title: '## quote ##',
				api: 'module.block.format',
				args: {
    				tag: 'blockquote'
				}
			},
			pre: {
				title: '## code ##',
				api: 'module.block.format',
				args: {
    				tag: 'pre'
				}
			},
			h1: {
				title: '## heading1 ##',
				api: 'module.block.format',
				args: {
    				tag: 'h1'
				}
			},
			h2: {
				title: '## heading2 ##',
				api: 'module.block.format',
				args: {
    				tag: 'h2'
				}
			},
			h3: {
				title: '## heading3 ##',
				api: 'module.block.format',
				args: {
    				tag: 'h3'
				}
			},
			h4: {
				title: '## heading4 ##',
				api: 'module.block.format',
				args: {
    				tag: 'h4'
				}
			},
			h5: {
				title: '## heading5 ##',
				api: 'module.block.format',
				args: {
    				tag: 'h5'
				}
			},
			h6: {
				title: '## heading6 ##',
				api: 'module.block.format',
				args: {
    				tag: 'h6'
				}
			}
		}
	},
	bold: {
		title: '## bold-abbr ##',
		icon: true,
		tooltip: '## bold ##',
		api: 'module.inline.format',
		args: {
    		tag: 'b'
		}
	},
	italic: {
		title: '## italic-abbr ##',
		icon: true,
		tooltip: '## italic ##',
		api: 'module.inline.format',
		args: {
    		tag: 'i'
		}
	},
	deleted: {
		title: '## deleted-abbr ##',
		icon: true,
		tooltip: '## deleted ##',
		api: 'module.inline.format',
		args: {
    		tag: 'del'
		}
	},
	underline: {
		title: '## underline-abbr ##',
		icon: true,
		tooltip: '## underline ##',
		api: 'module.inline.format',
		args: {
    		tag: 'u'
		}
	},
	sup: {
		title: '## superscript-abbr ##',
		icon: true,
		tooltip: '## superscript ##',
		api: 'module.inline.format',
		args: {
    		tag: 'sup'
		}
	},
	sub: {
		title: '## subscript-abbr ##',
		icon: true,
		tooltip: '## subscript ##',
		api: 'module.inline.format',
		args: {
    		tag: 'sub'
		}
	},
	lists: {
		title: '## lists ##',
		icon: true,
  		observe: 'list',
		dropdown: {
    		observe: 'list',
			unorderedlist: {
				title: '&bull; ## unorderedlist ##',
				api: 'module.list.toggle',
				args: 'ul'
			},
			orderedlist: {
				title: '1. ## orderedlist ##',
				api: 'module.list.toggle',
				args: 'ol'
			},
			outdent: {
				title: '< ## outdent ##',
				api: 'module.list.outdent'
			},
			indent: {
				title: '> ## indent ##',
				api: 'module.list.indent'
			}
		}
	},
	ul: {
		title: '&bull; ## bulletslist ##',
		icon: true,
		api: 'module.list.toggle',
		observe: 'list',
		args: 'ul'
	},
	ol: {
		title: '1. ## numberslist ##',
		icon: true,
		api: 'module.list.toggle',
		observe: 'list',
		args: 'ol'
	},
	outdent: {
		title: '## outdent ##',
		icon: true,
		api: 'module.list.outdent',
		observe: 'list'
	},
	indent: {
		title: '## indent ##',
		icon: true,
		api: 'module.list.indent',
		observe: 'list'
	},
	image: {
		title: '## image ##',
		icon: true,
		api: 'module.image.open'
	},
	file: {
		title: '## file ##',
		icon: true,
		api: 'module.file.open'
	},
	link: {
		title: '## link ##',
		icon: true,
		observe: 'link',
		dropdown: {
    		observe: 'link',
			link: {
				title: '## link-insert ##',
				api: 'module.link.open'
			},
			unlink: {
				title: '## unlink ##',
				api: 'module.link.unlink'
			}
		}
	},
	line: {
		title: '## horizontalrule ##',
		icon: true,
		api: 'module.line.insert'
	}
};
var App = function(element, options, uuid)
{
    this.module = {};
    this.plugin = {};
    this.instances = {};

    // start/stop
    this.started = false;
    this.stopped = false;

    // environment
    this.uuid = uuid;
    this.rootElement = element;
    this.rootOpts = options;
    this.keycodes = $R.keycodes;
    this.namespace = 'redactor';
    this.$win = $R.dom(window);
    this.$doc = $R.dom(document);
    this.$body = $R.dom('body');

    // core services
    this.opts = $R.create('service.options', options, element);
    this.lang = $R.create('service.lang', this);

    // build
    this.buildServices();
    this.buildModules();
    this.buildPlugins();

    // start
    this.start();
};

App.prototype = {
    start: function()
    {
        // start
        this.stopped = false;
        this.broadcast('start');
        this.broadcast('startcode');

        if (this.opts.clickToEdit)
        {
            this.broadcast('startclicktoedit');
        }
        else
        {
            this.broadcast('enable');
            if (this.opts.showSource) this.broadcast('startcodeshow');
            this.broadcast('enablefocus');
        }

        // started
        this.broadcast('started');
        this.started = true;
    },
    stop: function()
    {
    	this.started = false;
		this.stopped = true;

		this.broadcast('stop');
		this.broadcast('disable');
		this.broadcast('stopped');
    },

    // started & stopped
    isStarted: function()
    {
        return this.started;
    },
    isStopped: function()
    {
        return this.stopped;
    },

    // build
    buildServices: function()
    {
        var core = ['opts', 'lang'];
        var bindable = ['uuid', 'keycodes', 'opts', 'lang', '$win', '$doc', '$body'];
        var services = [];
        for (var name in $R.services)
        {
            if (core.indexOf(name) === -1)
            {
                this[name] = $R.create('service.' + name, this);
                services.push(name);
                bindable.push(name);
            }
        }

        // binding
		for (var i = 0; i < services.length; i++)
		{
    		var service = services[i];
            for (var z = 0; z < bindable.length; z++)
    		{
        		var inj = bindable[z];
                if (service !== inj)
                {
        		    this[service][inj] = this[inj];
        		}
    		}
        }
    },
    buildModules: function()
    {
        for (var name in $R.modules)
        {
            this.module[name] = $R.create('module.' + name, this);
            this.instances[name] = this.module[name];
        }
    },
    buildPlugins: function()
    {
        var plugins = this.opts.plugins;
        for (var i = 0; i < plugins.length; i++)
        {
            var name = plugins[i];
            if (typeof $R.plugins[name] !== 'undefined')
            {
                this.plugin[name] = $R.create('plugin.' + name, this);
                this.instances[name] = this.plugin[name];
            }
        }
    },

    // readonly
    isReadOnly: function()
    {
        var $editor = this.editor.getElement();

        return $editor.hasClass('redactor-read-only');
    },
    enableReadOnly: function()
    {
        this.broadcast('enablereadonly');
        this.component.clearActive();
    	this.toolbar.disableButtons();
    },
    disableReadOnly: function()
    {
        this.broadcast('disablereadonly');
    	this.toolbar.enableButtons();
    },

    // messaging
    callMessageHandler: function(instance, name, args)
    {
        var arr = name.split('.');
        if (arr.length === 1)
        {
            if (typeof instance['on' + name] === 'function')
            {
                instance['on' + name].apply(instance, args);
            }
        }
        else
        {
            arr[0] = 'on' + arr[0];

            var func = this.utils.checkProperty(instance, arr);
            if (typeof func === 'function')
            {
                func.apply(instance, args);
            }
        }
    },
    broadcast: function(name)
    {
        var args = [].slice.call(arguments, 1);
        for (var moduleName in this.instances)
        {
            this.callMessageHandler(this.instances[moduleName], name, args);
        }

        // callback
        return this.callback.trigger(name, args);
    },

    // callback
    on: function(name, func)
    {
        this.callback.add(name, func);
    },
    off: function(name, func)
    {
        this.callback.remove(name, func);
    },

    // api
    api: function(name)
    {
        if (!this.isStarted() && name !== 'start') return;
        if (this.isReadOnly() && name !== 'disableReadOnly') return;

        this.broadcast('state');

        var args = [].slice.call(arguments, 1);
        var arr = name.split('.');

        var isApp = (arr.length === 1);
        var isCallback = (arr[0] === 'on' || arr[0] === 'off');
        var isService = (!isCallback && arr.length === 2);
        var isPlugin = (arr[0] === 'plugin');
        var isModule = (arr[0] === 'module');

        // app
        if (isApp)
        {
            if (typeof this[arr[0]] === 'function')
            {
                return this.callInstanceMethod(this, arr[0], args);
            }
        }
        // callback
        else if (isCallback)
        {
            return (arr[0] === 'on') ? this.on(arr[1], args[0]) : this.off(arr[1], args[0] || undefined);
        }
        // service
        else if (isService)
        {
            if (this.isInstanceExists(this, arr[0]))
            {
                return this.callInstanceMethod(this[arr[0]], arr[1], args);
            }
            else
            {
                $R.error(new Error('Service "' + arr[0] + '" not found'));
            }
        }
        // plugin
        else if (isPlugin)
        {
            if (this.isInstanceExists(this.plugin, arr[1]))
            {
                return this.callInstanceMethod(this.plugin[arr[1]], arr[2], args);
            }
            else
            {
                $R.error(new Error('Plugin "' + arr[1] + '" not found'));
            }
        }
        // module
        else if (isModule)
        {
            if (this.isInstanceExists(this.module, arr[1]))
            {
                return this.callInstanceMethod(this.module[arr[1]], arr[2], args);
            }
            else
            {
                $R.error(new Error('Module "' + arr[1] + '" not found'));
            }
        }

    },
	isInstanceExists: function(obj, name)
	{
        return (typeof obj[name] !== 'undefined');
	},
    callInstanceMethod: function(instance, method, args)
    {
	    if (typeof instance[method] === 'function')
        {
		    return instance[method].apply(instance, args);
        }
    }
};
$R.add('mixin', 'formatter', {

    // public
    buildArgs: function(args)
    {
        this.args = {
            'class': args['class'] || false,
            'style': args['style'] || false,
            'attr': args['attr'] || false
        };

        if (!this.args['class'] && !this.args['style'] && !this.args['attr'])
        {
            this.args = false;
        }
    },
    applyArgs: function(nodes, selection)
    {
        if (this.args)
        {
            nodes = this[this.type](this.args, false, nodes, selection);
        }
        else
        {
            nodes = this._clearAll(nodes, selection);
        }

        return nodes;
    },
    clearClass: function(tags, nodes)
    {
        this.selection.save();

        var $elements = (nodes) ? $R.dom(nodes) : this.getElements(tags, true);
        $elements.removeAttr('class');

        this.selection.restore();

        return $elements.getAll();
    },
    clearStyle: function(tags, nodes)
    {
        this.selection.save();

        var $elements = (nodes) ? $R.dom(nodes) : this.getElements(tags, true);
        $elements.removeAttr('style');

        this.selection.restore();

        return $elements.getAll();
    },
    clearAttr: function(tags, nodes)
    {
        this.selection.save();

        var $elements = (nodes) ? $R.dom(nodes) : this.getElements(tags, true);
        this._removeAllAttr($elements);

        this.selection.restore();

        return $elements.getAll();
    },
    set: function(args, tags, nodes, selection)
    {
        if (selection !== false) this.selection.save();

        var $elements = (nodes) ? $R.dom(nodes) : this.getElements(tags);

        if (args['class'])
        {
            $elements.removeAttr('class');
            $elements.addClass(args['class']);
        }

        if (args['style'])
        {
            $elements.removeAttr('style');
            $elements.css(args['style']);
            $elements.each(function(node)
            {
                var $node = $R.dom(node);
                $node.attr('data-redactor-style-cache', $node.attr('style'));
            });
        }

        if (args['attr'])
        {
            this._removeAllAttr($elements);
            $elements.attr(args['attr'])
        }

        return this._getNodes($elements, selection);
    },
    toggle: function(args, tags, nodes, selection)
    {
        if (selection !== false) this.selection.save();

        var $elements = (nodes) ? $R.dom(nodes) : this.getElements(tags);

        if (args['class'])
        {
            $elements.toggleClass(args['class']);
        }

        if (args['style'])
        {
            var params = args['style'];
            $elements.each(function(node)
            {
                var $node = $R.dom(node);
                for (var key in params)
                {
                    var newVal = params[key];
                    var oldVal = $node.css(key);

                    oldVal = (this.utils.isRgb(oldVal)) ? this.utils.rgb2hex(oldVal) : oldVal.replace(/"/g, '');
                    newVal = (this.utils.isRgb(newVal)) ? this.utils.rgb2hex(newVal) : newVal.replace(/"/g, '');

                    oldVal = this.utils.hex2long(oldVal);
                    newVal = this.utils.hex2long(newVal);

                    var compareNew = (typeof newVal === 'string') ? newVal.toLowerCase() : newVal;
                    var compareOld = (typeof oldVal === 'string') ? oldVal.toLowerCase() : oldVal;

                    if (compareNew === compareOld) $node.css(key, '');
                    else $node.css(key, newVal);
                }

                this._convertStyleQuotes($node);

                if (this.utils.removeEmptyAttr(node, 'style'))
                {
                    $node.removeAttr('data-redactor-style-cache');
                }
                else
                {
                    $node.attr('data-redactor-style-cache', $node.attr('style'));
                }

            }.bind(this));
        }

        if (args['attr'])
        {
            var params = args['attr'];
            $elements.each(function(node)
            {
                var $node = $R.dom(node);
                for (var key in params)
                {
                    if ($node.attr(key)) $node.removeAttr(key);
                    else $node.attr(key, params[key]);
                }
            });

        }

        return this._getNodes($elements, selection);
    },
    add: function(args, tags, nodes, selection)
    {
        if (selection !== false) this.selection.save();

        var $elements = (nodes) ? $R.dom(nodes) : this.getElements(tags);

        if (args['class'])
        {
            $elements.addClass(args['class']);
        }

        if (args['style'])
        {
            var params = args['style'];
            $elements.each(function(node)
            {
                var $node = $R.dom(node);
                $node.css(params);
                $node.attr('data-redactor-style-cache', $node.attr('style'));

                this._convertStyleQuotes($node);

            }.bind(this));
        }

        if (args['attr'])
        {
            $elements.attr(args['attr']);
        }

        return this._getNodes($elements, selection);
    },
    remove: function(args, tags, nodes, selection)
    {
        if (selection !== false) this.selection.save();

        var $elements = (nodes) ? $R.dom(nodes) : this.getElements(tags);

        if (args['class'])
        {
            $elements.removeClass(args['class']);
        }

        if (args['style'])
        {
            var name = args['style'];
            $elements.each(function(node)
            {
                var $node = $R.dom(node);
                $node.css(name, '');

                if (this.utils.removeEmptyAttr(node, 'style'))
                {
                    $node.removeAttr('data-redactor-style-cache');
                }
                else
                {
                    $node.attr('data-redactor-style-cache', $node.attr('style'));
                }

            }.bind(this));
        }

        if (args['attr'])
        {
            $elements.removeAttr(args['attr']);
        }

        return this._getNodes($elements, selection);
    },


    // private
    _getNodes: function($elements, selection)
    {
        var nodes = $elements.getAll();

        // clear wrapper class
        var count = nodes.length - 1;
        var last;
        for (var i = 0; i < nodes.length; i++)
        {
            if (i === count)
            {
                var $block = $R.dom(nodes[i]);
                if (nodes[i].nodeType !== 3 && this.inspector.isBlockTag(nodes[i].tagName) && $block.hasClass('redactor-textnodes-wrapper'))
                {
                    last = nodes[i];
                }
            }

            nodes[i] = this._clearWrapperClass(nodes[i]);

        }

        if (last && selection !== false)
        {
            //var end = this.marker.find('end');
            //$R.dom(end).remove();
            //$R.dom(last).append(this.marker.build('end'));
        }

        if (selection !== false) this.selection.restore();

        return nodes;
    },
    _removeAllAttr: function($elements)
    {
        $elements.each(function(node)
        {
            for (var i = node.attributes.length; i-->0;)
            {
                var nodeAttr = node.attributes[i];
                var name = nodeAttr.name;
                if (name !== 'style' && name !== 'class')
                {
                    node.removeAttributeNode(nodeAttr);
                }
            }
        });
    },
    _convertStyleQuotes: function($node)
    {
        var style = $node.attr('style');
        if (style) $node.attr('style', style.replace(/"/g, '\''));
    },
    _clearAll: function(nodes, selection)
    {
        if (selection !== false) this.selection.save();

        for (var i = 0; i < nodes.length; i++)
        {
            var node = nodes[i];
            while(node.attributes.length > 0)
            {
                node.removeAttribute(node.attributes[0].name);
            }
        }

        if (selection !== false) this.selection.restore();

        return nodes;
    },
    _clearWrapperClass: function(block)
    {
        block.classList.remove('redactor-textnodes-wrapper');
        if (block.getAttribute('class') === '')
        {
            block.removeAttribute('class');
        }

        return block;
    }
});
$R.add('mixin', 'dom', $R.Dom.prototype);
$R.add('mixin', 'component', {
    get cmnt()
    {
        return true;
    }
});
$R.add('service', 'options', {
    init: function(options, element)
    {
        var $el = $R.dom(element);
    	var opts = $R.extend(
    		{},
    		$R.opts,
    		(element) ? $el.data() : {},
    		$R.options,
    		options
    	);

        return opts;
    }
});
$R.add('service', 'lang', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;

        // build
        this.vars = this._build(this.opts.lang);
    },

    // public
    rebuild: function(lang)
    {
        this.opts.lang = lang;
        this.vars = this._build(lang);
    },
    extend: function(obj)
    {
        this.vars = $R.extend(this.vars, obj);
    },
    parse: function(str)
    {
        if (str === undefined)
        {
            return '';
        }

        var matches = str.match(/## (.*?) ##/g);
        if (matches)
        {
            for (var i = 0; i < matches.length; i++)
            {
                var key = matches[i].replace(/^##\s/g, '').replace(/\s##$/g, '');
                str = str.replace(matches[i], this.get(key));
            }
        }

        return str;
    },
	get: function(name)
	{
		return (typeof this.vars[name] !== 'undefined') ? this.vars[name] : '';
	},

    // private
	_build: function(lang)
	{
        var vars = $R.lang['en'];
        if (lang !== 'en')
        {
            vars = ($R.lang[lang] !== undefined) ? $R.lang[lang] : vars;
        }

        return vars;
	}
});
$R.add('service', 'callback', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;

        // local
        this.callbacks = {};

        // build
        if (this.opts.callbacks)
        {
            this._set(this.opts.callbacks, '');
        }
    },
    stop: function()
    {
        this.callbacks = {};
    },
    add: function(name, handler)
    {
        if (!this.callbacks[name]) this.callbacks[name] = [];
        this.callbacks[name].push(handler);
    },
    remove: function(name, handler)
    {
        if (handler === undefined)
        {
            delete this.callbacks[name];
        }
        else
        {
            for (var i = 0; i < this.callbacks[name].length; i++)
            {
                this.callbacks[name].splice(i, 1);
            }

            if (Object.keys(this.callbacks[name]).length === 0) delete this.callbacks[name];
        }
    },
    trigger: function(name, args)
    {
        var value = this._loop(name, args, this.callbacks);
        return (typeof value === 'undefined') ? args[0] : value;
    },

    // private
    _set: function(obj, name)
    {
        for (var key in obj)
        {
            var path = (name === '') ? key : name + '.' + key;
            if (typeof obj[key] === 'object')
            {
                this._set(obj[key], path);
            }
            else
            {
                this.callbacks[path] = [];
                this.callbacks[path].push(obj[key]);
            }
        }
    },
    _loop: function(name, args, obj)
    {
        var value;
        for (var key in obj)
        {
            if (name === key)
            {
                for (var i = 0; i < obj[key].length; i++)
                {
                    value = obj[key][i].apply(this.app, args);
                }
            }
        }

        return value;
    }
});
$R.add('service', 'animate', {
    init: function(app)
    {
        this.animationOpt = app.opts.animation;
    },
    start: function(element, animation, options, callback)
    {
		var defaults = {
			duration: false,
			iterate: false,
			delay: false,
			timing: false,
			prefix: 'redactor-'
		};

		var defaults = (typeof options === 'function') ? defaults : $R.extend(defaults, options);
		var callback = (typeof options === 'function') ? options : callback;

        // play
		return new $R.AnimatePlay(element, animation, defaults, callback, this.animationOpt);
    },
    stop: function(element, effect)
    {
        this.$el = $R.dom(element);
        this.$el.removeClass('redactor-animated');

        var effect = this.$el.attr('redactor-animate-effect');
        this.$el.removeClass(effect);

        this.$el.removeAttr('redactor-animate-effect');
		var hide = this.$el.attr('redactor-animate-hide');
		if (hide)
		{
		    this.$el.addClass(hide).removeAttr('redactor-animate-hide');
		}

        this.$el.off('animationend webkitAnimationEnd');
    }
});

$R.AnimatePlay = function(element, animation, defaults, callback, animationOpt)
{
    this.hidableEffects = ['fadeOut', 'flipOut', 'slideUp', 'zoomOut', 'slideOutUp', 'slideOutRight', 'slideOutLeft'];
    this.prefixes = ['', '-webkit-'];

    this.$el = $R.dom(element);
    this.$body = $R.dom('body');
    this.callback = callback;
    this.animation = (!animationOpt) ? this.buildAnimationOff(animation) : animation;
    this.defaults = defaults;

    if (this.animation === 'slideUp')
    {
        this.$el.height(this.$el.height());
    }

    // animate
    return (this.isInanimate()) ? this.inanimate() : this.animate();
};

$R.AnimatePlay.prototype = {
	buildAnimationOff: function(animation)
	{
        return (this.isHidable(animation)) ? 'hide' : 'show';
	},
	buildHideClass: function()
	{
        return 'redactor-animate-hide';
	},
	isInanimate: function()
	{
    	return (this.animation === 'show' || this.animation === 'hide');
	},
    isAnimated: function()
    {
        return this.$el.hasClass('redactor-animated');
    },
	isHidable: function(effect)
	{
    	return (this.hidableEffects.indexOf(effect) !== -1);
	},
    inanimate: function()
    {
		this.defaults.timing = 'linear';

        var hide;
		if (this.animation === 'show')
		{
            hide = this.buildHideClass();
            this.$el.attr('redactor-animate-hide', hide);
            this.$el.removeClass(hide);
        }
		else
		{
            hide = this.$el.attr('redactor-animate-hide');
    		this.$el.addClass(hide).removeAttr('redactor-animate-hide');
        }

		if (typeof this.callback === 'function') this.callback(this);

        return this;
    },
	animate: function()
	{
    	var delay = (this.defaults.delay) ? this.defaults.delay : 0;
        setTimeout(function()
        {
            this.$body.addClass('no-scroll-x');
            this.$el.addClass('redactor-animated');
            if (!this.$el.attr('redactor-animate-hide'))
            {
                var hide = this.buildHideClass();
                this.$el.attr('redactor-animate-hide', hide);
                this.$el.removeClass(hide);
            }

		    this.$el.addClass(this.defaults.prefix + this.animation);
		    this.$el.attr('redactor-animate-effect', this.defaults.prefix + this.animation);

	    	this.set(this.defaults.duration + 's', this.defaults.iterate, this.defaults.timing);
    		this.complete();

        }.bind(this), delay * 1000);

        return this;
	},
	set: function(duration, iterate, timing)
	{
		var len = this.prefixes.length;

		while (len--)
		{
			if (duration !== false || duration === '') this.$el.css(this.prefixes[len] + 'animation-duration', duration);
			if (iterate !== false || iterate === '') this.$el.css(this.prefixes[len] + 'animation-iteration-count', iterate);
			if (timing !== false || timing === '') this.$el.css(this.prefixes[len] + 'animation-timing-function', timing);
		}
	},
	clean: function()
	{
    	this.$body.removeClass('no-scroll-x');
		this.$el.removeClass('redactor-animated');
		this.$el.removeClass(this.defaults.prefix + this.animation);
		this.$el.removeAttr('redactor-animate-effect');

		this.set('', '', '');
	},
	complete: function()
	{
		this.$el.one('animationend webkitAnimationEnd', function(e)
		{
    		if (this.$el.hasClass(this.defaults.prefix + this.animation)) this.clean();
			if (this.isHidable(this.animation))
			{
    			var hide = this.$el.attr('redactor-animate-hide');
    			this.$el.addClass(hide).removeAttr('redactor-animate-hide');
            }

			if (this.animation === 'slideUp') this.$el.height('');
			if (typeof this.callback === 'function') this.callback(this.$el);

		}.bind(this));
	}
};
$R.add('service', 'caret', {
    init: function(app)
    {
        this.app = app;
    },
    // set
    set: function(el)
    {
        this.editor.focus();
        this.component.clearActive();

        var node = $R.dom(el).get();
		var range = this.selection.getRange();
        if (range && node)
        {
            if (this.utils.isEmpty(node))
            {
                this.setAtStart(node);
            }
            else
            {
                range.collapse(false);
                range.selectNodeContents(node);

                this.selection.setRange(range);
            }
        }
    },
    setStart: function(el)
    {
        this._setCaret('Start', el);
    },
    setAtStart: function(node)
    {
		var range = document.createRange();
		var data = this.inspector.parse(node);
        if (this._isInPage(node))
        {
            range.setStart(node, 0);
            range.collapse(true);

            if (this.utils.isEmpty(node) || data.isInline())
            {
                var textNode = this._createTextNode();
                range.insertNode(textNode);
                range.selectNodeContents(textNode);
                range.collapse(false);
            }

            this.selection.setRange(range);
        }
    },
    setEnd: function(el)
    {
        this._setCaret('End', el);
    },
    setAtEnd: function(node)
    {
        var data = this.inspector.parse(node);
        var tag = data.getTag();
        var range = document.createRange();
        if (this._isInPage(node))
        {
            if (tag === 'a')
            {
                var textNode = document.createTextNode('\u200B');

                node.appendChild(textNode);

                range.setStartBefore(textNode);
                range.collapse(true);
            }
            else
            {
                range.selectNodeContents(node);
                range.collapse(false);
            }

            this.selection.setRange(range);
        }
    },
    setBefore: function(el)
    {
        this._setCaret('Before', el);
    },
    setAtBefore: function(node)
    {
        var data = this.inspector.parse(node);
        var range = document.createRange();
        if (this._isInPage(node))
        {
            range.setStartBefore(node);
            range.collapse(true);

            if (this.utils.isEmpty(node) && data.isInline())
            {
                var textNode = this._createTextNode();
                node.appendChild(textNode);
            }

            this.selection.setRange(range);
        }
    },
    setAfter: function(el)
    {
        this._setCaret('After', el);
    },
    setAtAfter: function(node)
    {
        var range = document.createRange();
        if (this._isInPage(node))
        {
            range.setStartAfter(node);
            range.collapse(true);

            var textNode = this._createTextNode();
            range.insertNode(textNode);
            range.selectNodeContents(textNode);
            range.collapse(false);
            this.selection.setRange(range);
        }
    },
    setAtPrev: function(node)
    {
        var prev = node.previousSibling;
        if (prev)
        {
            prev = (prev.nodeType === 3 && this._isEmptyTextNode(prev)) ? prev.previousElementSibling : prev;
            if (prev) this.setEnd(prev);
        }
    },
    setAtNext: function(node)
    {
        var next = node.nextSibling;
        if (next)
        {
            next = (next.nodeType === 3 && this._isEmptyTextNode(next)) ? next.nextElementSibling : next;
            if (next) this.setStart(next);
        }
    },

    // is
    isStart: function(el)
    {
        return this._isStartOrEnd('First', el);
    },
    isEnd: function(el)
    {
        return this._isStartOrEnd('Last', el);
    },

    // private
    _setCaret: function(type, el)
    {
        var data = this.inspector.parse(el);
        var node = data.getNode();

        if (node)
        {
            this.component.clearActive();
            this['_set' + type](node, data, data.getTag());
        }
    },
    _setStart: function(node, data, tag)
    {
        // 1. text
        if (data.isText())
        {
            this.editor.focus();
            return this.setAtStart(node);
        }
        // 2. ul, ol
        else if (tag === 'ul' || tag === 'ol')
        {
            node = data.findFirstNode('li');

            var item = this.utils.getFirstElement(node);
            var dataItem = this.inspector.parse(item);
            if (item && dataItem.isComponent())
            {
                return this.setStart(dataItem.getComponent());
            }
        }
        // 3. dl
        else if (tag === 'dl')
        {
            node = data.findFirstNode('dt');
        }
        // 4. br / hr
        else if (tag === 'br' || tag === 'hr')
        {
            return this.setBefore(node);
        }
        // 5. th, td
        else if (tag === 'td' || tag === 'th')
        {
            var el = data.getFirstElement(node);
            if (el)
            {
                return this.setStart(el);
            }
        }
        // 6. table
        else if (tag === 'table')
        {
            return this.setStart(data.findFirstNode('th, td'));
        }
        // 7. figure code
        else if (data.isComponentType('code') && !data.isFigcaption())
        {
            var code = data.findLastNode('pre, code');

            this.editor.focus();
            return this.setAtStart(code);
        }
        // 8. table component
        else if (tag === 'figure' && data.isComponentType('table'))
        {
            var table = data.getTable();
            var tableData = this.inspector.parse(table);

            return this.setStart(tableData.findFirstNode('th, td'));
        }
        // 9. non editable components
        else if (!data.isComponentType('table') && data.isComponent() && !data.isFigcaption())
        {
            return this.component.setActive(node);
        }

        this.editor.focus();

        // set
        if (!this._setStartInline(node))
        {
            this.setAtStart(node);
        }
    },
    _setEnd: function(node, data, tag)
    {
        // 1. text
        if (data.isText())
        {
            this.editor.focus();
            return this.setAtEnd(node);
        }
        // 2. ul, ol
        else if (tag === 'ul' || tag === 'ol')
        {
            node = data.findLastNode('li');

            var item = this.utils.getLastElement(node);
            var dataItem = this.inspector.parse(item);
            if (item && dataItem.isComponent())
            {
                return this.setEnd(dataItem.getComponent());
            }
        }
        // 3. dl
        else if (tag === 'dl')
        {
            node = data.findLastNode('dd');
        }
        // 4. br / hr
        else if (tag === 'br' || tag === 'hr')
        {
            return this.setAfter(node);
        }
        // 5. th, td
        else if (tag === 'td' || tag === 'th')
        {
            var el = data.getLastElement();
            if (el)
            {
                return this.setEnd(el);
            }
        }
        // 6. table
        else if (tag === 'table')
        {
            return this.setEnd(data.findLastNode('th, td'));
        }
        // 7. figure code
        else if (data.isComponentType('code') && !data.isFigcaption())
        {
            var code = data.findLastNode('pre, code');

            this.editor.focus();
            return this.setAtEnd(code);
        }
        // 8. table component
        else if (tag === 'figure' && data.isComponentType('table'))
        {
            var table = data.getTable();
            var tableData = this.inspector.parse(table);

            return this.setEnd(tableData.findLastNode('th, td'));
        }
        // 9. non editable components
        else if (!data.isComponentType('table') && data.isComponent() && !data.isFigcaption())
        {
            return this.component.setActive(node);
        }

        this.editor.focus();

        // set
        if (!this._setEndInline(node))
        {
            // is element empty
            if (this.utils.isEmpty(node))
            {
                return this.setStart(node);
            }

            this.setAtEnd(node);
        }
    },
    _setBefore: function(node, data, tag)
    {
        /*
        // text
        if (data.isText())
        {
            var block = this._getPrevBlock(node);

            return (block) ? this.setEnd(block) : this.setAtPrev(node);
        }
        */

        // inline
        if (data.isInline())
        {
            return this.setAtBefore(node);
        }
        // td / th
        else if (data.isFirstTableCell())
        {
            return this.setAtPrev(data.getComponent());
        }
        else if (tag === 'td' || tag === 'th')
        {
            return this.setAtPrev(node);
        }
        // li
        else if (data.isFirstListItem())
        {
            return this.setAtPrev(data.getList());
        }
        // figcaption
        else if (data.isFigcaption())
        {
            return this.setStart(data.getComponent());
        }
        // component
        else if (data.isComponent())
        {
            return this.setAtPrev(data.getComponent());
        }
        // block
        else if (data.isBlock())
        {
            return this.setAtPrev(node);
        }

        this.editor.focus();
        this.setAtBefore(node);

    },
    _setAfter: function(node, data, tag)
    {

        /*
        // text
        if (data.isText())
        {
            var block = this._getNextBlock(node);

            return (block) ? this.setStart(block) : this.setAtNext(node);
        }
        */

        // inline
        if (data.isInline())
        {
            return this.setAtAfter(node);
        }
        // td / th
        else if (data.isLastTableCell())
        {
            return this.setAtNext(data.getComponent());
        }
        else if (tag === 'td' || tag === 'th')
        {
            return this.setAtNext(node);
        }
        // li
        else if (data.isFirstListItem())
        {
            return this.setAtNext(data.getList());
        }
        // component
        else if (data.isComponent())
        {
            return this.setAtNext(data.getComponent());
        }
        // block
        else if (data.isBlock())
        {
            return this.setAtNext(node);
        }

        this.editor.focus();
        this.setAtAfter(node);
    },
    _setStartInline: function(node)
    {
        // is first element inline (FF only)
        var inline = this._hasInlineChild(node, 'first');
        if (inline)
        {
            this.setStart(inline);
            return true;
        }
    },
    _setEndInline: function(node)
    {
        // is last element inline (FF only)
        var inline = this._hasInlineChild(node, 'last');
        if (inline)
        {
            this.setEnd(inline);
            return true;
        }
    },
    _isStartOrEnd: function(type, el)
    {
        var $editor = this.editor.getElement();
        var isEditor = (typeof el === 'undefined');
        var node = (isEditor) ? $editor.get() : $R.dom(el).get();
        var data = (isEditor) ? false : this.inspector.parse(node);
        node = (isEditor) ? node : this._isStartOrEndNode(node, data, type);

        if (data && (data.isComponent() && !data.isComponentEditable()))
        {
            return true;
        }

        if (!data || !data.isComponentEditable())
        {
            this.editor.focus();
        }

        var offset = this.offset.get(node, true);
        var result = false;

        if (type === 'First')
        {
            result = (offset && offset.start === 0);
        }
        else
        {
            var length = this.offset.get(node, true, true);
            result = (offset && offset.end === length);
        }

        return result;
    },
    _isStartOrEndNode: function(node, data, type)
    {
        if (data.isTable())
        {
            node = data['find' + type + 'Node']('th, td');
        }
        else if (data.isList())
        {
            node = data['find' + type + 'Node']('li');
        }
        else if (data.isComponentType('code'))
        {
            node = data.findLastNode('pre, code');
        }

        return node;
    },
    _isInPage: function(node)
    {
        if (node && node.nodeType)
        {
            return (node === document.body) ? false : document.body.contains(node);
        }
        else
        {
            return false;
        }
    },
    _hasInlineChild: function(el, pos)
    {
        var data = this.inspector.parse(el);
        var node = (pos === 'first') ? data.getFirstNode() : data.getLastNode();
        if (node && node.nodeType !== 3 && this.inspector.isInlineTag(node.tagName))
        {
            return node;
        }
    },
    _getPrevBlock: function(node)
    {
        while (node = node.previousSibling)
        {
            // TODO: test block tags
            if (node.nodeType !== 3 && node.tagName !== 'BR') return node;
        }

        return false;
    },
    _getNextBlock: function(node)
    {
        while (node = node.nextSibling)
        {
            // TODO: test block tags
            if (node.nodeType !== 3 && node.tagName !== 'BR') return node;
        }

        return false;
    },
    _isEmptyTextNode: function(node)
    {
        return (node.textContent.trim().replace(/\n/, '').replace(/[\u200B-\u200D\uFEFF]/g, '') === '');
    },
    _createTextNode: function()
    {
        return document.createTextNode('\u200B');
    }
});
$R.add('service', 'selection', {
    init: function(app)
    {
        this.app = app;
    },
    // is
    is: function()
    {
        var sel = this.get();
        if (sel)
        {
            var node = sel.anchorNode;
            var data = this.inspector.parse(node);

            return (data.isInEditor() || data.isEditor());
        }

        return false;
    },
    isCollapsed: function()
    {
        var sel = this.get();
        var range = this.getRange();

        if (sel && sel.isCollapsed) return true;
        else if (range && range.toString().length === 0) return true

        return false;
    },
    isBackwards: function()
    {
        var backwards = false;
        var sel = this.get();

        if (sel && !sel.isCollapsed)
        {
            var range = document.createRange();
            range.setStart(sel.anchorNode, sel.anchorOffset);
            range.setEnd(sel.focusNode, sel.focusOffset);
            backwards = range.collapsed;
            range.detach();
        }

        return backwards;
    },
    isIn: function(el)
    {
        var node = $R.dom(el).get();
        var current = this.getCurrent();

        return (current && node) ? node.contains(current) : false;
    },
    isText: function()
    {
        var sel = this.get();
        if (sel)
        {
            var el = sel.anchorNode;
            var block = this.getBlock(el);
            var blocks = this.getBlocks();

            // 1) component
            if (this.component.isActive())
            {
                return false;
            }
            // 2) has blocks
            else if (blocks.length !== 0)
            {
                return false;
            }
            // 3) td, th or hasn't block
            else if ((block && this.inspector.isTableCellTag(block.tagName)) || block === false)
            {
                return true;
            }
        }

        return false;
    },
    isAll: function(el)
    {
        // collapsed
        if (this.isCollapsed()) return false;

        var $editor = this.editor.getElement();
        var isEditor = (typeof el === 'undefined');
        var el = el || $editor.get();
        var data = (isEditor) ? false : this.inspector.parse(el);

        // editor empty
        if (isEditor && this.editor.isEmpty()) return false;

        // component
        if (data && data.isComponent() && !data.isComponentEditable() && this.component.isActive(el))
        {
            return true;
        }

        // pre, table, or pre/code in figure
        if (!isEditor)
        {
            var isComponentCode = data.isComponentType('code');
            var isTable = data.isTable();

            if (isComponentCode || data.isPre() || isTable)
            {
                el = (isComponentCode) ? data.getComponentCodeElement() : el;

                var text = el.textContent.trim().replace(/\t/g, '').replace(/\u200B/g, '');
                var selected = this.getText().trim().replace(/\t/g, '');

                text = (isTable) ? text.replace(/\s+/g, '') : text;
                selected = (isTable) ? selected.replace(/\s+/g, '') : selected;

                return (text === selected);
            }
        }

        // all
        var range = this.getRange();
        if (range)
        {
            return this._containsInRange(range, el);
        }

        return false;
    },

    // has
    hasNonEditable: function()
    {
        var selected = this.getHtml();
        var $wrapper = $R.dom('<div>').html(selected);

        return (!this.isCollapsed() && $wrapper.find('.non-editable').length !== 0);
    },

    // set
    setRange: function(range)
    {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    },
    setAll: function(el)
    {
        var $editor = this.editor.getElement();
        var isEditor = (typeof el === 'undefined');
        var el = el || $editor.get();

        if (isEditor)
        {
            $editor.prepend(this.marker.build('start'));
            $editor.append(this.marker.build('end'));

            this.component.clearActive();
            this.restoreMarkers();
        }
        else
        {
            var data = this.inspector.parse(el);

            // pre/code in figure
            if (data.isComponentType('code'))
            {
                this.editor.saveScroll();

                el = data.getComponentCodeElement();
                el.focus();

                this.component.clearActive();
                this._selectNodeAll(el);

                this.editor.restoreScroll();
            }
            // component
            else if (!data.isFigcaption() && data.isComponent() && !data.isComponentEditable())
            {
                this.component.setActive(el);
            }
            else
            {
                this.editor.focus();

                // table
                el = (data.isComponentType('table')) ? data.getTable() : el;

                var first = this.editor.getFirstNode();
                if (first && first.nodeType !== 3 && first.tagName === 'FIGURE')
                {
                    this.component.setActive(first);
                }

                this.component.clearActive();
                this._selectNodeAll(el);
            }
        }
    },

    // get
    get: function()
    {
        var sel = window.getSelection();
        return (sel.rangeCount > 0) ? sel : null;
    },
    getRange: function()
    {
        var sel = this.get();
        return (sel) ? ((sel.getRangeAt(0)) ? sel.getRangeAt(0) : null) : null;
    },
    getTextBeforeCaret: function(num)
    {
        num = (typeof num === 'undefined') ? 1 : num;

        var el = this.editor.getElement().get();
        var range = this.getRange();
        var text = false;
        if (range)
        {
            range = range.cloneRange();
            range.collapse(true);
            range.setStart(el, 0);
            text = range.toString().slice(-num);
        }

        return text;
    },
    getPosition: function()
    {
        var sel = this.get();
        var range = this.getRange();
        var top = 0, left = 0, width = 0, height = 0;
        if (window.getSelection && range.getBoundingClientRect)
        {
            range = range.cloneRange();
            var rect = range.getBoundingClientRect();
            width = rect.right - rect.left;
            height = rect.bottom - rect.top;
            top = rect.top;
            left = rect.left;
        }

        return { top: top, left: left, width: width , height: height };
    },
    getCurrent: function()
    {
        var component = this.component.getActive();

        return (component) ? component : this._getCurrent();
    },
    getParent: function()
    {
        var current = this.getCurrent();
        if (current)
        {
            var parent = current.parentNode;
            var data = this.inspector.parse(parent);

            return (!data.isEditor()) ? parent : false;

        }

        return false;
    },
    getElement: function(el)
    {
        var node = el || this.getCurrent();
        while (node)
        {
            var data = this.inspector.parse(node);
            if (data.isElement() && data.isInEditor())
            {
                return node;
            }

            node = node.parentNode;
        }

        return false;
    },
    getInline: function(el)
    {
        var node = el || this.getCurrent();
        var inline = false;
        while (node)
        {
            if (this._isInlineNode(node))
            {
                inline = node;
            }

            node = node.parentNode;
        }

        return inline;
    },
    getInlineFirst: function(el)
    {
        var node = el || this.getCurrent();
        while (node)
        {
            if (this._isInlineNode(node))
            {
                return node;
            }

            node = node.parentNode;
        }

        return false;
    },
    getInlineAll: function(el)
    {
        var node = el || this.getCurrent();
        var inlines = [];
        while (node)
        {
            if (this._isInlineNode(node))
            {
                inlines.push(node);
            }

            node = node.parentNode;
        }

        return inlines;
    },
    getBlock: function(el)
    {
        var node = el || this.getCurrent();
        while (node)
        {
            var data = this.inspector.parse(node);
            var isBlock = this.inspector.isBlockTag(node.tagName);

            if (isBlock && data.isInEditor(node))
            {
                return node;
            }

            node = node.parentNode;
        }

        return false;
    },
    getBlocks: function(options)
    {
        var node;
        var nodes = this.getNodes();
        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            node = this.getBlock(nodes[i]);
            if (node && !this._isInNodesArray(filteredNodes, node))
            {
                if (this._filterBlock(node, options))
                {
                    filteredNodes.push(node);
                }
            }
        }

        filteredNodes = (options && options.tags) ? this._filterNodesByTags(filteredNodes, options.tags) : filteredNodes;

        return filteredNodes;
    },
    getInlines: function(options)
    {
        var nodes = this.getNodes();
        var inlines = [];
        for (var i = 0; i < nodes.length; i++)
        {
            if (options && options.all)
            {
                var node = nodes[i];
                while (node)
                {
                    if (this._isInlineNode(node))
                    {
                        inlines.push(node);
                    }

                    node = node.parentNode;
                }
            }
            else
            {
                var node = this.getInline(nodes[i]);
                if (node)
                {
                    inlines.push(node);
                }
            }
        }

        var filteredNodes = [];
        for (var i = 0; i < inlines.length; i++)
        {
            var node = inlines[i];
            if (node && !this._isInNodesArray(filteredNodes, node))
            {
                if (this._filterInline(node, options))
                {
                    filteredNodes.push(node);
                }
            }
        }

        filteredNodes = (options && options.tags) ? this._filterNodesByTags(filteredNodes, options.tags) : filteredNodes;

        return filteredNodes;
    },
    getInlinesAllSelected: function(options)
    {
        if (this.isAll()) return [];

        var inlines = this.getInlines({ all: true });
        var textNodes = this.getTextNodes({ inline: false });
        var selected = this.getText().replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        var finalNodes = [];

        if (textNodes.length !== 0)
        {
            return finalNodes;
        }

        if (selected === '')
        {
            finalNodes = inlines;
        }
        else if (inlines.length > 1)
        {
            var isIn = false;
            for (var i = 0; i < inlines.length; i++)
            {
                if (this._isTextSelected(inlines[i], selected))
                {
                    finalNodes.push(inlines[i]);
                }
            }
        }
        else if (inlines.length === 1)
        {
            if (this._isTextSelected(inlines[0], selected))
            {
                finalNodes = inlines;
            }
        }

        finalNodes = (options && options.tags) ? this._filterNodesByTags(finalNodes, options.tags) : finalNodes;

        return finalNodes;
    },
    getElements: function(options)
    {
        var nodes = this.getNodes({ textnodes: false });
        var block = this.getBlock();
        nodes = (nodes.length === 0 && block) ? [block] : nodes;

        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            if (!this._isInNodesArray(filteredNodes, nodes[i]))
            {
                var push = true;

                // tags
                if (options && options.tags && options.tags.indexOf(nodes[i].tagName.toLowerCase()) === -1)
                {
                    push = false;
                }

                if (push)
                {
                    filteredNodes.push(nodes[i]);
                }
            }

        }

        return filteredNodes;
    },
    getTextNodes: function(options, passblocks)
    {
        var nodes = this.getNodes();
        var range = this.getRange();

        // only text selected
        var blocks = this.getBlocks(options);
        var html = this.getHtml(false);

        if (this.isText() && html !== '' && options && options.wrap)
        {
            try {
                var $tmp = $R.dom('<div>');
                $tmp.addClass('redactor-textnodes-wrapper');
                $tmp.html(html);
                range.surroundContents($tmp.get());

                return [$tmp.get()];
            }
            catch(e) {}
        }

        // text and blocks selected
        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            var block = this.getBlock(nodes[i]);
            var isBlock = (passblocks && block && (block.tagName !== 'TD' && block.tagName !== 'TH'))
            if (isBlock)
            {
                if (this._filterBlock(block, options))
                {
                    if (!this._isInNodesArray(filteredNodes, block))
                    {
                        if (options && options.tags)
                        {
                            if (options.tags.indexOf(block.tagName.toLowerCase()) !== -1)
                            {
                                filteredNodes.push(block);
                            }
                        }
                        else
                        {
                            filteredNodes.push(block);
                        }
                    }
                }
                else
                {
                    var skip = true;
                }
            }
            else if (nodes[i].nodeType === 3 || (options && options.wrap && this.inspector.isInlineTag(nodes[i].tagName)))
            {
                var push = true;

                // first && cells
                if (options && options.first)
                {
                    var isCellParent = (block && block.tagName === 'TD' || block.tagName === 'TH');
                    var isFirstInCells = (options.cells) ? isCellParent : false;
                    if (block && !isFirstInCells)
                    {
                        push = false;
                    }
                }

                // parent is not inline
                if (options && options.inline === false)
                {
                    if (this.getInline(nodes[i]))
                    {
                        push = false;
                    }
                }

                if (push)
                {
                    // wrap
                    if (options && options.wrap)
                    {
                        var textnodes = this._getTextNodesWalker(nodes[i], range);
                        var wrapper = this._wrapTextNodes(textnodes);

                        filteredNodes.push(wrapper);
                    }
                    else
                    {
                        filteredNodes.push(nodes[i]);
                    }
                }
            }

        }

        return filteredNodes;
    },
    getBlocksAndTextNodes: function(options)
    {
        return this.getTextNodes(options, true);
    },
    getNodes: function(options)
    {
        var nodes = [];
        var activeComponent = this.component.getActive();
        if (activeComponent)
        {
            nodes = this._getNodesComponent(activeComponent);
        }
        else if (this.isCollapsed())
        {
            var current = this.getCurrent();
            nodes = (this.utils.isEmpty(current)) ? [this.getParent()] : [this.getCurrent()];
        }
        else if (this.is() && !activeComponent)
        {
            nodes = this._getNodesWalker();
        }

        // filter
        nodes = this._filterServicesNodes(nodes);
        nodes = this._filterEditor(nodes);

        nodes = (options && options.tags) ? this._filterNodesByTags(nodes, options.tags) : nodes;
        nodes = (options && options.textnodes) ? this._filterNodesTexts(nodes) : nodes;
        nodes = (options && !options.textnodes) ? this._filterNodesElements(nodes) : nodes;

        return nodes;
    },

    // text & html
    getText: function()
    {
        var sel = this.get();
        return (sel) ? sel.toString().replace(/\u200B/g, '') : '';
    },
    getHtml: function(clean)
    {
        var html = '';
        var sel = this.get();
        if (sel)
        {
            var container = document.createElement('div');
            var len = sel.rangeCount;
            for (var i = 0; i < len; ++i)
            {
                container.appendChild(sel.getRangeAt(i).cloneContents());
            }

            html = container.innerHTML;
            html = (clean !== false) ? this.cleaner.output(html) : html;
        }

        return html;
    },

    // clear
    clear: function()
    {
        this.component.clearActive();
        this.get().removeAllRanges();
    },

    // collapse
	collapseToStart: function()
	{
		var sel = this.get();
		if (sel && !sel.isCollapsed) sel.collapseToStart();
	},
	collapseToEnd: function()
	{
		var sel = this.get();
		if (sel && !sel.isCollapsed) sel.collapseToEnd();
	},

	// save
	save: function()
	{
    	this._clearSaved();

        var activeComponent = this.component.getActive();
        var current = this.getCurrent();
        var data = this.inspector.parse(current);
        var table = data.getTable();

        // table
        if (current && table && this.isAll(table))
        {
            this.savedTable = table;
            return;
        }

        // component
        if (activeComponent)
        {
            this.savedComponent = activeComponent;
            return;
        }

    	var $editor = this.editor.getElement();
        var el = $editor.get();
        var range = this.getRange();

        this.saved = {
            start: this._getNodeOffset(el, range.startContainer) + this._getTotalOffsets(range.startContainer, range.startOffset),
            end: this._getNodeOffset(el, range.endContainer) + this._getTotalOffsets(range.endContainer, range.endOffset)
        };

    },
    restore: function ()
    {
        if (!this.saved && !this.savedTable && !this.savedComponent) return;

        this.editor.saveScroll();

        if (this.savedTable)
        {
            this.setAll(this.savedTable);
            this._clearSaved();
            return;
        }

        if (this.savedComponent)
        {
            this.component.setActive(this.savedComponent);
            this._clearSaved();
            this.editor.restoreScroll();
            return;
        }

        this.editor.focus();

        var $editor = this.editor.getElement();
        var el = $editor.get();
        var range = this.getRange();
        var startNodeOffset = this._getNodeAndOffsetAt(el, this.saved.start);
        var endNodeOffset = this._getNodeAndOffsetAt(el, this.saved.end);

        range.setStart(startNodeOffset.node, startNodeOffset.offset);
        range.setEnd(endNodeOffset.node, endNodeOffset.offset);

        this.setRange(range);
        this.editor.restoreScroll();
        this._clearSaved();
    },
    saveMarkers: function()
    {
        this.marker.remove();
        this.marker.insert();
    },
    restoreMarkers: function()
    {
        this.editor.saveScroll();
        this.editor.focus();

        var start = this.marker.find('start');
        var end = this.marker.find('end');
        var range = this.getRange();

        if (start && end)
        {
            this._setMarkerBoth(range, start, end);
        }
        else if (start)
        {
            this._setMarkerStart(range, start);
        }

        this.editor.restoreScroll();

        // var block = this.getBlock();
        // if (block) this.utils.normalizeTextNodes(block);
    },

    // private
    _getCurrent: function()
    {
        var sel = this.get();
        if (sel && this.is())
        {
            var node = sel.anchorNode;
            var dataElement = this.inspector.parse(node);

            return (dataElement.isEditor()) ? node.firstChild : node;
        }

        return false;
    },
    _getNodesComponent: function(component)
    {
        var current = this.getCurrent();
        var data = this.inspector.parse(current);

        return (data.isFigcaption()) ? [data.getFigcaption()] : [component];
    },
    _getNodesWalker: function()
    {
        var nodes = [];
        var range = this.getRange();
        var startNode = range.startContainer;
        var endNode = range.endContainer;
        var $editor = this.editor.getElement();

        // editor
        if (startNode === $editor.get())
        {
            nodes = (this.isAll()) ? this.utils.getChildNodes($editor) : [];
        }
        // single node
        else if (startNode == endNode)
        {
            nodes = [startNode];
        }
        else
        {
            while (startNode && startNode != endNode)
            {
                nodes.push(startNode = this._getNextNode(startNode));
            }

            // partially selected nodes
            startNode = range.startContainer;
            while (startNode && startNode != range.commonAncestorContainer)
            {
                nodes.unshift(startNode);
                startNode = startNode.parentNode;
            }

            if (nodes.length !== 0)
            {
                var parent = nodes[0].parentNode;
                if (parent) nodes.unshift(parent);
            }
        }

        return nodes;
    },
    _getNextNode: function(node)
    {
        if (node.hasChildNodes()) return node.firstChild;
        else
        {
            while (node && !node.nextSibling) node = node.parentNode;
            return (!node) ? null : node.nextSibling;
        }
    },
    _getTextNodesWalker: function(node, range)
    {
        var finalNodes = [];
        var prev = node.previousSibling;
        var next = node.nextSibling;
        var start = range.startContainer;
        var end = range.endContainer;

        finalNodes = this._getTextNodesSiblings('prev', prev, start, finalNodes);
        finalNodes.push(node);
        finalNodes = this._getTextNodesSiblings('next', next, end, finalNodes);

        return finalNodes;
    },
    _getTextNodesSiblings: function(type, node, stopper, finalNodes)
    {
        while (node)
        {
            if (node === undefined
                || node.tagName === 'BR'
                || this.inspector.isBlockTag(node.tagName)
            )
            {
                return finalNodes;
            }
            else
            {
                if (type === 'prev')
                {
                    finalNodes.unshift(node);
                    if (stopper === node)
                    {
                        return finalNodes;
                    }
                }
                else
                {
                    finalNodes.push(node);
                    if (stopper === node)
                    {
                        return finalNodes;
                    }
                }

            }

            node = (type === 'prev') ? node.previousSibling : node.nextSibling;
        }

        return finalNodes;
    },
    _wrapTextNodes: function(textnodes)
    {
        var $last = $R.dom(textnodes[textnodes.length-1]);
        var $tmp = $R.dom('<div>');
        $last.after($tmp);
        $tmp.addClass('redactor-textnodes-wrapper');
        $tmp.append(textnodes);

        var $next = $tmp.next();
        var next = $next.get();
        if (next && next.tagName === 'BR')
        {
            $next.remove();
        }
        else if ($next.hasClass('redactor-selection-marker'))
        {
            $tmp.append($next);
        }

        return $tmp.get();
    },
    _isTextSelected: function(node, selected)
    {
        var text = node.textContent.replace(/\u200B/g, '');

        return (
            selected === text
            || text.search(selected) !== -1
            || selected.search(new RegExp('^' + text)) !== -1
            || selected.search(new RegExp(text + '$')) !== -1
        );
    },
    _isInNodesArray: function(nodes, node)
    {
        return (nodes.indexOf(node) !== -1);
    },
    _filterEditor: function(nodes)
    {
        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            var data = this.inspector.parse(nodes[i]);
            if (data.isInEditor())
            {
                filteredNodes.push(nodes[i]);
            }
        }

        return filteredNodes;
    },
    _filterServicesNodes: function(nodes)
    {
        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            var $el = $R.dom(nodes[i]);

            if (
                !(nodes[i] && nodes[i].nodeType === 3 && this.utils.isEmpty(nodes[i]))
                && !$el.hasClass('redactor-script-tag')
                && !$el.hasClass('redactor-component-caret')
                && !$el.hasClass('redactor-selection-marker')
            )
            {
                filteredNodes.push(nodes[i]);
            }
        }

        return filteredNodes;
    },
    _filterInline: function(node, options)
    {
        var $el = $R.dom(node);
        var push = true;

        if ($el.hasClass('redactor-selection-marker'))
        {
            push = false
        }

        if (options && options.inside)
        {
            //if (!this.isIn(node))
            if (!window.getSelection().containsNode(node, true))
            {
                push = false;
            }
        }

        return push;
    },
    _filterBlock: function(node, options)
    {
        var $el = $R.dom(node);
        var push = true;

        // first && cells
        if (options && options.first)
        {
            var parent = $el.parent().get();
            var isFirst = ($el.parent().hasClass('redactor-in'));
            var isCellParent = (parent && (parent.tagName === 'TD' || parent.tagName === 'TH'));
            var isFirstInCells = (options.cells) ? isCellParent : false;

            if (!isFirst && !isFirstInCells)
            {
                push = false;
            }
        }

        return push;
    },
    _filterNodesTexts: function(nodes)
    {
        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            if (nodes[i].nodeType === 3)
            {
                filteredNodes.push(nodes[i]);
            }
        }

        return filteredNodes;
    },
    _filterNodesElements: function(nodes)
    {
        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            if (nodes[i].nodeType !== 3)
            {
                filteredNodes.push(nodes[i]);
            }
        }

        return filteredNodes;
    },
    _filterNodesByTags: function(nodes, tags)
    {
        var filteredNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            if (nodes[i].nodeType !== 3)
            {
                var nodeTag = nodes[i].tagName.toLowerCase();
                if (tags.indexOf(nodeTag.toLowerCase()) !== -1)
                {
                    filteredNodes.push(nodes[i]);
                }
            }
        }

        return filteredNodes;
    },
    _isInlineNode: function(node)
    {
        var data = this.inspector.parse(node);

        return (this.inspector.isInlineTag(node.tagName) && data.isInEditor());
    },
    _containsInRange: function(range, node)
    {
        var treeWalker = document.createTreeWalker(node,  NodeFilter.SHOW_TEXT, { acceptNode: function(node) { return NodeFilter.FILTER_ACCEPT; } }, false);
        var firstTextNode, lastTextNode, textNode;
        while ((textNode = treeWalker.nextNode()))
        {
            if (!firstTextNode)
            {
                firstTextNode = textNode;
            }

            lastTextNode = textNode;
        }

        var nodeRange = range.cloneRange();
        if (firstTextNode)
        {
            nodeRange.setStart(firstTextNode, 0);
            nodeRange.setEnd(lastTextNode, lastTextNode.length);
        }
        else
        {
            nodeRange.selectNodeContents(node);
        }

        return range.compareBoundaryPoints(Range.START_TO_START, nodeRange) < 1 && range.compareBoundaryPoints(Range.END_TO_END, nodeRange) > -1;
    },
    _selectNodeAll: function(node)
    {
        var range = this.getRange();
        if (range)
        {
            range.selectNodeContents(node);
            this.setRange(range);
        }

    },
    _setMarkerBoth: function(range, start, end)
    {
        range = this._createMarkersRange(range);

        range.setStartBefore(start);
        range.setEndBefore(end);

        start.parentNode.removeChild(start);
        end.parentNode.removeChild(end);

        this.setRange(range);
    },
    _setMarkerStart: function(range, start)
    {
        range = this._createMarkersRange(range);

        var next = start.nextSibling;
        if (next && next.nodeType !== 3 && next.tagName === 'BR')
        {
            range.setStartBefore(next);
        }
        else if (next)
        {
            range.setStart(next, 0);
            range.setEnd(next, 0);
        }
        else
        {
            range.setEndBefore(start);
        }

        start.parentNode.removeChild(start);

        this.setRange(range);
    },
    _createMarkersRange: function(range)
    {
        if (!range)
        {
            var $editor = this.editor.getElement();
            var el = $editor.get();
            var doc = el.ownerDocument, win = doc.defaultView;
            range = doc.createRange();
        }

        return range;
    },
    _clearSaved: function()
    {
        this.saved = false;
        this.savedTable = false;
        this.savedComponent = false;
    },
    _getNodeOffset: function(start, dest)
    {
        var offset = 0;
        var node = start;
        var stack = [];

        while (true)
        {
            if (node === dest) return offset;

            // Go into children
            if (node.firstChild)
            {
                // Going into first one doesn't count
                if (node !== start) offset += 1;
                stack.push(node);
                node = node.firstChild;
            }
            // If can go to next sibling
            else if (stack.length > 0 && node.nextSibling)
            {
                // If text, count length (plus 1)
                if (node.nodeType === 3)
                offset += node.nodeValue.length + 1;
                else
                offset += 1;

                node = node.nextSibling;
            }
            else
            {
                // If text, count length
                if (node.nodeType === 3) offset += node.nodeValue.length + 1;
                else offset += 1;

                // No children or siblings, move up stack
                while (true)
                {
                    if (stack.length <= 1) return offset;

                    var next = stack.pop();

                    // Go to sibling
                    if (next.nextSibling)
                    {
                        node = next.nextSibling;
                        break;
                    }
                }
            }
        }
    },
    _getTotalOffsets: function(parentNode, offset)
    {
        if (parentNode.nodeType == 3) return offset;
        if (parentNode.nodeType == 1)
        {
            var total = 0;
            // Get child nodes
            for (var i = 0; i < offset; i++)
            {
                total += this._calculateNodeOffset(parentNode.childNodes[i]);
            }

            return total;
        }

        return 0;
    },
    _calculateNodeOffset: function(node)
    {
        var offset = 0;

        if (node.nodeType === 3) offset += node.nodeValue.length + 1;
        else offset += 1;

        if (node.childNodes)
        {
            for (var i = 0; i < node.childNodes.length; i++)
            {
                offset += this._calculateNodeOffset(node.childNodes[i]);
            }
        }

        return offset;
    },
    _getNodeAndOffsetAt: function(start, offset)
    {
        var node = start;
        var stack = [];

        while (true)
        {
            // If arrived
            if (offset <= 0) return { node: node, offset: 0 };

            // If will be within current text node
            if (node.nodeType == 3 && (offset <= node.nodeValue.length))
            {
                return { node: node, offset: Math.min(offset, node.nodeValue.length) };
            }

            // Go into children (first one doesn't count)
            if (node.firstChild)
            {
                if (node !== start) offset -= 1;
                stack.push(node);
                node = node.firstChild;
            }
            // If can go to next sibling
            else if (stack.length > 0 && node.nextSibling)
            {
                // If text, count length
                if (node.nodeType === 3) offset -= node.nodeValue.length + 1;
                else offset -= 1;

                node = node.nextSibling;
            }
            else
            {
                // No children or siblings, move up stack
                while (true)
                {
                    if (stack.length <= 1)
                    {
                        // No more options, use current node
                        if (node.nodeType == 3) return { node: node, offset: Math.min(offset, node.nodeValue.length) };
                        else return { node: node, offset: 0 };
                    }

                    var next = stack.pop();

                    // Go to sibling
                    if (next.nextSibling)
                    {
                        // If text, count length
                        if (node.nodeType === 3) offset -= node.nodeValue.length + 1;
                        else offset -= 1;

                        node = next.nextSibling;
                        break;
                    }
                }
            }
        }
    }
});
$R.add('service', 'element', {
    init: function(app)
    {
        this.app = app;
        this.rootElement = app.rootElement;

        // local
        this.$element = {};
        this.type = 'inline';
    },
    start: function()
    {
        this._build();
        this._buildType();
    },

    // public
    isType: function(type)
    {
        return (type === this.type);
    },
    getType: function()
    {
        return this.type;
    },
    getElement: function()
    {
        return this.$element;
    },

    // private
    _build: function()
    {
        this.$element = $R.dom(this.rootElement);
    },
    _buildType: function()
    {
    	var tag = this.$element.get().tagName;

    	this.type = (tag === 'TEXTAREA') ? 'textarea' : this.type;
		this.type = (tag === 'DIV') ? 'div' : this.type;
		this.type = (this.opts.inline) ? 'inline' : this.type;
    }
});
$R.add('service', 'editor', {
    init: function(app)
    {
        this.app = app;

        // local
        this.scrolltop = false;
        this.pasting = false;
    },

    // start
    start: function()
    {
        this._build();
    },

    // focus
    focus: function()
    {
        if (!this.isFocus() && !this._isContenteditableFocus())
        {
            this.saveScroll();
            this.$editor.focus();
            this.restoreScroll();
        }
    },
    startFocus: function()
    {
        this.caret.setStart(this.getFirstNode());
    },
    endFocus: function()
    {
        this.caret.setEnd(this.getLastNode());
    },

    // pasting
    isPasting: function()
    {
        return this.pasting;
    },
	enablePasting: function()
	{
        this.pasting = true;
	},
	disablePasting: function()
	{
        this.pasting = false;
	},

    // scroll
    saveScroll: function()
    {
        this.scrolltop = this._getScrollTarget().scrollTop();
    },
    restoreScroll: function()
    {
		if (this.scrolltop !== false)
		{
    		this._getScrollTarget().scrollTop(this.scrolltop);
    		this.scrolltop = false;
        }
    },

    // non editables
    disableNonEditables: function()
    {
        this.$noneditables = this.$editor.find('[contenteditable=false]');
        this.$noneditables.attr('contenteditable', true);
    },
    enableNonEditables: function()
    {
        if (this.$noneditables)
        {
            setTimeout(function() { this.$noneditables.attr('contenteditable', false); }.bind(this), 1);
        }
    },

    // nodes
    getFirstNode: function()
    {
		return this.$editor.contents()[0];
    },
	getLastNode: function()
	{
    	var nodes = this.$editor.contents();

        return nodes[nodes.length-1];
	},

    // utils
    isSourceMode: function()
    {
        var $source = this.source.getElement();

        return $source.hasClass('redactor-source-open');
    },
    isEmpty: function()
    {
        return this.utils.isEmptyHtml(this.$editor.html());
    },
	isFocus: function()
	{
    	var $active = $R.dom(document.activeElement);
    	var isComponentSelected = (this.$editor.find('.redactor-component-active').length !== 0);

        return (isComponentSelected || $active.closest('.redactor-in-' + this.uuid).length !== 0);
	},

	// element
    getElement: function()
    {
        return this.$editor;
    },

    // private
    _build: function()
    {
        var $element = this.element.getElement();
        var editableElement = (this.element.isType('textarea')) ? '<div>' : $element.get();

        this.$editor = $R.dom(editableElement);
    },
    _getScrollTarget: function()
    {
		return (this.opts.scrollTarget) ? $R.dom(this.opts.scrollTarget) : this.$doc;
    },
	_isContenteditableFocus: function()
	{
        var block = this.selection.getBlock();
        var $blockParent = (block) ? $R.dom(block).closest('[contenteditable=true]').not('.redactor-in') : [];

        return ($blockParent.length !== 0);
	}
});
$R.add('service', 'container', {
    init: function(app)
    {
        this.app = app;
    },
    // public
    start: function()
    {
        this._build();
    },
    getElement: function()
    {
        return this.$container;
    },

    // private
    _build: function()
    {
        var tag = (this.element.isType('inline')) ? '<span>' : '<div>';
        this.$container = $R.dom(tag);
    }
});
$R.add('service', 'source', {
    init: function(app)
    {
        this.app = app;

        // local
        this.$source = {};
        this.content = '';
    },
    // public
    start: function()
    {
        this._build();
        this._buildName();
        this._buildStartedContent();
    },
    getElement: function()
    {
        return this.$source;
    },
    getCode: function()
    {
        return this.$source.val();
    },
    getName: function()
    {
        return this.$source.attr('name');
    },
    getStartedContent: function()
    {
        return this.content;
    },
    setCode: function(html)
    {
        return this.insertion.set(html);
    },
    isNameGenerated: function()
    {
        return (this.name);
    },

    // private
    _build: function()
    {
        var $element = this.element.getElement();
        var isTextarea = this.element.isType('textarea');
        var sourceElement = (isTextarea) ? $element.get() : '<textarea>';

        this.$source = $R.dom(sourceElement);
    },
	_buildName: function()
	{
		var $element = this.element.getElement();

        this.name = $element.attr('name');
        this.$source.attr('name', (this.name) ? this.name : 'content-' + this.uuid);
	},
    _buildStartedContent: function()
    {
        var $element = this.element.getElement();
        var content = (this.element.isType('textarea')) ? $element.val() : $element.html();

        this.content = content.trim();
    }
});
$R.add('service', 'statusbar', {
    init: function(app)
    {
        this.app = app;

        // local
        this.$statusbar = {};
        this.items = [];
    },
    // public
    start: function()
    {
        this.$statusbar = $R.dom('<ul>');
    },
    add: function(name, html)
    {
        return this.update(name, html);
    },
    update: function(name, html)
    {
        var $item;
        if (typeof this.items[name] !== 'undefined')
        {
            $item = this.items[name];
        }
        else
        {
            $item = $R.dom('<li>');
            this.$statusbar.append($item);
            this.items[name] = $item;
        }

        return $item.html(html);
    },
    get: function(name)
    {
        return (this.items[name]) ? this.items[name] : false;
    },
    remove: function(name)
    {
        if (this.items[name])
        {
            this.items[name].remove();
            delete this.items[name];
        }
    },
    getItems: function()
    {
        return this.items;
    },
    removeItems: function()
    {
        this.items = {};
        this.$statusbar.html('');
    },
    getElement: function()
    {
        return this.$statusbar;
    }
});
$R.add('service', 'toolbar', {
    init: function(app)
    {
        this.app = app;

        // local
        this.dropdownOpened = false;
        this.buttonsObservers = {};
    },
    // public
    start: function()
    {
        if (this.is())
        {
            this.opts.activeButtons = (this.opts.activeButtonsAdd) ? this._extendActiveButtons() : this.opts.activeButtons;
            this.create();
        }
    },
    stopObservers: function()
    {
        this.buttonsObservers = {};
    },
    create: function()
    {
        this.$wrapper = $R.dom('<div>');
        this.$toolbar = $R.dom('<div>');
    },
    observe: function()
    {
        this.setButtonsInactive();

        // observers
        for (var name in this.buttonsObservers)
        {
            var observer = this.buttonsObservers[name];
            var button = this.getButton(name);
            this.app.broadcast('button.' + observer + '.observe', button);
        }

        // inline buttons
        var buttons = this.opts.activeButtons;
        var inlines = this.selection.getInlinesAllSelected();
        var tags = this._inlinesToTags(inlines);
        for (var key in buttons)
        {
            if (tags.indexOf(key) !== -1)
            {
                var button = this.getButton(buttons[key])
                button.setActive();
            }

        }
    },

    // is
    is: function()
    {
        return !(!this.opts.toolbar || (this.detector.isMobile() && this.opts.air));
    },
    isAir: function()
    {
        return this.$toolbar.hasClass('redactor-air');
    },
    isFixed: function()
    {
        return this.$toolbar.hasClass('redactor-toolbar-fixed');
    },
    isContextBar: function()
    {
        var $bar = this.$body.find('#redactor-context-toolbar-' + this.uuid);
        return $bar.hasClass('open');
    },

    // get
    getElement: function()
    {
        return this.$toolbar;
    },
    getWrapper: function()
    {
        return this.$wrapper;
    },
    getDropdown: function()
    {
        return this.dropdownOpened;
    },
    getButton: function(name)
    {
        var $btn = this._findButton('.re-' + name);

        return ($btn.length !== 0) ? $btn.dataget('data-button-instance') : false;
    },
    getButtons: function()
    {
        var buttons = [];
        this._findButtons().each(function(node)
        {
            var $node = $R.dom(node);
            buttons.push($node.dataget('data-button-instance'));
        });

        return buttons;
    },
    getButtonsKeys: function()
    {
        var keys = [];
        this._findButtons().each(function(node)
        {
            var $node = $R.dom(node);
            keys.push($node.attr('data-name'));
        });

        return keys;
    },

    // add
    addButton: function(name, btnObj, position, $el)
    {
        position = position || 'end';

        var $button = $R.create('toolbar.button', this.app, name, btnObj);

        if (btnObj.observe)
        {
            this.opts.activeButtonsObservers[name] = { observe: btnObj.observe, button: $button };
        }

        if (position === 'first') this.$toolbar.prepend($button);
        else if (position === 'after') $el.after($button);
        else if (position === 'before') $el.before($button);
        else this.$toolbar.append($button);

        return $button;
    },
    addButtonFirst: function(name, btnObj)
    {
        return this.addButton(name, btnObj, 'first');
    },
    addButtonAfter: function(after, name, btnObj)
    {
        var $btn = this.getButton(after);

        return ($btn) ? this.addButton(name, btnObj, 'after', $btn) : this.addButton(name, btnObj);
    },
    addButtonBefore: function(before, name, btnObj)
    {
        var $btn = this.getButton(before);

        return ($btn) ? this.addButton(name, btnObj, 'before', $btn) : this.addButton(name, btnObj);
    },
    addButtonObserver: function(name, observer)
    {
        this.buttonsObservers[name] = observer;
    },

    // set
    setDropdown: function(dropdown)
    {
        this.dropdownOpened = dropdown;
    },
    setButtonsInactive: function()
    {
        var $buttons = this.getButtons();
        for (var i = 0; i < $buttons.length; i++)
        {
            $buttons[i].setInactive();
        }
    },
    setButtonsActive: function()
    {
        var $buttons = this.getButtons();
        for (var i = 0; i < $buttons.length; i++)
        {
            $buttons[i].setActive();
        }
    },

    // disable & enable
    disableButtons: function()
    {
        var $buttons = this.getButtons();
        for (var i = 0; i < $buttons.length; i++)
        {
            $buttons[i].disable();
        }
    },
    enableButtons: function()
    {
        var $buttons = this.getButtons();
        for (var i = 0; i < $buttons.length; i++)
        {
            $buttons[i].enable();
        }

    },

    // private
    _findButton: function(selector)
    {
        return this.$toolbar.find(selector);
    },
    _findButtons: function()
    {
        return this.$toolbar.find('.re-button');
    },
    _extendActiveButtons: function()
    {
        return $R.extend({}, this.opts.activeButtons, this.opts.activeButtonsAdd);
    },
    _inlinesToTags: function(inlines)
    {
        var tags = [];
        for (var i = 0; i < inlines.length; i++)
        {
            tags.push(inlines[i].tagName.toLowerCase());
        }

        return tags;
    }
});
$R.add('class', 'toolbar.button', {
    mixins: ['dom'],
    init: function(app, name, btnObj)
    {
        this.app = app;
        this.opts = app.opts;
        this.lang = app.lang;
        this.$body = app.$body;
        this.toolbar = app.toolbar;
        this.detector = app.detector;

        // local
        this.obj = btnObj;
        this.name = name;
        this.dropdown = false;
        this.tooltip = false;

        // init
        this._init();
    },
    // is
    isActive: function()
    {
        return this.hasClass('redactor-button-active');
    },
    isDisabled: function()
    {
        return this.hasClass('redactor-button-disabled');
    },

    // has
    hasIcon: function()
    {
        return (this.obj.icon && !this.opts.buttonsTextLabeled);
    },

    // set
    setDropdown: function(dropdown)
    {
        this.obj.dropdown = dropdown;
        this.obj.message = false;
        this.dropdown = $R.create('toolbar.dropdown', this.app, this.name, this.obj.dropdown);
        this.attr('data-dropdown', true);
    },
    setMessage: function(message, args)
    {
        this.obj.message = message;
        this.obj.args = args;
        this.obj.dropdown = false;
    },
    setApi: function(api, args)
    {
        this.obj.api = api;
        this.obj.args = args;
        this.obj.dropdown = false;
    },
    setTitle: function(title)
    {
        this.obj.title = this.lang.parse(title);
        this.obj.tooltip = this.obj.title;

        this.attr({ 'alt': this.obj.tooltip, 'aria-label': this.obj.tooltip });
        if (!this.attr('data-icon')) this.html(this.obj.title);
    },
    setTooltip: function(tooltip)
    {
        this.obj.tooltip = this.lang.parse(tooltip);
        this.attr({ 'alt': this.obj.tooltip, 'aria-label': this.obj.tooltip });
    },
    setIcon: function(icon)
    {
        if (this.opts.buttonsTextLabeled) return;

        this.obj.icon = true;
        this.$icon = $R.dom(icon);

        this.html('');
	    this.append(this.$icon);
	    this.attr('data-icon', true);
	    this.addClass('re-button-icon');
	    this.setTooltip(this.obj.title);
	    this._buildTooltip();
    },
    setActive: function()
    {
        this.addClass('redactor-button-active');
    },
    setInactive: function()
    {
        this.removeClass('redactor-button-active');
    },

    // hide
    hideTooltip: function()
    {
        this.$body.find('.re-button-tooltip').remove();
    },

    // get
    getDropdown: function()
    {
        return this.dropdown;
    },

    // enable & disable
    disable: function()
    {
        this.addClass('redactor-button-disabled');
    },
    enable: function()
    {
        this.removeClass('redactor-button-disabled');
    },

    // toggle
    toggle: function(e)
    {
        if (e) e.preventDefault();
        if (this.isDisabled()) return;

        if (this.obj.dropdown)
        {
            this.dropdown.toggle(e);
        }
        else if (this.obj.api)
        {
            // broadcast
            this.app.api(this.obj.api, this.obj.args, this.name);
        }
        else if (this.obj.message)
        {
            // broadcast
            this.app.broadcast(this.obj.message, this.obj.args, this.name);
        }

        this.hideTooltip();
    },

    // private
    _init: function()
    {
        // parse
        this._parseTitle();
        this._parseTooltip();

        // build
        this._build();
        this._buildCallback();
        this._buildAttributes();
        this._buildObserver();

        if (this.hasIcon())
        {
            this._buildIcon();
            this._buildTooltip();
        }
        else
        {
            this.html(this.obj.title);
        }
    },
    _parseTooltip: function()
    {
        this.obj.tooltip = (this.obj.tooltip) ? this.lang.parse(this.obj.tooltip) : this.obj.title;
    },
    _parseTitle: function()
    {
        this.obj.title = this.lang.parse(this.obj.title);
    },
    _build: function()
    {
        this.parse('<a>');
        this.addClass('re-button re-' + this.name);
        this.attr('data-name', this.name);
        this.dataset('data-button-instance', this);

        if (this.obj.dropdown) this.setDropdown(this.obj.dropdown);
    },
    _buildCallback: function()
    {
        this.on('click', this.toggle.bind(this));
    },
    _buildAttributes: function()
    {
        var attrs = {
            'href': '#',
            'alt': this.obj.tooltip,
            'rel': this.name,
            'role': 'button',
            'aria-label': this.obj.tooltip,
            'tabindex': '-1'
        };

        this.attr(attrs);
    },
    _buildObserver: function()
    {
        if (typeof this.obj.observe !== 'undefined')
        {
            this.toolbar.addButtonObserver(this.name, this.obj.observe);
        }
    },
    _buildIcon: function()
    {
        var icon = this.obj.icon;
        var isHtml = (/(<([^>]+)>)/ig.test(icon));

        this.$icon = (isHtml) ? $R.dom(icon) : $R.dom('<i>');
        if (!isHtml) this.$icon.addClass('re-icon-' + this.name);

	    this.append(this.$icon);
	    this.attr('data-icon', true);
	    this.addClass('re-button-icon');
    },
    _buildTooltip: function()
    {
        if (this.detector.isDesktop())
        {
            this.tooltip = $R.create('toolbar.button.tooltip', this.app, this);
        }
    }
});
$R.add('class', 'toolbar.button.tooltip', {
    mixins: ['dom'],
    init: function(app, $button)
    {
        this.app = app;
        this.$body = app.$body;
        this.toolbar = app.toolbar;

        // local
        this.$button = $button;
        this.created = false;

        // init
        this._init();
    },
    open: function()
    {
        if (this.$button.hasClass('redactor-button-disabled') || this.$button.hasClass('redactor-button-active')) return;

        this.created = true;
        this.parse('<span>');
		this.addClass('re-button-tooltip');

        var $wrapper = this.toolbar.getWrapper();
        this.$body.append(this);

        this.html(this.$button.attr('alt'));

        var offset = this.$button.offset();
        var position = 'absolute';
        var height = this.$button.height();
        var width = this.$button.width();
        var arrowOffset = 4;

        this.css({
            top: (offset.top + height + arrowOffset) + 'px',
            left: (offset.left + width/2 - this.width()/2) + 'px',
            position: position
        });

        this.show();
    },
    close: function()
    {
        if (!this.created || this.$button.hasClass('redactor-button-disabled')) return;

        this.remove();
        this.created = false;
    },

    // private
    _init: function()
    {
        this.$button.on('mouseover', this.open.bind(this));
        this.$button.on('mouseout', this.close.bind(this));
    }
});
$R.add('class', 'toolbar.dropdown', {
    mixins: ['dom'],
    init: function(app, name, items)
    {
        this.app = app;
        this.uuid = app.uuid;
        this.opts = app.opts;
        this.$doc = app.$doc;
        this.$body = app.$body;
        this.animate = app.animate;
        this.toolbar = app.toolbar;

        // local
        this.name = name;
        this.started = false;
        this.items = items;
        this.$items = [];
    },
    // public
    toggle: function(e)
    {
        if (!this.started)
        {
            this._build();
        }

        // toggle
        if (this.isOpened() && this.isActive())
        {
            this.close(false);
        }
        else
        {
            this.open(e);
        }
    },
    isOpened: function()
    {
        var $dropdown = this.$body.find('.redactor-dropdown-' + this.uuid + '.open');

        return ($dropdown.length !== 0 && $dropdown.attr('data-name') === this.name);
    },
    isActive: function()
    {
        var $dropdown = this.$body.find('#redactor-dropdown-' + this.uuid + '-' + this.name + '.open');
        return ($dropdown.length !== 0);
    },
    getName: function()
    {
        return this.attr('data-name');
    },
    getItem: function(name)
    {
        return this.$items[name];
    },
    getItemsByClass: function(classname)
    {
        var result = [];
        for (var key in this.$items)
        {
            if (this.$items[key].hasClass(classname)) result.push(this.$items[key]);
        }

        return result;
    },
    open: function(e)
    {
        this._closeAll();

        this.$btn = this.toolbar.getButton(this.name);
        this.app.broadcast('dropdown.open', e, this, this.$btn);
        this.toolbar.setDropdown(this);

        this.show();
        this.removeClass('redactor-animate-hide');
        this.addClass('open');
        this._observe();

        this.$btn.hideTooltip();
        this.$btn.setActive();

        this.$doc.on('keyup.redactor.dropdown-' + this.uuid, this._handleKeyboard.bind(this));
        this.$doc.on('click.redactor.dropdown-' + this.uuid + ' touchstart.redactor.dropdown-' + this.uuid, this.close.bind(this));

        this.updatePosition();
        this.app.broadcast('dropdown.opened', e, this, this.$btn);

    },
    close: function(e, animate)
    {
        if (e)
        {
            var $el = $R.dom(e.target);
            if (this._isButton(e) || $el.hasClass('redactor-dropdown-not-close') || $el.hasClass('redactor-dropdown-item-disabled'))
            {
                e.preventDefault();
                return;
            }
        }

        this.app.broadcast('dropdown.close', this, this.$btn);
        this.toolbar.setDropdown(false);

        this.$btn.setInactive();
        if (animate === false)
        {
            this._close();
        }
        else
        {
            this.animate.start(this, 'fadeOut', this._close.bind(this));
        }
    },
    updatePosition: function()
    {
        var isFixed = this.toolbar.isFixed();
        var pos = this.$btn.offset();
        pos.top = (isFixed) ? this.$btn.position().top : pos.top;

        var height = this.$btn.height();
        var position = (isFixed) ? 'fixed' : 'absolute';
        var topOffset = 2;
        var leftOffset = 0;

        this.css({ position: position, top: (pos.top + height + topOffset) + 'px', left: (pos.left + leftOffset) + 'px' });
    },

    // private
    _build: function()
    {
        this.parse('<div>');

        this.attr('id', 'redactor-dropdown-' + this.uuid + '-' + this.name);
        this.attr('data-name', this.name);

        this.addClass('redactor-dropdown redactor-dropdown-' + this.uuid + ' redactor-dropdown-' + this.name);
        this.dataset('data-dropdown-instance', this);
        var isDom = (this.items.dom || typeof this.items === 'string');

        if (isDom) this._buildDom();
        else this._buildItems();

        this.$body.append(this);
        this.started = true;
    },
    _buildDom: function()
    {
        this.html('').append($R.dom(this.items));
    },
    _buildItems: function()
    {
        this.items = (this.name === 'format') ? this._buildFormattingItems() : this.items;

        for (var key in this.items)
        {
            var obj = this.items[key];

            if (key === 'observe')
            {
                this.attr('data-observe', this.items[key]);
            }
            else
            {
                var $item = $R.create('toolbar.dropdown.item', this.app, key, obj, this);

                this.$items[key] = $item;
                this.append($item);
            }
        }
    },
    _buildFormattingItems: function()
    {
        // build the format set
        for (var key in this.items)
        {
            if (this.opts.formatting.indexOf(key) === -1) delete this.items[key];
		}

        // remove from the format set
		if (this.opts.formattingHide)
		{
			for (var key in this.items)
            {
                if (this.opts.formattingHide.indexOf(key) !== -1) delete this.items[key];
            }
		}

		// add to the format set
		if (this.opts.formattingAdd)
		{
			for (var key in this.opts.formattingAdd)
			{
                this.items[key] = this.opts.formattingAdd[key];
			}
		}

        return this.items;
    },
    _handleKeyboard: function(e)
	{
		if (e.which === 27) this.close();
	},
    _isButton: function(e)
    {
        var $el = $R.dom(e.target);
        var $btn = $el.closest('.re-button');

        return ($btn.get() === this.$btn.get());
    },
    _close: function()
    {
        this.$btn.setInactive();
        this.$doc.off('.redactor.dropdown-' + this.uuid);
        this.removeClass('open');
        this.addClass('redactor-animate-hide');
        this.app.broadcast('dropdown.closed', this, this.$btn);
    },
    _closeAll: function()
    {
        this.$body.find('.redactor-dropdown-' + this.uuid + '.open').each(function(node)
        {
            var $node = $R.dom(node);
            var instance =  $node.dataget('data-dropdown-instance');
            instance._close();
        });
    },
    _observe: function()
    {
        var observer = this.attr('data-observe');
        if (observer)
        {
            this.app.broadcast('dropdown.' + observer + '.observe', this);
        }
    }
});
$R.add('class', 'toolbar.dropdown.item', {
    mixins: ['dom'],
    init: function(app, name, obj, dropdown)
    {
        this.app = app;
        this.lang = app.lang;

        // local
        this.dropdown = dropdown;
        this.name = name
        this.obj = obj;

        // init
        this._init();
    },
    setTitle: function(html)
    {
        this.$span.html(html);
    },
    getTitle: function()
    {
        return this.$span.html();
    },
    enable: function()
    {
        this.removeClass('redactor-dropdown-item-disabled');
    },
    disable: function()
    {
        this.addClass('redactor-dropdown-item-disabled');
    },
    toggle: function(e)
    {
        if (e) e.preventDefault();
        if (this.hasClass('redactor-dropdown-item-disabled')) return;

        if (this.obj.message)
        {
            // broadcast
            this.app.broadcast(this.obj.message, this.obj.args, this.name);
        }
        else if (this.obj.api)
        {
            this.app.api(this.obj.api, this.obj.args, this.name);
        }
    },

    // private
    _init: function()
    {
        this.parse('<a>');
        this.attr('href', '#');
        this.addClass('redactor-dropdown-item-' + this.name);

        if (this.obj.classname)
        {
            this.addClass(this.obj.classname);
        }

        this.attr('data-name', this.name);
        this.on('click', this.toggle.bind(this));

        this.$span = $R.dom('<span>');
        this.append(this.$span);
        this.setTitle(this.lang.parse(this.obj.title));
    }
});
$R.add('service', 'cleaner', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;

        // local
        this.storedComponents = [];
        this.deniedTags = ['font', 'html', 'head', 'link', 'title', 'body', 'meta', 'applet'];

        // regex
        this.reComments = /<!--[\s\S]*?-->/gi;
        this.reSpacedEmpty = /^(||\s||<br\s?\/?>||&nbsp;)$/i;
        this.reScriptTag = /<script(.*?[^>]?)>([\w\W]*?)<\/script>/gi;
        this.reBreaklineLast = '<br\\s?/?>(\\s|\\n)?</(' + this.opts.blockTags.join('|') + ')>';
    },
    // public
    input: function(html)
    {
        // pre/code
        html = this.encodePreCode(html);

        // convert to figure
        var converter = $R.create('cleaner.figure', this.app);
        html = converter.convert(html);

        // breakline newlines
        if (this.opts.breakline)
        {
            html = html.replace(/<br\s?\/?>\n/gi, '\n');
            html = this._replaceNlToBr(html);
        }

        // store components
        html = this.storeComponents(html);

        // clean
        html = this.replaceTags(html, this.opts.replaceTags);
        html = this._setSpanAttr(html);
        html = this._setStyleCache(html);
        html = this.removeTags(html, this.deniedTags);
        html = this._removeLastBlockBreaklineInHtml(html);
        html = (this.opts.removeScript) ? this._removeScriptTag(html) : this._replaceScriptTag(html);
		html = (this.opts.removeComments) ? this.removeComments(html) : html;
        html = (this._isSpacedEmpty(html)) ? this.opts.emptyHtml : html;

        // restore components
        html = this.restoreComponents(html);

        // clear wrapped components
        html = this._cleanWrapped(html);

        return html;
    },
    output: function(html, removeMarkers)
    {
        html = this.removeInvisibleSpaces(html);

        // empty
        if (this._isSpacedEmpty(html)) return '';

        html = this.removeServiceTagsAndAttrs(html, removeMarkers);

        // store components
        html = this.storeComponents(html);

        html = this.removeSpanWithoutAttributes(html);
        html = this.removeFirstBlockBreaklineInHtml(html);
        html = this.removeLastBlockBreaklineInHtml(html);
        html = (this.opts.removeScript) ? html : this._unreplaceScriptTag(html);
        html = (this.opts.preClass) ? this._setPreClass(html) : html;
        html = (this.opts.linkNofollow) ? this._setLinkNofollow(html) : html;
        html = (this.opts.removeNewLines) ? this.cleanNewLines(html) : html;

        // restore components
        html = this.restoreComponents(html);

        // convert to figure
        var converter = $R.create('cleaner.figure', this.app);
        html = converter.unconvert(html);

        // final clean up
        html = this.removeEmptyAttributes(html, ['style', 'class', 'rel', 'alt', 'title']);
        html = this.cleanSpacesInPre(html);
        html = this.tidy(html);

        return html;
    },
    paste: function(html)
    {
        // remove tags
        var deniedTags = this.deniedTags.concat(['iframe']);
        html = this.removeTags(html, deniedTags);

        // remove doctype tag
        html = html.replace(new RegExp("<\!doctype([\\s\\S]+?)>", 'gi'), '');

        // remove style tag
        html = html.replace(new RegExp("<style([\\s\\S]+?)</style>", 'gi'), '');

        // gdocs & word
        var isMsWord = this._isHtmlMsWord(html);

        html = this._cleanGDocs(html);
        html = (isMsWord) ? this._cleanMsWord(html) : html;

        // do not clean
        if (!this.opts.pasteClean) return html;

        // plain text
        if (this.opts.pastePlainText)
        {
            return this.pastePlainText(html);
        }

        // remove tags
        var exceptedTags = this.opts.pasteBlockTags.concat(this.opts.pasteInlineTags);
        html = this.removeTagsExcept(html, exceptedTags);

        // links & images
        html = (this.opts.pasteLinks) ? html : this.removeTags(html, ['a']);
        html = (this.opts.pasteImages) ? html : this.removeTags(html, ['img']);

        // build wrapper
        var $wrapper = this._buildWrapper(html);

        // clean attrs
        var $elms = $wrapper.find('*');

        // remove style
        var filterStyle = (this.opts.pasteKeepStyle.length !== 0) ? ',' + this.opts.pasteKeepStyle.join(',') : '';
        $elms.not('[data-redactor-style-cache]' + filterStyle).removeAttr('style');

        // remove class
        var filterClass = (this.opts.pasteKeepClass.length !== 0) ? ',' + this.opts.pasteKeepClass.join(',') : '';
        $elms.not('[data-redactor-style-cache]' + filterClass).removeAttr('class');

        // remove attrs
        var filterAttrs = (this.opts.pasteKeepAttrs.length !== 0) ? ',' + this.opts.pasteKeepAttrs.join(',') : '';
        $elms.not('img, a, [data-redactor-style-cache]' + filterAttrs).each(function(node)
        {
            while(node.attributes.length > 0)
            {
                node.removeAttribute(node.attributes[0].name);
            }
        });

        // paste link target
		if (this.opts.pasteLinks && this.opts.pasteLinkTarget !== false)
		{
			$wrapper.find('a').attr('target', this.opts.pasteLinkTarget);
		}

        // keep style
		$wrapper.find('[data-redactor-style-cache]').each(function(node)
		{
    		var style = node.getAttribute('data-redactor-style-cache');
    		node.setAttribute('style', style)
		});

        // remove empty span
        $wrapper.find('span').each(function(node)
        {
            if (node.attributes.length === 0)
            {
                $R.dom(node).unwrap();
            }
        });

        // remove empty inline
        $wrapper.find(this.opts.inlineTags.join(',')).each(function(node)
		{
			if (node.attributes.length === 0 && this.utils.isEmptyHtml(node.innerHTML))
			{
				$R.dom(node).unwrap();
			}

		}.bind(this));

		// place ul/ol into li
		$wrapper.find('ul, ol').each(function(node)
		{
    		var prev = node.previousSibling;
    		if (prev && prev.tagName === 'LI')
    		{
        		var $li = $R.dom(prev);
        		$li.find('p').unwrap();
                $li.append(node);
    		}
		});

        // get wrapper
        html = this._getWrapperHtml($wrapper);

        // remove paragraphs form lists (google docs bug)
		html = html.replace(/<li><p>/gi, '<li>');
		html = html.replace(/<\/p><\/li>/gi, '</li>');

        // clean empty p
        html = html.replace(/<p>&nbsp;<\/p>/gi, '<p></p>');
        html = html.replace(/<p><br\s?\/?><\/p>/gi, '<p></p>');

        if (isMsWord)
        {
            html = html.replace(/<p><\/p>/gi, '');
            html = html.replace(/<p>\s<\/p>/gi, '');
        }

        return html;
    },
    pastePlainText: function(html)
    {
        html = (this.opts.pasteLinks) ? this.storeLinks(html) : html;
        html = (this.opts.pasteImages) ? this.storeImages(html) : html;

        html = this.getPlainText(html);
        html = this.replaceNlToBr(html);

        html = (this.element.isType('inline')) ? this.removeBr(html) : html;

        html = (this.opts.pasteLinks) ? this.restoreLinks(html) : html;
        html = (this.opts.pasteImages) ? this.restoreImages(html) : html;

        return html;
    },
    tidy: function(html)
    {
        return html;
    },
    paragraphize: function(html)
    {
        var paragraphize = $R.create('cleaner.paragraphize', this.app);

        return paragraphize.convert(html);
    },

    // get
	getFlatText: function(html)
	{
    	var $div = $R.dom('<div>');

    	if (!html.nodeType && !html.dom)
        {
            html = html.toString();
    		html = html.trim();
    		$div.html(html);
		}
		else
		{
            $div.append(html);
		}

		html = $div.get().textContent || $div.get().innerText || '';

		return (html === undefined) ? '' : html;
	},

    // replace
    replaceTags: function(html, tags)
    {
        if (tags)
        {
            var self = this;
            var keys = Object.keys(tags);
            var $wrapper = this._buildWrapper(html);
			$wrapper.find(keys.join(',')).each(function(node)
			{
				self.utils.replaceToTag(node, tags[node.tagName.toLowerCase()]);
			});

			html = this._getWrapperHtml($wrapper);
        }

        return html;
    },
	replaceNbspToSpaces: function(html)
	{
		return html.replace('&nbsp;', ' ');
	},
	replaceBlocksToBr: function(html)
	{
		html = html.replace(/<\/div>|<\/li>|<\/td>|<\/p>|<\/H[1-6]>/gi, '<br>');

    	return html;
	},

    // clean
	cleanNewLines: function(html)
	{
        return html.replace(/\r?\n/g, "");
	},
	cleanSpacesInPre: function(html)
	{
    	return html.replace('&nbsp;&nbsp;&nbsp;&nbsp;', '    ');
	},

    // remove
	removeInvisibleSpaces: function(html)
	{
    	html = html.replace(/\u200B/g, '');
		html = html.replace(/&#x200b;/gi, '');

		return html;
	},
	removeNl: function(html)
	{
        html = html.replace(/\n/g, " ");
        html = html.replace(/\s{2,}/g, "\s");

        return html;
	},
	removeBrAtEnd: function(html)
	{
        html = html.replace(/<br\s?\/?>$/gi, ' ');
        html = html.replace(/<br\s?\/?><li/gi, '<li');

    	return html;
	},
	removeTags: function(input, denied)
	{
	    var re = (denied) ? /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi : /(<([^>]+)>)/gi;
        var replacer = (!denied) ? '' : function ($0, $1)
	    {
	        return denied.indexOf($1.toLowerCase()) === -1 ? $0 : '';
	    };

        return input.replace(re, replacer);
	},
	removeTagsExcept: function(input, except)
	{
		if (except === undefined) return input.replace(/(<([^>]+)>)/gi, '');

	    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
	    return input.replace(tags, function($0, $1)
	    {
	        return except.indexOf($1.toLowerCase()) === -1 ? '' : $0;
	    });
	},
    removeComments: function(html)
    {
        return html.replace(this.reComments, '');
    },
	removeServiceTagsAndAttrs: function(html, removeMarkers)
	{
    	var $wrapper = this._buildWrapper(html);
        if (removeMarkers !== false)
        {
            $wrapper.find('.redactor-selection-marker').each(function(node)
            {
                var $el = $R.dom(node);
                var text = $el.text().replace(/\u200B/g, '');

                return (text === '') ? $el.remove() : $el.unwrap();
            });
        }

        $wrapper.find('[data-redactor-style-cache]').removeAttr('data-redactor-style-cache');

        return this._getWrapperHtml($wrapper);
	},
	removeSpanWithoutAttributes: function(html)
	{
    	var $wrapper = this._buildWrapper(html);
        $wrapper.find('span').removeAttr('data-redactor-span data-redactor-style-cache').each(function(node)
		{
			if (node.attributes.length === 0) $R.dom(node).unwrap();
		});

        return this._getWrapperHtml($wrapper);
	},
    removeFirstBlockBreaklineInHtml: function(html)
    {
        return html.replace(new RegExp('</li><br\\s?/?>', 'gi'), '</li>');
    },
    removeLastBlockBreaklineInHtml: function(html)
    {
        return html.replace(new RegExp(this.reBreaklineLast, 'gi'), '</$2>');
    },
	removeEmptyAttributes: function(html, attrs)
	{
    	var $wrapper = this._buildWrapper(html);
        for (var i = 0; i < attrs.length; i++)
        {
            $wrapper.find('[' + attrs[i] + '=""]').removeAttr(attrs[i]);
        }

        return this._getWrapperHtml($wrapper);
	},

    // encode / decode
	encodeHtml: function(html)
	{
        html = html.replace(/<br\s?\/?>/g, "\n");
        html = html.replace(/&nbsp;/g, ' ');
		html = html.replace(/”/g, '"');
		html = html.replace(/“/g, '"');
		html = html.replace(/‘/g, '\'');
		html = html.replace(/’/g, '\'');
		html = this.encodeEntities(html);
		html = html.replace(/\$/g, '&#36;');

        if (this.opts.preSpaces)
        {
            html = html.replace(/\t/g, new Array(this.opts.preSpaces + 1).join(' '));
        }

		return html;
	},
	encodePreCode: function(html)
	{
    	var matched = html.match(new RegExp('<code(.*?)>(.*?)<pre(.*?)>(.*?)</pre>(.*?)</code>', 'gi'));
    	if (matched !== null)
    	{
        	for (var i = 0; i < matched.length; i++)
            {
                var arr = matched[i].match(new RegExp('<pre(.*?)>([\\w\\W]*?)</pre>', 'i'));
                html = html.replace(arr[0], this.encodeEntities(arr[0]));
            }
    	}

        var $wrapper = this._buildWrapper(html);

        $wrapper.find('code code').replaceWith(this._encodeOuter.bind(this));
        $wrapper.find('code pre').replaceWith(this._encodeOuter.bind(this));
        $wrapper.find('pre pre').replaceWith(this._encodeOuter.bind(this));
        $wrapper.find('code, pre').each(this._encodePreCodeLine.bind(this));

        html = this._getWrapperHtml($wrapper);

        // restore markers
        html = this._decodeMarkers(html);

    	return html;
	},
	encodeEntities: function(str)
	{
		str = this.decodeEntities(str);
		str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

		return str;
	},
    encodePhpCode: function(html)
    {
        html = html.replace('<?php', '&lt;?php');
        html = html.replace('<?', '&lt;?');
		html = html.replace('?>', '?&gt;');

		return html;
    },
	decodeEntities: function(str)
	{
		return String(str).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
	},

    // store / restore
    storeComponents: function(html)
    {
        this.storedComponents = [];
        var matched = html.match(/<figure(.*?)>([\w\W]*?)<\/figure>/gi);
        if (matched)
        {
            for (var i = 0; i < matched.length; i++)
            {
                this.storedComponents[i] = matched[i];
                html = html.replace(matched[i], '####figure' + i + '####');
            }
        }

        return html;
    },
    restoreComponents: function(html)
    {
        if (this.storedComponents)
        {
            for (var i = 0; i < this.storedComponents.length; i++)
            {
                html = html.replace('####figure' + i + '####', this.storedComponents[i]);
            }
        }

        return html;
    },

    // PRIVATE

    // clean
    _cleanWrapped: function(html)
    {
        html = html.replace(new RegExp('<p><figure([\\w\\W]*?)</figure></p>', 'gi'), '<figure$1</figure>');
        html = html.replace(new RegExp('<figure([\\w\\W]*?)</figure>([^>]+)</p>', 'gi'), '</p><figure$1</figure><p>$2<p>');
        html = html.replace(new RegExp('<figure([\\w\\W]*?)</figure></p>', 'gi'), '</p><figure$1</figure>');

        return html;
    },
    _cleanGDocs: function(html)
    {
		// remove google docs markers
        html = html.replace(/<b\sid="internal-source-marker(.*?)">([\w\W]*?)<\/b>/gi, "$2");
		html = html.replace(/<b(.*?)id="docs-internal-guid(.*?)">([\w\W]*?)<\/b>/gi, "$3");

        html = html.replace(/<span[^>]*(font-style: italic; font-weight: bold|font-weight: bold; font-style: italic)[^>]*>([\w\W]*?)<\/span>/gi, '<b><i>$2</i></b>');
        html = html.replace(/<span[^>]*(font-style: italic; font-weight: 700|font-weight: 700; font-style: italic)[^>]*>([\w\W]*?)<\/span>/gi, '<b><i>$2</i></b>');
        html = html.replace(/<span[^>]*font-style: italic[^>]*>([\w\W]*?)<\/span>/gi, '<i>$1</i>');
        html = html.replace(/<span[^>]*font-weight: bold[^>]*>([\w\W]*?)<\/span>/gi, '<b>$1</b>');
        html = html.replace(/<span[^>]*font-weight: 700[^>]*>([\w\W]*?)<\/span>/gi, '<b>$1</b>');

        return html;
    },
    _cleanMsWord: function(html)
    {
        html = html.replace(/<o:p[^>]*>/gi, '');
        html = html.replace(/<\/o:p>/gi, '');
		html = html.replace(/<!--[\s\S]*?-->/g, "");
		html = html.replace(/<o:p>[\s\S]*?<\/o:p>/gi, '');
		html = html.replace(/>&nbsp;<\/p>/gi, '></p>');
		html = html.replace(/<p[^>]*><\/p>/gi, '');
		html = html.replace(/\n/g, " ");

        return html;
    },

	// is
    _isSpacedEmpty: function(html)
    {
        return (html.search(this.reSpacedEmpty) !== -1);
    },
    _isHtmlMsWord: function(html)
	{
		return html.match(/class="?Mso|style="[^"]*\bmso-|style='[^'']*\bmso-|w:WordDocument/i);
	},

    // set
    _setSpanAttr: function(html)
    {
        var $wrapper = this._buildWrapper(html);
        $wrapper.find('span').attr('data-redactor-span', true);

        return this._getWrapperHtml($wrapper);
    },
    _setStyleCache: function(html)
    {
        var $wrapper = this._buildWrapper(html);
        $wrapper.find('[style]').each(function(node)
		{
            var $el = $R.dom(node);
            $el.attr('data-redactor-style-cache', $el.attr('style'));
		});

        return this._getWrapperHtml($wrapper);
    },
    _setPreClass: function(html)
    {
        var $wrapper = this._buildWrapper(html);
        $wrapper.find('pre').addClass(this.opts.preClass);

        return this._getWrapperHtml($wrapper);
    },
    _setLinkNofollow: function(html)
    {
        var $wrapper = this._buildWrapper(html);
        $wrapper.find('a').attr('rel', 'nofollow');

        return this._getWrapperHtml($wrapper);
    },

    // replace
    _replaceScriptTag: function(html)
    {
        return html.replace(this.reScriptTag, '<pre class="redactor-script-tag" $1>$2</pre>');
    },
    _unreplaceScriptTag: function(html)
    {
		return html.replace(/<pre class="redactor-script-tag"(.*?[^>]?)>([\w\W]*?)<\/pre>/gi, '<script$1>$2</script>');
    },
	_replaceBrToNl: function(html)
	{
		return html.replace(/<br\s?\/?>/gi, '\n');
	},
	_replaceNlToBr: function(html)
	{
		return html.replace(/\n/g, '<br />');
	},

	// remove
	_removeLastBlockBreaklineInHtml: function(html)
	{
        return html.replace(new RegExp(this.reBreaklineLast, 'gi'), '</$2>');
	},
    _removeScriptTag: function(html)
    {
        return html.replace(this.reScriptTag, '');
    },

    // private
    _buildWrapper: function(html)
    {
        return $R.dom('<div>').html(html);
    },
    _getWrapperHtml: function($wrapper)
    {
        var html = $wrapper.html();
        $wrapper.remove();

        return html;
    },
    _decodeMarkers: function(html)
    {
        var decodedMarkers = '<span id="selection-marker-$1" class="redactor-selection-marker">​</span>';
        return html.replace(/&lt;span id="selection-marker-(start|end)" class="redactor-selection-marker"&gt;​&lt;\/span&gt;/g, decodedMarkers);
    },
    _encodeOuter: function(node)
    {
        return this.encodeEntities(node.outerHTML);
    },
    _encodePreCodeLine: function(node)
    {
        var first = node.firstChild;
        if (node.tagName == 'PRE' && (first && first.tagName === 'CODE')) return;

        var encoded = this.decodeEntities(node.innerHTML);
        encoded = encoded.replace(/&nbsp;/g, ' ').replace(/<br\s?\/?>/g, '\n');
        encoded = (this.opts.preSpaces) ? encoded.replace(/\t/g, new Array(this.opts.preSpaces + 1).join(' ')) : encoded;

        node.textContent = encoded;
    }
});
$R.add('class', 'cleaner.figure', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.utils = app.utils;
    },
    // public
    convert: function(html)
    {
        var $wrapper = this._buildWrapper(html);

        // convert
        $wrapper.find('img').each(this._convertImage.bind(this));
        $wrapper.find('hr').each(this._convertLine.bind(this));
        $wrapper.find('form').each(this._convertForm.bind(this));
        $wrapper.find('table').each(this._convertTable.bind(this));
        $wrapper.find('iframe').each(this._convertIframe.bind(this));
        $wrapper.find('figure pre').each(this._convertCode.bind(this));

        // variables
        $wrapper.find('[data-redactor-type=variable]').addClass('redactor-component');

        // widgets
        $wrapper.find('figure').not('.redactor-component, .redactor-figure-code').each(this._convertWidget.bind(this));

        // contenteditable
        $wrapper.find('figure pre').each(this._setContenteditableCode.bind(this));
        $wrapper.find('.redactor-component, .non-editable').attr('contenteditable', false);
        $wrapper.find('td, th, figcaption').attr('contenteditable', true);
        $wrapper.find('.redactor-component, figcaption').attr('tabindex', '-1');

        return this._getWrapperHtml($wrapper);
    },
    unconvert: function(html)
    {
        var $wrapper = this._buildWrapper(html);

        // contenteditable
        $wrapper.find('th, td, figcaption, figure, pre, code, .redactor-component').removeAttr('contenteditable');
        $wrapper.find('figcaption, figure, pre, code, .redactor-component').removeAttr('tabindex');

        // unconvert
        $wrapper.find('[data-redactor-type=variable]').removeClass('redactor-component');
        $wrapper.find('figure[data-redactor-type=line]').unwrap();
        $wrapper.find('figure[data-redactor-type=form]').each(this._unconvertForm.bind(this));
        $wrapper.find('figure[data-redactor-type=image]').removeAttr('rel').each(this._unconvertImagesInLists.bind(this));

        $wrapper.find('.non-editable').removeAttr('contenteditable');

        // remove classes
        $wrapper.find('figure').removeClass('redactor-component redactor-component-active').each(this._removeTypes.bind(this));

        // remove caret
        $wrapper.find('span.redactor-component-caret').remove();

        return this._getWrapperHtml($wrapper);
    },

    // private
    _convertImage: function(node)
    {
        var $node = $R.dom(node);
        if (this._isNonEditable($node)) return;

        var $link = $node.closest('a');
        var $figure = $node.closest('figure');
        var isImage = ($figure.children().not('a, img, br, figcaption').length === 0);

        if (!isImage) return;

        if ($figure.length === 0)
        {
            $figure = ($link.length !== 0) ? $link.wrap('<figure>') : $node.wrap('<figure>');
        }

        this._setFigure($figure, 'image');
    },
    _convertLine: function(node)
    {
        if (this._isNonEditable(node)) return;

        var $figure = this._wrapFigure(node);
        this._setFigure($figure, 'line');
    },
    _convertForm: function(node)
    {
        if (this._isNonEditable(node)) return;

        var $figure = this.utils.replaceToTag(node, 'figure');
        this._setFigure($figure, 'form');
    },
    _convertTable: function(node)
    {
        if (this._isNonEditable(node)) return;

        var $figure = this._wrapFigure(node);
        this._setFigure($figure, 'table');
    },
    _convertIframe: function(node)
    {
        if (this._isNonEditable(node)) return;

        var src = node.getAttribute('src');
        var isVideo = (src && (src.match(this.opts.regex.youtube) || src.match(this.opts.regex.vimeo)));
        var $figure = this._wrapFigure(node);

        if (isVideo)
        {
            this._setFigure($figure, 'video');
        }
    },
    _convertCode: function(node)
    {
        if (this._isNonEditable(node)) return;

        var $figure = this._wrapFigure(node);
        this._setFigure($figure, 'code')
    },
    _convertWidget: function(node)
    {
        if (this._isNonEditable(node)) return;

        var $node = $R.dom(node);
        $node.addClass('redactor-component');
        $node.attr('data-redactor-type', 'widget');
    },

    // unconvert
    _unconvertForm: function(node)
    {
        var $node = this.utils.replaceToTag(node, 'form');
    },
    _unconvertImagesInLists: function(node)
    {
        var $node = $R.dom(node);
        var isList = ($node.closest('li').length !== 0);
        if (isList)
        {
            $node.unwrap();
        }
    },
    _removeTypes: function(node)
    {
        var type = node.getAttribute('data-redactor-type');
        var removed = ['image', 'widget', 'line', 'video', 'code', 'form', 'table'];
        if (type && removed.indexOf(type) !== -1)
        {
            node.removeAttribute('data-redactor-type');
        }
    },

    // wrap
    _wrapFigure: function(node)
    {
        var $node = $R.dom(node);
        var $figure = $node.closest('figure');

        return ($figure.length === 0) ? $node.wrap('<figure>') : $figure;
    },

    // set
    _setFigure: function($figure, type)
    {
        $figure.addClass('redactor-component');
        $figure.attr('data-redactor-type', type);
    },
    _setContenteditableCode: function(node)
    {
        if (this._isNonEditable(node)) return;

        var $node = $R.dom(node);
        var $code = $node.children('code').first();

        var $el = ($code.length !== 0) ? $code : $node;
        $el.attr('contenteditable', true).attr('tabindex', '-1');
    },

    // utils
    _isNonEditable: function(node)
    {
        return ($R.dom(node).closest('.non-editable').length !== 0);
    },
    _buildWrapper: function(html)
    {
        return $R.dom('<div>').html(html);
    },
    _getWrapperHtml: function($wrapper)
    {
        var html = $wrapper.html();
        $wrapper.remove();

        return html;
    }
});
$R.add('class', 'cleaner.paragraphize', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.element = app.element;

        // local
        this.paragraphizeTags = ['table', 'div', 'pre', 'form', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'dl', 'blockquote', 'figcaption',
    			'address', 'section', 'header', 'footer', 'aside', 'article', 'object', 'style', 'script', 'iframe', 'select', 'input', 'textarea',
    			'button', 'option', 'map', 'area', 'math', 'hr', 'fieldset', 'legend', 'hgroup', 'nav', 'figure', 'details', 'menu', 'summary', 'p'];
    },
    // public
    convert: function(html)
    {
        if (this.opts.breakline === true || this.opts.paragraphize === false || this.element.isType('inline'))
		{
			return html;
		}

        // empty
		if (this._isEmptyHtml(html))
		{
			return this.opts.emptyHtml;
		}

		// paragraphize
		var stored = [];
		var markupTag = this.opts.markup;

        // store
		var $wrapper = this._buildWrapper(html);

		$wrapper.find(this.paragraphizeTags.join(', ')).each(function(node, i)
		{
    		var replacement = document.createTextNode("#####replace" + i + "#####\n\n");
			stored.push(node.outerHTML);
			node.parentNode.replaceChild(replacement, node);

		});

		html = this._getWrapperHtml($wrapper);

        html = html.replace('<br>', "\n");
        html = html.replace(/\r\n/g, "xparagraphmarkerz");
		html = html.replace(/\n/g, "xparagraphmarkerz");
		html = html.replace(/\r/g, "xparagraphmarkerz");

		var re1 = /\s+/g;
		html = html.replace(re1, " ");
		html = html.trim();

		var re2 = /xparagraphmarkerzxparagraphmarkerz/gi;
		html = html.replace(re2, '</' + markupTag + '><' + markupTag + '>');

		var re3 = /xparagraphmarkerz/gi;
		html = html.replace(re3, "<br>");

		html = '<' + markupTag + '>' + html + '</' + markupTag + '>';

		// clean
		html = html.replace(new RegExp('<br\\s?/?></' + markupTag + '>', 'gi'), '</' + markupTag + '>');
		html = html.replace(new RegExp('<' + markupTag + '><br\\s?/?>', 'gi'), '<' + markupTag + '>');
		html = html.replace(new RegExp('<br\\s?/?><' + markupTag + '>', 'gi'), '<' + markupTag + '>');
		html = html.replace(new RegExp('<' + markupTag + '></' + markupTag + '>$', 'gi'), '');
        html = html.replace(new RegExp('<p>#####replace(.*?)#####</p>', 'gi'), '#####replace$1#####');
        html = html.replace(new RegExp('<p>(.*?)#####replace(.*?)#####\\s?</p>', 'gi'), '<p>$1</p>#####replace$2#####');

        // restore
        for (var i = 0; i < stored.length; i++)
		{
			html = html.replace('#####replace' + i + '#####', stored[i]);
		}

        return html;
    },

    // private
    _isEmptyHtml: function(html)
    {
        return (html === '' || html === '<p></p>' || html === '<div></div>');
    },
    _buildWrapper: function(html)
    {
        return $R.dom('<div>').html(html);
    },
    _getWrapperHtml: function($wrapper)
    {
        var html = $wrapper.html();
        $wrapper.remove();

        return html;
    }
});
$R.add('service', 'detector', {
    init: function(app)
    {
        this.app = app;

        // local
        this.userAgent = navigator.userAgent.toLowerCase();
    },
	isWebkit: function()
	{
		return /webkit/.test(this.userAgent);
	},
	isFirefox: function()
	{
		return (this.userAgent.indexOf('firefox') > -1);
	},
	isIe: function(v)
	{
        if (document.documentMode || /Edge/.test(navigator.userAgent)) return 'edge';

		var ie;
		ie = RegExp('msie' + (!isNaN(v)?('\\s'+v):''), 'i').test(navigator.userAgent);
		if (!ie) ie = !!navigator.userAgent.match(/Trident.*rv[ :]*11\./);

		return ie;
	},
	isMobile: function()
	{
		return /(iPhone|iPod|Android)/.test(navigator.userAgent);
	},
	isDesktop: function()
	{
		return !/(iPhone|iPod|iPad|Android)/.test(navigator.userAgent);
	},
	isIpad: function()
	{
		return /iPad/.test(navigator.userAgent);
	}
});
$R.add('service', 'offset', {
    init: function(app)
    {
        this.app = app;

        // local
        this.saved = false;
    },
    get: function(el, trimmed, length)
    {
        var $editor = this.editor.getElement();
        var isEditor = (el === undefined || el === $editor.get());

        var node = (isEditor) ? $editor.get() : $R.dom(el).get();
        var isIn = (isEditor) ? true : this.selection.isIn(node);

        if (node && this.selection.is() && isIn)
        {
            return (trimmed) ? this._getTrimmedOffset(node, isEditor, length) : this._getOffset(node);
        }

        return false;
    },
    set: function(offset, el)
    {
        if (el)
        {
            var data = this.inspector.parse(el);
            if (data.isComponent() && !data.isComponentEditable())
            {
                return this.component.setActive(el);
            }
        }

        this.editor.focus();

        var $editor = this.editor.getElement();
        var isEditor = (typeof el === 'undefined')
        var node = (isEditor) ? $editor.get() : $R.dom(el).get();

        if (isEditor) this.editor.disableNonEditables();

        offset.end = (offset.end === undefined) ? offset.start : offset.end;

        this._setOffset(node, offset.start, offset.end);
        if (isEditor) this.editor.enableNonEditables();
    },

    // private
    _setOffset: function(el, start, end)
    {
        var charIndex = 0;
        var range = document.createRange();

        range.setStart(el, 0);
        range.collapse(true);
        var nodeStack = [el], node, foundStart = false, stop = false;

        while (!stop && (node = nodeStack.pop()))
        {
            if (node.nodeType === 3)
            {
                var nextCharIndex = charIndex + node.length;
                if (!foundStart && start >= charIndex && start <= nextCharIndex)
                {
                    range.setStart(node, start - charIndex);
                    foundStart = true;
                }

                if (foundStart && end >= charIndex && end <= nextCharIndex)
                {
                    range.setEnd(node, end - charIndex);
                    stop = true;
                }

                charIndex = nextCharIndex;

            }
            else
            {
                var i = node.childNodes.length;
                while (i--)
                {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        this.selection.setRange(range);
    },
    _getOffset: function(el)
    {
        var offset = false;

        var doc = el.ownerDocument || el.document;
        var win = doc.defaultView || doc.parentWindow;
        var sel = win.getSelection();
        if (sel.rangeCount > 0)
        {
            var range = win.getSelection().getRangeAt(0);
            var selected = range.toString().length;

            var clonedRange = range.cloneRange();
            clonedRange.selectNodeContents(el);
            clonedRange.setEnd(range.endContainer, range.endOffset);

            var end = clonedRange.toString().length;

            offset = {
                start: end - selected,
                end: end
            };
        }

        return offset;
    },
    _getTrimmedOffset: function(el, isEditor, length)
    {
        var startOffset = 0;
        var doc = el.ownerDocument || el.document;
        var win = doc.defaultView || doc.parentWindow;
        var sel = win.getSelection();
        var range = win.getSelection().getRangeAt(0);
        var selected = range.toString().length;

        var clonedRange = range.cloneRange();
        clonedRange.selectNodeContents(el);
        if (length !== true) clonedRange.setEnd(range.endContainer, range.endOffset);
        startOffset = clonedRange.toString().replace(/[\u200B-\u200D\uFEFF]/g, '').length;

        var treeWalker = this._getOffsetWalker(range, selected, el, length);
        var charCount = 0;
        while (treeWalker.nextNode())
        {
            charCount++;
        }

        if (!isEditor && length && charCount > 0)
        {
            charCount--;
        }

        var start = startOffset + charCount;
        if (length)
        {
            return start;
        }
        else
        {
            return {
                start: start - selected,
                end: start
            };
        }
    },
    _getOffsetWalker: function(range, selected, el, length)
    {
        var tags = ['br', 'hr', 'img', 'iframe', 'source', 'embed', 'input', 'param', 'track'];
        var walker = document.createTreeWalker(
            el,
            NodeFilter.SHOW_ALL,
            function(node)
            {
                var nodeRange = document.createRange();
                nodeRange.selectNode(node);

                if (node.nodeType !== 3 && (selected === 0 && tags.indexOf(node.tagName.toLowerCase()) !== -1))
                {
                    if (length)
                    {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    else
                    {
                        return nodeRange.compareBoundaryPoints(Range.END_TO_END, range) < 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                    }
                }
                else
                {
                    return NodeFilter.FILTER_REJECT;
                }
            },
            false
        );

        return walker;
    }
});
$R.add('service', 'inspector', {
    init: function(app)
    {
        this.app = app;
    },
    // parse
    parse: function(el)
    {
        return $R.create('inspector.parser', this.app, this, el);
    },

    // text detection
    isText: function(el)
    {
        if (typeof el === 'string' && !/^\s*<(\w+|!)[^>]*>/.test(el))
        {
            return true;
        }

        var node = $R.dom(el).get();
        return (node && node.nodeType === 3); //  && !this.selection.getBlock(el)
    },

    // tag detection
    isInlineTag: function(tag, extend)
    {
        var tags = this._extendTags(this.opts.inlineTags, extend);

        return (this._isTag(tag) && tags.indexOf(tag.toLowerCase()) !== -1);
    },
    isBlockTag: function(tag, extend)
    {
        var tags = this._extendTags(this.opts.blockTags, extend);

        return (this._isTag(tag) && tags.indexOf(tag.toLowerCase()) !== -1);
    },
    isTableCellTag: function(tag)
    {
        return (['td', 'th'].indexOf(tag.toLowerCase()) !== -1);
    },
    isHeadingTag: function(tag)
    {
        return (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].indexOf(tag.toLowerCase()) !== -1);
    },


    _isTag: function(tag)
    {
        return (tag !== undefined && tag);
    },
    _extendTags: function(tags, extend)
    {
        tags = tags.concat(tags);

        if (extend)
        {
            for (var i = 0 ; i < extend.length; i++)
            {
                tags.push(extend[i]);
            }
        }

        return tags;
    }
});
$R.add('class', 'inspector.parser', {
    init: function(app, inspector, el)
    {
        this.app = app;
        this.uuid = app.uuid;
        this.opts = app.opts;
        this.utils = app.utils;
        this.editor = app.editor;
        this.selection = app.selection;
        this.inspector = inspector;

        // local
        this.el = el;
        this.$el = $R.dom(this.el);
        this.node = this.$el.get();
        this.$component = this.$el.closest('.redactor-component');
    },
    // is
    isEditor: function()
    {
        return (this.node === this.editor.getElement().get());
    },
    isInEditor: function()
    {
        return (this.$el.parents('.redactor-in-' + this.uuid).length !== 0);
    },
    isComponent: function()
    {
        return (this.$component.length !== 0)
    },
    isComponentType: function(type)
    {
        return (this.getComponentType() === type);
    },
    isComponentActive: function()
    {
        return (this.isComponent() && this.$component.hasClass('redactor-component-active'));
    },
    isComponentEditable: function()
    {
        var types = ['code', 'table'];
        var type = this.getComponentType();

        return (this.isComponent() && types.indexOf(type) !== -1);
    },
    isFigcaption: function()
    {
        return this.getFigcaption();
    },
    isPre: function()
    {
        return this.getPre();
    },
    isCode: function()
    {
        var $code = this.$el.closest('code');
        var $parent = $code.parent('pre');

        return ($code.length !== 0 && $parent.length === 0)
    },
    isList: function()
    {
        return this.getList();
    },
    isFirstListItem: function()
    {
        return this._getLastOrFirstListItem('first');
    },
    isLastListItem: function()
    {
        return this._getLastOrFirstListItem('last');
    },
    isFirstTableCell: function()
    {
        return this._getLastOrFirstTableCell('first');
    },
    isLastTableCell: function()
    {
        return this._getLastOrFirstTableCell('last');
    },
    isTable: function()
    {
        return (this.isComponentType('table') || this.getTable());
    },
    isHeading: function()
    {
        return this.getHeading();
    },
    isBlockquote: function()
    {
        return this.getBlockquote();
    },
    isDl: function()
    {
        return this.getDl();
    },
    isParagraph: function()
    {
        return this.getParagraph();
    },
    isLink: function()
    {
        return this.getLink();
    },
    isFile: function()
    {
        return this.getFile();
    },
    isText: function()
    {
        return this.inspector.isText(this.el);
    },
    isInline: function()
    {
        var tags = this.opts.inlineTags;

        return (this.isElement()) ? (tags.indexOf(this.node.tagName.toLowerCase()) !== -1) : false;
    },
    isBlock: function()
    {
        var tags = this.opts.blockTags;

        return (this.isElement()) ? (tags.indexOf(this.node.tagName.toLowerCase()) !== -1) : false;
    },
    isElement: function()
    {
        return (this.node && this.node.nodeType && this.node.nodeType !== 3);
    },

    // has
    hasParent: function(tags)
    {
        return (this.$el.closest(tags.join(',')).length !== 0);
    },

    // get
    getNode: function()
    {
        return this.node;
    },
    getTag: function()
    {
        return (this.isElement()) ? this.node.tagName.toLowerCase() : false;
    },
    getComponent: function()
    {
        return (this.isComponent()) ? this.$component.get() : false;
    },
    getComponentType: function()
    {
        return (this.isComponent()) ? this.$component.attr('data-redactor-type') : false;
    },
    getFirstNode: function()
    {
        return this.utils.getFirstNode(this.node);
    },
    getLastNode: function()
    {
        return this.utils.getLastNode(this.node);
    },
    getFirstElement: function()
    {
        return this.utils.getFirstElement(this.node);
    },
    getLastElement: function()
    {
        return this.utils.getLastElement(this.node);
    },
    getFigcaption: function()
    {
        return this._getClosestNode('figcaption');
    },
    getPre: function()
    {
        return this._getClosestNode('pre');
    },
    getCode: function()
    {
        return this._getClosestNode('code');
    },
    getList: function()
    {
        return this._getClosestNode('ul, ol');
    },
    getListItem: function()
    {
        return this._getClosestNode('li');
    },
    getTable: function()
    {
        if (this.getComponentType('table'))
        {
            return this.$component.find('table').get();
        }
        else
        {
            return this._getClosestNode('table');
        }
    },
    getTableCell: function()
    {
        var $td = this.$el.closest('td, th');

        return ($td.length !== 0) ? $td.get() : false;
    },
    getComponentCodeElement: function()
    {
        return (this.isComponentType('code')) ? this.$component.find('pre code, pre').last().get() : false;
    },
    getImageElement: function()
    {
        return (this.isComponentType('image')) ? this.$component.find('img').get() : false;
    },
    getParagraph: function()
    {
        return this._getClosestNode('p');
    },
    getHeading: function()
    {
        return this._getClosestNode('h1, h2, h3, h4, h5, h6');
    },
    getDl: function()
    {
        return this._getClosestNode('dl');
    },
    getBlockquote: function()
    {
        return this._getClosestNode('blockquote');
    },
    getLink: function()
    {
        var isComponent = this.isComponent();
        var isTable = this.isComponentType('table');

        if (isTable || !isComponent)
        {
            var $el = this._getClosestElement('a');

            return ($el && !$el.attr('data-file')) ? $el.get() : false;
        }

        return false;
    },
    getFile: function()
    {
        var isComponent = this.isComponent();
        var isTable = this.isComponentType('table');

        if (isTable || !isComponent)
        {
            var $el = this._getClosestElement('a');

            return ($el && $el.attr('data-file')) ? $el.get() : false;
        }

        return false;
    },

    // find
    findFirstNode: function(selector)
    {
        return this.$el.find(selector).first().get();
    },
    findLastNode: function(selector)
    {
        return this.$el.find(selector).last().get();
    },

    // private
    _getLastOrFirstListItem: function(type)
    {
        var list = this.getList();
        var tag = this.getTag();
        if (list && tag === 'li')
        {
            var item = $R.dom(list).find('li')[type]().get();
            if (item && this.node === item)
            {
                return true;
            }
        }

        return false;
    },
    _getLastOrFirstTableCell: function(type)
    {
        var table = this.getTable();
        var tag = this.getTag();
        if (table && (tag === 'td' || tag === 'th'))
        {
            var item = $R.dom(table).find('td, th')[type]().get();
            if (item && this.node === item)
            {
                return true;
            }
        }

        return false;
    },
    _getClosestNode: function(selector)
    {
        var $el = this.$el.closest(selector);

        return ($el.length !== 0) ? $el.get() : false;
    },
    _getClosestElement: function(selector)
    {
        var $el = this.$el.closest(selector);

        return ($el.length !== 0) ? $el : false;
    }
});
$R.add('service', 'marker', {
    init: function(app)
    {
        this.app = app;
    },
    build: function(pos)
	{
		var marker = document.createElement('span');

		marker.id = 'selection-marker-' + this._getPos(pos);
		marker.className = 'redactor-selection-marker';
		marker.innerHTML = this.opts.invisibleSpace;

		return marker;
	},
	buildHtml: function(pos)
	{
		return this.build(pos).outerHTML;
	},
	insert: function()
	{
    	if (this.selection.isAll())
    	{
        	var $editor = this.editor.getElement();

            $editor.prepend(this.build('start'));
            $editor.append(this.build('end'));
    	}
    	else
    	{
        	this.editor.focus();

    		return (this.selection.isCollapsed()) ? this.insertStart() : this.insertBoth();
    	}
	},
	insertStart: function()
	{
		var range = this.selection.getRange();
        if (range)
        {
            var start = this.build('start');
            var startNode = range.startContainer, startOffset = range.startOffset;
            var cloned = range.cloneRange();
            cloned.setStart(startNode, startOffset);
            cloned.collapse(true);
            cloned.insertNode(start);

            return start;
        }
	},
	insertEnd: function()
	{
		var range = this.selection.getRange();
        if (range)
        {
            var end = this.build('end');
            var cloned = range.cloneRange();
            cloned.collapse(false);
            cloned.insertNode(end);

            return end;
        }
	},
	insertBoth: function()
	{
    	var range = this.selection.getRange();
    	if (range)
    	{
        	var start = this.build('start');
            var end = this.build('end');
            var startNode = range.startContainer, startOffset = range.startOffset;

            var cloned = range.cloneRange();
            cloned.collapse(false);
            cloned.insertNode(end);
            cloned.setStart(startNode, startOffset);
            cloned.collapse(true);
            cloned.insertNode(start);
        }
	},
    find: function(pos, $context)
    {
        var $editor = this.editor.getElement();
        var $marker = ($context || $editor).find('span#selection-marker-' + this._getPos(pos));

		return ($marker.length !== 0) ? $marker.get() : false;
    },
    remove: function()
    {
        var start = this.find('start');
        var end = this.find('end');

        if (start) start.parentNode.removeChild(start);
        if (end) end.parentNode.removeChild(end);

        if (start || end)
        {
            var el = this.selection.getElement();
            this.utils.normalizeTextNodes(el);
        }
    },

    // private
    _getPos: function(pos)
    {
        return (pos === undefined) ? 'start' : pos;
    }
});
$R.add('service', 'component', {
    init: function(app)
    {
        this.app = app;

        // local
        this.activeClass = 'redactor-component-active';
    },
    create: function(type, el)
    {
        return $R.create(type + '.component', this.app, el);
    },
    build: function(el)
    {
        var $el = $R.dom(el);
        var component;
        var type = $el.attr('data-redactor-type');
        if (type)
        {
            component = this.create(type, el);
        }

        return (component) ? component : el;
    },
    remove: function(el, caret)
    {
        var $component = $R.dom(el).closest('.redactor-component');
        var type = $component.attr('data-redactor-type');
        var prev = this._findSiblings($component, 'previousSibling');
        var next = this._findSiblings($component, 'nextSibling');

        var stop = this.app.broadcast(type + '.delete', $component);
        if (stop !== false)
        {
            $component.remove();

            // callback
            this.app.broadcast(type + '.deleted', $component);
            this.app.broadcast('contextbar.close');
            this.app.broadcast('imageresizer.stop');

            if (caret !== false)
            {
                if (next) this.caret.setStart(next);
                else if (prev) this.caret.setEnd(prev);
                else
                {
                    this.editor.startFocus();
                }
            }
        }
    },
    isActive: function(el)
    {
        var $component;
        if (el)
        {
            $component = $R.dom(el);

            return $component.hasClass(this.activeClass);
        }
        else
        {
            $component = this._find();

            return ($component.length !== 0)
        }
    },
    getActive: function()
    {
        var $component = this._find();

        return ($component.length !== 0) ? $component.get() : false;
    },
    setActive: function(el)
    {
        this.clearActive();
        this.editor.focus();

        var data = this.inspector.parse(el);
        var component = data.getComponent();
        var $component = $R.dom(component);

        if (!data.isFigcaption())
        {
            var $caret = $component.find('.redactor-component-caret');
            if ($caret.length === 0)
            {
                $caret = this._buildCaret();
                $component.prepend($caret);
            }

            this.caret.setAtStart($caret.get());
        }

        $component.addClass(this.activeClass);
    },
    clearActive: function()
    {
        this._find().removeClass(this.activeClass);
    },
    setOnEvent: function(e, contextmenu)
    {
        this.clearActive();

        var data = this.inspector.parse(e.target);
        if (data.isFigcaption() || data.isComponentEditable())
        {
            return;
        }

        // component
        if (data.isComponent())
        {
            this.setActive(e.target);
            if (contextmenu !== true) e.preventDefault();
        }
    },
    executeScripts: function()
    {
        var $editor = this.editor.getElement();
        var scripts = $editor.find('[data-redactor-type]').find("script").getAll();

        for (var i = 0; i < scripts.length; i++)
        {
            if (scripts[i].src != "")
            {
                var src = scripts[i].src;
                this.$doc.find('head script[src="' + src + '"]').remove();

                var tag = document.createElement("script");
                tag.src = src;
                document.getElementsByTagName("head")[0].appendChild(tag);
            }
            else
            {
                eval(scripts[i].innerHTML);
            }
        }
    },

    // private
    _find: function()
    {
        return this.editor.getElement().find('.' + this.activeClass);
    },
    _findSiblings: function($component, type)
    {
        var node = $component.get();
        while (node = node[type])
        {
            var isEmpty = false;
            if (node.nodeType === 3 && !this.opts.breakline)
            {
                isEmpty = (node.textContent.trim() === '');
            }

            if (!isEmpty && node.tagName !== 'BR') return node;
        }
    },
    _buildCaret: function()
    {
        var $caret = $R.dom('<span>');
        $caret.addClass('redactor-component-caret');
        $caret.attr('contenteditable', true);

        return $caret;
    }
});
$R.add('service', 'insertion', {
    init: function(app)
    {
        this.app = app;
    },
    set: function(html, clean)
    {
        html = (clean !== false) ? this.cleaner.input(html) : html;
        html = (clean !== false) ? this.cleaner.paragraphize(html) : html;

        // set html
        var $editor = this.editor.getElement();
        $editor.html(html);

        // set focus at the end
        this.editor.endFocus();

        return html;
    },
    insertNode: function(node, caret)
    {
        this.editor.focus();
        var fragment = (this.utils.isFragment(node)) ? node : this.utils.createFragment(node);

        this._collapseSelection();
        this._insertFragment(fragment);
        this._setCaret(caret, fragment);

        return this._sendNodes(fragment.nodes);
    },
    insertBreakLine: function()
    {
        return this.insertNode(document.createElement('br'), 'after');
    },
    insertNewline: function()
    {
        return this.insertNode(document.createTextNode('\n'), 'after');
    },
    insertText: function(text)
    {
        return this.insertHtml(this.cleaner.getFlatText(text));
    },
    insertChar: function(charhtml)
    {
        return this.insertNode(charhtml, 'after');
    },
    insertRaw: function(html)
    {
        return this.insertHtml(html, false);
    },
    insertToPoint: function(e, html)
    {
        var range;
        var marker = this.marker.build('start');
        var markerInserted = false;
		var x = e.clientX, y = e.clientY;

		if (document.caretPositionFromPoint)
		{
		    var pos = document.caretPositionFromPoint(x, y);
		    var sel = document.getSelection();

		    var data = this.inspector.parse(pos.offsetNode);
		    if (data.isInEditor())
            {
    		    range = sel.getRangeAt(0);
    		    range.setStart(pos.offsetNode, pos.offset);
    		    range.collapse(true);
    		    range.insertNode(marker);
    		    markerInserted = true;
            }
		}
		else if (document.caretRangeFromPoint)
		{
		    range = document.caretRangeFromPoint(x, y);

            var data = this.inspector.parse(range.startContainer)
            if (data.isInEditor())
            {
                range.insertNode(marker);
                markerInserted = true;
            }
		}

        if (markerInserted)
        {
            this.component.clearActive();
	    	this.selection.restoreMarkers();

    		return this.insertHtml(html);
		}

		return [];
    },
    insertToOffset: function(start, html)
    {
        this.offset.set({ start: start, end: start });

        return this.insertHtml(html);
    },
    insertHtml: function(html, clean)
    {
        if (!this.opts.input) return;

        // parse
        var parsedInput = this.utils.parseHtml(html);

        // all selection
        if (this.selection.isAll())
        {
            return this._insertToAllSelected(parsedInput);
        }

        // environment
        var isCollapsed = this.selection.isCollapsed();
        var isText = this.selection.isText();
        var current = this._getCurrent();
        var dataCurrent = this.inspector.parse(current);

        // collapse air
        this._collapseSelection();

        // clean
        parsedInput = this._getCleanedInput(parsedInput, dataCurrent, clean);

        // input is figure or component span
        var isFigure = this._isFigure(parsedInput.html);
        var isComponentSpan = this._isComponentSpan(parsedInput.html)
        var isInsertedText = this.inspector.isText(parsedInput.html);

        // empty editor
        if (this.editor.isEmpty())
        {
            return this._insertToEmptyEditor(parsedInput.html);
        }
        // to component
        else if (dataCurrent.isComponent() && !dataCurrent.isComponentEditable())
        {
            return this._insertToWidget(current, dataCurrent, parsedInput.html);
        }
        // component span
        else if (isComponentSpan)
        {
            return this.insertNode(parsedInput.nodes, 'end');
        }
        // inserting figure & split node
        else if (isFigure && !isText && !dataCurrent.isList())
        {
            if (dataCurrent.isInline())
            {
                return this._insertToInline(current, parsedInput);
            }

            var fragment = this.utils.createFragment(parsedInput.html);

            this._splitNode(current, fragment);
            this.caret.setEnd(fragment.last);

            return this._sendNodes(fragment.nodes);
        }
        // to code
        else if (dataCurrent.isCode())
        {
            return this._insertToCode(parsedInput, current, clean);
        }
        // to pre
        else if (dataCurrent.isPre())
        {
            return this._insertToPre(parsedInput, clean);
        }
        // to h1-h6 & figcaption
        else if (dataCurrent.isHeading() || dataCurrent.isFigcaption())
        {
            parsedInput.html = (clean !== false) ? this.cleaner.removeTagsExcept(parsedInput.html, ['a']) : parsedInput.html;
            parsedInput.html = (clean !== false) ? this.cleaner.replaceNbspToSpaces(parsedInput.html) : parsedInput.html;

            var fragment = this.utils.createFragment(parsedInput.html);

            return this.insertNode(fragment, 'end');
        }
        // text inserting
        else if (isInsertedText)
        {
            if (!isText && this.opts.markup !== 'br' && this._hasBlocksAndImages(parsedInput.nodes))
            {
                parsedInput.html = (clean !== false) ? this.cleaner.paragraphize(parsedInput.html) : parsedInput.html;

                var fragment = this.utils.createFragment(parsedInput.html);

                this._splitNode(current, fragment);
                this.caret.setEnd(fragment.last);

                return this._sendNodes(fragment.nodes);
            }

            return this.insertNode(parsedInput.nodes, 'end');
        }
        // uncollapsed
        else if (!isCollapsed && !isFigure)
        {
            parsedInput.html = (clean !== false) ? this.cleaner.paragraphize(parsedInput.html) : parsedInput.html;

            var fragment = this.utils.createFragment(parsedInput.html);

            return this.insertNode(fragment, 'end');
        }
        // to inline tag
        else if (dataCurrent.isInline() && !this._isPlainHtml(parsedInput.html))
        {
            return this._insertToInline(current, parsedInput);
        }
        // to blockquote or dt, dd
        else if (dataCurrent.isBlockquote() || dataCurrent.isDl())
        {
            var except = this.opts.inlineTags;
            except.concat(['br']);

            parsedInput.html = (clean !== false) ? this.cleaner.replaceBlocksToBr(parsedInput.html) : parsedInput.html;
            parsedInput.html = (clean !== false) ? this.cleaner.removeTagsExcept(parsedInput.html, except) : parsedInput.html;

            var fragment = this.utils.createFragment(parsedInput.html);

            return this.insertNode(fragment, 'end');
        }
        // to p
        else if (dataCurrent.isParagraph())
        {
            if (this._isPlainHtml(parsedInput.html))
            {
                return this.insertNode(parsedInput.nodes, 'end');
            }

            parsedInput.html = (clean !== false) ? this.cleaner.paragraphize(parsedInput.html) : parsedInput.html;

            var fragment = this.utils.createFragment(parsedInput.html);

            this._splitNode(current, fragment);
            this.caret.setEnd(fragment.last);

            return this._sendNodes(fragment.nodes);
        }
        // to li
        else if (dataCurrent.isList())
        {
            var except = this.opts.inlineTags;
            except = except.concat(['br', 'li', 'ul', 'ol', 'img']);

            parsedInput.html = (clean !== false) ? this.cleaner.replaceBlocksToBr(parsedInput.html) : parsedInput.html;
            parsedInput.html = (clean !== false) ? this.cleaner.removeTagsExcept(parsedInput.html, except) : parsedInput.html;
            parsedInput.html = (clean !== false) ? this.cleaner.removeBrAtEnd(parsedInput.html) : parsedInput.html;

            var fragment = this.utils.createFragment(parsedInput.html);
            data.nodes = fragment.nodes;

            if (this._containsTags(parsedInput.html, ['ul', 'ol', 'li']))
            {
                var element = this.selection.getElement(current);
                if (element && element.tagName === 'LI' && this.caret.isStart(element))
                {
                    parsedInput.nodes = $R.dom(fragment.nodes).unwrap('ul, ol').getAll();
                    $R.dom(element).before(parsedInput.nodes);

                    var lastNode = parsedInput.nodes[parsedInput.nodes.length-1];
                    this.caret.setEnd(lastNode);

                    return this._sendNodes(parsedInput.nodes);
                }
                else if (this._isPlainHtml(parsedInput.html))
                {
                    return this.insertNode(fragment, 'end');
                }
                else
                {
                    fragment = this._buildList(parsedInput, element, fragment);

                    this._splitNode(current, fragment, true);
                    this.caret.setEnd(fragment.last);

                    return this._sendNodes(fragment.nodes);
                }
            }
        }

        // other cases
        return this.insertNode(parsedInput.nodes, 'end');
    },

    // private
    _insertToAllSelected: function(parsedInput)
    {
        var insertedHtml = this.set(parsedInput.html);
        var dataInserted = this.utils.parseHtml(insertedHtml);

        return this._sendNodes(dataInserted.nodes);
    },
    _insertToEmptyEditor: function(html)
    {
        html = this.cleaner.paragraphize(html);

        var fragment = this.utils.createFragment(html);
        var $editor = this.editor.getElement();

        $editor.html('');
        $editor.append(fragment.frag);

        this.caret.setEnd(fragment.last);

        return this._sendNodes(fragment.nodes);
    },
    _insertToInline: function(current, parsedInput)
    {
        var fragment = this.utils.createFragment(parsedInput.html);
        this._splitNode(current, fragment, false, true);
        this.caret.setEnd(fragment.last);

        return this._sendNodes(fragment.nodes);
    },
    _insertToCode: function(parsedInput, current, clean)
    {
        parsedInput.html = (clean !== false) ? this.cleaner.encodeHtml(parsedInput.html) : parsedInput.html;
        parsedInput.html = (clean !== false) ? this.cleaner.removeNl(parsedInput.html) : parsedInput.html;

        var fragment = this.utils.createFragment(parsedInput.html);
        var nodes = this.insertNode(fragment, 'end');

        this.utils.normalizeTextNodes(current);

        return nodes;
    },
    _insertToPre: function(parsedInput, clean)
    {
        parsedInput.html = (clean !== false) ? this.cleaner.encodeHtml(parsedInput.html) : parsedInput.html;

        var fragment = this.utils.createFragment(parsedInput.html);

        return this.insertNode(fragment, 'end');
    },
    _insertToWidget: function(current, dataCurrent, html)
    {
        html = (this._isComponentSpan(html)) ? html : this.cleaner.paragraphize(html);

        var fragment = this.utils.createFragment(html);
        var component = dataCurrent.getComponent();
        var $component = $R.dom(component);

        $component.after(fragment.frag);
        $component.remove();

        this.caret.setEnd(fragment.last);

        return this._sendNodes(fragment.nodes);
    },
    _insertFragment: function(fragment)
    {
        var range = this.selection.getRange();
        if (range)
        {
            range.deleteContents();
            range.insertNode(fragment.frag);
        }
    },
    _sendNodes: function(nodes)
    {
        for (var i = 0; i < nodes.length; i++)
        {
            var el = nodes[i];
            var type = (el.nodeType !== 3) ? el.getAttribute('data-redactor-type') : false;
            if (type)
            {
                this.app.broadcast(type + '.inserted', this.component.build(el));
            }
        }

        // callback
        this.app.broadcast('inserted', nodes);

        // widget's scripts
        this.component.executeScripts();

        return nodes;
    },
    _splitNode: function(current, nodes, isList, inline)
    {
        nodes = (this.utils.isFragment(nodes)) ? nodes.frag : nodes;

        var element = (inline) ? this.selection.getInline(current) : this.selection.getBlock(current);
        var $element = $R.dom(element);

        // replace is empty
        if (!inline && this.utils.isEmptyHtml(element.innerHTML))
        {
            $element.after(nodes);
            $element.remove();

            return nodes;
        }

        var tag = $element.get().tagName.toLowerCase();
        var isEnd = this.caret.isEnd(element);
        var isStart = this.caret.isStart(element);

        if (!isEnd && !isStart)
        {
            var extractedContent = this._extractHtmlFromCaret(inline);

            var $secondPart = $R.dom('<' + tag + ' />');
            $secondPart = this.utils.cloneAttributes(element, $secondPart);

            $element.after($secondPart.append(extractedContent));
        }

        if (isStart)
        {
            return $element.before(nodes);
        }
        else
        {
            if (isList)
            {
                return $element.append(nodes);
            }
            else
            {
                nodes = $element.after(nodes);

                var html = $element.html();
                html = html.replace(/[\u200B-\u200D\uFEFF]/g, '');
                html = html.replace(/&nbsp;/gi, '');

                if (html === '') $element.remove();

                return nodes;
            }
        }
    },
    _extractHtmlFromCaret: function(inline, element)
    {
        var range = this.selection.getRange();
        if (range)
        {
            element = (element) ? element : ((inline) ? this.selection.getInline() : this.selection.getBlock());
            if (element)
            {
                var clonedRange = range.cloneRange();
                clonedRange.selectNodeContents(element);
                clonedRange.setStart(range.endContainer, range.endOffset);

                return clonedRange.extractContents();
            }
        }
    },
    _setCaret: function(caret, fragment)
    {
        var isLastInline = this._isLastInline(fragment);

        if (caret)
        {
            caret = (isLastInline && caret === 'end') ? 'after' : caret;
            this.caret['set' + this.utils.ucfirst(caret)](fragment.last);
        }
        else if (caret !== false)
        {
            if (isLastInline) this.caret.setAfter(fragment.last);
        }
    },
    _isLastInline: function(fragment)
    {
        if (fragment.last)
        {
            var data = this.inspector.parse(fragment.last);

            return data.isInline();
        }

        return false;
    },
    _getCleanedInput: function(parsedInput, dataCurrent, clean)
    {
        var isPreformatted = (dataCurrent.isCode() || dataCurrent.isPre());

        parsedInput.html = (!isPreformatted && clean !== false) ? this.cleaner.input(parsedInput.html) : parsedInput.html;
        parsedInput = (!isPreformatted && clean !== false) ? this.utils.parseHtml(parsedInput.html) : parsedInput;

        return parsedInput;
    },
    _getCurrent: function()
    {
        var current = this.selection.getCurrent();
        if (!current)
        {
            this.editor.startFocus();
            current = this.selection.getCurrent();
        }

        return current;
    },
    _getContainer: function(nodes)
    {
        return $R.dom(this.utils.createTmpContainer(nodes));
    },
    _buildList: function(parsedInput, list, fragment)
    {
        var nodes = parsedInput.nodes;
        var first = nodes[0];

        if (first && first.nodeType !== 3 && first.tagName === 'li')
        {
            var $parent = $R.dom(list);
            var parentListTag = $parent.get().tagName.toLowerCase();
            var $list = $R.dom('<' + parentListTag + ' />');
            $list.append(fragment.nodes);

            return this.utils.createFragment($list.get().outerHTML);
        }

        return fragment;
    },
    _containsTags: function(html, tags)
    {
        return (this._getContainer(html).find(tags.join(',')).length !== 0);
    },
    _collapseSelection: function()
    {
        //if (this.app.isAirToolbar()) this.selection.collapseToEnd();
    },
    _hasFigureOrTable: function(nodes)
    {
        return (this._getContainer(nodes).find('figure, table').length !== 0);
    },
    _hasBlocks: function(nodes)
    {
        return (this._getContainer(nodes).find(this.opts.blockTags.join(',')).length !== 0);
    },
    _hasBlocksAndImages: function(nodes)
    {
        return (this._getContainer(nodes).find(this.opts.blockTags.join(',') + ',img').length !== 0);
    },
    _isPlainHtml: function(html)
    {
        return (this._getContainer(html).find(this.opts.blockTags.join(',') + ', img').length === 0);
    },
    _isFigure: function(html)
    {
        if (this._isHtmlString(html))
        {
            return ($R.dom(html).closest('figure').length !== 0);
        }
    },
    _isComponentSpan: function(html)
    {
        if (this._isHtmlString(html))
        {
            return ($R.dom(html).closest('span.redactor-component').length !== 0);
        }
    },
    _isHtmlString: function(html)
    {
        return !(typeof html === 'string' && !/^\s*<(\w+|!)[^>]*>/.test(html));
    }
});
$R.add('service', 'block', {
    mixins: ['formatter'],
    init: function(app)
    {
        this.app = app;
    },
    // public
    format: function(args)
    {
        // type of applying styles and attributes
        this.type = (args.type) ? args.type : 'set'; // add, remove, toggle

        // tag
        this.tag = (typeof args === 'string') ? args : args.tag;
        this.tag = this._prepareTag(this.tag);
        this.tag = this.tag.toLowerCase();

        if (typeof args === 'string') this.args = false;
        else this.buildArgs(args);

        // format
        var nodes = this._format();

        return nodes;
    },
    getBlocks: function(tags)
    {
        if (tags)
        {
            return this.selection.getBlocks({ tags: tags, first: true, cells: true });
        }
        else
        {
            return this.selection.getBlocksAndTextNodes({ tags: this._getTags(), first: true, cells: true, wrap: true });
        }
    },
    getElements: function(tags, clear)
    {
        blocks = (clear) ? this.selection.getBlocks({ tags: tags || this._getTags(), first: true, cells: true }) : this.getBlocks(tags);

        return $R.dom(blocks);
    },
    clearFormat: function(tags)
	{
		this.selection.save();

        var $elements = this.getElements(tags || this._getTags());
        $elements.each(function(node)
        {
            while(node.attributes.length > 0)
            {
                node.removeAttribute(node.attributes[0].name);
            }
        });

		this.selection.restore();

        return $elements.getAll();

	},

    // private
    _format: function()
    {
        this.selection.save();
        var blocks = this.getBlocks();
        var nodes = [];
        if (blocks.length > 0)
        {
            nodes = this._replaceBlocks(blocks);

            // clean & appliyng styles and attributes
            nodes = this.applyArgs(nodes, false);
            nodes = this._combinePre(nodes);
            nodes = this._cleanBlocks(nodes);

        }

        setTimeout(function() { this.selection.restore(); }.bind(this), 0);

        return nodes;
    },
    _prepareTag: function(tag)
    {
        if (typeof tag === 'undefined')
        {
            tag = (this.opts.breakline) ? 'div' : this.opts.markup;
        }

        return tag;
    },
    _getTags: function()
    {
        return ['div', 'p', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    },
    _replaceBlocks: function(blocks)
    {
        var nodes = [];
        var type = (this._isToggleFormatType(blocks)) ? 'toggle' : 'set';

        if (this.opts.markup === 'br')
        {
            for (var i = 0; i < blocks.length; i++)
            {
                blocks[i] = this._clearWrapperClass(blocks[i]);

                var $node;
                if (type === 'toggle' || this.tag === 'p')
                {
                    var br = document.createElement('br');

                    $node = $R.dom(blocks[i]);
                    $node.append(br);
                    $node.unwrap();
                }
                else
                {
                    $node = this.utils.replaceToTag(blocks[i], this.tag);
                    nodes.push($node.get());
                }
            }
        }
        else
        {
            var replacedTag = (type === 'toggle') ? this.opts.markup : this.tag;
            for (var i = 0; i < blocks.length; i++)
            {
                blocks[i] = this._clearWrapperClass(blocks[i]);
                var $node = this.utils.replaceToTag(blocks[i], replacedTag);

                nodes.push($node.get());
            }
        }

        return nodes;
    },
    _isToggleFormatType: function(blocks)
    {
        var count = 0;
        var len = blocks.length;
        for (var i = 0; i < len; i++)
        {
            if (blocks[i] && this.tag === blocks[i].tagName.toLowerCase()) count++;
        }

        return (count === len);
    },
    _combinePre: function(nodes)
    {
        var combinedNodes = [];
        for (var i = 0; i < nodes.length; i++)
        {
            var next = nodes[i].nextElementSibling;
            if (next && nodes[i].tagName === 'PRE' && next.tagName === 'PRE')
            {
                var $current = $R.dom(nodes[i]);
                var $next = $R.dom(next);
                var newline = document.createTextNode('\n');

                $current.append(newline);
                $current.append($next);
                $next.unwrap('pre');
            }

            combinedNodes.push(nodes[i]);
        }

        return combinedNodes;
    },
    _cleanBlocks: function(nodes)
    {
        var headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        var tags = this.opts.inlineTags;
        for (var i = 0; i < nodes.length; i++)
        {
            var tag = nodes[i].tagName.toLowerCase();
            var $node = $R.dom(nodes[i]);

            if (headings.indexOf(tag) !== - 1)
            {
                $node.find('span').not('.redactor-component, .non-editable, .redactor-selection-marker').unwrap();
            }
            else if (tag === 'pre')
            {
                $node.find(tags.join(',')).not('.redactor-selection-marker').unwrap();
            }

            this.utils.normalizeTextNodes(nodes[i]);
        }

        return nodes;
    }
});
$R.add('service', 'inline', {
    mixins: ['formatter'],
    init: function(app)
    {
        this.app = app;
    },
    // public
    format: function(args)
    {
        if (!this._isFormat()) return [];

        // type of applying styles and attributes
        this.type = (args.type) ? args.type : 'set'; // add, remove, toggle

        // tag
        this.tag = (typeof args === 'string') ? args : args.tag;
        this.tag = this.tag.toLowerCase();
        this.tag = this.arrangeTag(this.tag);

        if (typeof args === 'string') this.args = false;
        else this.buildArgs(args);

        // format
        var nodes = (this.selection.isCollapsed()) ? this.formatCollapsed() : this.formatUncollapsed();

        return nodes;
    },

    // private
    _isFormat: function()
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var isComponent = (data.isComponent() && !data.isComponentType('table'));

        if (!current || data.isPre() || data.isCode() || data.isFigcaption() || isComponent)
        {
            return false;
        }

        return true;
    },
    arrangeTag: function(tag)
	{
        var replaced = this.opts.replaceTags;
		for (var key in replaced)
		{
			if (tag === key) tag = replaced[key];
		}

		return tag;
	},
    formatCollapsed: function()
    {
        var nodes = [];
        var inline = this.selection.getInlineFirst();
        var inlines = this.selection.getInlines({ all: true });
        var $inline = $R.dom(inline);

        // 1) not inline
        if (!inline)
        {
            nodes = this.insertInline(nodes);
        }
        else
        {
            var dataInline = this.inspector.parse(inline);
            var isEmpty = this.utils.isEmptyHtml(inline.innerHTML);

            // 2) inline is empty
            if (isEmpty)
            {
                // 2.1) has same tag
                if (inline.tagName.toLowerCase() === this.tag)
                {
                    // 2.1.1) has same args or hasn't args
                    if (this.hasSameArgs(inline))
                    {
                        this.caret.setAfter(inline);
        				$inline.remove();

        				var el = this.selection.getElement();
                        this.utils.normalizeTextNodes(el);
                    }
                    // 2.1.2) has different args and it is span tag
                    else if (this.tag === 'span')
                    {
                        nodes = this.applyArgs([inline], false);
                        this.caret.setStart(inline);
                    }
                    // 2.1.3) has different args and it is not span tag
                    else
                    {
                       nodes = this.insertInline(nodes);
                    }

                }
                // 2.2) has another tag
                else
                {
                    // 2.2.1) has parent
                    if (dataInline.hasParent([this.tag]))
                    {
                        var $parent = $inline.closest(this.tag);
                        var parent = $parent.get();
                        if (this.hasSameArgs(parent))
                        {
                            $parent.unwrap();
                            this.caret.setStart(inline);
                        }
                        else
                        {
                            nodes = this.insertInline(nodes);
                        }
                    }
                    // 2.2.2) hasn't parent
                    else
                    {
                        nodes = this.insertInline(nodes);
                    }
                }
            }
            // 3) inline isn't empty
            else
            {
                // 3.1) has same tag
                if (inline.tagName.toLowerCase() === this.tag)
                {
                    // 3.1.1) has same args or hasn't args
                    if (this.hasSameArgs(inline))
                    {
                        // insert break
                        var extractedContent = this.insertion._extractHtmlFromCaret(inline);
                        var $secondPart = $R.dom('<' + this.tag + ' />');
                        $secondPart = this.utils.cloneAttributes(inline, $secondPart);

                        $inline.after($secondPart.append(extractedContent));

                        this.caret.setAfter(inline);
                    }
                    else
                    {
                        nodes = this.insertInline(nodes);
                    }
                }
                // 3.2) has another tag
                else
                {
                    // 3.2.1) has parent
                    if (dataInline.hasParent([this.tag]))
                    {
                        var $parent = $inline.closest(this.tag);
                        var parent = $parent.get();
                        if (this.hasSameArgs(parent))
                        {
                            // insert break
                            var extractedContent = this.insertion._extractHtmlFromCaret(parent, parent);
                            var $secondPart = $R.dom('<' + this.tag + ' />');
                            $secondPart = this.utils.cloneAttributes(parent, $secondPart);

                            var $breaked, $last;
                            var z = 0;
                            inlines = inlines.reverse();
                            for (var i = 0; i < inlines.length; i++)
                            {
                                if (inlines[i] !== parent)
                                {
                                    $last = $R.dom('<' + inlines[i].tagName.toLowerCase() + '>');
                                    if (z === 0)
                                    {
                                        $breaked = $last;
                                    }
                                    else
                                    {
                                        $breaked.append($last);
                                    }

                                    z++;
                                }
                            }

                            $parent.after($secondPart.append(extractedContent));
                            $parent.after($breaked);

                            this.caret.setStart($last);
                        }
                        else
                        {
                            nodes = this.insertInline(nodes);
                        }
                    }
                    // 3.2.2) hasn't parent
                    else
                    {
                        nodes = this.insertInline(nodes);
                    }
                }
            }
        }

        return nodes;
    },
    insertInline: function(nodes)
    {
        var node = document.createElement(this.tag);
        nodes = this.insertion.insertNode(node, 'start');

        return this.applyArgs(nodes, false);
    },
    hasSameArgs: function(inline)
    {
        if (inline.attributes.length === 0 && this.args === false)
        {
            return true;
        }
        else
        {
            var same = true;
            if (this.args)
            {
                var count = 0;
                for (var key in this.args)
                {
                    var $node = $R.dom(inline);
                    var args = (this.args[key]);
                    var value = this.utils.toParams(args);
                    var nodeAttrValue = $node.attr(key);
                    if (args)
                    {
                        if (key === 'style')
                        {
                            value = value.trim().replace(/;$/, '')

                            var origRules = this.utils.styleToObj($node.attr('style'));
                            var rules = value.split(';');
                            var innerCount = 0;

                            for (var i = 0; i < rules.length; i++)
                            {
                                var arr = rules[i].split(':');
                                var ruleName = arr[0].trim();
                                var ruleValue = arr[1].trim();

                                if (ruleName.search(/color/) !== -1)
                                {
                                    var val = $node.css(ruleName);
                                    if (val && (val === ruleValue || this.utils.rgb2hex(val) === ruleValue))
                                    {
                                        innerCount++;
                                    }
                                }
                                else if ($node.css(ruleName) === ruleValue)
                                {
                                    innerCount++;
                                }
                            }

                            if (innerCount === rules.length && Object.keys(origRules).length === rules.length)
                            {
                                count++;
                            }
                        }
                        else
                        {
                            if (nodeAttrValue === value)
                            {
                                count++;
                            }
                        }
                    }
                    else
                    {
                        if (!nodeAttrValue || nodeAttrValue === '')
                        {
                            count++;
                        }
                    }
                }

                same = (count === Object.keys(this.args).length);
            }

            return same;
        }
    },
    formatUncollapsed: function()
    {
        var inlines = this.selection.getInlines({ all: true, inside: true });

        // 1) hasn't inline tags
        if (inlines.length === 0)
        {
            this.formatUncollapsedAllInlines();
        }
        // 2) has inline tags
        else
        {
            this.selection.save();
            this.convertToStrike(inlines);
            this.selection.restore();
        }

        document.execCommand('strikethrough');

        var $editor = this.editor.getElement();
        $editor.find(this.opts.inlineTags.join(',')).each(function(node)
        {
            if (node.style.textDecoration === 'line-through' || node.style.textDecorationLine === 'line-through')
            {
                var $el = $R.dom(node);
                $el.css('textDecorationLine', '');
                $el.css('textDecoration', '');
                $el.wrap('<strike>');
            }
        });

        this.selection.save();

        var nodes = this.revertToInlines(inlines);
        nodes = this.applyArgs(nodes, false);

        this.selection.restore();

        this.clearEmptyStyle();
        nodes = this.normalizeBlocks(nodes);

        return nodes;

    },
    formatUncollapsedAllInlines: function()
    {
        var allInlines = this.selection.getInlines({ all: true });
        if (allInlines.length === 0) return;

        this.selection.save();

        var replacedNodes = [];
        for (var i = 0; i < allInlines.length; i++)
        {
            var inline = allInlines[i];
            var inlineTag = inline.tagName.toLowerCase();
            var $inline = $R.dom(inline);
            var $parent = $inline.closest(this.tag);
            var parent = $parent.get();
            if (parent)
            {
                var tag = this.arrangeTag(parent.tagName.toLowerCase());
                if (tag === this.tag && this.hasSameArgs(parent) && replacedNodes.indexOf(parent) === -1)
                {
                    replacedNodes.push(parent);
                }
            }

            if (this.tag !== 'u' && inlineTag === 'u')
            {
                var $el = this.utils.replaceToTag(inline, 'span');
                $el.addClass('redactor-convertable-u');
            }

            if (this.tag !== 'del' && inlineTag === 'del')
            {
                var $el = this.utils.replaceToTag(inline, 'span');
                $el.addClass('redactor-convertable-del');
            }
        }

        for (var i = 0; i < replacedNodes.length; i++)
        {
            var $el = $R.dom(replacedNodes[i]);
            $el.replaceWith(function(node)
            {
                return $R.dom('<strike>').append($el.contents());
            });
        }

        this.selection.restore();
    },
    normalizeBlocks: function(nodes)
    {
        var tags = this.opts.inlineTags;
        var blocks = this.selection.getBlocks();
        if (blocks)
        {
            for (var i = 0; i < blocks.length; i++)
            {
                if (blocks[i].tagName === 'PRE')
                {
                    var $node = $R.dom(blocks[i]);
                    $node.find(tags.join(',')).not('.redactor-selection-marker').each(function(inline)
                    {
                        if (nodes.indexOf(inline) !== -1)
                        {
                            nodes = this.utils.removeFromArrayByValue(nodes, inline);
                        }

                        $R.dom(inline).unwrap();
                    }.bind(this));

                }

                //this.utils.normalizeTextNodes(blocks[i]);
            }
        }

        return nodes;
    },
    clearEmptyStyle: function()
    {
        var inlines = this.getInlines();
        for (var i = 0; i < inlines.length; i++)
        {
            this.clearEmptyStyleAttr(inlines[i]);

            var childNodes = inlines[i].childNodes;
            if (childNodes)
            {
                for (var z = 0; z < childNodes.length; z++)
                {
                    this.clearEmptyStyleAttr(childNodes[z]);
                }
            }
        }
    },
    clearEmptyStyleAttr: function(node)
    {
        if (node.nodeType !== 3 && this.utils.removeEmptyAttr(node, 'style'))
        {
            node.removeAttribute('style');
            node.removeAttribute('data-redactor-style-cache');
        }
    },
    convertToStrike: function(inlines)
    {
        for (var i = 0; i < inlines.length; i++)
        {
            var tag = this.arrangeTag(inlines[i].tagName.toLowerCase());
            var inline = inlines[i];
            var $inline = $R.dom(inline);
            if (tag === this.tag)
            {
                if (this.hasSameArgs(inline))
                {
                    var $el = $R.dom(inline);
                    $el.replaceWith(function(node)
                    {
                        return $R.dom('<strike>').append($el.contents());
                    });
                }
                else if (this.tag === 'span')
                {
                    $inline.addClass('redactor-convertable-apply');
                }

            }

            this.convertTags(inline, tag, 'u');
            this.convertTags(inline, tag, 'del');
        }
    },
    revertToInlines: function(inlines)
    {
        var nodes = [];
        var $editor = this.editor.getElement();

        $editor.find('u').unwrap();
        $editor.find('span.redactor-convertable-apply').each(function(node)
        {
            var $node = $R.dom(node);
            $node.removeClass('redactor-convertable-apply');
            $node.find('strike').unwrap();

            if (this.utils.removeEmptyAttr(node, 'class')) $node.removeAttr('class');

            nodes.push(node);

        }.bind(this));

        $editor.find('strike').each(function(node, i)
        {
            var $el = this.utils.replaceToTag(node, this.tag);
            nodes.push($el.get());

        }.bind(this));

        this.revertTags('u');
        this.revertTags('del');

        return nodes;
    },
    convertTags: function(inline, tag, type)
    {
        if (this.tag !== type && tag === type)
        {
            var $el = this.utils.replaceToTag(inline, 'span');
            $el.addClass('redactor-convertable-' + type);
        }
    },
    revertTags: function(tag)
    {
        var $editor = this.editor.getElement();

        $editor.find('span.redactor-convertable-' + tag).each(function(node)
        {
            var $el = this.utils.replaceToTag(node, tag);
            $el.removeClass('redactor-convertable-' + tag);
            if (this.utils.removeEmptyAttr($el, 'class')) $el.removeAttr('class');

        }.bind(this));
    },
    getInlines: function(tags)
    {
        return (tags) ? this.selection.getInlines({ tags: tags, all: true }) : this.selection.getInlines({ all: true });
    },
    getElements: function(tags)
    {
        return $R.dom(this.getInlines(tags));
    },
    clearFormat: function()
	{
		this.selection.save();

		var nodes = this.selection.getInlines({ all: true });
		for (var i = 0; i < nodes.length; i++)
        {
            var $el = $R.dom(nodes[i]);
            var inline = this.selection.getInline(nodes[i]);
            if (inline)
            {
                $el.unwrap();
            }
        }

		this.selection.restore();
	}
});
$R.add('service', 'autoparser', {
    init: function(app)
    {
        this.app = app;
    },
    format: function(e, key)
    {
        if (this._isKey(key))
        {
            this._format();
        }
    },
    parse: function(html)
    {
        var tags = ['figure', 'pre', 'code', 'a', 'iframe', 'img'];
        var stored = [];
        var z = 0;

        // encode
        html = this.cleaner.encodePreCode(html);

        // store
        for (var i = 0; i < tags.length; i++)
        {
            var re = (tags[i] === 'img') ? '<' + tags[i] + '[^>]*>' : '<' + tags[i] + '([\\w\\W]*?)</' + tags[i] + '>';
            var matched = html.match(new RegExp(re, 'gi'));
            if (matched !== null)
            {
                for (var y = 0; y < matched.length; y++)
                {
                    html = html.replace(matched[y], '#####replaceparse' + z + '#####');
                    stored.push(matched[y]);
                    z++;
                }
            }
        }

        // images
        if (this.opts.autoparseImages && html.match(this.opts.regex.imageurl))
        {
            var imagesMatches = html.match(this.opts.regex.imageurl);

            for (var i = 0; i < imagesMatches.length; i++)
            {
                html = html.replace(imagesMatches[i], '<img src="' + imagesMatches[i] + '">');
            }
        }

        // video
        if (this.opts.autoparseVideo && (html.match(this.opts.regex.youtube) || html.match(this.opts.regex.vimeo)))
        {
            var iframeStart = '<iframe width="500" height="281" src="';
            var iframeEnd = '" frameborder="0" allowfullscreen></iframe>';

			if (html.match(this.opts.regex.youtube))
			{
				str = '//www.youtube.com/embed/$1';
                re = this.opts.regex.youtube;
			}
			else if (html.match(this.opts.regex.vimeo))
			{
				str = '//player.vimeo.com/video/$2';
                re = this.opts.regex.vimeo;
			}

			html = html.replace(re, iframeStart + str + iframeEnd);
        }

        // links
        if (this.opts.autoparseLinks && html.match(this.opts.regex.url))
        {
            html = this._formatLinks(html, true);
        }

        // restore
        for (var i = 0; i < stored.length; i++)
		{
			html = html.replace('#####replaceparse' + i + '#####', stored[i]);
		}

        return html;
    },

    // private
    _isKey: function(key)
    {
        return (key === this.keycodes.ENTER || key === this.keycodes.SPACE);
    },
    _format: function()
    {
        var parent = this.selection.getParent();
        var $parent = $R.dom(parent);

        var isNotFormatted = (parent && $parent.closest('figure, pre, code, img, a, iframe').length !== 0);
        if (isNotFormatted || !this.selection.isCollapsed())
        {
            return;
        }

        // add split marker
        var marker = document.createTextNode('\u200B');
        var range = this.selection.getRange();
        range.insertNode(marker);

        var element = this.selection.getElement();
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var $current = $R.dom(current);

        // remove split marker
        marker.parentNode.removeChild(marker);

        if (current && current.nodeType === 3)
        {
            var content = current.textContent;
            var type;

            // images
            if (this.opts.autoparseImages && content.match(this._convertToRegExp(this.opts.regex.imageurl)))
            {
                var isList = data.isList();
                var matches = content.match(this.opts.regex.imageurl);
                var el = (isList) ? undefined : '<figure><img></figure>';

                var $img = this.component.create('image', el);
                $img.setSrc(matches[0]);
                $img.addClass('redactor-autoparser-object');

                content = content.replace(matches[0], $img.get().outerHTML);
                type = 'image';
            }
            // video
            else if (this.opts.autoparseVideo && (content.match(this._convertToRegExp(this.opts.regex.youtube)) || content.match(this._convertToRegExp(this.opts.regex.vimeo))))
            {
                var iframeStart = '<iframe width="500" height="281" src="';
				var iframeEnd = '" frameborder="0" allowfullscreen></iframe>';
				var str, re;

				if (content.match(this.opts.regex.youtube))
				{
    				str = '//www.youtube.com/embed/$1';
                    re = this.opts.regex.youtube;
				}
				else if (content.match(this.opts.regex.vimeo))
				{
    				str = '//player.vimeo.com/video/$2';
                    re = this.opts.regex.vimeo;
				}

                var $video = this.component.create('video', iframeStart + str + iframeEnd);
                $video.addClass('redactor-autoparser-object');

				content = content.replace(re, $video.get().outerHTML);
                type = 'video';
            }
            // links
            else if (this.opts.autoparseLinks && content.match(this._convertToRegExp(this.opts.regex.url)))
            {
                content = this._formatLinks(content);
                type = 'link';
            }

            // replace
            if (type)
            {
                $current.replaceWith(content);

                // object
                var $editor = this.editor.getElement();
                var $object = $editor.find('.redactor-autoparser-object').removeClass('redactor-autoparser-object');
                $object = (type === 'link') ? $R.create('link.component', this.app, $object) : $object;

                // caret
                if (type === 'link')
                {
                    this.caret.setAfter($object);
                    this.app.broadcast('link.inserted', $object);
                }
                else
                {
                    this.caret.setAfter($object);

                    var $cloned = $object.clone();
                    $object.remove();
                    $object = this.insertion.insertHtml($cloned);
                    $object = this.component.build($object);
                }

                // callback
                this.app.broadcast('autoparse', type, $object);
            }
        }

        this.utils.normalizeTextNodes(element);
    },
    _formatLinks: function(content, parse)
    {
        var matches = content.match(this.opts.regex.url);
        for (var i = 0; i < matches.length; i++)
		{
			var href = matches[i], text = href;
			var linkProtocol = (href.match(/(https?|ftp):\/\//i) !== null) ? '' : 'http://';
            var regexB = (["/", "&", "="].indexOf(href.slice(-1)) !== -1) ? "" : "\\b";
			var target = (this.opts.pasteLinkTarget !== false) ? ' target="' + this.opts.pasteLinkTarget + '"' : '';

			text = (text.length > this.opts.linkSize) ? text.substring(0, this.opts.linkSize) + '...' : text;
			text = (text.search('%') === -1) ? decodeURIComponent(text) : text;

			// escaping url
			var regexp = new RegExp('(' + href.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + regexB + ')', 'g');
			var classstr = (parse) ? '' : ' class="redactor-autoparser-object"';

			content = content.replace(regexp, '<a href="' + linkProtocol + href.trim() + '"' + target + classstr + '>' + text.trim() + '</a>');
		}

		return content;
    },
    _convertToRegExp: function(str)
    {
        return new RegExp(String(str).replace(/^\//, '').replace(/\/ig$/, '').replace(/\/gi$/, '') + '$', 'gi');
    }
});
$R.add('service', 'storage', {
    init: function(app)
    {
        this.app = app;

        // local
        this.data = [];
    },
    // public
    markImages: function()
    {
        var $editor = this.editor.getElement();
        $editor.find('img').each(function(node)
        {
            var $node = $R.dom(node);
            if (!$node.attr('data-image'))
            {
                $node.attr('data-image', this.utils.getRandomId());
            }

        }.bind(this));
    },
    observeImages: function()
    {
        var $editor = this.editor.getElement();
        var $images = $editor.find('[data-image]');

        $images.each(this._addImage.bind(this));
    },
    observeFiles: function()
    {
        var $editor = this.editor.getElement();
        var $files = $editor.find('[data-file]');

		$files.each(this._addFile.bind(this));
    },
	setStatus: function(url, status)
	{
		this.data[url].status = status;
	},
    getChanges: function()
    {
        var $editor = this.editor.getElement();

        // check status
        for (var key in this.data)
		{
			var data = this.data[key];
			var $el = $editor.find('[data-' + data.type + '="' + data.id + '"]');

			this.setStatus(data.id, ($el.length === 0) ? false : true);
		}

        return this.data;
    },
	add: function(type, node)
	{
        var $node = $R.dom(node);
        var id = $node.attr('data-' + type);

        this.data[id] = { type: type, status: true, node: $node.get(), id: $node.attr('data-' + type) };
	},

    // private
    _addImage: function(node)
    {
        this.add('image', node);
    },
    _addFile: function(node)
    {
        this.add('file', node);
    }
});
$R.add('service', 'utils', {
    init: function(app)
    {
        this.app = app;
    },
    // empty
    isEmpty: function(el)
    {
        var el = $R.dom(el).get();
        var isEmpty = false;

        if (el)
        {
            isEmpty = (el.nodeType === 3) ? (el.textContent.trim().replace(/\n/, '') === '') : (el.innerHTML === '');
        }

        return isEmpty;
    },
    isEmptyHtml: function(html)
    {
		html = html.replace(/[\u200B-\u200D\uFEFF]/g, '');
		html = html.replace(/&nbsp;/gi, '');
		html = html.replace(/<\/?br\s?\/?>/g, '');
		html = html.replace(/\s/g, '');
		html = html.replace(/^<p>[^\W\w\D\d]*?<\/p>$/i, '');
		html = html.replace(/^<div>[^\W\w\D\d]*?<\/div>$/i, '');

		html = html.replace(/<hr(.*?[^>])>$/i, 'hr');
		html = html.replace(/<iframe(.*?[^>])>$/i, 'iframe');
		html = html.replace(/<source(.*?[^>])>$/i, 'source');

		// remove empty tags
		html = html.replace(/<[^\/>][^>]*><\/[^>]+>/gi, '');
		html = html.replace(/<[^\/>][^>]*><\/[^>]+>/gi, '');

        // trim
		html = html.trim();

		return html === '';
    },

    // fragment
    createTmpContainer: function(html)
    {
        var $div = $R.dom('<div>');

        if (typeof html === 'string')
        {
            $div.html(html);
        }
        else
        {
            $div.append($R.dom(html).clone(true));
        }

        return $div.get();
    },
    createFragment: function(html)
    {
        var el = this.createTmpContainer(html);
        var frag = document.createDocumentFragment(), node, firstNode, lastNode;
        var nodes = [];
        var i = 0;
        while ((node = el.firstChild))
        {
            i++;
            var n = frag.appendChild(node);
            if (i === 1) firstNode = n;

            nodes.push(n);
            lastNode = n;
        }

        return { frag: frag, first: firstNode, last: lastNode, nodes: nodes };
    },
    isFragment: function(obj)
    {
        return (typeof obj === 'object' && obj.frag);
    },
    parseHtml: function(html)
    {
        var div = this.createTmpContainer(html);

        return { html: div.innerHTML, nodes: div.childNodes };
    },

    // childnodes
    getChildNodes: function(el, recursive, elements)
    {
        el = (el && el.nodeType && el.nodeType === 11) ? el : $R.dom(el).get();

        var nodes = el.childNodes;
        var result = [];
        if (nodes)
        {
            for (var i = 0; i < nodes.length; i++)
            {
                if (elements === true && nodes[i].nodeType === 3) continue
                else if (nodes[i].nodeType === 3 && this.isEmpty(nodes[i])) continue;

                result.push(nodes[i]);

                if (recursive !== false)
                {
                    var nestedNodes = this.getChildNodes(nodes[i], elements);
                    if (nestedNodes.length > 0)
                    {
                        result = result.concat(nestedNodes);
                    }
                }
            }
        }

        return result;
    },
    getChildElements: function(el)
    {
        return this.getChildNodes(el, true, true);
    },
    getFirstNode: function(el)
    {
        return this._getFirst(this.getChildNodes(el, false));
    },
    getLastNode: function(el)
    {
        return this._getLast(this.getChildNodes(el, false));
    },
    getFirstElement: function(el)
    {
        return this._getFirst(this.getChildNodes(el, false, true));
    },
    getLastElement: function(el)
    {
        return this._getLast(this.getChildNodes(el, false, true));
    },

    // replace
	replaceToTag: function(node, tag)
	{
    	var $node = $R.dom(node);
		return $node.replaceWith(function(node)
		{
			var $replaced = $R.dom('<' + tag + '>').append($R.dom(node).contents());
            if (node.attributes)
            {
                var attrs = node.attributes;
    			for (var i = 0; i < attrs.length; i++)
    			{
                    $replaced.attr(attrs[i].nodeName, attrs[i].value);
                }
			}

            return $replaced;

		});
	},

    // string
    ucfirst: function(str)
    {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    // array
    removeFromArrayByValue: function(arr, value)
    {
        var value, a = arguments, len = a.length, ax;
        while (len > 1 && arr.length)
        {
            value = a[--len];
            while ((ax= arr.indexOf(value)) !== -1)
            {
                arr.splice(ax, 1);
            }
        }

        return arr;
    },

    // attributes
	removeEmptyAttr: function(el, attr)
	{
		var $el = $R.dom(el);

		if (typeof $el.attr(attr) === 'undefined' || $el.attr(attr) == null) return true;
		else if ($el.attr(attr) === '')
		{
    		$el.removeAttr(attr);
    		return true;
        }

		return false;
	},
    cloneAttributes: function(elFrom, elTo)
	{
		elFrom = $R.dom(elFrom).get();
		elTo = $R.dom(elTo);

		var attrs = elFrom.attributes;
		var len = attrs.length;
		while (len--)
		{
		    var attr = attrs[len];
		    elTo.attr(attr.name, attr.value);
		}

		return elTo;
	},

	// object
    toParams: function(obj)
    {
        var keys = Object.keys(obj);
        if (!keys.length) return '';
        var result = '';

        for (var i = 0; i < keys.length; i++)
        {
            var key = keys[i];
            result += key + ':' + obj[key] + ';';
        }

        return result;
    },
    styleToObj: function(str)
    {
        var obj = {};

        if (str)
        {
            var style = str.replace(/;$/, '').split(';');
            for (var i = 0; i < style.length; i++)
            {
                var rule = style[i].split(':');
                obj[rule[0].trim()] = rule[1].trim();
            }
        }

        return obj;
    },
    checkProperty: function(obj)
    {
        var args = (arguments[1] && Array.isArray(arguments[1])) ? arguments[1] : [].slice.call(arguments, 1);

        for (var i = 0; i < args.length; i++)
        {
            if (!obj || (typeof obj[args[i]] === 'undefined'))
            {
                return false;
            }

            obj = obj[args[i]];
        }

        return obj;
    },

    // data
    extendData: function(data, obj)
    {
        for (var key in obj)
        {
            if (key === 'elements')
            {
                var $elms = $R.dom(obj[key]);
                $elms.each(function(node)
                {
                    var $node = $R.dom(node);
                    if (node.tagName === 'FORM')
                    {
                        var serializedData = $node.serialize(true);
                        for (var z in serializedData)
                        {
                            data = this._setData(data, z, serializedData[z]);
                        }
                    }
                    else
                    {
                        var name = ($node.attr('name')) ? $node.attr('name') : $node.attr('id');
                        data = this._setData(data, name, $node.val());
                    }
                }.bind(this));
            }
            else
            {
                data = this._setData(data, key, obj[key]);
            }
        }

        return data;
    },
    _setData: function(data, name, value)
    {
        if (data instanceof FormData) data.append(name, value);
        else data[name] = value;

        return data;
    },

    // normalize
    normalizeTextNodes: function(el)
    {
        el = $R.dom(el).get();
        if (el) el.normalize();
    },

    // color
	isRgb: function(str)
	{
        return (str.search(/^rgb/i) === 0);
	},
	rgb2hex: function(rgb)
	{
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);

        return (rgb && rgb.length === 4) ? "#" +
        ("0" + parseInt(rgb[1],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[2],10).toString(16)).slice(-2) +
        ("0" + parseInt(rgb[3],10).toString(16)).slice(-2) : '';
    },
    hex2long: function(val)
    {
        if (val.search(/^#/) !== -1 && val.length === 4)
        {
            val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
        }

        return val;
    },

	// escape
	escapeRegExp: function(s)
	{
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    },

	// random
	getRandomId: function()
	{
        var id = '';
        var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

        for (var i = 0; i < 12; i++)
        {
            id += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        return id;
	},

    // private
    _getFirst: function(nodes)
    {
        return (nodes.length !== 0) ? nodes[0] : false;
    },
    _getLast: function(nodes)
    {
        return (nodes.length !== 0) ? nodes[nodes.length-1] : false;
    }
});
$R.add('service', 'progress', {
    init: function(app)
    {
        this.app = app;

        // local
        this.$box = null;
		this.$bar = null;
    },

    // public
	show: function()
	{
		if (!this._is()) this._build();
        this.$box.show();
	},
	hide: function()
	{
		if (this._is())
		{
    		this.animate.start(this.$box, 'fadeOut', this._destroy.bind(this));
		}
	},
	update: function(value)
	{
		this.show();
		this.$bar.css('width', value + '%');
	},

	// private
	_is: function()
	{
		return (this.$box !== null);
	},
	_build: function()
	{
		this.$bar = $R.dom('<span />');
		this.$box = $R.dom('<div id="redactor-progress" />');

		this.$box.append(this.$bar);
		this.$body.append(this.$box);
	},
	_destroy: function()
	{
		if (this._is()) this.$box.remove();

		this.$box = null;
		this.$bar = null;
	}
});
$R.add('module', 'starter', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.plugin = app.plugin;
        this.module = app.module;
    },
    // messages
    onstart: function()
    {
        var services = ['element', 'container', 'source', 'editor', 'statusbar', 'toolbar'];
        var modules = ['element', 'container', 'source', 'editor', 'statusbar', 'contextbar', 'input'];

        this._startStop('start', this.app, services);
        this._startStop('start', this.module, modules);
    },
    onstop: function()
    {
        var modules = ['observer', 'element', 'container', 'source', 'editor', 'contextbar'];

        this._startStop('stop', this.module, modules);
    },
    onenable: function()
    {
        var modules = ['observer', 'toolbar'];
        var plugins = this.opts.plugins;

        this._startStop('start', this.module, modules);
        this._startStop('start', this.plugin, plugins);
    },
    ondisable: function()
    {
        var modules = ['observer', 'toolbar'];
        var plugins = this.opts.plugins;

        this._startStop('stop', this.module, modules);
        this._startStop('stop', this.plugin, plugins);
    },

    // private
    _startStop: function(type, obj, arr)
    {
        for (var i = 0; i < arr.length; i++)
        {
            if (typeof obj[arr[i]] !== 'undefined')
            {
                this.app.callInstanceMethod(obj[arr[i]], type);
            }
        }
    }
});
$R.add('module', 'element', {
    init: function(app)
    {
        this.app = app;
        this.uuid = app.uuid;
        this.opts = app.opts;
        this.namespace = app.namespace;
        this.element = app.element;
        this.rootOpts = $R.extend({}, true, $R.options, app.rootOpts);
    },
    // public
    start: function()
    {
        this._build();
        this._buildModes();
        this._buildMarkup();
    },
    stop: function()
    {
        var $element = this.element.getElement();
        $element.removeData(this.namespace + '-uuid');
    },

    // private
    _build: function()
    {
        var $element = this.element.getElement();
        $element.data(this.namespace + '-uuid', this.uuid);
    },
    _buildModes: function()
    {
        var type = this.element.getType();

        if (type === 'inline') this._redefineOptions(this.opts.modes['inline']);
        if (type === 'div') this._redefineOptions(this.opts.modes['original']);

        if (type !== 'inline')
		{
    		if (this._isRootOption('styles') && this.rootOpts.styles) this.opts.styles = true;
    		if (this._isRootOption('source') && !this.rootOpts.source) this.opts.showSource = false;
		}
    },
    _buildMarkup: function()
    {
        if (this.opts.breakline) this.opts.markup = 'br';

        var tag = this.opts.markup;
        this.opts.emptyHtml = (tag === 'br') ? '' : '<' + tag + '></' + tag + '>';
    },
    _redefineOptions: function(opts)
    {
        for (var key in opts)
        {
            this.opts[key] = opts[key];
        }
    },
    _isRootOption: function(name)
    {
        return (typeof this.rootOpts['styles'] !== 'undefined');
    }
});
$R.add('module', 'editor', {
    init: function(app)
    {
        this.app = app;
        this.uuid = app.uuid;
        this.opts = app.opts;
        this.editor = app.editor;
        this.source = app.source;
        this.element = app.element;
        this.component = app.component;
        this.container = app.container;
        this.inspector = app.inspector;

        // local
        this.placeholder = false;
        this.events = false;
    },
    // messages
    onenable: function()
    {
        this.enable();
    },
    ondisable: function()
    {
        this.disable();
    },
    onenablefocus: function()
    {
        this._enableFocus();
    },
    oncontextmenu: function(e)
    {
        this.component.setOnEvent(e, true);
    },
    onclick: function(e)
    {
        this.component.setOnEvent(e);
    },
    onkeyup: function(e)
    {
        var data = this.inspector.parse(e.target);
        if (!data.isComponent())
        {
            this.component.clearActive();
        }
    },
    onenablereadonly: function()
    {
        this._enableReadOnly();
    },
    ondisablereadonly: function()
    {
        this._disableReadOnly();
    },
    onplaceholder: {
        build: function()
        {
            this._buildPlaceholder();
        },
        toggle: function()
        {
            this._togglePlacehodler();
        }
    },

    // public
    start: function()
    {
        this._build();
        this._buildEvents();
        this._buildOptions();
        this._buildAccesibility();
    },
    stop: function()
    {
        var $editor = this.editor.getElement();
        var $container = this.container.getElement();

        var classesEditor = ['redactor-in', 'redactor-in-' + this.uuid, 'redactor-structure', 'redactor-placeholder', this.opts.stylesClass];
        var classesContainer = ['redactor-focus', 'redactor-blur', 'redactor-over', 'redactor-styles-on',
                                'redactor-styles-off', 'redactor-toolbar-on', 'redactor-text-labeled-on', 'redactor-source-view'];

        $editor.removeAttr('spellcheck');
        $editor.removeAttr('dir');
        $editor.removeAttr('contenteditable');
        $editor.removeAttr('placeholder');
        $editor.removeClass(classesEditor.join(' '));

        $container.removeClass(classesContainer.join(' '));

        this._destroyEvents();

        if ($editor.get().classList.length === 0) $editor.removeAttr('class');
    },
    enable: function()
    {
        var $editor = this.editor.getElement();
        var $container = this.container.getElement();

        $editor.addClass('redactor-in redactor-in-' + this.uuid);
		$editor.attr({ 'contenteditable': true });

		if (this.opts.structure)
		{
    		$editor.addClass('redactor-structure');
		}

        if (this.opts.toolbar && !this.opts.air && !this.opts.toolbarExternal)
        {
            $container.addClass('redactor-toolbar-on');
        }

        // prevent editing
		this._disableBrowsersEditing();
    },
    disable: function()
    {
        var $editor = this.editor.getElement();
        var $container = this.container.getElement();

        $editor.removeClass('redactor-in redactor-in-' + this.uuid);
  		$editor.removeClass('redactor-structure');
		$editor.removeAttr('contenteditable');

        $container.addClass('redactor-toolbar-on');
    },

    // private
    _build: function()
    {
        var $editor = this.editor.getElement();
        var $element = this.element.getElement();
        var $container = this.container.getElement();

        $container.addClass('redactor-blur');

        if (this.opts.styles)
        {
            $editor.addClass(this.opts.stylesClass);
            $container.addClass('redactor-styles-on');
        }
        else
        {
            $container.addClass('redactor-styles-off');
        }

        if (this.opts.buttonsTextLabeled)
        {
            $container.addClass('redactor-text-labeled-on');
        }

        if (this.element.isType('textarea')) $element.before($editor);
    },
    _buildEvents: function()
    {
        this.events = $R.create('editor.events', this.app);
    },
    _buildOptions: function()
    {
        var $editor = this.editor.getElement();

		$editor.attr('dir', this.opts.direction);

		if (this.opts.tabindex)  $editor.attr('tabindex', this.opts.tabindex);
		if (this.opts.minHeight) $editor.css('min-height', this.opts.minHeight);
		if (this.opts.maxHeight) $editor.css('max-height', this.opts.maxHeight);
		if (this.opts.maxWidth)  $editor.css({ 'max-width': this.opts.maxWidth, 'margin': 'auto' });
    },
	_buildAccesibility: function()
	{
    	var $editor = this.editor.getElement();

		$editor.attr({ 'aria-labelledby': 'redactor-voice-' + this.uuid, 'role': 'presentation' });
	},
	_buildPlaceholder: function()
	{
		this.placeholder = $R.create('editor.placeholder', this.app);
	},
    _enableFocus: function()
    {
        if (this.opts.showSource) this._enableFocusSource();
        else this._enableFocusEditor();
    },
    _enableFocusSource: function()
    {
        var $source = this.source.getElement();

        if (this.opts.focus)
        {
            $source.focus();
            $source.get().setSelectionRange(0, 0);
        }
        else if (this.opts.focusEnd)
        {
            $source.focus();
        }
    },
    _enableFocusEditor: function()
    {
        if (this.opts.focus)
        {
            setTimeout(this.editor.startFocus.bind(this.editor), 100);
        }
	    else if (this.opts.focusEnd)
	    {
    	    setTimeout(this.editor.endFocus.bind(this.editor), 100);
        }
    },
    _togglePlacehodler: function()
    {
        if (this.placeholder) this.placeholder.toggle();
    },
	_disableBrowsersEditing: function()
	{
		try {
			// FF fix
			document.execCommand('enableObjectResizing', false, false);
			document.execCommand('enableInlineTableEditing', false, false);
			// IE prevent converting links
			document.execCommand("AutoUrlDetect", false, false);

            // IE disable image resizing
            var $editor = this.editor.getElement();
			var el = $editor.get();
			if (el.addEventListener) el.addEventListener('mscontrolselect', function(e) { e.preventDefault(); });
			else el.attachEvent('oncontrolselect', function(e) { e.returnValue = false; });

		} catch (e) {}
	},
	_destroyEvents: function()
	{
        if (this.events)
        {
            this.events.destroy();
        }
	},
	_enableReadOnly: function()
	{
        var $editor = this.editor.getElement();

    	this._getEditables($editor).removeAttr('contenteditable');
    	$editor.addClass('redactor-read-only');
        $editor.removeAttr('contenteditable');

        if (this.events) this.events.destroy();
	},
	_disableReadOnly: function()
	{
        var $editor = this.editor.getElement();

    	this._getEditables($editor).attr({ 'contenteditable': true });
        $editor.removeClass('redactor-read-only');
        $editor.attr({ 'contenteditable': true });

        if (this.events) this.events.init();
	},
	_getEditables: function($editor)
	{
        return $editor.find('figcaption, td, th');
	}
});
$R.add('class', 'editor.placeholder', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.editor = app.editor;
        this.element = app.element;

        // build
        this.build();
    },
    build: function()
    {
        var $element = this.element.getElement();
        var $editor = this.editor.getElement();

        if (this.opts.placeholder !== false || $element.attr('placeholder'))
        {
            var text = (this.opts.placeholder !== false) ? this.opts.placeholder : $element.attr('placeholder');
            $editor.attr('placeholder', text);
            this.toggle();
        }
    },
    toggle: function()
    {
        return (this.editor.isEmpty()) ? this.show() : this.hide();
    },
    show: function()
    {
        var $editor = this.editor.getElement();
        $editor.addClass('redactor-placeholder');
    },
    hide: function()
    {
        var $editor = this.editor.getElement();
        $editor.removeClass('redactor-placeholder');
    }
});
$R.add('class', 'editor.events', {
    init: function(app)
    {
        this.app = app;
        this.$doc = app.$doc;
        this.uuid = app.uuid;
        this.editor = app.editor;
        this.container = app.container;
        this.inspector = app.inspector;
        this.selection = app.selection;
        this.component = app.component;

        // local
        this.blurNamespace = '.redactor-blur.' + this.uuid;
        this.eventsList = ['paste', 'click', 'contextmenu', 'keydown', 'keyup', 'mouseup', 'touchstart',
                           'cut', 'copy', 'dragenter', 'dragstart', 'drop', 'dragover', 'dragleave'];

        // init
        this._init();
    },
    destroy: function()
    {
    	var $editor = this.editor.getElement();

        $editor.off('.redactor-focus');
        this.$doc.off('keyup' + this.blurNamespace + ' mousedown' + this.blurNamespace);

        // all events
        this._loop('off');
    },
	focus: function(e)
	{
    	var $container = this.container.getElement();

    	if (this.editor.isPasting() || $container.hasClass('redactor-focus')) return;

        $container.addClass('redactor-focus');
        $container.removeClass('redactor-blur');

    	this.app.broadcast('observe', e);
    	this.app.broadcast('focus', e);

		this.isFocused = true;
		this.isBlured = false;
	},
	blur: function(e)
	{
    	var $container = this.container.getElement();
    	var $target = $R.dom(e.target);
    	var targets = ['.redactor-in-' + this.uuid,  '.redactor-toolbar', '.redactor-dropdown', '#redactor-modal-box'];

    	if (!this.app.isStarted() || this.editor.isPasting()) return;
    	if ($target.closest(targets.join(',')).length !== 0) return;

        if (!this.isBlured && !$container.hasClass('redactor-blur'))
		{
            $container.removeClass('redactor-focus');
            $container.addClass('redactor-blur');
			this.app.broadcast('blur', e);

            this.isFocused = false;
    		this.isBlured = true;
		}
	},
	cut: function(e)
	{
    	var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);

        this.app.broadcast('state', e);

        if (data.isComponent() && !data.isComponentEditable())
        {
            this._passSelectionToClipboard(e, data, true);
            e.preventDefault();
        }
	},
	copy: function(e)
	{
    	var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);

        this.app.broadcast('state', e);

        if (data.isComponent() && !data.isComponentEditable())
        {
            this._passSelectionToClipboard(e, data, false);
            e.preventDefault();
        }
	},
    drop: function(e)
    {
        e = e.originalEvent || e;
        e.stopPropagation();
        this._removeOverClass();

        this.app.broadcast('state', e);
        this.app.broadcast('paste', e, e.dataTransfer);
        this.app.broadcast('drop', e);
    },
    dragenter: function(e)
    {
        e.preventDefault();
    },
    dragstart: function(e)
    {
        this.app.broadcast('dragstart', e);
    },
    dragover: function(e)
    {
        e = e.originalEvent || e;
        e.preventDefault();

        this.app.broadcast('dragover', e);
    },
    dragleave: function(e)
    {
        this.app.broadcast('dragleave', e);
    },
    paste: function(e)
    {
        this.app.broadcast('paste', e);
    },
    contextmenu: function(e)
    {
        this.app.broadcast('contextmenu', e);
    },
    click: function(e)
    {
        this.app.broadcast('state', e);
        this.app.broadcast('click', e);
    },
    keydown: function(e)
    {
        this.app.broadcast('state', e);
        var stop = this.app.broadcast('keydown', e);
        if (stop === false)
        {
            return e.preventDefault();
        }
    },
    keyup: function(e)
    {
    	this.app.broadcast('observe', e);
        this.app.broadcast('keyup', e);
    },
    mouseup: function(e)
    {
    	this.app.broadcast('observe', e);
        this.app.broadcast('state', e);
    },
    touchstart: function(e)
    {
    	this.app.broadcast('observe', e);
        this.app.broadcast('state', e);
    },

	// private
    _init: function()
    {
    	var $editor = this.editor.getElement();

        $editor.on('focus.redactor-focus click.redactor-focus', this.focus.bind(this));
        this.$doc.on('keyup' + this.blurNamespace + ' mousedown' + this.blurNamespace, this.blur.bind(this));

        // all events
        this._loop('on');
    },
	_removeOverClass: function()
	{
        var $editor = this.editor.getElement();
        $editor.removeClass('over');
	},
    _loop: function(func)
    {
        var $editor = this.editor.getElement();
        for (var i = 0; i < this.eventsList.length; i++)
        {
            var event = this.eventsList[i] + '.redactor-events';
            var method = this.eventsList[i];

            $editor[func](event, this[method].bind(this));
        }
    },
    _passSelectionToClipboard: function(e, data, remove)
    {
        var clipboard = e.clipboardData;
        var node = data.getComponent();
        var $node = $R.dom(node);

        // clean
        $node.find('.redactor-component-caret').remove();
        $node.removeClass('redactor-component-active');
        $node.removeAttr('contenteditable');
        $node.removeAttr('tabindex');

        // html
        var content = node.outerHTML;

        if (remove) this.component.remove(node);

        clipboard.setData('text/html', content);
        clipboard.setData('text/plain', content.toString().replace(/\n$/, ""));
    }
});
$R.add('module', 'container', {
    init: function(app)
    {
        this.app = app;
        this.uuid = app.uuid;
        this.opts = app.opts;
        this.lang = app.lang;
        this.element = app.element;
        this.container = app.container;
    },
    // public
    start: function()
    {
        this._build();
        this._buildAccesibility();
    },
    stop: function()
    {
        var $element = this.element.getElement();
        var $container = this.container.getElement();

        $container.after($element);
        $container.remove();
        $element.show();
    },

    // private
    _build: function()
    {
        var $element = this.element.getElement();
        var $container = this.container.getElement();

        $container.addClass('redactor-box');
        $container.attr('dir', this.opts.direction);

        if (this.element.isType('inline')) $container.addClass('redactor-inline');

        $element.after($container);
        $container.append($element);
    },
	_buildAccesibility: function()
	{
        var $container = this.container.getElement();
    	var $label = $R.dom('<span />');

    	$label.addClass('redactor-voice-label');
    	$label.attr({ 'id': 'redactor-voice-' + this.uuid, 'aria-hidden': false });
        $label.html(this.lang.get('accessibility-help-label'));

		$container.prepend($label);
	}
});
$R.add('module', 'source', {
    init: function(app)
    {
        this.app = app;
        this.uuid = app.uuid;
        this.opts = app.opts;
        this.utils = app.utils;
        this.marker = app.marker;
        this.element = app.element;
        this.source = app.source;
        this.editor = app.editor;
        this.toolbar = app.toolbar;
        this.cleaner = app.cleaner;
        this.component = app.component;
        this.container = app.container;
        this.autoparser = app.autoparser;
        this.selection = app.selection;

        // local
        this.syncedHtml = '';
        this.started = false;
    },
    // messages
    onstartcode: function()
    {
        var sourceContent = this.source.getStartedContent();
        var $editor = this.editor.getElement();
        var $source = this.source.getElement();

        // autoparse
        if (this.opts.autoparse && this.opts.autoparseStart)
        {
            sourceContent = this.autoparser.parse(sourceContent);
        }

        // started content
        var startContent = this.cleaner.input(sourceContent);
        var syncContent = this.cleaner.output(startContent);

        // set content
        $editor.html(startContent);
        $source.val(syncContent);

        this.syncedHtml = syncContent;
        this.started = (this.utils.isEmptyHtml(syncContent));
        this.app.broadcast('placeholder.build');

        // widget's scripts
        this.component.executeScripts();
    },
    onstartcodeshow: function()
    {
        this.show();
    },
    ontrytosync: function()
    {
        this.sync();
    },

    // public
    start: function()
    {
        this._build();
        this._buildClasses();
    },
    stop: function()
    {
        var $element = this.element.getElement();
        var $source = this.source.getElement();

        $element.removeClass('redactor-source redactor-source-open');
        $source.off('input.redactor-source');

        if ($source.get().classList.length === 0) $source.removeAttr('class');
        if (this.source.isNameGenerated()) $element.removeAttr('name');
        if (!this.element.isType('textarea')) $source.remove();

    },
    getCode: function()
    {
        return this.source.getCode();
    },

    // public
    toggle: function()
    {
        if (!this.opts.source) return;

        var $source = this.source.getElement();

        return ($source.hasClass('redactor-source-open')) ? this.hide() : this.show();
    },
    show: function()
    {
        if (!this.opts.source) return;

        var $editor = this.editor.getElement();
        var $source = this.source.getElement();
        var $container = this.container.getElement();

        var html = $source.val();

        if (this.app.isStarted()) html = this.app.broadcast('source.open', html);

        this.editorIsSelected = this.selection.is();

        // insert markers
        this.editorHtml = this._insertMarkersToEditor();
        this.editorHtml = this.cleaner.output(this.editorHtml, false);
        this.editorHtml = this.editorHtml.trim();

        // get height
        var editorHeight = $editor.height();

        $editor.hide();
        $source.height(editorHeight);
        $source.val(html.trim());
        $source.show();
        $source.addClass('redactor-source-open');
        $source.on('input.redactor-source-events', this._onChangedSource.bind(this));
        $source.on('keydown.redactor-source-events', this._onTabKey.bind(this));
        $source.on('focus.redactor-source-events', this._onFocus.bind(this));

        $container.addClass('redactor-source-view');

        // offset markers
        this._setSelectionOffsetSource();

        // buttons
        setTimeout(function()
        {
            this._disableButtons();
            this._setActiveSourceButton();

        }.bind(this), 100);

        if (this.app.isStarted()) this.app.broadcast('source.opened');
    },
    hide: function()
    {
        if (!this.opts.source) return;

        var $editor = this.editor.getElement();
        var $source = this.source.getElement();
        var $container = this.container.getElement();

        var html = $source.val();

        // insert markers
        html = this._insertMarkersToSource(html);

        // clean
        html = this.cleaner.input(html);

        if (this.utils.isEmptyHtml(html))
        {
            html = (this.opts.breakline) ? '<br>' : this.opts.emptyHtml;
        }

        html = this.app.broadcast('source.close', html);

        // buttons
        this._enableButtons();
        this._setInactiveSourceButton();

        $source.hide();
        $source.removeClass('redactor-source-open');
        $source.off('.redactor-source-events');
        $editor.show();
        $editor.html(html);

        $container.removeClass('redactor-source-view');

        setTimeout(function() { this.selection.restoreMarkers(); }.bind(this), 0);
        this.app.broadcast('source.closed');
    },
    sync: function()
    {
        var self = this;
        var $editor = this.editor.getElement();
        var html = $editor.html();

        if (this.started) html = this.app.broadcast('syncBefore', html);
        html = this.cleaner.output(html);

		if (this._isSync(html))
		{
    		if (this.timeout) clearTimeout(this.timeout);
    		this.timeout = setTimeout(function() { self._syncing(html); }, 200);
        }
    },

    // private
    _build: function()
    {
        var $source = this.source.getElement();
        var $element = this.element.getElement();

        $source.hide();

        if (!this.element.isType('textarea')) $element.after($source);
    },
	_buildClasses: function()
	{
    	var $source = this.source.getElement();

        $source.addClass('redactor-source');
	},
    _syncing: function(html)
    {
        if (this.started) html = this.app.broadcast('syncing', html);

        var $source = this.source.getElement();
        $source.val(html);

        if (this.started) this.app.broadcast('synced', html);
        if (this.started) this.app.broadcast('changed', html);

        this.started = true;
    },
    _isSync: function(html)
    {
        if (this.syncedHtml !== html)
        {
            this.syncedHtml = html;
            return true;
        }

        return false;
    },
    _onChangedSource: function(e)
    {
        var $source = this.source.getElement();
        var html = $source.val();

        this.app.broadcast('changed', html);
        this.app.broadcast('source.changed', html);
    },
    _onTabKey: function(e)
    {
        if (e.keyCode !== 9) return true;

        e.preventDefault();

        var $source = this.source.getElement();
        var el = $source.get();
		var start = el.selectionStart;

		$source.val($source.val().substring(0, start) + "    " + $source.val().substring(el.selectionEnd));
		el.selectionStart = el.selectionEnd = start + 4;
    },
    _onFocus: function()
    {
        this.app.broadcast('sourcefocus');
    },
    _disableButtons: function()
    {
        this.toolbar.disableButtons();
    },
    _enableButtons: function()
    {
        this.toolbar.enableButtons();
    },
    _setActiveSourceButton: function()
    {
        var $btn = this.toolbar.getButton('html');
        $btn.enable();
        $btn.setActive();
    },
    _setInactiveSourceButton: function()
    {
        var $btn = this.toolbar.getButton('html');
        $btn.setInactive();
    },
    _insertMarkersToEditor: function()
    {
        var html = '';
        var $editor = this.editor.getElement();
        var $start = this.marker.build('start');
        var $end = this.marker.build('end');
        var component = this.component.getActive();
        if (component)
        {
            this.marker.remove();
            var $component = $R.dom(component);

            $component.after($end);
            $component.after($start);
        }
        else if (window.getSelection && this.editorIsSelected)
    	{
            this.marker.remove();
            this.marker.insertBoth();
        }

        return this._getHtmlAndRemoveMarkers($editor);
    },
    _insertMarkersToSource: function(html)
    {
        var $source = this.source.getElement();
        var markerStart = this.marker.buildHtml('start');
        var markerEnd = this.marker.buildHtml('end');

        var markerLength = markerStart.toString().length;
        var startOffset = this._enlargeOffset(html, $source.get().selectionStart);
        var endOffset = this._enlargeOffset(html, $source.get().selectionEnd);

        html = html.substr(0, startOffset) + markerStart + html.substr(startOffset);
        html = html.substr(0, endOffset + markerLength) + markerEnd + html.substr(endOffset + markerLength);

        return html;
    },
    _getHtmlAndRemoveMarkers: function($editor)
    {
        var html = $editor.html();
        $editor.find('.redactor-selection-marker').remove();

        return html;
    },
    _setSelectionOffsetSource: function()
    {
        var start = 0;
        var end = 0;
        var $source = this.source.getElement();
        if (this.editorHtml !== '')
        {
            var startMarker = this.marker.buildHtml('start').replace(/\u200B/g, '');
            var endMarker = this.marker.buildHtml('end').replace(/\u200B/g, '');

            start = this._strpos(this.editorHtml, startMarker);
            end = this._strpos(this.editorHtml, endMarker) - endMarker.toString().length - 2;

            if (start === false)
            {
                start = 0;
                end = 0;
            }
        }

        $source.get().setSelectionRange(start, end);
        $source.get().scrollTop = 0;

        setTimeout(function() { $source.focus(); }.bind(this), 0);
    },
    _strpos: function(haystack, needle, offset)
	{
		var i = haystack.indexOf(needle, offset);
		return i >= 0 ? i : false;
	},
	_enlargeOffset: function(html, offset)
	{
		var htmlLength = html.length;
		var c = 0;

		if (html[offset] === '>')
		{
			c++;
		}
		else
		{
			for(var i = offset; i <= htmlLength; i++)
			{
				c++;

				if (html[i] === '>')
				{
					break;
				}
				else if (html[i] === '<' || i === htmlLength)
				{
					c = 0;
					break;
				}
			}
		}

		return offset + c;
	}
});
$R.add('module', 'observer', {
    init: function(app)
    {
        this.app = app;
        this.editor = app.editor;

        // local
        this.observerUnit = false;
    },
    // public
    start: function()
    {
        if (window.MutationObserver)
        {
            var $editor = this.editor.getElement();
            var el = $editor.get();
            this.observerUnit = this._build(el);
            this.observerUnit.observe(el, {
                 attributes: true,
                 subtree: true,
                 childList: true,
                 characterData: true,
                 characterDataOldValue: true
            });
        }
    },
    stop: function()
    {
        if (this.observerUnit) this.observerUnit.disconnect();
    },

    // private
    _build: function(el)
    {
        var self = this;
        return new MutationObserver(function(mutations)
        {
            mutations.forEach(function(mutation)
            {
                self._iterate(mutation, el);
            });
        });
    },
    _iterate: function(mutation, el)
    {
        if (mutation.type === 'attributes' && mutation.target === el)
        {
            return;
        }

        this.app.broadcast('observe');
        this.app.broadcast('trytosync');
        this.app.broadcast('placeholder.toggle');
    }
});
$R.add('module', 'clicktoedit', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.source = app.source;
        this.editor = app.editor;
        this.container = app.container;
        this.selection = app.selection;
    },
    // messages
    onstartclicktoedit: function()
	{
        this.start();
	},
	onstop: function()
	{
        this.stop();
	},

	// public
	start: function()
	{
		this._build();
	},
    stop: function()
    {
        if (this.buttonSave) this.buttonSave.stop();
        if (this.buttonCancel) this.buttonCancel.stop();

        this._destroy();
		this.app.broadcast('disable');
    },
    enable: function(e)
    {
        this.app.broadcast('clickStart');

        var isEmpty = this.editor.isEmpty();
        if (!isEmpty) this.selection.saveMarkers();

        this._setFocus();
        this._destroy();
        this.app.broadcast('enable');
        this.buttonSave.enable();
        this.buttonCancel.enable();

        if (!isEmpty) this.selection.restoreMarkers();
        if (isEmpty) this.editor.focus();
    },
    save: function(e)
    {
    	if (e) e.preventDefault();

        var html = this.source.getCode();

		this.app.broadcast('disable');
		this.app.broadcast('clickSave', html);
		this.app.broadcast('clickStop');
		this._build();
    },
    cancel: function(e)
    {
		if (e) e.preventDefault();

        var html = this.saved;
        var $editor = this.editor.getElement();
		$editor.html(html);

        this.saved = '';

		this.app.broadcast('disable');
		this.app.broadcast('clickCancel', html);
		this.app.broadcast('clickStop');
		this._build();
    },

    // private
    _build: function()
    {
        // buttons
        this.buttonSave = $R.create('clicktoedit.button', 'save', this.app, this);
        this.buttonCancel = $R.create('clicktoedit.button', 'cancel', this.app, this);

		this.buttonSave.stop();
		this.buttonCancel.stop();

        var $editor = this.editor.getElement();
        var $container = this.container.getElement();

        $editor.on('click.redactor-click-to-edit', this.enable.bind(this));
        $container.addClass('redactor-over');
    },
    _destroy: function()
    {
        var $editor = this.editor.getElement();
        var $container = this.container.getElement();

        $editor.off('click.redactor-click-to-edit');
		$container.removeClass('redactor-over');
    },
    _setFocus: function()
    {
		this.saved = this.source.getCode();

		this.buttonSave.start();
		this.buttonCancel.start();
    }
});
$R.add('class', 'clicktoedit.button', {
    init: function(type, app, context)
    {
        this.app = app;
        this.opts = app.opts;
        this.toolbar = app.toolbar;
        this.context = context;

        // local
        this.type = type;
        this.name = (type === 'save') ? 'clickToSave' : 'clickToCancel';
        this.objected = false;
        this.enabled = false;
        this.namespace = '.redactor-click-to-edit';

        // build
        this._build();
    },
    enable: function()
    {
        if (!this.objected) return;

        var data = this.opts[this.name];
        data.api = 'module.clicktoedit.' + this.type;

        this.toolbar.addButton(this.type, data);
        this.enabled = true;
    },
    start: function()
    {
        if (this.objected) return;

		this.$button.off(this.namespace);
		this.$button.show();
		this.$button.on('click' + this.namespace, this.context[this.type].bind(this.context));
    },
    stop: function()
    {
        if (this.objected || !this.enabled) return;

        this.$button.hide();
    },

    // private
    _build: function()
    {
        this.objected = (typeof this.opts[this.name] === 'object');

        if (!this.objected)
        {
            this.$button = $R.dom(this.opts[this.name]);
            this.enabled = true;
        }
    }
});
$R.add('module', 'statusbar', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.element = app.element;
        this.statusbar = app.statusbar;
        this.container = app.container;
    },
    // public
    start: function()
    {
        if (!this.element.isType('inline'))
        {
            var $statusbar = this.statusbar.getElement();
            var $container = this.container.getElement();

            $statusbar.addClass('redactor-statusbar');
            $container.append($statusbar);
        }
    }
});
$R.add('module', 'contextbar', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.uuid = app.uuid;
        this.$doc = app.$doc;
        this.$body = app.$body;
        this.editor = app.editor;
        this.toolbar = app.toolbar;
        this.detector = app.detector;
    },
    // messages
    onenablereadonly: function()
    {
        this.stop();
    },
    ondisablereadonly: function()
    {
        this.start();
    },
    oncontextbar: {
        close: function()
        {
            this.close();
        }
    },

    // public
    start: function()
    {
        if (this.opts.toolbarContext)
        {
            var $editor = this.editor.getElement();

            this._build();
            $editor.on('click.redactor-context mouseup.redactor-context', this.open.bind(this));
        }
    },
    stop: function()
    {
        var $editor = this.editor.getElement();
        $editor.off('.redactor-context');

        this.$doc.off('.redactor-context');

        if (this.$contextbar) this.$contextbar.remove();
    },
    is: function()
    {
        return (this.$contextbar && this.$contextbar.hasClass('open'));
    },
    set: function(e, node, buttons, position)
    {
        this.$contextbar.html('');
        this.$el = $R.dom(node);

        // buttons
        for (var key in buttons)
        {
            var $btn = $R.create('contextbar.button', this.app, buttons[key]);
            if ($btn.html() !== '')
            {
                this.$contextbar.append($btn);
            }
        }

        // show
        var pos = this._buildPosition(e, this.$el, position);

        this.$contextbar.css(pos);
        this.$contextbar.show();
        this.$contextbar.addClass('open');
        this.$doc.on('click.redactor-context mouseup.redactor-context', this.close.bind(this));
    },
    open: function(e)
    {
        this.app.broadcast('contextbar', e, this);
    },
    close: function(e)
    {
        if (!this.$contextbar) return;
        if (e)
        {
            var $target = $R.dom(e.target);
            if (this.$el && $target.closest(this.$el).length !== 0)
            {
                return;
            }
        }

        this.$contextbar.hide();
        this.$contextbar.removeClass('open');
        this.$doc.off('.redactor.context');
    },

    // private
    _build: function()
    {
        this.$contextbar = $R.dom('<div>');
        this.$contextbar.attr('id', 'redactor-context-toolbar-' + this.uuid);
        this.$contextbar.addClass('redactor-context-toolbar');
        this.$contextbar.hide();

        this.$body.append(this.$contextbar);
    },
    _buildPosition: function(e, $el, position)
    {
        var top, left;
        var offset = $el.offset();
        var width = $el.width();
        var height = $el.height();

        var barWidth = this.$contextbar.width();
        var barHeight = this.$contextbar.height();

        var isMobile = this.detector.isMobile();

        var clientX = (isMobile) ? e.pageX : e.clientX;
        var clientY = (isMobile) ? e.pageY : e.clientY;

        if (!position)
        {
            top = (clientY + this.$doc.scrollTop() - barHeight);
            left = (clientX - barWidth/2);
        }
        else if (position === 'top')
        {
            top = (offset.top - barHeight);
            left = (offset.left + width/2 - barWidth/2);
        }
        else if (position === 'bottom')
        {
            top = (offset.top + height);
            left = (offset.left + width/2 - barWidth/2);
        }

        if (left < 0) left = 0;

        return { top: top + 'px', left: left + 'px' };
    }
});
$R.add('class', 'contextbar.button', {
    mixins: ['dom'],
    init: function(app, obj)
    {
        this.app = app;

        // local
        this.obj = obj;

        // init
        this._init();
    },
    // private
    _init: function()
    {
        this.parse('<a>');
        this.attr('href', '#');

        this._buildTitle();
        this._buildMessage();
    },
    _buildTitle: function()
    {
        this.html(this.obj.title);
    },
    _buildMessage: function()
    {
        if (typeof this.obj.message !== 'undefined' || typeof this.obj.api !== 'undefined')
        {
            this.on('click', this._toggle.bind(this));
        }
    },
    _toggle: function(e)
    {
        e.preventDefault();

        if (this.obj.message)
        {
            this.app.broadcast(this.obj.message, this.obj.args);
        }
        else if (this.obj.api)
        {
            this.app.api(this.obj.api, this.obj.args);
        }
    }
});
$R.add('module', 'toolbar', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.utils = app.utils;
        this.toolbar = app.toolbar;

        // local
        this.buttons = [];
        this.toolbarModule = false;
    },
    // messages
    onsource: {
        open: function()
        {
            if (!this.toolbar.isAir() && this.toolbar.isFixed())
            {
                this.toolbarModule.resetPosition();
            }
        },
        opened: function()
        {
            if (this.toolbar.isAir() && this.toolbarModule)
            {
                this.toolbarModule.createSourceHelper();
            }
        },
        close: function()
        {
            if (this.toolbar.isAir() && this.toolbarModule)
            {
                this.toolbarModule.destroySourceHelper();
            }
        },
        closed: function()
        {
            if (this.toolbar.is() && this.opts.air)
            {
                this.toolbarModule.openSelected();
            }
        }
    },
    onobserve: function()
    {
        if (this.toolbar.is())
        {
            this.toolbar.observe();
        }
    },
    onfocus: function()
    {
        this._setExternalOnFocus();
    },
    onsourcefocus: function()
    {
        this._setExternalOnFocus();
    },

    // public
    start: function()
    {
        if (this.toolbar.is())
        {
            this._buildButtons();
            this._initToolbar();
            this._initButtons();
        }
    },
    stop: function()
    {
        if (this.toolbarModule)
        {
            this.toolbarModule.stop();
        }
    },

    // private
    _buildButtons: function()
    {
        this.buttons = this.opts.buttons.concat();

        this._buildImageButton();
        this._buildFileButton();
        this._buildSourceButton();
        this._buildAdditionalButtons();
        this._buildHiddenButtons();
    },
    _buildImageButton: function()
    {
        if (!this.opts.imageUpload) this.utils.removeFromArrayByValue(this.buttons, 'image');
    },
    _buildFileButton: function()
    {
        if (!this.opts.fileUpload) this.utils.removeFromArrayByValue(this.buttons, 'file');
    },
    _buildSourceButton: function()
    {
        if (!this.opts.source) this.utils.removeFromArrayByValue(this.buttons, 'html');
    },
    _buildAdditionalButtons: function()
    {
        // end
        if (this.opts.buttonsAdd.length !== 0)
        {
            this.buttons = this.buttons.concat(this.opts.buttonsAdd);
        }

        // beginning
        if (this.opts.buttonsAddFirst.length !== 0)
        {
            this.buttons.unshift(this.opts.buttonsAddFirst);
        }

        // after
        if (this.opts.buttonsAddAfter !== false)
        {
            var index = this.buttons.indexOf(this.opts.buttonsAddAfter.after) + 1;
            var btns = this.opts.buttonsAddAfter.buttons;
            for (var i = 0; i < btns.length; i++)
            {
                this.buttons.splice(index+i, 0, btns[i]);
            }
        }

        // before
        if (this.opts.buttonsAddBefore !== false)
        {
            var index = this.buttons.indexOf(this.opts.buttonsAddBefore.before)+1;
            var btns = this.opts.buttonsAddBefore.buttons;
            for (var i = 0; i < btns.length; i++)
            {
                this.buttons.splice(index-(1-i), 0, btns[i]);
            }
        }
    },
    _buildHiddenButtons: function()
    {
        if (this.opts.buttonsHide.length !== 0)
        {
            var buttons = this.opts.buttonsHide;
            for (var i = 0; i < buttons.length; i++)
            {
                this.utils.removeFromArrayByValue(this.buttons, buttons[i]);
            }
        }
    },
    _setExternalOnFocus: function()
    {
        if (!this.opts.air && this.opts.toolbarExternal)
        {
            this.toolbarModule.setExternal();
        }
    },
    _initToolbar: function()
    {
        this.toolbarModule = (this.opts.air) ? $R.create('toolbar.air', this.app) : $R.create('toolbar.standard', this.app);
    },
    _initButtons: function()
    {
        for (var i = 0; i < this.buttons.length; i++)
        {
            var name = this.buttons[i];
            if ($R.buttons[name])
            {
                this.toolbar.addButton(name, $R.buttons[name]);
            }
        }
    }
});
$R.add('class', 'toolbar.air', {
    init: function(app)
    {
        this.app = app;
        this.$doc = app.$doc;
        this.$win = app.$win;
        this.utils = app.utils;
        this.editor = app.editor;
        this.animate = app.animate;
        this.toolbar = app.toolbar;
        this.container = app.container;
        this.inspector = app.inspector;
        this.selection = app.selection;

        // local
        this.clicks = 0;

        // init
        this._init();
    },
    // public
    stop: function()
    {
        var $wrapper = this.toolbar.getWrapper();
        $wrapper.remove();

        var $editor = this.editor.getElement();
        $editor.off('.redactor-air-trigger');

        this.$doc.off('.redactor-air');
        this.$doc.off('.redactor-air-trigger');

        this.toolbar.stopObservers();
    },
    createSourceHelper: function()
    {
        this.$airHelper = $R.dom('<span>');
        this.$airHelper.addClass('redactor-air-helper');
        this.$airHelper.html('<i class="re-icon-html"></i>');
        this.$airHelper.on('click', function(e)
        {
            e.preventDefault();
            this.app.api('module.source.hide');

        }.bind(this));

        var $container = this.container.getElement();
        $container.append(this.$airHelper);
    },
    destroySourceHelper: function()
    {
        if (this.$airHelper) this.$airHelper.remove();
    },
    openSelected: function()
    {
        setTimeout(function()
        {
            if (this._isSelection()) this._open(false);

        }.bind(this), 0);
    },

    // private
    _init: function()
    {
        this.toolbar.create();

        var $wrapper = this.toolbar.getWrapper();
        var $toolbar = this.toolbar.getElement();
        var $editor = this.editor.getElement();
        var $container = this.container.getElement();

        $wrapper.addClass('redactor-toolbar-wrapper-air');
        $toolbar.addClass('redactor-air');
        //$toolbar.addClass('redactor-animate-hide');
        $toolbar.hide();

        $wrapper.append($toolbar);
        $container.prepend($wrapper);

        // open selected
        this.openSelected();

        // events
        this.$doc.on('mouseup.redactor-air-trigger', this._open.bind(this));
        $editor.on('keyup.redactor-air-trigger', this._openCmd.bind(this));
    },
    _isSelection: function()
    {
        return (this.selection.is() && !this.selection.isCollapsed());
    },
    _isOpened: function()
    {
        var $toolbar = this.toolbar.getElement();

        return $toolbar.hasClass('open');
    },
    _open: function(e)
    {
        var target = (e) ? e.target : false;
        var $el = (e) ? $R.dom(e.target) : false;
        var dataTarget = this.inspector.parse(target);
        var isComponent = (dataTarget.isComponent() && !dataTarget.isComponentType('table'));
        var isFigcaption = (dataTarget.isFigcaption());
        var isModalTarget = ($el && $el.closest('.redactor-modal').length !== 0);
        var isButtonCall = (e && $el.closest('.re-button').length !== 0);
        var isDropdownCall = (e && $el.closest('.redactor-dropdown').length !== 0);

        if (isDropdownCall || isButtonCall || isModalTarget || isFigcaption || isComponent || this.toolbar.isContextBar() || !this._isSelection())
        {
            return;
        }

        var pos = this.selection.getPosition();

        setTimeout(function()
        {
            if (this._isSelection()) this._doOpen(pos);

        }.bind(this), 1);

    },
    _openCmd: function()
    {
        if (this.selection.isAll())
        {
            var $toolbar = this.toolbar.getElement();
            var pos = this.selection.getPosition();

            pos.top = (pos.top < 20) ? 0 : pos.top - $toolbar.height();
            pos.height = 0;

            this._doOpen(pos);
        }
    },
    _doOpen: function(pos)
    {
        var $wrapper = this.toolbar.getWrapper();
        var $toolbar = this.toolbar.getElement();
        var $container = this.container.getElement();
        var containerOffset = $container.offset();
        var leftFix = 0;

        $wrapper.css({
			left: (pos.left - containerOffset.left - leftFix) + 'px',
			top: (pos.top - containerOffset.top + pos.height + this.$doc.scrollTop()) + 'px'
		});

        this.app.broadcast('airOpen');
        $toolbar.addClass('open');
        $toolbar.show();
        //this.animate.start($toolbar, 'fadeIn', this._opened.bind(this));
        this._opened();
    },
    _opened: function()
    {
        this.$doc.on('click.redactor-air', this._close.bind(this));
        this.$doc.on('keydown.redactor-air', this._close.bind(this));
        this.app.broadcast('airOpened');
    },
    _close: function(e)
    {
        var target = (e) ? e.target : false;
        var $el = (e) ? $R.dom(e.target) : false;
        var dataTarget = this.inspector.parse(target);
        var isDropdownCall = (e && $el.closest('[data-dropdown], .redactor-dropdown-not-close').length !== 0);
        var isButtonCall = (!isDropdownCall && e && $el.closest('.re-button').length !== 0);

        if (!isButtonCall && (isDropdownCall || !this._isOpened()))
        {
            return;
        }

        // close
        this.app.broadcast('airClose');

        var $toolbar = this.toolbar.getElement();
        $toolbar.removeClass('open');
        $toolbar.hide();
        this._closed();

        //this.animate.start($toolbar, 'fadeOut', this._closed.bind(this));
    },
    _closed: function()
    {
        this.$doc.off('.redactor-air');
        this.app.broadcast('airClosed');
    }
});
$R.add('class', 'toolbar.fixed', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.$win = app.$win;
        this.editor = app.editor;
        this.toolbar = app.toolbar;
        this.detector = app.detector;
        this.container = app.container;

        // init
        this._init();
    },
    // public
    stop: function()
    {
        this.$fixedTarget.off('.redactor-toolbar');
        this.$win.off('.redactor-toolbar');

        var $editor = this.editor.getElement();
        $editor.off('.redactor-toolbar');
    },
    reset: function()
    {
        var $toolbar = this.toolbar.getElement();
        var $wrapper = this.toolbar.getWrapper();

        $wrapper.css('height', '');
        $toolbar.removeClass('redactor-toolbar-fixed');
        $toolbar.css({ position: '', top: '', left: '', width: '' });

        var dropdown = this.toolbar.getDropdown();
        if (dropdown) dropdown.updatePosition();
    },

    // private
    _init: function()
    {
        var isTarget = (this.opts.toolbarFixedTarget !== document);

        this.$fixedTarget = (isTarget) ? $R.dom(this.opts.toolbarFixedTarget) : this.$win;
        this._doFixed();

        if (isTarget)
        {
            this.$win.on('scroll.redactor-toolbar', this._doFixed.bind(this));
            this.$win.on('resize.redactor-toolbar', this._doFixed.bind(this));
        }

        this.$fixedTarget.on('scroll.redactor-toolbar', this._doFixed.bind(this));
        this.$fixedTarget.on('resize.redactor-toolbar', this._doFixed.bind(this));

        var $editor = this.editor.getElement();
        $editor.on('keyup.redactor-toolbar', this._checkFixed.bind(this));

    },
    _checkFixed: function()
    {
        if (this.editor.isEmpty())
        {
            this.reset();
        }
    },
    _doFixed: function()
    {
        var $editor = this.editor.getElement();
        var $container = this.container.getElement();
        var $toolbar = this.toolbar.getElement();
        var $wrapper = this.toolbar.getWrapper();

        var $targets = $container.parents().filter(function(node)
        {
            return (getComputedStyle(node, null).display === 'none') ? node : false;
        });

        // has hidden parent
        if ($targets.length !== 0) return;

        var isHeight = ($editor.height() < 100);
        var isEmpty = this.editor.isEmpty();

        if (isHeight || isEmpty || this.editor.isSourceMode()) return;

        var toolbarHeight = $toolbar.height();
        var toleranceEnd = 60;
        var containerPosition = $container.position();
        var boxOffset = containerPosition.top;
        var boxEnd = boxOffset + $container.height() - (toleranceEnd + this.opts.toolbarFixedTopOffset);
        var scrollOffset = this.$fixedTarget.scrollTop();
        var top = (this.opts.toolbarFixedTarget === document) ? 0 : this.$fixedTarget.offset().top - this.$win.scrollTop();

        if (scrollOffset > boxOffset && scrollOffset < boxEnd)
        {
            var position = (this.detector.isDesktop()) ? 'fixed' : 'absolute';
            top = (this.detector.isDesktop()) ? top : (scrollOffset - boxOffset + this.opts.toolbarFixedTopOffset);

            if (this.detector.isMobile())
            {
                if (this.fixedScrollTimeout)
                {
                    clearTimeout(this.fixedScrollTimeout);
                }

                $toolbar.hide();
                this.fixedScrollTimeout = setTimeout(function()
                {
                    $toolbar.show();
                }, 250);
            }

            $wrapper.height(toolbarHeight);
            $toolbar.addClass('redactor-toolbar-fixed');
            $toolbar.css({
                position: position,
                top: (top + this.opts.toolbarFixedTopOffset) + 'px',
                width: $container.width() + 'px'
            });

            var dropdown = this.toolbar.getDropdown();
            if (dropdown) dropdown.updatePosition();

            this.app.broadcast('toolbar.fixed');
        }
        else
        {
            this.reset();
            this.app.broadcast('toolbar.unfixed');
        }
    }
});
$R.add('class', 'toolbar.standard', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.uuid = app.uuid;
        this.toolbar = app.toolbar;
        this.container = app.container;

        // local
        this.isExternalMultiple = false;
        this.toolbarFixed = false;

        // init
        this._init();
    },
    // public
    stop: function()
    {
        var $wrapper = this.toolbar.getWrapper();
        $wrapper.remove();

        if (this.toolbarFixed) this.toolbarFixed.stop();
        if (this.opts.toolbarExternal) this._findToolbars();

        this.toolbar.stopObservers();
    },
    setExternal: function()
    {
        this._findToolbars();
        if (this.isExternalMultiple)
        {
            this.$toolbars.hide();
            var $current = this.$external.find('.redactor-toolbar-external-' + this.uuid);
            $current.show();
        }
    },
    resetPosition: function()
    {
        if (this.toolbarFixed) this.toolbarFixed.reset();
    },

    // private
    _init: function()
    {
        this._build();

        if (this.opts.toolbarExternal)
        {
            this._buildExternal();
        }
        else
        {
            this._buildFixed();

            var $toolbar = this.toolbar.getElement();
            $toolbar.show();
        }
    },
    _build: function()
    {
        this.toolbar.create();

        var $wrapper = this.toolbar.getWrapper();
        var $toolbar = this.toolbar.getElement();

        $wrapper.addClass('redactor-toolbar-wrapper');
        $toolbar.addClass('redactor-toolbar');
        $toolbar.hide();
        $wrapper.append($toolbar);

        if (!this.opts.toolbarExternal)
        {
            var $container = this.container.getElement();
            $container.prepend($wrapper);
        }
	},
	_buildExternal: function()
	{
        this._initExternal();
        this._findToolbars();

        if (this.isExternalMultiple)
        {
            this._hideToolbarsExceptFirst();
        }
        else
        {
            var $toolbar = this.toolbar.getElement();
            $toolbar.show();
        }
	},
	_buildFixed: function()
	{
        if (this.opts.toolbarFixed)
        {
            this.toolbarFixed = $R.create('toolbar.fixed', this.app);
        }
	},
    _initExternal: function()
    {
        var $toolbar = this.toolbar.getElement();
        var $wrapper = this.toolbar.getElement();

        $toolbar.addClass('redactor-toolbar-external redactor-toolbar-external-' + this.uuid);

        this.$external = $R.dom(this.opts.toolbarExternal);
        this.$external.append($wrapper);

    },
    _findToolbars: function()
    {
        this.$toolbars = this.$external.find('.redactor-toolbar-external');
        this.isExternalMultiple = (this.$toolbars.length > 1);
    },
    _hideToolbarsExceptFirst: function()
    {
        this.$toolbars.hide();
        var $first = this.$toolbars.first();
        $first.show();
    }
});
$R.add('module', 'line', {
    init: function(app)
    {
        this.app = app;
        this.lang = app.lang;
        this.component = app.component;
        this.inspector = app.inspector;
        this.insertion = app.insertion;
    },
    // messages
    oncontextbar: function(e, contextbar)
    {
        var data = this.inspector.parse(e.target)
        if (data.isComponentType('line'))
        {
            var node = data.getComponent();
            var buttons = {
                "remove": {
                    title: this.lang.get('delete'),
                    api: 'module.line.remove',
                    args: node
                }
            };

            contextbar.set(e, node, buttons, 'bottom');
        }

    },

    // public
    insert: function()
    {
        var line = this.component.create('line');
        this.insertion.insertRaw(line);
    },
    remove: function(node)
    {
        this.component.remove(node);
    }
});
$R.add('class', 'line.component', {
    mixins: ['dom', 'component'],
    init: function(app, el)
    {
        this.app = app;

        // init
        return (el && el.cmnt !== undefined) ? el : this._init(el);
    },
    // private
    _init: function(el)
    {
        var wrapper, element;
        if (typeof el !== 'undefined')
        {
            var $node = $R.dom(el);
            var node = $node.get();

            if (node.tagName === 'HR') element = node;
            else if (node.tagName === 'FIGURE')
            {
                wrapper = node;
                element = $node.find('hr').get();
            }
        }

        this._buildWrapper(wrapper);
        this._buildElement(element);
        this._initWrapper();
    },
    _buildElement: function(node)
    {
        if (node)
        {
            this.$element = $R.dom(node);
        }
        else
        {
            this.$element = $R.dom('<hr>');
            this.append(this.$element);
        }
    },
    _buildWrapper: function(node)
    {
        node = node || '<figure>';

        this.parse(node);
    },
    _initWrapper: function()
    {
        this.addClass('redactor-component');
        this.attr({
            'data-redactor-type': 'line',
            'tabindex': '-1',
            'contenteditable': false
        });
    }
});
$R.add('module', 'link', {
    modals: {
        'link':
            '<form action=""> \
                <div class="form-item"> \
                    <label>URL <span class="req">*</span></label> \
                    <input type="text" name="url"> \
                </div> \
                <div class="form-item"> \
                    <label>## text ##</label> \
                    <input type="text" name="text"> \
                </div> \
                <div class="form-item form-item-target"> \
                    <label class="checkbox"> \
                        <input type="checkbox" name="target"> ## link-in-new-tab ## \
                    </label> \
                </div> \
            </form>'
    },
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.lang = app.lang;
        this.utils = app.utils;
        this.caret = app.caret;
        this.inline = app.inline;
        this.editor = app.editor;
        this.inspector = app.inspector;
        this.insertion = app.insertion;
        this.selection = app.selection;

        // local
        this.isCurrentLink = false;
        this.currentText = false;
    },
    // messages
    onmodal: {
        link: {
            open: function($modal, $form)
            {
                this._setFormData($form, $modal);
            },
            opened: function($modal, $form)
            {
                this._setFormFocus($form);
            },
            update: function($modal, $form)
            {
                var data = $form.getData();
                if (this._validateData($form, data))
                {
                    this._update(data);
                }
            },
            insert: function($modal, $form)
            {
                var data = $form.getData();
                if (this._validateData($form, data))
                {
                    this._insert(data);
                }
            },
            unlink: function($modal, $form)
            {
                this._unlink();
            }
        }
    },
    onbutton: {
        link: {
            observe: function(button)
            {
                this._observeButton(button);
            }
        }
    },
    ondropdown: {
        link: {
            observe: function(dropdown)
            {
                this._observeUnlink(dropdown);
                this._observeEdit(dropdown);
            }
        }
    },
    oncontextbar: function(e, contextbar)
    {
        var current = this._getCurrent();
        var data = this.inspector.parse(current);
        if (data.isLink())
        {
            var node = data.getLink();
            var $el = $R.dom(node);

            var $point = $R.dom('<a>');
            var url = $el.attr('href');

            $point.text(this._truncateText(url));
            $point.attr('href', url);
            $point.attr('target', '_blank');

            var buttons = {
                "link": {
                    title: $point
                },
                "edit": {
                    title: this.lang.get('edit'),
                    api: 'module.link.open'
                },
                "unlink": {
                    title: this.lang.get('unlink'),
                    api: 'module.link.unlink'
                }
            };

            contextbar.set(e, node, buttons, 'bottom');
        }
    },

    // public
    open: function()
    {
        this.$link = this._buildCurrent();
        this.app.api('module.modal.build', this._getModalData());
    },
    insert: function(data)
    {
        this._insert(data);
    },
    update: function(data)
    {
        this._update(data);
    },
    unlink: function()
    {
        this._unlink();
    },

    // private
    _observeButton: function(button)
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);

        if (data.isPre() || data.isCode())
        {
            button.disable();
        }
        else
        {
            button.enable();
        }
    },
    _observeUnlink: function(dropdown)
    {
        var $item = dropdown.getItem('unlink');
        var links = this._getLinks();

        if (links.length === 0) $item.disable();
        else                    $item.enable();
    },
    _observeEdit: function(dropdown)
    {
        var current = this._getCurrent();
        var $item = dropdown.getItem('link');

        var data = this.inspector.parse(current);
        var title = (data.isLink()) ? this.lang.get('link-edit') : this.lang.get('link-insert');

        $item.setTitle(title);
    },
    _unlink: function()
    {
        this.app.api('module.modal.close');

        var elms = [];
        var nodes = this._getLinks();

        this.selection.save();
        for (var i = 0; i < nodes.length; i++)
        {
            var $link = $R.create('link.component', this.app, nodes[i]);
            elms.push(this.selection.getElement(nodes[i]));

            $link.unwrap();

            // callback
            this.app.broadcast('link.deleted', $link);
        }
        this.selection.restore();

        // normalize
        for (var i = 0; i < elms.length; i++)
        {
            var el = (elms[i]) ? elms[i] : this.editor.getElement();
            this.utils.normalizeTextNodes(el);
        }

        this._resetCurrent();
    },
    _update: function(data)
    {
        this.app.api('module.modal.close');

        var nodes = this._getLinks();
        this._setLinkData(nodes, data, 'updated');
        this._resetCurrent();
    },
    _insert: function(data)
    {
        this.app.api('module.modal.close');

        var links = this._getLinks();
        if (!this._insertSingle(links, data))
        {
            this._removeInSelection(links);
            this._insertMultiple(data);
        }

        this._resetCurrent();
    },
    _removeInSelection: function(links)
    {
        this.selection.save();
        for (var i = 0; i < links.length; i++)
        {
            var $link = $R.create('link.component', this.app, links[i]);
            var $clonedLink = $link.clone();
            $link.unwrap();

            // callback
            this.app.broadcast('link.deleted', $clonedLink);
        }
        this.selection.restore();
    },
    _insertMultiple: function(data)
    {
        var range = this.selection.getRange();
        if (range && this._isCurrentTextChanged(data))
        {
            this._deleteContents(range);
        }

        var nodes = this.inline.format({ tag: 'a' });
        this._setLinkData(nodes, data, 'inserted');
    },
    _insertSingle: function(links, data)
    {
        var inline = this.selection.getInline();
        if (links.length === 1 && (links[0].textContext === this.selection.getText()) || (inline && inline.tagName === 'A'))
        {
            var $link = $R.create('link.component', this.app, links[0]);
            $link.setData(data);

            // caret
            this.caret.set($link);

            // callback
            this.app.broadcast('link.inserted', $link);

            return true;
        }

        return false;
    },
    _setLinkData: function(nodes, data, type)
    {
        data.text = (data.text.trim() === '') ? this._truncateText(data.url) : data.text;

        var isTextChanged = (!this.currentText || this.currentText !== data.text);

        this.selection.save();
        for (var i = 0; i < nodes.length; i++)
        {
            var $link = $R.create('link.component', this.app, nodes[i]);
            var linkData = {};

            if (data.text && isTextChanged) linkData.text = data.text;
            if (data.url) linkData.url = data.url;
            if (data.target !== undefined) linkData.target = data.target;

            $link.setData(linkData);

            // callback
            this.app.broadcast('link.' + type, $link);
        }

        setTimeout(this.selection.restore.bind(this.selection), 0);
    },
    _deleteContents: function(range)
    {
        var html = this.selection.getHtml();
        var parsed = this.utils.parseHtml(html);
        var first = parsed.nodes[0];

        if (first && first.nodeType !== 3)
        {
            var tag = first.tagName.toLowerCase();
            var container = document.createElement(tag);

            this.insertion.insertNode(container, 'start');
        }
        else
        {
            range.deleteContents();
        }
    },
    _getModalData: function()
    {
        var commands;
        if (this._isLink())
        {
           commands = {
                update: { title: this.lang.get('save') },
                unlink: { title: this.lang.get('unlink'), type: 'danger' },
                cancel: { title: this.lang.get('cancel') }
            };
        }
        else
        {
            commands = {
                insert: { title: this.lang.get('insert') },
                cancel: { title: this.lang.get('cancel') }
            };
        }

        var modalData = {
            name: 'link',
            title: (this._isLink()) ? this.lang.get('link-edit') : this.lang.get('link-insert'),
            handle: (this._isLink()) ? 'update' : 'insert',
            commands: commands
        };


        return modalData;
    },
    _isLink: function()
    {
        return this.currentLink;
    },
    _isCurrentTextChanged: function(data)
    {
        return (this.currentText && this.currentText !== data.text);
    },
    _buildCurrent: function()
    {
        var current = this._getCurrent();
        var data = this.inspector.parse(current);

        if (data.isLink())
        {
            this.currentLink = true;

            var $link = data.getLink();
            $link = $R.create('link.component', this.app, $link);
        }
        else
        {
            this.currentLink = false;

            var $link = $R.create('link.component', this.app);
            var linkData = {
                text: this.selection.getText()
            };

            $link.setData(linkData);
        }

        return $link;
    },
    _getCurrent: function()
    {
        return this.selection.getInlinesAllSelected({ tags: ['a'] })[0];
    },
    _getLinks: function()
    {
        var links = this.selection.getInlines({ all: true, tags: ['a'] });
        var arr = [];
        for (var i = 0; i < links.length; i++)
        {
            var data = this.inspector.parse(links[i]);
            if (data.isLink())
            {
                arr.push(links[i]);
            }
        }

        return arr;
    },
    _resetCurrent: function()
    {
        this.isCurrentLink = false;
        this.currentText = false;
    },
    _truncateText: function(url)
	{
		return (url.length > this.opts.linkSize) ? url.substring(0, this.opts.linkSize) + '...' : url;
	},
	_validateData: function($form, data)
	{
    	return (data.url.trim() === '') ? $form.setError('url') : true;
	},
    _setFormFocus: function($form)
    {
        $form.getField('url').focus();
    },
    _setFormData: function($form, $modal)
    {
        var linkData = this.$link.getData();
        var data = {
            url: linkData.url,
            text: linkData.text,
            target: (this.opts.linkTarget || linkData.target)
        };

        if (!this.opts.linkNewTab) $modal.find('.form-item-target').hide();

        $form.setData(data);
        this.currentText = $form.getField('text').val();
    }
});
$R.add('class', 'link.component', {
    mixins: ['dom', 'component'],
    init: function(app, el)
    {
        this.app = app;
        this.opts = app.opts;
        this.marker = app.marker;

        // local
        this.reUrl = new RegExp('^((https?|ftp):\\/\\/)?(([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$','i');

        // init
        return (el && el.cmnt !== undefined) ? el :  this._init(el);
    },

    // public
    setData: function(data)
    {
        for (var name in data)
        {
            this._set(name, data[name]);
        }
    },
    getData: function()
    {
        var names = ['url', 'text', 'target'];
        var data = {};

        for (var i = 0; i < names.length; i++)
        {
            data[names[i]] = this._get(names[i]);
        }

        return data;
    },

    // private
    _init: function(el)
    {
        var $el = $R.dom(el);
        if (el === undefined)
        {
            this.parse('<a>');
        }
        else
        {
            this.parse($el);
        }
    },
    _set: function(name, value)
    {
        this['_set_' + name](value);
    },
    _get: function(name)
    {
        return this['_get_' + name]();
    },
    _get_target: function()
    {
        return (this.attr('target')) ? this.attr('target') : false;
    },
    _get_url: function()
    {
        return this.attr('href');
    },
    _get_text: function()
    {
        return this._getContext().text();
    },
    _getContext: function()
    {
        return this._findDeepestChild(this).element;
    },
    _set_target: function(target)
    {
        if (target === false) this.removeAttr('target');
        else if (target)
        {
            this.attr('target', (target === true) ? '_blank' : target);
        }
    },
    _set_text: function(text)
    {
        var html = this._getContext().html();
        var start = this.marker.find('start', this);
        var end = this.marker.find('end', this);
        var startHtml = this.marker.buildHtml('start');
        var endHtml = this.marker.buildHtml('end');

        if (start && end)
        {
            text = startHtml + text + endHtml;
        }
        else if (start || end)
        {
            text = text + startHtml;
        }

        this._getContext().html(text);
    },
    _set_url: function(url)
    {
        if (this.opts.linkValidation)
        {
            url = this._cleanUrl(url);
            url = (this._isMailto(url)) ? 'mailto:' + url.replace('mailto:', '') : url;
            url = (this._isUrl(url)) ? 'http://' + url.replace(/(ftp|https?):\/\//gi, '') : url;
        }

        this.attr('href', url);
    },
    _isMailto: function(url)
    {
        return (url.search('@') !== -1 && /(ftp|https?):\/\//i.test(url) === false);
    },
    _isUrl: function(url)
    {
        return this.reUrl.test(url);
    },
    _cleanUrl: function(url)
    {
        return url.trim().replace(/[^\W\w\D\d+&\'@#/%?=~_|!:,.;\(\)]/gi, '');
    },
    _findDeepestChild: function(parent)
    {
        var result = {depth: 0, element: parent };

        parent.children().each(function(node)
        {
            var child = $R.dom(node);

            if (node.outerHTML !== parent.html())
            {
                return;
            }
            else
            {
                var childResult = this._findDeepestChild(child);
                if (childResult.depth + 1 > result.depth)
                {
                    result = {
                        depth: 1 + childResult.depth,
                        element: childResult.element
                    };
                }
            }
        }.bind(this));

        return result;
    }
});
$R.add('module', 'modal', {
    init: function(app)
    {
        this.app = app;
        this.lang = app.lang;
        this.$doc = app.$doc;
        this.$win = app.$win;
        this.$body = app.$body;
        this.animate = app.animate;
        this.detector = app.detector;
        this.selection = app.selection;

        // local
        this.$box = false;
        this.$modal = false;

        // defaults
        this.defaults = {
            name: false,
            url: false,
            title: false,
            width: '600px',
            height: false,
            handle: false,
            commands: false
        };
    },
    // public
    build: function(data)
    {
        this._open(data);
    },
    close: function()
    {
        this._close();
    },
    stop: function()
    {
        if (this.$box)
        {
            this.$box.remove();
            this.$box = false;
            this.$modal = false;

            this.$doc.off('.redactor.modal');
            this.$win.off('.redactor.modal');
        }

        if (this.$overlay)
        {
            this.$overlay.remove();
        }
    },
	resize: function()
	{
    	this.$modal.setWidth(this.p.width);
        this.$modal.updatePosition();
	},

    // private
    _isOpened: function()
    {
        return (this.$modal && this.$modal.hasClass('open'));
    },
    _open: function(data)
    {
        this._buildDefaults(data);

        if (this.p.url) this._openUrl();
        else this._openTemplate();
    },
    _openUrl: function()
    {
        $R.ajax.post({
            url: this.p.url,
            success: this._doOpen.bind(this)
        });
    },
    _openTemplate: function()
    {
        if (typeof $R.modals[this.p.name] !== 'undefined')
        {
            var template = this.lang.parse($R.modals[this.p.name]);
            this._doOpen(template);
        }
    },
    _doOpen: function(template)
    {
        this.stop();
        this.selection.saveMarkers();

        if (!this.detector.isDesktop())
		{
			document.activeElement.blur();
		}

        this._createModal(template);

        this._buildModalBox();
        this._buildOverlay();
        this._buildModal();
        this._buildModalForm();
        this._buildModalCommands();

        this._broadcast('open');

        this.$modal.updatePosition();
        this._buildModalTabs();

        this.animate.start(this.$box, 'fadeIn', this._opened.bind(this));
        this.animate.start(this.$overlay, 'fadeIn');

    },
    _opened: function()
    {
        this.$modal.addClass('open');
        this.$box.on('mousedown.redactor.modal', this._close.bind(this));
        this.$doc.on('keyup.redactor.modal', this._handleEscape.bind(this));
        this.$win.on('resize.redactor.modal', this.resize.bind(this));
		this.$modal.getBody().find('input[type=text],input[type=url],input[type=email]').on('keydown.redactor.modal', this._handleEnter.bind(this));

        this._broadcast('opened');
    },
    _close: function(e)
    {
        if (!this.$box || !this._isOpened()) return;

        if (e)
        {
            if (!this._needToClose(e.target))
            {
                return;
            }

            e.stopPropagation();
            e.preventDefault();
        }

        this.selection.restoreMarkers();

        this._broadcast('close');

        this.animate.start(this.$box, 'fadeOut', this._closed.bind(this));
        this.animate.start(this.$overlay, 'fadeOut');
    },
    _closed: function()
    {
        this.$modal.removeClass('open');
        this.$box.off('.redactor.modal');
        this.$doc.off('.redactor.modal');
        this.$win.off('.redactor.modal');

        this._broadcast('closed');
    },
	_createModal: function(template)
	{
    	this.$modal = $R.create('modal.element', this.app, template);
	},
	_broadcast: function(message)
	{
    	this.app.broadcast('modal.' + message, this.$modal, this.$modalForm);
        this.app.broadcast('modal.' + this.p.name + '.' + message, this.$modal, this.$modalForm);
	},
    _buildDefaults: function(data)
    {
         this.p = $R.extend({}, this.defaults, data);
    },
	_buildModalBox: function()
	{
        this.$box = $R.dom('<div>');
        this.$box.attr('id', 'redactor-modal');
        this.$box.addClass('redactor-animate-hide');
        this.$box.html('');
        this.$body.append(this.$box);
	},
	_buildOverlay: function()
	{
		this.$overlay = $R.dom('#redactor-overlay');
		if (this.$overlay.length === 0)
		{
			this.$overlay = $R.dom('<div>');
			this.$overlay.attr('id', 'redactor-overlay');
			this.$overlay.addClass('redactor-animate-hide');
			this.$body.prepend(this.$overlay);
		}
	},
	_buildModal: function()
	{
    	this.$box.append(this.$modal);

        this.$modal.setTitle(this.p.title);
        this.$modal.setHeight(this.p.height);
    	this.$modal.setWidth(this.p.width);
	},
	_buildModalCommands: function()
	{
    	if (this.p.commands)
    	{
        	var commands = this.p.commands;
        	var $footer = this.$modal.getFooter();
        	for (var key in commands)
        	{
                var $btn = $R.dom('<button>');

                $btn.html(commands[key].title);
                $btn.attr('data-command', key);

                // cancel
                if (key === 'cancel')
                {
                    $btn.attr('data-action', 'close');
                    $btn.addClass('redactor-button-unstyled');
                }

                // danger
                if (typeof commands[key].type !== 'undefined' && commands[key].type === 'danger')
                {
                    $btn.addClass('redactor-button-danger');
                }

                $btn.on('click', this._handleCommand.bind(this));

                $footer.append($btn);
        	}
    	}

    },
    _buildModalTabs: function()
    {
        var $body = this.$modal.getBody();
        var $tabs = $body.find('.redactor-modal-tab');
        var $box = $body.find('.redactor-modal-tabs');

        if ($tabs.length > 1)
        {
            $box = ($box.length === 0) ? $R.dom('<div>') : $box.html('');
            $box.addClass('redactor-modal-tabs');

            $tabs.each(function(node, i)
			{
    			var $node = $R.dom(node);
				var $item = $R.dom('<a>');
				$item.attr('href', '#');
				$item.attr('rel', i);
				$item.text($node.attr('data-title'));
				$item.on('click', this._showTab.bind(this));

				if (i === 0)
				{
					$item.addClass('active');
				}

				$box.append($item);

			}.bind(this));

			$body.prepend($box)
        }
    },
	_buildModalForm: function()
	{
        this.$modalForm = $R.create('modal.form', this.app, this.$modal.getForm());
	},
	_showTab: function(e)
	{
        e.preventDefault();

		var $el = $R.dom(e.target);
		var index = $el.attr('rel');
        var $body = this.$modal.getBody();
        var $tabs = $body.find('.redactor-modal-tab');

		$tabs.hide();
		$tabs.eq(index).show();

        $body.find('.redactor-modal-tabs a').removeClass('active');
		$el.addClass('active');

	},
	_needToClose: function(el)
	{
        var $target = $R.dom(el);
        if ($target.attr('data-action') === 'close' || this.$modal.isCloseNode(el) || $target.closest('.redactor-modal').length === 0)
    	{
        	return true;
    	}

    	return false;
	},
	_handleCommand: function(e)
	{
    	var $btn = $R.dom(e.target).closest('button');
    	var command = $btn.attr('data-command');

        if (command !== 'cancel') e.preventDefault();

        this._broadcast(command);

	},
	_handleEnter: function(e)
	{
    	if (e.which === 13)
    	{
        	if (this.p.handle)
        	{
            	e.preventDefault();
            	this._broadcast(this.p.handle);
        	}
        }
	},
	_handleEscape: function(e)
	{
    	if (e.which === 27) this._close();
	}
});
$R.add('class', 'modal.element', {
    mixins: ['dom'],
    init: function(app, template)
    {
        this.app = app;
        this.$win = app.$win;

        // init
        this._init(template);
    },

    // get
    getForm: function()
    {
        return this.find('form');
    },
    getHeader: function()
    {
        return this.$modalHeader;
    },
    getBody: function()
    {
        return this.$modalBody;
    },
    getFooter: function()
    {
        return this.$modalFooter;
    },

    // set
    setTitle: function(title)
    {
        if (title) this.$modalHeader.html(title);
    },
    setWidth: function(width)
    {
        width = (parseInt(width) >= this.$win.width()) ? '96%' : width;

        this.css('max-width', width);
    },
    setHeight: function(height)
    {
        if (height !== false) this.$modalBody.css('height', height);
    },

    // update
    updatePosition: function()
    {
        var width = this.width();
        this.css({ 'left': '50%', 'margin-left': '-' + (width/2) + 'px' });

        var windowHeight = this.$win.height();
        var height = this.height();
        var marginTop = (windowHeight/2 - height/2);

        if (height < windowHeight && marginTop !== 0)
        {
            this.css('margin-top', marginTop + 'px');
        }
    },

    // is
    isCloseNode: function(el)
    {
        return (el === this.$modalClose.get());
    },

    // private
    _init: function(template)
    {
        this._build();
        this._buildClose();
        this._buildHeader();
        this._buildBody();
        this._buildFooter();
        this._buildTemplate(template);
    },
    _build: function()
    {
        this.parse('<div>');
        this.addClass('redactor-modal');
    },
    _buildClose: function()
    {
        this.$modalClose = $R.dom('<span>');
        this.$modalClose.addClass('redactor-close');

        this.append(this.$modalClose);
    },
    _buildHeader: function()
    {
		this.$modalHeader = $R.dom('<div>');
		this.$modalHeader.addClass('redactor-modal-header');

        this.append(this.$modalHeader);
    },
    _buildBody: function()
    {
		this.$modalBody = $R.dom('<div>');
		this.$modalBody.addClass('redactor-modal-body');

        this.append(this.$modalBody);
    },
    _buildFooter: function()
    {
		this.$modalFooter = $R.dom('<div>');
		this.$modalFooter.addClass('redactor-modal-footer');

        this.append(this.$modalFooter);
    },
    _buildTemplate: function(template)
    {
        this.$modalBody.html(template);
    }
});
$R.add('class', 'modal.form', {
    mixins: ['dom'],
    init: function(app, element)
    {
        this.app = app;

        // build
        this.build(element);
    },

    // public
    build: function(element)
    {
        this.parse(element);
    },
    getData: function()
    {
        var data = {};
        this.find('[name]').each(function(node)
        {
            var $node = $R.dom(node);
            data[$node.attr('name')] = $node.val();
        });

        return data;
    },
    setData: function(data)
    {
        this.find('[name]').each(function(node)
        {
            var $node = $R.dom(node);
            var name = $node.attr('name');
            if (data.hasOwnProperty(name))
            {
                if (node.type && node.type === 'checkbox') node.checked = data[name];
                else $node.val(data[name]);
            }
        });
    },
    getField: function(name)
    {
        return this.find('[name=' + name + ']');
    },
    setError: function(name)
    {
        var $el = this.getField(name);

        $el.addClass('error');
        $el.one(this._getFieldEventName($el.get()), this._clearError);

        return false;
    },

    // private
    _clearError: function()
    {
        return $R.dom(this).removeClass('error');
    },
    _getFieldEventName: function(el)
    {
		return (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio') ? 'change' : 'keyup';
    }
});
$R.add('module', 'block', {
    init: function(app)
    {
        this.app = app;
        this.block = app.block;
    },
    // public
    format: function(args)
    {
        var nodes = this.block.format(args);

        // callback
        this.app.broadcast('format', 'block', nodes);
    },
    clearformat: function()
    {
        this.block.clearFormat();
    },
    clearstyle: function()
    {
        this.block.clearStyle();
    },
    clearclass: function()
    {
        this.block.clearClass();
    },
    clearattr: function()
    {
        this.block.clearAttr();
    },
    add: function(args, tags)
    {
        this.block.add(args, tags);
    },
    toggle: function(args, tags)
    {
        this.block.toggle(args, tags);
    },
    set: function(args, tags)
    {
        this.block.set(args, tags);
    },
    remove: function(args, tags)
    {
        this.block.remove(args, tags);
    }
});
$R.add('module', 'inline', {
    init: function(app)
    {
        this.app = app;
        this.inline = app.inline;
    },
    format: function(args)
    {
        var nodes = this.inline.format(args);

        // callback
        this.app.broadcast('format', 'inline', nodes);
    },
    clearformat: function()
    {
        this.inline.clearFormat();
    },
    clearstyle: function()
    {
        this.inline.clearStyle();
    },
    clearclass: function()
    {
        this.inline.clearClass();
    },
    clearattr: function()
    {
        this.inline.clearAttr();
    },
    add: function(args, tags)
    {
        this.inline.add(args, tags);
    },
    toggle: function(args, tags)
    {
        this.inline.toggle(args, tags);
    },
    set: function(args, tags)
    {
        this.inline.set(args, tags);
    },
    remove: function(args, tags)
    {
        this.inline.remove(args, tags);
    }
});
$R.add('module', 'autosave', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.utils = app.utils;
        this.source = app.source;
    },
    // messages
    onsynced: function()
    {
        if (this.opts.autosave)
        {
            this._send();
        }
    },

    // private
    _send: function()
    {
        var name = (this.opts.autosaveName) ? this.opts.autosaveName : this.source.getName();

        var data = {};
        data[name] = this.source.getCode()
        data = this.utils.extendData(data, this.opts.autosaveData);

        $R.ajax.post({
            url: this.opts.autosave,
            data: data,
            success: this._complete.bind(this)
        });
    },
    _complete: function(response)
    {
        var callback = (response && response.error) ? 'autosaveError' : 'autosave';
        this.app.broadcast(callback, name, data, response);
    }
});
$R.add('module', 'input', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.editor = app.editor;
        this.keycodes = app.keycodes;
        this.element = app.element;
        this.selection = app.selection;
        this.insertion = app.insertion;
        this.inspector = app.inspector;
        this.autoparser = app.autoparser;

        // local
        this.lastShiftKey = false;
    },
    // messages
    onpaste: function(e, dataTransfer)
    {
        if (!this.opts.input) return;

        return $R.create('input.paste', this.app, e, dataTransfer);
    },
    onkeydown: function(e)
    {
        if (!this.opts.input) return;

        // key
        var key = e.which;

        // shortcuts
        var shortcut = $R.create('input.shortcut', this.app, e);
        if (shortcut.is()) return;

        // select all
        if ((e.ctrlKey || e.metaKey) && key === 65)
        {
            e.preventDefault();
            return this._selectAll();
        }

        // set empty if all selected
        var keys = [this.keycodes.ENTER, this.keycodes.SPACE, this.keycodes.BACKSPACE, this.keycodes.DELETE];
		if (this.selection.isAll() && (keys.indexOf(key) !== -1))
		{
    		e.preventDefault();

    		if (this.element.isType('inline'))
    		{
        		var $editor = this.editor.getElement();
        		$editor.html('');

        		this.editor.startFocus();
            }
            else this.insertion.set(this.opts.emptyHtml);

            return;
		}

        // autoparse
        if (this.opts.autoparse)
        {
            this.autoparser.format(e, key);
        }

		// input

		// a-z, 0-9
		if ((key >= 48 && key <= 57) || (key >= 65 && key <= 90))
		{
            // has non-editable
            if (this.selection.hasNonEditable())
            {
                e.preventDefault();
                return;
            }
		}

        // enter, shift/ctrl + enter
        if (key === this.keycodes.ENTER)
        {
            return $R.create('input.enter', this.app, e, key);
        }
        // cmd + [
        else if (e.metaKey && key === 219)
        {
            e.preventDefault();
            this.app.api('module.list.outdent');
            return;
        }
        // tab or cmd + ]
        else if (key === this.keycodes.TAB || e.metaKey && key === 221)
        {
            return $R.create('input.tab', this.app, e, key);
        }
        // space
        else if (key === this.keycodes.SPACE)
        {
            return $R.create('input.space', this.app, e, key, this.lastShiftKey);
        }
        // backspace or delete
        else if (this._isDeleteKey(key))
        {
            return $R.create('input.delete', this.app, e, key);
        }
        else if (this._isArrowKey(key))
        {
            return $R.create('input.arrow', this.app, e, key);
        }
    },
    onkeyup: function(e)
    {
        if (!this.opts.input) return;

        // key
        var key = e.which;

        // shift key
        this.lastShiftKey = e.shiftKey;

        // hide context toolbar
        this.app.broadcast('contextbar.close');

        // shortcode
        var shortcode = $R.create('input.shortcode', this.app, e, key);
        if (shortcode.is()) return;
    },

    // public
    start: function()
    {
        // extend shortcuts
        if (this.opts.shortcutsAdd)
        {
            this.opts.shortcuts = $R.extend({}, true, this.opts.shortcuts, this.opts.shortcutsAdd);
        }
    },

    // private
    _selectAll: function()
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);

        if (data.isComponentType('table'))
        {
            var el = data.getTable();
            this.selection.setAll(el);
            return;
        }
        else if (data.isComponentType('code'))
        {
            var el = data.getComponentCodeElement();
            this.selection.setAll(el);
            return;
        }

        this.selection.setAll();
    },
    _isArrowKey: function(key)
    {
        return ([this.keycodes.UP, this.keycodes.DOWN, this.keycodes.RIGHT, this.keycodes.LEFT].indexOf(key) !== -1);
    },
    _isDeleteKey: function(key)
    {
        return (key === this.keycodes.BACKSPACE || key === this.keycodes.DELETE);
    }
});
$R.add('class', 'input.arrow', {
    init: function(app, e, key)
    {
        this.app = app;
        this.opts = app.opts;
        this.utils = app.utils;
        this.caret = app.caret;
        this.editor = app.editor;
        this.keycodes = app.keycodes;
        this.component = app.component;
        this.inspector = app.inspector;
        this.selection = app.selection;

        // local
        this.key = key;

        // init
        this._init(e);
    },
    // private
    _init: function(e)
    {
        if (this._isRightDownKey())
        {
            if (this._isExitOnDownRightArrow(e)) return;
            if (this._selectComponent(e, 'End', 'nextSibling')) return;
        }

        if (this._isLeftUpKey())
        {
            if (this._selectComponent(e, 'Start', 'previousSibling')) return;
        }

        if (this._isRightLeftKey()) this._removeInvisibleSpace();
    },
    _isRightDownKey: function()
    {
        return ([this.keycodes.DOWN, this.keycodes.RIGHT].indexOf(this.key) !== -1);
    },
    _isLeftUpKey: function()
    {
        return ([this.keycodes.UP, this.keycodes.LEFT].indexOf(this.key) !== -1);
    },
    _isRightLeftKey: function()
    {
        return ([this.keycodes.RIGHT, this.keycodes.LEFT].indexOf(this.key) !== -1);
    },
    _isExitOnDownRightArrow: function(e)
    {
        var $editor = this.editor.getElement();
        var current = this.selection.getCurrent();
        var block = this.selection.getBlock(current);
        var data = this.inspector.parse(current);
        var isEnd = this.caret.isEnd(block);
        var isEndEditor = this.caret.isEnd();
        var isNextEnd = (isEnd && isEndEditor);

        // table
        if (data.isTable())
        {
            var isRightEnd = (isEnd && this.key === this.keycodes.RIGHT);
            if (isRightEnd || isNextEnd)
            {
                var component = data.getComponent();

                return this._exitNextElement(e, component);
            }
        }
        // figcaption
        else if (data.isFigcaption())
        {
            var block = data.getFigcaption();
            var isEnd = this.caret.isEnd(block);
            var isNextEnd = (isEnd && isEndEditor);
            if (isNextEnd)
            {
                var component = data.getComponent();

                return this._exitNextElement(e, component);
            }
        }
        // figure/code
        else if (data.isComponentType('code'))
        {
            var component = data.getComponent();
            if (!component.nextSibling)
            {
                e.preventDefault();
                var code = data.getComponentCodeElement();
                this._createExitNextMarkup(code);
                return true;
            }
        }
        // pre & blockquote & dl
        else if (data.isPre() || data.isBlockquote() || data.isDl())
        {
            if (isNextEnd)
            {
                if (data.isPre()) return this._exitNextElement(e, data.getPre());
                else if (data.isBlockquote()) return this._exitNextElement(e, data.getBlockquote());
                else if (data.isDl()) return this._exitNextElement(e, data.getDl());
            }
        }
        // li
        else if (data.isList())
        {
            var list = $R.dom(current).parents('ul, ol', $editor).last();
            var isEnd = this.caret.isEnd(list);
            var isNextEnd = (isEnd && isEndEditor);

            if (isNextEnd)
            {
                return this._exitNextElement(e, list);
            }
        }
        // component
        else if (data.isComponent() && !data.isComponentType('variable'))
        {
            if (!current.nextElementSibling)
            {
                e.preventDefault();
                var component = data.getComponent();
                this._createExitNextMarkup(component);
                return true;
            }

            this.component.clearActive();
        }
    },
    _exitNextElement: function(e, node)
    {
        e.preventDefault();

        if (node.nextSibling)
        {
            this.caret.setStart(node.nextSibling);
        }
        else
        {
            this._createExitNextMarkup(node);
        }

        return true;
    },
    _createExitNextMarkup: function(el)
    {
        var markup = document.createElement(this.opts.markup);
        var $el = $R.dom(el);

        $el.after(markup);
        this.caret.setStart(markup);
    },
    _removeInvisibleSpace: function()
    {
        var re = /^\u200B$/g;
        var current = this.selection.getCurrent();
        var $current = $R.dom(current);
        var $prev = (current.previousSibling) ? $R.dom(current.previousSibling) : false;
        var isEmpty = this.utils.isEmptyHtml($current.html());

		if (isEmpty && $current.text().search(re) === 0) $current.remove();
        if (this.key === this.keycodes.DELETE && $prev && $prev.text().search(re) === 0) $prev.remove();
    },
    _selectComponent: function(e, caret, type)
    {
        var current = this.selection.getCurrent();
        var block = this.selection.getBlock(current);
        var prev = this._findSiblings(current, type);
        var prevBlock = this._findSiblings(block, type);

        if (prev && this.caret['is' + caret](current))
        {
            this._selectComponentItem(e, prev, caret);
        }
        else if (prevBlock && this.caret['is' + caret](block))
        {
            this._selectComponentItem(e, prevBlock, caret);
        }
    },
    _selectComponentItem: function(e, item, caret)
    {
        var data = this.inspector.parse(item);
        if (data.isComponent() && !data.isComponentEditable())
        {
            e.preventDefault();
            this.caret['set' + caret](item);
            return true;
        }
    },
    _findSiblings: function(node, type)
    {
        while (node = node[type])
        {
            var isEmpty = false;
            if (node.nodeType === 3 && !this.opts.breakline)
            {
                isEmpty = (node.textContent.trim() === '');
            }

            if (!isEmpty && node.tagName !== 'BR') return node;
        }
    }
});
$R.add('class', 'input.delete', {
    init: function(app, e, key)
    {
        this.app = app;
        this.opts = app.opts;
        this.caret = app.caret;
        this.utils = app.utils;
        this.editor = app.editor;
        this.marker = app.marker;
        this.keycodes = app.keycodes;
        this.component = app.component;
        this.inspector = app.inspector;
        this.selection = app.selection;

        // local
        this.key = key;

        // init
        this._init(e);
    },
    // private
    _init: function(e)
    {
        if (this._removeActiveComponent(e)) return;
        if (this._removeAllSelectedTable(e)) return;

        var initialCurrent = this.selection.getCurrent();
        var current = this._getCurrent();
        var data = this.inspector.parse(current);
        var isStart = this.caret.isStart(current);
        var isEnd = this.caret.isEnd(current);
        var isStartBackspace = (isStart && this.key === this.keycodes.BACKSPACE);
        var isEndDelete = (isEnd && this.key === this.keycodes.DELETE);

        // variable select
        if (this.key === this.keycodes.BACKSPACE && initialCurrent && this.caret.isStart(initialCurrent) && initialCurrent.previousSibling)
        {
            e.preventDefault();
            this.caret.setStart(initialCurrent.previousSibling);
            return;
        }

        // is non-editable
        if (this._isNonEditable() || this.selection.hasNonEditable())
        {
            e.preventDefault();
            return;
        }

        // is empty
        if (this.key === this.keycodes.BACKSPACE && this.editor.isEmpty())
        {
            e.preventDefault();
            return;
        }

        // collapsed
        if (this.selection.isCollapsed())
        {
            // figure/code
            if (data.isComponentType('code') && (isStartBackspace || isEndDelete))
            {
                e.preventDefault();
                return;
            }

            // next / prev
            if (isStartBackspace) this._removePrev(e, current, data);
            else if (isEndDelete) this._removeNext(e, current, data);
        }

        this._removeInvisibleSpace();
        this._removeUnwantedStyles();
        this._removeEmptySpans();
        this._removeSpanTagsInHeadings();
        this._removeInlineTagsInPre();
    },
    _getCurrent: function()
    {
        var $editor = this.editor.getElement();
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var isList = data.isList();
        var isText = this.selection.isText();

        var block = this.selection.getBlock(current);
        block = (isList) ? $R.dom(current).parents('ul, ol', $editor).last().get() : block;
        block = (isText) ? current : block;

        return block;
    },
    _findSiblings: function(node, type)
    {
        while (node = node[type])
        {
            var isEmpty = false;
            if (node.nodeType === 3 && !this.opts.breakline)
            {
                isEmpty = (node.textContent.trim() === '');
            }

            if (!isEmpty && node.tagName !== 'BR') return node;
        }
    },
    _removePrev: function(e, current, data)
    {
        var prev = this._findSiblings(current, 'previousSibling');
        if (!prev)
        {
            return;
        }

        var dataPrev = this.inspector.parse(prev);
        var $current = $R.dom(current);
        var $prev = $R.dom(prev);

        // combine lists
        if (data.isList())
        {
            e.preventDefault();

            if (dataPrev.isList())
            {
                $current.children('li').first().prepend(this.marker.build('start'));
                $prev.append($current);
                $current.unwrap();

                this.selection.restoreMarkers();
            }
            else
            {
                var $first = $current.children('li').first();
                var first = $first.get();
                var $lists = $first.find('ul, ol');

                if (this.opts.markup === 'br')
                {
                    $current.before($first);
                    $first.prepend(this.marker.build('start'));
                    $first.prepend('<br>').append('<br>').unwrap();
                    this.selection.restoreMarkers();
                }
                else
                {
                    var $newnode = this.utils.replaceToTag(first, this.opts.markup);
                    $current.before($newnode);
                    this.caret.setStart($newnode);
                }

                if ($lists.length !== 0)
                {
                    $current.prepend($lists);
                    $lists.unwrap();
                }
            }

            return;
        }
        // figcaption
        else if (data.isFigcaption())
        {
            e.preventDefault();
            return;
        }
        // figure/code or table
        else if (dataPrev.isComponentEditable())
        {
            e.preventDefault();
            this.component.remove(prev, false);
            return;
        }
        // component
        else if (dataPrev.isComponent())
        {
            e.preventDefault();

            // remove current if empty
            if (this.utils.isEmptyHtml($current.html()))
            {
                $current.remove();
            }

            this.caret.setStart(prev);
            return;
        }
    },
    _removeNext: function(e, current, data)
    {
        var next = this._findSiblings(current, 'nextSibling');
        if (!next)
        {
            return;
        }

        var dataNext = this.inspector.parse(next);
        var $current = $R.dom(current);
        var $next = $R.dom(next);

        // next list
        if (dataNext.isList())
        {
            // current list
            if (data.isList())
            {
                e.preventDefault();

                $current.append($next);
                $next.unwrap();

                return;
            }
            else
            {
                var $first = $next.children('li').first();
                var first = $first.get();
                var $lists = $first.find('ul, ol');

                if ($lists.length !== 0)
                {
                    e.preventDefault();

                    $next.prepend($lists);
                    $lists.unwrap();

                    $current.append($first);
                    $first.unwrap()

                    return;
                }
            }
        }
        // figcaption
        else if (data.isFigcaption())
        {
            e.preventDefault();
            return;
        }
        // figure/code or table
        else if (dataNext.isComponentEditable())
        {
            e.preventDefault();
            this.component.remove(next, false);
            return;
        }
        // component
        else if (dataNext.isComponent())
        {
            e.preventDefault();
            this.caret.setStart(next);
            return;
        }
    },
    _removeActiveComponent: function(e)
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var component = data.getComponent();
        if (data.isComponent() && this.component.isActive(component))
        {
            e.preventDefault();
            this.component.remove(component);
            return true;
        }
    },
    _removeAllSelectedTable: function(e)
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var table = data.getTable();
        if (table && this.selection.isAll(table))
        {
            e.preventDefault();
            this.component.remove(table);
            return true;
        }
    },
    _removeUnwantedStyles: function()
    {
        var $editor = this.editor.getElement();

		setTimeout(function()
		{
			var $tags = $editor.find('*[style]');
			$tags.not('img, figure, iframe, [data-redactor-style-cache], [data-redactor-span]').removeAttr('style');

		}, 0);
    },
    _removeEmptySpans: function()
    {
        var $editor = this.editor.getElement();

        setTimeout(function()
		{
            $editor.find('span').each(function(node)
            {
                if (node.attributes.length === 0)
                {
                    $R.dom(node).replaceWith(node.childNodes);
                }
            });

        }, 0);
    },
    _removeInvisibleSpace: function()
    {
        var re = /^\u200B$/g;
        var current = this.selection.getCurrent();
        var $current = $R.dom(current);
        var $prev = (current && current.previousSibling) ? $R.dom(current.previousSibling) : false;
        var isEmpty = this.utils.isEmptyHtml($current.html());

		if (isEmpty && $current.text().search(re) === 0) $current.remove();
        if (this.key === this.keycodes.DELETE && $prev && $prev.text().search(re) === 0) $prev.remove();
    },
    _removeSpanTagsInHeadings: function()
    {
        var $editor = this.editor.getElement();

        setTimeout(function()
        {
            $editor.find('h1, h2, h3, h4, h5, h6').each(function(node)
            {
                var $node = $R.dom(node);
                if ($node.closest('figure').length === 0)
                {
                    $node.find('span').not('.redactor-component, .non-editable, .redactor-selection-marker').unwrap();
                }
            });

        }, 1);
    },
    _removeInlineTagsInPre: function()
    {
        var $editor = this.editor.getElement();
        var tags = this.opts.inlineTags;

        setTimeout(function()
        {
            $editor.find('pre').each(function(node)
            {
                var $node = $R.dom(node);
                if ($node.closest('figure').length === 0)
                {
                    $node.find(tags.join(',')).not('code, .redactor-selection-marker').unwrap();
                }
            });

        }, 1);
    },
    _isNonEditable: function()
    {
        // prev & next non editable
        var block = this.selection.getBlock();
        var blockSides = (this.caret.isStart(block) || this.caret.isEnd(block));
        var current = (block && blockSides) ? block : this.selection.getCurrent();
        if (!current) return false;

        var isBackspace = (this.key === this.keycodes.BACKSPACE);
        var type = (isBackspace) ? 'previousSibling' : 'nextSibling';
        var el = this._findSiblings(current, type);

        var isNon = ($R.dom(el).closest('.non-editable').length !== 0)

        if (isBackspace && this.caret.isStart(current) && isNon) return true;
        else if (!isBackspace && this.caret.isEnd(current) && isNon) return true;

        return false;
    }
});
$R.add('class', 'input.enter', {
    init: function(app, e, key)
    {
        this.app = app;
        this.opts = app.opts;
        this.utils = app.utils;
        this.caret = app.caret;
        this.editor = app.editor;
        this.insertion = app.insertion;
        this.selection = app.selection;
        this.inspector = app.inspector;

        // init
        this._init(e);
    },
    // private
    _init: function(e)
    {
        // turn off
        if (!this.opts.enterKey) return this._disable(e);

        // callback
        var stop = this.app.broadcast('enter', e);
    	if (stop === false) return e.preventDefault();

        // has non-editable
        if (this.selection.hasNonEditable())
        {
            e.preventDefault();
            return;
        }

        // shift enter
        if (e.ctrlKey || e.shiftKey) return this._insertBreak(e);

        // enter & exit
        if (this._isExit(e)) return;

        // traverse
        this._traverse(e);
    },
    _disable: function(e)
    {
        e.preventDefault();
        var range = this.selection.getRange();
        if (range && !range.collapsed) range.deleteContents();
    },
    _insertBreak: function(e)
    {
        e.preventDefault();

        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);

        if (data.isComponent() || data.isCode()) return;
        else if (data.isPre()) this.insertion.insertNewline();
        else this.insertion.insertBreakLine();
    },
    _isExit: function(e)
    {
        var $editor = this.editor.getElement();
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var block = this.selection.getBlock(current);
        var isEnd = this.caret.isEnd(block);
        var prev = current.previousSibling;

        // blockquote
        if (data.isBlockquote())
        {
            var isParagraphExit = (isEnd && this._isExitableBlock(block, 'P'));
            var isBreaklineExit = (isEnd && prev && prev.tagName === 'BR');
            var blockquote = data.getBlockquote();

            if (isParagraphExit || isBreaklineExit)
            {
                return this._exitFromElement(e, ((isBreaklineExit) ? prev : block), blockquote);
            }
        }
        // pre
        else if (!data.isComponentType('code') && data.isPre())
        {
            if (isEnd)
            {
                var html = block.innerHTML;
                if (html.replace(/[\u200B-\u200D\uFEFF]/g, '').match(/(\n\n\n)$/) !== null)
                {
                    $R.dom(prev.previousSibling.previousSibling).remove();
                    this._exitFromElement(e, prev, block);

                    return;
                }
            }
        }
        // dl
        else if (data.isDl())
        {
            if (isEnd && this._isExitableBlock(block, 'DT'))
            {
                var dl = data.getDl();

                return this._exitFromElement(e, block, dl);
            }
        }
        // li
        else if (data.isList())
        {
            var list = $R.dom(current).parents('ul, ol', $editor).last();
            var isEnd = this.caret.isEnd(list);
            if (isEnd && this._isExitableBlock(block, 'LI'))
            {
                return this._exitFromElement(e, block, list);
            }
        }
    },
    _isExitableBlock: function(block, tag)
    {
        return (block && block.tagName === tag && this.utils.isEmptyHtml(block.innerHTML));
    },
    _exitFromElement: function(e, prev, el)
    {
        e.preventDefault();

        var $prev = $R.dom(prev);
        $prev.remove();

        if (this.opts.markup === 'br') this.caret.setAfter(el);
        else this._createExitNextMarkup(el);

        return true;
    },
    _createExitNextMarkup: function(el)
    {
        var markup = document.createElement(this.opts.markup);
        var $el = $R.dom(el);

        $el.after(markup);
        this.caret.setStart(markup);
    },
    _traverse: function(e)
    {
        var current = this.selection.getCurrent();
        var isText = this.selection.isText();
        var data = this.inspector.parse(current);

        // pre
        if (data.isPre())
        {
            e.preventDefault();
            return this.insertion.insertNewline()
        }
        // blockquote
        else if (data.isBlockquote())
        {
            var block = this.selection.getBlock(current);
            if (block && block.tagName === 'BLOCKQUOTE')
            {
                e.preventDefault();
                return this.insertion.insertBreakLine()
            }
        }
        // figcaption
        else if (data.isFigcaption())
        {
            e.preventDefault();
            return;
        }
        // dl
        else if (data.isDl())
        {
            e.preventDefault();
            return this._traverseDl(current);
        }
        // text
        else if (isText)
        {
            e.preventDefault();
            return this.insertion.insertBreakLine();
        }
        // div / p
        else
        {
            setTimeout(this._replaceBlock.bind(this), 1);
            return;
        }
    },
    _traverseDl: function(current)
    {
        var block = this.selection.getBlock(current);
        var data = this.inspector.parse(block);
        var tag = data.getTag();
        var $el = $R.dom(block);
        var next = $el.get().nextSibling || false;
        var $next = $R.dom(next);
        var nextDd = (next && $next.is('dd'))
        var nextDt = (next && $next.is('dt'))
        var isEnd = this.caret.isEnd(block);

        if (tag === 'dt' && !nextDd && isEnd)
        {
            var dd = document.createElement('dd');
            $el.after(dd);

            this.caret.setStart(dd);
            return;
        }
        else if (tag === 'dd' && !nextDt && isEnd)
        {
            var dt = document.createElement('dt');
            $el.after(dt);

            this.caret.setStart(dt);
            return;
        }

        return this.insertion.insertBreakLine();
    },
    _replaceBlock: function()
    {
        var block = this.selection.getBlock();
        var $block = $R.dom(block);

        if (this.opts.markup !== 'div' && block && this._isNeedToReplaceBlock(block))
        {
            var markup = document.createElement(this.opts.markup);

			$block.replaceWith(markup);
			this.caret.setStart(markup);
        }
        else
        {
            if (block && this.utils.isEmptyHtml(block.innerHTML))
            {
                if (this.opts.cleanInlineOnEnter || block.innerHTML === '<br>')
                {
                    $block.html('');
                }

                this.caret.setStart(block);
            }
        }


        if (block && this._isNeedToCleanBlockStyle(block) && this.opts.cleanOnEnter)
        {
            $block.removeAttr('class style');
        }
    },
    _isNeedToReplaceBlock: function(block)
    {
        return (block.tagName === 'DIV' && this.utils.isEmptyHtml(block.innerHTML));
    },
    _isNeedToCleanBlockStyle: function(block)
    {
        return (block.tagName === 'P' && this.utils.isEmptyHtml(block.innerHTML));
    }
});
$R.add('class', 'input.paste', {
    init: function(app, e, dataTransfer)
    {
        this.app = app;
        this.opts = app.opts;
        this.editor = app.editor;
        this.cleaner = app.cleaner;
        this.container = app.container;
        this.inspector = app.inspector;
        this.insertion = app.insertion;
        this.selection = app.selection;
        this.autoparser = app.autoparser;

        // local
        this.dataTransfer = dataTransfer;

        // init
        this._init(e);
    },
    // private
    _init: function(e)
    {
        var clipboard = this.dataTransfer || e.clipboardData;
        var current = this.selection.getCurrent();
        var dataCurrent = this.inspector.parse(current);

        this.dropPasted = this.dataTransfer;
        this.isRawCode = (dataCurrent.isPre() || dataCurrent.isCode());

        this.editor.enablePasting();
        this.editor.saveScroll();

        if (!this.dropPasted)
        {
            this.selection.saveMarkers();
        }

        if (this.isRawCode || !clipboard)
        {
            this._getPastedUsingHiddenBox(e);
        }
        else
        {
            // html / text
            var url = clipboard.getData('URL');
            var html = (this._isPlainText(clipboard)) ? clipboard.getData("text/plain") : clipboard.getData("text/html");

            // safari anchor links
            html = (!url || url === '') ? html : url;

            // file
            var items = clipboard.items || clipboard.files;
            var isFiles = (clipboard.items) ? false : (clipboard.files);

            if (items && html === '')
            {
                var files = [];
                for (var i = 0; i < items.length; i++)
                {
                    var file = (isFiles) ? items[i] : items[i].getAsFile();
                    if (file) files.push(file);
                }

                if (files.length > 0)
                {
                    e.preventDefault();
                    this._insertFiles(e, files);
                    return;
                }
            }


            e.preventDefault();
            this._insert(e, html);
        }
    },
    _getPastedUsingHiddenBox: function(e)
    {
        this._createBox();

        setTimeout(function()
        {
            var html = this._getCodeFromBox();
            this._insert(e, html);

        }.bind(this), 1);
    },
    _createBox: function()
    {
		var $container = this.container.getElement();

		this.$pasteBox = (this.isRawCode) ? $R.dom('<textarea>') : $R.dom('<div contenteditable="true">');
		this.$pasteBox.css({ position: 'fixed', width: '1px', top: 0, left: '-9999px' });

        $container.append(this.$pasteBox);
		this.$pasteBox.focus();
    },
    _getCodeFromBox: function()
    {
        var html = (this.isRawCode) ? this.$pasteBox.val() : this.$pasteBox.html();
		this.$pasteBox.remove();

		return html;
    },
    _isPlainText: function(clipboard)
    {
        var text = clipboard.getData("text/plain");
        var html = clipboard.getData("text/html");

        if (text && html)
        {
            var element = document.createElement("div");
            element.innerHTML = html;

            if (element.textContent === text)
            {
                return !element.querySelector(":not(meta)");
            }
        }
        else
        {
            return (text != null);
        }
    },
    _restoreSelection: function()
    {
        this.editor.restoreScroll();
        this.editor.disablePasting();
        if (!this.dropPasted)
        {
            this.selection.restoreMarkers();
        }
    },
    _insert: function(e, html)
    {
        // pasteBefore callback
        var returned = this.app.broadcast('pasteBefore', html);
		html = (returned === undefined) ? html : returned;

		// clean
		html = (this.isRawCode) ? html : this.cleaner.paste(html);
        html = (this.isRawCode) ? this.cleaner.encodePhpCode(html) : html;

		// paste callback
        var returned = this.app.broadcast('pasting', html);
		html = (returned === undefined) ? html : returned;

        this._restoreSelection();

        // autoparse
        if (this.opts.autoparse && this.opts.autoparsePaste)
        {
            html = this.autoparser.parse(html);
        }

        var nodes = (this.dropPasted) ? this.insertion.insertToPoint(e, html) : this.insertion.insertHtml(html);

        // pasted callback
        this.app.broadcast('pasted', nodes);
    },
    _insertFiles: function(e, files)
    {
        this._restoreSelection();

        // drop or clipboard
        var isImage = (this.opts.imageTypes.indexOf(files[0].type) !== -1);
        var isClipboard = (typeof this.dropPasted === 'undefined');

        if (isImage) this.app.broadcast('dropimage', e, files, isClipboard);
        else this.app.broadcast('dropfile', e, files, isClipboard);
    }
});
$R.add('class', 'input.shortcode', {
    init: function(app, e, key)
    {
        this.app = app;
        this.opts = app.opts;
        this.utils = app.utils;
        this.marker = app.marker;
        this.keycodes = app.keycodes;
        this.selection = app.selection;

        // local
        this.worked = false;

    	// init
        if (key === this.keycodes.SPACE) this._init();
    },
    // public
    is: function()
    {
        return this.worked;
    },
    // private
    _init: function()
    {
        var current = this.selection.getCurrent();
        if (current && current.nodeType === 3)
        {
            var text = current.textContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
            var shortcodes = this.opts.shortcodes;
            for (var name in shortcodes)
            {
                var re = new RegExp('^' + this.utils.escapeRegExp(name));
                var match = text.match(re);
                if (match !== null)
                {
                    if (typeof shortcodes[name].format !== 'undefined')
                    {
                        return this._format(shortcodes[name].format, text, current, re);
                    }
                }
            }
        }
    },
    _format: function(tag, text, current, re)
    {
        var marker = this.marker.insertStart();
        var current = marker.previousSibling;
        var currentText = current.textContent;

        currentText = currentText.replace(re, '');
        current.textContent = currentText;

        var api = (tag === 'ul' || tag === 'ol') ? 'module.list.toggle' : 'module.block.format';

        this.app.api(api, tag);
        this.selection.restoreMarkers();

        this.worked = true;
    }
});
$R.add('class', 'input.shortcut', {
    init: function(app, e)
    {
        this.app = app;
        this.opts = app.opts;

        // local
        this.worked = false;

        // based on https://github.com/jeresig/jquery.hotkeys
    	this.hotkeys = {
    		8: "backspace", 9: "tab", 10: "return", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
    		20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
    		37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 59: ";", 61: "=",
    		96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
    		104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
    		112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
    		120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 173: "-", 186: ";", 187: "=",
    		188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\", 221: "]", 222: "'"
        };

        this.hotkeysShiftNums = {
    		"`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&",
    		"8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<",
    		".": ">",  "/": "?",  "\\": "|"
    	};

    	// init
    	this._init(e);
    },
    // public
    is: function()
    {
        return this.worked;
    },
    // private
    _init: function(e)
    {
		// disable browser's hot keys for bold and italic if shortcuts off
		if (this.opts.shortcuts === false)
		{
			if ((e.ctrlKey || e.metaKey) && (e.which === 66 || e.which === 73)) e.preventDefault();
			return;
		}

		// build
		for (var key in this.opts.shortcuts)
		{
    		this._build(e, key, this.opts.shortcuts[key]);
		}
    },
    _build: function(e, str, command)
	{
		var keys = str.split(',');
		var len = keys.length;
		for (var i = 0; i < len; i++)
		{
			if (typeof keys[i] === 'string')
			{
				this._handler(e, keys[i].trim(), command);
			}
		}
	},
	_handler: function(e, keys, command)
	{
		keys = keys.toLowerCase().split(" ");

		var special = this.hotkeys[e.keyCode];
		var character = String.fromCharCode(e.which).toLowerCase();
		var modif = "", possible = {};
		var cmdKeys = ["alt", "ctrl", "meta", "shift"];

        for (var i = 0; i < cmdKeys.length; i++)
		{
    		var specialKey = cmdKeys[i];
			if (e[specialKey + 'Key'] && special !== specialKey)
			{
				modif += specialKey + '+';
			}
		}

		if (special) possible[modif + special] = true;
		if (character)
		{
			possible[modif + character] = true;
			possible[modif + this.hotkeysShiftNums[character]] = true;

			// "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
			if (modif === "shift+")
			{
				possible[this.hotkeysShiftNums[character]] = true;
			}
		}

		var len = keys.length;
		for (var i = 0; i < len; i++)
		{
			if (possible[keys[i]])
			{
				e.preventDefault();
				this.worked = true;

				if (command.message)
				{
				    this.app.broadcast(command.message, command.args);
				}
				else if (command.api)
				{
    				this.app.api(command.api, command.args);
				}

				return;
			}
		}
	}
});
$R.add('class', 'input.space', {
    init: function(app, e, key, lastShiftKey)
    {
        this.app = app;
        this.keycodes = app.keycodes;
        this.insertion = app.insertion;
        this.selection = app.selection;

        // local
        this.key = key;
        this.lastShiftKey = lastShiftKey;

        // init
        this._init(e);
    },
    // private
    _init: function(e)
    {
        // has non-editable
        if (this.selection.hasNonEditable())
        {
            e.preventDefault();
            return;
        }

        // shift/ctrl + space
        if (!this.lastShiftKey && this.key === this.keycodes.SPACE && (e.ctrlKey || e.shiftKey))
        {
            e.preventDefault();
            this.insertion.insertChar('&nbsp;');
            return;
        }
    }
});
$R.add('class', 'input.tab', {
    init: function(app, e, key)
    {
        this.app = app;
        this.opts = app.opts;
        this.inspector = app.inspector;
        this.insertion = app.insertion;
        this.selection = app.selection;

        // init
        this._init(e);
    },
    // private
    _init: function(e)
    {
        // turn off tab
        if (!this.opts.tabKey) return this._disable(e);

        // callback
        var stop = this.app.broadcast('tab', e);
    	if (stop === false) return e.preventDefault();

        // traverse
        this._traverse(e);
    },
    _disable: function(e)
    {
        e.preventDefault();
        return;
    },
    _traverse: function(e)
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);

        // list
        if (data.isList())
        {
            e.preventDefault();
            return this.app.api('module.list.indent');
        }
        // pre
        if (data.isPre() || (data.isComponentType('code') && !data.isFigcaption()))
        {
            return this._tabCode(e);
        }

        // tab as spaces
        if (this.opts.tabAsSpaces !== false)
        {
            e.preventDefault();
            var node = document.createTextNode(Array(this.opts.tabAsSpaces + 1).join('\u00a0'));
    		return this.insertion.insertNode(node, 'end');
        }
    },
    _tabCode: function(e)
    {
        e.preventDefault();

        var node = (this.opts.preSpaces) ? document.createTextNode(Array(this.opts.preSpaces + 1).join('\u00a0')) : document.createTextNode('\t');

		return this.insertion.insertNode(node, 'end');
    }
});
$R.add('module', 'upload', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.lang = app.lang;
        this.utils = app.utils;
        this.editor = app.editor;
        this.progress = app.progress;

        // local
        this.defaults = {
            event: false,
            element: false,
            name: false,
            files: false,
            url: false,
            data: false
        };
    },
    // public
    build: function(options)
    {
        this._build(options);
    },
    send: function(options)
    {
        this.p = $R.extend(this.defaults, options);
        this.$uploadbox = this.editor.getElement();

        this._send(this.p.event, this.p.files);
    },

    // private
    _build: function(options)
    {
        this.p = $R.extend(this.defaults, options);
        this.$el = $R.dom(this.p.element);

        if (this.$el.get().tagName === 'INPUT') this._buildInput();
        else                                    this._buildBox();
    },
    _buildInput: function()
    {
        this.box = false;
        this.prefix = '';

        this.$uploadbox = $R.dom('<div class="upload-box" />');

		this.$el.hide();
		this.$el.after(this.$uploadbox);

		this._buildPlaceholder();
        this._buildEvents();
    },
    _buildBox: function()
    {
        this.box = true;
        this.prefix = 'box-';

        this.$uploadbox = this.$el;

        // events
        this.$uploadbox.on('drop.redactor.upload', this._onDropBox.bind(this));
		this.$uploadbox.on('dragover.redactor.upload', this._onDragOver.bind(this));
		this.$uploadbox.on('dragleave.redactor.upload', this._onDragLeave.bind(this));
    },
	_buildPlaceholder: function()
	{
		this.$placeholder = $R.dom('<div class="upload-placeholder" />');
		this.$placeholder.html(this.lang.get('upload-label'));
		this.$uploadbox.append(this.$placeholder);
	},
	_buildEvents: function()
	{
		this.$el.on('change.redactor.upload', this._onChange.bind(this));
        this.$uploadbox.on('click.redactor.upload', this._onClick.bind(this));
		this.$uploadbox.on('drop.redactor.upload', this._onDrop.bind(this));
		this.$uploadbox.on('dragover.redactor.upload', this._onDragOver.bind(this));
		this.$uploadbox.on('dragleave.redactor.upload', this._onDragLeave.bind(this));
	},
	_onClick: function(e)
	{
		e.preventDefault();
		this.$el.click();
	},
	_onChange: function(e)
	{
    	this.app.broadcast('upload.start');
		this._send(e, this.$el.get().files);
	},
	_onDrop: function(e)
	{
		e.preventDefault();

		this._clear();
		this._setStatusDrop();

		this.app.broadcast('upload.start');
		this._send(e);
	},
	_onDragOver: function(e)
	{
    	e.preventDefault();
		this._setStatusHover();

		return false;
	},
	_onDragLeave: function(e)
	{
    	e.preventDefault();
		this._removeStatusHover();

		return false;
	},
	_onDropBox: function(e)
	{
		e.preventDefault();

		this._clear();
		this._setStatusDrop();

		this.app.broadcast('upload.start');
		this._send(e);
	},
	_removeStatusHover: function()
	{
        this.$uploadbox.removeClass('upload-' + this.prefix + 'hover');
	},
	_setStatusDrop: function()
	{
        this.$uploadbox.addClass('upload-' + this.prefix + 'drop');
	},
	_setStatusHover: function()
	{
        this.$uploadbox.addClass('upload-' + this.prefix + 'hover');
	},
	_setStatusError: function()
	{
    	this.$uploadbox.addClass('upload-' + this.prefix + 'error');
	},
	_setStatusSuccess: function()
	{
    	this.$uploadbox.addClass('upload-' + this.prefix + 'success');
	},
	_clear: function()
	{
    	var classes = ['drop', 'hover', 'error', 'success'];
        for (var i = 0; i < classes.length; i++)
        {
    	    this.$uploadbox.removeClass('upload-' + this.prefix + classes[i]);
	    }
	},
	_getParamName: function()
	{
        return (this.opts.uploadParamName) ? this.opts.uploadParamName : 'file';
	},
	_send: function(e, files)
	{
    	e = e.originalEvent || e;

		files = (files) ? files : e.dataTransfer.files;

		var data = new FormData();
		var name = this._getParamName();

        data = this._buildData(name, files, data);
        data = this.utils.extendData(data, this.p.data);

        this._sendData(data, e);
	},
	_sendData: function(data, e)
	{
    	this.progress.show();

        if (typeof this.p.url === 'function')
        {
            this.p.url(data, e);
            this.progress.hide();
        }
        else
        {
            $R.ajax.post({
                url: this.p.url,
                data: data,

                /**
                 * THIS IS MANUALLY ADDED CODE BLOCK, NOT LIBRARY ITSELF
                 */

                // Add Authorization to header
                headers: {
                    Authorization: `Bearer ${this.opts.accessToken}`,
                },
                /**
                 * END OF BLOCK
                 */

                before: function(xhr)
                {
                    return this.app.broadcast('upload.beforeSend', xhr);

                }.bind(this),
                success: function(response)
                {
                    /**
                     * THIS IS MANUALLY ADDED CODE BLOCK, NOT LIBRARY ITSELF
                     */

                    // Transform HTTP response from backend
                    // Because it returns a plain json Asset view model: { id, url, createdDate, updatedDate, ... },
                    // while redactor needs the format: { file: { id, url, createdDate, updatedDate, ... } }
                    // to be able to display the image in the editor properly.
                    if (!response[this.opts.imageUploadParam]) {
                        response = {
                            [this.opts.imageUploadParam]: response,
                        };
                    }
                    /**
                     * END OF BLOCK
                     */

                    this._complete(response, e)
                }.bind(this)
            });
        }
	},
	_buildData: function(name, files, data)
	{
        if (files.length === 1)
		{
			data.append(name, files[0]);
		}
		else if (files.length > 1 && this.opts.multipleUpload !== false)
		{
    		for (var i = 0; i < files.length; i++)
    		{
    			data.append(name + '-' + i, files[i]);
    		}
		}

		return data;
	},
	_complete: function (response, e)
	{
        this._clear();
        this.progress.hide();

        if (response && response.error)
        {
            this._setStatusError();

            this.app.broadcast('upload.' + this.p.name + '.error', response, e);
            this.app.broadcast('upload.error', response);
        }
        else
        {
            this._setStatusSuccess();

            this.app.broadcast('upload.' + this.p.name + '.complete', response, e);
            this.app.broadcast('upload.complete', response);

            setTimeout(this._clear.bind(this), 500);
        }
	}
});
$R.add('class', 'code.component', {
    mixins: ['dom', 'component'],
    init: function(app, el)
    {
        this.app = app;

        // init
        return (el && el.cmnt !== undefined) ? el : this._init(el);
    },

    // private
   _init: function(el)
    {
        var $pre;
        if (typeof el !== 'undefined')
        {
            var $node = $R.dom(el);
            var $wrapper = $node.closest('figure');
            if ($wrapper.length !== 0)
            {
                this.parse($wrapper);
            }
            else
            {
                this.parse('<figure>');
                this.append(el);
            }

            $pre = this.find('pre code, pre').last();
        }
        else
        {
            $pre = $R.dom('<pre>');

            this.parse('<figure>');
            this.append($pre);
        }

        this._initElement($pre);
        this._initWrapper();
    },
    _initElement: function($pre)
    {
        $pre.attr({
            'tabindex': '-1',
            'contenteditable': true
        });
    },
    _initWrapper: function()
    {
        this.addClass('redactor-component');
        this.attr({
            'data-redactor-type': 'code',
            'tabindex': '-1',
            'contenteditable': false
        });
    }
});
$R.add('module', 'form', {
    init: function(app)
    {
        this.app = app;
        this.lang = app.lang;
        this.component = app.component;
        this.inspector = app.inspector;
    },
    // messages
    onform: {
        remove: function(node)
        {
            this._remove(node);
        }
    },
    oncontextbar: function(e, contextbar)
    {
        var data = this.inspector.parse(e.target)
        if (data.isComponentType('form'))
        {
            var node = data.getComponent();
            var buttons = {
                "remove": {
                    title: this.lang.get('delete'),
                    api: 'module.form.remove',
                    args: node
                }
            };

            contextbar.set(e, node, buttons, 'top');
        }

    },

    // private
    _remove: function(node)
    {
        this.component.remove(node);
    }
});
$R.add('class', 'form.component', {
    mixins: ['dom', 'component'],
    init: function(app, el)
    {
        this.app = app;
        this.utils = app.utils;

        // init
        return (el && el.cmnt !== undefined) ? el : this._init(el);
    },
    // private
    _init: function(el)
    {
        if (typeof el !== 'undefined')
        {
            var $node = $R.dom(el);
            var $wrapper = $node.closest('form');
            if ($wrapper.length !== 0)
            {
                var $figure = this.utils.replaceToTag(el, 'figure');
                this.parse($figure);
            }
            else
            {
                this.parse('<figure>');
                this.append(el);
            }
        }
        else
        {
            this.parse('<figure>');
        }

        this._initWrapper();
    },
    _initWrapper: function()
    {
        this.addClass('redactor-component');
        this.attr({
            'data-redactor-type': 'form',
            'tabindex': '-1',
            'contenteditable': false
        });
    }
});
$R.add('module', 'image', {
    modals: {
        'image':
            '<div class="redactor-modal-tab" data-title="## upload ##"><form action=""> \
                <input type="file" name="file" multiple> \
            </form></div>',
        'imageedit':
            '<div class="redactor-modal-group"> \
                <div id="redactor-modal-image-preview" class="redactor-modal-side"></div> \
                <form action="" class="redactor-modal-area"> \
            		<div class="form-item"> \
            			<label> ## title ##</label> \
            			<input type="text" name="title" /> \
            		</div> \
            		<div class="form-item form-item-caption"> \
            			<label>## caption ##</label> \
            			<input type="text" name="caption" aria-label="## caption ##" /> \
            		</div> \
            		<div class="form-item"> \
            			<label>## link ##</label> \
            			<input type="text" name="url" aria-label="## link ##" /> \
            		</div> \
            		<div class="form-item form-item-align"> \
            			<label>## image-position ##</label> \
            			<select name="align" aria-label="## image-position ##"> \
            				<option value="none">## none ##</option> \
            				<option value="left">## left ##</option> \
            				<option value="center">## center ##</option> \
            				<option value="right">## right ##</option> \
            			</select> \
            		</div> \
            		<div class="form-item"> \
            			<label class="checkbox"><input type="checkbox" name="target" aria-label="## link-in-new-tab ##"> ## link-in-new-tab ##</label> \
            		</div> \
                </form> \
            </div>'
    },
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.lang = app.lang;
        this.caret = app.caret;
        this.utils = app.utils;
        this.editor = app.editor;
        this.storage = app.storage;
        this.component = app.component;
        this.inspector = app.inspector;
        this.insertion = app.insertion;
        this.selection = app.selection;
    },
    // messages
    onstarted: function()
    {
        // storage observe
        this.storage.markImages();
        this.storage.observeImages();

        // resize
        if (this.opts.imageResizable)
        {
            this.resizer = $R.create('image.resize', this.app);
        }
    },
    ondropimage: function(e, files, clipboard)
    {
        if (!this.opts.imageUpload) return;

        var options = {
            url: this.opts.imageUpload,
            event: (clipboard) ? false : e,
            files: files,
            name: 'imagedrop',
            data: this.opts.imageData
        };

        this.app.api('module.upload.send', options);
    },
    onstop: function()
    {
        if (this.resizer) this.resizer.stop();
    },
    onimageresizer: {
        stop: function()
        {
            if (this.resizer) this.resizer.stop();
        }
    },
    onsource: {
        open: function()
        {
            if (this.resizer) this.resizer.stop();
        }
    },
    onupload: {
        image: {
            complete: function(response)
            {
                this._insert(response);
            },
            error: function(response)
            {
                this._uploadError(response);
            }
        },
        imageedit: {
            complete: function(response)
            {
                this._change(response);
            },
            error: function(response)
            {
                this._uploadError(response);
            }
        },
        imagedrop: {
            complete: function(response, e)
            {
                this._insert(response, e);
            },
            error: function(response)
            {
                this._uploadError(response);
            }
        }
    },
    onmodal: {
        image: {
            open: function($modal, $form)
            {
                this._setUpload($form);
            }
        },
        imageedit: {
            open: function($modal, $form)
            {
                this._setFormData($modal, $form);
            },
            opened: function($modal, $form)
            {
                this._setFormFocus($form);
            },
            remove: function($modal, $form)
            {
                this._remove(this.$image);
            },
            save: function($modal, $form)
            {
                this._save($modal, $form);
            }
        }
    },
    oncontextbar: function(e, contextbar)
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        if (!data.isFigcaption() && data.isComponentType('image'))
        {
            var node = data.getComponent();
            var buttons = {
                "edit": {
                    title: this.lang.get('edit'),
                    api: 'module.image.open'
                },
                "remove": {
                    title: this.lang.get('delete'),
                    api: 'module.image.remove',
                    args: node
                }
            };

            contextbar.set(e, node, buttons);
        }
    },

    // public
    open: function()
    {
        this.$image = this._getCurrent();
        this.app.api('module.modal.build', this._getModalData());
    },
    insert: function(data)
    {
        this._insert(data);
    },
    remove: function(node)
    {
        this._remove(node);
    },

    // private
    _getModalData: function()
    {
        var modalData;
        if (this._isImage() && this.opts.imageEditable)
        {
            modalData = {
                name: 'imageedit',
                width: '800px',
                title: this.lang.get('edit'),
                handle: 'save',
                commands: {
                    save: { title: this.lang.get('save') },
                    remove: { title: this.lang.get('delete'), type: 'danger' },
                    cancel: { title: this.lang.get('cancel') }
                }
            };
        }
        else
        {
            modalData = {
                name: 'image',
                title: this.lang.get('image')
            };
        }

        return modalData;
    },
    _isImage: function()
    {
        return this.$image;
    },
    _getCurrent: function()
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);

        return (data.isComponentType('image') && data.isComponentActive()) ? this.component.create('image', data.getComponent()) : false;
    },
    _insert: function(response, e)
    {
        this.app.api('module.modal.close');
        if (typeof response !== 'object') return;

        var $img, $inserted;
        var z = 0;
        var len = Object.keys(response).length;
        var multiple = (len  > 1);
        for (var key in response)
        {
            z++;

            $img = this.component.create('image');
            $img.setData({
                src: response[key].url,
                id: (response[key].id) ? response[key].id : this.utils.getRandomId()
            });

            // add to storage
            this.storage.add('image', $img.getElement());

            if (z === 1)
            {
                $inserted = (e) ? this.insertion.insertToPoint(e, $img) : this.insertion.insertHtml($img);

                if (multiple) this.caret.setAfter($inserted);
            }
            else
            {
                $inserted = this.insertion.insertHtml($img);

                if (multiple && z <= len) this.caret.setAfter($inserted);
            }

            // has not next sibling
            if (!$inserted[0].nextSibling)
            {
                var markup = document.createElement(this.opts.markup);
                $inserted[0].after(markup);

                this.caret.setStart(markup);
            }

            this.app.broadcast('image.uploaded', $inserted, response);
        }
    },
    _save: function($modal, $form)
    {
        var data = $form.getData();
        var imageData = {
            title: data.title,
            link: { url: data.url, target: data.target }
        };

        if (this.opts.imageCaption) imageData.caption = data.caption;
        if (this.opts.imagePosition) imageData.align = data.align;

        this.$image.setData(imageData);
        if (this.resizer) this.resizer.rebuild();

        this.app.broadcast('image.changed', this.$image);
        this.app.api('module.modal.close');
    },
    _change: function(response)
    {
        if (typeof response !== 'object') return;

        var $img, $inserted;
        for (var key in response)
        {
            $img = $R.dom('<img>');
            $img.attr('src', response[key].url);

            this.$image.changeImage(response[key]);

            this.app.broadcast('image.changed', this.$image, response);
            this.app.broadcast('image.uploaded', this.$image, response);

            break;
        }

        $img.on('load', function() { this.$previewBox.html($img); }.bind(this));

    },
    _uploadError: function(response)
    {
        this.app.broadcast('image.uploadError', response);
    },
    _remove: function(node)
    {
        this.app.api('module.modal.close');
        this.component.remove(node);
    },
    _setFormData: function($modal, $form)
    {
        this._buildPreview();

        var imageData = this.$image.getData();
        var data = {
            title: imageData.title
        };

        // caption
        if (this.opts.imageCaption) data.caption = imageData.caption;
        else $modal.find('.form-item-caption').hide();

        // position
        if (this.opts.imagePosition) data.align = imageData.align;
        else $modal.find('.form-item-align').hide();

        if (imageData.link)
        {
            data.url = imageData.link.url;
            if (imageData.link.target) data.target = true;
        }

        $form.setData(data);
    },
    _setFormFocus: function($form)
    {
        $form.getField('title').focus();
    },
    _setUpload: function($form)
    {
        var options = {
            url: this.opts.imageUpload,
            element: $form.getField('file'),
            name: 'image',
            data: this.opts.imageData
        };

        this.app.api('module.upload.build', options);
    },
    _buildPreview: function()
    {
        this.$preview = $R.dom('#redactor-modal-image-preview');

        var imageData = this.$image.getData();
        var $previewImg = $R.dom('<img>');
        $previewImg.attr('src', imageData.src);

        var $desc = $R.dom('<div class="desc">');
        $desc.html('Drop a new image to change');

        this.$previewBox = $R.dom('<div>');
        this.$previewBox.append($previewImg);

        this.$preview.html('');
        this.$preview.append(this.$previewBox);
        this.$preview.append($desc);

        var options = {
            url: this.opts.imageUpload,
            element: this.$previewBox,
            name: 'imageedit'
        };

        this.app.api('module.upload.build', options);
    }
});
$R.add('class', 'image.component', {
    mixins: ['dom', 'component'],
    init: function(app, el)
    {
        this.app = app;
        this.opts = app.opts;

        // init
        return (el && el.cmnt !== undefined) ? el : this._init(el);
    },
    setData: function(data)
    {
        for (var name in data)
        {
            this._set(name, data[name]);
        }
    },
    getData: function()
    {
        var names = ['src', 'title', 'caption', 'align', 'link', 'id'];
        var data = {};

        for (var i = 0; i < names.length; i++)
        {
            data[names[i]] = this._get(names[i]);
        }

        return data;
    },
    getElement: function()
    {
        return this.$element;
    },
    changeImage: function(data)
    {
        this.$element.attr('src', data.url);
    },


    // private
    _init: function(el)
    {
        var $el = $R.dom(el);
        var $figure = $el.closest('figure');

        if (el === undefined)
        {
            this.$element = $R.dom('<img>');
            this.parse('<figure>');
            this.append(this.$element);
        }
        else if ($figure.length === 0)
        {
            this.parse('<figure>');
            this.$element = $el;
            this.$element.wrap(this);
        }
        else
        {
            this.parse($figure);
            this.$element = this.find('img');
        }

        this._initWrapper();
    },
    _set: function(name, value)
    {
        this['_set_' + name](value);
    },
    _get: function(name)
    {
        return this['_get_' + name]();
    },
    _set_src: function(src)
    {
       this.$element.attr('src', src);
    },
    _set_id: function(id)
    {
       this.$element.attr('data-image', id);
    },
    _set_title: function(title)
    {
        title = title.trim().replace(/(<([^>]+)>)/ig,"");

        if (title === '')
        {
	    	this.$element.removeAttr('alt');
    		this.$element.removeAttr('title');
        }
        else
        {
	    	this.$element.attr('alt', title);
    		this.$element.attr('title', title);
		}

    },
    _set_caption: function(caption)
    {
        var $figcaption = this.find('figcaption');
        if ($figcaption.length === 0)
        {
            $figcaption = $R.dom('<figcaption>');
            $figcaption.attr('contenteditable', 'true');

            this.append($figcaption);
        }

        if (caption === '') $figcaption.remove();
        else $figcaption.html(caption);

        return $figcaption;
    },
    _set_align: function(align)
    {
        var imageFloat = '';
		var imageMargin = '';
		var textAlign = '';
        var $el = this;

        switch (align)
		{
			case 'left':
				imageFloat = 'left';
				imageMargin = '0 ' + this.opts.imageFloatMargin + ' ' + this.opts.imageFloatMargin + ' 0';
			break;
			case 'right':
				imageFloat = 'right';
				imageMargin = '0 0 ' + this.opts.imageFloatMargin + ' ' + this.opts.imageFloatMargin;
			break;
			case 'center':
                textAlign = 'center';
			break;
		}

		$el.css({ 'float': imageFloat, 'margin': imageMargin, 'text-align': textAlign });
		$el.attr('rel', $el.attr('style'));
    },
    _set_link: function(data)
    {
        var $link = this.find('a');
        if (data.url === '')
        {
            return $link.unwrap();
        }

        if ($link.length === 0)
        {
            $link = $R.dom('<a>');
            this.$element.wrap($link);
        }

        $link.attr('href', data.url);

        if (data.target) $link.attr('target', data.target);
        else $link.removeAttr('target');

        return $link;
    },
    _get_src: function()
    {
        return this.$element.attr('src');
    },
    _get_id: function()
    {
        return this.$element.attr('data-image');
    },
    _get_title: function()
    {
        var alt = this.$element.attr('alt');
        var title = this.$element.attr('title');

        if (alt) return alt;
        else if (title) return title;
        else return '';
    },
    _get_caption: function()
    {
        var $figcaption = this.find('figcaption');

        return ($figcaption.length === 0) ? '' : $figcaption.text();
    },
    _get_align: function()
    {
		return (this.css('text-align') === 'center') ? 'center' : this.css('float');
    },
    _get_link: function()
    {
        var $link = this.find('a');
        if ($link.length !== 0)
        {
            var target = ($link.attr('target')) ? true : false;

            return {
                url: $link.attr('href'),
                target: target
            };
        }
    },
    _initWrapper: function()
    {
        this.addClass('redactor-component');
        this.attr({
            'data-redactor-type': 'image',
            'tabindex': '-1',
            'contenteditable': false
        });
    }
});
$R.add('class', 'image.resize', {
    init: function(app)
    {
        this.app = app;
        this.$doc = app.$doc;
        this.$body = app.$body;
        this.editor = app.editor;
        this.inspector = app.inspector;

        // init
        this._init();
    },
    // public
    rebuild: function()
    {
        this._setResizerPosition();
    },
    stop: function()
    {
        var $editor = this.editor.getElement();
        $editor.off('.redactor.image-resize');

        this.$doc.off('.redactor.image-resize');
        this.$body.find('#redactor-image-resizer').remove();
    },

    // private
    _init: function()
    {
        var $editor = this.editor.getElement();
        $editor.on('click.redactor.image-resize', this._build.bind(this));
    },
    _build: function(e)
    {
        this.$body.find('#redactor-image-resizer').remove();

        var data = this.inspector.parse(e.target);
        var $editor = this.editor.getElement();

        if (data.isComponentType('image'))
        {
            this.$resizableBox = $editor;
            this.$resizableImage = $R.dom(data.getImageElement());

            this.$resizer = $R.dom('<span>');
            this.$resizer.attr('id', 'redactor-image-resizer');

            this.$body.append(this.$resizer);

            this._setResizerPosition();
            this.$resizer.on('mousedown touchstart', this._set.bind(this));
        }
    },
    _setResizerPosition: function()
    {
        var topOffset = 7;
        var leftOffset = 7;
        var pos = this.$resizableImage.offset();
        var width = this.$resizableImage.width();
        var height = this.$resizableImage.height();
        var resizerWidth =  this.$resizer.width();
        var resizerHeight =  this.$resizer.height();

        this.$resizer.css({ top: (pos.top + height - resizerHeight + topOffset) + 'px', left: (pos.left + width - resizerWidth + leftOffset) + 'px' });
    },
    _set: function(e)
    {
		e.preventDefault();

	    this.resizeHandle = {
	        x : e.pageX,
	        y : e.pageY,
	        el : this.$resizableImage,
	        ratio: this.$resizableImage.width() / this.$resizableImage.height(),
	        h: this.$resizableImage.height()
	    };

	    e = e.originalEvent || e;

	    if (e.targetTouches)
	    {
	         this.resizeHandle.x = e.targetTouches[0].pageX;
	         this.resizeHandle.y = e.targetTouches[0].pageY;
	    }

        this.app.broadcast('contextbar.close');
        this.app.broadcast('image.resize', this.$resizableImage);
		this._start();
    },
    _start: function()
    {
    	this.$doc.on('mousemove.redactor.image-resize touchmove.redactor.image-resize', this._move.bind(this));
    	this.$doc.on('mouseup.redactor.image-resize touchend.redactor.image-resize', this._stop.bind(this));
    },
	_stop: function()
	{
		this.$doc.off('.redactor.image-resize');
        this.$body.find('#redactor-image-resizer').remove();
        this.app.broadcast('image.resized', this.$resizableImage);
	},
	_move: function(e)
	{
		e.preventDefault();

		e = e.originalEvent || e;

		var height = this.resizeHandle.h;

        if (e.targetTouches) height += (e.targetTouches[0].pageY -  this.resizeHandle.y);
        else height += (e.pageY -  this.resizeHandle.y);

		var width = height * this.resizeHandle.ratio;

		if (height < 50 || width < 100) return;
        if (this._getResizableBoxWidth() <= width) return;

		this.resizeHandle.el.attr({width: width, height: height});
        this.resizeHandle.el.width(width);
        this.resizeHandle.el.height(height);
        this._setResizerPosition();
	},
	_getResizableBoxWidth: function()
	{
    	var width = this.$resizableBox.width();
    	return width - parseInt(this.$resizableBox.css('padding-left')) - parseInt(this.$resizableBox.css('padding-right'));
	}
});
$R.add('module', 'file', {
    modals: {
        'file':
            '<div class="redactor-modal-tab" data-title="## upload ##"><form action=""> \
                <div class="form-item form-item-title"> \
            		<label> ## filename ## <span class="desc">(## optional ##)</span></label> \
                    <input type="text" name="title" /> \
                </div> \
                <input type="file" name="file" multiple> \
            </form></div>'
    },
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.lang = app.lang;
        this.caret = app.caret;
        this.utils = app.utils;
        this.storage = app.storage;
        this.component = app.component;
        this.inspector = app.inspector;
        this.insertion = app.insertion;
        this.selection = app.selection;
    },
    // messages
    onstarted: function()
    {
        // storage observe
        this.storage.observeFiles();
    },
    ondropfile: function(e, files, clipboard)
    {
        if (!this.opts.fileUpload) return;

        var options = {
            url: this.opts.fileUpload,
            event: (clipboard) ? false : e,
            files: files,
            name: 'filedrop',
            data: this.opts.fileData
        };

        this.app.api('module.upload.send', options);
    },
    onmodal: {
        file: {
            open: function($modal, $form)
            {
                this._setFormData($modal, $form);
                this._setUpload($form);
            },
            opened: function($modal, $form)
            {
                this._setFormFocus($form);

                this.$form = $form;
            }
        }
    },
    onupload: {
        file: {
            complete: function(response)
            {
                this._insert(response);
            },
            error: function(response)
            {
                this._uploadError(response);
            }
        },
        filedrop: {
            complete: function(response, e)
            {
                this._insert(response, e);
            },
            error: function(response)
            {
                this._uploadError(response);
            }
        }
    },
    oncontextbar: function(e, contextbar)
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        if (data.isFile())
        {
            var node = data.getFile();
            var buttons = {
                "remove": {
                    title: this.lang.get('delete'),
                    api: 'module.file.remove',
                    args: node
                }
            };

            contextbar.set(e, node, buttons, 'bottom');
        }

    },

    // public
    open: function()
    {
        this._open();
    },
    insert: function(data)
    {
        this._insert(data);
    },
    remove: function(node)
    {
        this._remove(node);
    },

    // private
    _open: function()
    {
        this.app.api('module.modal.build', this._getModalData());
    },
    _getModalData: function()
    {
        var modalData = {
            name: 'file',
            title: this.lang.get('file')
        };

        return modalData;
    },
    _insert: function(response, e)
    {
        this.app.api('module.modal.close');
        if (typeof response !== 'object') return;

        var modalFormData = (this.$form) ? this.$form.getData() : false;
        var $file, $inserted;
        var z = 0;
        var len = Object.keys(response).length;
        var multiple = (len  > 1);
        for (var key in response)
        {
            z++;

            var name = (response[key].name) ? response[key].name : response[key].url;
            var title = (!this.opts.fileAttachment && modalFormData && modalFormData.title !== '') ? modalFormData.title : this._truncateUrl(name);

            $file = this.component.create('file');
            $file.attr('href', response[key].url);
            $file.attr('data-file', (response[key].id) ? response[key].id : this.utils.getRandomId());
            $file.attr('data-name', response[key].name);
            $file.html(title);

            // add to storage
            this.storage.add('file', $file);

            if (this.opts.fileAttachment)
            {
                var $box = $R.dom(this.opts.fileAttachment);
                var $wrapper = $file.wrapAttachment();
                $box.append($wrapper);

                $inserted = $wrapper.get();

                this.app.broadcast('file.appended', $inserted, response);
            }
            else
            {
                if (z === 1)
                {
                    $inserted = (e) ? this.insertion.insertToPoint(e, $file) : this.insertion.insertRaw($file);
                    if (multiple) this.caret.setAfter($inserted);
                }
                else
                {
                    this.insertion.insertRaw($file);
                    if (multiple && z <= len) this.caret.setAfter($inserted);
                }

            }

            this.app.broadcast('file.uploaded', $inserted, response);
        }

        this.$form = false;
    },
    _remove: function(node)
    {
        this.selection.save();

        var $file = this.component.create('file', node);
        var stop = this.app.broadcast('file.delete', $file);
        if (stop !== false)
        {
            $file.unwrap();

            this.selection.restore();

            // callback
            this.app.broadcast('file.deleted', $file);
        }
        else
        {
            this.selection.restore();
        }
    },
    _truncateUrl: function(url)
	{
		return (url.length > 20) ? url.substring(0, 20) + '...' : url;
	},
    _setUpload: function($form)
    {
        var options = {
            url: this.opts.fileUpload,
            element: $form.getField('file'),
            name: 'file',
            data: this.opts.fileData
        };

        this.app.api('module.upload.build', options);
    },
    _setFormData: function($modal, $form)
    {
        if (this.opts.fileAttachment)
        {
            $modal.find('.form-item-title').hide();
        }
        else
        {
            $form.setData({ title: this.selection.getText() });
        }
    },
    _setFormFocus: function($form)
    {
        $form.getField('title').focus();
    },
    _uploadError: function(response)
    {
        this.app.broadcast('file.uploadError', response);
    }
});
$R.add('class', 'file.component', {
    mixins: ['dom', 'component'],
    init: function(app, el)
    {
        this.app = app;
        this.opts = app.opts;

        // init
        return (el && el.cmnt !== undefined) ? el : this._init(el);
    },
    wrapAttachment: function()
    {
        this.$wrapper = $R.dom('<span class="redactor-file-item">');
        this.$remover = $R.dom('<span class="redactor-file-remover">');
        this.$remover.html('&times;');
        this.$remover.on('click', this.removeAttachment.bind(this));

        this.$wrapper.append(this);
        this.$wrapper.append(this.$remover);

        return this.$wrapper;
    },
    removeAttachment: function(e)
    {
        e.preventDefault();

        var stop = this.app.broadcast('file.delete', this, this.$wrapper);
        if (stop !== false)
        {
            this.$wrapper.remove();
            this.app.broadcast('file.deleted', this);
            this.app.broadcast('file.removeAttachment', this);
        }
    },

    // private
    _init: function(el)
    {
        if (el === undefined)
        {
            this.parse('<a>');
        }
        else
        {
            var $a = $R.dom(el).closest('a');
            this.parse($a);
        }
    }
});
$R.add('module', 'buffer', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.editor = app.editor;
        this.offset = app.offset;
        this.keycodes = app.keycodes;
        this.selection = app.selection;

        // local
        this.state = false;
    	this.passed = false;
        this.keyPressed = false;
        this.savedHtml = false;
        this.savedOffset = false;
        this.undoStorage = [];
        this.redoStorage = [];
    },
    // messages
    onkeydown: function(e)
    {
        this._listen(e);
    },
    onsyncing: function()
    {
        if (!this.keyPressed)
        {
            this.trigger();
        }

        this.keyPressed = false;
    },
    onstate: function(e, html, offset)
    {
        if ((e && (e.ctrlKey || e.metaKey)) || (e && (this._isUndo(e) || this._isRedo(e))))
        {
            return;
        }

        this.passed = false;
        this._saveState(html, offset);
    },
    onenable: function()
    {
        this.clear();
    },

    // public
    clear: function()
    {
        this.state = false;
        this.undoStorage = [];
        this.redoStorage = [];
    },
    undo: function()
    {
        this._getUndo();
	},
    redo: function()
    {
        this._getRedo();
	},
	trigger: function()
	{
    	if (this.state && this.passed === false) this._setUndo();
	},

    // private
	_saveState: function(html, offset)
	{
    	var $editor = this.editor.getElement();

        this.state = {
            html: html || $editor.html(),
            offset: offset || this.offset.get()
        };
	},
    _listen: function(e)
    {
        var key = e.which;
        var ctrl = e.ctrlKey || e.metaKey;
        var cmd = ctrl || e.shiftKey || e.altKey;
        var keys = [this.keycodes.SPACE, this.keycodes.ENTER, this.keycodes.BACKSPACE, this.keycodes.DELETE, this.keycodes.TAB,
                    this.keycodes.LEFT, this.keycodes.RIGHT, this.keycodes.UP, this.keycodes.DOWN];

        // undo
        if (this._isUndo(e)) // z key
    	{
    		e.preventDefault();
    		this.undo();
    		return;
    	}
    	// redo
    	else if (this._isRedo(e))
    	{
    		e.preventDefault();
    		this.redo();
    		return;
    	}
    	// spec keys
    	else if (!ctrl && keys.indexOf(key) !== -1)
    	{
        	cmd = true;
        	this.trigger();
    	}
        // cut & copy
    	else (ctrl && (key === 88 || key === 67))
    	{
        	cmd = true;
        	this.trigger();
    	}

        // empty buffer
    	if (!cmd && !this._hasUndo())
    	{
            this.trigger();
    	}

    	this.keyPressed = true;
    },
    _isUndo: function(e)
    {
        var key = e.which;
        var ctrl = e.ctrlKey || e.metaKey;

        return (ctrl && key === 90 && !e.shiftKey && !e.altKey);
    },
    _isRedo: function(e)
    {
        var key = e.which;
        var ctrl = e.ctrlKey || e.metaKey;

        return (ctrl && (key === 90 && e.shiftKey || key === 89 && !e.shiftKey) && !e.altKey);
    },
    _setUndo: function()
    {
        var last = this.undoStorage[this.undoStorage.length-1];
		if (typeof last === 'undefined' || last[0] !== this.state.html)
		{
			this.undoStorage.push([this.state.html, this.state.offset]);
            this._removeOverStorage();
		}
    },
    _setRedo: function()
    {
        var $editor = this.editor.getElement();
		var offset = this.offset.get();
		var html = $editor.html();

		this.redoStorage.push([html, offset]);
		this.redoStorage = this.redoStorage.slice(0, this.opts.bufferLimit);
    },
    _getUndo: function()
    {
        if (!this._hasUndo()) return;

		this.passed = true;

        var $editor = this.editor.getElement();
		var buffer = this.undoStorage.pop();

		this._setRedo();

		$editor.html(buffer[0]);
		this.offset.set(buffer[1]);
		this.selection.restore();

		this.app.broadcast('undo', buffer[0], buffer[1]);

    },
    _getRedo: function()
    {
        if (!this._hasRedo()) return;

		this.passed = true;

        var $editor = this.editor.getElement();
		var buffer = this.redoStorage.pop();

		this._setUndo();
		$editor.html(buffer[0]);
		this.offset.set(buffer[1]);

		this.app.broadcast('redo', buffer[0], buffer[1]);
    },
    _removeOverStorage: function()
    {
        if (this.undoStorage.length > this.opts.bufferLimit)
		{
			this.undoStorage = this.undoStorage.slice(0, (this.undoStorage.length - this.opts.bufferLimit));
        }
    },
    _hasUndo: function()
    {
        return (this.undoStorage.length !== 0);
    },
    _hasRedo: function()
    {
        return (this.redoStorage.length !== 0);
    }
});
$R.add('module', 'list', {
    init: function(app)
    {
        this.app = app;
        this.opts = app.opts;
        this.utils = app.utils;
        this.toolbar = app.toolbar;
        this.inspector = app.inspector;
        this.selection = app.selection;
    },
    // messages
    onbutton: {
        list: {
            observe: function(button)
            {
                this._observeButton(button);
            }
        }
    },
    ondropdown: {
        list: {
            observe: function(dropdown)
            {
                this._observeDropdown(dropdown);
            }
        }
    },

    // public
    toggle: function(type)
    {
        this.selection.saveMarkers();

        var nodes = this._getBlocks();
        var block = this.selection.getBlock();
        var $list = $R.dom(block).parents('ul, ol',  '.redactor-in').last();
        if (nodes.length === 0 && $list.length !== 0)
        {
            nodes = [$list.get()];
        }

        nodes = (this._isUnformat(type, nodes)) ? this._unformat(type, nodes) : this._format(type, nodes);

        this.selection.restoreMarkers();

        return nodes;
    },
    indent: function()
    {
        var isCollapsed = this.selection.isCollapsed();
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var item = (data.isList()) ? data.getListItem() : false;
        var $item = $R.dom(item);
        var $prev = $item.prevElement();
        var prev = $prev.get();
        var isIndent = (isCollapsed && item && prev && prev.tagName === 'LI');

        if (isIndent)
        {
            this.selection.save();

            var $prev = $R.dom(prev);
            var $prevChild = $prev.children('ul, ol');
            var $list = $item.closest('ul, ol');

            if ($prevChild.length !== 0)
            {
                $prevChild.append($item);
            }
            else
            {
                var listTag = $list.get().tagName.toLowerCase();
                var $newList = $R.dom('<' + listTag + '>');

                $newList.append($item);
                $prev.append($newList);
            }

            this.selection.restore();
        }
    },
    outdent: function()
    {
        var isCollapsed = this.selection.isCollapsed();
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var item = (data.isList()) ? data.getListItem() : false;
        var $item = $R.dom(item);

        if (isCollapsed && item)
        {
            var $listItem = $item.parent();
            var $liItem = $listItem.closest('li');
            var $prev = $item.prevElement();
            var $next = $item.nextElement();
            var prev = $prev.get();
            var next = $next.get();

            var isTop = (prev === false);
            var isMiddle = (prev !== false && next !== false);
            var isBottom = (!isTop && next === false);

            this.selection.save();

            // out
            if ($liItem.length !== 0)
            {
                if (isMiddle)
                {
                    var nextItems = this._getAllNext($item.get());
                    var $newList = $R.dom('<' + $listItem.get().tagName.toLowerCase() + '>');

                    for (var i = 0; i < nextItems.length; i++)
                    {
                        $newList.append(nextItems[i]);
                    }

                    $liItem.after($item);
                    $item.append($newList);
                }
                else
                {
                    $liItem.after($item);

                    if ($listItem.children().length === 0)
                    {
                        $listItem.remove();
                    }
                    else
                    {
                        if (isTop) $item.append($listItem);
                    }
                }
            }
            // unformat
            else
            {
                var $container =  this._createUnformatContainer($item);
                var $childList = $container.find('ul, ol').first();

                if (isTop) $listItem.before($container);
                else if (isBottom) $listItem.after($container);
                else if (isMiddle)
                {
                    var $newList = $R.dom('<' + $listItem.get().tagName.toLowerCase() + '>');
                    var nextItems = this._getAllNext($item.get());

                    for (var i = 0; i < nextItems.length; i++)
                    {
                        $newList.append(nextItems[i]);
                    }

                    $listItem.after($container);
                    $container.after($newList);
                }

                if ($childList.length !== 0)
                {
                    var $nextList = $container.nextElement();
                    var nextList = $nextList.get();
                    if (nextList && nextList.tagName === $listItem.get().tagName)
                    {
                        $R.dom(nextList).prepend($childList);
                        $childList.unwrap();
                    }
                    else
                    {
                        $container.after($childList);
                    }
                }

                if ($container.hasClass('redactor-list-item-container'))
                {
                    $container.replaceWith($container.contents());
                }

                $item.remove();
            }

            this.selection.restore();
        }
    },

    // private
    _getAllNext: function(next)
    {
        var nodes = [];

        while (next)
        {
            var $next = $R.dom(next).nextElement();
            next = $next.get();

            if (next) nodes.push(next);
            else return nodes;
        }

        return nodes;
    },
    _isUnformat: function(type, nodes)
    {
        var countLists = 0;
        for (var i = 0; i < nodes.length; i++)
        {
            if (nodes[i].nodeType !== 3)
            {
                var tag = nodes[i].tagName.toLowerCase();
                if (tag === type || tag === 'figure')
                {
                    countLists++;
                }
            }
        }

        return (countLists === nodes.length);
    },
    _format: function(type, nodes)
    {
        var tags = ['p', 'div', 'blockquote', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol'];
        var blocks = this._uniteBlocks(nodes, tags);
        var lists = [];

        for (var key in blocks)
        {
            var items = blocks[key];
            var $list = this._createList(type, blocks[key]);

            for (var i = 0; i < items.length; i++)
            {
                var $item;

                // lists
                if (items[i].nodeType !== 3 && (items[i].tagName === 'UL' || items[i].tagName === 'OL'))
                {
                    var $oldList = $R.dom(items[i]);

                    $item = $oldList.contents();
                    $list.append($item);

                    // old is empty
                    if (this.utils.isEmpty($oldList)) $oldList.remove();
                }
                // other blocks or texts
                else
                {
                    $item = this._createListItem(items[i]);
                    this.utils.normalizeTextNodes($item);
                    $list.append($item);
                }
            }

            lists.push($list.get());
        }

        return lists;
    },
    _uniteBlocks: function(nodes, tags)
    {
        var z = 0;
        var blocks = { 0: [] };
        var lastcell = false;
        for (var i = 0; i < nodes.length; i++)
        {
            var $node = $R.dom(nodes[i]);
            var $cell = $node.closest('th, td');

            if ($cell.length !== 0)
            {
                if ($cell.get() !== lastcell)
                {
                    // create block
                    z++;
                    blocks[z] = [];
                }

                if (this._isUniteBlock(nodes[i], tags))
                {
                    blocks[z].push(nodes[i]);
                }
            }
            else
            {
                if (this._isUniteBlock(nodes[i], tags))
                {
                    blocks[z].push(nodes[i]);
                }
                else
                {
                    // create block
                    z++;
                    blocks[z] = [];
                }
            }

            lastcell = $cell.get();
        }

        return blocks;
    },
    _isUniteBlock: function(node, tags)
    {
        return (node.nodeType === 3 || tags.indexOf(node.tagName.toLowerCase()) !== -1);
    },
    _createList: function(type, blocks, key)
    {
        var last = blocks[blocks.length-1];
        var $last = $R.dom(last);
        var $list = $R.dom('<' + type + '>');
        $last.after($list);

        return $list;
    },
    _createListItem: function(item)
    {
        var $item = $R.dom('<li>');
        if (item.nodeType === 3)
        {
            $item.append(item);
        }
        else
        {
            var $el = $R.dom(item);
            $item.append($el.contents());
            $el.remove();
        }

        return $item;
    },
    _unformat: function(type, nodes)
    {
        if (nodes.length === 1)
        {
            // one list
            var $list = $R.dom(nodes[0]);
            var $items = $list.find('li');

            var selectedItems = this.selection.getNodes({ tags: ['li'] });
            var block = this.selection.getBlock();
            var $li = $R.dom(block).closest('li');
            if (selectedItems.length === 0 && $li.length !== 0)
            {
                selectedItems = [$li.get()];
            }


            // 1) entire
            if (selectedItems.length === $items.length)
            {
                return this._unformatEntire(nodes[0]);
            }

            var pos = this._getItemsPosition($items, selectedItems);

            // 2) top
            if (pos === 'Top')
            {
                return this._unformatAtSide('before', selectedItems, $list);
            }

            // 3) bottom
            else if (pos === 'Bottom')
            {
                selectedItems.reverse();
                return this._unformatAtSide('after', selectedItems, $list);
            }

            // 4) middle
            else if (pos === 'Middle')
            {
                var $last = $R.dom(selectedItems[selectedItems.length-1]);

                var ci = false;

                var $parent = false;
                var $secondList = $R.dom('<' + $list.get().tagName.toLowerCase() + '>');
                $items.each(function(node)
                {
                    if (ci)
                    {
                        var $node = $R.dom(node);
                        var $childList = ($node.children('ul, ol').length !== 0);

                        if ($node.closest('.redactor-split-item').length === 0 && ($parent === false || $node.closest($parent).length === 0))
                        {
                            $node.addClass('redactor-split-item');
                        }

                        $parent = $node;

                    }

                    if (node === $last.get())
                    {
                        ci = true;
                    }
                });

                $items.filter('.redactor-split-item').each(function(node)
                {
                    var $node = $R.dom(node);
                    $node.removeClass('redactor-split-item');
                    $secondList.append(node);
                });

                $list.after($secondList);

                selectedItems.reverse();
                for (var i = 0; i < selectedItems.length; i++)
                {
                    var $item = $R.dom(selectedItems[i]);
                    var $container = this._createUnformatContainer($item);

                    $list.after($container);
                    $container.find('ul, ol').remove();
                    $item.remove();
                }


                return;
            }

        }
        else
        {
            // unformat all
            for (var i = 0; i < nodes.length; i++)
            {
                if (nodes[i].nodeType !== 3 && nodes[i].tagName.toLowerCase() === type)
                {
                    this._unformatEntire(nodes[i]);
                }
            }
        }
    },
    _unformatEntire: function(list)
    {
        var $list = $R.dom(list);
        var $items = $list.find('li');
        $items.each(function(node)
        {
            var $item = $R.dom(node);
            var $container = this._createUnformatContainer($item);

            $item.remove();
            $list.before($container);

        }.bind(this));

        $list.remove();
    },
    _unformatAtSide: function(type, selectedItems, $list)
    {
        for (var i = 0; i < selectedItems.length; i++)
        {
            var $item = $R.dom(selectedItems[i]);
            var $container = this._createUnformatContainer($item);

            $list[type]($container);

            var $innerLists = $container.find('ul, ol').first();
            $item.append($innerLists);

            $innerLists.each(function(node)
            {
                var $node = $R.dom(node);
                var $parent = $node.closest('li');

                if ($parent.get() === selectedItems[i])
                {
                    $node.unwrap();
                    $parent.addClass('r-unwrapped');
                }

            });

            if (this.utils.isEmptyHtml($item.html())) $item.remove();
        }

        // clear empty
        $list.find('.r-unwrapped').each(function(node)
        {
            var $node = $R.dom(node);
            if ($node.html().trim() === '') $node.remove();
            else $node.removeClass('r-unwrapped');
        });
    },
    _getItemsPosition: function($items, selectedItems)
    {
        var pos = 'Middle';

        var sFirst = selectedItems[0];
        var sLast = selectedItems[selectedItems.length-1];

        var first = $items.first().get();
        var last = $items.last().get();

        if (first === sFirst && last !== sLast)
        {
            pos = 'Top';
        }
        else if (first !== sFirst && last === sLast)
        {
            pos = 'Bottom';
        }

        return pos;
    },
    _createUnformatContainer: function($item)
    {
        var $container;
        if (this.opts.markup === 'br')
        {
            $item.append('<br>');
            $container = $R.dom('<div class="redactor-list-item-container">');
        }
        else
        {
            $container = $R.dom('<' + this.opts.markup + '>');
        }

        $container.append($item.contents());

        return $container;
    },
    _getBlocks: function(tag)
    {
        return this.selection.getBlocksAndTextNodes({ first: true, cells: true, wrap: true });
    },
    _observeButton: function(button)
    {
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var isDisabled = (data.isPre() || data.isCode() || data.isFigcaption());

        this._observeButtonsList(isDisabled, ['lists', 'ul', 'ol', 'outdent', 'indent']);

        var itemOutdent = this.toolbar.getButton('outdent');
        var itemIndent = this.toolbar.getButton('indent');

        this._observeIndent(itemIndent, itemOutdent);
    },
    _observeDropdown: function(dropdown)
    {
        var itemOutdent = dropdown.getItem('outdent');
        var itemIndent = dropdown.getItem('indent');

        this._observeIndent(itemIndent, itemOutdent);
    },
    _observeIndent: function(itemIndent, itemOutdent)
    {
        var isCollapsed = this.selection.isCollapsed();
        var current = this.selection.getCurrent();
        var data = this.inspector.parse(current);
        var item = (data.isList()) ? data.getListItem() : false;
        var $item = $R.dom(item);
        var $prev = $item.prevElement();
        var prev = $prev.get();
        var isIndent = (isCollapsed && item && prev && prev.tagName === 'LI');

        if (itemOutdent)
        {
            if (item && isCollapsed) itemOutdent.enable();
            else itemOutdent.disable();
        }

        if (itemIndent)
        {
            if (item && isIndent) itemIndent.enable();
            else itemIndent.disable();
        }
    },
    _observeButtonsList: function(param, buttons)
    {
        for (var i = 0; i < buttons.length; i++)
        {
            var button = this.toolbar.getButton(buttons[i]);
            if (button)
            {
                if (param) button.disable();
                else button.enable();
            }
        }
    }
});

    window.Redactor = window.$R = $R;

}());
// Data attribute load
window.addEventListener('load', function()
{
    $R('[data-redactor]');
});