package com.project.tool.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 關節復健日誌（一天一筆） */
@Data
@TableName("health_log")
public class HealthLog {
    @TableId(type = IdType.AUTO)
    private Long id;
    private LocalDate logDate;
    /** 疼痛程度 0~10，null = 未填（更新時也要能清成 null） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Integer painLevel;
    /** 活動度 0~10（10 = 完全正常），null = 未填 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Integer mobility;
    /** 就診：物理治療 / 骨科 / 復健… */
    private String visit;
    /** 復健運動內容 */
    private String exercise;
    private Integer exerciseMinutes;
    /** 治療 / 用藥 */
    private String treatment;
    /** 每日心得 */
    private String note;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
