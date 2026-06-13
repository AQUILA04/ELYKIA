package com.optimize.elykia.core.controller.client;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.client.BusinessCreditAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/clients")
@CrossOrigin
public class BusinessCreditAuthorizationController {

    private final BusinessCreditAuthorizationService businessCreditAuthorizationService;

    @PostMapping("{clientId}/business-credit-authorization")
    public ResponseEntity<Response> authorizeBusinessCredit(@PathVariable Long clientId) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(businessCreditAuthorizationService.authorizeBusinessCredit(clientId)),
                HttpStatus.OK);
    }

    @DeleteMapping("{clientId}/business-credit-authorization")
    public ResponseEntity<Response> revokeBusinessCreditAuthorization(@PathVariable Long clientId) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(
                        businessCreditAuthorizationService.revokeBusinessCreditAuthorization(clientId)),
                HttpStatus.OK);
    }

    @GetMapping("{clientId}/business-credit-authorization/history")
    public ResponseEntity<Response> getAuthorizationHistory(@PathVariable Long clientId) {
        return new ResponseEntity<>(
                ResponseUtil.successResponse(businessCreditAuthorizationService.getAuthorizationHistory(clientId)),
                HttpStatus.OK);
    }
}
