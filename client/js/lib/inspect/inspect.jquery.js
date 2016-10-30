/**
 * @author Mark
 */

$.fn.inspect=function(obj,title){
	var insp=function(obj,elem,title){
		var self=this;
		function createElem(tag,attr,html){
			var elem=document.createElement(tag);
			$(elem).attr(attr).html(html);
			return elem;
		};
		
		this.id=function(elem){
			var id=elem.id;
			if(id)return id;
			for(var i=0; i<6; i++){
				id=id+'_'+Math.ceil(Math.random()*100000);
			}
			elem.id=id;
			return id;
		}
		
		this.root=createElem('div',{"class": 'inspector', "id": title.replace(" ", "_")});
		this.data={};
		
		this.attachTo=function(elem){
			$(elem).append(this.root);
		}
		
		this.createPanel=function(obj,container,title){
			var panel=createElem('ul',{'class':'panel','style':"display: none;"});
            if(typeof(title)!='undefined'){
                var _title=$(createElem('h1',{'class':'paneltitle'})).html(title);
                $(panel).append(_title);
            }
			$(container).append(panel);
			for(var idx in obj){
				this.createItem(idx,obj[idx],panel);
			}
			return $(panel).slideDown(500);
		};
		
		this.createItem=function(label,value,container){
			var isExpandable=self.isExpandable(value);
			var item=createElem('li',{'class':'item'});
			$(container).append(item);
			if(isExpandable){
				var id=self.id(item);
				var icon=createElem('span',{'class':'expandIcon'},'+');
				$(item).addClass('expandable').append(icon);
				this.data[id]=value;
			}
			var e_label=createElem('span',{'class':'obj_label'},label);
			var e_value=createElem('span',{'class':'obj_value'},this.valueSummary(value));
			$(item).append(e_label);
			$(item).append(e_value);
			if(isExpandable){
				$(e_label).
					add(icon).
					add('.summary',e_value).
					add('.type',e_value).
					click(function(e){self.expandToggle($(this).parents('.item')[0],e);}).css({cursor: 'pointer'});
			}
		};
		
		this.isExpandable=function(value){
			if(typeof(value)!='object')return false;
			return !$.isEmptyObject(value);
		};
		
		this.valueSummary=function(value){
			var name="";
			if(typeof(value)=='object'){
				var title='object';
				if($.isArray(value))title='array';
				if($.isFunction(value))title='function';
				if(title=='object')title=value+'';
				if(title==({}+''))title='object';
				var summary=this.objectSummary(value);
				name='<span class="type">['+title+']</span>';;
				if(summary) name+='<span class="summary">'+summary+'</span>';
			}else{
				name=value;
			}
			return name;
		};
		
		this.objectSummary=function(obj){
			var summary=[];
			for(var idx in obj){
				summary.push(idx+':<span class="strong">'+obj[idx]+'</span>');
			}
			return summary.join(' ');
		};
		
		this.expandToggle=function(elem,e){
			e.stopPropagation();
			var container=$(elem).find('.obj_value')[0];
			var icon=$(elem).find('.expandIcon')[0];
			var isExpanded=$(icon).hasClass('open');
			var id=self.id(elem);
			if(isExpanded){
				//Remove data structs
				$(elem).find('.item').each(function(){
					if(this.id){
						delete self.data[this.id];
					}
				});
				//Remove panel
				$(container).children('.panel').slideUp(100,'swing',function(){$(this).remove();});
				//Change the Icon
				$(icon).removeClass('open').html('+');
			}else{
				//Create Panel
				$(this.createPanel(self.data[id],container)).slideDown(300,'swing');
				//Change Icon
				$(icon).addClass('open').html('-');
			}
		}
		
		if(elem)this.attachTo(elem);
		this.createPanel(obj,$(this.root),title);
		
	};
    $(this).each(function(){
        new insp(obj,this,title);   
    });
	return this;
	
}
