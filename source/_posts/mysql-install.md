---
title: mysql 快速安装
tags:
  - mysql
categories:
  - mysql
comment: true
translate_title: mysql-quick-install
date: 2018-06-09 09:12:23
---

废话少说直接贴脚本

```shell
#!/usr/bin/bash
##install_mysql.sh mysql-8.0.15-linux-glibc2.12-x86_64.tar.xz
yum install -y libaio

mysqltar=$1
extension="${mysqltar#*x86_64}"
filename=`basename $1 ${extension}`
tar -xvf ${mysqltar} && mv -f ${filename} /usr/local/mysql
##添加权限
groupadd mysql
##添加用户mysql
useradd -r -g mysql mysql
mkdir -p /etc/my.cnf.d/
mkdir -p /data/log/mysql-log/
mkdir -p /usr/local/mysql/data
cd /data/log/mysql-log/ && touch error.log
chown -R mysql:mysql /data/log/mysql-log/
MYSQL_HOME=`cd -P /usr/local/mysql; pwd`

echo "修改权限目录：${MYSQL_HOME}"
export MYSQL_HOME=${MYSQL_HOME}
export PATH=$PATH:$MYSQL_HOME/bin
##修改目录权限
chown -R mysql:mysql ${MYSQL_HOME}
mysqlpath=`cd ${MYSQL_HOME} && pwd`

cat > /etc/my.cnf <<EOF
[client]
port=3306 # 设置mysql客户端连接服务端时默认使用的端口

default-character-set=utf8
socket=/usr/local/mysql/data/mysql.sock

[mysqld]
# 设置mysql的安装目录
basedir=/usr/local/mysql
#datadir=/usr/local/mysql/data

socket=/usr/local/mysql/data/mysql.sock

# 设置3306端口
port=3306
# 允许最大连接数
max_connections=10000
# 允许连接失败的次数。这是为了防止有人从该主机试图攻击数据库系统
max_connect_errors=10
# 服务端使用的字符集默认为UTF8
character-set-server=UTF8MB4
# 创建新表时将使用的默认存储引擎
default-storage-engine=INNODB
# 默认使用“mysql_native_password”插件认证
default_authentication_plugin=mysql_native_password

# Settings user and group are ignored when systemd is used.
# If you need to run mysqld under a different user or group,
# customize your systemd unit file for mariadb according to the
# instructions in http://fedoraproject.org/wiki/Systemd

[mysqld_safe]
log-error=/data/log/mysql-log/error.log
pid-file=/usr/local/mysql/data/mysql.pid

#
# include all files from the config directory
#
!includedir /etc/my.cnf.d
EOF


##初始化mysql
echo "初始化mysql${mysqlpath}"

${MYSQL_HOME}/bin/mysqld --user=mysql --basedir=/usr/local/mysql --datadir=/usr/local/mysql/data
echo "添加启动服务"

cp ${MYSQL_HOME}/support-files/mysql.server /etc/init.d/mysql

echo "启动服务"
service mysql start && service mysql status
chkconfig --add mysql
echo "设置root用户密码"
${MYSQL_HOME}/bin/mysqladmin -u root password '123456'

${MYSQL_HOME}/bin/mysql -uroot -p123456 -e "use mysql;update user set host = '%' where user = 'root';FLUSH PRIVILEGES;"
```
安装包地址：链接: https://pan.baidu.com/s/1nUZNjWrvJSqGXT55CUcj7w 提取码: nc3i 复制这段内容后打开百度网盘手机App，操作更方便哦

# mysql多实例运行

利用mysqld_muti来运行

## mysqld_multi多实例启动工具

我们往往喜欢在一台服务器上安装多个实例，一般使用不同的端口，如3306，3307等，那么怎么才能启动这些实例呢？怎么才能一起启动呢？又怎么才能一个一个启动呢？MySQL很人性化的提供了一款自带的工具：mysqld_multi，可以毫无压力地满足我们对多实例启动的方式。  



mysqld_multi准备知识
-------------------
- mysqld_multi启动会查找my.cnf文件中的[mysqldN]组，N为mysqld_multi后携带的整数值。
- mysqld_multi的固定选项可在配置文件my.cnf中进行配置，在[mysqld_multi]组下配置（如果没有该组，可自行建立）。
- mysqld_multi使用方式如下：

