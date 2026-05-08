#!/bin/bash
sed -i 's/@{{item.username}}/&#64;{{item.username}}/g' frontend/src/app/stock/stock-return-historique/stock-return-historique.component.html
sed -i 's/{{ (item.weightedAverageUnitPrice || 0) | number:'\''1.0-0'\'' }}/{{ item.weightedAverageUnitPrice ? (item.weightedAverageUnitPrice | number:'\''1.0-0'\'') : 0 }}/g' frontend/src/app/stock/stock-return-historique/stock-return-historique.component.html
sed -i 's/{{ (getSelectedQty(item) \* (item.weightedAverageUnitPrice || 0)) | number:'\''1.0-0'\'' }}/{{ (getSelectedQty(item) * (item.weightedAverageUnitPrice ? item.weightedAverageUnitPrice : 0)) | number:'\''1.0-0'\'' }}/g' frontend/src/app/stock/stock-return-historique/stock-return-historique.component.html
