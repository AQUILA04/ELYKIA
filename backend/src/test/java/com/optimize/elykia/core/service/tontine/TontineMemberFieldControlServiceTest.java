package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlMonthDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    @InjectMocks
    private TontineMemberFieldControlService service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void create_rejectsMonthOutsideTontineCalendar() {
        // Given
        CreateTontineMemberFieldControlDto request = request("CTRL-001", month(2026, 1, 25_000.0));
        when(repository.existsByReference("CTRL-001")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member(10L)));

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.create(10L, request));
        assertEquals("Le mois 1 n'est pas un mois de session tontine (février–novembre).", exception.getMessage());
        verify(tontineCollectionRepository, never())
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED);
    }

    @Test
    void create_rejectsDuplicateMonthWithinOneControl() {
        // Given
        CreateTontineMemberFieldControlDto request = request("CTRL-002",
                month(2026, 2, 25_000.0), month(2026, 2, 30_000.0));
        when(repository.existsByReference("CTRL-002")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member(10L)));

        // When / Then
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.create(10L, request));
        assertEquals("Le mois 2026-2 est saisi en double.", exception.getMessage());
        verify(repository, never()).save(any());
    }

    @Test
    void create_aggregatesSystemCollectionsAndMarksDifference() {
        // Given
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("field.agent", "n/a"));
        CreateTontineMemberFieldControlDto request = request("  CTRL-003  ",
                month(2026, 2, 130_000.0), month(2026, 3, 20_000.0));
        request.setObservedAt(LocalDateTime.of(2026, 3, 31, 17, 0));
        request.setNote("Contrôle mensuel terrain");
        TontineMember member = member(10L);
        when(repository.existsByReference("CTRL-003")).thenReturn(false);
        when(tontineMemberRepository.findById(10L)).thenReturn(Optional.of(member));
        when(tontineCollectionRepository.findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(10L, State.ENABLED))
                .thenReturn(List.of(
                        collection(100_000.0, LocalDateTime.of(2026, 2, 4, 9, 0)),
                        collection(30_000.0, LocalDateTime.of(2026, 3, 12, 9, 0)),
                        collection(50_000.0, LocalDateTime.of(2025, 2, 4, 9, 0))));
        when(repository.save(any(TontineMemberFieldControl.class))).thenAnswer(invocation -> {
            TontineMemberFieldControl control = invocation.getArgument(0);
            control.setId(90L);
            return control;
        });

        // When
        TontineMemberFieldControlDto result = service.create(10L, request);

        // Then
        assertEquals(90L, result.getId());
        assertEquals("CTRL-003", result.getReference());
        assertEquals(150_000.0, result.getNotebookTotalAmount());
        assertEquals(130_000.0, result.getSystemTotalAmount());
        assertEquals(20_000.0, result.getDifferenceAmount());
        assertEquals(FieldControlStatus.ECART, result.getStatus());
        assertEquals("field.agent", result.getObservedBy());
        assertEquals(2, result.getLines().size());
        assertEquals(30_000.0, result.getLines().get(1).getSystemAmount());
        verify(repository).save(any(TontineMemberFieldControl.class));
    }

    private CreateTontineMemberFieldControlDto request(String reference, CreateTontineMemberFieldControlMonthDto... months) {
        CreateTontineMemberFieldControlDto request = new CreateTontineMemberFieldControlDto();
        request.setReference(reference);
        request.setMonths(List.of(months));
        return request;
    }

    private CreateTontineMemberFieldControlMonthDto month(int year, int month, double notebookAmount) {
        CreateTontineMemberFieldControlMonthDto dto = new CreateTontineMemberFieldControlMonthDto();
        dto.setYear(year);
        dto.setMonth(month);
        dto.setNotebookAmount(notebookAmount);
        return dto;
    }

    private TontineMember member(Long id) {
        TontineMember member = new TontineMember();
        member.setId(id);
        return member;
    }

    private TontineCollection collection(double amount, LocalDateTime collectionDate) {
        TontineCollection collection = new TontineCollection();
        collection.setAmount(amount);
        collection.setCollectionDate(collectionDate);
        return collection;
    }
}