```shell
mysqld_multi [options] {start|stop|reload|report} [GNR[,GNR] ...]
```


mysqld_multi选项
----------------
start 开启MySQL实例
stop 关闭MySQL实例
reload 重新加载MySQL实例
report 返回MySQL当前状态

```shell
# report返回当前MySQL状态
[root@mysql log]# mysqld_multi report 3307
Reporting MySQL servers
MySQL server from group: mysqld3307 is not running

# start开启MySQL实例
[root@mysql log]# mysqld_multi start 3307
[root@mysql log]# mysqld_multi report 3307
Reporting MySQL servers
MySQL server from group: mysqld3307 is running

# reload重新加载MySQL实例
[root@mysql log]# mysqld_multi reload 3307
[root@mysql log]# mysqld_multi report 3307
Reporting MySQL servers
MySQL server from group: mysqld3307 is running

# stop关闭MySQL实例，注意此处是需要一个具有shutdown权限的用户，且密码并被是加密的，也不可以交互式输入密码，Linux又具有history功能，所以为了数据库的安全，还是不要用mysqld_multi stop的方式关闭数据库了吧
[root@mysql log]# mysqld_multi stop 3307 --user=root --password=******
[root@mysql log]# mysqld_multi report 3307
Reporting MySQL servers
MySQL server from group: mysqld3307 is not running
```

- --example 输出一个mysqld_multi配置文件中的配置示例
```shell
 mysqld_multi --example
# This is an example of a my.cnf file for mysqld_multi.
# Usually this file is located in home dir ~/.my.cnf or /etc/my.cnf
#
# SOME IMPORTANT NOTES FOLLOW:
#
# 1.COMMON USER
#
#   Make sure that the MySQL user, who is stopping the mysqld services, has
#   the same password to all MySQL servers being accessed by mysqld_multi.
#   This user needs to have the 'Shutdown_priv' -privilege, but for security
#   reasons should have no other privileges. It is advised that you create a
#   common 'multi_admin' user for all MySQL servers being controlled by
#   mysqld_multi. Here is an example how to do it:
#
#   GRANT SHUTDOWN ON *.* TO multi_admin@localhost IDENTIFIED BY 'password'
#
#   You will need to apply the above to all MySQL servers that are being
#   controlled by mysqld_multi. 'multi_admin' will shutdown the servers
#   using 'mysqladmin' -binary, when 'mysqld_multi stop' is being called.
#
# 2.PID-FILE
#
#   If you are using mysqld_safe to start mysqld, make sure that every
#   MySQL server has a separate pid-file. In order to use mysqld_safe
#   via mysqld_multi, you need to use two options:
#
#   mysqld=/path/to/mysqld_safe
#   ledir=/path/to/mysqld-binary/
#
#   ledir (library executable directory), is an option that only mysqld_safe
#   accepts, so you will get an error if you try to pass it to mysqld directly.
#   For this reason you might want to use the above options within [mysqld#]
#   group directly.
#
# 3.DATA DIRECTORY
#
#   It is NOT advised to run many MySQL servers within the same data directory.
#   You can do so, but please make sure to understand and deal with the
#   underlying caveats. In short they are:
#   - Speed penalty
#   - Risk of table/data corruption
#   - Data synchronising problems between the running servers
#   - Heavily media (disk) bound
#   - Relies on the system (external) file locking
#   - Is not applicable with all table types. (Such as InnoDB)
#     Trying so will end up with undesirable results.
#
# 4.TCP/IP Port
#
#   Every server requires one and it must be unique.
#
# 5.[mysqld#] Groups
#
#   In the example below the first and the fifth mysqld group was
#   intentionally left out. You may have 'gaps' in the config file. This
#   gives you more flexibility.
#
# 6.MySQL Server User
#
#   You can pass the user=... option inside [mysqld#] groups. This
#   can be very handy in some cases, but then you need to run mysqld_multi
#   as UNIX root.
#
# 7.A Start-up Manage Script for mysqld_multi
#
#   In the recent MySQL distributions you can find a file called
#   mysqld_multi.server.sh. It is a wrapper for mysqld_multi. This can
#   be used to start and stop multiple servers during boot and shutdown.
#
#   You can place the file in /etc/init.d/mysqld_multi.server.sh and
#   make the needed symbolic links to it from various run levels
#   (as per Linux/Unix standard). You may even replace the
#   /etc/init.d/mysql.server script with it.
#
#   Before using, you must create a my.cnf file either in /usr/my.cnf
#   or /root/.my.cnf and add the [mysqld_multi] and [mysqld#] groups.
#
#   The script can be found from support-files/mysqld_multi.server.sh
#   in MySQL distribution. (Verify the script before using)
#

[mysqld_multi]
mysqld     = /usr/bin/mysqld_safe
mysqladmin = /usr/bin/mysqladmin
user       = multi_admin
password   = my_password

[mysqld2]
socket     = /tmp/mysql.sock2
port       = 3307
pid-file   = /var/lib/mysql2/hostname.pid2
datadir    = /var/lib/mysql2
language   = /usr/share/mysql/mysql/english
user       = unix_user1

[mysqld3]
mysqld     = /path/to/mysqld_safe
ledir      = /path/to/mysqld-binary/
mysqladmin = /path/to/mysqladmin
socket     = /tmp/mysql.sock3
port       = 3308
pid-file   = /var/lib/mysql3/hostname.pid3
datadir    = /var/lib/mysql3
language   = /usr/share/mysql/mysql/swedish
user       = unix_user2

[mysqld4]
socket     = /tmp/mysql.sock4
port       = 3309
pid-file   = /var/lib/mysql4/hostname.pid4
datadir    = /var/lib/mysql4
language   = /usr/share/mysql/mysql/estonia
user       = unix_user3
 
[mysqld6]
socket     = /tmp/mysql.sock6
port       = 3311
pid-file   = /var/lib/mysql6/hostname.pid6
datadir    = /var/lib/mysql6
language   = /usr/share/mysql/mysql/japanese
user       = unix_user4
```

