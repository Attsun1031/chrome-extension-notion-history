#!/bin/bash
set -e
VERSION=${1:?}
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ARTIFACTS_DIR="${PROJECT_DIR}/artifacts"
OUTPUT_NAME="chrome-extension-notion-history-${VERSION}"
OUTPUT_DIR="${ARTIFACTS_DIR}/${OUTPUT_NAME}"

npm run build
mkdir -p "${ARTIFACTS_DIR}"
cp -pr dist "${OUTPUT_DIR}"

cd "${ARTIFACTS_DIR}"
zip -r "${OUTPUT_NAME}.zip" "${OUTPUT_NAME}"
cd ..
rm -rf "${OUTPUT_DIR}"
