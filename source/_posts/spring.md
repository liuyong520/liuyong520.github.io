---
title: 跟我阅读spring源码之spring core
date: 2017-05-20 21:03:44
tags:
  - spring
comment: true
toc: true
---

这么多的源代码，这么多包，往往不知道从何处开始下手阅读的这个源代码。我们在接触spring的时候，首先介绍的都是按照IOC、MVC、AOP、这种顺序介绍的。

# ClassPathXmlApplicationContext

## 类的继承图谱

废话不多说，就从这个启动类开始看吧。

先看一下这个类的继承图谱

![](/assets/import.png)

Classpath应用上下文最顶层接口Beanfactory。Beanfactory就是springIOC的容器。

## 构造方法

```java
public ClassPathXmlApplicationContext(String[] configLocations, boolean refresh, ApplicationContext parent)
            throws BeansException {
        //最终会调用的是AbstractApplicationContext的构造方法    
        super(parent);
        //根据配置的路径生成classpath的加载路径

        setConfigLocations(configLocations);
        if (refresh) {
            //刷新容器完成容器的初始化工作
            refresh();
        }
    }
```

看一下AbstractApplicationContext 构造方法作的是什么事情

```java
public AbstractApplicationContext(ApplicationContext parent) {
    this();
    //设置父容器
    setParent(parent);
}
public AbstractApplicationContext() {
    //获取配置资源的解析器
    this.resourcePatternResolver = getResourcePatternResolver();
}

protected ResourcePatternResolver getResourcePatternResolver() {
    //直接new一个PathMatchingResourcePatternResolver解析器 等一下再看这个PathMatchingResourcePatternResolver
    return new PathMatchingResourcePatternResolver(this);
}
@Override
public void setParent(ApplicationContext parent) {
    this.parent = parent;
    if (parent != null) {
        //如果父容器不为空且是ConfigurableEnvironment就把环境合并在一起
        Environment parentEnvironment = parent.getEnvironment();
        if (parentEnvironment instanceof ConfigurableEnvironment) {
            getEnvironment().merge((ConfigurableEnvironment) parentEnvironment);
        }
    }
}
//getEnvironment方法来自于ConfigurableApplicationContext接口，源码很简单，如果为空就调用createEnvironment创建一个。AbstractApplicationContext.createEnvironment:
public ConfigurableEnvironment getEnvironment() {
    if (this.environment == null) {

        this.environment = createEnvironment();
    }
    return this.environment;
}
```

## setConfigLocations

```java
//此方法的目的在于将占位符(placeholder)解析成实际的地址。比如可以这么写: new ClassPathXmlApplicationContext("classpath:config.xml");那么classpath:就是需要被解析的

public void setConfigLocations(String... locations) {
    if (locations != null) {
        Assert.noNullElements(locations, "Config locations must not be null");
        this.configLocations = new String[locations.length];
        for (int i = 0; i < locations.length; i++) {
            //解析成classpath的路径
            this.configLocations[i] = resolvePath(locations[i]).trim();
        }
    }
    else {
        this.configLocations = null;
    }
}
protected String resolvePath(String path) {
    return getEnvironment().resolveRequiredPlaceholders(path);
}
```

## refresh

重点介绍这个refresh方法：

```java
@Override
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        //准备刷新容器这里干的是：初始化资源，初始化spring事件容器，验证一下系统环境配置是否正确 这个
        prepareRefresh();
        //刷新内部bean工厂，同时拿到内部工厂beanfactory。
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
        //    
        prepareBeanFactory(beanFactory);

        try {
            // Allows post-processing of the bean factory in context subclasses.
            postProcessBeanFactory(beanFactory);

            // Invoke factory processors registered as beans in the context.
            invokeBeanFactoryPostProcessors(beanFactory);

            // Register bean processors that intercept bean creation.
            registerBeanPostProcessors(beanFactory);

            // Initialize message source for this context.
            initMessageSource();

            // Initialize event multicaster for this context.
            initApplicationEventMulticaster();

            // Initialize other special beans in specific context subclasses.
            onRefresh();

            // Check for listener beans and register them.
            registerListeners();

            // Instantiate all remaining (non-lazy-init) singletons.
            finishBeanFactoryInitialization(beanFactory);

            // Last step: publish corresponding event.
            finishRefresh();
        }

        catch (BeansException ex) {
            if (logger.isWarnEnabled()) {
                logger.warn("Exception encountered during context initialization - " +
                        "cancelling refresh attempt: " + ex);
            }

            // Destroy already created singletons to avoid dangling resources.
            destroyBeans();

            // Reset 'active' flag.
            cancelRefresh(ex);

            // Propagate exception to caller.
            throw ex;
        }

        finally {
            // Reset common introspection caches in Spring's core, since we
            // might not ever need metadata for singleton beans anymore...
            resetCommonCaches();
        }
    }
```

### prepareRefresh

看看prepareRefresh 这个方法：

```java
protected void prepareRefresh() {
    this.startupDate = System.currentTimeMillis();

    this.closed.set(false);
    this.active.set(true);

    if (logger.isInfoEnabled()) {
        logger.info("Refreshing " + this);
    }

    // 初始化properties配置信息，这个方法其实是个空方法，让子类去复写的。子类可以继承这个类，实现这个方法自行去加载properties配置
    initPropertySources();

    //验证环境配置的properties是否是require的
    //如果是key=value value 为空的话，
    //就会存到一个MissingRequiredPropertiesException（这是一个异常的集合）
    //类里，同时抛出MissingRequiredPropertiesException
    getEnvironment().validateRequiredProperties();

    //初始化spring事件的容器
    this.earlyApplicationEvents = new LinkedHashSet<ApplicationEvent>();
}
```

### obtainFreshBeanFactory

接着继续看：ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory\(\);

```java
protected ConfigurableListableBeanFactory obtainFreshBeanFactory() {
    //刷新内部工厂 为嘛要刷新？这里其实做了三部操作
    //1。关闭原来创建的的容器，同时释放bean对象资源
    //2.重新加载beans配置文件，存到DefaultListableBeanFactory 容器里
    refreshBeanFactory();
    //获取beanFactory的实例。这里是调用的AbstractXmlApplicationContext里面的    getBeanFactory获取到DefaultListableBeanFactory的实例。
    ConfigurableListableBeanFactory beanFactory = getBeanFactory();
    if (logger.isDebugEnabled()) {
        logger.debug("Bean factory for " + getDisplayName() + ": " + beanFactory);
    }
    return beanFactory;
}
```

继续看refreshBeanFactory：这个方法是它的父类AbstractRefreshableApplicationContext实现的。

```java
@Override
protected final void refreshBeanFactory() throws BeansException {
    //如果已经有beanfactory了就把所以的bean给销毁掉，同时关闭beanfactory
    if (hasBeanFactory()) {
        destroyBeans();
        closeBeanFactory();
    }
    try {
        //重新创建一个beanfactory。待会我们再分析这个bean factory
        DefaultListableBeanFactory beanFactory = createBeanFactory();
        beanFactory.setSerializationId(getId());
        customizeBeanFactory(beanFactory);
        //加载所有的工厂实例 这个方法在classpathApplicationContext中是由AbstractXmlApplicationContext实现的。加载配置文件将所有的bean以beanDefinition的描述存在DefaultListableBeanFactory这个IOC容器里
        loadBeanDefinitions(beanFactory);
        synchronized (this.beanFactoryMonitor) {
            this.beanFactory = beanFactory;
        }
    }
    catch (IOException ex) {
        throw new ApplicationContextException("I/O error parsing bean definition source for " + getDisplayName(), ex);
    }
}
```

### prepareBeanFactory

接着往下看prepareBeanFactory 方法很长。

```java
protected void prepareBeanFactory(ConfigurableListableBeanFactory beanFactory) {
    // 设置beanFactory的ClassLoader为当前的ClassLoader
    beanFactory.setBeanClassLoader(getClassLoader());
    // 设置表达式解析器(解析bean定义中的一些表达式)这里是spel表达式解析器
    beanFactory.setBeanExpressionResolver(new StandardBeanExpressionResolver(beanFactory.getBeanClassLoader()));
    // 添加属性编辑注册器(注册属性编辑器)，属性编辑器实际上是属性的类型转换器，编辑器注册器里面其实是map结构
    // 因为bean的属性配置都是字符串类型的 实例化的时候要将这些属性转换为实际类型
    beanFactory.addPropertyEditorRegistrar(new ResourceEditorRegistrar(this, getEnvironment()));

    //// 添加BeanPostProcessor(Bean后置处理器)：ApplicationContextAwareProcessor
    // 在BEAN初始化之前，调用ApplicationContextAwareProcessor的postProcessBeforeInitialization
    // postProcessBeforeInitialization有如下功能
    // 处理所有的Aware接口，进行如下操作：
    // 如果bean实现了EnvironmentAware接口，调用bean.setEnvironment
    // 如果bean实现了EmbeddedValueResolverAware接口，调用bean.setEmbeddedValueResolver
    // 如果bean实现了ResourceLoaderAware接口，调用bean.setResourceLoader
    // 如果bean实现了ApplicationEventPublisherAware接口，调用bean.setApplicationEventPublisher
    // 如果bean实现了MessageSourceAware接口，调用bean.setMessageSource
   // 如果bean实现了ApplicationContextAware接口，调用bean.setApplicationContext

    beanFactory.addBeanPostProcessor(new ApplicationContextAwareProcessor(this));
    //  取消ResourceLoaderAware
    // 、ApplicationEventPublisherAware
    // 、MessageSourceAware
    // 、ApplicationContextAware
    // 、EnvironmentAware这5个接口的自动注入
    // 因为ApplicationContextAwareProcessor把这5个接口的实现工作做了
    beanFactory.ignoreDependencyInterface(ResourceLoaderAware.class);
    beanFactory.ignoreDependencyInterface(ApplicationEventPublisherAware.class);
    beanFactory.ignoreDependencyInterface(MessageSourceAware.class);
    beanFactory.ignoreDependencyInterface(ApplicationContextAware.class);
    beanFactory.ignoreDependencyInterface(EnvironmentAware.class);

    // 注入一些特殊的bean，不需要在bean文件里面定义。
    beanFactory.registerResolvableDependency(BeanFactory.class, beanFactory);
    beanFactory.registerResolvableDependency(ResourceLoader.class, this);
    beanFactory.registerResolvableDependency(ApplicationEventPublisher.class, this);
    beanFactory.registerResolvableDependency(ApplicationContext.class, this);

    // 检查容器中是否包含名称为loadTimeWeaver的bean，实际上是增加Aspectj的支持
    // AspectJ采用编译期织入、类加载期织入两种方式进行切面的织入
    // 类加载期织入简称为LTW（Load Time Weaving）,通过特殊的类加载器来代理JVM默认的类加载器实现
    if (beanFactory.containsBean(LOAD_TIME_WEAVER_BEAN_NAME)) {
        // 添加BEAN后置处理器：LoadTimeWeaverAwareProcessor
        // 在BEAN初始化之前检查BEAN是否实现了LoadTimeWeaverAware接口，
        // 如果是，则进行加载时织入，即静态代理。
        beanFactory.addBeanPostProcessor(new LoadTimeWeaverAwareProcessor(beanFactory));
        //设置特殊的类加载器
        beanFactory.setTempClassLoader(new ContextTypeMatchClassLoader(beanFactory.getBeanClassLoader()));
    }

    // 注册环境的environment bean
    if (!beanFactory.containsLocalBean(ENVIRONMENT_BEAN_NAME)) {
        beanFactory.registerSingleton(ENVIRONMENT_BEAN_NAME, getEnvironment());
    }
    //注册systemProperties的bean 其实就是map 
    if (!beanFactory.containsLocalBean(SYSTEM_PROPERTIES_BEAN_NAME)) {
        beanFactory.registerSingleton(SYSTEM_PROPERTIES_BEAN_NAME, getEnvironment().getSystemProperties());
    }
    注册系统环境bean，其实就是map
    if (!beanFactory.containsLocalBean(SYSTEM_ENVIRONMENT_BEAN_NAME)) {
        beanFactory.registerSingleton(SYSTEM_ENVIRONMENT_BEAN_NAME, getEnvironment().getSystemEnvironment());
    }
}
```

看看ApplicationContextAwareProcessor 的postProcessBeforeInitialization这个方法,看完这个方法就知道上面为嘛写这么多东西了

```java
public Object postProcessBeforeInitialization(final Object bean, String beanName) throws BeansException {
    AccessControlContext acc = null;
    //如果bean 实现了EmbeddedValueResolverAware、ResourceLoaderAware、
    //ApplicationEventPublisherAware、ApplicationContextAware接口。

    if (System.getSecurityManager() != null &&
            (bean instanceof EnvironmentAware || bean instanceof EmbeddedValueResolverAware ||
                    bean instanceof ResourceLoaderAware || bean instanceof ApplicationEventPublisherAware ||
                    bean instanceof MessageSourceAware || bean instanceof ApplicationContextAware)) {
        //获取权限控制上下文
        acc = this.applicationContext.getBeanFactory().getAccessControlContext();
    }
    //权限控制上下文非空
    if (acc != null) {
        //用权限控制器去调invokeAwareInterfaces方法
        AccessController.doPrivileged(new PrivilegedAction<Object>() {
            @Override
            public Object run() {
                invokeAwareInterfaces(bean);
                return null;
            }
        }, acc);
    }
    else {
        //否则就直接调用了
        invokeAwareInterfaces(bean);
    }

    return bean;
}
```

上面的方法始终都会调用invokeAwareInterfaces这个方法。

```java
private void invokeAwareInterfaces(Object bean) {
    if (bean instanceof Aware) {
        if (bean instanceof EnvironmentAware) {
            //setEnvironment
            ((EnvironmentAware) bean).setEnvironment(this.applicationContext.getEnvironment());
        }
        if (bean instanceof EmbeddedValueResolverAware) {
            //调用setEmbeddedValueResolver
            ((EmbeddedValueResolverAware) bean).setEmbeddedValueResolver(
                    new EmbeddedValueResolver(this.applicationContext.getBeanFactory()));
        }
        if (bean instanceof ResourceLoaderAware) {
            //调用setResourceLoader
            ((ResourceLoaderAware) bean).setResourceLoader(this.applicationContext);
        }
        if (bean instanceof ApplicationEventPublisherAware) {
            //调用setApplicationEventPublisher
            ((ApplicationEventPublisherAware) bean).setApplicationEventPublisher(this.applicationContext);
        }
        if (bean instanceof MessageSourceAware) {
            //调用setMessageSource
            ((MessageSourceAware) bean).setMessageSource(this.applicationContext);
        }
        if (bean instanceof ApplicationContextAware) {
            //调用setApplicationContext
            ((ApplicationContextAware) bean).setApplicationContext(this.applicationContext);
        }
    }
}
```

同理LoadTimeWeaverAwareProcessor里面实现也可以从postProcessBeforeInitialization的方法。这里就不介绍了。

### postProcessBeanFactory

继续介绍refresh方法里的方法postProcessBeanFactory\(beanFactory\);进去一看，一个未实现的空方法。干嘛用的？这个spring的提供的扩展，如果我们需要在容器所有bean定义被加载未实例化之前，我们可以注册一些BeanPostProcessors来实现在一些bean实例化之后做一些操作。

```java
protected void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
    }
```

继续往下走：invokeBeanFactoryPostProcessors

```java
protected void invokeBeanFactoryPostProcessors(ConfigurableListableBeanFactory beanFactory) {
    //这是一个比较复杂的方法了比较长。后面再看这个方法。
    //调用所有的BeanFactoryPostProcessors 
    //getBeanFactoryPostProcessors()这里获取的是一个list的集合。
    PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors(beanFactory, getBeanFactoryPostProcessors());
}
```

PostProcessorRegistrationDelegate 包含了beanPostProcessors的注册，和BeanFactoryPostProcessors的调用

```java
public static void invokeBeanFactoryPostProcessors(
        ConfigurableListableBeanFactory beanFactory, List<BeanFactoryPostProcessor> beanFactoryPostProcessors) {

    // Invoke BeanDefinitionRegistryPostProcessors first, if any.
    Set<String> processedBeans = new HashSet<String>();
    // 如果bean
    if (beanFactory instanceof BeanDefinitionRegistry) {
        BeanDefinitionRegistry registry = (BeanDefinitionRegistry) beanFactory;
        List<BeanFactoryPostProcessor> regularPostProcessors = new LinkedList<BeanFactoryPostProcessor>();
        List<BeanDefinitionRegistryPostProcessor> registryPostProcessors =
                new LinkedList<BeanDefinitionRegistryPostProcessor>();

        for (BeanFactoryPostProcessor postProcessor : beanFactoryPostProcessors) {
            //如果是BeanDefinitionRegistryPostProcessor的后置处理器就调用postProcessBeanDefinitionRegistry方法。然后加入registryPostProcessors集合
            if (postProcessor instanceof BeanDefinitionRegistryPostProcessor) {
                BeanDefinitionRegistryPostProcessor registryPostProcessor =
                        (BeanDefinitionRegistryPostProcessor) postProcessor;

                registryPostProcessor.postProcessBeanDefinitionRegistry(registry);
                registryPostProcessors.add(registryPostProcessor);
            }
            else {
                //否则就加入到寻常的后置处理器集合
                regularPostProcessors.add(postProcessor);
            }
        }

        // Do not initialize FactoryBeans here: We need to leave all regular beans
        // uninitialized to let the bean factory post-processors apply to them!
        // Separate between BeanDefinitionRegistryPostProcessors that implement
        // PriorityOrdered, Ordered, and the rest.
        //从容器中获取所有的BeanDefinitionRegistryPostProcessor后置处理器
        String[] postProcessorNames =
                beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);

        // First, invoke the BeanDefinitionRegistryPostProcessors that implement PriorityOrdered.
        // 获取@PriorityOrdered标记的BeanDefinitionRegistryPostProcessors
        List<BeanDefinitionRegistryPostProcessor> priorityOrderedPostProcessors = new ArrayList<BeanDefinitionRegistryPostProcessor>();
        for (String ppName : postProcessorNames) {

            if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
                priorityOrderedPostProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
                processedBeans.add(ppName);
            }
        }
        //排序
        sortPostProcessors(beanFactory, priorityOrderedPostProcessors);
        registryPostProcessors.addAll(priorityOrderedPostProcessors);
        //按照顺序调用BeanDefinitionRegistryPostProcessor
        invokeBeanDefinitionRegistryPostProcessors(priorityOrderedPostProcessors, registry);

        //获取@Order标记的BeanDefinitionRegistryPostProcessor
        postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
        List<BeanDefinitionRegistryPostProcessor> orderedPostProcessors = new ArrayList<BeanDefinitionRegistryPostProcessor>();
        for (String ppName : postProcessorNames) {
            //去除已经@PriorityOrdered标记的类，防止两个注解，同时找到，调用多次
            if (!processedBeans.contains(ppName) && beanFactory.isTypeMatch(ppName, Ordered.class)) {
                orderedPostProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
                processedBeans.add(ppName);
            }
        }
        sortPostProcessors(beanFactory, orderedPostProcessors);
        registryPostProcessors.addAll(orderedPostProcessors);
        //按照顺序调用BeanDefinitionRegistryPostProcessor
        invokeBeanDefinitionRegistryPostProcessors(orderedPostProcessors, registry);

        // 
        boolean reiterate = true;
        while (reiterate) {
            reiterate = false;
            postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
            for (String ppName : postProcessorNames) {
                if (!processedBeans.contains(ppName)) {
                    BeanDefinitionRegistryPostProcessor pp = beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class);
                    registryPostProcessors.add(pp);
                    processedBeans.add(ppName);
                    pp.postProcessBeanDefinitionRegistry(registry);
                    reiterate = true;
                }
            }
        }

        // 调用BeanDefinitionRegistryPostProcessor类的回调方法postProcessBeanFactory()
        invokeBeanFactoryPostProcessors(registryPostProcessors, beanFactory);
        // 寻常bean的回调方法postProcessBeanFactory
        invokeBeanFactoryPostProcessors(regularPostProcessors, beanFactory);
    }

    else {
        // 调用回调方法postProcessBeanFactory()
        invokeBeanFactoryPostProcessors(beanFactoryPostProcessors, beanFactory);
    }


    String[] postProcessorNames =
            beanFactory.getBeanNamesForType(BeanFactoryPostProcessor.class, true, false);

    // Separate between BeanFactoryPostProcessors that implement PriorityOrdered,
    // Ordered, and the rest.
    List<BeanFactoryPostProcessor> priorityOrderedPostProcessors = new ArrayList<BeanFactoryPostProcessor>();
    List<String> orderedPostProcessorNames = new ArrayList<String>();
    List<String> nonOrderedPostProcessorNames = new ArrayList<String>();
    for (String ppName : postProcessorNames) {
        if (processedBeans.contains(ppName)) {
            // skip - already processed in first phase above
        }
        else if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
            priorityOrderedPostProcessors.add(beanFactory.getBean(ppName, BeanFactoryPostProcessor.class));
        }
        else if (beanFactory.isTypeMatch(ppName, Ordered.class)) {
            orderedPostProcessorNames.add(ppName);
        }
        else {
            nonOrderedPostProcessorNames.add(ppName);
        }
    }

    sortPostProcessors(beanFactory, priorityOrderedPostProcessors);
    invokeBeanFactoryPostProcessors(priorityOrderedPostProcessors, beanFactory);

    List<BeanFactoryPostProcessor> orderedPostProcessors = new ArrayList<BeanFactoryPostProcessor>();
    for (String postProcessorName : orderedPostProcessorNames) {
        orderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
    }
    sortPostProcessors(beanFactory, orderedPostProcessors);
    invokeBeanFactoryPostProcessors(orderedPostProcessors, beanFactory);

    List<BeanFactoryPostProcessor> nonOrderedPostProcessors = new ArrayList<BeanFactoryPostProcessor>();
    for (String postProcessorName : nonOrderedPostProcessorNames) {
        nonOrderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
    }
    invokeBeanFactoryPostProcessors(nonOrderedPostProcessors, beanFactory);

    // 清理元数据缓存
    beanFactory.clearMetadataCache();
}
```

