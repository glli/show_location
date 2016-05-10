Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/ctypes.jsm");

function LocalSearchObj() {
	var localsearch_lib;
	var strType, wstrType;
	if (ctypes.char) { //Firefox 4.0+
		strType=ctypes.char.ptr;
		wstrType=ctypes.jschar.ptr;
		var ioService = Components.classes["@mozilla.org/network/io-service;1"].
		getService(Components.interfaces.nsIIOService);
		var uri = ioService.newURI("resource://LocalSearchLib", null, null);
		if (uri instanceof Components.interfaces.nsIFileURL)
			localsearch_lib=ctypes.open(uri.file.path);
	} else { //Firefox 3.6
		strType=ctypes.string;
		wstrType=ctypes.ustring;
		var id="{10228D1E-6D25-4ccc-903E-272D66EEC763}";
		var show_location_dir=Components.classes["@mozilla.org/extensions/manager;1"]
			.getService(Components.interfaces.nsIExtensionManager)
			.getInstallLocation(id).getItemLocation(id).path;
		switch(Components.classes["@mozilla.org/xre/app-info;1"].
			getService(Components.interfaces.nsIXULRuntime).XPCOMABI) {
			case "x86-msvc":
				localsearch_lib=ctypes.open(show_location_dir+"\\components\\localsearch.dll");
				break;
			case "x86-gcc3":
				localsearch_lib=ctypes.open(show_location_dir+"/components/localsearch.so");
				break;
			case "x86_64-msvc":
				localsearch_lib=ctypes.open(show_location_dir+"\\components\\localsearch_x64.dll");
				break;
			case "x86_64-gcc3":
				localsearch_lib=ctypes.open(show_location_dir+"/components/localsearch_x64.so");
		}
	}
	
	this.FindLocal_CZ=localsearch_lib.declare("FindLocal_CZ", ctypes.default_abi, ctypes.int32_t,
		strType, ctypes.int32_t, wstrType, wstrType);
	this.FindLocal_GEO=localsearch_lib.declare("FindLocal_GEO", ctypes.default_abi, ctypes.int32_t,
		strType, wstrType, strType);
}

LocalSearchObj.prototype = {
	contractID: "@show_location.org/localsearh;1",
	classID: Components.ID("{2537e282-6d25-4ccc-903e-272d66eec763}"),
	QueryInterface: XPCOMUtils.generateQI([Components.interfaces.ILocalSearch]),
	_dbPath_CZ: "QQWry.Dat",
	_dbPath_GEO: "GeoLiteCity.dat",
	get dbPath_CZ() { return this._dbPath_CZ; },
	set dbPath_CZ(path) { this._dbPath_CZ = path; },
	get dbPath_GEO() { return this._dbPath_GEO; },
	set dbPath_GEO(path) { this._dbPath_GEO = path; },
	findLocal_CZ: function(ip, type) {
		var n_char=128; //buffer size
		if (ctypes.char) {
			var rstr=ctypes.jschar.array()(n_char);
			this.FindLocal_CZ(ip, type, this._dbPath_CZ, rstr);
			return rstr.readString();
		} else {
			var rstr="";
			for (var i=0; i < n_char; ++i) rstr+=" ";
			this.FindLocal_CZ(ip, type, this._dbPath_CZ, rstr);
			return rstr;
		}
	},
	findLocal_GEO: function(ip) {
		var n_char=512;
		if (ctypes.char) {
			var rstr=ctypes.char.array()(n_char);
			this.FindLocal_GEO(ip, this._dbPath_GEO, rstr);
			var _rstr="";
			try { _rstr=rstr.readString(); } catch(err) {
				//readString can't read chars even like 'o' with 2 dots above it
				var i=0;
				while(rstr[i]) {
					_rstr+=String.fromCharCode(rstr[i]);
					++i;
				}
			}
			return _rstr;
		} else {
			var rstr="";
			for (var i=0; i < n_char; ++i) rstr+=" ";
			this.FindLocal_GEO(ip, this._dbPath_GEO, rstr);
			return rstr;
		}
	}
};

/*
  XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
  XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
  */
if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([LocalSearchObj]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([LocalSearchObj]);
