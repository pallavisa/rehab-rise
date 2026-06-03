import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" [attr.stroke-width]="stroke" stroke-linecap="round"
         stroke-linejoin="round" [style.display]="'block'">
      <ng-container [ngSwitch]="name">
        <ng-container *ngSwitchCase="'arrow'"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></ng-container>
        <ng-container *ngSwitchCase="'check'"><path d="M4 12.5l5 5L20 6.5"/></ng-container>
        <ng-container *ngSwitchCase="'calendar'"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2.5v4M16 2.5v4"/></ng-container>
        <ng-container *ngSwitchCase="'clock'"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></ng-container>
        <ng-container *ngSwitchCase="'video'"><rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10l6-3.5v11l-6-3.5"/></ng-container>
        <ng-container *ngSwitchCase="'leaf'"><path d="M4 20C4 11 11 4 20 4c0 9-7 16-16 16z"/><path d="M4 20c4-7 8-10 13-12"/></ng-container>
        <ng-container *ngSwitchCase="'dumbbell'"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></ng-container>
        <ng-container *ngSwitchCase="'spark'"><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></ng-container>
        <ng-container *ngSwitchCase="'user'"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></ng-container>
        <ng-container *ngSwitchCase="'chevron'"><path d="M9 6l6 6-6 6"/></ng-container>
        <ng-container *ngSwitchCase="'chevronL'"><path d="M15 6l-6 6 6 6"/></ng-container>
        <ng-container *ngSwitchCase="'close'"><path d="M6 6l12 12M18 6L6 18"/></ng-container>
        <ng-container *ngSwitchCase="'mail'"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/></ng-container>
        <ng-container *ngSwitchCase="'phone'"><path d="M6 3h3l2 5-2.5 1.5a12 12 0 005 5L16 12l5 2v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z"/></ng-container>
        <ng-container *ngSwitchCase="'shield'"><path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6z"/></ng-container>
        <ng-container *ngSwitchCase="'grid'"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></ng-container>
        <ng-container *ngSwitchCase="'file'"><path d="M6 2.5h8l4 4V21a1 1 0 01-1 1H6a1 1 0 01-1-1V3.5a1 1 0 011-1z"/><path d="M14 2.5V7h4"/></ng-container>
        <ng-container *ngSwitchCase="'download'"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></ng-container>
        <ng-container *ngSwitchCase="'chart'"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></ng-container>
        <ng-container *ngSwitchCase="'logout'"><path d="M14 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 12h10M16 8l4 4-4 4"/></ng-container>
        <ng-container *ngSwitchCase="'card'"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19"/></ng-container>
        <ng-container *ngSwitchCase="'bell'"><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0"/></ng-container>
        <ng-container *ngSwitchCase="'play'"><path d="M7 4.5l12 7.5-12 7.5z"/></ng-container>
        <ng-container *ngSwitchCase="'target'"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/></ng-container>
        <ng-container *ngSwitchCase="'flame'"><path d="M12 3c1 4-3 5-3 9a3 3 0 006 0c0-1.5-.6-2.4-1-3 .4 3-2 3-2 1 0-1.4 0-3 3-7z"/><path d="M9 12a3 3 0 006 0"/></ng-container>
        <ng-container *ngSwitchCase="'plus'"><path d="M12 5v14M5 12h14"/></ng-container>
      </ng-container>
    </svg>
  `,
})
export class IconComponent {
  @Input() name = '';
  @Input() size = 20;
  @Input() stroke = 1.6;
}
