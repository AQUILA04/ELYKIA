package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.util.TontineParameterConstant;
import com.optimize.common.securities.event.ParameterUpdatedEvent;
import com.optimize.elykia.core.entity.report.TontineAllocationMigrationFailure;
import com.optimize.elykia.core.entity.report.TontineAllocationMigrationRun;
import com.optimize.elykia.core.entity.report.TontineMemberAllocationSnapshot;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineAllocationMigrationRunStatus;
import com.optimize.elykia.core.repository.TontineAllocationMigrationFailureRepository;
import com.optimize.elykia.core.repository.TontineAllocationMigrationRunRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberAllocationSnapshotRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.service.tontine.allocation.TontineAllocationPolicy;
import com.optimize.elykia.core.service.tontine.allocation.TontineAllocationPolicyResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class TontineAllocationMigrationService {

    private static final int BATCH_SIZE = 50;
    private static final int MAX_DETAIL_LENGTH = 4_000;
    private static final int MAX_MESSAGE_LENGTH = 2_000;

    private final TontineAllocationMigrationRunRepository runRepository;
    private final TontineAllocationMigrationFailureRepository failureRepository;
    private final TontineMemberAllocationSnapshotRepository snapshotRepository;
    private final TontineMemberRepository memberRepository;
    private final TontineCollectionRepository collectionRepository;
    private final TontineSessionRepository sessionRepository;
    private final TontineAllocationPolicyResolver policyResolver;
    private final TontineAllocationMigrationJobRunner jobRunner;
    private final PlatformTransactionManager transactionManager;

    public boolean isMigrationRunning() {
        return runRepository.findLatestByStatusIn(List.of(
                        TontineAllocationMigrationRunStatus.PENDING,
                        TontineAllocationMigrationRunStatus.RUNNING))
                .isPresent();
    }

    public void assertWritesAllowed() {
        if (isMigrationRunning()) {
            throw new CustomValidationException(
                    "Recalcul des parts société en cours. Les opérations tontine sont temporairement suspendues.");
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onParameterUpdated(ParameterUpdatedEvent event) {
        if (!TontineParameterConstant.SOCIETY_SHARE_VERSION.equals(event.getKey())) {
            return;
        }
        if (Objects.equals(event.getOldValue(), event.getNewValue())) {
            return;
        }
        String fromVersion = normalizeVersion(event.getOldValue());
        String toVersion = normalizeVersion(event.getNewValue());
        if (fromVersion.equals(toVersion)) {
            return;
        }
        if (isMigrationRunning()) {
            log.error("Bascule {} -> {} ignorée : migration déjà en cours", fromVersion, toVersion);
            return;
        }
        try {
            startMigration(fromVersion, toVersion, "system");
        } catch (Exception e) {
            log.error("Impossible de démarrer la migration allocation tontine {} -> {}", fromVersion, toVersion, e);
        }
    }

    /**
     * Crée le run dans sa propre transaction (commitée avant le lancement du job asynchrone, qui doit le relire),
     * puis lance le job. Volontairement non {@code @Transactional} : appelée depuis un listener AFTER_COMMIT,
     * aucune transaction n'est active et Hibernate différerait l'INSERT (id nul, rien en base).
     */
    public TontineAllocationMigrationRun startMigration(String fromVersion, String toVersion, String triggeredBy) {
        if (isMigrationRunning()) {
            throw new CustomValidationException("Un recalcul de parts société est déjà en cours.");
        }

        TontineAllocationMigrationRun run = requiresNew().execute(status -> {
            TontineSession session = resolveActiveSession();
            long totalMembers = memberRepository.countEnabledBySessionId(session.getId());

            TontineAllocationMigrationRun created = new TontineAllocationMigrationRun();
            created.setSessionId(session.getId());
            created.setFromVersion(fromVersion);
            created.setToVersion(toVersion);
            created.setStatus(TontineAllocationMigrationRunStatus.PENDING);
            created.setTriggeredBy(triggeredBy);
            created.setTotalMembers((int) totalMembers);
            created.setProcessedMembers(0);
            created.setFailedMembers(0);
            created.setLastProcessedMemberId(0L);
            return runRepository.saveAndFlush(created);
        });
        if (run == null || run.getId() == null) {
            throw new IllegalStateException("Le run de recalcul n'a pas pu être enregistré.");
        }

        jobRunner.runAsync(run.getId());
        return run;
    }

    /** Reprend un run échoué là où il s'est arrêté (les membres déjà traités ne sont pas rejoués). */
    public TontineAllocationMigrationRun retryRun(Long runId) {
        if (isMigrationRunning()) {
            throw new CustomValidationException("Un recalcul de parts société est déjà en cours.");
        }
        TontineAllocationMigrationRun run = requiresNew().execute(status -> {
            TontineAllocationMigrationRun existing = runRepository.findById(runId)
                    .orElseThrow(() -> new CustomValidationException("Run de recalcul introuvable : " + runId));
            if (existing.getStatus() != TontineAllocationMigrationRunStatus.FAILED) {
                throw new CustomValidationException("Seul un recalcul échoué peut être repris.");
            }
            existing.setStatus(TontineAllocationMigrationRunStatus.PENDING);
            existing.setErrorMessage(null);
            existing.setFinishedAt(null);
            return runRepository.saveAndFlush(existing);
        });
        jobRunner.runAsync(run.getId());
        return run;
    }

    public Page<TontineAllocationMigrationRun> listRuns(int page, int size) {
        return runRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()));
    }

    public TontineAllocationMigrationRun getRun(Long runId) {
        return runRepository.findById(runId)
                .orElseThrow(() -> new CustomValidationException("Run de recalcul introuvable : " + runId));
    }

    public Page<TontineAllocationMigrationFailure> listFailures(Long runId, int page, int size) {
        return failureRepository.findByRunIdOrderByIdAsc(runId, PageRequest.of(page, size));
    }

    private TransactionTemplate requiresNew() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template;
    }

    public void executeMigration(Long runId) {
        if (runId == null) {
            log.error("Job de migration allocation tontine lancé sans identifiant de run : abandon");
            return;
        }
        try {
            processMigration(runId);
        } catch (Exception e) {
            log.error("Échec fatal du job de migration allocation tontine run={}", runId, e);
            markRunFailed(runId, e.getMessage());
        }
    }

    private void processMigration(Long runId) {
        TontineAllocationMigrationRun run = runRepository.findById(runId).orElseThrow();
        run.setStatus(TontineAllocationMigrationRunStatus.RUNNING);
        run.setStartedAt(LocalDateTime.now());
        runRepository.save(run);

        Long lastId = run.getLastProcessedMemberId() != null ? run.getLastProcessedMemberId() : 0L;
        // Une transaction par membre : un membre en erreur est annulé seul, rapporté, et la boucle continue.
        TransactionTemplate perMember = new TransactionTemplate(transactionManager);
        perMember.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Page<TontineMember> page;

        do {
            page = memberRepository.findNextEnabledBySessionId(
                    run.getSessionId(),
                    State.ENABLED,
                    lastId,
                    PageRequest.of(0, BATCH_SIZE));

            if (page.isEmpty()) {
                break;
            }

            int processed = 0;
            List<TontineAllocationMigrationFailure> failures = new ArrayList<>();
            for (TontineMember member : page.getContent()) {
                Long memberId = member.getId();
                try {
                    perMember.executeWithoutResult(status -> processMemberInNewTransaction(runId, memberId));
                } catch (Exception e) {
                    log.error("Échec recalcul membre {} pour run {}", memberId, runId, e);
                    failures.add(describeFailure(runId, member, e));
                }
                processed++;
                lastId = memberId;
            }
            recordBatchProgress(runId, lastId, processed, failures);
        } while (page.hasNext());

        finalizeRun(runId);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processMemberInNewTransaction(Long runId, Long memberId) {
        TontineAllocationMigrationRun run = runRepository.findById(runId).orElseThrow();
        if (snapshotRepository.existsByRun_IdAndMemberId(runId, memberId)) {
            return;
        }

        TontineMember member = memberRepository.findByIdWithClient(memberId).orElseThrow();
        List<TontineCollection> collections = collectionRepository
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(memberId, State.ENABLED);

        TontineMemberAllocationSnapshot snapshot = buildSnapshot(run, member, collections);
        snapshotRepository.save(snapshot);

        TontineAllocationPolicy policy = policyResolver.resolve();
        policy.recalculateMemberFromCollections(member, collections);
        collectionRepository.saveAll(collections);
        memberRepository.save(member);
    }

    private TontineMemberAllocationSnapshot buildSnapshot(
            TontineAllocationMigrationRun run,
            TontineMember member,
            List<TontineCollection> collections) {
        TontineMemberAllocationSnapshot snapshot = new TontineMemberAllocationSnapshot();
        snapshot.setRun(run);
        snapshot.setMemberId(member.getId());
        snapshot.setClientId(member.getClient().getId());
        snapshot.setSocietyShare(nullSafe(member.getSocietyShare()));
        snapshot.setTotalContribution(nullSafe(member.getTotalContribution()));
        snapshot.setAvailableContribution(nullSafe(member.getAvailableContribution()));
        snapshot.setValidatedMonths(member.getValidatedMonths() != null ? member.getValidatedMonths() : 0);
        snapshot.setCurrentMonthDays(member.getCurrentMonthDays() != null ? member.getCurrentMonthDays() : 0);

        List<Map<String, Object>> collectionShares = new ArrayList<>();
        for (TontineCollection collection : collections) {
            Map<String, Object> row = new HashMap<>();
            row.put("collectionId", collection.getId());
            row.put("societyShareAmount", nullSafe(collection.getSocietyShareAmount()));
            collectionShares.add(row);
        }
        snapshot.setCollectionsSocietyShare(collectionShares);
        return snapshot;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordBatchProgress(Long runId, Long lastProcessedMemberId, int processed,
                                    List<TontineAllocationMigrationFailure> failures) {
        runRepository.findById(runId).ifPresent(run -> {
            run.setLastProcessedMemberId(lastProcessedMemberId);
            run.setProcessedMembers(run.getProcessedMembers() + processed);
            if (failures != null && !failures.isEmpty()) {
                run.setFailedMembers(run.getFailedMembers() + failures.size());
                failureRepository.saveAll(failures);
            }
            runRepository.save(run);
        });
    }

    private static TontineAllocationMigrationFailure describeFailure(Long runId, TontineMember member, Exception e) {
        TontineAllocationMigrationFailure failure = new TontineAllocationMigrationFailure();
        failure.setRunId(runId);
        failure.setMemberId(member.getId());
        failure.setMemberName(memberName(member));
        failure.setErrorType(e.getClass().getSimpleName());
        failure.setMessage(truncate(e.getMessage() != null ? e.getMessage() : e.getClass().getName(), MAX_MESSAGE_LENGTH));
        StringBuilder detail = new StringBuilder();
        for (StackTraceElement element : e.getStackTrace()) {
            if (detail.length() > MAX_DETAIL_LENGTH) {
                break;
            }
            detail.append("at ").append(element).append('\n');
        }
        failure.setDetail(truncate(detail.toString(), MAX_DETAIL_LENGTH));
        return failure;
    }

    private static String memberName(TontineMember member) {
        try {
            if (member.getClient() == null) {
                return null;
            }
            String first = member.getClient().getFirstname() != null ? member.getClient().getFirstname() : "";
            String last = member.getClient().getLastname() != null ? member.getClient().getLastname() : "";
            return (first + " " + last).trim();
        } catch (RuntimeException lazyOrDetached) {
            return null;
        }
    }

    private static String truncate(String value, int max) {
        return value != null && value.length() > max ? value.substring(0, max) : value;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markRunFailed(Long runId, String message) {
        runRepository.findById(runId).ifPresent(run -> {
            run.setStatus(TontineAllocationMigrationRunStatus.FAILED);
            run.setFinishedAt(LocalDateTime.now());
            run.setErrorMessage(message);
            runRepository.save(run);
        });
    }

    private void finalizeRun(Long runId) {
        TontineAllocationMigrationRun run = runRepository.findById(runId).orElseThrow();
        TontineSession session = sessionRepository.findById(run.getSessionId()).orElseThrow();
        Double totalRevenue = memberRepository.sumSocietyShareByTontineSessionId(session.getId(), State.ENABLED);
        session.setTotalRevenue(totalRevenue != null ? totalRevenue : 0.0);
        sessionRepository.save(session);

        run.setStatus(TontineAllocationMigrationRunStatus.COMPLETED);
        run.setFinishedAt(LocalDateTime.now());
        runRepository.save(run);
        log.info("Migration allocation tontine terminée run={} processed={}/{} failed={}",
                runId, run.getProcessedMembers(), run.getTotalMembers(), run.getFailedMembers());
    }

    public TontineAllocationMigrationRun getLatestActiveOrRecentRun() {
        return runRepository.findLatestByStatusIn(List.of(
                        TontineAllocationMigrationRunStatus.PENDING,
                        TontineAllocationMigrationRunStatus.RUNNING))
                .orElseGet(() -> runRepository.findAll().stream()
                        .max((a, b) -> Long.compare(a.getId(), b.getId()))
                        .orElse(null));
    }

    private TontineSession resolveActiveSession() {
        int currentYear = LocalDate.now().getYear();
        return sessionRepository.findByYear(currentYear)
                .orElseThrow(() -> new CustomValidationException(
                        "Aucune session de tontine active trouvée pour l'année en cours."));
    }

    private static String normalizeVersion(String value) {
        if (value == null || value.isBlank()) {
            return TontineParameterConstant.SOCIETY_SHARE_VERSION_V1;
        }
        return value.trim().toUpperCase();
    }

    private static double nullSafe(Double value) {
        return value != null ? value : 0.0;
    }
}
