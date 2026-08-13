package com.optimize.elykia.core.controller.client;

import com.optimize.elykia.core.service.client.ClientListPdfService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/clients")
@CrossOrigin
public class ClientExportController {

    private final ClientListPdfService clientListPdfService;

    @GetMapping("by-commercial/{commercial}/export/pdf")
    public ResponseEntity<byte[]> exportClientsPdf(@PathVariable String commercial) {
        byte[] pdf = clientListPdfService.generatePdf(commercial);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", "fiche_client_" + commercial + ".pdf");
        return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
    }
}
