---
title: storm 的分组策略深入理解（二）
date: 2019-05-12 20:10:40
tags:
  - storm
categories:
  - storm
comment: true
toc: true
---
上一篇博客提出了一个问题：
>如果执行
```
storm jar strom-study-1.0-SNAPSHOT-jar-with-dependencies.jar com.sonly.storm.demo1.grouppings.fieldgrouping.FeildGroupingToplogy FieldGrouping3 FieldGrouping3 4 1 1 4 4 
```
bolt 的分配情况是什么样子？

这个答案是，只会有两个bolt里面有数据，其他bolt里面是没有数据的。
下面接着讲分组策略

# All grouping

这个分组策略其实没什么好说的。
spout->bolt，和bolt->bolt之间都是全量的。

# local or sheffle grouping 

这个分组策略和sheffle grouping策略是一样的结果，可以完全替代，sheffle grouping
这个只有一点不一样就是，当一个work上执行两个同样的task任务时，那么这两个任务间不会再通过RPC远程通信，直接随机分配数据。从而减少了，由于RPC远程通信带来的性能损耗。提高了效率。
# global grouping
直接上代码：
```java
package com.sonly.storm.demo1.grouppings.globalgrouping;

import org.apache.storm.Config;
import org.apache.storm.StormSubmitter;
import org.apache.storm.generated.AlreadyAliveException;
import org.apache.storm.generated.AuthorizationException;
import org.apache.storm.generated.InvalidTopologyException;
import org.apache.storm.topology.TopologyBuilder;
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
public class GlobalGroupingToplogy {
    public static final Logger LOGGER = LoggerFactory.getLogger(GlobalGroupingToplogy.class);

    public static void main(String[] args) throws InterruptedException {
        TopologyBuilder builder = new TopologyBuilder();
        Config conf = new Config();
        conf.setDebug(true);

        conf.setNumWorkers(3);
        String topology = "GlobalGroupingToplogy";
        builder.setSpout("NumberGeneratorSpout", new NumberGeneratorSpout(), 1);
        builder.setBolt("GlobalGrouppingBolt1", new GlobalGrouppingBolt1(), 2).globalGrouping("NumberGeneratorSpout");
        builder.setBolt("GlobalGroupingBolt", new GlobalGroupingBolt(), 2).globalGrouping("NumberGeneratorSpout");
        try {
            StormSubmitter.submitTopologyWithProgressBar(topology, conf, builder.createTopology());
            LOGGER.warn("===========================================================");
            LOGGER.warn("The Topology {} is Submited ", topology);
            LOGGER.warn("===========================================================");
        } catch (AlreadyAliveException | InvalidTopologyException | AuthorizationException e) {
            e.printStackTrace();
        }
    }
}

```

