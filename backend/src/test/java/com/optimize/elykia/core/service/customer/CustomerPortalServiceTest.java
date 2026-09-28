package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.core.dto.TontineMemberDto;
import com.optimize.elykia.core.dto.TontineMemberRespDto;
import com.optimize.elykia.core.dto.customer.CustomerArticleDto;
import com.optimize.elykia.core.dto.customer.CustomerArticleTypeDto;
import com.optimize.elykia.core.dto.customer.CustomerMobileMoneyRecipientDto;
import com.optimize.elykia.core.dto.customer.CustomerTontineInitialPaymentRequest;
import com.optimize.elykia.core.dto.customer.CustomerTontineJoinRequest;
import com.optimize.elykia.core.dto.customer.CustomerTontineJoinResponse;
import com.optimize.elykia.core.dto.customer.CustomerTontineSessionDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.customer.CustomerTontineMmSubmission;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.CustomerSubmissionStatus;
import com.optimize.elykia.core.enumaration.TontineMemberFrequency;
import com.optimize.elykia.core.enumaration.TontineMemberRegistrationSource;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.CreditArticlesRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.repository.customer.CustomerMobileMoneySubmissionRepository;
import com.optimize.elykia.core.service.order.OrderService;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.tontine.TontineService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerPortalServiceTest {

    @Mock private CustomerContextService contextService;
    @Mock private CreditRepository creditRepository;
    @Mock private CreditTimelineRepository creditTimelineRepository;
    @Mock private CustomerMobileMoneySubmissionRepository submissionRepository;
    @Mock private ArticlesService articlesService;
    @Mock private OrderService orderService;
    @Mock private CreditArticlesRepository creditArticlesRepository;
    @Mock private TontineMemberRepository tontineMemberRepository;
    @Mock private TontineCollectionRepository tontineCollectionRepository;
    @Mock private TontineSessionRepository tontineSessionRepository;
    @Mock private TontineService tontineService;
    @Mock private CommercialMobileMoneyConfigService commercialMobileMoneyConfigService;
    @Mock private com.optimize.elykia.core.service.notification.AppNotificationService appNotificationService;
    @Mock private com.optimize.elykia.core.repository.customer.CustomerTontineMmSubmissionRepository tontineMmSubmissionRepository;
    @Mock private CustomerOnboardingService onboardingService;

    private Client activeClient;

    @BeforeEach
    void stubActiveClient() {
        activeClient = new Client();
        activeClient.setId(1L);
        activeClient.setFirstname("Afi");
        activeClient.setLastname("Koffi");
        activeClient.setActivationStatus(ClientActivationStatus.ACTIVE);
        activeClient.setTontineCollector("COM_TONTINE");
        activeClient.setCollector("COM001");
        when(contextService.currentUsername()).thenReturn("90123456");
        when(contextService.requireClient("90123456")).thenReturn(activeClient);
        doNothing().when(onboardingService).assertPortalFeatureAllowed(any(Client.class));
    }

    @Test
    void getCurrentTontineSession_returnsUnavailableWhenNoSession() {
        int year = LocalDate.now().getYear();
        when(tontineSessionRepository.findByYear(year)).thenReturn(Optional.empty());

        CustomerTontineSessionDto dto = service().getCurrentTontineSession();

        assertFalse(dto.isAvailable());
        assertFalse(dto.isJoinable());
        assertEquals(100.0, dto.getMinDailyStake());
        verify(tontineSessionRepository).findByYear(year);
        verify(tontineSessionRepository, never()).save(any());
    }

    @Test
    void getCurrentTontineSession_closedSessionNotJoinable() {
        int year = LocalDate.now().getYear();
        TontineSession session = activeSession(year);
        session.setStatus(TontineSessionStatus.CLOSED);
        when(tontineSessionRepository.findByYear(year)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSession_YearAndClient_Id(year, 1L)).thenReturn(Optional.empty());

        CustomerTontineSessionDto dto = service().getCurrentTontineSession();

        assertTrue(dto.isAvailable());
        assertFalse(dto.isJoinable());
        assertEquals("CLOSED", dto.getStatus());
    }

    @Test
    void getCurrentTontineSession_alreadyMemberNotJoinable() {
        int year = LocalDate.now().getYear();
        TontineSession session = activeSession(year);
        TontineMember member = new TontineMember();
        member.setId(42L);
        member.setState(State.ENABLED);
        when(tontineSessionRepository.findByYear(year)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSession_YearAndClient_Id(year, 1L)).thenReturn(Optional.of(member));

        CustomerTontineSessionDto dto = service().getCurrentTontineSession();

        assertTrue(dto.isAlreadyMember());
        assertFalse(dto.isJoinable());
        assertEquals("42", dto.getMemberId());
    }

    @Test
    void joinTontineSession_withoutPayment_registersWithCustomerSpaceSource() {
        int year = LocalDate.now().getYear();
        stubJoinableSession(year);
        when(tontineService.registerMember(any(TontineMemberDto.class), eq(TontineMemberRegistrationSource.CUSTOMER_SPACE)))
                .thenReturn(memberResp(99L));

        CustomerTontineJoinRequest request = new CustomerTontineJoinRequest();
        request.setDailyStake(200.0);

        CustomerTontineJoinResponse response = service().joinTontineSession(request);

        assertEquals("99", response.getMemberId());
        assertEquals(year, response.getSessionYear());
        assertEquals(200.0, response.getDailyStake());
        assertNull(response.getInitialPaymentStatus());

        ArgumentCaptor<TontineMemberDto> dtoCaptor = ArgumentCaptor.forClass(TontineMemberDto.class);
        verify(tontineService).registerMember(dtoCaptor.capture(), eq(TontineMemberRegistrationSource.CUSTOMER_SPACE));
        assertEquals(1L, dtoCaptor.getValue().getClientId());
        assertEquals(TontineMemberFrequency.DAILY, dtoCaptor.getValue().getFrequency());
        assertEquals(200.0, dtoCaptor.getValue().getAmount());
        verify(tontineMmSubmissionRepository, never()).save(any());
    }

    @Test
    void joinTontineSession_withPayment_createsInitieSubmissionAndNotification() {
        int year = LocalDate.now().getYear();
        stubJoinableSession(year);
        when(tontineService.registerMember(any(TontineMemberDto.class), eq(TontineMemberRegistrationSource.CUSTOMER_SPACE)))
                .thenReturn(memberResp(77L));
        when(tontineMmSubmissionRepository.save(any(CustomerTontineMmSubmission.class))).thenAnswer(inv -> {
            CustomerTontineMmSubmission sub = inv.getArgument(0);
            sub.setId(5L);
            return sub;
        });

        CustomerTontineInitialPaymentRequest payment = new CustomerTontineInitialPaymentRequest();
        payment.setMobileMoneyPhone("90112233");
        payment.setMobileMoneyAmount(500.0);
        payment.setMobileMoneyReference("TXN-1");
        CustomerTontineJoinRequest request = new CustomerTontineJoinRequest();
        request.setDailyStake(500.0);
        request.setInitialPayment(payment);

        CustomerTontineJoinResponse response = service().joinTontineSession(request);

        assertEquals("INITIE", response.getInitialPaymentStatus());
        ArgumentCaptor<CustomerTontineMmSubmission> subCaptor = ArgumentCaptor.forClass(CustomerTontineMmSubmission.class);
        verify(tontineMmSubmissionRepository).save(subCaptor.capture());
        CustomerTontineMmSubmission saved = subCaptor.getValue();
        assertEquals(77L, saved.getTontineMemberId());
        assertEquals(500.0, saved.getExpectedAmount());
        assertEquals(CustomerSubmissionStatus.INITIE, saved.getStatus());
        verify(appNotificationService).createTontinePaymentDeclaration(any(CustomerTontineMmSubmission.class), eq(activeClient));
    }

    @Test
    void joinTontineSession_noOpenSession_throws() {
        int year = LocalDate.now().getYear();
        when(tontineSessionRepository.findByYear(year)).thenReturn(Optional.empty());

        CustomerTontineJoinRequest request = new CustomerTontineJoinRequest();
        request.setDailyStake(100.0);

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> service().joinTontineSession(request));
        assertEquals("Aucune session de tontine ouverte.", ex.getMessage());
    }

    @Test
    void joinTontineSession_alreadyMember_throws() {
        int year = LocalDate.now().getYear();
        TontineSession session = activeSession(year);
        TontineMember member = new TontineMember();
        member.setId(3L);
        member.setState(State.ENABLED);
        when(tontineSessionRepository.findByYear(year)).thenReturn(Optional.of(session));
        when(tontineMemberRepository.findByTontineSession_YearAndClient_Id(year, 1L)).thenReturn(Optional.of(member));

        CustomerTontineJoinRequest request = new CustomerTontineJoinRequest();
        request.setDailyStake(100.0);

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> service().joinTontineSession(request));
        assertTrue(ex.getMessage().contains("déjà inscrit"));
    }

    @Test
    void getTontineJoinRecipients_resolvesTontineCollector() {
        when(commercialMobileMoneyConfigService.resolveForCollector("COM_TONTINE"))
                .thenReturn(CustomerMobileMoneyRecipientDto.builder()
                        .collector("COM_TONTINE")
                        .mixxNumber("90000000")
                        .build());

        CustomerMobileMoneyRecipientDto dto = service().getTontineJoinRecipients();

        assertEquals("90000000", dto.getMixxNumber());
        verify(commercialMobileMoneyConfigService).resolveForCollector("COM_TONTINE");
    }

    @Test
    void getTopArticleTypes_capsRequestedLimitAndNormalizesNullSoldQuantity() {
        CustomerPortalService service = service();
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        when(creditArticlesRepository.findTopArticleTypesBySoldQuantity(pageableCaptor.capture()))
                .thenReturn(List.<Object[]>of(
                        new Object[] {"TV", 12L},
                        new Object[] {"Téléphone", null}));

        List<CustomerArticleTypeDto> types = service.getTopArticleTypes(99);

        assertEquals(20, pageableCaptor.getValue().getPageSize());
        assertEquals(2, types.size());
        assertEquals("TV", types.get(0).getType());
        assertEquals("TV", types.get(0).getLabel());
        assertEquals(12L, types.get(0).getTotalQuantitySold());
        assertEquals("Téléphone", types.get(1).getType());
        assertEquals(0L, types.get(1).getTotalQuantitySold());
    }

    @Test
    void getArticles_filtersCategoryAndExposesAvailabilityAndCommercialIdentity() {
        CustomerPortalService service = service();
        Articles television = article(1L, "TV", "32 pouces", 5);
        Articles phone = article(2L, "PHONE", "A1", 0);
        when(articlesService.getAllEnabled(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(television, phone)));

        List<CustomerArticleDto> articles = service.getArticles(null, "tv");

        assertEquals(1, articles.size());
        CustomerArticleDto dto = articles.get(0);
        assertEquals("1", dto.getId());
        assertEquals("TV", dto.getCategory());
        assertEquals("TV: Elykia Model", dto.getCommercialName());
        assertEquals("TV: Elykia Model 32 pouces", dto.getDisplayName());
        assertEquals(true, dto.isAvailable());
        verify(articlesService).getAllEnabled(any(Pageable.class));
    }

    private CustomerPortalService service() {
        return new CustomerPortalService(
                contextService,
                creditRepository,
                creditTimelineRepository,
                submissionRepository,
                articlesService,
                orderService,
                creditArticlesRepository,
                tontineMemberRepository,
                tontineCollectionRepository,
                tontineSessionRepository,
                tontineService,
                commercialMobileMoneyConfigService,
                appNotificationService,
                tontineMmSubmissionRepository,
                onboardingService);
    }

    private void stubJoinableSession(int year) {
        when(tontineSessionRepository.findByYear(year)).thenReturn(Optional.of(activeSession(year)));
        when(tontineMemberRepository.findByTontineSession_YearAndClient_Id(year, 1L)).thenReturn(Optional.empty());
    }

    private TontineSession activeSession(int year) {
        TontineSession session = new TontineSession();
        session.setId(10L);
        session.setYear(year);
        session.setStartDate(LocalDate.of(year, 2, 1));
        session.setEndDate(LocalDate.of(year, 11, 30));
        session.setStatus(TontineSessionStatus.ACTIVE);
        return session;
    }

    private TontineMemberRespDto memberResp(Long id) {
        return TontineMemberRespDto.fromId(id);
    }

    private Articles article(Long id, String type, String name, int stock) {
        Articles article = new Articles();
        article.setId(id);
        article.setType(type);
        article.setMarque("Elykia");
        article.setModel("Model");
        article.setName(name);
        article.setStockQuantity(stock);
        article.setCreditSalePrice(1_000.0);
        return article;
    }
}
