#!/bin/bash

# Build script for the Rust PDF parser WebAssembly module

echo "Building Rust PDF parser WebAssembly module..."
cd rust-pdf-parser

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "Installing wasm-pack..."
    cargo install wasm-pack
fi

# Build the WebAssembly module specifically for web workers (no-modules target)
echo "Compiling Rust to WebAssembly (release mode) for web workers..."
wasm-pack build --target no-modules --release

echo "Build completed! WebAssembly files are in rust-pdf-parser/pkg/"
echo "Files generated:"
ls -la pkg/

# Copy the instructions for usage
echo ""
echo "To use in your web worker:"
echo "1. Import the script with: importScripts('./rust-pdf-parser/pkg/rust_pdf_parser.js')"
echo "2. Initialize with: wasm_bindgen('./rust-pdf-parser/pkg/rust_pdf_parser_bg.wasm').then(...)"