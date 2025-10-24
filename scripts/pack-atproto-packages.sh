#!/usr/bin/env bash

set -e

script_path="`realpath "$0"`"
script_dir="`dirname "$script_path"`"
social_app_dir="`dirname "$script_dir"`"
cd "$social_app_dir"

echo "===== Packing external packages from @atproto monorepo ====="

# Directory where tarballs will be stored in your project
TARBALL_DIR="eas-vendor-packages"

# Create the directory if it doesn't exist
mkdir -p "$TARBALL_DIR"
ABSOLUTE_TARBALL_DIR="$(cd "$social_app_dir/$TARBALL_DIR" && pwd)"
echo "Cleaning existing tar files"
rm "$ABSOLUTE_TARBALL_DIR"/*.tgz

# Path to the atproto monorepo
ATPROTO_MONOREPO="$(readlink -f $social_app_dir/../atproto)"

# Specific @atproto packages to pack
ATPROTO_PACKAGES=(
  "api"
  "common-web"
  "lexicon"
  "syntax"
  "xrpc"
)

# Verify monorepo exists
if [ ! -d "$ATPROTO_MONOREPO" ]; then
  echo "Error: @atproto monorepo not found at $ATPROTO_MONOREPO"
  exit 1
fi

cd "$ATPROTO_MONOREPO"

echo "Packing @atproto common files..."
git archive --format=tar.gz --output="$ABSOLUTE_TARBALL_DIR/atproto.tgz" HEAD tsconfig *.js* *.yaml
# Get the full package name from package.json
FULL_PACKAGE_NAME=$(jq -r .name package.json)
echo "  ✓ Packed $FULL_PACKAGE_NAME"

for PACKAGE in "${ATPROTO_PACKAGES[@]}"; do
  PACKAGE_PATH="packages/$PACKAGE"
  
  if [ ! -d "$PACKAGE_PATH" ]; then
    echo "Warning: Package not found: $PACKAGE_PATH"
    continue
  fi
  
  if [ ! -f "$PACKAGE_PATH/package.json" ]; then
    echo "Warning: package.json not found in: $PACKAGE_PATH"
    continue
  fi
  
  # Get the full package name from package.json
  FULL_PACKAGE_NAME=$(cd packages; jq -r .name $PACKAGE/package.json)
  PACKAGE_VERSION=$(cd packages; jq -r .version $PACKAGE/package.json)
  
  echo "Packing $FULL_PACKAGE_NAME@$PACKAGE_VERSION..."
  # Pack the package
  git archive --format=tar.gz --output="$ABSOLUTE_TARBALL_DIR/atproto-$PACKAGE.tgz" HEAD "$PACKAGE_PATH"
  echo "  ✓ Packed $FULL_PACKAGE_NAME"
done

cd "$social_app_dir"
echo ""
echo "===== Packing complete ====="
echo "Tarballs stored in: $TARBALL_DIR/"
echo ""
ls -lh "$TARBALL_DIR/"
echo ""
echo "Packed packages:"
for TARBALL in "$TARBALL_DIR"/*.tgz; do
  if [ -f "$TARBALL" ]; then
    echo "  - $(basename "$TARBALL")"
  fi
done

