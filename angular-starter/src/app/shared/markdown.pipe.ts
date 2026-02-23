import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown'
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    let html = value;

    // Convert **bold** to <strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* to <em>
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert ``` code blocks to <pre><code>
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // Convert inline `code` to <code>
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert headings
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Convert bullet points
    html = html.replace(/^• (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^✅ (.*$)/gim, '<li class="check">$1</li>');
    html = html.replace(/^🔹 (.*$)/gim, '<li class="bullet">$1</li>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li.*?>.*?<\/li>\s*)+/g, (match) => `<ul>${match}</ul>`);

    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
