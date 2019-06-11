---
title: 理解storm并发度
tags:
  - storm
categories:
  - storm
comment: true
toc: true
translate_title: understand-the-concurrency-of-storm
date: 2019-05-10 11:46:25
---

# 什么是storm的并发度
一个topology（拓扑）在storm集群上最总是以executor和task的形式运行在suppervisor管理的worker节点上。而worker进程都是运行在jvm虚拟机上面的，每个拓扑都会被拆开多个组件分布式的运行在worker节点上。
1.worker 
2.executor
3.task
这三个简单关系图：
![官方图](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557460241883.png)

一个worker工作进程运行一个拓扑的子集（其实就是拓扑的组件），每个组件的都会以executor（线程）在worker进程上执行，一个worker进程可以同时运行多个拓扑的组件也就是线程。

一个executor线程可以运行同一个组件的一个或者多个tasks

task是实际处理数据的执行者，每一个spout或者bolt会在集群上执行很多个task。在拓扑的生命周期内拓扑结构相同的拓扑的组件任务task数量总是相同的。但是每个组件的执行的线程（executor）数是可以变化的。这就意味着以下条件总是成立的：#threads ≤ #tasks 也就是task的数量总是大于线程数，一般情况下，任务task的数量往往设置成和线程（executor）的数量一致，这样，每个线程执行一个task。

在storm拓扑的并发度其实就是集群上拓扑组件在集群上运行的executor（线程）的数量。

# 如何设置拓扑的并发度
“并行度”如何配置？其实不仅仅是设置executor线程的数量,同时也要从worker工作进程和task任务的数量的方面考虑。
可以用以下几种方式配置并发度：
1.通过storm的配置文件配置。storm配置文件的加载优先级是：defaults.yaml < storm.yaml < topology-specific configuration < internal component-specific configuration < external component-specific configuration.
工作进程数
描述：为群集中的计算机上的拓扑创建多少个工作进程。
配置选项：TOPOLOGY_WORKERS
如何设置代码（示例）：
配置＃setNumWorkers
执行者数（线程数）
描述：每个组件生成多少个执行程序。
配置选项：无（将parallelism_hint参数传递给setSpout或setBolt）
如何设置代码（示例）：
TopologyBuilder＃setSpout（）
TopologyBuilder＃setBolt（）
请注意，从Storm 0.8开始，parallelism_hint参数现在指定该螺栓的执行者的初始数量（不是任务！）。
任务数量
描述：每个组件创建多少个任务。
配置选项：TOPOLOGY_TASKS
如何设置代码（示例）：
ComponentConfigurationDeclarer＃setNumTasks（）
以下是在实践中显示这些设置的示例代码段：

```java
topologyBuilder.setBolt("green-bolt", new GreenBolt(), 2)
               .setNumTasks(4)
               .shuffleGrouping("blue-spout");
``` 

在上面的代码中，我们配置了Storm来运行GreenBolt带有初始数量为两个执行器和四个相关任务的bolt 。Storm将为每个执行程序（线程）运行两个任务。如果您没有明确配置任务数，Storm将默认运行每个执行程序一个任务。

#官方例子
下图显示了简单拓扑在操作中的外观。拓扑结构由三个部分组成：一个叫做spout BlueSpout，两个叫做GreenBolt和YellowBolt。组件被链接，以便BlueSpout将其输出发送到GreenBolt，然后将其自己的输出发送到YellowBolt。
![官方图](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557460241883.png)
在GreenBolt被配置为每代码段以上而BlueSpout和YellowBolt仅设置并行提示（执行人数）。这是相关代码：
```java
Config conf = new Config();
conf.setNumWorkers(2); // use two worker processes

topologyBuilder.setSpout("blue-spout", new BlueSpout(), 2); // set parallelism hint to 2

topologyBuilder.setBolt("green-bolt", new GreenBolt(), 2)
               .setNumTasks(4)
               .shuffleGrouping("blue-spout");

topologyBuilder.setBolt("yellow-bolt", new YellowBolt(), 6)
               .shuffleGrouping("green-bolt");

StormSubmitter.submitTopology(
        "mytopology",
        conf,
        topologyBuilder.createTopology()
    );
```
当然，Storm附带了额外的配置设置来控制拓扑的并行性，包括：

TOPOLOGY_MAX_TASK_PARALLELISM：此设置为可以为单个组件生成的执行程序数量设置上限。它通常在测试期间用于限制在本地模式下运行拓扑时产生的线程数。您可以通过例如Config＃setMaxTaskParallelism（）设置此选项。
# 从实际运行的拓扑的角度理解storm的并发度
## 自己写一个拓扑
实现一个可以设置worker数量，设置spout 、bolt 的Parallelism Hint的拓扑然后打包上传到storm集群运行。
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

## 在storm集群提交拓扑
### 修改日志级别
修改worker的工作进程的日志级别，修改成只输出warn日志，避免其他日志对我的干扰。进入${your_storm_path}/log4j2/目录修改worker.xml文件。先把worker.xml备份把Info级别改成warn
```
$ cp worker.xml worker.xml.bak
```
修改成：
```
<loggers>
    <root level="warn"> <!-- We log everything -->
        <appender-ref ref="A1"/>
        <appender-ref ref="syslog"/>
    </root>
    <Logger name="org.apache.storm.metric.LoggingMetricsConsumer" level="info" additivity="false">
        <appender-ref ref="METRICS"/>
    </Logger>
    <Logger name="STDERR" level="INFO">
        <appender-ref ref="STDERR"/>
        <appender-ref ref="syslog"/>
    </Logger>
    <Logger name="STDOUT" level="INFO">
        <appender-ref ref="STDOUT"/>
        <appender-ref ref="syslog"/>
    </Logger>
</loggers>
```
同步到另外两台supervisor的工作节点服务器。
为了跟清晰的理解并发度，我会通过这个demo 拓扑，修改参数观察stormUI的exector数量和tasks数量。
### 参数说明
```
// topologyName='count' ## Topology Name 拓扑的名字
// prefix='tp1' ## component prefix 即为每个spout，bolt的前缀名称
// workers=1  ## worker number 即为工作进程jvm数量
// spoutParallelismHint=2  ## spout executor (parallelism_hint) 即spout的线程数量
// spoutTaskSize=1 ## spout task size 即spout的运行实例数
// boltParallelismHint=2  ## bolt executor (parallelism_hint) 即bolt的线程数量
// boltTaskSize=1  ##bolt task size 即bolt的运行实例数
```
## 根据样例分析理解storm的并发度
### 例子1
执行：

