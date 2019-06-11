---
title: 基于docker的mysql主主同步
tags:
  - mysql
categories:
  - mysql
comment: true
toc: true
translate_title: dockerbased-mysql-mastersynchronization
date: 2019-06-11 16:21:46
---
# 环境要求

docker环境，mysql:5.7的镜像

#1.创建挂载目录
```
--mysql
   --mone
      --data  
      --conf
         --my.cnf     
   --mtwo
      --data  
      --conf
         --my.cnf
```
# 2、主主配置
Mone: my.cnf
```
[mysqld]
server_id = 1
log-bin= mysql-bin

replicate-ignore-db=mysql
replicate-ignore-db=sys
replicate-ignore-db=information_schema
replicate-ignore-db=performance_schema

read-only=0
relay_log=mysql-relay-bin
log-slave-updates=on
auto-increment-offset=1
auto-increment-increment=2


!includedir /etc/mysql/conf.d/
!includedir /etc/mysql/mysql.conf.d/
```

Mtwo: my.cnf
```
[mysqld]
server_id = 2
log-bin= mysql-bin

replicate-ignore-db=mysql
replicate-ignore-db=sys
replicate-ignore-db=information_schema
replicate-ignore-db=performance_schema

read-only=0
relay_log=mysql-relay-bin
log-slave-updates=on
auto-increment-offset=2
auto-increment-increment=2

!includedir /etc/mysql/conf.d/
!includedir /etc/mysql/mysql.conf.d/
```
说明： log-bin ：需要启用二进制日志 server_id : 用于标识不同的数据库服务器，而且唯一

binlog-do-db : 需要记录到二进制日志的数据库 binlog-ignore-db : 忽略记录二进制日志的数据库 auto-increment-offset :该服务器自增列的初始值 auto-increment-increment :该服务器自增列增量

replicate-do-db ：指定复制的数据库 replicate-ignore-db ：不复制的数据库 relay_log ：从库的中继日志，主库日志写到中继日志，中继日志再重做到从库 log-slave-updates ：该从库是否写入二进制日志，如果需要成为多主则可启用。只读可以不需要

如果为多主的话注意设置 auto-increment-offset 和 auto-increment-increment 如上面为双主的设置： 服务器 152 自增列显示为：1,3,5,7,……（offset=1，increment=2） 服务器 153 自增列显示为：2,4,6,8,……（offset=2，increment=2）
3.启动容器
```
//创建并启动主从容器;
//mone
docker run --name monemysql -d -p 3317:3306 -e MYSQL_ROOT_PASSWORD=root -v ~/test/mysql_test1/mone/data:/var/lib/mysql -v ~/test/mysql_test1/mone/conf/my.cnf:/etc/mysql/my.cnf mysql:5.7

//mtwo
docker run --name mtwomysql -d -p 3318:3306 -e MYSQL_ROOT_PASSWORD=root -v ~/test/mysql_test1/mtwo/data:/var/lib/mysql -v ~/test/mysql_test1/mtwo/conf/my.cnf:/etc/mysql/my.cnf mysql:5.7
```
4.双主配置
mone->mtwo
```
//进入mone容器
docker exec -it monemysql mysql -u root -p
 
//启动mysql命令，刚在创建窗口时我们把密码设置为：root

 
//创建一个用户来同步数据
//这里表示创建一个slave同步账号slave，允许访问的IP地址为%，%表示通配符
GRANT REPLICATION SLAVE ON *.* to 'slave'@'%' identified by '123456';

//刷新权限
flush privileges；

//查看状态，记住File、Position的值，在mtwo中将用到
show master status;
```
5.查看容器IP
```
docker inspect --format='{{.NetworkSettings.IPAddress}}' monemysql

我这里查到是172.17.0.2
```
6.进入mtwo
```
//进入mtwo容器
docker exec -it mtwomysql mysql -u root -p
 
//启动mysql命令，刚在创建窗口时我们把密码设置为：root

//设置主库链接，master_host即为容器IP，master_log_file和master_log_pos即为在mone容器中，通过show master status查出来的值；
change master to master_host='172.17.0.2',master_user='slave',master_password='123456',master_log_file='mysql-bin.000004',master_log_pos=154,master_port=3306;

//启动同步
start slave ;
 
//查看状态
show slave status\G;
```
到此 mone->mtwo 的同步已经完成
7.配置mtwo->mone的同步
```
//进入mtwo容器
docker exec -it mtwomysql mysql -u root -p
 
//启动mysql命令，刚在创建窗口时我们把密码设置为：root

//创建一个用户来同步数据
//这里表示创建一个slave同步账号slave，允许访问的IP地址为%，%表示通配符
GRANT REPLICATION SLAVE ON *.* to 'slave'@'%' identified by '123456';

//刷新权限
flush privileges；
 
//查看状态
show master status;
```
8.查看mtwo的ip
```
docker inspect --format='{{.NetworkSettings.IPAddress}}' mtwomysql
我这里是172.17.0.3
```
9.进入mone中
```
/进入mone容器
docker exec -it monemysql mysql -u root -p
 
//启动mysql命令，刚在创建窗口时我们把密码设置为：root

//设置主库链接，master_host即为容器IP，master_log_file和master_log_pos即为在mone容器中，通过show master status查出来的值；
change master to master_host='172.17.0.3',master_user='slave',master_password='123456',master_log_file='mysql-bin.000004',master_log_pos=154,master_port=3306;

//启动同步
start slave ;
 
//查看状态
show slave status\G;
```
到此mtwo->mone的同步就配置完了

总结：其实主主同步其实就是做了两次主从同步而已。A主B从，B主A从