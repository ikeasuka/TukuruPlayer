// WebGL2 renderer for the RGSS display list.
// All drawing goes into an offscreen "screen" framebuffer at game resolution,
// which is then composed (brightness / freeze / transition) onto the canvas.

const VS = `#version 300 es
in vec2 aPos;
in vec2 aUV;
uniform vec2 uRes;
out vec2 vUV;
void main() {
  vec2 p = aPos / uRes * 2.0 - 1.0;
  gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
  vUV = aUV;
}`;

// Generic sprite shader: opacity, blend color, tone, bush depth.
const FS_SPRITE = `#version 300 es
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
}`;

// Flat color fill (used for tile shadows / flashes)
const FS_FLAT = `#version 300 es
precision mediump float;
uniform vec4 uFill;
in vec2 vUV;
out vec4 outColor;
void main() { outColor = uFill; }`;

// Transition: mix frozen and current scene, optionally via a gray-scale mask.
const FS_TRANS = `#version 300 es
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
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error("Shader compile error: " + gl.getShaderInfoLog(s));
  }
  return s;
}

function program(gl, fs, uniforms) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "aPos");
  gl.bindAttribLocation(p, 1, "aUV");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error("Program link error: " + gl.getProgramInfoLog(p));
  }
  const u = {};
  for (const name of ["uRes", ...uniforms]) u[name] = gl.getUniformLocation(p, name);
  return { p, u };
}

export class Renderer {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      alpha: false, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 が利用できません");
    this.gl = gl;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

    this.sprite = program(gl, FS_SPRITE, ["uTex", "uOpacity", "uColor", "uTone", "uBushV", "uBushOpacity"]);
    this.flat = program(gl, FS_FLAT, ["uFill"]);
    this.trans = program(gl, FS_TRANS, ["uCur", "uFrozen", "uMask", "uProg", "uVague", "uUseMask"]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    this.verts = new Float32Array(4 * 6 * 4096);
    this.nverts = 0;

    this.brightness = 255;
    this.frozen = false;
    this.transition = null; // {prog, maskTex, vague}
    this.resize(width, height);
  }

  makeTarget(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo, w, h };
  }

  freeTarget(t) {
    if (!t) return;
    this.gl.deleteTexture(t.tex);
    this.gl.deleteFramebuffer(t.fbo);
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    for (const k of ["screen", "temp", "frozenT"]) this.freeTarget(this[k]);
    this.screen = this.makeTarget(w, h);
    this.temp = this.makeTarget(w, h);
    this.frozenT = this.makeTarget(w, h);
  }

  // ---- texture management -------------------------------------------------
  texFor(bmp) {
    const gl = this.gl;
    if (!bmp.tex) {
      bmp.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, bmp.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      bmp.texVersion = -1;
      bmp.texRepeat = false;
    }
    if (bmp.texVersion !== bmp.version) {
      gl.bindTexture(gl.TEXTURE_2D, bmp.tex);
      const src = bmp.source();
      if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      bmp.texVersion = bmp.version;
    }
    return bmp.tex;
  }

  setRepeat(bmp, on) {
    if (bmp.texRepeat === on) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, bmp.tex);
    const m = on ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, m);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, m);
    bmp.texRepeat = on;
  }

  deleteTex(bmp) {
    if (bmp.tex) this.gl.deleteTexture(bmp.tex);
    bmp.tex = null;
  }

  // ---- batching -------------------------------------------------------------
  // Push a quad given 4 corners (TL, TR, BL, BR) and UVs.
  quad(x0, y0, x1, y1, x2, y2, x3, y3, u0, v0, u1, v1) {
    if (this.nverts + 6 > this.verts.length / 4) this.grow();
    const a = this.verts;
    let i = this.nverts * 4;
    // tri 1: TL TR BL ; tri 2: TR BR BL
    a[i++] = x0; a[i++] = y0; a[i++] = u0; a[i++] = v0;
    a[i++] = x1; a[i++] = y1; a[i++] = u1; a[i++] = v0;
    a[i++] = x2; a[i++] = y2; a[i++] = u0; a[i++] = v1;
    a[i++] = x1; a[i++] = y1; a[i++] = u1; a[i++] = v0;
    a[i++] = x3; a[i++] = y3; a[i++] = u1; a[i++] = v1;
    a[i++] = x2; a[i++] = y2; a[i++] = u0; a[i++] = v1;
    this.nverts += 6;
  }

  rect(x, y, w, h, u0, v0, u1, v1) {
    this.quad(x, y, x + w, y, x, y + h, x + w, y + h, u0, v0, u1, v1);
  }

  grow() {
    const n = new Float32Array(this.verts.length * 2);
    n.set(this.verts);
    this.verts = n;
  }

  flushWith(prog) {
    if (this.nverts === 0) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.verts.subarray(0, this.nverts * 4), gl.STREAM_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, this.nverts);
    this.nverts = 0;
  }

  setBlend(type) {
    const gl = this.gl;
    gl.enable(gl.BLEND);
    if (type === 1) {
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    } else if (type === 2) {
      gl.blendEquationSeparate(gl.FUNC_REVERSE_SUBTRACT, gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ZERO, gl.ONE);
    } else {
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  // Begin a draw with the sprite program; caller then pushes quads and calls flush().
  useSprite(tex, opacity, color, tone, bushV = 2.0, bushOpacity = 1.0, blend = 0) {
    const gl = this.gl;
    const s = this.sprite;
    gl.useProgram(s.p);
    gl.uniform2f(s.u.uRes, this.targetW, this.targetH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(s.u.uTex, 0);
    gl.uniform1f(s.u.uOpacity, opacity);
    if (color) gl.uniform4f(s.u.uColor, color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255);
    else gl.uniform4f(s.u.uColor, 0, 0, 0, 0);
    if (tone) gl.uniform4f(s.u.uTone, tone[0] / 255, tone[1] / 255, tone[2] / 255, tone[3] / 255);
    else gl.uniform4f(s.u.uTone, 0, 0, 0, 0);
    gl.uniform1f(s.u.uBushV, bushV);
    gl.uniform1f(s.u.uBushOpacity, bushOpacity);
    this.setBlend(blend);
  }

  flush() { this.flushWith(); }

  fillRect(x, y, w, h, r, g, b, a, blend = 0) {
    const gl = this.gl;
    gl.useProgram(this.flat.p);
    gl.uniform2f(this.flat.u.uRes, this.targetW, this.targetH);
    gl.uniform4f(this.flat.u.uFill, r, g, b, a);
    this.setBlend(blend);
    this.rect(x, y, w, h, 0, 0, 0, 0);
    this.flushWith();
  }

  bindTarget(t) {
    const gl = this.gl;
    if (t) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo);
      gl.viewport(0, 0, t.w, t.h);
      this.targetW = t.w; this.targetH = t.h;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.targetW = this.canvas.width; this.targetH = this.canvas.height;
    }
  }

  // Scissor in top-left coordinates of the current target. null disables.
  scissor(r) {
    const gl = this.gl;
    if (!r) { gl.disable(gl.SCISSOR_TEST); return; }
    gl.enable(gl.SCISSOR_TEST);
    const x = Math.max(0, r[0] | 0), y = Math.max(0, r[1] | 0);
    const x2 = Math.min(this.targetW, (r[0] + r[2]) | 0), y2 = Math.min(this.targetH, (r[1] + r[3]) | 0);
    gl.scissor(x, this.targetH - Math.max(y, y2), Math.max(0, x2 - x), Math.max(0, y2 - y));
  }

  // Apply color/tone to a region of the screen target (viewport effects).
  applyEffect(rect, color, tone) {
    const gl = this.gl;
    const W = this.width, H = this.height;
    // copy current screen into temp
    gl.bindTexture(gl.TEXTURE_2D, this.temp.tex);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, W, H);
    const x = Math.max(0, rect[0]), y = Math.max(0, rect[1]);
    const x2 = Math.min(W, rect[0] + rect[2]), y2 = Math.min(H, rect[1] + rect[3]);
    if (x2 <= x || y2 <= y) return;
    this.useSprite(this.temp.tex, 1, color, tone);
    gl.disable(gl.BLEND);
    this.rect(x, y, x2 - x, y2 - y, x / W, 1 - y / H, x2 / W, 1 - y2 / H);
    this.flushWith();
  }

  // ---- frame composition ------------------------------------------------------
  beginScene() {
    const gl = this.gl;
    this.bindTarget(this.screen);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  // Compose the screen target (with brightness) into the given target (null = canvas).
  composeTo(target) {
    const gl = this.gl;
    this.bindTarget(target);
    gl.disable(gl.SCISSOR_TEST);
    const W = this.targetW, H = this.targetH;
    this.useSprite(this.screen.tex, 1, null, null);
    gl.disable(gl.BLEND);
    this.rect(0, 0, W, H, 0, 1, 1, 0);
    this.flushWith();
    if (this.brightness < 255) {
      this.fillRect(0, 0, W, H, 0, 0, 0, 1 - this.brightness / 255);
    }
  }

  present() {
    const gl = this.gl;
    if (this.frozen && !this.transition) {
      this.bindTarget(null);
      gl.disable(gl.SCISSOR_TEST);
      this.useSprite(this.frozenT.tex, 1, null, null);
      gl.disable(gl.BLEND);
      this.rect(0, 0, this.targetW, this.targetH, 0, 1, 1, 0);
      this.flushWith();
      return;
    }
    if (this.transition) {
      // compose current scene into temp, then mix with frozen onto canvas
      this.composeTo(this.temp);
      this.bindTarget(null);
      const t = this.trans;
      gl.useProgram(t.p);
      gl.uniform2f(t.u.uRes, this.targetW, this.targetH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.temp.tex);
      gl.uniform1i(t.u.uCur, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.frozenT.tex);
      gl.uniform1i(t.u.uFrozen, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.transition.maskTex || this.temp.tex);
      gl.uniform1i(t.u.uMask, 2);
      gl.uniform1f(t.u.uProg, this.transition.prog);
      gl.uniform1f(t.u.uVague, this.transition.vague);
      gl.uniform1i(t.u.uUseMask, this.transition.maskTex ? 1 : 0);
      gl.disable(gl.BLEND);
      this.rect(0, 0, this.targetW, this.targetH, 0, 1, 1, 0);
      this.flushWith();
      gl.activeTexture(gl.TEXTURE0);
      return;
    }
    this.composeTo(null);
  }

  freeze() {
    this.composeTo(this.frozenT);
    this.frozen = true;
  }

  // Read the screen target (with brightness) into RGBA pixels (top-down).
  snapshotPixels() {
    const gl = this.gl;
    this.composeTo(this.temp);
    const W = this.width, H = this.height;
    const px = new Uint8Array(W * H * 4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // flip rows
    const out = new Uint8ClampedArray(W * H * 4);
    const row = W * 4;
    for (let y = 0; y < H; y++) out.set(px.subarray((H - 1 - y) * row, (H - y) * row), y * row);
    return out;
  }
}
