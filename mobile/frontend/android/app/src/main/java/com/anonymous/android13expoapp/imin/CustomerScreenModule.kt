package com.anonymous.android13expoapp.imin

import android.content.Context
import android.content.Intent
import android.hardware.display.DisplayManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Display
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.imin.image.ILcdManager

class CustomerScreenModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "CustomerScreenModule"

  private val lcdManager: ILcdManager by lazy {
    ILcdManager.getInstance(reactContext)
  }

  @ReactMethod
  fun initialize(promise: Promise) {
    runOnUiThread(promise) {
      lcdManager.sendLCDCommand(1)
      lcdManager.sendLCDCommand(4)
      null
    }
  }

  @ReactMethod
  fun clear(promise: Promise) {
    runOnUiThread(promise) {
      lcdManager.sendLCDCommand(4)
      null
    }
  }

  @ReactMethod
  fun displayText(text: String, promise: Promise) {
    runOnUiThread(promise) {
      lcdManager.sendLCDString(text)
      null
    }
  }

  @ReactMethod
  fun displayDoubleLine(top: String, bottom: String, promise: Promise) {
    runOnUiThread(promise) {
      lcdManager.sendLCDDoubleString(top, bottom)
      null
    }
  }

  @ReactMethod
  fun displayLines(lines: ReadableArray, alignArray: ReadableArray?, promise: Promise) {
    runOnUiThread(promise) {
      val textValues = Array(lines.size()) { index ->
        if (lines.getType(index) == ReadableType.Null) "" else lines.getString(index) ?: ""
      }

      val alignValues = if (alignArray != null && alignArray.size() == textValues.size) {
        IntArray(alignArray.size()) { index ->
          when (alignArray.getType(index)) {
            ReadableType.Number -> alignArray.getInt(index)
            else -> 0
          }
        }
      } else {
        IntArray(textValues.size) { 0 }
      }

      lcdManager.sendLCDMultiString(textValues, alignValues)
      null
    }
  }

  @ReactMethod
  fun setTextSize(textSize: Int, promise: Promise) {
    runOnUiThread(promise) {
      lcdManager.setTextSize(textSize)
      null
    }
  }

  @ReactMethod
  fun fetchDisplays(promise: Promise) {
    runOnUiThread(promise) {
      val displayManager = reactContext.getSystemService(Context.DISPLAY_SERVICE) as? DisplayManager
      val result = Arguments.createArray()
      displayManager?.getDisplays(null)?.forEach { display ->
        if (display != null && display.isValid) {
          result.pushMap(buildDisplayMap(display))
        }
      }
      result
    }
  }

  @ReactMethod
  fun canDrawOverlays(promise: Promise) {
    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(reactContext)
    } else {
      true
    }
    promise.resolve(granted)
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${reactContext.packageName}")
      )
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
    }
    promise.resolve(true)
  }

  private fun buildDisplayMap(display: Display): WritableMap {
    val metrics = DisplayMetrics()
    display.getMetrics(metrics)

    val map = Arguments.createMap()
    val displayType = resolveDisplayType(display)
    val isMainScreen = display.displayId == Display.DEFAULT_DISPLAY || displayType == DISPLAY_TYPE_BUILT_IN
    map.putString("id", display.displayId.toString())
    map.putInt("displayId", display.displayId)
    map.putString("name", display.name)
    map.putInt("width", metrics.widthPixels)
    map.putInt("height", metrics.heightPixels)
    map.putBoolean("isMainScreen", isMainScreen)
    map.putInt("flags", display.flags)
    map.putInt("type", displayType)
    map.putBoolean("isValid", display.isValid)
    map.putInt("rotation", display.rotation)

    return map
  }

  private fun resolveDisplayType(display: Display): Int {
    return try {
      val method = Display::class.java.getMethod("getType")
      val type = method.invoke(display)
      if (type is Int) type else DISPLAY_TYPE_UNKNOWN
    } catch (_: Throwable) {
      DISPLAY_TYPE_UNKNOWN
    }
  }

  private inline fun runOnUiThread(promise: Promise, crossinline block: () -> Any?) {
    UiThreadUtil.runOnUiThread {
      try {
        val result = block()
        promise.resolve(result)
      } catch (error: Throwable) {
        promise.reject("IMIN_SCREEN_ERROR", error.message, error)
      }
    }
  }

  companion object {
    private const val DISPLAY_TYPE_UNKNOWN = -1
    private const val DISPLAY_TYPE_BUILT_IN = 1
  }
}
