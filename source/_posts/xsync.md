---
title: xsync 同步命令脚本和xcall远程执行命令脚本
tags:
  - shell
  - linux
categories:
  - linux shell
comment: true
toc: true
translate_title: xsync-synchronization-command-script-and-xcall-remote-execution
date: 2017-03-29 00:18:32
---
## 缘由
在linux服务器集群上，有时我们需要将数据从主服务器同步到所有的从服务器上，或者在集群里需要执行一条或者多条命令，如果们一次次的拷贝，或者每个服务器一条条的执行，会造成重复的工作。所以就写两个脚本解决这方面的问题。
## xsync命令的编写
1. 安装 sync命令
```
yum install -y sync
```
2. 编写脚本 environment.sh
```
#! /usr/bin/bash
# 集群 IP 数组
export NODE_IPS=(172.16.18.198 172.16.18.199 172.16.18.200)
# 集群各 IP 对应的 主机名数组
export NODE_NAMES=(k8s-n1 k8s-n2 k8s-n3)
```
3. 编写xsyncj考本
```
#!/bin/bash

# 获取输出参数，如果没有参数则直接返回
pcount=$#
if [ $pcount -eq 0 ]
then
    echo "no parameter find !";
    exit;
fi

# 获取传输文件名
p1=$1
filename=`basename $p1`
echo "load file $p1 success !"

# 获取文件的绝对路径
pdir=`cd -P $(dirname $p1); pwd`
echo "file path is $pdir"

# 获取当前用户（如果想使用root用户权限拷贝文件，在命令后加入-root参数即可）
user=$2
case "$user" in
"-root")
    user="root";;
"")
    user=`whoami`;;
*)
    echo "illegal parameter $user"
    
esac

echo $user
# 拷贝文件到从机(这里注意主机的host需要根据你的实际情况配置，要与你具体的主机名对应)
source /opt/user/environment.sh
index=0
for node_ip in ${NODE_IPS[@]}
do 
    
    echo "================current host is ${NODE_NAMES[$index]} ip is ${node_ip}================="
    rsync -rvl $pdir/$filename $user@${node_ip}:$pdir
    index=`expr $index + 1`
done

echo "complete !"

```

## xcall脚本的编写
利用ssh命令远程执行脚本命令。
脚本如下：
```
#!/bin/bash

# 获取控制台指令

cmd=$*

# 判断指令是否为空
if (( #$cmd -eq # ))
then
    echo "command can not be null !"
    exit
fi

# 获取当前登录用户
user=`whoami`
source /opt/user/environment.sh
# 在从机执行指令,这里需要根据你具体的集群情况配置，host与具体主机名一致
for node_ip in ${NODE_IPS[@]}
do
        echo "================current host is ${node_ip}================="
        echo "--> excute command \"$cmd\""
        ssh $user@${node_ip} $cmd
done

echo "excute successfully !"
```
这两个脚本仅仅只是一个简单的脚本，欢迎大家修改和使用。
 

