package com.optimize.elykia.company.web;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.common.securities.util.AuthorityConstant;
import com.optimize.elykia.company.application.CompanyProfileService;
import com.optimize.elykia.company.web.dto.CompanyProfileDto;
import com.optimize.elykia.company.web.dto.CompanyProfileUpdateDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/admin/company")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('" + AuthorityConstant.ADMIN + "')")
public class CompanyAdminController {

    private final CompanyProfileService companyProfileService;

    @GetMapping
    public ResponseEntity<Response> getProfile() {
        CompanyProfileDto dto = companyProfileService.getCurrentProfile();
        return ResponseEntity.ok(ResponseUtil.successResponse(dto));
    }

    @PutMapping
    public ResponseEntity<Response> updateProfile(
            @Valid @RequestBody CompanyProfileUpdateDto dto,
            Authentication authentication) {
        CompanyProfileDto updated = companyProfileService.updateProfile(dto, resolveActor(authentication));
        return ResponseEntity.ok(ResponseUtil.successResponse(updated, "Profil de l'entreprise mis à jour avec succès."));
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Response> uploadLogo(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        CompanyProfileDto updated = companyProfileService.uploadLogo(file, resolveActor(authentication));
        return ResponseEntity.ok(ResponseUtil.successResponse(updated, "Logo de l'entreprise mis à jour avec succès."));
    }

    @DeleteMapping("/logo")
    public ResponseEntity<Response> deleteLogo(Authentication authentication) {
        CompanyProfileDto updated = companyProfileService.deleteLogo(resolveActor(authentication));
        return ResponseEntity.ok(ResponseUtil.successResponse(updated, "Logo de l'entreprise supprimé avec succès."));
    }

    @PostMapping("/reset-theme")
    public ResponseEntity<Response> resetTheme(Authentication authentication) {
        CompanyProfileDto updated = companyProfileService.resetThemeToDefaults(resolveActor(authentication));
        return ResponseEntity.ok(ResponseUtil.successResponse(updated, "Charte graphique réinitialisée par défaut."));
    }

    private static String resolveActor(Authentication authentication) {
        return authentication != null && authentication.getName() != null
                ? authentication.getName()
                : "admin";
    }
}
