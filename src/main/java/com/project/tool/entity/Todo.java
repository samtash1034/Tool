package com.project.tool.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/** 待辦事項 */
@Data
@TableName("todo")
public class Todo {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String text;
    /** 區塊：high / normal / low / work / daily */
    private String level;
    /** 排序（越小越前面），跨區塊共用一個序列 */
    private Integer sortOrder;
    private LocalDateTime createdAt;
}