### registerBeanPostProcessors

继续往下走：registerBeanPostProcessors

```java
protected void registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory) {
    //注册BeanPostProcessors后面统一看这个PostProcessorRegistrationDelegate
    PostProcessorRegistrationDelegate.registerBeanPostProcessors(beanFactory, this);
}
```

### initMessageSource

继续往下看：initMessageSource 用以支持Spring国际化。

```java
protected void initMessageSource() {
    //拿到当前的beanFactory
    ConfigurableListableBeanFactory beanFactory = getBeanFactory();
    //如果已经存在MessageSource了
    if (beanFactory.containsLocalBean(MESSAGE_SOURCE_BEAN_NAME)) {
        this.messageSource = beanFactory.getBean(MESSAGE_SOURCE_BEAN_NAME, MessageSource.class);
        // Make MessageSource aware of parent MessageSource.
        if (this.parent != null && this.messageSource instanceof HierarchicalMessageSource) {
            //HierarchicalMessageSource采用的职责链的设计模式。
            //如果消息当前对象处理不了，就将消息给上级父对象处理，把消息分层次处理。
            HierarchicalMessageSource hms = (HierarchicalMessageSource) this.messageSource;
            if (hms.getParentMessageSource() == null) {
                //如果父消息源不为空，就设置父消息源，
                hms.setParentMessageSource(getInternalParentMessageSource());
            }
        }
        if (logger.isDebugEnabled()) {
            logger.debug("Using MessageSource [" + this.messageSource + "]");
        }
    }
    else {
        // Use empty MessageSource to be able to accept getMessage calls.
        // 包装一个空的消息源可以用getMessage方法调用。
        DelegatingMessageSource dms = new DelegatingMessageSource();
        // 设置父消息源
        dms.setParentMessageSource(getInternalParentMessageSource());
        this.messageSource = dms;
        beanFactory.registerSingleton(MESSAGE_SOURCE_BEAN_NAME, this.messageSource);
        if (logger.isDebugEnabled()) {
            logger.debug("Unable to locate MessageSource with name '" + MESSAGE_SOURCE_BEAN_NAME +
                    "': using default [" + this.messageSource + "]");
        }
    }
}
```

### initApplicationEventMulticaster

继续：initApplicationEventMulticaster 初始化事件广播器。可以通过multicastEvent方法广播消息

```java
protected void initApplicationEventMulticaster() {
    ConfigurableListableBeanFactory beanFactory = getBeanFactory();
    //如果容器里面有就直接拿出来用，如果没有就初始化一个。
    if (beanFactory.containsLocalBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME)) {
        this.applicationEventMulticaster =
                beanFactory.getBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, ApplicationEventMulticaster.class);
        if (logger.isDebugEnabled()) {
            logger.debug("Using ApplicationEventMulticaster [" + this.applicationEventMulticaster + "]");
        }
    }
    else {
        this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
        beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, this.applicationEventMulticaster);
        if (logger.isDebugEnabled()) {
            logger.debug("Unable to locate ApplicationEventMulticaster with name '" +
                    APPLICATION_EVENT_MULTICASTER_BEAN_NAME +
                    "': using default [" + this.applicationEventMulticaster + "]");
        }
    }
}
```

### onRefresh

继续：onRefresh方法也是一个模版方法，空方法，目的也是为了给子类继承用的。AbstractRefreshableWebApplicationContext、StaticWebApplicationContext用这个方法来刷新初始化主题源。  
继续：registerListeners 注册监听器

```java
protected void registerListeners() {
    //把监听者加入到事件广播器
    for (ApplicationListener<?> listener : getApplicationListeners()) {
        getApplicationEventMulticaster().addApplicationListener(listener);
    }

    //获取所有的ApplicationListener的bean的名字，然后把bean名字加入到事件广播器
    String[] listenerBeanNames = getBeanNamesForType(ApplicationListener.class, true, false);
    for (String listenerBeanName : listenerBeanNames) {
        getApplicationEventMulticaster().addApplicationListenerBean(listenerBeanName);
    }

    //拿到所有的earlyApplicationEvents事件消息，直接广播发送事件给所有的监听者。
    Set<ApplicationEvent> earlyEventsToProcess = this.earlyApplicationEvents;
    this.earlyApplicationEvents = null;
    if (earlyEventsToProcess != null) {
        for (ApplicationEvent earlyEvent : earlyEventsToProcess) {
            getApplicationEventMulticaster().multicastEvent(earlyEvent);
        }
    }
}
```

### finishBeanFactoryInitialization

继续：finishBeanFactoryInitialization  
初始化非延迟加载的单例Bean， 实例化BeanFactory中已经被注册但是未实例化的所有实例\(@Lazy注解的Bean不在此实例化\)。

```java
protected void finishBeanFactoryInitialization(ConfigurableListableBeanFactory beanFactory) {
    // 初始化类型转换器
    if (beanFactory.containsBean(CONVERSION_SERVICE_BEAN_NAME) &&
            beanFactory.isTypeMatch(CONVERSION_SERVICE_BEAN_NAME, ConversionService.class)) {
        beanFactory.setConversionService(
                beanFactory.getBean(CONVERSION_SERVICE_BEAN_NAME, ConversionService.class));
    }

    //获取LoadTimeWeaverAware.class的单例bean
    String[] weaverAwareNames = beanFactory.getBeanNamesForType(LoadTimeWeaverAware.class, false, false);
    for (String weaverAwareName : weaverAwareNames) {
        getBean(weaverAwareName);
    }

    // 停止使用零时加载器
    beanFactory.setTempClassLoader(null);

    // 允许缓存所有的bean的定义，不允许修改
    beanFactory.freezeConfiguration();

    // 初始化所有的单例bean，@lazy bean不在这里初始化
    beanFactory.preInstantiateSingletons();
}
```

### finishRefresh

继续：finishRefresh   
refresh结束之前需要做善后工作。包括生命周期组件LifecycleProcessor的初始化和调用、事件发布、JMX组件的处理等。

```java
protected void finishRefresh() {
    // 初始化生命周期组件LifecycleProcessor
    initLifecycleProcessor();

    // 调用一次生命周期组件LifecycleProcessor
    getLifecycleProcessor().onRefresh();

    // 发布容器刷新事件
    publishEvent(new ContextRefreshedEvent(this));

    // 向MBeanServer注册LiveBeansView，可以通过JMX来监控此ApplicationContext。
    LiveBeansView.registerApplicationContext(this);
}
```
这个类refresh方法干的活也是有很多，其中就包括BeanFactory的设置、Configuration类解析、Bean实例化、属性和依赖注入、事件监听器注册。下面会继续去分析一下每一步是怎样实现的。

# Environment 接口

## 继承图谱

![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558102717211.png)

往上继承了PropertyResolver 属性解析器，Environment接口里面有三个独立的方法如下：

```java
String[] getDefaultProfiles();
String[] getActiveProfiles();
boolean acceptsProfiles(String... profiles);
```
都和Profile有关系。Spring Profile特性是从3.1开始的，其主要是为了解决这样一种问题: 线上环境和测试环境使用不同的配置或是数据库或是其它。有了Profile便可以在 不同环境之间无缝切换。**Spring容器管理的所有bean都是和一个profile绑定在一起的。**使用了Profile的配置文件示例:
```xml
<beans profile="develop">  
    <context:property-placeholder location="classpath*:jdbc-develop.properties"/>  
</beans>  
<beans profile="production">  
    <context:property-placeholder location="classpath*:jdbc-production.properties"/>  
</beans>  
<beans profile="test">  
    <context:property-placeholder location="classpath*:jdbc-test.properties"/>  
</beans>
```
可以通过context.getEnvironment().setActiveProfiles("dev");
或者spring.profiles.active=dev 进行设置。spring 中Environment 默认就是 StandardEnvironment实例。
```java
public class StandardEnvironment extends AbstractEnvironment {

    /** System environment property source name: {@value} */
    //系统级环境参数可以通过{@systemEnvironment[xxx]},或者{#systemEnvironment[xxx]}获取
    public static final String SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME = "systemEnvironment";

    /** JVM system properties property source name: {@value} */
    //jvm层面级参数可以通过{@systemProperties[xxx]},或者{#systemProperties[xxx]}获取
    public static final String SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME = "systemProperties";
    //在实例化的时候，会调用父类里面的构造方法，而父类的构造方法里会调用此方法。
    protected void customizePropertySources(MutablePropertySources propertySources) {
        //MapPropertySource其实就是MaP对象的封装
        propertySources.addLast(new MapPropertySource(SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME, getSystemProperties()));
        //SystemEnvironmentPropertySource继承的MapPropertySource，其实里面也是map对象
        propertySources.addLast(new SystemEnvironmentPropertySource(SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, getSystemEnvironment()));
    }

}
```
MutablePropertySources是PropertySources的实现类。里面封装了一个Log对象，和用一个CopyOnWriteArrayList实现的一个PropertySource的一个集合，里面有一个PropertySourcesPropertyResolver解析器，这个解析器在PropertyResolver章节分析。
在StandardEnvironment实例化的时调用AbstractEnvironment构造方法。
```java
public AbstractEnvironment() {
    //此时这里就会被子类的customizePropertySources给复写掉。会调用子类的方法。
    //此时的this.propertySources=new MutablePropertySources(this.logger);
    //此时MutablePropertySources对象只有龙对象，PropertySource集合是空的
    //通过子类的propertySources.addLast往里面加入PropertySource对象。

    customizePropertySources(this.propertySources);
    if (this.logger.isDebugEnabled()) {
        this.logger.debug(format(
                "Initialized %s with PropertySources %s", getClass().getSimpleName(), this.propertySources));
    }
}
```
再看看StandardEnvironment#getSystemProperties函数:
这个函数就是调用System.getProperties获取所有的系统配置，如果系统管理说没有权限获取，就一条一条的获取，这个地方我不甚理解。why？
```
public Map<String, Object> getSystemProperties() {
    try {
        return (Map) System.getProperties();
    }
    catch (AccessControlException ex) {
        return (Map) new ReadOnlySystemAttributesMap() {
            @Override
            protected String getSystemAttribute(String attributeName) {
                try {
                    return System.getProperty(attributeName);
                }
                catch (AccessControlException ex) {
                    if (logger.isInfoEnabled()) {
                        logger.info(format("Caught AccessControlException when accessing system " +
                                "property [%s]; its value will be returned [null]. Reason: %s",
                                attributeName, ex.getMessage()));
                    }
                    return null;
                }
            }
        };
    }
}
```
同样的getSystemEnvironment函数：
是调用的System.getenv获取jvm级系统参数，包活jdk版本，os参数等。
```java
public Map<String, Object> getSystemEnvironment() {
    //这一句会从spring.properties文件里找spring.getenv.ignore标识
    //如果spring.getenv.ignore=true就返回空，
    //如果不为空就调用System.getenv获取jvm系统级参数。
    if (suppressGetenvAccess()) {
        return Collections.emptyMap();
    }
    try {
        return (Map) System.getenv();
    }
    catch (AccessControlException ex) {
        return (Map) new ReadOnlySystemAttributesMap() {
            @Override
            protected String getSystemAttribute(String attributeName) {
                try {
                    return System.getenv(attributeName);
                }
                catch (AccessControlException ex) {
                    if (logger.isInfoEnabled()) {
                        logger.info(format("Caught AccessControlException when accessing system " +
                                "environment variable [%s]; its value will be returned [null]. Reason: %s",
                                attributeName, ex.getMessage()));
                    }
                    return null;
                }
            }
        };
    }
}
```
再看看Environment接口里的三个私有方法的实现：
```java
@Override
public String[] getActiveProfiles() {
    return StringUtils.toStringArray(doGetActiveProfiles());
}
@Override
public String[] getDefaultProfiles() {
    return StringUtils.toStringArray(doGetDefaultProfiles());
}
public boolean acceptsProfiles(String... profiles) {
    Assert.notEmpty(profiles, "Must specify at least one profile");
    for (String profile : profiles) {
        //这里判断的是以！开头的profile配置。
        if (StringUtils.hasLength(profile) && profile.charAt(0) == '!') {
            //双重否定
            if (!isProfileActive(profile.substring(1))) {
                return true;
            }
        }
        else if (isProfileActive(profile)) {
            return true;
        }
    }
    return false;
}
```
```java
protected Set<String> doGetActiveProfiles() {
    synchronized (this.activeProfiles) {
        if (this.activeProfiles.isEmpty()) {
            //拿到spring.profiles.active的配置。
            //spring.profiles.active=dev,prod 如果有多个可以用逗号分割。实际应用估计也很少用到多个吧。
            String profiles = getProperty(ACTIVE_PROFILES_PROPERTY_NAME);
            if (StringUtils.hasText(profiles)) {
                //拿到值去除空白字符串按照逗号分割成一个数组
                setActiveProfiles(commaDelimitedListToStringArray(trimAllWhitespace(profiles)));
            }
        }
        return this.activeProfiles;
    }
}
```
```java
protected Set<String> doGetDefaultProfiles() {
    synchronized (this.defaultProfiles) {
    //如果是default就拿到spring.profiles.default的配置的值，
    //同样spring.profiles.default也是可以配置多个的，按照逗号分隔。
        if (this.defaultProfiles.equals(getReservedDefaultProfiles())) {
            String profiles = getProperty(DEFAULT_PROFILES_PROPERTY_NAME);
            if (StringUtils.hasText(profiles)) {
                setDefaultProfiles(commaDelimitedListToStringArray(trimAllWhitespace(profiles)));
            }
        }
        return this.defaultProfiles;
    }
}
```
以上关于环境配置相关配置的代码阅读。

# PropertyResolver接口

## 继承图谱 

![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558145690624.png)

PropertySourcesPropertyResolver类里面有一个PropertySources的成员变量。类的很多方法实现都是调用的这个PropertySources成员变量的方法。PropertySourcesPropertyResolver可以通过getProperty(key)的方式获取对应的value值。
那么PropertySourcesPropertyResolver有哪些东西呢？主要看这个方法：
```java
protected <T> T getProperty(String key, Class<T> targetValueType, boolean resolveNestedPlaceholders) {
    boolean debugEnabled = logger.isDebugEnabled();
    if (logger.isTraceEnabled()) {
        logger.trace(String.format("getProperty(\"%s\", %s)", key, targetValueType.getSimpleName()));
    }
    if (this.propertySources != null) {
        //遍历所有已经加载到的PropertySource
        for (PropertySource<?> propertySource : this.propertySources) {
            if (debugEnabled) {
                logger.debug(String.format("Searching for key '%s' in [%s]", key, propertySource.getName()));
            }
            Object value;
            if ((value = propertySource.getProperty(key)) != null) {
                Class<?> valueType = value.getClass();
                //如果是字符串，同时要求字符替换的就调用字符替换方法

                if (resolveNestedPlaceholders && value instanceof String) {
                    value = resolveNestedPlaceholders((String) value);
                }
                if (debugEnabled) {
                    logger.debug(String.format("Found key '%s' in [%s] with type [%s] and value '%s'",
                            key, propertySource.getName(), valueType.getSimpleName(), value));
                }
                //如果不是字符串类型，就根据属性转换器尽心数据转换，
                //如果类型是属性转换器无法转换的就知道抛出异常
                if (!this.conversionService.canConvert(valueType, targetValueType)) {
                    throw new IllegalArgumentException(String.format(
                            "Cannot convert value [%s] from source type [%s] to target type [%s]",
                            value, valueType.getSimpleName(), targetValueType.getSimpleName()));
                }
                return this.conversionService.convert(value, targetValueType);
            }
        }
    }
    if (debugEnabled) {
        logger.debug(String.format("Could not find key '%s' in any property source. Returning [null]", key));
    }
    return null;
}
```

