/*
 * Presentation Plugin - UI Widget
 * Copyright (c) 2010 adam j.sontag
 * 
 * Based on 
 * Presentation Plugin
 * Copyright (c) 2010 Trevor Davis
 * http://www.viget.com/
 * Dual licensed under the MIT and GPL licenses.
 * Uses the same license as jQuery, see:
 * http://jquery.org/license
 *
 * @version 0.3
 *
 * Example usage:
 * $('#slides').presentation({
 *   slide: '.slide',
 *   start: 2,
 *   pagerClass: 'nav-pager',
 *   prevNextClass: 'nav-prev-next',
 *   prevText: 'Previous',
 *   nextText: 'Next',
 *   transition: 'fade'
 * });
 */
(function($) {
	var navigationTimeout,
		swapActive = function(e) {
			$(e.target).closest("li").not("."+this.options.currentClass).toggleClass("ui-state-active",e.type == "mouseover").toggleClass("ui-state-default", e.type == "mouseout");			
		};
	
	$.widget( "aj.presentation", {
		options: {
				slide: '.slide',
				pagerClass: 'aj-presentation-pager',
				prevNextClass: 'aj-presentation-prev-next',
				currentClass:"aj-presentation-current",
				prevText: 'Previous',
				nextText: 'Next',
				transition: "fade",
				start: parseInt(window.location.hash.substr(1)) || 1,
				navigate:$.noop,
				slides:false,
				pager:false,
				prevNext:false,
				themeswitcher:false
		},
		_create: function() {
	        this.slides = this.element.find(this.options.slide).addClass("aj-presentation-slide")
			this.options.slides && this._connectSlides();
			//Make sure the starting value isn't 0
			this.options.start = this.options.start || 1;
			//Set the current to the specified starting slide, a number in the url,
			this.current = this.slides.filter(":nth-child("+this.options.start+")");
			//Use 'count' to store the current slide number
			this.count = this.options.start;
                        //Hide everything except the hash or the first			
			this.slides.not(this.current[0]).hide()
                        this._addControls();
			$(document.body).addClass("ui-widget-content");

		},
		_setOption:function(key,value) {
			switch(key)	{
				case "pager":
				case "prevNext":
					this.options[key] = value;
					this[key][(value ? "remove" : "add")+"Class"]("ui-helper-hidden");
					break;
			}
		},
		_addControls:function() {
			var self = this, pagerPages = [], i = 0, numSlides = this.slides.length;
	        //Add in the pager
	        this.pager = $('<ol class="ui-widget-header ui-corner-top '+this.options.pagerClass + (!this.options.pager ? ' ui-helper-hidden': '') +'">');
	        for(i = 1; i < numSlides+1; i++) {
	          pagerPages.push('<li class="ui-state-default ui-corner-top"><a href="#'+i+'">'+i+'</a></li>');
	        }
			this.pager
				.html(pagerPages.join(''))
				.appendTo(this.element)
				.delegate("a","mouseenter mouseleave",$.proxy(swapActive,this))
				.delegate("a","click",$.proxy(this._pagerClick,this));
			this.pagerPages = this.pager.children();
			this.pagerPages.eq(this.count-1).addClass(this.options.currentClass).toggleClass("ui-state-default ui-state-active");
			this.navigate("init");
			
	        //Add in the previous/next links
	        this.prevNext = $('<ul class="'+this.options.prevNextClass+ (!this.options.prevNext ? ' ui-helper-hidden': '')+ '">' +
							'<li class="ui-state-default ui-corner-bottom"><a href="#prev" class="prev">'+this.options.prevText+'</a></li>' +
							'<li class="ui-state-default ui-corner-bottom"><a href="#next" class="next">'+this.options.nextText+'</a></li>')
							.appendTo(this.element)
							.delegate("a","mouseenter mouseleave",$.proxy(swapActive,this))
							.delegate("a","click",function(e){
								self.navigate($(this).attr("class"),e)
							});

			//Add in the themeswitcher widget if available 
			if (this.options.themeswitcher && $.fn.themeswitcher) {
				this.switcher = $("<li>").appendTo(this.prevNext).themeswitcher();
			}
	        //When you hit the left arrow, go to previous slide
	        //When you hit the right arrow, go to next slide
	        $(document).bind("keyup.presentation",function(e) {
	          var action = "";
				if (!$(e.target).is(":input")) {
					switch(e.keyCode) {
						case $.ui.keyCode.LEFT:
							action = "prev";
							break;
						case $.ui.keyCode.RIGHT:
						case $.ui.keyCode.SPACE:
							action = "next";
							break;
					}
		          action.length && self.navigate(action,e);
				}
	        }).bind("dblclick.presentation",function(e) {
				self.navigate("next",e);
			});	
		},
		_connectSlides:function(){
			$.each(this.options.slides,$.proxy(function(key,slide){
				//If the key is a number, associate the slide data with the according slide
				var self = this;
				if (!isNaN(+key)){
					var s = this.slides.eq(+key-1).bind("navigate.presentation",function(e,ui){
						slide[ui.action] && slide[ui.action].call(s,e,ui);
					});
					slide.init && slide.init.call(s,$.Event("init.presentation"),this._ui("visible"));
				} else {
					this.element.delegate(key,"navigate.presentation",function(e,ui){
						slide[ui.action] && slide[ui.action].call(this,e,ui)
					})
					slide.init && this.element.find(key).each(function(i,n) { slide.init.call(this,$.Event("init.presentation"),self) });
				}
			},this));
		},
		navigate:function(action,event){
			//TODO: Prevent navigation below 0 and above max slides
			navigationTimeout && clearTimeout(navigationTimeout);
			navigationTimeout =  setTimeout($.proxy(function() {
			var navTo, ui = this._ui("visible");
				if (typeof action == "string"){
					action == "next" && this.count++;
					action == "prev" && this.count--;
				} else {
					this.count = action;
				}
				//We don't want to navigate to a slide that doesn't exist
				navTo = this.slides.eq(this.count-1);
				if (!navTo.length) {
					return;
				}
				this.current = navTo;
				$.extend(ui,this._ui("selected"));
				if(action == "init") {
					ui.selectedSlide.trigger("navigate.presentation",[$.extend({action:"open"},ui)])													
				} else {
					this._trigger("navigate",event,ui);
		  	     	switch (this.options.transition) {
		  	        	case 'show':
						case 'hide':
							ui.visibleSlide.trigger("navigate.presentation",[$.extend({action:"close"},ui)])
							ui.visibleSlide.hide();
							ui.selectedSlide.show();
							ui.selectedSlide.trigger("navigate.presentation",[$.extend({action:"open"},ui)])								
							break;
						case 'slide':
							ui.visibleSlide.trigger("navigate.presentation",[$.extend({action:"close"},ui)])							
							ui.visibleSlide.slideUp(500, function () {
							    ui.selectedSlide.slideDown(1000,function(){
									ui.selectedSlide.trigger("navigate.presentation",[$.extend({action:"open"},ui)])															
								})
							});
							break;
						default:
							ui.visibleSlide.trigger("navigate.presentation",[$.extend({action:"close"},ui)])							
							ui.visibleSlide.fadeOut(500,function() {
								ui.selectedSlide.fadeIn(500,function(){
									ui.selectedSlide.trigger("navigate.presentation",[$.extend({action:"open"},ui)])																							
								});
							});
					}
					window.location.hash = this.count;
				}
				if (this.options.pager) {
	  				this.pagerPages.removeClass(this.options.currentClass+ " ui-state-active").addClass("ui-state-default").eq(this.count-1).addClass(this.options.currentClass + " ui-state-active");
				}
			},this),500);

		},
		_pagerClick:function(event) {
			event.preventDefault();
			this.navigate($(event.target).parent().prevAll().length+1,event);

		},
		_ui:function(mode) {
			var ui = {presentation:this};
			mode = $.isArray(mode) ? mode : [mode];
			$.each(mode,$.proxy(function(i,m){
				ui[m+"Slide"] = this.current;
				ui[m+"SlideIndex"] = this.count;				
			},this));
			return ui;			
		},
		next:function(e){
			this.navigate("next",e)
		},
		prev:function(e){
			this.navigate("prev",e)
		}
	});

}(jQuery));