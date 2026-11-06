package com.optimize.elykia.core.service.portfolio;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientCollectorType;
import com.optimize.elykia.client.repository.ClientCollectorHistoryRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.portfolio.FormerTontineCollectionDto;
import com.optimize.elykia.core.dto.portfolio.FormerTontineMemberDetailDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FormerPortfolioServiceTest {

    @Mock private UserService userService;
    @Mock private ClientService clientService;
    @Mock private TontineMemberRepository tontineMemberRepository;
    @Mock private TontineCollectionRepository tontineCollectionRepository;
    @Mock private ClientCollectorHistoryRepository clientCollectorHistoryRepository;
    @Mock private CreditRepository creditRepository;
    @Mock private CreditTimelineRepository creditTimelineRepository;
    @Mock private CreditCollectorHistoryRepository creditCollectorHistoryRepository;

    private FormerPortfolioService service;

    @BeforeEach
    void setUp() {
        service = new FormerPortfolioService(
                userService,
                clientService,
                tontineMemberRepository,
                tontineCollectionRepository,
                clientCollectorHistoryRepository,
                creditRepository,
                creditTimelineRepository,
                creditCollectorHistoryRepository);
    }

    @Test
    void currentHolderAndStaffKeepFullFile_formerPromoterIsReduced_strangerIsDenied() {
        assertThat(FormerPortfolioAccess.decide(true, true, true))
                .isEqualTo(FormerPortfolioAccess.Level.FULL);
        assertThat(FormerPortfolioAccess.decide(false, false, false))
                .isEqualTo(FormerPortfolioAccess.Level.FULL);
        assertThat(FormerPortfolioAccess.decide(true, false, true))
                .isEqualTo(FormerPortfolioAccess.Level.FORMER);
        assertThat(FormerPortfolioAccess.decide(true, false, false))
                .isEqualTo(FormerPortfolioAccess.Level.DENIED);
    }

    @Test
    void formerPromoterSeesOnlyOwnCollections() {
        User former = promoter("com.a");
        when(userService.getCurrentUser()).thenReturn(former);
        TontineMember member = memberHeldBy("com.b");
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.existsByTontineMember_IdAndStateAndCommercialUsernameIgnoreCase(
                7L, State.ENABLED, "com.a")).thenReturn(true);
        FormerTontineCollectionDto own = new FormerTontineCollectionDto(
                7L, 3L, 1000.0, LocalDateTime.of(2026, 3, 1, 8, 0), "COL-A");
        when(tontineCollectionRepository.findOwnCollections(7L, "com.a")).thenReturn(List.of(own));

        FormerTontineMemberDetailDto detail = service.getFormerTontineMember(7L);

        assertThat(detail.collections()).containsExactly(own);
        assertThat(detail.ownCollectionsTotal()).isEqualTo(1000.0);
        assertThat(detail.firstname()).isEqualTo("Awa");
        assertThat(detail.collections()).extracting(FormerTontineCollectionDto::reference)
                .doesNotContain("COL-B");
    }

    @Test
    void promoterWhoGotTheClientBackIsNotAFormerReader() {
        User current = promoter("com.a");
        when(userService.getCurrentUser()).thenReturn(current);
        TontineMember member = memberHeldBy("com.a");
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(member));

        assertThat(service.decideTontineMember(7L)).isEqualTo(FormerPortfolioAccess.Level.FULL);
        assertThatThrownBy(() -> service.getFormerTontineMember(7L))
                .isInstanceOf(CustomValidationException.class);
    }

    @Test
    void staffStillReadsTheFullMember() {
        User manager = mock(User.class);
        when(manager.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        when(userService.getCurrentUser()).thenReturn(manager);
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(memberHeldBy("com.b")));

        assertThat(service.decideTontineMember(7L)).isEqualTo(FormerPortfolioAccess.Level.FULL);
    }

    @Test
    void formerPromoterCannotRecordACollection() {
        User former = promoter("com.a");
        assertThatThrownBy(() -> AppNotificationService.assertPromoterOwnsTontineCollector(former, "com.b"))
                .isInstanceOf(CustomValidationException.class);
    }

    @Test
    void cashSaleBecomesFormerOnceAgencyCollectorChanges() {
        User former = promoter("com.a");
        when(userService.getCurrentUser()).thenReturn(former);
        Credit sale = new Credit();
        sale.setId(9L);
        sale.setState(State.ENABLED);
        sale.setType(OperationType.CASH);
        sale.setCollector("com.a");
        sale.setAgencyCommercial("com.a");
        Client client = new Client();
        client.setAgencyCollector("com.b");
        sale.setClient(client);
        when(creditRepository.findById(9L)).thenReturn(Optional.of(sale));

        assertThat(service.decideCredit(9L)).isEqualTo(FormerPortfolioAccess.Level.FORMER);
    }

    @Test
    void historyWithoutCollectionStillCountsAsFormerLink() {
        User former = promoter("com.a");
        when(userService.getCurrentUser()).thenReturn(former);
        TontineMember member = memberHeldBy("com.b");
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.existsByTontineMember_IdAndStateAndCommercialUsernameIgnoreCase(
                7L, State.ENABLED, "com.a")).thenReturn(false);
        when(clientCollectorHistoryRepository.existsByClientIdAndCollectorTypeAndOldCollectorIgnoreCaseAndState(
                4L, ClientCollectorType.TONTINE, "com.a", State.ENABLED)).thenReturn(true);

        assertThat(service.decideTontineMember(7L)).isEqualTo(FormerPortfolioAccess.Level.FORMER);
    }

    private static User promoter(String username) {
        User user = mock(User.class);
        when(user.getUsername()).thenReturn(username);
        when(user.is(UserProfilConstant.SECRETARY)).thenReturn(false);
        when(user.is(UserProfilConstant.GESTIONNAIRE)).thenReturn(false);
        when(user.is(UserProfilConstant.ADMIN)).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        return user;
    }

    private static TontineMember memberHeldBy(String tontineCollector) {
        Client client = new Client();
        client.setId(4L);
        client.setFirstname("Awa");
        client.setLastname("Koffi");
        client.setCode("CL-4");
        client.setPhone("90000000");
        client.setQuarter("Agoè");
        client.setTontineCollector(tontineCollector);
        TontineSession session = new TontineSession();
        session.setYear(2026);
        TontineMember member = new TontineMember();
        member.setId(7L);
        member.setState(State.ENABLED);
        member.setClient(client);
        member.setTontineSession(session);
        return member;
    }
}
