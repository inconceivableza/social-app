#!/usr/bin/env bash

set -e

echo "===== EAS Build Pre-Install: Unpacking and building @atproto packages ====="

# Directory containing the packed tarballs
TARBALL_DIR="eas-vendor-packages"
ABSOLUTE_TARBALL_DIR="$(cd "$TARBALL_DIR" && pwd)"

# Check if directory exists
if [ ! -d "$TARBALL_DIR" ]; then
  echo "No external packages to unpack (directory not found: $TARBALL_DIR)"
  exit 0
fi

# Parent directory where packages will be extracted
# This recreates the monorepo structure: ../atproto/packages/<package-name>
EXTRACT_BASE_DIR="../atproto/"

# Create the base extraction directory
[ -d "$EXTRACT_BASE_DIR" ] && { echo Error: $EXTRACT_BASE_DIR already exists from $(pwd) - aborting extract >&2 ; exit 1 ; }
mkdir -p "$EXTRACT_BASE_DIR"
cd "$EXTRACT_BASE_DIR"

# Find all tarballs and extract them
for TARBALL in "$ABSOLUTE_TARBALL_DIR"/*.tgz; do
  if [ ! -f "$TARBALL" ]; then
    echo "No tarballs found in $TARBALL_DIR"
    continue
  fi
  echo "Processing: $(basename "$TARBALL")"
  tar xzf "$TARBALL"
  echo "  ✓ Extracted $FULL_PACKAGE_NAME"
done

echo ""
echo "----- @atproto packages unpackaged - installing dependencies -----"
echo ""

corepack prepare --activate
pnpm install --frozen-lockfile

echo ""
echo "----- building @atproto packages -----"
echo ""

pnpm build

echo ""
echo "===== @atproto packages unpacked and built successfully ====="
echo ""

# Verify packages are in place
echo "Verifying package locations:"
for PACKAGE_JSON in package.json packages/*/package.json; do
  PACKAGE_NAME=$(jq -r .name "$PACKAGE_JSON")
  PACKAGE_VERSION=$(jq -r .version "$PACKAGE_JSON")
  PACKAGE_DIR="$(dirname "$PACKAGE_JSON")"
  if [ "$PACKAGE_DIR" -eq "."]; then
    echo "  ✓ Extracted: $PACKAGE_NAME@$PACKAGE_VERSION at $PACKAGE_DIR"
  elif [ -d "$PACKAGE_DIR/dist" ]; then
    echo "  ✓ Extracted and built: $PACKAGE_NAME@$PACKAGE_VERSION at $PACKAGE_DIR"
  else
    echo "  x Extracted but build missing: $PACKAGE_NAME@$PACKAGE_VERSION at $PACKAGE_DIR"
  fi
done

