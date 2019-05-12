---
title: storm 基本知识
date: 2019-05-02 22:00:40
tags:
  - storm
categories:
  - storm
comment: true
toc: true
---
# 引言
介绍storm之前，我先抛出这两个问题：
>1.实时计算需要解决些什么问题？
>2.storm作为实时计算到底有何优势？

# storm简介
官方介绍：
>Apache Storm is a free and open source distributed realtime computation system. Storm makes it easy to reliably process unbounded streams of data, doing for realtime processing what Hadoop did for batch processing. Storm is simple, can be used with any programming language, and is a lot of fun to use!
翻译：
>Apache Storm是一个免费的开源分布式实时计算系统。Storm可以轻松可靠地处理无限数据流，实时处理Hadoop为批处理所做的工作。storm很简单，可以与任何编程语言一起使用，并且使用起来很有趣！
    
简单的说就是：storm是一个分布式实时计算系统。
1.实时计算需要解决些什么问题？
伴随着信息科技的日新月异的发展，信息呈现出爆发式的膨胀，人们获取信息的渠道也更加多元化，获取信息的方式也更加便捷，对信息的实效性也越来越高，举个电商系统一个搜索的简单例子，当卖家发布一条宝贝信息时，买家在搜索的时候需要能够马上呈现出来，同时买家购买后，能够需要统计该商品的卖出的数量以及该商品总营业额，利润等等。而且可以根据最近的购买的记录，可以给用户推荐同类型的产品。诸如此类的都需要以大数据为基础的，通过离线或者实时计算，获取相关的信息，从而获得商机。

在Storm之前，进行实时处理是非常痛苦的事情: 需要维护一堆消息队列和消费者，他们构成了非常复杂的图结构。消费者进程从队列里取消息，处理完成后，去更新数据库，或者给其他队列发新消息。

这样进行实时处理是非常痛苦的。我们主要的时间都花在关注往哪里发消息，从哪里接收消息，消息如何序列化，真正的业务逻辑只占了源代码的一小部分。一个应用程序的逻辑运行在很多worker上，但这些worker需要各自单独部署，还需要部署消息队列。最大问题是系统很脆弱，而且不是容错的：需要自己保证消息队列和worker进程工作正常。
例如上面的例子，简单的统计数量，统计营业额，计算毛利润，根据购买记录，推荐相似商品等等，就是通过，开启多个工作线程，实时去扫表，或者是从消息对列中拿出数据，计算统计值，写入对应的表。
这种定时任务，往往数据处理也不够及时，实效性比较差。

2.实时计算系统要考虑哪些问题？
- 低延迟 处理消息一定要及时，延迟高就不叫实时了。
- 高性能 性能不高，那么就要浪费机器，这样浪费机器就是浪费资源
- 分布式 系统数据和来源可能有多个，处理数据结果也有可能作为基础数据给其他系统。如果你的系统应用单机就能搞定，那么不需要考虑这么复杂了，实时计算系统就是为了解决这种单机系统无法解决的问题的。
- 可扩展 伴随业务的的发展，我们的业务量，及计算量可能会越来越大，系统是要求可以扩展的，
- 容错性 这个是分布式系统的通用问题了，一个节点挂了，不能影响到整个系统。
3.storm的优势
- 简单的编程模型。类似于MapReduce降低了批处理的复杂性，storm降低了进行实时处理的复杂性
- 服务化，一个服务框架，支持热部署，即时上线或者下线app
- 支持多种语言，你可以在storm之上使用各种编程语言，默认支持的有clojure,java,ruby,python
- 容错性，storm会管理工作进程和节点故障
- 水平扩展性，计算是在多个系统、进程、服务器之间进行的。可以水平扩展机器，进程，或者线程等。
- 可靠的消息处理 storm 能够保证消息至少能够得到一次完整的消息处理。任务失败时，它会负责从消息源头重新处理。
- 快速 系统的设计保证消息的快速处理，低版本的storm使用的zeroMQ作为内部消息系统。高版本中使用netty完全替代了ZeroMQ作为内部消息系统
- 本地模式 storm 又一个本地模式，能够模拟集群，使我们的开发测试变得更加简单。
# storm的基本概念
1. 拓扑(Topologies)
实时应用程序的逻辑被打包到Storm拓扑中。Storm拓扑类似于MapReduce作业。一个关键的区别是MapReduce作业最终完成，而拓扑结构永远运行（当然，直到你杀死它）。个拓扑是一个通过流分组(stream grouping)把Spout和Bolt连接到一起的拓扑结构。图的每条边代表一个Bolt订阅了其他Spout或者Bolt的输出流。一个拓扑就是一个复杂的多阶段的流计算。

