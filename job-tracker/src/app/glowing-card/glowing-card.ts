import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glowing-card',
  imports: [CommonModule],
  templateUrl: './glowing-card.html',
  styleUrl: './glowing-card.scss',
})
export class GlowingCard {
  @Input() isStarred = false;
}
