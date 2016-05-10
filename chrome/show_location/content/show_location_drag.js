//just copied from "forecastfox" extension: reposition.js, thanks to it!

var sl_drag_observer;

( function() {
var dropOn_element=null;
var drag_obs={
	onDragStart: function(event,transferData,action) {
		transferData.data=new TransferData();
		transferData.data.addDataForFlavour("id/show_location_statusbar","show_location_statusbar");
		handleListener(true);
	},
	
	onDragOver: function(event,flavour,session) {
		try { var t=event.target;
		var element=event.target;
		while(t&&!last_position(t)) {element=t; t=t.parentNode;}
		var u=dropOn_element;
		if(!last_position(t)) {
			if(dropOn_element) show_line(dropOn_element,false);
			dropOn_element=null;
			return;
		}
		if (last_position(element)) dropOn_element=element;
		else {
			if(!("boxObject" in element)) dropOn_element=null;
			else {
				dropOn_element=null;
				var midPointCoord =element.boxObject.x+(element.boxObject.width/2);
				if(event.clientX>midPointCoord) {
					dropOn_element=element.nextSibling;
					while( no_drop(dropOn_element) ) dropOn_element=dropOn_element.nextSibling;
					if(dropOn_element==null) dropOn_element=t;
				}
				else dropOn_element=element;
			}
		}
		if (u&&(dropOn_element!=u)) show_line(u,false);
		show_line(dropOn_element,true);
		session.canDrop=true;
		} catch(err) {}
	},
		
	onDragExit: function(event, session) {
		if(dropOn_element!=null) show_line(dropOn_element,false);
	},
		
	onDrop: function(event,dropdata,session) {
		handleListener(false);
		if(dropOn_element==null) return;
		show_line(dropOn_element, false);
		if(dropdata.data==dropOn_element.getAttribute("id")) return;
		var t=event.target;
		while(t&&!last_position(t)) t=t.parentNode;
		if (t.id=="status-bar") {
			sl_status_obj.statusbar.appendChild(sl_status_obj.statusbox);
			if (last_position(dropOn_element)) t.appendChild(sl_status_obj.statusbar);
			else t.insertBefore(sl_status_obj.statusbar, dropOn_element);
			sl_status_obj.statusbar.hidden=false;
		} else {
			sl_status_obj.statusbar.hidden=true;
			sl_status_obj.toolbar.appendChild(sl_status_obj.statusbox);
			if (last_position(dropOn_element)) t.appendChild(sl_status_obj.toolbar);
			else t.insertBefore(sl_status_obj.toolbar, dropOn_element);
		}
		sl_status_obj.save_statusbox_position();
		dropOn_element=null;
	},

	getSupportedFlavours: function() {
		var flavours=new FlavourSet();
		flavours.appendFlavour("id/show_location_statusbar");
		return flavours;
	}
};
///////////////////////////////////////////
/*
function drop_position(dropOn_elm) {
	if (last_position(dropOn_elm)) return 999;
	var sibling_nodes=dropOn_elm.parentNode.childNodes;
	var pos=-1, q=0;
	for(var i=0; i<sibling_nodes.length; ++i) {
		if(sibling_nodes[i].getAttribute("id")=="show_location_statusbar") q=-1;
		if(sibling_nodes[i]==dropOn_elm) { pos=i; break; }
	}
	return pos+q;
}
*/

function no_drop(element) {
	if (!element) return false;
	if (element.localName=="menupopup") return true;
	return element.hasAttribute("collapsed") || element.hasAttribute("hidden");
}

function last_position(element) {
	if (!element) return false;
	return (element.localName=="toolbar" || element.localName=="statusbar" || element.localName=="menubar" );
}

function handleListener(add) {
	var handleEventListener=add?window.addEventListener:window.removeEventListener;
	handleEventListener("dragover", dragover_func,false);
	handleEventListener("dragexit", dragexit_func,false);
	handleEventListener("dragdrop", drop_func,false);
	handleEventListener("drop", drop_func,false);
}

function show_line(dropOn_elm, show) {
	var pos="left";
	var element=dropOn_elm;
	if(last_position(element)) {
		element=dropOn_elm.lastChild;
		while(no_drop(element)) {
			element=element.previousSibling
		}
		pos="right";
	}
	if(!element) return;
	if(show) {
		if(!element.hasAttribute("show_location_drag")) element.setAttribute("show_location_drag",pos);
	} else element.removeAttribute("show_location_drag");
}

function dragover_func(event) { nsDragAndDrop.dragOver(event, drag_obs); }
function dragexit_func(event) { nsDragAndDrop.dragExit(event, drag_obs); }
function drop_func(event) { nsDragAndDrop.drop(event, drag_obs); }

sl_drag_observer=drag_obs; 

} ) ();
