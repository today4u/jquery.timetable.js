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
                    "test":function() {
                        console.log('test');
                    },
                    "resize":null,
                    "drag":null,
                }
            },options);
            //
            return this.each(function() {
                var $this = jQuery(this);
                settings = mergeOptions($this, defaults);
                var timetable = new Timetable($this, settings);
                //html build
                timetable.buildTimeField();
                //timetable.buildNewColumn();
                jQuery.each(timetable.settings.schedule.data, function(index, val) {
                    timetable.buildColumn(val);
                    jQuery.each(val.schedule, function(index, data){
                        timetable.addSchedule(val.id,data);
                    });
                });
                timetable.event();
                //初期化処理
                $this.data('plugin_timetable', timetable);
            })
        },
        //
        addColumn: function(event) {
            //console.log(event.target.id);
            event.preventDefault();
            return this.each(function() {
                var timetable = jQuery(this).data('plugin_timetable');
                var $form     = jQuery('.addColumn > form');
                //処理
                jQuery.ajax({
                    type: $form.attr('method'),
                    url:  $form.attr('action'),
                    data: $form.serialize()
                }).done(function(response) {
                    timetable.buildColumn(JSON.parse(response));
                    jQuery('div.addColumn').dialog('close');
                    $form.find("textarea, :text, select").val("").end().find(":checked").prop("checked", false);;
                    timetable.event();
                }).fail(function(response) {
                    console.log('fail');
                    jQuery('div.addColumn').dialog('close');
                    alert('Failed to add the column.');
                });
            });
        },
        sortColumn: function(event) {
            return this.each(function() {
                console.log('sortColumn');
                console.log(jQuery(this).sortable("toArray"));
            });
        },
        checkConflict:function(resized, sibling){
            var resizedTime = topHeightToTime(resized.position().top,resized.height());
            var siblingTime = topHeightToTime(sibling.position().top,sibling.height());
            switch(true) {
                case (siblingTime.start <= resizedTime.start && siblingTime.end >  resizedTime.start):
                case (siblingTime.start <  resizedTime.end   && siblingTime.end >= resizedTime.end):
                case (siblingTime.start >= resizedTime.start && siblingTime.end <= resizedTime.end):
                    console.log("isConflict");
                    return true;
                    break;
                default:
                    return false;
            }
        },

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
        var start = ((top / (settings.timetable.cellHeight) * settings.timetable.timeInterval) + strToTime(settings.timetable.startTime));
        var end   = ((height) / (settings.timetable.cellHeight)) * settings.timetable.timeInterval + start;
        return {
            "start": start,
            "end": end
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
                var html  =  '<div class="timeField" style="width:'+this.settings.timetable.cellWidth+'px;border-bottom:1px solid #ddd;">';
                html  += '<div class="originCell">+</div>';
                var i = start;
                var isView = true;
                while(i<end) {
                    if(isView) {
                        html += '<div class="timeCell">'+timeToStr(i)+'</div>';
                    } else {
                        html += '<div class="timeCell" style="border-top:1px solid #fff;"></div>';
                    }
                    //next
                    i+=600;
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
                html += '<div class="column column'+columnId+'" id="item'+columnId+'" data-column-id="'+data.id+'" style="width:'+this.settings.timetable.cellWidth+'px;float:left">';
                html += '<div class="headCell">'+data.title+'</div>';
                html += '<div class="scheduleZoon">';
                while(i<end) {
                    html += '<div class="cell time'+i+'" data-date="'+i+'"></div>'; 
                    i+=600;
                }
                html += '</div>';
                html += '</div>';
                html += '</div>';
                this.$el.append(html);
            },
            addSchedule: function(id,data) {
                var start  = strToTime(this.settings.timetable.startTime);
                var top    = ((strToTime(data.start) - start) / this.settings.timetable.timeInterval) * (this.settings.timetable.cellHeight + this.settings.timetable.borderWidth);
                var height = ((strToTime(data.end) - strToTime(data.start)) / this.settings.timetable.timeInterval) * (this.settings.timetable.cellHeight + this.settings.timetable.borderWidth);
                var style = 'top:'+top+'px;height:'+height+'px;width:'+(this.settings.timetable.cellWidth-1)+'px;left:0px;';
                jQuery('<div id="schedule'+data.id+'" class="schedule" style="'+style+'"><div class="content">'+data.text+'</div></div>').data({"id":id}).appendTo(this.$el.children('div.column'+id).children("div.scheduleZoon"));
            },
            book: function() {
                console.log("The Book");
            },
            event: function() {
                //Range selection 
                var isDown = false;
                var selectedColumnId = '';
                var clickedCellDate  = '';
                var scUnit  = this.settings.timetable.cellHeight + this.settings.timetable.borderWidth;
                jQuery("div.cell").on({
                    'mousedown': function(ev){ 
                        isDown   = true;
                        jQuery(this).addClass('selectedCell');
                        selectedColumnId = jQuery(this).parent("div.column").data('columnId');
                        clickedCellDate  = jQuery(this).data("date");
                        return false;
                    },
                    'mouseup': function(ev){ 
                        if(isDown) {
                            jQuery("div.addSchedule").dialog();
                            jQuery("div.cell").removeClass("selectedCell");
                        }
                        isDown = false;
                    },
                    'mouseover':function() {
                        if(isDown == true) {
                            //範囲選択の色   
                            jQuery('div.column'+selectedColumnId+' > div.time'+jQuery(this).data("date")).addClass('selectedCell');
                            switch(true) {
                                case clickedCellDate == jQuery(this).data('date'):
                                    jQuery('div.column'+selectedColumnId+' > div.time'+jQuery(this).data("date")).prevAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div.time'+jQuery(this).data("date")).nextAll().removeClass('selectedCell');
                                    break;
                                case clickedCellDate < jQuery(this).data('date'):
                                    jQuery('div.column'+selectedColumnId+' > div.time'+jQuery(this).data("date")).nextAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div.time'+clickedCellDate).prevAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div.time'+jQuery(this).data("date")).prevUntil('div.time'+clickedCellDate).addClass('selectedCell');
                                    break;
                                case clickedCellDate > jQuery(this).data('date'):
                                    jQuery('div.column'+selectedColumnId+' > div.time'+jQuery(this).data("date")).prevAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div.time'+clickedCellDate).nextAll().removeClass('selectedCell');
                                    jQuery('div.column'+selectedColumnId+' > div.time'+jQuery(this).data("date")).nextUntil('div.time'+clickedCellDate).addClass('selectedCell');
                                    break;
                            }
                        }
                    }
                });
                //add column dialog open
                jQuery("div.originCell").on('click',function(){
                    jQuery("div.addColumn").dialog();
                });
                if(this.settings.timetable.sortableColumn) {
                    this.$el.sortable({
                        axis: "x",
                        handle: "div.headCell",
                        items: "div.column",
                        update: function(ev, ui) {
                            var timetable = jQuery(this).data('plugin_timetable');
                            if(timetable.settings.event){
                                timetable.settings.event.test();
                            }
                            console.log(jQuery(this).sortable("toArray"));
                        }
                    });
                }
                //resizable

                this.$el.find("div.schedule").resizable({
                    handles: "n,s",
                    grid: [this.settings.timetable.cellWidth-1,scUnit],
                    containment: "parent",
                    start: function(e, ui) {
                    },
                    stop: function(e, ui) {
                        //var timetable = jQuery(this).parent("div.scheduleZoon").parent("div.column").parent().data('plugin_timetable');
                        var node      = jQuery(this);
                        var time      = topHeightToTime(node.position().top, node.height());
                        //conflict check
                        if(!settings.timetable.scheduleConflictAllow) {
                            jQuery(this).siblings('div.schedule').each(function(key,val) {
                                //if(timetable.checkConflict(node,jQuery(val))) {
                                if(jQuery.fn.timetable('checkConflict',node,jQuery(val))) {
                                    //resize cancel
                                    node.css('height',node.data('ui-resizable').originalSize.height).css("top",node.data('ui-resizable').originalPosition.top)
                                }
                            });
                        }
                        console.log(time);
                        settings.event.resize(e, ui);
                    }
                });
                //draggable
                this.$el.find("div.schedule").draggable({
                    axis: "y",
                    grid: [this.settings.timetable.cellWidth-1,scUnit],
                    containment: "parent",
                    stop: function(e,ui) {
                        var node      = jQuery(this);
                        var time      = topHeightToTime(node.position().top, node.height());
                        console.log(time);
                        settings.event.drag(e, ui);
                    }
                });
                //
                jQuery('div.schedule').on('click',function() {
                    console.log('schedule edit');
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