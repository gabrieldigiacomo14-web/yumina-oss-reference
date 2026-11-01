#!/bin/bash
# usage: build.sh <ui-src-dir>   (bundles the card's files for the test page)
H=$(cd "$(dirname "$0")" && pwd); rm -rf "$H/src"; cp -r "$1" "$H/src"
cd "$H" && npx esbuild main.jsx --bundle --outfile=out/app.js --inject:./shim.js --loader:.tsx=tsx --loader:.js=jsx --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --log-level=warning
