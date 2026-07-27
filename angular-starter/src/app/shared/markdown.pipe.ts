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
    // If the content is already HTML (from Tiptap / AI), return it as-is so we
    // don't double-process it through the markdown parser.
    if (text.replace(/^\s+/, '').startsWith('<')) return this.decorateHtml(text);

    // Normalize CRLF → LF (AI responses often use \r\n, which breaks line-end regex like /\|$/)
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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
        `<div class="md-code-header-actions">` +
        `<button class="md-copy-btn" data-code="${encoded}" title="Copy code" aria-label="Copy code"` +
        ` onclick="var b=this;navigator.clipboard.writeText(decodeURIComponent(b.dataset.code))` +
        `.then(()=>{b.classList.add('md-copy-btn--copied');setTimeout(()=>b.classList.remove('md-copy-btn--copied'),1800)})">` +
        `<svg class="md-btn-icon md-copy-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">` +
        `<rect x="4" y="4" width="9" height="10" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11"/></svg>` +
        `<svg class="md-btn-icon md-check-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">` +
        `<polyline points="2.5 8.5 6 12 13.5 4"/></svg>` +
        `</button>` +
        `</div>` +
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

      // Compatibility for older notes whose table line-breaks were flattened
      // before saving: |A|B| |---|---| |1|2| |3|4|
      const packedTable = this.renderPackedTable(line);
      if (packedTable) {
        closeLists();
        out.push(packedTable);
        continue;
      }

      // Table
      if (line.match(/^\|.+\|$/) && (lines[i + 1] || '').match(/^\|[\s\-:]+\|/)) {
        closeLists();
        const tableCells = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
        const hdrs = tableCells(line).map(c => `<th>${this.inline(c.trim())}</th>`).join('');
        out.push(`<table class="md-table"><thead><tr>${hdrs}</tr></thead><tbody>`);
        i += 2;
        while (i < lines.length && lines[i].match(/^\|.+\|$/)) {
          const cells = tableCells(lines[i]).map(c => `<td>${this.inline(c.trim())}</td>`).join('');
          out.push(`<tr>${cells}</tr>`);
          i++;
        }
        out.push('</tbody></table>');
        i--;
        continue;
      }

      // Compatibility for flattened arrow diagrams such as:
      // ↓ WHERE ↓ GROUP BY ↓ HAVING ↓ SELECT ↓ ORDER BY
      const packedFlow = this.renderPackedFlow(line);
      if (packedFlow) {
        closeLists();
        out.push(packedFlow);
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
    return this.decorateHtml(html);
  }

  private decorateHtml(html: string): string {
    const protectedParts: string[] = [];
    const tokenized = html.replace(/<(?:pre|code)\b[\s\S]*?<\/(?:pre|code)>/gi, match => {
      protectedParts.push(match);
      return `\x00HTMLPROTECT${protectedParts.length - 1}\x00`;
    });

    const hooks = [
      'constructor',
      'ngOnChanges',
      'ngOnInit',
      'ngDoCheck',
      'ngAfterContentInit',
      'ngAfterContentChecked',
      'ngAfterViewInit',
      'ngAfterViewChecked',
      'ngOnDestroy',
    ];
    const hookPattern = new RegExp(`\\b(${hooks.join('|')})\\s*\\(\\)`, 'g');
    let decorated = tokenized.replace(hookPattern, (_match, hook) => {
      return `<code class="md-inline md-hook">${hook}()</code>`;
    });

    // The former mobile textarea saved some Markdown tables inside a single
    // HTML paragraph. Reconstruct those before returning Tiptap HTML.
    decorated = decorated.replace(/<p[^>]*>(\|[^<]*\|\s*)<\/p>/gi, (match, content) => {
      return this.renderPackedTable(content) || match;
    });

    // Tiptap HTML saved by older mobile editors may contain a complete arrow
    // sequence in one paragraph. Upgrade it to the same visual flow used for
    // Markdown input while preserving ordinary prose paragraphs.
    decorated = decorated.replace(/<p([^>]*)>([^<]*(?:↓[^<]*){2,})<\/p>/gi, (_match, attrs, content) => {
      return this.renderPackedFlow(content) || `<p${attrs}>${content}</p>`;
    });

    protectedParts.forEach((part, i) => {
      decorated = decorated.replace(`\x00HTMLPROTECT${i}\x00`, part);
    });
    return decorated;
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

  private renderPackedTable(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !/\|\s*:?-{3,}:?\s*\|/.test(trimmed)) return null;

    const rawTokens = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(token => token.trim());
    const separatorStart = rawTokens.findIndex(token => /^:?-{3,}:?$/.test(token));
    if (separatorStart < 1) return null;

    const headers = rawTokens.slice(0, separatorStart).filter(Boolean);
    const columnCount = headers.length;
    if (columnCount < 2) return null;

    let cursor = separatorStart;
    let separatorsSeen = 0;
    while (cursor < rawTokens.length && separatorsSeen < columnCount) {
      if (/^:?-{3,}:?$/.test(rawTokens[cursor])) separatorsSeen++;
      cursor++;
    }
    if (separatorsSeen !== columnCount) return null;

    const data = rawTokens.slice(cursor).filter(Boolean);
    const rows: string[][] = [];
    for (let index = 0; index < data.length; index += columnCount) {
      const row = data.slice(index, index + columnCount);
      if (row.length === columnCount) rows.push(row);
    }

    const head = headers.map(cell => `<th>${this.inline(cell)}</th>`).join('');
    const body = rows
      .map(row => `<tr>${row.map(cell => `<td>${this.inline(cell)}</td>`).join('')}</tr>`)
      .join('');
    return `<div class="md-table-scroll"><table class="md-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  private renderPackedFlow(line: string): string | null {
    const plain = line.replace(/&darr;/gi, '↓').replace(/&#8595;/g, '↓').trim();
    if ((plain.match(/↓/g) || []).length < 2) return null;
    const steps = plain.split('↓').map(step => step.trim()).filter(Boolean);
    if (steps.length < 2) return null;
    return `<div class="md-inline-flow" role="list" aria-label="Process flow">${
      steps.map((step, index) =>
        `<div class="md-flow-step" role="listitem"><span class="md-flow-number">${index + 1}</span><span>${this.inline(step)}</span></div>`
      ).join('<span class="md-flow-arrow" aria-hidden="true">↓</span>')
    }</div>`;
  }
}

