---
title: storm 的分组策略深入理解（-）
date: 2019-05-11 20:10:40
tags:
  - storm
categories:
  - storm
comment: true
toc: true
---
# storm的分组策略
- 洗牌分组(Shuffle grouping): 随机分配元组到Bolt的某个任务上，这样保证同一个Bolt的每个任务都能够得到相同数量的元组。

- 字段分组(Fields grouping): 按照指定的分组字段来进行流的分组。例如，流是用字段“user-id"来分组的，那有着相同“user-id"的元组就会分到同一个任务里，但是有不同“user-id"的元组就会分到不同的任务里。这是一种非常重要的分组方式，通过这种流分组方式，我们就可以做到让Storm产出的消息在这个"user-id"级别是严格有序的，这对一些对时序敏感的应用(例如，计费系统)是非常重要的。

- Partial Key grouping: 跟字段分组一样，流也是用指定的分组字段进行分组的，但是在多个下游Bolt之间是有负载均衡的，这样当输入数据有倾斜时可以更好的利用资源。这篇论文很好的解释了这是如何工作的，有哪些优势。

- All grouping: 流会复制给Bolt的所有任务。小心使用这种分组方式。在拓扑中，如果希望某类元祖发送到所有的下游消费者，就可以使用这种All grouping的流分组策略。

- Global grouping: 整个流会分配给Bolt的一个任务。具体一点，会分配给有最小ID的任务。
不分组(None grouping): 说明不关心流是如何分组的。目前，None grouping等价于洗牌分组。

- Direct grouping：一种特殊的分组。对于这样分组的流，元组的生产者决定消费者的哪个任务会接收处理这个元组。只能在声明做直连的流(direct streams)上声明Direct groupings分组方式。只能通过使用emitDirect系列函数来吐元组给直连流。一个Bolt可以通过提供的TopologyContext来获得消费者的任务ID，也可以通过OutputCollector对象的emit函数(会返回元组被发送到的任务的ID)来跟踪消费者的任务ID。在ack的实现中，Spout有两个直连输入流，ack和ackFail，使用了这种直连分组的方式。

- Local or shuffle grouping：如果目标Bolt在同一个worker进程里有一个或多个任务，元组就会通过洗牌的方式分配到这些同一个进程内的任务里。否则，就跟普通的洗牌分组一样。这种方式的好处是可以提高拓扑的处理效率，因为worker内部通信就是进程内部通信了，相比拓扑间的进程间通信要高效的多。worker进程间通信是通过使用Netty来进行网络通信的。

# 根据实例来分析分组策略

## common配置：

```
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.sonly.strom</groupId>
    <artifactId>strom-study</artifactId>
    <version>1.0-SNAPSHOT</version>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <configuration>
                    <source>7</source>
                    <target>7</target>
                </configuration>
            </plugin>
            <plugin>
                <artifactId>maven-assembly-plugin</artifactId>
                <configuration>
                    <descriptorRefs>
                        <descriptorRef>jar-with-dependencies</descriptorRef>
                    </descriptorRefs>
                    <archive>
                        <manifest>
                            <mainClass>com.sonly.storm.demo1.HelloToplogy</mainClass>
                        </manifest>
                    </archive>
                </configuration>
                <executions>
                    <execution>
                        <id>make-assembly</id>
                        <phase>package</phase>
                        <goals>
                            <goal>single</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
    <dependencies>
        <dependency>
            <groupId>org.apache.storm</groupId>
            <artifactId>storm-core</artifactId>
            <version>1.2.2</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>
</project>
```
# Shuffle grouping

## shuffle grouping的实例代码

