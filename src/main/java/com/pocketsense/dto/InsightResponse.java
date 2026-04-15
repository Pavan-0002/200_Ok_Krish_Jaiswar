package com.pocketsense.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
public class InsightResponse {
    private String personality;
    private String topCategory;
    private String trend;
    private String message;
    private List<String> badges;
    private Double totalSpending;
    private Double regretSpending;
    private Integer healthScore;
}
