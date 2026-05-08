#!/bin/bash
sed -i 's/w-50//g' frontend/src/app/stock/stock-return-historique/stock-return-historique.component.html
sed -i 's/@{{item.username}}/\&#64;{{item.username}}/g' frontend/src/app/stock/stock-return-historique/stock-return-historique.component.html
