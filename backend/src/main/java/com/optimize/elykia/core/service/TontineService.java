package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.dto.TontineMemberDto;
import com.optimize.elykia.core.entity.TontineCollection;
import com.optimize.elykia.core.entity.TontineMember;
import com.optimize.elykia.core.entity.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.optimize.elykia.core.dto.TontineSessionUpdateDto;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Join;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import lombok.Getter;

@Service
@Transactional
@Getter
public class TontineService extends GenericService<TontineMember, Long> {

    private final TontineSessionRepository tontineSessionRepository;
    private final TontineCollectionRepository tontineCollectionRepository;
    private final ClientService clientService;
    private final UserService userService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    protected TontineService(TontineMemberRepository repository,
            TontineSessionRepository tontineSessionRepository,
            TontineCollectionRepository tontineCollectionRepository,
            ClientService clientService,
            UserService userService,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.tontineSessionRepository = tontineSessionRepository;
        this.tontineCollectionRepository = tontineCollectionRepository;
        this.clientService = clientService;
        this.userService = userService;
        this.eventPublisher = eventPublisher;
    }

    public TontineSession getActiveSession() {
        int currentYear = LocalDate.now().getYear();
        return tontineSessionRepository.findByYear(currentYear)
                .orElseGet(() -> {
                    TontineSession newSession = new TontineSession();
                    newSession.setYear(currentYear);
                    newSession.setStartDate(LocalDate.of(currentYear, 2, 1));
                    newSession.setEndDate(LocalDate.of(currentYear, 11, 30));
                    newSession.setStatus(TontineSessionStatus.ACTIVE);
                    return tontineSessionRepository.save(newSession);
                });
    }

    public TontineSession updateCurrentSession(TontineSessionUpdateDto dto) {
        int currentYear = LocalDate.now().getYear();
        TontineSession session = tontineSessionRepository.findByYear(currentYear)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Aucune session de tontine active trouvée pour l'année en cours."));

        if (dto.getStartDate().getYear() != currentYear || dto.getEndDate().getYear() != currentYear) {
            throw new CustomValidationException("Les dates de début et de fin doivent être pour l'année en cours.");
        }

        session.setStartDate(dto.getStartDate());
        session.setEndDate(dto.getEndDate());

        return tontineSessionRepository.save(session);
    }

    public Map<String, Object> registerMembers(Set<TontineMemberDto> dto) {
        Map<String, Object> response = new HashMap<>();
        List<TontineMember> success = new ArrayList<>();
        List<TontineMemberDto> fail = new ArrayList<>();

        for (TontineMemberDto memberDto : dto) {
            try {
                TontineMember member = registerMember(memberDto);
                success.add(member);
                response.put("success", success);
            } catch (Exception e) {
                fail.add(memberDto);
                response.put("fail", fail);
            }
        }

        return response;
    }

