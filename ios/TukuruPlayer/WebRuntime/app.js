(()=>{var fn=new DataView(new ArrayBuffer);function O(c){return fn.buffer!==c.buffer&&(fn=new DataView(c.buffer)),fn}function Cn(c){return c>>>0}var de=new TextDecoder("utf-8"),Xn=new TextEncoder("utf-8");function we(c,e,n){if(typeof c!="string")throw new TypeError("expected a string");if(c.length===0)return le=0,1;let s=0,i=0,t=0;for(;c.length>0;){i=e(i,s,1,s+c.length),s+=c.length;let{read:r,written:a}=Xn.encodeInto(c,new Uint8Array(n.buffer,i+t,s-t));t+=a,c=c.slice(r)}return s>t&&(i=e(i,s,1,t)),le=t,i}var le=0,Ae=class{constructor(){this.list=[],this.head=0}insert(e){this.head>=this.list.length&&this.list.push({next:this.list.length+1,val:void 0});let n=this.head,s=this.list[n];return this.head=s.next,s.next=-1,s.val=e,n}get(e){if(e>=this.list.length)throw new RangeError("handle index not valid");let n=this.list[e];if(n.next===-1)return n.val;throw new RangeError("handle index not valid")}remove(e){let n=this.get(e),s=this.list[e];return s.val=void 0,s.next=this.head,this.head=e,n}};function Ne(){throw new RangeError("invalid variant discriminant for bool")}var Ie=class{constructor(){this._resource0_slab=new Ae}addToImports(e){"canonical_abi"in e||(e.canonical_abi={}),e.canonical_abi["resource_drop_rb-abi-value"]=n=>{this._resource0_slab.remove(n).drop()},e.canonical_abi["resource_clone_rb-abi-value"]=n=>{let s=this._resource0_slab.get(n);return this._resource0_slab.insert(s.clone())},e.canonical_abi["resource_get_rb-abi-value"]=n=>this._resource0_slab.get(n)._wasm_val,e.canonical_abi["resource_new_rb-abi-value"]=n=>{let s=this._registry0;return this._resource0_slab.insert(new be(n,this))}}async instantiate(e,n){if(n=n||{},this.addToImports(n),e instanceof WebAssembly.Instance)this.instance=e;else if(e instanceof WebAssembly.Module)this.instance=await WebAssembly.instantiate(e,n);else if(e instanceof ArrayBuffer||e instanceof Uint8Array){let{instance:s}=await WebAssembly.instantiate(e,n);this.instance=s}else{let{instance:s}=await WebAssembly.instantiateStreaming(e,n);this.instance=s}this._exports=this.instance.exports,this._registry0=new FinalizationRegistry(this._exports["canonical_abi_drop_rb-abi-value"])}rubyShowVersion(){this._exports["ruby-show-version: func() -> ()"]()}rubyInit(e){let n=this._exports.memory,s=this._exports.cabi_realloc,i=e,t=i.length,r=s(0,0,4,t*8);for(let a=0;a<i.length;a++){let o=i[a],l=r+a*8,d=we(o,s,n),_=le;O(n).setInt32(l+4,_,!0),O(n).setInt32(l+0,d,!0)}this._exports["ruby-init: func(args: list<string>) -> ()"](r,t)}rubyInitLoadpath(){this._exports["ruby-init-loadpath: func() -> ()"]()}rbEvalStringProtect(e){let n=this._exports.memory,s=this._exports.cabi_realloc,i=we(e,s,n),t=le,r=this._exports["rb-eval-string-protect: func(str: string) -> tuple<handle<rb-abi-value>, s32>"](i,t);return[this._resource0_slab.remove(O(n).getInt32(r+0,!0)),O(n).getInt32(r+4,!0)]}rbFuncallvProtect(e,n,s){let i=this._exports.memory,t=this._exports.cabi_realloc,r=e;if(!(r instanceof be))throw new TypeError("expected instance of RbAbiValue");let a=s,o=a.length,l=t(0,0,4,o*4);for(let _=0;_<a.length;_++){let u=a[_],f=l+_*4,h=u;if(!(h instanceof be))throw new TypeError("expected instance of RbAbiValue");O(i).setInt32(f+0,this._resource0_slab.insert(h.clone()),!0)}let d=this._exports["rb-funcallv-protect: func(recv: handle<rb-abi-value>, mid: u32, args: list<handle<rb-abi-value>>) -> tuple<handle<rb-abi-value>, s32>"](this._resource0_slab.insert(r.clone()),Cn(n),l,o);return[this._resource0_slab.remove(O(i).getInt32(d+0,!0)),O(i).getInt32(d+4,!0)]}rbIntern(e){let n=this._exports.memory,s=this._exports.cabi_realloc,i=we(e,s,n),t=le;return this._exports["rb-intern: func(name: string) -> u32"](i,t)>>>0}rbErrinfo(){let e=this._exports["rb-errinfo: func() -> handle<rb-abi-value>"]();return this._resource0_slab.remove(e)}rbClearErrinfo(){this._exports["rb-clear-errinfo: func() -> ()"]()}rstringPtr(e){let n=this._exports.memory,s=e;if(!(s instanceof be))throw new TypeError("expected instance of RbAbiValue");let i=this._exports["rstring-ptr: func(value: handle<rb-abi-value>) -> string"](this._resource0_slab.insert(s.clone())),t=O(n).getInt32(i+0,!0),r=O(n).getInt32(i+4,!0),a=de.decode(new Uint8Array(n.buffer,t,r));return this._exports["cabi_post_rstring-ptr"](i),a}rbVmBugreport(){this._exports["rb-vm-bugreport: func() -> ()"]()}rbGcEnable(){let n=this._exports["rb-gc-enable: func() -> bool"]();return n==0?!1:n==1?!0:Ne()}rbGcDisable(){let n=this._exports["rb-gc-disable: func() -> bool"]();return n==0?!1:n==1?!0:Ne()}rbSetShouldProhibitRewind(e){let s=this._exports["rb-set-should-prohibit-rewind: func(new-value: bool) -> bool"](e?1:0);return s==0?!1:s==1?!0:Ne()}},be=class{constructor(e,n){this._wasm_val=e,this._obj=n,this._refcnt=1,n._registry0.register(this,e,this)}clone(){return this._refcnt+=1,this}drop(){if(this._refcnt-=1,this._refcnt!==0)return;this._obj._registry0.unregister(this);let e=this._obj._exports["canonical_abi_drop_rb-abi-value"],n=this._wasm_val;delete this._obj,delete this._refcnt,delete this._wasm_val,e(n)}};function Pn(c,e,n){"rb-js-abi-host"in c||(c["rb-js-abi-host"]={}),c["rb-js-abi-host"]["eval-js: func(code: string) -> variant { success(handle<js-abi-value>), failure(handle<js-abi-value>) }"]=function(i,t,r){let a=n("memory"),o=i,l=t,d=de.decode(new Uint8Array(a.buffer,o,l)),u=e.evalJs(d);switch(u.tag){case"success":{let f=u.val;O(a).setInt8(r+0,0,!0),O(a).setInt32(r+4,s.insert(f),!0);break}case"failure":{let f=u.val;O(a).setInt8(r+0,1,!0),O(a).setInt32(r+4,s.insert(f),!0);break}default:throw new RangeError("invalid variant specified for JsAbiResult")}},c["rb-js-abi-host"]["is-js: func(value: handle<js-abi-value>) -> bool"]=function(i){return e.isJs(s.get(i))?1:0},c["rb-js-abi-host"]["instance-of: func(value: handle<js-abi-value>, klass: handle<js-abi-value>) -> bool"]=function(i,t){return e.instanceOf(s.get(i),s.get(t))?1:0},c["rb-js-abi-host"]["global-this: func() -> handle<js-abi-value>"]=function(){let i=e.globalThis();return s.insert(i)},c["rb-js-abi-host"]["int-to-js-number: func(value: s32) -> handle<js-abi-value>"]=function(i){let t=e.intToJsNumber(i);return s.insert(t)},c["rb-js-abi-host"]["float-to-js-number: func(value: float64) -> handle<js-abi-value>"]=function(i){let t=e.floatToJsNumber(i);return s.insert(t)},c["rb-js-abi-host"]["string-to-js-string: func(value: string) -> handle<js-abi-value>"]=function(i,t){let r=n("memory"),a=i,o=t,l=de.decode(new Uint8Array(r.buffer,a,o)),d=e.stringToJsString(l);return s.insert(d)},c["rb-js-abi-host"]["bool-to-js-bool: func(value: bool) -> handle<js-abi-value>"]=function(i){let t=i,r=e.boolToJsBool(t==0?!1:t==1?!0:Ne());return s.insert(r)},c["rb-js-abi-host"]["proc-to-js-function: func(value: u32) -> handle<js-abi-value>"]=function(i){let t=e.procToJsFunction(i>>>0);return s.insert(t)},c["rb-js-abi-host"]["rb-object-to-js-rb-value: func(raw-rb-abi-value: u32) -> handle<js-abi-value>"]=function(i){let t=e.rbObjectToJsRbValue(i>>>0);return s.insert(t)},c["rb-js-abi-host"]["js-value-to-string: func(value: handle<js-abi-value>) -> string"]=function(i,t){let r=n("memory"),a=n("cabi_realloc"),o=e.jsValueToString(s.get(i)),l=we(o,a,r),d=le;O(r).setInt32(t+4,d,!0),O(r).setInt32(t+0,l,!0)},c["rb-js-abi-host"]["js-value-to-integer: func(value: handle<js-abi-value>) -> variant { as-float(float64), bignum(string) }"]=function(i,t){let r=n("memory"),a=n("cabi_realloc"),l=e.jsValueToInteger(s.get(i));switch(l.tag){case"as-float":{let d=l.val;O(r).setInt8(t+0,0,!0),O(r).setFloat64(t+8,+d,!0);break}case"bignum":{let d=l.val;O(r).setInt8(t+0,1,!0);let _=we(d,a,r),u=le;O(r).setInt32(t+12,u,!0),O(r).setInt32(t+8,_,!0);break}default:throw new RangeError("invalid variant specified for RawInteger")}},c["rb-js-abi-host"]["export-js-value-to-host: func(value: handle<js-abi-value>) -> ()"]=function(i){e.exportJsValueToHost(s.get(i))},c["rb-js-abi-host"]["import-js-value-from-host: func() -> handle<js-abi-value>"]=function(){let i=e.importJsValueFromHost();return s.insert(i)},c["rb-js-abi-host"]["js-value-typeof: func(value: handle<js-abi-value>) -> string"]=function(i,t){let r=n("memory"),a=n("cabi_realloc"),o=e.jsValueTypeof(s.get(i)),l=we(o,a,r),d=le;O(r).setInt32(t+4,d,!0),O(r).setInt32(t+0,l,!0)},c["rb-js-abi-host"]["js-value-equal: func(lhs: handle<js-abi-value>, rhs: handle<js-abi-value>) -> bool"]=function(i,t){return e.jsValueEqual(s.get(i),s.get(t))?1:0},c["rb-js-abi-host"]["js-value-strictly-equal: func(lhs: handle<js-abi-value>, rhs: handle<js-abi-value>) -> bool"]=function(i,t){return e.jsValueStrictlyEqual(s.get(i),s.get(t))?1:0},c["rb-js-abi-host"]["reflect-apply: func(target: handle<js-abi-value>, this-argument: handle<js-abi-value>, arguments: list<handle<js-abi-value>>) -> variant { success(handle<js-abi-value>), failure(handle<js-abi-value>) }"]=function(i,t,r,a,o){let l=n("memory"),d=a,_=r,u=[];for(let m=0;m<d;m++){let g=_+m*4;u.push(s.get(O(l).getInt32(g+0,!0)))}let h=e.reflectApply(s.get(i),s.get(t),u);switch(h.tag){case"success":{let m=h.val;O(l).setInt8(o+0,0,!0),O(l).setInt32(o+4,s.insert(m),!0);break}case"failure":{let m=h.val;O(l).setInt8(o+0,1,!0),O(l).setInt32(o+4,s.insert(m),!0);break}default:throw new RangeError("invalid variant specified for JsAbiResult")}},c["rb-js-abi-host"]["reflect-construct: func(target: handle<js-abi-value>, arguments: list<handle<js-abi-value>>) -> handle<js-abi-value>"]=function(i,t,r){let a=n("memory"),o=r,l=t,d=[];for(let u=0;u<o;u++){let f=l+u*4;d.push(s.get(O(a).getInt32(f+0,!0)))}let _=e.reflectConstruct(s.get(i),d);return s.insert(_)},c["rb-js-abi-host"]["reflect-delete-property: func(target: handle<js-abi-value>, property-key: string) -> bool"]=function(i,t,r){let a=n("memory"),o=t,l=r,d=de.decode(new Uint8Array(a.buffer,o,l));return e.reflectDeleteProperty(s.get(i),d)?1:0},c["rb-js-abi-host"]["reflect-get: func(target: handle<js-abi-value>, property-key: string) -> variant { success(handle<js-abi-value>), failure(handle<js-abi-value>) }"]=function(i,t,r,a){let o=n("memory"),l=t,d=r,_=de.decode(new Uint8Array(o.buffer,l,d)),f=e.reflectGet(s.get(i),_);switch(f.tag){case"success":{let h=f.val;O(o).setInt8(a+0,0,!0),O(o).setInt32(a+4,s.insert(h),!0);break}case"failure":{let h=f.val;O(o).setInt8(a+0,1,!0),O(o).setInt32(a+4,s.insert(h),!0);break}default:throw new RangeError("invalid variant specified for JsAbiResult")}},c["rb-js-abi-host"]["reflect-get-own-property-descriptor: func(target: handle<js-abi-value>, property-key: string) -> handle<js-abi-value>"]=function(i,t,r){let a=n("memory"),o=t,l=r,d=de.decode(new Uint8Array(a.buffer,o,l)),_=e.reflectGetOwnPropertyDescriptor(s.get(i),d);return s.insert(_)},c["rb-js-abi-host"]["reflect-get-prototype-of: func(target: handle<js-abi-value>) -> handle<js-abi-value>"]=function(i){let t=e.reflectGetPrototypeOf(s.get(i));return s.insert(t)},c["rb-js-abi-host"]["reflect-has: func(target: handle<js-abi-value>, property-key: string) -> bool"]=function(i,t,r){let a=n("memory"),o=t,l=r,d=de.decode(new Uint8Array(a.buffer,o,l));return e.reflectHas(s.get(i),d)?1:0},c["rb-js-abi-host"]["reflect-is-extensible: func(target: handle<js-abi-value>) -> bool"]=function(i){return e.reflectIsExtensible(s.get(i))?1:0},c["rb-js-abi-host"]["reflect-own-keys: func(target: handle<js-abi-value>) -> list<handle<js-abi-value>>"]=function(i,t){let r=n("memory"),a=n("cabi_realloc"),l=e.reflectOwnKeys(s.get(i)),d=l.length,_=a(0,0,4,d*4);for(let u=0;u<l.length;u++){let f=l[u],h=_+u*4;O(r).setInt32(h+0,s.insert(f),!0)}O(r).setInt32(t+4,d,!0),O(r).setInt32(t+0,_,!0)},c["rb-js-abi-host"]["reflect-prevent-extensions: func(target: handle<js-abi-value>) -> bool"]=function(i){return e.reflectPreventExtensions(s.get(i))?1:0},c["rb-js-abi-host"]["reflect-set: func(target: handle<js-abi-value>, property-key: string, value: handle<js-abi-value>) -> variant { success(handle<js-abi-value>), failure(handle<js-abi-value>) }"]=function(i,t,r,a,o){let l=n("memory"),d=t,_=r,u=de.decode(new Uint8Array(l.buffer,d,_)),h=e.reflectSet(s.get(i),u,s.get(a));switch(h.tag){case"success":{let m=h.val;O(l).setInt8(o+0,0,!0),O(l).setInt32(o+4,s.insert(m),!0);break}case"failure":{let m=h.val;O(l).setInt8(o+0,1,!0),O(l).setInt32(o+4,s.insert(m),!0);break}default:throw new RangeError("invalid variant specified for JsAbiResult")}},c["rb-js-abi-host"]["reflect-set-prototype-of: func(target: handle<js-abi-value>, prototype: handle<js-abi-value>) -> bool"]=function(i,t){return e.reflectSetPrototypeOf(s.get(i),s.get(t))?1:0},"canonical_abi"in c||(c.canonical_abi={});let s=new Ae;c.canonical_abi["resource_drop_js-abi-value"]=i=>{let t=s.remove(i);e.dropJsAbiValue&&e.dropJsAbiValue(t)}}var Ve=class extends Ie{async setInstance(e){await this.instantiate(e)}},$e=class{constructor(){}setUnderlying(e){this.underlying=e}rubyShowVersion(){this.underlying.rubyShowVersion()}rubyInit(e){this.underlying.rubyInit(e)}rubyInitLoadpath(){this.underlying.rubyInitLoadpath()}rbEvalStringProtect(e){return this.underlying.rbEvalStringProtect(e)}rbFuncallvProtect(e,n,s){return this.underlying.rbFuncallvProtect(e,n,s)}rbIntern(e){return this.underlying.rbIntern(e)}rbErrinfo(){return this.underlying.rbErrinfo()}rbClearErrinfo(){return this.underlying.rbClearErrinfo()}rstringPtr(e){return this.underlying.rstringPtr(e)}rbVmBugreport(){this.underlying.rbVmBugreport()}rbGcEnable(){return this.underlying.rbGcEnable()}rbGcDisable(){return this.underlying.rbGcDisable()}rbSetShouldProhibitRewind(e){return this.underlying.rbSetShouldProhibitRewind(e)}async setInstance(e){}addToImports(e){}};var Ye=class c{static async instantiateModule(e){var n,s;let{module:i,wasip1:t}=e,r=new c,a={wasi_snapshot_preview1:t.wasiImport};r.addToImports(a),(n=e.addToImports)===null||n===void 0||n.call(e,a);let o=await WebAssembly.instantiate(i,a);try{await r.setInstance(o)}catch(l){throw console.error('Failed to instantiate Ruby VM. Please make sure that you have added `gem "js"` to your Gemfile.'),l}return(s=e.setMemory)===null||s===void 0||s.call(e,o.exports.memory),t.initialize(o),r.initialize(e.args),{vm:r,instance:o}}static async instantiateComponent(e){let n;return"getCoreModule"in e?n=async i=>{let{instantiate:t,getCoreModule:r,wasip2:a}=e,{cli:o,clocks:l,filesystem:d,io:_,random:u,sockets:f,http:h}=a,m=e.env?Object.assign(Object.assign({},o.environment),{getEnvironment:()=>{var y;return Array.from(new Map([...o.environment.getEnvironment(),...Object.entries((y=e.env)!==null&&y!==void 0?y:{})]).entries())}}):o.environment,g={"ruby:js/js-runtime":i,"wasi:cli/environment":m,"wasi:cli/exit":o.exit,"wasi:cli/stderr":o.stderr,"wasi:cli/stdin":o.stdin,"wasi:cli/stdout":o.stdout,"wasi:cli/terminal-input":o.terminalInput,"wasi:cli/terminal-output":o.terminalOutput,"wasi:cli/terminal-stderr":o.terminalStderr,"wasi:cli/terminal-stdin":o.terminalStdin,"wasi:cli/terminal-stdout":o.terminalStdout,"wasi:clocks/monotonic-clock":l.monotonicClock,"wasi:clocks/wall-clock":l.wallClock,"wasi:filesystem/preopens":d.preopens,"wasi:filesystem/types":d.types,"wasi:io/error":_.error,"wasi:io/poll":_.poll,"wasi:io/streams":_.streams,"wasi:random/random":u.random,"wasi:sockets/tcp":f.tcp,"wasi:http/types":h.types,"wasi:http/incoming-handler":h.incomingHandler,"wasi:http/outgoing-handler":h.outgoingHandler};return(await t(r,g,e.instantiateCore)).rubyRuntime}:n=e.instantiate,{vm:await this._instantiate({},n)}}constructor(e){this.instance=null,this.interfaceState={hasJSFrameAfterRbFrame:!1};let n=s=>{let i=["setInstance","addToImports","instantiate","rbSetShouldProhibitRewind","rbGcDisable","rbGcEnable"],t=["constructor"].concat(i);for(let r of Object.getOwnPropertyNames(Ie.prototype)){if(t.includes(r))continue;let a=s[r];typeof a=="function"&&(s[r]=(...o)=>{if(this.interfaceState.hasJSFrameAfterRbFrame){let d=this.guest.rbSetShouldProhibitRewind(!0),_=this.guest.rbGcDisable(),u=Reflect.apply(a,s,o);return this.guest.rbSetShouldProhibitRewind(d),_||this.guest.rbGcEnable(),u}else return Reflect.apply(a,s,o)})}return s};this.guest=n(e??new Ve),this.transport=new un,this.exceptionFormatter=new pn}static async _instantiate(e,n){let s=new $e,i=new c(s);class t{constructor(l){this.underlying=l}}let r=i.getImports(o=>new t(o),o=>o.underlying),a=await n(Object.assign(Object.assign({},r),{throwProhibitRewindException:o=>{i.throwProhibitRewindException(o)},procToJsFunction:()=>{let o=new Re(a.exportRbValueToJs(),i,i.privateObject());return new t((...l)=>o.call("call",...l.map(d=>i.wrap(d))).toJS())},rbObjectToJsRbValue:()=>{let o=new Re(a.exportRbValueToJs(),i,i.privateObject());return new t(o)},JsAbiValue:t}));return s.setUnderlying(a),i.initialize(e.args),i}initialize(e=["ruby.wasm","-EUTF-8","-e_=0"]){let n=e.map(s=>s+"\0");this.guest.rubyInit(n);try{this.eval(`
        # Require Bundler standalone setup
        if File.exist?("/bundle/bundler/setup.rb")
          # Some ruby-head + ruby.wasm revisions return from rubyInit with a partial
          # Gem module: Gem is defined, but RubyGems is not loaded yet and its API
          # helpers are still missing. Bundler standalone treats defined?(Gem) as
          # sufficient, so load RubyGems explicitly before requiring its setup file.
          require "rubygems" if defined?(Gem) && !Gem.respond_to?(:ruby_api_version)
          require "/bundle/bundler/setup.rb"
        elsif File.exist?("/bundle/setup.rb")
          # For non-CM builds, which doesn't use Bundler's standalone mode
          require "/bundle/setup.rb"
        end
      `)}catch(s){console.warn("Failed to load /bundle/setup",s)}}async setInstance(e){this.instance=e,await this.guest.setInstance(e)}addToImports(e){this.guest.addToImports(e),e["rb-js-abi-host"]={rb_wasm_throw_prohibit_rewind_exception:(n,s)=>{let i=this.instance.exports.memory,t=new TextDecoder().decode(new Uint8Array(i.buffer,n,s));this.throwProhibitRewindException(t)}},Pn(e,this.getImports(n=>n,n=>n),n=>this.instance.exports[n])}throwProhibitRewindException(e){let n=`Ruby APIs that may rewind the VM stack are prohibited under nested VM operation (${e})
Nested VM operation means that the call stack has sandwitched JS frames like JS -> Ruby -> JS -> Ruby caused by something like \`window.rubyVM.eval("JS.global[:rubyVM].eval('Fiber.yield')")\`

Please check your call stack and make sure that you are **not** doing any of the following inside the nested Ruby frame:
  1. Switching fibers (e.g. Fiber#resume, Fiber.yield, and Fiber#transfer)
     Note that \`evalAsync\` JS API switches fibers internally
  2. Raising uncaught exceptions
     Please catch all exceptions inside the nested operation
  3. Calling Continuation APIs
`,s=new Re(this.guest.rbErrinfo(),this,this.privateObject());throw s.call("nil?").toString()==="false"&&(n+=`
`+this.exceptionFormatter.format(s,this,this.privateObject())),new Xe(n)}getImports(e,n){let s=t=>{for(let[r,a]of Object.entries(t))typeof a=="function"&&(t[r]=(...o)=>{let l=this.interfaceState.hasJSFrameAfterRbFrame;this.interfaceState.hasJSFrameAfterRbFrame=!0;let d=Reflect.apply(a,t,o);return this.interfaceState.hasJSFrameAfterRbFrame=l,d});return t};function i(t){return(...r)=>{try{return{tag:"success",val:t(...r)}}catch(a){if(a instanceof Xe)throw a;return{tag:"failure",val:e(a)}}}}return s({evalJs:i(t=>e(Function(t)())),isJs:t=>!0,globalThis:()=>{if(typeof globalThis<"u")return e(globalThis);if(typeof global<"u")return e(global);if(typeof window<"u")return e(window);throw new Error("unable to locate global object")},intToJsNumber:t=>e(t),floatToJsNumber:t=>e(t),stringToJsString:t=>e(t),boolToJsBool:t=>e(t),procToJsFunction:t=>{let r=this.rbValueOfPointer(t);return e((...a)=>r.call("call",...a.map(o=>this.wrap(o))).toJS())},rbObjectToJsRbValue:t=>e(this.rbValueOfPointer(t)),jsValueToString:t=>(t=n(t),String(t)),jsValueToInteger(t){return t=n(t),typeof t=="number"?{tag:"as-float",val:t}:typeof t=="bigint"?{tag:"bignum",val:BigInt(t).toString(10)+"\0"}:typeof t=="string"?{tag:"bignum",val:t+"\0"}:typeof t>"u"?{tag:"as-float",val:0}:{tag:"as-float",val:Number(t)}},exportJsValueToHost:t=>{this.transport.takeJsValue(n(t))},importJsValueFromHost:()=>e(this.transport.consumeJsValue()),instanceOf:(t,r)=>(r=n(r),typeof r=="function"?n(t)instanceof r:!1),jsValueTypeof(t){return typeof n(t)},jsValueEqual(t,r){return n(t)==n(r)},jsValueStrictlyEqual(t,r){return n(t)===n(r)},reflectApply:i((t,r,a)=>{let o=a.map(l=>n(l));return e(Reflect.apply(n(t),n(r),o))}),reflectConstruct:function(t,r){throw new Error("Function not implemented.")},reflectDeleteProperty:function(t,r){throw new Error("Function not implemented.")},reflectGet:i((t,r)=>e(n(t)[r])),reflectGetOwnPropertyDescriptor:function(t,r){throw new Error("Function not implemented.")},reflectGetPrototypeOf:function(t){throw new Error("Function not implemented.")},reflectHas:function(t,r){throw new Error("Function not implemented.")},reflectIsExtensible:function(t){throw new Error("Function not implemented.")},reflectOwnKeys:function(t){throw new Error("Function not implemented.")},reflectPreventExtensions:function(t){throw new Error("Function not implemented.")},reflectSet:i((t,r,a)=>e(Reflect.set(n(t),r,n(a)))),reflectSetPrototypeOf:function(t,r){throw new Error("Function not implemented.")}})}printVersion(){this.guest.rubyShowVersion()}eval(e){return We(this,this.privateObject(),e)}evalAsync(e){let n=this.eval("require 'js'; JS");return kn(this,this.privateObject(),s=>{n.call("__eval_async_rb",this.wrap(e),s)})}wrap(e){return this.transport.importJsValue(e,this)}privateObject(){return{transport:this.transport,exceptionFormatter:this.exceptionFormatter}}rbValueOfPointer(e){let n=new be(e,this.guest);return new Re(n,this,this.privateObject())}},un=class{constructor(){this._takenJsValue=null}takeJsValue(e){this._takenJsValue=e}consumeJsValue(){return this._takenJsValue}exportJsValue(e){return e.call("__export_to_js"),this._takenJsValue}importJsValue(e,n){return this._takenJsValue=e,n.eval('require "js"; JS::Object').call("__import_from_js")}},Re=class c{constructor(e,n,s){this.inner=e,this.vm=n,this.privateObject=s}call(e,...n){let s=n.map(i=>i.inner);return new c(Un(this.vm,this.privateObject,this.inner,e,s),this.vm,this.privateObject)}callAsync(e,...n){let s=this.vm.eval("require 'js'; JS");return kn(this.vm,this.privateObject,i=>{s.call("__call_async_method",this,this.vm.wrap(e),i,...n)})}[Symbol.toPrimitive](e){return e==="string"||e==="default"?this.toString():null}toString(){let e=Un(this.vm,this.privateObject,this.inner,"to_s",[]);return this.vm.guest.rstringPtr(e)}toJS(){let n=this.vm.eval("JS").call("try_convert",this);return n.call("nil?").toString()==="true"?null:this.privateObject.transport.exportJsValue(n)}},re;(function(c){c[c.None=0]="None",c[c.Return=1]="Return",c[c.Break=2]="Break",c[c.Next=3]="Next",c[c.Retry=4]="Retry",c[c.Redo=5]="Redo",c[c.Raise=6]="Raise",c[c.Throw=7]="Throw",c[c.Fatal=8]="Fatal",c[c.Mask=15]="Mask"})(re||(re={}));var pn=class{constructor(){this.literalsCache=null,this.isFormmatting=!1}format(e,n,s){class i extends Error{}if(this.isFormmatting)throw new i("Unexpected exception occurred during formatting exception message");this.isFormmatting=!0;try{return this._format(e,n,s)}finally{this.isFormmatting=!1}}_format(e,n,s){let[i,t,r]=(()=>{if(this.literalsCache==null){let d=[We(n,s,"0"),We(n,s,"1"),We(n,s,`"
"`)];return this.literalsCache=d,d}else return this.literalsCache})(),a,o,l;try{a=e.call("class").toString()}catch{a="unknown"}try{l=e.call("message").toString()}catch{l="unknown"}try{o=e.call("backtrace")}catch{return this.formatString(a,l)}if(o.call("nil?").toString()==="true")return this.formatString(a,l);try{let d=o.call("at",i),_=o.call("drop",t).call("join",r);return this.formatString(a,l,[d.toString(),_.toString()])}catch{return this.formatString(a,l)}}formatString(e,n,s){return s?`${s[0]}: ${n} (${e})
${s[1]}`:`${e}: ${n}`}},Gn=(c,e,n)=>{switch(c&re.Mask){case re.None:break;case re.Return:throw new J("unexpected return");case re.Next:throw new J("unexpected next");case re.Break:throw new J("unexpected break");case re.Redo:throw new J("unexpected redo");case re.Retry:throw new J("retry outside of rescue clause");case re.Throw:throw new J("unexpected throw");case re.Raise:case re.Fatal:let s=new Re(e.guest.rbErrinfo(),e,n);throw s.call("nil?").toString()==="true"?new J("no exception object"):(e.guest.rbClearErrinfo(),new J(n.exceptionFormatter.format(s,e,n)));default:throw new J(`unknown error tag: ${c}`)}};function Dn(c,e){try{return e()}catch(n){if(n instanceof J)throw n;try{c.guest.rbVmBugreport()}catch(s){console.error("Tried to report internal Ruby VM state but failed: ",s)}if(n instanceof WebAssembly.RuntimeError&&n.message==="unreachable"){let s=new J(`Something went wrong in Ruby VM: ${n}`);throw s.stack=n.stack,s}else throw n}}var Un=(c,e,n,s,i)=>{let t=c.guest.rbIntern(s+"\0");return Dn(c,()=>{let[r,a]=c.guest.rbFuncallvProtect(n,t,i);return Gn(a,c,e),r})},We=(c,e,n)=>Dn(c,()=>{let[s,i]=c.guest.rbEvalStringProtect(n+"\0");return Gn(i,c,e),new Re(s,c,e)});function kn(c,e,n){return new Promise((s,i)=>{let t=c.wrap({resolve:s,reject:r=>{let a=new J(e.exceptionFormatter.format(r,c,e));i(a)}});n(t)})}var J=class extends Error{constructor(e){super(e)}},Xe=class extends J{constructor(e){super("Ruby Fatal Error: "+e)}};var ze=class c{static read_bytes(e,n){let s=new c;return s.buf=e.getUint32(n,!0),s.buf_len=e.getUint32(n+4,!0),s}static read_bytes_array(e,n,s){let i=[];for(let t=0;t<s;t++)i.push(c.read_bytes(e,n+8*t));return i}},Le=class c{static read_bytes(e,n){let s=new c;return s.buf=e.getUint32(n,!0),s.buf_len=e.getUint32(n+4,!0),s}static read_bytes_array(e,n,s){let i=[];for(let t=0;t<s;t++)i.push(c.read_bytes(e,n+8*t));return i}},mn=0,gn=1,Qe=2;var wn=2,ee=3,Ce=4;var Oe=class{head_length(){return 24}name_length(){return this.dir_name.byteLength}write_head_bytes(e,n){e.setBigUint64(n,this.d_next,!0),e.setBigUint64(n+8,this.d_ino,!0),e.setUint32(n+16,this.dir_name.length,!0),e.setUint8(n+20,this.d_type)}write_name_bytes(e,n,s){e.set(this.dir_name.slice(0,Math.min(this.dir_name.byteLength,s)),n)}constructor(e,n,s,i){let t=new TextEncoder().encode(s);this.d_next=e,this.d_ino=n,this.d_namlen=t.byteLength,this.d_type=i,this.dir_name=t}};var bn=1;var ve=class{write_bytes(e,n){e.setUint8(n,this.fs_filetype),e.setUint16(n+2,this.fs_flags,!0),e.setBigUint64(n+8,this.fs_rights_base,!0),e.setBigUint64(n+16,this.fs_rights_inherited,!0)}constructor(e,n){this.fs_rights_base=0n,this.fs_rights_inherited=0n,this.fs_filetype=e,this.fs_flags=n}};var en=1,Fe=2,Rn=4,nn=8,Te=class{write_bytes(e,n){e.setBigUint64(n,this.dev,!0),e.setBigUint64(n+8,this.ino,!0),e.setUint8(n+16,this.filetype),e.setBigUint64(n+24,this.nlink,!0),e.setBigUint64(n+32,this.size,!0),e.setBigUint64(n+38,this.atim,!0),e.setBigUint64(n+46,this.mtim,!0),e.setBigUint64(n+52,this.ctim,!0)}constructor(e,n,s){this.dev=0n,this.nlink=0n,this.atim=0n,this.mtim=0n,this.ctim=0n,this.ino=e,this.filetype=n,this.size=s}},zn=0;var Ln=1,Je=class c{static read_bytes(e,n){return new c(e.getBigUint64(n,!0),e.getUint8(n+8),e.getUint32(n+16,!0),e.getBigUint64(n+24,!0),e.getUint16(n+36,!0))}constructor(e,n,s,i,t){this.userdata=e,this.eventtype=n,this.clockid=s,this.timeout=i,this.flags=t}},qe=class{write_bytes(e,n){e.setBigUint64(n,this.userdata,!0),e.setUint16(n+8,this.error,!0),e.setUint8(n+10,this.eventtype)}constructor(e,n,s){this.userdata=e,this.error=n,this.eventtype=s}};var Jn=0,hn=class{write_bytes(e,n){e.setUint32(n,this.pr_name.byteLength,!0)}constructor(e){this.pr_name=new TextEncoder().encode(e)}},Ze=class c{static dir(e){let n=new c;return n.tag=Jn,n.inner=new hn(e),n}write_bytes(e,n){e.setUint32(n,this.tag,!0),this.inner.write_bytes(e,n+4)}};var qn=class{enable(e){this.log=Zn(e===void 0?!0:e,this.prefix)}get enabled(){return this.isEnabled}constructor(e){this.isEnabled=e,this.prefix="wasi:",this.enable(e)}};function Zn(c,e){return c?console.log.bind(console,"%c%s","color: #265BA0",e):()=>{}}var X=new qn(!1);var Me=class extends Error{constructor(e){super("exit with exit code "+e),this.code=e}},En=class{start(e){this.inst=e;try{return e.exports._start(),0}catch(n){if(n instanceof Me)return n.code;throw n}}initialize(e){this.inst=e,e.exports._initialize&&e.exports._initialize()}constructor(e,n,s,i={}){this.args=[],this.env=[],this.fds=[],X.enable(i.debug),this.args=e,this.env=n,this.fds=s;let t=this;this.wasiImport={args_sizes_get(r,a){let o=new DataView(t.inst.exports.memory.buffer);o.setUint32(r,t.args.length,!0);let l=0;for(let d of t.args)l+=d.length+1;return o.setUint32(a,l,!0),X.log(o.getUint32(r,!0),o.getUint32(a,!0)),0},args_get(r,a){let o=new DataView(t.inst.exports.memory.buffer),l=new Uint8Array(t.inst.exports.memory.buffer),d=a;for(let _=0;_<t.args.length;_++){o.setUint32(r,a,!0),r+=4;let u=new TextEncoder().encode(t.args[_]);l.set(u,a),o.setUint8(a+u.length,0),a+=u.length+1}return X.enabled&&X.log(new TextDecoder("utf-8").decode(l.slice(d,a))),0},environ_sizes_get(r,a){let o=new DataView(t.inst.exports.memory.buffer);o.setUint32(r,t.env.length,!0);let l=0;for(let d of t.env)l+=new TextEncoder().encode(d).length+1;return o.setUint32(a,l,!0),X.log(o.getUint32(r,!0),o.getUint32(a,!0)),0},environ_get(r,a){let o=new DataView(t.inst.exports.memory.buffer),l=new Uint8Array(t.inst.exports.memory.buffer),d=a;for(let _=0;_<t.env.length;_++){o.setUint32(r,a,!0),r+=4;let u=new TextEncoder().encode(t.env[_]);l.set(u,a),o.setUint8(a+u.length,0),a+=u.length+1}return X.enabled&&X.log(new TextDecoder("utf-8").decode(l.slice(d,a))),0},clock_res_get(r,a){let o;switch(r){case 1:{o=5000n;break}case 0:{o=1000000n;break}default:return 52}return new DataView(t.inst.exports.memory.buffer).setBigUint64(a,o,!0),0},clock_time_get(r,a,o){let l=new DataView(t.inst.exports.memory.buffer);if(r===0)l.setBigUint64(o,BigInt(new Date().getTime())*1000000n,!0);else if(r==1){let d;try{d=BigInt(Math.round(performance.now()*1e6))}catch{d=0n}l.setBigUint64(o,d,!0)}else l.setBigUint64(o,0n,!0);return 0},fd_advise(r,a,o,l){return t.fds[r]!=null?0:8},fd_allocate(r,a,o){return t.fds[r]!=null?t.fds[r].fd_allocate(a,o):8},fd_close(r){if(t.fds[r]!=null){let a=t.fds[r].fd_close();return t.fds[r]=void 0,a}else return 8},fd_datasync(r){return t.fds[r]!=null?t.fds[r].fd_sync():8},fd_fdstat_get(r,a){if(t.fds[r]!=null){let{ret:o,fdstat:l}=t.fds[r].fd_fdstat_get();return l?.write_bytes(new DataView(t.inst.exports.memory.buffer),a),o}else return 8},fd_fdstat_set_flags(r,a){return t.fds[r]!=null?t.fds[r].fd_fdstat_set_flags(a):8},fd_fdstat_set_rights(r,a,o){return t.fds[r]!=null?t.fds[r].fd_fdstat_set_rights(a,o):8},fd_filestat_get(r,a){if(t.fds[r]!=null){let{ret:o,filestat:l}=t.fds[r].fd_filestat_get();return l?.write_bytes(new DataView(t.inst.exports.memory.buffer),a),o}else return 8},fd_filestat_set_size(r,a){return t.fds[r]!=null?t.fds[r].fd_filestat_set_size(a):8},fd_filestat_set_times(r,a,o,l){return t.fds[r]!=null?t.fds[r].fd_filestat_set_times(a,o,l):8},fd_pread(r,a,o,l,d){let _=new DataView(t.inst.exports.memory.buffer),u=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let f=ze.read_bytes_array(_,a,o),h=0;for(let m of f){let{ret:g,data:w}=t.fds[r].fd_pread(m.buf_len,l);if(g!=0)return _.setUint32(d,h,!0),g;if(u.set(w,m.buf),h+=w.length,l+=BigInt(w.length),w.length!=m.buf_len)break}return _.setUint32(d,h,!0),0}else return 8},fd_prestat_get(r,a){let o=new DataView(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let{ret:l,prestat:d}=t.fds[r].fd_prestat_get();return d?.write_bytes(o,a),l}else return 8},fd_prestat_dir_name(r,a,o){if(t.fds[r]!=null){let{ret:l,prestat:d}=t.fds[r].fd_prestat_get();if(d==null)return l;let _=d.inner.pr_name;return new Uint8Array(t.inst.exports.memory.buffer).set(_.slice(0,o),a),_.byteLength>o?37:0}else return 8},fd_pwrite(r,a,o,l,d){let _=new DataView(t.inst.exports.memory.buffer),u=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let f=Le.read_bytes_array(_,a,o),h=0;for(let m of f){let g=u.slice(m.buf,m.buf+m.buf_len),{ret:w,nwritten:y}=t.fds[r].fd_pwrite(g,l);if(w!=0)return _.setUint32(d,h,!0),w;if(h+=y,l+=BigInt(y),y!=g.byteLength)break}return _.setUint32(d,h,!0),0}else return 8},fd_read(r,a,o,l){let d=new DataView(t.inst.exports.memory.buffer),_=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let u=ze.read_bytes_array(d,a,o),f=0;for(let h of u){let{ret:m,data:g}=t.fds[r].fd_read(h.buf_len);if(m!=0)return d.setUint32(l,f,!0),m;if(_.set(g,h.buf),f+=g.length,g.length!=h.buf_len)break}return d.setUint32(l,f,!0),0}else return 8},fd_readdir(r,a,o,l,d){let _=new DataView(t.inst.exports.memory.buffer),u=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let f=0;for(;;){let{ret:h,dirent:m}=t.fds[r].fd_readdir_single(l);if(h!=0)return _.setUint32(d,f,!0),h;if(m==null)break;if(o-f<m.head_length()){f=o;break}let g=new ArrayBuffer(m.head_length());if(m.write_head_bytes(new DataView(g),0),u.set(new Uint8Array(g).slice(0,Math.min(g.byteLength,o-f)),a),a+=m.head_length(),f+=m.head_length(),o-f<m.name_length()){f=o;break}m.write_name_bytes(u,a,o-f),a+=m.name_length(),f+=m.name_length(),l=m.d_next}return _.setUint32(d,f,!0),0}else return 8},fd_renumber(r,a){if(t.fds[r]!=null&&t.fds[a]!=null){let o=t.fds[a].fd_close();return o!=0?o:(t.fds[a]=t.fds[r],t.fds[r]=void 0,0)}else return 8},fd_seek(r,a,o,l){let d=new DataView(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let{ret:_,offset:u}=t.fds[r].fd_seek(a,o);return d.setBigInt64(l,u,!0),_}else return 8},fd_sync(r){return t.fds[r]!=null?t.fds[r].fd_sync():8},fd_tell(r,a){let o=new DataView(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let{ret:l,offset:d}=t.fds[r].fd_tell();return o.setBigUint64(a,d,!0),l}else return 8},fd_write(r,a,o,l){let d=new DataView(t.inst.exports.memory.buffer),_=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let u=Le.read_bytes_array(d,a,o),f=0;for(let h of u){let m=_.slice(h.buf,h.buf+h.buf_len),{ret:g,nwritten:w}=t.fds[r].fd_write(m);if(g!=0)return d.setUint32(l,f,!0),g;if(f+=w,w!=m.byteLength)break}return d.setUint32(l,f,!0),0}else return 8},path_create_directory(r,a,o){let l=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let d=new TextDecoder("utf-8").decode(l.slice(a,a+o));return t.fds[r].path_create_directory(d)}else return 8},path_filestat_get(r,a,o,l,d){let _=new DataView(t.inst.exports.memory.buffer),u=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let f=new TextDecoder("utf-8").decode(u.slice(o,o+l)),{ret:h,filestat:m}=t.fds[r].path_filestat_get(a,f);return m?.write_bytes(_,d),h}else return 8},path_filestat_set_times(r,a,o,l,d,_,u){let f=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let h=new TextDecoder("utf-8").decode(f.slice(o,o+l));return t.fds[r].path_filestat_set_times(a,h,d,_,u)}else return 8},path_link(r,a,o,l,d,_,u){let f=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null&&t.fds[d]!=null){let h=new TextDecoder("utf-8").decode(f.slice(o,o+l)),m=new TextDecoder("utf-8").decode(f.slice(_,_+u)),{ret:g,inode_obj:w}=t.fds[r].path_lookup(h,a);return w==null?g:t.fds[d].path_link(m,w,!1)}else return 8},path_open(r,a,o,l,d,_,u,f,h){let m=new DataView(t.inst.exports.memory.buffer),g=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let w=new TextDecoder("utf-8").decode(g.slice(o,o+l));X.log(w);let{ret:y,fd_obj:U}=t.fds[r].path_open(a,w,d,_,u,f);if(y!=0)return y;t.fds.push(U);let B=t.fds.length-1;return m.setUint32(h,B,!0),0}else return 8},path_readlink(r,a,o,l,d,_){let u=new DataView(t.inst.exports.memory.buffer),f=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let h=new TextDecoder("utf-8").decode(f.slice(a,a+o));X.log(h);let{ret:m,data:g}=t.fds[r].path_readlink(h);if(g!=null){let w=new TextEncoder().encode(g);if(w.length>d)return u.setUint32(_,0,!0),8;f.set(w,l),u.setUint32(_,w.length,!0)}return m}else return 8},path_remove_directory(r,a,o){let l=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let d=new TextDecoder("utf-8").decode(l.slice(a,a+o));return t.fds[r].path_remove_directory(d)}else return 8},path_rename(r,a,o,l,d,_){let u=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null&&t.fds[l]!=null){let f=new TextDecoder("utf-8").decode(u.slice(a,a+o)),h=new TextDecoder("utf-8").decode(u.slice(d,d+_)),{ret:m,inode_obj:g}=t.fds[r].path_unlink(f);if(g==null)return m;if(m=t.fds[l].path_link(h,g,!0),m!=0&&t.fds[r].path_link(f,g,!0)!=0)throw"path_link should always return success when relinking an inode back to the original place";return m}else return 8},path_symlink(r,a,o,l,d){let _=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[o]!=null){let u=new TextDecoder("utf-8").decode(_.slice(r,r+a)),f=new TextDecoder("utf-8").decode(_.slice(l,l+d));return 58}else return 8},path_unlink_file(r,a,o){let l=new Uint8Array(t.inst.exports.memory.buffer);if(t.fds[r]!=null){let d=new TextDecoder("utf-8").decode(l.slice(a,a+o));return t.fds[r].path_unlink_file(d)}else return 8},poll_oneoff(r,a,o){if(o===0)return 28;if(o>1)return X.log("poll_oneoff: only a single subscription is supported"),58;let l=new DataView(t.inst.exports.memory.buffer),d=Je.read_bytes(l,r),_=d.eventtype,u=d.clockid,f=d.timeout;if(_!==zn)return X.log("poll_oneoff: only clock subscriptions are supported"),58;let h;if(u===1)h=()=>BigInt(Math.round(performance.now()*1e6));else if(u===0)h=()=>BigInt(new Date().getTime())*1000000n;else return 28;let m=(d.flags&Ln)!==0?f:h()+f;for(;m>h(););return new qe(d.userdata,0,_).write_bytes(l,a),0},proc_exit(r){throw new Me(r)},proc_raise(r){throw"raised signal "+r},sched_yield(){},random_get(r,a){let o=new Uint8Array(t.inst.exports.memory.buffer).subarray(r,r+a);if("crypto"in globalThis&&(typeof SharedArrayBuffer>"u"||!(t.inst.exports.memory.buffer instanceof SharedArrayBuffer)))for(let l=0;l<a;l+=65536)crypto.getRandomValues(o.subarray(l,l+65536));else for(let l=0;l<a;l++)o[l]=Math.random()*256|0},sock_recv(r,a,o){throw"sockets not supported"},sock_send(r,a,o){throw"sockets not supported"},sock_shutdown(r,a){throw"sockets not supported"},sock_accept(r,a){throw"sockets not supported"}}}};var xe=class{fd_allocate(e,n){return 58}fd_close(){return 0}fd_fdstat_get(){return{ret:58,fdstat:null}}fd_fdstat_set_flags(e){return 58}fd_fdstat_set_rights(e,n){return 58}fd_filestat_get(){return{ret:58,filestat:null}}fd_filestat_set_size(e){return 58}fd_filestat_set_times(e,n,s){return 58}fd_pread(e,n){return{ret:58,data:new Uint8Array}}fd_prestat_get(){return{ret:58,prestat:null}}fd_pwrite(e,n){return{ret:58,nwritten:0}}fd_read(e){return{ret:58,data:new Uint8Array}}fd_readdir_single(e){return{ret:58,dirent:null}}fd_seek(e,n){return{ret:58,offset:0n}}fd_sync(){return 0}fd_tell(){return{ret:58,offset:0n}}fd_write(e){return{ret:58,nwritten:0}}path_create_directory(e){return 58}path_filestat_get(e,n){return{ret:58,filestat:null}}path_filestat_set_times(e,n,s,i,t){return 58}path_link(e,n,s){return 58}path_unlink(e){return{ret:58,inode_obj:null}}path_lookup(e,n){return{ret:58,inode_obj:null}}path_open(e,n,s,i,t,r){return{ret:54,fd_obj:null}}path_readlink(e){return{ret:58,data:null}}path_remove_directory(e){return 58}path_rename(e,n,s){return 58}path_unlink_file(e){return 58}},ce=class c{static issue_ino(){return c.next_ino++}static root_ino(){return 0n}constructor(){this.ino=c.issue_ino()}};ce.next_ino=1n;var Pe=class extends xe{fd_allocate(e,n){if(!(this.file.size>e+n)){let s=new Uint8Array(Number(e+n));s.set(this.file.data,0),this.file.data=s}return 0}fd_fdstat_get(){return{ret:0,fdstat:new ve(Ce,0)}}fd_filestat_set_size(e){if(this.file.size>e)this.file.data=new Uint8Array(this.file.data.buffer.slice(0,Number(e)));else{let n=new Uint8Array(Number(e));n.set(this.file.data,0),this.file.data=n}return 0}fd_read(e){let n=this.file.data.slice(Number(this.file_pos),Number(this.file_pos+BigInt(e)));return this.file_pos+=BigInt(n.length),{ret:0,data:n}}fd_pread(e,n){return{ret:0,data:this.file.data.slice(Number(n),Number(n+BigInt(e)))}}fd_seek(e,n){let s;switch(n){case mn:s=e;break;case gn:s=this.file_pos+e;break;case Qe:s=BigInt(this.file.data.byteLength)+e;break;default:return{ret:28,offset:0n}}return s<0?{ret:28,offset:0n}:(this.file_pos=s,{ret:0,offset:this.file_pos})}fd_tell(){return{ret:0,offset:this.file_pos}}fd_write(e){if(this.file.readonly)return{ret:8,nwritten:0};if(this.file_pos+BigInt(e.byteLength)>this.file.size){let n=this.file.data;this.file.data=new Uint8Array(Number(this.file_pos+BigInt(e.byteLength))),this.file.data.set(n)}return this.file.data.set(e,Number(this.file_pos)),this.file_pos+=BigInt(e.byteLength),{ret:0,nwritten:e.byteLength}}fd_pwrite(e,n){if(this.file.readonly)return{ret:8,nwritten:0};if(n+BigInt(e.byteLength)>this.file.size){let s=this.file.data;this.file.data=new Uint8Array(Number(n+BigInt(e.byteLength))),this.file.data.set(s)}return this.file.data.set(e,Number(n)),{ret:0,nwritten:e.byteLength}}fd_filestat_get(){return{ret:0,filestat:this.file.stat()}}constructor(e){super(),this.file_pos=0n,this.file=e}},je=class extends xe{fd_seek(e,n){return{ret:8,offset:0n}}fd_tell(){return{ret:8,offset:0n}}fd_allocate(e,n){return 8}fd_fdstat_get(){return{ret:0,fdstat:new ve(ee,0)}}fd_readdir_single(e){if(X.enabled&&(X.log("readdir_single",e),X.log(e,this.dir.contents.keys())),e==0n)return{ret:0,dirent:new Oe(1n,this.dir.ino,".",ee)};if(e==1n)return{ret:0,dirent:new Oe(2n,this.dir.parent_ino(),"..",ee)};if(e>=BigInt(this.dir.contents.size)+2n)return{ret:0,dirent:null};let[n,s]=Array.from(this.dir.contents.entries())[Number(e-2n)];return{ret:0,dirent:new Oe(e+1n,s.ino,n,s.stat().filetype)}}path_filestat_get(e,n){let{ret:s,path:i}=Ee.from(n);if(i==null)return{ret:s,filestat:null};let{ret:t,entry:r}=this.dir.get_entry_for_path(i);return r==null?{ret:t,filestat:null}:{ret:0,filestat:r.stat()}}path_lookup(e,n){let{ret:s,path:i}=Ee.from(e);if(i==null)return{ret:s,inode_obj:null};let{ret:t,entry:r}=this.dir.get_entry_for_path(i);return r==null?{ret:t,inode_obj:null}:{ret:0,inode_obj:r}}path_open(e,n,s,i,t,r){let{ret:a,path:o}=Ee.from(n);if(o==null)return{ret:a,fd_obj:null};let{ret:l,entry:d}=this.dir.get_entry_for_path(o);if(d==null){if(l!=44)return{ret:l,fd_obj:null};if((s&en)==en){let{ret:_,entry:u}=this.dir.create_entry_for_path(n,(s&Fe)==Fe);if(u==null)return{ret:_,fd_obj:null};d=u}else return{ret:44,fd_obj:null}}else if((s&Rn)==Rn)return{ret:20,fd_obj:null};return(s&Fe)==Fe&&d.stat().filetype!==ee?{ret:54,fd_obj:null}:d.path_open(s,i,r)}path_create_directory(e){return this.path_open(0,e,en|Fe,0n,0n,0).ret}path_link(e,n,s){let{ret:i,path:t}=Ee.from(e);if(t==null)return i;if(t.is_dir)return 44;let{ret:r,parent_entry:a,filename:o,entry:l}=this.dir.get_parent_dir_and_entry_for_path(t,!0);if(a==null||o==null)return r;if(l!=null){let d=n.stat().filetype==ee,_=l.stat().filetype==ee;if(d&&_)if(s&&l instanceof _e){if(l.contents.size!=0)return 55}else return 20;else{if(d&&!_)return 54;if(!d&&_)return 31;if(!(n.stat().filetype==Ce&&l.stat().filetype==Ce))return 20}}return!s&&n.stat().filetype==ee?63:(a.contents.set(o,n),0)}path_unlink(e){let{ret:n,path:s}=Ee.from(e);if(s==null)return{ret:n,inode_obj:null};let{ret:i,parent_entry:t,filename:r,entry:a}=this.dir.get_parent_dir_and_entry_for_path(s,!0);return t==null||r==null?{ret:i,inode_obj:null}:a==null?{ret:44,inode_obj:null}:(t.contents.delete(r),{ret:0,inode_obj:a})}path_unlink_file(e){let{ret:n,path:s}=Ee.from(e);if(s==null)return n;let{ret:i,parent_entry:t,filename:r,entry:a}=this.dir.get_parent_dir_and_entry_for_path(s,!1);return t==null||r==null||a==null?i:a.stat().filetype===ee?31:(t.contents.delete(r),0)}path_remove_directory(e){let{ret:n,path:s}=Ee.from(e);if(s==null)return n;let{ret:i,parent_entry:t,filename:r,entry:a}=this.dir.get_parent_dir_and_entry_for_path(s,!1);return t==null||r==null||a==null?i:!(a instanceof _e)||a.stat().filetype!==ee?54:a.contents.size!==0?55:t.contents.delete(r)?0:44}fd_filestat_get(){return{ret:0,filestat:this.dir.stat()}}fd_filestat_set_size(e){return 8}fd_read(e){return{ret:8,data:new Uint8Array}}fd_pread(e,n){return{ret:8,data:new Uint8Array}}fd_write(e){return{ret:8,nwritten:0}}fd_pwrite(e,n){return{ret:8,nwritten:0}}constructor(e){super(),this.dir=e}},Ue=class extends je{fd_prestat_get(){return{ret:0,prestat:Ze.dir(this.prestat_name)}}constructor(e,n){super(new _e(n)),this.prestat_name=e}},ae=class extends ce{path_open(e,n,s){if(this.readonly&&(n&BigInt(64))==BigInt(64))return{ret:63,fd_obj:null};if((e&nn)==nn){if(this.readonly)return{ret:63,fd_obj:null};this.data=new Uint8Array([])}let i=new Pe(this);return s&bn&&i.fd_seek(0n,Qe),{ret:0,fd_obj:i}}get size(){return BigInt(this.data.byteLength)}stat(){return new Te(this.ino,Ce,this.size)}constructor(e,n){super(),this.data=new Uint8Array(e),this.readonly=!!n?.readonly}},Ee=class Kn{static from(e){let n=new Kn;if(n.is_dir=e.endsWith("/"),e.startsWith("/"))return{ret:76,path:null};if(e.includes("\0"))return{ret:28,path:null};for(let s of e.split("/"))if(!(s===""||s===".")){if(s===".."){if(n.parts.pop()==null)return{ret:76,path:null};continue}n.parts.push(s)}return{ret:0,path:n}}to_path_string(){let e=this.parts.join("/");return this.is_dir&&(e+="/"),e}constructor(){this.parts=[],this.is_dir=!1}},_e=class c extends ce{parent_ino(){return this.parent==null?ce.root_ino():this.parent.ino}path_open(e,n,s){return{ret:0,fd_obj:new je(this)}}stat(){return new Te(this.ino,ee,0n)}get_entry_for_path(e){let n=this;for(let s of e.parts){if(!(n instanceof c))return{ret:54,entry:null};let i=n.contents.get(s);if(i!==void 0)n=i;else return X.log(s),{ret:44,entry:null}}return e.is_dir&&n.stat().filetype!=ee?{ret:54,entry:null}:{ret:0,entry:n}}get_parent_dir_and_entry_for_path(e,n){let s=e.parts.pop();if(s===void 0)return{ret:28,parent_entry:null,filename:null,entry:null};let{ret:i,entry:t}=this.get_entry_for_path(e);if(t==null)return{ret:i,parent_entry:null,filename:null,entry:null};if(!(t instanceof c))return{ret:54,parent_entry:null,filename:null,entry:null};let r=t.contents.get(s);return r===void 0?n?{ret:0,parent_entry:t,filename:s,entry:null}:{ret:44,parent_entry:null,filename:null,entry:null}:e.is_dir&&r.stat().filetype!=ee?{ret:54,parent_entry:null,filename:null,entry:null}:{ret:0,parent_entry:t,filename:s,entry:r}}create_entry_for_path(e,n){let{ret:s,path:i}=Ee.from(e);if(i==null)return{ret:s,entry:null};let{ret:t,parent_entry:r,filename:a,entry:o}=this.get_parent_dir_and_entry_for_path(i,!0);if(r==null||a==null)return{ret:t,entry:null};if(o!=null)return{ret:20,entry:null};X.log("create",i);let l;return n?l=new c(new Map):l=new ae(new ArrayBuffer(0)),r.contents.set(a,l),o=l,{ret:0,entry:o}}constructor(e){super(),this.parent=null,e instanceof Array?this.contents=new Map(e):this.contents=e;for(let n of this.contents.values())n instanceof c&&(n.parent=this)}},Ge=class c extends xe{fd_filestat_get(){return{ret:0,filestat:new Te(this.ino,wn,BigInt(0))}}fd_fdstat_get(){let e=new ve(wn,0);return e.fs_rights_base=BigInt(64),{ret:0,fdstat:e}}fd_write(e){return this.write(e),{ret:0,nwritten:e.byteLength}}static lineBuffered(e){let n=new TextDecoder("utf-8",{fatal:!1}),s="";return new c(i=>{s+=n.decode(i,{stream:!0});let t=s.split(`
`);for(let[r,a]of t.entries())r<t.length-1?e(a):s=a})}constructor(e){super(),this.ino=ce.issue_ino(),this.write=e}};var vn={"00_compat.rb":`# Compatibility shims: RGSS2 targets Ruby 1.8, RGSS3 targets Ruby 1.9.
# This runtime uses Ruby 3.4, so restore commonly used removed APIs.
require 'js'
require 'zlib'

$stdout.sync = true
$stderr.sync = true

Fixnum = Integer unless defined?(Fixnum)
Bignum = Integer unless defined?(Bignum)
$KCODE = 'u'

class Object
  def taint; self; end unless method_defined?(:taint)
  def untaint; self; end unless method_defined?(:untaint)
  def tainted?; false; end unless method_defined?(:tainted?)
  def trust; self; end unless method_defined?(:trust)
  def untrust; self; end unless method_defined?(:untrust)
  def untrusted?; false; end unless method_defined?(:untrusted?)
  def =~(_other); nil; end unless method_defined?(:=~)
end

class << File
  alias_method :exists?, :exist? unless method_defined?(:exists?)
end
class << Dir
  alias_method :exists?, :exist? unless method_defined?(:exists?)
end
module FileTest
  class << self
    alias_method :exists?, :exist? unless method_defined?(:exists?)
  end
end

class Hash
  alias_method :index, :key unless method_defined?(:index)
end

class Array
  def nitems; count { |x| !x.nil? }; end unless method_defined?(:nitems)
  def choice; sample; end unless method_defined?(:choice)
end

class String
  def each(&block); each_line(&block); end unless method_defined?(:each)
end

class Integer
  def to_sym; to_s.to_sym; end unless method_defined?(:to_sym)
end

# Ruby 1.8 / 1.9 iterator? alias
module Kernel
  private
  def iterator?; block_given?; end unless private_method_defined?(:iterator?)
end

# Thread is not available in the WebAssembly build. Run the block immediately so
# that scripts using threads for background loading still work.
class Thread
  class << self
    alias_method :__tkr_orig_new, :new
    def new(*args, &block)
      t = TKRFakeThread.new
      t.__run(*args, &block)
      t
    end
    alias_method :start, :new
    alias_method :fork, :new
  end
end

class TKRFakeThread
  attr_reader :value
  def __run(*args)
    @value = yield(*args)
  rescue StandardError => e
    @error = e
  end
  def join(*); raise @error if @error; self; end
  def alive?; false; end
  def kill; self; end
  alias exit kill
  alias terminate kill
  def [](k); (@locals ||= {})[k]; end
  def []=(k, v); (@locals ||= {})[k] = v; end
  def priority=(v); end
  def priority; 0; end
  def status; false; end
  def wakeup; self; end
  def run; self; end
end
`,"10_core.rb":`# Core RGSS classes: Color, Tone, Rect, Table, Font, errors and the JS bridge.

class RGSSError < StandardError; end

# Accessors for built-in RGSS classes keep their state in @__name instance variables, so
# that game scripts subclassing Sprite/Window/Plane... can freely use @x, @opacity, etc.
# (in real RGSS these classes are implemented in C and have no Ruby-visible state).
class Module
  private

  def tkr_reader(*names)
    names.each { |n| class_eval("def #{n}; @__#{n}; end", __FILE__, __LINE__) }
  end

  def tkr_writer(*names)
    names.each { |n| class_eval("def #{n}=(v); @__#{n} = v; end", __FILE__, __LINE__) }
  end

  def tkr_accessor(*names)
    tkr_reader(*names)
    tkr_writer(*names)
  end
end
class RGSSReset < Exception; end

module TKRCore
  JSAPI = JS.global[:TKR]
  RGSS = $TKR_ENGINE || 3

  @uid = 0
  @drawables = ObjectSpace::WeakMap.new
  @viewports = ObjectSpace::WeakMap.new

  class << self
    def call(name, *args)
      JSAPI.call(name, *args)
    end

    def int(name, *args)
      JSAPI.call(name, *args).to_i
    end

    def str(name, *args)
      JSAPI.call(name, *args).to_s
    end

    def next_uid
      @uid += 1
    end

    def register(obj)
      id = next_uid
      @drawables[id] = obj
      id
    end

    def unregister(id)
      @drawables.delete(id)
    end

    def register_viewport(vp)
      id = next_uid
      @viewports[id] = vp
      id
    end

    def unregister_viewport(id)
      @viewports.delete(id)
    end

    def each_drawable(&block)
      @drawables.each_value(&block)
    end

    def each_viewport(&block)
      @viewports.each_value(&block)
    end

    # Dispose everything (F12 reset)
    def reset_all
      list = []
      @drawables.each_value { |d| list << d }
      list.each { |d| d.dispose rescue nil }
      vps = []
      @viewports.each_value { |v| vps << v }
      vps.each { |v| v.dispose rescue nil }
      Audio.bgm_stop
      Audio.bgs_stop
      Audio.me_stop
      Audio.se_stop
      Graphics.__reset
      GC.start
    end

    def b(v)
      v ? 1 : 0
    end
  end
end

class Color
  attr_reader :red, :green, :blue, :alpha

  def initialize(*args)
    case args.size
    when 0 then set(0, 0, 0, 0)
    when 1 then set(args[0])
    else set(*args)
    end
  end

  def set(*args)
    if args.size == 1
      c = args[0]
      @red = c.red; @green = c.green; @blue = c.blue; @alpha = c.alpha
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.alpha = args.size > 3 ? args[3] : 255
    end
    self
  end

  def red=(v); @red = clamp(v); end
  def green=(v); @green = clamp(v); end
  def blue=(v); @blue = clamp(v); end
  def alpha=(v); @alpha = clamp(v); end

  def ==(o)
    o.is_a?(Color) && @red == o.red && @green == o.green && @blue == o.blue && @alpha == o.alpha
  end

  def to_s
    format('(%f, %f, %f, %f)', @red, @green, @blue, @alpha)
  end
  alias inspect to_s

  def _dump(_depth = 0)
    [@red, @green, @blue, @alpha].pack('E4')
  end

  def self._load(s)
    new(*s.unpack('E4'))
  end

  def __rgba
    "#{@red.to_i},#{@green.to_i},#{@blue.to_i},#{@alpha.to_i}"
  end

  private

  def clamp(v)
    v = v.to_f
    v < 0 ? 0.0 : (v > 255 ? 255.0 : v)
  end
end

class Tone
  attr_reader :red, :green, :blue, :gray

  def initialize(*args)
    case args.size
    when 0 then set(0, 0, 0, 0)
    when 1 then set(args[0])
    else set(*args)
    end
  end

  def set(*args)
    if args.size == 1
      t = args[0]
      @red = t.red; @green = t.green; @blue = t.blue; @gray = t.gray
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.gray = args.size > 3 ? args[3] : 0
    end
    self
  end

  def red=(v); @red = clamp(v); end
  def green=(v); @green = clamp(v); end
  def blue=(v); @blue = clamp(v); end

  def gray=(v)
    v = v.to_f
    @gray = v < 0 ? 0.0 : (v > 255 ? 255.0 : v)
  end

  def ==(o)
    o.is_a?(Tone) && @red == o.red && @green == o.green && @blue == o.blue && @gray == o.gray
  end

  def zero?
    @red == 0 && @green == 0 && @blue == 0 && @gray == 0
  end

  def to_s
    format('(%f, %f, %f, %f)', @red, @green, @blue, @gray)
  end
  alias inspect to_s

  def _dump(_depth = 0)
    [@red, @green, @blue, @gray].pack('E4')
  end

  def self._load(s)
    new(*s.unpack('E4'))
  end

  private

  def clamp(v)
    v = v.to_f
    v < -255 ? -255.0 : (v > 255 ? 255.0 : v)
  end
end

class Rect
  attr_accessor :x, :y, :width, :height

  def initialize(*args)
    if args.size == 0
      set(0, 0, 0, 0)
    else
      set(*args)
    end
  end

  def set(*args)
    if args.size == 1
      r = args[0]
      @x = r.x; @y = r.y; @width = r.width; @height = r.height
    else
      @x = args[0].to_i; @y = args[1].to_i; @width = args[2].to_i; @height = args[3].to_i
    end
    self
  end

  def empty
    @x = @y = @width = @height = 0
    self
  end

  def ==(o)
    o.is_a?(Rect) && @x == o.x && @y == o.y && @width == o.width && @height == o.height
  end

  def to_s
    "(#{@x}, #{@y}, #{@width}, #{@height})"
  end
  alias inspect to_s

  def _dump(_depth = 0)
    [@x, @y, @width, @height].pack('l4')
  end

  def self._load(s)
    new(*s.unpack('l4'))
  end
end

class Table
  attr_reader :xsize, :ysize, :zsize, :__version

  def initialize(x, y = nil, z = nil)
    @dim = z ? 3 : (y ? 2 : 1)
    @xsize = [x.to_i, 0].max
    @ysize = [(y || 1).to_i, 0].max
    @zsize = [(z || 1).to_i, 0].max
    @data = Array.new(@xsize * @ysize * @zsize, 0)
    @__version = 0
  end

  def resize(x, y = nil, z = nil)
    old = @data
    ox, oy, oz = @xsize, @ysize, @zsize
    @dim = z ? 3 : (y ? 2 : 1)
    @xsize = [x.to_i, 0].max
    @ysize = [(y || 1).to_i, 0].max
    @zsize = [(z || 1).to_i, 0].max
    @data = Array.new(@xsize * @ysize * @zsize, 0)
    [oz, @zsize].min.times do |k|
      [oy, @ysize].min.times do |j|
        [ox, @xsize].min.times do |i|
          @data[i + (j + k * @ysize) * @xsize] = old[i + (j + k * oy) * ox]
        end
      end
    end
    @__version += 1
    self
  end

  def [](x, y = 0, z = 0)
    return nil if x < 0 || y < 0 || z < 0 || x >= @xsize || y >= @ysize || z >= @zsize
    @data[x + (y + z * @ysize) * @xsize]
  end

  def []=(*args)
    v = args.pop
    x = args[0]; y = args[1] || 0; z = args[2] || 0
    return v if x < 0 || y < 0 || z < 0 || x >= @xsize || y >= @ysize || z >= @zsize
    v = v.to_i
    v = ((v + 32768) & 0xFFFF) - 32768 if v > 32767 || v < -32768
    @data[x + (y + z * @ysize) * @xsize] = v
    @__version += 1
    v
  end

  def __data
    @data
  end

  # dup/clone: independent data, no shared JS upload id, no copied finalizer
  # (the copied finalizer would free the original's tilemap data in JS).
  def initialize_copy(o)
    super
    ObjectSpace.undefine_finalizer(self)
    @data = o.__data.dup
    @__js_id = nil
    @__js_version = nil
  end

  def _dump(_depth = 0)
    [@dim, @xsize, @ysize, @zsize, @data.size].pack('l5') + @data.pack('s*')
  end

  def self._load(s)
    dim, x, y, z, n = s.unpack('l5')
    t = allocate
    t.__init_raw(dim, x, y, z, s[20, n * 2].unpack('s*'))
    t
  end

  def __init_raw(dim, x, y, z, data)
    @dim = dim; @xsize = x; @ysize = y; @zsize = z; @data = data; @__version = 0
    @data.fill(0, @data.size...(x * y * z)) if @data.size < x * y * z
  end

  # Upload to JS (for tilemaps); returns JS-side id.
  def __sync_js
    @__js_id ||= begin
      id = TKRCore.next_uid
      ObjectSpace.define_finalizer(self, Table.__finalizer(id))
      id
    end
    if @__js_version != @__version
      TKRCore.call(:tableUpload, @__js_id, [@data.pack('s*')].pack('m0'), @xsize, @ysize, @zsize)
      @__js_version = @__version
    end
    @__js_id
  end

  def self.__finalizer(id)
    proc { TKRCore.call(:tableFree, id) rescue nil }
  end
end

class Font
  class << self
    attr_accessor :default_name, :default_size, :default_bold, :default_italic,
                  :default_shadow, :default_outline, :default_color, :default_out_color

    # Missing fonts fall back to the system Japanese font, so report every font as present
    # (VX's default Main script exits when "UmePlus Gothic" is not found).
    def exist?(_name)
      true
    end
  end

  if TKRCore::RGSS == 2
    self.default_name = ['UmePlus Gothic', 'MS Gothic', 'Courier New']
    self.default_size = 20
    self.default_shadow = true
    self.default_outline = false
  else
    self.default_name = ['VL Gothic']
    self.default_size = 24
    self.default_shadow = false
    self.default_outline = true
  end
  self.default_bold = false
  self.default_italic = false
  self.default_color = Color.new(255, 255, 255, 255)
  self.default_out_color = Color.new(0, 0, 0, 128)

  attr_accessor :name, :size, :bold, :italic, :shadow, :outline
  attr_reader :color, :out_color

  def initialize(name = Font.default_name, size = Font.default_size)
    @name = name.is_a?(Array) ? name.dup : name
    @size = size
    @bold = Font.default_bold
    @italic = Font.default_italic
    @shadow = Font.default_shadow
    @outline = Font.default_outline
    @color = Color.new(Font.default_color)
    @out_color = Color.new(Font.default_out_color)
  end

  def initialize_copy(o)
    super
    @color = Color.new(o.color)
    @out_color = Color.new(o.out_color)
    @name = @name.dup if @name.is_a?(Array)
  end

  def color=(c)
    @color = c.is_a?(Color) ? c : Color.new(c)
  end

  def out_color=(c)
    @out_color = c.is_a?(Color) ? c : Color.new(c)
  end

  def __spec
    names = @name.is_a?(Array) ? @name.join('|') : @name.to_s
    "#{names};#{@size.to_i};#{@bold ? 1 : 0};#{@italic ? 1 : 0};#{@outline ? 1 : 0};#{@shadow ? 1 : 0};#{@color.__rgba};#{@out_color.__rgba}"
  end
end
`,"20_bitmap.rb":`# Bitmap: pixel data lives in JS (canvas / ImageBitmap), referenced by id.

class Bitmap
  tkr_reader :width, :height
  attr_reader :__id
  tkr_accessor :font

  def initialize(*args)
    if args.size == 1
      path = args[0].to_s
      begin
        @__id = TKRCore.call(:bmpLoad, path).await.to_i
      rescue JS::Error, StandardError => e
        raise Errno::ENOENT, path
      end
      @__width = TKRCore.int(:bmpW, @__id)
      @__height = TKRCore.int(:bmpH, @__id)
    elsif args.size == 2
      w = args[0].to_i
      h = args[1].to_i
      raise RGSSError, 'failed to create bitmap' if w <= 0 || h <= 0
      @__width = w
      @__height = h
      @__id = TKRCore.int(:bmpCreate, w, h)
    else
      raise ArgumentError, "wrong number of arguments (#{args.size} for 1..2)"
    end
    @__font = Font.new
    @__disposed = false
    ObjectSpace.define_finalizer(self, Bitmap.__finalizer(@__id))
  end

  # Wrap an existing JS bitmap id (snap_to_bitmap etc.)
  def self.__wrap(id)
    b = allocate
    b.__init_wrap(id)
    b
  end

  def __init_wrap(id)
    @__id = id
    @__width = TKRCore.int(:bmpW, id)
    @__height = TKRCore.int(:bmpH, id)
    @__font = Font.new
    @__disposed = false
    ObjectSpace.define_finalizer(self, Bitmap.__finalizer(id))
  end

  def self.__finalizer(id)
    proc { TKRCore.call(:bmpDispose, id) rescue nil }
  end

  def initialize_copy(o)
    super
    # dup/clone also copies finalizers: drop the copied one, otherwise collecting the copy
    # would dispose the ORIGINAL bitmap (e.g. Cache.system("Iconset").dup in battle scripts)
    ObjectSpace.undefine_finalizer(self)
    raise RGSSError, 'disposed bitmap' if o.disposed?
    @__id = TKRCore.int(:bmpDup, o.__id)
    @__font = o.font.dup
    @__disposed = false
    ObjectSpace.define_finalizer(self, Bitmap.__finalizer(@__id))
  end

  def dispose
    return if @__disposed
    TKRCore.call(:bmpDispose, @__id)
    @__disposed = true
  end

  def disposed?
    @__disposed
  end

  def rect
    Rect.new(0, 0, @__width, @__height)
  end

  def check_disposed
    raise RGSSError, 'disposed bitmap' if @__disposed
  end
  private :check_disposed

  def blt(x, y, src, src_rect, opacity = 255)
    check_disposed
    return if src.nil? || src.disposed?
    TKRCore.call(:bmpBlt, @__id, x.to_i, y.to_i, src.__id, src_rect.x, src_rect.y,
                  src_rect.width, src_rect.height, opacity.to_i)
    self
  end

  def stretch_blt(dest_rect, src, src_rect, opacity = 255)
    check_disposed
    return if src.nil? || src.disposed?
    TKRCore.call(:bmpStretch, @__id, dest_rect.x, dest_rect.y, dest_rect.width, dest_rect.height,
                  src.__id, src_rect.x, src_rect.y, src_rect.width, src_rect.height, opacity.to_i)
    self
  end

  def fill_rect(*args)
    check_disposed
    if args.size == 2
      r, c = args
      x, y, w, h = r.x, r.y, r.width, r.height
    else
      x, y, w, h, c = args
    end
    TKRCore.call(:bmpFill, @__id, x.to_i, y.to_i, w.to_i, h.to_i,
                  c.red.to_i, c.green.to_i, c.blue.to_i, c.alpha.to_i)
    self
  end

  def gradient_fill_rect(*args)
    check_disposed
    if args[0].is_a?(Rect)
      r, c1, c2, vertical = args
      x, y, w, h = r.x, r.y, r.width, r.height
    else
      x, y, w, h, c1, c2, vertical = args
    end
    TKRCore.call(:bmpGrad, @__id, x.to_i, y.to_i, w.to_i, h.to_i,
                  c1.red.to_i, c1.green.to_i, c1.blue.to_i, c1.alpha.to_i,
                  c2.red.to_i, c2.green.to_i, c2.blue.to_i, c2.alpha.to_i, vertical ? 1 : 0)
    self
  end

  def clear
    check_disposed
    TKRCore.call(:bmpClear, @__id)
    self
  end

  def clear_rect(*args)
    check_disposed
    if args.size == 1
      r = args[0]
      x, y, w, h = r.x, r.y, r.width, r.height
    else
      x, y, w, h = args
    end
    TKRCore.call(:bmpClearRect, @__id, x.to_i, y.to_i, w.to_i, h.to_i)
    self
  end

  def get_pixel(x, y)
    check_disposed
    r, g, b, a = TKRCore.str(:bmpGetPixel, @__id, x.to_i, y.to_i).split(',').map(&:to_i)
    Color.new(r, g, b, a)
  end

  def set_pixel(x, y, c)
    check_disposed
    TKRCore.call(:bmpSetPixel, @__id, x.to_i, y.to_i, c.red.to_i, c.green.to_i, c.blue.to_i, c.alpha.to_i)
    self
  end

  def hue_change(hue)
    check_disposed
    TKRCore.call(:bmpHue, @__id, hue.to_i % 360)
    self
  end

  def blur
    check_disposed
    TKRCore.call(:bmpBlur, @__id)
    self
  end

  def radial_blur(angle, division)
    check_disposed
    TKRCore.call(:bmpRadialBlur, @__id, angle.to_i, division.to_i)
    self
  end

  def draw_text(*args)
    check_disposed
    if args[0].is_a?(Rect)
      r = args[0]
      x, y, w, h = r.x, r.y, r.width, r.height
      str = args[1]
      align = args[2] || 0
    else
      x, y, w, h, str = args[0, 5]
      align = args[5] || 0
    end
    s = str.to_s
    return self if s.empty?
    s = s.dup.force_encoding('UTF-8') unless s.encoding == Encoding::UTF_8
    TKRCore.call(:bmpDrawText, @__id, x.to_i, y.to_i, w.to_i, h.to_i, s.scrub('?'), align.to_i, @__font.__spec)
    self
  end

  def text_size(str)
    s = str.to_s
    s = s.dup.force_encoding('UTF-8') unless s.encoding == Encoding::UTF_8
    w = s.empty? ? 0 : TKRCore.int(:textSize, @__font.__spec, s.scrub('?'))
    Rect.new(0, 0, w, @__font.size.to_i)
  end
end
`,"30_sprite.rb":`# Viewport, Sprite and Plane. State is kept in Ruby; Graphics.update serializes
# visible objects into a flat display list for the WebGL renderer.

module TKRFlash
  def flash(color, duration)
    @__flash_color = color ? Color.new(color) : nil
    @__flash_duration = duration.to_i
    @__flash_count = duration.to_i
  end

  def __update_flash
    @__flash_count -= 1 if @__flash_count && @__flash_count > 0
  end

  # [r,g,b,a] of the active flash, :hide when flashing with nil color, nil otherwise
  def __flash_state
    return nil unless @__flash_count && @__flash_count > 0
    return :hide if @__flash_color.nil?
    c = @__flash_color
    a = c.alpha * @__flash_count / [@__flash_duration, 1].max
    [c.red, c.green, c.blue, a]
  end
end

class Viewport
  include TKRFlash
  tkr_reader :rect, :color, :tone
  attr_reader :__uid
  tkr_accessor :visible, :z, :ox, :oy

  def initialize(*args)
    if args.size == 0
      @__rect = Rect.new(0, 0, Graphics.width, Graphics.height)
    elsif args.size == 1
      @__rect = Rect.new(args[0])
    else
      @__rect = Rect.new(*args)
    end
    @__visible = true
    @__z = 0
    @__ox = 0
    @__oy = 0
    @__color = Color.new(0, 0, 0, 0)
    @__tone = Tone.new(0, 0, 0, 0)
    @__disposed = false
    @__uid = TKRCore.register_viewport(self)
  end

  def rect=(r); @__rect.set(r); end
  def color=(c); @__color.set(c); end
  def tone=(t); @__tone.set(t); end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister_viewport(@__uid)
  end

  def disposed?; @__disposed; end

  def update
    __update_flash
  end

  def __pack(a)
    return if @__disposed
    f = __flash_state
    f = [0, 0, 0, 0] if f.nil? || f == :hide
    r = @__rect
    c = @__color
    t = @__tone
    a.push(5, @__uid, @__z.to_i, @__visible ? 1 : 0, r.x, r.y, r.width, r.height, @__ox.to_i, @__oy.to_i,
           c.red, c.green, c.blue, c.alpha, t.red, t.green, t.blue, t.gray, f[0], f[1], f[2], f[3])
  end
end

class Sprite
  include TKRFlash
  tkr_reader :viewport, :bitmap, :src_rect, :color, :tone
  attr_reader :__uid
  tkr_accessor :visible, :x, :y, :z, :ox, :oy, :zoom_x, :zoom_y, :angle, :mirror,
                :bush_depth, :bush_opacity, :blend_type,
                :wave_amp, :wave_length, :wave_speed, :wave_phase
  tkr_reader :opacity
  def initialize(viewport = nil)
    @__viewport = viewport
    @__bitmap = nil
    @__src_rect = Rect.new(0, 0, 0, 0)
    @__visible = true
    @__x = @__y = @__z = @__ox = @__oy = 0
    @__zoom_x = @__zoom_y = 1.0
    @__angle = 0
    @__mirror = false
    @__bush_depth = 0
    @__bush_opacity = 128
    @__opacity = 255
    @__blend_type = 0
    @__color = Color.new(0, 0, 0, 0)
    @__tone = Tone.new(0, 0, 0, 0)
    @__wave_amp = 0
    @__wave_length = 180
    @__wave_speed = 360
    @__wave_phase = 0.0
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @__viewport = v; end

  def bitmap=(b)
    @__bitmap = b
    if b && !b.disposed?
      @__src_rect.set(0, 0, b.width, b.height)
    end
  end

  def src_rect=(r); @__src_rect.set(r); end
  def color=(c); @__color.set(c); end
  def tone=(t); @__tone.set(t); end

  def opacity=(v)
    v = v.to_i
    @__opacity = v < 0 ? 0 : (v > 255 ? 255 : v)
  end

  def width; @__src_rect.width; end
  def height; @__src_rect.height; end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def update
    __update_flash
    @__wave_phase = (@__wave_phase + @__wave_speed / 180.0) % 360 if @__wave_amp != 0
  end

  def __pack(a)
    return if @__disposed || !@__visible
    b = @__bitmap
    return if b.nil? || b.disposed? || @__opacity <= 0
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    f = __flash_state
    return if f == :hide
    c = f || [@__color.red, @__color.green, @__color.blue, @__color.alpha]
    if f && @__color.alpha > f[3]
      c = [@__color.red, @__color.green, @__color.blue, @__color.alpha]
    end
    r = @__src_rect
    t = @__tone
    a.push(1, @__uid, vp ? vp.__uid : 0, @__z.to_i, b.__id, @__x.to_i, @__y.to_i, @__ox.to_i, @__oy.to_i,
           @__zoom_x, @__zoom_y, @__angle, @__mirror ? 1 : 0, r.x, r.y, r.width, r.height, @__opacity,
           @__blend_type.to_i, @__bush_depth.to_i, @__bush_opacity.to_i, c[0], c[1], c[2], c[3],
           t.red, t.green, t.blue, t.gray, @__wave_amp, @__wave_length, @__wave_phase)
  end
end

class Plane
  tkr_reader :viewport, :bitmap, :color, :tone, :opacity
  attr_reader :__uid
  tkr_accessor :visible, :z, :ox, :oy, :zoom_x, :zoom_y, :blend_type

  def initialize(viewport = nil)
    @__viewport = viewport
    @__bitmap = nil
    @__visible = true
    @__z = 0
    @__ox = 0
    @__oy = 0
    @__zoom_x = 1.0
    @__zoom_y = 1.0
    @__opacity = 255
    @__blend_type = 0
    @__color = Color.new(0, 0, 0, 0)
    @__tone = Tone.new(0, 0, 0, 0)
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @__viewport = v; end
  def bitmap=(b); @__bitmap = b; end
  def color=(c); @__color.set(c); end
  def tone=(t); @__tone.set(t); end

  def opacity=(v)
    v = v.to_i
    @__opacity = v < 0 ? 0 : (v > 255 ? 255 : v)
  end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def update; end

  def __pack(a)
    return if @__disposed || !@__visible
    b = @__bitmap
    return if b.nil? || b.disposed? || @__opacity <= 0
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    c = @__color
    t = @__tone
    a.push(2, @__uid, vp ? vp.__uid : 0, @__z.to_i, b.__id, @__ox.to_i, @__oy.to_i, @__zoom_x, @__zoom_y,
           @__opacity, @__blend_type.to_i, c.red, c.green, c.blue, c.alpha, t.red, t.green, t.blue, t.gray)
  end
end
`,"31_window.rb":`# Window (RGSS2 / RGSS3 compatible) and Tilemap (VX / VX Ace).

class Window
  tkr_reader :viewport, :windowskin, :contents, :cursor_rect, :tone
  attr_reader :__uid
  tkr_reader :x, :y, :width, :height, :openness, :opacity, :back_opacity, :contents_opacity
  tkr_accessor :active, :visible, :arrows_visible, :pause, :z, :ox, :oy, :padding, :padding_bottom
  def initialize(*args)
    if args.size >= 4
      @__x, @__y, @__width, @__height = args[0, 4].map(&:to_i)
      @__viewport = nil
    else
      @__viewport = args[0]
      @__x = @__y = @__width = @__height = 0
    end
    @__windowskin = nil
    @__contents = TKRCore::RGSS == 3 ? Bitmap.new(1, 1) : nil
    @__cursor_rect = Rect.new(0, 0, 0, 0)
    @__active = true
    @__visible = true
    @__arrows_visible = true
    @__pause = false
    @__z = TKRCore::RGSS == 3 ? 100 : 0
    @__ox = @__oy = 0
    @__padding = 12
    @__padding = 16 if TKRCore::RGSS == 2
    @__padding_bottom = @__padding
    @__opacity = 255
    @__back_opacity = TKRCore::RGSS == 3 ? 192 : 200
    @__contents_opacity = 255
    @__openness = 255
    @__tone = Tone.new(0, 0, 0, 0)
    @__anim = 0
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @__viewport = v; end
  def windowskin=(b); @__windowskin = b; end
  def contents=(b); @__contents = b; end
  def cursor_rect=(r); @__cursor_rect.set(r); end
  def tone=(t); @__tone.set(t); end
  def x=(v); @__x = v.to_i; end
  def y=(v); @__y = v.to_i; end
  def width=(v); @__width = v.to_i; end
  def height=(v); @__height = v.to_i; end

  def padding=(v)
    @__padding = v.to_i
    @__padding_bottom = @__padding
  end

  def opacity=(v); @__opacity = clamp255(v); end
  def back_opacity=(v); @__back_opacity = clamp255(v); end
  def contents_opacity=(v); @__contents_opacity = clamp255(v); end
  def openness=(v); @__openness = clamp255(v); end

  def move(x, y, w, h)
    @__x = x.to_i; @__y = y.to_i; @__width = w.to_i; @__height = h.to_i
  end

  def open?; @__openness == 255; end
  def close?; @__openness == 0; end

  def update
    @__anim += 1
  end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def __pack(a)
    return if @__disposed || !@__visible || @__openness <= 0
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    skin = @__windowskin && !@__windowskin.disposed? ? @__windowskin.__id : 0
    cont = @__contents && !@__contents.disposed? ? @__contents.__id : 0
    c = @__cursor_rect
    t = @__tone
    a.push(3, @__uid, vp ? vp.__uid : 0, @__z.to_i, skin, cont, @__x, @__y, @__width, @__height,
           @__ox.to_i, @__oy.to_i, @__padding, @__padding_bottom, @__opacity, @__back_opacity, @__contents_opacity,
           @__openness, c.x, c.y, c.width, c.height, @__active ? 1 : 0, @__pause ? 1 : 0,
           @__arrows_visible ? 1 : 0, t.red, t.green, t.blue, t.gray, @__anim,
           TKRCore::RGSS == 3 ? 1 : 0)
  end

  private

  def clamp255(v)
    v = v.to_i
    v < 0 ? 0 : (v > 255 ? 255 : v)
  end
end

class Tilemap
  class BitmapArray
    def initialize; @__a = Array.new(9); end
    def [](i); @__a[i]; end
    def []=(i, b); @__a[i] = b; end
    def ids
      @__a.map { |b| b && !b.disposed? ? b.__id : 0 }
    end
  end
  tkr_reader :viewport, :bitmaps
  attr_reader :__uid
  tkr_accessor :map_data, :flash_data, :flags, :visible, :ox, :oy

  def initialize(viewport = nil)
    @__viewport = viewport
    @__bitmaps = BitmapArray.new
    @__map_data = nil
    @__flash_data = nil
    @__flags = nil
    @__visible = true
    @__ox = 0
    @__oy = 0
    @__anim = 0
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  # RGSS2 name for flags
  alias passages flags
  alias passages= flags=

  def viewport=(v); @__viewport = v; end

  def update
    @__anim += 1
  end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def __pack(a)
    return if @__disposed || !@__visible || @__map_data.nil?
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    map_id = @__map_data.__sync_js
    flags_id = @__flags ? @__flags.__sync_js : 0
    a.push(4, @__uid, vp ? vp.__uid : 0, @__ox.to_i, @__oy.to_i, @__anim)
    a.concat(@__bitmaps.ids)
    a.push(map_id, flags_id)
  end
end
`,"40_graphics.rb":`# Graphics / Input / Audio modules.

module Graphics
  @frame_rate = 60
  @frame_count = 0
  @brightness = 255
  @width = 544
  @height = 416
  @frozen = false

  class << self
    attr_accessor :frame_count
    attr_reader :frame_rate, :brightness, :width, :height

    def __reset
      @brightness = 255
      @frozen = false
      TKRCore.call(:unfreeze)
    end

    def frame_rate=(v)
      @frame_rate = [[v.to_i, 10].max, 120].min
      TKRCore.call(:setFrameRate, @frame_rate)
    end

    def brightness=(v)
      v = v.to_i
      @brightness = v < 0 ? 0 : (v > 255 ? 255 : v)
    end

    def __list
      a = [@brightness]
      TKRCore.each_viewport { |v| v.__pack(a) }
      TKRCore.each_drawable { |d| d.__pack(a) }
      a.join(',')
    end

    def __wait_frame
      r = TKRCore.call(:frame).await.to_s
      @frame_count += 1
      __memory_check if @frame_count % 15 == 0
      raise RGSSReset if r == 'reset'
    end

    # Bitmaps hold large pixel buffers in JS but look tiny to Ruby's GC, so scripts that
    # create bitmaps without disposing them would exhaust memory before Ruby collects them.
    # Run the GC when JS-side bitmap memory grows past a threshold.
    GC_STEP_MB = 96
    def __memory_check
      mb = TKRCore.int(:bitmapMB)
      @gc_base ||= 0
      if @gc_pending
        # finalizers have run since the last GC: measure the new baseline
        @gc_pending = false
        @gc_base = mb
        return
      end
      return unless mb > @gc_base + GC_STEP_MB
      GC.start
      @gc_pending = true
      @gc_runs = (@gc_runs || 0) + 1
      if @gc_runs <= 5 || @gc_runs % 20 == 0
        TKRCore.call(:stage, "GC ##{@gc_runs}: bitmaps #{mb}MB, count #{TKRCore.int(:bitmapCount)}")
      end
    end

    def update
      TKRCore.call(:render, __list) unless @frozen
      __wait_frame
    end

    def wait(duration)
      duration.to_i.times { update }
    end

    def fadeout(duration)
      d = duration.to_i
      start = @brightness
      if d <= 0
        @brightness = 0
        return
      end
      d.times do |i|
        @brightness = start - (start * (i + 1) / d)
        update
      end
    end

    def fadein(duration)
      d = duration.to_i
      start = @brightness
      if d <= 0
        @brightness = 255
        return
      end
      d.times do |i|
        @brightness = start + ((255 - start) * (i + 1) / d)
        update
      end
    end

    def freeze
      TKRCore.call(:freeze, __list)
      @frozen = true
    end

    def transition(duration = (TKRCore::RGSS == 2 ? 8 : 10), filename = '', vague = 40)
      unless @frozen
        return
      end
      duration = duration.to_i
      mask = nil
      if filename && !filename.to_s.empty?
        mask = Bitmap.new(filename.to_s) rescue nil
      end
      duration.times do |i|
        TKRCore.call(:transitionStep, __list, (i + 1).to_f / duration, mask ? mask.__id : 0, vague.to_i)
        __wait_frame
      end
      @frozen = false
      TKRCore.call(:unfreeze)
      mask.dispose if mask
    end

    def snap_to_bitmap
      Bitmap.__wrap(TKRCore.int(:snap, __list))
    end

    def frame_reset; end

    def resize_screen(w, h)
      w = [[w.to_i, 1].max, 640].min
      h = [[h.to_i, 1].max, 480].min
      return if w == @width && h == @height
      @width = w
      @height = h
      TKRCore.call(:resize, @width, @height)
    end

    def play_movie(_filename); end
  end
end

module Input
  BITS = {
    down: 0, left: 1, right: 2, up: 3, a: 4, b: 5, c: 6, x: 7, y: 8, z: 9, l: 10, r: 11,
    shift: 12, ctrl: 13, alt: 14, f5: 15, f6: 16, f7: 17, f8: 18, f9: 19
  }.freeze
  NUMS = {
    2 => :down, 4 => :left, 6 => :right, 8 => :up, 11 => :a, 12 => :b, 13 => :c, 14 => :x, 15 => :y,
    16 => :z, 17 => :l, 18 => :r, 21 => :shift, 22 => :ctrl, 23 => :alt,
    25 => :f5, 26 => :f6, 27 => :f7, 28 => :f8, 29 => :f9
  }.freeze

  if TKRCore::RGSS == 3
    DOWN = :DOWN; LEFT = :LEFT; RIGHT = :RIGHT; UP = :UP
    A = :A; B = :B; C = :C; X = :X; Y = :Y; Z = :Z; L = :L; R = :R
    SHIFT = :SHIFT; CTRL = :CTRL; ALT = :ALT
    F5 = :F5; F6 = :F6; F7 = :F7; F8 = :F8; F9 = :F9
  else
    DOWN = 2; LEFT = 4; RIGHT = 6; UP = 8
    A = 11; B = 12; C = 13; X = 14; Y = 15; Z = 16; L = 17; R = 18
    SHIFT = 21; CTRL = 22; ALT = 23
    F5 = 25; F6 = 26; F7 = 27; F8 = 28; F9 = 29
  end

  @press = 0
  @trigger = 0
  @repeat = 0
  @dir4 = 0
  @dir8 = 0
  @bit_cache = {}

  class << self
    attr_reader :dir4, :dir8

    def update
      p, t, r, d4, d8 = TKRCore.str(:inputUpdate).split(',').map(&:to_i)
      @press = p
      @trigger = t
      @repeat = r
      @dir4 = d4
      @dir8 = d8
    end

    def __bit(key)
      b = @bit_cache[key]
      return b if b
      sym = key.is_a?(Integer) ? NUMS[key] : key.to_s.downcase.to_sym
      i = BITS[sym]
      return nil unless i
      @bit_cache[key] = 1 << i
    end

    def press?(key)
      b = __bit(key)
      b ? (@press & b) != 0 : false
    end

    def trigger?(key)
      b = __bit(key)
      b ? (@trigger & b) != 0 : false
    end

    def repeat?(key)
      b = __bit(key)
      b ? (@repeat & b) != 0 : false
    end
  end
end

module Audio
  class << self
    def __a(op, *args)
      TKRCore.call(:audio, op, *args)
      nil
    end

    def setup_midi; end

    def bgm_play(name, volume = 100, pitch = 100, pos = 0)
      __a('bgm_play', name.to_s, volume.to_i, pitch.to_i, pos.to_i)
    end

    def bgm_stop; __a('bgm_stop'); end
    def bgm_fade(time); __a('bgm_fade', time.to_i); end

    def bgm_pos
      TKRCore.int(:bgmPos)
    end

    def bgs_play(name, volume = 80, pitch = 100, pos = 0)
      __a('bgs_play', name.to_s, volume.to_i, pitch.to_i, pos.to_i)
    end

    def bgs_stop; __a('bgs_stop'); end
    def bgs_fade(time); __a('bgs_fade', time.to_i); end
    def bgs_pos; 0; end

    def me_play(name, volume = 100, pitch = 100)
      __a('me_play', name.to_s, volume.to_i, pitch.to_i)
    end

    def me_stop; __a('me_stop'); end
    def me_fade(time); __a('me_fade', time.to_i); end

    def se_play(name, volume = 80, pitch = 100)
      __a('se_play', name.to_s, volume.to_i, pitch.to_i)
    end

    def se_stop; __a('se_stop'); end
  end
end
`,"70_kernel.rb":`# Global functions (load_data, save_data, rgss_main, msgbox, ...) and file I/O hooks.

module TKRCore
  GAME_PREFIX = '/game/'.freeze

  class << self
    # Path relative to the game folder, or nil if outside of it.
    def game_relative(path)
      s = path.to_s.tr('\\\\', '/')
      if s.start_with?('/')
        return nil unless s.start_with?(GAME_PREFIX)
        s = s[GAME_PREFIX.size..]
      end
      s = s.sub(%r{\\A\\./}, '')
      s.empty? ? nil : s
    end

    def sync_file(path)
      rel = game_relative(path)
      call(:syncFile, rel) if rel
    rescue StandardError
      nil
    end

    def delete_file(path)
      rel = game_relative(path)
      call(:deleteFile, rel) if rel
    end

    def marshal_load(data)
      if RGSS == 2
        # Ruby 1.8 strings carry no encoding. Treat text as UTF-8, but keep binary data
        # (e.g. encrypted payloads that games decrypt themselves) as bytes, otherwise
        # String#size etc. would count characters and corrupt the data.
        Marshal.load(data, proc { |o|
          if o.is_a?(String) && o.encoding == Encoding::ASCII_8BIT && !o.frozen?
            o.force_encoding(Encoding::UTF_8)
            o.force_encoding(Encoding::ASCII_8BIT) unless o.valid_encoding?
          end
          o
        })
      else
        Marshal.load(data)
      end
    end

    # Resolve a path case-insensitively inside the game folder.
    def resolve_ci(path)
      rel = game_relative(path)
      return path unless rel
      r = str(:fsResolve, rel)
      r.empty? ? path : r
    end

    # If the file is a placeholder (not preloaded), fetch it from the host.
    def materialize(path)
      rel = game_relative(path)
      return path unless rel
      real = str(:fsResolve, rel)
      return path if real.empty?
      call(:materialize, real).await if int(:isPlaceholder, real) != 0
      real
    rescue StandardError
      path
    end

    def truncate_mode?(args, kw)
      m = kw[:mode] || args[1]
      case m
      when String then m.start_with?('w')
      when Integer then (m & File::TRUNC) != 0
      else false
      end
    end

    def write_mode?(args, kw)
      m = kw[:mode] || args[1]
      case m
      when String then m.include?('w') || m.include?('a') || m.include?('+')
      when Integer then (m & (File::WRONLY | File::RDWR | File::APPEND)) != 0
      else false
      end
    end
  end
end

class File
  module TKRHook
    def initialize(*args, **kw)
      if args[0].is_a?(String) || args[0].respond_to?(:to_path)
        path = args[0].to_s
        # Load the real contents first unless the file is being truncated ("w"/"w+"):
        # appending to / updating an empty placeholder would destroy the original data.
        args[0] = TKRCore.materialize(path) unless TKRCore.truncate_mode?(args, kw)
        @__tkr_write = TKRCore.write_mode?(args, kw)
      end
      super(*args, **kw)
    end

    def close
      w = @__tkr_write && !closed?
      pth = (path rescue nil)
      r = super
      TKRCore.sync_file(pth) if w && pth
      r
    end
  end
  prepend TKRHook

  class << self
    alias_method :__tkr_binwrite, :binwrite
    alias_method :__tkr_write, :write
    alias_method :__tkr_delete, :delete
    alias_method :__tkr_rename, :rename
    alias_method :__tkr_read, :read
    alias_method :__tkr_binread, :binread
    alias_method :__tkr_readlines, :readlines
    alias_method :__tkr_exist, :exist?

    def binwrite(name, *args, **kw)
      r = __tkr_binwrite(name, *args, **kw)
      TKRCore.sync_file(name)
      r
    end

    def write(name, *args, **kw)
      r = __tkr_write(name, *args, **kw)
      TKRCore.sync_file(name)
      r
    end

    def read(name, *args, **kw)
      __tkr_read(TKRCore.materialize(name), *args, **kw)
    end

    def binread(name, *args)
      __tkr_binread(TKRCore.materialize(name), *args)
    end

    def readlines(name, *args, **kw)
      __tkr_readlines(TKRCore.materialize(name), *args, **kw)
    end

    def delete(*names)
      names.each do |n|
        __tkr_delete(TKRCore.resolve_ci(n))
        TKRCore.delete_file(TKRCore.resolve_ci(n))
      end
      names.size
    end
    alias_method :unlink, :delete

    def rename(a, b)
      r = __tkr_rename(a, b)
      TKRCore.delete_file(a)
      TKRCore.sync_file(b)
      r
    end

    def exist?(name)
      __tkr_exist(name) || (TKRCore.game_relative(name) && !TKRCore.str(:fsResolve, TKRCore.game_relative(name)).empty?)
    end
    alias_method :exists?, :exist?
  end
end

# Other ways of reading a file / its size (IO.read, IO.binread, File.size, File.stat ...)
# must also see the real contents rather than an empty placeholder.
module TKRReadHook
  %i[read binread readlines foreach].each do |m|
    define_method(m) do |name, *args, **kw, &blk|
      name = TKRCore.materialize(name) if name.is_a?(String) && !name.start_with?('|')
      super(name, *args, **kw, &blk)
    end
  end
end
IO.singleton_class.prepend(TKRReadHook)

module TKRStatHook
  %i[size size? stat lstat zero? empty?].each do |m|
    define_method(m) do |name, *args|
      name = TKRCore.materialize(name) if name.is_a?(String)
      super(name, *args)
    end
  end
end
File.singleton_class.prepend(TKRStatHook)

module FileTest
  class << self
    def size(name)
      File.size(name)
    end

    def size?(name)
      File.size?(name)
    end

    def exist?(name)
      File.exist?(name)
    end
    alias_method :exists?, :exist?
  end
end

module Kernel
  def load_data(filename)
    # Files the game wrote (saves etc.) live in the in-memory filesystem; the copy on the
    # host may not have been written yet, so read those directly.
    local = TKRCore.resolve_ci(filename.to_s)
    if File.__tkr_exist(local) && TKRCore.int(:isPlaceholder, TKRCore.game_relative(local).to_s) == 0
      return TKRCore.marshal_load(File.__tkr_binread(local))
    end
    path = begin
      TKRCore.call(:loadData, filename.to_s).await.to_s
    rescue StandardError
      raise Errno::ENOENT, filename.to_s
    end
    TKRCore.marshal_load(File.__tkr_binread(path))
  end

  def save_data(obj, filename)
    File.binwrite(filename, Marshal.dump(obj))
    obj
  end

  def msgbox(*args)
    TKRCore.call(:msgbox, args.map(&:to_s).join).await
    args.size <= 1 ? args[0] : args
  end

  def msgbox_p(*args)
    TKRCore.call(:msgbox, args.map(&:inspect).join("\\n")).await
    args.size <= 1 ? args[0] : args
  end

  def rgss_main
    TKRTrace.install
    loop do
      begin
        yield
        break
      rescue RGSSReset
        TKRCore.reset_all
      end
    end
  end

  def rgss_stop
    loop { Graphics.update }
  end

  private :load_data, :save_data, :msgbox, :msgbox_p, :rgss_main, :rgss_stop
end

# Windows API calls used by some scripts: return harmless defaults.
# Raised for games that cannot run outside Windows (shown to the player as is).
class TKRUnsupportedGame < StandardError; end

class Win32API
  # DLLs that games use to decrypt their own data/images. They are Windows programs and their
  # protection is the game author's choice, so such games cannot be played here.
  ENCRYPTION_DLLS = /\\A(wfPcrypt|wfpcrypt)(\\.dll)?\\z/i

  def initialize(dll, func, *_args)
    @dll = dll.to_s
    @func = func.to_s
    if @dll =~ ENCRYPTION_DLLS
      raise TKRUnsupportedGame,
            "\u3053\u306E\u30B2\u30FC\u30E0\u306F Windows \u5C02\u7528\u306E\u6697\u53F7\u5316 DLL\uFF08#{@dll}\uFF09\u3067\u30C7\u30FC\u30BF\u3084\u753B\u50CF\u3092\u6697\u53F7\u5316\u3057\u3066\u3044\u308B\u305F\u3081\u3001" \\
            "iPhone \u3067\u306F\u904A\u3079\u307E\u305B\u3093\u3002\uFF08Windows \u7248\u3067\u304A\u697D\u3057\u307F\u304F\u3060\u3055\u3044\uFF09"
    end
  end

  def call(*args)
    @@logged ||= {}
    key = "#{@dll}:#{@func}"
    unless @@logged[key]
      @@logged[key] = true
      shown = args.map { |a| a.is_a?(String) ? a[0, 40].inspect : a.inspect }.join(', ')
      TKRCore.call(:log, "Win32API #{key}(#{shown}) -> stub") rescue nil
    end
    case @func
    when 'GetPrivateProfileString', 'GetPrivateProfileStringA', 'GetPrivateProfileStringW'
      section, key, default, buf = args
      v = TKRBoot.ini_value(section.to_s, key.to_s) || default.to_s
      buf.replace(v.dup.force_encoding(buf.encoding)) if buf.is_a?(String)
      v.bytesize
    when 'FindWindow', 'FindWindowA', 'FindWindowW', 'GetActiveWindow', 'GetForegroundWindow'
      1
    when 'GetSystemMetrics'
      args[0] == 0 ? 1920 : 1080
    when 'GetUserDefaultLangID', 'GetSystemDefaultLangID'
      0x411
    else
      0
    end
  end
  alias Call call
end


# Diagnostics: report each event command (and scene change) to the app log, so a crash of the
# web process can be traced back to the event command that was running. Throttled so that
# parallel/looping events don't flood the log.
module TKRTrace
  @last = {}
  @count = 0
  @cur = nil
  class << self
    def install
      return if @installed
      @installed = true
      if defined?(::Game_Interpreter) && ::Game_Interpreter.method_defined?(:execute_command)
        ::Game_Interpreter.prepend(InterpreterHook)
      end
      if defined?(::SceneManager) && ::SceneManager.respond_to?(:goto)
        ::SceneManager.singleton_class.prepend(SceneHook)
      end
    rescue Exception => e
      TKRCore.call(:stage, "trace install failed: #{e.class}")
    end

    # Cheap per-command bookkeeping (runs for every event command): no string building here.
    def record(interp, map_id, event_id, index, cmd)
      @cur = [map_id, event_id, index, cmd.code]
      return if @count > 5000
      key = (map_id << 40) ^ (event_id << 20) ^ index
      f = Graphics.frame_count
      last = @last[key]
      return if last && f - last < 600
      @last[key] = f
      @count += 1
      params = cmd.parameters.inspect
      params = params[0, 90] + "..." if params.size > 90
      TKRCore.call(:stage, "event map#{map_id} ev#{event_id} ##{index} code #{cmd.code} #{params}")
    rescue Exception => e
      @count += 1
      TKRCore.call(:stage, "trace error #{e.class}: #{e.message}") if @count < 3
    end

    def current
      c = @cur
      c && "\u30DE\u30C3\u30D7#{c[0]} \u30A4\u30D9\u30F3\u30C8#{c[1]} #{c[2] + 1}\u884C\u76EE (\u30B3\u30FC\u30C9#{c[3]})"
    end
  end

  module InterpreterHook
    def execute_command
      cmd = @list && @list[@index]
      TKRTrace.record(self, @map_id || 0, @event_id || 0, @index || 0, cmd) if cmd && cmd.code != 0
      super
    end
  end

  module SceneHook
    %w[goto call].each do |m|
      define_method(m) do |*args|
        begin
          TKRCore.call(:stage, "scene #{m} #{args[0]}")
        rescue Exception
        end
        super(*args)
      end
    end
  end
end
`,"boot.rb":`# Game boot: load Scripts.rvdata(2) and run the game scripts.

module TKRBoot
  class << self
    def ini_value(section, key)
      @ini ||= begin
        text = File.exist?('Game.ini') ? (File.read('Game.ini') rescue '') : ''
        text = text.dup.force_encoding('UTF-8')
        text = text.encode('UTF-8', 'Shift_JIS', invalid: :replace, undef: :replace) unless text.valid_encoding?
        h = {}
        cur = ''
        text.each_line do |l|
          l = l.strip
          if l =~ /\\A\\[(.+)\\]\\z/
            cur = $1.downcase
          elsif l =~ /\\A([^=]+)=(.*)\\z/
            h["#{cur}/#{$1.strip.downcase}"] = $2.strip
          end
        end
        h
      end
      @ini["#{section.downcase}/#{key.downcase}"]
    end

    def show_error(e)
      bt = (e.backtrace || []).reject { |l| l.include?('/rgss/') || l.include?('<internal:') }
      if e.is_a?(TKRUnsupportedGame)
        TKRCore.call(:error, '\u3053\u306E\u30B2\u30FC\u30E0\u306B\u306F\u5BFE\u5FDC\u3057\u3066\u3044\u307E\u305B\u3093', e.message)
        return
      end
      title = e.is_a?(SyntaxError) ? 'Script syntax error' : "#{e.class}"
      all = e.backtrace || []
      if e.is_a?(SystemStackError) && !all.empty?
        # A runaway recursion: show the frames that repeat most (where the loop is).
        counts = Hash.new(0)
        all.each { |l| counts[l] += 1 }
        top = counts.sort_by { |_, n| -n }.first(8).map { |l, n| "#{n}x #{l}" }
        TKRCore.call(:log, "SystemStackError: #{all.size} frames; most repeated:\\n#{top.join("\\n")}\\nfirst frames:\\n#{all.first(15).join("\\n")}")
        bt = top
      elsif bt.empty?
        bt = all
      end
      body = "#{e.message}\\n\\n#{bt.first(12).join("\\n")}"
      cur = defined?(TKRTrace) && TKRTrace.current
      body += "\\n\\n\u5B9F\u884C\u4E2D\u306E\u30A4\u30D9\u30F3\u30C8: #{cur}" if cur
      TKRCore.call(:error, title, body)
      ctx = source_context(bt)
      TKRCore.call(:log, ctx) if ctx
    rescue StandardError
      nil
    end

    # The game script lines around the error (written to the log for diagnosis).
    def source_context(bt)
      return nil unless $RGSS_SCRIPTS
      bt.each do |l|
        next unless l =~ /\\A(.+?):(\\d+):in/
        name = $1
        line = $2.to_i
        s = $RGSS_SCRIPTS.find { |sc| sc[1].to_s.dup.force_encoding('UTF-8').scrub('?') == name }
        next unless s && s[3]
        src = s[3].lines
        from = [line - 6, 0].max
        to = [line + 4, src.size - 1].min
        out = (from..to).map do |i|
          text = src[i].to_s.chomp
          text = text[0, 400] + "\u2026(#{text.size} chars)" if text.size > 400
          format('%s%5d| %s', i + 1 == line ? '>' : ' ', i + 1, text)
        end
        return "source of #{name} around line #{line}:\\n" + out.join("\\n")
      end
      nil
    end

    def run
      Dir.chdir('/game')
      $TEST = false
      $BTEST = false
      script_file = TKRCore::RGSS == 3 ? 'Data/Scripts.rvdata2' : 'Data/Scripts.rvdata'
      begin
        scripts = load_data(script_file)
      rescue StandardError => e
        TKRCore.call(:error, 'Scripts \u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093', "#{script_file}\\n#{e.message}")
        return
      end
      $RGSS_SCRIPTS = scripts
      scripts.each do |s|
        code = Zlib::Inflate.inflate(s[2])
        code.force_encoding(Encoding::UTF_8)
        code = code.encode('UTF-8', 'Shift_JIS', invalid: :replace, undef: :replace) unless code.valid_encoding?
        s[3] = code
      end
      TKRCore.call(:stage, "scripts loaded: #{scripts.size}")
      TKRCore.call(:ready)
      loop do
        begin
          scripts.each do |s|
            name = s[1].to_s.dup.force_encoding(Encoding::UTF_8)
            name = name.scrub('?')
            TKRCore.call(:stage, "script: #{name}")
            eval(s[3], TOPLEVEL_BINDING, name.empty? ? '(untitled)' : name, 1)
          end
          break
        rescue RGSSReset
          TKRCore.reset_all
          next
        rescue SystemExit
          break
        rescue Exception => e
          show_error(e)
          loop { Graphics.update }
        end
      end
      TKRCore.call(:exit)
    rescue SystemExit
      TKRCore.call(:exit)
    rescue Exception => e
      show_error(e)
    end
  end
end
`,"rpg2.rb":`# RPG module for RGSS2 (RPG Maker VX).

module RPG
  class AudioFile
    attr_accessor :name, :volume, :pitch
    def initialize(name = '', volume = 100, pitch = 100)
      @name = name
      @volume = volume
      @pitch = pitch
    end
  end

  class BGM < AudioFile
    @@last = nil
    def play
      if @name.empty?
        Audio.bgm_stop
        @@last = RPG::BGM.new
      else
        Audio.bgm_play('Audio/BGM/' + @name, @volume, @pitch)
        @@last = self
      end
    end
    def self.stop
      Audio.bgm_stop
      @@last = RPG::BGM.new
    end
    def self.fade(time)
      Audio.bgm_fade(time)
      @@last = RPG::BGM.new
    end
    def self.last
      @@last ||= RPG::BGM.new
    end
  end

  class BGS < AudioFile
    @@last = nil
    def play
      if @name.empty?
        Audio.bgs_stop
        @@last = RPG::BGS.new
      else
        Audio.bgs_play('Audio/BGS/' + @name, @volume, @pitch)
        @@last = self
      end
    end
    def self.stop
      Audio.bgs_stop
      @@last = RPG::BGS.new
    end
    def self.fade(time)
      Audio.bgs_fade(time)
      @@last = RPG::BGS.new
    end
    def self.last
      @@last ||= RPG::BGS.new
    end
  end

  class ME < AudioFile
    def play
      if @name.empty?
        Audio.me_stop
      else
        Audio.me_play('Audio/ME/' + @name, @volume, @pitch)
      end
    end
    def self.stop; Audio.me_stop; end
    def self.fade(time); Audio.me_fade(time); end
  end

  class SE < AudioFile
    def play
      Audio.se_play('Audio/SE/' + @name, @volume, @pitch) unless @name.empty?
    end
    def self.stop; Audio.se_stop; end
  end

  class Map
    attr_accessor :width, :height, :scroll_type, :autoplay_bgm, :bgm, :autoplay_bgs, :bgs,
                  :disable_dashing, :encounter_list, :encounter_step, :parallax_name,
                  :parallax_loop_x, :parallax_loop_y, :parallax_sx, :parallax_sy,
                  :parallax_show, :data, :events
    def initialize(width, height)
      @width = width
      @height = height
      @scroll_type = 0
      @autoplay_bgm = false
      @bgm = RPG::BGM.new
      @autoplay_bgs = false
      @bgs = RPG::BGS.new('', 80)
      @disable_dashing = false
      @encounter_list = []
      @encounter_step = 30
      @parallax_name = ''
      @parallax_loop_x = false
      @parallax_loop_y = false
      @parallax_sx = 0
      @parallax_sy = 0
      @parallax_show = false
      @data = Table.new(width, height, 3)
      @events = {}
    end
  end

  class MapInfo
    attr_accessor :name, :parent_id, :order, :expanded, :scroll_x, :scroll_y
    def initialize
      @name = ''
      @parent_id = 0
      @order = 0
      @expanded = false
      @scroll_x = 0
      @scroll_y = 0
    end
  end

  class Area
    attr_accessor :id, :name, :map_id, :rect, :encounter_list, :order
    def initialize
      @id = 0
      @name = ''
      @map_id = 0
      @rect = Rect.new(0, 0, 0, 0)
      @encounter_list = []
      @order = 0
    end
  end

  class EventCommand
    attr_accessor :code, :indent, :parameters
    def initialize(code = 0, indent = 0, parameters = [])
      @code = code
      @indent = indent
      @parameters = parameters
    end
  end

  class MoveCommand
    attr_accessor :code, :parameters
    def initialize(code = 0, parameters = [])
      @code = code
      @parameters = parameters
    end
  end

  class MoveRoute
    attr_accessor :repeat, :skippable, :wait, :list
    def initialize
      @repeat = true
      @skippable = false
      @wait = false
      @list = [RPG::MoveCommand.new]
    end
  end

  class Event
    attr_accessor :id, :name, :x, :y, :pages
    def initialize(x, y)
      @id = 0
      @name = ''
      @x = x
      @y = y
      @pages = [RPG::Event::Page.new]
    end

    class Page
      attr_accessor :condition, :graphic, :move_type, :move_speed, :move_frequency,
                    :move_route, :walk_anime, :step_anime, :direction_fix, :through,
                    :priority_type, :trigger, :list
      def initialize
        @condition = RPG::Event::Page::Condition.new
        @graphic = RPG::Event::Page::Graphic.new
        @move_type = 0
        @move_speed = 3
        @move_frequency = 3
        @move_route = RPG::MoveRoute.new
        @walk_anime = true
        @step_anime = false
        @direction_fix = false
        @through = false
        @priority_type = 0
        @trigger = 0
        @list = [RPG::EventCommand.new]
      end

      class Condition
        attr_accessor :switch1_valid, :switch2_valid, :variable_valid, :self_switch_valid,
                      :item_valid, :actor_valid, :switch1_id, :switch2_id, :variable_id,
                      :variable_value, :self_switch_ch, :item_id, :actor_id
        def initialize
          @switch1_valid = false
          @switch2_valid = false
          @variable_valid = false
          @self_switch_valid = false
          @item_valid = false
          @actor_valid = false
          @switch1_id = 1
          @switch2_id = 1
          @variable_id = 1
          @variable_value = 0
          @self_switch_ch = 'A'
          @item_id = 1
          @actor_id = 1
        end
      end

      class Graphic
        attr_accessor :tile_id, :character_name, :character_index, :direction, :pattern
        def initialize
          @tile_id = 0
          @character_name = ''
          @character_index = 0
          @direction = 2
          @pattern = 0
        end
      end
    end
  end

  class BaseItem
    attr_accessor :id, :name, :icon_index, :description, :note
    def initialize
      @id = 0
      @name = ''
      @icon_index = 0
      @description = ''
      @note = ''
    end
  end

  class UsableItem < BaseItem
    attr_accessor :scope, :occasion, :speed, :animation_id, :common_event_id, :base_damage,
                  :variance, :atk_f, :spi_f, :physical_attack, :damage_to_mp, :absorb_damage,
                  :ignore_defense, :element_set, :plus_state_set, :minus_state_set
    def initialize
      super
      @scope = 0
      @occasion = 0
      @speed = 0
      @animation_id = 0
      @common_event_id = 0
      @base_damage = 0
      @variance = 20
      @atk_f = 0
      @spi_f = 0
      @physical_attack = false
      @damage_to_mp = false
      @absorb_damage = false
      @ignore_defense = false
      @element_set = []
      @plus_state_set = []
      @minus_state_set = []
    end
    def for_opponent?; [1, 2, 3, 4, 5, 6].include?(@scope); end
    def for_friend?; [7, 8, 9, 10, 11].include?(@scope); end
    def for_dead_friend?; [9, 10].include?(@scope); end
    def for_user?; [11].include?(@scope); end
    def for_one?; [1, 3, 4, 7, 9, 11].include?(@scope); end
    def for_two?; [5].include?(@scope); end
    def for_three?; [6].include?(@scope); end
    def for_random?; [4, 5, 6].include?(@scope); end
    def for_all?; [2, 8, 10].include?(@scope); end
    def dual?; [3].include?(@scope); end
    def need_selection?; [1, 3, 7, 9].include?(@scope); end
    def battle_ok?; [0, 1].include?(@occasion); end
    def menu_ok?; [0, 2].include?(@occasion); end
  end

  class Skill < UsableItem
    attr_accessor :mp_cost, :hit, :message1, :message2
    def initialize
      super
      @scope = 1
      @mp_cost = 0
      @hit = 100
      @message1 = ''
      @message2 = ''
    end
  end

  class Item < UsableItem
    attr_accessor :price, :consumable, :hp_recovery_rate, :hp_recovery, :mp_recovery_rate,
                  :mp_recovery, :parameter_type, :parameter_points
    def initialize
      super
      @scope = 7
      @price = 0
      @consumable = true
      @hp_recovery_rate = 0
      @hp_recovery = 0
      @mp_recovery_rate = 0
      @mp_recovery = 0
      @parameter_type = 0
      @parameter_points = 0
    end
  end

  class Weapon < BaseItem
    attr_accessor :animation_id, :price, :hit, :atk, :def, :spi, :agi, :two_handed,
                  :fast_attack, :dual_attack, :critical_bonus, :element_set, :state_set
    def initialize
      super
      @animation_id = 0
      @price = 0
      @hit = 95
      @atk = 0
      @def = 0
      @spi = 0
      @agi = 0
      @two_handed = false
      @fast_attack = false
      @dual_attack = false
      @critical_bonus = false
      @element_set = []
      @state_set = []
    end
  end

  class Armor < BaseItem
    attr_accessor :kind, :price, :eva, :atk, :def, :spi, :agi, :prevent_critical,
                  :half_mp_cost, :double_exp_gain, :auto_hp_recover, :element_set, :state_set
    def initialize
      super
      @kind = 0
      @price = 0
      @eva = 0
      @atk = 0
      @def = 0
      @spi = 0
      @agi = 0
      @prevent_critical = false
      @half_mp_cost = false
      @double_exp_gain = false
      @auto_hp_recover = false
      @element_set = []
      @state_set = []
    end
  end

  class Actor
    attr_accessor :id, :name, :class_id, :initial_level, :exp_basis, :exp_inflation,
                  :character_name, :character_index, :face_name, :face_index, :weapon_id,
                  :armor1_id, :armor2_id, :armor3_id, :armor4_id, :two_swords_style,
                  :fix_equipment, :auto_battle, :super_guard, :pharmacology,
                  :critical_bonus, :parameters
    def initialize
      @id = 0
      @name = ''
      @class_id = 1
      @initial_level = 1
      @exp_basis = 25
      @exp_inflation = 35
      @character_name = ''
      @character_index = 0
      @face_name = ''
      @face_index = 0
      @weapon_id = 0
      @armor1_id = 0
      @armor2_id = 0
      @armor3_id = 0
      @armor4_id = 0
      @two_swords_style = false
      @fix_equipment = false
      @auto_battle = false
      @super_guard = false
      @pharmacology = false
      @critical_bonus = false
      @parameters = Table.new(6, 100)
      (1..99).each do |i|
        @parameters[0, i] = 400 + i * 50
        @parameters[1, i] = 80 + i * 10
        @parameters[2, i] = 15 + i * 5 / 4
        @parameters[3, i] = 15 + i * 5 / 4
        @parameters[4, i] = 20 + i * 5 / 2
        @parameters[5, i] = 20 + i * 5 / 2
      end
    end
  end

  class Class
    attr_accessor :id, :name, :position, :weapon_set, :armor_set, :element_ranks,
                  :state_ranks, :learnings, :skill_name_valid, :skill_name
    def initialize
      @id = 0
      @name = ''
      @position = 0
      @weapon_set = []
      @armor_set = []
      @element_ranks = Table.new(1)
      @state_ranks = Table.new(1)
      @learnings = []
      @skill_name_valid = false
      @skill_name = ''
    end

    class Learning
      attr_accessor :level, :skill_id
      def initialize
        @level = 1
        @skill_id = 1
      end
    end
  end

  class Enemy
    attr_accessor :id, :name, :battler_name, :battler_hue, :maxhp, :maxmp, :atk, :def,
                  :spi, :agi, :hit, :eva, :exp, :gold, :drop_item1, :drop_item2,
                  :levitate, :has_critical, :element_ranks, :state_ranks, :actions, :note
    def initialize
      @id = 0
      @name = ''
      @battler_name = ''
      @battler_hue = 0
      @maxhp = 10
      @maxmp = 10
      @atk = 10
      @def = 10
      @spi = 10
      @agi = 10
      @hit = 95
      @eva = 5
      @exp = 0
      @gold = 0
      @drop_item1 = RPG::Enemy::DropItem.new
      @drop_item2 = RPG::Enemy::DropItem.new
      @levitate = false
      @has_critical = false
      @element_ranks = Table.new(1)
      @state_ranks = Table.new(1)
      @actions = [RPG::Enemy::Action.new]
      @note = ''
    end

    class DropItem
      attr_accessor :kind, :item_id, :weapon_id, :armor_id, :denominator
      def initialize
        @kind = 0
        @item_id = 1
        @weapon_id = 1
        @armor_id = 1
        @denominator = 1
      end
    end

    class Action
      attr_accessor :kind, :basic, :skill_id, :condition_type, :condition_param1,
                    :condition_param2, :rating
      def initialize
        @kind = 0
        @basic = 0
        @skill_id = 1
        @condition_type = 0
        @condition_param1 = 0
        @condition_param2 = 0
        @rating = 5
      end
      def skill?; @kind == 1; end
    end
  end

  class Troop
    attr_accessor :id, :name, :members, :pages
    def initialize
      @id = 0
      @name = ''
      @members = []
      @pages = [RPG::Troop::Page.new]
    end

    class Member
      attr_accessor :enemy_id, :x, :y, :hidden, :immortal
      def initialize
        @enemy_id = 1
        @x = 0
        @y = 0
        @hidden = false
        @immortal = false
      end
    end

    class Page
      attr_accessor :condition, :span, :list
      def initialize
        @condition = RPG::Troop::Page::Condition.new
        @span = 0
        @list = [RPG::EventCommand.new]
      end

      class Condition
        attr_accessor :turn_ending, :turn_valid, :enemy_valid, :actor_valid, :switch_valid,
                      :turn_a, :turn_b, :enemy_index, :enemy_hp, :actor_id, :actor_hp, :switch_id
        def initialize
          @turn_ending = false
          @turn_valid = false
          @enemy_valid = false
          @actor_valid = false
          @switch_valid = false
          @turn_a = 0
          @turn_b = 0
          @enemy_index = 0
          @enemy_hp = 50
          @actor_id = 1
          @actor_hp = 50
          @switch_id = 1
        end
      end
    end
  end

  class State
    attr_accessor :id, :name, :icon_index, :restriction, :priority, :atk_rate, :def_rate,
                  :spi_rate, :agi_rate, :nonresistance, :offset_by_opposite, :slip_damage,
                  :reduce_hit_ratio, :battle_only, :release_by_damage, :hold_turn,
                  :auto_release_prob, :message1, :message2, :message3, :message4,
                  :element_set, :state_set, :note
    def initialize
      @id = 0
      @name = ''
      @icon_index = 0
      @restriction = 0
      @priority = 5
      @atk_rate = 100
      @def_rate = 100
      @spi_rate = 100
      @agi_rate = 100
      @nonresistance = false
      @offset_by_opposite = false
      @slip_damage = false
      @reduce_hit_ratio = false
      @battle_only = true
      @release_by_damage = false
      @hold_turn = 0
      @auto_release_prob = 0
      @message1 = ''
      @message2 = ''
      @message3 = ''
      @message4 = ''
      @element_set = []
      @state_set = []
      @note = ''
    end
  end

  class Animation
    attr_accessor :id, :name, :animation1_name, :animation1_hue, :animation2_name,
                  :animation2_hue, :position, :frame_max, :frames, :timings
    def initialize
      @id = 0
      @name = ''
      @animation1_name = ''
      @animation1_hue = 0
      @animation2_name = ''
      @animation2_hue = 0
      @position = 1
      @frame_max = 1
      @frames = [RPG::Animation::Frame.new]
      @timings = []
    end

    class Frame
      attr_accessor :cell_max, :cell_data
      def initialize
        @cell_max = 0
        @cell_data = Table.new(0, 0)
      end
    end

    class Timing
      attr_accessor :frame, :se, :flash_scope, :flash_color, :flash_duration
      def initialize
        @frame = 0
        @se = RPG::SE.new('', 80)
        @flash_scope = 0
        @flash_color = Color.new(255, 255, 255, 255)
        @flash_duration = 5
      end
    end
  end

  class CommonEvent
    attr_accessor :id, :name, :trigger, :switch_id, :list
    def initialize
      @id = 0
      @name = ''
      @trigger = 0
      @switch_id = 1
      @list = [RPG::EventCommand.new]
    end
  end

  class System
    attr_accessor :game_title, :version_id, :party_members, :elements, :switches, :variables,
                  :passages, :boat, :ship, :airship, :title_bgm, :battle_bgm, :battle_end_me,
                  :gameover_me, :sounds, :test_battlers, :test_troop_id, :start_map_id,
                  :start_x, :start_y, :terms, :battler_name, :battler_hue, :edit_map_id
    def initialize
      @game_title = ''
      @version_id = 0
      @party_members = [1]
      @elements = [nil, '']
      @switches = [nil, '']
      @variables = [nil, '']
      @passages = Table.new(8192)
      @boat = RPG::System::Vehicle.new
      @ship = RPG::System::Vehicle.new
      @airship = RPG::System::Vehicle.new
      @title_bgm = RPG::BGM.new
      @battle_bgm = RPG::BGM.new
      @battle_end_me = RPG::ME.new
      @gameover_me = RPG::ME.new
      @sounds = Array.new(20) { RPG::SE.new }
      @test_battlers = []
      @test_troop_id = 1
      @start_map_id = 1
      @start_x = 0
      @start_y = 0
      @terms = RPG::System::Terms.new
      @battler_name = ''
      @battler_hue = 0
      @edit_map_id = 1
    end

    class Vehicle
      attr_accessor :character_name, :character_index, :bgm, :start_map_id, :start_x, :start_y
      def initialize
        @character_name = ''
        @character_index = 0
        @bgm = RPG::AudioFile.new
        @start_map_id = 0
        @start_x = 0
        @start_y = 0
      end
    end

    class Terms
      attr_accessor :level, :level_a, :hp, :hp_a, :mp, :mp_a, :atk, :def, :spi, :agi,
                    :weapon, :armor1, :armor2, :armor3, :armor4, :weapon1, :weapon2,
                    :attack, :skill, :guard, :item, :equip, :status, :save, :game_end,
                    :fight, :escape, :new_game, :continue, :shutdown, :to_title,
                    :cancel, :gold
      def initialize
        instance_variables
        %w[level level_a hp hp_a mp mp_a atk def spi agi weapon armor1 armor2 armor3 armor4
           weapon1 weapon2 attack skill guard item equip status save game_end fight escape
           new_game continue shutdown to_title cancel gold].each do |n|
          instance_variable_set("@#{n}", '')
        end
      end
    end

    class TestBattler
      attr_accessor :actor_id, :level, :weapon_id, :armor1_id, :armor2_id, :armor3_id, :armor4_id
      def initialize
        @actor_id = 1
        @level = 1
        @weapon_id = 0
        @armor1_id = 0
        @armor2_id = 0
        @armor3_id = 0
        @armor4_id = 0
      end
    end
  end
end
`,"rpg3.rb":`# RPG module for RGSS3 (RPG Maker VX Ace).

module RPG
  class AudioFile
    attr_accessor :name, :volume, :pitch
    def initialize(name = '', volume = 100, pitch = 100)
      @name = name
      @volume = volume
      @pitch = pitch
    end
  end

  class BGM < AudioFile
    attr_accessor :pos
    @@last = nil
    def play(pos = 0)
      if @name.empty?
        Audio.bgm_stop
        @@last = RPG::BGM.new
      else
        Audio.bgm_play('Audio/BGM/' + @name, @volume, @pitch, pos)
        @@last = clone
      end
    end
    def replay; play(@pos || 0); end
    def self.stop
      Audio.bgm_stop
      @@last = RPG::BGM.new
    end
    def self.fade(time)
      Audio.bgm_fade(time)
      @@last = RPG::BGM.new
    end
    def self.last
      @@last ||= RPG::BGM.new
      @@last.pos = Audio.bgm_pos
      @@last
    end
  end

  class BGS < AudioFile
    attr_accessor :pos
    @@last = nil
    def play(pos = 0)
      if @name.empty?
        Audio.bgs_stop
        @@last = RPG::BGS.new
      else
        Audio.bgs_play('Audio/BGS/' + @name, @volume, @pitch, pos)
        @@last = clone
      end
    end
    def replay; play(@pos || 0); end
    def self.stop
      Audio.bgs_stop
      @@last = RPG::BGS.new
    end
    def self.fade(time)
      Audio.bgs_fade(time)
      @@last = RPG::BGS.new
    end
    def self.last
      @@last ||= RPG::BGS.new
      @@last.pos = Audio.bgs_pos
      @@last
    end
  end

  class ME < AudioFile
    def play
      if @name.empty?
        Audio.me_stop
      else
        Audio.me_play('Audio/ME/' + @name, @volume, @pitch)
      end
    end
    def self.stop; Audio.me_stop; end
    def self.fade(time); Audio.me_fade(time); end
  end

  class SE < AudioFile
    def play
      Audio.se_play('Audio/SE/' + @name, @volume, @pitch) unless @name.empty?
    end
    def self.stop; Audio.se_stop; end
  end

  class Map
    attr_accessor :display_name, :tileset_id, :width, :height, :scroll_type,
                  :specify_battleback, :battleback1_name, :battleback2_name,
                  :autoplay_bgm, :bgm, :autoplay_bgs, :bgs, :disable_dashing,
                  :encounter_list, :encounter_step, :parallax_name, :parallax_loop_x,
                  :parallax_loop_y, :parallax_sx, :parallax_sy, :parallax_show, :note,
                  :data, :events
    def initialize(width, height)
      @display_name = ''
      @tileset_id = 1
      @width = width
      @height = height
      @scroll_type = 0
      @specify_battleback = false
      @battleback1_name = ''
      @battleback2_name = ''
      @autoplay_bgm = false
      @bgm = RPG::BGM.new
      @autoplay_bgs = false
      @bgs = RPG::BGS.new('', 80)
      @disable_dashing = false
      @encounter_list = []
      @encounter_step = 30
      @parallax_name = ''
      @parallax_loop_x = false
      @parallax_loop_y = false
      @parallax_sx = 0
      @parallax_sy = 0
      @parallax_show = false
      @note = ''
      @data = Table.new(width, height, 4)
      @events = {}
    end

    class Encounter
      attr_accessor :troop_id, :weight, :region_set
      def initialize
        @troop_id = 1
        @weight = 10
        @region_set = []
      end
    end
  end

  class MapInfo
    attr_accessor :name, :parent_id, :order, :expanded, :scroll_x, :scroll_y
    def initialize
      @name = ''
      @parent_id = 0
      @order = 0
      @expanded = false
      @scroll_x = 0
      @scroll_y = 0
    end
  end

  class EventCommand
    attr_accessor :code, :indent, :parameters
    def initialize(code = 0, indent = 0, parameters = [])
      @code = code
      @indent = indent
      @parameters = parameters
    end
  end

  class MoveCommand
    attr_accessor :code, :parameters
    def initialize(code = 0, parameters = [])
      @code = code
      @parameters = parameters
    end
  end

  class MoveRoute
    attr_accessor :repeat, :skippable, :wait, :list
    def initialize
      @repeat = true
      @skippable = false
      @wait = false
      @list = [RPG::MoveCommand.new]
    end
  end

  class Event
    attr_accessor :id, :name, :x, :y, :pages
    def initialize(x, y)
      @id = 0
      @name = ''
      @x = x
      @y = y
      @pages = [RPG::Event::Page.new]
    end

    class Page
      attr_accessor :condition, :graphic, :move_type, :move_speed, :move_frequency,
                    :move_route, :walk_anime, :step_anime, :direction_fix, :through,
                    :priority_type, :trigger, :list
      def initialize
        @condition = RPG::Event::Page::Condition.new
        @graphic = RPG::Event::Page::Graphic.new
        @move_type = 0
        @move_speed = 3
        @move_frequency = 3
        @move_route = RPG::MoveRoute.new
        @walk_anime = true
        @step_anime = false
        @direction_fix = false
        @through = false
        @priority_type = 0
        @trigger = 0
        @list = [RPG::EventCommand.new]
      end

      class Condition
        attr_accessor :switch1_valid, :switch2_valid, :variable_valid, :self_switch_valid,
                      :item_valid, :actor_valid, :switch1_id, :switch2_id, :variable_id,
                      :variable_value, :self_switch_ch, :item_id, :actor_id
        def initialize
          @switch1_valid = false
          @switch2_valid = false
          @variable_valid = false
          @self_switch_valid = false
          @item_valid = false
          @actor_valid = false
          @switch1_id = 1
          @switch2_id = 1
          @variable_id = 1
          @variable_value = 0
          @self_switch_ch = 'A'
          @item_id = 1
          @actor_id = 1
        end
      end

      class Graphic
        attr_accessor :tile_id, :character_name, :character_index, :direction, :pattern
        def initialize
          @tile_id = 0
          @character_name = ''
          @character_index = 0
          @direction = 2
          @pattern = 0
        end
      end
    end
  end

  class BaseItem
    attr_accessor :id, :name, :icon_index, :description, :features, :note
    def initialize
      @id = 0
      @name = ''
      @icon_index = 0
      @description = ''
      @features = []
      @note = ''
    end

    class Feature
      attr_accessor :code, :data_id, :value
      def initialize(code = 0, data_id = 0, value = 0)
        @code = code
        @data_id = data_id
        @value = value
      end
    end
  end

  class Actor < BaseItem
    attr_accessor :nickname, :class_id, :initial_level, :max_level, :character_name,
                  :character_index, :face_name, :face_index, :equips
    def initialize
      super
      @nickname = ''
      @class_id = 1
      @initial_level = 1
      @max_level = 99
      @character_name = ''
      @character_index = 0
      @face_name = ''
      @face_index = 0
      @equips = [0, 0, 0, 0, 0]
    end
  end

  class Class < BaseItem
    attr_accessor :exp_params, :params, :learnings
    def initialize
      super
      @exp_params = [30, 20, 30, 30]
      @params = Table.new(8, 100)
      (1..99).each do |i|
        @params[0, i] = 400 + i * 50
        @params[1, i] = 80 + i * 10
        (2..5).each { |j| @params[j, i] = 15 + i * 5 / 4 }
        (6..7).each { |j| @params[j, i] = 30 + i * 5 / 2 }
      end
      @learnings = []
      @features.push(RPG::BaseItem::Feature.new(23, 0, 1))
      @features.push(RPG::BaseItem::Feature.new(22, 0, 0.95))
      @features.push(RPG::BaseItem::Feature.new(22, 1, 0.05))
      @features.push(RPG::BaseItem::Feature.new(22, 2, 0.04))
      @features.push(RPG::BaseItem::Feature.new(41, 1))
      @features.push(RPG::BaseItem::Feature.new(51, 1))
      @features.push(RPG::BaseItem::Feature.new(52, 1))
    end

    def exp_for_level(level)
      lv = level.to_f
      basis = @exp_params[0].to_f
      extra = @exp_params[1].to_f
      acc_a = @exp_params[2].to_f
      acc_b = @exp_params[3].to_f
      (basis * ((lv - 1)**(0.9 + acc_a / 250)) * lv * (lv + 1) /
        (6 + lv**2 / 50 / acc_b) + (lv - 1) * extra).round.to_i
    end

    class Learning
      attr_accessor :level, :skill_id, :note
      def initialize
        @level = 1
        @skill_id = 1
        @note = ''
      end
    end
  end

  class UsableItem < BaseItem
    attr_accessor :scope, :occasion, :speed, :animation_id, :success_rate, :repeats,
                  :tp_gain, :hit_type, :damage, :effects
    def initialize
      super
      @scope = 0
      @occasion = 0
      @speed = 0
      @success_rate = 100
      @repeats = 1
      @tp_gain = 0
      @hit_type = 0
      @animation_id = 0
      @damage = RPG::UsableItem::Damage.new
      @effects = []
    end

    def for_opponent?; [1, 2, 3, 4, 5, 6].include?(@scope); end
    def for_friend?; [7, 8, 9, 10, 11].include?(@scope); end
    def for_dead_friend?; [9, 10].include?(@scope); end
    def for_user?; @scope == 11; end
    def for_one?; [1, 3, 7, 9, 11].include?(@scope); end
    def for_random?; [3, 4, 5, 6].include?(@scope); end
    def number_of_targets; for_random? ? @scope - 2 : 0; end
    def for_all?; [2, 8, 10].include?(@scope); end
    def need_selection?; [1, 7, 9].include?(@scope); end
    def battle_ok?; [0, 1].include?(@occasion); end
    def menu_ok?; [0, 2].include?(@occasion); end
    def certain?; @hit_type == 0; end
    def physical?; @hit_type == 1; end
    def magical?; @hit_type == 2; end

    class Damage
      attr_accessor :type, :element_id, :formula, :variance, :critical
      def initialize
        @type = 0
        @element_id = 0
        @formula = '0'
        @variance = 20
        @critical = false
      end
      def none?; @type == 0; end
      def to_hp?; [1, 3, 5].include?(@type); end
      def to_mp?; [2, 4, 6].include?(@type); end
      def recover?; [3, 4].include?(@type); end
      def drain?; [5, 6].include?(@type); end
      def sign; recover? ? -1 : 1; end
      def eval(a, b, v)
        [Kernel.eval(@formula), 0].max * sign rescue 0
      end
    end

    class Effect
      attr_accessor :code, :data_id, :value1, :value2
      def initialize(code = 0, data_id = 0, value1 = 0, value2 = 0)
        @code = code
        @data_id = data_id
        @value1 = value1
        @value2 = value2
      end
    end
  end

  class Skill < UsableItem
    attr_accessor :stype_id, :mp_cost, :tp_cost, :message1, :message2,
                  :required_wtype_id1, :required_wtype_id2
    def initialize
      super
      @scope = 1
      @stype_id = 1
      @mp_cost = 0
      @tp_cost = 0
      @message1 = ''
      @message2 = ''
      @required_wtype_id1 = 0
      @required_wtype_id2 = 0
    end
  end

  class Item < UsableItem
    attr_accessor :itype_id, :price, :consumable
    def initialize
      super
      @scope = 7
      @itype_id = 1
      @price = 0
      @consumable = true
    end
    def key_item?; @itype_id == 2; end
  end

  class EquipItem < BaseItem
    attr_accessor :price, :etype_id, :params
    def initialize
      super
      @price = 0
      @etype_id = 0
      @params = [0] * 8
    end
  end

  class Weapon < EquipItem
    attr_accessor :wtype_id, :animation_id
    def initialize
      super
      @wtype_id = 0
      @animation_id = 0
      @features.push(RPG::BaseItem::Feature.new(31, 1, 0))
      @features.push(RPG::BaseItem::Feature.new(22, 0, 0))
    end
    def performance
      params[2] + params[4] + params.inject(0) { |r, v| r + v }
    end
  end

  class Armor < EquipItem
    attr_accessor :atype_id
    def initialize
      super
      @atype_id = 0
      @etype_id = 1
      @features.push(RPG::BaseItem::Feature.new(22, 1, 0))
    end
    def performance
      params[3] + params[5] + params.inject(0) { |r, v| r + v }
    end
  end

  class Enemy < BaseItem
    attr_accessor :battler_name, :battler_hue, :params, :exp, :gold, :drop_items, :actions
    def initialize
      super
      @battler_name = ''
      @battler_hue = 0
      @params = [100, 0, 10, 10, 10, 10, 10, 10]
      @exp = 0
      @gold = 0
      @drop_items = Array.new(3) { RPG::Enemy::DropItem.new }
      @actions = [RPG::Enemy::Action.new]
      @features.push(RPG::BaseItem::Feature.new(22, 0, 0.95))
      @features.push(RPG::BaseItem::Feature.new(22, 1, 0.05))
      @features.push(RPG::BaseItem::Feature.new(31, 1, 0))
    end

    class DropItem
      attr_accessor :kind, :data_id, :denominator
      def initialize
        @kind = 0
        @data_id = 1
        @denominator = 1
      end
    end

    class Action
      attr_accessor :skill_id, :condition_type, :condition_param1, :condition_param2, :rating
      def initialize
        @skill_id = 1
        @condition_type = 0
        @condition_param1 = 0
        @condition_param2 = 0
        @rating = 5
      end
    end
  end

  class State < BaseItem
    attr_accessor :restriction, :priority, :remove_at_battle_end, :remove_by_restriction,
                  :auto_removal_timing, :min_turns, :max_turns, :remove_by_damage,
                  :chance_by_damage, :remove_by_walking, :steps_to_remove,
                  :message1, :message2, :message3, :message4
    def initialize
      super
      @restriction = 0
      @priority = 50
      @remove_at_battle_end = false
      @remove_by_restriction = false
      @auto_removal_timing = 0
      @min_turns = 1
      @max_turns = 1
      @remove_by_damage = false
      @chance_by_damage = 100
      @remove_by_walking = false
      @steps_to_remove = 100
      @message1 = ''
      @message2 = ''
      @message3 = ''
      @message4 = ''
    end
  end

  class Troop
    attr_accessor :id, :name, :members, :pages
    def initialize
      @id = 0
      @name = ''
      @members = []
      @pages = [RPG::Troop::Page.new]
    end

    class Member
      attr_accessor :enemy_id, :x, :y, :hidden
      def initialize
        @enemy_id = 1
        @x = 0
        @y = 0
        @hidden = false
      end
    end

    class Page
      attr_accessor :condition, :span, :list
      def initialize
        @condition = RPG::Troop::Page::Condition.new
        @span = 0
        @list = [RPG::EventCommand.new]
      end

      class Condition
        attr_accessor :turn_ending, :turn_valid, :enemy_valid, :actor_valid, :switch_valid,
                      :turn_a, :turn_b, :enemy_index, :enemy_hp, :actor_id, :actor_hp, :switch_id
        def initialize
          @turn_ending = false
          @turn_valid = false
          @enemy_valid = false
          @actor_valid = false
          @switch_valid = false
          @turn_a = 0
          @turn_b = 0
          @enemy_index = 0
          @enemy_hp = 50
          @actor_id = 1
          @actor_hp = 50
          @switch_id = 1
        end
      end
    end
  end

  class Animation
    attr_accessor :id, :name, :animation1_name, :animation1_hue, :animation2_name,
                  :animation2_hue, :position, :frame_max, :frames, :timings
    def initialize
      @id = 0
      @name = ''
      @animation1_name = ''
      @animation1_hue = 0
      @animation2_name = ''
      @animation2_hue = 0
      @position = 1
      @frame_max = 1
      @frames = [RPG::Animation::Frame.new]
      @timings = []
    end
    def to_screen?; @position == 3; end

    class Frame
      attr_accessor :cell_max, :cell_data
      def initialize
        @cell_max = 0
        @cell_data = Table.new(0, 0)
      end
    end

    class Timing
      attr_accessor :frame, :se, :flash_scope, :flash_color, :flash_duration
      def initialize
        @frame = 0
        @se = RPG::SE.new('', 80)
        @flash_scope = 0
        @flash_color = Color.new(255, 255, 255, 255)
        @flash_duration = 5
      end
    end
  end

  class Tileset
    attr_accessor :id, :mode, :name, :tileset_names, :flags, :note
    def initialize
      @id = 0
      @mode = 1
      @name = ''
      @tileset_names = Array.new(9).collect { '' }
      @flags = Table.new(8192)
      @flags[0] = 0x0010
      (2048..2815).each { |i| @flags[i] = 0x000F }
      (4352..8191).each { |i| @flags[i] = 0x000F }
      @note = ''
    end
  end

  class CommonEvent
    attr_accessor :id, :name, :trigger, :switch_id, :list
    def initialize
      @id = 0
      @name = ''
      @trigger = 0
      @switch_id = 1
      @list = [RPG::EventCommand.new]
    end
    def autorun?; @trigger == 1; end
    def parallel?; @trigger == 2; end
  end

  class System
    attr_accessor :game_title, :version_id, :japanese, :party_members, :currency_unit,
                  :skill_types, :weapon_types, :armor_types, :elements, :switches, :variables,
                  :boat, :ship, :airship, :title1_name, :title2_name, :opt_draw_title,
                  :opt_use_midi, :opt_transparent, :opt_followers, :opt_slip_death,
                  :opt_floor_death, :opt_display_tp, :opt_extra_exp, :window_tone,
                  :title_bgm, :battle_bgm, :battle_end_me, :gameover_me, :sounds,
                  :test_battlers, :test_troop_id, :start_map_id, :start_x, :start_y,
                  :terms, :battleback1_name, :battleback2_name, :battler_name,
                  :battler_hue, :edit_map_id
    def initialize
      @game_title = ''
      @version_id = 0
      @japanese = true
      @party_members = [1]
      @currency_unit = ''
      @elements = [nil, '']
      @skill_types = [nil, '']
      @weapon_types = [nil, '']
      @armor_types = [nil, '']
      @switches = [nil, '']
      @variables = [nil, '']
      @boat = RPG::System::Vehicle.new
      @ship = RPG::System::Vehicle.new
      @airship = RPG::System::Vehicle.new
      @title1_name = ''
      @title2_name = ''
      @opt_draw_title = true
      @opt_use_midi = false
      @opt_transparent = false
      @opt_followers = true
      @opt_slip_death = false
      @opt_floor_death = false
      @opt_display_tp = true
      @opt_extra_exp = false
      @window_tone = Tone.new(0, 0, 0)
      @title_bgm = RPG::BGM.new
      @battle_bgm = RPG::BGM.new
      @battle_end_me = RPG::ME.new
      @gameover_me = RPG::ME.new
      @sounds = Array.new(24) { RPG::SE.new }
      @test_battlers = []
      @test_troop_id = 1
      @start_map_id = 1
      @start_x = 0
      @start_y = 0
      @terms = RPG::System::Terms.new
      @battleback1_name = ''
      @battleback2_name = ''
      @battler_name = ''
      @battler_hue = 0
      @edit_map_id = 1
    end

    class Vehicle
      attr_accessor :character_name, :character_index, :bgm, :start_map_id, :start_x, :start_y
      def initialize
        @character_name = ''
        @character_index = 0
        @bgm = RPG::BGM.new
        @start_map_id = 0
        @start_x = 0
        @start_y = 0
      end
    end

    class Terms
      attr_accessor :basic, :params, :etypes, :commands
      def initialize
        @basic = Array.new(8) { '' }
        @params = Array.new(8) { '' }
        @etypes = Array.new(5) { '' }
        @commands = Array.new(23) { '' }
      end
    end

    class TestBattler
      attr_accessor :actor_id, :level, :equips
      def initialize
        @actor_id = 1
        @level = 1
        @equips = [0, 0, 0, 0, 0]
      end
    end
  end
end
`};var an=!!(window.webkit&&window.webkit.messageHandlers&&window.webkit.messageHandlers.tkr),F={ios:an,normalize(c){return String(c).replace(/\\/g,"/").replace(/^\.\//,"").replace(/\/+/g,"/")},gameURL(c){return"game/"+this.normalize(c).split("/").map(encodeURIComponent).join("/")},post(c){if(an)try{window.webkit.messageHandlers.tkr.postMessage(c)}catch(e){console.error(e)}else fetch("api/msg",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)}).catch(()=>{})},stage(c){console.log("[stage] "+c),an&&this.post({type:"stage",name:String(c).slice(0,300)})},log(c,e){c==="error"?console.error(e):console.log(e),an&&this.post({type:"log",level:c,text:String(e).slice(0,4e3)})}};var nt=`#version 300 es
in vec2 aPos;
in vec2 aUV;
uniform vec2 uRes;
out vec2 vUV;
void main() {
  vec2 p = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  vUV = aUV;
}`,tt=`#version 300 es
precision mediump float;
uniform sampler2D uTex;
uniform float uOpacity;
uniform vec4 uColor;
uniform vec4 uTone;
uniform float uBushV;
uniform float uBushOpacity;
in vec2 vUV;
out vec4 outColor;
const vec3 lumaF = vec3(0.299, 0.587, 0.114);
void main() {
  vec4 c = texture(uTex, vUV);
  float luma = dot(c.rgb, lumaF);
  c.rgb = mix(c.rgb, vec3(luma), uTone.w);
  c.rgb += uTone.rgb;
  c.rgb = mix(c.rgb, uColor.rgb, uColor.a);
  c.a *= uOpacity;
  if (vUV.y > uBushV) c.a *= uBushOpacity;
  outColor = c;
}`,st=`#version 300 es
precision mediump float;
uniform vec4 uFill;
in vec2 vUV;
out vec4 outColor;
void main() { outColor = uFill; }`,rt=`#version 300 es
precision mediump float;
uniform sampler2D uCur;
uniform sampler2D uFrozen;
uniform sampler2D uMask;
uniform float uProg;
uniform float uVague;
uniform int uUseMask;
in vec2 vUV;
out vec4 outColor;
void main() {
  vec4 cur = texture(uCur, vUV);
  vec4 fro = texture(uFrozen, vUV);
  float a;
  if (uUseMask == 1) {
    vec2 muv = vec2(vUV.x, 1.0 - vUV.y);
    float t = texture(uMask, muv).r;
    float v = max(uVague, 0.004);
    a = (clamp(t, uProg, uProg + v) - uProg) / v;
  } else {
    a = 1.0 - uProg;
  }
  outColor = vec4(mix(cur.rgb, fro.rgb, a), 1.0);
}`;function Hn(c,e,n){let s=c.createShader(e);if(c.shaderSource(s,n),c.compileShader(s),!c.getShaderParameter(s,c.COMPILE_STATUS))throw new Error("Shader compile error: "+c.getShaderInfoLog(s));return s}function Tn(c,e,n){let s=c.createProgram();if(c.attachShader(s,Hn(c,c.VERTEX_SHADER,nt)),c.attachShader(s,Hn(c,c.FRAGMENT_SHADER,e)),c.bindAttribLocation(s,0,"aPos"),c.bindAttribLocation(s,1,"aUV"),c.linkProgram(s),!c.getProgramParameter(s,c.LINK_STATUS))throw new Error("Program link error: "+c.getProgramInfoLog(s));let i={};for(let t of["uRes",...n])i[t]=c.getUniformLocation(s,t);return{p:s,u:i}}var on=class{constructor(e,n,s){this.canvas=e;let i=e.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1});if(!i)throw new Error("WebGL2 \u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093");this.gl=i,i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.NONE),this.sprite=Tn(i,tt,["uTex","uOpacity","uColor","uTone","uBushV","uBushOpacity"]),this.flat=Tn(i,st,["uFill"]),this.trans=Tn(i,rt,["uCur","uFrozen","uMask","uProg","uVague","uUseMask"]),this.vao=i.createVertexArray(),i.bindVertexArray(this.vao),this.vbo=i.createBuffer(),i.bindBuffer(i.ARRAY_BUFFER,this.vbo),i.enableVertexAttribArray(0),i.enableVertexAttribArray(1),i.vertexAttribPointer(0,2,i.FLOAT,!1,16,0),i.vertexAttribPointer(1,2,i.FLOAT,!1,16,8),this.verts=new Float32Array(24*4096),this.nverts=0,this.brightness=255,this.frozen=!1,this.transition=null,this.resize(n,s)}makeTarget(e,n){let s=this.gl,i=s.createTexture();s.bindTexture(s.TEXTURE_2D,i),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,e,n,0,s.RGBA,s.UNSIGNED_BYTE,null),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.NEAREST),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE);let t=s.createFramebuffer();return s.bindFramebuffer(s.FRAMEBUFFER,t),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,i,0),s.bindFramebuffer(s.FRAMEBUFFER,null),{tex:i,fbo:t,w:e,h:n}}freeTarget(e){e&&(this.gl.deleteTexture(e.tex),this.gl.deleteFramebuffer(e.fbo))}resize(e,n){this.width=e,this.height=n,this.canvas.width=e,this.canvas.height=n;for(let s of["screen","temp","frozenT"])this.freeTarget(this[s]);this.screen=this.makeTarget(e,n),this.temp=this.makeTarget(e,n),this.frozenT=this.makeTarget(e,n)}texFor(e){let n=this.gl;if(e.tex||(e.tex=n.createTexture(),n.bindTexture(n.TEXTURE_2D,e.tex),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),e.texVersion=-1,e.texRepeat=!1),e.texVersion!==e.version){n.bindTexture(n.TEXTURE_2D,e.tex);let s=e.source(),i=null;if(s)try{let t=s.getContext?s.getContext("2d",{willReadFrequently:!0}):null;i=t?t.getImageData(0,0,e.w,e.h).data:null}catch{i=null}i&&e.texW===e.w&&e.texH===e.h?n.texSubImage2D(n.TEXTURE_2D,0,0,0,e.w,e.h,n.RGBA,n.UNSIGNED_BYTE,i):i?(this.onCrumb&&this.onCrumb(`tex:${e.w}x${e.h}`,`texture upload ${e.w}x${e.h}`),n.texImage2D(n.TEXTURE_2D,0,n.RGBA,e.w,e.h,0,n.RGBA,n.UNSIGNED_BYTE,i),e.texW=e.w,e.texH=e.h):(n.texImage2D(n.TEXTURE_2D,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,new Uint8Array(4)),e.texW=e.texH=1),e.texVersion=e.version}return e.tex}setRepeat(e,n){if(e.texRepeat===n)return;let s=this.gl;s.bindTexture(s.TEXTURE_2D,e.tex);let i=n?s.REPEAT:s.CLAMP_TO_EDGE;s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,i),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,i),e.texRepeat=n}deleteTex(e){e.tex&&this.gl.deleteTexture(e.tex),e.tex=null}quad(e,n,s,i,t,r,a,o,l,d,_,u){this.nverts+6>this.verts.length/4&&this.grow();let f=this.verts,h=this.nverts*4;f[h++]=e,f[h++]=n,f[h++]=l,f[h++]=d,f[h++]=s,f[h++]=i,f[h++]=_,f[h++]=d,f[h++]=t,f[h++]=r,f[h++]=l,f[h++]=u,f[h++]=s,f[h++]=i,f[h++]=_,f[h++]=d,f[h++]=a,f[h++]=o,f[h++]=_,f[h++]=u,f[h++]=t,f[h++]=r,f[h++]=l,f[h++]=u,this.nverts+=6}rect(e,n,s,i,t,r,a,o){this.quad(e,n,e+s,n,e,n+i,e+s,n+i,t,r,a,o)}grow(){let e=new Float32Array(this.verts.length*2);e.set(this.verts),this.verts=e}flushWith(e){if(this.nverts===0)return;let n=this.gl;n.bindBuffer(n.ARRAY_BUFFER,this.vbo),n.bufferData(n.ARRAY_BUFFER,this.verts.subarray(0,this.nverts*4),n.STREAM_DRAW),n.drawArrays(n.TRIANGLES,0,this.nverts),this.nverts=0}setBlend(e){let n=this.gl;n.enable(n.BLEND),e===1?(n.blendEquation(n.FUNC_ADD),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ZERO,n.ONE)):e===2?(n.blendEquationSeparate(n.FUNC_REVERSE_SUBTRACT,n.FUNC_ADD),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ZERO,n.ONE)):(n.blendEquation(n.FUNC_ADD),n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA))}useSprite(e,n,s,i,t=2,r=1,a=0){let o=this.gl,l=this.sprite;o.useProgram(l.p),o.uniform2f(l.u.uRes,this.targetW,this.targetH),o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,e),o.uniform1i(l.u.uTex,0),o.uniform1f(l.u.uOpacity,n),s?o.uniform4f(l.u.uColor,s[0]/255,s[1]/255,s[2]/255,s[3]/255):o.uniform4f(l.u.uColor,0,0,0,0),i?o.uniform4f(l.u.uTone,i[0]/255,i[1]/255,i[2]/255,i[3]/255):o.uniform4f(l.u.uTone,0,0,0,0),o.uniform1f(l.u.uBushV,t),o.uniform1f(l.u.uBushOpacity,r),this.setBlend(a)}flush(){this.flushWith()}fillRect(e,n,s,i,t,r,a,o,l=0){let d=this.gl;d.useProgram(this.flat.p),d.uniform2f(this.flat.u.uRes,this.targetW,this.targetH),d.uniform4f(this.flat.u.uFill,t,r,a,o),this.setBlend(l),this.rect(e,n,s,i,0,0,0,0),this.flushWith()}bindTarget(e){let n=this.gl;e?(n.bindFramebuffer(n.FRAMEBUFFER,e.fbo),n.viewport(0,0,e.w,e.h),this.targetW=e.w,this.targetH=e.h):(n.bindFramebuffer(n.FRAMEBUFFER,null),n.viewport(0,0,this.canvas.width,this.canvas.height),this.targetW=this.canvas.width,this.targetH=this.canvas.height)}scissor(e){let n=this.gl;if(!e){n.disable(n.SCISSOR_TEST);return}n.enable(n.SCISSOR_TEST);let s=Math.max(0,e[0]|0),i=Math.max(0,e[1]|0),t=Math.min(this.targetW,e[0]+e[2]|0),r=Math.min(this.targetH,e[1]+e[3]|0);n.scissor(s,this.targetH-Math.max(i,r),Math.max(0,t-s),Math.max(0,r-i))}applyEffect(e,n,s){let i=this.gl,t=this.width,r=this.height;i.bindTexture(i.TEXTURE_2D,this.temp.tex),i.copyTexSubImage2D(i.TEXTURE_2D,0,0,0,0,0,t,r);let a=Math.max(0,e[0]),o=Math.max(0,e[1]),l=Math.min(t,e[0]+e[2]),d=Math.min(r,e[1]+e[3]);l<=a||d<=o||(this.useSprite(this.temp.tex,1,n,s),i.disable(i.BLEND),this.rect(a,o,l-a,d-o,a/t,1-o/r,l/t,1-d/r),this.flushWith())}beginScene(){let e=this.gl;this.bindTarget(this.screen),e.disable(e.SCISSOR_TEST),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT)}composeTo(e){let n=this.gl;this.bindTarget(e),n.disable(n.SCISSOR_TEST);let s=this.targetW,i=this.targetH;this.useSprite(this.screen.tex,1,null,null),n.disable(n.BLEND),this.rect(0,0,s,i,0,1,1,0),this.flushWith(),this.brightness<255&&this.fillRect(0,0,s,i,0,0,0,1-this.brightness/255)}present(){let e=this.gl;if(this.frozen&&!this.transition){this.bindTarget(null),e.disable(e.SCISSOR_TEST),this.useSprite(this.frozenT.tex,1,null,null),e.disable(e.BLEND),this.rect(0,0,this.targetW,this.targetH,0,1,1,0),this.flushWith();return}if(this.transition){this.composeTo(this.temp),this.bindTarget(null);let n=this.trans;e.useProgram(n.p),e.uniform2f(n.u.uRes,this.targetW,this.targetH),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.temp.tex),e.uniform1i(n.u.uCur,0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.frozenT.tex),e.uniform1i(n.u.uFrozen,1),e.activeTexture(e.TEXTURE2),e.bindTexture(e.TEXTURE_2D,this.transition.maskTex||this.temp.tex),e.uniform1i(n.u.uMask,2),e.uniform1f(n.u.uProg,this.transition.prog),e.uniform1f(n.u.uVague,this.transition.vague),e.uniform1i(n.u.uUseMask,this.transition.maskTex?1:0),e.disable(e.BLEND),this.rect(0,0,this.targetW,this.targetH,0,1,1,0),this.flushWith(),e.activeTexture(e.TEXTURE0);return}this.composeTo(null)}freeze(){this.composeTo(this.frozenT),this.frozen=!0}snapshotPixels(){let e=this.gl;this.composeTo(this.temp);let n=this.width,s=this.height,i=new Uint8Array(n*s*4);e.readPixels(0,0,n,s,e.RGBA,e.UNSIGNED_BYTE,i);let t=new Uint8ClampedArray(n*s*4),r=n*4;for(let a=0;a<s;a++)t.set(i.subarray((s-1-a)*r,(s-a)*r),a*r);return t}};var it=['"Hiragino Sans"','"Hiragino Kaku Gothic ProN"','"Noto Sans JP"','"Noto Sans CJK JP"',"sans-serif"];function Sn(c,e){let n=document.createElement("canvas");n.width=Math.max(1,c|0),n.height=Math.max(1,e|0);let s=n.getContext("2d",{willReadFrequently:!0});return[n,s]}var ke=class{constructor(e,n,s=null){this.w=Math.max(1,e|0),this.h=Math.max(1,n|0),this.image=s,this.canvas=null,this.c=null,this.version=1,this.tex=null,this.texVersion=-1}ctx(){if(!this.c){let[e,n]=Sn(this.w,this.h);if(!n)return console.error(`canvas ${this.w}x${this.h} could not be created`),e.width=e.height=1,null;if(this.canvas=e,this.c=n,n.imageSmoothingEnabled=!1,this.image){try{n.drawImage(this.image,0,0)}catch(s){console.error("copy image failed",s)}this.image=null}}return this.c}source(){return this.canvas||this.image}touch(){this.version++}free(){this.canvas&&(this.canvas.width=0,this.canvas.height=0),this.canvas=null,this.c=null,this.image=null,this.pixels=null}};function at(c,e,n,s,i,t,r,a){return n<0&&(r-=n,i+=n,n=0),s<0&&(a-=s,t+=s,s=0),n+i>c&&(i=c-n),s+t>e&&(t=e-s),[n,s,i,t,r,a]}function De(c,e,n,s){return`rgba(${c|0},${e|0},${n|0},${(s/255).toFixed(4)})`}var ln=class{constructor(e,n){this.host=e,this.renderer=n,this.map=new Map,this.next=1,this.imageCache=new Map,this.fontFamilies=new Set,this.measureCtx=document.createElement("canvas").getContext("2d")}crumb(e,n){this.crumbs||(this.crumbs=new Set),!(this.crumbs.has(e)||this.crumbs.size>2e3)&&(this.crumbs.add(e),this.host.stage(n))}get(e){let n=this.map.get(e);if(!n)throw new Error("disposed bitmap");return n}add(e){let n=this.next++;return this.map.set(n,e),n}create(e,n){return this.crumb(`create:${e}x${n}`,`Bitmap.new ${e}x${n}`),this.add(new ke(e,n))}async decode(e){let n=await fetch(e);if(!n.ok)throw new Error("not found");let s=await n.blob(),i=null,t=null;try{i=await createImageBitmap(s)}catch{t=URL.createObjectURL(s);let a=new Image;a.src=t,await a.decode(),i=a}try{let r=i.width,a=i.height,[o,l]=Sn(r,a);if(!l)throw new Error(`canvas ${r}x${a} unavailable`);return l.drawImage(i,0,0),o}finally{i&&i.close&&i.close(),t&&URL.revokeObjectURL(t)}}guard(e,n,s){try{return n()}catch(i){this.errors=(this.errors||0)+1,this.errors<=20&&this.host.log("error",`${e} failed: ${i&&i.name}: ${i&&i.message} ${s?s():""}`);return}}describe(e){if(!e)return"null";let n=e.source();return`${n?n.tagName||n.constructor.name:"none"} ${e.w}x${e.h} src=${n?n.width+"x"+n.height:"-"}`}async load(e){this.crumb("load:"+e,`load ${e}`);let n=this.host.gameURL(e),s=this.imageCache.get(n);s?(this.imageCache.delete(n),this.imageCache.set(n,s)):(s={p:this.decode(n),bytes:0},this.imageCache.set(n,s));let i;try{i=await s.p}catch{throw this.imageCache.delete(n),new Error("Unable to find file: "+e)}return s.bytes=i.width*i.height*4,this.crumb("loaded:"+e,`loaded ${e} ${i.width}x${i.height}`),this.trimImageCache(),this.add(new ke(i.width,i.height,i))}trimImageCache(e=48*1048576){let n=0;for(let s of this.imageCache.values())n+=s.bytes;for(let[s,i]of this.imageCache){if(n<=e)break;i.bytes&&(n-=i.bytes,this.imageCache.delete(s))}}memoryMB(){let e=0;for(let n of this.map.values()){let s=n.w*n.h*4;e+=(n.canvas?s:0)+(n.tex?s:0)}return Math.round(e/1048576)}fromPixels(e,n,s){let i=new ke(e,n);return i.ctx().putImageData(new ImageData(s,e,n),0,0),this.add(i)}dup(e){let n=this.get(e),s=new ke(n.w,n.h);return n.canvas?s.ctx().drawImage(n.canvas,0,0):s.image=n.image,this.add(s)}dispose(e){let n=this.map.get(e);n&&(this.renderer.deleteTex(n),n.free(),this.map.delete(e))}width(e){return this.get(e).w}height(e){return this.get(e).h}blt(e,n,s,i,t,r,a,o,l){let d=this.get(e),_=this.get(i);if([t,r,a,o,n,s]=at(_.w,_.h,t,r,a,o,n,s),a<=0||o<=0||l<=0)return;let u=d.ctx(),f=_.source();!u||!f||(this.crumb(`blt:${_.w}x${_.h}:${d.w}x${d.h}`,`blt ${_.w}x${_.h} -> ${d.w}x${d.h} (${a}x${o})`),this.guard("blt",()=>{u.globalAlpha=Math.min(1,l/255),u.drawImage(f,t,r,a,o,n,s,a,o)},()=>`src=${this.describe(_)} dst=${this.describe(d)} rect=${t},${r},${a},${o}`),u.globalAlpha=1,d.touch())}stretchBlt(e,n,s,i,t,r,a,o,l,d,_){let u=this.get(e),f=this.get(r);if(l===0||d===0||i===0||t===0||_<=0)return;let h=i/l,m=t/d;if(a<0&&(n-=a*h,i+=a*h,l+=a,a=0),o<0&&(s-=o*m,t+=o*m,d+=o,o=0),a+l>f.w){let y=a+l-f.w;l-=y,i-=y*h}if(o+d>f.h){let y=o+d-f.h;d-=y,t-=y*m}if(l<=0||d<=0)return;let g=u.ctx(),w=f.source();!g||!w||(this.crumb(`sblt:${f.w}x${f.h}:${u.w}x${u.h}`,`stretch_blt ${f.w}x${f.h} -> ${u.w}x${u.h}`),this.guard("stretch_blt",()=>{g.globalAlpha=Math.min(1,_/255),g.drawImage(w,a,o,l,d,n,s,i,t)},()=>`src=${this.describe(f)} dst=${this.describe(u)}`),g.globalAlpha=1,u.touch())}fill(e,n,s,i,t,r,a,o,l){let d=this.get(e),_=d.ctx();_.clearRect(n,s,i,t),l>0&&(_.fillStyle=De(r,a,o,l),_.fillRect(n,s,i,t)),d.touch()}gradient(e,n,s,i,t,r,a,o,l,d,_,u,f,h){let m=this.get(e),g=m.ctx();g.clearRect(n,s,i,t);let w=h?g.createLinearGradient(0,s,0,s+t):g.createLinearGradient(n,0,n+i,0);w.addColorStop(0,De(r,a,o,l)),w.addColorStop(1,De(d,_,u,f)),g.fillStyle=w,g.fillRect(n,s,i,t),m.touch()}clear(e){let n=this.get(e);!n.c&&!n.image||(n.ctx().clearRect(0,0,n.w,n.h),n.touch())}clearRect(e,n,s,i,t){let r=this.get(e);r.ctx().clearRect(n,s,i,t),r.touch()}getPixel(e,n,s){let i=this.get(e);if(n<0||s<0||n>=i.w||s>=i.h)return"0,0,0,0";if(i.w*i.h<=512*512){if(!i.pixels||i.pixelsVersion!==i.version){let l=i.source(),d=i.canvas?i.c:l&&l.getContext?l.getContext("2d"):i.ctx();if(!d||(i.pixels=this.guard("get_pixel",()=>d.getImageData(0,0,i.w,i.h).data)||null,i.pixelsVersion=i.version,!i.pixels))return"0,0,0,0"}let a=(s*i.w+n)*4,o=i.pixels;return`${o[a]},${o[a+1]},${o[a+2]},${o[a+3]}`}let t=i.ctx();if(!t)return"0,0,0,0";let r=this.guard("get_pixel",()=>t.getImageData(n,s,1,1).data);return r?`${r[0]},${r[1]},${r[2]},${r[3]}`:"0,0,0,0"}setPixel(e,n,s,i,t,r,a){let o=this.get(e);if(n<0||s<0||n>=o.w||s>=o.h)return;let l=new ImageData(1,1);l.data[0]=i,l.data[1]=t,l.data[2]=r,l.data[3]=a,o.ctx().putImageData(l,n,s),o.touch()}hueChange(e,n){let s=this.get(e);this.crumb("hue:"+s.w+"x"+s.h,`hue_change ${s.w}x${s.h}`);let i=s.ctx(),t=i.getImageData(0,0,s.w,s.h),r=t.data,a=n*Math.PI/180,o=Math.cos(a),l=Math.sin(a),d=[.299+.701*o+.168*l,.587-.587*o+.33*l,.114-.114*o-.497*l,.299-.299*o-.328*l,.587+.413*o+.035*l,.114-.114*o+.292*l,.299-.3*o+1.25*l,.587-.588*o-1.05*l,.114+.886*o-.203*l];for(let _=0;_<r.length;_+=4){if(r[_+3]===0)continue;let u=r[_],f=r[_+1],h=r[_+2];r[_]=d[0]*u+d[1]*f+d[2]*h,r[_+1]=d[3]*u+d[4]*f+d[5]*h,r[_+2]=d[6]*u+d[7]*f+d[8]*h}i.putImageData(t,0,0),s.touch()}blur(e){let n=this.get(e);this.crumb("blur:"+n.w+"x"+n.h,`blur ${n.w}x${n.h}`);let s=n.ctx(),i=n.w,t=n.h,a=s.getImageData(0,0,i,t).data,o=new Uint8ClampedArray(a.length);for(let l=0;l<t;l++)for(let d=0;d<i;d++){let _=0,u=0,f=0,h=0,m=0;for(let w=-1;w<=1;w++){let y=l+w;if(!(y<0||y>=t))for(let U=-1;U<=1;U++){let B=d+U;if(B<0||B>=i)continue;let P=(y*i+B)*4;_+=a[P],u+=a[P+1],f+=a[P+2],h+=a[P+3],m++}}let g=(l*i+d)*4;o[g]=_/m,o[g+1]=u/m,o[g+2]=f/m,o[g+3]=h/m}s.putImageData(new ImageData(o,i,t),0,0),n.touch()}radialBlur(e,n,s){let i=this.get(e),t=i.ctx();s=Math.max(2,Math.min(100,s|0));let[r,a]=Sn(i.w,i.h);a.drawImage(i.canvas,0,0),t.clearRect(0,0,i.w,i.h);let o=i.w/2,l=i.h/2;for(let d=0;d<s;d++){let _=(d/(s-1)-.5)*n*Math.PI/180;t.save(),t.globalAlpha=1/(d+1),t.translate(o,l),t.rotate(_),t.drawImage(r,-o,-l),t.restore()}r.width=0,i.touch()}parseFont(e){let n=e.split(";"),i=(n[0]?n[0].split("|").filter(l=>l):[]).map(l=>'"'+l.replace(/"/g,"")+'"').concat(it).join(","),t=Math.max(1,parseInt(n[1],10)||24),r=n[2]==="1",a=n[3]==="1",o=Math.round(t*.9*10)/10;return{css:`${a?"italic ":""}${r?"bold ":""}${o}px ${i}`,size:t,outline:n[4]==="1",shadow:n[5]==="1",color:n[6].split(",").map(Number),out:n[7].split(",").map(Number)}}textSize(e,n){let s=this.parseFont(e);return this.measureCtx.font=s.css,Math.ceil(this.measureCtx.measureText(n).width)}drawText(e,n,s,i,t,r,a,o){let l=this.get(e),d=l.ctx(),_=this.parseFont(o);this.crumb("text:"+_.css,`draw_text font: ${_.css}`),d.font=_.css;let u=d.measureText(r),f=u.width;if(f<=0)return;let h=u.fontBoundingBoxAscent??_.size*.88,m=u.fontBoundingBoxDescent??_.size*.12,g=1;i>0&&f>i&&(g=Math.max(.4,i/f));let w=f*g,y=n;a===1?y=n+(i-w)/2:a===2&&(y=n+i-w);let U=Math.round(s+(t-(h+m))/2+h);d.save(),d.translate(y,U),g!==1&&d.scale(g,1),d.textBaseline="alphabetic",_.shadow&&(d.fillStyle=De(0,0,0,_.color[3]),d.fillText(r,1,1)),_.outline&&(d.strokeStyle=De(_.out[0],_.out[1],_.out[2],_.out[3]),d.lineWidth=2,d.lineJoin="round",d.strokeText(r,0,0)),d.fillStyle=De(_.color[0],_.color[1],_.color[2],_.color[3]),d.fillText(r,0,0),d.restore(),l.touch()}async loadFont(e){try{let n=await fetch(this.host.gameURL(e));if(!n.ok)return;let s=await n.arrayBuffer(),i=ot(s);i.length===0&&i.push(e.split("/").pop().replace(/\.[^.]+$/,""));for(let t of i){if(this.fontFamilies.has(t))continue;let r=new FontFace(t,s);await r.load(),document.fonts.add(r),this.fontFamilies.add(t)}}catch(n){console.warn("font load failed",e,n)}}fontExists(e){if(this.fontFamilies.has(e))return!0;try{return document.fonts.check(`12px "${e}"`)}catch{return!1}}};function ot(c){let e=new Set;try{let n=new DataView(c),s=0;n.getUint32(0)===1953784678&&(s=n.getUint32(12));let t=n.getUint16(s+4),r=-1;for(let l=0;l<t;l++){let d=s+12+l*16;n.getUint32(d)===1851878757&&(r=n.getUint32(d+8))}if(r<0)return[];let a=n.getUint16(r+2),o=r+n.getUint16(r+4);for(let l=0;l<a;l++){let d=r+6+l*12,_=n.getUint16(d),u=n.getUint16(d+2),f=n.getUint16(d+6),h=n.getUint16(d+8),m=n.getUint16(d+10);if(f!==1&&f!==4)continue;let g="";if(_===3||_===0)for(let w=0;w<h;w+=2)g+=String.fromCharCode(n.getUint16(o+m+w));else if(_===1&&u===0)for(let w=0;w<h;w++)g+=String.fromCharCode(n.getUint8(o+m+w));else continue;g&&f===1&&e.add(g)}}catch{}return[...e]}var Vn=[[[2,4],[1,4],[2,3],[1,3]],[[2,0],[1,4],[2,3],[1,3]],[[2,4],[3,0],[2,3],[1,3]],[[2,0],[3,0],[2,3],[1,3]],[[2,4],[1,4],[2,3],[3,1]],[[2,0],[1,4],[2,3],[3,1]],[[2,4],[3,0],[2,3],[3,1]],[[2,0],[3,0],[2,3],[3,1]],[[2,4],[1,4],[2,1],[1,3]],[[2,0],[1,4],[2,1],[1,3]],[[2,4],[3,0],[2,1],[1,3]],[[2,0],[3,0],[2,1],[1,3]],[[2,4],[1,4],[2,1],[3,1]],[[2,0],[1,4],[2,1],[3,1]],[[2,4],[3,0],[2,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,4],[1,4],[0,3],[1,3]],[[0,4],[3,0],[0,3],[1,3]],[[0,4],[1,4],[0,3],[3,1]],[[0,4],[3,0],[0,3],[3,1]],[[2,2],[1,2],[2,3],[1,3]],[[2,2],[1,2],[2,3],[3,1]],[[2,2],[1,2],[2,1],[1,3]],[[2,2],[1,2],[2,1],[3,1]],[[2,4],[3,4],[2,3],[3,3]],[[2,4],[3,4],[2,1],[3,3]],[[2,0],[3,4],[2,3],[3,3]],[[2,0],[3,4],[2,1],[3,3]],[[2,4],[1,4],[2,5],[1,5]],[[2,0],[1,4],[2,5],[1,5]],[[2,4],[3,0],[2,5],[1,5]],[[2,0],[3,0],[2,5],[1,5]],[[0,4],[3,4],[0,3],[3,3]],[[2,2],[1,2],[2,5],[1,5]],[[0,2],[1,2],[0,3],[1,3]],[[0,2],[1,2],[0,3],[3,1]],[[2,2],[3,2],[2,3],[3,3]],[[2,2],[3,2],[2,1],[3,3]],[[2,4],[3,4],[2,5],[3,5]],[[2,0],[3,4],[2,5],[3,5]],[[0,4],[1,4],[0,5],[1,5]],[[0,4],[3,0],[0,5],[1,5]],[[0,2],[3,2],[0,3],[3,3]],[[0,2],[1,2],[0,5],[1,5]],[[0,4],[3,4],[0,5],[3,5]],[[2,2],[3,2],[2,5],[3,5]],[[0,2],[3,2],[0,5],[3,5]],[[0,0],[1,0],[0,1],[1,1]]],$n=[[[2,2],[1,2],[2,1],[1,1]],[[0,2],[1,2],[0,1],[1,1]],[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,2],[3,2],[2,1],[3,1]],[[0,2],[3,2],[0,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],[[2,2],[1,2],[2,3],[1,3]],[[0,2],[1,2],[0,3],[1,3]],[[2,0],[1,0],[2,3],[1,3]],[[0,0],[1,0],[0,3],[1,3]],[[2,2],[3,2],[2,3],[3,3]],[[0,2],[3,2],[0,3],[3,3]],[[2,0],[3,0],[2,3],[3,3]],[[0,0],[3,0],[0,3],[3,3]]],lt=[[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]]],ie=32,M=16,dn=class{constructor(){this.passes=[]}static isAuto(e){return e>=2048}emit(e,n,s,i,t,r,a,o,l,d){let _=e.get(n);_||(_=[],e.set(n,_)),_.push(a,o,l,d,s,i,t,r)}drawTile(e,n,s,i,t,r){n<=0||n>=8192||(n>=2048?this.drawAutotile(e,n,s,i,t,r):this.drawNormal(e,n,s,i))}drawNormal(e,n,s,i){let t;if(n>=1536&&n<1664)t=4;else if(n<1024)t=5+Math.floor(n/256);else return;let r=(Math.floor(n/128)%2*8+n%8)*ie,a=Math.floor(n%256/8)%16*ie;this.emit(e,t,r,a,ie,ie,s,i,ie,ie)}drawAutotile(e,n,s,i,t,r){let a=Vn,o=Math.floor((n-2048)/48),l=(n-2048)%48,d=o%8,_=Math.floor(o/8),u=0,f=0,h=0,m=!1;if(n<2816){let w=[0,1,2,1][t%4];h=0,o===0?(u=w*2,f=0):o===1?(u=w*2,f=3):o===2?(u=6,f=0):o===3?(u=6,f=3):(u=Math.floor(d/4)*8,f=_*6+Math.floor(d/2)%2*3,o%2===0?u+=w*2:(u+=6,a=lt,f+=t%3))}else n<4352?(h=1,u=d*2,f=(_-2)*3,m=r?(r[n]&128)!==0:!1):n<5888?(h=2,u=d*2,f=(_-6)*2,a=$n):(h=3,u=d*2,f=Math.floor((_-10)*2.5+(_%2===1?.5:0)),_%2===1&&(a=$n));let g=a[l];if(g)for(let w=0;w<4;w++){let y=g[w][0],U=g[w][1],B=(u*2+y)*M,P=(f*2+U)*M,k=s+w%2*M,j=i+Math.floor(w/2)*M;if(m&&(U===1||U===5)){let z=y,H=3;U===1&&(z=[0,3,2,1][y]),this.emit(e,h,(u*2+z)*M,(f*2+H)*M,M,M,k,j,M,M),j+=M/2,this.emit(e,h,B,P,M,M/2,k,j,M,M/2)}else this.emit(e,h,B,P,M,M,k,j,M,M)}}drawTableEdge(e,n,s,i){if(!(n>=2816&&n<4352))return;let t=Math.floor((n-2048)/48),r=(n-2048)%48,a=t%8,o=Math.floor(t/8),l=a*2,d=(o-2)*3,_=Vn[r];for(let u=0;u<2;u++){let f=_[2+u][0],h=_[2+u][1];this.emit(e,1,(l*2+f)*M,(d*2+h)*M+M/2,M,M/2,s+u*M,i,M,M/2)}}build(e,n,s,i,t,r,a){let o=[new Map,new Map,[],new Map],l=new Map;if(!e)return{lower:o,upper:l};let{data:d,xs:_,ys:u,zs:f}=e;if(_<=0||u<=0)return{lower:o,upper:l};let h=Math.floor(a/30),m=Math.floor(s/ie),g=Math.floor(i/ie),w=Math.floor((s+t-1)/ie),y=Math.floor((i+r-1)/ie),U=_*u,B=k=>k>=2816&&k<4352&&n&&(n[k]&128)!==0,P=k=>n&&k>0&&k<n.length&&(n[k]&16)!==0;for(let k=g;k<=y;k++){let j=(k%u+u)%u,z=((k-1)%u+u)%u,H=k*ie-i;for(let oe=m;oe<=w;oe++){let pe=(oe%_+_)%_,ne=oe*ie-s,W=j*_+pe,Y=d[W],V=f>1?d[W+U]:0,$=f>2?d[W+U*2]:0,te=f>3?d[W+U*3]:0;Y>0&&this.drawTile(P(Y)?l:o[0],Y,ne,H,h,n),V>0&&this.drawTile(P(V)?l:o[1],V,ne,H,h,n);let K=te&15;if(K&&o[2].push(ne,H,K),f>1){let Q=d[z*_+pe+U];B(Q)&&!B(V)&&!(Y>=4352&&Y<8192)&&this.drawTableEdge(o[1],Q,ne,H)}$>0&&this.drawTile(P($)?l:o[3],$,ne,H,h,n)}}return{lower:o,upper:l}}};var dt=1,ct=2,_t=3,ft=4,ut=5,pt={1:32,2:19,3:31,4:17,5:22},cn=class{constructor(e,n){this.r=e,this.bm=n,this.tables=new Map,this.tiles=new dn}uploadTable(e,n,s,i,t){let r=atob(n),a=r.length>>1,o=new Int16Array(a);for(let l=0;l<a;l++){let d=r.charCodeAt(l*2)|r.charCodeAt(l*2+1)<<8;o[l]=d>32767?d-65536:d}this.tables.set(e,{data:o,xs:s,ys:i,zs:t})}freeTable(e){this.tables.delete(e)}bmp(e){return e&&this.bm.map.get(e)||null}render(e){let n=e.length?e.split(",").map(Number):[],s=this.r;s.brightness=n.length?n[0]:255;let i=new Map,t=[],r=1,a=[];for(;r<n.length;){let u=n[r],f=pt[u];if(!f)break;if(u===ut){let h={uid:n[r+1],z:n[r+2],visible:n[r+3]!==0,rect:[n[r+4],n[r+5],n[r+6],n[r+7]],ox:n[r+8],oy:n[r+9],color:[n[r+10],n[r+11],n[r+12],n[r+13]],tone:[n[r+14],n[r+15],n[r+16],n[r+17]],flash:[n[r+18],n[r+19],n[r+20],n[r+21]],children:[]};i.set(h.uid,h),t.push({z:h.z,uid:h.uid,vp:h})}else a.push(r);r+=f}for(let u of a){let f=n[u],h=n[u+2],m=h?i.get(h):null,g=m?m.children:t;h&&!m||(f===ft?(g.push({z:0,uid:n[u+1],tilemap:u,layer:0}),g.push({z:200,uid:n[u+1],tilemap:u,layer:1})):g.push({z:n[u+3],uid:n[u+1],rec:u}))}let o=(u,f)=>u.z-f.z||u.uid-f.uid;t.sort(o);let l=s.width,d=s.height,_=[0,0,l,d];this.a=n,s.beginScene(),this.tileCache=new Map;for(let u of t)if(u.vp){let f=u.vp;if(!f.visible)continue;let h=Wn(f.rect,_);if(h[2]<=0||h[3]<=0)continue;f.children.sort(o),s.scissor(h);let m=f.rect[0]-f.ox,g=f.rect[1]-f.oy;for(let y of f.children)this.drawItem(y,m,g,f.rect,h);s.scissor(null);let w=f.flash[3]>0?f.flash:f.color;(w[3]>0||f.tone[0]||f.tone[1]||f.tone[2]||f.tone[3])&&(this.onCrumb&&this.onCrumb(`vfx:${h.join("x")}:${w[3]>0}:${!!(f.tone[0]||f.tone[1]||f.tone[2]||f.tone[3])}`,`viewport effect ${h.join(",")} color=${w[3]>0} tone=${f.tone.join("/")}`),s.applyEffect(h,w,f.tone))}else this.drawItem(u,0,0,_,_);s.scissor(null)}drawItem(e,n,s,i,t){let r=this.a;if(e.tilemap!==void 0)return this.drawTilemap(e.tilemap,e.layer,n,s,i,t);let a=e.rec;switch(r[a]){case dt:return this.drawSprite(a,n,s);case ct:return this.drawPlane(a,i,t);case _t:return this.drawWindow(a,n,s,t)}}drawSprite(e,n,s){let i=this.a,t=this.r,r=this.bmp(i[e+4]);if(!r)return;let a=i[e+5]+n,o=i[e+6]+s,l=i[e+7],d=i[e+8],_=i[e+9],u=i[e+10],f=i[e+11],h=i[e+12]!==0,m=i[e+13],g=i[e+14],w=i[e+15],y=i[e+16],U=i[e+17]/255,B=i[e+18],P=i[e+19],k=i[e+20]/255,j=[i[e+21],i[e+22],i[e+23],i[e+24]],z=[i[e+25],i[e+26],i[e+27],i[e+28]],H=i[e+29],oe=i[e+30],pe=i[e+31];if(U<=0||_===0||u===0)return;if(this.onCrumb){let E=`b${B}${f?" rot":""}${h?" mir":""}${H>0?" wave":""}${P>0?" bush":""}${j[3]>0?" color":""}${z[0]||z[1]||z[2]||z[3]?" tone":""}${_!==1||u!==1?" zoom":""}`;this.onCrumb("spr:"+E,`sprite ${E} (${r.w}x${r.h})`)}let ne=w,W=0,Y=0;if(m<0&&(W=-m,w+=m,m=0),g<0&&(Y=-g,y+=g,g=0),m+w>r.w&&(w=r.w-m),g+y>r.h&&(y=r.h-g),w<=0||y<=0)return;let V=t.texFor(r),$=r.w,te=r.h,K=m/$,Q=(m+w)/$,q=g/te,he=(g+y)/te;if(h){let E=K;K=Q,Q=E,W=ne-W-w}let fe=P>0?(g+y-P)/te:2;if(t.useSprite(V,U,j,z,fe,k,B),H>0&&f===0){for(let S=0;S<y;S+=2){let C=Math.min(2,y-S),D=(pe+(Y+S)*360/Math.max(1,oe))*Math.PI/180,v=H*Math.sin(D),R=a+(W-l+v)*_,A=o+(Y+S-d)*u;t.rect(R,A,w*_,C*u,K,(g+S)/te,Q,(g+S+C)/te)}t.flush();return}let p=(W-l)*_,b=(Y-d)*u,T=(W+w-l)*_,x=(Y+y-d)*u;if(f===0)t.rect(a+p,o+b,T-p,x-b,K,q,Q,he);else{let E=-f*Math.PI/180,S=Math.cos(E),C=Math.sin(E),D=(me,ge)=>[a+me*S-ge*C,o+me*C+ge*S],v=D(p,b),R=D(T,b),A=D(p,x),se=D(T,x);t.quad(v[0],v[1],R[0],R[1],A[0],A[1],se[0],se[1],K,q,Q,he)}t.flush()}drawPlane(e,n,s){let i=this.a,t=this.r,r=this.bmp(i[e+4]);if(!r)return;let a=i[e+5],o=i[e+6],l=i[e+7]||1,d=i[e+8]||1,_=i[e+9]/255,u=i[e+10],f=[i[e+11],i[e+12],i[e+13],i[e+14]],h=[i[e+15],i[e+16],i[e+17],i[e+18]];if(_<=0)return;this.onCrumb&&this.onCrumb(`plane:${r.w}x${r.h}:${u}`,`plane ${r.w}x${r.h} blend ${u} zoom ${l}x${d}`);let m=t.texFor(r);t.setRepeat(r,!0);let g=s[0],w=s[1],y=s[2],U=s[3],B=r.w*l,P=r.h*d,k=(g-n[0]+a)/B,j=(w-n[1]+o)/P,z=k+y/B,H=j+U/P;t.useSprite(m,_,f,h,2,1,u),t.rect(g,w,y,U,k,j,z,H),t.flush(),t.setRepeat(r,!1)}drawWindow(e,n,s,i){let t=this.a,r=this.r,a=this.bmp(t[e+4]),o=this.bmp(t[e+5]),l=t[e+6]+n,d=t[e+7]+s,_=t[e+8],u=t[e+9],f=t[e+10],h=t[e+11],m=t[e+12],g=t[e+13],w=t[e+14]/255,y=t[e+15]/255,U=t[e+16]/255,B=t[e+17],P=t[e+18],k=t[e+19],j=t[e+20],z=t[e+21],H=t[e+22]!==0,oe=t[e+23]!==0,pe=t[e+24]!==0,ne=[t[e+25],t[e+26],t[e+27],t[e+28]],W=t[e+29],Y=t[e+30]!==0;if(_<=0||u<=0||B<=0)return;let V=Math.round(u*B/255),$=d+Math.round((u-V)/2);if(a&&V>0){let p=r.texFor(a),b=a.w,T=a.h,x=(v,R,A,se,me,ge,Ke,He)=>{Ke<=0||He<=0||r.rect(me,ge,Ke,He,v/b,R/T,(v+A)/b,(R+se)/T)},E=l+2,S=$+2,C=_-4,D=V-4;if(C>0&&D>0&&y*w>0){r.useSprite(p,y*w,null,ne),x(0,0,64,64,E,S,C,D),r.flush(),r.useSprite(p,y*w,null,ne);for(let v=0;v<D;v+=64){let R=Math.min(64,D-v);for(let A=0;A<C;A+=64){let se=Math.min(64,C-A);x(0,64,se,R,E+A,S+v,se,R)}}r.flush()}if(w>0){r.useSprite(p,w,null,null);let v=16,R=Math.min(v,Math.floor(V/2)),A=Math.min(v,Math.floor(_/2));x(64,0,A,R,l,$,A,R),x(128-A,0,A,R,l+_-A,$,A,R),x(64,64-R,A,R,l,$+V-R,A,R),x(128-A,64-R,A,R,l+_-A,$+V-R,A,R),x(64+v,0,32,R,l+A,$,_-A*2,R),x(64+v,64-R,32,R,l+A,$+V-R,_-A*2,R),x(64,v,A,32,l,$+R,A,V-R*2),x(128-A,v,A,32,l+_-A,$+R,A,V-R*2),r.flush()}}if(B<255)return;let te=[l+m,d+m,_-m*2,u-m-g],K=Wn(te,i);if(a&&j>0&&z>0&&K[2]>0&&K[3]>0){let p=r.texFor(a),b=a.w,T=a.h,x=1;if(H){let A=W%40;x=(255-(A<20?A:40-A)*6)/255}else x=.6;let E=l+m+P-(Y?f:0),S=d+m+k-(Y?h:0);r.scissor(K),r.useSprite(p,x*U,null,null);let C=4,D=(A,se,me,ge,Ke,He,In,On)=>{In<=0||On<=0||r.rect(Ke,He,In,On,A/b,se/T,(A+me)/b,(se+ge)/T)},v=Math.min(C,Math.floor(j/2)),R=Math.min(C,Math.floor(z/2));D(64,64,v,R,E,S,v,R),D(96-v,64,v,R,E+j-v,S,v,R),D(64,96-R,v,R,E,S+z-R,v,R),D(96-v,96-R,v,R,E+j-v,S+z-R,v,R),D(64+C,64,32-C*2,R,E+v,S,j-v*2,R),D(64+C,96-R,32-C*2,R,E+v,S+z-R,j-v*2,R),D(64,64+C,v,32-C*2,E,S+R,v,z-R*2),D(96-v,64+C,v,32-C*2,E+j-v,S+R,v,z-R*2),D(64+C,64+C,32-C*2,32-C*2,E+v,S+R,j-v*2,z-R*2),r.flush(),r.scissor(i)}if(o&&U>0&&K[2]>0&&K[3]>0){let p=r.texFor(o);r.scissor(K),r.useSprite(p,U,null,null),r.rect(l+m-f,d+m-h,o.w,o.h,0,0,1,1),r.flush(),r.scissor(i)}if(!a)return;let Q=r.texFor(a),q=a.w,he=a.h,fe=(p,b,T,x,E,S)=>r.rect(E,S,T,x,p/q,b/he,(p+T)/q,(b+x)/he);if(pe&&o){r.useSprite(Q,1,null,null);let p=_-m*2,b=u-m-g;h>0&&fe(88,16,16,8,l+_/2-8,d+4),o.h-h>b&&fe(88,40,16,8,l+_/2-8,d+u-12),f>0&&fe(80,24,8,16,l+4,d+u/2-8),o.w-f>p&&fe(104,24,8,16,l+_-12,d+u/2-8),r.flush()}if(oe){let p=Math.floor(W/8)%4;r.useSprite(Q,1,null,null),fe(96+p%2*16,64+Math.floor(p/2)*16,16,16,l+_/2-8,d+u-16),r.flush()}}drawTilemap(e,n,s,i,t,r){let a=this.a,o=this.r,l=this.tileCache.get(e);if(!l){let h=a[e+3],m=a[e+4],g=a[e+5],w=this.tables.get(a[e+15]),y=this.tables.get(a[e+16]);l=this.tiles.build(w,y?y.data:null,h+t[0]-s,m+t[1]-i,t[2],t[3],g),this.tileCache.set(e,l)}let d=[];for(let h=0;h<9;h++)d.push(this.bmp(a[e+6+h]));let _=t[0],u=t[1],f=h=>{for(let[m,g]of h){let w=d[m];if(!w)continue;let y=o.texFor(w),U=w.w,B=w.h;o.useSprite(y,1,null,null);for(let P=0;P<g.length;P+=8){let k=g[P+4],j=g[P+5],z=g[P+6],H=g[P+7];o.rect(_+g[P],u+g[P+1],g[P+2],g[P+3],k/U,j/B,(k+z)/U,(j+H)/B)}o.flush()}};if(n===0){f(l.lower[0]),f(l.lower[1]);let h=l.lower[2];if(h.length)for(let m=0;m<h.length;m+=3){let g=h[m+2];for(let w=0;w<4;w++)g&1<<w&&o.fillRect(_+h[m]+w%2*16,u+h[m+1]+Math.floor(w/2)*16,16,16,0,0,0,.5)}f(l.lower[3])}else f(l.upper)}};function Wn(c,e){let n=Math.max(c[0],e[0]),s=Math.max(c[1],e[1]),i=Math.min(c[0]+c[2],e[0]+e[2]),t=Math.min(c[1]+c[3],e[1]+e[3]);return[n,s,Math.max(0,i-n),Math.max(0,t-s)]}var I={DOWN:0,LEFT:1,RIGHT:2,UP:3,A:4,B:5,C:6,X:7,Y:8,Z:9,L:10,R:11,SHIFT:12,CTRL:13,ALT:14,F5:15,F6:16,F7:17,F8:18,F9:19},Yn=20,ht={ArrowDown:[I.DOWN],ArrowLeft:[I.LEFT],ArrowRight:[I.RIGHT],ArrowUp:[I.UP],Numpad2:[I.DOWN],Numpad4:[I.LEFT],Numpad6:[I.RIGHT],Numpad8:[I.UP],Space:[I.C],Enter:[I.C],NumpadEnter:[I.C],KeyZ:[I.C],Escape:[I.B],KeyX:[I.B],Numpad0:[I.B],Insert:[I.B],ShiftLeft:[I.A,I.SHIFT],ShiftRight:[I.A,I.SHIFT],KeyA:[I.X],KeyS:[I.Y],KeyD:[I.Z],KeyQ:[I.L],PageUp:[I.L],KeyW:[I.R],PageDown:[I.R],ControlLeft:[I.CTRL],ControlRight:[I.CTRL],AltLeft:[I.ALT],AltRight:[I.ALT],F5:[I.F5],F6:[I.F6],F7:[I.F7],F8:[I.F8],F9:[I.F9]},_n=class{constructor(){this.keyMask=0,this.nativeMask=0,this.prev=0,this.latched=0,this.counts=new Int32Array(Yn),this.dirOrder=[],this.onReset=null,this.onAnyKey=null,window.addEventListener("keydown",e=>this.key(e,!0)),window.addEventListener("keyup",e=>this.key(e,!1)),window.addEventListener("blur",()=>{this.keyMask=0})}key(e,n){if(e.code==="F12"&&n){this.onReset&&this.onReset(),e.preventDefault();return}let s=ht[e.code];if(s){e.preventDefault();for(let i of s)n?(this.keyMask|=1<<i,this.latched|=1<<i):this.keyMask&=~(1<<i);n&&this.onAnyKey&&this.onAnyKey()}}setNative(e){e|=0,this.latched|=e&~this.nativeMask,this.nativeMask=e,e&&this.onAnyKey&&this.onAnyKey()}current(){return this.keyMask|this.nativeMask}update(){let e=this.current()|this.latched&~this.prev;this.latched=0;let n=e&~this.prev,s=0;for(let u=0;u<Yn;u++)if(e&1<<u){let f=++this.counts[u];(f===1||f>=24&&(f-24)%6===0)&&(s|=1<<u)}else this.counts[u]=0;for(let[u,f]of[[I.DOWN,2],[I.LEFT,4],[I.RIGHT,6],[I.UP,8]]){let h=this.dirOrder.indexOf(f);e&1<<u?h<0&&this.dirOrder.push(f):h>=0&&this.dirOrder.splice(h,1)}let i=0,t=!!(e&1<<I.DOWN),r=!!(e&1<<I.UP),a=!!(e&1<<I.LEFT),o=!!(e&1<<I.RIGHT),l=t&&!r?2:r&&!t?8:0,d=a&&!o?4:o&&!a?6:0;for(let u=this.dirOrder.length-1;u>=0;u--){let f=this.dirOrder[u];if(f===l||f===d){i=f;break}}let _=0;return d&&l?_=l===2?d===4?1:3:d===4?7:9:_=d||l,this.prev=e,`${e},${n},${s},${i},${_}`}};var Z=c=>document.getElementById(c);function mt(c){let e=atob(c),n=new Uint8Array(e.length);for(let s=0;s<e.length;s++)n[s]=e.charCodeAt(s);return n}function gt(c){let e="";for(let s=0;s<c.length;s+=32768)e+=String.fromCharCode.apply(null,c.subarray(s,s+32768));return btoa(e)}var An={resolve:null,show(c,e,n){Z("ov-title").textContent=c,Z("ov-body").textContent=e,Z("ov-hint").textContent=n||"",Z("overlay").style.display="flex"},hide(){Z("overlay").style.display="none"},wait(c){return new Promise(e=>{let n=!1;setTimeout(()=>{n=!0},250);let s=()=>{n&&(Z("overlay").removeEventListener("pointerup",s),c.onAnyKey=null,this.hide(),e())};Z("overlay").addEventListener("pointerup",s),c.onAnyKey=s})}};function wt(c,e){let n=new Map,s=i=>{let t=n;for(let r of i){let a=t.get(r);a instanceof _e||(a=new _e(new Map),t.set(r,a)),t=a.contents}return t};for(let i of c){let t=i.split("/").filter(o=>o),r=t.pop();if(!r)continue;let a=s(t);a.has(r)||a.set(r,new ae(new Uint8Array(0)))}for(let[i,t]of Object.entries(e||{})){let r=i.split("/").filter(o=>o),a=r.pop();s(r).set(a,new ae(mt(t)))}return n}function Nn(c,e){let n=F.normalize(e).split("/").filter(i=>i&&i!=="."),s=c;for(let i=0;i<n.length;i++){let t=s.get(n[i]);if(!t)return null;if(i===n.length-1)return t;if(!(t instanceof _e))return null;s=t.contents}return null}window.addEventListener("error",c=>F.log("error","JS error: "+(c.message||c)+" @"+(c.filename||"")+":"+(c.lineno||"")));window.addEventListener("unhandledrejection",c=>F.log("error","Unhandled rejection: "+(c.reason&&c.reason.stack||c.reason)));async function bt(){let c=Z("loading");F.stage("page loaded (runtime 56fa9e1 2026-11-18T11:52)");let e=await(await fetch(F.gameURL("__boot.json"))).json();F.stage(`boot info: engine=${e.engine} files=${(e.files||[]).length} preload=${Object.keys(e.preload||{}).length}`);let n=e.engine===2?2:3,s=e.settings||{};document.title=e.title||"TukuruPlayer";let i=Z("screen"),t=new on(i,544,416),r=new ln(F,t),a=new cn(t,r);t.onCrumb=(p,b)=>r.crumb(p,b),a.onCrumb=(p,b)=>r.crumb(p,b);let o=new _n;i.addEventListener("webglcontextlost",()=>F.log("error","WebGL context lost (GPU process restarted?)")),i.addEventListener("webglcontextrestored",()=>F.log("error","WebGL context restored"));let l=()=>{let p=window.innerWidth,b=window.innerHeight,T=t.width,x=t.height,E=Math.min(p/T,b/x);s.scale==="integer"&&E>=1&&(E=Math.floor(E)),i.style.width=Math.floor(T*E)+"px",i.style.height=Math.floor(x*E)+"px";let S=b>p;Z("stage").style.alignItems=S&&s.portraitTop!==!1?"flex-start":"center",Z("stage").style.paddingTop=S?"env(safe-area-inset-top)":"0"};s.smooth||i.classList.add("pixelated"),window.addEventListener("resize",l),l(),s.showFPS&&(Z("fps").style.display="block");let d=(e.files||[]).filter(p=>/^fonts\/.+\.(ttf|otf|ttc)$/i.test(p));s.gameFonts===!1?F.stage(`fonts: ${d.length} (skipped by setting)`):(F.stage(`fonts: ${d.length} ${d.join(", ")}`),await Promise.all(d.map(p=>r.loadFont(p))),F.stage(`font families: ${[...r.fontFamilies].join(", ")||"(none)"}`));let _=!1,u=!1,f=null,h=performance.now(),m=60,g=0,w=performance.now(),y=p=>{if(requestAnimationFrame(y),!f||_)return;let b=1e3/m,T=p-h;if(T<b-1.5)return;h=T>b*3?p:h+b;let x=f;f=null,x(),g++,p-w>=1e3&&(Z("fps").textContent=g+" fps",g=0,w=p)};requestAnimationFrame(y),o.onReset=()=>{u=!0};let U=wt(e.files||[],e.preload||{}),B=new Map,P=new Set;for(let p of e.files||[])B.set(p.toLowerCase(),p),P.add(p);for(let p of Object.keys(e.preload||{}))B.set(p.toLowerCase(),p),P.delete(p);let k=async p=>{if(!P.has(p))return!0;let b=await fetch(F.gameURL(p));if(!b.ok)return!1;let T=new Uint8Array(await b.arrayBuffer()),x=p.split("/"),E=x.pop(),S=x.length?Nn(U,x.join("/")):null;return(S?S.contents:U).set(E,new ae(T)),P.delete(p),!0},j=/\.(png|jpe?g|bmp|gif|ogg|wav|mp3|m4a|mid|midi|wma|aac|ogv|mp4|avi|wmv|mpg|ttf|otf|ttc|rgss3a|rgss2a|rgssad|exe|dll|lnk|ico)$/i,z=[...P].filter(p=>!j.test(p)&&!/^(graphics|audio|movies|fonts|system)\//i.test(p));if(z.length){c.textContent=`\u30C7\u30FC\u30BF\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026 (${z.length})`,F.stage(`preloading ${z.length} data files`);let p=0,b=async()=>{for(;p<z.length;){let T=z[p++];try{await k(T)}catch(x){F.log("error",`preload failed: ${T}: ${x}`)}}};await Promise.all(Array.from({length:6},b))}let H=new Map,oe=Ge.lineBuffered(p=>F.log("info",p)),pe=Ge.lineBuffered(p=>F.log("error",p)),ne=new En([],["RUBYOPT=","HOME=/game","RUBY_FIBER_VM_STACK_SIZE=1048576","RUBY_THREAD_VM_STACK_SIZE=1048576"],[new Pe(new ae([])),oe,pe,new Ue("/game",U),new Ue("/tkrtmp",H)],{debug:!1});if(c.textContent="Ruby \u3092\u8D77\u52D5\u4E2D\u2026",F.stage(`compiling ruby.wasm (WebAssembly ${typeof WebAssembly})`),typeof WebAssembly>"u")throw new Error("WebAssembly \u304C\u4F7F\u3048\u307E\u305B\u3093\u3002\u8A2D\u5B9A\u306E\u300CJIT\uFF08\u9AD8\u901F\u5316\uFF09\u3092\u4F7F\u308F\u306A\u3044\u300D\u3092\u30AA\u30D5\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002");let W;try{W=await WebAssembly.compileStreaming(fetch("ruby.wasm"))}catch{let b=await(await fetch("ruby.wasm")).arrayBuffer();W=await WebAssembly.compile(b)}let{vm:Y,instance:V}=await Ye.instantiateModule({module:W,wasip1:ne,args:["ruby.wasm","--disable-gems","-W0","-EUTF-8","-e_=0"]});F.stage("ruby vm ready");let $=V?V.exports.memory:null,te=()=>{try{return $?Math.round($.buffer.byteLength/1048576):-1}catch{return-1}},K=0,Q=(p,...b)=>F.post({type:"audio",op:p,args:b}),q={frame:0,t:0,draw:0},he=0,fe=null;window.TKR={engine:n,title:e.title||"",bmpCreate:(p,b)=>r.create(p,b),bmpLoad:p=>r.load(p),bmpW:p=>r.width(p),bmpH:p=>r.height(p),bmpDispose:p=>r.dispose(p),bmpDup:p=>r.dup(p),bmpBlt:(p,b,T,x,E,S,C,D,v)=>r.blt(p,b,T,x,E,S,C,D,v),bmpStretch:(p,b,T,x,E,S,C,D,v,R,A)=>r.stretchBlt(p,b,T,x,E,S,C,D,v,R,A),bmpFill:(p,b,T,x,E,S,C,D,v)=>r.fill(p,b,T,x,E,S,C,D,v),bmpGrad:(p,b,T,x,E,S,C,D,v,R,A,se,me,ge)=>r.gradient(p,b,T,x,E,S,C,D,v,R,A,se,me,ge),bmpClear:p=>r.clear(p),bmpClearRect:(p,b,T,x,E)=>r.clearRect(p,b,T,x,E),bmpGetPixel:(p,b,T)=>r.getPixel(p,b,T),bmpSetPixel:(p,b,T,x,E,S,C)=>r.setPixel(p,b,T,x,E,S,C),bmpHue:(p,b)=>r.hueChange(p,b),bmpBlur:p=>r.blur(p),bmpRadialBlur:(p,b,T)=>r.radialBlur(p,b,T),bmpDrawText:(p,b,T,x,E,S,C,D)=>r.drawText(p,b,T,x,E,S,C,D),textSize:(p,b)=>r.textSize(p,b),bitmapMB:()=>r.memoryMB(),bitmapCount:()=>r.map.size,fontExists:p=>r.fontExists(p)?1:0,tableUpload:(p,b,T,x,E)=>a.uploadTable(p,b,T,x,E),tableFree:p=>a.freeTable(p),render:p=>{window.TKR.lastList=p;let b=performance.now();if(a.render(p),t.present(),K++,q.draw+=performance.now()-b,K===1||K%120===0){let T=performance.now(),x=K-q.frame,E=(T-q.t)/1e3,S=q.frame&&E>0?(x/E).toFixed(1):"-",C=x>0?(q.draw/x).toFixed(1):"-";F.stage(`frame ${K}: ${S} fps (draw ${C}ms), wasm ${te()}MB, bitmaps ${r.map.size} (${r.memoryMB()}MB), ${t.width}x${t.height}`),q.frame=K,q.t=T,q.draw=0}},frame:()=>new Promise(p=>{if(u){u=!1,p("reset");return}f=()=>{if(u){u=!1,p("reset");return}p("")}}),setFrameRate:p=>{m=Math.max(10,Math.min(120,p))},freeze:p=>{a.render(p),t.freeze()},unfreeze:()=>{t.frozen=!1,t.transition=null},transitionStep:(p,b,T,x)=>{let E=null;if(T){let S=r.map.get(T);S&&(E=t.texFor(S))}t.transition={prog:b,maskTex:E,vague:x/255},a.render(p),t.present()},snap:p=>{a.render(p);let b=t.snapshotPixels();return r.fromPixels(t.width,t.height,b)},resize:(p,b)=>{p===t.width&&b===t.height||(t.resize(p,b),l(),F.stage(`resize_screen ${p}x${b}`),F.post({type:"resolution",w:p,h:b}))},inputUpdate:()=>o.update(),audio:Q,bgmPos:()=>he,loadData:async p=>{let b=await fetch(F.gameURL(p));if(!b.ok)throw new Error("Unable to find file: "+p);let T=new Uint8Array(await b.arrayBuffer());return H.set("load.bin",new ae(T)),"/tkrtmp/load.bin"},syncFile:p=>{let b=Nn(U,p);return!b||!(b instanceof ae)?!1:(F.post({type:"save",path:F.normalize(p),data:gt(b.data)}),!0)},deleteFile:p=>{F.post({type:"delete",path:F.normalize(p)})},fsResolve:p=>{let b=F.normalize(p);return Nn(U,b)?b:B.get(b.toLowerCase())||""},isPlaceholder:p=>P.has(p)?1:0,materialize:p=>k(p),log:p=>F.log("info",p),msgbox:async p=>{An.show(e.title||"",p,"\u30BF\u30C3\u30D7 / \u30DC\u30BF\u30F3\u3067\u9589\u3058\u308B"),await An.wait(o)},exit:()=>F.post({type:"exit"}),error:(p,b)=>{F.log("error",p+`
`+b),An.show(p,b,""),F.post({type:"error",title:p,text:b})},ready:()=>{c.style.display="none",F.post({type:"ready"})},stage:p=>F.stage(p)},window.TKRNative={input:p=>o.setNative(p),bgmPos:p=>{he=p},pause:p=>{_=!!p,p||(h=performance.now())},reset:()=>{u=!0},settings:p=>{Object.assign(s,p),i.classList.toggle("pixelated",!s.smooth),Z("fps").style.display=s.showFPS?"block":"none",l()}},c.textContent="\u30B2\u30FC\u30E0\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026",F.stage("loading RGSS runtime"),Y.eval(`$TKR_ENGINE = ${n}`);for(let p of Object.keys(vn).sort())if(!(n===3&&p.startsWith("rpg2"))&&!(n===2&&p.startsWith("rpg3")))try{Y.eval(vn[p])}catch(b){window.TKR.error("Runtime load error: "+p,String(b.message||b));return}F.stage(`runtime loaded (wasm ${te()}MB)`);try{await Y.evalAsync("TKRBoot.run")}catch(p){window.TKR.error("Fatal error",String(p.message||p))}}bt().catch(c=>{console.error(c);let e=document.getElementById("overlay");document.getElementById("ov-title").textContent="\u8D77\u52D5\u30A8\u30E9\u30FC",document.getElementById("ov-body").textContent=String(c&&c.stack||c),e.style.display="flex",F.post({type:"error",title:"\u8D77\u52D5\u30A8\u30E9\u30FC",text:String(c)})});})();
