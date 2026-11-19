#!/bin/bash
# Cross-compiles CRuby as a static library for iOS (device arm64 + simulator arm64) and packs
# it into Ruby.xcframework. Runs on macOS with Xcode; a host Ruby of the same minor version
# must be on PATH (used as BASERUBY).
#   native/ruby-ios/build.sh <out-dir>
set -euo pipefail
set -x
RUBY_VERSION=${RUBY_VERSION:-3.4.1}
MINOS=16.0
OUT=$(cd "${1:-out}" 2>/dev/null && pwd || (mkdir -p "${1:-out}" && cd "${1:-out}" && pwd))
WORK=${WORK:-$PWD/ruby-ios-build}
mkdir -p "$WORK"
cd "$WORK"
TARBALL=ruby-$RUBY_VERSION.tar.gz
[ -f "$TARBALL" ] || curl -fsSL -o "$TARBALL" "https://cache.ruby-lang.org/pub/ruby/${RUBY_VERSION%.*}/$TARBALL"

# Extensions that need libraries iOS doesn't have, or processes (fork) iOS forbids.
WITHOUT_EXT="openssl,fiddle,psych,pty,readline,gdbm,dbm,syslog,win32,win32ole,nkf,objspace,-test-,io/console/win32"

# Headers macOS has but the iOS SDK lacks (included unconditionally under __APPLE__).
STUBS="$WORK/ios-stubs"
mkdir -p "$STUBS/sys"
cat > "$STUBS/sys/vnode.h" <<'H'
#ifndef TKR_STUB_SYS_VNODE_H
#define TKR_STUB_SYS_VNODE_H
enum vtype { VNON, VREG, VDIR, VBLK, VCHR, VLNK, VSOCK, VFIFO, VBAD, VSTR, VCPLX };
#endif
H

