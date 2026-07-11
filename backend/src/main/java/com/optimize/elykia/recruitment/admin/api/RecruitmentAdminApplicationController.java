package com.optimize.elykia.recruitment.admin.api;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.recruitment.admin.application.DownloadApplicationCvUseCase;
import com.optimize.elykia.recruitment.admin.application.ListJobApplicationsUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recruitment/applications")
@RequiredArgsConstructor
@CrossOrigin
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Recruitment admin applications")
@PreAuthorize("hasAnyRole('ROLE_ADMIN', 'ROLE_RECRUITMENT')")
public class RecruitmentAdminApplicationController {

    private final ListJobApplicationsUseCase listJobApplicationsUseCase;
    private final DownloadApplicationCvUseCase downloadApplicationCvUseCase;

    @GetMapping
    @Operation(summary = "List job applications")
    public ResponseEntity<Response> list(
            @RequestParam(required = false) Long jobOfferId,
            Pageable pageable) {
        return ResponseEntity.ok(ResponseUtil.successResponse(listJobApplicationsUseCase.list(jobOfferId, pageable)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get job application detail")
    public ResponseEntity<Response> get(@PathVariable Long id) {
        return ResponseEntity.ok(ResponseUtil.successResponse(listJobApplicationsUseCase.getById(id)));
    }

    @GetMapping("/{id}/cv")
    @Operation(summary = "Download application CV")
    public ResponseEntity<org.springframework.core.io.Resource> downloadCv(@PathVariable Long id) {
        DownloadApplicationCvUseCase.CvDownload download = downloadApplicationCvUseCase.execute(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.fileName() + "\"")
                .contentType(MediaType.parseMediaType(download.contentType()))
                .body(download.resource());
    }
}
