---
title: kafka基本介绍
categories:
  - 消息队列
tags:
  - kafka
  - linux
toc: true
comment: true
translate_title: kafka-basic-introduction
date: 2019-04-29 10:56:51
---
# kafka是什么？
Kafka是一个分布式流式存储并处理的消息队列。由scale+java语言编写，它提供了类似于JMS的特性，但是在设计实现上又完全不同，因为kafka并不是按照JMS规范实现的。kafka集群由多个broke（Kafka实例称之为broke）组成，在集群里，kafka通过消息订阅和发布将消息以topic的形式发布出来，同时，消息也是存储在topic中的，消息的发送者成为producer，消息接受者成为Consummer。
同时，topic 是根据分区partitions，和副本replications来实现的数据的分布式存储，和加强数据的可靠性。

![官方图片](http://kafka.apache.org/22/images/kafka-apis.png)
# 何为topic？
一个topic可以认为是一类消息，每个topic将被分成多个partitions，每个partition在存储append log的形式存在文件里的。任何发布到partition的消息都会直接被追加到log文件的末尾，每条消息在文件中的位置称之为offset偏移量，offset为一个long型数字，它唯一标识一条消息，kafka并没有提供其他索引来存储offset，因此kafka不支持消息的随机读写。
![分区结构图](http://kafka.apache.org/22/images/log_anatomy.png)

kafka和JMS（Java Message Service）实现(activeMQ)不同的是:即使消息被消费,消息仍然不会被立即删除.日志文件将会根据broker中的配置要求,保留一定的时间之后(默认是7天)删除;比如log文件保留2天,那么两天后,文件会被清除,无论其中的消息是否被消费.kafka通过这种简单的手段,来释放磁盘空间,以及减少消息消费之后对文件内容改动的磁盘IO开支.

# kafka消息如何消费的？
对于consumer而言,它需要保存消费消息的offset,对于offset的保存和使用,有consumer来控制;当consumer正常消费消息时,offset将会"线性"的向前驱动,即消息将依次顺序被消费.事实上consumer可以使用任意顺序消费消息,它只需要将offset重置为任意值..(kafka 老版本中offset将会保存在zookeeper中,1.x之后也会存储在broke集群里,参见下文)

# kafka 集群里consumer和producer的状态信息是如何保存的？
kafka集群几乎不需要维护任何consumer和producer状态信息,这些信息由zookeeper保存;因此producer和consumer的客户端实现非常轻量级,它们可以随意离开,而不会对集群造成额外的影响.

# kafka为何要引入分区的概念，有何好处？
partitions的设计目的有多个.最根本原因是kafka基于文件存储.通过分区,可以将日志内容分散到多个kafka实例上,来避免文件尺寸达到单机磁盘的上限,每个partiton都会被当前server(kafka实例)保存;可以将一个topic切分多任意多个partitions,来消息保存/消费的效率.此外越多的partitions意味着可以容纳更多的consumer,有效提升并发消费的能力.有负载均衡的功效(具体原理参见下文).

# kakfa数据是如何写入到磁盘的？
一个Topic的多个partitions,被分布在kafka集群中的多个server上;每个server(kafka实例)负责partitions中消息的读写操作;此外kafka还可以配置partitions需要备份的个数(replicas),每个partition将会被备份到多台机器上,以提高可用性.

基于replicated方案,那么就意味着需要对多个备份进行调度;每个partition都有一个server为"leader";leader负责所有的读写操作,如果leader失效,那么将会有其他follower来接管(成为新的leader);follower只是单调的和leader跟进,同步消息即可..由此可见作为leader的server承载了全部的请求压力,因此从集群的整体考虑,有多少个partitions就意味着有多少个"leader",kafka会将"leader"均衡的分散在每个实例上,来确保整体的性能稳定.这和zookeeper的follower是有区别的：zookeeper的follower是可以读到数据的，而kafka的follower是读不到数据的。

kafka使用文件存储消息,这就直接决定kafka在性能上严重依赖文件系统的本身特性.且无论任何OS下,对文件系统本身的优化几乎没有可能.文件缓存/直接内存映射等是常用的手段.因为kafka是对日志文件进行append操作,因此磁盘检索的开支是较小的;同时为了减少磁盘写入的次数,broker会将消息暂时buffer起来,当消息的个数(或尺寸)达到一定阀值时,再flush到磁盘,这样减少了磁盘IO调用的次数.

# kafka中消费者组如何理解？
Producer将消息发布到指定的Topic中,同时Producer也能决定将此消息归属于哪个partition;比如基于"round-robin"方式或者通过其他的一些算法等.
 
本质上kafka只支持Topic.每个consumer属于一个consumer group;反过来说,每个group中可以有多个consumer.发送到Topic的消息,只会被订阅此Topic的每个group中的一个consumer消费.

如果所有的consumer都具有相同的group,这种情况和queue模式很像;消息将会在consumers之间负载均衡.
如果所有的consumer都具有不同的group,那这就是"发布-订阅";消息将会广播给所有的消费者.

在kafka中,一个partition中的消息只会被group中的一个consumer消费;每个group中consumer消息消费互相独立;我们可以认为一个group是一个"订阅"者,一个Topic中的每个partions,只会被一个"订阅者"中的一个consumer消费,不过一个consumer可以消费多个partitions中的消息.kafka只能保证一个partition中的消息被某个consumer消费时,消息是顺序的.事实上,从Topic角度来说,消息仍不是有序的. 因为消费者消费消息的时候是按照分区依次读取的，所以无法保证消息的全局顺序性，只能保证在同一个分区内的消息是顺序的。如果想要所有的消息都是顺序的，可以把分区数设置为1.
# kafka中如何保证数据一段时间内不丢失？
kafka 的producer有ACK机制。可以由用户自行设定是否开启确认机制，如果开启确认机制，kafka会等发送消息到kafka集群时，当leader服务器，会返回元数据给producer客户端，ACK机制也在元数据里，这里的ACK有两种，一种就是leader只要接收成功，就返回确认，另外一种就是：要等所有follower都收到了之后才返回确认。producer在接收到确认之后，才会发下一条消息。而所有的消息最终都是存储在磁盘一段时间的，所以一段时间内消息是不会丢失的。

# kafka 的应用场景主要有哪些？
官方介绍是讲可以用作message queue，数据采集，简单流式计算等。

# 用作消息队列message queue有哪些优缺点？
对于一些常规的消息系统,kafka是个不错的选择;partitons/replication和容错,可以使kafka具有良好的扩展性和性能优势.不过到目前为止,我们应该很清楚认识到,kafka并没有提供JMS中的"事务性""消息传输担保(消息确认机制)""消息分组"等企业级特性;kafka只能使用作为"常规"的消息系统,在一定程度上,尚未确保消息的发送与接收绝对可靠(比如,消息重发,消息发送丢失等)

# kafka是如何保持高性能的？
需要考虑的影响性能点很多,除磁盘IO之外,我们还需要考虑网络IO,这直接关系到kafka的吞吐量问题.kafka并没有提供太多高超的技巧;对于producer端,可以将消息buffer起来,当消息的条数达到一定阀值时,批量发送给broker;对于consumer端也是一样,批量fetch多条消息.不过消息量的大小可以通过配置文件来指定.对于kafka broker端,似乎有个sendfile系统调用可以潜在的提升网络IO的性能:将文件的数据映射到系统内存中,socket直接读取相应的内存区域即可,而无需进程再次copy和交换. 其实对于producer/consumer/broker三者而言,CPU的开支应该都不大,因此启用消息压缩机制是一个良好的策略;压缩需要消耗少量的CPU资源,不过对于kafka而言,网络IO更应该需要考虑.可以将任何在网络上传输的消息都经过压缩.kafka支持gzip/snappy等多种压缩方式.

# kafka在消费者端有哪些异常处理策略？
对于JMS实现,消息传输担保非常直接:有且只有一次(exactly once).在kafka中稍有不同:
1) at most once: 最多一次,这个和JMS中"非持久化"消息类似.发送一次,无论成败,将不会重发.
2) at least once: 消息至少发送一次,如果消息未能接受成功,可能会重发,直到接收成功.
3) exactly once: 消息只会发送一次.
at most once: 消费者fetch消息,然后保存offset,然后处理消息;当client保存offset之后,但是在消息处理过程中出现了异常,导致部分消息未能继续处理.那么此后"未处理"的消息将不能被fetch到,这就是"at most once".
at least once: 消费者fetch消息,然后处理消息,然后保存offset.如果消息处理成功之后,但是在保存offset阶段zookeeper异常导致保存操作未能执行成功,这就导致接下来再次fetch时可能获得上次已经处理过的消息,这就是"at least once"，原因offset没有及时的提交给zookeeper，zookeeper恢复正常还是之前offset状态.

