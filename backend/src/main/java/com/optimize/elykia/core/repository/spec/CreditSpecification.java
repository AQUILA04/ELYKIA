package com.optimize.elykia.core.repository.spec;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.dto.CreditSearchDto;
import com.optimize.elykia.core.entity.sale.Credit;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

public class CreditSpecification {
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public static Specification<Credit> build(CreditSearchDto dto) {
        return build(dto, false);
    }

    public static Specification<Credit> build(CreditSearchDto dto, boolean ignoreStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (dto == null) {
                predicates.add(cb.equal(root.get("state"), State.ENABLED));
                return cb.and(predicates.toArray(new Predicate[0]));
            }

            if (dto.clientType() != null) {
                predicates.add(cb.equal(root.get("clientType"), dto.clientType()));
            }

            if (dto.type() != null) {
                predicates.add(cb.equal(root.get("type"), dto.type()));
            }

            if (!ignoreStatus && dto.status() != null) {
                predicates.add(cb.equal(root.get("status"), dto.status()));
            }

            if (dto.commercial() != null && !dto.commercial().isBlank()) {
                predicates.add(cb.equal(root.get("collector"), dto.commercial().trim()));
            }

            if (dto.clientId() != null) {
                predicates.add(cb.equal(root.get("client").get("id"), dto.clientId()));
            }

            String kw = dto.keyword();
            if (kw != null && !kw.isBlank()) {
                kw = kw.trim();
                List<Predicate> kwPreds = new ArrayList<>();

                if (Boolean.TRUE.equals(dto.searchByReference())) {
                    addReferenceLikePredicate(kw, kwPreds, root, cb);
                } else if (isDateRangeKeyword(kw) && tryAddDateRangePredicates(kw, kwPreds, root, cb)) {
                    // keyword handled as date range
                } else {
                    addGeneralKeywordPredicates(kw, kwPreds, root, cb);
                }

                if (!kwPreds.isEmpty()) {
                    predicates.add(cb.or(kwPreds.toArray(new Predicate[0])));
                }
            }

            predicates.add(cb.equal(root.get("state"), State.ENABLED));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    static boolean isDateRangeKeyword(String kw) {
        if (kw == null || !kw.contains("-")) {
            return false;
        }
        String[] parts = kw.split("-", 2);
        try {
            LocalDate.parse(parts[0].trim(), DATE_FMT);
            LocalDate.parse(parts[1].trim(), DATE_FMT);
            return true;
        } catch (DateTimeParseException ignored) {
            return false;
        }
    }

    static boolean tryAddDateRangePredicates(String kw, List<Predicate> kwPreds, Root<Credit> root, CriteriaBuilder cb) {
        String[] parts = kw.split("-", 2);
        LocalDate start = LocalDate.parse(parts[0].trim(), DATE_FMT);
        LocalDate end = LocalDate.parse(parts[1].trim(), DATE_FMT);

        Path<LocalDate> beginDate = root.get("beginDate");
        Path<LocalDate> expectedEndDate = root.get("expectedEndDate");
        Path<LocalDate> effectiveEndDate = root.get("effectiveEndDate");
        Path<LocalDate> accountingDate = root.get("accountingDate");
        Path<LocalDate> releaseDate = root.get("releaseDate");

        kwPreds.add(cb.between(beginDate, start, end));
        kwPreds.add(cb.between(expectedEndDate, start, end));
        kwPreds.add(cb.between(effectiveEndDate, start, end));
        kwPreds.add(cb.between(accountingDate, start, end));
        kwPreds.add(cb.between(releaseDate, start, end));
        return true;
    }

    private static void addGeneralKeywordPredicates(String kw, List<Predicate> kwPreds, Root<Credit> root, CriteriaBuilder cb) {
        try {
            LocalDate single = LocalDate.parse(kw, DATE_FMT);
            Path<LocalDate> beginDate = root.get("beginDate");
            Path<LocalDate> expectedEndDate = root.get("expectedEndDate");
            Path<LocalDate> effectiveEndDate = root.get("effectiveEndDate");
            Path<LocalDate> accountingDate = root.get("accountingDate");
            Path<LocalDate> releaseDate = root.get("releaseDate");

            kwPreds.add(cb.equal(beginDate, single));
            kwPreds.add(cb.equal(expectedEndDate, single));
            kwPreds.add(cb.equal(effectiveEndDate, single));
            kwPreds.add(cb.equal(accountingDate, single));
            kwPreds.add(cb.equal(releaseDate, single));
            return;
        } catch (DateTimeParseException ignored) {
            // not a single date
        }

        if (kw.matches("-?\\d+(\\.\\d+)?")) {
            try {
                Long asLong = Long.parseLong(kw);
                kwPreds.add(cb.equal(root.get("id").as(Long.class), asLong));
            } catch (NumberFormatException ignored) {
            }
            try {
                Double asDouble = Double.parseDouble(kw);
                kwPreds.add(cb.equal(root.get("totalAmount").as(Double.class), asDouble));
                kwPreds.add(cb.equal(root.get("totalAmountPaid").as(Double.class), asDouble));
                kwPreds.add(cb.equal(root.get("totalAmountRemaining").as(Double.class), asDouble));
                kwPreds.add(cb.equal(root.get("dailyStake").as(Double.class), asDouble));
                kwPreds.add(cb.equal(root.get("advance").as(Double.class), asDouble));
                kwPreds.add(cb.equal(root.get("totalPurchase").as(Double.class), asDouble));
            } catch (NumberFormatException ignored) {
            }
            return;
        }

        addStringLikePredicates(kw, kwPreds, root, cb);
    }

    private static void addReferenceLikePredicate(String kw, List<Predicate> kwPreds, Root<Credit> root, CriteriaBuilder cb) {
        String pattern = "%" + kw.toLowerCase() + "%";
        kwPreds.add(cb.like(cb.lower(root.get("reference").as(String.class)), pattern));
    }

    private static void addStringLikePredicates(String kw, List<Predicate> kwPreds, Root<Credit> root, CriteriaBuilder cb) {
        String pattern = "%" + kw.toLowerCase() + "%";
        kwPreds.add(cb.like(cb.lower(root.get("collector").as(String.class)), pattern));
        kwPreds.add(cb.like(cb.lower(root.get("reference").as(String.class)), pattern));
        kwPreds.add(cb.like(cb.lower(root.get("oldReference").as(String.class)), pattern));
        kwPreds.add(cb.like(cb.lower(root.get("distributionZone").as(String.class)), pattern));
        kwPreds.add(cb.like(cb.lower(root.get("customerSegment").as(String.class)), pattern));
        try {
            Expression<String> clientName = root.get("client").get("firstname").as(String.class);
            kwPreds.add(cb.like(cb.lower(clientName), pattern));
            kwPreds.add(cb.like(cb.lower(root.get("client").get("lastname").as(String.class)), pattern));
        } catch (IllegalArgumentException ignored) {
            // ignore if path not resolvable
        }
    }
}
