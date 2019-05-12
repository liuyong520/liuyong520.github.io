---
title: storm 安装使用
date: 2019-05-02 21:37:40
tags:
  - storm
categories:
  - storm
comment: true
toc: true
---
# 环境准备
## zookeeper集群环境
storm是依赖于zookeeper注册中心的一款分布式消息对列，所以需要有zookeeper单机或者集群环境。

## 准备三台服务器：
```
172.16.18.198 k8s-n1
172.16.18.199 k8s-n2
172.16.18.200 k8s-n3
```

## 下载storm安装包

http://storm.apache.org/downloads.html 中下载，目前最新版本的strom已经到1.2.2,我这里之前下载的是1.1.3版本的。

# 安装storm集群

## 上传压缩包到三台服务器解压缩到/opt/目录下

```
tar -zxf apache-storm-1.1.3.tar.gz -C /opt
ln -sf apache-storm-1.1.3/ storm
```

## 修改 conf目录下的storm.yml文件

Storm包含一个conf/storm.yaml配置Storm守护进程的文件。这个文件里面配置的值会覆盖掉default.yml里面的值，同时里面有一些配置是必须填的
**注意：yml文件的前面的空格必须有，不然就会出问题，yml配置文件有严格的格式**
1)storm.zookeeper.servers：这是Storm集群的Zookeeper集群中的主机列表。它应该看起来像：

```
storm.zookeeper.servers:
  - "k8s-n1"
  - "k8s-n2
  - "k8s-n3"
```

2)如果zookeeper的默认端口不是2181的话还需要配置storm.zookeeper.port,如果是2181，此选项可以不用配置

```
storm.zookeeper.port: 2181
```

3）storm.local.dir：Nimbus和Supervisor守护进程需要本地磁盘上的一个目录来存储少量状态（如jar，confs和类似的东西）。您应该在每台计算机上创建该目录，为其提供适当的权限，然后使用此配置填写目录位置。例如：

```
storm.local.dir: "/data/storm"
```

4）nimbus.seeds：工作节点需要知道哪些机器是主机的候选者才能下载拓扑罐和confs。例如：

```
nimbus.seeds: ["k8s-n1","k8s-n2","k8s-n3"]
```

4）supervisor.slots.ports：对于每个工作者计算机，您可以使用此配置配置在该计算机上运行的工作程序数。每个工作人员使用单个端口接收消息，此设置定义哪些端口可以使用。如果您在此处定义了五个端口，那么Storm将分配最多五个工作人员在此计算机上运行。如果您定义了三个端口，Storm最多只能运行三个端口。默认情况下，此设置配置为在端口6700,6701,6702和6703上运行4个工作程序。例如：

```
supervisor.slots.ports:
    - 6700
    - 6701
    - 6702
    - 6703
```

5)开启监督机制监督健康状况
Storm提供了一种机制，管理员可以通过该机制定期管理员定期运行管理员提供的脚本，以确定节点是否健康。管理员可以让主管通过在storm.health.check.dir中的脚本中执行他们选择的任何检查来确定节点是否处于健康状态。如果脚本检测到节点处于不健康状态，则必须从标准输出打印一行，以字符串ERROR开头。主管将定期运行运行状况检查目录中的脚本并检查输出。如果脚本的输出包含字符串ERROR，如上所述，主管将关闭所有工作人员并退出。

如果主管在监督下运行，则可以调用“/ bin / storm node-health-check”来确定是否应该启动主管或节点是否运行状况不佳。

运行状况检查目录位置可以配置为：

```
storm.health.check.dir: "healthchecks"
```

脚本必须具有执行权限。允许任何给定的运行状况检查脚本在由于超时而标记为失败之前运行的时间可以配置为：

```
storm.health.check.timeout.ms: 5000
```

启动

Nimbus：在主机监督下运行命令“bin / storm nimbus”。
主管：在每台工作机器的监督下运行命令“bin / storm supervisor”。管理程序守护程序负责启动和停止该计算机上的工作进程。
UI：通过在监督下运行命令“bin / storm ui”，运行Storm UI（您可以从浏览器访问的站点，该站点提供对群集和拓扑的诊断）。可以通过将Web浏览器导航到http：// {ui host}：8080来访问UI。
如您所见，运行守护进程非常简单。守护程序将在您解压缩Storm版本的任何位置登录到logs /目录。
后台启动
```
nohup storm ui >/dev/null 2>&1 &
```