package com.optimize.elykia.client.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.dto.BulkAssignCollectorsDto;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.client.event.InProgressCreditsTransferEvent;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ClientCollectorAssignmentService {

    private final ClientService clientService;
    private ClientCommercialPortfolioService portfolioService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setPortfolioService(ClientCommercialPortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;

    public void bulkAssignCollectors(BulkAssignCollectorsDto dto) {
        requireAssignCollectorRole();
        String username = userService.getCurrentUser().getUsername();
        log.info("Bulk assign collectors for {} client(s) by {}",
                dto.getClientIds() != null ? dto.getClientIds().size() : 0,
                username);
        clientService.bulkAssignCollectors(dto, username);
        if (dto.getClientIds() != null && portfolioService != null) {
            for (Long clientId : dto.getClientIds()) {
                if (StringUtils.hasText(dto.getCollector())) {
                    portfolioService.assignOrRelay(clientId, dto.getCollector(),
                            com.optimize.elykia.client.api.PortfolioActivityType.CREDIT, true, true,
                            "Réaffectation crédit en masse");
                }
                if (StringUtils.hasText(dto.getTontineCollector())) {
                    portfolioService.assignOrRelay(clientId, dto.getTontineCollector(),
                            com.optimize.elykia.client.api.PortfolioActivityType.TONTINE, true, true,
                            "Réaffectation tontine en masse");
                }
            }
        }
        if (dto.isTransferInProgressCredits() && StringUtils.hasText(dto.getCollector())) {
            eventPublisher.publishEvent(new InProgressCreditsTransferEvent(
                    this, dto.getClientIds(), dto.getCollector(), username));
        }
    }

    private void requireAssignCollectorRole() {
        var currentUser = userService.getCurrentUser();
        boolean allowed = currentUser.getPermissions().stream()
                .anyMatch(p -> UserPermissionConstant.ASSIGN_CLIENT_COLLECTOR.equals(p.getName()));
        if (!allowed) {
            throw new CustomValidationException(
                    "Seuls les profils secrétaire, gestionnaire, admin ou super admin peuvent changer le commercial des clients.");
        }
    }
}
