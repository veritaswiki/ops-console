import { n as __exportAll, r as __toESM } from "./rolldown-runtime-Bl4WtXjF.js";
import { b as require_react_dom, x as require_react } from "./vendor-charts-Cc1dpEBz.js";
import { p as require_jsx_runtime } from "./vendor-flow-aUB-QjJm.js";
import { $ as writeStyle, A as partState, B as selects, C as authorOwned, D as liveAttrs, E as handlers, F as references, G as sameValue, H as heldState, I as selectedKeys, J as on, K as standFor, L as subscribe, M as propsRendered, N as provisional, O as madeLabel, P as ref, Q as setStyle$1, R as takeOwnId, S as attrs, T as directNames, U as renders, V as createStore, W as sameSlotState, X as ahead, Y as afterPaint, Z as enforceHidden, _ as nearestIndex, a as expandAmount, b as animateOut, c as isAtOrBelow, d as contentScroll, et as afterBind, f as initialState, g as springLinearEasing, h as solveSpring, i as dimAmount, it as note, j as present, k as onProps, l as resolveSnapPoints, m as settleTime, n as hiddenAttrs, o as progressAmount, p as next, q as isComposing, r as createVelocityTracker, rt as exposeShortcuts, s as findSnapIndex, t as bindFindable, tt as runBindWrites, u as sheetPhysics, v as handoff, w as commit, x as writeOpen, y as animateIn, z as yieldToAuthor } from "./vendor-motion-BAjclsVr.js";
// node_modules/sonner/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom(), 1);
function __insertCSS$1(code) {
	if (!code || typeof document == "undefined") return;
	let head = document.head || document.getElementsByTagName("head")[0];
	let style = document.createElement("style");
	style.type = "text/css";
	head.appendChild(style);
	style.styleSheet ? style.styleSheet.cssText = code : style.appendChild(document.createTextNode(code));
}
var getAsset = (type) => {
	switch (type) {
		case "success": return SuccessIcon;
		case "info": return InfoIcon;
		case "warning": return WarningIcon;
		case "error": return ErrorIcon;
		default: return null;
	}
};
var bars = Array(12).fill(0);
var Loader = ({ visible, className }) => {
	return /*#__PURE__*/ import_react.createElement("div", {
		className: ["sonner-loading-wrapper", className].filter(Boolean).join(" "),
		"data-visible": visible
	}, /*#__PURE__*/ import_react.createElement("div", { className: "sonner-spinner" }, bars.map((_, i) => /*#__PURE__*/ import_react.createElement("div", {
		className: "sonner-loading-bar",
		key: `spinner-bar-${i}`
	}))));
};
var SuccessIcon = /*#__PURE__*/ import_react.createElement("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 20 20",
	fill: "currentColor",
	height: "20",
	width: "20",
	"aria-hidden": "true"
}, /*#__PURE__*/ import_react.createElement("path", {
	fillRule: "evenodd",
	d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
	clipRule: "evenodd"
}));
var WarningIcon = /*#__PURE__*/ import_react.createElement("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 24 24",
	fill: "currentColor",
	height: "20",
	width: "20",
	"aria-hidden": "true"
}, /*#__PURE__*/ import_react.createElement("path", {
	fillRule: "evenodd",
	d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
	clipRule: "evenodd"
}));
var InfoIcon = /*#__PURE__*/ import_react.createElement("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 20 20",
	fill: "currentColor",
	height: "20",
	width: "20",
	"aria-hidden": "true"
}, /*#__PURE__*/ import_react.createElement("path", {
	fillRule: "evenodd",
	d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
	clipRule: "evenodd"
}));
var ErrorIcon = /*#__PURE__*/ import_react.createElement("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 20 20",
	fill: "currentColor",
	height: "20",
	width: "20",
	"aria-hidden": "true"
}, /*#__PURE__*/ import_react.createElement("path", {
	fillRule: "evenodd",
	d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
	clipRule: "evenodd"
}));
var CloseIcon = /*#__PURE__*/ import_react.createElement("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "12",
	height: "12",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "1.5",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true"
}, /*#__PURE__*/ import_react.createElement("line", {
	x1: "18",
	y1: "6",
	x2: "6",
	y2: "18"
}), /*#__PURE__*/ import_react.createElement("line", {
	x1: "6",
	y1: "6",
	x2: "18",
	y2: "18"
}));
var useIsDocumentHidden = () => {
	const [isDocumentHidden, setIsDocumentHidden] = import_react.useState(document.hidden);
	import_react.useEffect(() => {
		const callback = () => {
			setIsDocumentHidden(document.hidden);
		};
		document.addEventListener("visibilitychange", callback);
		return () => document.removeEventListener("visibilitychange", callback);
	}, []);
	return isDocumentHidden;
};
var toastsCounter = 1;
var MAX_HISTORY_SIZE = 100;
var getToastId = (data) => {
	var _data_id;
	return typeof (data == null ? void 0 : data.id) === "number" || (data == null ? void 0 : (_data_id = data.id) == null ? void 0 : _data_id.length) > 0 ? data.id : toastsCounter++;
};
var Observer = class {
	constructor() {
		this.subscribe = (subscriber) => {
			this.subscribers.push(subscriber);
			this.getActiveToasts().forEach((toast) => subscriber(toast));
			return () => {
				const index = this.subscribers.indexOf(subscriber);
				this.subscribers.splice(index, 1);
			};
		};
		this.publish = (data) => {
			this.subscribers.forEach((subscriber) => subscriber(data));
		};
		this.addToast = (data) => {
			this.publish(data);
			this.toasts = [...this.toasts, data];
			this.trimHistory();
		};
		this.trimHistory = () => {
			let toRemove = this.toasts.length - MAX_HISTORY_SIZE;
			if (toRemove <= 0) return;
			this.toasts = this.toasts.filter((toast) => {
				if (toRemove > 0 && this.dismissedToasts.has(toast.id)) {
					this.dismissedToasts.delete(toast.id);
					toRemove--;
					return false;
				}
				return true;
			});
		};
		this.create = (data) => {
			const { message, ...rest } = data;
			const id = getToastId(data);
			const pendingDismissal = this.pendingDismissals.get(id);
			if (pendingDismissal !== void 0) {
				cancelAnimationFrame(pendingDismissal);
				this.pendingDismissals.delete(id);
				this.dismissedToasts.delete(id);
			}
			const wasDismissed = this.dismissedToasts.has(id);
			const dismissible = data.dismissible === void 0 ? true : data.dismissible;
			if (wasDismissed) {
				this.dismissedToasts.delete(id);
				this.toasts = this.toasts.filter((toast) => toast.id !== id);
			}
			if (wasDismissed ? void 0 : this.toasts.find((toast) => {
				return toast.id === id;
			})) this.toasts = this.toasts.map((toast) => {
				if (toast.id === id) {
					this.publish({
						...toast,
						...data,
						id,
						title: message
					});
					return {
						...toast,
						...data,
						id,
						dismissible,
						title: message
					};
				}
				return toast;
			});
			else this.addToast({
				title: message,
				...rest,
				dismissible,
				id
			});
			return id;
		};
		this.dismiss = (id) => {
			if (id === void 0 || id === null) {
				this.getActiveToasts().forEach((toast) => {
					this.dismissedToasts.add(toast.id);
					this.subscribers.forEach((subscriber) => subscriber({
						id: toast.id,
						dismiss: true
					}));
				});
				return id;
			}
			this.dismissedToasts.add(id);
			const alreadyPending = this.pendingDismissals.get(id);
			if (alreadyPending !== void 0) cancelAnimationFrame(alreadyPending);
			this.pendingDismissals.set(id, requestAnimationFrame(() => {
				this.pendingDismissals.delete(id);
				this.subscribers.forEach((subscriber) => subscriber({
					id,
					dismiss: true
				}));
			}));
			return id;
		};
		this.message = (message, data) => {
			return this.create({
				...data,
				message,
				type: void 0
			});
		};
		this.error = (message, data) => {
			return this.create({
				...data,
				message,
				type: "error"
			});
		};
		this.success = (message, data) => {
			return this.create({
				...data,
				type: "success",
				message
			});
		};
		this.info = (message, data) => {
			return this.create({
				...data,
				type: "info",
				message
			});
		};
		this.warning = (message, data) => {
			return this.create({
				...data,
				type: "warning",
				message
			});
		};
		this.loading = (message, data) => {
			return this.create({
				...data,
				type: "loading",
				message
			});
		};
		this.promise = (promise, data) => {
			if (!data) return;
			let id = void 0;
			if (data.loading !== void 0) id = this.create({
				...data,
				promise,
				type: "loading",
				message: data.loading,
				description: typeof data.description !== "function" ? data.description : void 0
			});
			const p = Promise.resolve(promise instanceof Function ? promise() : promise);
			let shouldDismiss = id !== void 0;
			let result;
			const originalPromise = p.then(async (response) => {
				result = ["resolve", response];
				if (import_react.isValidElement(response)) {
					shouldDismiss = false;
					this.create({
						id,
						type: "default",
						message: response
					});
				} else if (isHttpResponse(response) && !response.ok) {
					shouldDismiss = false;
					const promiseData = typeof data.error === "function" ? await data.error(`HTTP error! status: ${response.status}`) : data.error;
					const description = typeof data.description === "function" ? await data.description(`HTTP error! status: ${response.status}`) : data.description;
					const toastSettings = typeof promiseData === "object" && !import_react.isValidElement(promiseData) ? promiseData : { message: promiseData };
					this.create({
						id,
						type: "error",
						description,
						...toastSettings
					});
				} else if (response instanceof Error) {
					shouldDismiss = false;
					const promiseData = typeof data.error === "function" ? await data.error(response) : data.error;
					const description = typeof data.description === "function" ? await data.description(response) : data.description;
					const toastSettings = typeof promiseData === "object" && !import_react.isValidElement(promiseData) ? promiseData : { message: promiseData };
					this.create({
						id,
						type: "error",
						description,
						...toastSettings
					});
				} else if (data.success !== void 0) {
					shouldDismiss = false;
					const promiseData = typeof data.success === "function" ? await data.success(response) : data.success;
					const description = typeof data.description === "function" ? await data.description(response) : data.description;
					const toastSettings = typeof promiseData === "object" && !import_react.isValidElement(promiseData) ? promiseData : { message: promiseData };
					this.create({
						id,
						type: "success",
						description,
						...toastSettings
					});
				}
			}).catch(async (error) => {
				result = ["reject", error];
				if (data.error !== void 0) {
					shouldDismiss = false;
					const promiseData = typeof data.error === "function" ? await data.error(error) : data.error;
					const description = typeof data.description === "function" ? await data.description(error) : data.description;
					const toastSettings = typeof promiseData === "object" && !import_react.isValidElement(promiseData) ? promiseData : { message: promiseData };
					this.create({
						id,
						type: "error",
						description,
						...toastSettings
					});
				}
			}).finally(() => {
				if (shouldDismiss) {
					this.dismiss(id);
					id = void 0;
				}
				data.finally == null || data.finally.call(data);
			});
			const unwrap = () => new Promise((resolve, reject) => originalPromise.then(() => result[0] === "reject" ? reject(result[1]) : resolve(result[1])).catch(reject));
			if (typeof id !== "string" && typeof id !== "number") return { unwrap };
			else return Object.assign(id, { unwrap });
		};
		this.custom = (jsx, data) => {
			const id = getToastId(data);
			this.create({
				...data,
				jsx: jsx(id),
				id,
				type: void 0
			});
			return id;
		};
		this.getActiveToasts = () => {
			return this.toasts.filter((toast) => !this.dismissedToasts.has(toast.id));
		};
		this.subscribers = [];
		this.toasts = [];
		this.dismissedToasts = /* @__PURE__ */ new Set();
		this.pendingDismissals = /* @__PURE__ */ new Map();
	}
};
var ToastState = new Observer();
var toastFunction = (message, data) => {
	return ToastState.message(message, data);
};
var isHttpResponse = (data) => {
	return data && typeof data === "object" && "ok" in data && typeof data.ok === "boolean" && "status" in data && typeof data.status === "number";
};
var basicToast = toastFunction;
var getHistory = () => ToastState.toasts;
var getToasts = () => ToastState.getActiveToasts();
var toast = Object.assign(basicToast, {
	success: ToastState.success,
	info: ToastState.info,
	warning: ToastState.warning,
	error: ToastState.error,
	custom: ToastState.custom,
	message: ToastState.message,
	promise: ToastState.promise,
	dismiss: ToastState.dismiss,
	loading: ToastState.loading
}, {
	getHistory,
	getToasts
});
__insertCSS$1("[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--normal-text);background:var(--normal-bg);border:1px solid var(--normal-border);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{-webkit-user-select:none;user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}");
function isAction(action) {
	return action.label !== void 0;
}
var VISIBLE_TOASTS_AMOUNT = 3;
var VIEWPORT_OFFSET = "24px";
var MOBILE_VIEWPORT_OFFSET = "16px";
var TOAST_LIFETIME = 4e3;
var TOAST_WIDTH = 356;
var GAP = 14;
var SWIPE_THRESHOLD = 45;
var TIME_BEFORE_UNMOUNT = 200;
function cn(...classes) {
	return classes.filter(Boolean).join(" ");
}
function getDefaultSwipeDirections(position) {
	const [y, x] = position.split("-");
	const directions = [];
	if (y) directions.push(y);
	if (x) directions.push(x);
	return directions;
}
var Toast = (props) => {
	var _toast_classNames, _toast_classNames1, _toast_classNames2, _toast_classNames3, _toast_classNames4, _toast_classNames5, _toast_classNames6, _toast_classNames7, _toast_classNames8;
	const { invert: ToasterInvert, toast, unstyled, interacting, setHeights, visibleToasts, heights, index, toasts, expanded, removeToast, defaultRichColors, closeButton: closeButtonFromToaster, style, cancelButtonStyle, actionButtonStyle, className = "", descriptionClassName = "", duration: durationFromToaster, position, gap, expandByDefault, classNames, icons, closeButtonAriaLabel = "Close toast" } = props;
	const [swipeDirection, setSwipeDirection] = import_react.useState(null);
	const [swipeOutDirection, setSwipeOutDirection] = import_react.useState(null);
	const [mounted, setMounted] = import_react.useState(false);
	const [removed, setRemoved] = import_react.useState(false);
	const [swiping, setSwiping] = import_react.useState(false);
	const [swipeOut, setSwipeOut] = import_react.useState(false);
	const [isSwiped, setIsSwiped] = import_react.useState(false);
	const [offsetBeforeRemove, setOffsetBeforeRemove] = import_react.useState(0);
	const [initialHeight, setInitialHeight] = import_react.useState(0);
	const remainingTime = import_react.useRef(toast.duration || durationFromToaster || TOAST_LIFETIME);
	const dragStartTime = import_react.useRef(null);
	const toastRef = import_react.useRef(null);
	const isFront = index === 0;
	const isVisible = index + 1 <= visibleToasts;
	const toastType = toast.type;
	const toastTypeKey = toastType != null ? toastType : "default";
	const dismissible = toast.dismissible !== false;
	const toastClassname = toast.className || "";
	const toastDescriptionClassname = toast.descriptionClassName || "";
	const heightIndex = import_react.useMemo(() => heights.findIndex((height) => height.toastId === toast.id) || 0, [heights, toast.id]);
	const closeButton = import_react.useMemo(() => {
		var _toast_closeButton;
		return (_toast_closeButton = toast.closeButton) != null ? _toast_closeButton : closeButtonFromToaster;
	}, [toast.closeButton, closeButtonFromToaster]);
	const duration = import_react.useMemo(() => toast.duration || durationFromToaster || TOAST_LIFETIME, [toast.duration, durationFromToaster]);
	const closeTimerStartTimeRef = import_react.useRef(0);
	const offset = import_react.useRef(0);
	const lastCloseTimerStartTimeRef = import_react.useRef(0);
	const pointerStartRef = import_react.useRef(null);
	const [y, x] = position.split("-");
	const toastsHeightBefore = import_react.useMemo(() => {
		return heights.reduce((prev, curr, reducerIndex) => {
			if (reducerIndex >= heightIndex) return prev;
			return prev + curr.height;
		}, 0);
	}, [heights, heightIndex]);
	const isDocumentHidden = useIsDocumentHidden();
	const swipeDirections = import_react.useMemo(() => {
		var _props_swipeDirections;
		return (_props_swipeDirections = props.swipeDirections) != null ? _props_swipeDirections : getDefaultSwipeDirections(position);
	}, [props.swipeDirections, position]);
	const invert = toast.invert || ToasterInvert;
	const disabled = toastType === "loading";
	offset.current = import_react.useMemo(() => heightIndex * gap + toastsHeightBefore, [heightIndex, toastsHeightBefore]);
	import_react.useEffect(() => {
		remainingTime.current = duration;
	}, [duration]);
	import_react.useEffect(() => {
		setMounted(true);
	}, []);
	import_react.useEffect(() => {
		const toastNode = toastRef.current;
		if (toastNode) {
			const height = toastNode.getBoundingClientRect().height;
			setInitialHeight(height);
			setHeights((h) => [{
				toastId: toast.id,
				height,
				position: toast.position
			}, ...h]);
			return () => setHeights((h) => h.filter((height) => height.toastId !== toast.id));
		}
	}, [setHeights, toast.id]);
	import_react.useLayoutEffect(() => {
		if (!mounted) return;
		const toastNode = toastRef.current;
		const originalHeight = toastNode.style.height;
		toastNode.style.height = "auto";
		const newHeight = toastNode.getBoundingClientRect().height;
		toastNode.style.height = originalHeight;
		setInitialHeight(newHeight);
		setHeights((heights) => {
			if (!heights.find((height) => height.toastId === toast.id)) return [{
				toastId: toast.id,
				height: newHeight,
				position: toast.position
			}, ...heights];
			else return heights.map((height) => height.toastId === toast.id ? {
				...height,
				height: newHeight
			} : height);
		});
	}, [
		mounted,
		toast.title,
		toast.description,
		setHeights,
		toast.id,
		toast.jsx,
		toast.action,
		toast.cancel
	]);
	const deleteToast = import_react.useCallback(() => {
		setRemoved(true);
		setOffsetBeforeRemove(offset.current);
		setHeights((h) => h.filter((height) => height.toastId !== toast.id));
		setTimeout(() => {
			removeToast(toast);
		}, TIME_BEFORE_UNMOUNT);
	}, [
		toast,
		removeToast,
		setHeights,
		offset
	]);
	import_react.useEffect(() => {
		if (toast.promise && toastType === "loading" || toast.duration === 1e400 || toast.type === "loading") return;
		let timeoutId;
		const pauseTimer = () => {
			if (lastCloseTimerStartTimeRef.current < closeTimerStartTimeRef.current) {
				const elapsedTime = (/* @__PURE__ */ new Date()).getTime() - closeTimerStartTimeRef.current;
				remainingTime.current = remainingTime.current - elapsedTime;
			}
			lastCloseTimerStartTimeRef.current = (/* @__PURE__ */ new Date()).getTime();
		};
		const startTimer = () => {
			if (remainingTime.current === 1e400) return;
			closeTimerStartTimeRef.current = (/* @__PURE__ */ new Date()).getTime();
			timeoutId = setTimeout(() => {
				toast.onAutoClose == null || toast.onAutoClose.call(toast, toast);
				deleteToast();
			}, remainingTime.current);
		};
		if (expanded || interacting || isDocumentHidden) pauseTimer();
		else startTimer();
		return () => clearTimeout(timeoutId);
	}, [
		expanded,
		interacting,
		toast,
		toastType,
		isDocumentHidden,
		deleteToast
	]);
	import_react.useEffect(() => {
		if (toast.delete) {
			deleteToast();
			toast.onDismiss == null || toast.onDismiss.call(toast, toast);
		}
	}, [deleteToast, toast.delete]);
	function getLoadingIcon() {
		var _toast_classNames;
		if (icons == null ? void 0 : icons.loading) {
			var _toast_classNames1;
			return /*#__PURE__*/ import_react.createElement("div", {
				className: cn(classNames == null ? void 0 : classNames.loader, toast == null ? void 0 : (_toast_classNames1 = toast.classNames) == null ? void 0 : _toast_classNames1.loader, "sonner-loader"),
				"data-visible": toastType === "loading"
			}, icons.loading);
		}
		return /*#__PURE__*/ import_react.createElement(Loader, {
			className: cn(classNames == null ? void 0 : classNames.loader, toast == null ? void 0 : (_toast_classNames = toast.classNames) == null ? void 0 : _toast_classNames.loader),
			visible: toastType === "loading"
		});
	}
	const icon = toast.icon || (icons == null ? void 0 : icons[toastType]) || getAsset(toastType);
	var _toast_richColors, _icons_close;
	return /*#__PURE__*/ import_react.createElement("li", {
		tabIndex: 0,
		ref: toastRef,
		className: cn(className, toastClassname, classNames == null ? void 0 : classNames.toast, toast == null ? void 0 : (_toast_classNames = toast.classNames) == null ? void 0 : _toast_classNames.toast, classNames == null ? void 0 : classNames[toastTypeKey], toast == null ? void 0 : (_toast_classNames1 = toast.classNames) == null ? void 0 : _toast_classNames1[toastTypeKey]),
		"data-sonner-toast": "",
		"data-rich-colors": (_toast_richColors = toast.richColors) != null ? _toast_richColors : defaultRichColors,
		"data-styled": !Boolean(toast.jsx || toast.unstyled || unstyled),
		"data-mounted": mounted,
		"data-promise": Boolean(toast.promise),
		"data-swiped": isSwiped,
		"data-removed": removed,
		"data-visible": isVisible,
		"data-y-position": y,
		"data-x-position": x,
		"data-index": index,
		"data-front": isFront,
		"data-swiping": swiping,
		"data-dismissible": dismissible,
		"data-type": toastType,
		"data-invert": invert,
		"data-swipe-out": swipeOut,
		"data-swipe-direction": swipeOutDirection,
		"data-expanded": Boolean(expanded || expandByDefault && mounted),
		"data-testid": toast.testId,
		style: {
			"--index": index,
			"--toasts-before": index,
			"--z-index": toasts.length - index,
			"--offset": `${removed ? offsetBeforeRemove : offset.current}px`,
			"--initial-height": expandByDefault ? "auto" : `${initialHeight}px`,
			...style,
			...toast.style
		},
		onDragEnd: () => {
			setSwiping(false);
			setSwipeDirection(null);
			pointerStartRef.current = null;
		},
		onPointerDown: (event) => {
			if (event.button === 2) return;
			if (disabled || !dismissible) return;
			dragStartTime.current = /* @__PURE__ */ new Date();
			setOffsetBeforeRemove(offset.current);
			event.target.setPointerCapture(event.pointerId);
			if (event.target.tagName === "BUTTON") return;
			setSwiping(true);
			pointerStartRef.current = {
				x: event.clientX,
				y: event.clientY
			};
		},
		onPointerUp: () => {
			var _toastRef_current, _toastRef_current1, _dragStartTime_current;
			if (swipeOut || !dismissible) return;
			pointerStartRef.current = null;
			const swipeAmountX = Number(((_toastRef_current = toastRef.current) == null ? void 0 : _toastRef_current.style.getPropertyValue("--swipe-amount-x").replace("px", "")) || 0);
			const swipeAmountY = Number(((_toastRef_current1 = toastRef.current) == null ? void 0 : _toastRef_current1.style.getPropertyValue("--swipe-amount-y").replace("px", "")) || 0);
			const timeTaken = (/* @__PURE__ */ new Date()).getTime() - ((_dragStartTime_current = dragStartTime.current) == null ? void 0 : _dragStartTime_current.getTime());
			const swipeAmount = swipeDirection === "x" ? swipeAmountX : swipeAmountY;
			const velocity = Math.abs(swipeAmount) / timeTaken;
			if ((swipeDirection === "x" ? swipeDirections.includes(swipeAmountX > 0 ? "right" : "left") : swipeDirections.includes(swipeAmountY > 0 ? "bottom" : "top")) && (Math.abs(swipeAmount) >= SWIPE_THRESHOLD || velocity > .11)) {
				setOffsetBeforeRemove(offset.current);
				toast.onDismiss == null || toast.onDismiss.call(toast, toast);
				if (swipeDirection === "x") setSwipeOutDirection(swipeAmountX > 0 ? "right" : "left");
				else setSwipeOutDirection(swipeAmountY > 0 ? "down" : "up");
				deleteToast();
				setSwipeOut(true);
				return;
			} else {
				var _toastRef_current2, _toastRef_current3;
				(_toastRef_current2 = toastRef.current) == null || _toastRef_current2.style.setProperty("--swipe-amount-x", `0px`);
				(_toastRef_current3 = toastRef.current) == null || _toastRef_current3.style.setProperty("--swipe-amount-y", `0px`);
			}
			setIsSwiped(false);
			setSwiping(false);
			setSwipeDirection(null);
		},
		onPointerMove: (event) => {
			var _window_getSelection, _toastRef_current, _toastRef_current1;
			if (!pointerStartRef.current || !dismissible) return;
			if (((_window_getSelection = window.getSelection()) == null ? void 0 : _window_getSelection.toString().length) > 0) return;
			const yDelta = event.clientY - pointerStartRef.current.y;
			const xDelta = event.clientX - pointerStartRef.current.x;
			if (!swipeDirection && (Math.abs(xDelta) > 1 || Math.abs(yDelta) > 1)) setSwipeDirection(Math.abs(xDelta) > Math.abs(yDelta) ? "x" : "y");
			let swipeAmount = {
				x: 0,
				y: 0
			};
			const getDampening = (delta) => {
				return 1 / (1.5 + Math.abs(delta) / 20);
			};
			if (swipeDirection === "y") {
				if (swipeDirections.includes("top") || swipeDirections.includes("bottom")) {
					if (swipeDirections.includes("top") && yDelta < 0 || swipeDirections.includes("bottom") && yDelta > 0) swipeAmount.y = yDelta;
					else {
						const dampenedDelta = yDelta * getDampening(yDelta);
						swipeAmount.y = Math.abs(dampenedDelta) < Math.abs(yDelta) ? dampenedDelta : yDelta;
					}
				}
			} else if (swipeDirection === "x") {
				if (swipeDirections.includes("left") || swipeDirections.includes("right")) {
					if (swipeDirections.includes("left") && xDelta < 0 || swipeDirections.includes("right") && xDelta > 0) swipeAmount.x = xDelta;
					else {
						const dampenedDelta = xDelta * getDampening(xDelta);
						swipeAmount.x = Math.abs(dampenedDelta) < Math.abs(xDelta) ? dampenedDelta : xDelta;
					}
				}
			}
			if (Math.abs(swipeAmount.x) > 0 || Math.abs(swipeAmount.y) > 0) setIsSwiped(true);
			(_toastRef_current = toastRef.current) == null || _toastRef_current.style.setProperty("--swipe-amount-x", `${swipeAmount.x}px`);
			(_toastRef_current1 = toastRef.current) == null || _toastRef_current1.style.setProperty("--swipe-amount-y", `${swipeAmount.y}px`);
		}
	}, closeButton && !toast.jsx && toastType !== "loading" ? /*#__PURE__*/ import_react.createElement("button", {
		"aria-label": closeButtonAriaLabel,
		"data-disabled": disabled,
		"data-close-button": true,
		onClick: disabled || !dismissible ? () => {} : () => {
			deleteToast();
			toast.onDismiss == null || toast.onDismiss.call(toast, toast);
		},
		className: cn(classNames == null ? void 0 : classNames.closeButton, toast == null ? void 0 : (_toast_classNames2 = toast.classNames) == null ? void 0 : _toast_classNames2.closeButton)
	}, (_icons_close = icons == null ? void 0 : icons.close) != null ? _icons_close : CloseIcon) : null, (toastType || toast.icon || toast.promise) && toast.icon !== null && ((icons == null ? void 0 : icons[toastType]) !== null || toast.icon) ? /*#__PURE__*/ import_react.createElement("div", {
		"data-icon": "",
		className: cn(classNames == null ? void 0 : classNames.icon, toast == null ? void 0 : (_toast_classNames3 = toast.classNames) == null ? void 0 : _toast_classNames3.icon)
	}, toastType === "loading" ? toast.icon || getLoadingIcon() : toast.promise ? getLoadingIcon() : null, toastType !== "loading" ? icon : null) : null, /*#__PURE__*/ import_react.createElement("div", {
		"data-content": "",
		className: cn(classNames == null ? void 0 : classNames.content, toast == null ? void 0 : (_toast_classNames4 = toast.classNames) == null ? void 0 : _toast_classNames4.content)
	}, /*#__PURE__*/ import_react.createElement("div", {
		"data-title": "",
		className: cn(classNames == null ? void 0 : classNames.title, toast == null ? void 0 : (_toast_classNames5 = toast.classNames) == null ? void 0 : _toast_classNames5.title)
	}, toast.jsx ? toast.jsx : typeof toast.title === "function" ? toast.title() : toast.title), toast.description ? /*#__PURE__*/ import_react.createElement("div", {
		"data-description": "",
		className: cn(descriptionClassName, toastDescriptionClassname, classNames == null ? void 0 : classNames.description, toast == null ? void 0 : (_toast_classNames6 = toast.classNames) == null ? void 0 : _toast_classNames6.description)
	}, typeof toast.description === "function" ? toast.description() : toast.description) : null), /*#__PURE__*/ import_react.isValidElement(toast.cancel) ? toast.cancel : toast.cancel && isAction(toast.cancel) ? /*#__PURE__*/ import_react.createElement("button", {
		"data-button": true,
		"data-cancel": true,
		style: toast.cancelButtonStyle || cancelButtonStyle,
		onClick: (event) => {
			if (!isAction(toast.cancel)) return;
			if (!dismissible) return;
			toast.cancel.onClick == null || toast.cancel.onClick.call(toast.cancel, event);
			deleteToast();
		},
		className: cn(classNames == null ? void 0 : classNames.cancelButton, toast == null ? void 0 : (_toast_classNames7 = toast.classNames) == null ? void 0 : _toast_classNames7.cancelButton)
	}, toast.cancel.label) : null, /*#__PURE__*/ import_react.isValidElement(toast.action) ? toast.action : toast.action && isAction(toast.action) ? /*#__PURE__*/ import_react.createElement("button", {
		"data-button": true,
		"data-action": true,
		style: toast.actionButtonStyle || actionButtonStyle,
		onClick: (event) => {
			if (!isAction(toast.action)) return;
			toast.action.onClick == null || toast.action.onClick.call(toast.action, event);
			if (event.defaultPrevented) return;
			deleteToast();
		},
		className: cn(classNames == null ? void 0 : classNames.actionButton, toast == null ? void 0 : (_toast_classNames8 = toast.classNames) == null ? void 0 : _toast_classNames8.actionButton)
	}, toast.action.label) : null);
};
function getDocumentDirection() {
	if (typeof window === "undefined") return "ltr";
	if (typeof document === "undefined") return "ltr";
	const dirAttribute = document.documentElement.getAttribute("dir");
	if (dirAttribute === "auto" || !dirAttribute) return window.getComputedStyle(document.documentElement).direction;
	return dirAttribute;
}
function assignOffset(defaultOffset, mobileOffset) {
	const styles = {};
	[defaultOffset, mobileOffset].forEach((offset, index) => {
		const isMobile = index === 1;
		const prefix = isMobile ? "--mobile-offset" : "--offset";
		const defaultValue = isMobile ? MOBILE_VIEWPORT_OFFSET : VIEWPORT_OFFSET;
		function assignAll(offset) {
			[
				"top",
				"right",
				"bottom",
				"left"
			].forEach((key) => {
				styles[`${prefix}-${key}`] = typeof offset === "number" ? `${offset}px` : offset;
			});
		}
		if (typeof offset === "number" || typeof offset === "string") assignAll(offset);
		else if (typeof offset === "object") [
			"top",
			"right",
			"bottom",
			"left"
		].forEach((key) => {
			if (offset[key] === void 0) styles[`${prefix}-${key}`] = defaultValue;
			else styles[`${prefix}-${key}`] = typeof offset[key] === "number" ? `${offset[key]}px` : offset[key];
		});
		else assignAll(defaultValue);
	});
	return styles;
}
var Toaster = /*#__PURE__*/ import_react.forwardRef(function Toaster(props, ref) {
	const { id, invert, position = "bottom-right", hotkey = ["altKey", "KeyT"], expand, closeButton, className, offset, mobileOffset, theme = "light", richColors, duration, style, visibleToasts = VISIBLE_TOASTS_AMOUNT, toastOptions, dir = getDocumentDirection(), gap = GAP, icons, customAriaLabel, containerAriaLabel = "Notifications" } = props;
	const [toasts, setToasts] = import_react.useState([]);
	const filteredToasts = import_react.useMemo(() => {
		if (id) return toasts.filter((toast) => toast.toasterId === id);
		return toasts.filter((toast) => !toast.toasterId);
	}, [toasts, id]);
	const possiblePositions = import_react.useMemo(() => {
		return Array.from(new Set([position].concat(filteredToasts.filter((toast) => toast.position).map((toast) => toast.position))));
	}, [filteredToasts, position]);
	const [heights, setHeights] = import_react.useState([]);
	const [expanded, setExpanded] = import_react.useState(false);
	const [interacting, setInteracting] = import_react.useState(false);
	const [actualTheme, setActualTheme] = import_react.useState(theme !== "system" ? theme : typeof window !== "undefined" ? window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : "light");
	const listRef = import_react.useRef(null);
	const hotkeyLabel = hotkey.join("+").replace(/Key/g, "").replace(/Digit/g, "");
	const lastFocusedElementRef = import_react.useRef(null);
	const isFocusWithinRef = import_react.useRef(false);
	const removeToast = import_react.useCallback((toastToRemove) => {
		setToasts((toasts) => {
			var _toasts_find;
			if (!((_toasts_find = toasts.find((toast) => toast.id === toastToRemove.id)) == null ? void 0 : _toasts_find.delete)) ToastState.dismiss(toastToRemove.id);
			return toasts.filter(({ id }) => id !== toastToRemove.id);
		});
	}, []);
	import_react.useEffect(() => {
		return ToastState.subscribe((toast) => {
			if (toast.dismiss) {
				requestAnimationFrame(() => {
					setToasts((toasts) => toasts.map((t) => t.id === toast.id ? {
						...t,
						delete: true
					} : t));
				});
				return;
			}
			setTimeout(() => {
				import_react_dom.flushSync(() => {
					setToasts((toasts) => {
						const indexOfExistingToast = toasts.findIndex((t) => t.id === toast.id);
						if (indexOfExistingToast !== -1) return [
							...toasts.slice(0, indexOfExistingToast),
							{
								...toasts[indexOfExistingToast],
								...toast
							},
							...toasts.slice(indexOfExistingToast + 1)
						];
						return [toast, ...toasts];
					});
				});
			});
		});
	}, []);
	import_react.useEffect(() => {
		if (theme !== "system") {
			setActualTheme(theme);
			return;
		}
		if (theme === "system") {
			if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) setActualTheme("dark");
			else setActualTheme("light");
		}
		if (typeof window === "undefined") return;
		const darkMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
		try {
			darkMediaQuery.addEventListener("change", ({ matches }) => {
				if (matches) setActualTheme("dark");
				else setActualTheme("light");
			});
		} catch (error) {
			darkMediaQuery.addListener(({ matches }) => {
				try {
					if (matches) setActualTheme("dark");
					else setActualTheme("light");
				} catch (e) {
					console.error(e);
				}
			});
		}
	}, [theme]);
	import_react.useEffect(() => {
		if (toasts.length <= 1) setExpanded(false);
	}, [toasts]);
	import_react.useEffect(() => {
		const handleKeyDown = (event) => {
			var _listRef_current;
			if (hotkey.length > 0 && hotkey.every((key) => event[key] || event.code === key)) {
				var _listRef_current1;
				setExpanded(true);
				(_listRef_current1 = listRef.current) == null || _listRef_current1.focus();
			}
			if (event.code === "Escape" && (document.activeElement === listRef.current || ((_listRef_current = listRef.current) == null ? void 0 : _listRef_current.contains(document.activeElement)))) setExpanded(false);
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [hotkey]);
	import_react.useEffect(() => {
		if (listRef.current) return () => {
			if (lastFocusedElementRef.current) {
				lastFocusedElementRef.current.focus({ preventScroll: true });
				lastFocusedElementRef.current = null;
				isFocusWithinRef.current = false;
			}
		};
	}, [listRef.current]);
	return /*#__PURE__*/ import_react.createElement("section", {
		ref,
		"aria-label": customAriaLabel != null ? customAriaLabel : `${containerAriaLabel} ${hotkeyLabel}`,
		tabIndex: -1,
		"aria-live": "polite",
		"aria-relevant": "additions text",
		"aria-atomic": "false",
		suppressHydrationWarning: true,
		"data-react-aria-top-layer": true
	}, possiblePositions.map((position, index) => {
		var _heights_;
		const [y, x] = position.split("-");
		if (!filteredToasts.length) return null;
		return /*#__PURE__*/ import_react.createElement("ol", {
			key: position,
			dir: dir === "auto" ? getDocumentDirection() : dir,
			tabIndex: -1,
			ref: listRef,
			className,
			"data-sonner-toaster": true,
			"data-sonner-theme": actualTheme,
			"data-y-position": y,
			"data-x-position": x,
			style: {
				"--front-toast-height": `${((_heights_ = heights[0]) == null ? void 0 : _heights_.height) || 0}px`,
				"--width": `${TOAST_WIDTH}px`,
				"--gap": `${gap}px`,
				...style,
				...assignOffset(offset, mobileOffset)
			},
			onBlur: (event) => {
				if (isFocusWithinRef.current && !event.currentTarget.contains(event.relatedTarget)) {
					isFocusWithinRef.current = false;
					if (lastFocusedElementRef.current) {
						lastFocusedElementRef.current.focus({ preventScroll: true });
						lastFocusedElementRef.current = null;
					}
				}
			},
			onFocus: (event) => {
				if (event.target instanceof HTMLElement && event.target.dataset.dismissible === "false") return;
				if (!isFocusWithinRef.current) {
					isFocusWithinRef.current = true;
					lastFocusedElementRef.current = event.relatedTarget;
				}
			},
			onMouseEnter: () => setExpanded(true),
			onMouseMove: () => setExpanded(true),
			onMouseLeave: () => {
				if (!interacting) setExpanded(false);
			},
			onDragEnd: () => setExpanded(false),
			onPointerDown: (event) => {
				if (event.target instanceof HTMLElement && event.target.dataset.dismissible === "false") return;
				setInteracting(true);
			},
			onPointerUp: () => setInteracting(false)
		}, filteredToasts.filter((toast) => !toast.position && index === 0 || toast.position === position).map((toast, index) => {
			var _toastOptions_duration, _toastOptions_closeButton;
			return /*#__PURE__*/ import_react.createElement(Toast, {
				key: toast.id,
				icons,
				index,
				toast,
				defaultRichColors: richColors,
				duration: (_toastOptions_duration = toastOptions == null ? void 0 : toastOptions.duration) != null ? _toastOptions_duration : duration,
				className: toastOptions == null ? void 0 : toastOptions.className,
				descriptionClassName: toastOptions == null ? void 0 : toastOptions.descriptionClassName,
				invert,
				visibleToasts,
				closeButton: (_toastOptions_closeButton = toastOptions == null ? void 0 : toastOptions.closeButton) != null ? _toastOptions_closeButton : closeButton,
				interacting,
				position,
				style: toastOptions == null ? void 0 : toastOptions.style,
				unstyled: toastOptions == null ? void 0 : toastOptions.unstyled,
				classNames: toastOptions == null ? void 0 : toastOptions.classNames,
				cancelButtonStyle: toastOptions == null ? void 0 : toastOptions.cancelButtonStyle,
				actionButtonStyle: toastOptions == null ? void 0 : toastOptions.actionButtonStyle,
				closeButtonAriaLabel: toastOptions == null ? void 0 : toastOptions.closeButtonAriaLabel,
				removeToast,
				toasts: filteredToasts.filter((t) => t.position == toast.position),
				heights: heights.filter((h) => h.position == toast.position),
				setHeights,
				expandByDefault: expand,
				gap,
				expanded,
				swipeDirections: props.swipeDirections
			});
		}));
	}));
});
// node_modules/@radix-ui/primitive/dist/index.mjs
var __defProp$14 = Object.defineProperty;
var __name$14 = (target, value) => __defProp$14(target, "name", {
	value,
	configurable: true
});
var canUseDOM = !!(typeof window !== "undefined" && window.document && window.document.createElement);
function composeEventHandlers(originalEventHandler, ourEventHandler, { checkForDefaultPrevented = true } = {}) {
	return /* @__PURE__ */ __name$14(function handleEvent(event) {
		originalEventHandler?.(event);
		if (checkForDefaultPrevented === false || !event || !event.defaultPrevented) return ourEventHandler?.(event);
	}, "handleEvent");
}
__name$14(composeEventHandlers, "composeEventHandlers");
function getOwnerWindow(element) {
	if (!canUseDOM) throw new Error("Cannot access window outside of the DOM");
	return element?.ownerDocument?.defaultView ?? window;
}
__name$14(getOwnerWindow, "getOwnerWindow");
function getOwnerDocument(element) {
	if (!canUseDOM) throw new Error("Cannot access document outside of the DOM");
	return element?.ownerDocument ?? document;
}
__name$14(getOwnerDocument, "getOwnerDocument");
function getActiveElement(node, activeDescendant = false) {
	const { activeElement } = getOwnerDocument(node);
	if (!activeElement?.nodeName) return null;
	if (isFrame(activeElement) && activeElement.contentDocument) return getActiveElement(activeElement.contentDocument.body, activeDescendant);
	if (activeDescendant) {
		const id = activeElement.getAttribute("aria-activedescendant");
		if (id) {
			const element = getOwnerDocument(activeElement).getElementById(id);
			if (element) return element;
		}
	}
	return activeElement;
}
__name$14(getActiveElement, "getActiveElement");
function isFrame(element) {
	return element.tagName === "IFRAME";
}
__name$14(isFrame, "isFrame");
// node_modules/@radix-ui/react-compose-refs/dist/index.mjs
var __defProp$13 = Object.defineProperty;
var __name$13 = (target, value) => __defProp$13(target, "name", {
	value,
	configurable: true
});
function setRef$3(ref, value) {
	if (typeof ref === "function") return ref(value);
	else if (ref !== null && ref !== void 0) ref.current = value;
}
__name$13(setRef$3, "setRef");
function composeRefs$1(...refs) {
	return (node) => {
		let hasCleanup = false;
		const cleanups = refs.map((ref) => {
			const cleanup = setRef$3(ref, node);
			if (!hasCleanup && typeof cleanup == "function") hasCleanup = true;
			return cleanup;
		});
		if (hasCleanup) return () => {
			for (let i = 0; i < cleanups.length; i++) {
				const cleanup = cleanups[i];
				if (typeof cleanup == "function") cleanup();
				else setRef$3(refs[i], null);
			}
		};
	};
}
__name$13(composeRefs$1, "composeRefs");
function useComposedRefs$1(...refs) {
	return import_react.useCallback(composeRefs$1(...refs), refs);
}
__name$13(useComposedRefs$1, "useComposedRefs");
// node_modules/@radix-ui/react-context/dist/index.mjs
var import_jsx_runtime = require_jsx_runtime();
var __defProp$12 = Object.defineProperty;
var __name$12 = (target, value) => __defProp$12(target, "name", {
	value,
	configurable: true
});
// @__NO_SIDE_EFFECTS__
function createContext2(rootComponentName, defaultContext) {
	const Context = import_react.createContext(defaultContext);
	Context.displayName = rootComponentName + "Context";
	const Provider = /* @__PURE__ */ __name$12((props) => {
		const { children, ...context } = props;
		const value = import_react.useMemo(() => context, Object.values(context));
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Context.Provider, {
			value,
			children
		});
	}, "Provider");
	Provider.displayName = rootComponentName + "Provider";
	function useContext2(consumerName, options = {}) {
		const { optional = false } = options;
		const context = import_react.useContext(Context);
		if (context) return context;
		if (defaultContext !== void 0) return defaultContext;
		if (optional) return void 0;
		throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
	}
	__name$12(useContext2, "useContext");
	return [Provider, useContext2];
}
__name$12(createContext2, "createContext");
// @__NO_SIDE_EFFECTS__
function createContextScope(scopeName, createContextScopeDeps = []) {
	let defaultContexts = [];
	function createContext3(rootComponentName, defaultContext) {
		const BaseContext = import_react.createContext(defaultContext);
		BaseContext.displayName = rootComponentName + "Context";
		const index = defaultContexts.length;
		defaultContexts = [...defaultContexts, defaultContext];
		const Provider = /* @__PURE__ */ __name$12((props) => {
			const { scope, children, ...context } = props;
			const Context = scope?.[scopeName]?.[index] || BaseContext;
			const value = import_react.useMemo(() => context, Object.values(context));
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Context.Provider, {
				value,
				children
			});
		}, "Provider");
		Provider.displayName = rootComponentName + "Provider";
		function useContext2(consumerName, scope, options = {}) {
			const { optional = false } = options;
			const Context = scope?.[scopeName]?.[index] || BaseContext;
			const context = import_react.useContext(Context);
			if (context) return context;
			if (defaultContext !== void 0) return defaultContext;
			if (optional) return void 0;
			throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
		}
		__name$12(useContext2, "useContext");
		return [Provider, useContext2];
	}
	__name$12(createContext3, "createContext");
	const createScope = /* @__PURE__ */ __name$12(() => {
		const scopeContexts = defaultContexts.map((defaultContext) => {
			return import_react.createContext(defaultContext);
		});
		return /* @__PURE__ */ __name$12(function useScope(scope) {
			const contexts = scope?.[scopeName] || scopeContexts;
			return import_react.useMemo(() => ({ [`__scope${scopeName}`]: {
				...scope,
				[scopeName]: contexts
			} }), [scope, contexts]);
		}, "useScope");
	}, "createScope");
	createScope.scopeName = scopeName;
	return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
__name$12(createContextScope, "createContextScope");
function composeContextScopes(...scopes) {
	const baseScope = scopes[0];
	if (scopes.length === 1) return baseScope;
	const createScope = /* @__PURE__ */ __name$12(() => {
		const scopeHooks = scopes.map((createScope2) => ({
			useScope: createScope2(),
			scopeName: createScope2.scopeName
		}));
		return /* @__PURE__ */ __name$12(function useComposedScopes(overrideScopes) {
			const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
				const currentScope = useScope(overrideScopes)[`__scope${scopeName}`];
				return {
					...nextScopes2,
					...currentScope
				};
			}, {});
			return import_react.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
		}, "useComposedScopes");
	}, "createScope");
	createScope.scopeName = baseScope.scopeName;
	return createScope;
}
__name$12(composeContextScopes, "composeContextScopes");
// node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
var useLayoutEffect2 = globalThis?.document ? import_react.useLayoutEffect : () => {};
// node_modules/@radix-ui/react-id/dist/index.mjs
var __defProp$11 = Object.defineProperty;
var __name$11 = (target, value) => __defProp$11(target, "name", {
	value,
	configurable: true
});
var useReactId = import_react[" useId ".trim().toString()] || (() => void 0);
var count$1 = 0;
function useId(deterministicId) {
	const [id, setId] = import_react.useState(useReactId());
	useLayoutEffect2(() => {
		if (!deterministicId) setId((reactId) => reactId ?? String(count$1++));
	}, [deterministicId]);
	return deterministicId || (id ? `radix-${id}` : "");
}
__name$11(useId, "useId");
// node_modules/@radix-ui/react-use-effect-event/dist/index.mjs
var __defProp$10 = Object.defineProperty;
var __name$10 = (target, value) => __defProp$10(target, "name", {
	value,
	configurable: true
});
var useReactEffectEvent = import_react[" useEffectEvent ".trim().toString()];
var useReactInsertionEffect$1 = import_react[" useInsertionEffect ".trim().toString()];
function useEffectEvent(callback) {
	if (typeof useReactEffectEvent === "function") return useReactEffectEvent(callback);
	const ref = import_react.useRef(() => {
		throw new Error("Cannot call an event handler while rendering.");
	});
	if (typeof useReactInsertionEffect$1 === "function") useReactInsertionEffect$1(() => {
		ref.current = callback;
	});
	else useLayoutEffect2(() => {
		ref.current = callback;
	});
	return import_react.useMemo(() => ((...args) => ref.current?.(...args)), []);
}
__name$10(useEffectEvent, "useEffectEvent");
// node_modules/@radix-ui/react-use-controllable-state/dist/index.mjs
var __defProp$9 = Object.defineProperty;
var __name$9 = (target, value) => __defProp$9(target, "name", {
	value,
	configurable: true
});
var useInsertionEffect = import_react[" useInsertionEffect ".trim().toString()] || useLayoutEffect2;
function useControllableState$1({ prop, defaultProp, onChange = /* @__PURE__ */ __name$9(() => {}, "onChange"), caller }) {
	const [uncontrolledProp, setUncontrolledProp, onChangeRef] = useUncontrolledState$1({
		defaultProp,
		onChange
	});
	const isControlled = prop !== void 0;
	return [isControlled ? prop : uncontrolledProp, import_react.useCallback((nextValue) => {
		if (isControlled) {
			const value2 = isFunction(nextValue) ? nextValue(prop) : nextValue;
			if (value2 !== prop) onChangeRef.current?.(value2);
		} else setUncontrolledProp(nextValue);
	}, [
		isControlled,
		prop,
		setUncontrolledProp,
		onChangeRef
	])];
}
__name$9(useControllableState$1, "useControllableState");
function useUncontrolledState$1({ defaultProp, onChange }) {
	const [value, setValue] = import_react.useState(defaultProp);
	const prevValueRef = import_react.useRef(value);
	const onChangeRef = import_react.useRef(onChange);
	useInsertionEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);
	import_react.useEffect(() => {
		if (prevValueRef.current !== value) {
			onChangeRef.current?.(value);
			prevValueRef.current = value;
		}
	}, [value, prevValueRef]);
	return [
		value,
		setValue,
		onChangeRef
	];
}
__name$9(useUncontrolledState$1, "useUncontrolledState");
function isFunction(value) {
	return typeof value === "function";
}
__name$9(isFunction, "isFunction");
var SYNC_STATE = Symbol("RADIX:SYNC_STATE");
function useControllableStateReducer(reducer, userArgs, initialArg, init) {
	const { prop: controlledState, defaultProp, onChange: onChangeProp, caller } = userArgs;
	const isControlled = controlledState !== void 0;
	const onChange = useEffectEvent(onChangeProp);
	const args = [{
		...initialArg,
		state: defaultProp
	}];
	if (init) args.push(init);
	const [internalState, dispatch] = import_react.useReducer((state2, action) => {
		if (action.type === SYNC_STATE) return {
			...state2,
			state: action.state
		};
		const next = reducer(state2, action);
		if (isControlled && !Object.is(next.state, state2.state)) onChange(next.state);
		return next;
	}, ...args);
	const uncontrolledState = internalState.state;
	const prevValueRef = import_react.useRef(uncontrolledState);
	import_react.useEffect(() => {
		if (prevValueRef.current !== uncontrolledState) {
			prevValueRef.current = uncontrolledState;
			if (!isControlled) onChange(uncontrolledState);
		}
	}, [
		uncontrolledState,
		prevValueRef,
		isControlled
	]);
	const state = import_react.useMemo(() => {
		if (controlledState !== void 0) return {
			...internalState,
			state: controlledState
		};
		return internalState;
	}, [internalState, controlledState]);
	import_react.useEffect(() => {
		if (isControlled && !Object.is(controlledState, internalState.state)) dispatch({
			type: SYNC_STATE,
			state: controlledState
		});
	}, [
		controlledState,
		internalState.state,
		isControlled
	]);
	return [state, dispatch];
}
__name$9(useControllableStateReducer, "useControllableStateReducer");
// node_modules/@radix-ui/react-slot/dist/index.mjs
var __defProp$8 = Object.defineProperty;
var __name$8 = (target, value) => __defProp$8(target, "name", {
	value,
	configurable: true
});
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
	const Slot2 = import_react.forwardRef((props, forwardedRef) => {
		let { children, ...slotProps } = props;
		let slottableElement = null;
		let hasSlottable = false;
		const newChildren = [];
		children = useUnwrappedLazy(children);
		import_react.Children.forEach(children, (maybeSlottable) => {
			if (isSlottable(maybeSlottable)) {
				hasSlottable = true;
				const slottable = maybeSlottable;
				let child = "child" in slottable.props ? slottable.props.child : slottable.props.children;
				while (isLazyComponent(child) && typeof use === "function") child = use(child._payload);
				slottableElement = getSlottableElementFromSlottable(slottable, child);
				newChildren.push(slottableElement?.props?.children);
			} else newChildren.push(maybeSlottable);
		});
		if (slottableElement) slottableElement = import_react.cloneElement(slottableElement, void 0, newChildren);
		else if (!hasSlottable && import_react.Children.count(children) === 1 && import_react.isValidElement(children)) slottableElement = children;
		const slottableElementRef = slottableElement ? getElementRef$1(slottableElement) : void 0;
		const composedRef = useComposedRefs$1(forwardedRef, slottableElementRef);
		if (!slottableElement) {
			if (children || children === 0) throw new Error(hasSlottable ? createSlottableError(ownerName) : createSlotError(ownerName));
			return children;
		}
		const mergedProps = mergeProps$1(slotProps, slottableElement.props ?? {});
		if (slottableElement.type !== import_react.Fragment) mergedProps.ref = forwardedRef ? composedRef : slottableElementRef;
		return import_react.cloneElement(slottableElement, mergedProps);
	});
	Slot2.displayName = `${ownerName}.Slot`;
	return Slot2;
}
__name$8(createSlot, "createSlot");
var SLOTTABLE_IDENTIFIER = Symbol.for("radix.slottable");
// @__NO_SIDE_EFFECTS__
function createSlottable(ownerName) {
	const Slottable2 = /* @__PURE__ */ __name$8((props) => "child" in props ? props.children(props.child) : props.children, "Slottable");
	Slottable2.displayName = `${ownerName}.Slottable`;
	Slottable2.__radixId = SLOTTABLE_IDENTIFIER;
	return Slottable2;
}
__name$8(createSlottable, "createSlottable");
var getSlottableElementFromSlottable = /* @__PURE__ */ __name$8((slottable, child) => {
	if ("child" in slottable.props) {
		if (!import_react.isValidElement(child)) return null;
		return import_react.cloneElement(child, void 0, slottable.props.children(child.props.children));
	}
	return import_react.isValidElement(child) ? child : null;
}, "getSlottableElementFromSlottable");
function mergeProps$1(slotProps, childProps) {
	const overrideProps = { ...childProps };
	for (const propName in childProps) {
		const slotPropValue = slotProps[propName];
		const childPropValue = childProps[propName];
		if (/^on[A-Z]/.test(propName)) {
			if (slotPropValue && childPropValue) overrideProps[propName] = (...args) => {
				const result = childPropValue(...args);
				slotPropValue(...args);
				return result;
			};
			else if (slotPropValue) overrideProps[propName] = slotPropValue;
		} else if (propName === "style") overrideProps[propName] = {
			...slotPropValue,
			...childPropValue
		};
		else if (propName === "className") overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
		else if (propName === "aria-describedby") overrideProps[propName] = concatAriaDescribedby$1(childPropValue, slotPropValue);
	}
	return {
		...slotProps,
		...overrideProps
	};
}
__name$8(mergeProps$1, "mergeProps");
function getElementRef$1(element) {
	let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
	let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
	if (mayWarn) return element.ref;
	getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
	mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
	if (mayWarn) return element.props.ref;
	return element.props.ref || element.ref;
}
__name$8(getElementRef$1, "getElementRef");
function isSlottable(child) {
	return import_react.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
__name$8(isSlottable, "isSlottable");
var REACT_LAZY_TYPE = Symbol.for("react.lazy");
function isLazyComponent(element) {
	return element != null && typeof element === "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
}
__name$8(isLazyComponent, "isLazyComponent");
function isPromiseLike(value) {
	return typeof value === "object" && value !== null && "then" in value;
}
__name$8(isPromiseLike, "isPromiseLike");
function useUnwrappedLazy(value) {
	let unwrapped = value;
	while (isLazyComponent(unwrapped) && typeof use === "function") unwrapped = use(unwrapped._payload);
	return unwrapped;
}
__name$8(useUnwrappedLazy, "useUnwrappedLazy");
function concatAriaDescribedby$1(...values) {
	const ids = /* @__PURE__ */ new Set();
	for (const value of values) {
		if (typeof value !== "string") continue;
		for (const id of String(value).trim().split(/\s+/)) if (id) ids.add(id);
	}
	return ids.size > 0 ? Array.from(ids).join(" ") : void 0;
}
__name$8(concatAriaDescribedby$1, "concatAriaDescribedby");
var createSlotError = /* @__PURE__ */ __name$8((ownerName) => {
	return `${ownerName} failed to slot onto its children. Expected a single React element child or \`Slottable\`.`;
}, "createSlotError");
var createSlottableError = /* @__PURE__ */ __name$8((ownerName) => {
	return `${ownerName} failed to slot onto its \`Slottable\`. Expected \`Slottable\` to receive a single React element child.`;
}, "createSlottableError");
var use = import_react[" use ".trim().toString()];
// node_modules/@radix-ui/react-primitive/dist/index.mjs
var __defProp$7 = Object.defineProperty;
var __name$7 = (target, value) => __defProp$7(target, "name", {
	value,
	configurable: true
});
var Primitive = [
	"a",
	"button",
	"div",
	"form",
	"h2",
	"h3",
	"img",
	"input",
	"label",
	"li",
	"nav",
	"ol",
	"p",
	"select",
	"span",
	"svg",
	"ul"
].reduce((primitive, node) => {
	const Slot = /* @__PURE__ */ createSlot(`Primitive.${node}`);
	const Node = import_react.forwardRef((props, forwardedRef) => {
		const { asChild, ...primitiveProps } = props;
		const Comp = asChild ? Slot : node;
		if (typeof window !== "undefined") window[Symbol.for("radix-ui")] = true;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Comp, {
			...primitiveProps,
			ref: forwardedRef
		});
	});
	Node.displayName = `Primitive.${node}`;
	return {
		...primitive,
		[node]: Node
	};
}, {});
function dispatchDiscreteCustomEvent(target, event) {
	if (target) import_react_dom.flushSync(() => target.dispatchEvent(event));
}
__name$7(dispatchDiscreteCustomEvent, "dispatchDiscreteCustomEvent");
// node_modules/@radix-ui/react-use-callback-ref/dist/index.mjs
var __defProp$6 = Object.defineProperty;
var __name$6 = (target, value) => __defProp$6(target, "name", {
	value,
	configurable: true
});
var useReactInsertionEffect = import_react[" useInsertionEffect ".trim().toString()];
function useCallbackRef$2(callback) {
	const callbackRef = import_react.useRef(callback);
	if (typeof useReactInsertionEffect === "function") useReactInsertionEffect(() => {
		callbackRef.current = callback;
	});
	else useLayoutEffect2(() => {
		callbackRef.current = callback;
	});
	return import_react.useMemo(() => ((...args) => callbackRef.current?.(...args)), []);
}
__name$6(useCallbackRef$2, "useCallbackRef");
// node_modules/@radix-ui/react-dismissable-layer/dist/index.mjs
var __defProp$5 = Object.defineProperty;
var __name$5 = (target, value) => __defProp$5(target, "name", {
	value,
	configurable: true
});
var CONTEXT_UPDATE = "dismissableLayer.update";
var POINTER_DOWN_OUTSIDE = "dismissableLayer.pointerDownOutside";
var FOCUS_OUTSIDE = "dismissableLayer.focusOutside";
var originalBodyPointerEvents;
var DismissableLayerContext = import_react.createContext({
	layers: /* @__PURE__ */ new Set(),
	layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
	branches: /* @__PURE__ */ new Set(),
	dismissableSurfaces: /* @__PURE__ */ new Set()
});
var DismissableLayer = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$5(function DismissableLayer2(props, forwardedRef) {
	const { disableOutsidePointerEvents = false, deferPointerDownOutside = false, onEscapeKeyDown, onPointerDownOutside, onFocusOutside, onInteractOutside, onDismiss, ...layerProps } = props;
	const context = import_react.useContext(DismissableLayerContext);
	const [node, setNode] = import_react.useState(null);
	const ownerDocument = node?.ownerDocument ?? globalThis?.document;
	const [, force] = import_react.useState({});
	const composedRefs = useComposedRefs$1(forwardedRef, setNode);
	const layers = Array.from(context.layers);
	const [highestLayerWithOutsidePointerEventsDisabled] = [...context.layersWithOutsidePointerEventsDisabled].slice(-1);
	const highestLayerWithOutsidePointerEventsDisabledIndex = highestLayerWithOutsidePointerEventsDisabled ? layers.indexOf(highestLayerWithOutsidePointerEventsDisabled) : -1;
	const index = node ? layers.indexOf(node) : -1;
	const isBodyPointerEventsDisabled = context.layersWithOutsidePointerEventsDisabled.size > 0;
	const isPointerEventsEnabled = index >= highestLayerWithOutsidePointerEventsDisabledIndex;
	const isDeferredPointerDownOutsideRef = import_react.useRef(false);
	const pointerDownOutside = usePointerDownOutside((event) => {
		onPointerDownOutside?.(event);
		onInteractOutside?.(event);
		if (!event.defaultPrevented) onDismiss?.();
	}, {
		ownerDocument,
		deferPointerDownOutside,
		isDeferredPointerDownOutsideRef,
		dismissableSurfaces: context.dismissableSurfaces,
		shouldHandlePointerDownOutside: import_react.useCallback((target) => {
			if (!(target instanceof Node)) return false;
			const isPointerDownOnBranch = [...context.branches].some((branch) => branch.contains(target));
			return isPointerEventsEnabled && !isPointerDownOnBranch;
		}, [context.branches, isPointerEventsEnabled])
	});
	const focusOutside = useFocusOutside((event) => {
		if (deferPointerDownOutside && isDeferredPointerDownOutsideRef.current) return;
		const target = event.target;
		if ([...context.branches].some((branch) => branch.contains(target))) return;
		onFocusOutside?.(event);
		onInteractOutside?.(event);
		if (!event.defaultPrevented) onDismiss?.();
	}, ownerDocument);
	const isHighestLayer = node ? index === layers.length - 1 : false;
	const handleKeyDown = useCallbackRef$2((event) => {
		if (event.key !== "Escape") return;
		onEscapeKeyDown?.(event);
		if (!event.defaultPrevented && onDismiss) {
			event.preventDefault();
			onDismiss();
		}
	});
	import_react.useEffect(() => {
		if (!isHighestLayer) return;
		ownerDocument.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => ownerDocument.removeEventListener("keydown", handleKeyDown, { capture: true });
	}, [
		ownerDocument,
		isHighestLayer,
		handleKeyDown
	]);
	import_react.useEffect(() => {
		if (!node) return;
		if (disableOutsidePointerEvents) {
			if (context.layersWithOutsidePointerEventsDisabled.size === 0) {
				originalBodyPointerEvents = ownerDocument.body.style.pointerEvents;
				ownerDocument.body.style.pointerEvents = "none";
			}
			context.layersWithOutsidePointerEventsDisabled.add(node);
		}
		context.layers.add(node);
		dispatchUpdate();
		return () => {
			if (disableOutsidePointerEvents) {
				context.layersWithOutsidePointerEventsDisabled.delete(node);
				if (context.layersWithOutsidePointerEventsDisabled.size === 0) ownerDocument.body.style.pointerEvents = originalBodyPointerEvents;
			}
		};
	}, [
		node,
		ownerDocument,
		disableOutsidePointerEvents,
		context
	]);
	import_react.useEffect(() => {
		return () => {
			if (!node) return;
			context.layers.delete(node);
			context.layersWithOutsidePointerEventsDisabled.delete(node);
			dispatchUpdate();
		};
	}, [node, context]);
	import_react.useEffect(() => {
		const handleUpdate = /* @__PURE__ */ __name$5(() => force({}), "handleUpdate");
		document.addEventListener(CONTEXT_UPDATE, handleUpdate);
		return () => document.removeEventListener(CONTEXT_UPDATE, handleUpdate);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
		...layerProps,
		ref: composedRefs,
		style: {
			pointerEvents: isBodyPointerEventsDisabled ? isPointerEventsEnabled ? "auto" : "none" : void 0,
			...props.style
		},
		onFocusCapture: composeEventHandlers(props.onFocusCapture, focusOutside.onFocusCapture),
		onBlurCapture: composeEventHandlers(props.onBlurCapture, focusOutside.onBlurCapture),
		onPointerDownCapture: composeEventHandlers(props.onPointerDownCapture, pointerDownOutside.onPointerDownCapture)
	});
}, "DismissableLayer"));
function useDismissableLayerSurface() {
	const context = import_react.useContext(DismissableLayerContext);
	const [node, setNode] = import_react.useState(null);
	import_react.useEffect(() => {
		if (!node) return;
		context.dismissableSurfaces.add(node);
		return () => {
			context.dismissableSurfaces.delete(node);
		};
	}, [node, context.dismissableSurfaces]);
	return setNode;
}
__name$5(useDismissableLayerSurface, "useDismissableLayerSurface");
var IS_TRUE = /* @__PURE__ */ __name$5(() => true, "IS_TRUE");
function usePointerDownOutside(onPointerDownOutside, args) {
	const { ownerDocument = globalThis?.document, deferPointerDownOutside = false, isDeferredPointerDownOutsideRef, dismissableSurfaces, shouldHandlePointerDownOutside = IS_TRUE } = args;
	const handlePointerDownOutside = useCallbackRef$2(onPointerDownOutside);
	const isPointerInsideReactTreeRef = import_react.useRef(false);
	const isPointerDownOutsideRef = import_react.useRef(false);
	const interceptedOutsideInteractionEventsRef = import_react.useRef(/* @__PURE__ */ new Map());
	const handleClickRef = import_react.useRef(() => {});
	import_react.useEffect(() => {
		function resetOutsideInteraction() {
			isPointerDownOutsideRef.current = false;
			isDeferredPointerDownOutsideRef.current = false;
			interceptedOutsideInteractionEventsRef.current.clear();
		}
		__name$5(resetOutsideInteraction, "resetOutsideInteraction");
		function isOutsideInteractionIntercepted() {
			return Array.from(interceptedOutsideInteractionEventsRef.current.values()).some(Boolean);
		}
		__name$5(isOutsideInteractionIntercepted, "isOutsideInteractionIntercepted");
		function handleInteractionCapture(event) {
			if (!isPointerDownOutsideRef.current) return;
			const target = event.target;
			if (!(target instanceof Node && [...dismissableSurfaces].some((surface) => surface.contains(target)))) interceptedOutsideInteractionEventsRef.current.set(event.type, true);
			if (event.type === "click") window.setTimeout(() => {
				if (isPointerDownOutsideRef.current) handleClickRef.current();
			}, 0);
		}
		__name$5(handleInteractionCapture, "handleInteractionCapture");
		function handleInteractionBubble(event) {
			if (isPointerDownOutsideRef.current) interceptedOutsideInteractionEventsRef.current.set(event.type, false);
		}
		__name$5(handleInteractionBubble, "handleInteractionBubble");
		const handlePointerDown = /* @__PURE__ */ __name$5((event) => {
			if (event.target && !isPointerInsideReactTreeRef.current) {
				let handleAndDispatchPointerDownOutsideEvent2 = function() {
					ownerDocument.removeEventListener("click", handleClickRef.current);
					const wasOutsideInteractionIntercepted = isOutsideInteractionIntercepted();
					resetOutsideInteraction();
					if (!wasOutsideInteractionIntercepted) handleAndDispatchCustomEvent(POINTER_DOWN_OUTSIDE, handlePointerDownOutside, eventDetail, { discrete: true });
				};
				__name$5(handleAndDispatchPointerDownOutsideEvent2, "handleAndDispatchPointerDownOutsideEvent");
				if (!shouldHandlePointerDownOutside(event.target)) {
					ownerDocument.removeEventListener("click", handleClickRef.current);
					resetOutsideInteraction();
					isPointerInsideReactTreeRef.current = false;
					return;
				}
				const eventDetail = { originalEvent: event };
				isPointerDownOutsideRef.current = true;
				isDeferredPointerDownOutsideRef.current = deferPointerDownOutside && event.button === 0;
				interceptedOutsideInteractionEventsRef.current.clear();
				if (!deferPointerDownOutside || event.button !== 0) handleAndDispatchPointerDownOutsideEvent2();
				else {
					ownerDocument.removeEventListener("click", handleClickRef.current);
					handleClickRef.current = handleAndDispatchPointerDownOutsideEvent2;
					ownerDocument.addEventListener("click", handleClickRef.current, { once: true });
				}
			} else {
				ownerDocument.removeEventListener("click", handleClickRef.current);
				resetOutsideInteraction();
			}
			isPointerInsideReactTreeRef.current = false;
		}, "handlePointerDown");
		const outsideInteractionEvents = [
			"pointerup",
			"mousedown",
			"mouseup",
			"touchstart",
			"touchend",
			"click"
		];
		for (const eventName of outsideInteractionEvents) {
			ownerDocument.addEventListener(eventName, handleInteractionCapture, true);
			ownerDocument.addEventListener(eventName, handleInteractionBubble);
		}
		const timerId = window.setTimeout(() => {
			ownerDocument.addEventListener("pointerdown", handlePointerDown);
		}, 0);
		return () => {
			window.clearTimeout(timerId);
			ownerDocument.removeEventListener("pointerdown", handlePointerDown);
			ownerDocument.removeEventListener("click", handleClickRef.current);
			for (const eventName of outsideInteractionEvents) {
				ownerDocument.removeEventListener(eventName, handleInteractionCapture, true);
				ownerDocument.removeEventListener(eventName, handleInteractionBubble);
			}
		};
	}, [
		ownerDocument,
		handlePointerDownOutside,
		deferPointerDownOutside,
		isDeferredPointerDownOutsideRef,
		dismissableSurfaces,
		shouldHandlePointerDownOutside
	]);
	return { onPointerDownCapture: /* @__PURE__ */ __name$5(() => isPointerInsideReactTreeRef.current = true, "onPointerDownCapture") };
}
__name$5(usePointerDownOutside, "usePointerDownOutside");
function useFocusOutside(onFocusOutside, ownerDocument = globalThis?.document) {
	const handleFocusOutside = useCallbackRef$2(onFocusOutside);
	const isFocusInsideReactTreeRef = import_react.useRef(false);
	import_react.useEffect(() => {
		const handleFocus = /* @__PURE__ */ __name$5((event) => {
			if (event.target && !isFocusInsideReactTreeRef.current) handleAndDispatchCustomEvent(FOCUS_OUTSIDE, handleFocusOutside, { originalEvent: event }, { discrete: false });
		}, "handleFocus");
		ownerDocument.addEventListener("focusin", handleFocus);
		return () => ownerDocument.removeEventListener("focusin", handleFocus);
	}, [ownerDocument, handleFocusOutside]);
	return {
		onFocusCapture: /* @__PURE__ */ __name$5(() => isFocusInsideReactTreeRef.current = true, "onFocusCapture"),
		onBlurCapture: /* @__PURE__ */ __name$5(() => isFocusInsideReactTreeRef.current = false, "onBlurCapture")
	};
}
__name$5(useFocusOutside, "useFocusOutside");
function dispatchUpdate() {
	const event = new CustomEvent(CONTEXT_UPDATE);
	document.dispatchEvent(event);
}
__name$5(dispatchUpdate, "dispatchUpdate");
function handleAndDispatchCustomEvent(name, handler, detail, { discrete }) {
	const target = detail.originalEvent.target;
	const event = new CustomEvent(name, {
		bubbles: false,
		cancelable: true,
		detail
	});
	if (handler) target.addEventListener(name, handler, { once: true });
	if (discrete) dispatchDiscreteCustomEvent(target, event);
	else target.dispatchEvent(event);
}
__name$5(handleAndDispatchCustomEvent, "handleAndDispatchCustomEvent");
// node_modules/@radix-ui/react-focus-scope/dist/index.mjs
var __defProp$4 = Object.defineProperty;
var __name$4 = (target, value) => __defProp$4(target, "name", {
	value,
	configurable: true
});
var AUTOFOCUS_ON_MOUNT = "focusScope.autoFocusOnMount";
var AUTOFOCUS_ON_UNMOUNT = "focusScope.autoFocusOnUnmount";
var EVENT_OPTIONS = {
	bubbles: false,
	cancelable: true
};
var FocusScope = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$4(function FocusScope2(props, forwardedRef) {
	const { loop = false, trapped = false, branches, onMountAutoFocus: onMountAutoFocusProp, onUnmountAutoFocus: onUnmountAutoFocusProp, ...scopeProps } = props;
	const [container, setContainer] = import_react.useState(null);
	const onMountAutoFocus = useCallbackRef$2(onMountAutoFocusProp);
	const onUnmountAutoFocus = useCallbackRef$2(onUnmountAutoFocusProp);
	const lastFocusedElementRef = import_react.useRef(null);
	const composedRefs = useComposedRefs$1(forwardedRef, setContainer);
	const branchesRef = import_react.useRef(branches);
	import_react.useEffect(() => {
		branchesRef.current = branches;
	});
	const isTargetInScope = import_react.useCallback((target) => {
		if (!target) return false;
		if (container?.contains(target)) return true;
		return Boolean(branchesRef.current?.some((branch) => branch.contains(target)));
	}, [container]);
	const focusScope = import_react.useRef({
		paused: false,
		pause() {
			this.paused = true;
		},
		resume() {
			this.paused = false;
		}
	}).current;
	import_react.useEffect(() => {
		if (trapped) {
			let handleFocusIn2 = function(event) {
				if (focusScope.paused || !container) return;
				const target = event.target;
				if (isTargetInScope(target)) lastFocusedElementRef.current = target;
				else focus(lastFocusedElementRef.current, { select: true });
			}, handleFocusOut2 = function(event) {
				if (focusScope.paused || !container) return;
				const relatedTarget = event.relatedTarget;
				if (relatedTarget === null) return;
				if (!isTargetInScope(relatedTarget)) focus(lastFocusedElementRef.current, { select: true });
			}, handleMutations2 = function(mutations) {
				if (document.activeElement !== document.body) return;
				for (const mutation of mutations) if (mutation.removedNodes.length > 0) focus(container);
			};
			__name$4(handleFocusIn2, "handleFocusIn");
			__name$4(handleFocusOut2, "handleFocusOut");
			__name$4(handleMutations2, "handleMutations");
			document.addEventListener("focusin", handleFocusIn2);
			document.addEventListener("focusout", handleFocusOut2);
			const mutationObserver = new MutationObserver(handleMutations2);
			if (container) mutationObserver.observe(container, {
				childList: true,
				subtree: true
			});
			return () => {
				document.removeEventListener("focusin", handleFocusIn2);
				document.removeEventListener("focusout", handleFocusOut2);
				mutationObserver.disconnect();
			};
		}
	}, [
		trapped,
		container,
		focusScope.paused,
		isTargetInScope
	]);
	import_react.useEffect(() => {
		if (container) {
			focusScopesStack.add(focusScope);
			const previouslyFocusedElement = document.activeElement;
			if (!container.contains(previouslyFocusedElement)) {
				const mountEvent = new CustomEvent(AUTOFOCUS_ON_MOUNT, EVENT_OPTIONS);
				container.addEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
				container.dispatchEvent(mountEvent);
				if (!mountEvent.defaultPrevented) {
					focusFirst(removeLinks(getTabbableCandidates(container)), { select: true });
					if (document.activeElement === previouslyFocusedElement) focus(container);
				}
			}
			return () => {
				container.removeEventListener(AUTOFOCUS_ON_MOUNT, onMountAutoFocus);
				const ownerDocument = container.ownerDocument;
				const UnmountEvent = CustomEvent;
				setTimeout(() => {
					const unmountEvent = new UnmountEvent(AUTOFOCUS_ON_UNMOUNT, EVENT_OPTIONS);
					container.addEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
					container.dispatchEvent(unmountEvent);
					if (!unmountEvent.defaultPrevented) focus(previouslyFocusedElement ?? ownerDocument.body, { select: true });
					container.removeEventListener(AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);
					focusScopesStack.remove(focusScope);
				}, 0);
			};
		}
	}, [
		container,
		onMountAutoFocus,
		onUnmountAutoFocus,
		focusScope
	]);
	const handleKeyDown = import_react.useCallback((event) => {
		if (!loop && !trapped) return;
		if (focusScope.paused) return;
		const isTabKey = event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey;
		const focusedElement = document.activeElement;
		if (isTabKey && focusedElement) {
			const container2 = event.currentTarget;
			const [first, last] = getTabbableEdges(container2);
			if (!(first && last)) {
				if (focusedElement === container2) event.preventDefault();
			} else if (!event.shiftKey && focusedElement === last) {
				event.preventDefault();
				if (loop) focus(first, { select: true });
			} else if (event.shiftKey && focusedElement === first) {
				event.preventDefault();
				if (loop) focus(last, { select: true });
			}
		}
	}, [
		loop,
		trapped,
		focusScope.paused
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
		tabIndex: -1,
		...scopeProps,
		ref: composedRefs,
		onKeyDown: handleKeyDown
	});
}, "FocusScope"));
var FocusScopeBranchContext = import_react.createContext(null);
function FocusScopeBranchProvider({ registry, children }) {
	if (!registry) return children;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusScopeBranchContext.Provider, {
		value: registry,
		children
	});
}
__name$4(FocusScopeBranchProvider, "FocusScopeBranchProvider");
function useFocusScopeBranchRegistry() {
	const [nodes, setNodes] = import_react.useState([]);
	return {
		nodes,
		registry: import_react.useMemo(() => ({
			add: /* @__PURE__ */ __name$4((node) => setNodes((prev) => prev.includes(node) ? prev : [...prev, node]), "add"),
			remove: /* @__PURE__ */ __name$4((node) => setNodes((prev) => prev.filter((current) => current !== node)), "remove")
		}), [])
	};
}
__name$4(useFocusScopeBranchRegistry, "useFocusScopeBranchRegistry");
function useFocusScopeBranch(node) {
	const registry = import_react.useContext(FocusScopeBranchContext);
	import_react.useEffect(() => {
		if (!node || !registry) return;
		registry.add(node);
		return () => registry.remove(node);
	}, [node, registry]);
}
__name$4(useFocusScopeBranch, "useFocusScopeBranch");
function focusFirst(candidates, { select = false } = {}) {
	const previouslyFocusedElement = document.activeElement;
	for (const candidate of candidates) {
		focus(candidate, { select });
		if (document.activeElement !== previouslyFocusedElement) return;
	}
}
__name$4(focusFirst, "focusFirst");
function getTabbableEdges(container) {
	const candidates = getTabbableCandidates(container);
	return [findVisible(candidates, container), findVisible(candidates.reverse(), container)];
}
__name$4(getTabbableEdges, "getTabbableEdges");
function getTabbableCandidates(container) {
	const nodes = [];
	const walker = container.ownerDocument.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, { acceptNode: /* @__PURE__ */ __name$4((node) => {
		const isHiddenInput = node.tagName === "INPUT" && node.type === "hidden";
		if (node.disabled || node.hidden || isHiddenInput) return NodeFilter.FILTER_SKIP;
		return node.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
	}, "acceptNode") });
	while (walker.nextNode()) nodes.push(walker.currentNode);
	return nodes;
}
__name$4(getTabbableCandidates, "getTabbableCandidates");
function findVisible(elements, container) {
	const canUseCheckVisibility = typeof container.checkVisibility === "function" && container.checkVisibility({ checkVisibilityCSS: true });
	for (const element of elements) if (!(canUseCheckVisibility ? !element.checkVisibility({ checkVisibilityCSS: true }) : isHidden$1(element, { upTo: container }))) return element;
}
__name$4(findVisible, "findVisible");
function isHidden$1(node, { upTo }) {
	if (getComputedStyle(node).visibility === "hidden") return true;
	while (node) {
		if (upTo !== void 0 && node === upTo) return false;
		if (getComputedStyle(node).display === "none") return true;
		node = node.parentElement;
	}
	return false;
}
__name$4(isHidden$1, "isHidden");
function isSelectableInput(element) {
	return element.tagName === "INPUT" && typeof element.select === "function";
}
__name$4(isSelectableInput, "isSelectableInput");
function focus(element, { select = false } = {}) {
	if (element && element.focus) {
		const previouslyFocusedElement = (element.ownerDocument ?? document).activeElement;
		element.focus({ preventScroll: true });
		if (element !== previouslyFocusedElement && isSelectableInput(element) && select) element.select();
	}
}
__name$4(focus, "focus");
var focusScopesStack = createFocusScopesStack();
function createFocusScopesStack() {
	let stack = [];
	return {
		add(focusScope) {
			const activeFocusScope = stack[0];
			if (focusScope !== activeFocusScope) activeFocusScope?.pause();
			stack = arrayRemove(stack, focusScope);
			stack.unshift(focusScope);
		},
		remove(focusScope) {
			stack = arrayRemove(stack, focusScope);
			stack[0]?.resume();
		}
	};
}
__name$4(createFocusScopesStack, "createFocusScopesStack");
function arrayRemove(array, item) {
	const updatedArray = [...array];
	const index = updatedArray.indexOf(item);
	if (index !== -1) updatedArray.splice(index, 1);
	return updatedArray;
}
__name$4(arrayRemove, "arrayRemove");
function removeLinks(items) {
	return items.filter((item) => item.tagName !== "A");
}
__name$4(removeLinks, "removeLinks");
// node_modules/@radix-ui/react-portal/dist/index.mjs
var __defProp$3 = Object.defineProperty;
var __name$3 = (target, value) => __defProp$3(target, "name", {
	value,
	configurable: true
});
var Portal$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name$3(function Portal2(props, forwardedRef) {
	const { container: containerProp, ...portalProps } = props;
	const [mounted, setMounted] = import_react.useState(false);
	useLayoutEffect2(() => setMounted(true), []);
	const container = containerProp || mounted && globalThis?.document?.body;
	return container ? import_react_dom.createPortal(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
		...portalProps,
		ref: forwardedRef
	}), container) : null;
}, "Portal"));
// node_modules/@radix-ui/react-presence/dist/index.mjs
var __defProp$2 = Object.defineProperty;
var __name$2 = (target, value) => __defProp$2(target, "name", {
	value,
	configurable: true
});
function useStateMachine(initialState, machine) {
	return import_react.useReducer((state, event) => {
		return machine[state][event] ?? state;
	}, initialState);
}
__name$2(useStateMachine, "useStateMachine");
var Presence = /* @__PURE__ */ __name$2((props) => {
	const { present, children } = props;
	const presence = usePresence(present);
	const child = typeof children === "function" ? children({ present: presence.isPresent }) : import_react.Children.only(children);
	const ref = useStableComposedRefs(presence.ref, getElementRef(child));
	return typeof children === "function" || presence.isPresent ? import_react.cloneElement(child, { ref }) : null;
}, "Presence");
function usePresence(present) {
	const [node, setNode] = import_react.useState();
	const stylesRef = import_react.useRef(null);
	const prevPresentRef = import_react.useRef(present);
	const prevAnimationNameRef = import_react.useRef("none");
	const mountAnimationNameRef = import_react.useRef(void 0);
	const [state, send] = useStateMachine(present ? "mounted" : "unmounted", {
		mounted: {
			UNMOUNT: "unmounted",
			ANIMATION_OUT: "unmountSuspended"
		},
		unmountSuspended: {
			MOUNT: "mounted",
			ANIMATION_END: "unmounted"
		},
		unmounted: { MOUNT: "mounted" }
	});
	import_react.useEffect(() => {
		if (state === "mounted") {
			prevAnimationNameRef.current = mountAnimationNameRef.current ?? getAnimationName(stylesRef.current);
			mountAnimationNameRef.current = void 0;
		} else prevAnimationNameRef.current = "none";
	}, [state]);
	useLayoutEffect2(() => {
		const styles = stylesRef.current;
		const wasPresent = prevPresentRef.current;
		if (wasPresent !== present) {
			const prevAnimationName = prevAnimationNameRef.current;
			const currentAnimationName = getAnimationName(styles);
			if (present) {
				mountAnimationNameRef.current = currentAnimationName;
				send("MOUNT");
			} else if (currentAnimationName === "none" || styles?.display === "none") send("UNMOUNT");
			else if (wasPresent && prevAnimationName !== currentAnimationName) send("ANIMATION_OUT");
			else send("UNMOUNT");
			prevPresentRef.current = present;
		}
	}, [present, send]);
	useLayoutEffect2(() => {
		if (node) {
			let timeoutId;
			const ownerWindow = node.ownerDocument.defaultView ?? window;
			const handleAnimationEnd = /* @__PURE__ */ __name$2((event) => {
				const isCurrentAnimation = getAnimationName(stylesRef.current).includes(CSS.escape(event.animationName));
				if (event.target === node && isCurrentAnimation) {
					send("ANIMATION_END");
					if (!prevPresentRef.current) {
						const currentFillMode = node.style.animationFillMode;
						node.style.animationFillMode = "forwards";
						timeoutId = ownerWindow.setTimeout(() => {
							if (node.style.animationFillMode === "forwards") node.style.animationFillMode = currentFillMode;
						});
					}
				}
			}, "handleAnimationEnd");
			const handleAnimationStart = /* @__PURE__ */ __name$2((event) => {
				if (event.target === node) prevAnimationNameRef.current = getAnimationName(stylesRef.current);
			}, "handleAnimationStart");
			node.addEventListener("animationstart", handleAnimationStart);
			node.addEventListener("animationcancel", handleAnimationEnd);
			node.addEventListener("animationend", handleAnimationEnd);
			return () => {
				ownerWindow.clearTimeout(timeoutId);
				node.removeEventListener("animationstart", handleAnimationStart);
				node.removeEventListener("animationcancel", handleAnimationEnd);
				node.removeEventListener("animationend", handleAnimationEnd);
			};
		} else send("ANIMATION_END");
	}, [node, send]);
	return {
		isPresent: ["mounted", "unmountSuspended"].includes(state),
		ref: import_react.useCallback((node2) => {
			if (node2) {
				const styles = getComputedStyle(node2);
				stylesRef.current = styles;
				mountAnimationNameRef.current = getAnimationName(styles);
			} else stylesRef.current = null;
			setNode(node2);
		}, [])
	};
}
__name$2(usePresence, "usePresence");
function setRef$2(ref, value) {
	if (typeof ref === "function") return ref(value);
	else if (ref !== null && ref !== void 0) ref.current = value;
}
__name$2(setRef$2, "setRef");
function useStableComposedRefs(...refs) {
	const refsRef = import_react.useRef(refs);
	refsRef.current = refs;
	return import_react.useCallback((node) => {
		const currentRefs = refsRef.current;
		let hasCleanup = false;
		const cleanups = currentRefs.map((ref) => {
			const cleanup = setRef$2(ref, node);
			if (!hasCleanup && typeof cleanup === "function") hasCleanup = true;
			return cleanup;
		});
		if (hasCleanup) return () => {
			for (let i = 0; i < cleanups.length; i++) {
				const cleanup = cleanups[i];
				if (typeof cleanup === "function") cleanup();
				else setRef$2(currentRefs[i], null);
			}
		};
	}, []);
}
__name$2(useStableComposedRefs, "useStableComposedRefs");
function getAnimationName(styles) {
	return styles?.animationName || "none";
}
__name$2(getAnimationName, "getAnimationName");
function getElementRef(element) {
	let getter = Object.getOwnPropertyDescriptor(element.props, "ref")?.get;
	let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
	if (mayWarn) return element.ref;
	getter = Object.getOwnPropertyDescriptor(element, "ref")?.get;
	mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
	if (mayWarn) return element.props.ref;
	return element.props.ref || element.ref;
}
__name$2(getElementRef, "getElementRef");
// node_modules/@radix-ui/react-focus-guards/dist/index.mjs
var __defProp$1 = Object.defineProperty;
var __name$1 = (target, value) => __defProp$1(target, "name", {
	value,
	configurable: true
});
var count = 0;
var guards = null;
function FocusGuards(props) {
	useFocusGuards();
	return props.children;
}
__name$1(FocusGuards, "FocusGuards");
function useFocusGuards() {
	import_react.useEffect(() => {
		if (!guards) guards = {
			start: createFocusGuard(),
			end: createFocusGuard()
		};
		const { start, end } = guards;
		if (document.body.firstElementChild !== start) document.body.insertAdjacentElement("afterbegin", start);
		if (document.body.lastElementChild !== end) document.body.insertAdjacentElement("beforeend", end);
		count++;
		return () => {
			if (count === 1) {
				guards?.start.remove();
				guards?.end.remove();
				guards = null;
			}
			count = Math.max(0, count - 1);
		};
	}, []);
}
__name$1(useFocusGuards, "useFocusGuards");
function createFocusGuard() {
	const element = document.createElement("span");
	element.setAttribute("data-radix-focus-guard", "");
	element.tabIndex = 0;
	element.style.outline = "none";
	element.style.opacity = "0";
	element.style.position = "fixed";
	element.style.pointerEvents = "none";
	return element;
}
__name$1(createFocusGuard, "createFocusGuard");
// node_modules/tslib/tslib.es6.mjs
var __assign = function() {
	__assign = Object.assign || function __assign(t) {
		for (var s, i = 1, n = arguments.length; i < n; i++) {
			s = arguments[i];
			for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
		}
		return t;
	};
	return __assign.apply(this, arguments);
};
function __rest(s, e) {
	var t = {};
	for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0) t[p] = s[p];
	if (s != null && typeof Object.getOwnPropertySymbols === "function") {
		for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i])) t[p[i]] = s[p[i]];
	}
	return t;
}
function __spreadArray(to, from, pack) {
	if (pack || arguments.length === 2) {
		for (var i = 0, l = from.length, ar; i < l; i++) if (ar || !(i in from)) {
			if (!ar) ar = Array.prototype.slice.call(from, 0, i);
			ar[i] = from[i];
		}
	}
	return to.concat(ar || Array.prototype.slice.call(from));
}
// node_modules/react-remove-scroll-bar/dist/es2015/constants.js
var zeroRightClassName = "right-scroll-bar-position";
var fullWidthClassName = "width-before-scroll-bar";
var noScrollbarsClassName = "with-scroll-bars-hidden";
/**
* Name of a CSS variable containing the amount of "hidden" scrollbar
* ! might be undefined ! use will fallback!
*/
var removedBarSizeVariable = "--removed-body-scroll-bar-size";
// node_modules/use-callback-ref/dist/es2015/assignRef.js
/**
* Assigns a value for a given ref, no matter of the ref format
* @param {RefObject} ref - a callback function or ref object
* @param value - a new value
*
* @see https://github.com/theKashey/use-callback-ref#assignref
* @example
* const refObject = useRef();
* const refFn = (ref) => {....}
*
* assignRef(refObject, "refValue");
* assignRef(refFn, "refValue");
*/
function assignRef(ref, value) {
	if (typeof ref === "function") ref(value);
	else if (ref) ref.current = value;
	return ref;
}
// node_modules/use-callback-ref/dist/es2015/useRef.js
/**
* creates a MutableRef with ref change callback
* @param initialValue - initial ref value
* @param {Function} callback - a callback to run when value changes
*
* @example
* const ref = useCallbackRef(0, (newValue, oldValue) => console.log(oldValue, '->', newValue);
* ref.current = 1;
* // prints 0 -> 1
*
* @see https://reactjs.org/docs/hooks-reference.html#useref
* @see https://github.com/theKashey/use-callback-ref#usecallbackref---to-replace-reactuseref
* @returns {MutableRefObject}
*/
function useCallbackRef$1(initialValue, callback) {
	var ref = (0, import_react.useState)(function() {
		return {
			value: initialValue,
			callback,
			facade: {
				get current() {
					return ref.value;
				},
				set current(value) {
					var last = ref.value;
					if (last !== value) {
						ref.value = value;
						ref.callback(value, last);
					}
				}
			}
		};
	})[0];
	ref.callback = callback;
	return ref.facade;
}
// node_modules/use-callback-ref/dist/es2015/useMergeRef.js
var useIsomorphicLayoutEffect$1 = typeof window !== "undefined" ? import_react.useLayoutEffect : import_react.useEffect;
var currentValues = /* @__PURE__ */ new WeakMap();
/**
* Merges two or more refs together providing a single interface to set their value
* @param {RefObject|Ref} refs
* @returns {MutableRefObject} - a new ref, which translates all changes to {refs}
*
* @see {@link mergeRefs} a version without buit-in memoization
* @see https://github.com/theKashey/use-callback-ref#usemergerefs
* @example
* const Component = React.forwardRef((props, ref) => {
*   const ownRef = useRef();
*   const domRef = useMergeRefs([ref, ownRef]); // 👈 merge together
*   return <div ref={domRef}>...</div>
* }
*/
function useMergeRefs(refs, defaultValue) {
	var callbackRef = useCallbackRef$1(defaultValue || null, function(newValue) {
		return refs.forEach(function(ref) {
			return assignRef(ref, newValue);
		});
	});
	useIsomorphicLayoutEffect$1(function() {
		var oldValue = currentValues.get(callbackRef);
		if (oldValue) {
			var prevRefs_1 = new Set(oldValue);
			var nextRefs_1 = new Set(refs);
			var current_1 = callbackRef.current;
			prevRefs_1.forEach(function(ref) {
				if (!nextRefs_1.has(ref)) assignRef(ref, null);
			});
			nextRefs_1.forEach(function(ref) {
				if (!prevRefs_1.has(ref)) assignRef(ref, current_1);
			});
		}
		currentValues.set(callbackRef, refs);
	}, [refs]);
	return callbackRef;
}
// node_modules/use-sidecar/dist/es2015/medium.js
function ItoI(a) {
	return a;
}
function innerCreateMedium(defaults, middleware) {
	if (middleware === void 0) middleware = ItoI;
	var buffer = [];
	var assigned = false;
	return {
		read: function() {
			if (assigned) throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
			if (buffer.length) return buffer[buffer.length - 1];
			return defaults;
		},
		useMedium: function(data) {
			var item = middleware(data, assigned);
			buffer.push(item);
			return function() {
				buffer = buffer.filter(function(x) {
					return x !== item;
				});
			};
		},
		assignSyncMedium: function(cb) {
			assigned = true;
			while (buffer.length) {
				var cbs = buffer;
				buffer = [];
				cbs.forEach(cb);
			}
			buffer = {
				push: function(x) {
					return cb(x);
				},
				filter: function() {
					return buffer;
				}
			};
		},
		assignMedium: function(cb) {
			assigned = true;
			var pendingQueue = [];
			if (buffer.length) {
				var cbs = buffer;
				buffer = [];
				cbs.forEach(cb);
				pendingQueue = buffer;
			}
			var executeQueue = function() {
				var cbs = pendingQueue;
				pendingQueue = [];
				cbs.forEach(cb);
			};
			var cycle = function() {
				return Promise.resolve().then(executeQueue);
			};
			cycle();
			buffer = {
				push: function(x) {
					pendingQueue.push(x);
					cycle();
				},
				filter: function(filter) {
					pendingQueue = pendingQueue.filter(filter);
					return buffer;
				}
			};
		}
	};
}
function createSidecarMedium(options) {
	if (options === void 0) options = {};
	var medium = innerCreateMedium(null);
	medium.options = __assign({
		async: true,
		ssr: false
	}, options);
	return medium;
}
// node_modules/use-sidecar/dist/es2015/exports.js
var SideCar = function(_a) {
	var sideCar = _a.sideCar, rest = __rest(_a, ["sideCar"]);
	if (!sideCar) throw new Error("Sidecar: please provide `sideCar` property to import the right car");
	var Target = sideCar.read();
	if (!Target) throw new Error("Sidecar medium not found");
	return import_react.createElement(Target, __assign({}, rest));
};
SideCar.isSideCarExport = true;
function exportSidecar(medium, exported) {
	medium.useMedium(exported);
	return SideCar;
}
// node_modules/react-remove-scroll/dist/es2015/medium.js
var effectCar = createSidecarMedium();
// node_modules/react-remove-scroll/dist/es2015/UI.js
var nothing = function() {};
/**
* Removes scrollbar from the page and contain the scroll within the Lock
*/
var RemoveScroll = import_react.forwardRef(function(props, parentRef) {
	var ref = import_react.useRef(null);
	var _a = import_react.useState({
		onScrollCapture: nothing,
		onWheelCapture: nothing,
		onTouchMoveCapture: nothing
	}), callbacks = _a[0], setCallbacks = _a[1];
	var forwardProps = props.forwardProps, children = props.children, className = props.className, removeScrollBar = props.removeScrollBar, enabled = props.enabled, shards = props.shards, sideCar = props.sideCar, noRelative = props.noRelative, noIsolation = props.noIsolation, inert = props.inert, allowPinchZoom = props.allowPinchZoom, _b = props.as, Container = _b === void 0 ? "div" : _b, gapMode = props.gapMode, rest = __rest(props, [
		"forwardProps",
		"children",
		"className",
		"removeScrollBar",
		"enabled",
		"shards",
		"sideCar",
		"noRelative",
		"noIsolation",
		"inert",
		"allowPinchZoom",
		"as",
		"gapMode"
	]);
	var SideCar = sideCar;
	var containerRef = useMergeRefs([ref, parentRef]);
	var containerProps = __assign(__assign({}, rest), callbacks);
	return import_react.createElement(import_react.Fragment, null, enabled && import_react.createElement(SideCar, {
		sideCar: effectCar,
		removeScrollBar,
		shards,
		noRelative,
		noIsolation,
		inert,
		setCallbacks,
		allowPinchZoom: !!allowPinchZoom,
		lockRef: ref,
		gapMode
	}), forwardProps ? import_react.cloneElement(import_react.Children.only(children), __assign(__assign({}, containerProps), { ref: containerRef })) : import_react.createElement(Container, __assign({}, containerProps, {
		className,
		ref: containerRef
	}), children));
});
RemoveScroll.defaultProps = {
	enabled: true,
	removeScrollBar: true,
	inert: false
};
RemoveScroll.classNames = {
	fullWidth: fullWidthClassName,
	zeroRight: zeroRightClassName
};
var getNonce = function() {
	if (typeof __webpack_nonce__ !== "undefined") return __webpack_nonce__;
};
// node_modules/react-style-singleton/dist/es2015/singleton.js
function makeStyleTag() {
	if (!document) return null;
	var tag = document.createElement("style");
	tag.type = "text/css";
	var nonce = getNonce();
	if (nonce) tag.setAttribute("nonce", nonce);
	return tag;
}
function injectStyles(tag, css) {
	if (tag.styleSheet) tag.styleSheet.cssText = css;
	else tag.appendChild(document.createTextNode(css));
}
function insertStyleTag(tag) {
	(document.head || document.getElementsByTagName("head")[0]).appendChild(tag);
}
var stylesheetSingleton = function() {
	var counter = 0;
	var stylesheet = null;
	return {
		add: function(style) {
			if (counter == 0) {
				if (stylesheet = makeStyleTag()) {
					injectStyles(stylesheet, style);
					insertStyleTag(stylesheet);
				}
			}
			counter++;
		},
		remove: function() {
			counter--;
			if (!counter && stylesheet) {
				stylesheet.parentNode && stylesheet.parentNode.removeChild(stylesheet);
				stylesheet = null;
			}
		}
	};
};
// node_modules/react-style-singleton/dist/es2015/hook.js
/**
* creates a hook to control style singleton
* @see {@link styleSingleton} for a safer component version
* @example
* ```tsx
* const useStyle = styleHookSingleton();
* ///
* useStyle('body { overflow: hidden}');
*/
var styleHookSingleton = function() {
	var sheet = stylesheetSingleton();
	return function(styles, isDynamic) {
		import_react.useEffect(function() {
			sheet.add(styles);
			return function() {
				sheet.remove();
			};
		}, [styles && isDynamic]);
	};
};
// node_modules/react-style-singleton/dist/es2015/component.js
/**
* create a Component to add styles on demand
* - styles are added when first instance is mounted
* - styles are removed when the last instance is unmounted
* - changing styles in runtime does nothing unless dynamic is set. But with multiple components that can lead to the undefined behavior
*/
var styleSingleton = function() {
	var useStyle = styleHookSingleton();
	var Sheet = function(_a) {
		useStyle(_a.styles, _a.dynamic);
		return null;
	};
	return Sheet;
};
// node_modules/react-remove-scroll-bar/dist/es2015/utils.js
var zeroGap = {
	left: 0,
	top: 0,
	right: 0,
	gap: 0
};
var parse = function(x) {
	return parseInt(x || "", 10) || 0;
};
var getOffset = function(gapMode) {
	var cs = window.getComputedStyle(document.body);
	var left = cs[gapMode === "padding" ? "paddingLeft" : "marginLeft"];
	var top = cs[gapMode === "padding" ? "paddingTop" : "marginTop"];
	var right = cs[gapMode === "padding" ? "paddingRight" : "marginRight"];
	return [
		parse(left),
		parse(top),
		parse(right)
	];
};
var getGapWidth = function(gapMode) {
	if (gapMode === void 0) gapMode = "margin";
	if (typeof window === "undefined") return zeroGap;
	var offsets = getOffset(gapMode);
	var documentWidth = document.documentElement.clientWidth;
	var windowWidth = window.innerWidth;
	return {
		left: offsets[0],
		top: offsets[1],
		right: offsets[2],
		gap: Math.max(0, windowWidth - documentWidth + offsets[2] - offsets[0])
	};
};
// node_modules/react-remove-scroll-bar/dist/es2015/component.js
var Style = styleSingleton();
var lockAttribute = "data-scroll-locked";
var getStyles = function(_a, allowRelative, gapMode, important) {
	var left = _a.left, top = _a.top, right = _a.right, gap = _a.gap;
	if (gapMode === void 0) gapMode = "margin";
	return "\n  .".concat(noScrollbarsClassName, " {\n   overflow: hidden ").concat(important, ";\n   padding-right: ").concat(gap, "px ").concat(important, ";\n  }\n  body[").concat(lockAttribute, "] {\n    overflow: hidden ").concat(important, ";\n    overscroll-behavior: contain;\n    ").concat([
		allowRelative && "position: relative ".concat(important, ";"),
		gapMode === "margin" && "\n    padding-left: ".concat(left, "px;\n    padding-top: ").concat(top, "px;\n    padding-right: ").concat(right, "px;\n    margin-left:0;\n    margin-top:0;\n    margin-right: ").concat(gap, "px ").concat(important, ";\n    "),
		gapMode === "padding" && "padding-right: ".concat(gap, "px ").concat(important, ";")
	].filter(Boolean).join(""), "\n  }\n  \n  .").concat(zeroRightClassName, " {\n    right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(fullWidthClassName, " {\n    margin-right: ").concat(gap, "px ").concat(important, ";\n  }\n  \n  .").concat(zeroRightClassName, " .").concat(zeroRightClassName, " {\n    right: 0 ").concat(important, ";\n  }\n  \n  .").concat(fullWidthClassName, " .").concat(fullWidthClassName, " {\n    margin-right: 0 ").concat(important, ";\n  }\n  \n  body[").concat(lockAttribute, "] {\n    ").concat(removedBarSizeVariable, ": ").concat(gap, "px;\n  }\n");
};
var getCurrentUseCounter = function() {
	var counter = parseInt(document.body.getAttribute("data-scroll-locked") || "0", 10);
	return isFinite(counter) ? counter : 0;
};
var useLockAttribute = function() {
	import_react.useEffect(function() {
		document.body.setAttribute(lockAttribute, (getCurrentUseCounter() + 1).toString());
		return function() {
			var newCounter = getCurrentUseCounter() - 1;
			if (newCounter <= 0) document.body.removeAttribute(lockAttribute);
			else document.body.setAttribute(lockAttribute, newCounter.toString());
		};
	}, []);
};
/**
* Removes page scrollbar and blocks page scroll when mounted
*/
var RemoveScrollBar = function(_a) {
	var noRelative = _a.noRelative, noImportant = _a.noImportant, _b = _a.gapMode, gapMode = _b === void 0 ? "margin" : _b;
	useLockAttribute();
	var gap = import_react.useMemo(function() {
		return getGapWidth(gapMode);
	}, [gapMode]);
	return import_react.createElement(Style, { styles: getStyles(gap, !noRelative, gapMode, !noImportant ? "!important" : "") });
};
// node_modules/react-remove-scroll/dist/es2015/aggresiveCapture.js
var passiveSupported = false;
if (typeof window !== "undefined") try {
	var options = Object.defineProperty({}, "passive", { get: function() {
		passiveSupported = true;
		return true;
	} });
	window.addEventListener("test", options, options);
	window.removeEventListener("test", options, options);
} catch (err) {
	passiveSupported = false;
}
var nonPassive = passiveSupported ? { passive: false } : false;
// node_modules/react-remove-scroll/dist/es2015/handleScroll.js
var alwaysContainsScroll = function(node) {
	return node.tagName === "TEXTAREA";
};
var elementCanBeScrolled = function(node, overflow) {
	if (!(node instanceof Element)) return false;
	var styles = window.getComputedStyle(node);
	return styles[overflow] !== "hidden" && !(styles.overflowY === styles.overflowX && !alwaysContainsScroll(node) && styles[overflow] === "visible");
};
var elementCouldBeVScrolled = function(node) {
	return elementCanBeScrolled(node, "overflowY");
};
var elementCouldBeHScrolled = function(node) {
	return elementCanBeScrolled(node, "overflowX");
};
var locationCouldBeScrolled = function(axis, node) {
	var ownerDocument = node.ownerDocument;
	var current = node;
	do {
		if (typeof ShadowRoot !== "undefined" && current instanceof ShadowRoot) current = current.host;
		if (elementCouldBeScrolled(axis, current)) {
			var _a = getScrollVariables(axis, current);
			if (_a[1] > _a[2]) return true;
		}
		current = current.parentNode;
	} while (current && current !== ownerDocument.body);
	return false;
};
var getVScrollVariables = function(_a) {
	return [
		_a.scrollTop,
		_a.scrollHeight,
		_a.clientHeight
	];
};
var getHScrollVariables = function(_a) {
	return [
		_a.scrollLeft,
		_a.scrollWidth,
		_a.clientWidth
	];
};
var elementCouldBeScrolled = function(axis, node) {
	return axis === "v" ? elementCouldBeVScrolled(node) : elementCouldBeHScrolled(node);
};
var getScrollVariables = function(axis, node) {
	return axis === "v" ? getVScrollVariables(node) : getHScrollVariables(node);
};
var getDirectionFactor = function(axis, direction) {
	/**
	* If the element's direction is rtl (right-to-left), then scrollLeft is 0 when the scrollbar is at its rightmost position,
	* and then increasingly negative as you scroll towards the end of the content.
	* @see https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollLeft
	*/
	return axis === "h" && direction === "rtl" ? -1 : 1;
};
var handleScroll = function(axis, endTarget, event, sourceDelta, noOverscroll) {
	var directionFactor = getDirectionFactor(axis, window.getComputedStyle(endTarget).direction);
	var delta = directionFactor * sourceDelta;
	var target = event.target;
	var targetInLock = endTarget.contains(target);
	var shouldCancelScroll = false;
	var isDeltaPositive = delta > 0;
	var availableScroll = 0;
	var availableScrollTop = 0;
	do {
		if (!target) break;
		var _a = getScrollVariables(axis, target), position = _a[0];
		var elementScroll = _a[1] - _a[2] - directionFactor * position;
		if (position || elementScroll) {
			if (elementCouldBeScrolled(axis, target)) {
				availableScroll += elementScroll;
				availableScrollTop += position;
			}
		}
		var parent_1 = target.parentNode;
		target = parent_1 && parent_1.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? parent_1.host : parent_1;
	} while (!targetInLock && target !== document.body || targetInLock && (endTarget.contains(target) || endTarget === target));
	if (isDeltaPositive && (noOverscroll && Math.abs(availableScroll) < 1 || !noOverscroll && delta > availableScroll)) shouldCancelScroll = true;
	else if (!isDeltaPositive && (noOverscroll && Math.abs(availableScrollTop) < 1 || !noOverscroll && -delta > availableScrollTop)) shouldCancelScroll = true;
	return shouldCancelScroll;
};
// node_modules/react-remove-scroll/dist/es2015/SideEffect.js
var getTouchXY = function(event) {
	return "changedTouches" in event ? [event.changedTouches[0].clientX, event.changedTouches[0].clientY] : [0, 0];
};
var getDeltaXY = function(event) {
	return [event.deltaX, event.deltaY];
};
var extractRef = function(ref) {
	return ref && "current" in ref ? ref.current : ref;
};
var deltaCompare = function(x, y) {
	return x[0] === y[0] && x[1] === y[1];
};
var generateStyle = function(id) {
	return "\n  .block-interactivity-".concat(id, " {pointer-events: none;}\n  .allow-interactivity-").concat(id, " {pointer-events: all;}\n");
};
var idCounter = 0;
var lockStack = [];
function RemoveScrollSideCar(props) {
	var shouldPreventQueue = import_react.useRef([]);
	var touchStartRef = import_react.useRef([0, 0]);
	var activeAxis = import_react.useRef();
	var id = import_react.useState(idCounter++)[0];
	var Style = import_react.useState(styleSingleton)[0];
	var lastProps = import_react.useRef(props);
	import_react.useEffect(function() {
		lastProps.current = props;
	}, [props]);
	import_react.useEffect(function() {
		if (props.inert) {
			document.body.classList.add("block-interactivity-".concat(id));
			var allow_1 = __spreadArray([props.lockRef.current], (props.shards || []).map(extractRef), true).filter(Boolean);
			allow_1.forEach(function(el) {
				return el.classList.add("allow-interactivity-".concat(id));
			});
			return function() {
				document.body.classList.remove("block-interactivity-".concat(id));
				allow_1.forEach(function(el) {
					return el.classList.remove("allow-interactivity-".concat(id));
				});
			};
		}
	}, [
		props.inert,
		props.lockRef.current,
		props.shards
	]);
	var shouldCancelEvent = import_react.useCallback(function(event, parent) {
		if ("touches" in event && event.touches.length === 2 || event.type === "wheel" && event.ctrlKey) return !lastProps.current.allowPinchZoom;
		var touch = getTouchXY(event);
		var touchStart = touchStartRef.current;
		var deltaX = "deltaX" in event ? event.deltaX : touchStart[0] - touch[0];
		var deltaY = "deltaY" in event ? event.deltaY : touchStart[1] - touch[1];
		var currentAxis;
		var target = event.target;
		var moveDirection = Math.abs(deltaX) > Math.abs(deltaY) ? "h" : "v";
		if ("touches" in event && moveDirection === "h" && target.type === "range") return false;
		var selection = window.getSelection();
		var anchorNode = selection && selection.anchorNode;
		if (anchorNode ? anchorNode === target || anchorNode.contains(target) : false) return false;
		var canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);
		if (!canBeScrolledInMainDirection) return true;
		if (canBeScrolledInMainDirection) currentAxis = moveDirection;
		else {
			currentAxis = moveDirection === "v" ? "h" : "v";
			canBeScrolledInMainDirection = locationCouldBeScrolled(moveDirection, target);
		}
		if (!canBeScrolledInMainDirection) return false;
		if (!activeAxis.current && "changedTouches" in event && (deltaX || deltaY)) activeAxis.current = currentAxis;
		if (!currentAxis) return true;
		var cancelingAxis = activeAxis.current || currentAxis;
		return handleScroll(cancelingAxis, parent, event, cancelingAxis === "h" ? deltaX : deltaY, true);
	}, []);
	var shouldPrevent = import_react.useCallback(function(_event) {
		var event = _event;
		if (!lockStack.length || lockStack[lockStack.length - 1] !== Style) return;
		var delta = "deltaY" in event ? getDeltaXY(event) : getTouchXY(event);
		var sourceEvent = shouldPreventQueue.current.filter(function(e) {
			return e.name === event.type && (e.target === event.target || event.target === e.shadowParent) && deltaCompare(e.delta, delta);
		})[0];
		if (sourceEvent && sourceEvent.should) {
			if (event.cancelable) event.preventDefault();
			return;
		}
		if (!sourceEvent) {
			var shardNodes = (lastProps.current.shards || []).map(extractRef).filter(Boolean).filter(function(node) {
				return node.contains(event.target);
			});
			if (shardNodes.length > 0 ? shouldCancelEvent(event, shardNodes[0]) : !lastProps.current.noIsolation) {
				if (event.cancelable) event.preventDefault();
			}
		}
	}, []);
	var shouldCancel = import_react.useCallback(function(name, delta, target, should) {
		var event = {
			name,
			delta,
			target,
			should,
			shadowParent: getOutermostShadowParent(target)
		};
		shouldPreventQueue.current.push(event);
		setTimeout(function() {
			shouldPreventQueue.current = shouldPreventQueue.current.filter(function(e) {
				return e !== event;
			});
		}, 1);
	}, []);
	var scrollTouchStart = import_react.useCallback(function(event) {
		touchStartRef.current = getTouchXY(event);
		activeAxis.current = void 0;
	}, []);
	var scrollWheel = import_react.useCallback(function(event) {
		shouldCancel(event.type, getDeltaXY(event), event.target, shouldCancelEvent(event, props.lockRef.current));
	}, []);
	var scrollTouchMove = import_react.useCallback(function(event) {
		shouldCancel(event.type, getTouchXY(event), event.target, shouldCancelEvent(event, props.lockRef.current));
	}, []);
	import_react.useEffect(function() {
		lockStack.push(Style);
		props.setCallbacks({
			onScrollCapture: scrollWheel,
			onWheelCapture: scrollWheel,
			onTouchMoveCapture: scrollTouchMove
		});
		document.addEventListener("wheel", shouldPrevent, nonPassive);
		document.addEventListener("touchmove", shouldPrevent, nonPassive);
		document.addEventListener("touchstart", scrollTouchStart, nonPassive);
		return function() {
			lockStack = lockStack.filter(function(inst) {
				return inst !== Style;
			});
			document.removeEventListener("wheel", shouldPrevent, nonPassive);
			document.removeEventListener("touchmove", shouldPrevent, nonPassive);
			document.removeEventListener("touchstart", scrollTouchStart, nonPassive);
		};
	}, []);
	var removeScrollBar = props.removeScrollBar, inert = props.inert;
	return import_react.createElement(import_react.Fragment, null, inert ? import_react.createElement(Style, { styles: generateStyle(id) }) : null, removeScrollBar ? import_react.createElement(RemoveScrollBar, {
		noRelative: props.noRelative,
		gapMode: props.gapMode
	}) : null);
}
function getOutermostShadowParent(node) {
	var shadowParent = null;
	while (node !== null) {
		if (node instanceof ShadowRoot) {
			shadowParent = node.host;
			node = node.host;
		}
		node = node.parentNode;
	}
	return shadowParent;
}
// node_modules/react-remove-scroll/dist/es2015/sidecar.js
var sidecar_default = exportSidecar(effectCar, RemoveScrollSideCar);
// node_modules/react-remove-scroll/dist/es2015/Combination.js
var ReactRemoveScroll = import_react.forwardRef(function(props, ref) {
	return import_react.createElement(RemoveScroll, __assign({}, props, {
		ref,
		sideCar: sidecar_default
	}));
});
ReactRemoveScroll.classNames = RemoveScroll.classNames;
// node_modules/aria-hidden/dist/es2015/index.js
var getDefaultParent = function(originalTarget) {
	if (typeof document === "undefined") return null;
	return (Array.isArray(originalTarget) ? originalTarget[0] : originalTarget).ownerDocument.body;
};
var counterMap = /* @__PURE__ */ new WeakMap();
var uncontrolledNodes = /* @__PURE__ */ new WeakMap();
var markerMap = {};
var lockCount = 0;
var unwrapHost = function(node) {
	return node && (node.host || unwrapHost(node.parentNode));
};
var correctTargets = function(parent, targets) {
	return targets.map(function(target) {
		if (parent.contains(target)) return target;
		var correctedTarget = unwrapHost(target);
		if (correctedTarget && parent.contains(correctedTarget)) return correctedTarget;
		console.error("aria-hidden", target, "in not contained inside", parent, ". Doing nothing");
		return null;
	}).filter(function(x) {
		return Boolean(x);
	});
};
/**
* Marks everything except given node(or nodes) as aria-hidden
* @param {Element | Element[]} originalTarget - elements to keep on the page
* @param [parentNode] - top element, defaults to document.body
* @param {String} [markerName] - a special attribute to mark every node
* @param {String} [controlAttribute] - html Attribute to control
* @return {Undo} undo command
*/
var applyAttributeToOthers = function(originalTarget, parentNode, markerName, controlAttribute) {
	var targets = correctTargets(parentNode, Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
	if (!markerMap[markerName]) markerMap[markerName] = /* @__PURE__ */ new WeakMap();
	var markerCounter = markerMap[markerName];
	var hiddenNodes = [];
	var elementsToKeep = /* @__PURE__ */ new Set();
	var elementsToStop = new Set(targets);
	var keep = function(el) {
		if (!el || elementsToKeep.has(el)) return;
		elementsToKeep.add(el);
		keep(el.parentNode);
	};
	targets.forEach(keep);
	var deep = function(parent) {
		if (!parent || elementsToStop.has(parent)) return;
		Array.prototype.forEach.call(parent.children, function(node) {
			if (elementsToKeep.has(node)) deep(node);
			else try {
				var attr = node.getAttribute(controlAttribute);
				var alreadyHidden = attr !== null && attr !== "false";
				var counterValue = (counterMap.get(node) || 0) + 1;
				var markerValue = (markerCounter.get(node) || 0) + 1;
				counterMap.set(node, counterValue);
				markerCounter.set(node, markerValue);
				hiddenNodes.push(node);
				if (counterValue === 1 && alreadyHidden) uncontrolledNodes.set(node, true);
				if (markerValue === 1) node.setAttribute(markerName, "true");
				if (!alreadyHidden) node.setAttribute(controlAttribute, "true");
			} catch (e) {
				console.error("aria-hidden: cannot operate on ", node, e);
			}
		});
	};
	deep(parentNode);
	elementsToKeep.clear();
	lockCount++;
	return function() {
		hiddenNodes.forEach(function(node) {
			var counterValue = counterMap.get(node) - 1;
			var markerValue = markerCounter.get(node) - 1;
			counterMap.set(node, counterValue);
			markerCounter.set(node, markerValue);
			if (!counterValue) {
				if (!uncontrolledNodes.has(node)) node.removeAttribute(controlAttribute);
				uncontrolledNodes.delete(node);
			}
			if (!markerValue) node.removeAttribute(markerName);
		});
		lockCount--;
		if (!lockCount) {
			counterMap = /* @__PURE__ */ new WeakMap();
			counterMap = /* @__PURE__ */ new WeakMap();
			uncontrolledNodes = /* @__PURE__ */ new WeakMap();
			markerMap = {};
		}
	};
};
/**
* Marks everything except given node(or nodes) as aria-hidden
* @param {Element | Element[]} originalTarget - elements to keep on the page
* @param [parentNode] - top element, defaults to document.body
* @param {String} [markerName] - a special attribute to mark every node
* @return {Undo} undo command
*/
var hideOthers = function(originalTarget, parentNode, markerName) {
	if (markerName === void 0) markerName = "data-aria-hidden";
	var targets = Array.from(Array.isArray(originalTarget) ? originalTarget : [originalTarget]);
	var activeParentNode = parentNode || getDefaultParent(originalTarget);
	if (!activeParentNode) return function() {
		return null;
	};
	targets.push.apply(targets, Array.from(activeParentNode.querySelectorAll("[aria-live], script")));
	return applyAttributeToOthers(targets, activeParentNode, markerName, "aria-hidden");
};
// node_modules/@radix-ui/react-dialog/dist/index.mjs
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
	value,
	configurable: true
});
var DIALOG_NAME = "Dialog";
var [createDialogContext, createDialogScope] = /* @__PURE__ */ createContextScope(DIALOG_NAME);
var [DialogProvider, useDialogContext] = createDialogContext(DIALOG_NAME);
var Dialog$1 = /* @__PURE__ */ __name((props) => {
	const { __scopeDialog, children, open: openProp, defaultOpen, onOpenChange, modal = true } = props;
	const triggerRef = import_react.useRef(null);
	const contentRef = import_react.useRef(null);
	const { nodes: branchNodes, registry: branchRegistry } = useFocusScopeBranchRegistry();
	const [open, setOpen] = useControllableState$1({
		prop: openProp,
		defaultProp: defaultOpen ?? false,
		onChange: onOpenChange,
		caller: DIALOG_NAME
	});
	const [titleCount, setTitleCount] = import_react.useState(0);
	const [descriptionCount, setDescriptionCount] = import_react.useState(0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogProvider, {
		scope: __scopeDialog,
		triggerRef,
		contentRef,
		contentId: useId(),
		titleId: useId(),
		descriptionId: useId(),
		titlePresent: titleCount > 0,
		descriptionPresent: descriptionCount > 0,
		setTitleCount,
		setDescriptionCount,
		open,
		onOpenChange: setOpen,
		onOpenToggle: import_react.useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen]),
		modal,
		branchNodes,
		branchRegistry,
		children
	});
}, "Dialog");
var TRIGGER_NAME = "DialogTrigger";
var DialogTrigger = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogTrigger2(props, forwardedRef) {
	const { __scopeDialog, ...triggerProps } = props;
	const context = useDialogContext(TRIGGER_NAME, __scopeDialog);
	const composedTriggerRef = useComposedRefs$1(forwardedRef, context.triggerRef);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.button, {
		type: "button",
		"aria-haspopup": "dialog",
		"aria-expanded": context.open,
		"aria-controls": context.open ? context.contentId : void 0,
		"data-state": getState(context.open),
		...triggerProps,
		ref: composedTriggerRef,
		onClick: composeEventHandlers(props.onClick, context.onOpenToggle)
	});
}, "DialogTrigger"));
var PORTAL_NAME = "DialogPortal";
var [PortalProvider, usePortalContext] = createDialogContext(PORTAL_NAME, { forceMount: void 0 });
var DialogPortal = /* @__PURE__ */ __name((props) => {
	const { __scopeDialog, forceMount, children, container } = props;
	const context = useDialogContext(PORTAL_NAME, __scopeDialog);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PortalProvider, {
		scope: __scopeDialog,
		forceMount,
		children: import_react.Children.map(children, (child) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
			present: forceMount || context.open,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal$1, {
				asChild: true,
				container,
				children: child
			})
		}))
	});
}, "DialogPortal");
var OVERLAY_NAME = "DialogOverlay";
var DialogOverlay = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogOverlay2(props, forwardedRef) {
	const portalContext = usePortalContext(OVERLAY_NAME, props.__scopeDialog);
	const { forceMount = portalContext.forceMount, ...overlayProps } = props;
	const context = useDialogContext(OVERLAY_NAME, props.__scopeDialog);
	return context.modal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
		present: forceMount || context.open,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlayImpl, {
			...overlayProps,
			ref: forwardedRef
		})
	}) : null;
}, "DialogOverlay"));
var Slot = /* @__PURE__ */ createSlot("DialogOverlay.RemoveScroll");
var DialogOverlayImpl = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogOverlayImpl2(props, forwardedRef) {
	const { __scopeDialog, ...overlayProps } = props;
	const context = useDialogContext(OVERLAY_NAME, __scopeDialog);
	const composedRefs = useComposedRefs$1(forwardedRef, useDismissableLayerSurface());
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReactRemoveScroll, {
		as: Slot,
		allowPinchZoom: true,
		shards: import_react.useMemo(() => [context.contentRef, ...context.branchNodes.map((node) => ({ current: node }))], [context.contentRef, context.branchNodes]),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.div, {
			"data-state": getState(context.open),
			...overlayProps,
			ref: composedRefs,
			style: {
				pointerEvents: "auto",
				...overlayProps.style
			}
		})
	});
}, "DialogOverlayImpl"));
var CONTENT_NAME = "DialogContent";
var DialogContent$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogContent2(props, forwardedRef) {
	const portalContext = usePortalContext(CONTENT_NAME, props.__scopeDialog);
	const { forceMount = portalContext.forceMount, ...contentProps } = props;
	const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Presence, {
		present: forceMount || context.open,
		children: context.modal ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContentModal, {
			...contentProps,
			ref: forwardedRef
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContentNonModal, {
			...contentProps,
			ref: forwardedRef
		})
	});
}, "DialogContent"));
var DialogContentModal = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogContentModal2(props, forwardedRef) {
	const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
	const contentRef = import_react.useRef(null);
	const composedRefs = useComposedRefs$1(forwardedRef, context.contentRef, contentRef);
	import_react.useEffect(() => {
		const content = contentRef.current;
		if (content) return hideOthers(content);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContentImpl, {
		...props,
		ref: composedRefs,
		trapFocus: context.open,
		disableOutsidePointerEvents: context.open,
		onCloseAutoFocus: composeEventHandlers(props.onCloseAutoFocus, (event) => {
			event.preventDefault();
			context.triggerRef.current?.focus();
		}),
		onPointerDownOutside: composeEventHandlers(props.onPointerDownOutside, (event) => {
			const originalEvent = event.detail.originalEvent;
			const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
			if (originalEvent.button === 2 || ctrlLeftClick) event.preventDefault();
		}),
		onFocusOutside: composeEventHandlers(props.onFocusOutside, (event) => event.preventDefault())
	});
}, "DialogContentModal"));
var DialogContentNonModal = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogContentNonModal2(props, forwardedRef) {
	const context = useDialogContext(CONTENT_NAME, props.__scopeDialog);
	const hasInteractedOutsideRef = import_react.useRef(false);
	const hasPointerDownOutsideRef = import_react.useRef(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContentImpl, {
		...props,
		ref: forwardedRef,
		trapFocus: false,
		disableOutsidePointerEvents: false,
		onCloseAutoFocus: (event) => {
			props.onCloseAutoFocus?.(event);
			if (!event.defaultPrevented) {
				if (!hasInteractedOutsideRef.current) context.triggerRef.current?.focus();
				event.preventDefault();
			}
			hasInteractedOutsideRef.current = false;
			hasPointerDownOutsideRef.current = false;
		},
		onInteractOutside: (event) => {
			props.onInteractOutside?.(event);
			if (!event.defaultPrevented) {
				hasInteractedOutsideRef.current = true;
				if (event.detail.originalEvent.type === "pointerdown") hasPointerDownOutsideRef.current = true;
			}
			const target = event.target;
			if (context.triggerRef.current?.contains(target)) event.preventDefault();
			if (event.detail.originalEvent.type === "focusin" && hasPointerDownOutsideRef.current) event.preventDefault();
		}
	});
}, "DialogContentNonModal"));
var DialogContentImpl = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogContentImpl2(props, forwardedRef) {
	const { __scopeDialog, trapFocus, onOpenAutoFocus, onCloseAutoFocus, "aria-describedby": ariaDescribedby, children, ...contentProps } = props;
	const context = useDialogContext(CONTENT_NAME, __scopeDialog);
	useFocusGuards();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusScopeBranchProvider, {
		registry: context.branchRegistry,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FocusScope, {
			asChild: true,
			loop: true,
			trapped: trapFocus,
			branches: context.branchNodes,
			onMountAutoFocus: onOpenAutoFocus,
			onUnmountAutoFocus: onCloseAutoFocus,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DismissableLayer, {
				role: "dialog",
				id: context.contentId,
				"aria-labelledby": context.titlePresent ? context.titleId : void 0,
				"aria-describedby": context.descriptionPresent ? concatAriaDescribedby(ariaDescribedby, context.descriptionId) : ariaDescribedby,
				"data-state": getState(context.open),
				...contentProps,
				ref: forwardedRef,
				deferPointerDownOutside: true,
				onDismiss: () => context.onOpenChange(false),
				children
			})
		})
	});
}, "DialogContentImpl"));
var DialogTitle$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogTitle2(props, forwardedRef) {
	const { __scopeDialog, ...titleProps } = props;
	const context = useDialogContext("DialogTitle", __scopeDialog);
	const { setTitleCount } = context;
	useLayoutEffect2(() => {
		setTitleCount((count) => count + 1);
		return () => setTitleCount((count) => count - 1);
	}, [setTitleCount]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.h2, {
		id: context.titleId,
		...titleProps,
		ref: forwardedRef
	});
}, "DialogTitle"));
var DialogDescription$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogDescription2(props, forwardedRef) {
	const { __scopeDialog, ...descriptionProps } = props;
	const context = useDialogContext("DialogDescription", __scopeDialog);
	const { setDescriptionCount } = context;
	useLayoutEffect2(() => {
		setDescriptionCount((count) => count + 1);
		return () => setDescriptionCount((count) => count - 1);
	}, [setDescriptionCount]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.p, {
		id: context.descriptionId,
		...descriptionProps,
		ref: forwardedRef
	});
}, "DialogDescription"));
var CLOSE_NAME = "DialogClose";
var DialogClose$1 = /* @__PURE__ */ import_react.forwardRef(/* @__PURE__ */ __name(function DialogClose2(props, forwardedRef) {
	const { __scopeDialog, ...closeProps } = props;
	const context = useDialogContext(CLOSE_NAME, __scopeDialog);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.button, {
		type: "button",
		...closeProps,
		ref: forwardedRef,
		onClick: composeEventHandlers(props.onClick, () => context.onOpenChange(false))
	});
}, "DialogClose"));
function concatAriaDescribedby(...values) {
	const ids = /* @__PURE__ */ new Set();
	for (const value of values) {
		if (typeof value !== "string") continue;
		for (const id of String(value).trim().split(/\s+/)) if (id) ids.add(id);
	}
	return ids.size > 0 ? Array.from(ids).join(" ") : void 0;
}
__name(concatAriaDescribedby, "concatAriaDescribedby");
function getState(open) {
	return open ? "open" : "closed";
}
__name(getState, "getState");
// node_modules/vaul/dist/index.mjs
function __insertCSS(code) {
	if (!code || typeof document == "undefined") return;
	let head = document.head || document.getElementsByTagName("head")[0];
	let style = document.createElement("style");
	style.type = "text/css";
	head.appendChild(style);
	style.styleSheet ? style.styleSheet.cssText = code : style.appendChild(document.createTextNode(code));
}
var DrawerContext = import_react.createContext({
	drawerRef: { current: null },
	overlayRef: { current: null },
	onPress: () => {},
	onRelease: () => {},
	onDrag: () => {},
	onNestedDrag: () => {},
	onNestedOpenChange: () => {},
	onNestedRelease: () => {},
	openProp: void 0,
	dismissible: false,
	isOpen: false,
	isDragging: false,
	keyboardIsOpen: { current: false },
	snapPointsOffset: null,
	snapPoints: null,
	handleOnly: false,
	modal: false,
	shouldFade: false,
	activeSnapPoint: null,
	onOpenChange: () => {},
	setActiveSnapPoint: () => {},
	closeDrawer: () => {},
	direction: "bottom",
	shouldAnimate: { current: true },
	shouldScaleBackground: false,
	setBackgroundColorOnScale: true,
	noBodyStyles: false,
	container: null,
	autoFocus: false
});
var useDrawerContext = () => {
	const context = import_react.useContext(DrawerContext);
	if (!context) throw new Error("useDrawerContext must be used within a Drawer.Root");
	return context;
};
__insertCSS("[data-vaul-drawer]{touch-action:none;will-change:transform;transition:transform .5s cubic-bezier(.32, .72, 0, 1);animation-duration:.5s;animation-timing-function:cubic-bezier(0.32,0.72,0,1)}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=bottom][data-state=open]{animation-name:slideFromBottom}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=bottom][data-state=closed]{animation-name:slideToBottom}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=top][data-state=open]{animation-name:slideFromTop}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=top][data-state=closed]{animation-name:slideToTop}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=left][data-state=open]{animation-name:slideFromLeft}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=left][data-state=closed]{animation-name:slideToLeft}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=right][data-state=open]{animation-name:slideFromRight}[data-vaul-drawer][data-vaul-snap-points=false][data-vaul-drawer-direction=right][data-state=closed]{animation-name:slideToRight}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=bottom]{transform:translate3d(0,var(--initial-transform,100%),0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=top]{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=left]{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}[data-vaul-drawer][data-vaul-snap-points=true][data-vaul-drawer-direction=right]{transform:translate3d(var(--initial-transform,100%),0,0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=top]{transform:translate3d(0,var(--snap-point-height,0),0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=bottom]{transform:translate3d(0,var(--snap-point-height,0),0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=left]{transform:translate3d(var(--snap-point-height,0),0,0)}[data-vaul-drawer][data-vaul-delayed-snap-points=true][data-vaul-drawer-direction=right]{transform:translate3d(var(--snap-point-height,0),0,0)}[data-vaul-overlay][data-vaul-snap-points=false]{animation-duration:.5s;animation-timing-function:cubic-bezier(0.32,0.72,0,1)}[data-vaul-overlay][data-vaul-snap-points=false][data-state=open]{animation-name:fadeIn}[data-vaul-overlay][data-state=closed]{animation-name:fadeOut}[data-vaul-animate=false]{animation:none!important}[data-vaul-overlay][data-vaul-snap-points=true]{opacity:0;transition:opacity .5s cubic-bezier(.32, .72, 0, 1)}[data-vaul-overlay][data-vaul-snap-points=true]{opacity:1}[data-vaul-drawer]:not([data-vaul-custom-container=true])::after{content:'';position:absolute;background:inherit;background-color:inherit}[data-vaul-drawer][data-vaul-drawer-direction=top]::after{top:initial;bottom:100%;left:0;right:0;height:200%}[data-vaul-drawer][data-vaul-drawer-direction=bottom]::after{top:100%;bottom:initial;left:0;right:0;height:200%}[data-vaul-drawer][data-vaul-drawer-direction=left]::after{left:initial;right:100%;top:0;bottom:0;width:200%}[data-vaul-drawer][data-vaul-drawer-direction=right]::after{left:100%;right:initial;top:0;bottom:0;width:200%}[data-vaul-overlay][data-vaul-snap-points=true]:not([data-vaul-snap-points-overlay=true]):not(\n[data-state=closed]\n){opacity:0}[data-vaul-overlay][data-vaul-snap-points-overlay=true]{opacity:1}[data-vaul-handle]{display:block;position:relative;opacity:.7;background:#e2e2e4;margin-left:auto;margin-right:auto;height:5px;width:32px;border-radius:1rem;touch-action:pan-y}[data-vaul-handle]:active,[data-vaul-handle]:hover{opacity:1}[data-vaul-handle-hitarea]{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:max(100%,2.75rem);height:max(100%,2.75rem);touch-action:inherit}@media (hover:hover) and (pointer:fine){[data-vaul-drawer]{user-select:none}}@media (pointer:fine){[data-vaul-handle-hitarea]:{width:100%;height:100%}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes fadeOut{to{opacity:0}}@keyframes slideFromBottom{from{transform:translate3d(0,var(--initial-transform,100%),0)}to{transform:translate3d(0,0,0)}}@keyframes slideToBottom{to{transform:translate3d(0,var(--initial-transform,100%),0)}}@keyframes slideFromTop{from{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}to{transform:translate3d(0,0,0)}}@keyframes slideToTop{to{transform:translate3d(0,calc(var(--initial-transform,100%) * -1),0)}}@keyframes slideFromLeft{from{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}to{transform:translate3d(0,0,0)}}@keyframes slideToLeft{to{transform:translate3d(calc(var(--initial-transform,100%) * -1),0,0)}}@keyframes slideFromRight{from{transform:translate3d(var(--initial-transform,100%),0,0)}to{transform:translate3d(0,0,0)}}@keyframes slideToRight{to{transform:translate3d(var(--initial-transform,100%),0,0)}}");
function isMobileFirefox() {
	const userAgent = navigator.userAgent;
	return typeof window !== "undefined" && (/Firefox/.test(userAgent) && /Mobile/.test(userAgent) || /FxiOS/.test(userAgent));
}
function isMac() {
	return testPlatform(/^Mac/);
}
function isIPhone() {
	return testPlatform(/^iPhone/);
}
function isSafari() {
	return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}
function isIPad() {
	return testPlatform(/^iPad/) || isMac() && navigator.maxTouchPoints > 1;
}
function isIOS$1() {
	return isIPhone() || isIPad();
}
function testPlatform(re) {
	return typeof window !== "undefined" && window.navigator != null ? re.test(window.navigator.platform) : void 0;
}
var KEYBOARD_BUFFER = 24;
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? import_react.useLayoutEffect : import_react.useEffect;
function chain$1(...callbacks) {
	return (...args) => {
		for (let callback of callbacks) if (typeof callback === "function") callback(...args);
	};
}
var visualViewport = typeof document !== "undefined" && window.visualViewport;
function isScrollable(node) {
	let style = window.getComputedStyle(node);
	return /(auto|scroll)/.test(style.overflow + style.overflowX + style.overflowY);
}
function getScrollParent(node) {
	if (isScrollable(node)) node = node.parentElement;
	while (node && !isScrollable(node)) node = node.parentElement;
	return node || document.scrollingElement || document.documentElement;
}
var nonTextInputTypes = /* @__PURE__ */ new Set([
	"checkbox",
	"radio",
	"range",
	"color",
	"file",
	"image",
	"button",
	"submit",
	"reset"
]);
var preventScrollCount = 0;
var restore;
/**
* Prevents scrolling on the document body on mount, and
* restores it on unmount. Also ensures that content does not
* shift due to the scrollbars disappearing.
*/ function usePreventScroll(options = {}) {
	let { isDisabled } = options;
	useIsomorphicLayoutEffect(() => {
		if (isDisabled) return;
		preventScrollCount++;
		if (preventScrollCount === 1) {
			if (isIOS$1()) restore = preventScrollMobileSafari();
		}
		return () => {
			preventScrollCount--;
			if (preventScrollCount === 0) restore?.();
		};
	}, [isDisabled]);
}
function preventScrollMobileSafari() {
	let scrollable;
	let lastY = 0;
	let onTouchStart = (e) => {
		scrollable = getScrollParent(e.target);
		if (scrollable === document.documentElement && scrollable === document.body) return;
		lastY = e.changedTouches[0].pageY;
	};
	let onTouchMove = (e) => {
		if (!scrollable || scrollable === document.documentElement || scrollable === document.body) {
			e.preventDefault();
			return;
		}
		let y = e.changedTouches[0].pageY;
		let scrollTop = scrollable.scrollTop;
		let bottom = scrollable.scrollHeight - scrollable.clientHeight;
		if (bottom === 0) return;
		if (scrollTop <= 0 && y > lastY || scrollTop >= bottom && y < lastY) e.preventDefault();
		lastY = y;
	};
	let onTouchEnd = (e) => {
		let target = e.target;
		if (isInput(target) && target !== document.activeElement) {
			e.preventDefault();
			target.style.transform = "translateY(-2000px)";
			target.focus();
			requestAnimationFrame(() => {
				target.style.transform = "";
			});
		}
	};
	let onFocus = (e) => {
		let target = e.target;
		if (isInput(target)) {
			target.style.transform = "translateY(-2000px)";
			requestAnimationFrame(() => {
				target.style.transform = "";
				if (visualViewport) {
					if (visualViewport.height < window.innerHeight) requestAnimationFrame(() => {
						scrollIntoView(target);
					});
					else visualViewport.addEventListener("resize", () => scrollIntoView(target), { once: true });
				}
			});
		}
	};
	let onWindowScroll = () => {
		window.scrollTo(0, 0);
	};
	let scrollX = window.pageXOffset;
	let scrollY = window.pageYOffset;
	let restoreStyles = chain$1(setStyle(document.documentElement, "paddingRight", `${window.innerWidth - document.documentElement.clientWidth}px`));
	window.scrollTo(0, 0);
	let removeEvents = chain$1(addEvent(document, "touchstart", onTouchStart, {
		passive: false,
		capture: true
	}), addEvent(document, "touchmove", onTouchMove, {
		passive: false,
		capture: true
	}), addEvent(document, "touchend", onTouchEnd, {
		passive: false,
		capture: true
	}), addEvent(document, "focus", onFocus, true), addEvent(window, "scroll", onWindowScroll));
	return () => {
		restoreStyles();
		removeEvents();
		window.scrollTo(scrollX, scrollY);
	};
}
function setStyle(element, style, value) {
	let cur = element.style[style];
	element.style[style] = value;
	return () => {
		element.style[style] = cur;
	};
}
function addEvent(target, event, handler, options) {
	target.addEventListener(event, handler, options);
	return () => {
		target.removeEventListener(event, handler, options);
	};
}
function scrollIntoView(target) {
	let root = document.scrollingElement || document.documentElement;
	while (target && target !== root) {
		let scrollable = getScrollParent(target);
		if (scrollable !== document.documentElement && scrollable !== document.body && scrollable !== target) {
			let scrollableTop = scrollable.getBoundingClientRect().top;
			let targetTop = target.getBoundingClientRect().top;
			if (target.getBoundingClientRect().bottom > scrollable.getBoundingClientRect().bottom + KEYBOARD_BUFFER) scrollable.scrollTop += targetTop - scrollableTop;
		}
		target = scrollable.parentElement;
	}
}
function isInput(target) {
	return target instanceof HTMLInputElement && !nonTextInputTypes.has(target.type) || target instanceof HTMLTextAreaElement || target instanceof HTMLElement && target.isContentEditable;
}
/**
* Set a given ref to a given value
* This utility takes care of different types of refs: callback refs and RefObject(s)
*/ function setRef$1(ref, value) {
	if (typeof ref === "function") ref(value);
	else if (ref !== null && ref !== void 0) ref.current = value;
}
/**
* A utility to compose multiple refs together
* Accepts callback refs and RefObject(s)
*/ function composeRefs(...refs) {
	return (node) => refs.forEach((ref) => setRef$1(ref, node));
}
/**
* A custom hook that composes multiple refs
* Accepts callback refs and RefObject(s)
*/ function useComposedRefs(...refs) {
	return import_react.useCallback(composeRefs(...refs), refs);
}
var cache = /* @__PURE__ */ new WeakMap();
function set(el, styles, ignoreCache = false) {
	if (!el || !(el instanceof HTMLElement)) return;
	let originalStyles = {};
	Object.entries(styles).forEach(([key, value]) => {
		if (key.startsWith("--")) {
			el.style.setProperty(key, value);
			return;
		}
		originalStyles[key] = el.style[key];
		el.style[key] = value;
	});
	if (ignoreCache) return;
	cache.set(el, originalStyles);
}
function reset(el, prop) {
	if (!el || !(el instanceof HTMLElement)) return;
	let originalStyles = cache.get(el);
	if (!originalStyles) return;
	el.style[prop] = originalStyles[prop];
}
var isVertical$1 = (direction) => {
	switch (direction) {
		case "top":
		case "bottom": return true;
		case "left":
		case "right": return false;
		default: return direction;
	}
};
function getTranslate(element, direction) {
	if (!element) return null;
	const style = window.getComputedStyle(element);
	const transform = style.transform || style.webkitTransform || style.mozTransform;
	let mat = transform.match(/^matrix3d\((.+)\)$/);
	if (mat) return parseFloat(mat[1].split(", ")[isVertical$1(direction) ? 13 : 12]);
	mat = transform.match(/^matrix\((.+)\)$/);
	return mat ? parseFloat(mat[1].split(", ")[isVertical$1(direction) ? 5 : 4]) : null;
}
function dampenValue(v) {
	return 8 * (Math.log(v + 1) - 2);
}
function assignStyle(element, style) {
	if (!element) return () => {};
	const prevStyle = element.style.cssText;
	Object.assign(element.style, style);
	return () => {
		element.style.cssText = prevStyle;
	};
}
var TRANSITIONS = {
	DURATION: .5,
	EASE: [
		.32,
		.72,
		0,
		1
	]
};
var VELOCITY_THRESHOLD = .4;
var CLOSE_THRESHOLD = .25;
var SCROLL_LOCK_TIMEOUT = 100;
var BORDER_RADIUS = 8;
var NESTED_DISPLACEMENT = 16;
var WINDOW_TOP_OFFSET = 26;
var DRAG_CLASS = "vaul-dragging";
function useCallbackRef(callback) {
	const callbackRef = import_react.useRef(callback);
	import_react.useEffect(() => {
		callbackRef.current = callback;
	});
	return import_react.useMemo(() => (...args) => callbackRef.current == null ? void 0 : callbackRef.current.call(callbackRef, ...args), []);
}
function useUncontrolledState({ defaultProp, onChange }) {
	const uncontrolledState = import_react.useState(defaultProp);
	const [value] = uncontrolledState;
	const prevValueRef = import_react.useRef(value);
	const handleChange = useCallbackRef(onChange);
	import_react.useEffect(() => {
		if (prevValueRef.current !== value) {
			handleChange(value);
			prevValueRef.current = value;
		}
	}, [
		value,
		prevValueRef,
		handleChange
	]);
	return uncontrolledState;
}
function useControllableState({ prop, defaultProp, onChange = () => {} }) {
	const [uncontrolledProp, setUncontrolledProp] = useUncontrolledState({
		defaultProp,
		onChange
	});
	const isControlled = prop !== void 0;
	const value = isControlled ? prop : uncontrolledProp;
	const handleChange = useCallbackRef(onChange);
	return [value, import_react.useCallback((nextValue) => {
		if (isControlled) {
			const value = typeof nextValue === "function" ? nextValue(prop) : nextValue;
			if (value !== prop) handleChange(value);
		} else setUncontrolledProp(nextValue);
	}, [
		isControlled,
		prop,
		setUncontrolledProp,
		handleChange
	])];
}
function useSnapPoints({ activeSnapPointProp, setActiveSnapPointProp, snapPoints, drawerRef, overlayRef, fadeFromIndex, onSnapPointChange, direction = "bottom", container, snapToSequentialPoint }) {
	const [activeSnapPoint, setActiveSnapPoint] = useControllableState({
		prop: activeSnapPointProp,
		defaultProp: snapPoints == null ? void 0 : snapPoints[0],
		onChange: setActiveSnapPointProp
	});
	const [windowDimensions, setWindowDimensions] = import_react.useState(typeof window !== "undefined" ? {
		innerWidth: window.innerWidth,
		innerHeight: window.innerHeight
	} : void 0);
	import_react.useEffect(() => {
		function onResize() {
			setWindowDimensions({
				innerWidth: window.innerWidth,
				innerHeight: window.innerHeight
			});
		}
		window.addEventListener("resize", onResize);
		return () => window.removeEventListener("resize", onResize);
	}, []);
	const isLastSnapPoint = import_react.useMemo(() => activeSnapPoint === (snapPoints == null ? void 0 : snapPoints[snapPoints.length - 1]) || null, [snapPoints, activeSnapPoint]);
	const activeSnapPointIndex = import_react.useMemo(() => {
		var _snapPoints_findIndex;
		return (_snapPoints_findIndex = snapPoints == null ? void 0 : snapPoints.findIndex((snapPoint) => snapPoint === activeSnapPoint)) != null ? _snapPoints_findIndex : null;
	}, [snapPoints, activeSnapPoint]);
	const shouldFade = snapPoints && snapPoints.length > 0 && (fadeFromIndex || fadeFromIndex === 0) && !Number.isNaN(fadeFromIndex) && snapPoints[fadeFromIndex] === activeSnapPoint || !snapPoints;
	const snapPointsOffset = import_react.useMemo(() => {
		const containerSize = container ? {
			width: container.getBoundingClientRect().width,
			height: container.getBoundingClientRect().height
		} : typeof window !== "undefined" ? {
			width: window.innerWidth,
			height: window.innerHeight
		} : {
			width: 0,
			height: 0
		};
		var _snapPoints_map;
		return (_snapPoints_map = snapPoints == null ? void 0 : snapPoints.map((snapPoint) => {
			const isPx = typeof snapPoint === "string";
			let snapPointAsNumber = 0;
			if (isPx) snapPointAsNumber = parseInt(snapPoint, 10);
			if (isVertical$1(direction)) {
				const height = isPx ? snapPointAsNumber : windowDimensions ? snapPoint * containerSize.height : 0;
				if (windowDimensions) return direction === "bottom" ? containerSize.height - height : -containerSize.height + height;
				return height;
			}
			const width = isPx ? snapPointAsNumber : windowDimensions ? snapPoint * containerSize.width : 0;
			if (windowDimensions) return direction === "right" ? containerSize.width - width : -containerSize.width + width;
			return width;
		})) != null ? _snapPoints_map : [];
	}, [
		snapPoints,
		windowDimensions,
		container
	]);
	const activeSnapPointOffset = import_react.useMemo(() => activeSnapPointIndex !== null ? snapPointsOffset == null ? void 0 : snapPointsOffset[activeSnapPointIndex] : null, [snapPointsOffset, activeSnapPointIndex]);
	const snapToPoint = import_react.useCallback((dimension) => {
		var _snapPointsOffset_findIndex;
		const newSnapPointIndex = (_snapPointsOffset_findIndex = snapPointsOffset == null ? void 0 : snapPointsOffset.findIndex((snapPointDim) => snapPointDim === dimension)) != null ? _snapPointsOffset_findIndex : null;
		onSnapPointChange(newSnapPointIndex);
		set(drawerRef.current, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical$1(direction) ? `translate3d(0, ${dimension}px, 0)` : `translate3d(${dimension}px, 0, 0)`
		});
		if (snapPointsOffset && newSnapPointIndex !== snapPointsOffset.length - 1 && fadeFromIndex !== void 0 && newSnapPointIndex !== fadeFromIndex && newSnapPointIndex < fadeFromIndex) set(overlayRef.current, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "0"
		});
		else set(overlayRef.current, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1"
		});
		setActiveSnapPoint(snapPoints == null ? void 0 : snapPoints[Math.max(newSnapPointIndex, 0)]);
	}, [
		drawerRef.current,
		snapPoints,
		snapPointsOffset,
		fadeFromIndex,
		overlayRef,
		setActiveSnapPoint
	]);
	import_react.useEffect(() => {
		if (activeSnapPoint || activeSnapPointProp) {
			var _snapPoints_findIndex;
			const newIndex = (_snapPoints_findIndex = snapPoints == null ? void 0 : snapPoints.findIndex((snapPoint) => snapPoint === activeSnapPointProp || snapPoint === activeSnapPoint)) != null ? _snapPoints_findIndex : -1;
			if (snapPointsOffset && newIndex !== -1 && typeof snapPointsOffset[newIndex] === "number") snapToPoint(snapPointsOffset[newIndex]);
		}
	}, [
		activeSnapPoint,
		activeSnapPointProp,
		snapPoints,
		snapPointsOffset,
		snapToPoint
	]);
	function onRelease({ draggedDistance, closeDrawer, velocity, dismissible }) {
		if (fadeFromIndex === void 0) return;
		const currentPosition = direction === "bottom" || direction === "right" ? (activeSnapPointOffset != null ? activeSnapPointOffset : 0) - draggedDistance : (activeSnapPointOffset != null ? activeSnapPointOffset : 0) + draggedDistance;
		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
		const isFirst = activeSnapPointIndex === 0;
		const hasDraggedUp = draggedDistance > 0;
		if (isOverlaySnapPoint) set(overlayRef.current, { transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})` });
		if (!snapToSequentialPoint && velocity > 2 && !hasDraggedUp) {
			if (dismissible) closeDrawer();
			else snapToPoint(snapPointsOffset[0]);
			return;
		}
		if (!snapToSequentialPoint && velocity > 2 && hasDraggedUp && snapPointsOffset && snapPoints) {
			snapToPoint(snapPointsOffset[snapPoints.length - 1]);
			return;
		}
		const closestSnapPoint = snapPointsOffset == null ? void 0 : snapPointsOffset.reduce((prev, curr) => {
			if (typeof prev !== "number" || typeof curr !== "number") return prev;
			return Math.abs(curr - currentPosition) < Math.abs(prev - currentPosition) ? curr : prev;
		});
		const dim = isVertical$1(direction) ? window.innerHeight : window.innerWidth;
		if (velocity > VELOCITY_THRESHOLD && Math.abs(draggedDistance) < dim * .4) {
			const dragDirection = hasDraggedUp ? 1 : -1;
			if (dragDirection > 0 && isLastSnapPoint && snapPoints) {
				snapToPoint(snapPointsOffset[snapPoints.length - 1]);
				return;
			}
			if (isFirst && dragDirection < 0 && dismissible) closeDrawer();
			if (activeSnapPointIndex === null) return;
			snapToPoint(snapPointsOffset[activeSnapPointIndex + dragDirection]);
			return;
		}
		snapToPoint(closestSnapPoint);
	}
	function onDrag({ draggedDistance }) {
		if (activeSnapPointOffset === null) return;
		const newValue = direction === "bottom" || direction === "right" ? activeSnapPointOffset - draggedDistance : activeSnapPointOffset + draggedDistance;
		if ((direction === "bottom" || direction === "right") && newValue < snapPointsOffset[snapPointsOffset.length - 1]) return;
		if ((direction === "top" || direction === "left") && newValue > snapPointsOffset[snapPointsOffset.length - 1]) return;
		set(drawerRef.current, { transform: isVertical$1(direction) ? `translate3d(0, ${newValue}px, 0)` : `translate3d(${newValue}px, 0, 0)` });
	}
	function getPercentageDragged(absDraggedDistance, isDraggingDown) {
		if (!snapPoints || typeof activeSnapPointIndex !== "number" || !snapPointsOffset || fadeFromIndex === void 0) return null;
		const isOverlaySnapPoint = activeSnapPointIndex === fadeFromIndex - 1;
		if (activeSnapPointIndex >= fadeFromIndex && isDraggingDown) return 0;
		if (isOverlaySnapPoint && !isDraggingDown) return 1;
		if (!shouldFade && !isOverlaySnapPoint) return null;
		const targetSnapPointIndex = isOverlaySnapPoint ? activeSnapPointIndex + 1 : activeSnapPointIndex - 1;
		const snapPointDistance = isOverlaySnapPoint ? snapPointsOffset[targetSnapPointIndex] - snapPointsOffset[targetSnapPointIndex - 1] : snapPointsOffset[targetSnapPointIndex + 1] - snapPointsOffset[targetSnapPointIndex];
		const percentageDragged = absDraggedDistance / Math.abs(snapPointDistance);
		if (isOverlaySnapPoint) return 1 - percentageDragged;
		else return percentageDragged;
	}
	return {
		isLastSnapPoint,
		activeSnapPoint,
		shouldFade,
		getPercentageDragged,
		setActiveSnapPoint,
		activeSnapPointIndex,
		onRelease,
		onDrag,
		snapPointsOffset
	};
}
function useScaleBackground() {
	const { direction, isOpen, shouldScaleBackground, setBackgroundColorOnScale, noBodyStyles } = useDrawerContext();
	const timeoutIdRef = import_react.useRef(null);
	const initialBackgroundColor = (0, import_react.useMemo)(() => document.body.style.backgroundColor, []);
	function getScale() {
		return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
	}
	import_react.useEffect(() => {
		if (isOpen && shouldScaleBackground) {
			if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
			const wrapper = document.querySelector("[data-vaul-drawer-wrapper]") || document.querySelector("[vaul-drawer-wrapper]");
			if (!wrapper) return;
			setBackgroundColorOnScale && !noBodyStyles && assignStyle(document.body, { background: "black" }), assignStyle(wrapper, {
				transformOrigin: isVertical$1(direction) ? "top" : "left",
				transitionProperty: "transform, border-radius",
				transitionDuration: `${TRANSITIONS.DURATION}s`,
				transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`
			});
			const wrapperStylesCleanup = assignStyle(wrapper, {
				borderRadius: `${BORDER_RADIUS}px`,
				overflow: "hidden",
				...isVertical$1(direction) ? { transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)` } : { transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)` }
			});
			return () => {
				wrapperStylesCleanup();
				timeoutIdRef.current = window.setTimeout(() => {
					if (initialBackgroundColor) document.body.style.background = initialBackgroundColor;
					else document.body.style.removeProperty("background");
				}, TRANSITIONS.DURATION * 1e3);
			};
		}
	}, [
		isOpen,
		shouldScaleBackground,
		initialBackgroundColor
	]);
}
var previousBodyPosition = null;
/**
* This hook is necessary to prevent buggy behavior on iOS devices (need to test on Android).
* I won't get into too much detail about what bugs it solves, but so far I've found that setting the body to `position: fixed` is the most reliable way to prevent those bugs.
* Issues that this hook solves:
* https://github.com/emilkowalski/vaul/issues/435
* https://github.com/emilkowalski/vaul/issues/433
* And more that I discovered, but were just not reported.
*/ function usePositionFixed({ isOpen, modal, nested, hasBeenOpened, preventScrollRestoration, noBodyStyles }) {
	const [activeUrl, setActiveUrl] = import_react.useState(() => typeof window !== "undefined" ? window.location.href : "");
	const scrollPos = import_react.useRef(0);
	const setPositionFixed = import_react.useCallback(() => {
		if (!isSafari()) return;
		if (previousBodyPosition === null && isOpen && !noBodyStyles) {
			previousBodyPosition = {
				position: document.body.style.position,
				top: document.body.style.top,
				left: document.body.style.left,
				height: document.body.style.height,
				right: "unset"
			};
			const { scrollX, innerHeight } = window;
			document.body.style.setProperty("position", "fixed", "important");
			Object.assign(document.body.style, {
				top: `${-scrollPos.current}px`,
				left: `${-scrollX}px`,
				right: "0px",
				height: "auto"
			});
			window.setTimeout(() => window.requestAnimationFrame(() => {
				const bottomBarHeight = innerHeight - window.innerHeight;
				if (bottomBarHeight && scrollPos.current >= innerHeight) document.body.style.top = `${-(scrollPos.current + bottomBarHeight)}px`;
			}), 300);
		}
	}, [isOpen]);
	const restorePositionSetting = import_react.useCallback(() => {
		if (!isSafari()) return;
		if (previousBodyPosition !== null && !noBodyStyles) {
			const y = -parseInt(document.body.style.top, 10);
			const x = -parseInt(document.body.style.left, 10);
			Object.assign(document.body.style, previousBodyPosition);
			window.requestAnimationFrame(() => {
				if (preventScrollRestoration && activeUrl !== window.location.href) {
					setActiveUrl(window.location.href);
					return;
				}
				window.scrollTo(x, y);
			});
			previousBodyPosition = null;
		}
	}, [activeUrl]);
	import_react.useEffect(() => {
		function onScroll() {
			scrollPos.current = window.scrollY;
		}
		onScroll();
		window.addEventListener("scroll", onScroll);
		return () => {
			window.removeEventListener("scroll", onScroll);
		};
	}, []);
	import_react.useEffect(() => {
		if (!modal) return;
		return () => {
			if (typeof document === "undefined") return;
			if (!!document.querySelector("[data-vaul-drawer]")) return;
			restorePositionSetting();
		};
	}, [modal, restorePositionSetting]);
	import_react.useEffect(() => {
		if (nested || !hasBeenOpened) return;
		if (isOpen) {
			!window.matchMedia("(display-mode: standalone)").matches && setPositionFixed();
			if (!modal) window.setTimeout(() => {
				restorePositionSetting();
			}, 500);
		} else restorePositionSetting();
	}, [
		isOpen,
		hasBeenOpened,
		activeUrl,
		modal,
		nested,
		setPositionFixed,
		restorePositionSetting
	]);
	return { restorePositionSetting };
}
function Root({ open: openProp, onOpenChange, children, onDrag: onDragProp, onRelease: onReleaseProp, snapPoints, shouldScaleBackground = false, setBackgroundColorOnScale = true, closeThreshold = CLOSE_THRESHOLD, scrollLockTimeout = SCROLL_LOCK_TIMEOUT, dismissible = true, handleOnly = false, fadeFromIndex = snapPoints && snapPoints.length - 1, activeSnapPoint: activeSnapPointProp, setActiveSnapPoint: setActiveSnapPointProp, fixed, modal = true, onClose, nested, noBodyStyles = false, direction = "bottom", defaultOpen = false, disablePreventScroll = true, snapToSequentialPoint = false, preventScrollRestoration = false, repositionInputs = true, onAnimationEnd, container, autoFocus = false }) {
	var _drawerRef_current, _drawerRef_current1;
	const [isOpen = false, setIsOpen] = useControllableState({
		defaultProp: defaultOpen,
		prop: openProp,
		onChange: (o) => {
			onOpenChange?.(o);
			if (!o && !nested) restorePositionSetting();
			setTimeout(() => {
				onAnimationEnd?.(o);
			}, TRANSITIONS.DURATION * 1e3);
			if (o && !modal) {
				if (typeof window !== "undefined") window.requestAnimationFrame(() => {
					document.body.style.pointerEvents = "auto";
				});
			}
			if (!o) document.body.style.pointerEvents = "auto";
		}
	});
	const [hasBeenOpened, setHasBeenOpened] = import_react.useState(false);
	const [isDragging, setIsDragging] = import_react.useState(false);
	const [justReleased, setJustReleased] = import_react.useState(false);
	const overlayRef = import_react.useRef(null);
	const openTime = import_react.useRef(null);
	const dragStartTime = import_react.useRef(null);
	const dragEndTime = import_react.useRef(null);
	const lastTimeDragPrevented = import_react.useRef(null);
	const isAllowedToDrag = import_react.useRef(false);
	const nestedOpenChangeTimer = import_react.useRef(null);
	const pointerStart = import_react.useRef(0);
	const keyboardIsOpen = import_react.useRef(false);
	const shouldAnimate = import_react.useRef(!defaultOpen);
	const previousDiffFromInitial = import_react.useRef(0);
	const drawerRef = import_react.useRef(null);
	const drawerHeightRef = import_react.useRef(((_drawerRef_current = drawerRef.current) == null ? void 0 : _drawerRef_current.getBoundingClientRect().height) || 0);
	const drawerWidthRef = import_react.useRef(((_drawerRef_current1 = drawerRef.current) == null ? void 0 : _drawerRef_current1.getBoundingClientRect().width) || 0);
	const initialDrawerHeight = import_react.useRef(0);
	const { activeSnapPoint, activeSnapPointIndex, setActiveSnapPoint, onRelease: onReleaseSnapPoints, snapPointsOffset, onDrag: onDragSnapPoints, shouldFade, getPercentageDragged: getSnapPointsPercentageDragged } = useSnapPoints({
		snapPoints,
		activeSnapPointProp,
		setActiveSnapPointProp,
		drawerRef,
		fadeFromIndex,
		overlayRef,
		onSnapPointChange: import_react.useCallback((activeSnapPointIndex) => {
			if (snapPoints && activeSnapPointIndex === snapPointsOffset.length - 1) openTime.current = /* @__PURE__ */ new Date();
		}, []),
		direction,
		container,
		snapToSequentialPoint
	});
	usePreventScroll({ isDisabled: !isOpen || isDragging || !modal || justReleased || !hasBeenOpened || !repositionInputs || !disablePreventScroll });
	const { restorePositionSetting } = usePositionFixed({
		isOpen,
		modal,
		nested: nested != null ? nested : false,
		hasBeenOpened,
		preventScrollRestoration,
		noBodyStyles
	});
	function getScale() {
		return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
	}
	function onPress(event) {
		var _drawerRef_current, _drawerRef_current1;
		if (!dismissible && !snapPoints) return;
		if (drawerRef.current && !drawerRef.current.contains(event.target)) return;
		drawerHeightRef.current = ((_drawerRef_current = drawerRef.current) == null ? void 0 : _drawerRef_current.getBoundingClientRect().height) || 0;
		drawerWidthRef.current = ((_drawerRef_current1 = drawerRef.current) == null ? void 0 : _drawerRef_current1.getBoundingClientRect().width) || 0;
		setIsDragging(true);
		dragStartTime.current = /* @__PURE__ */ new Date();
		if (isIOS$1()) window.addEventListener("touchend", () => isAllowedToDrag.current = false, { once: true });
		event.target.setPointerCapture(event.pointerId);
		pointerStart.current = isVertical$1(direction) ? event.pageY : event.pageX;
	}
	function shouldDrag(el, isDraggingInDirection) {
		var _window_getSelection;
		let element = el;
		const highlightedText = (_window_getSelection = window.getSelection()) == null ? void 0 : _window_getSelection.toString();
		const swipeAmount = drawerRef.current ? getTranslate(drawerRef.current, direction) : null;
		const date = /* @__PURE__ */ new Date();
		if (element.tagName === "SELECT") return false;
		if (element.hasAttribute("data-vaul-no-drag") || element.closest("[data-vaul-no-drag]")) return false;
		if (direction === "right" || direction === "left") return true;
		if (openTime.current && date.getTime() - openTime.current.getTime() < 500) return false;
		if (swipeAmount !== null) {
			if (direction === "bottom" ? swipeAmount > 0 : swipeAmount < 0) return true;
		}
		if (highlightedText && highlightedText.length > 0) return false;
		if (lastTimeDragPrevented.current && date.getTime() - lastTimeDragPrevented.current.getTime() < scrollLockTimeout && swipeAmount === 0) {
			lastTimeDragPrevented.current = date;
			return false;
		}
		if (isDraggingInDirection) {
			lastTimeDragPrevented.current = date;
			return false;
		}
		while (element) {
			if (element.scrollHeight > element.clientHeight) {
				if (element.scrollTop !== 0) {
					lastTimeDragPrevented.current = /* @__PURE__ */ new Date();
					return false;
				}
				if (element.getAttribute("role") === "dialog") return true;
			}
			element = element.parentNode;
		}
		return true;
	}
	function onDrag(event) {
		if (!drawerRef.current) return;
		if (isDragging) {
			const directionMultiplier = direction === "bottom" || direction === "right" ? 1 : -1;
			const draggedDistance = (pointerStart.current - (isVertical$1(direction) ? event.pageY : event.pageX)) * directionMultiplier;
			const isDraggingInDirection = draggedDistance > 0;
			const noCloseSnapPointsPreCondition = snapPoints && !dismissible && !isDraggingInDirection;
			if (noCloseSnapPointsPreCondition && activeSnapPointIndex === 0) return;
			const absDraggedDistance = Math.abs(draggedDistance);
			const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
			let percentageDragged = absDraggedDistance / (direction === "bottom" || direction === "top" ? drawerHeightRef.current : drawerWidthRef.current);
			const snapPointPercentageDragged = getSnapPointsPercentageDragged(absDraggedDistance, isDraggingInDirection);
			if (snapPointPercentageDragged !== null) percentageDragged = snapPointPercentageDragged;
			if (noCloseSnapPointsPreCondition && percentageDragged >= 1) return;
			if (!isAllowedToDrag.current && !shouldDrag(event.target, isDraggingInDirection)) return;
			drawerRef.current.classList.add(DRAG_CLASS);
			isAllowedToDrag.current = true;
			set(drawerRef.current, { transition: "none" });
			set(overlayRef.current, { transition: "none" });
			if (snapPoints) onDragSnapPoints({ draggedDistance });
			if (isDraggingInDirection && !snapPoints) {
				const dampenedDraggedDistance = dampenValue(draggedDistance);
				const translateValue = Math.min(dampenedDraggedDistance * -1, 0) * directionMultiplier;
				set(drawerRef.current, { transform: isVertical$1(direction) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)` });
				return;
			}
			const opacityValue = 1 - percentageDragged;
			if (shouldFade || fadeFromIndex && activeSnapPointIndex === fadeFromIndex - 1) {
				onDragProp?.(event, percentageDragged);
				set(overlayRef.current, {
					opacity: `${opacityValue}`,
					transition: "none"
				}, true);
			}
			if (wrapper && overlayRef.current && shouldScaleBackground) {
				const scaleValue = Math.min(getScale() + percentageDragged * (1 - getScale()), 1);
				const borderRadiusValue = 8 - percentageDragged * 8;
				const translateValue = Math.max(0, 14 - percentageDragged * 14);
				set(wrapper, {
					borderRadius: `${borderRadiusValue}px`,
					transform: isVertical$1(direction) ? `scale(${scaleValue}) translate3d(0, ${translateValue}px, 0)` : `scale(${scaleValue}) translate3d(${translateValue}px, 0, 0)`,
					transition: "none"
				}, true);
			}
			if (!snapPoints) {
				const translateValue = absDraggedDistance * directionMultiplier;
				set(drawerRef.current, { transform: isVertical$1(direction) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)` });
			}
		}
	}
	import_react.useEffect(() => {
		window.requestAnimationFrame(() => {
			shouldAnimate.current = true;
		});
	}, []);
	import_react.useEffect(() => {
		var _window_visualViewport;
		function onVisualViewportChange() {
			if (!drawerRef.current || !repositionInputs) return;
			if (isInput(document.activeElement) || keyboardIsOpen.current) {
				var _window_visualViewport;
				const visualViewportHeight = ((_window_visualViewport = window.visualViewport) == null ? void 0 : _window_visualViewport.height) || 0;
				const totalHeight = window.innerHeight;
				let diffFromInitial = totalHeight - visualViewportHeight;
				const drawerHeight = drawerRef.current.getBoundingClientRect().height || 0;
				const isTallEnough = drawerHeight > totalHeight * .8;
				if (!initialDrawerHeight.current) initialDrawerHeight.current = drawerHeight;
				const offsetFromTop = drawerRef.current.getBoundingClientRect().top;
				if (Math.abs(previousDiffFromInitial.current - diffFromInitial) > 60) keyboardIsOpen.current = !keyboardIsOpen.current;
				if (snapPoints && snapPoints.length > 0 && snapPointsOffset && activeSnapPointIndex) {
					const activeSnapPointHeight = snapPointsOffset[activeSnapPointIndex] || 0;
					diffFromInitial += activeSnapPointHeight;
				}
				previousDiffFromInitial.current = diffFromInitial;
				if (drawerHeight > visualViewportHeight || keyboardIsOpen.current) {
					const height = drawerRef.current.getBoundingClientRect().height;
					let newDrawerHeight = height;
					if (height > visualViewportHeight) newDrawerHeight = visualViewportHeight - (isTallEnough ? offsetFromTop : WINDOW_TOP_OFFSET);
					if (fixed) drawerRef.current.style.height = `${height - Math.max(diffFromInitial, 0)}px`;
					else drawerRef.current.style.height = `${Math.max(newDrawerHeight, visualViewportHeight - offsetFromTop)}px`;
				} else if (!isMobileFirefox()) drawerRef.current.style.height = `${initialDrawerHeight.current}px`;
				if (snapPoints && snapPoints.length > 0 && !keyboardIsOpen.current) drawerRef.current.style.bottom = `0px`;
				else drawerRef.current.style.bottom = `${Math.max(diffFromInitial, 0)}px`;
			}
		}
		(_window_visualViewport = window.visualViewport) == null || _window_visualViewport.addEventListener("resize", onVisualViewportChange);
		return () => {
			var _window_visualViewport;
			return (_window_visualViewport = window.visualViewport) == null ? void 0 : _window_visualViewport.removeEventListener("resize", onVisualViewportChange);
		};
	}, [
		activeSnapPointIndex,
		snapPoints,
		snapPointsOffset
	]);
	function closeDrawer(fromWithin) {
		cancelDrag();
		onClose?.();
		if (!fromWithin) setIsOpen(false);
		setTimeout(() => {
			if (snapPoints) setActiveSnapPoint(snapPoints[0]);
		}, TRANSITIONS.DURATION * 1e3);
	}
	function resetDrawer() {
		if (!drawerRef.current) return;
		const wrapper = document.querySelector("[data-vaul-drawer-wrapper]");
		const currentSwipeAmount = getTranslate(drawerRef.current, direction);
		set(drawerRef.current, {
			transform: "translate3d(0, 0, 0)",
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`
		});
		set(overlayRef.current, {
			transition: `opacity ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			opacity: "1"
		});
		if (shouldScaleBackground && currentSwipeAmount && currentSwipeAmount > 0 && isOpen) set(wrapper, {
			borderRadius: `${BORDER_RADIUS}px`,
			overflow: "hidden",
			...isVertical$1(direction) ? {
				transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)`,
				transformOrigin: "top"
			} : {
				transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)`,
				transformOrigin: "left"
			},
			transitionProperty: "transform, border-radius",
			transitionDuration: `${TRANSITIONS.DURATION}s`,
			transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(",")})`
		}, true);
	}
	function cancelDrag() {
		if (!isDragging || !drawerRef.current) return;
		drawerRef.current.classList.remove(DRAG_CLASS);
		isAllowedToDrag.current = false;
		setIsDragging(false);
		dragEndTime.current = /* @__PURE__ */ new Date();
	}
	function onRelease(event) {
		if (!isDragging || !drawerRef.current) return;
		drawerRef.current.classList.remove(DRAG_CLASS);
		isAllowedToDrag.current = false;
		setIsDragging(false);
		dragEndTime.current = /* @__PURE__ */ new Date();
		const swipeAmount = getTranslate(drawerRef.current, direction);
		if (!event || !shouldDrag(event.target, false) || !swipeAmount || Number.isNaN(swipeAmount)) return;
		if (dragStartTime.current === null) return;
		const timeTaken = dragEndTime.current.getTime() - dragStartTime.current.getTime();
		const distMoved = pointerStart.current - (isVertical$1(direction) ? event.pageY : event.pageX);
		const velocity = Math.abs(distMoved) / timeTaken;
		if (velocity > .05) {
			setJustReleased(true);
			setTimeout(() => {
				setJustReleased(false);
			}, 200);
		}
		if (snapPoints) {
			onReleaseSnapPoints({
				draggedDistance: distMoved * (direction === "bottom" || direction === "right" ? 1 : -1),
				closeDrawer,
				velocity,
				dismissible
			});
			onReleaseProp?.(event, true);
			return;
		}
		if (direction === "bottom" || direction === "right" ? distMoved > 0 : distMoved < 0) {
			resetDrawer();
			onReleaseProp?.(event, true);
			return;
		}
		if (velocity > VELOCITY_THRESHOLD) {
			closeDrawer();
			onReleaseProp?.(event, false);
			return;
		}
		var _drawerRef_current_getBoundingClientRect_height;
		const visibleDrawerHeight = Math.min((_drawerRef_current_getBoundingClientRect_height = drawerRef.current.getBoundingClientRect().height) != null ? _drawerRef_current_getBoundingClientRect_height : 0, window.innerHeight);
		var _drawerRef_current_getBoundingClientRect_width;
		const visibleDrawerWidth = Math.min((_drawerRef_current_getBoundingClientRect_width = drawerRef.current.getBoundingClientRect().width) != null ? _drawerRef_current_getBoundingClientRect_width : 0, window.innerWidth);
		if (Math.abs(swipeAmount) >= (direction === "left" || direction === "right" ? visibleDrawerWidth : visibleDrawerHeight) * closeThreshold) {
			closeDrawer();
			onReleaseProp?.(event, false);
			return;
		}
		onReleaseProp?.(event, true);
		resetDrawer();
	}
	import_react.useEffect(() => {
		if (isOpen) {
			set(document.documentElement, { scrollBehavior: "auto" });
			openTime.current = /* @__PURE__ */ new Date();
		}
		return () => {
			reset(document.documentElement, "scrollBehavior");
		};
	}, [isOpen]);
	function onNestedOpenChange(o) {
		const scale = o ? (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth : 1;
		const initialTranslate = o ? -16 : 0;
		if (nestedOpenChangeTimer.current) window.clearTimeout(nestedOpenChangeTimer.current);
		set(drawerRef.current, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical$1(direction) ? `scale(${scale}) translate3d(0, ${initialTranslate}px, 0)` : `scale(${scale}) translate3d(${initialTranslate}px, 0, 0)`
		});
		if (!o && drawerRef.current) nestedOpenChangeTimer.current = setTimeout(() => {
			const translateValue = getTranslate(drawerRef.current, direction);
			set(drawerRef.current, {
				transition: "none",
				transform: isVertical$1(direction) ? `translate3d(0, ${translateValue}px, 0)` : `translate3d(${translateValue}px, 0, 0)`
			});
		}, 500);
	}
	function onNestedDrag(_event, percentageDragged) {
		if (percentageDragged < 0) return;
		const initialScale = (window.innerWidth - NESTED_DISPLACEMENT) / window.innerWidth;
		const newScale = initialScale + percentageDragged * (1 - initialScale);
		const newTranslate = -16 + percentageDragged * NESTED_DISPLACEMENT;
		set(drawerRef.current, {
			transform: isVertical$1(direction) ? `scale(${newScale}) translate3d(0, ${newTranslate}px, 0)` : `scale(${newScale}) translate3d(${newTranslate}px, 0, 0)`,
			transition: "none"
		});
	}
	function onNestedRelease(_event, o) {
		const dim = isVertical$1(direction) ? window.innerHeight : window.innerWidth;
		const scale = o ? (dim - NESTED_DISPLACEMENT) / dim : 1;
		const translate = o ? -16 : 0;
		if (o) set(drawerRef.current, {
			transition: `transform ${TRANSITIONS.DURATION}s cubic-bezier(${TRANSITIONS.EASE.join(",")})`,
			transform: isVertical$1(direction) ? `scale(${scale}) translate3d(0, ${translate}px, 0)` : `scale(${scale}) translate3d(${translate}px, 0, 0)`
		});
	}
	import_react.useEffect(() => {
		if (!modal) window.requestAnimationFrame(() => {
			document.body.style.pointerEvents = "auto";
		});
	}, [modal]);
	return /*#__PURE__*/ import_react.createElement(Dialog$1, {
		defaultOpen,
		onOpenChange: (open) => {
			if (!dismissible && !open) return;
			if (open) setHasBeenOpened(true);
			else closeDrawer(true);
			setIsOpen(open);
		},
		open: isOpen
	}, /*#__PURE__*/ import_react.createElement(DrawerContext.Provider, { value: {
		activeSnapPoint,
		snapPoints,
		setActiveSnapPoint,
		drawerRef,
		overlayRef,
		onOpenChange,
		onPress,
		onRelease,
		onDrag,
		dismissible,
		shouldAnimate,
		handleOnly,
		isOpen,
		isDragging,
		shouldFade,
		closeDrawer,
		onNestedDrag,
		onNestedOpenChange,
		onNestedRelease,
		keyboardIsOpen,
		modal,
		snapPointsOffset,
		activeSnapPointIndex,
		direction,
		shouldScaleBackground,
		setBackgroundColorOnScale,
		noBodyStyles,
		container,
		autoFocus
	} }, children));
}
var Overlay = /*#__PURE__*/ import_react.forwardRef(function({ ...rest }, ref) {
	const { overlayRef, snapPoints, onRelease, shouldFade, isOpen, modal, shouldAnimate } = useDrawerContext();
	const composedRef = useComposedRefs(ref, overlayRef);
	const hasSnapPoints = snapPoints && snapPoints.length > 0;
	if (!modal) return null;
	const onMouseUp = import_react.useCallback((event) => onRelease(event), [onRelease]);
	return /*#__PURE__*/ import_react.createElement(DialogOverlay, {
		onMouseUp,
		ref: composedRef,
		"data-vaul-overlay": "",
		"data-vaul-snap-points": isOpen && hasSnapPoints ? "true" : "false",
		"data-vaul-snap-points-overlay": isOpen && shouldFade ? "true" : "false",
		"data-vaul-animate": (shouldAnimate == null ? void 0 : shouldAnimate.current) ? "true" : "false",
		...rest
	});
});
Overlay.displayName = "Drawer.Overlay";
var Content = /*#__PURE__*/ import_react.forwardRef(function({ onPointerDownOutside, style, onOpenAutoFocus, ...rest }, ref) {
	const { drawerRef, onPress, onRelease, onDrag, keyboardIsOpen, snapPointsOffset, activeSnapPointIndex, modal, isOpen, direction, snapPoints, container, handleOnly, shouldAnimate, autoFocus } = useDrawerContext();
	const [delayedSnapPoints, setDelayedSnapPoints] = import_react.useState(false);
	const composedRef = useComposedRefs(ref, drawerRef);
	const pointerStartRef = import_react.useRef(null);
	const lastKnownPointerEventRef = import_react.useRef(null);
	const wasBeyondThePointRef = import_react.useRef(false);
	const hasSnapPoints = snapPoints && snapPoints.length > 0;
	useScaleBackground();
	const isDeltaInDirection = (delta, direction, threshold = 0) => {
		if (wasBeyondThePointRef.current) return true;
		const deltaY = Math.abs(delta.y);
		const deltaX = Math.abs(delta.x);
		const isDeltaX = deltaX > deltaY;
		const dFactor = ["bottom", "right"].includes(direction) ? 1 : -1;
		if (direction === "left" || direction === "right") {
			if (!(delta.x * dFactor < 0) && deltaX >= 0 && deltaX <= threshold) return isDeltaX;
		} else if (!(delta.y * dFactor < 0) && deltaY >= 0 && deltaY <= threshold) return !isDeltaX;
		wasBeyondThePointRef.current = true;
		return true;
	};
	import_react.useEffect(() => {
		if (hasSnapPoints) window.requestAnimationFrame(() => {
			setDelayedSnapPoints(true);
		});
	}, []);
	function handleOnPointerUp(event) {
		pointerStartRef.current = null;
		wasBeyondThePointRef.current = false;
		onRelease(event);
	}
	return /*#__PURE__*/ import_react.createElement(DialogContent$1, {
		"data-vaul-drawer-direction": direction,
		"data-vaul-drawer": "",
		"data-vaul-delayed-snap-points": delayedSnapPoints ? "true" : "false",
		"data-vaul-snap-points": isOpen && hasSnapPoints ? "true" : "false",
		"data-vaul-custom-container": container ? "true" : "false",
		"data-vaul-animate": (shouldAnimate == null ? void 0 : shouldAnimate.current) ? "true" : "false",
		...rest,
		ref: composedRef,
		style: snapPointsOffset && snapPointsOffset.length > 0 ? {
			"--snap-point-height": `${snapPointsOffset[activeSnapPointIndex != null ? activeSnapPointIndex : 0]}px`,
			...style
		} : style,
		onPointerDown: (event) => {
			if (handleOnly) return;
			rest.onPointerDown == null || rest.onPointerDown.call(rest, event);
			pointerStartRef.current = {
				x: event.pageX,
				y: event.pageY
			};
			onPress(event);
		},
		onOpenAutoFocus: (e) => {
			onOpenAutoFocus?.(e);
			if (!autoFocus) e.preventDefault();
		},
		onPointerDownOutside: (e) => {
			onPointerDownOutside?.(e);
			if (!modal || e.defaultPrevented) {
				e.preventDefault();
				return;
			}
			if (keyboardIsOpen.current) keyboardIsOpen.current = false;
		},
		onFocusOutside: (e) => {
			if (!modal) {
				e.preventDefault();
				return;
			}
		},
		onPointerMove: (event) => {
			lastKnownPointerEventRef.current = event;
			if (handleOnly) return;
			rest.onPointerMove == null || rest.onPointerMove.call(rest, event);
			if (!pointerStartRef.current) return;
			const yPosition = event.pageY - pointerStartRef.current.y;
			const xPosition = event.pageX - pointerStartRef.current.x;
			const swipeStartThreshold = event.pointerType === "touch" ? 10 : 2;
			if (isDeltaInDirection({
				x: xPosition,
				y: yPosition
			}, direction, swipeStartThreshold)) onDrag(event);
			else if (Math.abs(xPosition) > swipeStartThreshold || Math.abs(yPosition) > swipeStartThreshold) pointerStartRef.current = null;
		},
		onPointerUp: (event) => {
			rest.onPointerUp == null || rest.onPointerUp.call(rest, event);
			pointerStartRef.current = null;
			wasBeyondThePointRef.current = false;
			onRelease(event);
		},
		onPointerOut: (event) => {
			rest.onPointerOut == null || rest.onPointerOut.call(rest, event);
			handleOnPointerUp(lastKnownPointerEventRef.current);
		},
		onContextMenu: (event) => {
			rest.onContextMenu == null || rest.onContextMenu.call(rest, event);
			if (lastKnownPointerEventRef.current) handleOnPointerUp(lastKnownPointerEventRef.current);
		}
	});
});
Content.displayName = "Drawer.Content";
var LONG_HANDLE_PRESS_TIMEOUT = 250;
var DOUBLE_TAP_TIMEOUT = 120;
var Handle = /*#__PURE__*/ import_react.forwardRef(function({ preventCycle = false, children, ...rest }, ref) {
	const { closeDrawer, isDragging, snapPoints, activeSnapPoint, setActiveSnapPoint, dismissible, handleOnly, isOpen, onPress, onDrag } = useDrawerContext();
	const closeTimeoutIdRef = import_react.useRef(null);
	const shouldCancelInteractionRef = import_react.useRef(false);
	function handleStartCycle() {
		if (shouldCancelInteractionRef.current) {
			handleCancelInteraction();
			return;
		}
		window.setTimeout(() => {
			handleCycleSnapPoints();
		}, DOUBLE_TAP_TIMEOUT);
	}
	function handleCycleSnapPoints() {
		if (isDragging || preventCycle || shouldCancelInteractionRef.current) {
			handleCancelInteraction();
			return;
		}
		handleCancelInteraction();
		if (!snapPoints || snapPoints.length === 0) {
			if (!dismissible) closeDrawer();
			return;
		}
		if (activeSnapPoint === snapPoints[snapPoints.length - 1] && dismissible) {
			closeDrawer();
			return;
		}
		const currentSnapIndex = snapPoints.findIndex((point) => point === activeSnapPoint);
		if (currentSnapIndex === -1) return;
		const nextSnapPoint = snapPoints[currentSnapIndex + 1];
		setActiveSnapPoint(nextSnapPoint);
	}
	function handleStartInteraction() {
		closeTimeoutIdRef.current = window.setTimeout(() => {
			shouldCancelInteractionRef.current = true;
		}, LONG_HANDLE_PRESS_TIMEOUT);
	}
	function handleCancelInteraction() {
		if (closeTimeoutIdRef.current) window.clearTimeout(closeTimeoutIdRef.current);
		shouldCancelInteractionRef.current = false;
	}
	return /*#__PURE__*/ import_react.createElement("div", {
		onClick: handleStartCycle,
		onPointerCancel: handleCancelInteraction,
		onPointerDown: (e) => {
			if (handleOnly) onPress(e);
			handleStartInteraction();
		},
		onPointerMove: (e) => {
			if (handleOnly) onDrag(e);
		},
		ref,
		"data-vaul-drawer-visible": isOpen ? "true" : "false",
		"data-vaul-handle": "",
		"aria-hidden": "true",
		...rest
	}, /*#__PURE__*/ import_react.createElement("span", {
		"data-vaul-handle-hitarea": "",
		"aria-hidden": "true"
	}, children));
});
Handle.displayName = "Drawer.Handle";
function NestedRoot({ onDrag, onOpenChange, open: nestedIsOpen, ...rest }) {
	const { onNestedDrag, onNestedOpenChange, onNestedRelease } = useDrawerContext();
	if (!onNestedDrag) throw new Error("Drawer.NestedRoot must be placed in another drawer");
	return /*#__PURE__*/ import_react.createElement(Root, {
		nested: true,
		open: nestedIsOpen,
		onClose: () => {
			onNestedOpenChange(false);
		},
		onDrag: (e, p) => {
			onNestedDrag(e, p);
			onDrag?.(e, p);
		},
		onOpenChange: (o) => {
			if (o) onNestedOpenChange(o);
			onOpenChange?.(o);
		},
		onRelease: onNestedRelease,
		...rest
	});
}
function Portal(props) {
	const context = useDrawerContext();
	const { container = context.container, ...portalProps } = props;
	return /*#__PURE__*/ import_react.createElement(DialogPortal, {
		container,
		...portalProps
	});
}
var Drawer = {
	Root,
	NestedRoot,
	Content,
	Overlay,
	Trigger: DialogTrigger,
	Portal,
	Handle,
	Close: DialogClose$1,
	Title: DialogTitle$1,
	Description: DialogDescription$1
};
// node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
var toKebabCase = (value) => (value.match(/\d+[xX]\d+|[A-Z]?[a-z]+|[A-Z]|\d+/g) ?? []).join("-").toLowerCase();
// node_modules/lucide-react/dist/esm/shared/src/utils/toLucideIconData.mjs
function toLucideIconData(iconName, iconNode, aliases = []) {
	if (iconNode == null) throw new Error("[lucide]: iconNode is required when icon name is used");
	return {
		name: toKebabCase(iconName),
		size: 24,
		node: iconNode,
		...aliases.length > 0 ? { aliases } : {}
	};
}
// node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
var toCamelCase = (string) => {
	let out = "";
	let upperNext = false;
	for (const ch of string) {
		if (ch === "-" || ch === "_" || ch <= " ") {
			upperNext = out.length > 0;
			continue;
		}
		if (out.length === 0) out += ch.toLowerCase();
		else out += upperNext ? ch.toUpperCase() : ch;
		upperNext = false;
	}
	return out;
};
// node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
var toPascalCase = (string) => {
	const camelCase = toCamelCase(string);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
// node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
var mergeClasses = (...classes) => {
	const tokens = /* @__PURE__ */ new Set();
	for (const cls of classes) {
		if (typeof cls !== "string") continue;
		for (const token of cls.split(/\s+/)) if (token) tokens.add(token);
	}
	return [...tokens].join(" ");
};
// node_modules/lucide-react/dist/esm/shared/src/build/defaultAttributes.mjs
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": 2,
	"stroke-linecap": "round",
	"stroke-linejoin": "round"
};
// node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconNode.mjs
function isDefined(value) {
	return value !== null && value !== void 0;
}
function buildLucideIconNode(icon, params = {}) {
	const attributeNames = params.attributeNames ?? {};
	const getAttributeName = (attributeName) => attributeNames[attributeName] ?? attributeName;
	const viewBoxWidth = icon.size ?? icon.width ?? defaultAttributes["width"];
	const viewBoxHeight = icon.size ?? icon.height ?? defaultAttributes["height"];
	const aliasClassNames = icon.aliases?.filter((alias) => typeof alias === "string" && alias.trim() !== "").map((alias) => `lucide-${alias}`) ?? [];
	const iconClassNames = [...icon.name ? [`lucide-${icon.name}`] : [], ...aliasClassNames];
	const classNamesFromClassName = params.className?.split(" ").filter(Boolean) ?? [];
	const className = params.includeDefaultClasses === false ? mergeClasses(...classNamesFromClassName) : mergeClasses("lucide", ...iconClassNames, ...classNamesFromClassName);
	let calculatedStrokeWidth = params.strokeWidth ?? defaultAttributes["stroke-width"];
	if (params.absoluteStrokeWidth) {
		const scaled = Number(calculatedStrokeWidth) * Number(icon.size ?? icon.width ?? defaultAttributes["width"]) / Number(params.size ?? params.width ?? defaultAttributes["width"]);
		if (Number.isFinite(scaled)) calculatedStrokeWidth = scaled;
	}
	return [
		"svg",
		{
			...Object.entries(defaultAttributes).reduce((attrs, [attrName, value]) => {
				attrs[getAttributeName(attrName)] = value;
				return attrs;
			}, {}),
			..."color" in params && params.color && { [getAttributeName("stroke")]: params.color },
			..."size" in params && isDefined(params.size) && {
				[getAttributeName("width")]: params.size,
				[getAttributeName("height")]: params.size
			},
			..."width" in params && isDefined(params.width) && { [getAttributeName("width")]: params.width },
			..."height" in params && isDefined(params.height) && { [getAttributeName("height")]: params.height },
			[getAttributeName("stroke-width")]: calculatedStrokeWidth,
			...className && { [getAttributeName("class")]: className },
			[getAttributeName("viewBox")]: `0 0 ${viewBoxWidth} ${viewBoxHeight}`,
			...params.hasA11yProp === false ? { [getAttributeName("aria-hidden")]: "true" } : {},
			..."attributes" in params && params.attributes
		},
		icon.node.map((child) => {
			const [name, attrs, children] = child;
			const nextAttrs = params.nonScalingStroke ? {
				[getAttributeName("vector-effect")]: "non-scaling-stroke",
				...attrs
			} : attrs;
			return children ? [
				name,
				nextAttrs,
				children
			] : [name, nextAttrs];
		})
	];
}
// node_modules/lucide-react/dist/esm/shared/src/build/buildLucideIconForReact.mjs
function buildLucideIconForReact(icon, params = {}) {
	return buildLucideIconNode(icon, {
		...params,
		attributeNames: {
			...params.attributeNames,
			class: "className",
			"stroke-width": "strokeWidth",
			"stroke-linecap": "strokeLinecap",
			"stroke-linejoin": "strokeLinejoin",
			"vector-effect": "vectorEffect"
		}
	});
}
// node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
var hasA11yProp = (props) => {
	if (props == null || typeof props !== "object") return false;
	for (const prop in props) if (Object.prototype.hasOwnProperty.call(props, prop) && (prop.startsWith("aria-") || prop === "role" || prop === "title") && props[prop] != null) return true;
	return false;
};
// node_modules/lucide-react/dist/esm/context.mjs
var LucideContext = (0, import_react.createContext)({});
var useLucideContext = () => (0, import_react.useContext)(LucideContext);
// node_modules/lucide-react/dist/esm/Icon.mjs
/**
* @license lucide-react v1.81.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Icon = (0, import_react.forwardRef)(({ color, size, width, height, strokeWidth, absoluteStrokeWidth, nonScalingStroke, className = "", children, iconNode = [], icon = {
	node: iconNode,
	aliases: [],
	size: 24
}, ...rest }, ref) => {
	const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, nonScalingStroke: contextNonScalingStroke = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
	const hasAccessibleProp = Boolean(children) || hasA11yProp(rest);
	const [name, svgAttributes, builtIconNode = []] = buildLucideIconForReact(icon, {
		color: color ?? contextColor,
		width: width ?? size ?? contextSize,
		height: height ?? size ?? contextSize,
		strokeWidth: strokeWidth ?? contextStrokeWidth,
		absoluteStrokeWidth: absoluteStrokeWidth ?? contextAbsoluteStrokeWidth,
		nonScalingStroke: nonScalingStroke ?? contextNonScalingStroke,
		className: mergeClasses(contextClass, className),
		hasA11yProp: hasAccessibleProp,
		attributes: rest
	});
	return (0, import_react.createElement)(name, {
		ref,
		...svgAttributes
	}, [...builtIconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
});
// node_modules/lucide-react/dist/esm/createLucideIcon.mjs
function createLucideIcon(iconDataOrName, iconNode = [], aliases = []) {
	const iconData = typeof iconDataOrName === "string" ? toLucideIconData(iconDataOrName, iconNode, aliases) : iconDataOrName;
	const Component = (0, import_react.forwardRef)(({ className, ...props }, ref) => (0, import_react.createElement)(Icon, {
		ref,
		icon: iconData,
		className,
		...props
	}));
	if (iconData.name) Component.displayName = toPascalCase(iconData.name);
	return Component;
}
// node_modules/lucide-react/dist/esm/icons/activity.mjs
var __iconData$86 = {
	name: "activity",
	size: 24,
	node: [["path", {
		d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
		key: "169zse"
	}]]
};
__iconData$86.node;
var Activity = createLucideIcon(__iconData$86);
// node_modules/lucide-react/dist/esm/icons/archive.mjs
var __iconData$85 = {
	name: "archive",
	size: 24,
	node: [
		["rect", {
			width: "20",
			height: "5",
			x: "2",
			y: "3",
			rx: "1",
			key: "1wp1u1"
		}],
		["path", {
			d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",
			key: "1s80jp"
		}],
		["path", {
			d: "M10 12h4",
			key: "a56b0p"
		}]
	]
};
__iconData$85.node;
var Archive = createLucideIcon(__iconData$85);
// node_modules/lucide-react/dist/esm/icons/arrow-down.mjs
var __iconData$84 = {
	name: "arrow-down",
	size: 24,
	node: [["path", {
		d: "M12 5v14",
		key: "s699le"
	}], ["path", {
		d: "m19 12-7 7-7-7",
		key: "1idqje"
	}]]
};
__iconData$84.node;
var ArrowDown = createLucideIcon(__iconData$84);
// node_modules/lucide-react/dist/esm/icons/arrow-right.mjs
var __iconData$83 = {
	name: "arrow-right",
	size: 24,
	node: [["path", {
		d: "M5 12h14",
		key: "1ays0h"
	}], ["path", {
		d: "m12 5 7 7-7 7",
		key: "xquz4c"
	}]]
};
__iconData$83.node;
var ArrowRight = createLucideIcon(__iconData$83);
// node_modules/lucide-react/dist/esm/icons/arrow-up-down.mjs
var __iconData$82 = {
	name: "arrow-up-down",
	size: 24,
	node: [
		["path", {
			d: "m21 16-4 4-4-4",
			key: "f6ql7i"
		}],
		["path", {
			d: "M17 20V4",
			key: "1ejh1v"
		}],
		["path", {
			d: "m3 8 4-4 4 4",
			key: "11wl7u"
		}],
		["path", {
			d: "M7 4v16",
			key: "1glfcx"
		}]
	]
};
__iconData$82.node;
var ArrowUpDown = createLucideIcon(__iconData$82);
// node_modules/lucide-react/dist/esm/icons/arrow-up.mjs
var __iconData$81 = {
	name: "arrow-up",
	size: 24,
	node: [["path", {
		d: "m5 12 7-7 7 7",
		key: "hav0vg"
	}], ["path", {
		d: "M12 19V5",
		key: "x0mq9r"
	}]]
};
__iconData$81.node;
var ArrowUp = createLucideIcon(__iconData$81);
// node_modules/lucide-react/dist/esm/icons/bell-off.mjs
var __iconData$80 = {
	name: "bell-off",
	size: 24,
	node: [
		["path", {
			d: "M10.268 21a2 2 0 0 0 3.464 0",
			key: "vwvbt9"
		}],
		["path", {
			d: "M17 17H4a1 1 0 0 1-.74-1.673C4.59 13.956 6 12.499 6 8a6 6 0 0 1 .258-1.742",
			key: "178tsu"
		}],
		["path", {
			d: "m2 2 20 20",
			key: "1ooewy"
		}],
		["path", {
			d: "M8.668 3.01A6 6 0 0 1 18 8c0 2.687.77 4.653 1.707 6.05",
			key: "1hqiys"
		}]
	]
};
__iconData$80.node;
var BellOff = createLucideIcon(__iconData$80);
// node_modules/lucide-react/dist/esm/icons/bell.mjs
var __iconData$79 = {
	name: "bell",
	size: 24,
	node: [["path", {
		d: "M10.268 21a2 2 0 0 0 3.464 0",
		key: "vwvbt9"
	}], ["path", {
		d: "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",
		key: "11g9vi"
	}]]
};
__iconData$79.node;
var Bell = createLucideIcon(__iconData$79);
// node_modules/lucide-react/dist/esm/icons/blocks.mjs
var __iconData$78 = {
	name: "blocks",
	size: 24,
	node: [["path", {
		d: "M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2",
		key: "1ah6g2"
	}], ["rect", {
		x: "14",
		y: "2",
		width: "8",
		height: "8",
		rx: "1",
		key: "88lufb"
	}]]
};
__iconData$78.node;
var Blocks = createLucideIcon(__iconData$78);
// node_modules/lucide-react/dist/esm/icons/bookmark-plus.mjs
var __iconData$77 = {
	name: "bookmark-plus",
	size: 24,
	node: [
		["path", {
			d: "M12 7v6",
			key: "lw1j43"
		}],
		["path", {
			d: "M15 10H9",
			key: "o6yqo3"
		}],
		["path", {
			d: "M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z",
			key: "oz39mx"
		}]
	]
};
__iconData$77.node;
var BookmarkPlus = createLucideIcon(__iconData$77);
// node_modules/lucide-react/dist/esm/icons/bot.mjs
var __iconData$76 = {
	name: "bot",
	size: 24,
	node: [
		["path", {
			d: "M12 8V4H8",
			key: "hb8ula"
		}],
		["rect", {
			width: "16",
			height: "12",
			x: "4",
			y: "8",
			rx: "2",
			key: "enze0r"
		}],
		["path", {
			d: "M2 14h2",
			key: "vft8re"
		}],
		["path", {
			d: "M20 14h2",
			key: "4cs60a"
		}],
		["path", {
			d: "M15 13v2",
			key: "1xurst"
		}],
		["path", {
			d: "M9 13v2",
			key: "rq6x2g"
		}]
	]
};
__iconData$76.node;
var Bot = createLucideIcon(__iconData$76);
// node_modules/lucide-react/dist/esm/icons/check-check.mjs
var __iconData$75 = {
	name: "check-check",
	size: 24,
	node: [["path", {
		d: "M18 6 7 17l-5-5",
		key: "116fxf"
	}], ["path", {
		d: "m22 10-7.5 7.5L13 16",
		key: "ke71qq"
	}]]
};
__iconData$75.node;
var CheckCheck = createLucideIcon(__iconData$75);
// node_modules/lucide-react/dist/esm/icons/check.mjs
var __iconData$74 = {
	name: "check",
	size: 24,
	node: [["path", {
		d: "M20 6 9 17l-5-5",
		key: "1gmf2c"
	}]]
};
__iconData$74.node;
var Check = createLucideIcon(__iconData$74);
// node_modules/lucide-react/dist/esm/icons/chevron-down.mjs
var __iconData$73 = {
	name: "chevron-down",
	size: 24,
	node: [["path", {
		d: "m6 9 6 6 6-6",
		key: "qrunsl"
	}]]
};
__iconData$73.node;
var ChevronDown = createLucideIcon(__iconData$73);
// node_modules/lucide-react/dist/esm/icons/chevron-right.mjs
var __iconData$72 = {
	name: "chevron-right",
	size: 24,
	node: [["path", {
		d: "m9 18 6-6-6-6",
		key: "mthhwq"
	}]]
};
__iconData$72.node;
var ChevronRight = createLucideIcon(__iconData$72);
// node_modules/lucide-react/dist/esm/icons/circle-check.mjs
var __iconData$71 = {
	name: "circle-check",
	size: 24,
	node: [["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}], ["path", {
		d: "m16 9-5.5 5.5L8 12",
		key: "xofnsj"
	}]],
	aliases: ["check-circle-2"]
};
__iconData$71.node;
var CircleCheck = createLucideIcon(__iconData$71);
// node_modules/lucide-react/dist/esm/icons/circle-dashed.mjs
var __iconData$70 = {
	name: "circle-dashed",
	size: 24,
	node: [
		["path", {
			d: "M10.1 2.182a10 10 0 0 1 3.8 0",
			key: "5ilxe3"
		}],
		["path", {
			d: "M13.9 21.818a10 10 0 0 1-3.8 0",
			key: "11zvb9"
		}],
		["path", {
			d: "M17.609 3.721a10 10 0 0 1 2.69 2.7",
			key: "1iw5b2"
		}],
		["path", {
			d: "M2.182 13.9a10 10 0 0 1 0-3.8",
			key: "c0bmvh"
		}],
		["path", {
			d: "M20.279 17.609a10 10 0 0 1-2.7 2.69",
			key: "1ruxm7"
		}],
		["path", {
			d: "M21.818 10.1a10 10 0 0 1 0 3.8",
			key: "qkgqxc"
		}],
		["path", {
			d: "M3.721 6.391a10 10 0 0 1 2.7-2.69",
			key: "1mcia2"
		}],
		["path", {
			d: "M6.391 20.279a10 10 0 0 1-2.69-2.7",
			key: "1fvljs"
		}]
	]
};
__iconData$70.node;
var CircleDashed = createLucideIcon(__iconData$70);
// node_modules/lucide-react/dist/esm/icons/circle-dot.mjs
var __iconData$69 = {
	name: "circle-dot",
	size: 24,
	node: [["circle", {
		cx: "12",
		cy: "12",
		r: "1",
		key: "41hilf"
	}], ["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}]]
};
__iconData$69.node;
var CircleDot = createLucideIcon(__iconData$69);
// node_modules/lucide-react/dist/esm/icons/circle-x.mjs
var __iconData$68 = {
	name: "circle-x",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}],
		["path", {
			d: "m15 9-6 6",
			key: "1uzhvr"
		}],
		["path", {
			d: "m9 9 6 6",
			key: "z0biqf"
		}]
	],
	aliases: ["x-circle"]
};
__iconData$68.node;
var CircleX = createLucideIcon(__iconData$68);
// node_modules/lucide-react/dist/esm/icons/circle.mjs
var __iconData$67 = {
	name: "circle",
	size: 24,
	node: [["circle", {
		cx: "12",
		cy: "12",
		r: "10",
		key: "1mglay"
	}]]
};
__iconData$67.node;
var Circle = createLucideIcon(__iconData$67);
// node_modules/lucide-react/dist/esm/icons/copy.mjs
var __iconData$66 = {
	name: "copy",
	size: 24,
	node: [["rect", {
		width: "14",
		height: "14",
		x: "8",
		y: "8",
		rx: "2",
		ry: "2",
		key: "17jyea"
	}], ["path", {
		d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2",
		key: "zix9uf"
	}]]
};
__iconData$66.node;
var Copy = createLucideIcon(__iconData$66);
// node_modules/lucide-react/dist/esm/icons/cpu.mjs
var __iconData$65 = {
	name: "cpu",
	size: 24,
	node: [
		["path", {
			d: "M12 20v2",
			key: "1lh1kg"
		}],
		["path", {
			d: "M12 2v2",
			key: "tus03m"
		}],
		["path", {
			d: "M17 20v2",
			key: "1rnc9c"
		}],
		["path", {
			d: "M17 2v2",
			key: "11trls"
		}],
		["path", {
			d: "M2 12h2",
			key: "1t8f8n"
		}],
		["path", {
			d: "M2 17h2",
			key: "7oei6x"
		}],
		["path", {
			d: "M2 7h2",
			key: "asdhe0"
		}],
		["path", {
			d: "M20 12h2",
			key: "1q8mjw"
		}],
		["path", {
			d: "M20 17h2",
			key: "1fpfkl"
		}],
		["path", {
			d: "M20 7h2",
			key: "1o8tra"
		}],
		["path", {
			d: "M7 20v2",
			key: "4gnj0m"
		}],
		["path", {
			d: "M7 2v2",
			key: "1i4yhu"
		}],
		["rect", {
			x: "4",
			y: "4",
			width: "16",
			height: "16",
			rx: "2",
			key: "1vbyd7"
		}],
		["rect", {
			x: "8",
			y: "8",
			width: "8",
			height: "8",
			rx: "1",
			key: "z9xiuo"
		}]
	]
};
__iconData$65.node;
var Cpu = createLucideIcon(__iconData$65);
// node_modules/lucide-react/dist/esm/icons/crosshair.mjs
var __iconData$64 = {
	name: "crosshair",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}],
		["line", {
			x1: "22",
			x2: "18",
			y1: "12",
			y2: "12",
			key: "l9bcsi"
		}],
		["line", {
			x1: "6",
			x2: "2",
			y1: "12",
			y2: "12",
			key: "13hhkx"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "6",
			y2: "2",
			key: "10w3f3"
		}],
		["line", {
			x1: "12",
			x2: "12",
			y1: "22",
			y2: "18",
			key: "15g9kq"
		}]
	]
};
__iconData$64.node;
var Crosshair = createLucideIcon(__iconData$64);
// node_modules/lucide-react/dist/esm/icons/crown.mjs
var __iconData$63 = {
	name: "crown",
	size: 24,
	node: [["path", {
		d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
		key: "1vdc57"
	}], ["path", {
		d: "M5 21h14",
		key: "11awu3"
	}]]
};
__iconData$63.node;
var Crown = createLucideIcon(__iconData$63);
// node_modules/lucide-react/dist/esm/icons/database.mjs
var __iconData$62 = {
	name: "database",
	size: 24,
	node: [
		["ellipse", {
			cx: "12",
			cy: "5",
			rx: "9",
			ry: "3",
			key: "msslwz"
		}],
		["path", {
			d: "M3 5V19A9 3 0 0 0 21 19V5",
			key: "1wlel7"
		}],
		["path", {
			d: "M3 12A9 3 0 0 0 21 12",
			key: "mv7ke4"
		}]
	]
};
__iconData$62.node;
var Database = createLucideIcon(__iconData$62);
// node_modules/lucide-react/dist/esm/icons/download.mjs
var __iconData$61 = {
	name: "download",
	size: 24,
	node: [
		["path", {
			d: "M12 15V3",
			key: "m9g1x1"
		}],
		["path", {
			d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
			key: "ih7n3h"
		}],
		["path", {
			d: "m7 10 5 5 5-5",
			key: "brsn70"
		}]
	]
};
__iconData$61.node;
var Download = createLucideIcon(__iconData$61);
// node_modules/lucide-react/dist/esm/icons/external-link.mjs
var __iconData$60 = {
	name: "external-link",
	size: 24,
	node: [
		["path", {
			d: "M15 3h6v6",
			key: "1q9fwt"
		}],
		["path", {
			d: "M10 14 21 3",
			key: "gplh6r"
		}],
		["path", {
			d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",
			key: "a6xqqp"
		}]
	]
};
__iconData$60.node;
var ExternalLink = createLucideIcon(__iconData$60);
// node_modules/lucide-react/dist/esm/icons/file-code-corner.mjs
var __iconData$59 = {
	name: "file-code-corner",
	size: 24,
	node: [
		["path", {
			d: "M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35",
			key: "1wthlu"
		}],
		["path", {
			d: "M14 2v5a1 1 0 0 0 1 1h5",
			key: "wfsgrz"
		}],
		["path", {
			d: "m5 16-3 3 3 3",
			key: "331omg"
		}],
		["path", {
			d: "m9 22 3-3-3-3",
			key: "lsp7cz"
		}]
	],
	aliases: ["file-code-2"]
};
__iconData$59.node;
var FileCodeCorner = createLucideIcon(__iconData$59);
// node_modules/lucide-react/dist/esm/icons/file-pen-line.mjs
var __iconData$58 = {
	name: "file-pen-line",
	size: 24,
	node: [
		["path", {
			d: "M14.364 13.634a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506l4.013-4.009a1 1 0 0 0-3.004-3.004z",
			key: "ukzhwg"
		}],
		["path", {
			d: "M14.487 7.858A1 1 0 0 1 14 7V2",
			key: "1klhew"
		}],
		["path", {
			d: "M20 19.645V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l2.516 2.516",
			key: "rxaxab"
		}],
		["path", {
			d: "M8 18h1",
			key: "13wk12"
		}]
	],
	aliases: ["file-signature"]
};
__iconData$58.node;
var FilePenLine = createLucideIcon(__iconData$58);
// node_modules/lucide-react/dist/esm/icons/file-text.mjs
var __iconData$57 = {
	name: "file-text",
	size: 24,
	node: [
		["path", {
			d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
			key: "1oefj6"
		}],
		["path", {
			d: "M14 2v5a1 1 0 0 0 1 1h5",
			key: "wfsgrz"
		}],
		["path", {
			d: "M10 9H8",
			key: "b1mrlr"
		}],
		["path", {
			d: "M16 13H8",
			key: "t4e002"
		}],
		["path", {
			d: "M16 17H8",
			key: "z1uh3a"
		}]
	]
};
__iconData$57.node;
var FileText = createLucideIcon(__iconData$57);
// node_modules/lucide-react/dist/esm/icons/flask-conical.mjs
var __iconData$56 = {
	name: "flask-conical",
	size: 24,
	node: [
		["path", {
			d: "M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2",
			key: "18mbvz"
		}],
		["path", {
			d: "M6.453 15h11.094",
			key: "3shlmq"
		}],
		["path", {
			d: "M8.5 2h7",
			key: "csnxdl"
		}]
	]
};
__iconData$56.node;
var FlaskConical = createLucideIcon(__iconData$56);
// node_modules/lucide-react/dist/esm/icons/funnel.mjs
var __iconData$55 = {
	name: "funnel",
	size: 24,
	node: [["path", {
		d: "M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",
		key: "sc7q7i"
	}]],
	aliases: ["filter"]
};
__iconData$55.node;
var Funnel = createLucideIcon(__iconData$55);
// node_modules/lucide-react/dist/esm/icons/git-branch.mjs
var __iconData$54 = {
	name: "git-branch",
	size: 24,
	node: [
		["path", {
			d: "M15 6a9 9 0 0 0-9 9V3",
			key: "1cii5b"
		}],
		["circle", {
			cx: "18",
			cy: "6",
			r: "3",
			key: "1h7g24"
		}],
		["circle", {
			cx: "6",
			cy: "18",
			r: "3",
			key: "fqmcym"
		}]
	]
};
__iconData$54.node;
var GitBranch = createLucideIcon(__iconData$54);
// node_modules/lucide-react/dist/esm/icons/git-fork.mjs
var __iconData$53 = {
	name: "git-fork",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "18",
			r: "3",
			key: "1mpf1b"
		}],
		["circle", {
			cx: "6",
			cy: "6",
			r: "3",
			key: "1lh9wr"
		}],
		["circle", {
			cx: "18",
			cy: "6",
			r: "3",
			key: "1h7g24"
		}],
		["path", {
			d: "M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9",
			key: "1uq4wg"
		}],
		["path", {
			d: "M12 12v3",
			key: "158kv8"
		}]
	]
};
__iconData$53.node;
var GitFork = createLucideIcon(__iconData$53);
// node_modules/lucide-react/dist/esm/icons/git-pull-request.mjs
var __iconData$52 = {
	name: "git-pull-request",
	size: 24,
	node: [
		["circle", {
			cx: "18",
			cy: "18",
			r: "3",
			key: "1xkwt0"
		}],
		["circle", {
			cx: "6",
			cy: "6",
			r: "3",
			key: "1lh9wr"
		}],
		["path", {
			d: "M13 6h3a2 2 0 0 1 2 2v7",
			key: "1yeb86"
		}],
		["line", {
			x1: "6",
			x2: "6",
			y1: "9",
			y2: "21",
			key: "rroup"
		}]
	]
};
__iconData$52.node;
var GitPullRequest = createLucideIcon(__iconData$52);
// node_modules/lucide-react/dist/esm/icons/globe.mjs
var __iconData$51 = {
	name: "globe",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "10",
			key: "1mglay"
		}],
		["path", {
			d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20",
			key: "13o1zl"
		}],
		["path", {
			d: "M2 12h20",
			key: "9i4pu4"
		}]
	]
};
__iconData$51.node;
var Globe = createLucideIcon(__iconData$51);
// node_modules/lucide-react/dist/esm/icons/hard-drive-download.mjs
var __iconData$50 = {
	name: "hard-drive-download",
	size: 24,
	node: [
		["path", {
			d: "M12 2v8",
			key: "1q4o3n"
		}],
		["path", {
			d: "m16 6-4 4-4-4",
			key: "6wukr"
		}],
		["rect", {
			width: "20",
			height: "8",
			x: "2",
			y: "14",
			rx: "2",
			key: "w68u3i"
		}],
		["path", {
			d: "M6 18h.01",
			key: "uhywen"
		}],
		["path", {
			d: "M10 18h.01",
			key: "h775k"
		}]
	]
};
__iconData$50.node;
var HardDriveDownload = createLucideIcon(__iconData$50);
// node_modules/lucide-react/dist/esm/icons/hard-drive-upload.mjs
var __iconData$49 = {
	name: "hard-drive-upload",
	size: 24,
	node: [
		["path", {
			d: "m16 6-4-4-4 4",
			key: "13yo43"
		}],
		["path", {
			d: "M12 2v8",
			key: "1q4o3n"
		}],
		["rect", {
			width: "20",
			height: "8",
			x: "2",
			y: "14",
			rx: "2",
			key: "w68u3i"
		}],
		["path", {
			d: "M6 18h.01",
			key: "uhywen"
		}],
		["path", {
			d: "M10 18h.01",
			key: "h775k"
		}]
	]
};
__iconData$49.node;
var HardDriveUpload = createLucideIcon(__iconData$49);
// node_modules/lucide-react/dist/esm/icons/inbox.mjs
var __iconData$48 = {
	name: "inbox",
	size: 24,
	node: [["polyline", {
		points: "22 12 16 12 14 15 10 15 8 12 2 12",
		key: "o97t9d"
	}], ["path", {
		d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
		key: "oot6mr"
	}]]
};
__iconData$48.node;
var Inbox = createLucideIcon(__iconData$48);
// node_modules/lucide-react/dist/esm/icons/laptop.mjs
var __iconData$47 = {
	name: "laptop",
	size: 24,
	node: [["path", {
		d: "M18 5a2 2 0 0 1 2 2v8.526a2 2 0 0 0 .212.897l1.068 2.127a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45l1.068-2.127A2 2 0 0 0 4 15.526V7a2 2 0 0 1 2-2z",
		key: "1pdavp"
	}], ["path", {
		d: "M20.054 15.987H3.946",
		key: "14rxg9"
	}]]
};
__iconData$47.node;
var Laptop = createLucideIcon(__iconData$47);
// node_modules/lucide-react/dist/esm/icons/layers.mjs
var __iconData$46 = {
	name: "layers",
	size: 24,
	node: [
		["path", {
			d: "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
			key: "zw3jo"
		}],
		["path", {
			d: "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
			key: "1wduqc"
		}],
		["path", {
			d: "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
			key: "kqbvx6"
		}]
	],
	aliases: ["layers-3"]
};
__iconData$46.node;
var Layers = createLucideIcon(__iconData$46);
// node_modules/lucide-react/dist/esm/icons/layout-grid.mjs
var __iconData$45 = {
	name: "layout-grid",
	size: 24,
	node: [
		["rect", {
			width: "7",
			height: "7",
			x: "3",
			y: "3",
			rx: "1",
			key: "1g98yp"
		}],
		["rect", {
			width: "7",
			height: "7",
			x: "14",
			y: "3",
			rx: "1",
			key: "6d4xhi"
		}],
		["rect", {
			width: "7",
			height: "7",
			x: "14",
			y: "14",
			rx: "1",
			key: "nxv5o0"
		}],
		["rect", {
			width: "7",
			height: "7",
			x: "3",
			y: "14",
			rx: "1",
			key: "1bb6yr"
		}]
	]
};
__iconData$45.node;
var LayoutGrid = createLucideIcon(__iconData$45);
// node_modules/lucide-react/dist/esm/icons/list.mjs
var __iconData$44 = {
	name: "list",
	size: 24,
	node: [
		["path", {
			d: "M3 5h.01",
			key: "18ugdj"
		}],
		["path", {
			d: "M3 12h.01",
			key: "nlz23k"
		}],
		["path", {
			d: "M3 19h.01",
			key: "noohij"
		}],
		["path", {
			d: "M8 5h13",
			key: "1pao27"
		}],
		["path", {
			d: "M8 12h13",
			key: "1za7za"
		}],
		["path", {
			d: "M8 19h13",
			key: "m83p4d"
		}]
	]
};
__iconData$44.node;
var List = createLucideIcon(__iconData$44);
// node_modules/lucide-react/dist/esm/icons/log-out.mjs
var __iconData$43 = {
	name: "log-out",
	size: 24,
	node: [
		["path", {
			d: "m16 17 5-5-5-5",
			key: "1bji2h"
		}],
		["path", {
			d: "M21 12H9",
			key: "dn1m92"
		}],
		["path", {
			d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
			key: "1uf3rs"
		}]
	]
};
__iconData$43.node;
var LogOut = createLucideIcon(__iconData$43);
// node_modules/lucide-react/dist/esm/icons/map.mjs
var __iconData$42 = {
	name: "map",
	size: 24,
	node: [
		["path", {
			d: "M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z",
			key: "169xi5"
		}],
		["path", {
			d: "M15 5.764v15",
			key: "1pn4in"
		}],
		["path", {
			d: "M9 3.236v15",
			key: "1uimfh"
		}]
	]
};
__iconData$42.node;
var Map$1 = createLucideIcon(__iconData$42);
// node_modules/lucide-react/dist/esm/icons/maximize-2.mjs
var __iconData$41 = {
	name: "maximize-2",
	size: 24,
	node: [
		["path", {
			d: "M15 3h6v6",
			key: "1q9fwt"
		}],
		["path", {
			d: "m21 3-7 7",
			key: "1l2asr"
		}],
		["path", {
			d: "m3 21 7-7",
			key: "tjx5ai"
		}],
		["path", {
			d: "M9 21H3v-6",
			key: "wtvkvv"
		}]
	]
};
__iconData$41.node;
var Maximize2 = createLucideIcon(__iconData$41);
// node_modules/lucide-react/dist/esm/icons/menu.mjs
var __iconData$40 = {
	name: "menu",
	size: 24,
	node: [
		["path", {
			d: "M4 5h16",
			key: "1tepv9"
		}],
		["path", {
			d: "M4 12h16",
			key: "1lakjw"
		}],
		["path", {
			d: "M4 19h16",
			key: "1djgab"
		}]
	]
};
__iconData$40.node;
var Menu = createLucideIcon(__iconData$40);
// node_modules/lucide-react/dist/esm/icons/message-square.mjs
var __iconData$39 = {
	name: "message-square",
	size: 24,
	node: [["path", {
		d: "M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",
		key: "18887p"
	}]]
};
__iconData$39.node;
var MessageSquare = createLucideIcon(__iconData$39);
// node_modules/lucide-react/dist/esm/icons/minus.mjs
var __iconData$38 = {
	name: "minus",
	size: 24,
	node: [["path", {
		d: "M5 12h14",
		key: "1ays0h"
	}]]
};
__iconData$38.node;
var Minus = createLucideIcon(__iconData$38);
// node_modules/lucide-react/dist/esm/icons/moon.mjs
var __iconData$37 = {
	name: "moon",
	size: 24,
	node: [["path", {
		d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",
		key: "kfwtm"
	}]]
};
__iconData$37.node;
var Moon = createLucideIcon(__iconData$37);
// node_modules/lucide-react/dist/esm/icons/network.mjs
var __iconData$36 = {
	name: "network",
	size: 24,
	node: [
		["rect", {
			x: "16",
			y: "16",
			width: "6",
			height: "6",
			rx: "1",
			key: "4q2zg0"
		}],
		["rect", {
			x: "2",
			y: "16",
			width: "6",
			height: "6",
			rx: "1",
			key: "8cvhb9"
		}],
		["rect", {
			x: "9",
			y: "2",
			width: "6",
			height: "6",
			rx: "1",
			key: "1egb70"
		}],
		["path", {
			d: "M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3",
			key: "1jsf9p"
		}],
		["path", {
			d: "M12 12V8",
			key: "2874zd"
		}]
	]
};
__iconData$36.node;
var Network = createLucideIcon(__iconData$36);
// node_modules/lucide-react/dist/esm/icons/orbit.mjs
var __iconData$35 = {
	name: "orbit",
	size: 24,
	node: [
		["path", {
			d: "M20.341 6.484A10 10 0 0 1 10.266 21.85",
			key: "1enhxb"
		}],
		["path", {
			d: "M3.659 17.516A10 10 0 0 1 13.74 2.152",
			key: "1crzgf"
		}],
		["circle", {
			cx: "12",
			cy: "12",
			r: "3",
			key: "1v7zrd"
		}],
		["circle", {
			cx: "19",
			cy: "5",
			r: "2",
			key: "mhkx31"
		}],
		["circle", {
			cx: "5",
			cy: "19",
			r: "2",
			key: "v8kfzx"
		}]
	]
};
__iconData$35.node;
var Orbit = createLucideIcon(__iconData$35);
// node_modules/lucide-react/dist/esm/icons/panel-left-close.mjs
var __iconData$34 = {
	name: "panel-left-close",
	size: 24,
	node: [
		["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			key: "afitv7"
		}],
		["path", {
			d: "M9 3v18",
			key: "fh3hqa"
		}],
		["path", {
			d: "m16 15-3-3 3-3",
			key: "14y99z"
		}]
	],
	aliases: ["sidebar-close"]
};
__iconData$34.node;
var PanelLeftClose = createLucideIcon(__iconData$34);
// node_modules/lucide-react/dist/esm/icons/panel-left-open.mjs
var __iconData$33 = {
	name: "panel-left-open",
	size: 24,
	node: [
		["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			key: "afitv7"
		}],
		["path", {
			d: "M9 3v18",
			key: "fh3hqa"
		}],
		["path", {
			d: "m14 9 3 3-3 3",
			key: "8010ee"
		}]
	],
	aliases: ["sidebar-open"]
};
__iconData$33.node;
var PanelLeftOpen = createLucideIcon(__iconData$33);
// node_modules/lucide-react/dist/esm/icons/pause.mjs
var __iconData$32 = {
	name: "pause",
	size: 24,
	node: [["rect", {
		x: "14",
		y: "3",
		width: "5",
		height: "18",
		rx: "1",
		key: "kaeet6"
	}], ["rect", {
		x: "5",
		y: "3",
		width: "5",
		height: "18",
		rx: "1",
		key: "1wsw3u"
	}]]
};
__iconData$32.node;
var Pause = createLucideIcon(__iconData$32);
// node_modules/lucide-react/dist/esm/icons/play.mjs
var __iconData$31 = {
	name: "play",
	size: 24,
	node: [["path", {
		d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",
		key: "10ikf1"
	}]]
};
__iconData$31.node;
var Play = createLucideIcon(__iconData$31);
// node_modules/lucide-react/dist/esm/icons/plug.mjs
var __iconData$30 = {
	name: "plug",
	size: 24,
	node: [
		["path", {
			d: "M12 22v-5",
			key: "1ega77"
		}],
		["path", {
			d: "M15 8V2",
			key: "18g5xt"
		}],
		["path", {
			d: "M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z",
			key: "1xoxul"
		}],
		["path", {
			d: "M9 8V2",
			key: "14iosj"
		}]
	]
};
__iconData$30.node;
var Plug = createLucideIcon(__iconData$30);
// node_modules/lucide-react/dist/esm/icons/plus.mjs
var __iconData$29 = {
	name: "plus",
	size: 24,
	node: [["path", {
		d: "M5 12h14",
		key: "1ays0h"
	}], ["path", {
		d: "M12 5v14",
		key: "s699le"
	}]]
};
__iconData$29.node;
var Plus = createLucideIcon(__iconData$29);
// node_modules/lucide-react/dist/esm/icons/power.mjs
var __iconData$28 = {
	name: "power",
	size: 24,
	node: [["path", {
		d: "M12 2v10",
		key: "mnfbl"
	}], ["path", {
		d: "M18.4 6.6a9 9 0 1 1-12.77.04",
		key: "obofu9"
	}]]
};
__iconData$28.node;
var Power = createLucideIcon(__iconData$28);
// node_modules/lucide-react/dist/esm/icons/radar.mjs
var __iconData$27 = {
	name: "radar",
	size: 24,
	node: [
		["path", {
			d: "M19.07 4.93A10 10 0 0 0 6.99 3.34",
			key: "z3du51"
		}],
		["path", {
			d: "M4 6h.01",
			key: "oypzma"
		}],
		["path", {
			d: "M2.29 9.62A10 10 0 1 0 21.31 8.35",
			key: "qzzz0"
		}],
		["path", {
			d: "M16.24 7.76A6 6 0 1 0 8.23 16.67",
			key: "1yjesh"
		}],
		["path", {
			d: "M12 18h.01",
			key: "mhygvu"
		}],
		["path", {
			d: "M17.99 11.66A6 6 0 0 1 15.77 16.67",
			key: "1u2y91"
		}],
		["circle", {
			cx: "12",
			cy: "12",
			r: "2",
			key: "1c9p78"
		}],
		["path", {
			d: "m13.41 10.59 5.66-5.66",
			key: "mhq4k0"
		}]
	]
};
__iconData$27.node;
var Radar = createLucideIcon(__iconData$27);
// node_modules/lucide-react/dist/esm/icons/radio.mjs
var __iconData$26 = {
	name: "radio",
	size: 24,
	node: [
		["path", {
			d: "M16.247 7.761a6 6 0 0 1 0 8.478",
			key: "1fwjs5"
		}],
		["path", {
			d: "M19.075 4.933a10 10 0 0 1 0 14.134",
			key: "ehdyv1"
		}],
		["path", {
			d: "M4.925 19.067a10 10 0 0 1 0-14.134",
			key: "1q22gi"
		}],
		["path", {
			d: "M7.753 16.239a6 6 0 0 1 0-8.478",
			key: "r2q7qm"
		}],
		["circle", {
			cx: "12",
			cy: "12",
			r: "2",
			key: "1c9p78"
		}]
	]
};
__iconData$26.node;
var Radio = createLucideIcon(__iconData$26);
// node_modules/lucide-react/dist/esm/icons/refresh-cw.mjs
var __iconData$25 = {
	name: "refresh-cw",
	size: 24,
	node: [
		["path", {
			d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
			key: "v9h5vc"
		}],
		["path", {
			d: "M21 3v5h-5",
			key: "1q7to0"
		}],
		["path", {
			d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
			key: "3uifl3"
		}],
		["path", {
			d: "M8 16H3v5",
			key: "1cv678"
		}]
	]
};
__iconData$25.node;
var RefreshCw = createLucideIcon(__iconData$25);
// node_modules/lucide-react/dist/esm/icons/rotate-ccw.mjs
var __iconData$24 = {
	name: "rotate-ccw",
	size: 24,
	node: [["path", {
		d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
		key: "1357e3"
	}], ["path", {
		d: "M3 3v5h5",
		key: "1xhq8a"
	}]]
};
__iconData$24.node;
var RotateCcw = createLucideIcon(__iconData$24);
// node_modules/lucide-react/dist/esm/icons/rotate-cw.mjs
var __iconData$23 = {
	name: "rotate-cw",
	size: 24,
	node: [["path", {
		d: "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8",
		key: "1p45f6"
	}], ["path", {
		d: "M21 3v5h-5",
		key: "1q7to0"
	}]]
};
__iconData$23.node;
var RotateCw = createLucideIcon(__iconData$23);
// node_modules/lucide-react/dist/esm/icons/save.mjs
var __iconData$22 = {
	name: "save",
	size: 24,
	node: [
		["path", {
			d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
			key: "1c8476"
		}],
		["path", {
			d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",
			key: "1ydtos"
		}],
		["path", {
			d: "M7 3v4a1 1 0 0 0 1 1h7",
			key: "t51u73"
		}]
	]
};
__iconData$22.node;
var Save = createLucideIcon(__iconData$22);
// node_modules/lucide-react/dist/esm/icons/search.mjs
var __iconData$21 = {
	name: "search",
	size: 24,
	node: [["path", {
		d: "m21 21-4.34-4.34",
		key: "14j7rj"
	}], ["circle", {
		cx: "11",
		cy: "11",
		r: "8",
		key: "4ej97u"
	}]]
};
__iconData$21.node;
var Search = createLucideIcon(__iconData$21);
// node_modules/lucide-react/dist/esm/icons/send.mjs
var __iconData$20 = {
	name: "send",
	size: 24,
	node: [["path", {
		d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
		key: "1ffxy3"
	}], ["path", {
		d: "m21.854 2.147-10.94 10.939",
		key: "12cjpa"
	}]]
};
__iconData$20.node;
var Send = createLucideIcon(__iconData$20);
// node_modules/lucide-react/dist/esm/icons/settings-2.mjs
var __iconData$19 = {
	name: "settings-2",
	size: 24,
	node: [
		["path", {
			d: "M14 17H5",
			key: "gfn3mx"
		}],
		["path", {
			d: "M19 7h-9",
			key: "6i9tg"
		}],
		["circle", {
			cx: "17",
			cy: "17",
			r: "3",
			key: "18b49y"
		}],
		["circle", {
			cx: "7",
			cy: "7",
			r: "3",
			key: "dfmy0x"
		}]
	]
};
__iconData$19.node;
var Settings2 = createLucideIcon(__iconData$19);
// node_modules/lucide-react/dist/esm/icons/server.mjs
var __iconData$18 = {
	name: "server",
	size: 24,
	node: [
		["rect", {
			width: "20",
			height: "8",
			x: "2",
			y: "2",
			rx: "2",
			ry: "2",
			key: "ngkwjq"
		}],
		["rect", {
			width: "20",
			height: "8",
			x: "2",
			y: "14",
			rx: "2",
			ry: "2",
			key: "iecqi9"
		}],
		["line", {
			x1: "6",
			x2: "6.01",
			y1: "6",
			y2: "6",
			key: "16zg32"
		}],
		["line", {
			x1: "6",
			x2: "6.01",
			y1: "18",
			y2: "18",
			key: "nzw8ys"
		}]
	]
};
__iconData$18.node;
var Server = createLucideIcon(__iconData$18);
// node_modules/lucide-react/dist/esm/icons/shield-check.mjs
var __iconData$17 = {
	name: "shield-check",
	size: 24,
	node: [["path", {
		d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
		key: "oel41y"
	}], ["path", {
		d: "m9 12 2 2 4-4",
		key: "dzmm74"
	}]]
};
__iconData$17.node;
var ShieldCheck = createLucideIcon(__iconData$17);
// node_modules/lucide-react/dist/esm/icons/shield-exclamation-point.mjs
var __iconData$16 = {
	name: "shield-exclamation-point",
	size: 24,
	node: [
		["path", {
			d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
			key: "oel41y"
		}],
		["path", {
			d: "M12 8v4",
			key: "1got3b"
		}],
		["path", {
			d: "M12 16h.01",
			key: "1drbdi"
		}]
	],
	aliases: ["shield-alert"]
};
__iconData$16.node;
var ShieldExclamationPoint = createLucideIcon(__iconData$16);
// node_modules/lucide-react/dist/esm/icons/shield.mjs
var __iconData$15 = {
	name: "shield",
	size: 24,
	node: [["path", {
		d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
		key: "oel41y"
	}]]
};
__iconData$15.node;
var Shield = createLucideIcon(__iconData$15);
// node_modules/lucide-react/dist/esm/icons/sliders-horizontal.mjs
var __iconData$14 = {
	name: "sliders-horizontal",
	size: 24,
	node: [
		["path", {
			d: "M10 5H3",
			key: "1qgfaw"
		}],
		["path", {
			d: "M12 19H3",
			key: "yhmn1j"
		}],
		["path", {
			d: "M14 3v4",
			key: "1sua03"
		}],
		["path", {
			d: "M16 17v4",
			key: "1q0r14"
		}],
		["path", {
			d: "M21 12h-9",
			key: "1o4lsq"
		}],
		["path", {
			d: "M21 19h-5",
			key: "1rlt1p"
		}],
		["path", {
			d: "M21 5h-7",
			key: "1oszz2"
		}],
		["path", {
			d: "M8 10v4",
			key: "tgpxqk"
		}],
		["path", {
			d: "M8 12H3",
			key: "a7s4jb"
		}]
	]
};
__iconData$14.node;
var SlidersHorizontal = createLucideIcon(__iconData$14);
// node_modules/lucide-react/dist/esm/icons/smartphone.mjs
var __iconData$13 = {
	name: "smartphone",
	size: 24,
	node: [["rect", {
		x: "6",
		y: "2",
		width: "12",
		height: "20",
		rx: "2",
		ry: "2",
		key: "681lq1"
	}], ["path", {
		d: "M12 18h.01",
		key: "mhygvu"
	}]]
};
__iconData$13.node;
var Smartphone = createLucideIcon(__iconData$13);
// node_modules/lucide-react/dist/esm/icons/sparkles.mjs
var __iconData$12 = {
	name: "sparkles",
	size: 24,
	node: [
		["path", {
			d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",
			key: "1s2grr"
		}],
		["path", {
			d: "M20 2v4",
			key: "1rf3ol"
		}],
		["path", {
			d: "M22 4h-4",
			key: "gwowj6"
		}],
		["circle", {
			cx: "4",
			cy: "20",
			r: "2",
			key: "6kqj1y"
		}]
	],
	aliases: ["stars"]
};
__iconData$12.node;
var Sparkles = createLucideIcon(__iconData$12);
// node_modules/lucide-react/dist/esm/icons/square-kanban.mjs
var __iconData$11 = {
	name: "square-kanban",
	size: 24,
	node: [
		["rect", {
			width: "18",
			height: "18",
			x: "3",
			y: "3",
			rx: "2",
			key: "afitv7"
		}],
		["path", {
			d: "M8 7v7",
			key: "1x2jlm"
		}],
		["path", {
			d: "M12 7v4",
			key: "xawao1"
		}],
		["path", {
			d: "M16 7v9",
			key: "1hp2iy"
		}]
	],
	aliases: ["kanban-square"]
};
__iconData$11.node;
var SquareKanban = createLucideIcon(__iconData$11);
// node_modules/lucide-react/dist/esm/icons/square.mjs
var __iconData$10 = {
	name: "square",
	size: 24,
	node: [["rect", {
		width: "18",
		height: "18",
		x: "3",
		y: "3",
		rx: "2",
		key: "afitv7"
	}]]
};
__iconData$10.node;
var Square = createLucideIcon(__iconData$10);
// node_modules/lucide-react/dist/esm/icons/stethoscope.mjs
var __iconData$9 = {
	name: "stethoscope",
	size: 24,
	node: [
		["path", {
			d: "M11 2v2",
			key: "1539x4"
		}],
		["path", {
			d: "M5 2v2",
			key: "1yf1q8"
		}],
		["path", {
			d: "M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1",
			key: "rb5t3r"
		}],
		["path", {
			d: "M8 15a6 6 0 0 0 12 0v-3",
			key: "x18d4x"
		}],
		["circle", {
			cx: "20",
			cy: "10",
			r: "2",
			key: "ts1r5v"
		}]
	]
};
__iconData$9.node;
var Stethoscope = createLucideIcon(__iconData$9);
// node_modules/lucide-react/dist/esm/icons/sun.mjs
var __iconData$8 = {
	name: "sun",
	size: 24,
	node: [
		["circle", {
			cx: "12",
			cy: "12",
			r: "4",
			key: "4exip2"
		}],
		["path", {
			d: "M12 2v2",
			key: "tus03m"
		}],
		["path", {
			d: "M12 20v2",
			key: "1lh1kg"
		}],
		["path", {
			d: "m4.93 4.93 1.41 1.41",
			key: "149t6j"
		}],
		["path", {
			d: "m17.66 17.66 1.41 1.41",
			key: "ptbguv"
		}],
		["path", {
			d: "M2 12h2",
			key: "1t8f8n"
		}],
		["path", {
			d: "M20 12h2",
			key: "1q8mjw"
		}],
		["path", {
			d: "m6.34 17.66-1.41 1.41",
			key: "1m8zz5"
		}],
		["path", {
			d: "m19.07 4.93-1.41 1.41",
			key: "1shlcs"
		}]
	]
};
__iconData$8.node;
var Sun = createLucideIcon(__iconData$8);
// node_modules/lucide-react/dist/esm/icons/terminal.mjs
var __iconData$7 = {
	name: "terminal",
	size: 24,
	node: [["path", {
		d: "M12 19h8",
		key: "baeox8"
	}], ["path", {
		d: "m4 17 6-6-6-6",
		key: "1yngyt"
	}]]
};
__iconData$7.node;
var Terminal = createLucideIcon(__iconData$7);
// node_modules/lucide-react/dist/esm/icons/trash.mjs
var __iconData$6 = {
	name: "trash",
	size: 24,
	node: [
		["path", {
			d: "M10 11v6",
			key: "nco0om"
		}],
		["path", {
			d: "M14 11v6",
			key: "outv1u"
		}],
		["path", {
			d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6",
			key: "miytrc"
		}],
		["path", {
			d: "M3 6h18",
			key: "d0wm0j"
		}],
		["path", {
			d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
			key: "e791ji"
		}]
	],
	aliases: ["trash-2"]
};
__iconData$6.node;
var Trash = createLucideIcon(__iconData$6);
// node_modules/lucide-react/dist/esm/icons/triangle-exclamation-point.mjs
var __iconData$5 = {
	name: "triangle-exclamation-point",
	size: 24,
	node: [
		["path", {
			d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
			key: "wmoenq"
		}],
		["path", {
			d: "M12 9v4",
			key: "juzpu7"
		}],
		["path", {
			d: "M12 17h.01",
			key: "p32p05"
		}]
	],
	aliases: ["alert-triangle", "triangle-alert"]
};
__iconData$5.node;
var TriangleExclamationPoint = createLucideIcon(__iconData$5);
// node_modules/lucide-react/dist/esm/icons/users.mjs
var __iconData$4 = {
	name: "users",
	size: 24,
	node: [
		["path", {
			d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
			key: "1yyitq"
		}],
		["path", {
			d: "M16 3.128a4 4 0 0 1 0 7.744",
			key: "16gr8j"
		}],
		["path", {
			d: "M22 21v-2a4 4 0 0 0-3-3.87",
			key: "kshegd"
		}],
		["circle", {
			cx: "9",
			cy: "7",
			r: "4",
			key: "nufk8"
		}]
	]
};
__iconData$4.node;
var Users = createLucideIcon(__iconData$4);
// node_modules/lucide-react/dist/esm/icons/wifi-off.mjs
var __iconData$3 = {
	name: "wifi-off",
	size: 24,
	node: [
		["path", {
			d: "M12 20h.01",
			key: "zekei9"
		}],
		["path", {
			d: "M8.5 16.429a5 5 0 0 1 7 0",
			key: "1bycff"
		}],
		["path", {
			d: "M5 12.859a10 10 0 0 1 5.17-2.69",
			key: "1dl1wf"
		}],
		["path", {
			d: "M19 12.859a10 10 0 0 0-2.007-1.523",
			key: "4k23kn"
		}],
		["path", {
			d: "M2 8.82a15 15 0 0 1 4.177-2.643",
			key: "1grhjp"
		}],
		["path", {
			d: "M22 8.82a15 15 0 0 0-11.288-3.764",
			key: "z3jwby"
		}],
		["path", {
			d: "m2 2 20 20",
			key: "1ooewy"
		}]
	]
};
__iconData$3.node;
var WifiOff = createLucideIcon(__iconData$3);
// node_modules/lucide-react/dist/esm/icons/wrench.mjs
var __iconData$2 = {
	name: "wrench",
	size: 24,
	node: [["path", {
		d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z",
		key: "1ngwbx"
	}]]
};
__iconData$2.node;
var Wrench = createLucideIcon(__iconData$2);
// node_modules/lucide-react/dist/esm/icons/x.mjs
var __iconData$1 = {
	name: "x",
	size: 24,
	node: [["path", {
		d: "M18 6 6 18",
		key: "1bl5f8"
	}], ["path", {
		d: "m6 6 12 12",
		key: "d8bk6v"
	}]]
};
__iconData$1.node;
var X$2 = createLucideIcon(__iconData$1);
// node_modules/lucide-react/dist/esm/icons/zap.mjs
var __iconData = {
	name: "zap",
	size: 24,
	node: [["path", {
		d: "M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z",
		key: "1v7up4"
	}]]
};
__iconData.node;
var Zap = createLucideIcon(__iconData);
// node_modules/cmdk/dist/chunk-NZJY6EH4.mjs
var U$1 = 1;
var Y$1 = .9;
var H = .8;
var J = .17;
var p$1 = .1;
var u$1 = .999;
var $$1 = .9999;
var k$3 = .99;
var m$1 = /[\\\/_+.#"@\[\(\{&]/;
var B$2 = /[\\\/_+.#"@\[\(\{&]/g;
var K$1 = /[\s-]/;
var X$1 = /[\s-]/g;
function G(_, C, h, P, A, f, O) {
	if (f === C.length) return A === _.length ? U$1 : k$3;
	var T = `${A},${f}`;
	if (O[T] !== void 0) return O[T];
	for (var L = P.charAt(f), c = h.indexOf(L, A), S = 0, E, N, R, M; c >= 0;) E = G(_, C, h, P, c + 1, f + 1, O), E > S && (c === A ? E *= U$1 : m$1.test(_.charAt(c - 1)) ? (E *= H, R = _.slice(A, c - 1).match(B$2), R && A > 0 && (E *= Math.pow(u$1, R.length))) : K$1.test(_.charAt(c - 1)) ? (E *= Y$1, M = _.slice(A, c - 1).match(X$1), M && A > 0 && (E *= Math.pow(u$1, M.length))) : (E *= J, A > 0 && (E *= Math.pow(u$1, c - A))), _.charAt(c) !== C.charAt(f) && (E *= $$1)), (E < p$1 && h.charAt(c - 1) === P.charAt(f + 1) || P.charAt(f + 1) === P.charAt(f) && h.charAt(c - 1) !== P.charAt(f)) && (N = G(_, C, h, P, c + 1, f + 2, O), N * p$1 > E && (E = N * p$1)), E > S && (S = E), c = h.indexOf(L, c + 1);
	return O[T] = S, S;
}
function D$1(_) {
	return _.toLowerCase().replace(X$1, " ");
}
function W$1(_, C, h) {
	return _ = h && h.length > 0 ? `${_ + " " + h.join(" ")}` : _, G(_, C, D$1(_), D$1(C), 0, 0, {});
}
// node_modules/cmdk/dist/index.mjs
var N = "[cmdk-group=\"\"]";
var Y = "[cmdk-group-items=\"\"]";
var be = "[cmdk-group-heading=\"\"]";
var le = "[cmdk-item=\"\"]";
var ce = `${le}:not([aria-disabled="true"])`;
var Z = "cmdk-item-select";
var T = "data-value";
var Re = (r, o, n) => W$1(r, o, n);
var ue = import_react.createContext(void 0);
var K = () => import_react.useContext(ue);
var de = import_react.createContext(void 0);
var ee = () => import_react.useContext(de);
var fe = import_react.createContext(void 0);
var me = import_react.forwardRef((r, o) => {
	let n = L(() => {
		var e, a;
		return {
			search: "",
			value: (a = (e = r.value) != null ? e : r.defaultValue) != null ? a : "",
			selectedItemId: void 0,
			filtered: {
				count: 0,
				items: /* @__PURE__ */ new Map(),
				groups: /* @__PURE__ */ new Set()
			}
		};
	}), u = L(() => /* @__PURE__ */ new Set()), c = L(() => /* @__PURE__ */ new Map()), d = L(() => /* @__PURE__ */ new Map()), f = L(() => /* @__PURE__ */ new Set()), p = pe(r), { label: b, children: m, value: R, onValueChange: x, filter: C, shouldFilter: S, loop: A, disablePointerSelection: ge = !1, vimBindings: j = !0, ...O } = r, $ = useId(), q = useId(), _ = useId(), I = import_react.useRef(null), v = ke();
	k$2(() => {
		if (R !== void 0) {
			let e = R.trim();
			n.current.value = e, E.emit();
		}
	}, [R]), k$2(() => {
		v(6, ne);
	}, []);
	let E = import_react.useMemo(() => ({
		subscribe: (e) => (f.current.add(e), () => f.current.delete(e)),
		snapshot: () => n.current,
		setState: (e, a, s) => {
			var i, l, g, y;
			if (!Object.is(n.current[e], a)) {
				if (n.current[e] = a, e === "search") J(), z(), v(1, W);
				else if (e === "value") {
					if (document.activeElement.hasAttribute("cmdk-input") || document.activeElement.hasAttribute("cmdk-root")) {
						let h = document.getElementById(_);
						h ? h.focus() : (i = document.getElementById($)) == null || i.focus();
					}
					if (v(7, () => {
						var h;
						n.current.selectedItemId = (h = M()) == null ? void 0 : h.id, E.emit();
					}), s || v(5, ne), ((l = p.current) == null ? void 0 : l.value) !== void 0) {
						let h = a != null ? a : "";
						(y = (g = p.current).onValueChange) == null || y.call(g, h);
						return;
					}
				}
				E.emit();
			}
		},
		emit: () => {
			f.current.forEach((e) => e());
		}
	}), []), U = import_react.useMemo(() => ({
		value: (e, a, s) => {
			var i;
			a !== ((i = d.current.get(e)) == null ? void 0 : i.value) && (d.current.set(e, {
				value: a,
				keywords: s
			}), n.current.filtered.items.set(e, te(a, s)), v(2, () => {
				z(), E.emit();
			}));
		},
		item: (e, a) => (u.current.add(e), a && (c.current.has(a) ? c.current.get(a).add(e) : c.current.set(a, /* @__PURE__ */ new Set([e]))), v(3, () => {
			J(), z(), n.current.value || W(), E.emit();
		}), () => {
			d.current.delete(e), u.current.delete(e), n.current.filtered.items.delete(e);
			let s = M();
			v(4, () => {
				J(), (s == null ? void 0 : s.getAttribute("id")) === e && W(), E.emit();
			});
		}),
		group: (e) => (c.current.has(e) || c.current.set(e, /* @__PURE__ */ new Set()), () => {
			d.current.delete(e), c.current.delete(e);
		}),
		filter: () => p.current.shouldFilter,
		label: b || r["aria-label"],
		getDisablePointerSelection: () => p.current.disablePointerSelection,
		listId: $,
		inputId: _,
		labelId: q,
		listInnerRef: I
	}), []);
	function te(e, a) {
		var i, l;
		let s = (l = (i = p.current) == null ? void 0 : i.filter) != null ? l : Re;
		return e ? s(e, n.current.search, a) : 0;
	}
	function z() {
		if (!n.current.search || p.current.shouldFilter === !1) return;
		let e = n.current.filtered.items, a = [];
		n.current.filtered.groups.forEach((i) => {
			let l = c.current.get(i), g = 0;
			l.forEach((y) => {
				let h = e.get(y);
				g = Math.max(h, g);
			}), a.push([i, g]);
		});
		let s = I.current;
		V().sort((i, l) => {
			var h, F;
			let g = i.getAttribute("id"), y = l.getAttribute("id");
			return ((h = e.get(y)) != null ? h : 0) - ((F = e.get(g)) != null ? F : 0);
		}).forEach((i) => {
			let l = i.closest(Y);
			l ? l.appendChild(i.parentElement === l ? i : i.closest(`${Y} > *`)) : s.appendChild(i.parentElement === s ? i : i.closest(`${Y} > *`));
		}), a.sort((i, l) => l[1] - i[1]).forEach((i) => {
			var g;
			let l = (g = I.current) == null ? void 0 : g.querySelector(`${N}[${T}="${encodeURIComponent(i[0])}"]`);
			l?.parentElement.appendChild(l);
		});
	}
	function W() {
		let e = V().find((s) => s.getAttribute("aria-disabled") !== "true"), a = e == null ? void 0 : e.getAttribute(T);
		E.setState("value", a || void 0);
	}
	function J() {
		var a, s, i, l;
		if (!n.current.search || p.current.shouldFilter === !1) {
			n.current.filtered.count = u.current.size;
			return;
		}
		n.current.filtered.groups = /* @__PURE__ */ new Set();
		let e = 0;
		for (let g of u.current) {
			let F = te((s = (a = d.current.get(g)) == null ? void 0 : a.value) != null ? s : "", (l = (i = d.current.get(g)) == null ? void 0 : i.keywords) != null ? l : []);
			n.current.filtered.items.set(g, F), F > 0 && e++;
		}
		for (let [g, y] of c.current) for (let h of y) if (n.current.filtered.items.get(h) > 0) {
			n.current.filtered.groups.add(g);
			break;
		}
		n.current.filtered.count = e;
	}
	function ne() {
		var a, s, i;
		let e = M();
		e && (((a = e.parentElement) == null ? void 0 : a.firstChild) === e && ((i = (s = e.closest(N)) == null ? void 0 : s.querySelector(be)) == null || i.scrollIntoView({ block: "nearest" })), e.scrollIntoView({ block: "nearest" }));
	}
	function M() {
		var e;
		return (e = I.current) == null ? void 0 : e.querySelector(`${le}[aria-selected="true"]`);
	}
	function V() {
		var e;
		return Array.from(((e = I.current) == null ? void 0 : e.querySelectorAll(ce)) || []);
	}
	function X(e) {
		let s = V()[e];
		s && E.setState("value", s.getAttribute(T));
	}
	function Q(e) {
		var g;
		let a = M(), s = V(), i = s.findIndex((y) => y === a), l = s[i + e];
		(g = p.current) != null && g.loop && (l = i + e < 0 ? s[s.length - 1] : i + e === s.length ? s[0] : s[i + e]), l && E.setState("value", l.getAttribute(T));
	}
	function re(e) {
		let a = M(), s = a == null ? void 0 : a.closest(N), i;
		for (; s && !i;) s = e > 0 ? we(s, N) : De(s, N), i = s == null ? void 0 : s.querySelector(ce);
		i ? E.setState("value", i.getAttribute(T)) : Q(e);
	}
	let oe = () => X(V().length - 1), ie = (e) => {
		e.preventDefault(), e.metaKey ? oe() : e.altKey ? re(1) : Q(1);
	}, se = (e) => {
		e.preventDefault(), e.metaKey ? X(0) : e.altKey ? re(-1) : Q(-1);
	};
	return import_react.createElement(Primitive.div, {
		ref: o,
		tabIndex: -1,
		...O,
		"cmdk-root": "",
		onKeyDown: (e) => {
			var s;
			(s = O.onKeyDown) == null || s.call(O, e);
			let a = e.nativeEvent.isComposing || e.keyCode === 229;
			if (!(e.defaultPrevented || a)) switch (e.key) {
				case "n":
				case "j":
					j && e.ctrlKey && ie(e);
					break;
				case "ArrowDown":
					ie(e);
					break;
				case "p":
				case "k":
					j && e.ctrlKey && se(e);
					break;
				case "ArrowUp":
					se(e);
					break;
				case "Home":
					e.preventDefault(), X(0);
					break;
				case "End":
					e.preventDefault(), oe();
					break;
				case "Enter": {
					e.preventDefault();
					let i = M();
					if (i) {
						let l = new Event(Z);
						i.dispatchEvent(l);
					}
				}
			}
		}
	}, import_react.createElement("label", {
		"cmdk-label": "",
		htmlFor: U.inputId,
		id: U.labelId,
		style: Te
	}, b), B$1(r, (e) => import_react.createElement(de.Provider, { value: E }, import_react.createElement(ue.Provider, { value: U }, e))));
});
var he = import_react.forwardRef((r, o) => {
	var _, I;
	let n = useId(), u = import_react.useRef(null), c = import_react.useContext(fe), d = K(), f = pe(r), p = (I = (_ = f.current) == null ? void 0 : _.forceMount) != null ? I : c == null ? void 0 : c.forceMount;
	k$2(() => {
		if (!p) return d.item(n, c == null ? void 0 : c.id);
	}, [p]);
	let b = ve(n, u, [
		r.value,
		r.children,
		u
	], r.keywords), m = ee(), R = P((v) => v.value && v.value === b.current), x = P((v) => p || d.filter() === !1 ? !0 : v.search ? v.filtered.items.get(n) > 0 : !0);
	import_react.useEffect(() => {
		let v = u.current;
		if (!(!v || r.disabled)) return v.addEventListener(Z, C), () => v.removeEventListener(Z, C);
	}, [
		x,
		r.onSelect,
		r.disabled
	]);
	function C() {
		var v, E;
		S(), (E = (v = f.current).onSelect) == null || E.call(v, b.current);
	}
	function S() {
		m.setState("value", b.current, !0);
	}
	if (!x) return null;
	let { disabled: A, value: ge, onSelect: j, forceMount: O, keywords: $, ...q } = r;
	return import_react.createElement(Primitive.div, {
		ref: composeRefs$1(u, o),
		...q,
		id: n,
		"cmdk-item": "",
		role: "option",
		"aria-disabled": !!A,
		"aria-selected": !!R,
		"data-disabled": !!A,
		"data-selected": !!R,
		onPointerMove: A || d.getDisablePointerSelection() ? void 0 : S,
		onClick: A ? void 0 : C
	}, r.children);
});
var Ee = import_react.forwardRef((r, o) => {
	let { heading: n, children: u, forceMount: c, ...d } = r, f = useId(), p = import_react.useRef(null), b = import_react.useRef(null), m = useId(), R = K(), x = P((S) => c || R.filter() === !1 ? !0 : S.search ? S.filtered.groups.has(f) : !0);
	k$2(() => R.group(f), []), ve(f, p, [
		r.value,
		r.heading,
		b
	]);
	let C = import_react.useMemo(() => ({
		id: f,
		forceMount: c
	}), [c]);
	return import_react.createElement(Primitive.div, {
		ref: composeRefs$1(p, o),
		...d,
		"cmdk-group": "",
		role: "presentation",
		hidden: x ? void 0 : !0
	}, n && import_react.createElement("div", {
		ref: b,
		"cmdk-group-heading": "",
		"aria-hidden": !0,
		id: m
	}, n), B$1(r, (S) => import_react.createElement("div", {
		"cmdk-group-items": "",
		role: "group",
		"aria-labelledby": n ? m : void 0
	}, import_react.createElement(fe.Provider, { value: C }, S))));
});
var ye = import_react.forwardRef((r, o) => {
	let { alwaysRender: n, ...u } = r, c = import_react.useRef(null), d = P((f) => !f.search);
	return !n && !d ? null : import_react.createElement(Primitive.div, {
		ref: composeRefs$1(c, o),
		...u,
		"cmdk-separator": "",
		role: "separator"
	});
});
var Se = import_react.forwardRef((r, o) => {
	let { onValueChange: n, ...u } = r, c = r.value != null, d = ee(), f = P((m) => m.search), p = P((m) => m.selectedItemId), b = K();
	return import_react.useEffect(() => {
		r.value != null && d.setState("search", r.value);
	}, [r.value]), import_react.createElement(Primitive.input, {
		ref: o,
		...u,
		"cmdk-input": "",
		autoComplete: "off",
		autoCorrect: "off",
		spellCheck: !1,
		"aria-autocomplete": "list",
		role: "combobox",
		"aria-expanded": !0,
		"aria-controls": b.listId,
		"aria-labelledby": b.labelId,
		"aria-activedescendant": p,
		id: b.inputId,
		type: "text",
		value: c ? r.value : f,
		onChange: (m) => {
			c || d.setState("search", m.target.value), n?.(m.target.value);
		}
	});
});
var Ce = import_react.forwardRef((r, o) => {
	let { children: n, label: u = "Suggestions", ...c } = r, d = import_react.useRef(null), f = import_react.useRef(null), p = P((m) => m.selectedItemId), b = K();
	return import_react.useEffect(() => {
		if (f.current && d.current) {
			let m = f.current, R = d.current, x, C = new ResizeObserver(() => {
				x = requestAnimationFrame(() => {
					let S = m.offsetHeight;
					R.style.setProperty("--cmdk-list-height", S.toFixed(1) + "px");
				});
			});
			return C.observe(m), () => {
				cancelAnimationFrame(x), C.unobserve(m);
			};
		}
	}, []), import_react.createElement(Primitive.div, {
		ref: composeRefs$1(d, o),
		...c,
		"cmdk-list": "",
		role: "listbox",
		tabIndex: -1,
		"aria-activedescendant": p,
		"aria-label": u,
		id: b.listId
	}, B$1(r, (m) => import_react.createElement("div", {
		ref: composeRefs$1(f, b.listInnerRef),
		"cmdk-list-sizer": ""
	}, m)));
});
var xe = import_react.forwardRef((r, o) => {
	let { open: n, onOpenChange: u, overlayClassName: c, contentClassName: d, container: f, ...p } = r;
	return import_react.createElement(Dialog$1, {
		open: n,
		onOpenChange: u
	}, import_react.createElement(DialogPortal, { container: f }, import_react.createElement(DialogOverlay, {
		"cmdk-overlay": "",
		className: c
	}), import_react.createElement(DialogContent$1, {
		"aria-label": r.label,
		"cmdk-dialog": "",
		className: d
	}, import_react.createElement(me, {
		ref: o,
		...p
	}))));
});
var Ie = import_react.forwardRef((r, o) => P((u) => u.filtered.count === 0) ? import_react.createElement(Primitive.div, {
	ref: o,
	...r,
	"cmdk-empty": "",
	role: "presentation"
}) : null);
var Pe = import_react.forwardRef((r, o) => {
	let { progress: n, children: u, label: c = "Loading...", ...d } = r;
	return import_react.createElement(Primitive.div, {
		ref: o,
		...d,
		"cmdk-loading": "",
		role: "progressbar",
		"aria-valuenow": n,
		"aria-valuemin": 0,
		"aria-valuemax": 100,
		"aria-label": c
	}, B$1(r, (f) => import_react.createElement("div", { "aria-hidden": !0 }, f)));
});
var _e = Object.assign(me, {
	List: Ce,
	Item: he,
	Input: Se,
	Group: Ee,
	Separator: ye,
	Dialog: xe,
	Empty: Ie,
	Loading: Pe
});
function we(r, o) {
	let n = r.nextElementSibling;
	for (; n;) {
		if (n.matches(o)) return n;
		n = n.nextElementSibling;
	}
}
function De(r, o) {
	let n = r.previousElementSibling;
	for (; n;) {
		if (n.matches(o)) return n;
		n = n.previousElementSibling;
	}
}
function pe(r) {
	let o = import_react.useRef(r);
	return k$2(() => {
		o.current = r;
	}), o;
}
var k$2 = typeof window == "undefined" ? import_react.useEffect : import_react.useLayoutEffect;
function L(r) {
	let o = import_react.useRef();
	return o.current === void 0 && (o.current = r()), o;
}
function P(r) {
	let o = ee(), n = () => r(o.snapshot());
	return import_react.useSyncExternalStore(o.subscribe, n, n);
}
function ve(r, o, n, u = []) {
	let c = import_react.useRef(), d = K();
	return k$2(() => {
		var b;
		let f = (() => {
			var m;
			for (let R of n) {
				if (typeof R == "string") return R.trim();
				if (typeof R == "object" && "current" in R) return R.current ? (m = R.current.textContent) == null ? void 0 : m.trim() : c.current;
			}
		})(), p = u.map((m) => m.trim());
		d.value(r, f, p), (b = o.current) == null || b.setAttribute(T, f), c.current = f;
	}), c;
}
var ke = () => {
	let [r, o] = import_react.useState(), n = L(() => /* @__PURE__ */ new Map());
	return k$2(() => {
		n.current.forEach((u) => u()), n.current = /* @__PURE__ */ new Map();
	}, [r]), (u, c) => {
		n.current.set(u, c), o({});
	};
};
function Me(r) {
	let o = r.type;
	return typeof o == "function" ? o(r.props) : "render" in o ? o.render(r.props) : r;
}
function B$1({ asChild: r, children: o }, n) {
	return r && import_react.isValidElement(o) ? import_react.cloneElement(Me(o), { ref: o.ref }, n(o.props.children)) : n(o);
}
var Te = {
	position: "absolute",
	width: "1px",
	height: "1px",
	padding: "0",
	margin: "-1px",
	overflow: "hidden",
	clip: "rect(0, 0, 0, 0)",
	whiteSpace: "nowrap",
	borderWidth: "0"
};
String.raw;
var m = String.raw;
var v = (() => {
	try {
		document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
	} catch {
		return !1;
	}
	return !0;
})();
var k$1 = typeof CSS < "u" && CSS.supports && CSS.supports("line-height", "mod(1,1)");
var S = typeof matchMedia < "u" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
var d = "--_number-flow-d-opacity";
var g = "--_number-flow-d-width";
var c = "--_number-flow-dx";
var u = "--_number-flow-d";
var _ = (() => {
	try {
		return CSS.registerProperty({
			name: d,
			syntax: "<number>",
			inherits: !1,
			initialValue: "0"
		}), CSS.registerProperty({
			name: c,
			syntax: "<length>",
			inherits: !0,
			initialValue: "0px"
		}), CSS.registerProperty({
			name: g,
			syntax: "<number>",
			inherits: !1,
			initialValue: "0"
		}), CSS.registerProperty({
			name: u,
			syntax: "<number>",
			inherits: !0,
			initialValue: "0"
		}), !0;
	} catch {
		return !1;
	}
})();
var s = "round(nearest, calc(var(--number-flow-mask-height, 0.25em) / 2), 1px)";
var t = `calc(${s} * 2)`;
var p = "var(--number-flow-mask-width, 0.5em)";
var n = `calc(${p} / var(--scale-x))`;
var r$1 = "#000 0, transparent 71%";
var x$1 = m`:host{display:inline-block;direction:ltr;white-space:nowrap;isolation:isolate;line-height:1}.number,.number__inner{display:inline-block;transform-origin:left top}:host([data-will-change]) :is(.number,.number__inner,.section,.digit,.digit__num,.symbol){will-change:transform}.number{--scale-x:calc(1 + var(${g}) / var(--width));transform:translateX(var(${c})) scaleX(var(--scale-x));margin:0 calc(-1 * ${p});position:relative;-webkit-mask-image:linear-gradient(to right,transparent 0,#000 ${n},#000 calc(100% - ${n}),transparent ),linear-gradient(to bottom,transparent 0,#000 ${t},#000 calc(100% - ${t}),transparent 100% ),radial-gradient(at bottom right,${r$1}),radial-gradient(at bottom left,${r$1}),radial-gradient(at top left,${r$1}),radial-gradient(at top right,${r$1});-webkit-mask-size:100% calc(100% - ${t} * 2),calc(100% - ${n} * 2) 100%,${n} ${t},${n} ${t},${n} ${t},${n} ${t};-webkit-mask-position:center,center,top left,top right,bottom right,bottom left;-webkit-mask-repeat:no-repeat}.number__inner{padding:${s} ${p};transform:scaleX(calc(1 / var(--scale-x))) translateX(calc(-1 * var(${c})))}:host > :not(.number){z-index:5}.section,.symbol{display:inline-block;position:relative;isolation:isolate}.section::after{content:'\200b';display:inline-block}.section--justify-left{transform-origin:center left}.section--justify-right{transform-origin:center right}.section > [inert],.symbol > [inert]{margin:0 !important;position:absolute !important;z-index:-1}.digit{display:inline-block;position:relative;--c:var(--current) + var(${u})}.digit__num,.number .section::after{padding:${s} 0}.digit__num{display:inline-block;--offset-raw:mod(var(--length) + var(--n) - mod(var(--c),var(--length)),var(--length));--offset:calc( var(--offset-raw) - var(--length) * round(down,var(--offset-raw) / (var(--length) / 2),1) );--y:clamp(-100%,var(--offset) * 100%,100%);transform:translateY(var(--y))}.digit__num[inert]{position:absolute;top:0;left:50%;transform:translateX(-50%) translateY(var(--y))}.digit:not(.is-spinning) .digit__num[inert]{display:none}.symbol__value{display:inline-block;mix-blend-mode:plus-lighter;white-space:pre}.section--justify-left .symbol > [inert]{left:0}.section--justify-right .symbol > [inert]{right:0}.animate-presence{opacity:calc(1 + var(${d}))}`;
var M = typeof HTMLElement < "u" ? HTMLElement : class {};
var y$1 = m`:host{display:inline-block;direction:ltr;white-space:nowrap;line-height:1}span{display:inline-block}:host([data-will-change]) span{will-change:transform}.number,.digit{padding:${s} 0}.symbol{white-space:pre}`;
var $ = (e = "") => m`:where(number-flow${e}){line-height:1}number-flow${e} > span{font-kerning:none;display:inline-block;padding:${t} 0}`;
// node_modules/number-flow/dist/lite.mjs
var f = (n, t, e) => {
	const i = document.createElement(n), [s, o] = Array.isArray(t) ? [void 0, t] : [t, e];
	return s && Object.assign(i, s), o?.forEach((a) => i.appendChild(a)), i;
};
var D = (n, t) => {
	var e;
	return t === "left" ? n.offsetLeft : (((e = n.offsetParent instanceof HTMLElement ? n.offsetParent : null) == null ? void 0 : e.offsetWidth) ?? 0) - n.offsetWidth - n.offsetLeft;
};
var W = (n) => n.offsetWidth > 0 && n.offsetHeight > 0;
var X = (n, t) => {
	typeof HTMLElement < "u" && typeof customElements < "u" && !customElements.get(n) && customElements.define(n, t);
};
function k(n, t, { reverse: e = !1 } = {}) {
	const i = n.length;
	for (let s = e ? i - 1 : 0; e ? s >= 0 : s < i; e ? s-- : s++) t(n[s], s);
}
function z(n, t, e, i) {
	const s = t.formatToParts(n);
	e && s.unshift({
		type: "prefix",
		value: e
	}), i && s.push({
		type: "suffix",
		value: i
	});
	const o = [], a = [], r = [], d = [], c = {}, p = (l) => `${l}:${c[l] = (c[l] ?? -1) + 1}`;
	let u = "", m = !1, g = !1;
	for (const l of s) {
		u += l.value;
		const h = l.type === "minusSign" || l.type === "plusSign" ? "sign" : l.type;
		h === "integer" ? (m = !0, a.push(...l.value.split("").map((_) => ({
			type: h,
			value: parseInt(_)
		})))) : h === "group" ? a.push({
			type: h,
			value: l.value
		}) : h === "decimal" ? (g = !0, r.push({
			type: h,
			value: l.value,
			key: p(h)
		})) : h === "fraction" ? r.push(...l.value.split("").map((_) => ({
			type: h,
			value: parseInt(_),
			key: p(h),
			pos: -1 - c[h]
		}))) : (m || g ? d : o).push({
			type: h,
			value: l.value,
			key: p(h)
		});
	}
	const v = [];
	for (let l = a.length - 1; l >= 0; l--) {
		const h = a[l];
		v.unshift(h.type === "integer" ? {
			...h,
			key: p(h.type),
			pos: c[h.type]
		} : {
			...h,
			key: p(h.type)
		});
	}
	return {
		pre: o,
		integer: v,
		fraction: r,
		post: d,
		valueAsString: u,
		value: typeof n == "string" ? parseFloat(n) : n
	};
}
var E = k$1 && v && _;
var B = class extends M {
	constructor() {
		super(), this.created = !1, this.batched = !1, this._preUpdated = !1;
		const { animated: t, ...e } = this.constructor.defaultProps;
		this._animated = this.computedAnimated = t, Object.assign(this, e);
	}
	get animated() {
		return this._animated;
	}
	set animated(t) {
		var e;
		this.animated !== t && (this._animated = t, (e = this.shadowRoot) == null || e.getAnimations().forEach((i) => i.finish()));
	}
	/**
	* @internal
	*/
	set data(t) {
		var r, d;
		if (t == null || t === this._data) return;
		const { pre: e, integer: i, fraction: s, post: o, value: a } = t;
		if (this.created) {
			const c = this._data;
			this._data = t, this.computedTrend = typeof this.trend == "function" ? this.trend(c.value, a) : this.trend, this.computedAnimated = E && this._animated && (!this.respectMotionPreference || !((r = S) != null && r.matches)) && W(this) && this.ownerDocument.visibilityState === "visible", (d = this.plugins) == null || d.forEach((p) => {
				var u;
				return (u = p.onUpdate) == null ? void 0 : u.call(p, t, c, this);
			}), this.batched || this.willUpdate(), this._pre.update(e), this._num.update({
				integer: i,
				fraction: s
			}), this._post.update(o), this.batched || this.didUpdate();
		} else {
			this._data = t, this.attachShadow({ mode: "open" });
			try {
				this._internals ?? (this._internals = this.attachInternals()), this._internals.role = "img";
			} catch {}
			const c = document.createElement("style");
			this.nonce && (c.nonce = this.nonce), c.textContent = x$1, this.shadowRoot.appendChild(c), this._pre = new U(this, e, {
				justify: "right",
				part: "left"
			}), this.shadowRoot.appendChild(this._pre.el), this._num = new F(this, i, s), this.shadowRoot.appendChild(this._num.el), this._post = new U(this, o, {
				justify: "left",
				part: "right"
			}), this.shadowRoot.appendChild(this._post.el), this.created = !0;
		}
		try {
			this._internals.ariaLabel = t.valueAsString;
		} catch {}
	}
	/**
	* @internal
	*/
	willUpdate() {
		var t;
		this._preUpdated = E && this._animated && (!this.respectMotionPreference || !((t = S) != null && t.matches)) && this.ownerDocument.visibilityState === "visible", this._preUpdated && (this._pre.willUpdate(), this._num.willUpdate(), this._post.willUpdate());
	}
	/**
	* @internal
	*/
	didUpdate() {
		if (!this.computedAnimated || !this._preUpdated) return;
		this._abortAnimationsFinish ? this._abortAnimationsFinish.abort() : this.dispatchEvent(new Event("animationsstart")), this._pre.didUpdate(), this._num.didUpdate(), this._post.didUpdate();
		const t = new AbortController();
		Promise.all(this.shadowRoot.getAnimations().map((e) => e.finished)).then(() => {
			t.signal.aborted || (this.dispatchEvent(new Event("animationsfinish")), this._abortAnimationsFinish = void 0);
		}), this._abortAnimationsFinish = t;
	}
};
B.defaultProps = {
	transformTiming: {
		duration: 900,
		easing: "linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)"
	},
	spinTiming: void 0,
	opacityTiming: {
		duration: 450,
		easing: "ease-out"
	},
	animated: !0,
	trend: (n, t) => Math.sign(t - n),
	respectMotionPreference: !0,
	plugins: void 0,
	digits: void 0
};
var F = class {
	constructor(t, e, i, { className: s, ...o } = {}) {
		this.flow = t, this._integer = new A(t, e, {
			justify: "right",
			part: "integer"
		}), this._fraction = new A(t, i, {
			justify: "left",
			part: "fraction"
		}), this._inner = f("span", { className: "number__inner" }, [this._integer.el, this._fraction.el]), this.el = f("span", {
			...o,
			part: "number",
			className: `number ${s ?? ""}`
		}, [this._inner]);
	}
	willUpdate() {
		this._prevWidth = this.el.offsetWidth, this._prevLeft = this.el.getBoundingClientRect().left, this._integer.willUpdate(), this._fraction.willUpdate();
	}
	update({ integer: t, fraction: e }) {
		this._integer.update(t), this._fraction.update(e);
	}
	didUpdate() {
		const t = this.el.getBoundingClientRect();
		this._integer.didUpdate(), this._fraction.didUpdate();
		const e = this._prevLeft - t.left, i = this.el.offsetWidth, s = this._prevWidth - i;
		this.el.style.setProperty("--width", String(i)), this.el.animate({
			[c]: [`${e}px`, "0px"],
			[g]: [s, 0]
		}, {
			...this.flow.transformTiming,
			composite: "accumulate"
		});
	}
};
var R = class {
	constructor(t, e, { justify: i, className: s, ...o }, a) {
		this.flow = t, this.children = /* @__PURE__ */ new Map(), this.onCharRemove = (d) => () => {
			this.children.delete(d);
		}, this.justify = i;
		const r = e.map((d) => this.addChar(d).el);
		this.el = f("span", {
			...o,
			className: `section section--justify-${i} ${s ?? ""}`
		}, a ? a(r) : r);
	}
	addChar(t, { startDigitsAtZero: e = !1, ...i } = {}) {
		const s = t.type === "integer" || t.type === "fraction" ? new C(this, t.type, e ? 0 : t.value, t.pos, {
			...i,
			onRemove: this.onCharRemove(t.key)
		}) : new I(this, t.type, t.value, {
			...i,
			onRemove: this.onCharRemove(t.key)
		});
		return this.children.set(t.key, s), s;
	}
	unpop(t) {
		t.el.removeAttribute("inert"), t.el.style.top = "", t.el.style[this.justify] = "";
	}
	pop(t) {
		t.forEach((e) => {
			e.el.style.top = `${e.el.offsetTop}px`, e.el.style[this.justify] = `${D(e.el, this.justify)}px`;
		}), t.forEach((e) => {
			e.el.setAttribute("inert", ""), e.present = !1;
		});
	}
	addNewAndUpdateExisting(t) {
		const e = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), s = this.justify === "left", o = s ? "prepend" : "append";
		if (k(t, (a) => {
			let r;
			this.children.has(a.key) ? (r = this.children.get(a.key), i.set(a, r), this.unpop(r), r.present = !0) : (r = this.addChar(a, {
				startDigitsAtZero: !0,
				animateIn: !0
			}), e.set(a, r)), this.el[o](r.el);
		}, { reverse: s }), this.flow.computedAnimated) {
			const a = this.el.getBoundingClientRect();
			e.forEach((r) => {
				r.willUpdate(a);
			});
		}
		e.forEach((a, r) => {
			a.update(r.value);
		}), i.forEach((a, r) => {
			a.update(r.value);
		});
	}
	willUpdate() {
		const t = this.el.getBoundingClientRect();
		this._prevOffset = t[this.justify], this.children.forEach((e) => e.willUpdate(t));
	}
	didUpdate() {
		const t = this.el.getBoundingClientRect();
		this.children.forEach((s) => s.didUpdate(t));
		const e = t[this.justify], i = this._prevOffset - e;
		i && this.children.size && this.el.animate({ transform: [`translateX(${i}px)`, "none"] }, {
			...this.flow.transformTiming,
			composite: "accumulate"
		});
	}
};
var A = class extends R {
	update(t) {
		const e = /* @__PURE__ */ new Map();
		this.children.forEach((i, s) => {
			t.find((o) => o.key === s) || e.set(s, i), this.unpop(i);
		}), this.addNewAndUpdateExisting(t), e.forEach((i) => {
			i instanceof C && i.update(0);
		}), this.pop(e);
	}
};
var U = class extends R {
	update(t) {
		const e = /* @__PURE__ */ new Map();
		this.children.forEach((i, s) => {
			t.find((o) => o.key === s) || e.set(s, i);
		}), this.pop(e), this.addNewAndUpdateExisting(t);
	}
};
var y = class {
	constructor(t, e, { onRemove: i, animateIn: s = !1 } = {}) {
		this.flow = t, this.el = e, this._present = !0, this._remove = () => {
			var o;
			this.el.remove(), (o = this._onRemove) == null || o.call(this);
		}, this.el.classList.add("animate-presence"), this.flow.computedAnimated && s && this.el.animate({ ["--_number-flow-d-opacity"]: [-.9999, 0] }, {
			...this.flow.opacityTiming,
			composite: "accumulate"
		}), this._onRemove = i;
	}
	get present() {
		return this._present;
	}
	set present(t) {
		if (this._present !== t) {
			if (this._present = t, t ? this.el.removeAttribute("inert") : this.el.setAttribute("inert", ""), !this.flow.computedAnimated) {
				t || this._remove();
				return;
			}
			this.el.style.setProperty("--_number-flow-d-opacity", t ? "0" : "-.999"), this.el.animate({ [d]: t ? [-.9999, 0] : [.999, 0] }, {
				...this.flow.opacityTiming,
				composite: "accumulate"
			}), t ? this.flow.removeEventListener("animationsfinish", this._remove) : this.flow.addEventListener("animationsfinish", this._remove, { once: !0 });
		}
	}
};
var x = class extends y {
	constructor(t, e, i, s) {
		super(t.flow, i, s), this.section = t, this.value = e, this.el = i;
	}
};
var C = class extends x {
	constructor(t, e, i, s, o) {
		var c, p;
		const a = (((p = (c = t.flow.digits) == null ? void 0 : c[s]) == null ? void 0 : p.max) ?? 9) + 1, r = Array.from({ length: a }).map((u, m) => {
			const g = f("span", { className: "digit__num" }, [document.createTextNode(String(m))]);
			return m !== i && g.setAttribute("inert", ""), g.style.setProperty("--n", String(m)), g;
		}), d = f("span", {
			part: `digit ${e}-digit`,
			className: "digit"
		}, r);
		d.style.setProperty("--current", String(i)), d.style.setProperty("--length", String(a)), super(t, i, d, o), this.pos = s, this._onAnimationsFinish = () => {
			this.el.classList.remove("is-spinning");
		}, this._numbers = r, this.length = a;
	}
	willUpdate(t) {
		const e = this.el.getBoundingClientRect();
		this._prevValue = this.value;
		const i = e[this.section.justify] - t[this.section.justify], s = e.width / 2;
		this._prevCenter = this.section.justify === "left" ? i + s : i - s;
	}
	update(t) {
		this.el.style.setProperty("--current", String(t)), this._numbers.forEach((e, i) => i === t ? e.removeAttribute("inert") : e.setAttribute("inert", "")), this.value = t;
	}
	didUpdate(t) {
		const e = this.el.getBoundingClientRect(), i = e[this.section.justify] - t[this.section.justify], s = e.width / 2, o = this.section.justify === "left" ? i + s : i - s, a = this._prevCenter - o;
		a && this.el.animate({ transform: [`translateX(${a}px)`, "none"] }, {
			...this.flow.transformTiming,
			composite: "accumulate"
		});
		const r = this.getDelta();
		r && (this.el.classList.add("is-spinning"), this.el.animate({ ["--_number-flow-d"]: [-r, 0] }, {
			...this.flow.spinTiming ?? this.flow.transformTiming,
			composite: "accumulate"
		}), this.flow.addEventListener("animationsfinish", this._onAnimationsFinish, { once: !0 }));
	}
	getDelta() {
		var i;
		if (this.flow.plugins) for (const s of this.flow.plugins) {
			const o = (i = s.getDelta) == null ? void 0 : i.call(s, this.value, this._prevValue, this);
			if (o != null) return o;
		}
		const t = this.value - this._prevValue, e = this.flow.computedTrend || Math.sign(t);
		return e < 0 && this.value > this._prevValue ? this.value - this.length - this._prevValue : e > 0 && this.value < this._prevValue ? this.length - this._prevValue + this.value : t;
	}
};
var I = class extends x {
	constructor(t, e, i, s) {
		const o = f("span", {
			className: "symbol__value",
			textContent: i
		});
		super(t, i, f("span", {
			part: `symbol ${e}`,
			className: "symbol"
		}, [o]), s), this.type = e, this._children = /* @__PURE__ */ new Map(), this._onChildRemove = (a) => () => {
			this._children.delete(a);
		}, this._children.set(i, new y(this.flow, o, { onRemove: this._onChildRemove(i) }));
	}
	willUpdate(t) {
		if (this.type === "decimal") return;
		const e = this.el.getBoundingClientRect();
		this._prevOffset = e[this.section.justify] - t[this.section.justify];
	}
	update(t) {
		if (this.value !== t) {
			const e = this._children.get(this.value);
			e && (e.present = !1);
			const i = this._children.get(t);
			if (i) i.present = !0;
			else {
				const s = f("span", {
					className: "symbol__value",
					textContent: t
				});
				this.el.appendChild(s), this._children.set(t, new y(this.flow, s, {
					animateIn: !0,
					onRemove: this._onChildRemove(t)
				}));
			}
		}
		this.value = t;
	}
	didUpdate(t) {
		if (this.type === "decimal") return;
		const i = this.el.getBoundingClientRect()[this.section.justify] - t[this.section.justify], s = this._prevOffset - i;
		s && this.el.animate({ transform: [`translateX(${s}px)`, "none"] }, {
			...this.flow.transformTiming,
			composite: "accumulate"
		});
	}
};
// node_modules/number-flow/dist/csp.mjs
var r = (s) => [
	y$1,
	$(s),
	x$1
];
// node_modules/@number-flow/react/dist/NumberFlow-client-BGPmzcXX.mjs
var isReact19 = parseInt("19.3.1".match(/^(\d+)\./)?.[1]) >= 19;
var OBSERVED_ATTRIBUTES = ["data", "digits"];
var NumberFlowElement = class extends B {
	attributeChangedCallback(attr, _oldValue, newValue) {
		this[attr] = JSON.parse(newValue);
	}
};
NumberFlowElement.observedAttributes = isReact19 ? [] : OBSERVED_ATTRIBUTES;
X("number-flow-react", NumberFlowElement);
var formatters$1 = {};
function identity(v) {
	return v;
}
var serialize = isReact19 ? identity : JSON.stringify;
function splitProps(props) {
	const { transformTiming, spinTiming, opacityTiming, animated, respectMotionPreference, trend, plugins, ...rest } = props;
	return [{
		transformTiming,
		spinTiming,
		opacityTiming,
		animated,
		respectMotionPreference,
		trend,
		plugins
	}, rest];
}
var NumberFlowImpl = class extends import_react.Component {
	updateProperties(prevProps) {
		if (!this.el) return;
		this.el.batched = !this.props.isolate;
		const [nonData] = splitProps(this.props);
		Object.entries(nonData).forEach(([k, v]) => {
			this.el[k] = v ?? NumberFlowElement.defaultProps[k];
		});
		if (prevProps?.onAnimationsStart) this.el.removeEventListener("animationsstart", prevProps.onAnimationsStart);
		if (this.props.onAnimationsStart) this.el.addEventListener("animationsstart", this.props.onAnimationsStart);
		if (prevProps?.onAnimationsFinish) this.el.removeEventListener("animationsfinish", prevProps.onAnimationsFinish);
		if (this.props.onAnimationsFinish) this.el.addEventListener("animationsfinish", this.props.onAnimationsFinish);
	}
	componentDidMount() {
		this.updateProperties();
		if (isReact19 && this.el) {
			this.el.digits = this.props.digits;
			this.el.data = this.props.data;
		}
	}
	getSnapshotBeforeUpdate(prevProps) {
		this.updateProperties(prevProps);
		if (prevProps.data !== this.props.data) {
			if (this.props.group) {
				this.props.group.willUpdate();
				return () => this.props.group?.didUpdate();
			}
			if (!this.props.isolate) {
				this.el?.willUpdate();
				return () => this.el?.didUpdate();
			}
		}
		return null;
	}
	componentDidUpdate(_, __, didUpdate) {
		didUpdate?.();
	}
	handleRef(el) {
		if (this.props.innerRef) this.props.innerRef.current = el;
		this.el = el;
	}
	render() {
		const [_, { innerRef, className, data, nonce, willChange, isolate, group, digits, onAnimationsStart, onAnimationsFinish, ...rest }] = splitProps(this.props);
		return /*#__PURE__*/ import_react.createElement("number-flow-react", {
			ref: this.handleRef,
			"data-will-change": willChange ? "" : void 0,
			class: className,
			nonce,
			...rest,
			dangerouslySetInnerHTML: { __html: "" },
			suppressHydrationWarning: true,
			digits: serialize(digits),
			data: serialize(data)
		});
	}
	constructor(props) {
		super(props);
		this.handleRef = this.handleRef.bind(this);
	}
};
var NumberFlow = /*#__PURE__*/ import_react.forwardRef(function NumberFlow({ value, locales, format, prefix, suffix, ...props }, _ref) {
	import_react.useImperativeHandle(_ref, () => ref.current, []);
	const ref = import_react.useRef(void 0);
	const group = import_react.useContext(NumberFlowGroupContext);
	group?.useRegister(ref);
	const localesString = import_react.useMemo(() => locales ? JSON.stringify(locales) : "", [locales]);
	const formatString = import_react.useMemo(() => format ? JSON.stringify(format) : "", [format]);
	const data = import_react.useMemo(() => {
		return z(value, formatters$1[`${localesString}:${formatString}`] ??= new Intl.NumberFormat(locales, format), prefix, suffix);
	}, [
		value,
		localesString,
		formatString,
		prefix,
		suffix
	]);
	return /*#__PURE__*/ import_react.createElement(NumberFlowImpl, {
		...props,
		group,
		data,
		innerRef: ref
	});
});
var NumberFlowGroupContext = /*#__PURE__*/ import_react.createContext(void 0);
r("-react");
// node_modules/@ui-sdk/core/dist/foundation/focus/collection.js
var orientationOf = (value, fallback) => value === "horizontal" || value === "vertical" ? value : fallback;
function stepFor(key, orientation, rtl) {
	if (orientation === "both") return radioStep(key, rtl) ?? (key === "Home" ? "first" : key === "End" ? "last" : void 0);
	const forward = orientation === "vertical" ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
	const backward = orientation === "vertical" ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
	if (key === forward) return 1;
	if (key === backward) return -1;
	if (key === "Home") return "first";
	if (key === "End") return "last";
}
function radioStep(key, rtl) {
	if (key === "ArrowDown" || key === (rtl ? "ArrowLeft" : "ArrowRight")) return 1;
	if (key === "ArrowUp" || key === (rtl ? "ArrowRight" : "ArrowLeft")) return -1;
}
function rovingStop(items, remembered = null) {
	const focusable = items.filter((item) => item.focusable);
	if (remembered !== null && focusable.some((item) => item.key === remembered)) return remembered;
	const enabled = focusable.filter((item) => !item.disabled);
	return (enabled.find((item) => item.preferred) ?? enabled[0] ?? focusable[0])?.key ?? null;
}
function moveIndex(index, step, count, loop) {
	if (step === "first") return 0;
	if (step === "last") return count - 1;
	const next = index + step;
	if (loop) return (next % count + count) % count;
	return Math.max(0, Math.min(count - 1, next));
}
function scrollToShow(scroll, viewport, start, size, before = 0, after = 0) {
	if (start - before < scroll) return Math.max(0, start - before);
	if (start + size + after > scroll + viewport) return Math.max(0, start + size + after - viewport);
	return scroll;
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/order.js
var following = 4;
var isAfter = (node, later) => !!(node.compareDocumentPosition(later) & following);
var documentOrder = (a, b) => isAfter(a, b) ? -1 : 1;
var walkFrom = 16;
var walkPerEntry = 32;
function inDocumentOrder(entries) {
	let container = entries.length < walkFrom ? null : entries[0].el.parentNode;
	while (container && !entries.every(({ el }) => container.contains(el))) container = container.parentNode;
	if (container) {
		const byElement = new Map(entries.map((entry) => [entry.el, entry]));
		const sorted = [];
		const walker = entries[0].el.ownerDocument.createTreeWalker(container, 1);
		let budget = entries.length * walkPerEntry;
		for (let node = container; node && budget--; node = walker.nextNode()) {
			const entry = byElement.get(node);
			if (entry && sorted.push(entry) === entries.length) return sorted;
		}
	}
	return entries.sort((a, b) => documentOrder(a.el, b.el));
}
function createOrder() {
	const entries = /* @__PURE__ */ new Map();
	let order;
	let joined = [];
	let left = false;
	let moves;
	const watched = /* @__PURE__ */ new Set();
	const current = (entry) => entries.get(entry.key) === entry;
	function watch(added, list) {
		moves ??= new MutationObserver(() => order = void 0);
		const last = list[list.length - 1]?.el;
		for (const { el } of added) for (let node = el.parentNode; node && !watched.has(node); node = node.parentNode) {
			watched.add(node);
			moves.observe(node, { childList: true });
			if (node.contains(last)) break;
		}
	}
	function sorted() {
		const all = [...entries.values()];
		const list = inDocumentOrder(all.filter((entry) => entry.el.isConnected));
		if (list.length < all.length) return list;
		if (typeof MutationObserver !== "undefined") {
			moves?.disconnect();
			watched.clear();
			watch(list, list);
		}
		return order = list;
	}
	function updated(kept) {
		const added = joined.filter(current);
		if (added.some((entry) => !entry.el.isConnected)) return;
		const list = kept.filter(current);
		if (added.length * Math.log2(list.length + 2) > list.length) return;
		for (const entry of added) {
			let low = 0;
			let high = list.length;
			while (low < high) {
				const middle = low + high >> 1;
				if (isAfter(list[middle].el, entry.el)) low = middle + 1;
				else high = middle;
			}
			list.splice(low, 0, entry);
		}
		if (moves) watch(added, list);
		return list;
	}
	return {
		/** The entries in the page, in document order. Shared until one is added, removed or moved. */
		list() {
			if (moves?.takeRecords().length) order = void 0;
			if (order && (joined.length || left)) order = updated(order);
			joined = [];
			left = false;
			return order ?? sorted();
		},
		/** Adds an entry, or replaces the one with its key. Returns its removal. */
		add(entry) {
			if (order && entries.has(entry.key)) left = true;
			entries.set(entry.key, entry);
			if (order) joined.push(entry);
			return () => {
				if (!current(entry)) return;
				entries.delete(entry.key);
				left = true;
				if (!entries.size) {
					moves?.disconnect();
					watched.clear();
					order = void 0;
				}
			};
		},
		get: (key) => entries.get(key),
		size: () => entries.size
	};
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/trusted.js
var trusted = (event) => event.isTrusted;
// node_modules/@ui-sdk/core/dist/foundation/forms/value.js
function afterReset(event, run) {
	setTimeout(() => {
		if (!event.defaultPrevented) run();
	});
}
var scriptWrites = /* @__PURE__ */ new Set();
function writingFromScript(el) {
	for (let node = el; node; node = node.parentElement) if (scriptWrites.has(node)) return true;
	return false;
}
function keepsValueOnReset(value, defaultValue) {
	return value !== void 0 && defaultValue === void 0;
}
// node_modules/@ui-sdk/core/dist/foundation/forms/form.js
var internalsOf = /* @__PURE__ */ new WeakMap();
function formInternals(el) {
	return el ? internalsOf.get(el)?.internals : void 0;
}
var messages = /* @__PURE__ */ new Map();
function valueMissingMessage(type) {
	if (typeof document === "undefined") return "";
	if (!messages.has(type)) {
		const control = type === "select" ? document.createElement("select") : Object.assign(document.createElement("input"), { type });
		control.name = "message";
		control.required = true;
		messages.set(type, control.validationMessage);
	}
	return messages.get(type);
}
var blocksImplicitSubmission = /* @__PURE__ */ new Set([
	"text",
	"search",
	"url",
	"tel",
	"email",
	"password",
	"date",
	"month",
	"week",
	"time",
	"datetime-local",
	"number"
]);
var segments = /* @__PURE__ */ new WeakSet();
var defaultButton = (form) => Array.from(form.getRootNode().querySelectorAll("button, input[type=submit], input[type=image]")).find((el) => el.form === form && (el.type === "submit" || el.type === "image"));
var blocking = (elements) => elements.filter((el) => el instanceof HTMLInputElement && blocksImplicitSubmission.has(el.type));
function submitImplicitly(form) {
	if (!form) return;
	const button = defaultButton(form);
	if (button) {
		if (!button.disabled) button.click();
		return;
	}
	if (blocking(Array.from(form.elements)).filter((el) => !segments.has(el)).length <= 1) form.requestSubmit();
}
function dispatchChange(el, types = ["input", "change"]) {
	if (!el || writingFromScript(el)) return;
	queueMicrotask(() => {
		if (!el.isConnected) return;
		if (types.includes("input")) el.dispatchEvent(new Event("input", {
			bubbles: true,
			composed: true
		}));
		if (types.includes("change")) el.dispatchEvent(new Event("change", { bubbles: true }));
	});
}
function fieldsetDisabled(el) {
	for (let node = el.parentElement; node; node = node.parentElement) {
		if (!(node instanceof HTMLFieldSetElement) || !node.disabled) continue;
		if (!node.querySelector(":scope > legend")?.contains(el)) return true;
	}
	return false;
}
var hiddenInputStyle = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;opacity:0;pointer-events:none";
function associate(input, options) {
	const cleanups = [];
	const onReset = (event) => {
		if (event.target !== input.form) return;
		afterReset(event, () => {
			options.reset();
			options.write();
		});
	};
	input.ownerDocument.addEventListener("reset", onReset, true);
	cleanups.push(() => input.ownerDocument.removeEventListener("reset", onReset, true));
	const onFocus = () => options.focus();
	input.addEventListener("focus", onFocus);
	cleanups.push(() => input.removeEventListener("focus", onFocus));
	cleanups.push(watchFieldsets(input, options.disabled));
	return () => cleanups.forEach((cleanup) => cleanup());
}
var moves = /* @__PURE__ */ new WeakMap();
function watchFieldsets(el, onChange) {
	let disabled;
	let observer;
	let active = true;
	const check = () => {
		if (observer) {
			observer.disconnect();
			for (let node = el.parentElement; node?.closest("fieldset"); node = node.parentElement) observer.observe(node, {
				childList: true,
				attributeFilter: ["disabled"]
			});
		}
		const now = fieldsetDisabled(el);
		if (now !== disabled) onChange(disabled = now);
	};
	const watch = () => {
		if (!active) return;
		if (typeof MutationObserver !== "undefined") observer = new MutationObserver(check);
		check();
		moves.set(el, check);
	};
	if (el.isConnected) watch();
	else queueMicrotask(watch);
	return () => {
		active = false;
		observer?.disconnect();
		moves.delete(el);
	};
}
var isDisabled = (state) => state.disabled || state.formDisabled;
function bindHiddenInput(input, options) {
	const write = () => {
		const checked = options.checked();
		if (input.checked !== checked) input.checked = checked;
		const indeterminate = options.indeterminate?.() ?? false;
		if (input.indeterminate !== indeterminate) input.indeterminate = indeterminate;
	};
	write();
	const cleanups = [options.subscribe(write), associate(input, {
		...options,
		write
	})];
	const onClick = (event) => {
		const control = options.control?.();
		if (!control || isLabelable(control)) return;
		event.preventDefault();
		options.focus();
		options.activate?.(event);
	};
	input.addEventListener("click", onClick);
	cleanups.push(() => input.removeEventListener("click", onClick));
	queueMicrotask(() => {
		const control = options.control?.();
		if (control && !isLabelable(control)) cleanups.push(labelledBy$1(control, () => labelsOf$1(input)));
	});
	return () => cleanups.forEach((cleanup) => cleanup());
}
function bindInternals(el, options) {
	const attached = internalsOf.get(el);
	return attached ? attached.bind(el, attached.internals, options) : () => {};
}
var labelCount = globalThis[/* @__PURE__ */ Symbol.for("ui-sdk.label-ids@1")] ??= { count: 0 };
function isLabelable(el) {
	return el instanceof HTMLButtonElement || el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement || el instanceof HTMLMeterElement || el instanceof HTMLOutputElement || el instanceof HTMLProgressElement || internalsOf.has(el);
}
function nameFromLabels(el, target = el) {
	return formInternals(el) ? labelledBy$1(target, () => labelsOf$1(el), el) : () => {};
}
function labelsOf$1(el) {
	const labels = [];
	const around = el.closest("label");
	if (around?.control === el) labels.push(around);
	if (el.id) el.getRootNode().querySelectorAll(`label[for="${CSS.escape(el.id)}"]`).forEach((label) => {
		if (label !== around && label.control === el) labels.push(label);
	});
	return labels.sort(documentOrder);
}
function labelledBy$1(el, findLabels, watch = el) {
	let written;
	const update = () => {
		const current = el.getAttribute("aria-labelledby");
		if (el.hasAttribute("aria-label") || current !== null && current !== written) return;
		const labels = findLabels();
		for (const label of labels) if (!label.id) label.id = `ui-sdk-label-${++labelCount.count}`;
		const ids = labels.map((label) => label.id).join(" ");
		if (!ids) {
			if (written !== void 0) el.removeAttribute("aria-labelledby");
			written = void 0;
			return;
		}
		written = ids;
		if (current !== ids) el.setAttribute("aria-labelledby", ids);
	};
	queueMicrotask(update);
	watch.addEventListener("focusin", update);
	return () => watch.removeEventListener("focusin", update);
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/keep.js
var lifecycles = /* @__PURE__ */ new WeakMap();
var making;
var deferring = false;
var destroying = 0;
function whileDestroying(run) {
	destroying++;
	try {
		run();
	} finally {
		destroying--;
	}
}
function withLifecycle(make) {
	const outer = making;
	const lifecycle = { starts: [] };
	making = lifecycle;
	let instance;
	try {
		instance = make();
	} finally {
		making = outer;
	}
	lifecycles.set(instance, lifecycle);
	if (outer) outer.starts.push(() => {
		keep(instance);
		return () => release(instance);
	});
	else if (!deferring && typeof document !== "undefined") keep(instance);
	return instance;
}
function unwatched(make) {
	const outer = deferring;
	deferring = true;
	try {
		return make();
	} finally {
		deferring = outer;
	}
}
function whenKept(start) {
	if (making) making.starts.push(start);
}
function extendLifecycle(instance, run) {
	const outer = making;
	const added = { starts: [] };
	making = added;
	try {
		run();
	} finally {
		making = outer;
	}
	const lifecycle = lifecycles.get(instance);
	if (!lifecycle) return;
	lifecycle.starts.push(...added.starts);
	for (const start of lifecycle.stops ? added.starts : []) {
		const stop = start();
		if (stop) lifecycle.stops.push(stop);
	}
}
function keep(instance) {
	const lifecycle = lifecycles.get(instance);
	if (!lifecycle || lifecycle.stops) return;
	const stops = lifecycle.stops = [];
	for (const start of lifecycle.starts) {
		const stop = start();
		if (stop) stops.push(stop);
	}
}
function release(instance) {
	const lifecycle = lifecycles.get(instance);
	const stops = lifecycle?.stops;
	if (!stops) return;
	lifecycle.stops = void 0;
	stops.forEach((stop) => stop());
}
function discard(instance) {
	release(instance);
	lifecycles.delete(instance);
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/controller.js
var attach = /* @__PURE__ */ Symbol.for("ui-sdk.controller.attach");
var detach = /* @__PURE__ */ Symbol.for("ui-sdk.controller.detach");
function attachController(controller, api) {
	controller?.[attach]?.(api);
}
function detachController(controller, api) {
	controller?.[detach]?.(api);
}
function connectController(context, api) {
	let current = context.options().controller;
	let kept = false;
	whenKept(() => {
		kept = true;
		attachController(current, api);
		return () => {
			kept = false;
			detachController(current, api);
		};
	});
	context.onOptions(({ controller }) => {
		if (controller === current) return;
		detachController(current, api);
		current = controller;
		if (kept) attachController(controller, api);
	});
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/derive.js
var derivations = /* @__PURE__ */ new WeakMap();
function register(store, derivation) {
	let list = derivations.get(store);
	if (!list) derivations.set(store, list = []);
	list.push(derivation);
}
function deriveFromOptions(context, keys, derive) {
	register(context.store, {
		from: "options",
		keys,
		derive
	});
}
function withDerived(store, options, synced, state) {
	const list = derivations.get(store);
	if (!list) return synced;
	let result = synced ?? {};
	for (const derivation of list) {
		if (!synced && derivation.from === "state") continue;
		const next = {
			...state,
			...result
		};
		const derived = derivation.from === "state" ? store.view(next, () => derivation.derive(next)) : derivation.derive(result, state, options);
		result = { ...result };
		for (const key of derivation.keys) if (derived && key in derived) result[key] = derived[key];
		else if (derivation.from === "state") result[key] = next[key];
	}
	return synced || Object.keys(result).length ? result : void 0;
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/details.js
var dismissReasons = [
	"escape-key",
	"outside-press",
	"focus-out",
	"window-blur",
	"back",
	"swipe"
];
function isDismissal(reason) {
	return dismissReasons.includes(reason);
}
var programmaticReasons = /* @__PURE__ */ new Set([
	"image-load",
	"image-error",
	"imperative",
	"item-removed",
	"unmount",
	"reset",
	"restore",
	"timeout",
	"resize",
	"page-hide"
]);
var cause;
function resolveSource(reason, eventSource) {
	if (cause === "agent") return cause;
	if (programmaticReasons.has(reason)) return "programmatic";
	if (eventSource) {
		const source = eventSource();
		return source === "programmatic" && cause ? cause : source;
	}
	return cause ?? "programmatic";
}
function withSource(source, run) {
	const outer = cause;
	cause = source;
	try {
		return run();
	} finally {
		cause = outer;
	}
}
function createDetails(given, source, cancelable = true) {
	if (!cancelable) return {
		...given,
		source
	};
	let canceled = false;
	return {
		...given,
		source,
		cancel: () => {
			canceled = true;
		},
		get canceled() {
			return canceled;
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/watchers.js
var watchers = {};
var earlier = /* @__PURE__ */ new Set();
var watchLater = /* @__PURE__ */ new WeakMap();
function watchWhileKept(instance, parts, definition) {
	let unwatch;
	let waiting;
	const untrack = () => {
		unwatch?.();
		unwatch = void 0;
		if (waiting) earlier.delete(waiting);
		waiting = void 0;
	};
	whenKept(() => {
		if (watchers.add) unwatch = watchers.add(instance, parts, definition);
		else if (typeof document !== "undefined") {
			earlier.add(waiting = new WeakRef(instance));
			watchLater.set(instance, () => unwatch = watchers.add?.(instance, parts, definition));
			if (earlier.size % 1e3 === 0) {
				for (const old of earlier) if (!old.deref()) earlier.delete(old);
			}
		}
		return untrack;
	});
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/primitive.js
function definePrimitive(definition) {
	const slots = definition.slots((slot) => slot);
	const name = definition.name;
	const label = definition.label ?? name;
	const make = (initialOptions) => {
		let options = initialOptions;
		const id = initialOptions.id;
		const store = createStore({
			...definition.state(options),
			...definition.sync?.(options)
		}, definition.live ?? []);
		const destroys = [];
		const optionsListeners = [];
		const own = Object.create(slots);
		const used = /* @__PURE__ */ new Set();
		function use(feature) {
			if (used.has(feature)) return;
			used.add(feature);
			Object.assign(own, feature.slots);
			wake();
			feature.extend?.(api);
		}
		const owner = {
			name,
			label,
			slots: own,
			parts: /* @__PURE__ */ new Map(),
			released: []
		};
		const { parts } = owner;
		function keyOf(props = {}) {
			return props.id ?? (props.value == null ? "" : String(props.value));
		}
		let viewedParts;
		function part(slot, props = {}, rendering = false) {
			const key = keyOf(props);
			const mapKey = `${slot}:${key}`;
			let found = parts.get(mapKey);
			if (!found) {
				parts.set(mapKey, found = {
					slot,
					key,
					id,
					get api() {
						return api;
					},
					store,
					props,
					el: void 0,
					owner,
					leases: 0
				});
				if (rendering) provisional(found);
			} else if (rendering) return found;
			found.props = props;
			propsRendered(found);
			return found;
		}
		function element(slot, key) {
			if (key === void 0) {
				for (const part2 of parts.values()) if (part2.slot === slot && part2.el?.isConnected) return part2.el;
				return;
			}
			const el = parts.get(`${slot}:${key}`)?.el;
			return el?.isConnected ? el : void 0;
		}
		const context = {
			id,
			label,
			store,
			options: () => options,
			onOptions: (listener) => optionsListeners.push(listener),
			onDestroy: (cleanup) => destroys.push(cleanup),
			parts: () => parts.values(),
			element,
			props: (slot, key = "") => {
				const shown = viewedParts?.[slot];
				return shown && keyOf(shown) === key ? shown : parts.get(`${slot}:${key}`)?.props;
			}
		};
		let api = void 0;
		function build() {
			api = definition.api(context);
			connectController(context, api);
		}
		function wake() {
			const { sleeping } = owner;
			if (!sleeping) return;
			owner.sleeping = void 0;
			extendLifecycle(instance, build);
			for (const bind of [...sleeping.binds]) bind();
		}
		if (definition.asleep?.(options)) owner.sleeping = {
			wake,
			binds: /* @__PURE__ */ new Set()
		};
		else build();
		let destroyed = false;
		const syncFrom = (options2, state) => withDerived(store, options2, definition.sync?.(options2), state);
		const instance = {
			types: void 0,
			name,
			id,
			get: store.get,
			subscribe: store.subscribe,
			get api() {
				wake();
				return api;
			},
			part,
			use,
			preview(next) {
				const synced = syncFrom({
					...next,
					id
				}, store.get());
				const current = store.get();
				for (const key in synced) if (!sameValue(current[key], synced[key])) return {
					...current,
					...synced
				};
			},
			view(state, read, around) {
				const outer = viewedParts;
				viewedParts = around;
				try {
					return store.view(state, read);
				} finally {
					viewedParts = outer;
				}
			},
			setOptions(next) {
				const held = heldState(store);
				options = next.id === id ? next : {
					...next,
					id
				};
				if (owner.sleeping && !definition.asleep(options)) wake();
				const synced = syncFrom(options, held);
				let source;
				try {
					for (const listener of optionsListeners) source = listener(options, synced) ?? source;
					const landing = heldState(store) === held ? synced : syncFrom(options, heldState(store));
					if (landing) withSource(source, () => store.set(landing, true));
				} finally {}
			},
			startState: (next) => definition.state({
				...next,
				id
			}),
			follow(current) {
				let last;
				let synced;
				const read = (state = heldState(store), before) => {
					if (before) return syncFrom({
						...before,
						id
					}, state);
					if (destroyed) return synced;
					const options2 = current();
					if (last?.options !== options2 || last.state !== state) {
						last = {
							options: options2,
							state
						};
						synced = syncFrom({
							...options2,
							id
						}, state);
					}
					return synced;
				};
				store.follow(read);
				return read;
			},
			destroy() {
				if (destroyed) return;
				destroyed = true;
				discard(instance);
				whileDestroying(() => destroys.forEach((cleanup) => cleanup()));
			}
		};
		standFor(instance, store);
		watchWhileKept(instance, parts, definition);
		return instance;
	};
	const create = (initialOptions) => withLifecycle(() => make(initialOptions));
	Object.defineProperty(create, "name", { value: name });
	return Object.assign(create, {
		options: definition.options,
		slots
	});
}
var schemas = /* @__PURE__ */ new WeakMap();
function schemaOf(primitive) {
	let schema = schemas.get(primitive);
	if (!schema) {
		const { options, slots = {} } = primitive;
		schema = {
			options: {
				debug: "boolean",
				...options
			},
			slots: Object.fromEntries(Object.entries(slots).map(([slot, def]) => [slot, def.props ?? {}]))
		};
		schemas.set(primitive, schema);
	}
	return schema;
}
var renderVersion = (instance) => renders(instance);
// node_modules/@ui-sdk/core/dist/foundation/platform/layout.js
var isTransformed = (style) => style.transform !== "none" || style.translate !== "none" || style.scale !== "none" || style.rotate !== "none";
function movesRects(node, parent) {
	for (let el = node; el && el !== parent;) {
		if (el !== node && (el.scrollLeft || el.scrollTop) || isTransformed(getComputedStyle(el))) return true;
		el = el.parentElement;
	}
	return false;
}
function offsetIn(node, parent) {
	const offset = {
		x: node.offsetLeft + parent.clientLeft,
		y: node.offsetTop + parent.clientTop
	};
	if (parent === node.ownerDocument.body || movesRects(node, parent)) return offset;
	const rect = node.getBoundingClientRect();
	const parentRect = parent.getBoundingClientRect();
	const size = layoutSize(parent);
	const x = (rect.left - parentRect.left) * size.width / parentRect.width + parent.scrollLeft;
	const y = (rect.top - parentRect.top) * size.height / parentRect.height + parent.scrollTop;
	return {
		x: Math.abs(x - offset.x) < 1 ? x : offset.x,
		y: Math.abs(y - offset.y) < 1 ? y : offset.y
	};
}
function layoutOrigin(el) {
	let x = 0;
	let y = 0;
	for (let node = el; node; node = node.offsetParent) {
		const parent = node.offsetParent;
		if (!parent) {
			x += node.offsetLeft;
			y += node.offsetTop;
			continue;
		}
		const offset = offsetIn(node, parent);
		x += offset.x;
		y += offset.y;
	}
	return {
		x,
		y
	};
}
function layoutSize(el) {
	const style = getComputedStyle(el);
	const total = (...names) => names.reduce((sum, name) => sum + (parseFloat(style.getPropertyValue(name)) || 0), 0);
	const contentBox = style.boxSizing !== "border-box";
	const width = parseFloat(style.width) + (contentBox ? total("padding-left", "padding-right", "border-left-width", "border-right-width") : 0);
	const height = parseFloat(style.height) + (contentBox ? total("padding-top", "padding-bottom", "border-top-width", "border-bottom-width") : 0);
	return {
		width: Number.isFinite(width) ? width : el.offsetWidth,
		height: Number.isFinite(height) ? height : el.offsetHeight
	};
}
function layoutBox(el, container) {
	const at = layoutOrigin(el);
	const origin = layoutOrigin(container);
	const left = at.x - origin.x - container.clientLeft;
	const top = at.y - origin.y - container.clientTop;
	const { width, height } = layoutSize(el);
	const area = {
		width: container.scrollWidth,
		height: container.scrollHeight
	};
	return {
		left,
		top,
		width,
		height,
		right: area.width - (left + width),
		bottom: area.height - (top + height)
	};
}
// node_modules/@ui-sdk/core/dist/foundation/selection/indicator.js
function bindIndicator(options) {
	const update = () => {
		const list2 = options.list();
		const item = options.active();
		options.write(item && list2 ? layoutBox(item, list2) : void 0);
	};
	const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(update);
	const observed = /* @__PURE__ */ new Set();
	const remeasure = () => {
		const list2 = options.list();
		const targets = new Set(list2 ? [list2, ...list2.querySelectorAll(options.itemSelector)] : []);
		for (const target of observed) if (!targets.has(target)) {
			observed.delete(target);
			observer?.unobserve(target);
		}
		for (const target of targets) {
			if (observed.has(target)) continue;
			observed.add(target);
			observer?.observe(target);
		}
		update();
	};
	const unsubscribe = options.subscribe(remeasure);
	const flips = typeof MutationObserver === "undefined" ? void 0 : new MutationObserver(update);
	const list = options.list();
	if (list) flips?.observe(list.ownerDocument.documentElement, {
		attributeFilter: ["dir"],
		subtree: true
	});
	queueMicrotask(remeasure);
	return () => {
		unsubscribe();
		observer?.disconnect();
		flips?.disconnect();
	};
}
function directionBetween(from, to, orientation) {
	if (!from || !to) return "none";
	const [a, b] = orientation === "vertical" ? [from.top, to.top] : [from.left, to.left];
	if (b === a) return "none";
	if (orientation === "vertical") return b > a ? "down" : "up";
	return b > a ? "right" : "left";
}
// node_modules/@ui-sdk/core/dist/foundation/platform/env.js
var isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
function isIOS() {
	return isBrowser && (/iP(hone|ad|od)/.test(navigator.platform) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isRTL(el) {
	return !!el && isBrowser && getComputedStyle(el).direction === "rtl";
}
// node_modules/@ui-sdk/core/dist/foundation/focus/roving-focus.js
function createClaim() {
	let claimed;
	return (key, eligible) => {
		if (claimed === void 0 && eligible) claimed = key;
		return claimed === key;
	};
}
function createRovingFocus(context, options) {
	const { store } = context;
	const key = options.key;
	const remember = options.remember ?? true;
	const order = createOrder();
	const claim = createClaim();
	let remembered = null;
	let moving = false;
	const setStop = (itemKey) => {
		moving = true;
		store.set({ [key]: itemKey });
		moving = false;
	};
	let pending = null;
	let holder = null;
	const orientation = () => options.orientation?.() ?? "vertical";
	const isDisabled = (item) => options.disabled?.(item) ?? false;
	const isFocusable = (item) => options.focusable?.(item) ?? true;
	const isPreferred = (item) => options.preferred?.(item) ?? false;
	function stopFor(preferred = isPreferred) {
		const list = order.list();
		if (!list.length) return;
		if (pending && !list.some(({ part }) => part.key === pending.key && isFocusable(part))) return;
		return rovingStop(list.map(({ part }) => ({
			key: part.key,
			disabled: isDisabled(part),
			focusable: isFocusable(part),
			preferred: preferred(part)
		})), remembered);
	}
	function check() {
		const stop2 = stopFor();
		if (stop2 !== void 0) setStop(stop2);
	}
	let queued = false;
	let joined = false;
	function queue(joinedOrLeft) {
		joined ||= joinedOrLeft;
		if (queued) return;
		queued = true;
		afterBind(() => {
			queued = false;
			check();
			focusPending();
			if (joined) options.onItemsChange?.();
			joined = false;
		});
	}
	function moveTo(itemKey, from) {
		const move = pending = {
			key: itemKey,
			from
		};
		const before = remembered;
		if (remember) remembered = itemKey;
		setStop(itemKey);
		setTimeout(() => {
			focusPending();
			if (pending !== move) return;
			pending = null;
			if (remembered === itemKey) remembered = before;
			queue(false);
		});
	}
	const focusOn = (el) => {
		el.focus();
		return el.ownerDocument.activeElement === el;
	};
	function focusPending() {
		if (!pending) return;
		const item = order.list().find(({ part }) => part.key === pending.key);
		if (!item || !isFocusable(item.part)) return;
		const active = item.el.ownerDocument.activeElement;
		if (!(active === pending.from || active === null || active === item.el.ownerDocument.body) || focusOn(item.el)) pending = null;
	}
	let stop = store.get()[key];
	context.onDestroy(store.subscribe(() => {
		const was = stop;
		stop = store.get()[key];
		if (stop === null && was !== null && !moving) remembered = null;
		if (stop === was && order.size()) queue(false);
	}));
	function focusables() {
		return order.list().filter(({ part }) => isFocusable(part)).map(({ part, el }) => ({
			key: part.key,
			props: part.props,
			el
		}));
	}
	const roving = {
		/** Joins a bound part to the group. Call it from the item slot's `bind` and return its cleanup. */
		bind(el, part) {
			const leave = order.add({
				key: part.key,
				el,
				part
			});
			if (pending?.left && pending.from === el) {
				const was = pending.key;
				pending.key = part.key;
				if (remembered === was) remembered = part.key;
				if (store.get()[key] === was) setStop(part.key);
				if (el.ownerDocument.activeElement === el) holder = el;
			}
			const focused = () => {
				holder = el;
				if (remember) roving.remember(part.key);
			};
			const blurred = () => {
				if (holder === el) holder = null;
			};
			el.addEventListener("focus", focused);
			el.addEventListener("blur", blurred);
			let wasDisabled = isDisabled(part);
			let wasPreferred = isPreferred(part);
			const unwatch = onProps(part, () => {
				if (isDisabled(part) === wasDisabled && isPreferred(part) === wasPreferred) return;
				wasDisabled = isDisabled(part);
				wasPreferred = isPreferred(part);
				queue(false);
			});
			queue(true);
			return () => {
				unwatch();
				el.removeEventListener("focus", focused);
				el.removeEventListener("blur", blurred);
				const doc = el.ownerDocument;
				const had = !!doc && (doc.activeElement === el || holder === el && doc.activeElement === doc.body);
				if (holder === el) holder = null;
				leave();
				if (had && !pending && store.get()[key] === part.key) {
					const wait = pending = {
						key: part.key,
						from: el,
						left: true
					};
					setTimeout(() => {
						if (pending !== wait) return;
						pending = null;
						queue(false);
					});
				}
				queue(true);
			};
		},
		/** The item's `tabindex`: `"0"` for the item with the stop, `"-1"` for the rest. Pure, so `attrs` can call it. */
		tabIndex(state, part) {
			const stop2 = state[key] ?? null;
			if (stop2 !== null) return stop2 === part.key ? "0" : "-1";
			const eligible = options.claims ? options.claims(state, part) : !isDisabled(part) && isFocusable(part);
			return claim(part.key, eligible) ? "0" : "-1";
		},
		/**
		* Moves focus for a key pressed on an item's element. Returns the key it
		* moved to, the key it moved from and whether Shift was held, so the
		* caller can extend a selection, or `undefined` when the key isn't the
		* group's. At either end without `loop`, `key` is `from`.
		*/
		keydown(event, el) {
			if (event.defaultPrevented || event.altKey) return;
			const list = focusables();
			const from = list.find((item) => item.el === el);
			if (!from) return;
			const rtl = isRTL(el);
			let to;
			if (options.move) to = options.move(event, {
				from,
				items: list,
				rtl
			});
			else if (!event.ctrlKey && !event.metaKey) {
				const step = stepFor(event.key, orientation(), rtl);
				if (step !== void 0) to = list[moveIndex(list.indexOf(from), step, list.length, options.loop?.() ?? false)]?.key;
			}
			if (to === void 0) return;
			event.preventDefault();
			const next = list.find((item) => item.key === to);
			if (!next || next !== from && !focusOn(next.el)) moveTo(to, el);
			return {
				key: to,
				from: from.key,
				shift: event.shiftKey
			};
		},
		/** The items that can take focus now, in document order, with their elements. */
		items: focusables,
		/**
		* Focuses an item, or the one with the stop, or the first. An item that
		* isn't rendered or focusable yet takes the stop now and focus once it can.
		*/
		focus(itemKey) {
			if (itemKey !== void 0) {
				const item = order.list().find(({ part }) => part.key === itemKey);
				if (item && isFocusable(item.part) && focusOn(item.el)) return;
				moveTo(itemKey, typeof document === "undefined" ? null : document.activeElement);
				return;
			}
			const list = order.list();
			(list.find((item) => item.key === stop) ?? list[0])?.el.focus();
		},
		/**
		* Moves the stop to an item as if focus had landed on it, for an item
		* whose focus went elsewhere, like a menubar trigger whose menu took it.
		* A group that doesn't `remember` ignores it, since its stop follows the
		* preferred item.
		*/
		remember(itemKey) {
			if (!remember) return;
			remembered = itemKey;
			setStop(itemKey);
		},
		/** Moves the stop to where the group's rules put it now. It also runs on its own after items join or leave and after state changes. */
		check,
		/**
		* Where the group's rules would put the stop if `preferred` said which
		* items are preferred, like the tab a value from options selects, without
		* moving it. Undefined while the bound items can't decide it, like when
		* none is preferred yet: the item may be about to bind, as when its value
		* changed, and the group decides once it has.
		*/
		stopFor: (preferred) => order.list().some(({ part }) => preferred(part)) ? stopFor(preferred) : void 0
	};
	return roving;
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/modality.js
var modality = "pointer";
var installed = false;
var scheduled = false;
var lastPointer = "mouse";
var pointerPressed = false;
var forgetPointerPress = () => pointerPressed = false;
var keyTarget = null;
var forgetKeyTarget = () => keyTarget = null;
function noteKey(event) {
	if (event.key !== "Enter" && event.key !== " ") return;
	keyTarget = event.target;
	setTimeout(forgetKeyTarget);
}
function noteKeydown(event) {
	noteKey(event);
	const modifierOnly = event.metaKey || event.ctrlKey || event.altKey || /^(Meta|Control|Alt|Shift)$/.test(event.key);
	if (event.key === "Tab" || !modifierOnly) modality = "keyboard";
}
function notePress(event) {
	modality = "pointer";
	if (!("pointerType" in event)) {
		if (!pointerPressed) lastPointer = "touch";
		return;
	}
	pointerPressed = true;
	setTimeout(forgetPointerPress);
	const type = event.pointerType;
	lastPointer = isSyntheticPointer(event) ? "virtual" : type === "touch" || type === "pen" ? type : "mouse";
}
function install() {
	if (installed || typeof document === "undefined") return;
	installed = true;
	document.addEventListener("keydown", noteKeydown, true);
	document.addEventListener("keyup", noteKey, true);
	document.addEventListener("pointerdown", notePress, true);
	document.addEventListener("touchstart", notePress, {
		capture: true,
		passive: true
	});
	window.addEventListener("blur", (event) => {
		if (event.target === window);
	});
}
function trackInput() {
	if (installed || scheduled) return;
	scheduled = true;
	queueMicrotask(install);
}
function isSyntheticPointer(event) {
	if (event.type === "pointermove") return false;
	if (event.width === 0 && event.height === 0 && event.pressure === 0) return true;
	return event.pointerType === "mouse" && event.width === 1 && event.height === 1 && event.pressure === 0 && event.detail === 0;
}
function clickSource(event) {
	if (event.detail > 0) return lastPointer;
	return !!keyTarget && keyTarget.contains(event.target) ? "keyboard" : "virtual";
}
var currentSource = () => modality === "keyboard" ? "keyboard" : lastPointer;
function sourceOf(event) {
	install();
	if (!event) return currentSource();
	if (!trusted(event)) return "programmatic";
	if (event.type.startsWith("key")) return "keyboard";
	if (event.type.startsWith("touch")) return "touch";
	if (event.type === "click") return clickSource(event);
	const pointerType = event.pointerType;
	if (pointerType === "mouse" || pointerType === "touch" || pointerType === "pen") return isSyntheticPointer(event) ? "virtual" : pointerType;
	if ("button" in event) return lastPointer;
	return currentSource();
}
function restoreFocus(el) {
	install();
	try {
		el.focus({ preventScroll: true });
	} finally {}
}
function moveFocus(el) {
	install();
	try {
		el.focus({ preventScroll: true });
	} finally {}
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/option-names.js
var capitalized = (key) => `${key[0].toUpperCase()}${key.slice(1)}`;
var callbackName = (key, kind) => `on${capitalized(key)}${kind}`;
function changeFrom(context, source) {
	const { store, options } = context;
	const requested = /* @__PURE__ */ new Map();
	const asked = /* @__PURE__ */ new Map();
	const changing = /* @__PURE__ */ new Map();
	context.onOptions((next, synced) => {
		if (!synced) return;
		let source2;
		for (const [key, entry] of requested) {
			if (!(key in synced)) continue;
			if (sameValue(synced[key], entry.value)) source2 = entry.source;
			requested.delete(key);
		}
		return source2;
	});
	return (key, value, details) => {
		if (changing.has(key) && sameValue(changing.get(key), value)) return false;
		const ask = (asked.get(key) ?? 0) + 1;
		asked.set(key, ask);
		const previous = store.get()[key];
		if (sameValue(previous, value)) return false;
		const { reason, event } = details;
		const callbackDetails = createDetails(details, details.source ?? source(reason, event));
		callbackDetails.source;
		const current = options();
		const isControlled = current[key] !== void 0;
		const outer = changing.has(key);
		const outerValue = changing.get(key);
		changing.set(key, value);
		try {
			withSource(callbackDetails.source, () => {
				const name = callbackName(key, "Change");
				const callback = current[name];
				if (typeof callback === "function") callback(value, callbackDetails);
				const askedInside = asked.get(key) !== ask;
				if (!callbackDetails.canceled && !isControlled && !askedInside) store.set({ [key]: value });
			});
		} finally {
			if (outer) changing.set(key, outerValue);
			else changing.delete(key);
		}
		if (callbackDetails.canceled) return false;
		watchers.change?.(context.id, key, value, callbackDetails, previous);
		if (isControlled) requested.set(key, {
			value,
			source: callbackDetails.source
		});
		return true;
	};
}
function log(context, key, value, details) {
	details.source ?? resolveSource(details.reason);
	details.reason;
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/input-source.js
var changeSource = (reason, event) => resolveSource(reason, event && (() => sourceOf(event)));
function inputSource() {
	trackInput();
	return changeSource;
}
function createChange(context, source = inputSource()) {
	return changeFrom(context, source);
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/elements.js
function elements(context, slot) {
	return inDocumentOrder([...context.parts()].filter((part) => part.slot === slot && !!part.el?.isConnected)).map(({ el, key, props }) => ({
		el,
		key,
		props
	}));
}
// node_modules/@ui-sdk/core/dist/components/radio/radio-api.js
function radioGroupState(options, extra = {}) {
	const value = options.value !== void 0 ? options.value : options.defaultValue ?? null;
	return {
		value,
		initial: value,
		disabled: !!options.disabled,
		readOnly: !!options.readOnly,
		required: !!options.required,
		name: options.name,
		form: options.form,
		formDisabled: false,
		stop: null,
		exiting: [],
		...extra
	};
}
function syncRadioGroup(options) {
	return {
		disabled: !!options.disabled,
		readOnly: !!options.readOnly,
		required: !!options.required,
		name: options.name,
		form: options.form,
		...options.defaultValue === void 0 ? {} : { initial: options.defaultValue },
		...options.value === void 0 ? {} : { value: options.value }
	};
}
var isNativeButton$1 = (el) => el instanceof HTMLButtonElement;
function radioGroupApiBody(context, slots = {
	group: "group",
	item: "root"
}) {
	const { id, store, options, element, props } = context;
	const change = createChange(context);
	let changed = false;
	const enabled = (item) => !item.props?.disabled && !isDisabled(store.get());
	const roving = createRovingFocus(context, {
		slot: slots.item,
		key: "stop",
		remember: false,
		disabled: (item) => !enabled(item),
		focusable: enabled,
		preferred: (item) => store.get().value === item.key,
		claims: (state, item) => (state.value ?? item.key) === item.key,
		move(event, { from, items, rtl }) {
			if (event.shiftKey) return;
			const step = radioStep(event.key, rtl);
			if (step === void 0) return;
			return items[moveIndex(items.indexOf(from), step, items.length, options().loop ?? true)].key;
		}
	});
	const exitingAfter = (from, value, exiting) => [...exiting.filter((key) => key !== value), ...from !== null && hasIndicator(from) && !exiting.includes(from) ? [from] : []];
	deriveFromOptions(context, ["exiting", "stop"], (synced, state) => {
		if (!("value" in synced) || synced.value === state.value) return;
		const value = synced.value ?? null;
		const stop = roving.stopFor((item) => item.key === value);
		return {
			exiting: exitingAfter(state.value, value, state.exiting),
			...stop !== void 0 && { stop }
		};
	});
	let previous = store.get().value;
	store.subscribe(() => {
		const { value, exiting } = store.get();
		if (value === previous) return;
		const from = previous;
		previous = value;
		changed = true;
		store.set({ exiting: exitingAfter(from, value, exiting) });
		roving.check();
	});
	const hasIndicator = (value) => !!element("indicator", value)?.isConnected;
	const formElement = () => {
		const root = element(slots.group);
		if (formInternals(root)) return root;
		const { value } = store.get();
		return value === null ? void 0 : element("input", value);
	};
	const api = {
		id,
		getValue: () => store.get().value,
		isChanged: () => changed,
		setValue(value, { reason = "imperative", event } = {}) {
			const details = {
				reason,
				event
			};
			const state = store.get();
			if (isDisabled(state) || state.readOnly) return false;
			if (value !== null && props(slots.item, value)?.disabled) return false;
			const done = change("value", value, details);
			if (done && reason !== "restore") dispatchChange(formElement());
			return done;
		},
		focus: () => roving.focus(),
		form: () => formInternals(element(slots.group))?.form ?? elements(context, "input")[0]?.el?.form ?? null,
		internal: {
			check: (key, details) => api.setValue(key, details),
			reset() {
				if (keepsValueOnReset(options().value, options().defaultValue)) return;
				change("value", store.get().initial, { reason: "reset" });
			},
			restore(saved) {
				change("value", saved || null, { reason: "restore" });
			},
			setFormDisabled(formDisabled) {
				store.set({ formDisabled });
			},
			finishExit(key) {
				store.set({ exiting: store.get().exiting.filter((value) => value !== key) });
			},
			roving,
			group: () => element(slots.group),
			radio: (key) => element(slots.item, key),
			itemProps: (key) => props(slots.item, key) ?? {},
			anchor: () => (roving.items()[0] ?? elements(context, slots.item)[0])?.el,
			onKeyDown(event, el) {
				if (event.altKey || event.ctrlKey || event.metaKey) return;
				if (event.key === "Enter") {
					event.preventDefault();
					if (!event.repeat) submitImplicitly(api.form());
					return;
				}
				if (event.key === " ") {
					if (!isNativeButton$1(el)) event.preventDefault();
					return;
				}
				const moved = roving.keydown(event, el);
				if (moved && moved.key !== moved.from && !store.get().readOnly) api.setValue(moved.key, {
					reason: "list-navigation",
					event
				});
			}
		}
	};
	return api;
}
var radioGroupApi = radioGroupApiBody;
function itemState(state, key, props) {
	return {
		checked: state.value === key,
		disabled: !!props.disabled || isDisabled(state),
		readOnly: state.readOnly,
		required: state.required
	};
}
function itemData(state, key, props) {
	const { checked, disabled } = itemState(state, key, props);
	return {
		"data-checked": checked ? "" : void 0,
		"data-unchecked": checked ? void 0 : "",
		"data-disabled": disabled ? "" : void 0,
		"data-readonly": state.readOnly ? "" : void 0,
		"data-required": state.required ? "" : void 0
	};
}
// node_modules/@ui-sdk/core/dist/components/radio/radio-parts.js
function bindRadioGroup(el, api, store) {
	const unbind = bindInternals(el, {
		value: () => store.get().value,
		state: () => store.get().value ?? "",
		restore: api.internal.restore,
		valueMissing: () => store.get().required && store.get().value === null,
		message: () => valueMissingMessage("radio"),
		anchor: api.internal.anchor,
		focus: api.focus,
		reset: api.internal.reset,
		disabled: api.internal.setFormDisabled,
		subscribe: store.subscribe
	});
	const onClick = (event) => {
		if (event.target === el) api.focus();
	};
	let pressedLabel = null;
	const onPointerDown = (event) => {
		pressedLabel = isDisabled(store.get()) ? event.target?.closest?.("label") ?? null : null;
	};
	const onFocusIn = (event) => {
		const label = pressedLabel;
		pressedLabel = null;
		const target = event.target;
		if (label?.control === target && target !== el) target.blur();
	};
	const doc = el.ownerDocument;
	el.addEventListener("click", onClick);
	el.addEventListener("focusin", onFocusIn);
	doc.addEventListener("pointerdown", onPointerDown, true);
	return () => {
		unbind();
		el.removeEventListener("click", onClick);
		el.removeEventListener("focusin", onFocusIn);
		doc.removeEventListener("pointerdown", onPointerDown, true);
	};
}
var radioGroupAttrs = (state) => ({
	"aria-orientation": state.orientation,
	"data-orientation": state.orientation,
	"aria-required": state.required ? "true" : void 0,
	"aria-readonly": state.readOnly ? "true" : void 0,
	"aria-disabled": isDisabled(state) ? "true" : void 0,
	"data-disabled": isDisabled(state) ? "" : void 0,
	"data-readonly": state.readOnly ? "" : void 0,
	"data-required": state.required ? "" : void 0
});
function radioSlots(slot, groupState, radioAttrs = () => ({})) {
	return {
		group: slot({
			role: "radiogroup",
			keys: { none: "Focus stays on a radio, whose keydown handles them." },
			state: groupState,
			attrs: radioGroupAttrs,
			bind: (el, { api, store }) => bindRadioGroup(el, api, store)
		}),
		item: slot({
			role: "radio",
			focus: "roving",
			keys: [
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
				"Enter",
				" "
			],
			props: {
				value: "string",
				disabled: "boolean"
			},
			selects: selects({
				value: ({ key }) => [key, null],
				stop: ({ key }) => [key, null],
				exiting: []
			}),
			state: (state, { key, props }) => itemState(state, key, props),
			attrs: (state, { key, props, api }) => {
				const { checked, disabled } = itemState(state, key, props);
				return {
					type: "button",
					"aria-checked": String(checked),
					disabled: props.disabled ? "" : void 0,
					"aria-disabled": disabled ? "true" : void 0,
					tabindex: disabled ? props.disabled ? void 0 : "-1" : api.internal.roving.tabIndex(state, {
						key,
						props
					}),
					...itemData(state, key, props),
					...radioAttrs(state, key, api)
				};
			},
			press({ api, key, props }, event) {
				event?.preventDefault();
				if (props.disabled) return;
				api.internal.check(key, {
					reason: "item-press",
					event
				});
			},
			on: {
				mousedown: (event, { store, key, props }) => {
					if (itemState(store.get(), key, props).disabled) event.preventDefault();
				},
				keydown: (event, { api, el }) => api.internal.onKeyDown(event, el),
				keyup: (event, { api, el, key, props }) => {
					if (event.key === " " && !isNativeButton$1(el) && !props.disabled) api.internal.check(key, {
						reason: "item-press",
						event
					});
				}
			},
			bind(el, part) {
				const unregister = part.api.internal.roving.bind(el, part);
				const unname = nameFromLabels(el);
				return () => {
					unname();
					unregister();
				};
			}
		}),
		input: slot({
			props: {
				value: "string",
				disabled: "boolean"
			},
			attrs: (state, { id, key, props }) => ({
				type: "radio",
				name: state.name ?? (state.required ? id : void 0),
				value: key,
				form: state.form,
				checked: state.initial === key ? "" : void 0,
				required: state.required ? "" : void 0,
				disabled: state.disabled || props.disabled ? "" : void 0,
				"aria-hidden": "true",
				tabindex: "-1",
				style: hiddenInputStyle
			}),
			bind: (el, { api, store, key }) => bindHiddenInput(el, {
				checked: () => store.get().value === key,
				subscribe: store.subscribe,
				focus: api.focus,
				control: () => api.internal.radio(key),
				activate: (event) => {
					if (!api.internal.itemProps(key).disabled) api.internal.check(key, {
						reason: "item-press",
						event
					});
				},
				reset: api.internal.reset,
				disabled: api.internal.setFormDisabled
			})
		})
	};
}
// node_modules/@ui-sdk/core/dist/components/segmented-control/segmented-control.js
var slotNames = {
	group: "root",
	item: "item"
};
var indicatorVariables$1 = [
	"left",
	"right",
	"top",
	"bottom",
	"width",
	"height"
];
var orientation = (options) => orientationOf(options.orientation, "horizontal");
var segmentedControl = /* @__PURE__ */ definePrimitive({
	name: "segmented-control",
	options: {
		value: "string",
		defaultValue: "string",
		onValueChange: "callback",
		disabled: "boolean",
		readOnly: "boolean",
		required: "boolean",
		name: "string",
		form: "string",
		loop: "boolean",
		orientation: "string",
		controller: "value"
	},
	state: (options) => radioGroupState(options, {
		orientation: orientation(options),
		direction: "none"
	}),
	sync: (options) => ({
		...syncRadioGroup(options),
		orientation: orientation(options)
	}),
	api: (context) => radioGroupApi(context, slotNames),
	slots: (slot) => {
		const { group, item, input } = radioSlots(slot, (state) => ({
			value: state.value,
			disabled: isDisabled(state),
			readOnly: state.readOnly,
			required: state.required,
			orientation: state.orientation ?? "horizontal"
		}));
		return {
			root: group,
			item,
			input,
			indicator: slot({
				role: "presentation",
				state: (state) => ({
					value: state.value,
					orientation: state.orientation ?? "horizontal",
					direction: state.direction ?? "none"
				}),
				attrs: (state) => ({
					"data-orientation": state.orientation,
					"data-activation-direction": state.direction ?? "none"
				}),
				bind(el, { api, store }) {
					let value = store.get().value;
					const rect = (key) => key === null ? void 0 : api.internal.radio(key)?.getBoundingClientRect();
					return bindIndicator({
						list: () => api.internal.group() ?? el.parentElement,
						active: () => {
							const { value: value2 } = store.get();
							return value2 === null ? void 0 : api.internal.radio(value2);
						},
						itemSelector: "[role=\"radio\"]",
						subscribe: (remeasure) => store.subscribe(() => {
							if (store.get().value === value) return;
							const direction = directionBetween(rect(value), rect(store.get().value), store.get().orientation ?? "horizontal");
							value = store.get().value;
							el.setAttribute("data-activation-direction", direction);
							store.set({ direction });
							remeasure();
						}),
						write(box) {
							for (const name of indicatorVariables$1) if (box) el.style.setProperty(`--segmented-control-indicator-${name}`, `${box[name]}px`);
							else el.style.removeProperty(`--segmented-control-indicator-${name}`);
						}
					});
				}
			})
		};
	},
	agent: {
		actions: ["setValue"],
		closed: true
	}
});
// node_modules/@ui-sdk/core/dist/foundation/platform/platform.js
function supportsTopLayer() {
	return isBrowser && typeof HTMLElement.prototype.showPopover === "function";
}
function portalTarget(container) {
	if (container) return container;
	if (isBrowser && !supportsTopLayer()) return document.body;
	return null;
}
function activeElement(doc = document) {
	let active = doc.activeElement;
	while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
	return active;
}
function composedHops(node) {
	const hops = [node];
	let at = node;
	while (at) {
		const next = at.assignedSlot ?? at.parentNode ?? at.host;
		if (next && next !== at.parentNode) hops.push(next);
		at = next;
	}
	return hops;
}
function composedContains(container, node) {
	return composedHops(node).some((hop) => container.contains(hop));
}
var apple;
function isApple() {
	return apple ??= isBrowser && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}
function initialApple() {
	return false;
}
var keyNames = {
	alt: "Alt",
	option: "Alt",
	opt: "Alt",
	shift: "Shift",
	ctrl: "Control",
	control: "Control",
	cmd: "Meta",
	command: "Meta",
	meta: "Meta",
	backspace: "Backspace",
	delete: "Delete",
	del: "Delete",
	enter: "Enter",
	return: "Enter",
	escape: "Escape",
	esc: "Escape",
	tab: "Tab",
	space: "Space",
	up: "ArrowUp",
	down: "ArrowDown",
	left: "ArrowLeft",
	right: "ArrowRight",
	arrowup: "ArrowUp",
	arrowdown: "ArrowDown",
	arrowleft: "ArrowLeft",
	arrowright: "ArrowRight",
	home: "Home",
	end: "End",
	pageup: "PageUp",
	pagedown: "PageDown"
};
function ariaKeyshortcuts(shortcut, apple2 = isApple()) {
	return shortcut.split("+").map((key) => {
		const lower = key.toLowerCase();
		if (lower === "mod") return apple2 ? "Meta" : "Control";
		if (keyNames[lower]) return keyNames[lower];
		return key.length > 1 ? key[0].toUpperCase() + key.slice(1) : key.toUpperCase();
	}).join("+");
}
var appleGlyphs = {
	Meta: "⌘",
	Control: "⌃",
	Alt: "⌥",
	Shift: "⇧",
	Backspace: "⌫",
	Delete: "⌦",
	Enter: "↩",
	Escape: "⎋",
	Tab: "⇥",
	Space: "␣",
	ArrowUp: "↑",
	ArrowDown: "↓",
	ArrowLeft: "←",
	ArrowRight: "→",
	PageUp: "⇞",
	PageDown: "⇟",
	Home: "↖",
	End: "↘"
};
var names = {
	Control: "Ctrl",
	Delete: "Del",
	Escape: "Esc",
	ArrowUp: "Up",
	ArrowDown: "Down",
	ArrowLeft: "Left",
	ArrowRight: "Right"
};
function formatShortcut(shortcut, apple2 = isApple()) {
	const aria = ariaKeyshortcuts(shortcut, apple2);
	if (!aria) return "";
	const keys = aria.split("+");
	return `\u2066${apple2 ? keys.map((key) => appleGlyphs[key] ?? key).join("") : keys.map((key) => names[key] ?? key).join("+")}\u2069`;
}
function matchesKey(event, key) {
	const typed = event.key.length === 1 ? event.key.toLowerCase() : event.key;
	if (key === "Space") return typed === " ";
	if (!/^[A-Z0-9]$/.test(key)) return typed.toLowerCase() === key.toLowerCase();
	if (typed === key.toLowerCase()) return true;
	if (/^[a-z0-9]$/.test(typed)) return false;
	return event.code === (/\d/.test(key) ? `Digit${key}` : `Key${key}`);
}
var parsed = [/* @__PURE__ */ new Map(), /* @__PURE__ */ new Map()];
function matchesShortcut(event, shortcut, apple2 = isApple()) {
	if (typeof event.key !== "string") return false;
	const cache = parsed[+apple2];
	let keys = cache.get(shortcut);
	if (!keys) cache.set(shortcut, keys = ariaKeyshortcuts(shortcut, apple2).split("+"));
	return matchesKey(event, keys.at(-1)) && event.metaKey === keys.includes("Meta") && event.ctrlKey === keys.includes("Control") && event.altKey === keys.includes("Alt") && event.shiftKey === keys.includes("Shift");
}
function hasCommandModifier(keys) {
	return /(^|\+)(Meta|Control|Alt)(\+|$)/.test(ariaKeyshortcuts(keys, true));
}
// node_modules/@ui-sdk/core/dist/foundation/text/locale.js
function toLocale(tag) {
	try {
		return Intl.getCanonicalLocales(tag ? tag.split(/[.@]/)[0].replaceAll("_", "-") : [])[0];
	} catch {}
}
function userLocale() {
	if (typeof navigator === "undefined") return;
	return toLocale(navigator.languages?.[0] ?? navigator.language);
}
function pageLocale(el) {
	if (typeof document === "undefined") return;
	return toLocale((el ?? document.documentElement).closest("[lang]")?.getAttribute("lang")) ?? userLocale();
}
function bindPageLocale(el, set) {
	const read = () => set(pageLocale(el) ?? null);
	if (el.isConnected) read();
	else queueMicrotask(read);
}
var localeOf = (state) => state.locale ?? state.pageLocale ?? "en-US";
// node_modules/@ui-sdk/core/dist/foundation/kernel/attrs.js
function openAttrs(open) {
	return {
		"data-open": open ? "" : void 0,
		"data-closed": open ? void 0 : ""
	};
}
function checkedAttrs(checked) {
	return {
		"data-checked": checked === true ? "" : void 0,
		"data-unchecked": checked === false ? "" : void 0,
		"data-indeterminate": checked === "indeterminate" ? "" : void 0
	};
}
function idPart(value) {
	return value.replace(/[\s%]/g, encodeURIComponent);
}
// node_modules/@ui-sdk/core/dist/foundation/platform/scrollbar.js
function onScrollbar(point, box) {
	const { x, y } = point;
	const { borders } = box;
	const inBorders = x >= borders.left && x < box.width - borders.right && y >= borders.top && y < box.height - borders.bottom;
	const inPadding = x >= box.clientLeft && x < box.clientLeft + box.clientWidth && y >= box.clientTop && y < box.clientTop + box.clientHeight;
	return inBorders && !inPadding;
}
function pressedScrollbar(event, target) {
	if (!(target instanceof Element)) return false;
	if (target === target.ownerDocument.documentElement) return event.clientX >= target.clientWidth || event.clientY >= target.clientHeight;
	if (target.clientWidth === 0 && target.clientHeight === 0) return false;
	const rect = target.getBoundingClientRect();
	const style = getComputedStyle(target);
	return onScrollbar({
		x: event.clientX - rect.left,
		y: event.clientY - rect.top
	}, {
		width: rect.width,
		height: rect.height,
		clientLeft: target.clientLeft,
		clientTop: target.clientTop,
		clientWidth: target.clientWidth,
		clientHeight: target.clientHeight,
		borders: {
			top: parseFloat(style.borderTopWidth) || 0,
			right: parseFloat(style.borderRightWidth) || 0,
			bottom: parseFloat(style.borderBottomWidth) || 0,
			left: parseFloat(style.borderLeftWidth) || 0
		}
	});
}
// node_modules/@ui-sdk/core/dist/foundation/platform/layers.js
var realm = globalThis[/* @__PURE__ */ Symbol.for("ui-sdk.layers@2")] ??= {
	stack: [],
	listening: /* @__PURE__ */ new Map()
};
function persistent() {
	return realm.persistent ??= /* @__PURE__ */ new Set();
}
function inPersistentLayer(target) {
	for (const el of persistent()) if (composedContains(el, target)) return true;
	return false;
}
function persistentLayers() {
	return [...persistent()].filter((el) => el.isConnected);
}
function layerCount() {
	return realm.pushed ?? 0;
}
function openedSince(order) {
	return active().some((layer) => (layer.order ?? 0) > order);
}
function active() {
	return realm.stack.filter((layer) => layer.active());
}
function activeLayers() {
	return active();
}
function lastEscape() {
	return realm.escapeAt ?? -1e400;
}
function insideTree(layer, target, event) {
	return insideTreeAt(layer, composedHops(target), event);
}
function insideTreeAt(layer, hops, event) {
	if (hops.some((hop) => layer.contains(hop, event))) return true;
	return active().some((other) => other.parent === layer && insideTreeAt(other, hops, event));
}
function listen(doc, win) {
	let swallowClick = false;
	let touch;
	let pending;
	function plan(event, target, point) {
		const dismissed = [];
		let consume = false;
		if (inPersistentLayer(target)) return {
			dismissed,
			consume
		};
		for (const layer of [...realm.stack].reverse()) if (layer.active()) {
			if (insideTree(layer, target, event)) break;
			if (layer.modal !== false) consume = true;
			dismissed.push(layer);
			if (layer.shield) break;
		} else if (layer.exiting?.()) {
			if (insideTree(layer, target, event)) break;
			if (layer.modal === false) continue;
			if (layer.overBackdrop?.(point.x, point.y)) consume = true;
			break;
		}
		return {
			dismissed,
			consume
		};
	}
	function dismiss(event, target, point) {
		const { dismissed, consume } = plan(event, target, point);
		for (const layer of dismissed) layer.onOutsidePress?.(event);
		return consume;
	}
	const offPointerDown = on(win, "pointerdown", (event) => {
		swallowClick = false;
		const target = event.composedPath()[0];
		if (event.pointerType === "touch") {
			touch = {
				x: event.clientX,
				y: event.clientY,
				target
			};
			return;
		}
		touch = void 0;
		pending = void 0;
		if (pressedScrollbar(event, target)) return;
		const point = {
			x: event.clientX,
			y: event.clientY
		};
		const { dismissed, consume } = plan(event, target, point);
		if (dismissed[0]?.outsidePress === "click") {
			if (event.button !== 0) return;
			pending = {
				layer: dismissed[0],
				target,
				point
			};
			if (consume) {
				event.preventDefault();
				swallowClick = true;
			}
			return;
		}
		if (consume) {
			event.preventDefault();
			swallowClick = true;
		}
		for (const layer of dismissed) layer.onOutsidePress?.(event);
	}, { capture: true });
	const offPointerUp = on(win, "pointerup", (event) => {
		const press = pending;
		pending = void 0;
		if (!press || !press.layer.active()) return;
		if (insideTree(press.layer, event.composedPath()[0], event)) return;
		dismiss(event, press.target, press.point);
	}, { capture: true });
	const offClick = on(win, "click", (event) => {
		if (swallowClick && event.detail) {
			swallowClick = false;
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		swallowClick = false;
		if (!touch) return;
		const press = touch;
		touch = void 0;
		if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 10) return;
		if (dismiss(event, press.target, {
			x: press.x,
			y: press.y
		})) {
			event.preventDefault();
			event.stopPropagation();
		}
	}, { capture: true });
	const offKey = on(doc, "keydown", (event) => escapeTop(doc, event));
	const offBlur = on(win, "blur", (event) => {
		for (const layer of active().reverse()) layer.onBlur?.(event);
	});
	return () => {
		offPointerDown();
		offPointerUp();
		offKey();
		offBlur();
		if (!swallowClick) return offClick();
		const off = () => (offClick(), offNext(), offSwallowed());
		const offNext = on(win, "pointerdown", off, { capture: true });
		const offSwallowed = on(win, "click", off, { capture: true });
	};
}
function layerContains(layer, target) {
	return insideTree(layer, target);
}
function findLayer(target) {
	const hops = composedHops(target);
	return active().reverse().find((layer) => hops.some((hop) => layer.contains(hop)));
}
function markClosed(target) {
	realm.closed = target;
	setTimeout(() => {
		if (realm.closed === target) realm.closed = void 0;
	});
}
function lastClosed() {
	return realm.closed;
}
function listenIn(doc) {
	const win = doc.defaultView;
	if (!win) return () => {};
	let entry = realm.listening.get(doc);
	if (!entry) realm.listening.set(doc, entry = {
		layers: 0,
		stop: listen(doc, win)
	});
	const current = entry;
	current.layers++;
	return () => {
		if (--current.layers > 0) return;
		realm.listening.delete(doc);
		current.stop();
	};
}
function documentOf(layer) {
	return layer.el?.ownerDocument ?? document;
}
function escapeTop(doc, event, from) {
	if (event.key !== "Escape" || event.defaultPrevented || isComposing(event)) return;
	const top = active().filter((layer) => documentOf(layer) === doc).at(-1);
	if (!top?.onEscape || from && top !== from) return;
	realm.escapeAt = performance.now();
	top.onEscape(event);
}
function escapeLayer(layer, event) {
	escapeTop(documentOf(layer), event, layer);
}
function pushLayer(layer) {
	realm.pushed = (realm.pushed ?? 0) + 1;
	layer.order = realm.pushed;
	realm.stack.push(layer);
	const stopListening = listenIn(documentOf(layer));
	let popped = false;
	return () => {
		if (popped) return;
		popped = true;
		const index = realm.stack.indexOf(layer);
		if (index !== -1) realm.stack.splice(index, 1);
		stopListening();
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/modal.js
var shared = globalThis[/* @__PURE__ */ Symbol.for("ui-sdk.modal@2")] ??= {
	holders: /* @__PURE__ */ new WeakMap(),
	thaw: /* @__PURE__ */ new WeakMap(),
	inert: /* @__PURE__ */ new WeakMap()
};
function lockScroll(doc = document, modal) {
	const token = {};
	let tokens = shared.holders.get(doc);
	if (!tokens) shared.holders.set(doc, tokens = /* @__PURE__ */ new Set());
	if (!tokens.size) shared.thaw.set(doc, freezeScroller(doc));
	tokens.add(token);
	const unguard = modal && isIOS() ? guardTouch(modal) : void 0;
	return () => {
		if (!tokens.delete(token)) return;
		unguard?.();
		if (tokens.size) return;
		shared.thaw.get(doc)?.();
		shared.thaw.delete(doc);
	};
}
function scrollLockStyles({ scrollbar, gutter, padding }) {
	const styles = {
		overflow: "hidden",
		"scroll-behavior": "auto"
	};
	if (scrollbar > 0) {
		if (gutter) styles["scrollbar-gutter"] = "stable";
		else styles["padding-right"] = `${padding + scrollbar}px`;
	}
	return styles;
}
function freezeScroller(doc) {
	const { scroller, gutter, padding } = early$1.get(doc) ?? measureScroller(doc);
	const styles = scrollLockStyles({
		scrollbar: gutter,
		gutter: typeof CSS !== "undefined" && CSS.supports("scrollbar-gutter", "stable"),
		padding
	});
	const restores = Object.entries(styles).map(([name, value]) => setStyle$1(scroller, name, value));
	if (gutter > 0) restores.push(setStyle$1(doc.documentElement, "--scrollbar-width", `${gutter}px`));
	return () => restores.forEach((restore) => restore());
}
var early$1 = /* @__PURE__ */ new WeakMap();
function measureScrollerEarly(doc) {
	if (early$1.has(doc)) return;
	early$1.set(doc, measureScroller(doc));
	setTimeout(() => early$1.delete(doc));
}
function measureScroller(doc) {
	const view = doc.defaultView ?? window;
	const scroller = documentScroller(doc, view);
	const computed = view.getComputedStyle(scroller);
	return {
		scroller,
		gutter: gutterWidth(scroller, doc, view, computed),
		padding: parseFloat(computed.paddingRight) || 0
	};
}
function documentScroller(doc, view) {
	const { body, documentElement: root } = doc;
	if (!body || view.getComputedStyle(root).overflowY === "visible") return root;
	return /auto|scroll/.test(view.getComputedStyle(body).overflowY) ? body : root;
}
function gutterWidth(scroller, doc, view, computed) {
	if (scroller === doc.documentElement) return view.innerWidth - scroller.clientWidth;
	const borders = (parseFloat(computed.borderLeftWidth) || 0) + (parseFloat(computed.borderRightWidth) || 0);
	return scroller.offsetWidth - scroller.clientWidth - borders;
}
function canScroll(el, view) {
	const style = view.getComputedStyle(el);
	const vertical = /auto|scroll/.test(style.overflowY) && el.scrollHeight > el.clientHeight;
	const horizontal = /auto|scroll/.test(style.overflowX) && el.scrollWidth > el.clientWidth;
	return vertical || horizontal;
}
function insideScroller(el, view) {
	const { body, documentElement } = el.ownerDocument;
	for (let node = el; node && node !== body && node !== documentElement; node = node.parentElement) if (canScroll(node, view)) return true;
	return false;
}
function touchOwner(start) {
	if (start.fingers > 1 || start.zoomed) return "browser";
	if (start.scroller || start.slider || start.selecting) return "element";
	return "page";
}
var guardRule = "@layer ui-sdk { [data-scroll-guard], [data-scroll-guard] * { overscroll-behavior: contain } }";
function guardTouch(modal) {
	const doc = modal.ownerDocument;
	const view = doc.defaultView ?? window;
	writeStyle(doc, "ui-sdk-scroll-guard", guardRule);
	const marked = !modal.hasAttribute("data-scroll-guard");
	if (marked) modal.setAttribute("data-scroll-guard", "");
	let owner = "browser";
	const offStart = on(doc, "touchstart", (event) => {
		const target = event.target instanceof Element ? event.target : null;
		owner = touchOwner({
			fingers: event.touches.length,
			zoomed: (view.visualViewport?.scale ?? 1) !== 1,
			scroller: !!target && insideScroller(target, view),
			slider: !!target?.closest("input[type=\"range\"]"),
			selecting: doc.getSelection()?.type === "Range"
		});
	}, {
		capture: true,
		passive: true
	});
	const offMove = on(doc, "touchmove", (event) => {
		if (owner === "page" && event.cancelable) event.preventDefault();
	}, { passive: false });
	return () => {
		offStart();
		offMove();
		if (marked) modal.removeAttribute("data-scroll-guard");
	};
}
var liveRegions = "[aria-live]:not([aria-live=\"off\"]):not([data-slot=\"carousel-content\"]),[role=\"status\"],[role=\"alert\"],[role=\"log\"],output";
function parentOf(node) {
	const parent = node.parentNode;
	return parent instanceof ShadowRoot ? parent.host : parent;
}
function applyInert(keep) {
	const doc = keep[0]?.ownerDocument ?? document;
	const all = [
		...keep,
		...Array.from(doc.querySelectorAll(liveRegions)),
		...persistentLayers()
	];
	const targets = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
	const keepSet = /* @__PURE__ */ new Set();
	for (const el of targets) for (let node = el; node; node = parentOf(node)) keepSet.add(node);
	const changed = [];
	for (const el of targets) for (let node = el; node && node !== doc.body; node = parentOf(node)) for (const sibling of Array.from(node.parentNode?.children ?? [])) {
		if (keepSet.has(sibling) || !(sibling instanceof HTMLElement)) continue;
		const count = shared.inert.get(sibling) ?? (sibling.inert ? 1e400 : 0);
		if (count === 0) sibling.inert = true;
		if (count !== 1e400) shared.inert.set(sibling, count + 1);
		changed.push(sibling);
	}
	return () => {
		for (const el of changed) {
			const count = shared.inert.get(el);
			if (count === void 0) continue;
			if (count <= 1) {
				el.inert = false;
				shared.inert.delete(el);
			} else shared.inert.set(el, count - 1);
		}
	};
}
function inertOutside(keep) {
	let current = keep;
	let release = applyInert(current);
	let done = false;
	const swap = (next) => {
		const previous = release;
		current = next;
		release = applyInert(next);
		previous();
	};
	return Object.assign(() => {
		if (done) return;
		done = true;
		release();
	}, { keep(el) {
		if (done) return () => {};
		swap([...current, el]);
		return () => {
			if (!done) swap(current.filter((node) => node !== el));
		};
	} });
}
// node_modules/@ui-sdk/core/dist/foundation/popups/popup-behavior.js
var plain = {
	tab: "close",
	blur: "always",
	outsidePress: "pointerdown",
	shield: false,
	keepTrigger: true,
	focusOnMount: false,
	dismissOnFocusLoss: true,
	closeWatcher: false,
	blocking: false,
	movesFocus: true
};
var trapOrFlow = (modal) => modal.trapFocus ? "trap" : "flow";
var popupPresets = {
	menu: plain,
	select: plain,
	combobox: {
		...plain,
		tab: "native"
	},
	popover: {
		...plain,
		tab: trapOrFlow,
		blur: "iframe"
	},
	dialog: {
		...plain,
		tab: trapOrFlow,
		blur: "never",
		outsidePress: "click",
		shield: true,
		keepTrigger: false,
		focusOnMount: true,
		dismissOnFocusLoss: false,
		closeWatcher: true,
		blocking: (modal) => modal.inertAndLock
	},
	tooltip: {
		...plain,
		tab: "native",
		movesFocus: false
	},
	hoverCard: {
		...plain,
		tab: "flow"
	},
	navigationMenu: {
		...plain,
		tab: "flow",
		blur: "never"
	}
};
function resolveBehavior(preset, overrides) {
	const behavior = { ...popupPresets[preset] };
	for (const key of Object.keys(plain)) {
		const value = overrides[key];
		if (value !== void 0) Object.assign(behavior, { [key]: value });
	}
	return behavior;
}
// node_modules/@ui-sdk/core/dist/foundation/popups/popup-elements.js
var registry = () => globalThis[/* @__PURE__ */ Symbol.for("ui-sdk.popup-elements@1")] ??= /* @__PURE__ */ new WeakMap();
function registerPopupElement(el) {
	const elements = registry();
	elements.set(el, (elements.get(el) ?? 0) + 1);
	let done = false;
	return () => {
		if (done) return;
		done = true;
		const count = (elements.get(el) ?? 1) - 1;
		if (count > 0) elements.set(el, count);
		else elements.delete(el);
	};
}
function inPopupElement(target) {
	const elements = registry();
	for (let node = target; node; node = node.parentNode ?? node.host ?? null) if (elements.has(node)) return true;
	return false;
}
function ownsEvent(el, event, same = `[data-slot="${el.getAttribute("data-slot")}"]`) {
	return event.target.closest(same) === el;
}
// node_modules/@ui-sdk/core/dist/foundation/focus/tabbable.js
var candidates = [
	"a[href]",
	"area[href]",
	"button",
	"input:not([type='hidden'])",
	"select",
	"textarea",
	"iframe",
	"summary",
	"audio[controls]",
	"video[controls]",
	"[contenteditable]:not([contenteditable='false'])",
	"[tabindex]"
].join(",");
function isTabbable(el) {
	if (!(el instanceof HTMLElement) || el.tabIndex < 0) return false;
	if (el.matches(":disabled") || el.closest("[inert]")) return false;
	if ((el.checked ? [] : radioGroup(el)).some((radio) => radio.checked && isTabbable(radio))) return false;
	if (typeof el.checkVisibility === "function") return el.checkVisibility({ visibilityProperty: true });
	return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
}
function radioGroup(el) {
	if (!(el instanceof HTMLInputElement) || el.type !== "radio" || !el.name) return [];
	return (el.form ? Array.from(el.form.elements) : Array.from(el.getRootNode().querySelectorAll(`input[name="${CSS.escape(el.name)}"]`))).filter((radio) => radio instanceof HTMLInputElement && radio.type === "radio" && radio.name === el.name && radio.form === el.form);
}
function tabbables(root) {
	return Array.from(root.querySelectorAll(candidates)).filter(isTabbable);
}
function composedTabbables(root) {
	const ordered = (scope) => [...scope.filter((entry) => entry.index > 0).sort((a, b) => a.index - b.index), ...scope.filter((entry) => entry.index <= 0)].flatMap((entry) => entry.stops);
	const walk = (nodes, scope) => {
		for (const el of nodes) {
			const index = el.hasAttribute("tabindex") ? el.tabIndex : 0;
			if (el.hasAttribute("inert") || el.shadowRoot && index < 0) continue;
			const stops = el.matches(candidates) && !el.shadowRoot?.delegatesFocus && isTabbable(el) ? [el] : [];
			const slotted = el instanceof HTMLSlotElement ? el.assignedElements() : [];
			if (el.shadowRoot || slotted.length) {
				const inner = [];
				walk(el.shadowRoot?.children ?? slotted, inner);
				scope.push({
					index,
					stops: [...stops, ...ordered(inner)]
				});
			} else {
				scope.push({
					index,
					stops
				});
				walk(el.children, scope);
			}
		}
	};
	const top = [];
	walk(root.children, top);
	return top.flatMap((entry) => entry.stops);
}
function positiveTabStops(stops, root) {
	const slotted = (el) => {
		for (let node = el; node && node !== root; node = node.parentElement) if (node.assignedSlot) return true;
		return false;
	};
	return stops.filter((el) => el.tabIndex > 0 && !slotted(el)).sort((a, b) => a.tabIndex - b.tabIndex);
}
function nextTabbable(node, skip) {
	return tabbables((node.ownerDocument ?? document).body).find((el) => !el.contains(node) && !skip?.contains(el) && isAfter(node, el));
}
var focusables = "a[href],button,input:not([type=\"hidden\"]),select,textarea,iframe,summary,[contenteditable]:not([contenteditable=\"false\"]),[tabindex]";
var ownTabStops = /* @__PURE__ */ new WeakSet();
function takesFocus(node, root) {
	const inert = node.closest("[inert]");
	return node.tabIndex >= 0 && !node.matches(":disabled") && !(inert !== root && root.contains(inert));
}
function holdsFocusableNode(node, root) {
	if (!(node instanceof Element)) return false;
	return node.matches("a[href],button,input:not([type=\"hidden\"]),select,textarea,iframe,summary,[contenteditable]:not([contenteditable=\"false\"]),[tabindex]") && takesFocus(node, root) || holdsFocusable(node, root);
}
function holdsFocusable(el, root = el) {
	return Array.from(el.querySelectorAll(focusables)).some((node) => takesFocus(node, root));
}
function bindTabStop(el, wanted, { skipWhenHolding = false } = {}) {
	const authored = el.hasAttribute("tabindex") && !ownTabStops.has(el);
	let holds = holdsFocusable(el);
	const check = () => {
		if (authored) return;
		const stop = wanted() && !holds ? "0" : skipWhenHolding ? "-1" : null;
		if (el.getAttribute("tabindex") === stop) return;
		if (stop === null) {
			el.removeAttribute("tabindex");
			ownTabStops.delete(el);
		} else {
			el.setAttribute("tabindex", stop);
			ownTabStops.add(el);
		}
	};
	check();
	if (typeof MutationObserver === "undefined") return {
		check,
		stop: () => {}
	};
	const observer = new MutationObserver((records) => {
		for (const record of records) {
			if (record.target === el && record.type === "attributes") continue;
			if (record.type === "attributes" || holds && record.removedNodes.length) {
				holds = holdsFocusable(el);
				break;
			}
			if (!holds) holds = Array.from(record.addedNodes).some((node) => holdsFocusableNode(node, el));
		}
		check();
	});
	observer.observe(el, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: [
			"tabindex",
			"disabled",
			"href",
			"contenteditable",
			"inert"
		]
	});
	return {
		check,
		stop: () => observer.disconnect()
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/frame-guards.js
var hidden$1 = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;outline:none";
function guardFrames(popup, trapping) {
	const doc = popup.ownerDocument;
	let frame;
	let guards = [];
	const remove = () => {
		guards.forEach((guard2) => guard2.remove());
		guards = [];
		frame = void 0;
	};
	const guard = () => {
		const el = doc.createElement("span");
		el.tabIndex = 0;
		el.setAttribute("aria-hidden", "true");
		el.style.cssText = hidden$1;
		return el;
	};
	const watch = () => {
		const active = doc.activeElement;
		if (guards.length || !trapping() || !(active instanceof HTMLIFrameElement) || !popup.contains(active)) return;
		frame = active;
		guards = [guard(), guard()];
		active.before(guards[0]);
		active.after(guards[1]);
	};
	const later = () => {
		watch();
		setTimeout(watch);
	};
	const offBlur = on(doc.defaultView ?? window, "blur", later);
	const offFocusOut = on(doc, "focusout", later);
	const offFocus = on(doc, "focusin", (event) => {
		const side = guards.indexOf(event.target);
		const from = frame;
		remove();
		if (side < 0 || !from) return;
		const stops = tabbables(popup);
		const step = side === 0 ? -1 : 1;
		(stops.at((stops.indexOf(from) + step) % stops.length) ?? popup).focus({ preventScroll: true });
	});
	return () => {
		offBlur();
		offFocusOut();
		offFocus();
		remove();
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/popup.js
function modalTriple(modal) {
	return {
		consumeOutsidePress: modal === true || modal === "pointer",
		trapFocus: modal === true || modal === "trap-focus",
		inertAndLock: modal === true
	};
}
var openerBySource = {
	mouse: "pointer",
	pen: "pointer",
	touch: "touch",
	keyboard: "keyboard",
	virtual: "keyboard",
	programmatic: "imperative",
	agent: "imperative"
};
var openerOf = (event) => event ? openerBySource[sourceOf(event)] : "imperative";
function initialFocusPlan(opener) {
	if (opener === "initial" || opener === "hover") return "none";
	if (opener === "touch") return "popup";
	return "auto";
}
function outsidePressFocus(press) {
	if (press.focusable && !press.consumed) return false;
	return press.type === "pointerdown" ? "later" : true;
}
var selectableTypes = /* @__PURE__ */ new Set([
	"text",
	"search",
	"url",
	"tel",
	"email",
	"password"
]);
function selectFilled(el) {
	if (el.localName === "input" && selectableTypes.has(el.type) && el.value && el.getAttribute("aria-expanded") !== "true") el.select();
}
function firstUsable(candidates, usable2) {
	for (const candidate of candidates) {
		const value = candidate();
		if (value && usable2(value)) return value;
	}
}
function deriveOpen(context, keys, derive) {
	deriveFromOptions(context, keys, (synced, state) => "open" in synced && synced.open !== state.open ? derive(!!synced.open, state) : void 0);
}
function popupTriggerAttrs(state, id, haspopup, key = "") {
	const active = state.trigger == null || state.trigger === key;
	const open = state.open && active;
	return {
		id: active ? `${id}-trigger` : void 0,
		"aria-haspopup": haspopup,
		"aria-expanded": String(open),
		"aria-controls": active && state.mounted ? `${id}-content` : void 0,
		...openAttrs(open)
	};
}
function disabledTriggerAttrs(props) {
	const focusable = props.disabled && props.focusableWhenDisabled;
	return {
		disabled: props.disabled && !focusable ? "" : void 0,
		"aria-disabled": focusable ? "true" : void 0,
		"data-disabled": props.disabled ? "" : void 0
	};
}
function popupContentAttrs(state, id) {
	return {
		id: `${id}-content`,
		tabindex: "-1",
		hidden: state.mounted ? void 0 : "",
		...openAttrs(state.open)
	};
}
var focusableSelector = "a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]";
function resolveTarget(target, root) {
	if (typeof target === "function") return target() ?? void 0;
	if (typeof target === "string") return root.querySelector(target) ?? void 0;
	return target;
}
function usable(el) {
	return el.isConnected && !el.closest("[inert]");
}
function readCaret(selection) {
	const range = selection.getRangeAt(0).cloneRange();
	return {
		range,
		backward: !range.collapsed && selection.anchorNode === range.endContainer && selection.anchorOffset === range.endOffset
	};
}
function focusIsLost() {
	const active = activeElement();
	return !active || active === active.ownerDocument.body || !usable(active) || active.checkVisibility?.() === false;
}
function outsideBox(point, rect) {
	return point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom;
}
function focusedFrom(el) {
	return el.getRootNode().activeElement;
}
var resets = () => globalThis[/* @__PURE__ */ Symbol.for("ui-sdk.popover-reset@2")] ??= /* @__PURE__ */ new WeakMap();
function resetPopoverStyles(doc, selectors) {
	let reset = resets().get(doc);
	if (!reset) resets().set(doc, reset = {
		selectors: /* @__PURE__ */ new Set(),
		css: ""
	});
	const known = reset.selectors;
	if (!selectors.every((selector) => known.has(selector))) {
		selectors.forEach((selector) => known.add(selector));
		reset.css = `@layer ui-sdk { :where(${[...known].map((selector) => `${selector}[popover]`).join(", ")}) { inset: auto; width: auto; height: auto; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; overflow: visible; color: inherit; background: none } }`;
	}
	if (reset.css) writeStyle(doc, "ui-sdk-popover-reset", reset.css);
}
var prepared = /* @__PURE__ */ new WeakSet();
function prepareReset(selectors) {
	if (!isBrowser || prepared.has(selectors)) return;
	prepared.add(selectors);
	ahead(() => {
		resetPopoverStyles(document, selectors);
		enforceHidden(document);
	});
}
function watchClose(close) {
	const Watcher = globalThis.CloseWatcher;
	if (!Watcher || !/Android/.test(navigator.userAgent)) return;
	let watcher;
	try {
		watcher = new Watcher();
	} catch {
		return;
	}
	watcher.addEventListener("close", (event) => {
		if (performance.now() - lastEscape() < 100) return;
		close(event);
	});
	return () => watcher?.destroy();
}
var layerParts = /* @__PURE__ */ new WeakMap();
var freezing = /* @__PURE__ */ new WeakSet();
var showsAgain = /* @__PURE__ */ new WeakMap();
function above(layer, modal) {
	for (let up = layer; up; up = up.parent) if (up === modal || freezing.has(up) && (up.order ?? 0) > (modal.order ?? 0)) return true;
	return false;
}
function createPopupLayer(options) {
	const behavior = resolveBehavior(options.preset, options);
	const tabMode = () => typeof behavior.tab === "function" ? behavior.tab(options.modal()) : behavior.tab;
	const { store } = options;
	let bound;
	let shown;
	let layer;
	let stopExit;
	let releaseInert;
	let releaseWatcher;
	let opener = store.get().open ? "initial" : "imperative";
	let focusPending = behavior.focusOnMount && store.get().open;
	let enterPending = false;
	let openedOnPress = false;
	let openedByKey = false;
	let returnMode = true;
	let before;
	let caret;
	let openedWithoutTrigger = store.get().open;
	let upstream = () => void 0;
	let path = [];
	const returnTrigger = options.returnTrigger ?? options.trigger;
	let place;
	let checkPlacement;
	let remodal;
	let observer;
	const complete = (open, closed) => options.onOpenChangeComplete?.(open, closed);
	const mountedAs = (open) => open || !!shown?.el && isBrowser;
	deriveOpen({ store }, ["mounted"], (open) => mountedAs(open) === open ? { mounted: open } : void 0);
	function openedFrom(focused) {
		before = focused;
		const selection = focused?.isContentEditable ? focused.ownerDocument.getSelection() : null;
		caret = selection?.rangeCount && focused.contains(selection.anchorNode) ? readCaret(selection) : void 0;
		const openerLayer = before && findLayer(before);
		const openerTarget = openerLayer ? void 0 : lastClosed();
		upstream = openerLayer?.returnTarget ?? (() => openerTarget);
	}
	let wasOpen = store.get().open;
	store.subscribe(() => {
		const { open } = store.get();
		if (open === wasOpen) return;
		wasOpen = open;
		if (open) {
			observer?.(true);
			options.onOpenChange?.(true);
			stopExit?.();
			stopExit = void 0;
			if (shown) {
				for (const part of [shown.el, shown.backdrop]) if (part) writeOpen(part, true);
			}
			focusPending = true;
			enterPending = true;
			returnMode = true;
			const active2 = isBrowser ? activeElement() : null;
			openedFrom(active2 && active2 !== active2.ownerDocument.body ? active2 : void 0);
			const trigger2 = returnTrigger();
			openedWithoutTrigger = opener === "imperative" || openedByKey && !!before && !findLayer(before) && !lastClosed() && !(trigger2 && composedContains(trigger2, before));
			const exiting2 = !!shown;
			store.set({ mounted: true });
			if (bound) {
				if (exiting2) hide();
				show();
			} else if (!isBrowser) {
				enterPending = false;
				complete(true);
			}
			return;
		}
		const mode = behavior.movesFocus && returnMode;
		returnMode = true;
		focusPending = false;
		enterPending = false;
		opener = "imperative";
		openedByKey = false;
		const closed = observer?.(false);
		const el = shown?.el;
		if (layer) markClosed(returnTarget());
		const from = upstream;
		const range = caret;
		caret = void 0;
		if (!el || !isBrowser) {
			options.onOpenChange?.(false, closed);
			store.set({ mounted: false });
			complete(false, closed);
			return;
		}
		const active = activeElement();
		const trigger = options.trigger();
		const hadFocus = !active || active === el.ownerDocument.body || composedContains(el, active) || !!layer && layerContains(layer, active) && !(trigger && composedContains(trigger, active));
		options.onOpenChange?.(false, closed);
		bound?.config.onClose?.();
		const order = layerCount();
		const exiting = [el, ...shown?.backdrop ? [shown.backdrop] : []];
		let left = exiting.length;
		const stops = exiting.map((target) => {
			writeOpen(target, false);
			return animateOut(target, () => {
				if (--left > 0) return;
				stopExit = void 0;
				store.set({ mounted: false });
				hide();
				complete(false, closed);
			});
		});
		if (left > 0) stopExit = () => stops.forEach((stop) => stop());
		releaseInert?.();
		releaseInert = void 0;
		releaseWatcher?.();
		releaseWatcher = void 0;
		if (!mode || !hadFocus) return;
		if (mode === true) {
			returnFocus(el, from, false, range);
			const target = activeElement();
			setTimeout(() => {
				if (target && !target.isConnected && focusIsLost() && !openedSince(order)) returnFocus(el, from);
			});
			return;
		}
		if (mode === "unless-moved") {
			queueMicrotask(() => {
				const now = activeElement();
				if (!(!!now && now !== el.ownerDocument.body && !composedContains(el, now)) && !openedSince(order)) returnFocus(el, from, false, range);
			});
			return;
		}
		const settle = () => {
			off();
			clearTimeout(fallback);
			setTimeout(() => {
				const active2 = activeElement();
				if (!active2 || active2 === el.ownerDocument.body) returnFocus(el, from, false, range);
			});
		};
		const off = on(window, "pointerup", settle, { capture: true });
		const fallback = setTimeout(settle, 1e3);
	});
	function returnChain(el, take, from = upstream, strict = false) {
		const inherited = () => from(take, strict);
		const nearby = () => neighbour(el, strict);
		return openedWithoutTrigger ? [
			() => before,
			inherited,
			returnTrigger,
			nearby,
			options.trigger
		] : [
			returnTrigger,
			() => before,
			inherited,
			nearby,
			options.trigger
		];
	}
	let resolving = false;
	function returnTarget(take = usable, strict = false) {
		if (resolving) return;
		resolving = true;
		try {
			return firstUsable(returnChain(shown?.el, take, upstream, strict), take);
		} finally {
			resolving = false;
		}
	}
	function neighbour(el, strict = false) {
		const trigger = path[0]?.node;
		if (trigger?.isConnected && !el?.contains(trigger)) {
			for (const node of [...path.slice(1).map((step2) => step2.node), trigger.ownerDocument.body]) {
				const list = tabbables(node).filter((candidate) => !el?.contains(candidate));
				const found = list.find((candidate) => isAfter(trigger, candidate) && !trigger.contains(candidate)) ?? list.filter((candidate) => isAfter(candidate, trigger)).pop();
				if (found) return found;
			}
			return;
		}
		const index = path.findIndex((step2, i) => !step2.node.isConnected && path[i + 1]?.node.isConnected);
		if (index === -1) return;
		const step = path[index];
		const next = step.next?.deref();
		const previous = step.previous?.deref();
		const parent = path[index + 1].node;
		const inPlace = (sibling) => !!sibling?.isConnected && sibling.parentNode === parent;
		const closed = inPlace(next) ? next.previousElementSibling === (step.previous ? previous : null) : !step.next && (step.previous ? inPlace(previous) && !previous.nextElementSibling : !parent.firstElementChild);
		if (strict && !closed) return;
		const from = (node, candidate) => node.contains(candidate) || isAfter(node, candidate);
		const after = inPlace(next) ? (candidate) => from(next, candidate) : inPlace(previous) ? (candidate) => isAfter(previous, candidate) && !previous.contains(candidate) : (candidate) => from(parent, candidate);
		for (const { node } of path.slice(index + 1)) {
			const list = tabbables(node).filter((candidate) => !el?.contains(candidate));
			const prior = inPlace(previous) ? list.filter((candidate) => !from(previous, candidate) || previous.contains(candidate)).pop() : void 0;
			const found = list.find(after) ?? prior ?? list[0];
			if (found) return found;
		}
	}
	function returnFocus(el, from, strict = false, range, setting = options.finalFocus?.() ?? "trigger") {
		if (setting === "none") return;
		const take = (target) => {
			if (!usable(target) || el.contains(target)) return false;
			const selection = target.ownerDocument.getSelection();
			const kept = range && target === before ? selection?.rangeCount && target.contains(selection.anchorNode) ? readCaret(selection) : range : void 0;
			restoreFocus(target);
			if (activeElement() !== target) return false;
			if (kept && target.contains(kept.range.startContainer)) {
				const { startContainer, startOffset, endContainer, endOffset } = kept.range;
				if (kept.backward) selection?.setBaseAndExtent(endContainer, endOffset, startContainer, startOffset);
				else selection?.setBaseAndExtent(startContainer, startOffset, endContainer, endOffset);
			}
			return true;
		};
		const chain = returnChain(el, take, from, strict);
		if (setting !== "trigger") chain.unshift(() => resolveTarget(setting, el.ownerDocument));
		firstUsable(chain, take);
	}
	function initialFocus(resolve) {
		if (!focusPending || !shown || !store.get().open || !behavior.movesFocus) return;
		focusPending = false;
		const plan = opener === "initial" && behavior.focusOnMount ? "auto" : initialFocusPlan(opener);
		if (plan === "none") return;
		const run = () => {
			if (!shown || !store.get().open) return;
			const target = plan === "popup" ? shown.el : resolve?.();
			if (!target) return;
			moveFocus(target);
			if (!shown || !store.get().open) return;
			const active = activeElement();
			if (!active || !composedContains(target, active) && !composedContains(shown.el, active)) {
				moveFocus(shown.el);
				return;
			}
			selectFilled(target);
		};
		if (openedOnPress) requestAnimationFrame(() => {
			const active = activeElement();
			if (!shown || !active || !composedContains(shown.el, active)) run();
		});
		else run();
	}
	function attach(el, config) {
		const cleanups = [];
		const trigger = options.trigger();
		const host = config.host?.() ?? el;
		if (opener === "initial" && !before) {
			const active = activeElement();
			openedFrom(active && active !== active.ownerDocument.body && !composedContains(el, active) ? active : void 0);
		}
		el.removeAttribute("hidden");
		host.removeAttribute("hidden");
		const backdrop = shown?.backdrop;
		if (backdrop) {
			const stop = showBackdrop(backdrop, config.inline);
			cleanups.push(() => {
				stop();
				hideBackdrop(backdrop);
			});
		}
		if (!config.inline) {
			host.setAttribute("popover", "manual");
			try {
				host.showPopover();
			} catch {}
		}
		if (config.position && options.position) {
			const placement = options.position(() => config.anchor?.() ?? options.trigger(), el, config.position);
			place = placement.place;
			checkPlacement = placement.follow;
			cleanups.push(placement, () => place = checkPlacement = void 0);
			if (config.rendered) cleanups.push(config.rendered(placement.follow));
		}
		if (!config.inline && !supportsTopLayer() && !host.style.zIndex) host.style.zIndex = "2147483000";
		cleanups.push(animateIn(el, enterPending ? () => {
			enterPending = false;
			complete(true);
		} : void 0));
		trackInput();
		let modal = options.modal();
		const blur = behavior.blur;
		const persistent = options.persistent?.() ?? [];
		const pressedBackdrop = (target, event) => target === el && !!event && "clientX" in event && outsideBox({
			x: event.clientX,
			y: event.clientY
		}, el.getBoundingClientRect());
		const returnsTo = returnTrigger() ?? (!trigger && before?.isConnected ? before : void 0);
		if (returnsTo || !trigger) path = [];
		for (let node = returnsTo ?? null; node && node !== el.ownerDocument.body; node = node.parentElement) {
			const { nextElementSibling: next, previousElementSibling: previous } = node;
			path.push({
				node,
				next: next && new WeakRef(next),
				previous: previous && new WeakRef(previous)
			});
		}
		const own = {
			parent: options.parent?.() ?? (trigger && findLayer(trigger)),
			active: () => store.get().open,
			exiting: () => !store.get().open && store.get().mounted,
			modal: modal.consumeOutsidePress,
			blocking: typeof behavior.blocking === "function" ? behavior.blocking(modal) : behavior.blocking,
			outsidePress: behavior.outsidePress,
			shield: behavior.shield,
			component: options.owner?.component,
			id: options.owner?.id,
			el,
			contains: (target, event) => el.contains(target) && !pressedBackdrop(target, event) || persistent.some((node) => node.contains(target)) || (options.contains ? options.contains(target, event) : !!options.trigger()?.contains(target)),
			overBackdrop: (x, y) => !!shown?.backdrop && !outsideBox({
				x,
				y
			}, shown.backdrop.getBoundingClientRect()) && outsideBox({
				x,
				y
			}, el.getBoundingClientRect()),
			returnTarget,
			onOutsidePress: (event) => {
				const target = event.composedPath()[0];
				options.close("outside-press", {
					event,
					focus: outsidePressFocus({
						type: event.type,
						focusable: !!target?.closest?.(focusableSelector),
						consumed: modal.consumeOutsidePress
					})
				});
			},
			onEscape: (event) => {
				event.preventDefault();
				if (options.onEscape) options.onEscape(event);
				else options.close("escape-key", {
					event,
					focus: true
				});
			},
			onBlur: blur === "never" ? void 0 : blur === "always" ? (event) => options.close("window-blur", {
				event,
				focus: false
			}) : ((event) => setTimeout(() => {
				const active = focusedFrom(el) ?? el.ownerDocument.activeElement;
				if (active?.tagName === "IFRAME" && !el.contains(active)) options.close("focus-out", {
					event,
					focus: false
				});
			}))
		};
		layer = own;
		layerParts.set(own, [el, ...backdrop ? [backdrop] : []]);
		cleanups.push(pushLayer(own));
		showsAgain.set(own, {
			inside: (outer) => outer.contains(el) || !!trigger && outer.contains(trigger),
			again: () => {
				const focused = activeElement();
				hide();
				for (const part of [host, backdrop]) try {
					part?.hidePopover();
				} catch {}
				show();
				if (focused && focused !== activeElement()) focused.focus({ preventScroll: true });
			}
		});
		if (modal.inertAndLock) freezing.add(own);
		for (const onShow of [options.onShow, config.onShow]) {
			const cleanup = onShow?.(own);
			if (cleanup) cleanups.push(cleanup);
		}
		let releaseLock;
		let releaseOwnInert;
		let pendingFreeze;
		const freezePage = () => {
			const keep = [
				el,
				...shown?.backdrop ? [shown.backdrop] : [],
				...persistent
			];
			if (trigger && behavior.keepTrigger) keep.push(trigger);
			for (const layer2 of activeLayers()) if (layer2 !== own && above(layer2, own)) keep.push(...layerParts.get(layer2) ?? []);
			releaseLock = lockScroll(el.ownerDocument, el);
			const inert = inertOutside(keep);
			own.keep = inert.keep;
			releaseInert = releaseOwnInert = inert;
		};
		const thawPage = () => {
			pendingFreeze?.();
			releaseOwnInert?.();
			releaseLock?.();
			if (releaseInert === releaseOwnInert) releaseInert = void 0;
			releaseOwnInert = releaseLock = own.keep = void 0;
		};
		if (modal.inertAndLock) pendingFreeze = afterPaint(() => {
			pendingFreeze = void 0;
			if (!store.get().open) return;
			const focused = activeElement();
			freezePage();
			if (tabMode() === "trap" && focused && !usable(focused)) {
				focusPending = true;
				initialFocus(config.initialFocus);
			}
		});
		remodal = () => {
			const next = options.modal();
			own.modal = next.consumeOutsidePress;
			own.blocking = typeof behavior.blocking === "function" ? behavior.blocking(next) : behavior.blocking;
			if (next.inertAndLock) freezing.add(own);
			else freezing.delete(own);
			if (next.inertAndLock && !modal.inertAndLock && store.get().open) freezePage();
			else if (!next.inertAndLock && modal.inertAndLock) thawPage();
			modal = next;
		};
		cleanups.push(thawPage, () => remodal = void 0);
		const beneath = new Set(activeLayers());
		for (let up = own.parent; up; up = up.parent) beneath.add(up);
		beneath.delete(own);
		for (const layer2 of beneath) if (layer2.keep && above(own, layer2)) for (const part of [el, ...backdrop ? [backdrop] : []]) cleanups.push(layer2.keep(part));
		if (tabMode() === "flow" && behavior.dismissOnFocusLoss) {
			let press;
			cleanups.push(on(el.ownerDocument, "mousedown", (event) => {
				press = event;
				setTimeout(() => {
					if (press === event) press = void 0;
				});
			}, { capture: true }), on(el.ownerDocument, "focusin", (event) => {
				const target = focusedFrom(el) ?? event.target;
				if (!store.get().open || layerContains(own, target)) return;
				if (press && own.contains(target, press)) return;
				options.close("focus-out", {
					event,
					focus: false
				});
			}));
		}
		cleanups.push(guardFrames(el, () => tabMode() === "trap"));
		if (behavior.closeWatcher) {
			const stop = watchClose((event) => options.close("back", {
				event,
				focus: true
			}));
			if (stop) {
				releaseWatcher = stop;
				cleanups.push(() => {
					stop();
					if (releaseWatcher === stop) releaseWatcher = void 0;
				});
			}
		}
		const onSubmit = (event) => {
			const form = event.target;
			const submitter = event.submitter;
			if ((submitter?.getAttribute("formmethod") ?? form.getAttribute("method"))?.toLowerCase() !== "dialog" || findLayer(form) !== own) return;
			event.preventDefault();
			options.close("close-press", {
				event,
				focus: true,
				returnValue: submitter?.value || void 0
			});
		};
		el.addEventListener("submit", onSubmit);
		cleanups.push(() => el.removeEventListener("submit", onSubmit));
		if (store.get().open && !focusPending && tabMode() === "trap" && focusIsLost()) focusPending = true;
		for (const other of activeLayers()) {
			const shows = showsAgain.get(other);
			if (other !== own && shows?.inside(el)) shows.again();
		}
		queueMicrotask(() => initialFocus(config.initialFocus));
		return () => {
			cleanups.forEach((cleanup) => cleanup());
			if (layer === own) layer = void 0;
			if (!store.get().mounted && !config.inline) try {
				host.hidePopover();
			} catch {}
		};
	}
	function show() {
		if (!bound || shown) return;
		const { el, config } = bound;
		shown = {
			el,
			cleanup: () => {},
			backdrop: config.backdrop?.()
		};
		shown.cleanup = attach(el, config);
	}
	function showBackdrop(backdrop, inline = false) {
		backdrop.removeAttribute("hidden");
		if (inline) return animateIn(backdrop);
		backdrop.setAttribute("popover", "manual");
		try {
			backdrop.showPopover();
		} catch {}
		if (!supportsTopLayer() && !backdrop.style.zIndex) backdrop.style.zIndex = "2147483000";
		return animateIn(backdrop);
	}
	function hideBackdrop(backdrop) {
		if (!store.get().mounted) try {
			backdrop.hidePopover();
		} catch {}
	}
	function hide() {
		if (!shown) return;
		const { cleanup } = shown;
		shown = void 0;
		cleanup();
	}
	function keydown(event) {
		if (event.key === "Escape" && layer) return escapeLayer(layer, event);
		const popup = shown?.el;
		if (event.key !== "Tab" || !popup) return;
		const mode = tabMode();
		if (mode === "native") return;
		if (mode === "close") return options.close("focus-out", {
			event,
			focus: false
		});
		const list = tabbables(popup);
		const stops = composedTabbables(popup);
		const first = stops[0];
		const last = stops.at(-1);
		const active = activeElement();
		const atStart = !first || active === first || active === popup;
		const atEnd = !last || active === last;
		const ahead2 = mode === "trap" ? positiveTabStops(list, popup) : [];
		if (ahead2.length) {
			const order = [...ahead2, ...list.filter((el) => !ahead2.includes(el))];
			const index = order.indexOf(active);
			const next = active === popup ? order.at(event.shiftKey ? -1 : 0) : order.at((index + (event.shiftKey ? -1 : 1)) % order.length);
			const crossing = ahead2.includes(active) || !!next && ahead2.includes(next);
			const shadow = active?.shadowRoot;
			const entersShadow = !event.shiftKey && !!shadow && tabbables(shadow).length > 0;
			if (active !== popup && (index < 0 || !crossing || entersShadow)) return;
			event.preventDefault();
			next?.focus({ preventScroll: true });
			return;
		}
		if (mode === "trap") {
			if (event.shiftKey ? atStart : atEnd) {
				event.preventDefault();
				((event.shiftKey ? last : first) ?? popup).focus({ preventScroll: true });
				return;
			}
			const index = list.indexOf(active);
			const next = index < 0 ? void 0 : list[index + (event.shiftKey ? -1 : 1)];
			const group = next && !next.checked ? radioGroup(next) : [];
			if (group.some((radio) => radio.checked) && !group.includes(active)) {
				event.preventDefault();
				next?.focus({ preventScroll: true });
				return;
			}
			setTimeout(() => {
				const now = activeElement(popup.ownerDocument);
				if (shown?.el === popup && !(now && (composedContains(popup, now) || !!layer && layerContains(layer, now)))) ((event.shiftKey ? last : first) ?? popup).focus({ preventScroll: true });
			});
			return;
		}
		const trigger = options.trigger() ?? (before?.isConnected ? before : void 0);
		if (!trigger) return;
		if (event.shiftKey && atStart) {
			event.preventDefault();
			trigger.focus({ preventScroll: true });
		} else if (!event.shiftKey && atEnd) {
			const next = nextTabbable(trigger, popup);
			if (!next) return;
			event.preventDefault();
			next.focus();
		}
	}
	return {
		bind(el, config = {}) {
			let cancelled = false;
			const unregister = registerPopupElement(el);
			const start = () => {
				bound = {
					el,
					config
				};
				if (store.get().mounted) {
					if (shown && shown.el !== el) hide();
					show();
				}
			};
			if (el.isConnected) start();
			else queueMicrotask(() => {
				if (!cancelled && el.isConnected) start();
			});
			return () => {
				cancelled = true;
				const setting = options.finalFocus?.() ?? "trigger";
				unregister();
				if (bound?.el !== el) return;
				bound = void 0;
				if (shown?.el === el) {
					const active = activeElement();
					const held = store.get().open && behavior.movesFocus && (!active || active === el.ownerDocument.body || composedContains(el, active));
					const from = upstream;
					hide();
					if (held) {
						const range = caret;
						caret = void 0;
						queueMicrotask(() => {
							if (!bound && !el.isConnected && focusIsLost()) returnFocus(el, from, true, range, setting);
						});
					}
				}
			};
		},
		keydown,
		triggerKeydown(event) {
			const popup = shown?.el;
			if (event.key !== "Tab" || event.shiftKey || !popup || !store.get().open) return;
			if (tabMode() !== "flow") return;
			event.preventDefault();
			(composedTabbables(popup)[0] ?? popup).focus({ preventScroll: true });
		},
		opening(by, event) {
			opener = by;
			openedOnPress = event?.type === "pointerdown";
			openedByKey = event?.type === "keydown";
		},
		opener: () => opener,
		observe(listener) {
			observer = listener;
		},
		requestClose: (reason, event) => options.close(reason, {
			event,
			focus: true
		}),
		returnFocus(mode) {
			returnMode = mode;
		},
		initialFocus,
		place: () => place?.(),
		checkPlacement: () => checkPlacement?.(),
		updateModal: () => remodal?.(),
		layer: () => layer,
		element: () => shown?.el,
		mountedAs,
		backdrop(backdrop) {
			if (!shown || shown.backdrop === backdrop) return () => {};
			const { el } = shown;
			const host = bound?.config.host?.() ?? el;
			const inline = !!bound?.config.inline;
			shown.backdrop = backdrop;
			const stop = showBackdrop(backdrop, inline);
			const active = activeElement();
			if (!inline) try {
				host.hidePopover();
				host.showPopover();
			} catch {}
			if (active && active !== activeElement()) active.focus({ preventScroll: true });
			const release = layer?.keep?.(backdrop);
			return () => {
				release?.();
				stop();
				if (shown?.backdrop === backdrop) shown.backdrop = void 0;
				hideBackdrop(backdrop);
			};
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/bound-keys.js
var queued = /* @__PURE__ */ new WeakMap();
function later(store, edit) {
	const waiting = queued.get(store);
	if (waiting) {
		waiting.push(edit);
		return;
	}
	const edits = [edit];
	queued.set(store, edits);
	afterBind(() => {
		queued.delete(store);
		const draft = {};
		for (const run of edits) run(draft);
		store.set(draft);
	});
}
function flagWhileBound(store, key, { now = false } = {}) {
	const flag = (value) => now ? store.set({ [key]: value }) : later(store, (draft) => draft[key] = value);
	flag(true);
	return () => flag(false);
}
function settleFlag(store, key) {
	later(store, (draft) => {
		if (draft[key] === void 0 && store.get()[key] === null) draft[key] = false;
	});
}
// \0vite/preload-helper.js
var scriptRel = "modulepreload";
var assetsURL = function(dep) {
	return "/" + dep;
};
var seen = {};
var failedCssLinks = {};
var isCssPreloadUrl = function isCssPreloadUrl(url) {
	return url.pathname.endsWith(".css");
};
var preloadOnce = function preloadOnce(seen, href, preload) {
	if (href in seen) return seen[href];
	const promise = preload();
	if (!promise) {
		seen[href] = void 0;
		return;
	}
	const preloadPromise = promise.then(() => {
		seen[href] = void 0;
	}, (err) => {
		delete seen[href];
		throw err;
	});
	seen[href] = preloadPromise;
	return preloadPromise;
};
var __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (deps && deps.length > 0) {
		let preloadedHrefs;
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises) {
			return Promise.all(promises.map((p) => Promise.resolve(p).then((value) => ({
				status: "fulfilled",
				value
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		function importMetaResolve(specifier) {
			if (import.meta.resolve) return new URL(import.meta.resolve(specifier));
			return new URL(
				specifier,
				/** #__KEEP__ */
				import.meta.url
			);
		}
		promise = allSettled(deps.map((depString) => {
			depString = assetsURL(depString, importerUrl);
			const dep = importMetaResolve(depString);
			const isCss = isCssPreloadUrl(dep);
			return preloadOnce(seen, dep.href, () => {
				if (preloadedHrefs === void 0) {
					preloadedHrefs = {
						all: /* @__PURE__ */ new Set(),
						styles: /* @__PURE__ */ new Set()
					};
					const links = document.getElementsByTagName("link");
					for (let i = links.length - 1; i >= 0; i--) {
						const link = links[i];
						preloadedHrefs.all.add(link.href);
						if (link.rel === "stylesheet") preloadedHrefs.styles.add(link.href);
					}
				}
				const preloadedHrefSet = isCss ? preloadedHrefs.styles : preloadedHrefs.all;
				const failedCssLink = isCss ? failedCssLinks[dep.href] : void 0;
				if (!failedCssLink && preloadedHrefSet.has(dep.href)) return;
				const link = document.createElement("link");
				link.rel = isCss ? "stylesheet" : scriptRel;
				if (!isCss) link.as = "script";
				link.crossOrigin = "";
				link.href = dep.href;
				if (cspNonce) link.setAttribute("nonce", cspNonce);
				if (failedCssLink) delete failedCssLinks[dep.href];
				if (failedCssLink?.isConnected) failedCssLink.replaceWith(link);
				else document.head.appendChild(link);
				if (isCss) return new Promise((res, rej) => {
					const handleSettle = (e) => {
						link.removeEventListener("load", handleSettle);
						link.removeEventListener("error", handleSettle);
						if (e.type === "error") {
							failedCssLinks[dep.href] = link;
							rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`));
						} else res(e);
					};
					link.addEventListener("load", handleSettle);
					link.addEventListener("error", handleSettle);
				});
			});
		}).filter((p) => p !== void 0));
	}
	function handlePreloadError(err) {
		const e = new Event("vite:preloadError", { cancelable: true });
		e.payload = err;
		window.dispatchEvent(e);
		if (!e.defaultPrevented) throw err;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};
// node_modules/@ui-sdk/core/dist/foundation/kernel/action.js
var DEFAULT_PENDING_ANNOUNCEMENT = "Loading";
var PENDING_ANNOUNCE_DELAY = 1e3;
var popupResults = /* @__PURE__ */ new WeakSet();
var popupResult = (promise) => (popupResults.add(promise), promise);
var isPromise = (value) => !!value && typeof value.then === "function" && !popupResults.has(value);
var canceledAction = /* @__PURE__ */ Symbol("canceled action");
function runAction(action, source, handlers) {
	const failed = (error) => {
		note("an action failed. The error is in its part's `error` state.", void 0, error);
		handlers.failed(error);
	};
	const done = () => withSource(source, handlers.done);
	let result;
	try {
		result = action({ source });
	} catch (error) {
		return failed(error);
	}
	if (result === canceledAction) return;
	if (!isPromise(result)) return done();
	handlers.pending(true);
	result.then(() => {
		handlers.pending(false);
		done();
	}, (error) => {
		handlers.pending(false);
		failed(error);
	});
}
function announcePending(context, isPending) {
	const say = () => {
		const text = context.options().pendingAnnouncement ?? DEFAULT_PENDING_ANNOUNCEMENT;
		__vitePreload(async () => {
			const { announce } = await Promise.resolve().then(() => announce_exports);
			return { announce };
		}, void 0).then(({ announce }) => wasPending && announce(text), () => {});
	};
	let timer;
	let wasPending = false;
	const unsubscribe = context.store.subscribe(() => {
		const pending = isPending();
		if (pending === wasPending) return;
		wasPending = pending;
		clearTimeout(timer);
		if (pending) timer = setTimeout(say, PENDING_ANNOUNCE_DELAY);
	});
	context.onDestroy(() => {
		wasPending = false;
		clearTimeout(timer);
		unsubscribe();
	});
}
// node_modules/@ui-sdk/core/dist/foundation/popups/popup-steps.js
function unopened(reason, event) {
	return popupResult(Promise.resolve({
		reason,
		source: changeSource(reason, event)
	}));
}
function createOpenSteps(config) {
	const { popup, store, rules = {} } = config;
	const imperative = "imperative";
	const triggerPress = "trigger-press";
	let pending;
	let requested;
	let openAnchor;
	popup.observe((open) => {
		const closed = open ? void 0 : requested ?? {
			reason: imperative,
			source: "programmatic"
		};
		requested = void 0;
		if (!closed) return;
		pending?.resolve(closed);
		pending = void 0;
		return closed;
	});
	config.onDestroy(() => {
		pending?.resolve({
			reason: "unmount",
			source: "programmatic"
		});
		pending = void 0;
	});
	function result(signal) {
		if (!pending) {
			let resolve;
			pending = {
				promise: popupResult(new Promise((done) => resolve = done)),
				resolve
			};
		}
		if (signal && !signal.aborted) {
			const abort = () => popup.requestClose("imperative");
			signal.addEventListener("abort", abort, { once: true });
			pending.promise.then(() => signal.removeEventListener("abort", abort));
		}
		return pending.promise;
	}
	function show(request = {}, openReason) {
		return attempt(request, openReason).result;
	}
	function attempt(request, openReason) {
		const { event, signal } = request;
		if (signal?.aborted) return {
			opened: false,
			result: unopened(imperative)
		};
		const payloadReason = request.reason ?? (event ? triggerPress : imperative);
		const reason = openReason ?? payloadReason;
		const settled = {
			...request,
			reason,
			payloadReason
		};
		let opened = false;
		const open = (by = request.by ?? "imperative") => {
			openAnchor = request.anchor;
			const restorePayload = config.payload?.opening(request.trigger, request.payload, {
				reason: payloadReason,
				event
			});
			popup.opening(by, event);
			opened = config.change(true, {
				reason,
				event
			});
			if (!opened) restorePayload?.();
			return opened;
		};
		if (store.get().open) {
			if (popup.opener() === "hover" && request.by !== "hover") popup.opening(request.by ?? "imperative", event);
			if (request.trigger === void 0 && config.payload?.reopening(request, { reason: payloadReason }) && request.anchor) openAnchor = request.anchor;
			rules.reopen?.(settled, open);
			return {
				opened,
				result: result(signal)
			};
		}
		if (rules.open) rules.open(settled, open);
		else open();
		return {
			opened,
			result: opened ? result(signal) : unopened(reason, event)
		};
	}
	function hide(request = {}) {
		if (!store.get().open) return false;
		const { event, returnValue } = request;
		const reason = request.reason ?? imperative;
		if (config.dismissal && !config.dismissal.allows(reason, event)) return false;
		let closed = false;
		const close = () => {
			requested = {
				reason,
				source: changeSource(reason, event),
				returnValue
			};
			popup.returnFocus(request.focus ?? config.returnFocus ?? true);
			const changed = config.change(false, {
				reason,
				event,
				...returnValue !== void 0 && { returnValue }
			});
			if (!changed) {
				popup.returnFocus(true);
				requested = void 0;
			}
			closed = changed;
			return changed;
		};
		if (rules.close) rules.close({
			...request,
			reason
		}, close);
		else close();
		return closed;
	}
	function takeOver({ trigger, payload, anchor, reason, event }) {
		openAnchor = anchor;
		config.payload?.handOver(trigger, payload, {
			reason,
			event
		});
	}
	const showFor = (reason, event) => attempt({
		reason: imperative,
		event
	}, reason).opened;
	return {
		api: {
			isOpen: () => store.get().open,
			setOpen: (open, { reason, event } = {}) => open ? showFor(reason, event) : hide({
				reason,
				event
			}),
			open: (options = {}) => show({
				...options,
				reason: options.reason ?? imperative
			}),
			close: ({ reason, event, returnValue } = {}) => hide({
				reason,
				event,
				returnValue
			}),
			toggle: ({ reason, event } = {}) => store.get().open ? hide({
				reason,
				event
			}) : showFor(reason, event)
		},
		show,
		attempt,
		hide,
		takeOver,
		result,
		anchor: () => openAnchor
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/create-popup.js
function createPopup(primitiveContext, config) {
	const context = primitiveContext;
	const { store, element, options } = context;
	const { preset } = config;
	const contentSlot = config.slot ?? "content";
	const triggerSlot = config.trigger ?? "trigger";
	const change = createChange(context);
	const contentProps = (key) => key !== void 0 && context.props(contentSlot, key) || elements(context, contentSlot)[0]?.props || context.props(contentSlot) || {};
	const triggerElement = () => {
		if (rules?.trigger) return rules.trigger();
		const key = store.get().trigger;
		return key !== null && element(triggerSlot, key) || element(triggerSlot);
	};
	let goneAtOpen = null;
	let onlyTrigger;
	const openedFrom = () => {
		const key = store.get().trigger;
		if (rules?.trigger || key === null || key === goneAtOpen) return triggerElement();
		const only = onlyTrigger ?? elements(context, triggerSlot).length <= 1;
		return element(triggerSlot, key) ?? (only ? element(triggerSlot) : void 0);
	};
	let wasOpen = store.get().open;
	store.subscribe(() => {
		const { open, trigger } = store.get();
		if (open === wasOpen) return;
		wasOpen = open;
		if (!open) return;
		goneAtOpen = trigger !== null && !element(triggerSlot, trigger) ? trigger : null;
		onlyTrigger = elements(context, triggerSlot).length <= 1;
	});
	const core = {
		label: context.label,
		role: config.role ?? preset.role,
		store,
		options,
		onOptions: context.onOptions,
		onDestroy: context.onDestroy,
		element,
		parts: context.parts,
		preset,
		get popup() {
			return popup;
		},
		get control() {
			return control;
		},
		triggerElement,
		triggerSlot,
		triggerDisabled: (key) => !!context.props(triggerSlot, key)?.disabled,
		contentProps
	};
	const rules = core.rules = config.rules?.(core);
	const dismissal = preset.dismissal?.(options, rules);
	const presentation = preset.presentation?.(core, dismissal);
	const press = preset.press?.(core);
	const group = preset.group?.(core);
	const hover = preset.hover?.(core, group);
	const focus = preset.focus?.(core);
	const triggerName = preset.triggerName?.(core);
	preset.resetStyles?.prepare(context.label, contentSlot);
	preset.placement?.prepare();
	function modalOf(arriving, state) {
		if (preset.modal === void 0) return;
		return { modal: arriving.modal ?? (state.presentation === "sheet" ? true : preset.modal) };
	}
	function updateModal() {
		const patch = modalOf(options(), store.get());
		if (patch) store.set(patch);
	}
	function dismiss(reason, details) {
		if (rules?.dismiss) rules.dismiss(reason, details);
		else control.hide({
			reason,
			...details
		});
	}
	const popup = createPopupLayer({
		...config.behavior,
		preset: preset.behavior,
		position: preset.placement?.position,
		owner: {
			component: context.label,
			id: context.id
		},
		store,
		trigger: triggerElement,
		returnTrigger: openedFrom,
		contains: (target, event) => rules?.contains ? rules.contains(target, event) : !!triggerElement()?.contains(target) || !!press?.contains(target, event),
		close: dismiss,
		modal: () => rules?.modal?.() ?? modalTriple(store.get().modal),
		parent: () => rules?.parent?.(),
		persistent: () => rules?.persistent?.() ?? [],
		finalFocus: () => contentProps().finalFocus,
		onEscape: (event) => rules?.onEscape ? rules.onEscape(event) : dismiss("escape-key", {
			event,
			focus: true
		}),
		onShow: (layer) => rules?.onShow?.(layer),
		onOpenChange(open, closed) {
			rules?.onOpenChange?.(open, closed);
			group?.change(open);
			if (open) {
				presentation?.open();
				updateModal();
				return;
			}
			hover?.clear();
			focus?.clear();
		},
		onOpenChangeComplete(open, closed) {
			rules?.onOpenChangeComplete?.(open, closed);
			options().onOpenChangeComplete?.(open);
		}
	});
	const control = createOpenSteps({
		dismissal,
		popup,
		store,
		payload: preset.payload?.(store, (payload, details) => change("payload", payload, details)),
		change: (open, details) => change("open", open, {
			...details,
			...rules?.details?.()
		}),
		onDestroy: context.onDestroy,
		get returnFocus() {
			return rules?.returnFocus;
		},
		rules: {
			open(request, open) {
				hover?.clear();
				group?.opening(request.event);
				if (rules?.open) rules.open(request, open);
				else open();
			},
			reopen(request) {
				hover?.clear();
				if (rules?.reopen) return rules.reopen(request);
				const { trigger, payload, payloadReason, event } = request;
				if (trigger !== void 0 && trigger !== store.get().trigger) control.takeOver({
					trigger,
					payload,
					reason: payloadReason,
					event
				});
			},
			close: (request, close) => rules?.close ? rules.close(request, close) : close()
		}
	});
	updateModal();
	deriveFromOptions(context, ["modal"], (synced, state, arriving) => modalOf(arriving, {
		...state,
		...synced
	}));
	let modalShown = store.get().modal;
	store.subscribe(() => {
		const { modal } = store.get();
		if (modal === modalShown) return;
		modalShown = modal;
		popup.updateModal();
	});
	const features = {
		dismissal,
		presentation,
		press,
		group,
		hover,
		focus,
		triggerName,
		rules
	};
	return {
		...control.api,
		getPayload: () => store.get().payload,
		focus: () => triggerElement()?.focus(),
		internal: Object.assign(core, features)
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/dismissal.js
function createDismissal(options, rules = {}) {
	const dismissible = () => options().dismissible !== false;
	const attempt = (reason, event) => options().onDismissAttempt?.({
		reason,
		event
	});
	return {
		allows(reason, event) {
			const refused = rules.refusal?.(reason) ?? (isDismissal(reason) && !dismissible() ? "attempt" : void 0);
			if (!refused) return true;
			if (refused === "attempt" && reason !== "focus-out" && reason !== "window-blur") {
				attempt(reason, event);
				rules.refused?.(reason);
			}
			return false;
		},
		sheet: {
			dismissible,
			onDismissAttempt: (event) => attempt("swipe", event)
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/platform/sides.js
function physicalSide(side, rtl = false) {
	if (side === "start") return rtl ? "right" : "left";
	if (side === "end") return rtl ? "left" : "right";
	return side;
}
// node_modules/@ui-sdk/core/dist/foundation/text/accessible-name.js
var implicitRoles = [
	["button", "button"],
	["a[href]", "link"],
	["input[type=checkbox][switch]", "switch"],
	["input[type=checkbox]", "checkbox"],
	["input[type=radio]", "radio"],
	["input[type=range]", "slider"],
	["dialog", "dialog"],
	["h1, h2, h3, h4, h5, h6", "heading"]
];
var namedByContent = /* @__PURE__ */ new Set([
	"button",
	"cell",
	"checkbox",
	"columnheader",
	"gridcell",
	"heading",
	"link",
	"menuitem",
	"menuitemcheckbox",
	"menuitemradio",
	"option",
	"radio",
	"row",
	"rowheader",
	"switch",
	"tab",
	"treeitem"
]);
function roleOf(el) {
	const explicit = el.getAttribute("role")?.trim().split(/\s+/)[0];
	if (explicit) return explicit;
	return implicitRoles.find(([selector]) => el.matches(selector))?.[1] ?? "";
}
function isHidden(el) {
	if (el.hasAttribute("hidden") || el.getAttribute("aria-hidden") === "true") return true;
	const style = el.ownerDocument.defaultView?.getComputedStyle(el);
	return style?.display === "none" || style?.visibility === "hidden";
}
function byId(el, id) {
	return el.getRootNode().getElementById?.(id) ?? null;
}
function labelledByOf(el) {
	return (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => id && byId(el, id)).filter((label) => !!label).map((label) => label.getAttribute("aria-label") ?? contentOf(label, true)).join(" ");
}
function embeddedName(el) {
	if (el.localName === "img") return el.getAttribute("alt") ?? "";
	if (el.localName !== "svg") return "";
	return [...el.children].find((child) => child.localName === "title")?.textContent ?? "";
}
function nameWithin(el, labelling, hidden) {
	if (el.matches("input, select, textarea")) return "";
	const own = !labelling && labelledByOf(el) || el.getAttribute("aria-label")?.trim() || embeddedName(el);
	if (own) return ` ${own} `;
	if (el.localName === "svg") return "";
	const content = contentOf(el, labelling, hidden);
	const title = el.getAttribute("title");
	return content || (title ? ` ${title} ` : "");
}
function contentOf(el, labelling = false, hidden = isHidden(el)) {
	let text = "";
	for (const node of el.childNodes) if (node.nodeType === Node.TEXT_NODE) text += node.nodeValue;
	else if (node.nodeType === Node.ELEMENT_NODE && (hidden || !isHidden(node))) {
		const name = nameWithin(node, labelling, hidden);
		text += apart(node, name) ? ` ${name} ` : name;
	}
	return text;
}
function apart(el, name) {
	const display = el.ownerDocument.defaultView?.getComputedStyle(el).display;
	return !!display && display !== "inline" && (!display.startsWith("inline") || !!name.trim());
}
var collapse = (text) => text.replace(/\s+/g, " ").trim();
var labelsOf = (el) => [...el.labels ?? []].map((label) => contentOf(label)).join(" ");
var nameSources = [
	labelledByOf,
	(el) => el.getAttribute("aria-label") ?? "",
	labelsOf,
	embeddedName,
	(el) => namedByContent.has(roleOf(el)) ? contentOf(el) : "",
	(el) => el.getAttribute("title") ?? ""
];
[...nameSources.filter((source) => source !== labelsOf)];
function firstName(el, sources) {
	for (const source of sources) {
		const name = collapse(source(el));
		if (name) return name;
	}
	return "";
}
function accessibleName(el) {
	return firstName(el, nameSources);
}
// node_modules/@ui-sdk/core/dist/foundation/popups/popup-features.js
function pressOpening(core) {
	const { store, preset } = core;
	function press(key, props, event) {
		if (props.disabled) return;
		const by = openerOf(event);
		if (!store.get().open) return core.control.show({
			event,
			by,
			reason: "trigger-press",
			trigger: key,
			payload: props.payload
		});
		const active = store.get().trigger;
		if (active !== null && active !== key) return core.control.takeOver({
			trigger: key,
			payload: props.payload,
			reason: "trigger-press",
			event
		});
		if (core.popup.opener() === "hover") return core.control.show({
			event,
			by
		});
		core.control.hide({
			reason: "trigger-press",
			event
		});
	}
	return {
		press,
		keydown(event, el, key, props) {
			if (el.tagName === "BUTTON" || event.key !== "Enter" && event.key !== " ") return false;
			event.preventDefault();
			press(key, props, event);
			return true;
		},
		contains: (target, event) => !!event && elements(core, core.triggerSlot).some(({ el, props }) => el.contains(target) && !props.disabled),
		initialFocus(content, setting = "auto", preferred) {
			if (setting === "none") return;
			if (setting === "content") return content;
			if (setting === "auto") return preferred?.() ?? composedTabbables(content)[0] ?? content;
			if (typeof setting === "function") return setting() ?? content;
			if (typeof setting === "string") return content.querySelector(setting) ?? content;
			return isBrowser && setting instanceof HTMLElement ? setting : content;
		},
		contentAttrs: (state, id, role) => ({
			"aria-labelledby": role ? state.titled ? `${id}-title` : `${id}-trigger` : void 0,
			"aria-describedby": state.described ? `${id}-description` : void 0,
			"aria-modal": (role === "dialog" || role === "alertdialog") && state.modal === true ? "true" : void 0,
			"data-presentation": preset.presentation && state.presentation
		}),
		triggerAttrs(state, id, key, props, role) {
			const haspopup = role === "menu" || role === "listbox" ? role : role && "dialog";
			return {
				...popupTriggerAttrs(state, id, haspopup ?? "", key),
				"aria-haspopup": haspopup,
				type: "button",
				...disabledTriggerAttrs(props)
			};
		}
	};
}
var nameOf = (el) => el && accessibleName(el) || void 0;
function triggerName(core) {
	return { contentAttrs: (state, id) => ({
		"aria-labelledby": state.titled !== false ? `${id}-title` : void 0,
		"aria-label": state.titled === false ? nameOf(core.triggerElement()) : void 0,
		"aria-modal": state.modal === true ? "true" : void 0
	}) };
}
var resetSelectors = /* @__PURE__ */ new Map();
var styleReset = {
	prepare(name, contentSlot) {
		const key = `${name}-${contentSlot}`;
		const known = resetSelectors.get(key) ?? [`[data-slot="${key}"]`, `[data-slot="${name}-backdrop"]`];
		resetSelectors.set(key, known);
		whenKept(() => prepareReset(known));
	},
	bind(el) {
		resetPopoverStyles(el.ownerDocument, [`[data-slot="${el.getAttribute("data-slot")}"]`]);
	}
};
// node_modules/@ui-sdk/core/dist/foundation/popups/popup-payload.js
function createPopupPayload(store, change) {
	return {
		opening(trigger, payload, details) {
			const previous = {
				trigger: store.get().trigger,
				payload: store.get().payload
			};
			if (trigger !== void 0) store.set({ trigger });
			change(payload, details);
			return () => store.set(previous);
		},
		handOver(trigger, payload, details) {
			store.set({ trigger });
			change(payload, details);
		},
		reopening(openOptions, details) {
			return "payload" in openOptions && change(openOptions.payload, details);
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/presentation.js
var loading;
var load = () => loading ??= __vitePreload(() => Promise.resolve().then(() => sheet_presentation_exports), void 0);
var matches = (query) => isBrowser && matchMedia(query).matches;
function createPresentation(store, layer, setting, fallback, dismissal) {
	const resolve = () => {
		const value2 = setting();
		const phone = value2 === "auto" && matches("(max-width: 640px) and (pointer: coarse)");
		return value2 === "sheet" || phone ? "sheet" : fallback;
	};
	const open = () => store.set({ presentation: resolve() });
	const value = setting();
	if (value === "sheet") open();
	if (isBrowser && !loading && (value === "sheet" || value === "auto" && matches("(pointer: coarse)"))) (window.requestIdleCallback ?? setTimeout)(() => load().then((sheet) => sheet.prepareVariables()));
	return {
		open,
		/** How it would present if it opened now. */
		resolve,
		bind(el, config) {
			const popup = layer();
			if (setting() === "auto" && popup.opener() === "initial" && store.get().open) queueMicrotask(open);
			if (store.get().presentation !== "sheet") return popup.bind(el, config);
			let cleanup;
			let cancelled = false;
			const hide = () => el.hidden || (el.hidden = true);
			const hidden = new MutationObserver(hide);
			const show = (present) => {
				hidden.disconnect();
				if (!cancelled) cleanup = present();
			};
			load().then(({ presentSheet }) => show(() => presentSheet(el, popup, {
				...dismissal?.sheet,
				...config
			})), () => show(() => popup.bind(el, config)));
			hide();
			hidden.observe(el, { attributeFilter: ["hidden"] });
			const unregister = registerPopupElement(el);
			return () => {
				cancelled = true;
				hidden.disconnect();
				unregister();
				cleanup?.();
			};
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/popups/popup-presets.js
function sheetPresentation(core, dismissal) {
	const dialog = core.preset.behavior === "dialog";
	if (dialog) core.store.set({ presentation: "dialog" });
	return createPresentation(core.store, () => core.popup, () => core.rules?.presentation ? core.rules.presentation() : core.options().presentation, dialog ? "dialog" : "popover", dismissal);
}
var dialogPreset = {
	payload: createPopupPayload,
	behavior: "dialog",
	role: "dialog",
	dismissal: createDismissal,
	modal: true,
	presentation: sheetPresentation,
	press: pressOpening,
	triggerName,
	resetStyles: styleReset
};
var alertDialogPreset = {
	payload: createPopupPayload,
	behavior: "dialog",
	role: "alertdialog",
	dismissal: createDismissal,
	press: pressOpening,
	triggerName,
	resetStyles: styleReset
};
// node_modules/@ui-sdk/core/dist/foundation/platform/announce.js
var announce_exports = /* @__PURE__ */ __exportAll({ announce: () => announce });
var regions = /* @__PURE__ */ new WeakMap();
var pending = {};
function regionIn(doc, priority) {
	let found = regions.get(doc);
	if (!found) regions.set(doc, found = {});
	const existing = found[priority];
	if (existing?.isConnected) return existing;
	const region = doc.createElement("div");
	region.setAttribute("role", priority === "assertive" ? "alert" : "status");
	region.setAttribute("aria-live", priority);
	region.setAttribute("aria-atomic", "true");
	region.setAttribute("data-ui-sdk-announcer", priority === "assertive" ? "assertive" : "");
	region.style.cssText = "position:fixed;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
	doc.body.append(region);
	found[priority] = region;
	return region;
}
function announce(text, { priority = "polite", doc = typeof document === "undefined" ? void 0 : document } = {}) {
	if (!text) return;
	if (!doc?.body) return;
	const region = regionIn(doc, priority);
	region.textContent = "";
	clearTimeout(pending[priority]);
	pending[priority] = setTimeout(() => {
		region.textContent = text;
	}, 100);
}
// node_modules/@ui-sdk/core/dist/foundation/lists/item-icon.js
var marks = /* @__PURE__ */ new WeakMap();
function mark(el, attribute) {
	let counts = marks.get(el);
	if (!counts) marks.set(el, counts = {});
	counts[attribute] = (counts[attribute] ?? 0) + 1;
	if (counts[attribute] === 1) el.setAttribute(attribute, "");
	return () => {
		counts[attribute]--;
		if (counts[attribute] === 0) el.removeAttribute(attribute);
	};
}
function addMirrorRule(doc) {
	writeStyle(doc, "ui-sdk-mirror", "@layer ui-sdk{:where([data-mirror][aria-hidden]){display:inline-block}:where([data-mirror][aria-hidden]:dir(rtl)){scale:-1 1}}");
}
function placeIcon(el, placement, subscribe, found) {
	let unmarkItem;
	let unmarkList;
	let unsubscribe;
	let active = true;
	const place = () => {
		const item = el.parentElement?.closest(placement.item);
		if (!item) return false;
		if (!unmarkItem) {
			unmarkItem = mark(item, "data-has-icon");
			found(item);
		}
		if (!placement.list) return true;
		const list = item.parentElement?.closest(placement.list);
		if (list) unmarkList = mark(list, "data-has-icons");
		return !!list;
	};
	const placeOnChange = () => {
		if (!place()) return;
		unsubscribe?.();
		unsubscribe = void 0;
	};
	if (!place()) queueMicrotask(() => {
		if (active && !place()) unsubscribe = subscribe(placeOnChange);
	});
	return () => {
		active = false;
		unsubscribe?.();
		unmarkItem?.();
		unmarkList?.();
	};
}
function itemIconPart(placement) {
	return {
		props: {
			mirror: "boolean",
			id: "id",
			item: {
				kind: "string",
				from: "item.value"
			}
		},
		state: (state, { props }) => ({ mirror: !!props.mirror }),
		attrs: (state, { props }) => ({
			"aria-hidden": "true",
			"data-mirror": props.mirror ? "" : void 0
		}),
		bind(el, { api, props, id, store }) {
			addMirrorRule(el.ownerDocument);
			const found = (item) => false;
			const unplace = placeIcon(el, placement, store.subscribe, found);
			const unregister = placement.register?.(el, {
				api,
				props
			});
			return () => {
				unplace();
				unregister?.();
			};
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/kernel/live.js
function live(read) {
	return {
		read,
		/**
		* Writes the attributes to `el` now and on every change the part hears.
		* Returns the cleanup, which removes them again.
		*/
		attach(part, el) {
			const channel = `live:${part.id}`;
			const write = () => applyAttrs(el, liveAttrs(part), channel);
			write();
			const unsubscribe = subscribe(part, write);
			return () => {
				unsubscribe();
				applyAttrs(el, {}, channel);
			};
		}
	};
}
var applied = /* @__PURE__ */ new WeakMap();
var found = /* @__PURE__ */ new WeakMap();
var writing;
function applyAttrs(el, attrs2, channel = "render") {
	writeAttrs(el, attrs2, channel, false);
}
function writeAttrs(el, attrs2, channel, release) {
	const outer = writing;
	writing = el;
	try {
		writeChannel(el, attrs2, channel, release);
	} finally {
		writing = outer;
	}
}
function writeChannel(el, attrs2, channel, release) {
	const channels = applied.get(el) ?? {};
	const previous = channels[channel] ?? /* @__PURE__ */ new Map();
	const written = /* @__PURE__ */ new Map();
	const styles = attrs2.style === void 0 ? [] : styleDeclarations(attrs2.style);
	for (const [property, value] of styles) written.set(`style:${property}`, value);
	for (const [name, value] of Object.entries(attrs2)) if (value !== void 0 && name !== "style") written.set(name, value);
	const id = written.has("id") || previous.has("id") ? el.getAttribute("id") : null;
	const keeps = keepsId(id, channels, channel);
	if (keeps) written.delete("id");
	const authors = /* @__PURE__ */ new Set();
	const read = /* @__PURE__ */ new Map();
	for (const name of /* @__PURE__ */ new Set([...written.keys(), ...previous.keys()])) {
		if (!authorOwned.has(name)) continue;
		const current = el.getAttribute(name);
		read.set(name, current);
		if (current === null || current === written.get(name) || name === "aria-labelledby" && madeLabel(current)) continue;
		if (!Object.values(channels).some((wrote) => wrote.get(name) === current)) authors.add(name);
	}
	for (const name of authors) written.delete(name);
	for (const name of previous.keys()) {
		if (written.has(name) || authors.has(name) || name === "id" && keeps) continue;
		if (name.startsWith("style:")) {
			el.style.removeProperty(name.slice(6));
			continue;
		}
		if (!release) {
			el.removeAttribute(name);
			keepFound(el, channel, name, null);
			continue;
		}
		const current = el.getAttribute(name);
		if (current !== previous.get(name)) continue;
		const original = found.get(el)?.[channel]?.get(name);
		if (original === void 0) el.removeAttribute(name);
		else if (current !== original) el.setAttribute(name, original);
	}
	for (const [property, value] of styles) if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
	for (const [name, value] of Object.entries(attrs2)) {
		if (value === void 0 || !written.has(name)) continue;
		const current = name === "id" ? id : read.has(name) ? read.get(name) : el.getAttribute(name);
		if (current !== (previous.get(name) ?? null)) keepFound(el, channel, name, current);
		if (current === value) continue;
		if (name === "value" && isTextField(el) && el.value !== value) el.value = value;
		el.setAttribute(name, value);
	}
	channels[channel] = written;
	applied.set(el, channels);
	if (release) delete found.get(el)?.[channel];
}
function keepFound(el, channel, name, value) {
	const kept = value == null || name === "id" ? void 0 : references.includes(name) ? authoredIds(value) : value;
	if (kept === void 0) {
		found.get(el)?.[channel]?.delete(name);
		return;
	}
	let channels = found.get(el);
	if (!channels) found.set(el, channels = {});
	(channels[channel] ??= /* @__PURE__ */ new Map()).set(name, kept);
}
var authoredIds = (ids) => ids.split(/\s+/).filter((id) => id && !id.startsWith("ui-sdk-")).join(" ") || void 0;
function keepsId(id, channels, channel) {
	if (id === null || id === channels[channel]?.get("id")) return false;
	return !id.startsWith("ui-sdk-") || Object.values(channels).some((written) => written.get("id") === id);
}
var isTextField = (el) => el.localName === "textarea" || el.localName === "input" && el.type !== "file";
function styleDeclarations(css) {
	const declarations = [];
	for (const declaration of css.split(";")) {
		const index = declaration.indexOf(":");
		if (index > 0) declarations.push([declaration.slice(0, index).trim(), declaration.slice(index + 1).trim()]);
	}
	return declarations;
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
// node_modules/@ui-sdk/core/dist/foundation/platform/button.js
function buttonElement(el) {
	if (el.tagName === "BUTTON") return "button";
	if (el.matches("a[href]")) return "link";
	return "other";
}
function opensElsewhere(event, el) {
	if (!event || !el || !(event instanceof MouseEvent) || !el.matches("a[href]")) return false;
	const target = el.getAttribute("target");
	return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || el.hasAttribute("download") || !!target && target !== "_self";
}
// node_modules/@ui-sdk/core/dist/foundation/shortcuts/shortcut-order.js
function shortcutOrder(layer, find, persistent = () => false, inPopup = () => false) {
	if (!layer) return 0;
	const el = typeof layer === "function" ? layer() : layer;
	if (!el || !el.isConnected) return null;
	if (persistent(el)) return 1e400;
	const open = find(el);
	if (open) return open.order ?? 0;
	return inPopup(el) ? null : 0;
}
function isShortcutAllowed(order, blocking) {
	if (order === null) return false;
	return blocking === void 0 || order >= blocking;
}
function isTypingIn(target) {
	if (!target || !target.tagName) return false;
	const el = target;
	if (el.isContentEditable) return true;
	if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
	if (el.tagName !== "INPUT") return false;
	const type = el.type;
	return !/^(button|checkbox|radio|submit|reset|range|color|file|image)$/.test(type);
}
// node_modules/@ui-sdk/core/dist/foundation/shortcuts/create-shortcuts.js
var keysOf = (entry) => (typeof entry.keys === "function" ? entry.keys() : entry.keys) || void 0;
function escapesLayerAbove(order) {
	const top = activeLayers().filter((layer) => (layer.el?.ownerDocument ?? document) === document).at(-1);
	return !!top?.onEscape && (top.order ?? 0) > order;
}
function normalize(keys) {
	return ariaKeyshortcuts(keys, true).split("+").sort().join("+");
}
function createShortcuts() {
	const entries = [];
	const scopes = /* @__PURE__ */ new Set();
	let next = 0;
	let off;
	function topBlocking() {
		return activeLayers().filter((layer) => layer.blocking).at(-1)?.order;
	}
	function runnable(entry, blocking) {
		const { scope, when, layer } = entry.options;
		if (scope !== void 0 && !scopes.has(scope)) return null;
		if (when && !when()) return null;
		const order = shortcutOrder(layer, findLayer, inPersistentLayer, inPopupElement);
		return isShortcutAllowed(order, blocking) ? order : null;
	}
	function onKeydown(event) {
		if (event.defaultPrevented || isComposing(event)) return;
		let context;
		let best;
		const apple = isApple();
		for (const entry of entries) {
			const keys = keysOf(entry);
			if (!keys || event.repeat && !entry.options.repeat || !matchesShortcut(event, keys, apple)) continue;
			context ??= {
				typing: isTypingIn(event.composedPath()[0]),
				blocking: topBlocking()
			};
			if (context.typing && !entry.options.allowInInput && !hasCommandModifier(keys)) continue;
			const order = runnable(entry, context.blocking);
			if (order === null) continue;
			if (!best || order > best.order || order === best.order && entry.id > best.entry.id) best = {
				entry,
				order
			};
		}
		if (!best || event.key === "Escape" && escapesLayerAbove(best.order)) return;
		event.preventDefault();
		best.entry.handler(event);
	}
	function listen() {
		if (off || !isBrowser) return;
		off = on(document, "keydown", onKeydown);
	}
	return {
		/**
		* Registers a shortcut, like `register("mod+k", openSearch)`. Keys are
		* `+`-separated: `mod` is Command on Apple platforms and Control elsewhere.
		* Returns a function that unregisters it.
		*/
		register(keys, handler, options = {}) {
			typeof keys === "string" && normalize(keys);
			const entry = {
				keys,
				handler,
				options,
				id: next++
			};
			entries.push(entry);
			listen();
			return () => {
				const index = entries.indexOf(entry);
				if (index !== -1) entries.splice(index, 1);
				if (!entries.length) {
					off?.();
					off = void 0;
				}
			};
		},
		/** The shortcuts that would run now, oldest first, formatted for this platform. For a help screen. */
		list() {
			const blocking = isBrowser ? topBlocking() : void 0;
			const apple = isApple();
			return entries.filter((entry) => !!keysOf(entry) && runnable(entry, blocking) !== null).map((entry) => ({
				keys: keysOf(entry),
				hint: formatShortcut(keysOf(entry), apple),
				ariaKeyshortcuts: ariaKeyshortcuts(keysOf(entry), apple),
				description: entry.options.description,
				scope: entry.options.scope
			}));
		},
		/** Turns a named scope on or off. Shortcuts registered with that `scope` run only while it's on. */
		setScope(name, active) {
			if (active) scopes.add(name);
			else scopes.delete(name);
		},
		/** Whether a named scope is on. */
		isScopeActive: (name) => scopes.has(name),
		/** Unregisters every shortcut and stops listening. */
		destroy() {
			entries.length = 0;
			scopes.clear();
			off?.();
			off = void 0;
		}
	};
}
// node_modules/@ui-sdk/core/dist/foundation/shortcuts/shortcuts.js
var shortcuts = globalThis[/* @__PURE__ */ Symbol.for("ui-sdk.shortcuts@1")] ??= createShortcuts();
exposeShortcuts(() => shortcuts.list());
// node_modules/@ui-sdk/core/dist/foundation/shortcuts/shortcut-slot.js
function shortcutText(shortcut, apple) {
	return shortcut ? formatShortcut(shortcut, apple) : "";
}
function adoptPlatform(store) {
	queueMicrotask(() => store.get().apple !== isApple() && store.set({ apple: isApple() }));
}
function bindPartShortcut(keys, handler, options, onProps) {
	let current;
	let off;
	const update = () => {
		const next = keys() || void 0;
		if (next === current) return;
		off?.();
		current = next;
		off = next ? shortcuts.register(next, handler, options) : void 0;
	};
	update();
	const unwatch = onProps(update);
	return () => {
		unwatch();
		off?.();
	};
}
function shortcutOf(context, slot, el, { beside = false } = {}) {
	return elements(context, slot).find((entry) => entry.el.contains(el) || beside && !!el.parentElement?.contains(entry.el))?.props?.shortcut;
}
function shortcutSlot(slot, inherited) {
	return slot({
		props: { shortcut: "string" },
		state: (state, { props, api }) => ({ text: shortcutText(props.shortcut ?? inherited(state, api), state.apple) }),
		attrs: () => ({
			"aria-hidden": "true",
			translate: "no"
		}),
		bind(el, { store, api, props }) {
			adoptPlatform(store);
			if (el.childNodes.length) return;
			const write = () => {
				const state = store.get();
				el.textContent = shortcutText(props.shortcut ?? inherited(state, api, el), state.apple);
			};
			write();
			const off = store.subscribe(write);
			return () => {
				off();
				el.textContent = "";
			};
		}
	});
}
// node_modules/@ui-sdk/core/dist/foundation/number/steps.js
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}
// node_modules/@ui-sdk/core/dist/foundation/number/format.js
var formatters = /* @__PURE__ */ new Map();
function numberFormatter(locale, options = {}) {
	const key = `${locale ?? ""}|${JSON.stringify(options)}`;
	let formatter = formatters.get(key);
	if (!formatter) {
		formatter = new Intl.NumberFormat(locale, options);
		formatters.set(key, formatter);
	}
	return formatter;
}
function formatNumber(value, locale, format) {
	if (value === null || !Number.isFinite(value)) return "";
	if (typeof format === "function") return format(value);
	const formatter = numberFormatter(locale, format);
	const text = formatter.format(value);
	if (value < 0 && !formatter.formatToParts(value).some((part) => part.type === "integer")) {
		const parts = formatter.formatToParts(-3);
		const sign = parts.findIndex((part) => part.type === "minusSign");
		return `${parts.slice(0, sign + 1).map((part) => part.value).join("")}${text}`;
	}
	return text;
}
// node_modules/@ui-sdk/react/dist/render-element.js
function prevented(event) {
	const handled = event;
	return !!(handled?.isDefaultPrevented?.() ?? handled?.defaultPrevented);
}
function mergeProps(...sources) {
	const result = {};
	for (const source of sources) for (const key in source) {
		const value = source[key];
		if (value === void 0) continue;
		const earlier = result[key];
		if (earlier === void 0) result[key] = value;
		else if (key === "className" && earlier) result.className = `${earlier} ${value}`;
		else if (key === "style" && earlier) result.style = mergeStyles(earlier, value);
		else if (key === "ref" && earlier) result.ref = mergeRefs(earlier, value);
		else if (/^on[A-Z]/.test(key) && typeof earlier === "function" && typeof value === "function") result[key] = (...args) => {
			value(...args);
			if (!prevented(args[0])) earlier(...args);
		};
		else result[key] = value;
	}
	return result;
}
function mergeStyles(earlier, later) {
	if (typeof earlier !== "function" && typeof later !== "function") return {
		...earlier,
		...later
	};
	const resolve = (style, state) => typeof style === "function" ? style(state) : style;
	return (state) => ({
		...resolve(earlier, state),
		...resolve(later, state)
	});
}
var mergedRefs = /* @__PURE__ */ new WeakMap();
function setRef(ref, el) {
	if (typeof ref === "function") return ref(el);
	if (ref) ref.current = el;
}
function mergeRefs(a, b) {
	if (!a || !b) return a ?? b;
	let inner = mergedRefs.get(a);
	if (!inner) mergedRefs.set(a, inner = /* @__PURE__ */ new WeakMap());
	let merged = inner.get(b);
	if (!merged) {
		merged = (el) => {
			const cleanups = [setRef(a, el), setRef(b, el)];
			return () => cleanups.forEach((cleanup, index) => typeof cleanup === "function" ? cleanup() : setRef(index ? b : a, null));
		};
		inner.set(b, merged);
	}
	return merged;
}
function resolveLazy(render) {
	let value = render;
	let lazy = value;
	while (lazy?.$$typeof === /* @__PURE__ */ Symbol.for("react.lazy")) {
		value = lazy._init(lazy._payload);
		lazy = value;
	}
	return value;
}
function renderElement(tag, props, render, state = {}) {
	if (typeof props.className === "function") props = {
		...props,
		className: props.className(state)
	};
	if (typeof props.style === "function") props = {
		...props,
		style: props.style(state)
	};
	if (typeof props.children === "function") props = {
		...props,
		children: props.children(state)
	};
	if (typeof render === "function") return render(props, state);
	const element = resolveLazy(render);
	if (element) return import_react.cloneElement(element, mergeProps(props, element.props));
	return import_react.createElement(tag, props);
}
// node_modules/@ui-sdk/react/dist/use-primitive.js
var camelCase = (names, prefix = "") => Object.fromEntries(names.split(" ").map((name) => [name.toLowerCase(), prefix + name]));
var propNames = {
	class: "className",
	for: "htmlFor",
	checked: "defaultChecked",
	.../* @__PURE__ */ camelCase("tabIndex readOnly inputMode enterKeyHint autoComplete autoCapitalize autoCorrect spellCheck contentEditable maxLength minLength")
};
var booleans = /* @__PURE__ */ new Set([
	"hidden",
	"disabled",
	"readonly",
	"required",
	"inert",
	"checked",
	"multiple"
]);
var styles = /* @__PURE__ */ new Map();
function styleObject(css) {
	let style = styles.get(css);
	if (style) return style;
	style = {};
	for (const declaration of css.split(";")) {
		const index = declaration.indexOf(":");
		if (index === -1) continue;
		const name = declaration.slice(0, index).trim();
		style[name.startsWith("--") ? name : name.replace(/-(\w)/g, (_, char) => char.toUpperCase())] = declaration.slice(index + 1).trim();
	}
	if (styles.size >= 500) styles.clear();
	styles.set(css, style);
	return style;
}
var eventProps = /* @__PURE__ */ Object.assign(/* @__PURE__ */ camelCase("Click KeyDown KeyUp ContextMenu PointerDown MouseDown PointerUp PointerMove", "on"), {
	dblclick: "onDoubleClick",
	focusin: "onFocus",
	focusout: "onBlur",
	input: "onChange",
	submit: "onSubmit"
});
var host = {
	by: "framework",
	attaches: /* @__PURE__ */ Object.keys(eventProps)
};
function toReactProps(attrs2) {
	const props = {};
	for (const name in attrs2) {
		const value = attrs2[name];
		if (value === void 0) continue;
		props[propNames[name] ?? name] = booleans.has(name) ? true : name === "style" ? styleObject(value) : value;
	}
	return props;
}
function usePrimitive(primitive, options) {
	const id = `ui-sdk-${import_react.useId()}`;
	const create = (from = {}) => unwatched(() => primitive({
		...options,
		...from,
		controller: void 0,
		id
	}));
	const [instance, setInstance] = import_react.useState(() => create());
	import_react.useLayoutEffect(() => keep(instance), [instance]);
	const next = {
		...options,
		id
	};
	const outers = outersOf(options);
	const base = instance.get();
	const state = within(outers, () => instance.preview(next));
	const preview = state && {
		options: next,
		outers,
		base,
		state,
		handed: false,
		pending: /* @__PURE__ */ new Set()
	};
	import_react.useLayoutEffect(() => {
		handOver(instance, next, preview, outers);
	});
	const life = import_react.useRef({
		mounted: 0,
		destroyed: false
	});
	import_react.useEffect(() => {
		const own = life.current;
		own.mounted++;
		hidden.delete(instance);
		owners?.unregister(own);
		if (own.destroyed) {
			own.destroyed = false;
			setInstance(create(carried(primitive, instance, options)));
		}
		return () => {
			own.mounted--;
			queueMicrotask(() => {
				if (own.mounted || own.destroyed) return;
				release(instance);
				const leave = () => {
					own.destroyed = true;
					instance.destroy();
				};
				if (!anchors.has(instance)) owners?.register(own, instance, own);
				else if (inPage(instance)) hide$1(instance, leave);
				else leave();
			});
		};
	}, [instance]);
	import_react.useEffect(() => runBindWrites());
	const stable = import_react.useMemo(() => {
		return {
			primitive,
			instance,
			get state() {
				return stateIn(this);
			},
			get api() {
				return instance.api;
			}
		};
	}, [instance]);
	if (!preview) return stable;
	const previewing = extendHandle(stable, {});
	previews.set(previewing, preview);
	return previewing;
}
var previews = /* @__PURE__ */ new WeakMap();
var handing;
function handOver(instance, options, preview, outers) {
	if (preview) preview.handed = true;
	const outer = handing;
	handing = preview;
	try {
		within(outers, () => instance.setOptions(options));
	} finally {
		handing = outer;
	}
}
var readers = /* @__PURE__ */ new WeakMap();
function outersOf(options) {
	let outers;
	for (const key in options) {
		const outer = readers.get(options[key]);
		if (outer) (outers ??= []).push(outer);
	}
	return outers;
}
function within(outers, read) {
	if (!outers) return read();
	let run = read;
	for (const outer of outers) {
		const inner = run;
		run = () => readIn(outer, inner);
	}
	return run();
}
function extendHandle(handle, extra) {
	const copy = Object.defineProperties({}, {
		...Object.getOwnPropertyDescriptors(handle),
		...Object.getOwnPropertyDescriptors(extra),
		state: {
			get: () => stateIn(copy),
			enumerable: true
		}
	});
	const preview = previews.get(handle);
	if (preview) previews.set(copy, preview);
	return copy;
}
function presentIn(handle, name, props) {
	const part = handle.instance.part(name, props);
	return readIn(handle, (showing) => present(part, part.props, showing));
}
function slotIn(handle, name, props, user = {}) {
	const part = handle.instance.part(name, props);
	return readIn(handle, (showing) => elementProps(part, part.props, user, showing));
}
function stateIn(handle) {
	const { instance } = handle;
	const current = instance.get();
	const preview = previews.get(handle);
	if (!preview || preview.handed) return current;
	if (preview.base !== current) {
		preview.base = current;
		preview.state = within(preview.outers, () => instance.preview(preview.options));
	}
	return preview.state ?? current;
}
function readIn(handle, read, around) {
	const state = stateIn(handle);
	if (state === handle.instance.get() && !around) return read(state);
	return handle.instance.view(state, () => read(state), around);
}
var anchors = /* @__PURE__ */ new WeakMap();
var inPage = (instance) => !!anchors.get(instance)?.isConnected;
var owners = typeof FinalizationRegistry === "undefined" ? void 0 : new FinalizationRegistry((instance) => instance.destroy());
var hidden = /* @__PURE__ */ new Map();
var sweeping;
function hide$1(instance, leave) {
	hidden.set(instance, leave);
	sweeping ??= setInterval(() => {
		for (const [instance2, leave2] of hidden) {
			if (inPage(instance2)) continue;
			hidden.delete(instance2);
			leave2();
		}
		if (hidden.size) return;
		clearInterval(sweeping);
		sweeping = void 0;
	}, 1e3);
}
function carried(primitive, instance, options) {
	const schema = schemaOf(primitive).options;
	const state = instance.get();
	const defaults = {};
	for (const key in state) {
		const fallback = `default${key[0].toUpperCase()}${key.slice(1)}`;
		if (fallback in schema && options[key] === void 0) defaults[fallback] = state[key];
	}
	return defaults;
}
var heldRefs = /* @__PURE__ */ new WeakMap();
function heldRef(part) {
	let held = heldRefs.get(part);
	if (held) return held;
	const bindTo = ref(part, host);
	let releasing = false;
	held = (el) => {
		releasing = !el;
		if (el) return bindTo(el);
		queueMicrotask(() => {
			if (releasing) bindTo(null);
		});
	};
	heldRefs.set(part, held);
	return held;
}
function elementProps(part, props, user, state) {
	takeOwnId(part, user.id);
	const handlers$1 = {};
	for (const [type, handler] of Object.entries(handlers(part))) {
		const prop = eventProps[type];
		if (!prop) continue;
		handlers$1[prop] = (event) => {
			handler(event.nativeEvent);
			if (event.nativeEvent.defaultPrevented && !event.isDefaultPrevented()) event.preventDefault();
		};
	}
	return mergeProps(handlers$1, user, toReactProps(yieldToAuthor(attrs(part, props, state), (name) => user[propNames[name] ?? name] != null)), {
		id: user.id,
		ref: heldRef(part)
	});
}
function sameAttrs(a, b, skip = []) {
	const keys = Object.keys(a);
	return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key] || skip.includes(key));
}
var rechecks = /* @__PURE__ */ new WeakMap();
function changesValues(before, after) {
	for (const key in {
		...before,
		...after
	}) {
		if (typeof before[key] === "function" && typeof after[key] === "function") continue;
		if (!sameValue(before[key], after[key])) return true;
	}
	return false;
}
function usePartState(handle, name, props, around) {
	const { instance } = handle;
	const [, rerender] = import_react.useReducer((count) => count + 1, 0);
	const part = instance.part(name, props, true);
	const rendered = readIn(handle, (showing) => ({
		handle,
		around,
		props,
		snapshot: partState(part, props, showing),
		read: /* @__PURE__ */ new Set(),
		attrs: attrs(part, props, showing),
		present: present(part, props, showing),
		version: renderVersion(instance)
	}), around);
	const state = new Proxy(rendered.snapshot, { get(target, key) {
		if (typeof key === "string") rendered.read.add(key);
		return target[key];
	} });
	const last = import_react.useRef(rendered);
	const preview = previews.get(handle);
	if (preview && !preview.handed) preview.pending.add(last);
	const check = import_react.useCallback((full, props2 = false) => {
		const shown = last.current;
		if (readIn(shown.handle, (now) => {
			if (shown.read.size) {
				const next = partState(part, shown.props, now);
				for (const key of shown.read) {
					if (sameSlotState(next[key], shown.snapshot[key])) continue;
					shown.snapshot = next;
					return true;
				}
			}
			const shows = present(part, shown.props, now);
			if (shows !== shown.present) return true;
			if (renderVersion(instance) === shown.version && !props2) return false;
			shown.version = renderVersion(instance);
			return shows && !sameAttrs(attrs(part, shown.props, now), shown.attrs, full ? void 0 : directNames(part));
		}, shown.around)) rerender();
	}, [instance, part]);
	import_react.useLayoutEffect(() => {
		const changed = part.props !== props && changesValues(part.props, props);
		commit(part, props);
		preview?.pending.delete(last);
		if (part.el && !inPage(instance)) anchors.set(instance, part.el);
		last.current = rendered;
		check(true);
		if (changed) rechecks.get(instance)?.forEach((recheck) => recheck());
	});
	const selected = selectedKeys(part, props);
	import_react.useLayoutEffect(() => {
		const recheck = () => check(true, true);
		let all = rechecks.get(instance);
		if (!all) rechecks.set(instance, all = /* @__PURE__ */ new Set());
		all.add(recheck);
		const unsubscribe = subscribe(part, () => {
			if (!handing?.pending.has(last)) check(false);
		}, last.current.props);
		return () => {
			all.delete(recheck);
			unsubscribe();
		};
	}, [
		part,
		selected,
		check
	]);
	return state;
}
var kindOf = (spec) => typeof spec === "object" ? spec.kind : spec;
var fromOf = (spec, key) => {
	if (typeof spec !== "object") return;
	const [slot, prop = key] = spec.from.split(".");
	return {
		slot,
		prop
	};
};
var pascal = (name) => name.replace(/(^|-)(\w)/g, (_, _dash, char) => char.toUpperCase());
function split(props, schema) {
	const named = {};
	const rest = {};
	for (const key in props) (key in schema ? named : rest)[key] = props[key];
	return [named, rest];
}
var scopes = /* @__PURE__ */ new WeakMap();
function scopeOf(primitive) {
	let scope = scopes.get(primitive);
	if (!scope) scopes.set(primitive, scope = {
		context: import_react.createContext(null),
		provides: /* @__PURE__ */ new Set(),
		keyed: /* @__PURE__ */ new Set()
	});
	return scope;
}
function HandleScope({ handle, children }) {
	const { context } = scopeOf(handle.primitive);
	const scope = import_react.useMemo(() => ({
		handle,
		around: {}
	}), [handle]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(context.Provider, {
		value: scope,
		children
	});
}
function useNearest(primitive) {
	return import_react.useContext(scopeOf(primitive).context)?.handle;
}
function useHandle(primitive) {
	const handle = useNearest(primitive);
	if (!handle) throw new Error(`The ${primitive.name} parts must be used inside their root.`);
	return handle;
}
function usePart(handle, slot, slotProps, props = {}, tag = "div") {
	const primitive = typeof handle === "function" ? handle : handle.primitive;
	const { context, provides, keyed } = scopeOf(primitive);
	const scope = import_react.useContext(context);
	const owner = typeof handle === "function" ? scope?.handle : handle;
	if (!owner) throw new Error(`The ${primitive.name} ${slot} part must be used inside its root.`);
	const { render, ...rest } = props;
	const own = import_react.useMemo(() => ({
		handle: owner,
		around: {}
	}), [owner]);
	const inside = scope?.handle === owner ? scope : own;
	const around = keyed.has(slot) ? {
		...slotProps,
		value: slotProps.id
	} : slotProps;
	const provided = provides.has(slot) ? {
		handle: owner,
		around: {
			...inside.around,
			[slot]: around
		},
		shown: {
			...inside.shown,
			[slot]: slotProps
		}
	} : inside;
	const state = usePartState(owner, slot, slotProps, provided.shown);
	const part = owner.instance.part(slot, slotProps, true);
	import_react.useLayoutEffect(() => () => ref(part, host)(null), [part]);
	const merged = readIn(owner, (showing) => {
		if (!present(part, slotProps, showing)) return;
		const rendered = resolveLazy(render);
		const renderId = import_react.isValidElement(rendered) ? rendered.props.id : void 0;
		const user = renderId === void 0 ? rest : {
			...rest,
			id: renderId
		};
		return elementProps(part, slotProps, user, showing);
	}, provided.shown);
	const element = merged ? renderElement(tag, merged, render, state) : null;
	if (provided === scope) return element;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(context.Provider, {
		value: provided,
		children: element
	});
}
function createParts(primitive, tags) {
	const schema = schemaOf(primitive);
	const { context, provides, keyed } = scopeOf(primitive);
	for (const [slot, props] of Object.entries(schema.slots)) for (const key in props) {
		const from = fromOf(props[key], key);
		if (from) provides.add(from.slot);
		if (kindOf(props[key]) === "key") keyed.add(slot);
	}
	const name = pascal(primitive.name ?? "");
	const parts = {};
	function Root(props) {
		const [options, rest] = split(props, schema.options);
		const handle = usePrimitive(primitive, options);
		if (tags.root) return usePart(handle, "root", ...split(rest, schema.slots.root ?? {}), tags.root);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HandleScope, {
			handle,
			children: props.children
		});
	}
	Root.displayName = name;
	parts.Root = Root;
	for (const [slot, tag] of Object.entries(tags)) {
		if (slot === "root") continue;
		const own = schema.slots[slot] ?? {};
		const ids = Object.keys(own).filter((key2) => kindOf(own[key2]) === "id");
		const key = Object.keys(own).find((key2) => kindOf(own[key2]) === "key");
		const Part = (props) => {
			const [slotProps, rest] = split(props, own);
			if (props.id !== void 0) rest.id = props.id;
			for (const key2 of ids) {
				const id = import_react.useId();
				slotProps[key2] ??= id;
			}
			const scope = import_react.useContext(context);
			if (key) slotProps.id ??= scope?.handle.api?.internal.keyOf(slotProps[key]);
			for (const prop in own) {
				const spec = own[prop];
				const from = fromOf(spec, prop);
				if (!from || slotProps[prop] !== void 0) continue;
				const around = scope?.around[from.slot];
				if (!around && spec.required) throw new Error(`<${Part.displayName}> must be used inside <${name}${pascal(from.slot)}>.`);
				slotProps[prop] = around?.[from.prop];
			}
			return usePart(primitive, slot, slotProps, rest, tag);
		};
		Part.displayName = name + pascal(slot);
		parts[pascal(slot)] = Part;
	}
	return parts;
}
// node_modules/@ui-sdk/react/dist/field-context.js
var FieldContext = import_react.createContext(null);
var noop = () => () => {};
var zero = () => 0;
function useFieldControl(own) {
	return useJoinField(import_react.useContext(FieldContext), own);
}
function useJoinField(field, own) {
	const version = field ? () => renderVersion(field.instance) : zero;
	import_react.useSyncExternalStore(field ? field.instance.subscribe : noop, version, version);
	if (!field) return null;
	return {
		name: field.name,
		disabled: field.disabled,
		props: (props) => {
			const label = props["aria-labelledby"];
			const merged = slotIn(field, "control", {
				id: (own ?? props).id,
				describedBy: props["aria-describedby"]
			}, {
				...props,
				id: void 0,
				"aria-labelledby": madeLabel(label) ? void 0 : label
			});
			return {
				...merged,
				"aria-labelledby": merged["aria-labelledby"] ?? label,
				"data-slot": props["data-slot"]
			};
		}
	};
}
function ownDescription(props, render) {
	const rendered = resolveLazy(render);
	const own = import_react.isValidElement(rendered) ? rendered.props["aria-describedby"] : void 0;
	if (own === void 0 || !import_react.isValidElement(rendered)) return [props, rendered];
	const element = import_react.cloneElement(rendered, { "aria-describedby": void 0 });
	return [{
		...props,
		"aria-describedby": own
	}, element];
}
function controlRender(field, tag, render, after) {
	if (!field && !after) return render;
	return (props, state) => {
		const [own, element] = field ? ownDescription(props, render) : [props, render];
		return import_react.createElement(import_react.Fragment, null, renderElement(tag, field ? field.props(own) : own, element, state), after);
	};
}
// node_modules/@ui-sdk/react/dist/segmented-control.js
var parts$4 = createParts(segmentedControl, { indicator: "span" });
function SegmentedControl({ value, defaultValue, onValueChange, disabled, readOnly, required, name, form, loop, orientation, controller, debug, render, ...props }) {
	const field = useJoinField(import_react.useContext(FieldContext));
	return usePart(usePrimitive(segmentedControl, {
		value,
		defaultValue,
		onValueChange,
		disabled: disabled || field?.disabled,
		readOnly,
		required,
		name: name ?? field?.name,
		form,
		loop,
		orientation,
		controller,
		debug
	}), "root", {}, {
		...props,
		render: controlRender(field, "div", render)
	});
}
function SegmentedControlInput(props) {
	return usePart(segmentedControl, "input", props, {}, "input");
}
function SegmentedControlItem({ value, disabled, render, ...props }) {
	const input = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SegmentedControlInput, {
		value,
		disabled
	});
	return usePart(segmentedControl, "item", {
		value,
		disabled
	}, {
		...props,
		render: controlRender(null, "button", render, input)
	}, "button");
}
var SegmentedControlIndicator = parts$4.Indicator;
// node_modules/@ui-sdk/core/dist/foundation/platform/keyboard.js
var pageZoom = /* @__PURE__ */ new WeakMap();
function keyboardInset(view, size, keyboard) {
	const covered = Math.max(0, size.layoutHeight - size.offsetTop - size.height);
	if (Math.abs(size.height - size.layoutHeight) <= 1) pageZoom.set(view, size.scale);
	if (keyboard > 0) return Math.round(Math.min(keyboard, covered));
	return size.scale > (pageZoom.get(view) ?? 1) + .01 ? 0 : Math.round(covered);
}
function trackKeyboard(el, onChange) {
	const view = el.ownerDocument.defaultView;
	const viewport = view?.visualViewport;
	if (!view || !viewport) return () => {};
	let current = null;
	const apply = (size) => {
		const inset = keyboardInset(view, size, 0);
		const changed = current !== null && inset !== current;
		current = inset;
		if (changed) onChange?.before();
		el.style.setProperty("--keyboard-inset", `${inset}px`);
		el.style.setProperty("--visual-viewport-height", `${Math.round(size.height)}px`);
		if (inset > 0) el.setAttribute("data-keyboard", "");
		else el.removeAttribute("data-keyboard");
		if (changed) onChange?.after();
	};
	const measured = early.get(view);
	apply(measured && measured.layoutHeight - measured.offsetTop - measured.height <= 1 ? measured : measureViewport(view, viewport));
	const stop = followViewport(view, viewport, apply);
	return () => {
		stop();
		el.style.removeProperty("--keyboard-inset");
		el.style.removeProperty("--visual-viewport-height");
		el.removeAttribute("data-keyboard");
	};
}
function measureViewport(view, viewport) {
	return {
		width: viewport.width,
		layoutHeight: view.innerHeight,
		height: viewport.height,
		offsetTop: viewport.offsetTop,
		scale: viewport.scale
	};
}
var followersByViewport = /* @__PURE__ */ new WeakMap();
function shareViewport(view, viewport) {
	const followers = /* @__PURE__ */ new Set();
	const measure = (event) => {
		const size = measureViewport(view, viewport);
		for (const follow of followers) follow(size, event);
	};
	viewport.addEventListener("resize", measure);
	viewport.addEventListener("scroll", measure);
	const stop = () => {
		viewport.removeEventListener("resize", measure);
		viewport.removeEventListener("scroll", measure);
		followersByViewport.delete(viewport);
	};
	const shared = {
		followers,
		stop
	};
	followersByViewport.set(viewport, shared);
	return shared;
}
function followViewport(view, viewport, follower) {
	const { followers, stop } = followersByViewport.get(viewport) ?? shareViewport(view, viewport);
	followers.add(follower);
	return () => {
		if (followers.delete(follower) && !followers.size) stop();
	};
}
var early = /* @__PURE__ */ new WeakMap();
function measureViewportEarly(view) {
	const viewport = view?.visualViewport;
	if (!view || !viewport || early.has(view)) return;
	early.set(view, measureViewport(view, viewport));
	setTimeout(() => early.delete(view));
}
// node_modules/@ui-sdk/core/dist/components/dialog/dialog-api.js
var dialogLayers = /* @__PURE__ */ new WeakMap();
var ownContent = [
	"[data-slot=\"dialog-content\"]",
	"[data-slot=\"alert-dialog-content\"]",
	"[data-slot=\"drawer-content\"]"
].join(",");
var closesWhilePending = [
	"imperative",
	"action",
	"parent-close"
];
function dialogRefusal(reason, policy) {
	const dismissal = isDismissal(reason);
	if (!(policy.pending && !closesWhilePending.includes(reason) || dismissal && (!policy.dismissible || reason === "outside-press" && !policy.outsidePress))) return;
	return dismissal && !(reason === "outside-press" && policy.beside) ? "attempt" : "silent";
}
function resolveElements(list) {
	if (!list || !isBrowser) return [];
	if (typeof list === "function") return list();
	return list.flatMap((item) => typeof item === "string" ? Array.from(document.querySelectorAll(item)) : [item]);
}
function dialogApiBody(context, alert, extra = {}) {
	const { store, element } = context;
	const options = context.options;
	announcePending(context, () => store.get().pending !== null);
	const modal = () => store.get().modal;
	let session = 0;
	const closesOnOutsidePress = () => !alert && (options().closeOnOutsidePress ?? modal() !== false);
	let parent;
	const children = /* @__PURE__ */ new Set();
	function restack() {
		const stack = children.size ? Math.max(...[...children].map((child) => child.stack() + 1)) : 0;
		if (stack === store.get().stack) return;
		store.set({ stack });
		parent?.add(nesting);
	}
	const nesting = {
		close: (reason) => control.hide({ reason }),
		stack: () => store.get().stack,
		add(child) {
			children.add(child);
			restack();
		},
		remove(child) {
			children.delete(child);
			restack();
		}
	};
	const popup = createPopup(context, {
		preset: extra.preset ?? alertDialogPreset,
		role: alert ? "alertdialog" : "dialog",
		rules: (core) => ({
			persistent: () => resolveElements(options().persistentElements),
			onEscape(event) {
				if (modal() === false && !core.popup.element()?.contains(activeElement())) return;
				core.control.hide({
					reason: "escape-key",
					event
				});
			},
			onShow(layer) {
				dialogLayers.set(layer, nesting);
				parent = void 0;
				for (let up = layer.parent; up && !parent; up = up.parent) parent = dialogLayers.get(up);
				parent?.add(nesting);
				store.set({ nested: !!parent });
				const cleanup = extra.onShow?.(layer);
				return () => {
					cleanup?.();
					dialogLayers.delete(layer);
				};
			},
			onOpenChange(open) {
				extra.onOpenChange?.(open);
				if (open) {
					if (isBrowser) {
						const doc = core.triggerElement()?.ownerDocument ?? document;
						if (modal() === true) measureScrollerEarly(doc);
						measureViewportEarly(doc.defaultView);
					}
					return;
				}
				session++;
				store.set({ pending: null });
				for (const child of [...children]) child.close("parent-close");
				parent?.remove(nesting);
				parent = void 0;
			},
			open(_, open) {
				store.set({ errors: {} });
				open();
			},
			refusal: (reason) => dialogRefusal(reason, {
				dismissible: options().dismissible !== false,
				outsidePress: closesOnOutsidePress(),
				pending: store.get().pending !== null,
				beside: modal() !== true && !alert
			}),
			refused: (reason) => extra.onRefuse?.(reason),
			dismiss(reason, details) {
				if (!extra.intercept?.(reason, details.event)) core.control.hide({
					reason,
					...details
				});
			},
			preferredFocus() {
				const auto = core.popup.element()?.querySelector("[autofocus], [data-autofocus]");
				if (auto && isTabbable(auto)) return auto;
				if (alert) return elements(context, "close").find(({ el }) => isTabbable(el))?.el;
			},
			bind: extra.bind
		})
	});
	const { control } = popup.internal;
	function closePress(key, props, event) {
		if (!store.get().open || store.get().pending !== null) return;
		const action = props.action;
		if (!action) return control.hide({
			reason: "close-press",
			event,
			returnValue: props.value
		});
		const { [key]: _, ...errors } = store.get().errors;
		store.set({ errors });
		const source = changeSource("action", event);
		let waited = false;
		const started = session;
		runAction((details) => action(event, details), source, {
			pending(pending) {
				if (started !== session) return;
				waited = true;
				store.set({ pending: pending ? key : null });
				log(context, "pending", pending, {
					reason: "action",
					source
				});
			},
			done() {
				if (started !== session) return;
				control.hide({
					reason: "action",
					event: waited ? void 0 : event,
					returnValue: props.value
				});
			},
			failed: (error) => {
				if (started !== session) return;
				store.set({ errors: {
					...store.get().errors,
					[key]: error
				} });
				log(context, "error", error, {
					reason: "action",
					source
				});
			}
		});
	}
	function shortcutPress(key, event) {
		const props = context.props("trigger", key) ?? {};
		if (props.disabled) return;
		if (store.get().open) return control.hide({
			reason: "shortcut",
			event
		});
		control.show({
			event,
			by: "keyboard",
			reason: "shortcut",
			trigger: key,
			payload: props.payload
		});
	}
	return {
		...popup,
		internal: Object.assign(popup.internal, {
			options,
			show: control.show,
			hide: control.hide,
			takeOver: control.takeOver,
			alert,
			initialFocus: () => {
				const { press, popup: layer, contentProps, rules } = popup.internal;
				return press.initialFocus(layer.element(), contentProps().initialFocus, rules?.preferredFocus);
			},
			closePress,
			shortcutPress,
			shortcutOf: (el) => shortcutOf(context, "trigger", el, { beside: true }),
			backdropElement: () => element("backdrop")
		})
	};
}
var dialogApi = dialogApiBody;
// node_modules/@ui-sdk/core/dist/foundation/popups/popup-slots.js
function triggerKeydown(internal, event, el, key, props) {
	if (internal.press?.keydown(event, el, key, props) || internal.focus?.keydown(event)) return;
	internal.popup.triggerKeydown(event);
}
function bindPopupContent(el, internal, key, part) {
	const { preset, control, contentProps, triggerElement, element, popup, press, rules, presentation } = internal;
	const { placement } = preset;
	preset.resetStyles?.bind(el);
	const inline = !!contentProps(key).inline;
	return (presentation ?? popup).bind(el, {
		inline,
		anchor: () => control.anchor() ?? placement?.anchor(el, contentProps().anchor, triggerElement),
		position: placement && !inline ? () => placement.options(contentProps(key), {
			side: preset.side,
			align: "center"
		}, element("arrow")) : void 0,
		rendered: part && ((listener) => onProps(part, listener)),
		initialFocus: press && (() => press.initialFocus(popup.element(), contentProps().initialFocus, rules?.preferredFocus)),
		backdrop: () => element("backdrop"),
		...rules?.bind?.()
	});
}
function bindTrigger(store, key) {
	if (store.get().trigger === null) store.set({ trigger: key });
	return () => {
		if (store.get().trigger === key && !store.get().open) store.set({ trigger: null });
	};
}
function popupTrigger(slot) {
	return slot({
		props: {
			id: "id",
			disabled: "boolean",
			focusableWhenDisabled: "boolean",
			payload: "value"
		},
		state: (state, { key, props }) => ({
			open: state.open && (state.trigger === null || state.trigger === key),
			disabled: !!props.disabled
		}),
		attrs: (state, { id, key, props, api }) => {
			const { press, focus, role } = api.internal;
			return (press ?? focus)?.triggerAttrs(state, id, key, props, role) ?? {};
		},
		on: {
			pointerenter: (event, { api, key, props }) => !props.disabled && api.internal.hover?.enter(event, key, props.payload),
			pointerleave: (event, { api }) => api.internal.hover?.leave(event),
			focusin: (event, { api, key, props }) => !props.disabled && api.internal.focus?.enter(key, props.payload, event),
			focusout: (event, { api }) => api.internal.focus?.leave(event),
			keydown: (event, { api, el, key, props }) => el && triggerKeydown(api.internal, event, el, key, props)
		},
		press: ({ api, key, props }, event) => api.internal.press?.press(key, props, event),
		bind(el, { api, key, id, store }) {
			return bindTrigger(store, key);
		}
	});
}
function popupViewport(slot) {
	return slot({ present: (state) => state.presentation === "sheet" });
}
function popupTitle(slot) {
	return slot({
		attrs: (state, { id }) => ({ id: `${id}-title` }),
		bind: (el, { store }) => flagWhileBound(store, "titled", { now: true })
	});
}
function popupDescription(slot) {
	return slot({
		attrs: (state, { id }) => ({ id: `${id}-description` }),
		bind: (el, { store }) => flagWhileBound(store, "described", { now: true })
	});
}
// node_modules/@ui-sdk/core/dist/components/dialog/dialog-parts.js
function dialogSlots(slot, { name }) {
	const trigger = popupTrigger(slot);
	return {
		trigger: slot({
			props: {
				id: "id",
				disabled: "boolean",
				focusableWhenDisabled: "boolean",
				payload: "value",
				shortcut: "string"
			},
			state: trigger.state,
			attrs: (state, part) => ({
				...trigger.attrs(state, part),
				...state.modal === true && { "aria-expanded": void 0 },
				"aria-keyshortcuts": part.props.shortcut ? ariaKeyshortcuts(part.props.shortcut, state.apple) : void 0
			}),
			on: trigger.on,
			press: trigger.press,
			bind(el, part) {
				const { key, store, api } = part;
				const unbind = trigger.bind(el, part);
				adoptPlatform(store);
				const offShortcut = bindPartShortcut(() => part.props.shortcut, (event) => api.internal.shortcutPress(key, event), { layer: el }, (listener) => onProps(part, listener));
				return () => {
					offShortcut();
					unbind?.();
				};
			}
		}),
		backdrop: slot({
			state: (state) => ({
				open: state.open,
				nested: state.nested,
				nestedOpen: state.stack > 0
			}),
			present: (state, { api }) => state.mounted || !!api.internal.contentProps().keepMounted,
			role: "presentation",
			attrs: (state) => ({
				hidden: state.mounted ? void 0 : "",
				...openAttrs(state.open),
				"data-nested": state.nested ? "" : void 0,
				"data-nested-open": state.stack > 0 ? "" : void 0
			}),
			bind(el, { api }) {
				api.internal.preset.resetStyles?.bind(el);
				return api.internal.popup.backdrop(el);
			}
		}),
		content: slot({
			props: {
				container: "value",
				initialFocus: "string",
				finalFocus: "string",
				keepMounted: "boolean",
				inline: "boolean"
			},
			connect: registerPopupElement,
			role: (state, { api }) => api.internal.role,
			roles: ["dialog", "alertdialog"],
			state: (state) => ({
				open: state.open,
				modal: state.modal,
				nested: state.nested,
				nestedOpen: state.stack > 0,
				stack: state.stack,
				payload: state.payload,
				pending: state.pending !== null,
				presentation: state.presentation
			}),
			present: (state, { props }) => state.mounted || !!props.keepMounted,
			attrs: (state, { id, api }) => ({
				...popupContentAttrs(state, id),
				...api.internal.triggerName?.contentAttrs(state, id),
				"aria-describedby": state.described ? `${id}-description` : void 0,
				"data-nested": state.nested ? "" : void 0,
				"data-nested-open": state.stack > 0 ? "" : void 0,
				"data-presentation": api.internal.presentation && state.presentation
			}),
			on: { keydown(event, { api, el }) {
				if (ownsEvent(el, event, ownContent)) api.internal.popup.keydown(event);
			} },
			bind(el, { api, store, id, key }) {
				const stack = () => el.style.setProperty("--dialog-stack", String(store.get().stack));
				stack();
				const offStack = store.subscribe(stack);
				const unbind = bindPopupContent(el, api.internal, key);
				settleFlag(store, "titled");
				const offKeyboard = store.get().presentation === "sheet" ? void 0 : trackKeyboard(el);
				return () => {
					offStack();
					offKeyboard?.();
					unbind();
					el.style.removeProperty("--dialog-stack");
				};
			}
		}),
		title: popupTitle(slot),
		description: popupDescription(slot),
		close: slot({
			props: {
				id: "id",
				value: "string",
				action: "action"
			},
			state: (state, { key }) => ({
				pending: state.pending === key,
				error: state.errors[key]
			}),
			attrs: (state, { key }) => {
				const blocked = state.pending !== null && state.pending !== key;
				return {
					type: "button",
					"data-pending": state.pending === key ? "" : void 0,
					"aria-busy": state.pending === key ? "true" : void 0,
					"aria-disabled": state.pending !== null ? "true" : void 0,
					"data-disabled": blocked ? "" : void 0
				};
			},
			press: ({ api, key, props }, event) => api.internal.closePress(key, props, event)
		}),
		shortcut: shortcutSlot(slot, (_state, api, el) => el && api.internal.shortcutOf(el))
	};
}
// node_modules/@ui-sdk/core/dist/components/dialog/dialog-primitive.js
function defineDialog(name, alert, options, extension) {
	return definePrimitive({
		name,
		options: {
			container: "value",
			open: "boolean",
			defaultOpen: "boolean",
			onOpenChangeComplete: "callback",
			dismissible: "boolean",
			onDismissAttempt: "callback",
			persistentElements: "list",
			pendingAnnouncement: "string",
			...options
		},
		state: (options2) => ({
			open: options2.defaultOpen ?? false,
			mounted: options2.open ?? options2.defaultOpen ?? false,
			titled: null,
			described: false,
			trigger: null,
			payload: void 0,
			modal: true,
			nested: false,
			stack: 0,
			pending: null,
			errors: {},
			apple: initialApple(),
			presentation: "dialog"
		}),
		sync: (options2) => ({
			...options2.open !== void 0 && { open: options2.open },
			modal: alert ? true : options2.modal ?? true
		}),
		api: (context) => dialogApi(context, alert, extension?.rules(context.store, context.options)),
		slots: (slot) => ({
			...dialogSlots(slot, { name }),
			...extension?.slots(slot)
		}),
		agent: { actions: ["setOpen"] }
	});
}
// node_modules/@ui-sdk/core/dist/components/dialog/alert-dialog.js
var alertDialog = /* @__PURE__ */ defineDialog("alert-dialog", true, {
	onOpenChange: "callback",
	onPayloadChange: "callback",
	controller: "value"
});
// node_modules/@ui-sdk/react/dist/controller-target.js
var controlled = /* @__PURE__ */ new WeakMap();
function controlledEntry(controller) {
	let entry = controlled.get(controller);
	if (!entry) controlled.set(controller, entry = {
		value: void 0,
		listeners: /* @__PURE__ */ new Set()
	});
	return entry;
}
var noController = () => () => {};
function useControllerTarget(controller, nearest) {
	const subscribe = import_react.useCallback((listener) => {
		if (!controller) return () => {};
		const { listeners } = controlledEntry(controller);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}, [controller]);
	const read = () => controller ? controlled.get(controller)?.value : void 0;
	return import_react.useSyncExternalStore(controller ? subscribe : noController, read, () => void 0) ?? nearest;
}
function useControllerEntry(controller, value) {
	import_react.useLayoutEffect(() => {
		if (!controller) return;
		const entry = controlledEntry(controller);
		entry.value = value;
		entry.listeners.forEach((listener) => listener());
		return () => {
			if (entry.value !== value) return;
			entry.value = void 0;
			entry.listeners.forEach((listener) => listener());
		};
	}, [controller, value]);
}
// node_modules/@ui-sdk/react/dist/popup.js
var InheritedContainer = import_react.createContext(void 0);
function usePopupContainer(own) {
	const inherited = import_react.useContext(InheritedContainer);
	return own ?? inherited;
}
function useOwnContainer(own, root) {
	const fromRoot = import_react.useContext(root);
	return own ?? fromRoot;
}
function renderPopup(element, container) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Popup, {
		element,
		container
	});
}
function Popup({ element, container }) {
	const target = portalTarget(container);
	const [tree] = import_react.useState(followTree);
	import_react.useInsertionEffect(() => {
		if (target) tree.placed(target);
	}, [tree, target]);
	const part = element;
	const tracked = import_react.cloneElement(part, { ref: mergeRefs(part.props.ref ?? null, tree.track) });
	const content = container ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InheritedContainer.Provider, {
		value: container,
		children: tracked
	}) : tracked;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TreeEffect, {
		tree,
		target
	}), target ? (0, import_react_dom.createPortal)(content, target) : content] });
}
function followTree() {
	let els = [];
	let isShown = false;
	let show;
	let lastBefore = null;
	const hideLater = () => queueMicrotask(() => {
		els = els.filter((el) => el.isConnected);
		if (isShown || show) return;
		const shows = els.map(hide);
		if (shows.length) show = () => shows.forEach((run) => run());
	});
	const track = (next) => {
		if (next instanceof HTMLElement && !els.includes(next)) els = [...els.filter((el) => el.isConnected), next];
	};
	return {
		track,
		placing(target) {
			lastBefore = target.lastChild;
		},
		placed(target) {
			if (target.lastChild === lastBefore) return;
			const first = !lastBefore ? target.firstChild : lastBefore.parentNode === target ? lastBefore.nextSibling : target.lastChild;
			for (let node = first; node; node = node.nextSibling) track(node);
			if (!isShown) hideLater();
		},
		shown() {
			isShown = true;
			show?.();
			show = void 0;
		},
		hidden() {
			isShown = false;
			hideLater();
		}
	};
}
function TreeEffect({ tree, target }) {
	import_react.useInsertionEffect(() => {
		if (target) tree.placing(target);
	}, [tree, target]);
	import_react.useLayoutEffect(() => {
		tree.shown();
		return tree.hidden;
	}, [tree]);
	return null;
}
function hide(el) {
	const doc = el.ownerDocument;
	if (el.contains(doc.activeElement)) doc.activeElement.blur();
	for (const popover of [el, ...el.querySelectorAll("[popover]")]) try {
		popover.hidePopover();
	} catch {}
	const { style } = el;
	if (style.display === "none") return () => {};
	const value = style.getPropertyValue("display");
	const priority = style.getPropertyPriority("display");
	style.setProperty("display", "none", "important");
	return () => style.setProperty("display", value, priority);
}
function sheetViewport(popup, render) {
	return (props, state) => {
		const element = renderElement("div", props, render, state);
		return presentIn(popup, "viewport") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			...slotIn(popup, "viewport", {}),
			children: element
		}) : element;
	};
}
function Connected({ primitive, controller, fallback, children }) {
	const handle = useControllerTarget(controller, useNearest(primitive));
	if (!handle) return fallback();
	return controller ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HandleScope, {
		handle,
		children
	}) : children;
}
// node_modules/@ui-sdk/react/dist/dialog-parts.js
var TriggerContext = import_react.createContext(null);
var text = (state) => state.text;
function dialogParts(primitive, name, viewport) {
	const parts = createParts(primitive, {
		title: "h2",
		description: "p",
		close: "button",
		trigger: "button"
	});
	const ContainerContext = import_react.createContext(void 0);
	function Root({ children, container, ...options }) {
		const handle = usePrimitive(primitive, options);
		useControllerEntry(options.controller, handle);
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HandleScope, {
			handle,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContainerContext.Provider, {
				value: container,
				children
			})
		});
	}
	function Trigger({ controller, ...props }) {
		const { disabled, focusableWhenDisabled, payload: _, shortcut, render, ...rest } = props;
		const unconnected = () => renderElement("button", {
			type: "button",
			disabled: disabled && !focusableWhenDisabled,
			"aria-disabled": disabled && focusableWhenDisabled || void 0,
			...rest
		}, render, {
			open: false,
			disabled: !!disabled
		});
		return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriggerContext.Provider, {
			value: { shortcut },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Connected, {
				primitive,
				controller,
				fallback: unconnected,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(parts.Trigger, { ...props })
			})
		});
	}
	function Backdrop(props) {
		const target = usePopupContainer(import_react.useContext(ContainerContext));
		const element = usePart(primitive, "backdrop", {}, props);
		return element && renderPopup(element, target);
	}
	function Content({ initialFocus, finalFocus, keepMounted, inline, container, render, ...props }) {
		const handle = useHandle(primitive);
		const target = usePopupContainer(useOwnContainer(container, ContainerContext));
		const partProps = {
			...props,
			render: viewport ? viewport(handle, render) : render
		};
		const element = usePart(handle, "content", {
			initialFocus,
			finalFocus,
			keepMounted,
			inline
		}, partProps);
		return element && (inline ? element : renderPopup(element, target));
	}
	function Shortcut(props) {
		const trigger = import_react.useContext(TriggerContext);
		if (useNearest(primitive)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShortcutPart, {
			inherited: trigger?.shortcut,
			...props
		});
		if (trigger) return null;
		throw new Error(`${name} parts must be used inside <${name}>.`);
	}
	function ShortcutPart({ inherited, shortcut, children = text, ...props }) {
		return usePart(primitive, "shortcut", { shortcut: shortcut ?? inherited }, {
			...props,
			children
		}, "span");
	}
	return {
		Root,
		Trigger,
		Backdrop,
		Content,
		Title: parts.Title,
		Description: parts.Description,
		Close: parts.Close,
		Shortcut
	};
}
// node_modules/@ui-sdk/react/dist/alert-dialog.js
var alertParts = dialogParts(alertDialog, "AlertDialog");
function AlertDialog(props) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(alertParts.Root, { ...props });
}
var AlertDialogBackdrop = alertParts.Backdrop;
var AlertDialogContent = alertParts.Content;
var AlertDialogTitle = alertParts.Title;
var AlertDialogDescription = alertParts.Description;
var AlertDialogClose = alertParts.Close;
alertParts.Shortcut;
// node_modules/@ui-sdk/core/dist/foundation/popups/modal-attribute.js
function modalAttribute(attribute) {
	if (attribute === null) return;
	if (attribute === "false") return false;
	if (attribute === "pointer" || attribute === "trap-focus") return attribute;
	return true;
}
// node_modules/@ui-sdk/react/dist/dialog.js
var parts$3 = dialogParts(/* @__PURE__ */ defineDialog("dialog", false, {
	onOpenChange: "callback",
	onPayloadChange: "callback",
	modal: modalAttribute,
	closeOnOutsidePress: "boolean",
	presentation: "string",
	controller: "value"
}, {
	rules() {
		let sheet;
		return {
			preset: dialogPreset,
			bind: () => ({ onSheet: (next) => sheet = next }),
			onRefuse: () => sheet?.nudge()
		};
	},
	slots: (slot) => ({ viewport: popupViewport(slot) })
}), "Dialog", sheetViewport);
var Dialog = parts$3.Root;
var DialogBackdrop = parts$3.Backdrop;
var DialogContent = parts$3.Content;
var DialogTitle = parts$3.Title;
var DialogDescription = parts$3.Description;
parts$3.Close;
parts$3.Shortcut;
// node_modules/@ui-sdk/core/dist/foundation/forms/toggle-control.js
function toggleState(options) {
	const checked = options.checked ?? options.defaultChecked ?? false;
	return {
		checked,
		initial: checked,
		disabled: !!options.disabled,
		readOnly: !!options.readOnly,
		required: !!options.required,
		name: options.name,
		value: options.value ?? "on",
		form: options.form,
		formDisabled: false
	};
}
function syncToggle(options) {
	return {
		disabled: !!options.disabled,
		readOnly: !!options.readOnly,
		required: !!options.required,
		name: options.name,
		value: options.value ?? "on",
		form: options.form,
		...options.defaultChecked === void 0 ? {} : { initial: options.defaultChecked },
		...options.checked === void 0 ? {} : { checked: options.checked }
	};
}
function toggleControl({ store, element, options }, change, group) {
	const formElement = () => {
		const root = element("root");
		return formInternals(root) ? root : element("input");
	};
	const formOwner = () => {
		return formInternals(element("root"))?.form ?? element("input")?.form ?? group?.owner()?.formOwner();
	};
	function write(checked, details) {
		const owner = group?.owner();
		return group && owner ? group.write(owner, checked, details) : change("checked", checked, details);
	}
	function setState(checked, { reason = "imperative", event } = {}) {
		const state = store.get();
		if (isDisabled(state) || state.readOnly) return false;
		const done = write(checked, {
			reason,
			event
		});
		if (done && reason !== "restore") dispatchChange(formElement());
		return done;
	}
	return {
		getChecked: () => store.get().checked,
		setChecked: (checked, details) => setState(checked, details),
		toggle(details = {}) {
			return setState(store.get().checked !== true, details);
		},
		focus: () => element("root")?.focus(),
		form: formOwner,
		internal: {
			restore(saved) {
				write(saved === "indeterminate" ? "indeterminate" : saved === "true", { reason: "restore" });
			},
			reset() {
				if (group?.owner() || keepsValueOnReset(options().checked, options().defaultChecked)) return;
				change("checked", store.get().initial, { reason: "reset" });
			},
			setFormDisabled(formDisabled) {
				store.set({ formDisabled });
			},
			root: () => element("root")
		}
	};
}
var isNativeButton = (el) => el instanceof HTMLButtonElement;
var switchState = (state) => ({
	checked: state.checked === true,
	disabled: isDisabled(state),
	readOnly: state.readOnly,
	required: state.required
});
var toggleDataAttrs = (state) => ({
	...checkedAttrs(state.checked),
	"data-disabled": isDisabled(state) ? "" : void 0,
	"data-readonly": state.readOnly ? "" : void 0,
	"data-required": state.required ? "" : void 0
});
function toggleSlots(role, slot, publicState) {
	return {
		root: slot({
			...role === "checkbox" ? { role: "checkbox" } : { role: "switch" },
			focus: "tab-stop",
			state: publicState,
			attrs: (state) => ({
				type: "button",
				"aria-checked": state.checked === "indeterminate" ? "mixed" : String(state.checked),
				"aria-readonly": state.readOnly ? "true" : void 0,
				"aria-required": state.required ? "true" : void 0,
				"aria-disabled": isDisabled(state) ? "true" : void 0,
				disabled: state.disabled ? "" : void 0,
				tabindex: isDisabled(state) ? void 0 : "0",
				...toggleDataAttrs(state)
			}),
			press: ({ api }, event) => {
				event?.preventDefault();
				api.toggle({
					reason: "press",
					event
				});
			},
			on: {
				keydown: (event, { api, el }) => {
					if (event.key === "Enter") {
						event.preventDefault();
						if (!event.repeat) submitImplicitly(api.form());
					} else if (event.key === " " && !isNativeButton(el)) event.preventDefault();
				},
				keyup: (event, { api, el }) => {
					if (event.key === " " && !isNativeButton(el)) api.toggle({
						reason: "press",
						event
					});
				}
			},
			bind: (el, { api, store }) => bindInternals(el, {
				value: () => store.get().checked === true && store.get().name !== void 0 ? store.get().value : null,
				state: () => String(store.get().checked),
				restore: api.internal.restore,
				valueMissing: () => store.get().required && store.get().checked !== true,
				message: () => valueMissingMessage("checkbox"),
				reset: api.internal.reset,
				disabled: api.internal.setFormDisabled,
				subscribe: store.subscribe
			})
		}),
		input: slot({
			attrs: (state) => ({
				type: "checkbox",
				name: state.name,
				value: state.value,
				form: state.form,
				checked: state.initial === true ? "" : void 0,
				required: state.required ? "" : void 0,
				disabled: state.disabled ? "" : void 0,
				"aria-hidden": "true",
				tabindex: "-1",
				style: hiddenInputStyle
			}),
			bind: (el, { api, store }) => bindHiddenInput(el, {
				checked: () => store.get().checked === true,
				indeterminate: () => store.get().checked === "indeterminate",
				subscribe: store.subscribe,
				focus: api.focus,
				control: api.internal.root,
				activate: (event) => api.toggle({
					reason: "press",
					event
				}),
				reset: api.internal.reset,
				disabled: api.internal.setFormDisabled
			})
		})
	};
}
// node_modules/@ui-sdk/core/dist/components/switch/switch.js
var switchPrimitive = /* @__PURE__ */ definePrimitive({
	name: "switch",
	options: {
		checked: "boolean",
		defaultChecked: "boolean",
		onCheckedChange: "callback",
		disabled: "boolean",
		readOnly: "boolean",
		required: "boolean",
		name: "string",
		value: "string",
		form: "string",
		controller: "value"
	},
	state: (options) => toggleState(options),
	controlled: ["checked"],
	sync: syncToggle,
	api: (context) => toggleControl(context, createChange(context)),
	slots: (slot) => ({
		...toggleSlots("switch", slot, switchState),
		thumb: slot({
			state: switchState,
			attrs: (state) => toggleDataAttrs(state)
		})
	}),
	agent: { actions: ["setChecked"] }
});
// node_modules/@ui-sdk/react/dist/switch.js
var parts$2 = createParts(switchPrimitive, {
	root: "button",
	thumb: "span"
});
function SwitchInput() {
	return usePart(switchPrimitive, "input", {}, {}, "input");
}
function Switch({ disabled, name, render, ...props }) {
	const field = useFieldControl();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(parts$2.Root, {
		...props,
		disabled: disabled || field?.disabled,
		name: name ?? field?.name,
		render: controlRender(field, "button", render, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchInput, {}))
	});
}
var SwitchThumb = parts$2.Thumb;
// node_modules/@ui-sdk/core/dist/foundation/kernel/inline-style.js
function css(declarations) {
	let text = "";
	for (const property in declarations) {
		const value = declarations[property];
		if (value !== void 0) text += `${text ? ";" : ""}${property}:${value}`;
	}
	return text;
}
// node_modules/@ui-sdk/core/dist/foundation/gauge/gauge.js
function gaugeSettings(options) {
	const min = finite(options.min, 0);
	return {
		min,
		max: Math.max(min, finite(options.max, 100)),
		format: options.format,
		locale: options.locale,
		getValueLabel: options.getValueLabel
	};
}
function finite(value, fallback) {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function percentBetween(value, min, max) {
	if (max <= min) return value >= max ? 100 : 0;
	return (clamp(value, min, max) - min) / (max - min) * 100;
}
function formatGaugeValue(value, settings) {
	if (value === null) return "";
	const { format, min, max } = settings;
	const locale = localeOf(settings);
	if (typeof format === "function") return format(value);
	if (format && format.style !== "percent") return formatNumber(value, locale, format);
	return formatNumber(percentBetween(value, min, max) / 100, locale, format ?? { style: "percent" });
}
function gaugeValueText(value, settings) {
	const formatted = formatGaugeValue(value, settings);
	if (!settings.getValueLabel) return formatted || void 0;
	const percent = value === null ? null : percentBetween(value, settings.min, settings.max);
	return settings.getValueLabel(value, {
		formatted,
		percent,
		min: settings.min,
		max: settings.max
	});
}
function gaugeAria(value, settings) {
	return {
		"aria-valuemin": String(settings.min),
		"aria-valuemax": String(settings.max),
		"aria-valuenow": value === null ? void 0 : String(clamp(value, settings.min, settings.max)),
		"aria-valuetext": gaugeValueText(value, settings)
	};
}
function indicatorStyle(percent) {
	return percent === null ? void 0 : css({
		"inset-inline-start": 0,
		width: `${roundPercent(percent)}%`
	});
}
function roundPercent(percent) {
	return Math.round(percent * 1e4) / 1e4;
}
var labelId = (id) => `${id}-label`;
var labelledBy = (state, id) => state.labels || !state.bound ? labelId(id) : void 0;
function gaugeApi(store) {
	return { internal: { label: () => {
		store.set({ labels: store.get().labels + 1 });
		let bound = true;
		return () => {
			if (!bound) return;
			bound = false;
			store.set({ labels: store.get().labels - 1 });
		};
	} } };
}
// node_modules/@ui-sdk/core/dist/components/meter/meter.js
var percentOf = (state) => percentBetween(state.value, state.min, state.max);
function meterState(state) {
	return {
		value: state.value,
		percent: percentOf(state)
	};
}
function settings(options) {
	const shared = gaugeSettings(options);
	return {
		...shared,
		value: finite(options.value, shared.min)
	};
}
// node_modules/@ui-sdk/react/dist/meter.js
var parts$1 = createParts(/* @__PURE__ */ definePrimitive({
	name: "meter",
	options: {
		min: "number",
		max: "number",
		format: "value",
		locale: "string",
		getValueLabel: "value",
		value: "number"
	},
	state: (options) => ({
		...settings(options),
		labels: 0,
		bound: false,
		pageLocale: null
	}),
	sync: settings,
	controlled: [],
	api: ({ store }) => gaugeApi(store),
	slots: (slot) => ({
		root: slot({
			role: "meter",
			state: meterState,
			attrs: (state, { id }) => ({
				...gaugeAria(state.value, state),
				"aria-labelledby": labelledBy(state, id),
				style: css({ "--meter-value": `${roundPercent(percentOf(state))}%` })
			}),
			bind: (el, { store, id }) => {
				bindPageLocale(el, (pageLocale) => store.set({ pageLocale }));
				return flagWhileBound(store, "bound");
			}
		}),
		track: slot({ state: meterState }),
		indicator: slot({
			state: meterState,
			attrs: (state) => ({ style: indicatorStyle(percentOf(state)) })
		}),
		label: slot({
			state: meterState,
			attrs: (_, { id }) => ({ id: labelId(id) }),
			bind: (_, { api }) => api.internal.label()
		}),
		value: slot({
			state: (state) => ({
				...meterState(state),
				text: formatGaugeValue(state.value, state)
			}),
			attrs: () => ({ "aria-hidden": "true" })
		})
	})
}), {
	root: "div",
	track: "div",
	indicator: "div",
	label: "span",
	value: "span"
});
var Meter = parts$1.Root;
var MeterTrack = parts$1.Track;
var MeterIndicator = parts$1.Indicator;
parts$1.Label;
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
	const restores = Object.entries(styles).map(([name, value]) => setStyle$1(el, name, value));
	return () => restores.forEach((restore) => restore());
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
var sheet_presentation_exports = /* @__PURE__ */ __exportAll({
	prepareVariables: () => prepareVariables,
	presentSheet: () => presentSheet
});
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
			else if (child instanceof HTMLElement) restores.push(setStyle$1(child, "display", "none"));
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
			restore = setStyle$1(el, "display", "none");
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
// node_modules/@ui-sdk/core/dist/components/tabs/tabs.js
var indicatorVariables = [
	"left",
	"right",
	"top",
	"bottom",
	"width",
	"height"
];
function writeIndicator(el, rect) {
	for (const name of indicatorVariables) if (rect) el.style.setProperty(`--active-tab-${name}`, `${rect[name]}px`);
	else el.style.removeProperty(`--active-tab-${name}`);
}
function tabsApiBody(context) {
	const { id, store, options, element, props } = context;
	const change = createChange(context);
	const panels = /* @__PURE__ */ new Set();
	let changed = false;
	let checked = false;
	let awaited = options().defaultValue ?? null;
	let standIn = null;
	const tabsChanged = /* @__PURE__ */ new Set();
	const orientation = () => store.get().orientation;
	const controlled = () => options().value !== void 0;
	const enabled = (tab) => !tab.props?.disabled;
	const roving = createRovingFocus(context, {
		slot: "tab",
		key: "stop",
		orientation,
		loop: () => options().loop ?? true,
		remember: false,
		disabled: (tab) => !enabled(tab),
		preferred: (tab) => store.get().value === tab.key,
		claims: (state, tab) => state.value === null ? enabled(tab) : state.value === tab.key,
		onItemsChange: check
	});
	let navigation;
	const tabs2 = roving.items;
	function check() {
		const list = tabs2();
		if (list.length) {
			const initial = !checked;
			checked = true;
			const has = (key) => list.some((tab) => tab.key === key);
			let { value } = store.get();
			if (controlled()) awaited = null;
			if (awaited !== null && has(awaited)) {
				const from = value;
				value = awaited;
				awaited = standIn = null;
				if (from !== value) store.set({ value });
			}
			const streamed = awaited !== null && value === awaited && !!list[0].el.ownerDocument.getElementById(`${id}-tab-${idPart(awaited)}`);
			if (!controlled() && !has(value) && !streamed) {
				const first = list.find(enabled);
				if (first && initial) {
					standIn = awaited === null ? null : first.key;
					store.set({ value: first.key });
				} else if (first) change("value", first.key, { reason: "item-removed" });
			}
		}
		for (const listener of tabsChanged) listener();
	}
	function shows(state, key) {
		if (checked || state.value !== null || controlled()) return state.value === key;
		const tab = props("tab", key);
		return !!tab && roving.tabIndex(state, {
			key,
			props: tab
		}) === "0";
	}
	function reveal(value) {
		const list = element("list");
		const tab = value === null ? void 0 : element("tab", value);
		if (!list || !tab) return;
		if (list.scrollWidth <= list.clientWidth && list.scrollHeight <= list.clientHeight) return;
		const rect = layoutBox(tab, list);
		const rtl = isRTL(list);
		const scrolled = scrollToShow(rtl ? -list.scrollLeft : list.scrollLeft, list.clientWidth, rtl ? list.clientWidth - rect.left - rect.width : rect.left, rect.width);
		list.scrollLeft = rtl ? -scrolled : scrolled;
		list.scrollTop = scrollToShow(list.scrollTop, list.clientHeight, rect.top, rect.height);
	}
	function selecting(state, value) {
		const from = state.value;
		const rect = (key) => key === null ? void 0 : element("tab", key)?.getBoundingClientRect();
		return {
			direction: directionBetween(rect(from), rect(value), state.orientation),
			exiting: [...state.exiting.filter((key) => key !== value), ...from !== null && panels.has(from) && !state.exiting.includes(from) ? [from] : []]
		};
	}
	deriveFromOptions(context, [
		"direction",
		"exiting",
		"stop"
	], (synced, state) => {
		if (!("value" in synced) || synced.value === state.value) return;
		const value = synced.value ?? null;
		const stop = roving.stopFor((tab) => tab.key === value);
		return {
			...selecting(state, value),
			...stop !== void 0 && { stop }
		};
	});
	let previous = store.get().value;
	store.subscribe(() => {
		const state = store.get();
		if (state.value === previous) return;
		const from = previous;
		previous = state.value;
		if (state.value !== standIn) awaited = null;
		changed = true;
		store.set(selecting({
			...state,
			value: from
		}, state.value));
		roving.check();
		reveal(state.value);
	});
	function select(value, { reason = "imperative", event } = {}) {
		if (value !== null && props("tab", value)?.disabled) return false;
		return change("value", value, {
			reason,
			event
		});
	}
	return {
		getValue: () => store.get().value,
		setValue: select,
		select,
		focus: () => roving.focus(),
		internal: {
			id,
			options,
			orientation,
			shows,
			isChanged: () => changed,
			listElement: () => element("list"),
			tabElement: (value) => element("tab", value),
			onTabsChange(listener) {
				tabsChanged.add(listener);
				return () => tabsChanged.delete(listener);
			},
			roving,
			registerPanel(key) {
				panels.add(key);
				store.set({ panels: [...panels] });
				return () => {
					panels.delete(key);
					const { exiting } = store.get();
					store.set({
						panels: [...panels],
						exiting: exiting.filter((value) => value !== key)
					});
				};
			},
			setElement(key, el) {
				const element2 = buttonElement(el);
				const { elements } = store.get();
				if ((elements[key] ?? "button") !== element2) store.set({ elements: {
					...elements,
					[key]: element2
				} });
			},
			finishExit(key) {
				store.set({ exiting: store.get().exiting.filter((value) => value !== key) });
			},
			pressDetails: (event) => navigation ? {
				reason: "list-navigation",
				event: navigation
			} : {
				reason: "item-press",
				event
			},
			onKeyDown(event) {
				if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
				const current = tabs2().find((tab) => tab.el === event.target);
				if (!current) return;
				const el = current.el;
				if (event.key === "Enter" || event.key === " ") {
					if (el.tagName === "BUTTON" || event.key === "Enter" && el.matches("a[href]")) return;
					event.preventDefault();
					if (el.matches("a[href]")) el.click();
					else if (enabled(current)) select(current.key, {
						reason: "item-press",
						event
					});
					return;
				}
				const moved = roving.keydown(event, el);
				const next = moved && moved.key !== moved.from ? tabs2().find((tab) => tab.key === moved.key) : void 0;
				if (!next || options().activation === "manual" || !enabled(next)) return;
				if (next.el.matches("a[href]")) {
					navigation = event;
					try {
						next.el.click();
					} finally {
						navigation = void 0;
					}
				} else select(next.key, {
					reason: "list-navigation",
					event
				});
			}
		}
	};
}
var tabsApi = tabsApiBody;
var findable = (state, props) => props.hiddenUntilFound ?? state.hiddenUntilFound;
// node_modules/@ui-sdk/react/dist/tabs.js
var parts = createParts(/* @__PURE__ */ definePrimitive({
	name: "tabs",
	options: {
		value: "string",
		defaultValue: "string",
		onValueChange: "callback",
		orientation: "string",
		activation: "string",
		loop: "boolean",
		hiddenUntilFound: "boolean",
		controller: "value"
	},
	state: (options) => ({
		value: options.defaultValue ?? null,
		orientation: orientationOf(options.orientation, "horizontal"),
		hiddenUntilFound: options.hiddenUntilFound ?? false,
		direction: "none",
		exiting: [],
		stop: null,
		panels: [],
		elements: {}
	}),
	live: ["panels"],
	sync: (options) => ({
		orientation: orientationOf(options.orientation, "horizontal"),
		hiddenUntilFound: options.hiddenUntilFound ?? false,
		...options.value === void 0 ? {} : { value: options.value }
	}),
	api: tabsApi,
	slots: (slot) => ({
		root: slot({
			state: (state, { api }) => ({
				value: state.value,
				orientation: api.internal.orientation(),
				direction: state.direction
			}),
			attrs: (state, { api }) => ({
				"data-orientation": api.internal.orientation(),
				"data-activation-direction": state.direction
			})
		}),
		list: slot({
			role: "tablist",
			keys: (state) => [
				...state.orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"],
				"Home",
				"End",
				"Enter",
				" "
			],
			state: (state, { api }) => ({ orientation: api.internal.orientation() }),
			attrs: (state, { api }) => ({
				"aria-orientation": api.internal.orientation() === "vertical" ? "vertical" : void 0,
				"data-orientation": api.internal.orientation(),
				"data-activation-direction": state.direction
			}),
			on: { keydown: (event, { api }) => api.internal.onKeyDown(event) }
		}),
		tab: slot({
			role: "tab",
			focus: "roving",
			props: {
				value: "string",
				disabled: "boolean"
			},
			selects: selects({
				value: ({ key }) => [key, null],
				stop: ({ key }) => [key, null],
				exiting: [],
				panels: ({ key }) => [key],
				elements: ({ key }) => [key]
			}),
			state: (state, { key, props, api }) => ({
				selected: api.internal.shows(state, key),
				disabled: !!props.disabled
			}),
			attrs: (state, { id, key, props, api }) => {
				const selected = api.internal.shows(state, key);
				return {
					id: `${id}-tab-${idPart(key)}`,
					type: (state.elements[key] ?? "button") === "button" ? "button" : void 0,
					tabindex: api.internal.roving.tabIndex(state, {
						key,
						props
					}),
					"aria-selected": String(selected),
					"aria-disabled": props.disabled ? "true" : void 0,
					"data-selected": selected ? "" : void 0,
					"data-disabled": props.disabled ? "" : void 0,
					"data-orientation": api.internal.orientation(),
					"data-activation-direction": state.direction
				};
			},
			live: live((state, { id, key }) => ({ "aria-controls": state.panels.includes(key) ? `${id}-panel-${idPart(key)}` : void 0 })),
			press({ api, el, key, props }, event) {
				if (props.disabled) {
					event?.preventDefault();
					return;
				}
				if (opensElsewhere(event, el)) return;
				if (el && document.activeElement !== el) el.focus({ preventScroll: true });
				api.select(key, api.internal.pressDetails(event));
			},
			bind(el, part) {
				part.api.internal.setElement(part.key, el);
				return part.api.internal.roving.bind(el, part);
			}
		}),
		"tab-icon": slot(itemIconPart({
			component: "tabs",
			item: "[role=\"tab\"]",
			list: "[role=\"tablist\"]"
		})),
		indicator: slot({
			role: "presentation",
			state: (state, { api }) => ({
				orientation: api.internal.orientation(),
				direction: state.direction
			}),
			attrs: (state, { api }) => ({
				"data-orientation": api.internal.orientation(),
				"data-activation-direction": state.direction
			}),
			bind(el, { api, store }) {
				let value = store.get().value;
				return bindIndicator({
					list: () => api.internal.listElement() ?? el.parentElement,
					active: () => {
						const { value: value2 } = store.get();
						return value2 === null ? void 0 : api.internal.tabElement(value2);
					},
					itemSelector: "[role=\"tab\"]",
					subscribe(remeasure) {
						const unsubscribe = store.subscribe(() => {
							if (store.get().value === value) return;
							value = store.get().value;
							el.setAttribute("data-activation-direction", store.get().direction);
							remeasure();
						});
						const offTabsChange = api.internal.onTabsChange(remeasure);
						return () => {
							unsubscribe();
							offTabsChange();
						};
					},
					write: (box) => writeIndicator(el, box)
				});
			}
		}),
		panel: slot({
			role: "tabpanel",
			props: {
				value: "string",
				keepMounted: "boolean",
				hiddenUntilFound: "boolean"
			},
			selects: selects({
				value: ({ key }) => [key, null],
				stop: [],
				exiting: ({ key }) => [key],
				panels: [],
				elements: []
			}),
			present: (state, { key, props, api }) => !!props.keepMounted || findable(state, props) || api.internal.shows(state, key) || state.exiting.includes(key),
			state: (state, { key, api }) => ({ selected: api.internal.shows(state, key) }),
			attrs: (state, { id, key, props, api }) => ({
				id: `${id}-panel-${idPart(key)}`,
				"aria-labelledby": `${id}-tab-${idPart(key)}`,
				...hiddenAttrs(api.internal.shows(state, key) || state.exiting.includes(key), findable(state, props)),
				"data-selected": api.internal.shows(state, key) ? "" : void 0,
				"data-orientation": api.internal.orientation(),
				"data-activation-direction": state.direction
			}),
			bind(el, part) {
				const { api, key, store } = part;
				const cleanups = [api.internal.registerPanel(key)];
				const found = bindFindable(el, {
					shown: () => api.internal.shows(store.get(), key) || store.get().exiting.includes(key),
					findable: () => findable(store.get(), part.props),
					reveal: (event) => api.select(key, {
						reason: "find-in-page",
						event
					})
				});
				cleanups.push(found, subscribe(part, found.check), onProps(part, found.check));
				const tabStop = bindTabStop(el, () => true);
				cleanups.push(tabStop.stop);
				let stop;
				let selected = api.internal.shows(store.get(), key);
				if (selected && api.internal.isChanged()) stop = animateIn(el);
				cleanups.push(subscribe(part, () => {
					const { exiting } = store.get();
					if (api.internal.shows(store.get(), key) === selected) return;
					selected = !selected;
					stop?.();
					stop = void 0;
					el.toggleAttribute("data-selected", selected);
					if (selected) stop = animateIn(el);
					else if (exiting.includes(key)) stop = animateOut(el, () => {
						stop = void 0;
						api.internal.finishExit(key);
					});
				}));
				cleanups.push(() => stop?.());
				return () => cleanups.forEach((cleanup) => cleanup());
			}
		})
	}),
	agent: {
		actions: ["setValue"],
		closed: true,
		reveals: true
	}
}), {
	root: "div",
	list: "div",
	tab: "button",
	"tab-icon": "span",
	indicator: "span",
	panel: "div"
});
var Tabs = parts.Root;
var TabsList = parts.List;
var TabsTab = parts.Tab;
parts.TabIcon;
var TabsIndicator = parts.Indicator;
var TabsPanel = parts.Panel;
export { RefreshCw as $, Bell as $t, Wrench as A, FlaskConical as At, Sparkles as B, Copy as Bt, SegmentedControlIndicator as C, HardDriveUpload as Ct, _e as D, GitFork as Dt, NumberFlow as E, GitPullRequest as Et, Terminal as F, Download as Ft, ShieldCheck as G, CircleCheck as Gt, SlidersHorizontal as H, CircleX as Ht, Sun as I, Database as It, Send as J, Check as Jt, Server as K, ChevronRight as Kt, Stethoscope as L, Crown as Lt, Users as M, FilePenLine as Mt, TriangleExclamationPoint as N, FileCodeCorner as Nt, Zap as O, GitBranch as Ot, Trash as P, ExternalLink as Pt, RotateCcw as Q, Blocks as Qt, Square as R, Crosshair as Rt, SegmentedControl as S, Inbox as St, __vitePreload as T, Globe as Tt, Shield as U, CircleDot as Ut, Smartphone as V, Circle as Vt, ShieldExclamationPoint as W, CircleDashed as Wt, Save as X, Bot as Xt, Search as Y, CheckCheck as Yt, RotateCw as Z, BookmarkPlus as Zt, AlertDialogBackdrop as _, LogOut as _t, TabsTab as a, Archive as an, Play as at, AlertDialogDescription as b, Layers as bt, MeterTrack as c, Toaster as cn, PanelLeftClose as ct, Dialog as d, Moon as dt, BellOff as en, Radio as et, DialogBackdrop as f, Minus as ft, AlertDialog as g, Map$1 as gt, DialogTitle as h, Maximize2 as ht, TabsPanel as i, ArrowDown as in, Plug as it, WifiOff as j, FileText as jt, X$2 as k, Funnel as kt, Switch as l, toast as ln, Orbit as lt, DialogDescription as m, Menu as mt, TabsIndicator as n, ArrowUpDown as nn, Power as nt, Meter as o, Activity as on, Pause as ot, DialogContent as p, MessageSquare as pt, Settings2 as q, ChevronDown as qt, TabsList as r, ArrowRight as rn, Plus as rt, MeterIndicator as s, Drawer as sn, PanelLeftOpen as st, Tabs as t, ArrowUp as tn, Radar as tt, SwitchThumb as u, Network as ut, AlertDialogClose as v, List as vt, SegmentedControlItem as w, HardDriveDownload as wt, AlertDialogTitle as x, Laptop as xt, AlertDialogContent as y, LayoutGrid as yt, SquareKanban as z, Cpu as zt };