- --log=file_name 指定一个日志输出文件，如果文件存在则在文件末尾处添加日志信息
- --mysqladmin=pro_name 用于指定一个程序来实现mysqladmin的功能
- --mysqld=pro_name 用于指定一个程序来实现mysqld的功能，如mysqld_safe
- --no-log 将日志信息输出到屏幕上，而不是输入日志文件中
- --password= mysqladmin用户的密码
- --silent 简要信息
- --user= mysqladmin用户，默认为mysql
- --tcp-ip 连接到每个服务器的tcp/ip端口，有时候sock文件丢失，但仍然可以通过tcp/ip端口连接服务器
上面是介绍
例子：
在/etc/mysql/目录下新建mysqld_muti.cnf 内容如下：
```
[mysqld_multi]
mysqld=/usr/local/mysql/bin/mysqld_safe
mysqladmin=/usr/local/mysql/bin/mysqladmin
user=root
password=123456
log=/var/log/mysqld_multi.log

[mysqld3307]
port=3307
pid-file=/var/lib/mysql3307/mysql3307.pid
socket=/var/lib/mysql3307/mysql3307.sock
datadir=/var/lib/mysql3307
user=mysql
log_bin=mysql-bin
server_id=3307

[mysqld3308]
port=3308
pid-file=/var/lib/mysql3308/mysql3308.pid
socket=/var/lib/mysql3308/mysql3308.sock
datadir=/var/lib/mysql3308
user=mysql
log_bin=mysql-bin
server_id=3308
relay_log=/var/lib/mysql3308/mysql-relay-bin
log_slave_updates=1
read_only=1

[mysqld3309]
port=3309
pid-file=/var/lib/mysql3309/mysql3309.pid
socket=/var/lib/mysql3309/mysql3309.sock
datadir=/var/lib/mysql3309
user=mysql
log_bin=mysql-bin
server_id=3309
relay_log=/var/lib/mysql3309/mysql-relay-bin
log_slave_updates=1
read_only=1
```
启动全部实例：
```
 mysqld_multi --defaults-file=/etc/mysql/mysqld_muti.cnf start
```
查看实例状态：
```
mysqld_multi --defaults-file=/etc/mysql/mysqld_muti.cnf report
Reporting MySQL servers
MySQL server from group: mysqld3307 is running
MySQL server from group: mysqld3308 is running
MySQL server from group: mysqld3309 is running
```
