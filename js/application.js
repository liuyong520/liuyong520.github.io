// build time:Sat Apr 27 2019 20:07:20 GMT+0800 (China Standard Time)
$(function(){$('[data-toggle="tooltip"]').tooltip();if(typeof $.fn.slimScroll!="undefined"){$(".sidebar .slimContent").slimScroll({height:$(window).height(),color:"rgba(0,0,0,0.15)",size:"5px",position:"right"})}$("#collapseToc").on("shown.bs.collapse",function(){if(typeof $.fn.slimScroll!="undefined"){$(".sidebar .slimContent").slimScroll().on("slimscroll")}});$(".geopattern").each(function(){$(this).geopattern($(this).data("pattern-id"))});var t=$("#nav-main").okayNav({swipe_enabled:false});$("[data-stick-bottom]").keepInView({fixed:false,parentClass:"has-sticky",customClass:"sticky",trigger:"bottom",zindex:42,edgeOffset:0});$("[data-stick-top]").keepInView({fixed:true,parentClass:"has-sticky",customClass:"sticky",trigger:"top",zindex:42,edgeOffset:0});var e=$("ul.main-nav").hasClass("menu-highlight");if(e){var i=location.pathname,a=$("ul.main-nav>li"),s=-1;for(var n=0,l=a.length;n<l;n++){var o=$(a[n]).find("a").attr("href");if(i.indexOf(o)>-1||i==="/"&&(o==="/."||o==="/"||o==="index.html"||o==="/index.html")){s=n}$(a[n]).removeClass("active")}a[s]&&$(a[s]).addClass("active")}});
//rebuild by neat 