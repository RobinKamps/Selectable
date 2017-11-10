/*!
 *
 * Selectable
 * Copyright (c) 2017 Karl Saunders (http://mobius.ovh)
 * Dual licensed under the MIT (http://www.opensource.org/licenses/mit-license.php)
 * and GPL (http://www.opensource.org/licenses/gpl-license.php) licenses.
 *
 * Version: 0.9.2
 *
 */
(function(root, factory) {
    var plugin = "Selectable";

    if (typeof exports === "object") {
        module.exports = factory(plugin);
    } else if (typeof define === "function" && define.amd) {
        define([], factory);
    } else {
        root[plugin] = factory(plugin);
    }
})(typeof global !== 'undefined' ? global : this.window || this.global, function() {
    "use strict";

    var _version = "0.9.2";

    /**
     * Check for touch screen
     * @type {Boolean}
     */
    var _touch = (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);

    /**
     * Check for classList support
     * @type {Boolean}
     */
    var _supports = 'classList' in document.documentElement;

    /**
     * Default configuration properties
     * @type {Object}
     */
    var defaultConfig = {
        multiple: true,
        autoRefresh: true,

        throttle: 50,

        appendTo: document.body,

        filter: ".ui-selectable",
        tolerance: "touch",
        shiftDirection: "normal",

        autoScroll: {
            offset: 40,
            increment: 10,
        },

        lasso: {
            border: '1px dotted #000',
            backgroundColor: 'rgba(52, 152, 219, 0.2)',
        },

        classes: {
            lasso: "ui-lasso",
            multiple: "ui-multiple",
            selected: "ui-selected",
            container: "ui-container",
            selecting: "ui-selecting",
            selectable: "ui-selectable",
            unselecting: "ui-unselecting"
        }
    };

    /**
     * Attach removable event listener
     * @param  {Object}   el       HTMLElement
     * @param  {String}   type     Event type
     * @param  {Function} callback Event callback
     * @param  {Object}   scope    Function scope
     * @return {Void}
     */
    var on = function(el, type, callback, scope) {
        el.addEventListener(type, callback, false);
    }

    /**
     * Remove event listener
     * @param  {Object}   el       HTMLElement
     * @param  {String}   type     Event type
     * @param  {Function} callback Event callback
     * @return {Void}
     */
    var off = function(el, type, callback) {
        el.removeEventListener(type, callback);
    }

    /**
     * Find the closest matching ancestor to a node
     * @param  {Object}   el HTMLElement
     * @param  {Function} fn Callback
     * @return {Object|Boolean}
     */
    var closest = function(el, fn) {
        return el && (fn(el) ? el : closest(el.parentNode, fn));
    };

    /**
     * Check is item is object
     * @return {Boolean}
     */
    var isObject = function(val) {
        return Object.prototype.toString.call(val) === "[object Object]";
    };

    /**
     * Check is item array or array-like
     * @param  {Mixed} arr
     * @return {Boolean}
     */
    var isCollection = function(arr) {
        return Array.isArray(arr) || arr instanceof HTMLCollection || arr instanceof NodeList;
    }

    /**
     * Merge objects (reccursive)
     * @param  {Object} r
     * @param  {Object} t
     * @return {Object}
     */
    var extend = function(src, props) {
        for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
                var val = props[prop];
                if (val && isObject(val)) {
                    src[prop] = src[prop] || {};
                    extend(src[prop], val);
                } else {
                    src[prop] = val;
                }
            }
        }
        return src;
    };

    /**
     * Iterator helper
     * @param  {(Array|Object)}   arr     Any object, array or array-like collection.
     * @param  {Function}         fn      Callback
     * @param  {Object}           scope   Change the value of this
     * @return {Void}
     */
    var each = function(arr, fn, scope) {
        var n;
        if (isObject(arr)) {
            for (n in arr) {
                if (Object.prototype.hasOwnProperty.call(arr, n)) {
                    fn.call(scope, arr[n], n);
                }
            }
        } else {
            for (n = 0; n < arr.length; n++) {
                fn.call(scope, arr[n], n);
            }
        }
    };

    /**
     * Mass assign style properties
     * @param  {Object} t
     * @param  {(String|Object)} e
     * @param  {String|Object}
     */
    var css = function(i, t, e) {
        var n = i && i.style,
            o = isObject(t);
        if (n) {
            if (void 0 === e && !o) return e = window.getComputedStyle(i, ""), void 0 === t ? e : e[t];
            o ? each(t, function(i, t) {
                t in n || (t = "-webkit-" + t), n[t] = i + ("string" == typeof i ? "" : "opacity" === t ? "" : "px")
            }) : (t in n || (t = "-webkit-" + t), n[t] = e + ("string" == typeof e ? "" : "opacity" === t ? "" : "px"))
        }
    };

    /**
     * Get an element's DOMRect relative to the document instead of the viewport.
     * @param  {Object} t   HTMLElement
     * @param  {Boolean} e  Include margins
     * @return {Object}     Formatted DOMRect copy
     */
    var rect = function(e) {
        var w = window,
            o = e.getBoundingClientRect(),
            b = document.documentElement || document.body.parentNode || document.body,
            d = (void 0 !== w.pageXOffset) ? w.pageXOffset : b.scrollLeft,
            n = (void 0 !== w.pageYOffset) ? w.pageYOffset : b.scrollTop;
        return {
            x1: o.left + d,
            x2: o.left + o.width + d,
            y1: o.top + n,
            y2: o.top + o.height + n,
            height: o.height,
            width: o.width
        }
    };

    /**
     * Returns a function, that, as long as it continues to be invoked, will not be triggered.
     * @param  {Function} fn
     * @param  {Number} wait
     * @param  {Boolean} now
     * @return {Function}
     */
    var throttle = function(fn, limit, context) {
        var wait = undefined;
        return function() {
            context = context || this;
            if (!wait) {
                fn.apply(context, arguments);
                wait = true;
                return setTimeout(function() {
                    return wait = false;
                }, limit);
            }
        };
    };

    /**
     * classList shim
     * @type {Object}
     */
    var classList = {
        /**
         * Add a class name to a node
         * @param {Object} node Element node
         * @param {String} a Class name
         */
        add: function(node, name) {
            if (_supports) {
                node.classList.add(name);
            } else {
                if (!classList.contains(node, name)) {
                    node.className = node.className.trim() + " " + name;
                }
            }
        },

        /**
         * Remove a class name from a node
         * @param {Object} node Element node
         * @param {String} name Class name
         */
        remove: function(node, name) {
            if (_supports) {
                node.classList.remove(name);
            } else {
                if (classList.contains(node, name)) {
                    node.className = node.className.replace(
                        new RegExp("(^|\\s)" + name.split(" ").join("|") + "(\\s|$)", "gi"),
                        " "
                    );
                }
            }
        },

        /**
         * Check a node has class name
         * @param {Object} node Element node
         * @param {String} name Class name
         */
        contains: function(node, name) {
            if (node)
                return _supports ?
                    node.classList.contains(name) :
                    !!node.className &&
                    !!node.className.match(new RegExp("(\\s|^)" + name + "(\\s|$)"));
        }
    };

    /**
     * Detect CTRL or META key press
     * @param  {Object}  e Event interface
     * @return {Boolean}
     */
    var isCmdKey = function(e) {
        return !!e.ctrlKey || !!e.metaKey
    };

    /**
     * Detect SHIFT key press
     * @param  {Object}  e Event interface
     * @return {Boolean}
     */
    var isShiftKey = function(e) {
        return !!e.shiftKey;
    };

    /* SELECTABLE */
    function Selectable(options) {
        this.version = _version;
        this.config = extend(defaultConfig, options);
        this.init();
    };

    /**
     * Init instance
     * @return {void}
     */
    Selectable.prototype.init = function() {
        var that = this,
            o = this.config;

        // Is auto-scroll enabled?
        this.autoscroll = isObject(o.autoScroll);

        // Scroll data for auto-scroll
        this.data = { x: 0, y: 0, right: 0, left: 0, down: 0, up: 0 };

        /* lasso */
        this.lasso = document.createElement('div');
        this.lasso.className = o.classes.lasso;

        css(this.lasso, extend({
            position: "fixed",
            opacity: 0, // border will show even at zero width / height
        }, o.lasso));

        this.events = {
            start: this.start.bind(this),
            drag: this.drag.bind(this),
            end: this.end.bind(this),
            keydown: this.keydown.bind(this),
            recalculate: throttle(this.recalculate, o.throttle, this)
        }

        if (this.autoscroll) {
            this.events.scroll = throttle(this.scroll, o.throttle, this);
        }

        this.setContainer();

        this.update();

        this.enable();

        setTimeout(function() {
            that.emit("selectable.init");
        }, 10);
    };

    /**
     * Update instance
     * @return {Void}
     */
    Selectable.prototype.update = function() {
        var o = this.config.classes,
            c = classList.contains;

        this.size = {
            rect: rect(this.container),
            x: this.container.scrollLeft,
            y: this.container.scrollTop,
            w: this.container.scrollWidth,
            h: this.container.scrollHeight
        };

        this.items = [];

        each(this.nodes, function(el, i) {
            classList.add(el, o.selectable);

            this.items[i] = {
                node: el,
                rect: rect(el),
                startselected: false,
                selected: c(el, o.selected),
                selecting: c(el, o.selecting),
                unselecting: c(el, o.unselecting)
            };
        }, this);

        this.emit("selectable.update", this.items);
    };

    /**
     * Add instance event listeners
     * @return {Void}
     */
    Selectable.prototype.bind = function() {
        var e = this.events;

        // Attach event listeners
        on(this.container, 'mousedown', e.start);
        on(document, 'mousemove', e.drag);
        on(document, 'mouseup', e.end);
        on(document, 'keydown', e.keydown);

        if (this.autoscroll) {
            on(this.container, "scroll", e.scroll);
        }

        // Mobile
        on(this.container, "touchstart", e.start);
        on(document, "touchend", e.end);
        on(document, "touchcancel", e.end);
        on(document, "touchmove", e.drag);

        on(window, 'resize', e.recalculate);
        on(window, 'scroll', e.recalculate);
    };

    /**
     * Remove instance event listeners
     * @return {Void}
     */
    Selectable.prototype.unbind = function() {
        var e = this.events;

        off(this.container, 'mousedown', e.start);
        off(document, 'mousemove', e.drag);
        off(document, 'mouseup', e.end);
        off(document, 'keydown', e.keydown);

        if (this.autoscroll) {
            off(this.container, "scroll", e.scroll);
        }

        // Mobile
        off(this.container, "touchstart", e.start);
        off(document, "touchend", e.end);
        off(document, "touchcancel", e.end);
        off(document, "touchmove", e.drag);

        off(window, 'resize', e.recalculate);
        off(window, 'scroll', e.recalculate);
    };

    /**
     * mousedown / touchstart event listener
     * @param  {Object} e Event interface
     * @return {Void}
     */
    Selectable.prototype.start = function(e) {
        e.preventDefault();

        if (!this.container.contains(e.target)) return;

        var that = this,
            o = this.config,
            originalEl;

        var node = closest(e.target, function(el) {
            return el === that.container || classList.contains(el, o.classes.selectable);
        });

        if (!node || o.disabled) return false;

        // multiple check
        if (!o.multiple) {
            this.select(node);
        } else {

            var t = e.type === "touchstart";

            this.dragging = true;

            this.origin = {
                x: t ? e.touches[0].clientX : e.pageX,
                y: t ? e.touches[0].clientY : e.pageY,
            };

            if (this.autoscroll) {
                this.origin.scroll = {
                    x: this.container.scrollLeft,
                    y: this.container.scrollTop,
                };
            }

            this.container.appendChild(this.lasso);

            if (node !== this.container) {
                classList.add(node, o.classes.selecting);
            }

            if (o.autoRefresh) {
                this.update();
            }

            // Unselect single item if touched (touchscreens)
            if (_touch) {
                var item = this.get(node);

                if (item.selected) {
                    // cancel drag
                    this.dragging = false;
                    this.unselect(item);
                    return;
                }
            }

            if (isShiftKey(e)) {

                var items = this.items,
                    found = false,
                    num = this.items.length,
                    reverse = o.shiftDirection !== "normal";

                var shiftSelect = function(n) {
                    // found the item we clicked
                    if (items[n].node === node) {
                        found = true;
                    }

                    // found a selected item so stop
                    if (found && items[n].selected) {
                        return true;
                    }

                    // continue selecting items until we find a selected item
                    // or the first / last item if there aren't any
                    if (found) {
                        items[n].selecting = true;
                    }

                    return false;
                };

                if (reverse) {
                    for (var i = 0; i < num; i++) {
                        if (shiftSelect(i)) {
                            break;
                        }
                    }
                } else {
                    while (num--) {
                        if (shiftSelect(num)) {
                            break;
                        }
                    }
                }
            }
        }

        each(this.items, function(item) {
            var el = item.node;
            if (item.selected) {

                item.startselected = true;

                if (el !== node) {
                    if (!o.multiple || (!_touch && !isCmdKey(e) && !isShiftKey(e))) {
                        classList.remove(el, o.classes.selected);
                        item.selected = false;

                        classList.add(el, o.classes.unselecting);
                        item.unselecting = true;
                    }
                }

            }
            if (el === node) {
                originalEl = item;
            }
        });

        this.emit('selectable.start', originalEl);
    };

    /**
     * mousmove / touchmove event listener
     * @param  {Object} e Event interface
     * @return {Void}
     */
    Selectable.prototype.drag = function(e) {
        if (!this.dragging || isShiftKey(e)) return;

        var o = this.config;
        if (o.disabled) {
            return;
        }

        var that = this,
            c,
            tmp, cl = classList,
            cls = o.classes,
            t = e.type === "touchstart";

        this.offset = c = {
            x1: this.origin.x,
            y1: this.origin.y,
            x2: t ? e.touches[0].clientX : e.pageX,
            y2: t ? e.touches[0].clientY : e.pageY,
            scroll: { x: 0, y: 0 }
        };

        if (this.autoscroll) {
            c.scroll = {
                x: this.container.scrollLeft,
                y: this.container.scrollTop,
            };

            this.scrolling = {
                x: 0,
                y: 0
            };

            this.autoScroll(e);
        }

        if (c.x1 > c.x2) {
            tmp = c.x2, c.x2 = c.x1, c.x1 = tmp;
        }
        if (c.y1 > c.y2) {
            tmp = c.y2, c.y2 = c.y1, c.y1 = tmp;
        }

        /* highlight */
        each(this.items, function(item) {
            that.highlight(item, isCmdKey(e));
        });

        var coords = {
            x1: c.x1 + this.data.right,
            x2: (c.x2 + this.data.left) - (c.x1 + this.data.right),
            y1: c.y1 + this.data.down,
            y2: (c.y2 + this.data.up) - (c.y1 + this.data.down),
        }

        this.updateHelper(coords);

        this.emit('selectable.drag', coords);
    };

    /**
     * mouseup / touchend event listener
     * @param  {Object} e Event interface
     * @return {Void}
     */
    Selectable.prototype.end = function(e) {
        if (!this.dragging && this.config.multiple) return;

        this.dragging = false;

        // Reset the lasso
        css(this.lasso, { opacity: 0, left: 0, width: 0, top: 0, height: 0 });

        this.data.right = 0,
        this.data.left = 0,
        this.data.down = 0,
        this.data.up = 0;

        var selected = [],
            unselected = [];

        each(this.items, function(item) {
            var el = item.node;

            if (item.unselecting) {
                unselected.push(item);
                this.unselect(item);
            }

            if (item.selecting) {
                selected.push(item);
                this.select(item);
            }

        }, this);

        if (this.container.contains(this.lasso)) {
            this.container.removeChild(this.lasso);
        }

        this.emit('selectable.end', selected, unselected);
    };

    /**
     * keydown event listener
     * @param  {Object} e Event interface
     * @return {Void}
     */
    Selectable.prototype.keydown = function(e) {
        if (isCmdKey(e)) {
            if (e.keyCode == 65 || e.keyCode == 97) {
                e.preventDefault();
                this.selectAll();
            }
        }
    };

    /**
     * scroll event listener
     * @param  {Object} e Event interface
     * @return {Void}
     */
    Selectable.prototype.scroll = function(e) {
        each(this.items, function(item) {
            item.rect = rect(item.node);
        });
    };

    /**
     * Update the lasso dimensions
     * @param  {Object} coords Dimensions
     * @return {Void}
     */
    Selectable.prototype.updateHelper = function(coords) {
        var style = {
            opacity: 1,
            left: coords.x1,
            width: coords.x2,
            top: coords.y1,
            height: coords.y2
        };

        if ( this.autoscroll ) {
            style = extend(style, {
                zIndex: 0,
                position: "absolute",
                left: coords.x1 - this.size.rect.x1 + this.offset.scroll.x,
                top: coords.y1 - this.size.rect.y1 + this.offset.scroll.y,
            });
        }

        css(this.lasso, style);
    };

    /**
     * Auto scroll
     * @param  {Object} e Event interface
     * @return {Void}
     */
    Selectable.prototype.autoScroll = function(e) {
        var o = this.config.autoScroll,
            r = this.size.rect,
            l = this.offset.scroll.x,
            t = this.offset.scroll.y,
            w = this.size.w,
            h = this.size.h,
            x = 0,
            y = 0,
            nl = l,
            nt = t;

        // Check we're not scrolled all the way to the top or bottom
        if (t > 0 || t < h - r.height) {
            // Check we're in the auto-scroll trigger zone
            if (e.pageY >= r.y2 - o.offset || e.pageY <= r.y1 + o.offset) {
                if (e.pageY >= r.y2 - o.offset) { // scrolling down
                    y = o.increment;

                    this.scrolling.y = 1;
                } else if (e.pageY <= r.y1 + o.offset) { // scrolling up
                    y = -o.increment;

                    this.scrolling.y = -1;
                }

                nt += y;

                // scroll the container and store the new position
                this.container.scrollTop = this.offset.scroll.y = nt;
            }
        }

        // Check we're not scrolled all the way to the left or right
        if (l > 0 || l < w - r.width) {
            // Check we're in the auto-scroll trigger zone
            if (e.pageX >= r.x2 - o.offset || e.pageX <= r.x1 + o.offset) {
                if (e.pageX >= r.x2 - o.offset) { // scrolling right
                    x = o.increment;

                    this.scrolling.x = 1;
                } else if (e.pageX <= r.x1 + o.offset) { // scrolling left
                    x = -o.increment;

                    this.scrolling.x = -1;
                }

                nl += x;

                // scroll the container and store the new position
                this.container.scrollLeft = this.offset.scroll.x = nl;
            }
        }

        this.data.x = (this.origin.scroll.x - this.offset.scroll.x),
        this.data.y = (this.origin.scroll.y - this.offset.scroll.y);

        if (this.scrolling.x > 0) {
            this.data.right = this.data.x;
        } else if (this.scrolling.x < 0) {
            this.data.left = this.data.x;
        }

        if (this.scrolling.y > 0) {
            this.data.down = this.data.y;
        } else if (this.scrolling.y < 0) {
            this.data.up = this.data.y;
        }
    };

    /**
     * Highlight an item
     * @param  {Object} item   The item
     * @return {Void}
     */
    Selectable.prototype.highlight = function(item, cmd) {
        var offset = this.offset,
            o = this.config,
            cls = o.classes,
            el = item.node,
            r = item.rect,
            d = this.data,
            over = false;

        if (o.tolerance == "touch") {
            over = !(r.x1 > offset.x2 + d.left || (r.x2 < offset.x1 + d.right ||
                (r.y1 > offset.y2 + d.up || r.y2 < offset.y1 + d.down)));
        } else if (o.tolerance == "fit") {
            over = r.x1 > offset.x1 + d.right && (r.x2 < offset.x2 + d.left &&
                (r.y1 > offset.y1 + d.down && r.y2 < offset.y2 + d.up));
        }

        if (over) {
            if (item.selected) {
                classList.remove(el, cls.selected);
                item.selected = false;
            }
            if (item.unselecting) {
                classList.remove(el, cls.unselecting);
                item.unselecting = false;
            }
            if (!item.selecting) {
                classList.add(el, cls.selecting);
                item.selecting = true;
            }
        } else {
            if (item.selecting) {
                if (cmd && item.startselected) {
                    classList.remove(el, cls.selecting);
                    item.selecting = false;

                    classList.add(el, cls.selected);
                    item.selected = true;
                } else {
                    classList.remove(el, cls.selecting);
                    item.selecting = false;

                    if (item.startselected) {
                        classList.add(el, cls.unselecting);
                        item.unselecting = true;
                    }
                }
            }
            if (el.selected) {
                if (!cmd) {
                    if (!item.startselected) {
                        classList.remove(el, cls.selected);
                        item.selected = false;

                        classList.add(el, cls.unselecting);
                        item.unselecting = true;
                    }
                }
            }
        }
    };

    /**
     * Set the container
     * @param {String|Object} container CSS3 selector string or HTMLElement
     */
    Selectable.prototype.setContainer = function(container) {

        var o = this.config,
            old;

        if (this.container) {
            old = this.container;

            this.unbind();
        }

        container = container || o.appendTo;

        if (typeof container === 'string') {
            this.container = document.querySelector(container);
        } else if (container instanceof Element && container.nodeName) {
            this.container = container;
        }

        classList.add(this.container, this.config.classes.container);

        if (this.config.multiple) {
            classList.add(this.container, this.config.classes.multiple);
        }

        if (old) {
            classList.remove(old, this.config.classes.container);

            if (this.config.multiple) {
                classList.remove(old, this.config.classes.multiple);
            }
        }

        if (isCollection(o.filter)) {
            this.nodes = [].slice.call(o.filter);
        } else if (typeof o.filter === "string") {
            this.nodes = [].slice.call(this.container.querySelectorAll(o.filter));
        }

        if (this.autoscroll) {
            var pos, style = css(this.container);

            if (style.position === "static") {
                css(this.container, {
                    position: "relative"
                });
            }
        }

        this.bind();
    };

    /**
     * Select an item
     * @param  {Object} item
     * @return {Boolean}
     */
    Selectable.prototype.select = function(item) {

        if (isCollection(item)) {
            each(item, function(itm) {
                this.select(itm);
            }, this);

            return this.getSelectedItems();
        }

        item = this.get(item);

        if (item) {
            var el = item.node,
                o = this.config.classes;

            classList.remove(el, o.selecting);
            classList.add(el, o.selected);

            item.selecting = false;
            item.selected = true;
            item.startselected = true;

            this.emit('selectable.select', item);

            return item;
        }

        return false;
    };

    /**
     * Unselect an item
     * @param  {Object} item
     * @return {Boolean}
     */
    Selectable.prototype.unselect = function(item) {

        if (isCollection(item)) {
            each(item, function(itm) {
                this.unselect(itm);
            }, this);

            return this.getSelectedItems();
        }

        item = this.get(item);

        if (item) {
            var el = item.node,
                o = this.config.classes;

            item.selecting = false;
            item.selected = false;
            item.unselecting = false;
            item.startselected = false;

            classList.remove(el, o.unselecting);
            classList.remove(el, o.selecting);
            classList.remove(el, o.selected);

            this.emit('selectable.unselect', item);

            return item;
        }

        return false;
    };

    /**
     * Add a node to the instance
     * @param {Object} node HTMLElement
     * * @return {Void}
     */
    Selectable.prototype.add = function(node) {
        var o = this.config;

        if (isCollection(node)) {
            each(node, function(el) {
                if (this.nodes.indexOf(el) < 0 && el instanceof Element) {
                    this.nodes.push(el);
                }
            }, this);
        } else {
            if (this.nodes.indexOf(node) < 0 && node instanceof Element) {
                this.nodes.push(node);
            }
        }

        this.update();
    };

    /**
     * Remove an item from the instance so it's unselectable
     * @param  {Mixed} item index, node or object
     * @return {Boolean}
     */
    Selectable.prototype.remove = function(item, stop) {
        item = this.get(item);

        if (item) {
            if (isCollection(item)) {
                for (var i = item.length - 1; i >= 0; i--) {
                    this.remove(item[i], i > 0);
                }
            } else {
                var el = item.node,
                    o = this.config.classes,
                    rm = classList.remove;

                rm(el, o.selectable);
                rm(el, o.unselecting);
                rm(el, o.selecting);
                rm(el, o.selected);

                this.nodes.splice(this.nodes.indexOf(item.node), 1);
            }

            if (!stop) {
                this.update();
            }

            return true;
        }

        return false;
    };

    /**
     * Update item coords
     * @return {Void}
     */
    Selectable.prototype.recalculate = function() {
        each(this.nodes, function(el, i) {
            this.items[i].rect = rect(el);
        }, this);
        this.emit('selectable.recalculate');
    };

    /**
     * Select all items
     * @return {Void}
     */
    Selectable.prototype.selectAll = function() {
        each(this.items, function(item) {
            this.select(item);
        }, this);
    };

    /**
     * Unselect all items
     * @return {Void}
     */
    Selectable.prototype.clear = function() {
        for (var i = this.items.length - 1; i >= 0; i--) {
            this.unselect(this.items[i]);
        };
    };

    /**
     * Get an item
     * @return {Object|Boolean}
     */
    Selectable.prototype.get = function(item) {
        var found = false;

        if (isCollection(item)) {
            found = [];
            each(item, function(i) {
                i = this.get(i);

                if (i)
                    found.push(i);
            }, this);
        } else {
            // item is an index
            if (!isNaN(item)) {
                if (this.items.indexOf(this.items[item]) >= 0) {
                    found = this.items[item];
                }
            }
            // item is a node
            else if (item instanceof Element) {
                found = this.items[this.nodes.indexOf(item)];
            }
            // item is an item
            else if (isObject(item) && this.items.indexOf(item) >= 0) {
                found = item;
            }
        }
        return found;
    };

    /**
     * Get all items
     * @return {Array}
     */
    Selectable.prototype.getItems = function() {
        return this.items;
    };

    /**
     * Get all nodes
     * @return {Array}
     */
    Selectable.prototype.getNodes = function() {
        return this.nodes;
    };

    /**
     * Get all selected items
     * @return {Array}
     */
    Selectable.prototype.getSelectedItems = function() {
        return this.getItems().filter(function(item) {
            return item.selected;
        });
    };

    /**
     * Get all selected nodes
     * @return {Array}
     */
    Selectable.prototype.getSelectedNodes = function() {
        return this.getSelectedItems().map(function(item) {
            return item.node;
        });
    };

    /**
     * Add custom event listener
     * @param  {String} event
     * @param  {Function} callback
     * @return {Void}
     */
    Selectable.prototype.on = function(event, callback) {
        this.events = this.events || {};
        this.events[event] = this.events[event] || [];
        this.events[event].push(callback);
    };

    /**
     * Remove custom event listener
     * @param  {String} event
     * @param  {Function} callback
     * @return {Void}
     */
    Selectable.prototype.off = function(event, callback) {
        this.events = this.events || {};
        if (event in this.events === false) return;
        this.events[event].splice(this.events[event].indexOf(callback), 1);
    };

    /**
     * Fire custom event
     * @param  {String} event
     * @return {Void}
     */
    Selectable.prototype.emit = function(event) {
        this.events = this.events || {};
        if (event in this.events === false) return;
        for (var i = 0; i < this.events[event].length; i++) {
            this.events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
        }
    };

    /**
     * Enable instance
     * @return {Boolean}
     */
    Selectable.prototype.enable = function() {
        if (!this.enabled) {
            this.enabled = true;

            this.bind();

            classList.add(this.container, this.config.classes.container);

            if (this.config.multiple) {
                classList.add(this.container, this.config.classes.multiple);
            }

            this.emit('selectable.enable');
        }

        return this.enabled;
    };

    /**
     * Disable instance
     * @return {Boolean}
     */
    Selectable.prototype.disable = function() {
        if (this.enabled) {
            this.enabled = false;

            this.unbind();

            classList.remove(this.container, this.config.classes.container);

            if (this.config.multiple) {
                classList.remove(this.container, this.config.classes.multiple);
            }

            this.emit('selectable.disable');
        }

        return this.enabled;
    };

    /**
     * Destroy instance
     * @return {void}
     */
    Selectable.prototype.destroy = function() {
        var o = this.config.classes;

        this.disable();

        this.remove(this.items);

        each(this, function(val, prop) {
            if (prop !== "version" && prop !== "config") delete(this[prop]);
        }, this);
    };

    return Selectable;
});