```java
package com.sonly.storm.demo1.grouppings.spout;

import org.apache.storm.spout.SpoutOutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichSpout;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * <b>package:com.sonly.storm.demo1</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-09 20:27</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class WordSpout extends BaseRichSpout {
    public static final Logger LOGGER = LoggerFactory.getLogger(WordSpout.class);
    //拓扑上下文
    private TopologyContext context;
    private SpoutOutputCollector collector;
    private Map config;
    private AtomicInteger atomicInteger = new AtomicInteger(0);

    public void open(Map conf, TopologyContext topologyContext, SpoutOutputCollector collector) {
        this.config = conf;
        this.context = topologyContext;
        this.collector = collector;
        LOGGER.warn("WordSpout->open:hashcode:{}->ThreadId:{},TaskId:{}", this.hashCode(), Thread.currentThread().getId(), context.getThisTaskId());
    }

    public void nextTuple() {
        String[] sentences = new String[]{"zhangsan","zhangsan","zhangsan","zhangsan","zhangsan","zhangsan","zhangsan","zhangsan","lisi","lisi"};
        int i = atomicInteger.get();
        if(i<10){
            atomicInteger.incrementAndGet();
            final String sentence = sentences[i];
            collector.emit(new Values(sentence));
            LOGGER.warn("WordSpout->nextTuple:hashcode:{}->ThreadId:{},TaskId:{},Values:{}", this.hashCode(), Thread.currentThread().getId(), context.getThisTaskId(), sentence);
        }
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("sentence"));
    }
}
```

