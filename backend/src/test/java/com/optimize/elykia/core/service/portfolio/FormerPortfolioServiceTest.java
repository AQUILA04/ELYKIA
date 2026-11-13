package com.optimize.elykia.core.service.portfolio;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientCollectorType;
import com.optimize.elykia.client.repository.ClientCollectorHistoryRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.portfolio.FormerTontineCollectionDto;
import com.optimize.elykia.core.dto.portfolio.FormerTontineMemberDetailDto;
import com.optimize.elykia.core.dto.portfolio.FormerTontineStakePeriodDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
        assertThat(detail.dailyAmount()).isNull();
        assertThat(detail.stakePeriods()).isEmpty();
        assertThat(detail.firstname()).isEqualTo("Awa");
        assertThat(detail.collections()).extracting(FormerTontineCollectionDto::reference)
                .doesNotContain("COL-B");
    }

    @Test
    void formerDetailKeepsEnabledStakePeriods() {
        User former = promoter("com.a");
        when(userService.getCurrentUser()).thenReturn(former);
        TontineMember member = memberHeldBy("com.b");
        member.setAmount(300.0);
        TontineMemberAmountHistory current = new TontineMemberAmountHistory();
        current.setAmount(500.0);
        current.setStartDate(LocalDate.of(2026, 8, 1));
        current.setEndDate(LocalDate.of(2026, 8, 31));
        current.setState(State.ENABLED);
        TontineMemberAmountHistory removed = new TontineMemberAmountHistory();
        removed.setAmount(900.0);
        removed.setStartDate(LocalDate.of(2026, 1, 1));
        removed.setState(State.DELETED);
        member.getAmountHistory().add(current);
        member.getAmountHistory().add(removed);
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.existsByTontineMember_IdAndStateAndCommercialUsernameIgnoreCase(
                7L, State.ENABLED, "com.a")).thenReturn(true);
        when(tontineCollectionRepository.findOwnCollections(7L, "com.a")).thenReturn(List.of());

        FormerTontineMemberDetailDto detail = service.getFormerTontineMember(7L);

        assertThat(detail.dailyAmount()).isEqualTo(300.0);
        assertThat(detail.stakePeriods()).containsExactly(
                new FormerTontineStakePeriodDto(500.0, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 31)));
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
    void cancelledSaleStaysReadableForStaff() {
        User manager = mock(User.class);
        when(manager.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        when(userService.getCurrentUser()).thenReturn(manager);
        Credit sale = new Credit();
        sale.setId(1L);
        sale.setState(State.DELETED);
        sale.setStatus(CreditStatus.CANCELLED);
        sale.setCollector("COM020");
        when(creditRepository.findById(1L)).thenReturn(Optional.of(sale));

        assertThat(service.decideCredit(1L)).isEqualTo(FormerPortfolioAccess.Level.FULL);
    }

    @Test
    void deletedSaleThatIsNotCancelledStaysHidden() {
        Credit sale = new Credit();
        sale.setId(2L);
        sale.setState(State.DELETED);
        sale.setStatus(CreditStatus.CREATED);
        when(creditRepository.findById(2L)).thenReturn(Optional.of(sale));

        assertThatThrownBy(() -> service.decideCredit(2L))
                .isInstanceOf(CustomValidationException.class);
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

    @Test
    void promoterHistoryIgnoresTheRequestedCommercial() {
        User former = promoter("com.a");
        when(userService.getCurrentUser()).thenReturn(former);
        when(tontineMemberRepository.findFormerMembers(eq("com.a"), any(Pageable.class))).thenReturn(Page.empty());

        assertThat(service.listFormerTontineMembers(PageRequest.of(0, 20)).getContent()).isEmpty();
        assertThat(service.listFormerTontineMembers(PageRequest.of(0, 20), "COM015").getContent()).isEmpty();
        verify(tontineMemberRepository, never()).findFormerMembers(eq("COM015"), any());
    }

    @Test
    void staffCanOpenAnotherCommercialHistoryWhenAllowed() {
        User manager = staff(UserPermissionConstant.KPI_FINANCIER_TONTINE);
        when(userService.getCurrentUser()).thenReturn(manager);
        when(tontineMemberRepository.findFormerMembers(eq("COM003"), any(Pageable.class))).thenReturn(Page.empty());

        assertThat(service.listFormerTontineMembers(PageRequest.of(0, 20), "  COM003  ").getContent()).isEmpty();
    }

    @Test
    void staffWithoutTontineAccessCannotOpenAnotherCommercial() {
        User manager = staff("ROLE_OTHER");
        when(userService.getCurrentUser()).thenReturn(manager);

        assertThatThrownBy(() -> service.listFormerTontineMembers(PageRequest.of(0, 20), "COM003"))
                .isInstanceOf(CustomValidationException.class);
    }

    @Test
    void staffWithoutPermissionsCannotOpenAnotherCommercial() {
        User manager = mock(User.class);
        when(manager.getUsername()).thenReturn("manager");
        when(manager.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        when(manager.getPermissions()).thenReturn(null);
        when(userService.getCurrentUser()).thenReturn(manager);

        assertThatThrownBy(() -> service.listFormerTontineMembers(PageRequest.of(0, 20), "COM003"))
                .isInstanceOf(CustomValidationException.class);
    }

    @Test
    void staffMustChooseACommercial() {
        User manager = staff(UserPermissionConstant.CONSULT_TONTINE);
        when(userService.getCurrentUser()).thenReturn(manager);

        assertThatThrownBy(() -> service.listFormerTontineMembers(PageRequest.of(0, 20), "  "))
                .isInstanceOf(CustomValidationException.class)
                .hasMessage("Choisissez un commercial.");
    }

    @Test
    void historyRequiresASignedInUser() {
        when(userService.getCurrentUser()).thenReturn(null);
        assertThatThrownBy(() -> service.listFormerTontineMembers(PageRequest.of(0, 20)))
                .isInstanceOf(CustomValidationException.class);

        User blank = mock(User.class);
        when(blank.getUsername()).thenReturn(" ");
        when(userService.getCurrentUser()).thenReturn(blank);
        assertThatThrownBy(() -> service.listFormerTontineMembers(PageRequest.of(0, 20)))
                .isInstanceOf(CustomValidationException.class);
    }

    @Test
    void staffReadsOnlyTheChosenCommercialCollectionsOfAFormerMember() {
        User manager = staff(UserPermissionConstant.EDIT_TONTINE);
        when(userService.getCurrentUser()).thenReturn(manager);
        TontineMember member = memberHeldBy("com.b");
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.existsByTontineMember_IdAndStateAndCommercialUsernameIgnoreCase(
                7L, State.ENABLED, "COM003")).thenReturn(true);
        FormerTontineCollectionDto own = new FormerTontineCollectionDto(
                7L, 3L, 500.0, LocalDateTime.of(2026, 4, 1, 8, 0), "COL-3");
        when(tontineCollectionRepository.findOwnCollections(7L, "COM003")).thenReturn(List.of(own));

        FormerTontineMemberDetailDto detail = service.getFormerTontineMember(7L, "COM003");

        assertThat(detail.collections()).containsExactly(own);
        assertThat(detail.ownCollectionsTotal()).isEqualTo(500.0);
    }

    @Test
    void staffCannotOpenTheCurrentHolderAsFormer() {
        User manager = staff(UserPermissionConstant.ADMIN);
        when(userService.getCurrentUser()).thenReturn(manager);
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(memberHeldBy("COM003")));

        assertThatThrownBy(() -> service.getFormerTontineMember(7L, "COM003"))
                .isInstanceOf(CustomValidationException.class);
    }

    @Test
    void staffAcceptsAFormerLinkThatOnlyExistsInCollectorHistory() {
        User manager = staff(UserPermissionConstant.CONSULT_TONTINE);
        when(userService.getCurrentUser()).thenReturn(manager);
        when(tontineMemberRepository.findById(7L)).thenReturn(Optional.of(memberHeldBy("com.b")));
        when(tontineCollectionRepository.existsByTontineMember_IdAndStateAndCommercialUsernameIgnoreCase(
                7L, State.ENABLED, "COM003")).thenReturn(false);
        when(clientCollectorHistoryRepository.existsByClientIdAndCollectorTypeAndOldCollectorIgnoreCaseAndState(
                4L, ClientCollectorType.TONTINE, "COM003", State.ENABLED)).thenReturn(true);
        when(tontineCollectionRepository.findOwnCollections(7L, "COM003")).thenReturn(List.of());

        assertThat(service.getFormerTontineMember(7L, "COM003").collections()).isEmpty();
    }

    @Test
    void staffRejectsAMemberWithNoFormerLink() {
        User manager = staff(UserPermissionConstant.ADMIN);
        when(userService.getCurrentUser()).thenReturn(manager);
        TontineMember member = new TontineMember();
        member.setId(8L);
        member.setState(State.ENABLED);
        when(tontineMemberRepository.findById(8L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.existsByTontineMember_IdAndStateAndCommercialUsernameIgnoreCase(
                8L, State.ENABLED, "COM003")).thenReturn(false);

        assertThatThrownBy(() -> service.getFormerTontineMember(8L, "COM003"))
                .isInstanceOf(CustomValidationException.class);
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

    private static User staff(String permissionName) {
        User user = mock(User.class);
        UserPermission permission = mock(UserPermission.class);
        when(user.getUsername()).thenReturn("manager");
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        when(permission.getName()).thenReturn(permissionName);
        when(user.getPermissions()).thenReturn(Set.of(permission));
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
