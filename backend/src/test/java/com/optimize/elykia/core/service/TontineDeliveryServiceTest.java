package com.optimize.elykia.core.service;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.AccountService;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.DeliveryItemDto;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.sale.CreditService;
import com.optimize.elykia.core.service.tontine.TontineDeliveryReferenceService;
import com.optimize.elykia.core.service.tontine.TontineDeliveryService;
import com.optimize.elykia.core.service.tontine.allocation.TontineProjectedBalanceCalculator;
import com.optimize.elykia.core.service.tontine.conflict.TontineDeliveryConflictService;
import com.optimize.elykia.core.service.tontine.conflict.TontineDeliveryDuplicateException;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOperation;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictOutcome;
import com.optimize.elykia.core.enumaration.TontineDeliveryConflictReason;
import com.optimize.elykia.core.entity.tontine.TontineDeliveryItem;
import com.optimize.elykia.core.service.util.ClientAccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TontineDeliveryServiceTest {

    @Mock
    private TontineDeliveryRepository deliveryRepository;
    @Mock
    private TontineMemberRepository memberRepository;
    @Mock
    private TontineSessionRepository sessionRepository;
    @Mock
    private ArticlesRepository articlesRepository;
    @Mock
    private UserService userService;
    @Mock
    private CreditService creditService;
    @Mock
    private ClientAccountService clientAccountService;
    @Mock
    private AccountService accountService;
    @Mock
    private TontineDeliveryReferenceService deliveryReferenceService;
    @Mock
    private ClientService clientService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private TontineProjectedBalanceCalculator projectedBalanceCalculator;
    @Mock
    private TontineDeliveryConflictService conflictService;
    @Mock
    private com.optimize.common.securities.service.ParameterService parameterService;

    @InjectMocks
    private TontineDeliveryService tontineDeliveryService;

    private TontineMember mockMember;
    private TontineSession mockSession;
    private User mockUser;
    private Articles mockArticle;
    private CreateDeliveryDto createDeliveryDto;

    @BeforeEach
    void setUp() {
        mockSession = new TontineSession();
        mockSession.setId(1L);
        // Default ACTIVE for commande (createDelivery); distribute/deliver tests switch to CLOSED.
        mockSession.setStatus(TontineSessionStatus.ACTIVE);

        Client mockClient = new Client();
        mockClient.setId(1L);
        Account mockAccount = new Account();
        mockAccount.setId(1L);
        mockAccount.setAccountBalance(0.0);
        mockClient.setAccount(mockAccount);

        mockMember = new TontineMember();
        mockMember.setId(1L);
        mockMember.setClient(mockClient);
        mockMember.setTontineSession(mockSession);
        mockMember.setTotalContribution(100000.0);
        mockMember.setAvailableContribution(100000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.SESSION_INPROGRESS);

        mockUser = mock(User.class);

        mockArticle = new Articles();
        mockArticle.setId(1L);

        DeliveryItemDto itemDto = new DeliveryItemDto();
        itemDto.setArticleId(1L);
        itemDto.setQuantity(2);
        itemDto.setUnitPrice(25000.0);

        createDeliveryDto = new CreateDeliveryDto();
        createDeliveryDto.setTontineMemberId(1L);
        createDeliveryDto.setRequestDate(LocalDateTime.now());
        createDeliveryDto.setItems(Collections.singletonList(itemDto));
        lenient().when(projectedBalanceCalculator.project(any())).thenReturn(1_000_000d);
    }

    private void givenRegularUser() {
        when(userService.getCurrentUser()).thenReturn(mockUser);
    }

    @Test
    void createDelivery_AsRegularUser_ShouldCreateWithPendingStatus() {
        // S2a — commande: PENDING, no commercial stock impact (createTontineCredit never called).
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-001");
        when(deliveryReferenceService.resolveAuthenticityCode(org.mockito.ArgumentMatchers.nullable(String.class)))
                .thenReturn("ELY-A1B2-C3D4");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertNotNull(result);
        assertEquals(TontineMemberDeliveryStatus.PENDING, result.getDeliveryStatus());
        assertEquals(50000.0, result.getTotalAmount());
        assertEquals(50000.0, result.getRemainingBalance());
        assertEquals(createDeliveryDto.getRequestDate(), result.getRequestDate());
        assertEquals("ELY-A1B2-C3D4", result.getAuthenticityCode());
        // Solde net 100 000, commande 50 000 : reliquat 50 000, rien à payer.
        assertEquals(100000.0, result.getNetContribution());
        assertEquals(0.0, result.getAmountDue());
        assertEquals(50000.0, result.getRefundableBalance());

        // Stock commercial is applied only via tontine credit — must not run on order create.
        verify(creditService, never()).createTontineCredit(any());
        verifyNoMoreInteractions(creditService);
        verify(deliveryRepository, times(1)).save(any(TontineDelivery.class));
        assertEquals(TontineMemberDeliveryStatus.PENDING, mockMember.getDeliveryStatus());
    }

    @Test
    void createDelivery_validatesTheOrderDirectlyWhenAutoValidationIsEnabled() {
        givenRegularUser();
        when(parameterService.isEnabled(TontineDeliveryService.AUTO_VALIDATION_PARAMETER)).thenReturn(true);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-AUTO");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(TontineMemberDeliveryStatus.VALIDATED, result.getDeliveryStatus());
        assertEquals(TontineMemberDeliveryStatus.VALIDATED, mockMember.getDeliveryStatus());
        verifyNoInteractions(creditService);
    }

    @Test
    void createDelivery_keepsTheOrderPendingWhenAutoValidationIsDisabled() {
        givenRegularUser();
        when(parameterService.isEnabled(TontineDeliveryService.AUTO_VALIDATION_PARAMETER)).thenReturn(false);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-PEND");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(TontineMemberDeliveryStatus.PENDING, result.getDeliveryStatus());
    }

    @Test
    void createDelivery_keepsAMergedOrderValidatedWhenAutoValidationIsEnabled() {
        TontineDelivery current = existingDelivery(20L, "LIV-A", 30_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
        when(projectedBalanceCalculator.project(any())).thenReturn(100_000d);
        givenRegularUser();
        when(parameterService.isEnabled(TontineDeliveryService.AUTO_VALIDATION_PARAMETER)).thenReturn(true);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(current));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
        createDeliveryDto.setReference("LIV-B");

        tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(TontineMemberDeliveryStatus.VALIDATED, mockMember.getDeliveryStatus());
    }

    @Test
    void createDelivery_keepsThePlannedDeliveryDate() {
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-PLAN");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
        createDeliveryDto.setPlannedDeliveryDate(java.time.LocalDate.of(2026, 12, 15));

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(java.time.LocalDate.of(2026, 12, 15), result.getPlannedDeliveryDate());
    }

    @Test
    void createDelivery_mergedOrderTakesThePlannedDateWhenTheFirstHadNone() {
        TontineDelivery current = existingDelivery(20L, "LIV-A", 30_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        when(projectedBalanceCalculator.project(any())).thenReturn(1_000_000d);
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(current));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
        createDeliveryDto.setReference("LIV-B");
        createDeliveryDto.setPlannedDeliveryDate(java.time.LocalDate.of(2026, 12, 20));

        tontineDeliveryService.createDelivery(createDeliveryDto);
        assertEquals(java.time.LocalDate.of(2026, 12, 20), current.getPlannedDeliveryDate());

        createDeliveryDto.setReference("LIV-C");
        createDeliveryDto.setPlannedDeliveryDate(java.time.LocalDate.of(2026, 12, 31));
        tontineDeliveryService.createDelivery(createDeliveryDto);
        // Une date déjà prévue n'est pas écrasée par une seconde saisie.
        assertEquals(java.time.LocalDate.of(2026, 12, 20), current.getPlannedDeliveryDate());
    }

    @Test
    void createDelivery_rejectsSecondOrderWhenMemberAlreadyDelivered() {
        TontineDelivery delivered = existingDelivery(20L, "LIV-A", 30_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(delivered));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        createDeliveryDto.setReference("LIV-B");

        TontineDeliveryDuplicateException ex = assertThrows(TontineDeliveryDuplicateException.class,
                () -> tontineDeliveryService.createDelivery(createDeliveryDto));

        assertEquals(TontineDeliveryConflictReason.ALREADY_DELIVERED, ex.getReason());
        assertTrue(ex.getMessage().contains("LIV-A"));
        verify(conflictService).record(eq(mockMember), eq(delivered),
                argThat(in -> in.operation() == TontineDeliveryConflictOperation.ORDER && "LIV-B".equals(in.reference())),
                eq(TontineDeliveryConflictOutcome.REJECTED), eq(TontineDeliveryConflictReason.ALREADY_DELIVERED));
        verify(deliveryRepository, never()).save(any());
        verifyNoInteractions(deliveryReferenceService);
    }

    @Test
    void createDelivery_mergesSecondOrderWhenBalanceCoversBoth() {
        // Deux téléphones sur le même compte : la seconde commande s'ajoute à la première.
        TontineDelivery current = existingDelivery(20L, "LIV-A", 30_000.0);
        current.addItem(item("Huile", 1, 30_000.0));
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
        mockMember.setAvailableContribution(60_000.0);
        when(projectedBalanceCalculator.project(any())).thenReturn(100_000d);
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(current));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
        createDeliveryDto.setReference("LIV-B");

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(20L, result.getId());
        assertEquals("LIV-A", result.getReference());
        assertEquals(80_000.0, result.getTotalAmount());
        assertEquals(0.0, result.getRemainingBalance());
        assertEquals(2, result.getItems().size());
        assertTrue(result.getMergedIntoExisting());
        // Le contenu a changé : la commande validée repasse en attente.
        assertEquals(TontineMemberDeliveryStatus.PENDING, mockMember.getDeliveryStatus());
        verify(conflictService).record(eq(mockMember), eq(current), any(),
                eq(TontineDeliveryConflictOutcome.MERGED), eq(TontineDeliveryConflictReason.ORDER_MERGED));
        verifyNoInteractions(deliveryReferenceService, creditService);
    }

    @Test
    void createDelivery_rejectsSecondOrderWhenCombinedTotalExceedsProjectedBalance() {
        TontineDelivery current = existingDelivery(20L, "LIV-A", 60_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        when(projectedBalanceCalculator.project(any())).thenReturn(100_000d);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(current));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        createDeliveryDto.setReference("LIV-B");

        TontineDeliveryDuplicateException ex = assertThrows(TontineDeliveryDuplicateException.class,
                () -> tontineDeliveryService.createDelivery(createDeliveryDto));

        assertEquals(TontineDeliveryConflictReason.BALANCE_EXCEEDED, ex.getReason());
        assertEquals(60_000.0, current.getTotalAmount());
        verify(deliveryRepository, never()).save(any());
        verify(conflictService).record(eq(mockMember), eq(current), argThat(in -> in.amount() == 50_000.0),
                eq(TontineDeliveryConflictOutcome.REJECTED), eq(TontineDeliveryConflictReason.BALANCE_EXCEEDED));
    }

    @Test
    void createDelivery_replayOfTheSameOrderReturnsItWithoutChange() {
        TontineDelivery current = existingDelivery(20L, "LIV-A", 50_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(current));
        createDeliveryDto.setReference("LIV-A");

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(20L, result.getId());
        assertFalse(result.getMergedIntoExisting());
        verify(deliveryRepository, never()).save(any());
        verify(conflictService, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void createDelivery_replayOfAnAlreadyMergedOrderAddsNothing() {
        TontineDelivery current = existingDelivery(20L, "LIV-A", 80_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(current));
        when(conflictService.wasAlreadyMerged(1L, "LIV-B")).thenReturn(true);
        createDeliveryDto.setReference("LIV-B");

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(80_000.0, result.getTotalAmount());
        assertTrue(result.getMergedIntoExisting());
        verify(deliveryRepository, never()).save(any());
        verify(conflictService, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    void distributeTontineDelivery_rejectsWhenAnOrderIsAlreadyPending() {
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        TontineDelivery current = existingDelivery(20L, "LIV-A", 50_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.VALIDATED);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(current));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        createDeliveryDto.setReference("LIV-B");

        TontineDeliveryDuplicateException ex = assertThrows(TontineDeliveryDuplicateException.class,
                () -> tontineDeliveryService.distributeTontineDelivery(createDeliveryDto));

        assertEquals(TontineDeliveryConflictReason.ORDER_ALREADY_PENDING, ex.getReason());
        verify(conflictService).record(eq(mockMember), eq(current),
                argThat(in -> in.operation() == TontineDeliveryConflictOperation.DIRECT_DELIVERY),
                eq(TontineDeliveryConflictOutcome.REJECTED), eq(TontineDeliveryConflictReason.ORDER_ALREADY_PENDING));
        verifyNoInteractions(creditService);
        verify(deliveryRepository, never()).save(any());
    }

    @Test
    void distributeTontineDelivery_rejectsASecondDirectDeliveryOfADeliveredMember() {
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        TontineDelivery delivered = existingDelivery(20L, "LIV-A", 50_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(delivered));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        createDeliveryDto.setReference("LIV-B");

        TontineDeliveryDuplicateException ex = assertThrows(TontineDeliveryDuplicateException.class,
                () -> tontineDeliveryService.distributeTontineDelivery(createDeliveryDto));

        assertEquals(TontineDeliveryConflictReason.ALREADY_DELIVERED, ex.getReason());
        verifyNoInteractions(creditService, accountService, clientAccountService);
    }

    @Test
    void distributeTontineDelivery_replayOfTheSameDeliveryReturnsIt() {
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        TontineDelivery delivered = existingDelivery(20L, "LIV-A", 50_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.findByTontineMemberId(1L)).thenReturn(Optional.of(delivered));
        createDeliveryDto.setReference("LIV-A");

        TontineDeliveryDto result = tontineDeliveryService.distributeTontineDelivery(createDeliveryDto);

        assertEquals(20L, result.getId());
        verifyNoInteractions(creditService, conflictService);
    }

    @Test
    void deliverDelivery_rejectsASecondDeliveryWithoutCreditOrAccountDeposit() {
        // Faille corrigée : deux remises synchronisées créaient deux crédits et deux reliquats.
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        TontineDelivery delivered = existingDelivery(10L, "LIV-A", 30_000.0);
        delivered.addItem(item("Riz", 1, 30_000.0));
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivered));

        TontineDeliveryDuplicateException ex = assertThrows(TontineDeliveryDuplicateException.class,
                () -> tontineDeliveryService.deliverDelivery(10L));

        assertEquals(TontineDeliveryConflictReason.ALREADY_DELIVERED, ex.getReason());
        verify(conflictService).record(eq(mockMember), eq(delivered),
                argThat(in -> in.operation() == TontineDeliveryConflictOperation.DELIVER && "1 × Riz".equals(in.items())),
                eq(TontineDeliveryConflictOutcome.REJECTED), eq(TontineDeliveryConflictReason.ALREADY_DELIVERED));
        verifyNoInteractions(creditService, accountService, clientAccountService);
        verify(deliveryRepository, never()).save(any());
        verify(memberRepository, never()).save(any());
    }

    @Test
    void validateDelivery_rejectsADeliveredOrder() {
        TontineDelivery delivered = existingDelivery(10L, "LIV-A", 30_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.DELIVERED);
        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivered));

        assertThrows(CustomValidationException.class, () -> tontineDeliveryService.validateDelivery(10L));
        assertEquals(TontineMemberDeliveryStatus.DELIVERED, mockMember.getDeliveryStatus());
        verify(memberRepository, never()).save(any());
    }

    private TontineDelivery existingDelivery(Long id, String reference, double total) {
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(id);
        delivery.setReference(reference);
        delivery.setTontineMember(mockMember);
        delivery.setTotalAmount(total);
        delivery.setRemainingBalance(0.0);
        delivery.setRequestDate(LocalDateTime.of(2026, 11, 2, 9, 0));
        delivery.setDeliveryDate(LocalDateTime.of(2026, 11, 20, 10, 30));
        delivery.setItems(new ArrayList<>());
        mockMember.setDelivery(delivery);
        return delivery;
    }

    private TontineDeliveryItem item(String name, int quantity, double total) {
        TontineDeliveryItem item = new TontineDeliveryItem();
        item.setArticles(mockArticle);
        item.setArticleName(name);
        item.setQuantity(quantity);
        item.setUnitPrice(total / quantity);
        item.setTotalPrice(total);
        return item;
    }

    @Test
    void createDelivery_acceptsAmountAboveAvailableWithinProjectedBalance() {
        mockMember.setAvailableContribution(20_000.0);
        when(projectedBalanceCalculator.project(any())).thenReturn(30_000d);
        createDeliveryDto.getItems().get(0).setQuantity(1);
        createDeliveryDto.getItems().get(0).setUnitPrice(25_000.0);
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-002");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(25_000.0, result.getTotalAmount());
        assertEquals(30_000d, result.getProjectedBalance());
        // Solde net 20 000, commande 25 000 : 5 000 restent à payer.
        assertEquals(5_000.0, result.getAmountDue());
        assertEquals(0.0, result.getRefundableBalance());
        assertEquals(0.0, result.getRemainingBalance());
        assertEquals(TontineMemberDeliveryStatus.PENDING, result.getDeliveryStatus());
    }

    @Test
    void createDelivery_rejectsAmountGreaterThanProjectedBalance() {
        mockMember.setAvailableContribution(20_000.0);
        when(projectedBalanceCalculator.project(any())).thenReturn(30_000d);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.createDelivery(createDeliveryDto));
        assertTrue(ex.getMessage().contains("solde prévisionnel"));
        verify(deliveryRepository, never()).save(any());
        verifyNoInteractions(deliveryReferenceService, userService);
    }

    @Test
    void createDelivery_acceptsWhenSessionIsClosed() {
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-003");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertEquals(TontineMemberDeliveryStatus.PENDING, result.getDeliveryStatus());
        verify(deliveryRepository, times(1)).save(any(TontineDelivery.class));
    }

    @Test
    void createDelivery_rejectsWhenSessionIsEnded() {
        mockSession.setStatus(TontineSessionStatus.ENDED);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.createDelivery(createDeliveryDto));
        assertTrue(ex.getMessage().contains("ouverte ou clôturée"));
        verify(deliveryRepository, never()).save(any());
        verifyNoInteractions(articlesRepository, deliveryReferenceService, userService);
    }

    @Test
    void distributeTontineDelivery_rejectsWhenSessionIsActive() {
        mockSession.setStatus(TontineSessionStatus.ACTIVE);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.distributeTontineDelivery(createDeliveryDto));
        assertTrue(ex.getMessage().contains("session clôturée"));
        verify(deliveryRepository, never()).save(any());
        verifyNoInteractions(creditService);
    }

    @Test
    void deliverDelivery_rejectsWhenSessionIsActive() {
        mockSession.setStatus(TontineSessionStatus.ACTIVE);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(10L);
        delivery.setTontineMember(mockMember);
        delivery.setItems(new ArrayList<>());
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.deliverDelivery(10L));
        assertTrue(ex.getMessage().contains("session clôturée"));
        verify(creditService, never()).createTontineCredit(any());
    }

    @Test
    void deliverDelivery_rejectsWhenSessionIsEnded() {
        mockSession.setStatus(TontineSessionStatus.ENDED);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(10L);
        delivery.setTontineMember(mockMember);
        delivery.setItems(new ArrayList<>());
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.deliverDelivery(10L));
        verify(creditService, never()).createTontineCredit(any());
    }

    @Test
    void deliverDelivery_fromPendingOrder_setsDeliveredStatusAndDeliveryDate() {
        // S2b — mark order delivered: DELIVERED + stock impact via createTontineCredit.
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        LocalDateTime requestDate = LocalDateTime.of(2026, 3, 1, 10, 0);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(10L);
        delivery.setTontineMember(mockMember);
        delivery.setRequestDate(requestDate);
        delivery.setDeliveryDate(requestDate);
        delivery.setTotalAmount(50_000.0);
        delivery.setRemainingBalance(0.0);
        delivery.setCommercialUsername("commercial1");
        delivery.setItems(new ArrayList<>());
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        mockMember.setDelivery(delivery);
        mockSession.setMembers(Collections.singletonList(mockMember));

        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(sessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(memberRepository.save(any(TontineMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.deliverDelivery(10L);

        assertEquals(TontineMemberDeliveryStatus.DELIVERED, result.getDeliveryStatus());
        assertEquals(requestDate, result.getRequestDate());
        assertTrue(result.getDeliveryDate().isAfter(requestDate));

        ArgumentCaptor<TontineDelivery> deliveryCaptor = ArgumentCaptor.forClass(TontineDelivery.class);
        verify(deliveryRepository, atLeastOnce()).save(deliveryCaptor.capture());
        assertTrue(deliveryCaptor.getValue().getDeliveryDate().isAfter(requestDate));
        // Credit creation is the stock-impact contract for commercial tontine stock.
        verify(creditService, times(1)).createTontineCredit(delivery);
        verify(clientService).updateTontineStatus(eq(1L), eq(Boolean.FALSE));
        verify(memberRepository).save(argThat(m -> m.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED));
    }

    @Test
    void distributeTontineDelivery_endsAsDelivered() {
        // S1 — direct delivery: DELIVERED + immediate stock impact via createTontineCredit.
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-DIR-001");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> {
            TontineDelivery d = invocation.getArgument(0);
            if (d.getId() == null) {
                d.setId(42L);
            }
            return d;
        });
        when(deliveryRepository.findById(42L)).thenAnswer(invocation -> {
            TontineDelivery d = new TontineDelivery();
            d.setId(42L);
            d.setTontineMember(mockMember);
            d.setRequestDate(createDeliveryDto.getRequestDate());
            d.setDeliveryDate(createDeliveryDto.getRequestDate());
            d.setTotalAmount(50_000.0);
            d.setRemainingBalance(0.0);
            d.setCommercialUsername("c");
            d.setItems(new ArrayList<>());
            mockMember.setDelivery(d);
            return Optional.of(d);
        });
        when(sessionRepository.findById(1L)).thenReturn(Optional.of(mockSession));
        mockSession.setMembers(Collections.singletonList(mockMember));
        when(memberRepository.save(any(TontineMember.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.distributeTontineDelivery(createDeliveryDto);

        assertEquals(TontineMemberDeliveryStatus.DELIVERED, result.getDeliveryStatus());
        verify(creditService, times(1)).createTontineCredit(any(TontineDelivery.class));
        verify(memberRepository, times(2)).save(any(TontineMember.class));
        assertEquals(TontineMemberDeliveryStatus.DELIVERED, mockMember.getDeliveryStatus());
    }

    @Test
    void deliverDelivery_rejectsWhenRealBalanceDoesNotCoverTheOrder() {
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(10L);
        delivery.setTontineMember(mockMember);
        delivery.setTotalAmount(30_000.0);
        delivery.setItems(new ArrayList<>());
        mockMember.setAvailableContribution(20_000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));

        CustomValidationException ex = assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.deliverDelivery(10L));
        assertTrue(ex.getMessage().contains("Complétez le solde"));
        verify(creditService, never()).createTontineCredit(any());
    }

    @Test
    void replaceItems_onClosedSession_allowsAboveRealBalanceWithinProjected() {
        mockSession.setStatus(TontineSessionStatus.CLOSED);
        mockMember.setAvailableContribution(20_000.0);
        when(projectedBalanceCalculator.project(any())).thenReturn(30_000d);
        TontineDelivery delivery = new TontineDelivery();
        delivery.setId(10L);
        delivery.setTontineMember(mockMember);
        delivery.setTotalAmount(30_000.0);
        delivery.setItems(new ArrayList<>());
        mockMember.setDelivery(delivery);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
        when(deliveryRepository.findById(10L)).thenReturn(Optional.of(delivery));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DeliveryItemDto aboveAvailable = new DeliveryItemDto();
        aboveAvailable.setArticleId(1L);
        aboveAvailable.setQuantity(1);
        aboveAvailable.setUnitPrice(25_000.0);
        TontineDeliveryDto updated = tontineDeliveryService.replaceItems(10L, List.of(aboveAvailable));
        assertEquals(25_000.0, updated.getTotalAmount());

        DeliveryItemDto aboveProjected = new DeliveryItemDto();
        aboveProjected.setArticleId(1L);
        aboveProjected.setQuantity(1);
        aboveProjected.setUnitPrice(35_000.0);
        assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.replaceItems(10L, List.of(aboveProjected)));
    }
}
