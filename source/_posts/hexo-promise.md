---
title: hexo博客主题优化
date: 2017-08-29 10:56:51
categories:
  - hexo
tags:
  - hexo
toc: true # 是否启用内容索引
comment: true
---

在介绍博客主题优化这个话题之前，我想先介绍hexo主题的大体结构，便于后面将主题优化方面的东西。
## hexo主题结构
我这里选用pure主题为例进行讲解。
1. 进入themes/pure文件夹下执行如下命令
```
$ tree
.
├── LICENSE
├── README.cn.md
├── README.md
├── _config.yml #主题主配置文件
├── _config.yml.example #主题配置文件例子
├── _source #博客页面例子文件夹
│   ├── 404 #博客404页面只要拷贝到站点soure就行
│   │   └── index.md
│   ├── _data #博客友情链接页面
│   │   ├── gallery.yml
│   │   └── links.yml
│   ├── about #博客关于页面
│   │   └── index.md
│   ├── books #博客书单页面
│   │   └── index.md
│   ├── categories #博客分类页面
│   │   └── index.md
│   ├── links #博客友情链接
│   │   └── index.md
│   ├── repository #博客仓库模版页面
│   │   └── index.md
│   └── tags #博客标签页面
│       └── index.md
├── languages #博客语言切换配置文件夹
│   ├── default.yml
│   ├── en.yml
│   ├── zh-CN.yml
│   └── zh-TW.yml
├── layout #博客布局文件夹 这里就是生成页面的精华部分了
│   ├── _common
│   │   ├── footer.ejs
│   │   ├── head.ejs
│   │   ├── header.ejs
│   │   ├── script.ejs
│   │   └── social.ejs
│   ├── _partial
│   │   ├── archive-book.ejs
│   │   ├── archive-category.ejs
│   │   ├── archive-link.ejs
│   │   ├── archive-list.ejs
│   │   ├── archive-post.ejs
│   │   ├── archive-repository.ejs
│   │   ├── archive-tag.ejs
│   │   ├── archive.ejs
│   │   ├── article-about.ejs
│   │   ├── article.ejs
│   │   ├── item-post.ejs
│   │   ├── pagination.ejs
│   │   ├── post
│   │   │   ├── category.ejs
│   │   │   ├── comment.ejs
│   │   │   ├── copyright.ejs
│   │   │   ├── date.ejs
│   │   │   ├── donate.ejs
│   │   │   ├── gallery.ejs
│   │   │   ├── nav.ejs
│   │   │   ├── pv.ejs
│   │   │   ├── tag.ejs
│   │   │   ├── thumbnail.ejs
│   │   │   ├── title.ejs
│   │   │   └── wordcount.ejs
│   │   ├── sidebar-about.ejs
│   │   ├── sidebar-toc.ejs
│   │   └── sidebar.ejs
│   ├── _script
│   │   ├── _analytics
│   │   │   ├── baidu-analytics.ejs
│   │   │   ├── google-analytics.ejs
│   │   │   └── tencent-analytics.ejs
│   │   ├── _comment
│   │   │   ├── disqus.ejs
│   │   │   ├── gitalk.ejs
│   │   │   ├── gitment.ejs
│   │   │   ├── livere.ejs
│   │   │   ├── valine.ejs
│   │   │   └── youyan.ejs
│   │   ├── _search
│   │   │   ├── baidu.ejs
│   │   │   └── insight.ejs
│   │   ├── analytics.ejs
│   │   ├── comment.ejs
│   │   ├── douban.ejs
│   │   ├── fancybox.ejs
│   │   ├── mathjax.ejs
│   │   ├── pv.ejs
│   │   ├── repository.ejs
│   │   └── search.ejs
│   ├── _search
│   │   ├── baidu.ejs
│   │   ├── index-mobile.ejs
│   │   ├── index.ejs
│   │   ├── insight.ejs
│   │   └── swiftype.ejs
│   ├── _widget
│   │   ├── archive.ejs
│   │   ├── board.ejs
│   │   ├── category.ejs
│   │   ├── recent_posts.ejs
│   │   ├── tag.ejs
│   │   └── tagcloud.ejs
│   ├── about.ejs
│   ├── archive.ejs
│   ├── books.ejs
│   ├── categories.ejs
│   ├── category.ejs
│   ├── index.ejs
│   ├── layout.ejs
│   ├── links.ejs
│   ├── page.ejs
│   ├── post.ejs
│   ├── repository.ejs
│   ├── tag.ejs
│   └── tags.ejs
├── package.json
├── screenshot #主题颜色切换背景
│   ├── pure-theme-black.png
│   ├── pure-theme-blue.png
│   ├── pure-theme-green.png
│   ├── pure-theme-purple.png
│   ├── pure.png
│   └── pure.psd
├── scripts
│   └── thumbnail.js
└── source #主题静态资源文件目录
    ├── css
    │   ├── style.css
    │   └── style.min.css
    ├── favicon.png
    ├── fonts
    │   ├── README.md
    │   ├── iconfont.eot
    │   ├── iconfont.svg
    │   ├── iconfont.ttf
    │   └── iconfont.woff
    ├── images
    │   ├── avatar.jpg
    │   ├── avatar.jpg1
    │   ├── donate
    │   │   ├── alipayimg.png
    │   │   └── wechatpayimg.png
    │   ├── favatar
    │   │   ├── SzsFox-logo.png
    │   │   ├── chuangzaoshi-logo.png
    │   │   └── idesign-logo.png
    │   ├── thumb-default.png
    │   └── xingqiu-qrcode.jpg
    └── js
        ├── application.js
        ├── application.min.js
        ├── insight.js
        ├── jquery.min.js
        ├── plugin.js
        ├── plugin.js.map
        └── plugin.min.js

29 directories, 125 files
```
layout里面的文件使用ejs （js模版语言）[ejs官网](https://ejs.bootcss.com/)实现的，里面把整个页面通过js抽取各个小的模块模版文件，同时数据和标签页面是分离的，所以在页面里面可以加载config.yml 里面的配置。

整个页面入口文件就是layout.js
```html?linenums
<!DOCTYPE html>
<html<%= config.language ? " lang=" + config.language.substring(0, 2) : ""%>>
<%- partial('_common/head', {post: page}) %>
##这里会判断是否启用layout配置
<% 
	var bodyClass = 'main-center'; 
	if (theme.config.layout) {
		bodyClass = theme.config.layout;
	}
  if (theme.config.skin) {
    bodyClass += ' ' + theme.config.skin;
  }
	bodyClass = page.sidebar === 'none' ? (bodyClass + ' no-sidebar') : bodyClass;
%>
<body class="<%= bodyClass %>" itemscope itemtype="http://schema.org/WebPage">
  <%- partial('_common/header', null, {cache: !config.relative_link}) %>
  <% if (theme.sidebar && (page.sidebar!='none' || page.sidebar!='custom')){ %>
    <% if (theme.config.toc && page.toc){ %>
    <%- partial('_partial/sidebar-toc', {post: page}) %>
    <% }else{ %>
    <%- partial('_partial/sidebar', null, {cache: !config.relative_link}) %>
    <% } %>
  <% } %>
  <%- body %>
  <%- partial('_common/footer', null, {cache: !config.relative_link}) %>
  <%- partial('_common/script', {post: page}) %>
</body>
</html>
```
其中<%- partial('_common/footer', null, {cache: !config.relative_link}) %> 表示引入子模块_common/footer.ejs文件，{cache: !config.relative_link}表示参数
我们的创建的博客文章都会加载这个布局文件。
2. 我们新创建的博客文章有如下的配置：
```
title: 文章标题
categories:
  - 文章分类
tags:
  - 文章标签
toc: true # 是否启用内容索引
comment:true #是否启用评论
layout:模版文件，如果没有默认不加载任何模版
sidebar: none # 是否启用sidebar侧边栏，none：不启用，不配置默认启动
```
 以上配置属于page 域的配置文件属于单个页面的，而config.language 这种是全局配置文件（也就是站点配置文件config.yml），每个页面都能使用。theme.config 加载的就是主题的配置文件config.yml 文件。
 3. 主题配置文件config.yml
 ```
 # menu
menu:
  Home: .
  Archives: archives  # 归档
  Categories: categories  # 分类
  Tags: tags  # 标签
  Repository: repository  # github repositories
  Books: books  # 豆瓣书单
  Links: links  # 友链
  About: about  # 关于

# Enable/Disable menu icons
menu_icons:
  enable: true  # 是否启用导航菜单图标
  home: icon-home-fill
  archives: icon-archives-fill
  categories: icon-folder
  tags: icon-tags
  repository: icon-project
  books: icon-book-fill
  links: icon-friendship
  about: icon-cup-fill

# rss
rss: /atom.xml

# Site
site:
  logo:
    enabled: true
    width: 40
    height: 40
    url: ../images/logo.png
  title: Hexo # 页面title
  favicon: /favicon.png
  board: <p>欢迎交流与分享经验!</p> # 站点公告
  copyright: false # 底部版权信息

# config
config:
  skin: theme-black # 主题颜色 theme-black theme-blue theme-green theme-purple
  layout: main-center # 布局方式 main-left main-center main-right
  toc: true # 是否开启文章章节目录导航
  menu_highlight: false # 是否开启当前菜单高亮显示
  thumbnail: false # enable posts thumbnail, options: true, false
  excerpt_link: Read More

# Pagination 分页
pagination:
  number: false #是否开启数字
  prev: 
    alwayShow: true
  next:
    alwayShow: true

# Sidebar
sidebar: right
widgets:
  - board  
  - category
  - tag
  - tagcloud
  - archive
  - recent_posts

# display widgets at the bottom of index pages (pagination == 2)
index_widgets:
# - category
# - tagcloud
# - archive  

# widget behavior
archive_type: 'monthly'
show_count: true

# Fancybox
fancybox: false

# Search
search:
  insight: true # you need to install `hexo-generator-json-content` before using Insight Search
  baidu: false # you need to disable other search engines to use Baidu search, options: true, false

# Donate
donate:
  enable: true
  # 微信打赏
  wechatpay:
    qrcode: images/donate/wechatpayimg.png
    title: 微信支付
  # 支付宝打赏
  alipay: 
    qrcode: images/donate/alipayimg.png 
    title: 支付宝

# Share
# weibo,qq,qzone,wechat,tencent,douban,diandian,facebook,twitter,google,linkedin
share:
  enable: true  # 是否启用分享
  sites: weibo,qq,wechat,facebook,twitter  # PC端显示的分享图标
  mobile_sites: weibo,qq,qzone  # 移动端显示的分享图标

# Github
github: 
  username: ***

# Comment
# Gitment
# Introduction: https://imsun.net/posts/gitment-introduction/
comment:
  type: youyan
  disqus: # enter disqus shortname here
  youyan: 
    uid: 1783844 # enter youyan uid 
  livere:
    uid: # enter youyan uid 
  gitment:
    githubID: 
    repo: 
    ClientID: 
    ClientSecret: 
    lazy: false
  gitalk: # gitalk. https://gitalk.github.io/
    owner:  #必须. GitHub repository 所有者，可以是个人或者组织。
    admin:  #必须. GitHub repository 的所有者和合作者 (对这个 repository 有写权限的用户)。
    repo:  #必须. GitHub repository.
    ClientID:  #必须. GitHub Application Client ID.
    ClientSecret:  #必须. GitHub Application Client Secret.
  valine: # Valine. https://valine.js.org
    appid:  # your leancloud application appid
    appkey:  # your leancloud application appkey
    notify: false # mail notifier , https://github.com/xCss/Valine/wiki
    verify: false # Verification code
    placeholder: Just go go # comment box placeholder
    avatar: mm # gravatar style
    meta: nick,mail,link # custom comment header
    pageSize: 10 # pagination size
    visitor: false # Article reading statistic https://valine.js.org/visitor.html

# douban 豆瓣书单
# Api：
  # https://developers.douban.com/wiki/?title=book_v2 图书
  # https://developers.douban.com/wiki/?title=movie_v2 电影
# books：  
  # https://api.douban.com/v2/book/user/:name/collections?start=0&count=100 个人书单列表
# movies: 
  # https://api.douban.com/v2/movie/in_theaters 正在上映的电影
  # https://api.douban.com/v2/movie/coming_soon 即将上映的电影
  # https://api.douban.com/v2/movie/subject/:id 单个电影信息
  # https://api.douban.com/v2/movie/search?q={text} 电影搜索
douban:
  user: # 豆瓣用户名
  start: 0 # 从哪一条记录开始
  count: 100 # 获取豆瓣书单数据条数
  
# PV
pv:
  busuanzi:
    enable: false  # 不蒜子统计
  leancloud:
    enable: false  # leancloud统计
    app_id: # leancloud <AppID>
    app_key: # leancloud <AppKey>
        
# wordcount
postCount:
  enable: false
  wordcount: true  # 文章字数统计
  min2read: true  # 阅读时长预计 

# Plugins
plugins:
  google_analytics: # enter the tracking ID for your Google Analytics
  google_site_verification: # enter Google site verification code
  baidu_analytics: # enter Baidu Analytics hash key
  tencent_analytics: 
  
# Miscellaneous
twitter:
google_plus:
fb_admins:
fb_app_id:  
  
# profile
profile:
  enabled: true # Whether to show profile bar
  avatar: images/avatar.jpg
  gravatar: # Gravatar email address, if you enable Gravatar, your avatar config will be overriden
  author: 昵称
  author_title: Web Developer & Designer
  author_description: 个人简介。
  location: Shenzhen, China
  follow: https://github.com/cofess
  # Social Links
  social:
    links:
      github: https://github.com/cofess
      weibo: http://weibo.com/cofess
      twitter: https://twitter.com/iwebued
      # facebook: /
      # dribbble: /
      behance: https://www.behance.net/cofess
      rss: atom.xml
    link_tooltip: true # enable the social link tooltip, options: true, false
  # My Skills 
  skills:
    Git: ★★★☆☆
    Gulp: ★★★☆☆
    Javascript: ★★★☆☆
    HTML+CSS: ★★★☆☆
    Bootstrap: ★★★☆☆
    ThinkPHP: ★★★☆☆
    平面设计: ★★★☆☆
  # My Personal Links
  links:
    Github: https://github.com/cofess
    Blog: http://blog.cofess.com
    微博: http://weibo.com/cofess
    花瓣: http://huaban.com/cofess
    Behance: https://www.behance.net/cofess
  # My Personal Labels
  labels:
    - 前端
    - 前端开发
    - 前端重构
    - Web前端
    - 网页重构
  # My Personal Works
  works:
    name:
      link: http://www.example.com
      date: 2016
  # My Personal Projects
  projects:
    cofess/gulp-startpro: https://github.com/cofess/gulp-startpro
    cofess/hexo-theme-pure: https://github.com/cofess/hexo-theme-pure
 ```
 基本上每个配置做什么用的，配置文件里面基本写了注解。也很容易理解。
 如果还不是很能理解配置项。可以查看https://github.com/cofess/hexo-theme-pure/blob/master/README.cn.md 文件。
 至此，hexo模版的大体结构已经清楚了。
 ### 主题优化
 #### 修改主题
 在config.yml 文件中修改
 ```
 # Extensions
## Plugins: https://hexo.io/plugins/
## Themes: https://hexo.io/themes/
theme: pure
```
#### 修改语言
在config.yml 文件中修改
```
# Site
language: zh-CN #修改成中文
```
#### 添加Rss订阅
 1. 安装feed插件
 ```
 npm install hexo-generator-feed --save
 ```
 2. 在config.yml添加
 ```
 # Extensions
## Plugins: https://hexo.io/plugins/
#RSS订阅
plugin:
- hexo-generator-feed
 ```
 3. 设置feed插件参数
 ```
 #Feed Atom
feed:
  type: atom
  path: atom.xml
  limit: 20
 ```
 4. 生成预览
 ```
 hexo g
 hexo d
 ```
 预览下就是如下
 ![rss订阅](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556433596798.png)
 #### 添加站点地图
 站点地图是一种文件，您可以通过该文件列出您网站上的网页，从而将您网站内容的组织架构告知Google和其他搜索引擎。Googlebot等搜索引擎网页抓取工具会读取此文件，以便更加智能地抓取您的网站
1. 分别安装百度和google插件 
```
npm install hexo-generator-sitemap --save
npm install hexo-generator-baidu-sitemap --save
```
2. 在博客目录的_config.yml中添加如下代码
```
# 自动生成sitemap
sitemap:
path: sitemap.xml
baidusitemap:
path: baidusitemap.xml
```
3. 编译你的博客
```
hexo g
hexo s
```
如果你在你的博客根目录的public下面发现生成了sitemap.xml以及baidusitemap.xml就表示成功了,在本地访问 http://127.0.0.4000/sitemap.xml 和 http://127.0.0.4000/baidusitemap.xml 就能正确的展示出两个sitemap 文件了。
4. 注册百度站长平台
	4.1 访问：https://ziyuan.baidu.com/linksubmit/index
	4.2 提交链接
	提交链接方式有主动推送、自动推送、sitemap、手动上传等。
	![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556435172481.png)
	4.3主动推送
安装对应提交插件
```
npm install hexo-baidu-url-submit --save
```
修改配置：
```
##配置插件
plugin:
- hexo-generator-baidu-sitemap
- hexo-generator-sitemap
- hexo-baidu-url-submit

baidu_url_submit:
  ## 比如3，代表提交最新的三个链接
  count: 3
  # 在百度站长平台中注册的域名
  host: www.liuyong520.cn 
  ## 请注意这是您的秘钥， 请不要发布在公众仓库里!
  token: upR0BjzCYxTC2CPq 
  ## 文本文档的地址， 新链接会保存在此文本文档里
  path: baidu_urls.txt 
```
编译博客
```
hexo g
hexo d
```
如果出现下图即表示成功了
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556435593425.png)

 4.4 自动推送
 将如下代码添加到head.ejs中即可生效
 ```
 <script>
    (function(){
        var bp = document.createElement('script');
        var curProtocol = window.location.protocol.split(':')[0];
        if (curProtocol === 'https') {
            bp.src = 'https://zz.bdstatic.com/linksubmit/push.js';        
        }
        else {
            bp.src = 'http://push.zhanzhang.baidu.com/push.js';
        }
        var s = document.getElementsByTagName("script")[0];
        s.parentNode.insertBefore(bp, s);
    })();
  </script>
 ```
 4.5 sitemap 提交方式
 打开百度站长平台，点击sitemap，填入我们的sitemap文件路径：<域名>/<sitemap名字>如下
 ![sitemap](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556435919259.png)
 提交即可.
 但是此时你的域名其实并没有被百度站长所收录：
 ![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556436053972.png)
 百度依然检索不到你的网站，需要10多个工作日之后才能审核通过。
 5. 绑定站点到熊掌ID，这样熊掌ID站点管理里面就能看到相关站点数据了
 登录站长平台，注册熊掌ID，提交审核过后
 点击站点收录：
 ![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556436351784.png)
 ![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556436435701.png)
 
 #### 静态资源压缩
