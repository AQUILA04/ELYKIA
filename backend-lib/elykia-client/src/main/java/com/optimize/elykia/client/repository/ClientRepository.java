package com.optimize.elykia.client.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.dto.ClientPhotoDto;
import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.spec.ClientCommercialPredicates;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

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
                    cb.like(cb.lower(root.get("tontineCollector")), searchKeyword),
                    cb.like(cb.lower(root.get("agencyCollector")), searchKeyword),
                    cb.like(cb.lower(root.get("recoveryCollector")), searchKeyword),
                    cb.like(cb.lower(root.get("quarter")), searchKeyword),
                    cb.like(cb.lower(root.get("cardType")), searchKeyword));
            if (Objects.nonNull(username) && username.startsWith("COM")) {
                if (tontine) {
                    jakarta.persistence.criteria.Predicate p2 = cb.and(p,
                            cb.equal(root.get("tontineCollector"), username));
                    return cb.and(p2, cb.notEqual(root.get("state"), State.DELETED));
                }
                jakarta.persistence.criteria.Predicate p2 = cb.and(p,
                        ClientCommercialPredicates.anyCollectorEquals(root, cb, username));
                return cb.and(p2, cb.notEqual(root.get("state"), State.DELETED));
            }

            return cb.and(p, cb.notEqual(root.get("state"), State.DELETED));
        };
    }

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.collector,
                c.quarter, c.creditInProgress, c.businessCreditInProgress, c.businessCreditAuthorized, c.businessCreditAuthorizedBy, c.businessCreditAuthorizedAt, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector, c.createdDate, c.profilPhotoThumbUrl, c.cardPhotoThumbUrl)
                FROM Client c
                WHERE (c.collector = :collector OR c.tontineCollector = :collector OR c.agencyCollector = :collector OR c.recoveryCollector = :collector) AND c.clientType = :clientType AND c.state = :state
            """)
    Page<ClientRespDto> findByCollectorAndClientTypeAndState(String collector, ClientType clientType, State state,
            Pageable pageable);

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.tontineCollector,
                c.quarter, c.creditInProgress, c.businessCreditInProgress, c.businessCreditAuthorized, c.businessCreditAuthorizedBy, c.businessCreditAuthorizedAt, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector, c.createdDate, c.profilPhotoThumbUrl, c.cardPhotoThumbUrl)
                FROM Client c
                WHERE c.tontineCollector = :collector AND c.clientType = :clientType AND c.state = :state
            """)
    Page<ClientRespDto> findByTontineCollectorAndClientTypeAndState(String collector, ClientType clientType,
            State state, Pageable pageable);

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.collector,
                c.quarter, c.creditInProgress, c.businessCreditInProgress, c.businessCreditAuthorized, c.businessCreditAuthorizedBy, c.businessCreditAuthorizedAt, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector, c.createdDate, c.profilPhotoThumbUrl, c.cardPhotoThumbUrl)
                FROM Client c
                WHERE (c.collector = :collector OR c.tontineCollector = :collector OR c.agencyCollector = :collector OR c.recoveryCollector = :collector) AND c.clientType = :clientType AND c.state = :state
            """)
    Page<ClientRespDto> findByCollectorAndTontineCollectorAndClientTypeAndState(String collector, ClientType clientType,
            State state, Pageable pageable);

    @Query(value = """
                SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id,
                c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth,
                c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.collector,
                c.quarter, c.creditInProgress, c.businessCreditInProgress, c.businessCreditAuthorized, c.businessCreditAuthorizedBy, c.businessCreditAuthorizedAt, c.occupation, c.clientType, c.latitude, c.longitude,
                c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector, c.createdDate, c.profilPhotoThumbUrl, c.cardPhotoThumbUrl)
                FROM Client c
                WHERE c.state <> :state

            """)
    Page<ClientRespDto> getByStateNot(State state, Pageable pageable);

    @Query(value = "SELECT c.profilPhoto FROM Client c WHERE c.id = :id")
    byte[] getProfilPhoto(Long id);

    @Query(value = "SELECT c.IDDoc FROM Client c WHERE c.id = :id")
    byte[] getCardPhoto(Long id);

    @Query(value = "SELECT new com.optimize.elykia.client.dto.ClientPhotoDto(c.id, c.profilPhoto) FROM Client c WHERE c.id IN :ids")
    List<ClientPhotoDto> getProfilPhotos(List<Long> ids);

    @Query(value = "SELECT new com.optimize.elykia.client.dto.ClientPhotoDto(c.id, c.IDDoc) FROM Client c WHERE c.id IN :ids")
    List<ClientPhotoDto> getCardPhotos(List<Long> ids);

    @Query(value = "SELECT c FROM Client c WHERE c.id IN :ids")
    List<Client> findAllByIds(List<Long> ids);

    boolean existsByFirstnameAndLastname(String firstname, String lastname);

    // AJOUTÉ : Méthodes pour la vérification de l'unicité
    boolean existsByPhoneAndIdNot(String phone, Long id);
    
    boolean existsByPhoneAndFirstnameAndLastname(String phone, String firstname, String lastname);
    
    Optional<Client> findByPhoneAndFirstnameAndLastname(String phone, String firstname, String lastname);

    boolean existsByCardIDAndIdNot(String cardID, Long id);

    boolean existsByCardIDAndFirstnameAndLastname(String cardID, String firstname, String lastname);
    
    Optional<Client> findByCardIDAndFirstnameAndLastname(String cardID, String firstname, String lastname);

    Optional<Client> findByPhoneAndIdNot(String phone, Long id);

    Optional<Client> findByCardIDAndIdNot(String cardID, Long id);

    List<Client> findByClientTypeAndState(ClientType clientType, State state);

    Optional<Client> findFirstByPhoneAndClientTypeAndState(String phone, ClientType clientType, State state);

    @Query("SELECT new com.optimize.elykia.client.dto.ClientRespDto(c.id, c.firstname, c.lastname, c.address, c.phone, c.cardID, c.cardType, c.dateOfBirth, c.contactPersonName, c.contactPersonPhone, c.contactPersonAddress, c.collector, c.quarter, c.creditInProgress, c.businessCreditInProgress, c.businessCreditAuthorized, c.businessCreditAuthorizedBy, c.businessCreditAuthorizedAt, c.occupation, c.clientType, c.latitude, c.longitude, c.mll, c.syncDate, c.code, c.profilPhotoUrl, c.cardPhotoUrl, c.tontineCollector, c.createdDate, c.profilPhotoThumbUrl, c.cardPhotoThumbUrl) " +
       "FROM Client c " +
       "WHERE c.state <> com.optimize.common.entities.enums.State.DELETED " +
       "AND (:#{#username == null} = true OR ( " +
       "    (:#{#tontine == true} = true AND c.tontineCollector = :username) OR " +
       "    (:#{#mobile == true} = true AND " + ClientCommercialPredicates.ANY_EQUALS_C_USERNAME + ") OR " +
       "    (:#{#tontine != true AND #mobile != true} = true AND " + ClientCommercialPredicates.ANY_EQUALS_C_USERNAME + ")" +
       "))")
    Page<ClientRespDto> findClientsDto(@Param("username") String username, @Param("tontine") Boolean tontine, @Param("mobile") Boolean mobile, Pageable pageable);

    @Query("""
            SELECT COUNT(c) FROM Client c
            WHERE c.state <> com.optimize.common.entities.enums.State.DELETED
            AND (:#{#username == null} = true OR (c.collector = :username OR c.tontineCollector = :username OR c.agencyCollector = :username OR c.recoveryCollector = :username))
            """)
    long countActiveClients(@Param("username") String username);

    @Query("""
            SELECT COUNT(c) FROM Client c
            WHERE c.state <> com.optimize.common.entities.enums.State.DELETED
            AND c.creditInProgress = true
            AND (:#{#username == null} = true OR (c.collector = :username OR c.tontineCollector = :username OR c.agencyCollector = :username OR c.recoveryCollector = :username))
            """)
    long countClientsWithCreditInProgress(@Param("username") String username);

    @Query("""
            SELECT COUNT(c) FROM Client c
            WHERE c.state <> com.optimize.common.entities.enums.State.DELETED
            AND c.isTontineMember = true
            AND (:#{#username == null} = true OR (c.collector = :username OR c.tontineCollector = :username OR c.agencyCollector = :username OR c.recoveryCollector = :username))
            """)
    long countTontineMembers(@Param("username") String username);

    @Query("""
            SELECT COUNT(c) FROM Client c
            WHERE c.state <> com.optimize.common.entities.enums.State.DELETED
            AND (c.creditInProgress IS NULL OR c.creditInProgress = false)
            AND c.isTontineMember = false
            AND (:#{#username == null} = true OR (c.collector = :username OR c.tontineCollector = :username OR c.agencyCollector = :username OR c.recoveryCollector = :username))
            """)
    long countClientsWithoutCreditNorTontine(@Param("username") String username);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Client c SET c.collector = :collector
            WHERE c.id IN :clientIds AND c.state <> com.optimize.common.entities.enums.State.DELETED
            """)
    int bulkUpdateCollector(@Param("clientIds") List<Long> clientIds, @Param("collector") String collector);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Client c SET c.tontineCollector = :tontineCollector
            WHERE c.id IN :clientIds AND c.state <> com.optimize.common.entities.enums.State.DELETED
            """)
    int bulkUpdateTontineCollector(@Param("clientIds") List<Long> clientIds,
            @Param("tontineCollector") String tontineCollector);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE Client c SET c.recoveryCollector = :recoveryCollector
            WHERE c.id IN :clientIds AND c.state <> com.optimize.common.entities.enums.State.DELETED
            """)
    int bulkUpdateRecoveryCollector(@Param("clientIds") List<Long> clientIds,
            @Param("recoveryCollector") String recoveryCollector);

    @Query("""
            SELECT c.id as id, c.collector as collector, c.tontineCollector as tontineCollector
            FROM Client c
            WHERE c.id IN :clientIds AND c.state <> com.optimize.common.entities.enums.State.DELETED
            """)
    List<ClientCollectorSnapshot> findCollectorSnapshotsByIds(@Param("clientIds") List<Long> clientIds);

    @Query("""
            SELECT c FROM Client c
            WHERE (c.collector = :collector OR c.tontineCollector = :collector OR c.agencyCollector = :collector OR c.recoveryCollector = :collector)
              AND c.clientType = :clientType
              AND c.state = :state
            ORDER BY c.quarter ASC, c.lastname ASC, c.firstname ASC
            """)
    List<Client> findAllEnabledClientsForCommercialExport(
            @Param("collector") String collector,
            @Param("clientType") ClientType clientType,
            @Param("state") State state);
}