2. 元组(Tuple)
元组是Storm提供的一个轻量级的数据格式，可以用来包装你需要实际处理的数据。元组是一次消息传递的基本单元。一个元组是一个命名的值列表，其中的每个值都可以是任意类型的。元组是动态地进行类型转化的--字段的类型不需要事先声明。在Storm中编程时，就是在操作和转换由元组组成的流。通常，元组包含整数，字节，字符串，浮点数，布尔值和字节数组等类型。要想在元组中使用自定义类型，就需要实现自己的序列化方式。

3. 流(Streams)
流是Storm中的核心抽象。一个流由无限的元组序列组成，这些元组会被分布式并行地创建和处理。通过流中元组包含的字段名称来定义这个流。
每个流声明时都被赋予了一个ID。只有一个流的Spout和Bolt非常常见，所以OutputFieldsDeclarer提供了不需要指定ID来声明一个流的函数(Spout和Bolt都需要声明输出的流)。这种情况下，流的ID是默认的“default”。

4. Spouts(喷嘴)
Spout(喷嘴，这个名字很形象)是Storm中流的来源。通常Spout从外部数据源，如消息队列中读取元组数据并吐到拓扑里。Spout可以是可靠的(reliable)或者不可靠(unreliable)的。可靠的Spout能够在一个元组被Storm处理失败时重新进行处理，而非可靠的Spout只是吐数据到拓扑里，不关心处理成功还是失败了。

Spout可以一次给多个流吐数据。此时需要通过OutputFieldsDeclarer的declareStream函数来声明多个流并在调用SpoutOutputCollector提供的emit方法时指定元组吐给哪个流。

Spout中最主要的函数是nextTuple，Storm框架会不断调用它去做元组的轮询。如果没有新的元组过来，就直接返回，否则把新元组吐到拓扑里。nextTuple必须是非阻塞的，因为Storm在同一个线程里执行Spout的函数。

Spout中另外两个主要的函数是ack和fail。当Storm检测到一个从Spout吐出的元组在拓扑中成功处理完时调用ack,没有成功处理完时调用fail。只有可靠型的Spout会调用ack和fail函数。

5. Bolts
在拓扑中所有的计算逻辑都是在Bolt中实现的。一个Bolt可以处理任意数量的输入流，产生任意数量新的输出流。Bolt可以做函数处理，过滤，流的合并，聚合，存储到数据库等操作。Bolt就是流水线上的一个处理单元，把数据的计算处理过程合理的拆分到多个Bolt、合理设置Bolt的task数量，能够提高Bolt的处理能力，提升流水线的并发度。

