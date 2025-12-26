package com.optimize.elykia.core.util;

public class MoneyUtil {

    private MoneyUtil() {
        //Default constructor
    }

    public static double calculateDailyStake(double amount) {
        if (amount < 200){
            return 200;
        }
        // Arrondir vers le bas au multiple de 50 le plus proche
        return Math.ceil(amount / 25) * 25;
    }
}
