<center><img src="https://raw.githubusercontent.com/Hastegan/GPOMozilla/master/gpomozilla@durbatuluk.com/chrome/gpomozilla/content/img/gpo.png">
# GPO for Mozilla</center>
GPO Mozilla is an extension for Firefox Thunderbird and Seamonkey. This extension is compatible with Firefox and Thunderbird 1.5 or higher, and Seamonkey 1.0 or higher.
## Installation / Update
##### Installation :
The extension itself can be installed like every other extension, with <b>GPOMozilla.xpi</b> file or by copying the <b>gpomozilla@durbatuluk.com</b> floder in extensions folder (for deployment). The part of the Windows Registry where GPO Mozilla search for preference can be added with an <a href="https://msdn.microsoft.com/en-us/library/aa372405.aspx">ADM</a> file (available soon) or a <a href="http://support.microsoft.com/kb/310516">REG</a> file.<br /><br />
<b>.reg file example :</b><br />
```
[HKEY_CURRENT_USER\Software\Policies\Mozilla\Thunderbird\lockPref]
"network.proxy.type"=1
"network.proxy.http"="192.168.1.42"
```
The Mozilla's properties name can be found at <a href="about:config">about:config</a> (for Firefox) or in the Advanced preferences tab in Thunderbird. Most of the properties can be found at <a href="http://kb.mozillazine.org/About:config_entries">http://kb.mozillazine.org/About:config_entries</a>. A lot of preferencies in common for Firefox, Thunderbird and Seamonkey.
##### Update :
Firefox, Thunderbird and Seamonkey doesn't automatically notice changes to install.rdf at restart. This is because it checks the modification time of the add-on directory before checking install.rdf. You can force Firefox, Thunderbird and Seamonkey to notice changes by deleting and recreating the directory, or by touching the modification time of the directory. (<a href="https://developer.mozilla.org/en-US/docs/Adding_Extensions_using_the_Windows_Registry">Source</a>)
## Usage
It is possible to set <b>default</b> or <b>locked</b> preferences. <b>Default</b> preferences will be reset at Firefox, Thunderbird or Seamonkey startup, the user can edit them. <b>Locked</b> preferences will be set one time, the user cannot edit them, they have a grey tint.<br />
The extension starts as soon as Firefox, Thunderbird or Seamonkey starts and apply the preferences found in the Windows Registry.<br />
The extension uses <a href="https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM">XPCOM</a> components to access to the Windows Registry (<a href="https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWindowsRegKey">nsIWindowsRegKey</a>) and Mozilla Preferences (<a href="https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIPrefService">nsIPrefService</a>).
<br /><br />
An icon shows informations at the right bottom of the window (not in Firefox, should be fixed later).
Possible icons :
- <img src="https://raw.githubusercontent.com/Hastegan/GPOMozilla/master/gpomozilla@durbatuluk.com/chrome/gpomozilla/content/img/gpo_fail.png"> : <font color="red">Error</font>, an error as occurred in the script himself (should not happen). If informations on the error(s) are available, they are shown.
- <img src="https://raw.githubusercontent.com/Hastegan/GPOMozilla/master/gpomozilla@durbatuluk.com/chrome/gpomozilla/content/img/gpo_warn.png"> : <font color="orange">Warning</font>, paths to Windows Registry may be false, or no preferences have been updated.
- <img src="https://raw.githubusercontent.com/Hastegan/GPOMozilla/master/gpomozilla@durbatuluk.com/chrome/gpomozilla/content/img/gpo_ok.png"> : <font color="green">Success</font>, no error, the number of modified elements is shown.

## Structure
Tree view :
```
gpomozilla@durbatuluk.com
│   chrome.manifest
│   install.rdf
│
└─── chrome
    └─── gpomozilla
        └─── content
            │   gpomozilla.js
            │   gpomozilla.xul
            │
            └─── img
                    gpo_fail.png
                    gpo_ok.png
                    gpo_warn.png
```
