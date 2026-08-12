package com.optimize.elykia.core.controller.admin;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.client.migration.MigrationReport;
import com.optimize.elykia.client.migration.MigrationStatus;
import com.optimize.elykia.client.migration.PhotoMigrationJob;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("api/v1/admin")
@RequiredArgsConstructor
public class AdminPhotoMigrationController {

    private final PhotoMigrationJob photoMigrationJob;

    @PostMapping("migrate-photos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Response> migratePhotos() {
        MigrationReport report = photoMigrationJob.runMigration();
        return new ResponseEntity<>(ResponseUtil.successResponse(report), HttpStatus.OK);
    }

    @GetMapping("migrate-photos/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Response> getMigrationStatus() {
        MigrationStatus status = photoMigrationJob.getStatus();
        return new ResponseEntity<>(ResponseUtil.successResponse(status), HttpStatus.OK);
    }
}
