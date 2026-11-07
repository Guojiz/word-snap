package io.github.guojiz.wordsnap;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Asks the web app to take one step back; true when it did (see js/shell.js). */
    private static final String BACK_JS =
        "(function(){try{return !!(window.wordSnapBack&&window.wordSnapBack());}catch(e){return false;}})()";
    /** Asks the web app to collect what WordInbox holds (a shortcut's action, captured words). */
    private static final String INBOX_JS = "window.wordSnapInbox&&window.wordSnapInbox()";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The system launch screen (AppTheme.NoActionBarLaunch) hands over to the web app's Home.
        SplashScreen.installSplashScreen(this);
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(LlmPlugin.class);
        registerPlugin(InboxPlugin.class);
        registerPlugin(HapticsPlugin.class);
        registerPlugin(LivePlugin.class);
        // Read by the web app when it starts. Not when the activity is restored or reopened from
        // Recents: that intent is the old shortcut's, and its action has already been taken.
        Intent launch = getIntent();
        boolean fromHistory = launch != null && (launch.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0;
        if (savedInstanceState == null && !fromHistory) keepShortcutAction(launch);
        super.onCreate(savedInstanceState);
        // Draw behind the status and navigation bars; the page pads itself with the safe-area insets.
        EdgeToEdge.enable(this);

        // Back gesture / button: the web app walks its own screen stack (dialog, page, set,
        // onboarding step). At the first screen it says no, and the app goes to the background
        // like any Android app, keeping the set where it was.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    moveTaskToBack(true);
                    return;
                }
                webView.evaluateJavascript(BACK_JS, handled -> {
                    if (!"true".equals(handled)) moveTaskToBack(true);
                });
            }
        });
    }

    /** A launcher shortcut while the app is already running. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (keepShortcutAction(intent)) askWebForInbox();
    }

    /** wordsnap://practice or wordsnap://add → WordInbox; true when it was one. */
    private boolean keepShortcutAction(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        if (data == null || !"wordsnap".equals(data.getScheme()) || data.getHost() == null) return false;
        WordInbox.setAction(this, data.getHost());
        return true;
    }

    private void askWebForInbox() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) webView.post(() -> webView.evaluateJavascript(INBOX_JS, null));
    }
}
