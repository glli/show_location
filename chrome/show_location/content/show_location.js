window.addEventListener("load", function() { sl_status_obj.onInit(); }, false);
window.addEventListener("unload", function() { sl_status_obj.onDestroy(); }, false);

var sl_status_obj = {
	onInit: function() {
		//this part is for localizations
	  	var stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
	   			.getService(Components.interfaces.nsIStringBundleService);
	  	this.bundle = stringBundleService.createBundle("chrome://show_location/locale/show_location.properties");

	  	this.prefService = Components.classes["@mozilla.org/preferences-service;1"]
	  		.getService(Components.interfaces.nsIPrefService).getBranch("show_location.");

	  	this.statusbar = document.getElementById("show_location_statusbar");
	  	this.toolbar = document.getElementById("show_location_toolbar");
	  	this.statusbox = document.getElementById("show_location_statusbox");
	  	this.status = document.getElementById("show_location_status");
	  	this.status_text = document.getElementById("show_location_text");
	  	this.status_icon = document.getElementById("show_location_icon");
	  	this.tooltip = document.getElementById("show_location_tooltip");
	  	this.tooltip_text = document.getElementById("show_location_tooltip_text");
	  	this.tooltip_icon = document.getElementById("show_location_tooltip_icon");
	  	this.popup = document.getElementById("show_location_popup");
	  	this.popup_ip = document.getElementById("show_location_popup_ip");

		this.addr_flag_box=document.getElementById("addr_flag_box");
		this.addr_flag=document.getElementById("addr_flag");
		this.drag_icon = document.getElementById("show_location_drag_icon");

		this.dns = Components.classes["@mozilla.org/network/dns-service;1"]
			.getService(Components.interfaces.nsIDNSService);
		this.eventqueue = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;

		this.prefchange=1;
		this.localip = "0";
		this.dnscache = new Array();
		this.slocalcache_CZ = new Array(); //server locations cache, i.e. known ip, get server location
		this.slocalcache_GEO = new Array();
		this.server_types = new Array();
		this.timezones = new Array();

		if (this.prefService.getBoolPref("hide_toolmenu_iptool")) {
			document.getElementById('show_location_toolmenu_iptool').hidden=true;
			document.getElementById('show_location_iptool_key').setAttribute("disabled", true);
		}
		if (this.prefService.getBoolPref("hide_toolmenu_maptool")) {
			document.getElementById('show_location_toolmenu_maptool').hidden=true;
			document.getElementById('show_location_maptool_key').setAttribute("disabled", true);
		}
		if (this.prefService.getBoolPref("hide_rightclick_showiptool"))
			document.getElementById('show_location_rightclick_showiptool').hidden=true;
		if (this.prefService.getBoolPref("hide_rightclick_showmap"))
			document.getElementById('show_location_rightclick_showmap').hidden=true;

		var parent=this;
		var timedelay=this.prefService.getIntPref("onload_timedelay");
		this.Listener ={
			onLocationChange:function(aProgress,aRequest,aLocation){
				try { if (aLocation && aLocation.host && (aLocation.scheme != 'chrome') && (aLocation.scheme != 'file') )
						setTimeout( function(){ parent.status_local(aLocation.host); },timedelay);
					else parent.status_reset();
				} catch(e) { parent.status_reset(); }
			},
			onStateChange:function(a,b,c,d){},
			onProgressChange:function(a,b,c,d,e,f){},
			onStatusChange:function(a,b,c,d){},
			onSecurityChange:function(a,b,c){},
			onLinkIconAvailable:function(a){}
	  	};

		window.getBrowser().addProgressListener(this.Listener,
			Components.interfaces.nsIWebProgress.NOTIFY_LOCATION |
			Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);

		this.status_init();
		if (this.only_icon) {
			this.status_text.hidden=true;
			this.status_icon.setAttribute("src", "chrome://show_location/skin/show_location_16.png");
			this.status_icon.hidden=false;
		}
	},

	onDestroy: function() {
		window.getBrowser().removeProgressListener(this.Listener);
		if (this.http_observer) this.observerService.removeObserver(this.observer, "http-on-examine-response");
	},

	//saving prefs will perform this
	status_init: function() {
		var parent=this;
		//set width and position
		this.status.minWidth=this.prefService.getIntPref("status_minwidth");
		this.status.maxWidth=this.prefService.getIntPref("status_maxwidth");
		this.set_position();

		//set colors
		var color=this.prefService.getCharPref("status_color");
		this.status.style.color=color;

		//set tooltip
		if ( this.prefService.getBoolPref("enable_tooltip") ) {
			color=this.prefService.getCharPref("tooltip_color");
			this.tooltip.style.color=color;
			if (!this.enable_tooltip)	{
				for (var i=0; i < 6; ++i) this.tooltip.childNodes[i].hidden=true;
				this.tooltip_text.value=this.bundle.GetStringFromName("Show-Location-tooltip");
				this.tooltip_text.hidden=false;
			}
			this.status.tooltip="show_location_tooltip";
			this.addr_flag.tooltip="show_location_tooltip";
			this.enable_tooltip=1;
		}
		else {
			this.status.removeAttribute("tooltip");
			this.addr_flag.removeAttribute("tooltip");
			this.enable_tooltip=0;
		}

		var style_list=this.style_list_init("status");
		this.style_status_list=style_list;
		this.only_icon=(style_list=="" || style_list=="FLG" || style_list=="AFL" || style_list=="FLG, AFL");

		//if no AFL, hide address bar flag
		if (style_list.indexOf("AFL")==-1) this.addr_flag_box.hidden=true;
		else document.getElementById("urlbar-icons").insertBefore(this.addr_flag_box, document.getElementById("star-button"));

  		if (style_list.indexOf("ST0")+1 || (this.enable_tooltip && this.prefService.getCharPref("style_tooltip_list").indexOf("ST0")+1)) {
  			if (!this.observerService) {
				this.observerService=Components.classes["@mozilla.org/observer-service;1"]
					.getService(Components.interfaces.nsIObserverService);
				this.observer = {
					observe: function(subject,topic,data) {
						if (topic=="http-on-examine-response") {
							subject.QueryInterface(Components.interfaces.nsIHttpChannel);
							var host=subject.URI.asciiSpec.split("/")[2];
							if (!parent.server_types[host]) {
								try {
									var server_type=subject.getResponseHeader("Server").split(" ", 1)[0];
									parent.server_types[host]=server_type;
								} catch(err) {}
							}
						}
					}
				};
			}
			this.observerService.addObserver(this.observer, "http-on-examine-response", false);
			this.http_observer=1;
  		}
  		else if (this.http_observer) this.observerService.removeObserver(this.observer, "http-on-examine-response");

  		this.GEO_path=0; this.GEO_online=0;
	},

	//saving prefs will perform this
	style_list_init: function(item) { //remove useless items
		var style_list=this.prefService.getCharPref("style_"+item+"_list");
		//if CZ not selected, remove CZ0 from style_list
		if (!this.prefService.getBoolPref("db_checked_CZ"))
			style_list=style_list.replace(/CZ0, |, CZ0|CZ0/,"");
		//if GEO not selected, remove GEO, FLG, AFL and TM0
		if (!this.prefService.getBoolPref("db_checked_GEO")) {
			style_list=style_list.replace(/G\d\d, |, G\d\d|G\d\d/g,"");
			style_list=style_list.replace(/FLG, |, FLG|FLG/,"");
			if (item=="status") style_list=style_list.replace(/AFL |, AFL|AFL/,"");
			style_list=style_list.replace(/TM0, |, TM0|TM0/,"");
		}
		return style_list;
	},

	/////////////////////////////////////////////////////////////////////////////////

	//saving prefs will not perform this, but refreshing webpage will perform this
	//the item is "status" or "tooltip"
	status_style_init: function(item) {
		var i;
		var parent=this;
		var style_list=this["style_"+item+"_list"];

		var CZ_path=0;
		this.CZ_type=this.prefService.getIntPref("CZ_type");
		this.GEO_type=this.prefService.getIntPref("GEO_type");

		if ((style_list.indexOf("CZ0")+1) && (this.CZ_type==2 || this.CZ_type==3)) CZ_path=1;

		if (style_list.search(/G\d\d/)+1) {
			if (this.GEO_type) this.GEO_path=1; else this.GEO_online=1;
			this["GEO_"+item+"_list"]=new Array;
			style_list=style_list.replace(/\d\d/g,function(str)
				{parent["GEO_"+item+"_list"].push(parseInt(str,10)); return str;});
			style_list=style_list.replace(/\d\d, G/g,function(str) {return str.replace(", ",". ");});
		}
		//make this["style_"+item+"_list"] to an array
		this["style_"+item+"_list"]=style_list.split(", ");
		var len=this["style_"+item+"_list"].length;

		if (style_list.indexOf("FLG")+1) {
			if (this.GEO_type) this.GEO_path=1; else this.GEO_online=1;
			for (i=0; i < len; ++i) {
				if (this["style_"+item+"_list"][i]=="FLG") {
					this[item].appendChild(this[item+"_icon"]);
					this[item].insertBefore(this[item+"_icon"],this[item].childNodes[i]);
					break;
				}
			}
		}
		else this[item].appendChild(this[item+"_icon"]); //move to last

		if (style_list.indexOf("AFL")+1) {
			if (this.GEO_type) this.GEO_path=1; else this.GEO_online=1;
		}

		var TM0=style_list.indexOf("TM0")+1;
		if (TM0 && !this.timezones_xml) {
			if (this.GEO_type) this.GEO_path=1; else this.GEO_online=1;
			var xmlreq = new XMLHttpRequest();
			xmlreq.open("GET", "chrome://show_location/content/timezones.xml", false);
			xmlreq.send();
			this.timezones_xml=xmlreq.responseXML;
			this.servertime_interval=this.prefService.getIntPref("servertime_interval");
			if (this.servertime_interval<500) this.servertime_interval=500;
		}
		if (!TM0 && this.timezones_xml) clearInterval(this[item+"_timer"]);

		if ((CZ_path || this.GEO_path) && !this.localsearch_obj) {
			try {
				this.localsearch_obj = Components.classes["@show_location.org/localsearh;1"]
					.createInstance().QueryInterface(Components.interfaces.ILocalSearch);
	  		} catch (err) { this.xpcom_error=1; }
	  	}

	  	if (this.localsearch_obj) {
	  		if (CZ_path) this.localsearch_obj.dbPath_CZ=
	  	  			this.prefService.getComplexValue("db_path_CZ", Components.interfaces.nsISupportsString).data;
  			if (this.GEO_path) this.localsearch_obj.dbPath_GEO=
					this.prefService.getComplexValue("db_path_GEO", Components.interfaces.nsISupportsString).data;
  		}
	},

	status_local: function(host) {
		if (this.dnscache[host]) {
			this.get_local(this.dnscache[host], host);
			return;
		}
		var parent=this;
		var dns_listener = {
			onLookupComplete : function(request, nsrecord, status) {
				var s_ip; //server ip
				if (status != 0 || !nsrecord.hasMore()) s_ip="0";
				else s_ip = nsrecord.getNextAddrAsString();
				parent.dnscache[host] = s_ip;
				parent.get_local(s_ip, host);
			}
		};
		try { this.dns.asyncResolve(host, 0, dns_listener, this.eventqueue); }
		catch(e) { this.status_reset(); }
	},

	//refreshing webpage will perform this
	//main function to get web server location
	get_local: function(s_ip, host) {
		if (s_ip==this.localip && !this.prefchange) return;
		if (s_ip=="0") { this.status_reset(); return; }
		else this.popup_2done=false;

		this.localip=s_ip;
		var i;
		//if preference is changed, set the status style
		if (this.prefchange) {
			for (i=0; i < 6; ++i) this.status.childNodes[i].hidden=true;
			//if show icon only
			if (this.only_icon) {
				if (this.style_status_list=="") this.style_status_list=new Array; //set this.style_status_list to an array
				else this.status_style_init("status");
				this.status_icon.setAttribute("src", "chrome://show_location/skin/show_location_16.png");
				this.status_icon.hidden=false;
			}
			//style_list_init("status") has been done in status_init()
			else this.status_style_init("status");
			for (i=0; i < 6; ++i) this.status.childNodes[i].pos=i; //set position for each child

			if (this.enable_tooltip) {
				this.style_tooltip_list=this.style_list_init("tooltip");
				for (i=0; i < 6; ++i) this.tooltip.childNodes[i].hidden=true;
				//if nothing selected, show original tooltip only
				if (this.style_tooltip_list=="") {
					this.tooltip_text.value=this.bundle.GetStringFromName("Show-Location-tooltip");
					this.tooltip_text.hidden=false;
					this.tooltip_status_list=new Array;
				}
				else this.status_style_init("tooltip");
				for (i=0; i < 6; ++i) this.tooltip.childNodes[i].pos=i;
			}

			this.prefchange=0;
		}
		this.error_label=0; //this is used to show error only once
		if (this.GEO_path) this.set_GEO_pre(s_ip, "status");
		this.set_local_nGEO(s_ip, "status", host); //pass host to this function, because only set_ST needs it
		if (this.enable_tooltip)  {
			this.error_label=0;
			if (this.GEO_path) this.set_GEO_pre(s_ip, "tooltip");
			this.set_local_nGEO(s_ip, "tooltip", host);
		}

		if (this.GEO_online) this.set_GEO_online(s_ip);
	},

	set_GEO_pre:function(s_ip, item) {
		var keyword, len;
		len=this["style_"+item+"_list"].length;
		for (var i=0; i < len; ++i) {
			keyword=this["style_"+item+"_list"][i].substring(0,1);
			if (keyword=="G") this.set_GEO(s_ip, item, i, "GEO");
			else if (keyword=="F") this.set_GEO(s_ip, item, i, "FLG");
			else if (keyword=="T") {clearInterval(this[item+"_timer"]); this.set_GEO(s_ip, item, i, "TM0");}
			else if (keyword=="A") this.set_GEO(s_ip, item, i, "AFL");
		}
	},

	set_local_nGEO:function(s_ip, item, host) {
		var keyword, len;
		len=this["style_"+item+"_list"].length;
		for (var i=0; i < len; ++i) {
			keyword=this["style_"+item+"_list"][i].substring(0,1);
			if (keyword=="I") { this[item].childNodes[i].value=s_ip; this[item].childNodes[i].hidden=false;}
			else if (keyword=="C") this.set_CZ(s_ip, item, i);
			else if (keyword=="S") this.set_ST(host, item, i);
		}
	},

	set_GEO_online: function(s_ip) {
		if (this.slocalcache_GEO[s_ip]) {
			this.set_GEO_pre(s_ip, "status");
			if (this.enable_tooltip) this.set_GEO_pre(s_ip, "tooltip");
			return;
		}
		var xmlreq = new XMLHttpRequest();
		xmlreq.open("GET", 'http://phyxt8.bu.edu/iptool/geoip.php?ip=' + s_ip, true);
		xmlreq.send(null);
		var parent=this;
		xmlreq.onerror = function() {
			parent.access_GEO_error=1;
			parent.error_label2=0;
			parent.set_GEO_pre(s_ip, "status");
			if (parent.enable_tooltip) {
				parent.error_label2=0;
				parent.set_GEO_pre(s_ip, "tooltip");
			}
		}
		xmlreq.onload = function() {
			if (xmlreq.status=="200") {
				var s_local_GEO=xmlreq.responseText;
				parent.slocalcache_GEO[s_ip] = s_local_GEO;
				parent.set_GEO_pre(s_ip, "status");
				if (parent.enable_tooltip) parent.set_GEO_pre(s_ip, "tooltip");
			}
		}
	},


	set_CZ: function(s_ip, item, pos) {
		if (this.slocalcache_CZ[s_ip]) {
			if (this.slocalcache_CZ[s_ip]=="UNKNOWN")
				this[item].childNodes[pos].value=this.bundle.GetStringFromName("Unknown-ip");
			else this[item].childNodes[pos].value=this.slocalcache_CZ[s_ip];
			this[item].childNodes[pos].hidden=false;
			return;
		}

		if (this.CZ_type==2 || this.CZ_type==3) this.set_CZ_locally(s_ip, item, pos);
		else this.set_CZ_online(s_ip, item, pos, this.CZ_type);
	},

	//set server type
	set_ST: function(host, item, pos) {
		if (this.server_types[host]) this[item].childNodes[pos].value=this.server_types[host];
		else this[item].childNodes[pos].value=this.bundle.GetStringFromName("Unknown-type");
		this[item].childNodes[pos].hidden=false;
	},
	//item1 is "status" or "tooltip", item2 is "GEO" or "FLG"
	set_GEO: function(s_ip, item1, pos, item2) {
		if (this.slocalcache_GEO[s_ip]) {
			this.set_GEO_text(this.slocalcache_GEO[s_ip], item1, pos, item2);
			if (item2!="AFL") this[item1].childNodes[pos].hidden=false;
			return;
		}

		if (this.GEO_online) {
			if (this.access_GEO_error) {
				if (item2=="FLG") {
					this[item1].childNodes[pos].setAttribute("src", "chrome://show_location/content/flags/null.gif");
					this[item1].childNodes[pos].hidden=false;
				}
				else if (item2=="AFL") {
					this.addr_flag.setAttribute("src", "chrome://show_location/content/flags/null.gif");
					this.addr_flag_box.hidden=false;
				}
				else if (!this.error_label2) {
					this[item1].childNodes[pos].value=this.bundle.GetStringFromName("Access-GEO-error");
					this[item1].childNodes[pos].hidden=false;
					this.error_label2=1;
				}
				else this[item1].childNodes[pos].hidden=true;
			}
			return;
		}

		//if run to here, this.GEO_path==1
		if (this.xpcom_error) {
			if (item2=="FLG") {
				this[item1].childNodes[pos].setAttribute("src", "chrome://show_location/content/flags/null.gif");
				this[item1].childNodes[pos].hidden=false;
			}
			else if (item2=="AFL") {
				this.addr_flag.setAttribute("src", "chrome://show_location/content/flags/null.gif");
				this.addr_flag_box.hidden=false;
			}
			else if (!this.error_label) {
				this[item1].childNodes[pos].value=this.bundle.GetStringFromName("Xpcom-error");
				this[item1].childNodes[pos].hidden=false;
				this.error_label=1;
			}
			else this[item1].childNodes[pos].hidden=true;
			return;
		}

		var s_local_GEO=this.localsearch_obj.findLocal_GEO(s_ip);
		if (s_local_GEO=="NONE")  {
			if (item2=="FLG") {
				this[item1].childNodes[pos].setAttribute("src", "chrome://show_location/content/flags/null.gif");
				this[item1].childNodes[pos].hidden=false;
			}
			else if (item2=="AFL") {
				this.addr_flag.setAttribute("src", "chrome://show_location/content/flags/null.gif");
				this.addr_flag_box.hidden=false;
			}
			else if (!this.error_label) {
				this[item1].childNodes[pos].value=this.bundle.GetStringFromName("Cannot-find-GEO-db");
				this[item1].childNodes[pos].hidden=false;
				this.error_label=1;
			}
			else this[item1].childNodes[pos].hidden=true;
		}
		else if (s_local_GEO=="ERROR") {
			if (item2=="FLG") {
				this[item1].childNodes[pos].setAttribute("src", "chrome://show_location/content/flags/null.gif");
				this[item1].childNodes[pos].hidden=false;
			}
			else if (item2=="AFL") {
				this.addr_flag.setAttribute("src", "chrome://show_location/content/flags/null.gif");
				this.addr_flag_box.hidden=false;
			}
			else if (!this.error_label) {
				this[item1].childNodes[pos].value=this.bundle.GetStringFromName("GEO-db-wrong-format");
				this[item1].childNodes[pos].hidden=false;
				this.error_label=1;
			}
			else this[item1].childNodes[pos].hidden=true;
		}
		else {
			this.set_GEO_text(s_local_GEO, item1, pos, item2);
			if (item2!="AFL") this[item1].childNodes[pos].hidden=false;
			this.slocalcache_GEO[s_ip] = s_local_GEO;
		}
	},

	//set ChunZhen online with closure
	set_CZ_online: function(s_ip, item, pos, CZ_type) {
		if (this["style_"+item+"_list"].length>1) this[item].childNodes[pos].hidden=true;
		var xmlreq = new XMLHttpRequest();
		if (CZ_type) xmlreq.open("GET", 'http://phyxt8.bu.edu/iptool/qqwry.php?ip=' + s_ip, true);
		else xmlreq.open("GET", 'http://www.cz88.net/ip/index.aspx?ip=' + s_ip, true);
		xmlreq.send(null);
		var parent=this;
		xmlreq.onerror = function() {
			parent[item].childNodes[pos].value=parent.bundle.GetStringFromName("Access-CZ-error");
			parent[item].childNodes[pos].hidden=false;
		}
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
				if (s_local_CZ=="") {
					s_local=parent.bundle.GetStringFromName("Unknown-ip");
					s_local_CZ="UNKNOWN";
				}
				else s_local=s_local_CZ;
				parent[item].childNodes[pos].value=s_local;
				parent.slocalcache_CZ[s_ip]=s_local_CZ; //put to cache
			}
			else parent[item].childNodes[pos].value=parent.bundle.GetStringFromName("Access-CZ-error");
			parent[item].childNodes[pos].hidden=false;
			parent.popup_2done=false;
		}
	},
	//set ChunZhen locally
	set_CZ_locally: function(s_ip, item, pos) {
		if (this.xpcom_error) {
			if (!this.error_label) {
				this[item].childNodes[pos].value=this.bundle.GetStringFromName("Xpcom-error");
				this[item].childNodes[pos].hidden=false;
				this.error_label=1;
			}
			return;
		}
  		var s_local_CZ=this.localsearch_obj.findLocal_CZ(s_ip, this.CZ_type-2);
  		if (s_local_CZ=="NONE")  this[item].childNodes[pos].value=this.bundle.GetStringFromName("Cannot-find-CZ-db");
	  	else if (s_local_CZ=="ERROR") this[item].childNodes[pos].value=this.bundle.GetStringFromName("CZ-db-wrong-format");
	  	else {
	  		s_local_CZ=s_local_CZ.replace(/ +CZ88.NET ?/g, "");
	  		if (s_local_CZ=="") {
	  			this[item].childNodes[pos].value=this.bundle.GetStringFromName("Unknown-ip");
	  			s_local_CZ="UNKNOWN";
	  		}
	  		else this[item].childNodes[pos].value=s_local_CZ;
			this.slocalcache_CZ[s_ip] = s_local_CZ;
		}
		this[item].childNodes[pos].hidden=false;
	},

	//local is multiple locations
  	set_GEO_text: function(local, item1, pos, item2) {
		if (local=="UNKNOWN") {
			if (item2=="GEO") this[item1].childNodes[pos].value=this.bundle.GetStringFromName("Unknown-ip");
			else if (item2=="FLG") this[item1].childNodes[pos].setAttribute("src", "chrome://show_location/content/flags/null.gif");
			else if (item2=="AFL") {
				this.addr_flag.setAttribute("src", "chrome://show_location/content/flags/null.gif");
				this.addr_flag_box.hidden=false;
			}
			else this[item1].childNodes[pos].value=this.bundle.GetStringFromName("Unknow-time");
		}
		else {
			var GEO_locations_list=local.split("; ");
			if (item2=="GEO") {
				var GEO_item;
				var GEO_location=new Array;
				var len=this["GEO_"+item1+"_list"].length;
				for (var i=0; i<len ; ++i) {
					GEO_item=GEO_locations_list[this["GEO_"+item1+"_list"][i]];
					if (GEO_item!="NULL")	GEO_location.push(GEO_item);
				}
				if (GEO_location.length)
					this[item1].childNodes[pos].value=GEO_location.join(", ");
				else this[item1].childNodes[pos].value=this.bundle.GetStringFromName("No-data");
			}
			else if (item2=="FLG")
				this[item1].childNodes[pos].setAttribute("src",
					"chrome://show_location/content/flags/"+GEO_locations_list[2].toLowerCase()+".gif");
			else if (item2=="TM0") this.set_TIME(GEO_locations_list[1], item1, pos);
			else if (item2=="AFL") {
				this.addr_flag.setAttribute("src",
					"chrome://show_location/content/flags/"+GEO_locations_list[2].toLowerCase()+".gif");
				this.addr_flag_box.hidden=false;
			}
		}
  	},

	set_TIME: function(timezone, item, pos) {
		if (this.timezones[timezone]) {
			this.set_TIME_text(this.timezones[timezone], item, pos);
			return;
		}
		if (!this.timezones_xml) return;

		var zone = new Array();
		var zone_node=this.timezones_xml.getElementById(timezone);
		var st_offset=zone_node.childNodes[1].firstChild.nodeValue;
		var offset_min=parseInt(st_offset.substring(1,3),10)*60+parseInt(st_offset.substring(4,6),10);
		if (st_offset.substring(0,1)=="-") offset_min=-offset_min;
		//put standard time offset (minutes) to the cache
		zone.push(offset_min);
		var dst=zone_node.getElementsByTagName("dst_offset");
		if (dst.length) {
			var dst_offset=dst[0].firstChild.nodeValue;
			offset_min=parseInt(dst_offset.substring(1,3),10)*60+parseInt(dst_offset.substring(4,6),10);
			if (dst_offset.substring(0,1)=="-") offset_min=-offset_min;
			// put dst offset (minutes) to the cache
			zone.push(offset_min);
			var dst_start_str=zone_node.childNodes[5].firstChild.nodeValue;
			var dst_end_str=zone_node.childNodes[7].firstChild.nodeValue;
			var dst_start=this.date_UTC(dst_start_str, st_offset);
			var dst_end=this.date_UTC(dst_end_str, dst_offset);
			// put dst start time and end time to the cache
			zone.push(dst_start);
			zone.push(dst_end);
		}
		this.set_TIME_text(zone, item, pos);
		this.timezones[timezone]=zone;
	},

	set_TIME_text: function(zone, item, pos) {
		var date_str;
		var parent=this;
		if (zone.length>1) {
			var dst_start=zone[2];
			var dst_end=zone[3];
			var set_time = function() {
				var date = new Date();
				if (((dst_start<dst_end)&&(date>dst_start)&&(date<dst_end))||
					((dst_start>dst_end)&&((date>dst_start)||(date<dst_end))))
					//in dst
					date.setMinutes(date.getMinutes()+date.getTimezoneOffset()+zone[1]);
				else date.setMinutes(date.getMinutes()+date.getTimezoneOffset()+zone[0]); //standard time
				date_str=date.toString().split(" ");
				parent[item].childNodes[pos].value=date_str[0]+" "+date_str[4].substring(0,5);
			};
		}
		else {
			var set_time = function() {
				var date = new Date();
				date.setMinutes(date.getMinutes()+date.getTimezoneOffset()+zone[0]);
				date_str=date.toString().split(" ");
				parent[item].childNodes[pos].value=date_str[0]+" "+date_str[4].substring(0,5);
			};
		}
		set_time();
		this[item+"_timer"]=setInterval(set_time, this.servertime_interval);
	},

	show_myip: function() {
		if (!this.dnscache["myip"]) {
			var xmlreq = new XMLHttpRequest();
			xmlreq.open("GET", 'http://www.cz88.net/ip/viewip468_25.aspx', true);
			xmlreq.send(null);
			var parent=this;
			xmlreq.onerror = function() {
				parent.popup.childNodes[3].label=parent.bundle.GetStringFromName("Access-CZ-error");
			}
			xmlreq.onload = function() {
				if (xmlreq.status=="200") {
					var ip_pos = xmlreq.responseText.indexOf("IPMessage");
					var myip=xmlreq.responseText.substring(ip_pos+11,ip_pos+26).split("<");
					parent.popup.childNodes[3].label=parent.bundle.GetStringFromName("My-IP") + ": "+ myip[0];
					parent.dnscache["myip"] = myip[0];
				}
				else parent.popup.childNodes[3].label=parent.bundle.GetStringFromName("Access-CZ-error");
			}
		}
	},

	//saving prefs will perform this
	set_position: function() {
		var position=this.prefService.getIntPref("status_position");
		if (position==0) {
			if (this.position_set) {
				this.statusbox.hidden=false;
				this.statusbox.parentNode.hidden=false;
			} else {
				var statusbox_pos=this.prefService.getCharPref("statusbox_position").split(", ");
				var bar=document.getElementById(statusbox_pos[0]);
				if (statusbox_pos[0]=="status-bar" || !bar) {
					var statusbar = document.getElementById("status-bar");
					this.statusbar.appendChild(this.statusbox);
					statusbar.insertBefore( this.statusbar, statusbar.childNodes[statusbox_pos[1]]);
					this.statusbox.hidden=false;
					this.statusbar.hidden=false;
				} else {
					this.toolbar.appendChild(this.statusbox);
					bar.insertBefore(this.toolbar, bar.childNodes[statusbox_pos[1]]);
					this.statusbox.hidden=false;
				}
				this.position_set=1;
			}
		} else if (position==1) {
			this.statusbar.hidden=true;
			var urlbar_icons=document.getElementById("urlbar-icons");
			urlbar_icons.insertBefore(this.statusbox, urlbar_icons.childNodes[0]);
			this.statusbox.hidden=false;
			this.position_set=1;
		} else {
			this.statusbar.hidden=true;
			this.statusbox.hidden=true;
		}
		this.handle_urlbar_listener();
	},

	handle_urlbar_listener: function() {
		if (this.prefService.getBoolPref("urlbar_focus_hide")) {
			var urlbar=document.getElementById("urlbar");
			if (this.statusbox.parentNode.id=="urlbar-icons" && this.prefService.getIntPref("status_position")!=2) {
					urlbar.addEventListener("focus", this.hide_statusbox, false);
					urlbar.addEventListener("blur", this.unhide_statusbox, false);
			} else {
				urlbar.removeEventListener("focus", this.hide_statusbox, false);
				urlbar.removeEventListener("blur", this.unhide_statusbox, false);
			}
		}
	},

	hide_statusbox: function() {
		sl_status_obj.statusbox.hidden=true;
	},
	unhide_statusbox: function() {
		sl_status_obj.statusbox.hidden=false;
	},

	save_statusbox_position: function() {
		var statusbox_parent=this.statusbox.parentNode;
		var statusbox_pp=statusbox_parent.parentNode;
		var statusbox_pos=statusbox_pp.id;
		var len=statusbox_pp.childNodes.length;
		var pos;
		for (var i=0; i < len; ++i) {
			if (statusbox_pp.childNodes[i]==statusbox_parent) {
				if (i==len-1) pos=999;
				else pos=i;
				break;
			}
		}
		statusbox_pos+=", "+pos;
		this.prefService.setCharPref("statusbox_position", statusbox_pos);
		this.handle_urlbar_listener();
	},

	//set sl_status back to the initial state
	status_reset: function() {
		this.localip="0";

		if (this.timezones_xml) {
			clearInterval(this.status_timer);
			clearInterval(this.tooltip_timer);
		}

		var i;
		for (i=0; i < 6; ++i) this.status.childNodes[i].hidden=true;
		this.addr_flag_box.hidden=true;

		//if only show flag, set the status as a home icon
		if (this.only_icon) {
			this.status_icon.setAttribute("src", "chrome://show_location/skin/show_location_16.png");
			this.status_icon.hidden=false;
		}
		else {
			this.status_text.value=this.bundle.GetStringFromName("Show-Location-status");
			this.status_text.hidden=false;
		}

		if (this.enable_tooltip) {
			for (i=0; i < 6; ++i) this.tooltip.childNodes[i].hidden=true;
			this.tooltip_text.value=this.bundle.GetStringFromName("Show-Location-tooltip");
			this.tooltip_text.hidden=false;
		}

		//hide most of popup items
		for (i=4; i <10; ++i)
			this.popup.childNodes[i].hidden=true;
	},

	//pos can be 'icon'
	set_popup: function(pos) {
		var s_ip=this.localip;
		if (s_ip!="0" && pos!=null) {
			if (!this.popup_2done) {
				//show the hidden popup menu separator
				this.popup.childNodes[4].hidden=false;

				var showmap=false;
				if (this.slocalcache_CZ[s_ip]) {
					var char_CZ=this.slocalcache_CZ[s_ip].indexOf(unescape("%u5E02"));
					if (char_CZ+1) showmap=true;
					else if (this.CZ_type==3) {
						char_CZ=this.slocalcache_CZ[s_ip].indexOf(unescape("%u570B"));
						if (char_CZ+1) showmap=true;
					}
					else {
						char_CZ=this.slocalcache_CZ[s_ip].indexOf(unescape("%u56FD"));
						if (char_CZ+1) showmap=true;
					}
				}
				if (!showmap && this.slocalcache_GEO[s_ip] && this.slocalcache_GEO[s_ip]!="UNKNOWN")
					showmap=true;

				if (showmap) this.popup.childNodes[5].hidden=false;
				else this.popup.childNodes[5].hidden=true;

				this.popup_2done=true;
			}

			var keyword;

			if (pos=="icon") keyword="F";
			else if (this.style_status_list.length) //if not exist, set it to icon
				keyword=this.style_status_list[pos].substring(0,1);
			else keyword="F";
			//show popup of copy ip
			if (keyword=="I") {
				this.popup.childNodes[8].hidden=true;
				this.popup.childNodes[9].label=this.bundle.GetStringFromName("Copy-server-IP");
			}
			else {
				if (keyword=="F") this.popup.childNodes[8].hidden=true;
				else {
					if (keyword=="T") this.popup.childNodes[8].label=this.bundle.GetStringFromName("Copy-server-time");
					else if (keyword=="S") this.popup.childNodes[8].label=this.bundle.GetStringFromName("Copy-server-type");
					else this.popup.childNodes[8].label=this.bundle.GetStringFromName("Copy-location");
					this.popup.childNodes[8].hidden=false;
					this.status_text_string=this.status.childNodes[pos].value;
				}
				this.popup.childNodes[9].label=this.bundle.GetStringFromName("Copy-IP") + ": " + s_ip;
			}
			this.popup.childNodes[9].hidden=false;
			this.popup.childNodes[6].hidden=false;
			this.popup.childNodes[7].hidden=false;
		}
	},

	whois: function(item) {
		var str;
		if (item=="host") str=_content.document.URL.split("/")[2];
		else if (item=="ip") str=this.localip;
		var tab = getBrowser().addTab('http://whois.domaintools.com/' + str);
		getBrowser().selectedTab = tab;
	},

	//the function to copy strings to the clipboard
	copy2clip: function(item) {
		const ClipBoard = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
			.getService(Components.interfaces.nsIClipboardHelper);
		if (item=="ip")	ClipBoard.copyString(this.localip);
		else if (item=="local") ClipBoard.copyString(this.status_text_string);
		else if (item=="myip" && this.dnscache["myip"]) ClipBoard.copyString(this.dnscache["myip"]);
	},

	date_UTC: function(local_data_str, offset_str) {
		var date = new Date();
		var min = parseInt(local_data_str.substring(9,11),10)*60+parseInt(local_data_str.substring(12,14),10);
		var day = local_data_str.substring(7,8);
		var diff_day;
		var offset_min=parseInt(offset_str.substring(1,3),10)*60+parseInt(offset_str.substring(4,6),10);
		if (offset_str.substring(0,1)=="-") offset_min=-offset_min;

		if (local_data_str.substring(4,5)=="+") {
			//set date to the first day of the month
			date.setFullYear(date.getUTCFullYear(),local_data_str.substring(1,3)-1,1);
			diff_day=day-date.getDay();
			date.setDate((local_data_str.substring(5,6)-(diff_day>=0))*7+diff_day+1);
		}
		else {
			//set date to the last day of the month
			date.setFullYear(date.getUTCFullYear(),local_data_str.substring(1,3),0);
			diff_day=day-date.getDay();
			date.setDate(date.getDate()-(local_data_str.substring(5,6)-(diff_day<=0))*7+diff_day);
		}
		date.setUTCHours(0,min-offset_min,0,0);
		return date;
	},

	open_iptool: function(showip) {
		var selected_text;
		if (showip==2) {
			if (gContextMenu.onTextInput) {
				var input_text=gContextMenu.target;
				selected_text=input_text.value.substring(input_text.selectionStart, input_text.selectionEnd);
			}
			else selected_text=getBrowserSelection();

			if (selected_text) {
				//remove front or back spaces
				selected_text=selected_text.replace(/^\s+|\s+$/g,"");
				if (selected_text=="") selected_text=null;
				//remove duplicated spaces
				else selected_text=selected_text.replace(/\s+/g," ");
				//max 15 chars
				selected_text=selected_text.substr(0, 15);
			}
		}

		if (this.iptool && !this.iptool.closed) {
			var sl_iptool_obj=this.iptool.sl_iptool_obj;
			if (showip==2 && selected_text) {
				this.iptool_detail=2; //means searching selected text
				sl_iptool_obj.input_ip.value=selected_text;
				sl_iptool_obj.get_local();
				sl_iptool_obj.input_ip.select();
			}
			else if (showip && this.localip!="0") {
				this.iptool_detail=1;
				sl_iptool_obj.input_ip.value=this.localip;
				sl_iptool_obj.get_local();
				sl_iptool_obj.input_ip.select();
			}
			else {
				sl_iptool_obj.input_ip.value=null;
				sl_iptool_obj.output_local.value=null;
				sl_iptool_obj.show_map.disabled=true;
				sl_iptool_obj.input_ip.focus();
			}
			this.iptool.focus();
		}
		else {
			this.iptool=window.open("chrome://show_location/content/show_location_iptool.xul", "", "chrome,resizable,centerscreen");
			if (showip==2 && selected_text) {
				this.iptool_input_ip=selected_text;
				this.iptool_detail=2;
			}
			else if (showip && this.localip!="0") this.iptool_detail=1;
		}
	},

	open_maptool: function(showmap) {
		var selected_text;
		if (showmap==2) {
			if (gContextMenu.onTextInput) {
				var input_text=gContextMenu.target;
				selected_text=input_text.value.substring(input_text.selectionStart, input_text.selectionEnd);
			}
			else selected_text=getBrowserSelection();

			if (selected_text) {
				selected_text=selected_text.replace(/^\s+|\s+$/g,"");
				if (selected_text=="") selected_text=null;
				else selected_text=selected_text.replace(/\s+/g," ");
			}
		}

		if (this.maptool && !this.maptool.closed) {
			this.maptool.document.getElementById("search_result").hidePopup();
			var sl_maptool_obj=this.maptool.sl_maptool_obj;
			if (showmap==2 && selected_text) {
				this.maptool_detail=2; //means searching selected text
				this.maptool_address=selected_text;
				sl_maptool_obj.init_map(1);
			}
			else if (showmap && this.localip!="0") {
				this.maptool_detail=1;
				sl_maptool_obj.init_map(1);
			}
			else {
				sl_maptool_obj.input_address.value=null;
				sl_maptool_obj.input_address.focus();
			}
			this.maptool.focus();
		}
		else {
			this.maptool=window.open("chrome://show_location/content/show_location_maptool.xul", "", "chrome,resizable,centerscreen");
			if (showmap==2 && selected_text) {
				this.maptool_address=selected_text;
				this.maptool_detail=2;
			}
			else if (showmap && this.localip!="0") this.maptool_detail=1;
		}
	}
};
