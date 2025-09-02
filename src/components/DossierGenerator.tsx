import React, { useState, useRef, useCallback } from 'react';
import './DossierGenerator.css';

// TypeScript interfaces for better type safety
interface ProcessingState {
  isProcessing: boolean;
  processingText: string;
}

interface ResultsState {
  show: boolean;
  title: string;
  text: string;
  content: string;
}

const DossierGenerator: React.FC = () => {
  // State management for the component
  const [csvData, setCsvData] = useState<string>('');
  const [responseText, setResponseText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    processingText: 'Processing...'
  });
  const [results, setResults] = useState<ResultsState>({
    show: false,
    title: 'Response from n8n',
    text: 'Your workflow has processed the data',
    content: ''
  });
  const [showButtonGroup, setShowButtonGroup] = useState(false);
  
  // Refs for DOM elements
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadBoxRef = useRef<HTMLDivElement>(null);

  // Configuration
  const NETWORKING_WEBHOOK_URL = 'https://prod-cc-darius-n8n.whitepebble-f2dfd303.canadacentral.azurecontainerapps.io/webhook/dossier-generator';

  /**
   * Process uploaded CSV file and store its content
   */
  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCsvData(result);
      setShowButtonGroup(true);
      setError('');
    };
    reader.readAsText(file);
  }, []);

  /**
   * Handle file selection from file input
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!processing.isProcessing) {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    }
  }, [processFile, processing.isProcessing]);

  /**
   * Handle drag over event for file upload area
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadBoxRef.current) {
      uploadBoxRef.current.style.borderColor = '#65A30D';
      uploadBoxRef.current.style.background = '#f0fdf4';
    }
  }, []);

  /**
   * Handle drag leave event for file upload area
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadBoxRef.current) {
      uploadBoxRef.current.style.borderColor = '#84CC16';
      uploadBoxRef.current.style.background = '#f7fee7';
    }
  }, []);

  /**
   * Handle file drop event
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (uploadBoxRef.current) {
      uploadBoxRef.current.style.borderColor = '#84CC16';
      uploadBoxRef.current.style.background = '#f7fee7';
    }
    
    if (!processing.isProcessing) {
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'text/csv') {
        if (fileInputRef.current) {
          fileInputRef.current.files = e.dataTransfer.files;
        }
        processFile(file);
      }
    }
  }, [processFile, processing.isProcessing]);

  /**
   * Handle click on upload area to trigger file selection
   */
  const handleUploadClick = useCallback(() => {
    if (!processing.isProcessing) {
      fileInputRef.current?.click();
    }
  }, [processing.isProcessing]);



  /**
   * Clean markdown formatting specifically for RTF output
   */
  const cleanMarkdownForRTF = (text: string): string => {
    return text
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/`(.*?)`/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/<img[^>]*>/g, '[Profile Photo]') // Replace img tags with text
      .replace(/\n\n+/g, '\n\n')
      .trim();
  };

  /**
   * Format dossier text with HTML styling and handle profile photos
   */
  const formatDossierText = (text: string): string => {
    console.log('Original text:', text.substring(0, 1000)); // Debug first 1000 chars
    
    // First, let's find and log any profile photo lines
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('Profile Photo')) {
        console.log(`Line ${index}: "${line}"`);
      }
    });
    
    const formatted = text
      // Clean up excessive line breaks
      .replace(/\n\n\n+/g, '\n\n')
      .replace(/\n\n\n/g, '\n\n')
      
      // Remove markdown prefixes first
      .replace(/^#+\s*/gm, '')
      
      // Main title - "Networking Briefs"
      .replace(/^Networking Briefs$/gm, '<h1 class="main-title">Networking Briefs</h1>')
      
      // Handle "Create a networking dossier for each attendee:" header
      .replace(/^Create a networking dossier for each attendee:$/gm, '<h1 class="main-title">Networking Briefs</h1>')
      
      // Handle "**Executive Summary**" section header - GREEN
      .replace(/\*\*Executive Summary\*\*/g, '<h2 class="major-title">Executive Summary</h2>')
      
      // Handle attendee name format: "**Attendee Name:John Doe**" - GREEN
      .replace(/\*\*Attendee Name:([^*]+)\*\*/g, '<div class="attendee-name">$1 Networking Dossier</div>')
      
      // Handle "Profile Photo:" with any format - comprehensive approach
      .replace(/\*\*Profile Photo:\*\* (.+)/g, (match, content) => {
        console.log('Profile Photo content:', content);
        
        let extractedUrl = '';
        
        // Try different patterns to extract the URL
        const patterns = [
          // Pattern 1: ![text](URL)
          /!\[([^\]]+)\]\(([^)]+)\)/,
          // Pattern 2: [text](URL)
          /\[([^\]]+)\]\(([^)]+)\)/,
          // Pattern 3: Direct URL
          /(https?:\/\/[^\s]+)/,
          // Pattern 4: URL in parentheses
          /\(([^)]+)\)/
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            // For patterns with capture groups, use the last group (usually the URL)
            extractedUrl = match[match.length - 1];
            console.log('Extracted URL using pattern:', pattern, 'URL:', extractedUrl);
            break;
          }
        }
        
        if (extractedUrl && extractedUrl.startsWith('http')) {
          const cleanUrl = extractedUrl.trim();
          console.log('Final clean URL:', cleanUrl);
          // Display the image directly in the HTML with fallback
          return `<div class="profile-photo-container"><img src="${cleanUrl}" alt="Profile Photo" class="profile-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" /><span class="profile-photo-fallback" style="display:none;">📷 <a href="${cleanUrl}" target="_blank" class="profile-photo-link">View Profile Photo</a></span></div>`;
        } else {
          console.log('No valid URL found, using fallback');
          return `<div class="profile-photo-container"><span class="profile-photo-link">📷 Profile Photo Not Available</span></div>`;
        }
      })
      
      // Major section titles - "COMPANY INTELLIGENCE", "INDIVIDUAL PROFILE", "STRATEGIC NETWORKING INSIGHTS" - GREEN
      .replace(/^\*\*(COMPANY INTELLIGENCE|INDIVIDUAL PROFILE|STRATEGIC NETWORKING INSIGHTS)\*\*$/gm, '<h2 class="major-title">$1</h2>')
      
      // Sub-section titles - "Organization Profile:", "Technology Infrastructure:", etc. - GREEN
      .replace(/^\*\*(Organization Profile|Technology Infrastructure|Recent Company Developments|Professional Background|Recent Personal Updates|KEY HIGHLIGHTS|CONVERSATION STARTERS & CONNECTION STRATEGY)\*\*$/gm, '<h3 class="section-title">$1:</h3>')
      
      // Handle bullet points with bold labels
      .replace(/^- \*\*([^*]+):\*\* (.+)$/gm, '<li><strong>$1:</strong> $2</li>')
      
      // Handle numbered lists in your template
      .replace(/^(\d+)\. \*\*([^*]+):\*\* (.+)$/gm, '<li><strong>$2:</strong> $3</li>')
      
      // Handle "Primary Approach:", "Key Talking Points:", etc. with proper line breaks - GREEN
      .replace(/\*\*(Primary Approach|Key Talking Points|Follow-up Strategy|Value Proposition):\*\*/g, '<div class="section-title">$1:</div>')
      
      // Handle "LinkedIn Engagement:" with proper line break - GREEN
      .replace(/\*\*LinkedIn Engagement:\*\*/g, '<div class="section-title">LinkedIn Engagement:</div>')
      
      // Handle "Tech Stack:" with proper line break - GREEN
      .replace(/\*\*Tech Stack:\*\*/g, '<div class="section-title">Tech Stack:</div>')
      
      // Handle "Industry Focus:", "Company Description:", "Employee Count:" with proper line breaks - GREEN
      .replace(/\*\*(Industry Focus|Company Description|Employee Count):\*\*/g, '<div class="section-title">$1:</div>')
      
      // Handle company names with ** formatting - make them GREEN (changed from blue)
      .replace(/\*\*([^*]+)\*\*/g, (match, content) => {
        if (content.includes('|') || content.includes('&') || content.length > 10) {
          return `<span class="company-name">${content}</span>`;
        }
        return `<strong class="company-name">${content}</strong>`;
      })
      
      // Handle LinkedIn links: "[LinkedIn](URL)"
      .replace(/\[LinkedIn\]\(([^)]+)\)/g, '<a href="$1" target="_blank" class="contact-info">LinkedIn</a>')
      
      // Contact information - make emails green and clickable (changed from blue)
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '<a href="mailto:$1" class="contact-info">$1</a>')
      
      // ICP indicator
      .replace(/(An ICP: True)/g, '<span class="icp-indicator">$1</span>')
      
      // Separator lines
      .replace(/^---$/gm, '<hr class="separator">')
      .replace(/^==================================================$/gm, '<hr class="separator">')
      
      // Convert line breaks to proper HTML
      .replace(/\n/g, '<br>')
      .replace(/<br><br><br>/g, '<br><br>');
    
    console.log('Formatted text:', formatted.substring(0, 1000)); // Debug first 1000 chars
    
    // Check if any img tags were created
    const imgMatches = formatted.match(/<img[^>]*>/g);
    if (imgMatches) {
      console.log('IMG tags found:', imgMatches);
    } else {
      console.log('NO IMG tags found in formatted text');
    }
    
    return formatted;
  };

  /**
   * Generate networking briefs by sending CSV data to n8n webhook
   */
  const generateNetworkingBriefs = useCallback(async () => {
    if (!csvData) return;

    setShowButtonGroup(false);
    setProcessing({
      isProcessing: true,
      processingText: 'Sending to n8n webhook...'
    });

    try {
      const formData = new FormData();
      const csvBlob = new Blob([csvData], { type: 'text/csv' });
      formData.append('file', csvBlob, 'conference_data.csv');

      const response = await fetch(NETWORKING_WEBHOOK_URL, {
        method: 'POST',
        body: formData
      });

      const responseData = await response.text();
      setResponseText(responseData);

      if (response.ok) {
        let formattedResponse = responseData;
        try {
          const jsonResponse = JSON.parse(responseData);
          
          if (Array.isArray(jsonResponse)) {
            formattedResponse = jsonResponse.map((item: any) => {
              if (item.output) {
                return formatDossierText(item.output);
              }
              return formatDossierText(JSON.stringify(item));
            }).join('\n\n' + '='.repeat(50) + '\n\n');
          } else if (jsonResponse.output) {
            formattedResponse = formatDossierText(jsonResponse.output);
          } else {
            formattedResponse = formatDossierText(JSON.stringify(jsonResponse));
          }
        } catch (e) {
          formattedResponse = formatDossierText(responseData);
        }

        setResults({
          show: true,
          title: 'Networking Briefs',
          text: 'Your workflow has generated networking briefs.',
          content: formattedResponse
        });
      } else {
        setError(`Error ${response.status}: ${responseData}`);
        setShowButtonGroup(true);
      }
    } catch (error) {
      console.error('Error calling n8n:', error);
      setError(`Error connecting to webhook: ${error instanceof Error ? error.message : 'Unknown error'} (This may be due to internal network access restrictions)`);
      setShowButtonGroup(true);
    } finally {
      setProcessing({ isProcessing: false, processingText: 'Processing...' });
    }
  }, [csvData]);

  /**
   * Create RTF document with proper formatting
   */
  const createRTFDocument = (content: string): string => {
    let rtf = '{\\rtf1\\ansi\\deff0';
    rtf += '{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;\\red132\\green204\\blue22;}';
    rtf += '{\\fonttbl {\\f0 Calibri;}}';
    rtf += '\\f0\\fs22\\cf1';
    
    let lines = content.split('\n');
    let rtfLines = [];
    
    for (let index = 0; index < lines.length; index++) {
      let line = lines[index];
      let rtfLine = '';
      
      // Escape special characters for RTF
      line = line.replace(/\\/g, '\\\\')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}');
      
      // Apply different formatting based on content type
      if (line.trim() === 'Create a networking dossier for each attendee:') {
        rtfLine = '\\b\\fs32\\cf2 ' + line + '\\cf1\\fs22\\b0\\par\\par';
      } else if (line.match(/^\[Attendee Name:## .+\]$/)) {
        const nameMatch = line.match(/^\[Attendee Name:## (.+)\]$/);
        if (nameMatch) {
          rtfLine = '\\b\\fs28\\cf2 ' + nameMatch[1] + '\\cf1\\fs22\\b0\\par';
          let linkedInUrl = '';
          for (let i = 1; i <= 10; i++) {
            if (lines[index + i] && lines[index + i].includes('[LinkedIn](')) {
              const match = lines[index + i].match(/\[LinkedIn\]\((https?:\/\/[^)]+)\)/);
              if (match) {
                linkedInUrl = match[1];
                break;
              }
            }
          }
          if (linkedInUrl) {
            rtfLine += `\\cf2 [LinkedIn Profile](${linkedInUrl})\\cf1\\par\\par`;
          } else {
            rtfLine += '\\cf2 [LinkedIn Profile]\\cf1\\par\\par';
          }
        }
      } else if (line.match(/^(COMPANY INTELLIGENCE|INDIVIDUAL PROFILE|STRATEGIC NETWORKING INSIGHTS|RELATIONSHIP NOTES)$/)) {
        rtfLine = '\\b\\fs24\\cf2 ' + line + '\\cf1\\fs22\\b0\\par\\par';
      } else if (line.match(/^(Executive Summary|Organization Profile|Technology Infrastructure|Recent Company Developments|Professional Background|Recent Personal Updates|Digital Presence & Engagement|KEY HIGHLIGHTS|CONVERSATION STARTERS & CONNECTION STRATEGY)$/)) {
        rtfLine = '\\b\\fs20\\cf2 ' + line + '\\cf1\\fs22\\b0\\par\\par';
      } else if (line.startsWith('• ') || line.startsWith('- ')) {
        rtfLine = '\\li720\\bullet\\tab ' + line.substring(2) + '\\par';
      } else if (line.match(/^[0-9]+\.\s/)) {
        rtfLine = '\\li720\\tab ' + line + '\\par';
      } else if (line.match(/^(Contact:|Current Role:|Location:|Industry:|Company Size:)/)) {
        rtfLine = '\\b ' + line + '\\b0\\par';
      } else if (line.trim() === '---') {
        rtfLine = '\\brdrb\\brdrs\\brdrw20\\brsp80 \\par\\brdrnone\\par';
      } else if (line.trim() === '') {
        rtfLine = '\\par';
      } else if (line.trim() === '==================================================') {
        rtfLine = '\\brdrb\\brdrs\\brdrw40\\brsp80 \\par\\brdrnone\\par\\par';
      } else {
        rtfLine = line + '\\par';
      }
      
      rtfLines.push(rtfLine);
    }
    
    rtf += rtfLines.join('');
    rtf += '}';
    
    return rtf;
  };

  /**
   * Download dossier as RTF file
   */
  const downloadRTF = () => {
    if (!responseText) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Conference_Networking_Briefs_${timestamp}.rtf`;
    
    let downloadContent = responseText;
    try {
      const jsonResponse = JSON.parse(responseText);
      
      if (Array.isArray(jsonResponse)) {
        downloadContent = jsonResponse.map((item: any) => {
          if (item.output) {
            return cleanMarkdownForRTF(item.output);
          }
          return cleanMarkdownForRTF(JSON.stringify(item));
        }).join('\n\n' + '='.repeat(50) + '\n\n');
      } else if (jsonResponse.output) {
        downloadContent = cleanMarkdownForRTF(jsonResponse.output);
      } else {
        downloadContent = cleanMarkdownForRTF(JSON.stringify(jsonResponse));
      }
    } catch (e) {
      downloadContent = cleanMarkdownForRTF(responseText);
    }
    
    const rtfContent = createRTFDocument(downloadContent);
    const blob = new Blob([rtfContent], { type: 'application/rtf; charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /**
   * Reset the component to initial state
   */
  const startOver = () => {
    setCsvData('');
    setResponseText('');
    setError('');
    setProcessing({
      isProcessing: false,
      processingText: 'Processing...'
    });
    setResults({
      show: false,
      title: 'Response from n8n',
      text: 'Your workflow has processed the data',
      content: ''
    });
    setShowButtonGroup(false);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Download dossier as HTML file with embedded styling
   */
  const downloadHTML = () => {
    if (!responseText) return;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `Conference_Networking_Briefs_${timestamp}.html`;
    const htmlContent = results.content;
    
    // Create complete HTML document with embedded styles
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Networking Briefs - ${timestamp}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            line-height: 1.7;
            color: #374151;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background-color: white;
        }
        
        /* Main title - "Networking Briefs" */
        h1 {
            text-align: center;
            color: #166534; /* Dark green */
            font-weight: 700;
            font-size: 28px;
            margin-bottom: 40px;
            margin-top: 0;
        }
        
        /* Major section titles - "Executive Summary", "COMPANY INTELLIGENCE" */
        h2 {
            color: #166534; /* Dark green */
            font-weight: 700;
            font-size: 20px;
            margin-top: 35px;
            margin-bottom: 20px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* Sub-section titles - "Organization Profile:" */
        h3 {
            color: #166534; /* Dark green */
            font-weight: 700;
            font-size: 16px;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        
        /* Regular section titles - "Networking Dossier: Stuart Thompson" */
        .regular-title {
            color: #166534; /* Dark green */
            font-weight: 700;
            font-size: 16px;
            margin-top: 20px;
            margin-bottom: 15px;
        }
        
        /* Attendee names - make them green */
        .attendee-name {
            color: #166534; /* Dark green */
            font-weight: 700;
            font-size: 16px;
        }
        
        /* Bold text */
        strong, b {
            color: #374151;
            font-weight: 600;
        }
        
        /* Bullet points and lists */
        ul, ol {
            margin: 15px 0;
            padding-left: 25px;
        }
        
        li {
            margin: 8px 0;
            color: #374151;
            line-height: 1.5;
        }
        
        /* Separator lines */
        hr, .separator {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 25px 0;
            height: 1px;
        }
        
        /* Company names and important info */
        .company-name {
            color: #166534; /* Dark green */
            font-weight: 700;
            font-size: 15px;
            text-decoration: underline;
        }
        
        /* Contact information */
        .contact-info {
            color: #166534; /* Dark green */
            font-weight: 700;
            font-size: 14px;
            text-decoration: underline;
        }
        
        /* ICP indicator */
        .icp-indicator {
            color: #059669;
            font-weight: 600;
        }
        
        /* Content wrapper */
        .content {
            background: white;
            padding: 20px;
        }
        
        /* Dossier sections */
        .dossier {
            margin-bottom: 30px;
            padding: 20px 0;
        }
        
        /* Profile photo styling */
        .profile-photo {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            object-fit: cover;
            margin: 10px 0;
            border: 3px solid #22c55e;
        }
        
        /* Highlight boxes */
        .highlight {
            background-color: #f0fdf4;
            padding: 15px;
            border-left: 4px solid #22c55e;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <h1>Networking Briefs</h1>
    <div class="content">
        ${htmlContent}
    </div>
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html; charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      {/* Logo Section */}
      <div className="logo-section">
        <img src="symend-logo.jpg" alt="Symend Logo" />
      </div>
      
      {/* Header Section */}
      <div className="header">
        <h1>Conference Dossier Generator</h1>
        <p>Upload CSV and process with n8n workflow</p>
      </div>

      {/* Main Upload Section */}
      <div className="upload-section">
        {/* File Upload Area */}
        <div 
          className={`upload-box ${processing.isProcessing ? 'upload-disabled' : ''}`}
          ref={uploadBoxRef}
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-icon">📁</div>
          <div className="upload-text">
            {processing.isProcessing ? 'Processing...' : 'Upload Conference Attendee CSV'}
          </div>
          <div className="upload-subtext">
            {processing.isProcessing ? 'Please wait while we process your data' : 'Click to upload or drag & drop your CSV file'}
          </div>
        </div>
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          className="file-input" 
          accept=".csv" 
          onChange={handleFileChange}
        />

        {/* Error Display */}
        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {/* Generate Button */}
        {showButtonGroup && (
          <div className="button-group">
            <button 
              className="process-btn"
              onClick={generateNetworkingBriefs}
            >
              Generate Networking Briefs
            </button>
          </div>
        )}

        {/* Processing Indicator */}
        {processing.isProcessing && (
          <div className="processing">
            <div className="spinner"></div>
            <div className="processing-text">{processing.processingText}</div>
          </div>
        )}

        {/* Results Section */}
        {results.show && (
          <div className="results">
            <div className="success-icon">✓</div>
            <h2>{results.title}</h2>
            <div className="results-text">{results.text}</div>
            <div 
              className="response-content"
              dangerouslySetInnerHTML={{ __html: results.content }}
            />
            {/* Download and Action Buttons */}
            <div className="download-section">
              <button className="download-btn" onClick={downloadRTF}>
                Download RTF
              </button>
              <button className="download-btn" onClick={downloadHTML}>
                Download HTML (with images)
              </button>
              <button className="start-over-btn" onClick={startOver}>
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DossierGenerator;
