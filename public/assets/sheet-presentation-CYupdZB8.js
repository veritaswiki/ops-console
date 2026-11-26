import { a as ahead, i as on, n as isIOS, o as setStyle, r as isRTL, s as writeStyle, t as trackKeyboard } from "./app-B_QQU17B.js";
// node_modules/@ui-sdk/core/dist/foundation/platform/sides.js
function physicalSide(side, rtl = false) {
	if (side === "start") return rtl ? "right" : "left";
	if (side === "end") return rtl ? "left" : "right";
	return side;
}
// node_modules/@ui-sdk/core/dist/foundation/drag-and-drop/pointer.js
var followed = /* @__PURE__ */ new WeakSet();
var isDragPress = (event) => followed.has(event);
function swallowNextClick(doc, untilRelease = false, pointerId) {
	const view = doc.defaultView ?? window;
	const ours = (event) => pointerId === void 0 || !("pointerId" in event) || event.pointerId === pointerId;
	const swallow = (event) => {
		if (!ours(event)) return;
		event.preventDefault();
		event.stopPropagation();
		doc.removeEventListener("click", swallow, true);
	};
	const forget = () => {
		doc.removeEventListener("click", swallow, true);
		doc.removeEventListener("pointerdown", press, true);
		doc.removeEventListener("pointerup", release, true);
		doc.removeEventListener("pointercancel", release, true);
	};
	const press = (event) => ours(event) && forget();
	const release = (event) => ours(event) && view.setTimeout(forget);
	doc.addEventListener("click", swallow, true);
	doc.addEventListener("pointerdown", press, true);
	if (!untilRelease) return view.setTimeout(forget);
	doc.addEventListener("pointerup", release, true);
	doc.addEventListener("pointercancel", release, true);
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
	for (let t = 0; t < duration; t += step) stops.push(round$1(1 + solver.position(t) / distance));
	stops.push("1");
	return `linear(${stops.join(", ")})`;
}
function round$1(value) {
	return String(Math.round(value * 1e4) / 1e4);
}
// node_modules/@ui-sdk/core/dist/foundation/motion/machine.js
var none$2 = [];
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
		effects: none$2
	};
	if (state.phase !== "settling") return {
		state,
		effects: none$2
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
		effects: none$2
	};
}
function leavePending(state, event, config) {
	const dx = event.x - state.originX;
	const dy = event.y - state.originY;
	if (Math.max(Math.abs(dx), Math.abs(dy)) < state.slop) return {
		state,
		effects: none$2
	};
	if (Math.abs(dx) > Math.abs(dy)) return {
		state: initialState(state.extent, state.restingIndex),
		effects: none$2
	};
	const scrolling = config.contentScroll?.claim(state, event, dy < 0, config);
	if (scrolling) return {
		state: scrolling,
		effects: none$2
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
		effects: none$2
	};
	if (state.phase !== "dragging") return {
		state,
		effects: none$2
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
		effects: none$2
	};
	return {
		state: initialState(state.to, state.targetIndex),
		effects: none$2
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
		effects: none$2
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
		effects: none$2
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
var none$1 = [];
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
			effects: none$1
		};
		return {
			state: {
				...state,
				lastY: event.y
			},
			effects: none$1
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
// node_modules/@ui-sdk/core/dist/foundation/popups/sheet-axis.js
function resolveSide(side, el) {
	return physicalSide(side, side === "start" || side === "end" ? isRTL(el) : false);
}
var isVertical = (side) => side === "bottom" || side === "top";
var towardEdge = (side) => side === "bottom" || side === "right" ? 1 : -1;
function axisPoint(side, clientX, clientY, into) {
	const vertical = isVertical(side);
	into.y = (vertical ? clientY : clientX) * towardEdge(side);
	into.x = vertical ? clientX : clientY;
	return into;
}
function translateValue(side, offset) {
	const value = `${Math.round(offset * towardEdge(side) * 100) / 100}px`;
	return isVertical(side) ? `0 ${value}` : `${value} 0`;
}
function sizeAlong(el, side) {
	return isVertical(side) ? el.offsetHeight : el.offsetWidth;
}
function scrollContext(target, sheet, side) {
	const area = scrollAreaAt(target, sheet, side);
	if (!area) return null;
	const { start, end } = scrollEdges(area, side);
	return {
		atStart: start,
		atEnd: end,
		area
	};
}
function scrollAreaAt(target, sheet, side) {
	const view = sheet.ownerDocument.defaultView;
	if (!view || !(target instanceof Element) || !sheet.contains(target)) return null;
	const vertical = isVertical(side);
	for (let node = target; node && node !== sheet.parentElement; node = node.parentElement) {
		if (!(vertical ? node.scrollHeight > node.clientHeight + 1 : node.scrollWidth > node.clientWidth + 1) || !(node instanceof HTMLElement)) continue;
		const overflow = vertical ? view.getComputedStyle(node).overflowY : view.getComputedStyle(node).overflowX;
		if (/auto|scroll/.test(overflow)) return node;
	}
	return null;
}
function forwardScroll(area, side) {
	if (isVertical(side)) {
		const max2 = area.scrollHeight - area.clientHeight;
		return {
			position: side === "bottom" ? area.scrollTop : max2 - area.scrollTop,
			max: max2
		};
	}
	const max = area.scrollWidth - area.clientWidth;
	const left = Math.abs(area.scrollLeft);
	const fromLeft = isRTL(area) ? max - left : left;
	return {
		position: side === "right" ? fromLeft : max - fromLeft,
		max
	};
}
function scrollEdges(area, side) {
	const { position, max } = forwardScroll(area, side);
	return {
		start: position <= .5,
		end: position >= max - 1
	};
}
function scrollForward(area, side, delta) {
	if (isVertical(side)) area.scrollTop += side === "bottom" ? delta : -delta;
	else {
		const physical = side === "right" ? delta : -delta;
		area.scrollLeft += isRTL(area) ? -physical : physical;
	}
}
// node_modules/@ui-sdk/core/dist/foundation/popups/sheet-driver.js
var openHold = 1e3;
function afterFirstFrame(view, start) {
	view.requestAnimationFrame(() => view.requestAnimationFrame(start));
}
function closedExtentFor(side) {
	return side === "bottom" ? -120 : -32;
}
function sampleTranslate(motion, translate) {
	const frames = [];
	for (let elapsed = 0; elapsed < motion.duration; elapsed += 1e3 / 60) frames.push(translate(motion.extentAt(elapsed)));
	frames.push(translate(motion.extentAt(motion.duration)));
	return frames;
}
function setStyles(el, styles) {
	const restores = Object.entries(styles).map(([name, value]) => setStyle(el, name, value));
	return () => restores.forEach((restore) => restore());
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
// node_modules/@ui-sdk/core/dist/foundation/popups/sheet-effects.js
var sampleStep = 1e3 / 60;
var variables = [
	"--drawer-progress",
	"--drawer-dim",
	"--drawer-expand",
	"--drawer-stack"
];
var registered = /* @__PURE__ */ new WeakSet();
function registerVariables(doc) {
	const css = doc.defaultView?.CSS;
	if (registered.has(doc) || !css?.registerProperty) return;
	registered.add(doc);
	for (const name of variables) try {
		css.registerProperty({
			name,
			syntax: "<number>",
			inherits: false,
			initialValue: "0"
		});
	} catch {}
}
function prepareVariables() {
	if (typeof document !== "undefined" && !registered.has(document)) ahead(() => registerVariables(document));
}
var supportsLinear = () => typeof CSS !== "undefined" && CSS.supports("animation-timing-function", "linear(0, 1)");
var round = (value) => Math.round(value * 1e4) / 1e4;
function createSheetEffects(targets) {
	registerVariables(targets.sheet.ownerDocument);
	let snapExtents = [1];
	let undimmedIndex = -1;
	let running = [];
	const seeking = /* @__PURE__ */ new Map();
	const values = {
		dim: 0,
		progress: 0,
		expand: 0
	};
	let dimHold;
	function configure(next) {
		snapExtents = next.snapExtents.length ? next.snapExtents : [1];
		undimmedIndex = next.undimmedIndex;
	}
	function compute(extent, into = values) {
		into.dim = round(dimAmount(extent, snapExtents, undimmedIndex));
		into.progress = round(progressAmount(extent, snapExtents));
		into.expand = round(expandAmount(extent, snapExtents));
		return into;
	}
	let destroyed = false;
	function apply(extent, { rest = false } = {}) {
		if (destroyed) return;
		stopRunning();
		compute(extent);
		writeDim(values.dim);
		writeVariables(targets.sheet, values);
		writeStack(values.progress);
		for (const outlet of targets.outlets()) {
			writeVariables(outlet.el, values);
			if (outlet.keyframes) seekOutlet(outlet, values.expand, rest);
		}
		if (rest) targets.themeColor?.(values.dim);
	}
	function writeDim(dim) {
		const backdrop = targets.backdrop();
		if (backdrop) backdrop.style.opacity = String(dim);
		const hold = holdDim();
		if (hold) hold.currentTime = dim * 1e3;
	}
	function holdDim() {
		if (!targets.dimmed || dimHold) return dimHold;
		dimHold = targets.dimmed.animate({ opacity: [0, 1] }, {
			...backdropDim,
			duration: 1e3,
			fill: "both"
		});
		dimHold.pause();
		dimHold.currentTime = 0;
		return dimHold;
	}
	function writeStack(progress) {
		const ancestors = targets.ancestors();
		for (let depth = 0; depth < ancestors.length; depth++) ancestors[depth].style.setProperty("--drawer-stack", String(depth + progress));
	}
	function writeVariables(el, { dim, progress, expand }) {
		el.style.setProperty("--drawer-progress", String(progress));
		el.style.setProperty("--drawer-dim", String(dim));
		el.style.setProperty("--drawer-expand", String(expand));
	}
	function seekOutlet(outlet, amount, rest) {
		let animation = seeking.get(outlet.el);
		if (!animation) {
			animation = outlet.el.animate(asKeyframes(outlet.keyframes), {
				duration: 1e3,
				fill: "both"
			});
			animation.pause();
			seeking.set(outlet.el, animation);
		}
		animation.currentTime = amount * 1e3;
		if (!rest) return;
		animation.commitStyles?.();
		animation.cancel();
		seeking.delete(outlet.el);
	}
	function play(motion) {
		if (destroyed) return;
		stopRunning();
		stopSeeking();
		if (!supportsLinear()) return apply(motion.type === "settle" ? motion.extentAt(motion.duration) : 0, { rest: true });
		const samples = sampleCurves(motion);
		holdDim();
		const timing = motion.type === "settle" ? {
			duration: Math.max(1, motion.duration),
			fill: "both"
		} : {
			timeline: motion.timeline,
			fill: "both"
		};
		const animate = (el, keyframes, curve, pseudo) => {
			const animation = el.animate(keyframes, {
				...timing,
				...pseudo,
				easing: easing(curve)
			});
			if (motion.type === "settle") animation.startTime = motion.startTime;
			running.push(animation);
		};
		const backdrop = targets.backdrop();
		if (backdrop) animate(backdrop, { opacity: [0, 1] }, samples.dim);
		if (targets.dimmed) animate(targets.dimmed, { opacity: [0, 1] }, samples.dim, backdropDim);
		animateVariables(targets.sheet, samples, animate);
		targets.ancestors().forEach((el, depth) => animate(el, { "--drawer-stack": [depth, depth + 1] }, samples.progress));
		for (const outlet of targets.outlets()) {
			animateVariables(outlet.el, samples, animate);
			if (outlet.keyframes) animate(outlet.el, asKeyframes(outlet.keyframes), samples.expand);
		}
		if (motion.type !== "settle") return;
		writeRest(motion.extentAt(motion.duration));
		const batch = running;
		if (batch[0]) batch[0].onfinish = () => running === batch && stopRunning();
	}
	function animateVariables(el, samples, animate) {
		animate(el, { "--drawer-progress": [0, 1] }, samples.progress);
		animate(el, { "--drawer-dim": [0, 1] }, samples.dim);
		animate(el, { "--drawer-expand": [0, 1] }, samples.expand);
	}
	function writeRest(extent) {
		const end = compute(extent, {
			dim: 0,
			progress: 0,
			expand: 0
		});
		writeDim(end.dim);
		writeVariables(targets.sheet, end);
		writeStack(end.progress);
		for (const outlet of targets.outlets()) {
			writeVariables(outlet.el, end);
			if (!outlet.keyframes) continue;
			for (const [property, frames] of Object.entries(outlet.keyframes)) {
				const value = frames[end.expand >= .5 ? frames.length - 1 : 0];
				outlet.el.style.setProperty(cssName(property), String(value));
			}
		}
		targets.themeColor?.(end.dim);
	}
	function sampleCurves(motion) {
		const curves = {
			dim: [],
			progress: [],
			expand: []
		};
		const point = {
			dim: 0,
			progress: 0,
			expand: 0
		};
		const count = motion.type === "settle" ? Math.max(2, Math.ceil(motion.duration / sampleStep) + 1) : 61;
		for (let index = 0; index < count; index++) {
			const at = index / (count - 1);
			compute(motion.type === "settle" ? motion.extentAt(Math.min(motion.duration, index * sampleStep)) : motion.extentAt(at), point);
			curves.dim.push(point.dim);
			curves.progress.push(point.progress);
			curves.expand.push(point.expand);
		}
		return curves;
	}
	function sync(startTime) {
		for (const animation of running) animation.startTime = startTime;
	}
	function stopRunning() {
		if (!running.length) return;
		for (const animation of running) animation.cancel();
		running = [];
	}
	function stopSeeking() {
		for (const animation of seeking.values()) animation.cancel();
		seeking.clear();
	}
	function destroy() {
		destroyed = true;
		stopRunning();
		stopSeeking();
		targets.backdrop()?.style.removeProperty("opacity");
		dimHold?.cancel();
		for (const name of variables.slice(0, 3)) targets.sheet.style.removeProperty(name);
		for (const outlet of targets.outlets()) {
			for (const name of variables.slice(0, 3)) outlet.el.style.removeProperty(name);
			for (const property of Object.keys(outlet.keyframes ?? {})) outlet.el.style.removeProperty(cssName(property));
		}
	}
	return {
		configure,
		compute,
		apply,
		play,
		sync,
		follow: play,
		stop: stopRunning,
		destroy
	};
}
var backdropDim = { pseudoElement: "::backdrop" };
function easing(curve) {
	return `linear(${curve.map(round).join(", ")})`;
}
var asKeyframes = (keyframes) => keyframes;
function cssName(property) {
	return property.startsWith("--") ? property : property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
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
// node_modules/@ui-sdk/core/dist/foundation/popups/sheet-pointer.js
var contentDecelerationRate = .998;
var ignoredTargets = "input, textarea, select, [contenteditable]:not([contenteditable=\"false\"]), [data-drawer-no-drag]";
function createPointerDriver(options) {
	const { sheet } = options;
	const doc = sheet.ownerDocument;
	const view = doc.defaultView ?? window;
	let state = initialState(0, -1);
	let shown = 0;
	let pendingExtent = null;
	let pendingScroll = 0;
	let frame = 0;
	let animation = null;
	let fade = null;
	let closing = null;
	let coast = null;
	let area = null;
	let touch = null;
	let pointerId = null;
	let dragging = false;
	let mouseDragged = false;
	let press = null;
	let targetId = null;
	let caught = null;
	const point = {
		x: 0,
		y: 0
	};
	const tracker = createVelocityTracker({ horizon: options.config().physics.velocityHorizon });
	const offs = [
		on(doc, "touchstart", onTouchStart, {
			capture: true,
			passive: true
		}),
		on(doc, "touchmove", onTouchMove, {
			capture: true,
			passive: false
		}),
		on(doc, "touchend", onTouchEnd, {
			capture: true,
			passive: true
		}),
		on(doc, "touchcancel", onTouchEnd, {
			capture: true,
			passive: true
		}),
		on(sheet, "pointerdown", onPointerDown)
	];
	let destroyed = false;
	function writeTranslate(extent) {
		if (destroyed) return;
		sheet.style.translate = translateValue(options.side(), options.size() - extent);
		shown = extent;
	}
	function dispatch(event, source) {
		if (destroyed) return;
		const result = next(state, event, options.config());
		state = result.state;
		const time = "time" in event ? event.time : performance.now();
		for (const effect of result.effects) run(effect, time, source);
		const isDragging = state.phase === "dragging";
		if (isDragging === dragging) return;
		dragging = isDragging;
		options.onDragChange(dragging);
	}
	function run(effect, time, source) {
		switch (effect.type) {
			case "move":
				if (animation) {
					stopAnimation();
					writeTranslate(effect.extent);
					options.onFrame(effect.extent);
				} else {
					pendingExtent = effect.extent;
					schedule();
				}
				return;
			case "settle": return startSettle(effect, time);
			case "scroll":
				pendingScroll += effect.delta;
				return schedule();
			case "fling-scroll":
				if (area) coast = {
					velocity: effect.velocity,
					startTime: time,
					startScroll: 0,
					area
				};
				return schedule();
			case "snap":
				targetId = effect.id;
				return options.onSnap(effect.id, effect.reason, source);
			case "dismiss":
				if (effect.reason !== "swipe") return;
				closing = "swipe";
				return options.onDismiss(source);
			case "attempt-dismiss": return options.onDismissAttempt(source);
		}
	}
	function startSettle(effect, startTime) {
		stopAnimation();
		pendingExtent = null;
		const closed = options.closedExtent();
		const from = effect.from <= 0 ? closed : effect.from;
		const to = effect.to <= 0 ? closed : effect.to;
		const isFade = options.reducedMotion() && (from === closed || to === closed);
		const motion = options.reducedMotion() ? reducedMotion(from, to, isFade) : springMotion(from, to, effect);
		writeTranslate(isFade ? Math.max(to, 0) : to);
		if (Math.abs(to - from) < .5 && effect.velocity === 0 || motion.duration === 0) return finishSettle();
		const size = options.size();
		const side = options.side();
		animation = isFade ? sheet.animate({ opacity: from === closed ? [0, 1] : [1, 0] }, {
			duration: motion.duration,
			fill: "both"
		}) : Math.abs(to - from) < 1 || !supportsLinear() ? sheet.animate({ translate: sampleTranslate(motion, (extent) => translateValue(side, size - extent)) }, {
			duration: motion.duration,
			fill: "backwards"
		}) : sheet.animate({ translate: [translateValue(side, size - from), translateValue(side, size - to)] }, {
			duration: motion.duration,
			easing: motion.easing,
			fill: "backwards"
		});
		if (isFade) fade = animation;
		const running = animation;
		animation.onfinish = () => {
			if (animation === running) finishSettle();
		};
		animation.startTime = startTime;
		options.onMotion({
			type: "settle",
			extentAt: motion.extentAt,
			startTime,
			duration: motion.duration
		});
	}
	function springMotion(from, to, effect) {
		const solver = solveSpring(effect.response, effect.dampingRatio, from - to, effect.velocity);
		const duration = settleTime(solver);
		return {
			duration,
			easing: springLinearEasing(solver, from, to, duration),
			extentAt: (elapsed) => to + solver.position(elapsed)
		};
	}
	function reducedMotion(from, to, isFade) {
		const duration = isFade ? 150 : 200;
		const ease = (t) => 1 - (1 - t) ** 3;
		return {
			duration,
			easing: "cubic-bezier(0.33, 1, 0.68, 1)",
			extentAt: (elapsed) => from + (to - from) * ease(Math.min(1, elapsed / duration))
		};
	}
	function stopAnimation() {
		animation?.cancel();
		animation = null;
		if (fade) {
			fade.cancel();
			fade = null;
		}
	}
	function finishSettle() {
		stopAnimation();
		dispatch({ type: "settled" });
		if (state.phase !== "idle") return;
		if (state.restingIndex < 0) {
			closing = null;
			targetId = null;
			return options.onRest(null);
		}
		targetId = options.config().snapPoints[state.restingIndex].id;
		options.onRest(targetId);
	}
	function schedule() {
		frame ||= view.requestAnimationFrame(flush);
	}
	function flush(now) {
		frame = 0;
		if (pendingScroll && area) {
			scrollForward(area, options.side(), pendingScroll);
			pendingScroll = 0;
		}
		if (coast) stepCoast(now);
		if (pendingExtent === null) return;
		writeTranslate(pendingExtent);
		pendingExtent = null;
		options.onFrame(shown);
	}
	function stepCoast(now) {
		if (!coast) return;
		const elapsed = Math.max(0, now - coast.startTime);
		const travelled = coast.velocity * (contentDecelerationRate ** elapsed - 1) / Math.log(contentDecelerationRate);
		scrollForward(coast.area, options.side(), travelled - coast.startScroll);
		coast.startScroll = travelled;
		if (Math.abs(coast.velocity * contentDecelerationRate ** elapsed) < .01) coast = null;
		else schedule();
	}
	function isIgnored(target) {
		return target instanceof Element && target.closest(ignoredTargets) !== null;
	}
	function scroll(target) {
		const context = scrollContext(target, sheet, options.side());
		area = context?.area ?? null;
		return context && {
			atStart: context.atStart,
			atEnd: context.atEnd
		};
	}
	function onTouchStart(event) {
		const taken = press !== null && isDragPress(press);
		press = null;
		if (touch || event.touches.length > 1 || closing || taken) return;
		if (!options.owns(event.target) || isIgnored(event.target)) return;
		const first = event.changedTouches[0];
		touch = {
			id: first.identifier,
			originX: first.clientX,
			originY: first.clientY
		};
		coast = null;
		tracker.reset();
		axisPoint(options.side(), first.clientX, first.clientY, point);
		tracker.add(event.timeStamp, point.y);
		dispatch({
			type: "down",
			time: event.timeStamp,
			x: point.x,
			y: point.y,
			pointer: "touch"
		}, event);
	}
	function onTouchMove(event) {
		const current = findTouch(event.changedTouches);
		if (!current) return;
		axisPoint(options.side(), current.clientX, current.clientY, point);
		tracker.add(event.timeStamp, point.y);
		const wasDragging = state.phase === "dragging";
		const context = scroll(event.target);
		dispatch({
			type: "move",
			time: event.timeStamp,
			x: point.x,
			y: point.y,
			scroll: context
		}, event);
		if (state.phase === "pending") return claimEarly(event, current, context);
		if (state.phase !== "dragging") return;
		if (event.cancelable) event.preventDefault();
		else if (!wasDragging && area) area.style.overscrollBehavior = "none";
	}
	function claimEarly(event, current, context) {
		if (!event.cancelable || !touch) return;
		const origin = axisPoint(options.side(), touch.originX, touch.originY, {
			x: 0,
			y: 0
		});
		if (Math.abs(point.y - origin.y) < Math.abs(point.x - origin.x)) return;
		const largest = options.config().snapPoints.at(-1)?.extent ?? 0;
		if ((context ? handoff({
			towardMore: point.y < origin.y,
			scrollAtStart: context.atStart,
			atLargest: shown >= largest - .5,
			expandOnScroll: options.config().expandOnScroll
		}) : "sheet") === "sheet") event.preventDefault();
	}
	function onTouchEnd(event) {
		if (!findTouch(event.changedTouches)) return;
		touch = null;
		if (area) area.style.removeProperty("overscroll-behavior");
		const velocity = event.type === "touchcancel" ? 0 : tracker.velocity(event.timeStamp);
		dispatch({
			type: "up",
			time: event.timeStamp,
			velocity
		}, event);
	}
	function findTouch(touches) {
		if (!touch) return null;
		for (let index = 0; index < touches.length; index++) if (touches[index].identifier === touch.id) return touches[index];
		return null;
	}
	function onPointerDown(event) {
		press = event;
		if (event.pointerType === "touch" || event.button !== 0 || pointerId !== null || closing) return;
		const target = event.target;
		if (!options.owns(target) || isIgnored(target) || !(target instanceof Element) || !options.canMouseDrag(target)) return;
		pointerId = event.pointerId;
		mouseDragged = false;
		caught = state.phase === "settling" && state.targetIndex >= 0 ? targetId : null;
		coast = null;
		tracker.reset();
		axisPoint(options.side(), event.clientX, event.clientY, point);
		tracker.add(event.timeStamp, point.y);
		offPointer = [
			on(doc, "pointermove", onPointerMove, { capture: true }),
			on(doc, "pointerup", onPointerUp, { capture: true }),
			on(doc, "pointercancel", onPointerUp, { capture: true })
		];
		const pointer = event.pointerType === "pen" ? "pen" : "mouse";
		dispatch({
			type: "down",
			time: event.timeStamp,
			x: point.x,
			y: point.y,
			pointer
		}, event);
	}
	let offPointer = [];
	function onPointerMove(event) {
		if (event.pointerId !== pointerId) return;
		if (press && isDragPress(press)) return release(event, 0, caught);
		const coalesced = event.getCoalescedEvents?.();
		for (const sample of coalesced?.length ? coalesced : [event]) tracker.add(sample.timeStamp, axisPoint(options.side(), sample.clientX, sample.clientY, point).y);
		axisPoint(options.side(), event.clientX, event.clientY, point);
		dispatch({
			type: "move",
			time: event.timeStamp,
			x: point.x,
			y: point.y,
			scroll: scroll(event.target)
		}, event);
		if (state.phase !== "dragging" || mouseDragged) return;
		mouseDragged = true;
		doc.getSelection()?.removeAllRanges();
		sheet.style.userSelect = "none";
		try {
			sheet.setPointerCapture(event.pointerId);
		} catch {}
	}
	function onPointerUp(event) {
		if (event.pointerId !== pointerId) return;
		if (press && isDragPress(press)) return release(event, 0, caught);
		release(event, event.type === "pointercancel" ? 0 : tracker.velocity(event.timeStamp));
	}
	function release(event, velocity, resume = null) {
		pointerId = null;
		press = null;
		offPointer.forEach((off) => off());
		offPointer = [];
		sheet.style.removeProperty("user-select");
		const time = event.timeStamp;
		const index = options.config().snapPoints.findIndex((point2) => point2.id === resume);
		if (resume !== null && index >= 0) {
			state = initialState(state.extent, index);
			dispatch({
				type: "snap-to",
				time,
				id: resume,
				reason: "imperative"
			});
		} else dispatch({
			type: "up",
			time,
			velocity
		}, event);
		if (mouseDragged) swallowNextClick(doc);
	}
	return {
		open(id, animate) {
			closing = null;
			targetId = id;
			stopAnimation();
			const index = options.config().snapPoints.findIndex((point2) => point2.id === id);
			if (!animate && index >= 0) {
				state = initialState(options.config().snapPoints[index].extent, index);
				writeTranslate(state.extent);
				return options.onRest(id);
			}
			state = initialState(0, -1);
			writeTranslate(options.closedExtent());
			dispatch({
				type: "snap-to",
				time: performance.now() + openHold,
				id,
				reason: "imperative"
			});
			const opening = animation;
			if (!opening) return;
			afterFirstFrame(view, (frameTime) => {
				if (animation !== opening || state.phase !== "settling") return;
				opening.startTime = frameTime;
				state = {
					...state,
					startTime: frameTime
				};
				options.onMotionStart(frameTime);
			});
		},
		close() {
			const wasClosing = closing;
			closing = "close";
			if (!wasClosing) dispatch({
				type: "close",
				time: performance.now()
			});
		},
		snapTo(id, reason) {
			if (closing === "close") return;
			closing = null;
			dispatch({
				type: "snap-to",
				time: performance.now(),
				id,
				reason
			});
		},
		nudge() {
			if (!closing && !options.reducedMotion()) dispatch({
				type: "nudge",
				time: performance.now()
			});
		},
		relayout(immediate, fallback) {
			const points = options.config().snapPoints;
			if (closing || targetId === null || state.phase === "dragging" || state.phase === "pending") return writeTranslate(shown);
			const kept = points.findIndex((point2) => point2.id === targetId);
			const wanted = points.findIndex((point2) => point2.id === fallback);
			const index = kept >= 0 ? kept : wanted >= 0 ? wanted : nearestIndex(points.map((point2) => point2.extent), shown);
			const { id, extent } = points[index];
			if (state.phase === "idle") {
				state = initialState(shown, kept);
				if (immediate || Math.abs(extent - shown) < .5) {
					state = initialState(extent, index);
					writeTranslate(extent);
					if (!immediate) return;
					if (id !== targetId) run({
						type: "snap",
						id,
						reason: "content-resize"
					}, performance.now());
					return options.onRest(id);
				}
			}
			dispatch({
				type: "snap-to",
				time: performance.now(),
				id,
				reason: "content-resize"
			});
		},
		target: () => closing ? null : targetId,
		isMoving: () => state.phase !== "idle",
		destroy() {
			destroyed = true;
			stopAnimation();
			if (frame) view.cancelAnimationFrame(frame);
			offs.forEach((off) => off());
			offPointer.forEach((off) => off());
			if (dragging) options.onDragChange(false);
			for (const property of [
				"translate",
				"user-select",
				"opacity"
			]) sheet.style.removeProperty(property);
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/sheet-scroll-snap.js
var restTimeout = 120;
var overscrollRoom = 24;
function createScrollSnapDriver(options) {
	const { sheet, host } = options;
	const doc = sheet.ownerDocument;
	const view = doc.defaultView ?? window;
	let state = initialState(0, -1);
	let extentAtTop = 0;
	let markers = [];
	let flip = null;
	let touching = false;
	let restMissed = false;
	let dragging = false;
	let closing = null;
	let restTimer = 0;
	let frame = 0;
	let targetId = null;
	const scrollAreas = /* @__PURE__ */ new Map();
	let caught = null;
	const restoreHost = setStyles(host, {
		inset: `0 0 calc(var(--keyboard-inset, 0px) - 120px) 0`,
		display: "block",
		"overflow-y": "scroll",
		"overflow-x": "hidden",
		"scroll-snap-type": "y mandatory",
		"scrollbar-width": "none",
		"overscroll-behavior": "contain",
		"pointer-events": "auto"
	});
	const restoreSheet = setStyles(sheet, {
		position: "absolute",
		left: "0",
		right: "0"
	});
	const supportsScrollEnd = "onscrollend" in host;
	const Timeline = view.ScrollTimeline;
	const offs = [
		on(host, "scroll", onScroll, { passive: true }),
		...supportsScrollEnd ? [on(host, "scrollend", onRest)] : [],
		on(host, "touchstart", () => {
			touching = true;
			restMissed = false;
			if (flip && !closing) catchFlip();
		}, { passive: true }),
		on(host, "touchend", onTouchEnd, { passive: true }),
		on(host, "touchcancel", onTouchEnd, { passive: true })
	];
	const hiddenBelow = isIOS() ? 1 : 121;
	const visibility = new IntersectionObserver(onVisibility, {
		root: host,
		rootMargin: `0px 0px -${hiddenBelow}px 0px`,
		threshold: 0
	});
	visibility.observe(sheet);
	const container = () => options.config().dimension;
	const largestExtent = () => options.config().snapPoints.at(-1)?.extent ?? 0;
	const maxScroll = () => largestExtent() + overscrollRoom - extentAtTop;
	const scrollExtent = () => Math.min(host.scrollTop + extentAtTop, largestExtent());
	function layout() {
		const config = options.config();
		extentAtTop = config.dismissible ? -120 : config.snapPoints[0].extent;
		sheet.style.top = `${container() - extentAtTop}px`;
		for (const marker2 of markers) marker2.remove();
		const extents = config.snapPoints.map((point) => point.extent);
		markers = (config.dismissible ? [extentAtTop, ...extents] : extents).map((extent) => marker(extent - extentAtTop, "start"));
		markers.push(marker(maxScroll() + host.clientHeight - 1, "none"));
		host.append(...markers);
		for (const area of scrollAreas.keys()) if (!sheet.contains(area)) scrollAreas.delete(area);
		for (const area of findScrollAreas(sheet)) if (!scrollAreas.has(area)) scrollAreas.set(area, [area.style.getPropertyValue("overflow-y"), area.style.getPropertyPriority("overflow-y")]);
	}
	function marker(top, align) {
		const el = doc.createElement("div");
		el.setAttribute("aria-hidden", "true");
		el.style.cssText = `position:absolute;left:0;width:1px;height:1px;top:${top}px;scroll-snap-align:${align};pointer-events:none`;
		return el;
	}
	function onScroll() {
		if (flip || closing) return;
		if (caught && touching && Math.abs(host.scrollTop - caught.offsetTop) > 1) releaseCatch();
		if (touching && !dragging) setDragging(true);
		if (!Timeline) frame ||= view.requestAnimationFrame(followScroll);
		view.clearTimeout(restTimer);
		if (!supportsScrollEnd && !touching) restTimer = view.setTimeout(onRest, restTimeout);
	}
	function followScroll() {
		frame = 0;
		options.onFrame(scrollExtent());
	}
	function onTouchEnd() {
		touching = false;
		setDragging(false);
		if (caught) {
			releaseCatch();
			const points = options.config().snapPoints;
			return moveTo(points[nearestIndex(points.map((point) => point.extent), scrollExtent())].id, "swipe");
		}
		if (!options.config().dismissible && host.scrollTop < -2) options.onDismissAttempt();
		if (restMissed || !supportsScrollEnd) restTimer = view.setTimeout(onRest, restTimeout);
		restMissed = false;
	}
	function setDragging(value) {
		if (dragging === value) return;
		dragging = value;
		options.onDragChange(value);
	}
	function onRest() {
		if (touching) {
			restMissed = true;
			return;
		}
		if (flip || closing) return;
		const config = options.config();
		const result = next(state, {
			type: "rest",
			extent: scrollExtent()
		}, config);
		state = result.state;
		for (const effect of result.effects) if (effect.type === "snap") {
			targetId = effect.id;
			options.onSnap(effect.id, effect.reason);
		}
		if (state.restingIndex >= 0) settle(config.snapPoints[state.restingIndex].id);
	}
	function onVisibility(entries) {
		if (entries[entries.length - 1].isIntersecting || flip || closing || targetId === null || !options.config().dismissible) return;
		closing = "swipe";
		targetId = null;
		options.onDismiss();
	}
	function catchFlip() {
		if (!flip) return;
		const scroll = Math.max(0, flip.extentAt(performance.now() - flip.startTime) - extentAtTop);
		stopFlip();
		caught = marker(scroll, "start");
		host.append(caught);
		host.scrollTop = scroll;
		followScroll();
		trackScroll();
	}
	function releaseCatch() {
		caught?.remove();
		caught = null;
	}
	function animateTo(target, from, startTime, onFinish) {
		stopFlip();
		const physics = options.config().physics;
		const solver = solveSpring(physics.response, physics.dampingRatio, from - target, 0);
		const duration = Math.max(1, settleTime(solver));
		const scrolled = Math.max(extentAtTop, target);
		host.scrollTop = scrolled - extentAtTop;
		const extentAt = (elapsed) => target + solver.position(Math.max(0, elapsed));
		const still = Math.abs(target - from) < .5;
		const sampled = !still && !supportsLinear();
		const animation = sheet.animate({ translate: sampled ? sampleTranslate({
			duration,
			extentAt
		}, (extent) => `0 ${scrolled - extent}px`) : [`0 ${scrolled - from}px`, `0 ${scrolled - target}px`] }, {
			duration,
			easing: still || sampled ? "linear" : springLinearEasing(solver, from, target, duration),
			fill: "both"
		});
		animation.startTime = startTime;
		flip = {
			animation,
			to: target,
			extentAt,
			startTime
		};
		options.onMotion({
			type: "settle",
			extentAt,
			startTime,
			duration
		});
		animation.onfinish = () => {
			if (flip?.animation !== animation) return;
			flip = null;
			onFinish();
			animation.cancel();
		};
	}
	function stopFlip() {
		flip?.animation.cancel();
		flip = null;
	}
	function settle(id) {
		const config = options.config();
		const index = config.snapPoints.findIndex((point) => point.id === id);
		state = initialState(config.snapPoints[index].extent, index);
		targetId = id;
		host.style.pointerEvents = options.isInteractive(id) ? "none" : "auto";
		const atLargest = index === config.snapPoints.length - 1;
		for (const [area, [value, priority]] of scrollAreas) if (atLargest) area.style.setProperty("overflow-y", value, priority);
		else area.style.overflowY = "hidden";
		options.onRest(id);
		trackScroll();
	}
	function trackScroll() {
		if (!Timeline) return;
		const max = maxScroll();
		const timeline = new Timeline({
			source: host,
			axis: "block"
		});
		options.onMotion({
			type: "timeline",
			timeline,
			extentAt: (progress) => Math.min(largestExtent(), progress * max + extentAtTop)
		});
	}
	function moveTo(id, reason) {
		const point = options.config().snapPoints.find((entry) => entry.id === id);
		if (!point || closing === "close") return;
		closing = null;
		if (id !== targetId) {
			targetId = id;
			options.onSnap(id, reason);
		}
		const from = flip ? flip.extentAt(performance.now() - flip.startTime) : scrollExtent();
		animateTo(point.extent, from, performance.now(), () => settle(id));
	}
	return {
		open(id, animate) {
			closing = null;
			targetId = id;
			layout();
			const point = options.config().snapPoints.find((entry) => entry.id === id);
			if (!point) return;
			if (!animate) {
				host.scrollTop = point.extent - extentAtTop;
				return settle(id);
			}
			animateTo(point.extent, -120, performance.now() + openHold, () => settle(id));
			const opening = flip;
			afterFirstFrame(view, (frameTime) => {
				if (!opening || flip !== opening) return;
				opening.animation.startTime = frameTime;
				opening.startTime = frameTime;
				options.onMotionStart(frameTime);
			});
		},
		close() {
			const wasClosing = closing;
			closing = "close";
			if (wasClosing) return;
			targetId = null;
			animateTo(-120, flip ? flip.extentAt(performance.now() - flip.startTime) : scrollExtent(), performance.now(), () => options.onRest(null));
		},
		snapTo: moveTo,
		nudge() {
			if (closing || options.reducedMotion() || targetId === null) return;
			const point = options.config().snapPoints.find((entry) => entry.id === targetId);
			if (point) animateTo(point.extent, point.extent - 20, performance.now(), () => settle(point.id));
		},
		relayout(_immediate, fallback) {
			if (closing || touching) return;
			const points = options.config().snapPoints;
			const kept = points.findIndex((point2) => point2.id === targetId);
			const wanted = points.findIndex((point2) => point2.id === fallback);
			const index = kept >= 0 ? kept : wanted >= 0 ? wanted : nearestIndex(points.map((point2) => point2.extent), scrollExtent());
			const top = extentAtTop;
			layout();
			const point = points[index];
			if (point.id !== targetId) {
				targetId = point.id;
				options.onSnap(point.id, "content-resize");
			}
			if (flip) {
				const moving = flip;
				const now = performance.now();
				if (moving.to !== point.extent || extentAtTop !== top) {
					animateTo(point.extent, moving.extentAt(now - moving.startTime), Math.max(now, moving.startTime), () => settle(point.id));
					flip = Object.assign(moving, flip);
				}
				return;
			}
			host.scrollTop = point.extent - extentAtTop;
			settle(point.id);
		},
		target: () => closing ? null : targetId,
		isMoving: () => !!flip || dragging,
		destroy() {
			stopFlip();
			releaseCatch();
			view.clearTimeout(restTimer);
			if (frame) view.cancelAnimationFrame(frame);
			visibility.disconnect();
			offs.forEach((off) => off());
			for (const marker2 of markers) marker2.remove();
			for (const [area, [value, priority]] of scrollAreas) area.style.setProperty("overflow-y", value, priority);
			if (dragging) options.onDragChange(false);
			sheet.style.removeProperty("top");
			restoreSheet();
			restoreHost();
		}
	};
}
function findScrollAreas(sheet) {
	const view = sheet.ownerDocument.defaultView ?? window;
	return Array.from(sheet.querySelectorAll("*")).filter((el) => /auto|scroll/.test(view.getComputedStyle(el).overflowY));
}
// node_modules/@ui-sdk/core/dist/foundation/popups/theme-color.js
function channels(color) {
	const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(color);
	return match ? [
		match[1],
		match[2],
		match[3]
	].map(Number) : null;
}
function dimThemeColor(doc, alpha) {
	const metas = Array.from(doc.querySelectorAll("meta[name=\"theme-color\"]"));
	const originals = metas.map((meta) => meta.content);
	const bases = originals.map((color) => channels(resolveColor(doc, color)));
	let written = -1;
	function write(dim) {
		const shade = Math.round(dim * alpha * 100) / 100;
		if (shade === written) return;
		written = shade;
		metas.forEach((meta, index) => {
			const base = bases[index];
			if (!base) return;
			meta.content = shade ? `rgb(${base.map((channel) => Math.round(channel * (1 - shade))).join(" ")})` : originals[index];
		});
	}
	function restore() {
		metas.forEach((meta, index) => meta.content = originals[index]);
		written = -1;
	}
	return {
		write,
		restore
	};
}
function resolveColor(doc, color) {
	const probe = doc.createElement("span");
	probe.style.color = color;
	probe.style.display = "none";
	doc.body.append(probe);
	const resolved = doc.defaultView?.getComputedStyle(probe).color ?? color;
	probe.remove();
	return resolved;
}
// node_modules/@ui-sdk/core/dist/foundation/popups/sheet.js
var controls = "a[href], button, label, summary, [role=\"button\"], [role=\"link\"], [role=\"slider\"], [tabindex]:not([tabindex=\"-1\"])";
var isDragSurface = (target) => !target.closest(controls);
var none = () => {};
function withDefaults(options) {
	return {
		side: () => "bottom",
		snapPoints: () => ["content"],
		snapPoint: () => null,
		dismissible: () => true,
		modalAbove: () => void 0,
		driver: () => "auto",
		expandOnScroll: () => true,
		physics: () => void 0,
		backdrop: () => void 0,
		hostBackdrop: false,
		outlets: () => [],
		parent: () => void 0,
		themeColor: () => false,
		preventEdgeSwipe: () => false,
		canMouseDrag: isDragSurface,
		onSnap: none,
		onRest: none,
		onDismissAttempt: none,
		onDragChange: none,
		onLayout: none,
		...withoutUndefined(options)
	};
}
function withoutUndefined(object) {
	return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== void 0));
}
var sheets = /* @__PURE__ */ new WeakSet();
var sheetLayers = /* @__PURE__ */ new WeakMap();
function parentSheet(layer) {
	for (let up = layer.parent; up; up = up.parent) {
		const sheet = sheetLayers.get(up);
		if (sheet) return sheet;
	}
}
function sheetAt(target) {
	for (let node = target instanceof Element ? target : null; node;) {
		if (sheets.has(node)) return node;
		const root = node.getRootNode();
		node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
	}
	return null;
}
function inNestedLayer(field, sheet) {
	const layer = field.closest("[popover]");
	return !!layer && layer !== sheet && sheet.contains(layer);
}
var edgeZone = 24;
function usesScrollSnap(view, options) {
	const driver = options.driver();
	if (driver !== "auto") return driver === "scroll-snap";
	return options.modalAbove() === void 0 && options.expandOnScroll() && !!view.matchMedia?.("(hover: none) and (pointer: coarse)").matches;
}
var keyboardMotion = {
	duration: 250,
	easing: "cubic-bezier(0.38, 0.7, 0.125, 1)"
};
function attachSheet(el, input) {
	const options = withDefaults(input);
	const { host } = options;
	const doc = el.ownerDocument;
	const view = doc.defaultView ?? window;
	const reducedMotion = view.matchMedia?.("(prefers-reduced-motion: reduce)");
	let side = resolveSide(options.side(), el);
	let resolved = [];
	let size = 0;
	let physicsSource;
	let physics = sheetPhysics.ios;
	let theme;
	let restoreBackdrop;
	const config = {
		snapPoints: [],
		dimension: 0,
		dismissible: true,
		expandOnScroll: true,
		physics,
		contentScroll
	};
	const scrollSnap = side === "bottom" && usesScrollSnap(view, options);
	sheets.add(el);
	const restoreStyles = [styleHost(host, side, el), styleSheet(el)];
	let ancestors = [];
	const effects = createSheetEffects({
		sheet: el,
		backdrop: options.backdrop,
		dimmed: options.hostBackdrop ? host : void 0,
		outlets: options.outlets,
		ancestors: () => ancestors,
		themeColor: (dim) => theme?.write(dim)
	});
	function readConfig() {
		const source = options.physics();
		if (source !== physicsSource) {
			physicsSource = source;
			physics = source ? {
				...sheetPhysics.ios,
				...source
			} : sheetPhysics.ios;
		}
		config.physics = physics;
		config.dismissible = options.dismissible();
		config.expandOnScroll = options.expandOnScroll();
		return config;
	}
	let measured = false;
	function measure() {
		measured = true;
		const nextSide = resolveSide(options.side(), el);
		if (nextSide !== side) {
			side = nextSide;
			restoreStyles[0]();
			restoreStyles[0] = styleHost(host, side, el);
		}
		const container = (isVertical(side) ? host.clientHeight : host.clientWidth) - (scrollSnap ? 120 : 0);
		viewportHeight ??= view.visualViewport?.height;
		size = sizeAlong(el, side);
		const rootFontSize = parseFloat(view.getComputedStyle(doc.documentElement).fontSize) || 16;
		const next = resolveSnapPoints(options.snapPoints(), {
			container,
			content: size,
			rootFontSize
		});
		if (!next.length) next.push({
			id: "content",
			value: "content",
			extent: size,
			ids: ["content"]
		});
		const changed = container !== config.dimension || next.length !== resolved.length || next.some((point, index) => point.id !== resolved[index].id || Math.abs(point.extent - resolved[index].extent) >= .5);
		resolved = next;
		config.dimension = container;
		config.snapPoints = resolved.map(({ id, extent }) => ({
			id,
			extent
		}));
		effects.configure({
			snapExtents: config.snapPoints.map((point) => point.extent),
			undimmedIndex: findSnapIndex(resolved, options.modalAbove())
		});
		if (changed) reportLayout();
		return changed;
	}
	let destroyed = false;
	const valueOf = (id) => id === null ? null : resolved.find((point) => point.id === id)?.value ?? null;
	const driverOptions = {
		sheet: el,
		host,
		side: () => side,
		config: readConfig,
		size: () => size,
		closedExtent: () => closedExtentFor(side),
		reducedMotion: () => !!reducedMotion?.matches,
		owns: (target) => sheetAt(target) === el,
		canMouseDrag: options.canMouseDrag,
		onSnap: (id, reason, event) => {
			const value = valueOf(id);
			if (value !== null) options.onSnap(value, reason, event);
		},
		onRest(id) {
			if (destroyed) return;
			const point = resolved.find((entry) => entry.id === id);
			effects.apply(point?.extent ?? closedExtentFor(side), { rest: true });
			options.onRest(valueOf(id));
			if (revealAtRest && id !== null) revealFocused();
			revealAtRest = false;
		},
		onDismiss: options.onDismiss,
		onDismissAttempt: options.onDismissAttempt,
		onDragChange: options.onDragChange,
		isInteractive: (id) => sheet.isInteractiveAt(valueOf(id)),
		onFrame: (extent) => destroyed || effects.apply(extent),
		onMotion: (motion) => destroyed || effects.play(motion),
		onMotionStart: (startTime) => destroyed || effects.sync(startTime)
	};
	let attaching = true;
	function reportLayout() {
		if (!attaching) return options.onLayout({
			side,
			snapPoints: resolved
		});
		queueMicrotask(() => destroyed || options.onLayout({
			side,
			snapPoints: resolved
		}));
	}
	readConfig();
	const driver = scrollSnap ? createScrollSnapDriver(driverOptions) : createPointerDriver(driverOptions);
	el.setAttribute("data-driver", scrollSnap ? "scroll-snap" : "pointer");
	attaching = false;
	const observer = new ResizeObserver(() => {
		relayout(false);
	});
	observer.observe(el);
	observer.observe(host);
	let keyboardFrom = 0;
	let viewportHeight;
	let keyboardSlide = null;
	const offs = [
		trackKeyboard(host, {
			before: () => keyboardFrom = el.getBoundingClientRect().top,
			after: followKeyboard
		}),
		...options.preventEdgeSwipe() ? [on(doc, "touchstart", preventEdgeSwipe, {
			capture: true,
			passive: false
		})] : [],
		...isIOS() ? [on(doc, "touchend", focusWithoutScrolling, {
			capture: true,
			passive: false
		})] : [],
		on(el, "focusin", revealWhenStill)
	];
	function followKeyboard() {
		relayout(true);
		revealFocused();
		const height = view.visualViewport?.height;
		if (height === viewportHeight) return;
		viewportHeight = height;
		keyboardSlide?.cancel();
		keyboardSlide = null;
		const shift = keyboardFrom - el.getBoundingClientRect().top;
		if (Math.abs(shift) < 1 || reducedMotion?.matches) return;
		keyboardSlide = host.animate({ translate: [`0 ${shift}px`, "0 0"] }, keyboardMotion);
	}
	function preventEdgeSwipe(event) {
		if (!event.cancelable) return;
		const touch = event.touches[0];
		if (!touch || touch.clientX > edgeZone && touch.clientX < view.innerWidth - edgeZone) return;
		const target = event.target;
		if (target && (host.contains(target) || options.backdrop()?.contains(target))) event.preventDefault();
	}
	function focusWithoutScrolling(event) {
		const target = event.target;
		if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
		if (!el.contains(target) || target === doc.activeElement || driver.isMoving() || !event.cancelable) return;
		event.preventDefault();
		target.focus({ preventScroll: true });
	}
	let revealAtRest = false;
	function revealWhenStill() {
		if (driver.isMoving()) revealAtRest = true;
		else revealFocused();
	}
	function revealFocused() {
		const field = doc.activeElement;
		if (!(field instanceof HTMLElement) || !el.contains(field) || field === el || inNestedLayer(field, el)) return;
		const area = scrollAreaAt(field, el, "bottom");
		if (!area) return;
		const visual = view.visualViewport;
		const visibleBottom = Math.min(area.getBoundingClientRect().bottom, visual ? visual.offsetTop + visual.height : view.innerHeight);
		const { top, bottom } = field.getBoundingClientRect();
		const margin = 16;
		const areaTop = area.getBoundingClientRect().top;
		const delta = bottom + margin > visibleBottom ? bottom + margin - visibleBottom : top - margin < areaTop ? top - margin - areaTop : 0;
		if (delta) area.scrollBy({
			top: delta,
			behavior: reducedMotion?.matches ? "instant" : "smooth"
		});
	}
	function relayout(immediate) {
		const first = !measured;
		if (measure() && !first) driver.relayout(immediate, resolved[findSnapIndex(resolved, options.snapPoint())]?.id);
	}
	function idOf(point) {
		const index = findSnapIndex(resolved, point);
		return resolved[index >= 0 ? index : 0]?.id;
	}
	const sheet = {
		element: el,
		parent: options.parent,
		open(animate) {
			if (destroyed) return;
			ancestors = [];
			for (let parent = options.parent(); parent; parent = parent.parent()) ancestors.push(parent.element);
			measure();
			readConfig();
			if (options.themeColor()) theme ??= dimThemeColor(doc, physics.dim);
			if (animate) effects.apply(closedExtentFor(side));
			restoreBackdrop?.();
			const backdrop = options.backdrop();
			restoreBackdrop = backdrop && setStyles(backdrop, { "will-change": "opacity" });
			driver.open(idOf(options.snapPoint()), animate);
		},
		close: () => destroyed || driver.close(),
		snapTo(point, reason) {
			const index = findSnapIndex(resolved, point);
			if (index >= 0 && resolved[index].id !== driver.target()) driver.snapTo(resolved[index].id, reason);
		},
		nudge: () => driver.nudge(),
		snapPoints: () => resolved,
		target: () => valueOf(driver.target()),
		isInteractiveAt: (point) => isAtOrBelow(resolved, point, options.modalAbove()),
		refresh() {
			relayout(false);
		},
		destroy() {
			destroyed = true;
			observer.disconnect();
			keyboardSlide?.cancel();
			offs.forEach((off) => off());
			driver.destroy();
			effects.destroy();
			restoreBackdrop?.();
			theme?.restore();
			restoreStyles.forEach((restore) => restore());
			el.removeAttribute("data-driver");
			sheets.delete(el);
		}
	};
	return sheet;
}
function styleHost(host, side, sheet) {
	const vertical = isVertical(side);
	const atEnd = vertical ? side === "bottom" : side === "right" !== (sheet.ownerDocument.defaultView?.getComputedStyle(host).direction === "rtl");
	return setStyles(host, {
		position: "fixed",
		inset: "0 0 var(--keyboard-inset, 0px) 0",
		width: "auto",
		height: "auto",
		"max-width": "none",
		"max-height": "none",
		margin: "0",
		padding: "0",
		border: "0",
		background: "transparent",
		color: "inherit",
		overflow: "visible",
		display: "flex",
		"flex-direction": vertical ? "column" : "row",
		"justify-content": atEnd ? "flex-end" : "flex-start",
		"pointer-events": "none"
	});
}
function styleSheet(sheet) {
	return setStyles(sheet, {
		"pointer-events": "auto",
		"overscroll-behavior": "contain",
		"will-change": "translate"
	});
}
// node_modules/@ui-sdk/core/dist/foundation/popups/sheet-presentation.js
function styleBackdrop(host) {
	const slot = host.getAttribute("data-slot");
	if (!slot) return;
	writeStyle(host.ownerDocument, `ui-sdk-sheet-${slot}`, `@layer ui-sdk { :where([data-slot="${slot}"])::backdrop { background: var(--sheet-backdrop, rgb(0 0 0 / 0.2)); pointer-events: auto } }`);
}
function isolate(container, keep) {
	const restores = [];
	const walk = (node) => {
		for (const child of Array.from(node.children)) {
			if (keep.includes(child)) continue;
			if (keep.some((el) => el && child.contains(el))) walk(child);
			else if (child instanceof HTMLElement) restores.push(setStyle(child, "display", "none"));
		}
	};
	walk(container);
	return () => restores.forEach((restore) => restore());
}
function drillIn(el, popup, config) {
	let restore;
	const unbind = popup.bind(el, {
		...config,
		position: void 0,
		inline: true,
		onShow() {
			const [parent, trigger] = config.drillIn();
			if (parent) restore = isolate(parent, [el, trigger]);
			return () => restore?.();
		},
		onClose() {
			restore?.();
			restore = setStyle(el, "display", "none");
		}
	});
	return () => {
		unbind();
		restore?.();
	};
}
function presentSheet(el, popup, config) {
	if (config.drillIn) return drillIn(el, popup, config);
	const host = el.parentElement;
	if (!host) return;
	styleBackdrop(host);
	let sheet;
	return popup.bind(el, {
		...config,
		position: void 0,
		host: () => host,
		onShow(layer) {
			const shown = showSheet(el, host, popup, config, layer);
			sheet = shown.sheet;
			return () => {
				shown.hide();
				sheet = void 0;
			};
		},
		onClose: () => sheet?.close()
	});
}
function showSheet(el, host, popup, config, layer) {
	let rest = null;
	const stackedOn = parentSheet(layer);
	const dimsHost = !config.backdrop?.();
	const sheet = attachSheet(el, {
		host,
		snapPoints: () => config.snapPoints ?? ["content"],
		snapPoint: () => rest,
		backdrop: config.backdrop,
		hostBackdrop: dimsHost,
		dismissible: config.dismissible,
		onDismissAttempt: config.onDismissAttempt,
		parent: () => stackedOn?.(),
		onSnap: (point) => rest = point,
		onDismiss(event) {
			popup.requestClose("swipe", event);
			requestAnimationFrame(() => {
				const point = rest ?? sheet.snapPoints()[0]?.value;
				if (layer.active() && point !== void 0) sheet.snapTo(point, "imperative");
			});
		}
	});
	sheetLayers.set(layer, () => sheet);
	config.onSheet?.(sheet);
	const offGrow = on(el, "focusin", (event) => {
		const largest = sheet.snapPoints().at(-1);
		if (largest && sheet.snapPoints().length > 1 && event.target.matches("input, textarea")) sheet.snapTo(largest.value, "imperative");
	});
	const color = dimsHost ? getComputedStyle(el).getPropertyValue("--sheet-backdrop") : "transparent";
	if (color) host.style.setProperty("--sheet-backdrop", color);
	if (layer.active()) sheet.open(popup.opener() !== "initial");
	return {
		sheet,
		hide() {
			offGrow();
			sheetLayers.delete(layer);
			sheet.destroy();
			config.onSheet?.(void 0);
			host.style.removeProperty("--sheet-backdrop");
		}
	};
}
export { prepareVariables, presentSheet };
