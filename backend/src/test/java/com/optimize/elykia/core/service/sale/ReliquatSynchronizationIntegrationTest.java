package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.CollectorDailyStakeDto;
import com.optimize.elykia.core.dto.DefaultDailyStakeUnitDto;
import com.optimize.elykia.core.entity.sale.ClientReliquat;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.ClientReliquatRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class ReliquatSynchronizationIntegrationTest extends IntegrationTestSupport {

    @Autowired private CreditTimelineService creditTimelineService;
    @Autowired private ClientRepository clientRepository;
    @Autowired private CreditRepository creditRepository;
    @Autowired private CreditTimelineRepository timelineRepository;
    @Autowired private ClientReliquatRepository reliquatRepository;
    @Autowired private EntityManager entityManager;

    @Test
    void syncDailyStakes_accumulatesThenConsumesReliquatAndKeepsRepeatedRecoveryIdIdempotent() {
        // Given: a client with an active credit that can receive two normal daily stakes
        Client client = persistClient("client.reliquat");
        Credit credit = persistActiveCredit(client, "CR-REL-CHAIN-001", "commercial.reliquat");
        CollectorDailyStakeDto firstSync = sync(credit.getId(), "REC-REL-CHAIN-001", 50.0, 0.0);
        CollectorDailyStakeDto secondSync = sync(credit.getId(), "REC-REL-CHAIN-002", 0.0, 20.0);

        // When: the first sync generates a reliquat, the second consumes part of it, then the same recovery is replayed
        creditTimelineService.defaultDailyStakeByCollector(firstSync);
        creditTimelineService.defaultDailyStakeByCollector(secondSync);
        creditTimelineService.defaultDailyStakeByCollector(secondSync);
        entityManager.clear();

        // Then: only two mobile references are persisted and the credit reflects the two real payments exactly once
        List<CreditTimeline> timelines = timelineRepository.findByCredit_id(credit.getId());
        assertEquals(2, timelines.size());
        CreditTimeline generatedTimeline = timelineRepository.findByReference("REC-REL-CHAIN-001").orElseThrow();
        assertEquals(10.0, generatedTimeline.getAmount());
        assertEquals(50.0, generatedTimeline.getReliquatGeneratedAmount());
        assertEquals(0.0, generatedTimeline.getReliquatUsedAmount());
        assertNotNull(generatedTimeline.getDailyAccountancy());
        CreditTimeline consumedTimeline = timelineRepository.findByReference("REC-REL-CHAIN-002").orElseThrow();
        assertEquals(10.0, consumedTimeline.getAmount());
        assertEquals(0.0, consumedTimeline.getReliquatGeneratedAmount());
        assertEquals(20.0, consumedTimeline.getReliquatUsedAmount());
        assertEquals(generatedTimeline.getDailyAccountancy().getId(), consumedTimeline.getDailyAccountancy().getId());

        Credit persistedCredit = creditRepository.findById(credit.getId()).orElseThrow();
        assertEquals(20.0, persistedCredit.getTotalAmountPaid());
        assertEquals(80.0, persistedCredit.getTotalAmountRemaining());
        assertEquals(8, persistedCredit.getRemainingDaysCount());
        assertEquals(CreditStatus.INPROGRESS, persistedCredit.getStatus());

        ClientReliquat reliquat = reliquatRepository.findByClientId(client.getId()).orElseThrow();
        assertEquals(30.0, reliquat.getTotalAmount());
        assertEquals("REC-REL-CHAIN-002", reliquat.getLastRecoveryId());
        assertEquals(2, timelineRepository.findByCredit_id(credit.getId()).size());
        assertTrue(timelineRepository.existsByReference("REC-REL-CHAIN-002"));
    }

    private CollectorDailyStakeDto sync(Long creditId, String recoveryId, double generated, double used) {
        DefaultDailyStakeUnitDto unit = new DefaultDailyStakeUnitDto();
        unit.setCreditId(creditId);
        unit.setRecoveryId(recoveryId);
        unit.setReliquatGeneratedAmount(generated);
        unit.setReliquatUsedAmount(used);
        unit.setOperationConsentCode("consent-" + recoveryId);
        unit.setConfirmedAmount(10.0);
        CollectorDailyStakeDto dto = new CollectorDailyStakeDto();
        dto.setCollector("commercial.reliquat");
        dto.setSyncConsentCode("sync-reliquat-001");
        dto.setStakeUnits(List.of(unit));
        return dto;
    }

    private Client persistClient(String code) {
        Client client = new Client();
        client.setFirstname("Client");
        client.setLastname("Reliquat");
        client.setCode(code);
        client.setPhone("0700000000");
        client.setCollector("commercial.reliquat");
        client.setClientType(ClientType.CLIENT);
        client.setCreditInProgress(true);
        return clientRepository.saveAndFlush(client);
    }

    private Credit persistActiveCredit(Client client, String reference, String collector) {
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