build_one() {   # $1 = sdk (iphoneos|iphonesimulator)
  local sdk=$1
  local sysroot; sysroot=$(xcrun --sdk "$sdk" --show-sdk-path)
  local target="arm64-apple-ios$MINOS"
  [ "$sdk" = iphonesimulator ] && target="arm64-apple-ios$MINOS-simulator"
  local src="$WORK/src-$sdk" prefix="$WORK/prefix-$sdk"
  rm -rf "$src" "$prefix"; mkdir -p "$src"
  tar xzf "$TARBALL" -C "$src" --strip-components 1
  cd "$src"
  # Bundled gems with C extensions (bigdecimal, debug, racc, rbs) can't be linked as bundles
  # for iOS and aren't needed by RGSS games: drop them.
  rm -rf .bundle/gems gems/*.gem
  # iOS has no fork/system(): patch the few places that use them unconditionally.
  # file.c defines its CFString helpers only when fork works, but uses them regardless.
  perl -0pi -e 's/# ifdef HAVE_WORKING_FORK\nstatic CFMutableStringRef/static CFMutableStringRef/; s/(#   define mutable_CFString_release\(m, s\) \(CFRelease\(m\), CFRelease\(s\)\)\n)/$1\n# ifdef HAVE_WORKING_FORK\n/' file.c
  perl -0pi -e 's/status = system\(rb_execarg_commandline\(eargp, &prog\)\);/status = -1; (void)prog;/' process.c
  perl -0pi -e 's/int r = system\(buf\);/int r = -1;/' vm_dump.c
  local cc; cc="$(xcrun --sdk "$sdk" -f clang) -target $target -isysroot $sysroot"
  # iOS has no fork/exec/system: tell configure so process.c compiles without them.
  ./configure --host=aarch64-apple-darwin --target=aarch64-apple-darwin --prefix="$prefix" \
    --disable-shared --enable-static --with-static-linked-ext --disable-install-doc \
    --disable-jit-support --disable-yjit --disable-rjit --without-gmp --disable-dln \
    --with-out-ext="$WITHOUT_EXT" --with-baseruby="$(command -v ruby)" \
    CC="$cc" CXX="$(xcrun --sdk "$sdk" -f clang++) -target $target -isysroot $sysroot" \
    CFLAGS="-O2 -fno-common" CPPFLAGS="-I$STUBS" LDFLAGS="" \
    ac_cv_func_fork=no ac_cv_func_fork_works=no ac_cv_func_vfork=no ac_cv_func_vfork_works=no \
    ac_cv_func_system=no ac_cv_func_execv=no ac_cv_func_execve=no ac_cv_func_execl=no \
    ac_cv_func_posix_spawn=no ac_cv_func_posix_spawnp=no ac_cv_func_daemon=no \
    ac_cv_func_syscall=no ac_cv_func___syscall=no ac_cv_func_getentropy=no \
    ac_cv_func_sendfile=no ac_cv_func_setpgrp=no ac_cv_func_setsid=no \
    ac_cv_func_getattrlist=no ac_cv_func_fgetattrlist=no \
    > "$WORK/configure-$sdk.log" 2>&1 || { set +x; tail -n 60 "$WORK/configure-$sdk.log"; exit 1; }
  set +x
  make -k -j"$(sysctl -n hw.ncpu)" main > "$WORK/make-$sdk.log" 2>&1 || \
    { ls libruby*-static.a >/dev/null 2>&1 && [ -f ext/extinit.o ] && echo "make reported errors; library and extensions are built, continuing"; } \
    || { set +e; tail -n 80 "$WORK/make-$sdk.log"; echo "----- errors -----"; grep -E "error|Error" -B2 -A6 "$WORK/make-$sdk.log" | head -n 150; exit 1; }
  # One static library: the VM, the statically linked extensions and the encodings.
  local objs=()
  while IFS= read -r f; do objs+=("$f"); done < <(find ext enc -name '*.a' | sort)
  [ -f ext/extinit.o ] && objs+=(ext/extinit.o)
  [ -f enc/encinit.o ] && objs+=(enc/encinit.o)
  local lib; lib=$(ls libruby*-static.a | head -n 1)
  # libruby-static.a carries no-op Init_enc / Init_ext stubs (dmyenc.o / dmyext.o) for miniruby;
  # with them in the same archive the linker may pick the stubs instead of encinit.o /
  # extinit.o, leaving encodings (Encoding::UTF_8) and extensions (zlib) unregistered.
  cp "$lib" "$WORK/libruby-core-$sdk.a"
  ar -t "$WORK/libruby-core-$sdk.a" | grep -E "^dmy(enc|ext)\.o$" || true
  xcrun ar -d "$WORK/libruby-core-$sdk.a" dmyenc.o dmyext.o 2>/dev/null || true
  lib="$WORK/libruby-core-$sdk.a"
  xcrun libtool -static -o "$WORK/libruby-$sdk.a" "$lib" "${objs[@]}" 2>/dev/null
  mkdir -p "$WORK/headers-$sdk"
  cp -R include/ruby include/ruby.h "$WORK/headers-$sdk/"
  cp .ext/include/*/ruby/config.h "$WORK/headers-$sdk/ruby/config.h"
  echo "built $sdk: $(du -h "$WORK/libruby-$sdk.a" | cut -f1)  (objects: ${#objs[@]})"
  printf '  %s\n' "${objs[@]}"
  grep -h "init(" ext/extinit.c 2>/dev/null | head -n 60 || true
  grep -E "^Failed to configure|failed to configure" -A3 "$WORK/make-$sdk.log" | head -n 40 || true
  cd "$WORK"
}

build_one iphoneos
build_one iphonesimulator
rm -rf "$OUT/Ruby.xcframework"
xcodebuild -create-xcframework \
  -library "$WORK/libruby-iphoneos.a" -headers "$WORK/headers-iphoneos" \
  -library "$WORK/libruby-iphonesimulator.a" -headers "$WORK/headers-iphonesimulator" \
  -output "$OUT/Ruby.xcframework"
echo "$RUBY_VERSION" > "$OUT/Ruby.xcframework/RUBY_VERSION"
ls -la "$OUT/Ruby.xcframework"
