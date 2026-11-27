package com.optimize.elykia.sale.web;

import com.optimize.common.entities.util.Response;
import com.optimize.elykia.sale.api.BatchRecoveryResult;
import com.optimize.elykia.sale.api.CreditRecoveryUseCase;
import com.optimize.elykia.sale.api.FormerPortfolioCreditPort;
import com.optimize.elykia.sale.api.RecordRecoveryBatchCommand;
import com.optimize.elykia.sale.api.RecordRecoveryCommand;
import com.optimize.elykia.sale.api.SalePdfExportPort;
import com.optimize.elykia.sale.application.CreditArticlesService;
import com.optimize.elykia.sale.application.CreditCarnetVerificationService;
import com.optimize.elykia.sale.application.CreditFieldControlService;
import com.optimize.elykia.sale.application.CreditListSummaryService;
import com.optimize.elykia.sale.application.CreditReturnHistoryService;
import com.optimize.elykia.sale.application.CreditService;
import com.optimize.elykia.sale.application.CreditTimelineService;
import com.optimize.elykia.sale.domain.CreditTimeline;
import com.optimize.elykia.sale.domain.RecoverySource;
import com.optimize.elykia.sale.web.dto.CreditTimelineDto;
import com.optimize.elykia.sale.web.dto.SpecialDailyStakeResponseDto;
import com.optimize.elykia.sale.web.dto.UnifiedRecoveryBatchDto;
import com.optimize.elykia.sale.web.dto.UnifiedRecoveryUnitDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests unitaires de l'adapter REST {@link CreditController} pour les endpoints de recouvrement unifiés.
 */
@ExtendWith(MockitoExtension.class)
class CreditControllerRecoveryBatchTest {

    @Mock private CreditService creditService;
    @Mock private FormerPortfolioCreditPort formerPortfolioService;
    @Mock private CreditTimelineService creditTimelineService;
    @Mock private CreditRecoveryUseCase creditRecoveryUseCase;
    @Mock private SalePdfExportPort salePdfExportPort;
    @Mock private CreditReturnHistoryService creditReturnHistoryService;
    @Mock private CreditArticlesService creditArticlesService;
    @Mock private CreditListSummaryService creditListSummaryService;
    @Mock private CreditFieldControlService creditFieldControlService;
    @Mock private CreditCarnetVerificationService creditCarnetVerificationService;

    private CreditController controller;

    @BeforeEach
    void setUp() {
        controller = new CreditController(
                creditService,
                formerPortfolioService,
                creditTimelineService,
                creditRecoveryUseCase,
                salePdfExportPort,
                creditReturnHistoryService,
                creditArticlesService,
                creditListSummaryService,
                creditFieldControlService,
                creditCarnetVerificationService
        );
    }

    @Test
    void recordRecoveryBatch_delegatesToUseCaseAndMapsResponse() {
        UnifiedRecoveryUnitDto u1 = new UnifiedRecoveryUnitDto();
        u1.setCreditId(10L);
        u1.setClientId(1L);
        u1.setAmount(500.0);
        u1.setRecoveryId("TFJ-10-1");

        UnifiedRecoveryUnitDto u2 = new UnifiedRecoveryUnitDto();
        u2.setCreditId(11L);
        u2.setClientId(2L);
        u2.setAmount(1500.0);
        u2.setRecoveryId("TFJ-11-2");

        UnifiedRecoveryBatchDto batchDto = new UnifiedRecoveryBatchDto();
        batchDto.setCollector("COM001");
        batchDto.setSource("WEB_TFJ_BATCH");
        batchDto.setRecoveries(List.of(u1, u2));

        when(creditRecoveryUseCase.recordRecoveryBatch(any())).thenReturn(new BatchRecoveryResult(
                List.of("TFJ-10-1"),
                List.of(new BatchRecoveryResult.FailedRecoveryItem("TFJ-11-2", "Montant dépassé"))
        ));

        ResponseEntity<Response> response = controller.recordRecoveryBatch(batchDto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        SpecialDailyStakeResponseDto payload = (SpecialDailyStakeResponseDto) response.getBody().getData();
        assertEquals(List.of("TFJ-10-1"), payload.getSuccessRecoveryIds());
        assertEquals(1, payload.getFailedRecoveries().size());
        assertEquals("TFJ-11-2", payload.getFailedRecoveries().get(0).getRecoveryId());

        ArgumentCaptor<RecordRecoveryBatchCommand> captor = ArgumentCaptor.forClass(RecordRecoveryBatchCommand.class);
        verify(creditRecoveryUseCase).recordRecoveryBatch(captor.capture());
        RecordRecoveryBatchCommand sent = captor.getValue();
        assertEquals("COM001", sent.collector());
        assertFalse(sent.ignoreMissingOrClosedCredit());
        assertEquals(2, sent.items().size());
        assertEquals(RecoverySource.WEB_TFJ_BATCH, sent.items().get(0).source());
        assertEquals(500.0, sent.items().get(0).amount());
        assertEquals(1500.0, sent.items().get(1).amount());
    }

    @Test
    void dailyStake_delegatesToRecordRecoveryWithWebSingleSource() {
        CreditTimelineDto dto = new CreditTimelineDto();
        dto.setCreditId(5L);
        dto.setAmount(750.0);
        dto.setCollector("COM002");
        dto.setReference("WEB-5");

        CreditTimeline created = new CreditTimeline();
        created.setId(88L);
        when(creditRecoveryUseCase.recordRecovery(any())).thenReturn(created);

        ResponseEntity<Response> response = controller.dailyStake(dto);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        ArgumentCaptor<RecordRecoveryCommand> captor = ArgumentCaptor.forClass(RecordRecoveryCommand.class);
        verify(creditRecoveryUseCase).recordRecovery(captor.capture());
        assertEquals(5L, captor.getValue().creditId());
        assertEquals(750.0, captor.getValue().amount());
        assertEquals(RecoverySource.WEB_SINGLE, captor.getValue().source());
    }
}
