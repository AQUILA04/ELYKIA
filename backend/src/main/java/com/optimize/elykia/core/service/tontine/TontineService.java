package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistory;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineMemberUpdateScope;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.event.TontineCollectionCancelledEvent;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberAmountHistoryRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.util.UserProfilConstant;
import com.optimize.elykia.core.monitoring.BusinessMetricsPublisher;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import lombok.Getter;

@Slf4j
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
    private BusinessMetricsPublisher metricsPublisher;

    public TontineService(TontineMemberRepository repository,
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

    @Autowired(required = false)
    public void setMetricsPublisher(BusinessMetricsPublisher metricsPublisher) {
        this.metricsPublisher = metricsPublisher;
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

    /**
     * Clôture la session de l'année en cours et passe les membres en attente de livraison.
     * Utilisé par le scheduler et exposé pour les tests E2E / opérations admin.
     */
    public TontineSession closeCurrentSession() {
        TontineSession session = getActiveSession();
        if (session.getStatus() == TontineSessionStatus.CLOSED) {
            return session;
        }

        session.setStatus(TontineSessionStatus.CLOSED);
        tontineSessionRepository.save(session);

        TontineMemberRepository memberRepository = (TontineMemberRepository) getRepository();
        Pageable pageable = PageRequest.of(0, 100);
        Page<TontineMember> memberPage;
        do {
            memberPage = memberRepository.findByTontineSessionIdAndState(session.getId(), State.ENABLED, pageable);
            List<TontineMember> members = memberPage.getContent();
            if (!members.isEmpty()) {
                members.forEach(member -> {
                    if (TontineMemberDeliveryStatus.SESSION_INPROGRESS.equals(member.getDeliveryStatus())) {
                        member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
                    }
                });
                memberRepository.saveAll(members);
            }
            pageable = memberPage.nextPageable();
        } while (memberPage.hasNext());

        log.info("Session tontine {} clôturée manuellement pour l'année {}.", session.getId(), session.getYear());
        return session;
    }

    /**
     * Réouvre la session de l'année en cours (tests E2E entre deux exécutions du golden path).
     */
    @Transactional
    public TontineSession reopenCurrentSessionForE2e() {
        TontineSession session = getActiveSession();
        if (session.getStatus() == TontineSessionStatus.ACTIVE) {
            return session;
        }
        session.setStatus(TontineSessionStatus.ACTIVE);
        log.info("Session tontine {} réouverte pour E2E (année {}).", session.getId(), session.getYear());
        return tontineSessionRepository.save(session);
    }

    public Map<String, Object> registerMembers(Set<TontineMemberDto> dto) {
        Map<String, Object> response = new HashMap<>();
        List<TontineMemberRespDto> success = new ArrayList<>();
        List<TontineMemberDto> fail = new ArrayList<>();

        for (TontineMemberDto memberDto : dto) {
            try {
                TontineMemberRespDto member = registerMember(memberDto);
                success.add(member);
                response.put("success", success);
            } catch (Exception e) {
                fail.add(memberDto);
                response.put("fail", fail);
            }
        }

        return response;
    }

    public TontineMemberRespDto registerMember(TontineMemberDto dto) {
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
        newMember.setOperationConsentCode(dto.getOperationConsentCode());
        newMember.setSyncConsentCode(dto.getSyncConsentCode());

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
        clientService.updateTontineStatus(client.getId(), Boolean.TRUE);

        if (metricsPublisher != null) {
            metricsPublisher.tontineMemberRegistered(client.getCollector());
        }

        return TontineMemberRespDto.fromTontineMember(savedMember);
    }

    public TontineMemberRespDto updateMember(Long id, TontineMemberDto dto) {
        TontineMember member = getById(id);

        if (dto.getFrequency() != null) {
            member.setFrequency(dto.getFrequency());
        }

        if (dto.getAmount() != null && !dto.getAmount().equals(member.getAmount())) {
            TontineMemberUpdateScope scope = dto.getUpdateScope() != null
                    ? dto.getUpdateScope()
                    : TontineMemberUpdateScope.CURRENT_AND_FUTURE;

            // Amount has changed, handle history based on scope
            handleAmountChange(member, dto.getAmount(), scope);

            // "amount" must always represent the stake applicable today.
            member.setAmount(getApplicableAmountForDate(member, LocalDate.now(), LocalDate.now()));

            // Only GLOBAL should reallocate past collections.
            // FUTURE_ONLY and CURRENT_AND_FUTURE must keep historical allocations unchanged.
            if (scope == TontineMemberUpdateScope.GLOBAL) {
                recalculateMemberFromCollections(member);
                updateSessionRevenue(member.getTontineSession());
            } else {
                // Keep derived status coherent with unchanged allocations.
                calculateMemberStatus(member);
            }
        }

        // Notes handling if needed (skipped as per previous logic)

        return TontineMemberRespDto.fromTontineMember(this.update(member));
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

    public TontineCollectionRespDto recordCollection(TontineCollectionDto dto) {
        TontineSession currentSession = getActiveSession();
        if (!TontineSessionStatus.ACTIVE.equals(currentSession.getStatus())) {
            throw new CustomValidationException(
                    "La session de cette année est déjà clôturer, Vous ne pouvez plus enregistrer de collecte !");
        }

        // Check for duplicate reference
        if (StringUtils.hasText(dto.getReference())) {
            if (tontineCollectionRepository.existsByReference(dto.getReference())) {
                return TontineCollectionRespDto.fromTontineCollection(tontineCollectionRepository.findByReference(dto.getReference()).orElseThrow());
            }
        }

        TontineMember member = this.getById(dto.getMemberId());

        LocalDate allocationDate = LocalDate.now();
        LocalDateTime collectionDateTime = LocalDateTime.now();
        if (dto.getCollectionDate() != null) {
            validateCatchupCollectionDate(member, currentSession, dto.getCollectionDate());
            allocationDate = dto.getCollectionDate();
            collectionDateTime = dto.getCollectionDate().atStartOfDay();

            if (dto.getCatchupDailyStake() != null) {
                applyCatchupDailyStakeIfNeeded(member, allocationDate, dto.getCatchupDailyStake());
            }
        }

        String commercialUsername = userService.getCurrentUser().getUsername();

        TontineCollection collection = new TontineCollection();
        collection.setTontineMember(member);
        collection.setAmount(dto.getAmount());
        collection.setIsDeliveryCollection(
                Objects.nonNull(dto.getIsDeliveryCollection()) ? dto.getIsDeliveryCollection() : Boolean.FALSE);
        collection.setCollectionDate(collectionDateTime);
        collection.setCommercialUsername(commercialUsername);

        if (StringUtils.hasText(dto.getReference())) {
            collection.setReference(dto.getReference());
        }

        if (StringUtils.hasText(dto.getNotes())) {
            collection.setNotes(dto.getNotes());
        } else if (dto.getCollectionDate() != null) {
            collection.setNotes("Rattrapage");
        }

        collection.setOperationConsentCode(dto.getOperationConsentCode());
        collection.setConfirmedAmount(dto.getConfirmedAmount());
        collection.setSyncConsentCode(dto.getSyncConsentCode());

        // Process financial logic (Society Share vs Capital)
        double societyShareAmount = processCollectionAllocation(member, dto.getAmount(), allocationDate);
        collection.setSocietyShareAmount(societyShareAmount);

        super.update(member);

        // Update session total revenue
        TontineSession session = member.getTontineSession();
        updateSessionRevenue(session);

        TontineCollection savedCollection = tontineCollectionRepository.save(collection);

        String tontineCollector = member.getClient().getTontineCollector();
        if (metricsPublisher != null) {
            metricsPublisher.tontineCollectionRecorded(tontineCollector, dto.getAmount());
        }

        // Publish Event
        if (eventPublisher != null) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.TontineCollectionEvent(
                    this,
                    collection.getAmount(),
                    tontineCollector,
                    member.getClient().getFullName()));
        }

        return TontineCollectionRespDto.fromTontineCollection(savedCollection);
    }

    public TontineCatchupPreviewDto getCatchupPreview(Long memberId, LocalDate collectionDate) {
        TontineMember member = getById(memberId);
        TontineSession currentSession = getActiveSession();
        validateCatchupCollectionDate(member, currentSession, collectionDate);

        LocalDate monthStart = collectionDate.withDayOfMonth(1);
        LocalDate monthEnd = collectionDate.withDayOfMonth(collectionDate.lengthOfMonth());

        long existingCollectionsCount = tontineCollectionRepository.countByTontineMember_IdAndCollectionDateBetweenAndState(
                memberId,
                monthStart.atStartOfDay(),
                monthEnd.atTime(23, 59, 59),
                State.ENABLED);

        Double applicable = getApplicableAmountForDate(member, collectionDate, collectionDate);
        return new TontineCatchupPreviewDto(
                collectionDate,
                monthStart,
                monthEnd,
                applicable != null ? applicable : member.getAmount(),
                existingCollectionsCount > 0,
                existingCollectionsCount);
    }

    private void applyCatchupDailyStakeIfNeeded(TontineMember member, LocalDate allocationDate, Double catchupDailyStake) {
        if (catchupDailyStake == null || catchupDailyStake <= 0) {
            return;
        }

        LocalDate monthStart = allocationDate.withDayOfMonth(1);
        LocalDate monthEnd = allocationDate.withDayOfMonth(allocationDate.lengthOfMonth());
        LocalDateTime monthStartDateTime = monthStart.atStartOfDay();
        LocalDateTime monthEndDateTime = monthEnd.atTime(23, 59, 59);

        Double currentApplicable = getApplicableAmountForDate(member, allocationDate, allocationDate);
        if (sameAmount(currentApplicable, catchupDailyStake)) {
            return;
        }

        long existingCollectionsInMonth = tontineCollectionRepository.countByTontineMember_IdAndCollectionDateBetweenAndState(
                member.getId(), monthStartDateTime, monthEndDateTime, State.ENABLED);
        if (existingCollectionsInMonth > 0) {
            throw new CustomValidationException(
                    "Impossible de modifier la mise pour ce mois : des collectes existent déjà sur la période.");
        }

        List<TontineMemberAmountHistory> history = member.getAmountHistory();
        if (history == null) {
            history = new ArrayList<>();
            member.setAmountHistory(history);
        }
        history.sort(Comparator.comparing(TontineMemberAmountHistory::getStartDate));

        // Close or remove entries overlapping the target month.
        for (TontineMemberAmountHistory entry : history) {
            boolean startsBeforeOrInMonth = !entry.getStartDate().isAfter(monthEnd);
            boolean endsAfterOrInMonth = entry.getEndDate() == null || !entry.getEndDate().isBefore(monthStart);
            if (!(startsBeforeOrInMonth && endsAfterOrInMonth)) {
                continue;
            }

            if (entry.getStartDate().isBefore(monthStart)) {
                entry.setEndDate(monthStart.minusDays(1));
            } else {
                entry.setEndDate(monthStart.minusDays(1));
            }
        }
        history.removeIf(entry -> entry.getEndDate() != null && entry.getStartDate().isAfter(entry.getEndDate()));

        // Add month-specific stake.
        TontineMemberAmountHistory monthEntry = new TontineMemberAmountHistory();
        monthEntry.setTontineMember(member);
        monthEntry.setAmount(catchupDailyStake);
        monthEntry.setStartDate(monthStart);
        monthEntry.setEndDate(monthEnd);
        history.add(monthEntry);

        // Re-open historical rate from next month if needed.
        LocalDate nextMonthStart = monthEnd.plusDays(1);
        Double nextAmount = getApplicableAmountForDate(member, nextMonthStart, nextMonthStart);
        if (!sameAmount(nextAmount, catchupDailyStake)) {
            TontineMemberAmountHistory nextEntry = new TontineMemberAmountHistory();
            nextEntry.setTontineMember(member);
            nextEntry.setAmount(nextAmount);
            nextEntry.setStartDate(nextMonthStart);
            nextEntry.setEndDate(null);
            history.add(nextEntry);
        }

        history.sort(Comparator.comparing(TontineMemberAmountHistory::getStartDate));
    }

    private boolean sameAmount(Double left, Double right) {
        if (left == null && right == null) {
            return true;
        }
        if (left == null || right == null) {
            return false;
        }
        return Math.abs(left - right) < 0.0001;
    }

    public TontineCollectionRespDto cancelCollection(Long collectionId) {
        TontineCollection collection = tontineCollectionRepository.findById(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collecte introuvable."));

        if (State.DELETED.equals(collection.getState())) {
            throw new CustomValidationException("Cette collecte est déjà annulée.");
        }

        TontineMember member = collection.getTontineMember();
        if (member == null) {
            throw new CustomValidationException("Membre associé à la collecte introuvable.");
        }

        collection.setState(State.DELETED);
        tontineCollectionRepository.save(collection);

        recalculateMemberFromCollections(member);
        super.update(member);
        updateSessionRevenue(member.getTontineSession());

        if (eventPublisher != null) {
            String clientName = member.getClient() != null ? member.getClient().getFullName() : "N/A";
            eventPublisher.publishEvent(new TontineCollectionCancelledEvent(
                    this,
                    collection.getAmount(),
                    collection.getCommercialUsername(),
                    clientName,
                    collection.getReference()));
        }

        return TontineCollectionRespDto.fromId(collection.getId());
    }

    private void recalculateMemberFromCollections(TontineMember member) {
        member.setSocietyShare(0.0);
        member.setTotalContribution(0.0);
        member.setValidatedMonths(0);
        member.setCurrentMonthDays(0);
        member.setAvailableContribution(0.0);

        List<TontineCollection> enabledCollections = tontineCollectionRepository
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(member.getId(), State.ENABLED);

        for (TontineCollection enabledCollection : enabledCollections) {
            LocalDate allocationDate = enabledCollection.getCollectionDate().toLocalDate();
            processCollectionAllocation(member, enabledCollection.getAmount(), allocationDate);
        }
    }

    private void validateCatchupCollectionDate(TontineMember member, TontineSession session, LocalDate collectionDate) {
        LocalDate today = LocalDate.now();
        if (!collectionDate.isBefore(today)) {
            throw new CustomValidationException(
                    "La date de rattrapage doit être strictement antérieure à la date du jour.");
        }

        LocalDate effectiveStart = getEffectiveMemberStartDate(member);
        if (collectionDate.isBefore(effectiveStart)) {
            throw new CustomValidationException(
                    "La date de rattrapage ne peut pas être antérieure au début de participation du membre ("
                            + effectiveStart + ").");
        }

        if (session.getEndDate() != null && collectionDate.isAfter(session.getEndDate())) {
            throw new CustomValidationException(
                    "La date de rattrapage ne peut pas être postérieure à la fin de la session ("
                            + session.getEndDate() + ").");
        }
    }

    private LocalDate getEffectiveMemberStartDate(TontineMember member) {
        LocalDate startDate = member.getTontineSession().getStartDate();
        boolean useRegistrationDate = parameterService.isEnabled("USE_MEMBER_REGISTRATION_DATE_FOR_SHARE");
        if (useRegistrationDate && member.getRegistrationDate() != null) {
            LocalDate regDate = member.getRegistrationDate().toLocalDate();
            if (regDate.isAfter(startDate)) {
                startDate = regDate;
            }
        }
        return startDate;
    }

    double calculateTargetSocietyShare(TontineMember member, LocalDate upToDateInclusive) {
        LocalDate startDate = getEffectiveMemberStartDate(member);
        double targetSocietyShare = 0.0;

        LocalDate iterDate = startDate;
        int monthsCounted = 0;
        int maxMonths = 10;

        while (!iterDate.isAfter(upToDateInclusive) && monthsCounted < maxMonths) {
            Double applicableAmount = getApplicableAmountForDate(member, iterDate, upToDateInclusive);
            targetSocietyShare += applicableAmount;
            monthsCounted++;
            iterDate = iterDate.plusMonths(1);
        }

        return targetSocietyShare;
    }

    private double processCollectionAllocation(TontineMember member, Double amountCollected, LocalDate allocationDate) {
        Double currentSocietyShare = member.getSocietyShare() != null ? member.getSocietyShare() : 0.0;
        Double currentTotalContribution = member.getTotalContribution() != null ? member.getTotalContribution() : 0.0;

        Double targetSocietyShare = calculateTargetSocietyShare(member, allocationDate);

        // 2. Calculate Deficit (What is owed to society up to allocation date)
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
        return amountForSociety;
    }
    
    private Double getApplicableAmountForDate(TontineMember member, LocalDate date, LocalDate referenceDate) {
        LocalDate lookupDate = date.withDayOfMonth(date.lengthOfMonth());
        if (lookupDate.isAfter(referenceDate)) {
            lookupDate = referenceDate;
        }
        final LocalDate endOfMonth = lookupDate;

        return member.getAmountHistory().stream()
                .filter(h -> !h.getStartDate().isAfter(endOfMonth)) // started before/on lookup date
                .filter(h -> h.getEndDate() == null || !h.getEndDate().isBefore(endOfMonth)) // not ended before lookup date
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
        double availableContribution = totalContrib - societyShare;
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

    public Page<TontineMemberRespDto> getMembers(User currentUser, String search, String deliveryStatus, String commercial,
                                                 Pageable pageable) {
        int currentYear = LocalDate.now().getYear();


        // Determine the commercial filter
        String commercialFilter = commercial;
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            commercialFilter = currentUser.getUsername();
        }

        // Determine the delivery status filter
        TontineMemberDeliveryStatus statusFilter = null;
        if (StringUtils.hasText(deliveryStatus)) {
            try {
                statusFilter = TontineMemberDeliveryStatus.valueOf(deliveryStatus.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Ignore invalid status
            }
        }

        // Clean up search string
        String searchFilter = StringUtils.hasText(search) ? search : null;
        Page<TontineMemberRespDto> memberRespDtos= null;
        if (Objects.isNull(searchFilter)) {
            memberRespDtos= getRepository().findMembersDto(currentYear, commercialFilter, statusFilter, pageable);
            return memberRespDtos;
        } else {
            memberRespDtos = getRepository().findMembersDtoWithSearch(currentYear, commercialFilter, searchFilter, statusFilter, pageable);

            return memberRespDtos;
        }
    }

    public List<TontineMemberAmountHistoryRespDto> getMembersHistory(String commercial) {
        User currentUser = userService.getCurrentUser();
        int currentYear = LocalDate.now().getYear();

        String commercialFilter = commercial;
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            commercialFilter = currentUser.getUsername();
        }

        return tontineMemberAmountHistoryRepository.findHistoryDto(currentYear, commercialFilter);
    }

    public Page<TontineMemberAmountHistoryRespDto> getMembersHistoryPage(String commercial, Pageable pageable) {
        User currentUser = userService.getCurrentUser();
        int currentYear = LocalDate.now().getYear();

        String commercialFilter = commercial;
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            commercialFilter = currentUser.getUsername();
        }

        return tontineMemberAmountHistoryRepository.findHistoryDtoPage(currentYear, commercialFilter, pageable);
    }

    public List<TontineMemberAmountHistoryItemDto> getMemberAmountHistory(Long memberId) {
        TontineMember member = getById(memberId);
        return TontineMemberAmountHistoryItemDto.fromList(
                tontineMemberAmountHistoryRepository.findByTontineMember_IdOrderByStartDateAsc(member.getId()));
    }

    public Page<TontineCollectionRespDto> getCollections(Pageable pageable) {
        User currentUser = userService.getCurrentUser();
        int currentYear = LocalDate.now().getYear();

        String commercialFilter = null;
        if (currentUser.is(UserProfilConstant.PROMOTER)) {
            commercialFilter = currentUser.getUsername();
        }

        return tontineCollectionRepository.findCollectionsDto(currentYear, commercialFilter, State.ENABLED, pageable);
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