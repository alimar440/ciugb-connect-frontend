import { Component, input } from '@angular/core';
import {
  LucideAngularModule,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Ticket,
  CreditCard,
  QrCode,
  ScanLine,
  Popcorn,
  CalendarDays,
  MapPin,
  Menu,
  X,
  Download,
  ShieldCheck,
  Users,
  Clapperboard,
  Terminal,
  CircleCheck,
  CircleAlert,
  Search,
  Plus,
  Minus,
  LayoutDashboard,
  Sun,
  Moon,
} from 'lucide-angular';
const ICONS = {
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Ticket,
  CreditCard,
  QrCode,
  ScanLine,
  Popcorn,
  CalendarDays,
  MapPin,
  Menu,
  X,
  Download,
  ShieldCheck,
  Users,
  Clapperboard,
  Terminal,
  CircleCheck,
  CircleAlert,
  Search,
  Plus,
  Minus,
  LayoutDashboard,
  Sun,
  Moon,
};
export type IconName = keyof typeof ICONS;
@Component({
  selector: 'app-icon',
  imports: [LucideAngularModule],
  template:
    '<lucide-icon [img]="icons[name()]" [size]="size()" [strokeWidth]="1.7" aria-hidden="true" />',
  styles:
    ':host { display: inline-flex; flex-shrink: 0; vertical-align: middle; }',
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly icons = ICONS;
}
