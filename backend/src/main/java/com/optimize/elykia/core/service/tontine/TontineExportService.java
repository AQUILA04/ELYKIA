package com.optimize.elykia.core.service.tontine;

import com.lowagie.text.DocumentException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.SessionStatsDto;
import com.optimize.elykia.core.dto.TontineDeliveryDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.service.report.PdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
@Slf4j
public class TontineExportService {

    private final TontineSessionService sessionService;
    private final TontineDeliveryService deliveryService;
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
