import { r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
// node_modules/framer-motion/dist/es/utils/use-constant.mjs
var import_jsx_runtime = require_jsx_runtime();
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* Creates a constant value over the lifecycle of a component.
*
* Even if `useMemo` is provided an empty array as its final argument, it doesn't offer
* a guarantee that it won't re-run for performance reasons later on. By using `useConstant`
* you can ensure that initialisers don't execute twice or more.
*/
function useConstant(init) {
	const ref = (0, import_react.useRef)(null);
	if (ref.current === null) ref.current = init();
	return ref.current;
}
// node_modules/motion-dom/dist/es/animation/utils/resolve-transition.mjs
/**
* If `transition` has `inherit: true`, shallow-merge it with
* `parentTransition` (child keys win) and strip the `inherit` key.
* Otherwise return `transition` unchanged.
*/
function resolveTransition(transition, parentTransition) {
	if (transition?.inherit && parentTransition) {
		const { inherit: _, ...rest } = transition;
		return {
			...parentTransition,
			...rest
		};
	}
	return transition;
}
// node_modules/framer-motion/dist/es/context/MotionConfigContext.mjs
/**
* @public
*/
var MotionConfigContext = /* @__PURE__ */ (0, import_react.createContext)({
	transformPagePoint: (p) => p,
	isStatic: false,
	reducedMotion: "never"
});
// node_modules/framer-motion/dist/es/components/MotionConfig/index.mjs
/**
* `MotionConfig` is used to set configuration options for all children `motion` components.
*
* ```jsx
* import { motion, MotionConfig } from "framer-motion"
*
* export function App() {
*   return (
*     <MotionConfig transition={{ type: "spring" }}>
*       <motion.div animate={{ x: 100 }} />
*     </MotionConfig>
*   )
* }
* ```
*
* @public
*/
function MotionConfig({ children, ...config }) {
	/**
	* Inherit props from any parent MotionConfig components
	*/
	const parentConfig = (0, import_react.useContext)(MotionConfigContext);
	config = {
		...parentConfig,
		...config
	};
	config.transition = resolveTransition(config.transition, parentConfig.transition);
	/**
	* Don't allow isStatic to change between renders as it affects how many hooks
	* motion components fire.
	*/
	config.isStatic = useConstant(() => config.isStatic);
	/**
	* Creating a new config context object will re-render every `motion` component
	* every time it renders. So we only want to create a new one sparingly.
	*/
	const context = (0, import_react.useMemo)(() => config, [
		JSON.stringify(config.transition),
		config.transformPagePoint,
		config.reducedMotion,
		config.skipAnimations,
		config.isValidProp
	]);
	return (0, import_jsx_runtime.jsx)(MotionConfigContext.Provider, {
		value: context,
		children
	});
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/dev-stub.js
function emit(_event) {}
function note(_message, _from, _detail) {}
function exposeShortcuts(_list) {}
function measured(read) {
	read();
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/after-bind.js
var pending = /* @__PURE__ */ new Set();
function afterBind(write) {
	pending.add(write);
	queueMicrotask(() => {
		if (pending.delete(write)) write();
	});
}
function runBindWrites() {
	for (const write of pending) {
		pending.delete(write);
		write();
	}
}
// node_modules/@ui-sdk/core/dist/foundation/platform/style.js
function setStyle(el, name, value) {
	const previous = el.style.getPropertyValue(name);
	const priority = el.style.getPropertyPriority(name);
	el.style.setProperty(name, value);
	const ours = el.style.getPropertyValue(name);
	return () => {
		if (el.style.getPropertyValue(name) !== ours) return;
		if (previous) el.style.setProperty(name, previous, priority);
		else el.style.removeProperty(name);
	};
}
var adopted = () => globalThis[/* @__PURE__ */ Symbol.for("ui-sdk.styles@1")] ??= /* @__PURE__ */ new WeakMap();
var nonces = /* @__PURE__ */ new WeakMap();
function pageNonce(doc) {
	if (nonces.has(doc)) return nonces.get(doc);
	let meta;
	for (let at = doc; at && !meta; at = at.defaultView?.frameElement?.ownerDocument) meta = at.head?.querySelector("meta[property=\"csp-nonce\"]");
	const nonce = meta ? meta.nonce || meta.getAttribute("nonce") || "" : null;
	nonces.set(doc, nonce);
	return nonce;
}
function writeStyle(doc, id, css) {
	if (!doc.head) return;
	const view = doc.defaultView;
	if (pageNonce(doc) === "" && view && "adoptedStyleSheets" in doc) adoptStyle(doc, view, id, css);
	else appendStyle(doc, id, css);
}
var styleText = /* @__PURE__ */ new WeakMap();
function appendStyle(doc, id, css) {
	const existing = doc.getElementById(id);
	if (existing) {
		if (styleText.get(existing) === css) return;
		if (existing.textContent !== css) existing.textContent = css;
		styleText.set(existing, css);
		return;
	}
	const style = doc.createElement("style");
	style.id = id;
	const nonce = pageNonce(doc);
	if (nonce) style.nonce = nonce;
	style.textContent = css;
	styleText.set(style, css);
	const ours = doc.head.querySelectorAll(":scope > style[id^=\"ui-sdk-\"]");
	if (ours.length) ours[ours.length - 1].after(style);
	else doc.head.prepend(style);
}
function adoptStyle(doc, view, id, css) {
	let sheets = adopted().get(doc);
	if (!sheets) adopted().set(doc, sheets = /* @__PURE__ */ new Map());
	let entry = sheets.get(id);
	if (!entry) sheets.set(id, entry = {
		sheet: new view.CSSStyleSheet(),
		css: ""
	});
	if (entry.css !== css) {
		entry.sheet.replaceSync(css);
		entry.css = css;
	}
	if (!doc.adoptedStyleSheets.includes(entry.sheet)) doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, entry.sheet];
}
function enforceHidden(doc) {
	writeStyle(doc, "ui-sdk-hidden", "@layer ui-sdk { :where([data-slot][hidden]:not([hidden=\"until-found\"])) { display: none !important } }");
}
var queued;
function ahead(work) {
	if (typeof window === "undefined") return;
	if (!performance.getEntriesByType("paint").length) work();
	else if (queued) queued.push(work);
	else {
		queued = [work];
		(window.requestIdleCallback ?? setTimeout)(() => {
			const jobs = queued;
			queued = void 0;
			jobs.forEach((job) => job());
		});
	}
}
function afterPaint(work) {
	let timer;
	const frame = requestAnimationFrame(() => {
		timer = setTimeout(work);
	});
	return () => {
		cancelAnimationFrame(frame);
		clearTimeout(timer);
	};
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/events.js
function on(target, type, listener, options) {
	target.addEventListener(type, listener, options);
	return () => target.removeEventListener(type, listener, options);
}
function isComposing(event) {
	const key = "nativeEvent" in event ? event.nativeEvent : event;
	return key.isComposing === true || key.keyCode === 229;
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/store.js
var changedInPlace = /* @__PURE__ */ new WeakSet();
function sameValue(a, b) {
	if (Object.is(a, b)) return true;
	if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
	if (changedInPlace.has(a) || changedInPlace.has(b)) return false;
	return a.every((item, index) => Object.is(item, b[index]));
}
var isPlainObject = (value) => {
	if (typeof value !== "object" || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};
function sameSlotState(a, b) {
	return sameWithin(a, b, void 0);
}
function sameWithin(a, b, open) {
	if (Object.is(a, b)) return true;
	const arrays = Array.isArray(a) && Array.isArray(b);
	if (!arrays && !(isPlainObject(a) && isPlainObject(b))) return false;
	if (open) {
		for (let index = 0; index < open.length; index += 2) if (open[index] === a && open[index + 1] === b) return true;
	}
	const within = open ?? [];
	within.push(a, b);
	try {
		if (arrays) {
			const left2 = a;
			const right2 = b;
			if (left2.length !== right2.length || changedInPlace.has(left2) || changedInPlace.has(right2)) return false;
			for (let index = 0; index < left2.length; index++) if (!sameWithin(left2[index], right2[index], within)) return false;
			return true;
		}
		const left = a;
		const right = b;
		const keys = Object.keys(left);
		if (keys.length !== Object.keys(right).length) return false;
		for (const key of keys) if (!(key in right) || !sameWithin(left[key], right[key], within)) return false;
		return true;
	} finally {
		within.length -= 2;
	}
}
function createStore(initial, live) {
	let state = initial;
	let renders2 = 0;
	let writes2 = 0;
	let followed;
	let merged;
	let reading = false;
	let viewed;
	const listeners = /* @__PURE__ */ new Set();
	const skipping = /* @__PURE__ */ new Map();
	let fanout;
	const store = {
		get() {
			return viewed ?? withFollowed();
		},
		set(patch, delivered = false) {
			if (followed && !delivered && !reading) {
				const over = withFollowed();
				if (over !== state) {
					const rest = { ...over };
					for (const key in patch) delete rest[key];
					store.set(rest, true);
				}
			}
			const changed = [];
			for (const key in patch) if (!sameValue(state[key], patch[key])) changed.push(key);
			if (!changed.length) return;
			const previous = state;
			state = {
				...state,
				...patch
			};
			notify(changed, previous, changed.every((key) => live.includes(key)), delivered);
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		setFanout(next) {
			fanout = next;
		},
		follow(read) {
			followed = read;
		},
		view(next, read) {
			const before = viewed;
			viewed = next;
			try {
				return read();
			} finally {
				viewed = before;
			}
		}
	};
	function withFollowed() {
		if (!followed || reading) return state;
		reading = true;
		let over;
		try {
			over = followed(state);
		} finally {
			reading = false;
		}
		if (!over) return state;
		if (merged?.state === state && merged.over === over) return merged.result;
		let result = state;
		for (const key in over) if (!sameValue(state[key], over[key])) {
			result = {
				...state,
				...over
			};
			break;
		}
		merged = {
			state,
			over,
			result
		};
		return result;
	}
	function notify(changed, previous, liveOnly, delivered) {
		if (!liveOnly) renders2++;
		if (!delivered) writes2++;
		const run = (listener) => listener(liveOnly, delivered, changed);
		listeners.forEach(run);
		for (const [skip, group] of skipping) if (!changed.length || changed.some((key) => !Object.hasOwn(skip, key))) group.forEach(run);
		fanout?.(changed, previous, run);
	}
	held.set(store, {
		state: () => state,
		renders: () => renders2,
		writes: () => writes2,
		touch: () => notify([], state, false, false),
		skipping
	});
	return store;
}
var held = /* @__PURE__ */ new WeakMap();
function subscribeSkipping(store, skip, listener) {
	return join(held.get(store).skipping, skip, listener);
}
function join(groups, group, listener) {
	let members = groups.get(group);
	if (!members) groups.set(group, members = /* @__PURE__ */ new Set());
	members.add(listener);
	return () => {
		members.delete(listener);
		if (!members.size && groups.get(group) === members) groups.delete(group);
	};
}
var heldState = (store) => held.get(store).state();
var renders = (store) => held.get(store).renders();
var standFor = (owner, store) => {
	held.set(owner, held.get(store));
};
var touch = (store) => held.get(store).touch();
// node_modules/@ui-sdk/core/dist/foundation/kernel/selects.js
var isReader = (values) => typeof values === "object" && values !== null && !Array.isArray(values);
var narrowedStores = /* @__PURE__ */ new WeakMap();
function narrowedOf(store) {
	const found = narrowedStores.get(store);
	if (found) return found;
	const narrowed = {
		selectors: /* @__PURE__ */ new Map(),
		selecting: /* @__PURE__ */ new Map()
	};
	narrowedStores.set(store, narrowed);
	store.setFanout((changed, previous, run) => {
		const state = store.get();
		for (const key of changed) {
			const movers = narrowed.selecting.get(key);
			if (!movers) continue;
			const notify = (value) => narrowed.selectors.get(`${String(key)}:${value}`)?.forEach(run);
			const before = previous[key];
			for (const [moved, naming] of movers) if (moved(before, state[key], notify) === true) naming.forEach(run);
		}
	});
	return narrowed;
}
function selects(reads) {
	const narrowing = Object.entries(reads).filter(([, values]) => isReader(values) || typeof values === "function" || values.length > 0);
	const valuesOf = (values, partView) => isReader(values) ? values.values(partView) : typeof values === "function" ? values(partView) : values;
	const selected = (part, props) => {
		const partView = view(part, props);
		return narrowing.map(([key, values]) => [key, valuesOf(values, partView)]);
	};
	return {
		/**
		* The values a part reads each key it lists by, an empty list for a key it
		* never reads. A key it doesn't list, it reads whole.
		*/
		reading(part, props) {
			const partView = view(part, props);
			return new Map(Object.entries(reads).flatMap(([key, values]) => isReader(values) ? [] : [[key, valuesOf(values, partView)]]));
		},
		/** The values a part selects on, which it subscribes again for when they change. */
		selection(part, props) {
			const values = selected(part, props);
			return values.length ? JSON.stringify(values) : "";
		},
		/**
		* Runs `listener` when a change can affect the part: a key it selects on
		* took or left one of its values, or any other key changed. Every part of
		* the slot skips the listed keys as one group.
		*/
		subscribe(part, listener, props) {
			const cleanups = [subscribeSkipping(part.store, reads, listener)];
			for (const [key, values] of selected(part, props)) {
				const reader = reads[key];
				const moved = isReader(reader) ? reader.moved : eachMoved;
				cleanups.push(...values.map((value) => select(part.store, key, value, listener, moved)));
				if (moved !== eachMoved) cleanups.push(joinMover(part.store, key, moved, listener));
			}
			return () => cleanups.forEach((cleanup) => cleanup());
		}
	};
}
function select(store, key, value, listener, moved = eachMoved) {
	const leaveMover = joinMover(store, key, moved, () => {});
	const leave = join(narrowedOf(store).selectors, `${String(key)}:${value}`, listener);
	return () => {
		leave();
		leaveMover();
	};
}
function joinMover(store, key, moved, listener) {
	const { selecting } = narrowedOf(store);
	let movers = selecting.get(key);
	if (!movers) selecting.set(key, movers = /* @__PURE__ */ new Map());
	const leave = join(movers, moved, listener);
	return () => {
		leave();
		if (!movers.size && selecting.get(key) === movers) selecting.delete(key);
	};
}
function eachMoved(before, after, notify) {
	if (before == null) before = emptyLike(after, before);
	else if (after == null) after = emptyLike(before, after);
	if (isRecord(before) && isRecord(after)) {
		for (const name in before) if (!Object.hasOwn(after, name) || !Object.is(before[name], after[name])) notify(name);
		for (const name in after) if (!Object.hasOwn(before, name)) notify(name);
		return;
	}
	if (!Array.isArray(before) || !Array.isArray(after)) return [before, after].forEach(notify);
	let start = 0;
	let end = 0;
	while (start < before.length && before[start] === after[start]) start++;
	while (end < before.length - start && end < after.length - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
	for (const values of [before, after]) for (let index = start; index < values.length - end; index++) notify(values[index]);
}
var isRecord = (value) => !!value && Object.getPrototypeOf(value) === Object.prototype;
var noItems = [];
var noEntries = {};
var emptyLike = (other, missing) => Array.isArray(other) ? noItems : isRecord(other) ? noEntries : missing;
// node_modules/@ui-sdk/core/dist/foundation/kernel/part.js
var ownerOf = (part) => part.owner;
var definitionOf = (part) => ownerOf(part).slots[part.slot];
var view = (part, props) => ({
	id: part.id,
	key: part.key,
	props,
	api: part.api
});
var context = (part, props = part.props) => ({
	el: part.el,
	id: part.id,
	key: part.key,
	props,
	store: part.store,
	api: part.api
});
function lease(part) {
	const { parts } = part.owner;
	const mapKey = `${part.slot}:${part.key}`;
	if (!parts.has(mapKey)) parts.set(mapKey, part);
	part.leases++;
	let held2 = true;
	return () => {
		if (!held2) return;
		held2 = false;
		if (--part.leases) return;
		const { owner } = part;
		if (!owner.released.length) queueMicrotask(() => sweep(owner));
		owner.released.push(part);
	};
}
function provisional(part) {
	const { owner } = part;
	if (!owner.released.length) queueMicrotask(() => sweep(owner));
	owner.released.push(part);
}
function sweep(owner) {
	for (const part of owner.released) {
		const mapKey = `${part.slot}:${part.key}`;
		if (!part.leases && owner.parts.get(mapKey) === part) owner.parts.delete(mapKey);
	}
	owner.released = [];
}
function attrs(part, props = part.props, state = part.store.get()) {
	const definition = definitionOf(part);
	const context2 = view(part, props);
	const own = definition.attrs?.(state, context2);
	const declared = definition.role;
	const role = typeof declared === "function" ? declared(state, context2) : declared;
	const { name } = ownerOf(part);
	const result = {
		"data-slot": part.slot === "root" ? name : `${name}-${part.slot}`,
		...declared === void 0 ? void 0 : { role },
		...own
	};
	if (declared !== void 0) result.role = role;
	return aliased(part, result);
}
var authorOwned = /* @__PURE__ */ new Set([
	"aria-label",
	"aria-labelledby",
	"aria-description",
	"title",
	"autocomplete",
	"autocapitalize",
	"autocorrect",
	"spellcheck",
	"inputmode",
	"enterkeyhint"
]);
function yieldToAuthor(attrs2, given) {
	let result;
	for (const name in attrs2) if (attrs2[name] !== void 0 && authorOwned.has(name) && given(name)) (result ??= { ...attrs2 })[name] = void 0;
	return result ?? attrs2;
}
var madeLabel = (value) => typeof value === "string" && value.split(/\s+/).every((id) => id.startsWith("ui-sdk-"));
function partState(part, props = part.props, state = part.store.get()) {
	return definitionOf(part).state?.(state, view(part, props)) ?? {};
}
function present(part, props = part.props, state = part.store.get()) {
	return definitionOf(part).present?.(state, view(part, props)) ?? true;
}
function liveAttrs(part, props = part.props) {
	return aliased(part, definitionOf(part).live?.read(part.store.get(), view(part, props)) ?? {});
}
var directNames = (part) => definitionOf(part).direct?.names;
var selectedKeys = (part, props = part.props) => definitionOf(part).selects?.selection(part, props) ?? "";
var skipNone = {};
function subscribe(part, listener, props = part.props) {
	const narrowed = definitionOf(part).selects;
	const cleanups = [lease(part), narrowed ? narrowed.subscribe(part, listener, props) : subscribeSkipping(part.store, skipNone, listener)];
	return () => cleanups.forEach((cleanup) => cleanup());
}
function handlers(part) {
	const { on: events, press: activate } = definitionOf(part);
	const result = {};
	for (const type in events) {
		const handler = events[type];
		result[type] = (event) => {
			if (event.defaultPrevented || ignoredKey(event)) return;
			ownerOf(part).sleeping?.wake();
			handler(event, context(part));
		};
	}
	if (typeof activate === "function" && !result.click) result.click = (event) => {
		if (!event.defaultPrevented) {
			ownerOf(part).sleeping?.wake();
			activate(context(part), event);
		}
	};
	return result;
}
function commit(part, props) {
	if (part.props === props) return;
	part.props = props;
	propsRendered(part);
}
function propsRendered(part) {
	part.propsListeners?.forEach((listener) => listener());
}
function onProps(part, listener) {
	const listeners = part.propsListeners ??= /* @__PURE__ */ new Set();
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
var hidingSlots = /* @__PURE__ */ new WeakMap();
function canHide(part) {
	const definition = definitionOf(part);
	let hides = hidingSlots.get(definition);
	if (hides === void 0) {
		hides = !!definition.attrs && "hidden" in definition.attrs(part.store.get(), view(part, part.props));
		hidingSlots.set(definition, hides);
	}
	return hides;
}
function bind(part, el, host = { by: "core" }) {
	const kept = part;
	const { parts } = kept.owner;
	const mapKey = `${part.slot}:${part.key}`;
	if (!part.el && (parts.get(mapKey) ?? kept) === kept) {
		parts.delete(mapKey);
		parts.set(mapKey, kept);
	}
	const binding = {};
	part.el = el;
	kept.binding = binding;
	const cleanups = [lease(kept)];
	if (canHide(part)) enforceHidden(el.ownerDocument);
	for (const [type, handler] of Object.entries(handlers(part))) if (host.by === "core" || host.attaches !== "all" && !host.attaches.includes(type)) cleanups.push(on(el, type, handler));
	const definition = definitionOf(part);
	if (definition.live) cleanups.push(definition.live.attach(part, el));
	if (host.by === "framework" && definition.direct) cleanups.push(definition.direct.attach(part, el));
	const early = definition.asleep?.(el, part);
	if (early) cleanups.push(early);
	const late = () => {
		const cleanup = definition.bind?.(el, part);
		if (cleanup) cleanups.push(cleanup);
	};
	const { sleeping } = kept.owner;
	if (sleeping && definition.bind) {
		sleeping.binds.add(late);
		cleanups.push(() => sleeping.binds.delete(late));
	} else late();
	if (definition.attrs && typeof MutationObserver !== "undefined") cleanups.push(followId(kept, el));
	return () => {
		cleanups.forEach((cleanup) => cleanup());
		if (kept.binding !== binding) return;
		part.el = kept.binding = void 0;
		if (kept.own !== void 0) readIdLater(kept);
	};
}
function ref(part, host) {
	const kept = part;
	if (kept.ref) return kept.ref;
	let current = null;
	let unbind = () => {};
	return kept.ref = (el) => {
		if (el === current) return;
		unbind();
		current = el;
		unbind = el ? bind(part, el, host) : () => {};
	};
}
var references = [
	"aria-activedescendant",
	"aria-controls",
	"aria-describedby",
	"aria-details",
	"aria-errormessage",
	"aria-flowto",
	"aria-labelledby",
	"aria-owns",
	"for",
	"headers"
];
var madeId = (part) => definitionOf(part).attrs?.(part.store.get(), view(part, {
	...part.props,
	id: void 0
})).id;
function aliased(part, attrs2) {
	const { owner } = part;
	if (!owner.named?.size || !references.some((name) => attrs2[name])) return attrs2;
	const aliases = aliasesOf(owner, part.store);
	if (!aliases.size) return attrs2;
	const result = { ...attrs2 };
	for (const name of references) {
		const ids = result[name];
		if (ids) result[name] = ids.split(" ").map((id) => aliases.get(id) ?? id).join(" ");
	}
	return result;
}
function aliasesOf(owner, store) {
	const version = renders(store);
	if (owner.aliases?.version === version) return owner.aliases.map;
	const map = /* @__PURE__ */ new Map();
	for (const part of owner.named) {
		const made = madeId(part);
		if (made !== void 0 && made !== part.own) map.set(made, part.own);
	}
	owner.aliases = {
		version,
		map
	};
	return map;
}
function followId(part, el) {
	if (el.hasAttribute("id") || part.own !== void 0) readIdLater(part);
	const observer = new MutationObserver(() => readIdLater(part));
	observer.observe(el, { attributeFilter: ["id"] });
	return () => observer.disconnect();
}
function readIdLater(part) {
	const { owner } = part;
	if (!owner.unread) {
		owner.unread = /* @__PURE__ */ new Set();
		afterBind(() => readIds(owner, part.store));
	}
	owner.unread.add(part);
}
function readIds(owner, store) {
	const parts = owner.unread;
	owner.unread = void 0;
	let renamed = owner.renamed === true;
	owner.renamed = void 0;
	for (const part of parts) renamed = rename(part, part.el && idOf(part.el)) || renamed;
	if (renamed) touch(store);
}
var idOf = (el) => el.localName === "form" ? el.getAttribute("id") : el.id;
function takeOwnId(part, id) {
	if (part.el || typeof id !== "string" || !definitionOf(part).attrs) return;
	if (rename(part, id)) ownerOf(part).renamed = true;
}
function rename(part, id) {
	const made = madeId(part);
	const own = id && id !== made ? id : void 0;
	if (own === part.own) return false;
	const { owner } = part;
	part.own = own;
	owner.named ??= /* @__PURE__ */ new Set();
	if (own === void 0) owner.named.delete(part);
	else owner.named.add(part);
	owner.aliases = void 0;
	return made !== void 0;
}
function ignoredKey(event) {
	return (event.type === "keydown" || event.type === "keyup") && (typeof event.key !== "string" || isComposing(event));
}
// node_modules/@ui-sdk/core/dist/foundation/motion/presence.js
var pendingResets = /* @__PURE__ */ new WeakMap();
function animateIn(el, done) {
	pendingResets.get(el)?.();
	const running = el.getAnimations?.({ subtree: true }).filter(isTransition);
	const settled = running?.every((animation) => targetOf(animation) !== el);
	el.setAttribute("data-starting-style", "");
	if (running && settled) {
		for (const animation of el.getAnimations({ subtree: true })) if (isTransition(animation) && !running.some((moving) => continues(animation, moving))) animation.finish();
	}
	let stopWaiting;
	let timer;
	const frame = requestAnimationFrame(() => timer = setTimeout(() => {
		el.removeAttribute("data-starting-style");
		if (done) stopWaiting = whenFinished(el, done);
	}));
	return () => {
		cancelAnimationFrame(frame);
		clearTimeout(timer);
		stopWaiting?.();
		el.removeAttribute("data-starting-style");
	};
}
var isTransition = (animation) => "transitionProperty" in animation;
var targetOf = (animation) => animation.effect?.target;
var continues = (animation, moving) => targetOf(animation) === targetOf(moving) && animation.transitionProperty === moving.transitionProperty;
function seconds(value) {
	return value.split(",").map((part) => {
		const number = parseFloat(part) || 0;
		return part.trim().endsWith("ms") ? number / 1e3 : number;
	});
}
function longest(el) {
	return Math.max(durationOf(getComputedStyle(el)), durationOf(getComputedStyle(el, "::backdrop")));
}
function durationOf(style) {
	const pairs = (durations, delays, iterations = "1") => {
		const d = seconds(durations);
		const l = seconds(delays);
		const n = iterations.split(",").map((part) => part.trim() === "infinite" ? 1 : parseFloat(part) || 1);
		return d.map((duration, index) => (duration * (n[index % n.length] ?? 1) + (l[index % l.length] ?? 0)) * 1e3);
	};
	return Math.max(0, ...pairs(style.transitionDuration, style.transitionDelay), ...pairs(style.animationDuration, style.animationDelay, style.animationIterationCount));
}
function remaining(animations) {
	let longestLeft = 0;
	for (const animation of animations) {
		const timing = animation.effect?.getComputedTiming();
		const end = Number(timing?.endTime);
		if (!timing || !Number.isFinite(end)) continue;
		longestLeft = Math.max(longestLeft, end - (Number(timing.localTime) || 0));
	}
	return longestLeft;
}
var onClock = (animation) => !animation.timeline || !("source" in animation.timeline);
function whenFinished(el, done) {
	let finished = false;
	const animations = el.getAnimations({ subtree: true }).filter(onClock);
	const finish = () => {
		if (finished) return;
		finished = true;
		clearTimeout(timer);
		done();
	};
	const timer = animations.length ? setTimeout(finish, Math.max(longest(el), remaining(animations)) + 50) : void 0;
	if (!animations.length) measured(finish);
	else Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);
	return () => {
		finished = true;
		clearTimeout(timer);
	};
}
function writeOpen(el, open) {
	el.toggleAttribute("data-open", open);
	el.toggleAttribute("data-closed", !open);
}
function animateOut(el, done) {
	pendingResets.get(el)?.();
	el.removeAttribute("data-starting-style");
	el.setAttribute("data-ending-style", "");
	const wasInert = el.hasAttribute("inert");
	el.setAttribute("inert", "");
	const Observer = el.ownerDocument?.defaultView?.MutationObserver;
	let written = false;
	const owner = Observer && new Observer(() => written = true);
	owner?.observe(el, { attributeFilter: ["inert"] });
	let frame = 0;
	const reset = () => {
		cancelAnimationFrame(frame);
		pendingResets.delete(el);
		el.removeAttribute("data-ending-style");
		written ||= !!owner?.takeRecords().length;
		owner?.disconnect();
		if (!written) el.toggleAttribute("inert", wasInert);
	};
	let isAnimating = false;
	const stop = whenFinished(el, () => {
		if (!isAnimating) {
			reset();
			return done();
		}
		pendingResets.set(el, reset);
		frame = requestAnimationFrame(() => {
			frame = requestAnimationFrame(reset);
		});
		done();
	});
	isAnimating = true;
	return () => {
		stop();
		reset();
	};
}
// node_modules/@ui-sdk/core/dist/foundation/motion/handoff.js
function handoff(input) {
	if (!input.towardMore) return input.scrollAtStart ? "sheet" : "scroll";
	return !input.atLargest && input.expandOnScroll ? "sheet" : "scroll";
}
// node_modules/@ui-sdk/core/dist/foundation/motion/projection.js
function projectDistance(velocity, rate) {
	return velocity * rate / (1 - rate);
}
function chooseSnapTarget(input) {
	const { extent, velocity, candidates } = input;
	if (Math.abs(velocity) < input.minFlingVelocity) return nearestIndex(candidates, extent);
	const projected = extent + projectDistance(velocity, input.rate);
	const nextInDirection = firstBeyond(candidates, extent, Math.sign(velocity));
	let target = nearestIndex(candidates, projected);
	if ((velocity > 0 ? candidates[target] <= extent + .5 : candidates[target] >= extent - .5) && nextInDirection !== -1) target = nextInDirection;
	if (!input.skipSnapPoints && nextInDirection !== -1) target = velocity > 0 ? Math.min(target, nextInDirection) : Math.max(target, nextInDirection);
	return target;
}
function nearestIndex(candidates, value) {
	let best = 0;
	for (let index = 1; index < candidates.length; index++) if (Math.abs(candidates[index] - value) < Math.abs(candidates[best] - value)) best = index;
	return best;
}
function firstBeyond(candidates, extent, direction) {
	if (direction > 0) return candidates.findIndex((candidate) => candidate > extent + .5);
	for (let index = candidates.length - 1; index >= 0; index--) if (candidates[index] < extent - .5) return index;
	return -1;
}
// node_modules/@ui-sdk/core/dist/foundation/motion/rubber-band.js
var iosRubberBandCoefficient = .55;
function rubberBand(overshoot, dimension, coefficient = iosRubberBandCoefficient) {
	if (overshoot <= 0) return 0;
	return (1 - 1 / (overshoot * coefficient / dimension + 1)) * dimension;
}
function rubberBandInverse(shown, dimension, coefficient = iosRubberBandCoefficient) {
	if (shown <= 0) return 0;
	return (1 / (1 - Math.min(shown / dimension, .999999)) - 1) * dimension / coefficient;
}
function rubberBandSlope(overshoot, dimension, coefficient = iosRubberBandCoefficient) {
	if (overshoot <= 0) return 1;
	const base = overshoot * coefficient / dimension + 1;
	return coefficient / (base * base);
}
// node_modules/@ui-sdk/core/dist/foundation/motion/spring.js
function solveSpring(response, dampingRatio, displacement, velocity) {
	const omega = 2 * Math.PI / (response * 1e3);
	const zeta = dampingRatio;
	if (Math.abs(zeta - 1) < 1e-6) return criticallyDamped(omega, displacement, velocity);
	if (zeta < 1) return underdamped(omega, zeta, displacement, velocity);
	return overdamped(omega, zeta, displacement, velocity);
}
function underdamped(omega, zeta, x0, v0) {
	const decay = zeta * omega;
	const damped = omega * Math.sqrt(1 - zeta * zeta);
	const b = (v0 + decay * x0) / damped;
	return {
		position: (t) => Math.exp(-decay * t) * (x0 * Math.cos(damped * t) + b * Math.sin(damped * t)),
		velocity: (t) => {
			const cos = Math.cos(damped * t);
			const sin = Math.sin(damped * t);
			return Math.exp(-decay * t) * ((b * damped - decay * x0) * cos - (x0 * damped + decay * b) * sin);
		}
	};
}
function criticallyDamped(omega, x0, v0) {
	const b = v0 + omega * x0;
	return {
		position: (t) => Math.exp(-omega * t) * (x0 + b * t),
		velocity: (t) => Math.exp(-omega * t) * (b - omega * (x0 + b * t))
	};
}
function overdamped(omega, zeta, x0, v0) {
	const root = Math.sqrt(zeta * zeta - 1);
	const fast = -omega * (zeta + root);
	const slow = -omega * (zeta - root);
	const slowWeight = (v0 - fast * x0) / (slow - fast);
	const fastWeight = x0 - slowWeight;
	return {
		position: (t) => slowWeight * Math.exp(slow * t) + fastWeight * Math.exp(fast * t),
		velocity: (t) => slowWeight * slow * Math.exp(slow * t) + fastWeight * fast * Math.exp(fast * t)
	};
}
function settleTime(solver, { positionTolerance = .5, velocityTolerance = .02, step = 1, limit = 1e4 } = {}) {
	for (let t = 0; t <= limit; t += step) if (Math.abs(solver.position(t)) <= positionTolerance && Math.abs(solver.velocity(t)) <= velocityTolerance) return t;
	return limit;
}
function springLinearEasing(solver, from, to, duration, step = 1e3 / 120) {
	const distance = to - from;
	if (Math.abs(distance) < 1e-6) return "linear";
	const stops = [];
	for (let t = 0; t < duration; t += step) stops.push(round(1 + solver.position(t) / distance));
	stops.push("1");
	return `linear(${stops.join(", ")})`;
}
function round(value) {
	return String(Math.round(value * 1e4) / 1e4);
}
// node_modules/@ui-sdk/core/dist/foundation/motion/machine.js
var none$1 = [];
var nudgeVelocity = 1;
function initialState(extent, restingIndex) {
	return {
		phase: "idle",
		extent,
		restingIndex
	};
}
function next(state, event, config) {
	switch (event.type) {
		case "down": return onDown(state, event, config);
		case "move": return onMove(state, event, config);
		case "up": return onUp(state, event, config);
		case "settled": return onSettled(state);
		case "rest": return onRest(state, event, config);
		case "snap-to": return onSnapTo(state, event, config);
		case "nudge": return onNudge(state, event, config);
		case "close": return settleTo(state, config, {
			targetIndex: -1,
			motion: currentMotion(state, event.time),
			time: event.time,
			reason: "imperative",
			outcome: {
				type: "dismiss",
				reason: "imperative"
			}
		});
	}
}
function currentMotion(state, time) {
	if (state.phase !== "settling") return {
		extent: state.extent,
		velocity: 0
	};
	const solver = solveSpring(state.response, state.dampingRatio, state.from - state.to, state.velocity);
	const elapsed = Math.max(0, time - state.startTime);
	return {
		extent: state.to + solver.position(elapsed),
		velocity: solver.velocity(elapsed)
	};
}
function onDown(state, event, config) {
	const slop = event.pointer === "mouse" ? config.physics.mouseSlop : config.physics.touchSlop;
	if (state.phase === "idle" && state.restingIndex >= 0) return {
		state: {
			...state,
			phase: "pending",
			originX: event.x,
			originY: event.y,
			slop
		},
		effects: none$1
	};
	if (state.phase !== "settling") return {
		state,
		effects: none$1
	};
	const { extent } = currentMotion(state, event.time);
	return {
		state: {
			phase: "dragging",
			extent,
			restingIndex: state.restingIndex,
			anchorY: event.y,
			anchorExtent: unconstrainExtent(extent, config),
			lastY: event.y,
			isScrollingContent: false
		},
		effects: [{
			type: "move",
			extent
		}]
	};
}
function onMove(state, event, config) {
	if (state.phase === "pending") return leavePending(state, event, config);
	if (state.phase === "scrolling" && config.contentScroll) return config.contentScroll.move(state, event);
	if (state.phase === "dragging") return drag(state, event, config);
	return {
		state,
		effects: none$1
	};
}
function leavePending(state, event, config) {
	const dx = event.x - state.originX;
	const dy = event.y - state.originY;
	if (Math.max(Math.abs(dx), Math.abs(dy)) < state.slop) return {
		state,
		effects: none$1
	};
	if (Math.abs(dx) > Math.abs(dy)) return {
		state: initialState(state.extent, state.restingIndex),
		effects: none$1
	};
	const scrolling = config.contentScroll?.claim(state, event, dy < 0, config);
	if (scrolling) return {
		state: scrolling,
		effects: none$1
	};
	const dragging = {
		...startDragging(state, state.originY + Math.sign(dy) * state.slop),
		lastY: event.y
	};
	const extent = constrainExtent(dragging.anchorExtent + (dragging.anchorY - event.y), config);
	return {
		state: {
			...dragging,
			extent
		},
		effects: [{
			type: "move",
			extent
		}]
	};
}
function startDragging(state, y) {
	return {
		phase: "dragging",
		extent: state.extent,
		restingIndex: state.restingIndex,
		anchorY: y,
		anchorExtent: state.extent,
		lastY: y,
		isScrollingContent: false
	};
}
function drag(state, event, config) {
	const delta = state.lastY - event.y;
	const anchor = state.isScrollingContent ? {
		anchorY: state.lastY,
		anchorExtent: state.extent
	} : state;
	const fingerExtent = anchor.anchorExtent + (anchor.anchorY - event.y);
	const scrolled = config.contentScroll?.drag(state, event, delta, fingerExtent, config);
	if (scrolled) return scrolled;
	const extent = constrainExtent(fingerExtent, config);
	return {
		state: {
			...state,
			anchorY: anchor.anchorY,
			anchorExtent: anchor.anchorExtent,
			extent,
			lastY: event.y,
			isScrollingContent: false
		},
		effects: [{
			type: "move",
			extent
		}]
	};
}
function onUp(state, event, config) {
	if (state.phase === "pending" || state.phase === "scrolling") return {
		state: initialState(state.extent, state.restingIndex),
		effects: none$1
	};
	if (state.phase !== "dragging") return {
		state,
		effects: none$1
	};
	const released = config.contentScroll?.release(state, event, config);
	if (released) return released;
	const velocity = -event.velocity * bandSlope(state.extent, config);
	const candidates = [0, ...snapExtents(config)];
	const physics = config.physics;
	const target = {
		candidates,
		rate: physics.projectionRate,
		minFlingVelocity: physics.minFlingVelocity,
		skipSnapPoints: physics.skipSnapPoints
	};
	const candidate = chooseSnapTarget({
		...target,
		extent: state.extent,
		velocity
	});
	const release = {
		motion: {
			extent: state.extent,
			velocity
		},
		time: event.time,
		reason: "swipe"
	};
	if (config.dismissible) {
		if (candidate > 0) return settleTo(state, config, {
			...release,
			targetIndex: candidate - 1
		});
		return settleTo(state, config, {
			...release,
			targetIndex: -1,
			outcome: {
				type: "dismiss",
				reason: "swipe"
			}
		});
	}
	const fingerExtent = state.anchorExtent + (state.anchorY - state.lastY);
	const wouldDismiss = chooseSnapTarget({
		...target,
		extent: fingerExtent,
		velocity: -event.velocity
	}) === 0;
	const index = Math.max(0, candidate - 1);
	if (!wouldDismiss) return settleTo(state, config, {
		...release,
		targetIndex: index
	});
	return settleTo(state, config, {
		...release,
		targetIndex: 0,
		outcome: {
			type: "attempt-dismiss",
			reason: "swipe"
		}
	});
}
function onSettled(state) {
	if (state.phase !== "settling") return {
		state,
		effects: none$1
	};
	return {
		state: initialState(state.to, state.targetIndex),
		effects: none$1
	};
}
function onRest(state, event, config) {
	if (event.extent < 1 && config.dismissible) return {
		state: initialState(0, -1),
		effects: [{
			type: "dismiss",
			reason: "swipe"
		}]
	};
	const index = nearestIndex(snapExtents(config), event.extent);
	const effects = index === state.restingIndex ? [] : [{
		type: "snap",
		id: config.snapPoints[index].id,
		reason: "swipe"
	}];
	return {
		state: initialState(event.extent, index),
		effects
	};
}
function onSnapTo(state, event, config) {
	const index = config.snapPoints.findIndex((point) => point.id === event.id);
	if (index === -1 || state.phase === "dragging") return {
		state,
		effects: none$1
	};
	return settleTo(state, config, {
		targetIndex: index,
		motion: currentMotion(state, event.time),
		time: event.time,
		reason: event.reason
	});
}
function onNudge(state, event, config) {
	if (state.phase !== "idle" || state.restingIndex < 0) return {
		state,
		effects: none$1
	};
	return settleTo(state, config, {
		targetIndex: state.restingIndex,
		motion: {
			extent: state.extent,
			velocity: -nudgeVelocity
		},
		time: event.time,
		reason: "imperative"
	});
}
function settleTo(state, config, options) {
	const { targetIndex, motion, time, reason } = options;
	const physics = config.physics;
	const to = targetIndex < 0 ? 0 : config.snapPoints[targetIndex].extent;
	const dampingRatio = Math.abs(motion.velocity) >= physics.minFlingVelocity ? physics.momentumDampingRatio : physics.dampingRatio;
	const settling = {
		phase: "settling",
		extent: motion.extent,
		restingIndex: state.restingIndex,
		targetIndex,
		from: motion.extent,
		to,
		velocity: motion.velocity,
		response: physics.response,
		dampingRatio,
		startTime: time
	};
	const effects = [{
		type: "settle",
		from: motion.extent,
		to,
		velocity: motion.velocity,
		response: physics.response,
		dampingRatio
	}];
	if (targetIndex >= 0 && targetIndex !== state.restingIndex) effects.push({
		type: "snap",
		id: config.snapPoints[targetIndex].id,
		reason
	});
	if (options.outcome) effects.push(options.outcome);
	return {
		state: settling,
		effects
	};
}
function constrainExtent(fingerExtent, config) {
	const largest = largestExtent(config);
	const { coefficient, dimension } = band(config);
	if (fingerExtent > largest) return largest + rubberBand(fingerExtent - largest, dimension, coefficient);
	if (config.dismissible) return Math.max(0, fingerExtent);
	const smallest = config.snapPoints[0].extent;
	if (fingerExtent < smallest) return smallest - rubberBand(smallest - fingerExtent, dimension, coefficient);
	return fingerExtent;
}
function unconstrainExtent(extent, config) {
	const largest = largestExtent(config);
	const { coefficient, dimension } = band(config);
	if (extent > largest) return largest + rubberBandInverse(extent - largest, dimension, coefficient);
	const smallest = config.snapPoints[0].extent;
	if (!config.dismissible && extent < smallest) return smallest - rubberBandInverse(smallest - extent, dimension, coefficient);
	return extent;
}
function band(config) {
	return {
		coefficient: config.physics.rubberBand,
		dimension: config.physics.rubberBandDimension ?? config.dimension
	};
}
function bandSlope(extent, config) {
	const { coefficient, dimension } = band(config);
	const largest = largestExtent(config);
	const smallest = config.snapPoints[0].extent;
	const overshoot = extent > largest ? extent - largest : !config.dismissible && extent < smallest ? smallest - extent : 0;
	if (overshoot <= 0) return 1;
	return rubberBandSlope(rubberBandInverse(overshoot, dimension, coefficient), dimension, coefficient);
}
function largestExtent(config) {
	return config.snapPoints[config.snapPoints.length - 1].extent;
}
function snapExtents(config) {
	return config.snapPoints.map((point) => point.extent);
}
// node_modules/@ui-sdk/core/dist/foundation/motion/content-scroll.js
var none = [];
var contentScroll = {
	claim(state, event, towardMore, config) {
		if (!event.scroll) return;
		if (handoff({
			towardMore,
			scrollAtStart: event.scroll.atStart,
			atLargest: state.extent >= largestExtent(config) - .5,
			expandOnScroll: config.expandOnScroll
		}) !== "scroll") return;
		return {
			phase: "scrolling",
			extent: state.extent,
			restingIndex: state.restingIndex,
			lastY: event.y
		};
	},
	move(state, event) {
		if (event.y > state.lastY && event.scroll?.atStart) return {
			state: startDragging(state, event.y),
			effects: none
		};
		return {
			state: {
				...state,
				lastY: event.y
			},
			effects: none
		};
	},
	drag(state, event, delta, fingerExtent, config) {
		const scroll = event.scroll;
		if (!scroll) return;
		if (state.isScrollingContent && (delta > 0 ? !scroll.atEnd : !scroll.atStart)) {
			const effects2 = [{
				type: "scroll",
				delta
			}];
			return {
				state: {
					...state,
					lastY: event.y
				},
				effects: effects2
			};
		}
		const largest = largestExtent(config);
		if (!(delta > 0 && fingerExtent > largest && state.extent <= largest && !scroll.atEnd)) return;
		const effects = [{
			type: "scroll",
			delta: fingerExtent - largest
		}];
		if (state.extent !== largest) effects.unshift({
			type: "move",
			extent: largest
		});
		return {
			state: {
				...state,
				extent: largest,
				anchorY: event.y,
				anchorExtent: largest,
				lastY: event.y,
				isScrollingContent: true
			},
			effects
		};
	},
	release(state, event, config) {
		if (!state.isScrollingContent) return;
		const largestIndex = config.snapPoints.length - 1;
		const effects = [{
			type: "fling-scroll",
			velocity: -event.velocity
		}];
		if (state.restingIndex !== largestIndex) effects.push({
			type: "snap",
			id: config.snapPoints[largestIndex].id,
			reason: "swipe"
		});
		return {
			state: initialState(state.extent, largestIndex),
			effects
		};
	}
};
// node_modules/@ui-sdk/core/dist/foundation/motion/physics.js
var sheetPhysics = { ios: {
	response: .34,
	dampingRatio: 1,
	momentumDampingRatio: .88,
	projectionRate: .99,
	minFlingVelocity: .5,
	skipSnapPoints: true,
	rubberBand: 1.9,
	rubberBandDimension: 24,
	touchSlop: 8,
	mouseSlop: 4,
	dim: .2,
	velocityHorizon: 70
} };
// node_modules/@ui-sdk/core/dist/foundation/motion/snap-points.js
function snapPointId(point) {
	return String(point);
}
function snapPointExtent(point, context) {
	if (typeof point === "number") return point <= 1 ? point * context.container : point;
	if (point === "content") return context.content;
	const amount = parseFloat(point);
	if (point.endsWith("rem")) return amount * context.rootFontSize;
	if (point.endsWith("%")) return amount / 100 * context.container;
	if (point.endsWith("px")) return amount;
	return NaN;
}
function resolveSnapPoints(points, context) {
	const measured = points.map((value, index) => ({
		value,
		index,
		extent: Math.min(snapPointExtent(value, context), context.content)
	})).filter((point) => point.extent > 0).sort((a, b) => a.extent - b.extent || a.index - b.index);
	const resolved = [];
	for (const point of measured) {
		const id = snapPointId(point.value);
		const previous = resolved[resolved.length - 1];
		if (previous && point.extent - previous.extent < 1) {
			previous.ids.push(id);
			if (point.index > previous.index) Object.assign(previous, {
				id,
				value: point.value,
				index: point.index
			});
			previous.extent = Math.max(previous.extent, point.extent);
			continue;
		}
		resolved.push({
			id,
			value: point.value,
			extent: Math.round(point.extent * 100) / 100,
			ids: [id],
			index: point.index
		});
	}
	return resolved.map(({ index, ...point }) => point);
}
function findSnapIndex(resolved, point) {
	if (point === null || point === void 0) return -1;
	const id = String(point);
	return resolved.findIndex((entry) => entry.ids.includes(id));
}
function isAtOrBelow(resolved, point, limit) {
	const below = findSnapIndex(resolved, limit);
	const index = findSnapIndex(resolved, point);
	return below >= 0 && index >= 0 && index <= below;
}
// node_modules/@ui-sdk/core/dist/foundation/motion/curves.js
var clamp01 = (value) => Math.max(0, Math.min(1, value));
function dimAmount(extent, snapExtents, largestUndimmedIndex = -1) {
	const lower = largestUndimmedIndex < 0 ? 0 : snapExtents[largestUndimmedIndex];
	const upper = largestUndimmedIndex < 0 ? snapExtents[0] : snapExtents[largestUndimmedIndex + 1];
	if (upper === void 0 || upper <= lower) return extent > lower ? 1 : 0;
	return clamp01((extent - lower) / (upper - lower));
}
function expandAmount(extent, snapExtents) {
	const largest = snapExtents[snapExtents.length - 1];
	const lower = snapExtents.length > 1 ? snapExtents[snapExtents.length - 2] : 0;
	if (largest <= lower) return extent >= largest ? 1 : 0;
	return clamp01((extent - lower) / (largest - lower));
}
function progressAmount(extent, snapExtents) {
	const largest = snapExtents[snapExtents.length - 1];
	return largest > 0 ? clamp01(extent / largest) : 0;
}
// node_modules/@ui-sdk/core/dist/foundation/motion/velocity.js
var defaults = {
	/** How far back samples count, in ms before the newest. Defaults to 70. */
	horizon: 70,
	/** How old the newest sample can be, in ms, before the pointer counts as stopped and reads 0. Defaults to 40. */
	staleAfter: 40,
	/** The fastest the tracker reads, in px/ms either way. Defaults to 8. */
	maxSpeed: 8,
	/** How many samples it keeps. Defaults to 20, enough for the horizon at 240 Hz. */
	capacity: 20
};
function leastSquaresVelocity(times, positions, start = 0, end = times.length) {
	const count = end - start;
	if (count < 2) return 0;
	const newest = times[end - 1];
	if (count < 4) return linearSlope(times, positions, start, end);
	let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
	let x0 = 0, x1 = 0, x2 = 0;
	for (let index = start; index < end; index++) {
		const t = times[index] - newest;
		const x = positions[index];
		const t2 = t * t;
		s0 += 1;
		s1 += t;
		s2 += t2;
		s3 += t2 * t;
		s4 += t2 * t2;
		x0 += x;
		x1 += x * t;
		x2 += x * t2;
	}
	const determinant = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
	if (Math.abs(determinant) < 1e-9) return linearSlope(times, positions, start, end);
	return (s0 * (x1 * s4 - s3 * x2) - x0 * (s1 * s4 - s3 * s2) + s2 * (s1 * x2 - x1 * s2)) / determinant;
}
function linearSlope(times, positions, start, end) {
	let meanTime = 0, meanPosition = 0;
	const count = end - start;
	for (let index = start; index < end; index++) {
		meanTime += times[index] / count;
		meanPosition += positions[index] / count;
	}
	let covariance = 0, variance = 0;
	for (let index = start; index < end; index++) {
		const dt = times[index] - meanTime;
		covariance += dt * (positions[index] - meanPosition);
		variance += dt * dt;
	}
	return variance > 0 ? covariance / variance : 0;
}
function createVelocityTracker(options = {}) {
	const { horizon, staleAfter, maxSpeed, capacity } = {
		...defaults,
		...options
	};
	const times = new Float64Array(capacity);
	const positions = new Float64Array(capacity);
	const windowTimes = new Float64Array(capacity);
	const windowPositions = new Float64Array(capacity);
	let count = 0;
	let newestIndex = -1;
	function add(time, position) {
		if (count > 0 && time <= times[newestIndex]) return;
		newestIndex = (newestIndex + 1) % capacity;
		times[newestIndex] = time;
		positions[newestIndex] = position;
		count = Math.min(count + 1, capacity);
	}
	function velocity(now) {
		if (count < 2) return 0;
		const newest = times[newestIndex];
		if (now - newest > staleAfter) return 0;
		let windowCount = 0;
		for (let age = count - 1; age >= 0; age--) {
			const index = (newestIndex - age + capacity) % capacity;
			if (newest - times[index] > horizon) continue;
			windowTimes[windowCount] = times[index];
			windowPositions[windowCount] = positions[index];
			windowCount++;
		}
		const fitted = leastSquaresVelocity(windowTimes, windowPositions, 0, windowCount);
		return Math.max(-maxSpeed, Math.min(maxSpeed, fitted));
	}
	function reset() {
		count = 0;
		newestIndex = -1;
	}
	return {
		add,
		velocity,
		reset
	};
}
// node_modules/@ui-sdk/core/dist/foundation/motion/panel.js
function hiddenAttrs(shown, findable) {
	return { hidden: shown ? void 0 : findable ? "until-found" : "" };
}
function bindFindable(el, panel) {
	const keep = () => {
		if (panel.shown()) return;
		const hidden = el.getAttribute("hidden");
		if (panel.findable()) {
			if (hidden !== "until-found") el.setAttribute("hidden", "until-found");
		} else if (hidden === "until-found") el.setAttribute("hidden", "");
	};
	keep();
	const observer = typeof MutationObserver === "undefined" ? void 0 : new MutationObserver(keep);
	observer?.observe(el, {
		attributes: true,
		attributeFilter: ["hidden"]
	});
	el.addEventListener("beforematch", panel.reveal);
	return Object.assign(() => {
		observer?.disconnect();
		el.removeEventListener("beforematch", panel.reveal);
	}, { check: keep });
}
export { writeStyle as $, partState as A, selects as B, authorOwned as C, liveAttrs as D, handlers as E, references as F, sameValue as G, heldState as H, selectedKeys as I, on as J, standFor as K, subscribe as L, propsRendered as M, provisional as N, madeLabel as O, ref as P, setStyle as Q, takeOwnId as R, attrs as S, directNames as T, renders as U, createStore as V, sameSlotState as W, ahead as X, afterPaint as Y, enforceHidden as Z, nearestIndex as _, expandAmount as a, MotionConfig as at, animateOut as b, isAtOrBelow as c, contentScroll as d, afterBind as et, initialState as f, springLinearEasing as g, solveSpring as h, dimAmount as i, note as it, present as j, onProps as k, resolveSnapPoints as l, settleTime as m, hiddenAttrs as n, emit as nt, progressAmount as o, next as p, isComposing as q, createVelocityTracker as r, exposeShortcuts as rt, findSnapIndex as s, bindFindable as t, runBindWrites as tt, sheetPhysics as u, handoff as v, commit as w, writeOpen as x, animateIn as y, yieldToAuthor as z };
