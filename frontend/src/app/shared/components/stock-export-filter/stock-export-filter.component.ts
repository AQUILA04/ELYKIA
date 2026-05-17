import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { User } from 'src/app/user/service/user.service';
import * as moment from 'moment';

export interface ExportFilter {
    startDate: string;
    endDate: string;
    collector: string | null;
}

export interface MonthOption {
    value: string;
    label: string;
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

@Component({
    selector: 'app-stock-export-filter',
    templateUrl: './stock-export-filter.component.html',
    styleUrls: ['./stock-export-filter.component.scss']
})
export class StockExportFilterComponent implements OnInit {

    @Input() canSelectPromoter: boolean = false;
    @Input() promoters: User[] = [];

    @Output() export = new EventEmitter<ExportFilter>();

    isExpanded: boolean = false;
    selectedPeriod: string = 'WEEK';
    selectedCollector: string | null = null;
    loading: boolean = false;

    previousMonths: MonthOption[] = [];

    constructor() { }

    ngOnInit(): void {
        this.generatePreviousMonths();
    }

    private generatePreviousMonths() {
        const currentMonth = moment().month();
        const currentYear = moment().year();

        if (currentMonth === 0) {
            this.previousMonths.push({
                value: `PREV_MONTH_${currentYear - 1}_12`,
                label: 'Mois passé'
            });
        } else {
            for (let m = 0; m < currentMonth; m++) {
                this.previousMonths.push({
                    value: `PREV_MONTH_${currentYear}_${m + 1}`,
                    label: `${MONTH_NAMES[m]} ${currentYear}`
                });
            }
        }
    }

    toggleExpand() {
        this.isExpanded = !this.isExpanded;
    }

    onExport() {
        let startDate: string;
        let endDate: string = moment().format('YYYY-MM-DD');

        if (this.selectedPeriod === 'TODAY') {
            startDate = moment().format('YYYY-MM-DD');
        } else if (this.selectedPeriod === 'WEEK') {
            startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
        } else if (this.selectedPeriod === 'MONTH') {
            startDate = moment().startOf('month').format('YYYY-MM-DD');
        } else if (this.selectedPeriod.startsWith('PREV_MONTH_')) {
            const parts = this.selectedPeriod.split('_');
            const year = parseInt(parts[2]);
            const month = parseInt(parts[3]);
            const date = moment().year(year).month(month - 1);
            startDate = date.startOf('month').format('YYYY-MM-DD');
            endDate = date.endOf('month').format('YYYY-MM-DD');
        } else {
            startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
        }

        this.export.emit({
            startDate,
            endDate,
            collector: this.selectedCollector
        });
    }
}
