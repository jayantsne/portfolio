import {
  Component,
  AfterViewInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  NgZone,
  ViewEncapsulation,
  ChangeDetectorRef,
} from '@angular/core';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

const LayoutTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layout: {
        default: null,
        parseHTML: element => element.getAttribute('data-layout'),
        renderHTML: attributes => attributes.layout
          ? { 'data-layout': attributes.layout }
          : {},
      },
    };
  },
});

/**
 * Thin Angular wrapper around Tiptap (ProseMirror-based rich-text editor).
 *
 * Usage:
 *   <app-tiptap-editor
 *     [initialContent]="myContent"
 *     [placeholder]="'Type here…'"
 *     (contentChange)="myContent = $event"
 *     #tiptapRef>
 *   </app-tiptap-editor>
 *
 *   // Programmatic access via @ViewChild:
 *   this.tiptapRef.getHTML()          → current HTML
 *   this.tiptapRef.setContent(html)   → replace content
 *   this.tiptapRef.isEmpty()          → true if blank
 */
@Component({
  selector: 'app-tiptap-editor',
  templateUrl: './tiptap-editor.component.html',
  styleUrls: ['./tiptap-editor.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class TiptapEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('editorEl', { static: true }) editorEl!: ElementRef<HTMLDivElement>;

  /** Placeholder shown when the editor is empty. */
  @Input() placeholder = 'Type or paste your note here…';

  /**
   * Initial content for the editor.
   * Accepts both plain markdown and HTML — the component normalises either format.
   * Only applied once at init; to change content later use setContent().
   */
  @Input() initialContent = '';

  /** Extra CSS class(es) applied to the editor wrapper. */
  @Input() editorClass = '';

  /** Emits the current HTML string on every change. */
  @Output() contentChange = new EventEmitter<string>();

  /** Direct access to the underlying Tiptap editor (use with care). */
  editor: Editor | null = null;

  showTablePicker = false;
  tableRows = 3;
  tableColumns = 3;

  /** Set to true before a programmatic setContent() to suppress the next contentChange emission. */
  private _suppressNextEmit = false;

  constructor(private zone: NgZone, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    // Run outside Angular zone to avoid unnecessary change-detection cycles
    // on every keystroke; we re-enter the zone only when emitting output.
    this.zone.runOutsideAngular(() => {
      this.editor = new Editor({
        element: this.editorEl.nativeElement,
        extensions: [
          StarterKit,
          Placeholder.configure({ placeholder: this.placeholder }),
          LayoutTable.configure({ resizable: true }),
          TableRow,
          TableHeader,
          TableCell,
        ],
        content: this.prepareContent(this.initialContent),
        onUpdate: ({ editor }) => {
          if (this._suppressNextEmit) {
            this._suppressNextEmit = false;
            return;
          }
          this.zone.run(() => {
            this.contentChange.emit(editor.getHTML());
            this.cdr.detectChanges(); // keep toolbar active-states in sync
          });
        },
        onSelectionUpdate: () => {
          // Re-run change detection so toolbar isActive() calls reflect new selection
          this.zone.run(() => this.cdr.detectChanges());
        },
        onTransaction: () => {
          this.zone.run(() => this.cdr.detectChanges());
        },
      });
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Returns the current editor content as an HTML string. */
  getHTML(): string {
    return this.editor?.getHTML() ?? '';
  }

  /** Returns true when the editor contains no meaningful content. */
  isEmpty(): boolean {
    if (!this.editor) return true;
    return this.editor.isEmpty;
  }

  /**
   * Replace the editor content programmatically (e.g. after AI formatting).
   * Does NOT emit a contentChange event — call this from the component
   * and update the bound property manually if needed.
   *
   * @param html  HTML string to load (also accepts a blank string to clear).
   * @param focusEnd  Whether to move the cursor to the end after setting content.
   */
  setContent(html: string, focusEnd = true): void {
    if (!this.editor) return;
    this._suppressNextEmit = true;
    this.editor.commands.setContent(html || '');
    if (focusEnd && html) {
      this.editor.commands.focus('end');
    }
  }

  /** Clears all editor content. */
  clear(): void {
    if (!this.editor) return;
    this._suppressNextEmit = true;
    this.editor.commands.setContent('');
  }

  /** Focus the editor. */
  focus(): void {
    this.editor?.commands.focus();
  }

  insertTable(): void {
    const rows = Math.min(20, Math.max(1, this.tableRows));
    const cols = Math.min(12, Math.max(1, this.tableColumns));
    this.editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
    this.showTablePicker = false;
  }

  updateTableRows(event: Event): void {
    this.tableRows = this.normaliseSize(event, 20);
  }

  updateTableColumns(event: Event): void {
    this.tableColumns = this.normaliseSize(event, 12);
  }

  insertFlow(): void {
    if (!this.editor) return;
    const labels = ['Start', 'Process', 'Decision', 'Result'];
    const cells: any[] = [];
    labels.forEach((label, index) => {
      cells.push(this.tableCell(label));
      if (index < labels.length - 1) cells.push(this.tableCell('→'));
    });
    this.editor.chain().focus().insertContent([
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Flow' }] },
      { type: 'table', attrs: { layout: 'flow' }, content: [{ type: 'tableRow', content: cells }] },
      { type: 'paragraph' },
    ]).run();
  }

  insertDiagram(): void {
    if (!this.editor) return;
    this.editor.chain().focus().insertContent([
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Diagram' }] },
      {
        type: 'table', attrs: { layout: 'diagram' }, content: [
          { type: 'tableRow', content: [this.tableCell('Main concept', 'tableHeader', 3)] },
          { type: 'tableRow', content: [this.tableCell('Branch A'), this.tableCell('Branch B'), this.tableCell('Branch C')] },
        ],
      },
      { type: 'paragraph' },
    ]).run();
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = null;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Normalise raw content before feeding it to Tiptap.
   * • If the string already starts with an HTML tag → pass through as-is.
   * • Otherwise → run lightweight markdown → HTML conversion.
   */
  private prepareContent(text: string): string {
    if (!text?.trim()) return '';
    if (/^<[a-zA-Z]/.test(text.trim())) return text;
    return this.mdToHtml(text);
  }

  /**
   * Lightweight markdown → HTML converter for seeding Tiptap with existing
   * markdown-formatted notes.  Handles the most common patterns; does NOT
   * need to be feature-complete because the AI formatter will return proper
   * HTML going forward.
   */
  private mdToHtml(md: string): string {
    let text = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Ensure unclosed fences are closed (defensive)
    const fenceCount = (text.match(/```/g) || []).length;
    if (fenceCount % 2 !== 0) text += '\n```';

    // 1. Extract fenced code blocks → placeholders so inner markdown is untouched
    const codeBlocks: string[] = [];
    text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
      const escaped = code
        .trim()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const langAttr = lang ? ` class="language-${lang}"` : '';
      codeBlocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`);
      return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
    });

    // 2. Split on blank lines → paragraph/block boundaries
    const blocks = text.split(/\n{2,}/);

    const rendered = blocks.map(block => {
      block = block.trim();
      if (!block) return '';

      // Restore code block placeholder
      const codeMatch = block.match(/^\x00CODEBLOCK(\d+)\x00$/);
      if (codeMatch) return codeBlocks[+codeMatch[1]];

      // Headings
      const hMatch = block.match(/^(#{1,3})\s+(.+)/);
      if (hMatch) {
        const level = hMatch[1].length;
        return `<h${level}>${this.inline(hMatch[2])}</h${level}>`;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(block)) return '<hr>';

      // Unordered list (groups multi-line list items)
      if (/^[-*+]\s/.test(block)) {
        const items = block
          .split('\n')
          .filter(l => /^[-*+]\s/.test(l))
          .map(l => `<li>${this.inline(l.replace(/^[-*+]\s+/, '').trim())}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }

      // Ordered list
      if (/^\d+\.\s/.test(block)) {
        const items = block
          .split('\n')
          .filter(l => /^\d+\.\s/.test(l))
          .map(l => `<li>${this.inline(l.replace(/^\d+\.\s+/, '').trim())}</li>`)
          .join('');
        return `<ol>${items}</ol>`;
      }

      // Blockquote
      if (block.startsWith('> ')) {
        const content = block.split('\n').map(l => l.replace(/^>\s?/, '')).join(' ');
        return `<blockquote><p>${this.inline(content)}</p></blockquote>`;
      }

      // Paragraph (replace single line-breaks with spaces for prose flow)
      return `<p>${this.inline(block.replace(/\n/g, ' '))}</p>`;
    });

    return rendered.filter(Boolean).join('');
  }

  /** Inline markdown: bold, italic, inline-code, links. */
  private inline(text: string): string {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/_([^_]+)_/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  private tableCell(text: string, type = 'tableCell', colspan = 1): any {
    return {
      type,
      attrs: { colspan, rowspan: 1, colwidth: null },
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    };
  }

  private normaliseSize(event: Event, max: number): number {
    const value = Number((event.target as HTMLInputElement).value);
    return Math.min(max, Math.max(1, Number.isFinite(value) ? Math.floor(value) : 1));
  }
}
