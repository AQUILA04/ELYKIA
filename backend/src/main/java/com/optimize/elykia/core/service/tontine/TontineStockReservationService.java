package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.TontineArticleReservationDto;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.shared.security.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.EnumSet;
import java.util.List;

/**
 * Réservations indicatives du stock tontine : ce que les commandes en attente ou validées d'un commercial
 * ont déjà retenu, article par article. Sert à afficher « disponible / réservé / libre » à la commande.
 */
@Service
@RequiredArgsConstructor
public class TontineStockReservationService {

    private static final EnumSet<TontineMemberDeliveryStatus> RESERVING =
            EnumSet.of(TontineMemberDeliveryStatus.PENDING, TontineMemberDeliveryStatus.VALIDATED);

    private final TontineDeliveryRepository deliveryRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    public List<TontineArticleReservationDto> reservationsFor(String commercial) {
        String effective = effectiveCommercial(commercial);
        return deliveryRepository.reservedQuantitiesByArticle(effective, RESERVING).stream()
                .filter(row -> row[0] != null)
                .map(row -> new TontineArticleReservationDto(
                        ((Number) row[0]).longValue(),
                        row[1] != null ? ((Number) row[1]).longValue() : 0L,
                        row[2] != null ? ((Number) row[2]).longValue() : 0L))
                .toList();
    }

    /** Un commercial ne lit que ses propres réservations. */
    private String effectiveCommercial(String requested) {
        User user = userService.getCurrentUser();
        if (user != null && user.is(UserProfilConstant.PROMOTER)) {
            return user.getUsername();
        }
        if (!StringUtils.hasText(requested)) {
            throw new CustomValidationException("Choisissez le commercial dont vous voulez voir le stock tontine.");
        }
        return requested.trim();
    }
}
