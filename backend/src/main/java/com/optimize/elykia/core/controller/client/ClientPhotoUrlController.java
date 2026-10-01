package com.optimize.elykia.core.controller.client;

import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.client.ClientPhotoUrlDto;
import com.optimize.elykia.core.dto.client.ClientPhotoUrlRequest;
import com.optimize.elykia.core.service.client.ClientPhotoUrlService;
import com.optimize.elykia.core.util.UserPermissionConstant;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/clients")
@CrossOrigin
public class ClientPhotoUrlController {

    private final ClientPhotoUrlService clientPhotoUrlService;

    /**
     * Batch short-lived MinIO GET URLs for private client photos (profile / ID card).
     * Unauthorized clients are omitted from the response (not 403).
     */
    @PostMapping("photos/urls")
    @PreAuthorize("hasAnyAuthority('"
            + UserPermissionConstant.CONSULT_CLIENT + "', '"
            + UserPermissionConstant.EDIT_CLIENT + "', '"
            + UserPermissionConstant.VALIDATE_CLIENT_REGISTRATION + "', '"
            + UserPermissionConstant.ADMIN + "', '"
            + UserPermissionConstant.RECOVERY_MANAGER + "', '"
            + UserPermissionConstant.MANAGER + "', '"
            + UserPermissionConstant.PROMOTER + "')")
    public ResponseEntity<?> resolvePhotoUrls(@Valid @RequestBody ClientPhotoUrlRequest request) {
        List<ClientPhotoUrlDto> urls = clientPhotoUrlService.resolveUrls(request);
        return ResponseEntity.ok(ResponseUtil.successResponse(urls));
    }
}