看看resolveNestedPlaceholders方法
```java
protected String resolveNestedPlaceholders(String value) {
    //如果PropertySourcesPropertyResolver上属性设置了ignoreUnresolvableNestedPlaceholders值为true可以忽略一些不存在key的属性。
    //如果为false，key不存在的属性直接就会抛出异常。
    return (this.ignoreUnresolvableNestedPlaceholders ?
            resolvePlaceholders(value) : resolveRequiredPlaceholders(value));
}
```
```java
public String resolveRequiredPlaceholders(String text) throws IllegalArgumentException {
    if (this.strictHelper == null) {
        //实例化一个PropertyPlaceholderHelper类，
        this.strictHelper = createPlaceholderHelper(false);
    }
    //用PropertyPlaceholderHelper类去解析属性
    return doResolvePlaceholders(text, this.strictHelper);
}
```
```java
@Override
public String resolvePlaceholders(String text) {
    if (this.nonStrictHelper == null) {
        this.nonStrictHelper = createPlaceholderHelper(true);
    }
    return doResolvePlaceholders(text, this.nonStrictHelper);
}
```
createPlaceholderHelper：
```java
//根据ignoreUnresolvablePlaceholders来创建PropertyPlaceholderHelper
//placeholderPrefix 是替换的前缀，默认值是${
//placeholderSuffix 是替换的后缀，默认值是}
//valueSeparator 是值的分隔符，默认是：
private PropertyPlaceholderHelper createPlaceholderHelper(boolean ignoreUnresolvablePlaceholders) {
    return new PropertyPlaceholderHelper(this.placeholderPrefix, this.placeholderSuffix,
            this.valueSeparator, ignoreUnresolvablePlaceholders);
}
```
再看看doResolvePlaceholders这个方法
```java
private String doResolvePlaceholders(String text, PropertyPlaceholderHelper helper) {
    //调用的就是PropertyPlaceholderHelper的replacePlaceholders方法
    //replacePlaceholders这个方法就会把text中包含${value}的值给替换成properties中value的值：比如:text是foo=${foo},而foo在properties的值是bar 那么text被替换后就是foo=bar。
    //这个方法会通过接口回调的方式调用getPropertyAsRawString方法
    return helper.replacePlaceholders(text, new PropertyPlaceholderHelper.PlaceholderResolver() {
        @Override
        public String resolvePlaceholder(String placeholderName) {
            //这个方法就是从properties里面以字符串的方式读取数据
            return getPropertyAsRawString(placeholderName);
        }
    });
}
```
先看看PropertyPlaceholderHelper的构造方法：
```java
//构造方法其实很简单就是一系列的赋值。
public PropertyPlaceholderHelper(String placeholderPrefix, String placeholderSuffix,
            String valueSeparator, boolean ignoreUnresolvablePlaceholders) {

    Assert.notNull(placeholderPrefix, "'placeholderPrefix' must not be null");
    Assert.notNull(placeholderSuffix, "'placeholderSuffix' must not be null");
    //placeholderPrefix默认值是${
    this.placeholderPrefix = placeholderPrefix;
    //placeholderSuffix默认值是}
    this.placeholderSuffix = placeholderSuffix;
    //wellKnownSimplePrefixes是一个map，里面存放着“{”,"}"、“[“,"]"、"(",")"。三对键值对。
    //默认拿到的是{
    String simplePrefixForSuffix = wellKnownSimplePrefixes.get(this.placeholderSuffix);
    if (simplePrefixForSuffix != null && this.placeholderPrefix.endsWith(simplePrefixForSuffix)) {
        //simplePrefix被赋值成{
        this.simplePrefix = simplePrefixForSuffix;
    }
    else {
        this.simplePrefix = this.placeholderPrefix;
    }
    this.valueSeparator = valueSeparator;
    this.ignoreUnresolvablePlaceholders = ignoreUnresolvablePlaceholders;
}
```
继续看replacePlaceholders:
```java
public String replacePlaceholders(String value, PlaceholderResolver placeholderResolver) {
    Assert.notNull(value, "'value' must not be null");
    //这是一个递归的方法。替换${}包围的值。
    return parseStringValue(value, placeholderResolver, new HashSet<String>());
}
```
看看这个方法：这里简单的替换就不介绍了，主要看看多次的递归调用是如何实现的。
比如:foo=${b${hello}};
```java
protected String parseStringValue(
        String strVal, PlaceholderResolver placeholderResolver, Set<String> visitedPlaceholders) {

    StringBuilder result = new StringBuilder(strVal);

    int startIndex = strVal.indexOf(this.placeholderPrefix);
    while (startIndex != -1) {
        int endIndex = findPlaceholderEndIndex(result, startIndex);
        if (endIndex != -1) {
            //1.第一次拿到的是b${hello}
            //2.第二次拿到的是hello
            String placeholder = result.substring(startIndex + this.placeholderPrefix.length(), endIndex);
            String originalPlaceholder = placeholder;
            //不允许循环替换
            //1.将b${hello}放入set集合
            //2.将hello放入set集合
            if (!visitedPlaceholders.add(originalPlaceholder)) {
                throw new IllegalArgumentException(
                        "Circular placeholder reference '" + originalPlaceholder + "' in property definitions");
            }
            // Recursive invocation, parsing placeholders contained in the placeholder key.
            //1.用b${hello}去placeholde
            //
            placeholder = parseStringValue(placeholder, placeholderResolver, visitedPlaceholders);
            // Now obtain the value for the fully resolved key...
            //调用PlaceholderResolver接口里面的方法。
            //这里其实就是获取${key},key的属性的值了。
            String propVal = placeholderResolver.resolvePlaceholder(placeholder);
            //如果属性值是null且this.valueSeparator不为空
            if (propVal == null && this.valueSeparator != null) {
                //判断是否有:。
                //例如foo:foo1 此时foo1为foo的默认值。如果从配置里面获取不到foo的值就使用默认值。
                int separatorIndex = placeholder.indexOf(this.valueSeparator);
                if (separatorIndex != -1) {
                    //拿到:符号之前的字符串
                    String actualPlaceholder = placeholder.substring(0, separatorIndex);
                    String defaultValue = placeholder.substring(separatorIndex + this.valueSeparator.length());
                    //继续获取key的值
                    propVal = placeholderResolver.resolvePlaceholder(actualPlaceholder);
                    if (propVal == null) {
                        propVal = defaultValue;
                    }
                }
            }
            //值这一部分很有意思，这一部分会把拿到的值检测全部替换一次。如果值里面也有${code},
            if (propVal != null) {
                // Recursive invocation, parsing placeholders contained in the
                // previously resolved placeholder value.
                //获取值的
                propVal = parseStringValue(propVal, placeholderResolver, visitedPlaceholders);
                //递归调用基本都是执行最里层的调用，然后一层一层的回归。替换最里层的字符串。
                result.replace(startIndex, endIndex + this.placeholderSuffix.length(), propVal);
                if (logger.isTraceEnabled()) {
                    logger.trace("Resolved placeholder '" + placeholder + "'");
                }
                //重新获取$的位置。
                startIndex = result.indexOf(this.placeholderPrefix, startIndex + propVal.length());
            }
            //这里是那些没有被替换的值的处理
            else if (this.ignoreUnresolvablePlaceholders) {
                // Proceed with unprocessed value.
                startIndex = result.indexOf(this.placeholderPrefix, endIndex + this.placeholderSuffix.length());
            }
            else {
                throw new IllegalArgumentException("Could not resolve placeholder '" +
                        placeholder + "'" + " in string value \"" + strVal + "\"");
            }
            visitedPlaceholders.remove(originalPlaceholder);
        }
        else {
            startIndex = -1;
        }
    }

    return result.toString();
}
```
这一块可以举个例子:大家就清楚了
```java
public void testRecurseInProperty() {
    String text = "foo=${bar}";
    final Properties props = new Properties();
    props.setProperty("bar", "${baz}");
    props.setProperty("baz", "bar");
    PropertyPlaceholderHelper helper = new PropertyPlaceholderHelper("${", "}");
    assertEquals("foo=bar",helper.replacePlaceholders(text, new PropertyPlaceholderHelper.PlaceholderResolver() {
        @Override
        public String resolvePlaceholder(String placeholderName) {
            return props.getProperty(placeholderName);
        }
    }));
}
```
再看一个例子：
```java
final PropertyPlaceholderHelper helper = new PropertyPlaceholderHelper("${", "}");

public void testRecurseInPlaceholder() {
        String text = "foo=${b${inner}}";
        Properties props = new Properties();
        props.setProperty("bar", "bar");
        props.setProperty("inner", "ar");

        assertEquals("foo=bar", this.helper.replacePlaceholders(text, props));

        text = "${top}";
        props = new Properties();
        props.setProperty("top", "${child}+${child}");
        props.setProperty("child", "${${differentiator}.grandchild}");
        props.setProperty("differentiator", "first");
        props.setProperty("first.grandchild", "actualValue");
        //这里是replacePlaceholders的另外的一个方法。
        assertEquals("actualValue+actualValue", this.helper.replacePlaceholders(text, props));
    }
```
介绍到这里就知道我们spring对于我们配置中${code}是如何处理的。但是我们的xml的配置压根就没有解析，仅仅只是对jvm环境变量参数，以及系统环境参数的一个字符替换而已。例如：
```java
System.setProperty("spring", "classpath");
ClassPathXmlApplicationContext context = new ClassPathXmlApplicationContext("${spring}:config.xml");
SimpleBean bean = context.getBean(SimpleBean.class);
```
# beanFactory的创建
上面其实我们已经见到了beanFactory的方法：DefaultListableBeanFactory beanFactory = createBeanFactory();直接new DefaultListableBeanFactory的一个beanFactory实例。

# configuration的加载

```java
@Override
protected void loadBeanDefinitions(DefaultListableBeanFactory beanFactory) throws BeansException, IOException {
    //创建一个读取bean的配置文件的加载器
    XmlBeanDefinitionReader beanDefinitionReader = new XmlBeanDefinitionReader(beanFactory);

    // Configure the bean definition reader with this context's
    // resource loading environment.
    // 父类被设值了就是StandardEnvironment
    beanDefinitionReader.setEnvironment(this.getEnvironment());
    // 这里其实被赋值的是DefaultResourceLoader的子类。
    beanDefinitionReader.setResourceLoader(this);
    // 设置资源实体的解析器
    beanDefinitionReader.setEntityResolver(new ResourceEntityResolver(this));

    // Allow a subclass to provide custom initialization of the reader,
    // then proceed with actually loading the bean definitions.
    initBeanDefinitionReader(beanDefinitionReader);
    loadBeanDefinitions(beanDefinitionReader);
}
```
## XmlBeanDefinitionReader
先看一下这个类的继承图谱
### 继承图谱
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558273300511.png)
### 构造方法
XmlBeanDefinitionReader会调用父类的构造方法尽行初始化环境，初始化类加载器。
```
protected AbstractBeanDefinitionReader(BeanDefinitionRegistry registry) {
    Assert.notNull(registry, "BeanDefinitionRegistry must not be null");
    this.registry = registry;

    //DefaultListableBeanFactory不是ResourceLoader的类型
    if (this.registry instanceof ResourceLoader) {
        this.resourceLoader = (ResourceLoader) this.registry;
    }
    else {
        //资源加载器PathMatchingResourcePatternResolver
        //但是会被子类的setResourceLoader覆盖掉。
        this.resourceLoader = new PathMatchingResourcePatternResolver();
    }

    //DefaultListableBeanFactory也不是EnvironmentCapable
    if (this.registry instanceof EnvironmentCapable) {
        this.environment = ((EnvironmentCapable) this.registry).getEnvironment();
    }
    else {
        //初始化环境变量
        this.environment = new StandardEnvironment();
    }
}
```
### bean的加载

```java
public int loadBeanDefinitions(String location, Set<Resource> actualResources) throws BeanDefinitionStoreException {
    ResourceLoader resourceLoader = getResourceLoader();
    if (resourceLoader == null) {
        throw new BeanDefinitionStoreException(
                "Cannot import bean definitions from location [" + location + "]: no ResourceLoader available");
    }
    //因为ClassPathApplicationContext实现了ResourcePatternResolver 

    if (resourceLoader instanceof ResourcePatternResolver) {
        // Resource pattern matching available.
        try {
            //这一句会拿到ResourcePatternResolver的对象。
            //加载资源文件
            Resource[] resources = ((ResourcePatternResolver) resourceLoader).getResources(location);
            //加载所有的bean
            int loadCount = loadBeanDefinitions(resources);
            //这里不会执行，因为actualResources是null
            if (actualResources != null) {
                for (Resource resource : resources) {
                    actualResources.add(resource);
                }
            }
            if (logger.isDebugEnabled()) {
                logger.debug("Loaded " + loadCount + " bean definitions from location pattern [" + location + "]");
            }
            return loadCount;
        }
        catch (IOException ex) {
            throw new BeanDefinitionStoreException(
                    "Could not resolve bean definition resource pattern [" + location + "]", ex);
        }
    }
    else {
        // Can only load single resources by absolute URL.
        Resource resource = resourceLoader.getResource(location);
        int loadCount = loadBeanDefinitions(resource);
        if (actualResources != null) {
            actualResources.add(resource);
        }
        if (logger.isDebugEnabled()) {
            logger.debug("Loaded " + loadCount + " bean definitions from location [" + location + "]");
        }
        return loadCount;
    }
}
    
```
### getResources

看看getResources的方法
```java
public Resource[] getResources(String locationPattern) throws IOException {
    // 因为resourcePatternResolver是PathMatchingResourcePatternResolver的实例
    // 所以会调用PathMatchingResourcePatternResolver的getResources方法
    return this.resourcePatternResolver.getResources(locationPattern);
}
```

```java

public Resource[] getResources(String locationPattern) throws IOException {
    Assert.notNull(locationPattern, "Location pattern must not be null");
    //如果是以classpath*:开头的
    if (locationPattern.startsWith(CLASSPATH_ALL_URL_PREFIX)) {
        // a class path resource (multiple resources for same name possible)
        // 拿到的是AntPathMatcher实例。
        // 如果包含*或者？就匹配成功
        if (getPathMatcher().isPattern(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()))) {
            // a class path resource pattern
            //
            return findPathMatchingResources(locationPattern);
        }
        else {
            // all class path resources with the given name
            // 路径没有？或者*
            return findAllClassPathResources(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()));
        }
    }
    else {
        // Only look for a pattern after a prefix here
        // (to not get fooled by a pattern symbol in a strange prefix).
        int prefixEnd = locationPattern.indexOf(":") + 1;
        if (getPathMatcher().isPattern(locationPattern.substring(prefixEnd))) {
            // a file pattern
            return findPathMatchingResources(locationPattern);
        }
        else {
            // a single resource with the given name
            return new Resource[] {getResourceLoader().getResource(locationPattern)};
        }
    }
}
```
看看里面
```java
public boolean isPattern(String path) {
    return (path.indexOf('*') != -1 || path.indexOf('?') != -1);
}
```
### findPathMatchingResources
```java
protected Resource[] findPathMatchingResources(String locationPattern) throws IOException {
    //如果是"/WEB-INF/*.xml 拿到的值是"/WEB-INF/"
    //如果是"/WEB-INF/*/*.xml"拿到是“/WEB-INF/*/”
    //如果是“classpath：context/*.xml”拿到的是“classpath：context/”
    // 获取文件的根路径
    String rootDirPath = determineRootDir(locationPattern);
    // 获取正则表达式
    String subPattern = locationPattern.substring(rootDirPath.length());
    // 重新调用getResources，两个方法又开始循环调用了
    // 如果是“classpath：context/”那此事会调用getResources里的子方法findAllClassPathResources
    // findAllClassPathResources会拿到目录下的所有资源
    Resource[] rootDirResources = getResources(rootDirPath);
    Set<Resource> result = new LinkedHashSet<Resource>(16);
    for (Resource rootDirResource : rootDirResources) {
        
        rootDirResource = resolveRootDirResource(rootDirResource);
        //加载vfs文件
        if (rootDirResource.getURL().getProtocol().startsWith(ResourceUtils.URL_PROTOCOL_VFS)) {
            result.addAll(VfsResourceMatchingDelegate.findMatchingResources(rootDirResource, subPattern, getPathMatcher()));
        }
        //加载jar里面的文件
        else if (isJarResource(rootDirResource)) {
            result.addAll(doFindPathMatchingJarResources(rootDirResource, subPattern));
        }
        else {
            //最后才是加载本地系统的文件
            result.addAll(doFindPathMatchingFileResources(rootDirResource, subPattern));
        }
    }
    if (logger.isDebugEnabled()) {
        logger.debug("Resolved location pattern [" + locationPattern + "] to resources " + result);
    }
    return result.toArray(new Resource[result.size()]);
}
```
### findAllClassPathResources

```java
protected Resource[] findAllClassPathResources(String location) throws IOException {
    String path = location;
    if (path.startsWith("/")) {
        path = path.substring(1);
    }
    Set<Resource> result = doFindAllClassPathResources(path);
    return result.toArray(new Resource[result.size()]);
}
```
再看看
```java
protected Set<Resource> doFindAllClassPathResources(String path) throws IOException {
    Set<Resource> result = new LinkedHashSet<Resource>(16);
    ClassLoader cl = getClassLoader();
    Enumeration<URL> resourceUrls = (cl != null ? cl.getResources(path) : ClassLoader.getSystemResources(path));
    while (resourceUrls.hasMoreElements()) {
        URL url = resourceUrls.nextElement();
        result.add(convertClassLoaderURL(url));
    }
    if ("".equals(path)) {
        // The above result is likely to be incomplete, i.e. only containing file system references.
        // We need to have pointers to each of the jar files on the classpath as well...
        addAllClassLoaderJarRoots(cl, result);
    }
    return result;
}
```
说到这里仅仅也只是spring是如何找文件的。这里还没有文件的读取和解析。
下面介绍spring配置文件的读取和解析。
```java 
public int loadBeanDefinitions(EncodedResource encodedResource) throws BeanDefinitionStoreException {
    Assert.notNull(encodedResource, "EncodedResource must not be null");
    if (logger.isInfoEnabled()) {
        logger.info("Loading XML bean definitions from " + encodedResource.getResource());
    }
    // TheadLocal的已经加载的资源set集合。
    Set<EncodedResource> currentResources = this.resourcesCurrentlyBeingLoaded.get();
    if (currentResources == null) {
        currentResources = new HashSet<EncodedResource>(4);
        this.resourcesCurrentlyBeingLoaded.set(currentResources);
    }
    if (!currentResources.add(encodedResource)) {
        throw new BeanDefinitionStoreException(
                "Detected cyclic loading of " + encodedResource + " - check your import definitions!");
    }
    //以下这段代码就是真实读取文件的逻辑了。
    try {
        InputStream inputStream = encodedResource.getResource().getInputStream();
        try {
            InputSource inputSource = new InputSource(inputStream);
            if (encodedResource.getEncoding() != null) {
                inputSource.setEncoding(encodedResource.getEncoding());
            }
            return doLoadBeanDefinitions(inputSource, encodedResource.getResource());
        }
        finally {
            inputStream.close();
        }
    }
    catch (IOException ex) {
        throw new BeanDefinitionStoreException(
                "IOException parsing XML document from " + encodedResource.getResource(), ex);
    }
    finally {
        currentResources.remove(encodedResource);
        if (currentResources.isEmpty()) {
            this.resourcesCurrentlyBeingLoaded.remove();
        }
    }
}
```
### doLoadBeanDefinitions
```java
protected int doLoadBeanDefinitions(InputSource inputSource, Resource resource)
            throws BeanDefinitionStoreException {
    // 读取文件
    Document doc = doLoadDocument(inputSource, resource);
    // 这个方法里面就是配置文件的解析了。
    return registerBeanDefinitions(doc, resource);
}
```
### doLoadDocument
```java
protected Document doLoadDocument(InputSource inputSource, Resource resource) throws Exception {
    // documentLoader是一个DefaultDocumentLoader对象，此类是DocumentLoader接口的唯一实现。
    // getEntityResolver方法返回ResourceEntityResolver,
    // ResourceEntityResolver会用xsd或者dtd约束文件做校验。
    // errorHandler是一个SimpleSaxErrorHandler对象。
    return this.documentLoader.loadDocument(inputSource, getEntityResolver(), this.errorHandler,
            getValidationModeForResource(resource), isNamespaceAware());
}
```

### loadDocument

```java
/**
** 这里就是老套路了，可以看出，Spring还是使用了dom的方式解析，即一次全部load到内存
**/
public Document loadDocument(InputSource inputSource, EntityResolver entityResolver,
        ErrorHandler errorHandler, int validationMode, boolean namespaceAware) throws Exception {

    DocumentBuilderFactory factory = createDocumentBuilderFactory(validationMode, namespaceAware);
    if (logger.isDebugEnabled()) {
        logger.debug("Using JAXP provider [" + factory.getClass().getName() + "]");
    }
    DocumentBuilder builder = createDocumentBuilder(factory, entityResolver, errorHandler);
    return builder.parse(inputSource);
}
```
```java
protected DocumentBuilderFactory createDocumentBuilderFactory(int validationMode, boolean namespaceAware{
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(namespaceAware);
    if (validationMode != XmlValidationModeDetector.VALIDATION_NONE) {
        //此方法设为true仅对dtd有效，xsd(schema)无效
        factory.setValidating(true);
        if (validationMode == XmlValidationModeDetector.VALIDATION_XSD) {
            // Enforce namespace aware for XSD...
             //开启xsd(schema)支持
            factory.setNamespaceAware(true);
             //这个也是Java支持Schema的套路，可以问度娘
            factory.setAttribute(SCHEMA_LANGUAGE_ATTRIBUTE, XSD_SCHEMA_LANGUAGE);
        }
    }
    return factory;
}
```
## bean解析
### registerBeanDefinitions
瞧一下这个方法，看看做了哪些事情。
```java
public int registerBeanDefinitions(Document doc, Resource resource) throws BeanDefinitionStoreException {
    //根据反射的方式创建DefaultBeanDefinitionDocumentReader对象。
    //这其实也是策略模式，通过setter方法可以更换其实现。修改documentReaderClass参数即可
    BeanDefinitionDocumentReader documentReader = createBeanDefinitionDocumentReader();
    //获取bean定义的数量
    int countBefore = getRegistry().getBeanDefinitionCount();
    //读取文件
    documentReader.registerBeanDefinitions(doc, createReaderContext(resource));
    return getRegistry().getBeanDefinitionCount() - countBefore;
}
```

### createReaderContext

```java
public XmlReaderContext createReaderContext(Resource resource) {
    // problemReporter是一个FailFastProblemReporter对象。
    // eventListener是EmptyReaderEventListener对象，此类里的方法都是空实现。
    // sourceExtractor是NullSourceExtractor对象，直接返回空，也是空实现。
    // getNamespaceHandlerResolver默认返回DefaultNamespaceHandlerResolver对象，用来获取xsd对应的处理器。

    return new XmlReaderContext(resource, this.problemReporter, this.eventListener,
        this.sourceExtractor, this, getNamespaceHandlerResolver());
}
```
XmlReaderContext的作用感觉就是这一堆参数的容器，糅合到一起传给DocumentReader，并美其名为Context。可以看出，Spring中到处都是策略模式，大量操作被抽象成接口。

### registerBeanDefinitions
此方式是在DefaultBeanDefinitionDocumentReader的里面实现的。
```java
@Override
public void registerBeanDefinitions(Document doc, XmlReaderContext readerContext) {
    this.readerContext = readerContext;
    //获取根节点beans
    Element root = doc.getDocumentElement();
    //注册根节点下所有的bean
    doRegisterBeanDefinitions(root);
}
``` 
### doRegisterBeanDefinitions

