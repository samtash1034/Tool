package com.project.tool.dto;

/** 重新排序時每一筆的 id 與所在區塊（依陣列順序決定排序） */
public record TodoOrderItem(Long id, String level) {
}
