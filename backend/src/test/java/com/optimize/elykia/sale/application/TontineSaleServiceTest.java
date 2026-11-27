package com.optimize.elykia.sale.application;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.api.CreditRecoveryUseCase;
import com.optimize.elykia.sale.api.RecordRecoveryCommand;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.RecoverySource;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineSaleServiceTest {

    @Mock private CreditRepository creditRepository;
    @Mock private CreditArticlesService creditArticlesService;
    @Mock private SalePostStartPublisher postStartPublisher;
    @Mock private CreditRecoveryUseCase creditRecoveryUseCase;

    @Test
    void createTontineSale_generatesReferenceRunsCallbacksAndRecordsInitialRecovery() {
        TontineSaleService service = new TontineSaleService(
                creditRepository, creditArticlesService, postStartPublisher, creditRecoveryUseCase);

        Client client = new Client();
        client.setId(8L);
        client.setClientType(ClientType.CLIENT);
        client.setCollector("COM005");

        CreditArticles line = new CreditArticles();
        line.setId(100L);
        line.setTontineItemId(200L);
        line.setQuantity(2);
        line.setUnitPrice(3_000.0);

        Credit credit = Credit.newTontineSale(client, "COM005", 6_000.0, 4_500.0, Set.of(line), LocalDate.now());
        when(creditRepository.save(any(Credit.class))).thenAnswer(inv -> {
            Credit saved = inv.getArgument(0);
            saved.setId(77L);
            return saved;
        });

        AtomicBoolean beforeCalled = new AtomicBoolean(false);
        AtomicBoolean afterCalled = new AtomicBoolean(false);

        CreditRespDto resp = service.createTontineSale(
                credit,
                "8",
                () -> beforeCalled.set(true),
                saved -> afterCalled.set(saved.getId().equals(77L)));

        assertTrue(beforeCalled.get());
        assertTrue(afterCalled.get());
        assertEquals(77L, resp.id());
        assertEquals(CreditStatus.SETTLED, resp.status());
        assertTrue(resp.reference().startsWith("TC"));

        verify(postStartPublisher).publishAfterStart(credit);
        verify(creditArticlesService).create(line);
        verify(creditArticlesService).update(line);

        ArgumentCaptor<RecordRecoveryCommand> commandCaptor = ArgumentCaptor.forClass(RecordRecoveryCommand.class);
        verify(creditRecoveryUseCase).recordInitialSaleRecovery(eq(credit), commandCaptor.capture());
        assertEquals(6_000.0, commandCaptor.getValue().amount());
        assertEquals("COM005", commandCaptor.getValue().collector());
        assertEquals(RecoverySource.INITIAL_SALE, commandCaptor.getValue().source());
    }
}
