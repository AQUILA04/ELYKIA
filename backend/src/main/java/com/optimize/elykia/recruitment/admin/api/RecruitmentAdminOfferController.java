package com.optimize.elykia.recruitment.admin.api;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.recruitment.admin.api.dto.JobOfferUpsertDto;
import com.optimize.elykia.recruitment.admin.application.ManageJobOfferUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/recruitment/offers")
@RequiredArgsConstructor
@CrossOrigin
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Recruitment admin offers")
@PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_RECRUITMENT')")
public class RecruitmentAdminOfferController {

    private final ManageJobOfferUseCase manageJobOfferUseCase;

    @GetMapping
    @Operation(summary = "List job offers (admin)")
    public ResponseEntity<Response> list(Pageable pageable) {
        return ResponseEntity.ok(ResponseUtil.successResponse(manageJobOfferUseCase.list(pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job offer by id")
    public ResponseEntity<Response> get(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(manageJobOfferUseCase.getById(id)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Create job offer")
    public ResponseEntity<Response> create(
            @RequestPart("offer") @Valid JobOfferUpsertDto offer,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return new ResponseEntity<>(ResponseUtil.successResponse(manageJobOfferUseCase.create(offer, image)),
                HttpStatus.CREATED);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Update job offer")
    public ResponseEntity<Response> update(
            @PathVariable Long id,
            @RequestPart("offer") @Valid JobOfferUpsertDto offer,
            @RequestPart(value = "image", required = false) MultipartFile image) {
        return ResponseEntity.ok(ResponseUtil.successResponse(manageJobOfferUseCase.update(id, offer, image)));
    }

    @PostMapping("/{id}/publish")
    @Operation(summary = "Publish job offer")
    public ResponseEntity<Response> publish(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(manageJobOfferUseCase.publish(id)));
    }

    @PostMapping("/{id}/withdraw")
    @Operation(summary = "Withdraw job offer")
    public ResponseEntity<Response> withdraw(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(manageJobOfferUseCase.withdraw(id)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Soft delete job offer")
    public ResponseEntity<Response> delete(@PathVariable Long id) {
        manageJobOfferUseCase.delete(id);
        return ResponseEntity.ok(ResponseUtil.successResponse("Offre supprimée"));
    }
}