```
storm jar storm-demo1.jar com.sonly.storm.demo1.HelloToplogy tp1 tp1 1 2 0 2 0
```

参数详情：

```
{topologyName='tp1', prefix='tp1', workers=1, spoutParallelismHint=2, spoutTaskSize=0, boltParallelismHint=2, boltTaskSize=0}
```

这时候task都被设置成0了。如下图：excutors为1，task为1。
![tp1](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557487851467.png)
接着往下看：此时我们的bolt的task都被设置0了，所以我们是没有创建spout，bolt的，但是你会发现一个_acker的bolt，这是storm的acker机制，storm自己给我们创建的bolt，并且每一个worker都会必须有一个_acker的bolt，如果我们没有取消ack机制的话。所以worker上只用了一个excutor来跑这个_acker的bolt。
![tp1组件图](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557488029568.png)

### 例子2

```
storm jar storm-demo1.jar com.sonly.storm.demo1.HelloToplogy tp2 tp2 1 2 1 2 1
```

参数详情：

```
{topologyName='tp2', prefix='tp2', workers=1, spoutParallelismHint=2, spoutTaskSize=1, boltParallelismHint=2, boltTaskSize=1}
```

此时 task的值都被设置成1了。如下图：excutors为4，task为4。
![tp2](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557488644015.png)
接着看一下spout，bolt 以及组件的分布情况见下图：
![tp2组件](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557488808341.png)
此时已经我们的有tp2-spout 一个spout，除了系统的acker 还有我们自己创建的两个bolt。因为只有一个worker所以全部分布在一个worker里面。
尽管我们设置了spout的线程数为2，bolt的线程数为2，但是task都被设置成1，只有一个任务需要被两个excutor执行，所以有一个线程实际上是没有任务执行的。所以线程数，就是这几个task的值的和，
一个spout，两个自己的创建的bolt以及acker的task数量的和。

### 例子3

```
storm jar storm-demo1.jar com.sonly.storm.demo1.HelloToplogy tp3 tp3 2 2 1 2 1
```

参数详情：

```
{topologyName='tp3', prefix='tp3', workers=2, spoutParallelismHint=2, spoutTaskSize=1, boltParallelismHint=2, boltTaskSize=1}
```

此时worker已经被设置成2了，如下图：executor为5，task为5.
![tp3](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557491206007.png)
接着看一下spout，bolt以及组件的分布情况如下图：
![tp3组件](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557491303432.png)

此时，task任务数依然是1，spout和bolt都是1份，acker每个worker都必须有一份的，所以，executor的数就是task实例数也就是：一个spout 两个系统acker bolt，和两个我们自己的bolt。也就是5.这个5个task不均匀的分配到了两个worker进程上。
### 例子4

```
storm jar storm-demo1.jar com.sonly.storm.demo1.HelloToplogy tp4 tp4 2 2 2 2 2
    
```

参数详情：

```
{topologyName='tp4', prefix='tp4', workers=2, spoutParallelismHint=2, spoutTaskSize=2, boltParallelismHint=2, boltTaskSize=2}
```
此时参数已经taks 数量被设置成2了，如下图：executor为8，task为8.
![tp4](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557491922132.png)
再看一下spout，bolt的分布情况：如下图：
![tp4组件图](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557492028989.png)
此时，我们task都被设置成了2，那spout实例和bolt的实例都是2，也就是2+2+2=6 这个是我们自己的创建的task，再加上acker两个task，所以task参数就是8.而这里设置时executor也是8个 被均分到两个worker上面。

### 例子5

```
storm jar storm-demo1.jar com.sonly.storm.demo1.HelloToplogy tp5 tp5 2 2 4 2 4
```

参数详情：

```
{topologyName='tp5', prefix='tp5', workers=2, spoutParallelismHint=2, spoutTaskSize=4, boltParallelismHint=2, boltTaskSize=4}
```
此时task设置成4，excutor设置成2，那这样的话，一个excutor会跑两个task ，executor=8,task=14 如下图：
![tp5](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557492553004.png)
继续看一下spout和bolt的分布情况：
![tp5组件图](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557492702803.png)
此时task设置成4，executor是2，那就是bolt和spout实例就是 4+4+4=12 再加上两个worker的Acker就是14个task。exector 是bolt的设置的值2+2+2=6个再加上两个acker的值，就是8个。同时，一个executor执行了两个task。8个executor平均分配到两个worker上面了。

# 总结
exector和task的值，和拓扑结构有关系，拓扑中的spout 和bolt设置的parallelism_hint都会影响到exector和task的数量。task和exectuor之间的关系在设置上就已经确定了，最好exector和task之间，task 的数量最好设置成executor的倍数，这样每个executor执行的task才是一样的。
说到这里，相信大家对并发度，有了比较清晰的理解。
