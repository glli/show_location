var google_maps_obj = {
	onInit: function() {
		var google_maps=document.getElementById("google_maps");

		var googlebar_options={ showOnLoad : true };
		this.geocoder=new GClientGeocoder();
		this.map = new GMap2(google_maps,{googleBarOptions: googlebar_options});
		this.map.addControl(new GLargeMapControl());
		this.map.addMapType(G_PHYSICAL_MAP);
		this.map.addControl(new GOverviewMapControl());
		this.map.addControl(new GMapTypeControl());
		this.scale=new GScaleControl();
		this.map.addControl(this.scale);
		this.map.enableScrollWheelZoom();
		
		var post_info=this.post_info;
		if (post_info!="") {
			var bar=post_info.indexOf("bar=1");
			if (bar+1) this.show_googlebar(1);
			
			var zoom=post_info.indexOf("zoom=");
			if (zoom+1) {
				zoom=post_info.substring(zoom+8, post_info.indexOf("%3E"));
				zoom=parseInt(zoom, 10);
			}
			else zoom=2;
			
			var latlng=post_info.indexOf("latlng=");
			var address=post_info.indexOf("address=");
			if (latlng+1) {
				latlng=post_info.substring(latlng+8, post_info.indexOf(")"));
				var marker_latlng=post_info.indexOf("marker=");
				if (marker_latlng+1) marker_latlng=post_info.substring(marker_latlng+8, post_info.indexOf("}"));
				else marker_latlng=null;
				if (address+1) address=unescape(post_info.substring(address+9, post_info.indexOf("]")));
				else address=null;
				this.set_map_latlng(latlng,marker_latlng,zoom,address);
			}
			else if (address+1) {
				address=unescape(post_info.substring(address+9, post_info.indexOf("]")));
				this.set_map_address(address, zoom, 0);
			}
			else this.map.setCenter(new GLatLng(10, 12), 2);
		}
		else this.map.setCenter(new GLatLng(10, 12), 2);
	},
		
	//stat==1 means map window is open
	set_map_address: function(address, zoom, stat) {
		parent=this;
		var geocoder_callback = function(latlng_point) {
			if (latlng_point) {
				parent.map.setCenter(latlng_point, zoom);
				parent.map.clearOverlays();
				var marker=new GMarker(latlng_point);
				parent.map.addOverlay(marker);
				GEvent.addListener(marker, "click", function() { marker.openInfoWindowHtml(address); });
				parent.marker_point=latlng_point;
				parent.marker_address=address;
			}
			else {
				if (!stat) parent.map.setCenter(new GLatLng(10, 12), 2);
				var evt = document.createEvent("Events");
				evt.initEvent("mapAddressNotFound", true, false); //address not found
				document.dispatchEvent(evt);
			}
		};
		this.geocoder.getLatLng(address,geocoder_callback);
	},
		
	set_map_latlng: function(latlng, marker_latlng, zoom, address) {
		latlng=latlng.split(",");
		var point=new GLatLng(latlng[0], latlng[1]);
		this.map.setCenter(point, zoom);
		if (address) {
			var marker;
			if (marker_latlng) {
				marker_latlng=marker_latlng.split(",");
				var point2=new GLatLng(marker_latlng[0],marker_latlng[1]);
				marker=new GMarker(point2);
				this.marker_point=point2;
			}
			else {
				marker=new GMarker(point);
				this.marker_point=point;
			}
			this.map.clearOverlays();
			this.map.addOverlay(marker);
			this.marker_address=address;
			GEvent.addListener(marker, "click", function() { marker.openInfoWindowHtml(address); });
		}
	},
		
	load_map_api: function() {
		var url=window.location.href;
		var lang=-1;
		var post_info=url.indexOf("#");
		if (post_info+1) {
			post_info=url.substring(post_info+1, url.length);
			lang=post_info.indexOf("lang=");
			if (lang+1) {
				lang=post_info.substr(lang+5,1);
				this.post_info=post_info.substring(6,post_info.length);
			}
		}
		else this.post_info="";
		
		var src_head="http://maps.google.com/maps?file=api&amp;v=2.x";
		if (lang=="1") src_head+="&hl=en";
		else if (lang=="2") src_head+="&hl=zh-CN"; //google maps in Chinese
		//this key is used for http://www.show_location.org
		var api_key="&amp;key=ABQIAAAA5yAc7Ck7ntKheao5ZEKMbBT19yEGBPBCV_qdQzVr2nejYfYqXxTHrmU477tTaBMYS1ohJmkreubgjQ";
		document.write('<script type="text/javascript" src="'+src_head+api_key+'"></script>');
	},
		
	show_googlebar: function(show) {
		if (show==1) {
			var scalePos = new GControlPosition(G_ANCHOR_BOTTOM_LEFT, new GSize(5,35));
			this.map.addControl(this.scale, scalePos);
			this.map.enableGoogleBar();
		}
		else {
			this.map.addControl(this.scale);
			this.map.disableGoogleBar();
		}
	}
};

google_maps_obj.load_map_api();