```java
protected void doRegisterBeanDefinitions
(Element root) {
        // Any nested <beans> elements will cause recursion in this method. In
        // order to propagate and preserve <beans> default-* attributes correctly,
        // keep track of the current (parent) delegate, which may be null. Create
        // the new (child) delegate with a reference to the parent for fallback purposes,
        // then ultimately reset this.delegate back to its original (parent) reference.
        // this behavior emulates a stack of delegates without actually necessitating one.
        BeanDefinitionParserDelegate parent = this.delegate;
        this.delegate = createDelegate(getReaderContext(), root, parent);
        // 默认的命名空间即
        // http://www.springframework.org/schema/beans
        if (this.delegate.isDefaultNamespace(root)) {
            // 检查profile属性,获取profile属性
            String profileSpec = root.getAttribute(PROFILE_ATTRIBUTE);
            if (StringUtils.hasText(profileSpec)) {
                // 分隔profile属性的值 ,分割
                String[] specifiedProfiles = StringUtils.tokenizeToStringArray(
                        profileSpec, BeanDefinitionParserDelegate.MULTI_VALUE_ATTRIBUTE_DELIMITERS);
                // 如果不是可用的profile的值，就直接返回
                if (!getReaderContext().getEnvironment().acceptsProfiles(specifiedProfiles)) {
                    return;
                }
            }
        }
        // 预处理xml方法这是个空方法，
        // 我们可以扩展这个方法，来加载解析我们自己的自定义标签。
        preProcessXml(root);
        // 解析
        parseBeanDefinitions(root, this.delegate);
        postProcessXml(root);

        this.delegate = parent;
    }
```
### parseBeanDefinitions

```java
`protected void parseBeanDefinitions(Element root, BeanDefinitionParserDelegate delegate) {
    // 验证名称空间
    // http://www.springframework.org/schema/beans
    if (delegate.isDefaultNamespace(root)) {

        NodeList nl = root.getChildNodes();
        for (int i = 0; i < nl.getLength(); i++) {
            Node node = nl.item(i);
            if (node instanceof Element) {
                Element ele = (Element) node;
                // 检查节点是不是
                // http://www.springframework.org/schema/beans
                if (delegate.isDefaultNamespace(ele)) {
                    // 解析节点
                    parseDefaultElement(ele, delegate);
                }
                else {
                    delegate.parseCustomElement(ele);
                }
            }
        }
    }
    else {
        delegate.parseCustomElement(root);
    }
    }
```

### parseDefaultElement

```java
private void parseDefaultElement(Element ele, BeanDefinitionParserDelegate delegate) {
    // 处理 import标签
    if (delegate.nodeNameEquals(ele, IMPORT_ELEMENT)) {
        importBeanDefinitionResource(ele);
    }
    // 处理 alais 标签
    else if (delegate.nodeNameEquals(ele, ALIAS_ELEMENT)) {
        processAliasRegistration(ele);
    }
    // 处理 bean标签
    else if (delegate.nodeNameEquals(ele, BEAN_ELEMENT)) {
        processBeanDefinition(ele, delegate);
    }
    // 处理beans标签
    // 返回去调用doRegisterBeanDefinitions的方法
    else if (delegate.nodeNameEquals(ele, NESTED_BEANS_ELEMENT)) {
        // recurse
        // 循环调用doRegisterBeanDefinitions
        doRegisterBeanDefinitions(ele);
    }
}
```
### importBeanDefinitionResource
处理import
```java
protected void importBeanDefinitionResource(Element ele) {
    // 获取resource标记的路径
    // <import resource="context:spring.xml"/>
    String location = ele.getAttribute(RESOURCE_ATTRIBUTE);
    if (!StringUtils.hasText(location)) {
        getReaderContext().error("Resource location must not be empty", ele);
        return;
    }

    // Resolve system properties: e.g. "${user.dir}"
    // 字符替换标签
    location = getReaderContext().getEnvironment().resolveRequiredPlaceholders(location);

    Set<Resource> actualResources = new LinkedHashSet<Resource>(4);

    // Discover whether the location is an absolute or relative URI
    boolean absoluteLocation = false;
    try {
        absoluteLocation = ResourcePatternUtils.isUrl(location) || ResourceUtils.toURI(location).isAbsolute();
    }
    catch (URISyntaxException ex) {
        // cannot convert to an URI, considering the location relative
        // unless it is the well-known Spring prefix "classpath*:"
    }

    // Absolute or relative?
    if (absoluteLocation) {
        try {
            int importCount = getReaderContext().getReader().loadBeanDefinitions(location, actualResources);
            if (logger.isDebugEnabled()) {
                logger.debug("Imported " + importCount + " bean definitions from URL location [" + location + "]");
            }
        }
        catch (BeanDefinitionStoreException ex) {
            getReaderContext().error(
                    "Failed to import bean definitions from URL location [" + location + "]", ele, ex);
        }
    }
    else {
        // No URL -> considering resource location as relative to the current file.
        try {
            int importCount;
            Resource relativeResource = getReaderContext().getResource().createRelative(location);
            if (relativeResource.exists()) {
                importCount = getReaderContext().getReader().loadBeanDefinitions(relativeResource);
                actualResources.add(relativeResource);
            }
            else {
                String baseLocation = getReaderContext().getResource().getURL().toString();
                importCount = getReaderContext().getReader().loadBeanDefinitions(
                        StringUtils.applyRelativePath(baseLocation, location), actualResources);
            }
            if (logger.isDebugEnabled()) {
                logger.debug("Imported " + importCount + " bean definitions from relative location [" + location + "]");
            }
        }
        catch (IOException ex) {
            getReaderContext().error("Failed to resolve current resource location", ele, ex);
        }
        catch (BeanDefinitionStoreException ex) {
            getReaderContext().error("Failed to import bean definitions from relative location [" + location + "]",
                    ele, ex);
        }
    }
    Resource[] actResArray = actualResources.toArray(new Resource[actualResources.size()]);
    getReaderContext().fireImportProcessed(location, actResArray, extractSource(ele));
}
```
importBeanDefinitionResource套路和之前的配置文件加载完全一样，不过注意被import进来的文件是先于当前文件被解析的。上面有些周边的代码就不介绍了。

### processAliasRegistration
处理别名
```java
protected void processAliasRegistration(Element ele) {
    // 拿到名字，和别名
    String name = ele.getAttribute(NAME_ATTRIBUTE);
    String alias = ele.getAttribute(ALIAS_ATTRIBUTE);
    boolean valid = true;
    if (!StringUtils.hasText(name)) {
        getReaderContext().error("Name must not be empty", ele);
        valid = false;
    }
    if (!StringUtils.hasText(alias)) {
        getReaderContext().error("Alias must not be empty", ele);
        valid = false;
    }
    if (valid) {
        try {
            // 核心方法，就是在DefaultListableBeanFactor注册别名，
            // 其实就是在一个map里面写入名字和别名的映射关系。
            getReaderContext().getRegistry().registerAlias(name, alias);
        }
        catch (Exception ex) {
            getReaderContext().error("Failed to register alias '" + alias +
                    "' for bean with name '" + name + "'", ele, ex);
        }
        // 触发监听器
        getReaderContext().fireAliasRegistered(name, alias, extractSource(ele));
    }
}
```
其实这个方法就是给一个bean取一个别名：比如有一个bean名为beanA，但是另一个组件想以beanB的名字使用，就可以这样定义:
<alias name="beanA" alias="beanB"/>

### registerAlias
```java
// 其实就是在map里加上一条映射关系。
public void registerAlias(String name, String alias) {
    Assert.hasText(name, "'name' must not be empty");
    Assert.hasText(alias, "'alias' must not be empty");
    if (alias.equals(name)) {
        this.aliasMap.remove(alias);
    }
    else {
        String registeredName = this.aliasMap.get(alias);
        if (registeredName != null) {
            if (registeredName.equals(name)) {
                // An existing alias - no need to re-register
                return;
            }
            if (!allowAliasOverriding()) {
                throw new IllegalStateException("Cannot register alias '" + alias + "' for name '" +
                        name + "': It is already registered for name '" + registeredName + "'.");
            }
        }
        checkForAliasCircle(name, alias);
        this.aliasMap.put(alias, name);
    }
}
```

### processBeanDefinition

处理bean 
```java
protected void processBeanDefinition(Element ele, BeanDefinitionParserDelegate delegate) {
    BeanDefinitionHolder bdHolder = delegate.parseBeanDefinitionElement(ele);
    if (bdHolder != null) {
        bdHolder = delegate.decorateBeanDefinitionIfRequired(ele, bdHolder);
        try {
            // Register the final decorated instance.
            BeanDefinitionReaderUtils.registerBeanDefinition(bdHolder, getReaderContext().getRegistry());
        }
        catch (BeanDefinitionStoreException ex) {
            getReaderContext().error("Failed to register bean definition with name '" +
                    bdHolder.getBeanName() + "'", ele, ex);
        }
        // Send registration event.
        getReaderContext().fireComponentRegistered(new BeanComponentDefinition(bdHolder));
    }
}
```
最后会调用BeanDefinitionParserDelegate.parseBeanDefinitionElement
首先获取到id和name属性，name属性支持配置多个，以逗号分隔，如果没有指定id，那么将以第一个name属性值代替。id必须是唯一的，name属性其实是alias的角色，可以和其它的bean重复，如果name也没有配置，那么其实什么也没做。
```java

public BeanDefinitionHolder parseBeanDefinitionElement(Element ele, BeanDefinition containingBean) {
    // 获取ID
    String id = ele.getAttribute(ID_ATTRIBUTE);
    // 获取name
    String nameAttr = ele.getAttribute(NAME_ATTRIBUTE);
    // name属性可以配置多个，用逗号分隔。
    List<String> aliases = new ArrayList<String>();
    if (StringUtils.hasLength(nameAttr)) {
        String[] nameArr = StringUtils.tokenizeToStringArray(nameAttr, MULTI_VALUE_ATTRIBUTE_DELIMITERS);
        aliases.addAll(Arrays.asList(nameArr));
    }

    String beanName = id;
    // 如果id没有配置 就用name的数组的第一个名字代替
    if (!StringUtils.hasText(beanName) && !aliases.isEmpty()) {
        beanName = aliases.remove(0);
        if (logger.isDebugEnabled()) {
            logger.debug("No XML 'id' specified - using '" + beanName +
                    "' as bean name and " + aliases + " as aliases");
        }
    }

    if (containingBean == null) {
        //检查bean名字，别名是不是已经使用过了
        checkNameUniqueness(beanName, aliases, ele);
    }
    // 待会我会介绍这个BeanDefinition的体系 这个方法到底干了啥？
    // 1.这个方法会解析bean 的class标签，parent的标签。
    // 2.然后会new一个GenericBeanDefinition，然后将class，parent的值，以及classload设置进去。
    // 3.解析标签下的meta，key，value标签，把依赖的关系也设置进去。
    AbstractBeanDefinition beanDefinition = parseBeanDefinitionElement(ele, beanName, containingBean);
    if (beanDefinition != null) {
        // 如果bean标签没有设置id，和name属性。
        if (!StringUtils.hasText(beanName)) {
            try {
                if (containingBean != null) {
                    beanName = BeanDefinitionReaderUtils.generateBeanName(
                            beanDefinition, this.readerContext.getRegistry(), true);
                }
                else {
                    // 如果bean标签没有设置id，和name属性。
                    // 自行创建一个名字。这里会调用BeanDefinitionReaderUtils.generateBeanName方法
                    beanName = this.readerContext.generateBeanName(beanDefinition);
                    // Register an alias for the plain bean class name, if still possible,
                    // if the generator returned the class name plus a suffix.
                    // This is expected for Spring 1.2/2.0 backwards compatibility.
                    // 获取beanClassName，其实就是class属性的值。
                    String beanClassName = beanDefinition.getBeanClassName();
                    // 如果名字是以className开头且没有被使用过的，就加入到别名里。
                    if (beanClassName != null &&
                            beanName.startsWith(beanClassName) && beanName.length() > beanClassName.length() &&
                            !this.readerContext.getRegistry().isBeanNameInUse(beanClassName)) {
                        aliases.add(beanClassName);
                    }
                }
                if (logger.isDebugEnabled()) {
                    logger.debug("Neither XML 'id' nor 'name' specified - " +
                            "using generated bean name [" + beanName + "]");
                }
            }
            catch (Exception ex) {
                error(ex.getMessage(), ele);
                return null;
            }
        }

        String[] aliasesArray = StringUtils.toStringArray(aliases);
        // 创建BeanDefinitionHolder类
        return new BeanDefinitionHolder(beanDefinition, beanName, aliasesArray);
    }

    return null;
}
```
## BeanDefinition接口
### 继承图谱
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558347721946.png)

### parseBeanDefinitionElement

接着看AbstractBeanDefinition beanDefinition = parseBeanDefinitionElement(ele, beanName, containingBean);这句的具体实现：
```java
public AbstractBeanDefinition parseBeanDefinitionElement(
            Element ele, String beanName, BeanDefinition containingBean) {
    //把名字进行一次压栈         
    this.parseState.push(new BeanEntry(beanName));

    String className = null;
    // 获取class属性值
    if (ele.hasAttribute(CLASS_ATTRIBUTE)) {
        className = ele.getAttribute(CLASS_ATTRIBUTE).trim();
    }

    try {
        String parent = null;
        // 获取parent的属性值
        if (ele.hasAttribute(PARENT_ATTRIBUTE)) {
            parent = ele.getAttribute(PARENT_ATTRIBUTE);
        }
        // 调用BeanDefinitionReaderUtils.createBeanDefinition（）
        // 创建GenericBeanDefinition实例，设置className，parent。
        AbstractBeanDefinition bd = createBeanDefinition(className, parent);
        // 这个方法会解析singleton、scope、abstract、lazy-init、autowire、
        // dependency-check、depends-on、init-method、autowire-candidate、
        // primary、destroy-method、actory-method、factory-bean、constructor-arg
        // index、type、value-type、key-type、property、ref、value等标签
        // 设置到 GenericBeanDefinition的实例里面。
        parseBeanDefinitionAttributes(ele, beanName, containingBean, bd);
        // 设置描述。
        bd.setDescription(DomUtils.getChildElementValueByTagName(ele, DESCRIPTION_ELEMENT));
        // 解析元数据标签
        parseMetaElements(ele, bd);
        // 解析lookup-method标签
        parseLookupOverrideSubElements(ele, bd.getMethodOverrides());
        // 解析replace-method标签
        parseReplacedMethodSubElements(ele, bd.getMethodOverrides());
        // 解析构造方法
        parseConstructorArgElements(ele, bd);
        // 解析属性依赖
        parsePropertyElements(ele, bd);
        // 解析Qualifier标签
        parseQualifierElements(ele, bd);
        // 设置资源 
        bd.setResource(this.readerContext.getResource());
        bd.setSource(extractSource(ele));

        return bd;
    }
    catch (Exception ex) {
        ... 
    }
    finally {
        this.parseState.pop();
    }

    return null;
}
```
其实这里面就已经把bean的定义bean的依赖关系都设置好了。但是bean并没有被实例化。
### parseMetaElements
```java
public void parseMetaElements(Element ele, BeanMetadataAttributeAccessor attributeAccessor) {
    NodeList nl = ele.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, META_ELEMENT)) {
            Element metaElement = (Element) node;
            String key = metaElement.getAttribute(KEY_ATTRIBUTE);
            String value = metaElement.getAttribute(VALUE_ATTRIBUTE);
             //就是一个key, value的载体，无他
            BeanMetadataAttribute attribute = new BeanMetadataAttribute(key, value);
             //sourceExtractor默认是NullSourceExtractor，返回的是空
            attribute.setSource(extractSource(metaElement));
            attributeAccessor.addMetadataAttribute(attribute);
        }
    }
}
```
AbstractBeanDefinition继承自BeanMetadataAttributeAccessor类，底层使用了一个LinkedHashMap保存metadata。这个metadata具体是做什么暂时还不知道。我们实际应用中meta标签也很少见。
例子：
```java
<bean id="b" name="one, two" class="base.SimpleBean">
    <meta key="name" value="dsfesf"/>
</bean>
```
### parseLookupOverrideSubElements
```java
public void parseLookupOverrideSubElements(Element beanEle, MethodOverrides overrides) {
    NodeList nl = beanEle.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, LOOKUP_METHOD_ELEMENT)) {
            Element ele = (Element) node;
            String methodName = ele.getAttribute(NAME_ATTRIBUTE);
            String beanRef = ele.getAttribute(BEAN_ELEMENT);
            //以MethodOverride的方式，存放在set集合里面
            LookupOverride override = new LookupOverride(methodName, beanRef);
            override.setSource(extractSource(ele));
            overrides.addOverride(override);
        }
    }
}
```
此标签的作用在于当一个bean的某个方法被设置为lookup-method后，每次调用此方法时，都会返回一个新的指定bean的对象。例如：
```java
<bean id="apple" class="a.b.c.Apple" scope="prototype"/>
<!--水果盘-->
<bean id="fruitPlate" class="a.b.c.FruitPlate">
    <lookup-method name="getFruit" bean="apple"/>
</bean>
```

### parseReplacedMethodSubElements
```java
public void parseReplacedMethodSubElements(Element beanEle, MethodOverrides overrides) {
    NodeList nl = beanEle.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, REPLACED_METHOD_ELEMENT)) {
            Element replacedMethodEle = (Element) node;
            //获取name属性
            String name = replacedMethodEle.getAttribute(NAME_ATTRIBUTE);
            //获取replace-method属性
            String callback = replacedMethodEle.getAttribute(REPLACER_ATTRIBUTE);
            ReplaceOverride replaceOverride = new ReplaceOverride(name, callback);
            // Look for arg-type match elements.
            // 获取所有的 arg-type的标签
            // 遍历所有节点，找到匹配的。以ReplaceOverride结构存储到list里面
            List<Element> argTypeEles = DomUtils.getChildElementsByTagName(replacedMethodEle, ARG_TYPE_ELEMENT);
            for (Element argTypeEle : argTypeEles) {
                String match = argTypeEle.getAttribute(ARG_TYPE_MATCH_ATTRIBUTE);
                match = (StringUtils.hasText(match) ? match : DomUtils.getTextValue(argTypeEle));
                if (StringUtils.hasText(match)) {
                    replaceOverride.addTypeIdentifier(match);
                }
            }
            replaceOverride.setSource(extractSource(replacedMethodEle));
            overrides.addOverride(replaceOverride);
        }
    }
}
```
replace-method 主要作用就是替换方法体及其返回值，使用比较简单。只需要实现MethodReplacer接口，并重写reimplement方法，然后就能完成方法的替换。这个有点类似aop的功能实现场景用的地方不是太多。
例子：
```java
<!-- ====================replace-method属性注入==================== -->
<bean id="dogReplaceMethod" class="com.lyc.cn.v2.day01.method.replaceMethod.ReplaceDog"/>
<bean id="originalDogReplaceMethod" class="com.lyc.cn.v2.day01.method.replaceMethod.OriginalDog">
    <replaced-method name="sayHello" replacer="dogReplaceMethod">
        <arg-type match="java.lang.String"></arg-type>
    </replaced-method>
</bean>
```

# configuration的加载

```java
@Override
protected void loadBeanDefinitions(DefaultListableBeanFactory beanFactory) throws BeansException, IOException {
    //创建一个读取bean的配置文件的加载器
    XmlBeanDefinitionReader beanDefinitionReader = new XmlBeanDefinitionReader(beanFactory);

    // Configure the bean definition reader with this context's
    // resource loading environment.
    // 父类被设值了就是StandardEnvironment
    beanDefinitionReader.setEnvironment(this.getEnvironment());
    // 这里其实被赋值的是DefaultResourceLoader的子类。
    beanDefinitionReader.setResourceLoader(this);
    // 设置资源实体的解析器
    beanDefinitionReader.setEntityResolver(new ResourceEntityResolver(this));

    // Allow a subclass to provide custom initialization of the reader,
    // then proceed with actually loading the bean definitions.
    initBeanDefinitionReader(beanDefinitionReader);
    loadBeanDefinitions(beanDefinitionReader);
}
```
## XmlBeanDefinitionReader
先看一下这个类的继承图谱
### 继承图谱
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558273300511.png)
### 构造方法
XmlBeanDefinitionReader会调用父类的构造方法尽行初始化环境，初始化类加载器。
```
protected AbstractBeanDefinitionReader(BeanDefinitionRegistry registry) {
    Assert.notNull(registry, "BeanDefinitionRegistry must not be null");
    this.registry = registry;

    //DefaultListableBeanFactory不是ResourceLoader的类型
    if (this.registry instanceof ResourceLoader) {
        this.resourceLoader = (ResourceLoader) this.registry;
    }
    else {
        //资源加载器PathMatchingResourcePatternResolver
        //但是会被子类的setResourceLoader覆盖掉。
        this.resourceLoader = new PathMatchingResourcePatternResolver();
    }

    //DefaultListableBeanFactory也不是EnvironmentCapable
    if (this.registry instanceof EnvironmentCapable) {
        this.environment = ((EnvironmentCapable) this.registry).getEnvironment();
    }
    else {
        //初始化环境变量
        this.environment = new StandardEnvironment();
    }
}
```

### bean的加载

```java
public int loadBeanDefinitions(String location, Set<Resource> actualResources) throws BeanDefinitionStoreException {
    ResourceLoader resourceLoader = getResourceLoader();
    if (resourceLoader == null) {
        throw new BeanDefinitionStoreException(
                "Cannot import bean definitions from location [" + location + "]: no ResourceLoader available");
    }
    //因为ClassPathApplicationContext实现了ResourcePatternResolver 

    if (resourceLoader instanceof ResourcePatternResolver) {
        // Resource pattern matching available.
        try {
            //这一句会拿到ResourcePatternResolver的对象。
            //加载资源文件
            Resource[] resources = ((ResourcePatternResolver) resourceLoader).getResources(location);
            //加载所有的bean
            int loadCount = loadBeanDefinitions(resources);
            //这里不会执行，因为actualResources是null
            if (actualResources != null) {
                for (Resource resource : resources) {
                    actualResources.add(resource);
                }
            }
            if (logger.isDebugEnabled()) {
                logger.debug("Loaded " + loadCount + " bean definitions from location pattern [" + location + "]");
            }
            return loadCount;
        }
        catch (IOException ex) {
            throw new BeanDefinitionStoreException(
                    "Could not resolve bean definition resource pattern [" + location + "]", ex);
        }
    }
    else {
        // Can only load single resources by absolute URL.
        Resource resource = resourceLoader.getResource(location);
        int loadCount = loadBeanDefinitions(resource);
        if (actualResources != null) {
            actualResources.add(resource);
        }
        if (logger.isDebugEnabled()) {
            logger.debug("Loaded " + loadCount + " bean definitions from location [" + location + "]");
        }
        return loadCount;
    }
}
    
