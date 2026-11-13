package com.optimize.elykia.core.service.tontine;

import com.optimize.elykia.core.dto.stock.FifoLotSlice;
import com.optimize.elykia.core.entity.tontine.TontineStock;
import com.optimize.elykia.core.entity.tontine.TontineStockLayer;
import com.optimize.elykia.core.entity.tontine.TontineStockLayerSalePack;
import com.optimize.elykia.core.repository.TontineStockLayerRepository;
import com.optimize.elykia.core.repository.TontineStockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class TontineStockLayerService {

    private final TontineStockRepository tontineStockRepository;
    private final TontineStockLayerRepository layerRepository;

    public void attach(String commercial, int year, Map<Long, List<FifoLotSlice>> slicesByArticle) {
        if (slicesByArticle == null || slicesByArticle.isEmpty() || commercial == null) {
            return;
        }
        slicesByArticle.forEach((articleId, slices) -> {
            if (slices == null || slices.isEmpty()) {
                return;
            }
            TontineStock stock = tontineStockRepository
                    .findByArticleIdAndCommercialAndYear(articleId, commercial, year)
                    .orElse(null);
            if (stock == null) {
                return;
            }
            for (FifoLotSlice slice : slices) {
                if (slice.getQuantity() <= 0) {
                    continue;
                }
                TontineStockLayer layer = new TontineStockLayer();
                layer.setTontineStock(stock);
                layer.setQuantityInitial(slice.getQuantity());
                layer.setQuantityRemaining(slice.getQuantity());
                layer.setUnitPurchasePrice(slice.getUnitPurchasePrice());
                layer.setUnitSalePrice(slice.getUnitSalePrice());
                layer.setWholesalePurchasePrice(slice.getWholesalePurchasePrice());
                layer.setWholesaleSalePrice(slice.getWholesaleSalePrice());
                layer.setHalfWholesalePurchasePrice(slice.getHalfWholesalePurchasePrice());
                layer.setHalfWholesaleSalePrice(slice.getHalfWholesaleSalePrice());
                layer.setUnitsPerPackage(slice.getUnitsPerPackage());
                layer.setUnitsPerHalfPackage(slice.getUnitsPerHalfPackage());
                if (slice.getSalePacks() != null) {
                    for (FifoLotSlice.PackPrice pack : slice.getSalePacks()) {
                        TontineStockLayerSalePack copy = new TontineStockLayerSalePack();
                        copy.setLayer(layer);
                        copy.setQuantity(pack.getQuantity());
                        copy.setSalePrice(pack.getSalePrice());
                        layer.getSalePacks().add(copy);
                    }
                }
                layerRepository.save(layer);
            }
        });
    }
}
