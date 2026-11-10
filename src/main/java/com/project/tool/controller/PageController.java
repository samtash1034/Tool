package com.project.tool.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** 頁面路由（Thymeleaf） */
@Controller
public class PageController {

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/todo")
    public String todo() {
        return "todo";
    }

    @GetMapping("/notepad")
    public String notepad() {
        return "notepad";
    }

    @GetMapping("/pomodoro")
    public String pomodoro() {
        return "pomodoro";
    }
}