bolt1
```java
package com.sonly.storm.demo1.grouppings;

import org.apache.storm.task.OutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichBolt;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Tuple;
import org.apache.storm.tuple.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * <b>package:com.sonly.storm.demo1</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-09 21:19</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class SheffleGroupingBolt extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(SheffleGroupingBolt.class);
    private TopologyContext context;
    private Map conf;
    private OutputCollector collector;
    private Map<String,Integer> counts = new HashMap(16);
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.conf=map;
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("SheffleGroupingBolt->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {

        String word = tuple.getString(0);
        LOGGER.warn("SheffleGroupingBolt->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),word);
        collector.emit(new Values(word));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("bolt1"));
    }
}

```
bolt
```java
package com.sonly.storm.demo1.grouppings;

import org.apache.storm.task.OutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichBolt;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Tuple;
import org.apache.storm.tuple.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

/**
 * <b>package:com.sonly.storm.demo1</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-09 21:29</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class SheffleGrouppingBolt1 extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(SheffleGrouppingBolt1.class);
    private TopologyContext context;
    private Map conf;
    private OutputCollector collector;
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.conf=map;
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("SheffleGrouppingBolt1->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {
        String word = tuple.getStringByField("sentence");
        LOGGER.warn("SheffleGroupingBolt1->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),word);
        collector.emit(new Values(word));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("bolt"));
    }
}

```
topology
```java
package com.sonly.storm.demo1.grouppings;

import com.sonly.storm.demo1.grouppings.spout.WordSpout;
import org.apache.storm.Config;
import org.apache.storm.LocalCluster;
import org.apache.storm.StormSubmitter;
import org.apache.storm.generated.AlreadyAliveException;
import org.apache.storm.generated.AuthorizationException;
import org.apache.storm.generated.InvalidTopologyException;
import org.apache.storm.topology.TopologyBuilder;
import org.apache.storm.tuple.Fields;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * <b>package:com.sonly.storm.demo1</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-09 21:55</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class ShuffleGroupingToplogy {
    public static final Logger LOGGER = LoggerFactory.getLogger(ShuffleGroupingToplogy.class);
    //Topology Name
    //component prefix
    //workers
    //spout executor (parallelism_hint)
    //spout task size
    //bolt executor (parallelism_hint)
    //bolt task size
    public static void main(String[] args) throws InterruptedException {
        TopologyBuilder builder = new TopologyBuilder();
        Config conf = new Config();
        conf.setDebug(true);
        if (args==null || args.length < 7) {
            conf.setNumWorkers(3);
            builder.setSpout("spout", new WordSpout(), 4).setNumTasks(4);

            builder.setBolt("split-bolt", new SheffleGrouppingBolt1(),  4).shuffleGrouping("spout").setNumTasks(8);
            builder.setBolt("count-bolt", new SheffleGroupingBolt(), 8).fieldsGrouping("split-bolt", new Fields("word")).setNumTasks(8);
            LocalCluster cluster = new LocalCluster();
            cluster.submitTopology("word-count", conf, builder.createTopology());

            Thread.sleep(10000);
            cluster.killTopology("word-count");
            cluster.shutdown();
        }
        else {
            Options options = Options.builder(args);
            LOGGER.warn("The Topology Options {} is Submited ",options.toString());
            conf.setNumWorkers(options.getWorkers());
            builder.setSpout(options.getPrefix()+"-spout", new WordSpout(), options.getSpoutParallelismHint()).setNumTasks(options.getSpoutTaskSize());

            builder.setBolt("bolt1", new SheffleGrouppingBolt1(),  options.getBoltParallelismHint()).shuffleGrouping(options.getPrefix()+"-spout").setNumTasks(options.getBoltTaskSize());
            builder.setBolt("bolt", new SheffleGroupingBolt(), options.getBoltParallelismHint()).shuffleGrouping(options.getPrefix()+"-spout").setNumTasks(options.getBoltTaskSize());
            try {
                StormSubmitter.submitTopologyWithProgressBar(options.getTopologyName(), conf, builder.createTopology());
                LOGGER.warn("===========================================================");
                LOGGER.warn("The Topology {} is Submited ",options.getTopologyName());
                LOGGER.warn("===========================================================");
            } catch (AlreadyAliveException | InvalidTopologyException | AuthorizationException e) {
                e.printStackTrace();
            }

        }
    }
    public static class Options{
        private String topologyName;
        private String prefix;
        private Integer workers;
        private Integer spoutParallelismHint;
        private Integer spoutTaskSize;
        private Integer boltParallelismHint;
        private Integer boltTaskSize;

        public Options(String topologyName, String prefix, Integer workers, Integer spoutParallelismHint, Integer spoutTaskSize, Integer boltParallelismHint, Integer boltTaskSize) {
            this.topologyName = topologyName;
            this.prefix = prefix;
            this.workers = workers;
            this.spoutParallelismHint = spoutParallelismHint;
            this.spoutTaskSize = spoutTaskSize;
            this.boltParallelismHint = boltParallelismHint;
            this.boltTaskSize = boltTaskSize;
        }
        public static Options builder(String[] args){
            return new Options(args[0],args[1],Integer.parseInt(args[2])
            ,Integer.parseInt(args[3]),Integer.parseInt(args[4]),Integer.parseInt(args[5]),Integer.parseInt(args[6])
            );
        }
        public String getTopologyName() {
            return topologyName;
        }

        public void setTopologyName(String topologyName) {
            this.topologyName = topologyName;
        }

        public String getPrefix() {
            return prefix;
        }

        public void setPrefix(String prefix) {
            this.prefix = prefix;
        }

        public Integer getWorkers() {
            return workers;
        }

        public void setWorkers(Integer workers) {
            this.workers = workers;
        }

        public Integer getSpoutParallelismHint() {
            return spoutParallelismHint;
        }

        public void setSpoutParallelismHint(Integer spoutParallelismHint) {
            this.spoutParallelismHint = spoutParallelismHint;
        }

        public Integer getSpoutTaskSize() {
            return spoutTaskSize;
        }

        public void setSpoutTaskSize(Integer spoutTaskSize) {
            this.spoutTaskSize = spoutTaskSize;
        }

        public Integer getBoltParallelismHint() {
            return boltParallelismHint;
        }

        public void setBoltParallelismHint(Integer boltParallelismHint) {
            this.boltParallelismHint = boltParallelismHint;
        }

        public Integer getBoltTaskSize() {
            return boltTaskSize;
        }

        public void setBoltTaskSize(Integer boltTaskSize) {
            this.boltTaskSize = boltTaskSize;
        }

        @Override
        public String toString() {
            return "Options{" +
                    "topologyName='" + topologyName + '\'' +
                    ", prefix='" + prefix + '\'' +
                    ", workers=" + workers +
                    ", spoutParallelismHint=" + spoutParallelismHint +
                    ", spoutTaskSize=" + spoutTaskSize +
                    ", boltParallelismHint=" + boltParallelismHint +
                    ", boltTaskSize=" + boltTaskSize +
                    '}';
        }
    }
}
```
mvn package 打包，上传到storm服务器

## ShuffleGrouping 样例分析

