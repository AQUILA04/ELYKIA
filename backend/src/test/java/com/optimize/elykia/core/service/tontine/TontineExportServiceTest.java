package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.SessionStatsDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.report.PdfService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TontineExportServiceTest {

    @Mock private TontineSessionService sessionService;
    @Mock private TontineDeliveryService deliveryService;
    @Mock private TontineService tontineService;
    @Mock private TontineMemberRepository memberRepository;
    @Mock private TontineCollectionRepository collectionRepository;
    @Mock private TemplateEngine templateEngine;
    @Mock private PdfService pdfService;
    @Mock private SessionStatsDto stats;

    @Test
    void exportCommercialMembersPdf_rejectsBlankCommercialBeforeLoadingSessionOrMembers() {
        // Given
        TontineExportService service = service();

        // When
        CustomValidationException exception = assertThrows(CustomValidationException.class,
                () -> service.exportCommercialMembersPdf(" "));

        // Then
        assertTrue(exception.getMessage().contains("commercial est obligatoire"));
        verify(tontineService, never()).getActiveSession();
        verify(memberRepository, never()).findExportProjectionsBySessionYearAndTontineCollector(any(), any(), any());
    }

    @Test
    void exportSessionToExcel_rejectsSessionWithoutMembersBeforeCreatingWorkbook() throws IOException {
        // Given
        TontineExportService service = service();
        when(sessionService.getSessionStats(18L)).thenReturn(stats);
        Page<TontineMember> emptyMembers = new PageImpl<>(List.of());
        when(sessionService.getSessionMembers(any(), any())).thenReturn(emptyMembers);

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> service.exportSessionToExcel(18L));

        // Then
        assertTrue(exception.getMessage().contains("Aucune donnée disponible"));
        verify(sessionService).getSessionStats(18L);
    }

    @Test
    void exportSessionToPdf_rejectsSessionWithoutMembersBeforeRenderingTemplate() throws Exception {
        // Given
        TontineExportService service = service();
        when(sessionService.getSessionStats(18L)).thenReturn(stats);
        when(sessionService.getSessionMembers(any(), any())).thenReturn(new PageImpl<>(List.of()));

        // When
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> service.exportSessionToPdf(18L));

        // Then
        assertTrue(exception.getMessage().contains("Aucune donnée disponible"));
        verify(templateEngine, never()).process(anyString(), any(Context.class));
        verify(pdfService, never()).generatePdfFromHtml(any(), any());
    }

    private TontineExportService service() {
        return new TontineExportService(sessionService, deliveryService, tontineService, memberRepository,
                collectionRepository, templateEngine, pdfService);
    }
}
