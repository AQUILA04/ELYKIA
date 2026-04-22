import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { User } from 'src/app/user/service/user.service';
import * as moment from 'moment';

export interface ExportFilter {
    startDate: string;
    endDate: string;
    collector: string | null;
}

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

    constructor() { }

    ngOnInit(): void {
    }

    toggleExpand() {
        this.isExpanded = !this.isExpanded;
    }

    onExport() {
        let startDate: string;
        let endDate: string = moment().format('YYYY-MM-DD');

        switch (this.selectedPeriod) {
            case 'TODAY':
                startDate = moment().format('YYYY-MM-DD');
                break;
            case 'WEEK':
                startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
                break;
            case 'MONTH':
                startDate = moment().startOf('month').format('YYYY-MM-DD');
                break;
            default:
                startDate = moment().startOf('isoWeek').format('YYYY-MM-DD');
        }

        this.export.emit({
            startDate,
            endDate,
            collector: this.selectedCollector
        });
    }
}
