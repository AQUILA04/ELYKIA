package com.optimize.elykia.client.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Objects;

import static com.optimize.common.entities.repository.spec.BaseSpecifications.from;

public interface ClientRepository extends GenericRepository<Client, Long> {

    List<Client> findByCollectorAndCreditInProgressIsTrueAndStateOrderByQuarterAsc(String username, State state);

    Page<Client> findByCollectorAndCreditInProgressIsTrueAndStateOrderByQuarterAsc(String username, State state,
            Pageable pageable);

    default Page<Client> elasticsearch(String keyword, String username, Boolean tontine, Pageable pageable) {
        return findAll(getElasticsearchCriteria(keyword, username, tontine), pageable);
    }

    default Specification<Client> getElasticsearchCriteria(String keyword, String username, boolean tontine) {
        final String searchKeyword = String.format("%%%s%%", keyword.toLowerCase());

        return (root, query, cb) -> {
            jakarta.persistence.criteria.Predicate p = cb.or(
                    cb.like(cb.lower(root.get("firstname")), searchKeyword),
                    cb.like(cb.lower(root.get("lastname")), searchKeyword),
                    cb.like(cb.lower(root.get("address")), searchKeyword),
                    cb.like(cb.lower(root.get("phone")), searchKeyword),
                    cb.like(cb.lower(root.get("cardID")), searchKeyword),
                    cb.like(cb.lower(root.get("contactPersonName")), searchKeyword),
                    cb.like(cb.lower(root.get("contactPersonPhone")), searchKeyword),
                    cb.like(cb.lower(root.get("contactPersonAddress")), searchKeyword),
                    cb.like(cb.lower(root.get("collector")), searchKeyword),
                    cb.like(cb.lower(root.get("quarter")), searchKeyword),
                    cb.like(cb.lower(root.get("cardType")), searchKeyword));
            if (Objects.nonNull(username) && username.startsWith("COM")) {
                if (Objects.nonNull(tontine) && tontine) {
                    jakarta.persistence.criteria.Predicate p2 = cb.and(p,
                            cb.equal(root.get("tontineCollector"), username));
                    return cb.and(p2, cb.notEqual(root.get("state"), State.DELETED));
                }
                jakarta.persistence.criteria.Predicate p2 = cb.and(p, cb.equal(root.get("collector"), username));
                return cb.and(p2, cb.notEqual(root.get("state"), State.DELETED));
            }

            return cb.and(p, cb.notEqual(root.get("state"), State.DELETED));
        };
    }

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.collector,
                c.quarter, c.creditInProgress, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector)
                FROM Client c
                WHERE (c.collector = :collector OR c.tontineCollector = :collector) AND c.clientType = :clientType AND c.state = :state
            """)
    Page<ClientRespDto> findByCollectorAndClientTypeAndState(String collector, ClientType clientType, State state,
            Pageable pageable);

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.tontineCollector,
                c.quarter, c.creditInProgress, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector)
                FROM Client c
                WHERE c.tontineCollector = :collector AND c.clientType = :clientType AND c.state = :state
            """)
    Page<ClientRespDto> findByTontineCollectorAndClientTypeAndState(String collector, ClientType clientType,
            State state, Pageable pageable);

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.collector,
                c.quarter, c.creditInProgress, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector)
                FROM Client c
                WHERE (c.tontineCollector = :collector OR c.collector = :collector) AND c.clientType = :clientType AND c.state = :state
            """)
    Page<ClientRespDto> findByCollectorAndTontineCollectorAndClientTypeAndState(String collector, ClientType clientType,
            State state, Pageable pageable);

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.collector,
                c.quarter, c.creditInProgress, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector)
                FROM Client c
                WHERE c.state <> :state

            """)
    Page<ClientRespDto> getByStateNot(State state, Pageable pageable);

    @Query(value = "SELECT c.profilPhoto FROM Client c WHERE c.id = :id")
    byte[] getProfilPhoto(Long id);

    @Query(value = "SELECT c.IDDoc FROM Client c WHERE c.id = :id")
    byte[] getCardPhoto(Long id);

    boolean existsByFirstnameAndLastname(String firstname, String lastname);

    // AJOUTÉ : Méthodes pour la vérification de l'unicité
    boolean existsByPhoneAndIdNot(String phone, Long id);

    boolean existsByCardIDAndIdNot(String cardID, Long id);
}
