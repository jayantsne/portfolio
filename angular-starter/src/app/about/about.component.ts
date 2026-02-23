import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { DownloadService } from '../download.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent implements OnInit, AfterViewInit, OnDestroy {
  private tiltHandler?: (e: MouseEvent) => void;
  private resetHandler?: () => void;
  private tiltCard?: HTMLElement;

  constructor(private downloads: DownloadService) { }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const card = document.querySelector('.about-glass') as HTMLElement | null;
    if (!card) return;

    this.tiltCard = card;
    this.tiltHandler = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--tilt-x', `${-y * 6}deg`);
      card.style.setProperty('--tilt-y', `${x * 6}deg`);
    };
    this.resetHandler = () => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    };

    card.addEventListener('mousemove', this.tiltHandler);
    card.addEventListener('mouseleave', this.resetHandler);
  }

  ngOnDestroy(): void {
    if (!this.tiltCard) return;
    if (this.tiltHandler) this.tiltCard.removeEventListener('mousemove', this.tiltHandler);
    if (this.resetHandler) this.tiltCard.removeEventListener('mouseleave', this.resetHandler);
  }

  download(): void {
    this.downloads
      .download('../../assets/JayantBhardwaj.docx')
      .subscribe(blob => {
        const a = document.createElement('a');
        const objectUrl = URL.createObjectURL(blob);
        a.href = objectUrl;
        a.download = 'jayantbhardwaj.docx';
        a.click();
        URL.revokeObjectURL(objectUrl);
      });
  }
}
