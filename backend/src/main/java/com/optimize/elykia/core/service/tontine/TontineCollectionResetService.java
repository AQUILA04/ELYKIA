package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.dto.TontineCollectionArchiveRowDto;
import com.optimize.elykia.core.dto.TontineCollectionResetRunDto;
import com.optimize.elykia.core.entity.report.DailyCommercialReport;
import com.optimize.elykia.core.entity.report.TontineCollectionResetFile;
import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.*;
import com.optimize.elykia.core.service.report.monthly.MonthlyReportStorageService;
import com.optimize.common.securities.security.services.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final DailyCommercialReportRepository dailyReportRepository;
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

        adjustDailyCommercialReports(collections);
        collectionRepository.deleteAllBySessionId(session.getId());
        int membersReset = memberRepository.resetContributionsBySessionId(session.getId());

        session.setTotalRevenue(0.0);
        sessionRepository.save(session);

        run.setMembersResetCount(membersReset);
        runRepository.save(run);
    }

    private void adjustDailyCommercialReports(List<TontineCollection> collections) {
        Map<String, Map<LocalDate, double[]>> aggregates = new HashMap<>();
        for (TontineCollection collection : collections) {
            String commercial = collection.getCommercialUsername();
            LocalDate date = collection.getCollectionDate().toLocalDate();
            double amount = collection.getAmount() != null ? collection.getAmount() : 0.0;

            aggregates
                    .computeIfAbsent(commercial, k -> new HashMap<>())
                    .merge(date, new double[]{amount, 1}, (a, b) -> new double[]{a[0] + b[0], a[1] + b[1]});
        }

        for (var commercialEntry : aggregates.entrySet()) {
            for (var dateEntry : commercialEntry.getValue().entrySet()) {
                dailyReportRepository
                        .findByDateAndCommercialUsername(dateEntry.getKey(), commercialEntry.getKey())
                        .ifPresent(report -> adjustReport(
                                report, dateEntry.getValue()[0], (int) dateEntry.getValue()[1]));
            }
        }
    }

    private void adjustReport(DailyCommercialReport report, double amountToRemove, int countToRemove) {
        double currentTontineAmount = report.getTontineCollectionsAmount() != null ? report.getTontineCollectionsAmount() : 0.0;
        int currentTontineCount = report.getTontineCollectionsCount() != null ? report.getTontineCollectionsCount() : 0;
        double currentDeposit = report.getTotalAmountToDeposit() != null ? report.getTotalAmountToDeposit() : 0.0;

        double newTontineAmount = Math.max(0.0, currentTontineAmount - amountToRemove);
        int newTontineCount = Math.max(0, currentTontineCount - countToRemove);
        double actualRemoved = currentTontineAmount - newTontineAmount;

        report.setTontineCollectionsAmount(newTontineAmount);
        report.setTontineCollectionsCount(newTontineCount);
        report.setTotalAmountToDeposit(Math.max(0.0, currentDeposit - actualRemoved));
        dailyReportRepository.save(report);
    }
}
