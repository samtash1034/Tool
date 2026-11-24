package com.project.tool.dto;

public record HealthLogRequest(Integer painLevel, Integer mobility, String visit, String exercise,
                               Integer exerciseMinutes, String treatment, String note) {
}
