package com.optimize.common.entities.util;

import lombok.Data;
import lombok.ToString;

import java.util.ArrayList;
import java.util.List;

@Data
@ToString
public class BaseChart<T extends Number> {
    protected List<String> labels = new ArrayList<>();
    protected List<DataSet<T>> datasets = new ArrayList<>();
}
