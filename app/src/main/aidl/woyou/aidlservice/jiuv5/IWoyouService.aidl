package woyou.aidlservice.jiuv5;

import woyou.aidlservice.jiuv5.ICallback;

interface IWoyouService {
    void updateFirmware();
    int getFirmwareStatus();
    String getServiceVersion();
    void setPrinterStyle(int key, int value);
    void sendRAWData(in byte[] data, ICallback callback);
    void setAlignment(int alignment, ICallback callback);
    void setFontName(String typeface, ICallback callback);
    void setFontSize(float fontSize, ICallback callback);
    void printText(String text, ICallback callback);
    void printTextWithFont(String text, String typeface, float fontSize, ICallback callback);
    void printColumnsText(in String[] colsTextArr, in int[] colsWidthArr, in int[] colsAlign, ICallback callback);
    void printBitmap(in android.graphics.Bitmap bitmap, ICallback callback);
    void printBarCode(String data, int symbology, int height, int width, int textposition, ICallback callback);
    void printQRCode(String data, int modulesize, int errorlevel, ICallback callback);
    void printOriginalText(String text, ICallback callback);
    void commitPrinterBuffer();
    void cutPaper(ICallback callback);
    int getCutPaperTimes();
    void openDrawer(ICallback callback);
    int getOpenDrawerTimes();
    void enterPrinterBuffer(boolean clean);
    void exitPrinterBuffer(boolean commit);
    void tax(in byte[] data, ICallback callback);
    int getPrinterMode();
    int getPrinterBBMDistance();
    void printColumnsString(in String[] colsTextArr, in int[] colsWidthArr, in int[] colsAlign, ICallback callback);
    int getPrinterPaper();
    void lineWrap(int n, ICallback callback);
    void sendLCDCommand(int flag);
    void sendLCDString(String string, ICallback callback);
    void sendLCDBitmap(in android.graphics.Bitmap bitmap, ICallback callback);
    void clearLCD();
    void sendLCDDoubleString(String topText, String bottomText, ICallback callback);
    int getPrinterFactory();
}
