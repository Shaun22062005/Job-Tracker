import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-glowing-card',
  imports: [CommonModule],
  templateUrl: './glowing-card.html',
  styleUrl: './glowing-card.scss',
})
export class GlowingCard implements AfterViewInit, OnDestroy {
  @Input() isStarred = false;
  @Input() mode: 'dark' | 'light' = 'dark';

  @ViewChild('cardContainer') cardContainer!: ElementRef<HTMLDivElement>;

  isAnimating = signal(false);
  private animFrameId: number | null = null;
  private introTimer: any = null;

  ngAfterViewInit() {
    if (this.isStarred) {
      this.triggerIntroAnimation();
    }
  }

  ngOnDestroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.introTimer) {
      clearTimeout(this.introTimer);
    }
  }

  private clamp(value: number, min = 0, max = 100): number {
    return Math.min(Math.max(value, min), max);
  }

  private round(value: number, precision = 3): number {
    return parseFloat(value.toFixed(precision));
  }

  private centerOfElement(rect: DOMRect): [number, number] {
    return [rect.width / 2, rect.height / 2];
  }

  private angleFromPointer(dx: number, dy: number): number {
    let angleDegrees = 0;
    if (dx !== 0 || dy !== 0) {
      const angleRadians = Math.atan2(dy, dx);
      angleDegrees = angleRadians * (180 / Math.PI) + 90;
      if (angleDegrees < 0) {
        angleDegrees += 360;
      }
    }
    return angleDegrees;
  }

  private closenessToEdge(rect: DOMRect, x: number, y: number): number {
    const [cx, cy] = this.centerOfElement(rect);
    const dx = x - cx;
    const dy = y - cy;
    let k_x = Infinity;
    let k_y = Infinity;
    if (dx !== 0) {
      k_x = cx / Math.abs(dx);
    }
    if (dy !== 0) {
      k_y = cy / Math.abs(dy);
    }
    return this.clamp(1 / Math.min(k_x, k_y), 0, 1);
  }

  onPointerMove(e: MouseEvent) {
    if (!this.isStarred || !this.cardContainer) return;
    const el = this.cardContainer.nativeElement;
    const rect = el.getBoundingClientRect();

    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const perx = this.clamp((100 / rect.width) * px);
    const pery = this.clamp((100 / rect.height) * py);

    const [cx, cy] = this.centerOfElement(rect);
    const dx = px - cx;
    const dy = py - cy;

    const edge = this.closenessToEdge(rect, px, py);
    const angle = this.angleFromPointer(dx, dy);

    el.style.setProperty('--pointer-x', `${this.round(perx)}%`);
    el.style.setProperty('--pointer-y', `${this.round(pery)}%`);
    el.style.setProperty('--pointer-deg', `${this.round(angle)}deg`);
    el.style.setProperty('--pointer-d', `${this.round(edge * 100)}`);

    if (this.isAnimating()) {
      this.isAnimating.set(false);
      el.classList.remove('animating');
    }
  }

  onPointerLeave() {
    if (!this.cardContainer) return;
    const el = this.cardContainer.nativeElement;
    el.style.setProperty('--pointer-d', '0');
  }

  triggerIntroAnimation() {
    this.introTimer = setTimeout(() => {
      if (!this.cardContainer) return;
      const el = this.cardContainer.nativeElement;
      this.isAnimating.set(true);
      el.classList.add('animating');

      const angleStart = 110;
      const angleEnd = 465;
      el.style.setProperty('--pointer-deg', `${angleStart}deg`);

      const startTime = performance.now();

      const animate = (now: number) => {
        if (!this.isAnimating() || !el.classList.contains('animating')) return;

        const elapsed = now - startTime;

        if (elapsed > 300 && elapsed < 800) {
          const t = (elapsed - 300) / 500;
          const ease = 1 - Math.pow(1 - t, 3);
          el.style.setProperty('--pointer-d', `${ease * 100}`);
        }

        if (elapsed > 300 && elapsed < 1800) {
          const t = (elapsed - 300) / 1500;
          const ease = t * t * t;
          const d = (angleEnd - angleStart) * (ease * 0.5) + angleStart;
          el.style.setProperty('--pointer-deg', `${d}deg`);
        }

        if (elapsed >= 1800 && elapsed < 3500) {
          const t = (elapsed - 1800) / 1700;
          const ease = 1 - Math.pow(1 - t, 3);
          const d = (angleEnd - angleStart) * (0.5 + ease * 0.5) + angleStart;
          el.style.setProperty('--pointer-deg', `${d}deg`);
        }

        if (elapsed > 2500 && elapsed < 3800) {
          const t = (elapsed - 2500) / 1300;
          const ease = t * t * t;
          el.style.setProperty('--pointer-d', `${(1 - ease) * 100}`);
        }

        if (elapsed < 3800) {
          this.animFrameId = requestAnimationFrame(animate);
        } else {
          this.isAnimating.set(false);
          el.classList.remove('animating');
        }
      };

      this.animFrameId = requestAnimationFrame(animate);
    }, 400);
  }
}