**1)样例1**

1.执行：
```
storm jar strom-study-1.0-SNAPSHOT-jar-with-dependencies.jar com.sonly.storm.demo1.grouppings.ShuffleGroupingToplogy ShuffleGrouping ShuffleGrouping 1 2 1 2 1
```
2.参数：

topologyName='ShuffleGrouping', prefix='ShuffleGrouping', workers=1, spoutParallelismHint=2, spoutTaskSize=1, boltParallelismHint=2, boltTaskSize=1
3.拓扑图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557542411480.png)
一个spout接了两个bolt
4.查看一下这个bolt分布情况：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557542590072.png)
5.进入服务器去看每一个bolt的日志
```
2019-05-07 18:09:13.109 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.110 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.110 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.111 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.112 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.115 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.116 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.117 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 18:09:13.118 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:lisi
2019-05-07 18:09:13.119 c.s.s.d.g.SheffleGrouppingBolt1 Thread-11-bolt1-executor[5 5] [WARN] SheffleGroupingBolt1->execute:hashcode:1393282516->ThreadId:45,TaskId:5,value:lisi

```
6.进入另外一个bolt的日志 10条信息被处理了
```
2019-05-07 18:09:00.791 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.793 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.794 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.795 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.795 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.796 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.797 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.805 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:zhangsan
2019-05-07 18:09:00.805 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:lisi
2019-05-07 18:09:00.806 c.s.s.d.g.SheffleGroupingBolt Thread-9-bolt-executor[4 4] [WARN] SheffleGroupingBolt->execute:hashcode:1430296959->ThreadId:43,TaskId:4,value:lisi
```
也是一样10条被处理了
**总结：**
**对于spout直接对接两个bolt，sheffgrouping 分组不会随机给两个bolt分配消息，而是全量发给两个BOlT**

**2）样例2**

1.修改一下参数看一下：
topologyName='ShuffleGrouping1', prefix='ShuffleGrouping1', workers=2, spoutParallelismHint=1, spoutTaskSize=2, boltParallelismHint=2, boltTaskSize=2
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557544178946.png)
总共4个bolt，两个spout，总共发送了40条消息，spout产生消息20条。transfer了40次。
看看4个bolt的消息分配的情况。
因为只有两个worker所以会有两个bolt在同一个work上，日志会打在一起，但是从名字可以可以区分开来，同样每个bolt都是10条。

2.修改拓扑结构为：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557547693509.png)
3.修改代码：
bolt
```java
 String word = tuple.getStringByField("bolt");
```
topoloy：
```java
 builder.setBolt("bolt1", new SheffleGrouppingBolt1(), 1).shuffleGrouping(options.getPrefix()+"-spout");
builder.setBolt("bolt", new SheffleGroupingBolt(), options.getBoltParallelismHint()).shuffleGrouping("bolt1").setNumTasks(options.getBoltTaskSize());
```

4.参数：
topologyName='ShuffleGrouping2', prefix='ShuffleGrouping2', workers=2, spoutParallelismHint=1, spoutTaskSize=1, boltParallelismHint=2, boltTaskSize=2
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557547737355.png)
5.查看日志：k8s-n2 这个节点只有bolt bolt1这个节点在k8s-n3上
```
[root@k8s-n2 6706]# grep "SheffleGroupingBolt->execute" worker.log |wc -l
3
[root@k8s-n2 6706]# grep "SheffleGroupingBolt1->execute" worker.log |wc -l
0
[root@k8s-n3 6706]#  grep "SheffleGroupingBolt->execute" worker.log |wc -l
7
[root@k8s-n3 6706]#  grep "SheffleGroupingBolt1->execute" worker.log |wc -l
10
```
可以看出来bolt1->bolt这条线上的数据被随机分配了一个三条一个两条。
**总结：**
**对于bolt 连接bolt的shuffingGrouping，消息是随机分配到多个bolt上面的** 

# Fields grouping

## Fields grouping 的实例

