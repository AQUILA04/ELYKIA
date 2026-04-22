import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CreditEcheanceDTO, CreditCalendarDayDTO } from 'src/app/credit/models/credit-echeance.model';

interface WeekDay {
  label: string;
  date: Date;
  count: number;
  hasUrgent: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-credit-echeance-calendar',
  templateUrl: './credit-echeance-calendar.component.html',
  styleUrls: ['./credit-echeance-calendar.component.scss'],
  standalone: false
})
export class CreditEcheanceCalendarComponent implements OnInit {
  @Input() credits: CreditEcheanceDTO[] = [];
  @Input() selectedPeriod: string = 'week';
  @Input() selectedDate: string = '';
  @Input() collector: string = '';

  @Output() daySelected = new EventEmitter<string>();

  weekDays: WeekDay[] = [];
  weekLabel: string = '';
  currentWeekStart: Date = new Date();
  activeDateStr: string = '';

  ngOnInit() {
    this.initWeek(new Date());
  }

  ngOnChanges() {
    this.buildWeekDays();
  }

  private initWeek(refDate: Date) {
    // Lundi de la semaine contenant refDate
    const day = refDate.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    this.currentWeekStart = new Date(refDate);
    this.currentWeekStart.setDate(refDate.getDate() + diff);
    this.buildWeekDays();
  }

  buildWeekDays() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: WeekDay[] = [];
    const labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(this.currentWeekStart);
      d.setDate(this.currentWeekStart.getDate() + i);
      const dateStr = this.toIsoDate(d);
      const dayCredits = this.credits.filter(c => c.expectedEndDate === dateStr);
      days.push({
        label: labels[i],
        date: d,
        count: dayCredits.length,
        hasUrgent: dayCredits.some(c => !c.settled),
        isToday: d.getTime() === today.getTime()
      });
    }
    this.weekDays = days;

    const start = this.weekDays[0]?.date;
    const end   = this.weekDays[6]?.date;
    if (start && end) {
      this.weekLabel = `${this.formatShort(start)} – ${this.formatShort(end)}`;
    }
  }

  shiftWeek(dir: number) {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + dir * 7);
    this.currentWeekStart = new Date(this.currentWeekStart);
    this.buildWeekDays();
  }

  selectDay(day: WeekDay) {
    this.activeDateStr = this.toIsoDate(day.date);
    this.daySelected.emit(this.activeDateStr);
  }

  isActiveDay(day: WeekDay): boolean {
    return this.toIsoDate(day.date) === this.activeDateStr;
  }

  private toIsoDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatShort(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
