;(function(jQuery) {
    'use strict';
    var settings = null;
    var methods = {
        init: function(options) {
            var defaults = jQuery.extend(true,{
                "timetable":{
                    "startTime":"07:20",
                    "endTime":"21:50",
                    "timeInterval": 600,
                    "borderWidth": 1,
                    "cellHeight":25,
                    "timeField": true,
                    "cellWidth":200,
                    "sortableColumn":true,
                    "scheduleConflictAllow":false,
                },
                "schedule": {
                    "data": {}
                },
                "event": {
                    "resize":null,
                    "drag":null,
                    "sort":null,
                    "rangeSelection":null
                }
            },options);
            //
            return this.each(function() {
                var $this = jQuery(this);
                settings = mergeOptions($this, defaults);
                var timetable = new Timetable($this, settings);
                //html build
                timetable.buildTimeField();
                jQuery.each(timetable.settings.schedule.data, function(index, val) {
                    timetable.buildColumn(val);
                    jQuery.each(val.schedule, function(index, data){
                        timetable.addSchedule(val.id, data);
                    });
                });
                timetable.event();
                //初期化処理
                $this.data('plugin_timetable', timetable);
            })
        },
        isDuplicate:function(resized, sibling){
            switch(true) {
                case (sibling.start <= resized.start && sibling.end >  resized.start):
                case (sibling.start <  resized.end   && sibling.end >= resized.end):
                case (sibling.start >= resized.start && sibling.end <= resized.end):
                    return true;
                    break;
                default:
                    return false;
            }
        },
        updateContents:function(node, obj) {
            node.find("time.start").text(obj.startTime);
            node.find("time.end").text(obj.endTime);
        }

    }
    // プラグイン登録
    jQuery.fn.timetable = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  method + ' does not exist on jQuery.timetable');
        }
    }
    //private method
    var mergeOptions = function($el, settings) {
        return jQuery.extend(true,{}, settings, $el.data());
    };
    var strToTime = function(string) {
        var time = string.split(':');
        var hour = Number(time[0]) * 3600;
        var min  = Number(time[1]) * 60;
        return hour + min;
    };
    var timeToStr = function(sec) {
        var hour = Math.floor(sec / 3600);
        var min  = (sec % 3600) / 60; 
        return zeroPadding(hour)+':'+zeroPadding(min);
    };
    var zeroPadding = function(num) {
        return ("0"+num).substr(-2);
    }
    var topHeightToTime = function (top,height) {
        var start = ((top / (settings.timetable.cellHeight+1) * settings.timetable.timeInterval) + strToTime(settings.timetable.startTime));
        var end   = ((height) / (settings.timetable.cellHeight+1)) * settings.timetable.timeInterval + start;
        return {
            "start": start,
            "end": end,
            "startTime": timeToStr(start),
            "endTime":timeToStr(end),
        }
    }

    //class
    var Timetable = (function() {
        var NAMESPACE = '.timetable';
        //constructor
        var Timetable = function($el, settings) {
            this.$el       = $el;
            this.settings  = settings;
        }
        //インスタンスメソッド
        jQuery.extend(Timetable.prototype, {}, {
            buildTimeField: function() {
                var start = strToTime(this.settings.timetable.startTime);
                var end   = strToTime(this.settings.timetable.endTime);
                var html  =  '<div class="timeField">';
                html  += '<div class="originCell headFix">+</div>';
                var i = start;
                var isView = true;
                while(i<end) {
                    if(isView) {
                        html += '<div class="timeCell">'+timeToStr(i)+'</div>';
                    } else {    
                        html += '<div class="timeCell"></div>';
                    }
                    //next
                    i+=settings.timetable.timeInterval;
                    if(i % 3600) {
                        isView = false;
                    } else {
                        isView = true;
                    }
                }
                html += '</div>';
                this.$el.append(html).css('overflow',"hidden");
            },
            buildColumn:function(data) {
                var start     = strToTime(this.settings.timetable.startTime);
                var end       = strToTime(this.settings.timetable.endTime);
                var columnId  = data.id;
                var html      = '';
                var i         = start;
                //html
                html += '<div class="column column'+columnId+'" id="item'+columnId+'" data-column-id="'+data.id+'" style="width:'+this.settings.timetable.cellWidth+'px;">';
                html += '<div class="headCell headFix" style="width:'+this.settings.timetable.cellWidth+'px;">'+data.title+'</div>';
                html += '<div class="scheduleFrame">';
                while(i<end) {
                    html += '<div class="cell time'+i+'" data-date="'+i+'"></div>'; 
                    i+=600;
                }
                html += '</div>';
                html += '</div>';
                html += '</div>';
                this.$el.append(html);
                //width controll
                var width = 0;
                this.$el.children().each(function(){
                    width += jQuery(this).outerWidth();
                });
                this.$el.css('width',width);
            },
            addSchedule: function(id,data) {
                var start  = strToTime(this.settings.timetable.startTime);
                var top    = ((strToTime(data.start) - start) / this.settings.timetable.timeInterval) * (this.settings.timetable.cellHeight + this.settings.timetable.borderWidth);
                var height = ((strToTime(data.end) - strToTime(data.start)) / this.settings.timetable.timeInterval) * (this.settings.timetable.cellHeight + this.settings.timetable.borderWidth);//- 1;// test
                var style  = 'top:'+top+'px;height:'+height+'px;width:'+(this.settings.timetable.cellWidth)+'px;left:0px;';
                var html   = '<div id="schedule'+data.id+'" class="schedule" style="'+style+'">';
                html      +=   '<div class="contents">';
                html      +=   '<div class="time"><time class="start">'+data.start+'</time> - <time class="end">'+data.end+'</time></div>';
                html      +=     '<div class="text">'+data.text+'</div>';
                html      +=   '</div>';
                html      += '</div>';
                jQuery(html).data({"id":data.id,"top":top,"start":strToTime(data.start),"end":strToTime(data.end)}).appendTo(this.$el.children('div.column'+id).children("div.scheduleFrame"));
            },
            event: function() {
                //Range selection 
                var isDown           = false;
                var selectedColumnId = null;
                var downCellDate  = null;
                var scUnit           = this.settings.timetable.cellHeight + 1;
                jQuery("div.cell").on({
                    'mousedown': function(ev){
                        isDown   = true;
                        jQuery(this).addClass('selectedCell');
                        selectedColumnId = jQuery(this).parent('div.scheduleFrame').parent("div.column").data('columnId');
                        downCellDate     = jQuery(this).data("date");
                        return false;
                    },
                    'mouseup': function(ev){ 
                        if(isDown) {
                            jQuery("div.cell").removeClass("selectedCell");
                            //time
                            var node        = jQuery(this);
                            var upCellDate  = node.data("date");
                            switch(true) {
                                case downCellDate == upCellDate:
                                case downCellDate <  upCellDate:
                                    var start = downCellDate;
                                    var end   = upCellDate + settings.timetable.timeInterval;
                                    break;
                                case downCellDate > upCellDate:
                                    var start = upCellDate;
                                    var end   = downCellDate + settings.timetable.timeInterval;
                                    break;
                                default:
                                    isDown = false
                                    return;
                            }
                            if(!settings.timetable.scheduleConflictAllow) {
                                jQuery(this).siblings('div.schedule').each(function(key,val) {
                                    var valObj  = jQuery(val);
                                    var sibling = topHeightToTime(valObj.position().top,valObj.height());
                                    if(jQuery.fn.timetable('isDuplicate',{"start":start,"end":end},sibling)) {
                                        isDown = false;
                                        return;
                                    }
                                });
                            }
                            if(settings.event.rangeSelection) {
                                settings.event.rangeSelection({"start":start,"end":end});
                            }
                        }
                        isDown = false;
                    },
                    'mouseover':function() {
                        if(isDown == true) {
                            //範囲選択の色
                            jQuery('div.column'+selectedColumnId+' > div.scheduleFrame > div.time'+jQuery(this).data("date")).addClass('selectedCell');
                            //消す
                            switch(true) {
                                case downCellDate == jQuery(this).data('date'):
                                    jQuery('div.column'+selectedColumnId+' > div.scheduleFrame > div.time'+jQuery(this).data("date")).prevAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div.scheduleFrame > div.time'+jQuery(this).data("date")).nextAll().removeClass('selectedCell');
                                    break;
                                case downCellDate < jQuery(this).data('date'):
                                    jQuery('div.column'+selectedColumnId+' > div > div.time'+jQuery(this).data("date")).nextAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div > div.time'+downCellDate).prevAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div > div.time'+jQuery(this).data("date")).prevUntil('div.time'+downCellDate).addClass('selectedCell');
                                    break;
                                case downCellDate > jQuery(this).data('date'):
                                    jQuery('div.column'+selectedColumnId+' > div > div.time'+jQuery(this).data("date")).prevAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div > div.time'+downCellDate).nextAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div > div.time'+jQuery(this).data("date")).nextUntil('div.time'+downCellDate).addClass('selectedCell');
                                    break;
                            }
                        }
                    }
                });
                if(this.settings.timetable.sortableColumn) {
                    this.$el.sortable({
                        axis: "x",
                        handle: "div.headCell",
                        items: "div.column",
                        update: function(ev, ui) {
                            var timetable = jQuery(this).data('plugin_timetable');
                            if(timetable.settings.event){
                                timetable.settings.event.sort();
                            }
                        }
                    });
                }
                //resizable
                this.$el.find("div.schedule").resizable({
                    handles: "n,s",
                    grid: [this.settings.timetable.cellWidth,scUnit],
                    containment: "parent",
                    start: function(e, ui) {
                    },
                    resize: function(e, ui) {
                        var node       = jQuery(this);
                        var time       = topHeightToTime(node.position().top, node.height());
                        jQuery.fn.timetable('updateContents',node, time);
                    },
                    stop: function(e, ui) {
                        var isError    = false;
                        var node       = jQuery(this);
                        var time       = topHeightToTime(node.position().top, node.height());
                        if(!settings.timetable.scheduleConflictAllow) {
                            node.siblings('div.schedule').each(function(key,val) {
                                var valObj  = jQuery(val);
                                var sibling = topHeightToTime(valObj.position().top, valObj.height());
                                if(jQuery.fn.timetable('isDuplicate',time,sibling)) {
                                    //cancel
                                    isError = true;
                                    node.css('height',node.data('ui-resizable').originalSize.height).css("top",node.data('ui-resizable').originalPosition.top);
                                    var originalTime = topHeightToTime(node.data('ui-resizable').originalPosition.top, node.data('ui-resizable').originalSize.height);
                                    jQuery.fn.timetable('updateContents',node, originalTime);
                                }
                            });
                        }
                        if(!isError) {
                            jQuery.fn.timetable('updateContents',node, time);
                            node.data({
                                "top":node.position().top,
                                "start":time.start, 
                                "end":time.end
                            });
                            if(settings.event.resize) {
                                settings.event.resize(e, ui, time);
                            }
                        }
                    }
                });
                //draggable
                this.$el.find("div.schedule").draggable({
                    axis: "y",
                    grid: [this.settings.timetable.cellWidth,scUnit],
                    containment: "parent",
                    start: function(e,ui) {
                    },
                    drag: function(e,ui) {
                        var node       = jQuery(this);
                        var time       = topHeightToTime(node.position().top, node.height());
                        jQuery.fn.timetable('updateContents',node, time);
                    },
                    stop: function(e,ui) {
                        var node       = jQuery(this);
                        var time       = topHeightToTime(node.position().top, node.height());
                        var isError    = false;
                        if(!settings.timetable.scheduleConflictAllow) {
                            jQuery(this).siblings('div.schedule').each(function(key,val) {
                                var valObj  = jQuery(val);
                                var sibling = topHeightToTime(valObj.position().top, valObj.height());
                                if(jQuery.fn.timetable('isDuplicate',time,sibling)) {
                                    //draggable cancel
                                    jQuery.fn.timetable('updateContents',node, {"startTime":timeToStr(node.data("start")),"endTime":timeToStr(node.data("end"))});
                                    //node.css("top",node.data('ui-draggable').originalPosition.top);
                                    node.css("top",node.data("top"));
                                    isError    = true;
                                }
                            });
                        }
                        if(!isError) {
                            jQuery.fn.timetable('updateContents',node, time);
                            node.data({
                                "top":node.position().top,
                                "start":time.start, 
                                "end":time.end
                            });
                            if(settings.event.drag) {
                                settings.event.drag(e, ui, time);
                            }
                        }
                    }
                });
                //window scroll
                var headFix = jQuery('div.headFix');
                var offset  = headFix.offset();
                jQuery(window).on('scroll',this.$el,function(){
                  if(jQuery(window).scrollTop() > offset.top - 10) {
                    headFix.addClass('fixed');
                  } else {
                    headFix.removeClass('fixed');
                  }

                });
            },
            /*
             * 指定したメソッドのthisがTimetableのインスタンスになるように束縛します
             */
            _bind: function(funcName) {
              var that = this;
              return function() { that[funcName].apply(that, arguments) };
            },
        });
        return Timetable;
    })();
}) (jQuery);