---
title: kafka API的使用
date: 2019-05-02 21:37:40
tags:
  - kafka
categories:
  - 消息队列
comment: true
toc: true
---
# kafka API 
kafka Consumer提供两套Java API：高级Consumer API、和低级Consumer API。

高级Consumer API 优点：
- 高级API写起来简单，易用。
不需要自行去管理offset，API已经封装好了offset这块的东西，会通过zookeeper自行管理
不需要管理分区，副本等情况，系统自动管理
消费者断线后会自动根据上次记录在zookeeper中的offset接着消费消息。

高级Consumer API 缺点：
- 不能自行控制offset。
- 不能自行管理分区，副本，zk等相关信息。 

低级API 优点：
- 能够让开发者自己维护offset.想从哪里消费就从哪里消费
- 自行控制连接分区，对分区自定义负载均衡
- 对zookeeper的依赖性降低（如 offset 不一定要用zk来存储，可以存在缓存里或者内存中）

缺点：
过于复杂，需要自行控制offset，连接哪个分区，找分区leader等。

# 简单入门使用
1. 引入maven依赖
```pom
dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-clients</artifactId>
    <version>2.2.0</version>
</dependency>
```

2. Producer简单使用
```java
package com.sonly.kafka;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;

import java.util.Properties;

/**
 * <b>package:com.sonly.kafka</b>
 * <b>project(项目):kafkaAPIdemo</b>
 * <b>class(类)demo</b>
 * <b>creat date(创建时间):2019-05-03 12:17</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class demo {

    public static void main(String[] args) {
        Properties properties = new Properties();
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,"k8s-n1:9092");
        properties.put(ProducerConfig.ACKS_CONFIG,"1");
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringSerializer");
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringSerializer");
        KafkaProducer<String, String> producer = new KafkaProducer<String, String>(properties);
        for (int i = 0; i < 100; i++)
            producer.send(new ProducerRecord<String, String>("mytest", Integer.toString(i), Integer.toString(i)));
        producer.close();

    }
}

```
带回调函数的生产者
```java
package com.sonly.kafka;

import org.apache.kafka.clients.producer.*;

import java.util.Properties;

/**
 * <b>package:com.sonly.kafka</b>
 * <b>project(项目):kafkaAPIdemo</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-03 12:58</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class demo1 {
    public static void main(String[] args) {
        Properties properties = new Properties();
        //设置kafka集群
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,"k8s-n1:9092");
        //设置brokeACK应答机制
        properties.put(ProducerConfig.ACKS_CONFIG,"1");
        //设置key序列化
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringSerializer");
        //设置value序列化
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringSerializer");
        //设置批量大小
        properties.put(ProducerConfig.BATCH_SIZE_CONFIG,"6238");
        //设置提交延时
        properties.put(ProducerConfig.LINGER_MS_CONFIG,"1");
        //设置producer缓存
        properties.put(ProducerConfig.BUFFER_MEMORY_CONFIG,Long.MAX_VALUE);

        KafkaProducer<String, String> producer = new KafkaProducer<String, String>(properties);
        for ( int i = 0; i < 12; i++) {
            final int finalI = i;
            producer.send(new ProducerRecord<String, String>("mytest", Integer.toString(i), Integer.toString(i)), new Callback() {

                public void onCompletion(RecordMetadata metadata, Exception exception) {
                    if(exception==null){
                        System.out.println("发送成功: " + finalI +","+metadata.partition()+","+ metadata.offset());
                    }
                }
            });
        }
        producer.close();
    }
}

```
结果：
```
发送成功: 0,0,170
发送成功: 2,0,171
发送成功: 11,0,172
发送成功: 4,1,101
发送成功: 5,2,116
发送成功: 6,2,117
发送成功: 10,2,118
发送成功: 1,3,175
发送成功: 3,3,176
发送成功: 7,3,177
发送成功: 8,3,178
发送成功: 9,3,179
```
数据不均等的分配到0-3 号分区上
3. 自定义分区发送
```java
package com.sonly.kafka;

import org.apache.kafka.clients.producer.Partitioner;
import org.apache.kafka.common.Cluster;

import java.util.Map;

/**
 * <b>package:com.sonly.kafka</b>
 * <b>project(项目):kafkaAPIdemo</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-03 13:43</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class CustomProducer implements Partitioner {
    public int partition(String topic, Object key, byte[] keyBytes, Object value, byte[] valueBytes, Cluster cluster) {
        return 0;
    }

    public void close() {

    }

    public void configure(Map<String, ?> configs) {
    }
}

```
设置分区
```java
package com.sonly.kafka;

import org.apache.kafka.clients.producer.*;

import java.util.Properties;

/**
 * <b>package:com.sonly.kafka</b>
 * <b>project(项目):kafkaAPIdemo</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-03 13:46</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class demo2 {
    public static void main(String[] args) {
        Properties properties = new Properties();
        //设置kafka集群
        properties.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG,"k8s-n1:9092");
        //设置brokeACK应答机制
        properties.put(ProducerConfig.ACKS_CONFIG,"1");
        //设置key序列化
        properties.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringSerializer");
        //设置value序列化
        properties.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringSerializer");
        //设置批量大小
        properties.put(ProducerConfig.BATCH_SIZE_CONFIG,"6238");
        //设置提交延时
        properties.put(ProducerConfig.LINGER_MS_CONFIG,"1");
        //设置producer缓存
        properties.put(ProducerConfig.BUFFER_MEMORY_CONFIG,Long.MAX_VALUE);
        //设置partition
        properties.put(ProducerConfig.PARTITIONER_CLASS_CONFIG,"com.sonly.kafka.CustomProducer");
        KafkaProducer<String, String> producer = new KafkaProducer<String, String>(properties);
        for ( int i = 0; i < 12; i++) {
            final int finalI = i;
            producer.send(new ProducerRecord<String, String>("mytest", Integer.toString(i), Integer.toString(i)), new Callback() {

                public void onCompletion(RecordMetadata metadata, Exception exception) {
                    if(exception==null){
                        System.out.println("发送成功: " + finalI +","+metadata.partition()+","+ metadata.offset());
                    }
                }
            });
        }
        producer.close();
    }
}

```

