// WebAssembly PDF parser worker using Rust
// Import the Rust WebAssembly module
importScripts('./rust-pdf-parser/pkg/rust_pdf_parser.js');

// Explicitly log the module for debugging
console.log("Loaded rust_pdf_parser module:", wasm_bindgen);

// Wait for the WebAssembly module to initialize
self.init = wasm_bindgen('./rust-pdf-parser/pkg/rust_pdf_parser_bg.wasm').then(() => {
  console.log("WebAssembly module initialized successfully");
  self.wasmModule = wasm_bindgen;
  self.postMessage({ type: 'status', message: 'WebAssembly PDF parser loaded' });
}).catch(err => {
  console.error("Failed to initialize WebAssembly module:", err);
  self.postMessage({ 
    type: 'error', 
    message: `Failed to initialize WebAssembly module: ${err.message}` 
  });
});

self.onmessage = async function(e) {
  try {
    console.log("Received message from main thread:", e.data);
    const { data, action } = e.data;
    
    // Make sure WebAssembly is initialized
    if (!self.wasmModule) {
      await self.init;
    }
    
    if (action === 'parsePdf') {
      // Notify main thread that we're starting
      self.postMessage({ type: 'status', message: 'Starting PDF parsing with WebAssembly' });
      
       console.log({data})
      // Create a Uint8Array from the ArrayBuffer data
      const pdfData = new Uint8Array(data);
      
      try {
        // Get PDF info
        const info = self.wasmModule.get_pdf_info(pdfData);
        console.log({info})
        
        // Send metadata to main thread
        self.postMessage({ 
          type: 'info', 
          numPages: info.page_count,
          info: {
            Title: info.title || null,
            Author: info.author || null,
            Subject: info.subject || null,
            CreationDate: info.creation_date || null,
            Producer: info.producer || null,
            Creator: info.creator || null
          }
        });
        
        // For smaller PDFs, use parse_pdf to get all text at once
        if (pdfData.length < 10 * 1024 * 1024) {
          const result = self.wasmModule.parse_pdf(pdfData);
          
          // Send the complete text result - using content instead of text
          const fullText = result.content.join('\n');
          self.postMessage({ 
            type: 'complete', 
            text: fullText 
          });
        } else {
          // For larger PDFs, extract text page by page
          let fullText = '';
          
          for (let i = 0; i < info.page_count; i++) {
            self.postMessage({ 
              type: 'status', 
              message: `Processing page ${i + 1}/${info.page_count}` 
            });
            
            self.postMessage({ 
              type: 'progress', 
              loaded: i + 1, 
              total: info.page_count 
            });
            
            // Extract text from this page
            const pageText = self.wasmModule.extract_page_text(pdfData, i) || '';
            fullText += `\n--- Page ${i + 1} ---\n${pageText}\n`;
            
            // Send progressive updates
            if ((i + 1) % 5 === 0 || i === info.page_count - 1) {
              self.postMessage({ 
                type: 'partialContent', 
                text: fullText,
                pageNum: i + 1,
                totalPages: info.page_count
              });
            }
          }
          
          // Send the final result
          self.postMessage({ 
            type: 'complete', 
            text: fullText 
          });
        }
      } catch (err) {
        // Check if the error is related to Identity-H encoding
        if (err.message && err.message.includes("Identity-H")) {
          self.postMessage({ 
            type: 'warning', 
            message: "This PDF contains text with unsupported Unicode encoding (Identity-H). Some text may not be extracted correctly."
          });
          
          self.postMessage({ 
            type: 'error', 
            message: `Error parsing PDF: ${err.message}` 
          });
        } else {
          self.postMessage({ 
            type: 'error', 
            message: `Error parsing PDF: ${err.message}` 
          });
        }
      }
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      message: error.message 
    });
  }
};