package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.TontineCollectionArchiveRowDto;
import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.entity.report.TontineCollectionResetFile;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.*;
import com.optimize.elykia.core.service.report.DailyTontineReportReconciler;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import com.optimize.common.securities.security.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TontineCollectionResetService {

    private final TontineService tontineService;
    private final UserService userService;
    private final TontineCollectionRepository collectionRepository;
    private final TontineMemberRepository memberRepository;
    private final TontineSessionRepository sessionRepository;
    private final DailyTontineReportReconciler dailyTontineReportReconciler;
    private final TontineCollectionResetRunRepository runRepository;
    private final TontineCollectionResetFileRepository fileRepository;
    private final TontineCollectionResetPdfService pdfService;
    private final MonthlyReportStorageService storageService;

    @Transactional
    public TontineCollectionResetRunDto triggerReset() {
        TontineSession session = tontineService.getActiveSession();
        if (!TontineSessionStatus.ACTIVE.equals(session.getStatus())) {
            throw new CustomValidationException(
                    "La session en cours n'est pas active. Impossible de réinitialiser les collectes.");
        }

        List<TontineCollection> collections = collectionRepository.findAllBySessionId(session.getId());
        if (collections.isEmpty()) {
            throw new CustomValidationException("Aucune collecte tontine à réinitialiser pour la session en cours.");
        }

        TontineCollectionResetRun run = new TontineCollectionResetRun();
        run.setSessionId(session.getId());
        run.setSessionYear(session.getYear());
        run.setStatus(TontineCollectionResetRunStatus.PENDING);
        run.setTriggeredBy(userService.getCurrentUser().getUsername());
        run.setCollectionsCount(collections.size());
        run.setCollectionsAmount(collections.stream()
                .mapToDouble(c -> c.getAmount() != null ? c.getAmount() : 0.0)
                .sum());
        run = runRepository.save(run);

        try {
            archiveCollections(run, session.getYear(), collections);
            resetCollections(run, session, collections);
            run.setStatus(TontineCollectionResetRunStatus.COMPLETED);
        } catch (Exception e) {
            log.error("Erreur lors de la réinitialisation des collectes tontine", e);
            run.setStatus(TontineCollectionResetRunStatus.FAILED);
            run.setErrorMessage(e.getMessage());
        }
        return TontineCollectionResetRunDto.from(runRepository.save(run));
    }

    @Transactional
    public TontineCollectionResetRunDto triggerExportOnly() {
        TontineSession session = tontineService.getActiveSession();
        List<TontineCollection> collections = collectionRepository.findAllBySessionId(session.getId());
        if (collections.isEmpty()) {
            throw new CustomValidationException("Aucune collecte tontine à archiver pour la session en cours.");
        }

        TontineCollectionResetRun run = new TontineCollectionResetRun();
        run.setSessionId(session.getId());
        run.setSessionYear(session.getYear());
        run.setStatus(TontineCollectionResetRunStatus.ARCHIVING);
        run.setTriggeredBy(userService.getCurrentUser().getUsername());
        run.setCollectionsCount(collections.size());
        run.setCollectionsAmount(collections.stream()
                .mapToDouble(c -> c.getAmount() != null ? c.getAmount() : 0.0)
                .sum());
        run = runRepository.save(run);

        try {
            archiveCollections(run, session.getYear(), collections);
            run.setStatus(TontineCollectionResetRunStatus.COMPLETED);
        } catch (Exception e) {
            log.error("Erreur lors de l'archivage des collectes tontine", e);
            run.setStatus(TontineCollectionResetRunStatus.FAILED);
            run.setErrorMessage(e.getMessage());
        }
        return TontineCollectionResetRunDto.from(runRepository.save(run));
    }

    private void archiveCollections(TontineCollectionResetRun run, int sessionYear, List<TontineCollection> collections) {
        run.setStatus(TontineCollectionResetRunStatus.ARCHIVING);
        runRepository.save(run);

        Map<String, Map<String, List<TontineCollectionArchiveRowDto>>> grouped = collections.stream()
                .map(TontineCollectionArchiveRowDto::from)
                .collect(Collectors.groupingBy(
                        TontineCollectionArchiveRowDto::tontineCollector,
                        TreeMap::new,
                        Collectors.groupingBy(TontineCollectionArchiveRowDto::quarter, TreeMap::new, Collectors.toList())));

        int fileCount = 0;
        for (var commercialEntry : grouped.entrySet()) {
            for (var quarterEntry : commercialEntry.getValue().entrySet()) {
                String commercial = commercialEntry.getKey();
                String quarter = quarterEntry.getKey();
                List<TontineCollectionArchiveRowDto> rows = quarterEntry.getValue();

                byte[] pdf = pdfService.generateArchivePdf(sessionYear, commercial, quarter, rows);
                String fileName = pdfService.buildFileName(sessionYear, commercial, quarter);
                String storageKey = pdfService.buildStorageKey(sessionYear, run.getId(), commercial, quarter);

                if (storageService.isAvailable()) {
                    storageService.upload(storageKey, pdf);
                } else {
                    log.warn("MinIO indisponible — PDF {} non stocké", fileName);
                }

                TontineCollectionResetFile file = new TontineCollectionResetFile();
                file.setRun(run);
                file.setFileName(fileName);
                file.setStorageBucket(storageService.getReportsBucket());
                file.setStorageKey(storageKey);
                file.setCommercialUsername(commercial);
                file.setQuarter(quarter);
                fileRepository.save(file);
                fileCount++;
            }
        }
        run.setPdfFileCount(fileCount);
        runRepository.save(run);
    }

    private void resetCollections(TontineCollectionResetRun run, TontineSession session, List<TontineCollection> collections) {
        run.setStatus(TontineCollectionResetRunStatus.RESETTING);
        runRepository.save(run);

        Map<String, Set<LocalDate>> datesByCommercial = collectReportDatesByCommercial(collections);
        collectionRepository.deleteAllBySessionId(session.getId());
        for (var entry : datesByCommercial.entrySet()) {
            dailyTontineReportReconciler.reconcileAll(entry.getKey(), entry.getValue());
        }

        int membersReset = memberRepository.resetContributionsBySessionId(session.getId());

        session.setTotalRevenue(0.0);
        sessionRepository.save(session);

        run.setMembersResetCount(membersReset);
        runRepository.save(run);
    }

    /**
     * Dates à reconcilier : collectionDate (activité) + createdDate (cash saisi).
     */
    private Map<String, Set<LocalDate>> collectReportDatesByCommercial(List<TontineCollection> collections) {
        Map<String, Set<LocalDate>> result = new HashMap<>();
        for (TontineCollection collection : collections) {
            String commercial = collection.getCommercialUsername();
            if (!StringUtils.hasText(commercial)) {
                continue;
            }
            Set<LocalDate> dates = result.computeIfAbsent(commercial, k -> new HashSet<>());
            if (collection.getCollectionDate() != null) {
                dates.add(collection.getCollectionDate().toLocalDate());
            }
            if (collection.getCreatedDate() != null) {
                dates.add(collection.getCreatedDate().toLocalDate());
            }
        }
        return result;
    }
}
