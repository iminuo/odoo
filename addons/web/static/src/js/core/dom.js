odoo.define('web.dom_ready', function (require) {
'use strict';

var def = $.Deferred();
$(def.resolve.bind(def));
return def;
});

//==============================================================================

odoo.define('web.dom', function (require) {
"use strict";

/**
 * DOM Utility helpers
 *
 * We collect in this file some helpers to help integrate various DOM
 * functionalities with the odoo framework.  A common theme in these functions
 * is the use of the main core.bus, which helps the framework react when
 * something happens in the DOM.
 */

var config = require('web.config');
var core = require('web.core');
var _t = core._t;

/**
 * Private function to notify that something has been attached in the DOM
 * @param {htmlString or Element or Array or jQuery} [content] the content that
 * has been attached in the DOM
 * @params {Array} [callbacks] array of {widget: w, callback_args: args} such
 * that on_attach_callback() will be called on each w with arguments args
 */
function _notify(content, callbacks) {
    _.each(callbacks, function (c) {
        if (c.widget && c.widget.on_attach_callback) {
            c.widget.on_attach_callback(c.callback_args);
        }
    });
    core.bus.trigger('DOM_updated', content);
}

return {
    /**
     * Appends content in a jQuery object and optionnally triggers an event
     *
     * @param {jQuery} [$target] the node where content will be appended
     * @param {htmlString or Element or Array or jQuery} [content] DOM element,
     *   array of elements, HTML string or jQuery object to append to $target
     * @param {Boolean} [options.in_DOM] true if $target is in the DOM
     * @param {Array} [options.callbacks] array of objects describing the
     *   callbacks to perform (see _notify for a complete description)
     */
    append: function ($target, content, options) {
        $target.append(content);
        if (options && options.in_DOM) {
            _notify(content, options.callbacks);
        }
    },
    /**
     * Autoresize a $textarea node, by recomputing its height when necessary
     * @param {number} [options.min_height] by default, 50.
     * @param {Widget} [options.parent] if set, autoresize will listen to some
     *   extra events to decide when to resize itself.  This is useful for
     *   widgets that are not in the dom when the autoresize is declared.
     */
    autoresize: function ($textarea, options) {
        if ($textarea.data("auto_resize")) {
            return;
        }

        var $fixedTextarea;
        var minHeight;

        function resize() {
            $fixedTextarea.insertAfter($textarea);
            var heightOffset;
            var style = window.getComputedStyle($textarea[0], null);
            if (style.boxSizing === 'content-box') {
                heightOffset = -(parseFloat(style.paddingTop) + parseFloat(style.paddingBottom));
            } else {
                heightOffset = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
            }
            $fixedTextarea.width($textarea.width());
            $fixedTextarea.val($textarea.val());
            var height = $fixedTextarea[0].scrollHeight;
            $textarea.css({height: Math.max(height + heightOffset, minHeight)});
        }

        options = options || {};
        minHeight = (options && options.min_height) || 50;

        $fixedTextarea = $('<textarea disabled>', {
            class: $textarea[0].className,});

        var direction = _t.database.parameters.direction === 'rtl' ? 'right' : 'left';
        $fixedTextarea.css({
            position: 'absolute',
            opacity: 0,
            height: 10,
            top: -10000,
        }).css(direction, -10000);
        $fixedTextarea.data("auto_resize", true);

        var style = window.getComputedStyle($textarea[0], null);
        if (style.resize === 'vertical') {
            $textarea[0].style.resize = 'none';
        } else if (style.resize === 'both') {
            $textarea[0].style.resize = 'horizontal';
        }
        resize();
        $textarea.data("auto_resize", true);

        $textarea.on('input focus', resize);
        if (options.parent) {
            core.bus.on('DOM_updated', options.parent, resize);
            core.bus.on('view_shown', options.parent, resize);
        }
    },
    /**
     * jQuery find function behavior is::
     *
     *      $('A').find('A B') <=> $('A A B')
     *
     * The searches behavior to find options' DOM needs to be::
     *
     *      $('A').find('A B') <=> $('A B')
     *
     * This is what this function does.
     *
     * @param {jQuery} $from - the jQuery element(s) from which to search
     * @param {string} selector - the CSS selector to match
     * @returns {jQuery}
     */
    cssFind: function ($from, selector) {
        return $from.find('*').filter(selector);
    },
    /**
     * Detaches widgets from the DOM and performs their on_detach_callback()
     *
     * @param {Array} [to_detach] array of {widget: w, callback_args: args} such
     *   that w.$el will be detached and w.on_detach_callback(args) will be
     *   called
     * @param {jQuery} [options.$to_detach] if given, detached instead of
     *   widgets' $el
     * @return {jQuery} the detached elements
     */
    detach: function (to_detach, options) {
        _.each(to_detach, function (d) {
            if (d.widget.on_detach_callback) {
                d.widget.on_detach_callback(d.callback_args);
            }
        });
        var $to_detach = options && options.$to_detach;
        if (!$to_detach) {
            $to_detach = $(_.map(to_detach, function (d) {
                return d.widget.el;
            }));
        }
        return $to_detach.detach();
    },
    /**
     * Returns the selection range of an input or textarea
     *
     * @param {Object} node DOM item input or texteara
     * @returns {Object} range
     */
    getSelectionRange: function (node) {
        return {
            start: node.selectionStart,
            end: node.selectionEnd,
        };
    },
    /**
     * Returns the distance between a DOM element and the top-left corner of the
     * window
     *
     * @param {Object} e DOM element (input or texteara)
     * @return {Object} the left and top distances in pixels
     */
    getPosition: function (e) {
        var position = {left: 0, top: 0};
        while (e) {
            position.left += e.offsetLeft;
            position.top += e.offsetTop;
            e = e.offsetParent;
        }
        return position;
    },
    /**
     * Prepends content in a jQuery object and optionnally triggers an event
     *
     * @param {jQuery} [$target] the node where content will be prepended
     * @param {htmlString or Element or Array or jQuery} [content] DOM element,
     *   array of elements, HTML string or jQuery object to prepend to $target
     * @param {Boolean} [options.in_DOM] true if $target is in the DOM
     * @param {Array} [options.callbacks] array of objects describing the
     *   callbacks to perform (see _notify for a complete description)
     */
    prepend: function ($target, content, options) {
        $target.prepend(content);
        if (options && options.in_DOM) {
            _notify(content, options.callbacks);
        }
    },
    /**
     * Renders a button with standard odoo template. This does not use any xml
     * template to avoid forcing the frontend part to lazy load a xml file for
     * each widget which might want to create a simple button.
     *
     * @param {Object} options
     * @param {Object} [options.attrs] - Attributes to put on the button element
     * @param {string} [options.attrs.type='button']
     * @param {string} [options.attrs.class='btn-secondary']
     *        Note: automatically completed with "btn btn-X"
     *        (@see options.size for the value of X)
     * @param {string} [options.size] - @see options.attrs.class
     * @param {string} [options.icon]
     *        The specific fa icon class (for example "fa-home") or an URL for
     *        an image to use as icon.
     * @param {string} [options.text] - the button's text
     * @returns {jQuery}
     */
    renderButton: function (options) {
        var jQueryParams = _.extend({
            type: 'button',
        }, options.attrs || {});

        var extraClasses = jQueryParams.class;
        if (extraClasses) {
            // If we got extra classes, check if old oe_highlight/oe_link
            // classes are given and switch them to the right classes (those
            // classes have no style associated to them anymore).
            // TODO ideally this should be dropped at some point.
            extraClasses = extraClasses.replace(/\boe_highlight\b/g, 'btn-primary')
                                       .replace(/\boe_link\b/g, 'btn-link');
        }

        jQueryParams.class = 'btn';
        if (options.size) {
            jQueryParams.class += (' btn-' + options.size);
        }
        jQueryParams.class += (' ' + (extraClasses || 'btn-secondary'));

        var $button = $('<button/>', jQueryParams);

        if (options.icon) {
            if (options.icon.substr(0, 3) === 'fa-') {
                $button.append($('<i/>', {
                    class: 'fa fa-fw o_button_icon ' + options.icon,
                }));
            } else {
                $button.append($('<img/>', {
                    src: options.icon,
                }));
            }
        }
        if (options.text) {
            $button.append($('<span/>', {
                text: options.text,
            }));
        }

        return $button;
    },
    /**
     * Renders a checkbox with standard odoo/BS template. This does not use any
     * xml template to avoid forcing the frontend part to lazy load a xml file
     * for each widget which might want to create a simple checkbox.
     *
     * @param {Object} [options]
     * @param {Object} [options.prop]
     *        Allows to set the input properties (disabled and checked states).
     * @param {string} [options.text]
     *        The checkbox's associated text. If none is given then a simple
     *        checkbox is rendered.
     * @returns {jQuery}
     */
    renderCheckbox: function (options) {
        var id = _.uniqueId('checkbox-');
        var $container = $('<div/>', {
            class: 'custom-control custom-checkbox',
        });
        var $input = $('<input/>', {
            type: 'checkbox',
            id: id,
            class: 'custom-control-input',
        });
        var $label = $('<label/>', {
            for: id,
            class: 'custom-control-label',
            text: options && options.text || '',
        });
        if (!options || !options.text) {
            $label.html('&#8203;'); // BS checkboxes need some label content (so
                                // add a zero-width space when there is no text)
        }
        if (options && options.prop) {
            $input.prop(options.prop);
        }
        return $container.append($input, $label);
    },
    /**
     * Sets the selection range of a given input or textarea
     *
     * @param {Object} node DOM element (input or textarea)
     * @param {integer} range.start
     * @param {integer} range.end
     */
    setSelectionRange: function (node, range) {
        if (node.setSelectionRange){
            node.setSelectionRange(range.start, range.end);
        } else if (node.createTextRange){
            node.createTextRange()
                .collapse(true)
                .moveEnd('character', range.start)
                .moveStart('character', range.end)
                .select();
        }
    },
    /**
     * Creates an automatic 'more' dropdown-menu for a set of navbar items.
     *
     * @param {jQuery} $el
     * @param {Object} [options]
     * @param {string} [options.unfoldable='none']
     * @param {function} [options.maxWidth]
     * @param {string} [options.sizeClass='SM']
     */
    initAutoMoreMenu: function ($el, options) {
        options = _.extend({
            unfoldable: 'none',
            maxWidth: false,
            sizeClass: 'SM',
        }, options || {});

        var $extraItemsToggle = null;

        var debouncedAdapt = _.debounce(_adapt, 250);
        core.bus.on('resize', null, debouncedAdapt);
        _adapt();

        $el.data('dom:autoMoreMenu:destroy', function () {
            _restore();
            core.bus.off('resize', null, debouncedAdapt);
            $el.removeData('dom:autoMoreMenu:destroy');
        });

        function _restore() {
            if ($extraItemsToggle === null) {
                return;
            }
            var $items = $extraItemsToggle.children('.dropdown-menu').children();
            $items.addClass('nav-item');
            $items.children('.dropdown-item, a').removeClass('dropdown-item').addClass('nav-link');
            $items.insertBefore($extraItemsToggle);
            $extraItemsToggle.remove();
            $extraItemsToggle = null;
        }

        function _adapt() {
            if (!$el.is(':visible')) {
                return;
            }

            _restore();
            if (config.device.size_class <= config.device.SIZES[options.sizeClass]) {
                return;
            }

            var $allItems = $el.children();
            var $unfoldableItems = $allItems.filter(options.unfoldable);
            var $items = $allItems.not($unfoldableItems);

            var maxWidth = 0;
            if (options.maxWidth) {
                maxWidth = options.maxWidth();
            } else {
                var rect = $el[0].getBoundingClientRect();
                var style = window.getComputedStyle($el[0]);
                maxWidth = (rect.right - rect.left);
                maxWidth -= (parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth));
                maxWidth -= _.reduce($unfoldableItems, function (sum, el) {
                    return sum + computeFloatOuterWidthWithMargins(el);
                }, 0);
            }

            var nbItems = $items.length;
            var menuItemsWidth = _.reduce($items, function (sum, el) {
                return sum + computeFloatOuterWidthWithMargins(el);
            }, 0);

            if (maxWidth - menuItemsWidth >= -0.001) {
                return
            }

            var $dropdownMenu = $('<ul/>', {class: 'dropdown-menu'});
            $extraItemsToggle = $('<li/>', {class: 'nav-item dropdown o_extra_menu_items'})
                .append($('<a/>', {href: '#', class: 'nav-link dropdown-toggle o-no-caret', 'data-toggle': 'dropdown'})
                    .append($('<i/>', {class: 'fa fa-plus'})))
                .append($dropdownMenu);
            $extraItemsToggle.insertAfter($items.last());

            menuItemsWidth += computeFloatOuterWidthWithMargins($extraItemsToggle[0]);
            do {
                menuItemsWidth -= computeFloatOuterWidthWithMargins($items.eq(--nbItems)[0]);
            } while (menuItemsWidth > maxWidth);

            var $extraItems = $items.slice(nbItems).detach();
            $extraItems.removeClass('nav-item');
            $extraItems.children('.nav-link, a').removeClass('nav-link').addClass('dropdown-item');
            $dropdownMenu.append($extraItems);
            $extraItemsToggle.find('.nav-link').toggleClass('active', $extraItems.children().hasClass('active'));
        }

        function computeFloatOuterWidthWithMargins(el) {
            var rect = el.getBoundingClientRect();
            var style = window.getComputedStyle(el);
            return rect.right - rect.left + parseFloat(style.marginLeft) + parseFloat(style.marginRight);
        }
    },
    /**
     * Cleans what has been done by `initAutoMoreMenu'.
     *
     * @param {jQuery} $el
     */
    destroyAutoMoreMenu: function ($el) {
        var destroyFunc = $el.data('dom:autoMoreMenu:destroy');
        if (destroyFunc) {
            destroyFunc.call(null);
        }
    },
};
});
