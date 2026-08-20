package com.optimize.elykia.core.service.accounting;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.CollectorDailyStakeDto;
import com.optimize.elykia.core.dto.DefaultDailyStakeUnitDto;
import com.optimize.elykia.core.entity.accounting.DailyAccounting;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.enumaration.AccountingDayStatus;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.service.sale.CreditTimelineService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
class DailyAccountingCloseIntegrationTest extends IntegrationTestSupport {

    @Autowired private CreditTimelineService creditTimelineService;
    @Autowired private DailyAccountingService dailyAccountingService;
    @Autowired private ClientRepository clientRepository;
    @Autowired private CreditRepository creditRepository;
    @Autowired private CreditTimelineRepository timelineRepository;
    @Autowired private EntityManager entityManager;

    @Test
    void closeDailyAccounting_totalsOnlyPersistedPaymentsAndDoesNotAddReliquatAmountsTwice() {
        // Given: the current day may already contain committed payments; retain its baseline before this flow
        LocalDate accountingDate = LocalDate.now();
        double baselineCollected = amountOrZero(timelineRepository.sumAmountByDate(
                accountingDate.atStartOfDay(), accountingDate.atTime(23, 59, 59)));
        Client client = persistClient("client.accounting.close");
        Credit credit = persistCredit(client, "CR-ACC-CHAIN-001", "commercial.accounting");

        // When: two payments of ten are synced, with a generated reliquat that must not become a second payment
        creditTimelineService.defaultDailyStakeByCollector(sync(credit.getId(), "REC-ACC-CHAIN-001", 25.0, 0.0));
        creditTimelineService.defaultDailyStakeByCollector(sync(credit.getId(), "REC-ACC-CHAIN-002", 0.0, 10.0));
        DailyAccounting closed = dailyAccountingService.closeDailyAccounting(accountingDate);
        entityManager.clear();

        // Then: the accounting day is closed with exactly the two payment amounts in addition to its pre-existing baseline
        assertNotNull(closed);
        DailyAccounting persistedDay = dailyAccountingService.getByAccountingDate(accountingDate);
        assertEquals(AccountingDayStatus.OLD, persistedDay.getStatus());
        assertEquals(baselineCollected + 20.0, persistedDay.getTotalAmount());
        assertEquals(20.0, creditRepository.findById(credit.getId()).orElseThrow().getTotalAmountPaid());
        assertEquals(80.0, creditRepository.findById(credit.getId()).orElseThrow().getTotalAmountRemaining());
        assertEquals(2, timelineRepository.findByCredit_id(credit.getId()).size());
        assertEquals(25.0, timelineRepository.findByReference("REC-ACC-CHAIN-001").orElseThrow().getReliquatGeneratedAmount());
        assertEquals(10.0, timelineRepository.findByReference("REC-ACC-CHAIN-002").orElseThrow().getReliquatUsedAmount());
    }

    private double amountOrZero(Double amount) {
        return amount != null ? amount : 0.0;
    }

    private CollectorDailyStakeDto sync(Long creditId, String recoveryId, double generated, double used) {
        DefaultDailyStakeUnitDto unit = new DefaultDailyStakeUnitDto();
        unit.setCreditId(creditId);
        unit.setRecoveryId(recoveryId);
        unit.setReliquatGeneratedAmount(generated);
        unit.setReliquatUsedAmount(used);
        unit.setConfirmedAmount(10.0);
        CollectorDailyStakeDto dto = new CollectorDailyStakeDto();
        dto.setCollector("commercial.accounting");
        dto.setStakeUnits(List.of(unit));
        return dto;
    }

    private Client persistClient(String code) {
        Client client = new Client();
        client.setFirstname("Client");
        client.setLastname("Comptabilite");
        client.setCode(code);
        client.setPhone("0700000011");
        client.setCollector("commercial.accounting");
        client.setClientType(ClientType.CLIENT);
        client.setCreditInProgress(true);
        return clientRepository.saveAndFlush(client);
    }

    private Credit persistCredit(Client client, String reference, String collector) {
        Credit credit = new Credit();
        credit.setClient(client);
        credit.setReference(reference);
        credit.setCollector(collector);
        credit.setType(OperationType.CREDIT);
        credit.setClientType(ClientType.CLIENT);
        credit.setStatus(CreditStatus.INPROGRESS);
        credit.setBeginDate(LocalDate.now().minusDays(2));
        credit.setExpectedEndDate(LocalDate.now().plusDays(8));
        credit.setTotalAmount(100.0);
        credit.setTotalPurchase(70.0);
        credit.setTotalAmountPaid(0.0);
        credit.setTotalAmountRemaining(100.0);
        credit.setDailyStake(10.0);
        credit.setRemainingDaysCount(10);
        credit.setMobileFinancialTermsLocked(true);
        return creditRepository.saveAndFlush(credit);
    }
}
