var sl_iptool_obj = {
	onInit: function() {
		//this part is for localizations
	  	var stringBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
	   			.getService(Components.interfaces.nsIStringBundleService);
	  	this.bundle = stringBundleService.createBundle("chrome://show_location/locale/show_location.properties");

		this.prefService = Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService).getBranch("show_location.");

		this.input_ip=document.getElementById('input_ip');
		this.output_local=document.getElementById('output_local');
		this.show_map=document.getElementById('show_map');
		this.local = "";
		this.localip="0";
		var mediator = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
		var main_window=mediator.getMostRecentWindow("navigator:browser");
		this.sl_status_obj=main_window.sl_status_obj;
		var parent=this;
//		window.addEventListener("keypress", function(event){parent.keyPressInText(event);}, false);
		this.style_geo = new Array();
		var i;
		for(i=0; i < 10; ++i) this.style_geo[i]="Iptool-G0"+i.toString(10);
		for(i=10; i < 13; ++i) this.style_geo[i]="Iptool-G"+i.toString(10);

		this.db_checked_CZ=this.prefService.getBoolPref("db_checked_CZ");
		if (this.db_checked_CZ) this.CZ_type=this.prefService.getIntPref("CZ_type");
		this.db_checked_GEO=this.prefService.getBoolPref("db_checked_GEO");
		if (this.db_checked_GEO) this.GEO_type=this.prefService.getIntPref("GEO_type");

		if ( (this.CZ_type==2 ||  this.CZ_type==3 || this.GEO_type) && !this.localsearch_obj ) {
			try {
				this.localsearch_obj = Components.classes["@show_location.org/localsearh;1"]
					.createInstance().QueryInterface(Components.interfaces.ILocalSearch);
	  		} catch (err) { this.xpcom_error=1; }
	  	}
	  	if (this.localsearch_obj) {
	  		if (this.CZ_type==2 || this.CZ_type==3) this.localsearch_obj.dbPath_CZ=
	  	  			this.prefService.getComplexValue("db_path_CZ", Components.interfaces.nsISupportsString).data;
  			if (this.GEO_type) this.localsearch_obj.dbPath_GEO=
					this.prefService.getComplexValue("db_path_GEO", Components.interfaces.nsISupportsString).data;
  		}
  		if (this.sl_status_obj.iptool_detail==1) {
  			this.input_ip.value=this.sl_status_obj.localip;
  			this.get_local();
  		}
  		else if (this.sl_status_obj.iptool_detail==2) {
  			this.input_ip.value=this.sl_status_obj.iptool_input_ip;
  			this.get_local();
  		}
  		this.input_ip.select();
	},

	//convert ip to the standard ip format
	ip2std_ip: function(ip) {
		var ips=ip.split(".");
		var ip0;
		var std_ip="";
		for (var i=0; i < 4; i++) {
			if (std_ip!="") std_ip += ".";
			if (ips[i]) {
				ip0=parseInt(ips[i],10);
				if (!ip0 || ip0 < 0) ip0=0;
				else if (ip0 > 255) ip0=255;
			}
			else ip0=0;
			std_ip += ip0.toString(10);
		}
		return std_ip;
	},

  	get_local: function() {
  		if (this.input_ip.value.replace(/\s/g,"")=="")
  			this.input_ip.value=null;
		else {
	  		this.slocalcache_CZ="";
	  		this.slocalcache_GEO="";
			var s_ip=this.ip2std_ip(this.input_ip.value);
			this.localip=s_ip;
			this.output_local.value=this.bundle.GetStringFromName("Iptool-IP0")+": "+s_ip;
			if (this.db_checked_CZ) this.set_CZ(s_ip);
			if (this.db_checked_GEO) this.set_GEO(s_ip);

			if (this.sl_status_obj.iptool_detail) {
				if (this.slocalcache_CZ!="") this.sl_status_obj.slocalcache_CZ[s_ip]=this.slocalcache_CZ;
				if (this.slocalcache_GEO!="") this.sl_status_obj.slocalcache_GEO[s_ip]=this.slocalcache_GEO;
				this.sl_status_obj.iptool_detail=false;
			}

			var showmap=false;

			if (this.db_checked_CZ) {
				var slocalcache_CZ=null;
				if (this.slocalcache_CZ!="") slocalcache_CZ=this.slocalcache_CZ;
				else slocalcache_CZ=this.sl_status_obj.slocalcache_CZ[s_ip];
				if (slocalcache_CZ) {
					var char_CZ=slocalcache_CZ.indexOf(unescape("%u5E02"));
					if (char_CZ+1) showmap=true;
					else if (this.CZ_type==3) {
						char_CZ=slocalcache_CZ.indexOf(unescape("%u570B"));
						if (char_CZ+1) showmap=true;
					}
					else {
						char_CZ=slocalcache_CZ.indexOf(unescape("%u56FD"));
						if (char_CZ+1) showmap=true;
					}
				}
			}

			if (this.db_checked_GEO && !showmap) {
				var slocalcache_GEO=null;
				if (this.slocalcache_GEO!="") slocalcache_GEO=this.slocalcache_GEO;
				else slocalcache_GEO=this.sl_status_obj.slocalcache_GEO[s_ip];
				if (slocalcache_GEO && slocalcache_GEO!="UNKNOWN")
					showmap=true;
			}

			if (showmap) this.show_map.disabled=false;
			else this.show_map.disabled=true;
		}
		this.input_ip.focus();
  	},

	set_CZ: function(s_ip) {
		this.output_local.value+="\n"+this.bundle.GetStringFromName("Iptool-CZ0")+": ";
		if (this.sl_status_obj.slocalcache_CZ[s_ip]) {
			if (this.sl_status_obj.slocalcache_CZ[s_ip]=="UNKNOWN")
				this.output_local.value+=this.bundle.GetStringFromName("Unknown-ip");
			else this.output_local.value+=this.sl_status_obj.slocalcache_CZ[s_ip];
			return;
		}
		if (this.CZ_type==2 || this.CZ_type==3) this.set_CZ_locally(s_ip);
		else this.set_CZ_online(s_ip, this.CZ_type);
	},

	set_GEO: function(s_ip) {
		this.output_local.value+="\n"+this.bundle.GetStringFromName("Iptool-GEO")+": ";
		if (this.sl_status_obj.slocalcache_GEO[s_ip]) {
			this.set_GEO_text(this.sl_status_obj.slocalcache_GEO[s_ip]);
			return;
		}
		if (this.xpcom_error) {
			this.output_local.value+=this.bundle.GetStringFromName("Xpcom-error");
			return;
		}
		var s_local_GEO;
		if (this.GEO_type) {
			s_local_GEO=this.localsearch_obj.findLocal_GEO(s_ip);
			if (s_local_GEO=="NONE")
				this.output_local.value+=this.bundle.GetStringFromName("Cannot-find-GEO-db");
			else if (s_local_GEO=="ERROR")
				this.output_local.value+=this.bundle.GetStringFromName("GEO-db-wrong-format");
			else {
				this.set_GEO_text(s_local_GEO);
				this.slocalcache_GEO=s_local_GEO;
			}
		}
		else this.set_GEO_online(s_ip);
	},

  	set_GEO_online: function(s_ip) {
  		var xmlreq = new XMLHttpRequest();
  		xmlreq.open("GET", 'http://phyxt8.bu.edu/iptool/geoip.php?ip=' + s_ip, true);
		xmlreq.send(null);
		var parent=this;
		xmlreq.onerror = function() {
			parent.output_local.value+=parent.bundle.GetStringFromName("Access-GEO-error");
		}
		xmlreq.onload = function() {
			if (xmlreq.status=="200") {
				var s_local_GEO=xmlreq.responseText;
				parent.set_GEO_text(s_local_GEO);
				parent.slocalcache_GEO=s_local_GEO;
				if(s_local_GEO!="UNKNOWN") parent.show_map.disabled=false;
			}
		}
  	},

	//set ChunZhen online with closure
	set_CZ_online: function(s_ip, CZ_type) {
		var CZ_str=this.bundle.GetStringFromName("Iptool-CZ0")+": ";
		var xmlreq = new XMLHttpRequest();
		if (CZ_type) xmlreq.open("GET", 'http://phyxt8.bu.edu/iptool/qqwry.php?ip=' + s_ip, true);
		else xmlreq.open("GET", 'http://www.cz88.net/ip/index.aspx?ip=' + s_ip, true);
		xmlreq.send(null);
		var parent=this;
		xmlreq.onerror = function() {
			parent.output_local.value=parent.output_local.value.replace(CZ_str, function(str) {
				return str+parent.bundle.GetStringFromName("Access-CZ-error");});
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
				parent.output_local.value=parent.output_local.value.replace(CZ_str, function(str) {return str+s_local;});
				if (s_local_CZ.indexOf(unescape("%u5E02"))+1) parent.show_map.disabled=false;
				else if (parent.CZ_type==3 && s_local_CZ.indexOf(unescape("%u570B"))+1) parent.show_map.disabled=false;
				else if (s_local_CZ.indexOf(unescape("%u56FD"))+1) parent.show_map.disabled=false;
				parent.slocalcache_CZ=s_local_CZ;
			}
			else parent.output_local.value=parent.output_local.value.replace(CZ_str, function(str) {
				return str+parent.bundle.GetStringFromName("Access-CZ-error");});
		}
	},
	//set ChunZhen locally
	set_CZ_locally: function(s_ip) {
		if (this.xpcom_error) {
			this.output_local.value+=this.bundle.GetStringFromName("Xpcom-error");
			return;
		}

  		var s_local_CZ=this.localsearch_obj.findLocal_CZ(s_ip, this.CZ_type-2);
  		if (s_local_CZ=="NONE")  this.output_local.value+=this.bundle.GetStringFromName("Cannot-find-CZ-db");
	  	else if (s_local_CZ=="ERROR") this.output_local.value+=this.bundle.GetStringFromName("CZ-db-wrong-format");
	  	else {
	  		s_local_CZ=s_local_CZ.replace(/ +CZ88.NET ?/g, "");
	  		if (s_local_CZ=="") {
	  			this.output_local.value+=this.bundle.GetStringFromName("Unknown-ip");
	  			s_local_CZ="UNKNOWN";
	  		}
	  		else this.output_local.value+=s_local_CZ;
	  		this.slocalcache_CZ=s_local_CZ;
		}
	},

	//local is multiple locations
  	set_GEO_text: function(local) {
		if (local=="UNKNOWN") {
			this.output_local.value+=this.bundle.GetStringFromName("Unknown-ip");
			return;
		}
		var i;
		var GEO_location=new Array;
		var GEO_locations_list=local.split("; ");
		var GEO_list=[7,9,4];
		var GEO_item;
		var len=GEO_list.length;
		for (i=0; i<len; ++i) {
			GEO_item=GEO_locations_list[GEO_list[i]];
			if (GEO_item!="NULL")	GEO_location.push(GEO_item);
		}
		GEO_location=GEO_location.join(", ");
		//at least country code is not "NULL"
		this.output_local.value+=GEO_location;
		this.local=GEO_location;
		//time zone is not "NULL" neither
		this.set_TIME(GEO_locations_list[1]);

		len=GEO_locations_list.length;
		for (i=0; i < len; ++i) {
			GEO_item=GEO_locations_list[i];
			if (GEO_item!="NULL")
				this.output_local.value+="\n"+this.bundle.GetStringFromName(this.style_geo[i])+": "+GEO_item;
		}
  	},

	set_TIME: function(timezone) {
		if (this.sl_status_obj.timezones[timezone]) {
			this.set_TIME_text(this.sl_status_obj.timezones[timezone]);
			return;
		}
		if (!this.timezones_xml) {
			var xmlreq = new XMLHttpRequest();
			xmlreq.open("GET", "chrome://show_location/content/timezones.xml", false);
			xmlreq.send();
			this.timezones_xml=xmlreq.responseXML;
		}
		var zone = new Array();
		var zone_node=this.timezones_xml.getElementById(timezone);
		var st_offset=zone_node.childNodes[1].firstChild.nodeValue;
		var offset_min=parseInt(st_offset.substring(1,3),10)*60+parseInt(st_offset.substring(4,6),10);
		if (st_offset.substring(0,1)=="-") offset_min=-offset_min;
		zone.push(offset_min);
		var dst=zone_node.getElementsByTagName("dst_offset");
		var date = new Date();
		if (dst.length) {
			var dst_offset=dst[0].firstChild.nodeValue;
			offset_min=parseInt(dst_offset.substring(1,3),10)*60+parseInt(dst_offset.substring(4,6),10);
			if (dst_offset.substring(0,1)=="-") offset_min=-offset_min;
			zone.push(offset_min);
			var dst_start_str=zone_node.childNodes[5].firstChild.nodeValue;
			var dst_end_str=zone_node.childNodes[7].firstChild.nodeValue;
			var dst_start=this.date_UTC(dst_start_str, st_offset);
			var dst_end=this.date_UTC(dst_end_str, dst_offset);
			zone.push(dst_start);
			zone.push(dst_end);
		}
		this.set_TIME_text(zone);
	},

	set_TIME_text: function(zone) {
		var date = new Date();
		if (zone.length>1) {
			var dst_start=zone[2];
			var dst_end=zone[3];
			if (((dst_start<dst_end)&&(date>dst_start)&&(date<dst_end))||
				((dst_start>dst_end)&&((date>dst_start)||(date<dst_end))))
				date.setMinutes(date.getMinutes()+date.getTimezoneOffset()+zone[1]); //dst
			else date.setMinutes(date.getMinutes()+date.getTimezoneOffset()+zone[0]); //standard time
		}
		else date.setMinutes(date.getMinutes()+date.getTimezoneOffset()+zone[0]);
		this.output_local.value+="\n"+this.bundle.GetStringFromName("Iptool-TM0")+": "+date.toLocaleString();
	},

	/*
	keyPressInText: function(event) {
		if (event.keyCode==27) window.close();
	   	if (event.keyCode==13 && event.target.getAttribute("id") == "input_ip") this.get_local();
	},
	*/

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

	open_maptool: function(showmap) {
		var s_ip=this.localip;
		if (this.slocalcache_CZ!="" && !this.sl_status_obj.slocalcache_CZ[s_ip])
			this.sl_status_obj.slocalcache_CZ[s_ip]=this.slocalcache_CZ;
		if (this.slocalcache_GEO!="" && !this.sl_status_obj.slocalcache_GEO[s_ip])
			this.sl_status_obj.slocalcache_GEO[s_ip]=this.slocalcache_GEO;
		if (showmap) {
			this.sl_status_obj.iptool_ip=s_ip;
			this.sl_status_obj.maptool_detail=1;
			this.sl_status_obj.open_maptool(1);
		}
		else this.sl_status_obj.open_maptool(0);
	}
};
