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
                    "cellHeight":20,
                    "timeField": true,
                    "cellWidth":180,
                    "sortableColumn":true,
                    "eventConflictAllow":false,
                },
                "schedule": {
                    "data": {}
                },
                "event": {
                    "resize":null,
                    "drag":null,
                    "sort":null,
                    "rangeSelection":null,
                    "conflict":null,
                }
            },options);
            //
            return this.each(function() {
                var $this = jQuery(this);
                $this.addClass("timetable");
                settings = mergeOptions($this, defaults);
                var timetable = new Timetable($this, settings);
                //html build
                if(settings.timetable.timeField) {
                    timetable.buildTimeField();
                }
                jQuery.each(timetable.settings.schedule.data, function(index, val) {
                    timetable.buildColumn(val);
                    jQuery.each(val.event, function(index, data){
                        timetable.addEvent(val.id, data);
                    });
                });
                timetable.event();
                //初期化処理
                $this.data('plugin_timetable', timetable);
            })
        }
    }
    //Plugin
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
    function mergeOptions($el, settings) {
        return jQuery.extend(true,{}, settings, $el.data());
    };
    function timeStrToInt(string) {
        var time = string.split(':');
        var hour = Number(time[0]) * 3600;
        var min  = Number(time[1]) * 60;
        return hour + min;
    };
    function intToTimeStr(sec) {
        var hour = Math.floor(sec / 3600);
        var min  = (sec % 3600) / 60; 
        return zeroPadding(hour)+':'+zeroPadding(min);
    }
    function zeroPadding(num) {
        return ("0"+num).substr(-2);
    }
    function topHeightToTime (top,height) {
        var start = ((top / (settings.timetable.cellHeight+1) * settings.timetable.timeInterval) + timeStrToInt(settings.timetable.startTime));
        var end   = ((height) / (settings.timetable.cellHeight+1)) * settings.timetable.timeInterval + start;
        return {
            "start": start,
            "end": end,
            "startTime": intToTimeStr(start),
            "endTime":intToTimeStr(end),
        }
    }
    function isConflict (resized, sibling){
        switch(true) {
            case (sibling.start <= resized.start && sibling.end >  resized.start):
            case (sibling.start <  resized.end   && sibling.end >= resized.end):
            case (sibling.start >= resized.start && sibling.end <= resized.end):
                return true;
                break;
            default:
                return false;
        }
    }
    function updateContents(node, obj) {
            node.find("time.start").text(obj.startTime);
            node.find("time.end").text(obj.endTime);
    }
    function resizableOptions() {
        var scUnit           = settings.timetable.cellHeight + 1;
        return {
            handles: "n,s",
            grid: [settings.timetable.cellWidth,scUnit],
            containment: "parent",
            start: function(event, ui) {
            },
            resize: function(event, ui) {
                var node       = jQuery(this);
                var time       = topHeightToTime(node.position().top, node.height());
                updateContents(node, time);
            },
            stop: function(event, ui) {
                var isError    = false;
                var node       = jQuery(this);
                var time       = topHeightToTime(node.position().top, node.height());
                if(!settings.timetable.eventConflictAllow) {
                    node.siblings('div.event').each(function(key,val) {
                        var valObj  = jQuery(val);
                        var sibling = topHeightToTime(valObj.position().top, valObj.height());
                        if(isConflict(time,sibling)) {
                            //cancel
                            isError = true;
                            node.css('height',node.data('ui-resizable').originalSize.height).css("top",node.data('ui-resizable').originalPosition.top);
                            var originalTime = topHeightToTime(node.data('ui-resizable').originalPosition.top, node.data('ui-resizable').originalSize.height);
                            updateContents(node, originalTime);
                            if(settings.event.conflict) {
                                settings.event.conflict()
                            }
                            return;
                        }
                    });
                }
                if(!isError) {
                    updateContents(node, time);
                    node.data({
                        "top":node.position().top,
                        "start":time.start, 
                        "end":time.end
                    });
                    if(settings.event.resize) {
                        settings.event.resize(event, ui, time);
                    }
                }
            }
        };
    }

    function draggableOptions() {
        var scUnit           = settings.timetable.cellHeight + 1;
        return {
            axis: "y",
            grid: [settings.timetable.cellWidth,scUnit],
            containment: "parent",
            start: function(event,ui) {
            },
            drag: function(event,ui) {
                var node       = jQuery(this);
                var time       = topHeightToTime(node.position().top, node.height());
                updateContents(node, time);
            },
            stop: function(event,ui) {
                var node       = jQuery(this);
                var time       = topHeightToTime(node.position().top, node.height());
                var isError    = false;
                if(!settings.timetable.eventConflictAllow) {
                    jQuery(this).siblings('div.event').each(function(key,val) {
                        var valObj  = jQuery(val);
                        var sibling = topHeightToTime(valObj.position().top, valObj.height());
                        if(isConflict(time,sibling)) {
                            //draggable cancel
                            updateContents(node, {"startTime":intToTimeStr(node.data("start")),"endTime":intToTimeStr(node.data("end"))});
                            node.css("top",node.data("top"));
                            isError    = true;
                            if(settings.event.conflict) {
                                settings.event.conflict()
                            }
                            return;
                        }
                    });
                }
                if(!isError) {
                    updateContents(node, time);
                    node.data({
                        "top":node.position().top,
                        "start":time.start, 
                        "end":time.end
                    });
                    if(settings.event.drag) {
                        settings.event.drag(event, ui, time);
                    }
                }
            }
        };
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
                //this.test();
                var start = timeStrToInt(settings.timetable.startTime);
                var end   = timeStrToInt(settings.timetable.endTime);
                var html  =  '<div class="timeField">';
                html  += '<div class="originCell headerCells"><div style="width:'+settings.timetable.cellWidth+'px;"></div></div>';
                var i = start;
                var isView = true;
                while(i<end) {
                    var timeCellBorder = '';
                    if(!((i + settings.timetable.timeInterval) % 3600)) {
                        timeCellBorder = 'timeCellBorder';
                    }
                    html += '<div class="timeCell '+timeCellBorder+'" style="height:'+settings.timetable.cellHeight+'px;">';
                    if(isView) {
                        html += intToTimeStr(i);
                    }
                    html += '</div>';
                    //next
                    i+=settings.timetable.timeInterval;
                    if(i % 3600) {
                        isView = false;
                    } else {
                        isView = true;
                    }
                }
                html += '</div>';
                this.$el.append(html);
            },
            buildColumn:function(data) {
                var start     = timeStrToInt(settings.timetable.startTime);
                var end       = timeStrToInt(settings.timetable.endTime);
                var columnId  = data.id;
                var html      = '';
                var i         = start;
                //html
                html += '<div class="column column'+columnId+'" id="item'+columnId+'" data-column-id="'+data.id+'" style="width:'+settings.timetable.cellWidth+'px;">';
                html +=   '<div class="headCell headerCells" style="width:'+settings.timetable.cellWidth+'px;"><div style="width:'+settings.timetable.cellWidth+'px;">'+data.title+'</div></div>';
                html +=   '<div class="eventFrame">';
                while(i<end) {
                    html += '<div class="cell time'+i+'" data-date="'+i+'" style="height:'+settings.timetable.cellHeight+'px;"></div>'; 
                    i+=settings.timetable.timeInterval;
                }
                html +=   '</div>';
                html += '</div>';
                this.$el.append(html);
                //width controll
                var width = 0;
                this.$el.children().each(function(){
                    width += jQuery(this).outerWidth();
                });
                this.$el.css('width',width);
            },
            addEvent: function(columnId,data) {
                var start  = timeStrToInt(settings.timetable.startTime);
                var top    = ((timeStrToInt(data.startTime) - start) / settings.timetable.timeInterval) * (settings.timetable.cellHeight + 1);
                var height = ((timeStrToInt(data.endTime) - timeStrToInt(data.startTime)) / settings.timetable.timeInterval) * (settings.timetable.cellHeight + 1);
                var style  = 'top:'+top+'px;height:'+height+'px;width:'+(settings.timetable.cellWidth)+'px;left:0px;';
                var html   = '<div class="event" style="'+style+'">';
                html      +=   '<div class="contents">';
                html      +=   '<div class="time"><time class="start">'+data.startTime+'</time> - <time class="end">'+data.endTime+'</time></div>';
                html      +=     '<div class="text">'+data.text+'</div>';
                html      +=   '</div>';
                html      += '</div>';
                jQuery(html).data({"id":data.id,"top":top,"start":timeStrToInt(data.startTime),"end":timeStrToInt(data.endTime)}).resizable(resizableOptions()).draggable(draggableOptions()).appendTo(this.$el.children('div.column'+columnId).children("div.eventFrame"));
            },
            event: function() {
                //Range selection 
                var isDown           = false;
                var selectedColumnId = null;
                var downCellDate  = null;
                jQuery(".timetable").on({
                    'mousedown': function(ev){
                        isDown   = true;
                        jQuery(this).addClass('selectedCell');
                        selectedColumnId = jQuery(this).parent('div.eventFrame').parent("div.column").data('columnId');
                        downCellDate     = jQuery(this).data("date");
                        return false;
                    },
                    'mouseup': function(ev){ 
                        if(isDown) {
                            jQuery("div.cell").removeClass("selectedCell");
                            //time
                            var node        = jQuery(this);
                            var upCellDate  = node.data("date");
                            var isError     = false;
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
                            if(!settings.timetable.eventConflictAllow) {
                                jQuery(this).siblings('div.event').each(function(key,val) {
                                    var valObj  = jQuery(val);
                                    var sibling = topHeightToTime(valObj.position().top,valObj.height());
                                    if(isConflict({"start":start,"end":end},sibling)) {
                                        isError = true;
                                        isDown  = false;
                                        if(settings.event.conflict) {
                                            settings.event.conflict()
                                        }
                                        return;
                                    }
                                });
                            }
                            if(!isError && settings.event.rangeSelection) {
                                settings.event.rangeSelection({"startTime":intToTimeStr(start),"endTime":intToTimeStr(end)});
                            }
                        }
                        isDown = false;
                    },
                    'mouseover':function() {
                        if(isDown == true) {
                            //範囲選択の色
                            jQuery('div.column'+selectedColumnId+' > div.eventFrame > div.time'+jQuery(this).data("date")).addClass('selectedCell');
                            //消す
                            switch(true) {
                                case downCellDate == jQuery(this).data('date'):
                                    jQuery('div.column'+selectedColumnId+' > div.eventFrame > div.time'+jQuery(this).data("date")).prevAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div.eventFrame > div.time'+jQuery(this).data("date")).nextAll().removeClass('selectedCell');
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
                },'div.cell');
                //sortable
                if(settings.timetable.sortableColumn) {
                    this.$el.sortable({
                        axis: "x",
                        handle: "div.headCell",
                        items: "div.column",
                        update: function(event, ui) {
                            if(settings.event.sort){
                                settings.event.sort(event, ui);
                            }
                        }
                    });
                }
                //window scroll
                var offset  = jQuery('div.headerCells').offset();
                var xScroll = '';
                var yScroll = '';
                if (settings.timetable.timeField) {
                    var timeFieldWidth = jQuery('div.timeField').width() + 2;
                } else {
                    var timeFieldWidth = 1;
                }
                jQuery(window).on('scroll',function(){
                    //横スクロール
                    if(xScroll != jQuery(window).scrollLeft()) {
                        var initPoint = jQuery('div.timetable').position().left;
                        if (settings.timetable.timeField) {
                            jQuery('div.originCell').css('left',2 - jQuery(window).scrollLeft() + initPoint);
                        }
                        jQuery('div.headCell').each(function() {
                            if (settings.timetable.timeField) {
                                var defaultPositionLeft = timeFieldWidth + initPoint + (settings.timetable.cellWidth * ($(this).parent().index() - 1)) + (2 * ($(this).parent().index()));
                            } else {
                                var defaultPositionLeft = timeFieldWidth + initPoint + (settings.timetable.cellWidth *  $(this).parent().index()     ) + (2 * ($(this).parent().index()));
                            }
                            var left    = defaultPositionLeft - jQuery(window).scrollLeft();
                            jQuery(this).css('left',left);

                        });
                    }
                    if(yScroll != jQuery(window).scrollTop()) {
                        if(jQuery(window).scrollTop() > offset.top) {
                            jQuery('div.headerCells').addClass('fixed');
                            jQuery('div.headerCells').next().addClass('scrollArea');
                        } else {
                            jQuery('div.headerCells').removeClass('fixed');
                            jQuery('div.headerCells').next().removeClass('scrollArea');
                        }
                    }
                    xScroll = jQuery(window).scrollLeft();
                    yScroll = jQuery(window).scrollTop();
                });
            },
            _bind: function(funcName) {
              var that = this;
              return function() { that[funcName].apply(that, arguments) };
            }
        });
        return Timetable;
    })();
}) (jQuery);