```java
package com.sonly.storm.demo1.grouppings.globalgrouping;

import org.apache.storm.spout.SpoutOutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichSpout;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Values;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * <b>package:com.sonly.storm.demo1.grouppings.directgrouping</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-12 23:33</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class NumberGeneratorSpout extends BaseRichSpout {
    SpoutOutputCollector collector;
    TopologyContext context;
    AtomicInteger atomicInteger;
    @Override
    public void open(Map conf, TopologyContext context, SpoutOutputCollector collector) {
        this.collector = collector;
        this.context = context;
        atomicInteger = new AtomicInteger(0);
    }

    @Override
    public void nextTuple() {
        while(atomicInteger.get()<10){
            collector.emit(new Values(atomicInteger.incrementAndGet()));
        }
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("i"));
    }
}

```
```java
package com.sonly.storm.demo1.grouppings.globalgrouping;

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
public class GlobalGroupingBolt extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(GlobalGroupingBolt.class);
    private TopologyContext context;
    private OutputCollector collector;
    private Map<String,Integer> counts = new HashMap(16);
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("GlobalGroupingBolt->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {

        Integer i = tuple.getIntegerByField("i");
        LOGGER.warn("GlobalGroupingBolt->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),i);
        collector.emit(new Values(i * 2));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("double"));
    }
}

```
```java
package com.sonly.storm.demo1.grouppings.globalgrouping;

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
public class GlobalGrouppingBolt1 extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(GlobalGrouppingBolt1.class);
    private TopologyContext context;
    private OutputCollector collector;
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("GlobalGrouppingBolt1->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {
        Integer i = tuple.getIntegerByField("i");
        LOGGER.warn("GlobalGrouppingBolt1->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),i);
        collector.emit(new Values(i*i));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("square"));
    }
}

```
两个bolt组件对接一个spout，按照global分组，
实际上的日志情况是，taskId为1的bolt1，和taskId为3的bolt收到了消息。
**总结：**
**golbal分组会把消息发给同一个bolt中taskId较小的那个，且spout->bolt之间也是全量发送的，只是只会发往同一个bolt组件中的taskID最小的那个**
# direct groupping 
重点分析一下这个grouping
```java
package com.sonly.storm.demo1.grouppings.directgrouping;

import org.apache.storm.spout.SpoutOutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.topology.base.BaseRichSpout;
import org.apache.storm.tuple.Fields;
import org.apache.storm.tuple.Values;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * <b>package:com.sonly.storm.demo1.grouppings.directgrouping</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-12 23:33</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class NumberGeneratorSpout extends BaseRichSpout {
    SpoutOutputCollector collector;
    TopologyContext context;
    Integer taskId;
    AtomicInteger atomicInteger;
    @Override
    public void open(Map conf, TopologyContext context, SpoutOutputCollector collector) {
        this.collector = collector;
        this.context = context;
        List<Integer> taskIds = context.getComponentTasks("DirectGroupingBolt");
        //拿到DirectGroupingBolt这个组件的最大taskID
        taskId = taskIds.stream().mapToInt(Integer::intValue).max().getAsInt();
        atomicInteger = new AtomicInteger(0);
    }

    @Override
    public void nextTuple() {
        while(atomicInteger.get()<10){
            //直接发往最大的taskId的DirectGroupingBolt的task中
            collector.emitDirect(taskId,new Values(atomicInteger.incrementAndGet()));
        }
    }

    @Override
    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("i"));
    }
}

```
```java
package com.sonly.storm.demo1.grouppings.directgrouping;

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
public class DirectGroupingBolt extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(DirectGroupingBolt.class);
    private TopologyContext context;
    private OutputCollector collector;
    private Map<String,Integer> counts = new HashMap(16);
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("DirectGroupingBolt->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {

        Integer i = tuple.getIntegerByField("i");
        LOGGER.warn("DirectGroupingBolt->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),i);
        collector.emit(new Values(i * 2));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("double"));
    }
}

```
```java
package com.sonly.storm.demo1.grouppings.directgrouping;

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
public class DirectGrouppingBolt1 extends BaseRichBolt {
    public static final Logger LOGGER = LoggerFactory.getLogger(DirectGrouppingBolt1.class);
    private TopologyContext context;
    private OutputCollector collector;
    public void prepare(Map map, TopologyContext topologyContext, OutputCollector outputCollector) {
        this.context = topologyContext;
        this.collector = outputCollector;
        LOGGER.warn("DirectGrouppingBolt1->prepare:hashcode:{}->ThreadId:{},TaskId:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId());
    }

    public void execute(Tuple tuple) {
        Integer i = tuple.getIntegerByField("i");
        LOGGER.warn("DirectGrouppingBolt1->execute:hashcode:{}->ThreadId:{},TaskId:{},value:{}",this.hashCode(),Thread.currentThread().getId(),context.getThisTaskId(),i);
        collector.emit(new Values(i*i));
        collector.ack(tuple);
    }

    public void declareOutputFields(OutputFieldsDeclarer declarer) {
        declarer.declare(new Fields("square"));
    }
}

```
```java
package com.sonly.storm.demo1.grouppings.directgrouping;

import com.sonly.storm.demo1.grouppings.spout.WordSpout;
import org.apache.storm.Config;
import org.apache.storm.StormSubmitter;
import org.apache.storm.generated.AlreadyAliveException;
import org.apache.storm.generated.AuthorizationException;
import org.apache.storm.generated.InvalidTopologyException;
import org.apache.storm.topology.TopologyBuilder;
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
public class DirectGroupingToplogy {
    public static final Logger LOGGER = LoggerFactory.getLogger(DirectGroupingToplogy.class);

    public static void main(String[] args) throws InterruptedException {
        TopologyBuilder builder = new TopologyBuilder();
        Config conf = new Config();
        conf.setDebug(true);

        conf.setNumWorkers(3);
        String topology = "DirectGroupingToplogy";
        builder.setSpout("NumberGeneratorSpout", new NumberGeneratorSpout(), 1);
        builder.setBolt("DirectGrouppingBolt1", new DirectGrouppingBolt1(), 2).directGrouping("NumberGeneratorSpout");
        builder.setBolt("DirectGroupingBolt", new DirectGroupingBolt(), 2).directGrouping("NumberGeneratorSpout");
        try {
            StormSubmitter.submitTopologyWithProgressBar(topology, conf, builder.createTopology());
            LOGGER.warn("===========================================================");
            LOGGER.warn("The Topology {} is Submited ", topology);
            LOGGER.warn("===========================================================");
        } catch (AlreadyAliveException | InvalidTopologyException | AuthorizationException e) {
            e.printStackTrace();
        }
    }
}

```
同样是spout->bolt 看看这个消息的分布情况
```    
 storm jar strom-study-1.0-SNAPSHOT-jar-with-dependencies.jar com.sonly.storm.demo1.grouppings.directgrouping.DirectGroupingToplogy
```
如图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557721804952.png)
检查每个节点的日志 发现只有DirectGroupingBolt taskId为2的bolt接收到了消息，其他都没有接收到消息。
**总结：**
**direct grouping 能够指定bolt发送数据，能够用direct grouping来实现global grouping的功能。**

