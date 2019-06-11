---
title: JVM的相关知识
tags:
  - JVM
categories:
  - JVM
translate_title: jvm-related-knowledge
date: 2019-06-07 18:13:05
---

关于JVM介绍网上有很多资料，我这里写的仅仅是我对JVM的理解。

# 是不是只有java编译器才能编译成字节码.class文件?
明显是不是的，jruby/scale/groovy/都能编译成.class 文件。
# Class文件的结构

```java
package com.climber.jvm;
public class Helloword {
    public static int num = 3;
    public static void main(String[] args) {
        Helloword helloword = new Helloword();
        num ++;
        helloword.sum(num,1);
    }
    public int sum(int a,int b){
        return a + b;
    }
}
```
编译运行得到class文件
如图：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1559970155642.png)

使用
javap -verbose Helloword.class > ./data.txt 
打开 data.txt
```
Classfile /Users/xxydliuyss/IdeaProjects/jvm/target/classes/com/climber/jvm/Helloword.class
  Last modified 2019-6-8; size 660 bytes
  MD5 checksum 3e8014d1d19cb974b06673e17c922039
  Compiled from "Helloword.java"
public class com.climber.jvm.Helloword
  minor version: 0
  major version: 49
  flags: ACC_PUBLIC, ACC_SUPER
Constant pool:
   #1 = Methodref          #6.#28         // java/lang/Object."<init>":()V
   #2 = Class              #29            // com/climber/jvm/Helloword
   #3 = Methodref          #2.#28         // com/climber/jvm/Helloword."<init>":()V
   #4 = Fieldref           #2.#30         // com/climber/jvm/Helloword.num:I
   #5 = Methodref          #2.#31         // com/climber/jvm/Helloword.sum:(II)I
   #6 = Class              #32            // java/lang/Object
   #7 = Utf8               num
   #8 = Utf8               I
   #9 = Utf8               <init>
  #10 = Utf8               ()V
  #11 = Utf8               Code
  #12 = Utf8               LineNumberTable
  #13 = Utf8               LocalVariableTable
  #14 = Utf8               this
  #15 = Utf8               Lcom/climber/jvm/Helloword;
  #16 = Utf8               main
  #17 = Utf8               ([Ljava/lang/String;)V
  #18 = Utf8               args
  #19 = Utf8               [Ljava/lang/String;
  #20 = Utf8               helloword
  #21 = Utf8               sum
  #22 = Utf8               (II)I
  #23 = Utf8               a
  #24 = Utf8               b
  #25 = Utf8               <clinit>
  #26 = Utf8               SourceFile
  #27 = Utf8               Helloword.java
  #28 = NameAndType        #9:#10         // "<init>":()V
  #29 = Utf8               com/climber/jvm/Helloword
  #30 = NameAndType        #7:#8          // num:I
  #31 = NameAndType        #21:#22        // sum:(II)I
  #32 = Utf8               java/lang/Object
{
  public static int num;
    descriptor: I
    flags: ACC_PUBLIC, ACC_STATIC

  public com.climber.jvm.Helloword();
    descriptor: ()V
    flags: ACC_PUBLIC
    Code:
      stack=1, locals=1, args_size=1
         0: aload_0
         1: invokespecial #1                  // Method java/lang/Object."<init>":()V
         4: return
      LineNumberTable:
        line 12: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       5     0  this   Lcom/climber/jvm/Helloword;

  public static void main(java.lang.String[]);
    descriptor: ([Ljava/lang/String;)V
    flags: ACC_PUBLIC, ACC_STATIC
    Code:
      stack=3, locals=2, args_size=1
         0: new           #2                  // class com/climber/jvm/Helloword
         3: dup
         4: invokespecial #3                  // Method "<init>":()V
         7: astore_1
         8: getstatic     #4                  // Field num:I
        11: iconst_1
        12: iadd
        13: putstatic     #4                  // Field num:I
        16: aload_1
        17: getstatic     #4                  // Field num:I
        20: iconst_1
        21: invokevirtual #5                  // Method sum:(II)I
        24: pop
        25: return
      LineNumberTable:
        line 15: 0
        line 16: 8
        line 17: 16
        line 18: 25
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0      26     0  args   [Ljava/lang/String;
            8      18     1 helloword   Lcom/climber/jvm/Helloword;

  public int sum(int, int);
    descriptor: (II)I
    flags: ACC_PUBLIC
    Code:
      stack=2, locals=3, args_size=3
         0: iload_1
         1: iload_2
         2: iadd
         3: ireturn
      LineNumberTable:
        line 20: 0
      LocalVariableTable:
        Start  Length  Slot  Name   Signature
            0       4     0  this   Lcom/climber/jvm/Helloword;
            0       4     1     a   I
            0       4     2     b   I

  static {};
    descriptor: ()V
    flags: ACC_STATIC
    Code:
      stack=1, locals=0, args_size=0
         0: iconst_3
         1: putstatic     #4                  // Field num:I
         4: return
      LineNumberTable:
        line 13: 0
}
SourceFile: "Helloword.java"
```
# Class文件格式
|类型|  名称 | 数量 | 描述|
| --- | --- | --- | --- |
|u4|  magic   |1   |魔数|
|u2|  minor_version   |1   |次版本号|
|u2|  major_version　  |1   |主版本号|
|u2|  constant_pool_count |1   |常量池容量|
|cp_info |constant_pool   |costant_pool_count-1    |常量池|
|u2|  access_flags    |1   |访问标志|
|u2|  this_class  |1   |当前类常量索引|
|u2|  super_class |1   |超类常量索引|
|u2|  interfaces_count    |1   |接口数量|
|u2|  interfaces  |interfaces_count    |接口常量索引|
|u2|  fields_count    |1   |字段数量|
|field_info | fields  |fields_count    |字段信息|
|u2|  methods_count   |1   |方法数量|
|method_info |methods |methods_count   |方法信息|
|u2|  attributes_count    |1   |属性数量|
|attribute_info  |attributes  |attributes_count    |属性信息|