hexo 的文章是通过md格式的文件经过swig转换成的html，生成的html会有很多空格，而且自己写的js以及css中会有很多的空格和注释。
js和java不一样，注释也会影响一部分的性能，空格同样是的。
 静态资源压缩也有多种手段：有gulp插件和hexo自带的neat插件。
 ##### 1.hexo-neat 插件：
 1. 安装hexo-neat插件
 ```
 npm install hexo-neat --save
 ```
 2. 修改站点配置文件_config.yml：
 ```
 # hexo-neat
# 博文压缩
neat_enable: true
# 压缩html
neat_html:
  enable: true
  exclude:
# 压缩css  
neat_css:
  enable: true
  exclude:
    - '**/*.min.css'
# 压缩js
neat_js:
  enable: true
  mangle: true
  output:
  compress:
  exclude:
    - '**/*.min.js'
    - '**/jquery.fancybox.pack.js'
    - '**/index.js'  
 ```
 3. 编译博客
 ```
 hexo g 
 hexo d
 ```
 ##### gulp插件方式
 1. 安装gulp及相关插件
 ```
npm install gulp -g
npm install gulp-minify-css --save
npm install gulp-uglify --save
npm install gulp-htmlmin --save
npm install gulp-htmlclean --save
npm install gulp-imagemin --save
 ```
