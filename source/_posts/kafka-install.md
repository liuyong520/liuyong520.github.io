---
title: Linux下kafka集群搭建
date: 2019-04-29 10:56:51
categories:
  - 消息队列
tags:
  - kafka
  - linux
toc: true # 是否启用内容索引
comment: true
---
## 环境准备
1. zookeeper集群环境
kafka是依赖于zookeeper注册中心的一款分布式消息对列，所以需要有zookeeper单机或者集群环境。

2. 三台服务器：
```
172.16.18.198 k8s-n1
172.16.18.199 k8s-n2
172.16.18.200 k8s-n3
```

3. 下载kafka安装包

http://kafka.apache.org/downloads 中下载，目前最新版本的kafka已经到2.2.0,我这里之前下载的是kafka_2.11-2.2.0.tgz.

## 安装kafka集群
1. 上传压缩包到三台服务器解压缩到/opt/目录下
```
tar -zxvf kafka_2.11-2.2.0.tgz -C /opt/
ls -s kafka_2.11-2.2.0 kafka

```
2. 修改 server.properties
```
############################# Server Basics #############################

# The id of the broker. This must be set to a unique integer for each broker.
broker.id=0

############################# Socket Server Settings #############################

# The address the socket server listens on. It will get the value returned from 
# java.net.InetAddress.getCanonicalHostName() if not configured.
#   FORMAT:
#     listeners = listener_name://host_name:port
#   EXAMPLE:
#     listeners = PLAINTEXT://your.host.name:9092
listeners=PLAINTEXT://k8s-n1:9092

# Hostname and port the broker will advertise to producers and consumers. If not set, 
# it uses the value for "listeners" if configured.  Otherwise, it will use the value
# returned from java.net.InetAddress.getCanonicalHostName().
advertised.listeners=PLAINTEXT://k8s-n1:9092

# Maps listener names to security protocols, the default is for them to be the same. See the config documentation for more details
#listener.security.protocol.map=PLAINTEXT:PLAINTEXT,SSL:SSL,SASL_PLAINTEXT:SASL_PLAINTEXT,SASL_SSL:SASL_SSL

# The number of threads that the server uses for receiving requests from the network and sending responses to the network
num.network.threads=3

# The number of threads that the server uses for processing requests, which may include disk I/O
num.io.threads=8

# The send buffer (SO_SNDBUF) used by the socket server
socket.send.buffer.bytes=102400

# The receive buffer (SO_RCVBUF) used by the socket server
socket.receive.buffer.bytes=102400

# The maximum size of a request that the socket server will accept (protection against OOM)
socket.request.max.bytes=104857600


############################# Log Basics #############################

# A comma separated list of directories under which to store log files
log.dirs=/var/applog/kafka/

# The default number of log partitions per topic. More partitions allow greater
# parallelism for consumption, but this will also result in more files across
# the brokers.
num.partitions=5

# The number of threads per data directory to be used for log recovery at startup and flushing at shutdown.
# This value is recommended to be increased for installations with data dirs located in RAID array.
num.recovery.threads.per.data.dir=1

############################# Internal Topic Settings  #############################
# The replication factor for the group metadata internal topics "__consumer_offsets" and "__transaction_state"
# For anything other than development testing, a value greater than 1 is recommended for to ensure availability such as 3.
offsets.topic.replication.factor=1
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

############################# Log Flush Policy #############################

# Messages are immediately written to the filesystem but by default we only fsync() to sync
# the OS cache lazily. The following configurations control the flush of data to disk.
# There are a few important trade-offs here:
#    1. Durability: Unflushed data may be lost if you are not using replication.
#    2. Latency: Very large flush intervals may lead to latency spikes when the flush does occur as there will be a lot of data to flush.
#    3. Throughput: The flush is generally the most expensive operation, and a small flush interval may lead to excessive seeks.
# The settings below allow one to configure the flush policy to flush data after a period of time or
# every N messages (or both). This can be done globally and overridden on a per-topic basis.

# The number of messages to accept before forcing a flush of data to disk
log.flush.interval.messages=10000

# The maximum amount of time a message can sit in a log before we force a flush
log.flush.interval.ms=1000

############################# Log Retention Policy #############################

# The following configurations control the disposal of log segments. The policy can
# be set to delete segments after a period of time, or after a given size has accumulated.
# A segment will be deleted whenever *either* of these criteria are met. Deletion always happens
# from the end of the log.

# The minimum age of a log file to be eligible for deletion due to age
log.retention.hours=24

# A size-based retention policy for logs. Segments are pruned from the log unless the remaining
# segments drop below log.retention.bytes. Functions independently of log.retention.hours.
#log.retention.bytes=1073741824

# The maximum size of a log segment file. When this size is reached a new log segment will be created.
log.segment.bytes=1073741824

# The interval at which log segments are checked to see if they can be deleted according
# to the retention policies
log.retention.check.interval.ms=300000

############################# Zookeeper #############################

# Zookeeper connection string (see zookeeper docs for details).
# This is a comma separated host:port pairs, each corresponding to a zk
# server. e.g. "127.0.0.1:3000,127.0.0.1:3001,127.0.0.1:3002".
# You can also append an optional chroot string to the urls to specify the
# root directory for all kafka znodes.
zookeeper.connect=k8s-n1:2181,k8s-n2:2181,k8s-n3:2181

# Timeout in ms for connecting to zookeeper
zookeeper.connection.timeout.ms=6000


############################# Group Coordinator Settings #############################

# The following configuration specifies the time, in milliseconds, that the GroupCoordinator will delay the initial consumer rebalance.
# The rebalance will be further delayed by the value of group.initial.rebalance.delay.ms as new members join the group, up to a maximum of max.poll.interval.ms.
# The default value for this is 3 seconds.
# We override this to 0 here as it makes for a better out-of-the-box experience for development and testing.
# However, in production environments the default value of 3 seconds is more suitable as this will help to avoid unnecessary, and potentially expensive, rebalances during application startup.
group.initial.rebalance.delay.ms=0

delete.topic.enable=true
```
拷贝两份到k8s-n2,k8s-n3
```
[root@k8s-n2 config]# cat server.properties 
broker.id=1
listeners=PLAINTEXT://k8s-n2:9092
advertised.listeners=PLAINTEXT://k8s-n2:9092

[root@k8s-n3 config]# cat server.properties
broker.id=2
listeners=PLAINTEXT://k8s-n3:9092
advertised.listeners=PLAINTEXT://k8s-n3:9092
```
3. 添加环境变量 在/etc/profile 中添加

```
export ZOOKEEPER_HOME=/opt/kafka_2.11-2.2.0
export PATH=$PATH:$ZOOKEEPER_HOME/bin
```
source /etc/profile 重载生效

4. 启动kafka
```
kafka-server-start.sh config/server.properties &
```

### Zookeeper+Kafka集群测试
1. 创建topic:
```
kafka-topics.sh --create --zookeeper k8s-n1:2181, k8s-n2:2181, k8s-n3:2181 --replication-factor 3 --partitions 3 --topic test
```

2. 显示topic
```
kafka-topics.sh --describe --zookeeper k8s-n1:2181, k8s-n2:2181, k8s-n3:2181 --topic test
```
3. 列出topic
```
kafka-topics.sh --list --zookeeper k8s-n1:2181, k8s-n2:2181, k8s-n3:2181
test
```
创建 producer(生产者);
```
kafka-console-producer.sh --broker-list k8s-n1:9092 --topic test
hello
```
创建 consumer（消费者）
```
kafka-console-consumer.sh --bootstrap-server k8s-n1:9092 --topic test --from-beginning
hello
```
至此，kafka集群搭建就已经完成了。