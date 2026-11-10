package com.autoprofi.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * «АвтоПрофи» — обёртка WebView вокруг офлайн-приложения из assets/www.
 *
 * Страница загружается с адреса https://appassets.androidplatform.net/...,
 * а shouldInterceptRequest отдаёт файлы из assets. Благодаря «настоящему»
 * origin у страницы работают localStorage и загрузка файлов — ровно так же,
 * как в браузере. Внешних зависимостей нет.
 */
public class MainActivity extends Activity {

    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int SAVE_FILE_REQUEST = 1002;
    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String APP_URL = "https://" + APP_HOST + "/assets/www/index.html";

    private static final String COLOR_BG = "#f4f7f7";
    private static final String COLOR_BAR = "#0f766e";

    private static final Map<String, String> MIME = new HashMap<>();

    static {
        // ВАЖНО: mimeType в WebResourceResponse должен быть без параметров
        // (charset передаётся отдельным аргументом). Если добавить
        // "; charset=utf-8", WebView на Android 15/16 считает тип
        // неизвестным и показывает HTML как обычный текст.
        MIME.put("html", "text/html");
        MIME.put("htm", "text/html");
        MIME.put("js", "text/javascript");
        MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json");
        MIME.put("webmanifest", "application/manifest+json");
        MIME.put("svg", "image/svg+xml");
        MIME.put("png", "image/png");
        MIME.put("jpg", "image/jpeg");
        MIME.put("jpeg", "image/jpeg");
        MIME.put("webp", "image/webp");
        MIME.put("ico", "image/x-icon");
        MIME.put("woff2", "font/woff2");
    }

