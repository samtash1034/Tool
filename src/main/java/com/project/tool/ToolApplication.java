package com.project.tool;

import jakarta.annotation.PostConstruct;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.util.TimeZone;

@SpringBootApplication
@MapperScan("com.project.tool.mapper")
public class ToolApplication {

    @PostConstruct
    void init() {
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Taipei"));
    }

    public static void main(String[] args) {
        SpringApplication.run(ToolApplication.class, args);
    }
}
