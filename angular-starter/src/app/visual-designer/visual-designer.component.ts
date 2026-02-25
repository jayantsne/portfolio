import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

interface ElementStyles {
  width?: string;
  height?: string;
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  border?: string;
  borderRadius?: string;
  display?: string;
  position?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-visual-designer',
  templateUrl: './visual-designer.component.html',
  styleUrls: ['./visual-designer.component.css']
})
export class VisualDesignerComponent implements OnInit, AfterViewInit {
  @ViewChild('previewFrame', { static: false }) previewFrame!: ElementRef<HTMLIFrameElement>;
  
  // HTML/CSS Code
  htmlCode: string = `<div class="container">
  <h1 class="title">Welcome to Visual Designer</h1>
  <p class="description">Click any element to select and edit it</p>
  <button class="btn-primary">Click Me</button>
  <div class="card">
    <h3>Card Title</h3>
    <p>This is a sample card component.</p>
  </div>
</div>`;

  cssCode: string = `.container {
  padding: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

.title {
  color: #667eea;
  font-size: 36px;
  margin-bottom: 20px;
}

.description {
  color: #666;
  font-size: 18px;
  margin-bottom: 30px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-bottom: 30px;
}

.card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  max-width: 400px;
}

.card h3 {
  margin-top: 0;
  color: #333;
}

.card p {
  color: #666;
  line-height: 1.6;
}`;

  // Selected element tracking
  selectedElement: HTMLElement | null = null;
  selectedElementPath: string = '';
  selectedElementStyles: ElementStyles = {};
  
  // Visual editing
  isResizing = false;
  resizeDirection = '';
  resizeStartX = 0;
  resizeStartY = 0;
  resizeStartWidth = 0;
  resizeStartHeight = 0;
  
  // Margin/Padding editing
  isEditingSpacing = false;
  spacingType: 'margin' | 'padding' = 'margin';
  spacingDirection: 'top' | 'right' | 'bottom' | 'left' = 'top';
  
  // Panels
  showCodePanel = true;
  showPropertiesPanel = true;
  showAIPanel = false;
  activeCodeTab: 'html' | 'css' = 'html';
  
  // AI Features
  aiPrompt: string = '';
  aiLoading = false;
  aiResponse: string = '';
  aiMode: 'generate' | 'improve' | 'fix' | 'suggest' = 'generate';
  
  // Preview mode
  livePreview = true;
  
  // Size unit tracking for responsive controls
  widthUnit = 'px';
  heightUnit = 'px';
  
  // Component Loader
  showLoaderPanel = false;
  htmlFileName = '';
  cssFileName = '';
  htmlFileContent = '';
  cssFileContent = '';
  pastedHTML = '';
  pastedCSS = '';
  
  constructor(private sanitizer: DomSanitizer, private http: HttpClient) { }

  ngOnInit(): void {
    this.loadSavedDesign();
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updatePreview();
    }, 100);
  }
  
  // Update live preview
  updatePreview(): void {
    if (!this.previewFrame) return;
    
    const iframe = this.previewFrame.nativeElement;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) return;
    
    const fullHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
    }
    
    /* User CSS */
    ${this.cssCode}
    
    /* Selection highlight */
    .vd-selected {
      outline: 2px solid #667eea !important;
      outline-offset: 2px;
      position: relative !important;
    }
    
    .vd-hover {
      outline: 2px dashed #f093fb !important;
      outline-offset: 2px;
      cursor: pointer !important;
    }
  </style>
</head>
<body>
  ${this.htmlCode}
