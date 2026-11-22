import type { MockedObject } from "vitest";
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ParameterService } from './parameter.service';
import { ParameterRepository } from '../repositories/parameter.repository';
import { environment } from 'src/environments/environment';

describe('ParameterService', () => {
    let service: ParameterService;
    let httpMock: HttpTestingController;
    let repository: MockedObject<ParameterRepository>;

    beforeEach(() => {
        repository = {
            saveAll: vi.fn().mockName("ParameterRepository.saveAll"),
            getByKey: vi.fn().mockName("ParameterRepository.getByKey")
        } as unknown as MockedObject<ParameterRepository>;
        repository.saveAll.mockResolvedValue(undefined);

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                provideHttpClientTesting(),
                ParameterService,
                { provide: ParameterRepository, useValue: repository }
            ]
        });

        service = TestBed.inject(ParameterService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('defaults an absent or invalid society share version to V1', async () => {
        repository.getByKey.mockResolvedValue(null);
        await expect(service.getSocietyShareVersion()).resolves.toEqual('V1');

        repository.getByKey.mockResolvedValue('nope');
        await expect(service.getSocietyShareVersion()).resolves.toEqual('V1');
    });

    it('reads V2 from the last locally stored parameter', async () => {
        repository.getByKey.mockResolvedValue('v2');
        await expect(service.getSocietyShareVersion()).resolves.toEqual('V2');
    });

    it('awaits SQLite persistence before completing initializeParameters', async () => {
        let saved = false;
        repository.saveAll.mockImplementation(async () => {
            saved = true;
        });

        const promise = firstValueFrom(service.initializeParameters());

        const req = httpMock.expectOne(`${environment.apiUrl}/api/parameters/all`);
        req.flush([
            { key: 'TONTINE_SOCIETY_SHARE_VERSION', value: 'V2' }
        ]);

        const ok = await promise;
        expect(ok).toBe(true);
        expect(saved).toBe(true);
        expect(repository.saveAll).toHaveBeenCalled();
    });
});
