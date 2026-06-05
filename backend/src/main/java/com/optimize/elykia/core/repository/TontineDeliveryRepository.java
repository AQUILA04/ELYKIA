package com.optimize.elykia.core.repository;

import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public interface TontineDeliveryRepository extends JpaRepository<TontineDelivery, Long>, JpaSpecificationExecutor<TontineDelivery> {

    @Query("SELECT d FROM TontineDelivery d LEFT JOIN FETCH d.items WHERE d.tontineMember.id = :memberId")
    Optional<TontineDelivery> findByTontineMemberId(@Param("memberId") Long memberId);

    boolean existsByTontineMemberId(Long memberId);

    boolean existsByReference(String reference);

    default Page<TontineDelivery> findWithFilters(String commercial, LocalDateTime dateFrom, LocalDateTime dateTo,
            String search, Pageable pageable) {
        return findAll(getFilterCriteria(commercial, dateFrom, dateTo, search), pageable);
    }

    default Page<TontineDelivery> elasticsearch(String keyword, String commercial, LocalDateTime dateFrom,
            LocalDateTime dateTo, Pageable pageable) {
        return findAll(getFilterCriteria(commercial, dateFrom, dateTo, keyword), pageable);
    }

    default Specification<TontineDelivery> getFilterCriteria(String commercial, LocalDateTime dateFrom,
            LocalDateTime dateTo, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            Join<Object, Object> memberJoin = root.join("tontineMember", JoinType.INNER);
            Join<Object, Object> clientJoin = memberJoin.join("client", JoinType.INNER);

            if (StringUtils.hasText(commercial) && !"all".equalsIgnoreCase(commercial)) {
                predicates.add(cb.equal(root.get("commercialUsername"), commercial));
            }

            if (dateFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("deliveryDate"), dateFrom));
            }
            if (dateTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("deliveryDate"), dateTo));
            }

            if (StringUtils.hasText(search)) {
                final String searchKeyword = String.format("%%%s%%", search.toLowerCase());
                boolean isNumeric = StringUtils.hasText(search) && search.chars().allMatch(Character::isDigit);

                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(clientJoin.get("firstname")), searchKeyword),
                        cb.like(cb.lower(clientJoin.get("lastname")), searchKeyword),
                        cb.like(cb.lower(clientJoin.get("phone")), searchKeyword),
                        cb.like(cb.lower(clientJoin.get("code")), searchKeyword),
                        cb.like(cb.lower(clientJoin.get("address")), searchKeyword),
                        cb.like(cb.lower(clientJoin.get("quarter")), searchKeyword),
                        cb.like(cb.lower(root.get("reference")), searchKeyword),
                        cb.like(cb.lower(root.get("commercialUsername")), searchKeyword),
                        cb.like(cb.lower(memberJoin.get("deliveryStatus").as(String.class)), searchKeyword));

                if (isNumeric) {
                    try {
                        searchPredicate = cb.or(searchPredicate,
                                cb.equal(root.get("totalAmount"), Double.valueOf(search)));
                        searchPredicate = cb.or(searchPredicate,
                                cb.equal(root.get("remainingBalance"), Double.valueOf(search)));
                    } catch (NumberFormatException ignored) {
                        // ignore invalid numeric conversion
                    }
                }

                predicates.add(searchPredicate);
            }

            query.distinct(true);
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
