package com.example.printer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.util.Log
import org.json.JSONObject
import woyou.aidlservice.jiuv5.ICallback
import woyou.aidlservice.jiuv5.IWoyouService
import java.text.NumberFormat
import java.util.Locale

/**
 * Sunmi V2 58mm Thermal ESC-POS Printer Manager.
 * Connects via Sunmi IWoyouService AIDL service.
 * Standard 58mm width is 32 monospace characters per line.
 */
class SunmiPrinterManager(private val context: Context) {

    private val tag = "SunmiPrinterManager"
    private val lineChars = 32

    private var woyouService: IWoyouService? = null
    private var isBound = false

    private val dummyCallback = object : ICallback.Stub() {
        override fun onRunResult(isSuccess: Boolean) {}
        override fun onReturnString(result: String?) {}
        override fun onRaiseException(code: Int, msg: String?) {
            Log.w(tag, "Sunmi printer exception: code=$code, msg=$msg")
        }
        override fun onPrintResult(code: Int, msg: String?) {}
    }

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            woyouService = IWoyouService.Stub.asInterface(service)
            isBound = true
            Log.i(tag, "Sunmi printer IWoyouService connected.")
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            woyouService = null
            isBound = false
            Log.w(tag, "Sunmi printer IWoyouService disconnected.")
        }
    }

    fun bindService() {
        try {
            val intent = Intent("woyou.aidlservice.jiuv5.IWoyouService")
            intent.setPackage("woyou.aidlservice.jiuv5")
            context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            Log.w(tag, "Sunmi AIDL bind failed (non-Sunmi hardware or emulator): ${e.message}")
        }
    }

    fun unbindService() {
        if (isBound) {
            try {
                context.unbindService(serviceConnection)
                isBound = false
            } catch (e: Exception) {
                Log.w(tag, "Error unbinding printer service: ${e.message}")
            }
        }
    }

    fun isPrinterAvailable(): Boolean {
        return woyouService != null
    }

    /**
     * Formats and prints a 58mm ESC-POS receipt (32 characters per line).
     * Printing is decoupled from saving so a hardware issue never loses transaction data.
     */
    fun printReceiptFromJson(jsonString: String): String {
        val result = JSONObject()
        try {
            val json = JSONObject(jsonString)
            val receiptNo = json.optString("receiptNo", "RC-000000")
            val date = json.optString("date", "")
            val customerName = json.optString("customerName", "Customer")
            val customerId = json.optString("customerId", "")
            val facilityNo = json.optString("facilityNo", "")
            val product = json.optString("product", "Loan")
            val amount = json.optDouble("amount", 0.0)
            val remainingBalance = json.optDouble("remainingBalance", 0.0)
            val status = json.optString("status", "Confirmed")
            val officerCode = json.optString("officerCode", "Field Officer #402")
            val isDuplicate = json.optBoolean("isDuplicate", false)

            val receiptLines = buildReceiptLines(
                receiptNo = receiptNo,
                date = date,
                customerName = customerName,
                customerId = customerId,
                facilityNo = facilityNo,
                product = product,
                amount = amount,
                remainingBalance = remainingBalance,
                status = status,
                officerCode = officerCode,
                isDuplicate = isDuplicate
            )

            val service = woyouService
            if (service != null) {
                // Send commands to Sunmi hardware
                service.setAlignment(1, dummyCallback) // Center
                service.setFontSize(24f, dummyCallback)
                service.printText("EAGLE CREDIT (PVT) LTD\n", dummyCallback)

                service.setFontSize(20f, dummyCallback)
                service.printText("Field Collection & Microfinance\n", dummyCallback)
                service.printText("Tel: 011 234 5678  Reg: PB-8924\n", dummyCallback)
                service.printText("Official Payment Receipt\n", dummyCallback)

                if (isDuplicate) {
                    service.printText("*** DUPLICATE RECEIPT ***\n", dummyCallback)
                }

                service.setAlignment(0, dummyCallback) // Left
                service.printText(makeDivider() + "\n", dummyCallback)

                // Print body lines
                for (line in receiptLines) {
                    service.printText(line + "\n", dummyCallback)
                }

                service.printText(makeDivider() + "\n", dummyCallback)

                service.setAlignment(1, dummyCallback) // Center
                service.printText("Thank you for your payment.\n", dummyCallback)
                service.printText("Please keep this receipt.\n", dummyCallback)
                service.printText("Eagle Credit - Customer Copy\n", dummyCallback)

                service.lineWrap(3, dummyCallback)
                service.cutPaper(dummyCallback)
                result.put("success", true)
                result.put("message", "Printed successfully on Sunmi 58mm printer")
            } else {
                // Non-Sunmi hardware or emulator simulation
                Log.i(tag, "========== 58MM SUNMI THERMAL RECEIPT ==========")
                Log.i(tag, center("EAGLE CREDIT (PVT) LTD"))
                Log.i(tag, center("Field Collection & Microfinance"))
                Log.i(tag, center("Tel: 011 234 5678  Reg: PB-8924"))
                Log.i(tag, center("Official Payment Receipt"))
                if (isDuplicate) {
                    Log.i(tag, center("*** DUPLICATE RECEIPT ***"))
                }
                Log.i(tag, makeDivider())
                for (line in receiptLines) {
                    Log.i(tag, line)
                }
                Log.i(tag, makeDivider())
                Log.i(tag, center("Thank you for your payment."))
                Log.i(tag, center("Please keep this receipt."))
                Log.i(tag, center("Eagle Credit - Customer Copy"))
                Log.i(tag, "================================================")

                result.put("success", true)
                result.put("message", "Simulated 58mm thermal output logged to Logcat")
            }
        } catch (e: Exception) {
            Log.e(tag, "Error printing receipt: ${e.message}", e)
            result.put("success", false)
            result.put("message", "Printing failed: ${e.message}")
        }
        return result.toString()
    }

    private fun buildReceiptLines(
        receiptNo: String,
        date: String,
        customerName: String,
        customerId: String,
        facilityNo: String,
        product: String,
        amount: Double,
        remainingBalance: Double,
        status: String,
        officerCode: String,
        isDuplicate: Boolean
    ): List<String> {
        val list = mutableListOf<String>()
        val lkFormat = NumberFormat.getCurrencyInstance(Locale("en", "LK"))

        list.add(justify("Receipt No:", receiptNo))
        list.add(justify("Date & Time:", date))
        list.add(makeDivider())
        list.add(justify("Customer:", truncate(customerName, 18)))
        list.add(justify("Customer ID:", customerId))
        list.add(justify("Loan No:", facilityNo))
        list.add(justify("Product:", truncate(product, 18)))
        list.add(makeDivider())
        list.add(justify("Amount Paid:", "Rs. " + String.format(Locale.US, "%,.2f", amount)))

        if (status == "Pending Sync") {
            list.add(center("[PENDING SYNC - STORED ON POS]"))
        } else if (status == "Rejected") {
            list.add(center("[REJECTED BY SERVER]"))
        } else {
            list.add(justify("Remaining Bal:", "Rs. " + String.format(Locale.US, "%,.2f", remainingBalance)))
        }

        list.add(justify("Collected by:", truncate(officerCode, 16)))
        if (isDuplicate) {
            list.add(center("[DUPLICATE COPY]"))
        }
        return list
    }

    private fun makeDivider(char: Char = '-'): String {
        return char.toString().repeat(lineChars)
    }

    private fun center(text: String): String {
        if (text.length >= lineChars) return text.take(lineChars)
        val leftSpaces = (lineChars - text.length) / 2
        val rightSpaces = lineChars - text.length - leftSpaces
        return " ".repeat(leftSpaces) + text + " ".repeat(rightSpaces)
    }

    private fun justify(left: String, right: String): String {
        val spaceNeeded = lineChars - left.length - right.length
        return if (spaceNeeded > 0) {
            left + " ".repeat(spaceNeeded) + right
        } else {
            val maxLeft = (lineChars - right.length - 1).coerceAtLeast(4)
            left.take(maxLeft) + " " + right
        }
    }

    private fun truncate(text: String, max: Int): String {
        return if (text.length > max) text.take(max - 1) + "…" else text
    }
}
