import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { TontineCalculationService } from './tontine-calculation.service';
import { ParameterService } from './parameter.service';
import { TontineMemberAmountHistoryRepository } from '../repositories/tontine-member-amount-history.repository';
import { TontineCollection, TontineMember, TontineSession } from 'src/app/models/tontine.model';

describe('TontineCalculationService', () => {
    let service: TontineCalculationService;
    let parameterService: MockedObject<ParameterService>;
    let historyRepo: MockedObject<TontineMemberAmountHistoryRepository>;
    const year = new Date().getFullYear();

    beforeEach(() => {
        parameterService = {
            getSocietyShareVersion: vi.fn().mockName("ParameterService.getSocietyShareVersion"),
            isEnabled: vi.fn().mockName("ParameterService.isEnabled")
        } as unknown as MockedObject<ParameterService>;
        historyRepo = {
            getByMemberId: vi.fn().mockName("TontineMemberAmountHistoryRepository.getByMemberId")
        } as unknown as MockedObject<TontineMemberAmountHistoryRepository>;
        parameterService.isEnabled.mockResolvedValue(false);
        historyRepo.getByMemberId.mockResolvedValue([]);

        TestBed.configureTestingModule({
            providers: [
                TontineCalculationService,
                { provide: ParameterService, useValue: parameterService },
                { provide: TontineMemberAmountHistoryRepository, useValue: historyRepo }
            ]
        });

        service = TestBed.inject(TontineCalculationService);
    });

    function member(): TontineMember {
        return {
            id: '1',
            tontineSessionId: 's1',
            clientId: 'c1',
            commercialUsername: 'com',
            totalContribution: 0,
            deliveryStatus: 'PENDING',
            registrationDate: `${year}-02-01T00:00:00`,
            isLocal: false,
            isSync: true,
            amount: 1000
        };
    }

    function session(): TontineSession {
        return {
            id: 's1',
            year,
            startDate: `${year}-02-01`,
            endDate: `${year}-11-30`,
            status: 'ACTIVE',
            memberCount: 1,
            totalCollected: 0,
            isSync: true
        };
    }

    function collection(id: string, date: string, amount: number, extras: Partial<TontineCollection> = {}): TontineCollection {
        return {
            id,
            tontineMemberId: '1',
            amount,
            collectionDate: date,
            isLocal: false,
            isSync: true,
            advanceToNextMonth: false,
            contributionMonth: `${date.substring(0, 7)}-01`,
            ...extras
        };
    }

    it('V1 does not charge skipped calendar months only through later collections the same way as V2', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V1');
        const collections = [
            collection('1', `${year}-03-15`, 5000),
            collection('2', `${year}-05-10`, 5000)
        ];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.version).toBe('V1');
        expect(status.societyShare).toBe(4000);
        expect(status.totalCollected).toBe(10000);
    });

    it('V2 only charges society share for months with collections', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V2');
        const collections = [
            collection('1', `${year}-03-15`, 5000),
            collection('2', `${year}-05-10`, 5000)
        ];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.societyShare).toBe(2000);
        expect(status.totalCollected).toBe(10000);
        expect(status.validatedMonths).toBe(0);
        expect(status.currentMonthDays).toBe(4);
    });

    it('V2 catch-up opens a past empty month', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V2');
        const collections = [
            collection('1', `${year}-03-15`, 5000),
            collection('2', `${year}-02-20`, 3000)
        ];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.societyShare).toBe(2000);
    });

    it('V2 keeps more than 31 days in the same month without the advance flag', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V2');
        const collections = [collection('1', `${year}-03-01`, 40000)];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.validatedMonths).toBe(1);
        expect(status.currentMonthDays).toBe(39);
    });

    it('V2 advanceToNextMonth moves surplus after 31 days', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V2');
        const collections = [
            collection('1', `${year}-03-01`, 32000),
            collection('2', `${year}-03-20`, 5000, { advanceToNextMonth: true })
        ];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.societyShare).toBe(2000);
        expect(status.collections[1].contributionMonth).toBe(`${year}-04-01`);
    });

    it('V2 first collection of a month takes min(amount, daily stake) then later collections fill the deficit', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V2');
        const collections = [
            collection('1', `${year}-03-01`, 400),
            collection('2', `${year}-03-10`, 2000)
        ];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.collections[0].societyShareAmount).toBe(400);
        expect(status.collections[1].societyShareAmount).toBe(600);
        expect(status.societyShare).toBe(1000);
    });

    it('marks the budget as an offline estimate when an unsynced collection is present', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V2');
        const collections = [
            collection('1', `${year}-03-15`, 5000, { isLocal: true, isSync: false })
        ];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.isOfflineEstimate).toBe(true);
    });

    it('V2 does not treat the budget as exact when contributionMonth is missing', async () => {
        parameterService.getSocietyShareVersion.mockResolvedValue('V2');
        const collections = [
            collection('1', `${year}-03-15`, 5000, { contributionMonth: undefined })
        ];

        const status = await service.calculateMemberStatus(member(), session(), collections);

        expect(status.isExact).toBe(false);
    });
});
