package com.optimize.elykia.client.repository.spec;

// language: java

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.dto.ClientSearchDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

public class ClientSpecification {

    private static final DateTimeFormatter DTF = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public static Specification<Client> from(ClientSearchDto dto) {
        return (Root<Client> root, CriteriaQuery<?> query, CriteriaBuilder cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // default state
            State state = dto.state() != null ? dto.state() : State.ENABLED;
            predicates.add(cb.equal(root.get("state"), state.name()));

            // clientType exact match (enum)
            if (dto.clientType() != null) {
                predicates.add(cb.equal(root.get("clientType"), dto.clientType()));
            }

            // boolean filters when provided
            if (dto.isTontineMember() != null) {
                // field name is "isTontineMember" in entity
                predicates.add(cb.equal(root.get("isTontineMember"), dto.isTontineMember()));
            }
            if (dto.hasCreditInProgress() != null) {
                predicates.add(cb.equal(root.get("creditInProgress"), dto.hasCreditInProgress()));
            }

            // case-insensitive string filters
            addLikeIgnoreCaseIfPresent(cb, root, predicates, "collector", dto.collector());
            addLikeIgnoreCaseIfPresent(cb, root, predicates, "tontineCollector", dto.tontineCollector());
            addLikeIgnoreCaseIfPresent(cb, root, predicates, "agencyCollector", dto.agencyCollector());

            // keyword handling
            String keyword = dto.keyword();
            if (keyword != null && !keyword.isBlank()) {
                keyword = keyword.trim();

                // date range dd/MM/yyyy-dd/MM/yyyy
                if (keyword.matches("^\\d{2}/\\d{2}/\\d{4}\\s*-\\s*\\d{2}/\\d{2}/\\d{4}$")) {
                    String[] parts = keyword.split("\\s*-\\s*");
                    try {
                        LocalDate start = LocalDate.parse(parts[0], DTF);
                        LocalDate end = LocalDate.parse(parts[1], DTF);
                        if (start.isAfter(end)) {
                            throw new ResponseStatusException(BAD_REQUEST, "Date de début ne doit pas être supérieure à date de fin");
                        }
                        Predicate p1 = cb.between(root.get("dateOfBirth"), start, end);
                        Predicate p2 = cb.between(root.get("syncDate"), start, end);
                        predicates.add(cb.or(p1, p2));
                    } catch (DateTimeParseException ex) {
                        throw new ResponseStatusException(BAD_REQUEST, "Format de date invalide, attendu dd/MM/yyyy-dd/MM/yyyy");
                    }
                }
                // single date dd/MM/yyyy
                else if (keyword.matches("^\\d{2}/\\d{2}/\\d{4}$")) {
                    try {
                        LocalDate d = LocalDate.parse(keyword, DTF);
                        Predicate p1 = cb.equal(root.get("dateOfBirth"), d);
                        Predicate p2 = cb.equal(root.get("syncDate"), d);
                        predicates.add(cb.or(p1, p2));
                    } catch (DateTimeParseException ex) {
                        throw new ResponseStatusException(BAD_REQUEST, "Format de date invalide, attendu dd/MM/yyyy");
                    }
                }
                // numeric keyword -> numeric fields + text fields
                else if (keyword.matches("^-?\\d+(\\.\\d+)?$")) {
                    List<Predicate> orPreds = new ArrayList<>();
                    // attempt id (long)
                    try {
                        long id = Long.parseLong(keyword.split("\\.")[0]);
                        orPreds.add(cb.equal(root.get("id"), id));
                    } catch (NumberFormatException ignored) { }

                    try {
                        Double d = Double.valueOf(keyword);
                        orPreds.add(cb.equal(root.get("latitude"), d));
                        orPreds.add(cb.equal(root.get("longitude"), d));
                    } catch (NumberFormatException ignored) { }

                    // also search textual fields (case-insensitive contains)
                    addOrLikeIgnoreCase(root, cb, orPreds, keyword,
                            "firstname", "lastname", "address", "phone", "cardID", "cardType",
                            "contactPersonName", "contactPersonPhone", "contactPersonAddress",
                            "collector", "quarter", "mll", "occupation", "code",
                            "profilPhotoUrl", "cardPhotoUrl", "tontineCollector", "agencyCollector"
                    );

                    predicates.add(cb.or(orPreds.toArray(new Predicate[0])));
                }
                // default: full-text-like search across string fields (case-insensitive contains)
                else {
                    List<Predicate> orPreds = new ArrayList<>();
                    addOrLikeIgnoreCase(root, cb, orPreds, keyword,
                            "firstname", "lastname", "address", "phone", "cardID", "cardType",
                            "contactPersonName", "contactPersonPhone", "contactPersonAddress",
                            "collector", "quarter", "mll", "occupation", "code",
                            "profilPhotoUrl", "cardPhotoUrl", "tontineCollector", "agencyCollector"
                    );
                    predicates.add(cb.or(orPreds.toArray(new Predicate[0])));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static void addLikeIgnoreCaseIfPresent(CriteriaBuilder cb, Root<Client> root, List<Predicate> predicates, String field, String value) {
        if (value != null && !value.isBlank()) {
            predicates.add(cb.like(cb.lower(root.get(field)), "%" + value.trim().toLowerCase() + "%"));
        }
    }

    private static void addOrLikeIgnoreCase(Root<Client> root, CriteriaBuilder cb, List<Predicate> orPreds, String keyword, String... fields) {
        String kw = "%" + keyword.toLowerCase() + "%";
        for (String f : fields) {
            orPreds.add(cb.like(cb.lower(root.get(f)), kw));
        }
    }
}