    public TontineMember registerMember(TontineMemberDto dto) {
        Client client = clientService.getById(dto.getClientId());
        TontineSession activeSession = getActiveSession();

        // Prevent duplicate registration for the same year
        Optional<TontineMember> existingMember = getRepository()
                .findByTontineSession_YearAndClient_Id(activeSession.getYear(), dto.getClientId());
        if (existingMember.isPresent()) {
            throw new CustomValidationException(
                    "Ce client est déjà enregistré pour la session de tontine de cette année.");
        }

        TontineMember newMember = new TontineMember();
        newMember.setClient(client);
        newMember.setTontineSession(activeSession);
        newMember.setFrequency(dto.getFrequency());
        newMember.setRegistrationDate(LocalDateTime.now());
        newMember.setAmount(dto.getAmount());

        TontineMember savedMember = this.create(newMember);

        // Publish Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineMemberEnrolledEvent(
                    this,
                    savedMember.getClient().getTontineCollector()));
        }

        return savedMember;
    }

    public TontineCollection recordCollection(TontineCollectionDto dto) {
        TontineSession currentSession = getActiveSession();
        if (!TontineSessionStatus.ACTIVE.equals(currentSession.getStatus())) {
            throw new CustomValidationException(
                    "La session de cette année est déjà clôturer, Vous ne pouvez plus enregistrer de collecte !");
        }
        TontineMember member = this.getById(dto.getMemberId());
        String commercialUsername = userService.getCurrentUser().getUsername();

        TontineCollection collection = new TontineCollection();
        collection.setTontineMember(member);
        collection.setAmount(dto.getAmount());
        collection.setIsDeliveryCollection(
                Objects.nonNull(dto.getIsDeliveryCollection()) ? dto.getIsDeliveryCollection() : Boolean.FALSE);
        collection.setCollectionDate(LocalDateTime.now());
        collection.setCommercialUsername(commercialUsername);

        // Update the member's total contribution
        member.setTotalContribution(member.getTotalContribution() + dto.getAmount());

        // Calculate member status (society share, validated months, etc.)
        calculateMemberStatus(member);

        this.update(member);

        // Update session total revenue
        TontineSession session = member.getTontineSession();
        updateSessionRevenue(session);

        TontineCollection savedCollection = tontineCollectionRepository.save(collection);

        // Publish Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineCollectionEvent(
                    this,
                    savedCollection.getAmount(),
                    savedCollection.getCommercialUsername()));
        }

        return savedCollection;
    }

    private void calculateMemberStatus(TontineMember member) {
        if (member.getAmount() == null || member.getAmount() == 0) {
            return;
        }

        Double dailyAmount = member.getAmount();
        Double totalContrib = member.getTotalContribution();

        // Calculate total days equivalent paid
        int totalDaysPaid = (int) (totalContrib / dailyAmount);

        // Constants for logic
        int DAYS_PER_MONTH = 31;
        int MAX_MONTHS = 10;

        int validatedMonths = totalDaysPaid / DAYS_PER_MONTH;
        int remainderDays = totalDaysPaid % DAYS_PER_MONTH;

        // Cap at 10 months
        if (validatedMonths >= MAX_MONTHS) {
            validatedMonths = MAX_MONTHS;
            // After 10 months, all extra goes to member?
            // Based on req: "Si les 10 mois sont tous validés et que le membre fait encore
            // des collecte alors on ne prends plus de marge sur ce qu'il cotise."
            // So society share is capped at 10 * dailyAmount.
            remainderDays = 0; // Or just ignore remainder for society share calc
        }

        Double societyShare = validatedMonths * dailyAmount;
        Double availableContribution = totalContrib - societyShare;

        member.setValidatedMonths(validatedMonths);
        member.setCurrentMonthDays(remainderDays);
        member.setSocietyShare(societyShare);
        member.setAvailableContribution(availableContribution);
    }

    private void updateSessionRevenue(TontineSession session) {
        Double totalRevenue = getRepository().sumSocietyShareByTontineSessionId(session.getId(),
                com.optimize.common.entities.enums.State.ENABLED);
        session.setTotalRevenue(totalRevenue != null ? totalRevenue : 0.0);
        tontineSessionRepository.save(session);
    }

    public Page<TontineMember> getMembers(User currentUser, String search, String deliveryStatus, String commercial,
            Pageable pageable) {
        int currentYear = LocalDate.now().getYear();

        Specification<TontineMember> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by current year
            predicates.add(cb.equal(root.get("tontineSession").get("year"), currentYear));

            // Filter by promoter if the current user is a promoter
            if (currentUser.is(UserProfilConstant.PROMOTER)) {
                predicates.add(cb.equal(root.get("client").get("tontineCollector"), currentUser.getUsername()));
            }

            if (StringUtils.hasText(commercial)) {
                predicates.add(cb.equal(root.get("client").get("tontineCollector"), commercial));
            }

            // Search by client fields
            if (StringUtils.hasText(search)) {
                String lowerCaseSearch = "%" + search.toLowerCase() + "%";
                Join<TontineMember, Client> clientJoin = root.join("client");
                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(clientJoin.get("firstname")), lowerCaseSearch),
                        cb.like(cb.lower(clientJoin.get("lastname")), lowerCaseSearch),
                        cb.like(cb.lower(clientJoin.get("phone")), lowerCaseSearch),
                        cb.like(cb.lower(clientJoin.get("code")), lowerCaseSearch));
                predicates.add(searchPredicate);
            }

            // Filter by delivery status
            if (StringUtils.hasText(deliveryStatus)) {
                try {
                    TontineMemberDeliveryStatus status = TontineMemberDeliveryStatus
                            .valueOf(deliveryStatus.toUpperCase());
                    predicates.add(cb.equal(root.get("deliveryStatus"), status));
                } catch (IllegalArgumentException e) {
                    // Handle invalid status, e.g., ignore or throw a specific exception
                    // For now, we'll just ignore it and not add the predicate
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return getRepository().findAll(spec, pageable);
    }

    public Page<TontineCollection> getCollections(Pageable pageable) {
        User currentUser = userService.getCurrentUser();
        int currentYear = LocalDate.now().getYear();

        Specification<TontineCollection> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by current year
            predicates.add(cb.equal(root.get("tontineMember").get("tontineSession").get("year"), currentYear));

            // Filter by promoter if the current user is a promoter
            if (currentUser.is(UserProfilConstant.PROMOTER)) {
                predicates.add(cb.equal(root.get("commercialUsername"), currentUser.getUsername()));
            }

            predicates.add(cb.equal(root.get("state"), State.ENABLED));

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return tontineCollectionRepository.findAll(spec, pageable);
    }

    @Override
    public TontineMember getById(Long id) {
        TontineMember member = super.getById(id);
        Double totalDeliveryCollections = tontineCollectionRepository.sumDeliveryCollectionsByMember(id, State.ENABLED);
        member.setTotalDeliveryCollections(totalDeliveryCollections != null ? totalDeliveryCollections : 0.0);
        return member;
    }

    @Override
    public TontineMemberRepository getRepository() {
        return (TontineMemberRepository) repository;
    }
}