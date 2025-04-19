use lopdf::{Document, Object};
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use console_error_panic_hook;

// Initialize panic hook for better error messages in the browser
fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

// Helper function to extract string from PDF object
fn extract_text_from_object(obj: &Object) -> Option<String> {
    match obj {
        Object::String(bytes, _) => {
            String::from_utf8(bytes.clone()).ok()
        },
        _ => None,
    }
}

// Represents a parsed PDF document with metadata and content
#[derive(Serialize, Deserialize)]
pub struct ParsedPdf {
    title: Option<String>,
    author: Option<String>,
    subject: Option<String>,
    keywords: Option<String>,
    creator: Option<String>,
    producer: Option<String>,
    page_count: usize,
    content: Vec<String>,
}

#[wasm_bindgen]
pub fn parse_pdf(data: &[u8]) -> Result<JsValue, JsValue> {
    // Set up the panic hook for better error messages
    init_panic_hook();
    
    // Parse the PDF document
    let doc = match Document::load_mem(data) {
        Ok(doc) => doc,
        Err(e) => return Err(JsValue::from_str(&format!("Failed to load PDF: {}", e))),
    };
    
    // Extract metadata from trailer dictionary
    let title = extract_metadata(&doc, "Title");
    let author = extract_metadata(&doc, "Author");
    let subject = extract_metadata(&doc, "Subject");
    let keywords = extract_metadata(&doc, "Keywords");
    let creator = extract_metadata(&doc, "Creator");
    let producer = extract_metadata(&doc, "Producer");
    
    // Extract text content from all pages
    let mut content = Vec::new();
    let pages = doc.get_pages();
    
    for (_page_num, &id) in &pages {
        // Extract page content - we need to extract just the page object ID number
        let obj_id = id.0; // Get the object ID
        if let Ok(text) = doc.extract_text(&[obj_id]) {
            content.push(text);
        }
    }
    
    // Build the result structure
    let result = ParsedPdf {
        title,
        author,
        subject,
        keywords,
        creator,
        producer,
        page_count: pages.len(),
        content,
    };
    
    // Convert to JS value
    match serde_wasm_bindgen::to_value(&result) {
        Ok(js_value) => Ok(js_value),
        Err(e) => Err(JsValue::from_str(&format!("Serialization error: {}", e))),
    }
}

// Helper function to extract metadata from PDF
fn extract_metadata(doc: &Document, key: &str) -> Option<String> {
    // Get the Info dictionary if it exists
    let info_opt = match doc.trailer.get(b"Info") {
        Ok(info) => Some(info),
        Err(_) => None,
    };
    
    if let Some(info) = info_opt {
        match info {
            Object::Reference(id) => {
                // Follow the reference to get the actual dictionary
                if let Ok(obj) = doc.get_object(*id) {
                    if let Ok(dict) = obj.as_dict() {
                        // Look for the metadata entry in the dictionary
                        if let Ok(value) = dict.get(key.as_bytes()) {
                            return extract_text_from_object(value);
                        }
                    }
                }
            },
            Object::Dictionary(dict) => {
                // Direct dictionary
                if let Ok(value) = dict.get(key.as_bytes()) {
                    return extract_text_from_object(value);
                }
            },
            _ => {}
        }
    }
    None
}

// Function to get basic PDF information without extracting all text content
#[wasm_bindgen]
pub fn get_pdf_info(data: &[u8]) -> Result<JsValue, JsValue> {
    // Set up the panic hook for better error messages
    init_panic_hook();
    
    // Parse the PDF document
    let doc = match Document::load_mem(data) {
        Ok(doc) => doc,
        Err(e) => return Err(JsValue::from_str(&format!("Failed to load PDF: {}", e))),
    };
    
    // Extract metadata from trailer dictionary
    let title = extract_metadata(&doc, "Title");
    let author = extract_metadata(&doc, "Author");
    let subject = extract_metadata(&doc, "Subject");
    let keywords = extract_metadata(&doc, "Keywords");
    let creator = extract_metadata(&doc, "Creator");
    let producer = extract_metadata(&doc, "Producer");
    
    // Build a simplified result structure with just metadata
    let result = serde_json::json!({
        "title": title,
        "author": author,
        "subject": subject,
        "keywords": keywords,
        "creator": creator,
        "producer": producer,
        "pageCount": doc.get_pages().len(),
    });
    
    // Convert to JS value
    match serde_wasm_bindgen::to_value(&result) {
        Ok(js_value) => Ok(js_value),
        Err(e) => Err(JsValue::from_str(&format!("Serialization error: {}", e))),
    }
}

// Extract text from a specific page
#[wasm_bindgen]
pub fn extract_page_text(data: &[u8], page_number: usize) -> Result<String, JsValue> {
    // Set up the panic hook for better error messages
    init_panic_hook();
    
    // Parse the PDF document
    let doc = match Document::load_mem(data) {
        Ok(doc) => doc,
        Err(e) => return Err(JsValue::from_str(&format!("Failed to load PDF: {}", e))),
    };
    
    // Get the pages
    let pages = doc.get_pages();
    
    // Check if the page number is valid
    if page_number == 0 || page_number > pages.len() {
        return Err(JsValue::from_str(&format!(
            "Invalid page number: {}. Valid range is 1-{}",
            page_number, pages.len()
        )));
    }
    
    // Find the page ID for the requested page number
    let mut page_ids = Vec::new();
    for (&num, &id) in &pages {
        page_ids.push((num, id));
    }
    
    // Sort by page number
    page_ids.sort_by_key(|(num, _)| *num);
    
    if page_ids.len() < page_number {
        return Err(JsValue::from_str("Page not found"));
    }
    
    let (_, id) = page_ids[page_number - 1];
    
    // Extract text from the page - we need to extract just the page object ID number
    let obj_id = id.0; // Get the object ID
    match doc.extract_text(&[obj_id]) {
        Ok(text) => Ok(text),
        Err(e) => Err(JsValue::from_str(&format!("Failed to extract text: {}", e))),
    }
}