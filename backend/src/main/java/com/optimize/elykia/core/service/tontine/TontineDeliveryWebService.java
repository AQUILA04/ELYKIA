package com.optimize.elykia.core.service.tontine;

import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.TontineDeliveryKpiDto;
import com.optimize.elykia.core.dto.TontineDeliveryListDto;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.repository.TontineDeliveryRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class TontineDeliveryWebService {

    private final TontineDeliveryRepository deliveryRepository;
    private final UserService userService;

    @PersistenceContext
    private EntityManager entityManager;

    public Page<TontineDeliveryListDto> getDeliveriesForWeb(LocalDateTime dateFrom, LocalDateTime dateTo,
            String commercial, String search, Pageable pageable) {
        log.info("Fetching Tontine Deliveries between {} and {} for commercial: {}, search: {}",
                dateFrom, dateTo, commercial != null ? commercial : "ALL", search);

        return deliveryRepository.findWithFilters(
                        resolveCommercialFilter(commercial),
                        dateFrom,
                        dateTo,
                        normalizeSearch(search),
                        pageable)
                .map(this::mapToListDto);
    }

    public Page<TontineDeliveryListDto> elasticsearch(String keyword, LocalDateTime dateFrom, LocalDateTime dateTo,
            String commercial, Pageable pageable) {
        log.info("Elasticsearch Tontine Deliveries keyword: {}, commercial: {}", keyword, commercial);

        return deliveryRepository.elasticsearch(
                        normalizeSearch(keyword),
                        resolveCommercialFilter(commercial),
                        dateFrom,
                        dateTo,
                        pageable)
                .map(this::mapToListDto);
    }

    public TontineDeliveryKpiDto getKpiSummary(LocalDateTime dateFrom, LocalDateTime dateTo, String commercial,
            String search) {
        log.info("Fetching Tontine Delivery KPIs between {} and {} for commercial: {}, search: {}",
                dateFrom, dateTo, commercial != null ? commercial : "ALL", search);

        Specification<TontineDelivery> baseSpec = buildFilterSpec(commercial, dateFrom, dateTo, search);

        long totalCount = deliveryRepository.count(baseSpec);
        double totalAmount = sumField("totalAmount", baseSpec);
        double totalRemainingBalance = sumField("remainingBalance", baseSpec);
        long pendingCount = countByStatus(TontineMemberDeliveryStatus.PENDING, baseSpec);
        long validatedCount = countByStatus(TontineMemberDeliveryStatus.VALIDATED, baseSpec);
        long deliveredCount = countByStatus(TontineMemberDeliveryStatus.DELIVERED, baseSpec);

        return TontineDeliveryKpiDto.builder()
                .totalCount(totalCount)
                .totalAmount(totalAmount)
                .totalRemainingBalance(totalRemainingBalance)
                .pendingCount(pendingCount)
                .validatedCount(validatedCount)
                .deliveredCount(deliveredCount)
                .build();
    }

    private Specification<TontineDelivery> buildFilterSpec(String commercial, LocalDateTime dateFrom,
            LocalDateTime dateTo, String search) {
        return deliveryRepository.getFilterCriteria(
                resolveCommercialFilter(commercial),
                dateFrom,
                dateTo,
                normalizeSearch(search));
    }

    private long countByStatus(TontineMemberDeliveryStatus status, Specification<TontineDelivery> baseSpec) {
        Specification<TontineDelivery> spec = baseSpec.and((root, query, cb) ->
                cb.equal(root.get("tontineMember").get("deliveryStatus"), status));
        return deliveryRepository.count(spec);
    }

    private double sumField(String fieldName, Specification<TontineDelivery> spec) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Double> cq = cb.createQuery(Double.class);
        Root<TontineDelivery> root = cq.from(TontineDelivery.class);
        Predicate predicate = spec.toPredicate(root, cq, cb);
        if (predicate != null) {
            cq.where(predicate);
        }
        cq.select(cb.coalesce(cb.sum(root.get(fieldName)), 0.0));
        Double result = entityManager.createQuery(cq).getSingleResult();
        return result != null ? result : 0.0;
    }

    private String normalizeSearch(String search) {
        return StringUtils.hasText(search) ? search.trim() : null;
    }

    private String resolveCommercialFilter(String commercial) {
        User currentUser = userService.getCurrentUser();
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            return currentUser.getUsername();
        }
        return normalizeCommercial(commercial);
    }

    private String normalizeCommercial(String commercial) {
        if (!StringUtils.hasText(commercial) || "all".equalsIgnoreCase(commercial)) {
            return null;
        }
        return commercial.trim();
    }

    private TontineDeliveryListDto mapToListDto(TontineDelivery delivery) {
        return TontineDeliveryListDto.builder()
                .id(delivery.getId())
                .tontineMemberId(delivery.getTontineMember().getId())
                .clientId(delivery.getTontineMember().getClient().getId())
                .clientFirstname(delivery.getTontineMember().getClient().getFirstname())
                .clientLastname(delivery.getTontineMember().getClient().getLastname())
                .clientPhone(delivery.getTontineMember().getClient().getPhone())
                .reference(delivery.getReference())
                .deliveryDate(delivery.getDeliveryDate())
                .requestDate(delivery.getRequestDate())
                .totalAmount(delivery.getTotalAmount())
                .remainingBalance(delivery.getRemainingBalance())
                .commercialUsername(delivery.getCommercialUsername())
                .deliveryStatus(delivery.getTontineMember().getDeliveryStatus())
                .itemCount(delivery.getItems() != null ? delivery.getItems().size() : 0)
                .build();
    }
}
