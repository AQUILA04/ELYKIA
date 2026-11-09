package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.TontineCollectionArchiveRowDto;
import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.dto.TontineCommercialVoidPreviewDto;
import com.optimize.elykia.core.entity.report.TontineCollectionResetFile;
import com.optimize.elykia.core.entity.report.TontineCollectionResetLine;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.AppNotificationType;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import com.optimize.elykia.core.enumaration.TontineCollectionResetScope;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineCatchupNotificationRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetFileRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetLineRepository;
import com.optimize.elykia.core.repository.TontineCollectionResetRunRepository;
import com.optimize.elykia.core.repository.TontineCommercialCollectionVoidStore;
import com.optimize.elykia.core.repository.TontineCommercialCollectionVoidStore.Preview;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.repository.notification.AppNotificationRepository;
import com.optimize.elykia.core.service.report.DailyOperationService;
import com.optimize.elykia.core.service.report.DailyTontineReportReconciler;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class TontineCommercialCollectionVoidService {

    static final int MEMBER_BATCH = 50;
    private static final int NOTIFICATION_BATCH = 500;
    private static final List<TontineCollectionResetRunStatus> BUSY = List.of(
            TontineCollectionResetRunStatus.PENDING,
            TontineCollectionResetRunStatus.ARCHIVING,
            TontineCollectionResetRunStatus.RESETTING);

    private final TontineService tontineService;
    private final TontineAllocationMigrationService allocationMigrationService;
    private final UserService userService;
    private final TontineSessionRepository sessionRepository;
    private final TontineCollectionResetRunRepository runRepository;
    private final TontineCollectionResetFileRepository fileRepository;
    private final TontineCollectionResetLineRepository lineRepository;
    private final TontineCommercialCollectionVoidStore store;
    private final DailyTontineReportReconciler dailyTontineReportReconciler;
    private final DailyOperationService dailyOperationService;
    private final AppNotificationRepository appNotificationRepository;
    private final TontineCatchupNotificationRepository catchupNotificationRepository;
    private final TontineCollectionResetPdfService pdfService;
    private final MonthlyReportStorageService storageService;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public TontineCommercialVoidPreviewDto preview(String commercialUsername, Integer sessionYear) {
        String commercial = requireCommercial(commercialUsername);
        TontineSession session = requireActiveSession(sessionYear, false);
        Preview preview = store.preview(session.getId(), commercial);
        return new TontineCommercialVoidPreviewDto(
                session.getId(),
                session.getYear(),
                commercial,
                preview.collectionsCount(),
                preview.collectionsAmount(),
                preview.membersAffected(),
                preview.membersWithOtherCollections(),
                preview.preservedAmount(),
                preview.deliveryCollectionsCount(),
                preview.reportDays());
    }

    @Transactional
    public TontineCollectionResetRunDto voidCommercial(String commercialUsername, Integer sessionYear) {
        allocationMigrationService.assertWritesAllowed();
        String commercial = requireCommercial(commercialUsername);
        TontineSession session = requireActiveSession(sessionYear, true);
        session = sessionRepository.lockById(session.getId())
                .orElseThrow(() -> new CustomValidationException("Session tontine introuvable."));
        if (runRepository.existsBySessionIdAndStatusIn(session.getId(), BUSY)) {
            throw new CustomValidationException(
                    "Une archive ou une réinitialisation est déjà en cours sur cette session.");
        }

        Preview preview = store.preview(session.getId(), commercial);
        if (preview.collectionsCount() == 0) {
            throw new CustomValidationException(
                    "Aucune collecte de ce commercial pour la session " + session.getYear() + ".");
        }

        String auditUser = auditUser();
        TontineCollectionResetRun run = new TontineCollectionResetRun();
        run.setSessionId(session.getId());
        run.setSessionYear(session.getYear());
        run.setStatus(TontineCollectionResetRunStatus.RESETTING);
        run.setScope(TontineCollectionResetScope.COMMERCIAL);
        run.setTargetCommercialUsername(commercial);
        run.setTriggeredBy(userService.getCurrentUser().getUsername());
        run.setCollectionsCount((int) preview.collectionsCount());
        run.setCollectionsAmount(preview.collectionsAmount());
        run = runRepository.save(run);

        int lines = store.insertLines(run.getId(), session.getId(), commercial, auditUser);
        if (lines == 0) {
            throw new CustomValidationException(
                    "Aucune collecte de ce commercial pour la session " + session.getYear() + ".");
        }
        int members = store.insertMembers(run.getId(), session.getId(), commercial, auditUser);
        store.insertReportDays(run.getId(), session.getId(), commercial, auditUser);
        String storedCommercial = store.dominantCommercialUsername(run.getId());
        if (StringUtils.hasText(storedCommercial)) {
            commercial = storedCommercial;
            run.setTargetCommercialUsername(storedCommercial);
        }
        run.setCollectionsCount(lines);
        run.setCollectionsAmount(store.sumLineAmount(run.getId()));
        run.setMembersResetCount(members);
        runRepository.save(run);

        store.softDelete(session.getId(), commercial, auditUser);
        entityManager.flush();
        entityManager.clear();

        List<Long> memberIds = store.findMemberIds(run.getId());
        for (int offset = 0; offset < memberIds.size(); offset += MEMBER_BATCH) {
            List<Long> batch = memberIds.subList(offset, Math.min(offset + MEMBER_BATCH, memberIds.size()));
            tontineService.replayMembersFromEnabledCollections(batch);
            entityManager.flush();
            entityManager.clear();
        }

        store.updateMembersAfter(run.getId(), auditUser);
        tontineService.refreshSessionRevenue(session.getId());

        List<LocalDate> reportDates = store.findReportDates(run.getId());
        dailyTontineReportReconciler.reconcileAll(commercial, reportDates);
        entityManager.flush();
        store.updateReportDaysAfter(run.getId());

        cancelNotifications(store.findCollectionIds(run.getId()));
        TontineCollectionResetRun fresh = runRepository.findById(run.getId()).orElseThrow();
        dailyOperationService.logOperationInCurrentTransaction(
                commercial,
                OperationType.TONTINE_COLLECTION_CANCEL,
                -fresh.getCollectionsAmount(),
                "Annulation collectes commercial",
                "Annulation des collectes tontine de " + commercial
                        + " pour la session " + fresh.getSessionYear()
                        + " : " + fresh.getCollectionsCount() + " ligne(s). "
                        + "Les collectes des autres commerciaux sont conservées. Archive " + fresh.getId() + ".",
                0.0,
                0.0,
                LocalDate.now());

        int pdfCount = archivePdfs(fresh);
        fresh.setPdfFileCount(pdfCount);
        fresh.setStatus(TontineCollectionResetRunStatus.COMPLETED);
        return TontineCollectionResetRunDto.from(runRepository.save(fresh));
    }

    private int archivePdfs(TontineCollectionResetRun run) {
        List<TontineCollectionResetLine> lines = lineRepository
                .findByRun_IdOrderByQuarterAscCollectionDateAscIdAsc(run.getId());
        Map<String, List<TontineCollectionArchiveRowDto>> byQuarter = new TreeMap<>();
        for (TontineCollectionResetLine line : lines) {
            String quarter = StringUtils.hasText(line.getQuarter()) ? line.getQuarter() : "N/A";
            byQuarter.computeIfAbsent(quarter, key -> new ArrayList<>()).add(toArchiveRow(line, run));
        }
        int fileCount = 0;
        for (var entry : byQuarter.entrySet()) {
            try {
                byte[] pdf = pdfService.generateArchivePdf(
                        run.getSessionYear(), run.getTargetCommercialUsername(), entry.getKey(), entry.getValue());
                String fileName = pdfService.buildFileName(
                        run.getSessionYear(), run.getTargetCommercialUsername(), entry.getKey());
                String storageKey = pdfService.buildStorageKey(
                        run.getSessionYear(), run.getId(), run.getTargetCommercialUsername(), entry.getKey());
                if (storageService.isAvailable()) {
                    storageService.upload(storageKey, pdf);
                } else {
                    log.warn("MinIO indisponible — PDF {} non stocké. Le détail en base reste consultable.", fileName);
                    continue;
                }
                TontineCollectionResetFile file = new TontineCollectionResetFile();
                file.setRun(run);
                file.setFileName(fileName);
                file.setStorageBucket(storageService.getReportsBucket());
                file.setStorageKey(storageKey);
                file.setCommercialUsername(run.getTargetCommercialUsername());
                file.setQuarter(entry.getKey());
                fileRepository.save(file);
                fileCount++;
            } catch (Exception e) {
                log.error("PDF d'annulation non généré pour le run {} quartier {}", run.getId(), entry.getKey(), e);
            }
        }
        return fileCount;
    }

    private static TontineCollectionArchiveRowDto toArchiveRow(
            TontineCollectionResetLine line, TontineCollectionResetRun run) {
        return new TontineCollectionArchiveRowDto(
                line.getClientName(),
                line.getClientCode(),
                line.getQuarter(),
                run.getTargetCommercialUsername(),
                line.getAmount(),
                line.getCollectionDate(),
                line.getCommercialUsername(),
                line.getDeliveryCollection(),
                line.getReference());
    }

    private void cancelNotifications(List<Long> collectionIds) {
        if (collectionIds == null || collectionIds.isEmpty()) {
            return;
        }
        for (int offset = 0; offset < collectionIds.size(); offset += NOTIFICATION_BATCH) {
            List<Long> batch = collectionIds.subList(
                    offset, Math.min(offset + NOTIFICATION_BATCH, collectionIds.size()));
            appNotificationRepository.cancelUnresolvedByTypeAndEntityIds(
                    AppNotificationType.TONTINE_CATCHUP, batch, LocalDateTime.now());
            catchupNotificationRepository.cancelByCollectionIds(batch);
        }
    }

    private TontineSession requireActiveSession(Integer sessionYear, boolean createCurrentIfMissing) {
        TontineSession session;
        if (sessionYear == null && createCurrentIfMissing) {
            session = tontineService.getActiveSession();
        } else {
            int year = sessionYear != null ? sessionYear : LocalDate.now().getYear();
            session = sessionRepository.findByYear(year)
                    .orElseThrow(() -> new CustomValidationException(
                            "Aucune session tontine pour l'année " + year + "."));
        }
        if (!TontineSessionStatus.ACTIVE.equals(session.getStatus())) {
            throw new CustomValidationException(
                    "La session " + session.getYear() + " n'est pas active. Impossible d'annuler les collectes.");
        }
        return session;
    }

    private static String requireCommercial(String commercialUsername) {
        if (!StringUtils.hasText(commercialUsername)) {
            throw new CustomValidationException("Choisissez un commercial.");
        }
        return commercialUsername.trim();
    }

    private String auditUser() {
        String username = userService.getCurrentUser().getUsername();
        if (!StringUtils.hasText(username)) {
            return "system";
        }
        String trimmed = username.trim();
        return trimmed.length() > 50 ? trimmed.substring(0, 50) : trimmed;
    }
}
