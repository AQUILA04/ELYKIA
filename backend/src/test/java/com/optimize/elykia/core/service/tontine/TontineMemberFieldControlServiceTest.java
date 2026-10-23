package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlMonthDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControlLine;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineMemberFieldControlServiceTest {

    @Mock
    private TontineMemberFieldControlRepository repository;
    @Mock
    private TontineMemberRepository tontineMemberRepository;
    @Mock
    private TontineCollectionRepository tontineCollectionRepository;
    @Mock
    private CarnetEcartRecontrolPolicy recontrolPolicy;
    @InjectMocks
    private TontineMemberFieldControlService service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_rejectsMonthOutsideTontineCalendar() {
        CreateTontineMemberFieldControlDto request = request("CTRL-001", month(2026, 1, "COM003", 25_000.0));
        when(repository.existsByReference("CTRL-001")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member(10L, "COM003")));

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.create(10L, request));
        assertEquals("Le mois 1 n'est pas un mois de session tontine (février–novembre).", exception.getMessage());
        verify(tontineCollectionRepository, never())
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED);
    }

    @Test
    void create_rejectsDuplicateMonthForSameCommercial() {
        CreateTontineMemberFieldControlDto request = request("CTRL-002",
                month(2026, 2, "COM003", 25_000.0), month(2026, 2, "COM003", 30_000.0));
        when(repository.existsByReference("CTRL-002")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member(10L, "COM003")));

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.create(10L, request));
        assertTrue(exception.getMessage().contains("en double"));
        verify(repository, never()).save(any());
    }

    @Test
    void create_rejectsMissingCommercial() {
        CreateTontineMemberFieldControlMonthDto withoutCommercial = month(2026, 2, null, 10_000.0);
        withoutCommercial.setCommercialUsername("  ");
        CreateTontineMemberFieldControlDto request = request("CTRL-004", withoutCommercial);
        when(repository.existsByReference("CTRL-004")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member(10L, "COM003")));

        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.create(10L, request));
        assertEquals("Le commercial est obligatoire pour chaque mois contrôlé.", exception.getMessage());
    }

    @Test
    void create_splitsSystemAmountsByCommercialAndIgnoresClientSystemHint() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("field.agent", "n/a"));
        // Client envoie un systemAmount implicite via notebook seulement ; le serveur recalcule.
        CreateTontineMemberFieldControlDto request = request("CTRL-003",
                month(2026, 2, "COM003", 100_000.0),
                month(2026, 2, "COM015", 40_000.0),
                month(2026, 3, "COM015", 20_000.0));
        request.setObservedAt(LocalDateTime.of(2026, 3, 31, 17, 0));
        request.setNote("Contrôle multi-commerciaux");
        TontineMember member = member(10L, "COM015");
        when(repository.existsByReference("CTRL-003")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED))
                .thenReturn(List.of(
                        collection(80_000.0, LocalDateTime.of(2026, 2, 4, 9, 0), "COM003"),
                        collection(20_000.0, LocalDateTime.of(2026, 2, 10, 9, 0), "COM003"),
                        collection(35_000.0, LocalDateTime.of(2026, 2, 12, 9, 0), "COM015"),
                        collection(30_000.0, LocalDateTime.of(2026, 3, 12, 9, 0), "COM015"),
                        collection(50_000.0, LocalDateTime.of(2025, 2, 4, 9, 0), "COM003")));
        when(repository.save(any(TontineMemberFieldControl.class))).thenAnswer(invocation -> {
            TontineMemberFieldControl control = invocation.getArgument(0);
            control.setId(90L);
            return control;
        });

        TontineMemberFieldControlDto result = service.create(10L, request);

        assertEquals(90L, result.getId());
        assertEquals(160_000.0, result.getNotebookTotalAmount());
        // Système : COM003/fév 100k + COM015/fév 35k + COM015/mars 30k = 165k
        assertEquals(165_000.0, result.getSystemTotalAmount());
        assertEquals(-5_000.0, result.getDifferenceAmount());
        assertEquals(FieldControlStatus.ECART, result.getStatus());
        assertEquals(3, result.getLines().size());
        assertEquals("COM003", result.getLines().get(0).getCommercialUsername());
        assertEquals(100_000.0, result.getLines().get(0).getSystemAmount());
        assertEquals("COM015", result.getLines().get(1).getCommercialUsername());
        assertEquals(35_000.0, result.getLines().get(1).getSystemAmount());
        assertEquals(2, result.getCollectors().size());
        assertTrue(result.getUncontrolledCollectors().isEmpty());
        verify(repository).save(any(TontineMemberFieldControl.class));
    }

    @Test
    void create_allowsSameMonthForDifferentCommercials() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("field.agent", "n/a"));
        CreateTontineMemberFieldControlDto request = request("CTRL-005",
                month(2026, 2, "COM003", 50_000.0),
                month(2026, 2, "COM015", 50_000.0));
        when(repository.existsByReference("CTRL-005")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member(10L, "COM015")));
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED))
                .thenReturn(List.of(
                        collection(50_000.0, LocalDateTime.of(2026, 2, 4, 9, 0), "COM003"),
                        collection(50_000.0, LocalDateTime.of(2026, 2, 10, 9, 0), "COM015")));
        when(repository.save(any(TontineMemberFieldControl.class))).thenAnswer(invocation -> {
            TontineMemberFieldControl control = invocation.getArgument(0);
            control.setId(91L);
            return control;
        });

        TontineMemberFieldControlDto result = service.create(10L, request);

        assertEquals(FieldControlStatus.CONFORME, result.getStatus());
        assertEquals(2, result.getLines().size());
        assertEquals(2, result.getCollectors().size());
    }

    @Test
    void create_listsUncontrolledCommercialWhenOnlyOneIsChecked() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("field.agent", "n/a"));
        CreateTontineMemberFieldControlDto request = request("CTRL-006",
                month(2026, 2, "COM003", 100_000.0));
        when(repository.existsByReference("CTRL-006")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member(10L, "COM015")));
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED))
                .thenReturn(List.of(
                        collection(100_000.0, LocalDateTime.of(2026, 2, 4, 9, 0), "COM003"),
                        collection(40_000.0, LocalDateTime.of(2026, 3, 4, 9, 0), "COM015")));
        when(repository.save(any(TontineMemberFieldControl.class))).thenAnswer(invocation -> {
            TontineMemberFieldControl control = invocation.getArgument(0);
            control.setId(92L);
            return control;
        });

        TontineMemberFieldControlDto result = service.create(10L, request);

        assertEquals(List.of("COM015"), result.getUncontrolledCollectors());
        assertEquals(1, result.getCollectors().size());
        assertEquals(FieldControlStatus.CONFORME, result.getCollectors().get(0).getStatus());
    }

    @Test
    void getLatest_exposesLegacyLinesWithoutCommercial() {
        TontineMemberFieldControl legacy = new TontineMemberFieldControl();
        legacy.setId(5L);
        legacy.setReference("LEGACY");
        legacy.setNotebookTotalAmount(10_000.0);
        legacy.setSystemTotalAmount(10_000.0);
        legacy.setDifferenceAmount(0.0);
        legacy.setStatus(FieldControlStatus.CONFORME);
        legacy.setObservedAt(LocalDateTime.of(2025, 6, 1, 10, 0));
        legacy.setObservedBy("old.agent");
        TontineMemberFieldControlLine line = new TontineMemberFieldControlLine();
        line.setYear(2025);
        line.setMonth(5);
        line.setNotebookAmount(10_000.0);
        line.setSystemAmount(10_000.0);
        line.setDifferenceAmount(0.0);
        legacy.addLine(line);
        TontineMember member = member(10L, "COM015");
        legacy.setTontineMember(member);

        when(repository.findFirstByTontineMember_idAndStateOrderByObservedAtDesc(10L, State.ENABLED))
                .thenReturn(Optional.of(legacy));
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED))
                .thenReturn(List.of(collection(10_000.0, LocalDateTime.of(2025, 5, 1, 9, 0), "COM015")));
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member));

        TontineMemberFieldControlDto result = service.getLatest(10L);

        assertEquals(1, result.getLines().size());
        assertEquals(null, result.getLines().get(0).getCommercialUsername());
        assertTrue(result.getCollectors().isEmpty());
        assertEquals(List.of("COM015"), result.getUncontrolledCollectors());
    }

    @Test
    void create_updatesPendingEcartInsteadOfAppendingHistory() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("field.agent", "n/a"));
        TontineMember member = member(10L, "COM003");
        TontineMemberFieldControl pending = new TontineMemberFieldControl();
        pending.setId(77L);
        pending.setTontineMember(member);
        pending.setReference("CTRL-OLD");
        pending.setStatus(FieldControlStatus.ECART);
        pending.setObservedAt(LocalDateTime.of(2026, 2, 1, 8, 0));
        pending.setObservedBy("field.agent");
        TontineMemberFieldControlLine previous = new TontineMemberFieldControlLine();
        previous.setId(5L);
        previous.setYear(2026);
        previous.setMonth(2);
        previous.setCommercialUsername("COM003");
        previous.setNotebookAmount(120_000.0);
        previous.setSystemAmount(100_000.0);
        previous.setDifferenceAmount(20_000.0);
        pending.addLine(previous);

        CreateTontineMemberFieldControlDto request = request("CTRL-NEW", month(2026, 2, "COM003", 110_000.0));
        when(repository.existsByReference("CTRL-NEW")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member));
        when(repository.findFirstByTontineMember_idAndStateOrderByObservedAtDesc(10L, State.ENABLED))
                .thenReturn(Optional.of(pending));
        when(recontrolPolicy.mustModifyTontine(pending)).thenReturn(true);
        when(recontrolPolicy.terminalTontineLineIds(pending)).thenReturn(Set.of());
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED))
                .thenReturn(List.of(collection(100_000.0, LocalDateTime.of(2026, 2, 4, 9, 0), "COM003")));
        when(repository.save(any(TontineMemberFieldControl.class))).thenAnswer(invocation -> invocation.getArgument(0));

        TontineMemberFieldControlDto result = service.create(10L, request);

        assertEquals(77L, result.getId());
        assertEquals("CTRL-NEW", result.getReference());
        assertEquals(110_000.0, result.getNotebookTotalAmount());
        assertEquals(10_000.0, result.getDifferenceAmount());
        assertEquals(FieldControlStatus.ECART, result.getStatus());
        assertEquals(1, result.getLines().size());
    }

    @Test
    void create_appendsControlWhenLatestEcartIsAlreadyAccepted() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("field.agent", "n/a"));
        TontineMember member = member(10L, "COM003");
        TontineMemberFieldControl accepted = new TontineMemberFieldControl();
        accepted.setId(77L);
        accepted.setTontineMember(member);
        accepted.setReference("CTRL-OLD");
        accepted.setStatus(FieldControlStatus.ECART);
        accepted.addLine(line(2026, 2, "COM003", 110_000.0, 100_000.0));

        CreateTontineMemberFieldControlDto request = request("CTRL-NEXT", month(2026, 2, "COM003", 100_000.0));
        when(repository.existsByReference("CTRL-NEXT")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member));
        when(repository.findFirstByTontineMember_idAndStateOrderByObservedAtDesc(10L, State.ENABLED))
                .thenReturn(Optional.of(accepted));
        when(recontrolPolicy.mustModifyTontine(accepted)).thenReturn(false);
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED))
                .thenReturn(List.of(collection(100_000.0, LocalDateTime.of(2026, 2, 4, 9, 0), "COM003")));
        when(repository.save(any(TontineMemberFieldControl.class))).thenAnswer(invocation -> {
            TontineMemberFieldControl control = invocation.getArgument(0);
            assertNotEquals(77L, control.getId());
            control.setId(88L);
            return control;
        });

        TontineMemberFieldControlDto result = service.create(10L, request);

        assertEquals(88L, result.getId());
        assertEquals(FieldControlStatus.CONFORME, result.getStatus());
    }

    private TontineMemberFieldControlLine line(
            int year, int month, String commercial, double notebook, double system) {
        TontineMemberFieldControlLine line = new TontineMemberFieldControlLine();
        line.setYear(year);
        line.setMonth(month);
        line.setCommercialUsername(commercial);
        line.setNotebookAmount(notebook);
        line.setSystemAmount(system);
        line.setDifferenceAmount(notebook - system);
        return line;
    }

    private CreateTontineMemberFieldControlDto request(String reference, CreateTontineMemberFieldControlMonthDto... months) {
        CreateTontineMemberFieldControlDto request = new CreateTontineMemberFieldControlDto();
        request.setReference(reference);
        request.setMonths(List.of(months));
        return request;
    }

    private CreateTontineMemberFieldControlMonthDto month(
            int year, int month, String commercial, double notebookAmount) {
        CreateTontineMemberFieldControlMonthDto dto = new CreateTontineMemberFieldControlMonthDto();
        dto.setYear(year);
        dto.setMonth(month);
        dto.setCommercialUsername(commercial);
        dto.setNotebookAmount(notebookAmount);
        return dto;
    }

    private TontineMember member(Long id, String currentCollector) {
        TontineMember member = new TontineMember();
        member.setId(id);
        Client client = new Client();
        client.setTontineCollector(currentCollector);
        member.setClient(client);
        return member;
    }

    private TontineCollection collection(double amount, LocalDateTime collectionDate, String commercial) {
        TontineCollection collection = new TontineCollection();
        collection.setAmount(amount);
        collection.setCollectionDate(collectionDate);
        collection.setCommercialUsername(commercial);
        return collection;
    }
}
