package com.example

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import com.example.bridge.AndroidBridge
import com.example.printer.SunmiPrinterManager
import com.example.security.KeystoreStorage

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private lateinit var keystoreStorage: KeystoreStorage
    private lateinit var printerManager: SunmiPrinterManager
    private var lastUserActivity = System.currentTimeMillis()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Block screenshots and screen recording on sensitive financial screens
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )

        // Initialize hardware services
        keystoreStorage = KeystoreStorage(this)
        printerManager = SunmiPrinterManager(this)
        printerManager.bindService()

        // Setup WebView
        webView = WebView(this).apply {
            id = View.generateViewId()
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                useWideViewPort = true
                loadWithOverviewMode = true
                cacheMode = WebSettings.LOAD_DEFAULT
            }

            // Expose Native Bridge
            addJavascriptInterface(
                AndroidBridge(
                    activity = this@MainActivity,
                    keystoreStorage = keystoreStorage,
                    printerManager = printerManager,
                    onInactivityReset = { lastUserActivity = System.currentTimeMillis() }
                ),
                "AndroidBridge"
            )

            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                    // Suppress or log internal console messages
                    return true
                }
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    val url = request?.url?.toString() ?: ""
                    // Keep internal assets within WebView
                    return if (url.startsWith("file:///android_asset/")) {
                        false
                    } else if (url.startsWith("tel:")) {
                        // Let dialer handle phone calls
                        false
                    } else {
                        false
                    }
                }
            }
        }

        setContentView(webView)

        // Load pre-compiled production bundle
        webView.loadUrl("file:///android_asset/public/index.html")

        // Handle Back button
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    // Dispatch back event to React webview
                    webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('hardwareBackPress'));",
                        null
                    )
                }
            }
        )
    }

    override fun onUserInteraction() {
        super.onUserInteraction()
        lastUserActivity = System.currentTimeMillis()
    }

    override fun onDestroy() {
        printerManager.unbindService()
        super.onDestroy()
    }
}
