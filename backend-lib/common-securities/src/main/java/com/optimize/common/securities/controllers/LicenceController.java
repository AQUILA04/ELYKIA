package com.optimize.common.securities.controllers;

import com.optimize.common.securities.models.Licence;
import com.optimize.common.securities.payload.request.DeploymentRequest;
import com.optimize.common.securities.service.DeploymentLicenceService;
import com.optimize.common.securities.service.LicenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/licences")
@RequiredArgsConstructor
@CrossOrigin
public class LicenceController {
    private final LicenceService licenceService;
    private final DeploymentLicenceService deploymentLicenceService;

    @PostMapping("/validate")
    public ResponseEntity<Boolean> validateLicence(@RequestBody String activationCode) {
        return ResponseEntity.ok(licenceService.isValidLicence(activationCode));
    }

    @PostMapping("/renew")
    public ResponseEntity<Map<String, Boolean>> renewLicence(@RequestBody Map<String, String> licence) {
        return ResponseEntity.ok(deploymentLicenceService.renew(licence.get("activationCode")));
    }

    @PostMapping("/create")
    public ResponseEntity<Licence> createLicence(@RequestBody String activationCode) {
        return ResponseEntity.ok(licenceService.createLicence(activationCode));
    }

    @PostMapping("/deploy")
    public ResponseEntity<String> deploy(@RequestBody @Valid DeploymentRequest request) {
        return ResponseEntity.ok(deploymentLicenceService.deploy(request));
    }

    @PostMapping("/initialize")
    public ResponseEntity<List<Licence>> initializeLicences(@RequestParam int numberOfLicences, @RequestParam String type, @RequestParam String passCode) {
        return ResponseEntity.ok(licenceService.initializeLicences(numberOfLicences, type, passCode));
    }

}