消费者高级API：
```java
package com.sonly.kafka.consumer;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.clients.producer.ProducerConfig;

import java.util.Arrays;
import java.util.Properties;

/**
 * <b>package:com.sonly.kafka.consumer</b>
 * <b>project(项目):kafkaAPIdemo</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-03 13:59</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class ConsumerDemo {
    public static void main(String[] args) {
        Properties properties = new Properties();
        //设置kafka集群
        properties.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,"k8s-n1:9092");
        //设置brokeACK应答机制
        properties.put(ConsumerConfig.GROUP_ID_CONFIG,"teste3432");
        //设置key反序列化
        properties.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringDeserializer");
        //设置value反序列化
        properties.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,"org.apache.kafka.common.serialization.StringDeserializer");
        //设置拿取大小
        properties.put(ConsumerConfig.FETCH_MAX_BYTES_CONFIG,100*1024*1024);
        //设置自动提交offset
        properties.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG,true);
        //设置自动提交延时
        properties.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG,1000);
        KafkaConsumer<String, String> consumer = new KafkaConsumer<String, String>(properties);
        consumer.subscribe(Arrays.asList("mytest","test"));
        while (true){
            ConsumerRecords<String, String> records = consumer.poll(10);
            for (ConsumerRecord<String, String> record : records) {
                System.out.println(record.topic()+"--"+record.partition()+"--"+record.value());
            }
        }
    }
}
```
低级API：
1.消费者使用低级API的主要步骤

|  步骤   | 主要工作    |
| --- | --- |
|    1 |根据指定分区从topic元数据中找到leader     |
|    2 |获取分区最新的消费进度     |
|    3 |从主副本中拉取分区消息    |
|    4 |识别主副本的变化，重试     |
2.方法描述：

|   方法  |描述     |
| --- | --- |
|findLeader()     |客户端向种子阶段发送主题元数据，将副本加入备用节点     |
|getLastOffset()     |消费者客户端发送偏移量请求，获取分区最近的偏移量     |
|run()     | 消费者低级API拉取消息的方法    |
|findNewLeader()     |当分区主副本节点发生故障时，客户端将要找出新的主副本     |
修改pom
```
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka_2.11</artifactId>
    <version>1.1.1</version>
</dependency>
<dependency>
    <groupId>org.apache.kafka</groupId>
    <artifactId>kafka-clients</artifactId>
    <version>1.1.1</version>
</dependency>
```

