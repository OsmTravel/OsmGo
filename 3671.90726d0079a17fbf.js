"use strict";(self.webpackChunkapp=self.webpackChunkapp||[]).push([[3671],{3671:(u,o,n)=>{n.r(o),n.d(o,{Browser:()=>_,BrowserWeb:()=>l});var r=n(5861),t=n(2726);class l extends t.Uw{constructor(){super(),this._lastWindow=null}open(s){var e=this;return(0,r.Z)(function*(){e._lastWindow=window.open(s.url,s.windowName||"_blank")})()}close(){var s=this;return(0,r.Z)(function*(){return new Promise((e,a)=>{null!=s._lastWindow?(s._lastWindow.close(),s._lastWindow=null,e()):a("No active window to close!")})})()}}const _=new l}}]);