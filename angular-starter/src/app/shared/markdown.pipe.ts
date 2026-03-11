import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import hljs from 'highlight.js';

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    return this.sanitizer.bypassSecurityTrustHtml(this.parse(value));
  }

  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private highlight(code: string, lang: string): string {
    if (lang && lang !== 'plaintext') {
      try {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      } catch { /* fall through */ }
    }
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      return this.escape(code);
    }
  }

  private parse(text: string): string {
    // Close any unclosed code fence so partial streams render safely
    const fences = (text.match(/```/g) || []).length;
    if (fences % 2 !== 0) text += '\n```';

    // 1. Extract fenced code blocks
    const codeBlocks: string[] = [];
    text = text.replace(/```(\w*)\r?\n?([\s\S]*?)```/g, (_m, lang, code) => {
      const rawCode   = code.trim();
      const langName  = (lang || 'plaintext').toLowerCase();
      const highlighted = this.highlight(rawCode, langName);
      const langLabel   = lang ? `<span class="md-lang-label">${lang}</span>` : '';
      const encoded = encodeURIComponent(rawCode);
      codeBlocks.push(
        `<div class="md-code-block">` +
        `<div class="md-code-header">${langLabel}` +
        `<button class="md-copy-btn" data-code="${encoded}"` +
        ` onclick="navigator.clipboard.writeText(decodeURIComponent(this.dataset.code))` +
        `.then(()=>{this.textContent='✓ Copied';setTimeout(()=>{this.textContent='Copy'},1500)})">Copy</button>` +
        `</div>` +
        `<pre class="md-pre hljs"><code class="hljs language-${langName}">${highlighted}</code></pre>` +
        `</div>`
      );
      return `\x00CODE${codeBlocks.length - 1}\x00`;
    });

    // 2. Extract inline code
    const inlineCodes: string[] = [];
    text = text.replace(/`([^`\n]+)`/g, (_m, code) => {
      inlineCodes.push(`<code class="md-inline">${this.escape(code)}</code>`);
      return `\x00INLINE${inlineCodes.length - 1}\x00`;
    });

    // 3. Process line by line
    const lines = text.split('\n');
    const out: string[] = [];
    let listStack: Array<'ul' | 'ol'> = [];

    const closeLists = () => {
      while (listStack.length) { out.push(`</${listStack.pop()}>`); }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const h4 = line.match(/^####\s+(.+)/);
      const h3 = line.match(/^###\s+(.+)/);
      const h2 = line.match(/^##\s+(.+)/);
      const h1 = line.match(/^#\s+(.+)/);
      if (h4) { closeLists(); out.push(`<h4 class="md-h4">${this.inline(h4[1])}</h4>`); continue; }
      if (h3) { closeLists(); out.push(`<h3 class="md-h3">${this.inline(h3[1])}</h3>`); continue; }
      if (h2) { closeLists(); out.push(`<h2 class="md-h2">${this.inline(h2[1])}</h2>`); continue; }
      if (h1) { closeLists(); out.push(`<h1 class="md-h1">${this.inline(h1[1])}</h1>`); continue; }

      if (/^[-*_]{3,}$/.test(line.trim())) { closeLists(); out.push('<hr class="md-hr">'); continue; }

      const bq = line.match(/^>\s*(.*)/);
      if (bq) { closeLists(); out.push(`<blockquote class="md-blockquote">${this.inline(bq[1])}</blockquote>`); continue; }

      // Table
      if (line.match(/^\|.+\|$/) && (lines[i + 1] || '').match(/^\|[\s\-:]+\|/)) {
        closeLists();
        const hdrs = line.split('|').filter(c => c.trim()).map(c => `<th>${this.inline(c.trim())}</th>`).join('');
        out.push(`<table class="md-table"><thead><tr>${hdrs}</tr></thead><tbody>`);
        i += 2;
        while (i < lines.length && lines[i].match(/^\|.+\|$/)) {
          const cells = lines[i].split('|').filter(c => c.trim()).map(c => `<td>${this.inline(c.trim())}</td>`).join('');
          out.push(`<tr>${cells}</tr>`);
          i++;
        }
        out.push('</tbody></table>');
        i--;
        continue;
      }

      // Checklist items:  - [ ] todo   or   - [x] done
      const cl = line.match(/^[-*+\u2022]\s+\[([ xX])\]\s+(.+)/);
      if (cl) {
        if (!listStack.length || listStack[listStack.length - 1] !== 'ul') {
          closeLists(); out.push('<ul class="md-ul md-checklist">'); listStack.push('ul');
        }
        const checked = cl[1].toLowerCase() === 'x' ? ' checked' : '';
        const doneClass = cl[1].toLowerCase() === 'x' ? ' class="md-check-done"' : '';
        out.push(`<li class="md-li md-check-item"><input type="checkbox" disabled${checked}> <span${doneClass}>${this.inline(cl[2])}</span></li>`);
        continue;
      }

      const ul = line.match(/^[-*+\u2022]\s+(.+)/);
      if (ul) {
        if (!listStack.length || listStack[listStack.length - 1] !== 'ul') {
          closeLists(); out.push('<ul class="md-ul">'); listStack.push('ul');
        }
        out.push(`<li class="md-li">${this.inline(ul[1])}</li>`);
        continue;
      }

      const ol = line.match(/^\d+\.\s+(.+)/);
      if (ol) {
        if (!listStack.length || listStack[listStack.length - 1] !== 'ol') {
          closeLists(); out.push('<ol class="md-ol">'); listStack.push('ol');
        }
        out.push(`<li class="md-li">${this.inline(ol[1])}</li>`);
        continue;
      }

      if (!line.trim()) { closeLists(); out.push('<div class="md-spacer"></div>'); continue; }

      closeLists();
      out.push(`<p class="md-p">${this.inline(line)}</p>`);
    }

    closeLists();
    let html = out.join('');
    codeBlocks.forEach((b, i) => { html = html.replace(`\x00CODE${i}\x00`, b); });
    inlineCodes.forEach((c, i) => { html = html.replace(`\x00INLINE${i}\x00`, c); });
    return html;
  }

  private inline(text: string): string {
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a class="md-link" href="$2" target="_blank" rel="noopener">$1</a>');
    return text;
  }
}

