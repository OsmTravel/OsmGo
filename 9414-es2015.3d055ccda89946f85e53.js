"use strict";(self.webpackChunkosm_go=self.webpackChunkosm_go||[]).push([[9414],{49414:function(t,r,e){e.r(r),e.d(r,{HapticsWeb:function(){return o}});var n=e(8239),i=e(68384),a=e(54789);class o extends i.Uw{constructor(){super(...arguments),this.selectionStarted=!1}impact(t){var r=this;return(0,n.Z)(function*(){const e=r.patternForImpact(null==t?void 0:t.style);r.vibrateWithPattern(e)})()}notification(t){var r=this;return(0,n.Z)(function*(){const e=r.patternForNotification(null==t?void 0:t.type);r.vibrateWithPattern(e)})()}vibrate(t){var r=this;return(0,n.Z)(function*(){r.vibrateWithPattern([(null==t?void 0:t.duration)||300])})()}selectionStart(){var t=this;return(0,n.Z)(function*(){t.selectionStarted=!0})()}selectionChanged(){var t=this;return(0,n.Z)(function*(){t.selectionStarted&&t.vibrateWithPattern([70])})()}selectionEnd(){var t=this;return(0,n.Z)(function*(){t.selectionStarted=!1})()}patternForImpact(t=a.y$.Heavy){return t===a.y$.Medium?[43]:t===a.y$.Light?[20]:[61]}patternForNotification(t=a.k$.Success){return t===a.k$.Warning?[30,40,30,50,60]:t===a.k$.Error?[27,45,50]:[35,65,21]}vibrateWithPattern(t){if(!navigator.vibrate)throw this.unavailable("Browser does not support the vibrate API");navigator.vibrate(t)}}}}]);