代码:
```java
public class FeildGroupingToplogy {
    public static final Logger LOGGER = LoggerFactory.getLogger(FeildGroupingToplogy.class);

    //Topology Name
    //component prefix
    //workers
    //spout executor (parallelism_hint)
    //spout task size
    //bolt executor (parallelism_hint)
    //bolt task size
    public static void main(String[] args) throws InterruptedException {
        TopologyBuilder builder = new TopologyBuilder();
        Config conf = new Config();
        conf.setDebug(true);

        Options options = Options.builder(args);
        LOGGER.warn("The Topology Options {} is Submited ", options.toString());
        conf.setNumWorkers(options.getWorkers());
        String spoutName = options.getPrefix() + "-spout";
        builder.setSpout(spoutName, new WordSpout(), options.getSpoutParallelismHint()).setNumTasks(options.getSpoutTaskSize());
         builder.setBolt(options.getPrefix() + "bolt1", new FieldGrouppingBolt1(), options.getBoltParallelismHint()).fieldsGrouping(spoutName, new Fields("sentence")).setNumTasks(options.getBoltTaskSize());
        builder.setBolt(options.getPrefix() + "bolt", new FieldGroupingBolt(), options.getBoltParallelismHint()).fieldsGrouping(spoutName, new Fields("sentence")).setNumTasks(options.getBoltTaskSize());
//            builder.setBolt("bolt1", new FieldGrouppingBolt1(), 1).shuffleGrouping(options.getPrefix()+"-spout");
//            builder.setBolt("bolt", new FieldGroupingBolt(), options.getBoltParallelismHint()).fieldsGrouping("bolt1",new Fields("bolt")).setNumTasks(options.getBoltTaskSize());
        try {
            StormSubmitter.submitTopologyWithProgressBar(options.getTopologyName(), conf, builder.createTopology());
            LOGGER.warn("===========================================================");
            LOGGER.warn("The Topology {} is Submited ", options.getTopologyName());
            LOGGER.warn("===========================================================");
        } catch (AlreadyAliveException | InvalidTopologyException | AuthorizationException e) {
            e.printStackTrace();
        }

    }

    public static class Options {
        private String topologyName;
        private String prefix;
        private Integer workers;
        private Integer spoutParallelismHint;
        private Integer spoutTaskSize;
        private Integer boltParallelismHint;
        private Integer boltTaskSize;

        public Options(String topologyName, String prefix, Integer workers, Integer spoutParallelismHint, Integer spoutTaskSize, Integer boltParallelismHint, Integer boltTaskSize) {
            this.topologyName = topologyName;
            this.prefix = prefix;
            this.workers = workers;
            this.spoutParallelismHint = spoutParallelismHint;
            this.spoutTaskSize = spoutTaskSize;
            this.boltParallelismHint = boltParallelismHint;
            this.boltTaskSize = boltTaskSize;
        }

        public static Options builder(String[] args) {
            return new Options(args[0], args[1], Integer.parseInt(args[2])
                    , Integer.parseInt(args[3]), Integer.parseInt(args[4]), Integer.parseInt(args[5]), Integer.parseInt(args[6])
            );
        }

        public String getTopologyName() {
            return topologyName;
        }

        public void setTopologyName(String topologyName) {
            this.topologyName = topologyName;
        }

        public String getPrefix() {
            return prefix;
        }

        public void setPrefix(String prefix) {
            this.prefix = prefix;
        }

        public Integer getWorkers() {
            return workers;
        }

        public void setWorkers(Integer workers) {
            this.workers = workers;
        }

        public Integer getSpoutParallelismHint() {
            return spoutParallelismHint;
        }

        public void setSpoutParallelismHint(Integer spoutParallelismHint) {
            this.spoutParallelismHint = spoutParallelismHint;
        }

        public Integer getSpoutTaskSize() {
            return spoutTaskSize;
        }

        public void setSpoutTaskSize(Integer spoutTaskSize) {
            this.spoutTaskSize = spoutTaskSize;
        }

        public Integer getBoltParallelismHint() {
            return boltParallelismHint;
        }

        public void setBoltParallelismHint(Integer boltParallelismHint) {
            this.boltParallelismHint = boltParallelismHint;
        }

        public Integer getBoltTaskSize() {
            return boltTaskSize;
        }

        public void setBoltTaskSize(Integer boltTaskSize) {
            this.boltTaskSize = boltTaskSize;
        }

        @Override
        public String toString() {
            return "Options{" +
                    "topologyName='" + topologyName + '\'' +
                    ", prefix='" + prefix + '\'' +
                    ", workers=" + workers +
                    ", spoutParallelismHint=" + spoutParallelismHint +
                    ", spoutTaskSize=" + spoutTaskSize +
                    ", boltParallelismHint=" + boltParallelismHint +
                    ", boltTaskSize=" + boltTaskSize +
                    '}';
        }
    }
}
```
```java
public class FieldGroupingBolt extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(FieldGroupingBolt.class);
    private TopologyContext context;
    private Map conf;
    private OutputCollector collector;
    private Map<String,Integer> counts = new HashMap(16);
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.conf=map;
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("FieldGroupingBolt->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {

        String word = tuple.getStringByField("bolt");
        LOGGER.warn("FieldGroupingBolt->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),word);
        collector.emit(new Values(word));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("bolt1"));
    }
}
```

