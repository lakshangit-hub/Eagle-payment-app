package com.example.bridge

import android.app.Activity
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import com.example.printer.SunmiPrinterManager
import com.example.security.KeystoreStorage
import org.json.JSONObject

/**
 * JavaScript interface bridge exposed to WebView as `window.AndroidBridge`.
 */
class AndroidBridge(
    private val activity: Activity,
    private val keystoreStorage: KeystoreStorage,
    private val printerManager: SunmiPrinterManager,
    private val onInactivityReset: () -> Unit
) {
    private val tag = "AndroidBridge"

    @JavascriptInterface
    fun setSecureItem(key: String, value: String): Boolean {
        return try {
            keystoreStorage.setSecureItem(key, value)
        } catch (e: Exception) {
            Log.e(tag, "Keystore set error: ${e.message}")
            throw SecurityException(e.message)
        }
    }

    @JavascriptInterface
    fun getSecureItem(key: String): String? {
        return try {
            keystoreStorage.getSecureItem(key)
        } catch (e: Exception) {
            Log.e(tag, "Keystore get error: ${e.message}")
            throw SecurityException(e.message)
        }
    }

    @JavascriptInterface
    fun removeSecureItem(key: String): Boolean {
        return keystoreStorage.removeSecureItem(key)
    }

    @JavascriptInterface
    fun encryptData(plaintext: String): String {
        return keystoreStorage.encrypt(plaintext)
    }

    @JavascriptInterface
    fun decryptData(ciphertext: String): String {
        return keystoreStorage.decrypt(ciphertext)
    }

    @JavascriptInterface
    fun printReceipt(jsonString: String): String {
        return printerManager.printReceiptFromJson(jsonString)
    }

    @JavascriptInterface
    fun recordUserActivity() {
        onInactivityReset()
    }

    @JavascriptInterface
    fun lockScreen() {
        activity.runOnUiThread {
            // Signal lock
        }
    }

    @JavascriptInterface
    fun getDeviceInfo(): String {
        val info = JSONObject()
        info.put("model", Build.MODEL)
        info.put("manufacturer", Build.MANUFACTURER)
        info.put("androidVersion", Build.VERSION.RELEASE)
        info.put("sdkInt", Build.VERSION.SDK_INT)
        info.put(
            "isSunmi",
            Build.MANUFACTURER.contains("SUNMI", ignoreCase = true) || printerManager.isPrinterAvailable()
        )
        return info.toString()
    }
}
