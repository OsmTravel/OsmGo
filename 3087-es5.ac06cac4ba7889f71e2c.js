!function(){"use strict";function t(t,n,e){return n in t?Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[n]=e,t}function n(){/*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */n=function(){return t};var t={},e=Object.prototype,i=e.hasOwnProperty,r="function"==typeof Symbol?Symbol:{},o=r.iterator||"@@iterator",l=r.asyncIterator||"@@asyncIterator",s=r.toStringTag||"@@toStringTag";function a(t,n,e){return Object.defineProperty(t,n,{value:e,enumerable:!0,configurable:!0,writable:!0}),t[n]}try{a({},"")}catch(P){a=function(t,n,e){return t[n]=e}}function c(t,n,e,i){var r=n&&n.prototype instanceof h?n:h,o=Object.create(r.prototype),l=new L(i||[]);return o._invoke=function(t,n,e){var i="suspendedStart";return function(r,o){if("executing"===i)throw new Error("Generator is already running");if("completed"===i){if("throw"===r)throw o;return S()}for(e.method=r,e.arg=o;;){var l=e.delegate;if(l){var s=w(l,e);if(s){if(s===f)continue;return s}}if("next"===e.method)e.sent=e._sent=e.arg;else if("throw"===e.method){if("suspendedStart"===i)throw i="completed",e.arg;e.dispatchException(e.arg)}else"return"===e.method&&e.abrupt("return",e.arg);i="executing";var a=u(t,n,e);if("normal"===a.type){if(i=e.done?"completed":"suspendedYield",a.arg===f)continue;return{value:a.arg,done:e.done}}"throw"===a.type&&(i="completed",e.method="throw",e.arg=a.arg)}}}(t,e,l),o}function u(t,n,e){try{return{type:"normal",arg:t.call(n,e)}}catch(P){return{type:"throw",arg:P}}}t.wrap=c;var f={};function h(){}function d(){}function p(){}var g={};a(g,o,function(){return this});var m=Object.getPrototypeOf,v=m&&m(m(_([])));v&&v!==e&&i.call(v,o)&&(g=v);var y=p.prototype=h.prototype=Object.create(g);function b(t){["next","throw","return"].forEach(function(n){a(t,n,function(t){return this._invoke(n,t)})})}function x(t,n){function e(r,o,l,s){var a=u(t[r],t,o);if("throw"!==a.type){var c=a.arg,f=c.value;return f&&"object"==typeof f&&i.call(f,"__await")?n.resolve(f.__await).then(function(t){e("next",t,l,s)},function(t){e("throw",t,l,s)}):n.resolve(f).then(function(t){c.value=t,l(c)},function(t){return e("throw",t,l,s)})}s(a.arg)}var r;this._invoke=function(t,i){function o(){return new n(function(n,r){e(t,i,n,r)})}return r=r?r.then(o,o):o()}}function w(t,n){var e=t.iterator[n.method];if(void 0===e){if(n.delegate=null,"throw"===n.method){if(t.iterator.return&&(n.method="return",n.arg=void 0,w(t,n),"throw"===n.method))return f;n.method="throw",n.arg=new TypeError("The iterator does not provide a 'throw' method")}return f}var i=u(e,t.iterator,n.arg);if("throw"===i.type)return n.method="throw",n.arg=i.arg,n.delegate=null,f;var r=i.arg;return r?r.done?(n[t.resultName]=r.value,n.next=t.nextLoc,"return"!==n.method&&(n.method="next",n.arg=void 0),n.delegate=null,f):r:(n.method="throw",n.arg=new TypeError("iterator result is not an object"),n.delegate=null,f)}function k(t){var n={tryLoc:t[0]};1 in t&&(n.catchLoc=t[1]),2 in t&&(n.finallyLoc=t[2],n.afterLoc=t[3]),this.tryEntries.push(n)}function E(t){var n=t.completion||{};n.type="normal",delete n.arg,t.completion=n}function L(t){this.tryEntries=[{tryLoc:"root"}],t.forEach(k,this),this.reset(!0)}function _(t){if(t){var n=t[o];if(n)return n.call(t);if("function"==typeof t.next)return t;if(!isNaN(t.length)){var e=-1,r=function n(){for(;++e<t.length;)if(i.call(t,e))return n.value=t[e],n.done=!1,n;return n.value=void 0,n.done=!0,n};return r.next=r}}return{next:S}}function S(){return{value:void 0,done:!0}}return d.prototype=p,a(y,"constructor",p),a(p,"constructor",d),d.displayName=a(p,s,"GeneratorFunction"),t.isGeneratorFunction=function(t){var n="function"==typeof t&&t.constructor;return!!n&&(n===d||"GeneratorFunction"===(n.displayName||n.name))},t.mark=function(t){return Object.setPrototypeOf?Object.setPrototypeOf(t,p):(t.__proto__=p,a(t,s,"GeneratorFunction")),t.prototype=Object.create(y),t},t.awrap=function(t){return{__await:t}},b(x.prototype),a(x.prototype,l,function(){return this}),t.AsyncIterator=x,t.async=function(n,e,i,r,o){void 0===o&&(o=Promise);var l=new x(c(n,e,i,r),o);return t.isGeneratorFunction(e)?l:l.next().then(function(t){return t.done?t.value:l.next()})},b(y),a(y,s,"Generator"),a(y,o,function(){return this}),a(y,"toString",function(){return"[object Generator]"}),t.keys=function(t){var n=[];for(var e in t)n.push(e);return n.reverse(),function e(){for(;n.length;){var i=n.pop();if(i in t)return e.value=i,e.done=!1,e}return e.done=!0,e}},t.values=_,L.prototype={constructor:L,reset:function(t){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(E),!t)for(var n in this)"t"===n.charAt(0)&&i.call(this,n)&&!isNaN(+n.slice(1))&&(this[n]=void 0)},stop:function(){this.done=!0;var t=this.tryEntries[0].completion;if("throw"===t.type)throw t.arg;return this.rval},dispatchException:function(t){if(this.done)throw t;var n=this;function e(e,i){return l.type="throw",l.arg=t,n.next=e,i&&(n.method="next",n.arg=void 0),!!i}for(var r=this.tryEntries.length-1;r>=0;--r){var o=this.tryEntries[r],l=o.completion;if("root"===o.tryLoc)return e("end");if(o.tryLoc<=this.prev){var s=i.call(o,"catchLoc"),a=i.call(o,"finallyLoc");if(s&&a){if(this.prev<o.catchLoc)return e(o.catchLoc,!0);if(this.prev<o.finallyLoc)return e(o.finallyLoc)}else if(s){if(this.prev<o.catchLoc)return e(o.catchLoc,!0)}else{if(!a)throw new Error("try statement without catch or finally");if(this.prev<o.finallyLoc)return e(o.finallyLoc)}}}},abrupt:function(t,n){for(var e=this.tryEntries.length-1;e>=0;--e){var r=this.tryEntries[e];if(r.tryLoc<=this.prev&&i.call(r,"finallyLoc")&&this.prev<r.finallyLoc){var o=r;break}}o&&("break"===t||"continue"===t)&&o.tryLoc<=n&&n<=o.finallyLoc&&(o=null);var l=o?o.completion:{};return l.type=t,l.arg=n,o?(this.method="next",this.next=o.finallyLoc,f):this.complete(l)},complete:function(t,n){if("throw"===t.type)throw t.arg;return"break"===t.type||"continue"===t.type?this.next=t.arg:"return"===t.type?(this.rval=this.arg=t.arg,this.method="return",this.next="end"):"normal"===t.type&&n&&(this.next=n),f},finish:function(t){for(var n=this.tryEntries.length-1;n>=0;--n){var e=this.tryEntries[n];if(e.finallyLoc===t)return this.complete(e.completion,e.afterLoc),E(e),f}},catch:function(t){for(var n=this.tryEntries.length-1;n>=0;--n){var e=this.tryEntries[n];if(e.tryLoc===t){var i=e.completion;if("throw"===i.type){var r=i.arg;E(e)}return r}}throw new Error("illegal catch attempt")},delegateYield:function(t,n,e){return this.delegate={iterator:_(t),resultName:n,nextLoc:e},"next"===this.method&&(this.arg=void 0),f}},t}function e(t,n){if(!(t instanceof n))throw new TypeError("Cannot call a class as a function")}function i(t,n){for(var e=0;e<n.length;e++){var i=n[e];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(t,i.key,i)}}function r(t,n,e){return n&&i(t.prototype,n),e&&i(t,e),Object.defineProperty(t,"prototype",{writable:!1}),t}(self.webpackChunkosm_go=self.webpackChunkosm_go||[]).push([[3087],{33087:function(i,o,l){l.r(o),l.d(o,{ion_infinite_scroll:function(){return f},ion_infinite_scroll_content:function(){return h}});var s=l(8239),a=l(23150),c=l(97585),u=l(66575),f=function(){function i(t){var n=this;e(this,i),(0,a.r)(this,t),this.ionInfinite=(0,a.e)(this,"ionInfinite",7),this.thrPx=0,this.thrPc=0,this.didFire=!1,this.isBusy=!1,this.isLoading=!1,this.threshold="15%",this.disabled=!1,this.position="bottom",this.onScroll=function(){var t=n.scrollEl;if(!t||!n.canStart())return 1;var e=n.el.offsetHeight;if(0===e)return 2;var i=t.scrollTop,r=t.offsetHeight,o=0!==n.thrPc?r*n.thrPc:n.thrPx;if(("bottom"===n.position?t.scrollHeight-e-i-o-r:i-e-o)<0){if(!n.didFire)return n.isLoading=!0,n.didFire=!0,n.ionInfinite.emit(),3}else n.didFire=!1;return 4}}return r(i,[{key:"thresholdChanged",value:function(){var t=this.threshold;t.lastIndexOf("%")>-1?(this.thrPx=0,this.thrPc=parseFloat(t)/100):(this.thrPx=parseFloat(t),this.thrPc=0)}},{key:"disabledChanged",value:function(){var t=this.disabled;t&&(this.isLoading=!1,this.isBusy=!1),this.enableScrollEvents(!t)}},{key:"connectedCallback",value:function(){var t=this;return(0,s.Z)(n().mark(function e(){var i;return n().wrap(function(n){for(;;)switch(n.prev=n.next){case 0:if(!(i=t.el.closest("ion-content"))){n.next=10;break}return n.next=4,i.getScrollElement();case 4:t.scrollEl=n.sent,t.thresholdChanged(),t.disabledChanged(),"top"===t.position&&(0,a.c)(function(){t.scrollEl&&(t.scrollEl.scrollTop=t.scrollEl.scrollHeight-t.scrollEl.clientHeight)}),n.next=11;break;case 10:console.error("<ion-infinite-scroll> must be used inside an <ion-content>");case 11:case"end":return n.stop()}},e)}))()}},{key:"disconnectedCallback",value:function(){this.enableScrollEvents(!1),this.scrollEl=void 0}},{key:"complete",value:function(){var t=this;return(0,s.Z)(n().mark(function e(){var i,r;return n().wrap(function(n){for(;;)switch(n.prev=n.next){case 0:i=t.scrollEl,t.isLoading&&i&&(t.isLoading=!1,"top"===t.position)&&(t.isBusy=!0,r=i.scrollHeight-i.scrollTop,requestAnimationFrame(function(){(0,a.f)(function(){var n=i.scrollHeight-r;requestAnimationFrame(function(){(0,a.c)(function(){i.scrollTop=n,t.isBusy=!1})})})}));case 2:case"end":return n.stop()}},e)}))()}},{key:"canStart",value:function(){return!(this.disabled||this.isBusy||!this.scrollEl||this.isLoading)}},{key:"enableScrollEvents",value:function(t){this.scrollEl&&(t?this.scrollEl.addEventListener("scroll",this.onScroll):this.scrollEl.removeEventListener("scroll",this.onScroll))}},{key:"render",value:function(){var n,e=(0,c.b)(this);return(0,a.h)(a.H,{class:(n={},t(n,e,!0),t(n,"infinite-scroll-loading",this.isLoading),t(n,"infinite-scroll-enabled",!this.disabled),n)})}},{key:"el",get:function(){return(0,a.i)(this)}}],[{key:"watchers",get:function(){return{threshold:["thresholdChanged"],disabled:["disabledChanged"]}}}]),i}();f.style="ion-infinite-scroll{display:none;width:100%}.infinite-scroll-enabled{display:block}";var h=function(){function n(t){e(this,n),(0,a.r)(this,t)}return r(n,[{key:"componentDidLoad",value:function(){if(void 0===this.loadingSpinner){var t=(0,c.b)(this);this.loadingSpinner=c.c.get("infiniteLoadingSpinner",c.c.get("spinner","ios"===t?"lines":"crescent"))}}},{key:"render",value:function(){var n,e=(0,c.b)(this);return(0,a.h)(a.H,{class:(n={},t(n,e,!0),t(n,"infinite-scroll-content-".concat(e),!0),n)},(0,a.h)("div",{class:"infinite-loading"},this.loadingSpinner&&(0,a.h)("div",{class:"infinite-loading-spinner"},(0,a.h)("ion-spinner",{name:this.loadingSpinner})),this.loadingText&&(0,a.h)("div",{class:"infinite-loading-text",innerHTML:(0,u.s)(this.loadingText)})))}}]),n}();h.style={ios:"ion-infinite-scroll-content{display:-ms-flexbox;display:flex;-ms-flex-direction:column;flex-direction:column;-ms-flex-pack:center;justify-content:center;min-height:84px;text-align:center;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.infinite-loading{margin-left:0;margin-right:0;margin-top:0;margin-bottom:32px;display:none;width:100%}.infinite-loading-text{margin-left:32px;margin-right:32px;margin-top:4px;margin-bottom:0}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.infinite-loading-text{margin-left:unset;margin-right:unset;-webkit-margin-start:32px;margin-inline-start:32px;-webkit-margin-end:32px;margin-inline-end:32px}}.infinite-scroll-loading ion-infinite-scroll-content>.infinite-loading{display:block}.infinite-scroll-content-ios .infinite-loading-text{color:var(--ion-color-step-600, #666666)}.infinite-scroll-content-ios .infinite-loading-spinner .spinner-lines-ios line,.infinite-scroll-content-ios .infinite-loading-spinner .spinner-lines-small-ios line,.infinite-scroll-content-ios .infinite-loading-spinner .spinner-crescent circle{stroke:var(--ion-color-step-600, #666666)}.infinite-scroll-content-ios .infinite-loading-spinner .spinner-bubbles circle,.infinite-scroll-content-ios .infinite-loading-spinner .spinner-circles circle,.infinite-scroll-content-ios .infinite-loading-spinner .spinner-dots circle{fill:var(--ion-color-step-600, #666666)}",md:"ion-infinite-scroll-content{display:-ms-flexbox;display:flex;-ms-flex-direction:column;flex-direction:column;-ms-flex-pack:center;justify-content:center;min-height:84px;text-align:center;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.infinite-loading{margin-left:0;margin-right:0;margin-top:0;margin-bottom:32px;display:none;width:100%}.infinite-loading-text{margin-left:32px;margin-right:32px;margin-top:4px;margin-bottom:0}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.infinite-loading-text{margin-left:unset;margin-right:unset;-webkit-margin-start:32px;margin-inline-start:32px;-webkit-margin-end:32px;margin-inline-end:32px}}.infinite-scroll-loading ion-infinite-scroll-content>.infinite-loading{display:block}.infinite-scroll-content-md .infinite-loading-text{color:var(--ion-color-step-600, #666666)}.infinite-scroll-content-md .infinite-loading-spinner .spinner-lines-md line,.infinite-scroll-content-md .infinite-loading-spinner .spinner-lines-small-md line,.infinite-scroll-content-md .infinite-loading-spinner .spinner-crescent circle{stroke:var(--ion-color-step-600, #666666)}.infinite-scroll-content-md .infinite-loading-spinner .spinner-bubbles circle,.infinite-scroll-content-md .infinite-loading-spinner .spinner-circles circle,.infinite-scroll-content-md .infinite-loading-spinner .spinner-dots circle{fill:var(--ion-color-step-600, #666666)}"}}}])}();