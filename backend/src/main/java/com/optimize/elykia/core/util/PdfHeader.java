package com.optimize.elykia.core.util;


import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

public class PdfHeader {

    private PdfHeader() {
    }

    public static HttpHeaders getPdfHeaders(String filename, int contentLength) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("filename", filename+".pdf");
        headers.setContentLength(contentLength);
        return headers;
    }
}
