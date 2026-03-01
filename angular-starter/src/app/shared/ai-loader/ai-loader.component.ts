import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-ai-loader',
  templateUrl: './ai-loader.component.html',
  styleUrls: ['./ai-loader.component.css']
})
export class AiLoaderComponent {
  @Input() loadingMessage: string = 'Loading AI-powered questions...';
}
