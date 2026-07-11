package com.optimize.elykia.recruitment.site.api;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.recruitment.shared.domain.ApplicantGender;
import com.optimize.elykia.recruitment.site.application.GetPublishedOfferUseCase;
import com.optimize.elykia.recruitment.site.application.ListPublishedOffersUseCase;
import com.optimize.elykia.recruitment.site.application.SubmitJobApplicationUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/public/recruitment")
@RequiredArgsConstructor
@CrossOrigin
@Tag(name = "Recruitment public", description = "Public recruitment API for the website")
public class RecruitmentSiteController {

    private final ListPublishedOffersUseCase listPublishedOffersUseCase;
    private final GetPublishedOfferUseCase getPublishedOfferUseCase;
    private final SubmitJobApplicationUseCase submitJobApplicationUseCase;

    @GetMapping("/offers")
    @Operation(summary = "List published job offers")
    public ResponseEntity<Response> listOffers() {
        return ResponseEntity.ok(ResponseUtil.successResponse(listPublishedOffersUseCase.execute()));
    }

    @GetMapping("/offers/{id}")
    @Operation(summary = "Get a published job offer")
    public ResponseEntity<Response> getOffer(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(getPublishedOfferUseCase.execute(id)));
    }

    @PostMapping(value = "/applications", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Submit a job application with CV")
    public ResponseEntity<Response> submitApplication(
            @RequestParam Long jobOfferId,
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam String phone,
            @RequestParam(required = false) String email,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate birthDate,
            @RequestParam ApplicantGender gender,
            @RequestParam String locality,
            @RequestPart("cv") MultipartFile cv,
            HttpServletRequest request) {
        Long applicationId = submitJobApplicationUseCase.execute(
                jobOfferId, firstName, lastName, phone, email, birthDate, gender, locality, cv,
                resolveClientIp(request));
        return new ResponseEntity<>(ResponseUtil.successResponse(Map.of("applicationId", applicationId)),
                HttpStatus.CREATED);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
