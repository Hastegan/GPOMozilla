/**
 * Author : Hastegan
 *
 * Version : 0.1.3
 *
 * GPOMozilla reads Group Policy from "User Configuration" part (class USER) and
 * apply them to Mozilla preferences (Thunerbird, Firefox, Seamonkey).
 *
 * This extension needs Gecko 1.8 or higher to work. In some recent application
 * the icon is not shown in the status bar, the problem will be fixed if possible
 * (seems complicated with newest versions of Firefox). Stay tuned for updates !
 * *
 * Usefull links :
 *   - XPCOM intergace to access Windows Registry :
 *         https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWindowsRegKey
 *
 *   - XPCOM interface to access Mozilla preferences	:
 *         https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Preferences
 */

var gpoMozilla = {

	registryBasePath : "",
	defaultPath      : "",
	lockedPath       : "",
	reg              : "",
	prefService      : "",
	updateDisabled   : false,
	modifiedElements : 0,
	error            : false,
	errors           : [],
	errorType        : 0,

	exists : function(name) {
		var parentName = name.substring(0,name.lastIndexOf(".")) + ".userName";

		var prefBranch = gpoMozilla.prefService.getBranch(parentName);
		var lockBranch = gpoMozilla.prefService.getDefaultBranch(parentName);

		return (prefBranch.getPrefType("") != 0 || lockBranch.getPrefType("") != 0);
	},

	/**
	 * Read Windows Registry entry
	 * @param     String value    Entry name
	 * @return                    Registry Entry
	 */
	readRegistryValue : function(value) {
		switch (gpoMozilla.reg.getValueType(value)) {
			case gpoMozilla.reg.TYPE_STRING:
				return gpoMozilla.reg.readStringValue(value);
			case gpoMozilla.reg.TYPE_BINARY:
				return gpoMozilla.reg.readBinaryValue(value);
			case gpoMozilla.reg.TYPE_INT:
				return gpoMozilla.reg.readIntValue(value);
			case gpoMozilla.reg.TYPE_INT64:
				return gpoMozilla.reg.readInt64Value(value);
		}
		// If type is not found
		return null;
	},

	/**
	 * Update Mozilla preference
	 * @param     String name    Preference name
	 * @param     Mixed value    Preference value
	 * @return    Boolean        Operation result
	 */
	writePrefValue : function(name, value, locked) {
		var prefBranch = null;

		if (locked) {
			prefBranch = gpoMozilla.prefService.getDefaultBranch(name);
		}
		else {
			prefBranch = gpoMozilla.prefService.getBranch(name);
		}

		// If preference contains a #, other possible occurences must be found
		if (name.indexOf("#") > -1) {
			var id = 1;
			var exists = false;

			// While there is occurences
			while (exists || id == 1) {

				// # or id is replaced by current id
				name = name.replace("#", id);
				name = name.replace(id-1, id);

				// If the id exitsts, preferences are updated
				if (this.exists(name)) {
					this.writePrefValue(name, value, locked);
					exists = true;
					id++;
				}
				else
					exists = false;
			}
			// Method is stopped
			return true;
		}

		// Updating preference with correct setter
		switch (prefBranch.getPrefType("")) {
			case prefBranch.PREF_STRING:
				prefBranch.setCharPref("", value);

				if (locked)
					prefBranch.lockPref("");

				this.modifiedElements ++;
				return true;

			case prefBranch.PREF_INT:
				prefBranch.setIntPref("", value);

				if (locked)
					prefBranch.lockPref("");

				this.modifiedElements ++;
				return true;

			case prefBranch.PREF_BOOL:
				if (name == "app.update.enabled" && value == false)
					gpoMozilla.updateDisabled=true;

				if (value == "false" || value == "0")
					prefBranch.setBoolPref("", false);
				else
					prefBranch.setBoolPref("", true);

				if (locked)
					prefBranch.lockPref("");

				this.modifiedElements ++;
				return true;

			default:
				/**
				 * If the type is not found it means that the preference does
				 * not exist.
				 * It is necessary to define the type to use the correctsetter
				 */
				switch(gpoMozilla.getLocalType(value)) {
					case "string":
						prefBranch.setCharPref("", value);

						if (locked)
							prefBranch.lockPref("");

						this.modifiedElements ++;
						return true;

					case "int":
						prefBranch.setIntPref("", value);

						if (locked)
							prefBranch.lockPref("");

						this.modifiedElements ++;
						return true;

					case "bool":
						if (gpoMozilla.bool(value)) {
							prefBranch.setBoolPref("", false);
						}
						else {
							prefBranch.setBoolPref("", true);
						}

						if (locked)
							prefBranch.lockPref("");

						this.modifiedElements ++;
						return true;

					default:
						return false;
				}
		}

		return false;
	},

	/**
	 *
	 */
	/**
	 * Set a preference
	 * @param {[type]} type   [description]
	 * @param {[type]} locked [description]
	 */
	setPref : function(type, locked) {
		if (locked)
			gpoMozilla.setLockPref(type);
		else
			gpoMozilla.setUserPref(type);
	},

	/**
	 * Define locked preferences
	 */
	setLockPref : function(type) {
		// Registry is opend is read mode
		gpoMozilla.reg.open(type, gpoMozilla.registryBasePath + "\\" + gpoMozilla.lockedPath, gpoMozilla.reg.ACCESS_READ);
		for (var i = 0; i < gpoMozilla.reg.valueCount; i++) {

			// Getting preference information from registry
			var prefName = gpoMozilla.reg.getValueName(i);
			var prefValue = gpoMozilla.readRegistryValue(prefName);

			// Preference is updated
			gpoMozilla.writePrefValue(prefName, prefValue, true);
		}
		gpoMozilla.reg.close();
	},

	/**
	 * Define default preferences
	 */
	setUserPref : function(type) {
		// Ouverture du registre Windows en lecture
		gpoMozilla.reg.open(type, gpoMozilla.registryBasePath + "\\" + gpoMozilla.defaultPath, gpoMozilla.reg.ACCESS_READ);
		for (var i = 0; i < gpoMozilla.reg.valueCount; i++) {

			// Getting preference information from registry
			var prefName = gpoMozilla.reg.getValueName(i);
			var prefValue = gpoMozilla.readRegistryValue(prefName);

			// Preference is updated
			gpoMozilla.writePrefValue(prefName, prefValue, false);
		}
		gpoMozilla.reg.close();
	},

	/**
	 * Deduce the type of data given
	 * @param  String value 	Value
	 * @return String 			Data type
	 */
	getLocalType : function(value) {
		var returnValue = "string";
		if ( value == "true" || value == "false"  || value == "0" || value == "1") {
			return "bool";
		}
		else {
			try{
				if (value > -1 ) {
					return "int"
				}
			}catch(ex) { }
		}
		return returnValue;
	},

	/**
	 * Returns True or False according to the boolean given
	 * @param  String bool Boolean ("true" or "false", 0 or 1)
	 * @return Boolean     Boolean correctly formed
	 */
	bool : function(bool) {
		if (bool == "true" || bool == "1")
			return true;
		else return false;
	},

	/**
	 * Main method
	 */
	gpothunder : function() {

		try {
			// Apply locked preferences from GPO
			gpoMozilla.reg.open(gpoMozilla.reg.ROOT_KEY_CURRENT_USER, gpoMozilla.registryBasePath, gpoMozilla.reg.ACCESS_READ);
			if (gpoMozilla.reg.hasChild(gpoMozilla.lockedPath)) {
				gpoMozilla.setPref(gpoMozilla.reg.ROOT_KEY_CURRENT_USER, true);
			}
			else {
				// If the path is empty
				this.errorType = 3;
			}

			// Apply default preferences from GPO
			gpoMozilla.reg.open(gpoMozilla.reg.ROOT_KEY_CURRENT_USER, gpoMozilla.registryBasePath, gpoMozilla.reg.ACCESS_READ);
			if (gpoMozilla.reg.hasChild(gpoMozilla.defaultPath)) {
				gpoMozilla.setPref(gpoMozilla.reg.ROOT_KEY_CURRENT_USER, false);
			}
			else {
				// If the path is empty
				this.errorType = 3;
			}
		}catch(ex) {
				this.errror = true;
		}
	},

	init : function() {

		// Apps IDs
		var firefoxID	= "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
		var thunderID	= "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
		var seamonkID	= "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}";

		// XPCOM component to get informations on the current application
		var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
												.getService(Components.interfaces.nsIXULAppInfo);


		////////////////////
		// Registry paths //
		////////////////////
		this.registryBasePath = "Software\\Policies";

		// Choosing correct Registry part for Firefox or Thunderbird
		if (appInfo.ID == firefoxID) {
			this.defaultPath = "Mozilla\\Firefox\\defaultPref";
			this.lockedPath = "Mozilla\\Firefox\\lockPref";
		}
		else if (appInfo.ID == thunderID) {
			this.defaultPath = "Mozilla\\Thunderbird\\defaultPref";
			this.lockedPath = "Mozilla\\Thunderbird\\lockPref";
		}
		else if (appInfo.ID == seamonkID) {
			this.defaultPath = "Mozilla\\Seamonkey\\defaultPref";
			this.lockedPath = "Mozilla\\Seamonkey\\lockPref";
		}

		// XPCM component to access Windows Registry (nsIWindowsRegKey)
		if ("@mozilla.org/windows-registry-key;1" in Components.classes) {
			this.reg = Components.classes["@mozilla.org/windows-registry-key;1"].createInstance(Components.interfaces.nsIWindowsRegKey);
		}
		else
			this.errors.push("La classe '@mozilla.org/windows-registry-key' n'a pas été trouvée.");

		// XPCOM component to access Mozilla preferences (nsIPrefService)
		if ("@mozilla.org/preferences-service;1" in Components.classes) {
			this.prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		}
		else
			this.errors.push("La classe '@mozilla.org/preferences-service' n'a pas été trouvée.");

		this.gpothunder();

		return;
	}
};

