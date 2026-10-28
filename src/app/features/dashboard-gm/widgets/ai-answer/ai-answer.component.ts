import { Component, Input } from '@angular/core';

interface AiAnswerBlock {
  kind: 'paragraph' | 'list';
  label?: string;
  text?: string;
  items?: string[];
}

/**
 * Renders a plain-text AI answer as readable blocks: "Label: text" lines get a
 * bold label, "-", "*" or "1." lines become a list. Text is bound, never HTML.
 */
@Component({
  selector: 'app-ai-answer',
  templateUrl: './ai-answer.component.html',
  styleUrls: ['./ai-answer.component.scss']
})
export class AiAnswerComponent {
  @Input() streaming = false;

  blocks: AiAnswerBlock[] = [];

  @Input() set text(value: string | null | undefined) {
    this.blocks = this.parse(value || '');
  }

  private parse(value: string): AiAnswerBlock[] {
    const blocks: AiAnswerBlock[] = [];
    for (const raw of value.replace(/\*\*|__|`/g, '').split('\n')) {
      const line = raw.trim().replace(/^#+\s*/, '');
      if (!line) continue;
      const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (item) {
        const last = blocks[blocks.length - 1];
        if (last?.kind === 'list') last.items!.push(item[1]);
        else blocks.push({ kind: 'list', items: [item[1]] });
        continue;
      }
      const labelled = line.match(/^([A-Za-z][\w /&-]{1,24}):\s*(.*)$/);
      blocks.push(labelled
        ? { kind: 'paragraph', label: labelled[1], text: labelled[2] }
        : { kind: 'paragraph', text: line });
    }
    return blocks;
  }
}
