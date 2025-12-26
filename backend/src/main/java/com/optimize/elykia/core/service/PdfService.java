package com.optimize.elykia.core.service;

import com.itextpdf.html2pdf.HtmlConverter;
import com.lowagie.text.DocumentException;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.util.DateUtils;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.dto.ItemReleaseSheetDto;
import com.optimize.elykia.core.dto.PrintOperationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

import com.optimize.elykia.core.dto.RestockNeededDto;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfService {
    private final TemplateEngine templateEngine;
    private final CreditService creditService;
    private final ReportService reportService;
    private final AccountingDayService accountingDayService;
    private final OrderService orderService; // Injected OrderService
    @Value(value = "${app.folder}")
    private String folder;

    public InputStream generateRestockNeededPdf() throws DocumentException {
        List<RestockNeededDto> data = orderService.getRestockNeededReportData();
        if (data.isEmpty()) {
            throw new ResourceNotFoundException("Aucun article ne nécessite de réapprovisionnement pour le moment.");
        }

        Context context = new Context();
        context.setVariable("restockItems", data);

        String html = templateEngine.process("restock-needed-report", context);
        return generatePdfFromHtml(html, "RAPPORT_REAPPROVISIONNEMENT");
    }



    public InputStream generatePdfFromHtml(String html, String username) throws DocumentException {
        File fileDir = new File(this.folder);
        if(!fileDir.exists() && fileDir.mkdir() ){
            System.out.println("Dossier créer");

        }else {
            System.out.println("Dossier existe deja");
        }
        String filename = fileDir.getAbsolutePath()+ "/" + username + "_" + DateUtils.currentDateFormat() + ".pdf";
        try (OutputStream outputStream = new FileOutputStream(filename)) {
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(outputStream);
        }catch (IOException ioException) {
            log.error("Erreur lors de la génération du fichier PDF: {}", ioException.getMessage());
            throw new RuntimeException("Erreur lors de la génération du fichier PDF: "+ ioException.getMessage());
        }
        try {
            return new FileInputStream(new File(filename));
        } catch (IOException ex) {
            log.debug("Erreur downloading generated files: {}", ex.getMessage());
            throw new RuntimeException("error.downloading.generated.files");
        }
    }

    public String generateHtmlFromTemplate(PrintOperationDto operationDto) {
        if (Objects.isNull(operationDto.getTotalElements()) || operationDto.getTotalElements() <= 0) {
            throw new ResourceNotFoundException("Aucune donnée disponible pour télécharger !");
        }
        Context context = new Context();
        context.setVariable("operation", operationDto);
        return templateEngine.process("daily-operation-print", context);
    }

    public String generateItemReleaseHtmlFromTemplate(ItemReleaseSheetDto dto) {
        if (Objects.isNull(dto) || Objects.isNull(dto.getArticles()) || dto.getArticles().isEmpty()) {
            throw new ResourceNotFoundException("Aucune donnée disponible pour télécharger !");
        }
        Context context = new Context();
        context.setVariable("item", dto);
        return templateEngine.process("item-release-sheet", context);
    }

    public InputStream printDailyOperationPdf() throws DocumentException {
        PrintOperationDto dto = PrintOperationDto.from(creditService.getCreditByCollector());
        String html = generateHtmlFromTemplate(dto);
        return generatePdfFromHtml(html, dto.getCollector());
    }

    public InputStream printItemReleaseSheetPdf(String collector, LocalDate releaseDate)  throws DocumentException  {
        ItemReleaseSheetDto dto = reportService.getItemReleaseSheetByCollector(collector, releaseDate);
        String html = generateItemReleaseHtmlFromTemplate(dto);
        return generatePdfFromHtml(html, "FICHE_SORTIE_ARTICLES_" + collector);
    }

    /**
     * Génère un PDF de fiche de sortie d'articles et le sauvegarde dans un dossier spécifique
     * @param collector le nom du collecteur
     * @return le chemin du fichier sauvegardé
     * @throws DocumentException en cas d'erreur lors de la génération du PDF
     */
    @Transactional
    public String saveItemReleaseSheetPdf(String collector, LocalDate releaseDate) throws DocumentException {
        ItemReleaseSheetDto dto = reportService.getItemReleaseSheetByCollector(collector, releaseDate);
        String html = generateItemReleaseHtmlFromTemplate(dto);
        releaseDate = Objects.nonNull(releaseDate) ? releaseDate : LocalDate.now();
        String dateFormat = DateUtils.simpleDateFormat(releaseDate).replaceAll(" ","-");

        // Création du nom de fichier avec date et heure
        String filename;
        if ("TOUT".equals(collector)) {
            filename = "FICHE_TOTAL_SORTIE_ARTICLES_" + dateFormat + ".pdf";
        } else {
            filename = "FICHE_SORTIE_ARTICLES_" + collector + "_" + dateFormat + ".pdf";
        }

        // Création du chemin du dossier de destination
        String userHome = System.getProperty("user.home");
        File outputFile = getFile(userHome, dateFormat, filename);

        try (OutputStream outputStream = new FileOutputStream(outputFile)) {
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(outputStream);
            log.info("PDF sauvegardé avec succès: {}", outputFile.getAbsolutePath());
            return outputFile.getAbsolutePath();
        } catch (IOException ioException) {
            log.error("Erreur lors de la génération du fichier PDF: {}", ioException.getMessage());
            throw new RuntimeException("Erreur lors de la génération du fichier PDF: "+ ioException.getMessage());
        }
    }

    private static File getFile(String userHome, String todayFolder, String filename) {
        File directory = new File(userHome + "/.optimize-elykia-core/item-release/" + todayFolder.replace(" ", "-"));

        // Création des dossiers s'ils n'existent pas
        if (!directory.exists()) {
            boolean created = directory.mkdirs();
            if (!created) {
                throw new ApplicationException("Impossible de créer le dossier de destination: " + directory.getAbsolutePath());
            }
        }

        // Chemin complet du fichier
        File outputFile = new File(directory, filename);
        return outputFile;
    }
    @Transactional
    public String generateItemReleasePDfForCurrentDate() {
        LocalDate now = accountingDayService.getCurrentAccountingDate();
        this.reportService.getCreditRepository()
                .getCollectorWhoReleaseItemCurrentDate(now, ClientType.PROMOTER)
                .forEach(collector -> {
                    try {
                        saveItemReleaseSheetPdf(collector, now);
                    } catch (DocumentException e) {
                        throw new RuntimeException(e);
                    }
                });
        try {
            saveItemReleaseSheetPdf("TOUT", now);
        } catch (DocumentException e) {
            throw new RuntimeException(e);
        }

        this.reportService.getCreditRepository().updateReleasePrinted(now);
        return "success:true";
    }

    public String generateItemReleasePDfForReleaseDate(LocalDate releaseDate) {
        this.reportService.getCreditRepository()
                .getCollectorWhoReleaseItemByReleaseDate(releaseDate, ClientType.PROMOTER)
                .forEach(collector -> {
                    try {
                        saveItemReleaseSheetPdf(collector, null);
                    } catch (DocumentException e) {
                        throw new RuntimeException(e);
                    }
                });
        try {
            saveItemReleaseSheetPdf("TOUT", null);
        } catch (DocumentException e) {
            throw new RuntimeException(e);
        }

        this.reportService.getCreditRepository().updateReleasePrinted(releaseDate);
        return "success:true";
    }

    public void generateReleasePrintedByDate() {
        List<LocalDate> releaseDates = reportService.getCreditRepository().getAllNotPrintedReleaseDate();
        releaseDates.stream()
                .filter(date -> LocalDate.now().isEqual(date))
                .forEach(this::generateItemReleasePDfForReleaseDate);
    }
}
