---
title: Hexo之环境搭建
date: 2017-08-27 10:56:51
categories:
  - hexo
tags:
  - hexo
toc: true # 是否启用内容索引
comment: true
---
如果你和我一样是小白，那么恭喜你！看完这篇文章，你也可以拥有一个这样的博客啦！
## 前言
在以前我们要维护一个专属于自己的blog，是比较麻烦的，要购买服务器，部署博客程序到服务器，还要维护相关数据和网络。这一类blog最为典型的例子就是WordPress。而今天我们要介绍的是如何基于Hexo博客快速的搭建我们自己服务器系列。
## hexo介绍
Hexo 是一个快速、简洁且高效的博客框架。Hexo 使用 Markdown（或其他渲染引擎）解析文章，在几秒内，即可利用靓丽的主题生成静态网页。

## hexo安装
hexo 是基于node.js环境的，所以安装前，您必须检查电脑中是否已安装下列应用程序：[node.js](https://nodejs.org/en/)
如果您的电脑中已经安装上述必备程序，那么恭喜您！接下来只需要使用 npm 即可完成 Hexo 的安装。
```
	$ npm install -g hexo-cli
```
如果您的电脑中未安装Node，那么就需要安装Node.js
详细安装步骤参考：http://www.liuyong520.cn/2017/08/26/nodejs-install/

再安装Hexo，在命令行（即Git Bash）运行以下命令：
```
npm install -g hexo-cli
```
至此Hexo的环境就搭建好了，下一步验证一下hexo
```
MacBook-Pro:_posts xxydliuyss$ hexo version
hexo: 3.8.0
hexo-cli: 1.1.0
os: Darwin 18.5.0 darwin x64
http_parser: 2.8.0
node: 10.15.3
v8: 6.8.275.32-node.51
uv: 1.23.2
zlib: 1.2.11
ares: 1.15.0
modules: 64
nghttp2: 1.34.0
napi: 3
openssl: 1.1.0j
icu: 62.1
unicode: 11.0
cldr: 33.1
tz: 2018e
```
这样hexo就安装完成了
### hexo命令介绍
官网已经介绍的比较详细了这里就不再赘述了
详情请看官方命令地址：https://hexo.io/zh-cn/docs/commands
### hexo快速新建博客
初始化Hexo，在命令行（即Git Bash）依次运行以下命令即可：

以下，即存放Hexo初始化文件的路径， 即站点目录。
```shell?linenums
$ hexo init myproject
$ cd myproject
$ npm install
```
新建完成后，在路径下，会产生这些文件和文件夹：
```shell?linenums
$ tree
.
├── _config.yml
├── package.json
├── scaffolds
├── source
|   ├── _drafts
|   └── _posts
└── themes
```

|    目录名或者文件名 |  详情介绍   |
| --- | --- |
|  _config.yml   | hexo 全局配置文件    |
|   package.json  |   nodejs 包配置文件  |
|  scaffolds   |  hexo模版文件夹hexo new filename 会对应根据模版文件生成文件   |
|   source  |  项目源代码文件目录 |
|  _drafts   |   为草稿原文件目录  |
|  _posts | 项目发布文件目录 项目最终会根据这个目录下的文件生成html|
| themes| 博客主题存放目录|

注：

hexo相关命令均在站点目录下，用Git Bash运行。

站点配置文件：站点目录下的_config.yml。

​ 路径为<folder>\_config.yml

主题配置文件：站点目录下的themes文件夹下的，主题文件夹下的_config.yml。

​ 路径为<folder>\themes\<主题文件夹>\_config.yml

2. 启动服务器。在路径下，命令行（即Git Bash）输入以下命令，运行即可：

```
hexo server
```
3. 浏览器访问网址： http://localhost:4000/ 就可以预览博客了
![图片](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556363959958.png)

下一篇 我将介绍如何搭建自己的blog
