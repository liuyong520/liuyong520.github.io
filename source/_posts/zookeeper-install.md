---
title: Linux下zookeeper集群搭建
date: 2019-04-29 10:56:51
categories:
  - 分布式集群
tags:
  - ZooKeeper
  - linux
toc: true # 是否启用内容索引
comment: true
---
## 部署前准备
1. 下载zookeeper的安装包
    　http://zookeeper.apache.org/releases.html 我下载的版本是zookeeper-3.4.10。

2. 准备三台服务器
   ip地址为：
   
   ```
   172.16.18.198
   172.16.18.199
   172.16.18.200
   ```

3. 检查jdk版本，安装jdk环境，jdk需要1.7以上。

## 安装zookeeper
1. 三台服务器分别上传zookeeper安装包，上传到/opt/目录下，然后tar zxvf zookeeper-3.4.10.tar.gz 

2. 拷贝zoo_sample.cfg 为zoo.cfg 修改/opt/zookeeper-3.4.10/conf/zoo.cfg配置文件，添加如下内容：

```
server.1=172.16.18.198:2888:3888
server.2=172.16.18.199:2888:3888
server.3=172.16.18.200:2888:3888

```

3. 修改zookeeper数据文件存放目录
```
dataDir=/data/zookeeper
```

此时zoo.cfg 配置文件内容为：
```
# The number of milliseconds of each tick
tickTime=2000 ##zookeeper单位时间为2ms
# The number of ticks that the initial 
# synchronization phase can take
initLimit=10  ##对于从节点最初连接到主节点时的超时时间，单位为tick值的倍数。即20ms
# The number of ticks that can pass between 
# sending a request and getting an acknowledgement
syncLimit=5   ##对于主节点与从节点进行同步操作时的超时时间，单位为tick值的倍数。即10ms
# the directory where the snapshot is stored.
# do not use /tmp for storage, /tmp here is just 
# example sakes.
dataDir=/data/zookeeper
# the port at which the clients will connect
clientPort=2181  ##客户端链接端口
# the maximum number of client connections.
# increase this if you need to handle more clients
maxClientCnxns=60 ##客户端最大链接数
#
# Be sure to read the maintenance section of the 
# administrator guide before turning on autopurge.
#
# http://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_maintenance
#
# The number of snapshots to retain in dataDir
#autopurge.snapRetainCount=3
# Purge task interval in hours
# Set to "0" to disable auto purge feature
#autopurge.purgeInterval=1
server.1=172.16.18.198:2888:3888  
server.2=172.16.18.199:2888:3888
server.3=172.16.18.200:2888:3888
```
4. 新建myid文件
在三台服务器的数据存放目录下新建myid文件，并写入对应的server.num 中的num数字
如：在172.16.18.198上将server.1中1写入myid
```
echo 1 >/data/zookeeper/myid
```
5. 添加环境变量，方便我们执行脚本命令
vi  etc/profile 在最后添加如下两个。
```
export ZOOKEEPER_HOME=/opt/zookeeper-3.4.9
export PATH=$PATH:$ZOOKEEPER_HOME/bin:$ZOOKEEPER_HOME/conf
```
保存后重新加载一下：
```
source /etc/profile
```
6. 修改日志存放目录（可选）
vi /opt/zookeeper/bin/zkEnv.sh 找到ZOO_LOG_DIR 和 ZOO_LOG4J_PROP位置
```
if [ "x${ZOO_LOG_DIR}" = "x" ] 
then 
    #配置zookeeper日志输出存放路径 
    ZOO_LOG_DIR="/var/applog/zookeeper" 
fi 

if [ "x${ZOO_LOG4J_PROP}" = "x" ] 
then 
    #配置日志输出级别,这里把几个级别一并配上 
    ZOO_LOG4J_PROP="INFO,CONSOLE,ROLLINGFILE,TRACEFILE" 
fi
```
编辑conf目录下log4j.properties
```
# Define some default values that can be overridden by system properties 
zookeeper.root.logger=INFO, CONSOLE, ROLLINGFILE, TRACEFILE 
zookeeper.console.threshold=INFO 
zookeeper.log.dir=. 
zookeeper.log.file=zookeeper.log 
zookeeper.log.threshold=ERROR 
zookeeper.tracelog.dir=. 
zookeeper.tracelog.file=zookeeper_trace.log 
log4j.rootLogger=${zookeeper.root.logger}
```
完成log的日志目录的修改。
7.启动zookeeper服务

zkServer.sh start来启动。

zkServer.sh restart　　(重启)

zkServer.sh status　　(查看状态)

zkServer.sh stop　　(关闭)

zkServer.sh start-foreground　　(以打印日志方式启动)
三台服务器分别执行：
```
zkServer.sh start
```
然后用 status 检查下状态 如果出现 Mode：leader 或者Mode:follower 表示搭建成功。否则前台执行看一下日志。
```
$ zkServer.sh status
ZooKeeper JMX enabled by default
Using config: /opt/zookeeper-3.4.10/bin/../conf/zoo.cfg
Mode: follower
```
如出现：
```
2019-04-29 14:04:05,992 [myid:3] - INFO  [ListenerThread:QuorumCnxManager$Listener@739] - My election bind port: /172.16.18.200:3888
2019-04-29 14:04:06,019 [myid:3] - INFO  [QuorumPeer[myid=3]/0:0:0:0:0:0:0:0:2181:QuorumPeer@865] - LOOKING
2019-04-29 14:04:06,025 [myid:3] - INFO  [QuorumPeer[myid=3]/0:0:0:0:0:0:0:0:2181:FastLeaderElection@818] - New election. My id =  3, proposed zxid=0x0
2019-04-29 14:04:06,056 [myid:3] - WARN  [WorkerSender[myid=3]:QuorumCnxManager@588] - Cannot open channel to 1 at election address /172.16.18.198:3888
java.net.NoRouteToHostException: 没有到主机的路由
        at java.net.PlainSocketImpl.socketConnect(Native Method)
        at java.net.AbstractPlainSocketImpl.doConnect(AbstractPlainSocketImpl.java:345)
        at java.net.AbstractPlainSocketImpl.connectToAddress(AbstractPlainSocketImpl.java:206)
        at java.net.AbstractPlainSocketImpl.connect(AbstractPlainSocketImpl.java:188)
"zookeeper.log" 303L, 35429C

```
报这种异常一般有三种情况：

1）：zoo.cfg配置文件中，server.x:2888:3888配置出现错误；

2）：myid文件内容和server.x不对应，或者myid不在data目录下；

3）：系统防火墙是否在启动。

我检查了三种原因后发现是防火墙running。

centos7下查看防火墙状态的命令：
```
firewall-cmd --state
```
关闭防火墙的命令：
```
systemctl stop firewalld.service
systemctl disable firewalld.service   （禁止开机启动，永久关闭防火墙）
```
关闭防火墙后重启即可。
8. 验证是否成功
在命令行中输入：zkCli.sh -server 172.16.18.198:2181（由于本人在不同的办公地点在修改该文章，所以ip地址也在变化，知道原理即可）即可连接到其中一台ZooKeeper服务器。其他自动实现同步，客户端只需要和一台保持连接即可。出现如下表示链接成功
```
WATCHER::

WatchedEvent state:SyncConnected type:None path:null
[zk: 172.16.18.198:2181(CONNECTED) 0] 

```