import { r as __toESM$1, t as __commonJSMin } from "./rolldown-runtime-Bl4WtXjF.js";
import { _ as pointer, b as require_react_dom, d as identity$1, f as transform, g as drag, h as zoom$1, m as value, p as zoom, v as select, x as require_react } from "./vendor-charts-Cc1dpEBz.js";
// node_modules/react/cjs/react-jsx-runtime.production.js
/**
* @license React
* react-jsx-runtime.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_jsx_runtime_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	function jsxProd(type, config, maybeKey) {
		var key = null;
		void 0 !== maybeKey && (key = "" + maybeKey);
		void 0 !== config.key && (key = "" + config.key);
		if ("key" in config) {
			maybeKey = {};
			for (var propName in config) "key" !== propName && (maybeKey[propName] = config[propName]);
		} else maybeKey = config;
		config = maybeKey.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== config ? config : null,
			props: maybeKey
		};
	}
	exports.Fragment = REACT_FRAGMENT_TYPE;
	exports.jsx = jsxProd;
	exports.jsxs = jsxProd;
}));
// node_modules/react/jsx-runtime.js
var require_jsx_runtime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_jsx_runtime_production();
}));
// node_modules/react-compiler-runtime/dist/index.js
/**
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*
* @lightSyntaxTransform
* @noflow
* @nolint
* @preventMunge
* @preserve-invariant-messages
*/
var require_dist = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var __create = Object.create;
	var __defProp = Object.defineProperty;
	var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
	var __getOwnPropNames = Object.getOwnPropertyNames;
	var __getProtoOf = Object.getPrototypeOf;
	var __hasOwnProp = Object.prototype.hasOwnProperty;
	var __export = (target, all) => {
		for (var name in all) __defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	};
	var __copyProps = (to, from, except, desc) => {
		if (from && typeof from === "object" || typeof from === "function") {
			for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
				get: () => from[key],
				enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
			});
		}
		return to;
	};
	var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
		value: mod,
		enumerable: true
	}) : target, mod));
	var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
	var index_exports = {};
	__export(index_exports, {
		$dispatcherGuard: () => $dispatcherGuard,
		$makeReadOnly: () => $makeReadOnly,
		$reset: () => $reset,
		$structuralCheck: () => $structuralCheck,
		c: () => c,
		clearRenderCounterRegistry: () => clearRenderCounterRegistry,
		renderCounterRegistry: () => renderCounterRegistry,
		useRenderCounter: () => useRenderCounter
	});
	module.exports = __toCommonJS(index_exports);
	var React = __toESM(require_react());
	var { useRef, useEffect, isValidElement } = React;
	var _a;
	var ReactSecretInternals = (_a = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE) != null ? _a : React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
	var $empty = Symbol.for("react.memo_cache_sentinel");
	var _a2;
	var c = typeof ((_a2 = React.__COMPILER_RUNTIME) == null ? void 0 : _a2.c) === "function" ? React.__COMPILER_RUNTIME.c : function c2(size) {
		return React.useMemo(() => {
			const $ = new Array(size);
			for (let ii = 0; ii < size; ii++) $[ii] = $empty;
			$[$empty] = true;
			return $;
		}, []);
	};
	var LazyGuardDispatcher = {};
	[
		"readContext",
		"useCallback",
		"useContext",
		"useEffect",
		"useImperativeHandle",
		"useInsertionEffect",
		"useLayoutEffect",
		"useMemo",
		"useReducer",
		"useRef",
		"useState",
		"useDebugValue",
		"useDeferredValue",
		"useTransition",
		"useMutableSource",
		"useSyncExternalStore",
		"useId",
		"unstable_isNewReconciler",
		"getCacheSignal",
		"getCacheForType",
		"useCacheRefresh"
	].forEach((name) => {
		LazyGuardDispatcher[name] = () => {
			throw new Error(`[React] Unexpected React hook call (${name}) from a React compiled function. Check that all hooks are called directly and named according to convention ('use[A-Z]') `);
		};
	});
	var originalDispatcher = null;
	LazyGuardDispatcher["useMemoCache"] = (count) => {
		if (originalDispatcher == null) throw new Error("React Compiler internal invariant violation: unexpected null dispatcher");
		else return originalDispatcher.useMemoCache(count);
	};
	function setCurrent(newDispatcher) {
		ReactSecretInternals.ReactCurrentDispatcher.current = newDispatcher;
		return ReactSecretInternals.ReactCurrentDispatcher.current;
	}
	var guardFrames = [];
	function $dispatcherGuard(kind) {
		const curr = ReactSecretInternals.ReactCurrentDispatcher.current;
		if (kind === 0) {
			guardFrames.push(curr);
			if (guardFrames.length === 1) originalDispatcher = curr;
			if (curr === LazyGuardDispatcher) throw new Error(`[React] Unexpected call to custom hook or component from a React compiled function. Check that (1) all hooks are called directly and named according to convention ('use[A-Z]') and (2) components are returned as JSX instead of being directly invoked.`);
			setCurrent(LazyGuardDispatcher);
		} else if (kind === 1) {
			const lastFrame = guardFrames.pop();
			if (lastFrame == null) throw new Error("React Compiler internal error: unexpected null in guard stack");
			if (guardFrames.length === 0) originalDispatcher = null;
			setCurrent(lastFrame);
		} else if (kind === 2) {
			guardFrames.push(curr);
			setCurrent(originalDispatcher);
		} else if (kind === 3) {
			const lastFrame = guardFrames.pop();
			if (lastFrame == null) throw new Error("React Compiler internal error: unexpected null in guard stack");
			setCurrent(lastFrame);
		} else throw new Error("React Compiler internal error: unreachable block" + kind);
	}
	function $reset($) {
		for (let ii = 0; ii < $.length; ii++) $[ii] = $empty;
	}
	function $makeReadOnly() {
		throw new Error("TODO: implement $makeReadOnly in react-compiler-runtime");
	}
	var renderCounterRegistry = /* @__PURE__ */ new Map();
	function clearRenderCounterRegistry() {
		for (const counters of renderCounterRegistry.values()) counters.forEach((counter) => {
			counter.count = 0;
		});
	}
	function registerRenderCounter(name, val) {
		let counters = renderCounterRegistry.get(name);
		if (counters == null) {
			counters = /* @__PURE__ */ new Set();
			renderCounterRegistry.set(name, counters);
		}
		counters.add(val);
	}
	function removeRenderCounter(name, val) {
		const counters = renderCounterRegistry.get(name);
		if (counters == null) return;
		counters.delete(val);
	}
	function useRenderCounter(name) {
		const val = useRef(null);
		if (val.current != null) val.current.count += 1;
		useEffect(() => {
			if (val.current == null) {
				const counter = { count: 0 };
				registerRenderCounter(name, counter);
				val.current = counter;
			}
			return () => {
				if (val.current !== null) removeRenderCounter(name, val.current);
			};
		});
	}
	var seenErrors = /* @__PURE__ */ new Set();
	function $structuralCheck(oldValue, newValue, variableName, fnName, kind, loc) {
		function error(l, r, path, depth) {
			const str = `${fnName}:${loc} [${kind}] ${variableName}${path} changed from ${l} to ${r} at depth ${depth}`;
			if (seenErrors.has(str)) return;
			seenErrors.add(str);
			console.error(str);
		}
		const depthLimit = 2;
		function recur(oldValue2, newValue2, path, depth) {
			if (depth > depthLimit) return;
			else if (oldValue2 === newValue2) return;
			else if (typeof oldValue2 !== typeof newValue2) error(`type ${typeof oldValue2}`, `type ${typeof newValue2}`, path, depth);
			else if (typeof oldValue2 === "object") {
				const oldArray = Array.isArray(oldValue2);
				const newArray = Array.isArray(newValue2);
				if (oldValue2 === null && newValue2 !== null) error("null", `type ${typeof newValue2}`, path, depth);
				else if (newValue2 === null) error(`type ${typeof oldValue2}`, "null", path, depth);
				else if (oldValue2 instanceof Map) {
					if (!(newValue2 instanceof Map)) error(`Map instance`, `other value`, path, depth);
					else if (oldValue2.size !== newValue2.size) error(`Map instance with size ${oldValue2.size}`, `Map instance with size ${newValue2.size}`, path, depth);
					else for (const [k, v] of oldValue2) if (!newValue2.has(k)) error(`Map instance with key ${k}`, `Map instance without key ${k}`, path, depth);
					else recur(v, newValue2.get(k), `${path}.get(${k})`, depth + 1);
				} else if (newValue2 instanceof Map) error("other value", `Map instance`, path, depth);
				else if (oldValue2 instanceof Set) {
					if (!(newValue2 instanceof Set)) error(`Set instance`, `other value`, path, depth);
					else if (oldValue2.size !== newValue2.size) error(`Set instance with size ${oldValue2.size}`, `Set instance with size ${newValue2.size}`, path, depth);
					else for (const v of newValue2) if (!oldValue2.has(v)) error(`Set instance without element ${v}`, `Set instance with element ${v}`, path, depth);
				} else if (newValue2 instanceof Set) error("other value", `Set instance`, path, depth);
				else if (oldArray || newArray) {
					if (oldArray !== newArray) error(`type ${oldArray ? "array" : "object"}`, `type ${newArray ? "array" : "object"}`, path, depth);
					else if (oldValue2.length !== newValue2.length) error(`array with length ${oldValue2.length}`, `array with length ${newValue2.length}`, path, depth);
					else for (let ii = 0; ii < oldValue2.length; ii++) recur(oldValue2[ii], newValue2[ii], `${path}[${ii}]`, depth + 1);
				} else if (isValidElement(oldValue2) || isValidElement(newValue2)) {
					if (isValidElement(oldValue2) !== isValidElement(newValue2)) error(`type ${isValidElement(oldValue2) ? "React element" : "object"}`, `type ${isValidElement(newValue2) ? "React element" : "object"}`, path, depth);
					else if (oldValue2.type !== newValue2.type) error(`React element of type ${oldValue2.type}`, `React element of type ${newValue2.type}`, path, depth);
					else recur(oldValue2.props, newValue2.props, `[props of ${path}]`, depth + 1);
				} else {
					for (const key in newValue2) if (!(key in oldValue2)) error(`object without key ${key}`, `object with key ${key}`, path, depth);
					for (const key in oldValue2) if (!(key in newValue2)) error(`object with key ${key}`, `object without key ${key}`, path, depth);
					else recur(oldValue2[key], newValue2[key], `${path}.${key}`, depth + 1);
				}
			} else if (typeof oldValue2 === "function") return;
			else if (isNaN(oldValue2) || isNaN(newValue2)) {
				if (isNaN(oldValue2) !== isNaN(newValue2)) error(`${isNaN(oldValue2) ? "NaN" : "non-NaN value"}`, `${isNaN(newValue2) ? "NaN" : "non-NaN value"}`, path, depth);
			} else if (oldValue2 !== newValue2) error(oldValue2, newValue2, path, depth);
		}
		recur(oldValue, newValue, "", 0);
	}
	0 && (module.exports = {
		$dispatcherGuard,
		$makeReadOnly,
		$reset,
		$structuralCheck,
		c,
		clearRenderCounterRegistry,
		renderCounterRegistry,
		useRenderCounter
	});
}));
// node_modules/classcat/index.js
var import_react = /* @__PURE__ */ __toESM$1(require_react(), 1);
var import_dist = require_dist();
function cc(names) {
	if (typeof names === "string" || typeof names === "number") return "" + names;
	let out = "";
	if (Array.isArray(names)) {
		for (let i = 0, tmp; i < names.length; i++) if ((tmp = cc(names[i])) !== "") out += (out && " ") + tmp;
	} else for (let k in names) if (names[k]) out += (out && " ") + k;
	return out;
}
// node_modules/@xyflow/system/dist/index.js
var errorMessages = {
	error001: (lib = "react") => `Seems like you have not used ${lib === "svelte" ? "SvelteFlowProvider" : "ReactFlowProvider"} as an ancestor. Help: https://${lib}flow.dev/error#001`,
	error002: () => "It looks like you've created a new nodeTypes or edgeTypes object. If this wasn't on purpose please define the nodeTypes/edgeTypes outside of the component or memoize them.",
	error003: (nodeType) => `Node type "${nodeType}" not found. Using fallback type "default".`,
	error004: () => "The parent container needs a width and a height to render the graph.",
	error005: () => "Only child nodes can use a parent extent.",
	error006: () => "Can't create edge. An edge needs a source and a target.",
	error007: (id) => `The old edge with id=${id} does not exist.`,
	error009: (type) => `Marker type "${type}" doesn't exist.`,
	error008: (handleType, { id, sourceHandle, targetHandle }) => `Couldn't create edge for ${handleType} handle id: "${handleType === "source" ? sourceHandle : targetHandle}", edge id: ${id}.`,
	error010: () => "Handle: No node id found. Make sure to only use a Handle inside a custom Node.",
	error011: (edgeType) => `Edge type "${edgeType}" not found. Using fallback type "default".`,
	error012: (id) => `Node with id "${id}" does not exist, it may have been removed. This can happen when a node is deleted before the "onNodeClick" handler is called.`,
	error013: (lib = "react") => `It seems that you haven't loaded the styles. Please import '@xyflow/${lib}/dist/style.css' or base.css to make sure everything is working properly.`,
	error014: () => "useNodeConnections: No node ID found. Call useNodeConnections inside a custom Node or provide a node ID.",
	error015: () => "It seems that you are trying to drag a node that is not initialized. Please use onNodesChange as explained in the docs.",
	error016: (id) => `Edge with id "${id}" does not exist, it may have been removed. This can happen when an edge is deleted before the "onEdgeClick" handler is called.`
};
var infiniteExtent = [[Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY], [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]];
var elementSelectionKeys = [
	"Enter",
	" ",
	"Escape"
];
var defaultAriaLabelConfig = {
	"node.a11yDescription.default": "Press enter or space to select a node. Press delete to remove it and escape to cancel.",
	"node.a11yDescription.keyboardDisabled": "Press enter or space to select a node. You can then use the arrow keys to move the node around. Press delete to remove it and escape to cancel.",
	"node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) => `Moved selected node ${direction}. New position, x: ${x}, y: ${y}`,
	"edge.a11yDescription.default": "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel.",
	"controls.ariaLabel": "Control Panel",
	"controls.zoomIn.ariaLabel": "Zoom In",
	"controls.zoomOut.ariaLabel": "Zoom Out",
	"controls.fitView.ariaLabel": "Fit View",
	"controls.interactive.ariaLabel": "Toggle Interactivity",
	"minimap.ariaLabel": "Mini Map",
	"handle.ariaLabel": "Handle"
};
/**
* The `ConnectionMode` is used to set the mode of connection between nodes.
* The `Strict` mode is the default one and only allows source to target edges.
* `Loose` mode allows source to source and target to target edges as well.
*
* @public
*/
var ConnectionMode = /* @__PURE__ */ function(ConnectionMode) {
	ConnectionMode["Strict"] = "strict";
	ConnectionMode["Loose"] = "loose";
	return ConnectionMode;
}({});
/**
* This enum is used to set the different modes of panning the viewport when the
* user scrolls. The `Free` mode allows the user to pan in any direction by scrolling
* with a device like a trackpad. The `Vertical` and `Horizontal` modes restrict
* scroll panning to only the vertical or horizontal axis, respectively.
*
* @public
*/
var PanOnScrollMode = /* @__PURE__ */ function(PanOnScrollMode) {
	PanOnScrollMode["Free"] = "free";
	PanOnScrollMode["Vertical"] = "vertical";
	PanOnScrollMode["Horizontal"] = "horizontal";
	return PanOnScrollMode;
}({});
var SelectionMode = /* @__PURE__ */ function(SelectionMode) {
	SelectionMode["Partial"] = "partial";
	SelectionMode["Full"] = "full";
	return SelectionMode;
}({});
var initialConnection = {
	inProgress: false,
	isValid: null,
	from: null,
	fromHandle: null,
	fromPosition: null,
	fromNode: null,
	to: null,
	toHandle: null,
	toPosition: null,
	toNode: null,
	pointer: null
};
/**
* If you set the `connectionLineType` prop on your [`<ReactFlow />`](/api-reference/react-flow#connection-connectionLineType)
*component, it will dictate the style of connection line rendered when creating
*new edges.
*
* @public
*
* @remarks If you choose to render a custom connection line component, this value will be
*passed to your component as part of its [`ConnectionLineComponentProps`](/api-reference/types/connection-line-component-props).
*/
var ConnectionLineType = /* @__PURE__ */ function(ConnectionLineType) {
	ConnectionLineType["Bezier"] = "default";
	ConnectionLineType["Straight"] = "straight";
	ConnectionLineType["Step"] = "step";
	ConnectionLineType["SmoothStep"] = "smoothstep";
	ConnectionLineType["SimpleBezier"] = "simplebezier";
	return ConnectionLineType;
}({});
/**
* Edges may optionally have a marker on either end. The MarkerType type enumerates
* the options available to you when configuring a given marker.
*
* @public
*/
var MarkerType = /* @__PURE__ */ function(MarkerType) {
	MarkerType["Arrow"] = "arrow";
	MarkerType["ArrowClosed"] = "arrowclosed";
	return MarkerType;
}({});
/**
* While [`PanelPosition`](/api-reference/types/panel-position) can be used to place a
* component in the corners of a container, the `Position` enum is less precise and used
* primarily in relation to edges and handles.
*
* @public
*/
var Position = /* @__PURE__ */ function(Position) {
	Position["Left"] = "left";
	Position["Top"] = "top";
	Position["Right"] = "right";
	Position["Bottom"] = "bottom";
	return Position;
}({});
var oppositePosition = {
	["left"]: "right",
	["right"]: "left",
	["top"]: "bottom",
	["bottom"]: "top"
};
/**
* Test whether an object is usable as an Edge
* @public
* @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Edge if it returns true
* @param element - The element to test
* @returns A boolean indicating whether the element is an Edge
*/
var isEdgeBase = (element) => !!element && typeof element === "object" && "id" in element && "source" in element && "target" in element;
/**
* Test whether an object is usable as a Node
* @public
* @remarks In TypeScript this is a type guard that will narrow the type of whatever you pass in to Node if it returns true
* @param element - The element to test
* @returns A boolean indicating whether the element is an Node
*/
var isNodeBase = (element) => !!element && typeof element === "object" && "id" in element && "position" in element && !("source" in element) && !("target" in element);
var isInternalNodeBase = (element) => !!element && typeof element === "object" && "id" in element && "internals" in element && !("source" in element) && !("target" in element);
var getNodePositionWithOrigin = (node, nodeOrigin = [0, 0]) => {
	const { width, height } = getNodeDimensions(node);
	const origin = node.origin ?? nodeOrigin;
	const offsetX = width * origin[0];
	const offsetY = height * origin[1];
	return {
		x: node.position.x - offsetX,
		y: node.position.y - offsetY
	};
};
/**
* Returns the bounding box that contains all the given nodes in an array. This can
* be useful when combined with [`getViewportForBounds`](/api-reference/utils/get-viewport-for-bounds)
* to calculate the correct transform to fit the given nodes in a viewport.
* @public
* @remarks Useful when combined with {@link getViewportForBounds} to calculate the correct transform to fit the given nodes in a viewport.
* @param nodes - Nodes to calculate the bounds for.
* @returns Bounding box enclosing all nodes.
*
* @remarks This function was previously called `getRectOfNodes`
*
* @example
* ```js
*import { getNodesBounds } from '@xyflow/react';
*
*const nodes = [
*  {
*    id: 'a',
*    position: { x: 0, y: 0 },
*    data: { label: 'a' },
*    width: 50,
*    height: 25,
*  },
*  {
*    id: 'b',
*    position: { x: 100, y: 100 },
*    data: { label: 'b' },
*    width: 50,
*    height: 25,
*  },
*];
*
*const bounds = getNodesBounds(nodes);
*```
*/
var getNodesBounds = (nodes, params = { nodeOrigin: [0, 0] }) => {
	if (nodes.length === 0) return {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
	let hasNode = false;
	const box = nodes.reduce((currBox, nodeOrId) => {
		const isId = typeof nodeOrId === "string";
		let currentNode = !params.nodeLookup && !isId ? nodeOrId : void 0;
		if (params.nodeLookup) currentNode = isId ? params.nodeLookup.get(nodeOrId) : !isInternalNodeBase(nodeOrId) ? params.nodeLookup.get(nodeOrId.id) : nodeOrId;
		if (!currentNode) return currBox;
		hasNode = true;
		return getBoundsOfBoxes(currBox, nodeToBox(currentNode, params.nodeOrigin));
	}, {
		x: 1e400,
		y: 1e400,
		x2: -1e400,
		y2: -1e400
	});
	return hasNode ? boxToRect(box) : {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
};
/**
* Determines a bounding box that contains all given nodes in an array
* @internal
*/
var getInternalNodesBounds = (nodeLookup, params = {}) => {
	let box = {
		x: 1e400,
		y: 1e400,
		x2: -1e400,
		y2: -1e400
	};
	let hasVisibleNodes = false;
	nodeLookup.forEach((node) => {
		if (params.filter === void 0 || params.filter(node)) {
			box = getBoundsOfBoxes(box, nodeToBox(node));
			hasVisibleNodes = true;
		}
	});
	return hasVisibleNodes ? boxToRect(box) : {
		x: 0,
		y: 0,
		width: 0,
		height: 0
	};
};
var getNodesInside = (nodes, rect, [tx, ty, tScale] = [
	0,
	0,
	1
], partially = false, excludeNonSelectableNodes = false) => {
	const paneX = (rect.x - tx) / tScale;
	const paneY = (rect.y - ty) / tScale;
	const paneWidth = rect.width / tScale;
	const paneHeight = rect.height / tScale;
	const visibleNodes = [];
	for (const node of nodes.values()) {
		const { measured, selectable = true, hidden = false } = node;
		if (excludeNonSelectableNodes && !selectable || hidden) continue;
		const width = measured.width ?? node.width ?? node.initialWidth ?? 0;
		const height = measured.height ?? node.height ?? node.initialHeight ?? 0;
		const { x, y } = node.internals.positionAbsolute;
		const overlappingArea = getRectsOverlappingArea(paneX, paneY, paneWidth, paneHeight, x, y, width, height);
		const area = width * height;
		const partiallyVisible = partially && overlappingArea > 0;
		if (!node.internals.handleBounds || partiallyVisible || overlappingArea >= area || node.dragging) visibleNodes.push(node);
	}
	return visibleNodes;
};
function getFitViewNodes(nodeLookup, options) {
	const fitViewNodes = /* @__PURE__ */ new Map();
	const optionNodeIds = options?.nodes ? new Set(options.nodes.map((node) => node.id)) : null;
	nodeLookup.forEach((n) => {
		let isVisible;
		if (options?.includeHiddenNodes) {
			const { width, height } = getNodeDimensions(n);
			isVisible = width > 0 && height > 0;
		} else isVisible = Boolean(n.measured.width && n.measured.height && !n.hidden);
		if (isVisible && (!optionNodeIds || optionNodeIds.has(n.id))) fitViewNodes.set(n.id, n);
	});
	return fitViewNodes;
}
async function fitViewport({ nodes, width, height, panZoom, minZoom, maxZoom }, options) {
	if (nodes.size === 0) return true;
	const nodesToFit = getFitViewNodes(nodes, options);
	if (nodesToFit.size === 0) return true;
	const viewport = getViewportForBounds(getInternalNodesBounds(nodesToFit), width, height, options?.minZoom ?? minZoom, options?.maxZoom ?? maxZoom, options?.padding ?? "5%");
	return panZoom.setViewport(viewport, {
		duration: options?.duration,
		ease: options?.ease,
		interpolate: options?.interpolate
	});
}
/**
* This function calculates the next position of a node, taking into account the node's extent, parent node, and origin.
*
* @internal
* @returns position, positionAbsolute
*/
function calculateNodePosition({ nodeId, nextPosition, nodeLookup, nodeOrigin = [0, 0], nodeExtent, onError }) {
	const node = nodeLookup.get(nodeId);
	const parentNode = node.parentId ? nodeLookup.get(node.parentId) : void 0;
	const { x: parentX, y: parentY } = parentNode ? parentNode.internals.positionAbsolute : {
		x: 0,
		y: 0
	};
	const origin = node.origin ?? nodeOrigin;
	let extent = node.extent || nodeExtent;
	if (node.extent === "parent" && !node.expandParent) {
		if (!parentNode) onError?.("005", errorMessages["error005"]());
		else {
			const { width: parentWidth, height: parentHeight } = getNodeDimensions(parentNode);
			if (parentWidth && parentHeight) extent = [[parentX, parentY], [parentX + parentWidth, parentY + parentHeight]];
		}
	} else if (parentNode && isCoordinateExtent(node.extent)) extent = [[node.extent[0][0] + parentX, node.extent[0][1] + parentY], [node.extent[1][0] + parentX, node.extent[1][1] + parentY]];
	const positionAbsolute = isCoordinateExtent(extent) ? clampPosition(nextPosition, extent, node.measured) : nextPosition;
	if (node.measured.width === void 0 || node.measured.height === void 0) onError?.("015", errorMessages["error015"]());
	return {
		position: {
			x: positionAbsolute.x - parentX + (node.measured.width ?? 0) * origin[0],
			y: positionAbsolute.y - parentY + (node.measured.height ?? 0) * origin[1]
		},
		positionAbsolute
	};
}
/**
* Pass in nodes & edges to delete, get arrays of nodes and edges that actually can be deleted
* @internal
* @param param.nodesToRemove - The nodes to remove
* @param param.edgesToRemove - The edges to remove
* @param param.nodes - All nodes
* @param param.edges - All edges
* @param param.onBeforeDelete - Callback to check which nodes and edges can be deleted
* @returns nodes: nodes that can be deleted, edges: edges that can be deleted
*/
async function getElementsToRemove({ nodesToRemove = [], edgesToRemove = [], nodes, edges, onBeforeDelete }) {
	const nodeIds = new Set(nodesToRemove.map((node) => node.id));
	const matchingNodeMap = /* @__PURE__ */ new Map();
	const children = /* @__PURE__ */ new Map();
	for (const node of nodes) {
		if (node.deletable === false) continue;
		if (nodeIds.has(node.id)) matchingNodeMap.set(node.id, node);
		if (node.parentId) {
			const siblings = children.get(node.parentId) ?? [];
			siblings.push(node);
			children.set(node.parentId, siblings);
		}
	}
	const queue = [...matchingNodeMap.keys()];
	for (let index = 0; index < queue.length; index++) for (const child of children.get(queue[index]) ?? []) if (!matchingNodeMap.has(child.id)) {
		matchingNodeMap.set(child.id, child);
		queue.push(child.id);
	}
	const edgeIds = new Set(edgesToRemove.map((edge) => edge.id));
	const matchingEdgeMap = /* @__PURE__ */ new Map();
	for (const edge of edges) if (edge.deletable !== false && (matchingNodeMap.has(edge.source) || matchingNodeMap.has(edge.target))) matchingEdgeMap.set(edge.id, edge);
	for (const edge of edges) if (edge.deletable !== false && edgeIds.has(edge.id) && !matchingEdgeMap.has(edge.id)) matchingEdgeMap.set(edge.id, edge);
	const matchingNodes = nodes.filter((node) => matchingNodeMap.has(node.id));
	const matchingEdges = Array.from(matchingEdgeMap.values());
	if (!onBeforeDelete) return {
		edges: matchingEdges,
		nodes: matchingNodes
	};
	const onBeforeDeleteResult = await onBeforeDelete({
		nodes: matchingNodes,
		edges: matchingEdges
	});
	if (typeof onBeforeDeleteResult === "boolean") return onBeforeDeleteResult ? {
		edges: matchingEdges,
		nodes: matchingNodes
	} : {
		edges: [],
		nodes: []
	};
	return onBeforeDeleteResult;
}
var clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);
var clampPosition = (position = {
	x: 0,
	y: 0
}, extent, dimensions) => ({
	x: clamp(position.x, extent[0][0], extent[1][0] - (dimensions?.width ?? 0)),
	y: clamp(position.y, extent[0][1], extent[1][1] - (dimensions?.height ?? 0))
});
function clampPositionToParent(childPosition, childDimensions, parent) {
	const { width: parentWidth, height: parentHeight } = getNodeDimensions(parent);
	const { x: parentX, y: parentY } = parent.internals.positionAbsolute;
	return clampPosition(childPosition, [[parentX, parentY], [parentX + parentWidth, parentY + parentHeight]], childDimensions);
}
/**
* Calculates the velocity of panning when the mouse is close to the edge of the canvas
* @internal
* @param value - One dimensional poition of the mouse (x or y)
* @param min - Minimal position on canvas before panning starts
* @param max - Maximal position on canvas before panning starts
* @returns - A number between 0 and 1 that represents the velocity of panning
*/
var calcAutoPanVelocity = (value, min, max) => {
	if (value < min) return clamp(Math.abs(value - min), 1, min) / min;
	else if (value > max) return -clamp(Math.abs(value - max), 1, min) / min;
	return 0;
};
var calcAutoPan = (pos, bounds, speed = 15, distance = 40) => {
	return [calcAutoPanVelocity(pos.x, distance, bounds.width - distance) * speed, calcAutoPanVelocity(pos.y, distance, bounds.height - distance) * speed];
};
var getBoundsOfBoxes = (box1, box2) => ({
	x: Math.min(box1.x, box2.x),
	y: Math.min(box1.y, box2.y),
	x2: Math.max(box1.x2, box2.x2),
	y2: Math.max(box1.y2, box2.y2)
});
var rectToBox = ({ x, y, width, height }) => ({
	x,
	y,
	x2: x + width,
	y2: y + height
});
var boxToRect = ({ x, y, x2, y2 }) => ({
	x,
	y,
	width: x2 - x,
	height: y2 - y
});
var nodeToRect = (node, nodeOrigin = [0, 0]) => {
	const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
	return {
		x,
		y,
		width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
		height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
	};
};
var nodeToBox = (node, nodeOrigin = [0, 0]) => {
	const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
	return {
		x,
		y,
		x2: x + (node.measured?.width ?? node.width ?? node.initialWidth ?? 0),
		y2: y + (node.measured?.height ?? node.height ?? node.initialHeight ?? 0)
	};
};
var getBoundsOfRects = (rect1, rect2) => boxToRect(getBoundsOfBoxes(rectToBox(rect1), rectToBox(rect2)));
var getRectsOverlappingArea = (aX, aY, aWidth, aHeight, bX, bY, bWidth, bHeight) => {
	const xOverlap = Math.max(0, Math.min(aX + aWidth, bX + bWidth) - Math.max(aX, bX));
	const yOverlap = Math.max(0, Math.min(aY + aHeight, bY + bHeight) - Math.max(aY, bY));
	return Math.ceil(xOverlap * yOverlap);
};
var getOverlappingArea = (rectA, rectB) => getRectsOverlappingArea(rectA.x, rectA.y, rectA.width, rectA.height, rectB.x, rectB.y, rectB.width, rectB.height);
var isRectObject = (obj) => {
	if (typeof obj !== "object" || obj === null) return false;
	const rect = obj;
	return isNumeric(rect.width) && isNumeric(rect.height) && isNumeric(rect.x) && isNumeric(rect.y);
};
var isNumeric = (n) => typeof n === "number" && !isNaN(n) && isFinite(n);
var createDevWarn = (lib, helpUrl) => (id, message) => {};
var snapPosition = (position, snapGrid = [1, 1]) => {
	return {
		x: snapGrid[0] * Math.round(position.x / snapGrid[0]),
		y: snapGrid[1] * Math.round(position.y / snapGrid[1])
	};
};
var pointToRendererPoint = ({ x, y }, [tx, ty, tScale], snapToGrid = false, snapGrid = [1, 1]) => {
	const position = {
		x: (x - tx) / tScale,
		y: (y - ty) / tScale
	};
	return snapToGrid ? snapPosition(position, snapGrid) : position;
};
var rendererPointToPoint = ({ x, y }, [tx, ty, tScale]) => {
	return {
		x: x * tScale + tx,
		y: y * tScale + ty
	};
};
/**
* Parses a single padding value to a number
* @internal
* @param padding - Padding to parse
* @param viewport - Width or height of the viewport
* @returns The padding in pixels
*/
function parsePadding(padding, viewport) {
	if (typeof padding === "number") return Math.floor(padding);
	if (typeof padding === "string" && padding.endsWith("px")) {
		const paddingValue = parseFloat(padding);
		if (!Number.isNaN(paddingValue)) return Math.floor(paddingValue);
	}
	if (typeof padding === "string" && padding.endsWith("%")) {
		const paddingValue = parseFloat(padding);
		if (!Number.isNaN(paddingValue)) return Math.floor(viewport * paddingValue * .01);
	}
	console.error(`The padding value "${padding}" is invalid. Please provide a number or a string with a valid unit (px or %).`);
	return 0;
}
/**
* Parses the paddings to an object with top, right, bottom, left, x and y paddings
* @internal
* @param padding - Padding to parse
* @param width - Width of the viewport
* @param height - Height of the viewport
* @returns An object with the paddings in pixels
*/
function parsePaddings(padding, width, height) {
	if (typeof padding === "string" || typeof padding === "number") {
		const paddingY = parsePadding(padding, height);
		const paddingX = parsePadding(padding, width);
		return {
			top: paddingY,
			right: paddingX,
			bottom: paddingY,
			left: paddingX,
			x: paddingX * 2,
			y: paddingY * 2
		};
	}
	if (typeof padding === "object") {
		const top = parsePadding(padding.top ?? padding.y ?? 0, height);
		const bottom = parsePadding(padding.bottom ?? padding.y ?? 0, height);
		const left = parsePadding(padding.left ?? padding.x ?? 0, width);
		const right = parsePadding(padding.right ?? padding.x ?? 0, width);
		return {
			top,
			right,
			bottom,
			left,
			x: left + right,
			y: top + bottom
		};
	}
	return {
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		x: 0,
		y: 0
	};
}
/**
* Calculates the resulting paddings if the new viewport is applied
* @internal
* @param bounds - Bounds to fit inside viewport
* @param x - X position of the viewport
* @param y - Y position of the viewport
* @param zoom - Zoom level of the viewport
* @param width - Width of the viewport
* @param height - Height of the viewport
* @returns An object with the minimum padding required to fit the bounds inside the viewport
*/
function calculateAppliedPaddings(bounds, x, y, zoom, width, height) {
	const { x: left, y: top } = rendererPointToPoint(bounds, [
		x,
		y,
		zoom
	]);
	const { x: boundRight, y: boundBottom } = rendererPointToPoint({
		x: bounds.x + bounds.width,
		y: bounds.y + bounds.height
	}, [
		x,
		y,
		zoom
	]);
	const right = width - boundRight;
	const bottom = height - boundBottom;
	return {
		left: Math.floor(left),
		top: Math.floor(top),
		right: Math.floor(right),
		bottom: Math.floor(bottom)
	};
}
/**
* Returns a viewport that encloses the given bounds with padding.
* @public
* @remarks You can determine bounds of nodes with {@link getNodesBounds} and {@link getBoundsOfRects}
* @param bounds - Bounds to fit inside viewport.
* @param width - Width of the viewport.
* @param height  - Height of the viewport.
* @param minZoom - Minimum zoom level of the resulting viewport.
* @param maxZoom - Maximum zoom level of the resulting viewport.
* @param padding - Padding around the bounds.
* @returns A transformed {@link Viewport} that encloses the given bounds which you can pass to e.g. {@link setViewport}.
* @example
* const { x, y, zoom } = getViewportForBounds(
* { x: 0, y: 0, width: 100, height: 100},
* 1200, 800, 0.5, 2);
*/
var getViewportForBounds = (bounds, width, height, minZoom = 0, maxZoom = 1e400, padding = 0) => {
	const p = parsePaddings(padding, width, height);
	const xZoom = (width - p.x) / bounds.width;
	const yZoom = (height - p.y) / bounds.height;
	const clampedZoom = clamp(Math.min(xZoom, yZoom), minZoom, maxZoom);
	const boundsCenterX = bounds.x + bounds.width / 2;
	const boundsCenterY = bounds.y + bounds.height / 2;
	const x = width / 2 - boundsCenterX * clampedZoom;
	const y = height / 2 - boundsCenterY * clampedZoom;
	const newPadding = calculateAppliedPaddings(bounds, x, y, clampedZoom, width, height);
	const offset = {
		left: Math.min(newPadding.left - p.left, 0),
		top: Math.min(newPadding.top - p.top, 0),
		right: Math.min(newPadding.right - p.right, 0),
		bottom: Math.min(newPadding.bottom - p.bottom, 0)
	};
	return {
		x: x - offset.left + offset.right,
		y: y - offset.top + offset.bottom,
		zoom: clampedZoom
	};
};
var isMacOs = () => typeof navigator !== "undefined" && navigator?.userAgent?.indexOf("Mac") >= 0;
function isCoordinateExtent(extent) {
	return extent !== void 0 && extent !== null && extent !== "parent";
}
function getNodeDimensions(node) {
	return {
		width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
		height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
	};
}
function nodeHasDimensions(node) {
	return (node.measured?.width ?? node.width ?? node.initialWidth) !== void 0 && (node.measured?.height ?? node.height ?? node.initialHeight) !== void 0;
}
/**
* Convert child position to absolute position
*
* @internal
* @param position
* @param parentId
* @param nodeLookup
* @param nodeOrigin
* @returns an internal node with an absolute position
*/
function evaluateAbsolutePosition(position, dimensions = {
	width: 0,
	height: 0
}, parentId, nodeLookup, nodeOrigin) {
	const positionAbsolute = { ...position };
	const parent = nodeLookup.get(parentId);
	if (parent) {
		const origin = parent.origin || nodeOrigin;
		positionAbsolute.x += parent.internals.positionAbsolute.x - (dimensions.width ?? 0) * origin[0];
		positionAbsolute.y += parent.internals.positionAbsolute.y - (dimensions.height ?? 0) * origin[1];
	}
	return positionAbsolute;
}
function areSetsEqual(a, b) {
	if (a.size !== b.size) return false;
	for (const item of a) if (!b.has(item)) return false;
	return true;
}
/**
* Polyfill for Promise.withResolvers until we can use it in all browsers
* @internal
*/
function withResolvers() {
	let resolve;
	let reject;
	return {
		promise: new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		}),
		resolve,
		reject
	};
}
function mergeAriaLabelConfig(partial) {
	return {
		...defaultAriaLabelConfig,
		...partial || {}
	};
}
/**
* Returns the key under which the connections of a node are stored in the connection lookup.
* Without a handle type, the key covers all connections of the node. A handle id is only used
* together with a handle type, because handle ids are only unique per handle type.
*
* @internal
*/
function getConnectionLookupKey(nodeId, handleType, handleId) {
	if (!handleType) return nodeId;
	return handleId ? `${nodeId}-${handleType}-${handleId}` : `${nodeId}-${handleType}`;
}
/**
* Returns the connections of a node, optionally filtered by handle type and handle id.
*
* @internal
*/
function getConnectionsFromLookup(connectionLookup, { nodeId, type, handleId }) {
	return Array.from(connectionLookup.get(getConnectionLookupKey(nodeId, type, handleId))?.values() ?? []);
}
function getConnectionStatus(isValid) {
	return isValid === null ? null : isValid ? "valid" : "invalid";
}
function isPointerEvent(event) {
	return event instanceof MouseEvent || isTouchEvent(event);
}
function isWheelEvent(event) {
	return event instanceof WheelEvent;
}
function isTouchEvent(event) {
	return typeof TouchEvent !== "undefined" && event instanceof TouchEvent;
}
function isMouseEvent(event) {
	return event instanceof MouseEvent;
}
function getTouchPoint(event) {
	if (isTouchEvent(event)) {
		const touch = event.touches[0] ?? event.changedTouches[0];
		return [touch?.clientX ?? 0, touch?.clientY ?? 0];
	}
	return [event.clientX, event.clientY];
}
function getPointerPosition(event, { snapGrid = [0, 0], snapToGrid = false, transform, containerBounds }) {
	const { x, y } = getEventPosition(event);
	const pointerPos = pointToRendererPoint({
		x: x - (containerBounds?.left ?? 0),
		y: y - (containerBounds?.top ?? 0)
	}, transform);
	const { x: xSnapped, y: ySnapped } = snapToGrid ? snapPosition(pointerPos, snapGrid) : pointerPos;
	return {
		xSnapped,
		ySnapped,
		...pointerPos
	};
}
var getDimensions = (node) => ({
	width: node.offsetWidth,
	height: node.offsetHeight
});
var getHostForElement = (element) => element?.getRootNode?.() || window?.document;
var inputTags = [
	"INPUT",
	"SELECT",
	"TEXTAREA"
];
function isInputDOMNode(event) {
	const target = event.composedPath?.()?.[0] || event.target;
	if (target?.nodeType !== 1) return false;
	return inputTags.includes(target.nodeName) || target.hasAttribute("contenteditable") || !!target.closest(".nokey");
}
var getEventPosition = (event, bounds) => {
	const isMouse = isMouseEvent(event);
	const evtX = isMouse ? event.clientX : event.touches?.[0].clientX;
	const evtY = isMouse ? event.clientY : event.touches?.[0].clientY;
	return {
		x: evtX - (bounds?.left ?? 0),
		y: evtY - (bounds?.top ?? 0)
	};
};
var getHandleBounds = (type, nodeElement, nodeBounds, zoom, nodeId) => {
	const handles = nodeElement.querySelectorAll(`.${type}`);
	if (!handles || !handles.length) return null;
	return Array.from(handles).map((handle) => {
		const handleBounds = handle.getBoundingClientRect();
		return {
			id: handle.getAttribute("data-handleid"),
			type,
			nodeId,
			position: handle.getAttribute("data-handlepos"),
			x: (handleBounds.left - nodeBounds.left) / zoom,
			y: (handleBounds.top - nodeBounds.top) / zoom,
			...getDimensions(handle)
		};
	});
};
function getBezierEdgeCenter({ sourceX, sourceY, targetX, targetY, sourceControlX, sourceControlY, targetControlX, targetControlY }) {
	const centerX = sourceX * .125 + sourceControlX * .375 + targetControlX * .375 + targetX * .125;
	const centerY = sourceY * .125 + sourceControlY * .375 + targetControlY * .375 + targetY * .125;
	return [
		centerX,
		centerY,
		Math.abs(centerX - sourceX),
		Math.abs(centerY - sourceY)
	];
}
function calculateControlOffset(distance, curvature) {
	if (distance >= 0) return .5 * distance;
	return curvature * 25 * Math.sqrt(-distance);
}
function getControlWithCurvature({ pos, x1, y1, x2, y2, c }) {
	switch (pos) {
		case "left": return [x1 - calculateControlOffset(x1 - x2, c), y1];
		case "right": return [x1 + calculateControlOffset(x2 - x1, c), y1];
		case "top": return [x1, y1 - calculateControlOffset(y1 - y2, c)];
		case "bottom": return [x1, y1 + calculateControlOffset(y2 - y1, c)];
	}
}
/**
* The `getBezierPath` util returns everything you need to render a bezier edge
*between two nodes.
* @public
* @returns A path string you can use in an SVG, the `labelX` and `labelY` position (center of path)
* and `offsetX`, `offsetY` between source handle and label.
* - `path`: the path to use in an SVG `<path>` element.
* - `labelX`: the `x` position you can use to render a label for this edge.
* - `labelY`: the `y` position you can use to render a label for this edge.
* - `offsetX`: the absolute difference between the source `x` position and the `x` position of the
* middle of this path.
* - `offsetY`: the absolute difference between the source `y` position and the `y` position of the
* middle of this path.
* @example
* ```js
*  const source = { x: 0, y: 20 };
*  const target = { x: 150, y: 100 };
*
*  const [path, labelX, labelY, offsetX, offsetY] = getBezierPath({
*    sourceX: source.x,
*    sourceY: source.y,
*    sourcePosition: Position.Right,
*    targetX: target.x,
*    targetY: target.y,
*    targetPosition: Position.Left,
*});
*```
*
* @remarks This function returns a tuple (aka a fixed-size array) to make it easier to
*work with multiple edge paths at once.
*/
function getBezierPath({ sourceX, sourceY, sourcePosition = "bottom", targetX, targetY, targetPosition = "top", curvature = .25 }) {
	const [sourceControlX, sourceControlY] = getControlWithCurvature({
		pos: sourcePosition,
		x1: sourceX,
		y1: sourceY,
		x2: targetX,
		y2: targetY,
		c: curvature
	});
	const [targetControlX, targetControlY] = getControlWithCurvature({
		pos: targetPosition,
		x1: targetX,
		y1: targetY,
		x2: sourceX,
		y2: sourceY,
		c: curvature
	});
	const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourceControlX,
		sourceControlY,
		targetControlX,
		targetControlY
	});
	return [
		`M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
		labelX,
		labelY,
		offsetX,
		offsetY
	];
}
function getEdgeCenter({ sourceX, sourceY, targetX, targetY }) {
	const xOffset = Math.abs(targetX - sourceX) / 2;
	const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;
	const yOffset = Math.abs(targetY - sourceY) / 2;
	return [
		centerX,
		targetY < sourceY ? targetY + yOffset : targetY - yOffset,
		xOffset,
		yOffset
	];
}
/**
* Returns the z-index for an edge based on the node it connects and whether it is selected.
* By default, edges are rendered below nodes. This behaviour is different for edges that are
* connected to nodes with a parent, as they are rendered above the parent node.
*/
function getElevatedEdgeZIndex({ sourceNode, targetNode, selected = false, zIndex = 0, elevateOnSelect = false, zIndexMode = "basic" }) {
	if (zIndexMode === "manual") return zIndex;
	return (elevateOnSelect && selected ? zIndex + 1e3 : zIndex) + Math.max(sourceNode.parentId || elevateOnSelect && sourceNode.selected ? sourceNode.internals.z : 0, targetNode.parentId || elevateOnSelect && targetNode.selected ? targetNode.internals.z : 0);
}
function isEdgeVisible({ sourceNode, targetNode, width, height, transform }) {
	const edgeBox = getBoundsOfBoxes(nodeToBox(sourceNode), nodeToBox(targetNode));
	if (edgeBox.x === edgeBox.x2) edgeBox.x2 += 1;
	if (edgeBox.y === edgeBox.y2) edgeBox.y2 += 1;
	return getOverlappingArea({
		x: -transform[0] / transform[2],
		y: -transform[1] / transform[2],
		width: width / transform[2],
		height: height / transform[2]
	}, boxToRect(edgeBox)) > 0;
}
/**
* The default edge ID generator function. Generates an ID based on the source, target, and handles.
* @public
* @param params - The connection or edge to generate an ID for.
* @returns The generated edge ID.
*/
var getEdgeId = ({ source, sourceHandle, target, targetHandle }) => `xy-edge__${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;
var connectionExists = (edge, edges) => {
	return edges.some((el) => el.source === edge.source && el.target === edge.target && (el.sourceHandle === edge.sourceHandle || !el.sourceHandle && !edge.sourceHandle) && (el.targetHandle === edge.targetHandle || !el.targetHandle && !edge.targetHandle));
};
/**
* This util is a convenience function to add a new Edge to an array of edges. It also performs some validation to make sure you don't add an invalid edge or duplicate an existing one.
* @public
* @param edgeParams - Either an `Edge` or a `Connection` you want to add.
* @param edges - The array of all current edges.
* @param options - Optional configuration object.
* @returns A new array of edges with the new edge added.
*
* @remarks If an edge with the same `target` and `source` already exists (and the same
*`targetHandle` and `sourceHandle` if those are set), then this util won't add
*a new edge even if the `id` property is different.
*
*/
var addEdge = (edgeParams, edges, options = {}) => {
	if (!edgeParams.source || !edgeParams.target) {
		options.onError?.("006", errorMessages["error006"]());
		return edges;
	}
	const edgeIdGenerator = options.getEdgeId || getEdgeId;
	let edge;
	if (isEdgeBase(edgeParams)) edge = { ...edgeParams };
	else edge = {
		...edgeParams,
		id: edgeIdGenerator(edgeParams)
	};
	if (connectionExists(edge, edges)) return edges;
	if (edge.sourceHandle === null) delete edge.sourceHandle;
	if (edge.targetHandle === null) delete edge.targetHandle;
	return edges.concat(edge);
};
/**
* Calculates the straight line path between two points.
* @public
* @returns A path string you can use in an SVG, the `labelX` and `labelY` position (center of path)
* and `offsetX`, `offsetY` between source handle and label.
*
* - `path`: the path to use in an SVG `<path>` element.
* - `labelX`: the `x` position you can use to render a label for this edge.
* - `labelY`: the `y` position you can use to render a label for this edge.
* - `offsetX`: the absolute difference between the source `x` position and the `x` position of the
* middle of this path.
* - `offsetY`: the absolute difference between the source `y` position and the `y` position of the
* middle of this path.
* @example
* ```js
*  const source = { x: 0, y: 20 };
*  const target = { x: 150, y: 100 };
*
*  const [path, labelX, labelY, offsetX, offsetY] = getStraightPath({
*    sourceX: source.x,
*    sourceY: source.y,
*    sourcePosition: Position.Right,
*    targetX: target.x,
*    targetY: target.y,
*    targetPosition: Position.Left,
*  });
* ```
* @remarks This function returns a tuple (aka a fixed-size array) to make it easier to work with multiple edge paths at once.
*/
function getStraightPath({ sourceX, sourceY, targetX, targetY }) {
	const [labelX, labelY, offsetX, offsetY] = getEdgeCenter({
		sourceX,
		sourceY,
		targetX,
		targetY
	});
	return [
		`M ${sourceX},${sourceY}L ${targetX},${targetY}`,
		labelX,
		labelY,
		offsetX,
		offsetY
	];
}
var handleDirections = {
	["left"]: {
		x: -1,
		y: 0
	},
	["right"]: {
		x: 1,
		y: 0
	},
	["top"]: {
		x: 0,
		y: -1
	},
	["bottom"]: {
		x: 0,
		y: 1
	}
};
var getDirection = ({ source, sourcePosition = "bottom", target }) => {
	if (sourcePosition === "left" || sourcePosition === "right") return source.x < target.x ? {
		x: 1,
		y: 0
	} : {
		x: -1,
		y: 0
	};
	return source.y < target.y ? {
		x: 0,
		y: 1
	} : {
		x: 0,
		y: -1
	};
};
var distance = (a, b) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
var isBetween = (a, b, c) => a.x === b.x && b.x === c.x && (b.y - a.y) * (c.y - b.y) >= 0 || a.y === b.y && b.y === c.y && (b.x - a.x) * (c.x - b.x) >= 0;
function getPoints({ source, sourcePosition = "bottom", target, targetPosition = "top", center, offset, stepPosition }) {
	const sourceDir = handleDirections[sourcePosition];
	const targetDir = handleDirections[targetPosition];
	const sourceGapped = {
		x: source.x + sourceDir.x * offset,
		y: source.y + sourceDir.y * offset
	};
	const targetGapped = {
		x: target.x + targetDir.x * offset,
		y: target.y + targetDir.y * offset
	};
	const dir = getDirection({
		source: sourceGapped,
		sourcePosition,
		target: targetGapped
	});
	const dirAccessor = dir.x !== 0 ? "x" : "y";
	const currDir = dir[dirAccessor];
	let points;
	let centerX, centerY;
	const sourceGapOffset = {
		x: 0,
		y: 0
	};
	const targetGapOffset = {
		x: 0,
		y: 0
	};
	const [, , defaultOffsetX, defaultOffsetY] = getEdgeCenter({
		sourceX: source.x,
		sourceY: source.y,
		targetX: target.x,
		targetY: target.y
	});
	if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
		if (dirAccessor === "x") {
			centerX = center.x ?? sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition;
			centerY = center.y ?? (sourceGapped.y + targetGapped.y) / 2;
		} else {
			centerX = center.x ?? (sourceGapped.x + targetGapped.x) / 2;
			centerY = center.y ?? sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition;
		}
		const verticalSplit = [{
			x: centerX,
			y: sourceGapped.y
		}, {
			x: centerX,
			y: targetGapped.y
		}];
		const horizontalSplit = [{
			x: sourceGapped.x,
			y: centerY
		}, {
			x: targetGapped.x,
			y: centerY
		}];
		if (sourceDir[dirAccessor] === currDir) points = dirAccessor === "x" ? verticalSplit : horizontalSplit;
		else points = dirAccessor === "x" ? horizontalSplit : verticalSplit;
	} else {
		const sourceTarget = [{
			x: sourceGapped.x,
			y: targetGapped.y
		}];
		const targetSource = [{
			x: targetGapped.x,
			y: sourceGapped.y
		}];
		if (dirAccessor === "x") points = sourceDir.x === currDir ? targetSource : sourceTarget;
		else points = sourceDir.y === currDir ? sourceTarget : targetSource;
		if (sourcePosition === targetPosition) {
			const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);
			if (diff <= offset) {
				const gapOffset = Math.min(offset - 1, offset - diff);
				if (sourceDir[dirAccessor] === currDir) sourceGapOffset[dirAccessor] = (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) * gapOffset;
				else targetGapOffset[dirAccessor] = (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) * gapOffset;
			}
		}
		if (sourcePosition !== targetPosition) {
			const dirAccessorOpposite = dirAccessor === "x" ? "y" : "x";
			const isSameDir = sourceDir[dirAccessor] === targetDir[dirAccessorOpposite];
			const sourceGtTargetOppo = sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite];
			const sourceLtTargetOppo = sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite];
			if (sourceDir[dirAccessor] === 1 && (!isSameDir && sourceGtTargetOppo || isSameDir && sourceLtTargetOppo) || sourceDir[dirAccessor] !== 1 && (!isSameDir && sourceLtTargetOppo || isSameDir && sourceGtTargetOppo)) points = dirAccessor === "x" ? sourceTarget : targetSource;
		}
		const sourceGapPoint = {
			x: sourceGapped.x + sourceGapOffset.x,
			y: sourceGapped.y + sourceGapOffset.y
		};
		const targetGapPoint = {
			x: targetGapped.x + targetGapOffset.x,
			y: targetGapped.y + targetGapOffset.y
		};
		if (Math.max(Math.abs(sourceGapPoint.x - points[0].x), Math.abs(targetGapPoint.x - points[0].x)) >= Math.max(Math.abs(sourceGapPoint.y - points[0].y), Math.abs(targetGapPoint.y - points[0].y))) {
			centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
			centerY = points[0].y;
		} else {
			centerX = points[0].x;
			centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
		}
	}
	const gappedSource = {
		x: sourceGapped.x + sourceGapOffset.x,
		y: sourceGapped.y + sourceGapOffset.y
	};
	const gappedTarget = {
		x: targetGapped.x + targetGapOffset.x,
		y: targetGapped.y + targetGapOffset.y
	};
	const pathPoints = [];
	for (const point of [
		source,
		gappedSource,
		...points,
		gappedTarget,
		target
	]) {
		const [a, b] = pathPoints.slice(-2);
		if (b && isBetween(a, b, point)) pathPoints.pop();
		pathPoints.push(point);
	}
	return [
		pathPoints,
		centerX,
		centerY,
		defaultOffsetX,
		defaultOffsetY
	];
}
function getBend(a, b, c, size) {
	const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
	const { x, y } = b;
	if (a.x === x && x === c.x || a.y === y && y === c.y) return `L${x} ${y}`;
	if (a.y === y) {
		const xDir = a.x < c.x ? -1 : 1;
		const yDir = a.y < c.y ? 1 : -1;
		return `L ${x + bendSize * xDir},${y}Q ${x},${y} ${x},${y + bendSize * yDir}`;
	}
	const xDir = a.x < c.x ? 1 : -1;
	return `L ${x},${y + bendSize * (a.y < c.y ? -1 : 1)}Q ${x},${y} ${x + bendSize * xDir},${y}`;
}
/**
* The `getSmoothStepPath` util returns everything you need to render a stepped path
* between two nodes. The `borderRadius` property can be used to choose how rounded
* the corners of those steps are.
* @public
* @returns A path string you can use in an SVG, the `labelX` and `labelY` position (center of path)
* and `offsetX`, `offsetY` between source handle and label.
*
* - `path`: the path to use in an SVG `<path>` element.
* - `labelX`: the `x` position you can use to render a label for this edge.
* - `labelY`: the `y` position you can use to render a label for this edge.
* - `offsetX`: the absolute difference between the source `x` position and the `x` position of the
* middle of this path.
* - `offsetY`: the absolute difference between the source `y` position and the `y` position of the
* middle of this path.
* @example
* ```js
*  const source = { x: 0, y: 20 };
*  const target = { x: 150, y: 100 };
*
*  const [path, labelX, labelY, offsetX, offsetY] = getSmoothStepPath({
*    sourceX: source.x,
*    sourceY: source.y,
*    sourcePosition: Position.Right,
*    targetX: target.x,
*    targetY: target.y,
*    targetPosition: Position.Left,
*  });
* ```
* @remarks This function returns a tuple (aka a fixed-size array) to make it easier to work with multiple edge paths at once.
*/
function getSmoothStepPath({ sourceX, sourceY, sourcePosition = "bottom", targetX, targetY, targetPosition = "top", borderRadius = 5, centerX, centerY, offset = 20, stepPosition = .5 }) {
	const [points, labelX, labelY, offsetX, offsetY] = getPoints({
		source: {
			x: sourceX,
			y: sourceY
		},
		sourcePosition,
		target: {
			x: targetX,
			y: targetY
		},
		targetPosition,
		center: {
			x: centerX,
			y: centerY
		},
		offset,
		stepPosition
	});
	let path = `M${points[0].x} ${points[0].y}`;
	for (let i = 1; i < points.length - 1; i++) path += getBend(points[i - 1], points[i], points[i + 1], borderRadius);
	path += `L${points[points.length - 1].x} ${points[points.length - 1].y}`;
	return [
		path,
		labelX,
		labelY,
		offsetX,
		offsetY
	];
}
function isNodeInitialized(node) {
	return node && !!(node.internals.handleBounds || node.handles?.length) && !!(node.measured.width || node.width || node.initialWidth);
}
function getEdgePosition(params) {
	const { sourceNode, targetNode } = params;
	if (!isNodeInitialized(sourceNode) || !isNodeInitialized(targetNode)) return null;
	const sourceHandleBounds = sourceNode.internals.handleBounds;
	const targetHandleBounds = targetNode.internals.handleBounds;
	const sourceHandle = getHandle$1(sourceHandleBounds?.source ?? [], params.sourceHandle);
	const targetHandle = getHandle$1(params.connectionMode === "strict" ? targetHandleBounds?.target ?? [] : (targetHandleBounds?.target ?? []).concat(targetHandleBounds?.source ?? []), params.targetHandle);
	if (!sourceHandle || !targetHandle) {
		params.onError?.("008", errorMessages["error008"](!sourceHandle ? "source" : "target", {
			id: params.id,
			sourceHandle: params.sourceHandle,
			targetHandle: params.targetHandle
		}));
		return null;
	}
	const sourcePosition = sourceHandle?.position || "bottom";
	const targetPosition = targetHandle?.position || "top";
	const source = getHandlePosition(sourceNode, sourceHandle, sourcePosition);
	const target = getHandlePosition(targetNode, targetHandle, targetPosition);
	return {
		sourceX: source.x,
		sourceY: source.y,
		targetX: target.x,
		targetY: target.y,
		sourcePosition,
		targetPosition
	};
}
function getHandlePosition(node, handle, fallbackPosition = "left", center = false) {
	const x = (handle?.x ?? 0) + node.internals.positionAbsolute.x;
	const y = (handle?.y ?? 0) + node.internals.positionAbsolute.y;
	const { width, height } = handle ?? getNodeDimensions(node);
	if (center) return {
		x: x + width / 2,
		y: y + height / 2
	};
	switch (handle?.position ?? fallbackPosition) {
		case "top": return {
			x: x + width / 2,
			y
		};
		case "right": return {
			x: x + width,
			y: y + height / 2
		};
		case "bottom": return {
			x: x + width / 2,
			y: y + height
		};
		case "left": return {
			x,
			y: y + height / 2
		};
	}
}
function getHandle$1(bounds, handleId) {
	if (!bounds) return null;
	return (!handleId ? bounds[0] : bounds.find((d) => d.id === handleId)) || null;
}
function getMarkerId(marker, id) {
	if (!marker) return "";
	if (typeof marker === "string") return marker;
	return `${id ? `${id}__` : ""}${Object.keys(marker).sort().map((key) => `${key}=${marker[key]}`).join("&")}`;
}
function createMarkerIds(edges, { id, defaultColor, defaultMarkerStart, defaultMarkerEnd }) {
	const ids = /* @__PURE__ */ new Set();
	return edges.reduce((markers, edge) => {
		[edge.markerStart || defaultMarkerStart, edge.markerEnd || defaultMarkerEnd].forEach((marker) => {
			if (marker && typeof marker === "object") {
				const markerId = getMarkerId(marker, id);
				if (!ids.has(markerId)) {
					markers.push({
						id: markerId,
						color: marker.color || defaultColor,
						...marker
					});
					ids.add(markerId);
				}
			}
		});
		return markers;
	}, []).sort((a, b) => a.id.localeCompare(b.id));
}
var SELECTED_NODE_Z = 1e3;
var ROOT_PARENT_Z_INCREMENT = 10;
var adoptUserNodesDefaultOptions = {
	nodeOrigin: [0, 0],
	nodeExtent: infiniteExtent,
	elevateNodesOnSelect: true,
	zIndexMode: "basic",
	defaults: {},
	checkEquality: true
};
function mergeObjects(base, incoming) {
	const result = { ...base };
	for (const key in incoming) if (incoming[key] !== void 0) result[key] = incoming[key];
	return result;
}
function getPositionAbsolute(node, nodeOrigin, nodeExtent = infiniteExtent) {
	return clampPosition(getNodePositionWithOrigin(node, nodeOrigin), isCoordinateExtent(node.extent) ? node.extent : nodeExtent, getNodeDimensions(node));
}
function parseHandles(userNode, internalNode) {
	if (!userNode.handles) return !userNode.measured ? void 0 : internalNode?.internals.handleBounds;
	const source = [];
	const target = [];
	for (const handle of userNode.handles) {
		const handleBounds = {
			id: handle.id,
			width: handle.width ?? 1,
			height: handle.height ?? 1,
			nodeId: userNode.id,
			x: handle.x,
			y: handle.y,
			position: handle.position,
			type: handle.type
		};
		if (handle.type === "source") source.push(handleBounds);
		else if (handle.type === "target") target.push(handleBounds);
	}
	return {
		source,
		target
	};
}
function isManualZIndexMode(zIndexMode) {
	return zIndexMode === "manual";
}
function adoptUserNodes(nodes, nodeLookup, parentLookup, options = {}) {
	const _options = mergeObjects(adoptUserNodesDefaultOptions, options);
	const rootParentIndex = { i: 0 };
	const tmpLookup = new Map(nodeLookup);
	const hasSubflows = !!options.defaults?.parentId || nodes.some((node) => !!node.parentId);
	const selectedNodeZ = _options?.elevateNodesOnSelect && !isManualZIndexMode(_options.zIndexMode) ? SELECTED_NODE_Z : 0;
	const processedNodes = /* @__PURE__ */ new Set();
	const deferredChildNodes = /* @__PURE__ */ new Map();
	let nodesInitialized = nodes.length > 0;
	let hasSelectedNodes = false;
	const updatedNodes = /* @__PURE__ */ new Set();
	function updateNode(node) {
		if (updatedNodes.has(node.id)) {
			const internalNode = nodeLookup.get(node.id);
			if (internalNode) Object.assign(internalNode, node);
		} else {
			updatedNodes.add(node.id);
			nodeLookup.set(node.id, node);
		}
	}
	nodeLookup.clear();
	parentLookup.clear();
	const subflowContext = {
		nodeLookup,
		parentLookup,
		options,
		rootParentIndex,
		processedNodes,
		deferredChildNodes,
		updateNode
	};
	for (const userNode of nodes) {
		let internalNode = tmpLookup.get(userNode.id);
		if (_options.checkEquality && userNode === internalNode?.internals.userNode) nodeLookup.set(userNode.id, internalNode);
		else {
			internalNode = {
				..._options.defaults,
				...userNode,
				measured: {
					width: userNode.measured?.width,
					height: userNode.measured?.height
				},
				internals: {
					positionAbsolute: getPositionAbsolute(userNode, _options.nodeOrigin, _options.nodeExtent),
					handleBounds: parseHandles(userNode, internalNode),
					z: calculateZ(userNode, selectedNodeZ, _options.zIndexMode),
					userNode,
					isParent: false
				}
			};
			updateNode(internalNode);
		}
		if ((internalNode.measured === void 0 || internalNode.measured.width === void 0 || internalNode.measured.height === void 0) && !internalNode.hidden) nodesInitialized = false;
		if (hasSubflows) resolveSubflowsForNode(internalNode, subflowContext);
		hasSelectedNodes || (hasSelectedNodes = userNode.selected ?? false);
	}
	for (const id of tmpLookup.keys()) {
		const node = nodeLookup.get(id);
		if (!node) updatedNodes.add(id);
		else if (node.internals.isParent && !parentLookup.has(id)) updateNode({
			...node,
			internals: {
				...node.internals,
				isParent: false
			}
		});
	}
	return {
		nodesInitialized,
		hasSelectedNodes,
		updatedNodes
	};
}
function resolveSubflowsForNode(node, context) {
	const { nodeLookup, parentLookup, options, rootParentIndex, processedNodes, deferredChildNodes, updateNode } = context;
	if (node.parentId && !processedNodes.has(node.parentId)) {
		const children = deferredChildNodes.get(node.parentId) ?? [];
		children.push(node);
		deferredChildNodes.set(node.parentId, children);
		return;
	}
	if (node.parentId) updateChildNode(node, nodeLookup, parentLookup, options, rootParentIndex, updateNode);
	processedNodes.add(node.id);
	const children = deferredChildNodes.get(node.id);
	if (children) {
		deferredChildNodes.delete(node.id);
		children.forEach((child) => resolveSubflowsForNode(child, context));
	}
}
function updateParentLookup(node, parentLookup, parentNode, updateNode) {
	if (!node.parentId) return;
	const childNodes = parentLookup.get(node.parentId);
	if (childNodes) childNodes.set(node.id, node);
	else parentLookup.set(node.parentId, /* @__PURE__ */ new Map([[node.id, node]]));
	if (!parentNode.internals.isParent) updateNode({
		...parentNode,
		internals: {
			...parentNode.internals,
			isParent: true
		}
	});
}
/**
* Updates positionAbsolute and zIndex of a child node and the parentLookup.
*/
function updateChildNode(node, nodeLookup, parentLookup, options, rootParentIndex, updateNode = (node) => {
	nodeLookup.set(node.id, node);
}) {
	const mergedOptions = mergeObjects(adoptUserNodesDefaultOptions, options);
	const { zIndexMode } = mergedOptions;
	const parentId = node.parentId;
	const parentNode = nodeLookup.get(parentId);
	if (!parentNode) {
		console.warn(`Parent node ${parentId} not found.`);
		return;
	}
	if (rootParentIndex && !parentNode.parentId && parentNode.internals.rootParentIndex === void 0 && zIndexMode === "auto") {
		parentNode.internals.rootParentIndex = ++rootParentIndex.i;
		parentNode.internals.z = parentNode.internals.z + rootParentIndex.i * ROOT_PARENT_Z_INCREMENT;
	}
	if (rootParentIndex && parentNode.internals.rootParentIndex !== void 0) rootParentIndex.i = parentNode.internals.rootParentIndex;
	updateParentLookup(updateChildXYZ(node, parentNode, {
		nodeLookup,
		options: mergedOptions,
		updateNode
	}), parentLookup, parentNode, updateNode);
}
/**
* Updates positionAbsolute and zIndex of a child node and the parentLookup.
*/
function updateChildXYZ(node, parentNode, context) {
	const { elevateNodesOnSelect, nodeOrigin, nodeExtent, zIndexMode } = context.options;
	const { x, y, z } = calculateChildXYZ(node, parentNode, nodeOrigin, nodeExtent, elevateNodesOnSelect && !isManualZIndexMode(zIndexMode) ? SELECTED_NODE_Z : 0, zIndexMode);
	const { positionAbsolute } = node.internals;
	const positionChanged = x !== positionAbsolute.x || y !== positionAbsolute.y;
	if (positionChanged || z !== node.internals.z) {
		const newNode = {
			...node,
			internals: {
				...node.internals,
				positionAbsolute: positionChanged ? {
					x,
					y
				} : positionAbsolute,
				z
			}
		};
		context.updateNode(newNode);
		return newNode;
	}
	return node;
}
function calculateZ(node, selectedNodeZ, zIndexMode) {
	const zIndex = isNumeric(node.zIndex) ? node.zIndex : 0;
	if (isManualZIndexMode(zIndexMode)) return zIndex;
	return zIndex + (node.selected ? selectedNodeZ : 0);
}
function calculateChildXYZ(childNode, parentNode, nodeOrigin, nodeExtent, selectedNodeZ, zIndexMode) {
	const { x: parentX, y: parentY } = parentNode.internals.positionAbsolute;
	const childDimensions = getNodeDimensions(childNode);
	const positionWithOrigin = getNodePositionWithOrigin(childNode, nodeOrigin);
	const clampedPosition = isCoordinateExtent(childNode.extent) ? clampPosition(positionWithOrigin, childNode.extent, childDimensions) : positionWithOrigin;
	let absolutePosition = clampPosition({
		x: parentX + clampedPosition.x,
		y: parentY + clampedPosition.y
	}, nodeExtent, childDimensions);
	if (childNode.extent === "parent") absolutePosition = clampPositionToParent(absolutePosition, childDimensions, parentNode);
	const childZ = calculateZ(childNode, selectedNodeZ, zIndexMode);
	const parentZ = parentNode.internals.z ?? 0;
	return {
		x: absolutePosition.x,
		y: absolutePosition.y,
		z: parentZ >= childZ ? parentZ + 1 : childZ
	};
}
function handleExpandParent(children, nodeLookup, parentLookup, nodeOrigin = [0, 0]) {
	const changes = [];
	const parentExpansions = /* @__PURE__ */ new Map();
	for (const child of children) {
		const parent = nodeLookup.get(child.parentId);
		if (!parent) continue;
		const expandedRect = getBoundsOfRects(parentExpansions.get(child.parentId)?.expandedRect ?? nodeToRect(parent), child.rect);
		parentExpansions.set(child.parentId, {
			expandedRect,
			parent
		});
	}
	if (parentExpansions.size > 0) parentExpansions.forEach(({ expandedRect, parent }, parentId) => {
		const positionAbsolute = parent.internals.positionAbsolute;
		const dimensions = getNodeDimensions(parent);
		const origin = parent.origin ?? nodeOrigin;
		const xChange = expandedRect.x < positionAbsolute.x ? Math.round(Math.abs(positionAbsolute.x - expandedRect.x)) : 0;
		const yChange = expandedRect.y < positionAbsolute.y ? Math.round(Math.abs(positionAbsolute.y - expandedRect.y)) : 0;
		const newWidth = Math.max(dimensions.width, Math.round(expandedRect.width));
		const newHeight = Math.max(dimensions.height, Math.round(expandedRect.height));
		const widthChange = (newWidth - dimensions.width) * origin[0];
		const heightChange = (newHeight - dimensions.height) * origin[1];
		if (xChange > 0 || yChange > 0 || widthChange || heightChange) {
			changes.push(positionChange(parentId, {
				x: parent.position.x - xChange + widthChange,
				y: parent.position.y - yChange + heightChange
			}));
			parentLookup.get(parentId)?.forEach((childNode) => {
				if (!children.some((child) => child.id === childNode.id)) changes.push(positionChange(childNode.id, {
					x: childNode.position.x + xChange,
					y: childNode.position.y + yChange
				}));
			});
		}
		if (dimensions.width < expandedRect.width || dimensions.height < expandedRect.height || xChange || yChange) changes.push({
			id: parentId,
			type: "dimensions",
			setAttributes: true,
			dimensions: {
				width: newWidth + (xChange ? origin[0] * xChange - widthChange : 0),
				height: newHeight + (yChange ? origin[1] * yChange - heightChange : 0)
			}
		});
	});
	return changes;
}
function updateNodeInternals(updates, nodeLookup, parentLookup, domNode, nodeOrigin, nodeExtent, zIndexMode) {
	const updatedNodes = /* @__PURE__ */ new Set();
	const updateNode = (node) => {
		nodeLookup.set(node.id, node);
		updatedNodes.add(node.id);
	};
	const viewportNode = domNode?.querySelector(".xyflow__viewport");
	let updatedInternals = false;
	if (!viewportNode) return {
		changes: [],
		updatedInternals,
		updatedNodes
	};
	const changes = [];
	const style = window.getComputedStyle(viewportNode);
	const { m22: zoom } = new window.DOMMatrixReadOnly(style.transform);
	const parentExpandChildren = [];
	const expandParentIds = [];
	for (const update of updates.values()) {
		const node = nodeLookup.get(update.id);
		if (!node) continue;
		if (node.hidden) {
			updateNode({
				...node,
				internals: {
					...node.internals,
					handleBounds: void 0
				}
			});
			updatedInternals = true;
			continue;
		}
		const dimensions = getDimensions(update.nodeElement);
		const dimensionChanged = node.measured.width !== dimensions.width || node.measured.height !== dimensions.height;
		if (!!(dimensions.width && dimensions.height && (dimensionChanged || !node.internals.handleBounds || update.force))) {
			const nodeBounds = update.nodeElement.getBoundingClientRect();
			const measuredNode = {
				...node,
				measured: dimensions
			};
			updateNode({
				...measuredNode,
				internals: {
					...node.internals,
					positionAbsolute: node.parentId ? node.internals.positionAbsolute : getPositionAbsolute(measuredNode, nodeOrigin, nodeExtent),
					handleBounds: {
						source: getHandleBounds("source", update.nodeElement, nodeBounds, zoom, node.id),
						target: getHandleBounds("target", update.nodeElement, nodeBounds, zoom, node.id)
					}
				}
			});
			updatedInternals = true;
			if (dimensionChanged) {
				changes.push(dimensionChange(node.id, dimensions));
				if (node.expandParent && node.parentId) expandParentIds.push(node.id);
			}
		}
	}
	if (updatedInternals) {
		const childOptions = {
			nodeOrigin,
			nodeExtent,
			zIndexMode
		};
		for (const childNodes of parentLookup.values()) for (const childId of childNodes.keys()) {
			const childNode = nodeLookup.get(childId);
			if (childNode) updateChildNode(childNode, nodeLookup, parentLookup, childOptions, void 0, (node) => updateNode(node));
		}
	}
	for (const id of expandParentIds) {
		const node = nodeLookup.get(id);
		parentExpandChildren.push({
			id,
			parentId: node.parentId,
			rect: nodeToRect(node, nodeOrigin)
		});
	}
	if (parentExpandChildren.length > 0) {
		const parentExpandChanges = handleExpandParent(parentExpandChildren, nodeLookup, parentLookup, nodeOrigin);
		changes.push(...parentExpandChanges);
	}
	return {
		changes,
		updatedInternals,
		updatedNodes
	};
}
async function panBy({ delta, panZoom, transform, translateExtent, width, height }) {
	if (!panZoom || !delta.x && !delta.y) return false;
	const nextViewport = await panZoom.setViewportConstrained({
		x: transform[0] + delta.x,
		y: transform[1] + delta.y,
		zoom: transform[2]
	}, [[0, 0], [width, height]], translateExtent);
	return !!nextViewport && (nextViewport.x !== transform[0] || nextViewport.y !== transform[1] || nextViewport.k !== transform[2]);
}
/**
* this function adds the connection to the connectionLookup
* at the following keys: nodeId-type-handleId, nodeId-type and nodeId
* @param type type of the connection
* @param connection connection that should be added to the lookup
* @param connectionKey at which key the connection should be added
* @param connectionLookup reference to the connection lookup
* @param nodeId nodeId of the connection
* @param handleId handleId of the connection
*/
function addConnectionToLookup(type, connection, connectionKey, connectionLookup, nodeId, handleId, updatedConnectionKeys) {
	let key = nodeId;
	let nodeMap = connectionLookup.get(key);
	if (!nodeMap || !updatedConnectionKeys.has(key)) {
		nodeMap = new Map(nodeMap);
		updatedConnectionKeys.add(key);
		connectionLookup.set(key, nodeMap);
	}
	nodeMap.set(connectionKey, connection);
	key = `${nodeId}-${type}`;
	let typeMap = connectionLookup.get(key);
	if (!typeMap || !updatedConnectionKeys.has(key)) {
		typeMap = new Map(typeMap);
		updatedConnectionKeys.add(key);
		connectionLookup.set(key, typeMap);
	}
	typeMap.set(connectionKey, connection);
	if (handleId) {
		key = `${nodeId}-${type}-${handleId}`;
		let handleMap = connectionLookup.get(key);
		if (!handleMap || !updatedConnectionKeys.has(key)) {
			handleMap = new Map(handleMap);
			updatedConnectionKeys.add(key);
			connectionLookup.set(key, handleMap);
		}
		handleMap.set(connectionKey, connection);
	}
}
function removeConnectionFromLookup(type, connectionKey, connectionLookup, nodeId, handleId, updatedConnectionKeys) {
	const keys = [nodeId, `${nodeId}-${type}`];
	if (handleId) keys.push(`${nodeId}-${type}-${handleId}`);
	for (const key of keys) {
		let map = connectionLookup.get(key);
		if (!map) continue;
		if (!updatedConnectionKeys.has(key)) {
			map = new Map(map);
			connectionLookup.set(key, map);
			updatedConnectionKeys.add(key);
		}
		map.delete(connectionKey);
		if (map.size === 0) connectionLookup.delete(key);
	}
}
function syncEdgeConnections(connectionLookup, edge, action, updatedConnectionKeys) {
	const { source: sourceNode, target: targetNode, sourceHandle = null, targetHandle = null } = edge;
	const connection = {
		edgeId: edge.id,
		source: sourceNode,
		target: targetNode,
		sourceHandle,
		targetHandle
	};
	const sourceKey = `${sourceNode}-${sourceHandle}--${targetNode}-${targetHandle}`;
	const targetKey = `${targetNode}-${targetHandle}--${sourceNode}-${sourceHandle}`;
	if (action === "add") {
		addConnectionToLookup("source", connection, targetKey, connectionLookup, sourceNode, sourceHandle, updatedConnectionKeys);
		addConnectionToLookup("target", connection, sourceKey, connectionLookup, targetNode, targetHandle, updatedConnectionKeys);
	} else {
		removeConnectionFromLookup("source", targetKey, connectionLookup, sourceNode, sourceHandle, updatedConnectionKeys);
		removeConnectionFromLookup("target", sourceKey, connectionLookup, targetNode, targetHandle, updatedConnectionKeys);
	}
}
function updateConnectionLookup(connectionLookup, edgeLookup, edges) {
	const tmpLookup = new Map(edgeLookup);
	const updatedEdges = /* @__PURE__ */ new Set();
	const updatedConnectionKeys = /* @__PURE__ */ new Set();
	const connectionsToAdd = [];
	edgeLookup.clear();
	for (const edge of edges) {
		const existing = tmpLookup.get(edge.id);
		if (existing === edge) {
			edgeLookup.set(edge.id, edge);
			continue;
		}
		if (!existing || existing.source !== edge.source || existing.target !== edge.target || existing.sourceHandle != edge.sourceHandle || existing.targetHandle != edge.targetHandle) {
			if (existing) syncEdgeConnections(connectionLookup, existing, "remove", updatedConnectionKeys);
			connectionsToAdd.push(edge);
		}
		edgeLookup.set(edge.id, edge);
		updatedEdges.add(edge.id);
	}
	for (const edge of tmpLookup.values()) if (!edgeLookup.has(edge.id)) {
		syncEdgeConnections(connectionLookup, edge, "remove", updatedConnectionKeys);
		updatedEdges.add(edge.id);
	}
	for (const edge of connectionsToAdd) syncEdgeConnections(connectionLookup, edge, "add", updatedConnectionKeys);
	return { updatedEdges };
}
function changeParentNode(nodeId, nodeLookup, parentId, nodeOrigin, updateNodeCallback) {
	const node = nodeLookup.get(nodeId);
	if (!node) {
		console.warn(`changeParent: Node "${nodeId}" does not exists`);
		return;
	}
	if (parentId === nodeId) return;
	const childPosition = node.internals.positionAbsolute;
	const childOrigin = node.origin ?? nodeOrigin;
	const childDimensions = getNodeDimensions(node);
	const originCorrection = {
		x: childOrigin[0] * childDimensions.width,
		y: childOrigin[1] * childDimensions.height
	};
	if (parentId === null) {
		updateNodeCallback({
			nodeId,
			parentId,
			x: childPosition.x + originCorrection.x,
			y: childPosition.y + originCorrection.y
		});
		return;
	}
	const parentNode = nodeLookup.get(parentId);
	if (!parentNode) {
		console.warn(`changeParent: Parent node "${parentId}" does not exists`);
		return;
	}
	const parentPosition = parentNode.internals.positionAbsolute;
	updateNodeCallback({
		nodeId,
		parentId,
		x: childPosition.x + originCorrection.x - parentPosition.x,
		y: childPosition.y + originCorrection.y - parentPosition.y
	});
}
function isParentSelected(node, nodeLookup) {
	if (!node.parentId) return false;
	const parentNode = nodeLookup.get(node.parentId);
	if (!parentNode) return false;
	if (parentNode.selected) return true;
	return isParentSelected(parentNode, nodeLookup);
}
function hasSelector(target, selector, domNode) {
	let current = target;
	do {
		if (current?.matches?.(selector)) return true;
		if (current === domNode) return false;
		current = current?.parentElement;
	} while (current);
	return false;
}
function getDragItems(nodeLookup, nodesDraggable, mousePos, nodeId, onlyDragNode) {
	const dragItems = /* @__PURE__ */ new Map();
	for (const [id, node] of nodeLookup) if ((onlyDragNode ? node.id === nodeId : node.selected || node.id === nodeId) && (onlyDragNode || !node.parentId || !isParentSelected(node, nodeLookup)) && (node.draggable || nodesDraggable && typeof node.draggable === "undefined")) {
		const internalNode = nodeLookup.get(id);
		if (internalNode) dragItems.set(id, {
			id,
			position: internalNode.position || {
				x: 0,
				y: 0
			},
			distance: {
				x: mousePos.x - internalNode.internals.positionAbsolute.x,
				y: mousePos.y - internalNode.internals.positionAbsolute.y
			},
			extent: internalNode.extent,
			parentId: internalNode.parentId,
			origin: internalNode.origin,
			expandParent: internalNode.expandParent,
			internals: { positionAbsolute: internalNode.internals.positionAbsolute || {
				x: 0,
				y: 0
			} },
			measured: {
				width: internalNode.measured.width ?? 0,
				height: internalNode.measured.height ?? 0
			}
		});
	}
	return dragItems;
}
function getEventHandlerParams({ nodeId, dragItems, nodeLookup, dragging = true }) {
	const nodesFromDragItems = [];
	for (const [id, dragItem] of dragItems) {
		const node = nodeLookup.get(id)?.internals.userNode;
		if (node) nodesFromDragItems.push({
			...node,
			position: dragItem.position,
			dragging
		});
	}
	if (!nodeId) return [nodesFromDragItems[0], nodesFromDragItems];
	const node = nodeLookup.get(nodeId)?.internals.userNode;
	return [!node ? nodesFromDragItems[0] : {
		...node,
		position: dragItems.get(nodeId)?.position || node.position,
		dragging
	}, nodesFromDragItems];
}
/**
* If a selection is being dragged we want to apply the same snap offset to all nodes in the selection.
* This function calculates the snap offset based on the first node in the selection.
*/
function calculateSnapOffset({ dragItems, snapGrid, x, y }) {
	const refDragItem = dragItems.values().next().value;
	if (!refDragItem) return null;
	const refPos = {
		x: x - refDragItem.distance.x,
		y: y - refDragItem.distance.y
	};
	const refPosSnapped = snapPosition(refPos, snapGrid);
	return {
		x: refPosSnapped.x - refPos.x,
		y: refPosSnapped.y - refPos.y
	};
}
function XYDrag({ onNodeMouseDown, getStoreItems, onDragStart, onDrag, onDragStop }) {
	let lastPos = {
		x: null,
		y: null
	};
	let autoPanId = 0;
	let dragItems = /* @__PURE__ */ new Map();
	let autoPanStarted = false;
	let mousePosition = {
		x: 0,
		y: 0
	};
	let initialMousePosition = {
		x: 0,
		y: 0
	};
	let containerBounds = null;
	let dragStarted = false;
	let d3Selection = null;
	let abortDrag = false;
	let nodePositionsChanged = false;
	let dragEvent = null;
	let noDragClassName;
	let handleSelector;
	let isSelectable;
	let nodeId;
	let domNode;
	function preventNextClick(sourceEvent) {
		const view = sourceEvent.view ?? window;
		const suppressClick = (event) => {
			event.preventDefault();
			event.stopImmediatePropagation();
		};
		view.addEventListener("click", suppressClick, { capture: true });
		setTimeout(() => view.removeEventListener("click", suppressClick, { capture: true }), 0);
	}
	function updateNodes({ x, y }) {
		const { nodeLookup, nodeExtent, snapGrid, snapToGrid, nodeOrigin, onNodeDrag, onSelectionDrag, onError, updateNodePositions } = getStoreItems();
		lastPos = {
			x,
			y
		};
		let hasChange = false;
		const isMultiDrag = dragItems.size > 1;
		const nodesBox = isMultiDrag && nodeExtent ? rectToBox(getInternalNodesBounds(dragItems)) : null;
		const multiDragSnapOffset = isMultiDrag && snapToGrid ? calculateSnapOffset({
			dragItems,
			snapGrid,
			x,
			y
		}) : null;
		for (const [id, dragItem] of dragItems) {
			if (!nodeLookup.has(id)) continue;
			let nextPosition = {
				x: x - dragItem.distance.x,
				y: y - dragItem.distance.y
			};
			if (snapToGrid) nextPosition = multiDragSnapOffset ? {
				x: Math.round(nextPosition.x + multiDragSnapOffset.x),
				y: Math.round(nextPosition.y + multiDragSnapOffset.y)
			} : snapPosition(nextPosition, snapGrid);
			let adjustedNodeExtent = null;
			if (isMultiDrag && nodeExtent && !dragItem.extent && nodesBox) {
				const { positionAbsolute } = dragItem.internals;
				const x1 = positionAbsolute.x - nodesBox.x + nodeExtent[0][0];
				const x2 = positionAbsolute.x + dragItem.measured.width - nodesBox.x2 + nodeExtent[1][0];
				const y1 = positionAbsolute.y - nodesBox.y + nodeExtent[0][1];
				const y2 = positionAbsolute.y + dragItem.measured.height - nodesBox.y2 + nodeExtent[1][1];
				adjustedNodeExtent = [[x1, y1], [x2, y2]];
			}
			const { position, positionAbsolute } = calculateNodePosition({
				nodeId: id,
				nextPosition,
				nodeLookup,
				nodeExtent: adjustedNodeExtent ? adjustedNodeExtent : nodeExtent,
				nodeOrigin,
				onError
			});
			hasChange = hasChange || dragItem.position.x !== position.x || dragItem.position.y !== position.y;
			dragItem.position = position;
			dragItem.internals.positionAbsolute = positionAbsolute;
		}
		nodePositionsChanged = nodePositionsChanged || hasChange;
		if (!hasChange) return;
		updateNodePositions(dragItems, true);
		if (dragEvent && (onDrag || onNodeDrag || !nodeId && onSelectionDrag)) {
			const [currentNode, currentNodes] = getEventHandlerParams({
				nodeId,
				dragItems,
				nodeLookup
			});
			onDrag?.(dragEvent, dragItems, currentNode, currentNodes);
			onNodeDrag?.(dragEvent, currentNode, currentNodes);
			if (!nodeId) onSelectionDrag?.(dragEvent, currentNodes);
		}
	}
	async function autoPan() {
		if (!containerBounds) return;
		const { transform, panBy, autoPanSpeed, autoPanOnNodeDrag } = getStoreItems();
		if (!autoPanOnNodeDrag) {
			autoPanStarted = false;
			cancelAnimationFrame(autoPanId);
			return;
		}
		const [xMovement, yMovement] = calcAutoPan(mousePosition, containerBounds, autoPanSpeed);
		if (xMovement !== 0 || yMovement !== 0) {
			lastPos.x = (lastPos.x ?? 0) - xMovement / transform[2];
			lastPos.y = (lastPos.y ?? 0) - yMovement / transform[2];
			if (await panBy({
				x: xMovement,
				y: yMovement
			})) updateNodes(lastPos);
		}
		autoPanId = requestAnimationFrame(() => {
			autoPan();
		});
	}
	function startDrag(event) {
		const { nodeLookup, multiSelectionActive, nodesDraggable, transform, snapGrid, snapToGrid, selectNodesOnDrag, onNodeDragStart, onSelectionDragStart, unselectNodesAndEdges } = getStoreItems();
		dragStarted = true;
		const isUnselectedNodeDrag = !!nodeId && !multiSelectionActive && !nodeLookup.get(nodeId)?.selected;
		if ((!selectNodesOnDrag || !isSelectable) && !multiSelectionActive && nodeId) {
			if (!nodeLookup.get(nodeId)?.selected) unselectNodesAndEdges();
		}
		if (isSelectable && selectNodesOnDrag && nodeId) onNodeMouseDown?.(nodeId);
		const pointerPos = getPointerPosition(event.sourceEvent, {
			transform,
			snapGrid,
			snapToGrid,
			containerBounds
		});
		lastPos = pointerPos;
		dragItems = getDragItems(nodeLookup, nodesDraggable, pointerPos, nodeId, isUnselectedNodeDrag);
		if (dragItems.size > 0 && (onDragStart || onNodeDragStart || !nodeId && onSelectionDragStart)) {
			const [currentNode, currentNodes] = getEventHandlerParams({
				nodeId,
				dragItems,
				nodeLookup
			});
			onDragStart?.(event.sourceEvent, dragItems, currentNode, currentNodes);
			onNodeDragStart?.(event.sourceEvent, currentNode, currentNodes);
			if (!nodeId) onSelectionDragStart?.(event.sourceEvent, currentNodes);
		}
	}
	const d3DragInstance = drag().clickDistance(1e400).on("start", (event) => {
		const { domNode, nodeDragThreshold, transform, snapGrid, snapToGrid } = getStoreItems();
		containerBounds = domNode?.getBoundingClientRect() || null;
		dragStarted = false;
		autoPanStarted = false;
		abortDrag = false;
		nodePositionsChanged = false;
		dragEvent = event.sourceEvent;
		if (nodeDragThreshold === 0) startDrag(event);
		lastPos = getPointerPosition(event.sourceEvent, {
			transform,
			snapGrid,
			snapToGrid,
			containerBounds
		});
		mousePosition = getEventPosition(event.sourceEvent, containerBounds);
		initialMousePosition = mousePosition;
	}).on("drag", (event) => {
		const { autoPanOnNodeDrag, transform, snapGrid, snapToGrid, nodeDragThreshold, nodeLookup } = getStoreItems();
		dragEvent = event.sourceEvent;
		const pointerPos = getPointerPosition(dragEvent, {
			transform,
			snapGrid,
			snapToGrid,
			containerBounds
		});
		if (isTouchEvent(dragEvent) && dragEvent.type === "touchmove" && dragEvent.touches.length > 1 || nodeId && !nodeLookup.has(nodeId)) abortDrag = true;
		if (abortDrag) return;
		if (!autoPanStarted && autoPanOnNodeDrag && dragStarted) {
			autoPanStarted = true;
			autoPan();
		}
		if (!dragStarted) {
			const currentMousePosition = getEventPosition(event.sourceEvent, containerBounds);
			const dx = currentMousePosition.x - initialMousePosition.x;
			const dy = currentMousePosition.y - initialMousePosition.y;
			if (Math.hypot(dx, dy) > nodeDragThreshold) startDrag(event);
		}
		if ((lastPos.x !== pointerPos.xSnapped || lastPos.y !== pointerPos.ySnapped) && dragItems && dragStarted) {
			mousePosition = getEventPosition(dragEvent, containerBounds);
			updateNodes(pointerPos);
		}
	}).on("end", (event) => {
		if (!domNode?.contains(event.sourceEvent.target) || nodePositionsChanged) preventNextClick(event.sourceEvent);
		if (!dragStarted || abortDrag) {
			if (abortDrag && dragItems.size > 0) getStoreItems().updateNodePositions(dragItems, false);
			return;
		}
		cancelAnimationFrame(autoPanId);
		if (dragItems.size > 0) {
			const { nodeLookup, updateNodePositions, onNodeDragStop, onSelectionDragStop } = getStoreItems();
			if (nodePositionsChanged) {
				updateNodePositions(dragItems, false);
				nodePositionsChanged = false;
			}
			if (onDragStop || onNodeDragStop || !nodeId && onSelectionDragStop) {
				const [currentNode, currentNodes] = getEventHandlerParams({
					nodeId,
					dragItems,
					nodeLookup,
					dragging: false
				});
				onDragStop?.(event.sourceEvent, dragItems, currentNode, currentNodes);
				onNodeDragStop?.(event.sourceEvent, currentNode, currentNodes);
				if (!nodeId) onSelectionDragStop?.(event.sourceEvent, currentNodes);
			}
		}
	}).filter((event) => {
		const target = event.target;
		const boundNode = domNode;
		if (!boundNode) return false;
		return !event.button && (!noDragClassName || !hasSelector(target, `.${noDragClassName}`, boundNode)) && (!handleSelector || hasSelector(target, handleSelector, boundNode));
	});
	function update(params) {
		noDragClassName = params.noDragClassName;
		handleSelector = params.handleSelector;
		isSelectable = params.isSelectable;
		nodeId = params.nodeId;
		if (params.domNode === domNode) return;
		domNode = params.domNode;
		d3Selection?.on(".drag", null);
		d3Selection = select(domNode);
		d3Selection.call(d3DragInstance);
	}
	function destroy() {
		d3Selection?.on(".drag", null);
		d3Selection = null;
		domNode = void 0;
	}
	return {
		update,
		destroy
	};
}
function getNodesWithinDistance(position, nodeLookup, distance) {
	const nodes = [];
	const rect = {
		x: position.x - distance,
		y: position.y - distance,
		width: distance * 2,
		height: distance * 2
	};
	for (const node of nodeLookup.values()) if (getOverlappingArea(rect, nodeToRect(node)) > 0) nodes.push(node);
	return nodes;
}
var ADDITIONAL_DISTANCE = 250;
function getClosestHandle(position, connectionRadius, nodeLookup, fromHandle) {
	let closestHandles = [];
	let minDistance = 1e400;
	const closeNodes = getNodesWithinDistance(position, nodeLookup, connectionRadius + ADDITIONAL_DISTANCE);
	for (const node of closeNodes) {
		const allHandles = [...node.internals.handleBounds?.source ?? [], ...node.internals.handleBounds?.target ?? []];
		for (const handle of allHandles) {
			if (fromHandle.nodeId === handle.nodeId && fromHandle.type === handle.type && fromHandle.id === handle.id) continue;
			const { x, y } = getHandlePosition(node, handle, handle.position, true);
			const distance = Math.sqrt(Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2));
			if (distance > connectionRadius) continue;
			if (distance < minDistance) {
				closestHandles = [{
					...handle,
					x,
					y
				}];
				minDistance = distance;
			} else if (distance === minDistance) closestHandles.push({
				...handle,
				x,
				y
			});
		}
	}
	if (!closestHandles.length) return null;
	if (closestHandles.length > 1) {
		const oppositeHandleType = fromHandle.type === "source" ? "target" : "source";
		return closestHandles.find((handle) => handle.type === oppositeHandleType) ?? closestHandles[0];
	}
	return closestHandles[0];
}
function getHandle(nodeId, handleType, handleId, nodeLookup, connectionMode, withAbsolutePosition = false) {
	const node = nodeLookup.get(nodeId);
	if (!node) return null;
	const handles = connectionMode === "strict" ? node.internals.handleBounds?.[handleType] : [...node.internals.handleBounds?.source ?? [], ...node.internals.handleBounds?.target ?? []];
	const handle = (handleId ? handles?.find((h) => h.id === handleId) : handles?.[0]) ?? null;
	return handle && withAbsolutePosition ? {
		...handle,
		...getHandlePosition(node, handle, handle.position, true)
	} : handle;
}
function getHandleType(edgeUpdaterType, handleDomNode) {
	if (edgeUpdaterType) return edgeUpdaterType;
	else if (handleDomNode?.classList.contains("target")) return "target";
	else if (handleDomNode?.classList.contains("source")) return "source";
	return null;
}
function isConnectionValid(isInsideConnectionRadius, isHandleValid) {
	let isValid = null;
	if (isHandleValid) isValid = true;
	else if (isInsideConnectionRadius && !isHandleValid) isValid = false;
	return isValid;
}
var alwaysValid = () => true;
function onPointerDown(event, { connectionMode, connectionRadius, handleId, nodeId, edgeUpdaterType, isTarget, domNode, nodeLookup, lib, autoPanOnConnect, flowId, panBy, cancelConnection, onConnectStart, onConnect, onConnectEnd, isValidConnection = alwaysValid, onReconnectEnd, updateConnection, getTransform, getFromHandle, autoPanSpeed, dragThreshold = 1, handleDomNode }) {
	const doc = getHostForElement(event.target);
	let autoPanId = 0;
	let closestHandle;
	const { x, y } = getEventPosition(event);
	const handleType = getHandleType(edgeUpdaterType, handleDomNode);
	const containerBounds = domNode?.getBoundingClientRect();
	let connectionStarted = false;
	if (!containerBounds || !handleType) return;
	const fromHandleInternal = getHandle(nodeId, handleType, handleId, nodeLookup, connectionMode);
	if (!fromHandleInternal) return;
	let position = getEventPosition(event, containerBounds);
	let autoPanStarted = false;
	let connection = null;
	let isValid = false;
	let resultHandleDomNode = null;
	function autoPan() {
		if (!autoPanOnConnect || !containerBounds) return;
		const [x, y] = calcAutoPan(position, containerBounds, autoPanSpeed);
		panBy({
			x,
			y
		});
		autoPanId = requestAnimationFrame(autoPan);
	}
	const fromHandle = {
		...fromHandleInternal,
		nodeId,
		type: handleType,
		position: fromHandleInternal.position
	};
	const fromInternalNode = nodeLookup.get(nodeId);
	let previousConnection = {
		inProgress: true,
		isValid: null,
		from: getHandlePosition(fromInternalNode, fromHandle, "left", true),
		fromHandle,
		fromPosition: fromHandle.position,
		fromNode: fromInternalNode,
		to: position,
		toHandle: null,
		toPosition: oppositePosition[fromHandle.position],
		toNode: null,
		pointer: position
	};
	function startConnection() {
		connectionStarted = true;
		updateConnection(previousConnection);
		onConnectStart?.(event, {
			nodeId,
			handleId,
			handleType
		});
	}
	if (dragThreshold === 0) startConnection();
	function onPointerMove(event) {
		if (!connectionStarted) {
			const { x: evtX, y: evtY } = getEventPosition(event);
			const dx = evtX - x;
			const dy = evtY - y;
			if (!(dx * dx + dy * dy > dragThreshold * dragThreshold)) return;
			startConnection();
		}
		if (!getFromHandle() || !fromHandle) {
			onPointerUp(event);
			return;
		}
		const transform = getTransform();
		position = getEventPosition(event, containerBounds);
		closestHandle = getClosestHandle(pointToRendererPoint(position, transform, false, [1, 1]), connectionRadius, nodeLookup, fromHandle);
		if (!autoPanStarted) {
			autoPan();
			autoPanStarted = true;
		}
		const result = isValidHandle(event, {
			handle: closestHandle,
			connectionMode,
			fromNodeId: nodeId,
			fromHandleId: handleId,
			fromType: isTarget ? "target" : "source",
			isValidConnection,
			doc,
			lib,
			flowId,
			nodeLookup
		});
		resultHandleDomNode = result.handleDomNode;
		connection = result.connection;
		isValid = isConnectionValid(!!closestHandle, result.isValid);
		const fromInternalNode = nodeLookup.get(nodeId);
		const from = fromInternalNode ? getHandlePosition(fromInternalNode, fromHandle, "left", true) : previousConnection.from;
		const newConnection = {
			...previousConnection,
			from,
			isValid,
			to: result.toHandle && isValid ? rendererPointToPoint({
				x: result.toHandle.x,
				y: result.toHandle.y
			}, transform) : position,
			toHandle: result.toHandle,
			toPosition: isValid && result.toHandle ? result.toHandle.position : oppositePosition[fromHandle.position],
			toNode: result.toHandle ? nodeLookup.get(result.toHandle.nodeId) : null,
			pointer: position
		};
		updateConnection(newConnection);
		previousConnection = newConnection;
	}
	function onPointerUp(event) {
		if ("touches" in event && event.touches.length > 0) return;
		if (connectionStarted) {
			if ((closestHandle || resultHandleDomNode) && connection && isValid) onConnect?.(connection);
			const { inProgress, ...connectionState } = previousConnection;
			const finalConnectionState = {
				...connectionState,
				to: pointToRendererPoint(previousConnection.to, getTransform()),
				toPosition: previousConnection.toHandle ? previousConnection.toPosition : null
			};
			onConnectEnd?.(event, finalConnectionState);
			if (edgeUpdaterType) onReconnectEnd?.(event, finalConnectionState);
		}
		cancelConnection();
		cancelAnimationFrame(autoPanId);
		autoPanStarted = false;
		isValid = false;
		connection = null;
		resultHandleDomNode = null;
		doc.removeEventListener("mousemove", onPointerMove);
		doc.removeEventListener("mouseup", onPointerUp);
		doc.removeEventListener("touchmove", onPointerMove);
		doc.removeEventListener("touchend", onPointerUp);
	}
	doc.addEventListener("mousemove", onPointerMove);
	doc.addEventListener("mouseup", onPointerUp);
	doc.addEventListener("touchmove", onPointerMove);
	doc.addEventListener("touchend", onPointerUp);
}
function isValidHandle(event, { handle, connectionMode, fromNodeId, fromHandleId, fromType, doc, lib, flowId, isValidConnection = alwaysValid, nodeLookup }) {
	const isTarget = fromType === "target";
	const handleDomNode = handle ? doc.querySelector(`.${lib}-flow__handle[data-id="${flowId}-${handle?.nodeId}-${handle?.id}-${handle?.type}"]`) : null;
	const { x, y } = getEventPosition(event);
	const handleBelow = doc.elementFromPoint(x, y);
	const handleToCheck = handleBelow?.classList.contains(`${lib}-flow__handle`) ? handleBelow : handleDomNode;
	const result = {
		handleDomNode: handleToCheck,
		isValid: false,
		connection: null,
		toHandle: null
	};
	if (handleToCheck) {
		const handleType = getHandleType(void 0, handleToCheck);
		const handleNodeId = handleToCheck.getAttribute("data-nodeid");
		const handleId = handleToCheck.getAttribute("data-handleid");
		const connectable = handleToCheck.classList.contains("connectable");
		const connectableEnd = handleToCheck.classList.contains("connectableend");
		if (!handleNodeId || !handleType) return result;
		const connection = {
			source: isTarget ? handleNodeId : fromNodeId,
			sourceHandle: isTarget ? handleId : fromHandleId,
			target: isTarget ? fromNodeId : handleNodeId,
			targetHandle: isTarget ? fromHandleId : handleId
		};
		result.connection = connection;
		result.isValid = connectable && connectableEnd && (connectionMode === "strict" ? isTarget && handleType === "source" || !isTarget && handleType === "target" : handleNodeId !== fromNodeId || handleId !== fromHandleId) && isValidConnection(connection);
		result.toHandle = getHandle(handleNodeId, handleType, handleId, nodeLookup, connectionMode, true);
	}
	return result;
}
var XYHandle = {
	onPointerDown,
	isValid: isValidHandle
};
function XYMinimap({ domNode, panZoom, getTransform, getViewScale }) {
	const selection = select(domNode);
	function update({ translateExtent, width, height, zoomStep = 1, pannable = true, zoomable = true, inversePan = false }) {
		const zoomHandler = (event) => {
			const sourceEvent = event.sourceEvent;
			if (!isWheelEvent(sourceEvent) || !panZoom) return;
			const transform = getTransform();
			const factor = sourceEvent.ctrlKey && isMacOs() ? 10 : 1;
			const pinchDelta = -sourceEvent.deltaY * (sourceEvent.deltaMode === 1 ? .05 : sourceEvent.deltaMode ? 1 : .002) * zoomStep;
			const nextZoom = transform[2] * Math.pow(2, pinchDelta * factor);
			panZoom.scaleTo(nextZoom);
		};
		let panStart = [0, 0];
		const panStartHandler = (event) => {
			const sourceEvent = event.sourceEvent;
			if (!isPointerEvent(sourceEvent)) return;
			if (sourceEvent.type === "mousedown" || sourceEvent.type === "touchstart") panStart = getTouchPoint(sourceEvent);
		};
		const panHandler = (event) => {
			const transform = getTransform();
			const sourceEvent = event.sourceEvent;
			if (!isPointerEvent(sourceEvent) || isWheelEvent(sourceEvent) || !panZoom) return;
			const panCurrent = getTouchPoint(sourceEvent);
			const panDelta = [panCurrent[0] - panStart[0], panCurrent[1] - panStart[1]];
			panStart = panCurrent;
			const moveScale = getViewScale() * Math.max(transform[2], Math.log(transform[2])) * (inversePan ? -1 : 1);
			const position = {
				x: transform[0] - panDelta[0] * moveScale,
				y: transform[1] - panDelta[1] * moveScale
			};
			const extent = [[0, 0], [width, height]];
			panZoom.setViewportConstrained({
				x: position.x,
				y: position.y,
				zoom: transform[2]
			}, extent, translateExtent);
		};
		const zoomAndPanHandler = zoom().on("start", panStartHandler).on("zoom", pannable ? panHandler : null).on("zoom.wheel", zoomable ? zoomHandler : null);
		selection.call(zoomAndPanHandler, {});
	}
	function destroy() {
		selection.on("zoom", null);
	}
	return {
		update,
		destroy,
		pointer
	};
}
var transformToViewport = (transform) => ({
	x: transform.x,
	y: transform.y,
	zoom: transform.k
});
var viewportToTransform = ({ x, y, zoom }) => identity$1.translate(x, y).scale(zoom);
var isWrappedWithClass = (event, className) => {
	if (!className) return false;
	const target = event.target;
	return target instanceof Element && !!target.closest(`.${className}`);
};
var isLeftClickPan = (panOnDrag) => panOnDrag === true || Array.isArray(panOnDrag) && panOnDrag.includes(0);
var isRightClickPan = (panOnDrag, usedButton) => usedButton === 2 && Array.isArray(panOnDrag) && panOnDrag.includes(2);
var defaultEase = (t) => ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
var getD3Transition = (selection, duration = 0, ease = defaultEase, onEnd = () => {}) => {
	const hasDuration = typeof duration === "number" && duration > 0;
	if (!hasDuration) onEnd(true);
	return hasDuration ? selection.transition().duration(duration).ease(ease).on("end", () => onEnd(true)).on("interrupt cancel", () => onEnd(false)) : selection;
};
var wheelDelta = (event) => {
	const factor = event.ctrlKey && isMacOs() ? 10 : 1;
	return -event.deltaY * (event.deltaMode === 1 ? .05 : event.deltaMode ? 1 : .002) * factor;
};
function createPanOnScrollHandler({ zoomPanValues, noWheelClassName, d3Selection, d3Zoom, panOnScrollMode, panOnScrollSpeed, zoomOnPinch, onPanZoomStart, onPanZoom, onPanZoomEnd }) {
	return (event) => {
		if (isWrappedWithClass(event, noWheelClassName)) {
			if (event.ctrlKey) event.preventDefault();
			return false;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		const currentZoom = d3Selection.property("__zoom").k || 1;
		if (event.ctrlKey && zoomOnPinch) {
			const point = pointer(event);
			const pinchDelta = wheelDelta(event);
			const zoom = currentZoom * Math.pow(2, pinchDelta);
			d3Zoom.scaleTo(d3Selection, zoom, point, event);
			return;
		}
		const deltaNormalize = event.deltaMode === 1 ? 20 : 1;
		let deltaX = panOnScrollMode === "vertical" ? 0 : event.deltaX * deltaNormalize;
		let deltaY = panOnScrollMode === "horizontal" ? 0 : event.deltaY * deltaNormalize;
		if (!isMacOs() && event.shiftKey && panOnScrollMode !== "vertical") {
			deltaX = event.deltaY * deltaNormalize;
			deltaY = 0;
		}
		d3Zoom.translateBy(d3Selection, -(deltaX / currentZoom) * panOnScrollSpeed, -(deltaY / currentZoom) * panOnScrollSpeed, { internal: true });
		const nextViewport = transformToViewport(d3Selection.property("__zoom"));
		clearTimeout(zoomPanValues.panScrollTimeout);
		if (!zoomPanValues.isPanScrolling) {
			zoomPanValues.isPanScrolling = true;
			onPanZoomStart?.(event, nextViewport);
		} else onPanZoom?.(event, nextViewport);
		zoomPanValues.panScrollTimeout = setTimeout(() => {
			onPanZoomEnd?.(event, nextViewport);
			zoomPanValues.isPanScrolling = false;
		}, 150);
	};
}
function createZoomOnScrollHandler({ noWheelClassName, preventScrolling, d3ZoomHandler }) {
	return function(event, d) {
		const isWheel = event.type === "wheel";
		const preventZoom = !preventScrolling && isWheel && !event.ctrlKey;
		const hasNoWheelClass = isWrappedWithClass(event, noWheelClassName);
		if (event.ctrlKey && isWheel && hasNoWheelClass) event.preventDefault();
		if (preventZoom || hasNoWheelClass) return null;
		event.preventDefault();
		d3ZoomHandler.call(this, event, d);
	};
}
function startMove(zoomPanValues, sourceEvent, onPanZoomStart) {
	const pointerDrag = zoomPanValues.pointerDrag;
	if (!pointerDrag || pointerDrag.moveStarted) return;
	pointerDrag.moveStarted = true;
	onPanZoomStart?.(sourceEvent, zoomPanValues.prevViewport);
}
function startPointerDrag(zoomPanValues, sourceEvent, onDraggingChange, onPanZoomStart) {
	const pointerDrag = zoomPanValues.pointerDrag;
	if (!pointerDrag) return;
	startMove(zoomPanValues, sourceEvent, onPanZoomStart);
	pointerDrag.dragging = true;
	if (!pointerDrag.isTouch) onDraggingChange(true);
}
function isPointerMove(sourceEvent) {
	return sourceEvent?.type === "mousemove" || sourceEvent?.type === "touchmove";
}
function getPointerPosition$1(sourceEvent, touchId) {
	if (!("touches" in sourceEvent)) return sourceEvent;
	return Array.from(sourceEvent.touches).find((touch) => touch.identifier === touchId) ?? null;
}
function createPanZoomStartHandler({ zoomPanValues, paneDragThreshold, onDraggingChange, onPanZoomStart }) {
	return (event) => {
		const sourceEvent = event.sourceEvent;
		if (!sourceEvent || sourceEvent.internal) return;
		const viewport = transformToViewport(event.transform);
		zoomPanValues.mouseButton = "button" in sourceEvent ? sourceEvent.button : 0;
		zoomPanValues.isZoomingOrPanning = true;
		zoomPanValues.prevViewport = viewport;
		zoomPanValues.pointerDrag = null;
		const isTouch = sourceEvent.type === "touchstart";
		if (sourceEvent.type === "mousedown" || isTouch) {
			const touch = isTouch ? sourceEvent.touches[0] : null;
			const { clientX, clientY } = touch ?? sourceEvent;
			zoomPanValues.pointerDrag = {
				isTouch,
				touchId: touch?.identifier ?? null,
				startX: clientX,
				startY: clientY,
				startTransform: event.transform,
				thresholdCrossed: false,
				lastMove: null,
				moveStarted: false,
				dragging: false
			};
			if (paneDragThreshold === 0) startPointerDrag(zoomPanValues, sourceEvent, onDraggingChange, onPanZoomStart);
			return;
		}
		onPanZoomStart?.(sourceEvent, viewport);
	};
}
function createPanZoomHandler({ zoomPanValues, d3Selection, paneDragThreshold, onDraggingChange, onTransformChange, onPanZoomStart, onPanZoom }) {
	return (event) => {
		const sourceEvent = event.sourceEvent;
		const pointerDrag = zoomPanValues.pointerDrag;
		if (pointerDrag) {
			const isMove = isPointerMove(sourceEvent) && sourceEvent !== pointerDrag.lastMove;
			if (isMove) pointerDrag.lastMove = sourceEvent;
			if (isMove && !pointerDrag.thresholdCrossed) {
				const position = getPointerPosition$1(sourceEvent, pointerDrag.touchId);
				const isMultiTouch = "touches" in sourceEvent && sourceEvent.touches.length > 1;
				if (!position || isMultiTouch) pointerDrag.thresholdCrossed = true;
				else {
					const dx = position.clientX - pointerDrag.startX;
					const dy = position.clientY - pointerDrag.startY;
					pointerDrag.thresholdCrossed = dx * dx + dy * dy > paneDragThreshold * paneDragThreshold;
				}
			}
			if (!pointerDrag.dragging) {
				if (!isMove) {
					pointerDrag.startTransform = event.transform;
					if (!sourceEvent?.internal) startMove(zoomPanValues, sourceEvent, onPanZoomStart);
				} else if (pointerDrag.thresholdCrossed) startPointerDrag(zoomPanValues, sourceEvent, onDraggingChange, onPanZoomStart);
				else {
					d3Selection.property("__zoom", pointerDrag.startTransform);
					return;
				}
			}
		}
		if (!sourceEvent?.sync) onTransformChange([
			event.transform.x,
			event.transform.y,
			event.transform.k
		]);
		if (onPanZoom && !sourceEvent?.internal && (!pointerDrag || pointerDrag.moveStarted)) onPanZoom?.(event.sourceEvent, transformToViewport(event.transform));
	};
}
function createPanZoomEndHandler({ zoomPanValues, panOnDrag, panOnScroll, onDraggingChange, onPanZoomEnd, onPaneContextMenu }) {
	return (event) => {
		if (event.sourceEvent?.internal) return;
		zoomPanValues.isZoomingOrPanning = false;
		const pointerDrag = zoomPanValues.pointerDrag;
		zoomPanValues.pointerDrag = null;
		if (onPaneContextMenu && isRightClickPan(panOnDrag, zoomPanValues.mouseButton ?? 0) && !pointerDrag?.thresholdCrossed && event.sourceEvent) onPaneContextMenu(event.sourceEvent);
		if (pointerDrag && !pointerDrag.moveStarted) return;
		onDraggingChange(false);
		if (onPanZoomEnd) {
			const viewport = transformToViewport(event.transform);
			zoomPanValues.prevViewport = viewport;
			clearTimeout(zoomPanValues.timerId);
			zoomPanValues.timerId = setTimeout(() => {
				onPanZoomEnd?.(event.sourceEvent, viewport);
			}, panOnScroll ? 150 : 0);
		}
	};
}
function createFilter({ panActivationKeyPressed, zoomActivationKeyPressed, zoomOnScroll, zoomOnPinch, panOnDrag, panOnScroll, zoomOnDoubleClick, userSelectionActive, noWheelClassName, noPanClassName, lib, connectionInProgress }) {
	return (event) => {
		const zoomScroll = zoomActivationKeyPressed || zoomOnScroll;
		const pinchZoom = zoomOnPinch && event.ctrlKey;
		const isWheelEvent = event.type === "wheel";
		if ((panOnDrag === true || Array.isArray(panOnDrag) && panOnDrag.includes(1)) && isMouseEvent(event) && event.button === 1 && event.type === "mousedown" && (isWrappedWithClass(event, `${lib}-flow__node`) || isWrappedWithClass(event, `${lib}-flow__edge`) || isWrappedWithClass(event, `${lib}-flow__selection`) || isWrappedWithClass(event, `${lib}-flow__nodesselection`))) return true;
		if (!panOnDrag && !zoomScroll && !panOnScroll && !zoomOnDoubleClick && !zoomOnPinch) return false;
		if (userSelectionActive) return false;
		if (connectionInProgress && !isWheelEvent) return false;
		if (isWrappedWithClass(event, noWheelClassName) && isWheelEvent) return false;
		if (isWrappedWithClass(event, noPanClassName) && (!isWheelEvent || panOnScroll && isWheelEvent && !zoomActivationKeyPressed)) return false;
		if (!zoomOnPinch && event.ctrlKey && isWheelEvent) return false;
		if (!zoomOnPinch && isTouchEvent(event) && event.type === "touchstart" && event.touches.length > 1) {
			event.preventDefault();
			return false;
		}
		if (!zoomScroll && !panOnScroll && !pinchZoom && isWheelEvent) return false;
		if (!panOnDrag && (event.type === "mousedown" || event.type === "touchstart")) return false;
		if (Array.isArray(panOnDrag) && isMouseEvent(event) && event.type === "mousedown" && !panOnDrag.includes(event.button)) return false;
		const button = isMouseEvent(event) ? event.button : 0;
		const buttonAllowed = Array.isArray(panOnDrag) && panOnDrag.includes(button) || button <= 1;
		return (!event.ctrlKey || isWheelEvent || panActivationKeyPressed) && buttonAllowed;
	};
}
function XYPanZoom({ domNode, minZoom, maxZoom, translateExtent, viewport, onPanZoom, onPanZoomStart, onPanZoomEnd, onDraggingChange }) {
	const zoomPanValues = {
		isZoomingOrPanning: false,
		prevViewport: {
			x: 0,
			y: 0,
			zoom: 0
		},
		mouseButton: 0,
		timerId: void 0,
		panScrollTimeout: void 0,
		isPanScrolling: false,
		pointerDrag: null
	};
	const bbox = domNode.getBoundingClientRect();
	let cachedExtent = [[0, 0], [bbox.width, bbox.height]];
	const extentResizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
		const entry = entries[0];
		if (entry?.contentRect) cachedExtent = [[0, 0], [entry.contentRect.width, entry.contentRect.height]];
	}) : null;
	extentResizeObserver?.observe(domNode);
	const d3ZoomInstance = zoom().extent(() => cachedExtent).scaleExtent([minZoom, maxZoom]).translateExtent(translateExtent);
	const d3Selection = select(domNode).call(d3ZoomInstance);
	setViewportConstrained({
		x: viewport.x,
		y: viewport.y,
		zoom: clamp(viewport.zoom, minZoom, maxZoom)
	}, [[0, 0], [bbox.width, bbox.height]], translateExtent);
	const d3ZoomHandler = d3Selection.on("wheel.zoom");
	const d3DblClickZoomHandler = d3Selection.on("dblclick.zoom");
	d3ZoomInstance.wheelDelta(wheelDelta);
	async function setTransform(transform, options) {
		if (d3Selection) return new Promise((resolve) => {
			d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value : zoom$1).transform(getD3Transition(d3Selection, options?.duration, options?.ease, resolve), transform);
		});
		return false;
	}
	function update({ noWheelClassName, noPanClassName, onPaneContextMenu, userSelectionActive, panOnScroll, panOnDrag, panOnScrollMode, panOnScrollSpeed, preventScrolling, zoomOnPinch, zoomOnScroll, zoomOnDoubleClick, panActivationKeyPressed = false, zoomActivationKeyPressed, lib, onTransformChange, connectionInProgress, paneDragThreshold }) {
		if (userSelectionActive && !zoomPanValues.isZoomingOrPanning) d3ZoomInstance.on("zoom", null);
		const isPanOnScroll = panOnScroll && !zoomActivationKeyPressed && !userSelectionActive;
		const dragThreshold = isNumeric(paneDragThreshold) && paneDragThreshold > 0 ? paneDragThreshold : 0;
		d3ZoomInstance.clickDistance(dragThreshold);
		const wheelHandler = isPanOnScroll ? createPanOnScrollHandler({
			zoomPanValues,
			noWheelClassName,
			d3Selection,
			d3Zoom: d3ZoomInstance,
			panOnScrollMode,
			panOnScrollSpeed,
			zoomOnPinch,
			onPanZoomStart,
			onPanZoom,
			onPanZoomEnd
		}) : createZoomOnScrollHandler({
			noWheelClassName,
			preventScrolling,
			d3ZoomHandler
		});
		d3Selection.on("wheel.zoom", wheelHandler, { passive: false });
		const startHandler = createPanZoomStartHandler({
			zoomPanValues,
			paneDragThreshold: dragThreshold,
			onDraggingChange,
			onPanZoomStart
		});
		d3ZoomInstance.on("start", startHandler);
		const panZoomHandler = createPanZoomHandler({
			zoomPanValues,
			d3Selection,
			paneDragThreshold: dragThreshold,
			onPanZoomStart,
			onPanZoom,
			onDraggingChange,
			onTransformChange
		});
		d3ZoomInstance.on("zoom", panZoomHandler);
		const panZoomEndHandler = createPanZoomEndHandler({
			zoomPanValues,
			panOnDrag,
			panOnScroll,
			onPaneContextMenu,
			onPanZoomEnd,
			onDraggingChange
		});
		d3ZoomInstance.on("end", panZoomEndHandler);
		const filter = createFilter({
			panActivationKeyPressed,
			zoomActivationKeyPressed,
			panOnDrag,
			zoomOnScroll,
			panOnScroll,
			zoomOnDoubleClick,
			zoomOnPinch,
			userSelectionActive,
			noPanClassName,
			noWheelClassName,
			lib,
			connectionInProgress
		});
		d3ZoomInstance.filter(filter);
		if (zoomOnDoubleClick) d3Selection.on("dblclick.zoom", d3DblClickZoomHandler);
		else d3Selection.on("dblclick.zoom", null);
	}
	function destroy() {
		d3ZoomInstance.on("zoom", null);
		extentResizeObserver?.disconnect();
	}
	async function setViewportConstrained(viewport, extent, translateExtent) {
		const nextTransform = viewportToTransform(viewport);
		const contrainedTransform = d3ZoomInstance?.constrain()(nextTransform, extent, translateExtent);
		if (contrainedTransform) await setTransform(contrainedTransform);
		return contrainedTransform;
	}
	async function setViewport(viewport, options) {
		return setTransform(viewportToTransform(viewport), options);
	}
	function syncViewport(viewport) {
		if (d3Selection) {
			const nextTransform = viewportToTransform(viewport);
			const currentTransform = d3Selection.property("__zoom");
			if (currentTransform.k !== viewport.zoom || currentTransform.x !== viewport.x || currentTransform.y !== viewport.y) d3ZoomInstance?.transform(d3Selection, nextTransform, null, { sync: true });
		}
	}
	function getViewport() {
		const transform$1 = d3Selection ? transform(d3Selection.node()) : {
			x: 0,
			y: 0,
			k: 1
		};
		return {
			x: transform$1.x,
			y: transform$1.y,
			zoom: transform$1.k
		};
	}
	async function scaleTo(zoom, options) {
		if (d3Selection) return new Promise((resolve) => {
			d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value : zoom$1).scaleTo(getD3Transition(d3Selection, options?.duration, options?.ease, resolve), zoom);
		});
		return false;
	}
	async function scaleBy(factor, options) {
		if (d3Selection) return new Promise((resolve) => {
			d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value : zoom$1).scaleBy(getD3Transition(d3Selection, options?.duration, options?.ease, resolve), factor);
		});
		return false;
	}
	function setScaleExtent(scaleExtent) {
		d3ZoomInstance?.scaleExtent(scaleExtent);
	}
	function setTranslateExtent(translateExtent) {
		d3ZoomInstance?.translateExtent(translateExtent);
	}
	return {
		update,
		destroy,
		setViewport,
		setViewportConstrained,
		getViewport,
		scaleTo,
		scaleBy,
		setScaleExtent,
		setTranslateExtent,
		syncViewport
	};
}
/**
* Used to determine the variant of the resize control
*
* @public
*/
var ResizeControlVariant = /* @__PURE__ */ function(ResizeControlVariant) {
	ResizeControlVariant["Line"] = "line";
	ResizeControlVariant["Handle"] = "handle";
	return ResizeControlVariant;
}({});
/**
* Get all connecting edges for a given set of nodes
* @param width - new width of the node
* @param prevWidth - previous width of the node
* @param height - new height of the node
* @param prevHeight - previous height of the node
* @param affectsX - whether to invert the resize direction for the x axis
* @param affectsY - whether to invert the resize direction for the y axis
* @returns array of two numbers representing the direction of the resize for each axis, 0 = no change, 1 = increase, -1 = decrease
*/
function getResizeDirection({ width, prevWidth, height, prevHeight, affectsX, affectsY }) {
	const deltaWidth = width - prevWidth;
	const deltaHeight = height - prevHeight;
	const direction = [deltaWidth > 0 ? 1 : deltaWidth < 0 ? -1 : 0, deltaHeight > 0 ? 1 : deltaHeight < 0 ? -1 : 0];
	if (deltaWidth && affectsX) direction[0] = direction[0] * -1;
	if (deltaHeight && affectsY) direction[1] = direction[1] * -1;
	return direction;
}
/**
* Parses the control position that is being dragged to dimensions that are being resized
* @param controlPosition - position of the control that is being dragged
* @returns isHorizontal, isVertical, affectsX, affectsY,
*/
function getControlDirection(controlPosition) {
	return {
		isHorizontal: controlPosition.includes("right") || controlPosition.includes("left"),
		isVertical: controlPosition.includes("bottom") || controlPosition.includes("top"),
		affectsX: controlPosition.includes("left"),
		affectsY: controlPosition.includes("top")
	};
}
function getLowerExtentClamp(lowerExtent, lowerBound) {
	return Math.max(0, lowerBound - lowerExtent);
}
function getUpperExtentClamp(upperExtent, upperBound) {
	return Math.max(0, upperExtent - upperBound);
}
function getSizeClamp(size, minSize, maxSize) {
	return Math.max(0, minSize - size, size - maxSize);
}
function xor(a, b) {
	return a ? !b : b;
}
/**
* Calculates new width & height and x & y of node after resize based on pointer position
* @description - Buckle up, this is a chunky one... If you want to determine the new dimensions of a node after a resize,
* you have to account for all possible restrictions: min/max width/height of the node, the maximum extent the node is allowed
* to move in (in this case: resize into) determined by the parent node, the minimal extent determined by child nodes
* with expandParent or extent: 'parent' set and oh yeah, these things also have to work with keepAspectRatio!
* The way this is done is by determining how much each of these restricting actually restricts the resize and then applying the
* strongest restriction. Because the resize affects x, y and width, height and width, height of a opposing side with keepAspectRatio,
* the resize amount is always kept in distX & distY amount (the distance in mouse movement)
* Instead of clamping each value, we first calculate the biggest 'clamp' (for the lack of a better name) and then apply it to all values.
* To complicate things nodeOrigin has to be taken into account as well. This is done by offsetting the nodes as if their origin is [0, 0],
* then calculating the restrictions as usual
* @param startValues - starting values of resize
* @param controlDirection - dimensions affected by the resize
* @param pointerPosition - the current pointer position corrected for snapping
* @param boundaries - minimum and maximum dimensions of the node
* @param keepAspectRatio - prevent changes of asprect ratio
* @returns x, y, width and height of the node after resize
*/
function getDimensionsAfterResize(startValues, controlDirection, pointerPosition, boundaries, keepAspectRatio, nodeOrigin, extent, childExtent) {
	let { affectsX, affectsY } = controlDirection;
	const { isHorizontal, isVertical } = controlDirection;
	const isDiagonal = isHorizontal && isVertical;
	const { xSnapped, ySnapped } = pointerPosition;
	const { minWidth, maxWidth, minHeight, maxHeight } = boundaries;
	const { x: startX, y: startY, width: startWidth, height: startHeight, aspectRatio } = startValues;
	let distX = Math.floor(isHorizontal ? xSnapped - startValues.pointerX : 0);
	let distY = Math.floor(isVertical ? ySnapped - startValues.pointerY : 0);
	const newWidth = startWidth + (affectsX ? -distX : distX);
	const newHeight = startHeight + (affectsY ? -distY : distY);
	const originOffsetX = -nodeOrigin[0] * startWidth;
	const originOffsetY = -nodeOrigin[1] * startHeight;
	let clampX = getSizeClamp(newWidth, minWidth, maxWidth);
	let clampY = getSizeClamp(newHeight, minHeight, maxHeight);
	if (extent) {
		let xExtentClamp = 0;
		let yExtentClamp = 0;
		if (affectsX && distX < 0) xExtentClamp = getLowerExtentClamp(startX + distX + originOffsetX, extent[0][0]);
		else if (!affectsX && distX > 0) xExtentClamp = getUpperExtentClamp(startX + newWidth + originOffsetX, extent[1][0]);
		if (affectsY && distY < 0) yExtentClamp = getLowerExtentClamp(startY + distY + originOffsetY, extent[0][1]);
		else if (!affectsY && distY > 0) yExtentClamp = getUpperExtentClamp(startY + newHeight + originOffsetY, extent[1][1]);
		clampX = Math.max(clampX, xExtentClamp);
		clampY = Math.max(clampY, yExtentClamp);
	}
	if (childExtent) {
		let xExtentClamp = 0;
		let yExtentClamp = 0;
		if (affectsX && distX > 0) xExtentClamp = getUpperExtentClamp(startX + distX, childExtent[0][0]);
		else if (!affectsX && distX < 0) xExtentClamp = getLowerExtentClamp(startX + newWidth, childExtent[1][0]);
		if (affectsY && distY > 0) yExtentClamp = getUpperExtentClamp(startY + distY, childExtent[0][1]);
		else if (!affectsY && distY < 0) yExtentClamp = getLowerExtentClamp(startY + newHeight, childExtent[1][1]);
		clampX = Math.max(clampX, xExtentClamp);
		clampY = Math.max(clampY, yExtentClamp);
	}
	if (keepAspectRatio) {
		if (isHorizontal) {
			const aspectHeightClamp = getSizeClamp(newWidth / aspectRatio, minHeight, maxHeight) * aspectRatio;
			clampX = Math.max(clampX, aspectHeightClamp);
			if (extent) {
				const aspectExtentClamp = !affectsX && !affectsY || affectsX && !affectsY && isDiagonal ? getUpperExtentClamp(startY + originOffsetY + newWidth / aspectRatio, extent[1][1]) * aspectRatio : getLowerExtentClamp(startY + originOffsetY + (affectsX ? distX : -distX) / aspectRatio, extent[0][1]) * aspectRatio;
				clampX = Math.max(clampX, aspectExtentClamp);
			}
			if (childExtent) {
				const aspectExtentClamp = !affectsX && !affectsY || affectsX && !affectsY && isDiagonal ? getLowerExtentClamp(startY + newWidth / aspectRatio, childExtent[1][1]) * aspectRatio : getUpperExtentClamp(startY + (affectsX ? distX : -distX) / aspectRatio, childExtent[0][1]) * aspectRatio;
				clampX = Math.max(clampX, aspectExtentClamp);
			}
		}
		if (isVertical) {
			const aspectWidthClamp = getSizeClamp(newHeight * aspectRatio, minWidth, maxWidth) / aspectRatio;
			clampY = Math.max(clampY, aspectWidthClamp);
			if (extent) {
				const aspectExtentClamp = !affectsX && !affectsY || affectsY && !affectsX && isDiagonal ? getUpperExtentClamp(startX + newHeight * aspectRatio + originOffsetX, extent[1][0]) / aspectRatio : getLowerExtentClamp(startX + (affectsY ? distY : -distY) * aspectRatio + originOffsetX, extent[0][0]) / aspectRatio;
				clampY = Math.max(clampY, aspectExtentClamp);
			}
			if (childExtent) {
				const aspectExtentClamp = !affectsX && !affectsY || affectsY && !affectsX && isDiagonal ? getLowerExtentClamp(startX + newHeight * aspectRatio, childExtent[1][0]) / aspectRatio : getUpperExtentClamp(startX + (affectsY ? distY : -distY) * aspectRatio, childExtent[0][0]) / aspectRatio;
				clampY = Math.max(clampY, aspectExtentClamp);
			}
		}
	}
	distY = distY + (distY < 0 ? clampY : -clampY);
	distX = distX + (distX < 0 ? clampX : -clampX);
	if (keepAspectRatio) {
		if (isDiagonal) {
			if (newWidth > newHeight * aspectRatio) distY = (xor(affectsX, affectsY) ? -distX : distX) / aspectRatio;
			else distX = (xor(affectsX, affectsY) ? -distY : distY) * aspectRatio;
		} else if (isHorizontal) {
			distY = distX / aspectRatio;
			affectsY = affectsX;
		} else {
			distX = distY * aspectRatio;
			affectsX = affectsY;
		}
	}
	const x = affectsX ? startX + distX : startX;
	const y = affectsY ? startY + distY : startY;
	return {
		width: startWidth + (affectsX ? -distX : distX),
		height: startHeight + (affectsY ? -distY : distY),
		x: nodeOrigin[0] * distX * (!affectsX ? 1 : -1) + x,
		y: nodeOrigin[1] * distY * (!affectsY ? 1 : -1) + y
	};
}
var initPrevValues = {
	width: 0,
	height: 0,
	x: 0,
	y: 0
};
var initStartValues = {
	...initPrevValues,
	pointerX: 0,
	pointerY: 0,
	aspectRatio: 1
};
function nodeToChildExtent(child, parent, parentPosition) {
	const x = parentPosition.x + child.internals.positionAbsolute.x - parent.internals.positionAbsolute.x;
	const y = parentPosition.y + child.internals.positionAbsolute.y - parent.internals.positionAbsolute.y;
	const width = child.measured.width ?? 0;
	const height = child.measured.height ?? 0;
	return [[x, y], [x + width, y + height]];
}
function XYResizer({ domNode, nodeId, getStoreItems, onChange, onEnd }) {
	const selection = select(domNode);
	let params = {
		controlDirection: getControlDirection("bottom-right"),
		boundaries: {
			minWidth: 0,
			minHeight: 0,
			maxWidth: Number.MAX_VALUE,
			maxHeight: Number.MAX_VALUE
		},
		resizeDirection: void 0,
		keepAspectRatio: false
	};
	function update({ controlPosition, boundaries, keepAspectRatio, resizeDirection, onResizeStart, onResize, onResizeEnd, shouldResize }) {
		let prevValues = { ...initPrevValues };
		let startValues = { ...initStartValues };
		params = {
			boundaries,
			resizeDirection,
			keepAspectRatio,
			controlDirection: getControlDirection(controlPosition)
		};
		let node = void 0;
		let containerBounds = null;
		let childNodes = [];
		let parentNode = void 0;
		let nodeExtent = void 0;
		let childExtent = void 0;
		const dragHandler = drag().on("start", (event) => {
			const { nodeLookup, transform, snapGrid, snapToGrid, nodeOrigin, paneDomNode } = getStoreItems();
			node = nodeLookup.get(nodeId);
			if (!node) return;
			containerBounds = paneDomNode?.getBoundingClientRect() ?? null;
			const { xSnapped, ySnapped } = getPointerPosition(event.sourceEvent, {
				transform,
				snapGrid,
				snapToGrid,
				containerBounds
			});
			const width = node.measured.width ?? 0;
			const height = node.measured.height ?? 0;
			const origin = node.origin ?? nodeOrigin;
			const parentPosition = node.parentId ? nodeLookup.get(node.parentId)?.internals.positionAbsolute : void 0;
			prevValues = {
				width,
				height,
				x: node.internals.positionAbsolute.x - (parentPosition?.x ?? 0) + origin[0] * width,
				y: node.internals.positionAbsolute.y - (parentPosition?.y ?? 0) + origin[1] * height
			};
			startValues = {
				...prevValues,
				pointerX: xSnapped,
				pointerY: ySnapped,
				aspectRatio: prevValues.width / prevValues.height
			};
			parentNode = void 0;
			nodeExtent = isCoordinateExtent(node.extent) ? node.extent : void 0;
			if (node.parentId && (node.extent === "parent" || node.expandParent)) parentNode = nodeLookup.get(node.parentId);
			if (parentNode && node.extent === "parent") nodeExtent = [[0, 0], [parentNode.measured.width, parentNode.measured.height]];
			childNodes = [];
			childExtent = void 0;
			for (const [childId, child] of nodeLookup) if (child.parentId === nodeId) {
				childNodes.push({
					id: childId,
					position: { ...child.position },
					extent: child.extent
				});
				if (child.extent === "parent" || child.expandParent) {
					const extent = nodeToChildExtent(child, node, prevValues);
					if (childExtent) childExtent = [[Math.min(extent[0][0], childExtent[0][0]), Math.min(extent[0][1], childExtent[0][1])], [Math.max(extent[1][0], childExtent[1][0]), Math.max(extent[1][1], childExtent[1][1])]];
					else childExtent = extent;
				}
			}
			onResizeStart?.(event, { ...prevValues });
		}).on("drag", (event) => {
			const { transform, snapGrid, snapToGrid, nodeOrigin: storeNodeOrigin } = getStoreItems();
			const pointerPosition = getPointerPosition(event.sourceEvent, {
				transform,
				snapGrid,
				snapToGrid,
				containerBounds
			});
			const childChanges = [];
			if (!node) return;
			const { x: prevX, y: prevY, width: prevWidth, height: prevHeight } = prevValues;
			const change = {};
			const nodeOrigin = node.origin ?? storeNodeOrigin;
			const { width, height, x, y } = getDimensionsAfterResize(startValues, params.controlDirection, pointerPosition, params.boundaries, params.keepAspectRatio, nodeOrigin, nodeExtent, childExtent);
			const isWidthChange = width !== prevWidth;
			const isHeightChange = height !== prevHeight;
			const isXPosChange = x !== prevX && isWidthChange;
			const isYPosChange = y !== prevY && isHeightChange;
			if (!isXPosChange && !isYPosChange && !isWidthChange && !isHeightChange) return;
			const lastValid = {
				prevValues: { ...prevValues },
				startX: startValues.x,
				startY: startValues.y,
				childNodes: childNodes.map((child) => ({
					...child,
					position: { ...child.position }
				}))
			};
			if (isXPosChange || isYPosChange || nodeOrigin[0] === 1 || nodeOrigin[1] === 1) {
				change.x = isXPosChange ? x : prevValues.x;
				change.y = isYPosChange ? y : prevValues.y;
				prevValues.x = change.x;
				prevValues.y = change.y;
				if (childNodes.length > 0) {
					const xChange = x - prevX;
					const yChange = y - prevY;
					for (const childNode of childNodes) {
						childNode.position = {
							x: childNode.position.x - xChange + nodeOrigin[0] * (width - prevWidth),
							y: childNode.position.y - yChange + nodeOrigin[1] * (height - prevHeight)
						};
						childChanges.push(childNode);
					}
				}
			}
			if (isWidthChange || isHeightChange) {
				change.width = isWidthChange && (!params.resizeDirection || params.resizeDirection === "horizontal") ? width : prevValues.width;
				change.height = isHeightChange && (!params.resizeDirection || params.resizeDirection === "vertical") ? height : prevValues.height;
				prevValues.width = change.width;
				prevValues.height = change.height;
			}
			if (parentNode && node.expandParent) {
				const xLimit = nodeOrigin[0] * (change.width ?? 0);
				if (change.x && change.x < xLimit) {
					prevValues.x = xLimit;
					startValues.x = startValues.x - (change.x - xLimit);
				}
				const yLimit = nodeOrigin[1] * (change.height ?? 0);
				if (change.y && change.y < yLimit) {
					prevValues.y = yLimit;
					startValues.y = startValues.y - (change.y - yLimit);
				}
			}
			const direction = getResizeDirection({
				width: prevValues.width,
				prevWidth,
				height: prevValues.height,
				prevHeight,
				affectsX: params.controlDirection.affectsX,
				affectsY: params.controlDirection.affectsY
			});
			const nextValues = {
				...prevValues,
				direction
			};
			if (shouldResize?.(event, nextValues) === false) {
				prevValues = lastValid.prevValues;
				startValues.x = lastValid.startX;
				startValues.y = lastValid.startY;
				childNodes.forEach((child, i) => {
					child.position = lastValid.childNodes[i].position;
				});
				return;
			}
			onResize?.(event, nextValues);
			onChange(change, childChanges);
		}).on("end", (event) => {
			onResizeEnd?.(event, { ...prevValues });
			onEnd?.({ ...prevValues });
		});
		selection.call(dragHandler);
	}
	function destroy() {
		selection.on(".drag", null);
	}
	return {
		update,
		destroy
	};
}
function applyNodeChanges(nodes, nodeChanges) {
	return applyChanges(nodes, nodeChanges, applyNodeChange);
}
function applyEdgeChanges(edges, edgeChanges) {
	return applyChanges(edges, edgeChanges, applyEdgeChange);
}
function applyChanges(previousElements, changes, applyChange) {
	const newElements = [];
	const addedElements = changes.getNewElements();
	const addedIds = new Set(addedElements.map((element) => element.id));
	let isPreviousElement;
	for (const elements of [previousElements, addedElements]) {
		isPreviousElement = !isPreviousElement;
		elementsLoop: for (const element of elements) {
			if (!isPreviousElement && !addedIds.has(element.id)) continue;
			const elementChanges = changes.getForElement(element.id);
			if (!elementChanges.length) {
				newElements.push(element);
				addedIds.delete(element.id);
				continue;
			}
			let updatedElement = { ...element };
			for (const change of elementChanges) switch (change.type) {
				case "remove":
					addedIds.delete(element.id);
					continue elementsLoop;
				case "replace":
					updatedElement = { ...change.item };
					continue;
				default: applyChange(updatedElement, change);
			}
			newElements.push(updatedElement);
			addedIds.delete(element.id);
		}
	}
	return newElements;
}
function applyNodeChange(node, change) {
	switch (change.type) {
		case "select":
			node.selected = change.selected;
			break;
		case "position":
			if (typeof change.position !== "undefined") node.position = change.position;
			if (typeof change.dragging !== "undefined") node.dragging = change.dragging;
			break;
		case "dimensions":
			if (typeof change.dimensions !== "undefined") {
				node.measured = { ...change.dimensions };
				if (change.setAttributes === true || change.setAttributes === "width") node.width = change.dimensions.width;
				if (change.setAttributes === true || change.setAttributes === "height") node.height = change.dimensions.height;
			}
			if (typeof change.resizing === "boolean") node.resizing = change.resizing;
			break;
		case "update":
			Object.assign(node, change.item);
			break;
		case "data":
			node.data = change.replace ? change.data : {
				...node.data,
				...change.data
			};
			break;
		default: return;
	}
}
function applyEdgeChange(edge, change) {
	switch (change.type) {
		case "select":
			edge.selected = change.selected;
			break;
		case "update":
			Object.assign(edge, change.item);
			break;
		case "data":
			edge.data = change.replace ? change.data : {
				...edge.data,
				...change.data
			};
			break;
		default: return;
	}
}
function selectionChange(id, selected) {
	return {
		id,
		type: "select",
		selected
	};
}
function positionChange(id, position) {
	return {
		id,
		type: "position",
		position
	};
}
function dimensionChange(id, dimensions) {
	return {
		id,
		type: "dimensions",
		dimensions
	};
}
function removeChange(id) {
	return {
		id,
		type: "remove"
	};
}
function addChange(item) {
	return {
		id: item.id,
		item,
		type: "add"
	};
}
function replaceChange(item) {
	return {
		id: item.id,
		item,
		type: "replace"
	};
}
function _typeof(o) {
	"@babel/helpers - typeof";
	return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
		return typeof o;
	} : function(o) {
		return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
	}, _typeof(o);
}
function toPrimitive(t, e) {
	if ("object" != _typeof(t) || !t) return t;
	var r;
	if ("undefined" != typeof Symbol && void 0 !== (r = t[Symbol.toPrimitive])) {
		var i = r.call(t, e || "default");
		if ("object" != _typeof(i)) return i;
		throw new TypeError("@@toPrimitive must return a primitive value.");
	}
	return ("string" === e ? String : Number)(t);
}
function toPropertyKey(t) {
	var i = toPrimitive(t, "string");
	return "symbol" == _typeof(i) ? i : i + "";
}
function _defineProperty(e, r, t) {
	return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
		value: t,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[r] = t, e;
}
var _Symbol$iterator = Symbol.iterator;
/**
* Tracks a batch of changes to be applied to either edges or nodes
* TODO: include a way to split ephemeral dimension changes to split
*
* @example
* ```ts
* const changes = new NodeChanges();
* changes.add({ id: '1', type: 'position', position: { x: 10, y: 20 } });
* const nextNodes = changes.applyTo(nodes);
* ```
*/
var Changeset = class {
	constructor(applyChanges) {
		this.applyChanges = applyChanges;
		_defineProperty(this, "changeTypes", {});
		_defineProperty(this, "changeMap", /* @__PURE__ */ new Map());
		_defineProperty(this, "addChanges", /* @__PURE__ */ new Map());
	}
	/**
	* Queues a change for an element.
	*
	* @example
	* ```ts
	* changes.add(selectionChange('1', true));
	* changes.add(positionChnage('1', { x: 0, y: 0 }));
	* ```
	*/
	add(change) {
		const newChanges = Array.isArray(change) ? change : [change];
		for (const change of newChanges) {
			this.changeTypes[change.type] = true;
			if (change.type === "add") {
				this.addChanges.set(change.id, change);
				continue;
			}
			const changes = this.changeMap.get(change.id);
			if (changes) changes.push(change);
			else this.changeMap.set(change.id, [change]);
		}
	}
	/**
	* Removes a specific change by object reference
	*
	* @example
	* ```ts
	* const change = { id: '1', type: 'select', selected: true };
	* changes.add(change);
	* changes.remove(change);
	* ```
	*/
	remove(change) {
		if (change.type === "add") {
			if (this.addChanges.get(change.id) === change) this.addChanges.delete(change.id);
			return;
		}
		const changes = this.changeMap.get(change.id);
		if (!changes) return;
		const index = changes.indexOf(change);
		if (index < 0) return;
		if (changes.length === 1) {
			this.changeMap.delete(change.id);
			return;
		}
		changes.splice(index, 1);
	}
	/**
	* Returns all queued changes for an element.
	*
	* @example
	* ```ts
	* const elementChanges = changes.getForElement('1');
	* ```
	*/
	getForElement(elementId) {
		return this.changeMap.get(elementId) || [];
	}
	/**
	* Clears every change for an element.
	*
	* @example
	* ```ts
	* changes.removeForElement('1');
	* ```
	*/
	removeForElement(elementId) {
		this.changeMap.delete(elementId);
		this.addChanges.delete(elementId);
	}
	/**
	* Clears all queued changes.
	*
	* @example
	* ```ts
	* changes.clear();
	* ```
	*/
	clear() {
		this.changeTypes = {};
		this.changeMap.clear();
		this.addChanges.clear();
	}
	/**
	* Returns true if there are no queued changes.
	*
	* @example
	* ```ts
	* if (changes.isEmpty()) return;
	* ```
	*/
	isEmpty() {
		return this.changeMap.size === 0 && this.addChanges.size === 0;
	}
	/**
	* Iterates over all queued changes.
	*
	* @example
	* ```ts
	* for (const change of changes) {
	*   console.log(change.type, change.id);
	* }
	* ```
	*/
	*[_Symbol$iterator]() {
		yield* this.addChanges.values();
		for (const changes of this.changeMap.values()) yield* changes;
	}
	/**
	* Returns all elements that are added by this changeset.
	*
	* @example
	* ```ts
	* const newElements = changes.getNewElements();
	* ```
	*/
	getNewElements() {
		const newElements = [];
		for (const change of this.addChanges.values()) newElements.push(change.item);
		return newElements;
	}
	/**
	* Returns all queued changes as a flat array.
	*
	* @example
	* ```ts
	* const list = changes.toArray();
	* ```
	*/
	toArray() {
		const array = [];
		for (const change of this.addChanges.values()) array.push(change);
		for (const changes of this.changeMap.values()) for (const change of changes) array.push(change);
		return array;
	}
	/**
	* Returns all changes of a given type (e.g. `'position'`, `'select'`).
	*
	* @example
	* ```ts
	* const positionChanges = changes.getByType('position');
	* ```
	*/
	getByType(changeType) {
		if (this.changeTypes[changeType]) {
			if (changeType === "add") return Array.from(this.addChanges.values());
			const changesOfType = [];
			for (const changes of this.changeMap.values()) for (const change of changes) if (change.type === changeType) changesOfType.push(change);
			return changesOfType;
		}
		return [];
	}
	/**
	* Applies the queued changes to an elements array and returns the result.
	*
	* @example
	* ```ts
	* const nextElements = changes.applyTo(elements);
	* ```
	*/
	applyTo(elements) {
		return this.applyChanges(elements, this);
	}
};
/**
* Defines a batch of changes to be applied to nodes
*
* @example
* ```ts
* const changes = new NodeChanges();
* changes.add({ id: '1', type: 'position', position: { x: 10, y: 20 } });
* const nextNodes = changes.applyTo(nodes);
* ```
*/
var NodeChangeset = class extends Changeset {
	constructor(changes) {
		super(applyNodeChanges);
		if (changes) this.add(changes);
	}
	/**
	* Returns all queued changes for a node.
	*
	* @example
	* ```ts
	* const nodeChanges = changes.getForNode('1');
	* ```
	*/
	getForNode(nodeId) {
		return this.getForElement(nodeId);
	}
	/**
	* Clears every change for a node.
	*
	* @example
	* ```ts
	* changes.removeForNode('1');
	* ```
	*/
	removeForNode(nodeId) {
		this.removeForElement(nodeId);
	}
	/**
	* Returns all nodes that are added by this changeset.
	*
	* @example
	* ```ts
	* const newNodes = changes.getNewNodes();
	* ```
	*/
	getNewNodes() {
		return this.getNewElements();
	}
};
/**
* Defines a batch of changes to be applied to the edges
*
* @example
* ```ts
* const changes = new EdgeChanges();
* changes.add({ id: 'e1', type: 'select', selected: true });
* const nextEdges = changes.applyTo(edges);
* ```
*/
var EdgeChangeset = class extends Changeset {
	constructor(changes) {
		super(applyEdgeChanges);
		if (changes) this.add(changes);
	}
	/**
	* Returns all queued changes for an edge.
	*
	* @example
	* ```ts
	* const edgeChanges = changes.getForEdge('e1');
	* ```
	*/
	getForEdge(edgeId) {
		return this.getForElement(edgeId);
	}
	/**
	* Clears every change for an edge.
	*
	* @example
	* ```ts
	* changes.removeForEdge('e1');
	* ```
	*/
	removeForEdge(edgeId) {
		this.removeForElement(edgeId);
	}
	/**
	* Returns all edges that are added by this changeset.
	*
	* @example
	* ```ts
	* const newEdges = changes.getNewEdges();
	* ```
	*/
	getNewEdges() {
		return this.getNewElements();
	}
};
function getSelectionChanges(items, selectedIds = /* @__PURE__ */ new Set()) {
	const changes = [];
	for (const [, item] of items) {
		const willBeSelected = selectedIds.has(item.id);
		if (!(item.selected === void 0 && !willBeSelected) && item.selected !== willBeSelected) changes.push(selectionChange(item.id, willBeSelected));
	}
	return changes;
}
// node_modules/zustand/esm/vanilla.mjs
var createStoreImpl = (createState) => {
	let state;
	const listeners = /* @__PURE__ */ new Set();
	const setState = (partial, replace) => {
		const nextState = typeof partial === "function" ? partial(state) : partial;
		if (!Object.is(nextState, state)) {
			const previousState = state;
			state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
			listeners.forEach((listener) => listener(state, previousState));
		}
	};
	const getState = () => state;
	const getInitialState = () => initialState;
	const subscribe = (listener) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	};
	const api = {
		setState,
		getState,
		getInitialState,
		subscribe
	};
	const initialState = state = createState(setState, getState, api);
	return api;
};
var createStore = ((createState) => createState ? createStoreImpl(createState) : createStoreImpl);
// node_modules/zustand/esm/react.mjs
var identity = (arg) => arg;
function useStore(api, selector = identity) {
	const slice = import_react.useSyncExternalStore(api.subscribe, import_react.useCallback(() => selector(api.getState()), [api, selector]), () => selector(api.getInitialState()));
	import_react.useDebugValue(slice);
	return slice;
}
// node_modules/zustand/esm/vanilla/shallow.mjs
var isIterable = (obj) => Symbol.iterator in obj;
var hasIterableEntries = (value) => "entries" in value;
var compareEntries = (valueA, valueB) => {
	const mapA = valueA instanceof Map ? valueA : new Map(valueA.entries());
	const mapB = valueB instanceof Map ? valueB : new Map(valueB.entries());
	if (mapA.size !== mapB.size) return false;
	for (const [key, value] of mapA) if (!mapB.has(key) || !Object.is(value, mapB.get(key))) return false;
	return true;
};
var compareIterables = (valueA, valueB) => {
	const iteratorA = valueA[Symbol.iterator]();
	const iteratorB = valueB[Symbol.iterator]();
	let nextA = iteratorA.next();
	let nextB = iteratorB.next();
	while (!nextA.done && !nextB.done) {
		if (!Object.is(nextA.value, nextB.value)) return false;
		nextA = iteratorA.next();
		nextB = iteratorB.next();
	}
	return !!nextA.done && !!nextB.done;
};
function shallow(valueA, valueB) {
	if (Object.is(valueA, valueB)) return true;
	if (typeof valueA !== "object" || valueA === null || typeof valueB !== "object" || valueB === null) return false;
	if (Object.getPrototypeOf(valueA) !== Object.getPrototypeOf(valueB)) return false;
	if (isIterable(valueA) && isIterable(valueB)) {
		if (hasIterableEntries(valueA) && hasIterableEntries(valueB)) return compareEntries(valueA, valueB);
		return compareIterables(valueA, valueB);
	}
	return compareEntries({ entries: () => Object.entries(valueA) }, { entries: () => Object.entries(valueB) });
}
// node_modules/@xyflow/react/dist/index.js
var import_jsx_runtime = require_jsx_runtime();
require_react_dom();
var vt = (0, import_react.createContext)(null);
var yt = vt.Provider;
function bt(e, t) {
	if (Object.is(e, t)) return !0;
	if (typeof e != `object` || !e || typeof t != `object` || !t) return !1;
	if (e instanceof Map && t instanceof Map) {
		if (e.size !== t.size) return !1;
		for (let [n, r] of e) if (!t.has(n) || !Object.is(r, t.get(n))) return !1;
		return !0;
	}
	if (e instanceof Set && t instanceof Set) {
		if (e.size !== t.size) return !1;
		for (let n of e) if (!t.has(n)) return !1;
		return !0;
	}
	let n = Object.keys(e);
	if (n.length !== Object.keys(t).length) return !1;
	for (let r of n) if (!Object.prototype.hasOwnProperty.call(t, r) || !Object.is(e[r], t[r])) return !1;
	return !0;
}
function xt(t) {
	let n = (0, import_dist.c)(2), r = (0, import_react.useRef)(void 0), i;
	return n[0] === t ? i = n[1] : (i = (e) => {
		let n = t(e);
		return bt(r.current, n) ? r.current : r.current = n;
	}, n[0] = t, n[1] = i), i;
}
var St = (e) => e;
var Ct = errorMessages.error001(`react`);
function Q(e) {
	let t = e === void 0 ? St : e, { optionsStore: n } = $();
	return useStore(n, t);
}
function $() {
	let e = (0, import_react.useContext)(vt);
	if (e === null) throw Error(Ct);
	return e;
}
function wt(e) {
	let t = e === void 0 ? St : e;
	return useStore($().viewportStore, t);
}
function Tt(e) {
	let t = e === void 0 ? St : e;
	return useStore($().connectionStore, t);
}
function Et(e) {
	let t = e === void 0 ? St : e;
	return useStore($().nodesStore, t);
}
function Dt(e) {
	let t = e === void 0 ? St : e;
	return useStore($().edgesStore, t);
}
function Ot(e) {
	let t = e === void 0 ? St : e;
	return useStore($().selectionStore, t);
}
function kt(t, n) {
	let r = (0, import_dist.c)(3), i = (0, import_react.useRef)(), a;
	return r[0] !== n || r[1] !== t ? (a = (e) => {
		let r = t(e);
		return i.current !== void 0 && n(i.current, r) ? i.current : (i.current = r, r);
	}, r[0] = n, r[1] = t, r[2] = a) : a = r[2], a;
}
var At = { display: `none` };
var jt = {
	position: `absolute`,
	width: 1,
	height: 1,
	margin: -1,
	border: 0,
	padding: 0,
	overflow: `hidden`,
	clip: `rect(0px, 0px, 0px, 0px)`,
	clipPath: `inset(100%)`
};
var Mt = `react-flow__node-desc`;
var Nt = `react-flow__edge-desc`;
function Pt(t) {
	let n = (0, import_dist.c)(3), { rfId: r } = t, i = Q(Ft), a = `react-flow__aria-live-${r}`, o;
	return n[0] !== i || n[1] !== a ? (o = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		id: a,
		"aria-live": `assertive`,
		"aria-atomic": `true`,
		style: jt,
		children: i
	}), n[0] = i, n[1] = a, n[2] = o) : o = n[2], o;
}
function Ft(e) {
	return e.ariaLiveMessage;
}
function It(t) {
	let n = (0, import_dist.c)(13), { rfId: r, disableKeyboardA11y: i } = t, a = Q(Lt), o = `${Mt}-${r}`, s = i ? a[`node.a11yDescription.default`] : a[`node.a11yDescription.keyboardDisabled`], c;
	n[0] !== o || n[1] !== s ? (c = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		id: o,
		style: At,
		children: s
	}), n[0] = o, n[1] = s, n[2] = c) : c = n[2];
	let l = `${Nt}-${r}`, u = a[`edge.a11yDescription.default`], d;
	n[3] !== l || n[4] !== u ? (d = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		id: l,
		style: At,
		children: u
	}), n[3] = l, n[4] = u, n[5] = d) : d = n[5];
	let f;
	n[6] !== i || n[7] !== r ? (f = !i && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pt, { rfId: r }), n[6] = i, n[7] = r, n[8] = f) : f = n[8];
	let p;
	return n[9] !== c || n[10] !== d || n[11] !== f ? (p = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		c,
		d,
		f
	] }), n[9] = c, n[10] = d, n[11] = f, n[12] = p) : p = n[12], p;
}
function Lt(e) {
	return e.ariaLabelConfig;
}
var Rt = (0, import_react.forwardRef)((n, r) => {
	let i = (0, import_dist.c)(15), a, o, s, c, l;
	i[0] === n ? (a = i[1], o = i[2], s = i[3], c = i[4], l = i[5]) : ({position: l, children: a, className: o, style: c, ...s} = n, i[0] = n, i[1] = a, i[2] = o, i[3] = s, i[4] = c, i[5] = l);
	let u = l === void 0 ? `top-left` : l, d;
	if (i[6] !== o || i[7] !== u) {
		let e = `${u}`.split(`-`);
		d = cc([
			`react-flow__panel`,
			o,
			...e
		]), i[6] = o, i[7] = u, i[8] = d;
	} else d = i[8];
	let f;
	return i[9] !== a || i[10] !== r || i[11] !== s || i[12] !== c || i[13] !== d ? (f = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		className: d,
		style: c,
		ref: r,
		...s,
		children: a
	}), i[9] = a, i[10] = r, i[11] = s, i[12] = c, i[13] = d, i[14] = f) : f = i[14], f;
});
Rt.displayName = `Panel`;
var zt = `https://reactflow.dev?utm_source=attribution`;
function Bt(t) {
	let n = (0, import_dist.c)(4), { proOptions: r, position: i } = t, a = i === void 0 ? `bottom-right` : i, o;
	if (n[0] === Symbol.for(`react.memo_cache_sentinel`) ? (o = [], n[0] = o) : o = n[0], (0, import_react.useEffect)(Vt, o), r?.hideAttribution) return null;
	let s;
	n[1] === Symbol.for(`react.memo_cache_sentinel`) ? (s = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`a`, {
		href: zt,
		target: `_blank`,
		rel: `noopener noreferrer`,
		"aria-label": `React Flow attribution`,
		children: `React Flow`
	}), n[1] = s) : s = n[1];
	let c;
	return n[2] === a ? c = n[3] : (c = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rt, {
		position: a,
		className: `react-flow__attribution`,
		"data-message": `Please only hide this attribution when you are subscribed to React Flow Pro: ${zt}`,
		children: s
	}), n[2] = a, n[3] = c), c;
}
function Vt() {}
var Ht = (e) => {
	let t = [];
	for (let [, n] of e.nodeLookup) n.selected && t.push(n.internals.userNode);
	return t;
};
var Ut = (e) => {
	let t = [];
	for (let [, n] of e.edgeLookup) n.selected && t.push(n);
	return t;
};
var Wt = (e) => e.id;
function Gt(e, t) {
	return shallow(e.map(Wt), t.map(Wt));
}
function Kt(t) {
	let n = (0, import_dist.c)(12), { onSelectionChange: r } = t, { optionsStore: i, nodesStore: a, edgesStore: o } = $(), s = Et(kt(Ht, Gt)), c = Dt(kt(Ut, Gt)), l;
	n[0] !== o || n[1] !== a || n[2] !== r || n[3] !== i ? (l = () => {
		let e = {
			nodes: Ht(a.getState()),
			edges: Ut(o.getState())
		};
		r?.(e), i.getState().onSelectionChangeHandlers.forEach((t) => t(e));
	}, n[0] = o, n[1] = a, n[2] = r, n[3] = i, n[4] = l) : l = n[4];
	let u;
	return n[5] !== o || n[6] !== a || n[7] !== r || n[8] !== i || n[9] !== c || n[10] !== s ? (u = [
		s,
		c,
		r,
		i,
		a,
		o
	], n[5] = o, n[6] = a, n[7] = r, n[8] = i, n[9] = c, n[10] = s, n[11] = u) : u = n[11], (0, import_react.useEffect)(l, u), null;
}
var qt = (e) => e.onSelectionChangeHandlers.length > 0;
function Jt(t) {
	let n = (0, import_dist.c)(2), { onSelectionChange: r } = t, i = Q(qt);
	if (r || i) {
		let e;
		return n[0] === r ? e = n[1] : (e = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Kt, { onSelectionChange: r }), n[0] = r, n[1] = e), e;
	}
	return null;
}
var Yt = [0, 0];
var Xt = {
	x: 0,
	y: 0,
	zoom: 1
};
var Zt = [.../* @__PURE__ */ `nodes.edges.defaultNodes.defaultEdges.onConnect.onConnectStart.onConnectEnd.onClickConnectStart.onClickConnectEnd.nodesDraggable.autoPanOnNodeFocus.nodesConnectable.nodesFocusable.edgesFocusable.edgesReconnectable.elevateNodesOnSelect.elevateEdgesOnSelect.minZoom.maxZoom.nodeExtent.onNodesChange.onEdgesChange.elementsSelectable.connectionMode.snapGrid.snapToGrid.translateExtent.connectOnClick.defaultEdgeOptions.fitView.fitViewOptions.onNodesDelete.onEdgesDelete.onDelete.onNodeDrag.onNodeDragStart.onNodeDragStop.onSelectionDrag.onSelectionDragStart.onSelectionDragStop.onMoveStart.onMove.onMoveEnd.noPanClassName.nodeOrigin.autoPanOnConnect.autoPanOnNodeDrag.onError.connectionRadius.isValidConnection.selectNodesOnDrag.nodeDragThreshold.connectionDragThreshold.onBeforeDelete.debug.autoPanSpeed.ariaLabelConfig.zIndexMode`.split(`.`), `rfId`];
var Qt = {
	translateExtent: infiniteExtent,
	nodeOrigin: Yt,
	minZoom: .5,
	maxZoom: 2,
	elementsSelectable: !0,
	noPanClassName: `nopan`,
	rfId: `1`
};
function $t(e) {
	let { optionsStore: t } = $(), n = (0, import_react.useRef)(Qt);
	return (0, import_react.useEffect)(() => {
		let { setDefaultNodesAndEdges: r, reset: i } = t.getState();
		return r(e.defaultNodes, e.defaultEdges), () => {
			n.current = Qt, i();
		};
	}, []), (0, import_react.useEffect)(() => {
		let { setNodes: r, setEdges: i, setMinZoom: a, setMaxZoom: o, setTranslateExtent: s, setNodeExtent: c } = t.getState();
		for (let l of Zt) {
			let u = e[l];
			u !== n.current[l] && e[l] !== void 0 && (l === `nodes` ? r(u) : l === `edges` ? i(u) : l === `minZoom` ? a(u) : l === `maxZoom` ? o(u) : l === `translateExtent` ? s(u) : l === `nodeExtent` ? c(u) : l === `ariaLabelConfig` ? t.setState({ ariaLabelConfig: mergeAriaLabelConfig(u) }) : l === `fitView` ? t.setState({ fitViewQueued: u }) : l === `fitViewOptions` ? t.setState({ fitViewOptions: u }) : t.setState({ [l]: u }));
		}
		n.current = e;
	}, Zt.map((t) => e[t])), null;
}
var en = typeof document < `u` ? document : null;
function tn(t, n) {
	let r = (0, import_dist.c)(12), i = t === void 0 ? null : t, a;
	r[0] === n ? a = r[1] : (a = n === void 0 ? {
		target: en,
		actInsideInputWithModifier: !0
	} : n, r[0] = n, r[1] = a);
	let o = a, [s, c] = (0, import_react.useState)(!1), l = (0, import_react.useRef)(!1), u;
	r[2] === Symbol.for(`react.memo_cache_sentinel`) ? (u = /* @__PURE__ */ new Set([]), r[2] = u) : u = r[2];
	let d = (0, import_react.useRef)(u), f;
	r[3] === i ? f = r[4] : (f = nn(i), r[3] = i, r[4] = f);
	let [p, m] = f, h;
	r[5] !== i || r[6] !== p || r[7] !== m || r[8] !== o ? (h = () => {
		let e = o?.target ?? en, t = o?.actInsideInputWithModifier ?? !0;
		if (i !== null) {
			let n = (e) => {
				if (l.current = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey, (!l.current || l.current && !t) && isInputDOMNode(e)) return !1;
				let n = an(e.code, m);
				if (d.current.add(e[n]), rn(p, d.current, !1)) {
					let t = e.composedPath?.()?.[0] || e.target, n = t?.nodeName === `BUTTON` || t?.nodeName === `A`;
					o.preventDefault !== !1 && (l.current || !n) && e.preventDefault(), c(!0);
				}
			}, r = (e) => {
				let t = an(e.code, m);
				rn(p, d.current, !0) ? (c(!1), d.current.clear()) : d.current.delete(e[t]), e.key === `Meta` && d.current.clear(), l.current = !1;
			}, i = () => {
				d.current.clear(), c(!1);
			};
			return e?.addEventListener(`keydown`, n), e?.addEventListener(`keyup`, r), window.addEventListener(`blur`, i), window.addEventListener(`contextmenu`, i), () => {
				e?.removeEventListener(`keydown`, n), e?.removeEventListener(`keyup`, r), window.removeEventListener(`blur`, i), window.removeEventListener(`contextmenu`, i);
			};
		}
	}, r[5] = i, r[6] = p, r[7] = m, r[8] = o, r[9] = h) : h = r[9];
	let g;
	return r[10] === i ? g = r[11] : (g = [i, c], r[10] = i, r[11] = g), (0, import_react.useEffect)(h, g), s;
}
function nn(e) {
	if (e !== null) {
		let t = (Array.isArray(e) ? e : [e]).filter((e) => typeof e == `string`).map((e) => e.replace(/\+/g, `
`).replace(`

`, `
+`).split(`
`));
		return [t, t.reduce((e, t) => e.concat(...t), [])];
	}
	return [[], []];
}
function rn(e, t, n) {
	return e.filter((e) => n || e.length === t.size).some((e) => e.every((e) => t.has(e)));
}
function an(e, t) {
	return t.includes(e) ? `code` : `key`;
}
var on = () => {
	let t = (0, import_dist.c)(29), { optionsStore: n, viewportStore: r } = $(), i, a, o;
	t[0] === n ? (i = t[1], a = t[2], o = t[3]) : (i = async (e) => {
		let { panZoom: t } = n.getState();
		return t ? t.scaleBy(1.2, e) : !1;
	}, a = async (e) => {
		let { panZoom: t } = n.getState();
		return t ? t.scaleBy(.8333333333333334, e) : !1;
	}, o = async (e, t) => {
		let { panZoom: r } = n.getState();
		return r ? r.scaleTo(e, t) : !1;
	}, t[0] = n, t[1] = i, t[2] = a, t[3] = o);
	let s;
	t[4] === r ? s = t[5] : (s = () => r.getState().transform[2], t[4] = r, t[5] = s);
	let c;
	t[6] !== n || t[7] !== r ? (c = async (e, t) => {
		let { transform: i } = r.getState(), [a, o, s] = i, { panZoom: c } = n.getState();
		return c ? c.setViewport({
			x: e.x ?? a,
			y: e.y ?? o,
			zoom: e.zoom ?? s
		}, t) : !1;
	}, t[6] = n, t[7] = r, t[8] = c) : c = t[8];
	let l;
	t[9] === r ? l = t[10] : (l = () => {
		let [e, t, n] = r.getState().transform;
		return {
			x: e,
			y: t,
			zoom: n
		};
	}, t[9] = r, t[10] = l);
	let u;
	t[11] === n ? u = t[12] : (u = async (e, t, r) => n.getState().setCenter(e, t, r), t[11] = n, t[12] = u);
	let d, f, p;
	t[13] !== n || t[14] !== r ? (d = async (e, t) => {
		let { width: i, height: a } = r.getState(), { minZoom: o, maxZoom: s, panZoom: c } = n.getState(), l = getViewportForBounds(e, i, a, o, s, t?.padding ?? "5%");
		return c ? c.setViewport(l, t) : !1;
	}, f = (e, t) => {
		let i = t === void 0 ? {} : t, { transform: a } = r.getState(), { snapGrid: o, snapToGrid: s, domNode: c } = n.getState();
		if (!c) return e;
		let { x: l, y: u } = c.getBoundingClientRect(), d = {
			x: e.x - l,
			y: e.y - u
		}, f = i.snapGrid ?? o;
		return pointToRendererPoint(d, a, i.snapToGrid ?? s, f);
	}, p = (e) => {
		let { transform: t } = r.getState(), { domNode: i } = n.getState();
		if (!i) return e;
		let { x: a, y: o } = i.getBoundingClientRect(), s = rendererPointToPoint(e, t);
		return {
			x: s.x + a,
			y: s.y + o
		};
	}, t[13] = n, t[14] = r, t[15] = d, t[16] = f, t[17] = p) : (d = t[15], f = t[16], p = t[17]);
	let m;
	return t[18] !== i || t[19] !== a || t[20] !== o || t[21] !== s || t[22] !== c || t[23] !== l || t[24] !== u || t[25] !== d || t[26] !== f || t[27] !== p ? (m = {
		zoomIn: i,
		zoomOut: a,
		zoomTo: o,
		getZoom: s,
		setViewport: c,
		getViewport: l,
		setCenter: u,
		fitBounds: d,
		screenToFlowPosition: f,
		flowToScreenPosition: p
	}, t[18] = i, t[19] = a, t[20] = o, t[21] = s, t[22] = c, t[23] = l, t[24] = u, t[25] = d, t[26] = f, t[27] = p, t[28] = m) : m = t[28], m;
};
function sn({ items: e = [], lookup: t }) {
	let n = [], r = new Map(e.map((e) => [e.id, e]));
	for (let [, r] of e.entries()) {
		let e = t.get(r.id), i = e?.internals?.userNode ?? e;
		i !== void 0 && i !== r && n.push(replaceChange({ ...r })), i === void 0 && n.push(addChange({ ...r }));
	}
	for (let [e] of t) r.get(e) === void 0 && n.push(removeChange(e));
	return n;
}
var cn = createDevWarn(`React Flow`, `https://reactflow.dev/`);
function ln(e, t, n = {}) {
	return addEdge(e, t, {
		...n,
		onError: n.onError ?? cn
	});
}
var dn = (e) => isNodeBase(e);
var fn = (e) => isEdgeBase(e);
function pn(e) {
	return (0, import_react.forwardRef)(e);
}
var mn = typeof window < `u` ? import_react.useLayoutEffect : import_react.useEffect;
function hn(t) {
	let n = (0, import_dist.c)(7), r;
	n[0] === Symbol.for(`react.memo_cache_sentinel`) ? (r = BigInt(0), n[0] = r) : r = n[0];
	let [i, a] = (0, import_react.useState)(r), o;
	n[1] === Symbol.for(`react.memo_cache_sentinel`) ? (o = () => _n(() => a(gn)), n[1] = o) : o = n[1];
	let [s] = (0, import_react.useState)(o), c;
	n[2] !== s || n[3] !== t ? (c = () => {
		let e = s.get();
		e.length && (t(e), s.reset());
	}, n[2] = s, n[3] = t, n[4] = c) : c = n[4];
	let l;
	return n[5] === i ? l = n[6] : (l = [i], n[5] = i, n[6] = l), mn(c, l), s;
}
function gn(e) {
	return e + BigInt(1);
}
function _n(e) {
	let t = [];
	return {
		get: () => t,
		reset: () => {
			t = [];
		},
		push: (n) => {
			t.push(n), e();
		}
	};
}
var vn = (0, import_react.createContext)(null);
function yn(t) {
	let n = (0, import_dist.c)(12), { children: r } = t, { optionsStore: i, nodesStore: a, edgesStore: o } = $(), c;
	n[0] !== a || n[1] !== i ? (c = (e) => {
		let { nodes: t, nodeLookup: n } = a.getState(), r = t === void 0 ? [] : t, { onNodesChange: o, fitViewQueued: s, onNodesChangeMiddlewareMap: c, setNodes: l, hasDefaultNodes: u } = i.getState(), f = r;
		for (let t of e) f = typeof t == `function` ? t(f) : t;
		let p = sn({
			items: f,
			lookup: n
		});
		for (let e of c.values()) p = e(p);
		u && l(f), p.length > 0 ? o?.(new NodeChangeset(p)) : s && window.requestAnimationFrame(() => {
			let { fitViewQueued: e, setNodes: t } = i.getState(), { nodes: n } = a.getState();
			e && t(n);
		});
	}, n[0] = a, n[1] = i, n[2] = c) : c = n[2];
	let l = hn(c), u;
	n[3] !== o || n[4] !== i ? (u = (e) => {
		let { edges: t, edgeLookup: n } = o.getState(), r = t === void 0 ? [] : t, { setEdges: a, hasDefaultEdges: c, onEdgesChange: l } = i.getState(), u = r;
		for (let t of e) u = typeof t == `function` ? t(u) : t;
		if (c) a(u);
		else if (l) {
			let e = sn({
				items: u,
				lookup: n
			});
			l?.(new EdgeChangeset(e));
		}
	}, n[3] = o, n[4] = i, n[5] = u) : u = n[5];
	let f = hn(u), p;
	n[6] !== f || n[7] !== l ? (p = {
		nodeQueue: l,
		edgeQueue: f
	}, n[6] = f, n[7] = l, n[8] = p) : p = n[8];
	let m = p, h;
	return n[9] !== r || n[10] !== m ? (h = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(vn.Provider, {
		value: m,
		children: r
	}), n[9] = r, n[10] = m, n[11] = h) : h = n[11], h;
}
function bn() {
	let e = (0, import_react.useContext)(vn);
	if (!e) throw Error(`useBatchContext must be used within a BatchProvider`);
	return e;
}
var xn = (e) => !!e.panZoom;
function Sn() {
	let t = (0, import_dist.c)(79), n = on(), { optionsStore: r, viewportStore: i, nodesStore: a, edgesStore: o } = $(), s = bn(), c = Q(xn), l;
	t[0] === a ? l = t[1] : (l = (e) => a.getState().nodeLookup.get(e), t[0] = a, t[1] = l);
	let u = l, d;
	t[2] === s ? d = t[3] : (d = (e) => {
		s.nodeQueue.push(e);
	}, t[2] = s, t[3] = d);
	let f = d, p;
	t[4] === s ? p = t[5] : (p = (e) => {
		s.edgeQueue.push(e);
	}, t[4] = s, t[5] = p);
	let m = p, h;
	t[6] !== a || t[7] !== r ? (h = (e) => {
		let { nodeLookup: t } = a.getState(), { nodeOrigin: n } = r.getState(), i = dn(e) ? e : t.get(e.id), o = i.parentId ? evaluateAbsolutePosition(i.position, i.measured, i.parentId, t, n) : i.position;
		return nodeToRect({
			...i,
			position: o,
			width: i.measured?.width ?? i.width,
			height: i.measured?.height ?? i.height
		}, i.parentId ? void 0 : n);
	}, t[6] = a, t[7] = r, t[8] = h) : h = t[8];
	let g = h, _;
	t[9] === f ? _ = t[10] : (_ = (e, t, n) => {
		let r = n === void 0 ? { replace: !1 } : n;
		f((n) => n.map((n) => {
			if (n.id === e) {
				let e = typeof t == `function` ? t(n) : t;
				return r.replace && dn(e) ? e : {
					...n,
					...e
				};
			}
			return n;
		}));
	}, t[9] = f, t[10] = _);
	let v = _, y;
	t[11] === m ? y = t[12] : (y = (e, t, n) => {
		let r = n === void 0 ? { replace: !1 } : n;
		m((n) => n.map((n) => {
			if (n.id === e) {
				let e = typeof t == `function` ? t(n) : t;
				return r.replace && fn(e) ? e : {
					...n,
					...e
				};
			}
			return n;
		}));
	}, t[11] = m, t[12] = y);
	let b = y, x;
	t[13] === a ? x = t[14] : (x = () => a.getState().nodes.map(kn), t[13] = a, t[14] = x);
	let S;
	t[15] === u ? S = t[16] : (S = (e) => u(e)?.internals.userNode, t[15] = u, t[16] = S);
	let C, w;
	t[17] === o ? (C = t[18], w = t[19]) : (C = () => {
		let { edges: e } = o.getState();
		return (e === void 0 ? [] : e).map(On);
	}, w = (e) => o.getState().edgeLookup.get(e), t[17] = o, t[18] = C, t[19] = w);
	let T, E;
	t[20] === s ? (T = t[21], E = t[22]) : (T = (e) => {
		let t = Array.isArray(e) ? e : [e];
		s.nodeQueue.push((e) => [...e, ...t]);
	}, E = (e) => {
		let t = Array.isArray(e) ? e : [e];
		s.edgeQueue.push((e) => [...e, ...t]);
	}, t[20] = s, t[21] = T, t[22] = E);
	let D;
	t[23] !== o || t[24] !== a || t[25] !== i ? (D = () => {
		let { nodes: e } = a.getState(), t = e === void 0 ? [] : e, { edges: n } = o.getState(), r = n === void 0 ? [] : n, { transform: s } = i.getState(), [c, l, u] = s;
		return {
			nodes: t.map(Dn),
			edges: r.map(En),
			viewport: {
				x: c,
				y: l,
				zoom: u
			}
		};
	}, t[23] = o, t[24] = a, t[25] = i, t[26] = D) : D = t[26];
	let O;
	t[27] !== o || t[28] !== a || t[29] !== r ? (O = async (e) => {
		let { nodes: t, edges: n } = e, i = t === void 0 ? [] : t, s = n === void 0 ? [] : n, { nodes: c } = a.getState(), { edges: l } = o.getState(), { onNodesDelete: u, onEdgesDelete: d, emitNodeChanges: f, emitEdgeChanges: p, onDelete: m, onBeforeDelete: h } = r.getState(), { nodes: g, edges: _ } = await getElementsToRemove({
			nodesToRemove: i,
			edgesToRemove: s,
			nodes: c,
			edges: l,
			onBeforeDelete: h
		}), v = _.length > 0, y = g.length > 0;
		if (v) {
			let e = _.map(Tn);
			d?.(_), p(e);
		}
		if (y) {
			let e = g.map(wn);
			u?.(g), f(e);
		}
		return (y || v) && m?.({
			nodes: g,
			edges: _
		}), {
			deletedNodes: g,
			deletedEdges: _
		};
	}, t[27] = o, t[28] = a, t[29] = r, t[30] = O) : O = t[30];
	let k;
	t[31] !== g || t[32] !== a || t[33] !== r ? (k = (e, t, n) => {
		let i = t === void 0 || t, o = isRectObject(e), s = o ? e : g(e), c = n !== void 0;
		if (!s) return [];
		let { nodeOrigin: l } = r.getState();
		return (n || a.getState().nodes).filter((t) => {
			let n = a.getState().nodeLookup.get(t.id);
			if (n && !o && (t.id === e.id || !n.internals.positionAbsolute)) return !1;
			let r = nodeToRect(c ? t : n, l), u = getOverlappingArea(r, s);
			return i && u > 0 || u >= r.width * r.height || u >= s.width * s.height;
		});
	}, t[31] = g, t[32] = a, t[33] = r, t[34] = k) : k = t[34];
	let A;
	t[35] === g ? A = t[36] : (A = (e, t, n) => {
		let r = n === void 0 || n, i = isRectObject(e) ? e : g(e);
		if (!i) return !1;
		let a = getOverlappingArea(i, t);
		return r && a > 0 || a >= t.width * t.height || a >= i.width * i.height;
	}, t[35] = g, t[36] = A);
	let j;
	t[37] === v ? j = t[38] : (j = (e, t, n) => {
		let r = n === void 0 ? { replace: !1 } : n;
		v(e, (e) => {
			let n = typeof t == `function` ? t(e) : t;
			return r.replace ? {
				...e,
				data: n
			} : {
				...e,
				data: {
					...e.data,
					...n
				}
			};
		}, r);
	}, t[37] = v, t[38] = j);
	let M;
	t[39] !== a || t[40] !== r || t[41] !== v ? (M = (e, t) => {
		changeParentNode(e, a.getState().nodeLookup, t, r.getState().nodeOrigin, (e) => {
			let { nodeId: t, parentId: n, x: r, y: i } = e;
			v(t, {
				parentId: n ?? void 0,
				position: {
					x: r,
					y: i
				}
			});
		});
	}, t[39] = a, t[40] = r, t[41] = v, t[42] = M) : M = t[42];
	let N;
	t[43] === b ? N = t[44] : (N = (e, t, n) => {
		let r = n === void 0 ? { replace: !1 } : n;
		b(e, (e) => {
			let n = typeof t == `function` ? t(e) : t;
			return r.replace ? {
				...e,
				data: n
			} : {
				...e,
				data: {
					...e.data,
					...n
				}
			};
		}, r);
	}, t[43] = b, t[44] = N);
	let F;
	t[45] !== a || t[46] !== r ? (F = (e) => {
		let { nodeLookup: t } = a.getState(), { nodeOrigin: n } = r.getState();
		return getNodesBounds(e, {
			nodeLookup: t,
			nodeOrigin: n
		});
	}, t[45] = a, t[46] = r, t[47] = F) : F = t[47];
	let I;
	t[48] === o ? I = t[49] : (I = (e) => {
		let { type: t, handleId: n, nodeId: r } = e;
		return getConnectionsFromLookup(o.getState().connectionLookup, {
			nodeId: r,
			type: t,
			handleId: n
		});
	}, t[48] = o, t[49] = I);
	let L;
	t[50] !== s || t[51] !== r ? (L = async (e) => {
		let t = r.getState().fitViewResolver ?? withResolvers();
		return r.setState({
			fitViewQueued: !0,
			fitViewOptions: e,
			fitViewResolver: t
		}), s.nodeQueue.push(Cn), t.promise;
	}, t[50] = s, t[51] = r, t[52] = L) : L = t[52];
	let R;
	t[53] !== u || t[54] !== m || t[55] !== f || t[56] !== T || t[57] !== E || t[58] !== D || t[59] !== O || t[60] !== k || t[61] !== A || t[62] !== j || t[63] !== M || t[64] !== N || t[65] !== F || t[66] !== I || t[67] !== L || t[68] !== x || t[69] !== S || t[70] !== C || t[71] !== w || t[72] !== b || t[73] !== v ? (R = {
		getNodes: x,
		getNode: S,
		getInternalNode: u,
		getEdges: C,
		getEdge: w,
		setNodes: f,
		setEdges: m,
		addNodes: T,
		addEdges: E,
		toObject: D,
		deleteElements: O,
		getIntersectingNodes: k,
		isNodeIntersecting: A,
		updateNode: v,
		updateNodeData: j,
		changeParent: M,
		updateEdge: b,
		updateEdgeData: N,
		getNodesBounds: F,
		getNodeConnections: I,
		fitView: L
	}, t[53] = u, t[54] = m, t[55] = f, t[56] = T, t[57] = E, t[58] = D, t[59] = O, t[60] = k, t[61] = A, t[62] = j, t[63] = M, t[64] = N, t[65] = F, t[66] = I, t[67] = L, t[68] = x, t[69] = S, t[70] = C, t[71] = w, t[72] = b, t[73] = v, t[74] = R) : R = t[74];
	let ee = R, z;
	return t[75] !== ee || t[76] !== n || t[77] !== c ? (z = {
		...ee,
		...n,
		viewportInitialized: c
	}, t[75] = ee, t[76] = n, t[77] = c, t[78] = z) : z = t[78], z;
}
function Cn(e) {
	return [...e];
}
function wn(e) {
	return removeChange(e.id);
}
function Tn(e) {
	return removeChange(e.id);
}
function En(e) {
	return { ...e };
}
function Dn(e) {
	return { ...e };
}
function On(e) {
	return { ...e };
}
function kn(e) {
	return { ...e };
}
var An = (e) => e.selected;
var jn = typeof window < `u` ? window : void 0;
function Mn(t) {
	let n = (0, import_dist.c)(15), { deleteKeyCode: r, multiSelectionKeyCode: i } = t, { optionsStore: a, nodesStore: o, edgesStore: s } = $(), { deleteElements: c } = Sn(), l;
	n[0] === Symbol.for(`react.memo_cache_sentinel`) ? (l = { actInsideInputWithModifier: !1 }, n[0] = l) : l = n[0];
	let u = tn(r, l), d;
	n[1] === Symbol.for(`react.memo_cache_sentinel`) ? (d = { target: jn }, n[1] = d) : d = n[1];
	let f = tn(i, d), p;
	n[2] !== c || n[3] !== u || n[4] !== s || n[5] !== o || n[6] !== a ? (p = () => {
		if (u) {
			let { edges: e } = s.getState(), { nodes: t } = o.getState();
			c({
				nodes: t.filter(An),
				edges: e.filter(An)
			}), a.getState().nodesSelectionActive && a.setState({ nodesSelectionActive: !1 });
		}
	}, n[2] = c, n[3] = u, n[4] = s, n[5] = o, n[6] = a, n[7] = p) : p = n[7];
	let m;
	n[8] === u ? m = n[9] : (m = [u], n[8] = u, n[9] = m), (0, import_react.useEffect)(p, m);
	let h;
	n[10] !== f || n[11] !== a ? (h = () => {
		a.setState({ multiSelectionActive: f });
	}, n[10] = f, n[11] = a, n[12] = h) : h = n[12];
	let g;
	n[13] === f ? g = n[14] : (g = [f], n[13] = f, n[14] = g), (0, import_react.useEffect)(h, g);
}
function Nn(t) {
	let n = (0, import_dist.c)(5), { optionsStore: r, viewportStore: i } = $(), a;
	n[0] !== t.current || n[1] !== r || n[2] !== i ? (a = () => {
		let e = () => {
			if (!t.current || !(t.current.checkVisibility?.() ?? !0)) return !1;
			let e = getDimensions(t.current);
			(e.height === 0 || e.width === 0) && r.getState().onError?.(`004`, errorMessages.error004()), i.setState({
				width: e.width || 500,
				height: e.height || 500
			});
		};
		if (t.current) {
			e(), window.addEventListener(`resize`, e);
			let n = new ResizeObserver(() => e());
			return n.observe(t.current), () => {
				window.removeEventListener(`resize`, e), n.disconnect();
			};
		}
	}, n[0] = t.current, n[1] = r, n[2] = i, n[3] = a) : a = n[3];
	let o;
	n[4] === Symbol.for(`react.memo_cache_sentinel`) ? (o = [], n[4] = o) : o = n[4], (0, import_react.useEffect)(a, o);
}
var Pn = {
	position: `absolute`,
	width: `100%`,
	height: `100%`,
	top: 0,
	left: 0
};
function Fn(t) {
	let n = (0, import_dist.c)(35), { onPaneContextMenu: r, zoomOnScroll: i, zoomOnPinch: a, panOnScroll: o, panActivationKeyPressed: s, panOnScrollSpeed: c, panOnScrollMode: l, zoomOnDoubleClick: u, panOnDrag: d, defaultViewport: f, translateExtent: m, minZoom: h, maxZoom: g, zoomActivationKeyCode: _, preventScrolling: v, children: y, noWheelClassName: b, noPanClassName: x, onViewportChange: S, isControlledViewport: w, paneDragThreshold: T } = t, E = i === void 0 || i, D = a === void 0 || a, O = o !== void 0 && o, k = c === void 0 ? .5 : c, A = l === void 0 ? PanOnScrollMode.Free : l, j = u === void 0 || u, M = d === void 0 || d, N = v === void 0 || v, { optionsStore: P, viewportStore: F } = $(), I = Q(Ln), L = Tt(In), R = tn(_), ee = (0, import_react.useRef)(null), z = (0, import_react.useRef)(), B;
	n[0] !== f || n[1] !== g || n[2] !== h || n[3] !== m ? (B = () => ({
		minZoom: h,
		maxZoom: g,
		translateExtent: m,
		defaultViewport: f
	}), n[0] = f, n[1] = g, n[2] = h, n[3] = m, n[4] = B) : B = n[4];
	let [V] = (0, import_react.useState)(B);
	Nn(ee);
	let H;
	n[5] !== w || n[6] !== S || n[7] !== F ? (H = (e) => {
		S?.({
			x: e[0],
			y: e[1],
			zoom: e[2]
		}), w || F.setState({ transform: e });
	}, n[5] = w, n[6] = S, n[7] = F, n[8] = H) : H = n[8];
	let U = H, W, G;
	n[9] !== P || n[10] !== V || n[11] !== F ? (W = () => {
		if (ee.current) {
			z.current = XYPanZoom({
				domNode: ee.current,
				minZoom: V.minZoom,
				maxZoom: V.maxZoom,
				translateExtent: V.translateExtent,
				viewport: V.defaultViewport,
				onDraggingChange: (e) => F.setState((t) => t.paneDragging === e ? t : { paneDragging: e }),
				onPanZoomStart: (e, t) => {
					let { onViewportChangeStart: n, onMoveStart: r } = P.getState();
					r?.(e, t), n?.(t);
				},
				onPanZoom: (e, t) => {
					let { onViewportChange: n, onMove: r } = P.getState();
					r?.(e, t), n?.(t);
				},
				onPanZoomEnd: (e, t) => {
					let { onViewportChangeEnd: n, onMoveEnd: r } = P.getState();
					r?.(e, t), n?.(t);
				}
			});
			let { x: e, y: t, zoom: n } = z.current.getViewport();
			return P.setState({
				panZoom: z.current,
				domNode: ee.current.closest(`.react-flow`)
			}), F.setState({ transform: [
				e,
				t,
				n
			] }), () => {
				z.current?.destroy();
			};
		}
	}, G = [
		V,
		P,
		F
	], n[9] = P, n[10] = V, n[11] = F, n[12] = W, n[13] = G) : (W = n[12], G = n[13]), (0, import_react.useEffect)(W, G);
	let K, q;
	n[14] !== L || n[15] !== x || n[16] !== b || n[17] !== r || n[18] !== U || n[19] !== s || n[20] !== M || n[21] !== O || n[22] !== A || n[23] !== k || n[24] !== T || n[25] !== N || n[26] !== I || n[27] !== R || n[28] !== j || n[29] !== D || n[30] !== E ? (K = () => {
		z.current?.update({
			onPaneContextMenu: r,
			zoomOnScroll: E,
			zoomOnPinch: D,
			panOnScroll: O,
			panActivationKeyPressed: s,
			panOnScrollSpeed: k,
			panOnScrollMode: A,
			zoomOnDoubleClick: j,
			panOnDrag: M,
			zoomActivationKeyPressed: R,
			preventScrolling: N,
			noPanClassName: x,
			userSelectionActive: I,
			noWheelClassName: b,
			lib: `react`,
			onTransformChange: U,
			connectionInProgress: L,
			paneDragThreshold: T
		});
	}, q = [
		r,
		E,
		D,
		O,
		s,
		k,
		A,
		j,
		M,
		R,
		N,
		x,
		I,
		b,
		U,
		L,
		T
	], n[14] = L, n[15] = x, n[16] = b, n[17] = r, n[18] = U, n[19] = s, n[20] = M, n[21] = O, n[22] = A, n[23] = k, n[24] = T, n[25] = N, n[26] = I, n[27] = R, n[28] = j, n[29] = D, n[30] = E, n[31] = K, n[32] = q) : (K = n[31], q = n[32]), (0, import_react.useEffect)(K, q);
	let J;
	return n[33] === y ? J = n[34] : (J = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		className: `react-flow__renderer`,
		ref: ee,
		style: Pn,
		children: y
	}), n[33] = y, n[34] = J), J;
}
function In(e) {
	return e.connection.inProgress;
}
function Ln(e) {
	return e.userSelectionActive;
}
function Rn() {
	let t = (0, import_dist.c)(4), n = Q(Bn), r = Ot(xt(zn));
	if (!(n && r)) return null;
	let i = `translate(${r.x}px, ${r.y}px)`, a;
	return t[0] !== i || t[1] !== r.height || t[2] !== r.width ? (a = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		className: `react-flow__selection react-flow__container`,
		style: {
			width: r.width,
			height: r.height,
			transform: i
		}
	}), t[0] = i, t[1] = r.height, t[2] = r.width, t[3] = a) : a = t[3], a;
}
function zn(e) {
	return e.userSelectionRect;
}
function Bn(e) {
	return e.userSelectionActive;
}
var Vn = (e, t, n) => {
	e.target === n.current && t?.(e);
};
function Hn(n) {
	let r = (0, import_dist.c)(79), { isSelecting: i, selectionKeyPressed: a, selectionMode: o, panOnDrag: s, autoPanOnSelection: c, paneDragThreshold: l, selectionOnDrag: u, onSelectionStart: d, onSelectionEnd: f, onPaneClick: p, onPaneContextMenu: m, onPaneScroll: h, onPaneMouseEnter: g, onPaneMouseMove: _, onPaneMouseLeave: v, children: b } = n, x = o === void 0 ? SelectionMode.Full : o, S = (0, import_react.useRef)(0), { optionsStore: C, viewportStore: w, connectionStore: T, nodesStore: E, edgesStore: D, selectionStore: O } = $(), k = Q(Yn), A = Q(Jn), N = Q(qn), P = Q(Kn), F = wt(Gn), I = A && (i || k), L = (0, import_react.useRef)(null), R = (0, import_react.useRef)(), ee;
	r[0] === Symbol.for(`react.memo_cache_sentinel`) ? (ee = /* @__PURE__ */ new Set(), r[0] = ee) : ee = r[0];
	let z = (0, import_react.useRef)(ee), B;
	r[1] === Symbol.for(`react.memo_cache_sentinel`) ? (B = /* @__PURE__ */ new Set(), r[1] = B) : B = r[1];
	let V = (0, import_react.useRef)(B), H = (0, import_react.useRef)(!1), U = (0, import_react.useRef)(!1), W;
	r[2] === Symbol.for(`react.memo_cache_sentinel`) ? (W = {
		x: 0,
		y: 0
	}, r[2] = W) : W = r[2];
	let G = (0, import_react.useRef)(W), K = (0, import_react.useRef)(!1), q;
	r[3] !== T || r[4] !== p || r[5] !== C ? (q = (e) => {
		if (U.current || H.current || T.getState().connection.inProgress) {
			U.current = !1, H.current = !1;
			return;
		}
		let { nodesSelectionActive: t, onClickConnectEnd: n, resetSelectedElements: r } = C.getState(), { connectionClickStartHandle: i, connection: a } = T.getState();
		if (i) {
			let t = structuredClone(a);
			delete t.inProgress, t.toPosition = t.toHandle ? t.toHandle.position : null, n?.(e.nativeEvent, t), C.getState().updateConnectionClickStart(null);
		}
		p?.(e), r(), t && C.setState({ nodesSelectionActive: !1 });
	}, r[3] = T, r[4] = p, r[5] = C, r[6] = q) : q = r[6];
	let J = q, Y;
	r[7] !== m || r[8] !== s ? (Y = (e) => {
		Array.isArray(s) && s?.includes(2) ? e.preventDefault() : m?.(e);
	}, r[7] = m, r[8] = s, r[9] = Y) : Y = r[9];
	let X = Y, te;
	r[10] === h ? te = r[11] : (te = h ? (e) => h(e) : void 0, r[10] = h, r[11] = te);
	let ne = te, re;
	r[12] === Symbol.for(`react.memo_cache_sentinel`) ? (re = (e) => {
		U.current && (e.stopPropagation(), U.current = !1);
	}, r[12] = re) : re = r[12];
	let ie = re, ae;
	r[13] !== i || r[14] !== C || r[15] !== s || r[16] !== a || r[17] !== u || r[18] !== O || r[19] !== w ? (ae = (e) => {
		if (e.pointerType === `touch` && s !== !1 && !a) return;
		let { domNode: t } = C.getState(), { transform: n } = w.getState();
		if (R.current = t?.getBoundingClientRect(), !R.current) return;
		let r = e.target === L.current;
		if (!r && e.target.closest(`.nokey`) || !i || !(u && r || a) || e.button !== 0 || !e.isPrimary) return;
		e.target?.setPointerCapture?.(e.pointerId), U.current = !1;
		let { x: o, y: c } = getEventPosition(e.nativeEvent, R.current), l = pointToRendererPoint({
			x: o,
			y: c
		}, n);
		O.setState({ userSelectionRect: {
			width: 0,
			height: 0,
			startX: l.x,
			startY: l.y,
			x: o,
			y: c
		} }), r || (e.stopPropagation(), e.preventDefault());
	}, r[13] = i, r[14] = C, r[15] = s, r[16] = a, r[17] = u, r[18] = O, r[19] = w, r[20] = ae) : ae = r[20];
	let oe = ae, ce;
	r[21] !== D || r[22] !== E || r[23] !== C || r[24] !== x || r[25] !== O || r[26] !== w ? (ce = function(e, t) {
		let { userSelectionRect: n } = O.getState();
		if (!n) return;
		let { transform: r } = w.getState(), { nodeLookup: i } = E.getState(), { edgeLookup: a, connectionLookup: o } = D.getState(), { emitNodeChanges: s, emitEdgeChanges: c, defaultEdgeOptions: l } = C.getState(), u = {
			x: n.startX,
			y: n.startY
		}, { x: d, y: f } = rendererPointToPoint(u, r), p = {
			startX: u.x,
			startY: u.y,
			x: e < d ? e : d,
			y: t < f ? t : f,
			width: Math.abs(e - d),
			height: Math.abs(t - f)
		}, m = z.current, h = V.current;
		z.current = new Set(getNodesInside(i, p, r, x === SelectionMode.Partial, !0).map(Wn)), V.current = /* @__PURE__ */ new Set();
		let g = l?.selectable ?? !0;
		for (let e of z.current) {
			let t = o.get(e);
			if (t) for (let { edgeId: e } of t.values()) {
				let t = a.get(e);
				t && (t.selectable ?? g) && V.current.add(e);
			}
		}
		areSetsEqual(m, z.current) || s(getSelectionChanges(i, z.current)), areSetsEqual(h, V.current) || c(getSelectionChanges(a, V.current)), O.setState({ userSelectionRect: p }), C.setState(Un);
	}, r[21] = D, r[22] = E, r[23] = C, r[24] = x, r[25] = O, r[26] = w, r[27] = ce) : ce = r[27];
	let le = ce, ue;
	r[28] !== c || r[29] !== P || r[30] !== le || r[31] !== N ? (ue = () => {
		if (!c || !R.current) return;
		let [e, t] = calcAutoPan(G.current, R.current, P);
		N({
			x: e,
			y: t
		}).then((e) => {
			if (!U.current || !e) {
				S.current = requestAnimationFrame(ue);
				return;
			}
			let { x: t, y: n } = G.current;
			le(t, n), S.current = requestAnimationFrame(ue);
		});
	}, r[28] = c, r[29] = P, r[30] = le, r[31] = N, r[32] = ue) : ue = r[32];
	let de;
	r[33] === Symbol.for(`react.memo_cache_sentinel`) ? (de = () => {
		cancelAnimationFrame(S.current), S.current = 0, K.current = !1;
	}, r[33] = de) : de = r[33];
	let fe = de, pe, me;
	r[34] === Symbol.for(`react.memo_cache_sentinel`) ? (pe = () => () => fe(), me = [], r[34] = pe, r[35] = me) : (pe = r[34], me = r[35]), (0, import_react.useEffect)(pe, me);
	let he;
	r[36] !== ue || r[37] !== le || r[38] !== d || r[39] !== C || r[40] !== l || r[41] !== a || r[42] !== O || r[43] !== w ? (he = (e) => {
		let { userSelectionRect: t } = O.getState(), { transform: n } = w.getState(), { resetSelectedElements: r } = C.getState();
		if (!R.current || !t) return;
		let { x: i, y: o } = getEventPosition(e.nativeEvent, R.current);
		G.current = {
			x: i,
			y: o
		};
		let s = rendererPointToPoint({
			x: t.startX,
			y: t.startY
		}, n);
		if (!U.current) {
			let t = a ? 0 : l;
			if (Math.hypot(i - s.x, o - s.y) <= t) return;
			r(), d?.(e);
		}
		U.current = !0, K.current || (ue(), K.current = !0), le(i, o);
	}, r[36] = ue, r[37] = le, r[38] = d, r[39] = C, r[40] = l, r[41] = a, r[42] = O, r[43] = w, r[44] = he) : he = r[44];
	let ge = he, ve;
	r[45] !== T || r[46] !== I || r[47] !== J || r[48] !== f || r[49] !== C || r[50] !== O || r[51] !== k ? (ve = (e) => {
		if (!I) e.target === L.current && T.getState().connection.inProgress && (H.current = !0);
		else if (e.button === 0) {
			if (e.target?.releasePointerCapture?.(e.pointerId), !k && e.target === L.current && O.getState().userSelectionRect && J?.(e), C.setState({ userSelectionActive: !1 }), O.setState({ userSelectionRect: null }), U.current) {
				f?.(e);
				let t = z.current.size > 0;
				C.getState().nodesSelectionActive !== t && C.setState({ nodesSelectionActive: t });
			}
			fe();
		}
	}, r[45] = T, r[46] = I, r[47] = J, r[48] = f, r[49] = C, r[50] = O, r[51] = k, r[52] = ve) : ve = r[52];
	let ye = ve, xe;
	r[53] === Symbol.for(`react.memo_cache_sentinel`) ? (xe = (e) => {
		e.target?.releasePointerCapture?.(e.pointerId), fe();
	}, r[53] = xe) : xe = r[53];
	let Se = xe, Ce;
	if (r[54] !== F || r[55] !== i || r[56] !== s) Ce = cc([`react-flow__pane`, {
		draggable: s === !0 || Array.isArray(s) && s.includes(0),
		dragging: F,
		selection: i
	}]), r[54] = F, r[55] = i, r[56] = s, r[57] = Ce;
	else Ce = r[57];
	let we;
	r[58] !== I || r[59] !== J ? (we = I ? void 0 : (e) => Vn(e, J, L), r[58] = I, r[59] = J, r[60] = we) : we = r[60];
	let Te;
	r[61] === X ? Te = r[62] : (Te = (e) => Vn(e, X, L), r[61] = X, r[62] = Te);
	let Ee;
	r[63] === ne ? Ee = r[64] : (Ee = (e) => Vn(e, ne, L), r[63] = ne, r[64] = Ee);
	let De = I ? void 0 : g, Oe = I ? ge : _, ke = I ? Se : void 0, Ae = I ? oe : void 0, je = I ? ie : void 0, Me;
	r[65] === Symbol.for(`react.memo_cache_sentinel`) ? (Me = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rn, {}), r[65] = Me) : Me = r[65];
	let Ne;
	return r[66] !== b || r[67] !== v || r[68] !== ye || r[69] !== Ce || r[70] !== we || r[71] !== Te || r[72] !== Ee || r[73] !== De || r[74] !== Oe || r[75] !== ke || r[76] !== Ae || r[77] !== je ? (Ne = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(`div`, {
		className: Ce,
		onClick: we,
		onContextMenu: Te,
		onWheel: Ee,
		onPointerEnter: De,
		onPointerMove: Oe,
		onPointerUp: ye,
		onPointerCancel: ke,
		onPointerDownCapture: Ae,
		onClickCapture: je,
		onPointerLeave: v,
		ref: L,
		style: Pn,
		children: [b, Me]
	}), r[66] = b, r[67] = v, r[68] = ye, r[69] = Ce, r[70] = we, r[71] = Te, r[72] = Ee, r[73] = De, r[74] = Oe, r[75] = ke, r[76] = Ae, r[77] = je, r[78] = Ne) : Ne = r[78], Ne;
}
function Un(e) {
	return e.userSelectionActive && !e.nodesSelectionActive ? e : {
		userSelectionActive: !0,
		nodesSelectionActive: !1
	};
}
function Wn(e) {
	return e.id;
}
function Gn(e) {
	return e.paneDragging;
}
function Kn(e) {
	return e.autoPanSpeed;
}
function qn(e) {
	return e.panBy;
}
function Jn(e) {
	return e.elementsSelectable;
}
function Yn(e) {
	return e.userSelectionActive;
}
function Xn({ id: e, optionsStore: t, nodesStore: n, unselect: r = !1, nodeRef: i }) {
	let { addSelectedNodes: a, unselectNodesAndEdges: o, multiSelectionActive: s, onError: c, nodesSelectionActive: l } = t.getState(), { nodeLookup: u } = n.getState(), d = u.get(e);
	d ? (l && t.setState({ nodesSelectionActive: !1 }), d.selected ? (r || d.selected && s) && (o({
		nodes: [d],
		edges: []
	}), requestAnimationFrame(() => i?.current?.blur())) : a([e])) : c?.(`012`, errorMessages.error012(e));
}
function Zn(t) {
	let n = (0, import_dist.c)(16), { nodeRef: r, disabled: i, noDragClassName: a, handleSelector: o, nodeId: s, isSelectable: c } = t, l = i !== void 0 && i, { optionsStore: u, viewportStore: d, nodesStore: f, edgesStore: p } = $(), [m, h] = (0, import_react.useState)(!1), g = (0, import_react.useRef)(), _, v;
	n[0] !== l || n[1] !== p || n[2] !== r || n[3] !== f || n[4] !== u || n[5] !== d ? (_ = () => {
		if (!l) return g.current = XYDrag({
			getStoreItems: () => {
				let { nodes: e, nodeLookup: t } = f.getState(), { edges: n } = p.getState(), { transform: r } = d.getState();
				return {
					...u.getState(),
					nodes: e,
					nodeLookup: t,
					edges: n,
					transform: r
				};
			},
			onNodeMouseDown: (e) => {
				Xn({
					id: e,
					optionsStore: u,
					nodesStore: f,
					nodeRef: r
				});
			},
			onDragStart: () => {
				h(!0);
			},
			onDragStop: () => {
				h(!1);
			}
		}), () => {
			g.current?.destroy(), g.current = void 0;
		};
	}, v = [
		l,
		u,
		d,
		f,
		p,
		r
	], n[0] = l, n[1] = p, n[2] = r, n[3] = f, n[4] = u, n[5] = d, n[6] = _, n[7] = v) : (_ = n[6], v = n[7]), (0, import_react.useEffect)(_, v);
	let y, x;
	return n[8] !== l || n[9] !== o || n[10] !== c || n[11] !== a || n[12] !== s || n[13] !== r ? (y = () => {
		!l && r.current && g.current && g.current.update({
			noDragClassName: a,
			handleSelector: o,
			domNode: r.current,
			isSelectable: c,
			nodeId: s
		});
	}, x = [
		a,
		o,
		l,
		c,
		r,
		s
	], n[8] = l, n[9] = o, n[10] = c, n[11] = a, n[12] = s, n[13] = r, n[14] = y, n[15] = x) : (y = n[14], x = n[15]), (0, import_react.useEffect)(y, x), m;
}
var Qn = (e) => (t) => t.selected && (t.draggable || e && t.draggable === void 0);
function $n() {
	let t = (0, import_dist.c)(3), { optionsStore: n, nodesStore: r } = $(), i;
	return t[0] !== r || t[1] !== n ? (i = (e) => {
		let { nodeExtent: t, snapToGrid: i, snapGrid: a, nodesDraggable: o, onError: s, updateNodePositions: c, nodeOrigin: l } = n.getState(), { nodeLookup: u } = r.getState(), d = /* @__PURE__ */ new Map(), f = Qn(o), p = i ? a[0] : 5, m = i ? a[1] : 5, h = e.direction.x * p * e.factor, g = e.direction.y * m * e.factor;
		for (let [, e] of u) {
			if (!f(e)) continue;
			let n = {
				x: e.internals.positionAbsolute.x + h,
				y: e.internals.positionAbsolute.y + g
			};
			i && (n = snapPosition(n, a));
			let { position: r, positionAbsolute: o } = calculateNodePosition({
				nodeId: e.id,
				nextPosition: n,
				nodeLookup: u,
				nodeExtent: t,
				nodeOrigin: l,
				onError: s
			});
			e.position = r, e.internals.positionAbsolute = o, d.set(e.id, e);
		}
		c(d);
	}, t[0] = r, t[1] = n, t[2] = i) : i = t[2], i;
}
var er = (0, import_react.createContext)(null);
var tr = er.Provider;
er.Consumer;
var nr = () => (0, import_react.useContext)(er);
var rr = (0, import_react.createContext)(null);
function ir(t) {
	let n = (0, import_dist.c)(3), { children: r } = t, i = Q(xt(ar)), a;
	return n[0] !== r || n[1] !== i ? (a = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(rr.Provider, {
		value: i,
		children: r
	}), n[0] = r, n[1] = i, n[2] = a) : a = n[2], a;
}
function ar(e) {
	return {
		connectOnClick: e.connectOnClick,
		noPanClassName: e.noPanClassName,
		rfId: e.rfId,
		connectionMode: e.connectionMode
	};
}
function or() {
	let e = (0, import_react.useContext)(rr);
	if (!e) throw Error(`useHandleConfig must be used within a HandleConfigProvider`);
	return e;
}
function sr(t) {
	let n = (0, import_dist.c)(2), r;
	return n[0] === t ? r = n[1] : (r = (e) => {
		let { connection: n } = e;
		return t ? t(n) : n;
	}, n[0] = t, n[1] = r), Tt(xt(r));
}
function cr(t) {
	let n = (0, import_dist.c)(5), { optionsStore: r, connectionStore: i } = $(), a;
	n[0] !== t || n[1] !== r ? (a = (e) => r.getState().pubSub.subscribeToConnectionForHandle(t, e), n[0] = t, n[1] = r, n[2] = a) : a = n[2];
	let o = a, s;
	n[3] === i ? s = n[4] : (s = () => i.getState(), n[3] = i, n[4] = s);
	let c = s;
	return (0, import_react.useSyncExternalStore)(o, c, c);
}
var lr = {
	connectingFrom: !1,
	connectingTo: !1,
	clickConnecting: !1,
	isPossibleEndHandle: !0,
	connectionInProgress: !1,
	clickConnectionInProgress: !1,
	valid: !1
};
var ur = (e, t, n, r, i) => {
	let { connectionClickStartHandle: o, connection: s } = e, { fromHandle: c, toHandle: l, isValid: u } = s;
	if (!c && !o) return lr;
	let d = l?.nodeId === t && l?.id === n && l?.type === r;
	return {
		connectingFrom: c?.nodeId === t && c?.id === n && c?.type === r,
		connectingTo: d,
		clickConnecting: o?.nodeId === t && o?.id === n && o?.type === r,
		isPossibleEndHandle: i === ConnectionMode.Strict ? c?.type !== r : t !== c?.nodeId || n !== c?.id,
		connectionInProgress: s.inProgress,
		clickConnectionInProgress: !!o,
		valid: d && u
	};
};
function dr(n, r) {
	let i = (0, import_dist.c)(85), a, o, s, c, l, u, d, f, p, m, g, _, v;
	i[0] === n ? (a = i[1], o = i[2], s = i[3], c = i[4], l = i[5], u = i[6], d = i[7], f = i[8], p = i[9], m = i[10], g = i[11], _ = i[12], v = i[13]) : ({type: p, position: m, isValidConnection: c, isConnectable: g, isConnectableStart: _, isConnectableEnd: v, id: s, onConnect: l, children: a, className: o, onMouseDown: u, onTouchStart: d, ...f} = n, i[0] = n, i[1] = a, i[2] = o, i[3] = s, i[4] = c, i[5] = l, i[6] = u, i[7] = d, i[8] = f, i[9] = p, i[10] = m, i[11] = g, i[12] = _, i[13] = v);
	let y = p === void 0 ? `source` : p, b = m === void 0 ? Position.Top : m, S = g === void 0 || g, C = _ === void 0 || _, w = v === void 0 || v, T = s || null, E = y === `target`, { optionsStore: D, viewportStore: O, connectionStore: k, nodesStore: A, edgesStore: j } = $(), { connectOnClick: M, noPanClassName: N, rfId: P, connectionMode: F } = or(), I = nr();
	I || D.getState().onError?.(`010`, errorMessages.error010());
	let L = I || ``, R;
	i[14] !== T || i[15] !== L || i[16] !== y ? (R = {
		nodeId: L,
		type: y,
		id: T
	}, i[14] = T, i[15] = L, i[16] = y, i[17] = R) : R = i[17];
	let ee = cr(R), B, V, H, U, W, G, K;
	if (i[18] !== o || i[19] !== ee || i[20] !== F || i[21] !== k || i[22] !== j || i[23] !== T || i[24] !== S || i[25] !== w || i[26] !== C || i[27] !== E || i[28] !== c || i[29] !== N || i[30] !== I || i[31] !== A || i[32] !== l || i[33] !== u || i[34] !== d || i[35] !== D || i[36] !== b || i[37] !== P || i[38] !== y || i[39] !== O) {
		let e = ur(ee, I, T, y, F), n;
		i[47] !== j || i[48] !== l || i[49] !== D ? (n = (e) => {
			let { defaultEdgeOptions: t, onConnect: n, hasDefaultEdges: r } = D.getState(), i = {
				...t,
				...e
			};
			if (r) {
				let { edges: e } = j.getState(), { setEdges: t, onError: n } = D.getState();
				t(ln(i, e, { onError: n }));
			}
			n?.(i), l?.(i);
		}, i[47] = j, i[48] = l, i[49] = D, i[50] = n) : n = i[50];
		let r = n, a;
		i[51] !== k || i[52] !== T || i[53] !== C || i[54] !== E || i[55] !== c || i[56] !== I || i[57] !== A || i[58] !== r || i[59] !== u || i[60] !== d || i[61] !== D || i[62] !== O ? (a = (e) => {
			if (!I) return;
			let t = isMouseEvent(e.nativeEvent);
			if (C && (t && e.button === 0 || !t)) {
				let t = D.getState();
				XYHandle.onPointerDown(e.nativeEvent, {
					handleDomNode: e.currentTarget,
					autoPanOnConnect: t.autoPanOnConnect,
					connectionMode: t.connectionMode,
					connectionRadius: t.connectionRadius,
					domNode: t.domNode,
					nodeLookup: A.getState().nodeLookup,
					lib: `react`,
					isTarget: E,
					handleId: T,
					nodeId: I,
					flowId: t.rfId,
					panBy: t.panBy,
					cancelConnection: t.cancelConnection,
					onConnectStart: t.onConnectStart,
					onConnectEnd: (...e) => {
						let t = e;
						return D.getState().onConnectEnd?.(...t);
					},
					updateConnection: t.updateConnection,
					onConnect: r,
					isValidConnection: c || ((...e) => {
						let t = e;
						return D.getState().isValidConnection?.(...t) ?? !0;
					}),
					getTransform: () => O.getState().transform,
					getFromHandle: () => k.getState().connection.fromHandle,
					autoPanSpeed: t.autoPanSpeed,
					dragThreshold: t.connectionDragThreshold
				});
			}
			t ? u?.(e) : d?.(e);
		}, i[51] = k, i[52] = T, i[53] = C, i[54] = E, i[55] = c, i[56] = I, i[57] = A, i[58] = r, i[59] = u, i[60] = d, i[61] = D, i[62] = O, i[63] = a) : a = i[63], V = a;
		let s;
		i[64] !== k || i[65] !== T || i[66] !== C || i[67] !== c || i[68] !== I || i[69] !== A || i[70] !== r || i[71] !== D || i[72] !== y ? (s = (e) => {
			let { onClickConnectStart: t, onClickConnectEnd: n, updateConnectionClickStart: i, connectionMode: a, isValidConnection: o, rfId: s } = D.getState(), { connectionClickStartHandle: l, connection: u } = k.getState(), { nodeLookup: d } = A.getState();
			if (!I || !l && !C) return;
			if (!l) {
				t?.(e.nativeEvent, {
					nodeId: I,
					handleId: T,
					handleType: y
				}), i({
					nodeId: I,
					type: y,
					id: T
				});
				return;
			}
			let f = getHostForElement(e.target), p = c || o, { connection: m, isValid: h } = XYHandle.isValid(e.nativeEvent, {
				handle: {
					nodeId: I,
					id: T,
					type: y
				},
				connectionMode: a,
				fromNodeId: l.nodeId,
				fromHandleId: l.id || null,
				fromType: l.type,
				isValidConnection: p,
				flowId: s,
				doc: f,
				lib: `react`,
				nodeLookup: d
			});
			h && m && r(m);
			let g = structuredClone(u);
			delete g.inProgress, g.toPosition = g.toHandle ? g.toHandle.position : null, n?.(e, g), i(null);
		}, i[64] = k, i[65] = T, i[66] = C, i[67] = c, i[68] = I, i[69] = A, i[70] = r, i[71] = D, i[72] = y, i[73] = s) : s = i[73], B = s, G = T, K = I, H = b, U = `${P}-${I}-${T}-${y}`, W = cc([
			`react-flow__handle`,
			`react-flow__handle-${b}`,
			`nodrag`,
			N,
			o,
			{
				source: !E,
				target: E,
				connectable: S,
				connectablestart: C,
				connectableend: w,
				clickconnecting: e.clickConnecting,
				connectingfrom: e.connectingFrom,
				connectingto: e.connectingTo,
				valid: e.valid,
				connectionindicator: S && (!e.connectionInProgress || e.isPossibleEndHandle) && (e.connectionInProgress || e.clickConnecting ? w : C)
			}
		]), i[18] = o, i[19] = ee, i[20] = F, i[21] = k, i[22] = j, i[23] = T, i[24] = S, i[25] = w, i[26] = C, i[27] = E, i[28] = c, i[29] = N, i[30] = I, i[31] = A, i[32] = l, i[33] = u, i[34] = d, i[35] = D, i[36] = b, i[37] = P, i[38] = y, i[39] = O, i[40] = B, i[41] = V, i[42] = H, i[43] = U, i[44] = W, i[45] = G, i[46] = K;
	} else B = i[40], V = i[41], H = i[42], U = i[43], W = i[44], G = i[45], K = i[46];
	let q = M ? B : void 0, J;
	return i[74] !== a || i[75] !== V || i[76] !== r || i[77] !== f || i[78] !== H || i[79] !== U || i[80] !== W || i[81] !== q || i[82] !== G || i[83] !== K ? (J = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		"data-handleid": G,
		"data-nodeid": K,
		"data-handlepos": H,
		"data-id": U,
		className: W,
		onMouseDown: V,
		onTouchStart: V,
		onClick: q,
		ref: r,
		...f,
		children: a
	}), i[74] = a, i[75] = V, i[76] = r, i[77] = f, i[78] = H, i[79] = U, i[80] = W, i[81] = q, i[82] = G, i[83] = K, i[84] = J) : J = i[84], J;
}
var fr = (0, import_react.memo)(pn(dr));
function pr(t) {
	let n = (0, import_dist.c)(6), { data: r, isConnectable: i, sourcePosition: a } = t, o = a === void 0 ? Position.Bottom : a, s = r?.label, c;
	n[0] !== i || n[1] !== o ? (c = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
		type: `source`,
		position: o,
		isConnectable: i
	}), n[0] = i, n[1] = o, n[2] = c) : c = n[2];
	let l;
	return n[3] !== s || n[4] !== c ? (l = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [s, c] }), n[3] = s, n[4] = c, n[5] = l) : l = n[5], l;
}
function mr(t) {
	let n = (0, import_dist.c)(10), { data: r, isConnectable: i, targetPosition: a, sourcePosition: o } = t, s = a === void 0 ? Position.Top : a, c = o === void 0 ? Position.Bottom : o, l;
	n[0] !== i || n[1] !== s ? (l = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
		type: `target`,
		position: s,
		isConnectable: i
	}), n[0] = i, n[1] = s, n[2] = l) : l = n[2];
	let u = r?.label, d;
	n[3] !== i || n[4] !== c ? (d = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
		type: `source`,
		position: c,
		isConnectable: i
	}), n[3] = i, n[4] = c, n[5] = d) : d = n[5];
	let f;
	return n[6] !== l || n[7] !== u || n[8] !== d ? (f = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		l,
		u,
		d
	] }), n[6] = l, n[7] = u, n[8] = d, n[9] = f) : f = n[9], f;
}
function hr() {
	return null;
}
function gr(t) {
	let n = (0, import_dist.c)(6), { data: r, isConnectable: i, targetPosition: a } = t, o = a === void 0 ? Position.Top : a, s;
	n[0] !== i || n[1] !== o ? (s = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fr, {
		type: `target`,
		position: o,
		isConnectable: i
	}), n[0] = i, n[1] = o, n[2] = s) : s = n[2];
	let c = r?.label, l;
	return n[3] !== s || n[4] !== c ? (l = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [s, c] }), n[3] = s, n[4] = c, n[5] = l) : l = n[5], l;
}
var _r = {
	ArrowUp: {
		x: 0,
		y: -1
	},
	ArrowDown: {
		x: 0,
		y: 1
	},
	ArrowLeft: {
		x: -1,
		y: 0
	},
	ArrowRight: {
		x: 1,
		y: 0
	}
};
var vr = {
	input: pr,
	default: mr,
	output: gr,
	group: hr
};
function yr(e) {
	return e.internals.handleBounds === void 0 ? {
		width: e.width ?? e.initialWidth ?? e.style?.width,
		height: e.height ?? e.initialHeight ?? e.style?.height
	} : {
		width: e.width ?? e.style?.width,
		height: e.height ?? e.style?.height
	};
}
var br = (e) => {
	let { width: t, height: n, x: r, y: i } = getInternalNodesBounds(e.nodeLookup, { filter: (e) => !!e.selected });
	return {
		width: isNumeric(t) ? t : null,
		height: isNumeric(n) ? n : null,
		x: r,
		y: i
	};
};
function xr(n) {
	let r = (0, import_dist.c)(26), { onSelectionContextMenu: i, noPanClassName: a, disableKeyboardA11y: o } = n, { nodesStore: s } = $(), { width: c, height: l, x: u, y: d } = Et(xt(br)), f = Q(Cr), { transform: p } = wt(), m = `translate(${p[0]}px,${p[1]}px) scale(${p[2]}) translate(${u}px,${d}px)`, h = $n(), g = (0, import_react.useRef)(null), _, v;
	r[0] === o ? (_ = r[1], v = r[2]) : (_ = () => {
		o || g.current?.focus({ preventScroll: !0 });
	}, v = [o], r[0] = o, r[1] = _, r[2] = v), (0, import_react.useEffect)(_, v);
	let y = !f && c !== null && l !== null, b = !y, x;
	if (r[3] === b ? x = r[4] : (x = {
		nodeRef: g,
		disabled: b
	}, r[3] = b, r[4] = x), Zn(x), !y) return null;
	let S;
	r[5] !== s || r[6] !== i ? (S = i ? (e) => {
		let t = s.getState().nodes.filter(Sr);
		i(e, t);
	} : void 0, r[5] = s, r[6] = i, r[7] = S) : S = r[7];
	let C = S, w;
	r[8] === h ? w = r[9] : (w = (e) => {
		Object.prototype.hasOwnProperty.call(_r, e.key) && (e.preventDefault(), h({
			direction: _r[e.key],
			factor: e.shiftKey ? 4 : 1
		}));
	}, r[8] = h, r[9] = w);
	let T = w, E;
	r[10] === a ? E = r[11] : (E = cc([
		`react-flow__nodesselection`,
		`react-flow__container`,
		a
	]), r[10] = a, r[11] = E);
	let D;
	r[12] === m ? D = r[13] : (D = { transform: m }, r[12] = m, r[13] = D);
	let O = o ? void 0 : -1, k = o ? void 0 : T, A;
	r[14] !== l || r[15] !== c ? (A = {
		width: c,
		height: l
	}, r[14] = l, r[15] = c, r[16] = A) : A = r[16];
	let j;
	r[17] !== C || r[18] !== k || r[19] !== A || r[20] !== O ? (j = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		ref: g,
		className: `react-flow__nodesselection-rect`,
		onContextMenu: C,
		tabIndex: O,
		onKeyDown: k,
		style: A
	}), r[17] = C, r[18] = k, r[19] = A, r[20] = O, r[21] = j) : j = r[21];
	let M;
	return r[22] !== j || r[23] !== E || r[24] !== D ? (M = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		className: E,
		style: D,
		children: j
	}), r[22] = j, r[23] = E, r[24] = D, r[25] = M) : M = r[25], M;
}
function Sr(e) {
	return e.selected;
}
function Cr(e) {
	return e.userSelectionActive;
}
var wr = typeof window < `u` ? window : void 0;
function Tr(t) {
	let n = (0, import_dist.c)(54), { children: r, onPaneClick: i, onPaneMouseEnter: a, onPaneMouseMove: o, onPaneMouseLeave: s, onPaneContextMenu: c, onPaneScroll: l, paneDragThreshold: u, deleteKeyCode: d, selectionKeyCode: f, selectionOnDrag: p, selectionMode: m, onSelectionStart: h, onSelectionEnd: g, multiSelectionKeyCode: _, panActivationKeyCode: v, zoomActivationKeyCode: y, elementsSelectable: b, zoomOnScroll: x, zoomOnPinch: S, panOnScroll: C, panOnScrollSpeed: w, panOnScrollMode: T, zoomOnDoubleClick: E, panOnDrag: D, autoPanOnSelection: O, defaultViewport: k, translateExtent: A, minZoom: j, maxZoom: M, preventScrolling: N, onSelectionContextMenu: P, noWheelClassName: F, noPanClassName: I, disableKeyboardA11y: L, onViewportChange: R, isControlledViewport: ee } = t, z = Q(Dr), B = Q(Er), V;
	n[0] === Symbol.for(`react.memo_cache_sentinel`) ? (V = { target: wr }, n[0] = V) : V = n[0];
	let H = tn(f, V), U;
	n[1] === Symbol.for(`react.memo_cache_sentinel`) ? (U = { target: wr }, n[1] = U) : U = n[1];
	let W = tn(v, U), G = W || D, K = W || C, q;
	n[2] !== G || n[3] !== p ? (q = p && !isLeftClickPan(G ?? !0), n[2] = G, n[3] = p, n[4] = q) : q = n[4];
	let J = q, Y = H || B || J, X;
	n[5] !== d || n[6] !== _ ? (X = {
		deleteKeyCode: d,
		multiSelectionKeyCode: _
	}, n[5] = d, n[6] = _, n[7] = X) : X = n[7], Mn(X);
	let te = !H && G, ne = !!Y, re;
	n[8] !== L || n[9] !== I || n[10] !== z || n[11] !== P ? (re = z && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(xr, {
		onSelectionContextMenu: P,
		noPanClassName: I,
		disableKeyboardA11y: L
	}), n[8] = L, n[9] = I, n[10] = z, n[11] = P, n[12] = re) : re = n[12];
	let ie;
	n[13] !== J || n[14] !== O || n[15] !== r || n[16] !== i || n[17] !== c || n[18] !== a || n[19] !== s || n[20] !== o || n[21] !== l || n[22] !== g || n[23] !== h || n[24] !== G || n[25] !== u || n[26] !== H || n[27] !== m || n[28] !== ne || n[29] !== re ? (ie = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Hn, {
		onSelectionStart: h,
		onSelectionEnd: g,
		onPaneClick: i,
		onPaneMouseEnter: a,
		onPaneMouseMove: o,
		onPaneMouseLeave: s,
		onPaneContextMenu: c,
		onPaneScroll: l,
		panOnDrag: G,
		autoPanOnSelection: O,
		isSelecting: ne,
		selectionMode: m,
		selectionKeyPressed: H,
		paneDragThreshold: u,
		selectionOnDrag: J,
		children: [r, re]
	}), n[13] = J, n[14] = O, n[15] = r, n[16] = i, n[17] = c, n[18] = a, n[19] = s, n[20] = o, n[21] = l, n[22] = g, n[23] = h, n[24] = G, n[25] = u, n[26] = H, n[27] = m, n[28] = ne, n[29] = re, n[30] = ie) : ie = n[30];
	let ae;
	return n[31] !== k || n[32] !== b || n[33] !== ee || n[34] !== M || n[35] !== j || n[36] !== I || n[37] !== F || n[38] !== c || n[39] !== R || n[40] !== W || n[41] !== K || n[42] !== T || n[43] !== w || n[44] !== u || n[45] !== N || n[46] !== te || n[47] !== ie || n[48] !== A || n[49] !== y || n[50] !== E || n[51] !== S || n[52] !== x ? (ae = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fn, {
		onPaneContextMenu: c,
		elementsSelectable: b,
		zoomOnScroll: x,
		zoomOnPinch: S,
		panOnScroll: K,
		panActivationKeyPressed: W,
		panOnScrollSpeed: w,
		panOnScrollMode: T,
		zoomOnDoubleClick: E,
		panOnDrag: te,
		defaultViewport: k,
		translateExtent: A,
		minZoom: j,
		maxZoom: M,
		zoomActivationKeyCode: y,
		preventScrolling: N,
		noWheelClassName: F,
		noPanClassName: I,
		onViewportChange: R,
		isControlledViewport: ee,
		paneDragThreshold: u,
		children: ie
	}), n[31] = k, n[32] = b, n[33] = ee, n[34] = M, n[35] = j, n[36] = I, n[37] = F, n[38] = c, n[39] = R, n[40] = W, n[41] = K, n[42] = T, n[43] = w, n[44] = u, n[45] = N, n[46] = te, n[47] = ie, n[48] = A, n[49] = y, n[50] = E, n[51] = S, n[52] = x, n[53] = ae) : ae = n[53], ae;
}
function Er(e) {
	return e.userSelectionActive;
}
function Dr(e) {
	return e.nodesSelectionActive;
}
Tr.displayName = `FlowRenderer`;
var Or = Tr;
var kr = (e, t) => (n) => e ? getNodesInside(n.nodeLookup, {
	x: 0,
	y: 0,
	width: t.width,
	height: t.height
}, t.transform, !0).map((e) => e.id) : Array.from(n.nodeLookup.keys());
function Ar(t) {
	let n = (0, import_dist.c)(5), r;
	n[0] === t ? r = n[1] : (r = (e) => t ? e : void 0, n[0] = t, n[1] = r);
	let i = wt(r), a;
	return n[2] !== t || n[3] !== i ? (a = kr(t, i), n[2] = t, n[3] = i, n[4] = a) : a = n[4], Et(xt(a));
}
function jr() {
	let t = (0, import_dist.c)(5), { optionsStore: n } = $(), r;
	t[0] === n ? r = t[1] : (r = () => typeof ResizeObserver > `u` ? null : new ResizeObserver((e) => {
		let t = /* @__PURE__ */ new Map();
		e.forEach((e) => {
			let n = e.target.getAttribute(`data-id`);
			t.set(n, {
				id: n,
				nodeElement: e.target,
				force: !0
			});
		}), n.getState().updateNodeInternals(t);
	}), t[0] = n, t[1] = r);
	let [i] = (0, import_react.useState)(r), a, o;
	return t[2] === i ? (a = t[3], o = t[4]) : (a = () => () => {
		i?.disconnect();
	}, o = [i], t[2] = i, t[3] = a, t[4] = o), (0, import_react.useEffect)(a, o), i;
}
function Pr(t) {
	let n = (0, import_dist.c)(6), { optionsStore: r, nodesStore: i } = $(), a;
	n[0] !== t || n[1] !== r ? (a = (e) => r.getState().pubSub.subscribeToNode(t, e), n[0] = t, n[1] = r, n[2] = a) : a = n[2];
	let o = a, s;
	n[3] !== t || n[4] !== i ? (s = () => i.getState().nodeLookup.get(t), n[3] = t, n[4] = i, n[5] = s) : s = n[5];
	let c = s;
	return (0, import_react.useSyncExternalStore)(o, c, c);
}
function Lr(t) {
	let n = (0, import_dist.c)(23), { node: r, nodeType: i, hasDimensions: a, resizeObserver: o } = t, { optionsStore: s } = $(), c = (0, import_react.useRef)(null), l = (0, import_react.useRef)(null), u = (0, import_react.useRef)(r.sourcePosition), d = (0, import_react.useRef)(r.targetPosition), f = (0, import_react.useRef)(i), p = a && !!r.internals.handleBounds, m;
	n[0] !== p || n[1] !== r.hidden || n[2] !== o ? (m = () => {
		!c.current || r.hidden || p && l.current === c.current || (l.current && o?.unobserve(l.current), o?.observe(c.current), l.current = c.current);
	}, n[0] = p, n[1] = r.hidden, n[2] = o, n[3] = m) : m = n[3];
	let h;
	n[4] !== p || n[5] !== r.hidden || n[6] !== r.measured.height || n[7] !== r.measured.width ? (h = [
		p,
		r.hidden,
		r.measured.width,
		r.measured.height
	], n[4] = p, n[5] = r.hidden, n[6] = r.measured.height, n[7] = r.measured.width, n[8] = h) : h = n[8], (0, import_react.useEffect)(m, h);
	let g;
	n[9] === o ? g = n[10] : (g = () => () => {
		l.current && (o?.unobserve(l.current), l.current = null);
	}, n[9] = o, n[10] = g);
	let _;
	n[11] === Symbol.for(`react.memo_cache_sentinel`) ? (_ = [], n[11] = _) : _ = n[11], (0, import_react.useEffect)(g, _);
	let v;
	n[12] !== r.id || n[13] !== r.sourcePosition || n[14] !== r.targetPosition || n[15] !== i || n[16] !== s ? (v = () => {
		if (c.current) {
			let e = f.current !== i, t = u.current !== r.sourcePosition, n = d.current !== r.targetPosition;
			(e || t || n) && (f.current = i, u.current = r.sourcePosition, d.current = r.targetPosition, s.getState().updateNodeInternals(/* @__PURE__ */ new Map([[r.id, {
				id: r.id,
				nodeElement: c.current,
				force: !0
			}]])));
		}
	}, n[12] = r.id, n[13] = r.sourcePosition, n[14] = r.targetPosition, n[15] = i, n[16] = s, n[17] = v) : v = n[17];
	let y;
	return n[18] !== r.id || n[19] !== r.sourcePosition || n[20] !== r.targetPosition || n[21] !== i ? (y = [
		r.id,
		i,
		r.sourcePosition,
		r.targetPosition
	], n[18] = r.id, n[19] = r.sourcePosition, n[20] = r.targetPosition, n[21] = i, n[22] = y) : y = n[22], (0, import_react.useEffect)(v, y), c;
}
function Rr(n) {
	let r = (0, import_dist.c)(119), { id: i, onClick: a, onMouseEnter: o, onMouseMove: s, onMouseLeave: c, onContextMenu: l, onDoubleClick: u, nodesDraggable: d, elementsSelectable: f, nodesConnectable: p, nodesFocusable: m, resizeObserver: h, noDragClassName: g, noPanClassName: _, disableKeyboardA11y: v, rfId: y, nodeTypes: b, onError: x } = n, S = Pr(i), { internals: C } = S, w = S.type || `default`, T = b?.[w] || vr[w];
	T === void 0 && (x?.(`003`, errorMessages.error003(w)), w = `default`, T = b?.default || vr.default);
	let E = !!(S.draggable || d && S.draggable === void 0), D = !!(S.selectable || f && S.selectable === void 0), O = !!(S.connectable || p && S.connectable === void 0), k = !!(S.focusable || m && S.focusable === void 0), { optionsStore: A, viewportStore: j, nodesStore: M } = $(), N;
	r[0] === S ? N = r[1] : (N = nodeHasDimensions(S), r[0] = S, r[1] = N);
	let P = N, F;
	r[2] !== P || r[3] !== S || r[4] !== w || r[5] !== h ? (F = {
		node: S,
		nodeType: w,
		hasDimensions: P,
		resizeObserver: h
	}, r[2] = P, r[3] = S, r[4] = w, r[5] = h, r[6] = F) : F = r[6];
	let I = Lr(F), L = S.hidden || !E, R;
	r[7] !== i || r[8] !== D || r[9] !== g || r[10] !== S.dragHandle || r[11] !== I || r[12] !== L ? (R = {
		nodeRef: I,
		disabled: L,
		noDragClassName: g,
		handleSelector: S.dragHandle,
		nodeId: i,
		isSelectable: D
	}, r[7] = i, r[8] = D, r[9] = g, r[10] = S.dragHandle, r[11] = I, r[12] = L, r[13] = R) : R = r[13];
	let B = Zn(R), V = $n();
	if (S.hidden) return null;
	let H;
	r[14] === S ? H = r[15] : (H = getNodeDimensions(S), r[14] = S, r[15] = H);
	let U = H, W;
	r[16] === S ? W = r[17] : (W = yr(S), r[16] = S, r[17] = W);
	let G = W, K = D || E || a || o || s || c, q;
	r[18] !== C.userNode || r[19] !== o ? (q = o ? (e) => o(e, { ...C.userNode }) : void 0, r[18] = C.userNode, r[19] = o, r[20] = q) : q = r[20];
	let J = q, Y;
	r[21] !== C.userNode || r[22] !== s ? (Y = s ? (e) => s(e, { ...C.userNode }) : void 0, r[21] = C.userNode, r[22] = s, r[23] = Y) : Y = r[23];
	let X = Y, te;
	r[24] !== C.userNode || r[25] !== c ? (te = c ? (e) => c(e, { ...C.userNode }) : void 0, r[24] = C.userNode, r[25] = c, r[26] = te) : te = r[26];
	let ne = te, re;
	r[27] !== C.userNode || r[28] !== l ? (re = l ? (e) => l(e, { ...C.userNode }) : void 0, r[27] = C.userNode, r[28] = l, r[29] = re) : re = r[29];
	let ie = re, ae;
	r[30] !== C.userNode || r[31] !== u ? (ae = u ? (e) => u(e, { ...C.userNode }) : void 0, r[30] = C.userNode, r[31] = u, r[32] = ae) : ae = r[32];
	let oe = ae, se;
	r[33] !== i || r[34] !== C.userNode || r[35] !== E || r[36] !== D || r[37] !== I || r[38] !== M || r[39] !== a || r[40] !== A ? (se = (e) => {
		let { selectNodesOnDrag: t, nodeDragThreshold: n } = A.getState();
		D && (!t || !E || n > 0) && Xn({
			id: i,
			optionsStore: A,
			nodesStore: M,
			nodeRef: I
		}), a && a(e, { ...C.userNode });
	}, r[33] = i, r[34] = C.userNode, r[35] = E, r[36] = D, r[37] = I, r[38] = M, r[39] = a, r[40] = A, r[41] = se) : se = r[41];
	let ce = se, le;
	r[42] !== v || r[43] !== i || r[44] !== C.positionAbsolute || r[45] !== E || r[46] !== D || r[47] !== V || r[48] !== S.selected || r[49] !== I || r[50] !== M || r[51] !== A ? (le = (e) => {
		if (!(isInputDOMNode(e.nativeEvent) || v)) {
			if (elementSelectionKeys.includes(e.key) && D) {
				let t = e.key === `Escape`;
				Xn({
					id: i,
					optionsStore: A,
					nodesStore: M,
					unselect: t,
					nodeRef: I
				});
			} else if (E && S.selected && Object.prototype.hasOwnProperty.call(_r, e.key)) {
				e.preventDefault(), V({
					direction: _r[e.key],
					factor: e.shiftKey ? 4 : 1
				});
				let { ariaLabelConfig: t } = A.getState(), { nodeLookup: n } = M.getState(), r = n.get(i)?.internals.positionAbsolute ?? C.positionAbsolute;
				A.setState({ ariaLiveMessage: t[`node.a11yDescription.ariaLiveMessage`]({
					direction: e.key.replace(`Arrow`, ``).toLowerCase(),
					x: ~~r.x,
					y: ~~r.y
				}) });
			}
		}
	}, r[42] = v, r[43] = i, r[44] = C.positionAbsolute, r[45] = E, r[46] = D, r[47] = V, r[48] = S.selected, r[49] = I, r[50] = M, r[51] = A, r[52] = le) : le = r[52];
	let ue = le, de;
	r[53] !== v || r[54] !== i || r[55] !== S || r[56] !== U || r[57] !== I || r[58] !== A || r[59] !== j ? (de = () => {
		if (v || !I.current?.matches(`:focus-visible`)) return;
		let { transform: e, width: t, height: n } = j.getState(), { autoPanOnNodeFocus: r, setCenter: a } = A.getState();
		r && (getNodesInside(/* @__PURE__ */ new Map([[i, S]]), {
			x: 0,
			y: 0,
			width: t,
			height: n
		}, e, !0).length > 0 || a(S.position.x + U.width / 2, S.position.y + U.height / 2, { zoom: e[2] }));
	}, r[53] = v, r[54] = i, r[55] = S, r[56] = U, r[57] = I, r[58] = A, r[59] = j, r[60] = de) : de = r[60];
	let fe = de, me = `react-flow__node-${w}`, he;
	r[61] !== B || r[62] !== C.isParent || r[63] !== E || r[64] !== D || r[65] !== _ || r[66] !== S.className || r[67] !== S.selected || r[68] !== me ? (he = cc([
		`react-flow__node`,
		me,
		{ [_]: E },
		S.className,
		{
			selected: S.selected,
			selectable: D,
			parent: C.isParent,
			draggable: E,
			dragging: B
		}
	]), r[61] = B, r[62] = C.isParent, r[63] = E, r[64] = D, r[65] = _, r[66] = S.className, r[67] = S.selected, r[68] = me, r[69] = he) : he = r[69];
	let ge = `translate(${C.positionAbsolute.x}px,${C.positionAbsolute.y}px)`, ve = K ? `all` : `none`, ye = P ? `visible` : `hidden`, be;
	r[70] !== G || r[71] !== C.z || r[72] !== S.style || r[73] !== ge || r[74] !== ve || r[75] !== ye ? (be = {
		zIndex: C.z,
		transform: ge,
		pointerEvents: ve,
		visibility: ye,
		...S.style,
		...G
	}, r[70] = G, r[71] = C.z, r[72] = S.style, r[73] = ge, r[74] = ve, r[75] = ye, r[76] = be) : be = r[76];
	let xe = `rf__node-${i}`, Se = k ? ue : void 0, Ce = k ? 0 : void 0, we = k ? fe : void 0, Te = S.ariaRole ?? (k ? `group` : void 0), Ee = v ? void 0 : `${Mt}-${y}`, De = S.selected ?? !1, Oe = S.deletable ?? !0, ke;
	r[77] !== T || r[78] !== B || r[79] !== i || r[80] !== C.positionAbsolute.x || r[81] !== C.positionAbsolute.y || r[82] !== C.z || r[83] !== O || r[84] !== E || r[85] !== D || r[86] !== S.data || r[87] !== S.dragHandle || r[88] !== S.parentId || r[89] !== S.sourcePosition || r[90] !== S.targetPosition || r[91] !== U || r[92] !== w || r[93] !== De || r[94] !== Oe ? (ke = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(T, {
		id: i,
		data: S.data,
		type: w,
		positionAbsoluteX: C.positionAbsolute.x,
		positionAbsoluteY: C.positionAbsolute.y,
		selected: De,
		selectable: D,
		draggable: E,
		deletable: Oe,
		isConnectable: O,
		sourcePosition: S.sourcePosition,
		targetPosition: S.targetPosition,
		dragging: B,
		dragHandle: S.dragHandle,
		zIndex: C.z,
		parentId: S.parentId,
		...U
	}), r[77] = T, r[78] = B, r[79] = i, r[80] = C.positionAbsolute.x, r[81] = C.positionAbsolute.y, r[82] = C.z, r[83] = O, r[84] = E, r[85] = D, r[86] = S.data, r[87] = S.dragHandle, r[88] = S.parentId, r[89] = S.sourcePosition, r[90] = S.targetPosition, r[91] = U, r[92] = w, r[93] = De, r[94] = Oe, r[95] = ke) : ke = r[95];
	let Ae;
	r[96] !== i || r[97] !== ke ? (Ae = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(tr, {
		value: i,
		children: ke
	}), r[96] = i, r[97] = ke, r[98] = Ae) : Ae = r[98];
	let je;
	return r[99] !== i || r[100] !== S.ariaLabel || r[101] !== S.domAttributes || r[102] !== I || r[103] !== ie || r[104] !== oe || r[105] !== J || r[106] !== ne || r[107] !== X || r[108] !== ce || r[109] !== he || r[110] !== be || r[111] !== xe || r[112] !== Se || r[113] !== Ce || r[114] !== we || r[115] !== Te || r[116] !== Ee || r[117] !== Ae ? (je = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		className: he,
		ref: I,
		style: be,
		"data-id": i,
		"data-testid": xe,
		onMouseEnter: J,
		onMouseMove: X,
		onMouseLeave: ne,
		onContextMenu: ie,
		onClick: ce,
		onDoubleClick: oe,
		onKeyDown: Se,
		tabIndex: Ce,
		onFocus: we,
		role: Te,
		"aria-roledescription": `node`,
		"aria-describedby": Ee,
		"aria-label": S.ariaLabel,
		...S.domAttributes,
		children: Ae
	}), r[99] = i, r[100] = S.ariaLabel, r[101] = S.domAttributes, r[102] = I, r[103] = ie, r[104] = oe, r[105] = J, r[106] = ne, r[107] = X, r[108] = ce, r[109] = he, r[110] = be, r[111] = xe, r[112] = Se, r[113] = Ce, r[114] = we, r[115] = Te, r[116] = Ee, r[117] = Ae, r[118] = je) : je = r[118], je;
}
var zr = (0, import_react.memo)(Rr);
function Br(t) {
	let n = (0, import_dist.c)(41), r = Q(Wr), i = Q(Ur), a = Q(Hr), o = Q(Vr), s = Ar(t.onlyRenderVisibleElements), c = jr(), l;
	if (n[0] !== a || n[1] !== s || n[2] !== r || n[3] !== i || n[4] !== o || n[5] !== t.disableKeyboardA11y || n[6] !== t.noDragClassName || n[7] !== t.noPanClassName || n[8] !== t.nodeExtent || n[9] !== t.nodeTypes || n[10] !== t.nodesDraggable || n[11] !== t.onNodeClick || n[12] !== t.onNodeContextMenu || n[13] !== t.onNodeDoubleClick || n[14] !== t.onNodeMouseEnter || n[15] !== t.onNodeMouseLeave || n[16] !== t.onNodeMouseMove || n[17] !== t.rfId || n[18] !== c) {
		let e;
		n[20] !== a || n[21] !== r || n[22] !== i || n[23] !== o || n[24] !== t.disableKeyboardA11y || n[25] !== t.noDragClassName || n[26] !== t.noPanClassName || n[27] !== t.nodeExtent || n[28] !== t.nodeTypes || n[29] !== t.nodesDraggable || n[30] !== t.onNodeClick || n[31] !== t.onNodeContextMenu || n[32] !== t.onNodeDoubleClick || n[33] !== t.onNodeMouseEnter || n[34] !== t.onNodeMouseLeave || n[35] !== t.onNodeMouseMove || n[36] !== t.rfId || n[37] !== c ? (e = (e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(zr, {
			id: e,
			nodeTypes: t.nodeTypes,
			nodeExtent: t.nodeExtent,
			onClick: t.onNodeClick,
			onMouseEnter: t.onNodeMouseEnter,
			onMouseMove: t.onNodeMouseMove,
			onMouseLeave: t.onNodeMouseLeave,
			onContextMenu: t.onNodeContextMenu,
			onDoubleClick: t.onNodeDoubleClick,
			noDragClassName: t.noDragClassName,
			noPanClassName: t.noPanClassName,
			rfId: t.rfId,
			disableKeyboardA11y: t.disableKeyboardA11y,
			resizeObserver: c,
			nodesDraggable: t.nodesDraggable ?? !0,
			nodesConnectable: r,
			nodesFocusable: i,
			elementsSelectable: a,
			onError: o
		}, e), n[20] = a, n[21] = r, n[22] = i, n[23] = o, n[24] = t.disableKeyboardA11y, n[25] = t.noDragClassName, n[26] = t.noPanClassName, n[27] = t.nodeExtent, n[28] = t.nodeTypes, n[29] = t.nodesDraggable, n[30] = t.onNodeClick, n[31] = t.onNodeContextMenu, n[32] = t.onNodeDoubleClick, n[33] = t.onNodeMouseEnter, n[34] = t.onNodeMouseLeave, n[35] = t.onNodeMouseMove, n[36] = t.rfId, n[37] = c, n[38] = e) : e = n[38], l = s.map(e), n[0] = a, n[1] = s, n[2] = r, n[3] = i, n[4] = o, n[5] = t.disableKeyboardA11y, n[6] = t.noDragClassName, n[7] = t.noPanClassName, n[8] = t.nodeExtent, n[9] = t.nodeTypes, n[10] = t.nodesDraggable, n[11] = t.onNodeClick, n[12] = t.onNodeContextMenu, n[13] = t.onNodeDoubleClick, n[14] = t.onNodeMouseEnter, n[15] = t.onNodeMouseLeave, n[16] = t.onNodeMouseMove, n[17] = t.rfId, n[18] = c, n[19] = l;
	} else l = n[19];
	let u;
	return n[39] === l ? u = n[40] : (u = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		className: `react-flow__nodes`,
		style: Pn,
		children: l
	}), n[39] = l, n[40] = u), u;
}
function Vr(e) {
	return e.onError;
}
function Hr(e) {
	return e.elementsSelectable;
}
function Ur(e) {
	return e.nodesFocusable;
}
function Wr(e) {
	return e.nodesConnectable;
}
Br.displayName = `NodeRenderer`;
var Gr = (0, import_react.memo)(Br);
function Kr(t) {
	let n = (0, import_dist.c)(8), r;
	n[0] === t ? r = n[1] : (r = (e) => t ? e : void 0, n[0] = t, n[1] = r);
	let i = wt(r), a;
	n[2] === t ? a = n[3] : (a = (e) => t ? e : void 0, n[2] = t, n[3] = a);
	let o = Et(a), s;
	return n[4] !== o || n[5] !== t || n[6] !== i ? (s = (e) => {
		if (!t) return e.edges.map(qr);
		let n = [];
		if (i.width && i.height) for (let t of e.edges) {
			let e = o.nodeLookup.get(t.source), r = o.nodeLookup.get(t.target);
			e && r && isEdgeVisible({
				sourceNode: e,
				targetNode: r,
				width: i.width,
				height: i.height,
				transform: i.transform
			}) && n.push(t.id);
		}
		return n;
	}, n[4] = o, n[5] = t, n[6] = i, n[7] = s) : s = n[7], Dt(xt(s));
}
function qr(e) {
	return e.id;
}
var Jr = (t) => {
	let n = (0, import_dist.c)(5), { color: r, strokeWidth: i } = t, a = r === void 0 ? `none` : r, o = i === void 0 ? 1 : i, s;
	n[0] === a ? s = n[1] : (s = a && { stroke: a }, n[0] = a, n[1] = s);
	let c;
	if (n[2] !== o || n[3] !== s) {
		let e = {
			strokeWidth: o,
			...s
		};
		c = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`polyline`, {
			className: `arrow`,
			style: e,
			strokeLinecap: `round`,
			fill: `none`,
			strokeLinejoin: `round`,
			points: `-5,-4 0,0 -5,4`
		}), n[2] = o, n[3] = s, n[4] = c;
	} else c = n[4];
	return c;
};
var Yr = (t) => {
	let n = (0, import_dist.c)(5), { color: r, strokeWidth: i } = t, a = r === void 0 ? `none` : r, o = i === void 0 ? 1 : i, s;
	n[0] === a ? s = n[1] : (s = a && {
		stroke: a,
		fill: a
	}, n[0] = a, n[1] = s);
	let c;
	if (n[2] !== o || n[3] !== s) {
		let e = {
			strokeWidth: o,
			...s
		};
		c = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`polyline`, {
			className: `arrowclosed`,
			style: e,
			strokeLinecap: `round`,
			strokeLinejoin: `round`,
			points: `-5,-4 0,0 -5,4 -5,-4`
		}), n[2] = o, n[3] = s, n[4] = c;
	} else c = n[4];
	return c;
};
var Xr = {
	[MarkerType.Arrow]: Jr,
	[MarkerType.ArrowClosed]: Yr
};
var Zr = (t) => {
	let n = (0, import_dist.c)(11), { id: r, type: i, color: a, width: o, height: s, markerUnits: c, strokeWidth: l, orient: u, onError: d } = t, f = o === void 0 ? 12.5 : o, p = s === void 0 ? 12.5 : s, m = c === void 0 ? `strokeWidth` : c, h = u === void 0 ? `auto-start-reverse` : u;
	if (!Object.hasOwn(Xr, i)) return d?.(`009`, errorMessages.error009(i)), null;
	let g = Xr[i], _ = `${f}`, v = `${p}`, y;
	n[0] !== g || n[1] !== a || n[2] !== l ? (y = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(g, {
		color: a,
		strokeWidth: l
	}), n[0] = g, n[1] = a, n[2] = l, n[3] = y) : y = n[3];
	let b;
	return n[4] !== r || n[5] !== m || n[6] !== h || n[7] !== _ || n[8] !== v || n[9] !== y ? (b = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`marker`, {
		className: `react-flow__arrowhead`,
		id: r,
		markerWidth: _,
		markerHeight: v,
		viewBox: `-10 -10 20 20`,
		markerUnits: m,
		orient: h,
		refX: `0`,
		refY: `0`,
		children: y
	}), n[4] = r, n[5] = m, n[6] = h, n[7] = _, n[8] = v, n[9] = y, n[10] = b) : b = n[10], b;
};
var Qr = (t) => {
	let n = (0, import_dist.c)(18), { defaultColor: r, rfId: i, onError: a } = t, o = Q(ei), { edges: s } = Dt(), c, l, u, d;
	if (n[0] !== r || n[1] !== o?.markerEnd || n[2] !== o?.markerStart || n[3] !== s || n[4] !== a || n[5] !== i) {
		d = Symbol.for(`react.early_return_sentinel`);
		bb0: {
			let e = createMarkerIds(s, {
				id: i,
				defaultColor: r,
				defaultMarkerStart: o?.markerStart,
				defaultMarkerEnd: o?.markerEnd
			});
			if (!e.length) {
				d = null;
				break bb0;
			}
			l = `react-flow__marker`, u = `true`;
			let t;
			n[10] === a ? t = n[11] : (t = (e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zr, {
				id: e.id,
				type: e.type,
				color: e.color,
				width: e.width,
				height: e.height,
				markerUnits: e.markerUnits,
				strokeWidth: e.strokeWidth,
				orient: e.orient,
				onError: a
			}, e.id), n[10] = a, n[11] = t), c = e.map(t);
		}
		n[0] = r, n[1] = o?.markerEnd, n[2] = o?.markerStart, n[3] = s, n[4] = a, n[5] = i, n[6] = c, n[7] = l, n[8] = u, n[9] = d;
	} else c = n[6], l = n[7], u = n[8], d = n[9];
	if (d !== Symbol.for(`react.early_return_sentinel`)) return d;
	let f;
	n[12] === c ? f = n[13] : (f = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`defs`, { children: c }), n[12] = c, n[13] = f);
	let p;
	return n[14] !== l || n[15] !== u || n[16] !== f ? (p = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		className: l,
		"aria-hidden": u,
		children: f
	}), n[14] = l, n[15] = u, n[16] = f, n[17] = p) : p = n[17], p;
};
Qr.displayName = `MarkerDefinitions`;
var $r = (0, import_react.memo)(Qr);
function ei(e) {
	return e.defaultEdgeOptions;
}
function ni(t) {
	let n = (0, import_dist.c)(6), { optionsStore: r, edgesStore: i } = $(), a;
	n[0] !== t || n[1] !== r ? (a = (e) => r.getState().pubSub.subscribeToEdge(t, e), n[0] = t, n[1] = r, n[2] = a) : a = n[2];
	let o = a, s;
	n[3] !== i || n[4] !== t ? (s = () => i.getState().edgeLookup.get(t), n[3] = i, n[4] = t, n[5] = s) : s = n[5];
	let c = s;
	return (0, import_react.useSyncExternalStore)(o, c, c);
}
var ri = [2, 4];
function ii(n) {
	let r = (0, import_dist.c)(37), i, a, o, s, c, l, u, d, f, p, m;
	r[0] === n ? (i = r[1], a = r[2], o = r[3], s = r[4], c = r[5], l = r[6], u = r[7], d = r[8], f = r[9], p = r[10], m = r[11]) : ({x: p, y: m, label: o, labelStyle: c, labelShowBg: u, labelBgStyle: s, labelBgPadding: d, labelBgBorderRadius: f, children: i, className: a, ...l} = n, r[0] = n, r[1] = i, r[2] = a, r[3] = o, r[4] = s, r[5] = c, r[6] = l, r[7] = u, r[8] = d, r[9] = f, r[10] = p, r[11] = m);
	let h = u === void 0 || u, g = d === void 0 ? ri : d, _ = f === void 0 ? 2 : f, v;
	r[12] === Symbol.for(`react.memo_cache_sentinel`) ? (v = {
		x: 1,
		y: 0,
		width: 0,
		height: 0
	}, r[12] = v) : v = r[12];
	let [y, b] = (0, import_react.useState)(v), x;
	r[13] === a ? x = r[14] : (x = cc([`react-flow__edge-textwrapper`, a]), r[13] = a, r[14] = x);
	let S = x, C = (0, import_react.useRef)(null), w;
	r[15] === Symbol.for(`react.memo_cache_sentinel`) ? (w = () => {
		if (C.current) {
			let e = C.current.getBBox();
			b({
				x: e.x,
				y: e.y,
				width: e.width,
				height: e.height
			});
		}
	}, r[15] = w) : w = r[15];
	let T;
	if (r[16] === o ? T = r[17] : (T = [o], r[16] = o, r[17] = T), (0, import_react.useEffect)(w, T), !o) return null;
	let E = `translate(${p - y.width / 2} ${m - y.height / 2})`, D = y.width ? `visible` : `hidden`, O;
	r[18] !== y.height || r[19] !== y.width || r[20] !== _ || r[21] !== g || r[22] !== s || r[23] !== h ? (O = h && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`rect`, {
		width: y.width + 2 * g[0],
		x: -g[0],
		y: -g[1],
		height: y.height + 2 * g[1],
		className: `react-flow__edge-textbg`,
		style: s,
		rx: _,
		ry: _
	}), r[18] = y.height, r[19] = y.width, r[20] = _, r[21] = g, r[22] = s, r[23] = h, r[24] = O) : O = r[24];
	let k = y.height / 2, A;
	r[25] !== o || r[26] !== c || r[27] !== k ? (A = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`text`, {
		className: `react-flow__edge-text`,
		y: k,
		dy: `0.3em`,
		ref: C,
		style: c,
		children: o
	}), r[25] = o, r[26] = c, r[27] = k, r[28] = A) : A = r[28];
	let j;
	return r[29] !== i || r[30] !== S || r[31] !== l || r[32] !== O || r[33] !== A || r[34] !== E || r[35] !== D ? (j = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(`g`, {
		transform: E,
		className: S,
		visibility: D,
		...l,
		children: [
			O,
			A,
			i
		]
	}), r[29] = i, r[30] = S, r[31] = l, r[32] = O, r[33] = A, r[34] = E, r[35] = D, r[36] = j) : j = r[36], j;
}
ii.displayName = `EdgeText`;
var ai = (0, import_react.memo)(ii);
function oi(n) {
	let r = (0, import_dist.c)(36), i, a, o, s, c, l, u, d, f, p, m, h, g, _;
	if (r[0] !== n) {
		let { path: e, labelX: v, labelY: y, label: b, labelStyle: x, labelShowBg: S, labelBgStyle: C, labelBgPadding: w, labelBgBorderRadius: T, interactionWidth: E, ...D } = n;
		p = e, d = v, f = y, a = b, u = x, l = S, c = C, s = w, o = T, i = E === void 0 ? 20 : E, m = D, h = p, g = `none`, _ = cc([`react-flow__edge-path`, D.className]), r[0] = n, r[1] = i, r[2] = a, r[3] = o, r[4] = s, r[5] = c, r[6] = l, r[7] = u, r[8] = d, r[9] = f, r[10] = p, r[11] = m, r[12] = h, r[13] = g, r[14] = _;
	} else i = r[1], a = r[2], o = r[3], s = r[4], c = r[5], l = r[6], u = r[7], d = r[8], f = r[9], p = r[10], m = r[11], h = r[12], g = r[13], _ = r[14];
	let v;
	r[15] !== m || r[16] !== h || r[17] !== g || r[18] !== _ ? (v = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, {
		...m,
		d: h,
		fill: g,
		className: _
	}), r[15] = m, r[16] = h, r[17] = g, r[18] = _, r[19] = v) : v = r[19];
	let y;
	r[20] !== i || r[21] !== p ? (y = i ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, {
		d: p,
		fill: `none`,
		strokeOpacity: 0,
		strokeWidth: i,
		className: `react-flow__edge-interaction`
	}) : null, r[20] = i, r[21] = p, r[22] = y) : y = r[22];
	let b;
	r[23] !== a || r[24] !== o || r[25] !== s || r[26] !== c || r[27] !== l || r[28] !== u || r[29] !== d || r[30] !== f ? (b = a && isNumeric(d) && isNumeric(f) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ai, {
		x: d,
		y: f,
		label: a,
		labelStyle: u,
		labelShowBg: l,
		labelBgStyle: c,
		labelBgPadding: s,
		labelBgBorderRadius: o
	}) : null, r[23] = a, r[24] = o, r[25] = s, r[26] = c, r[27] = l, r[28] = u, r[29] = d, r[30] = f, r[31] = b) : b = r[31];
	let x;
	return r[32] !== v || r[33] !== y || r[34] !== b ? (x = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		v,
		y,
		b
	] }), r[32] = v, r[33] = y, r[34] = b, r[35] = x) : x = r[35], x;
}
function si({ pos: e, x1: t, y1: n, x2: r, y2: i }) {
	return e === Position.Left || e === Position.Right ? [.5 * (t + r), n] : [t, .5 * (n + i)];
}
function ci({ sourceX: e, sourceY: t, sourcePosition: n = Position.Bottom, targetX: r, targetY: i, targetPosition: a = Position.Top }) {
	let [o, s] = si({
		pos: n,
		x1: e,
		y1: t,
		x2: r,
		y2: i
	}), [c, l] = si({
		pos: a,
		x1: r,
		y1: i,
		x2: e,
		y2: t
	}), [u, d, f, p] = getBezierEdgeCenter({
		sourceX: e,
		sourceY: t,
		targetX: r,
		targetY: i,
		sourceControlX: o,
		sourceControlY: s,
		targetControlX: c,
		targetControlY: l
	});
	return [
		`M${e},${t} C${o},${s} ${c},${l} ${r},${i}`,
		u,
		d,
		f,
		p
	];
}
function li(t) {
	function n(n) {
		let r = (0, import_dist.c)(22), { id: i, sourceX: a, sourceY: o, targetX: s, targetY: c, sourcePosition: l, targetPosition: u, label: d, labelStyle: f, labelShowBg: p, labelBgStyle: m, labelBgPadding: h, labelBgBorderRadius: g, style: _, markerEnd: v, markerStart: y, interactionWidth: b } = n, x;
		r[0] !== l || r[1] !== a || r[2] !== o || r[3] !== u || r[4] !== s || r[5] !== c ? (x = ci({
			sourceX: a,
			sourceY: o,
			sourcePosition: l,
			targetX: s,
			targetY: c,
			targetPosition: u
		}), r[0] = l, r[1] = a, r[2] = o, r[3] = u, r[4] = s, r[5] = c, r[6] = x) : x = r[6];
		let [S, C, w] = x, T = t.isInternal ? void 0 : i, E;
		return r[7] !== T || r[8] !== b || r[9] !== d || r[10] !== g || r[11] !== h || r[12] !== m || r[13] !== p || r[14] !== f || r[15] !== C || r[16] !== w || r[17] !== v || r[18] !== y || r[19] !== S || r[20] !== _ ? (E = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(oi, {
			id: T,
			path: S,
			labelX: C,
			labelY: w,
			label: d,
			labelStyle: f,
			labelShowBg: p,
			labelBgStyle: m,
			labelBgPadding: h,
			labelBgBorderRadius: g,
			style: _,
			markerEnd: v,
			markerStart: y,
			interactionWidth: b
		}), r[7] = T, r[8] = b, r[9] = d, r[10] = g, r[11] = h, r[12] = m, r[13] = p, r[14] = f, r[15] = C, r[16] = w, r[17] = v, r[18] = y, r[19] = S, r[20] = _, r[21] = E) : E = r[21], E;
	}
	return n.displayName = t.isInternal ? `SimpleBezierEdgeInternal` : `SimpleBezierEdge`, (0, import_react.memo)(n);
}
li({ isInternal: !1 });
var di = li({ isInternal: !0 });
function fi(t) {
	function n(n) {
		let r = (0, import_dist.c)(25), { id: i, sourceX: a, sourceY: o, targetX: s, targetY: c, label: l, labelStyle: u, labelShowBg: d, labelBgStyle: f, labelBgPadding: p, labelBgBorderRadius: m, style: g, sourcePosition: _, targetPosition: v, markerEnd: y, markerStart: b, pathOptions: x, interactionWidth: S } = n, C = _ === void 0 ? Position.Bottom : _, w = v === void 0 ? Position.Top : v, T = x?.borderRadius, E = x?.offset, D = x?.stepPosition, O;
		r[0] !== C || r[1] !== a || r[2] !== o || r[3] !== T || r[4] !== E || r[5] !== D || r[6] !== w || r[7] !== s || r[8] !== c ? (O = getSmoothStepPath({
			sourceX: a,
			sourceY: o,
			sourcePosition: C,
			targetX: s,
			targetY: c,
			targetPosition: w,
			borderRadius: T,
			offset: E,
			stepPosition: D
		}), r[0] = C, r[1] = a, r[2] = o, r[3] = T, r[4] = E, r[5] = D, r[6] = w, r[7] = s, r[8] = c, r[9] = O) : O = r[9];
		let [k, A, j] = O, M = t.isInternal ? void 0 : i, N;
		return r[10] !== M || r[11] !== S || r[12] !== l || r[13] !== m || r[14] !== p || r[15] !== f || r[16] !== d || r[17] !== u || r[18] !== A || r[19] !== j || r[20] !== y || r[21] !== b || r[22] !== k || r[23] !== g ? (N = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(oi, {
			id: M,
			path: k,
			labelX: A,
			labelY: j,
			label: l,
			labelStyle: u,
			labelShowBg: d,
			labelBgStyle: f,
			labelBgPadding: p,
			labelBgBorderRadius: m,
			style: g,
			markerEnd: y,
			markerStart: b,
			interactionWidth: S
		}), r[10] = M, r[11] = S, r[12] = l, r[13] = m, r[14] = p, r[15] = f, r[16] = d, r[17] = u, r[18] = A, r[19] = j, r[20] = y, r[21] = b, r[22] = k, r[23] = g, r[24] = N) : N = r[24], N;
	}
	return n.displayName = t.isInternal ? `SmoothStepEdgeInternal` : `SmoothStepEdge`, (0, import_react.memo)(n);
}
var pi = fi({ isInternal: !1 });
var mi = fi({ isInternal: !0 });
function hi(t) {
	function n(n) {
		let r = (0, import_dist.c)(9), i, a;
		r[0] === n ? (i = r[1], a = r[2]) : ({id: i, ...a} = n, r[0] = n, r[1] = i, r[2] = a);
		let o = t.isInternal ? void 0 : i, s = a.pathOptions?.offset, c;
		r[3] === s ? c = r[4] : (c = {
			borderRadius: 0,
			offset: s
		}, r[3] = s, r[4] = c);
		let l;
		return r[5] !== o || r[6] !== a || r[7] !== c ? (l = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(pi, {
			...a,
			id: o,
			pathOptions: c
		}), r[5] = o, r[6] = a, r[7] = c, r[8] = l) : l = r[8], l;
	}
	return n.displayName = t.isInternal ? `StepEdgeInternal` : `StepEdge`, (0, import_react.memo)(n);
}
hi({ isInternal: !1 });
var _i = hi({ isInternal: !0 });
function vi(t) {
	function n(n) {
		let r = (0, import_dist.c)(20), { id: i, sourceX: a, sourceY: o, targetX: s, targetY: c, label: l, labelStyle: u, labelShowBg: d, labelBgStyle: f, labelBgPadding: p, labelBgBorderRadius: m, style: h, markerEnd: g, markerStart: _, interactionWidth: v } = n, y;
		r[0] !== a || r[1] !== o || r[2] !== s || r[3] !== c ? (y = getStraightPath({
			sourceX: a,
			sourceY: o,
			targetX: s,
			targetY: c
		}), r[0] = a, r[1] = o, r[2] = s, r[3] = c, r[4] = y) : y = r[4];
		let [b, x, S] = y, C = t.isInternal ? void 0 : i, w;
		return r[5] !== C || r[6] !== v || r[7] !== l || r[8] !== m || r[9] !== p || r[10] !== f || r[11] !== d || r[12] !== u || r[13] !== x || r[14] !== S || r[15] !== g || r[16] !== _ || r[17] !== b || r[18] !== h ? (w = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(oi, {
			id: C,
			path: b,
			labelX: x,
			labelY: S,
			label: l,
			labelStyle: u,
			labelShowBg: d,
			labelBgStyle: f,
			labelBgPadding: p,
			labelBgBorderRadius: m,
			style: h,
			markerEnd: g,
			markerStart: _,
			interactionWidth: v
		}), r[5] = C, r[6] = v, r[7] = l, r[8] = m, r[9] = p, r[10] = f, r[11] = d, r[12] = u, r[13] = x, r[14] = S, r[15] = g, r[16] = _, r[17] = b, r[18] = h, r[19] = w) : w = r[19], w;
	}
	return n.displayName = t.isInternal ? `StraightEdgeInternal` : `StraightEdge`, (0, import_react.memo)(n);
}
vi({ isInternal: !1 });
var bi = vi({ isInternal: !0 });
function xi(t) {
	function n(n) {
		let r = (0, import_dist.c)(23), { id: i, sourceX: a, sourceY: o, targetX: s, targetY: c, sourcePosition: l, targetPosition: u, label: d, labelStyle: f, labelShowBg: p, labelBgStyle: m, labelBgPadding: g, labelBgBorderRadius: _, style: v, markerEnd: y, markerStart: b, pathOptions: x, interactionWidth: S } = n, C = l === void 0 ? Position.Bottom : l, w = u === void 0 ? Position.Top : u, T = x?.curvature, E;
		r[0] !== C || r[1] !== a || r[2] !== o || r[3] !== T || r[4] !== w || r[5] !== s || r[6] !== c ? (E = getBezierPath({
			sourceX: a,
			sourceY: o,
			sourcePosition: C,
			targetX: s,
			targetY: c,
			targetPosition: w,
			curvature: T
		}), r[0] = C, r[1] = a, r[2] = o, r[3] = T, r[4] = w, r[5] = s, r[6] = c, r[7] = E) : E = r[7];
		let [D, O, k] = E, A = t.isInternal ? void 0 : i, j;
		return r[8] !== A || r[9] !== S || r[10] !== d || r[11] !== _ || r[12] !== g || r[13] !== m || r[14] !== p || r[15] !== f || r[16] !== O || r[17] !== k || r[18] !== y || r[19] !== b || r[20] !== D || r[21] !== v ? (j = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(oi, {
			id: A,
			path: D,
			labelX: O,
			labelY: k,
			label: d,
			labelStyle: f,
			labelShowBg: p,
			labelBgStyle: m,
			labelBgPadding: g,
			labelBgBorderRadius: _,
			style: v,
			markerEnd: y,
			markerStart: b,
			interactionWidth: S
		}), r[8] = A, r[9] = S, r[10] = d, r[11] = _, r[12] = g, r[13] = m, r[14] = p, r[15] = f, r[16] = O, r[17] = k, r[18] = y, r[19] = b, r[20] = D, r[21] = v, r[22] = j) : j = r[22], j;
	}
	return n.displayName = t.isInternal ? `BezierEdgeInternal` : `BezierEdge`, (0, import_react.memo)(n);
}
xi({ isInternal: !1 });
var Ci = {
	default: xi({ isInternal: !0 }),
	straight: bi,
	step: _i,
	smoothstep: mi,
	simplebezier: di
};
var wi = {
	sourceX: null,
	sourceY: null,
	targetX: null,
	targetY: null,
	sourcePosition: null,
	targetPosition: null,
	zIndex: void 0
};
var Ti = (e, t, n) => n === Position.Left ? e - t : n === Position.Right ? e + t : e;
var Ei = (e, t, n) => n === Position.Top ? e - t : n === Position.Bottom ? e + t : e;
var Di = `react-flow__edgeupdater`;
function Oi(n) {
	let r = (0, import_dist.c)(18), { position: i, centerX: a, centerY: o, radius: s, onMouseDown: c, onMouseEnter: l, onMouseOut: u, type: d } = n, f = s === void 0 ? 10 : s, p = `${Di}-${d}`, m;
	r[0] === p ? m = r[1] : (m = cc([Di, p]), r[0] = p, r[1] = m);
	let h;
	r[2] !== a || r[3] !== i || r[4] !== f ? (h = Ti(a, f, i), r[2] = a, r[3] = i, r[4] = f, r[5] = h) : h = r[5];
	let g;
	r[6] !== o || r[7] !== i || r[8] !== f ? (g = Ei(o, f, i), r[6] = o, r[7] = i, r[8] = f, r[9] = g) : g = r[9];
	let _;
	return r[10] !== c || r[11] !== l || r[12] !== u || r[13] !== f || r[14] !== m || r[15] !== h || r[16] !== g ? (_ = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`circle`, {
		onMouseDown: c,
		onMouseEnter: l,
		onMouseOut: u,
		className: m,
		cx: h,
		cy: g,
		r: f,
		stroke: `transparent`,
		fill: `transparent`
	}), r[10] = c, r[11] = l, r[12] = u, r[13] = f, r[14] = m, r[15] = h, r[16] = g, r[17] = _) : _ = r[17], _;
}
function ki(t) {
	let n = (0, import_dist.c)(43), { isReconnectable: r, reconnectRadius: i, edge: a, sourceX: o, sourceY: s, targetX: c, targetY: l, sourcePosition: u, targetPosition: d, onReconnect: f, onReconnectStart: p, onReconnectEnd: m, setReconnecting: h, setUpdateHover: g } = t, { optionsStore: _, viewportStore: v, connectionStore: y, nodesStore: b } = $(), S;
	n[0] !== y || n[1] !== a || n[2] !== b || n[3] !== f || n[4] !== m || n[5] !== p || n[6] !== _ || n[7] !== h || n[8] !== v ? (S = (e, t) => {
		if (e.button !== 0) return;
		let { autoPanOnConnect: n, domNode: r, connectionMode: i, connectionRadius: o, onConnectStart: s, cancelConnection: c, rfId: l, panBy: u, updateConnection: d } = _.getState(), { nodeLookup: g } = b.getState(), S = t.type === `target`;
		XYHandle.onPointerDown(e.nativeEvent, {
			autoPanOnConnect: n,
			connectionMode: i,
			connectionRadius: o,
			domNode: r,
			handleId: t.id,
			nodeId: t.nodeId,
			nodeLookup: g,
			isTarget: S,
			edgeUpdaterType: t.type,
			lib: `react`,
			flowId: l,
			cancelConnection: c,
			panBy: u,
			isValidConnection: (...e) => {
				let t = e;
				return _.getState().isValidConnection?.(...t) ?? !0;
			},
			onConnect: (e) => f?.(a, e),
			onConnectStart: (n, r) => {
				h(!0), p?.(e, a, t.type), s?.(n, r);
			},
			onConnectEnd: (...e) => {
				let t = e;
				return _.getState().onConnectEnd?.(...t);
			},
			onReconnectEnd: (e, n) => {
				h(!1), m?.(e, a, t.type, n);
			},
			updateConnection: d,
			getTransform: () => v.getState().transform,
			getFromHandle: () => y.getState().connection.fromHandle,
			dragThreshold: _.getState().connectionDragThreshold,
			handleDomNode: e.currentTarget
		});
	}, n[0] = y, n[1] = a, n[2] = b, n[3] = f, n[4] = m, n[5] = p, n[6] = _, n[7] = h, n[8] = v, n[9] = S) : S = n[9];
	let C = S, w;
	n[10] !== a.target || n[11] !== a.targetHandle || n[12] !== C ? (w = (e) => C(e, {
		nodeId: a.target,
		id: a.targetHandle ?? null,
		type: `target`
	}), n[10] = a.target, n[11] = a.targetHandle, n[12] = C, n[13] = w) : w = n[13];
	let T = w, E;
	n[14] !== a.source || n[15] !== a.sourceHandle || n[16] !== C ? (E = (e) => C(e, {
		nodeId: a.source,
		id: a.sourceHandle ?? null,
		type: `source`
	}), n[14] = a.source, n[15] = a.sourceHandle, n[16] = C, n[17] = E) : E = n[17];
	let D = E, O;
	n[18] === g ? O = n[19] : (O = () => g(!0), n[18] = g, n[19] = O);
	let k = O, A;
	n[20] === g ? A = n[21] : (A = () => g(!1), n[20] = g, n[21] = A);
	let j = A, M;
	n[22] !== r || n[23] !== k || n[24] !== j || n[25] !== T || n[26] !== i || n[27] !== u || n[28] !== o || n[29] !== s ? (M = (r === !0 || r === `source`) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Oi, {
		position: u,
		centerX: o,
		centerY: s,
		radius: i,
		onMouseDown: T,
		onMouseEnter: k,
		onMouseOut: j,
		type: `source`
	}), n[22] = r, n[23] = k, n[24] = j, n[25] = T, n[26] = i, n[27] = u, n[28] = o, n[29] = s, n[30] = M) : M = n[30];
	let N;
	n[31] !== r || n[32] !== k || n[33] !== j || n[34] !== D || n[35] !== i || n[36] !== d || n[37] !== c || n[38] !== l ? (N = (r === !0 || r === `target`) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Oi, {
		position: d,
		centerX: c,
		centerY: l,
		radius: i,
		onMouseDown: D,
		onMouseEnter: k,
		onMouseOut: j,
		type: `target`
	}), n[31] = r, n[32] = k, n[33] = j, n[34] = D, n[35] = i, n[36] = d, n[37] = c, n[38] = l, n[39] = N) : N = n[39];
	let P;
	return n[40] !== M || n[41] !== N ? (P = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [M, N] }), n[40] = M, n[41] = N, n[42] = P) : P = n[42], P;
}
function Ai(n) {
	let r = (0, import_dist.c)(110), { id: i, edgesFocusable: a, edgesReconnectable: o, elementsSelectable: s, onClick: c, onDoubleClick: l, onContextMenu: u, onMouseEnter: d, onMouseMove: f, onMouseLeave: p, reconnectRadius: m, onReconnect: h, onReconnectStart: g, onReconnectEnd: _, rfId: v, edgeTypes: y, noPanClassName: b, onError: x, disableKeyboardA11y: S, connectionMode: C, elevateEdgesOnSelect: w, zIndexMode: T, defaultEdgeOptions: E } = n, D = ni(i);
	D = E ? {
		...E,
		...D
	} : D;
	let O = D.type || `default`, k = y?.[O] || Ci[O];
	k === void 0 && (x?.(`011`, errorMessages.error011(O)), O = `default`, k = y?.default || Ci.default);
	let A = !!(D.focusable || a && D.focusable === void 0), j = h !== void 0 && (D.reconnectable || o && D.reconnectable === void 0), M = !!(D.selectable || s && D.selectable === void 0), N = (0, import_react.useRef)(null), [P, F] = (0, import_react.useState)(!1), [I, L] = (0, import_react.useState)(!1), { optionsStore: R } = $(), B = Pr(D.source), V = Pr(D.target), H = D.zIndex, U;
	bb0: {
		if (!B || !V) {
			U = wi;
			break bb0;
		}
		let e = D.sourceHandle || null, t = D.targetHandle || null, n;
		r[0] !== C || r[1] !== i || r[2] !== x || r[3] !== B || r[4] !== e || r[5] !== t || r[6] !== V ? (n = getEdgePosition({
			id: i,
			sourceNode: B,
			targetNode: V,
			sourceHandle: e,
			targetHandle: t,
			connectionMode: C,
			onError: x
		}), r[0] = C, r[1] = i, r[2] = x, r[3] = B, r[4] = e, r[5] = t, r[6] = V, r[7] = n) : n = r[7];
		let a = n, o;
		r[8] !== D.selected || r[9] !== D.zIndex || r[10] !== w || r[11] !== B || r[12] !== V || r[13] !== T ? (o = getElevatedEdgeZIndex({
			selected: D.selected,
			zIndex: D.zIndex,
			sourceNode: B,
			targetNode: V,
			elevateOnSelect: w,
			zIndexMode: T
		}), r[8] = D.selected, r[9] = D.zIndex, r[10] = w, r[11] = B, r[12] = V, r[13] = T, r[14] = o) : o = r[14];
		let s = o, c = a || wi, l;
		r[15] !== c || r[16] !== s ? (l = {
			...c,
			zIndex: s
		}, r[15] = c, r[16] = s, r[17] = l) : l = r[17], U = l;
	}
	let { zIndex: W, sourceX: G, sourceY: K, targetX: q, targetY: J, sourcePosition: Y, targetPosition: X } = U, te = W === void 0 ? H : W, ne;
	r[18] !== D.markerStart || r[19] !== v ? (ne = D.markerStart ? `url('#${getMarkerId(D.markerStart, v)}')` : void 0, r[18] = D.markerStart, r[19] = v, r[20] = ne) : ne = r[20];
	let ie = ne, ae;
	r[21] !== D.markerEnd || r[22] !== v ? (ae = D.markerEnd ? `url('#${getMarkerId(D.markerEnd, v)}')` : void 0, r[21] = D.markerEnd, r[22] = v, r[23] = ae) : ae = r[23];
	let se = ae;
	if (D.hidden || G === null || K === null || q === null || J === null) return null;
	let ce;
	r[24] !== D || r[25] !== i || r[26] !== M || r[27] !== c || r[28] !== R ? (ce = (e) => {
		let { addSelectedEdges: t, unselectNodesAndEdges: n, multiSelectionActive: r, nodesSelectionActive: a } = R.getState();
		M && (a && R.setState({ nodesSelectionActive: !1 }), D.selected && r ? (n({
			nodes: [],
			edges: [D]
		}), N.current?.blur()) : t([i])), c && c(e, D);
	}, r[24] = D, r[25] = i, r[26] = M, r[27] = c, r[28] = R, r[29] = ce) : ce = r[29];
	let le = ce, ue;
	r[30] !== D || r[31] !== l ? (ue = l ? (e) => {
		l(e, { ...D });
	} : void 0, r[30] = D, r[31] = l, r[32] = ue) : ue = r[32];
	let de = ue, pe;
	r[33] !== D || r[34] !== u ? (pe = u ? (e) => {
		u(e, { ...D });
	} : void 0, r[33] = D, r[34] = u, r[35] = pe) : pe = r[35];
	let me = pe, he;
	r[36] !== D || r[37] !== d ? (he = d ? (e) => {
		d(e, { ...D });
	} : void 0, r[36] = D, r[37] = d, r[38] = he) : he = r[38];
	let ge = he, _e;
	r[39] !== D || r[40] !== f ? (_e = f ? (e) => {
		f(e, { ...D });
	} : void 0, r[39] = D, r[40] = f, r[41] = _e) : _e = r[41];
	let ve = _e, ye;
	r[42] !== D || r[43] !== p ? (ye = p ? (e) => {
		p(e, { ...D });
	} : void 0, r[42] = D, r[43] = p, r[44] = ye) : ye = r[44];
	let be = ye, xe;
	r[45] !== S || r[46] !== D || r[47] !== i || r[48] !== M || r[49] !== R ? (xe = (e) => {
		if (!S && elementSelectionKeys.includes(e.key) && M) {
			let { unselectNodesAndEdges: t, addSelectedEdges: n } = R.getState();
			e.key === `Escape` ? (N.current?.blur(), t({ edges: [D] })) : n([i]);
		}
	}, r[45] = S, r[46] = D, r[47] = i, r[48] = M, r[49] = R, r[50] = xe) : xe = r[50];
	let Se = xe, Ce;
	r[51] === te ? Ce = r[52] : (Ce = { zIndex: te }, r[51] = te, r[52] = Ce);
	let we = `react-flow__edge-${O}`, Te = !M && !c, Ee;
	r[53] !== D.animated || r[54] !== D.className || r[55] !== D.selected || r[56] !== M || r[57] !== b || r[58] !== we || r[59] !== Te || r[60] !== P ? (Ee = cc([
		`react-flow__edge`,
		we,
		D.className,
		b,
		{
			selected: D.selected,
			animated: D.animated,
			inactive: Te,
			updating: P,
			selectable: M
		}
	]), r[53] = D.animated, r[54] = D.className, r[55] = D.selected, r[56] = M, r[57] = b, r[58] = we, r[59] = Te, r[60] = P, r[61] = Ee) : Ee = r[61];
	let De = A ? Se : void 0, Oe = A ? 0 : void 0, ke = D.ariaRole ?? (A ? `group` : `img`), Ae = `rf__edge-${i}`, je = D.ariaLabel === null ? void 0 : D.ariaLabel || `Edge from ${D.source} to ${D.target}`, Me = A ? `${Nt}-${v}` : void 0, Ne;
	r[62] !== k || r[63] !== D || r[64] !== i || r[65] !== M || r[66] !== se || r[67] !== ie || r[68] !== I || r[69] !== Y || r[70] !== G || r[71] !== K || r[72] !== X || r[73] !== q || r[74] !== J ? (Ne = !I && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(k, {
		id: i,
		source: D.source,
		target: D.target,
		type: D.type,
		selected: D.selected,
		animated: D.animated,
		selectable: M,
		deletable: D.deletable ?? !0,
		label: D.label,
		labelStyle: D.labelStyle,
		labelShowBg: D.labelShowBg,
		labelBgStyle: D.labelBgStyle,
		labelBgPadding: D.labelBgPadding,
		labelBgBorderRadius: D.labelBgBorderRadius,
		sourceX: G,
		sourceY: K,
		targetX: q,
		targetY: J,
		sourcePosition: Y,
		targetPosition: X,
		data: D.data,
		style: D.style,
		sourceHandleId: D.sourceHandle,
		targetHandleId: D.targetHandle,
		markerStart: ie,
		markerEnd: se,
		pathOptions: `pathOptions` in D ? D.pathOptions : void 0,
		interactionWidth: D.interactionWidth
	}), r[62] = k, r[63] = D, r[64] = i, r[65] = M, r[66] = se, r[67] = ie, r[68] = I, r[69] = Y, r[70] = G, r[71] = K, r[72] = X, r[73] = q, r[74] = J, r[75] = Ne) : Ne = r[75];
	let Pe;
	r[76] !== D || r[77] !== j || r[78] !== h || r[79] !== _ || r[80] !== g || r[81] !== m || r[82] !== Y || r[83] !== G || r[84] !== K || r[85] !== X || r[86] !== q || r[87] !== J ? (Pe = j && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ki, {
		edge: D,
		isReconnectable: j,
		reconnectRadius: m,
		onReconnect: h,
		onReconnectStart: g,
		onReconnectEnd: _,
		sourceX: G,
		sourceY: K,
		targetX: q,
		targetY: J,
		sourcePosition: Y,
		targetPosition: X,
		setUpdateHover: F,
		setReconnecting: L
	}), r[76] = D, r[77] = j, r[78] = h, r[79] = _, r[80] = g, r[81] = m, r[82] = Y, r[83] = G, r[84] = K, r[85] = X, r[86] = q, r[87] = J, r[88] = Pe) : Pe = r[88];
	let Fe;
	r[89] !== D.domAttributes || r[90] !== i || r[91] !== le || r[92] !== me || r[93] !== de || r[94] !== ge || r[95] !== be || r[96] !== ve || r[97] !== Ee || r[98] !== De || r[99] !== Oe || r[100] !== ke || r[101] !== Ae || r[102] !== je || r[103] !== Me || r[104] !== Ne || r[105] !== Pe ? (Fe = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(`g`, {
		className: Ee,
		onClick: le,
		onDoubleClick: de,
		onContextMenu: me,
		onMouseEnter: ge,
		onMouseMove: ve,
		onMouseLeave: be,
		onKeyDown: De,
		tabIndex: Oe,
		role: ke,
		"aria-roledescription": `edge`,
		"data-id": i,
		"data-testid": Ae,
		"aria-label": je,
		"aria-describedby": Me,
		ref: N,
		...D.domAttributes,
		children: [Ne, Pe]
	}), r[89] = D.domAttributes, r[90] = i, r[91] = le, r[92] = me, r[93] = de, r[94] = ge, r[95] = be, r[96] = ve, r[97] = Ee, r[98] = De, r[99] = Oe, r[100] = ke, r[101] = Ae, r[102] = je, r[103] = Me, r[104] = Ne, r[105] = Pe, r[106] = Fe) : Fe = r[106];
	let Ie;
	return r[107] !== Ce || r[108] !== Fe ? (Ie = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		style: Ce,
		children: Fe
	}), r[107] = Ce, r[108] = Fe, r[109] = Ie) : Ie = r[109], Ie;
}
var ji = (0, import_react.memo)(Ai);
function Mi(t) {
	let n = (0, import_dist.c)(54), { defaultMarkerColor: r, onlyRenderVisibleElements: i, rfId: a, edgeTypes: o, noPanClassName: s, onReconnect: c, onEdgeContextMenu: l, onEdgeMouseEnter: u, onEdgeMouseMove: d, onEdgeMouseLeave: f, onEdgeClick: p, reconnectRadius: m, onEdgeDoubleClick: h, onReconnectStart: g, onReconnectEnd: _, disableKeyboardA11y: v } = t, y = Q(Bi), b = Q(zi), x = Q(Ri), S = Q(Li), C = Q(Ii), w = Q(Fi), T = Q(Pi), E = Q(Ni), D = Kr(i), O;
	n[0] !== r || n[1] !== S || n[2] !== a ? (O = /* @__PURE__ */ (0, import_jsx_runtime.jsx)($r, {
		defaultColor: r,
		rfId: a,
		onError: S
	}), n[0] = r, n[1] = S, n[2] = a, n[3] = O) : O = n[3];
	let k;
	if (n[4] !== C || n[5] !== E || n[6] !== v || n[7] !== D || n[8] !== o || n[9] !== y || n[10] !== b || n[11] !== x || n[12] !== w || n[13] !== s || n[14] !== p || n[15] !== l || n[16] !== h || n[17] !== u || n[18] !== f || n[19] !== d || n[20] !== S || n[21] !== c || n[22] !== _ || n[23] !== g || n[24] !== m || n[25] !== a || n[26] !== T) {
		let e;
		n[28] !== C || n[29] !== E || n[30] !== v || n[31] !== o || n[32] !== y || n[33] !== b || n[34] !== x || n[35] !== w || n[36] !== s || n[37] !== p || n[38] !== l || n[39] !== h || n[40] !== u || n[41] !== f || n[42] !== d || n[43] !== S || n[44] !== c || n[45] !== _ || n[46] !== g || n[47] !== m || n[48] !== a || n[49] !== T ? (e = (e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ji, {
			id: e,
			edgesFocusable: y,
			edgesReconnectable: b,
			elementsSelectable: x,
			noPanClassName: s,
			onReconnect: c,
			onContextMenu: l,
			onMouseEnter: u,
			onMouseMove: d,
			onMouseLeave: f,
			onClick: p,
			reconnectRadius: m,
			onDoubleClick: h,
			onReconnectStart: g,
			onReconnectEnd: _,
			rfId: a,
			onError: S,
			edgeTypes: o,
			disableKeyboardA11y: v,
			connectionMode: C,
			elevateEdgesOnSelect: w,
			zIndexMode: T,
			defaultEdgeOptions: E
		}, e), n[28] = C, n[29] = E, n[30] = v, n[31] = o, n[32] = y, n[33] = b, n[34] = x, n[35] = w, n[36] = s, n[37] = p, n[38] = l, n[39] = h, n[40] = u, n[41] = f, n[42] = d, n[43] = S, n[44] = c, n[45] = _, n[46] = g, n[47] = m, n[48] = a, n[49] = T, n[50] = e) : e = n[50], k = D.map(e), n[4] = C, n[5] = E, n[6] = v, n[7] = D, n[8] = o, n[9] = y, n[10] = b, n[11] = x, n[12] = w, n[13] = s, n[14] = p, n[15] = l, n[16] = h, n[17] = u, n[18] = f, n[19] = d, n[20] = S, n[21] = c, n[22] = _, n[23] = g, n[24] = m, n[25] = a, n[26] = T, n[27] = k;
	} else k = n[27];
	let A;
	return n[51] !== O || n[52] !== k ? (A = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(`div`, {
		className: `react-flow__edges`,
		children: [O, k]
	}), n[51] = O, n[52] = k, n[53] = A) : A = n[53], A;
}
function Ni(e) {
	return e.defaultEdgeOptions;
}
function Pi(e) {
	return e.zIndexMode;
}
function Fi(e) {
	return e.elevateEdgesOnSelect;
}
function Ii(e) {
	return e.connectionMode;
}
function Li(e) {
	return e.onError;
}
function Ri(e) {
	return e.elementsSelectable;
}
function zi(e) {
	return e.edgesReconnectable;
}
function Bi(e) {
	return e.edgesFocusable;
}
Mi.displayName = `EdgeRenderer`;
var Vi = (0, import_react.memo)(Mi);
var Hi = (e) => `translate(${e[0]}px,${e[1]}px) scale(${e[2]})`;
function Ui(t) {
	let n = (0, import_dist.c)(12), { children: r } = t, { viewportStore: i } = $(), a = (0, import_react.useRef)(null), o;
	n[0] === i ? o = n[1] : (o = () => i.getState().transform, n[0] = i, n[1] = o);
	let [s] = (0, import_react.useState)(o), c, l;
	n[2] === i ? (c = n[3], l = n[4]) : (c = () => {
		let e = null, t = () => {
			let t = i.getState().transform;
			e && t[0] === e[0] && t[1] === e[1] && t[2] === e[2] || (e = t, a.current && (a.current.style.transform = Hi(t)));
		};
		return t(), i.subscribe(t);
	}, l = [i], n[2] = i, n[3] = c, n[4] = l), mn(c, l);
	let u;
	n[5] === s ? u = n[6] : (u = Hi(s), n[5] = s, n[6] = u);
	let d;
	n[7] === u ? d = n[8] : (d = { transform: u }, n[7] = u, n[8] = d);
	let f;
	return n[9] !== r || n[10] !== d ? (f = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		ref: a,
		className: `react-flow__viewport xyflow__viewport react-flow__container`,
		style: d,
		children: r
	}), n[9] = r, n[10] = d, n[11] = f) : f = n[11], f;
}
function Wi(t) {
	let n = (0, import_dist.c)(6), r = Sn(), i = (0, import_react.useRef)(!1), a;
	n[0] !== t || n[1] !== r ? (a = () => {
		!i.current && r.viewportInitialized && t && (setTimeout(() => t(r), 1), i.current = !0);
	}, n[0] = t, n[1] = r, n[2] = a) : a = n[2];
	let o;
	n[3] !== t || n[4] !== r.viewportInitialized ? (o = [t, r.viewportInitialized], n[3] = t, n[4] = r.viewportInitialized, n[5] = o) : o = n[5], (0, import_react.useEffect)(a, o);
}
function Gi(t) {
	let n = (0, import_dist.c)(5), r = Q(Ki)?.syncViewport, { viewportStore: i } = $(), a, o;
	return n[0] !== r || n[1] !== t || n[2] !== i ? (a = () => {
		t && (r?.(t), i.setState({ transform: [
			t.x,
			t.y,
			t.zoom
		] }));
	}, o = [
		t,
		r,
		i
	], n[0] = r, n[1] = t, n[2] = i, n[3] = a, n[4] = o) : (a = n[3], o = n[4]), (0, import_react.useEffect)(a, o), null;
}
function Ki(e) {
	return e.panZoom;
}
function qi(n) {
	let r = (0, import_dist.c)(15), { containerStyle: i, style: a, type: o, component: s } = n, c = Q(Xi), l = wt(Yi), u = wt(Ji), { connection: d } = Tt(), { isValid: f, inProgress: p } = d;
	if (!(l && c && p)) return null;
	let m;
	r[0] === f ? m = r[1] : (m = cc([`react-flow__connection`, getConnectionStatus(f)]), r[0] = f, r[1] = m);
	let h;
	r[2] !== s || r[3] !== f || r[4] !== a || r[5] !== o ? (h = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zi, {
		style: a,
		type: o,
		CustomComponent: s,
		isValid: f
	}), r[2] = s, r[3] = f, r[4] = a, r[5] = o, r[6] = h) : h = r[6];
	let g;
	r[7] !== m || r[8] !== h ? (g = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`g`, {
		className: m,
		children: h
	}), r[7] = m, r[8] = h, r[9] = g) : g = r[9];
	let _;
	return r[10] !== i || r[11] !== u || r[12] !== g || r[13] !== l ? (_ = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		style: i,
		width: l,
		height: u,
		className: `react-flow__connectionline react-flow__container`,
		children: g
	}), r[10] = i, r[11] = u, r[12] = g, r[13] = l, r[14] = _) : _ = r[14], _;
}
function Ji(e) {
	return e.height;
}
function Yi(e) {
	return e.width;
}
function Xi(e) {
	return e.nodesConnectable;
}
var Zi = (t) => {
	let n = (0, import_dist.c)(29), { style: i, type: a, CustomComponent: o, isValid: s } = t, c = a === void 0 ? ConnectionLineType.Bezier : a, { inProgress: l, from: u, fromNode: d, fromHandle: f, fromPosition: p, to: m, toNode: h, toHandle: g, toPosition: _, pointer: v } = sr();
	if (!l) return;
	if (o) {
		let e = u.x, t = u.y, r = m.x, a = m.y, l;
		n[0] === s ? l = n[1] : (l = getConnectionStatus(s), n[0] = s, n[1] = l);
		let y;
		return n[2] !== o || n[3] !== u.x || n[4] !== u.y || n[5] !== f || n[6] !== d || n[7] !== p || n[8] !== v || n[9] !== i || n[10] !== l || n[11] !== m.x || n[12] !== m.y || n[13] !== g || n[14] !== h || n[15] !== _ || n[16] !== c ? (y = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(o, {
			connectionLineType: c,
			connectionLineStyle: i,
			fromNode: d,
			fromHandle: f,
			fromX: e,
			fromY: t,
			toX: r,
			toY: a,
			fromPosition: p,
			toPosition: _,
			connectionStatus: l,
			toNode: h,
			toHandle: g,
			pointer: v
		}), n[2] = o, n[3] = u.x, n[4] = u.y, n[5] = f, n[6] = d, n[7] = p, n[8] = v, n[9] = i, n[10] = l, n[11] = m.x, n[12] = m.y, n[13] = g, n[14] = h, n[15] = _, n[16] = c, n[17] = y) : y = n[17], y;
	}
	let y;
	if (n[18] !== u.x || n[19] !== u.y || n[20] !== p || n[21] !== m.x || n[22] !== m.y || n[23] !== _ || n[24] !== c) {
		let e = {
			sourceX: u.x,
			sourceY: u.y,
			sourcePosition: p,
			targetX: m.x,
			targetY: m.y,
			targetPosition: _
		};
		bb0: switch (c) {
			case ConnectionLineType.Bezier:
				[y] = getBezierPath(e);
				break bb0;
			case ConnectionLineType.SimpleBezier:
				[y] = ci(e);
				break bb0;
			case ConnectionLineType.Step:
				[y] = getSmoothStepPath({
					...e,
					borderRadius: 0
				});
				break bb0;
			case ConnectionLineType.SmoothStep:
				[y] = getSmoothStepPath(e);
				break bb0;
			default: [y] = getStraightPath(e);
		}
		n[18] = u.x, n[19] = u.y, n[20] = p, n[21] = m.x, n[22] = m.y, n[23] = _, n[24] = c, n[25] = y;
	} else y = n[25];
	let b;
	return n[26] !== y || n[27] !== i ? (b = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, {
		d: y,
		fill: `none`,
		className: `react-flow__connection-path`,
		style: i
	}), n[26] = y, n[27] = i, n[28] = b) : b = n[28], b;
};
Zi.displayName = `ConnectionLine`;
var Qi = {};
function $i(t) {
	let n = (0, import_dist.c)(5), r = t === void 0 ? Qi : t;
	(0, import_react.useRef)(r);
	let { optionsStore: a } = $(), o;
	n[0] !== r || n[1] !== a ? (o = () => {}, n[0] = r, n[1] = a, n[2] = o) : o = n[2];
	let s;
	n[3] === r ? s = n[4] : (s = [r], n[3] = r, n[4] = s), (0, import_react.useEffect)(o, s);
}
function ea() {
	let t = (0, import_dist.c)(3), { optionsStore: n } = $();
	(0, import_react.useRef)(!1);
	let i;
	t[0] === n ? i = t[1] : (i = () => {}, t[0] = n, t[1] = i);
	let a;
	t[2] === Symbol.for(`react.memo_cache_sentinel`) ? (a = [], t[2] = a) : a = t[2], (0, import_react.useEffect)(i, a);
}
function ta(t) {
	let n = (0, import_dist.c)(82), { nodeTypes: r, edgeTypes: i, onInit: a, onNodeClick: o, onEdgeClick: s, onNodeDoubleClick: c, onEdgeDoubleClick: l, onNodeMouseEnter: u, onNodeMouseMove: d, onNodeMouseLeave: f, onNodeContextMenu: p, onSelectionContextMenu: m, onSelectionStart: h, onSelectionEnd: g, connectionLineType: _, connectionLineStyle: v, connectionLineComponent: y, connectionLineContainerStyle: b, selectionKeyCode: x, selectionOnDrag: S, selectionMode: C, multiSelectionKeyCode: w, panActivationKeyCode: T, zoomActivationKeyCode: E, deleteKeyCode: D, onlyRenderVisibleElements: O, elementsSelectable: k, defaultViewport: A, translateExtent: j, minZoom: M, maxZoom: N, preventScrolling: P, defaultMarkerColor: F, zoomOnScroll: I, zoomOnPinch: L, panOnScroll: R, panOnScrollSpeed: ee, panOnScrollMode: z, zoomOnDoubleClick: B, panOnDrag: V, autoPanOnSelection: H, onPaneClick: U, onPaneMouseEnter: W, onPaneMouseMove: G, onPaneMouseLeave: K, onPaneScroll: q, onPaneContextMenu: J, paneDragThreshold: Y, onEdgeContextMenu: X, onEdgeMouseEnter: te, onEdgeMouseMove: ne, onEdgeMouseLeave: re, reconnectRadius: ie, onReconnect: ae, onReconnectStart: oe, onReconnectEnd: se, noDragClassName: ce, noWheelClassName: le, noPanClassName: ue, disableKeyboardA11y: de, nodeExtent: fe, rfId: pe, viewport: me, onViewportChange: he, nodesDraggable: ge } = t;
	$i(r), $i(i), ea(), Wi(a), Gi(me);
	let _e = !!me, ve;
	n[0] !== F || n[1] !== de || n[2] !== i || n[3] !== ue || n[4] !== s || n[5] !== X || n[6] !== l || n[7] !== te || n[8] !== re || n[9] !== ne || n[10] !== ae || n[11] !== se || n[12] !== oe || n[13] !== O || n[14] !== ie || n[15] !== pe ? (ve = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Vi, {
		edgeTypes: i,
		onEdgeClick: s,
		onEdgeDoubleClick: l,
		onReconnect: ae,
		onReconnectStart: oe,
		onReconnectEnd: se,
		onlyRenderVisibleElements: O,
		onEdgeContextMenu: X,
		onEdgeMouseEnter: te,
		onEdgeMouseMove: ne,
		onEdgeMouseLeave: re,
		reconnectRadius: ie,
		defaultMarkerColor: F,
		noPanClassName: ue,
		disableKeyboardA11y: de,
		rfId: pe
	}), n[0] = F, n[1] = de, n[2] = i, n[3] = ue, n[4] = s, n[5] = X, n[6] = l, n[7] = te, n[8] = re, n[9] = ne, n[10] = ae, n[11] = se, n[12] = oe, n[13] = O, n[14] = ie, n[15] = pe, n[16] = ve) : ve = n[16];
	let ye;
	n[17] !== y || n[18] !== b || n[19] !== v || n[20] !== _ ? (ye = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(qi, {
		style: v,
		type: _,
		component: y,
		containerStyle: b
	}), n[17] = y, n[18] = b, n[19] = v, n[20] = _, n[21] = ye) : ye = n[21];
	let be;
	n[22] === Symbol.for(`react.memo_cache_sentinel`) ? (be = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, { className: `react-flow__edgelabel-renderer` }), n[22] = be) : be = n[22];
	let xe;
	n[23] !== de || n[24] !== ce || n[25] !== ue || n[26] !== fe || n[27] !== r || n[28] !== ge || n[29] !== o || n[30] !== p || n[31] !== c || n[32] !== u || n[33] !== f || n[34] !== d || n[35] !== O || n[36] !== pe ? (xe = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Gr, {
		nodeTypes: r,
		onNodeClick: o,
		onNodeDoubleClick: c,
		onNodeMouseEnter: u,
		onNodeMouseMove: d,
		onNodeMouseLeave: f,
		onNodeContextMenu: p,
		onlyRenderVisibleElements: O,
		noPanClassName: ue,
		noDragClassName: ce,
		disableKeyboardA11y: de,
		nodeExtent: fe,
		rfId: pe,
		nodesDraggable: ge
	}), n[23] = de, n[24] = ce, n[25] = ue, n[26] = fe, n[27] = r, n[28] = ge, n[29] = o, n[30] = p, n[31] = c, n[32] = u, n[33] = f, n[34] = d, n[35] = O, n[36] = pe, n[37] = xe) : xe = n[37];
	let Se;
	n[38] === Symbol.for(`react.memo_cache_sentinel`) ? (Se = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, { className: `react-flow__viewport-portal` }), n[38] = Se) : Se = n[38];
	let Ce;
	n[39] !== ve || n[40] !== ye || n[41] !== xe ? (Ce = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Ui, { children: [
		ve,
		ye,
		be,
		xe,
		Se
	] }), n[39] = ve, n[40] = ye, n[41] = xe, n[42] = Ce) : Ce = n[42];
	let we;
	return n[43] !== H || n[44] !== A || n[45] !== D || n[46] !== de || n[47] !== k || n[48] !== N || n[49] !== M || n[50] !== w || n[51] !== ce || n[52] !== ue || n[53] !== le || n[54] !== U || n[55] !== J || n[56] !== W || n[57] !== K || n[58] !== G || n[59] !== q || n[60] !== m || n[61] !== g || n[62] !== h || n[63] !== he || n[64] !== T || n[65] !== V || n[66] !== R || n[67] !== z || n[68] !== ee || n[69] !== Y || n[70] !== P || n[71] !== x || n[72] !== C || n[73] !== S || n[74] !== _e || n[75] !== Ce || n[76] !== j || n[77] !== E || n[78] !== B || n[79] !== L || n[80] !== I ? (we = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Or, {
		onPaneClick: U,
		onPaneMouseEnter: W,
		onPaneMouseMove: G,
		onPaneMouseLeave: K,
		onPaneContextMenu: J,
		onPaneScroll: q,
		paneDragThreshold: Y,
		deleteKeyCode: D,
		selectionKeyCode: x,
		selectionOnDrag: S,
		selectionMode: C,
		onSelectionStart: h,
		onSelectionEnd: g,
		multiSelectionKeyCode: w,
		panActivationKeyCode: T,
		zoomActivationKeyCode: E,
		elementsSelectable: k,
		zoomOnScroll: I,
		zoomOnPinch: L,
		zoomOnDoubleClick: B,
		panOnScroll: R,
		panOnScrollSpeed: ee,
		panOnScrollMode: z,
		panOnDrag: V,
		autoPanOnSelection: H,
		defaultViewport: A,
		translateExtent: j,
		minZoom: M,
		maxZoom: N,
		onSelectionContextMenu: m,
		preventScrolling: P,
		noDragClassName: ce,
		noWheelClassName: le,
		noPanClassName: ue,
		disableKeyboardA11y: de,
		onViewportChange: he,
		isControlledViewport: _e,
		children: Ce
	}), n[43] = H, n[44] = A, n[45] = D, n[46] = de, n[47] = k, n[48] = N, n[49] = M, n[50] = w, n[51] = ce, n[52] = ue, n[53] = le, n[54] = U, n[55] = J, n[56] = W, n[57] = K, n[58] = G, n[59] = q, n[60] = m, n[61] = g, n[62] = h, n[63] = he, n[64] = T, n[65] = V, n[66] = R, n[67] = z, n[68] = ee, n[69] = Y, n[70] = P, n[71] = x, n[72] = C, n[73] = S, n[74] = _e, n[75] = Ce, n[76] = j, n[77] = E, n[78] = B, n[79] = L, n[80] = I, n[81] = we) : we = n[81], we;
}
ta.displayName = `GraphView`;
var na = (0, import_react.memo)(ta);
function ra(e) {
	"@babel/helpers - typeof";
	return ra = typeof Symbol == `function` && typeof Symbol.iterator == `symbol` ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == `function` && e.constructor === Symbol && e !== Symbol.prototype ? `symbol` : typeof e;
	}, ra(e);
}
function ia(e, t) {
	if (ra(e) != `object` || !e) return e;
	var n;
	if (typeof Symbol < `u` && (n = e[Symbol.toPrimitive]) !== void 0) {
		var r = n.call(e, t || `default`);
		if (ra(r) != `object`) return r;
		throw TypeError(`@@toPrimitive must return a primitive value.`);
	}
	return (t === `string` ? String : Number)(e);
}
function aa(e) {
	var t = ia(e, `string`);
	return ra(t) == `symbol` ? t : t + ``;
}
function oa(e, t, n) {
	return (t = aa(t)) in e ? Object.defineProperty(e, t, {
		value: n,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = n, e;
}
function sa(e) {
	return e ? `${e.nodeId}-${e.id}-${e.type}` : ``;
}
function ca(e, t) {
	return e === t || e && t && e.nodeId === t.nodeId && e.id === t.id && e.type === t.type;
}
var la = class {
	constructor() {
		oa(this, `nodeListeners`, /* @__PURE__ */ new Map()), oa(this, `edgeListeners`, /* @__PURE__ */ new Map()), oa(this, `handleListeners`, /* @__PURE__ */ new Map());
	}
	subscribeToNode(e, t) {
		return this.subscribe(this.nodeListeners, e, t);
	}
	subscribeToNodes(e, t) {
		let n = Array.from(new Set(e), (e) => this.subscribeToNode(e, t));
		return () => n.forEach((e) => e());
	}
	publishNodes(e) {
		this.notify(this.nodeListeners, e);
	}
	subscribeToEdge(e, t) {
		return this.subscribe(this.edgeListeners, e, t);
	}
	subscribeToEdges(e, t) {
		let n = Array.from(new Set(e), (e) => this.subscribeToEdge(e, t));
		return () => n.forEach((e) => e());
	}
	publishEdges(e) {
		this.notify(this.edgeListeners, e);
	}
	subscribeToConnectionForHandle(e, t) {
		return this.subscribe(this.handleListeners, sa(e), t);
	}
	publishConnectionClickStart() {
		this.notifyAll(this.handleListeners);
	}
	publishConnection(e, t) {
		let n = /* @__PURE__ */ new Set();
		ca(e.fromHandle, t.fromHandle) ? (n.add(sa(e.fromHandle)), n.add(sa(e.toHandle)), n.add(sa(t.fromHandle)), n.add(sa(t.toHandle)), n.delete(sa(null)), this.notify(this.handleListeners, n)) : this.notifyAll(this.handleListeners);
	}
	reset() {
		this.notifyAll(this.nodeListeners), this.notifyAll(this.edgeListeners), this.notifyAll(this.handleListeners);
	}
	subscribe(e, t, n) {
		let r = e.get(t);
		return r || (r = /* @__PURE__ */ new Set(), e.set(t, r)), r.add(n), () => {
			r.delete(n), r.size === 0 && e.delete(t);
		};
	}
	notify(e, t) {
		for (let n of t) {
			let t = e.get(n);
			if (t) for (let e of t) e();
		}
	}
	notifyAll(e) {
		for (let t of e.values()) for (let e of t) e();
	}
};
var ua = createDevWarn(`React Flow`, `https://reactflow.dev/`);
var da = ({ nodes: e, edges: t, defaultNodes: n, defaultEdges: r, width: i, height: o, fitView: s, fitViewOptions: c, minZoom: l = .5, maxZoom: u = 2, nodeOrigin: d, nodeExtent: f, zIndexMode: p = `basic` } = {}) => {
	let m = /* @__PURE__ */ new Map(), h = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map(), _ = /* @__PURE__ */ new Map(), v = r ?? t ?? [], y = n ?? e ?? [], b = d ?? [0, 0], x = f ?? infiniteExtent;
	updateConnectionLookup(g, _, v);
	let { nodesInitialized: S } = adoptUserNodes(y, m, h, {
		nodeOrigin: b,
		nodeExtent: x,
		zIndexMode: p
	}), C = [
		0,
		0,
		1
	];
	if (s && i && o) {
		let { x: t, y: n, zoom: r } = getViewportForBounds(getInternalNodesBounds(m, { filter: (e) => !(!e.width && !e.initialWidth || !e.height && !e.initialHeight) }), i, o, l, u, c?.padding ?? "5%");
		C = [
			t,
			n,
			r
		];
	}
	return {
		optionsStore: {
			rfId: `1`,
			onNodesChange: null,
			onEdgesChange: null,
			hasDefaultNodes: n !== void 0,
			hasDefaultEdges: r !== void 0,
			panZoom: null,
			minZoom: l,
			maxZoom: u,
			translateExtent: infiniteExtent,
			nodeExtent: x,
			nodesSelectionActive: !1,
			userSelectionActive: !1,
			connectionMode: ConnectionMode.Strict,
			domNode: null,
			noPanClassName: `nopan`,
			nodeOrigin: b,
			nodeDragThreshold: 1,
			connectionDragThreshold: 1,
			snapGrid: [15, 15],
			snapToGrid: !1,
			nodesDraggable: !0,
			nodesConnectable: !0,
			nodesFocusable: !0,
			edgesFocusable: !0,
			edgesReconnectable: !0,
			elementsSelectable: !0,
			elevateNodesOnSelect: !0,
			elevateEdgesOnSelect: !0,
			selectNodesOnDrag: !0,
			multiSelectionActive: !1,
			fitViewQueued: s ?? !1,
			fitViewOptions: c,
			fitViewResolver: null,
			connectOnClick: !0,
			ariaLiveMessage: ``,
			autoPanOnConnect: !0,
			autoPanOnNodeDrag: !0,
			autoPanOnNodeFocus: !0,
			autoPanSpeed: 15,
			connectionRadius: 20,
			onError: ua,
			isValidConnection: void 0,
			onSelectionChangeHandlers: [],
			debug: !1,
			ariaLabelConfig: defaultAriaLabelConfig,
			zIndexMode: p,
			onNodesChangeMiddlewareMap: /* @__PURE__ */ new Map(),
			onEdgesChangeMiddlewareMap: /* @__PURE__ */ new Map(),
			pubSub: new la(),
			defaultEdgeOptions: void 0,
			onNodesDelete: void 0,
			onEdgesDelete: void 0,
			onDelete: void 0,
			onBeforeDelete: void 0,
			onViewportChangeStart: void 0,
			onViewportChange: void 0,
			onViewportChangeEnd: void 0,
			onNodeDragStart: void 0,
			onNodeDrag: void 0,
			onNodeDragStop: void 0,
			onSelectionDragStart: void 0,
			onSelectionDrag: void 0,
			onSelectionDragStop: void 0,
			onMoveStart: void 0,
			onMove: void 0,
			onMoveEnd: void 0,
			onConnect: void 0,
			onConnectStart: void 0,
			onConnectEnd: void 0,
			onClickConnectStart: void 0,
			onClickConnectEnd: void 0
		},
		viewportStore: {
			paneDragging: !1,
			width: i ?? 0,
			height: o ?? 0,
			transform: C
		},
		connectionStore: {
			connection: { ...initialConnection },
			connectionClickStartHandle: null
		},
		nodesStore: {
			nodes: y,
			nodesInitialized: S,
			nodeLookup: m,
			parentLookup: h
		},
		edgesStore: {
			edges: v,
			edgeLookup: _,
			connectionLookup: g
		},
		selectionStore: { userSelectionRect: null }
	};
};
var fa = (e) => {
	let t = da(e), n = createStore(() => t.viewportStore), r = createStore(() => t.connectionStore), i = createStore(() => t.nodesStore), a = createStore(() => t.edgesStore), o = createStore(() => t.selectionStore), c = initialConnection;
	function l(e) {
		return c.inProgress ? {
			...c,
			to: pointToRendererPoint(c.to, e)
		} : c;
	}
	function u(e) {
		let { connection: t } = r.getState();
		c = e;
		let i = l(n.getState().transform);
		r.setState({ connection: i }), f.getState().pubSub.publishConnection(t, i);
	}
	n.subscribe(({ transform: e }, t) => {
		e !== t.transform && c.inProgress && r.setState({ connection: l(e) });
	});
	let f = createStore((e, l) => {
		let f = 0;
		async function p() {
			let { nodeLookup: t } = i.getState(), { panZoom: r, fitViewOptions: a, fitViewResolver: o, minZoom: s, maxZoom: c } = l(), { width: u, height: d } = n.getState();
			if (!r) return;
			let p = ++f, m = await fitViewport({
				nodes: t,
				width: u,
				height: d,
				panZoom: r,
				minZoom: s,
				maxZoom: c
			}, a);
			p === f && (o?.resolve(m), l().fitViewResolver === o && e({ fitViewResolver: null }));
		}
		return {
			...t.optionsStore,
			setNodes: (t) => {
				let { nodeLookup: n, parentLookup: r } = i.getState(), { nodeOrigin: a, nodeExtent: o, elevateNodesOnSelect: s, fitViewQueued: c, zIndexMode: u, nodesSelectionActive: d, pubSub: f } = l(), { nodesInitialized: m, hasSelectedNodes: h, updatedNodes: g } = adoptUserNodes(t, n, r, {
					nodeOrigin: a,
					nodeExtent: o,
					elevateNodesOnSelect: s,
					checkEquality: !0,
					zIndexMode: u
				}), _ = d && h;
				c && m ? (p(), e({
					fitViewQueued: !1,
					fitViewOptions: void 0,
					nodesSelectionActive: _
				})) : d !== _ && e({ nodesSelectionActive: _ }), i.setState({
					nodes: t,
					nodesInitialized: m
				}), f.publishNodes(g);
			},
			setEdges: (e) => {
				let { connectionLookup: t, edgeLookup: n } = a.getState(), { updatedEdges: r } = updateConnectionLookup(t, n, e);
				a.setState({ edges: e }), l().pubSub.publishEdges(r);
			},
			setDefaultNodesAndEdges: (t, n) => {
				if (t) {
					let { setNodes: n } = l();
					n(t), e({ hasDefaultNodes: !0 });
				}
				if (n) {
					let { setEdges: t } = l();
					t(n), e({ hasDefaultEdges: !0 });
				}
			},
			updateNodeInternals: (t) => {
				let { emitNodeChanges: n, domNode: r, nodeOrigin: a, nodeExtent: o, fitViewQueued: s, zIndexMode: c, pubSub: u } = l(), { nodeLookup: d, parentLookup: f } = i.getState(), { changes: m, updatedInternals: h, updatedNodes: g } = updateNodeInternals(t, d, f, r, a, o, c);
				h && (s && (p(), e({
					fitViewQueued: !1,
					fitViewOptions: void 0
				})), i.setState({}), u.publishNodes(g), n(m));
			},
			updateNodePositions: (e, t = !1) => {
				let n = [], r = [], { nodeLookup: a } = i.getState(), { emitNodeChanges: o, onNodesChangeMiddlewareMap: s } = l();
				for (let [i, o] of e) {
					let e = a.get(i), s = !!(e?.expandParent && e?.parentId && o?.position), l = {
						id: i,
						type: `position`,
						position: s ? {
							x: Math.max(0, o.position.x),
							y: Math.max(0, o.position.y)
						} : o.position,
						dragging: t
					};
					if (e && c.inProgress && c.fromNode.id === e.id) {
						let t = getHandlePosition(e, c.fromHandle, Position.Left, !0);
						u({
							...c,
							from: t
						});
					}
					s && e.parentId && n.push({
						id: i,
						parentId: e.parentId,
						rect: {
							...o.internals.positionAbsolute,
							width: o.measured.width ?? 0,
							height: o.measured.height ?? 0
						}
					}), r.push(l);
				}
				if (n.length > 0) {
					let { parentLookup: e } = i.getState(), { nodeOrigin: t } = l(), o = handleExpandParent(n, a, e, t);
					r.push(...o);
				}
				for (let e of s.values()) r = e(r);
				o(r);
			},
			emitNodeChanges: (e) => {
				if (e.length === 0) return;
				let { debug: t, onNodesChange: n, hasDefaultNodes: r } = l(), a = new NodeChangeset(e);
				if (t && console.log(`React Flow: queue node changes`, e), r) {
					let { nodes: e } = i.getState(), { setNodes: t } = l();
					t(a.applyTo(e));
				}
				n?.(a);
			},
			emitEdgeChanges: (e) => {
				if (e.length === 0) return;
				let { debug: t, hasDefaultEdges: n, onEdgesChange: r } = l(), i = new EdgeChangeset(e);
				if (t && console.log(`React Flow: queue edge changes`, e), n) {
					let { setEdges: e } = l(), { edges: t } = a.getState();
					e(i.applyTo(t));
				}
				r?.(i);
			},
			addSelectedNodes: (e) => {
				let { multiSelectionActive: t, emitNodeChanges: n, emitEdgeChanges: r } = l(), { edgeLookup: o } = a.getState(), { nodeLookup: s } = i.getState();
				t ? n(e.map((e) => selectionChange(e, !0))) : (n(getSelectionChanges(s, /* @__PURE__ */ new Set([...e]))), r(getSelectionChanges(o)));
			},
			addSelectedEdges: (e) => {
				let { multiSelectionActive: t, emitNodeChanges: n, emitEdgeChanges: r } = l(), { edgeLookup: o } = a.getState(), { nodeLookup: s } = i.getState();
				t ? r(e.map((e) => selectionChange(e, !0))) : (r(getSelectionChanges(o, /* @__PURE__ */ new Set([...e]))), n(getSelectionChanges(s, /* @__PURE__ */ new Set())));
			},
			unselectNodesAndEdges: ({ nodes: e, edges: t } = {}) => {
				let { edges: n } = a.getState(), { nodes: r } = i.getState(), { emitNodeChanges: o, emitEdgeChanges: s } = l(), c = e || r, u = t || n, d = [];
				for (let e of c) e.selected && d.push(selectionChange(e.id, !1));
				let f = [];
				for (let e of u) e.selected && f.push(selectionChange(e.id, !1));
				o(d), s(f);
			},
			setMinZoom: (t) => {
				let { panZoom: n, maxZoom: r } = l();
				n?.setScaleExtent([t, r]), e({ minZoom: t });
			},
			setMaxZoom: (t) => {
				let { panZoom: n, minZoom: r } = l();
				n?.setScaleExtent([r, t]), e({ maxZoom: t });
			},
			setTranslateExtent: (t) => {
				l().panZoom?.setTranslateExtent(t), e({ translateExtent: t });
			},
			resetSelectedElements: () => {
				let { edges: e } = a.getState(), { nodes: t } = i.getState(), { emitNodeChanges: n, emitEdgeChanges: r, elementsSelectable: o } = l();
				if (!o) return;
				let s = t.reduce((e, t) => t.selected ? [...e, selectionChange(t.id, !1)] : e, []), c = e.reduce((e, t) => t.selected ? [...e, selectionChange(t.id, !1)] : e, []);
				n(s), r(c);
			},
			setNodeExtent: (t) => {
				let { nodes: n, nodeLookup: r, parentLookup: a } = i.getState(), { nodeOrigin: o, elevateNodesOnSelect: s, nodeExtent: c, zIndexMode: u, pubSub: d } = l();
				if (t[0][0] === c[0][0] && t[0][1] === c[0][1] && t[1][0] === c[1][0] && t[1][1] === c[1][1]) return;
				let { updatedNodes: f } = adoptUserNodes(n, r, a, {
					nodeOrigin: o,
					nodeExtent: t,
					elevateNodesOnSelect: s,
					checkEquality: !1,
					zIndexMode: u
				});
				e({ nodeExtent: t }), i.setState({}), d.publishNodes(f);
			},
			panBy: (e) => {
				let { transform: t, width: r, height: i } = n.getState(), { panZoom: a, translateExtent: o } = l();
				return panBy({
					delta: e,
					panZoom: a,
					transform: t,
					translateExtent: o,
					width: r,
					height: i
				});
			},
			setCenter: async (e, t, r) => {
				let { width: i, height: a } = n.getState(), { maxZoom: o, panZoom: s } = l();
				if (!s) return !1;
				let c = r?.zoom === void 0 ? o : r.zoom;
				return s.setViewport({
					x: i / 2 - e * c,
					y: a / 2 - t * c,
					zoom: c
				}, {
					duration: r?.duration,
					ease: r?.ease,
					interpolate: r?.interpolate
				});
			},
			cancelConnection: () => u(initialConnection),
			updateConnection: (e) => u(e),
			updateConnectionClickStart: (e) => {
				r.setState({ connectionClickStartHandle: e }), l().pubSub.publishConnectionClickStart();
			},
			reset: () => {
				let t = da();
				n.setState(t.viewportStore), c = initialConnection, r.setState(t.connectionStore), i.setState(t.nodesStore), a.setState(t.edgesStore), o.setState(t.selectionStore);
				let { pubSub: s } = l();
				e({
					...t.optionsStore,
					pubSub: s
				}), s.reset();
			}
		};
	});
	return {
		optionsStore: f,
		viewportStore: n,
		connectionStore: r,
		nodesStore: i,
		edgesStore: a,
		selectionStore: o
	};
};
function pa(t) {
	let n = (0, import_dist.c)(19), { initialNodes: r, initialEdges: i, defaultNodes: a, defaultEdges: o, initialWidth: s, initialHeight: c, initialMinZoom: l, initialMaxZoom: u, initialFitViewOptions: d, fitView: f, nodeOrigin: p, nodeExtent: m, zIndexMode: h, children: g } = t, _;
	n[0] !== o || n[1] !== a || n[2] !== i || n[3] !== f || n[4] !== d || n[5] !== c || n[6] !== u || n[7] !== l || n[8] !== m || n[9] !== p || n[10] !== r || n[11] !== s || n[12] !== h ? (_ = () => fa({
		nodes: r,
		edges: i,
		defaultNodes: a,
		defaultEdges: o,
		width: s,
		height: c,
		fitView: f,
		minZoom: l,
		maxZoom: u,
		fitViewOptions: d,
		nodeOrigin: p,
		nodeExtent: m,
		zIndexMode: h
	}), n[0] = o, n[1] = a, n[2] = i, n[3] = f, n[4] = d, n[5] = c, n[6] = u, n[7] = l, n[8] = m, n[9] = p, n[10] = r, n[11] = s, n[12] = h, n[13] = _) : _ = n[13];
	let [v] = (0, import_react.useState)(_), y;
	n[14] === g ? y = n[15] : (y = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(yn, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ir, { children: g }) }), n[14] = g, n[15] = y);
	let b;
	return n[16] !== v || n[17] !== y ? (b = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(yt, {
		value: v,
		children: y
	}), n[16] = v, n[17] = y, n[18] = b) : b = n[18], b;
}
function ma(t) {
	let n = (0, import_dist.c)(17), { children: r, nodes: i, edges: a, defaultNodes: o, defaultEdges: s, width: c, height: l, fitView: u, fitViewOptions: d, minZoom: f, maxZoom: p, nodeOrigin: m, nodeExtent: h, zIndexMode: g } = t;
	if ((0, import_react.useContext)(vt)) {
		let e;
		return n[0] === r ? e = n[1] : (e = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: r }), n[0] = r, n[1] = e), e;
	}
	let _;
	return n[2] !== r || n[3] !== s || n[4] !== o || n[5] !== a || n[6] !== u || n[7] !== d || n[8] !== l || n[9] !== p || n[10] !== f || n[11] !== h || n[12] !== m || n[13] !== i || n[14] !== c || n[15] !== g ? (_ = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(pa, {
		initialNodes: i,
		initialEdges: a,
		defaultNodes: o,
		defaultEdges: s,
		initialWidth: c,
		initialHeight: l,
		fitView: u,
		initialFitViewOptions: d,
		initialMinZoom: f,
		initialMaxZoom: p,
		nodeOrigin: m,
		nodeExtent: h,
		zIndexMode: g,
		children: r
	}), n[2] = r, n[3] = s, n[4] = o, n[5] = a, n[6] = u, n[7] = d, n[8] = l, n[9] = p, n[10] = f, n[11] = h, n[12] = m, n[13] = i, n[14] = c, n[15] = g, n[16] = _) : _ = n[16], _;
}
var ha = {
	width: `100%`,
	height: `100%`,
	overflow: `hidden`,
	position: `relative`,
	zIndex: 0
};
function ga(n, i) {
	let a = (0, import_dist.c)(294), o, s, c, l, u, d, f, m, h, g, _, v, b, x, S, C, w, T, E, D, O, k, A, j, M, N, P, F, I, L, R, ee, z, B, V, H, U, W, G, K, q, J, Y, X, te, ne, re, ie, ae, oe, se, ce, le, ue, de, fe, pe, me, he, ge, _e, ve, ye, be, xe, Se, Ce, we, Te, Ee, De, Oe, ke, je, Me, Ne, Pe, Fe, Le, Re, ze, Be, Ve, He, Ue, We, Ge, Ke, qe, Je, Ye, Xe, Ze, Qe, $e, et, tt, nt, rt, it, at, ot, st, ct, lt, ut, dt, ft, pt, ht, gt, _t, vt, yt, bt, xt, St, Ct, Q, $, wt, Tt, Et, Dt, Ot, kt, At;
	a[0] === n ? (o = a[1], s = a[2], c = a[3], l = a[4], u = a[5], d = a[6], f = a[7], m = a[8], h = a[9], g = a[10], _ = a[11], v = a[12], b = a[13], x = a[14], S = a[15], C = a[16], w = a[17], T = a[18], E = a[19], D = a[20], O = a[21], k = a[22], A = a[23], j = a[24], M = a[25], N = a[26], P = a[27], F = a[28], I = a[29], L = a[30], R = a[31], ee = a[32], z = a[33], B = a[34], V = a[35], H = a[36], U = a[37], W = a[38], G = a[39], K = a[40], q = a[41], J = a[42], Y = a[43], X = a[44], te = a[45], ne = a[46], re = a[47], ie = a[48], ae = a[49], oe = a[50], se = a[51], ce = a[52], le = a[53], ue = a[54], de = a[55], fe = a[56], pe = a[57], me = a[58], he = a[59], ge = a[60], _e = a[61], ve = a[62], ye = a[63], be = a[64], xe = a[65], Se = a[66], Ce = a[67], we = a[68], Te = a[69], Ee = a[70], De = a[71], Oe = a[72], ke = a[73], je = a[74], Me = a[75], Ne = a[76], Pe = a[77], Fe = a[78], Le = a[79], Re = a[80], ze = a[81], Be = a[82], Ve = a[83], He = a[84], Ue = a[85], We = a[86], Ge = a[87], Ke = a[88], qe = a[89], Je = a[90], Ye = a[91], Xe = a[92], Ze = a[93], Qe = a[94], $e = a[95], et = a[96], tt = a[97], nt = a[98], rt = a[99], it = a[100], at = a[101], ot = a[102], st = a[103], ct = a[104], lt = a[105], ut = a[106], dt = a[107], ft = a[108], pt = a[109], ht = a[110], gt = a[111], _t = a[112], vt = a[113], yt = a[114], bt = a[115], xt = a[116], St = a[117], Ct = a[118], Q = a[119], $ = a[120], wt = a[121], Tt = a[122], Et = a[123], Dt = a[124], Ot = a[125], kt = a[126], At = a[127]) : ({nodes: z, edges: O, defaultNodes: E, defaultEdges: T, className: m, nodeTypes: ee, edgeTypes: D, onNodeClick: pe, onEdgeClick: X, onInit: le, onMove: ue, onMoveStart: fe, onMoveEnd: de, onConnect: K, onConnectStart: J, onConnectEnd: q, onClickConnectStart: G, onClickConnectEnd: W, onNodeMouseEnter: ye, onNodeMouseMove: xe, onNodeMouseLeave: be, onNodeContextMenu: me, onNodeDoubleClick: he, onNodeDragStart: _e, onNodeDrag: ge, onNodeDragStop: ve, onNodesDelete: Ce, onEdgesDelete: se, onDelete: Y, onSelectionChange: Fe, onSelectionDragStart: ze, onSelectionDrag: Re, onSelectionDragStop: Be, onSelectionContextMenu: Le, onSelectionStart: He, onSelectionEnd: Ve, onBeforeDelete: U, connectionMode: x, connectionLineType: Xe, connectionLineStyle: b, connectionLineComponent: _, connectionLineContainerStyle: v, deleteKeyCode: st, selectionKeyCode: yt, selectionOnDrag: $, selectionMode: wt, panActivationKeyCode: Tt, multiSelectionKeyCode: Et, zoomActivationKeyCode: Dt, snapToGrid: Je, snapGrid: qe, onlyRenderVisibleElements: Ot, selectNodesOnDrag: Ke, nodesDraggable: V, autoPanOnNodeFocus: u, nodesConnectable: B, nodesFocusable: H, nodeOrigin: Ze, edgesFocusable: k, edgesReconnectable: A, elementsSelectable: Qe, defaultViewport: $e, minZoom: et, maxZoom: tt, translateExtent: nt, preventScrolling: rt, nodeExtent: R, defaultMarkerColor: it, zoomOnScroll: at, zoomOnPinch: ot, panOnScroll: ct, panOnScrollSpeed: lt, panOnScrollMode: ut, zoomOnDoubleClick: dt, panOnDrag: ft, onPaneClick: we, onPaneMouseEnter: Ee, onPaneMouseMove: Oe, onPaneMouseLeave: De, onPaneScroll: ke, onPaneContextMenu: Te, paneDragThreshold: pt, children: f, onReconnect: je, onReconnectStart: Ne, onReconnectEnd: Me, onEdgeContextMenu: te, onEdgeDoubleClick: ne, onEdgeMouseEnter: re, onEdgeMouseMove: ae, onEdgeMouseLeave: ie, reconnectRadius: ht, onNodesChange: Se, onEdgesChange: oe, noDragClassName: gt, noWheelClassName: _t, noPanClassName: vt, fitView: j, fitViewOptions: M, connectOnClick: h, attributionPosition: s, proOptions: We, defaultEdgeOptions: w, elevateNodesOnSelect: bt, elevateEdgesOnSelect: xt, disableKeyboardA11y: St, autoPanOnConnect: c, autoPanOnNodeDrag: l, autoPanOnSelection: Ct, autoPanSpeed: d, connectionRadius: S, isValidConnection: I, onError: ce, style: Ye, id: F, nodeDragThreshold: L, connectionDragThreshold: g, viewport: kt, onViewportChange: Ue, width: At, height: P, forceColorMode: N, debug: C, onScroll: Pe, ariaLabelConfig: o, zIndexMode: Q, ...Ge} = n, a[0] = n, a[1] = o, a[2] = s, a[3] = c, a[4] = l, a[5] = u, a[6] = d, a[7] = f, a[8] = m, a[9] = h, a[10] = g, a[11] = _, a[12] = v, a[13] = b, a[14] = x, a[15] = S, a[16] = C, a[17] = w, a[18] = T, a[19] = E, a[20] = D, a[21] = O, a[22] = k, a[23] = A, a[24] = j, a[25] = M, a[26] = N, a[27] = P, a[28] = F, a[29] = I, a[30] = L, a[31] = R, a[32] = ee, a[33] = z, a[34] = B, a[35] = V, a[36] = H, a[37] = U, a[38] = W, a[39] = G, a[40] = K, a[41] = q, a[42] = J, a[43] = Y, a[44] = X, a[45] = te, a[46] = ne, a[47] = re, a[48] = ie, a[49] = ae, a[50] = oe, a[51] = se, a[52] = ce, a[53] = le, a[54] = ue, a[55] = de, a[56] = fe, a[57] = pe, a[58] = me, a[59] = he, a[60] = ge, a[61] = _e, a[62] = ve, a[63] = ye, a[64] = be, a[65] = xe, a[66] = Se, a[67] = Ce, a[68] = we, a[69] = Te, a[70] = Ee, a[71] = De, a[72] = Oe, a[73] = ke, a[74] = je, a[75] = Me, a[76] = Ne, a[77] = Pe, a[78] = Fe, a[79] = Le, a[80] = Re, a[81] = ze, a[82] = Be, a[83] = Ve, a[84] = He, a[85] = Ue, a[86] = We, a[87] = Ge, a[88] = Ke, a[89] = qe, a[90] = Je, a[91] = Ye, a[92] = Xe, a[93] = Ze, a[94] = Qe, a[95] = $e, a[96] = et, a[97] = tt, a[98] = nt, a[99] = rt, a[100] = it, a[101] = at, a[102] = ot, a[103] = st, a[104] = ct, a[105] = lt, a[106] = ut, a[107] = dt, a[108] = ft, a[109] = pt, a[110] = ht, a[111] = gt, a[112] = _t, a[113] = vt, a[114] = yt, a[115] = bt, a[116] = xt, a[117] = St, a[118] = Ct, a[119] = Q, a[120] = $, a[121] = wt, a[122] = Tt, a[123] = Et, a[124] = Dt, a[125] = Ot, a[126] = kt, a[127] = At);
	let jt = Xe === void 0 ? ConnectionLineType.Bezier : Xe, Mt = st === void 0 ? `Backspace` : st, Nt = yt === void 0 ? `Shift` : yt, Pt = $ !== void 0 && $, Ft = wt === void 0 ? SelectionMode.Full : wt, Lt = Tt === void 0 ? `Space` : Tt, Rt = Et === void 0 ? isMacOs() ? `Meta` : `Control` : Et, zt = Dt === void 0 ? isMacOs() ? `Meta` : `Control` : Dt, Vt = Ot !== void 0 && Ot, Ht = Ze === void 0 ? Yt : Ze, Ut = Qe === void 0 || Qe, Wt = $e === void 0 ? Xt : $e, Gt = et === void 0 ? .5 : et, Kt = tt === void 0 ? 2 : tt, qt = nt === void 0 ? infiniteExtent : nt, Zt = rt === void 0 || rt, Qt = it === void 0 ? `#b1b1b7` : it, en = at === void 0 || at, tn = ot === void 0 || ot, nn = ct !== void 0 && ct, rn = lt === void 0 ? .5 : lt, an = ut === void 0 ? PanOnScrollMode.Free : ut, on = dt === void 0 || dt, sn = ft === void 0 || ft, cn = pt === void 0 ? 1 : pt, ln = ht === void 0 ? 10 : ht, un = gt === void 0 ? `nodrag` : gt, dn = _t === void 0 ? `nowheel` : _t, fn = vt === void 0 ? `nopan` : vt, pn = bt === void 0 || bt, mn = xt === void 0 || xt, hn = St !== void 0 && St, gn = Ct === void 0 || Ct, _n = Q === void 0 ? `basic` : Q, vn = F || `1`, yn;
	a[128] === Pe ? yn = a[129] : (yn = (e) => {
		e.currentTarget.scrollTo({
			top: 0,
			left: 0,
			behavior: `instant`
		}), Pe?.(e);
	}, a[128] = Pe, a[129] = yn);
	let bn = yn, xn;
	a[130] === Ye ? xn = a[131] : (xn = {
		...Ye,
		...ha
	}, a[130] = Ye, a[131] = xn);
	let Sn;
	a[132] !== m || a[133] !== N ? (Sn = cc([
		`react-flow`,
		N,
		m
	]), a[132] = m, a[133] = N, a[134] = Sn) : Sn = a[134];
	let Cn;
	a[135] !== o || a[136] !== c || a[137] !== l || a[138] !== u || a[139] !== d || a[140] !== h || a[141] !== g || a[142] !== x || a[143] !== S || a[144] !== C || a[145] !== w || a[146] !== T || a[147] !== E || a[148] !== O || a[149] !== k || a[150] !== A || a[151] !== Ut || a[152] !== mn || a[153] !== pn || a[154] !== j || a[155] !== M || a[156] !== I || a[157] !== Kt || a[158] !== Gt || a[159] !== fn || a[160] !== L || a[161] !== R || a[162] !== Ht || a[163] !== z || a[164] !== B || a[165] !== V || a[166] !== H || a[167] !== U || a[168] !== W || a[169] !== G || a[170] !== K || a[171] !== q || a[172] !== J || a[173] !== Y || a[174] !== oe || a[175] !== se || a[176] !== ce || a[177] !== ue || a[178] !== de || a[179] !== fe || a[180] !== ge || a[181] !== _e || a[182] !== ve || a[183] !== Se || a[184] !== Ce || a[185] !== Re || a[186] !== ze || a[187] !== Be || a[188] !== vn || a[189] !== Ke || a[190] !== qe || a[191] !== Je || a[192] !== qt || a[193] !== _n ? (Cn = /* @__PURE__ */ (0, import_jsx_runtime.jsx)($t, {
		nodes: z,
		edges: O,
		defaultNodes: E,
		defaultEdges: T,
		onConnect: K,
		onConnectStart: J,
		onConnectEnd: q,
		onClickConnectStart: G,
		onClickConnectEnd: W,
		nodesDraggable: V,
		autoPanOnNodeFocus: u,
		nodesConnectable: B,
		nodesFocusable: H,
		edgesFocusable: k,
		edgesReconnectable: A,
		elementsSelectable: Ut,
		elevateNodesOnSelect: pn,
		elevateEdgesOnSelect: mn,
		minZoom: Gt,
		maxZoom: Kt,
		nodeExtent: R,
		onNodesChange: Se,
		onEdgesChange: oe,
		snapToGrid: Je,
		snapGrid: qe,
		connectionMode: x,
		translateExtent: qt,
		connectOnClick: h,
		defaultEdgeOptions: w,
		fitView: j,
		fitViewOptions: M,
		onNodesDelete: Ce,
		onEdgesDelete: se,
		onDelete: Y,
		onNodeDragStart: _e,
		onNodeDrag: ge,
		onNodeDragStop: ve,
		onSelectionDrag: Re,
		onSelectionDragStart: ze,
		onSelectionDragStop: Be,
		onMove: ue,
		onMoveStart: fe,
		onMoveEnd: de,
		noPanClassName: fn,
		nodeOrigin: Ht,
		rfId: vn,
		autoPanOnConnect: c,
		autoPanOnNodeDrag: l,
		autoPanSpeed: d,
		onError: ce,
		connectionRadius: S,
		isValidConnection: I,
		selectNodesOnDrag: Ke,
		nodeDragThreshold: L,
		connectionDragThreshold: g,
		onBeforeDelete: U,
		debug: C,
		ariaLabelConfig: o,
		zIndexMode: _n
	}), a[135] = o, a[136] = c, a[137] = l, a[138] = u, a[139] = d, a[140] = h, a[141] = g, a[142] = x, a[143] = S, a[144] = C, a[145] = w, a[146] = T, a[147] = E, a[148] = O, a[149] = k, a[150] = A, a[151] = Ut, a[152] = mn, a[153] = pn, a[154] = j, a[155] = M, a[156] = I, a[157] = Kt, a[158] = Gt, a[159] = fn, a[160] = L, a[161] = R, a[162] = Ht, a[163] = z, a[164] = B, a[165] = V, a[166] = H, a[167] = U, a[168] = W, a[169] = G, a[170] = K, a[171] = q, a[172] = J, a[173] = Y, a[174] = oe, a[175] = se, a[176] = ce, a[177] = ue, a[178] = de, a[179] = fe, a[180] = ge, a[181] = _e, a[182] = ve, a[183] = Se, a[184] = Ce, a[185] = Re, a[186] = ze, a[187] = Be, a[188] = vn, a[189] = Ke, a[190] = qe, a[191] = Je, a[192] = qt, a[193] = _n, a[194] = Cn) : Cn = a[194];
	let wn;
	a[195] !== gn || a[196] !== _ || a[197] !== v || a[198] !== b || a[199] !== jt || a[200] !== Qt || a[201] !== Wt || a[202] !== Mt || a[203] !== hn || a[204] !== D || a[205] !== Kt || a[206] !== Gt || a[207] !== Rt || a[208] !== un || a[209] !== fn || a[210] !== dn || a[211] !== R || a[212] !== ee || a[213] !== V || a[214] !== X || a[215] !== te || a[216] !== ne || a[217] !== re || a[218] !== ie || a[219] !== ae || a[220] !== le || a[221] !== pe || a[222] !== me || a[223] !== he || a[224] !== ye || a[225] !== be || a[226] !== xe || a[227] !== we || a[228] !== Te || a[229] !== Ee || a[230] !== De || a[231] !== Oe || a[232] !== ke || a[233] !== je || a[234] !== Me || a[235] !== Ne || a[236] !== Le || a[237] !== Ve || a[238] !== He || a[239] !== Ue || a[240] !== Vt || a[241] !== Lt || a[242] !== sn || a[243] !== nn || a[244] !== an || a[245] !== rn || a[246] !== cn || a[247] !== Zt || a[248] !== ln || a[249] !== vn || a[250] !== Nt || a[251] !== Ft || a[252] !== Pt || a[253] !== qt || a[254] !== kt || a[255] !== zt || a[256] !== on || a[257] !== tn || a[258] !== en ? (wn = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(na, {
		onInit: le,
		onNodeClick: pe,
		onEdgeClick: X,
		onNodeMouseEnter: ye,
		onNodeMouseMove: xe,
		onNodeMouseLeave: be,
		onNodeContextMenu: me,
		onNodeDoubleClick: he,
		nodeTypes: ee,
		edgeTypes: D,
		connectionLineType: jt,
		connectionLineStyle: b,
		connectionLineComponent: _,
		connectionLineContainerStyle: v,
		selectionKeyCode: Nt,
		selectionOnDrag: Pt,
		selectionMode: Ft,
		deleteKeyCode: Mt,
		multiSelectionKeyCode: Rt,
		panActivationKeyCode: Lt,
		zoomActivationKeyCode: zt,
		onlyRenderVisibleElements: Vt,
		defaultViewport: Wt,
		translateExtent: qt,
		minZoom: Gt,
		maxZoom: Kt,
		preventScrolling: Zt,
		zoomOnScroll: en,
		zoomOnPinch: tn,
		zoomOnDoubleClick: on,
		panOnScroll: nn,
		panOnScrollSpeed: rn,
		panOnScrollMode: an,
		panOnDrag: sn,
		autoPanOnSelection: gn,
		onPaneClick: we,
		onPaneMouseEnter: Ee,
		onPaneMouseMove: Oe,
		onPaneMouseLeave: De,
		onPaneScroll: ke,
		onPaneContextMenu: Te,
		paneDragThreshold: cn,
		onSelectionContextMenu: Le,
		onSelectionStart: He,
		onSelectionEnd: Ve,
		onReconnect: je,
		onReconnectStart: Ne,
		onReconnectEnd: Me,
		onEdgeContextMenu: te,
		onEdgeDoubleClick: ne,
		onEdgeMouseEnter: re,
		onEdgeMouseMove: ae,
		onEdgeMouseLeave: ie,
		reconnectRadius: ln,
		defaultMarkerColor: Qt,
		noDragClassName: un,
		noWheelClassName: dn,
		noPanClassName: fn,
		rfId: vn,
		disableKeyboardA11y: hn,
		nodeExtent: R,
		viewport: kt,
		onViewportChange: Ue,
		nodesDraggable: V
	}), a[195] = gn, a[196] = _, a[197] = v, a[198] = b, a[199] = jt, a[200] = Qt, a[201] = Wt, a[202] = Mt, a[203] = hn, a[204] = D, a[205] = Kt, a[206] = Gt, a[207] = Rt, a[208] = un, a[209] = fn, a[210] = dn, a[211] = R, a[212] = ee, a[213] = V, a[214] = X, a[215] = te, a[216] = ne, a[217] = re, a[218] = ie, a[219] = ae, a[220] = le, a[221] = pe, a[222] = me, a[223] = he, a[224] = ye, a[225] = be, a[226] = xe, a[227] = we, a[228] = Te, a[229] = Ee, a[230] = De, a[231] = Oe, a[232] = ke, a[233] = je, a[234] = Me, a[235] = Ne, a[236] = Le, a[237] = Ve, a[238] = He, a[239] = Ue, a[240] = Vt, a[241] = Lt, a[242] = sn, a[243] = nn, a[244] = an, a[245] = rn, a[246] = cn, a[247] = Zt, a[248] = ln, a[249] = vn, a[250] = Nt, a[251] = Ft, a[252] = Pt, a[253] = qt, a[254] = kt, a[255] = zt, a[256] = on, a[257] = tn, a[258] = en, a[259] = wn) : wn = a[259];
	let Tn;
	a[260] === Fe ? Tn = a[261] : (Tn = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Jt, { onSelectionChange: Fe }), a[260] = Fe, a[261] = Tn);
	let En;
	a[262] !== s || a[263] !== We ? (En = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bt, {
		proOptions: We,
		position: s
	}), a[262] = s, a[263] = We, a[264] = En) : En = a[264];
	let Dn;
	a[265] !== hn || a[266] !== vn ? (Dn = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(It, {
		rfId: vn,
		disableKeyboardA11y: hn
	}), a[265] = hn, a[266] = vn, a[267] = Dn) : Dn = a[267];
	let On;
	a[268] !== f || a[269] !== O || a[270] !== j || a[271] !== M || a[272] !== P || a[273] !== Kt || a[274] !== Gt || a[275] !== R || a[276] !== Ht || a[277] !== z || a[278] !== Cn || a[279] !== wn || a[280] !== Tn || a[281] !== En || a[282] !== Dn || a[283] !== At || a[284] !== _n ? (On = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ma, {
		nodes: z,
		edges: O,
		width: At,
		height: P,
		fitView: j,
		fitViewOptions: M,
		minZoom: Gt,
		maxZoom: Kt,
		nodeOrigin: Ht,
		nodeExtent: R,
		zIndexMode: _n,
		children: [
			Cn,
			wn,
			Tn,
			f,
			En,
			Dn
		]
	}), a[268] = f, a[269] = O, a[270] = j, a[271] = M, a[272] = P, a[273] = Kt, a[274] = Gt, a[275] = R, a[276] = Ht, a[277] = z, a[278] = Cn, a[279] = wn, a[280] = Tn, a[281] = En, a[282] = Dn, a[283] = At, a[284] = _n, a[285] = On) : On = a[285];
	let kn;
	return a[286] !== F || a[287] !== i || a[288] !== Ge || a[289] !== xn || a[290] !== Sn || a[291] !== On || a[292] !== bn ? (kn = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		"data-testid": `rf__wrapper`,
		...Ge,
		onScroll: bn,
		style: xn,
		ref: i,
		className: Sn,
		id: F,
		role: `application`,
		children: On
	}), a[286] = F, a[287] = i, a[288] = Ge, a[289] = xn, a[290] = Sn, a[291] = On, a[292] = bn, a[293] = kn) : kn = a[293], kn;
}
var _a = pn(ga);
function Ca() {
	let t = (0, import_dist.c)(4), { transform: n } = wt(), [r, i, a] = n, o;
	return t[0] !== r || t[1] !== i || t[2] !== a ? (o = {
		x: r,
		y: i,
		zoom: a
	}, t[0] = r, t[1] = i, t[2] = a, t[3] = o) : o = t[3], o;
}
function wa(t) {
	let n = (0, import_dist.c)(3), [r, i] = (0, import_react.useState)(t), a;
	n[0] === Symbol.for(`react.memo_cache_sentinel`) ? (a = (e) => i((t) => e.applyTo(t)), n[0] = a) : a = n[0];
	let o = a, s;
	return n[1] === r ? s = n[2] : (s = [
		r,
		i,
		o
	], n[1] = r, n[2] = s), s;
}
function Ta(t) {
	let n = (0, import_dist.c)(3), [r, i] = (0, import_react.useState)(t), a;
	n[0] === Symbol.for(`react.memo_cache_sentinel`) ? (a = (e) => i((t) => e.applyTo(t)), n[0] = a) : a = n[0];
	let o = a, s;
	return n[1] === r ? s = n[2] : (s = [
		r,
		i,
		o
	], n[1] = r, n[2] = s), s;
}
errorMessages.error014();
function Ia(n) {
	let r = (0, import_dist.c)(7), { dimensions: i, lineWidth: a, variant: o, className: s } = n, c = `M${i[0] / 2} 0 V${i[1]} M0 ${i[1] / 2} H${i[0]}`, l;
	r[0] !== s || r[1] !== o ? (l = cc([
		`react-flow__background-pattern`,
		o,
		s
	]), r[0] = s, r[1] = o, r[2] = l) : l = r[2];
	let u;
	return r[3] !== a || r[4] !== c || r[5] !== l ? (u = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, {
		strokeWidth: a,
		d: c,
		className: l
	}), r[3] = a, r[4] = c, r[5] = l, r[6] = u) : u = r[6], u;
}
function La(n) {
	let r = (0, import_dist.c)(5), { radius: i, className: a } = n, o;
	r[0] === a ? o = r[1] : (o = cc([
		`react-flow__background-pattern`,
		`dots`,
		a
	]), r[0] = a, r[1] = o);
	let s;
	return r[2] !== i || r[3] !== o ? (s = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`circle`, {
		cx: i,
		cy: i,
		r: i,
		className: o
	}), r[2] = i, r[3] = o, r[4] = s) : s = r[4], s;
}
var Ra = /* @__PURE__ */ function(e) {
	return e.Lines = `lines`, e.Dots = `dots`, e.Cross = `cross`, e;
}({});
var za = {
	dots: 1,
	lines: 1,
	cross: 6
};
function Ba(n) {
	let r = (0, import_dist.c)(42), { id: i, variant: a, gap: o, size: s, lineWidth: c, offset: l, color: u, bgColor: d, style: f, className: p, patternClassName: m } = n, h = a === void 0 ? `dots` : a, g = o === void 0 ? 20 : o, _ = c === void 0 ? 1 : c, v = l === void 0 ? 0 : l, y = (0, import_react.useRef)(null), b = `pattern-${Q(Ha)}`, x = wt(Va), S = s || za[h], C = h === `dots`, w = h === `cross`, T;
	r[0] === g ? T = r[1] : (T = Array.isArray(g) ? g : [g, g], r[0] = g, r[1] = T);
	let E = T, D = E[0] * x[2] || 1, O = E[1] * x[2] || 1, k;
	r[2] !== D || r[3] !== O ? (k = [D, O], r[2] = D, r[3] = O, r[4] = k) : k = r[4];
	let A = k, j = S * x[2], M;
	r[5] === v ? M = r[6] : (M = Array.isArray(v) ? v : [v, v], r[5] = v, r[6] = M);
	let N = M, P;
	r[7] !== w || r[8] !== A || r[9] !== j ? (P = w ? [j, j] : A, r[7] = w, r[8] = A, r[9] = j, r[10] = P) : P = r[10];
	let F = P, I = N[0] * x[2] + F[0] / 2, L = N[1] * x[2] + F[1] / 2, R;
	r[11] !== I || r[12] !== L ? (R = [I, L], r[11] = I, r[12] = L, r[13] = R) : R = r[13];
	let ee = R, z = `${b}${i || ``}`, B;
	r[14] === p ? B = r[15] : (B = cc([`react-flow__background`, p]), r[14] = p, r[15] = B);
	let V;
	r[16] !== d || r[17] !== u || r[18] !== f ? (V = {
		...f,
		...Pn,
		"--xy-background-color-props": d,
		"--xy-background-pattern-color-props": u
	}, r[16] = d, r[17] = u, r[18] = f, r[19] = V) : V = r[19];
	let H = V, U = x[0] % A[0], W = x[1] % A[1], G = `translate(-${ee[0]},-${ee[1]})`, K;
	r[20] !== C || r[21] !== _ || r[22] !== m || r[23] !== F || r[24] !== j || r[25] !== h ? (K = C ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(La, {
		radius: j / 2,
		className: m
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ia, {
		dimensions: F,
		lineWidth: _,
		variant: h,
		className: m
	}), r[20] = C, r[21] = _, r[22] = m, r[23] = F, r[24] = j, r[25] = h, r[26] = K) : K = r[26];
	let q;
	r[27] !== z || r[28] !== A[0] || r[29] !== A[1] || r[30] !== U || r[31] !== W || r[32] !== G || r[33] !== K ? (q = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`pattern`, {
		id: z,
		x: U,
		y: W,
		width: A[0],
		height: A[1],
		patternUnits: `userSpaceOnUse`,
		patternTransform: G,
		children: K
	}), r[27] = z, r[28] = A[0], r[29] = A[1], r[30] = U, r[31] = W, r[32] = G, r[33] = K, r[34] = q) : q = r[34];
	let J = `url(#${z})`, Y;
	r[35] === J ? Y = r[36] : (Y = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`rect`, {
		x: `0`,
		y: `0`,
		width: `100%`,
		height: `100%`,
		fill: J
	}), r[35] = J, r[36] = Y);
	let X;
	return r[37] !== B || r[38] !== H || r[39] !== q || r[40] !== Y ? (X = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(`svg`, {
		className: B,
		style: H,
		ref: y,
		"data-testid": `rf__background`,
		children: [q, Y]
	}), r[37] = B, r[38] = H, r[39] = q, r[40] = Y, r[41] = X) : X = r[41], X;
}
function Va(e) {
	return e.transform;
}
function Ha(e) {
	return e.rfId;
}
Ba.displayName = `Background`;
var Ua = (0, import_react.memo)(Ba);
function Wa() {
	let t = (0, import_dist.c)(1), n;
	return t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (n = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		xmlns: `http://www.w3.org/2000/svg`,
		viewBox: `0 0 32 32`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, { d: `M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z` })
	}), t[0] = n) : n = t[0], n;
}
function Ga() {
	let t = (0, import_dist.c)(1), n;
	return t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (n = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		xmlns: `http://www.w3.org/2000/svg`,
		viewBox: `0 0 32 5`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, { d: `M0 0h32v4.2H0z` })
	}), t[0] = n) : n = t[0], n;
}
function Ka() {
	let t = (0, import_dist.c)(1), n;
	return t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (n = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		xmlns: `http://www.w3.org/2000/svg`,
		viewBox: `0 0 32 30`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, { d: `M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z` })
	}), t[0] = n) : n = t[0], n;
}
function qa() {
	let t = (0, import_dist.c)(1), n;
	return t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (n = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		xmlns: `http://www.w3.org/2000/svg`,
		viewBox: `0 0 25 32`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, { d: `M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z` })
	}), t[0] = n) : n = t[0], n;
}
function Ja() {
	let t = (0, import_dist.c)(1), n;
	return t[0] === Symbol.for(`react.memo_cache_sentinel`) ? (n = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`svg`, {
		xmlns: `http://www.w3.org/2000/svg`,
		viewBox: `0 0 25 32`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, { d: `M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z` })
	}), t[0] = n) : n = t[0], n;
}
function Ya(n) {
	let r = (0, import_dist.c)(10), i, a, o;
	r[0] === n ? (i = r[1], a = r[2], o = r[3]) : ({children: i, className: a, ...o} = n, r[0] = n, r[1] = i, r[2] = a, r[3] = o);
	let s;
	r[4] === a ? s = r[5] : (s = cc([`react-flow__controls-button`, a]), r[4] = a, r[5] = s);
	let c;
	return r[6] !== i || r[7] !== o || r[8] !== s ? (c = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`button`, {
		type: `button`,
		className: s,
		...o,
		children: i
	}), r[6] = i, r[7] = o, r[8] = s, r[9] = c) : c = r[9], c;
}
function Xa(n) {
	let r = (0, import_dist.c)(46), { style: i, showZoom: a, showFitView: o, showInteractive: s, fitViewOptions: c, onZoomIn: l, onZoomOut: u, onFitView: d, onInteractiveChange: f, className: p, children: m, position: h, orientation: g, "aria-label": _ } = n, v = a === void 0 || a, y = o === void 0 || o, b = s === void 0 || s, x = h === void 0 ? `bottom-left` : h, S = g === void 0 ? `vertical` : g, { optionsStore: C } = $(), w = Q(no), T = Q(to), E = Q(eo), D = Q($a), O = Q(Qa), k = Q(Za), A = w || T || E, j;
	r[0] === D ? j = r[1] : (j = (e) => e.transform[2] <= D, r[0] = D, r[1] = j);
	let M = wt(j), N;
	r[2] === O ? N = r[3] : (N = (e) => e.transform[2] >= O, r[2] = O, r[3] = N);
	let P = wt(N), { zoomIn: F, zoomOut: I, fitView: L } = Sn(), R;
	r[4] !== l || r[5] !== F ? (R = () => {
		F(), l?.();
	}, r[4] = l, r[5] = F, r[6] = R) : R = r[6];
	let ee = R, z;
	r[7] !== u || r[8] !== I ? (z = () => {
		I(), u?.();
	}, r[7] = u, r[8] = I, r[9] = z) : z = r[9];
	let B = z, V;
	r[10] !== L || r[11] !== c || r[12] !== d ? (V = () => {
		L(c), d?.();
	}, r[10] = L, r[11] = c, r[12] = d, r[13] = V) : V = r[13];
	let H = V, U;
	r[14] !== A || r[15] !== f || r[16] !== C ? (U = () => {
		C.setState({
			nodesDraggable: !A,
			nodesConnectable: !A,
			elementsSelectable: !A
		}), f?.(!A);
	}, r[14] = A, r[15] = f, r[16] = C, r[17] = U) : U = r[17];
	let W = U, G = S === `horizontal` ? `horizontal` : `vertical`, K;
	r[18] !== p || r[19] !== G ? (K = cc([
		`react-flow__controls`,
		G,
		p
	]), r[18] = p, r[19] = G, r[20] = K) : K = r[20];
	let q = _ ?? k[`controls.ariaLabel`], J;
	r[21] !== k || r[22] !== P || r[23] !== M || r[24] !== ee || r[25] !== B || r[26] !== v ? (J = v && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ya, {
		onClick: ee,
		className: `react-flow__controls-zoomin`,
		title: k[`controls.zoomIn.ariaLabel`],
		"aria-label": k[`controls.zoomIn.ariaLabel`],
		disabled: P,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wa, {})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ya, {
		onClick: B,
		className: `react-flow__controls-zoomout`,
		title: k[`controls.zoomOut.ariaLabel`],
		"aria-label": k[`controls.zoomOut.ariaLabel`],
		disabled: M,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ga, {})
	})] }), r[21] = k, r[22] = P, r[23] = M, r[24] = ee, r[25] = B, r[26] = v, r[27] = J) : J = r[27];
	let Y;
	r[28] !== k || r[29] !== H || r[30] !== y ? (Y = y && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ya, {
		className: `react-flow__controls-fitview`,
		onClick: H,
		title: k[`controls.fitView.ariaLabel`],
		"aria-label": k[`controls.fitView.ariaLabel`],
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ka, {})
	}), r[28] = k, r[29] = H, r[30] = y, r[31] = Y) : Y = r[31];
	let X;
	r[32] !== k || r[33] !== A || r[34] !== W || r[35] !== b ? (X = b && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ya, {
		className: `react-flow__controls-interactive`,
		onClick: W,
		title: k[`controls.interactive.ariaLabel`],
		"aria-label": k[`controls.interactive.ariaLabel`],
		children: (0, import_jsx_runtime.jsx)(A ? Ja : qa, {})
	}), r[32] = k, r[33] = A, r[34] = W, r[35] = b, r[36] = X) : X = r[36];
	let te;
	return r[37] !== m || r[38] !== x || r[39] !== i || r[40] !== K || r[41] !== q || r[42] !== J || r[43] !== Y || r[44] !== X ? (te = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Rt, {
		className: K,
		position: x,
		style: i,
		"data-testid": `rf__controls`,
		"aria-label": q,
		children: [
			J,
			Y,
			X,
			m
		]
	}), r[37] = m, r[38] = x, r[39] = i, r[40] = K, r[41] = q, r[42] = J, r[43] = Y, r[44] = X, r[45] = te) : te = r[45], te;
}
function Za(e) {
	return e.ariaLabelConfig;
}
function Qa(e) {
	return e.maxZoom;
}
function $a(e) {
	return e.minZoom;
}
function eo(e) {
	return e.elementsSelectable;
}
function to(e) {
	return e.nodesConnectable;
}
function no(e) {
	return e.nodesDraggable;
}
Xa.displayName = `Controls`;
(0, import_react.memo)(Xa);
function io(n) {
	let r = (0, import_dist.c)(22), { id: i, x: a, y: o, width: s, height: c, style: l, color: u, strokeColor: d, strokeWidth: f, className: p, borderRadius: m, shapeRendering: h, selected: g, onClick: _ } = n, v;
	r[0] === l ? v = r[1] : (v = l || {}, r[0] = l, r[1] = v);
	let { background: y, backgroundColor: b } = v, x = u || y || b, S;
	r[2] !== p || r[3] !== g ? (S = cc([
		`react-flow__minimap-node`,
		{ selected: g },
		p
	]), r[2] = p, r[3] = g, r[4] = S) : S = r[4];
	let C;
	r[5] !== x || r[6] !== d || r[7] !== f ? (C = {
		fill: x,
		stroke: d,
		strokeWidth: f
	}, r[5] = x, r[6] = d, r[7] = f, r[8] = C) : C = r[8];
	let w;
	r[9] !== i || r[10] !== _ ? (w = _ ? (e) => _(e, i) : void 0, r[9] = i, r[10] = _, r[11] = w) : w = r[11];
	let T;
	return r[12] !== m || r[13] !== c || r[14] !== h || r[15] !== S || r[16] !== C || r[17] !== w || r[18] !== s || r[19] !== a || r[20] !== o ? (T = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`rect`, {
		className: S,
		x: a,
		y: o,
		rx: m,
		ry: m,
		width: s,
		height: c,
		style: C,
		shapeRendering: h,
		onClick: w
	}), r[12] = m, r[13] = c, r[14] = h, r[15] = S, r[16] = C, r[17] = w, r[18] = s, r[19] = a, r[20] = o, r[21] = T) : T = r[21], T;
}
var ao = (0, import_react.memo)(io);
var oo = (e) => e.nodes.map((e) => e.id);
var so = (e) => e instanceof Function ? e : () => e;
function co(t) {
	let n = (0, import_dist.c)(25), { nodeStrokeColor: r, nodeColor: i, nodeClassName: a, nodeBorderRadius: o, nodeStrokeWidth: s, nodeComponent: c, onClick: l } = t, u = a === void 0 ? `` : a, d = o === void 0 ? 5 : o, f = c === void 0 ? ao : c, p = Et(xt(oo)), m;
	n[0] === i ? m = n[1] : (m = so(i), n[0] = i, n[1] = m);
	let h = m, g;
	n[2] === r ? g = n[3] : (g = so(r), n[2] = r, n[3] = g);
	let _ = g, v;
	n[4] === u ? v = n[5] : (v = so(u), n[4] = u, n[5] = v);
	let y = v, b = typeof window > `u` || `chrome` in window && window.chrome ? `crispEdges` : `geometricPrecision`, x;
	if (n[6] !== f || n[7] !== d || n[8] !== y || n[9] !== h || n[10] !== p || n[11] !== _ || n[12] !== s || n[13] !== l) {
		let e;
		n[15] !== f || n[16] !== d || n[17] !== y || n[18] !== h || n[19] !== _ || n[20] !== s || n[21] !== l ? (e = (e) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(uo, {
			id: e,
			nodeColorFunc: h,
			nodeStrokeColorFunc: _,
			nodeClassNameFunc: y,
			nodeBorderRadius: d,
			nodeStrokeWidth: s,
			NodeComponent: f,
			onClick: l,
			shapeRendering: b
		}, e), n[15] = f, n[16] = d, n[17] = y, n[18] = h, n[19] = _, n[20] = s, n[21] = l, n[22] = e) : e = n[22], x = p.map(e), n[6] = f, n[7] = d, n[8] = y, n[9] = h, n[10] = p, n[11] = _, n[12] = s, n[13] = l, n[14] = x;
	} else x = n[14];
	let S;
	return n[23] === x ? S = n[24] : (S = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: x }), n[23] = x, n[24] = S), S;
}
function lo(t) {
	let n = (0, import_dist.c)(27), { id: r, nodeColorFunc: i, nodeStrokeColorFunc: a, nodeClassNameFunc: o, nodeBorderRadius: s, nodeStrokeWidth: c, shapeRendering: l, NodeComponent: u, onClick: d } = t, f = Pr(r);
	if (!f || f.hidden) return null;
	let p;
	n[0] === f ? p = n[1] : (p = getNodeDimensions(f), n[0] = f, n[1] = p);
	let { width: m, height: h } = p;
	if (m === 0 || h === 0) return null;
	let g = f.internals.userNode, { x: _, y: v } = f.internals.positionAbsolute, y = g.style, b = !!g.selected, x;
	n[2] !== g || n[3] !== o ? (x = o(g), n[2] = g, n[3] = o, n[4] = x) : x = n[4];
	let S;
	n[5] !== g || n[6] !== i ? (S = i(g), n[5] = g, n[6] = i, n[7] = S) : S = n[7];
	let C;
	n[8] !== g || n[9] !== a ? (C = a(g), n[8] = g, n[9] = a, n[10] = C) : C = n[10];
	let w;
	return n[11] !== u || n[12] !== h || n[13] !== g.id || n[14] !== g.style || n[15] !== s || n[16] !== c || n[17] !== d || n[18] !== l || n[19] !== b || n[20] !== x || n[21] !== S || n[22] !== C || n[23] !== m || n[24] !== _ || n[25] !== v ? (w = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(u, {
		x: _,
		y: v,
		width: m,
		height: h,
		style: y,
		selected: b,
		className: x,
		color: S,
		borderRadius: s,
		strokeColor: C,
		strokeWidth: c,
		shapeRendering: l,
		onClick: d,
		id: g.id
	}), n[11] = u, n[12] = h, n[13] = g.id, n[14] = g.style, n[15] = s, n[16] = c, n[17] = d, n[18] = l, n[19] = b, n[20] = x, n[21] = S, n[22] = C, n[23] = m, n[24] = _, n[25] = v, n[26] = w) : w = n[26], w;
}
var uo = (0, import_react.memo)(lo);
var fo = (0, import_react.memo)(co);
var po = (e) => !e.hidden;
var mo = ({ transform: e, width: t, height: n }) => ({
	transform: e,
	width: t,
	height: n
});
var ho = (e, t) => {
	let n = {
		x: -t.transform[0] / t.transform[2],
		y: -t.transform[1] / t.transform[2],
		width: t.width / t.transform[2],
		height: t.height / t.transform[2]
	}, r = !1;
	for (let t of e.nodeLookup.values()) if (!t.hidden) {
		r = !0;
		break;
	}
	return {
		viewBB: n,
		boundingRect: r ? getBoundsOfRects(getInternalNodesBounds(e.nodeLookup, { filter: po }), n) : n,
		flowWidth: t.width,
		flowHeight: t.height
	};
};
var go = (e, t) => e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
var _o = (e, t) => go(e.viewBB, t.viewBB) && go(e.boundingRect, t.boundingRect) && e.flowWidth === t.flowWidth && e.flowHeight === t.flowHeight;
function vo(n) {
	let r = (0, import_dist.c)(64), { style: i, className: a, nodeStrokeColor: o, nodeColor: s, nodeClassName: c, nodeBorderRadius: l, nodeStrokeWidth: u, nodeComponent: d, bgColor: f, maskColor: p, maskStrokeColor: m, maskStrokeWidth: h, position: g, onClick: _, onNodeClick: v, pannable: y, zoomable: b, ariaLabel: x, inversePan: C, zoomStep: w, offsetScale: T } = n, E = c === void 0 ? `` : c, D = l === void 0 ? 5 : l, O = g === void 0 ? `bottom-right` : g, k = y !== void 0 && y, A = b !== void 0 && b, j = w === void 0 ? 1 : w, M = T === void 0 ? 5 : T, { optionsStore: N, viewportStore: P, nodesStore: F } = $(), I = (0, import_react.useRef)(null), L = Q(So), R = Q(xo), ee = Q(bo), z = Q(yo), B = wt(xt(mo)), V;
	r[0] === B ? V = r[1] : (V = (e) => ho(e, B), r[0] = B, r[1] = V);
	let { viewBB: H, boundingRect: U, flowWidth: W, flowHeight: G } = Et(kt(V, _o)), K = i?.width ?? 200, q = i?.height ?? 150, J = U.width / K, Y = U.height / q, X = Math.max(J, Y), te = X * K, ne = X * q, re = M * X, ie = U.x - (te - U.width) / 2 - re, ae = U.y - (ne - U.height) / 2 - re, oe = te + re * 2, se = ne + re * 2, ce = `react-flow__minimap-desc-${L}`, le = (0, import_react.useRef)(), ue = (0, import_react.useRef)(X), de, fe;
	r[2] === X ? (de = r[3], fe = r[4]) : (fe = () => {
		ue.current = X;
	}, de = [X], r[2] = X, r[3] = de, r[4] = fe), mn(fe, de);
	let pe;
	r[5] !== N || r[6] !== P ? (pe = () => {
		let e = N.getState().panZoom;
		if (I.current && e) return le.current = XYMinimap({
			domNode: I.current,
			panZoom: e,
			getTransform: () => P.getState().transform,
			getViewScale: () => ue.current
		}), () => {
			le.current?.destroy();
		};
	}, r[5] = N, r[6] = P, r[7] = pe) : pe = r[7];
	let me;
	r[8] !== N || r[9] !== R || r[10] !== P ? (me = [
		R,
		N,
		P
	], r[8] = N, r[9] = R, r[10] = P, r[11] = me) : me = r[11], (0, import_react.useEffect)(pe, me);
	let he, ge;
	r[12] !== G || r[13] !== W || r[14] !== C || r[15] !== k || r[16] !== ee || r[17] !== j || r[18] !== A ? (he = () => {
		le.current?.update({
			translateExtent: ee,
			width: W,
			height: G,
			inversePan: C,
			pannable: k,
			zoomStep: j,
			zoomable: A
		});
	}, ge = [
		k,
		A,
		C,
		j,
		ee,
		W,
		G
	], r[12] = G, r[13] = W, r[14] = C, r[15] = k, r[16] = ee, r[17] = j, r[18] = A, r[19] = he, r[20] = ge) : (he = r[19], ge = r[20]), (0, import_react.useEffect)(he, ge);
	let _e;
	r[21] === _ ? _e = r[22] : (_e = _ ? (e) => {
		let [t, n] = le.current?.pointer(e) || [0, 0];
		_(e, {
			x: t,
			y: n
		});
	} : void 0, r[21] = _, r[22] = _e);
	let ve = _e, ye;
	r[23] !== F || r[24] !== v ? (ye = (e, t) => {
		let n = F.getState().nodeLookup.get(t);
		n && v && v(e, n.internals.userNode);
	}, r[23] = F, r[24] = v, r[25] = ye) : ye = r[25];
	let be = v ? ye : void 0, xe = x ?? z[`minimap.ariaLabel`], Se = typeof f == `string` ? f : void 0, Ce = typeof p == `string` ? p : void 0, we = typeof m == `string` ? m : void 0, Te = typeof h == `number` ? h * X : void 0, Ee = typeof s == `string` ? s : void 0, De = typeof o == `string` ? o : void 0, Oe = typeof u == `number` ? u : void 0, ke;
	r[26] !== i || r[27] !== Se || r[28] !== Ce || r[29] !== we || r[30] !== Te || r[31] !== Ee || r[32] !== De || r[33] !== Oe ? (ke = {
		...i,
		"--xy-minimap-background-color-props": Se,
		"--xy-minimap-mask-background-color-props": Ce,
		"--xy-minimap-mask-stroke-color-props": we,
		"--xy-minimap-mask-stroke-width-props": Te,
		"--xy-minimap-node-background-color-props": Ee,
		"--xy-minimap-node-stroke-color-props": De,
		"--xy-minimap-node-stroke-width-props": Oe
	}, r[26] = i, r[27] = Se, r[28] = Ce, r[29] = we, r[30] = Te, r[31] = Ee, r[32] = De, r[33] = Oe, r[34] = ke) : ke = r[34];
	let Ae = ke, je;
	r[35] === a ? je = r[36] : (je = cc([`react-flow__minimap`, a]), r[35] = a, r[36] = je);
	let Me = `${ie} ${ae} ${oe} ${se}`, Ne;
	r[37] !== xe || r[38] !== ce ? (Ne = xe && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`title`, {
		id: ce,
		children: xe
	}), r[37] = xe, r[38] = ce, r[39] = Ne) : Ne = r[39];
	let Pe = v ? be : void 0, Fe;
	r[40] !== D || r[41] !== E || r[42] !== s || r[43] !== d || r[44] !== o || r[45] !== u || r[46] !== Pe ? (Fe = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(fo, {
		onClick: Pe,
		nodeColor: s,
		nodeStrokeColor: o,
		nodeBorderRadius: D,
		nodeClassName: E,
		nodeStrokeWidth: u,
		nodeComponent: d
	}), r[40] = D, r[41] = E, r[42] = s, r[43] = d, r[44] = o, r[45] = u, r[46] = Pe, r[47] = Fe) : Fe = r[47];
	let Ie = `M${ie - re},${ae - re}h${oe + re * 2}v${se + re * 2}h${-oe - re * 2}z
        M${H.x},${H.y}h${H.width}v${H.height}h${-H.width}z`, Le;
	r[48] === Ie ? Le = r[49] : (Le = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`path`, {
		className: `react-flow__minimap-mask`,
		d: Ie,
		fillRule: `evenodd`,
		pointerEvents: `none`
	}), r[48] = Ie, r[49] = Le);
	let Re;
	r[50] !== q || r[51] !== K || r[52] !== ce || r[53] !== ve || r[54] !== Me || r[55] !== Ne || r[56] !== Fe || r[57] !== Le ? (Re = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(`svg`, {
		width: K,
		height: q,
		viewBox: Me,
		className: `react-flow__minimap-svg`,
		role: `img`,
		"aria-labelledby": ce,
		ref: I,
		onClick: ve,
		children: [
			Ne,
			Fe,
			Le
		]
	}), r[50] = q, r[51] = K, r[52] = ce, r[53] = ve, r[54] = Me, r[55] = Ne, r[56] = Fe, r[57] = Le, r[58] = Re) : Re = r[58];
	let ze;
	return r[59] !== O || r[60] !== Ae || r[61] !== je || r[62] !== Re ? (ze = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rt, {
		position: O,
		style: Ae,
		className: je,
		"data-testid": `rf__minimap`,
		children: Re
	}), r[59] = O, r[60] = Ae, r[61] = je, r[62] = Re, r[63] = ze) : ze = r[63], ze;
}
function yo(e) {
	return e.ariaLabelConfig;
}
function bo(e) {
	return e.translateExtent;
}
function xo(e) {
	return e.panZoom;
}
function So(e) {
	return e.rfId;
}
vo.displayName = `MiniMap`;
var Co = (0, import_react.memo)(vo);
var wo = {
	[ResizeControlVariant.Line]: `right`,
	[ResizeControlVariant.Handle]: `bottom-right`
};
function To(n) {
	let r = (0, import_dist.c)(37), { nodeId: i, position: a, variant: o, className: s, style: c, children: l, color: u, minWidth: d, minHeight: f, maxWidth: p, maxHeight: m, keepAspectRatio: h, resizeDirection: g, autoScale: v, shouldResize: y, onResizeStart: b, onResize: x, onResizeEnd: S } = n, C = o === void 0 ? ResizeControlVariant.Handle : o, T = c === void 0 ? void 0 : c, E = d === void 0 ? 10 : d, D = f === void 0 ? 10 : f, O = p === void 0 ? Number.MAX_VALUE : p, k = m === void 0 ? Number.MAX_VALUE : m, A = h !== void 0 && h, j = v === void 0 || v, M = nr(), N = typeof i == `string` ? i : M, { optionsStore: P, viewportStore: F, nodesStore: I } = $(), L = (0, import_react.useRef)(null), R = C === ResizeControlVariant.Handle, ee;
	r[0] !== j || r[1] !== R ? (ee = (e) => R && j ? `${Math.max(1 / e.transform[2], 1)}` : void 0, r[0] = j, r[1] = R, r[2] = ee) : ee = r[2];
	let z = wt(ee), V = (0, import_react.useRef)(null), H = a ?? wo[C], U, W;
	r[3] !== H || r[4] !== N || r[5] !== A || r[6] !== k || r[7] !== O || r[8] !== D || r[9] !== E || r[10] !== I || r[11] !== x || r[12] !== S || r[13] !== b || r[14] !== P || r[15] !== g || r[16] !== y || r[17] !== F ? (U = () => {
		if (L.current && N) return V.current || (V.current = XYResizer({
			domNode: L.current,
			nodeId: N,
			getStoreItems: () => {
				let { nodeLookup: e } = I.getState(), { transform: t } = F.getState(), { snapGrid: n, snapToGrid: r, nodeOrigin: i, domNode: a } = P.getState();
				return {
					nodeLookup: e,
					transform: t,
					snapGrid: n,
					snapToGrid: r,
					nodeOrigin: i,
					paneDomNode: a
				};
			},
			onChange: (e, t) => {
				let { emitNodeChanges: n, nodeOrigin: r } = P.getState(), { nodeLookup: i, parentLookup: a } = I.getState(), o = [], s = {
					x: e.x,
					y: e.y
				}, c = i.get(N);
				if (c && c.expandParent && c.parentId) {
					let t = c.origin ?? r, n = e.width ?? c.measured.width ?? 0, l = e.height ?? c.measured.height ?? 0, d = handleExpandParent([{
						id: c.id,
						parentId: c.parentId,
						rect: {
							width: n,
							height: l,
							...evaluateAbsolutePosition({
								x: e.x ?? c.position.x,
								y: e.y ?? c.position.y
							}, {
								width: n,
								height: l
							}, c.parentId, i, t)
						}
					}], i, a, r);
					o.push(...d), s.x = e.x ? Math.max(t[0] * n, e.x) : void 0, s.y = e.y ? Math.max(t[1] * l, e.y) : void 0;
				}
				if (s.x !== void 0 && s.y !== void 0 && o.push(positionChange(N, s)), e.width !== void 0 && e.height !== void 0) {
					let t = {
						id: N,
						type: `dimensions`,
						resizing: !0,
						setAttributes: g ? g === `horizontal` ? `width` : `height` : !0,
						dimensions: {
							width: e.width,
							height: e.height
						}
					};
					o.push(t);
				}
				for (let e of t) {
					let t = {
						...e,
						type: `position`
					};
					o.push(t);
				}
				n(o);
			},
			onEnd: (e) => {
				let { width: t, height: n } = e, r = {
					id: N,
					type: `dimensions`,
					resizing: !1,
					dimensions: {
						width: t,
						height: n
					}
				};
				P.getState().emitNodeChanges([r]);
			}
		})), V.current.update({
			controlPosition: H,
			boundaries: {
				minWidth: E,
				minHeight: D,
				maxWidth: O,
				maxHeight: k
			},
			keepAspectRatio: A,
			resizeDirection: g,
			onResizeStart: b,
			onResize: x,
			onResizeEnd: S,
			shouldResize: y
		}), () => {
			V.current?.destroy();
		};
	}, W = [
		H,
		E,
		D,
		O,
		k,
		A,
		b,
		x,
		S,
		y,
		N,
		g,
		P,
		I,
		F
	], r[3] = H, r[4] = N, r[5] = A, r[6] = k, r[7] = O, r[8] = D, r[9] = E, r[10] = I, r[11] = x, r[12] = S, r[13] = b, r[14] = P, r[15] = g, r[16] = y, r[17] = F, r[18] = U, r[19] = W) : (U = r[18], W = r[19]), (0, import_react.useEffect)(U, W);
	let G, K;
	if (r[20] !== s || r[21] !== H || r[22] !== R || r[23] !== C) {
		let e = H.split(`-`);
		G = R ? `backgroundColor` : `borderColor`, K = cc([
			`react-flow__resize-control`,
			`nodrag`,
			...e,
			C,
			s
		]), r[20] = s, r[21] = H, r[22] = R, r[23] = C, r[24] = G, r[25] = K;
	} else G = r[24], K = r[25];
	let q;
	r[26] !== u || r[27] !== G ? (q = u && { [G]: u }, r[26] = u, r[27] = G, r[28] = q) : q = r[28];
	let J;
	r[29] !== z || r[30] !== T || r[31] !== q ? (J = {
		...T,
		scale: z,
		...q
	}, r[29] = z, r[30] = T, r[31] = q, r[32] = J) : J = r[32];
	let Y;
	return r[33] !== l || r[34] !== K || r[35] !== J ? (Y = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(`div`, {
		className: K,
		ref: L,
		style: J,
		children: l
	}), r[33] = l, r[34] = K, r[35] = J, r[36] = Y) : Y = r[36], Y;
}
(0, import_react.memo)(To);
export { Ta as a, fr as c, MarkerType as d, Position as f, Sn as i, pa as l, Co as n, Ua as o, require_jsx_runtime as p, Ra as r, _a as s, Ca as t, wa as u };
