var sl_maptool_obj = {
	onInit: function() {
		this.prefService=Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch("show_location.");
		
		this.map_toolbar=document.getElementById("map_toolbar");
		this.map_browser=document.getElementById("map_browser");
		this.map_language=document.getElementById("map_language");
		this.enable_googlebar=document.getElementById("enable_googlebar");
		this.input_address=document.getElementById("input_address");
		this.lang=this.prefService.getIntPref("maptool_lang");
		this.map_language.selectedIndex=this.lang;
		this.bar=this.prefService.getBoolPref("maptool_googlebar");
		this.enable_googlebar.checked=this.bar;
		
		var mediator = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
		var main_window=mediator.getMostRecentWindow("navigator:browser");
		this.sl_status_obj=main_window.sl_status_obj;
		
		var parent=this;
	//	window.addEventListener("keypress", this.keyPressInText, false);
		
		this.db_checked_CZ=this.prefService.getBoolPref("db_checked_CZ");
		if (this.db_checked_CZ) this.CZ_type=this.prefService.getIntPref("CZ_type");
		this.db_checked_GEO=this.prefService.getBoolPref("db_checked_GEO");
		if (this.db_checked_GEO) this.GEO_type=this.prefService.getIntPref("GEO_type");
		
		if ( (this.CZ_type==2 ||  this.CZ_type==3 || this.db_checked_GEO) && !this.localsearch_obj ) {
			try {
				this.localsearch_obj = Components.classes["@show_location.org/localsearh;1"]
					.createInstance().QueryInterface(Components.interfaces.ILocalSearch);
	  		} catch (err) { this.xpcom_error=1; }
	  	}
	  	if (this.localsearch_obj) {
	  		if (this.CZ_type==2 || this.CZ_type==3) this.localsearch_obj.dbPath_CZ=
	  	  			this.prefService.getComplexValue("db_path_CZ", Components.interfaces.nsISupportsString).data;
  			if (this.db_checked_GEO) this.localsearch_obj.dbPath_GEO=
					this.prefService.getComplexValue("db_path_GEO", Components.interfaces.nsISupportsString).data;
  		}
  		/*
		var id="{10228D1E-6D25-4ccc-903E-272D66EEC763}";
		var show_location_dir=Components.classes["@mozilla.org/extensions/manager;1"]
				.getService(Components.interfaces.nsIExtensionManager)
				.getInstallLocation(id).getItemLocation(id).path;
		this.map_url="file://"+show_location_dir+"/resources/google_maps.htm";
		*/
		this.map_url="chrome://show_location/content/google_maps.htm";
		window.content=this.map_browser.contentWindow;
		this.init_map(0);
	},
	
	onDestroy: function() {
		this.prefService.setIntPref("maptool_lang", this.lang);
		this.prefService.setBoolPref("maptool_googlebar", this.bar);
	},
	
	init_map: function(stat) {
		//stat==1 means map window is open
		var detail=this.sl_status_obj.maptool_detail;
		//detail==2 means searching selected text
		var lang=this.lang;
		var post_info="#lang="+lang;
		if (stat) { var map_obj=this.map_browser.contentWindow.wrappedJSObject.google_maps_obj; }
		
		if (detail) {
			this.get_local();
			this.sl_status_obj.maptool_detail=0;
			if (this.address_CZ!="") {
				this.input_address.value=this.address_CZ;
				var zoom=4;
				document.addEventListener("mapAddressNotFound", this.popup_address_not_found, false, true);
				if (this.char_city_CZ) zoom=6;
				if (stat) {
					map_obj.set_map_address(this.address_CZ, zoom, 1);
					this.input_address.select();
					return;
				}
				post_info+="&zoom=<"+zoom+">&address=["+escape(this.address_CZ)+"]";
			}
			else if (this.latlng_GEO!="") {
				this.input_address.value=this.address_GEO;
				var zoom=4;
				if (this.address_GEO.indexOf(", ")+1) zoom=6;
				if (stat) {
					map_obj.set_map_latlng(this.latlng_GEO, null, zoom, this.address_GEO);
					this.input_address.select();
					return;
				}
				post_info+="&zoom=<"+zoom+">&latlng=("+this.latlng_GEO+")&address=["+escape(this.address_GEO)+"]";
			}
		}
		
		this.input_address.select();
		if (this.bar) post_info+="&bar=1";
		this.map_browser.contentWindow.location=this.map_url+post_info;
		if (stat) this.map_browser.reload();
	},

	set_map_address: function() {
		document.getElementById("search_result").hidePopup();
		if (this.input_address.value.replace(/\s/g,"")=="")
			this.input_address.value=null;
		else {
			document.addEventListener("mapAddressNotFound", this.popup_address_not_found, false, true);
			this.map_browser.contentWindow.wrappedJSObject.google_maps_obj.set_map_address(this.input_address.value, null, 1);
		}
		this.input_address.focus();
	},
		
	popup_address_not_found: function() {
		document.getElementById("search_result").showPopup(document.getElementById("search_button"),-1,-1,"tooltip","bottomright","bottomleft");
	},
		
  	get_local: function() {
  		this.address_CZ="";
  		this.char_city_CZ=false;
  		this.address_GEO="";
		this.latlng_GEO="";
		
		if (this.sl_status_obj.maptool_detail==2) {
			this.address_CZ=this.sl_status_obj.maptool_address;
			return;
		}
		
		var s_ip;
		s_ip=this.sl_status_obj.iptool_ip;
		if (!s_ip) s_ip=this.sl_status_obj.localip;
		else this.sl_status_obj.iptool_ip=null;
		
		if (s_ip=="0") return;
		if (this.db_checked_CZ) this.set_CZ(s_ip);
		if (this.db_checked_GEO) this.set_GEO(s_ip);
  	},
	
	set_CZ: function(s_ip) {
		var slocalcache_CZ=this.sl_status_obj.slocalcache_CZ[s_ip];
		if (slocalcache_CZ) {
			this.set_CZ_address(slocalcache_CZ);
			return;
		}
		if (this.CZ_type==2 || this.CZ_type==3) this.set_CZ_locally(s_ip);
		else this.set_CZ_online(s_ip, this.CZ_type);
	},

	set_GEO: function(s_ip) {
		var slocalcache_GEO=this.sl_status_obj.slocalcache_GEO[s_ip];
		if (slocalcache_GEO) {
			this.set_GEO_text(slocalcache_GEO);
			return;
		}
		if (this.xpcom_error) return;
		var s_local_GEO;
		if (this.GEO_type) {
			s_local_GEO=this.localsearch_obj.findLocal_GEO(s_ip);
			if (s_local_GEO=="NONE" || s_local_GEO=="ERROR") return;

			this.set_GEO_text(s_local_GEO);
			this.sl_status_obj.slocalcache_GEO[s_ip]=s_local_GEO;
		}
		else this.set_GEO_online(s_ip);
	},
		
  	set_GEO_online: function(s_ip) {
  		var xmlreq = new XMLHttpRequest();
  		xmlreq.open("GET", 'http://phyxt8.bu.edu/iptool/geoip.php?ip=' + s_ip, true);
		xmlreq.send(null);
		var parent=this;
		xmlreq.onerror = function() {
			return;
		}
		xmlreq.onload = function() {
			if (xmlreq.status=="200") {
				var s_local_GEO=xmlreq.responseText;
				parent.set_GEO_text(s_local_GEO);
				parent.sl_status_obj.slocalcache_GEO[s_ip]=s_local_GEO;
			}
		}
  	},
  		
	//set ChunZhen online with closure
	set_CZ_online: function(s_ip, CZ_type) {
		var xmlreq = new XMLHttpRequest();
		if (CZ_type) xmlreq.open("GET", 'http://phyxt8.bu.edu/iptool/qqwry.php?ip=' + s_ip, true);
		else xmlreq.open("GET", 'http://www.cz88.net/ip/index.aspx?ip=' + s_ip, true);
		xmlreq.send(null);
		var parent=this;
		xmlreq.onload = function() {
			if (xmlreq.status=="200") {
				var s_local;
				if (CZ_type) s_local=xmlreq.responseText;
				else {
					var addr_pos=xmlreq.responseText.indexOf("AddrMessage");
					s_local=xmlreq.responseText.substring(addr_pos+13);
					s_local=s_local.substring(0, s_local.indexOf("<"));
				}
				var s_local_CZ=s_local.replace(/ +CZ88.NET ?/g, "");
				if (s_local_CZ=="") s_local_CZ="UNKNOWN";
				parent.set_CZ_address(s_local_CZ);
				parent.sl_status_obj.slocalcache_CZ[s_ip]=s_local_CZ;
			}
		}
	},
		
	//set ChunZhen locally
	set_CZ_locally: function(s_ip) {
		if (this.xpcom_error) return;
		
  		var s_local_CZ=this.localsearch_obj.findLocal_CZ(s_ip, this.CZ_type-2);
  		if (s_local_CZ=="NONE"|| s_local_CZ=="ERROR") return;
  		
	  	s_local_CZ=s_local_CZ.replace(/ +CZ88.NET ?/g, "");
	  	if (s_local_CZ=="") s_local_CZ="UNKNOWN";
		this.set_CZ_address(s_local_CZ);
	  	this.sl_status_obj.slocalcache_CZ[s_ip]=s_local_CZ;
	},
	
	set_CZ_address: function(address) {
		var char_CZ=address.indexOf(unescape("%u5E02"));
		if (char_CZ+1) {
			this.address_CZ=address.substring(0,char_CZ+1);
			this.char_city_CZ=true;
		}
		else if (this.CZ_type==3) {
			char_CZ=address.indexOf(unescape("%u570B"));
			if (char_CZ+1) this.address_CZ=address.substring(0,char_CZ+1);
		}
		else {
			char_CZ=address.indexOf(unescape("%u56FD"));
			if (char_CZ+1) this.address_CZ=address.substring(0,char_CZ+1);
		}
	},
		
	//local is multiple locations
  	set_GEO_text: function(local) {
		if (local=="UNKNOWN") return;
		var GEO_location=new Array;
		var GEO_locations_list=local.split("; ");
		if (this.char_city_CZ && GEO_locations_list[2]=="CN") return;
		var GEO_list=[7,9,4];
		var GEO_item;
		var len=GEO_list.length;
		for (var i=0; i<len; ++i) {
			GEO_item=GEO_locations_list[GEO_list[i]];
			if (GEO_item!="NULL")	GEO_location.push(GEO_item);
		}
		GEO_location=GEO_location.join(", ");
		//at least country code is not "NULL"
		this.address_GEO=GEO_location;
		this.latlng_GEO=GEO_locations_list[5]+","+GEO_locations_list[6];
		this.address_CZ=""; //this makes map show GEO location
  	},
  		
	change_lang: function() {
		var lang=this.map_language.selectedIndex;
		if (lang!=this.lang) {
			this.lang=lang;
			var map_obj=this.map_browser.contentWindow.wrappedJSObject.google_maps_obj;
			var post_info="#lang="+lang;
			
			if (this.bar) post_info+="&bar=1";
			
			post_info+="&zoom=<"+map_obj.map.getZoom()+">";
			post_info+="&latlng=("+map_obj.map.getCenter().toUrlValue()+")";
			
			var marker_address=map_obj.marker_address;
			var marker_point=map_obj.marker_point;
			if (marker_address) post_info+="&address=["+escape(marker_address)+"]";
			if (marker_point) post_info+="&marker={"+marker_point.toUrlValue()+"}";
			
			this.map_browser.contentWindow.location=this.map_url+post_info;
			this.map_browser.reload();
		}
	},
	
	show_googlebar: function() {
		var map_obj=this.map_browser.contentWindow.wrappedJSObject.google_maps_obj;
		if (this.enable_googlebar.checked) {
			map_obj.show_googlebar(1);
			this.bar=true;
		}
		else {
			map_obj.show_googlebar(0);
			this.input_address.focus();
			this.bar=false;
		}
	},
	
	/*
	keyPressInText: function(event) {
		if (event.keyCode==27) window.close();
		if (event.keyCode==13 && event.target.getAttribute("id") == "input_address") sl_maptool_obj.set_map_address();
		if (event.ctrlKey && event.charCode==112) PrintUtils.print();
	},
	*/
		
	print_preview: function() {
		if (!this.firefox_version) {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
			var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"].getService(Components.interfaces.nsIVersionComparator);
			if (versionChecker.compare(appInfo.version, "3.99") > 0) this.firefox_version="4";
			else this.firefox_version="3";
		}
		
		if (this.firefox_version=="4") PrintUtils.printPreview(printPreview_listener); //for ff4
		else PrintUtils.printPreview(this.onEnterPrintPreview, this.onExitPrintPreview); //for ff3.x
	},
		
	onEnterPrintPreview: function() {
		sl_maptool_obj.map_toolbar.hidden=true;
//		window.removeEventListener("keypress", sl_maptool_obj.keyPressInText, false);
	},
		
	onExitPrintPreview: function() {
		sl_maptool_obj.map_toolbar.hidden=false;
//		setTimeout(function() { window.addEventListener("keypress", sl_maptool_obj.keyPressInText, false); }, 1000);
	}
};