```
### getResources

看看getResources的方法
```java
public Resource[] getResources(String locationPattern) throws IOException {
    // 因为resourcePatternResolver是PathMatchingResourcePatternResolver的实例
    // 所以会调用PathMatchingResourcePatternResolver的getResources方法
    return this.resourcePatternResolver.getResources(locationPattern);
}
```

```java

public Resource[] getResources(String locationPattern) throws IOException {
    Assert.notNull(locationPattern, "Location pattern must not be null");
    //如果是以classpath*:开头的
    if (locationPattern.startsWith(CLASSPATH_ALL_URL_PREFIX)) {
        // a class path resource (multiple resources for same name possible)
        // 拿到的是AntPathMatcher实例。
        // 如果包含*或者？就匹配成功
        if (getPathMatcher().isPattern(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()))) {
            // a class path resource pattern
            //
            return findPathMatchingResources(locationPattern);
        }
        else {
            // all class path resources with the given name
            // 路径没有？或者*
            return findAllClassPathResources(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()));
        }
    }
    else {
        // Only look for a pattern after a prefix here
        // (to not get fooled by a pattern symbol in a strange prefix).
        int prefixEnd = locationPattern.indexOf(":") + 1;
        if (getPathMatcher().isPattern(locationPattern.substring(prefixEnd))) {
            // a file pattern
            return findPathMatchingResources(locationPattern);
        }
        else {
            // a single resource with the given name
            return new Resource[] {getResourceLoader().getResource(locationPattern)};
        }
    }
}
```
看看里面
```java
public boolean isPattern(String path) {
    return (path.indexOf('*') != -1 || path.indexOf('?') != -1);
}
```
#### findPathMatchingResources
```java
protected Resource[] findPathMatchingResources(String locationPattern) throws IOException {
    //如果是"/WEB-INF/*.xml 拿到的值是"/WEB-INF/"
    //如果是"/WEB-INF/*/*.xml"拿到是“/WEB-INF/*/”
    //如果是“classpath：context/*.xml”拿到的是“classpath：context/”
    // 获取文件的根路径
    String rootDirPath = determineRootDir(locationPattern);
    // 获取正则表达式
    String subPattern = locationPattern.substring(rootDirPath.length());
    // 重新调用getResources，两个方法又开始循环调用了
    // 如果是“classpath：context/”那此事会调用getResources里的子方法findAllClassPathResources
    // findAllClassPathResources会拿到目录下的所有资源
    Resource[] rootDirResources = getResources(rootDirPath);
    Set<Resource> result = new LinkedHashSet<Resource>(16);
    for (Resource rootDirResource : rootDirResources) {
        
        rootDirResource = resolveRootDirResource(rootDirResource);
        //加载vfs文件
        if (rootDirResource.getURL().getProtocol().startsWith(ResourceUtils.URL_PROTOCOL_VFS)) {
            result.addAll(VfsResourceMatchingDelegate.findMatchingResources(rootDirResource, subPattern, getPathMatcher()));
        }
        //加载jar里面的文件
        else if (isJarResource(rootDirResource)) {
            result.addAll(doFindPathMatchingJarResources(rootDirResource, subPattern));
        }
        else {
            //最后才是加载本地系统的文件
            result.addAll(doFindPathMatchingFileResources(rootDirResource, subPattern));
        }
    }
    if (logger.isDebugEnabled()) {
        logger.debug("Resolved location pattern [" + locationPattern + "] to resources " + result);
    }
    return result.toArray(new Resource[result.size()]);
}
```
#### findAllClassPathResources

```java
protected Resource[] findAllClassPathResources(String location) throws IOException {
    String path = location;
    if (path.startsWith("/")) {
        path = path.substring(1);
    }
    Set<Resource> result = doFindAllClassPathResources(path);
    return result.toArray(new Resource[result.size()]);
}
```
再看看doFindAllClassPathResources:
```java
protected Set<Resource> doFindAllClassPathResources(String path) throws IOException {
    Set<Resource> result = new LinkedHashSet<Resource>(16);
    ClassLoader cl = getClassLoader();
    Enumeration<URL> resourceUrls = (cl != null ? cl.getResources(path) : ClassLoader.getSystemResources(path));
    while (resourceUrls.hasMoreElements()) {
        URL url = resourceUrls.nextElement();
        result.add(convertClassLoaderURL(url));
    }
    if ("".equals(path)) {
        // The above result is likely to be incomplete, i.e. only containing file system references.
        // We need to have pointers to each of the jar files on the classpath as well...
        addAllClassLoaderJarRoots(cl, result);
    }
    return result;
}
```
说到这里仅仅也只是spring是如何找文件的。这里还没有文件的读取和解析。

### loadBeanDefinitions
下面介绍spring配置文件的读取和解析。
```java 
public int loadBeanDefinitions(EncodedResource encodedResource) throws BeanDefinitionStoreException {
    // TheadLocal的已经加载的资源set集合。
    Set<EncodedResource> currentResources = this.resourcesCurrentlyBeingLoaded.get();
    if (currentResources == null) {
        currentResources = new HashSet<EncodedResource>(4);
        this.resourcesCurrentlyBeingLoaded.set(currentResources);
    }
    if (!currentResources.add(encodedResource)) {
        throw new BeanDefinitionStoreException(
                "Detected cyclic loading of " + encodedResource + " - check your import definitions!");
    }
    //以下这段代码就是真实读取文件的逻辑了。
    try {
        InputStream inputStream = encodedResource.getResource().getInputStream();
        try {
            InputSource inputSource = new InputSource(inputStream);
            if (encodedResource.getEncoding() != null) {
                inputSource.setEncoding(encodedResource.getEncoding());
            }
            return doLoadBeanDefinitions(inputSource, encodedResource.getResource());
        }
        finally {
            inputStream.close();
        }
    }
    catch (IOException ex) {
       ...
    }
    finally {
        currentResources.remove(encodedResource);
        if (currentResources.isEmpty()) {
            this.resourcesCurrentlyBeingLoaded.remove();
        }
    }
}
```
#### doLoadBeanDefinitions
```java
protected int doLoadBeanDefinitions(InputSource inputSource, Resource resource)
            throws BeanDefinitionStoreException {
    // 读取文件
    Document doc = doLoadDocument(inputSource, resource);
    // 这个方法里面就是配置文件的解析了。
    return registerBeanDefinitions(doc, resource);
}
```
##### doLoadDocument
```java
protected Document doLoadDocument(InputSource inputSource, Resource resource) throws Exception {
    // documentLoader是一个DefaultDocumentLoader对象，此类是DocumentLoader接口的唯一实现。
    // getEntityResolver方法返回ResourceEntityResolver,
    // ResourceEntityResolver会用xsd或者dtd约束文件做校验。
    // errorHandler是一个SimpleSaxErrorHandler对象。
    return this.documentLoader.loadDocument(inputSource, getEntityResolver(), this.errorHandler,
            getValidationModeForResource(resource), isNamespaceAware());
}
```

看下 loadDocument

```java
/**
** 这里就是老套路了，可以看出，Spring还是使用了dom的方式解析，即一次全部load到内存
**/
public Document loadDocument(InputSource inputSource, EntityResolver entityResolver,
        ErrorHandler errorHandler, int validationMode, boolean namespaceAware) throws Exception {

    DocumentBuilderFactory factory = createDocumentBuilderFactory(validationMode, namespaceAware);
    if (logger.isDebugEnabled()) {
        logger.debug("Using JAXP provider [" + factory.getClass().getName() + "]");
    }
    DocumentBuilder builder = createDocumentBuilder(factory, entityResolver, errorHandler);
    return builder.parse(inputSource);
}
```
```java
protected DocumentBuilderFactory createDocumentBuilderFactory(int validationMode, boolean namespaceAware{
    DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
    factory.setNamespaceAware(namespaceAware);
    if (validationMode != XmlValidationModeDetector.VALIDATION_NONE) {
        //此方法设为true仅对dtd有效，xsd(schema)无效
        factory.setValidating(true);
        if (validationMode == XmlValidationModeDetector.VALIDATION_XSD) {
            // Enforce namespace aware for XSD...
             //开启xsd(schema)支持
            factory.setNamespaceAware(true);
             //这个也是Java支持Schema的套路，可以问度娘
            factory.setAttribute(SCHEMA_LANGUAGE_ATTRIBUTE, XSD_SCHEMA_LANGUAGE);
        }
    }
    return factory;
}
```
## bean解析
### registerBeanDefinitions
瞧一下这个方法，看看做了哪些事情。
```java
public int registerBeanDefinitions(Document doc, Resource resource) throws BeanDefinitionStoreException {
    //根据反射的方式创建DefaultBeanDefinitionDocumentReader对象。
    //这其实也是策略模式，通过setter方法可以更换其实现。修改documentReaderClass参数即可
    BeanDefinitionDocumentReader documentReader = createBeanDefinitionDocumentReader();
    //获取bean定义的数量
    int countBefore = getRegistry().getBeanDefinitionCount();
    //读取文件
    documentReader.registerBeanDefinitions(doc, createReaderContext(resource));
    return getRegistry().getBeanDefinitionCount() - countBefore;
}
```

#### createReaderContext

```java
public XmlReaderContext createReaderContext(Resource resource) {
    // problemReporter是一个FailFastProblemReporter对象。
    // eventListener是EmptyReaderEventListener对象，此类里的方法都是空实现。
    // sourceExtractor是NullSourceExtractor对象，直接返回空，也是空实现。
    // getNamespaceHandlerResolver默认返回DefaultNamespaceHandlerResolver对象，用来获取xsd对应的处理器。

    return new XmlReaderContext(resource, this.problemReporter, this.eventListener,
        this.sourceExtractor, this, getNamespaceHandlerResolver());
}
```
XmlReaderContext的作用感觉就是这一堆参数的容器，糅合到一起传给DocumentReader，并美其名为Context。可以看出，Spring中到处都是策略模式，大量操作被抽象成接口。

#### registerBeanDefinitions
此方式是在DefaultBeanDefinitionDocumentReader的里面实现的。
```java
@Override
public void registerBeanDefinitions(Document doc, XmlReaderContext readerContext) {
    this.readerContext = readerContext;
    //获取根节点beans
    Element root = doc.getDocumentElement();
    //注册根节点下所有的bean
    doRegisterBeanDefinitions(root);
}
``` 
### doRegisterBeanDefinitions

```java
protected void doRegisterBeanDefinitions
(Element root) {
        // Any nested <beans> elements will cause recursion in this method. In
        // order to propagate and preserve <beans> default-* attributes correctly,
        // keep track of the current (parent) delegate, which may be null. Create
        // the new (child) delegate with a reference to the parent for fallback purposes,
        // then ultimately reset this.delegate back to its original (parent) reference.
        // this behavior emulates a stack of delegates without actually necessitating one.
        BeanDefinitionParserDelegate parent = this.delegate;
        this.delegate = createDelegate(getReaderContext(), root, parent);
        // 默认的命名空间即
        // http://www.springframework.org/schema/beans
        if (this.delegate.isDefaultNamespace(root)) {
            // 检查profile属性,获取profile属性
            String profileSpec = root.getAttribute(PROFILE_ATTRIBUTE);
            if (StringUtils.hasText(profileSpec)) {
                // 分隔profile属性的值 ,分割
                String[] specifiedProfiles = StringUtils.tokenizeToStringArray(
                        profileSpec, BeanDefinitionParserDelegate.MULTI_VALUE_ATTRIBUTE_DELIMITERS);
                // 如果不是可用的profile的值，就直接返回
                if (!getReaderContext().getEnvironment().acceptsProfiles(specifiedProfiles)) {
                    return;
                }
            }
        }
        // 预处理xml方法这是个空方法，
        // 我们可以扩展这个方法，来加载解析我们自己的自定义标签。
        preProcessXml(root);
        // 解析
        parseBeanDefinitions(root, this.delegate);
        postProcessXml(root);

        this.delegate = parent;
    }
```
#### parseBeanDefinitions

```java
`protected void parseBeanDefinitions(Element root, BeanDefinitionParserDelegate delegate) {
    // 验证名称空间
    // http://www.springframework.org/schema/beans
    if (delegate.isDefaultNamespace(root)) {

        NodeList nl = root.getChildNodes();
        for (int i = 0; i < nl.getLength(); i++) {
            Node node = nl.item(i);
            if (node instanceof Element) {
                Element ele = (Element) node;
                // 检查节点是不是
                // http://www.springframework.org/schema/beans
                if (delegate.isDefaultNamespace(ele)) {
                    // 默认解析方式xml
                    parseDefaultElement(ele, delegate);
                }
                else {
                    //自定义解析xml，方便我们扩展的标签。原理是这样子的 
                    //我们的context相关标签，以及我们的后面介绍的Aop标签，都是通过这个方法去扩展的。
                    //1.首先会根据你的namespace标签值，去选择根据namespace里面的值去map里面选择一个解析器。map里面存储的值是<namespace,resolverClassName>
                    //2.拿到这个这个解析对象class对象，通过反射的方式创建解析，
                    //3.调用解析器里面的resover方法，去解析扩展的标签。
                    delegate.parseCustomElement(ele);
                }
            }
        }
    }
    else {
        //自定义解析xml
        delegate.parseCustomElement(root);
    }
    }
```
后面分两条支线阅读解析这块的核心
##### parseDefaultElement

```java
private void parseDefaultElement(Element ele, BeanDefinitionParserDelegate delegate) {
    // 处理 import标签
    if (delegate.nodeNameEquals(ele, IMPORT_ELEMENT)) {
        importBeanDefinitionResource(ele);
    }
    // 处理 alais 标签
    else if (delegate.nodeNameEquals(ele, ALIAS_ELEMENT)) {
        processAliasRegistration(ele);
    }
    // 处理 bean标签
    else if (delegate.nodeNameEquals(ele, BEAN_ELEMENT)) {
        processBeanDefinition(ele, delegate);
    }
    // 处理beans标签
    // 返回去调用doRegisterBeanDefinitions的方法
    else if (delegate.nodeNameEquals(ele, NESTED_BEANS_ELEMENT)) {
        // recurse
        // 循环调用doRegisterBeanDefinitions
        doRegisterBeanDefinitions(ele);
    }
}
```
##### importBeanDefinitionResource
处理import
```java
protected void importBeanDefinitionResource(Element ele) {
    // 获取resource标记的路径
    // <import resource="context:spring.xml"/>
    String location = ele.getAttribute(RESOURCE_ATTRIBUTE);
    if (!StringUtils.hasText(location)) {
        getReaderContext().error("Resource location must not be empty", ele);
        return;
    }

    // Resolve system properties: e.g. "${user.dir}"
    // 字符替换标签
    location = getReaderContext().getEnvironment().resolveRequiredPlaceholders(location);

    Set<Resource> actualResources = new LinkedHashSet<Resource>(4);

    // Discover whether the location is an absolute or relative URI
    boolean absoluteLocation = false;
    try {
        absoluteLocation = ResourcePatternUtils.isUrl(location) || ResourceUtils.toURI(location).isAbsolute();
    }
    catch (URISyntaxException ex) {
        // cannot convert to an URI, considering the location relative
        // unless it is the well-known Spring prefix "classpath*:"
    }

    // Absolute or relative?
    if (absoluteLocation) {
        try {
            int importCount = getReaderContext().getReader().loadBeanDefinitions(location, actualResources);
            if (logger.isDebugEnabled()) {
                logger.debug("Imported " + importCount + " bean definitions from URL location [" + location + "]");
            }
        }
        catch (BeanDefinitionStoreException ex) {
            getReaderContext().error(
                    "Failed to import bean definitions from URL location [" + location + "]", ele, ex);
        }
    }
    else {
        // No URL -> considering resource location as relative to the current file.
        try {
            int importCount;
            Resource relativeResource = getReaderContext().getResource().createRelative(location);
            if (relativeResource.exists()) {
                importCount = getReaderContext().getReader().loadBeanDefinitions(relativeResource);
                actualResources.add(relativeResource);
            }
            else {
                String baseLocation = getReaderContext().getResource().getURL().toString();
                importCount = getReaderContext().getReader().loadBeanDefinitions(
                        StringUtils.applyRelativePath(baseLocation, location), actualResources);
            }
            if (logger.isDebugEnabled()) {
                logger.debug("Imported " + importCount + " bean definitions from relative location [" + location + "]");
            }
        }
        catch (IOException ex) {
            getReaderContext().error("Failed to resolve current resource location", ele, ex);
        }
        catch (BeanDefinitionStoreException ex) {
            getReaderContext().error("Failed to import bean definitions from relative location [" + location + "]",
                    ele, ex);
        }
    }
    Resource[] actResArray = actualResources.toArray(new Resource[actualResources.size()]);
    getReaderContext().fireImportProcessed(location, actResArray, extractSource(ele));
}
```
importBeanDefinitionResource套路和之前的配置文件加载完全一样，不过注意被import进来的文件是先于当前文件被解析的。上面有些周边的代码就不介绍了。

##### processAliasRegistration
处理别名
```java
protected void processAliasRegistration(Element ele) {
    // 拿到名字，和别名
    String name = ele.getAttribute(NAME_ATTRIBUTE);
    String alias = ele.getAttribute(ALIAS_ATTRIBUTE);
    boolean valid = true;
    if (!StringUtils.hasText(name)) {
        getReaderContext().error("Name must not be empty", ele);
        valid = false;
    }
    if (!StringUtils.hasText(alias)) {
        getReaderContext().error("Alias must not be empty", ele);
        valid = false;
    }
    if (valid) {
        try {
            // 核心方法，就是在DefaultListableBeanFactor注册别名，
            // 其实就是在一个map里面写入名字和别名的映射关系。
            getReaderContext().getRegistry().registerAlias(name, alias);
        }
        catch (Exception ex) {
            getReaderContext().error("Failed to register alias '" + alias +
                    "' for bean with name '" + name + "'", ele, ex);
        }
        // 触发监听器
        getReaderContext().fireAliasRegistered(name, alias, extractSource(ele));
    }
}
```
其实这个方法就是给一个bean取一个别名：比如有一个bean名为beanA，但是另一个组件想以beanB的名字使用，就可以这样定义:
<alias name="beanA" alias="beanB"/>

###### registerAlias
```java
// 其实就是在map里加上一条映射关系。
public void registerAlias(String name, String alias) {
    Assert.hasText(name, "'name' must not be empty");
    Assert.hasText(alias, "'alias' must not be empty");
    if (alias.equals(name)) {
        this.aliasMap.remove(alias);
    }
    else {
        String registeredName = this.aliasMap.get(alias);
        if (registeredName != null) {
            if (registeredName.equals(name)) {
                // An existing alias - no need to re-register
                return;
            }
            if (!allowAliasOverriding()) {
                throw new IllegalStateException("Cannot register alias '" + alias + "' for name '" +
                        name + "': It is already registered for name '" + registeredName + "'.");
            }
        }
        checkForAliasCircle(name, alias);
        this.aliasMap.put(alias, name);
    }
}
```

##### processBeanDefinition

###### BeanDefinition接口
###### 继承图谱
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558347721946.png)

