var sl_prefs_obj = {
	load_prefs: function() {
		//this part is for localizations
	  	var stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
	   			.getService(Components.interfaces.nsIStringBundleService);
	  	this.bundle = stringBundleService.createBundle("chrome://show_location/locale/show_location.properties");
	  	
		this.prefService=Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch("show_location.");
		this.prefService_default=Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getDefaultBranch("show_location.");
		
		var mediator = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
		var main_window=mediator.getMostRecentWindow("navigator:browser");
		if (main_window) this.sl_status_obj=main_window.sl_status_obj;
		
	  	this.db_CZ=document.getElementById('db_CZ');
	  	this.db_GEO=document.getElementById('db_GEO');
	  	this.db_path_CZ=document.getElementById('db_path_CZ');
	  	this.db_path_GEO=document.getElementById('db_path_GEO');
	  	
	  	this.status_minwidth=document.getElementById('status_minwidth');
	  	this.status_maxwidth=document.getElementById('status_maxwidth');
	  	this.status_position=document.getElementById('status_position');
	  	this.status_color=document.getElementById('status_color');
	  	this.tooltip_color=document.getElementById('tooltip_color');
	  	
	  	this.enable_tooltip=document.getElementById('enable_tooltip');
	  	
		this.style_menu=document.getElementById("style_menu");
		this.style_menu_pop=document.getElementById("style_menu_pop");
		this.style_status_list=document.getElementById("style_status_list");
		this.style_tooltip_list=document.getElementById("style_tooltip_list");
		
		this.CZ_type=document.getElementById('CZ_type');
		this.GEO_type=document.getElementById('GEO_type');
		// prevent none integer keys in int text box
		window.addEventListener("keypress", this.keyPressInText, false);
		
		this.db_CZ.checked=this.prefService.getBoolPref("db_checked_CZ");
		this.CZ_type.selectedIndex=this.prefService.getIntPref("CZ_type");
		this.db_GEO.checked=this.prefService.getBoolPref("db_checked_GEO");
		this.GEO_type.selectedIndex=this.prefService.getIntPref("GEO_type");
		this.db_path_CZ.value=this.prefService.getComplexValue("db_path_CZ", Components.interfaces.nsISupportsString).data;
		this.db_path_GEO.value=this.prefService.getComplexValue("db_path_GEO", Components.interfaces.nsISupportsString).data;

		this.status_minwidth.value=this.prefService.getIntPref("status_minwidth");
		this.status_maxwidth.value=this.prefService.getIntPref("status_maxwidth");
		this.status_position.selectedIndex=this.prefService.getIntPref("status_position");
		this.status_color.color=this.prefService.getCharPref("status_color");
		this.tooltip_color.color=this.prefService.getCharPref("tooltip_color");
		
		this.load_style_list("style_status_list","user");
		this.load_style_list("style_tooltip_list","user");
		
		this.enable_tooltip.checked=this.prefService.getBoolPref("enable_tooltip");
		this.do_enabling();
		
		if (this.prefService.getIntPref("status_position")==0) this.sl_status_obj.drag_icon.hidden=false;
	},

	load_default: function() {
		this.db_CZ.checked=this.prefService_default.getBoolPref("db_checked_CZ");
		this.CZ_type.selectedIndex=this.prefService_default.getIntPref("CZ_type");
		this.db_GEO.checked=this.prefService_default.getBoolPref("db_checked_GEO");
		this.GEO_type.selectedIndex=this.prefService_default.getIntPref("GEO_type");

		this.status_minwidth.value=this.prefService_default.getIntPref("status_minwidth");
		this.status_maxwidth.value=this.prefService_default.getIntPref("status_maxwidth");
		this.status_position.selectedIndex=this.prefService_default.getIntPref("status_position");
		this.status_color.color=this.prefService_default.getCharPref("status_color");
		this.tooltip_color.color=this.prefService_default.getCharPref("tooltip_color");
		
		this.load_style_list("style_status_list","default");
		this.load_style_list("style_tooltip_list","default");
		
		this.statusbox_pos=this.prefService_default.getCharPref("statusbox_position");
		
		this.enable_tooltip.checked=this.prefService_default.getBoolPref("enable_tooltip");
		this.do_enabling();
	},
  	  
	load_style_list: function(item1,item2) {
  	  	var style_list_array;
  	  	if (item2 == "user")
  	  		style_list_array=this.prefService.getCharPref(item1).split(", ");
  	  	else style_list_array=this.prefService_default.getCharPref(item1).split(", ");
		var i, j;
		j=this[item1].childNodes.length;
		for ( i=0; i < j; ++i ) this[item1].removeItemAt(0); //remove all children
		
		var len=this.style_menu_pop.childNodes.length;
		if (style_list_array!="")
			for ( i=0; i < style_list_array.length; ++i) {
				for ( j=0; j < len; ++j) {
					if ( style_list_array[i] == this.style_menu_pop.childNodes[j].value) {
						this[item1].appendItem( this.style_menu_pop.childNodes[j].label, this.style_menu_pop.childNodes[j].value);
						break;
					}
				}
			}
	},

	save_prefs: function() {
		if ( (this.db_CZ.checked && (this.CZ_type.selectedIndex==2 ||  this.CZ_type.selectedIndex==3) && this.db_path_CZ.value.replace(/\s/g,"")=="") ||
			(this.db_GEO.checked && this.GEO_type.selectedIndex && this.db_path_GEO.value.replace(/\s/g,"")=="") ) {
			alert(this.bundle.GetStringFromName("Alert-set-db") );
			return false;
		}
		else {
			this.prefService.setBoolPref("db_checked_CZ", this.db_CZ.checked);
			this.prefService.setBoolPref("db_checked_GEO", this.db_GEO.checked);
			var db_path = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
			
			if (!this.db_CZ.checked) this.CZ_type.selectedIndex=this.prefService_default.getIntPref("CZ_type");
			if (this.db_CZ.checked && (this.CZ_type.selectedIndex==2 || this.CZ_type.selectedIndex==3)) db_path.data=this.db_path_CZ.value;
			else db_path.data=this.prefService_default.getComplexValue("db_path_CZ", Components.interfaces.nsISupportsString).data;
			this.prefService.setComplexValue("db_path_CZ", Components.interfaces.nsISupportsString, db_path);
			this.prefService.setIntPref("CZ_type", this.CZ_type.selectedIndex);
			
			if (!this.db_GEO.checked) this.GEO_type.selectedIndex=this.prefService_default.getIntPref("GEO_type");
			if (this.db_GEO.checked && this.GEO_type.selectedIndex) db_path.data=this.db_path_GEO.value;
			else db_path.data=this.prefService_default.getComplexValue("db_path_GEO", Components.interfaces.nsISupportsString).data;
			this.prefService.setComplexValue("db_path_GEO", Components.interfaces.nsISupportsString, db_path);
			this.prefService.setIntPref("GEO_type", this.GEO_type.selectedIndex);
		}
		
		var minwd=this.status_minwidth.value;
		var maxwd=this.status_maxwidth.value;
		if (maxwd<minwd) { maxwd=minwd; minwd=this.status_maxwidth.value; }
		
		this.prefService.setIntPref("status_minwidth", minwd);
		this.prefService.setIntPref("status_maxwidth", maxwd);
		this.prefService.setIntPref("status_position", this.status_position.selectedIndex);
		this.prefService.setCharPref("status_color", this.status_color.color);
		this.prefService.setBoolPref("enable_tooltip", this.enable_tooltip.checked);
		this.prefService.setCharPref("tooltip_color", this.tooltip_color.color);
		
		this.save_style_list("style_status_list");
		this.save_style_list("style_tooltip_list");
		
		if (this.statusbox_pos) this.prefService.setCharPref("statusbox_position", this.statusbox_pos);
		
		try {
			this.sl_status_obj.prefchange=1;
			this.sl_status_obj.status_init();
		} catch(err) {}
		
		return true;
	},
	
	save_style_list: function(item) {
		//move the other GEO items up to the first GEO item.
		var i;
		var len=this[item].childNodes.length;
		var idx_prv_GEO=-1;
		var style_list_array = new Array();
		for (i=0; i < len; ++i) style_list_array.push(this[item].getItemAtIndex(i).value);
		for (i=0; i < len; ++i) {
			if (style_list_array[i].substring(0,1)=="G") {
				if (idx_prv_GEO==-1) idx_prv_GEO=i;
				else {
					if (i-1!=idx_prv_GEO) {
						style_list_array.splice(idx_prv_GEO+1,0,style_list_array[i]);
						style_list_array.splice(i+1,1);
					}
					++idx_prv_GEO;
				}
			}
		}
		//move AFL to the last
		for (i=0; i < len; ++i) {
			if (style_list_array[i]=="AFL" && i!=len-1) {
				style_list_array.splice(i,1);
				style_list_array.push("AFL");
			}
		}
		//save the list to prefs
		this.prefService.setCharPref(item, style_list_array.join(", "));
	},
  
	selectDb: function(item) {
		var picker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
			
		if (item=="CZ") {
			picker.init(window, this.bundle.GetStringFromName("Select-CZ-db") , Components.interfaces.nsIFilePicker.modeOpen);
			if (picker.show()==Components.interfaces.nsIFilePicker.returnOK) {
				this.db_path_CZ.value = picker.file.QueryInterface(Components.interfaces.nsILocalFile).path;
			}
		}
		if (item=="GEO") {
			picker.init(window, this.bundle.GetStringFromName("Select-GEO-db") , Components.interfaces.nsIFilePicker.modeOpen);
			if (picker.show()==Components.interfaces.nsIFilePicker.returnOK) {
				this.db_path_GEO.value = picker.file.QueryInterface(Components.interfaces.nsILocalFile).path;
			}
		}
	},

	do_enabling: function() {
		
		this.CZ_type.disabled=!this.db_CZ.checked;
		document.getElementById('style_menu_CZ0').disabled=!this.db_CZ.checked;
		this.db_path_CZ.disabled=!this.db_CZ.checked || !this.CZ_type.selectedIndex || this.CZ_type.selectedIndex==1;
		document.getElementById('db_path_button_CZ').disabled=!this.db_CZ.checked || !this.CZ_type.selectedIndex || this.CZ_type.selectedIndex==1;
		
		this.GEO_type.disabled=!this.db_GEO.checked;
		this.db_path_GEO.disabled=!this.db_GEO.checked || !this.GEO_type.selectedIndex;
		document.getElementById('db_path_button_GEO').disabled=!this.db_GEO.checked || !this.GEO_type.selectedIndex;
		document.getElementById('style_menu_TM0').disabled=!this.db_GEO.checked;
		for (var i=4; i < 19; ++i) this.style_menu_pop.childNodes[i].disabled=!this.db_GEO.checked;
		this.do_enabling_style("status");
		
		this.style_tooltip_list.disabled=!this.enable_tooltip.checked;
		document.getElementById('style_tooltip_list_add').disabled=!this.enable_tooltip.checked;
		document.getElementById('style_tooltip_list_del').disabled=!this.enable_tooltip.checked;
		document.getElementById('style_tooltip_list_up').disabled=!this.enable_tooltip.checked;
		document.getElementById('style_tooltip_list_down').disabled=!this.enable_tooltip.checked;
		document.getElementById('tooltip_color_label').disabled=!this.enable_tooltip.checked;
		this.tooltip_color.disabled=!this.enable_tooltip.checked;
		if (this.enable_tooltip.checked) this.do_enabling_style("tooltip");
	},

	do_enabling_style: function(item) {
		var keyword, len;
		len=this["style_"+item+"_list"].childNodes.length;
		for (var i=0; i < len; ++i) {
			keyword=this["style_"+item+"_list"].childNodes[i].value.substring(0,1);
			if (keyword=="C") this["style_"+item+"_list"].childNodes[i].disabled=!this.db_CZ.checked;
			else if (keyword=="G" || keyword=="F" || keyword=="T" || keyword=="A") this["style_"+item+"_list"].childNodes[i].disabled=!this.db_GEO.checked;
		}
	},
		
	//copied from "tab mix plus" extension
	keyPressInText: function(event) {
	   	if (event.target.localName != "textbox")
	      	return;
	  	if( event.target.getAttribute("preftype") != "int")
	      	return;
	   	if (event.charCode) {
	    	 	var key = String.fromCharCode(event.charCode).match(/\d/g);
	     		if (!key) {
	         		event.preventDefault();
	         		event.stopPropagation();
	     		}
	   	}
	},
	
	style_ops: function(item,op) {
		var style_list;
		if (item=="status") style_list = this.style_status_list;
		else if (item=="tooltip") style_list = this.style_tooltip_list;
		else return;
		
		var i;
		var idx=style_list.selectedIndex;
		var len=style_list.childNodes.length;
		if (op=="add") {
			//first check whether the list contains this item
			for (i=0; i < len; ++i) {
				if (this.style_menu.selectedItem.value==style_list.getItemAtIndex(i).value) {
					i=-1;
					break;
				}
			}
			//ignore adding AFL to tooltip
			if (item=="tooltip" && this.style_menu.selectedItem.value=="AFL") i=-1;
			if (i!=-1)
				style_list.appendItem(this.style_menu.selectedItem.label, this.style_menu.selectedItem.value);
		}
		else if (op=="del") {
			style_list.removeItemAt(idx);
			if (idx==style_list.childNodes.length)
				style_list.selectedIndex=idx-1;
			else style_list.selectedIndex=idx;
		}
		else if (op=="up") {
			if (idx!=0 && idx!=-1) {
				style_list.insertItemAt(idx-1,style_list.selectedItem.label,style_list.selectedItem.value);
				style_list.removeItemAt(idx+1);
				style_list.selectedIndex=idx-1;
			}
		}
		else if (op=="down") {
			if (idx!=style_list.childNodes.length-1 && idx!=-1) {
				style_list.insertItemAt(idx,style_list.getItemAtIndex(idx+1).label,style_list.getItemAtIndex(idx+1).value);
				style_list.removeItemAt(idx+2);
				style_list.selectedIndex=idx+1;
			}
		}
		this.do_enabling_style(item);
	}
};