package com.optimize.elykia.sale.application;

import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.api.CreditRecoveryUseCase;
import com.optimize.elykia.sale.api.RecordRecoveryCommand;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.RecoverySource;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.function.Consumer;

/**
 * Service applicatif dédié à la création des ventes issues d'une livraison tontine ({@code TONTINE}).
 */
@Service
@Transactional
public class TontineSaleService {

    private final CreditRepository creditRepository;
    private final CreditArticlesService creditArticlesService;
    private final SalePostStartPublisher postStartPublisher;
    private final CreditRecoveryUseCase creditRecoveryUseCase;

    public TontineSaleService(
            CreditRepository creditRepository,
            CreditArticlesService creditArticlesService,
            SalePostStartPublisher postStartPublisher,
            @Lazy CreditRecoveryUseCase creditRecoveryUseCase) {
        this.creditRepository = creditRepository;
        this.creditArticlesService = creditArticlesService;
        this.postStartPublisher = postStartPublisher;
        this.creditRecoveryUseCase = creditRecoveryUseCase;
    }

    public CreditRespDto createTontineSale(
            Credit credit,
            String clientIdForReference,
            Runnable beforeSave,
            Consumer<Credit> afterArticlesSaved) {
        String baseReference = SaleReferenceGenerator.generate(clientIdForReference, ClientType.CLIENT);
        credit.setReference("T" + baseReference);
        if (beforeSave != null) {
            beforeSave.run();
        }
        credit.start();
        credit = creditRepository.save(credit);
        postStartPublisher.publishAfterStart(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        if (afterArticlesSaved != null) {
            afterArticlesSaved.accept(credit);
        }
        credit.getArticles().forEach(creditArticle -> {
            if (creditArticle.getId() != null && creditArticle.getTontineItemId() != null) {
                creditArticlesService.update(creditArticle);
            }
        });
        recordInitialRecovery(credit);
        return CreditRespDto.fromCredit(credit);
    }

    private void recordInitialRecovery(Credit credit) {
        RecordRecoveryCommand command = new RecordRecoveryCommand(
                credit.getId(),
                credit.getTotalAmount(),
                null,
                credit.getCommercialUsername(),
                0.0,
                0.0,
                null,
                null,
                null,
                RecoverySource.INITIAL_SALE
        );
        creditRecoveryUseCase.recordInitialSaleRecovery(credit, command);
    }
}