处理bean 
```java
protected void processBeanDefinition(Element ele, BeanDefinitionParserDelegate delegate) {
    BeanDefinitionHolder bdHolder = delegate.parseBeanDefinitionElement(ele);
    if (bdHolder != null) {
        bdHolder = delegate.decorateBeanDefinitionIfRequired(ele, bdHolder);
        try {
            // Register the final decorated instance.
            BeanDefinitionReaderUtils.registerBeanDefinition(bdHolder, getReaderContext().getRegistry());
        }
        catch (BeanDefinitionStoreException ex) {
            getReaderContext().error("Failed to register bean definition with name '" +
                    bdHolder.getBeanName() + "'", ele, ex);
        }
        // Send registration event.
        getReaderContext().fireComponentRegistered(new BeanComponentDefinition(bdHolder));
    }
}
```
最后会调用BeanDefinitionParserDelegate.parseBeanDefinitionElement
首先获取到id和name属性，name属性支持配置多个，以逗号分隔，如果没有指定id，那么将以第一个name属性值代替。id必须是唯一的，name属性其实是alias的角色，可以和其它的bean重复，如果name也没有配置，那么其实什么也没做。
```java

public BeanDefinitionHolder parseBeanDefinitionElement(Element ele, BeanDefinition containingBean) {
    // 获取ID
    String id = ele.getAttribute(ID_ATTRIBUTE);
    // 获取name
    String nameAttr = ele.getAttribute(NAME_ATTRIBUTE);
    // name属性可以配置多个，用逗号分隔。
    List<String> aliases = new ArrayList<String>();
    if (StringUtils.hasLength(nameAttr)) {
        String[] nameArr = StringUtils.tokenizeToStringArray(nameAttr, MULTI_VALUE_ATTRIBUTE_DELIMITERS);
        aliases.addAll(Arrays.asList(nameArr));
    }

    String beanName = id;
    // 如果id没有配置 就用name的数组的第一个名字代替
    if (!StringUtils.hasText(beanName) && !aliases.isEmpty()) {
        beanName = aliases.remove(0);
        if (logger.isDebugEnabled()) {
            logger.debug("No XML 'id' specified - using '" + beanName +
                    "' as bean name and " + aliases + " as aliases");
        }
    }

    if (containingBean == null) {
        //检查bean名字，别名是不是已经使用过了
        checkNameUniqueness(beanName, aliases, ele);
    }
    // 待会我会介绍这个BeanDefinition的体系 这个方法到底干了啥？
    // 1.这个方法会解析bean 的class标签，parent的标签。
    // 2.然后会new一个GenericBeanDefinition，然后将class，parent的值，以及classload设置进去。
    // 3.解析标签下的meta，key，value标签，把依赖的关系也设置进去。
    AbstractBeanDefinition beanDefinition = parseBeanDefinitionElement(ele, beanName, containingBean);
    if (beanDefinition != null) {
        // 如果bean标签没有设置id，和name属性。
        if (!StringUtils.hasText(beanName)) {
            try {
                if (containingBean != null) {
                    beanName = BeanDefinitionReaderUtils.generateBeanName(
                            beanDefinition, this.readerContext.getRegistry(), true);
                }
                else {
                    // 如果bean标签没有设置id，和name属性。
                    // 自行创建一个名字。这里会调用BeanDefinitionReaderUtils.generateBeanName方法
                    beanName = this.readerContext.generateBeanName(beanDefinition);
                    // Register an alias for the plain bean class name, if still possible,
                    // if the generator returned the class name plus a suffix.
                    // This is expected for Spring 1.2/2.0 backwards compatibility.
                    // 获取beanClassName，其实就是class属性的值。
                    String beanClassName = beanDefinition.getBeanClassName();
                    // 如果名字是以className开头且没有被使用过的，就加入到别名里。
                    if (beanClassName != null &&
                            beanName.startsWith(beanClassName) && beanName.length() > beanClassName.length() &&
                            !this.readerContext.getRegistry().isBeanNameInUse(beanClassName)) {
                        aliases.add(beanClassName);
                    }
                }
                if (logger.isDebugEnabled()) {
                    logger.debug("Neither XML 'id' nor 'name' specified - " +
                            "using generated bean name [" + beanName + "]");
                }
            }
            catch (Exception ex) {
                error(ex.getMessage(), ele);
                return null;
            }
        }

        String[] aliasesArray = StringUtils.toStringArray(aliases);
        // 创建BeanDefinitionHolder类
        return new BeanDefinitionHolder(beanDefinition, beanName, aliasesArray);
    }

    return null;
}
```

###### parseBeanDefinitionElement

接着看AbstractBeanDefinition beanDefinition = parseBeanDefinitionElement(ele, beanName, containingBean);这句的具体实现：
```java
public AbstractBeanDefinition parseBeanDefinitionElement(
            Element ele, String beanName, BeanDefinition containingBean) {
    //把名字进行一次压栈         
    this.parseState.push(new BeanEntry(beanName));

    String className = null;
    // 获取class属性值
    if (ele.hasAttribute(CLASS_ATTRIBUTE)) {
        className = ele.getAttribute(CLASS_ATTRIBUTE).trim();
    }

    try {
        String parent = null;
        // 获取parent的属性值
        if (ele.hasAttribute(PARENT_ATTRIBUTE)) {
            parent = ele.getAttribute(PARENT_ATTRIBUTE);
        }
        // 调用BeanDefinitionReaderUtils.createBeanDefinition（）
        // 创建GenericBeanDefinition实例，设置className，parent。
        AbstractBeanDefinition bd = createBeanDefinition(className, parent);
        // 这个方法会解析singleton、scope、abstract、lazy-init、autowire、
        // dependency-check、depends-on、init-method、autowire-candidate、
        // primary、destroy-method、actory-method、factory-bean、constructor-arg
        // index、type、value-type、key-type、property、ref、value等标签
        // 设置到 GenericBeanDefinition的实例里面。
        parseBeanDefinitionAttributes(ele, beanName, containingBean, bd);
        // 设置描述。
        bd.setDescription(DomUtils.getChildElementValueByTagName(ele, DESCRIPTION_ELEMENT));
        // 解析元数据标签
        parseMetaElements(ele, bd);
        // 解析lookup-method标签
        parseLookupOverrideSubElements(ele, bd.getMethodOverrides());
        // 解析replace-method标签
        parseReplacedMethodSubElements(ele, bd.getMethodOverrides());
        // 解析构造方法
        parseConstructorArgElements(ele, bd);
        // 解析属性依赖
        parsePropertyElements(ele, bd);
        // 解析Qualifier标签
        parseQualifierElements(ele, bd);
        // 设置资源 
        bd.setResource(this.readerContext.getResource());
        bd.setSource(extractSource(ele));

        return bd;
    }
    catch (Exception ex) {
        ... 
    }
    finally {
        this.parseState.pop();
    }

    return null;
}
```
其实这里面就已经把bean的定义bean的依赖关系都设置好了。但是bean并没有被实例化。
###### parseMetaElements
```java
public void parseMetaElements(Element ele, BeanMetadataAttributeAccessor attributeAccessor) {
    NodeList nl = ele.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, META_ELEMENT)) {
            Element metaElement = (Element) node;
            String key = metaElement.getAttribute(KEY_ATTRIBUTE);
            String value = metaElement.getAttribute(VALUE_ATTRIBUTE);
             //就是一个key, value的载体，无他
            BeanMetadataAttribute attribute = new BeanMetadataAttribute(key, value);
             //sourceExtractor默认是NullSourceExtractor，返回的是空
            attribute.setSource(extractSource(metaElement));
            attributeAccessor.addMetadataAttribute(attribute);
        }
    }
}
```
AbstractBeanDefinition继承自BeanMetadataAttributeAccessor类，底层使用了一个LinkedHashMap保存metadata。这个metadata具体是做什么暂时还不知道。我们实际应用中meta标签也很少见。
例子：
```java
<bean id="b" name="one, two" class="base.SimpleBean">
    <meta key="name" value="dsfesf"/>
</bean>
```
###### parseLookupOverrideSubElements
```java
public void parseLookupOverrideSubElements(Element beanEle, MethodOverrides overrides) {
    NodeList nl = beanEle.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, LOOKUP_METHOD_ELEMENT)) {
            Element ele = (Element) node;
            String methodName = ele.getAttribute(NAME_ATTRIBUTE);
            String beanRef = ele.getAttribute(BEAN_ELEMENT);
            //以MethodOverride的方式，存放在set集合里面
            LookupOverride override = new LookupOverride(methodName, beanRef);
            override.setSource(extractSource(ele));
            overrides.addOverride(override);
        }
    }
}
```
此标签的作用在于当一个bean的某个方法被设置为lookup-method后，每次调用此方法时，都会返回一个新的指定bean的对象。例如：
```java
<bean id="apple" class="a.b.c.Apple" scope="prototype"/>
<!--水果盘-->
<bean id="fruitPlate" class="a.b.c.FruitPlate">
    <lookup-method name="getFruit" bean="apple"/>
</bean>
```

###### parseReplacedMethodSubElements
```java
public void parseReplacedMethodSubElements(Element beanEle, MethodOverrides overrides) {
    NodeList nl = beanEle.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, REPLACED_METHOD_ELEMENT)) {
            Element replacedMethodEle = (Element) node;
            //获取name属性
            String name = replacedMethodEle.getAttribute(NAME_ATTRIBUTE);
            //获取replace-method属性
            String callback = replacedMethodEle.getAttribute(REPLACER_ATTRIBUTE);
            ReplaceOverride replaceOverride = new ReplaceOverride(name, callback);
            // Look for arg-type match elements.
            // 获取所有的 arg-type的标签
            // 遍历所有节点，找到匹配的。以ReplaceOverride结构存储到list里面
            List<Element> argTypeEles = DomUtils.getChildElementsByTagName(replacedMethodEle, ARG_TYPE_ELEMENT);
            for (Element argTypeEle : argTypeEles) {
                String match = argTypeEle.getAttribute(ARG_TYPE_MATCH_ATTRIBUTE);
                match = (StringUtils.hasText(match) ? match : DomUtils.getTextValue(argTypeEle));
                if (StringUtils.hasText(match)) {
                    replaceOverride.addTypeIdentifier(match);
                }
            }
            replaceOverride.setSource(extractSource(replacedMethodEle));
            overrides.addOverride(replaceOverride);
        }
    }
}
```
replace-method 主要作用就是替换方法体及其返回值，使用比较简单。只需要实现MethodReplacer接口，并重写reimplement方法，然后就能完成方法的替换。这个有点类似aop的功能实现场景用的地方不是太多。
例子：
```java
<!-- ====================replace-method属性注入==================== -->
<bean id="dogReplaceMethod" class="com.lyc.cn.v2.day01.method.replaceMethod.ReplaceDog"/>
<bean id="originalDogReplaceMethod" class="com.lyc.cn.v2.day01.method.replaceMethod.OriginalDog">
    <replaced-method name="sayHello" replacer="dogReplaceMethod">
        <arg-type match="java.lang.String"></arg-type>
    </replaced-method>
</bean>
```
###### parseConstructorArgElements
解析构造方法。构造方法注入
```
<bean class="base.SimpleBean">
    <constructor-arg>
        <value type="java.lang.String">Cat</value>
    </constructor-arg>
</bean>
```
```java
public void parseConstructorArgElements(Element beanEle, BeanDefinition bd) {
    NodeList nl = beanEle.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, CONSTRUCTOR_ARG_ELEMENT)) {

            parseConstructorArgElement((Element) node, bd);
        }
    }
}
```
看看调用方法parseConstructorArgElement
```java
public void parseConstructorArgElement(Element ele, BeanDefinition bd) {
    String indexAttr = ele.getAttribute(INDEX_ATTRIBUTE);
    String typeAttr = ele.getAttribute(TYPE_ATTRIBUTE);
    String nameAttr = ele.getAttribute(NAME_ATTRIBUTE);
    //按照index的方式设置值
    if (StringUtils.hasLength(indexAttr)) {
        try {
            int index = Integer.parseInt(indexAttr);
            if (index < 0) {
                error("'index' cannot be lower than 0", ele);
            }
            else {
                try {
                    //ConstructorArgumentEntry其实存的就是index值
                    this.parseState.push(new ConstructorArgumentEntry(index));
                    //获取value标签的值                   
                    Object value = parsePropertyValue(ele, bd, null);
                    // ConstructorArgumentValues.valueHolder存储value值
                    //
                    ConstructorArgumentValues.ValueHolder valueHolder = new ConstructorArgumentValues.ValueHolder(value);
                    if (StringUtils.hasLength(typeAttr)) {
                        valueHolder.setType(typeAttr);
                    }
                    if (StringUtils.hasLength(nameAttr)) {
                        valueHolder.setName(nameAttr);
                    }
                    valueHolder.setSource(extractSource(ele));
                    //判断索引值是不是已经用过了。其实是检查的Map<index,ValueHolder>的key是否存在。
                    if (bd.getConstructorArgumentValues().hasIndexedArgumentValue(index)) {
                        error("Ambiguous constructor-arg entries for index " + index, ele);
                    }
                    else {
                        //把valueHolder加入到map里面
                        bd.getConstructorArgumentValues().addIndexedArgumentValue(index, valueHolder);
                    }
                }
                finally {
                    this.parseState.pop();
                }
            }
        }
        catch (NumberFormatException ex) {
            error("Attribute 'index' of tag 'constructor-arg' must be an integer", ele);
        }
    }
    //如果不是用index 就把名字相关信息加入ValueHOlde中存储到List里面。
    else {
        try {
            this.parseState.push(new ConstructorArgumentEntry());
            Object value = parsePropertyValue(ele, bd, null);
            ConstructorArgumentValues.ValueHolder valueHolder = new ConstructorArgumentValues.ValueHolder(value);
            if (StringUtils.hasLength(typeAttr)) {
                valueHolder.setType(typeAttr);
            }
            if (StringUtils.hasLength(nameAttr)) {
                valueHolder.setName(nameAttr);
            }
            valueHolder.setSource(extractSource(ele));
            bd.getConstructorArgumentValues().addGenericArgumentValue(valueHolder);
        }
        finally {
            this.parseState.pop();
        }
    }
}
```

###### parsePropertyElements
解析property，普通属性注入相关的配置的方法：
```java

```

###### parseQualifierElements
解析Qulifier标签。Qualifier标签能在我们注入的时候选择指定的注入值
一般情况下和AutoWire标签使用的情况比较多，常见的@AutoWire注解上添加上@Qualifier选择合适的注入者
如：
```
<bean id="animal" class="test.constructor.Animal">
    //指定类型为test.qualifier.Person,id 为student的bean注入
    <qualifier type="test.qualifier.Person" value="student"></qualifier>
</bean>
<bean id="student" class="test.qualifier.Person"></bean>
```
```java
public void parseQualifierElements(Element beanEle, AbstractBeanDefinition bd) {
    NodeList nl = beanEle.getChildNodes();
    for (int i = 0; i < nl.getLength(); i++) {
        Node node = nl.item(i);
        if (isCandidateElement(node) && nodeNameEquals(node, QUALIFIER_ELEMENT)) {
            parseQualifierElement((Element) node, bd);
        }
    }
}
```
```java
public void parseQualifierElement(Element ele, AbstractBeanDefinition bd) {
    String typeName = ele.getAttribute(TYPE_ATTRIBUTE);
    if (!StringUtils.hasLength(typeName)) {
        error("Tag 'qualifier' must have a 'type' attribute", ele);
        return;
    }
    //QualifierEntry 存放的就是class的类型即type的名字，或者class全限定名字
    //如 a.b.c.person
    this.parseState.push(new QualifierEntry(typeName));
    try {
        //根据类型去
        AutowireCandidateQualifier qualifier = new AutowireCandidateQualifier(typeName);
        qualifier.setSource(extractSource(ele));
        String value = ele.getAttribute(VALUE_ATTRIBUTE);
        if (StringUtils.hasLength(value)) {
            //这里是存放在一个Map<String, Object>结构里，
            其中key是value，value的值是BeanMetadataAttribute(name, value)对象。

            qualifier.setAttribute(AutowireCandidateQualifier.VALUE_KEY, value);
        }
        NodeList nl = ele.getChildNodes();
        for (int i = 0; i < nl.getLength(); i++) {
            Node node = nl.item(i);
            //如果qualifier标签下还有attribute标签
            //就解析对应的标签值，用BeanMetadataAttribute封装，放到AutowireCandidateQualifier对象里面。
            if (isCandidateElement(node) && nodeNameEquals(node, QUALIFIER_ATTRIBUTE_ELEMENT)) {
                Element attributeEle = (Element) node;
                String attributeName = attributeEle.getAttribute(KEY_ATTRIBUTE);
                String attributeValue = attributeEle.getAttribute(VALUE_ATTRIBUTE);
                if (StringUtils.hasLength(attributeName) && StringUtils.hasLength(attributeValue)) {
                    BeanMetadataAttribute attribute = new BeanMetadataAttribute(attributeName, attributeValue);
                    attribute.setSource(extractSource(attributeEle));
                    qualifier.addMetadataAttribute(attribute);
                }
                else {
                    error("Qualifier 'attribute' tag must have a 'name' and 'value'", attributeEle);
                    return;
                }
            }
        }
        bd.addQualifier(qualifier);
    }
    finally {
        this.parseState.pop();
    }
}
```
看看AutowireCandidateQualifier的继承图谱：
![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558450481943.png)

阅读到这里parseDefaultElement这一条线就看完了。下面看自定义解析这条线，spring为何能支持很多其他的标签，比如属性标签p，比如context标签c、比如Aop标签。都是通过这个自定义解析才能得以实现。在配置文件解析这块思想做到了极致。以至于，很多其他框架都借鉴了这块的思想。
### parseCustomElement
自定义解析，其实最终是通过加载自定义解析器去解析的。现在咱们来一探究尽
#### parseCustomElement
```
public BeanDefinition parseCustomElement(Element ele, BeanDefinition containingBd) {
    // 获取到命名空间值
    String namespaceUri = getNamespaceURI(ele);
    // 拿到名称空间处理器
    // 1.拿到解析上下文中NamespaceHandlerResolver的DefaultNamespaceHandlerResolver实例
    // 2.解析处理一下命名空间，拿到具体的NamespaceHandler
    NamespaceHandler handler = this.readerContext.getNamespaceHandlerResolver().resolve(namespaceUri);
    if (handler == null) {
        error("Unable to locate Spring NamespaceHandler for XML schema namespace [" + namespaceUri + "]", ele);
        return null;
    }
    return handler.parse(ele, new ParserContext(this.readerContext, this, containingBd));
}
```
#### DefaultNamespaceHandlerResolver

```java 
public DefaultNamespaceHandlerResolver(ClassLoader classLoader) {
    this(classLoader, DEFAULT_HANDLER_MAPPINGS_LOCATION);
}
```
其中DEFAULT_HANDLER_MAPPINGS_LOCATION="META-INF/spring.handlers";
找一个实例看下"META-INF/spring.handlers"下面有什么东西，如spring-beans项目里的p标签和c标签。
```
http\://www.springframework.org/schema/c=org.springframework.beans.factory.xml.SimpleConstructorNamespaceHandler
http\://www.springframework.org/schema/p=org.springframework.beans.factory.xml.SimplePropertyNamespaceHandler
http\://www.springframework.org/schema/util=org.springframework.beans.factory.xml.UtilNamespaceHandler
```
#### DefaultNamespaceHandlerResolver.resolver
```java
public NamespaceHandler resolve(String namespaceUri) {
    // 加载配置文件里配置好的NamespaceHandler。烂加载模式。
    Map<String, Object> handlerMappings = getHandlerMappings();
    // 通过namespaceUri去map表里面找对应的handler
    Object handlerOrClassName = handlerMappings.get(namespaceUri);
    if (handlerOrClassName == null) {
        return null;
    }
    //如果是NamespaceHandler类型就直接返回了，
    else if (handlerOrClassName instanceof NamespaceHandler) {
        return (NamespaceHandler) handlerOrClassName;
    }
    //如果不是就根据class对象，用反射的方式去加载对应handler
    //配置文件一般都是配置的class全限定名，
    //如果是第一次解析对应标签，会执行下面的逻辑，nameHandler初始化之后，会缓存起来供下次使用。
    else {
        String className = (String) handlerOrClassName;
        try {
            Class<?> handlerClass = ClassUtils.forName(className, this.classLoader);
            if (!NamespaceHandler.class.isAssignableFrom(handlerClass)) {
                throw new FatalBeanException("Class [" + className + "] for namespace [" + namespaceUri +
                        "] does not implement the [" + NamespaceHandler.class.getName() + "] interface");
            }
            NamespaceHandler namespaceHandler = (NamespaceHandler) 
            // 根据class定义实例化对象    
            BeanUtils.instantiateClass(handlerClass);
            namespaceHandler.init();
            handlerMappings.put(namespaceUri, namespaceHandler);
            return namespaceHandler;
        }
        catch (ClassNotFoundException ex) {
            throw new FatalBeanException("NamespaceHandler class [" + className + "] for namespace [" +
                    namespaceUri + "] not found", ex);
        }
        catch (LinkageError err) {
            throw new FatalBeanException("Invalid NamespaceHandler class [" + className + "] for namespace [" +
                    namespaceUri + "]: problem with handler class file or dependent class", err);
        }
    }
}

```
```java
/**
 * Load the specified NamespaceHandler mappings lazily.
 */
private Map<String, Object> getHandlerMappings() {
    //如果没有被加载就加载，这里判断两次为null就是为了在多线程情况下的并发加载的问题。
    if (this.handlerMappings == null) {
        synchronized (this) {
            if (this.handlerMappings == null) {
                try {
                    Properties mappings =
                            PropertiesLoaderUtils.loadAllProperties(this.handlerMappingsLocation, this.classLoader);
                    Map<String, Object> handlerMappings = new ConcurrentHashMap<String, Object>(mappings.size());
                    CollectionUtils.mergePropertiesIntoMap(mappings, handlerMappings);
                    this.handlerMappings = handlerMappings;
                }
                catch (IOException ex) {
                   ...
                }
            }
        }
    }
    return this.handlerMappings;
}
```
#### NamespaceHandler.parse
这里就是个性化的方法了，因为每个NamespaceHanlder处理的标签都不一祥。重点看一下这个实现：NamespaceHandlerSupport这里面的实现，因为很多NamespaceHanlder都是继承的这个抽象类：如图：