# custorm grouping 

这个就是自定义分组的意思，
只要继承实现接口 **CustomStreamGrouping** 就可以对分组自定义了。
这里实现一个简单的分组
```java
package com.sonly.storm.demo1.grouppings.customgrouping;

import org.apache.storm.generated.GlobalStreamId;
import org.apache.storm.grouping.CustomStreamGrouping;
import org.apache.storm.shade.com.google.common.base.Splitter;
import org.apache.storm.shade.com.google.common.collect.ImmutableMap;
import org.apache.storm.task.OutputCollector;
import org.apache.storm.task.TopologyContext;
import org.apache.storm.task.WorkerTopologyContext;
import org.apache.storm.topology.OutputFieldsDeclarer;
import org.apache.storm.tuple.Fields;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static java.util.concurrent.ThreadLocalRandom.current;

/**
 * <b>package:com.sonly.storm.demo1</b>
 * <b>project(项目):stormstudy</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-09 21:19</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class CategoriesGrouping implements CustomStreamGrouping {
    public static final Logger LOGGER = LoggerFactory.getLogger(CategoriesGrouping.class);
    List<Integer> taskIds;
    Map<String,Integer> map = new HashMap<>();
    @Override
    public void prepare(WorkerTopologyContext context, GlobalStreamId stream, List<Integer> targetTasks) {
        this.taskIds = targetTasks;
    }

    @Override
    public List<Integer> chooseTasks(int taskId, List<Object> values) {
        for (Object value : values) {
            List<String> strings = Splitter.on(",").splitToList(value.toString());
            if(map.containsKey(strings.get(0))){
                Integer integer = map.get(strings.get(0));
                return Arrays.asList(integer);
            }else {
                int i = current().nextInt(this.taskIds.size());
                map.put(strings.get(0),this.taskIds.get(i));
                return Arrays.asList(i);
            }
        }
        return this.taskIds;
    }

}
```
```java
package com.sonly.storm.demo1.grouppings.customgrouping;

import org.apache.storm.Config;
import org.apache.storm.StormSubmitter;
import org.apache.storm.generated.AlreadyAliveException;
import org.apache.storm.generated.AuthorizationException;
import org.apache.storm.generated.InvalidTopologyException;
import org.apache.storm.topology.TopologyBuilder;
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
public class CustomGroupingToplogy {
    public static final Logger LOGGER = LoggerFactory.getLogger(CustomGroupingToplogy.class);

    public static void main(String[] args) throws InterruptedException {
        TopologyBuilder builder = new TopologyBuilder();
        Config conf = new Config();
        conf.setDebug(true);

        conf.setNumWorkers(3);
        String topology = "GlobalGroupingToplogy";
        builder.setSpout("NumberGeneratorSpout", new NumberGeneratorSpout(), 1);
        builder.setBolt("GlobalGrouppingBolt1", new CustomGrouppingBolt(), 2).customGrouping("NumberGeneratorSpout",new CategoriesGrouping());
        try {
            StormSubmitter.submitTopologyWithProgressBar(topology, conf, builder.createTopology());
            LOGGER.warn("===========================================================");
            LOGGER.warn("The Topology {} is Submited ", topology);
            LOGGER.warn("===========================================================");
        } catch (AlreadyAliveException | InvalidTopologyException | AuthorizationException e) {
            e.printStackTrace();
        }
    }
}

```
这里有一张图帮助我们理解分组策略：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1557658795261.png)





