package com.optimize.elykia.core.service.tontine;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.DeliveryItemDto;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditArticles;
import com.optimize.elykia.core.entity.sale.CreditTimeline;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.entity.stock.TontineStockMovement;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineMemberFrequency;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.enumaration.TontineStockMovementType;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.repository.TontineStockMovementRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class TontineContributionDeliveryIntegrationTest extends IntegrationTestSupport {

    private static final String COLLECTOR = "commercial.tontine.chain";
    private static final String COLLECTION_REFERENCE = "COL-TONTINE-CHAIN-001";
    private static final String DELIVERY_REFERENCE = "LIV-TONTINE-CHAIN-001";
    private static final double DAILY_STAKE = 1_000.0;
    private static final double COLLECTION_AMOUNT = 31_000.0;
    private static final double EXPECTED_SOCIETY_SHARE = 8_000.0;
    private static final double EXPECTED_AVAILABLE_CONTRIBUTION = 23_000.0;

    @Autowired private TontineService tontineService;
    @Autowired private TontineDeliveryService tontineDeliveryService;
    @Autowired private ArticlesRepository articlesRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private TontineSessionRepository sessionRepository;
    @Autowired private TontineMemberRepository memberRepository;
    @Autowired private TontineCollectionRepository collectionRepository;
    @Autowired private TontineDeliveryRepository deliveryRepository;
    @Autowired private TontineStockRepository tontineStockRepository;
    @Autowired private TontineStockMovementRepository tontineStockMovementRepository;
    @Autowired private CreditRepository creditRepository;
    @Autowired private CreditArticlesRepository creditArticlesRepository;
    @Autowired private CreditTimelineRepository creditTimelineRepository;
    @Autowired private AccountingDayService accountingDayService;
    @Autowired private EntityManager entityManager;

    @MockBean private UserService userService;
    @MockBean private User currentUser;

    @Test
    void contributeThenDeliverTontine_persistsAllocationDeliveryCreditAndStockLedgerAsOneBusinessChain() {
        // Given: the only member of an active annual session has a daily stake and one tontine article available.
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(currentUser.getUsername()).thenReturn(COLLECTOR);
        when(currentUser.is("GESTIONNAIRE")).thenReturn(false);
        when(currentUser.is("ADMIN")).thenReturn(false);

        Client client = persistClient("client.tontine.chain");
        TontineSession session = persistActiveSession();
        TontineMember member = persistMember(session, client);
        Articles article = persistArticle("TONTINE-CHAIN-ARTICLE", 10, 15_000.0, 23_000.0);
        TontineStock tontineStock = persistTontineStock(article, 1, 23_000.0);
        accountingDayService.ensureAccountingReadyForOperations();
        TontineCollectionDto contribution = contribution(member.getId(), COLLECTION_REFERENCE, COLLECTION_AMOUNT);
        CreateDeliveryDto delivery = delivery(member.getId(), article.getId(), DELIVERY_REFERENCE, 23_000.0);

        // When: the same mobile contribution is replayed, then its available contribution is delivered to the member.
        tontineService.recordCollection(contribution);
        tontineService.recordCollection(contribution);
        tontineDeliveryService.distributeTontineDelivery(delivery);
        entityManager.clear();

        // Then: the contribution is idempotent and its V1 allocation updates member and session aggregates exactly once.
        List<TontineCollection> collections = collectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(member.getId(),
                com.optimize.common.entities.enums.State.ENABLED);
        assertEquals(1, collections.size());
        TontineCollection persistedCollection = collectionRepository.findByReference(COLLECTION_REFERENCE).orElseThrow();
        assertEquals(member.getId(), persistedCollection.getTontineMember().getId());
        assertEquals(COLLECTOR, persistedCollection.getCommercialUsername());
        assertEquals(COLLECTION_AMOUNT, persistedCollection.getAmount());
        assertEquals(EXPECTED_SOCIETY_SHARE, persistedCollection.getSocietyShareAmount());
        assertEquals(LocalDate.now().withDayOfMonth(1), persistedCollection.getContributionMonth());
        assertFalse(persistedCollection.getIsDeliveryCollection());

        TontineMember persistedMember = memberRepository.findByIdWithClient(member.getId()).orElseThrow();
        assertEquals(COLLECTION_AMOUNT, persistedMember.getTotalContribution());
        assertEquals(EXPECTED_SOCIETY_SHARE, persistedMember.getSocietyShare());
        assertEquals(EXPECTED_AVAILABLE_CONTRIBUTION, persistedMember.getAvailableContribution());
        assertEquals(0, persistedMember.getValidatedMonths());
        assertEquals(23, persistedMember.getCurrentMonthDays());
        assertEquals(TontineMemberDeliveryStatus.DELIVERED, persistedMember.getDeliveryStatus());

        TontineSession persistedSession = sessionRepository.findById(session.getId()).orElseThrow();
        assertEquals(EXPECTED_SOCIETY_SHARE, persistedSession.getTotalRevenue());
        assertEquals(TontineSessionStatus.ENDED, persistedSession.getStatus());

        // Then: the delivery consumes exactly the allocated available contribution and preserves its business reference.
        TontineDelivery persistedDelivery = deliveryRepository.findByTontineMemberId(member.getId()).orElseThrow();
        assertEquals(DELIVERY_REFERENCE, persistedDelivery.getReference());
        assertEquals(COLLECTOR, persistedDelivery.getCommercialUsername());
        assertEquals(EXPECTED_AVAILABLE_CONTRIBUTION, persistedDelivery.getTotalAmount());
        assertEquals(0.0, persistedDelivery.getRemainingBalance());
        assertEquals(1, persistedDelivery.getItems().size());
        assertEquals(article.getId(), persistedDelivery.getItems().iterator().next().getArticles().getId());
        assertEquals(1, persistedDelivery.getItems().iterator().next().getQuantity());
        assertEquals(EXPECTED_AVAILABLE_CONTRIBUTION, persistedDelivery.getItems().iterator().next().getUnitPrice());

        // Then: the delivery creates a settled tontine credit and exactly one accounting timeline as its payment evidence.
        Credit tontineCredit = creditRepository.findAll().stream()
                .filter(credit -> credit.getClient().getId().equals(client.getId()))
                .findFirst()
                .orElseThrow();
        assertEquals(CreditStatus.SETTLED, tontineCredit.getStatus());
        assertEquals(EXPECTED_AVAILABLE_CONTRIBUTION, tontineCredit.getTotalAmount());
        assertEquals(EXPECTED_AVAILABLE_CONTRIBUTION, tontineCredit.getTotalAmountPaid());
        assertEquals(0.0, tontineCredit.getTotalAmountRemaining());
        assertEquals(COLLECTOR, tontineCredit.getCollector());
        java.util.Set<CreditArticles> creditArticles = creditArticlesRepository.findByCredit_id(tontineCredit.getId());
        assertEquals(1, creditArticles.size());
        assertEquals(article.getId(), creditArticles.iterator().next().getArticles().getId());
        assertEquals(1, creditArticles.iterator().next().getQuantity());
        assertEquals(1, creditTimelineRepository.findByCredit_id(tontineCredit.getId()).size());
        CreditTimeline creditTimeline = creditTimelineRepository.findByCredit_id(tontineCredit.getId()).get(0);
        assertEquals(EXPECTED_AVAILABLE_CONTRIBUTION, creditTimeline.getAmount());
        assertEquals(COLLECTOR, creditTimeline.getCollector());
        assertNotNull(creditTimeline.getDailyAccountancy());

        // Then: only tontine stock is decremented; its ledger is linked to the delivery and the resulting credit.
        assertEquals(10, articlesRepository.findById(article.getId()).orElseThrow().getStockQuantity());
        TontineStock persistedStock = tontineStockRepository.findById(tontineStock.getId()).orElseThrow();
        assertEquals(1, persistedStock.getTotalQuantity());
        assertEquals(0, persistedStock.getAvailableQuantity());
        assertEquals(1, persistedStock.getDistributedQuantity());
        assertEquals(0, persistedStock.getQuantityReturned());
        assertEquals(23_000.0, persistedStock.getWeightedAverageUnitPrice());

        TontineStockMovement deliveryMovement = tontineStockMovementRepository.findAll().stream()
                .filter(movement -> movement.getMovementType() == TontineStockMovementType.TONTINE_DELIVERY)
                .filter(movement -> tontineCredit.getId().equals(movement.getCreditId()))
                .findFirst()
                .orElseThrow();
        assertEquals(persistedStock.getId(), deliveryMovement.getTontineStockId());
        assertEquals(article.getId(), deliveryMovement.getArticleId());
        assertEquals(COLLECTOR, deliveryMovement.getCollector());
        assertEquals(1, deliveryMovement.getQuantityBefore());
        assertEquals(1, deliveryMovement.getQuantityMoved());
        assertEquals(0, deliveryMovement.getQuantityAfter());
        assertEquals(tontineCredit.getReference(), deliveryMovement.getCreditReference());
        assertEquals(persistedDelivery.getId(), deliveryMovement.getTontineDeliveryId());
        assertEquals(DELIVERY_REFERENCE, deliveryMovement.getTontineDeliveryReference());
    }

    private TontineCollectionDto contribution(Long memberId, String reference, double amount) {
        TontineCollectionDto dto = new TontineCollectionDto();
        dto.setMemberId(memberId);
        dto.setAmount(amount);
        dto.setReference(reference);
        dto.setConfirmedAmount(amount);
        dto.setOperationConsentCode("consent-" + reference);
        dto.setSyncConsentCode("sync-" + reference);
        return dto;
    }

    private CreateDeliveryDto delivery(Long memberId, Long articleId, String reference, double unitPrice) {
        DeliveryItemDto item = new DeliveryItemDto();
        item.setArticleId(articleId);
        item.setQuantity(1);
        item.setUnitPrice(unitPrice);

        CreateDeliveryDto dto = new CreateDeliveryDto();
        dto.setTontineMemberId(memberId);
        dto.setReference(reference);
        dto.setRequestDate(LocalDateTime.now());
        dto.setItems(List.of(item));
        dto.setOperationConsentCode("consent-" + reference);
        dto.setSyncConsentCode("sync-" + reference);
        return dto;
    }

    private Client persistClient(String code) {
        Client client = new Client();
        client.setFirstname("Client");
        client.setLastname("Tontine Chain");
        client.setCode(code);
        client.setPhone("0700000456");
        client.setCollector(COLLECTOR);
        client.setTontineCollector(COLLECTOR);
        client.setClientType(ClientType.CLIENT);
        return clientRepository.saveAndFlush(client);
    }

    private TontineSession persistActiveSession() {
        TontineSession session = new TontineSession();
        session.setYear(LocalDate.now().getYear());
        session.setStartDate(LocalDate.of(LocalDate.now().getYear(), 1, 1));
        session.setEndDate(LocalDate.of(LocalDate.now().getYear(), 12, 31));
        session.setStatus(TontineSessionStatus.ACTIVE);
        session.setTotalRevenue(0.0);
        return sessionRepository.saveAndFlush(session);
    }

    private TontineMember persistMember(TontineSession session, Client client) {
        TontineMember member = new TontineMember();
        member.setTontineSession(session);
        member.setClient(client);
        member.setRegistrationDate(LocalDateTime.of(session.getStartDate(), java.time.LocalTime.NOON));
        member.setFrequency(TontineMemberFrequency.DAILY);
        member.setAmount(DAILY_STAKE);
        member.setTotalContribution(0.0);
        member.setSocietyShare(0.0);
        member.setAvailableContribution(0.0);
        member.setValidatedMonths(0);
        member.setCurrentMonthDays(0);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setCarnetVerified(false);

        TontineMemberAmountHistory amountHistory = new TontineMemberAmountHistory();
        amountHistory.setTontineMember(member);
        amountHistory.setAmount(DAILY_STAKE);
        amountHistory.setStartDate(session.getStartDate());
        member.getAmountHistory().add(amountHistory);

        return memberRepository.saveAndFlush(member);
    }

    private Articles persistArticle(String name, int warehouseQuantity, double purchasePrice, double creditSalePrice) {
        Articles article = new Articles();
        article.setName(name);
        article.setType("PACK");
        article.setMarque("Elykia");
        article.setModel("TONTINE-CHAIN");
        article.setStockQuantity(warehouseQuantity);
        article.setPurchasePrice(purchasePrice);
        article.setSellingPrice(20_000.0);
        article.setCreditSalePrice(creditSalePrice);
        return articlesRepository.saveAndFlush(article);
    }

    private TontineStock persistTontineStock(Articles article, int quantity, double unitPrice) {
        TontineStock stock = new TontineStock();
        stock.setCommercial(COLLECTOR);
        stock.setArticleId(article.getId());
        stock.setArticleName(article.getCommercialName());
        stock.setYear(LocalDate.now().getYear());
        stock.setTotalQuantity(quantity);
        stock.setAvailableQuantity(quantity);
        stock.setDistributedQuantity(0);
        stock.setQuantityReturned(0);
        stock.setUnitPrice(unitPrice);
        stock.setWeightedAverageUnitPrice(unitPrice);
        return tontineStockRepository.saveAndFlush(stock);
    }
}
