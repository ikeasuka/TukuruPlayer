#!/bin/bash
# Cross-compiles CRuby as a static library for iOS (device arm64 + simulator arm64) and packs
# it into Ruby.xcframework. Runs on macOS with Xcode; a host Ruby of the same minor version
# must be on PATH (used as BASERUBY).
#   native/ruby-ios/build.sh <out-dir>
set -euo pipefail
RUBY_VERSION=${RUBY_VERSION:-3.4.1}
MINOS=16.0
OUT=$(cd "${1:-out}" 2>/dev/null && pwd || (mkdir -p "${1:-out}" && cd "${1:-out}" && pwd))
WORK=${WORK:-$PWD/.ruby-ios-build}
mkdir -p "$WORK"
cd "$WORK"
TARBALL=ruby-$RUBY_VERSION.tar.gz
[ -f "$TARBALL" ] || curl -fsSL -o "$TARBALL" "https://cache.ruby-lang.org/pub/ruby/${RUBY_VERSION%.*}/$TARBALL"

# Extensions that need libraries iOS doesn't have, or processes (fork) iOS forbids.
WITHOUT_EXT="openssl,fiddle,psych,pty,readline,gdbm,dbm,syslog,win32,win32ole,nkf,objspace,-test-,io/console/win32"

build_one() {   # $1 = sdk (iphoneos|iphonesimulator)
  local sdk=$1
  local sysroot; sysroot=$(xcrun --sdk "$sdk" --show-sdk-path)
  local target="arm64-apple-ios$MINOS"
  [ "$sdk" = iphonesimulator ] && target="arm64-apple-ios$MINOS-simulator"
  local src="$WORK/src-$sdk" prefix="$WORK/prefix-$sdk"
  rm -rf "$src" "$prefix"; mkdir -p "$src"
  tar xzf "$TARBALL" -C "$src" --strip-components 1
  cd "$src"
  local cc; cc="$(xcrun --sdk "$sdk" -f clang) -target $target -isysroot $sysroot"
  # iOS has no fork/exec/system: tell configure so process.c compiles without them.
  ./configure --host=aarch64-apple-darwin --target=aarch64-apple-darwin --prefix="$prefix" \
    --disable-shared --enable-static --with-static-linked-ext --disable-install-doc \
    --disable-jit-support --disable-yjit --disable-rjit --without-gmp --disable-dln \
    --with-out-ext="$WITHOUT_EXT" --with-baseruby="$(command -v ruby)" \
    CC="$cc" CXX="$(xcrun --sdk "$sdk" -f clang++) -target $target -isysroot $sysroot" \
    CFLAGS="-O2 -fno-common" LDFLAGS="" \
    ac_cv_func_fork=no ac_cv_func_fork_works=no ac_cv_func_vfork=no ac_cv_func_vfork_works=no \
    ac_cv_func_system=no ac_cv_func_execv=no ac_cv_func_execve=no ac_cv_func_execl=no \
    ac_cv_func_posix_spawn=no ac_cv_func_posix_spawnp=no ac_cv_func_daemon=no \
    ac_cv_func_syscall=no ac_cv_func___syscall=no ac_cv_func_getentropy=no \
    ac_cv_func_sendfile=no ac_cv_func_setpgrp=no ac_cv_func_setsid=no \
    > "$WORK/configure-$sdk.log" 2>&1 || { tail -n 60 "$WORK/configure-$sdk.log"; exit 1; }
  make -j"$(sysctl -n hw.ncpu)" libruby-static.a exts encs > "$WORK/make-$sdk.log" 2>&1 \
    || { grep -E "error:" -B2 -A6 "$WORK/make-$sdk.log" | head -n 120; tail -n 40 "$WORK/make-$sdk.log"; exit 1; }
  # One static library: the VM, the statically linked extensions and the encodings.
  local objs=()
  while IFS= read -r f; do objs+=("$f"); done < <(find ext enc -name '*.a' | sort)
  [ -f ext/extinit.o ] && objs+=(ext/extinit.o)
  [ -f enc/encinit.o ] && objs+=(enc/encinit.o)
  xcrun libtool -static -o "$WORK/libruby-$sdk.a" libruby-static.a "${objs[@]}" 2>/dev/null
  mkdir -p "$WORK/headers-$sdk"
  cp -R include/ruby include/ruby.h "$WORK/headers-$sdk/"
  cp .ext/include/*/ruby/config.h "$WORK/headers-$sdk/ruby/config.h"
  echo "built $sdk: $(du -h "$WORK/libruby-$sdk.a" | cut -f1)  (objects: ${#objs[@]})"
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
