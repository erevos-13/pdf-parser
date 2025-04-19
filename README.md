# PDF Parser with WebAssembly and Rust

This project demonstrates how to use WebAssembly compiled from Rust to parse PDF files in the browser, with processing offloaded to Web Workers for better performance.

## Project Overview

The PDF Parser uses Rust compiled to WebAssembly to extract text and metadata from PDF files. The heavy processing is offloaded to Web Workers to prevent blocking the main UI thread, resulting in a responsive user experience even when processing large PDF files.

## Architecture

The project consists of:

- **Rust backend**: Core PDF parsing logic compiled to WebAssembly
- **Web Workers**: JavaScript workers that run the WebAssembly code off the main thread
- **Web frontend**: Simple HTML/CSS/JS interface for file selection and result display

## Rust Libraries Used

- **lopdf**: Main PDF parsing library that handles document loading and content extraction
- **wasm-bindgen**: Facilitates communication between Rust and JavaScript
- **serde/serde_derive**: Handles serialization/deserialization of Rust structs to pass data to JavaScript
- **console_error_panic_hook**: Provides better error messages in the browser console

## Web Worker Implementation

Processing PDFs can be CPU-intensive, which would normally freeze the browser UI. This project offloads the processing to Web Workers:

1. The main thread (`main.js`) handles the UI and sends the PDF data to a worker
2. The worker (`worker.js`) initializes the WebAssembly module and processes the PDF
3. Results are sent back to the main thread for display

This approach keeps the UI responsive even when parsing large documents.

## How to Build

### Prerequisites

- Rust and Cargo installed
- wasm-pack installed (or it will be installed by the build script)

### Building the WebAssembly Module

Run the build script:

```bash
./build-wasm.sh
```

This script:
1. Checks if wasm-pack is installed and installs it if needed
2. Compiles the Rust code to WebAssembly with the `no-modules` target for Web Worker compatibility
3. Outputs the compiled files to `rust-pdf-parser/pkg/`

## Usage

1. Open `index.html` in a web browser
2. Drag and drop a PDF file or click "Select PDF File"
3. The PDF will be processed by the Rust WebAssembly module in a Web Worker
4. Metadata and extracted text will be displayed on the page

## Project Structure

- `index.html`: Main web interface
- `main.js`: Frontend JavaScript that communicates with the Web Worker
- `worker.js`: Web Worker that loads and runs the WebAssembly module
- `rust-pdf-parser/`: Rust project containing the PDF parsing code
  - `src/lib.rs`: Core Rust implementation for PDF parsing
  - `pkg/`: Output directory for compiled WebAssembly files

## Performance Benefits

Using WebAssembly + Web Workers provides:

1. **Native-like speed**: Rust compiled to WebAssembly runs significantly faster than equivalent JavaScript
2. **Non-blocking UI**: Processing happens in a separate thread, keeping the UI responsive
3. **Memory efficiency**: Rust's memory management is more efficient than JavaScript for large document processing

## License

[MIT License]
