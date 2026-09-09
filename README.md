# 习惯打卡网站

- 线上网址：https://lkc-01.github.io/habit-tracker/
- GitHub 仓库：https://github.com/lkc-01/habit-tracker
- 本地目录：D:\天选\Documents\ChatGPT\个人网站测试（即本仓库根目录）

## 说明
- 纯前端页面（index.html + styles.css + app.js），无需服务器。
- 打卡数据保存在浏览器 localStorage（按日期记录），换浏览器/设备不互通。
- 修改本地文件后提交并推送，GitHub Pages 会自动重新发布，约 1 分钟生效。

## 更新方法
在 PowerShell 中执行：

    cd D:\天选\Documents\ChatGPT\个人网站测试
    git add -A
    git commit -m "更新内容说明"
    git push

推送需要 GitHub 登录授权：
- 在 Codex 里操作：让 Codex 走一次「设备码授权」（打开 https://github.com/login/device 输入一次性授权码即可）；
- 或使用 GitHub Desktop 登录账号后直接 Push。

## 历史
- 2026-09-09 创建页面并部署上线（v1）