```java
public class FieldGrouppingBolt1 extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(FieldGrouppingBolt1.class);
    private TopologyContext context;
    private OutputCollector collector;
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("FieldGrouppingBolt1->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {
        String word = tuple.getStringByField("sentence");
        LOGGER.warn("SheffleGroupingBolt1->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),word);
        collector.emit(new Values(word));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("bolt"));
    }
}
```
2.打包上传到服务器
3.执行：
```shell
storm jar strom-study-1.0-SNAPSHOT-jar-with-dependencies.jar com.sonly.storm.demo1.grouppings.fieldgrouping.FeildGroupingToplogy FieldGrouping1 FieldGrouping1 2 1 1 2 2
```
4.参数
topologyName='FieldGrouping1', prefix='FieldGrouping1', workers=2, spoutParallelismHint=1, spoutTaskSize=1, boltParallelismHint=2, boltTaskSize=2
5。拓扑图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557580946479.png)
6.并发度以及组件分布图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557581055667.png)
同样看图可以看到消息被发送了20次，但是被transfer40次。这是因为spout对bolt，对消息进行了复制，全量发送到了每个bolt，所以每个bolt都会有10条消息。
**总结：**
**和sheffleGrouping 一样，spout->bolt是全量广播发送，每个bolt都会spout的全量消息。**

**样例2**
1.修改拓扑的代码
```
public static void main(String[] args) throws InterruptedException {
        TopologyBuilder builder = new TopologyBuilder();
        Config conf = new Config();
        conf.setDebug(true);

        Options options = Options.builder(args);
        LOGGER.warn("The Topology Options {} is Submited ", options.toString());
        conf.setNumWorkers(options.getWorkers());
        String spoutName = options.getPrefix() + "-spout";
        builder.setSpout(spoutName, new WordSpout(), options.getSpoutParallelismHint()).setNumTasks(options.getSpoutTaskSize());
//        builder.setBolt(options.getPrefix() + "bolt1", new FieldGrouppingBolt1(), options.getBoltParallelismHint()).fieldsGrouping(spoutName, new Fields("sentence")).setNumTasks(options.getBoltTaskSize());
//        builder.setBolt(options.getPrefix() + "bolt", new FieldGroupingBolt(), options.getBoltParallelismHint()).fieldsGrouping(spoutName, new Fields("sentence")).setNumTasks(options.getBoltTaskSize());
            builder.setBolt("bolt1", new FieldGrouppingBolt1(), 1).fieldsGrouping(spoutName, new Fields("sentence"));
            builder.setBolt("bolt", new FieldGroupingBolt(), options.getBoltParallelismHint()).fieldsGrouping("bolt1",new Fields("bolt")).setNumTasks(options.getBoltTaskSize());
        try {
            StormSubmitter.submitTopologyWithProgressBar(options.getTopologyName(), conf, builder.createTopology());
            LOGGER.warn("===========================================================");
            LOGGER.warn("The Topology {} is Submited ", options.getTopologyName());
            LOGGER.warn("===========================================================");
        } catch (AlreadyAliveException | InvalidTopologyException | AuthorizationException e) {
            e.printStackTrace();
        }

    }
```
## FieldGrouping 样例分析

