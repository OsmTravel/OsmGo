!function(){"use strict";function r(r,e,a){return e in r?Object.defineProperty(r,e,{value:a,enumerable:!0,configurable:!0,writable:!0}):r[e]=a,r}function e(){/*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/facebook/regenerator/blob/main/LICENSE */e=function(){return r};var r={},a=Object.prototype,t=a.hasOwnProperty,o="function"==typeof Symbol?Symbol:{},n=o.iterator||"@@iterator",i=o.asyncIterator||"@@asyncIterator",c=o.toStringTag||"@@toStringTag";function s(r,e,a){return Object.defineProperty(r,e,{value:a,enumerable:!0,configurable:!0,writable:!0}),r[e]}try{s({},"")}catch(I){s=function(r,e,a){return r[e]=a}}function h(r,e,a,t){var o=e&&e.prototype instanceof d?e:d,n=Object.create(o.prototype),i=new L(t||[]);return n._invoke=function(r,e,a){var t="suspendedStart";return function(o,n){if("executing"===t)throw new Error("Generator is already running");if("completed"===t){if("throw"===o)throw n;return E()}for(a.method=o,a.arg=n;;){var i=a.delegate;if(i){var c=x(i,a);if(c){if(c===b)continue;return c}}if("next"===a.method)a.sent=a._sent=a.arg;else if("throw"===a.method){if("suspendedStart"===t)throw t="completed",a.arg;a.dispatchException(a.arg)}else"return"===a.method&&a.abrupt("return",a.arg);t="executing";var s=l(r,e,a);if("normal"===s.type){if(t=a.done?"completed":"suspendedYield",s.arg===b)continue;return{value:s.arg,done:a.done}}"throw"===s.type&&(t="completed",a.method="throw",a.arg=s.arg)}}}(r,a,i),n}function l(r,e,a){try{return{type:"normal",arg:r.call(e,a)}}catch(I){return{type:"throw",arg:I}}}r.wrap=h;var b={};function d(){}function u(){}function p(){}var f={};s(f,n,function(){return this});var g=Object.getPrototypeOf,m=g&&g(g(B([])));m&&m!==a&&t.call(m,n)&&(f=m);var v=p.prototype=d.prototype=Object.create(f);function y(r){["next","throw","return"].forEach(function(e){s(r,e,function(r){return this._invoke(e,r)})})}function w(r,e){function a(o,n,i,c){var s=l(r[o],r,n);if("throw"!==s.type){var h=s.arg,b=h.value;return b&&"object"==typeof b&&t.call(b,"__await")?e.resolve(b.__await).then(function(r){a("next",r,i,c)},function(r){a("throw",r,i,c)}):e.resolve(b).then(function(r){h.value=r,i(h)},function(r){return a("throw",r,i,c)})}c(s.arg)}var o;this._invoke=function(r,t){function n(){return new e(function(e,o){a(r,t,e,o)})}return o=o?o.then(n,n):n()}}function x(r,e){var a=r.iterator[e.method];if(void 0===a){if(e.delegate=null,"throw"===e.method){if(r.iterator.return&&(e.method="return",e.arg=void 0,x(r,e),"throw"===e.method))return b;e.method="throw",e.arg=new TypeError("The iterator does not provide a 'throw' method")}return b}var t=l(a,r.iterator,e.arg);if("throw"===t.type)return e.method="throw",e.arg=t.arg,e.delegate=null,b;var o=t.arg;return o?o.done?(e[r.resultName]=o.value,e.next=r.nextLoc,"return"!==e.method&&(e.method="next",e.arg=void 0),e.delegate=null,b):o:(e.method="throw",e.arg=new TypeError("iterator result is not an object"),e.delegate=null,b)}function k(r){var e={tryLoc:r[0]};1 in r&&(e.catchLoc=r[1]),2 in r&&(e.finallyLoc=r[2],e.afterLoc=r[3]),this.tryEntries.push(e)}function C(r){var e=r.completion||{};e.type="normal",delete e.arg,r.completion=e}function L(r){this.tryEntries=[{tryLoc:"root"}],r.forEach(k,this),this.reset(!0)}function B(r){if(r){var e=r[n];if(e)return e.call(r);if("function"==typeof r.next)return r;if(!isNaN(r.length)){var a=-1,o=function e(){for(;++a<r.length;)if(t.call(r,a))return e.value=r[a],e.done=!1,e;return e.value=void 0,e.done=!0,e};return o.next=o}}return{next:E}}function E(){return{value:void 0,done:!0}}return u.prototype=p,s(v,"constructor",p),s(p,"constructor",u),u.displayName=s(p,c,"GeneratorFunction"),r.isGeneratorFunction=function(r){var e="function"==typeof r&&r.constructor;return!!e&&(e===u||"GeneratorFunction"===(e.displayName||e.name))},r.mark=function(r){return Object.setPrototypeOf?Object.setPrototypeOf(r,p):(r.__proto__=p,s(r,c,"GeneratorFunction")),r.prototype=Object.create(v),r},r.awrap=function(r){return{__await:r}},y(w.prototype),s(w.prototype,i,function(){return this}),r.AsyncIterator=w,r.async=function(e,a,t,o,n){void 0===n&&(n=Promise);var i=new w(h(e,a,t,o),n);return r.isGeneratorFunction(a)?i:i.next().then(function(r){return r.done?r.value:i.next()})},y(v),s(v,c,"Generator"),s(v,n,function(){return this}),s(v,"toString",function(){return"[object Generator]"}),r.keys=function(r){var e=[];for(var a in r)e.push(a);return e.reverse(),function a(){for(;e.length;){var t=e.pop();if(t in r)return a.value=t,a.done=!1,a}return a.done=!0,a}},r.values=B,L.prototype={constructor:L,reset:function(r){if(this.prev=0,this.next=0,this.sent=this._sent=void 0,this.done=!1,this.delegate=null,this.method="next",this.arg=void 0,this.tryEntries.forEach(C),!r)for(var e in this)"t"===e.charAt(0)&&t.call(this,e)&&!isNaN(+e.slice(1))&&(this[e]=void 0)},stop:function(){this.done=!0;var r=this.tryEntries[0].completion;if("throw"===r.type)throw r.arg;return this.rval},dispatchException:function(r){if(this.done)throw r;var e=this;function a(a,t){return i.type="throw",i.arg=r,e.next=a,t&&(e.method="next",e.arg=void 0),!!t}for(var o=this.tryEntries.length-1;o>=0;--o){var n=this.tryEntries[o],i=n.completion;if("root"===n.tryLoc)return a("end");if(n.tryLoc<=this.prev){var c=t.call(n,"catchLoc"),s=t.call(n,"finallyLoc");if(c&&s){if(this.prev<n.catchLoc)return a(n.catchLoc,!0);if(this.prev<n.finallyLoc)return a(n.finallyLoc)}else if(c){if(this.prev<n.catchLoc)return a(n.catchLoc,!0)}else{if(!s)throw new Error("try statement without catch or finally");if(this.prev<n.finallyLoc)return a(n.finallyLoc)}}}},abrupt:function(r,e){for(var a=this.tryEntries.length-1;a>=0;--a){var o=this.tryEntries[a];if(o.tryLoc<=this.prev&&t.call(o,"finallyLoc")&&this.prev<o.finallyLoc){var n=o;break}}n&&("break"===r||"continue"===r)&&n.tryLoc<=e&&e<=n.finallyLoc&&(n=null);var i=n?n.completion:{};return i.type=r,i.arg=e,n?(this.method="next",this.next=n.finallyLoc,b):this.complete(i)},complete:function(r,e){if("throw"===r.type)throw r.arg;return"break"===r.type||"continue"===r.type?this.next=r.arg:"return"===r.type?(this.rval=this.arg=r.arg,this.method="return",this.next="end"):"normal"===r.type&&e&&(this.next=e),b},finish:function(r){for(var e=this.tryEntries.length-1;e>=0;--e){var a=this.tryEntries[e];if(a.finallyLoc===r)return this.complete(a.completion,a.afterLoc),C(a),b}},catch:function(r){for(var e=this.tryEntries.length-1;e>=0;--e){var a=this.tryEntries[e];if(a.tryLoc===r){var t=a.completion;if("throw"===t.type){var o=t.arg;C(a)}return o}}throw new Error("illegal catch attempt")},delegateYield:function(r,e,a){return this.delegate={iterator:B(r),resultName:e,nextLoc:a},"next"===this.method&&(this.arg=void 0),b}},r}function a(r,e){for(var a=0;a<e.length;a++){var t=e[a];t.enumerable=t.enumerable||!1,t.configurable=!0,"value"in t&&(t.writable=!0),Object.defineProperty(r,t.key,t)}}(self.webpackChunkosm_go=self.webpackChunkosm_go||[]).push([[7895],{7895:function(t,o,n){n.r(o),n.d(o,{ion_searchbar:function(){return b}});var i=n(8239),c=n(23150),s=n(97585),h=n(71567),l=n(61269),b=function(){function t(r){var e=this;!function(r,e){if(!(r instanceof e))throw new TypeError("Cannot call a class as a function")}(this,t),(0,c.r)(this,r),this.ionInput=(0,c.e)(this,"ionInput",7),this.ionChange=(0,c.e)(this,"ionChange",7),this.ionCancel=(0,c.e)(this,"ionCancel",7),this.ionClear=(0,c.e)(this,"ionClear",7),this.ionBlur=(0,c.e)(this,"ionBlur",7),this.ionFocus=(0,c.e)(this,"ionFocus",7),this.ionStyle=(0,c.e)(this,"ionStyle",7),this.isCancelVisible=!1,this.shouldAlignLeft=!0,this.focused=!1,this.noAnimate=!0,this.animated=!1,this.autocomplete="off",this.autocorrect="off",this.cancelButtonIcon=s.c.get("backButtonIcon","arrow-back-sharp"),this.cancelButtonText="Cancel",this.debounce=250,this.disabled=!1,this.placeholder="Search",this.showCancelButton="never",this.showClearButton="focus",this.spellcheck=!1,this.type="search",this.value="",this.onClearInput=function(r,a){e.ionClear.emit(),r&&(r.preventDefault(),r.stopPropagation()),setTimeout(function(){""!==e.getValue()&&(e.value="",e.ionInput.emit(),a&&!e.focused&&e.setFocus())},64)},this.onCancelSearchbar=function(r){r&&(r.preventDefault(),r.stopPropagation()),e.ionCancel.emit(),e.onClearInput(),e.nativeInput&&e.nativeInput.blur()},this.onInput=function(r){var a=r.target;a&&(e.value=a.value),e.ionInput.emit(r)},this.onBlur=function(){e.focused=!1,e.ionBlur.emit(),e.positionElements()},this.onFocus=function(){e.focused=!0,e.ionFocus.emit(),e.positionElements()}}var o,n,b;return o=t,b=[{key:"watchers",get:function(){return{debounce:["debounceChanged"],value:["valueChanged"],showCancelButton:["showCancelButtonChanged"]}}}],(n=[{key:"debounceChanged",value:function(){this.ionChange=(0,h.f)(this.ionChange,this.debounce)}},{key:"valueChanged",value:function(){var r=this.nativeInput,e=this.getValue();r&&r.value!==e&&(r.value=e),this.ionChange.emit({value:e})}},{key:"showCancelButtonChanged",value:function(){var r=this;requestAnimationFrame(function(){r.positionElements(),(0,c.j)(r)})}},{key:"connectedCallback",value:function(){this.emitStyle()}},{key:"componentDidLoad",value:function(){var r=this;this.positionElements(),this.debounceChanged(),setTimeout(function(){r.noAnimate=!1},300)}},{key:"emitStyle",value:function(){this.ionStyle.emit({searchbar:!0})}},{key:"setFocus",value:function(){var r=this;return(0,i.Z)(e().mark(function a(){return e().wrap(function(e){for(;;)switch(e.prev=e.next){case 0:r.nativeInput&&r.nativeInput.focus();case 1:case"end":return e.stop()}},a)}))()}},{key:"getInputElement",value:function(){return Promise.resolve(this.nativeInput)}},{key:"positionElements",value:function(){var r=this.getValue(),e=this.shouldAlignLeft,a=(0,s.b)(this),t=!this.animated||""!==r.trim()||!!this.focused;this.shouldAlignLeft=t,"ios"===a&&(e!==t&&this.positionPlaceholder(),this.animated&&this.positionCancelButton())}},{key:"positionPlaceholder",value:function(){var r=this.nativeInput;if(r){var e="rtl"===document.dir,a=(this.el.shadowRoot||this.el).querySelector(".searchbar-search-icon");if(this.shouldAlignLeft)r.removeAttribute("style"),a.removeAttribute("style");else{var t=document,o=t.createElement("span");o.innerText=this.placeholder||"",t.body.appendChild(o),(0,h.r)(function(){var t=o.offsetWidth;o.remove();var n="calc(50% - "+t/2+"px)",i="calc(50% - "+(t/2+30)+"px)";e?(r.style.paddingRight=n,a.style.marginRight=i):(r.style.paddingLeft=n,a.style.marginLeft=i)})}}}},{key:"positionCancelButton",value:function(){var r="rtl"===document.dir,e=(this.el.shadowRoot||this.el).querySelector(".searchbar-cancel-button"),a=this.shouldShowCancelButton();if(e&&a!==this.isCancelVisible){var t=e.style;if(this.isCancelVisible=a,a)r?t.marginLeft="0":t.marginRight="0";else{var o=e.offsetWidth;o>0&&(r?t.marginLeft=-o+"px":t.marginRight=-o+"px")}}}},{key:"getValue",value:function(){return this.value||""}},{key:"hasValue",value:function(){return""!==this.getValue()}},{key:"shouldShowCancelButton",value:function(){return!("never"===this.showCancelButton||"focus"===this.showCancelButton&&!this.focused)}},{key:"shouldShowClearButton",value:function(){return!("never"===this.showClearButton||"focus"===this.showClearButton&&!this.focused)}},{key:"render",value:function(){var e,a=this,t=this.cancelButtonText,o=this.animated&&s.c.getBoolean("animated",!0),n=(0,s.b)(this),i=this.clearIcon||("ios"===n?"close-circle":"close-sharp"),h=this.searchIcon||("ios"===n?"search-outline":"search-sharp"),b=this.shouldShowCancelButton(),d="never"!==this.showCancelButton&&(0,c.h)("button",{"aria-label":t,"aria-hidden":b?void 0:"true",type:"button",tabIndex:"ios"!==n||b?void 0:-1,onMouseDown:this.onCancelSearchbar,onTouchStart:this.onCancelSearchbar,class:"searchbar-cancel-button"},(0,c.h)("div",{"aria-hidden":"true"},"md"===n?(0,c.h)("ion-icon",{"aria-hidden":"true",mode:n,icon:this.cancelButtonIcon,lazy:!1}):t));return(0,c.h)(c.H,{role:"search","aria-disabled":this.disabled?"true":null,class:(0,l.c)(this.color,(e={},r(e,n,!0),r(e,"searchbar-animated",o),r(e,"searchbar-disabled",this.disabled),r(e,"searchbar-no-animate",o&&this.noAnimate),r(e,"searchbar-has-value",this.hasValue()),r(e,"searchbar-left-aligned",this.shouldAlignLeft),r(e,"searchbar-has-focus",this.focused),r(e,"searchbar-should-show-clear",this.shouldShowClearButton()),r(e,"searchbar-should-show-cancel",this.shouldShowCancelButton()),e))},(0,c.h)("div",{class:"searchbar-input-container"},(0,c.h)("input",{"aria-label":"search text",disabled:this.disabled,ref:function(r){return a.nativeInput=r},class:"searchbar-input",inputMode:this.inputmode,enterKeyHint:this.enterkeyhint,onInput:this.onInput,onBlur:this.onBlur,onFocus:this.onFocus,placeholder:this.placeholder,type:this.type,value:this.getValue(),autoComplete:this.autocomplete,autoCorrect:this.autocorrect,spellcheck:this.spellcheck}),"md"===n&&d,(0,c.h)("ion-icon",{"aria-hidden":"true",mode:n,icon:h,lazy:!1,class:"searchbar-search-icon"}),(0,c.h)("button",{"aria-label":"reset",type:"button","no-blur":!0,class:"searchbar-clear-button",onMouseDown:function(r){return a.onClearInput(r,!0)},onTouchStart:function(r){return a.onClearInput(r,!0)}},(0,c.h)("ion-icon",{"aria-hidden":"true",mode:n,icon:i,lazy:!1,class:"searchbar-clear-icon"}))),"ios"===n&&d)}},{key:"el",get:function(){return(0,c.i)(this)}}])&&a(o.prototype,n),b&&a(o,b),Object.defineProperty(o,"prototype",{writable:!1}),t}();b.style={ios:".sc-ion-searchbar-ios-h{--placeholder-color:initial;--placeholder-font-style:initial;--placeholder-font-weight:initial;--placeholder-opacity:.5;-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;display:-ms-flexbox;display:flex;position:relative;-ms-flex-align:center;align-items:center;width:100%;color:var(--color);font-family:var(--ion-font-family, inherit);-webkit-box-sizing:border-box;box-sizing:border-box}.ion-color.sc-ion-searchbar-ios-h{color:var(--ion-color-contrast)}.ion-color.sc-ion-searchbar-ios-h .searchbar-input.sc-ion-searchbar-ios{background:var(--ion-color-base)}.ion-color.sc-ion-searchbar-ios-h .searchbar-clear-button.sc-ion-searchbar-ios,.ion-color.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios,.ion-color.sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios{color:inherit}.searchbar-search-icon.sc-ion-searchbar-ios{color:var(--icon-color);pointer-events:none}.searchbar-input-container.sc-ion-searchbar-ios{display:block;position:relative;-ms-flex-negative:1;flex-shrink:1;width:100%}.searchbar-input.sc-ion-searchbar-ios{font-family:inherit;font-size:inherit;font-style:inherit;font-weight:inherit;letter-spacing:inherit;text-decoration:inherit;text-indent:inherit;text-overflow:inherit;text-transform:inherit;text-align:inherit;white-space:inherit;color:inherit;border-radius:var(--border-radius);display:block;width:100%;border:0;outline:none;background:var(--background);font-family:inherit;-webkit-box-shadow:var(--box-shadow);box-shadow:var(--box-shadow);-webkit-box-sizing:border-box;box-sizing:border-box;-webkit-appearance:none;-moz-appearance:none;appearance:none}.searchbar-input.sc-ion-searchbar-ios::-webkit-input-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-ios::-moz-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-ios:-ms-input-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-ios::-ms-input-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-ios::placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-ios::-webkit-search-cancel-button,.searchbar-input.sc-ion-searchbar-ios::-ms-clear{display:none}.searchbar-cancel-button.sc-ion-searchbar-ios{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0;display:none;height:100%;border:0;outline:none;color:var(--cancel-button-color);cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none}.searchbar-cancel-button.sc-ion-searchbar-ios>div.sc-ion-searchbar-ios{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center;width:100%;height:100%}.searchbar-clear-button.sc-ion-searchbar-ios{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0;padding-left:0;padding-right:0;padding-top:0;padding-bottom:0;display:none;min-height:0;outline:none;color:var(--clear-button-color);-webkit-appearance:none;-moz-appearance:none;appearance:none}.searchbar-has-value.searchbar-should-show-clear.sc-ion-searchbar-ios-h .searchbar-clear-button.sc-ion-searchbar-ios{display:block}.searchbar-disabled.sc-ion-searchbar-ios-h{cursor:default;opacity:0.4;pointer-events:none}.sc-ion-searchbar-ios-h{--background:rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.07);--border-radius:10px;--box-shadow:none;--cancel-button-color:var(--ion-color-primary, #3880ff);--clear-button-color:var(--ion-color-step-600, #666666);--color:var(--ion-text-color, #000);--icon-color:var(--ion-color-step-600, #666666);padding-left:12px;padding-right:12px;padding-top:12px;padding-bottom:12px;height:60px;contain:strict}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.sc-ion-searchbar-ios-h{padding-left:unset;padding-right:unset;-webkit-padding-start:12px;padding-inline-start:12px;-webkit-padding-end:12px;padding-inline-end:12px}}.searchbar-input-container.sc-ion-searchbar-ios{height:36px}.searchbar-search-icon.sc-ion-searchbar-ios{margin-left:calc(50% - 60px);left:5px;top:0;position:absolute;width:22px;height:100%;contain:strict}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.searchbar-search-icon.sc-ion-searchbar-ios{margin-left:unset;-webkit-margin-start:calc(50% - 60px);margin-inline-start:calc(50% - 60px)}}[dir=rtl].sc-ion-searchbar-ios .searchbar-search-icon.sc-ion-searchbar-ios,[dir=rtl].sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios,[dir=rtl] .sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios{left:unset;right:unset;right:5px}.searchbar-input.sc-ion-searchbar-ios{padding-left:28px;padding-right:28px;padding-top:0;padding-bottom:0;height:100%;font-size:17px;font-weight:400;contain:strict}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.searchbar-input.sc-ion-searchbar-ios{padding-left:unset;padding-right:unset;-webkit-padding-start:28px;padding-inline-start:28px;-webkit-padding-end:28px;padding-inline-end:28px}}.searchbar-clear-button.sc-ion-searchbar-ios{right:0;top:0;background-position:center;position:absolute;width:30px;height:100%;border:0;background-color:transparent}[dir=rtl].sc-ion-searchbar-ios .searchbar-clear-button.sc-ion-searchbar-ios,[dir=rtl].sc-ion-searchbar-ios-h .searchbar-clear-button.sc-ion-searchbar-ios,[dir=rtl] .sc-ion-searchbar-ios-h .searchbar-clear-button.sc-ion-searchbar-ios{left:unset;right:unset;left:0}.searchbar-clear-icon.sc-ion-searchbar-ios{width:18px;height:100%}.searchbar-cancel-button.sc-ion-searchbar-ios{padding-left:8px;padding-right:0;padding-top:0;padding-bottom:0;-ms-flex-negative:0;flex-shrink:0;background-color:transparent;font-size:16px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.searchbar-cancel-button.sc-ion-searchbar-ios{padding-left:unset;padding-right:unset;-webkit-padding-start:8px;padding-inline-start:8px;-webkit-padding-end:0;padding-inline-end:0}}.searchbar-left-aligned.sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios{margin-left:0}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.searchbar-left-aligned.sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios{margin-left:unset;-webkit-margin-start:0;margin-inline-start:0}}.searchbar-left-aligned.sc-ion-searchbar-ios-h .searchbar-input.sc-ion-searchbar-ios{padding-left:30px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.searchbar-left-aligned.sc-ion-searchbar-ios-h .searchbar-input.sc-ion-searchbar-ios{padding-left:unset;-webkit-padding-start:30px;padding-inline-start:30px}}.searchbar-has-focus.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios,.searchbar-should-show-cancel.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios,.searchbar-animated.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios{display:block}.searchbar-animated.sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios,.searchbar-animated.sc-ion-searchbar-ios-h .searchbar-input.sc-ion-searchbar-ios{-webkit-transition:all 300ms ease;transition:all 300ms ease}.searchbar-animated.searchbar-has-focus.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios,.searchbar-animated.searchbar-should-show-cancel.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios{opacity:1;pointer-events:auto}.searchbar-animated.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios{margin-right:-100%;-webkit-transform:translate3d(0,  0,  0);transform:translate3d(0,  0,  0);-webkit-transition:all 300ms ease;transition:all 300ms ease;opacity:0;pointer-events:none}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.searchbar-animated.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios{margin-right:unset;-webkit-margin-end:-100%;margin-inline-end:-100%}}.searchbar-no-animate.sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios,.searchbar-no-animate.sc-ion-searchbar-ios-h .searchbar-input.sc-ion-searchbar-ios,.searchbar-no-animate.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios{-webkit-transition-duration:0ms;transition-duration:0ms}.ion-color.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios{color:var(--ion-color-base)}@media (any-hover: hover){.ion-color.sc-ion-searchbar-ios-h .searchbar-cancel-button.sc-ion-searchbar-ios:hover{color:var(--ion-color-tint)}}ion-toolbar.sc-ion-searchbar-ios-h,ion-toolbar .sc-ion-searchbar-ios-h{padding-top:1px;padding-bottom:15px;height:52px}ion-toolbar.ion-color.sc-ion-searchbar-ios-h:not(.ion-color),ion-toolbar.ion-color .sc-ion-searchbar-ios-h:not(.ion-color){color:inherit}ion-toolbar.ion-color.sc-ion-searchbar-ios-h:not(.ion-color) .searchbar-cancel-button.sc-ion-searchbar-ios,ion-toolbar.ion-color .sc-ion-searchbar-ios-h:not(.ion-color) .searchbar-cancel-button.sc-ion-searchbar-ios{color:currentColor}ion-toolbar.ion-color.sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios,ion-toolbar.ion-color .sc-ion-searchbar-ios-h .searchbar-search-icon.sc-ion-searchbar-ios{color:currentColor;opacity:0.5}ion-toolbar.ion-color.sc-ion-searchbar-ios-h:not(.ion-color) .searchbar-input.sc-ion-searchbar-ios,ion-toolbar.ion-color .sc-ion-searchbar-ios-h:not(.ion-color) .searchbar-input.sc-ion-searchbar-ios{background:rgba(var(--ion-color-contrast-rgb), 0.07);color:currentColor}ion-toolbar.ion-color.sc-ion-searchbar-ios-h:not(.ion-color) .searchbar-clear-button.sc-ion-searchbar-ios,ion-toolbar.ion-color .sc-ion-searchbar-ios-h:not(.ion-color) .searchbar-clear-button.sc-ion-searchbar-ios{color:currentColor;opacity:0.5}",md:".sc-ion-searchbar-md-h{--placeholder-color:initial;--placeholder-font-style:initial;--placeholder-font-weight:initial;--placeholder-opacity:.5;-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;display:-ms-flexbox;display:flex;position:relative;-ms-flex-align:center;align-items:center;width:100%;color:var(--color);font-family:var(--ion-font-family, inherit);-webkit-box-sizing:border-box;box-sizing:border-box}.ion-color.sc-ion-searchbar-md-h{color:var(--ion-color-contrast)}.ion-color.sc-ion-searchbar-md-h .searchbar-input.sc-ion-searchbar-md{background:var(--ion-color-base)}.ion-color.sc-ion-searchbar-md-h .searchbar-clear-button.sc-ion-searchbar-md,.ion-color.sc-ion-searchbar-md-h .searchbar-cancel-button.sc-ion-searchbar-md,.ion-color.sc-ion-searchbar-md-h .searchbar-search-icon.sc-ion-searchbar-md{color:inherit}.searchbar-search-icon.sc-ion-searchbar-md{color:var(--icon-color);pointer-events:none}.searchbar-input-container.sc-ion-searchbar-md{display:block;position:relative;-ms-flex-negative:1;flex-shrink:1;width:100%}.searchbar-input.sc-ion-searchbar-md{font-family:inherit;font-size:inherit;font-style:inherit;font-weight:inherit;letter-spacing:inherit;text-decoration:inherit;text-indent:inherit;text-overflow:inherit;text-transform:inherit;text-align:inherit;white-space:inherit;color:inherit;border-radius:var(--border-radius);display:block;width:100%;border:0;outline:none;background:var(--background);font-family:inherit;-webkit-box-shadow:var(--box-shadow);box-shadow:var(--box-shadow);-webkit-box-sizing:border-box;box-sizing:border-box;-webkit-appearance:none;-moz-appearance:none;appearance:none}.searchbar-input.sc-ion-searchbar-md::-webkit-input-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-md::-moz-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-md:-ms-input-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-md::-ms-input-placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-md::placeholder{color:var(--placeholder-color);font-family:inherit;font-style:var(--placeholder-font-style);font-weight:var(--placeholder-font-weight);opacity:var(--placeholder-opacity)}.searchbar-input.sc-ion-searchbar-md::-webkit-search-cancel-button,.searchbar-input.sc-ion-searchbar-md::-ms-clear{display:none}.searchbar-cancel-button.sc-ion-searchbar-md{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0;display:none;height:100%;border:0;outline:none;color:var(--cancel-button-color);cursor:pointer;-webkit-appearance:none;-moz-appearance:none;appearance:none}.searchbar-cancel-button.sc-ion-searchbar-md>div.sc-ion-searchbar-md{display:-ms-flexbox;display:flex;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center;width:100%;height:100%}.searchbar-clear-button.sc-ion-searchbar-md{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0;padding-left:0;padding-right:0;padding-top:0;padding-bottom:0;display:none;min-height:0;outline:none;color:var(--clear-button-color);-webkit-appearance:none;-moz-appearance:none;appearance:none}.searchbar-has-value.searchbar-should-show-clear.sc-ion-searchbar-md-h .searchbar-clear-button.sc-ion-searchbar-md{display:block}.searchbar-disabled.sc-ion-searchbar-md-h{cursor:default;opacity:0.4;pointer-events:none}.sc-ion-searchbar-md-h{--background:var(--ion-background-color, #fff);--border-radius:2px;--box-shadow:0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 1px 5px 0 rgba(0, 0, 0, 0.12);--cancel-button-color:var(--ion-color-step-900, #1a1a1a);--clear-button-color:initial;--color:var(--ion-color-step-850, #262626);--icon-color:var(--ion-color-step-600, #666666);padding-left:8px;padding-right:8px;padding-top:8px;padding-bottom:8px;background:inherit}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.sc-ion-searchbar-md-h{padding-left:unset;padding-right:unset;-webkit-padding-start:8px;padding-inline-start:8px;-webkit-padding-end:8px;padding-inline-end:8px}}.searchbar-search-icon.sc-ion-searchbar-md{left:16px;top:11px;width:21px;height:21px}[dir=rtl].sc-ion-searchbar-md .searchbar-search-icon.sc-ion-searchbar-md,[dir=rtl].sc-ion-searchbar-md-h .searchbar-search-icon.sc-ion-searchbar-md,[dir=rtl] .sc-ion-searchbar-md-h .searchbar-search-icon.sc-ion-searchbar-md{left:unset;right:unset;right:16px}.searchbar-cancel-button.sc-ion-searchbar-md{left:5px;top:0;background-color:transparent;font-size:1.6em}[dir=rtl].sc-ion-searchbar-md .searchbar-cancel-button.sc-ion-searchbar-md,[dir=rtl].sc-ion-searchbar-md-h .searchbar-cancel-button.sc-ion-searchbar-md,[dir=rtl] .sc-ion-searchbar-md-h .searchbar-cancel-button.sc-ion-searchbar-md{left:unset;right:unset;right:5px}.searchbar-search-icon.sc-ion-searchbar-md,.searchbar-cancel-button.sc-ion-searchbar-md{position:absolute}.searchbar-search-icon.ion-activated.sc-ion-searchbar-md,.searchbar-cancel-button.ion-activated.sc-ion-searchbar-md{background-color:transparent}.searchbar-input.sc-ion-searchbar-md{padding-left:55px;padding-right:55px;padding-top:6px;padding-bottom:6px;background-position:left 8px center;height:auto;font-size:16px;font-weight:400;line-height:30px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){.searchbar-input.sc-ion-searchbar-md{padding-left:unset;padding-right:unset;-webkit-padding-start:55px;padding-inline-start:55px;-webkit-padding-end:55px;padding-inline-end:55px}}[dir=rtl].sc-ion-searchbar-md .searchbar-input.sc-ion-searchbar-md,[dir=rtl].sc-ion-searchbar-md-h .searchbar-input.sc-ion-searchbar-md,[dir=rtl] .sc-ion-searchbar-md-h .searchbar-input.sc-ion-searchbar-md{background-position:right 8px center}.searchbar-clear-button.sc-ion-searchbar-md{right:13px;top:0;padding-left:0;padding-right:0;padding-top:0;padding-bottom:0;position:absolute;height:100%;border:0;background-color:transparent}[dir=rtl].sc-ion-searchbar-md .searchbar-clear-button.sc-ion-searchbar-md,[dir=rtl].sc-ion-searchbar-md-h .searchbar-clear-button.sc-ion-searchbar-md,[dir=rtl] .sc-ion-searchbar-md-h .searchbar-clear-button.sc-ion-searchbar-md{left:unset;right:unset;left:13px}.searchbar-clear-button.ion-activated.sc-ion-searchbar-md{background-color:transparent}.searchbar-clear-icon.sc-ion-searchbar-md{width:22px;height:100%}.searchbar-has-focus.sc-ion-searchbar-md-h .searchbar-search-icon.sc-ion-searchbar-md{display:block}.searchbar-has-focus.sc-ion-searchbar-md-h .searchbar-cancel-button.sc-ion-searchbar-md,.searchbar-should-show-cancel.sc-ion-searchbar-md-h .searchbar-cancel-button.sc-ion-searchbar-md{display:block}.searchbar-has-focus.sc-ion-searchbar-md-h .searchbar-cancel-button.sc-ion-searchbar-md+.searchbar-search-icon.sc-ion-searchbar-md,.searchbar-should-show-cancel.sc-ion-searchbar-md-h .searchbar-cancel-button.sc-ion-searchbar-md+.searchbar-search-icon.sc-ion-searchbar-md{display:none}ion-toolbar.sc-ion-searchbar-md-h,ion-toolbar .sc-ion-searchbar-md-h{padding-left:7px;padding-right:7px;padding-top:3px;padding-bottom:3px}@supports ((-webkit-margin-start: 0) or (margin-inline-start: 0)) or (-webkit-margin-start: 0){ion-toolbar.sc-ion-searchbar-md-h,ion-toolbar .sc-ion-searchbar-md-h{padding-left:unset;padding-right:unset;-webkit-padding-start:7px;padding-inline-start:7px;-webkit-padding-end:7px;padding-inline-end:7px}}"}}}])}();