/**
 * Method is called as soon as the XUL file is loaded
 */
window.addEventListener("load", function load(event){
		window.removeEventListener("load", load, false);

		// Extension main method is called
		gpoMozilla.init();

		// Getting icon element in status bar
		var element = document.getElementById("gpo-panel");

		// If there is no error
		if (!gpoMozilla.error && gpoMozilla.errors.length == 0) {
			// If one of the paths is empty or if no preferences were applied
			if (gpoMozilla.errorType == 3 && gpoMozilla.modifiedElements == 0) {
				// Warning icon is shown
				element.setAttribute("src", "chrome://gpomozilla/content/img/gpo_warn.png");
				// Warning message is shown
				element.setAttribute("tooltiptext","No preferences were applied, registry path may be wrong");
			}
			else {
				// Success icon is shown
				element.setAttribute("src", "chrome://gpomozilla/content/img/gpo_ok.png");
				// Success message is shown
				element.setAttribute("tooltiptext","Modified preferences : " + gpoMozilla.modifiedElements);
			}

		}
		else {
			// A 's' is added if there is multiple errors
			var plural = (gpoMozilla.errors.length == 1) ? "" : "s";

			var errorsText = "";
			for (var i = 0; i < gpoMozilla.errors.length; i++) {
				errorsText += "   - " + gpoMozilla.errors[i] + "\n";
			}

			errorsText = "Error"+plural+" :\n" + errorsText;

			// Error message is shown
			element.setAttribute("tooltiptext", errorsText)
		}

}, false);
