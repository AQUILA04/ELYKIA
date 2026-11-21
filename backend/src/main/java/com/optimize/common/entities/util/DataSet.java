package com.optimize.common.entities.util;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class DataSet<T extends Number> {
    private String label = "Enregistrements";
    private List<T> data = new ArrayList<>();
    private T tension = null;

    public static DataSet<Double> pieChart(String dataSetLabel) {
        DataSet<Double> dataSet = new DataSet<>();
        dataSet.setLabel(dataSetLabel);
        dataSet.setData(List.of(1000D, 1200D, 1050D, 3000D));
        dataSet.setTension(null);
        return dataSet;
    }

}