</body>
</html>`;
    
    iframeDoc.open();
    iframeDoc.write(fullHTML);
    iframeDoc.close();
    
    // Add event listeners to iframe content
    setTimeout(() => {
      this.attachIframeListeners();
    }, 100);
  }
  
  // Attach click listeners to iframe elements
  attachIframeListeners(): void {
    if (!this.previewFrame) return;
    
    const iframe = this.previewFrame.nativeElement;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) return;
    
    const body = iframeDoc.body;
    
    // Add click listeners to all elements
    const allElements = body.querySelectorAll('*');
    allElements.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      
      // Click to select
      htmlElement.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        e.preventDefault();
        this.selectElementInPreview(htmlElement);
      });
      
      // Hover effect
      htmlElement.addEventListener('mouseenter', () => {
        if (htmlElement !== this.selectedElement) {
          htmlElement.classList.add('vd-hover');
        }
      });
      
      htmlElement.addEventListener('mouseleave', () => {
        htmlElement.classList.remove('vd-hover');
      });
    });
  }
  
  // Select element in preview
  selectElementInPreview(element: HTMLElement): void {
    // Remove previous selection
    if (this.selectedElement) {
      this.selectedElement.classList.remove('vd-selected');
    }
    
    // Select new element
    this.selectedElement = element;
    element.classList.add('vd-selected');
    element.classList.remove('vd-hover');
    
    // Get element path
    this.selectedElementPath = this.getElementPath(element);
    
    // Extract current styles
    const computed = window.getComputedStyle(element);
    this.selectedElementStyles = {
      width: element.style.width || computed.width,
      height: element.style.height || computed.height,
      marginTop: element.style.marginTop || computed.marginTop,
      marginRight: element.style.marginRight || computed.marginRight,
      marginBottom: element.style.marginBottom || computed.marginBottom,
      marginLeft: element.style.marginLeft || computed.marginLeft,
      paddingTop: element.style.paddingTop || computed.paddingTop,
      paddingRight: element.style.paddingRight || computed.paddingRight,
      paddingBottom: element.style.paddingBottom || computed.paddingBottom,
      paddingLeft: element.style.paddingLeft || computed.paddingLeft,
      backgroundColor: element.style.backgroundColor || computed.backgroundColor,
      color: element.style.color || computed.color,
      fontSize: element.style.fontSize || computed.fontSize,
      fontWeight: element.style.fontWeight || computed.fontWeight,
      border: element.style.border || computed.border,
      borderRadius: element.style.borderRadius || computed.borderRadius,
      display: element.style.display || computed.display,
    };
  }
  
  // Get element selector path
  getElementPath(element: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.tagName !== 'BODY') {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
        const classes = current.className.split(' ').filter(c => c && !c.startsWith('vd-'));
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`;
        }
      }
      
      parts.unshift(selector);
      current = current.parentElement;
    }
    
    return parts.join(' > ');
  }
  
  // Update element style
  updateElementStyle(property: string, value: any): void {
    if (!this.selectedElement) return;
    
    this.selectedElement.style[property as any] = value;
    this.selectedElementStyles[property] = value;
    
    // Update CSS code if needed
    this.syncStylesToCSS();
  }
  
  // Sync inline styles back to CSS
  syncStylesToCSS(): void {
    if (!this.selectedElement) return;
    
    const inlineStyles = this.selectedElement.style.cssText;
    if (!inlineStyles) return;
    
    // This is a simplified version - in production you'd want more sophisticated CSS parsing
    console.log('Inline styles:', inlineStyles);
  }
  
  // Adjust margin
  adjustMargin(direction: 'top' | 'right' | 'bottom' | 'left', delta: number): void {
    if (!this.selectedElement) return;
    
    const property = `margin${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
    const current = parseInt(this.selectedElementStyles[property] || '0');
    const newValue = Math.max(0, current + delta) + 'px';
    
    this.updateElementStyle(property, newValue);
  }
  
  // Adjust padding
  adjustPadding(direction: 'top' | 'right' | 'bottom' | 'left', delta: number): void {
    if (!this.selectedElement) return;
    
    const property = `padding${direction.charAt(0).toUpperCase() + direction.slice(1)}`;
    const current = parseInt(this.selectedElementStyles[property] || '0');
    const newValue = Math.max(0, current + delta) + 'px';
    
    this.updateElementStyle(property, newValue);
  }
  
  // Adjust width/height with delta
  adjustSize(property: 'width' | 'height', delta: number): void {
    if (!this.selectedElement) return;
    
    const currentValue = this.selectedElementStyles[property] || 'auto';
    
    // If it's 'auto', start with a default value
    if (currentValue === 'auto' || currentValue === '') {
      const unit = property === 'width' ? this.widthUnit : this.heightUnit;
      if (unit === 'auto') return;
      const defaultValue = property === 'width' ? 100 : 50;
      this.updateElementStyle(property, `${defaultValue}${unit}`);
      return;
    }
    
    // Extract numeric value and unit
    const numValue = parseFloat(currentValue) || 0;
    const unit = currentValue.replace(/[0-9.-]/g, '') || (property === 'width' ? this.widthUnit : this.heightUnit);
    
    // Calculate new value (don't go below 0)
    const newValue = Math.max(0, numValue + delta);
    this.updateElementStyle(property, `${newValue}${unit}`);
    
    // Update unit tracker
    if (property === 'width') this.widthUnit = unit;
    else this.heightUnit = unit;
  }
  
  // Change unit for width/height
  changeUnit(property: 'width' | 'height', unit: string): void {
    if (!this.selectedElement) return;
    
    if (unit === 'auto') {
      this.updateElementStyle(property, 'auto');
      return;
    }
    
    const currentValue = this.selectedElementStyles[property] || 'auto';
    
    if (currentValue === 'auto' || currentValue === '') {
      // Set a default value based on the property
      const defaultValue = property === 'width' ? 100 : 50;
      this.updateElementStyle(property, `${defaultValue}${unit}`);
      return;
    }
    
    // Extract numeric value and convert to new unit
    const numValue = parseFloat(currentValue) || 0;
    this.updateElementStyle(property, `${numValue}${unit}`);
  }
  
  // Code editing
  onHTMLChange(): void {
    if (this.livePreview) {
      this.updatePreview();
    }
  }
  
  onCSSChange(): void {
    if (this.livePreview) {
      this.updatePreview();
    }
  }
  
  // Manual refresh
  refreshPreview(): void {
    this.updatePreview();
  }
  
  // Copy code
  copyCode(type: 'html' | 'css'): void {
    const code = type === 'html' ? this.htmlCode : this.cssCode;
    navigator.clipboard.writeText(code).then(() => {
      alert(`${type.toUpperCase()} copied to clipboard!`);
    });
  }
  
  // Save/Load
  saveDesign(): void {
    const design = {
      html: this.htmlCode,
      css: this.cssCode
    };
    localStorage.setItem('visualDesign', JSON.stringify(design));
  }
  
  loadSavedDesign(): void {
    const saved = localStorage.getItem('visualDesign');
    if (saved) {
      const design = JSON.parse(saved);
      this.htmlCode = design.html || this.htmlCode;
      this.cssCode = design.css || this.cssCode;
    }
  }
  
  // Export
  exportDesign(): void {
    const design = {
      html: this.htmlCode,
      css: this.cssCode
    };
    
    const blob = new Blob([JSON.stringify(design, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'design.json';
    link.click();
    URL.revokeObjectURL(url);
  }
  
  // Export as HTML file
  exportHTML(): void {
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Design</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
    }
    
    ${this.cssCode}
  </style>
</head>
<body>
  ${this.htmlCode}
</body>
</html>`;
    
    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'design.html';
    link.click();
    URL.revokeObjectURL(url);
  }
  
  // Clear selection
  clearSelection(): void {
    if (this.selectedElement) {
      this.selectedElement.classList.remove('vd-selected');
      this.selectedElement = null;
      this.selectedElementPath = '';
      this.selectedElementStyles = {};
    }
  }
  
  // Parse value to number
  parseValue(value: string): number {
    return parseInt(value) || 0;
  }
  
  // AI Features
  toggleAIPanel(): void {
    this.showAIPanel = !this.showAIPanel;
    if (this.showAIPanel) {
      this.aiPrompt = '';
      this.aiResponse = '';
    }
  }

  // Load component HTML for editing
  loadComponentHTML(): void {
    this.showLoaderPanel = true;
  }

  // Toggle loader panel
  toggleLoaderPanel(): void {
    this.showLoaderPanel = !this.showLoaderPanel;
  }

  // Handle HTML file selection
  onHTMLFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.htmlFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.htmlFileContent = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  // Handle CSS file selection
  onCSSFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.cssFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.cssFileContent = e.target.result;
      };
      reader.readAsText(file);
    }
  }

  // Load selected files into editor
  loadSelectedFiles(): void {
    if (this.htmlFileContent) {
      this.htmlCode = this.htmlFileContent;
    }
    if (this.cssFileContent) {
      this.cssCode = this.cssFileContent;
    }
    this.updatePreview();
    this.showLoaderPanel = false;
    this.aiResponse = `✅ Loaded successfully!\n- HTML: ${this.htmlFileName || 'Not loaded'}\n- CSS: ${this.cssFileName || 'Not loaded'}\n\nClick elements in preview to edit properties.`;
    
    // Reset
    this.htmlFileName = '';
    this.cssFileName = '';
    this.htmlFileContent = '';
    this.cssFileContent = '';
  }

  // Load pasted code
  loadPastedCode(): void {
    if (this.pastedHTML) {
      this.htmlCode = this.pastedHTML;
    }
    if (this.pastedCSS) {
      this.cssCode = this.pastedCSS;
    }
    this.updatePreview();
    this.showLoaderPanel = false;
    this.aiResponse = '✅ Code loaded successfully! Click elements in preview to edit.';
    
    // Reset
    this.pastedHTML = '';
    this.pastedCSS = '';
  }

  // Load quick start template
  loadTemplate(type: string): void {
    switch(type) {
      case 'button':
        this.htmlCode = `<div class="container">
  <h2>Button Examples</h2>
  <button class="btn btn-primary">Primary Button</button>
  <button class="btn btn-secondary">Secondary Button</button>
  <button class="btn btn-success">Success Button</button>
</div>`;
        this.cssCode = `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 20px;
  background: #f5f5f5;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin: 10px;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-success {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}`;
        break;

      case 'card':
        this.htmlCode = `<div class="container">
  <div class="card">
    <div class="card-header">Card Title</div>
    <div class="card-body">
      <p>This is a card component with some content.</p>
      <button class="card-btn">Learn More</button>
    </div>
  </div>
</div>`;
        this.cssCode = `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.container {
  max-width: 400px;
  margin: 0 auto;
}

.card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  font-size: 24px;
  font-weight: 700;
}

.card-body {
  padding: 24px;
}

.card-btn {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 16px;
}`;
        break;

      case 'form':
        this.htmlCode = `<div class="container">
  <form class="login-form">
    <h2>Login</h2>
    <div class="form-group">
      <label>Email</label>
      <input type="email" placeholder="Enter your email" />
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" placeholder="Enter password" />
    </div>
    <button type="submit" class="submit-btn">Sign In</button>
  </form>
</div>`;
        this.cssCode = `body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.container {
  width: 100%;
  max-width: 400px;
}

.login-form {
  background: white;
  padding: 40px;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.login-form h2 {
  margin-top: 0;
  color: #667eea;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
}`;
        break;

      case 'landing':
        this.htmlCode = `<div class="hero">
  <div class="hero-content">
    <h1>Welcome to Our Platform</h1>
    <p>Design beautiful websites with our visual designer</p>
    <button class="cta-btn">Get Started</button>
  </div>
</div>
<div class="features">
  <div class="feature">
    <div class="feature-icon">🎨</div>
    <h3>Visual Editing</h3>
    <p>Edit elements visually</p>
  </div>
  <div class="feature">
    <div class="feature-icon">⚡</div>
    <h3>Fast & Easy</h3>
    <p>Quick adjustments</p>
  </div>
  <div class="feature">
    <div class="feature-icon">🚀</div>
    <h3>Export Ready</h3>
    <p>Download your code</p>
  </div>
</div>`;
        this.cssCode = `body {
  margin: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 100px 20px;
  text-align: center;
}

.hero-content h1 {
  font-size: 48px;
  margin: 0 0 20px 0;
}

.hero-content p {
  font-size: 24px;
  margin: 0 0 30px 0;
}

.cta-btn {
  padding: 16px 40px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  padding: 80px 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature {
  text-align: center;
  padding: 30px;
}

.feature-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.feature h3 {
  color: #667eea;
  margin: 10px 0;
}

.feature p {
  color: #666;
}`;
        break;
    }
    
    this.updatePreview();
    this.showLoaderPanel = false;
    this.aiResponse = `✨ ${type.charAt(0).toUpperCase() + type.slice(1)} template loaded! Click elements to edit.`;
  }
  
  async generateWithAI(): Promise<void> {
    if (!this.aiPrompt.trim()) {
      alert('Please enter a prompt!');
      return;
    }
    
    this.aiLoading = true;
    this.aiResponse = '';
    
    try {
      // Simulate AI generation based on prompt
      const result = await this.simulateAIGeneration(this.aiPrompt, this.aiMode);
      
      if (this.aiMode === 'generate') {
        // Replace HTML/CSS with generated code
        if (result.html) this.htmlCode = result.html;
        if (result.css) this.cssCode = result.css;
        this.updatePreview();
        this.aiResponse = '✅ Code generated successfully!';
      } else if (this.aiMode === 'improve') {
        // Improve existing code
        if (result.html) this.htmlCode = result.html;
        if (result.css) this.cssCode = result.css;
        this.updatePreview();
        this.aiResponse = '✨ Code improved!';
      } else if (this.aiMode === 'fix') {
        // Fix issues in code
        if (result.html) this.htmlCode = result.html;
        if (result.css) this.cssCode = result.css;
        this.updatePreview();
        this.aiResponse = '🔧 Issues fixed!';
      } else if (this.aiMode === 'suggest') {
        // Show suggestions without modifying
        this.aiResponse = result.suggestions || '💡 No suggestions at this time.';
      }
    } catch (error) {
      this.aiResponse = '❌ Error: ' + (error as any).message;
    } finally {
      this.aiLoading = false;
      this.saveDesign();
    }
  }
  
  private async simulateAIGeneration(prompt: string, mode: string): Promise<any> {
    // Simulate AI delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const promptLower = prompt.toLowerCase();
    
    if (mode === 'generate') {
      // Generate based on common patterns
      if (promptLower.includes('button') || promptLower.includes('cta')) {
        return this.generateButton(prompt);
      } else if (promptLower.includes('card')) {
        return this.generateCard(prompt);
      } else if (promptLower.includes('form') || promptLower.includes('login')) {
        return this.generateForm(prompt);
      } else if (promptLower.includes('hero') || promptLower.includes('header')) {
        return this.generateHero(prompt);
      } else if (promptLower.includes('navbar') || promptLower.includes('navigation')) {
        return this.generateNavbar(prompt);
      } else {
        return this.generateGeneric(prompt);
      }
    } else if (mode === 'improve') {
      return this.improveCode();
    } else if (mode === 'fix') {
      return this.fixCode();
    } else if (mode === 'suggest') {
      return { suggestions: this.getSuggestions() };
    }
    
    return {};
  }
  
  private generateButton(prompt: string): any {
    const isPrimary = prompt.toLowerCase().includes('primary');
    const isLarge = prompt.toLowerCase().includes('large') || prompt.toLowerCase().includes('big');
    
    return {
      html: `<button class="btn ${isPrimary ? 'btn-primary' : 'btn-secondary'}">
  Click Me
</button>`,
      css: `.btn {
  padding: ${isLarge ? '16px 40px' : '12px 24px'};
  border: none;
  border-radius: 8px;
  font-size: ${isLarge ? '18px' : '16px'};
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary:hover {
  background: #667eea;
  color: white;
}`
    };
  }
  
  private generateCard(prompt: string): any {
    const hasImage = prompt.toLowerCase().includes('image');
    
    return {
      html: `<div class="card">
  ${hasImage ? '<img src="https://via.placeholder.com/400x200" alt="Card image" class="card-image">' : ''}
  <div class="card-content">
    <h3 class="card-title">Card Title</h3>
    <p class="card-text">This is a beautiful card component with elegant styling.</p>
    <button class="card-btn">Learn More</button>
  </div>
</div>`,
      css: `.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  max-width: 400px;
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

${hasImage ? `.card-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

` : ''}.card-content {
  padding: 24px;
}

.card-title {
  margin: 0 0 12px;
  color: #333;
  font-size: 24px;
}

.card-text {
  color: #666;
  line-height: 1.6;
  margin-bottom: 20px;
}

.card-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.card-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}`
    };
  }
  
  private generateForm(prompt: string): any {
    return {
      html: `<div class="form-container">
  <h2 class="form-title">Login</h2>
  <form class="form">
    <div class="form-group">
      <label class="form-label">Email</label>
      <input type="email" class="form-input" placeholder="you@example.com">
    </div>
    <div class="form-group">
      <label class="form-label">Password</label>
      <input type="password" class="form-input" placeholder="••••••••">
    </div>
    <button type="submit" class="form-btn">Sign In</button>
  </form>
</div>`,
      css: `.form-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.form-title {
  margin: 0 0 24px;
  color: #333;
  font-size: 28px;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  color: #666;
  font-weight: 600;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.form-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.form-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}`
    };
  }
  
  private generateHero(prompt: string): any {
    return {
      html: `<div class="hero">
  <h1 class="hero-title">Welcome to Our Platform</h1>
  <p class="hero-subtitle">Build amazing experiences with our powerful tools</p>
  <button class="hero-btn">Get Started</button>
</div>`,
      css: `.hero {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 80px 40px;
  text-align: center;
  border-radius: 12px;
}

.hero-title {
  margin: 0 0 16px;
  font-size: 48px;
  font-weight: bold;
  line-height: 1.2;
}

.hero-subtitle {
  margin: 0 0 32px;
  font-size: 20px;
  opacity: 0.9;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-btn {
  background: white;
  color: #667eea;
  padding: 16px 40px;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.hero-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(255, 255, 255, 0.3);
}`
    };
  }
  
  private generateNavbar(prompt: string): any {
    return {
      html: `<nav class="navbar">
  <div class="navbar-brand">MyBrand</div>
  <ul class="navbar-menu">
    <li class="navbar-item"><a href="#" class="navbar-link">Home</a></li>
    <li class="navbar-item"><a href="#" class="navbar-link">About</a></li>
    <li class="navbar-item"><a href="#" class="navbar-link">Services</a></li>
    <li class="navbar-item"><a href="#" class="navbar-link">Contact</a></li>
  </ul>
</nav>`,
      css: `.navbar {
  background: white;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.navbar-brand {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.navbar-menu {
  list-style: none;
  display: flex;
  gap: 32px;
  margin: 0;
  padding: 0;
}

.navbar-item {
  margin: 0;
}

.navbar-link {
  color: #666;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
}

.navbar-link:hover {
  color: #667eea;
}`
    };
  }
  
  private generateGeneric(prompt: string): any {
    return {
      html: `<div class="container">
  <h1>Generated Content</h1>
  <p>This content was generated based on your prompt: "${this.aiPrompt}"</p>
  <p>Try specific keywords like "button", "card", "form", "hero", or "navbar" for better results!</p>
</div>`,
      css: `.container {
  max-width: 800px;
  margin: 40px auto;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

h1 {
  color: #667eea;
  margin-top: 0;
}

p {
  color: #666;
  line-height: 1.6;
}`
    };
  }
  
  private improveCode(): any {
    // Add responsive styles, better spacing, modern effects
    let improvedHTML = this.htmlCode;
    let improvedCSS = this.cssCode;
    
    // Add responsive meta if missing
    if (!improvedHTML.includes('viewport')) {
      improvedHTML = improvedHTML.trim();
    }
    
    // Enhance CSS with modern properties
    if (!improvedCSS.includes('box-sizing')) {
      improvedCSS = `* {\n  box-sizing: border-box;\n}\n\n${improvedCSS}`;
    }
    
    // Add smooth transitions where missing
    if (!improvedCSS.includes('transition') && improvedCSS.includes('hover')) {
      improvedCSS = improvedCSS.replace(/(\{[^}]*)(})/g, (match, content, brace) => {
        if (match.includes(':hover')) {
          return match;
        }
        if (!content.includes('transition')) {
          return content + '\n  transition: all 0.3s ease;' + brace;
        }
        return match;
      });
    }
    
    return { html: improvedHTML, css: improvedCSS };
  }
  
  private fixCode(): any {
    let fixedHTML = this.htmlCode;
    let fixedCSS = this.cssCode;
    
    // Fix common HTML issues
    fixedHTML = fixedHTML.replace(/<br>/g, '<br />'); // Self-closing tags
    fixedHTML = fixedHTML.replace(/&/g, '&amp;'); // Escape ampersands (but not in entities)
    
    // Fix common CSS issues
    fixedCSS = fixedCSS.replace(/;;/g, ';'); // Double semicolons
    fixedCSS = fixedCSS.replace(/{\s*}/g, ''); // Empty rules
    fixedCSS = fixedCSS.replace(/\s+/g, ' '); // Multiple spaces
    
    return { html: fixedHTML, css: fixedCSS };
  }
  
  private getSuggestions(): string {
    const suggestions: string[] = [];
    
    // Analyze HTML
    if (!this.htmlCode.includes('class=')) {
      suggestions.push('💡 Add CSS classes to elements for better styling control');
    }
    
    if (this.htmlCode.includes('<div><div>')) {
      suggestions.push('💡 Consider using semantic HTML tags (header, section, article)');
    }
    
    // Analyze CSS
    if (!this.cssCode.includes('transition')) {
      suggestions.push('✨ Add transitions for smoother hover effects');
    }
    
    if (!this.cssCode.includes('box-shadow')) {
      suggestions.push('✨ Consider adding box-shadow for depth');
    }
    
    if (!this.cssCode.includes('border-radius')) {
      suggestions.push('✨ Add border-radius for modern rounded corners');
    }
    
    if (this.cssCode.includes('float')) {
      suggestions.push('💡 Consider using flexbox or grid instead of float');
    }
    
    if (!this.cssCode.includes('@media')) {
      suggestions.push('📱 Add media queries for responsive design');
    }
    
    if (suggestions.length === 0) {
      return '✅ Your code looks great! Keep up the good work.';
    }
    
    return suggestions.join('\n\n');
  }
  
  clearAIPrompt(): void {
    this.aiPrompt = '';
    this.aiResponse = '';
  }
}
