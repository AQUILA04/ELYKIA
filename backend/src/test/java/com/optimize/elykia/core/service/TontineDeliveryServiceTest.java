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
        mockSession.setStatus(TontineSessionStatus.CLOSED);

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
    }

    private void givenRegularUser() {
        when(userService.getCurrentUser()).thenReturn(mockUser);
    }

    @Test
    void createDelivery_AsRegularUser_ShouldCreateWithPendingStatus() {
        givenRegularUser();
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryReferenceService.resolveReference(any(), any())).thenReturn("TNT-001");
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        assertNotNull(result);
        assertEquals(TontineMemberDeliveryStatus.PENDING, result.getDeliveryStatus());
        assertEquals(50000.0, result.getTotalAmount());
        assertEquals(50000.0, result.getRemainingBalance());
        assertEquals(createDeliveryDto.getRequestDate(), result.getRequestDate());

        verify(creditService, never()).createTontineCredit(any());
        verify(deliveryRepository, times(1)).save(any(TontineDelivery.class));
    }

    @Test
    void createDelivery_rejectsDuplicateDeliveryForMember() {
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(deliveryRepository.existsByTontineMemberId(1L)).thenReturn(true);

        assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.createDelivery(createDeliveryDto));
        verify(deliveryRepository, never()).save(any());
        verifyNoInteractions(articlesRepository, deliveryReferenceService, userService);
    }

    @Test
    void createDelivery_rejectsAmountGreaterThanAvailableContribution() {
        mockMember.setAvailableContribution(20_000.0);
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));

        assertThrows(CustomValidationException.class,
                () -> tontineDeliveryService.createDelivery(createDeliveryDto));
        verify(deliveryRepository, never()).save(any());
        verifyNoInteractions(deliveryReferenceService, userService);
    }

    @Test
    void deliverDelivery_fromPendingOrder_setsDeliveredStatusAndDeliveryDate() {
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
        verify(creditService).createTontineCredit(delivery);
        verify(clientService).updateTontineStatus(eq(1L), eq(Boolean.FALSE));
        verify(memberRepository).save(argThat(m -> m.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED));
    }

    @Test
    void distributeTontineDelivery_endsAsDelivered() {
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
        verify(creditService).createTontineCredit(any(TontineDelivery.class));
    }
}