```java
package com.sonly.kafka.consumer;

import kafka.api.FetchRequest;
import kafka.api.FetchRequestBuilder;
import kafka.api.KAFKA_0_8_1$;
import kafka.cluster.BrokerEndPoint;
import kafka.javaapi.*;
import kafka.javaapi.consumer.SimpleConsumer;
import kafka.javaapi.message.ByteBufferMessageSet;
import kafka.message.MessageAndOffset;
import org.apache.kafka.clients.consumer.Consumer;

import java.nio.ByteBuffer;
import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * <b>package:com.sonly.kafka.consumer</b>
 * <b>project(项目):kafkaAPIdemo</b>
 * <b>class(类)${CLASS_NAME}</b>
 * <b>creat date(创建时间):2019-05-03 15:21</b>
 * <b>author(作者):</b>xxydliuyss</br>
 * <b>note(备注)):</b>
 * If you want to change the file header,please modify zhe File and Code Templates.
 */
public class LowerConsumer {
    //保存offset
    private long offset;
    //保存分区副本
    private Map<Integer,List<BrokerEndPoint>> partitionsMap = new HashMap<Integer, List<BrokerEndPoint>>(1024);
    public static void main(String[] args) throws InterruptedException {
        List<String> brokers = Arrays.asList("k8s-n1", "k8s-n2","k8s-n3");
        int port = 9092;
        int partition = 1;
        long offset=2;
        LowerConsumer lowerConsumer = new LowerConsumer();
        while(true){
//            offset = lowerConsumer.getOffset();
            lowerConsumer.getData(brokers,port,"mytest",partition,offset);
            TimeUnit.SECONDS.sleep(1);
        }

    }

    public long getOffset() {
        return offset;
    }


    private BrokerEndPoint findLeader(Collection<String> brokers,int port,String topic,int partition){
        for (String broker : brokers) {
            //创建消费者对象操作每一台服务器
            SimpleConsumer getLeader = new SimpleConsumer(broker, port, 10000, 1024 * 24, "getLeader");
            //构造元数据请求
            TopicMetadataRequest topicMetadataRequest = new TopicMetadataRequest(Collections.singletonList(topic));
            //发送元数据请求
            TopicMetadataResponse response = getLeader.send(topicMetadataRequest);
            //解析元数据
            List<TopicMetadata> topicMetadatas = response.topicsMetadata();
            //遍历数据
            for (TopicMetadata topicMetadata : topicMetadatas) {
                //获取分区元数据信息
                List<PartitionMetadata> partitionMetadatas = topicMetadata.partitionsMetadata();
                //遍历分区元数据
                for (PartitionMetadata partitionMetadata : partitionMetadatas) {
                    if(partition == partitionMetadata.partitionId()){
                        //保存，分区对应的副本，如果需要主副本挂掉重新获取leader只需要遍历这个缓存即可
                        List<BrokerEndPoint> isr = partitionMetadata.isr();
                        this.partitionsMap.put(partition,isr);
                        return partitionMetadata.leader();
                    }
                }
            }
        }
        return null;
    }
    private void getData(Collection<String> brokers,int port,String topic,int partition,long offset){
        //获取leader
        BrokerEndPoint leader = findLeader(brokers, port, topic, partition);
        if(leader==null) return;
        String host = leader.host();
        //获取数据的消费者对象
        SimpleConsumer getData = new SimpleConsumer(host, port, 10000, 1024 * 10, "getData");
        //构造获取数据request 这里一次可以添加多个topic addFecth 添加即可
        FetchRequest fetchRequestBuilder = new FetchRequestBuilder().addFetch(topic, partition, offset, 1024 * 10).build();
        //发送获取数据请求
        FetchResponse fetchResponse = getData.fetch(fetchRequestBuilder);
        //解析元数据返回，这是message的一个set集合
        ByteBufferMessageSet messageAndOffsets = fetchResponse.messageSet(topic, partition);
        //遍历消息集合
        for (MessageAndOffset messageAndOffset : messageAndOffsets) {
            long offset1 = messageAndOffset.offset();
            this.setOffset(offset);
            ByteBuffer payload = messageAndOffset.message().payload();
            byte[] buffer = new byte[payload.limit()];
            payload.get(buffer);
            String message = new String(buffer);
            System.out.println("offset:"+ offset1 +"--message:"+ message);

        }
    }

    private void setOffset(long offset) {
        this.offset = offset;
    }
}
```
这个低级API在最新的kafka版本中已经不再提供了。