在 Hexo 站点下新建 gulpfile.js文件，文件内容如下：
```
var gulp = require('gulp');
var minifycss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var htmlclean = require('gulp-htmlclean');
var imagemin = require('gulp-imagemin');
// 压缩css文件
gulp.task('minify-css', function() {
  return gulp.src('./public/**/*.css')
  .pipe(minifycss())
  .pipe(gulp.dest('./public'));
});
// 压缩html文件
gulp.task('minify-html', function() {
  return gulp.src('./public/**/*.html')
  .pipe(htmlclean())
  .pipe(htmlmin({
    removeComments: true,
    minifyJS: true,
    minifyCSS: true,
    minifyURLs: true,
  }))
  .pipe(gulp.dest('./public'))
});
// 压缩js文件
gulp.task('minify-js', function() {
    return gulp.src(['./public/**/.js','!./public/js/**/*min.js'])
        .pipe(uglify())
        .pipe(gulp.dest('./public'));
});
// 压缩 public/demo 目录内图片
gulp.task('minify-images', function() {
    gulp.src('./public/demo/**/*.*')
        .pipe(imagemin({
           optimizationLevel: 5, //类型：Number  默认：3  取值范围：0-7（优化等级）
           progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
           interlaced: false, //类型：Boolean 默认：false 隔行扫描gif进行渲染
           multipass: false, //类型：Boolean 默认：false 多次优化svg直到完全优化
        }))
        .pipe(gulp.dest('./public/uploads'));
});
// 默认任务
gulp.task('default', [
  'minify-html','minify-css','minify-js','minify-images'
]);
```
只需要每次在执行 generate 命令后执行 gulp 就可以实现对静态资源的压缩，压缩完成后执行 deploy 命令同步到服务器：
```
hexo g
gulp
hexo d
```
#### 修改访问URL路径
默认情况下访问URL路径为：domain/2018/10/18/关于本站,修改为 domain/About/关于本站。 编辑 Hexo 站点下的 _config.yml 文件，修改其中的 permalink字段：
```
permalink: :category/:title/
```

#### 博文置顶
1. 安装插件
```
npm uninstall hexo-generator-index --save
npm install hexo-generator-index-pin-top --save
```
然后在需要置顶的文章的Front-matter中加上top即可：
```
--
title: 2018
date: 2018-10-25 16:10:03
top: 10
---
```
设置置顶标志
打开：/themes/*/layout/_macro/post.swig，定位到
```
{% if post.top %}
  <i class="fa fa-thumb-tack"></i>
  <font color=7D26CD>置顶</font>
  <span class="post-meta-divider">|</span>
{% endif %}
```
