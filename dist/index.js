(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Instagram = factory());
}(this, (function () { 'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* src/Instagram.svelte generated by Svelte v3.32.3 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i].permalink;
    	child_ctx[11] = list[i].media_url;
    	return child_ctx;
    }

    // (57:1) {#if showTitle}
    function create_if_block_3(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*title*/ ctx[1]);
    			attr(div, "class", "c-instagram__title");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*title*/ 2) set_data(t, /*title*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (79:21) 
    function create_if_block_2(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");

    			div.innerHTML = `<p><b>ERROR</b></p> 
			<p>El <b>nombre de usuario</b> es requerido. Recuerda que el nombre
				de usuario es:</p> 
			<ul><li>https://www.instagram.com/<i>NOMBRE_DE_USUARIO</i></li></ul>`;

    			attr(div, "class", "c-instagram__alert");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (75:58) 
    function create_if_block_1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.innerHTML = `<p>No se han obtenido imágenes</p>`;
    			attr(div, "class", "c-instagram__alert");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (60:1) {#if username && images.length && images.length > 0}
    function create_if_block(ctx) {
    	let div;
    	let div_class_value;
    	let each_value = /*images*/ ctx[6];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", div_class_value = "c-instagram__carousel " + (/*horizontalScroll*/ ctx[5]
    			? "c-instagram__scroll"
    			: "c-instagram__no-scroll"));
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*images, size, spacing*/ 88) {
    				each_value = /*images*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*horizontalScroll*/ 32 && div_class_value !== (div_class_value = "c-instagram__carousel " + (/*horizontalScroll*/ ctx[5]
    			? "c-instagram__scroll"
    			: "c-instagram__no-scroll"))) {
    				attr(div, "class", div_class_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (66:3) {#each images as { permalink, media_url }}
    function create_each_block(ctx) {
    	let a;
    	let div;
    	let t;
    	let a_href_value;

    	return {
    		c() {
    			a = element("a");
    			div = element("div");
    			t = space();
    			attr(div, "class", "c-instagram__carousel-item ");
    			set_style(div, "background-image", "url('" + /*media_url*/ ctx[11] + "')");
    			set_style(div, "width", /*size*/ ctx[3] + "px");
    			set_style(div, "height", /*size*/ ctx[3] + "px");
    			set_style(div, "margin-right", /*spacing*/ ctx[4] + "px");
    			attr(a, "class", "c-instagram__link");
    			attr(a, "href", a_href_value = /*permalink*/ ctx[10]);
    			attr(a, "target", "_blank");
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, div);
    			append(a, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*images*/ 64) {
    				set_style(div, "background-image", "url('" + /*media_url*/ ctx[11] + "')");
    			}

    			if (dirty & /*size*/ 8) {
    				set_style(div, "width", /*size*/ ctx[3] + "px");
    			}

    			if (dirty & /*size*/ 8) {
    				set_style(div, "height", /*size*/ ctx[3] + "px");
    			}

    			if (dirty & /*spacing*/ 16) {
    				set_style(div, "margin-right", /*spacing*/ ctx[4] + "px");
    			}

    			if (dirty & /*images*/ 64 && a_href_value !== (a_href_value = /*permalink*/ ctx[10])) {
    				attr(a, "href", a_href_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div;
    	let t;
    	let if_block0 = /*showTitle*/ ctx[2] && create_if_block_3(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*username*/ ctx[0] && /*images*/ ctx[6].length && /*images*/ ctx[6].length > 0) return create_if_block;
    		if (/*username*/ ctx[0] && /*images*/ ctx[6].length && /*images*/ ctx[6].length < 1) return create_if_block_1;
    		if (!/*username*/ ctx[0]) return create_if_block_2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type && current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			attr(div, "class", "c-instagram");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append(div, t);
    			if (if_block1) if_block1.m(div, null);
    		},
    		p(ctx, [dirty]) {
    			if (/*showTitle*/ ctx[2]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					if_block0.m(div, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type && current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();

    			if (if_block1) {
    				if_block1.d();
    			}
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { username = null } = $$props;
    	let { title = `Últimas imágenes de ${username}` } = $$props;
    	let { showTitle = true } = $$props;
    	let { q = 10 } = $$props;
    	let { size = 150 } = $$props;
    	let { spacing = 1 } = $$props;
    	let { horizontalScroll = true } = $$props;
    	let images = [];
    	const INSTAGRAM_REGEXP = new RegExp(/<script type="text\/javascript">window\._sharedData = (.*);<\/script>/);

    	const getPhotosFromInstagram = async () => {
    		let limitImages;
    		limitImages = q > 12 || q < 1 ? 12 : q;
    		const response = await fetch(`https://www.instagram.com/${username}/`);
    		const text = await response.text();
    		const json = JSON.parse(text.match(INSTAGRAM_REGEXP)[1]);
    		const edges = json.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges.splice(0, limitImages);

    		return edges.map(({ node }) => ({
    			permalink: `https://www.instagram.com/p/${node.shortcode}/`,
    			media_url: node.thumbnail_src
    		}));
    	};

    	onMount(async () => {
    		if (username) {
    			$$invalidate(6, images = await getPhotosFromInstagram());
    		}
    	});

    	$$self.$$set = $$props => {
    		if ("username" in $$props) $$invalidate(0, username = $$props.username);
    		if ("title" in $$props) $$invalidate(1, title = $$props.title);
    		if ("showTitle" in $$props) $$invalidate(2, showTitle = $$props.showTitle);
    		if ("q" in $$props) $$invalidate(7, q = $$props.q);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    		if ("spacing" in $$props) $$invalidate(4, spacing = $$props.spacing);
    		if ("horizontalScroll" in $$props) $$invalidate(5, horizontalScroll = $$props.horizontalScroll);
    	};

    	return [username, title, showTitle, size, spacing, horizontalScroll, images, q];
    }

    class Instagram extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			username: 0,
    			title: 1,
    			showTitle: 2,
    			q: 7,
    			size: 3,
    			spacing: 4,
    			horizontalScroll: 5
    		});
    	}
    }

    return Instagram;

})));
