---
title: 利用hexo搭建博客
date: 2017-08-27 10:56:51
categories:
  - hexo
tags:
  - hexo
toc: true # 是否启用内容索引
comment: true
---
如果你和我一样是小白，那么恭喜你！看完这篇文章，你也可以拥有一个这样的博客
_____
前面已经介绍过如何搭建hexo环境，现在我将介绍如何用hexo搭建自己的blog
## 博客搭建

### 实施方案
#### 方案一：GithubPages
1. 创建Github账号

2. 创建仓库 ，仓库名为：<Github账号名称>.github.io
![仓库名称](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556370583717.png)
点击settings
![settings](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556370714512.png)
往下翻就能看到githubPages，我这里是已经配置过了的，没有配置可以是select themes ，点击能够选择SkyII主题。（SkyII主题也是和hexo类似的blog的框架，这里不与介绍）

3. 将本地Hexo博客推送到GithubPages
	3.1. 安装hexo-deployer-git插件。在命令行（即Git Bash）运行以下命令即可：
	```shell?linenums
		$ npm install hexo-deployer-git --save
	```
	3.2. 添加SSH key。

	- 创建一个 SSH key 。在命令行（即Git Bash）输入以下命令， 回车三下即可：
	```
	$ ssh-keygen -t rsa -C "邮箱地址"
	```
	- 添加到 github。 复制密钥文件内容（路径形如C:\Users\Administrator\.ssh\id_rsa.pub），粘贴到New SSH Key即可。
	- 测试是否添加成功。在命令行（即Git Bash）依次输入以下命令，返回“You’ve successfully authenticated”即成功：
	```
	ssh -T git@github.com
	```
	 3.3. 修改_config.yml（在站点目录下）。文件末尾修改为：

	```
	# Deployment
	## Docs: https://hexo.io/docs/deployment.html
	deploy:
	  type: git
	  repo: git@github.com:<Github账号名称>/<Github账号名称>.github.io.git
	  branch: master
	```

	注意：上面仓库地址写ssh地址，不写http地址。
	3.4. 推送到GithubPages。在命令行（即Git Bash）依次输入以下命令， 返回INFO Deploy done: git即成功推送： 

	```
	$ hexo g
	$ hexo d
	```
	等待1分钟左右，浏览器访问网址： https://<Github账号名称>.github.io
至此，您的Hexo博客已经搭建在GithubPages, 域名为https://<Github账号名称>.github.io。
 
#### 方案二：GithubPages + 域名
在方案一的基础上，添加自定义域名（您购买的域名）。我的是从阿里云购买的。
1. 域名解析
	类型选择为 CNAME；

	主机记录即域名前缀，填写为www；

	记录值填写为<Github账号名称>.github.io；

	解析线路，TTL 默认即可
	![阿里云](https://www.github.com/liuyong520/pic/raw/master/小书匠/屏幕快照_2019-04-27_21.28.51.png)
	点击 liuyong520.cn
	![域名解析](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556371873729.png)
2. 仓库设置。
	2.1. 打开博客仓库设置：https://github.com/<Github账号名称>/<Github账号名称>.github.io/settings

	2.2. 在Custom domain下，填写自定义域名，点击save。

	2.3. 在站点目录的source文件夹下，创建并打开CNAME.txt，写入你的域名（如www.liuyong520.cn），保存，并重命名为CNAME。如图
	![githubpages](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556370801480.png)
 3. 等待10分钟左右。
 	浏览器访问自定义域名。http://www.liuyong520.cn

	至此，您的Hexo博客已经解析到自定义域名，https://<Github账号名称>.github.io依然可用。
	
 #### 方案三：GithubPages + CodingPages + 域名

GithubPages 在国内较慢，百度不收录，而CodingPages 在国外较快。所以在方案二的基础上，添加CodingPages 。
1. 创建Coding账号
2. 创建仓库， 仓库名为：<Coding账号名称>
3. 进入项目里『代码』页面，点击『一键开启静态 Pages』，稍等片刻CodingPages即可部署成功。
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556380352090.png)
4. 将本地Hexo博客推送到CodingPages
	4.1. 鉴于创建GithubPages 时，已经生成过公钥。可直接复制密钥文件内容（路径形如C:\Users\Administrator\.ssh\id_rsa.pub）， 粘贴到新增公钥。
	4.2. 测试是否添加成功。在命令行（即Git Bash）依次输入以下命令，返回“You’ve successfully authenticated”即成功：
	```
	$ ssh -T git@git.coding.net
	$ yes
	```
	4.3. 修改_config.yml（在存放Hexo初始化文件的路径下）。文件末尾修改为：
	```
	# Deployment
	## Docs: https://hexo.io/docs/deployment.html
	deploy:
	- type: git
	  repo: git@github.com:<Github账号名称>/<Github账号名称>.github.io.git
	  branch: master
	- type: git
	  repo: git@git.dev.tencent.com:<Coding账号名称>/<Coding账号名称>.git
  	branch: master
	```
	4.4. 推送到GithubPages。在命令行（即Git Bash）依次输入以下命令， 返回INFO Deploy done: git即成功推送：
	```
	$ hexo g
	$ hexo d
	```
