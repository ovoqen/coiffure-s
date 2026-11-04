"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _APICommands = require("../constants/APICommands");

var _dcCore = require("dc-core");

var _ServiceRegistry = _interopRequireDefault(require("../util/ServiceRegistry"));

var _AppUtil = require("../util/AppUtil");

var _downloadFile = _interopRequireDefault(require("../preview/actions/downloadFile"));

var _saveFile = _interopRequireDefault(require("../preview/actions/saveFile"));

var _ApiConstants = _interopRequireDefault(require("../constants/ApiConstants"));

var _ErrorUtils = require("../util/ErrorUtils");

var _SearchModel = _interopRequireDefault(require("../model/SearchModel"));

var _Events = require("../constants/Events");

var _ViewMode = require("../constants/ViewMode");

var _mobx = require("mobx");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2020 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/
const THUMBNAIL_OPTIONS = {
  THUMBNAIL_ZOOM_LEVEL: 0.2,
  THUMBNAIL_FORMATS: ["png"]
};

class PreviewCommands {
  constructor() {
    this._getBookmarks = () => new Promise((resolve, reject) => {
      const {
        enableBookmarkAPIs
      } = _ServiceRegistry.default.getService("AppStore").getActionConfig("preview");

      if (enableBookmarkAPIs) {
        this._publicAPIs.document.getBookmarks().then(bookmarkList => {
          resolve((0, _mobx.toJS)(bookmarkList));
        }).catch(() => {
          reject("There's some problem while processing your request.");
        });
      } else {
        reject("Bookmark apis is disabled");
      }
    });

    this._openBookmark = id => {
      const {
        enableBookmarkAPIs
      } = _ServiceRegistry.default.getService("AppStore").getActionConfig("preview");

      if (enableBookmarkAPIs) {
        const returnVal = this._publicAPIs.document.executeBookmark(id) || {};
        return Promise.resolve(!!returnVal.success);
      }

      return Promise.reject("Bookmark apis is disabled");
    };

    this._getAttachments = () => new Promise((resolve, reject) => {
      const {
        enableAttachmentAPIs
      } = _ServiceRegistry.default.getService("AppStore").getActionConfig("preview");

      if (enableAttachmentAPIs) {
        this._publicAPIs.document.getAttachments().then(attachmentList => {
          const updatedList = attachmentList.map(row => ({
            name: row.name,
            description: row.description,
            mimeType: row.mimeType,
            created: row.creationDate,
            modified: row.modifiedDate
          }));
          resolve((0, _mobx.toJS)(updatedList));
        }).catch(() => {
          reject("There's some problem while processing your request.");
        });
      } else {
        reject("Attachment apis is disabled");
      }
    });

    this._getAttachmentBuffer = name => new Promise((resolve, reject) => {
      const {
        enableAttachmentAPIs
      } = _ServiceRegistry.default.getService("AppStore").getActionConfig("preview");

      if (enableAttachmentAPIs) {
        this._publicAPIs.document.getAttachmentBuffer(name).then(AttachmentBufferObject => {
          resolve((0, _mobx.toJS)(AttachmentBufferObject));
        }).catch(() => {
          reject("There's some problem while processing your request.");
        });
      } else {
        reject("Attachment apis is disabled");
      }
    });

    this._apiCommands = {
      [_APICommands.PreviewAPICommands.DOWNLOAD_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleDownload.bind(this)
      },
      [_APICommands.PreviewAPICommands.FULL_SCREEN_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleFullScreen.bind(this)
      },
      [_APICommands.PreviewAPICommands.PRINT_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._togglePrint.bind(this)
      },
      [_APICommands.PreviewAPICommands.PAGE_NAVIGATION_CONTROL_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._togglePageNavControl.bind(this)
      },
      [_APICommands.PreviewAPICommands.DOCK_SWITCH_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleDockSwitch.bind(this)
      },
      [_APICommands.PreviewAPICommands.ZOOM_CONTROL_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleZoomControl.bind(this)
      },
      [_APICommands.PreviewAPICommands.FIT_PAGE_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleFitPage.bind(this)
      },
      [_APICommands.PreviewAPICommands.FIT_WIDTH_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleFitWidth.bind(this)
      },
      [_APICommands.PreviewAPICommands.SCRUBBER_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleScrubber.bind(this)
      },
      [_APICommands.PreviewAPICommands.FILE_NAME_TOAST_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleFileNameToast.bind(this)
      },
      [_APICommands.PreviewAPICommands.SET_VIEW_MODE]: {
        validator: this._validateStringData.bind(this),
        action: this._setViewMode.bind(this)
      },
      [_APICommands.PreviewAPICommands.HUD_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleHUD.bind(this)
      },
      [_APICommands.PreviewAPICommands.LEFT_PANE_VISIBILITY]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleLHP.bind(this)
      },
      [_APICommands.PreviewAPICommands.SET_LEGAL_DIALOG_OPEN]: {
        validator: this._validateBooleanData.bind(this),
        action: this._setLegalDialogOpen.bind(this)
      },
      [_APICommands.PreviewAPICommands.TOGGLE_TEXT_SELECTION]: {
        validator: this._validateBooleanData.bind(this),
        action: this._toggleTextSelection.bind(this)
      },
      [_APICommands.PreviewAPICommands.DOCKED_HUD]: {
        validator: this._validateBooleanData.bind(this),
        action: this._dockHUD.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_PAGE_ZOOM_LEVEL]: {
        validator: this._validatePositiveNumberData.bind(this),
        action: this._getPageZoom.bind(this)
      },
      [_APICommands.PreviewAPICommands.CLEAR_PAGE_SELECTION]: {
        validator: this._validatePositiveNumberData.bind(this),
        action: this._clearPageSelection.bind(this)
      },
      [_APICommands.PreviewAPICommands.SET_CURSOR]: {
        validator: this._validateStringData.bind(this),
        action: this._setCursor.bind(this)
      },
      [_APICommands.PreviewAPICommands.GOTO_LOCATION]: {
        validator: this._validateGoToData.bind(this),
        action: this._gotoLocation.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_XMP_METADATA]: {
        validator: this._validateXMPData.bind(this),
        action: this._getXMPMetadata.bind(this)
      },
      [_APICommands.PreviewAPICommands.SET_ZOOM_LEVEL]: {
        validator: this._validatePositiveFloatData.bind(this),
        action: this._setZoomLevel.bind(this)
      },
      [_APICommands.PreviewAPICommands.START_SEARCH]: {
        validator: this._validateSearchData.bind(this),
        action: this._searchQuery.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_THUMBNAIL]: {
        validator: this._validateThumbnailsData.bind(this),
        action: this._getThumbnails.bind(this)
      },
      [_APICommands.PreviewAPICommands.OPEN_BOOKMARK]: {
        validator: this._validateStringData.bind(this),
        action: this._openBookmark.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_ATTACHMENT_BUFFER]: {
        validator: this._validateStringData.bind(this),
        action: this._getAttachmentBuffer.bind(this)
      },
      [_APICommands.PreviewAPICommands.REGISTER_BEFORE_RHP_OPEN_CALLBACK]: {
        validator: this._validateHookData.bind(this),
        action: this._registerBeforeRHPOpenCallback.bind(this)
      },
      [_APICommands.PreviewAPICommands.REGISTER_BEFORE_QUICK_TOOL_ACTIVATED_CALLBACK]: {
        validator: this._validateHookData.bind(this),
        action: this._registerBeforeQuickToolActivatedCallback.bind(this)
      },
      [_APICommands.PreviewAPICommands.RESET_QUICK_TOOL]: {
        action: this._resetQuickTool.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_ACTIVE_QUICK_TOOL]: {
        action: this._getActiveQuickTool.bind(this)
      },
      [_APICommands.PreviewAPICommands.SHOW_QUICK_TOOL]: {
        validator: this._validateBooleanData.bind(this),
        action: this._showQuickTool.bind(this)
      },
      [_APICommands.PreviewAPICommands.OPEN_RHP_PANEL]: {
        action: this._openRHPPanel.bind(this)
      },
      [_APICommands.PreviewAPICommands.CLOSE_RHP_PANEL]: {
        action: this._closeRHPPanel.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_RHP_CONFIG]: {
        action: this._getRHPConfig.bind(this)
      },
      [_APICommands.PreviewAPICommands.UPDATE_PREVIEW_APP_CONFIG]: {
        validator: this._validateStringData.bind(this),
        action: this._updatePreviewAppConfig.bind(this)
      },
      [_APICommands.PreviewAPICommands.IS_EDITING_ALLOWED]: {
        action: this._isEditingAllowed.bind(this)
      },
      [_APICommands.PreviewAPICommands.SET_FILE_NAME]: {
        action: this._setFileName.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_ALL_BOOKMARK]: {
        action: this._getBookmarks.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_ATTACHMENTS]: {
        action: this._getAttachments.bind(this)
      },
      [_APICommands.PreviewAPICommands.ZOOM_IN]: {
        action: this._zoomIn.bind(this)
      },
      [_APICommands.PreviewAPICommands.ZOOM_OUT]: {
        action: this._zoomOut.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_ZOOM_LIMIT]: {
        action: this._getZoomLimit.bind(this)
      },
      [_APICommands.PreviewAPICommands.RESET_CURSOR]: {
        action: this._resetCursor.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_CURRENT_PAGE]: {
        action: this._getCurrentPage.bind(this)
      },
      [_APICommands.PreviewAPICommands.SHOW_HUD]: {
        action: this._showHUD.bind(this)
      },
      [_APICommands.PreviewAPICommands.HIDE_HUD]: {
        action: this._hideHUD.bind(this)
      },
      [_APICommands.PreviewAPICommands.SAVE_PDF]: {
        action: this._savePDF.bind(this)
      },
      [_APICommands.PreviewAPICommands.DOWNLOAD_PDF]: {
        action: this._downloadPDF.bind(this)
      },
      [_APICommands.PreviewAPICommands.CLEAR_FILE_DIRTY_STATUS]: {
        action: this._clearFileDirtyState.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_PDF_PERMISSIONS]: {
        action: this._getPDFPermissions.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_PDF_METADATA]: {
        action: this._getPDFMetadata.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_SEARCH_UI]: {
        action: this._getSearchUI.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_SELECTED_CONTENT]: {
        action: this._getSelectedContent.bind(this)
      },
      [_APICommands.PreviewAPICommands.GET_COMMAND_MANAGER]: {
        action: this._getCommandManager.bind(this)
      },
      [_APICommands.PreviewAPICommands.FORCE_SHOW_COMMENTING_TOOLS]: {
        validator: this._validateBooleanData.bind(this),
        action: this._forceShowCommentingTools.bind(this)
      }
    };
  }

  static getClassName() {
    return "PreviewCommands";
  }

  _getPreviewAPIs() {
    if (this._oldAPIs && this._publicAPIs) {
      return Promise.resolve(true);
    }

    const commandList = ["modifyCursor", "documentActions", "documentState", "reusableComponents", "commandManager"];
    return Promise.all([_ServiceRegistry.default.getService("AppStore").previewRef.getApis("INT_COMMANDS", commandList), _ServiceRegistry.default.getService("AppStore").previewRef.getPublicApis()]).then(apis => {
      this._oldAPIs = apis[0];
      this._publicAPIs = apis[1];
      return true;
    });
  }
  /**
   * @method
   * @description
   * it execute the command related to pdf viewer
   *
   * @param {Object} data having command, commandData and options
   */


  executeCommand(data) {
    const invalidError = this._validatePreviewCommand(data);

    if (invalidError) return Promise.reject(invalidError);
    return new Promise((resolve, reject) => {
      _ServiceRegistry.default.getService("AppStore").getLinearizationWaitPromise().then(() => {
        this._getPreviewAPIs().then(() => this._apiCommands[data.command].action.call(this, data.commandData, data.options)).then(resolve).catch(err => reject((0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.FAIL, err)));
      });
    });
  }

  _validateStringData(data) {
    const {
      commandData
    } = data;
    let err;

    if (typeof commandData !== "string") {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only String input is supported for command");
    }

    return err;
  }

  _validateSearchData(data) {
    const {
      commandData
    } = data;
    let err;

    if (commandData) {
      const {
        searchText
      } = commandData;

      if (typeof searchText !== "string" || searchText === "") {
        err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only String input is supported for Search Command");
      }
    }

    return err;
  }

  _validateBooleanData(data) {
    const {
      commandData
    } = data;
    let err;

    if (typeof commandData !== "boolean") {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only Boolean input is supported for command");
    }

    return err;
  }

  _validateGoToData(data) {
    const {
      commandData
    } = data;
    let err;

    if (!commandData || "pageIndex" in commandData && !(0, _AppUtil.isInt)(commandData.pageIndex) || "pageNumber" in commandData && (!(0, _AppUtil.isInt)(commandData.pageNumber) || commandData.pageNumber < 1) || !(0, _AppUtil.isInt)(commandData.left) || !(0, _AppUtil.isInt)(commandData.top)) {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only valid pageNumber, left and top is supported for command");
    }

    return err;
  }

  _validateThumbnailsData(data) {
    const {
      commandData,
      options: {
        preCalculatedData
      }
    } = data;
    const options = commandData.options || {};
    const zoomData = preCalculatedData.zoomData;
    let err;

    const filterFunc = pageNumber => pageNumber < 1 || pageNumber > preCalculatedData.totalPageCount;

    if (!commandData || !commandData.pageNumbers || !(0, _AppUtil.isNonEmptyArray)(commandData.pageNumbers) || (0, _AppUtil.isNonEmptyArray)(commandData.pageNumbers.filter(filterFunc))) {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_PAGE_RANGE, "The requested page range is not valid.");
    } else if ("zoomLevel" in options && (!(0, _AppUtil.isPositiveFloat)(options.zoomLevel) || options.zoomLevel < zoomData.minZoom || options.zoomLevel > zoomData.maxZoom)) {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_ZOOM_LEVEL, "The requested zoom level is not valid.");
    } else if ("format" in options && THUMBNAIL_OPTIONS.THUMBNAIL_FORMATS.indexOf(options.format) === -1) {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_THUMBNAIL_FORMAT, "The requested format is not valid.");
    }

    return err;
  }

  _validatePositiveNumberData(data) {
    const {
      commandData
    } = data;
    let err;

    if (!((0, _AppUtil.isInt)(commandData) && commandData > 0)) {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only positive number is supported for command");
    }

    return err;
  }

  _validatePositiveFloatData(data) {
    const {
      commandData
    } = data;
    let err;

    if (!(0, _AppUtil.isPositiveFloat)(commandData)) {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only positive number is supported for command");
    }

    return err;
  }
  /**
   * @method
   * @description
   * it validates the preview command whether it is allowed.
   *
   * @return Return undefined if it is valid
   */


  _validatePreviewCommand(data) {
    if (this._apiCommands[data.command].validator) {
      return this._apiCommands[data.command].validator(data);
    }

    return undefined;
  }

  _validateXMPData(data) {
    let err;
    const {
      commandData
    } = data;

    if (commandData) {
      const {
        fields,
        rawStream
      } = commandData;

      if (fields !== undefined) {
        if (typeof fields !== "object" || fields.length === undefined) {
          err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only array input is supported for fields in command");
        }

        if (!err) {
          fields.forEach(field => {
            if (typeof field !== "string") {
              err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only string input is supported for fields value in command");
            }
          });
        }
      }

      if (!err && rawStream !== undefined && typeof rawStream !== "boolean") {
        err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only Boolean input is supported for rawStream in command");
      }
    }

    return err;
  }

  _validateFunctionType(data) {
    let err;
    const {
      commandData
    } = data;

    if (typeof commandData !== "function") {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only function is supported for command");
    }

    return err;
  }

  _validateHookData(data) {
    let err;
    const {
      commandData: {
        callbackFn,
        opts
      }
    } = data;

    if (typeof callbackFn !== "function") {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only function is supported in callback for command");
    }

    if (opts && typeof opts !== "object") {
      err = (0, _ErrorUtils.commandError)(_ApiConstants.default.API_RESPONSE.INVALID_INPUT, "Only object is supported in options for command");
    }

    return err;
  }
  /**
   * @method
   * @description
   * it shows the undocked HUD if dock page controls is diabled and we can make it
   * show forcefully by passing param true
   *
   * @param {Boolean} force if it's true it show hud instead of dockPageControls configuration
   */


  _shouldShowUndockedHUD(force = false) {
    const previewConfig = _ServiceRegistry.default.getService("AppStore").getActionConfig("preview");

    if (!previewConfig.dockPageControls || force) {
      this._publicAPIs.hud.show(true);
    }
  }

  _customiseUIControl(property, visible) {
    this._publicAPIs.app.customizeUIControl(property, {
      visible
    });

    this._shouldShowUndockedHUD();

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * show or hide fit width icon in HUD
   *
   * @param {Boolean} visible fit width icon is visible if param is true
   */


  _toggleFitWidth(visible) {
    return this._customiseUIControl("FIT_WIDTH", visible);
  }
  /**
   * @method
   * @description
   * show or hide fit page icon in HUD
   *
   * @param {Boolean} visible fit page icon is visible if param is true
   */


  _toggleFitPage(visible) {
    return this._customiseUIControl("FIT_PAGE", visible);
  }
  /**
   * @method
   * @description
   * show or hide page navigation control icon in HUD
   *
   * @param {Boolean} visible page navigation icon is visible if param is true
   */


  _togglePageNavControl(visible) {
    return this._customiseUIControl("PAGE_NAVIGATION_CONTROL", visible);
  }
  /**
   * @method
   * @description
   * show or hide zoom control icon in HUD
   *
   * @param {Boolean} visible zoom control icon is visible if param is true
   */


  _toggleZoomControl(visible) {
    return this._customiseUIControl("ZOOM_CONTROL", visible);
  }
  /**
   * @method
   * @description
   * force show or hide commenting tools
   *
   * @param {Boolean} visible commenting tools are visible if param is true
   */


  _forceShowCommentingTools(visible) {
    return this._customiseUIControl("FORCE_SHOW_COMMENTING_TOOLS", visible);
  }
  /**
   * @method
   * @description
   * show or hide dock icon in HUD
   *
   * @param {Boolean} visible dock icon is visible if param is true
   */


  _toggleDockSwitch(visible) {
    return this._customiseUIControl("DOCK_SWITCH", visible);
  }
  /**
   * @method
   * @description
   * show or hide download icon in header section
   *
   * @param {Boolean} visible download icon is visible if param is true
   */


  _toggleDownload(visible) {
    _ServiceRegistry.default.getService("AppStore").configStore.setShowDownload(visible);

    if (_ServiceRegistry.default.getService("AppStore").isInLinePreset) {
      return this._customiseUIControl("DOWNLOAD", visible);
    } // apiObject.app.enableFeature("DOWNLOAD", visible).catch(() => {});


    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * if visible  is true it switched the view mode to full screen and update
   * the full screen icon in HUD
   *
   */


  _toggleFullScreen(visible) {
    _ServiceRegistry.default.getService("AppStore").configStore.setShowFullScreen(visible);

    _ServiceRegistry.default.getService("FullScreenManager").updateFSIconInHud();

    this._shouldShowUndockedHUD(true);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * show or hide print icon in header section
   *
   * @param {Boolean} visible print icon is visible if param is true
   */


  _togglePrint(visible) {
    _ServiceRegistry.default.getService("AppStore").configStore.setShowPrint(visible);

    if (_ServiceRegistry.default.getService("AppStore").isInLinePreset) {
      return this._customiseUIControl("PRINT", visible);
    }

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * show or hide HUD at the bottom of screen
   *
   * @param {Boolean} visible HUD is visible if param is true
   */


  _toggleHUD(visible) {
    _ServiceRegistry.default.getService("AppStore").setIsHidingBranding(!visible);

    this._publicAPIs.hud.show(visible);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * show or hide LHP at the left side of screen
   *
   * @param {Boolean} visible LHP is visible if param is true
   */


  _toggleLHP(visible) {
    this._publicAPIs.lhp.show(visible);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * make the legal dialog open
   *
   * @param {Boolean} value Legal Dialog visible if value is true
   */


  _setLegalDialogOpen(value) {
    const appStore = _ServiceRegistry.default.getService("AppStore");

    appStore.legalDialogOpen = value;
    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it makes the HUD docked at the bottom of screen
   */


  _dockHUD(dock) {
    this._publicAPIs.hud.fadeIn(0);

    this._publicAPIs.hud.dock(dock);

    return Promise.resolve(true);
  }

  _setViewMode(viewMode) {
    let defaultViewMode = viewMode;

    const appStore = _ServiceRegistry.default.getService("AppStore");

    if ((0, _AppUtil.isValidMobileViewMode)(defaultViewMode) && !appStore.showViewMode) {
      defaultViewMode = "";
    }

    appStore.setCurrentViewMode(defaultViewMode);

    this._publicAPIs.document.setViewMode(_ViewMode.InternalViewMode[defaultViewMode] || defaultViewMode);

    return Promise.resolve(true);
  }

  _toggleScrubber(visible) {
    return this._customiseUIControl("SCRUBBER", visible);
  }

  _toggleFileNameToast(visible) {
    const result = this._customiseUIControl("FILE_NAME_TOAST", visible);

    _ServiceRegistry.default.getService("EventsService").sendEvent(_Events.InternalEvents.FILE_NAME_TOAST_VISIBILITY, visible);

    return result;
  }
  /**
   * @method
   * @description
   * it show the HUD at the bottom of available screen
   */


  _showHUD() {
    this._publicAPIs.hud.show(true);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it hide the HUD from the available screen
   */


  _hideHUD() {
    this._publicAPIs.hud.show(false);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it sets the page cursor to any cursor style for the pdf view
   */


  _setCursor(data) {
    this._oldAPIs.modifyCursor.setCursor(data);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it revokes an applied cursor style and reverts it to the default cursor style.
   */


  _resetCursor() {
    this._oldAPIs.modifyCursor.resetCursor();

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it returns the current page number in focus page
   */


  _getCurrentPage() {
    return this._publicAPIs.document.getCurrentPageNumber();
  }
  /**
   * @method
   * @description
   * it takes the PDF page number as input and returns the zoom level of that page.
   *
   * @param pageNumber page number of document
   */


  _getPageZoom(pageNumber) {
    return this._publicAPIs.document.getCurrentZoomLevel(pageNumber).then(zoom => {
      const normalizedZoom = zoom / 100;
      return (0, _AppUtil.fixedToDigits)(normalizedZoom, 3);
    });
  }
  /**
   * @method
   * @description
   * the document zooms in to the given zoom level such that it lies between minZoom and maxZoom
   *
   * @param level zoomLevel to be updated
   *
   * @return {Promise} return Promise resolved with current zoom level
   */


  _setZoomLevel(level) {
    const normalizedZoom = this._publicAPIs.document.zoomTo(level * 100);

    if (normalizedZoom < 0) {
      return Promise.reject("Zoom In/Out is disabled");
    }

    return Promise.resolve((0, _AppUtil.fixedToDigits)(normalizedZoom / 100, 3));
  }
  /**
   * @method
   * @description
   * This API is used to get all the bookmarks residing in the PDF file.
   *
   * @return {Promise} - promise that resolves with array of Bookmark Object
  */


  /**
   * @method
   * @description
   * the document zooms in to the next zoom level such that it's never greater than maxZoom
   *
   * @return {Promise} return Promise resolved with current zoom level
   */
  _zoomIn() {
    const normalizedZoom = (0, _AppUtil.fixedToDigits)(this._publicAPIs.document.zoomIn() / 100, 3);

    if (normalizedZoom < 0) {
      return Promise.reject("Zoom In/Out is disabled");
    }

    return Promise.resolve(normalizedZoom);
  }
  /**
   * @method
   * @description
   * the document zooms out to the previous zoom level such that it's never less than minZoom
   *
   * @return {Promise} return Promise resolved with current zoom level
   */


  _zoomOut() {
    const normalizedZoom = (0, _AppUtil.fixedToDigits)(this._publicAPIs.document.zoomOut() / 100, 3);

    if (normalizedZoom < 0) {
      return Promise.reject("Zoom In/Out is disabled");
    }

    return Promise.resolve(normalizedZoom);
  }
  /**
   * @method
   * @description
   * it returns the minimum and maximum allowed zoom levels of a document.
   *
   * @return {Promise} return Promise resolved with min and max zoom level
   */


  _getZoomLimit() {
    return new Promise((resolve, reject) => {
      this._publicAPIs.document.getZoomLimits().then(zoomData => {
        resolve({
          minZoom: (0, _AppUtil.fixedToDigits)(zoomData.minZoom / 100, 3),
          maxZoom: (0, _AppUtil.fixedToDigits)(zoomData.maxZoom / 100, 3)
        });
      }).catch(() => {
        reject("Zoom In/Out is disabled");
      });
    });
  }
  /**
   * @method
   * @description
   * it takes the search text as input and highlights the first search result in UI from the viewing page
   *
   * @param searchText string to be searched
   */


  _searchQuery({
    searchText
  }) {
    return new Promise((resolve, reject) => {
      const appStore = _ServiceRegistry.default.getService("AppStore");

      if (!appStore.getActionConfig("preview").enableSearchAPIs) {
        reject("Search APIs not enabled.");
        return;
      }

      this._publicAPIs.document.search(searchText).then(searchObject => resolve(new _SearchModel.default(searchObject).getExposedAPIs())).catch(error => reject(error));
    });
  }
  /**
   * @method
   * @description
   * it returns the thumbnail of the specified page in a document
   *
   * @param data
   * @param minZoom
   */


  _getThumbnails(data, {
    preCalculatedData: {
      zoomData: {
        minZoom
      }
    }
  }) {
    return new Promise((resolve, reject) => {
      const rejectPromise = error => {
        _ServiceRegistry.default.getService("LoggingService").info("PreviewCommands", "_getThumbnails", "Getting error from Rendition API", JSON.stringify(error));

        reject("There's some problem while processing your request.");
      };

      _dcCore.providers.rendition({}).then(renditionApi => {
        const appStore = _ServiceRegistry.default.getService("AppStore");

        const metaDataResponse = renditionApi.getMetadata(appStore.previewMetadata.id, {
          useAJS: true,
          useDCAPI: false
        });
        let zoomLevel = data.options.zoomLevel || THUMBNAIL_OPTIONS.THUMBNAIL_ZOOM_LEVEL;
        zoomLevel = zoomLevel > minZoom ? zoomLevel : minZoom;
        const response = {};
        metaDataResponse.ajs.then(() => {
          Promise.all(data.pageNumbers.map(pageNumber => {
            const thumbnailPromise = renditionApi.getRendition(appStore.previewMetadata.id, {
              pageNum: pageNumber,
              zoomLevel,
              useAJS: true,
              useDCAPI: false
            });
            thumbnailPromise.dcapi.catch(() => {});
            return thumbnailPromise.ajs.then(rendition => {
              const byteArray = new Uint8Array(rendition.params.pageImgBuffer);
              const blob = new Blob([byteArray], {
                type: rendition.params.mimeType
              });
              Object.assign(response, {
                [pageNumber]: URL.createObjectURL(blob)
              });
            });
          })).then(() => {
            resolve(response);
          }).catch(rejectPromise);
        }).catch(rejectPromise);
        metaDataResponse.dcapi.catch(() => {});
      }).catch(rejectPromise);
    });
  }
  /**
   * @method
   * @description
   * This API enables navigation to any PDF page. It accepts a page number as input. You can also pass the x
   * and y coordinates on the page as optional input parameters to enable navigation to a particular location
   * on the page. When no coordinates are passed, the default coordinates are (0, 0)
   *
   * @return {Promise} return Promise resolved with true
   */


  _gotoLocation(data) {
    let pageNumber;

    if ("pageIndex" in data) {
      pageNumber = data.pageIndex + 1;
    } else {
      pageNumber = data.pageNumber;
    }

    this._publicAPIs.document.goto(pageNumber, data.left, data.top);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it accepts a page number as input and clears any text selection applied to the page
   *
   * @param {Number} pageNumber
   *
   * @return {Promise} return Promise resolved with true
   */


  _clearPageSelection(pageNumber) {
    const pageIndex = pageNumber - 1;

    this._oldAPIs.documentActions.clearPageSelection(pageIndex, pageIndex);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it provides all the permissions and security information related to document
   *
   *
   * @return {Promise} return Promise resolved with all document security information
   */


  _getPDFPermissions() {
    return this._oldAPIs.documentState.getDocumentSecurityInformation();
  }
  /**
   * @method
   * @description
   * it returns basic information about the PDF fetched from the PDF dictionary, such as the number
   * of pages and title of the PDF
   *
   * @return {Promise} return Promise resolved with metadata of file
   */


  _getPDFMetadata() {
    const metadata = _ServiceRegistry.default.getService("AppStore").pdfMetadata;

    if ("pdfTitle" in metadata) {
      return Promise.resolve(metadata);
    }

    return Promise.reject("Unable to fetch metadata");
  }
  /**
   * @method
   * @description
   * if a user selects any content in the viewer, then the selected content can be fetched using this API.
   */


  _getSelectedContent() {
    return new Promise((resolve, reject) => {
      this._publicAPIs.document.getSelectedContent().then(resolve).catch(() => reject("Selected content is not available"));
    });
  }
  /**
   * @method
   * @description
   * it checks the PDF for XMP metadata and returns it if present
   *
   * @return {Promise} return Promise resolved with XMP metadata of file
   */


  _getXMPMetadata(data) {
    return new Promise((resolve, reject) => {
      _dcCore.providers.rendition({}).then(renditionApi => {
        const appStore = _ServiceRegistry.default.getService("AppStore");

        const assetUri = appStore.previewMetadata.id;
        const xmpResponse = renditionApi.performCommand(assetUri, {
          assetMimeType: "application/pdf",
          assetType: "",
          commandName: "getDocumentXMPMetadata",
          enableExternal: "",
          useAJS: true,
          useDCAPI: false
        });
        xmpResponse.dcapi.catch(() => {});
        xmpResponse.ajs.then(response => {
          const {
            fields,
            rawStream
          } = data;
          const xmpStream = response.data.streamData;
          const result = {};

          if (rawStream) {
            result.xmpStream = xmpStream;
          }

          const fetchFields = fields && fields.length > 0 ? fields : ["dc:title", "dc:format", "xmpMM:DocumentID"];
          result.xmpMetadata = this._parseXMP(xmpStream, fetchFields);
          resolve(result);
        }).catch(error => {
          _ServiceRegistry.default.getService("LoggingService").error("PreviewCommands", "_getXMPMetadata", JSON.stringify(data), JSON.stringify(error));

          reject("Unable to fetch XMP metadata");
        });
      });
    });
  }

  _parseXMP(xmpStream, fields) {
    const response = {};
    fields.forEach(field => {
      response[field] = "";
    });

    if (xmpStream) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmpStream, "text/xml");
      fields.forEach(field => {
        const tag = xmlDoc.getElementsByTagName(field);
        let value = "";

        if (tag && tag[0] && tag[0].textContent) {
          value = tag[0].textContent.trim();
        }

        response[field] = value;
      });
    }

    return response;
  }
  /**
   * @method
   * @description
   * it enable or disable the text selection features
   *
   * @param data
   */


  _toggleTextSelection(data) {
    const appStore = _ServiceRegistry.default.getService("AppStore");

    appStore.setTextSelectionEnabled(data);
    return this._publicAPIs.app.enableFeature("TEXT_SELECTION", data);
  }

  _savePDF() {
    return (0, _saveFile.default)().then(() => Promise.resolve(true)).catch(() => Promise.resolve(false));
  }

  _downloadPDF() {
    return (0, _downloadFile.default)().then(() => Promise.resolve(true)).catch(() => Promise.resolve(false));
  }

  _clearFileDirtyState() {
    _ServiceRegistry.default.getService("AppStore").setFileStatus(undefined);

    _ServiceRegistry.default.getService("AppStore").setIsDirty(false);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it get the search UI component that can be placed anywhere
   *
   * @return return with search UI react component
   */


  _getSearchUI() {
    return this._oldAPIs.reusableComponents.getSearchUI();
  }
  /**
   * @method
   * @description
   * it exposes all the allowed command manager interface provided by preview APIs
   *
   * @return {Promise} - promise that resolves to command manager APIs object
   */


  _getCommandManager() {
    const commandManager = this._oldAPIs.commandManager;

    if (commandManager) {
      return Promise.resolve(commandManager);
    }

    return Promise.reject("Command Manager not found.");
  }
  /**
   * @method
   * @description
   * it registers callback with options for 'before RHP opens' with preview APIs
   *
   * @return {Promise} return Promise resolved with true
   */


  _registerBeforeRHPOpenCallback({
    callbackFn,
    opts
  }) {
    this._publicAPIs.rhp.beforeOpenPanel(callbackFn, opts);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it registers callback with options for 'before quickTools gets activated' with preview APIs
   *
   * @return {Promise} return Promise resolved with true
   */


  _registerBeforeQuickToolActivatedCallback({
    callbackFn,
    opts
  }) {
    this._publicAPIs.quickTools.beforeToolActivated(callbackFn, opts);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it resets the quick tool to default state using preview APIs
   *
   * @return {Promise} return Promise resolved with true
   */


  _resetQuickTool() {
    this._publicAPIs.quickTools.reset();

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it returns the currently activated quick tool using preview APIs
   *
   * @return {Promise} return Promise resolved with true
   */


  _getActiveQuickTool() {
    return this._publicAPIs.quickTools.getActiveTool();
  }
  /**
   * @method
   * @description
   * show or hide Quick Tool Panel at the left side of screen
   *
   * @param {Boolean} visible QuickTool Panel is visible if param is true
   */


  _showQuickTool(visible) {
    this._publicAPIs.quickTools.show(visible);

    return Promise.resolve(true);
  }
  /**
   * @method
   * @description
   * it expands the rhp with the tool whose ID is passed as argument, using preview APIs
   *
   * @param {String} toolId - Id of tool that should be present in expanded RHP
   * @return {Promise} return Promise resolved with true
   */


  _openRHPPanel(toolId) {
    return new Promise((resolve, reject) => {
      this._publicAPIs.rhp.openPanel(toolId).then(() => resolve(true)).catch(() => reject("Unable to Open RHP panel"));
    });
  }
  /**
   * @method
   * @description
   * it closes the quick tool to default state using preview APIs
   *
   * @return {Promise} return Promise resolved with true
   */


  _closeRHPPanel() {
    return new Promise((resolve, reject) => {
      this._publicAPIs.rhp.closePanel().then(() => resolve(true)).catch(() => reject("Unable to close RHP panel"));
    });
  }
  /**
   * @method
   * @description
   * it checks whether the document can be edited or not depending upon if the document is
   * password protected, encrypted, corrupt or a PDF form
   *
   * @return {Promise} return Promise resolved/rejected with appropriate failureType
   */


  _isEditingAllowed() {
    return new Promise((resolve, reject) => {
      this._publicAPIs.document.isEditingAllowed().then(response => resolve(response)).catch(exception => reject(exception));
    });
  }
  /**
   * @method
   * @description
   * it updates modifed filename in viewer into preview document stores.
   *
   * @param {string} fileName Updated FileName
   */


  _setFileName(fileName) {
    const appStore = _ServiceRegistry.default.getService("AppStore");

    appStore.setFileName(fileName);

    this._publicAPIs.document.setFileName(fileName);
  }
  /**
   * @method
   * @description
   * it returns the currently expanded rhp tool's config using preview APIs
   *
   * @return {Promise} return Promise resolved with true
   */


  _getRHPConfig() {
    return new Promise((resolve, reject) => {
      this._publicAPIs.rhp.getConfig().then(config => resolve(config)).catch(() => reject("Unable to get RHP config"));
    });
  }
  /**
   * @method
   * @description
   * method to update preview app config
   *
   * @param {String} newAppConfig - Stringified app config
   *
   */


  _updatePreviewAppConfig(newAppConfig) {
    this._publicAPIs.app.updateAppConfig(newAppConfig);

    return Promise.resolve(true);
  }

}

exports.default = PreviewCommands;