import { jsPDF } from 'jspdf';

interface FileMetadata {
  originalMimeType: string;
  originalExtension: string;
  originalFilename: string;
}

interface ResumeDownloadOptions {
  resumeContent: string;
  companyName?: string;
  fileMetadata: FileMetadata;
}

export class ResumeFileGenerator {

  static async generateAndDownload(options: ResumeDownloadOptions): Promise<void> {
    const { resumeContent, companyName, fileMetadata } = options;
    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `updated_resume_${companyName?.replace(/[^a-zA-Z0-9]/g, '_') || 'optimized'}_${timestamp}`;

    try {
      switch (fileMetadata.originalMimeType) {
        case 'application/pdf':
          await this.generatePDF(resumeContent, `${baseFilename}.pdf`);
          break;
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          await this.generateDOCX(resumeContent, `${baseFilename}.docx`);
          break;
        
        default:
          this.generateTXT(resumeContent, `${baseFilename}.txt`);
          break;
      }
    } catch (error) {
      console.error('Error generating file:', error);
      this.generateTXT(resumeContent, `${baseFilename}.txt`);
    }
  }

  private static async generatePDF(content: string, filename: string): Promise<void> {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - (margin * 2);
      
      let yPosition = margin;
      const lineHeight = 6;

      const lines = content.split('\n');
      let currentFontSize = 11;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
          yPosition += lineHeight / 2;
          continue;
        }

        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }

        if (this.isHeaderLine(trimmedLine)) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(13);
          currentFontSize = 13;
        } else if (this.isSubHeaderLine(trimmedLine)) {
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          currentFontSize = 12;
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(11);
          currentFontSize = 11;
        }

        const wrappedLines = pdf.splitTextToSize(trimmedLine, maxWidth);
        
        for (const wrappedLine of wrappedLines) {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(wrappedLine, margin, yPosition);
          yPosition += lineHeight;
        }
        
        if (this.isHeaderLine(trimmedLine) || this.isSubHeaderLine(trimmedLine)) {
          yPosition += lineHeight / 2;
        }
      }

      const pdfBlob = pdf.output('blob');
      this.downloadBlob(pdfBlob, filename);
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }

  private static async generateDOCX(content: string, filename: string): Promise<void> {
    try {      
      const docxContent = this.formatForWord(content);
      const blob = new Blob([docxContent], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      this.downloadBlob(blob, filename);
      
    } catch (error) {
      console.error('DOCX generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate plain text file
   */
  private static generateTXT(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    this.downloadBlob(blob, filename);
  }

  /**
   * Download blob as file
   */
  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static isHeaderLine(line: string): boolean {
    const upperLine = line.toUpperCase();
    const headerPatterns = [
      /^[A-Z\s]{2,}$/,
      /^(PROFESSIONAL SUMMARY|WORK EXPERIENCE|EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS)/i,
      /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,
      /^\w+@\w+\.\w+/,
      /^\+?\d{1,3}[-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/
    ];
    
    return headerPatterns.some(pattern => pattern.test(line));
  }

  private static isSubHeaderLine(line: string): boolean {
    const patterns = [
      /^\w+[\w\s]*\s+\|\s+\d{4}/,
      /^\w+[\w\s]*,\s*\d{4}/,
      /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/,
    ];
    
    return patterns.some(pattern => pattern.test(line)) && line.length < 100;
  }

  private static formatForWord(content: string): string {
    let rtfContent = '{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}';
    
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        rtfContent += '\\par ';
        continue;
      }
      
      if (this.isHeaderLine(trimmedLine)) {
        rtfContent += `\\par \\b \\fs24 ${trimmedLine}\\b0 \\fs22 \\par `;
      } else if (this.isSubHeaderLine(trimmedLine)) {
        rtfContent += `\\par \\b \\fs22 ${trimmedLine}\\b0 \\par `;
      } else {
        rtfContent += `${trimmedLine}\\par `;
      }
    }
    
    rtfContent += '}';
    return rtfContent;
  }

  /**
   * Create enhanced preview window with proper formatting
   */
  static createPreviewWindow(content: string, companyName?: string): void {
    const newWindow = window.open('', '_blank');
    if (!newWindow) return;

    const formattedContent = this.formatForPreview(content);
    
    newWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Updated Resume - ${companyName || 'Optimized'}</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Georgia', 'Times New Roman', serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
              background: #f5f5f5;
              color: #333;
            }
            .header-bar {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 20px;
              text-align: center;
              position: sticky;
              top: 0;
              z-index: 100;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .download-btn {
              background: white;
              color: #667eea;
              border: none;
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              margin: 0 8px;
              font-weight: 600;
              transition: all 0.3s ease;
            }
            .download-btn:hover {
              background: #f8f9fa;
              transform: translateY(-2px);
            }
            .resume-container {
              background: white;
              padding: 50px;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              margin: 30px 0;
              min-height: 800px;
            }
            .resume-content {
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.7;
            }
            .section-header {
              font-weight: bold;
              font-size: 16px;
              color: #2c3e50;
              margin-top: 25px;
              margin-bottom: 10px;
              border-bottom: 2px solid #3498db;
              padding-bottom: 5px;
            }
            @media print {
              body { background: white; }
              .header-bar { display: none; }
              .resume-container { box-shadow: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <h2 style="margin: 0 0 15px 0;">✨ Your Updated Resume is Ready!</h2>
            <button class="download-btn" onclick="downloadAsPDF()">📄 Download PDF</button>
            <button class="download-btn" onclick="downloadAsWord()">📝 Download Word</button>
            <button class="download-btn" onclick="downloadAsText()">📃 Download Text</button>
            <button class="download-btn" onclick="window.print()">🖨️ Print</button>
          </div>
          <div class="resume-container">
            <div class="resume-content">${formattedContent}</div>
          </div>
          <script>
            const resumeText = \`${content.replace(/`/g, '\\`').replace(/\\/g, '\\\\')}\`;
            
            function downloadAsPDF() {
              alert('PDF download functionality would be implemented here');
            }
            
            function downloadAsWord() {
              alert('Word download functionality would be implemented here');
            }
            
            function downloadAsText() {
              const element = document.createElement('a');
              const file = new Blob([resumeText], {type: 'text/plain'});
              element.href = URL.createObjectURL(file);
              element.download = 'updated_resume_${companyName?.replace(/[^a-zA-Z0-9]/g, '_') || 'optimized'}.txt';
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }
          </script>
        </body>
      </html>
    `);
    
    newWindow.document.close();
  }

  /**
   * Format content for HTML preview
   */
  private static formatForPreview(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  /**
   * Store file metadata when user uploads resume
   */
  static extractFileMetadata(file: File): FileMetadata {
    return {
      originalMimeType: file.type,
      originalExtension: file.name.split('.').pop()?.toLowerCase() || 'txt',
      originalFilename: file.name
    };
  }
}