exactly once: kafka中并没有严格的去实现基于2阶段提交,事务),我们认为这种策略在kafka中是没有必要的.
通常情况下"at-least-once"是我们搜选.(相比at most once而言,重复接收数据总比丢失数据要好).
# kafka 工作流程是怎样的？
1. 主要结构图：大体可以从三个方面分析：生产者产生消息、消费者消费消息、Broker cluster保存消息。
![结构图](https://www.github.com/liuyong520/pic/raw/master/小书匠/attachments_1556770670858.drawio.png)
1. 生产者产生消息过程分析
  - 写入方式：
    producer 采用push的方式将消息发送到broker cluster，每条消息都被追加到分区中，属于顺序写磁盘（顺序写磁盘效率比随机写内存效率要高，能提高Kafka吞吐率）
    而且broker集群并不是每一条消息都及时写磁盘，而是先写buffer，达到一定大小或者每隔一段时间再flush到磁盘上。
    多个producer可以给同一个topic 发布消息，而且可以指定分区发布。
  - 分区Partition
    每个Topic可以有多个分区，而消息最终是存储在磁盘的文件里的，Partition在磁盘上是文件夹的形式存在的。如
```
cd /var/applog/kafka/ ## 赚到kafka数据目录 即log.dir=配置的目录
ls
cleaner-offset-checkpoint  __consumer_offsets-22  __consumer_offsets-4   log-start-offset-checkpoint  recovery-point-offset-checkpoint
__consumer_offsets-1       __consumer_offsets-25  __consumer_offsets-40  meta.properties              replication-offset-checkpoint
__consumer_offsets-10      __consumer_offsets-28  __consumer_offsets-43  mytest-0                     test-0
__consumer_offsets-13      __consumer_offsets-31  __consumer_offsets-46  mytest-1
__consumer_offsets-16      __consumer_offsets-34  __consumer_offsets-49  mytest-2
__consumer_offsets-19      __consumer_offsets-37  __consumer_offsets-7   mytest-3

```
 其中mytest-0 mytest-1 mytest-2 mytest-3 即为分区Partition，里面的文件就是分区里面存放的数据。
  
2. broker cluster 保存消息
   broker 收到消息后，首先会去找topic对应分区的leader，找到leader后，先将数据写入buffer，再flush到磁盘。然后zookeeper会协调follower自动同步leader分区的数据，以达到replication备份的目的，同时leader会按照备份完成的先后顺序给follower作一次排序，作为leader发生意外时选举时选举为leader的顺序。
   ![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1556780993351.png)
3. 消费者消费消息
   1. 消费者消费消息，同一个分区里的数据不能够被一个消费组里面的多个消费者同时消费，同一个消费组里的消费者只能消费不同分区的数据。
   2. 不同消费者组可以消费同一个分区里的数据。
   3. 消费者消费数据时是按照分区的一个一个分区数据进行消费的。   
# zookeeper在kafka中的具体作用是什么？
kafka是依赖于zookeeper注册中心的，主要来协调各个broker的分区备份，broker的选举，以及消费者相关状信息的存储。
kafka使用zookeeper来存储一些meta信息,并使用了zookeeper watch机制来发现meta信息的变更并作出相应的动作(比如consumer失效,触发负载均衡等)
1) Broker node registry: 当一个kafkabroker启动后,首先会向zookeeper注册自己的节点信息(临时znode),同时当broker和zookeeper断开连接时,此znode也会被删除.
格式: /broker/ids/[0...N]   -->host:port;其中[0..N]表示broker id,每个broker的配置文件中都需要指定一个数字类型的id(全局不可重复),znode的值为此broker的host:port信息.
```
$ zkCli -server k8s-n1:2181
$ ls /brokers
[ids, topics, seqid]
$ ls /brokers/ids
[0, 1, 2]
$ get /brokers/ids/0
{"listener_security_protocol_map":{"PLAINTEXT":"PLAINTEXT"},"endpoints":["PLAINTEXT://k8s-n1:9092"],"jmx_port":-1,"host":"k8s-n1","timestamp":"1556568752340","port":9092,"version":4}
cZxid = 0xd0000003c
ctime = Wed Apr 24 16:10:19 CST 2019
mZxid = 0xd0000003c
mtime = Wed Apr 24 16:10:19 CST 2019
pZxid = 0xd0000003c
cversion = 0
dataVersion = 1
aclVersion = 0
ephemeralOwner = 0x26a4e173fc40002
dataLength = 182
numChildren = 0
```

