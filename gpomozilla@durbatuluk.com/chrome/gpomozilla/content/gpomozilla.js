/**
 * Author : Hastegan (hastegan@durbatuluk.com)
 *
 * Version : 0.2
 *
 *
 * For any question or query email me at hastegan@durbatuluk.com
 *
 * GPOMozilla reads Group Policy from "User Configuration" part (class USER) and
 * apply them to Mozilla preferences (Thunerbird, Firefox, Seamonkey).
 *
 * This extension needs Gecko 1.8 or higher to work. In some recent application
 * the icon is not shown in the status bar, the problem will be fixed if possible
 * (seems complicated with newest versions of Firefox). Stay tuned for updates !
 *
 *
 * "One GPO to rule them all, one GPO to edit them
 *  One GPO to read them all, and with XPCOM bind them."
 *
 * Usefull links :
 *   - XPCOM intergace to access Windows Registry :
 *         https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWindowsRegKey
 *
 *   - XPCOM interface to access Mozilla preferences	:
 *         https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Preferences
 */

var gpoThunder = {

	registryBasePath		: "",
	defaultPath				: "",
	lockedPath				: "",
	reg						: "",
	prefService				: "",
	updateDisabled			: false,
	modifiedElements		: 0,
	error						: false,
	errors					: [],
	errorType				: 0,

	exists : function(name) {
		var parentName = name.substring(0,name.lastIndexOf(".")) + ".userName";

		var prefBranch = gpoThunder.prefService.getBranch(parentName);
		var lockBranch = gpoThunder.prefService.getDefaultBranch(parentName);

		return (prefBranch.getPrefType("") != 0 || lockBranch.getPrefType("") != 0);
	},

	/**
	 * Read Windows Registry entry
	 * @param String value	Entry name
	 * @return					Registry Entry
	 */
	readRegistryValue : function(value) {
		switch (gpoThunder.reg.getValueType(value)) {
			case gpoThunder.reg.TYPE_STRING:
				return gpoThunder.reg.readStringValue(value);
			case gpoThunder.reg.TYPE_BINARY:
				return gpoThunder.reg.readBinaryValue(value);
			case gpoThunder.reg.TYPE_INT:
				return gpoThunder.reg.readIntValue(value);
			case gpoThunder.reg.TYPE_INT64:
				return gpoThunder.reg.readInt64Value(value);
		}
		// If type is not found
		return null;
	},

	/**
	 * Update Mozilla preference
	 * @param	String name 	Preference name
	 * @param	Mixed value 	Preference value
	 * @return	Boolean			Operation result
	 */
	writePrefValue : function(name, value, locked) {
		var prefBranch = null;

		// Branch type is chosen according to locked value
		if (locked) {
			prefBranch = gpoThunder.prefService.getDefaultBranch(name);
		}
		else {
			prefBranch = gpoThunder.prefService.getBranch(name);
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
					gpoThunder.updateDisabled=true;

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
				 * If the type is not found it means that the preference does not
				 * exist. It is necessary to define the type to use the correct setter
				 */
				switch(gpoThunder.getLocalType(value)) {
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
						if (gpoThunder.bool(value)) {
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
	 * Define the correct method to define Mozilla preference
	 */
	setPref : function(type, locked) {
		if (locked)
			gpoThunder.setLockPref(type);
		else
			gpoThunder.setUserPref(type);
	},

	/**
	 * Define locked preferences
	 */
	setLockPref : function(type) {
		// Registry is opend is read mode
		gpoThunder.reg.open(type, gpoThunder.registryBasePath + "\\" + gpoThunder.lockedPath, gpoThunder.reg.ACCESS_READ);
		for (var i = 0; i < gpoThunder.reg.valueCount; i++) {

			// Getting preference information from registry
			var prefName = gpoThunder.reg.getValueName(i);
			var prefValue = gpoThunder.readRegistryValue(prefName);

			// Preference is updated
			gpoThunder.writePrefValue(prefName, prefValue, true);
		}
		gpoThunder.reg.close();
	},

	/**
	 * Define default preferences
	 */
	setUserPref : function(type) {
		// Ouverture du registre Windows en lecture
		gpoThunder.reg.open(type, gpoThunder.registryBasePath + "\\" + gpoThunder.defaultPath, gpoThunder.reg.ACCESS_READ);
		for (var i = 0; i < gpoThunder.reg.valueCount; i++) {

			// Getting preference information from registry
			var prefName = gpoThunder.reg.getValueName(i);
			var prefValue = gpoThunder.readRegistryValue(prefName);

			// Preference is updated
			gpoThunder.writePrefValue(prefName, prefValue, false);
		}
		gpoThunder.reg.close();
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
			gpoThunder.reg.open(gpoThunder.reg.ROOT_KEY_CURRENT_USER, gpoThunder.registryBasePath, gpoThunder.reg.ACCESS_READ);
			if (gpoThunder.reg.hasChild(gpoThunder.lockedPath)) {
				gpoThunder.setPref(gpoThunder.reg.ROOT_KEY_CURRENT_USER, true);
			}
			else {
				// If the path is empty
				this.errorType = 3;
			}

			// Apply default preferences from GPO
			gpoThunder.reg.open(gpoThunder.reg.ROOT_KEY_CURRENT_USER, gpoThunder.registryBasePath, gpoThunder.reg.ACCESS_READ);
			if (gpoThunder.reg.hasChild(gpoThunder.defaultPath)) {
				gpoThunder.setPref(gpoThunder.reg.ROOT_KEY_CURRENT_USER, false);
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
 * Method is called as soon as XUL file is loaded
 */
window.addEventListener("load", function load(event){
		window.removeEventListener("load", load, false);

		// Extension main method is called
		gpoThunder.init();

		// Getting icon element in status bar
		var element = document.getElementById("gpo-panel");

		// If there is no error
		if (!gpoThunder.error && gpoThunder.errors.length == 0) {
			// If one of the paths is empty or if no preferences were applied
			if (gpoThunder.errorType == 3 && gpoThunder.modifiedElements == 0) {
				// Warning icon is shown
				element.setAttribute("src", "chrome://gpomozilla/content/img/gpo_warn.png");
				// Warning message is shown
				element.setAttribute("tooltiptext","No preferences were applied, registry path may be wrong");
			}
			else {
				// Success icon is shown
				element.setAttribute("src", "chrome://gpomozilla/content/img/gpo_ok.png");
				// Success message is shown
				element.setAttribute("tooltiptext","Modified preferences : " + gpoThunder.modifiedElements);
			}

		}
		else {
			// A 's' is added if there is multiple errors
			var plural = (gpoThunder.errors.length == 1) ? "" : "s";

			var errorsText = "";
			for (var i = 0; i < gpoThunder.errors.length; i++) {
				errorsText += "   - " + gpoThunder.errors[i] + "\n";
			}

			errorsText = "Error"+plural+" :\n" + errorsText;

			// Error message is shown
			element.setAttribute("tooltiptext", errorsText)
		}

}, false);
