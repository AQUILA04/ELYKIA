package com.optimize.elykia.core.service.client;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.dto.BusinessCreditAuthorizationEventDto;
import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BusinessCreditAuthorizationService {

    private final ClientService clientService;
    private final UserService userService;

    public ClientRespDto authorizeBusinessCredit(Long clientId) {
        String performedBy = requireGestionnaire();
        log.info("Business credit authorization granted for client {} by {}", clientId, performedBy);
        return clientService.authorizeBusinessCredit(clientId, performedBy);
    }

    public ClientRespDto revokeBusinessCreditAuthorization(Long clientId) {
        String performedBy = requireGestionnaire();
        log.info("Business credit authorization revoked for client {} by {}", clientId, performedBy);
        return clientService.revokeBusinessCreditAuthorization(clientId, performedBy);
    }

    @Transactional(readOnly = true)
    public List<BusinessCreditAuthorizationEventDto> getAuthorizationHistory(Long clientId) {
        requireGestionnaire();
        return clientService.getBusinessCreditAuthorizationHistory(clientId);
    }

    private String requireGestionnaire() {
        var currentUser = userService.getCurrentUser();
        if (!currentUser.is(UserProfilConstant.GESTIONNAIRE)) {
            throw new CustomValidationException(
                    "Seul un gestionnaire peut gérer l'habilitation crédit business.");
        }
        return currentUser.getUsername();
    }
}