2) Broker Topic Registry: 当一个broker启动时,会向zookeeper注册自己持有的topic和partitions信息,仍然是一个临时znode.
格式: /broker/topics/[topic]/[0...N]  其中[0..N]表示partition索引号.
```
$ ls /brokers/topics
[test, __consumer_offsets]

```
__consumer_offsets 是消费端的offset
```
$ ls /brokers/topics/test
[partitions] ##test的分区信息
$ ls /brokers/topics/test/partitions
[0]
$ ls /brokers/topics/test/partitions/0
[state]
$ get /brokers/topics/test/partitions/0/state   
{"controller_epoch":19,"leader":0,"version":1,"leader_epoch":3,"isr":[0]}
cZxid = 0x2000000b6
ctime = Wed Apr 24 07:53:42 CST 2019
mZxid = 0xd00000044
mtime = Wed Apr 24 16:10:19 CST 2019
pZxid = 0x2000000b6
cversion = 0
dataVersion = 3
aclVersion = 0
ephemeralOwner = 0x0
dataLength = 73
numChildren = 0

```
3) Consumer and Consumer group: 每个consumer客户端被创建时,会向zookeeper注册自己的信息;此作用主要是为了"负载均衡".
一个group中的多个consumer可以交错的消费一个topic的所有partitions;简而言之,保证此topic的所有partitions都能被此group所消费,且消费时为了性能考虑,让partition相对均衡的分散到每个consumer上.

