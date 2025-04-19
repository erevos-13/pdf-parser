// Main thread script to handle UI and communicate with the WebAssembly worker
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const selectFileBtn = document.getElementById('select-file');
  const pdfContent = document.getElementById('pdf-content');
  const pdfInfo = document.getElementById('pdf-info');
  const loading = document.getElementById('loading');

  // Set up the worker
  const worker = new Worker('worker.js');

  // Listen for messages from the worker
  worker.onmessage = function(e) {
    const message = e.data;

    switch (message.type) {
      case 'status':
        updateStatus(message.message);
        break;
      case 'progress':
        updateProgress(message.loaded, message.total);
        break;
      case 'info':
        displayPdfInfo(message);
        break;
      case 'partialContent':
        updateContent(message.text);
        break;
      case 'complete':
        finishProcessing(message.text);
        break;
      case 'error':
        handleError(message.message);
        break;
    }
  };

  // Event listeners for file uploads
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('active');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('active');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      processPdfFile(file);
    } else {
      alert('Please drop a valid PDF file');
    }
  });

  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      processPdfFile(file);
    }
  });

  // Function to process PDF file
  function processPdfFile(file) {
    // Clear previous results
    pdfContent.textContent = '';
    pdfInfo.innerHTML = '';
    
    // Show loading indicator
    loading.classList.add('show');
    
    // Read the file as ArrayBuffer
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      
      // Send the PDF data to the worker
      worker.postMessage({
        action: 'parsePdf',
        data: new Uint8Array(arrayBuffer)
      });
    };
    
    reader.onerror = function() {
      handleError('Error reading the file');
    };
    
    reader.readAsArrayBuffer(file);
  }

  // Helper functions for handling worker messages
  function updateStatus(status) {
    console.log('Status:', status);
  }

  function updateProgress(loaded, total) {
    const percent = Math.round((loaded / total) * 100);
    loading.querySelector('progress').value = percent;
    loading.querySelector('progress').max = 100;
  }

  function displayPdfInfo(data) {
    const { numPages, info } = data;
    
    let infoHTML = `<h2>PDF Information</h2>
      <p><strong>Pages:</strong> ${numPages}</p>`;
    
    if (info) {
      if (info.Title) infoHTML += `<p><strong>Title:</strong> ${info.Title}</p>`;
      if (info.Author) infoHTML += `<p><strong>Author:</strong> ${info.Author}</p>`;
      if (info.CreationDate) {
        const date = new Date(info.CreationDate);
        infoHTML += `<p><strong>Created:</strong> ${date.toLocaleDateString()}</p>`;
      }
    }
    
    pdfInfo.innerHTML = infoHTML;
  }

  function updateContent(text) {
    pdfContent.textContent = text;
  }

  function finishProcessing(text) {
    loading.classList.remove('show');
    pdfContent.textContent = text;
  }

  function handleError(message) {
    loading.classList.remove('show');
    alert(`Error processing PDF: ${message}`);
    console.error('PDF processing error:', message);
  }
});