![enter description here](https://www.github.com/liuyong520/pic/raw/master/小书匠/1558453927509.png)
```java
public BeanDefinition parse(Element element, ParserContext parserContext) {
    return findParserForElement(element, parserContext).parse(element, parserContext);
}
```
```java
private BeanDefinitionParser findParserForElement(Element element, ParserContext parserContext) {
    String localName = parserContext.getDelegate().getLocalName(element);
    BeanDefinitionParser parser = this.parsers.get(localName);
    if (parser == null) {
        parserContext.getReaderContext().fatal(
                "Cannot locate BeanDefinitionParser for element [" + localName + "]", element);
    }
    return parser;
}
```
以上就是configuration 配置文件的加载过程了。下一章阅读分享bean的注册以及bean的实例化。
# bean 实例化
 查看processBeanDefinition
```java
protected void processBeanDefinition(Element ele, BeanDefinitionParserDelegate delegate) {
    BeanDefinitionHolder bdHolder = delegate.parseBeanDefinitionElement(ele);
    if (bdHolder != null) {
        // 装饰bean装饰哪些不是默认namespace的那些bean
        // 1.去META-INF/spring.handlers下加载namespaceHandler
        // 2.根据namespace的的值拿到对应的namespaceHandler
        // 3.获取namespaceHandler的实例，然后调用namespaceHandler的decorate的方法
        bdHolder = delegate.decorateBeanDefinitionIfRequired(ele, bdHolder);
        try {
            // Register the final decorated instance.
            BeanDefinitionReaderUtils.registerBeanDefinition(bdHolder, getReaderContext().getRegistry());
        }
        catch (BeanDefinitionStoreException ex) {
            getReaderContext().error("Failed to register bean definition with name '" +
                    bdHolder.getBeanName() + "'", ele, ex);
        }
        // Send registration event.
        getReaderContext().fireComponentRegistered(new BeanComponentDefinition(bdHolder));
    }
}

```
## bean装饰

### delegate.decorateBeanDefinitionIfRequired
这一块和之前讲的自定义标签解析是一样的实现。都是用策略模式实现的，都是通过去找namespaceHandler接口，然后实例化，调用装饰方法，完成个性化的操作。这里就不再贴代码详细介绍了
```java
public BeanDefinitionHolder decorateBeanDefinitionIfRequired(
        Element ele, BeanDefinitionHolder definitionHolder, BeanDefinition containingBd) {

    BeanDefinitionHolder finalDefinition = definitionHolder;

    // Decorate based on custom attributes first.
    // 装饰自定义属性标签
    NamedNodeMap attributes = ele.getAttributes();
    for (int i = 0; i < attributes.getLength(); i++) {
        Node node = attributes.item(i);
        finalDefinition = decorateIfRequired(node, finalDefinition, containingBd);
    }

    // Decorate based on custom nested elements.
    // 装饰自定义节点标签
    NodeList children = ele.getChildNodes();
    for (int i = 0; i < children.getLength(); i++) {
        Node node = children.item(i);
        if (node.getNodeType() == Node.ELEMENT_NODE) {
            finalDefinition = decorateIfRequired(node, finalDefinition, containingBd);
        }
    }
    return finalDefinition;
} 
```
## bean的注册
```java
@Override
    public void registerBeanDefinition(String beanName, BeanDefinition beanDefinition)
            throws BeanDefinitionStoreException {
    //前面介绍过了bean定义的加载
    if (beanDefinition instanceof AbstractBeanDefinition) {
        try {
            //校验
            ((AbstractBeanDefinition) beanDefinition).validate();
        }
        catch (BeanDefinitionValidationException ex) {
            throw new BeanDefinitionStoreException(beanDefinition.getResourceDescription(), beanName,
                    "Validation of bean definition failed", ex);
        }
    }

    BeanDefinition oldBeanDefinition;

    oldBeanDefinition = this.beanDefinitionMap.get(beanName);
    if (oldBeanDefinition != null) {
        if (!isAllowBeanDefinitionOverriding()) {
          // 如果不允许重复定义就抛出异常
          ...
        }
        //如果可以被覆盖就比较一下
        else if (oldBeanDefinition.getRole() < beanDefinition.getRole()) {
            // e.g. was ROLE_APPLICATION, now overriding with ROLE_SUPPORT or ROLE_INFRASTRUCTURE
            if (this.logger.isWarnEnabled()) {
                this.logger.warn("Overriding user-defined bean definition for bean '" + beanName +
                        "' with a framework-generated bean definition: replacing [" +
                        oldBeanDefinition + "] with [" + beanDefinition + "]");
            }
        }
        else if (!beanDefinition.equals(oldBeanDefinition)) {
            if (this.logger.isInfoEnabled()) {
                this.logger.info("Overriding bean definition for bean '" + beanName +
                        "' with a different definition: replacing [" + oldBeanDefinition +
                        "] with [" + beanDefinition + "]");
            }
        }
        else {
            if (this.logger.isDebugEnabled()) {
                this.logger.debug("Overriding bean definition for bean '" + beanName +
                        "' with an equivalent definition: replacing [" + oldBeanDefinition +
                        "] with [" + beanDefinition + "]");
            }
        }
        // 覆盖原来的bean
        this.beanDefinitionMap.put(beanName, beanDefinition);
    }
    else {

        if (hasBeanCreationStarted()) {
            // Cannot modify startup-time collection elements anymore (for stable iteration)
            synchronized (this.beanDefinitionMap) {
                // 添加到beanDefinitionMap里面
                this.beanDefinitionMap.put(beanName, beanDefinition);
                List<String> updatedDefinitions = new ArrayList<String>(this.beanDefinitionNames.size() + 1);
                updatedDefinitions.addAll(this.beanDefinitionNames);
                updatedDefinitions.add(beanName);
                // 把beanNanme添加到list里面
                this.beanDefinitionNames = updatedDefinitions;
                // 如果原来单例bean里面
                if (this.manualSingletonNames.contains(beanName)) {
                    // 移除掉beanName 这里为什么要移除掉？
                    // 留坑
                    Set<String> updatedSingletons = new LinkedHashSet<String>(this.manualSingletonNames);
                    updatedSingletons.remove(beanName);
                    this.manualSingletonNames = updatedSingletons;
                }
            }
        }
        else {
            // Still in startup registration phase
            // 这里表示是启动的时候缓存相关信息
            this.beanDefinitionMap.put(beanName, beanDefinition);
            this.beanDefinitionNames.add(beanName);
            this.manualSingletonNames.remove(beanName);
        }
        this.frozenBeanDefinitionNames = null;
    }

    if (oldBeanDefinition != null || containsSingleton(beanName)) {
        //重置一下
        resetBeanDefinition(beanName);
    }
}
```
bean的实例化
```java
public void preInstantiateSingletons() throws BeansException {
    //获取所有的beanName
    List<String> beanNames = new ArrayList<String>(this.beanDefinitionNames);

    // Trigger initialization of all non-lazy singleton beans...
    for (String beanName : beanNames) {
        // Bean定义公共的抽象类是AbstractBeanDefinition，
        // 普通的Bean在Spring加载Bean定义的时候，
        // 实例化出来的是GenericBeanDefinition，
        // 而Spring上下文包括实例化所有Bean用的AbstractBeanDefinition是RootBeanDefinition，
        // 这时候就使用getMergedLocalBeanDefinition方法做了一次转化，
        // 将非RootBeanDefinition转换为RootBeanDefinition以供后续操作。
        RootBeanDefinition bd = getMergedLocalBeanDefinition(beanName);
        if (!bd.isAbstract() && bd.isSingleton() && !bd.isLazyInit()) {
            //判断是不是FactoryBean
            //FactoryBean是一种特殊的bean。可以通过&beanName的去拿到真实的bean
            //其实就是调用的FactoryBean接口的getObject方法
            if (isFactoryBean(beanName)) {
                final FactoryBean<?> factory = (FactoryBean<?>) getBean(FACTORY_BEAN_PREFIX + beanName);
                boolean isEagerInit;
                if (System.getSecurityManager() != null && factory instanceof SmartFactoryBean) {
                    isEagerInit = AccessController.doPrivileged(new PrivilegedAction<Boolean>() {
                        @Override
                        public Boolean run() {
                            return ((SmartFactoryBean<?>) factory).isEagerInit();
                        }
                    }, getAccessControlContext());
                }
                else {
                    isEagerInit = (factory instanceof SmartFactoryBean &&
                            ((SmartFactoryBean<?>) factory).isEagerInit());
                }
                //如果被标记为EagerInit就需要被立即初始化
                if (isEagerInit) {
                    getBean(beanName);
                }
            }
            else {
                //如果是是单例bean就初始化
                getBean(beanName);
            }
        }
    }
    // 初始化完成后调用post-initialization callback回调方法。
    // Trigger post-initialization callback for all applicable beans...
    for (String beanName : beanNames) {

        Object singletonInstance = getSingleton(beanName);
        //如果继承了SmartInitializingSingleton接口所有单例bean都会执行回调方法afterSingletonsInstantiated
        if (singletonInstance instanceof SmartInitializingSingleton) {
            final SmartInitializingSingleton smartSingleton = (SmartInitializingSingleton) singletonInstance;
            if (System.getSecurityManager() != null) {
                AccessController.doPrivileged(new PrivilegedAction<Object>() {
                    @Override
                    public Object run() {
                        smartSingleton.afterSingletonsInstantiated();
                        return null;
                    }
                }, getAccessControlContext());
            }
            else {
                smartSingleton.afterSingletonsInstantiated();
            }
        }
    }
}
```
实例化操作是在getbean方法里面完成的。
### getbean
```java
@Override
public Object getBean(String name) throws BeansException {
    return doGetBean(name, null, null, false);
}

```
#### doGetBean
这个方法有点长，一些日志代码我就干掉了，保留核心代码
```java
protected <T> T doGetBean(
            final String name, final Class<T> requiredType, final Object[] args, boolean typeCheckOnly)
            throws BeansException {
    // 获取真实的beanName        
    final String beanName = transformedBeanName(name);
    Object bean;

    // Eagerly check singleton cache for manually registered singletons.
    // 获取单例bean的实例
    Object sharedInstance = getSingleton(beanName);
    if (sharedInstance != null && args == null) {
        //
        bean = getObjectForBeanInstance(sharedInstance, name, beanName, null);
    }

    else {
        // Fail if we're already creating this bean instance:
        // We're assumably within a circular reference.
        if (isPrototypeCurrentlyInCreation(beanName)) {
            throw new BeanCurrentlyInCreationException(beanName);
        }

        // Check if bean definition exists in this factory.
        BeanFactory parentBeanFactory = getParentBeanFactory();
        if (parentBeanFactory != null && !containsBeanDefinition(beanName)) {
            // Not found -> check parent.
            String nameToLookup = originalBeanName(name);
            if (args != null) {
                // Delegation to parent with explicit args.
                return (T) parentBeanFactory.getBean(nameToLookup, args);
            }
            else {
                // No args -> delegate to standard getBean method.
                return parentBeanFactory.getBean(nameToLookup, requiredType);
            }
        }
        //类型检查
        if (!typeCheckOnly) {
            //把beanName标记为已经创建，其实就是往alreadyCreated set 集合里面写一条数据
            markBeanAsCreated(beanName);
        }

        try {
            //转换类型
            final RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);
            checkMergedBeanDefinition(mbd, beanName, args);

            // Guarantee initialization of beans that the current bean depends on.
            // 检查depends-on 依赖
            String[] dependsOn = mbd.getDependsOn();
            if (dependsOn != null) {
                for (String dependsOnBean : dependsOn) {
                    if (isDependent(beanName, dependsOnBean)) {
                      ...
                    }
                    //注册依赖的bean
                    registerDependentBean(dependsOnBean, beanName);
                    //实例化依赖的bean
                    getBean(dependsOnBean);
                }
            }

            // Create bean instance.
            if (mbd.isSingleton()) {
                sharedInstance = getSingleton(beanName, new ObjectFactory<Object>() {
                    @Override
                    public Object getObject() throws BeansException {
                        try {
                            //创建bean的实例
                            return createBean(beanName, mbd, args);
                        }
                        catch (BeansException ex) {
                            destroySingleton(beanName);
                            throw ex;
                        }
                    }
                });
                bean = getObjectForBeanInstance(sharedInstance, name, beanName, mbd);
            }
            //实例化多例bean
            else if (mbd.isPrototype()) {
                // It's a prototype -> create a new instance.
                Object prototypeInstance = null;
                try {
                    beforePrototypeCreation(beanName);
                    prototypeInstance = createBean(beanName, mbd, args);
                }
                finally {
                    afterPrototypeCreation(beanName);
                }
                bean = getObjectForBeanInstance(prototypeInstance, name, beanName, mbd);
            }

            else {
                String scopeName = mbd.getScope();
                final Scope scope = this.scopes.get(scopeName);
                if (scope == null) {
                    throw new IllegalStateException("No Scope registered for scope name '" + scopeName + "'");
                }
                try {
                    Object scopedInstance = scope.get(beanName, new ObjectFactory<Object>() {
                        @Override
                        public Object getObject() throws BeansException {
                            beforePrototypeCreation(beanName);
                            try {
                                return createBean(beanName, mbd, args);
                            }
                            finally {
                                afterPrototypeCreation(beanName);
                            }
                        }
                    });
                    bean = getObjectForBeanInstance(scopedInstance, name, beanName, mbd);
                }
                catch (IllegalStateException ex) {
                   ...
                }
            }
        }
        catch (BeansException ex) {
            cleanupAfterBeanCreationFailure(beanName);
            throw ex;
        }
    }

    // Check if required type matches the type of the actual bean instance.
    if (requiredType != null && bean != null && !requiredType.isAssignableFrom(bean.getClass())) {
        try {
            return getTypeConverter().convertIfNecessary(bean, requiredType);
        }
        catch (TypeMismatchException ex) {
            ...
        }
    }
    return (T) bean;
}
```

```java
protected Object getObjectForBeanInstance(
            Object beanInstance, String name, String beanName, RootBeanDefinition mbd) {

    // Don't let calling code try to dereference the factory if the bean isn't a factory.
    if (BeanFactoryUtils.isFactoryDereference(name) && !(beanInstance instanceof FactoryBean)) {
        throw new BeanIsNotAFactoryException(transformedBeanName(name), beanInstance.getClass());
    }

    // Now we have the bean instance, which may be a normal bean or a FactoryBean.
    // If it's a FactoryBean, we use it to create a bean instance, unless the
    // caller actually wants a reference to the factory.
    if (!(beanInstance instanceof FactoryBean) || BeanFactoryUtils.isFactoryDereference(name)) {
        return beanInstance;
    }

    Object object = null;
    if (mbd == null) {
        object = getCachedObjectForFactoryBean(beanName);
    }
    if (object == null) {
        // Return bean instance from factory.
        FactoryBean<?> factory = (FactoryBean<?>) beanInstance;
        // Caches object obtained from FactoryBean if it is a singleton.
        if (mbd == null && containsBeanDefinition(beanName)) {
            mbd = getMergedLocalBeanDefinition(beanName);
        }
        boolean synthetic = (mbd != null && mbd.isSynthetic());
        object = getObjectFromFactoryBean(factory, beanName, !synthetic);
    }
    return object;
}
```
### createBean
createBean方法是AbstractBeanFactory的子类AbstractAutowireCapableBeanFactory的一个方法，看一下它的方法实现：

```java
protected Object createBean(final String beanName, final RootBeanDefinition mbd, final Object[] args)
        throws BeanCreationException {

    if (logger.isDebugEnabled()) {
        logger.debug("Creating instance of bean '" + beanName + "'");
    }
    // Make sure bean class is actually resolved at this point.
    resolveBeanClass(mbd, beanName);

    // Prepare method overrides.
    try {
        mbd.prepareMethodOverrides();
    }
    catch (BeanDefinitionValidationException ex) {
        throw new BeanDefinitionStoreException(mbd.getResourceDescription(),
                beanName, "Validation of method overrides failed", ex);
    }

    try {
        // Give BeanPostProcessors a chance to return a proxy instead of the target bean instance.
        // 这里是spring提供一些接口扩展，这里会触发所有的BeanPostProcessor前置处理器和后置处理器
        Object bean = resolveBeforeInstantiation(beanName, mbd);
        if (bean != null) {
            return bean;
        }
    }
    catch (Throwable ex) {
        throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                "BeanPostProcessor before instantiation of bean failed", ex);
    }

    Object beanInstance = doCreateBean(beanName, mbd, args);
    if (logger.isDebugEnabled()) {
        logger.debug("Finished creating instance of bean '" + beanName + "'");
    }
    return beanInstance;
}
```
重要的方法是doCreateBean
### doCreateBean
```java
protected Object doCreateBean(final String beanName, final RootBeanDefinition mbd, final Object[] args) {
        // Instantiate the bean.
        BeanWrapper instanceWrapper = null;
        // 如果是单例bean
        if (mbd.isSingleton()) {
            //首先从factoryBean的缓存里面找factoryBean的包装类。
            instanceWrapper = this.factoryBeanInstanceCache.remove(beanName);
        }
        if (instanceWrapper == null) {
            // 如果 factoryBean缓存里面没有对应名字的factoryBean就自行创建。
            instanceWrapper = createBeanInstance(beanName, mbd, args);
        }
        // 从instanceWrapper赋值
        final Object bean = (instanceWrapper != null ? instanceWrapper.getWrappedInstance() : null);
        Class<?> beanType = (instanceWrapper != null ? instanceWrapper.getWrappedClass() : null);

        // Allow post-processors to modify the merged bean definition.
        // 这个也可以说是spring的扩展接口了，只需要继承MergedBeanDefinitionPostProcessor接口，就可以完成对beanDefinition的一些修改。   
        synchronized (mbd.postProcessingLock) {
            if (!mbd.postProcessed) {

                applyMergedBeanDefinitionPostProcessors(mbd, beanType, beanName);
                mbd.postProcessed = true;
            }
        }

        // Eagerly cache singletons to be able to resolve circular references
        // even when triggered by lifecycle interfaces like BeanFactoryAware.
        boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
                isSingletonCurrentlyInCreation(beanName));
        if (earlySingletonExposure) {
            if (logger.isDebugEnabled()) {
                logger.debug("Eagerly caching bean '" + beanName +
                        "' to allow for resolving potential circular references");
            }
            addSingletonFactory(beanName, new ObjectFactory<Object>() {
                @Override
                public Object getObject() throws BeansException {
                    return getEarlyBeanReference(beanName, mbd, bean);
                }
            });
        }

        // Initialize the bean instance.
        Object exposedObject = bean;
        try {
            //关键方法
            //依赖注入
            populateBean(beanName, mbd, instanceWrapper);
            if (exposedObject != null) {
                exposedObject = initializeBean(beanName, exposedObject, mbd);
            }
        }
        catch (Throwable ex) {
            if (ex instanceof BeanCreationException && beanName.equals(((BeanCreationException) ex).getBeanName())) {
                throw (BeanCreationException) ex;
            }
            else {
                throw new BeanCreationException(mbd.getResourceDescription(), beanName, "Initialization of bean failed", ex);
            }
        }

        if (earlySingletonExposure) {
            Object earlySingletonReference = getSingleton(beanName, false);
            if (earlySingletonReference != null) {
                if (exposedObject == bean) {
                    exposedObject = earlySingletonReference;
                }
                else if (!this.allowRawInjectionDespiteWrapping && hasDependentBean(beanName)) {
                    String[] dependentBeans = getDependentBeans(beanName);
                    Set<String> actualDependentBeans = new LinkedHashSet<String>(dependentBeans.length);
                    for (String dependentBean : dependentBeans) {
                        if (!removeSingletonIfCreatedForTypeCheckOnly(dependentBean)) {
                            actualDependentBeans.add(dependentBean);
                        }
                    }
                    if (!actualDependentBeans.isEmpty()) {
                        throw new BeanCurrentlyInCreationException(beanName,
                                "Bean with name '" + beanName + "' has been injected into other beans [" +
                                StringUtils.collectionToCommaDelimitedString(actualDependentBeans) +
                                "] in its raw version as part of a circular reference, but has eventually been " +
                                "wrapped. This means that said other beans do not use the final version of the " +
                                "bean. This is often the result of over-eager type matching - consider using " +
                                "'getBeanNamesOfType' with the 'allowEagerInit' flag turned off, for example.");
                    }
                }
            }
        }

        // Register bean as disposable.
        try {
            registerDisposableBeanIfNecessary(beanName, bean, mbd);
        }
        catch (BeanDefinitionValidationException ex) {
            throw new BeanCreationException(mbd.getResourceDescription(), beanName, "Invalid destruction signature", ex);
        }

        return exposedObject;
    }
```

###
```java
protected BeanWrapper createBeanInstance(String beanName, RootBeanDefinition mbd, Object[] args) {
        // Make sure bean class is actually resolved at this point.
        Class<?> beanClass = resolveBeanClass(mbd, beanName);

        if (beanClass != null && !Modifier.isPublic(beanClass.getModifiers()) && !mbd.isNonPublicAccessAllowed()) {
            throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                    "Bean class isn't public, and non-public access not allowed: " + beanClass.getName());
        }
        // 如果有工厂方法，factoryMethod 就调用factroyMethod创建  
        if (mbd.getFactoryMethodName() != null)  {
            return instantiateUsingFactoryMethod(beanName, mbd, args);
        }

        // Shortcut when re-creating the same bean...
        boolean resolved = false;
        boolean autowireNecessary = false;
        // 这里会检查bean里面的依赖注入
        if (args == null) {
            synchronized (mbd.constructorArgumentLock) {
                //检查是否有构造方法或者工厂方法
                if (mbd.resolvedConstructorOrFactoryMethod != null) {
                    resolved = true;
                    autowireNecessary = mbd.constructorArgumentsResolved;
                }
            }
        }
        //true
        if (resolved) {
            if (autowireNecessary) {
                // 就采用构造方法生成bean
                return autowireConstructor(beanName, mbd, null, null);
            }
            else {
                //否则就是属性方法生成bean
                return instantiateBean(beanName, mbd);
            }
        }

        // Need to determine the constructor...
        Constructor<?>[] ctors = determineConstructorsFromBeanPostProcessors(beanClass, beanName);
        if (ctors != null ||
                mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_CONSTRUCTOR ||
                mbd.hasConstructorArgumentValues() || !ObjectUtils.isEmpty(args))  {
            return autowireConstructor(beanName, mbd, ctors, args);
        }

        // No special handling: simply use no-arg constructor.
        // 这里首先通过无参数的方法创建实例
        // 然后通过cglib代理的方式创建属性实例，用属性的方式注入到bean里面
        return instantiateBean(beanName, mbd);
    }

```
继续：
### autowireConstructor
```java
protected BeanWrapper autowireConstructor(
            String beanName, RootBeanDefinition mbd, Constructor<?>[] ctors, Object[] explicitArgs) {

    return new ConstructorResolver(this).autowireConstructor(beanName, mbd, ctors, explicitArgs);
}
```
autowireConstructor这个方法比较长：
```java
public BeanWrapper autowireConstructor(final String beanName, final RootBeanDefinition mbd,
            Constructor<?>[] chosenCtors, final Object[] explicitArgs) {
    //初始化BeanWrapperImpl        
    BeanWrapperImpl bw = new BeanWrapperImpl();
    //设置对应的类型转换器
    this.beanFactory.initBeanWrapper(bw);

    Constructor<?> constructorToUse = null;
    ArgumentsHolder argsHolderToUse = null;
    Object[] argsToUse = null;

    if (explicitArgs != null) {
        argsToUse = explicitArgs;
    }
    else {
        Object[] argsToResolve = null;
        synchronized (mbd.constructorArgumentLock) {
            constructorToUse = (Constructor<?>) mbd.resolvedConstructorOrFactoryMethod;
            if (constructorToUse != null && mbd.constructorArgumentsResolved) {
                // Found a cached constructor...
                argsToUse = mbd.resolvedConstructorArguments;
                if (argsToUse == null) {
                    argsToResolve = mbd.preparedConstructorArguments;
                }
            }
        }
        if (argsToResolve != null) {
            argsToUse = resolvePreparedArguments(beanName, mbd, bw, constructorToUse, argsToResolve);
        }
    }

    if (constructorToUse == null) {
        // Need to resolve the constructor.
        boolean autowiring = (chosenCtors != null ||
                mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_CONSTRUCTOR);
        ConstructorArgumentValues resolvedValues = null;

        int minNrOfArgs;
        if (explicitArgs != null) {
            minNrOfArgs = explicitArgs.length;
        }
        else {
            //获取构造函数的参数
            ConstructorArgumentValues cargs = mbd.getConstructorArgumentValues();
            resolvedValues = new ConstructorArgumentValues();
            minNrOfArgs = resolveConstructorArguments(beanName, mbd, bw, cargs, resolvedValues);
        }

        // Take specified constructors, if any.
        Constructor<?>[] candidates = chosenCtors;
        if (candidates == null) {
            //拿到class
            Class<?> beanClass = mbd.getBeanClass();
            try {
                //校验
                candidates = (mbd.isNonPublicAccessAllowed() ?
                        beanClass.getDeclaredConstructors() : beanClass.getConstructors());
            }
            catch (Throwable ex) {
                throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                        "Resolution of declared constructors on bean Class [" + beanClass.getName() +
                                "] from ClassLoader [" + beanClass.getClassLoader() + "] failed", ex);
            }
        }
        //把所有的构造方法排序
        //排序的规则是参数少->参数多
        AutowireUtils.sortConstructors(candidates);
        int minTypeDiffWeight = Integer.MAX_VALUE;
        Set<Constructor<?>> ambiguousConstructors = null;
        LinkedList<UnsatisfiedDependencyException> causes = null;
        //这里是去找到对应的构造方法
        //如果找不到会抛出异常
        for (int i = 0; i < candidates.length; i++) {
            Constructor<?> candidate = candidates[i];
            Class<?>[] paramTypes = candidate.getParameterTypes();

            if (constructorToUse != null && argsToUse.length > paramTypes.length) {
                // Already found greedy constructor that can be satisfied ->
                // do not look any further, there are only less greedy constructors left.
                break;
            }
            if (paramTypes.length < minNrOfArgs) {
                continue;
            }

            ArgumentsHolder argsHolder;
            if (resolvedValues != null) {
                try {
                    String[] paramNames = ConstructorPropertiesChecker.evaluate(candidate, paramTypes.length);
                    if (paramNames == null) {
                        ParameterNameDiscoverer pnd = this.beanFactory.getParameterNameDiscoverer();
                        if (pnd != null) {
                            paramNames = pnd.getParameterNames(candidate);
                        }
                    }
                    argsHolder = createArgumentArray(
                            beanName, mbd, resolvedValues, bw, paramTypes, paramNames, candidate, autowiring);
                }
                catch (UnsatisfiedDependencyException ex) {
                    if (this.beanFactory.logger.isTraceEnabled()) {
                        this.beanFactory.logger.trace(
                                "Ignoring constructor [" + candidate + "] of bean '" + beanName + "': " + ex);
                    }
                    // Swallow and try next constructor.
                    if (causes == null) {
                        causes = new LinkedList<UnsatisfiedDependencyException>();
                    }
                    causes.add(ex);
                    continue;
                }
            }
            else {
                // Explicit arguments given -> arguments length must match exactly.
                if (paramTypes.length != explicitArgs.length) {
                    continue;
                }
                argsHolder = new ArgumentsHolder(explicitArgs);
            }

            int typeDiffWeight = (mbd.isLenientConstructorResolution() ?
                    argsHolder.getTypeDifferenceWeight(paramTypes) : argsHolder.getAssignabilityWeight(paramTypes));
            // Choose this constructor if it represents the closest match.
            if (typeDiffWeight < minTypeDiffWeight) {
                constructorToUse = candidate;
                argsHolderToUse = argsHolder;
                argsToUse = argsHolder.arguments;
                minTypeDiffWeight = typeDiffWeight;
                ambiguousConstructors = null;
            }
            else if (constructorToUse != null && typeDiffWeight == minTypeDiffWeight) {
                if (ambiguousConstructors == null) {
                    ambiguousConstructors = new LinkedHashSet<Constructor<?>>();
                    ambiguousConstructors.add(constructorToUse);
                }
                ambiguousConstructors.add(candidate);
            }
        }

        if (constructorToUse == null) {
            if (causes != null) {
                UnsatisfiedDependencyException ex = causes.removeLast();
                for (Exception cause : causes) {
                    this.beanFactory.onSuppressedException(cause);
                }
                throw ex;
            }
            throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                    "Could not resolve matching constructor " +
                    "(hint: specify index/type/name arguments for simple parameters to avoid type ambiguities)");
        }
        else if (ambiguousConstructors != null && !mbd.isLenientConstructorResolution()) {
            throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                    "Ambiguous constructor matches found in bean '" + beanName + "' " +
                    "(hint: specify index/type/name arguments for simple parameters to avoid type ambiguities): " +
                    ambiguousConstructors);
        }

        if (explicitArgs == null) {
            argsHolderToUse.storeCache(mbd, constructorToUse);
        }
    }

    try {
        Object beanInstance;

        if (System.getSecurityManager() != null) {
            final Constructor<?> ctorToUse = constructorToUse;
            final Object[] argumentsToUse = argsToUse;
            beanInstance = AccessController.doPrivileged(new PrivilegedAction<Object>() {
                @Override
                public Object run() {
                    //实例化的关键代码。
                    return beanFactory.getInstantiationStrategy().instantiate(
                            mbd, beanName, beanFactory, ctorToUse, argumentsToUse);
                }
            }, beanFactory.getAccessControlContext());
        }
        else {
            beanInstance = this.beanFactory.getInstantiationStrategy().instantiate(
                    mbd, beanName, this.beanFactory, constructorToUse, argsToUse);
        }

        bw.setWrappedInstance(beanInstance);
        return bw;
    }
    catch (Throwable ex) {
        throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                "Bean instantiation via constructor failed", ex);
    }
}
```
### instantiateBean
```java
protected BeanWrapper instantiateBean(final String beanName, final RootBeanDefinition mbd) {
    try {
        Object beanInstance;
        final BeanFactory parent = this;
        if (System.getSecurityManager() != null) {
            beanInstance = AccessController.doPrivileged(new PrivilegedAction<Object>() {
                @Override
                public Object run() {
                    return getInstantiationStrategy().instantiate(mbd, beanName, parent);
                }
            }, getAccessControlContext());
        }
        else {
            beanInstance = getInstantiationStrategy().instantiate(mbd, beanName, parent);
        }
        BeanWrapper bw = new BeanWrapperImpl(beanInstance);
        initBeanWrapper(bw);
        return bw;
    }
    catch (Throwable ex) {
        throw new BeanCreationException(mbd.getResourceDescription(), beanName, "Instantiation of bean failed", ex);
    }
}
```
```java
public Object instantiate(RootBeanDefinition beanDefinition, String beanName, BeanFactory owner) {
    // Don't override the class with CGLIB if no overrides.
    if (beanDefinition.getMethodOverrides().isEmpty()) {
        Constructor<?> constructorToUse;
        synchronized (beanDefinition.constructorArgumentLock) {
            constructorToUse = (Constructor<?>) beanDefinition.resolvedConstructorOrFactoryMethod;
            if (constructorToUse == null) {
                final Class clazz = beanDefinition.getBeanClass();
                if (clazz.isInterface()) {
                    throw new BeanInstantiationException(clazz, "Specified class is an interface");
                }
                try {
                    if (System.getSecurityManager() != null) {
                        constructorToUse = AccessController.doPrivileged(new PrivilegedExceptionAction<Constructor>() {
                            public Constructor run() throws Exception {
                                return clazz.getDeclaredConstructor((Class[]) null);
                            }
                        });
                    }
                    else {
                        constructorToUse = clazz.getDeclaredConstructor((Class[]) null);
                    }
                    beanDefinition.resolvedConstructorOrFactoryMethod = constructorToUse;
                }
                catch (Exception ex) {
                    throw new BeanInstantiationException(clazz, "No default constructor found", ex);
                }
            }
        }
        return BeanUtils.instantiateClass(constructorToUse);
    }
    else {
        // Must generate CGLIB subclass.
        
        return instantiateWithMethodInjection(beanDefinition, beanName, owner);
    }
}
```
整段代码都在做一件事情，就是选择一个使用的构造函数。然后BeanUtils.instantiateClass(constructorToUse)实例化一个实例
```java
public static <T> T instantiateClass(Constructor<T> ctor, Object... args) throws BeanInstantiationException {
    Assert.notNull(ctor, "Constructor must not be null");
    try {
        ReflectionUtils.makeAccessible(ctor);
        return ctor.newInstance(args);
    }
    catch (InstantiationException ex) {
        throw new BeanInstantiationException(ctor.getDeclaringClass(),
                "Is it an abstract class?", ex);
    }
    catch (IllegalAccessException ex) {
        throw new BeanInstantiationException(ctor.getDeclaringClass(),
                "Is the constructor accessible?", ex);
    }
    catch (IllegalArgumentException ex) {
        throw new BeanInstantiationException(ctor.getDeclaringClass(),
                "Illegal arguments for constructor", ex);
    }
    catch (InvocationTargetException ex) {
        throw new BeanInstantiationException(ctor.getDeclaringClass(),
                "Constructor threw exception", ex.getTargetException());
    }
}
```
通过反射生成Bean的实例。看到前面有一步makeAccessible，这意味着即使Bean的构造函数是private、protected的，依然不影响Bean的构造。注意一下，这里被实例化出来的Bean并不会直接返回，而是会被包装为BeanWrapper继续在后面使用。
单例bean会缓存起来。多例bean spring每次都会自行创建。

# 依赖注入
populateBean这里把容器里的bean的依赖关系，注入到对应的bean里
这里可以说是IOC的核心代码了。
## populateBean
```java
protected void populateBean(String beanName, RootBeanDefinition mbd, BeanWrapper bw) {
        PropertyValues pvs = mbd.getPropertyValues();
        //校验
        if (bw == null) {
            if (!pvs.isEmpty()) {
                throw new BeanCreationException(
                        mbd.getResourceDescription(), beanName, "Cannot apply property values to null instance");
            }
            else {
                // Skip property population phase for null instance.
                return;
            }
        }

        // Give any InstantiationAwareBeanPostProcessors the opportunity to modify the
        // state of the bean before properties are set. This can be used, for example,
        // to support styles of field injection.
        boolean continueWithPropertyPopulation = true;
        //前置处理器
        if (!mbd.isSynthetic() && hasInstantiationAwareBeanPostProcessors()) {
            for (BeanPostProcessor bp : getBeanPostProcessors()) {
                if (bp instanceof InstantiationAwareBeanPostProcessor) {
                    InstantiationAwareBeanPostProcessor ibp = (InstantiationAwareBeanPostProcessor) bp;
                    if (!ibp.postProcessAfterInstantiation(bw.getWrappedInstance(), beanName)) {
                        continueWithPropertyPopulation = false;
                        break;
                    }
                }
            }
        }

        if (!continueWithPropertyPopulation) {
            return;
        }
        // 按照名字注入或者类型注入
        if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_NAME ||
                mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_TYPE) {
            //拿到类的所有属性
            MutablePropertyValues newPvs = new MutablePropertyValues(pvs);

            // Add property values based on autowire by name if applicable.
            // 如果是按照名称注入，注入顺序是先按照名字注入，然后是按照类型注入
            if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_NAME) {
                autowireByName(beanName, mbd, bw, newPvs);
            }

            // Add property values based on autowire by type if applicable.
            //如果是按照类型注入
            if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_TYPE) {
                autowireByType(beanName, mbd, bw, newPvs);
            }

            pvs = newPvs;
        }

        boolean hasInstAwareBpps = hasInstantiationAwareBeanPostProcessors();
        boolean needsDepCheck = (mbd.getDependencyCheck() != RootBeanDefinition.DEPENDENCY_CHECK_NONE);
        // 注入依赖检查。以及后置处理器的触发
        if (hasInstAwareBpps || needsDepCheck) {
            PropertyDescriptor[] filteredPds = filterPropertyDescriptorsForDependencyCheck(bw, mbd.allowCaching);
            if (hasInstAwareBpps) {
                for (BeanPostProcessor bp : getBeanPostProcessors()) {
                    if (bp instanceof InstantiationAwareBeanPostProcessor) {
                        InstantiationAwareBeanPostProcessor ibp = (InstantiationAwareBeanPostProcessor) bp;
                        pvs = ibp.postProcessPropertyValues(pvs, filteredPds, bw.getWrappedInstance(), beanName);
                        if (pvs == null) {
                            return;
                        }
                    }
                }
            }
            if (needsDepCheck) {
                checkDependencies(beanName, mbd, filteredPds, pvs);
            }
        }
        //设值
        applyPropertyValues(beanName, mbd, bw, pvs);
    }
```
这里主要关注两个方法。
### autowireByName
其实就是根据名字去map里面找对应bean，然后实例化，设置进去
```
protected void autowireByName(
            String beanName, AbstractBeanDefinition mbd, BeanWrapper bw, MutablePropertyValues pvs) {

    String[] propertyNames = unsatisfiedNonSimpleProperties(mbd, bw);
    for (String propertyName : propertyNames) {
        if (containsBean(propertyName)) {
            //获取bean的实例
            Object bean = getBean(propertyName);
            //注入进去
            pvs.add(propertyName, bean);
            registerDependentBean(propertyName, beanName);
            if (logger.isDebugEnabled()) {
                logger.debug("Added autowiring by name from bean name '" + beanName +
                        "' via property '" + propertyName + "' to bean named '" + propertyName + "'");
            }
        }
        else {
            if (logger.isTraceEnabled()) {
                logger.trace("Not autowiring property '" + propertyName + "' of bean '" + beanName +
                        "' by name: no matching bean found");
            }
        }
    }
}
```
### autowireByType
```java
protected void autowireByType(
            String beanName, AbstractBeanDefinition mbd, BeanWrapper bw, MutablePropertyValues pvs) {

    TypeConverter converter = getCustomTypeConverter();
    if (converter == null) {
        converter = bw;
    }

    Set<String> autowiredBeanNames = new LinkedHashSet<String>(4);
    String[] propertyNames = unsatisfiedNonSimpleProperties(mbd, bw);
    for (String propertyName : propertyNames) {
        try {
            PropertyDescriptor pd = bw.getPropertyDescriptor(propertyName);
            // Don't try autowiring by type for type Object: never makes sense,
            // even if it technically is a unsatisfied, non-simple property.
            if (Object.class != pd.getPropertyType()) {
                MethodParameter methodParam = BeanUtils.getWriteMethodParameter(pd);
                // Do not allow eager init for type matching in case of a prioritized post-processor.
                boolean eager = !PriorityOrdered.class.isAssignableFrom(bw.getWrappedClass());
                DependencyDescriptor desc = new AutowireByTypeDependencyDescriptor(methodParam, eager);
                //这里会去找类型相同的bean。这里代码比较长，有兴趣可以看一下。
                Object autowiredArgument = resolveDependency(desc, beanName, autowiredBeanNames, converter);
                if (autowiredArgument != null) {
                    pvs.add(propertyName, autowiredArgument);
                }
                for (String autowiredBeanName : autowiredBeanNames) {
                    registerDependentBean(autowiredBeanName, beanName);
                    if (logger.isDebugEnabled()) {
                        logger.debug("Autowiring by type from bean name '" + beanName + "' via property '" +
                                propertyName + "' to bean named '" + autowiredBeanName + "'");
                    }
                }
                autowiredBeanNames.clear();
            }
        }
        catch (BeansException ex) {
            throw new UnsatisfiedDependencyException(mbd.getResourceDescription(), beanName, propertyName, ex);
        }
    }
}
```