4) Consumer id Registry: 每个consumer都有一个唯一的ID(host:uuid,可以通过配置文件指定,也可以由系统生成),此id用来标记消费者信息.
格式:/consumers/[group_id]/ids/[consumer_id]
仍然是一个临时的znode,此节点的值为{"topic_name":#streams...},即表示此consumer目前所消费的topic + partitions列表.
启动消费者：
```
$  kafka-console-consumer.sh --bootstrap-server k8s-n2:9092 --topic test

```
启动生成者：
```
kafka-console-producer.sh --broker-list k8s-n1:9092 --topic test
```
查看zookeeper信息：
```
$ ls /
[cluster, controller_epoch, controller, brokers, zookeeper, admin, isr_change_notification, consumers, log_dir_event_notification, latest_producer_id_block, config]
$ ls /consumers
[]
```
发现consummer下啥也没有？这是因为新版本的kafka，consumer中offset不是放在这个位置的，而是放在__consumer_offset 这个topic下的。那么该如何验证呢？
启动消费者：
```
$  kafka-console-consumer.sh --bootstrap-server k8s-n2:9092 --topic test

```
启动生成者：
```
kafka-console-producer.sh --broker-list k8s-n1:9092 --topic test
```
验证消息生产成功
```
kafka-run-class.sh kafka.tools.GetOffsetShell --broker-list k8s-n1:9092 --topic mytest --time -1
mytest:0:15
mytest:1:16
mytest:2:16
mytest:3:15
```
mytest topic 上 0号分区有15条消息。很好理解。
再创建一个消费者组
```
kafka-console-consumer.sh --bootstrap-server k8s-n1:9092 --topic mytest --from-beginning
```
查询一下消费者组信息
```
kafka-consumer-groups.sh --bootstrap-server k8s-n1:9092 --list
console-consumer-24766
console-consumer-52794
```
查询一下topic里的内容：
```
kafka-console-consumer.sh --topic __consumer_offsets --bootstrap-server k8s-n1:9092 --formatter "kafka.coordinator.group.GroupMetadataManager\$OffsetsMessageFormatter" --consumer.config config/consumer.properties --from-beginning

```
 结果：
 ```
 [console-consumer-52794,__consumer_offsets,12]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,45]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,1]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,5]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,26]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,29]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,34]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,10]::OffsetAndMetadata(offset=0, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,32]::OffsetAndMetadata(offset=5, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
[console-consumer-52794,__consumer_offsets,40]::OffsetAndMetadata(offset=3, leaderEpoch=Optional.empty, metadata=, commitTimestamp=1556122524504, expireTimestamp=None)
^CProcessed a total of 1674 messages
 ```
 参考了 http://www.cnblogs.com/huxi2b/p/6061110.html这篇blog的作法，但是我的版本是kafka_2.2.0里面并没有找offset的命令。
 
5) Consumer offset Tracking: 用来跟踪每个consumer目前所消费的partition中最大的offset.
格式:/consumers/[group_id]/offsets/[topic]/[broker_id-partition_id]-->offset_value
此znode为持久节点,可以看出offset跟group_id有关,以表明当group中一个消费者失效,其他consumer可以继续消费.
6) Partition Owner registry: 用来标记partition被哪个consumer消费.临时znode
格式:/consumers/[group_id]/owners/[topic]/[broker_id-partition_id]-->consumer_node_id当consumer启动时,所触发的操作:
A) 首先进行"Consumer id Registry";
B) 然后在"Consumer id Registry"节点下注册一个watch用来监听当前group中其他consumer的"leave"和"join";只要此znode path下节点列表变更,都会触发此group下consumer的负载均衡.(比如一个consumer失效,那么其他consumer接管partitions).
C) 在"Broker id registry"节点下,注册一个watch用来监听broker的存活情况;如果broker列表变更,将会触发所有的groups下的consumer重新balance.