    private WebView webView;
    private LinearLayout errorPanel;
    private boolean mainFrameError;
    private ValueCallback<Uri[]> filePathCallback;
    private byte[] pendingFileBytes;
    private String pendingFileName;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.parseColor(COLOR_BAR));
        getWindow().setNavigationBarColor(Color.parseColor(COLOR_BG));
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor(COLOR_BG));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor(COLOR_BG));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        errorPanel = buildErrorPanel();
        errorPanel.setVisibility(View.GONE);
        root.addView(errorPanel, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Blob-скачивание в WebView не работает. Этот мост открывает системный
        // диалог «Создать документ» и сохраняет ZIP/CSV/JSON в выбранное место.
        webView.addJavascriptInterface(new FileBridge(), "AndroidFile");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serveLocal(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url == null || APP_HOST.equals(url.getHost())) {
                    return false;
                }
                // Внешние ссылки (GitHub, Telegram и т.п.) открываем в браузере,
                // а не внутри WebView.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, url));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                            "Не удалось открыть ссылку", Toast.LENGTH_SHORT).show();
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (!mainFrameError && errorPanel != null) {
                    errorPanel.setVisibility(View.GONE);
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (request != null && request.isForMainFrame()) {
                    mainFrameError = true;
                    if (errorPanel != null) {
                        errorPanel.setVisibility(View.VISIBLE);
                    }
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception e) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "Не удалось открыть выбор файла",
                            Toast.LENGTH_SHORT).show();
                    return false;
                }
                return true;
            }
        });

        mainFrameError = false;
        webView.loadUrl(APP_URL);
    }

    /** Мост для сохранения файлов из JS: AndroidFile.saveFile(name, base64, mime). */
    private class FileBridge {
        @JavascriptInterface
        public boolean saveFile(String filename, String base64, String mime) {
            try {
                final byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                final String safeName = (filename == null || filename.isEmpty())
                        ? "autoprofi-file" : filename;
                final String safeMime = (mime == null || mime.isEmpty())
                        ? "application/octet-stream" : mime;
                runOnUiThread(() -> {
                    pendingFileBytes = bytes;
                    pendingFileName = safeName;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType(safeMime);
                    intent.putExtra(Intent.EXTRA_TITLE, safeName);
                    try {
                        startActivityForResult(intent, SAVE_FILE_REQUEST);
                    } catch (Exception e) {
                        pendingFileBytes = null;
                        Toast.makeText(MainActivity.this, "Не удалось открыть сохранение файла",
                                Toast.LENGTH_SHORT).show();
                    }
                });
                return true;
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                        "Не удалось подготовить файл", Toast.LENGTH_SHORT).show());
                return false;
            }
        }
    }

    /** Отдаёт файл приложения из assets по https-адресу appassets.androidplatform.net. */
    private WebResourceResponse serveLocal(Uri uri) {
        if (uri == null || !APP_HOST.equals(uri.getHost())) {
            return null;
        }
        String path = uri.getPath();
        if (path == null) path = "/";
        while (path.startsWith("/")) path = path.substring(1);
        if (path.startsWith("assets/")) path = path.substring("assets/".length());
        if (path.isEmpty() || path.endsWith("/")) path = path + "index.html";

        String ext = "";
        int dot = path.lastIndexOf('.');
        if (dot >= 0) ext = path.substring(dot + 1).toLowerCase(Locale.US);
        String mime = MIME.get(ext);
        if (mime == null) {
            String guessed = MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext);
            mime = guessed != null ? guessed : "application/octet-stream";
        }

        boolean textual = mime.startsWith("text/")
                || "application/json".equals(mime)
                || "application/manifest+json".equals(mime)
                || "image/svg+xml".equals(mime);

        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");

        try {
            InputStream in = getAssets().open(path);
            return new WebResourceResponse(
                    mime, textual ? "UTF-8" : null, 200, "OK", headers, in);
        } catch (IOException e) {
            return new WebResourceResponse(
                    "text/plain", "UTF-8", 404, "Not Found", headers,
                    new ByteArrayInputStream("Not found".getBytes(StandardCharsets.UTF_8)));
        }
    }

    /** Экран ошибки на случай, если WebView не смог загрузить приложение. */
    private LinearLayout buildErrorPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(32), dp(32), dp(32), dp(32));
        panel.setBackgroundColor(Color.parseColor(COLOR_BG));

        TextView title = new TextView(this);
        title.setText("Не удалось загрузить приложение");
        title.setTextSize(20);
        title.setTextColor(Color.parseColor("#0f172a"));
        title.setGravity(Gravity.CENTER);
        panel.addView(title);

        TextView hint = new TextView(this);
        hint.setText("Проверьте свободное место и попробуйте ещё раз.");
        hint.setTextSize(14);
        hint.setTextColor(Color.parseColor("#64748b"));
        hint.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams hintParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        hintParams.topMargin = dp(8);
        panel.addView(hint, hintParams);

        Button retry = new Button(this);
        retry.setText("Повторить");
        retry.setOnClickListener(v -> {
            mainFrameError = false;
            if (errorPanel != null) {
                errorPanel.setVisibility(View.GONE);
            }
            webView.loadUrl(APP_URL);
        });
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT);
        retryParams.topMargin = dp(20);
        panel.addView(retry, retryParams);

        return panel;
    }

    private int dp(int value) {
        return Math.round(getResources().getDisplayMetrics().density * value);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST && filePathCallback != null) {
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                results = new Uri[]{data.getData()};
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
            return;
        }
        if (requestCode == SAVE_FILE_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null
                    && pendingFileBytes != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    if (out != null) {
                        out.write(pendingFileBytes);
                        out.flush();
                        Toast.makeText(this, "Файл сохранён: " + pendingFileName,
                                Toast.LENGTH_SHORT).show();
                    }
                } catch (Exception e) {
                    Toast.makeText(this, "Не удалось сохранить файл",
                            Toast.LENGTH_SHORT).show();
                }
            }
            pendingFileBytes = null;
            pendingFileName = null;
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }
        // Сначала даём приложению закрыть модалку / вернуться на главный экран.
        // evaluateJavascript возвращает JSON: boolean true -> "true" без кавычек.
        webView.evaluateJavascript(
                "window.__appBack ? Boolean(window.__appBack()) : false",
                value -> {
                    if (!"true".equals(value)) {
                        moveTaskToBack(true);
                    }
                });
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
