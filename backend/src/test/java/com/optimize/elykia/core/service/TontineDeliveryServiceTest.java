package com.optimize.elykia.core.service;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Account;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.AccountService;
import com.optimize.elykia.core.dto.CreateDeliveryDto;
import com.optimize.elykia.core.dto.DeliveryItemDto;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.entity.Articles;
import com.optimize.elykia.core.entity.TontineDelivery;
import com.optimize.elykia.core.entity.TontineMember;
import com.optimize.elykia.core.entity.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.ArticlesRepository;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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

    @InjectMocks
    private TontineDeliveryService tontineDeliveryService;

    private TontineMember mockMember;
    private TontineSession mockSession;
    private User mockUser;
    private Articles mockArticle;
    private CreateDeliveryDto createDeliveryDto;

    @BeforeEach
    void setUp() {
        // Mock Session
        mockSession = new TontineSession();
        mockSession.setId(1L);
        mockSession.setStatus(TontineSessionStatus.CLOSED);

        // Mock Client and Account
        Client mockClient = new Client();
        mockClient.setId(1L);
        Account mockAccount = new Account();
        mockAccount.setId(1L);
        mockAccount.setAccountBalance(0.0);
        mockClient.setAccount(mockAccount);

        // Mock Member
        mockMember = new TontineMember();
        mockMember.setId(1L);
        mockMember.setClient(mockClient);
        mockMember.setTontineSession(mockSession);
        mockMember.setTotalContribution(100000.0);
        mockMember.setDeliveryStatus(TontineMemberDeliveryStatus.SESSION_INPROGRESS);

        // Mock User
        // Since the User class is from a JAR and setters might not be public,
        // we mock its behavior directly.
        mockUser = mock(User.class);
        when(userService.getCurrentUser()).thenReturn(mockUser);
        when(mockUser.getUsername()).thenReturn("testuser");

        // Mock Article
        mockArticle = new Articles();
        mockArticle.setId(1L);

        // Mock DTO
        DeliveryItemDto itemDto = new DeliveryItemDto();
        itemDto.setArticleId(1L);
        itemDto.setQuantity(2);
        itemDto.setUnitPrice(25000.0);
        
        createDeliveryDto = new CreateDeliveryDto();
        createDeliveryDto.setTontineMemberId(1L);
        createDeliveryDto.setItems(Collections.singletonList(itemDto));
    }

    @Test
    void createDelivery_AsRegularUser_ShouldCreateWithPendingStatus() {
        // Given
        when(memberRepository.findById(1L)).thenReturn(Optional.of(mockMember));
        when(userService.getCurrentUser()).thenReturn(mockUser);
        when(articlesRepository.findById(1L)).thenReturn(Optional.of(mockArticle));
        when(deliveryRepository.save(any(TontineDelivery.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        TontineDeliveryDto result = tontineDeliveryService.createDelivery(createDeliveryDto);

        // Then
        assertNotNull(result);
        assertEquals(TontineMemberDeliveryStatus.PENDING, result.getDeliveryStatus());
        assertEquals(50000.0, result.getTotalAmount());
        assertEquals(50000.0, result.getRemainingBalance());
        
        verify(creditService, never()).createTontineCredit(any());
        verify(deliveryRepository, times(1)).save(any(TontineDelivery.class));
    }
}
