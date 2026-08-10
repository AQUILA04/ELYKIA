package com.optimize.elykia.core.service.tontine;

import com.itextpdf.html2pdf.HtmlConverter;
import com.lowagie.text.DocumentException;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.SessionStatsDto;
import com.optimize.elykia.core.dto.TontineCommercialMemberExportProjectionDto;
import com.optimize.elykia.core.dto.TontineCommercialMembersExportPdfDto;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.dto.TontineMemberDetailsExportPdfDto;
import com.optimize.elykia.core.dto.TontineMemberMonthlyAggregateDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.report.PdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class TontineExportService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final TontineSessionService sessionService;
    private final TontineDeliveryService deliveryService;
    private final TontineService tontineService;
    private final TontineMemberRepository memberRepository;
    private final TontineCollectionRepository collectionRepository;
    private final TemplateEngine templateEngine;
    private final PdfService pdfService;

    /**
     * Exporte les données d'une session en Excel
     */
    public InputStream exportSessionToExcel(Long sessionId) throws IOException {
        log.info("Exporting session {} to Excel", sessionId);

        // Récupérer les données
        SessionStatsDto stats = sessionService.getSessionStats(sessionId);
        List<TontineMember> members = sessionService.getSessionMembers(sessionId, 
            org.springframework.data.domain.Pageable.unpaged()).getContent();

        if (members.isEmpty()) {
            throw new ResourceNotFoundException("Aucune donnée disponible pour cette session");
        }

        // Créer le workbook Excel
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // Feuille 1 : Statistiques générales
            createStatsSheet(workbook, stats);

            // Feuille 2 : Liste des membres
            createMembersSheet(workbook, members);

            // Feuille 3 : Détail des collectes
            createCollectionsSheet(workbook, members);

            // Feuille 4 : Détail des livraisons
            createDeliveriesSheet(workbook, members);

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    /**
     * Exporte les données d'une session en PDF
     */
    public InputStream exportSessionToPdf(Long sessionId) throws DocumentException {
        log.info("Exporting session {} to PDF", sessionId);

        // Récupérer les données
        SessionStatsDto stats = sessionService.getSessionStats(sessionId);
        List<TontineMember> members = sessionService.getSessionMembers(sessionId,
            org.springframework.data.domain.Pageable.unpaged()).getContent();

        if (members.isEmpty()) {
            throw new ResourceNotFoundException("Aucune donnée disponible pour cette session");
        }

        // Créer le contexte Thymeleaf
        Context context = new Context();
        context.setVariable("stats", stats);
        context.setVariable("members", members);

        // Générer le HTML
        String html = templateEngine.process("tontine-session-report", context);

        // Convertir en PDF
        return pdfService.generatePdfFromHtml(html, "SESSION_" + stats.getYear());
    }

    /**
     * Export PDF des membres d'un commercial pour la session en cours
     * (total contribué, part société, total disponible + cotisations par mois).
     * Deux requêtes légères : projection membres + agrégats mensuels SQL (COUNT/SUM).
     */
    public byte[] exportCommercialMembersPdf(String commercial) {
        if (!StringUtils.hasText(commercial)) {
            throw new CustomValidationException("Le commercial est obligatoire pour l'export PDF");
        }

        TontineSession session = tontineService.getActiveSession();
        String commercialUsername = commercial.trim();
        Integer sessionYear = session.getYear();

        List<TontineCommercialMemberExportProjectionDto> members = memberRepository
                .findExportProjectionsBySessionYearAndTontineCollector(sessionYear, commercialUsername, State.ENABLED);

        Map<Long, Map<YearMonth, TontineMemberMonthlyAggregateDto>> monthlyByMember = members.isEmpty()
                ? Map.of()
                : collectionRepository
                        .sumMonthlyBySessionYearAndTontineCollector(sessionYear, commercialUsername, State.ENABLED)
                        .stream()
                        .collect(Collectors.groupingBy(
                                TontineMemberMonthlyAggregateDto::getMemberId,
                                Collectors.toMap(
                                        agg -> YearMonth.of(agg.getYear(), agg.getMonth()),
                                        agg -> agg,
                                        (a, b) -> a,
                                        LinkedHashMap::new)));

        YearMonth monthStart = resolveMonthStart(session);
        YearMonth monthEnd = resolveMonthEnd(session);

        List<TontineCommercialMembersExportPdfDto.TontineMemberExportRowDto> rows = members.stream()
                .map(member -> TontineCommercialMembersExportPdfDto.TontineMemberExportRowDto.builder()
                        .clientCode(StringUtils.hasText(member.getClientCode()) ? member.getClientCode() : "—")
                        .clientName(member.getClientName())
                        .quarter(StringUtils.hasText(member.getQuarter()) ? member.getQuarter() : "—")
                        .totalContribution(nullSafe(member.getTotalContribution()))
                        .societyShare(nullSafe(member.getSocietyShare()))
                        .availableContribution(nullSafe(member.getAvailableContribution()))
                        .months(buildMonthlyRows(
                                monthStart,
                                monthEnd,
                                monthlyByMember.getOrDefault(member.getMemberId(), Map.of())))
                        .build())
                .toList();

        double totalContribution = rows.stream()
                .mapToDouble(TontineCommercialMembersExportPdfDto.TontineMemberExportRowDto::getTotalContribution).sum();
        double totalSocietyShare = rows.stream()
                .mapToDouble(TontineCommercialMembersExportPdfDto.TontineMemberExportRowDto::getSocietyShare).sum();
        double totalAvailable = rows.stream()
                .mapToDouble(TontineCommercialMembersExportPdfDto.TontineMemberExportRowDto::getAvailableContribution).sum();

        TontineCommercialMembersExportPdfDto contextDto = TontineCommercialMembersExportPdfDto.builder()
                .title("Membres tontine — session en cours")
                .commercial(commercialUsername)
                .sessionYear(sessionYear)
                .generationDate(LocalDateTime.now().format(DATE_TIME_FORMATTER))
                .members(rows)
                .memberCount(rows.size())
                .totalContribution(totalContribution)
                .totalSocietyShare(totalSocietyShare)
                .totalAvailable(totalAvailable)
                .build();

        return renderPdf("tontine-commercial-members-export", contextDto);
    }

    private YearMonth resolveMonthStart(TontineSession session) {
        if (session.getStartDate() != null) {
            return YearMonth.from(session.getStartDate());
        }
        int year = session.getYear() != null ? session.getYear() : LocalDateTime.now().getYear();
        return YearMonth.of(year, 2);
    }

    private YearMonth resolveMonthEnd(TontineSession session) {
        if (session.getEndDate() != null) {
            return YearMonth.from(session.getEndDate());
        }
        int year = session.getYear() != null ? session.getYear() : LocalDateTime.now().getYear();
        return YearMonth.of(year, 11);
    }

    private List<TontineCommercialMembersExportPdfDto.TontineMonthlyExportRowDto> buildMonthlyRows(
            YearMonth start,
            YearMonth end,
            Map<YearMonth, TontineMemberMonthlyAggregateDto> aggregates) {
        List<TontineCommercialMembersExportPdfDto.TontineMonthlyExportRowDto> months = new ArrayList<>();
        YearMonth cursor = start;
        while (!cursor.isAfter(end)) {
            TontineMemberMonthlyAggregateDto agg = aggregates.get(cursor);
            months.add(TontineCommercialMembersExportPdfDto.TontineMonthlyExportRowDto.builder()
                    .monthLabel(formatMonthLabel(cursor))
                    .collectionCount(agg != null ? (int) agg.getCollectionCount() : 0)
                    .totalAmount(agg != null ? agg.getTotalAmount() : 0.0)
                    .build());
            cursor = cursor.plusMonths(1);
        }
        return months;
    }

    private String formatMonthLabel(YearMonth yearMonth) {
        String monthLabel = yearMonth.getMonth().getDisplayName(TextStyle.FULL_STANDALONE, Locale.FRENCH);
        monthLabel = monthLabel.substring(0, 1).toUpperCase(Locale.FRENCH) + monthLabel.substring(1);
        return monthLabel + " " + yearMonth.getYear();
    }

    /**
     * Export PDF du détail des cotisations d'un membre.
     */
    public byte[] exportMemberDetailsPdf(Long memberId) {
        TontineMember member = tontineService.getById(memberId);
        List<TontineCollection> collections = collectionRepository
                .findByTontineMember_IdAndState(memberId, State.ENABLED, Pageable.unpaged())
                .getContent()
                .stream()
                .sorted(Comparator.comparing(TontineCollection::getCollectionDate,
                        Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .toList();

        List<TontineMemberDetailsExportPdfDto.TontineCollectionExportRowDto> collectionRows = collections.stream()
                .map(c -> TontineMemberDetailsExportPdfDto.TontineCollectionExportRowDto.builder()
                        .collectionDate(c.getCollectionDate() != null
                                ? c.getCollectionDate().format(DATE_TIME_FORMATTER) : "—")
                        .amount(nullSafe(c.getAmount()))
                        .societyShareAmount(nullSafe(c.getSocietyShareAmount()))
                        .commercialUsername(c.getCommercialUsername() != null ? c.getCommercialUsername() : "—")
                        .reference(c.getReference())
                        .build())
                .toList();

        double collectionsTotal = collectionRows.stream()
                .mapToDouble(TontineMemberDetailsExportPdfDto.TontineCollectionExportRowDto::getAmount)
                .sum();

        String clientName = member.getClient() != null ? member.getClient().getFullName() : "N/A";
        String clientCode = member.getClient() != null && member.getClient().getCode() != null
                ? member.getClient().getCode() : "—";
        String commercial = member.getClient() != null && StringUtils.hasText(member.getClient().getTontineCollector())
                ? member.getClient().getTontineCollector() : "—";

        TontineMemberDetailsExportPdfDto contextDto = TontineMemberDetailsExportPdfDto.builder()
                .title("Détail des cotisations membre")
                .clientCode(clientCode)
                .clientName(clientName)
                .commercial(commercial)
                .sessionYear(member.getTontineSession() != null ? member.getTontineSession().getYear() : null)
                .deliveryStatus(member.getDeliveryStatus() != null ? member.getDeliveryStatus().name() : "—")
                .registrationDate(member.getRegistrationDate() != null
                        ? member.getRegistrationDate().format(DATE_TIME_FORMATTER) : "—")
                .generationDate(LocalDateTime.now().format(DATE_TIME_FORMATTER))
                .dailyStake(nullSafe(member.getAmount()))
                .totalContribution(nullSafe(member.getTotalContribution()))
                .societyShare(nullSafe(member.getSocietyShare()))
                .availableContribution(nullSafe(member.getAvailableContribution()))
                .validatedMonths(member.getValidatedMonths() != null ? member.getValidatedMonths() : 0)
                .currentMonthDays(member.getCurrentMonthDays() != null ? member.getCurrentMonthDays() : 0)
                .collections(collectionRows)
                .collectionsTotal(collectionsTotal)
                .collectionsCount(collectionRows.size())
                .build();

        return renderPdf("tontine-member-details-export", contextDto);
    }

    private byte[] renderPdf(String template, Object contextDto) {
        Context context = new Context();
        context.setVariable("context", contextDto);
        String html = templateEngine.process(template, context);
        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }

    private double nullSafe(Double value) {
        return value != null ? value : 0.0;
    }

    /**
     * Crée la feuille des statistiques générales
     */
    private void createStatsSheet(Workbook workbook, SessionStatsDto stats) {
        Sheet sheet = workbook.createSheet("Statistiques");

        // Styles
        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle dataStyle = createDataStyle(workbook);

        int rowNum = 0;

        // Titre
        Row titleRow = sheet.createRow(rowNum++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("RAPPORT DE SESSION TONTINE - " + stats.getYear());
        titleCell.setCellStyle(headerStyle);

        rowNum++; // Ligne vide

        // Statistiques principales
        createStatRow(sheet, rowNum++, "Nombre total de membres", stats.getTotalMembers(), headerStyle, dataStyle);
        createStatRow(sheet, rowNum++, "Montant total collecté", stats.getTotalCollected(), headerStyle, dataStyle);
        createStatRow(sheet, rowNum++, "Contribution moyenne", stats.getAverageContribution(), headerStyle, dataStyle);
        createStatRow(sheet, rowNum++, "Membres livrés", stats.getDeliveredCount(), headerStyle, dataStyle);
        createStatRow(sheet, rowNum++, "Membres en attente", stats.getPendingCount(), headerStyle, dataStyle);
        createStatRow(sheet, rowNum++, "Taux de livraison (%)", stats.getDeliveryRate(), headerStyle, dataStyle);

        rowNum++; // Ligne vide

        // Top commerciaux
        if (stats.getTopCommercials() != null && !stats.getTopCommercials().isEmpty()) {
            Row topCommRow = sheet.createRow(rowNum++);
            Cell topCommCell = topCommRow.createCell(0);
            topCommCell.setCellValue("TOP COMMERCIAUX");
            topCommCell.setCellStyle(headerStyle);

            Row headerRow = sheet.createRow(rowNum++);
            String[] headers = {"Commercial", "Nombre de membres", "Montant collecté"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            for (var commercial : stats.getTopCommercials()) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(commercial.getUsername());
                row.createCell(1).setCellValue(commercial.getMemberCount());
                row.createCell(2).setCellValue(commercial.getTotalCollected());
            }
        }

        // Auto-size columns
        for (int i = 0; i < 3; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    /**
     * Crée la feuille de la liste des membres
     */
    private void createMembersSheet(Workbook workbook, List<TontineMember> members) {
        Sheet sheet = workbook.createSheet("Liste des membres");

        CellStyle headerStyle = createHeaderStyle(workbook);
        CellStyle dataStyle = createDataStyle(workbook);

        int rowNum = 0;

        // En-têtes
        Row headerRow = sheet.createRow(rowNum++);
        String[] headers = {"ID", "Client", "Commercial", "Total Contribution", "Statut", "Date d'inscription"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Données
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        for (TontineMember member : members) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(member.getId());
            row.createCell(1).setCellValue(member.getClient() != null ? member.getClient().getFullName() : "N/A");
            row.createCell(2).setCellValue(member.getClient() != null ? member.getClient().getCollector() : "N/A");
            row.createCell(3).setCellValue(member.getAvailableContribution() != null ? member.getAvailableContribution() : 0.0);
            row.createCell(4).setCellValue(member.getDeliveryStatus().name());
            row.createCell(5).setCellValue(member.getRegistrationDate() != null ? 
                member.getRegistrationDate().format(formatter) : "N/A");
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    /**
     * Crée la feuille des collectes
     */
    private void createCollectionsSheet(Workbook workbook, List<TontineMember> members) {
        Sheet sheet = workbook.createSheet("Détail des collectes");

        CellStyle headerStyle = createHeaderStyle(workbook);

        int rowNum = 0;

        // En-têtes
        Row headerRow = sheet.createRow(rowNum++);
        String[] headers = {"Membre ID", "Client", "Total Contribution"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Données
        for (TontineMember member : members) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(member.getId());
            row.createCell(1).setCellValue(member.getClient() != null ? member.getClient().getFullName() : "N/A");
            row.createCell(2).setCellValue(member.getAvailableContribution() != null ? member.getAvailableContribution() : 0.0);
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    /**
     * Crée la feuille des livraisons
     */
    private void createDeliveriesSheet(Workbook workbook, List<TontineMember> members) {
        Sheet sheet = workbook.createSheet("Détail des livraisons");

        CellStyle headerStyle = createHeaderStyle(workbook);

        int rowNum = 0;

        // En-têtes
        Row headerRow = sheet.createRow(rowNum++);
        String[] headers = {"Membre ID", "Client", "Date livraison", "Montant livré", "Solde restant", "Commercial"};
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Données
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        for (TontineMember member : members) {
            if (member.getDeliveryStatus() == TontineMemberDeliveryStatus.DELIVERED && member.getDelivery() != null) {
                try {
                    TontineDeliveryDto delivery = deliveryService.getDeliveryByMemberId(member.getId());
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(member.getId());
                    row.createCell(1).setCellValue(member.getClient() != null ? member.getClient().getFullName() : "N/A");
                    row.createCell(2).setCellValue(delivery.getDeliveryDate() != null ? 
                        delivery.getDeliveryDate().format(formatter) : "N/A");
                    row.createCell(3).setCellValue(delivery.getTotalAmount() != null ? delivery.getTotalAmount() : 0.0);
                    row.createCell(4).setCellValue(delivery.getRemainingBalance() != null ? delivery.getRemainingBalance() : 0.0);
                    row.createCell(5).setCellValue(delivery.getCommercialUsername() != null ? delivery.getCommercialUsername() : "N/A");
                } catch (Exception e) {
                    log.warn("Could not fetch delivery for member {}", member.getId());
                }
            }
        }

        // Auto-size columns
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    /**
     * Crée une ligne de statistique
     */
    private void createStatRow(Sheet sheet, int rowNum, String label, Object value, 
                               CellStyle headerStyle, CellStyle dataStyle) {
        Row row = sheet.createRow(rowNum);
        Cell labelCell = row.createCell(0);
        labelCell.setCellValue(label);
        labelCell.setCellStyle(headerStyle);

        Cell valueCell = row.createCell(1);
        if (value instanceof Number) {
            valueCell.setCellValue(((Number) value).doubleValue());
        } else {
            valueCell.setCellValue(value.toString());
        }
        valueCell.setCellStyle(dataStyle);
    }

    /**
     * Crée le style pour les en-têtes
     */
    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    /**
     * Crée le style pour les données
     */
    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }
}