Bolt可以给多个流吐出元组数据。此时需要使用OutputFieldsDeclarer的declareStream方法来声明多个流并在使用[OutputColletor](https://storm.apache.org/javadoc/apidocs/backtype/storm/task/OutputCollector.html)的emit方法时指定给哪个流吐数据。

当你声明了一个Bolt的输入流，也就订阅了另外一个组件的某个特定的输出流。如果希望订阅另一个组件的所有流，需要单独挨个订阅。InputDeclarer有语法糖来订阅ID为默认值的流。例如declarer.shuffleGrouping("redBolt")订阅了redBolt组件上的默认流，跟declarer.shuffleGrouping("redBolt", DEFAULT_STREAM_ID)是相同的。

在Bolt中最主要的函数是execute函数，它使用一个新的元组当作输入。Bolt使用OutputCollector对象来吐出新的元组。Bolts必须为处理的每个元组调用OutputCollector的ack方法以便于Storm知道元组什么时候被各个Bolt处理完了（最终就可以确认Spout吐出的某个元组处理完了）。通常处理一个输入的元组时，会基于这个元组吐出零个或者多个元组，然后确认(ack)输入的元组处理完了，Storm提供了IBasicBolt接口来自动完成确认。

必须注意OutputCollector不是线程安全的，所以所有的吐数据(emit)、确认(ack)、通知失败(fail)必须发生在同一个线程里

6. 任务(Tasks)
每个Spout和Bolt会以多个任务(Task)的形式在集群上运行。每个任务对应一个执行线程，流分组定义了如何从一组任务(同一个Bolt)发送元组到另外一组任务(另外一个Bolt)上。可以在调用TopologyBuilder的setSpout和setBolt函数时设置每个Spout和Bolt的并发数。

7. 组件(Component)
组件(component)是对Bolt和Spout的统称

8. 流分组(Stream groupings)
定义拓扑的时候，一部分工作是指定每个Bolt应该消费哪些流。流分组定义了一个流在一个消费它的Bolt内的多个任务(task)之间如何分组。流分组跟计算机网络中的路由功能是类似的，决定了每个元组在拓扑中的处理路线。

在Storm中有七个内置的流分组策略，你也可以通过实现CustomStreamGrouping接口来自定义一个流分组策略:

- 洗牌分组(Shuffle grouping): 随机分配元组到Bolt的某个任务上，这样保证同一个Bolt的每个任务都能够得到相同数量的元组。
- 字段分组(Fields grouping): 按照指定的分组字段来进行流的分组。例如，流是用字段“user-id"来分组的，那有着相同“user-id"的元组就会分到同一个任务里，但是有不同“user-id"的元组就会分到不同的任务里。这是一种非常重要的分组方式，通过这种流分组方式，我们就可以做到让Storm产出的消息在这个"user-id"级别是严格有序的，这对一些对时序敏感的应用(例如，计费系统)是非常重要的。
- Partial Key grouping: 跟字段分组一样，流也是用指定的分组字段进行分组的，但是在多个下游Bolt之间是有负载均衡的，这样当输入数据有倾斜时可以更好的利用资源。这篇论文很好的解释了这是如何工作的，有哪些优势。
- All grouping: 流会复制给Bolt的所有任务。小心使用这种分组方式。在拓扑中，如果希望某类元祖发送到所有的下游消费者，就可以使用这种All grouping的流分组策略。
- Global grouping: 整个流会分配给Bolt的一个任务。具体一点，会分配给有最小ID的任务。
不分组(None grouping): 说明不关心流是如何分组的。目前，None grouping等价于洗牌分组。
- Direct grouping：一种特殊的分组。对于这样分组的流，元组的生产者决定消费者的哪个任务会接收处理这个元组。只能在声明做直连的流(direct streams)上声明Direct groupings分组方式。只能通过使用emitDirect系列函数来吐元组给直连流。一个Bolt可以通过提供的TopologyContext来获得消费者的任务ID，也可以通过OutputCollector对象的emit函数(会返回元组被发送到的任务的ID)来跟踪消费者的任务ID。在ack的实现中，Spout有两个直连输入流，ack和ackFail，使用了这种直连分组的方式。
- Local or shuffle grouping：如果目标Bolt在同一个worker进程里有一个或多个任务，元组就会通过洗牌的方式分配到这些同一个进程内的任务里。否则，就跟普通的洗牌分组一样。这种方式的好处是可以提高拓扑的处理效率，因为worker内部通信就是进程内部通信了，相比拓扑间的进程间通信要高效的多。worker进程间通信是通过使用Netty来进行网络通信的。

9. 可靠性(Reliability)
Storm保证了拓扑中Spout产生的每个元组都会被处理。Storm是通过跟踪每个Spout所产生的所有元组构成的树形结构并得知这棵树何时被完整地处理来达到可靠性。每个拓扑对这些树形结构都有一个关联的“消息超时”。如果在这个超时时间里Storm检测到Spout产生的一个元组没有被成功处理完，那Sput的这个元组就处理失败了，后续会重新处理一遍。

为了发挥Storm的可靠性，需要你在创建一个元组树中的一条边时告诉Storm，也需要在处理完每个元组之后告诉Storm。这些都是通过Bolt吐元组数据用的OutputCollector对象来完成的。标记是在emit函数里完成，完成一个元组后需要使用ack函数来告诉Storm。

10. Workers(工作进程)
拓扑以一个或多个Worker进程的方式运行。每个Worker进程是一个物理的Java虚拟机，执行拓扑的一部分任务。例如，如果拓扑的并发设置成了300，分配了50个Worker，那么每个Worker执行6个任务(作为Worker内部的线程）。Storm会尽量把所有的任务均分到所有的Worker上。

# storm的工作流程
Storm实现了一个数据流(data flow)的模型，在这个模型中数据持续不断地流经一个由很多转换实体构成的网络。一个数据流的抽象叫做流(stream)，流是无限的元组(Tuple)序列。元组就像一个可以表示标准数据类型（例如int，float和byte数组）和用户自定义类型（需要额外序列化代码的）的数据结构。每个流由一个唯一的ID来标示的，这个ID可以用来构建拓扑中各个组件的数据源。

如下图所示，其中的水龙头代表了数据流的来源，一旦水龙头打开，数据就会源源不断地流经Bolt而被处理。图中有三个流，用不同的颜色来表示，每个数据流中流动的是元组(Tuple)，它承载了具体的数据。元组通过流经不同的转换实体而被处理。

Storm对数据输入的来源和输出数据的去向没有做任何限制。像Hadoop，是需要把数据放到自己的文件系统HDFS里的。在Storm里，可以使用任意来源的数据输入和任意的数据输出，只要你实现对应的代码来获取/写入这些数据就可以。典型场景下，输入/输出数据来是基于类似Kafka或者ActiveMQ这样的消息队列，但是数据库，文件系统或者web服务也都是可以的。
如图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557330376448.png)

# storm 测试用例并运行
往往我在学习这些开源框架的时候，查看官方文档和源码中的例子是入门上手比较快的一种方式。
这里我也是从官方文档和github上的代码入手的
1.clone 下来1.2.2的源码
```
git clone --branch v1.2.2 https://github.com/apache/storm.git
```
2.进入examples目录下有很多例子，如storm-starter这个项目。同时在github上进入这个例子的目录下有README.md文件，介绍如何运行我们的测试例子。我们可以先感官体验一下storm运行拓扑是怎样的。详情请看[storm-starter](https://github.com/apache/storm/tree/master/examples/storm-starter)
step 1：用idea 打开storm源码 然后用maven打包或者进入storm-starter项目里面执行
```
mvn package
```
会在target目录里面生成一个start-storm-{version}.jar包上传到storm的服务器。
step 2: 提交运行实例拓扑，有本地和集群两种模式。是不是本地模式🉐️看代码如何实现的。
```
storm jar stormlib/storm-starter-1.2.2.jar org.apache.storm.starter.ExclamationTopology  ##本地模式
storm jar stormlib/storm-starter-1.2.2.jar org.apache.storm.starter.ExclamationTopology ExclamationTopology ## ExclamationTopology为Topology的名字
```
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557397799999.png)
step 3: org.apache.storm.starter.ExclamationTopology 这个拓扑类如下：

```java
/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.storm.starter;

import org.apache.storm.Config;
import org.apache.storm.LocalCluster;
import org.apache.storm.StormSubmitter;
import org.apache.storm.task.OutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.testing.TestWordSpout;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.TopologyBuilder;
import org.apache.storm.topology.base.BaseRichBolt;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Tuple;
import org.apache.storm.tuple.Values;
import org.apache.storm.utils.Utils;

import java.util.Map;

/**
 * This is a basic example of a Storm topology.
 */
public class ExclamationTopology {

  public static class ExclamationBolt extends BaseRichBolt {
    OutputCollector _collector;

    @Override
    public void prepare(Map conf, TopologyContext context, OutputCollector collector) {
      _collector = collector;
    }

    @Override
    public void execute(Tuple tuple) {
      _collector.emit(tuple, new Values(tuple.getString(0) + "!!!"));
      _collector.ack(tuple);
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer declarer) {
      declarer.declare(new Fields("word"));
    }


  }

  public static void main(String[] args) throws Exception {
    //构建拓扑类
    TopologyBuilder builder = new TopologyBuilder(); 
    //设置数据获取来源spout
    builder.setSpout("word", new TestWordSpout(), 10);
    //设置数据处理bolt类按照word分组
    builder.setBolt("exclaim1", new ExclamationBolt(), 3).shuffleGrouping("word");
    //设置数据处理bolt类按照exclaim1分组
    builder.setBolt("exclaim2", new ExclamationBolt(), 2).shuffleGrouping("exclaim1");
    //设置配置参数，打开debug模式
    Config conf = new Config();
    conf.setDebug(true);
    // 根据传入参数创建对应拓扑，如果参数大于0，就提交到storm集群，集群模式运行
    if (args != null && args.length > 0) {
      conf.setNumWorkers(3);
      //通过nimbus提交拓扑到suppervisisor工作节点运行
      StormSubmitter.submitTopologyWithProgressBar(args[0], conf, builder.createTopology());
    }
    else { //否则就是local本地模式运行，本地模式运行所有的日志都会打印到本地，可以用来调试

      LocalCluster cluster = new LocalCluster();
      cluster.submitTopology("test", conf, builder.createTopology());
      Utils.sleep(10000);
      //运行10秒后杀掉拓扑
      cluster.killTopology("test"); 
      //同时释放资源，关掉storm
      cluster.shutdown();
    }
  }
}

```
org.apache.storm.testing.TestWordSpout;
```java
/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.storm.testing;

import org.apache.storm.Config;
import org.apache.storm.topology.OutputFieldsDeclarer;
import java.util.Map;
import org.apache.storm.spout.SpoutOutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.base.BaseRichSpout;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Values;
import org.apache.storm.utils.Utils;
import java.util.HashMap;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class TestWordSpout extends BaseRichSpout {
    public static Logger LOG = LoggerFactory.getLogger(TestWordSpout.class);
    boolean _isDistributed;
    SpoutOutputCollector _collector;

    public TestWordSpout() {
        this(true);
    }

    public TestWordSpout(boolean isDistributed) {
        _isDistributed = isDistributed;
    }
        
    public void open(Map conf, TopologyContext context, SpoutOutputCollector collector) {
        _collector = collector;
    }
    
    public void close() {
        
    }
        
    public void nextTuple() {
        Utils.sleep(100);
        final String[] words = new String[] {"nathan", "mike", "jackson", "golda", "bertels"};
        final Random rand = new Random();
        final String word = words[rand.nextInt(words.length)];
        //随机从这些字符串中获取数据
        _collector.emit(new Values(word));
    }
    
    public void ack(Object msgId) {

    }

    public void fail(Object msgId) {
        
    }
    
    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("word"));
    }

    @Override
    public Map<String, Object> getComponentConfiguration() {
        if(!_isDistributed) {
            Map<String, Object> ret = new HashMap<String, Object>();
            ret.put(Config.TOPOLOGY_MAX_TASK_PARALLELISM, 1);
            return ret;
        } else {
            return null;
        }
    }    
}

```
# storm API 简单介绍
1.拓扑构建
TopologyBuilder公开了Java API，用于指定要执行的Storm拓扑。拓扑结构最终是Thrift结构，但由于Thrift API非常冗长，TopologyBuilder极大地简化了创建拓扑的过程。用于创建和提交拓扑的模板类似于：

```java
TopologyBuilder builder = new TopologyBuilder();
builder.setSpout("1", new TestWordSpout(true), 5);
builder.setSpout("2", new TestWordSpout(true), 3);
builder.setBolt("3", new TestWordCounter(), 3)
         .fieldsGrouping("1", new Fields("word"))
         .fieldsGrouping("2", new Fields("word"));
builder.setBolt("4", new TestGlobalCount())
         .globalGrouping("1");

Map conf = new HashMap();
conf.put(Config.TOPOLOGY_WORKERS, 4);

StormSubmitter.submitTopology("mytopology", conf, builder.createTopology());
```
在本地模式（正在处理）中运行完全相同的拓扑，并将其配置为记录所有发出的元组，如下所示。请注意，在关闭本地群集之前，它允许拓扑运行10秒。

```java
TopologyBuilder builder = new TopologyBuilder();

builder.setSpout("1", new TestWordSpout(true), 5);
builder.setSpout("2", new TestWordSpout(true), 3);
builder.setBolt("3", new TestWordCounter(), 3)
         .fieldsGrouping("1", new Fields("word"))
         .fieldsGrouping("2", new Fields("word"));
builder.setBolt("4", new TestGlobalCount())
         .globalGrouping("1");

Map conf = new HashMap();
conf.put(Config.TOPOLOGY_WORKERS, 4);
conf.put(Config.TOPOLOGY_DEBUG, true);

LocalCluster cluster = new LocalCluster();
cluster.submitTopology("mytopology", conf, builder.createTopology());
Utils.sleep(10000);
cluster.shutdown();
```
模式TopologyBuilder是使用setSpout和setBolt方法将组件ID映射到组件。这些方法返回的对象随后用于声明该组件的输入。
详情可以查看[TopologyBuilder](http://storm.apache.org/releases/1.2.2/javadocs/org/apache/storm/topology/TopologyBuilder.html)
2.创建spout相关
ISpout接口：
```
public interface ISpout extends Serializable {
    //初始化方法
    void open(Map conf, TopologyContext context, SpoutOutputCollector collector);
    //关闭
    void close();
    //遍历元组的方法，会一直执行这个方法
    void nextTuple();
    //成功时调用的确认方法
    void ack(Object msgId);
    //失败时调用的失败方法
    void fail(Object msgId);
}
```
storm已经给我们提供的很多的spout接口和实现类，我们只需要实现或者对应的实现类就能和其他技术集成在一起。基本的spout，我们可以实现IRichSpout或者继承BasicRichSpout
完成spout的创建。
3.创建Bolt类
storm已经给我们提供的很多的Bolt接口和实现类，我们只需要实现或者对应的实现类就能和其他技术集成在一起。基本的spout，我们可以实现IRichBolt或者继承BasicRichBolt
如
```java
/**
* BaseRichBolt 是一个不需要实现的ACK确认方法和fail（）失败方法
* 
*/
public class ExampleBolt extends BaseRichBolt {
    OutputCollector _collector;

    @Override
    public void prepare(Map conf, TopologyContext context, OutputCollector collector) {
      _collector = collector;
    }

    @Override
    public void execute(Tuple tuple) {
      _collector.emit(tuple, new Values(tuple.getString(0) + "!!!"));
      _collector.ack(tuple);
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer declarer) {
      declarer.declare(new Fields("word"));
    }
  }
```
Storm使用入门起来是非常简单的。
下面我将简单的自己实现一个拓扑
```java
package com.sonly.storm.demo1;

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
 * <b>class(类)HelloToplogy</b>
 * <b>creat date(创建时间):2019-05-09 21:55</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class HelloToplogy {
    public static final Logger LOGGER = LoggerFactory.getLogger(HelloToplogy.class);
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
            builder.setSpout("spout", new HellowordSpout(), 4).setNumTasks(4);

            builder.setBolt("split-bolt", new SplitBolt(),  4).shuffleGrouping("spout").setNumTasks(8);
            builder.setBolt("count-bolt", new HellowordBolt(), 8).fieldsGrouping("split-bolt", new Fields("word")).setNumTasks(8);
            LocalCluster cluster = new LocalCluster();
            cluster.submitTopology("word-count", conf, builder.createTopology());

            Thread.sleep(10000);
            cluster.killTopology("word-count");
            cluster.shutdown();
        }
        else {
            Options options = Options.builder(args);
            conf.setNumWorkers(options.getWorkers());
            builder.setSpout(options.getPrefix()+"-spout", new HellowordSpout(), options.getSpoutParallelismHint()).setNumTasks(options.getSpoutTaskSize());

            builder.setBolt(options.getPrefix()+"-split-bolt", new SplitBolt(),  options.getBoltParallelismHint()).shuffleGrouping(options.getPrefix()+"-spout").setNumTasks(options.getBoltTaskSize());
            builder.setBolt(options.getPrefix()+"-count-bolt", new HellowordBolt(), options.getBoltParallelismHint()).fieldsGrouping(options.getPrefix()+"-split-bolt", new Fields("word")).setNumTasks(options.getBoltTaskSize());
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
    }
}
```

spout 类：
```java
package com.sonly.storm.demo1;

import org.apache.storm.spout.SpoutOutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichSpout;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Values;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Currency;
import java.util.Map;
import java.util.Random;

/**
 * <b>package:com.sonly.storm.demo1</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${HellowordSpout}</b>
 * <b>creat date(创建时间):2019-05-09 20:27</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class HellowordSpout extends BaseRichSpout {
    public static final Logger LOGGER = LoggerFactory.getLogger(HellowordSpout.class);
    //拓扑上下文
    private TopologyContext context;
    private SpoutOutputCollector collector;
    private Map config;
    private Random random;
    public void open(Map conf, TopologyContext topologyContext, SpoutOutputCollector collector) {
        this.config = conf;
        this.context = topologyContext;
        this.collector = collector;
        this.random = new Random();
        LOGGER.warn("HellowordSpout->open:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void nextTuple() {
        String[] sentences = new String[]{"hello world !", "hello Storm !",
                "hello apache flink !", "hello apache kafka stream !", "hello apache spark !"};
        final String sentence = sentences[random.nextInt(sentences.length)];
        collector.emit(new Values(sentence));
        LOGGER.warn("HellowordSpout->nextTuple:hashcode:{}->ThreadId:{},TaskId:{},Values:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),sentence);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("sentence"));
    }

    @Override
    public void close() {
        LOGGER.warn("HellowordSpout->close:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
        super.close();
    }
}

```
实现两个bolt一个用来统计单词出现个数，一个用来拆分语句。
```java
package com.sonly.storm.demo1;

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
public class HellowordBolt extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(HellowordBolt.class);
    private TopologyContext context;
    private Map conf;
    private OutputCollector collector;
    private Map<String,Integer> counts = new HashMap(16);
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.conf=map;
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("HellowordBolt->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {
        LOGGER.warn("HellowordBolt->execute:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
        String word = tuple.getString(0);
        Integer count = counts.get(word);
        if (count == null)
            count = 0;
        count++;
        counts.put(word, count);
        collector.emit(new Values(word, count));
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("word", "count"));
    }
}

```

```java
package com.sonly.storm.demo1;

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
public class SplitBolt extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(SplitBolt.class);
    private TopologyContext context;
    private Map conf;
    private OutputCollector collector;
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.conf=map;
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("SplitBolt->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {
        String words = tuple.getStringByField("sentence");
        String[] contents = words.split(" +");
        for (String content : contents) {
            collector.emit(new Values(content));
            collector.ack(tuple);
        }
        LOGGER.warn("SplitBolt->execute:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("word"));
    }
}

```

local模式启动运行
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557417096146.png)

在pom文件中添加打包插件

```
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
</plugin>
```
同时修改dependency 的scope为provide
```
<scope>provide</scope>
```
原因是服务器上storm相关包都已经存在了，防止重复打包导致冲突。
```
//Topology Name
//component prefix
//workers
//spout executor (parallelism_hint)
//spout task size
//bolt executor (parallelism_hint)
//bolt task size
```
打包上传后，storm jar jarName arg0 arg1 arg2 args3 ...
后面跟参数运行即可。