5. 域名解析
	1. 添加 CNAME 记录指向 <Coding账号名称>.coding.me

		类型选择为 CNAME；

		主机记录即域名前缀，填写为www；

		记录值填写为<Github账号名称>.coding.me；

		解析线路，TTL 默认即可。

	2. 添加 两条A 记录指向 192.30.252.153和192.30.252.154

		类型选择为 A；

		主机记录即域名前缀，填写为@；

		记录值填写为192.30.252.153和192.30.252.154；

		解析线路，境外或谷歌。
		![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556382087569.png)
	 3. 在『Pages 服务』设置页（https://dev.tencent.com/u/<Coding账号名称>/p/<Coding账号名称>/git/pages/settings）中绑定自定义域名
	 ![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556382059000.png)
	 4. 至此，您的Hexo博客已经解析到自定义域名，https://<Github账号名称>.github.io和https://<Coding账号名称>.coding.me依然可用。

#### 切换主题 
 - 选择主题
	hexo主题是非常多的，默认的主题是landscape，您可以自主的在hexo官方网站上挑选自己喜欢的主题，网站：https://hexo.io/themes/
	推荐以下主题：
[snippet](https://github.com/shenliyang/hexo-theme-snippet#hexo-theme-snippet)
[Hiero](https://github.com/iTimeTraveler/hexo-theme-hiero#hiero)
[Jsimple](https://github.com/tangkunyin/hexo-theme-jsimple#jsimple)
[BlueLake](https://github.com/chaooo/hexo-theme-BlueLake#bluelake)
[Pure](https://github.com/cofess/hexo-theme-pure)
[Next](https://github.com/theme-next/hexo-theme-next)
[Hueman](https://github.com/ppoffice/hexo-theme-hueman)
	我这里选择的是Pure。
	```
	git clone https://github.com/cofess/hexo-theme-pure.git  themes/pure
	```
	此时会在themes 目录下生成 pure目录
![目录](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556365705175.png)

 - 应用主题
	更改站点配置_config.yml 修改成
	```
	# Extensions
	## Plugins: https://hexo.io/plugins/
	## Themes: https://hexo.io/themes/
	theme: <主题文件夹的名称>
	```
 - 主题优化
	以上主题都有比较详细的说明文档，本节主要解决主题优化的常见问题。
	
	主题优化一般包括：
	 - 设置「RSS」
	 - 添加「标签」页面
	 - 添加「分类」页面
	 - 设置「字体」
	 - 设置「代码高亮主题」
	 - 侧边栏社交链接
	 - 开启打赏功能
	 - 设置友情链接
	 - 腾讯公益404页面
	 - 站点建立时间
	 - 订阅微信公众号
	 - 设置「动画效果」
	 - 设置「背景动画」
 下一次我将针对Pure进行主题方面的相关配置，以及讲解一下hexo主题的的实现原理的。这样你们针对不同的主题也就都能配置了。