**1）样例1**

2.将上面代码打包上传服务器执行命令
```
 storm jar strom-study-1.0-SNAPSHOT-jar-with-dependencies.jar com.sonly.storm.demo1.grouppings.fieldgrouping.FeildGroupingToplogy FieldGrouping2 FieldGrouping2 2 1 1 2 2 
```
3.参数
topologyName='FieldGrouping2', prefix='FieldGrouping2', workers=2, spoutParallelismHint=1, spoutTaskSize=1, boltParallelismHint=2, boltTaskSize=
4.拓扑图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557583229548.png)
6.并发度以及组件分布图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557583288457.png)
7.根据分布情况检查各个work的日志查看消息的发送情况
k8s-n3节点上：
```
[root@k8s-n3 6701]# grep "SheffleGroupingBolt1->execute" worker.log|wc -l
10
[root@k8s-n3 6701]# grep "FieldGroupingBolt->execute" worker.log|wc -l
2
```
k8s-n2节点：
```
[root@k8s-n2 6701]# grep "SheffleGroupingBolt1->execute" worker.log|wc -l
0
[root@k8s-n2 6701]# grep "FieldGroupingBolt->execute" worker.log|wc -l
8
```
再看一下详情如何
k8s-n3：bolt1有10条消息应为bolt只有一个所以Fied分组是不会生效的。
```
[root@k8s-n3 6701]# grep "SheffleGroupingBolt1->execute" worker.log
2019-05-07 21:59:35.805 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.810 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.810 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.811 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.811 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.812 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.813 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.814 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:zhangsan
2019-05-07 21:59:35.815 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:lisi
2019-05-07 21:59:35.838 c.s.s.d.g.f.FieldGrouppingBolt1 Thread-7-bolt1-executor[6 6] [WARN] SheffleGroupingBolt1->execute:hashcode:107880849->ThreadId:41,TaskId:6,value:lisi
```
k8s-n3:bolt 有两个实例，按照field分组。里面有两条消息。都是lisi
```
[root@k8s-n3 6701]# grep "FieldGroupingBolt->execute" worker.log
2019-05-07 21:59:35.855 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[4 4] [WARN] FieldGroupingBolt->execute:hashcode:281792799->ThreadId:45,TaskId:4,value:lisi
2019-05-07 21:59:35.856 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[4 4] [WARN] FieldGroupingBolt->execute:hashcode:281792799->ThreadId:45,TaskId:4,value:lisi
```
k8s-n2: bolt 应该就是8条消息，验证一下
```
[root@k8s-n2 6701]# grep "FieldGroupingBolt->execute" worker.log
2019-05-07 21:59:48.315 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 21:59:48.317 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 21:59:48.317 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 21:59:48.318 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 21:59:48.318 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 21:59:48.319 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 21:59:48.319 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
2019-05-07 21:59:48.320 c.s.s.d.g.f.FieldGroupingBolt Thread-11-bolt-executor[5 5] [WARN] FieldGroupingBolt->execute:hashcode:1858735164->ThreadId:45,TaskId:5,value:zhangsan
```
**总结：**
**bolt->bolt节点时，feild分组会按照field字段的key值进行分组，key相同的会被分配到一个bolt里面。**
如果执行
```
storm jar strom-study-1.0-SNAPSHOT-jar-with-dependencies.jar com.sonly.storm.demo1.grouppings.fieldgrouping.FeildGroupingToplogy FieldGrouping3 FieldGrouping3 4 1 1 4 4 
```
bolt 的分配情况是什么样子？这个留给大家去思考一下。例子中按照field分组后只有两种数据，但是这两种数据要分配给4个bolt，那这个是怎么分配的？我将在下一篇博客里揭晓答案！

下一篇我会继续分析这个分组策略，我会把我在学习这个storm的时候当时的自己思考的一个过程展现给大家，如果有什么错误的，或者没有讲清楚的地方，欢迎大家给我留言，咱们可以一起交流讨论。



