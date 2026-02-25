package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.TontineCollectionDto;
import com.optimize.elykia.core.dto.TontineMemberDto;
import com.optimize.elykia.core.entity.TontineCollection;
import com.optimize.elykia.core.entity.TontineMember;
import com.optimize.elykia.core.entity.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineMemberUpdateScope;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberAmountHistoryRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.optimize.elykia.core.dto.TontineSessionUpdateDto;

import jakarta.persistence.criteria.Predicate;
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
    private TontineMemberAmountHistoryRepository tontineMemberAmountHistoryRepository;
    private final ClientService clientService;
    private final UserService userService;
    private final ParameterService parameterService;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;

    protected TontineService(TontineMemberRepository repository,
            TontineSessionRepository tontineSessionRepository,
            TontineCollectionRepository tontineCollectionRepository,
            ClientService clientService,
            UserService userService,
            ParameterService parameterService,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.tontineSessionRepository = tontineSessionRepository;
        this.tontineCollectionRepository = tontineCollectionRepository;
        this.clientService = clientService;
        this.userService = userService;
        this.parameterService = parameterService;
        this.eventPublisher = eventPublisher;
    }

    @Autowired
    public void setTontineMemberAmountHistoryRepository(TontineMemberAmountHistoryRepository tontineMemberAmountHistoryRepository) {
        this.tontineMemberAmountHistoryRepository = tontineMemberAmountHistoryRepository;
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

        // Initialize history with the first amount
        TontineMemberAmountHistory history = new TontineMemberAmountHistory();
        history.setTontineMember(newMember);
        history.setAmount(dto.getAmount());
        history.setStartDate(activeSession.getStartDate()); 
        
        newMember.getAmountHistory().add(history);

        TontineMember savedMember = this.create(newMember);

        // Publish Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineMemberEnrolledEvent(
                    this,
                    savedMember.getCreatedBy(),
                    savedMember.getClient().getFullName()));
        }

        return savedMember;
    }

    public TontineMember updateMember(Long id, TontineMemberDto dto) {
        TontineMember member = getById(id);

        if (dto.getFrequency() != null) {
            member.setFrequency(dto.getFrequency());
        }

        if (dto.getAmount() != null && !dto.getAmount().equals(member.getAmount())) {
            // Capture old society share before recalculation
            Double oldSocietyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;

            // Amount has changed, handle history based on scope
            handleAmountChange(member, dto.getAmount(), dto.getUpdateScope());
            member.setAmount(dto.getAmount());

            // Recalculate society share based on new amount history
            // We need to re-run the allocation logic as if we are validating the current state
            // But processCollectionAllocation is designed for adding new money.
            // Here we just want to update the target/theoretical share and adjust the actual share if needed?
            // Actually, changing the daily amount changes the target society share.
            // If the target increases, the deficit increases.
            // If the target decreases, the member might have overpaid society share.
            
            // Let's recalculate the target society share and update the member's society share
            // We can reuse part of the logic from processCollectionAllocation but without adding new money.
            recalculateSocietyShareAfterUpdate(member);

            Double newSocietyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;

            // Update session revenue: subtract old share, add new share
            TontineSession session = member.getTontineSession();
            Double currentSessionRevenue = session.getTotalRevenue() != null ? session.getTotalRevenue() : 0.0;
            session.setTotalRevenue(currentSessionRevenue - oldSocietyShare + newSocietyShare);
            tontineSessionRepository.save(session);
        }

        // Notes handling if needed (skipped as per previous logic)

        return this.update(member);
    }

    private void recalculateSocietyShareAfterUpdate(TontineMember member) {
        Double currentSocietyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;
        
        // Calculate Target Society Share based on Time and History
        LocalDate startDate = member.getTontineSession().getStartDate();
        boolean useRegistrationDate = parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE");
        if (useRegistrationDate && member.getRegistrationDate() != null) {
            LocalDate regDate = member.getRegistrationDate().toLocalDate();
            if (regDate.isAfter(startDate)) {
                startDate = regDate;
            }
        }

        LocalDate now = LocalDate.now();
        Double targetSocietyShare = 0.0;
        
        LocalDate iterDate = startDate;
        int monthsCounted = 0;
        int MAX_MONTHS = 10;

        while (!iterDate.isAfter(now) && monthsCounted < MAX_MONTHS) {
             Double applicableAmount = getApplicableAmountForDate(member, iterDate);
             targetSocietyShare += applicableAmount;
             monthsCounted++;
             iterDate = iterDate.plusMonths(1);
        }

        // Logic:
        // If we have collected enough total money to cover the new target share, we allocate it.
        // If the new target is lower than current share, we might reduce the share (and increase capital).
        // If the new target is higher, we increase share (and reduce capital) IF there is enough total contribution.
        
        Double totalContrib = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;
        
        // The society share should be the target, capped by what the user has actually paid.
        Double newSocietyShare = Math.min(totalContrib, targetSocietyShare);
        
        member.setSocietyShare(newSocietyShare);
        
        // Recalculate derived status (validated months) based on remaining capital
        calculateMemberStatus(member);
    }

    private void handleAmountChange(TontineMember member, Double newAmount, TontineMemberUpdateScope scope) {
        if (scope == null) {
            scope = TontineMemberUpdateScope.CURRENT_AND_FUTURE; // Default behavior
        }

        LocalDate today = LocalDate.now();
        LocalDate firstDayOfCurrentMonth = today.withDayOfMonth(1);
        LocalDate firstDayOfNextMonth = today.plusMonths(1).withDayOfMonth(1);

        List<TontineMemberAmountHistory> history = member.getAmountHistory();
        
        // Sort history by start date
        history.sort(Comparator.comparing(TontineMemberAmountHistory::getStartDate));

        switch (scope) {
            case GLOBAL:
                // Clear history and create a single new entry from the beginning
                history.clear();
                TontineMemberAmountHistory globalEntry = new TontineMemberAmountHistory();
                globalEntry.setTontineMember(member);
                globalEntry.setAmount(newAmount);
                globalEntry.setStartDate(member.getTontineSession().getStartDate()); // Or earliest relevant date
                history.add(globalEntry);
                break;

            case CURRENT_AND_FUTURE:
                // Close previous entry at end of last month
                // Create new entry starting first day of current month
                closeHistoryAt(history, firstDayOfCurrentMonth.minusDays(1));
                
                TontineMemberAmountHistory currentEntry = new TontineMemberAmountHistory();
                currentEntry.setTontineMember(member);
                currentEntry.setAmount(newAmount);
                currentEntry.setStartDate(firstDayOfCurrentMonth);
                history.add(currentEntry);
                break;

            case FUTURE_ONLY:
                // Close previous entry at end of current month
                // Create new entry starting first day of next month
                closeHistoryAt(history, firstDayOfNextMonth.minusDays(1));

                TontineMemberAmountHistory futureEntry = new TontineMemberAmountHistory();
                futureEntry.setTontineMember(member);
                futureEntry.setAmount(newAmount);
                futureEntry.setStartDate(firstDayOfNextMonth);
                history.add(futureEntry);
                break;
        }
    }

    private void closeHistoryAt(List<TontineMemberAmountHistory> history, LocalDate endDate) {
        // Find the active entry (where endDate is null or after the new endDate)
        // And close it.
        
        for (TontineMemberAmountHistory entry : history) {
            if (entry.getEndDate() == null || entry.getEndDate().isAfter(endDate)) {
                // This entry was supposed to go on, but we cut it short.
                // If the entry starts after the cut-off, it should be removed (it's in the future relative to the cut-off)
                if (entry.getStartDate().isAfter(endDate)) {
                    // This case shouldn't happen if we are just appending, but for safety with "FUTURE_ONLY" etc.
                    // If we are setting a future amount, we might be overwriting a previously set future amount.
                    // For now, let's assume we just close the current active one.
                } else {
                    entry.setEndDate(endDate);
                }
            }
        }
        // Remove entries that are completely after the new end date (if any, e.g. if we changed mind from Future to Current)
        history.removeIf(entry -> entry.getStartDate().isAfter(endDate));
    }

    public TontineCollection recordCollection(TontineCollectionDto dto) {
        TontineSession currentSession = getActiveSession();
        if (!TontineSessionStatus.ACTIVE.equals(currentSession.getStatus())) {
            throw new CustomValidationException(
                    "La session de cette année est déjà clôturer, Vous ne pouvez plus enregistrer de collecte !");
        }

        // Check for duplicate reference
        if (StringUtils.hasText(dto.getReference())) {
            if (tontineCollectionRepository.existsByReference(dto.getReference())) {
                return tontineCollectionRepository.findByReference(dto.getReference()).orElseThrow();
            }
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

        if (StringUtils.hasText(dto.getReference())) {
            collection.setReference(dto.getReference());
        }

        // Process financial logic (Society Share vs Capital)
        processCollectionAllocation(member, dto.getAmount());

        this.update(member);

        // Update session total revenue
        TontineSession session = member.getTontineSession();
        updateSessionRevenue(session);

        TontineCollection savedCollection = tontineCollectionRepository.save(collection);

        // Publish Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineCollectionEvent(
                    this,
                    collection.getAmount(),
                    collection.getCommercialUsername(),
                    member.getClient().getFullName()));
        }

        return savedCollection;
    }

    private void processCollectionAllocation(TontineMember member, Double amountCollected) {
        Double currentSocietyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;
        Double currentTotalContribution = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;

        // 1. Calculate Target Society Share based on Time (Months started since session
        // start OR registration date)
        LocalDate startDate = member.getTontineSession().getStartDate();

        // Check parameter to decide whether to use Session Start Date or Member
        // Registration Date
        boolean useRegistrationDate = parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE");
        if (useRegistrationDate && member.getRegistrationDate() != null) {
            LocalDate regDate = member.getRegistrationDate().toLocalDate();
            // If registration is after session start, use registration date
            if (regDate.isAfter(startDate)) {
                startDate = regDate;
            }
        }

        LocalDate now = LocalDate.now();
        Double targetSocietyShare = 0.0;
        
        // Iterate through months to calculate share based on history
        LocalDate iterDate = startDate;
        int monthsCounted = 0;
        int MAX_MONTHS = 10;

        while (!iterDate.isAfter(now) && monthsCounted < MAX_MONTHS) {
             // For this month (represented by iterDate), find the applicable amount
             Double applicableAmount = getApplicableAmountForDate(member, iterDate);
             targetSocietyShare += applicableAmount;
             
             monthsCounted++;
             iterDate = iterDate.plusMonths(1);
        }

        // 2. Calculate Deficit (What is owed to society up to today)
        double societyShareDeficit = targetSocietyShare - currentSocietyShare;
        if (societyShareDeficit < 0)
            societyShareDeficit = 0.0;

        // 3. Allocate Collection Amount
        double amountForSociety = 0.0;

        if (societyShareDeficit > 0) {
            amountForSociety = Math.min(amountCollected, societyShareDeficit);
        }

        // 4. Update Member State
        member.setSocietyShare(currentSocietyShare + amountForSociety);
        member.setTotalContribution(currentTotalContribution + amountCollected);

        // 5. Recalculate derived status (validated months) based on remaining capital
        calculateMemberStatus(member);
    }
    
    private Double getApplicableAmountForDate(TontineMember member, LocalDate date) {
        // Find the history entry that covers this date
        // If multiple (shouldn't happen with clean logic), take the latest created one or specific logic?
        // Our logic ensures non-overlapping or clear cut-offs.
        // We look for an entry where startDate <= date AND (endDate == null OR endDate >= date)
        
        // However, the requirement says: "s'il y plusieurs changement dans un mois qui concerne le mois présent et futur, on ne prendra que la dernière valeur pour le calcul de la part société pour le mois."
        // This implies we should look for the entry valid at the END of the month? Or the one valid at the specific date?
        // "pour le mois" suggests one value per month.
        // If I change amount on 5th, and then on 20th. The value for that month should be the one on 20th.
        // So we should look for the amount valid at the end of that month (or today if it's current month).
        
        LocalDate targetLookupDate = date.withDayOfMonth(date.lengthOfMonth());
        if (targetLookupDate.isAfter(LocalDate.now())) {
            targetLookupDate = LocalDate.now(); // For current month, take today's status? Or end of month projection?
            // If we are in current month, and we changed amount today, we want today's amount.
        }
        
        // Actually, simpler: Find the entry active at 'date'. If multiple changes happened in that month, 
        // the 'startDate' of the latest change would be in that month.
        // So we want the entry with the latest startDate that is <= end of that month.
        
        LocalDate endOfMonth = date.withDayOfMonth(date.lengthOfMonth());
        
        return member.getAmountHistory().stream()
                .filter(h -> !h.getStartDate().isAfter(endOfMonth)) // Started before or during this month
                .sorted(Comparator.comparing(TontineMemberAmountHistory::getStartDate).reversed()) // Latest first
                .map(TontineMemberAmountHistory::getAmount)
                .findFirst()
                .orElse(member.getAmount()); // Fallback to current amount if no history found (shouldn't happen if initialized correctly)
    }

    private void calculateMemberStatus(TontineMember member) {
        if (member.getAmount() == null || member.getAmount() == 0) {
            return;
        }

        Double dailyAmount = member.getAmount();
        Double totalContrib = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;
        Double societyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;

        // Capital available for validation is Total - SocietyShare
        Double availableContribution = totalContrib - societyShare;
        if (availableContribution < 0)
            availableContribution = 0.0;

        // Constants for logic
        int DAYS_PER_MONTH = 31;
        int MAX_MONTHS = 10;

        // Calculate total days equivalent available in capital
        int totalDaysAvailable = (int) (availableContribution / dailyAmount);

        int validatedMonths = totalDaysAvailable / DAYS_PER_MONTH;
        int remainderDays = totalDaysAvailable % DAYS_PER_MONTH;

        // Cap at 10 months
        if (validatedMonths >= MAX_MONTHS) {
            validatedMonths = MAX_MONTHS;
            // If 10 months validated, remainder days are just extra capital
        }

        member.setValidatedMonths(validatedMonths);
        member.setCurrentMonthDays(remainderDays);
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

    public List<TontineMemberAmountHistory> getMembersHistory(String commercial) {
        User currentUser = userService.getCurrentUser();
        int currentYear = LocalDate.now().getYear();

        Specification<TontineMemberAmountHistory> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Filter by current year via TontineMember -> TontineSession
            predicates.add(cb.equal(root.get("tontineMember").get("tontineSession").get("year"), currentYear));

            // Filter by commercial
            if (StringUtils.hasText(commercial)) {
                predicates.add(cb.equal(root.get("tontineMember").get("client").get("tontineCollector"), commercial));
            } else if (currentUser.is(UserProfilConstant.PROMOTER)) {
                predicates.add(cb.equal(root.get("tontineMember").get("client").get("tontineCollector"), currentUser.getUsername()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return tontineMemberAmountHistoryRepository.findAll(spec);
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