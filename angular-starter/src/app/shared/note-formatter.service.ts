import { Injectable } from '@angular/core';
import hljs from 'highlight.js';

/** A single parsed content block. */
interface Block {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol' | 'code' | 'blockquote' | 'hr';
  content: string;
  items?: string[];
  lang?: string;
  codeLines?: string[];
}

/**
 * NoteFormatterService — instant, deterministic note formatting.
 *
 * Replaces the AI network call for the "Format" button.
 * Accepts raw text, markdown, or Tiptap HTML as input and returns
 * clean semantic HTML (<h2>, <p>, <ul>, <pre><code> …) ready for
 * setContent() in the Tiptap editor.
 *
 * Zero network latency: all processing is synchronous, in-memory.
 */
@Injectable({ providedIn: 'root' })
export class NoteFormatterService {

  /**
   * Format note content and return clean HTML for Tiptap.
   * @param content  Tiptap HTML or raw markdown / plain text
   */
  format(content: string): string {
    if (!content?.trim()) return content;
    const plain  = this.normalizePlainText(this.extractText(content));
    if (!plain.trim()) return content;
    const blocks = this.parseBlocks(plain);
    return this.renderHtml(blocks);
  }

  // ── Step 1: strip HTML → plain text, preserving code fences ────────────

  private extractText(input: string): string {
    const trimmed = input.replace(/^\s+/, '');
    // Already plain text / markdown — no stripping needed
    if (!trimmed.startsWith('<')) return input;

    return input
      // Preserve <pre> blocks as fenced code
      .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
        const code = this.decodeEntities(inner.replace(/<[^>]+>/g, '')).trim();
        if (!code) return '\n';
        return `\n\`\`\`\n${code}\n\`\`\`\n`;
      })
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|li|blockquote|div|tr)>/gi, '\n')
      .replace(/<\/h([1-6])>/gi, '\n')
      .replace(/<h([1-6])[^>]*>/gi, (_, n) => '#'.repeat(+n) + ' ')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;|&lt;|&gt;|&quot;|&apos;|&nbsp;/g, entity => this.decodeEntities(entity))
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Fix common rough-note shapes before block parsing.
   * Important: keep this conservative so we do not rewrite the user's wording.
   */
  private normalizePlainText(text: string): string {
    return this.separateCommonSectionLabels(text)
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => this.normalizeLifecycleChain(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private separateCommonSectionLabels(text: string): string {
    const labels = '(Order yaad rakho|Simple meaning|Simple explanation|Summary|Example|Examples|Important|Notes?)';
    return text
      .replace(new RegExp(`([.!?])\\s+${labels}\\b`, 'gi'), '$1\n\n$2')
      .replace(new RegExp(`(\\))(?=${labels}\\b)`, 'gi'), '$1\n\n');
  }

  private normalizeLifecycleChain(line: string): string {
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
    const hookPattern = new RegExp(`(${hooks.join('|')})\\s*\\(\\)`, 'g');
    const matches = line.match(hookPattern) ?? [];
    if (matches.length < 2) return line;

    return line
      .replace(hookPattern, (_match, hook) => `\n- \`${hook}()\`\n`)
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/`\n\n(?=- `)/g, '`\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ── Step 2: detect structure and emit Blocks ────────────────────────────

  private parseBlocks(text: string): Block[] {
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Close any unclosed fence (defensive)
    if ((text.match(/```/g) || []).length % 2 !== 0) text += '\n```';

    // Extract fenced code blocks → placeholders so inner content is untouched
    const codeStore: Array<{ lang: string; code: string }> = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      codeStore.push({ lang: (lang || '').toLowerCase(), code: code.trim() });
      return `@@CODE${codeStore.length - 1}@@`;
    });

    const lines  = text.split('\n');
    const blocks: Block[] = [];

    let paraLines:    string[] = [];
    let bulletItems:  string[] = [];
    let orderedItems: string[] = [];
    let codeBuffer:   string[] = [];

    const flushParagraph = () => {
      if (!paraLines.length) return;
      const joined = paraLines.join(' ').replace(/\s{2,}/g, ' ').trim();
      if (joined) blocks.push({ type: 'p', content: joined });
      paraLines = [];
    };

    const flushBullets = () => {
      if (!bulletItems.length) return;
      blocks.push({ type: 'ul', content: '', items: [...bulletItems] });
      bulletItems = [];
    };

    const flushOrdered = () => {
      if (!orderedItems.length) return;
      blocks.push({ type: 'ol', content: '', items: [...orderedItems] });
      orderedItems = [];
    };

    const flushCode = () => {
      if (!codeBuffer.length) return;
      const joined = codeBuffer.join('\n');
      const lang   = this.detectLang(joined);
      blocks.push({ type: 'code', content: '', lang, codeLines: [...codeBuffer] });
      codeBuffer = [];
    };

    const flushAll = () => { flushCode(); flushBullets(); flushOrdered(); flushParagraph(); };

    // ── Code signature patterns ──────────────────────────────────────────
    const CODE_START = /^\s*(let\s|const\s|var\s|function\s|class\s|if\s*\(|for\s*\(|while\s*\(|switch\s*\(|return\s|import\s|export\s|def\s|async\s+def|async\s+function|print\s*\(|console\.\w|#include\s|void\s|int\s|float\s|bool\s|public\s|private\s|protected\s|interface\s|type\s|struct\s|fn\s)\b/;
    const CODE_CONT  = /[{};]$|^\s*\/\/|^\s*\/\*|^\s*\*\s|^\s*\*\/|=>\s*[{(]|:\s*\{/;

    for (let i = 0; i < lines.length; i++) {
      const line    = lines[i];
      const trimmed = line.trim();

      // ── Restore code block placeholder ────────────────────────────────
      if (/^@@CODE\d+@@$/.test(trimmed)) {
        flushAll();
        const idx = parseInt(trimmed.match(/\d+/)![0], 10);
        const { lang, code } = codeStore[idx];
        const normalizedCodeText = this.normalizePlainText(code);
        if (!normalizedCodeText) continue;
        if (!this.isLikelyCodeBlock(normalizedCodeText)) {
          const nested = this.parseBlocks(normalizedCodeText);
          blocks.push(...nested);
          continue;
        }
        blocks.push({ type: 'code', content: '', lang, codeLines: [normalizedCodeText] });
        continue;
      }

      // ── Empty line → flush accumulators ──────────────────────────────
      if (!trimmed) {
        flushCode();
        flushBullets();
        flushOrdered();
        // Blank line between para lines → finish paragraph
        if (paraLines.length) flushParagraph();
        continue;
      }

      // ── Already-markdown headings ─────────────────────────────────────
      const mdH = trimmed.match(/^(#{1,4})\s+(.*)/);
      if (mdH) {
        flushAll();
        const lvl  = mdH[1].length;
        const type = (['h1', 'h2', 'h3', 'h4'] as const)[lvl - 1];
        blocks.push({ type, content: mdH[2].trim() });
        continue;
      }

      // ── Horizontal rule ───────────────────────────────────────────────
      if (/^[-*_]{3,}$/.test(trimmed)) {
        flushAll();
        blocks.push({ type: 'hr', content: '' });
        continue;
      }

      // ── Blockquote ────────────────────────────────────────────────────
      const bq = trimmed.match(/^>\s*(.*)/);
      if (bq) {
        flushAll();
        blocks.push({ type: 'blockquote', content: bq[1] });
        continue;
      }

      // ── Unordered list ────────────────────────────────────────────────
      const ulItem = trimmed.match(/^[-*+•–—]\s+(.*)/);
      if (ulItem) {
        flushCode();
        flushOrdered();
        flushParagraph();
        bulletItems.push(ulItem[1].trim());
        continue;
      }

      // ── Ordered list ──────────────────────────────────────────────────
      const olItem = trimmed.match(/^\d+[.)]\s+(.*)/);
      if (olItem) {
        flushCode();
        flushBullets();
        flushParagraph();
        orderedItems.push(olItem[1].trim());
        continue;
      }

      // ── Auto-detect headings ──────────────────────────────────────────
      // A line is auto-promoted to a heading when:
      //   • It ends with ":" AND is short AND has no sentence punctuation
      //   • OR it is the very first non-blank line and looks like a title
      const prevBlank = !lines[i - 1]?.trim();
      const nextBlank = !lines[i + 1]?.trim();
      const isCommonSectionLabel = /^(Order yaad rakho|Simple meaning|Simple explanation|Summary|Example|Examples|Important|Notes?)$/i.test(trimmed);

      const looksLikeHeading =
        trimmed.length > 0 &&
        trimmed.length <= 72 &&
        !/[.!?]$/.test(trimmed) &&            // not a sentence
        !/[@=/\\]/.test(trimmed) &&           // not code-like
        (
          isCommonSectionLabel
          ||
          trimmed.endsWith(':')               // "What is a Promise:" pattern
          || (i === 0 && !/[,;]/.test(trimmed))       // First line = title
          || (prevBlank && nextBlank && /^[A-Z]/.test(trimmed)) // isolated title-case
        );

      if (looksLikeHeading && !codeBuffer.length) {
        flushAll();
        const cleaned = trimmed.replace(/:$/, '').trim();
        // First line → h1, section header → h2
        const type: 'h1' | 'h2' = (i === 0 && !prevBlank) ? 'h1' : 'h2';
        blocks.push({ type, content: cleaned });
        continue;
      }

      // ── Code heuristics ───────────────────────────────────────────────
      // Start of code: matches code keywords
      // Continuation: code-like chars OR indented when we already have buffer
      const continuingCode = codeBuffer.length > 0 &&
        (CODE_CONT.test(trimmed) || /^\s{2,}/.test(line));
      if (CODE_START.test(trimmed) || continuingCode) {
        flushBullets();
        flushOrdered();
        flushParagraph();
        codeBuffer.push(line.replace(/\s+$/, ''));
        continue;
      }

      // ── Paragraph ─────────────────────────────────────────────────────
      flushCode();
      flushBullets();
      flushOrdered();
      paraLines.push(trimmed);
    }

    flushAll();
    return blocks;
  }

  // ── Step 3: render HTML ─────────────────────────────────────────────────

  private renderHtml(blocks: Block[]): string {
    const parts: string[] = [];

    for (const block of blocks) {
      switch (block.type) {
        case 'h1': parts.push(`<h1>${this.inline(block.content)}</h1>`); break;
        case 'h2': parts.push(`<h2>${this.inline(block.content)}</h2>`); break;
        case 'h3': parts.push(`<h3>${this.inline(block.content)}</h3>`); break;
        case 'h4': parts.push(`<h4>${this.inline(block.content)}</h4>`); break;
        case 'p':  parts.push(`<p>${this.inline(block.content)}</p>`); break;
        case 'hr': parts.push('<hr>'); break;
        case 'blockquote':
          parts.push(`<blockquote><p>${this.inline(block.content)}</p></blockquote>`);
          break;
        case 'ul':
          parts.push('<ul>' +
            (block.items ?? []).map(it => `<li>${this.inline(it)}</li>`).join('') +
          '</ul>');
          break;
        case 'ol':
          parts.push('<ol>' +
            (block.items ?? []).map(it => `<li>${this.inline(it)}</li>`).join('') +
          '</ol>');
          break;
        case 'code': {
          const rawCode  = (block.codeLines ?? []).join('\n');
          const lang     = block.lang ?? '';
          let highlighted: string;
          try {
            highlighted = lang && lang !== 'plaintext'
              ? hljs.highlight(rawCode, { language: lang, ignoreIllegals: true }).value
              : hljs.highlightAuto(rawCode).value;
          } catch {
            highlighted = this.escapeHtml(rawCode);
          }
          parts.push(
            `<pre><code class="language-${lang} hljs">${highlighted}</code></pre>`
          );
          break;
        }
      }
    }

    return parts.join('');
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Detect programming language from code body. */
  private detectLang(code: string): string {
    if (/\b(def |import |from |elif |lambda |print\(|:\s*$)/m.test(code)) return 'python';
    if (/\b(namespace|using\s+System|Console\.|\.cs\b|public\s+class)/m.test(code)) return 'csharp';
    if (/\b(const|let|var|function|=>|import|require\(|module\.exports)/m.test(code)) return 'javascript';
    if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i.test(code)) return 'sql';
    if (/^<[a-zA-Z]/.test(code.trim()) && /<\/[a-zA-Z]>/.test(code)) return 'html';
    return '';
  }

  private isLikelyCodeBlock(code: string): boolean {
    const trimmed = code.trim();
    if (!trimmed) return false;
    if (trimmed.split('\n').length >= 2 && /[{};]|^\s{2,}|\b(return|const|let|var|function|class|if|for|while|import|export)\b/m.test(trimmed)) {
      return true;
    }
    if (/^\s*(const|let|var|function|class|if|for|while|switch|return|import|export|def|async\s+def|public|private|protected|interface|type)\b/.test(trimmed)) {
      return true;
    }
    if (/^<[a-zA-Z][\s\S]*<\/[a-zA-Z][^>]*>$/.test(trimmed)) return true;
    return false;
  }

  /** Apply inline markdown: bold, italic, inline code, links. */
  private inline(text: string): string {
    // Escape HTML amps that aren't already entities
    let t = text.replace(/&(?![a-zA-Z#\d]+;)/g, '&amp;');
    t = t.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Inline code — escape inner content before other replacements
    t = t.replace(/`([^`\n]+)`/g, (_, c) => `<code>${this.escapeHtml(c)}</code>`);

    t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/~~(.+?)~~/g, '<s>$1</s>');
    t = t.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );
    return t;
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private decodeEntities(s: string): string {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}
