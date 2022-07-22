!function(){"use strict";function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}function e(){/*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */e=function(){return t};var t={},n=Object.prototype,r=n.hasOwnProperty,o="function"==typeof Symbol?Symbol:{},i=o.iterator||"@@iterator",a=o.asyncIterator||"@@asyncIterator",c=o.toStringTag||"@@toStringTag";function u(t,e,n){return Object.defineProperty(t,e,{value:n,enumerable:!0,configurable:!0,writable:!0}),t[e]}try{u({},"")}catch(j){u=function(t,e,n){return t[e]=n}}function s(t,e,n,r){var o=e&&e.prototype instanceof h?e:h,i=Object.create(o.prototype),a=new C(r||[]);return i._invoke=function(t,e,n){var r="suspendedStart";return function(o,i){if("executing"===r)throw new Error("Generator is already running");if("completed"===r){if("throw"===o)throw i;return S()}for(n.method=o,n.arg=i;;){var a=n.delegate;if(a){var c=E(a,n);if(c){if(c===l)continue;return c}}if("next"===n.method)n.sent=n._sent=n.arg;else if("throw"===n.method){if("suspendedStart"===r)throw r="completed",n.arg;n.dispatchException(n.arg)}else"return"===n.method&&n.abrupt("return",n.arg);r="executing";var u=f(t,e,n);if("normal"===u.type){if(r=n.done?"completed":"suspendedYield",u.arg===l)continue;return{value:u.arg,done:n.done}}"throw"===u.type&&(r="completed",n.method="throw",n.arg=u.arg)}}}(t,n,a),i}function f(t,e,n){try{return{type:"normal",arg:t.call(e,n)}}catch(j){return{type:"throw",arg:j}}}t.wrap=s;var l={};function h(){}function p(){}function d(){}var v={};u(v,i,function(){return this});var y=Object.getPrototypeOf,m=y&&y(y(k([])));m&&m!==n&&r.call(m,i)&&(v=m);var g=d.prototype=h.prototype=Object.create(v);function w(t){["next","throw","return"].forEach(function(e){u(t,e,function(t){return this._invoke(e,t)})})}function b(t,e){function n(o,i,a,c){var u=f(t[o],t,i);if("throw"!==u.type){var s=u.arg,l=s.value;return l&&"object"==typeof l&&r.call(l,"__await")?e.resolve(l.__await).then(function(t){n("next",t,a,c)},function(t){n("throw",t,a,c)}):e.resolve(l).then(function(t){s.value=t,a(s)},function(t){return n("throw",t,a,c)})}c(u.arg)}var o;this._invoke=function(t,r){function i(){return new e(function(e,o){n(t,r,e,o)})}return o=o?o.then(i,i):i()}}function E(t,e){var n=t.iterator[e.method];if(void 0===n){if(e.delegate=null,"throw"===e.method){if(t.iterator.return&&(e.method="return",e.arg=void 0,E(t,e),"throw"===e.method))return l;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method")}return l}var r=f(n,t.iterator,e.arg);if("throw"===r.type)return e.method="throw",e.arg=r.arg,e.delegate=null,l;var o=r.arg;return o?o.done?(e[t.resultName]=o.value,e.next=t.nextLoc,"return"!==e.method&&(e.method="next",e.arg=void 0),e.delegate=null,l):o:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,l)}function x(t){var e={tryLoc:t[0]};1 in t&&(e.catchLoc=t[1]),2 in t&&(e.finallyLoc=t[2],e.afterLoc=t[3]),this.tryEntries.push(e)}function L(t){var e=t.completion||{};e.type="normal",delete e.arg,t.completion=e}function C(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(x,this),this.reset(!0)}function k(t){if(t){var e=t[i];if(e)return e.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var n=-1,o=function e(){for(;++n<t.length;)if(r.call(t,n))return e.value=t[n],e.done=!1,e;return e.value=void 0,e.done=!0,e};return o.next=o}}return{next:S}}function S(){return{value:void 0,done:!0}}return p.prototype=d,u(g,"constructor",d),u(d,"constructor",p),p.displayName=u(d,c,"GeneratorFunction"),t.isGeneratorFunction=function(t){var e="function"==typeof t&&t.constructor;return!!e&&(e===p||"GeneratorFunction"===(e.displayName||e.name))},t.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,d):(t.__proto__=d,u(t,c,"GeneratorFunction")),t.prototype=Object.create(g),t},t.awrap=function(t){return{__await:t}},w(b.prototype),u(b.prototype,a,function(){return this}),t.AsyncIterator=b,t.async=function(e,n,r,o,i){void 0===i&&(i=Promise);var a=new b(s(e,n,r,o),i);return t.isGeneratorFunction(n)?a:a.next().then(function(t){return t.done?t.value:a.next()})},w(g),u(g,c,"Generator"),u(g,i,function(){return this}),u(g,"toString",function(){return"[object Generator]"}),t.keys=function(t){var e=[];for(var n in t)e.push(n);return e.reverse(),function n(){for(;e.length;){var r=e.pop();if(r in t)return n.value=r,n.done=!1,n}return n.done=!0,n}},t.values=k,C.prototype={constructor:C,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(L),!t)for(var e in this)"t"===e.charAt(0)&&r.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=void 0)},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var e=this;function n(n,r){return a.type="throw",a.arg=t,e.next=n,r&&(e.method="next",e.arg=void 0),!!r}for(var o=this.tryEntries.length-1;o>=0;--o){var i=this.tryEntries[o],a=i.completion;if("root"===i.tryLoc)return n("end");if(i.tryLoc<=this.prev){var c=r.call(i,"catchLoc"),u=r.call(i,"finallyLoc");if(c&&u){if(this.prev<i.catchLoc)return n(i.catchLoc,!0);if(this.prev<i.finallyLoc)return n(i.finallyLoc)}else if(c){if(this.prev<i.catchLoc)return n(i.catchLoc,!0)}else{if(!u)throw new Error("try statement without catch or finally");if(this.prev<i.finallyLoc)return n(i.finallyLoc)}}}},abrupt:function(t,e){for(var n=this.tryEntries.length-1;n>=0;--n){var o=this.tryEntries[n];if(o.tryLoc<=this.prev&&r.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var i=o;break}}i&&("break"===t||"continue"===t)&&i.tryLoc<=e&&e<=i.finallyLoc&&(i=null);var a=i?i.completion:{};return a.type=t,a.arg=e,i?(this.method="next",this.next=i.finallyLoc,l):this.complete(a)},complete:function(t,e){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&e&&(this.next=e),l},finish:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.finallyLoc===t)return this.complete(n.completion,n.afterLoc),L(n),l}},catch:function(t){for(var e=this.tryEntries.length-1;e>=0;--e){var n=this.tryEntries[e];if(n.tryLoc===t){var r=n.completion;if("throw"===r.type){var o=r.arg;L(n)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(t,e,n){return this.delegate={iterator:k(t),resultName:e,nextLoc:n},"next"===this.method&&(this.arg=void 0),l}},t}(self.webpackChunkosm_go=self.webpackChunkosm_go||[]).push([[8592],{68225:function(t,e,n){n.d(e,{c:function(){return a}});var r=n(23150),o=n(52954),i=n(39461),a=function(t,e){var n,a,c=function(t,r,o){if("undefined"!=typeof document){var i=document.elementFromPoint(t,r);i&&e(i)?i!==n&&(s(),u(i,o)):s()}},u=function(t,e){n=t,a||(a=n);var o=n;(0,r.c)(function(){return o.classList.add("ion-activated")}),e()},s=function(){var t=arguments.length>0&&void 0!==arguments[0]&&arguments[0];if(n){var e=n;(0,r.c)(function(){return e.classList.remove("ion-activated")}),t&&a!==n&&n.click(),n=void 0}};return(0,i.createGesture)({el:t,gestureName:"buttonActiveDrag",threshold:0,onStart:function(t){return c(t.currentX,t.currentY,o.a)},onMove:function(t){return c(t.currentX,t.currentY,o.b)},onEnd:function(){s(!0),(0,o.h)(),a=void 0}})}},27069:function(t,n,r){r.d(n,{a:function(){return c},d:function(){return u}});var o,i=r(8239),a=r(71567),c=(o=(0,i.Z)(e().mark(function t(n,r,o,i,c){var u;return e().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:if(!n){t.next=2;break}return t.abrupt("return",n.attachViewToDom(r,o,c,i));case 2:if("string"==typeof o||o instanceof HTMLElement){t.next=4;break}throw new Error("framework delegate is missing");case 4:return u="string"==typeof o?r.ownerDocument&&r.ownerDocument.createElement(o):o,i&&i.forEach(function(t){return u.classList.add(t)}),c&&Object.assign(u,c),r.appendChild(u),t.next=10,new Promise(function(t){return(0,a.c)(u,t)});case 10:return t.abrupt("return",u);case 11:case"end":return t.stop()}},t)})),function(t,e,n,r,i){return o.apply(this,arguments)}),u=function(t,e){if(e){if(t)return t.removeViewFromDom(e.parentElement,e);e.remove()}return Promise.resolve()}},52954:function(t,e,n){n.d(e,{a:function(){return i},b:function(){return a},c:function(){return o},d:function(){return u},h:function(){return c}});var r={getEngine:function(){var t=window;return t.TapticEngine||t.Capacitor&&t.Capacitor.isPluginAvailable("Haptics")&&t.Capacitor.Plugins.Haptics},available:function(){return!!this.getEngine()},isCordova:function(){return!!window.TapticEngine},isCapacitor:function(){return!!window.Capacitor},impact:function(t){var e=this.getEngine();if(e){var n=this.isCapacitor()?t.style.toUpperCase():t.style;e.impact({style:n})}},notification:function(t){var e=this.getEngine();if(e){var n=this.isCapacitor()?t.style.toUpperCase():t.style;e.notification({style:n})}},selection:function(){this.impact({style:"light"})},selectionStart:function(){var t=this.getEngine();!t||(this.isCapacitor()?t.selectionStart():t.gestureSelectionStart())},selectionChanged:function(){var t=this.getEngine();!t||(this.isCapacitor()?t.selectionChanged():t.gestureSelectionChanged())},selectionEnd:function(){var t=this.getEngine();!t||(this.isCapacitor()?t.selectionEnd():t.gestureSelectionEnd())}},o=function(){r.selection()},i=function(){r.selectionStart()},a=function(){r.selectionChanged()},c=function(){r.selectionEnd()},u=function(t){r.impact(t)}},66575:function(e,n,r){r.d(n,{s:function(){return o}});var o=function(e){try{if(e instanceof function(){return e=function t(e){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),this.value=e},n&&t(e.prototype,n),r&&t(e,r),Object.defineProperty(e,"prototype",{writable:!1}),e;var e,n,r}())return e.value;if(!c()||"string"!=typeof e||""===e)return e;var n=document.createDocumentFragment(),r=document.createElement("div");n.appendChild(r),r.innerHTML=e,s.forEach(function(t){for(var e=n.querySelectorAll(t),r=e.length-1;r>=0;r--){var o=e[r];o.parentNode?o.parentNode.removeChild(o):n.removeChild(o);for(var c=a(o),u=0;u<c.length;u++)i(c[u])}});for(var o=a(n),u=0;u<o.length;u++)i(o[u]);var f=document.createElement("div");f.appendChild(n);var l=f.querySelector("div");return null!==l?l.innerHTML:f.innerHTML}catch(n){return console.error(n),""}},i=function t(e){if(!e.nodeType||1===e.nodeType){for(var n=e.attributes.length-1;n>=0;n--){var r=e.attributes.item(n),o=r.name;if(u.includes(o.toLowerCase())){var i=r.value;null!=i&&i.toLowerCase().includes("javascript:")&&e.removeAttribute(o)}else e.removeAttribute(o)}for(var c=a(e),s=0;s<c.length;s++)t(c[s])}},a=function(t){return null!=t.children?t.children:t.childNodes},c=function(){var t=window,e=t&&t.Ionic&&t.Ionic.config;return!e||(e.get?e.get("sanitizerEnabled",!0):!0===e.sanitizerEnabled||void 0===e.sanitizerEnabled)},u=["class","id","href","src","name","slot"],s=["script","style","iframe","meta","link","object","embed"]},60408:function(t,e,n){n.d(e,{S:function(){return r}});var r={bubbles:{dur:1e3,circles:9,fn:function(t,e,n){var r=t*e/n-t+"ms",o=2*Math.PI*e/n;return{r:5,style:{top:9*Math.sin(o)+"px",left:9*Math.cos(o)+"px","animation-delay":r}}}},circles:{dur:1e3,circles:8,fn:function(t,e,n){var r=e/n,o=t*r-t+"ms",i=2*Math.PI*r;return{r:5,style:{top:9*Math.sin(i)+"px",left:9*Math.cos(i)+"px","animation-delay":o}}}},circular:{dur:1400,elmDuration:!0,circles:1,fn:function(){return{r:20,cx:48,cy:48,fill:"none",viewBox:"24 24 48 48",transform:"translate(0,0)",style:{}}}},crescent:{dur:750,circles:1,fn:function(){return{r:26,style:{}}}},dots:{dur:750,circles:3,fn:function(t,e){return{r:6,style:{left:9-9*e+"px","animation-delay":-110*e+"ms"}}}},lines:{dur:1e3,lines:12,fn:function(t,e,n){return{y1:17,y2:29,style:{transform:"rotate(".concat(30*e+(e<6?180:-180),"deg)"),"animation-delay":t*e/n-t+"ms"}}}},"lines-small":{dur:1e3,lines:12,fn:function(t,e,n){return{y1:12,y2:20,style:{transform:"rotate(".concat(30*e+(e<6?180:-180),"deg)"),"animation-delay":t*e/n-t+"ms"}}}}}},61269:function(t,n,r){r.d(n,{c:function(){return c},g:function(){return u},h:function(){return a},o:function(){return f}});var o,i=r(8239),a=function(t,e){return null!==e.closest(t)},c=function(t,e){return"string"==typeof t&&t.length>0?Object.assign((n={"ion-color":!0},r="ion-color-".concat(t),o=!0,r in n?Object.defineProperty(n,r,{value:o,enumerable:!0,configurable:!0,writable:!0}):n[r]=o,n),e):e;var n,r,o},u=function(t){var e={};return function(t){return void 0!==t?(Array.isArray(t)?t:t.split(" ")).filter(function(t){return null!=t}).map(function(t){return t.trim()}).filter(function(t){return""!==t}):[]}(t).forEach(function(t){return e[t]=!0}),e},s=/^[a-z][a-z0-9+\-.]*:/,f=(o=(0,i.Z)(e().mark(function t(n,r,o,i){var a;return e().wrap(function(t){for(;;)switch(t.prev=t.next){case 0:if(null==n||"#"===n[0]||s.test(n)){t.next=4;break}if(!(a=document.querySelector("ion-router"))){t.next=4;break}return t.abrupt("return",(null!=r&&r.preventDefault(),a.push(n,o,i)));case 4:return t.abrupt("return",!1);case 5:case"end":return t.stop()}},t)})),function(t,e,n,r){return o.apply(this,arguments)})}}])}();