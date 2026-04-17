package com.optimize.elykia.core.controller.report;

import com.lowagie.text.DocumentException;
import com.optimize.common.entities.util.DateUtils;
import com.optimize.elykia.core.service.accounting.AccountingDayService;
import com.optimize.elykia.core.service.report.PdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.io.*;
import java.nio.file.*;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/pdf")
@Slf4j
@CrossOrigin
public class PdfController {
    private final String baseDir = System.getProperty("user.home") + "/.optimize-elykia-core/item-release/";
    private final AccountingDayService accountingDayService;
    private final PdfService pdfService;

    @GetMapping("/list-today-files")
    public List<String> listTodayFiles() {
        String todayFolder = DateUtils.simpleDateFormat(accountingDayService.getCurrentAccountingDate());
        File dir = new File(baseDir + todayFolder.replaceAll(" ", "-"));
        if (!dir.exists() || !dir.isDirectory()) return List.of();
        return List.of(dir.list((d, name) -> name.endsWith(".pdf")));
    }

    @GetMapping("/download/{filename}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String filename) throws IOException {
        String todayFolder = DateUtils.simpleDateFormat(accountingDayService.getCurrentAccountingDate());
        Path file = Paths.get(baseDir + todayFolder.replaceAll(" ", "-"), filename);
        if (!Files.exists(file)) return ResponseEntity.notFound().build();
        InputStreamResource resource = new InputStreamResource(new FileInputStream(file.toFile()));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename)
                .contentType(MediaType.APPLICATION_PDF)
                .body(resource);
    }

    @GetMapping("/list-old-files")
    public List<String> listOldFolders() {
        try {
            String todayFolder = DateUtils.simpleDateFormat(accountingDayService.getCurrentAccountingDate());
            String todayFolderName = todayFolder.replaceAll(" ", "-");

            File baseDirectory = new File(baseDir);

            if (!baseDirectory.exists() || !baseDirectory.isDirectory()) {
                return List.of();
            }

            File[] files = baseDirectory.listFiles();
            if (files == null) {
                return List.of();
            }

            return Arrays.stream(files)
                    .filter(File::isDirectory)
                    .filter(dir -> !dir.getName().equals(todayFolderName))
                    .map(File::getName)
                    .collect(Collectors.toList());

        } catch (SecurityException e) {
            // Gestion des erreurs de permission
            return List.of();
        }
    }

    @GetMapping("/download-all-today")
    public ResponseEntity<Resource> downloadAllToday() throws IOException {
        String todayFolder = DateUtils.simpleDateFormat(accountingDayService.getCurrentAccountingDate());
        File dir = new File(baseDir + todayFolder.replaceAll(" ", "-") + File.separator);
        File[] files = dir.listFiles((d, name) -> name.endsWith(".pdf"));
        if (files == null || files.length == 0) return ResponseEntity.notFound().build();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (File pdf : files) {
                zos.putNextEntry(new ZipEntry(pdf.getName()));
                Files.copy(pdf.toPath(), zos);
                zos.closeEntry();
            }
        }
        InputStreamResource resource = new InputStreamResource(new ByteArrayInputStream(baos.toByteArray()));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=all-today-pdfs.zip")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }

    @PostMapping("/download-selected")
    public ResponseEntity<Resource> downloadSelected(@RequestBody List<String> filenames) throws IOException {
        String todayFolder = DateUtils.simpleDateFormat(accountingDayService.getCurrentAccountingDate());
        File dir = new File(baseDir + todayFolder.replaceAll(" ", "-"));
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (String filename : filenames) {
                File pdf = new File(dir, filename);
                if (pdf.exists() && pdf.isFile()) {
                    zos.putNextEntry(new ZipEntry(filename));
                    Files.copy(pdf.toPath(), zos);
                    zos.closeEntry();
                }
            }
        }
        
        if (baos.size() == 0) return ResponseEntity.notFound().build();
        
        InputStreamResource resource = new InputStreamResource(new ByteArrayInputStream(baos.toByteArray()));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=selected-pdfs.zip")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }


    @GetMapping("/download-by-release-date/{releaseDate}")
    public ResponseEntity<Resource> downloadAllByReleaseDate(@PathVariable String releaseDate) throws IOException {
        File dir = new File(baseDir + releaseDate + File.separator);
        log.debug("DOSSIER DE ITEM-RELEASE"+dir.getAbsolutePath());
        File[] files = dir.listFiles((d, name) -> name.endsWith(".pdf"));
        log.debug("FICHIER DE ITEM-RELEASE"+files.length);
        if (files == null || files.length == 0) return ResponseEntity.notFound().build();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            log.debug("TRYING ...");
            for (File pdf : files) {
                zos.putNextEntry(new ZipEntry(pdf.getName()));
                Files.copy(pdf.toPath(), zos);
                zos.closeEntry();
            }
        }
        InputStreamResource resource = new InputStreamResource(new ByteArrayInputStream(baos.toByteArray()));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=SORTIE_ARTICLES_"+releaseDate+".zip")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
    
    @GetMapping("/download-reception/{id}")
    public ResponseEntity<Resource> downloadStockReceptionPdf(@PathVariable Long id) throws DocumentException {
        InputStream resource = pdfService.generateStockReceptionPdf(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=RECEPTION_" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(resource));
    }
}
