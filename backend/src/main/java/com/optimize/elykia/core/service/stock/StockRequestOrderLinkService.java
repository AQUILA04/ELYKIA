package com.optimize.elykia.core.service.stock;

import com.optimize.elykia.core.entity.stock.StockRequest;
import com.optimize.elykia.core.entity.stock.StockRequestOrderLink;
import com.optimize.elykia.core.repository.StockRequestOrderLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Lien demande de stock ↔ commandes. Isolé pour éviter une dépendance circulaire
 * entre {@link StockRequestService} et le service de création depuis les commandes.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class StockRequestOrderLinkService {

    private final StockRequestOrderLinkRepository linkRepository;

    public void copyLinksToRequest(Long sourceRequestId, StockRequest targetRequest) {
        List<StockRequestOrderLink> existing = linkRepository.findByStockRequestId(sourceRequestId);
        for (StockRequestOrderLink link : existing) {
            StockRequestOrderLink copy = new StockRequestOrderLink();
            copy.setStockRequest(targetRequest);
            copy.setOrder(link.getOrder());
            linkRepository.save(copy);
        }
    }

    @Transactional(readOnly = true)
    public List<String> resolveLinkedOrderReferences(Long stockRequestId) {
        return linkRepository.findByStockRequestId(stockRequestId).stream()
                .map(link -> "CMD-" + link.getOrder().getId())
                .sorted()
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<Long, List<String>> resolveLinkedOrderReferences(Collection<Long> stockRequestIds) {
        if (stockRequestIds == null || stockRequestIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, List<String>> result = new HashMap<>();
        for (StockRequestOrderLink link : linkRepository.findByStockRequestIds(stockRequestIds)) {
            result.computeIfAbsent(link.getStockRequest().getId(), id -> new ArrayList<>())
                    .add("CMD-" + link.getOrder().getId());
        }
        result.values().forEach(list -> list.sort(String::compareTo));
        return result;
    }
}
