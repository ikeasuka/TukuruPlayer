#!/bin/bash
# Builds the headless Linux runner against the system Ruby (development / CI).
set -e
cd "$(dirname "$0")"
HDR=$(ruby -e 'print RbConfig::CONFIG["rubyhdrdir"]')
AHDR=$(ruby -e 'print RbConfig::CONFIG["rubyarchhdrdir"]')
LIB=$(ruby -e 'print RbConfig::CONFIG["LIBRUBYARG_SHARED"]')
${CC:-gcc} -O2 -g -Wall -Wno-unused-function -Wno-unused-result -o runner runner.c ../core/bitmap.c ../core/render.c ../core/input.c ../core/tkr_ruby.c ../core/fs.c \
  -I"$HDR" -I"$AHDR" $LIB -lm
echo built "$(pwd)/runner"
