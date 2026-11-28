package com.optimize.elykia.sale.api;

import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditTimeline;
import com.optimize.elykia.sale.web.dto.CreditTimelineRespDto;

/**
 * Driving Port hexagonal unifié pour l'ensemble des flux de recouvrement des crédits :
 * saisie unitaire Web, TFJ Caisse Web, synchronisation Mobile, Chef de Recouvrement,
 * Mobile Money Espace Client, régularisation d'écart carnet, vente initiale comptant/tontine
 * et annulation/extourne.
 */
public interface CreditRecoveryUseCase {

    CreditTimeline recordRecovery(RecordRecoveryCommand command);

    BatchRecoveryResult recordRecoveryBatch(RecordRecoveryBatchCommand command);

    FieldControlCreditPosting recordFieldControlRecovery(FieldControlRecoveryCommand command);

    void publishFieldControlCash(FieldControlCreditPosting posting);

    CreditTimeline recordInitialSaleRecovery(Credit managedCredit, RecordRecoveryCommand command);

    CreditTimelineRespDto cancelRecovery(Long timelineId);

    void reverseCollectionsForCancelledCashSale(Credit credit);
}
