//printPreview_listener is used for ff4
var printPreview_listener = {
	getPrintPreviewBrowser: function () {
		if (!this.pp_browser) {
			this.pp_browser=document.createElement("browser");
			this.pp_browser.setAttribute("id", "pp_browser");
			this.pp_browser.setAttribute("flex", "1");
			document.getElementById("show_location_maptool_window").appendChild(this.pp_browser);
		}
		return this.pp_browser;
	},
		
	getSourceBrowser: function () {
		return sl_maptool_obj.map_browser;
	},
		
	getNavToolbox: function () {
		return sl_maptool_obj.map_toolbar;
	},
		
	onEnter: function () {
		sl_maptool_obj.map_toolbar.hidden=true; //hide toolbar and make pressing ESC not close window
		sl_maptool_obj.map_browser.collapsed=true;
		window.content=this.pp_browser.contentWindow;
	},
		
	onExit: function () {
		this.pp_browser.collapsed=true;
		sl_maptool_obj.map_browser.collapsed=false;
		window.content=sl_maptool_obj.map_browser.contentWindow;
		setTimeout(function () { sl_maptool_obj.map_toolbar.hidden=false; }, 0); //pressing ESC can close window now
	}
};

//following functions are used for ff3.x
function getPPBrowser() {
	return sl_maptool_obj.map_browser;
}

function getWebNavigation() {
	return sl_maptool_obj.map_browser.contentWindow
		.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
		.getInterface(Components.interfaces.nsIWebNavigation);
}

function getNavToolbox() {
	return sl_maptool_obj.map_toolbar;
}
