package com.optimize.elykia.core.controller.adhesion;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.dto.adhesion.AdhesionTopUpRequest;
import com.optimize.elykia.core.dto.adhesion.RejectAdhesionSubmissionRequest;
import com.optimize.elykia.core.dto.adhesion.SubscribeAdhesionRequest;
import com.optimize.elykia.core.enumaration.AdhesionType;
import com.optimize.elykia.core.service.adhesion.AdhesionService;
import com.optimize.elykia.core.service.adhesion.CustomerAdhesionRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@CrossOrigin
public class AdhesionController {

    private final AdhesionService adhesionService;
    private final CustomerAdhesionRequestService customerAdhesionRequestService;

    @GetMapping("api/v1/clients/{clientId}/adhesions")
    public ResponseEntity<Response> list(@PathVariable Long clientId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(adhesionService.listByClient(clientId)));
    }

    @PostMapping("api/v1/clients/{clientId}/adhesions")
    public ResponseEntity<Response> subscribe(
            @PathVariable Long clientId,
            @Valid @RequestBody SubscribeAdhesionRequest request) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(adhesionService.subscribeAtCounter(clientId, request.getAdhesionType())),
                HttpStatus.CREATED);
    }

    @PostMapping("api/v1/clients/{clientId}/adhesions/{type}/top-up")
    public ResponseEntity<Response> topUp(
            @PathVariable Long clientId,
            @PathVariable AdhesionType type,
            @Valid @RequestBody AdhesionTopUpRequest request) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                adhesionService.topUpAtCounter(clientId, type, request.getAmount())));
    }

    @GetMapping("api/v1/clients/{clientId}/adhesion-submissions")
    public ResponseEntity<Response> submissions(@PathVariable Long clientId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                customerAdhesionRequestService.listSubmissions(clientId)));
    }

    @PostMapping("api/v1/clients/{clientId}/adhesion-submissions/{submissionId}/validate")
    public ResponseEntity<Response> validateSubmission(
            @PathVariable Long clientId,
            @PathVariable Long submissionId) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                customerAdhesionRequestService.validate(clientId, submissionId)));
    }

    @PostMapping("api/v1/clients/{clientId}/adhesion-submissions/{submissionId}/reject")
    public ResponseEntity<Response> rejectSubmission(
            @PathVariable Long clientId,
            @PathVariable Long submissionId,
            @Valid @RequestBody RejectAdhesionSubmissionRequest request) {
        return ResponseEntity.ok(ResponseUtil.successResponse(
                customerAdhesionRequestService.reject(clientId, submissionId, request.getReason())));
    }

    @GetMapping("api/v1/adhesions/by-commercial/{commercial}")
    public ResponseEntity<Response> byCommercial(@PathVariable String commercial) {
        return ResponseEntity.ok(ResponseUtil.successResponse(adhesionService.listByCollector(commercial)));
    }
}
